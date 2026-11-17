import { NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentCustomer } from "@/lib/auth";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { createRazorpayOrder, getRazorpayKeyId } from "@/lib/razorpay";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

const Schema = z.object({
  orderNumber: z.string().trim().min(1).max(40),
  attemptKey: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const customer = await getCurrentCustomer();
    if (!customer) return errorResponse("Sign in to continue payment.", 401);

    const { orderNumber, attemptKey } = Schema.parse(await req.json());
    const order = await Order.findOne({
      orderNumber: orderNumber.toUpperCase(),
      customerId: customer._id,
    });
    if (!order) return errorResponse("Order not found.", 404);
    if (order.paymentMethod !== "razorpay") return errorResponse("This order does not use Razorpay.", 409);
    if (
      order.orderStatus !== "pending_payment" ||
      !["pending", "failed"].includes(order.paymentStatus) ||
      (order.pendingPaymentExpiresAt && order.pendingPaymentExpiresAt <= new Date())
    ) {
      return errorResponse("This order is not awaiting payment.", 409);
    }

    const priorAttempt = await Payment.findOne({ attemptKey });
    if (priorAttempt) {
      if (priorAttempt.orderId.toString() !== order._id.toString()) {
        return errorResponse("Payment attempt key has already been used.", 409);
      }
      if (!priorAttempt.razorpayOrderId) {
        return errorResponse("Payment attempt is still being prepared. Retry shortly.", 409);
      }
      return successResponse({
        keyId: getRazorpayKeyId(),
        razorpayOrderId: priorAttempt.razorpayOrderId,
        amount: Math.round(order.totalAmount * 100),
        currency: "INR",
        orderNumber: order.orderNumber,
      });
    }

    const claimedOrder = await Order.findOneAndUpdate(
      { _id: order._id, orderStatus: "pending_payment", paymentStatus: { $in: ["pending", "failed"] } },
      { $inc: { paymentAttemptCount: 1 } },
      { new: true }
    );
    if (!claimedOrder) return errorResponse("Order payment state changed. Refresh and retry.", 409);

    const attempt = await Payment.create({
      orderId: order._id,
      restaurantId: order.restaurantId,
      amount: order.totalAmount,
      currency: "INR",
      paymentMethod: "razorpay",
      status: "created",
      attemptKey,
      attemptNumber: claimedOrder.paymentAttemptCount,
    });

    try {
      const gatewayOrder = await createRazorpayOrder({
        amountPaise: Math.round(order.totalAmount * 100),
        receipt: order.orderNumber,
        notes: { orderNumber: order.orderNumber, localPaymentId: attempt._id.toString() },
      });
      if (
        gatewayOrder.currency !== "INR" ||
        gatewayOrder.amount !== Math.round(order.totalAmount * 100) ||
        !gatewayOrder.id
      ) {
        throw new Error("Razorpay returned an order that did not match the requested amount.");
      }

      await Payment.updateOne(
        { _id: attempt._id, status: "created" },
        { $set: { razorpayOrderId: gatewayOrder.id } }
      );
      await Order.updateOne(
        { _id: order._id, orderStatus: "pending_payment" },
        { $set: { razorpayOrderId: gatewayOrder.id } }
      );
      return successResponse({
        keyId: getRazorpayKeyId(),
        razorpayOrderId: gatewayOrder.id,
        amount: gatewayOrder.amount,
        currency: gatewayOrder.currency,
        orderNumber: order.orderNumber,
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Razorpay request failed (")) {
        await Payment.updateOne(
          { _id: attempt._id, status: "created" },
          { $set: { failureReason: error.message } }
        );
      }
      throw error;
    }
  } catch (err) {
    return handleApiError(err);
  }
}
