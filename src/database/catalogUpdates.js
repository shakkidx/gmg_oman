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
  ]
};

/** 2026-11-01 (b) — add the 11th product from the sheet: MV-X401CC 65W USB-C to USB-C cable. */
const UPDATE_2026_11_01_B = {
  key: 'catalog_update_2026_11_01_b',
  product: {
    id: 'prod-mevrio-cb-65w', category_id: 'cat-cables', sku: 'MEV-CB-0651', brand: 'MEVRIO',
    name_en: 'MEVRIO 65W Type-C to Type-C Fast Charging Cable (1.5m)',
    name_ar: 'كابل شحن سريع ميفريو 65 واط تايب سي إلى تايب سي (1.5 متر)',
    slug: 'mevrio-65w-type-c-to-type-c-cable-1-5m',
    short_desc_en: '65W PD super-fast charging with a tough braided jacket — for phones, tablets and laptops.',
    short_desc_ar: 'شحن فائق السرعة 65 واط PD مع غلاف مجدول متين — للهواتف والأجهزة اللوحية واللابتوب.',
    full_desc_en: 'Charge and sync with one cable: up to 65W Power Delivery for phones, iPads and USB-C laptops, plus 480Mbps data transfer. The braided outer jacket is tested beyond 5,000 bends, and 1.5m of length reaches from the wall to the sofa or bed.',
    full_desc_ar: 'شحن ومزامنة بكابل واحد: قدرة تصل إلى 65 واط لشحن الهواتف والآيباد واللابتوبات بمنفذ USB-C، مع نقل بيانات بسرعة 480 ميجابت/ث. الغلاف المجدول مُختبر لأكثر من 5,000 انحناءة، وطوله 1.5 متر.',
    specifications: JSON.stringify({ 'Power Rating': '65W Power Delivery (PD)', 'Length': '1.5 Meters', 'Connector Type': 'Type-C to Type-C', 'Data Transfer': '480 Mbps', 'Durability': '5,000+ bends, braided jacket' }),
    retail_price_baisa: 4560, stock_quantity: 100,
    gallery: ['/images/products/mevrio-100w-type-c-cable.jpg', '/images/products/mevrio-65w-type-c-cable-box.jpg']
  }
};

function applyCatalogUpdates(db) {
  apply20261101(db);
  apply20261101b(db);
  // 2026-11-01 (c) — real WhatsApp number (only replaces the old placeholder, never an admin's own edit)
  db.prepare("UPDATE settings SET value = '+968 96070785', updated_at = CURRENT_TIMESTAMP WHERE key = 'contact_whatsapp' AND value = '+968 91234567'").run();
}

const isDone = (db, key) => !!db.prepare('SELECT 1 FROM settings WHERE key = ?').get(key);
const markDone = (db, key, note) => db.prepare(`INSERT INTO settings (key, value, category, description, updated_at)
  VALUES (?, ?, 'system', ?, CURRENT_TIMESTAMP)`).run(key, new Date().toISOString(), note);

function apply20261101b(db) {
  const { key, product: p } = UPDATE_2026_11_01_B;
  if (isDone(db, key)) return;
  const exists = db.prepare('SELECT 1 FROM products WHERE sku = ? OR slug = ? OR id = ?').get(p.sku, p.slug, p.id);
  const cat = db.prepare('SELECT 1 FROM categories WHERE id = ?').get(p.category_id);
  if (!exists && cat) {
    db.prepare(`INSERT INTO products (id, category_id, sku, brand, name_en, name_ar, slug, short_desc_en, short_desc_ar,
      full_desc_en, full_desc_ar, specifications, retail_price_baisa, sale_price_baisa, cost_price_baisa,
      stock_quantity, low_stock_threshold, is_featured, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, 5, 0, 1)`)
      .run(p.id, p.category_id, p.sku, p.brand, p.name_en, p.name_ar, p.slug, p.short_desc_en, p.short_desc_ar,
        p.full_desc_en, p.full_desc_ar, p.specifications, p.retail_price_baisa, p.stock_quantity);
    const img = db.prepare(`INSERT INTO product_images (id, product_id, image_url, alt_text_en, alt_text_ar, sort_order, is_primary)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
    p.gallery.forEach((url, i) => img.run(`img-${p.id}-${i}`, p.id, url, p.name_en, p.name_ar, i, i === 0 ? 1 : 0));
    console.log('Catalogue update 2026-11-01b: added 65W USB-C cable.');
  }
  markDone(db, key, 'Added MV-X401CC 65W cable');
}

function apply20261101(db) {
  const u = UPDATE_2026_11_01;
  if (isDone(db, u.key)) return;

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

  markDone(db, u.key, 'Client price list of 1 Nov 2026 applied');
  console.log(`Catalogue update 2026-11-01: ${updated} prices updated, ${removed} duplicate listings merged.`);
}

module.exports = { applyCatalogUpdates };
