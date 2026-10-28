// Real-Time Cart Stock & Pricing Validation

const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../config/database');
const PricingService = require('../../services/pricingService');
const { maxOrderQty } = require('../../services/inventoryService');

/**
 * POST /api/cart/validate
 * Validates array of items [{ sku, quantity }] against live stock and prices
 */
router.post('/validate', (req, res) => {
  try {
    const { items = [], lang = 'en' } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.json({
        success: true,
        valid: true,
        items: [],
        subtotal_baisa: 0,
        subtotal_formatted: PricingService.formatOmr(0, lang)
      });
    }

    const db = getDatabase();
    const validatedItems = [];
    let hasIssues = false;
    let subtotalBaisa = 0;

    for (const item of items) {
      const requestedQty = Math.max(1, parseInt(item.quantity || 1, 10));
      
      // Query product and optional variant
      const product = db.prepare(`
        SELECT 
          p.id, p.sku, p.slug, p.name_en, p.name_ar, p.retail_price_baisa, p.sale_price_baisa,
          p.stock_quantity, p.is_published,
          (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as image_url
        FROM products p
        WHERE p.sku = ?
      `).get(item.sku);

      if (!product || !product.is_published) {
        hasIssues = true;
        validatedItems.push({
          sku: item.sku,
          valid: false,
          error: 'PRODUCT_UNAVAILABLE',
          message: lang === 'ar' ? 'المنتج غير متوفر حالياً' : 'Product is no longer available.'
        });
        continue;
      }

      // Check stock (the exact stock number is never sent to the browser)
      const maxQty = maxOrderQty(product.stock_quantity);
      const isAvailable = maxQty >= requestedQty;
      const effectiveQty = isAvailable ? requestedQty : maxQty;

      if (!isAvailable) {
        hasIssues = true;
      }

      const unitPriceBaisa = product.sale_price_baisa && product.sale_price_baisa < product.retail_price_baisa
        ? product.sale_price_baisa
        : product.retail_price_baisa;

      const lineTotalBaisa = unitPriceBaisa * effectiveQty;
      subtotalBaisa += lineTotalBaisa;

      validatedItems.push({
        id: product.id,
        sku: product.sku,
        name: (lang === 'ar' && product.name_ar) || product.name_en,
        name_en: product.name_en,
        name_ar: product.name_ar,
        image_url: product.image_url,
        unit_price_baisa: unitPriceBaisa,
        unit_price_formatted: PricingService.formatOmr(unitPriceBaisa, lang),
        requested_quantity: requestedQty,
        max_qty: maxQty,
        allocated_quantity: effectiveQty,
        line_total_baisa: lineTotalBaisa,
        line_total_formatted: PricingService.formatOmr(lineTotalBaisa, lang),
        slug: product.slug,
        is_in_stock: maxQty > 0,
        has_sufficient_stock: isAvailable
      });
    }

    res.json({
      success: true,
      valid: !hasIssues,
      items: validatedItems,
      subtotal_baisa: subtotalBaisa,
      subtotal_formatted: PricingService.formatOmr(subtotalBaisa, lang)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
