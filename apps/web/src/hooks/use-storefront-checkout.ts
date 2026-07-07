"use client";

import { useCallback, useState } from "react";
import type { CartItem } from "@/lib/catalog";
import { createCheckoutSession } from "@/lib/storefront-api";

export type CheckoutState =
  | { status: "idle"; message: string }
  | { status: "loading"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; message: string };

type CheckoutArgs = {
  cart: CartItem[];
  deliveryTown: string;
};

export function useStorefrontCheckout(commerceConfigured: boolean) {
  const [customerEmail, setCustomerEmail] = useState("");
  const [checkoutState, setCheckoutState] = useState<CheckoutState>({
    status: "idle",
    message: commerceConfigured
      ? "Stripe Checkout will open after server validation."
      : "Checkout is paused until Supabase and Stripe env vars are configured.",
  });

  const checkout = useCallback(
    async ({ cart, deliveryTown }: CheckoutArgs) => {
      if (!cart.length) return;

      setCheckoutState({ status: "loading", message: "Validating cart and reserving capacity..." });

      try {
        const { url } = await createCheckoutSession({
          cartItems: cart,
          deliveryPueblo: deliveryTown,
          customerEmail,
        });

        setCheckoutState({ status: "ready", message: "Reserved. Opening Stripe Checkout..." });
        window.location.href = url;
      } catch (error) {
        setCheckoutState({
          status: "error",
          message: error instanceof Error ? error.message : "Checkout is unavailable right now.",
        });
      }
    },
    [customerEmail],
  );

  return {
    customerEmail,
    setCustomerEmail,
    checkoutState,
    checkout,
  };
}
