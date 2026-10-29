import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { Restaurant } from "@/models/Restaurant";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return errorResponse("Not authenticated as administrator", 401);
    }

    let assignedRestaurant = null;
    if (admin.assignedRestaurantId) {
      assignedRestaurant = await Restaurant.findById(admin.assignedRestaurantId)
        .select("name slug type isOpen")
        .lean();
    }

    return successResponse({
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        assignedRestaurantId: admin.assignedRestaurantId,
        assignedRestaurant,
        totpEnabled: admin.totpEnabled,
        lastLoginAt: admin.lastLoginAt,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

