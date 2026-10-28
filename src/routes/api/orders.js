// Public Order Tracking Router

const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../config/database');
const PricingService = require('../../services/pricingService');

/**
 * GET /api/orders/track
 * Secure customer order tracking by order number and phone or email
 */
router.get('/track', (req, res) => {
  try {
    const { orderNumber, contact, lang = 'en' } = req.query;

    if (!orderNumber || !contact) {
      return res.status(400).json({
        success: false,
        error: 'Both Order Number and Phone or Email are required to track an order.'
      });
    }

    const db = getDatabase();
    const cleanNumber = orderNumber.trim();
    const cleanContact = contact.trim().toLowerCase().replace(/^\+?968\s*/, '').replace(/\s+/g, '');
    if (cleanContact.length < 6) {
      return res.status(400).json({ success: false, error: 'Please enter the full mobile number or email used for the order.' });
    }

    const order = db.prepare(`
      SELECT 
        id, order_number, customer_name, customer_phone, customer_email,
        delivery_governorate, delivery_city, delivery_address,
        subtotal_baisa, discount_baisa, delivery_fee_baisa, vat_baisa, total_baisa,
        payment_method, payment_status, fulfillment_status,
        odoo_order_status, odoo_sale_order_name, created_at
      FROM orders
      WHERE order_number = ? 
        AND (REPLACE(LOWER(customer_phone), ' ', '') LIKE ? OR LOWER(customer_email) = ?)
    `).get(cleanNumber, `%${cleanContact}%`, cleanContact);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'No matching order found with the provided details.'
      });
    }

    // Get Items (Omitting cost price!)
    const items = db.prepare(`
      SELECT sku, name_en, name_ar, unit_price_baisa, quantity, total_price_baisa
      FROM order_items
      WHERE order_id = ?
    `).all(order.id);

    // Get Timeline events
    const timeline = db.prepare(`
      SELECT event_type, description, created_at
      FROM order_events
      WHERE order_id = ? AND event_type IN ('order_placed', 'payment_verified', 'status_change')
      ORDER BY created_at ASC
    `).all(order.id);

    res.json({
      success: true,
      data: {
        order_number: order.order_number,
        customer_name: order.customer_name,
        delivery: {
          governorate: order.delivery_governorate,
          city: order.delivery_city,
          address: order.delivery_address
        },
        financials: {
          subtotal_formatted: PricingService.formatOmr(order.subtotal_baisa, lang),
          delivery_formatted: PricingService.formatOmr(order.delivery_fee_baisa, lang),
          vat_formatted: PricingService.formatOmr(order.vat_baisa, lang),
          discount_formatted: PricingService.formatOmr(order.discount_baisa, lang),
          total_formatted: PricingService.formatOmr(order.total_baisa, lang),
          total_baisa: order.total_baisa
        },
        statuses: {
          payment_method: order.payment_method.toUpperCase(),
          payment_status: order.payment_status,
          fulfillment_status: order.fulfillment_status,
        },
        items: items.map(it => ({
          sku: it.sku,
          name: (lang === 'ar' && it.name_ar) || it.name_en,
          unit_price_formatted: PricingService.formatOmr(it.unit_price_baisa, lang),
          quantity: it.quantity,
          line_total_formatted: PricingService.formatOmr(it.total_price_baisa, lang)
        })),
        timeline,
        created_at: order.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
