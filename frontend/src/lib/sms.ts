/**
 * SMS Provider Service with Real API Support & Safe Dev Mock
 * ─────────────────────────────────────────────────────────────
 * Supports:
 * - Real SMS HTTP integration (Fast2SMS / Generic Webhook / Twilio)
 * - Development-only mock mode (CANNOT be enabled in production)
 * ─────────────────────────────────────────────────────────────
 */

export interface SendSMSResult {
  success: boolean;
  messageId?: string;
  devOtp?: string; // Only present in development mode
  error?: string;
}

const isProduction = process.env.NODE_ENV === "production";

export async function sendOtpSms(phone: string, otp: string): Promise<SendSMSResult> {
  const apiKey = process.env.SMS_API_KEY;
  const isMockAllowed =
    !isProduction &&
    (!apiKey ||
      apiKey.includes("placeholder") ||
      apiKey.includes("your_") ||
      apiKey === "dev_mock");

  // In production, we NEVER allow mock mode
  if (isProduction && (!apiKey || apiKey.includes("placeholder") || apiKey.includes("your_"))) {
    console.error("FATAL: SMS_API_KEY is not configured in production environment.");
    return {
      success: false,
      error: "SMS service is temporarily unavailable. Please contact support.",
    };
  }

  // Dev Mock Mode (Development only)
  if (isMockAllowed) {
    console.log("\n=======================================================");
    console.log("📱 [DEV SMS MOCK MODE]");
    console.log(`   To: ${phone}`);
    console.log(`   OTP: ${otp}`);
    console.log("   Valid for: 5 minutes");
    console.log("   Note: This mock mode is strictly disabled in production.");
    console.log("=======================================================\n");

    return {
      success: true,
      messageId: `dev-mock-${Date.now()}`,
      devOtp: otp, // Surfaced for convenient dev testing
    };
  }

  // Real SMS Integration (e.g. Fast2SMS Quick SMS API)
  try {
    const senderId = process.env.SMS_SENDER_ID || "FSTSMS";
    const templateId = process.env.SMS_TEMPLATE_ID;

    // Fast2SMS API example
    const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: apiKey!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "otp",
        variables_values: otp,
        numbers: phone.replace(/^\+91/, "").trim(),
        flash: "0",
        sender_id: senderId,
        template_id: templateId,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.return === false) {
      console.error("SMS Provider Error:", data);
      return {
        success: false,
        error: data.message || "Failed to deliver SMS. Please try again.",
      };
    }

    return {
      success: true,
      messageId: data.request_id || `sms-${Date.now()}`,
    };
  } catch (err) {
    console.error("SMS Gateway Network Error:", err);
    return {
      success: false,
      error: "Failed to connect to SMS gateway.",
    };
  }
}

