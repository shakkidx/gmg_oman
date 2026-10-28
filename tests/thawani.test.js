// Thawani Pay Integration Test Suite

const assert = require('assert');
const ThawaniService = require('../src/services/thawani/thawaniService');
const { getDatabase } = require('../src/config/database');

console.log('--- RUNNING THAWANI PAY TESTS ---');

// 1. Verify Configuration
const config = ThawaniService.getConfig();
assert.ok(config, 'Thawani config must exist');
assert.strictEqual(config.mode, 'sandbox', 'Initial mode should be sandbox');
assert.ok(config.apiBaseUrl.includes('uatcheckout.thawani.om'), 'Sandbox URL must point to uatcheckout');
console.log(`✓ Thawani mode: ${config.mode} (${config.apiBaseUrl})`);

// 2. Test Baisa Amount Formatting for Line Items
const sampleItems = [
  { sku: 'ACC-PB-001', name_en: 'Titanium MagCharge Pro', unit_price_baisa: 21900, quantity: 1 },
  { sku: 'ACC-CB-003', name_en: 'Kevlar Armor Cable', unit_price_baisa: 8500, quantity: 2 }
];

let computedBaisa = 0;
sampleItems.forEach(it => {
  assert.strictEqual(Number.isInteger(it.unit_price_baisa), true, 'Thawani amount must be an integer');
  computedBaisa += it.unit_price_baisa * it.quantity;
});

// Total: 21900 + 17000 = 38900 Baisa = 38.900 OMR
assert.strictEqual(computedBaisa, 38900, 'Line items sum must be 38900 Baisa (38.900 OMR)');
console.log('✓ Thawani integer Baisa line item validation passed');

// 3. Test Webhook Processing & Deduplication
async function testWebhook() {
  const db = getDatabase();
  const testOrderId = `THW-TEST-${Date.now()}`;

  // Seed temporary order for webhook test
  db.prepare(`
    INSERT INTO orders (
      id, order_number, customer_name, customer_phone, delivery_governorate,
      delivery_city, delivery_address, subtotal_baisa, delivery_fee_baisa,
      vat_baisa, total_baisa, payment_method, payment_status, fulfillment_status
    ) VALUES (
      ?, ?, 'Test Customer', '+96896114412', 'Muscat', 'Bousher', 'Khuwair',
      38900, 1500, 1945, 42345, 'thawani', 'pending', 'pending'
    )
  `).run(testOrderId, testOrderId);

  const mockPayload = {
    event_type: 'payment_captured',
    data: { session_id: `sess_${testOrderId}`, client_reference_id: testOrderId, payment_status: 'paid', payment_id: 'inv_998877' }
  };
  db.prepare('UPDATE orders SET thawani_session_id = ? WHERE order_number = ?').run(`sess_${testOrderId}`, testOrderId);

  // The webhook body is never trusted: status is re-read from Thawani's API (mocked here).
  const realRequest = ThawaniService._request;
  ThawaniService._request = async () => ({ data: { payment_status: 'unpaid' } });
  const forged = await ThawaniService.processWebhook(mockPayload);
  assert.strictEqual(forged.isPaid, false);
  assert.strictEqual(db.prepare('SELECT payment_status FROM orders WHERE order_number = ?').get(testOrderId).payment_status, 'pending', 'Forged webhook must not mark order paid');
  console.log('✓ Forged webhook ignored (payment re-verified with Thawani API)');

  ThawaniService._request = async () => ({ data: { payment_status: 'paid', invoice: 'inv_998877' } });
  const res1 = await ThawaniService.processWebhook(mockPayload);
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.isPaid, true);
  const updatedOrder = db.prepare('SELECT payment_status, fulfillment_status FROM orders WHERE order_number = ?').get(testOrderId);
  assert.strictEqual(updatedOrder.payment_status, 'paid');
  assert.strictEqual(updatedOrder.fulfillment_status, 'confirmed');
  console.log('✓ Verified webhook captured payment and confirmed order');

  // Duplicate delivery: stays paid, payment event recorded only once
  await ThawaniService.processWebhook(mockPayload);
  const events = db.prepare("SELECT COUNT(*) AS c FROM order_events WHERE order_id = ? AND event_type = 'payment_verified'").get(testOrderId).c;
  assert.strictEqual(events, 1, 'Duplicate webhook must not record payment twice');
  console.log('✓ Webhook duplicate event idempotency verified');
  ThawaniService._request = realRequest;
}

testWebhook().then(() => {
  console.log('ALL THAWANI PAY TESTS PASSED SUCCESSFULLY!\n');
}).catch(err => {
  console.error('Thawani test error:', err);
  process.exit(1);
});
