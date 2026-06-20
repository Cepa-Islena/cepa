# Cepa

Cepa is a Next.js + TypeScript commerce MVP for a fast public storefront, Supabase-backed inventory/orders/admin, Stripe Checkout, Vercel hosting, Cloudflare DNS/security/CDN, and Docker standby.

## App

- `apps/web`: Next.js App Router storefront and admin.
- `supabase/migrations`: Postgres schema, RLS policies, seed data, and reservation functions.
- `docs`: operational runbooks for plugins, Cloudflare, and deployment.

## Local Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Required checkout/admin env vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SITE_URL`

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

## Stripe

The app uses hosted Checkout Sessions for one-time payments. Product/price objects are not required for MVP checkout because the server creates Checkout line items from Supabase-validated order items.

Configure the webhook endpoint:

```text
POST https://<domain>/api/stripe/webhook
```

Listen for:

- `checkout.session.completed`
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
