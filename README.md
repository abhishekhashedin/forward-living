# Forward Living — Instamojo Light Checkout test

This update replaces the Store product Pay Button with a custom button that asks a Vercel serverless function to create a fixed-price ₹509 Payment Request, then opens the returned URL with Instamojo's documented JavaScript checkout SDK and `?embed=form`.

## Vercel setup

1. Copy `index.html` and `styles.css` into the root of your existing site, preserving the `assets/` directory.
2. Copy `api/create-payment-request.js` into the site's `/api/` directory.
3. Copy `payment-return.html` to the site root.
4. In Vercel → Project → Settings → Environment Variables, add:
   - `INSTAMOJO_CLIENT_ID` — from Instamojo Developers/API credentials (production credentials)
   - `INSTAMOJO_CLIENT_SECRET` — from the same page
   - `SITE_URL` — `https://forwardliving.in` (no trailing slash)
5. Redeploy the site.
6. Test using a real supported payment method only after Instamojo confirms production API access and payments are enabled for your account.

## Important limitations before launch

- The browser never receives the API secret; the Vercel function holds it server-side.
- This creates a **generic Payment Request**, not a Store product purchase. Instamojo's referenced Payment Request docs do not confirm that it triggers automatic delivery of the PDF uploaded to the Store product. Do not launch this flow until you confirm how buyers will receive the PDF.
- The return page is informational only. A redirect or client-side checkout callback is not authoritative proof of payment. Production delivery should be tied to a verified server-side payment status and a validated webhook/MAC.
- This minimal patch does not implement webhook validation, order persistence, refund processing, or automatic secure PDF delivery. It is specifically a checkout-panel experiment.
- API access, payment activation and account eligibility must be enabled by Instamojo. A code update cannot activate them.
- If your Vercel project uses CommonJS instead of ES modules for functions, change the handler export to the syntax your project supports or add the appropriate `package.json` configuration.

## Official documentation used

- https://docs.instamojo.com/reference/generate-access-token-application-based-authentication
- https://docs.instamojo.com/reference/create-a-payment-request-1
- https://docs.instamojo.com/reference (Integration guide: Light Checkout `?embed=form`, redirects and webhooks)
