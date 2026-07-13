# Cepa live-commerce checklist

Use this before switching Stripe from **test** to **live**.

## Already working in test
- [x] Supabase products + delivery zones
- [x] `reserve_order` RPC (atomic inventory lock)
- [x] Stripe Checkout session creation
- [x] Webhook marks orders `paid`
- [x] Owner email wiring to `Cepaislena@gmail.com` (needs `RESEND_API_KEY`)
- [x] Customer email required at checkout
- [x] Admin ops board (`/admin`)

## Before first real charge
1. Create Resend account with **Cepaislena@gmail.com**
2. Add Vercel env `RESEND_API_KEY=re_...` (Production)
3. Optional: verify domain `cepaislena.com` in Resend for branded From:
4. Stripe **live** keys: `STRIPE_SECRET_KEY` (`sk_live_...`)
5. New Stripe live webhook → `https://cepaislena.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
6. Set live `STRIPE_WEBHOOK_SECRET` (`whsec_...`)
7. Redeploy
8. Smoke test with a real card for **$1 or a juice**, then refund if needed
9. Confirm owner inbox got the paid-order email
10. Confirm admin shows order as `paid` and you can mark `fulfilled`

## Ops rhythm
- Watch **paid** queue in `/admin` (and Gmail)
- Pack / deliver
- Mark **fulfilled**
- Reply to **new** contact messages

## Do not
- Do not leave `sk_test` on production when real customers pay
- Do not remove customer email requirement without a replacement notification path
