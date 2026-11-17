import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { DeliveryPersonnel } from "@/models/DeliveryPersonnel";
import { DeliveryAssignment } from "@/models/DeliveryAssignment";
import { Order } from "@/models/Order";
import { hashPassword, logAuditEvent } from "@/lib/admin-security";
import { ObjectIdSchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const CreateRiderSchema = z.object({
  name: z.string().trim().min(2).max(60),
  phone: z.string().trim().regex(/^\d{10}$/, "Valid 10-digit mobile required"),
  password: z.string().min(10).max(128),
  vehicleNumber: z.string().trim().min(4).max(20),
  assignedRestaurantId: ObjectIdSchema.optional(),
});
const AssignOrderSchema = z.object({
  orderId: ObjectIdSchema,
  deliveryPersonnelId: ObjectIdSchema,
});

export async function GET() {
  try {
    await connectToDatabase();
    const authCheck = await verifyAdminPermissions(["super_admin", "delivery_manager", "restaurant_manager"]);
    if (!authCheck.authorized) return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 401);
    if (authCheck.admin?.role !== "super_admin" && !authCheck.admin?.assignedRestaurantId) {
      return errorResponse("This admin account has no restaurant assignment.", 403);
    }
    const restaurantId = authCheck.admin?.role !== "super_admin"
      ? authCheck.admin?.assignedRestaurantId
      : undefined;
    const filter = restaurantId ? { restaurantId } : {};
    const riderFilter = restaurantId ? { assignedRestaurantId: restaurantId } : {};
    const dateParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const getDatePart = (type: string) => Number(dateParts.find((part) => part.type === type)?.value);
    const todayStart = new Date(Date.UTC(getDatePart("year"), getDatePart("month") - 1, getDatePart("day")) - 330 * 60 * 1000);
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const [riders, activeAssignments, readyOrders, deliveryHistory, deliveredTodayCounts] = await Promise.all([
      DeliveryPersonnel.find(riderFilter).select("-passwordHash").populate("currentActiveOrderId", "orderNumber totalAmount").lean(),
      DeliveryAssignment.find({ ...filter, status: { $in: ["assigned", "picked_up", "en_route"] } })
        .populate("orderId", "orderNumber orderStatus deliveryAddress totalAmount customerPhone customerName placedAt paymentMethod fulfillmentType")
        .populate("deliveryPersonnelId", "name phone vehicleNumber")
        .populate("restaurantId", "name slug")
        .sort({ assignedAt: -1 })
        .lean(),
      Order.find({
        ...(restaurantId ? { restaurantId } : {}),
        fulfillmentType: "delivery",
        orderStatus: { $in: ["ready", "dispatched"] },
        currentDeliveryPersonnelId: { $in: [null] },
      })
        .populate("restaurantId", "name slug")
        .select("orderNumber restaurantId restaurantSlug customerName customerPhone deliveryAddress totalAmount placedAt orderStatus paymentMethod")
        .sort({ placedAt: 1 })
        .limit(100)
        .lean(),
      DeliveryAssignment.find({
        ...filter,
        status: { $in: ["delivered", "failed"] },
      })
        .populate("orderId", "orderNumber deliveryAddress totalAmount customerPhone customerName")
        .populate("deliveryPersonnelId", "name phone vehicleNumber")
        .populate("restaurantId", "name slug")
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean(),
      DeliveryAssignment.aggregate([
        {
          $match: {
            ...filter,
            status: "delivered",
            deliveredAt: { $gte: todayStart, $lt: tomorrowStart },
          },
        },
        {
          $group: {
            _id: "$restaurantId",
            count: { $sum: 1 },
            averageMinutes: {
              $avg: { $divide: [{ $subtract: ["$deliveredAt", "$assignedAt"] }, 60_000] },
            },
          },
        },
      ]),
    ]);
    const deliveredTodayByRestaurant = Object.fromEntries(
      deliveredTodayCounts.map(({ _id, count }) => [_id.toString(), count]),
    );
    const averageDeliveryMinutesByRestaurant = Object.fromEntries(
      deliveredTodayCounts.map(({ _id, averageMinutes }) => [_id.toString(), Math.round(averageMinutes || 0)]),
    );
    const deliveredTodayCount = deliveredTodayCounts.reduce((total, entry) => total + entry.count, 0);
    const averageDeliveryMinutes = deliveredTodayCount
      ? Math.round(deliveredTodayCounts.reduce((total, entry) => total + (entry.averageMinutes || 0) * entry.count, 0) / deliveredTodayCount)
      : 0;
    return successResponse({
      riders,
      activeAssignments,
      readyOrders,
      deliveryHistory,
      deliveredTodayCount,
      deliveredTodayByRestaurant,
      averageDeliveryMinutes,
      averageDeliveryMinutesByRestaurant,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const authCheck = await verifyAdminPermissions(["super_admin", "delivery_manager", "restaurant_manager"]);
    if (!authCheck.authorized) return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);

    if ("vehicleNumber" in body) {
      const riderInput = CreateRiderSchema.parse(body);
      if (
        authCheck.admin?.role !== "super_admin" &&
        authCheck.admin?.assignedRestaurantId?.toString() !== riderInput.assignedRestaurantId
      ) {
        return errorResponse("You may only create personnel assigned to your restaurant.", 403);
      }
      const rider = await DeliveryPersonnel.create({
        ...riderInput,
        passwordHash: await hashPassword(riderInput.password),
      });
      return successResponse(
        { id: rider._id, name: rider.name, phone: rider.phone, vehicleNumber: rider.vehicleNumber },
        201
      );
    }

    const { orderId, deliveryPersonnelId } = AssignOrderSchema.parse(body);
    const order = await Order.findById(orderId);
    if (!order) return errorResponse("Order not found.", 404);
    const scopedAdmin = await verifyAdminPermissions(
      ["super_admin", "delivery_manager", "restaurant_manager"],
      order.restaurantId.toString()
    );
    if (!scopedAdmin.authorized) return errorResponse(scopedAdmin.error || "Unauthorized", scopedAdmin.statusCode || 403);
    if (order.fulfillmentType !== "delivery" || !["ready", "dispatched"].includes(order.orderStatus)) {
      return errorResponse("Only ready delivery orders can be assigned.", 409);
    }
    const assignedToRestaurant = scopedAdmin.admin?.role !== "super_admin"
      ? { assignedRestaurantId: order.restaurantId }
      : {
          $or: [
            { assignedRestaurantId: order.restaurantId },
            { assignedRestaurantId: { $exists: false } },
          ],
        };
    const rider = await DeliveryPersonnel.findOneAndUpdate(
      {
        _id: deliveryPersonnelId,
        isBlocked: false,
        status: "available",
        ...assignedToRestaurant,
      },
      { $set: { status: "on_delivery", currentActiveOrderId: order._id } },
      { new: true }
    );
    if (!rider) return errorResponse("Delivery personnel is unavailable or not assigned to this restaurant.", 409);
    try {
      const assignment = await DeliveryAssignment.create({
        orderId: order._id,
        restaurantId: order.restaurantId,
        deliveryPersonnelId: rider._id,
        status: "assigned",
        assignedAt: new Date(),
      });
      const orderUpdated = await Order.updateOne(
        { _id: order._id, orderStatus: { $in: ["ready", "dispatched"] } },
        {
          $set: { currentDeliveryPersonnelId: rider._id },
          $push: { statusHistory: { status: order.orderStatus, changedBy: scopedAdmin.admin!._id, reason: `Assigned to ${rider.name}` } },
        }
      );
      if (orderUpdated.modifiedCount !== 1) {
        await DeliveryAssignment.deleteOne({ _id: assignment._id });
        throw new Error("Order status changed while assigning the delivery personnel.");
      }
      const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
      await logAuditEvent({
        actorId: scopedAdmin.admin!._id,
        restaurantId: order.restaurantId,
        action: "ORDER_ASSIGNED_TO_DELIVERY_RIDER",
        entity: "Order",
        entityId: order._id,
        newState: { rider: rider.name, vehicle: rider.vehicleNumber },
        ipAddress,
      });
      return successResponse(assignment, 201);
    } catch (error) {
      await DeliveryPersonnel.updateOne(
        { _id: rider._id, currentActiveOrderId: order._id },
        { $set: { status: "available" }, $unset: { currentActiveOrderId: 1 } }
      );
      throw error;
    }
  } catch (err) {
    return handleApiError(err);
  }
}
