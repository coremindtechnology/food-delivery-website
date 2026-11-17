import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { MenuCategory } from "@/models/MenuCategory";
import { UpdateCategorySchema } from "@/lib/validations/category";
import { ObjectIdSchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { MenuItem } from "@/models/MenuItem";

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

    const currentCategory = await MenuCategory.findOne({ _id: id, isArchived: { $ne: true } });
    if (!currentCategory) {
      return errorResponse("Category not found", 404);
    }
    const authCheck = await verifyAdminPermissions(
      ["super_admin", "restaurant_manager", "menu_manager", "veg_manager", "nonveg_manager"],
      currentCategory.restaurantId.toString()
    );
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
    }

    // If updating slug, ensure uniqueness within the same restaurant.
    if (validatedData.slug) {
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

    if (validatedData.slug && validatedData.slug !== currentCategory.slug) {
      await MenuItem.updateMany(
        { categoryId: currentCategory._id },
        { $set: { categorySlug: validatedData.slug } }
      );
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

    const category = await MenuCategory.findOne({ _id: id, isArchived: { $ne: true } });
    if (!category) {
      return errorResponse("Category not found or already archived", 404);
    }
    const authCheck = await verifyAdminPermissions(
      ["super_admin", "restaurant_manager", "menu_manager", "veg_manager", "nonveg_manager"],
      category.restaurantId.toString()
    );
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
    }

    const activeItems = await MenuItem.countDocuments({
      categoryId: category._id,
      isArchived: { $ne: true },
    });
    if (activeItems > 0) {
      return errorResponse(
        "Move or archive this category's menu items before archiving the category.",
        409
      );
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
