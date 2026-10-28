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
            is_active: settings.thawani_active !== 'false',
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
    const { governorateCode, items = [], couponCode, lang = 'en' } = req.body;
    const db = getDatabase();

    const settingsRows = db.prepare("SELECT key, value FROM settings WHERE category IN ('shipping', 'tax')").all();
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    const vatRate = parseFloat(settings.vat_rate || '0.05');
    const isVatInclusive = settings.vat_inclusive === 'true';
    const freeThreshold = parseInt(settings.free_shipping_threshold_baisa || '25000', 10);

    // Resolve delivery fee
    const gov = OMAN_GOVERNORATES.find(g => g.code === governorateCode) || OMAN_GOVERNORATES[0];
    let baseDeliveryFee = gov.code === 'MCT'
      ? parseInt(settings.muscat_delivery_fee_baisa || '1500', 10)
      : parseInt(settings.other_delivery_fee_baisa || '2500', 10);

    // Verify items and prices from DB
    const validatedItems = [];
    for (const it of items) {
      const prod = db.prepare(`
        SELECT sku, name_en, name_ar, retail_price_baisa, sale_price_baisa, stock_quantity 
        FROM products WHERE sku = ? AND is_published = 1
      `).get(it.sku);

      if (prod) {
        const qty = Math.max(1, parseInt(it.quantity || 1, 10));
        validatedItems.push({
          sku: prod.sku,
          name_en: prod.name_en,
          name_ar: prod.name_ar,
          retail_price_baisa: prod.retail_price_baisa,
          sale_price_baisa: prod.sale_price_baisa,
          quantity: qty
        });
      }
    }

    // Handle optional coupon
    let discountBaisa = 0;
    if (couponCode && couponCode.trim().toUpperCase() === 'OMAN2026') {
      discountBaisa = 2000; // 2.000 OMR promotional discount
    }

    // Determine if eligible for free delivery
    let deliveryFeeBaisa = baseDeliveryFee;
    let itemsSubtotal = 0;
    validatedItems.forEach(it => {
      const uPrice = (it.sale_price_baisa && it.sale_price_baisa < it.retail_price_baisa) ? it.sale_price_baisa : it.retail_price_baisa;
      itemsSubtotal += (uPrice * it.quantity);
    });

    if (itemsSubtotal >= freeThreshold) {
      deliveryFeeBaisa = 0;
    }

    const calculations = PricingService.calculateOrderTotals({
      items: validatedItems,
      deliveryFeeBaisa,
      discountBaisa,
      vatRate,
      isVatInclusive
    });

    res.json({
      success: true,
      data: {
        ...calculations,
        governorate: {
          code: gov.code,
          name: (lang === 'ar' && gov.name_ar) || gov.name_en,
          delivery_days: gov.delivery_days
        },
        is_free_shipping: deliveryFeeBaisa === 0,
        coupon_applied: discountBaisa > 0 ? couponCode.toUpperCase() : null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/checkout/order
 * Executes atomic order creation with immediate stock deduction & idempotency safeguard
 */
router.post('/order', async (req, res) => {
  const {
    customerName,
    customerPhone,
    customerEmail,
    deliveryGovernorate,
    deliveryCity,
    deliveryAddress,
    deliveryPostalCode,
    customerNotes,
    paymentMethod = 'cod', // 'cod' or 'thawani'
    items = [],
    couponCode,
    idempotencyKey
  } = req.body;

  // 1. Validate required fields
  if (!customerName || !customerPhone || !deliveryGovernorate || !deliveryCity || !deliveryAddress) {
    return res.status(400).json({
      success: false,
      error: 'Missing required customer delivery information.'
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Your shopping cart is empty.'
    });
  }

  if (!['cod', 'thawani'].includes(paymentMethod)) {
    return res.status(400).json({ success: false, error: 'Please choose a payment method.' });
  }
  const methodKey = paymentMethod === 'cod' ? 'cod_active' : 'thawani_active';
  if (getSetting(methodKey, 'true') === 'false') {
    return res.status(400).json({ success: false, error: 'This payment method is currently unavailable.' });
  }

  const db = getDatabase();

  // 2. Check for duplicate order submission via Idempotency Key
  if (idempotencyKey) {
    const existingOrder = db.prepare('SELECT id, order_number, payment_status, fulfillment_status, total_baisa FROM orders WHERE idempotency_key = ?').get(idempotencyKey);
    if (existingOrder) {
      return res.json({
        success: true,
        isDuplicate: true,
        orderId: existingOrder.id,
        orderNumber: existingOrder.order_number,
        totalOmrFormatted: PricingService.formatOmr(existingOrder.total_baisa),
        message: 'Order already processed.'
      });
    }
  }

  const orderId = uuidv4();
  const orderNumber = `GMG-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

  let orderRecord;
  let orderItems = [];

  // 3. Execute atomic database transaction
  try {
    runTransaction(() => {
      // Re-read settings inside transaction
      const settingsRows = db.prepare("SELECT key, value FROM settings WHERE category IN ('shipping', 'tax')").all();
      const settings = {};
      settingsRows.forEach(r => { settings[r.key] = r.value; });

      const vatRate = parseFloat(settings.vat_rate || '0.05');
      const isVatInclusive = settings.vat_inclusive === 'true';
      const freeThreshold = parseInt(settings.free_shipping_threshold_baisa || '25000', 10);

      // Verify and deduct stock
      const maxQtyCap = parseInt(getSetting('max_qty_per_order', '10'), 10) || 10;
      const validatedLines = [];
      let subtotalBaisa = 0;

      for (const item of items) {
        const qty = Math.max(1, parseInt(item.quantity || 1, 10));

        // Lock product row for update to prevent concurrent overselling
        const product = db.prepare(`
          SELECT id, sku, name_en, name_ar, retail_price_baisa, sale_price_baisa, cost_price_baisa, stock_quantity 
          FROM products 
          WHERE sku = ? AND is_published = 1
        `).get(item.sku);

        if (!product) {
          throw new Error(`Product SKU '${item.sku}' is not available.`);
        }

        if (product.stock_quantity <= 0) {
          throw new Error(`'${product.name_en}' is sold out. Please remove it from your cart.`);
        }
        if (product.stock_quantity < qty || qty > maxQtyCap) {
          throw new Error(`The quantity requested for '${product.name_en}' is not available. Please reduce the quantity.`);
        }

        // Deduct stock in database
        db.prepare(`
          UPDATE products 
          SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(qty, product.id);

        const unitPrice = (product.sale_price_baisa && product.sale_price_baisa < product.retail_price_baisa)
          ? product.sale_price_baisa
          : product.retail_price_baisa;

        const lineTotal = unitPrice * qty;
        subtotalBaisa += lineTotal;

        validatedLines.push({
          productId: product.id,
          sku: product.sku,
          name_en: product.name_en,
          name_ar: product.name_ar,
          unit_price_baisa: unitPrice,
          cost_price_baisa: product.cost_price_baisa, // private cost recorded for profit ledger
          quantity: qty,
          total_price_baisa: lineTotal
        });
      }

      // Delivery charge
      const gov = OMAN_GOVERNORATES.find(g => g.name_en.toLowerCase() === deliveryGovernorate.toLowerCase() || g.code === deliveryGovernorate) || OMAN_GOVERNORATES[0];
      let baseFee = gov.code === 'MCT'
        ? parseInt(settings.muscat_delivery_fee_baisa || '1500', 10)
        : parseInt(settings.other_delivery_fee_baisa || '2500', 10);

      const deliveryFeeBaisa = subtotalBaisa >= freeThreshold ? 0 : baseFee;
      const discountBaisa = (couponCode && couponCode.toUpperCase() === 'OMAN2026') ? 2000 : 0;
      const discountedSubtotalBaisa = Math.max(0, subtotalBaisa - discountBaisa);
      const vatBaisa = isVatInclusive
        ? Math.round(discountedSubtotalBaisa - (discountedSubtotalBaisa / (1 + vatRate)))
        : Math.round(discountedSubtotalBaisa * vatRate);

      const totalBaisa = isVatInclusive
        ? discountedSubtotalBaisa + deliveryFeeBaisa
        : discountedSubtotalBaisa + deliveryFeeBaisa + vatBaisa;

      // Insert Order
      const paymentStatus = paymentMethod === 'thawani' ? 'pending' : 'unpaid';
      const fulfillmentStatus = paymentMethod === 'cod' ? 'confirmed' : 'pending';

      db.prepare(`
        INSERT INTO orders (
          id, order_number, customer_name, customer_phone, customer_email,
          delivery_governorate, delivery_city, delivery_address, delivery_postal_code, customer_notes,
          subtotal_baisa, discount_baisa, delivery_fee_baisa, vat_baisa, total_baisa,
          currency, payment_method, payment_status, fulfillment_status,
          odoo_order_status, idempotency_key
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          'OMR', ?, ?, ?,
          'pending_integration', ?
        )
      `).run(
        orderId, orderNumber, customerName, customerPhone, customerEmail || null,
        gov.name_en, deliveryCity, deliveryAddress, deliveryPostalCode || null, customerNotes || null,
        subtotalBaisa, discountBaisa, deliveryFeeBaisa, vatBaisa, totalBaisa,
        paymentMethod, paymentStatus, fulfillmentStatus, idempotencyKey || null
      );

      // Insert Order Items
      const insertItemStmt = db.prepare(`
        INSERT INTO order_items (
          id, order_id, product_id, sku, name_en, name_ar,
          unit_price_baisa, cost_price_baisa, quantity, total_price_baisa
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const vl of validatedLines) {
        insertItemStmt.run(
          uuidv4(), orderId, vl.productId, vl.sku, vl.name_en, vl.name_ar,
          vl.unit_price_baisa, vl.cost_price_baisa, vl.quantity, vl.total_price_baisa
        );
      }

      // Add order timeline event
      db.prepare(`
        INSERT INTO order_events (id, order_id, event_type, description, created_by)
        VALUES (?, ?, 'order_placed', ?, 'checkout_system')
      `).run(uuidv4(), orderId, `Order placed successfully via ${paymentMethod.toUpperCase()}`);

      orderRecord = {
        id: orderId,
        order_number: orderNumber,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        delivery_governorate: gov.name_en,
        delivery_city: deliveryCity,
        delivery_address: deliveryAddress,
        total_baisa: totalBaisa,
        payment_method: paymentMethod
      };

      orderItems = validatedLines;
    });
  } catch (err) {
    return res.status(409).json({
      success: false,
      error: err.message
    });
  }

  // 4. Cash-on-delivery orders go to Odoo right away (non-blocking).
  //    Thawani orders are sent to Odoo only after the payment is verified (see ThawaniService.markPaid).
  if (paymentMethod !== 'thawani') {
    OdooService.syncOrderToOdoo(orderId).catch(err => {
      console.error(`Background Odoo sync error for order ${orderNumber}:`, err.message);
    });
  }

  // 5. If Thawani Pay selected, create checkout session
  if (paymentMethod === 'thawani') {
    try {
      const siteUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const thawaniResult = await ThawaniService.createCheckoutSession({
        order: orderRecord,
        items: orderItems,
        siteUrl
      });

      return res.json({
        success: true,
        orderId,
        orderNumber,
        requiresRedirect: true,
        redirectUrl: thawaniResult.redirectUrl,
        sessionId: thawaniResult.sessionId,
        paymentMethod: 'thawani',
        totalBaisa: orderRecord.total_baisa,
        totalOmrFormatted: PricingService.formatOmr(orderRecord.total_baisa)
      });
    } catch (err) {
      // Could not open the payment page: cancel this attempt and return the stock so the customer can retry
      console.error(`Thawani session error for ${orderNumber}:`, err.message);
      ThawaniService.releaseUnpaidOrder({ id: orderId }, 'Payment page could not be opened');
      return res.status(502).json({
        success: false,
        error: 'We could not open the Thawani payment page right now. Please try again or choose Cash on Delivery.'
      });
    }
  }

  // 6. Return response for COD
  res.json({
    success: true,
    orderId,
    orderNumber,
    requiresRedirect: false,
    paymentMethod: 'cod',
    totalBaisa: orderRecord.total_baisa,
    totalOmrFormatted: PricingService.formatOmr(orderRecord.total_baisa),
    message: 'Your order has been placed successfully. You will pay upon delivery in Oman.'
  });
});

module.exports = router;
