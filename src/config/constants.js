// Store Constants & Business Rules for Oman & Odoo Integration

module.exports = {
  STORE_NAME: 'Global Markets Gateway',
  DEFAULT_CURRENCY: 'OMR',
  DECIMAL_PLACES: 3, // OMR uses 3 decimals (1 OMR = 1000 Baisa)
  BAISA_MULTIPLIER: 1000,
  
  // Oman Tax & Shipping Defaults
  DEFAULT_VAT_RATE: 0.05, // 5% Oman VAT
  FREE_SHIPPING_THRESHOLD_BAISA: 25000, // Free shipping for orders >= 25.000 OMR
  
  // Oman Governorates with standard delivery fees in Baisa
  OMAN_GOVERNORATES: [
    { code: 'MCT', name_en: 'Muscat', name_ar: 'مسقط', delivery_fee_baisa: 1500, delivery_days: '1-2 days' },
    { code: 'BAT_S', name_en: 'Al Batinah South', name_ar: 'جنوب الباطنة', delivery_fee_baisa: 2500, delivery_days: '2-3 days' },
    { code: 'BAT_N', name_en: 'Al Batinah North', name_ar: 'شمال الباطنة', delivery_fee_baisa: 2500, delivery_days: '2-3 days' },
    { code: 'DAK', name_en: 'Al Dakhiliyah', name_ar: 'الداخلية', delivery_fee_baisa: 2500, delivery_days: '2-3 days' },
    { code: 'SHR_S', name_en: 'Ash Sharqiyah South', name_ar: 'جنوب الشرقية', delivery_fee_baisa: 2500, delivery_days: '2-3 days' },
    { code: 'SHR_N', name_en: 'Ash Sharqiyah North', name_ar: 'شمال الشرقية', delivery_fee_baisa: 2500, delivery_days: '2-3 days' },
    { code: 'DHA', name_en: 'Al Dhahirah', name_ar: 'الظاهرة', delivery_fee_baisa: 3000, delivery_days: '3-4 days' },
    { code: 'BUR', name_en: 'Al Buraimi', name_ar: 'البريمي', delivery_fee_baisa: 3000, delivery_days: '3-4 days' },
    { code: 'DHO', name_en: 'Dhofar (Salalah)', name_ar: 'ظفار (صلالة)', delivery_fee_baisa: 3500, delivery_days: '3-5 days' },
    { code: 'WUS', name_en: 'Al Wusta', name_ar: 'الوسطى', delivery_fee_baisa: 3500, delivery_days: '3-5 days' },
    { code: 'MUS', name_en: 'Musandam', name_ar: 'مسندم', delivery_fee_baisa: 4000, delivery_days: '4-6 days' },
  ],

  // Order State Machine
  ORDER_STATUSES: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
  },

  // Payment Statuses
  PAYMENT_STATUSES: {
    UNPAID: 'unpaid',
    PENDING: 'pending',
    PAID: 'paid',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
  },

  // Payment Providers
  PAYMENT_METHODS: {
    COD: 'cod',
    THAWANI: 'thawani'
  },

  // Odoo Integration States
  ODOO_STATUSES: {
    PENDING: 'pending_integration',
    SYNCED: 'odoo_synced',
    CONFIRMED: 'odoo_confirmed',
    FAILED: 'odoo_failed',
    SKIPPED: 'odoo_skipped'
  },

  // Odoo 19 Community Configuration Keys
  ODOO_DEFAULTS: {
    RETAIL_COMPANY_ID: 1,      // Dedicated Retail Company in Odoo
    WHOLESALE_COMPANY_ID: 2,   // Wholesale Company (for reference, must NOT be mixed)
    RETAIL_PRICELIST_ID: 1,    // Dedicated Retail Pricelist
    RETAIL_WAREHOUSE_ID: 1,    // Retail Warehouse
    API_TIMEOUT_MS: 15000,
    MAX_RETRIES: 3
  }
};
