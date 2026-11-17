import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getAuthenticatedDeliveryPersonnel } from "@/lib/delivery-auth";
import { DeliveryAssignment } from "@/models/DeliveryAssignment";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const rider = await getAuthenticatedDeliveryPersonnel();
    if (!rider) return errorResponse("Delivery personnel authentication required.", 401);
    const history = req.nextUrl.searchParams.get("history") === "true";
    const assignments = await DeliveryAssignment.find({
      deliveryPersonnelId: rider._id,
      ...(history ? {} : { status: { $in: ["assigned", "picked_up", "en_route"] } }),
    })
      .populate(
        "orderId",
        "orderNumber orderStatus fulfillmentType paymentMethod totalAmount cashOutstandingAmount customerName customerPhone deliveryNotes deliveryAddress"
      )
      .populate("restaurantId", "name phone contactPhone address")
      .sort({ assignedAt: -1 })
      .limit(history ? 100 : 30)
      .lean();
    return successResponse(assignments);
  } catch (err) {
    return handleApiError(err);
  }
}
