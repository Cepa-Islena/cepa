import Link from "next/link";

export const metadata = {
  title: "Refund Policy | Cepa Isleña",
  description: "Refund and issue-resolution policy for Cepa Isleña orders.",
};

export default function RefundsPage() {
  return (
    <main className="legal-page">
      <Link href="/" className="legal-back">
        ← Back to shop
      </Link>
      <h1>Refund Policy</h1>
      <p className="legal-updated">Last updated: July 11, 2026</p>

      <h2>Because juice is made to order</h2>
      <p>
        Once a drop is pressed and packed for delivery, it usually cannot be resold. That means refunds are limited and
        handled case by case.
      </p>

      <h2>When we refund or replace</h2>
      <ul>
        <li>You were charged but the order could not be fulfilled.</li>
        <li>The wrong items were delivered.</li>
        <li>Product arrived damaged or clearly unsafe due to our handling, reported promptly with photos when possible.</li>
      </ul>

      <h2>When refunds are usually not available</h2>
      <ul>
        <li>Change of mind after payment for a made-to-order drop.</li>
        <li>Taste preference differences.</li>
        <li>Delivery issues caused by an incorrect address or unreachable phone number.</li>
        <li>Product left unrefrigerated after successful delivery.</li>
      </ul>

      <h2>How to request help</h2>
      <p>
        Contact us as soon as possible through the storefront contact form with your order email, approximate order time,
        and a short description of the issue. Approved refunds are issued back through Stripe to the original payment
        method.
      </p>

      <h2>Cancellations before payment completes</h2>
      <p>
        If you abandon Stripe Checkout, no payment is completed. Open reservations expire and release capacity
        automatically.
      </p>
    </main>
  );
}
