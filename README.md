# Cepa

Cepa is a Next.js + TypeScript commerce MVP for a fast public storefront, Supabase-backed inventory/orders/admin, Stripe Checkout, Vercel hosting, Cloudflare DNS/security/CDN, and Docker standby.

## App

- `apps/web`: Next.js App Router storefront and admin.
- `supabase/migrations`: Postgres schema, RLS policies, seed data, and reservation functions.
- `docs`: operational runbooks for plugins, Cloudflare, and deployment.

## Current MVP State

- Public storefront, cart, quiz, delivery checker, contact form, and admin routes are implemented.
- The production domain is protected by the site access gate while Cepa is still private.
- Checkout code is ready, but live/test payments stay paused until the Supabase and Stripe Vercel environment variables are added.
- Admin users can review orders, update order status, review contact messages, update contact status, and mark products active or paused.
- Security headers are centralized in `apps/web/src/lib/security-headers.ts` and applied site-wide through Next.js.

## Local Setup

```bash
pnpm install
pnpm dev
```

Keep local settings in a private `.env.local` file and production settings in Vercel environment variables. Do not commit env files. Required checkout/admin settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SITE_URL`

Private preview/protection settings:

- `SITE_ACCESS_ENABLED`
- `SITE_ACCESS_USERNAME`
- `SITE_ACCESS_PASSWORD`

Public pages render without service env vars. Checkout, contact form, and admin intentionally return paused/configuration states until Supabase and Stripe are configured.

## Supabase

Apply `supabase/migrations/20260620000000_initial_commerce.sql` to a Supabase project. The migration:

- Creates products, recipes, bundles, orders, order items, delivery zones, admin profiles, contact messages, and Stripe event tables.
- Enables RLS on all public tables.
- Grants public Data API access only for active products, active delivery zones, and contact inserts.
- Adds transactional reservation, release, and paid-order functions used by server routes.

Create the first admin after the user signs in through Supabase Auth:

```sql
insert into public.admin_profiles (user_id, role)
values ('<auth-user-uuid>', 'owner');
```

Admin authorization is stored in `admin_profiles`; do not rely on user-editable Supabase user metadata for admin access.

## Stripe

The app uses hosted Checkout Sessions for one-time payments. Product/price objects are not required for MVP checkout because the server creates Checkout line items from Supabase-validated order items.

Checkout readiness notes:

- `/api/checkout` reserves capacity in Supabase before creating a Stripe Checkout Session.
- Stripe line items are created from the reserved order snapshot, not from client-side prices.
- `/api/stripe/webhook` verifies signatures, stores event IDs, and handles duplicate events idempotently.
- Webhook failures return errors so Stripe can retry.

Configure the webhook endpoint:

```text
POST https://<domain>/api/stripe/webhook
```

Listen for:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`
- `checkout.session.async_payment_failed`

## Vercel

The repo includes `vercel.json` for a root-level monorepo deployment:

```bash
pnpm install --frozen-lockfile
pnpm --filter @cepa/web build
```

Use Vercel environment variables rather than committed secrets. Scope preview deployments away from production Supabase data when possible.

## Docker Standby

```bash
docker build -t cepa-web .
docker run --env-file .env.local -p 3000:3000 cepa-web
```

## Checks

```bash
pnpm check
pnpm test:run
pnpm build
```
