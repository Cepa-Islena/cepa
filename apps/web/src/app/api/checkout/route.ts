import { NextResponse } from "next/server";
import { findProduct } from "@/lib/catalog";
import { getRequestOrigin, isCommerceConfigured } from "@/lib/env";
import { checkoutLineItems, isMetroTown } from "@/lib/commerce";
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

  try {
    const origin = await getRequestOrigin();
    const checkoutItems = checkoutLineItems(parsed.data.cartItems);

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
      line_items: checkoutItems.map((item) => {
        const product = findProduct(item.productSlug);
        return {
          quantity: item.quantity,
          price_data: {
            currency: "usd",
            unit_amount: item.unitAmountCents,
            product_data: {
              name: item.name,
              description: item.description,
              images: product ? [`${origin}${product.image}`] : undefined,
              metadata: {
                product_slug: item.productSlug,
              },
            },
          },
        };
      }),
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a Checkout URL.");
    }

    await supabase
      .from("orders")
      .update({
        status: "checkout_created",
        stripe_checkout_session_id: session.id,
        total_cents: reservation.total_cents,
      })
      .eq("id", reservation.order_id);

    return NextResponse.json({
      url: session.url,
      orderId: reservation.order_id,
      subtotalCents: reservation.subtotal_cents,
      totalCents: reservation.total_cents,
    });
  } catch (error) {
    await supabase.rpc("release_order_reservation", { target_order_id: reservation.order_id });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout could not be created." },
      { status: 502 },
    );
  }
}
