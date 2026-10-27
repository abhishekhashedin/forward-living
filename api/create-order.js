import { Buffer } from 'node:buffer';

const PRICE_PAISE = 50900;
const PRODUCT_NAME = 'A Steadier Way Out of Debt — Digital PDF';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return res.status(503).json({ error: 'Secure checkout is not configured yet. Please try again later.' });
  }

  try {
    const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: PRICE_PAISE,
        currency: 'INR',
        receipt: `fl-${Date.now()}`,
        notes: { product: 'forwardliving-debt-guide', product_name: PRODUCT_NAME }
      })
    });
    const data = await response.json();
    if (!response.ok || !data.id) {
      console.error('Razorpay order creation failed:', response.status, data?.error?.code || 'unknown');
      return res.status(502).json({ error: 'Razorpay could not start checkout. Please try again later.' });
    }
    return res.status(200).json({ orderId: data.id, amount: PRICE_PAISE, currency: 'INR', keyId });
  } catch (error) {
    console.error('Razorpay order creation error:', error?.message || 'unknown');
    return res.status(500).json({ error: 'Something went wrong while preparing checkout.' });
  }
}
