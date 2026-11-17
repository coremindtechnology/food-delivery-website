import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Restaurant } from "@/models/Restaurant";
import { getCurrentCustomer } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ orderNumber: string }>;
}

// GET /api/orders/[orderNumber] — Tracking & receipt
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { orderNumber } = await params;
    if (!orderNumber) {
      return errorResponse("Order number is required", 400);
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const order = await Order.findOne({
      orderNumber: orderNumber.toUpperCase(),
    }).lean();

    if (!order) {
      return errorResponse("Order not found", 404);
    }
    const customer = await getCurrentCustomer();
    const isOwner = Boolean(
      customer &&
      ((order.customerId && order.customerId.toString() === customer._id.toString()) ||
        order.customerPhone === customer.phone)
    );

    // Sanitize sensitive personal info for public tracking if not logged in as the owner
    const trackingOrder = isOwner
      ? order
      : {
          ...order,
          customerPhone: order.customerPhone
            ? `******${order.customerPhone.slice(-4)}`
            : undefined,
          customerEmail: undefined,
          deliveryNotes: undefined,
        };

    const restaurant = await Restaurant.findById(order.restaurantId)
      .select("name slug phone contactPhone address heroImage accentColor")
      .lean();

    return successResponse({
      order: trackingOrder,
      restaurant,
      isOwner,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
