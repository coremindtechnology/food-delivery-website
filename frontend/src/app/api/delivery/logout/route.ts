import { NextResponse } from "next/server";
import { DELIVERY_SESSION_COOKIE, revokeDeliverySession } from "@/lib/delivery-auth";

export async function POST() {
  await revokeDeliverySession();
  const response = NextResponse.json({ success: true, data: { loggedOut: true } });
  response.cookies.set(DELIVERY_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
