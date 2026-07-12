import Link from "next/link";
import { getStripeClient } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = await searchParams;
  const sessionId = params.session_id;
  const stripe = getStripeClient();

  let heading = "Thanks — checking your order.";
  let detail = "If you completed payment, we’re confirming it now. Cepa will follow up with delivery details.";
  let verified = false;

  if (!sessionId) {
    heading = "We couldn’t find this order.";
    detail = "If you paid, keep your Stripe receipt and contact Cepa with the email you used at checkout.";
  } else if (!stripe) {
    heading = "Thanks for your order.";
    detail =
      "Payment confirmation is offline in this environment. If you paid, keep your Stripe receipt and Cepa will follow up.";
  } else {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      verified = session.payment_status === "paid" || session.status === "complete";

      if (verified) {
        heading = "Order received.";
        detail = "Payment confirmed. Cepa will follow up with delivery details.";
      } else if (session.status === "open") {
        heading = "Checkout still open.";
        detail = "This order isn’t paid yet. Head back to the shop if you still want the drop.";
      } else {
        heading = "Payment not confirmed.";
        detail = "If you were charged, contact Cepa with your receipt email.";
      }
    } catch {
      heading = "Could not verify payment.";
      detail = "If you completed payment, contact Cepa with your receipt email.";
    }
  }

  return (
    <main className="utility-page">
      <img src="/brand/logo-borra.png" alt="Cepa Isleña" />
      <h1>{heading}</h1>
      <p>{detail}</p>
      {verified ? <p className="form-status success">Payment verified. You’re all set.</p> : null}
      <Link className="button primary" href="/">
        Back to shop
      </Link>
    </main>
  );
}
