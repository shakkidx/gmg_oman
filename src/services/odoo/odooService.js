// Unified Odoo Service & Integration Manager
// Handles adapter dispatching (Mock vs Live), event logging, retry queues, and stock synchronization

const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../../config/database');
const MockOdooAdapter = require('./mockOdooAdapter');
const Odoo19RpcAdapter = require('./odoo19RpcAdapter');
const { unsyncedReservedBySku } = require('../inventoryService');

class OdooService {
  /**
   * Resolve active adapter based on database settings
   */
  static getAdapter() {
    const db = getDatabase();
    const settingsRows = db.prepare("SELECT key, value FROM settings WHERE category = 'odoo'").all();
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    const mode = settings.odoo_mode || 'mock';

    if (mode === 'live') {
      return {
        adapter: new Odoo19RpcAdapter({
          url: settings.odoo_url,
          db: settings.odoo_db,
          username: settings.odoo_username,
          apiKey: settings.odoo_api_key,
          retailCompanyId: settings.odoo_retail_company_id,
          retailPricelistId: settings.odoo_retail_pricelist_id,
          retailWarehouseId: settings.odoo_retail_warehouse_id
        }),
        mode: 'live',
        settings
      };
    }

    return {
      adapter: new MockOdooAdapter({
        retailCompanyId: parseInt(settings.odoo_retail_company_id || '1', 10),
        wholesaleCompanyId: parseInt(settings.odoo_wholesale_company_id || '2', 10),
        retailPricelistId: parseInt(settings.odoo_retail_pricelist_id || '1', 10),
        retailWarehouseId: parseInt(settings.odoo_retail_warehouse_id || '1', 10)
      }),
      mode: 'mock',
      settings
    };
  }

  /**
   * Log an integration event to the database
   */
  static logEvent({ eventType, referenceId, status, payload, response, errorMessage }) {
    try {
      const db = getDatabase();
      db.prepare(`
        INSERT INTO integration_events (
          id, service, event_type, reference_id, status, payload, response, error_message
        ) VALUES (?, 'odoo', ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        eventType,
        referenceId || null,
        status,
        payload ? JSON.stringify(payload) : null,
        response ? JSON.stringify(response) : null,
        errorMessage || null
      );
    } catch (e) {
      console.error('Failed to write integration log:', e.message);
    }
  }

  /**
   * Check connection and integration health
   */
  static async checkHealth() {
    const { adapter, mode, settings } = this.getAdapter();
    const startTime = Date.now();

    try {
      const result = await adapter.testConnection();
      const latencyMs = Date.now() - startTime;

      const healthData = {
        success: result.success,
        mode,
        latencyMs,
        company: result.company,
        companyId: result.companyId,
        pricelistId: result.pricelistId,
        warehouseId: result.warehouseId,
        odooVersion: result.odooVersion,
        message: result.message,
        lastChecked: new Date().toISOString()
      };

      // Update settings
      const db = getDatabase();
      db.prepare("UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'odoo_sync_health'")
        .run(result.success ? 'healthy' : 'offline');

      this.logEvent({
        eventType: 'health_check',
        referenceId: mode,
        status: result.success ? 'success' : 'failed',
        response: healthData,
        errorMessage: result.error
      });

      return healthData;
    } catch (err) {
      const errorData = {
        success: false,
        mode,
        latencyMs: Date.now() - startTime,
        error: err.message,
        lastChecked: new Date().toISOString()
      };

      const db = getDatabase();
      db.prepare("UPDATE settings SET value = 'offline', updated_at = CURRENT_TIMESTAMP WHERE key = 'odoo_sync_health'")
        .run();

      this.logEvent({
        eventType: 'health_check',
        referenceId: mode,
        status: 'failed',
        errorMessage: err.message
      });

      return errorData;
    }
  }

  /**
   * Synchronize inventory from Odoo Retail Warehouse into local website database
   */
  static async syncStock() {
    const { adapter, mode } = this.getAdapter();
    const db = getDatabase();

    // Fetch active product SKUs from local DB
    const localProducts = db.prepare('SELECT sku FROM products WHERE is_published = 1').all();
    const skus = localProducts.map(p => p.sku);

    try {
      const syncResult = await adapter.syncStockLevels(skus);
      let updatedCount = 0;

      const updateStmt = db.prepare(`
        UPDATE products 
        SET stock_quantity = ?, last_synced_at = CURRENT_TIMESTAMP, odoo_sync_status = 'synced'
        WHERE sku = ?
      `);

      const updateVariantStmt = db.prepare(`
        UPDATE product_variants
        SET stock_quantity = ?
        WHERE sku = ?
      `);

      // Website orders that are not in Odoo yet still hold stock — subtract them.
      const reserved = unsyncedReservedBySku();
      for (const [sku, odooQty] of Object.entries(syncResult.stockMap || {})) {
        const qty = Math.max(0, odooQty - (reserved[sku] || 0));
        const res = updateStmt.run(qty, sku);
        if (res.changes > 0) {
          updatedCount += res.changes;
        }
        updateVariantStmt.run(qty, sku);
      }

      // Record timestamp
      db.prepare("UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'odoo_last_sync_timestamp'")
        .run(new Date().toISOString());

      this.logEvent({
        eventType: 'stock_sync',
        referenceId: `count_${updatedCount}`,
        status: 'success',
        payload: { requestedSkusCount: skus.length },
        response: { updatedCount, mode }
      });

      return {
        success: true,
        mode,
        updatedCount,
        syncedAt: new Date().toISOString()
      };
    } catch (err) {
      this.logEvent({
        eventType: 'stock_sync',
        referenceId: 'error',
        status: 'failed',
        errorMessage: err.message
      });

      throw err;
    }
  }

  /**
   * Transmit a website order to Odoo and create authoritative Sales Order under Retail Company
   */
  static async syncOrderToOdoo(orderId) {
    const db = getDatabase();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) {
      throw new Error(`Order ID ${orderId} not found.`);
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

    const { adapter, mode } = this.getAdapter();

    try {
      const odooPayload = {
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        customerEmail: order.customer_email,
        deliveryGovernorate: order.delivery_governorate,
        deliveryCity: order.delivery_city,
        deliveryAddress: order.delivery_address,
        items,
        totalBaisa: order.total_baisa,
        paymentMethod: order.payment_method,
        idempotencyKey: order.idempotency_key
      };

      const result = await adapter.createSaleOrder(odooPayload);

      // Update local order record
      db.prepare(`
        UPDATE orders 
        SET odoo_order_status = 'odoo_confirmed',
            odoo_sale_order_id = ?,
            odoo_sale_order_name = ?,
            odoo_last_error = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(result.saleOrderId, result.saleOrderName, orderId);

      // Add timeline event
      db.prepare(`
        INSERT INTO order_events (id, order_id, event_type, description, created_by)
        VALUES (?, ?, 'odoo_synced', ?, 'odoo_service')
      `).run(
        uuidv4(),
        orderId,
        `Sales order confirmed in Odoo Retail as ${result.saleOrderName} (Company #${result.companyId})`
      );

      this.logEvent({
        eventType: 'order_create',
        referenceId: order.order_number,
        status: 'success',
        payload: { orderNumber: order.order_number, itemsCount: items.length },
        response: result
      });

      return {
        success: true,
        saleOrderId: result.saleOrderId,
        saleOrderName: result.saleOrderName,
        mode
      };
    } catch (err) {
      // Record failure for retry worker
      const currentRetries = (order.odoo_retry_count || 0) + 1;
      db.prepare(`
        UPDATE orders 
        SET odoo_order_status = 'odoo_failed',
            odoo_retry_count = ?,
            odoo_last_error = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(currentRetries, err.message, orderId);

      db.prepare(`
        INSERT INTO order_events (id, order_id, event_type, description, created_by)
        VALUES (?, ?, 'odoo_sync_failed', ?, 'odoo_service')
      `).run(
        uuidv4(),
        orderId,
        `Odoo synchronization failed: ${err.message}`
      );

      this.logEvent({
        eventType: 'order_create',
        referenceId: order.order_number,
        status: 'failed',
        payload: { orderNumber: order.order_number },
        errorMessage: err.message
      });

      return {
        success: false,
        error: err.message,
        mode
      };
    }
  }

  /**
   * Process pending or failed orders in background queue
   */
  static async processPendingRetries(maxRetries = 3) {
    const db = getDatabase();
    const eligibleOrders = db.prepare(`
      SELECT id, order_number, odoo_retry_count 
      FROM orders 
      WHERE odoo_order_status IN ('pending_integration', 'odoo_failed') 
        AND odoo_retry_count < ?
        AND fulfillment_status != 'cancelled'
        -- Online payments go to Odoo only after Thawani confirms them
        AND (payment_method = 'cod' OR payment_status = 'paid')
      ORDER BY created_at ASC
      LIMIT 10
    `).all(maxRetries);

    const results = [];
    for (const ord of eligibleOrders) {
      const res = await this.syncOrderToOdoo(ord.id);
      results.push({ orderNumber: ord.order_number, ...res });
    }

    return results;
  }
}

module.exports = OdooService;
