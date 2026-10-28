-- Relational Database Schema for Premium Electronics E-Commerce Platform
-- Optimized for SQLite with WAL mode, supports PostgreSQL migration

PRAGMA foreign_keys = ON;

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  sku TEXT UNIQUE NOT NULL,
  barcode TEXT,
  brand TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  short_desc_en TEXT,
  short_desc_ar TEXT,
  full_desc_en TEXT,
  full_desc_ar TEXT,
  specifications TEXT, -- JSON string
  retail_price_baisa INTEGER NOT NULL, -- in Baisa (1 OMR = 1000 Baisa)
  sale_price_baisa INTEGER,            -- in Baisa (optional discount price)
  cost_price_baisa INTEGER NOT NULL,   -- private supplier cost, never sent to public
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  odoo_product_id INTEGER,             -- Odoo 19 product.product ID
  odoo_template_id INTEGER,            -- Odoo 19 product.template ID
  odoo_sync_status TEXT DEFAULT 'synced',
  last_synced_at DATETIME,
  is_featured INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 1,
  hero_tagline TEXT,                   -- optional headline when shown in the homepage banner
  hero_tagline_ar TEXT,                -- Arabic banner headline
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_published ON products(is_published);

-- Product Variants (for colors, cable lengths, storage)
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE NOT NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  option_color TEXT,
  option_spec TEXT,
  price_baisa INTEGER NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  odoo_variant_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

-- Product Images
CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text_en TEXT,
  alt_text_ar TEXT,
  sort_order INTEGER DEFAULT 0,
  is_primary INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  delivery_governorate TEXT NOT NULL,
  delivery_city TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_postal_code TEXT,
  customer_notes TEXT,
  
  -- Financial calculations stored in integer Baisa
  subtotal_baisa INTEGER NOT NULL,
  discount_baisa INTEGER DEFAULT 0,
  delivery_fee_baisa INTEGER NOT NULL,
  vat_baisa INTEGER NOT NULL,
  total_baisa INTEGER NOT NULL,
  currency TEXT DEFAULT 'OMR',
  
  -- Order Statuses (kept strictly separate)
  payment_method TEXT NOT NULL, -- 'cod' | 'thawani'
  payment_status TEXT NOT NULL DEFAULT 'unpaid', -- 'unpaid' | 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'
  fulfillment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  
  -- Odoo Integration Tracking
  odoo_order_status TEXT DEFAULT 'pending_integration', -- 'pending_integration' | 'odoo_synced' | 'odoo_confirmed' | 'odoo_failed'
  odoo_sale_order_id INTEGER,
  odoo_sale_order_name TEXT,
  odoo_retry_count INTEGER DEFAULT 0,
  odoo_last_error TEXT,
  
  -- Thawani Integration Tracking
  thawani_session_id TEXT,
  thawani_payment_id TEXT,
  thawani_raw_response TEXT,
  
  -- Idempotency safeguard to prevent duplicate checkout submissions
  idempotency_key TEXT UNIQUE,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment ON orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_odoo_status ON orders(odoo_order_status);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  unit_price_baisa INTEGER NOT NULL,
  cost_price_baisa INTEGER NOT NULL, -- recorded at time of order for profit auditing
  quantity INTEGER NOT NULL,
  total_price_baisa INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Order Timeline Events
CREATE TABLE IF NOT EXISTS order_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by TEXT DEFAULT 'system',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id);

-- Store Settings (Admin Configurable)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin Users
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin', -- 'superadmin', 'admin', 'manager'
  is_active INTEGER DEFAULT 1,
  last_login_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Administrative Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT, -- JSON string
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- Integration Events & Logs (Odoo 19 & Thawani Webhooks / API Calls)
CREATE TABLE IF NOT EXISTS integration_events (
  id TEXT PRIMARY KEY,
  service TEXT NOT NULL, -- 'odoo' | 'thawani'
  event_type TEXT NOT NULL,
  reference_id TEXT, -- order_number or session_id
  status TEXT NOT NULL, -- 'success' | 'failed' | 'pending'
  retry_count INTEGER DEFAULT 0,
  payload TEXT, -- JSON
  response TEXT, -- JSON
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_integration_service ON integration_events(service);
CREATE INDEX IF NOT EXISTS idx_integration_reference ON integration_events(reference_id);
CREATE INDEX IF NOT EXISTS idx_integration_status ON integration_events(status);
