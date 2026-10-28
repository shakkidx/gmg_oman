// Global Markets Gateway LLC — E-Commerce Server
// Storefront + Admin panel + Odoo 19 stock/order sync + Thawani Pay (Oman)

require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');

const { initializeDatabase } = require('./config/database');
const { seed } = require('./database/seed');
const OdooService = require('./services/odoo/odooService');
const ThawaniService = require('./services/thawani/thawaniService');
const { getSetting } = require('./services/inventoryService');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Database: create tables, then add any missing settings / admin user / starter catalogue.
//    Seeding is safe to run on every start — it never overwrites existing data.
try {
  const db = initializeDatabase();
  seed();
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  console.log(`Database connected. ${productCount} products in catalogue.`);
} catch (err) {
  console.error('Database initialization failed:', err.message);
  process.exit(1);
}

// 2. Core middleware
app.use(cors());
app.use('/api/admin/uploads', express.json({ limit: '15mb' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 3. Static storefront + admin
const PUBLIC_DIR = path.resolve(__dirname, '../public');
app.use(express.static(PUBLIC_DIR, {
  // Pages, scripts and styles are re-checked on every visit so updates show immediately;
  // photos can be cached by the browser for a week.
  setHeaders(res, filePath) {
    if (/\.(html|js|css)$/.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
    else if (/\.(png|jpe?g|webp|svg)$/.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=604800');
  }
}));

// Thumbnails: /thumbs/<size>/<original path>.webp are pre-made light copies of product photos.
// If a copy doesn't exist (e.g. a new upload), send the browser to the original image instead.
app.use('/thumbs', (req, res) => {
  const full = decodeURIComponent((req.originalUrl || req.url).split('?')[0]);
  const original = full.replace(/^\/thumbs\/\d+/, '').replace(/\.webp$/, '');
  if (!/^\/(images|uploads)\//.test(original) || original.includes('..')) return res.status(404).end();
  res.redirect(302, encodeURI(original));
});

// Clean URLs
const page = file => (req, res) => res.sendFile(path.join(PUBLIC_DIR, file));
app.get('/shop', page('shop.html'));
app.get('/category/:slug', page('shop.html'));
app.get('/product/:slug', page('product.html'));
app.get('/cart', page('cart.html'));
app.get('/checkout', page('checkout.html'));
app.get('/contact', page('contact.html'));
app.get('/policies', page('policies.html'));
app.get('/track', page('order-confirmation.html'));
app.get('/admin', page('admin/index.html'));

// 4. Public APIs
app.use('/api/store', require('./routes/api/store'));
app.use('/api/products', require('./routes/api/products'));
app.use('/api/categories', require('./routes/api/categories'));
app.use('/api/cart', require('./routes/api/cart'));
app.use('/api/checkout', require('./routes/api/checkout'));
app.use('/api/orders', require('./routes/api/orders'));
app.use('/api/thawani', require('./routes/api/thawani'));

// 5. Admin APIs (all protected by requireAdmin inside each router)
app.use('/api/admin/auth', require('./routes/api/admin/auth'));
app.use('/api/admin/dashboard', require('./routes/api/admin/dashboard'));
app.use('/api/admin/products', require('./routes/api/admin/products'));
app.use('/api/admin/categories', require('./routes/api/admin/categories'));
app.use('/api/admin/uploads', require('./routes/api/admin/uploads'));
app.use('/api/admin/orders', require('./routes/api/admin/orders'));
app.use('/api/admin/odoo', require('./routes/api/admin/odoo'));
app.use('/api/admin/settings', require('./routes/api/admin/settings'));

// 6. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', company: 'Global Markets Gateway LLC', currency: 'OMR', timestamp: new Date().toISOString() });
});

// 7. Background jobs
// 7a. Retry orders that could not be created in Odoo (Odoo offline, etc.) — every 5 minutes
setInterval(() => {
  OdooService.processPendingRetries(3).catch(err => console.error('Odoo retry worker error:', err.message));
}, 5 * 60 * 1000);

// 7b. Automatic stock sync from Odoo (live mode only). Interval is set in Admin → Settings → Odoo.
let lastStockSync = 0;
setInterval(() => {
  const minutes = parseInt(getSetting('odoo_auto_sync_minutes', '10'), 10);
  if (getSetting('odoo_mode', 'mock') !== 'live' || !minutes) return;
  if (Date.now() - lastStockSync < minutes * 60 * 1000) return;
  lastStockSync = Date.now();
  OdooService.syncStock()
    .then(r => console.log(`Auto stock sync: ${r.updatedCount} products updated from Odoo.`))
    .catch(err => console.error('Auto stock sync failed:', err.message));
}, 60 * 1000);

// 7c. Release stock held by Thawani orders that were never paid — checked every 5 minutes
setInterval(() => {
  const timeout = parseInt(getSetting('thawani_order_timeout_minutes', '45'), 10) || 45;
  ThawaniService.expireStaleSessions(timeout).catch(err => console.error('Thawani expiry worker error:', err.message));
}, 5 * 60 * 1000);

// 8. Errors
app.use('/api', (req, res) => res.status(404).json({ success: false, error: 'Not found.' }));
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('=================================================================');
    console.log('   GLOBAL MARKETS GATEWAY LLC — Online Store');
    console.log('=================================================================');
    console.log(` > Storefront : http://localhost:${PORT}`);
    console.log(` > Admin      : http://localhost:${PORT}/admin`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(' > First login: admin / AdminPassword123!  (you will be asked to change it)');
    }
    console.log('=================================================================\n');
  });
}

module.exports = app;
