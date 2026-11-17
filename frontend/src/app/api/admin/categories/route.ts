import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { MenuCategory } from "@/models/MenuCategory";
import { ObjectIdSchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const CategoryQuerySchema = z.object({
  restaurantId: ObjectIdSchema.optional(),
});

export async function GET(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const query = CategoryQuerySchema.parse({
      restaurantId: new URL(req.url).searchParams.get("restaurantId") ?? undefined,
    });
    const authCheck = await verifyAdminPermissions(
      ["super_admin", "restaurant_manager", "menu_manager", "veg_manager", "nonveg_manager"],
      query.restaurantId
    );
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
    }
    if (authCheck.admin?.role !== "super_admin" && !authCheck.admin?.assignedRestaurantId) {
      return errorResponse("No restaurant is assigned to this admin account.", 403);
    }

    const filter: Record<string, unknown> = { isArchived: { $ne: true } };
    if (authCheck.admin?.role !== "super_admin") {
      filter.restaurantId = authCheck.admin?.assignedRestaurantId;
    } else if (query.restaurantId) {
      filter.restaurantId = query.restaurantId;
    }

    const categories = await MenuCategory.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
    return successResponse(categories);
  } catch (err) {
    return handleApiError(err);
  }
}
