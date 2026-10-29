import { NextRequest } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminUser } from "@/models/AdminUser";
import { AdminLoginChallenge } from "@/models/AdminLoginChallenge";
import { logAuditEvent } from "@/lib/admin-security";
import { hashString } from "@/lib/auth";
import { MAX_LOGIN_ATTEMPTS, LOCKOUT_MINUTES } from "@/lib/admin-auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const Step2Schema = z.object({
  challengeToken: z.string().min(1, "Challenge token is required"),
  otp: z.string().trim().regex(/^\d{6}$/, "SMS OTP must be 6 digits"),
});

export async function POST(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const body = await req.json();
    const { challengeToken, otp } = Step2Schema.parse(body);

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const tokenHash = crypto.createHash("sha256").update(challengeToken).digest("hex");

    // 1. Fetch Challenge
    const challenge = await AdminLoginChallenge.findOne({ challengeTokenHash: tokenHash });
    if (!challenge || challenge.step !== "password_verified") {
      return errorResponse("Invalid or expired login challenge. Please log in again.", 400);
    }

    const admin = await AdminUser.findById(challenge.adminId);
    if (!admin || !admin.isActive) {
      return errorResponse("Account inactive or not found.", 403);
    }

    // 2. Check Expiration
    if (new Date() > challenge.smsOtpExpiresAt || new Date() > challenge.expiresAt) {
      await AdminLoginChallenge.deleteOne({ _id: challenge._id });
      return errorResponse("SMS OTP has expired. Please log in again.", 400);
    }

    // 3. Check Attempt Limit
    if (challenge.attempts >= MAX_LOGIN_ATTEMPTS || admin.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
      admin.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      await admin.save();
      await AdminLoginChallenge.deleteOne({ _id: challenge._id });

      await logAuditEvent({
        actorId: admin._id,
        action: "ACCOUNT_LOCKED_OTP_ATTEMPTS",
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

    // 4. Verify OTP Hash
    const inputHash = hashString(otp);
    if (inputHash !== challenge.smsOtpHash) {
      challenge.attempts += 1;
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;
      await Promise.all([challenge.save(), admin.save()]);

      const remaining = Math.max(0, MAX_LOGIN_ATTEMPTS - challenge.attempts);

      await logAuditEvent({
        actorId: admin._id,
        action: "LOGIN_SMS_OTP_FAILED",
        entity: "Admin",
        entityId: admin._id,
        ipAddress: clientIp,
      });

      if (remaining === 0) {
        admin.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        await admin.save();
        await AdminLoginChallenge.deleteOne({ _id: challenge._id });
        return errorResponse(
          `Incorrect OTP. Maximum attempts exceeded. Account locked for ${LOCKOUT_MINUTES} minutes.`,
          423,
          { locked: true, remainingMinutes: LOCKOUT_MINUTES }
        );
      }

      return errorResponse(`Incorrect SMS OTP. ${remaining} attempt(s) remaining.`, 400, {
        attemptsRemaining: remaining,
      });
    }

    // 5. Advance Challenge to SMS Verified
    challenge.step = "sms_verified";
    challenge.attempts = 0; // reset for final factor
    await challenge.save();

    await logAuditEvent({
      actorId: admin._id,
      action: "LOGIN_STEP2_SMS_VERIFIED",
      entity: "Admin",
      entityId: admin._id,
      ipAddress: clientIp,
    });

    return successResponse(
      {
        step: 3,
        totpEnabled: admin.totpEnabled,
        message: admin.totpEnabled
          ? "SMS OTP verified. Enter 6-digit Authenticator App TOTP code or recovery code."
          : "SMS OTP verified. Initial MFA enrollment required to complete login.",
      },
      200
    );
  } catch (err) {
    return handleApiError(err);
  }
}
