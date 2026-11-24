// Web Push for the admin app: a phone that installed the admin (iPhone or Android) gets a
// notification for every new order, even when the app is closed.
// Uses the standard Web Push protocol (VAPID + aes128gcm, RFC 8291/8292) with Node's own crypto,
// so no extra package is needed.
//
// Keys: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY from the environment if set; otherwise a key pair is
// created once and kept in the data folder (gmg-data/vapid.json), never in the code.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../config/database');
const { DATA_DIR } = require('../config/storage');

const b64u = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

let KEYS = null;
function keys() {
  if (KEYS) return KEYS;
  let pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    const file = path.join(DATA_DIR, 'vapid.json');
    try { ({ publicKey: pub, privateKey: priv } = JSON.parse(fs.readFileSync(file, 'utf8'))); } catch (e) {
      const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
      pub = b64u(ecdh.getPublicKey()); priv = b64u(ecdh.getPrivateKey());
      fs.writeFileSync(file, JSON.stringify({ publicKey: pub, privateKey: priv }), { mode: 0o600 });
    }
  }
  const raw = unb64u(pub);
  const key = crypto.createPrivateKey({ key: { kty: 'EC', crv: 'P-256', d: b64u(unb64u(priv)), x: b64u(raw.subarray(1, 33)), y: b64u(raw.subarray(33, 65)) }, format: 'jwk' });
  KEYS = { publicKey: pub, key };
  return KEYS;
}

function vapidHeader(endpoint) {
  const { publicKey, key } = keys();
  const aud = new URL(endpoint).origin;
  const head = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const body = b64u(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: process.env.VAPID_SUBJECT || 'mailto:sales@globalmarketsgateway.om' }));
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${publicKey}`;
}

/** Encrypts a payload for one subscription (RFC 8291, aes128gcm). */
function encrypt(payload, p256dh, auth) {
  const uaPublic = unb64u(p256dh), authSecret = unb64u(auth);
  const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const shared = ecdh.computeSecret(uaPublic);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', shared, authSecret, Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]), 32));
  const salt = crypto.randomBytes(16);
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const enc = Buffer.concat([cipher.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, enc]);
}

async function sendOne(sub, data) {
  const body = encrypt(JSON.stringify(data), sub.p256dh, sub.auth);
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { Authorization: vapidHeader(sub.endpoint), TTL: '86400', Urgency: 'high', 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream' },
    body
  });
  if (res.status === 404 || res.status === 410) getDatabase().prepare('DELETE FROM admin_push_subscriptions WHERE endpoint = ?').run(sub.endpoint);
  else getDatabase().prepare('UPDATE admin_push_subscriptions SET last_status = ?, last_sent_at = CURRENT_TIMESTAMP WHERE endpoint = ?').run(res.status, sub.endpoint);
  return res.status;
}

/** Sends to every subscribed admin phone. data: { title, body, url, tag } */
async function notifyAll(data) {
  const subs = getDatabase().prepare('SELECT * FROM admin_push_subscriptions').all();
  const results = await Promise.allSettled(subs.map(s => sendOne(s, data)));
  return results.map(r => (r.status === 'fulfilled' ? r.value : r.reason && r.reason.message));
}

/** New order alert (COD placed, or Thawani paid). Never throws. */
function notifyNewOrder(orderId) {
  try {
    const o = getDatabase().prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!o) return;
    const n = getDatabase().prepare('SELECT COALESCE(SUM(quantity),0) AS q FROM order_items WHERE order_id = ?').get(orderId).q;
    notifyAll({
      title: `🛒 New order ${o.order_number}`,
      body: `${o.customer_name} · OMR ${(o.total_baisa / 1000).toFixed(3)} · ${n} item${n === 1 ? '' : 's'} · ${o.payment_method === 'cod' ? 'Cash on delivery' : 'Paid by card'} · ${o.delivery_governorate}`,
      url: `/admin/#/orders/${o.id}`,
      tag: 'order-' + o.order_number
    }).catch(err => console.error('Push notify failed:', err.message));
  } catch (err) { console.error('Push notify failed:', err.message); }
}

module.exports = { keys, encrypt, vapidHeader, notifyAll, notifyNewOrder, _b64u: b64u, _unb64u: unb64u };
