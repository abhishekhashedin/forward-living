import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

export const PRODUCT = {
  id: 'starter-guide',
  name: 'Beginner\'s Digital Guide',
  amount: Number(process.env.PRODUCT_PRICE_PAISE || 29900),
  currency: 'INR',
  blobPathname: process.env.PRODUCT_BLOB_PATHNAME || 'paid/starter-guide.pdf',
  filename: 'forward-living-guide.pdf'
};

export function supabaseAdmin() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function requireUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) {
    const error = new Error('Please sign in with Google.');
    error.status = 401;
    throw error;
  }
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    const e = new Error('Your session is invalid or expired. Please sign in again.');
    e.status = 401;
    throw e;
  }
  return data.user;
}

export function json(res, status, data) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export function methodNotAllowed(req, res, method) {
  if (req.method !== method) {
    res.setHeader('Allow', method);
    json(res, 405, { error: 'Method not allowed.' });
    return true;
  }
  return false;
}

export function verifyHmac(orderId, paymentId, signature) {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest();
  let received;
  try { received = Buffer.from(signature, 'hex'); } catch { return false; }
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

export async function razorpayRequest(path, options = {}) {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: 'Basic ' + Buffer.from(
        `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
      ).toString('base64'),
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.description || 'Razorpay request failed.');
  }
  return data;
}
