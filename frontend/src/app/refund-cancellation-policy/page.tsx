import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | Dual Kitchens",
  description: "How to request an order cancellation or report an order issue to Dual Kitchens.",
};

export default function RefundCancellationPolicyPage() {
  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      description="We prepare food to order. Contact us as soon as possible if you need to cancel or if something is wrong with your order."
    >
      <section>
        <h2>Requesting a cancellation</h2>
        <p>Contact the relevant kitchen using the support details in the website footer and provide your order number and registered phone number. We will check the order status with the kitchen. A cancellation can generally be accepted only before preparation begins; once food is being prepared, ready, dispatched, or handed over, cancellation may no longer be possible.</p>
        <p>Submitting a request does not itself cancel an order. Please wait for confirmation from the kitchen or support team. If the kitchen cancels or rejects an order, we will notify you and handle any successful online payment under the refund process below.</p>
      </section>

      <section>
        <h2>When to report an issue</h2>
        <p>If an order is missing an item, incorrect, damaged, materially different from what you ordered, or appears unsafe, stop consuming the affected food and contact us promptly after delivery. Include your order number, a clear description, and photos where useful so we can investigate with the kitchen.</p>
        <p>We review each report based on the circumstances and may offer an appropriate remedy, which can include a replacement, a partial refund, or a full refund. A remedy is not guaranteed for issues reported after a significant delay or where we cannot verify the order, but we will consider the information provided fairly. This policy does not limit rights or remedies available under applicable law.</p>
      </section>

      <section>
        <h2>Refunds for online payments</h2>
        <p>Where a refund is approved for an online payment, it is initiated through the original payment method using Razorpay. The status may first appear as pending or processing. The time it takes for the amount to appear in your account depends on the payment provider, bank, and payment method; please check with them if a processed refund has not appeared.</p>
        <p>If payment is pending, failed, or not captured, a refund may not be applicable; we will verify the payment status before taking action. If you see a debit but the order page does not confirm payment, contact support with the order number and payment reference. Please do not share card details, passwords, or OTPs.</p>
      </section>

      <section>
        <h2>Cash-on-delivery orders</h2>
        <p>Cash-on-delivery orders that are cancelled before payment do not have a payment amount to refund. If you believe you were charged or paid for an order that was cancelled or not delivered, contact support with the order number and details of the payment so we can investigate.</p>
      </section>

      <section>
        <h2>How to contact us</h2>
        <p>Use the phone or email shown in the website footer and include your order number, the phone number used for the order, and a concise description of the issue. For food-safety concerns, please tell us clearly that the report relates to food safety.</p>
      </section>
    </LegalPage>
  );
}
