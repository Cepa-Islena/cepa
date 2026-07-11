import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Cepa Isleña",
  description: "How Cepa Isleña handles personal information for orders and contact messages.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <Link href="/" className="legal-back">
        ← Back to shop
      </Link>
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Last updated: July 11, 2026</p>
      <p>
        Cepa Isleña (“Cepa”, “we”) sells made-to-order juices and shots for metro San Juan delivery. This policy explains
        what information we collect and how we use it.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>Order details: name, email, phone, delivery address, pueblo, cart contents, gift notes, and payment status.</li>
        <li>Contact form messages: name, email, topic, and message content.</li>
        <li>Technical data needed to run checkout securely (for example browser user agent and approximate IP for abuse prevention).</li>
        <li>Payment card data is handled by Stripe. We do not store full card numbers on Cepa servers.</li>
      </ul>

      <h2>How we use information</h2>
      <ul>
        <li>To fulfill and deliver orders.</li>
        <li>To respond to contact requests.</li>
        <li>To prevent spam, fraud, and checkout abuse.</li>
        <li>To keep basic business records (orders, payments, messages).</li>
      </ul>

      <h2>Sharing</h2>
      <p>
        We share data with service providers that help us operate the store, including payment processing (Stripe), hosting,
        and database infrastructure. We do not sell personal information.
      </p>

      <h2>Retention</h2>
      <p>
        We keep order and contact records as long as needed for delivery, customer support, accounting, and legal
        obligations, then delete or archive them when no longer needed.
      </p>

      <h2>Your choices</h2>
      <p>
        To request access, correction, or deletion of personal information we hold, contact us through the shop contact
        form or the email published on the storefront when available.
      </p>

      <h2>Security</h2>
      <p>
        We use HTTPS, access controls for admin tools, and server-side validation for checkout. No method of transmission
        or storage is perfectly secure.
      </p>

      <h2>Children</h2>
      <p>Cepa is not directed to children under 13, and we do not knowingly collect their personal information.</p>

      <h2>Changes</h2>
      <p>We may update this policy as the product evolves. The date at the top will change when we do.</p>
    </main>
  );
}
