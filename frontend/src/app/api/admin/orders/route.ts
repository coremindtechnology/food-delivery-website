import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { Order } from "@/models/Order";
import { logAuditEvent } from "@/lib/admin-security";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const OrderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  status: z.string().trim().optional(),
  restaurantId: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

// GET /api/admin/orders — filterable orders for Kitchen Display & Management
export async function GET(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const { searchParams } = new URL(req.url);
    const query = OrderQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      restaurantId: searchParams.get("restaurantId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    const authCheck = await verifyAdminPermissions(
      ["super_admin", "restaurant_manager", "order_manager", "veg_manager", "nonveg_manager"],
      query.restaurantId
    );
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 401);
    }

    const admin = authCheck.admin!;
    const filter: Record<string, unknown> = {};

    // Restaurant scope
    if (admin.role !== "super_admin" && admin.assignedRestaurantId) {
      filter.restaurantId = admin.assignedRestaurantId;
    } else if (query.restaurantId) {
      filter.restaurantId = query.restaurantId;
    }

    if (query.status && query.status !== "all") {
      filter.orderStatus = query.status;
    }

    if (query.search) {
      const q = query.search;
      filter.$or = [
        { orderNumber: { $regex: q, $options: "i" } },
        { customerName: { $regex: q, $options: "i" } },
        { customerPhone: { $regex: q, $options: "i" } },
      ];
    }

    const skip = (query.page - 1) * query.limit;

    const [orders, totalCount] = await Promise.all([
      Order.find(filter).sort({ placedAt: -1 }).skip(skip).limit(query.limit).lean(),
      Order.countDocuments(filter),
    ]);

    return successResponse(orders, 200, {
      page: query.page,
      limit: query.limit,
      totalCount,
      totalPages: Math.ceil(totalCount / query.limit),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

