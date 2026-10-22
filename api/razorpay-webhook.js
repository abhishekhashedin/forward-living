import crypto from 'node:crypto';
import { PRODUCT, supabaseAdmin, json } from './_lib/server.js';

export const config = { api: { bodyParser: false } };

async function rawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const body = await rawBody(req);
    const received = req.headers['x-razorpay-signature'];
    if (!received || !process.env.RAZORPAY_WEBHOOK_SECRET) {
      return json(res, 400, { error: 'Missing webhook signature configuration.' });
    }

    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body).digest();
    let signature;
    try { signature = Buffer.from(received, 'hex'); } catch { signature = Buffer.alloc(0); }
    if (signature.length !== expected.length || !crypto.timingSafeEqual(signature, expected)) {
      return json(res, 400, { error: 'Invalid webhook signature.' });
    }

    const event = JSON.parse(body.toString('utf8'));
    // Only fulfil a captured, paid order. Other events are acknowledged but do not unlock files.
    if (event.event !== 'order.paid') return json(res, 200, { received: true });

    const orderEntity = event.payload?.order?.entity;
    const payment = event.payload?.payment?.entity;
    const orderId = orderEntity?.id || payment?.order_id;
    if (!orderId || !payment || payment.status !== 'captured') {
      return json(res, 200, { received: true, ignored: true });
    }

    const admin = supabaseAdmin();
    const { data: order, error: orderError } = await admin.from('payment_orders')
      .select('*').eq('razorpay_order_id', orderId).maybeSingle();
    if (orderError) throw new Error('Could not find matching order record.');
    if (!order) return json(res, 200, { received: true, ignored: true });
    if (order.product_id !== PRODUCT.id ||
        order.amount_paise !== PRODUCT.amount ||
        order.currency !== PRODUCT.currency ||
        payment.amount !== PRODUCT.amount ||
        payment.currency !== PRODUCT.currency ||
        payment.order_id !== orderId) {
      return json(res, 400, { error: 'Payment does not match the expected order.' });
    }

    const { error: purchaseError } = await admin.from('purchases').upsert({
      user_id: order.user_id,
      product_id: PRODUCT.id,
      razorpay_order_id: orderId,
      razorpay_payment_id: payment.id,
      amount_paise: PRODUCT.amount,
      currency: PRODUCT.currency
    }, { onConflict: 'user_id,product_id' });
    if (purchaseError) throw new Error('Could not record purchase.');

    await admin.from('payment_orders').update({
      status: 'paid',
      razorpay_payment_id: payment.id,
      verified_at: new Date().toISOString()
    }).eq('razorpay_order_id', orderId);

    return json(res, 200, { received: true, recorded: true });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Webhook processing failed.' });
  }
}
