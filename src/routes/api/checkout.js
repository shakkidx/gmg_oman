// Atomic Checkout Router for Oman E-Commerce
// Handles delivery rates, VAT, atomic stock deductions, Odoo retail sales orders, and Thawani sessions

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDatabase, runTransaction } = require('../../config/database');
const { OMAN_GOVERNORATES, ORDER_STATUSES, PAYMENT_STATUSES } = require('../../config/constants');
const PricingService = require('../../services/pricingService');
const OdooService = require('../../services/odoo/odooService');
const ThawaniService = require('../../services/thawani/thawaniService');
const { getSetting } = require('../../services/inventoryService');
const { priceCart, findGovernorate } = require('../../services/cartPricing');
const MetaCapi = require('../../services/metaCapi');

/**
 * GET /api/checkout/config
 * Returns Oman delivery configuration, VAT settings, and enabled payment providers
 */
router.get('/config', (req, res) => {
  try {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });

    const freeShippingThreshold = parseInt(settings.free_shipping_threshold_baisa || '25000', 10);
    const vatRate = parseFloat(settings.vat_rate || '0.05');
    const isVatInclusive = settings.vat_inclusive === 'true';

    const governorates = OMAN_GOVERNORATES.map(g => {
      let fee = g.delivery_fee_baisa;
      if (freeShippingThreshold <= 0) return { ...g, delivery_fee_baisa: 0, delivery_fee_formatted: PricingService.formatOmr(0) };
      if (g.code === 'MCT' && settings.muscat_delivery_fee_baisa) {
        fee = parseInt(settings.muscat_delivery_fee_baisa, 10);
      } else if (g.code !== 'MCT' && settings.other_delivery_fee_baisa) {
        fee = parseInt(settings.other_delivery_fee_baisa, 10);
      }
      return {
        ...g,
        delivery_fee_baisa: fee,
        delivery_fee_formatted: PricingService.formatOmr(fee)
      };
    });

    res.json({
      success: true,
      data: {
        currency: 'OMR',
        decimals: 3,
        vat_rate: vatRate,
        vat_percentage: vatRate * 100,
        vat_inclusive: isVatInclusive,
        free_shipping_threshold_baisa: freeShippingThreshold,
        free_delivery_all: freeShippingThreshold <= 0,
        whatsapp: settings.contact_whatsapp || '',
        free_shipping_threshold_formatted: PricingService.formatOmr(freeShippingThreshold),
        governorates,
        payment_methods: [
          {
            id: 'cod',
            name_en: 'Cash on Delivery (COD)',
            name_ar: 'الدفع عند الاستلام',
            description_en: 'Pay in cash or debit card directly to courier upon delivery anywhere in Oman.',
            description_ar: 'ادفع نقداً أو ببطاقة الخصم مباشرة لمندوب التوصيل عند الاستلام.',
            is_active: settings.cod_active !== 'false'
          },
          {
            id: 'thawani',
            name_en: 'Thawani Pay (Debit / Credit Cards)',
            name_ar: 'بوابة ثواني (بطاقات الخصم والائتمان)',
            description_en: 'Instant, secure online checkout powered by Oman’s trusted Central Bank licensed gateway.',
            description_ar: 'دفع إلكتروني فوري وآمن معتمد من البنك المركزي العماني بواسطة بطاقات فيزا وماستركارد.',
            // Sandbox Thawani is a test page where real cards cannot pay, so customers only see it in live mode.
            // Add ?thawani_test=1 to the checkout URL to test the sandbox.
            is_active: settings.thawani_active !== 'false' && ((settings.thawani_mode || 'sandbox') === 'live' || req.query.thawani_test === '1'),
            mode: settings.thawani_mode || 'sandbox'
          }
        ]
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/checkout/calculate
 * Calculate exact totals given governorate code, items, and coupon
 */
router.post('/calculate', (req, res) => {
  try {
    const { governorateCode, items = [], couponCode, lang = 'en' } = req.body || {};
    const r = priceCart(items, { governorate: governorateCode, lang, couponCode });
    const gov = r.governorate || OMAN_GOVERNORATES[0];
    res.json({
      success: true,
      data: {
        subtotalBaisa: r.totals.subtotalBaisa,
        discountBaisa: r.totals.discountBaisa,
        deliveryFeeBaisa: r.totals.deliveryFeeBaisa,
        vatBaisa: r.totals.vatBaisa,
        vatAddedBaisa: r.totals.vatAddedBaisa,
        vatIncludedBaisa: r.totals.vatIncludedBaisa,
        totalBaisa: r.totals.totalBaisa,
        totalOmrFormatted: r.totals.total_formatted,
        lines: r.lines.map(l => ({ sku: l.sku, name: l.name, quantity: l.quantity, unit_price_baisa: l.unit_price_baisa, original_price_baisa: l.original_price_baisa, offer: l.offer ? (lang === 'ar' ? l.offer.name_ar : l.offer.name_en) : null, line_total_baisa: l.line_total_baisa, max_qty: l.max_qty })),
        issues: r.issues,
        price_changed: r.priceChanged,
        governorate: { code: gov.code, name: (lang === 'ar' && gov.name_ar) || gov.name_en, delivery_days: gov.delivery_days },
        is_free_shipping: r.freeDelivery,
        coupon_applied: r.totals.discountBaisa > 0 ? String(couponCode).toUpperCase() : null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/checkout/abandoned
 * Saves the cart as soon as the customer has typed a valid phone number, so the shop can follow up
 * on WhatsApp if the order is not finished. Body: { id, name, phone, governorate, items, lang, source }
 */
router.post('/abandoned', (req, res) => {
  try {
    const { id, name, phone, governorate, items = [], lang = 'en', source = 'checkout' } = req.body || {};
    const digits = String(phone || '').replace(/\D/g, '').replace(/^968/, '');
    if (!id || !/^[a-zA-Z0-9_-]{8,64}$/.test(String(id)) || !/^[279]\d{7}$/.test(digits)) return res.status(400).json({ success: false, error: 'Invalid' });
    const r = priceCart(items, { governorate, lang });
    if (!r.lines.length) return res.json({ success: true, skipped: true });
    const db = getDatabase();
    const itemsJson = JSON.stringify(r.lines.map(l => ({ sku: l.sku, name: l.name_en, quantity: l.quantity, unit_price_baisa: l.unit_price_baisa, offer: l.offer ? l.offer.name_en : null })));
    const existing = db.prepare('SELECT status FROM abandoned_checkouts WHERE id = ?').get(String(id));
    if (existing && existing.status === 'converted') return res.json({ success: true });
    db.prepare(`INSERT INTO abandoned_checkouts (id, customer_name, customer_phone, governorate, items_json, total_baisa, lang, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET customer_name = excluded.customer_name, customer_phone = excluded.customer_phone,
        governorate = excluded.governorate, items_json = excluded.items_json, total_baisa = excluded.total_baisa,
        lang = excluded.lang, updated_at = CURRENT_TIMESTAMP`)
      .run(String(id), String(name || '').slice(0, 120) || null, '+968' + digits, governorate || null, itemsJson, r.totals.totalBaisa, lang === 'ar' ? 'ar' : 'en', String(source).slice(0, 30));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/checkout/order
 * Creates the order with server-side prices (offer prices included), deducts stock in one transaction,
 * then sends COD orders to Odoo, or opens a Thawani payment session.
 */
router.post('/order', async (req, res) => {
  const b = req.body || {};
  const {
    customerName, customerEmail, deliveryGovernorate, customerNotes,
    paymentMethod = 'cod', items = [], couponCode, idempotencyKey, checkoutId, lang = 'en', thawaniTest
  } = b;
  const deliveryCity = String(b.deliveryCity || b.deliveryArea || '').trim();
  const deliveryAddress = String(b.deliveryAddress || '').trim() || deliveryCity;
  const phoneDigits = String(b.customerPhone || '').replace(/\D/g, '').replace(/^968/, '');
  const ar = lang === 'ar';

  // 1. Validate
  if (!customerName || String(customerName).trim().length < 2 || !deliveryGovernorate || deliveryCity.length < 2) {
    return res.status(400).json({ success: false, error: ar ? 'يرجى إدخال الاسم والمحافظة والمنطقة.' : 'Please enter your name, governorate and area.' });
  }
  if (!/^[279]\d{7}$/.test(phoneDigits)) {
    return res.status(400).json({ success: false, error: ar ? 'يرجى إدخال رقم هاتف عماني من 8 أرقام.' : 'Please enter an 8-digit Omani phone number.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: ar ? 'سلة التسوق فارغة.' : 'Your shopping cart is empty.' });
  }
  if (!['cod', 'thawani'].includes(paymentMethod)) {
    return res.status(400).json({ success: false, error: 'Please choose a payment method.' });
  }
  const methodKey = paymentMethod === 'cod' ? 'cod_active' : 'thawani_active';
  if (getSetting(methodKey, 'true') === 'false' ||
      (paymentMethod === 'thawani' && getSetting('thawani_mode', 'sandbox') !== 'live' && !thawaniTest)) {
    return res.status(400).json({ success: false, error: ar ? 'طريقة الدفع هذه غير متاحة حالياً.' : 'This payment method is currently unavailable.' });
  }
  const gov = findGovernorate(deliveryGovernorate);
  if (!gov) return res.status(400).json({ success: false, error: ar ? 'يرجى اختيار المحافظة.' : 'Please choose your governorate.' });
  const customerPhone = '+968' + phoneDigits;

  const db = getDatabase();

  // 2. Duplicate submission guard
  if (idempotencyKey) {
    const existingOrder = db.prepare('SELECT id, order_number, payment_method, total_baisa FROM orders WHERE idempotency_key = ?').get(idempotencyKey);
    if (existingOrder) {
      return res.json({ success: true, isDuplicate: true, orderId: existingOrder.id, orderNumber: existingOrder.order_number, paymentMethod: existingOrder.payment_method, totalBaisa: existingOrder.total_baisa, totalOmrFormatted: PricingService.formatOmr(existingOrder.total_baisa) });
    }
  }

  const orderId = uuidv4();
  const orderNumber = `GMG-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
  let orderRecord, orderItems = [], priced;

  // 3. Price on the server and deduct stock atomically
  try {
    runTransaction(() => {
      priced = priceCart(items, { governorate: gov.code, lang, couponCode });
      const problem = priced.issues[0];
      if (problem) {
        const p = db.prepare('SELECT name_en, name_ar FROM products WHERE sku = ?').get(problem.sku) || {};
        const nm = (ar && p.name_ar) || p.name_en || problem.sku;
        if (problem.code === 'QTY_REDUCED') throw new Error(ar ? `الكمية المطلوبة من «${nm}» غير متوفرة. الحد الأقصى ${problem.max}.` : `Only ${problem.max} × '${nm}' can be ordered right now. Please reduce the quantity.`);
        throw new Error(ar ? `«${nm}» غير متوفر حالياً. يرجى إزالته من السلة.` : `'${nm}' is not available right now. Please remove it from your cart.`);
      }
      if (!priced.lines.length) throw new Error(ar ? 'سلة التسوق فارغة.' : 'Your shopping cart is empty.');

      for (const l of priced.lines) {
        const upd = db.prepare('UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND stock_quantity >= ?').run(l.quantity, l.product_id, l.quantity);
        if (!upd.changes) throw new Error(ar ? `«${l.name}» لم يعد متوفراً بهذه الكمية.` : `'${l.name_en}' is no longer available in that quantity.`);
      }

      const t = priced.totals;
      const paymentStatus = paymentMethod === 'thawani' ? 'pending' : 'unpaid';
      const fulfillmentStatus = paymentMethod === 'cod' ? 'confirmed' : 'pending';
      const tracking = JSON.stringify({ fbp: b.fbp || null, fbc: b.fbc || null, ua: String(req.get('user-agent') || '').slice(0, 300), ip: req.ip, url: String(b.pageUrl || '').slice(0, 300), lang });

      db.prepare(`
        INSERT INTO orders (
          id, order_number, customer_name, customer_phone, customer_email,
          delivery_governorate, delivery_city, delivery_address, delivery_postal_code, customer_notes,
          subtotal_baisa, discount_baisa, delivery_fee_baisa, vat_baisa, total_baisa,
          currency, payment_method, payment_status, fulfillment_status,
          odoo_order_status, idempotency_key, tracking_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OMR', ?, ?, ?, 'pending_integration', ?, ?)
      `).run(
        orderId, orderNumber, String(customerName).trim(), customerPhone, customerEmail || null,
        gov.name_en, deliveryCity, deliveryAddress, null, customerNotes || null,
        t.subtotalBaisa, t.discountBaisa, t.deliveryFeeBaisa, t.vatBaisa, t.totalBaisa,
        paymentMethod, paymentStatus, fulfillmentStatus, idempotencyKey || null, tracking
      );

      const insertItem = db.prepare(`
        INSERT INTO order_items (id, order_id, product_id, sku, name_en, name_ar, unit_price_baisa, cost_price_baisa, quantity, total_price_baisa,
          offer_id, offer_name, original_price_baisa, vat_included)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const l of priced.lines) {
        insertItem.run(uuidv4(), orderId, l.product_id, l.sku, l.name_en, l.name_ar, l.unit_price_baisa, l.cost_price_baisa || 0, l.quantity, l.line_total_baisa,
          l.offer ? l.offer.id : null, l.offer ? l.offer.name_en : null, l.original_price_baisa, l.vat_included ? 1 : 0);
      }
      const offerNames = [...new Set(priced.lines.filter(l => l.offer).map(l => l.offer.name_en))];
      db.prepare(`INSERT INTO order_events (id, order_id, event_type, description, created_by) VALUES (?, ?, 'order_placed', ?, 'checkout_system')`)
        .run(uuidv4(), orderId, `Order placed via ${paymentMethod.toUpperCase()}${offerNames.length ? ` · ${offerNames.join(', ')}` : ''}`);

      if (checkoutId) {
        db.prepare("UPDATE abandoned_checkouts SET status = 'converted', order_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(orderNumber, String(checkoutId));
      }

      orderRecord = {
        id: orderId, order_number: orderNumber, customer_name: String(customerName).trim(), customer_phone: customerPhone, customer_email: customerEmail,
        delivery_governorate: gov.name_en, delivery_city: deliveryCity, delivery_address: deliveryAddress,
        total_baisa: t.totalBaisa, payment_method: paymentMethod
      };
      orderItems = priced.lines.map(l => ({ ...l, productId: l.product_id, total_price_baisa: l.line_total_baisa }));
    });
  } catch (err) {
    return res.status(409).json({ success: false, error: err.message });
  }

  const purchase = {
    value: orderRecord.total_baisa / 1000, currency: 'OMR',
    content_ids: orderItems.map(i => i.sku), num_items: orderItems.reduce((n, i) => n + i.quantity, 0),
    contents: orderItems.map(i => ({ id: i.sku, quantity: i.quantity, item_price: i.unit_price_baisa / 1000 }))
  };

  // 4. COD: confirmed now → Odoo + Conversions API. Thawani: both happen after the payment is verified.
  if (paymentMethod !== 'thawani') {
    OdooService.syncOrderToOdoo(orderId).catch(err => console.error(`Background Odoo sync error for order ${orderNumber}:`, err.message));
    MetaCapi.sendPurchase(orderId).catch(err => console.error(`Meta CAPI error for ${orderNumber}:`, err.message));
  }

  // 5. Thawani session
  if (paymentMethod === 'thawani') {
    try {
      const siteUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const thawaniResult = await ThawaniService.createCheckoutSession({ order: orderRecord, items: orderItems, siteUrl });
      return res.json({
        success: true, orderId, orderNumber, requiresRedirect: true,
        redirectUrl: thawaniResult.redirectUrl, sessionId: thawaniResult.sessionId,
        paymentMethod: 'thawani', totalBaisa: orderRecord.total_baisa, totalOmrFormatted: PricingService.formatOmr(orderRecord.total_baisa), purchase
      });
    } catch (err) {
      console.error(`Thawani session error for ${orderNumber}:`, err.message);
      ThawaniService.releaseUnpaidOrder({ id: orderId }, 'Payment page could not be opened');
      return res.status(502).json({
        success: false, keepCart: true,
        error: ar ? 'تعذر فتح صفحة الدفع الآن. حاول مرة أخرى أو اختر الدفع عند الاستلام.' : 'We could not open the Thawani payment page right now. Please try again or choose Cash on Delivery.'
      });
    }
  }

  res.json({
    success: true, orderId, orderNumber, requiresRedirect: false, paymentMethod: 'cod',
    totalBaisa: orderRecord.total_baisa, totalOmrFormatted: PricingService.formatOmr(orderRecord.total_baisa), purchase,
    message: 'Your order has been placed successfully. You will pay upon delivery in Oman.'
  });
});

module.exports = router;
