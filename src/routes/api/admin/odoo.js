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
    const results = await OdooService.processPendingRetries(1000); // manual button: retry even after the automatic attempts ran out
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
// ---------- Product links: website product ↔ Odoo product (read-only in Odoo) ----------
const norm = s => String(s || '').toLowerCase().replace(/mevrio|ميفريو/g, ' ').replace(/[,\.]/g, '').replace(/(\d)\s+(w|mah|m)\b/g, '$1$2');
const tokens = s => new Set(norm(s).split(/[^a-z0-9]+/).filter(t => t.length > 1));
const numbers = s => (norm(s).match(/\d+(?:mah|w|m)?/g) || []).filter(n => /mah|w$/.test(n));
function score(a, b) {
  const na = numbers(a), nb = numbers(b);
  if (na.some(n => !nb.includes(n)) && nb.length) return 0; // 45W must not match 20W
  const ta = tokens(a), tb = tokens(b);
  let common = 0; ta.forEach(t => { if (tb.has(t)) common++; });
  return common / Math.max(1, Math.min(ta.size, tb.size));
}

router.get('/products', requireAdmin, async (req, res) => {
  try {
    const { adapter, mode } = OdooService.getAdapter();
    if (mode !== 'live' || !adapter.listProducts) return res.json({ success: false, error: 'Turn on the live Odoo connection first.' });
    const odoo = await adapter.listProducts();
    const db = getDatabase();
    const site = db.prepare("SELECT id, sku, name_en, odoo_product_id, is_published FROM products ORDER BY is_published DESC, name_en").all();
    const data = site.map(p => {
      const exact = odoo.find(o => o.default_code && o.default_code === p.sku);
      let best = null, bestScore = 0;
      if (!p.odoo_product_id && !exact) odoo.forEach(o => { const sc = score(p.name_en, o.name); if (sc > bestScore) { bestScore = sc; best = o; } });
      return { ...p, linked_id: p.odoo_product_id || (exact && exact.id) || null, match: p.odoo_product_id ? 'linked' : exact ? 'sku' : (bestScore >= 0.5 ? 'suggested' : 'none'), suggested_id: bestScore >= 0.5 ? best.id : null, score: Math.round(bestScore * 100) };
    });
    res.json({ success: true, data, odoo: odoo.map(o => ({ id: o.id, name: o.name, ref: o.default_code || '', barcode: o.barcode || '', qty: Math.floor(typeof o.free_qty === 'number' ? o.free_qty : (o.qty_available || 0)), price: o.list_price })) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/links', requireAdmin, (req, res) => {
  try {
    const links = (req.body && req.body.links) || {};
    const db = getDatabase();
    const up = db.prepare('UPDATE products SET odoo_product_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    let n = 0;
    db.transaction(() => { for (const [pid, oid] of Object.entries(links)) { const v = oid ? parseInt(oid, 10) : null; if (oid && !(v > 0)) continue; n += up.run(v, pid).changes; } })();
    res.json({ success: true, updated: n });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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
