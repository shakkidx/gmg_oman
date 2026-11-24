// Admin: website visitors (analytics) and leads.
const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../../config/database');
const { requireAdmin } = require('../../../middleware/auth');
const { omanDay } = require('../visits');

router.get('/analytics', requireAdmin, (req, res) => {
  try {
    const db = getDatabase();
    const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
    const today = omanDay();
    const from = omanDay(new Date(Date.now() - (days - 1) * 864e5));
    const yest = omanDay(new Date(Date.now() - 864e5));
    const one = (sql, ...p) => db.prepare(sql).get(...p);
    const sum = (a, b) => one(`SELECT COUNT(DISTINCT visitor_id) AS visitors, COUNT(*) AS views FROM page_views WHERE day BETWEEN ? AND ?`, a, b);
    const period = sum(from, today);
    const orders = one(`SELECT COUNT(*) AS n FROM orders WHERE date(created_at, '+4 hours') BETWEEN ? AND ? AND fulfillment_status NOT IN ('cancelled','refunded') AND (payment_method = 'cod' OR payment_status = 'paid') AND order_number NOT LIKE 'THW-TEST%'`, from, today).n;
    const leads = one(`SELECT COUNT(*) AS n FROM leads WHERE date(created_at, '+4 hours') BETWEEN ? AND ?`, from, today).n;
    const daily = db.prepare(`SELECT day, COUNT(DISTINCT visitor_id) AS visitors, COUNT(*) AS views FROM page_views WHERE day BETWEEN ? AND ? GROUP BY day ORDER BY day`).all(from, today);
    const filled = []; for (let i = days - 1; i >= 0; i--) { const d = omanDay(new Date(Date.now() - i * 864e5)); const r = daily.find(x => x.day === d); filled.push({ day: d, visitors: r ? r.visitors : 0, views: r ? r.views : 0 }); }
    res.json({ success: true, data: {
      days,
      today: sum(today, today), yesterday: sum(yest, yest), period,
      online_now: one(`SELECT COUNT(DISTINCT visitor_id) AS n FROM page_views WHERE created_at > datetime('now', '-5 minutes')`).n,
      orders, leads,
      conversion: period.visitors ? Math.round(orders / period.visitors * 1000) / 10 : 0,
      daily: filled,
      sources: db.prepare(`SELECT source, COUNT(DISTINCT visitor_id) AS visitors FROM page_views WHERE day BETWEEN ? AND ? GROUP BY source ORDER BY visitors DESC LIMIT 10`).all(from, today),
      pages: db.prepare(`SELECT path, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors FROM page_views WHERE day BETWEEN ? AND ? GROUP BY path ORDER BY views DESC LIMIT 12`).all(from, today),
      devices: db.prepare(`SELECT device, COUNT(DISTINCT visitor_id) AS visitors FROM page_views WHERE day BETWEEN ? AND ? GROUP BY device`).all(from, today),
      langs: db.prepare(`SELECT lang, COUNT(DISTINCT visitor_id) AS visitors FROM page_views WHERE day BETWEEN ? AND ? GROUP BY lang`).all(from, today)
    } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/leads', requireAdmin, (req, res) => {
  try {
    const db = getDatabase();
    const st = ['new', 'contacted', 'won', 'lost'].includes(req.query.status) ? req.query.status : null;
    const rows = db.prepare(`SELECT * FROM leads ${st ? 'WHERE status = ?' : ''} ORDER BY created_at DESC LIMIT 300`).all(...(st ? [st] : []));
    const counts = Object.fromEntries(db.prepare('SELECT status, COUNT(*) AS n FROM leads GROUP BY status').all().map(r => [r.status, r.n]));
    res.json({ success: true, data: rows, counts });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.patch('/leads/:id', requireAdmin, (req, res) => {
  const s = req.body && req.body.status;
  if (!['new', 'contacted', 'won', 'lost'].includes(s)) return res.status(400).json({ success: false, error: 'Invalid status' });
  const r = getDatabase().prepare('UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(s, req.params.id);
  res.json({ success: true, changed: r.changes });
});

module.exports = router;
