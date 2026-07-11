# Launch Hardening (No New Third Parties)

This pass hardens Cepa using only code and SQL already in the monorepo. No new SaaS logins are required to ship these changes.

## What landed in-repo

- Legal pages: `/privacy`, `/terms`, `/refunds`, `/delivery`
- Softer health-claim copy + footer disclaimer
- Ingredients / allergens on products
- Checkout collects name, phone, address, notes, gift note
- No order/delivery minimum (single-item test purchases allowed)
- Contact rate limiting SQL + same-origin guards
- Inventory-safe admin order status RPC
- Stale reservation cleanup helper
- Success page verifies Stripe session when Stripe is configured
- Cancel page releases open reservations when possible
- `/api/health` no longer leaks service config in production
- Static sold counts zeroed so the UI does not invent demand
- Catalog can overlay live active products/prices from Supabase public API when env is present

## Migration to apply

```text
supabase/migrations/20260711120000_launch_hardening.sql
```

Apply after the earlier commerce + security migrations.

## Font / asset license reminder

Fonts under `apps/web/public/fonts/` must be licensed for web use and redistribution in this repo. If any font is personal-use only, replace it before public launch. Keep purchase receipts outside git.

## Still requires external accounts (not done here)

- Supabase project + env vars
- Stripe keys + webhook endpoint
- Vercel env wiring
- Cloudflare WAF / rate-limit rules
- Real business permits, tax, and legal counsel
