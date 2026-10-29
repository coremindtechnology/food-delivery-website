import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { AuditLog } from "@/models/AuditLog";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const authCheck = await verifyAdminPermissions(["super_admin"]);
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Super Admin privileges required to view audit trail", authCheck.statusCode || 403);
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const entity = searchParams.get("entity");
    const action = searchParams.get("action");

    const filter: Record<string, unknown> = {};
    if (entity) filter.entity = entity;
    if (action) filter.action = { $regex: action, $options: "i" };

    const skip = (page - 1) * limit;

    const [logs, totalCount] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    return successResponse(logs, 200, {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

