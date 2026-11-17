import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { OTPChallenge } from "@/models/OTPChallenge";
import { SendOtpSchema } from "@/lib/validations/auth";
import {
  generateOTP,
  hashString,
  checkRateLimit,
  OTP_COOLDOWN_SECONDS,
  OTP_EXPIRY_MINUTES,
} from "@/lib/auth";
import { sendOtpSms } from "@/lib/sms";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const body = await req.json();
    const { phone } = SendOtpSchema.parse(body);

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    // 1. Rate limiting by IP and Phone
    if (!checkRateLimit(`ip:${clientIp}`, 10, 60 * 1000)) {
      return errorResponse("Too many requests from this IP. Please try again later.", 429);
    }
    if (!checkRateLimit(`phone:${phone}`, 5, 5 * 60 * 1000)) {
      return errorResponse("Too many OTP requests for this mobile number. Please try again later.", 429);
    }

    // 2. Cooldown check: Has an OTP been sent in the last 60 seconds?
    const recentChallenge = await OTPChallenge.findOne({ phone }).sort({ createdAt: -1 });
    if (recentChallenge) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(recentChallenge.createdAt).getTime()) / 1000);
      if (elapsedSeconds < OTP_COOLDOWN_SECONDS) {
        const remainingSeconds = OTP_COOLDOWN_SECONDS - elapsedSeconds;
        return errorResponse(
          `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
          429,
          { remainingSeconds }
        );
      }
    }

    // 3. Generate & Hash OTP
    const plainOtp = generateOTP();
    const otpHash = hashString(plainOtp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Invalidate prior challenges for this phone
    await OTPChallenge.deleteMany({ phone });

    // Store new challenge
    await OTPChallenge.create({
      phone,
      otpHash,
      attempts: 0,
      isVerified: false,
      expiresAt,
    });

    // 4. Send SMS (or dev mock)
    const smsResult = await sendOtpSms(phone, plainOtp);
    if (!smsResult.success && process.env.NODE_ENV === "production") {
      return errorResponse(smsResult.error || "Failed to send OTP SMS. Please try again.", 500);
    }

    return successResponse(
      {
        message: "OTP sent successfully to your mobile number",
        cooldownSeconds: OTP_COOLDOWN_SECONDS,
        expiresInMinutes: OTP_EXPIRY_MINUTES,
        devOtp: smsResult.devOtp || "123456", // Populated for dev bypass
      },
      200
    );
  } catch (err) {
    return handleApiError(err);
  }
}

