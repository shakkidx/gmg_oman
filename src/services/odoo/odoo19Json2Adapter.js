// Official Odoo 19 JSON-2 API Client Adapter
// Target Endpoint: /json/2/<model>/<method>
// Incorporates strict company scoping to the dedicated Retail Company and retail pricelist isolation

const OdooAdapterInterface = require('./odooInterface');

class Odoo19Json2Adapter extends OdooAdapterInterface {
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
  }

  /**
   * Execute request against Odoo 19 JSON-2 endpoint (/json/2/<model>/<method>)
   */
  async _callJson2(model, method, payload = {}) {
    if (!this.url) {
      throw new Error('Odoo URL is not configured. Please set ODOO_URL.');
    }
    if (!this.apiKey) {
      throw new Error('Odoo API Key is not configured. Please set ODOO_API_KEY.');
    }

    const endpoint = `${this.url}/json/2/${model}/${method}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    // Enforce company context on all JSON-2 requests
    const context = {
      ...(payload.context || {}),
      company_id: this.retailCompanyId,
      allowed_company_ids: [this.retailCompanyId],
      pricelist: this.retailPricelistId
    };

    const requestBody = {
      ...payload,
      context
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Odoo-Database': this.db
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Odoo 19 JSON-2 Error (HTTP ${response.status}): ${errorText}`);
      }

      const json = await response.json();
      if (json.error) {
        throw new Error(`Odoo 19 Error: ${json.error.message || JSON.stringify(json.error)}`);
      }

      return json.result !== undefined ? json.result : json;
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error(`Odoo JSON-2 request to ${model}/${method} timed out after ${this.timeoutMs}ms.`);
      }
      throw err;
    }
  }

  /**
   * Test Connection and Company Validation
   */
  async testConnection() {
    try {
      const companies = await this._callJson2('res.company', 'search_read', {
        domain: [['id', '=', this.retailCompanyId]],
        fields: ['name', 'currency_id', 'country_id']
      });

      if (!companies || companies.length === 0) {
        return {
          success: false,
          mode: 'live_json2',
          error: `Company ID ${this.retailCompanyId} not found or inaccessible with current API key.`
        };
      }

      const company = companies[0];

      return {
        success: true,
        mode: 'live_json2',
        protocol: 'Odoo 19 JSON-2 API (/json/2/)',
        odooVersion: '19.0 Community',
        company: company.name,
        companyId: this.retailCompanyId,
        pricelistId: this.retailPricelistId,
        warehouseId: this.retailWarehouseId,
        message: `Successfully authenticated via Odoo 19 JSON-2 API under Retail Company '${company.name}'.`
      };
    } catch (err) {
      return {
        success: false,
        mode: 'live_json2',
        protocol: 'Odoo 19 JSON-2 API (/json/2/)',
        error: err.message,
        message: `Odoo 19 JSON-2 connection failed: ${err.message}`
      };
    }
  }

  /**
   * Synchronize stock levels via JSON-2
   */
  async syncStockLevels(skus = []) {
    const domain = [['active', '=', true]];
    if (skus && skus.length > 0) {
      domain.push(['default_code', 'in', skus]);
    }

    const products = await this._callJson2('product.product', 'search_read', {
      domain,
      fields: ['id', 'default_code', 'qty_available', 'free_qty'],
      context: { warehouse: this.retailWarehouseId }
    });

    const stockMap = {};
    for (const p of products) {
      if (p.default_code) {
        stockMap[p.default_code] = Math.max(0, Math.floor(typeof p.free_qty === 'number' ? p.free_qty : (p.qty_available || 0)));
      }
    }

    return {
      success: true,
      updated: Object.keys(stockMap).length,
      stockMap,
      syncedAt: new Date().toISOString()
    };
  }

  /**
   * Create Retail Sales Order via JSON-2
   */
  async createSaleOrder(orderData) {
    const {
      orderNumber,
      customerName,
      customerPhone,
      customerEmail,
      deliveryGovernorate,
      deliveryCity,
      deliveryAddress,
      items,
      paymentMethod
    } = orderData;

    // 1. Idempotency check: Look for existing sale order with client_order_ref
    const existing = await this._callJson2('sale.order', 'search_read', {
      domain: [
        ['client_order_ref', '=', orderNumber],
        ['company_id', '=', this.retailCompanyId]
      ],
      fields: ['id', 'name', 'state'],
      limit: 1
    });

    if (existing && existing.length > 0) {
      return {
        success: true,
        isDuplicate: true,
        saleOrderId: existing[0].id,
        saleOrderName: existing[0].name,
        state: existing[0].state,
        message: 'Order already exists in Odoo 19 (Idempotent replay).'
      };
    }

    // 2. Find or create Partner under Retail Company
    const partnerDomain = [['company_id', 'in', [this.retailCompanyId, false]]];
    if (customerPhone) partnerDomain.push(['phone', '=', customerPhone]);
    else if (customerEmail) partnerDomain.push(['email', '=', customerEmail]);

    const partners = await this._callJson2('res.partner', 'search_read', {
      domain: partnerDomain,
      fields: ['id', 'name'],
      limit: 1
    });

    let partnerId;
    if (partners && partners.length > 0) {
      partnerId = partners[0].id;
    } else {
      partnerId = await this._callJson2('res.partner', 'create', {
        vals_list: [{
          name: customerName,
          phone: customerPhone,
          email: customerEmail || undefined,
          street: deliveryAddress,
          city: deliveryCity,
          state_id: false,
          customer_rank: 1,
          company_id: this.retailCompanyId
        }]
      });
      if (Array.isArray(partnerId)) partnerId = partnerId[0];
    }

    // 3. Resolve Product IDs in Odoo by SKU
    const skus = items.map(it => it.sku);
    const odooProducts = await this._callJson2('product.product', 'search_read', {
      domain: [['default_code', 'in', skus]],
      fields: ['id', 'default_code', 'name']
    });

    const skuMap = new Map();
    odooProducts.forEach(p => skuMap.set(p.default_code, p.id));

    // 4. Construct Order Lines
    const orderLines = [];
    for (const item of items) {
      const pId = skuMap.get(item.sku);
      if (!pId) {
        throw new Error(`SKU '${item.sku}' could not be resolved in Odoo product catalogue.`);
      }

      orderLines.push([0, 0, {
        product_id: pId,
        product_uom_qty: item.quantity,
        price_unit: item.unit_price_baisa / 1000, // Baisa to OMR
        name: item.name_en
      }]);
    }

    // 5. Create Sale Order
    const saleOrderPayload = {
      vals_list: [{
        partner_id: partnerId,
        company_id: this.retailCompanyId,
        pricelist_id: this.retailPricelistId,
        warehouse_id: this.retailWarehouseId,
        client_order_ref: orderNumber,
        origin: `Website Checkout #${orderNumber}`,
        note: `Payment: ${paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Thawani Online Gateway'} | Delivery: ${deliveryGovernorate}, ${deliveryCity}`,
        order_line: orderLines
      }]
    };

    let saleOrderId = await this._callJson2('sale.order', 'create', saleOrderPayload);
    if (Array.isArray(saleOrderId)) saleOrderId = saleOrderId[0];

    // Read assigned name
    const created = await this._callJson2('sale.order', 'search_read', {
      domain: [['id', '=', saleOrderId]],
      fields: ['name', 'state']
    });

    const saleOrderName = created && created.length > 0 ? created[0].name : `SO#${saleOrderId}`;

    return {
      success: true,
      saleOrderId,
      saleOrderName,
      state: 'draft',
      companyId: this.retailCompanyId,
      pricelistId: this.retailPricelistId,
      message: `Created Sales Order ${saleOrderName} via Odoo 19 JSON-2 API.`
    };
  }

  /**
   * Check status of a Sales Order
   */
  async getOrderStatus(saleOrderId) {
    const orders = await this._callJson2('sale.order', 'search_read', {
      domain: [['id', '=', parseInt(saleOrderId, 10)]],
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

module.exports = Odoo19Json2Adapter;
