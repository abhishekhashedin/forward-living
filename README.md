# Forward Living — purchase-protected PDF starter

A minimal HTML + Vercel Functions + Supabase Google Auth + Razorpay + private Vercel Blob implementation for one paid PDF.

## Before you start

- Use Node.js 20+ locally.
- Create a Supabase project.
- Create a Razorpay account and start in **Test Mode**.
- Create a **new private** Vercel Blob store connected to this Vercel project.
- Have a Git repository connected to the Vercel project. Keep secrets out of source control.

## 1. Supabase database

1. In Supabase, open SQL Editor.
2. Run the full contents of `schema.sql`.
3. In Project Settings > API, copy the Project URL, publishable/anon key, and service-role/secret key.
4. Never put the service-role key in `index.html`.

## 2. Google login

1. In Supabase, open Authentication > Sign In / Providers > Google and enable Google.
2. In Google Cloud Console, create/select a project and configure the OAuth consent screen.
3. Create OAuth credentials of type **Web application**.
4. Add your website origin (for example `https://forwardliving.in`) to Authorized JavaScript origins.
5. Add the callback URL shown in Supabase's Google provider setup to Authorized redirect URIs.
6. Paste the Google Client ID and Client Secret into Supabase's Google provider settings.
7. In Supabase Authentication > URL Configuration, set Site URL to your deployed site origin and add the deployed URL to allowed redirect URLs.
8. In `index.html`, replace `PASTE_SUPABASE_PROJECT_URL` and `PASTE_SUPABASE_PUBLISHABLE_OR_ANON_KEY`.

Supabase's publishable/anon key is intended for browser use with properly configured auth and RLS. The service role key is server-only.

## 3. Create a private Blob store

1. In the Vercel project, open Storage and create a new Blob store.
2. Choose **Private** access. Access mode cannot be changed after creation.
3. Connect the store to this Vercel project and enable the Production and Preview environments you need.
4. Upload your paid PDF to the private store with pathname `paid/starter-guide.pdf` (or update `PRODUCT_BLOB_PATHNAME` to match the pathname shown by Vercel).
5. Ensure Vercel has set `BLOB_READ_WRITE_TOKEN` for this project.
6. Do not put a public PDF URL in the website. Do not use the public store for the paid copy.

## 4. Razorpay test credentials

1. In Razorpay Dashboard, turn on Test Mode.
2. Generate/copy the Test Key ID and Key Secret.
3. Use automatic capture if available/enabled for your account; this starter unlocks only payments with `captured` status.

## 5. Vercel environment variables

In Vercel Project > Settings > Environment Variables, add these variables to the environments you use:

- `SUPABASE_URL` = your Supabase project URL
- `SUPABASE_ANON_KEY` = your Supabase publishable/anon key
- `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service role/secret key (server only)
- `RAZORPAY_KEY_ID` = Razorpay Test Key ID
- `RAZORPAY_KEY_SECRET` = Razorpay Test Key Secret (server only)
- `RAZORPAY_WEBHOOK_SECRET` = a long random secret you create when configuring the Razorpay webhook (server only)
- `PRODUCT_PRICE_PAISE` = `29900` for ₹299 (amount is in paise)
- `PRODUCT_BLOB_PATHNAME` = `paid/starter-guide.pdf`

`BLOB_READ_WRITE_TOKEN` should be added automatically when you connect the private store. If not, connect the store to the project in Vercel Storage settings and check the store's token settings.

Redeploy after changing environment variables.

## 6. Update product copy

In `index.html`, change the title, description, and cover text. In `api/_lib/server.js`, change `PRODUCT.name`, `PRODUCT.amount` (or set `PRODUCT_PRICE_PAISE` in Vercel), `PRODUCT.id`, and `PRODUCT.blobPathname` as needed. Keep `PRODUCT.id` identical to the ID used in `index.html`.

## 7. Deploy

1. Put these files at the root of your project/repository; do not put `index.html` inside a nested `public` folder for this starter.
2. Commit and push the files to the Git repository connected to Vercel.
3. Vercel should deploy `index.html` and automatically deploy the functions in `/api`.
4. Set the environment variables and redeploy.

For local development, run:
```bash
npm install
npx vercel dev
```
Pull Vercel environment variables locally first if needed:
```bash
npx vercel link
npx vercel env pull .env.local
```

## 8. Configure Razorpay webhook (recommended before launch)

1. In Razorpay Dashboard Test Mode, open Account & Settings > Webhooks.
2. Add webhook URL `https://YOUR-DOMAIN/api/razorpay-webhook`.
3. Create a long random webhook secret, save it in Razorpay, and add the same value to Vercel as `RAZORPAY_WEBHOOK_SECRET`.
4. Subscribe to the `order.paid` event.
5. Save the webhook and redeploy Vercel after adding the environment variable.
6. Test an order in Test Mode and check Vercel Function logs plus the `purchases` table. The webhook safely ignores other events and verifies Razorpay's signature against the raw request body.

The checkout verification endpoint provides immediate confirmation to the buyer; the webhook provides a second server-to-server reconciliation path if the customer closes the checkout page after payment.

## 9. Test the complete flow

1. Visit the deployed site over HTTPS.
2. Sign in with Google.
3. Click Buy now and use Razorpay's test checkout details from its official testing documentation.
4. Confirm the backend verifies the checkout signature and fetches payment status from Razorpay.
5. Check Supabase `payment_orders` and `purchases`.
6. Confirm the Download my PDF button appears and the PDF downloads.
7. Sign out and try `/api/download?productId=starter-guide` without an Authorization header. It should reject the request.
8. Sign in with another Google account and try the download. It should return 403 unless that account has purchased the PDF.

## Security notes

- The server creates the order and sets the amount. Never accept an amount from browser code.
- The server verifies Razorpay's checkout HMAC signature and fetches the payment from Razorpay to check captured status, order, amount, and currency.
- The API checks the signed-in user's own purchase row before streaming the private PDF.
- Service-role and Razorpay secret keys must only exist in Vercel server environment variables.
- This starter is a minimal one-product example, not a complete commerce platform. Before selling at scale, add webhook reconciliation, refund/revocation handling, support/contact details, privacy/terms/refund policies, rate limiting, and monitoring. Test all failure cases in Razorpay Test Mode before switching to live keys.
- A customer can still share a file after legitimately downloading it; technical access controls cannot fully prevent redistribution of a downloaded PDF.
