// Odoo Adapter & Two-Company Segregation Test Suite

const assert = require('assert');
const MockOdooAdapter = require('../src/services/odoo/mockOdooAdapter');

async function runOdooTests() {
  console.log('--- RUNNING ODOO 19 INTEGRATION TESTS ---');

  const adapter = new MockOdooAdapter({
    retailCompanyId: 1,
    wholesaleCompanyId: 2,
    retailPricelistId: 1,
    retailWarehouseId: 1
  });

  // 1. Test Connection & Health Check
  const conn = await adapter.testConnection();
  assert.strictEqual(conn.success, true, 'Connection test must succeed');
  assert.strictEqual(conn.companyId, 1, 'Must connect strictly to Retail Company (ID: 1)');
  assert.strictEqual(conn.pricelistId, 1, 'Must use Retail Pricelist (ID: 1)');
  console.log(`✓ Connected to ${conn.company} under Retail Company ID: ${conn.companyId}`);

  // 2. Test Stock Synchronization
  const stockResult = await adapter.syncStockLevels(['ACC-PB-001', 'ACC-CH-002']);
  assert.strictEqual(stockResult.success, true);
  assert.ok(stockResult.stockMap['ACC-PB-001'] > 0);
  console.log(`✓ Stock sync verified: ACC-PB-001 = ${stockResult.stockMap['ACC-PB-001']} units`);

  // 3. Test Sales Order Creation under Retail Company
  const orderNumber = `TEST-GMG-${Date.now()}`;
  const orderPayload = {
    orderNumber,
    customerName: 'Abeer Al-Rashdi',
    customerPhone: '+968 96114412',
    customerEmail: 'customer@globalmarketsgateway.om',
    deliveryGovernorate: 'Muscat',
    deliveryCity: 'Bousher',
    deliveryAddress: 'South Al Khuwair, Way 3302',
    items: [
      {
        sku: 'ACC-PB-001',
        name_en: 'Titanium MagCharge Pro 10,000mAh Power Bank',
        unit_price_baisa: 21900,
        quantity: 1
      }
    ],
    totalBaisa: 23400,
    paymentMethod: 'thawani',
    idempotencyKey: `idemp_${orderNumber}`
  };

  const createResult = await adapter.createSaleOrder(orderPayload);
  assert.strictEqual(createResult.success, true);
  assert.strictEqual(createResult.companyId, 1, 'Order must be assigned to Retail Company');
  assert.strictEqual(createResult.state, 'sale');
  assert.ok(createResult.saleOrderId > 0);
  console.log(`✓ Created Odoo Sales Order: ${createResult.saleOrderName} (ID: ${createResult.saleOrderId})`);

  // 4. Test Idempotency Guard (Duplicate Submission)
  const duplicateResult = await adapter.createSaleOrder(orderPayload);
  assert.strictEqual(duplicateResult.success, true);
  assert.strictEqual(duplicateResult.isDuplicate, true, 'Duplicate order must be flagged as idempotent replay');
  assert.strictEqual(duplicateResult.saleOrderId, createResult.saleOrderId, 'Duplicate submission must return original sale order ID');
  console.log(`✓ Idempotency verified: Duplicate order returned existing ID without re-creating order.`);

  // 5. Test Status Query
  const statusResult = await adapter.getOrderStatus(createResult.saleOrderId);
  assert.strictEqual(statusResult.success, true);
  assert.strictEqual(statusResult.state, 'sale');
  console.log(`✓ Order status retrieved from Odoo: state = ${statusResult.state}, invoice = ${statusResult.invoiceStatus}`);

  console.log('ALL ODOO 19 INTEGRATION TESTS PASSED SUCCESSFULLY!\n');
}

runOdooTests().catch(err => {
  console.error('Odoo tests failed:', err);
  process.exit(1);
});
