import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { MenuItem } from "@/models/MenuItem";
import { UpdateMenuItemSchema } from "@/lib/validations/menu-item";
import { ObjectIdSchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { Restaurant } from "@/models/Restaurant";
import { MenuCategory } from "@/models/MenuCategory";

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
      available: true,
      inStock: true,
      inventoryCount: { $gt: 0 },
    }).lean();

    if (!item) {
      return errorResponse("Menu item not found", 404);
    }
    const category = await MenuCategory.exists({
      _id: item.categoryId,
      isArchived: { $ne: true },
      isActive: true,
    });
    if (!category) {
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

    const currentItem = await MenuItem.findOne({ _id: id, isArchived: { $ne: true } });
    if (!currentItem) {
      return errorResponse("Menu item not found", 404);
    }
    const currentRestaurantId = currentItem.restaurantId.toString();
    const restaurantId = validatedData.restaurantId || currentRestaurantId;
    const authCheck = await verifyAdminPermissions(
      ["super_admin", "restaurant_manager", "menu_manager", "veg_manager", "nonveg_manager"],
      currentRestaurantId
    );
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
    }
    if (restaurantId !== currentRestaurantId) {
      const targetAuth = await verifyAdminPermissions(
        ["super_admin", "restaurant_manager", "menu_manager", "veg_manager", "nonveg_manager"],
        restaurantId
      );
      if (!targetAuth.authorized) {
        return errorResponse(targetAuth.error || "Unauthorized", targetAuth.statusCode || 403);
      }
    }

    const restaurant = await Restaurant.findOne({ _id: restaurantId, isArchived: false });
    if (!restaurant) {
      return errorResponse("Restaurant not found", 404);
    }
    if (restaurant.type === "veg" && validatedData.isVeg === false) {
      return errorResponse("Cannot assign non-vegetarian items to a vegetarian restaurant", 422);
    }

    const categoryId = validatedData.categoryId || currentItem.categoryId.toString();
    const category = await MenuCategory.findOne({
      _id: categoryId,
      restaurantId,
      isArchived: { $ne: true },
      isActive: true,
    });
    if (!category) {
      return errorResponse("Category not found or does not belong to the selected restaurant", 404);
    }

    // If updating slug, ensure uniqueness within the target restaurant.
    if (validatedData.slug) {
      const slugConflict = await MenuItem.findOne({
        restaurantId,
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

    const updateData = {
      ...validatedData,
      restaurantId,
      categoryId,
      categorySlug: category.slug,
    };
    const updated = await MenuItem.findOneAndUpdate(
      { _id: id, isArchived: { $ne: true } },
      { $set: updateData },
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

    const item = await MenuItem.findOne({ _id: id, isArchived: { $ne: true } });
    if (!item) {
      return errorResponse("Menu item not found or already archived", 404);
    }
    const authCheck = await verifyAdminPermissions(
      ["super_admin", "restaurant_manager", "menu_manager", "veg_manager", "nonveg_manager"],
      item.restaurantId.toString()
    );
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
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
