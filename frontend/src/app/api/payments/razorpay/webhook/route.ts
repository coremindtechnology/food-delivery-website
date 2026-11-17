import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PaymentWebhookEvent } from "@/models/PaymentWebhookEvent";
import {
  fetchRazorpayPayment,
  verifyWebhookSignature,
  type RazorpayRefund,
} from "@/lib/razorpay";
import { applyRazorpayPayment } from "@/lib/payment-settlement";
import { applyRazorpayRefund } from "@/lib/refund-settlement";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const eventId = req.headers.get("x-razorpay-event-id");
    if (!signature || !eventId) return errorResponse("Missing Razorpay webhook signature or event ID.", 400);
    if (!verifyWebhookSignature(rawBody, signature)) {
      return errorResponse("Razorpay webhook signature verification failed.", 400);
    }

    const payload = JSON.parse(rawBody) as {
      event?: string;
      payload?: {
        payment?: { entity?: { id?: string } };
        refund?: { entity?: RazorpayRefund };
      };
    };
    if (!payload.event) return errorResponse("Invalid Razorpay webhook payload.", 400);
    let event;
    try {
      event = await PaymentWebhookEvent.create({
        eventId,
        eventType: payload.event,
        status: "processing",
        processingStartedAt: new Date(),
      });
    } catch (err) {
      if (err instanceof Error && "code" in err && err.code === 11000) {
        const existingEvent = await PaymentWebhookEvent.findOne({ eventId });
        if (existingEvent?.status === "processed") {
          return successResponse({ received: true, duplicate: true });
        }
        const staleBefore = new Date(Date.now() - 5 * 60 * 1000);
        event = await PaymentWebhookEvent.findOneAndUpdate(
          {
            eventId,
            $or: [
              { status: "failed" },
              { status: "processing", processingStartedAt: { $lt: staleBefore } },
            ],
          },
          {
            $set: {
              status: "processing",
              processingStartedAt: new Date(),
              failureReason: undefined,
            },
          },
          { new: true }
        );
        if (!event) return successResponse({ received: true, processing: true });
      }
      if (!event) throw err;
    }

    try {
      if (["payment.authorized", "payment.captured", "payment.failed"].includes(payload.event)) {
        const paymentId = payload.payload?.payment?.entity?.id;
        if (!paymentId) throw new Error("Razorpay payment webhook has no payment ID.");
        await applyRazorpayPayment(await fetchRazorpayPayment(paymentId));
      } else if (payload.event.startsWith("refund.")) {
        const refund = payload.payload?.refund?.entity;
        if (!refund?.id) throw new Error("Razorpay refund webhook has no refund ID.");
        await applyRazorpayRefund(refund);
      }
      await PaymentWebhookEvent.updateOne(
        { _id: event._id },
        { $set: { status: "processed", processedAt: new Date() } }
      );
      return successResponse({ received: true });
    } catch (error) {
      await PaymentWebhookEvent.updateOne(
        { _id: event._id },
        { $set: { status: "failed", failureReason: error instanceof Error ? error.message : "Processing failed." } }
      );
      throw error;
    }
  } catch (err) {
    return handleApiError(err);
  }
}
