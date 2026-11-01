// One-time catalogue updates. Each update runs once per database and is recorded in `settings`,
// so restarting or redeploying the app never repeats it (and admin edits made afterwards are kept).

/**
 * 2026-11-01 — client price list "Updated_original_prices.xlsx" (11 products).
 * - Retail price = "Website Price (OMR)" from the sheet, no sale price.
 * - Listings that were extra photos of the same item are merged into one product:
 *   their photos move to the kept product, then the extra listing is removed.
 */
const UPDATE_2026_11_01 = {
  key: 'catalog_update_2026_11_01',
  products: [
    // [kept SKU, retail OMR, client model no., SKUs merged into it]
    ['MEV-CH-2016', 7.440, 'MV-CDA258', ['MEV-CH-2011']],               // Dual-port GaN 20W
    ['MEV-CH-2010', 6.700, 'MV-CDA259', ['MEV-CH-2013', 'MEV-CH-2012']], // Single-port GaN 20W
    ['MEV-CH-4515', 10.700, 'MV-CDA256', []],                            // Dual-port GaN 45W
    ['MEV-CH-4509', 9.580, 'MV-CDA255', ['MEV-CH-4514']],               // Single-port GaN 45W
    ['MEV-CC-5203', 6.780, 'MV-CC65', []],                               // 52.5W car charger
    ['MEV-PB-5001', 19.320, 'MV-P79', []],                               // 5000mAh magnetic power bank
    ['MEV-PB-MAG-08', 15.780, 'MV-P76', ['MEV-PB-SLV-07']],             // 10000mAh magnetic power bank
    ['MEV-PB-MAG-06', 21.980, 'MV-P771', ['MEV-PB-1002']],              // 3-in-1 magnetic power bank
    ['MEV-CB-1004', 5.360, 'MV-X402CC', []],                             // 100W USB-C to USB-C cable
    ['MEV-CB-3005', 7.540, 'MV-X410', []]                                // 3-in-1 cable
    // MV-X401CC (65W USB-C to USB-C cable, OMR 4.560) is in the sheet but not yet on the site.
  ]
};

function applyCatalogUpdates(db) {
  const u = UPDATE_2026_11_01;
  const done = db.prepare('SELECT 1 FROM settings WHERE key = ?').get(u.key);
  if (done) return;

  const bySku = db.prepare('SELECT id, sku FROM products WHERE sku = ?');
  const setPrice = db.prepare('UPDATE products SET retail_price_baisa = ?, sale_price_baisa = NULL, is_published = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  const maxSort = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM product_images WHERE product_id = ?');
  const imagesOf = db.prepare('SELECT id, image_url FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC');
  const hasUrl = db.prepare('SELECT 1 FROM product_images WHERE product_id = ? AND image_url = ?');
  const moveImg = db.prepare('UPDATE product_images SET product_id = ?, sort_order = ?, is_primary = 0 WHERE id = ?');
  const usedInOrders = db.prepare('SELECT COUNT(*) AS c FROM order_items WHERE product_id = ?');
  const unpublish = db.prepare('UPDATE products SET is_published = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  const del = db.prepare('DELETE FROM products WHERE id = ?');

  let updated = 0, removed = 0;
  for (const [sku, omr, , merged] of u.products) {
    const keep = bySku.get(sku);
    if (!keep) continue;
    setPrice.run(Math.round(omr * 1000), keep.id);
    updated++;
    for (const m of merged) {
      const extra = bySku.get(m);
      if (!extra) continue;
      let sort = maxSort.get(keep.id).m;
      for (const img of imagesOf.all(extra.id)) {
        if (!hasUrl.get(keep.id, img.image_url)) moveImg.run(keep.id, ++sort, img.id);
      }
      if (usedInOrders.get(extra.id).c > 0) unpublish.run(extra.id); else del.run(extra.id);
      removed++;
    }
  }

  db.prepare(`INSERT INTO settings (key, value, category, description, updated_at)
    VALUES (?, ?, 'system', 'Client price list of 1 Nov 2026 applied', CURRENT_TIMESTAMP)`)
    .run(u.key, new Date().toISOString());
  console.log(`Catalogue update 2026-11-01: ${updated} prices updated, ${removed} duplicate listings merged.`);
}

module.exports = { applyCatalogUpdates };
