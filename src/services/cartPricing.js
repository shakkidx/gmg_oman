// Prices a cart on the server. Used by the cart page, checkout and order creation, so the amount a
// customer sees, the amount sent to Thawani and the amount stored for Odoo are always the same.
// Prices sent by the browser are only compared (to tell the customer something changed), never used.

const { getDatabase } = require('../config/database');
const { OMAN_GOVERNORATES } = require('../config/constants');
const PricingService = require('./pricingService');
const OfferService = require('./offerService');
const { maxOrderQty, getSetting } = require('./inventoryService');

function shopSettings() {
  const db = getDatabase();
  const map = {};
  db.prepare("SELECT key, value FROM settings WHERE category IN ('shipping', 'tax')").all().forEach(r => { map[r.key] = r.value; });
  return {
    vatRate: parseFloat(map.vat_rate || '0.05'),
    vatInclusive: map.vat_inclusive === 'true',
    freeThreshold: parseInt(map.free_shipping_threshold_baisa || '25000', 10),
    muscatFee: parseInt(map.muscat_delivery_fee_baisa || '1500', 10),
    otherFee: parseInt(map.other_delivery_fee_baisa || '2500', 10)
  };
}

function findGovernorate(value) {
  if (!value) return null;
  const v = String(value).toLowerCase();
  return OMAN_GOVERNORATES.find(g => g.code === value || g.name_en.toLowerCase() === v || (g.name_ar && g.name_ar === value)) || null;
}

/**
 * items: [{ sku, quantity, price_baisa? }]
 * Returns { lines, issues, priceChanged, totals, freeDelivery }
 * Each line: product fields + unit_price_baisa, original_price_baisa, offer, vat_included, quantity, max_qty.
 */
function priceCart(items, { governorate, lang = 'en', at, couponCode } = {}) {
  const db = getDatabase();
  const st = shopSettings();
  const offerMap = OfferService.activeOfferMap(at || OfferService.now());
  const cap = parseInt(getSetting('max_qty_per_order', '10'), 10) || 10;
  const lines = [], issues = [];
  let priceChanged = false;

  for (const it of (Array.isArray(items) ? items : [])) {
    const sku = String(it.sku || '');
    const product = db.prepare(`SELECT p.*, (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) AS image_url
      FROM products p WHERE p.sku = ?`).get(sku);
    if (!product || !product.is_published) { issues.push({ sku, code: 'UNAVAILABLE' }); continue; }
    const want = Math.max(1, parseInt(it.quantity || it.qty || 1, 10) || 1);
    const max = Math.min(maxOrderQty(product.stock_quantity), cap);
    if (max <= 0) { issues.push({ sku, code: 'SOLD_OUT', name: product.name_en }); continue; }
    const qty = Math.min(want, max);
    if (qty < want) issues.push({ sku, code: 'QTY_REDUCED', name: product.name_en, max });
    const pr = OfferService.priceFor(product, offerMap);
    const clientPrice = parseInt(it.price_baisa, 10);
    if (!isNaN(clientPrice) && clientPrice !== pr.unit) priceChanged = true;
    lines.push({
      product_id: product.id, sku: product.sku, slug: product.slug,
      name_en: product.name_en, name_ar: product.name_ar, name: (lang === 'ar' && product.name_ar) || product.name_en,
      image_url: product.image_url, cost_price_baisa: product.cost_price_baisa,
      unit_price_baisa: pr.unit, original_price_baisa: pr.original,
      offer: pr.offer ? { id: pr.offer.offer_id, name_en: pr.offer.name_en, name_ar: pr.offer.name_ar, ends_at: pr.offer.ends_at } : null,
      vat_included: pr.vat_included, quantity: qty, max_qty: max,
      line_total_baisa: pr.unit * qty
    });
  }

  const gov = findGovernorate(governorate);
  const subtotal = lines.reduce((a, l) => a + l.line_total_baisa, 0);
  const freeDelivery = st.freeThreshold <= 0 || subtotal >= st.freeThreshold;
  const baseFee = gov ? (gov.code === 'MCT' ? st.muscatFee : st.otherFee) : st.muscatFee;
  const deliveryFee = freeDelivery ? 0 : baseFee;
  const discount = (couponCode && String(couponCode).trim().toUpperCase() === 'OMAN2026') ? 2000 : 0;
  const t = OfferService.totals(lines, { deliveryFeeBaisa: deliveryFee, discountBaisa: discount, vatRate: st.vatRate, shopVatInclusive: st.vatInclusive });

  const f = b => PricingService.formatOmr(b, lang);
  return {
    lines, issues, priceChanged, freeDelivery, governorate: gov,
    vatRate: st.vatRate,
    totals: { ...t, subtotal_formatted: f(t.subtotalBaisa), delivery_formatted: freeDelivery ? (lang === 'ar' ? 'مجاناً' : 'Free') : f(t.deliveryFeeBaisa), vat_formatted: f(t.vatBaisa), vat_added_formatted: f(t.vatAddedBaisa), total_formatted: f(t.totalBaisa), discount_formatted: f(t.discountBaisa) }
  };
}

module.exports = { priceCart, shopSettings, findGovernorate };
