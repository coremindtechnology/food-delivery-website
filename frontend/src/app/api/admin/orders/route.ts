import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { Order } from "@/models/Order";
import { ObjectIdSchema } from "@/lib/validations/common";
import { logAuditEvent } from "@/lib/admin-security";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const OrderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  status: z.enum([
    "all",
    "new",
    "preparing",
    "out_for_delivery",
    "delivered",
    "cancelled",
    "pending_payment",
    "accepted",
    "ready",
    "ready_for_pickup",
    "dispatched",
    "rejected",
  ]).default("all"),
  restaurantId: ObjectIdSchema.optional(),
  search: z.string().trim().optional(),
  fulfillmentType: z.enum(["all", "delivery", "takeaway"]).default("all"),
  paymentMethod: z.enum(["all", "razorpay", "cod"]).default("all"),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
}).superRefine((query, context) => {
  if (query.from && query.to && query.from > query.to) {
    context.addIssue({
      code: "custom",
      path: ["from"],
      message: "Start date must be on or before end date.",
    });
  }
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
      fulfillmentType: searchParams.get("fulfillmentType") ?? undefined,
      paymentMethod: searchParams.get("paymentMethod") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
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
    const summaryFilter: Record<string, unknown> = {};

    // Restaurant scope
    if (admin.role !== "super_admin") {
      if (!admin.assignedRestaurantId) {
        return errorResponse("This admin account has no restaurant assignment.", 403);
      }
      filter.restaurantId = admin.assignedRestaurantId;
      summaryFilter.restaurantId = admin.assignedRestaurantId;
    } else if (query.restaurantId) {
      filter.restaurantId = query.restaurantId;
      summaryFilter.restaurantId = query.restaurantId;
    }

    if (query.from || query.to) {
      const placedAt: Record<string, Date> = {};
      if (query.from) placedAt.$gte = new Date(`${query.from}T00:00:00.000Z`);
      if (query.to) {
        const dayAfterTo = new Date(`${query.to}T00:00:00.000Z`);
        dayAfterTo.setUTCDate(dayAfterTo.getUTCDate() + 1);
        placedAt.$lt = dayAfterTo;
      }
      filter.placedAt = placedAt;
      summaryFilter.placedAt = placedAt;
    }

    const statusGroups: Record<string, string[]> = {
      new: ["new"],
      preparing: ["accepted", "preparing", "ready"],
      out_for_delivery: ["dispatched", "ready_for_pickup"],
      delivered: ["delivered"],
      cancelled: ["cancelled", "rejected"],
    };
    if (query.status !== "all") {
      const groupedStatuses = statusGroups[query.status];
      filter.orderStatus = groupedStatuses ? { $in: groupedStatuses } : query.status;
    }

    if (query.paymentMethod !== "all") {
      filter.paymentMethod = query.paymentMethod;
    }

    if (query.fulfillmentType !== "all") {
      filter.fulfillmentType = query.fulfillmentType;
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

    const [orders, totalCount, statusCounts, revenueResult, customerCount] = await Promise.all([
      Order.find(filter)
        .populate("restaurantId", "name slug")
        .sort({ placedAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      Order.countDocuments(filter),
      Order.aggregate([
        { $match: summaryFilter },
        { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: summaryFilter },
        { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" }, totalOrders: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: summaryFilter },
        { $group: { _id: "$customerPhone" } },
        { $count: "count" },
      ]),
    ]);

    const statusCountsByStatus = Object.fromEntries(
      statusCounts.map(({ _id, count }) => [_id, count])
    );
    const activeOrders = [
      "new",
      "accepted",
      "preparing",
      "ready",
      "ready_for_pickup",
      "dispatched",
    ].reduce((total, status) => total + (statusCountsByStatus[status] || 0), 0);

    return successResponse(orders, 200, {
      page: query.page,
      limit: query.limit,
      totalCount,
      totalPages: Math.ceil(totalCount / query.limit),
      summary: {
        totalOrders: revenueResult[0]?.totalOrders || 0,
        totalRevenue: revenueResult[0]?.totalRevenue || 0,
        customers: customerCount[0]?.count || 0,
        activeOrders,
        statusCounts: statusCountsByStatus,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
