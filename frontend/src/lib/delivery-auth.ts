import crypto from "crypto";
import { cookies } from "next/headers";
import { DeliveryPersonnel } from "@/models/DeliveryPersonnel";
import { DeliverySession } from "@/models/DeliverySession";
import { connectToDatabase } from "@/lib/mongodb";

export const DELIVERY_SESSION_COOKIE = "delivery_session";
const DELIVERY_SESSION_DAYS = 14;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createDeliverySession(deliveryPersonnelId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  await DeliverySession.create({
    deliveryPersonnelId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + DELIVERY_SESSION_DAYS * 24 * 60 * 60 * 1000),
  });
  return token;
}

export async function getAuthenticatedDeliveryPersonnel() {
  const token = (await cookies()).get(DELIVERY_SESSION_COOKIE)?.value;
  if (!token) return null;
  await connectToDatabase();
  const session = await DeliverySession.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;
  return DeliveryPersonnel.findOne({
    _id: session.deliveryPersonnelId,
    isBlocked: false,
  });
}

export async function revokeDeliverySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(DELIVERY_SESSION_COOKIE)?.value;
  if (!token) return;
  await connectToDatabase();
  await DeliverySession.deleteOne({ tokenHash: hashToken(token) });
  cookieStore.delete(DELIVERY_SESSION_COOKIE);
}
