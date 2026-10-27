# Forward Living — Razorpay + Private Ebook Delivery

Static website for `forwardliving.in`, with Vercel serverless functions for Razorpay checkout and protected PDF delivery.

## What this version does

- Shows the ebook price as ₹509 (Razorpay amount: 50,900 paise).
- Creates a Razorpay order server-side; the browser cannot choose the amount.
- Verifies the Razorpay checkout signature server-side.
- Confirms payment status directly with Razorpay and only delivers when the payment is captured for ₹509 INR and matches the order.
- Reads `forward_living_debt_recovery_guide.pdf` from Vercel Private Blob and streams the PDF through `/api/download-ebook`.
- Does not return a Blob URL to the customer or store the PDF in the public website directory.
- Removes the old Instamojo checkout code and endpoint.

## Required Vercel environment variables

Set for the Preview environment first. Use Test Mode Razorpay credentials in Preview.

- `RAZORPAY_KEY_ID` — Razorpay key ID for the environment.
- `RAZORPAY_KEY_SECRET` — matching Razorpay key secret for the environment.
- `BLOB_READ_WRITE_TOKEN` — read/write token for the connected **private** Blob store. The private Blob SDK uses this token to read the ebook. Do not expose it in client-side code or commit it to GitHub.

The project currently has `BLOB_STORE_ID` and `BLOB_WEBHOOK_PUBLIC_KEY`, but these are not substitutes for `BLOB_READ_WRITE_TOKEN` for the SDK version used here. In the Vercel Blob store's **Connect to Project** settings, enable “Add a read-write token env var to this connection” for the `forwardliving` project and the environments you intend to use. Vercel should add the token variable automatically. Never paste the token into chat or source code.

Also ensure `forward_living_debt_recovery_guide.pdf` exists in the private store at the root pathname exactly as shown. Do not make it public.

## Deploy and test

1. Keep Razorpay Test Mode keys in Preview. Do not use live credentials for test purchases.
2. Ensure `BLOB_READ_WRITE_TOKEN` is available in Preview and Production through the store connection.
3. Commit/push this project to the GitHub repository connected to Vercel, or deploy the extracted project using your usual workflow.
4. Wait for Vercel to deploy, then test on the Preview URL.
5. Test successful captured payment, payment cancellation/failure, and direct requests to `/api/download-ebook` without a valid signature. Invalid/unpaid requests must not return the PDF.
6. Before launch, add live Razorpay credentials only to Production, redeploy, and complete a carefully controlled live checkout test.

## Security notes

- The PDF bytes must reach a legitimate buyer's browser for a download to work, so a buyer can save or share their copy. This implementation does not expose the underlying Blob URL and does not claim to prevent copying after purchase.
- The download endpoint verifies the Razorpay HMAC signature, fetches payment details from Razorpay, checks order ID, ₹509 amount, INR currency and captured status, then streams the private file.
- Keep all credentials in Vercel environment variables. Never add `.env` files or payment secrets to GitHub.
- This initial version does not maintain an order database, send email receipts, or implement refund automation. If a verified payment succeeds but the file download fails, the page asks the customer to contact support and not pay again.
