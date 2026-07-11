import Link from "next/link";

export const metadata = {
  title: "Terms of Service | Cepa Isleña",
  description: "Terms for ordering Cepa Isleña juices and shots.",
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <Link href="/" className="legal-back">
        ← Back to shop
      </Link>
      <h1>Terms of Service</h1>
      <p className="legal-updated">Last updated: July 11, 2026</p>
      <p>
        By browsing or ordering from Cepa Isleña, you agree to these terms. If you do not agree, do not place an order.
      </p>

      <h2>The product</h2>
      <p>
        Cepa sells made-to-order cold-pressed juices, shots, bundles, and related add-ons for limited drops. Availability
        is limited by production capacity and delivery zone.
      </p>

      <h2>Orders and payment</h2>
      <ul>
        <li>Prices are shown before checkout and locked server-side when a reservation is created.</li>
        <li>Payment is processed by Stripe Checkout.</li>
        <li>An order is only confirmed after successful payment.</li>
        <li>We may cancel an order if inventory, delivery, or payment cannot be completed and refund through Stripe when required.</li>
      </ul>

      <h2>Delivery area</h2>
      <p>
        MVP delivery is limited to selected metro pueblos listed on the storefront. Outside those areas, use the contact
        form. You are responsible for providing an accurate delivery address and reachable phone number.
      </p>

      <h2>Fresh food realities</h2>
      <p>
        Juice is perishable. Keep refrigerated after delivery and follow any storage guidance on the label or delivery
        note. Natural separation is normal — shake well.
      </p>

      <h2>Not medical advice</h2>
      <p>
        Product names, flavor notes, and wellness-inspired language describe taste and ingredients. They are not medical
        claims and are not intended to diagnose, treat, cure, or prevent any disease. Talk to a qualified professional
        about health questions or dietary needs.
      </p>

      <h2>Allergens</h2>
      <p>
        Ingredient lists on the site are informational for the current MVP recipes. Facilities, suppliers, and recipes
        can change. If you have allergies or sensitivities, contact us before ordering.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Do not abuse checkout, spam the contact form, attempt to break security controls, or use the site for unlawful
        activity.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent allowed by law, Cepa is not liable for indirect or consequential damages arising from site
        use or product purchase. Our total liability for a paid order is limited to the amount you paid for that order.
      </p>

      <h2>Contact</h2>
      <p>Questions about these terms can be sent through the storefront contact form.</p>
    </main>
  );
}
