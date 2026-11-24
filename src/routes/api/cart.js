// Cart validation: live stock and server-side prices (offer prices included)

const express = require('express');
const router = express.Router();
const PricingService = require('../../services/pricingService');
const { priceCart } = require('../../services/cartPricing');

/**
 * POST /api/cart/validate
 * Body: { items: [{ sku, quantity, price_baisa? }], lang, governorate? }
 * Returns every line with the price the server will charge, and the cart totals.
 */
router.post('/validate', (req, res) => {
  try {
    const { items = [], lang = 'en', governorate } = req.body || {};
    const r = priceCart(items, { lang, governorate });
    const f = b => PricingService.formatOmr(b, lang);
    const out = r.lines.map(l => ({
      id: l.product_id, sku: l.sku, slug: l.slug, valid: true, is_in_stock: true,
      name: l.name, name_en: l.name_en, name_ar: l.name_ar, image_url: l.image_url,
      unit_price_baisa: l.unit_price_baisa, unit_price_formatted: f(l.unit_price_baisa),
      original_price_baisa: l.original_price_baisa,
      offer: l.offer ? { id: l.offer.id, name: lang === 'ar' ? l.offer.name_ar : l.offer.name_en, ends_at: l.offer.ends_at } : null,
      max_qty: l.max_qty, requested_quantity: l.quantity, allocated_quantity: l.quantity,
      has_sufficient_stock: true,
      line_total_baisa: l.line_total_baisa, line_total_formatted: f(l.line_total_baisa)
    }));
    r.issues.forEach(i => {
      if (i.code === 'QTY_REDUCED') { const o = out.find(x => x.sku === i.sku); if (o) o.has_sufficient_stock = false; return; }
      out.push({ sku: i.sku, valid: false, is_in_stock: false, error: i.code });
    });
    res.json({
      success: true,
      valid: r.issues.length === 0,
      price_changed: r.priceChanged,
      items: out,
      subtotal_baisa: r.totals.subtotalBaisa,
      subtotal_formatted: r.totals.subtotal_formatted,
      totals: r.totals,
      free_delivery: r.freeDelivery
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
