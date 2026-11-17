import crypto from "crypto";

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  error_description?: string;
  method?: string;
}

export interface RazorpayRefund {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: "pending" | "processed" | "failed";
  receipt?: string;
  notes?: Record<string, string>;
}

export class RazorpayApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message);
    this.name = "RazorpayApiError";
  }
}

function getCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  return { keyId, keySecret };
}

function getAuthorization() {
  const { keyId, keySecret } = getCredentials();
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export function getRazorpayKeyId() {
  return getCredentials().keyId;
}

async function razorpayRequest<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: Record<string, unknown>; idempotencyKey?: string } = {}
): Promise<T> {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: getAuthorization(),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.idempotencyKey ? { "X-Razorpay-Idempotency-Key": options.idempotencyKey } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    cache: "no-store",
  });
  const result = await response.json().catch(() => undefined) as
    | T
    | { error?: { description?: string; reason?: string } }
    | undefined;
  if (!response.ok) {
    const errorResult =
      typeof result === "object" && result !== null && "error" in result
        ? (result as { error?: { description?: string; reason?: string } })
        : undefined;
    const message =
      errorResult?.error?.description || errorResult?.error?.reason;
    throw new RazorpayApiError(
      `Razorpay request failed (${response.status})${message ? `: ${message}` : "."}`,
      response.status
    );
  }
  if (!result) {
    throw new Error("Razorpay returned an empty response.");
  }
  return result as T;
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  if (!/^[a-fA-F0-9]{64}$/.test(signature)) return false;
  const { keySecret } = getCredentials();
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest();
  const actual = Buffer.from(signature, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Razorpay webhook verification is not configured. Set RAZORPAY_WEBHOOK_SECRET.");
  }
  if (!/^[a-fA-F0-9]{64}$/.test(signature)) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
  const actual = Buffer.from(signature, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function verifyWebhookSignatureForSecret(
  rawBody: string,
  signature: string,
  secret: string
) {
  if (!/^[a-fA-F0-9]{64}$/.test(signature)) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
  const actual = Buffer.from(signature, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export async function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}) {
  return razorpayRequest<RazorpayOrder>("/orders", {
    method: "POST",
    body: {
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes,
    },
  });
}

export async function fetchRazorpayPayment(paymentId: string) {
  return razorpayRequest<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

export async function createRazorpayRefund(input: {
  paymentId: string;
  amountPaise: number;
  idempotencyKey: string;
  notes: Record<string, string>;
}) {
  return razorpayRequest<RazorpayRefund>(
    `/payments/${encodeURIComponent(input.paymentId)}/refund`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: { amount: input.amountPaise, notes: input.notes },
    }
  );
}

export async function fetchRazorpayRefund(refundId: string) {
  return razorpayRequest<RazorpayRefund>(`/refunds/${encodeURIComponent(refundId)}`);
}

export async function fetchRazorpayPaymentRefunds(paymentId: string) {
  const response = await razorpayRequest<{ items: RazorpayRefund[] }>(
    `/payments/${encodeURIComponent(paymentId)}/refunds`
  );
  return response.items;
}

export async function fetchRazorpayOrderPayments(orderId: string) {
  const response = await razorpayRequest<{ items: RazorpayPayment[] }>(
    `/orders/${encodeURIComponent(orderId)}/payments`
  );
  return response.items;
}
