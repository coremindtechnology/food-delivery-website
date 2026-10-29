import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { MenuCategory } from "@/models/MenuCategory";
import { UpdateCategorySchema } from "@/lib/validations/category";
import { ObjectIdSchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/categories/[id]
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const parsed = ObjectIdSchema.safeParse(id);
    if (!parsed.success) {
      return errorResponse("Invalid category ID format", 400);
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const category = await MenuCategory.findOne({
      _id: id,
      isArchived: { $ne: true },
    }).lean();

    if (!category) {
      return errorResponse("Category not found", 404);
    }

    return successResponse(category);
  } catch (err) {
    return handleApiError(err);
  }
}

// PATCH /api/categories/[id]
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const parsed = ObjectIdSchema.safeParse(id);
    if (!parsed.success) {
      return errorResponse("Invalid category ID format", 400);
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const body = await req.json();
    const validatedData = UpdateCategorySchema.parse(body);

    // If updating slug, ensure uniqueness within the same restaurant
    if (validatedData.slug) {
      const currentCategory = await MenuCategory.findById(id).lean();
      if (!currentCategory) {
        return errorResponse("Category not found", 404);
      }
      const slugConflict = await MenuCategory.findOne({
        restaurantId: currentCategory.restaurantId,
        slug: validatedData.slug,
        _id: { $ne: id },
      });
      if (slugConflict) {
        return errorResponse(
          `Category slug '${validatedData.slug}' is already used in this restaurant`,
          409
        );
      }
    }

    const updated = await MenuCategory.findOneAndUpdate(
      { _id: id, isArchived: { $ne: true } },
      { $set: validatedData },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return errorResponse("Category not found", 404);
    }

    return successResponse(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/categories/[id]  — soft archive only
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const parsed = ObjectIdSchema.safeParse(id);
    if (!parsed.success) {
      return errorResponse("Invalid category ID format", 400);
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const archived = await MenuCategory.findOneAndUpdate(
      { _id: id, isArchived: { $ne: true } },
      { $set: { isArchived: true } },
      { new: true }
    ).lean();

    if (!archived) {
      return errorResponse("Category not found or already archived", 404);
    }

    return successResponse({ message: "Category archived successfully", id });
  } catch (err) {
    return handleApiError(err);
  }
}

