// Offer price rules (National Day Offer 2026): offer prices only for offer products, only inside
// 20 Nov 00:00 – 30 Nov 23:59 Oman time, computed on the server; prices sent by the browser are ignored.

const assert = require('assert');
const { getDatabase } = require('../src/config/database');
const { priceCart } = require('../src/services/cartPricing');
const OfferService = require('../src/services/offerService');

console.log('--- RUNNING OFFER PRICE TESTS ---');
const db = getDatabase();
const DURING = Date.parse('2026-11-25T12:00:00+04:00');
const BEFORE = Date.parse('2026-11-19T23:59:00+04:00');
const LAST_MINUTE = Date.parse('2026-11-30T23:59:00+04:00');
const AFTER = Date.parse('2026-12-01T00:00:01+04:00');

const OFFER_SKU = 'MEV-CH-4515'; // offer price 6.300, normal 10.700
const offerProduct = db.prepare('SELECT * FROM products WHERE sku = ?').get(OFFER_SKU);
assert(offerProduct, 'offer product must exist (run the seed first)');
const normal = OfferService.normalPrice(offerProduct);

// A product that is not in the offer, made just for this test
const TEST_ID = 'test-offer-normal-product';
const cat = db.prepare('SELECT category_id FROM products LIMIT 1').get().category_id;
db.prepare('DELETE FROM products WHERE id = ?').run(TEST_ID);
db.prepare(`INSERT INTO products (id, sku, slug, name_en, name_ar, brand, category_id, retail_price_baisa, cost_price_baisa, stock_quantity, is_published)
  VALUES (?, 'TEST-NORMAL-1', 'test-normal-1', 'Test normal product', 'منتج تجريبي', 'TEST', ?, 5000, 3000, 50, 1)`).run(TEST_ID, cat);

try {
  // 1. Offer product during the offer
  let r = priceCart([{ sku: OFFER_SKU, quantity: 2 }], { at: DURING });
  assert.strictEqual(r.lines[0].unit_price_baisa, 6300);
  assert.strictEqual(r.lines[0].original_price_baisa, normal);
  assert.strictEqual(r.lines[0].offer.name_en, 'National Day Offer 2026');
  assert.strictEqual(r.totals.totalBaisa, 12600, 'offer price includes VAT, delivery free');
  assert.strictEqual(r.totals.deliveryFeeBaisa, 0);
  console.log('✓ Offer product gets the offer price during the offer (VAT included, free delivery)');

  // 2. Normal product during the offer
  r = priceCart([{ sku: 'TEST-NORMAL-1', quantity: 1 }], { at: DURING });
  assert.strictEqual(r.lines[0].unit_price_baisa, 5000);
  assert.strictEqual(r.lines[0].offer, null);
  assert.strictEqual(r.totals.totalBaisa, 5250, 'normal product: 5% VAT added');
  console.log('✓ Product not in the offer keeps its normal price');

  // 3. Mixed cart
  r = priceCart([{ sku: OFFER_SKU, quantity: 1 }, { sku: 'TEST-NORMAL-1', quantity: 2 }], { at: DURING });
  assert.strictEqual(r.lines.find(l => l.sku === OFFER_SKU).unit_price_baisa, 6300);
  assert.strictEqual(r.lines.find(l => l.sku === 'TEST-NORMAL-1').unit_price_baisa, 5000);
  assert.strictEqual(r.totals.totalBaisa, 6300 + 10000 + 500);
  console.log('✓ Mixed cart: only offer items get the offer price');

  // 4. Outside the offer window (before start, after end) — and still on at 23:59 on 30 Nov
  for (const at of [BEFORE, AFTER]) {
    r = priceCart([{ sku: OFFER_SKU, quantity: 1, price_baisa: 6300 }], { at });
    assert.strictEqual(r.lines[0].unit_price_baisa, normal);
    assert.strictEqual(r.lines[0].offer, null);
    assert.strictEqual(r.priceChanged, true, 'a cart holding the old offer price is flagged as repriced');
  }
  r = priceCart([{ sku: OFFER_SKU, quantity: 1 }], { at: LAST_MINUTE });
  assert.strictEqual(r.lines[0].unit_price_baisa, 6300);
  assert.strictEqual(OfferService.featuredOffer(AFTER).state, 'ended');
  assert.strictEqual(OfferService.featuredOffer(BEFORE).state, 'soon');
  console.log('✓ Prices go back to normal after 30 Nov 23:59 (and before 20 Nov); cart is flagged as repriced');

  // 5. Tampered browser price is ignored
  r = priceCart([{ sku: OFFER_SKU, quantity: 3, price_baisa: 1 }], { at: DURING });
  assert.strictEqual(r.lines[0].unit_price_baisa, 6300);
  assert.strictEqual(r.totals.totalBaisa, 18900);
  assert.strictEqual(r.priceChanged, true);
  console.log('✓ Price sent by the browser is never used');
} finally {
  db.prepare('DELETE FROM products WHERE id = ?').run(TEST_ID);
}
console.log('ALL OFFER PRICE TESTS PASSED SUCCESSFULLY!');
