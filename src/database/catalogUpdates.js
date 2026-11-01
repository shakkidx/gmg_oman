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

/**
 * 2026-11-01 (d) — client wording corrections:
 * "10,000mAh" not "10000mAh", "3-in-1", "Power Bank"; no Micro USB on the 3-in-1 cable (text and photo);
 * the 3-in-1 Power Bank is not Qi2; the 5,000mAh Power Bank is not Qi; no "N52 neodymium" anywhere.
 * Also: MV-CDA256 is a dual-port (USB-C + USB-A) 45W charger, MV-P76 is 10,000mAh.
 */
const UPDATE_2026_11_01_D = {
  key: 'catalog_update_2026_11_01_d',
  products: {
    'MEV-PB-5001': {
      name_en: 'MEVRIO 20W 5,000mAh Ultra-Slim Magnetic Power Bank',
      name_ar: 'بنك طاقة مغناطيسي نحيف ميفريو 5,000 مللي أمبير بقوة 20 واط',
      short_desc_en: 'Ultra-slim 0.89cm magnetic Power Bank with 20W PD fast charging and an aerospace aluminium body.',
      short_desc_ar: 'بنك طاقة مغناطيسي نحيف جداً بسماكة 0.89 سم مع شحن سريع 20 واط PD وهيكل من ألومنيوم الطيران.',
      full_desc_en: 'Made to live in your pocket. At just 0.89cm thin, this 5,000mAh Power Bank holds onto the back of your phone with 8N super-strong magnets, and its 20W USB-C PD port fast-charges your phone. The aerospace aluminium shell and premium cobalt battery cells keep it light, cool and long-lasting.',
      full_desc_ar: 'مصمم ليرافقك في جيبك. بسماكة 0.89 سم فقط، يثبت بنك الطاقة بسعة 5,000 مللي أمبير على ظهر هاتفك بمغناطيس فائق القوة 8N، ويشحن هاتفك بسرعة عبر منفذ USB-C بقوة 20 واط PD. هيكل من ألومنيوم الطيران وخلايا بطارية كوبالت فاخرة تجعله خفيفاً وبارداً ويدوم طويلاً.',
      specifications: { 'Capacity': '5,000mAh', 'Fast Charging': 'PD 20W', 'Thickness': '0.89 cm', 'Body': 'Aerospace aluminium', 'Magnet': '8N super magnetic', 'Battery': 'Premium cobalt cells', 'Safety': 'Over-charge, over-discharge & temperature protection' }
    },
    'MEV-PB-MAG-08': {
      name_en: 'MEVRIO 10,000mAh Super-Slim Magnetic Power Bank',
      name_ar: 'بنك طاقة مغناطيسي نحيف ميفريو 10,000 مللي أمبير',
      slug: 'mevrio-10000mah-super-slim-magnetic-power-bank',
      short_desc_en: '10,000mAh magnetic Power Bank with 20W PD fast charging in a super-slim silver body.',
      short_desc_ar: 'بنك طاقة مغناطيسي بسعة 10,000 مللي أمبير مع شحن سريع 20 واط PD بتصميم فضي نحيف جداً.',
      full_desc_en: 'Double the capacity without the bulk. This super-slim 10,000mAh Power Bank holds firmly to the back of your phone with its magnetic design and refills it fast through 20W USB-C Power Delivery.',
      full_desc_ar: 'ضعف السعة بدون حجم زائد. بنك طاقة نحيف جداً بسعة 10,000 مللي أمبير يثبت على ظهر هاتفك بتصميمه المغناطيسي ويشحنه بسرعة عبر USB-C بقوة 20 واط.',
      specifications: { 'Capacity': '10,000mAh', 'Fast Charging': 'PD 20W', 'Design': 'Magnetic, super slim', 'Color': 'Silver' }
    },
    'MEV-PB-MAG-06': {
      name_en: 'MEVRIO 3-in-1 10,000mAh 66W Magnetic Power Bank',
      name_ar: 'بنك طاقة مغناطيسي 3 في 1 ميفريو 10,000 مللي أمبير بقوة 66 واط',
      slug: 'mevrio-3-in-1-66w-magnetic-power-bank',
      short_desc_en: '3-in-1 magnetic Power Bank with up to 66W fast charging and a built-in cable — nothing extra to carry.',
      short_desc_ar: 'بنك طاقة مغناطيسي 3 في 1 بشحن سريع حتى 66 واط مع كابل مدمج — لا حاجة لحمل كابلات إضافية.',
      full_desc_en: 'Carry one Power Bank instead of a bag of cables. The 10,000mAh battery delivers up to 66W of fast charging, the built-in cable is always with you, and the magnetic design holds firmly to your phone.',
      full_desc_ar: 'احمل بنك طاقة واحداً بدلاً من مجموعة كابلات. بطارية بسعة 10,000 مللي أمبير بشحن سريع حتى 66 واط، مع كابل مدمج دائماً معك، وتصميم مغناطيسي يثبت بقوة على هاتفك.',
      specifications: { 'Capacity': '10,000mAh', 'Max Output': '66W', 'Cable': 'Built-in', 'Design': '3-in-1 magnetic' },
      hero_tagline: '66W power with the cable built in.',
      hero_tagline_ar: 'قوة ٦٦ واط مع كابل مدمج.'
    },
    'MEV-CB-3005': {
      name_en: 'MEVRIO 3-in-1 65W Braided Charging Cable (1.5m)',
      name_ar: 'كابل شحن مجدول 3 في 1 ميفريو بقوة 65 واط (1.5 متر)',
      slug: 'mevrio-3-in-1-65w-braided-charging-cable',
      short_desc_en: 'One USB-C cable with two USB-C plugs and a Lightning plug — fast charging for Android, iPhone and more.',
      short_desc_ar: 'كابل USB-C واحد بقابسين USB-C وقابس Lightning — شحن سريع لأجهزة أندرويد وآيفون وغيرها.',
      full_desc_en: 'Charge three devices from one cable. The USB-C input splits into two USB-C plugs (up to 65W) and a Lightning plug (up to 30W) for iPhone. Nylon braided jacket with aluminium alloy plugs, 1.5m long.',
      full_desc_ar: 'اشحن ثلاثة أجهزة بكابل واحد. مدخل USB-C يتفرع إلى قابسين USB-C (حتى 65 واط) وقابس Lightning (حتى 30 واط) للآيفون. غلاف نايلون مجدول وأطراف من سبائك الألومنيوم، بطول 1.5 متر.',
      specifications: { 'Connectors': 'USB-C to 2× USB-C + Lightning', 'Max Power': 'USB-C 65W / Lightning 30W', 'Length': '1.5 Meters', 'Material': 'Nylon braided + aluminium alloy', 'Durability': '5,000+ bends, braided jacket' },
      gallery: ['/images/products/mevrio-3in1-cable-box.jpg', '/images/products/mevrio-3in1-cable-photo.jpg']
    },
    'MEV-CH-4515': {
      name_en: 'MEVRIO GaN 45W Dual-Port Wall Charger (USB-C + USB-A)',
      name_ar: 'شاحن جداري ميفريو GaN بقوة 45 واط بمنفذين (USB-C + USB-A)',
      slug: 'mevrio-gan-45w-dual-port-wall-charger',
      short_desc_en: 'GaN fast charger with a 45W USB-C port and an 18W USB-A QC port — charge two devices at once.',
      short_desc_ar: 'شاحن GaN سريع بمنفذ USB-C بقوة 45 واط ومنفذ USB-A QC بقوة 18 واط — اشحن جهازين معاً.',
      full_desc_en: 'Next-gen GaN technology packs 45W into a compact UK-plug charger. The USB-C port fast-charges phones, tablets and laptops at up to 45W, while the USB-A port adds 18W Quick Charge for a second device.',
      full_desc_ar: 'تقنية GaN من الجيل الجديد تمنحك 45 واط في شاحن صغير بقابس بريطاني. منفذ USB-C يشحن الهواتف والأجهزة اللوحية واللابتوب حتى 45 واط، ومنفذ USB-A يضيف شحناً سريعاً 18 واط لجهاز ثانٍ.',
      specifications: { 'Output 1': 'USB-C 45W', 'Output 2': 'USB-A QC 18W', 'Tech': 'GaN (Gallium Nitride)', 'Plug Type': 'UK 3-Pin' }
    }
  }
};

function apply20261101d(db) {
  const { key, products } = UPDATE_2026_11_01_D;
  if (isDone(db, key)) return;
  const fields = ['name_en', 'name_ar', 'slug', 'short_desc_en', 'short_desc_ar', 'full_desc_en', 'full_desc_ar', 'hero_tagline', 'hero_tagline_ar'];
  for (const [sku, c] of Object.entries(products)) {
    const p = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku);
    if (!p) continue;
    for (const f of fields) {
      if (c[f] === undefined) continue;
      if (f === 'slug' && db.prepare('SELECT 1 FROM products WHERE slug = ? AND id != ?').get(c.slug, p.id)) continue;
      db.prepare(`UPDATE products SET ${f} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(c[f], p.id);
    }
    db.prepare('UPDATE products SET specifications = ? WHERE id = ?').run(JSON.stringify(c.specifications), p.id);
    if (c.gallery) {
      db.prepare('DELETE FROM product_images WHERE product_id = ?').run(p.id);
      const ins = db.prepare(`INSERT INTO product_images (id, product_id, image_url, alt_text_en, alt_text_ar, sort_order, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      c.gallery.forEach((url, i) => ins.run(`img-${p.id}-d${i}`, p.id, url, c.name_en, c.name_ar, i, i === 0 ? 1 : 0));
    }
  }
  markDone(db, key, 'Client wording corrections (1 Nov 2026)');
  console.log('Catalogue update 2026-11-01d: product wording corrected.');
}

function applyCatalogUpdates(db) {
  apply20261101(db);
  apply20261101b(db);
  apply20261101d(db);
  // 2026-11-01 (c) — real WhatsApp number (only replaces the old placeholder, never an admin's own edit)
  // 2026-11-01 (e) — phone and WhatsApp both +968 96114412 (only replaces the earlier placeholder/previous values)
  db.prepare("UPDATE settings SET value = '+968 96114412', updated_at = CURRENT_TIMESTAMP WHERE key = 'contact_whatsapp' AND value IN ('+968 91234567', '+968 96070785')").run();
  db.prepare("UPDATE settings SET value = '+968 96114412', updated_at = CURRENT_TIMESTAMP WHERE key = 'contact_phone' AND value = '+968 24 998877'").run();
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
