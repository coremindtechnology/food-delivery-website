import { FinancialLedgerEntry } from "@/models/FinancialLedgerEntry";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { Refund } from "@/models/Refund";
import type { RazorpayRefund } from "@/lib/razorpay";

export async function applyRazorpayRefund(refundData: RazorpayRefund) {
  const refund = await Refund.findOne({ razorpayRefundId: refundData.id });
  if (!refund) return;
  const payment = await Payment.findById(refund.paymentId);
  if (
    !payment ||
    payment.paymentMethod !== "razorpay" ||
    payment.razorpayPaymentId !== refundData.payment_id ||
    Math.round(refund.amount * 100) !== refundData.amount ||
    refundData.currency !== payment.currency
  ) {
    throw new Error("Razorpay refund details do not match the recorded refund.");
  }

  if (refundData.status === "pending") {
    const updated = await Refund.findOneAndUpdate(
      { _id: refund._id, status: { $nin: ["processed", "failed"] } },
      { $set: { status: "pending" } },
      { new: true }
    );
    if (updated) await Order.updateOne(
      { _id: updated.orderId, refundStatus: { $nin: ["processed", "failed"] } },
      { $set: { refundStatus: "pending" } }
    );
    return;
  }
  if (refundData.status === "failed") {
    const failed = await Refund.findOneAndUpdate(
      { _id: refund._id, status: { $in: ["pending", "processing"] } },
      { $set: { status: "failed", failureReason: "Razorpay marked the refund failed." } },
      { new: true }
    );
    if (failed) {
      await Payment.updateOne(
        { _id: failed.paymentId, amountRefundReserved: { $gte: failed.amount } },
        { $inc: { amountRefundReserved: -failed.amount } }
      );
      const anotherPendingRefund = await Refund.exists({
        orderId: failed.orderId,
        _id: { $ne: failed._id },
        status: { $in: ["pending", "processing"] },
      });
      await Order.updateOne(
        { _id: failed.orderId, refundStatus: { $ne: "processed" } },
        { $set: { refundStatus: anotherPendingRefund ? "pending" : "failed" } }
      );
    }
    return;
  }
  if (refundData.status !== "processed") return;

  const processedId = refund._id;
  const updatedPayment = await Payment.findOneAndUpdate(
    {
      _id: payment._id,
      processedRefundIds: { $ne: processedId },
      amountRefundReserved: { $gte: refund.amount },
      $expr: {
        $lte: [
          { $add: ["$amountRefunded", "$amountRefundReserved"] },
          payment.amount,
        ],
      },
    },
    {
      $inc: {
        amountRefunded: refund.amount,
        amountRefundReserved: -refund.amount,
      },
      $addToSet: { processedRefundIds: processedId },
    },
    { new: true }
  );
  const effectivePayment = updatedPayment || (await Payment.findById(payment._id));
  if (!effectivePayment || !effectivePayment.processedRefundIds.some((id) => id.equals(processedId))) {
    throw new Error("Refund total exceeds the captured payment amount or reservation is missing.");
  }
  await Refund.updateOne(
    { _id: refund._id, status: { $ne: "processed" } },
    { $set: { status: "processed", processedAt: new Date(), failureReason: undefined } },
  );

  const fullyRefunded = effectivePayment.amountRefunded >= effectivePayment.amount;
  await Payment.updateOne(
    { _id: effectivePayment._id },
    { $set: { status: fullyRefunded ? "refunded" : "partially_refunded" } }
  );
  await Order.updateOne(
    { _id: refund.orderId },
    {
      $set: {
        paymentStatus: fullyRefunded ? "refunded" : "partially_refunded",
      },
    }
  );
  const pendingRefund = await Refund.exists({
    orderId: refund.orderId,
    _id: { $ne: refund._id },
    status: { $in: ["pending", "processing"] },
  });
  await Order.updateOne(
    { _id: refund.orderId },
    { $set: { refundStatus: pendingRefund ? "pending" : "processed" } }
  );

  const existingLedgerEntry = await FinancialLedgerEntry.findOne({
    referenceModel: "Refund",
    referenceId: refund._id,
  });
  if (!existingLedgerEntry) {
    const lastEntry = await FinancialLedgerEntry.findOne({ restaurantId: refund.restaurantId })
      .sort({ createdAt: -1 });
    await FinancialLedgerEntry.create({
      restaurantId: refund.restaurantId,
      entryType: "debit",
      category: "refund",
      amount: refund.amount,
      balanceAfter: (lastEntry?.balanceAfter || 0) - refund.amount,
      referenceModel: "Refund",
      referenceId: refund._id,
      description: `Verified customer refund: ${refund.reason}`,
    });
  }
}
