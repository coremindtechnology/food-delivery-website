import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { releaseReservedInventory } from "@/lib/order-inventory";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.ORDER_EXPIRY_CRON_SECRET;
    if (!secret || secret.length < 32) {
      return errorResponse("Order expiry job is not configured.", 503);
    }
    if (req.headers.get("authorization") !== `Bearer ${secret}`) {
      return errorResponse("Unauthorized.", 401);
    }
    await connectToDatabase();

    const expiredOrders = await Order.find({
      orderStatus: "pending_payment",
      pendingPaymentExpiresAt: { $lte: new Date() },
    })
      .sort({ pendingPaymentExpiresAt: 1 })
      .limit(100);

    let expiredCount = 0;
    for (const order of expiredOrders) {
      const expired = await Order.findOneAndUpdate(
        {
          _id: order._id,
          orderStatus: "pending_payment",
          pendingPaymentExpiresAt: { $lte: new Date() },
        },
        {
          $set: {
            orderStatus: "cancelled",
            cancelledReason: "Payment window expired.",
          },
          $push: {
            statusHistory: {
              status: "cancelled",
              reason: "Payment window expired; reserved inventory released.",
            },
          },
        },
        { new: true }
      );
      if (!expired) continue;

      try {
        await releaseReservedInventory(
          order,
          `Released expired payment reservation for ${order.orderNumber}`
        );
        expiredCount += 1;
      } catch (error) {
        await Order.updateOne(
          { _id: order._id, orderStatus: "cancelled", cancelledReason: "Payment window expired." },
          {
            $set: { orderStatus: "pending_payment" },
            $unset: { cancelledReason: 1 },
            $pull: { statusHistory: { reason: "Payment window expired; reserved inventory released." } },
          }
        );
        throw error;
      }
    }

    return successResponse({ expiredCount });
  } catch (err) {
    return handleApiError(err);
  }
}
