// Financial & Minor-Unit Math Engine (1 OMR = 1000 Baisa)
// All storage and computations are executed using integer Baisa to eliminate floating-point drift.

const { BAISA_MULTIPLIER, DECIMAL_PLACES } = require('../config/constants');

class PricingService {
  /**
   * Convert OMR decimal (e.g., 14.500) to integer Baisa (14500)
   */
  static omrToBaisa(omrAmount) {
    if (omrAmount === null || omrAmount === undefined) return 0;
    const num = typeof omrAmount === 'string' ? parseFloat(omrAmount) : omrAmount;
    if (isNaN(num)) return 0;
    return Math.round(num * BAISA_MULTIPLIER);
  }

  /**
   * Convert integer Baisa (14500) to OMR float (14.5)
   */
  static baisaToOmr(baisa) {
    if (!baisa) return 0;
    return baisa / BAISA_MULTIPLIER;
  }

  /**
   * Format integer Baisa into human-readable currency string
   * e.g. 14500 -> "OMR 14.500" or Arabic "14.500 ر.ع."
   */
  static formatOmr(baisa, lang = 'en') {
    const omr = (baisa || 0) / BAISA_MULTIPLIER;
    const formatted = omr.toFixed(DECIMAL_PLACES);
    if (lang === 'ar') {
      return `${formatted} ر.ع.`;
    }
    return `OMR ${formatted}`;
  }

  /**
   * Calculate Oman VAT (standard 5%)
   * @param {number} subtotalBaisa 
   * @param {number} vatRate (default 0.05)
   * @returns {number} vatAmountBaisa (integer)
   */
  static calculateVat(subtotalBaisa, vatRate = 0.05) {
    return Math.round((subtotalBaisa || 0) * vatRate);
  }

  /**
   * Calculate Gross Profit in Baisa (Selling Price - Cost Price)
   */
  static calculateGrossProfit(sellingPriceBaisa, costPriceBaisa) {
    return (sellingPriceBaisa || 0) - (costPriceBaisa || 0);
  }

  /**
   * Calculate Gross Margin Percentage: ((Selling - Cost) / Selling) * 100
   */
  static calculateGrossMarginPercent(sellingPriceBaisa, costPriceBaisa) {
    if (!sellingPriceBaisa || sellingPriceBaisa <= 0) return 0;
    const profit = sellingPriceBaisa - (costPriceBaisa || 0);
    return parseFloat(((profit / sellingPriceBaisa) * 100).toFixed(2));
  }

  /**
   * Calculate Order Totals
   */
  static calculateOrderTotals({ items, deliveryFeeBaisa = 0, discountBaisa = 0, vatRate = 0.05, isVatInclusive = false }) {
    let subtotalBaisa = 0;

    for (const item of items) {
      const unitBaisa = item.sale_price_baisa && item.sale_price_baisa < item.retail_price_baisa
        ? item.sale_price_baisa
        : item.retail_price_baisa;
      const qty = item.quantity || 1;
      subtotalBaisa += unitBaisa * qty;
    }

    const discountedSubtotalBaisa = Math.max(0, subtotalBaisa - (discountBaisa || 0));
    
    // In Oman retail, VAT is typically either inclusive or calculated on subtotal
    const vatBaisa = isVatInclusive 
      ? Math.round(discountedSubtotalBaisa - (discountedSubtotalBaisa / (1 + vatRate)))
      : Math.round(discountedSubtotalBaisa * vatRate);

    const totalBaisa = isVatInclusive
      ? discountedSubtotalBaisa + deliveryFeeBaisa
      : discountedSubtotalBaisa + deliveryFeeBaisa + vatBaisa;

    return {
      subtotalBaisa,
      discountBaisa,
      discountedSubtotalBaisa,
      deliveryFeeBaisa,
      vatBaisa,
      isVatInclusive,
      totalBaisa,
      totalOmrFormatted: this.formatOmr(totalBaisa),
      subtotalOmrFormatted: this.formatOmr(subtotalBaisa),
      deliveryOmrFormatted: this.formatOmr(deliveryFeeBaisa),
      vatOmrFormatted: this.formatOmr(vatBaisa)
    };
  }
}

module.exports = PricingService;
