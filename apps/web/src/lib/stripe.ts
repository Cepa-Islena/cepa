import Stripe from "stripe";
import { getStripeSecretKey } from "@/lib/env";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const key = getStripeSecretKey();
  if (!key) return null;

  stripeClient ??= new Stripe(key, {
    apiVersion: "2026-05-27.dahlia",
    appInfo: {
      name: "Cepa Isleña",
      version: "1.0.0",
    },
  });

  return stripeClient;
}
