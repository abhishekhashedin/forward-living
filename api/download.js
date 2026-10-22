import { get } from '@vercel/blob';
import { Readable } from 'node:stream';
import { PRODUCT, requireUser, supabaseAdmin, json, methodNotAllowed } from './_lib/server.js';

export default async function handler(req, res) {
  if (methodNotAllowed(req, res, 'GET')) return;
  try {
    const user = await requireUser(req);
    if (req.query.productId !== PRODUCT.id) return json(res, 400, { error: 'Unknown product.' });

    const admin = supabaseAdmin();
    const { data: purchase, error } = await admin.from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', PRODUCT.id)
      .maybeSingle();

    if (error) throw new Error('Could not verify purchase.');
    if (!purchase) return json(res, 403, { error: 'This PDF is locked. Complete your purchase first.' });

    const blob = await get(PRODUCT.blobPathname, { access: 'private' });
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return json(res, 404, { error: 'The PDF could not be found. Please contact support.' });
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${PRODUCT.filename}"`);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    Readable.fromWeb(blob.stream).on('error', () => {
      if (!res.headersSent) res.statusCode = 500;
      res.end();
    }).pipe(res);
  } catch (error) {
    if (!res.headersSent) json(res, error.status || 500, { error: error.message || 'Download failed.' });
    else res.end();
  }
}
