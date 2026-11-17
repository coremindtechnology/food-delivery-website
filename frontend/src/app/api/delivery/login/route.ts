import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { DeliveryPersonnel } from "@/models/DeliveryPersonnel";
import { createDeliverySession, DELIVERY_SESSION_COOKIE } from "@/lib/delivery-auth";
import { verifyPassword } from "@/lib/admin-security";
import { errorResponse, handleApiError, successResponse } from "@/lib/api-response";

const Schema = z.object({
  phone: z.string().regex(/^\d{10}$/),
  password: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { phone, password } = Schema.parse(await req.json());
    const rider = await DeliveryPersonnel.findOne({ phone, isBlocked: false }).select("+passwordHash");
    if (!rider) return errorResponse("Invalid phone number or password.", 401);
    if (rider.lockedUntil && rider.lockedUntil > new Date()) {
      return errorResponse("Login temporarily locked. Try again later.", 429);
    }
    if (!(await verifyPassword(password, rider.passwordHash))) {
      const attempts = rider.failedLoginAttempts + 1;
      await DeliveryPersonnel.updateOne(
        { _id: rider._id },
        {
          $set: {
            failedLoginAttempts: attempts,
            ...(attempts >= 5 ? { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) } : {}),
          },
        }
      );
      return errorResponse("Invalid phone number or password.", 401);
    }
    await DeliveryPersonnel.updateOne(
      { _id: rider._id },
      { $set: { failedLoginAttempts: 0 }, $unset: { lockedUntil: 1 } }
    );
    const token = await createDeliverySession(rider._id.toString());
    const response = NextResponse.json({ success: true, data: { name: rider.name } });
    response.cookies.set(DELIVERY_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 14 * 24 * 60 * 60,
    });
    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
