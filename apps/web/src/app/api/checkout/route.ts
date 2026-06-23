import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { findProduct } from "@/lib/catalog";
import { getRequestOrigin, isCommerceConfigured } from "@/lib/env";
import { isMetroTown } from "@/lib/commerce";
import { checkoutRequestSchema } from "@/lib/schemas";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

type ReservationResult = {
  order_id: string;
  subtotal_cents: number;
  total_cents: number;
  reservation_expires_at: string;
};

type ReservedOrderItem = {
  product_slug: string;
  product_name: string;
  quantity: number;
  unit_amount_cents: number;
  total_amount_cents: number;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = checkoutRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  if (!isMetroTown(parsed.data.deliveryPueblo)) {
    return NextResponse.json({ error: "Delivery is currently limited to metro pueblos." }, { status: 400 });
  }

  if (!isCommerceConfigured()) {
    return NextResponse.json({ error: "Checkout is paused until Supabase and Stripe are configured." }, { status: 503 });
  }

  const supabase = createSupabaseServiceClient();
  const stripe = getStripeClient();

  if (!supabase || !stripe) {
    return NextResponse.json({ error: "Checkout is not configured." }, { status: 503 });
  }

  const { data: reservation, error: reservationError } = await supabase
    .rpc("reserve_order", {
      cart_items: parsed.data.cartItems,
      delivery_pueblo: parsed.data.deliveryPueblo,
      customer_email: parsed.data.customerEmail || null,
    })
    .single<ReservationResult>();

  if (reservationError || !reservation) {
    return NextResponse.json({ error: reservationError?.message ?? "Could not reserve this cart." }, { status: 409 });
  }

  let checkoutSessionId: string | null = null;

  try {
    const { data: reservedItems, error: reservedItemsError } = await supabase
      .from("order_items")
      .select("product_slug, product_name, quantity, unit_amount_cents, total_amount_cents")
      .eq("order_id", reservation.order_id);

    if (reservedItemsError || !reservedItems?.length) {
      throw new Error(reservedItemsError?.message ?? "Reserved order items could not be loaded.");
    }

    const typedReservedItems = reservedItems as ReservedOrderItem[];
    const reservedSubtotalCents = typedReservedItems.reduce((sum, item) => sum + item.total_amount_cents, 0);

    if (reservedSubtotalCents !== reservation.subtotal_cents) {
      throw new Error("Reserved order total does not match the locked order items.");
    }

    const origin = await getRequestOrigin();
    const deliveryFeeCents = reservation.total_cents - reservation.subtotal_cents;
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = typedReservedItems.map((item) => {
      const product = findProduct(item.product_slug);

      return {
        quantity: item.quantity,
        price_data: {
          currency: "usd",
          unit_amount: item.unit_amount_cents,
          product_data: {
            name: item.product_name,
            description: product?.size ?? "Cepa order item",
            images: product ? [`${origin}${product.image}`] : undefined,
            metadata: {
              product_slug: item.product_slug,
            },
          },
        },
      };
    });

    if (deliveryFeeCents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: deliveryFeeCents,
          product_data: {
            name: "Metro delivery",
            description: `Delivery to ${parsed.data.deliveryPueblo}`,
            metadata: {
              delivery_pueblo: parsed.data.deliveryPueblo,
            },
          },
        },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: reservation.order_id,
      customer_email: parsed.data.customerEmail || undefined,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel?order_id=${reservation.order_id}`,
      metadata: {
        order_id: reservation.order_id,
        delivery_pueblo: parsed.data.deliveryPueblo,
      },
      line_items: lineItems,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });
    checkoutSessionId = session.id;

    if (!session.url) {
      throw new Error("Stripe did not return a Checkout URL.");
    }

    const { error: orderUpdateError } = await supabase
      .from("orders")
      .update({
        status: "checkout_created",
        stripe_checkout_session_id: session.id,
        total_cents: reservation.total_cents,
      })
      .eq("id", reservation.order_id);

    if (orderUpdateError) {
      throw new Error(orderUpdateError.message);
    }

    return NextResponse.json({
      url: session.url,
      orderId: reservation.order_id,
      subtotalCents: reservation.subtotal_cents,
      totalCents: reservation.total_cents,
    });
  } catch (error) {
    if (checkoutSessionId) {
      await stripe.checkout.sessions.expire(checkoutSessionId).catch(() => undefined);
    }

    await supabase.rpc("release_order_reservation", { target_order_id: reservation.order_id });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout could not be created." },
      { status: 502 },
    );
  }
}
