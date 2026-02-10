# Stripe Payment Link (Ryan)

The landing page Buy button reads the Stripe Payment Link from an environment variable.

## Create the link in Stripe

1. Stripe Dashboard → **Payment Links**
2. **Create payment link**
3. Select (or create) the product and price
4. Configure any optional settings (quantity, promo codes, success redirect, etc.)
5. Copy the resulting Payment Link URL (it looks like `https://buy.stripe.com/...`)

## Paste it into the site

### Cloudflare Pages (recommended)

1. Cloudflare Dashboard → Pages → your `clock.md` project → **Settings** → **Environment variables**
2. Add:
   - `VITE_STRIPE_PAYMENT_LINK` = your Stripe Payment Link URL
3. Redeploy (or trigger a new deployment)

### Local dev

In `landing/`, create `.env.local`:

```bash
VITE_STRIPE_PAYMENT_LINK="https://buy.stripe.com/..."
```

