const { translateSpecs } = require('../../services/specTranslations');
// Public Product Catalog Routes
// STRICT PRIVACY: Internal cost prices and supplier margins are NEVER returned in public responses!

const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../config/database');
const PricingService = require('../../services/pricingService');
const { maxOrderQty } = require('../../services/inventoryService');

/**
 * GET /api/products
 * List products with filtering, search, sorting, and pagination
 */
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { category, search, sort = 'featured', featured, page = 1, limit = 20, lang = 'en' } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = ['p.is_published = 1'];
    const params = [];

    if (category) {
      conditions.push('(c.slug = ? OR p.category_id = ?)');
      params.push(category, category);
    }

    if (req.query.available === '1') {
      conditions.push('p.stock_quantity > 0');
    }

    if (featured === 'true' || featured === '1') {
      conditions.push('p.is_featured = 1');
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push('(p.name_en LIKE ? OR p.name_ar LIKE ? OR p.brand LIKE ? OR p.sku LIKE ? OR p.short_desc_en LIKE ?)');
      params.push(q, q, q, q, q);
    }

    let orderBy = 'p.is_featured DESC, p.created_at DESC';
    if (sort === 'price_asc') {
      orderBy = 'COALESCE(p.sale_price_baisa, p.retail_price_baisa) ASC';
    } else if (sort === 'price_desc') {
      orderBy = 'COALESCE(p.sale_price_baisa, p.retail_price_baisa) DESC';
    } else if (sort === 'newest') {
      orderBy = 'p.created_at DESC';
    } else if (sort === 'bestselling') {
      orderBy = 'units_sold DESC, p.is_featured DESC, p.created_at DESC';
    } else if (sort === 'name') {
      orderBy = lang === 'ar' ? 'p.name_ar ASC' : 'p.name_en ASC';
    }

    const whereClause = conditions.join(' AND ');

    // Total count query
    const countRow = db.prepare(`
      SELECT COUNT(*) as total 
      FROM products p 
      JOIN categories c ON p.category_id = c.id 
      WHERE ${whereClause}
    `).get(...params);

    const total = countRow.total;

    // Data query (Strictly omits cost_price_baisa!)
    const query = `
      SELECT 
        p.id, p.category_id, p.sku, p.barcode, p.brand,
        p.name_en, p.name_ar, p.slug,
        p.short_desc_en, p.short_desc_ar,
        p.retail_price_baisa, p.sale_price_baisa,
        p.stock_quantity, p.low_stock_threshold,
        p.is_featured, p.hero_tagline, p.hero_tagline_ar, p.created_at,
        c.name_en as category_name_en, c.name_ar as category_name_ar, c.slug as category_slug,
        (
          SELECT image_url 
          FROM product_images 
          WHERE product_id = p.id 
          ORDER BY is_primary DESC, sort_order ASC 
          LIMIT 1
        ) as primary_image,
        (
          SELECT image_url FROM product_images WHERE product_id = p.id
          ORDER BY is_primary DESC, sort_order ASC LIMIT 1 OFFSET 1
        ) as second_image,
        (
          SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi JOIN orders o ON o.id = oi.order_id
          WHERE oi.product_id = p.id AND o.fulfillment_status != 'cancelled'
        ) as units_sold
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE ${whereClause}
      ORDER BY (p.stock_quantity > 0) DESC, ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const products = db.prepare(query).all(...params, limitNum, offset);

    // Format money and stock badge
    const formattedProducts = products.map(p => {
      const isSale = p.sale_price_baisa && p.sale_price_baisa < p.retail_price_baisa;
      const currentPriceBaisa = isSale ? p.sale_price_baisa : p.retail_price_baisa;

      return {
        id: p.id,
        sku: p.sku,
        barcode: p.barcode,
        brand: p.brand,
        name: (lang === 'ar' && p.name_ar) || p.name_en,
        name_en: p.name_en,
        name_ar: p.name_ar,
        slug: p.slug,
        short_desc: (lang === 'ar' && p.short_desc_ar) || p.short_desc_en,
        category: {
          id: p.category_id,
          slug: p.category_slug,
          name: (lang === 'ar' && p.category_name_ar) || p.category_name_en
        },
        primary_image: p.primary_image || '/images/placeholder-product.svg',
        second_image: p.second_image || null,
        pricing: {
          current_baisa: currentPriceBaisa,
          retail_baisa: p.retail_price_baisa,
          sale_baisa: p.sale_price_baisa,
          is_on_sale: isSale,
          current_formatted: PricingService.formatOmr(currentPriceBaisa, lang),
          retail_formatted: PricingService.formatOmr(p.retail_price_baisa, lang),
          discount_percentage: isSale ? Math.round(((p.retail_price_baisa - p.sale_price_baisa) / p.retail_price_baisa) * 100) : 0
        },
        // Stock numbers stay private: the shop only knows if it can be bought and the cart limit
        available: p.stock_quantity > 0,
        max_qty: maxOrderQty(p.stock_quantity),
        is_featured: Boolean(p.is_featured),
        hero_tagline: (lang === 'ar' ? p.hero_tagline_ar : p.hero_tagline) || null
      };
    });

    res.json({
      success: true,
      data: formattedProducts,
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
 * GET /api/products/:slugOrId
 * Detailed product view with gallery, specifications, and variants
 */
router.get('/:slugOrId', (req, res) => {
  try {
    const db = getDatabase();
    const { slugOrId } = req.params;
    const { lang = 'en' } = req.query;

    const product = db.prepare(`
      SELECT 
        p.id, p.category_id, p.sku, p.barcode, p.brand,
        p.name_en, p.name_ar, p.slug,
        p.short_desc_en, p.short_desc_ar,
        p.full_desc_en, p.full_desc_ar,
        p.specifications,
        p.retail_price_baisa, p.sale_price_baisa,
        p.stock_quantity, p.low_stock_threshold,
        p.is_featured, p.hero_tagline, p.hero_tagline_ar, p.created_at,
        c.name_en as category_name_en, c.name_ar as category_name_ar, c.slug as category_slug
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE (p.slug = ? OR p.id = ?) AND p.is_published = 1
    `).get(slugOrId, slugOrId);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    // Images
    const images = db.prepare(`
      SELECT image_url, alt_text_en, alt_text_ar, is_primary 
      FROM product_images 
      WHERE product_id = ? 
      ORDER BY is_primary DESC, sort_order ASC
    `).all(product.id);

    // Variants
    const variants = db.prepare(`
      SELECT id, sku, title_en, title_ar, option_color, option_spec, price_baisa, stock_quantity 
      FROM product_variants 
      WHERE product_id = ?
    `).all(product.id);

    // Related products in same category
    const related = db.prepare(`
      SELECT p.id, p.sku, p.name_en, p.name_ar, p.slug, p.retail_price_baisa, p.sale_price_baisa, p.stock_quantity,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as primary_image
      FROM products p
      WHERE p.category_id = ? AND p.id != ? AND p.is_published = 1
      ORDER BY p.is_featured DESC, RANDOM()
      LIMIT 4
    `).all(product.category_id, product.id);

    const isSale = product.sale_price_baisa && product.sale_price_baisa < product.retail_price_baisa;
    const currentPriceBaisa = isSale ? product.sale_price_baisa : product.retail_price_baisa;

    let specs = {};
    try {
      specs = JSON.parse(product.specifications || '{}');
    } catch (e) {
      specs = {};
    }

    res.json({
      success: true,
      data: {
        id: product.id,
        sku: product.sku,
        barcode: product.barcode,
        brand: product.brand,
        name: (lang === 'ar' && product.name_ar) || product.name_en,
        name_en: product.name_en,
        name_ar: product.name_ar,
        slug: product.slug,
        short_desc: (lang === 'ar' && product.short_desc_ar) || product.short_desc_en,
        full_desc: (lang === 'ar' && product.full_desc_ar) || product.full_desc_en,
        specifications: lang === 'ar' ? translateSpecs(specs) : specs,
        category: {
          id: product.category_id,
          slug: product.category_slug,
          name: (lang === 'ar' && product.category_name_ar) || product.category_name_en
        },
        pricing: {
          current_baisa: currentPriceBaisa,
          retail_baisa: product.retail_price_baisa,
          sale_baisa: product.sale_price_baisa,
          is_on_sale: isSale,
          current_formatted: PricingService.formatOmr(currentPriceBaisa, lang),
          retail_formatted: PricingService.formatOmr(product.retail_price_baisa, lang),
          discount_percentage: isSale ? Math.round(((product.retail_price_baisa - product.sale_price_baisa) / product.retail_price_baisa) * 100) : 0
        },
        // Stock numbers stay private: the shop only knows if it can be bought and the cart limit
        available: product.stock_quantity > 0,
        max_qty: maxOrderQty(product.stock_quantity),
        images: images.map(img => ({
          url: img.image_url,
          alt: (lang === 'ar' && img.alt_text_ar) || img.alt_text_en,
          is_primary: Boolean(img.is_primary)
        })),
        variants: variants.map(v => ({
          id: v.id,
          sku: v.sku,
          title: (lang === 'ar' && v.title_ar) || v.title_en,
          color: v.option_color,
          price_baisa: v.price_baisa,
          price_formatted: PricingService.formatOmr(v.price_baisa, lang),
          available: v.stock_quantity > 0,
          max_qty: maxOrderQty(v.stock_quantity)
        })),
        related: related.map(r => ({
          id: r.id,
          sku: r.sku,
          name: (lang === 'ar' && r.name_ar) || r.name_en,
          slug: r.slug,
          image: r.primary_image,
          available: r.stock_quantity > 0,
          max_qty: maxOrderQty(r.stock_quantity),
          price_formatted: PricingService.formatOmr(r.sale_price_baisa || r.retail_price_baisa, lang),
          retail_formatted: PricingService.formatOmr(r.retail_price_baisa, lang),
          is_on_sale: Boolean(r.sale_price_baisa && r.sale_price_baisa < r.retail_price_baisa)
        }))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
