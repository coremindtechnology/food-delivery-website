import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Restaurant } from "@/models/Restaurant";
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

    const restaurant = await Restaurant.findById(order.restaurantId)
      .select("name slug phone contactPhone address heroImage accentColor")
      .lean();

    return successResponse({
      order,
      restaurant,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

