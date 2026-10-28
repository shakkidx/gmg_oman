// Abstract Interface & Contract for Odoo 19 ERP Integration

class OdooAdapterInterface {
  /**
   * Test connection to Odoo instance and verify user credentials & company rights
   * @returns {Promise<{ success: boolean, company: string, version: string, message: string }>}
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented');
  }

  /**
   * Synchronize stock quantities for given SKUs or all products
   * @param {string[]} [skus] 
   * @returns {Promise<{ updated: number, stockMap: Record<string, number> }>}
   */
  async syncStockLevels(skus = []) {
    throw new Error('syncStockLevels() must be implemented');
  }

  /**
   * Create an authoritative Sales Order in Odoo under Retail Company
   * @param {Object} orderData 
   * @returns {Promise<{ success: boolean, saleOrderId: number, saleOrderName: string, state: string }>}
   */
  async createSaleOrder(orderData) {
    throw new Error('createSaleOrder() must be implemented');
  }

  /**
   * Check status of a Sales Order in Odoo
   * @param {number|string} saleOrderId 
   * @returns {Promise<{ saleOrderId: number, state: string, invoiceStatus: string }>}
   */
  async getOrderStatus(saleOrderId) {
    throw new Error('getOrderStatus() must be implemented');
  }
}

module.exports = OdooAdapterInterface;
