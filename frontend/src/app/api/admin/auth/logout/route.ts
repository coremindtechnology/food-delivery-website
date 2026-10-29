import { NextResponse } from "next/server";
import { revokeAdminSession, ADMIN_SESSION_COOKIE, getAuthenticatedAdmin } from "@/lib/admin-auth";
import { logAuditEvent } from "@/lib/admin-security";
import { handleApiError } from "@/lib/api-response";

export async function POST() {
  try {
    const admin = await getAuthenticatedAdmin();
    if (admin) {
      await logAuditEvent({
        adminId: admin._id,
        action: "ADMIN_LOGOUT",
        entity: "Admin",
        entityId: admin._id,
      });
    }

    await revokeAdminSession();

    const response = NextResponse.json({
      success: true,
      message: "Admin session revoked successfully",
    });

    response.cookies.delete(ADMIN_SESSION_COOKIE);

    return response;
  } catch (err) {
    return handleApiError(err);
  }
}

