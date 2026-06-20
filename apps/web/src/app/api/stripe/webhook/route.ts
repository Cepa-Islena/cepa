import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeWebhookSecret } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

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

  if (eventInsertError?.code === "23505") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (eventInsertError) {
    return NextResponse.json({ error: "Could not store Stripe event." }, { status: 500 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.order_id;

  if (orderId && event.type === "checkout.session.completed") {
    await supabase.rpc("mark_order_paid", {
      target_order_id: orderId,
      checkout_session_id: session.id,
    });
  }

  if (
    orderId &&
    (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed")
  ) {
    await supabase.rpc("release_order_reservation", {
      target_order_id: orderId,
    });
  }

  return NextResponse.json({ received: true });
}
