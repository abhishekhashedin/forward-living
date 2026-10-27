import { createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { Readable } from 'node:stream';
import { get } from '@vercel/blob';

const EXPECTED_AMOUNT = 50900;
const EXPECTED_CURRENCY = 'INR';
const BLOB_PATHNAME = 'forward_living_debt_recovery_guide.pdf';

function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !/^[a-f0-9]{64}$/i.test(a) || !/^[a-f0-9]{64}$/i.test(b)) return false;
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return res.status(503).json({ error: 'Payment verification is not configured.' });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'Private download storage is not configured yet. Please contact support.' });
  }

  const body = req.body || {};
  const orderId = body.razorpay_order_id;
  const paymentId = body.razorpay_payment_id;
  const signature = body.razorpay_signature;
  if (typeof orderId !== 'string' || !/^order_[A-Za-z0-9]+$/.test(orderId) ||
      typeof paymentId !== 'string' || !/^pay_[A-Za-z0-9]+$/.test(paymentId) ||
      typeof signature !== 'string') {
    return res.status(400).json({ error: 'Payment details are incomplete. Please contact support if you were charged.' });
  }

  const expectedSignature = createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  if (!safeEqualHex(signature, expectedSignature)) {
    return res.status(400).json({ error: 'Payment verification failed. No download was issued.' });
  }

  try {
    const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Basic ${credentials}` }
    });
    const payment = await paymentResponse.json();
    if (!paymentResponse.ok || !payment.id) {
      console.error('Razorpay payment lookup failed:', paymentResponse.status, payment?.error?.code || 'unknown');
      return res.status(502).json({ error: 'We could not confirm payment status yet. Please contact support before paying again.' });
    }

    if (payment.order_id !== orderId || payment.amount !== EXPECTED_AMOUNT || payment.currency !== EXPECTED_CURRENCY) {
      return res.status(400).json({ error: 'The payment details do not match this product. Please contact support.' });
    }
    if (payment.status !== 'captured' || payment.captured !== true) {
      return res.status(409).json({ error: 'Your payment is not yet confirmed as captured. Please wait a moment and contact support if this persists. Do not pay again.' });
    }

    const blob = await get(BLOB_PATHNAME, { access: 'private' });
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      console.error('Private ebook blob not found or unreadable:', BLOB_PATHNAME);
      return res.status(503).json({ error: 'Payment was verified, but the ebook is temporarily unavailable. Please contact support with your Razorpay payment ID.' });
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="a-steadier-way-out-of-debt.pdf"');
    if (Number.isFinite(blob.blob.size)) res.setHeader('Content-Length', String(blob.blob.size));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    Readable.fromWeb(blob.stream).pipe(res);
  } catch (error) {
    console.error('Secure ebook delivery error:', error?.message || 'unknown');
    if (!res.headersSent) return res.status(500).json({ error: 'We could not complete your download. Please contact support before paying again.' });
    res.destroy(error);
  }
}
