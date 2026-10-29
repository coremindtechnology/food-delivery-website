import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import {
  generateBase32Secret,
  getTotpAuthUri,
  generateRecoveryCodes,
} from "@/lib/admin-security";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function POST() {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return errorResponse("Authentication required", 401);
    }

    // Generate fresh standard Base32 secret
    const secret = generateBase32Secret(20);
    const authUri = getTotpAuthUri(admin.email, secret, "DualKitchensAdmin");
    const { plainCodes, hashedCodes } = generateRecoveryCodes(8);

    // Save temporary secret for verification in step 2
    admin.totpSecret = secret;
    await admin.save();

    return successResponse({
      secret,
      authUri,
      recoveryCodes: plainCodes,
      instructions:
        "Scan this QR code in Google Authenticator or Microsoft Authenticator, or enter the secret key manually.",
    });
  } catch (err) {
    return handleApiError(err);
  }
}

