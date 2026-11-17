import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { Order } from "@/models/Order";
import { DeliveryAssignment } from "@/models/DeliveryAssignment";
import { DeliveryPersonnel } from "@/models/DeliveryPersonnel";
import { releaseReservedInventory } from "@/lib/order-inventory";
import { logAuditEvent } from "@/lib/admin-security";
import { ObjectIdSchema } from "@/lib/validations/common";
import { isValidOrderTransition, normalizeOrderStatus, ORDER_STATUSES } from "@/lib/order-status";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const UpdateOrderStatusSchema = z.object({
  orderStatus: z.enum(ORDER_STATUSES),
  reason: z.string().trim().max(250).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const { id } = await params;
    if (!ObjectIdSchema.safeParse(id).success) return errorResponse("Invalid order ID.", 400);
    const order = await Order.findById(id);
    if (!order) return errorResponse("Order not found.", 404);
    const authCheck = await verifyAdminPermissions(
      ["super_admin", "restaurant_manager", "order_manager", "veg_manager", "nonveg_manager"],
      order.restaurantId.toString()
    );
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
    }

    const { orderStatus, reason } = UpdateOrderStatusSchema.parse(await req.json());
    const previousRaw = order.orderStatus;
    const previousStatus = normalizeOrderStatus(previousRaw);
    if (!previousStatus || !isValidOrderTransition(previousStatus, orderStatus)) {
      return errorResponse(`Invalid order transition from ${previousRaw} to ${orderStatus}.`, 409);
    }
    if (orderStatus === "dispatched") {
      return errorResponse("Delivery dispatch must be confirmed by the assigned delivery personnel.", 409);
    }
    if (
      orderStatus === "ready_for_pickup" &&
      order.fulfillmentType !== "takeaway"
    ) {
      return errorResponse("Ready for pickup is only valid for takeaway orders.", 409);
    }
    if (orderStatus === "delivered" && order.fulfillmentType === "delivery") {
      return errorResponse("Only the assigned delivery personnel can confirm a delivery.", 409);
    }
    if (previousStatus === "pending_payment" && order.paymentMethod === "razorpay") {
      return errorResponse("Razorpay payment must be verified before accepting this order.", 409);
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id, orderStatus: previousRaw },
      {
        $set: {
          orderStatus,
          ...(orderStatus === "cancelled" ? { cancelledReason: reason || "Cancelled by restaurant." } : {}),
          ...(orderStatus === "delivered" ? { deliveredAt: new Date() } : {}),
        },
        $push: {
          statusHistory: {
            status: orderStatus,
            changedBy: authCheck.admin!._id,
            ...(reason ? { reason } : {}),
          },
        },
      },
      { new: true }
    );
    if (!updatedOrder) return errorResponse("Order status changed. Refresh and retry.", 409);

    if (orderStatus === "cancelled" || orderStatus === "rejected") {
      try {
        await releaseReservedInventory(
          order,
          `Released inventory for ${order.orderNumber}`,
          authCheck.admin!._id
        );
      } catch (error) {
        await Order.updateOne(
          { _id: order._id, orderStatus },
          {
            $set: { orderStatus: previousRaw },
            $pull: { statusHistory: { status: orderStatus } },
            $unset: { cancelledReason: 1, deliveredAt: 1 },
          }
        );
        throw error;
      }
    }
    if (["cancelled", "rejected", "delivered"].includes(orderStatus)) {
      const activeAssignments = await DeliveryAssignment.find({
        orderId: order._id,
        status: { $in: ["assigned", "picked_up", "en_route"] },
      }).select("deliveryPersonnelId");
      await DeliveryAssignment.updateMany(
        { orderId: order._id, status: { $in: ["assigned", "picked_up", "en_route"] } },
        {
          $set: orderStatus === "delivered"
            ? { status: "delivered", deliveredAt: new Date() }
            : { status: "failed", failedReason: reason || "Order closed by administrator." },
        }
      );
      await DeliveryPersonnel.updateMany(
        { _id: { $in: activeAssignments.map((assignment) => assignment.deliveryPersonnelId) }, currentActiveOrderId: order._id },
        { $set: { status: "available" }, $unset: { currentActiveOrderId: 1 } }
      );
      await Order.updateOne(
        { _id: order._id },
        { $unset: { currentDeliveryPersonnelId: 1 } }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAuditEvent({
      actorId: authCheck.admin!._id,
      restaurantId: order.restaurantId,
      action: `ORDER_STATUS_CHANGED_${orderStatus.toUpperCase()}`,
      entity: "Order",
      entityId: order._id,
      previousState: { status: previousRaw },
      newState: { status: orderStatus, reason },
      ipAddress,
    });
    return successResponse(updatedOrder);
  } catch (err) {
    return handleApiError(err);
  }
}
