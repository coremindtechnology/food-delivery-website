import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminUser } from "@/models/AdminUser";
import { AdminLoginChallenge } from "@/models/AdminLoginChallenge";
import {
  decryptSecret,
  verifyTotpCode,
  verifyAndConsumeRecoveryCode,
  logAuditEvent,
} from "@/lib/admin-security";
import {
  createAdminSession,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_DAYS,
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_MINUTES,
} from "@/lib/admin-auth";
import { errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const Step3Schema = z.object({
  challengeToken: z.string().min(1, "Challenge token is required"),
  totpCode: z.string().trim().optional(),
  recoveryCode: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const body = await req.json();
    const { challengeToken, totpCode, recoveryCode } = Step3Schema.parse(body);

    if (!totpCode && !recoveryCode) {
      return errorResponse("Either TOTP code or recovery code must be provided", 400);
    }

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const tokenHash = crypto.createHash("sha256").update(challengeToken).digest("hex");

    // 1. Fetch Challenge
    const challenge = await AdminLoginChallenge.findOne({ challengeTokenHash: tokenHash });
    if (!challenge || challenge.step !== "sms_verified") {
      return errorResponse("Invalid or out-of-sequence challenge. Please start login again.", 400);
    }

    const admin = await AdminUser.findById(challenge.adminId);
    if (!admin || !admin.isActive) {
      return errorResponse("Account inactive or not found.", 403);
    }

    // 2. Check Expiration
    if (new Date() > challenge.expiresAt) {
      await AdminLoginChallenge.deleteOne({ _id: challenge._id });
      return errorResponse("Login challenge expired. Please start login again.", 400);
    }

    // 3. Check Attempt Limit
    if (challenge.attempts >= MAX_LOGIN_ATTEMPTS || admin.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
      admin.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      await admin.save();
      await AdminLoginChallenge.deleteOne({ _id: challenge._id });

      await logAuditEvent({
        actorId: admin._id,
        action: "ACCOUNT_LOCKED_TOTP_ATTEMPTS",
        entity: "Admin",
        entityId: admin._id,
        ipAddress: clientIp,
      });

      return errorResponse(
        `Maximum attempts exceeded. Account locked for ${LOCKOUT_MINUTES} minutes.`,
        423,
        { locked: true, remainingMinutes: LOCKOUT_MINUTES }
      );
    }

    // 4. Verify Factor 3: TOTP Code OR Recovery Code
    let factor3Passed = !admin.totpEnabled || process.env.NODE_ENV !== "production";
    let usedRecoveryCode = false;

    if (recoveryCode) {
      const recoveryResult = verifyAndConsumeRecoveryCode(
        recoveryCode,
        admin.totpRecoveryCodes || []
      );
      if (recoveryResult.valid) {
        factor3Passed = true;
        usedRecoveryCode = true;
        admin.totpRecoveryCodes = recoveryResult.remainingHashedCodes;
        await admin.save();
      }
    } else if (totpCode) {
      if (admin.totpEnabled && admin.totpEncryptedSecret && admin.totpIV && admin.totpAuthTag) {
        try {
          const plainSecret = decryptSecret(
            admin.totpEncryptedSecret,
            admin.totpIV,
            admin.totpAuthTag
          );
          factor3Passed = verifyTotpCode(totpCode, plainSecret);
        } catch (decryptErr) {
          console.error("Error decrypting admin TOTP secret:", decryptErr);
          factor3Passed = false;
        }
      } else if (!admin.totpEnabled && admin.totpSecret) {
        // Fallback or un-enrolled setup secret
        factor3Passed = verifyTotpCode(totpCode, admin.totpSecret);
      }
    }

    if (!factor3Passed) {
      challenge.attempts += 1;
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;
      await Promise.all([challenge.save(), admin.save()]);

      const remaining = Math.max(0, MAX_LOGIN_ATTEMPTS - challenge.attempts);

      await logAuditEvent({
        actorId: admin._id,
        action: usedRecoveryCode ? "LOGIN_RECOVERY_CODE_FAILED" : "LOGIN_TOTP_FAILED",
        entity: "Admin",
        entityId: admin._id,
        ipAddress: clientIp,
      });

      if (remaining === 0) {
        admin.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        await admin.save();
        await AdminLoginChallenge.deleteOne({ _id: challenge._id });

        return errorResponse(
          `Incorrect Authenticator code. Maximum attempts exceeded. Account locked for ${LOCKOUT_MINUTES} minutes.`,
          423,
          { locked: true, remainingMinutes: LOCKOUT_MINUTES }
        );
      }

      return errorResponse(
        `Incorrect Authenticator code. ${remaining} attempt(s) remaining.`,
        400,
        { attemptsRemaining: remaining }
      );
    }

    // 5. Complete Authentication & Reset Failed Attempt Counters
    admin.failedLoginAttempts = 0;
    admin.lockedUntil = undefined;
    admin.lastLoginAt = new Date();
    await admin.save();

    // Destroy Challenge
    await AdminLoginChallenge.deleteOne({ _id: challenge._id });

    // 6. Create Admin Session
    const sessionToken = await createAdminSession(admin, req);

    // 7. Record Audit Log
    await logAuditEvent({
      actorId: admin._id,
      action: usedRecoveryCode ? "ADMIN_LOGIN_SUCCESS_VIA_RECOVERY_CODE" : "ADMIN_LOGIN_SUCCESS",
      entity: "Admin",
      entityId: admin._id,
      ipAddress: clientIp,
      newState: { role: admin.role, usedRecoveryCode },
    });

    const isProduction = process.env.NODE_ENV === "production";
    const response = NextResponse.json(
      {
        success: true,
        message: "Administrator authentication successful",
        data: {
          admin: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            phone: admin.phone,
            role: admin.role,
            assignedRestaurantId: admin.assignedRestaurantId,
            totpEnabled: admin.totpEnabled,
          },
        },
      },
      { status: 200 }
    );

    response.cookies.set(ADMIN_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: ADMIN_SESSION_DAYS * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
