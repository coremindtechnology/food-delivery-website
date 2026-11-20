import { NextRequest } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminUser } from "@/models/AdminUser";
import { AdminLoginChallenge } from "@/models/AdminLoginChallenge";
import {
  verifyPassword,
  logAuditEvent,
} from "@/lib/admin-security";
import { generateOTP, hashString } from "@/lib/auth";
import { sendOtpSms } from "@/lib/sms";
import { MAX_LOGIN_ATTEMPTS, LOCKOUT_MINUTES } from "@/lib/admin-auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const Step1Schema = z.object({
  email: z.string().trim().email("Valid email required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const body = await req.json();
    const { email, password } = Step1Schema.parse(body);

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    // 1. Find Admin User
    const admin = await AdminUser.findOne({ email: email.toLowerCase() });
    if (
      !admin ||
      !admin.isActive ||
      (admin.temporaryAccessExpiresAt && admin.temporaryAccessExpiresAt <= new Date())
    ) {
      // Dummy check to prevent email enumeration timing attacks
      await verifyPassword("dummy", "scrypt$16384$8$1$00$00");
      return errorResponse("Invalid email or password", 401);
    }

    // 2. Check Persistent Lockout Status
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (admin.lockedUntil.getTime() - Date.now()) / (60 * 1000)
      );
      await logAuditEvent({
        actorId: admin._id,
        action: "LOGIN_REJECTED_LOCKED",
        entity: "Admin",
        entityId: admin._id,
        ipAddress: clientIp,
      });
      return errorResponse(
        `Account locked due to consecutive failed attempts. Try again in ${remainingMinutes} minute(s).`,
        423,
        { locked: true, remainingMinutes }
      );
    }

    // 3. Verify Password
    const passwordValid = await verifyPassword(password, admin.passwordHash);
    if (!passwordValid) {
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;

      if (admin.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        admin.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        await admin.save();

        await logAuditEvent({
          actorId: admin._id,
          action: "ACCOUNT_LOCKED_FAILED_ATTEMPTS",
          entity: "Admin",
          entityId: admin._id,
          ipAddress: clientIp,
        });

        return errorResponse(
          `Maximum failed attempts exceeded. Account locked for ${LOCKOUT_MINUTES} minutes.`,
          423,
          { locked: true, remainingMinutes: LOCKOUT_MINUTES }
        );
      }

      await admin.save();

      const remaining = MAX_LOGIN_ATTEMPTS - admin.failedLoginAttempts;
      await logAuditEvent({
        actorId: admin._id,
        action: "LOGIN_PASSWORD_FAILED",
        entity: "Admin",
        entityId: admin._id,
        ipAddress: clientIp,
      });

      return errorResponse(`Invalid credentials. ${remaining} attempt(s) remaining before lockout.`, 401, {
        attemptsRemaining: remaining,
      });
    }

    // 4. Generate SMS OTP & Challenge Token
    const plainOtp = generateOTP();
    const smsOtpHash = hashString(plainOtp);
    const smsOtpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const rawChallengeToken = crypto.randomBytes(32).toString("hex");
    const challengeTokenHash = crypto.createHash("sha256").update(rawChallengeToken).digest("hex");

    // Clean up any stale challenges
    await AdminLoginChallenge.deleteMany({ adminId: admin._id });

    // Store new challenge in MongoDB
    await AdminLoginChallenge.create({
      adminId: admin._id,
      challengeTokenHash,
      step: "password_verified",
      smsOtpHash,
      smsOtpExpiresAt,
      attempts: 0,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min challenge window
    });

    // 5. Send SMS OTP
    const smsResult = await sendOtpSms(admin.phone, plainOtp);
    if (!smsResult.success) {
      return errorResponse("Failed to dispatch SMS OTP. Please try again.", 500);
    }

    await logAuditEvent({
      actorId: admin._id,
      action: "LOGIN_STEP1_PASSWORD_VERIFIED",
      entity: "Admin",
      entityId: admin._id,
      ipAddress: clientIp,
    });

    return successResponse(
      {
        step: 2,
        challengeToken: rawChallengeToken,
        maskedPhone: admin.phone.replace(/(\d{2})\d{4}(\d{4})/, "$1****$2"),
        message: "Password verified. Enter 6-digit SMS OTP.",
        devOtp: smsResult.devOtp, // Only in dev mode
      },
      200
    );
  } catch (err) {
    return handleApiError(err);
  }
}
