# Check the real domain

Production domain expected: `https://cepaislena.com`

## 1. Deploy this branch

Push `main` to GitHub so Vercel rebuilds.

## 2. Vercel environment variables

Set for **Production** (and Preview if you want paid tests there too):

```text
NEXT_PUBLIC_SITE_URL=https://cepaislena.com
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...   # or SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY=sk_test_...   # use test key until real launch
STRIPE_WEBHOOK_SECRET=whsec_...
```

Private gate (optional while reviewing with owner):

```text
SITE_ACCESS_ENABLED=true
SITE_ACCESS_USERNAME=cepa
SITE_ACCESS_PASSWORD=...strong...
```

To let the owner browse without the browser password prompt:

```text
SITE_ACCESS_ENABLED=false
```

## 3. Stripe webhook (test mode first)

Endpoint:

```text
https://cepaislena.com/api/stripe/webhook
```

Events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`
- `checkout.session.async_payment_failed`

## 4. Supabase migrations

Apply every file in `supabase/migrations/` in order, including:

- `20260711120000_launch_hardening.sql`
- `20260711130000_remove_order_minimums.sql`

## 5. Smoke check on the live domain

1. Open `https://cepaislena.com` (enter site password if gate is on).
2. Scroll — fruit characters should spawn.
3. Add one product, fill name/phone/address, checkout with Stripe **test** card `4242 4242 4242 4242`.
4. Confirm success page verifies payment.
5. Confirm `/admin` shows the paid order after webhook.

## Notes

- Checkout POSTs require the browser origin to match `NEXT_PUBLIC_SITE_URL`.
- Keep using Stripe **test** keys until the owner is ready for live money.
