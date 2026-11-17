import type { IDeliveryAssignment } from "@/models/DeliveryAssignment";
import crypto from "crypto";

export type DeliveryAction = "pickup_confirm" | "en_route" | "delivered" | "failed";
type AssignmentStatus = IDeliveryAssignment["status"];

const ACTION_STATES: Record<DeliveryAction, readonly AssignmentStatus[]> = {
  pickup_confirm: ["assigned"],
  en_route: ["picked_up", "en_route"],
  delivered: ["en_route"],
  failed: ["picked_up", "en_route"],
};

export function canDeliveryPersonnelAct(status: AssignmentStatus, action: DeliveryAction) {
  return ACTION_STATES[action].includes(status);
}

export function ownsDeliveryAssignment(assignedRiderId: string, authenticatedRiderId: string) {
  return assignedRiderId === authenticatedRiderId;
}

export function generateDeliveryConfirmationCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashDeliveryConfirmationCode(code: string) {
  const secret = process.env.DELIVERY_CODE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Delivery confirmation is not configured. Set DELIVERY_CODE_SECRET to at least 32 characters.");
  }
  return crypto.createHmac("sha256", secret).update(code).digest("hex");
}

export function verifyDeliveryConfirmationCode(code: string, storedHash: string) {
  if (!/^\d{6}$/.test(code)) return false;
  const provided = Buffer.from(hashDeliveryConfirmationCode(code), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

export function calculateCodCollection(
  outstanding: number,
  collected: number,
  amount: number
) {
  if (
    !Number.isFinite(outstanding) ||
    !Number.isFinite(collected) ||
    !Number.isFinite(amount) ||
    outstanding < 0 ||
    collected < 0 ||
    amount < 0 ||
    amount > outstanding ||
    Math.round(amount * 100) / 100 !== amount
  ) {
    return null;
  }
  return {
    collected: Math.round((collected + amount) * 100) / 100,
    outstanding: Math.round((outstanding - amount) * 100) / 100,
  };
}
