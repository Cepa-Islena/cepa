"use client";

import { useCallback, useState } from "react";
import type { CartItem } from "@/lib/catalog";
import {
  bottleCount,
  cartCount,
  cartProducts,
  cartTotalCents,
  estimatedProduceLb,
} from "@/lib/commerce";

export function useStorefrontCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const lines = cartProducts(cart);
  const total = cartTotalCents(cart);
  const bottles = bottleCount(cart);
  const produce = estimatedProduceLb(cart);
  const itemCount = cartCount(cart);

  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);

  const addToCart = useCallback((productSlug: string) => {
    setCart((current) => {
      const existing = current.find((item) => item.productSlug === productSlug);
      if (existing) {
        return current.map((item) =>
          item.productSlug === productSlug ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...current, { productSlug, quantity: 1 }];
    });
    setCartOpen(true);
  }, []);

  const updateQuantity = useCallback((productSlug: string, delta: number) => {
    setCart((current) =>
      current
        .map((item) => (item.productSlug === productSlug ? { ...item, quantity: Math.max(item.quantity + delta, 0) } : item))
        .filter((item) => item.quantity > 0),
    );
  }, []);

  return {
    cart,
    cartOpen,
    lines,
    total,
    bottles,
    produce,
    itemCount,
    openCart,
    closeCart,
    addToCart,
    updateQuantity,
  };
}
