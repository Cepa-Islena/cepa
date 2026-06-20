# Plugin Runbook

## Supabase Plugin

Use the Supabase plugin before schema or auth changes:

- Search current docs for RLS, Data API grants, SSR auth, and migration behavior.
- Inspect migration status with the project id before applying changes.
- Use SQL execution for iterative verification and apply a clean migration when ready.
- Verify RLS by checking anon, authenticated, admin, and service-key behavior.

This repo already accounts for the 2026 Data API behavior where new tables may not be automatically exposed. Public access is granted explicitly and paired with RLS.

## Stripe Plugin

Use the Stripe plugin for account inspection and resource checks:

- List products/prices if the team decides to pre-create Stripe catalog resources.
- Keep hosted Checkout Sessions for MVP one-time payments.
- Verify webhook events and duplicate event handling.
- Use the latest account-compatible Stripe API version.

The current implementation uses Checkout `price_data` so Supabase remains the source of truth for product pricing.

## Vercel Plugin

Use the Vercel plugin for deployment work:

- Discover the Vercel project/team if `.vercel/project.json` is absent.
- Deploy previews from the current repo.
- Inspect failed deployments and build logs.
- Confirm production domains and environment variables by environment.

Local CLI fallback:

```bash
vercel link
vercel env pull .env.local
vercel build
vercel deploy --prebuilt
```
