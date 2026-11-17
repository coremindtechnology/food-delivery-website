import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { Payment } from "@/models/Payment";
import { Refund } from "@/models/Refund";
import { Order } from "@/models/Order";
import { ObjectIdSchema } from "@/lib/validations/common";
import { getIndiaDateRange } from "@/lib/india-time";
import { fetchRazorpayOrderPayments, fetchRazorpayPayment } from "@/lib/razorpay";
import { applyRazorpayPayment } from "@/lib/payment-settlement";
import { z } from "zod";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const authCheck = await verifyAdminPermissions(["super_admin", "finance_viewer", "restaurant_manager"]);
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 401);
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 8)));
    const method = searchParams.get("method") || "all";
    const status = searchParams.get("status") || "all";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const allTime = searchParams.get("period") === "all";
    const search = (searchParams.get("search") || "").trim().slice(0, 100);
    if (!Number.isInteger(page) || !Number.isInteger(limit)) {
      return errorResponse("Invalid pagination values.", 400);
    }
    if (!["all", "razorpay", "cod"].includes(method)) {
      return errorResponse("Invalid payment method filter.", 400);
    }
    if (!["all", "created", "authorized", "captured", "partially_paid", "failed", "partially_refunded", "refunded", "collected", "outstanding"].includes(status)) {
      return errorResponse("Invalid payment status filter.", 400);
    }
    if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))) {
      return errorResponse("Dates must use YYYY-MM-DD format.", 400);
    }
    if (from && to && from > to) return errorResponse("Start date must be on or before end date.", 400);

    const filter: Record<string, unknown> = {};
    if (authCheck.admin?.role !== "super_admin") {
      if (!authCheck.admin?.assignedRestaurantId) {
        return errorResponse("This admin account has no restaurant assignment.", 403);
      }
      filter.restaurantId = authCheck.admin.assignedRestaurantId;
    } else if (searchParams.get("restaurantId")) {
      const restaurantId = searchParams.get("restaurantId")!;
      const parsedRestaurantId = ObjectIdSchema.safeParse(restaurantId);
      if (!parsedRestaurantId.success) return errorResponse("Invalid restaurant ID.", 400);
      filter.restaurantId = parsedRestaurantId.data;
    }
    if (method !== "all") filter.paymentMethod = method;
    if (status !== "all") {
      if (status === "collected") {
        filter.paymentMethod = "cod";
        filter.codCollectedAmount = { $gt: 0 };
      } else if (status === "outstanding") {
        filter.paymentMethod = "cod";
        filter.codOutstandingAmount = { $gt: 0 };
      } else {
        filter.status = status;
      }
    }
    if (from || to) {
      filter.createdAt = getIndiaDateRange(from, to);
    }

    const summaryFilter: Record<string, unknown> = { ...filter };
    delete summaryFilter.status;
    delete summaryFilter.codCollectedAmount;
    delete summaryFilter.codOutstandingAmount;
    delete summaryFilter.paymentMethod;
    delete summaryFilter.createdAt;

    const rangeFilter: Record<string, unknown> = { ...summaryFilter };
    if (filter.createdAt) rangeFilter.createdAt = filter.createdAt;
    else if (!allTime) rangeFilter.createdAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matchingOrders = await Order.find({
        ...(filter.restaurantId ? { restaurantId: filter.restaurantId } : {}),
        $or: [
          { orderNumber: { $regex: escapedSearch, $options: "i" } },
          { customerName: { $regex: escapedSearch, $options: "i" } },
          { customerPhone: { $regex: escapedSearch, $options: "i" } },
        ],
      }).select("_id").limit(500).lean();
      filter.$or = [
        { orderId: { $in: matchingOrders.map((order) => order._id) } },
        { razorpayPaymentId: { $regex: escapedSearch, $options: "i" } },
        { razorpayOrderId: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const [payments, totalCount, paymentStats, refundStats, statusCounts] = await Promise.all([
      Payment.find(filter)
      .populate("orderId", "orderNumber customerName totalAmount orderStatus")
      .populate("restaurantId", "name slug")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
      Payment.countDocuments(filter),
      Payment.aggregate([
        { $match: rangeFilter },
        {
          $group: {
            _id: "$paymentMethod",
            attempts: { $sum: 1 },
            amount: { $sum: "$amount" },
            capturedAmount: {
              $sum: {
                $cond: [
                  { $in: ["$status", ["captured", "partially_refunded", "refunded"]] },
                  "$amount",
                  0,
                ],
              },
            },
            codCollected: { $sum: "$codCollectedAmount" },
            codOutstanding: { $sum: "$codOutstandingAmount" },
            failedAmount: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, "$amount", 0] } },
            failedCount: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
            reviewCount: { $sum: { $cond: [{ $or: ["$duplicateCapture", "$requiresRefund"] }, 1, 0] } },
          },
        },
      ]),
      Refund.aggregate([
        { $match: { ...rangeFilter, status: "processed" } },
        { $group: { _id: null, amount: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: rangeFilter },
        { $group: { _id: { method: "$paymentMethod", status: "$status" }, count: { $sum: 1 } } },
      ]),
    ]);

    const online = paymentStats.find((entry) => entry._id === "razorpay");
    const cod = paymentStats.find((entry) => entry._id === "cod");
    const refunds = refundStats[0] || { amount: 0, count: 0 };
    const onlinePayments = online?.capturedAmount || 0;
    const codCollected = cod?.codCollected || 0;
    const totalCollection = onlinePayments + codCollected;
    const failedPayments = paymentStats.reduce((sum, entry) => sum + entry.failedCount, 0);
    const failedAmount = paymentStats.reduce((sum, entry) => sum + entry.failedAmount, 0);
    const statusCountsByType = Object.fromEntries(
      statusCounts.map((entry) => [`${entry._id.method}:${entry._id.status}`, entry.count]),
    );

    return successResponse(payments, 200, {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      summary: {
        totalCollection,
        onlinePayments,
        codExpected: cod?.amount || 0,
        codCollected,
        codOutstanding: cod?.codOutstanding || 0,
        totalRefunds: refunds.amount,
        refundCount: refunds.count,
        failedAmount,
        failedCount: failedPayments,
        reviewCount: paymentStats.reduce((sum, entry) => sum + entry.reviewCount, 0),
        statusCounts: statusCountsByType,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
    try {
      await connectToDatabase();
      const authCheck = await verifyAdminPermissions([
        "super_admin", "finance_viewer", "restaurant_manager",
      ]);
      if (!authCheck.authorized) {
        return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 401);
      }
      const { paymentId } = z.object({ paymentId: ObjectIdSchema }).parse(await req.json());
      const filter: Record<string, unknown> = { _id: paymentId };
      if (authCheck.admin?.role !== "super_admin") {
        if (!authCheck.admin?.assignedRestaurantId) {
          return errorResponse("This admin account has no restaurant assignment.", 403);
        }
        filter.restaurantId = authCheck.admin.assignedRestaurantId;
      }
      const payment = await Payment.findOne(filter);
      if (!payment || payment.paymentMethod !== "razorpay" || !payment.razorpayOrderId) {
        return errorResponse("Razorpay payment attempt not found.", 404);
      }
      const gatewayPayment = payment.razorpayPaymentId
        ? await fetchRazorpayPayment(payment.razorpayPaymentId)
        : (await fetchRazorpayOrderPayments(payment.razorpayOrderId))
            .sort((left, right) => {
              const rank = { captured: 3, authorized: 2, failed: 1, created: 0, refunded: 0 };
              return rank[right.status] - rank[left.status];
            })[0];
      if (!gatewayPayment) {
        return errorResponse("Razorpay has no payment record for this order yet.", 404);
      }
      const result = await applyRazorpayPayment(gatewayPayment);
      return successResponse({
        payment: result.payment,
        orderStatus: result.order?.orderStatus,
        duplicate: result.duplicate,
      });
    } catch (err) {
      return handleApiError(err);
  }
}
