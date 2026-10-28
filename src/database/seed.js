// First-boot seed: store settings, the admin account, and the MEVRIO catalogue.

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { initializeDatabase, runTransaction } = require('../config/database');
const { categories: catalogCategories, mevrioProducts } = require('./catalog');

/** Insert the MEVRIO categories, products and images. Caller wraps in a transaction. */
function insertCatalog(db) {
  const upsertCategory = db.prepare(`
    INSERT INTO categories (id, slug, name_en, name_ar, description_en, description_ar, image_url, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, name_en = excluded.name_en, name_ar = excluded.name_ar,
      description_en = excluded.description_en, description_ar = excluded.description_ar,
      image_url = excluded.image_url, sort_order = excluded.sort_order, is_active = excluded.is_active
  `);
  for (const c of catalogCategories) {
    upsertCategory.run(c.id, c.slug, c.name_en, c.name_ar, c.description_en, c.description_ar, c.image_url, c.sort_order, c.is_active);
  }
  const insertProduct = db.prepare(`
    INSERT INTO products (
      id, category_id, sku, barcode, brand, name_en, name_ar, slug,
      short_desc_en, short_desc_ar, full_desc_en, full_desc_ar,
      specifications, retail_price_baisa, sale_price_baisa, cost_price_baisa,
      stock_quantity, low_stock_threshold, is_featured, is_published, hero_tagline, hero_tagline_ar
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5, ?, 1, ?, ?)
  `);
  const insertImage = db.prepare(`
    INSERT INTO product_images (id, product_id, image_url, alt_text_en, alt_text_ar, sort_order, is_primary)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const p of mevrioProducts) {
    insertProduct.run(
      p.id, p.category_id, p.sku, p.barcode, p.brand, p.name_en, p.name_ar, p.slug,
      p.short_desc_en, p.short_desc_ar, p.full_desc_en, p.full_desc_ar,
      p.specifications, p.retail_price_baisa, p.sale_price_baisa, p.cost_price_baisa,
      p.stock_quantity, p.is_featured, p.hero_tagline || null, p.hero_tagline_ar || null
    );
    p.gallery.forEach((url, i) => insertImage.run(`img-${p.id}-${i}`, p.id, url, p.name_en, p.name_ar, i, i === 0 ? 1 : 0));
  }
  console.log(`Seeded ${mevrioProducts.length} MEVRIO products in ${catalogCategories.length} categories.`);
}

function seed() {
  const db = initializeDatabase();
  console.log('Database initialized. Seeding initial data...');

  runTransaction(() => {
    // 1. SEED SETTINGS
    const settings = [
      { key: 'store_name', value: 'Global Markets Gateway', category: 'general', description: 'Store Trade Name' },
      { key: 'store_currency', value: 'OMR', category: 'general', description: 'Store Currency Symbol' },
      { key: 'currency_decimals', value: '3', category: 'general', description: 'OMR Decimal Precision' },
      { key: 'vat_rate', value: '0.05', category: 'tax', description: 'Oman Standard VAT Rate (5%)' },
      { key: 'vat_inclusive', value: 'false', category: 'tax', description: 'Whether prices include VAT' },
      { key: 'free_shipping_threshold_baisa', value: '25000', category: 'shipping', description: 'Free delivery threshold in Baisa (25.000 OMR)' },
      { key: 'muscat_delivery_fee_baisa', value: '1500', category: 'shipping', description: 'Muscat delivery charge in Baisa (1.500 OMR)' },
      { key: 'other_delivery_fee_baisa', value: '2500', category: 'shipping', description: 'Interior Governorates delivery in Baisa (2.500 OMR)' },
      { key: 'contact_email', value: 'sales@globalmarketsgateway.om', category: 'contact', description: 'Customer Support Email' },
      { key: 'contact_phone', value: '+968 24 998877', category: 'contact', description: 'Main Phone Number' },
      { key: 'contact_whatsapp', value: '+968 91234567', category: 'contact', description: 'Customer Care WhatsApp' },
      { key: 'store_address', value: 'South Al Khuwair, Bousher, Muscat, Sultanate of Oman', category: 'contact', description: 'Store Physical Address' },
      { key: 'contact_instagram', value: '', category: 'contact', description: 'Instagram profile URL (optional)' },
      { key: 'store_legal_name', value: 'Global Markets Gateway LLC', category: 'general', description: 'Registered company name' },
      { key: 'store_cr_number', value: '1679125', category: 'general', description: 'Commercial Registration number' },
      { key: 'store_tax_number', value: '2326874', category: 'general', description: 'Tax Identification Number' },
      { key: 'announcement_text', value: 'Free delivery across Oman on orders over OMR 25', category: 'general', description: 'Top bar announcement on the website' },
      { key: 'announcement_text_ar', value: 'توصيل مجاني لجميع أنحاء عُمان للطلبات فوق ٢٥ ر.ع.', category: 'general', description: 'Top bar announcement (Arabic)' },
      { key: 'store_address_ar', value: 'الخوير الجنوبية، بوشر، مسقط، سلطنة عُمان', category: 'contact', description: 'Store address (Arabic)' },
      { key: 'max_qty_per_order', value: '10', category: 'general', description: 'Maximum quantity of one product per order' },
      { key: 'thawani_order_timeout_minutes', value: '45', category: 'payment', description: 'Release stock of unpaid Thawani orders after this many minutes' },
      { key: 'odoo_auto_sync_minutes', value: '10', category: 'odoo', description: 'Automatic stock sync interval in minutes (live mode only, 0 = off)' },
      
      // Payment Settings
      { key: 'cod_active', value: 'true', category: 'payment', description: 'Enable Cash on Delivery' },
      { key: 'thawani_active', value: 'true', category: 'payment', description: 'Enable Thawani Pay Gateway' },
      { key: 'thawani_mode', value: 'sandbox', category: 'payment', description: 'Thawani Mode: sandbox or live' },
      { key: 'thawani_public_key', value: 'hgViMusdnkgKc8ymxServiceKeyUAT', category: 'payment', description: 'Thawani Sandbox Public Key' },
      { key: 'thawani_secret_key', value: 'rRQ27ugXZTGvposProcessSecretKeyUAT', category: 'payment', description: 'Thawani Sandbox Secret Key' },

      // Odoo 19 Community ERP Settings
      { key: 'odoo_mode', value: 'mock', category: 'odoo', description: 'Odoo Adapter Mode: mock or live' },
      { key: 'odoo_url', value: 'https://odoo19.vps.example.om', category: 'odoo', description: 'Odoo 19 Self-Hosted VPS Host URL' },
      { key: 'odoo_db', value: 'odoo19_production', category: 'odoo', description: 'Odoo Database Name' },
      { key: 'odoo_username', value: 'ecommerce_retail_api@company.om', category: 'odoo', description: 'Dedicated Retail API Username' },
      { key: 'odoo_api_key', value: 'odoo19_community_live_token_secret', category: 'odoo', description: 'Odoo API Token / Password' },
      { key: 'odoo_retail_company_id', value: '1', category: 'odoo', description: 'Dedicated Retail Company ID (1)' },
      { key: 'odoo_wholesale_company_id', value: '2', category: 'odoo', description: 'Wholesale Company ID (2 - Protected)' },
      { key: 'odoo_retail_pricelist_id', value: '1', category: 'odoo', description: 'Dedicated Retail Pricelist ID' },
      { key: 'odoo_retail_warehouse_id', value: '1', category: 'odoo', description: 'Retail Warehouse ID' },
      { key: 'odoo_last_sync_timestamp', value: new Date().toISOString(), category: 'odoo', description: 'Last successful inventory sync' },
      { key: 'odoo_sync_health', value: 'healthy', category: 'odoo', description: 'Health status: healthy, warning, offline' }
    ];

    const insertSetting = db.prepare(`
      INSERT INTO settings (key, value, category, description, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO NOTHING
    `);

    for (const s of settings) {
      insertSetting.run(s.key, s.value, s.category, s.description);
    }

    // 2. SEED ADMIN USER
    const adminCheck = db.prepare('SELECT id FROM admin_users WHERE username = ?').get('admin');
    if (!adminCheck) {
      const passwordHash = bcrypt.hashSync('AdminPassword123!', 10);
      db.prepare(`
        INSERT INTO admin_users (id, username, password_hash, full_name, email, role, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(uuidv4(), 'admin', passwordHash, 'System Administrator', 'admin@globalmarketsgateway.om', 'superadmin');
    }

    // 3. SEED CATEGORIES & MEVRIO PRODUCTS (only when the catalogue is empty)
    const productCount = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
    if (productCount === 0) {
      insertCatalog(db);
    }
  });
}

if (require.main === module) {
  seed();
}

module.exports = { seed, insertCatalog };
