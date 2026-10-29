import { NextRequest } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import {
  verifyTotpCode,
  encryptSecret,
  logAuditEvent,
} from "@/lib/admin-security";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const ConfirmTotpSchema = z.object({
  secret: z.string().min(16),
  code: z.string().trim().regex(/^\d{6}$/, "Must be 6 digits"),
  recoveryCodes: z.array(z.string()).min(4),
});

export async function POST(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return errorResponse("Authentication required", 401);
    }

    const body = await req.json();
    const { secret, code, recoveryCodes } = ConfirmTotpSchema.parse(body);

    // Verify 6-digit TOTP code
    const isValid = verifyTotpCode(code, secret);
    if (!isValid) {
      return errorResponse("Invalid authenticator code. Check your device clock and try again.", 400);
    }

    // Encrypt secret with AES-256-GCM before saving to database
    const encryptedData = encryptSecret(secret);

    // Hash all recovery codes with SHA-256
    const hashedRecoveryCodes = recoveryCodes.map((c) =>
      crypto.createHash("sha256").update(c.trim().toUpperCase()).digest("hex")
    );

    admin.totpEncryptedSecret = encryptedData.encrypted;
    admin.totpIV = encryptedData.iv;
    admin.totpAuthTag = encryptedData.tag;
    admin.totpRecoveryCodes = hashedRecoveryCodes;
    admin.totpEnabled = true;
    admin.totpSecret = undefined; // Clear raw secret
    await admin.save();

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAuditEvent({
      adminId: admin._id,
      action: "TOTP_MFA_ENROLLED",
      entity: "Admin",
      entityId: admin._id,
      ipAddress: clientIp,
    });

    return successResponse({
      message: "Two-Factor Authentication (TOTP) successfully enrolled and activated.",
      totpEnabled: true,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

