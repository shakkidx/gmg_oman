// Admin → Offers: name, start/end (Oman time), products and the offer price of each.
// Offers are switched off rather than deleted, so past orders keep a record of what they were.

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../../../config/database');
const { requireAdmin } = require('../../../middleware/auth');
const OfferService = require('../../../services/offerService');

// "2026-11-20T00:00" typed in Oman time -> "2026-11-20T00:00:00+04:00"
function omanIso(v, endOfMinute) {
  const s = String(v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)$/.test(s)) return s;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(:\d{2})?$/);
  return m ? `${m[1]}T${m[2]}${m[3] || (endOfMinute ? ':59' : ':00')}+04:00` : null; // an end time of 23:59 lasts the whole minute
}

function list() {
  const db = getDatabase();
  const at = OfferService.now();
  return db.prepare('SELECT * FROM offers ORDER BY starts_at DESC').all().map(o => {
    const items = db.prepare(`SELECT i.product_id, i.offer_price_baisa, i.sort_order, p.sku, p.name_en, p.retail_price_baisa, p.sale_price_baisa, p.stock_quantity,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) AS image_url
      FROM offer_items i JOIN products p ON p.id = i.product_id WHERE i.offer_id = ? ORDER BY i.sort_order, p.name_en`).all(o.id)
      .map(i => ({ ...i, normal_price_baisa: OfferService.normalPrice(i) }));
    const s = Date.parse(o.starts_at), e = Date.parse(o.ends_at);
    const status = !o.is_active ? 'off' : at < s ? 'scheduled' : at > e ? 'ended' : 'live';
    const sold = db.prepare(`SELECT COALESCE(SUM(oi.quantity),0) AS qty, COALESCE(SUM(oi.total_price_baisa),0) AS revenue FROM order_items oi JOIN orders o2 ON o2.id = oi.order_id
      WHERE oi.offer_id = ? AND o2.fulfillment_status NOT IN ('cancelled','refunded')`).get(o.id);
    return { ...o, status, items, sold };
  });
}

router.get('/', requireAdmin, (req, res) => {
  try { res.json({ success: true, data: list(), now: new Date(OfferService.now()).toISOString() }); } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

function save(req, res, id) {
  const b = req.body || {};
  const name = String(b.nameEn || '').trim();
  const starts = omanIso(b.startsAt), ends = omanIso(b.endsAt, true);
  if (!name) return res.status(400).json({ success: false, error: 'Please enter an offer name.' });
  if (!starts || !ends || Date.parse(ends) <= Date.parse(starts)) return res.status(400).json({ success: false, error: 'Please set a start and an end date (end after start).' });
  const items = (Array.isArray(b.items) ? b.items : []).map((it, i) => ({ productId: String(it.productId), price: Math.round(Number(it.priceBaisa)), sort: i }))
    .filter(it => it.productId && it.price > 0);
  if (!items.length) return res.status(400).json({ success: false, error: 'Add at least one product with an offer price.' });
  const db = getDatabase();
  const tx = db.transaction(() => {
    if (id) {
      if (!db.prepare('SELECT id FROM offers WHERE id = ?').get(id)) throw Object.assign(new Error('Offer not found'), { status: 404 });
      db.prepare('UPDATE offers SET name_en = ?, name_ar = ?, starts_at = ?, ends_at = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(name, String(b.nameAr || '').trim() || null, starts, ends, b.isActive === false ? 0 : 1, id);
      db.prepare('DELETE FROM offer_items WHERE offer_id = ?').run(id);
    } else {
      id = 'offer-' + uuidv4();
      db.prepare('INSERT INTO offers (id, name_en, name_ar, starts_at, ends_at, vat_included, is_active) VALUES (?, ?, ?, ?, ?, 1, ?)')
        .run(id, name, String(b.nameAr || '').trim() || null, starts, ends, b.isActive === false ? 0 : 1);
    }
    const ins = db.prepare('INSERT INTO offer_items (id, offer_id, product_id, offer_price_baisa, sort_order) VALUES (?, ?, ?, ?, ?)');
    for (const it of items) {
      if (!db.prepare('SELECT id FROM products WHERE id = ?').get(it.productId)) continue;
      ins.run(uuidv4(), id, it.productId, it.price, it.sort);
    }
  });
  try { tx(); res.json({ success: true, id }); } catch (err) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}
router.post('/', requireAdmin, (req, res) => save(req, res, null));
router.put('/:id', requireAdmin, (req, res) => save(req, res, req.params.id));

module.exports = router;
