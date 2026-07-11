import { NextResponse } from "next/server";
import { getSupabasePublicEnv, getSupabaseServerEnv, getStripeSecretKey, getStripeWebhookSecret } from "@/lib/env";

export async function GET() {
  // Production only reports liveness so this route cannot be used for config recon.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: true });
  }

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
