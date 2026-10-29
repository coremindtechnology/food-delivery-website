import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { MenuItem } from "@/models/MenuItem";
import { UpdateMenuItemSchema } from "@/lib/validations/menu-item";
import { ObjectIdSchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/menu-items/[id]
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const parsed = ObjectIdSchema.safeParse(id);
    if (!parsed.success) {
      return errorResponse("Invalid menu item ID format", 400);
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const item = await MenuItem.findOne({
      _id: id,
      isArchived: { $ne: true },
    }).lean();

    if (!item) {
      return errorResponse("Menu item not found", 404);
    }

    return successResponse(item);
  } catch (err) {
    return handleApiError(err);
  }
}

// PATCH /api/menu-items/[id]
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const parsed = ObjectIdSchema.safeParse(id);
    if (!parsed.success) {
      return errorResponse("Invalid menu item ID format", 400);
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const body = await req.json();
    const validatedData = UpdateMenuItemSchema.parse(body);

    // If updating slug, ensure uniqueness within the same restaurant
    if (validatedData.slug) {
      const currentItem = await MenuItem.findById(id).lean();
      if (!currentItem) {
        return errorResponse("Menu item not found", 404);
      }
      const slugConflict = await MenuItem.findOne({
        restaurantId: currentItem.restaurantId,
        slug: validatedData.slug,
        _id: { $ne: id },
      });
      if (slugConflict) {
        return errorResponse(
          `Menu item slug '${validatedData.slug}' is already used in this restaurant`,
          409
        );
      }
    }

    const updated = await MenuItem.findOneAndUpdate(
      { _id: id, isArchived: { $ne: true } },
      { $set: validatedData },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return errorResponse("Menu item not found", 404);
    }

    return successResponse(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/menu-items/[id]  — soft archive only
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const parsed = ObjectIdSchema.safeParse(id);
    if (!parsed.success) {
      return errorResponse("Invalid menu item ID format", 400);
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const archived = await MenuItem.findOneAndUpdate(
      { _id: id, isArchived: { $ne: true } },
      { $set: { isArchived: true, available: false } },
      { new: true }
    ).lean();

    if (!archived) {
      return errorResponse("Menu item not found or already archived", 404);
    }

    return successResponse({ message: "Menu item archived successfully", id });
  } catch (err) {
    return handleApiError(err);
  }
}

