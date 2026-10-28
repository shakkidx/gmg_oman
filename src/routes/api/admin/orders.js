// Admin Order Management & Fulfillment Center

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDatabase, runTransaction } = require('../../../config/database');
const { requireAdmin } = require('../../../middleware/auth');
const PricingService = require('../../../services/pricingService');
const OdooService = require('../../../services/odoo/odooService');
const AuditService = require('../../../services/auditService');
const { restockOrder } = require('../../../services/inventoryService');

/**
 * GET /api/admin/orders
 * List orders with advanced filtering
 */
router.get('/', requireAdmin, (req, res) => {
  try {
    const db = getDatabase();
    const { status, payment_status, odoo_status, search, page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    // Simple tabs for the admin panel
    const TABS = {
      to_ship: "o.fulfillment_status IN ('confirmed','processing') AND (o.payment_method = 'cod' OR o.payment_status = 'paid')",
      shipped: "o.fulfillment_status = 'shipped'",
      delivered: "o.fulfillment_status = 'delivered'",
      awaiting_payment: "o.payment_method = 'thawani' AND o.payment_status IN ('pending','unpaid') AND o.fulfillment_status != 'cancelled'",
      cancelled: "o.fulfillment_status IN ('cancelled','refunded')"
    };
    if (req.query.tab && TABS[req.query.tab]) conditions.push(TABS[req.query.tab]);

    if (status) {
      conditions.push('o.fulfillment_status = ?');
      params.push(status);
    }

    if (payment_status) {
      conditions.push('o.payment_status = ?');
      params.push(payment_status);
    }

    if (odoo_status) {
      conditions.push('o.odoo_order_status = ?');
      params.push(odoo_status);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push('(o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ? OR o.customer_email LIKE ?)');
      params.push(q, q, q, q);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM orders o ${whereClause}`).get(...params);
    const total = countRow.total;

    const orders = db.prepare(`
      SELECT 
        o.id, o.order_number, o.customer_name, o.customer_phone, o.customer_email,
        o.delivery_governorate, o.delivery_city,
        o.subtotal_baisa, o.delivery_fee_baisa, o.vat_baisa, o.discount_baisa, o.total_baisa,
        o.payment_method, o.payment_status, o.fulfillment_status,
        o.odoo_order_status, o.odoo_sale_order_name, o.created_at
      FROM orders o
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset);

    const formatted = orders.map(o => ({
      ...o,
      total_formatted: PricingService.formatOmr(o.total_baisa),
      subtotal_formatted: PricingService.formatOmr(o.subtotal_baisa),
      delivery_formatted: PricingService.formatOmr(o.delivery_fee_baisa),
      vat_formatted: PricingService.formatOmr(o.vat_baisa)
    }));

    res.json({
      success: true,
      data: formatted,
      tab_counts: Object.fromEntries(Object.entries(TABS).map(([k, cond]) => [k, db.prepare(`SELECT COUNT(*) AS c FROM orders o WHERE ${cond}`).get().c])),
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
 * GET /api/admin/orders/:id
 * Full order details, line items with cost breakdown, and timeline
 */
router.get('/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const order = db.prepare('SELECT * FROM orders WHERE id = ? OR order_number = ?').get(id, id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    const items = db.prepare(`
      SELECT oi.*, p.name_en, p.name_ar, p.sku,
        (SELECT image_url FROM product_images WHERE product_id = oi.product_id ORDER BY is_primary DESC LIMIT 1) as image_url
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(order.id);

    const events = db.prepare(`
      SELECT * FROM order_events WHERE order_id = ? ORDER BY created_at ASC
    `).all(order.id);

    let totalCostBaisa = 0;
    const formattedItems = items.map(it => {
      totalCostBaisa += (it.cost_price_baisa * it.quantity);
      return {
        ...it,
        unit_price_formatted: PricingService.formatOmr(it.unit_price_baisa),
        cost_price_formatted: PricingService.formatOmr(it.cost_price_baisa),
        line_total_formatted: PricingService.formatOmr(it.total_price_baisa),
        line_profit_formatted: PricingService.formatOmr((it.unit_price_baisa - it.cost_price_baisa) * it.quantity)
      };
    });

    const grossProfitBaisa = order.subtotal_baisa - totalCostBaisa;

    res.json({
      success: true,
      data: {
        ...order,
        total_formatted: PricingService.formatOmr(order.total_baisa),
        subtotal_formatted: PricingService.formatOmr(order.subtotal_baisa),
        delivery_formatted: PricingService.formatOmr(order.delivery_fee_baisa),
        vat_formatted: PricingService.formatOmr(order.vat_baisa),
        discount_formatted: PricingService.formatOmr(order.discount_baisa),
        total_cost_formatted: PricingService.formatOmr(totalCostBaisa),
        gross_profit_formatted: PricingService.formatOmr(grossProfitBaisa),
        items: formattedItems,
        events
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/admin/orders/:id/status
 * Update fulfillment or payment status
 */
router.put('/:id/status', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { fulfillmentStatus, paymentStatus, note } = req.body;

    const db = getDatabase();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    runTransaction(() => {
      if (fulfillmentStatus) {
        db.prepare('UPDATE orders SET fulfillment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(fulfillmentStatus, id);

        db.prepare(`
          INSERT INTO order_events (id, order_id, event_type, description, created_by)
          VALUES (?, ?, 'status_change', ?, ?)
        `).run(
          uuidv4(),
          id,
          `Fulfillment status updated from ${order.fulfillment_status} to ${fulfillmentStatus}${note ? ': ' + note : ''}`,
          req.adminUser.username
        );
      }

      if (paymentStatus) {
        db.prepare('UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(paymentStatus, id);

        db.prepare(`
          INSERT INTO order_events (id, order_id, event_type, description, created_by)
          VALUES (?, ?, 'payment_status_change', ?, ?)
        `).run(
          uuidv4(),
          id,
          `Payment status updated from ${order.payment_status} to ${paymentStatus}`,
          req.adminUser.username
        );
      }
    });

    // Cancelled or refunded orders give their units back to the shop (only once per order)
    if (['cancelled', 'refunded'].includes(fulfillmentStatus) || ['refunded'].includes(paymentStatus)) {
      restockOrder(id, `Order ${fulfillmentStatus || paymentStatus} by ${req.adminUser.username}`, req.adminUser.username);
    }

    AuditService.log({
      adminUserId: req.adminUser.id,
      action: 'ORDER_STATUS_UPDATE',
      entityType: 'order',
      entityId: id,
      details: { orderNumber: order.order_number, fulfillmentStatus, paymentStatus, note },
      req
    });

    res.json({
      success: true,
      message: 'Order status updated successfully.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/orders/:id/sync-odoo
 * Manually trigger Odoo sales order sync for this order
 */
router.post('/:id/sync-odoo', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await OdooService.syncOrderToOdoo(id);

    res.json({
      success: result.success,
      data: result,
      message: result.success 
        ? `Order successfully synced to Odoo Retail as ${result.saleOrderName}` 
        : `Odoo sync failed: ${result.error}`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
