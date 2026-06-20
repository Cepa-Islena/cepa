import { headers } from "next/headers";

export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export function getSupabaseServerKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

export function getSupabaseServerEnv() {
  const publicEnv = getSupabasePublicEnv();
  const serverKey = getSupabaseServerKey();

  if (!publicEnv || !serverKey) return null;
  return { ...publicEnv, serverKey };
}

export function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY || null;
}

export function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}

export function isCommerceConfigured() {
  return Boolean(getSupabaseServerEnv() && getStripeSecretKey());
}

export async function getRequestOrigin() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const forwardedProto = headerStore.get("x-forwarded-proto") ?? "https";
  const host = forwardedHost ?? headerStore.get("host");

  if (host) return `${forwardedProto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
