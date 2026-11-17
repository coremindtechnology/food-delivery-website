import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { MenuItem } from "@/models/MenuItem";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { ObjectIdSchema } from "@/lib/validations/common";
import { z } from "zod";

const MenuQuerySchema = z.object({
  restaurantId: ObjectIdSchema.optional(),
  includeArchived: z.enum(["true", "false"]).default("false"),
});

export async function GET(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const params = new URL(req.url).searchParams;
    const query = MenuQuerySchema.parse({
      restaurantId: params.get("restaurantId") ?? undefined,
      includeArchived: params.get("includeArchived") ?? undefined,
    });
    const authCheck = await verifyAdminPermissions([
      "super_admin",
      "restaurant_manager",
      "menu_manager",
      "veg_manager",
      "nonveg_manager",
    ], query.restaurantId);
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
    }

    const filter: Record<string, unknown> = {};
    if (authCheck.admin?.role !== "super_admin" && !authCheck.admin?.assignedRestaurantId) {
      return errorResponse("No restaurant is assigned to this admin account.", 403);
    }
    if (authCheck.admin?.role !== "super_admin" && authCheck.admin?.assignedRestaurantId) {
      filter.restaurantId = authCheck.admin.assignedRestaurantId;
    } else if (query.restaurantId) {
      filter.restaurantId = query.restaurantId;
    }
    if (query.includeArchived !== "true") {
      filter.isArchived = { $ne: true };
    }

    const items = await MenuItem.find(filter).sort({ categoryId: 1, sortOrder: 1, name: 1 }).lean();
    return successResponse(items);
  } catch (err) {
    return handleApiError(err);
  }
}
