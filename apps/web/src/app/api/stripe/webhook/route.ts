import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeWebhookSecret } from "@/lib/env";
import { loadOrderEmailPayload, notifyPaidOrder } from "@/lib/order-email";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

const PAID_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

const RELEASE_EVENTS = new Set([
  "checkout.session.expired",
  "checkout.session.async_payment_failed",
]);

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = getStripeWebhookSecret();
  const supabase = createSupabaseServiceClient();
  const signature = request.headers.get("stripe-signature");

  if (!stripe || !webhookSecret || !supabase) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  const { error: eventInsertError } = await supabase.from("stripe_events").insert({
    id: event.id,
    type: event.type,
    payload: event as unknown as Record<string, unknown>,
  });
  const duplicateEvent = eventInsertError?.code === "23505";

  if (eventInsertError && !duplicateEvent) {
    return NextResponse.json({ error: "Could not store Stripe event." }, { status: 500 });
  }

  if (!event.type.startsWith("checkout.session.")) {
    return NextResponse.json({ received: true, duplicate: duplicateEvent });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.order_id || session.client_reference_id || undefined;

  if (!orderId) {
    return NextResponse.json({ received: true, duplicate: duplicateEvent });
  }

  const paymentPaid =
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required" ||
    event.type === "checkout.session.async_payment_succeeded";

  if (PAID_EVENTS.has(event.type) && paymentPaid) {
    const { error } = await supabase.rpc("mark_order_paid", {
      target_order_id: orderId,
      checkout_session_id: session.id,
    });

    if (error) {
      return NextResponse.json({ error: "Could not mark order paid." }, { status: 500 });
    }

    try {
      const order = await loadOrderEmailPayload(supabase, orderId);
      if (order) {
        if (!order.customerEmail && session.customer_details?.email) {
          order.customerEmail = session.customer_details.email;
        }
        if (!order.customerEmail && session.customer_email) {
          order.customerEmail = session.customer_email;
        }
        await notifyPaidOrder(supabase, order);
      }
    } catch {
      // Email is best-effort; payment already succeeded.
    }
  }

  if (RELEASE_EVENTS.has(event.type)) {
    const { error } = await supabase.rpc("release_order_reservation", {
      target_order_id: orderId,
    });

    if (error && !/already|released|not found|0 rows/i.test(error.message || "")) {
      return NextResponse.json({ error: "Could not release order reservation." }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true, duplicate: duplicateEvent });
}
