import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

process.env.RAZORPAY_KEY_ID = "rzp_test_unit";
process.env.RAZORPAY_KEY_SECRET = "unit-test-secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "unit-webhook-secret";

import { verifyPaymentSignature, verifyWebhookSignature } from "./razorpay";

test("payment callback signatures are verified using the Razorpay HMAC format", () => {
  const orderId = "order_test_123";
  const paymentId = "pay_test_456";
  const signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  assert.equal(verifyPaymentSignature(orderId, paymentId, signature), true);
  assert.equal(verifyPaymentSignature(orderId, paymentId, "bad-signature"), false);
  assert.equal(verifyPaymentSignature(orderId, "pay_other", signature), false);
});

test("webhook signatures are verified against the raw request body", () => {
  const body = '{"event":"payment.captured"}';
  const signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest("hex");
  assert.equal(verifyWebhookSignature(body, signature), true);
  assert.equal(verifyWebhookSignature(`${body} `, signature), false);
});
