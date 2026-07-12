import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeWebhookSecret } from "@/lib/env";
import { loadOrderEmailPayload, sendCustomerOrderEmail, sendOwnerOrderEmail } from "@/lib/order-email";
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
  const duplicateEvent = eventInsertError?.code === "23505";

  if (eventInsertError && !duplicateEvent) {
    return NextResponse.json({ error: "Could not store Stripe event." }, { status: 500 });
  }

  if (!event.type.startsWith("checkout.session.")) {
    return NextResponse.json({ received: true, duplicate: duplicateEvent });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.order_id;

  if (!orderId) {
    return NextResponse.json({ received: true, duplicate: duplicateEvent });
  }

  const shouldMarkPaid =
    event.type === "checkout.session.async_payment_succeeded" ||
    (event.type === "checkout.session.completed" && session.payment_status === "paid");

  if (shouldMarkPaid) {
    const { error } = await supabase.rpc("mark_order_paid", {
      target_order_id: orderId,
      checkout_session_id: session.id,
    });

    if (error) {
      return NextResponse.json({ error: "Could not mark order paid." }, { status: 500 });
    }

    // Notify owner (and customer if they left an email). Never fail the webhook on email issues.
    if (!duplicateEvent) {
      try {
        const order = await loadOrderEmailPayload(supabase, orderId);
        if (order) {
          // Prefer Stripe session email if cart email was empty.
          if (!order.customerEmail && session.customer_details?.email) {
            order.customerEmail = session.customer_details.email;
          }
          if (!order.customerEmail && session.customer_email) {
            order.customerEmail = session.customer_email;
          }

          await sendOwnerOrderEmail(order);
          await sendCustomerOrderEmail(order);
        }
      } catch {
        // Email is best-effort; order is already paid.
      }
    }
  }

  if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const { error } = await supabase.rpc("release_order_reservation", {
      target_order_id: orderId,
    });

    if (error) {
      return NextResponse.json({ error: "Could not release order reservation." }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true, duplicate: duplicateEvent });
}
