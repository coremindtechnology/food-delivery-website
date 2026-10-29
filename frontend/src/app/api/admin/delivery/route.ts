import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { DeliveryPersonnel } from "@/models/DeliveryPersonnel";
import { DeliveryAssignment } from "@/models/DeliveryAssignment";
import { Order } from "@/models/Order";
import { logAuditEvent } from "@/lib/admin-security";
import { ObjectIdSchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const CreateRiderSchema = z.object({
  name: z.string().trim().min(2).max(60),
  phone: z.string().trim().regex(/^\d{10}$/, "Valid 10-digit mobile required"),
  vehicleNumber: z.string().trim().min(4).max(20),
  assignedRestaurantId: ObjectIdSchema.optional(),
});

const AssignOrderSchema = z.object({
  orderId: ObjectIdSchema,
  deliveryPersonnelId: ObjectIdSchema,
});

export async function GET(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const authCheck = await verifyAdminPermissions([
      "super_admin",
      "delivery_manager",
      "restaurant_manager",
    ]);
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 401);
    }

    const [riders, activeAssignments] = await Promise.all([
      DeliveryPersonnel.find().populate("currentActiveOrderId", "orderNumber totalAmount").lean(),
      DeliveryAssignment.find({ status: { $in: ["assigned", "picked_up"] } })
        .populate("orderId", "orderNumber deliveryAddress totalAmount customerPhone")
        .populate("deliveryPersonnelId", "name phone vehicleNumber")
        .sort({ assignedAt: -1 })
        .lean(),
    ]);

    return successResponse({ riders, activeAssignments });
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

    const authCheck = await verifyAdminPermissions([
      "super_admin",
      "delivery_manager",
      "restaurant_manager",
    ]);
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
    }

    const body = await req.json();

    // Check if it is a rider creation or order assignment
    if (body.vehicleNumber) {
      const validated = CreateRiderSchema.parse(body);
      const rider = await DeliveryPersonnel.create(validated);
      return successResponse(rider, 201);
    } else {
      const { orderId, deliveryPersonnelId } = AssignOrderSchema.parse(body);

      const order = await Order.findById(orderId);
      if (!order) return errorResponse("Order not found", 404);

      const rider = await DeliveryPersonnel.findById(deliveryPersonnelId);
      if (!rider) return errorResponse("Delivery rider not found", 404);

      // Create Assignment
      const assignment = await DeliveryAssignment.create({
        orderId: order._id,
        restaurantId: order.restaurantId,
        deliveryPersonnelId: rider._id,
        status: "assigned",
        assignedAt: new Date(),
      });

      // Update rider status and active order
      rider.status = "on_delivery";
      rider.currentActiveOrderId = order._id;
      await rider.save();

      // Update order status to out_for_delivery
      order.orderStatus = "out_for_delivery";
      await order.save();

      const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
      await logAuditEvent({
        adminId: authCheck.admin!._id,
        restaurantId: order.restaurantId,
        action: "ORDER_ASSIGNED_TO_DELIVERY_RIDER",
        entity: "Order",
        entityId: order._id,
        newState: { rider: rider.name, vehicle: rider.vehicleNumber },
        ipAddress: clientIp,
      });

      return successResponse(assignment, 201);
    }
  } catch (err) {
    return handleApiError(err);
  }
}

