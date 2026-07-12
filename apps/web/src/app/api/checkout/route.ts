import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { findProduct } from "@/lib/catalog";
import { isCommerceConfigured } from "@/lib/env";
import { isMetroTown } from "@/lib/commerce";
import { checkoutRequestSchema } from "@/lib/schemas";
import { assertSameOrigin, getForwardedIp } from "@/lib/request-guards";
import { reserveOrderInApp, type ReservationResult } from "@/lib/reserve-order";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

const CHECKOUT_RATE_LIMIT_ERROR = "Too many checkout attempts. Please wait and try again.";

type ReservedOrderItem = {
  product_slug: string;
  product_name: string;
  quantity: number;
  unit_amount_cents: number;
  total_amount_cents: number;
};

function getCheckoutRateLimitKey(request: Request) {
  const ip = getForwardedIp(request);
  const userAgent = request.headers.get("user-agent")?.slice(0, 256) ?? "unknown-agent";
  const digest = createHash("sha256").update(`${ip}|${userAgent}`).digest("hex");

  return `checkout:${digest}`;
}

function isCheckoutRateLimitError(error: { message?: string } | null) {
  return error?.message?.includes(CHECKOUT_RATE_LIMIT_ERROR) ?? false;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request origin." },
      { status: 403 },
    );
  }

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

  let origin: string;

  try {
    origin = assertSameOrigin(request);
  } catch {
    return NextResponse.json({ error: "Checkout site URL is not configured." }, { status: 503 });
  }

  const { error: rateLimitError } = await supabase.rpc("register_checkout_attempt", {
    rate_limit_key: getCheckoutRateLimitKey(request),
  });

  if (rateLimitError) {
    const status = isCheckoutRateLimitError(rateLimitError) ? 429 : 503;
    const message = status === 429 ? CHECKOUT_RATE_LIMIT_ERROR : "Checkout abuse protection is unavailable.";

    return NextResponse.json({ error: message }, { status });
  }

  const giftNoteFromCart = parsed.data.cartItems.find((item) => item.productSlug === "delivery-note")?.note;
  const giftNote = (parsed.data.giftNote || giftNoteFromCart || "").trim();

  const cartLines = parsed.data.cartItems.map(({ productSlug, quantity }) => ({ productSlug, quantity }));
  const reserveArgs = {
    cart_items: cartLines,
    delivery_pueblo: parsed.data.deliveryPueblo,
    customer_email: parsed.data.customerEmail || null,
    customer_name: parsed.data.customerName,
    customer_phone: parsed.data.customerPhone,
    delivery_address: parsed.data.deliveryAddress,
    delivery_notes: parsed.data.deliveryNotes || null,
    gift_note: giftNote || null,
  };

  let reservation: ReservationResult | null = null;

  const { data: rpcReservation, error: reservationError } = await supabase
    .rpc("reserve_order", reserveArgs)
    .single<ReservationResult>();

  if (!reservationError && rpcReservation) {
    reservation = rpcReservation;
  } else {
    // Soft-launch bridge while DB reserve_order has ambiguous column bug.
    const fallback = await reserveOrderInApp(supabase, {
      cartItems: cartLines,
      deliveryPueblo: parsed.data.deliveryPueblo,
      customerEmail: parsed.data.customerEmail || null,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      deliveryAddress: parsed.data.deliveryAddress,
      deliveryNotes: parsed.data.deliveryNotes || null,
      giftNote: giftNote || null,
    });

    if (!fallback.data) {
      return NextResponse.json(
        { error: fallback.error ?? reservationError?.message ?? "Could not reserve this cart." },
        { status: 409 },
      );
    }

    reservation = fallback.data;
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

    const deliveryFeeCents = reservation.total_cents - reservation.subtotal_cents;
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = typedReservedItems.map((item) => {
      const product = findProduct(item.product_slug);
      const brandLogo = `${origin}/brand/logo-borra.png`;

      return {
        quantity: item.quantity,
        price_data: {
          currency: "usd",
          unit_amount: item.unit_amount_cents,
          product_data: {
            name: item.product_name,
            description: product?.size ?? "Cepa order item",
            // Brand logo on Stripe Checkout (not product mascot art).
            images: [brandLogo],
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
            images: [`${origin}/brand/logo-borra.png`],
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
        customer_name: parsed.data.customerName,
        customer_phone: parsed.data.customerPhone,
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
