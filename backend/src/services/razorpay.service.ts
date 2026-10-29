import Razorpay from "razorpay";
import crypto from "crypto";

const key_id = process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder";
const key_secret = process.env.RAZORPAY_KEY_SECRET || "placeholder_secret";

export const razorpayInstance = new Razorpay({
  key_id,
  key_secret,
});

export async function createRazorpayOrder(options: {
  amount: number; // in INR
  receipt: string;
  notes?: Record<string, string>;
}) {
  const order = await razorpayInstance.orders.create({
    amount: Math.round(options.amount * 100), // amount in paise
    currency: "INR",
    receipt: options.receipt,
    notes: options.notes,
  });

  return order;
}

export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const body = `${params.orderId}|${params.paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", key_secret)
    .update(body.toString())
    .digest("hex");

  return expectedSignature === params.signature;
}

