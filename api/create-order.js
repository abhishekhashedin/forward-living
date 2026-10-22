import crypto from 'node:crypto';
import { PRODUCT, requireUser, supabaseAdmin, json, methodNotAllowed, razorpayRequest } from './_lib/server.js';

export default async function handler(req, res) {
  if (methodNotAllowed(req, res, 'POST')) return;
  try {
    const user = await requireUser(req);
    const { productId } = req.body || {};
    if (productId !== PRODUCT.id) return json(res, 400, { error: 'Unknown product.' });
    if (!Number.isInteger(PRODUCT.amount) || PRODUCT.amount < 100) {
      return json(res, 500, { error: 'Product price is not configured correctly.' });
    }

    const admin = supabaseAdmin();
    const { data: existing } = await admin
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', PRODUCT.id)
      .maybeSingle();
    if (existing) return json(res, 409, { error: 'You already own this product. Use Download my PDF.' });

    const order = await razorpayRequest('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: PRODUCT.amount,
        currency: PRODUCT.currency,
        receipt: `fl_${crypto.randomUUID().replaceAll('-', '').slice(0, 18)}`,
        notes: { user_id: user.id, product_id: PRODUCT.id }
      })
    });

    const { error } = await admin.from('payment_orders').insert({
      user_id: user.id,
      product_id: PRODUCT.id,
      razorpay_order_id: order.id,
      amount_paise: PRODUCT.amount,
      currency: PRODUCT.currency,
      status: 'created'
    });
    if (error) throw new Error('Could not save the order. Please try again.');

    return json(res, 200, {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      productName: PRODUCT.name
    });
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || 'Could not create checkout.' });
  }
}
