import { NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentCustomer } from "@/lib/auth";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { fetchRazorpayPayment, verifyPaymentSignature } from "@/lib/razorpay";
import { applyRazorpayPayment } from "@/lib/payment-settlement";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

const Schema = z.object({
  orderNumber: z.string().trim().min(1).max(40),
  razorpay_order_id: z.string().trim().min(1),
  razorpay_payment_id: z.string().trim().min(1),
  razorpay_signature: z.string().regex(/^[a-fA-F0-9]{64}$/),
});

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const customer = await getCurrentCustomer();
    if (!customer) return errorResponse("Sign in to verify payment.", 401);
    const input = Schema.parse(await req.json());
    const order = await Order.findOne({
      orderNumber: input.orderNumber.toUpperCase(),
      customerId: customer._id,
    });
    if (!order) return errorResponse("Order not found.", 404);
    if (order.razorpayOrderId !== input.razorpay_order_id) {
      return errorResponse("Payment does not match this order.", 409);
    }
    if (!verifyPaymentSignature(
      input.razorpay_order_id,
      input.razorpay_payment_id,
      input.razorpay_signature
    )) {
      return errorResponse("Razorpay payment signature verification failed.", 400);
    }

    const gatewayPayment = await fetchRazorpayPayment(input.razorpay_payment_id);
    if (
      gatewayPayment.order_id !== input.razorpay_order_id ||
      gatewayPayment.id !== input.razorpay_payment_id
    ) {
      return errorResponse("Razorpay payment details do not match the submitted proof.", 409);
    }
    const result = await applyRazorpayPayment(gatewayPayment);
    await Payment.updateOne(
      { _id: result.payment._id, razorpayPaymentId: input.razorpay_payment_id },
      { $set: { razorpaySignature: input.razorpay_signature } }
    );
    return successResponse({
      paymentStatus: result.payment.status,
      orderStatus: result.order?.orderStatus,
      verified: gatewayPayment.status === "captured",
    });
  } catch (err) {
    return handleApiError(err);
  }
}
