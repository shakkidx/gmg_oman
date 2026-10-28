// Unit Tests: Financial Precision & Baisa Calculations

const assert = require('assert');
const PricingService = require('../src/services/pricingService');

console.log('--- RUNNING PRICING & FINANCIAL TESTS ---');

// 1. OMR to Baisa conversion
assert.strictEqual(PricingService.omrToBaisa(14.5), 14500, '14.500 OMR must equal 14500 Baisa');
assert.strictEqual(PricingService.omrToBaisa('0.250'), 250, '0.250 OMR must equal 250 Baisa');
assert.strictEqual(PricingService.omrToBaisa(0), 0, '0 OMR must equal 0 Baisa');
console.log('✓ OMR to Baisa conversion passed');

// 2. Baisa to OMR conversion
assert.strictEqual(PricingService.baisaToOmr(14500), 14.5, '14500 Baisa must equal 14.5 OMR');
assert.strictEqual(PricingService.baisaToOmr(750), 0.75, '750 Baisa must equal 0.75 OMR');
console.log('✓ Baisa to OMR conversion passed');

// 3. Formatting with 3 decimal places
assert.strictEqual(PricingService.formatOmr(14500, 'en'), 'OMR 14.500', 'English format must have 3 decimal places');
assert.strictEqual(PricingService.formatOmr(14500, 'ar'), '14.500 ر.ع.', 'Arabic format must have 3 decimal places');
assert.strictEqual(PricingService.formatOmr(900, 'en'), 'OMR 0.900', 'Sub-OMR values must have 3 decimal places');
console.log('✓ 3-decimal currency formatting passed');

// 4. Oman 5% VAT calculation
assert.strictEqual(PricingService.calculateVat(20000, 0.05), 1000, '5% VAT on 20.000 OMR (20000 Baisa) must equal 1000 Baisa (1.000 OMR)');
assert.strictEqual(PricingService.calculateVat(14500, 0.05), 725, '5% VAT on 14.500 OMR must equal 725 Baisa');
console.log('✓ Oman VAT calculation passed');

// 5. Gross Profit and Margin
const retailPrice = 24500; // 24.500 OMR
const costPrice = 12000;   // 12.000 OMR
const grossProfit = PricingService.calculateGrossProfit(retailPrice, costPrice);
assert.strictEqual(grossProfit, 12500, 'Gross profit must be 12500 Baisa (12.500 OMR)');

const grossMargin = PricingService.calculateGrossMarginPercent(retailPrice, costPrice);
assert.strictEqual(grossMargin, 51.02, 'Gross margin percent must be 51.02%');
console.log('✓ Gross Profit and Margin calculations passed');

// 6. Complete Order Totals Rollup
const orderCalc = PricingService.calculateOrderTotals({
  items: [
    { retail_price_baisa: 20000, sale_price_baisa: null, quantity: 1 },
    { retail_price_baisa: 10000, sale_price_baisa: 8000, quantity: 2 }
  ],
  deliveryFeeBaisa: 1500, // Muscat delivery
  discountBaisa: 1000,    // Coupon discount
  vatRate: 0.05
});

// Items total: 20000 + (8000 * 2) = 36000
assert.strictEqual(orderCalc.subtotalBaisa, 36000, 'Subtotal must be 36000 Baisa');
assert.strictEqual(orderCalc.discountedSubtotalBaisa, 35000, 'Discounted subtotal must be 35000 Baisa');
// VAT 5% on 35000 = 1750 Baisa
assert.strictEqual(orderCalc.vatBaisa, 1750, 'VAT must be 1750 Baisa');
// Total = 35000 + 1500 (delivery) + 1750 (VAT) = 38250 Baisa (38.250 OMR)
assert.strictEqual(orderCalc.totalBaisa, 38250, 'Total must equal 38250 Baisa (38.250 OMR)');
assert.strictEqual(orderCalc.totalOmrFormatted, 'OMR 38.250');
console.log('✓ Complete order totals rollup passed');

console.log('ALL PRICING & FINANCIAL TESTS PASSED SUCCESSFULLY!\n');
