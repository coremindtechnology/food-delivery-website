import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { Restaurant } from "@/models/Restaurant";
import { logAuditEvent } from "@/lib/admin-security";
import { CreateRestaurantSchema } from "@/lib/validations/restaurant";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const authCheck = await verifyAdminPermissions();
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 401);
    }

    const filter: Record<string, unknown> = { isArchived: false };
    if (authCheck.admin?.role !== "super_admin" && !authCheck.admin?.assignedRestaurantId) {
      return errorResponse("No restaurant is assigned to this admin account.", 403);
    }
    if (authCheck.admin?.role !== "super_admin" && authCheck.admin?.assignedRestaurantId) {
      filter._id = authCheck.admin.assignedRestaurantId;
    }
    const restaurants = await Restaurant.find(filter).sort({ name: 1 }).lean();
    return successResponse(restaurants);
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

    const authCheck = await verifyAdminPermissions(["super_admin"]);
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Super Admin access required", authCheck.statusCode || 403);
    }

    const validatedData = CreateRestaurantSchema.parse(await req.json());
    const existing = await Restaurant.findOne({ slug: validatedData.slug }).select("_id").lean();
    if (existing) {
      return errorResponse(`A restaurant with the '${validatedData.slug}' slug already exists.`, 409);
    }

    const restaurant = await Restaurant.create(validatedData);
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAuditEvent({
      actorId: authCheck.admin!._id,
      restaurantId: restaurant._id,
      action: "RESTAURANT_CREATED",
      entity: "Restaurant",
      entityId: restaurant._id,
      newState: { name: restaurant.name, slug: restaurant.slug, type: restaurant.type },
      ipAddress: clientIp,
    });

    return successResponse(restaurant, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
