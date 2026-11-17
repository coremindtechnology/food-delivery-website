import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Food Safety & Hygiene | Dual Kitchens",
  description: "Our food handling, kitchen separation, packaging, and food-safety reporting practices.",
};

export default function FoodSafetyHygienePage() {
  return (
    <LegalPage
      title="Food Safety & Hygiene"
      description="Food safety matters at every step—from ingredient handling in the kitchen to delivery at your door. This page explains the practices we expect across our kitchens and how to raise a concern."
    >
      <section>
        <h2>Kitchen handling</h2>
        <ul>
          <li>Food should be prepared in clean work areas using hygienic handling practices.</li>
          <li>Ingredients should be stored and handled appropriately, with attention to freshness and safe preparation.</li>
          <li>Our veg and non-veg kitchens use separate preparation practices, staff, cookware, and oil as described on the website.</li>
        </ul>
        <p>Food can contain allergens or come into contact with ingredients handled in a kitchen. If you have an allergy or dietary restriction, contact the kitchen before ordering. We cannot guarantee that any item is free from allergen traces or cross-contact.</p>
      </section>

      <section>
        <h2>Packaging and delivery</h2>
        <p>Orders are packed for transport, and packaging may include tamper-evident seals where available. Please check the package when it arrives. If a seal appears broken, packaging is damaged, or the food appears contaminated or otherwise unsafe, do not consume the affected food and contact us promptly.</p>
        <p>After delivery, store and consume food promptly and follow any storage or reheating instructions provided. Do not consume food that has been left unrefrigerated for an extended period or that appears or smells unusual.</p>
      </section>

      <section>
        <h2>Report a food-safety concern</h2>
        <p>Contact us using the phone or email shown in the website footer as soon as possible. Include your order number, the item name, when it was delivered, a description of the concern, and photos of the food or packaging if available. Keep the affected food and packaging safely if you can do so without risk, as this may help us investigate.</p>
        <p>We will review the report with the relevant kitchen and take appropriate follow-up action. If someone may be experiencing a serious reaction or illness, seek medical care immediately; do not wait for a response from us.</p>
      </section>

      <section>
        <h2>Food-safety licences</h2>
        <p>Any food-business registration or licence details published on the website apply only to the unit identified alongside them. Please refer to the current licence information displayed on the site or contact us if you need clarification.</p>
      </section>
    </LegalPage>
  );
}
