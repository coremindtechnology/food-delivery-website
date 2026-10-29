import { NextRequest } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { Refund } from "@/models/Refund";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { FinancialLedgerEntry } from "@/models/FinancialLedgerEntry";
import { logAuditEvent } from "@/lib/admin-security";
import { ObjectIdSchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const ProcessRefundSchema = z.object({
  orderId: ObjectIdSchema,
  amount: z.number().min(1),
  reason: z.string().trim().min(3).max(300),
});

export async function GET() {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const authCheck = await verifyAdminPermissions(["super_admin", "restaurant_manager", "finance_viewer"]);
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 401);
    }

    const refunds = await Refund.find()
      .populate("orderId", "orderNumber customerName customerPhone totalAmount")
      .populate("processedByAdminId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(refunds);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const authCheck = await verifyAdminPermissions(["super_admin", "restaurant_manager"]);
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
    }

    const body = await req.json();
    const { orderId, amount, reason } = ProcessRefundSchema.parse(body);

    const order = await Order.findById(orderId);
    if (!order) return errorResponse("Order not found", 404);

    let payment = await Payment.findOne({ orderId: order._id });
    if (!payment) {
      // Create synthetic payment reference for reconciliation if COD
      payment = await Payment.create({
        orderId: order._id,
        restaurantId: order.restaurantId,
        amount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        status: "captured",
      });
    }

    const razorpayRefundId = `rfnd_${crypto.randomBytes(6).toString("hex")}`;

    const createdRefund = await Refund.create({
      orderId: order._id,
      paymentId: payment._id,
      restaurantId: order.restaurantId,
      amount,
      reason,
      status: "processed",
      razorpayRefundId,
      processedByAdminId: authCheck.admin!._id,
    });

    order.paymentStatus = "refunded";
    await order.save();

    payment.status = "refunded";
    await payment.save();

    // Ledger debit entry
    const lastEntry = await FinancialLedgerEntry.findOne({ restaurantId: order.restaurantId })
      .sort({ createdAt: -1 });
    const balanceAfter = (lastEntry ? lastEntry.balanceAfter : 0) - amount;

    await FinancialLedgerEntry.create({
      restaurantId: order.restaurantId,
      entryType: "debit",
      category: "refund",
      amount,
      balanceAfter,
      referenceModel: "Refund",
      referenceId: createdRefund._id,
      description: `Customer refund: ${order.orderNumber} - ${reason}`,
    });

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAuditEvent({
      actorId: authCheck.admin!._id,
      restaurantId: order.restaurantId,
      action: "REFUND_ISSUED",
      entity: "Refund",
      entityId: createdRefund._id,
      newState: { orderNumber: order.orderNumber, amount, reason },
      ipAddress: clientIp,
    });

    return successResponse(createdRefund, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
