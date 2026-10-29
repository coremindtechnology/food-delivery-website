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
  inStock: z.boolean().optional(),
  reason: z.string().trim().max(200).default("Manual admin restock"),
});

export async function GET(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId") || undefined;
    const lowStockOnly = searchParams.get("lowStock") === "true";

    const authCheck = await verifyAdminPermissions(
      ["super_admin", "restaurant_manager", "menu_manager", "veg_manager", "nonveg_manager"],
      restaurantId
    );
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 401);
    }

    const admin = authCheck.admin!;
    const filter: Record<string, unknown> = { isArchived: { $ne: true } };

    if (admin.role !== "super_admin" && admin.assignedRestaurantId) {
      filter.restaurantId = admin.assignedRestaurantId;
    } else if (restaurantId) {
      filter.restaurantId = restaurantId;
    }

    if (lowStockOnly) {
      filter.inventoryCount = { $lte: 15 };
    }

    const items = await MenuItem.find(filter)
      .sort({ inventoryCount: 1, name: 1 })
      .select("name slug price isVeg inventoryCount inStock available restaurantId categorySlug")
      .lean();

    return successResponse(items);
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
    const { menuItemId, inventoryCount, inStock, reason } = InventoryUpdateSchema.parse(body);

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

    item.inventoryCount = inventoryCount;
    if (inStock !== undefined) {
      item.inStock = inStock;
    } else {
      item.inStock = inventoryCount > 0;
    }
    await item.save();

    // Record Inventory Movement
    await InventoryMovement.create({
      restaurantId: item.restaurantId,
      menuItemId: item._id,
      movementType: changeQuantity >= 0 ? "restock" : "waste",
      quantity: changeQuantity,
      previousStock: previousCount,
      newStock: inventoryCount,
      reason,
      performedByAdminId: authCheck.admin!._id,
    });

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAuditEvent({
      adminId: authCheck.admin!._id,
      restaurantId: item.restaurantId,
      action: "INVENTORY_RESTOCKED",
      entity: "Inventory",
      entityId: item._id,
      previousState: { count: previousCount },
      newState: { count: inventoryCount, reason },
      ipAddress: clientIp,
    });

    return successResponse(item);
  } catch (err) {
    return handleApiError(err);
  }
}

