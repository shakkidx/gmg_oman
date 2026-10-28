// Admin Product Catalog Management with Private Cost & Margin Intelligence

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../../../config/database');
const { requireAdmin } = require('../../../middleware/auth');
const PricingService = require('../../../services/pricingService');
const AuditService = require('../../../services/auditService');

/** Replace a product's gallery with the given list of image URLs (first = main photo). */
function saveImages(db, productId, images, altText) {
  if (!Array.isArray(images)) return;
  db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
  const ins = db.prepare(`INSERT INTO product_images (id, product_id, image_url, alt_text_en, sort_order, is_primary) VALUES (?, ?, ?, ?, ?, ?)`);
  images.filter(Boolean).forEach((url, i) => ins.run(uuidv4(), productId, url, altText, i, i === 0 ? 1 : 0));
}

/**
 * GET /api/admin/products
 * List all products including cost prices, profit margins, and Odoo mapping
 */
router.get('/', requireAdmin, (req, res) => {
  try {
    const db = getDatabase();
    const { category, search, stock_status, sort = 'created_at', page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    if (category) {
      conditions.push('p.category_id = ?');
      params.push(category);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push('(p.name_en LIKE ? OR p.name_ar LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)');
      params.push(q, q, q, q);
    }

    if (stock_status === 'out') {
      conditions.push('p.stock_quantity = 0');
    } else if (stock_status === 'low') {
      conditions.push('p.stock_quantity <= p.low_stock_threshold AND p.stock_quantity > 0');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM products p ${whereClause}`).get(...params);
    const total = countRow.total;

    const products = db.prepare(`
      SELECT 
        p.*,
        c.name_en as category_name_en, c.name_ar as category_name_ar, c.slug as category_slug,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as primary_image
      FROM products p
      JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset);

    const formatted = products.map(p => {
      const effectivePrice = (p.sale_price_baisa && p.sale_price_baisa < p.retail_price_baisa) ? p.sale_price_baisa : p.retail_price_baisa;
      const profitBaisa = PricingService.calculateGrossProfit(effectivePrice, p.cost_price_baisa);
      const marginPercent = PricingService.calculateGrossMarginPercent(effectivePrice, p.cost_price_baisa);

      return {
        ...p,
        retail_formatted: PricingService.formatOmr(p.retail_price_baisa),
        sale_formatted: p.sale_price_baisa ? PricingService.formatOmr(p.sale_price_baisa) : null,
        cost_formatted: PricingService.formatOmr(p.cost_price_baisa),
        profit_baisa: profitBaisa,
        profit_formatted: PricingService.formatOmr(profitBaisa),
        margin_percent: marginPercent,
        is_low_stock: p.stock_quantity <= p.low_stock_threshold
      };
    });

    res.json({
      success: true,
      data: formatted,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/products
 * Create a new product
 */
router.post('/', requireAdmin, (req, res) => {
  try {
    const {
      categoryId,
      sku,
      barcode,
      brand,
      nameEn,
      nameAr,
      slug,
      shortDescEn,
      shortDescAr,
      fullDescEn,
      fullDescAr,
      specifications,
      retailPriceOmr,
      salePriceOmr,
      costPriceOmr,
      stockQuantity = 0,
      lowStockThreshold = 5,
      isFeatured = false,
      isPublished = true,
      imageUrl,
      images,
      heroTagline,
      heroTaglineAr
    } = req.body;

    if (!sku || !nameEn || !categoryId || retailPriceOmr === undefined || costPriceOmr === undefined) {
      return res.status(400).json({
        success: false,
        error: 'SKU, English Name, Category, Retail Price, and Cost Price are required.'
      });
    }

    const db = getDatabase();

    // Check SKU conflict
    const existing = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku);
    if (existing) {
      return res.status(409).json({ success: false, error: `Product with SKU '${sku}' already exists.` });
    }

    const prodId = uuidv4();
    let finalSlug = slug || nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (db.prepare('SELECT id FROM products WHERE slug = ?').get(finalSlug)) {
      finalSlug = `${finalSlug}-${sku.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    }
    const retailBaisa = PricingService.omrToBaisa(retailPriceOmr);
    const saleBaisa = salePriceOmr ? PricingService.omrToBaisa(salePriceOmr) : null;
    const costBaisa = PricingService.omrToBaisa(costPriceOmr);

    db.prepare(`
      INSERT INTO products (
        id, category_id, sku, barcode, brand, name_en, name_ar, slug,
        short_desc_en, short_desc_ar, full_desc_en, full_desc_ar, specifications,
        retail_price_baisa, sale_price_baisa, cost_price_baisa, stock_quantity,
        low_stock_threshold, is_featured, is_published, hero_tagline, hero_tagline_ar
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `).run(
      prodId, categoryId, sku, barcode || null, brand || 'Global Markets Gateway',
      nameEn, nameAr || nameEn, finalSlug,
      shortDescEn || null, shortDescAr || null, fullDescEn || null, fullDescAr || null,
      typeof specifications === 'string' ? specifications : JSON.stringify(specifications || {}),
      retailBaisa, saleBaisa, costBaisa, parseInt(stockQuantity, 10),
      parseInt(lowStockThreshold, 10), isFeatured ? 1 : 0, isPublished ? 1 : 0, heroTagline || null, heroTaglineAr || null
    );

    saveImages(db, prodId, Array.isArray(images) ? images : (imageUrl ? [imageUrl] : []), nameEn);

    AuditService.log({
      adminUserId: req.adminUser.id,
      action: 'PRODUCT_CREATE',
      entityType: 'product',
      entityId: prodId,
      details: { sku, nameEn, retailBaisa, costBaisa },
      req
    });

    res.status(201).json({
      success: true,
      productId: prodId,
      message: 'Product created successfully.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/admin/products/:id
 * Update an existing product
 */
router.put('/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const {
      categoryId,
      sku,
      barcode,
      brand,
      nameEn,
      nameAr,
      shortDescEn,
      shortDescAr,
      fullDescEn,
      fullDescAr,
      specifications,
      retailPriceOmr,
      salePriceOmr,
      costPriceOmr,
      stockQuantity,
      lowStockThreshold,
      isFeatured,
      isPublished,
      images,
      heroTagline,
      heroTaglineAr
    } = req.body;

    const db = getDatabase();
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    const retailBaisa = retailPriceOmr !== undefined ? PricingService.omrToBaisa(retailPriceOmr) : product.retail_price_baisa;
    const saleBaisa = salePriceOmr !== undefined ? (salePriceOmr ? PricingService.omrToBaisa(salePriceOmr) : null) : product.sale_price_baisa;
    const costBaisa = costPriceOmr !== undefined ? PricingService.omrToBaisa(costPriceOmr) : product.cost_price_baisa;

    db.prepare(`
      UPDATE products SET
        category_id = COALESCE(?, category_id),
        sku = COALESCE(?, sku),
        barcode = COALESCE(?, barcode),
        brand = COALESCE(?, brand),
        name_en = COALESCE(?, name_en),
        name_ar = COALESCE(?, name_ar),
        short_desc_en = COALESCE(?, short_desc_en),
        short_desc_ar = COALESCE(?, short_desc_ar),
        full_desc_en = COALESCE(?, full_desc_en),
        full_desc_ar = COALESCE(?, full_desc_ar),
        specifications = COALESCE(?, specifications),
        retail_price_baisa = ?,
        sale_price_baisa = ?,
        cost_price_baisa = ?,
        stock_quantity = COALESCE(?, stock_quantity),
        low_stock_threshold = COALESCE(?, low_stock_threshold),
        is_featured = COALESCE(?, is_featured),
        is_published = COALESCE(?, is_published),
        hero_tagline = CASE WHEN ? IS NULL THEN hero_tagline ELSE NULLIF(?, '') END,
        hero_tagline_ar = CASE WHEN ? IS NULL THEN hero_tagline_ar ELSE NULLIF(?, '') END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      categoryId, sku, barcode, brand, nameEn, nameAr,
      shortDescEn, shortDescAr, fullDescEn, fullDescAr,
      specifications ? (typeof specifications === 'string' ? specifications : JSON.stringify(specifications)) : null,
      retailBaisa, saleBaisa, costBaisa,
      stockQuantity !== undefined ? parseInt(stockQuantity, 10) : null,
      lowStockThreshold !== undefined ? parseInt(lowStockThreshold, 10) : null,
      isFeatured !== undefined ? (isFeatured ? 1 : 0) : null,
      isPublished !== undefined ? (isPublished ? 1 : 0) : null,
      heroTagline === undefined ? null : String(heroTagline), heroTagline === undefined ? null : String(heroTagline),
      heroTaglineAr === undefined ? null : String(heroTaglineAr), heroTaglineAr === undefined ? null : String(heroTaglineAr),
      id
    );

    saveImages(db, id, images, nameEn || product.name_en);

    AuditService.log({
      adminUserId: req.adminUser.id,
      action: 'PRODUCT_UPDATE',
      entityType: 'product',
      entityId: id,
      details: { sku, retailBaisa, costBaisa, stockQuantity },
      req
    });

    res.json({
      success: true,
      message: 'Product updated successfully.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/products/export/csv
 * Export product catalog to CSV
 */
router.get('/export/csv', requireAdmin, (req, res) => {
  try {
    const db = getDatabase();
    const products = db.prepare(`
      SELECT p.sku, p.barcode, p.brand, p.name_en, p.name_ar, c.name_en as category,
        p.retail_price_baisa, p.sale_price_baisa, p.cost_price_baisa, p.stock_quantity,
        p.is_published, p.is_featured
      FROM products p
      JOIN categories c ON p.category_id = c.id
      ORDER BY p.sku ASC
    `).all();

    let csv = 'SKU,Barcode,Brand,Name (EN),Name (AR),Category,Retail Price (OMR),Sale Price (OMR),Cost Price (OMR),Stock,Published,Featured\n';

    products.forEach(p => {
      const retailOmr = (p.retail_price_baisa / 1000).toFixed(3);
      const saleOmr = p.sale_price_baisa ? (p.sale_price_baisa / 1000).toFixed(3) : '';
      const costOmr = (p.cost_price_baisa / 1000).toFixed(3);

      const row = [
        `"${p.sku}"`,
        `"${p.barcode || ''}"`,
        `"${p.brand}"`,
        `"${p.name_en.replace(/"/g, '""')}"`,
        `"${p.name_ar.replace(/"/g, '""')}"`,
        `"${p.category}"`,
        retailOmr,
        saleOmr,
        costOmr,
        p.stock_quantity,
        p.is_published ? 'Yes' : 'No',
        p.is_featured ? 'Yes' : 'No'
      ].join(',');

      csv += row + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="global_markets_gateway_products.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/products/:id — one product with its photos (for the edit form)
 */
router.get('/:id', requireAdmin, (req, res) => {
  const db = getDatabase();
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ success: false, error: 'Product not found.' });
  p.images = db.prepare('SELECT image_url FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC').all(p.id).map(r => r.image_url);
  p.units_sold = db.prepare(`SELECT COALESCE(SUM(oi.quantity),0) AS q FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_id = ? AND o.fulfillment_status != 'cancelled'`).get(p.id).q;
  res.json({ success: true, data: p });
});

/**
 * DELETE /api/admin/products/:id
 * Products that already appear in orders are hidden (unpublished) instead of deleted, to keep order history intact.
 */
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const db = getDatabase();
    const p = db.prepare('SELECT id, sku, name_en FROM products WHERE id = ?').get(req.params.id);
    if (!p) return res.status(404).json({ success: false, error: 'Product not found.' });
    const used = db.prepare('SELECT COUNT(*) AS c FROM order_items WHERE product_id = ?').get(p.id).c;
    if (used > 0) {
      db.prepare('UPDATE products SET is_published = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(p.id);
    } else {
      db.prepare('DELETE FROM products WHERE id = ?').run(p.id);
    }
    AuditService.log({ adminUserId: req.adminUser.id, action: used ? 'PRODUCT_UNPUBLISH' : 'PRODUCT_DELETE', entityType: 'product', entityId: p.id, details: { sku: p.sku }, req });
    res.json({ success: true, archived: used > 0, message: used ? 'This product has past orders, so it was hidden from the shop instead of deleted.' : 'Product deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
