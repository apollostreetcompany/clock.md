# Deploy (Cloudflare Pages)

The site lives in `landing/` (Vite + React).

## Cloudflare Pages (UI)

1. Cloudflare Dashboard → **Pages** → **Create a project** → connect this GitHub repo
2. **Build settings**
   - Root directory: `landing`
   - Build command: `npm run build`
   - Build output directory: `dist`
3. **Environment variables**
   - `VITE_STRIPE_PAYMENT_LINK` (optional) — see `STRIPE.md`
4. Deploy

## Cloudflare Pages (CLI via wrangler)

Build:

```bash
cd landing
npm ci
npm run build
```

Deploy (first time may prompt to create/link a Pages project):

```bash
cd landing
npx wrangler pages deploy dist
```

