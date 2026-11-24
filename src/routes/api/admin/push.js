// Admin app notifications: subscribe this phone, unsubscribe, send a test.
const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../../config/database');
const { requireAdmin } = require('../../../middleware/auth');
const WebPush = require('../../../services/webPush');

router.get('/key', requireAdmin, (req, res) => res.json({ success: true, publicKey: WebPush.keys().publicKey }));

router.post('/subscribe', requireAdmin, (req, res) => {
  const s = (req.body && req.body.subscription) || {};
  const k = s.keys || {};
  if (!/^https:\/\//.test(String(s.endpoint || '')) || !k.p256dh || !k.auth) return res.status(400).json({ success: false, error: 'Invalid subscription' });
  getDatabase().prepare(`INSERT INTO admin_push_subscriptions (endpoint, p256dh, auth, admin_username, device) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, admin_username = excluded.admin_username, device = excluded.device`)
    .run(s.endpoint, k.p256dh, k.auth, req.adminUser.username, String(req.get('user-agent') || '').slice(0, 200));
  res.json({ success: true });
});

router.post('/unsubscribe', requireAdmin, (req, res) => {
  getDatabase().prepare('DELETE FROM admin_push_subscriptions WHERE endpoint = ?').run(String((req.body && req.body.endpoint) || ''));
  res.json({ success: true });
});

router.get('/devices', requireAdmin, (req, res) => {
  res.json({ success: true, data: getDatabase().prepare('SELECT admin_username, device, last_status, last_sent_at, created_at FROM admin_push_subscriptions ORDER BY created_at DESC').all() });
});

router.post('/test', requireAdmin, async (req, res) => {
  try {
    const r = await WebPush.notifyAll({ title: '🔔 GMG Admin', body: 'Notifications are working. You will get an alert for every new order.', url: '/admin/#/orders', tag: 'test' });
    res.json({ success: true, sent: r.length, results: r });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
