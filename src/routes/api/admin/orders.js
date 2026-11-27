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
        o.odoo_order_status, o.odoo_sale_order_name, o.created_at, o.order_source,
        json_extract(o.tracking_json, '$.lang') AS lang, o.delivery_address
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
// ---------- Manual order (WhatsApp / phone / walk-in) ----------
// Saved exactly like a website order: server prices (admin may set a different price per
// line, VAT included), stock deducted, then sent to Odoo as a sales order.
router.post('/manual', requireAdmin, (req, res) => {
  const { priceCart, findGovernorate, shopSettings } = require('../../../services/cartPricing');
  const OfferService = require('../../../services/offerService');
  const b = req.body || {};
  const name = String(b.customerName || '').trim();
  const digits = String(b.customerPhone || '').replace(/\D/g, '').replace(/^968/, '');
  const area = String(b.deliveryArea || '').trim();
  const pay = ['cod', 'bank_transfer', 'cash'].includes(b.paymentMethod) ? b.paymentMethod : 'cod';
  const source = ['whatsapp', 'phone', 'walk_in', 'instagram'].includes(b.source) ? b.source : 'whatsapp';
  const gov = findGovernorate(b.governorate);
  if (name.length < 2) return res.status(400).json({ success: false, error: 'Enter the customer name.' });
  if (!/^[279]\d{7}$/.test(digits)) return res.status(400).json({ success: false, error: 'Enter an 8-digit Omani mobile number.' });
  if (!gov) return res.status(400).json({ success: false, error: 'Choose the governorate.' });
  if (area.length < 2) return res.status(400).json({ success: false, error: 'Enter the area / address.' });
  const reqItems = (Array.isArray(b.items) ? b.items : []).map(i => ({ sku: String(i.sku || ''), quantity: Math.max(1, parseInt(i.quantity, 10) || 1), price: i.priceBaisa != null && i.priceBaisa !== '' ? Math.round(Number(i.priceBaisa)) : null })).filter(i => i.sku);
  if (!reqItems.length) return res.status(400).json({ success: false, error: 'Add at least one product.' });
  if (reqItems.some(i => i.price != null && !(i.price >= 0))) return res.status(400).json({ success: false, error: 'Check the prices.' });

  const db = getDatabase();
  const orderId = uuidv4();
  const orderNumber = `GMG-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
  const deliveryFee = Math.max(0, Math.round(Number(b.deliveryFeeBaisa) || 0));
  let totalsOut;
  try {
    runTransaction(() => {
      const priced = priceCart(reqItems.map(i => ({ sku: i.sku, quantity: i.quantity })), { governorate: gov.code, lang: 'en' });
      const problem = priced.issues[0];
      if (problem) {
        const p = db.prepare('SELECT name_en FROM products WHERE sku = ?').get(problem.sku) || {};
        throw new Error(problem.code === 'QTY_REDUCED' ? `Only ${problem.max} × '${p.name_en || problem.sku}' in stock.` : `'${p.name_en || problem.sku}' is not available.`);
      }
      // Admin price (VAT included) replaces the server price where given
      const lines = priced.lines.map(l => {
        const want = reqItems.find(i => i.sku === l.sku);
        return want && want.price != null ? { ...l, unit_price_baisa: want.price, line_total_baisa: want.price * l.quantity, vat_included: true, manual_price: true } : l;
      });
      for (const l of lines) {
        const upd = db.prepare('UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND stock_quantity >= ?').run(l.quantity, l.product_id, l.quantity);
        if (!upd.changes) throw new Error(`'${l.name_en}' is no longer in stock in that quantity.`);
      }
      const shop = shopSettings();
      const t = OfferService.totals(lines, { deliveryFeeBaisa: deliveryFee, discountBaisa: 0, vatRate: shop.vatRate, shopVatInclusive: shop.vatInclusive });
      totalsOut = t;
      db.prepare(`INSERT INTO orders (id, order_number, customer_name, customer_phone, customer_email, delivery_governorate, delivery_city, delivery_address,
          delivery_postal_code, customer_notes, subtotal_baisa, discount_baisa, delivery_fee_baisa, vat_baisa, total_baisa, currency,
          payment_method, payment_status, fulfillment_status, odoo_order_status, order_source)
        VALUES (?, ?, ?, ?, NULL, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 'OMR', ?, ?, 'confirmed', 'pending_integration', ?)`)
        .run(orderId, orderNumber, name, '+968' + digits, gov.name_en, area, area, String(b.notes || '').trim() || null,
          t.subtotalBaisa, t.discountBaisa, t.deliveryFeeBaisa, t.vatBaisa, t.totalBaisa, pay, pay === 'cod' ? 'unpaid' : 'paid', source);
      const ins = db.prepare(`INSERT INTO order_items (id, order_id, product_id, sku, name_en, name_ar, unit_price_baisa, cost_price_baisa, quantity, total_price_baisa,
          offer_id, offer_name, original_price_baisa, vat_included) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const l of lines) ins.run(uuidv4(), orderId, l.product_id, l.sku, l.name_en, l.name_ar, l.unit_price_baisa, l.cost_price_baisa || 0, l.quantity, l.line_total_baisa,
        !l.manual_price && l.offer ? l.offer.id : null, !l.manual_price && l.offer ? l.offer.name_en : null, l.original_price_baisa, l.vat_included ? 1 : 0);
      db.prepare(`INSERT INTO order_events (id, order_id, event_type, description, created_by) VALUES (?, ?, 'order_placed', ?, ?)`)
        .run(uuidv4(), orderId, `Order entered by admin · via ${source} · ${({ cod: 'cash on delivery', bank_transfer: 'bank transfer (paid)', cash: 'cash (paid)' })[pay]}`, req.adminUser.username);
    });
  } catch (err) {
    return res.status(409).json({ success: false, error: err.message });
  }
  AuditService.log({ adminUserId: req.adminUser.id, action: 'ORDER_MANUAL_CREATE', entityType: 'order', entityId: orderId, details: { order_number: orderNumber, total_baisa: totalsOut.totalBaisa }, req });
  OdooService.syncOrderToOdoo(orderId).catch(err => console.error(`Odoo sync error for manual order ${orderNumber}:`, err.message));
  res.json({ success: true, id: orderId, orderNumber, total_baisa: totalsOut.totalBaisa, total_formatted: PricingService.formatOmr(totalsOut.totalBaisa) });
});

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
router.delete('/:id', requireAdmin, (req, res) => {
  // Removes a test / unwanted order for good. Only orders that were never sent to Odoo and
  // never paid can be deleted, so real sales and accounting records stay intact.
  try {
    const db = getDatabase();
    const o = db.prepare('SELECT * FROM orders WHERE id = ? OR order_number = ?').get(req.params.id, req.params.id);
    if (!o) return res.status(404).json({ success: false, error: 'Order not found.' });
    if (o.odoo_sale_order_id || o.odoo_sale_order_name) return res.status(400).json({ success: false, error: `This order is in Odoo (${o.odoo_sale_order_name || o.odoo_sale_order_id}). Cancel it instead.` });
    // A paid order can only be deleted once it is cancelled (e.g. a test payment), and only with explicit confirmation.
    if (o.payment_status === 'paid' && !(o.fulfillment_status === 'cancelled' && req.query.confirmPaid === '1')) {
      return res.status(400).json({ success: false, error: o.fulfillment_status === 'cancelled' ? 'This order was paid. Confirm deleting a paid order.' : 'This order was paid. Cancel or refund it instead of deleting.', needsPaidConfirm: o.fulfillment_status === 'cancelled' });
    }
    if (!['cancelled', 'refunded'].includes(o.fulfillment_status)) restockOrder(o.id, `order ${o.order_number} deleted`, req.adminUser.username);
    runTransaction(() => {
      db.prepare('DELETE FROM order_events WHERE order_id = ?').run(o.id);
      db.prepare('DELETE FROM order_items WHERE order_id = ?').run(o.id);
      db.prepare('DELETE FROM orders WHERE id = ?').run(o.id);
      db.prepare("UPDATE abandoned_checkouts SET status = 'open', order_number = NULL WHERE order_number = ?").run(o.order_number);
    });
    AuditService.log({ adminUserId: req.adminUser.id, action: 'ORDER_DELETE', entityType: 'order', entityId: o.id, details: { order_number: o.order_number, total_baisa: o.total_baisa, customer: o.customer_name }, req });
    res.json({ success: true, deleted: o.order_number });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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
