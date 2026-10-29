import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { Order } from "@/models/Order";
import { logAuditEvent } from "@/lib/admin-security";
import { ObjectIdSchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const UpdateOrderStatusSchema = z.object({
  orderStatus: z.enum([
    "placed",
    "confirmed",
    "preparing",
    "ready_for_pickup",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ]),
  cancelledReason: z.string().trim().max(250).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const parsedId = ObjectIdSchema.safeParse(id);
    if (!parsedId.success) {
      return errorResponse("Invalid order ID", 400);
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const order = await Order.findById(id);
    if (!order) {
      return errorResponse("Order not found", 404);
    }

    // Role check and restaurant ownership check
    const authCheck = await verifyAdminPermissions(
      ["super_admin", "restaurant_manager", "order_manager", "veg_manager", "nonveg_manager"],
      order.restaurantId.toString()
    );
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
    }

    const body = await req.json();
    const { orderStatus, cancelledReason } = UpdateOrderStatusSchema.parse(body);

    const previousStatus = order.orderStatus;
    order.orderStatus = orderStatus;

    if (orderStatus === "cancelled" && cancelledReason) {
      order.cancelledReason = cancelledReason;
    }
    if (orderStatus === "delivered") {
      order.deliveredAt = new Date();
    }

    await order.save();

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAuditEvent({
      adminId: authCheck.admin!._id,
      restaurantId: order.restaurantId,
      action: `ORDER_STATUS_CHANGED_${orderStatus.toUpperCase()}`,
      entity: "Order",
      entityId: order._id,
      previousState: { status: previousStatus },
      newState: { status: orderStatus, cancelledReason },
      ipAddress: clientIp,
    });

    return successResponse(order);
  } catch (err) {
    return handleApiError(err);
  }
}

