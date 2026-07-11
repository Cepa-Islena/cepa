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
  let detail =
    "If you completed payment, Stripe is confirming the session. Cepa will follow up with pickup or delivery details.";
  let verified = false;

  if (!sessionId) {
    heading = "Missing checkout session.";
    detail = "Open this page from the Stripe success redirect, or contact Cepa with your receipt email.";
  } else if (!stripe) {
    heading = "Payment received page is in offline mode.";
    detail =
      "Stripe is not configured in this environment, so the session cannot be verified here. If you paid, keep your Stripe receipt.";
  } else {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      verified = session.payment_status === "paid" || session.status === "complete";

      if (verified) {
        heading = "Order received.";
        detail = "Stripe confirmed payment for this checkout session. Cepa will follow up with delivery details.";
      } else if (session.status === "open") {
        heading = "Checkout still open.";
        detail = "This session is not paid yet. Return to the shop and finish checkout if you still want the drop.";
      } else {
        heading = "Payment not confirmed.";
        detail = "This session is not marked paid. If you were charged, contact Cepa with your receipt email.";
      }
    } catch {
      heading = "Could not verify checkout session.";
      detail = "The session id was invalid or Stripe is unavailable. Contact Cepa if you completed payment.";
    }
  }

  return (
    <main className="utility-page">
      <img src="/brand/logo-borra.png" alt="Cepa Isleña" />
      <h1>{heading}</h1>
      <p>{detail}</p>
      {sessionId ? <code>{sessionId}</code> : null}
      {verified ? <p className="form-status success">Payment verified with Stripe.</p> : null}
      <Link className="button primary" href="/">
        Back to shop
      </Link>
    </main>
  );
}
