// Admin → Abandoned checkouts: customers who typed their phone number at checkout but did not
// finish the order. Each row has the cart and a one-click WhatsApp link to follow up.

const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../../config/database');
const { requireAdmin } = require('../../../middleware/auth');

router.get('/', requireAdmin, (req, res) => {
  try {
    const status = ['open', 'contacted', 'converted'].includes(req.query.status) ? req.query.status : null;
    const rows = getDatabase().prepare(`SELECT * FROM abandoned_checkouts ${status ? 'WHERE status = ?' : ''} ORDER BY updated_at DESC LIMIT 300`).all(...(status ? [status] : []))
      .map(r => ({ ...r, items: (() => { try { return JSON.parse(r.items_json || '[]'); } catch (e) { return []; } })() }));
    const counts = Object.fromEntries(getDatabase().prepare('SELECT status, COUNT(*) AS n FROM abandoned_checkouts GROUP BY status').all().map(r => [r.status, r.n]));
    res.json({ success: true, data: rows, counts });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.patch('/:id', requireAdmin, (req, res) => {
  const status = req.body && req.body.status;
  if (!['open', 'contacted'].includes(status)) return res.status(400).json({ success: false, error: 'Invalid status' });
  const r = getDatabase().prepare("UPDATE abandoned_checkouts SET status = ?, updated_at = updated_at WHERE id = ? AND status != 'converted'").run(status, req.params.id);
  res.json({ success: true, changed: r.changes });
});

module.exports = router;
