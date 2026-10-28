// High-Fidelity Mock Odoo 19 Community Adapter
// Clearly labelled as DEMO / MOCK for development, automated testing, and offline verification

const OdooAdapterInterface = require('./odooInterface');

class MockOdooAdapter extends OdooAdapterInterface {
  constructor(config = {}) {
    super();
    this.config = {
      retailCompanyId: config.retailCompanyId || 1,
      wholesaleCompanyId: config.wholesaleCompanyId || 2,
      retailPricelistId: config.retailPricelistId || 1,
      retailWarehouseId: config.retailWarehouseId || 1,
      ...config
    };

    // Simulated Odoo 19 In-Memory State
    this.simulatedCompany = {
      id: this.config.retailCompanyId,
      name: 'Global Markets Gateway Retail LLC (Oman)',
      currency: 'OMR',
      country: 'Oman',
      vat_number: 'OM1100223344'
    };

    this.simulatedSalesOrders = new Map();
    this.simulatedStock = new Map();
    this.orderCounter = 1000;

    // Pre-populate realistic stock quantities for our 16 products
    const initialSkus = [
      'ACC-PB-001', 'ACC-CH-002', 'ACC-CB-003', 'AUD-EB-004',
      'ACC-CR-005', 'ACC-WL-006', 'CAS-AR-007', 'CAS-SM-008',
      'ACC-DS-009', 'AUD-HP-010', 'ACC-SP-011', 'ACC-CH-012',
      'ACC-CB-013', 'ACC-PD-014', 'ACC-BM-015', 'ACC-WC-016'
    ];

    initialSkus.forEach((sku, idx) => {
      this.simulatedStock.set(sku, 25 + (idx * 5));
    });
  }

  /**
   * Test Connection to Odoo ERP
   */
  async testConnection() {
    // Simulate brief network latency
    await new Promise(r => setTimeout(r, 60));

    return {
      success: true,
      mode: 'mock',
      odooVersion: '19.0 Community (Simulated)',
      company: this.simulatedCompany.name,
      companyId: this.config.retailCompanyId,
      pricelistId: this.config.retailPricelistId,
      warehouseId: this.config.retailWarehouseId,
      currency: 'OMR',
      message: 'Connected successfully to simulated Odoo 19 Community environment under dedicated Retail Company.'
    };
  }

  /**
   * Synchronize stock levels from Odoo Retail Warehouse
   */
  async syncStockLevels(skus = []) {
    await new Promise(r => setTimeout(r, 80));

    const stockMap = {};
    const targetSkus = skus.length > 0 ? skus : Array.from(this.simulatedStock.keys());

    targetSkus.forEach(sku => {
      stockMap[sku] = this.simulatedStock.get(sku) || 15;
    });

    return {
      success: true,
      updated: Object.keys(stockMap).length,
      stockMap,
      syncedAt: new Date().toISOString()
    };
  }

  /**
   * Create Sales Order in Odoo under Retail Company
   */
  async createSaleOrder(orderData) {
    await new Promise(r => setTimeout(r, 120));

    const {
      orderNumber,
      customerName,
      customerPhone,
      customerEmail,
      deliveryGovernorate,
      deliveryCity,
      deliveryAddress,
      items,
      totalBaisa,
      paymentMethod,
      idempotencyKey
    } = orderData;

    // 1. Idempotency safeguard: if order already exists in simulated Odoo, return it
    if (this.simulatedSalesOrders.has(orderNumber)) {
      const existing = this.simulatedSalesOrders.get(orderNumber);
      return {
        success: true,
        isDuplicate: true,
        saleOrderId: existing.id,
        saleOrderName: existing.name,
        state: existing.state,
        message: 'Order already synchronized in Odoo (Idempotent replay).'
      };
    }

    // 2. Validate stock availability before creating order in Odoo
    for (const item of items) {
      const currentStock = this.simulatedStock.get(item.sku);
      if (currentStock !== undefined && currentStock < item.quantity) {
        throw new Error(`Insufficient Odoo stock for SKU ${item.sku}. Requested: ${item.quantity}, Available: ${currentStock}`);
      }
    }

    // 3. Deduct stock in simulated Odoo Retail Warehouse
    for (const item of items) {
      if (this.simulatedStock.has(item.sku)) {
        const cur = this.simulatedStock.get(item.sku);
        this.simulatedStock.set(item.sku, Math.max(0, cur - item.quantity));
      }
    }

    // 4. Generate Odoo Sales Order
    this.orderCounter += 1;
    const saleOrderId = 5000 + this.orderCounter;
    const saleOrderName = `SO/OMR/${new Date().getFullYear()}/${this.orderCounter}`;

    const odooOrder = {
      id: saleOrderId,
      name: saleOrderName,
      origin: `Website Order #${orderNumber}`,
      client_order_ref: orderNumber,
      company_id: [this.config.retailCompanyId, this.simulatedCompany.name],
      pricelist_id: [this.config.retailPricelistId, 'Retail Consumer Pricelist (OMR)'],
      warehouse_id: [this.config.retailWarehouseId, 'Muscat Central Retail Warehouse'],
      partner_id: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        street: deliveryAddress,
        city: deliveryCity,
        state: deliveryGovernorate,
        country: 'Oman'
      },
      order_line: items.map((it, idx) => ({
        id: saleOrderId * 10 + idx,
        product_sku: it.sku,
        name: it.name_en,
        product_uom_qty: it.quantity,
        price_unit_omr: it.unit_price_baisa / 1000,
        price_subtotal_omr: (it.unit_price_baisa * it.quantity) / 1000
      })),
      amount_total_omr: totalBaisa / 1000,
      payment_term: paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Thawani Online Gateway',
      state: 'sale', // Odoo confirmed sales order
      invoice_status: 'to invoice',
      idempotency_key: idempotencyKey,
      created_at: new Date().toISOString()
    };

    this.simulatedSalesOrders.set(orderNumber, odooOrder);

    return {
      success: true,
      saleOrderId,
      saleOrderName,
      state: 'sale',
      companyId: this.config.retailCompanyId,
      pricelistId: this.config.retailPricelistId,
      message: `Odoo Sales Order ${saleOrderName} created successfully under Retail Company.`
    };
  }

  /**
   * Check status of an order in Odoo
   */
  async getOrderStatus(saleOrderId) {
    await new Promise(r => setTimeout(r, 50));

    // Find in simulated map
    for (const [orderNum, ord] of this.simulatedSalesOrders.entries()) {
      if (ord.id === parseInt(saleOrderId) || ord.name === saleOrderId) {
        return {
          success: true,
          saleOrderId: ord.id,
          saleOrderName: ord.name,
          state: ord.state, // 'draft', 'sent', 'sale', 'done', 'cancel'
          invoiceStatus: ord.invoice_status,
          deliveryStatus: ord.state === 'sale' ? 'ready_to_ship' : 'pending'
        };
      }
    }

    return {
      success: true,
      saleOrderId: parseInt(saleOrderId) || 5001,
      saleOrderName: `SO/OMR/${new Date().getFullYear()}/MOCK`,
      state: 'sale',
      invoiceStatus: 'to invoice',
      deliveryStatus: 'ready_to_ship'
    };
  }
}

module.exports = MockOdooAdapter;
