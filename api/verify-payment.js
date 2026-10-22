import { PRODUCT, requireUser, supabaseAdmin, json, methodNotAllowed, razorpayRequest, verifyHmac } from './_lib/server.js';

export default async function handler(req, res) {
  if (methodNotAllowed(req, res, 'POST')) return;
  try {
    const user = await requireUser(req);
    const { productId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (productId !== PRODUCT.id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json(res, 400, { error: 'Missing or invalid payment details.' });
    }

    const admin = supabaseAdmin();
    const { data: order, error: orderError } = await admin
      .from('payment_orders')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('user_id', user.id)
      .eq('product_id', PRODUCT.id)
      .maybeSingle();

    if (orderError || !order) return json(res, 403, { error: 'This order does not belong to your account.' });
    if (order.amount_paise !== PRODUCT.amount || order.currency !== PRODUCT.currency) {
      return json(res, 400, { error: 'Order amount does not match this product.' });
    }
    if (!verifyHmac(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return json(res, 400, { error: 'Payment signature could not be verified.' });
    }

    // Confirm status and order association directly with Razorpay; do not trust browser success alone.
    const payment = await razorpayRequest(`/payments/${encodeURIComponent(razorpay_payment_id)}`);
    if (payment.order_id !== razorpay_order_id ||
        payment.status !== 'captured' ||
        payment.amount !== PRODUCT.amount ||
        payment.currency !== PRODUCT.currency) {
      return json(res, 409, { error: 'Payment is not yet captured for the expected amount. Please wait and retry.' });
    }

    const { error: purchaseError } = await admin.from('purchases').upsert({
      user_id: user.id,
      product_id: PRODUCT.id,
      razorpay_order_id,
      razorpay_payment_id,
      amount_paise: PRODUCT.amount,
      currency: PRODUCT.currency
    }, { onConflict: 'user_id,product_id' });
    if (purchaseError) throw new Error('Payment was verified, but purchase recording failed. Contact support with payment ID: ' + razorpay_payment_id);

    await admin.from('payment_orders').update({
      status: 'paid',
      razorpay_payment_id,
      verified_at: new Date().toISOString()
    }).eq('razorpay_order_id', razorpay_order_id);

    return json(res, 200, { ok: true, purchased: true });
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || 'Could not verify payment.' });
  }
}
