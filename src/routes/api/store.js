// Public store information: contact details, company registration, delivery rules.
// Values come from Admin → Settings so they can be changed without touching code.

const express = require('express');
const router = express.Router();
const { getSettingsMap } = require('../../services/inventoryService');
const PricingService = require('../../services/pricingService');

router.get('/', (req, res) => {
  try {
    const s = getSettingsMap();
    const ar = req.query.lang === 'ar';
    const freeThreshold = parseInt(s.free_shipping_threshold_baisa || '25000', 10);
    res.json({
      success: true,
      data: {
        name: s.store_name || 'Global Markets Gateway',
        legal_name: s.store_legal_name || 'Global Markets Gateway LLC',
        cr_number: s.store_cr_number || '',
        tax_number: s.store_tax_number || '',
        address: (ar && s.store_address_ar) || s.store_address || '',
        phone: s.contact_phone || '',
        whatsapp: s.contact_whatsapp || '',
        email: s.contact_email || '',
        instagram: s.contact_instagram || '',
        announcement: (ar && s.announcement_text_ar) || s.announcement_text || '',
        currency: 'OMR',
        free_shipping_threshold_baisa: freeThreshold,
        free_shipping_threshold_formatted: PricingService.formatOmr(freeThreshold, ar ? 'ar' : 'en'),
        payment: { cod: s.cod_active !== 'false', thawani: s.thawani_active !== 'false' }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
