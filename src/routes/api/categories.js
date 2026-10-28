// Public Categories Router

const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../config/database');

router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { lang = 'en' } = req.query;

    const categories = db.prepare(`
      SELECT 
        c.id, c.slug, c.name_en, c.name_ar,
        c.description_en, c.description_ar,
        c.image_url, c.sort_order,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_published = 1
      WHERE c.is_active = 1
      GROUP BY c.id
      HAVING COUNT(p.id) > 0 OR ? = '1'
      ORDER BY c.sort_order ASC
    `).all(req.query.all === '1' ? '1' : '0');

    const formatted = categories.map(c => ({
      id: c.id,
      slug: c.slug,
      name: (lang === 'ar' && c.name_ar) || c.name_en,
      name_en: c.name_en,
      name_ar: c.name_ar,
      description: (lang === 'ar' && c.description_ar) || c.description_en,
      image_url: c.image_url,
      product_count: c.product_count
    }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
