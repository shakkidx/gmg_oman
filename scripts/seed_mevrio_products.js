// Reset the shop catalogue to the MEVRIO starter products.
// WARNING: deletes ALL products and photos in the website database (orders are kept only if no product is referenced).
// Usage: node scripts/seed_mevrio_products.js

const { initializeDatabase, runTransaction } = require('../src/config/database');
const { insertCatalog } = require('../src/database/seed');

const db = initializeDatabase();
const ordered = db.prepare('SELECT COUNT(*) AS c FROM order_items').get().c;
if (ordered > 0) {
  console.error('There are orders in the database — refusing to delete products. Edit products in the admin panel instead.');
  process.exit(1);
}
runTransaction(() => {
  db.prepare('DELETE FROM product_images').run();
  db.prepare('DELETE FROM product_variants').run();
  db.prepare('DELETE FROM products').run();
  insertCatalog(db);
});
