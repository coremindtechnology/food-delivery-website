import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminUser, IAdminUser, AdminRole } from "@/models/AdminUser";
import { Session } from "@/models/Session";
import { getServerSecret } from "@/lib/server-secrets";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_DAYS = 7;
export const MAX_LOGIN_ATTEMPTS = 3;
export const LOCKOUT_MINUTES = 15;

function hashToken(token: string): string {
  const secret = getServerSecret("ADMIN_JWT_SECRET", "admin_salt_key_2026");
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

export async function createAdminSession(
  admin: IAdminUser,
  req?: NextRequest
): Promise<string> {
  await connectToDatabase();

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000);

  const ipAddress = req?.headers.get("x-forwarded-for") || req?.headers.get("x-real-ip") || undefined;
  const userAgent = req?.headers.get("user-agent") || undefined;

  await Session.create({
    userType: "admin",
    adminId: admin._id,
    tokenHash,
    ipAddress,
    userAgent,
    isValid: true,
    expiresAt,
  });

  return token;
}

export async function getAuthenticatedAdmin(): Promise<IAdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  await connectToDatabase();
  const tokenHash = hashToken(token);

  const session = await Session.findOne({
    tokenHash,
    userType: "admin",
    isValid: true,
    expiresAt: { $gt: new Date() },
  });

  if (!session || !session.adminId) return null;

  const admin = await AdminUser.findOne({
    _id: session.adminId,
    isActive: true,
  });

  if (admin?.temporaryAccessExpiresAt && admin.temporaryAccessExpiresAt <= new Date()) {
    return null;
  }

  return admin;
}

export async function revokeAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return;

  await connectToDatabase();
  const tokenHash = hashToken(token);
  await Session.updateMany({ tokenHash }, { $set: { isValid: false } });

  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export interface AuthCheckResult {
  authorized: boolean;
  admin?: IAdminUser;
  error?: string;
  statusCode?: number;
}

/**
 * Server-side RBAC and Restaurant Ownership verification
 */
export async function verifyAdminPermissions(
  allowedRoles?: AdminRole[],
  targetRestaurantId?: string
): Promise<AuthCheckResult> {
  const admin = await getAuthenticatedAdmin();

  if (!admin) {
    return {
      authorized: false,
      error: "Authentication required. Please log in to admin portal.",
      statusCode: 401,
    };
  }

  // 1. Super Admin has unrestricted universal privileges
  if (admin.role === "super_admin") {
    return { authorized: true, admin };
  }

  // 2. Role validation
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(admin.role)) {
      return {
        authorized: false,
        error: `Access denied. Role '${admin.role}' is not authorized for this operation.`,
        statusCode: 403,
      };
    }
  }

  // 3. Restaurant ownership check
  if (targetRestaurantId) {
    if (!admin.assignedRestaurantId) {
      return {
        authorized: false,
        error: "Access denied. No restaurant is assigned to this admin account.",
        statusCode: 403,
      };
    }
    if (admin.assignedRestaurantId.toString() !== targetRestaurantId.toString()) {
      return {
        authorized: false,
        error: "Access denied. You can only manage your assigned restaurant.",
        statusCode: 403,
      };
    }
  }

  return { authorized: true, admin };
}
