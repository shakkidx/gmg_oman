// Official Thawani Pay Integration Engine for Oman
// Handles Sandbox (UAT) and Live checkout sessions, Baisa minor-unit handling, session verification, and webhook events

const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../../config/database');

class ThawaniService {
  /**
   * Retrieve Thawani configuration from settings
   */
  static getConfig() {
    const db = getDatabase();
    const rows = db.prepare("SELECT key, value FROM settings WHERE category = 'payment'").all();
    const map = {};
    rows.forEach(r => { map[r.key] = r.value; });

    const isLive = (map.thawani_mode || 'sandbox').toLowerCase() === 'live';

    return {
      active: map.thawani_active === 'true',
      mode: isLive ? 'live' : 'sandbox',
      publicKey: map.thawani_public_key || '',
      secretKey: map.thawani_secret_key || '',
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
        name: (it.name_en || `Product #${idx + 1}`).substring(0, 100),
        unit_amount: unitBaisa, // In Baisa (integer)
        quantity: qty
      });
      lineItemsTotalBaisa += (unitBaisa * qty);
    });

    // Account for delivery charge or discount adjustments
    const differenceBaisa = order.total_baisa - lineItemsTotalBaisa;
    if (differenceBaisa > 0) {
      productsPayload.push({
        name: `Delivery Fee & VAT (${order.delivery_governorate})`,
        unit_amount: differenceBaisa,
        quantity: 1
      });
    } else if (differenceBaisa < 0) {
      // If discount made total less, consolidate to order level
      productsPayload.length = 0;
      productsPayload.push({
        name: `Order #${order.order_number}`,
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
      metadata: {
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        governorate: order.delivery_governorate
      }
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
