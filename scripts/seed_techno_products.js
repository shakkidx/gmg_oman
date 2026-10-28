const { getDatabase } = require('../src/config/database');

const db = getDatabase();

const technoProducts = [
  {
    id: 'prod-techno-earphone',
    category_id: 'cat-audio',
    sku: 'TECH-EP-001',
    barcode: '6291108299011',
    brand: 'TECHNO',
    name_en: 'Earphone',
    name_ar: 'سماعات أذن لاسلكية',
    slug: 'earphone',
    short_desc_en: 'Premium wireless earbuds with active noise cancellation and compact wireless charging case.',
    short_desc_ar: 'سماعات أذن لاسلكية متطورة مع عزل الضوضاء وعلبة شحن لاسلكية.',
    full_desc_en: 'Experience pure acoustic clarity with high-fidelity sound, deep bass, beamforming microphones for crystal-clear calls, and up to 30 hours of playback time with the wireless charging case.',
    full_desc_ar: 'استمتع بصوت نقي ونظيف مع تقنية عزل الضوضاء وعمر بطارية يدوم حتى 30 ساعة.',
    retail_price_baisa: 29900,
    sale_price_baisa: 19900,
    cost_price_baisa: 10000,
    stock_quantity: 50,
    is_featured: 1,
    image: '/images/techno/earphone.jpg'
  },
  {
    id: 'prod-techno-headphone',
    category_id: 'cat-audio',
    sku: 'TECH-HP-002',
    barcode: '6291108299028',
    brand: 'TECHNO',
    name_en: 'Headphone',
    name_ar: 'سماعات رأس لاسلكية',
    slug: 'headphone',
    short_desc_en: 'Studio over-ear active noise cancelling headphones with memory foam cushions and lossless audio.',
    short_desc_ar: 'سماعات رأس استوديو فاخرة مع وسائد مريحة وعزل ضوضاء ممتاز.',
    full_desc_en: 'Engineered for all-day comfort and audiophile sound. Features 40mm titanium diaphragm drivers, multi-point Bluetooth 5.4, and 50 hours of battery life with quick fast-charging.',
    full_desc_ar: 'تصميم مريح للاستخدام طوال اليوم مع مشغلات صوت تيتانيوم وبطارية تدوم 50 ساعة.',
    retail_price_baisa: 29900,
    sale_price_baisa: 19900,
    cost_price_baisa: 11000,
    stock_quantity: 40,
    is_featured: 1,
    image: '/images/techno/headphone.jpg'
  },
  {
    id: 'prod-techno-iphone',
    category_id: 'cat-cases',
    sku: 'TECH-IP-003',
    barcode: '6291108299035',
    brand: 'TECHNO',
    name_en: 'Iphone',
    name_ar: 'هاتف ذكي متطور',
    slug: 'iphone',
    short_desc_en: 'Next-gen flagship smartphone with titanium finish, borderless Super Retina XDR display, and triple camera system.',
    short_desc_ar: 'هاتف ذكي فائق الأداء بهيكل من التيتانيوم وشاشة فائقة النقاء وكاميرا ثلاثية احترافية.',
    full_desc_en: 'Crafted with aerospace-grade titanium, custom high-speed chipset, advanced spatial audio, and cinematic 4K ProRes camera recording.',
    full_desc_ar: 'مصنوع من التيتانيوم القوي مع كاميرا سينمائية وشاشة فائقة السطوع.',
    retail_price_baisa: 29900,
    sale_price_baisa: 19900,
    cost_price_baisa: 15000,
    stock_quantity: 30,
    is_featured: 1,
    image: '/images/techno/iphone.jpg'
  },
  {
    id: 'prod-techno-speaker',
    category_id: 'cat-audio',
    sku: 'TECH-SP-004',
    barcode: '6291108299042',
    brand: 'TECHNO',
    name_en: 'Speaker',
    name_ar: 'مكبر صوت ألومنيوم',
    slug: 'speaker',
    short_desc_en: 'Minimalist aluminum desktop acoustic speaker with 360-degree room-filling sound and Bluetooth connection.',
    short_desc_ar: 'مكبر صوت فاخر من الألومنيوم بصوت نقي وعالي الجودة بزاوية 360 درجة.',
    full_desc_en: 'Architectural minimalism meets rich acoustic engineering. Solid milled aluminum enclosure reduces resonance, delivering punchy bass and crystalline high frequencies.',
    full_desc_ar: 'مكبر صوت مكتبي بتصميم ألومنيوم أنيق وصوت قوي ثلاثي الأبعاد.',
    retail_price_baisa: 29900,
    sale_price_baisa: 19900,
    cost_price_baisa: 10000,
    stock_quantity: 35,
    is_featured: 1,
    image: '/images/techno/speaker.jpg'
  }
];

const insertProd = db.prepare(`
  INSERT INTO products (
    id, category_id, sku, barcode, brand, name_en, name_ar, slug,
    short_desc_en, short_desc_ar, full_desc_en, full_desc_ar,
    specifications, retail_price_baisa, sale_price_baisa, cost_price_baisa,
    stock_quantity, is_featured, is_published
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?,
    '{}', ?, ?, ?,
    ?, ?, 1
  )
  ON CONFLICT(id) DO UPDATE SET
    name_en = excluded.name_en,
    slug = excluded.slug,
    retail_price_baisa = excluded.retail_price_baisa,
    sale_price_baisa = excluded.sale_price_baisa,
    is_featured = excluded.is_featured
`);

const insertImg = db.prepare(`
  INSERT INTO product_images (id, product_id, image_url, sort_order)
  VALUES (?, ?, ?, 0)
  ON CONFLICT(id) DO UPDATE SET image_url = excluded.image_url
`);

for (const p of technoProducts) {
  insertProd.run(
    p.id, p.category_id, p.sku, p.barcode, p.brand, p.name_en, p.name_ar, p.slug,
    p.short_desc_en, p.short_desc_ar, p.full_desc_en, p.full_desc_ar,
    p.retail_price_baisa, p.sale_price_baisa, p.cost_price_baisa,
    p.stock_quantity, p.is_featured
  );
  insertImg.run(`img-${p.id}`, p.id, p.image);
}

console.log('Successfully seeded 4 TECHNO flagship showcase products into database!');
