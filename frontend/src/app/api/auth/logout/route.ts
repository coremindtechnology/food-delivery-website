import { NextResponse } from "next/server";
import { revokeCustomerSession, CUSTOMER_SESSION_COOKIE } from "@/lib/auth";
import { successResponse, handleApiError } from "@/lib/api-response";

export async function POST() {
  try {
    await revokeCustomerSession();

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    response.cookies.delete(CUSTOMER_SESSION_COOKIE);

    return response;
  } catch (err) {
    return handleApiError(err);
  }
}

