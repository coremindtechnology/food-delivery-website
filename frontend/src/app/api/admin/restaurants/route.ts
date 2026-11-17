import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { Restaurant } from "@/models/Restaurant";
import { logAuditEvent } from "@/lib/admin-security";
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
