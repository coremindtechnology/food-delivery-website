import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { Restaurant } from "@/models/Restaurant";
import { logAuditEvent } from "@/lib/admin-security";
import { ObjectIdSchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const UpdateRestaurantSettingsSchema = z.object({
  isOpen: z.boolean().optional(),
  openingHours: z.string().trim().optional(),
  deliveryTime: z.string().trim().optional(),
  minOrderAmount: z.number().min(0).optional(),
  bannerText: z.string().trim().optional(),
  contactPhone: z.string().trim().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const parsedId = ObjectIdSchema.safeParse(id);
    if (!parsedId.success) {
      return errorResponse("Invalid restaurant ID", 400);
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const authCheck = await verifyAdminPermissions(["super_admin", "restaurant_manager"], id);
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
    }

    const body = await req.json();
    const validatedData = UpdateRestaurantSettingsSchema.parse(body);

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) return errorResponse("Restaurant not found", 404);

    const previousState = {
      isOpen: restaurant.isOpen,
      openingHours: restaurant.openingHours,
      minOrderAmount: restaurant.minOrderAmount,
    };

    Object.assign(restaurant, validatedData);
    await restaurant.save();

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAuditEvent({
      actorId: authCheck.admin!._id,
      restaurantId: restaurant._id,
      action: "RESTAURANT_SETTINGS_UPDATED",
      entity: "Restaurant",
      entityId: restaurant._id,
      previousState,
      newState: validatedData,
      ipAddress: clientIp,
    });

    return successResponse(restaurant);
  } catch (err) {
    return handleApiError(err);
  }
}
