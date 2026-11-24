// Public price list: every published product with its price, rendered on the server.
// It needs no JavaScript to show prices, so payment-gateway reviewers, search engines and
// slow phones all see the full list straight away.

const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../config/database');
const OfferService = require('../services/offerService');

const TEMPLATE = path.resolve(__dirname, '../../public/contact.html');

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const omr = baisa => `OMR ${(Number(baisa || 0) / 1000).toFixed(3)}`;
const thumb = url => (url && /^\/(images\/products|uploads\/products)\//.test(url)) ? `/thumbs/480${url}.webp` : (url || '/images/placeholder-product.svg');

function render() {
  const db = getDatabase();
  const settings = {};
  db.prepare("SELECT key, value FROM settings WHERE key IN ('vat_inclusive','vat_rate','free_shipping_threshold_baisa','muscat_delivery_fee_baisa','other_delivery_fee_baisa','store_legal_name')").all()
    .forEach(r => { settings[r.key] = r.value; });

  const rows = db.prepare(`
    SELECT p.*, p.id, p.sku, p.slug, p.name_en, p.name_ar, p.retail_price_baisa, p.sale_price_baisa, p.stock_quantity,
           c.name_en AS cat_en, c.name_ar AS cat_ar, c.sort_order AS cat_sort,
           (SELECT image_url FROM product_images i WHERE i.product_id = p.id ORDER BY i.is_primary DESC, i.sort_order ASC LIMIT 1) AS image
    FROM products p JOIN categories c ON c.id = p.category_id
    WHERE p.is_published = 1
    ORDER BY c.sort_order, c.name_en, COALESCE(p.sale_price_baisa, p.retail_price_baisa)
  `).all();

  const offerMap = OfferService.activeOfferMap();
  const groups = [];
  rows.forEach(r => {
    let g = groups.find(x => x.name === r.cat_en);
    if (!g) { g = { name: r.cat_en, name_ar: r.cat_ar, items: [] }; groups.push(g); }
    g.items.push(r);
  });

  const vatIncl = settings.vat_inclusive === 'true';
  const vatPct = Math.round(parseFloat(settings.vat_rate || '0.05') * 100);
  const note = [
    `All prices are in Omani Rial (OMR) ${vatIncl ? `and include ${vatPct}% VAT` : `and exclude ${vatPct}% VAT, which is added at checkout`}.`,
    parseInt(settings.free_shipping_threshold_baisa || '25000', 10) <= 0 ? 'Free delivery all over Oman.' : `Delivery: Muscat ${omr(settings.muscat_delivery_fee_baisa || 1500)}, other governorates ${omr(settings.other_delivery_fee_baisa || 2500)}, free on orders over ${omr(settings.free_shipping_threshold_baisa || 25000)}.`,
    'Offer prices (marked) include VAT and are valid only during the offer period.',
    'Pay by card with Thawani Pay or cash on delivery.'
  ];

  const table = groups.map(g => `
    <section class="pl-group">
      <h2>${esc(g.name)} <small dir="rtl">${esc(g.name_ar || '')}</small></h2>
      <div class="pl-table" role="table" aria-label="${esc(g.name)} prices">
        <div class="pl-row pl-head" role="row"><span role="columnheader">Product</span><span role="columnheader">SKU</span><span role="columnheader">Price</span></div>
        ${g.items.map(p => {
          const pr = OfferService.priceFor(p, offerMap);
          const onSale = pr.original > pr.unit;
          const price = pr.unit;
          return `<a class="pl-row" role="row" href="/product/${esc(p.slug)}">
            <span class="pl-prod" role="cell"><img src="${esc(thumb(p.image))}" alt="" loading="lazy" width="56" height="56"><span><b>${esc(p.name_en)}</b><small dir="rtl">${esc(p.name_ar || '')}</small></span></span>
            <span class="pl-sku" role="cell">${esc(p.sku)}</span>
            <span class="pl-price" role="cell"><b>${omr(price)}</b>${onSale ? `<s>${omr(pr.original)}</s>` : ''}${pr.offer ? `<em style="color:#8a4b00">${esc(pr.offer.name_en)} · VAT incl.</em>` : ''}${p.stock_quantity > 0 ? '' : '<em>Sold out</em>'}</span>
          </a>`;
        }).join('')}
      </div>
    </section>`).join('');

  const main = `<main>
  <div class="wrap page-head">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>Prices</span></nav>
    <h1>Price list</h1>
    <p>All MEVRIO chargers, power banks and cables we sell, with their current prices. Tap a product to see details and order.</p>
  </div>
  <div class="wrap pl">
    ${table || '<p>No products are listed right now.</p>'}
    <div class="pl-note">${note.map(n => `<p>${esc(n)}</p>`).join('')}<p>Prices last updated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Muscat' })}.</p></div>
  </div>
</main>
<style>
.pl{padding-bottom:48px}
.pl-group{margin:28px 0}
.pl-group h2{font-size:20px;margin:0 0 10px;display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.pl-group h2 small{font-size:15px;font-weight:600;color:var(--muted,#5a6072)}
.pl-table{border:1px solid var(--line,#e3e6ee);border-radius:16px;overflow:hidden;background:#fff}
.pl-row{display:grid;grid-template-columns:1fr 130px 150px;gap:12px;align-items:center;padding:12px 16px;border-top:1px solid var(--line,#e3e6ee);color:inherit;text-decoration:none}
.pl-row:first-child{border-top:0}
a.pl-row:hover{background:#f6f8fc}
.pl-head{background:#f3f5f9;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted,#5a6072);padding:10px 16px}
.pl-prod{display:flex;align-items:center;gap:12px;min-width:0}
.pl-prod img{width:56px;height:56px;object-fit:contain;border-radius:10px;background:#f3f5f9;mix-blend-mode:multiply;flex:none}
.pl-prod b{display:block;font-size:15px;line-height:1.3}
.pl-prod small{display:block;text-align:left;font-size:13px;color:var(--muted,#5a6072);margin-top:2px}
.pl-sku{font-size:13px;color:var(--muted,#5a6072);font-family:ui-monospace,monospace}
.pl-price{text-align:end}
.pl-price b{display:block;font-size:16px;white-space:nowrap}
.pl-price s{display:block;font-size:12.5px;color:var(--muted,#5a6072)}
.pl-price em{display:block;font-style:normal;font-size:12px;font-weight:700;color:#c8102e}
.pl-note{margin-top:20px;font-size:14px;color:var(--muted,#5a6072)}
.pl-note p{margin:4px 0}
@media (max-width:640px){.pl-row{grid-template-columns:1fr auto}.pl-sku,.pl-head span:nth-child(2){display:none}.pl-prod img{width:48px;height:48px}}
</style>`;

  let html = fs.readFileSync(TEMPLATE, 'utf8');
  html = html.replace(/<title>[^<]*<\/title>/, '<title>Price list — Global Markets Gateway</title>')
    .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="Current prices of all MEVRIO chargers, power banks and cables sold by Global Markets Gateway in Oman.">')
    .replace(/<main>[\s\S]*?<\/main>/, main)
    .replace(/<script>\s*document\.addEventListener\('DOMContentLoaded'[\s\S]*?<\/script>/, '');
  return html;
}

module.exports = (req, res) => {
  try {
    const html = render();
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  } catch (e) {
    console.error('Price list error:', e.message);
    res.status(500).send('Price list is temporarily unavailable.');
  }
};
