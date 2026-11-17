import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { MenuItem } from "@/models/MenuItem";
import { InventoryMovement } from "@/models/InventoryMovement";
import { logAuditEvent } from "@/lib/admin-security";
import { ObjectIdSchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const InventoryUpdateSchema = z.object({
  menuItemId: ObjectIdSchema,
  inventoryCount: z.number().int().min(0),
  reason: z.string().trim().min(1).max(200).default("Manual stock adjustment"),
});

export async function GET(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId") || undefined;
    const menuItemId = searchParams.get("menuItemId") || undefined;
    const lowStockOnly = searchParams.get("lowStock") === "true";

    if (menuItemId) {
      const parsedItemId = ObjectIdSchema.safeParse(menuItemId);
      if (!parsedItemId.success) {
        return errorResponse("Invalid menuItemId format", 400);
      }
      const item = await MenuItem.findById(menuItemId).select("restaurantId");
      if (!item) {
        return errorResponse("Menu item not found", 404);
      }
      const authCheck = await verifyAdminPermissions(
        ["super_admin", "restaurant_manager", "menu_manager", "veg_manager", "nonveg_manager"],
        item.restaurantId.toString()
      );
      if (!authCheck.authorized) {
        return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
      }
      const movements = await InventoryMovement.find({ menuItemId })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
      return successResponse(movements);
    }

    const authCheck = await verifyAdminPermissions(
      ["super_admin", "restaurant_manager", "menu_manager", "veg_manager", "nonveg_manager"],
      restaurantId
    );
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 401);
    }

    const admin = authCheck.admin!;
    if (admin.role !== "super_admin" && !admin.assignedRestaurantId) {
      return errorResponse("No restaurant is assigned to this admin account.", 403);
    }
    const filter: Record<string, unknown> = { isArchived: { $ne: true } };

    if (admin.role !== "super_admin" && admin.assignedRestaurantId) {
      filter.restaurantId = admin.assignedRestaurantId;
    } else if (restaurantId) {
      filter.restaurantId = restaurantId;
    }

    const items = await MenuItem.find(filter)
      .sort({ inventoryCount: 1, name: 1 })
      .select("name slug price isVeg inventoryCount lowStockThreshold inStock available restaurantId categorySlug")
      .lean();

    return successResponse(
      lowStockOnly
        ? items.filter((item) => item.inventoryCount <= item.lowStockThreshold)
        : items
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const body = await req.json();
    const { menuItemId, inventoryCount, reason } = InventoryUpdateSchema.parse(body);

    const item = await MenuItem.findById(menuItemId);
    if (!item) {
      return errorResponse("Menu item not found", 404);
    }

    const authCheck = await verifyAdminPermissions(
      ["super_admin", "restaurant_manager", "menu_manager", "veg_manager", "nonveg_manager"],
      item.restaurantId.toString()
    );
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
    }

    const previousCount = item.inventoryCount;
    const changeQuantity = inventoryCount - previousCount;

    if (changeQuantity === 0) {
      return successResponse(item);
    }

    const updated = await MenuItem.findOneAndUpdate(
      { _id: item._id, inventoryCount: previousCount },
      {
        $set: {
          inventoryCount,
          inStock: inventoryCount > 0,
        },
      },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return errorResponse("Stock changed during this adjustment. Refresh and try again.", 409);
    }

    try {
      await InventoryMovement.create({
        restaurantId: item.restaurantId,
        menuItemId: item._id,
        movementType: changeQuantity > 0 ? "restock" : "adjustment",
        quantity: changeQuantity,
        previousCount,
        newCount: inventoryCount,
        reason,
        performedByAdminId: authCheck.admin!._id,
      });
    } catch (err) {
      await MenuItem.updateOne(
        { _id: item._id, inventoryCount },
        { $set: { inventoryCount: previousCount, inStock: previousCount > 0 } }
      );
      throw err;
    }

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAuditEvent({
      actorId: authCheck.admin!._id,
      restaurantId: item.restaurantId,
      action: changeQuantity > 0 ? "INVENTORY_RESTOCKED" : "INVENTORY_ADJUSTED",
      entity: "Inventory",
      entityId: item._id,
      previousState: { count: previousCount },
      newState: { count: inventoryCount, changeQuantity, reason },
      ipAddress: clientIp,
    });

    return successResponse(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
