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

export function getConfiguredSiteOrigin() {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL?.trim(),
    "https://cepaislena.com",
    "http://localhost:3000",
  ].filter(Boolean) as string[];

  for (const siteUrl of candidates) {
    try {
      const parsedUrl = new URL(siteUrl);
      if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
        return parsedUrl.origin;
      }
    } catch {
      // try next candidate
    }
  }

  return "https://cepaislena.com";
}

export async function getRequestOrigin() {
  return getConfiguredSiteOrigin();
}
