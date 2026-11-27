// Production Odoo 19 Community JSON-RPC Adapter
// Uses standard Odoo Community protocol with strict multi-company segregation and retail pricelist enforcement

const OdooAdapterInterface = require('./odooInterface');

class Odoo19RpcAdapter extends OdooAdapterInterface {
  constructor(config = {}) {
    super();
    this.url = (config.url || process.env.ODOO_URL || '').replace(/\/+$/, '');
    this.db = config.db || process.env.ODOO_DB || '';
    this.username = config.username || process.env.ODOO_USERNAME || '';
    this.apiKey = config.apiKey || process.env.ODOO_API_KEY || '';
    
    // Explicit Company & Pricelist Enforcement (Confirmed Business Requirements)
    this.retailCompanyId = parseInt(config.retailCompanyId || process.env.ODOO_RETAIL_COMPANY_ID || '1', 10);
    this.retailPricelistId = parseInt(config.retailPricelistId || process.env.ODOO_RETAIL_PRICELIST_ID || '1', 10);
    this.retailWarehouseId = parseInt(config.retailWarehouseId || process.env.ODOO_RETAIL_WAREHOUSE_ID || '1', 10);
    
    this.timeoutMs = parseInt(config.timeoutMs || '15000', 10);
    this.uid = null;
  }

  /**
   * Execute JSON-RPC request to Odoo endpoint
   */
  async _jsonRpc(endpoint, params = {}) {
    if (!this.url) {
      throw new Error('Odoo URL is not configured. Please set ODOO_URL.');
    }

    const fullUrl = `${this.url}${endpoint}`;
    const payload = {
      jsonrpc: '2.0',
      method: 'call',
      params: params,
      id: Math.floor(Math.random() * 1000000)
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP Error from Odoo server: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();

      if (json.error) {
        const errData = json.error.data || {};
        const message = errData.message || json.error.message || 'Unknown Odoo RPC error';
        throw new Error(`Odoo RPC Error: ${message}`);
      }

      return json.result;
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error(`Odoo API request timed out after ${this.timeoutMs}ms.`);
      }
      throw err;
    }
  }

  /**
   * Authenticate with Odoo 19 Community
   */
  async authenticate() {
    if (this.uid) return this.uid;

    if (!this.db || !this.username || !this.apiKey) {
      throw new Error('Missing Odoo credentials (ODOO_DB, ODOO_USERNAME, or ODOO_API_KEY).');
    }

    const uid = await this._jsonRpc('/jsonrpc', {
      service: 'common',
      method: 'authenticate',
      args: [this.db, this.username, this.apiKey, {}]
    });

    if (!uid) {
      throw new Error('Authentication failed with Odoo 19. Check username and API key.');
    }

    this.uid = uid;
    return this.uid;
  }

  /**
   * Execute an Odoo model method via execute_kw with company context
   */
  async executeKw(model, method, args = [], kwargs = {}) {
    const uid = await this.authenticate();

    // Strictly enforce Retail Company and Retail Pricelist in context!
    const context = {
      ...(kwargs.context || {}),
      company_id: this.retailCompanyId,
      allowed_company_ids: [this.retailCompanyId],
      pricelist: this.retailPricelistId
    };

    const mergedKwargs = {
      ...kwargs,
      context
    };

    return await this._jsonRpc('/jsonrpc', {
      service: 'object',
      method: 'execute_kw',
      args: [this.db, uid, this.apiKey, model, method, args, mergedKwargs]
    });
  }

  /**
   * Test Connection to Odoo ERP
   */
  async testConnection() {
    try {
      const uid = await this.authenticate();

      // Verify company configuration and user access rights
      const companies = await this.executeKw('res.company', 'read', [[this.retailCompanyId]], {
        fields: ['name', 'currency_id', 'country_id']
      });

      const companyName = companies && companies.length > 0 ? companies[0].name : `Company #${this.retailCompanyId}`;

      return {
        success: true,
        mode: 'live',
        odooVersion: '19.0 Community',
        uid,
        company: companyName,
        companyId: this.retailCompanyId,
        pricelistId: this.retailPricelistId,
        warehouseId: this.retailWarehouseId,
        message: `Successfully connected to live Odoo 19 Community under Retail Company '${companyName}'.`
      };
    } catch (err) {
      return {
        success: false,
        mode: 'live',
        error: err.message,
        message: `Failed to connect to Odoo 19: ${err.message}`
      };
    }
  }

  /**
   * Synchronize stock levels from Odoo Retail Warehouse
   */
  /** Odoo products that can be sold (read only) — used to link website products to Odoo products. */
  async listProducts() {
    await this.authenticate();
    return this.executeKw('product.product', 'search_read', [[['active', '=', true], ['sale_ok', '=', true]]], {
      fields: ['id', 'name', 'default_code', 'barcode', 'qty_available', 'free_qty', 'list_price'],
      context: { warehouse: this.retailWarehouseId, allowed_company_ids: [this.retailCompanyId] },
      limit: 2000, order: 'name'
    });
  }

  async syncStockLevels(skus = [], ids = []) {
    await this.authenticate();

    const domain = [
      ['active', '=', true]
    ];

    // Products linked by Odoo ID, plus products whose Internal Reference equals the website SKU
    if (ids && ids.length > 0 && skus && skus.length > 0) {
      domain.push('|', ['id', 'in', ids], ['default_code', 'in', skus]);
    } else if (ids && ids.length > 0) {
      domain.push(['id', 'in', ids]);
    } else if (skus && skus.length > 0) {
      domain.push(['default_code', 'in', skus]);
    }

    // Read products with retail warehouse inventory context
    const products = await this.executeKw('product.product', 'search_read', [domain], {
      fields: ['id', 'default_code', 'qty_available', 'free_qty'],
      context: { warehouse: this.retailWarehouseId }
    });

    const stockMap = {}, idStock = {};
    for (const p of products) {
      // free_qty = on hand minus stock already reserved for other orders in this warehouse
      const qty = Math.max(0, Math.floor((typeof p.free_qty === 'number') ? p.free_qty : (p.qty_available || 0)));
      idStock[p.id] = qty;
      if (p.default_code) stockMap[p.default_code] = qty;
    }

    return {
      success: true,
      updated: Object.keys(stockMap).length,
      stockMap, idStock,
      syncedAt: new Date().toISOString()
    };
  }

  /**
   * Create Sales Order in Odoo under Retail Company
   */
  async createSaleOrder(orderData) {
    await this.authenticate();

    const {
      orderNumber,
      customerName,
      customerPhone,
      customerEmail,
      deliveryGovernorate,
      deliveryCity,
      deliveryAddress,
      items,
      paymentMethod,
      orderSource
    } = orderData;

    // 1. Idempotency check: Look for existing sale order with this client_order_ref
    const existingOrders = await this.executeKw('sale.order', 'search_read', [
      [['client_order_ref', '=', orderNumber], ['company_id', '=', this.retailCompanyId]]
    ], { fields: ['id', 'name', 'state'], limit: 1 });

    if (existingOrders && existingOrders.length > 0) {
      const existing = existingOrders[0];
      return {
        success: true,
        isDuplicate: true,
        saleOrderId: existing.id,
        saleOrderName: existing.name,
        state: existing.state,
        message: 'Order already exists in Odoo (Idempotent response).'
      };
    }

    // 2. Find or create Customer Partner under Retail Company
    let partnerId = null;
    const partnerDomain = [
      ['company_id', 'in', [this.retailCompanyId, false]]
    ];

    if (customerPhone) {
      partnerDomain.push(['phone', '=', customerPhone]);
    } else if (customerEmail) {
      partnerDomain.push(['email', '=', customerEmail]);
    }

    const existingPartners = await this.executeKw('res.partner', 'search_read', [partnerDomain], {
      fields: ['id', 'name'],
      limit: 1
    });

    if (existingPartners && existingPartners.length > 0) {
      partnerId = existingPartners[0].id;
    } else {
      partnerId = await this.executeKw('res.partner', 'create', [{
        name: customerName,
        phone: customerPhone,
        email: customerEmail || undefined,
        street: deliveryAddress,
        city: deliveryCity,
        state_id: false, // Can map to Odoo country states if needed
        country_id: false,
        customer_rank: 1,
        company_id: this.retailCompanyId
      }]);
    }

    // 3. Resolve Odoo products: the product linked in admin (odoo_product_id) first, else Internal Reference = SKU
    const skuToProductId = new Map();
    items.forEach(it => { if (it.odoo_product_id) skuToProductId.set(it.sku, Number(it.odoo_product_id)); });
    const skus = items.filter(it => !skuToProductId.has(it.sku)).map(it => it.sku);
    if (skus.length) {
      const odooProducts = await this.executeKw('product.product', 'search_read', [
        [['default_code', 'in', skus]]
      ], { fields: ['id', 'default_code', 'name'] });
      odooProducts.forEach(op => { skuToProductId.set(op.default_code, op.id); });
    }

    // 4. Build Sales Order Lines
    const orderLines = [];
    for (const item of items) {
      const odooProdId = skuToProductId.get(item.sku);
      if (!odooProdId) {
        throw new Error(`Product '${item.name_en}' (SKU ${item.sku}) is not linked to an Odoo product. Link it in Admin → Odoo sync → Product links.`);
      }

      orderLines.push([0, 0, {
        product_id: odooProdId,
        product_uom_qty: item.quantity,
        price_unit: item.unit_price_baisa / 1000, // Convert Baisa to OMR
        name: item.name_en
      }]);
    }

    // 5. Create the Sales Order under Retail Company
    const saleOrderPayload = {
      partner_id: partnerId,
      company_id: this.retailCompanyId,
      pricelist_id: this.retailPricelistId,
      warehouse_id: this.retailWarehouseId,
      client_order_ref: orderNumber,
      origin: `Website Checkout #${orderNumber}`,
      payment_term_id: false,
      note: `Payment Method: ${({ cod: 'Cash on Delivery (COD)', thawani: 'Thawani Online Gateway (PAID)', bank_transfer: 'Bank Transfer (PAID)', cash: 'Cash (PAID)' }[paymentMethod] || paymentMethod)} | Delivery: ${deliveryGovernorate}, ${deliveryCity}${orderSource && orderSource !== 'website' ? ` | Order via ${orderSource}` : ''}`,
      order_line: orderLines
    };

    const saleOrderId = await this.executeKw('sale.order', 'create', [saleOrderPayload]);

    // Read the created order to retrieve Odoo's assigned SO sequence name (e.g., SO0042)
    const createdOrder = await this.executeKw('sale.order', 'read', [[saleOrderId]], {
      fields: ['name', 'state']
    });

    const saleOrderName = createdOrder && createdOrder.length > 0 ? createdOrder[0].name : `SO#${saleOrderId}`;

    return {
      success: true,
      saleOrderId,
      saleOrderName,
      state: 'draft',
      companyId: this.retailCompanyId,
      pricelistId: this.retailPricelistId,
      message: `Created Sales Order ${saleOrderName} in Odoo 19 Community.`
    };
  }

  /**
   * Check status of a Sales Order in Odoo
   */
  async getOrderStatus(saleOrderId) {
    const orders = await this.executeKw('sale.order', 'read', [[parseInt(saleOrderId)]], {
      fields: ['id', 'name', 'state', 'invoice_status', 'delivery_status']
    });

    if (!orders || orders.length === 0) {
      throw new Error(`Sales Order ID ${saleOrderId} not found in Odoo.`);
    }

    const ord = orders[0];
    return {
      success: true,
      saleOrderId: ord.id,
      saleOrderName: ord.name,
      state: ord.state,
      invoiceStatus: ord.invoice_status,
      deliveryStatus: ord.delivery_status || (ord.state === 'sale' ? 'ready' : 'pending')
    };
  }
}

module.exports = Odoo19RpcAdapter;
