// Admin category management

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../../../config/database');
const { requireAdmin } = require('../../../middleware/auth');

const slugify = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

router.get('/', requireAdmin, (req, res) => {
  const rows = getDatabase().prepare(`
    SELECT c.*, COUNT(p.id) AS product_count
    FROM categories c LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id ORDER BY c.sort_order, c.name_en
  `).all();
  res.json({ success: true, data: rows });
});

router.post('/', requireAdmin, (req, res) => {
  try {
    const { nameEn, nameAr, descriptionEn, imageUrl, sortOrder = 0, isActive = true } = req.body;
    if (!nameEn) return res.status(400).json({ success: false, error: 'Category name is required.' });
    const id = `cat-${uuidv4().slice(0, 8)}`;
    getDatabase().prepare(`
      INSERT INTO categories (id, slug, name_en, name_ar, description_en, image_url, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, slugify(nameEn) || id, nameEn, nameAr || nameEn, descriptionEn || null, imageUrl || null, parseInt(sortOrder, 10) || 0, isActive ? 1 : 0);
    res.status(201).json({ success: true, id });
  } catch (err) {
    res.status(err.message.includes('UNIQUE') ? 409 : 500).json({ success: false, error: err.message.includes('UNIQUE') ? 'A category with this name already exists.' : err.message });
  }
});

router.put('/:id', requireAdmin, (req, res) => {
  try {
    const { nameEn, nameAr, descriptionEn, imageUrl, sortOrder, isActive } = req.body;
    const db = getDatabase();
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!cat) return res.status(404).json({ success: false, error: 'Category not found.' });
    db.prepare(`
      UPDATE categories SET name_en = ?, name_ar = ?, description_en = ?, image_url = ?, sort_order = ?, is_active = ? WHERE id = ?
    `).run(
      nameEn ?? cat.name_en, nameAr ?? cat.name_ar, descriptionEn ?? cat.description_en, imageUrl ?? cat.image_url,
      sortOrder !== undefined ? parseInt(sortOrder, 10) || 0 : cat.sort_order,
      isActive !== undefined ? (isActive ? 1 : 0) : cat.is_active, cat.id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDatabase();
  const count = db.prepare('SELECT COUNT(*) AS c FROM products WHERE category_id = ?').get(req.params.id).c;
  if (count > 0) return res.status(409).json({ success: false, error: `Move or delete the ${count} product(s) in this category first.` });
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
