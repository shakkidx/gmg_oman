// Offer pricing — the single place that decides what a product costs right now.
// Every price the shop shows or charges (product lists, product page, cart, checkout, Thawani, Odoo)
// goes through priceFor(), so a product never has two different prices on two pages, and a
// price sent by the browser is never trusted.

const { getDatabase } = require('../config/database');

// For testing only: lets a local/dev server pretend it is a different time (ignored in production).
function now() {
  if (process.env.NODE_ENV !== 'production' && process.env.OFFER_CLOCK) {
    const t = Date.parse(process.env.OFFER_CLOCK);
    if (!isNaN(t)) return t;
  }
  return Date.now();
}

/** All offers that are running at `at` (ms), with their product prices. Map productId -> offer line. */
function activeOfferMap(at = now()) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT o.id AS offer_id, o.name_en, o.name_ar, o.starts_at, o.ends_at, o.vat_included,
           i.product_id, i.offer_price_baisa, i.sort_order
    FROM offers o JOIN offer_items i ON i.offer_id = o.id
    WHERE o.is_active = 1
  `).all();
  const map = new Map();
  for (const r of rows) {
    const s = Date.parse(r.starts_at), e = Date.parse(r.ends_at);
    if (isNaN(s) || isNaN(e) || at < s || at > e) continue;
    const prev = map.get(r.product_id);
    if (prev && prev.price <= r.offer_price_baisa) continue; // two offers on one product: cheaper wins
    map.set(r.product_id, {
      offer_id: r.offer_id, name_en: r.name_en, name_ar: r.name_ar || r.name_en,
      starts_at: r.starts_at, ends_at: r.ends_at, vat_included: !!r.vat_included,
      price: r.offer_price_baisa, sort_order: r.sort_order
    });
  }
  return map;
}

/** Normal price of a product (its own sale price if it has one, otherwise retail). */
function normalPrice(p) {
  return (p.sale_price_baisa && p.sale_price_baisa < p.retail_price_baisa) ? p.sale_price_baisa : p.retail_price_baisa;
}

/**
 * The price of one product now.
 * Returns { unit, original, offer } — original is the normal price (shown crossed out when an offer
 * is running); offer is null for products that are not in a running offer.
 */
function priceFor(product, map = activeOfferMap()) {
  const normal = normalPrice(product);
  const o = map.get(product.id);
  if (o && o.price > 0 && o.price < normal) {
    return { unit: o.price, original: normal, offer: o, vat_included: o.vat_included };
  }
  // the product's own sale price (from the admin) still shows the retail price crossed out
  const onSale = product.sale_price_baisa && product.sale_price_baisa < product.retail_price_baisa;
  return { unit: normal, original: onSale ? product.retail_price_baisa : normal, offer: null, vat_included: false };
}

/** Pricing block for the storefront API. */
function pricingBlock(product, map, formatOmr, lang = 'en') {
  const p = priceFor(product, map);
  const isSale = p.unit < p.original;
  return {
    retail_baisa: p.original,
    sale_baisa: isSale ? p.unit : null,
    current_baisa: p.unit,
    is_on_sale: isSale,
    retail_formatted: formatOmr(p.original, lang),
    current_formatted: formatOmr(p.unit, lang),
    discount_percentage: isSale ? Math.round(((p.original - p.unit) / p.original) * 100) : 0,
    vat_included: p.vat_included,
    offer: p.offer ? { id: p.offer.offer_id, name: lang === 'ar' ? p.offer.name_ar : p.offer.name_en, ends_at: p.offer.ends_at } : null
  };
}

/**
 * Totals for a list of priced lines. Lines whose price already includes VAT (offer prices)
 * have their VAT taken out of the price; other lines get VAT added (unless the shop is VAT-inclusive).
 * lines: [{ unit_price_baisa, quantity, vat_included }]
 */
function totals(lines, { deliveryFeeBaisa = 0, discountBaisa = 0, vatRate = 0.05, shopVatInclusive = false } = {}) {
  let subtotal = 0, vatAdded = 0, vatInside = 0;
  for (const l of lines) {
    const lt = l.unit_price_baisa * l.quantity;
    subtotal += lt;
    if (l.vat_included || shopVatInclusive) vatInside += Math.round(lt - lt / (1 + vatRate));
    else vatAdded += Math.round(lt * vatRate);
  }
  const discount = Math.min(discountBaisa || 0, subtotal);
  const total = subtotal - discount + vatAdded + deliveryFeeBaisa;
  return { subtotalBaisa: subtotal, discountBaisa: discount, vatBaisa: vatAdded + vatInside, vatAddedBaisa: vatAdded, vatIncludedBaisa: vatInside, deliveryFeeBaisa, totalBaisa: total };
}

/** The offer to feature on /offers: the one running now, or else the most recent one (ended or upcoming). */
function featuredOffer(at = now()) {
  const db = getDatabase();
  const offers = db.prepare('SELECT * FROM offers WHERE is_active = 1 ORDER BY starts_at DESC').all();
  const running = offers.find(o => at >= Date.parse(o.starts_at) && at <= Date.parse(o.ends_at));
  const upcoming = offers.filter(o => at < Date.parse(o.starts_at)).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0];
  const o = running || upcoming || offers.find(x => at > Date.parse(x.ends_at));
  if (!o) return null;
  const state = running ? 'live' : (upcoming && o === upcoming ? 'soon' : 'ended');
  const items = db.prepare(`
    SELECT i.offer_price_baisa, i.sort_order, p.*,
      (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) AS image_url
    FROM offer_items i JOIN products p ON p.id = i.product_id
    WHERE i.offer_id = ? AND p.is_published = 1
    ORDER BY i.sort_order, p.name_en
  `).all(o.id);
  return { offer: o, state, items };
}

module.exports = { now, activeOfferMap, priceFor, pricingBlock, totals, featuredOffer, normalPrice };
