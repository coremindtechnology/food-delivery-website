import { authenticator } from "otplib";
import QRCode from "qrcode";

export function generateTOTPSecret(adminEmail: string): {
  secret: string;
  otpauth: string;
} {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(adminEmail, "DualKitchens-Admin", secret);
  return { secret, otpauth };
}

export async function generateTOTPQRCodeDataURL(otpauth: string): Promise<string> {
  return QRCode.toDataURL(otpauth);
}

export function verifyTOTPToken(token: string, secret: string): boolean {
  try {
    return authenticator.check(token, secret);
  } catch (error) {
    console.error("Error verifying TOTP token:", error);
    return false;
  }
}

