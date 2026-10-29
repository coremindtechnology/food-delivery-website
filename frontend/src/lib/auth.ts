import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Customer, ICustomer } from "@/models/Customer";
import { Session } from "@/models/Session";
import { OTPChallenge } from "@/models/OTPChallenge";

export const CUSTOMER_SESSION_COOKIE = "customer_session";
export const SESSION_EXPIRY_DAYS = 30;
export const OTP_EXPIRY_MINUTES = 5;
export const OTP_COOLDOWN_SECONDS = 60;
export const OTP_MAX_ATTEMPTS = 5;

// In-memory rate limiting map for send-otp requests
// Key: phone or IP, Value: array of timestamps
const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(key: string, maxRequests = 5, windowMs = 60 * 1000): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= maxRequests) {
    rateLimitMap.set(key, validTimestamps);
    return false; // Rate limit exceeded
  }

  validTimestamps.push(now);
  rateLimitMap.set(key, validTimestamps);
  return true;
}

export function hashString(value: string): string {
  const secret = process.env.JWT_SECRET || "default_food_delivery_secure_salt_key_2026";
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export function generateOTP(): string {
  // Generates secure 6-digit numeric OTP
  return crypto.randomInt(100000, 999999).toString();
}

export function generateSessionToken(): string {
  // Generates 256-bit cryptographically secure token
  return crypto.randomBytes(32).toString("hex");
}

export async function createCustomerSession(
  customer: ICustomer,
  req?: NextRequest
): Promise<string> {
  await connectToDatabase();

  const token = generateSessionToken();
  const tokenHash = hashString(token);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const ipAddress = req?.headers.get("x-forwarded-for") || req?.headers.get("x-real-ip") || undefined;
  const userAgent = req?.headers.get("user-agent") || undefined;

  await Session.create({
    userType: "customer",
    userId: customer._id,
    tokenHash,
    ipAddress,
    userAgent,
    isValid: true,
    expiresAt,
  });

  return token;
}

export async function getSessionTokenFromCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
}

export async function getCurrentCustomer(): Promise<ICustomer | null> {
  const token = await getSessionTokenFromCookie();
  if (!token) return null;

  await connectToDatabase();
  const tokenHash = hashString(token);

  const session = await Session.findOne({
    tokenHash,
    userType: "customer",
    isValid: true,
    expiresAt: { $gt: new Date() },
  });

  if (!session || !session.userId) return null;

  const customer = await Customer.findOne({
    _id: session.userId,
    isBlocked: false,
  });

  return customer;
}

export async function revokeCustomerSession(): Promise<void> {
  const token = await getSessionTokenFromCookie();
  if (!token) return;

  await connectToDatabase();
  const tokenHash = hashString(token);

  await Session.updateMany({ tokenHash }, { $set: { isValid: false } });

  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_SESSION_COOKIE);
}

