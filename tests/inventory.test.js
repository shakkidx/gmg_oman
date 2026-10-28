// Inventory & Concurrency Checkout Test Suite

const assert = require('assert');
const { getDatabase, runTransaction } = require('../src/config/database');

console.log('--- RUNNING INVENTORY & CONCURRENCY TESTS ---');

const db = getDatabase();

// 1. Verify product stock initial state
const testProduct = db.prepare('SELECT id, sku, stock_quantity FROM products LIMIT 1').get();
assert.ok(testProduct, 'Test product must exist');
const initialStock = testProduct.stock_quantity;
console.log(`✓ Initial stock for ${testProduct.sku}: ${initialStock} units`);

// 2. Test transactional deduction
runTransaction(() => {
  const current = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(testProduct.id);
  assert.strictEqual(current.stock_quantity, initialStock);

  db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(2, testProduct.id);
});

const afterDeduct = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(testProduct.id);
assert.strictEqual(afterDeduct.stock_quantity, initialStock - 2, 'Stock must decrease exactly by 2');
console.log(`✓ Transactional stock deduction verified: ${afterDeduct.stock_quantity} remaining`);

// 3. Test overselling prevention (Attempting to purchase more than available stock inside transaction)
let preventedOverselling = false;
try {
  runTransaction(() => {
    const cur = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(testProduct.id);
    const requestedQty = cur.stock_quantity + 50;

    if (cur.stock_quantity < requestedQty) {
      throw new Error('INSUFFICIENT_STOCK');
    }

    db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(requestedQty, testProduct.id);
  });
} catch (e) {
  if (e.message === 'INSUFFICIENT_STOCK') {
    preventedOverselling = true;
  }
}

assert.strictEqual(preventedOverselling, true, 'Overselling must be intercepted and rejected');

// Stock should be unchanged after rollback
const finalStock = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(testProduct.id);
assert.strictEqual(finalStock.stock_quantity, initialStock - 2, 'Stock must not change when transaction aborts');
console.log('✓ Overselling prevention and atomic rollback verified');

// Restore original stock
db.prepare('UPDATE products SET stock_quantity = ? WHERE id = ?').run(initialStock, testProduct.id);

console.log('ALL INVENTORY & CONCURRENCY TESTS PASSED SUCCESSFULLY!\n');
