import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Dual Kitchens",
  description: "Learn how Dual Kitchens collects, uses, and protects your information.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="This policy explains how Dual Kitchens handles information when you browse our website, sign in, or place an order."
    >
      <section>
        <h2>Information we collect</h2>
        <p>Depending on how you use the service, we may collect:</p>
        <ul>
          <li>Contact and account details such as your name, verified mobile number, and the email address you choose to provide.</li>
          <li>Order information, including items, customisations, payment method and status, delivery or pickup preferences, and support messages.</li>
          <li>Delivery details, including your address, landmark, PIN code, and location coordinates when you share your location to check delivery availability.</li>
          <li>Technical and security information needed to operate the service, prevent misuse, and troubleshoot errors.</li>
        </ul>
      </section>

      <section>
        <h2>How we use information</h2>
        <p>We use this information to verify your account, accept and prepare orders, arrange delivery or pickup, provide order updates, process payments and eligible refunds, respond to support requests, and protect the service from fraud or abuse. We may also use it to meet applicable legal, tax, accounting, and food-safety recordkeeping requirements.</p>
      </section>

      <section>
        <h2>Payments, service providers, and sharing</h2>
        <p>Online payments are handled through Razorpay. Payment details are processed by the payment provider; Dual Kitchens does not ask you to send card PINs, passwords, or one-time banking credentials to us. We may share only the information needed with the relevant kitchen, delivery personnel, payment and messaging providers, and service providers that help us operate the website. We do not sell personal information.</p>
        <p>We may disclose information where required by law, to respond to valid legal requests, or to protect customers, staff, and the service.</p>
      </section>

      <section>
        <h2>Cookies, storage, and security</h2>
        <p>We use a secure, HTTP-only session cookie to keep you signed in. Your cart may be saved in your browser&apos;s local storage so it remains available when you return. You can clear browser storage or sign out; doing so may remove saved cart or session information.</p>
        <p>We use reasonable administrative and technical safeguards to protect information. No website or transmission method can be guaranteed completely secure, so please keep access to your phone and account under your control.</p>
      </section>

      <section>
        <h2>Retention and your choices</h2>
        <p>We keep information for as long as needed to provide the service, resolve disputes, maintain business records, and meet legal obligations. You may request access to, correction of, or deletion of account information, subject to information we must retain by law or for legitimate order and security records. Some information may be necessary to fulfil an order or provide account services.</p>
        <p>To make a privacy request, contact us using the support details in the website footer and include the mobile number associated with your account. We may ask you to verify your identity before responding.</p>
      </section>

      <section>
        <h2>Children and changes</h2>
        <p>The service is intended for people able to place a legally valid order. A parent or guardian should place and supervise any order for a minor. We may update this policy as our service or legal obligations change; the latest version will appear on this page.</p>
      </section>
    </LegalPage>
  );
}
