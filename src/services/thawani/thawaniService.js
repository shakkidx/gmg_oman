// Official Thawani Pay Integration Engine for Oman
// Handles Sandbox (UAT) and Live checkout sessions, Baisa minor-unit handling, session verification, and webhook events

const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../../config/database');

class ThawaniService {
  // Thawani rejects a session ("Invalid information") when a product name is longer than 40 characters.
  static productName(name) {
    let n = String(name || 'Product').replace(/\s+/g, ' ').trim();
    if (n.length > 40) n = n.replace(/^MEVRIO\s+/i, '');
    if (n.length > 40) n = n.replace(/\s*\([^)]*\)\s*$/, '');
    if (n.length > 40) { n = n.slice(0, 40); const sp = n.lastIndexOf(' '); if (sp > 24) n = n.slice(0, sp); }
    if ((n.match(/\(/g) || []).length > (n.match(/\)/g) || []).length) n = n.slice(0, n.lastIndexOf('('));
    return n.replace(/[\s,(·+-]+$/, '');
  }
  static UAT_SECRET_KEY = 'rRQ26GcsZzoEhbrP2HZvLYDbn9C9et';
  static UAT_PUBLIC_KEY = 'HGvTMLDssJghr9tlN9gr4DVYt0qyBy';

  /**
   * Retrieve Thawani configuration from settings
   */
  /** Live mode is usable only with real live keys (not Thawani's published test keys, not empty). */
  static liveReady(map) {
    const pub = String(map.thawani_public_key || ''), sec = String(map.thawani_secret_key || '');
    return Boolean(pub && sec && pub !== ThawaniService.UAT_PUBLIC_KEY && sec !== ThawaniService.UAT_SECRET_KEY);
  }

  static getConfig() {
    const db = getDatabase();
    const rows = db.prepare("SELECT key, value FROM settings WHERE category = 'payment'").all();
    const map = {};
    rows.forEach(r => { map[r.key] = r.value; });

    const isLive = (map.thawani_mode || 'sandbox').toLowerCase() === 'live';

    return {
      active: map.thawani_active === 'true',
      mode: isLive ? 'live' : 'sandbox',
      // In sandbox, fall back to Thawani's published UAT test keys (from the Thawani integration document)
      publicKey: map.thawani_public_key || (isLive ? '' : ThawaniService.UAT_PUBLIC_KEY),
      secretKey: map.thawani_secret_key || (isLive ? '' : ThawaniService.UAT_SECRET_KEY),
      apiBaseUrl: isLive 
        ? 'https://checkout.thawani.om/api/v1' 
        : 'https://uatcheckout.thawani.om/api/v1',
      checkoutBaseUrl: isLive 
        ? 'https://checkout.thawani.om/pay' 
        : 'https://uatcheckout.thawani.om/pay'
    };
  }

  /**
   * Execute authenticated HTTP request to Thawani API
   */
  static async _request(endpoint, method = 'GET', body = null) {
    const config = this.getConfig();

    if (!config.secretKey) {
      throw new Error('Thawani Secret Key is not configured in settings.');
    }

    const url = `${config.apiBaseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'thawani-api-key': config.secretKey
    };

    const options = {
      method,
      headers
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = json?.description || json?.message || `Thawani API returned HTTP ${res.status}`;
      const err = new Error(msg);
      err.httpStatus = res.status;
      err.details = json;
      throw err;
    }

    return json;
  }

  /**
   * Customer metadata sent with every checkout session (Thawani requires it for verification).
   * Values must be strings; empty fields are left out.
   */
  static customerMetadata(order) {
    const m = {
      'Customer name': order.customer_name,
      'Customer phone': order.customer_phone,
      'Customer email': order.customer_email,
      'order id': order.order_number,
      'Delivery governorate': order.delivery_governorate,
      'Delivery area': order.delivery_area || order.delivery_city
    };
    Object.keys(m).forEach(k => { if (m[k] == null || m[k] === '') delete m[k]; else m[k] = String(m[k]).slice(0, 200); });
    return m;
  }

  /**
   * Create a sandbox (UAT) test session without creating an order — for Thawani's verification.
   * Uses the saved sandbox keys, or Thawani's published UAT keys.
   */
  static async createTestSession({ siteUrl }) {
    const db = getDatabase();
    const map = {};
    db.prepare("SELECT key, value FROM settings WHERE category = 'payment'").all().forEach(r => { map[r.key] = r.value; });
    const live = (map.thawani_mode || 'sandbox') === 'live';
    const secretKey = (!live && map.thawani_secret_key) || ThawaniService.UAT_SECRET_KEY;
    const publicKey = (!live && map.thawani_public_key) || ThawaniService.UAT_PUBLIC_KEY;
    const ref = 'GMG-TEST-' + Date.now().toString().slice(-6);
    const clean = siteUrl.replace(/\/+$/, '');
    const product = db.prepare(`SELECT name_en, COALESCE(sale_price_baisa, retail_price_baisa) AS price FROM products
      WHERE is_published = 1 ORDER BY retail_price_baisa LIMIT 1`).get() || { name_en: 'MEVRIO charger', price: 4900 };
    const payload = {
      client_reference_id: ref,
      mode: 'payment',
      products: [{ name: ThawaniService.productName(product.name_en), unit_amount: product.price, quantity: 1 }],
      success_url: `${clean}/order-confirmation.html?order=${ref}&paid=1`,
      cancel_url: `${clean}/checkout.html?payment=cancelled&order=${ref}`,
      metadata: ThawaniService.customerMetadata({
        customer_name: 'Test Customer', customer_phone: '+968 96907526', customer_email: 'test@gmgoman.com',
        order_number: ref, delivery_governorate: 'Muscat', delivery_area: 'Al Khuwair'
      })
    };
    const res = await fetch('https://uatcheckout.thawani.om/api/v1/checkout/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'thawani-api-key': secretKey }, body: JSON.stringify(payload)
    });
    const json = await res.json().catch(() => ({}));
    db.prepare(`INSERT INTO integration_events (id, service, event_type, reference_id, status, payload, response, error_message)
      VALUES (?, 'thawani', 'test_session', ?, ?, ?, ?, ?)`)
      .run(uuidv4(), ref, res.ok ? 'success' : 'failed', JSON.stringify(payload), JSON.stringify(json), res.ok ? null : (json.description || `HTTP ${res.status}`));
    if (!res.ok || !json?.data?.session_id) {
      const err = new Error(json.description || json.message || `Thawani returned HTTP ${res.status}`);
      err.details = json; throw err;
    }
    return { request: payload, response: json, payUrl: `https://uatcheckout.thawani.om/pay/${json.data.session_id}?key=${encodeURIComponent(publicKey)}` };
  }

  /**
   * Create Checkout Session for an Order
   */
  static async createCheckoutSession({ order, items, siteUrl }) {
    const config = this.getConfig();
    if (!config.active) {
      throw new Error('Thawani Pay gateway is currently disabled.');
    }

    // Build line items formatted with Baisa unit amounts
    const productsPayload = [];
    let lineItemsTotalBaisa = 0;

    items.forEach((it, idx) => {
      const qty = Math.max(1, it.quantity || 1);
      const unitBaisa = it.unit_price_baisa;
      productsPayload.push({
        name: ThawaniService.productName(it.name_en || `Product #${idx + 1}`),
        unit_amount: unitBaisa, // In Baisa (integer)
        quantity: qty
      });
      lineItemsTotalBaisa += (unitBaisa * qty);
    });

    // Account for delivery charge or discount adjustments
    const differenceBaisa = order.total_baisa - lineItemsTotalBaisa;
    if (differenceBaisa > 0) {
      productsPayload.push({
        name: ThawaniService.productName(`Delivery & VAT (${order.delivery_governorate})`),
        unit_amount: differenceBaisa,
        quantity: 1
      });
    } else if (differenceBaisa < 0) {
      // If discount made total less, consolidate to order level
      productsPayload.length = 0;
      productsPayload.push({
        name: ThawaniService.productName(`Order #${order.order_number}`),
        unit_amount: order.total_baisa,
        quantity: 1
      });
    }

    const cleanSiteUrl = siteUrl.replace(/\/+$/, '');
    const successUrl = `${cleanSiteUrl}/order-confirmation.html?order=${encodeURIComponent(order.order_number)}&paid=1`;
    const cancelUrl = `${cleanSiteUrl}/checkout.html?payment=cancelled&order=${encodeURIComponent(order.order_number)}`;

    const sessionPayload = {
      client_reference_id: order.order_number,
      mode: 'payment',
      products: productsPayload,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: ThawaniService.customerMetadata(order)
    };

    let sessionResponse;
    try {
      sessionResponse = await this._request('/checkout/session', 'POST', sessionPayload);
    } catch (err) {
      // Log failure in integration events
      const db = getDatabase();
      db.prepare(`
        INSERT INTO integration_events (
          id, service, event_type, reference_id, status, payload, error_message
        ) VALUES (?, 'thawani', 'create_session', ?, 'failed', ?, ?)
      `).run(uuidv4(), order.order_number, JSON.stringify(sessionPayload), err.message);

      throw err;
    }

    const sessionId = sessionResponse?.data?.session_id;
    if (!sessionId) {
      throw new Error('Thawani response did not contain session_id.');
    }

    // Save session_id to order
    const db = getDatabase();
    db.prepare(`
      UPDATE orders 
      SET thawani_session_id = ?, 
          thawani_raw_response = ?,
          payment_status = 'pending',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(sessionId, JSON.stringify(sessionResponse.data), order.id);

    // Record integration log
    db.prepare(`
      INSERT INTO integration_events (
        id, service, event_type, reference_id, status, payload, response
      ) VALUES (?, 'thawani', 'create_session', ?, 'success', ?, ?)
    `).run(uuidv4(), order.order_number, JSON.stringify(sessionPayload), JSON.stringify(sessionResponse));

    const redirectUrl = `${config.checkoutBaseUrl}/${sessionId}?key=${encodeURIComponent(config.publicKey)}`;

    return {
      success: true,
      sessionId,
      redirectUrl,
      mode: config.mode,
      orderNumber: order.order_number
    };
  }

  /**
   * Verify Session Status from Thawani API
   * IMPORTANT: Never mark an order paid solely because the browser came back to the success URL —
   * the real status is always read from Thawani's API here.
   */
  static async verifySession(sessionId, orderNumber = null) {
    const db = getDatabase();

    // Resolve the order and its stored session id (the success URL may only carry the order number)
    const order = orderNumber
      ? db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber)
      : db.prepare('SELECT * FROM orders WHERE thawani_session_id = ?').get(sessionId);
    if (!order) {
      return { success: false, isPaid: false, error: 'Order not found.' };
    }
    const realSessionId = order.thawani_session_id || (sessionId && !sessionId.includes('{') ? sessionId : null);
    if (!realSessionId) {
      return { success: false, isPaid: false, error: 'No Thawani session is linked to this order.' };
    }
    if (order.payment_status === 'paid') {
      return { success: true, isPaid: true, paymentStatus: 'paid', orderNumber: order.order_number };
    }

    let res;
    try {
      res = await this._request(`/checkout/session/${realSessionId}`, 'GET');
    } catch (err) {
      return { success: false, isPaid: false, error: `Could not verify session with Thawani: ${err.message}` };
    }

    const sessionData = res?.data || {};
    const paymentStatus = (sessionData.payment_status || 'unpaid').toLowerCase(); // 'paid' | 'unpaid' | 'cancelled'
    const invoiceId = sessionData.invoice || sessionData.payment_id || null;

    if (paymentStatus === 'paid') {
      this.markPaid(order, invoiceId, sessionData);
    } else if (paymentStatus === 'cancelled') {
      this.releaseUnpaidOrder(order, 'Customer cancelled the Thawani payment', sessionData);
    }

    return { success: true, isPaid: paymentStatus === 'paid', paymentStatus, invoiceId, orderNumber: order.order_number };
  }

  /** Mark an order paid (idempotent) and hand it to Odoo. */
  static markPaid(order, invoiceId, rawData) {
    const db = getDatabase();
    const changed = db.prepare(`
      UPDATE orders
      SET payment_status = 'paid',
          fulfillment_status = CASE WHEN fulfillment_status = 'pending' THEN 'confirmed' ELSE fulfillment_status END,
          thawani_payment_id = COALESCE(?, thawani_payment_id),
          thawani_raw_response = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND payment_status != 'paid'
    `).run(invoiceId, JSON.stringify(rawData || {}), order.id).changes;

    if (!changed) return;
    db.prepare(`INSERT INTO order_events (id, order_id, event_type, description, created_by) VALUES (?, ?, 'payment_verified', ?, 'thawani_service')`)
      .run(uuidv4(), order.id, `Thawani payment verified as PAID${invoiceId ? ` (Invoice #${invoiceId})` : ''}`);

    // Paid online orders are created in Odoo only now (required lazily to avoid a require cycle)
    const OdooService = require('../odoo/odooService');
    OdooService.syncOrderToOdoo(order.id).catch(err => console.error('Odoo sync after payment failed:', err.message));
    require('../metaCapi').sendPurchase(order.id).catch(err => console.error('Meta CAPI after payment failed:', err.message));
    require('../webPush').notifyNewOrder(order.id);
  }

  /** Cancel an unpaid online order and return its stock. */
  static releaseUnpaidOrder(order, reason, rawData) {
    const db = getDatabase();
    const changed = db.prepare(`
      UPDATE orders
      SET payment_status = 'cancelled', fulfillment_status = 'cancelled',
          thawani_raw_response = COALESCE(?, thawani_raw_response), updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND payment_status != 'paid'
    `).run(rawData ? JSON.stringify(rawData) : null, order.id).changes;
    if (changed) {
      const { restockOrder } = require('../inventoryService');
      restockOrder(order.id, reason, 'thawani_service');
    }
  }

  /**
   * Background job: online orders still unpaid after the timeout are checked once more
   * with Thawani and, if still unpaid, cancelled so their stock returns to the shop.
   */
  static async expireStaleSessions(timeoutMinutes = 45) {
    const db = getDatabase();
    const stale = db.prepare(`
      SELECT * FROM orders
      WHERE payment_method = 'thawani' AND payment_status IN ('pending', 'unpaid')
        AND fulfillment_status != 'cancelled'
        AND created_at <= datetime('now', ?)
      LIMIT 20
    `).all(`-${Math.max(5, timeoutMinutes)} minutes`);

    for (const order of stale) {
      let paid = false;
      if (order.thawani_session_id) {
        const v = await this.verifySession(order.thawani_session_id, order.order_number).catch(() => null);
        if (v && !v.success) continue; // Thawani unreachable — try again next round
        paid = Boolean(v && v.isPaid);
      }
      if (!paid) this.releaseUnpaidOrder(order, `Payment not completed within ${timeoutMinutes} minutes`);
    }
    return stale.length;
  }

  /**
   * Process Webhook from Thawani.
   * The webhook body is only used to find the order; payment status is always re-read from Thawani's API,
   * so a forged webhook cannot mark an order as paid.
   */
  static async processWebhook(payload) {
    const db = getDatabase();
    const data = payload.data || {};
    const sessionId = data.session_id || '';
    const clientRef = data.client_reference_id || (data.metadata && data.metadata.order_number) || '';

    const order = (sessionId && db.prepare('SELECT order_number, thawani_session_id FROM orders WHERE thawani_session_id = ?').get(sessionId))
      || (clientRef && db.prepare('SELECT order_number, thawani_session_id FROM orders WHERE order_number = ?').get(clientRef));

    db.prepare(`
      INSERT INTO integration_events (id, service, event_type, reference_id, status, payload)
      VALUES (?, 'thawani', ?, ?, ?, ?)
    `).run(uuidv4(), payload.event_type || 'webhook', clientRef || sessionId || null, order ? 'success' : 'failed', JSON.stringify(payload));

    if (!order) {
      return { success: false, message: 'No matching order for webhook.' };
    }
    const result = await this.verifySession(order.thawani_session_id, order.order_number);
    return { success: true, isPaid: result.isPaid, paymentStatus: result.paymentStatus, orderNumber: order.order_number };
  }
}

module.exports = ThawaniService;
