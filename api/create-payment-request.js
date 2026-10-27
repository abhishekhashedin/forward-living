// Vercel serverless function: creates a fixed-price Instamojo Payment Request.
// Set INSTAMOJO_CLIENT_ID, INSTAMOJO_CLIENT_SECRET and SITE_URL in Vercel Project Settings.
// Never put these credentials in browser JavaScript.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.INSTAMOJO_CLIENT_ID;
  const clientSecret = process.env.INSTAMOJO_CLIENT_SECRET;
  const siteUrl = process.env.SITE_URL;
  if (!clientId || !clientSecret || !siteUrl) {
    return res.status(500).json({
      error: 'Checkout is not configured yet. Please try again later.'
    });
  }

  try {
    const tokenBody = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    });
    const tokenResponse = await fetch('https://api.instamojo.com/oauth2/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: tokenBody
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Instamojo token request failed:', tokenResponse.status, tokenData);
      return res.status(502).json({ error: 'Could not connect to the payment provider.' });
    }

    const base = siteUrl.replace(/\/$/, '');
    const requestBody = new URLSearchParams({
      amount: '509',
      purpose: 'A Steadier Way Out of Debt — Digital PDF',
      redirect_url: `${base}/payment-return.html`,
      allow_repeated_payments: 'true',
      send_email: 'false'
    });
    const paymentResponse = await fetch('https://api.instamojo.com/v2/payment_requests/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: requestBody
    });
    const paymentData = await paymentResponse.json();
    const paymentUrl = paymentData.longurl || paymentData.long_url || paymentData.payment_url;
    if (!paymentResponse.ok || !paymentUrl) {
      console.error('Instamojo payment request failed:', paymentResponse.status, paymentData);
      return res.status(502).json({ error: 'Instamojo could not create a payment request. Check your account API access.' });
    }
    return res.status(200).json({ paymentUrl });
  } catch (error) {
    console.error('Checkout setup error:', error);
    return res.status(500).json({ error: 'Something went wrong while preparing checkout.' });
  }
}
