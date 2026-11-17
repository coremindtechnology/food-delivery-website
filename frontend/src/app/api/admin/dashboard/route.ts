import { NextRequest } from "next/server";
import mongoose from "mongoose";
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
    if (requestedRestaurantId && !mongoose.isValidObjectId(requestedRestaurantId)) {
      return errorResponse("Invalid restaurant selection.", 400);
    }

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
    const aggregateFilter = {
      ...filter,
      ...(filter.restaurantId
        ? { restaurantId: new mongoose.Types.ObjectId(String(filter.restaurantId)) }
        : {}),
    };

    // Time ranges
    const indiaOffsetMs = 330 * 60 * 1000;
    const indiaNow = new Date(Date.now() + indiaOffsetMs);
    const startOfToday = new Date(
      Date.UTC(indiaNow.getUTCFullYear(), indiaNow.getUTCMonth(), indiaNow.getUTCDate()) -
        indiaOffsetMs
    );
    const startOfSevenDays = new Date(startOfToday);
    startOfSevenDays.setUTCDate(startOfSevenDays.getUTCDate() - 6);

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
      weeklyOrders,
      todayOrderStatuses,
      todayFulfillmentTypes,
      topSellingItems,
    ] = await Promise.all([
      Order.countDocuments(filter),
      Order.countDocuments({ ...filter, placedAt: { $gte: startOfToday } }),
      Order.countDocuments({
        ...filter,
        orderStatus: { $in: ["new", "accepted", "preparing", "ready", "dispatched", "ready_for_pickup"] },
      }),
      Order.aggregate([
        { $match: { ...aggregateFilter, paymentStatus: { $in: ["paid", "pending"] } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Order.aggregate([
        {
          $match: {
            ...aggregateFilter,
            placedAt: { $gte: startOfToday },
            paymentStatus: { $in: ["paid", "pending"] },
          },
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Restaurant.find({
        isArchived: false,
        ...(filter.restaurantId ? { _id: filter.restaurantId } : {}),
      }).select("name slug type isOpen").sort({ name: 1 }).lean(),
      MenuItem.find({
        ...(filter.restaurantId ? { restaurantId: filter.restaurantId } : {}),
        isArchived: { $ne: true },
        inventoryCount: { $lte: 15 },
      })
        .select("name price inventoryCount restaurantId")
        .limit(6)
        .lean(),
      filter.restaurantId
        ? Order.distinct("customerId", {
            ...filter,
            customerId: { $exists: true, $ne: null },
          }).then((customerIds) => customerIds.length)
        : Customer.countDocuments({ isBlocked: false }),
      Order.find(filter)
        .sort({ placedAt: -1 })
        .limit(5)
        .select("orderNumber customerName customerPhone items totalAmount orderStatus placedAt restaurantSlug")
        .lean(),
      AuditLog.find(filter.restaurantId ? { restaurantId: filter.restaurantId } : {})
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      Order.aggregate([
        { $match: { ...aggregateFilter, placedAt: { $gte: startOfSevenDays } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$placedAt",
                timezone: "Asia/Kolkata",
              },
            },
            orders: { $sum: 1 },
            revenue: {
              $sum: {
                $cond: [
                  { $in: ["$paymentStatus", ["paid", "pending"]] },
                  "$totalAmount",
                  0,
                ],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { ...aggregateFilter, placedAt: { $gte: startOfToday } } },
        { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { ...aggregateFilter, placedAt: { $gte: startOfToday } } },
        { $group: { _id: "$fulfillmentType", count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        {
          $match: {
            ...aggregateFilter,
            placedAt: { $gte: startOfToday },
            orderStatus: { $nin: ["cancelled", "rejected"] },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.name",
            quantity: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.itemTotalPrice" },
            image: { $first: "$items.image" },
          },
        },
        { $sort: { quantity: -1, revenue: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const totalRevenue = totalRevenueResult[0]?.total || 0;
    const todayRevenue = todayRevenueResult[0]?.total || 0;

    // Kitchen split revenue
    const [vegRevenueResult, nonVegRevenueResult] = await Promise.all([
      Order.aggregate([
        { $match: { ...aggregateFilter, restaurantSlug: "veg", paymentStatus: { $in: ["paid", "pending"] } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Order.aggregate([
        { $match: { ...aggregateFilter, restaurantSlug: "non-veg", paymentStatus: { $in: ["paid", "pending"] } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
    ]);

    const todayDateKey = new Date(startOfToday.getTime() + indiaOffsetMs)
      .toISOString()
      .slice(0, 10);
    const weeklyOrderMap = new Map(weeklyOrders.map((day) => [day._id, day]));
    const revenueByDay = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startOfSevenDays.getTime() + index * 24 * 60 * 60 * 1000);
      const dateKey = new Date(date.getTime() + indiaOffsetMs).toISOString().slice(0, 10);
      const day = weeklyOrderMap.get(dateKey);
      return {
        date: dateKey,
        label: date.toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" }),
        orders: day?.orders || 0,
        revenue: day?.revenue || 0,
      };
    });

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
      activeKitchens: restaurants.filter((restaurant) => restaurant.isOpen).length,
      lowStockItems,
      recentOrders: recentOrders.map((order) => ({
        ...order,
        items: (order.items || []).map((item) => ({
          name: item.name,
          quantity: item.quantity,
        })),
      })),
      recentAuditLogs,
      revenueByDay,
      todayOrderStatuses: todayOrderStatuses.map((status) => ({
        status: status._id,
        count: status.count,
      })),
      todayFulfillmentTypes: todayFulfillmentTypes.map((type) => ({
        type: type._id,
        count: type.count,
      })),
      topSellingItems,
      todayDate: todayDateKey,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
