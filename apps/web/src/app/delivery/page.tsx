import Link from "next/link";
import { metroPueblos } from "@/lib/catalog";

export const metadata = {
  title: "Delivery Policy | Cepa Isleña",
  description: "Metro delivery rules for Cepa Isleña juice drops.",
};

export default function DeliveryPage() {
  return (
    <main className="legal-page">
      <Link href="/" className="legal-back">
        ← Back to shop
      </Link>
      <h1>Delivery Policy</h1>
      <p className="legal-updated">Last updated: July 11, 2026</p>

      <h2>Service area</h2>
      <p>MVP delivery is limited to these metro pueblos:</p>
      <ul>
        {metroPueblos.map((pueblo) => (
          <li key={pueblo}>{pueblo}</li>
        ))}
      </ul>
      <p>Outside this list, use the contact form so we can plan future routes or events.</p>

      <h2>Order size</h2>
      <p>
        There is no minimum order size for this MVP. You can buy a single bottle, shot, bundle, or mix. Delivery timing
        still depends on drop production and route density.
      </p>

      <h2>What you need to provide</h2>
      <ul>
        <li>Full name</li>
        <li>Phone number we can reach for delivery coordination</li>
        <li>Delivery address inside an active metro pueblo</li>
        <li>Optional delivery notes (gate codes, floor, preferred window)</li>
      </ul>

      <h2>Timing</h2>
      <p>
        Cepa sells limited drops, not instant courier. After payment, we confirm timing based on production and route
        density. Exact windows can vary by drop day.
      </p>

      <h2>Freshness</h2>
      <p>
        Product is perishable. Please refrigerate on receipt and consume according to any guidance included with the
        delivery. Natural separation can happen — shake well before drinking.
      </p>

      <h2>Failed delivery attempts</h2>
      <p>
        If we cannot reach you at the provided phone/address during the coordinated window, we will try to reschedule
        once when capacity allows. Repeated no-shows may forfeit the order without refund.
      </p>
    </main>
  );
}
