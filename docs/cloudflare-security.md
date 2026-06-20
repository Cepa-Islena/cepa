# Cloudflare Security Rules

Use Cloudflare for DNS, managed WAF, DDoS protection, CDN caching, bot controls, and targeted rate limiting.

## Cache

- Cache public static assets, brand images, fonts, and product imagery aggressively.
- Respect Vercel/Next.js cache headers for app routes.
- Do not cache `/api/*`, `/admin*`, or Stripe return pages.

## WAF And Rate Limits

Recommended route rules:

- `/admin*`: managed challenge for suspicious traffic, no cache.
- `/api/checkout`: rate limit by IP and user agent, no cache.
- `/api/contact`: rate limit by IP, consider Turnstile if spam appears, no cache.
- `/api/stripe/webhook`: allow Stripe IPs where operationally practical, no cache, block non-POST methods.

## Headers

The app sets CSP, HSTS, frame, referrer, permissions, and content-type headers in `apps/web/next.config.ts`. Keep Cloudflare header transforms aligned with those app headers.

## Failure Mode

Public pages are static/cacheable and should stay usable if Supabase or Stripe is unavailable. Dynamic paths should return a controlled paused/error state instead of taking down the storefront.
