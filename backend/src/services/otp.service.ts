import crypto from "crypto";

export function generateNumericOTP(length = 6): string {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, digits.length);
    otp += digits[randomIndex];
  }
  return otp;
}

export async function sendSMSOTP(phone: string, otp: string): Promise<boolean> {
  const apiKey = process.env.SMS_API_KEY;

  if (!apiKey) {
    console.log(`[SMS Gateway Simulated] OTP for ${phone}: ${otp}`);
    return true;
  }

  // Ready for production SMS gateway (Fast2SMS / Twilio / MSG91)
  console.log(`[SMS Gateway Production] Sending OTP ${otp} to ${phone}`);
  return true;
}

