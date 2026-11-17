import mongoose, { PipelineStage } from "mongoose";
import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { Customer } from "@/models/Customer";
import { Order } from "@/models/Order";
import { logAuditEvent } from "@/lib/admin-security";
import { ObjectIdSchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const CustomerQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  search: z.string().trim().max(100).default(""),
  restaurantId: ObjectIdSchema.optional(),
  period: z.enum(["all", "7d", "30d", "90d", "365d"]).default("all"),
  view: z.enum(["all", "repeat", "new", "top"]).default("all"),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  customerPhone: z.string().trim().min(7).max(25).optional(),
  historyPage: z.coerce.number().int().positive().default(1),
  historyLimit: z.coerce.number().int().positive().max(50).default(5),
});

const UpdateCustomerSchema = z.object({
  customerPhone: z.string().trim().min(7).max(25),
  restaurantId: ObjectIdSchema,
  name: z.string().trim().max(100).optional(),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  notes: z.string().trim().max(1000).optional(),
  isBlocked: z.boolean().optional(),
  reason: z.string().trim().max(200).optional(),
}).refine(
  (value) => value.name !== undefined || value.email !== undefined || value.notes !== undefined || value.isBlocked !== undefined,
  "Provide at least one customer field to update."
);

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getPeriodStart(period: z.infer<typeof CustomerQuerySchema>["period"], now: Date) {
  if (period === "all") return null;
  const days = Number.parseInt(period, 10);
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function isCountableOrder() {
  return {
    $and: [
      { $not: [{ $in: ["$orderStatus", ["cancelled", "rejected", "pending_payment"]] }] },
      { $ne: ["$paymentStatus", "failed"] },
    ],
  };
}

function buildCustomerAggregation(
  restaurantId: string | undefined,
  periodStart: Date | null,
  newCustomerStart: Date
): PipelineStage[] {
  const orderMatch: Record<string, unknown> = {};
  if (restaurantId) orderMatch.restaurantId = new mongoose.Types.ObjectId(restaurantId);

  const inPeriod = periodStart ? { $gte: ["$placedAt", periodStart] } : true;
  const countableOrder = isCountableOrder();
  return [
    { $match: orderMatch },
    {
      $group: {
        _id: "$customerPhone",
        orderName: { $last: "$customerName" },
        orderEmail: { $last: "$customerEmail" },
        firstOrder: { $min: "$placedAt" },
        lastOrder: { $max: "$placedAt" },
        totalOrderCount: { $sum: { $cond: [countableOrder, 1, 0] } },
        allTimeSpend: {
          $sum: { $cond: [countableOrder, { $ifNull: ["$totalAmount", 0] }, 0] },
        },
        periodOrderCount: {
          $sum: { $cond: [{ $and: [inPeriod, countableOrder] }, 1, 0] },
        },
        periodSpend: {
          $sum: {
            $cond: [
              { $and: [inPeriod, countableOrder] },
              { $ifNull: ["$totalAmount", 0] },
              0,
            ],
          },
        },
        restaurantIds: { $addToSet: "$restaurantId" },
      },
    },
    {
      $lookup: {
        from: Customer.collection.name,
        localField: "_id",
        foreignField: "phone",
        as: "profile",
      },
    },
    { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "restaurants",
        localField: "restaurantIds",
        foreignField: "_id",
        as: "restaurants",
      },
    },
    {
      $project: {
        _id: 0,
        customerId: "$profile._id",
        phone: "$_id",
        name: { $ifNull: ["$profile.name", "$orderName"] },
        email: { $ifNull: ["$profile.email", "$orderEmail"] },
        notes: { $ifNull: ["$profile.notes", ""] },
        isBlocked: { $ifNull: ["$profile.isBlocked", false] },
        firstOrder: 1,
        lastOrder: 1,
        totalOrderCount: 1,
        periodOrderCount: 1,
        allTimeSpend: 1,
        periodSpend: 1,
        restaurants: { $map: { input: "$restaurants", as: "restaurant", in: { _id: "$$restaurant._id", name: "$$restaurant.name" } } },
      },
    },
    {
      $addFields: {
        orderCount: "$periodOrderCount",
        totalSpent: "$periodSpend",
        averageOrderValue: {
          $cond: [
            { $gt: ["$periodOrderCount", 0] },
            { $divide: ["$periodSpend", "$periodOrderCount"] },
            0,
          ],
        },
        isRepeat: { $gte: ["$totalOrderCount", 2] },
        isNew: { $gte: ["$firstOrder", newCustomerStart] },
      },
    },
    { $match: { periodOrderCount: { $gt: 0 } } },
  ];
}

export async function GET(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const { searchParams } = new URL(req.url);
    const query = CustomerQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      restaurantId: searchParams.get("restaurantId") ?? undefined,
      period: searchParams.get("period") ?? undefined,
      view: searchParams.get("view") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      customerPhone: searchParams.get("customerPhone") ?? undefined,
      historyPage: searchParams.get("historyPage") ?? undefined,
      historyLimit: searchParams.get("historyLimit") ?? undefined,
    });

    const authCheck = await verifyAdminPermissions(
      ["super_admin", "restaurant_manager", "order_manager"],
      query.restaurantId
    );
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 401);
    }

    const admin = authCheck.admin!;
    if (admin.role !== "super_admin" && !admin.assignedRestaurantId) {
      return errorResponse("This admin account has no restaurant assignment.", 403);
    }
    const restaurantId = admin.role === "super_admin"
      ? query.restaurantId
      : admin.assignedRestaurantId!.toString();

    if (query.customerPhone) {
      const orderFilter: Record<string, unknown> = { customerPhone: query.customerPhone };
      if (restaurantId) orderFilter.restaurantId = new mongoose.Types.ObjectId(restaurantId);
      const [profile, latestOrder, aggregate, totalOrders, orders] = await Promise.all([
        Customer.findOne({ phone: query.customerPhone }).lean(),
        Order.findOne(orderFilter).sort({ placedAt: -1 }).select("customerName customerEmail").lean(),
        Order.aggregate([
          { $match: orderFilter },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: { $cond: [isCountableOrder(), 1, 0] } },
              totalSpent: {
                $sum: {
                  $cond: [isCountableOrder(), { $ifNull: ["$totalAmount", 0] }, 0],
                },
              },
            },
          },
        ]),
        Order.countDocuments(orderFilter),
        Order.find(orderFilter)
          .populate("restaurantId", "name")
          .sort({ placedAt: -1 })
          .skip((query.historyPage - 1) * query.historyLimit)
          .limit(query.historyLimit)
          .select("orderNumber restaurantId items totalAmount orderStatus paymentStatus placedAt")
          .lean(),
      ]);

      if (!latestOrder) return errorResponse("Customer has no orders in this kitchen.", 404);
      return successResponse({
        customer: {
          customerId: profile?._id?.toString() || "",
          phone: query.customerPhone,
          name: profile?.name || latestOrder.customerName,
          email: profile?.email || latestOrder.customerEmail || "",
          notes: profile?.notes || "",
          isBlocked: profile?.isBlocked || false,
          totalOrders: aggregate[0]?.totalOrders || 0,
          totalSpent: aggregate[0]?.totalSpent || 0,
          averageOrderValue: aggregate[0]?.totalOrders
            ? aggregate[0].totalSpent / aggregate[0].totalOrders
            : 0,
        },
        orders,
      }, 200, {
        page: query.historyPage,
        limit: query.historyLimit,
        totalCount: totalOrders,
        totalPages: Math.ceil(totalOrders / query.historyLimit),
      });
    }

    const now = new Date();
    const periodStart = getPeriodStart(query.period, now);
    const newCustomerStart = periodStart || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const pipeline = buildCustomerAggregation(restaurantId, periodStart, newCustomerStart);
    const search = query.search ? new RegExp(escapeRegex(query.search), "i") : null;
    const resultFilter: Record<string, unknown> = {};
    if (search) {
      resultFilter.$or = [
        { name: search },
        { phone: search },
        { email: search },
      ];
    }
    if (query.status === "active") resultFilter.isBlocked = false;
    if (query.status === "inactive") resultFilter.isBlocked = true;
    if (query.view === "repeat") resultFilter.isRepeat = true;
    if (query.view === "new") resultFilter.isNew = true;

    const sort: Record<string, 1 | -1> = query.view === "top"
      ? { totalSpent: -1, orderCount: -1, name: 1 }
      : query.view === "repeat"
        ? { totalOrderCount: -1, totalSpent: -1, name: 1 }
        : query.view === "new"
          ? { firstOrder: -1, name: 1 }
          : { lastOrder: -1, name: 1 };

    const [facets] = await Order.aggregate([
      ...pipeline,
      {
        $facet: {
          customers: [
            ...(Object.keys(resultFilter).length ? [{ $match: resultFilter }] : []),
            { $sort: sort },
            { $skip: (query.page - 1) * query.limit },
            { $limit: query.limit },
          ],
          total: [
            ...(Object.keys(resultFilter).length ? [{ $match: resultFilter }] : []),
            { $count: "count" },
          ],
          stats: [
            {
              $group: {
                _id: null,
                totalCustomers: { $sum: 1 },
                newCustomers: { $sum: { $cond: ["$isNew", 1, 0] } },
                repeatCustomers: { $sum: { $cond: ["$isRepeat", 1, 0] } },
                totalSpending: { $sum: "$periodSpend" },
              },
            },
          ],
        },
      },
    ]);

    const totalCount = facets?.total?.[0]?.count || 0;
    const stats = facets?.stats?.[0] || {
      totalCustomers: 0,
      newCustomers: 0,
      repeatCustomers: 0,
      totalSpending: 0,
    };
    return successResponse(facets?.customers || [], 200, {
      page: query.page,
      limit: query.limit,
      totalCount,
      totalPages: Math.ceil(totalCount / query.limit),
      stats: {
        totalCustomers: stats.totalCustomers,
        newCustomers: stats.newCustomers,
        repeatCustomers: stats.repeatCustomers,
        totalSpending: stats.totalSpending,
      },
    });
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

    const body = UpdateCustomerSchema.parse(await req.json());
    const authCheck = await verifyAdminPermissions(
      ["super_admin", "restaurant_manager", "order_manager"],
      body.restaurantId
    );
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
    }
    if (body.isBlocked !== undefined && !["super_admin", "restaurant_manager"].includes(authCheck.admin!.role)) {
      return errorResponse("Only a restaurant manager can change customer account status.", 403);
    }

    const orderExists = await Order.exists({
      customerPhone: body.customerPhone,
      restaurantId: body.restaurantId,
    });
    if (!orderExists) return errorResponse("Customer not found in this kitchen.", 404);

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.email) updates.email = body.email;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.isBlocked !== undefined) updates.isBlocked = body.isBlocked;
    const update: Record<string, unknown> = {
      $set: updates,
      $setOnInsert: { phone: body.customerPhone },
    };
    if (body.email === "") update.$unset = { email: 1 };
    const customer = await Customer.findOneAndUpdate(
      { phone: body.customerPhone },
      update,
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const isStatusChange = body.isBlocked !== undefined;
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAuditEvent({
      actorId: authCheck.admin!._id,
      restaurantId: body.restaurantId,
      action: isStatusChange
        ? body.isBlocked ? "CUSTOMER_BLOCKED" : "CUSTOMER_UNBLOCKED"
        : "CUSTOMER_PROFILE_UPDATED",
      entity: "Customer",
      entityId: customer._id,
      newState: {
        name: customer.name,
        email: customer.email,
        isBlocked: customer.isBlocked,
      },
      ipAddress: clientIp,
    });

    return successResponse(customer);
  } catch (err) {
    return handleApiError(err);
  }
}
