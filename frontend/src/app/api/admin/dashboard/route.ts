import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { Order } from "@/models/Order";
import { MenuItem } from "@/models/MenuItem";
import { Customer } from "@/models/Customer";
import { Restaurant } from "@/models/Restaurant";
import { AuditLog } from "@/models/AuditLog";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const { searchParams } = new URL(req.url);
    const requestedRestaurantId = searchParams.get("restaurantId") || undefined;

    const authCheck = await verifyAdminPermissions(undefined, requestedRestaurantId);
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 401);
    }

    const admin = authCheck.admin!;
    const filter: Record<string, unknown> = {};

    // Restaurant scope
    if (admin.role !== "super_admin" && admin.assignedRestaurantId) {
      filter.restaurantId = admin.assignedRestaurantId;
    } else if (requestedRestaurantId) {
      filter.restaurantId = requestedRestaurantId;
    }

    // Time ranges
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      todayOrders,
      activeOrders,
      totalRevenueResult,
      todayRevenueResult,
      restaurants,
      lowStockItems,
      totalCustomers,
      recentOrders,
      recentAuditLogs,
    ] = await Promise.all([
      Order.countDocuments(filter),
      Order.countDocuments({ ...filter, placedAt: { $gte: startOfToday } }),
      Order.countDocuments({
        ...filter,
        orderStatus: { $in: ["placed", "confirmed", "preparing", "out_for_delivery"] },
      }),
      Order.aggregate([
        { $match: { ...filter, paymentStatus: { $in: ["paid", "pending"] } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Order.aggregate([
        {
          $match: {
            ...filter,
            placedAt: { $gte: startOfToday },
            paymentStatus: { $in: ["paid", "pending"] },
          },
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Restaurant.find({ isArchived: false }).select("name slug type isOpen").lean(),
      MenuItem.find({
        ...(filter.restaurantId ? { restaurantId: filter.restaurantId } : {}),
        isArchived: { $ne: true },
        inventoryCount: { $lte: 15 },
      })
        .select("name price inventoryCount restaurantId")
        .limit(6)
        .lean(),
      Customer.countDocuments({ isBlocked: false }),
      Order.find(filter)
        .sort({ placedAt: -1 })
        .limit(8)
        .select("orderNumber customerName customerPhone totalAmount orderStatus placedAt restaurantSlug")
        .lean(),
      AuditLog.find(filter.restaurantId ? { restaurantId: filter.restaurantId } : {})
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
    ]);

    const totalRevenue = totalRevenueResult[0]?.total || 0;
    const todayRevenue = todayRevenueResult[0]?.total || 0;

    // Kitchen split revenue
    const [vegRevenueResult, nonVegRevenueResult] = await Promise.all([
      Order.aggregate([
        { $match: { restaurantSlug: "veg", paymentStatus: { $in: ["paid", "pending"] } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Order.aggregate([
        { $match: { restaurantSlug: "non-veg", paymentStatus: { $in: ["paid", "pending"] } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
    ]);

    return successResponse({
      kpi: {
        totalOrders,
        todayOrders,
        activeOrders,
        totalRevenue,
        todayRevenue,
        vegRevenue: vegRevenueResult[0]?.total || 0,
        nonVegRevenue: nonVegRevenueResult[0]?.total || 0,
        lowStockCount: lowStockItems.length,
        totalCustomers,
      },
      restaurants,
      lowStockItems,
      recentOrders,
      recentAuditLogs,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

