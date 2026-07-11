# Domain go-live / test checkout

If the cart says **Checkout is paused until Supabase and Stripe env vars are configured**, the live site does not have the keys. Code alone cannot take payments.

## Fix checkout (required)

In **Vercel → Project → Settings → Environment Variables** (Production):

| Name | Example |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://cepaislena.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `STRIPE_SECRET_KEY` | `sk_test_...` for fake money |
| `STRIPE_WEBHOOK_SECRET` | from Stripe webhook |

Then **Redeploy** the latest `main` deployment.

### Stripe test money

1. Use **test mode** keys (`sk_test_...`).
2. Webhook endpoint: `https://cepaislena.com/api/stripe/webhook`
3. Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `checkout.session.async_payment_failed`
4. Pay with card `4242 4242 4242 4242`, any future expiry, any CVC.

### Supabase

Apply all migrations in `supabase/migrations/` in order.

## Fix “same old UI”

1. Confirm Vercel deployed commit `main` after the fruit UI push.
2. Hard refresh: Cmd+Shift+R
3. You should see:
   - yellow config banner if env missing
   - lime “Pleasure to be sipped by you” band
   - fruit bubbles with names (Parcha, Acerola…) floating on the sides
4. If still old: Vercel Root Directory / monorepo settings may be wrong. Prefer:
   - Root Directory = repository root
   - Install = `pnpm install --frozen-lockfile`
   - Build = `pnpm --filter @cepa/web build`
   - Output = `apps/web/.next`

## Site password gate

If the browser asks for username/password, `SITE_ACCESS_ENABLED=true`.

For owner browsing without a password: set `SITE_ACCESS_ENABLED=false` and redeploy.
