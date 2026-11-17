import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { getAuthenticatedDeliveryPersonnel } from "@/lib/delivery-auth";
import { DeliveryAssignment, IDeliveryAssignment } from "@/models/DeliveryAssignment";
import { DeliveryPersonnel } from "@/models/DeliveryPersonnel";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { checkRateLimit } from "@/lib/auth";
import { sendOtpSms } from "@/lib/sms";
import { ObjectIdSchema } from "@/lib/validations/common";
import {
  calculateCodCollection,
  canDeliveryPersonnelAct,
  generateDeliveryConfirmationCode,
  hashDeliveryConfirmationCode,
  ownsDeliveryAssignment,
  verifyDeliveryConfirmationCode,
} from "@/lib/delivery-status";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

const Schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("pickup_confirm") }),
  z.object({ action: z.literal("en_route") }),
  z.object({
    action: z.literal("delivered"),
    deliveryCode: z.string().regex(/^\d{6}$/),
    cashCollectedAmount: z.number().min(0).optional(),
  }),
  z.object({
    action: z.literal("failed"),
    reason: z.string().trim().min(3).max(300),
  }),
]);

interface RouteParams {
  params: Promise<{ id: string }>;
}

class DeliveryConflictError extends Error {}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const rider = await getAuthenticatedDeliveryPersonnel();
    if (!rider) return errorResponse("Delivery personnel authentication required.", 401);
    const { id } = await params;
    if (!ObjectIdSchema.safeParse(id).success) return errorResponse("Invalid assignment ID.", 400);
    const input = Schema.parse(await req.json());
    const assignment = await DeliveryAssignment.findOne({
      _id: id,
      deliveryPersonnelId: rider._id,
    });
    if (!assignment) return errorResponse("Assigned delivery not found.", 404);
    if (!ownsDeliveryAssignment(
      assignment.deliveryPersonnelId.toString(),
      rider._id.toString()
    )) {
      return errorResponse("Assigned delivery not found.", 404);
    }
    const order = await Order.findById(assignment.orderId).select("+deliveryConfirmationCodeHash");
    if (!order) return errorResponse("Order not found.", 404);

    if (input.action === "pickup_confirm") {
      if (
        !canDeliveryPersonnelAct(assignment.status, input.action) ||
        !["ready", "dispatched"].includes(order.orderStatus)
      ) {
        return errorResponse("Only an assigned, ready delivery can be picked up.", 409);
      }
      const updatedAssignment = await DeliveryAssignment.findOneAndUpdate(
        { _id: assignment._id, deliveryPersonnelId: rider._id, status: "assigned" },
        { $set: { status: "picked_up", pickedUpAt: new Date() } },
        { new: true }
      );
      if (!updatedAssignment) return errorResponse("Delivery status changed. Refresh and retry.", 409);
      if (order.orderStatus === "ready") {
        const updatedOrder = await Order.findOneAndUpdate(
          {
            _id: order._id,
            orderStatus: "ready",
            currentDeliveryPersonnelId: rider._id,
          },
          {
            $set: { orderStatus: "dispatched" },
            $push: { statusHistory: { status: "dispatched", changedBy: rider._id, reason: "Pickup confirmed" } },
          },
          { new: true }
        );
        if (!updatedOrder) {
          await DeliveryAssignment.updateOne(
            { _id: updatedAssignment._id, status: "picked_up" },
            { $set: { status: "assigned" }, $unset: { pickedUpAt: 1 } }
          );
          return errorResponse("Order status changed. Refresh and retry.", 409);
        }
      }
      return successResponse(updatedAssignment);
    }

    if (input.action === "en_route") {
      if (!canDeliveryPersonnelAct(assignment.status, input.action)) {
        return errorResponse("Confirm pickup before marking en route.", 409);
      }
      if (
        order.orderStatus !== "dispatched" ||
        order.currentDeliveryPersonnelId?.toString() !== rider._id.toString()
      ) {
        return errorResponse("Order is no longer assigned to you.", 409);
      }
      if (!checkRateLimit(`delivery-code:${order._id}`, 3, 10 * 60 * 1000)) {
        return errorResponse("Too many delivery-code requests. Wait before retrying.", 429);
      }
      const code = generateDeliveryConfirmationCode();
      const previousHash = order.deliveryConfirmationCodeHash;
      const codeCooldownEndedAt = new Date(Date.now() - 60 * 1000);
      const codeUpdate = await Order.updateOne(
        {
          _id: order._id,
          orderStatus: "dispatched",
          currentDeliveryPersonnelId: rider._id,
          deliveryConfirmationCodeHash: previousHash ?? { $exists: false },
          $or: [
            { deliveryConfirmationLastSentAt: { $lte: codeCooldownEndedAt } },
            { deliveryConfirmationLastSentAt: { $exists: false } },
          ],
        },
        {
          $set: {
            deliveryConfirmationCodeHash: hashDeliveryConfirmationCode(code),
            deliveryConfirmationExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
            deliveryConfirmationAttempts: 0,
            deliveryConfirmationLastSentAt: new Date(),
          },
          $unset: { deliveryConfirmationVerifiedAt: 1 },
        }
      );
      if (codeUpdate.modifiedCount !== 1) {
        return errorResponse("A delivery code was issued concurrently. Ask the customer to check their SMS.", 409);
      }
      const sms = await sendOtpSms(order.customerPhone, code);
      if (!sms.success) {
        await Order.updateOne(
          { _id: order._id, deliveryConfirmationCodeHash: hashDeliveryConfirmationCode(code) },
          {
            $unset: { deliveryConfirmationCodeHash: 1, deliveryConfirmationExpiresAt: 1 },
            $set: { deliveryConfirmationAttempts: 0 },
          }
        );
        return errorResponse(sms.error || "Unable to send delivery confirmation code.", 503);
      }
      if (assignment.status === "picked_up") {
        const updated = await DeliveryAssignment.findOneAndUpdate(
          { _id: assignment._id, deliveryPersonnelId: rider._id, status: "picked_up" },
          { $set: { status: "en_route", enRouteAt: new Date() } },
          { new: true }
        );
        if (!updated) {
          await Order.updateOne(
            { _id: order._id, deliveryConfirmationCodeHash: hashDeliveryConfirmationCode(code) },
            { $unset: { deliveryConfirmationCodeHash: 1, deliveryConfirmationExpiresAt: 1 } }
          );
          return errorResponse("Delivery state changed while sending the confirmation code.", 409);
        }
        return successResponse(updated);
      }
      return successResponse(assignment);
    }

    if (input.action === "failed") {
      if (!canDeliveryPersonnelAct(assignment.status, input.action)) {
        return errorResponse("Only an active delivery can be marked failed.", 409);
      }
      const failedOrder = await Order.findOneAndUpdate(
        {
          _id: order._id,
          orderStatus: "dispatched",
          currentDeliveryPersonnelId: rider._id,
        },
        {
          $unset: {
            currentDeliveryPersonnelId: 1,
            deliveryConfirmationCodeHash: 1,
            deliveryConfirmationExpiresAt: 1,
          },
          $push: {
            statusHistory: {
              status: "dispatched",
              changedBy: rider._id,
              reason: `Delivery failed: ${input.reason}`,
            },
          },
        },
        { new: true }
      );
      if (!failedOrder) return errorResponse("Order is no longer assigned to you.", 409);
      const updated = await DeliveryAssignment.findOneAndUpdate(
        { _id: assignment._id, deliveryPersonnelId: rider._id, status: assignment.status },
        { $set: { status: "failed", failedAt: new Date(), failedReason: input.reason } },
        { new: true }
      );
      if (!updated) {
        await Order.updateOne(
          { _id: order._id, orderStatus: "dispatched", currentDeliveryPersonnelId: { $exists: false } },
          {
            $set: { currentDeliveryPersonnelId: rider._id },
            $pull: { statusHistory: { reason: `Delivery failed: ${input.reason}` } },
          }
        );
        return errorResponse("Delivery status changed. Refresh and retry.", 409);
      }
      await DeliveryPersonnel.updateOne(
        { _id: rider._id, currentActiveOrderId: order._id },
        { $set: { status: "available" }, $unset: { currentActiveOrderId: 1 } }
      );
      return successResponse(updated);
    }

    if (!canDeliveryPersonnelAct(assignment.status, input.action) || order.orderStatus !== "dispatched") {
      return errorResponse("Only an en-route delivery can be confirmed delivered.", 409);
    }
    if (
      !order.deliveryConfirmationCodeHash ||
      !order.deliveryConfirmationExpiresAt ||
      order.deliveryConfirmationExpiresAt <= new Date() ||
      order.deliveryConfirmationAttempts >= 5
    ) {
      return errorResponse("The delivery confirmation code is unavailable or expired. Request a new code.", 409);
    }
    if (!verifyDeliveryConfirmationCode(input.deliveryCode, order.deliveryConfirmationCodeHash)) {
      await Order.updateOne(
        {
          _id: order._id,
          orderStatus: "dispatched",
          currentDeliveryPersonnelId: rider._id,
          deliveryConfirmationAttempts: { $lt: 5 },
        },
        { $inc: { deliveryConfirmationAttempts: 1 } }
      );
      return errorResponse("Delivery confirmation code is invalid.", 400);
    }
    const cashCollectedAmount = input.cashCollectedAmount ?? 0;
    const codSettlement = order.paymentMethod === "cod"
      ? calculateCodCollection(
          order.cashOutstandingAmount,
          order.cashCollectedAmount,
          cashCollectedAmount
        )
      : null;
    if (order.paymentMethod === "cod" && !codSettlement) {
      return errorResponse("Collected cash cannot exceed the COD amount outstanding.", 400);
    }
    if (order.paymentMethod !== "cod" && cashCollectedAmount !== 0) {
      return errorResponse("Cash collection is only valid for COD orders.", 400);
    }

    const codPayment = order.paymentMethod === "cod"
      ? await Payment.findOne({ orderId: order._id, paymentMethod: "cod" })
      : null;
    if (order.paymentMethod === "cod" && (
      !codPayment ||
      codPayment.codOutstandingAmount !== order.cashOutstandingAmount ||
      codPayment.codCollectedAmount !== order.cashCollectedAmount
    )) {
      return errorResponse("COD ledger does not match the order. Reconciliation is required before delivery confirmation.", 409);
    }

    const session = await mongoose.startSession();
    let updatedAssignment: IDeliveryAssignment | null = null;
    try {
      await session.withTransaction(async () => {
        if (codPayment && codSettlement) {
          const nextCollected = codSettlement.collected;
          const nextOutstanding = codSettlement.outstanding;
          const updatedCodPayment = await Payment.findOneAndUpdate(
            {
              _id: codPayment._id,
              codOutstandingAmount: codPayment.codOutstandingAmount,
              codCollectedAmount: codPayment.codCollectedAmount,
            },
            {
              $inc: {
                codCollectedAmount: cashCollectedAmount,
                codOutstandingAmount: -cashCollectedAmount,
              },
              $set: {
                status: nextOutstanding === 0
                  ? "captured"
                  : nextCollected === 0
                    ? "created"
                    : "partially_paid",
              },
              ...(cashCollectedAmount > 0
                ? {
                    $push: {
                      codCollections: {
                        amount: cashCollectedAmount,
                        collectedAt: new Date(),
                        collectedByDeliveryPersonnelId: rider._id,
                      },
                    },
                  }
                : {}),
            },
            { new: true, session }
          );
          if (!updatedCodPayment) {
            throw new DeliveryConflictError("COD payment was updated concurrently. Refresh and retry.");
          }
        }

        const updatedOrder = await Order.findOneAndUpdate(
          {
            _id: order._id,
            orderStatus: "dispatched",
            currentDeliveryPersonnelId: rider._id,
            deliveryConfirmationCodeHash: order.deliveryConfirmationCodeHash,
            deliveryConfirmationExpiresAt: { $gt: new Date() },
            deliveryConfirmationAttempts: { $lt: 5 },
          },
          {
            $set: {
              orderStatus: "delivered",
              deliveredAt: new Date(),
              deliveryConfirmationVerifiedAt: new Date(),
              cashCollectedAmount: codSettlement?.collected ?? order.cashCollectedAmount,
              cashOutstandingAmount: codSettlement?.outstanding ?? order.cashOutstandingAmount,
              ...(order.paymentMethod === "cod" && codSettlement?.outstanding === 0
                ? { paymentStatus: "paid" }
                : order.paymentMethod === "cod" && cashCollectedAmount > 0
                  ? { paymentStatus: "partially_paid" }
                  : {}),
            },
            $push: {
              statusHistory: {
                status: "delivered",
                changedBy: rider._id,
                reason: "Customer delivery code verified by assigned rider",
              },
            },
          },
          { new: true, session }
        );
        if (!updatedOrder) {
          throw new DeliveryConflictError("Order status changed. Refresh and retry.");
        }

        updatedAssignment = await DeliveryAssignment.findOneAndUpdate(
          { _id: assignment._id, deliveryPersonnelId: rider._id, status: "en_route" },
          { $set: { status: "delivered", deliveredAt: new Date(), cashCollectedAmount } },
          { new: true, session }
        );
        if (!updatedAssignment) {
          throw new DeliveryConflictError("Delivery assignment status changed. Refresh and retry.");
        }
        const riderUpdate = await DeliveryPersonnel.updateOne(
          { _id: rider._id, currentActiveOrderId: order._id },
          { $set: { status: "available" }, $unset: { currentActiveOrderId: 1 } },
          { session }
        );
        if (riderUpdate.matchedCount !== 1) {
          throw new DeliveryConflictError("Delivery personnel assignment changed. Refresh and retry.");
        }
      });
    } finally {
      await session.endSession();
    }
    return successResponse(updatedAssignment);
  } catch (err) {
    if (err instanceof DeliveryConflictError) return errorResponse(err.message, 409);
    return handleApiError(err);
  }
}
