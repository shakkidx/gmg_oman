// Admin Odoo 19 Community ERP Control Center

const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../../config/database');
const { requireAdmin } = require('../../../middleware/auth');
const OdooService = require('../../../services/odoo/odooService');

/**
 * GET /api/admin/odoo/status
 * Get connection health, active mode, last sync time, and configuration mapping
 */
router.get('/status', requireAdmin, async (req, res) => {
  try {
    const health = await OdooService.checkHealth();
    const db = getDatabase();

    const pendingOrdersCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE odoo_order_status IN ('pending_integration', 'odoo_failed')
        AND fulfillment_status != 'cancelled'
        AND (payment_method = 'cod' OR payment_status = 'paid')
    `).get().count;

    const totalSyncedCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE odoo_order_status IN ('odoo_synced', 'odoo_confirmed')
    `).get().count;

    res.json({
      success: true,
      data: {
        ...health,
        pending_orders: pendingOrdersCount,
        synced_orders: totalSyncedCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/odoo/sync-stock
 * Manually synchronize stock levels for all products
 */
router.post('/sync-stock', requireAdmin, async (req, res) => {
  try {
    const result = await OdooService.syncStock();
    res.json({
      success: true,
      data: result,
      message: `Stock levels updated for ${result.updatedCount} products.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/odoo/retry-pending
 * Process all pending or failed orders in retry queue
 */
router.post('/retry-pending', requireAdmin, async (req, res) => {
  try {
    const results = await OdooService.processPendingRetries(3);
    res.json({
      success: true,
      data: results,
      message: `Processed ${results.length} orders in Odoo retry queue.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/odoo/logs
 * Retrieve integration event logs
 */
router.get('/logs', requireAdmin, (req, res) => {
  try {
    const db = getDatabase();
    const { status, limit = 50 } = req.query;

    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const conditions = ["service = 'odoo'"];
    const params = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    const logs = db.prepare(`
      SELECT id, event_type, reference_id, status, retry_count, error_message, created_at
      FROM integration_events
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT ?
    `).all(...params, limitNum);

    res.json({
      success: true,
      data: logs
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
