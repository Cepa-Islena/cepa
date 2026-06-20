import { NextResponse } from "next/server";
import { getSupabasePublicEnv, getSupabaseServerEnv, getStripeSecretKey, getStripeWebhookSecret } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    services: {
      supabasePublic: Boolean(getSupabasePublicEnv()),
      supabaseServer: Boolean(getSupabaseServerEnv()),
      stripeCheckout: Boolean(getStripeSecretKey()),
      stripeWebhook: Boolean(getStripeWebhookSecret()),
    },
  });
}
