// Admin Dashboard & Executive KPI Analytics

const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../../config/database');
const { requireAdmin } = require('../../../middleware/auth');
const PricingService = require('../../../services/pricingService');

router.get('/kpis', requireAdmin, (req, res) => {
  try {
    const db = getDatabase();

    // 1. Total Orders & Revenue (excluding cancelled/refunded)
    const orderStats = db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_baisa), 0) as gross_revenue_baisa,
        COALESCE(SUM(subtotal_baisa), 0) as subtotal_revenue_baisa,
        COALESCE(SUM(vat_baisa), 0) as total_vat_baisa,
        COALESCE(SUM(delivery_fee_baisa), 0) as total_delivery_baisa
      FROM orders
      WHERE fulfillment_status != 'cancelled'
    `).get();

    // 2. Gross Profit Calculation (sum of (unit_price - cost_price) * qty from order_items)
    const profitStats = db.prepare(`
      SELECT 
        COALESCE(SUM((oi.unit_price_baisa - oi.cost_price_baisa) * oi.quantity), 0) as gross_profit_baisa
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.fulfillment_status != 'cancelled'
    `).get();

    const grossRevenueBaisa = orderStats.gross_revenue_baisa;
    const grossProfitBaisa = profitStats.gross_profit_baisa;
    const grossMarginPercent = grossRevenueBaisa > 0 
      ? parseFloat(((grossProfitBaisa / grossRevenueBaisa) * 100).toFixed(2))
      : 0;

    // 3. Status Breakdown
    const statusCounts = db.prepare(`
      SELECT fulfillment_status, COUNT(*) as count 
      FROM orders 
      GROUP BY fulfillment_status
    `).all();

    const paymentCounts = db.prepare(`
      SELECT payment_status, COUNT(*) as count 
      FROM orders 
      GROUP BY payment_status
    `).all();

    // 4. Low Stock Alerts
    const lowStockProducts = db.prepare(`
      SELECT id, sku, name_en, stock_quantity, low_stock_threshold
      FROM products
      WHERE stock_quantity <= low_stock_threshold AND is_published = 1
      ORDER BY stock_quantity ASC
      LIMIT 10
    `).all();

    // 5. Total Products Count
    const productStats = db.prepare(`
      SELECT 
        COUNT(*) as total_products,
        SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
        SUM(CASE WHEN stock_quantity <= low_stock_threshold AND stock_quantity > 0 THEN 1 ELSE 0 END) as low_stock_count
      FROM products
      WHERE is_published = 1
    `).get();

    // 6. Recent Orders (Latest 8)
    const recentOrders = db.prepare(`
      SELECT 
        id, order_number, customer_name, customer_phone, delivery_governorate,
        total_baisa, payment_method, payment_status, fulfillment_status,
        odoo_order_status, odoo_sale_order_name, created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 8
    `).all();

    // 7. Integration Status
    const odooSettings = db.prepare("SELECT key, value FROM settings WHERE key IN ('odoo_mode', 'odoo_sync_health', 'odoo_last_sync_timestamp', 'thawani_mode')").all();
    const intMap = {};
    odooSettings.forEach(r => { intMap[r.key] = r.value; });

    res.json({
      success: true,
      data: {
        financials: {
          gross_revenue_baisa: grossRevenueBaisa,
          gross_revenue_formatted: PricingService.formatOmr(grossRevenueBaisa),
          gross_profit_baisa: grossProfitBaisa,
          gross_profit_formatted: PricingService.formatOmr(grossProfitBaisa),
          gross_margin_percent: grossMarginPercent,
          total_vat_formatted: PricingService.formatOmr(orderStats.total_vat_baisa),
          total_delivery_formatted: PricingService.formatOmr(orderStats.total_delivery_baisa)
        },
        orders: {
          total_count: orderStats.total_orders,
          by_fulfillment: statusCounts.reduce((acc, r) => { acc[r.fulfillment_status] = r.count; return acc; }, {}),
          by_payment: paymentCounts.reduce((acc, r) => { acc[r.payment_status] = r.count; return acc; }, {})
        },
        inventory: {
          total_active_products: productStats.total_products,
          out_of_stock_count: productStats.out_of_stock_count || 0,
          low_stock_count: productStats.low_stock_count || 0,
          low_stock_items: lowStockProducts
        },
        recent_orders: recentOrders.map(o => ({
          ...o,
          total_formatted: PricingService.formatOmr(o.total_baisa)
        })),
        integrations: {
          odoo_mode: intMap.odoo_mode || 'mock',
          odoo_health: intMap.odoo_sync_health || 'healthy',
          odoo_last_sync: intMap.odoo_last_sync_timestamp,
          thawani_mode: intMap.thawani_mode || 'sandbox'
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/dashboard/sales?days=30
 * Sales report: daily revenue, today / this month totals, top products, payment mix.
 * Cancelled orders and unpaid online orders are left out.
 */
router.get('/sales', requireAdmin, (req, res) => {
  try {
    const db = getDatabase();
    const days = Math.min(365, Math.max(7, parseInt(req.query.days || '30', 10)));
    const valid = `o.fulfillment_status != 'cancelled' AND (o.payment_method = 'cod' OR o.payment_status = 'paid')`;
    // Oman time (UTC+4) so "today" matches the shop's day
    const local = `date(o.created_at, '+4 hours')`;

    const daily = db.prepare(`
      SELECT ${local} AS day, COUNT(*) AS orders, COALESCE(SUM(o.total_baisa),0) AS revenue_baisa
      FROM orders o WHERE ${valid} AND ${local} >= date('now', '+4 hours', ?)
      GROUP BY day ORDER BY day
    `).all(`-${days - 1} days`);

    // Fill missing days with zero so the chart has no gaps
    const byDay = Object.fromEntries(daily.map(d => [d.day, d]));
    const trend = [];
    const now = new Date(Date.now() + 4 * 3600 * 1000);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
      trend.push({ day: d, orders: byDay[d]?.orders || 0, revenue_baisa: byDay[d]?.revenue_baisa || 0 });
    }

    const sumFor = (cond, args = []) => db.prepare(`
      SELECT COUNT(*) AS orders, COALESCE(SUM(o.total_baisa),0) AS revenue_baisa FROM orders o WHERE ${valid} AND ${cond}
    `).get(...args);
    const today = sumFor(`${local} = date('now', '+4 hours')`);
    const month = sumFor(`strftime('%Y-%m', o.created_at, '+4 hours') = strftime('%Y-%m', 'now', '+4 hours')`);
    const period = sumFor(`${local} >= date('now', '+4 hours', ?)`, [`-${days - 1} days`]);

    const topProducts = db.prepare(`
      SELECT oi.product_id, oi.sku, oi.name_en, SUM(oi.quantity) AS units, SUM(oi.total_price_baisa) AS revenue_baisa,
        (SELECT image_url FROM product_images WHERE product_id = oi.product_id ORDER BY is_primary DESC LIMIT 1) AS image
      FROM order_items oi JOIN orders o ON o.id = oi.order_id
      WHERE ${valid} AND ${local} >= date('now', '+4 hours', ?)
      GROUP BY oi.product_id ORDER BY units DESC LIMIT 8
    `).all(`-${days - 1} days`);

    const byPayment = db.prepare(`
      SELECT o.payment_method AS method, COUNT(*) AS orders, COALESCE(SUM(o.total_baisa),0) AS revenue_baisa
      FROM orders o WHERE ${valid} AND ${local} >= date('now', '+4 hours', ?) GROUP BY o.payment_method
    `).all(`-${days - 1} days`);

    const awaiting = db.prepare(`SELECT COUNT(*) AS c FROM orders WHERE fulfillment_status IN ('pending','confirmed','processing') AND (payment_method='cod' OR payment_status='paid')`).get().c;

    const f = b => PricingService.formatOmr(b);
    res.json({
      success: true,
      data: {
        days,
        today: { ...today, revenue_formatted: f(today.revenue_baisa) },
        month: { ...month, revenue_formatted: f(month.revenue_baisa) },
        period: { ...period, revenue_formatted: f(period.revenue_baisa), avg_order_formatted: f(period.orders ? Math.round(period.revenue_baisa / period.orders) : 0) },
        orders_to_ship: awaiting,
        trend,
        top_products: topProducts.map(p => ({ ...p, revenue_formatted: f(p.revenue_baisa) })),
        by_payment: byPayment.map(p => ({ ...p, revenue_formatted: f(p.revenue_baisa) }))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
