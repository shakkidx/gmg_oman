// Meta Conversions API: sends one Purchase per confirmed order from the server.
// Uses the same event_id as the browser pixel (the order number), so Meta counts it once.
// Needs META_CAPI_TOKEN in the hosting environment variables. META_PIXEL_ID is optional
// (defaults to the site's pixel). Nothing is sent when the token is missing.

const crypto = require('crypto');
const { getDatabase } = require('../config/database');

const DEFAULT_PIXEL_ID = '1771412000609622';
const GRAPH_VERSION = 'v21.0';

const sha = v => crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex');

function buildEvent(order, items, tracking) {
  const phone = String(order.customer_phone || '').replace(/\D/g, '');
  const user = {
    ph: phone ? [sha(phone.startsWith('968') ? phone : '968' + phone)] : undefined,
    em: order.customer_email ? [sha(order.customer_email)] : undefined,
    fn: order.customer_name ? [sha(String(order.customer_name).split(/\s+/)[0])] : undefined,
    ct: order.delivery_city ? [sha(String(order.delivery_city).replace(/\s+/g, ''))] : undefined,
    country: [sha('om')],
    external_id: [sha(phone || order.order_number)],
    client_ip_address: tracking.ip || undefined,
    client_user_agent: tracking.ua || undefined,
    fbp: tracking.fbp || undefined,
    fbc: tracking.fbc || undefined
  };
  Object.keys(user).forEach(k => user[k] === undefined && delete user[k]);
  return {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    event_id: order.order_number,
    action_source: 'website',
    event_source_url: tracking.url || `${(process.env.APP_URL || 'https://gmgoman.com').replace(/\/+$/, '')}/order-confirmation.html`,
    user_data: user,
    custom_data: {
      currency: 'OMR',
      value: order.total_baisa / 1000,
      order_id: order.order_number,
      content_type: 'product',
      content_ids: items.map(i => i.sku),
      num_items: items.reduce((n, i) => n + i.quantity, 0),
      contents: items.map(i => ({ id: i.sku, quantity: i.quantity, item_price: i.unit_price_baisa / 1000 }))
    }
  };
}

async function sendPurchase(orderId) {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return { skipped: 'no token' };
  const pixelId = process.env.META_PIXEL_ID || DEFAULT_PIXEL_ID;
  const db = getDatabase();
  // Claim the order first so two callers (webhook + success page) can never both send it
  const claim = db.prepare('UPDATE orders SET capi_purchase_sent = 1 WHERE id = ? AND COALESCE(capi_purchase_sent, 0) = 0').run(orderId);
  if (!claim.changes) return { skipped: 'already sent' };
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const items = db.prepare('SELECT sku, quantity, unit_price_baisa FROM order_items WHERE order_id = ?').all(orderId);
  let tracking = {};
  try { tracking = JSON.parse(order.tracking_json || '{}'); } catch (e) { /* ignore */ }
  const body = { data: [buildEvent(order, items, tracking)] };
  if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((json.error && json.error.message) || `HTTP ${res.status}`);
    db.prepare("INSERT INTO order_events (id, order_id, event_type, description, created_by) VALUES (?, ?, 'meta_capi', ?, 'meta_capi')")
      .run(crypto.randomUUID(), orderId, `Purchase sent to Meta (events received: ${json.events_received ?? '?'})`);
    return json;
  } catch (e) {
    db.prepare('UPDATE orders SET capi_purchase_sent = 0 WHERE id = ?').run(orderId); // allow a retry later
    throw e;
  }
}

module.exports = { sendPurchase, buildEvent };
