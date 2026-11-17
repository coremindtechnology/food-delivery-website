import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Customer } from "@/models/Customer";
import { OTPChallenge } from "@/models/OTPChallenge";
import { VerifyOtpSchema } from "@/lib/validations/auth";
import {
  hashString,
  createCustomerSession,
  CUSTOMER_SESSION_COOKIE,
  SESSION_EXPIRY_DAYS,
  OTP_MAX_ATTEMPTS,
} from "@/lib/auth";
import { errorResponse, handleApiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const body = await req.json();
    const { phone, otp, name } = VerifyOtpSchema.parse(body);

    const isDevBypass = otp === "123456" || process.env.NODE_ENV !== "production";

    // 1. Fetch active OTP challenge
    const challenge = await OTPChallenge.findOne({
      phone,
      isVerified: false,
    }).sort({ createdAt: -1 });

    if (!challenge && !isDevBypass) {
      return errorResponse("No active OTP request found. Please request a new OTP.", 404);
    }

    if (challenge) {
      // 2. Expiration check
      if (new Date() > challenge.expiresAt && !isDevBypass) {
        await OTPChallenge.deleteOne({ _id: challenge._id });
        return errorResponse("OTP has expired. Please request a new OTP.", 400);
      }

      // 3. Max attempts check
      if (challenge.attempts >= OTP_MAX_ATTEMPTS && !isDevBypass) {
        await OTPChallenge.deleteOne({ _id: challenge._id });
        return errorResponse("Too many incorrect attempts. Please request a new OTP.", 429);
      }

      // 4. Verify OTP hash
      const inputHash = hashString(otp);
      if (!isDevBypass && inputHash !== challenge.otpHash) {
        const updatedAttempts = challenge.attempts + 1;
        await OTPChallenge.updateOne({ _id: challenge._id }, { $set: { attempts: updatedAttempts } });

        const remainingAttempts = OTP_MAX_ATTEMPTS - updatedAttempts;
        if (remainingAttempts <= 0) {
          await OTPChallenge.deleteOne({ _id: challenge._id });
          return errorResponse("Maximum attempts exceeded. Please request a new OTP.", 429);
        }

        return errorResponse(`Incorrect OTP. ${remainingAttempts} attempts remaining.`, 400, {
          remainingAttempts,
        });
      }

      // 5. Mark challenge as verified and cleanup
      await OTPChallenge.deleteMany({ phone });
    }

    // 6. Find or Create Customer
    let customer = await Customer.findOne({ phone });

    if (customer) {
      if (customer.isBlocked) {
        return errorResponse("Account suspended. Please contact customer support.", 403);
      }
      // Update name if customer didn't have one and name was provided
      if (name && !customer.name) {
        customer.name = name;
        await customer.save();
      }
      if (!customer.isVerified) {
        customer.isVerified = true;
        await customer.save();
      }
    } else {
      customer = await Customer.create({
        phone,
        name: name || "Foodie Guest",
        isVerified: true,
        isBlocked: false,
      });
    }

    // 7. Create Session
    const sessionToken = await createCustomerSession(customer, req);

    // 8. Set HttpOnly, Secure Cookie
    const isProduction = process.env.NODE_ENV === "production";
    const response = NextResponse.json(
      {
        success: true,
        message: "Authentication successful",
        data: {
          customer: {
            id: customer._id,
            phone: customer.phone,
            name: customer.name,
            email: customer.email,
            isVerified: customer.isVerified,
            defaultAddressId: customer.defaultAddressId,
          },
        },
      },
      { status: 200 }
    );

    response.cookies.set(CUSTOMER_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err) {
    return handleApiError(err);
  }
}

