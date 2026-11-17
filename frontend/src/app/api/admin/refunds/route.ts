import { NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { Refund } from "@/models/Refund";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import {
  createRazorpayRefund,
  fetchRazorpayPaymentRefunds,
  RazorpayApiError,
} from "@/lib/razorpay";
import { applyRazorpayRefund } from "@/lib/refund-settlement";
import { ObjectIdSchema } from "@/lib/validations/common";
import { getIndiaDateRange } from "@/lib/india-time";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

const ProcessRefundSchema = z.object({
  orderId: ObjectIdSchema,
  amount: z.number().positive(),
  reason: z.string().trim().min(3).max(300),
  idempotencyKey: z.string().uuid(),
});

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const authCheck = await verifyAdminPermissions([
      "super_admin", "restaurant_manager", "finance_viewer",
    ]);
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 401);
    }

    const filter: Record<string, unknown> = {};
    const { searchParams } = new URL(req.url);
    if (authCheck.admin?.role !== "super_admin") {
      if (!authCheck.admin?.assignedRestaurantId) {
        return errorResponse("This admin account has no restaurant assignment.", 403);
      }
      filter.restaurantId = authCheck.admin.assignedRestaurantId;
    } else if (searchParams.get("restaurantId")) {
      const restaurantId = ObjectIdSchema.safeParse(searchParams.get("restaurantId"));
      if (!restaurantId.success) return errorResponse("Invalid restaurant ID.", 400);
      filter.restaurantId = restaurantId.data;
    }
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))) {
      return errorResponse("Dates must use YYYY-MM-DD format.", 400);
    }
    if (from && to && from > to) return errorResponse("Start date must be on or before end date.", 400);
    if (from || to) {
      filter.createdAt = getIndiaDateRange(from, to);
    }
    const refunds = await Refund.find(filter)
      .populate("orderId", "orderNumber customerName totalAmount")
      .populate("restaurantId", "name")
      .populate("processedByAdminId", "name email")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return successResponse(refunds);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const input = ProcessRefundSchema.parse(await req.json());
    const order = await Order.findById(input.orderId);
    if (!order) return errorResponse("Order not found.", 404);

    const authCheck = await verifyAdminPermissions(
      ["super_admin", "restaurant_manager"],
      order.restaurantId.toString()
    );
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
    }
    const existing = await Refund.findOne({ idempotencyKey: input.idempotencyKey });
    if (existing) {
      if (
        existing.orderId.toString() !== order._id.toString() ||
        existing.amount !== input.amount
      ) {
        return errorResponse("Idempotency key was already used for a different refund.", 409);
      }
      return successResponse(existing);
    }

    const payment = await Payment.findOne({ orderId: order._id })
      .sort({ attemptNumber: -1 });
    if (
      !payment ||
      payment.paymentMethod !== "razorpay" ||
      !payment.razorpayPaymentId ||
      !["captured", "partially_refunded"].includes(payment.status)
    ) {
      return errorResponse("Only verified, captured Razorpay payments are eligible for refunds.", 409);
    }
    const amountPaise = Math.round(input.amount * 100);
    if (amountPaise / 100 !== input.amount) {
      return errorResponse("Refund amount must be in whole paise.", 400);
    }

    const reservation = await Payment.findOneAndUpdate(
      {
        _id: payment._id,
        paymentMethod: "razorpay",
        $expr: {
          $lte: [
            { $add: ["$amountRefunded", "$amountRefundReserved"] },
            payment.amount - input.amount,
          ],
        },
      },
      { $inc: { amountRefundReserved: input.amount } },
      { new: true }
    );
    if (!reservation) return errorResponse("Refund exceeds the remaining captured amount.", 409);

    let refund;
    try {
      refund = await Refund.create({
        orderId: order._id,
        paymentId: payment._id,
        restaurantId: order.restaurantId,
        amount: input.amount,
        reason: input.reason,
        status: "processing",
        processedByAdminId: authCheck.admin!._id,
        idempotencyKey: input.idempotencyKey,
      });
    } catch (error) {
      await Payment.updateOne(
        { _id: payment._id, amountRefundReserved: { $gte: input.amount } },
        { $inc: { amountRefundReserved: -input.amount } }
      );
      if (error instanceof Error && "code" in error && error.code === 11000) {
        const duplicate = await Refund.findOne({ idempotencyKey: input.idempotencyKey });
        if (duplicate) return successResponse(duplicate);
      }
      throw error;
    }
    await Order.updateOne(
      { _id: order._id, refundStatus: { $ne: "processed" } },
      { $set: { refundStatus: "processing" } }
    );

    try {
      const gatewayRefund = await createRazorpayRefund({
        paymentId: payment.razorpayPaymentId,
        amountPaise,
        idempotencyKey: input.idempotencyKey,
        notes: { localRefundId: refund._id.toString(), idempotencyKey: input.idempotencyKey },
      });
      if (
        gatewayRefund.payment_id !== payment.razorpayPaymentId ||
        gatewayRefund.amount !== amountPaise ||
        gatewayRefund.currency !== payment.currency
      ) {
        throw new Error("Razorpay refund response did not match the requested payment and amount.");
      }
      await Refund.updateOne(
        { _id: refund._id },
        { $set: { razorpayRefundId: gatewayRefund.id } }
      );
      await Order.updateOne(
        { _id: order._id, refundStatus: { $ne: "processed" } },
        { $set: { refundStatus: "pending" } }
      );
      await applyRazorpayRefund(gatewayRefund);
      return successResponse(await Refund.findById(refund._id), 201);
    } catch (error) {
      if (error instanceof RazorpayApiError && [400, 401, 403, 422].includes(error.statusCode)) {
        await Refund.updateOne(
          { _id: refund._id, status: { $ne: "processed" } },
          { $set: { status: "failed", failureReason: error.message } }
        );
        await Payment.updateOne(
          { _id: payment._id, amountRefundReserved: { $gte: input.amount } },
          { $inc: { amountRefundReserved: -input.amount } }
        );
        const anotherPendingRefund = await Refund.exists({
          orderId: order._id,
          _id: { $ne: refund._id },
          status: { $in: ["pending", "processing"] },
        });
        await Order.updateOne(
          { _id: order._id, refundStatus: { $ne: "processed" } },
          { $set: { refundStatus: anotherPendingRefund ? "pending" : "failed" } }
        );
        return successResponse(await Refund.findById(refund._id), 202);
      }
      await Refund.updateOne(
        { _id: refund._id, status: { $ne: "processed" } },
        {
          $set: {
            status: "pending",
            failureReason: error instanceof Error ? error.message : "Razorpay result needs reconciliation.",
          },
        }
      );
      return successResponse(
        {
          refund: await Refund.findById(refund._id),
          reconciliationRequired: true,
        },
        202
      );
    }
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();
    const input = z.object({ refundId: ObjectIdSchema }).parse(await req.json());
    const refund = await Refund.findById(input.refundId);
    if (!refund) return errorResponse("Refund not found.", 404);
    const authCheck = await verifyAdminPermissions(
      ["super_admin", "restaurant_manager", "finance_viewer"],
      refund.restaurantId.toString()
    );
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
    }
    const payment = await Payment.findById(refund.paymentId);
    if (!payment?.razorpayPaymentId) return errorResponse("Refund payment reference is unavailable.", 409);

    const gatewayRefunds = await fetchRazorpayPaymentRefunds(payment.razorpayPaymentId);
    const gatewayRefund = refund.razorpayRefundId
      ? gatewayRefunds.find((entry) => entry.id === refund.razorpayRefundId)
      : gatewayRefunds.find(
          (entry) => entry.notes?.idempotencyKey === refund.idempotencyKey
        );
    if (!gatewayRefund) {
      return errorResponse("Razorpay has no matching refund. No local refund state was marked complete.", 404);
    }
    if (!refund.razorpayRefundId) {
      await Refund.updateOne({ _id: refund._id }, { $set: { razorpayRefundId: gatewayRefund.id } });
    }
    await applyRazorpayRefund(gatewayRefund);
    return successResponse(await Refund.findById(refund._id));
  } catch (err) {
    return handleApiError(err);
  }
}
