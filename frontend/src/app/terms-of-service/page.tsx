import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service | Dual Kitchens",
  description: "Terms that apply when you use the Dual Kitchens website and order from our kitchens.",
};

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      description="These terms apply when you browse Dual Kitchens or place an order through our website. By using the service, you agree to these terms."
    >
      <section>
        <h2>Using the service</h2>
        <p>You must provide accurate contact, order, and delivery information and use the website lawfully. Sign-in codes are for your use only. You are responsible for activity on your account and should contact us promptly if you believe it has been misused.</p>
      </section>

      <section>
        <h2>Menus, prices, and availability</h2>
        <p>Menu items, descriptions, prices, offers, and availability may change. We make reasonable efforts to keep listings accurate, but an item may become unavailable before an order is accepted. The price and order total shown at checkout are confirmed by the service before an order is placed; applicable charges and taxes are shown in the order summary.</p>
        <p>Orders are subject to kitchen acceptance. If an item or order cannot be fulfilled, we will notify you and address any payment already collected in accordance with our <Link href="/refund-cancellation-policy">Refund &amp; Cancellation Policy</Link>.</p>
      </section>

      <section>
        <h2>Placing and receiving an order</h2>
        <p>Review your items, customisations, address, and contact number before submitting an order. Delivery is subject to availability in the service area and to a suitable delivery location. Delivery times are estimates, not guarantees; traffic, weather, demand, and other operational conditions can affect them. For takeaway orders, follow the pickup instructions shown for your order.</p>
        <p>Please keep your phone reachable and ensure someone can receive the order at the delivery address. You are responsible for providing complete delivery instructions and for checking the order when it arrives.</p>
      </section>

      <section>
        <h2>Payments</h2>
        <p>Available payment methods are shown during checkout and may include online payment through Razorpay or cash on delivery where offered. Online payment is subject to provider verification and confirmation. Do not retry a payment if the order page indicates that payment is authorised or still being confirmed; check your order status first. Cash-on-delivery orders must be paid at handover.</p>
      </section>

      <section>
        <h2>Food, allergens, and kitchen information</h2>
        <p>Food descriptions and dietary labels are provided to help you choose. If you have an allergy, intolerance, or other dietary concern, contact the kitchen before ordering and do not rely solely on a menu label. Food may be prepared in a kitchen that handles other ingredients, and we cannot promise the absence of all traces or cross-contact.</p>
        <p>Our veg and non-veg kitchens follow separate preparation practices as described on the website. If you have a concern about an item or its condition, stop consuming it and contact us promptly.</p>
      </section>

      <section>
        <h2>Cancellations, refunds, and service changes</h2>
        <p>Orders may not be cancellable once preparation has started. For details on requesting a cancellation or reporting a problem, see our <Link href="/refund-cancellation-policy">Refund &amp; Cancellation Policy</Link>. We may suspend or refuse an order where required for safety, suspected misuse, unavailable items, or operational reasons, and will address any payment collected as described in that policy.</p>
      </section>

      <section>
        <h2>Responsibility and applicable rights</h2>
        <p>We work to keep the website and ordering information available and accurate, but cannot promise uninterrupted or error-free access. Nothing in these terms excludes rights or remedies that cannot lawfully be excluded. These terms are subject to applicable laws in India; disputes will be handled by the competent forum under applicable law.</p>
      </section>

      <section>
        <h2>Contact and updates</h2>
        <p>For questions about these terms or an order, use the support details published in the website footer. We may update these terms from time to time; changes apply when posted on this page, subject to applicable law.</p>
      </section>
    </LegalPage>
  );
}
