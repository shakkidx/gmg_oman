// Inventory helpers shared by checkout, Thawani, admin and Odoo sync.
// The storefront never shows stock numbers; it only learns whether a product
// can be bought and how many units one customer may put in the cart.

const { v4: uuidv4 } = require('uuid');
const { getDatabase, runTransaction } = require('../config/database');

function getSetting(key, fallback) {
  const row = getDatabase().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row && row.value !== '' ? row.value : fallback;
}

function getSettingsMap(categories) {
  const db = getDatabase();
  const rows = categories
    ? db.prepare(`SELECT key, value FROM settings WHERE category IN (${categories.map(() => '?').join(',')})`).all(...categories)
    : db.prepare('SELECT key, value FROM settings').all();
  const map = {};
  rows.forEach(r => { map[r.key] = r.value; });
  return map;
}

/** How many units of a product a customer may order (0 = sold out). */
function maxOrderQty(stockQuantity) {
  const cap = parseInt(getSetting('max_qty_per_order', '10'), 10) || 10;
  return Math.max(0, Math.min(cap, stockQuantity || 0));
}

/**
 * Put an order's items back into stock (cancelled order / abandoned payment).
 * Safe to call more than once: it records a 'stock_restored' event and skips if one exists.
 */
function restockOrder(orderId, reason, createdBy = 'system') {
  const db = getDatabase();
  let restored = false;
  runTransaction(() => {
    const already = db.prepare("SELECT id FROM order_events WHERE order_id = ? AND event_type = 'stock_restored'").get(orderId);
    if (already) return;
    const items = db.prepare('SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = ?').all(orderId);
    const upProduct = db.prepare('UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const upVariant = db.prepare('UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE id = ?');
    for (const it of items) {
      upProduct.run(it.quantity, it.product_id);
      if (it.variant_id) upVariant.run(it.quantity, it.variant_id);
    }
    db.prepare(`INSERT INTO order_events (id, order_id, event_type, description, created_by) VALUES (?, ?, 'stock_restored', ?, ?)`)
      .run(uuidv4(), orderId, `Stock returned to inventory: ${reason}`, createdBy);
    restored = true;
  });
  return restored;
}

/**
 * Units sold on the website that Odoo does not know about yet
 * (orders not yet created in Odoo, excluding cancelled ones), keyed by SKU.
 * Subtracted from Odoo's free quantity during stock sync so we never oversell.
 */
function unsyncedReservedBySku() {
  const rows = getDatabase().prepare(`
    SELECT oi.sku, SUM(oi.quantity) AS qty
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE o.odoo_order_status IN ('pending_integration', 'odoo_failed')
      AND o.fulfillment_status != 'cancelled'
      AND o.payment_status NOT IN ('cancelled', 'failed', 'refunded')
    GROUP BY oi.sku
  `).all();
  const map = {};
  rows.forEach(r => { map[r.sku] = r.qty; });
  return map;
}

module.exports = { getSetting, getSettingsMap, maxOrderQty, restockOrder, unsyncedReservedBySku };
