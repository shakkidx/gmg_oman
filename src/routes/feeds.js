// Product feed for Meta Commerce Manager (Facebook / Instagram shop and catalogue ads).
// GET /feeds/meta.csv — Meta reads it on a schedule, so prices, offers and stock stay in step
// with the website. Prices are what the customer pays (VAT included); a running or upcoming
// offer is sent as sale_price with its start/end time, so Meta switches prices automatically.

const { getDatabase } = require('../config/database');
const OfferService = require('../services/offerService');
const { maxOrderQty, getSetting } = require('../services/inventoryService');

const SITE = (process.env.PUBLIC_URL || 'https://gmgoman.com').replace(/\/$/, '');
const csv = v => { const s = String(v == null ? '' : v).replace(/\r?\n+/g, ' ').trim(); return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const omr = b => `${(Math.round(b) / 1000).toFixed(3)} OMR`;
const stripHtml = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const abs = u => (!u ? '' : /^https?:/.test(u) ? u : SITE + (u.startsWith('/') ? u : '/' + u));
// "2026-11-20T00:00:00+04:00" -> "2026-11-20T00:00+04:00" (Meta's ISO-8601 range format)
const isoMin = s => String(s).replace(/:\d{2}(?=[+-]\d{2}:\d{2}$|Z$)/, '');

const GOOGLE_CATEGORY = { chargers: 'Electronics > Electronics Accessories > Power > Power Adapters & Chargers', 'power-banks': 'Electronics > Electronics Accessories > Power > Power Banks', cables: 'Electronics > Electronics Accessories > Cables', 'car-chargers': 'Electronics > Electronics Accessories > Power > Power Adapters & Chargers' };

function build() {
  const db = getDatabase();
  const vatRate = parseFloat(getSetting('vat_rate', '0.05')) || 0;
  const vatInclusive = getSetting('vat_inclusive', 'false') === 'true';
  const cap = parseInt(getSetting('max_qty_per_order', '10'), 10) || 10;
  const at = OfferService.now();
  // Offer prices from the running offer, or the next one (sent ahead with its dates)
  const offers = db.prepare(`SELECT o.*, i.product_id, i.offer_price_baisa FROM offers o JOIN offer_items i ON i.offer_id = o.id
    WHERE o.is_active = 1 AND o.ends_at >= ? ORDER BY o.starts_at`).all(new Date(at).toISOString());
  const offerOf = {};
  offers.forEach(o => { if (Date.parse(o.ends_at) >= at && !offerOf[o.product_id]) offerOf[o.product_id] = o; });

  const rows = db.prepare(`SELECT p.*, c.slug AS category_slug, c.name_en AS category_name,
      (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) AS image_url,
      (SELECT group_concat(image_url, '|') FROM (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 10 OFFSET 1)) AS more_images
    FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.is_published = 1 ORDER BY p.name_en`).all();

  const head = ['id', 'title', 'description', 'availability', 'condition', 'price', 'sale_price', 'sale_price_effective_date', 'link', 'image_link', 'additional_image_link', 'brand', 'google_product_category', 'product_type', 'inventory'];
  const lines = [head.join(',')];
  for (const p of rows) {
    const normal = OfferService.normalPrice(p);
    const shown = vatInclusive ? normal : Math.round(normal * (1 + vatRate)); // what the customer pays
    const o = offerOf[p.id];
    const sale = o && o.offer_price_baisa < shown ? o.offer_price_baisa : null;
    const qty = Math.min(maxOrderQty(p.stock_quantity), Math.max(cap, p.stock_quantity || 0));
    lines.push([
      p.sku,
      (p.name_en || '').slice(0, 200),
      (stripHtml(p.description_en) || stripHtml(p.short_desc_en) || p.name_en).slice(0, 5000),
      qty > 0 ? 'in stock' : 'out of stock',
      'new',
      omr(shown),
      sale ? omr(sale) : '',
      sale ? `${isoMin(o.starts_at)}/${isoMin(o.ends_at)}` : '',
      `${SITE}/product/${p.slug}`,
      abs(p.image_url),
      (p.more_images || '').split('|').filter(Boolean).map(abs).join(','),
      p.brand || 'MEVRIO',
      GOOGLE_CATEGORY[p.category_slug] || 'Electronics > Electronics Accessories',
      p.category_name || '',
      Math.max(0, p.stock_quantity || 0)
    ].map(csv).join(','));
  }
  return lines.join('\n') + '\n';
}

module.exports = (req, res) => {
  try {
    const body = build();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=900');
    res.end(body);
  } catch (err) {
    console.error('Feed error:', err.message);
    res.status(500).setHeader('Content-Type', 'text/plain');
    res.end('feed error');
  }
};
module.exports.build = build;
