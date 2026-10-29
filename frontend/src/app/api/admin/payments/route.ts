import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { Payment } from "@/models/Payment";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const authCheck = await verifyAdminPermissions(["super_admin", "finance_viewer", "restaurant_manager"]);
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 401);
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));

    const payments = await Payment.find()
      .populate("orderId", "orderNumber customerName totalAmount orderStatus")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return successResponse(payments);
  } catch (err) {
    return handleApiError(err);
  }
}

