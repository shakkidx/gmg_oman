// Admin Store Settings Controller

const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../../config/database');
const { requireAdmin, requireRole } = require('../../../middleware/auth');
const AuditService = require('../../../services/auditService');

/**
 * GET /api/admin/settings
 */
router.get('/', requireAdmin, (req, res) => {
  try {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value, category, description, updated_at FROM settings ORDER BY category, key').all();

    // Group by category
    const categorized = {};
    rows.forEach(r => {
      if (!categorized[r.category]) {
        categorized[r.category] = {};
      }
      // Mask secret keys in response
      let val = r.value;
      if (r.key.includes('secret') || r.key.includes('api_key') || r.key.includes('password')) {
        val = val ? '••••••••••••••••' : '';
      }
      categorized[r.category][r.key] = {
        value: val,
        raw_set: Boolean(r.value),
        description: r.description,
        updated_at: r.updated_at
      };
    });

    res.json({
      success: true,
      data: categorized
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/admin/settings
 * Update settings by key-value dictionary (superadmin/admin only)
 */
router.put('/', requireAdmin, requireRole(['superadmin', 'admin']), (req, res) => {
  try {
    const { settings = {} } = req.body;
    const db = getDatabase();

    const updateStmt = db.prepare(`
      UPDATE settings 
      SET value = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE key = ?
    `);

    let updatedCount = 0;
    const changedKeys = [];

    for (const [key, value] of Object.entries(settings)) {
      // Don't overwrite secret with masked dots
      if (value === '••••••••••••••••') {
        continue;
      }
      const res = updateStmt.run(String(value), key);
      if (res.changes > 0) {
        updatedCount += res.changes;
        changedKeys.push(key);
      }
    }

    AuditService.log({
      adminUserId: req.adminUser.id,
      action: 'SETTINGS_UPDATE',
      entityType: 'settings',
      details: { changedKeys, updatedCount },
      req
    });

    res.json({
      success: true,
      updatedCount,
      message: `Updated ${updatedCount} settings successfully.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
