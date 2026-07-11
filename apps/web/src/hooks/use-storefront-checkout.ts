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
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [giftNote, setGiftNote] = useState("");
  const [checkoutState, setCheckoutState] = useState<CheckoutState>({
    status: "idle",
    message: commerceConfigured
      ? "Stripe Checkout opens after server validation and inventory reservation."
      : "Checkout is paused until Supabase and Stripe env vars are configured.",
  });

  const checkout = useCallback(
    async ({ cart, deliveryTown }: CheckoutArgs) => {
      if (!cart.length) return;

      if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
        setCheckoutState({
          status: "error",
          message: "Add your name, phone, and delivery address before checkout.",
        });
        return;
      }

      setCheckoutState({ status: "loading", message: "Validating cart and reserving capacity..." });

      try {
        const { url } = await createCheckoutSession({
          cartItems: cart,
          deliveryPueblo: deliveryTown,
          customerEmail,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          deliveryAddress: deliveryAddress.trim(),
          deliveryNotes: deliveryNotes.trim(),
          giftNote: giftNote.trim(),
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
    [customerEmail, customerName, customerPhone, deliveryAddress, deliveryNotes, giftNote],
  );

  return {
    customerEmail,
    setCustomerEmail,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    deliveryAddress,
    setDeliveryAddress,
    deliveryNotes,
    setDeliveryNotes,
    giftNote,
    setGiftNote,
    checkoutState,
    checkout,
  };
}
