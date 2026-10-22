import { PRODUCT, requireUser, supabaseAdmin, json, methodNotAllowed } from './_lib/server.js';

export default async function handler(req, res) {
  if (methodNotAllowed(req, res, 'GET')) return;
  try {
    const user = await requireUser(req);
    const productId = req.query.productId;
    if (productId !== PRODUCT.id) return json(res, 400, { error: 'Unknown product.' });
    const admin = supabaseAdmin();
    const { data, error } = await admin.from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', PRODUCT.id)
      .maybeSingle();
    if (error) throw new Error('Could not check your purchases.');
    return json(res, 200, { purchased: !!data });
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || 'Could not check purchase.' });
  }
}
