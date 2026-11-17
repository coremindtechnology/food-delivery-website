import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { RazorpayPayment } from "@/lib/razorpay";

export async function applyRazorpayPayment(gatewayPayment: RazorpayPayment) {
  const payment = await Payment.findOne({ razorpayOrderId: gatewayPayment.order_id });
  if (!payment || payment.paymentMethod !== "razorpay") {
    throw new Error("No local payment attempt matches this Razorpay order.");
  }
  if (
    gatewayPayment.order_id !== payment.razorpayOrderId ||
    gatewayPayment.amount !== Math.round(payment.amount * 100) ||
    gatewayPayment.currency !== payment.currency
  ) {
    throw new Error("Razorpay payment amount or order does not match the recorded payment.");
  }

  if (
    payment.status === "captured" &&
    payment.razorpayPaymentId !== gatewayPayment.id &&
    gatewayPayment.status === "captured"
  ) {
    await Payment.updateOne(
      { _id: payment._id },
      {
        $set: { duplicateCapture: true },
        $addToSet: { duplicateCaptureIds: gatewayPayment.id },
      }
    );
    return { payment, order: await Order.findById(payment.orderId), duplicate: true };
  }

  const nextStatus =
    gatewayPayment.status === "captured"
      ? "captured"
      : gatewayPayment.status === "authorized"
        ? "authorized"
        : gatewayPayment.status === "failed"
          ? "failed"
          : null;
  if (!nextStatus) {
    return { payment, order: await Order.findById(payment.orderId), duplicate: false };
  }

  const updatedPayment = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $ne: "captured" } },
    {
      $set: {
        status: nextStatus,
        razorpayPaymentId: gatewayPayment.id,
        ...(nextStatus === "captured" ? { capturedAt: payment.capturedAt || new Date() } : {}),
        ...(nextStatus === "failed"
          ? { failureReason: gatewayPayment.error_description || "Payment failed at Razorpay." }
          : { failureReason: undefined }),
      },
    },
    { new: true }
  );
  const effectivePayment = updatedPayment || (await Payment.findById(payment._id));
  if (!effectivePayment) throw new Error("Payment record disappeared during settlement.");
  if (
    nextStatus === "captured" &&
    effectivePayment.status === "captured" &&
    effectivePayment.razorpayPaymentId !== gatewayPayment.id
  ) {
    await Payment.updateOne(
      { _id: payment._id },
      {
        $set: { duplicateCapture: true },
        $addToSet: { duplicateCaptureIds: gatewayPayment.id },
      }
    );
    return { payment: effectivePayment, order: await Order.findById(payment.orderId), duplicate: true };
  }
  const order = await Order.findById(payment.orderId);
  if (!order) {
    throw new Error("Payment references a missing order.");
  }

  if (nextStatus === "captured") {
    if (
      order.orderStatus === "cancelled" ||
      order.orderStatus === "rejected" ||
      (order.razorpayOrderId && order.razorpayOrderId !== gatewayPayment.order_id)
    ) {
      await Payment.updateOne(
        { _id: payment._id },
        { $set: { requiresRefund: true } }
      );
      await Order.updateOne(
        { _id: order._id, paymentStatus: { $ne: "paid" } },
        { $set: { paymentStatus: "paid" } }
      );
      return { payment: effectivePayment, order, duplicate: false };
    }
    await Order.updateOne(
      { _id: order._id, orderStatus: "pending_payment" },
      {
        $set: { paymentStatus: "paid", orderStatus: "new" },
        $unset: { pendingPaymentExpiresAt: 1 },
        $push: { statusHistory: { status: "new", reason: "Razorpay payment captured" } },
      }
    );
  } else if (nextStatus === "authorized") {
    await Order.updateOne(
      { _id: order._id, orderStatus: "pending_payment", paymentStatus: "pending" },
      { $set: { paymentStatus: "authorized" } }
    );
  } else {
    await Order.updateOne(
      { _id: order._id, orderStatus: "pending_payment", paymentStatus: { $ne: "paid" } },
      { $set: { paymentStatus: "failed" } }
    );
  }

  return { payment: effectivePayment, order: await Order.findById(order._id), duplicate: !updatedPayment };
}
