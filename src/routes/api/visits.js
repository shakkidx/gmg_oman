// Public endpoints: page-view counter and the lead form.
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../../config/database');

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|lighthouse|headless|python|curl|wget|monitor|uptime/i;
const omanDay = (d = new Date()) => new Date(d.getTime() + 4 * 3600e3).toISOString().slice(0, 10);

/** Where the visitor came from: UTM tag / click id first, then the referring site. */
function sourceOf(ref, utm, click) {
  const u = String(utm || '').toLowerCase();
  const r = String(ref || '').toLowerCase();
  const names = ['instagram', 'facebook', 'google', 'whatsapp', 'tiktok', 'snapchat', 'twitter', 'youtube', 'bing'];
  for (const n of names) if (u.includes(n)) return n;
  if (u === 'ig') return 'instagram';
  if (u === 'fb') return 'facebook';
  if (click === 'fbclid') return r.includes('instagram') ? 'instagram' : 'facebook';
  if (click === 'gclid') return 'google';
  if (!r) return 'direct';
  let host = ''; try { host = new URL(r).hostname.replace(/^www\./, ''); } catch (e) { return 'direct'; }
  if (/gmgoman\.com$|globalmarketsgateway/.test(host)) return 'direct';
  if (/instagram/.test(host)) return 'instagram';
  if (/facebook|fb\.com|fb\.me|messenger/.test(host)) return 'facebook';
  if (/google\./.test(host)) return 'google';
  if (/whatsapp|wa\.me/.test(host)) return 'whatsapp';
  if (/tiktok/.test(host)) return 'tiktok';
  if (/snapchat/.test(host)) return 'snapchat';
  if (/t\.co$|twitter|x\.com/.test(host)) return 'twitter';
  if (/youtube/.test(host)) return 'youtube';
  if (/bing\./.test(host)) return 'bing';
  return host.slice(0, 60);
}

let lastPrune = 0;
router.post('/track', (req, res) => {
  res.status(204).end();
  try {
    const ua = String(req.get('user-agent') || '');
    if (BOT.test(ua)) return;
    const b = req.body || {};
    const vid = String(b.vid || '');
    if (!/^[a-z0-9]{8,40}$/i.test(vid)) return;
    const path = String(b.path || '/').split('?')[0].slice(0, 200);
    if (path.startsWith('/admin')) return;
    const db = getDatabase();
    db.prepare('INSERT INTO page_views (day, visitor_id, path, source, device, lang) VALUES (?, ?, ?, ?, ?, ?)')
      .run(omanDay(), vid, path, sourceOf(b.ref, b.utm, b.click), /mobile|android|iphone/i.test(ua) ? 'mobile' : 'desktop', b.lang === 'ar' ? 'ar' : 'en');
    if (Date.now() - lastPrune > 864e5) { lastPrune = Date.now(); db.prepare("DELETE FROM page_views WHERE day < date('now', '-400 days')").run(); }
  } catch (e) { /* counting must never break the site */ }
});

router.post('/lead', (req, res) => {
  try {
    const b = req.body || {};
    const digits = String(b.phone || '').replace(/\D/g, '').replace(/^968/, '');
    if (!/^[279]\d{7}$/.test(digits)) return res.status(400).json({ success: false, error: b.lang === 'ar' ? 'أدخل رقم هاتف عُماني من ٨ أرقام.' : 'Enter an 8-digit Omani mobile number.' });
    if (b.website) return res.json({ success: true }); // hidden field filled = spam bot
    const db = getDatabase();
    const phone = '+968' + digits;
    const recent = db.prepare("SELECT id FROM leads WHERE phone = ? AND created_at > datetime('now', '-10 minutes')").get(phone);
    const id = recent ? recent.id : uuidv4();
    const vals = [String(b.name || '').trim().slice(0, 100) || null, String(b.interest || '').slice(0, 60) || null, String(b.message || '').trim().slice(0, 500) || null];
    if (recent) db.prepare('UPDATE leads SET name = COALESCE(?, name), interest = COALESCE(?, interest), message = COALESCE(?, message), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(...vals, id);
    else db.prepare('INSERT INTO leads (id, name, phone, interest, message, page, source, lang) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, vals[0], phone, vals[1], vals[2], String(b.page || '').slice(0, 200), sourceOf(b.ref, b.utm, b.click), b.lang === 'ar' ? 'ar' : 'en');
    if (!recent) require('../../services/webPush').notifyAll({ title: '📩 New lead', body: `${vals[0] || 'Customer'} · ${phone}${vals[1] ? ' · ' + vals[1] : ''}`, url: '/admin/#/leads', tag: 'lead-' + id }).catch(() => {});
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
module.exports.sourceOf = sourceOf;
module.exports.omanDay = omanDay;
