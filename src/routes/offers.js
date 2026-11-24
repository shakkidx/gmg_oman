// /offers — the running offer, rendered on the server from the offer set up in Admin → Offers.
// Prices come from OfferService (the same prices the cart, checkout, Thawani and Odoo use).
// Shows a countdown while the offer runs, "starts on" before it, and "Offer ended" after it.
// Text is written in English and Arabic; the page shows the one that matches the site language.

const fs = require('fs');
const path = require('path');
const OfferService = require('../services/offerService');
const { maxOrderQty, getSetting } = require('../services/inventoryService');

const TEMPLATE = path.resolve(__dirname, '../../public/contact.html');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const thumb = url => (url && /^\/(images\/products|uploads\/products)\//.test(url)) ? `/thumbs/480${url}.webp` : (url || '/images/placeholder-product.svg');
const n3 = b => (Number(b || 0) / 1000).toFixed(3);
const L = (en, ar) => `<span data-l="en">${en}</span><span data-l="ar">${ar}</span>`;
const price = b => L(`OMR ${n3(b)}`, `${n3(b)} ر.ع.`);
const dayMonth = (iso, lang) => new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-OM' : 'en-GB', { day: 'numeric', month: 'long', timeZone: 'Asia/Muscat' });

function render() {
  const f = OfferService.featuredOffer();
  const at = OfferService.now();
  const cap = parseInt(getSetting('max_qty_per_order', '10'), 10) || 10;
  const o = f && f.offer;
  const state = f ? f.state : 'none';

  let body;
  if (!f || state === 'ended') {
    body = `<section class="of-ended">
      <div class="of-ended-ico">⏰</div>
      <h1>${L('Offer ended', 'انتهى العرض')}</h1>
      <p>${o ? L(`${esc(o.name_en)} has ended. Prices are back to normal.`, `انتهى ${esc(o.name_ar || o.name_en)}. عادت الأسعار إلى طبيعتها.`) : L('There is no offer running right now.', 'لا يوجد عرض حالياً.')}</p>
      <a class="btn btn-primary" href="/shop">${L('Shop all products', 'تسوّق جميع المنتجات')}</a>
    </section>`;
  } else {
    const items = f.items.map(p => {
      const normal = OfferService.normalPrice(p);
      const live = state === 'live';
      const offerP = p.offer_price_baisa;
      const pct = normal > offerP ? Math.round((normal - offerP) / normal * 100) : 0;
      const max = Math.min(maxOrderQty(p.stock_quantity), cap);
      const sold = max <= 0;
      const now = live ? offerP : normal;
      const data = { sku: p.sku, slug: p.slug, name_en: p.name_en, name_ar: p.name_ar || p.name_en, image: p.image_url, price_baisa: now, retail_baisa: live ? normal : normal, offer: live ? o.name_en : null, offer_ar: live ? (o.name_ar || o.name_en) : null, max_qty: max };
      return `<article class="of-card${sold ? ' is-sold' : ''}" data-p='${esc(JSON.stringify(data))}'>
        <a class="of-media" href="/product/${esc(p.slug)}">
          ${pct ? `<span class="of-badge" dir="ltr">−${pct}%</span>` : ''}
          <img src="${esc(thumb(p.image_url))}" alt="${esc(p.name_en)}" loading="lazy" decoding="async" width="480" height="480">
        </a>
        <div class="of-body">
          <a class="of-name" href="/product/${esc(p.slug)}">${L(esc(p.name_en), esc(p.name_ar || p.name_en))}</a>
          <div class="of-price"><b>${price(offerP)}</b>${normal > offerP ? `<s>${price(normal)}</s>` : ''}</div>
          <p class="of-save">${normal > offerP ? L(`You save OMR ${n3(normal - offerP)}`, `وفّر ${n3(normal - offerP)} ر.ع.`) : ''}</p>
          <p class="of-free">🚚 ${L('Free delivery all over Oman', 'توصيل مجاني لجميع أنحاء عُمان')} · ${L('VAT included', 'شامل الضريبة')}</p>
          ${sold ? `<button class="btn btn-ghost btn-block" disabled>${L('Sold out', 'نفدت الكمية')}</button>` : live ? `
          <button class="btn btn-primary btn-block of-buy" type="button" data-buy>${L('Buy now', 'اشترِ الآن')}</button>
          <div class="of-row">
            <button class="btn btn-ghost of-add" type="button" data-add>${L('Add to cart', 'أضف إلى السلة')}</button>
            <a class="btn of-wa" href="#" data-wa aria-label="WhatsApp"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.2 21.8l5.1-1.3A9.7 9.7 0 1 0 12 2.2zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3 2.7 2.7 0 0 0-.9 2c0 1.2.9 2.4 1 2.5.1.2 1.7 2.7 4.2 3.8 1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.2.2-.6.2-1.1.1-1.2l-.5-.4z"/></svg></a>
          </div>` : `<button class="btn btn-ghost btn-block" disabled>${L(`Starts ${esc(dayMonth(o.starts_at, 'en'))}`, `يبدأ ${esc(dayMonth(o.starts_at, 'ar'))}`)}</button>`}
        </div>
      </article>`;
    }).join('');

    const maxPct = f.items.reduce((m, p) => { const n = OfferService.normalPrice(p); return Math.max(m, n > p.offer_price_baisa ? Math.round((n - p.offer_price_baisa) / n * 100) : 0); }, 0);
    body = `<section class="of-hero">
      <p class="of-kicker">🇴🇲 ${L(`${esc(dayMonth(o.starts_at, 'en'))} – ${esc(dayMonth(o.ends_at, 'en'))}`, `${esc(dayMonth(o.starts_at, 'ar'))} – ${esc(dayMonth(o.ends_at, 'ar'))}`)}</p>
      <h1>${L(esc(o.name_en), esc(o.name_ar || o.name_en))}</h1>
      <p class="of-lead">${maxPct ? L(`Up to ${maxPct}% off MEVRIO chargers, power banks and cables.`, `خصم حتى ${maxPct}٪ على شواحن وباور بانك وكابلات ميفريو.`) : ''} <b>${L('Free delivery all over Oman.', 'توصيل مجاني لجميع أنحاء عُمان.')}</b></p>
      <div class="of-timer" data-state="${state}" data-start="${esc(o.starts_at)}" data-end="${esc(o.ends_at)}">
        ${state === 'live'
          ? L(`Offer ends ${esc(dayMonth(o.ends_at, 'en'))}`, `ينتهي العرض في ${esc(dayMonth(o.ends_at, 'ar'))}`) + ' · ⏳ <b data-left></b>'
          : L(`Offer starts ${esc(dayMonth(o.starts_at, 'en'))}`, `يبدأ العرض ${esc(dayMonth(o.starts_at, 'ar'))}`)}
      </div>
    </section>
    <section class="of-grid">${items}</section>
    <p class="of-foot">${L('Offer prices include VAT and apply only to the products on this page, until', 'أسعار العرض شاملة الضريبة وتنطبق فقط على المنتجات في هذه الصفحة، حتى')} <span dir="ltr">${esc(new Date(o.ends_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Muscat' }))}</span> ${L('(Oman time).', '(بتوقيت عُمان).')} <a href="/offers/catalogue/">${L('View the offer catalogue', 'عرض كتالوج العروض')}</a></p>`;
  }

  const main = `<main class="of-page">
  <div class="wrap">${body}</div>
</main>
<style>
html[lang=ar] [data-l=en], html:not([lang=ar]) [data-l=ar] { display: none }
.of-page { padding-bottom: 56px }
.of-hero { text-align: center; padding: 26px 0 18px }
.of-kicker { display: inline-block; background: #fdecea; color: #b3261e; font-weight: 700; font-size: 13px; border-radius: 999px; padding: 6px 14px; margin: 0 0 12px }
.of-hero h1 { font-size: clamp(28px, 7vw, 46px); line-height: 1.1; margin: 0 0 10px; color: #1b2a6b }
.of-lead { color: var(--muted); font-size: 15.5px; max-width: 560px; margin: 0 auto 16px }
.of-lead b { color: var(--ok) }
.of-timer { display: inline-flex; gap: 6px; align-items: center; flex-wrap: wrap; justify-content: center; background: #1b2a6b; color: #fff; border-radius: 12px; padding: 10px 16px; font-size: 14px; font-weight: 600 }
.of-timer b { color: #ffd24d; font-variant-numeric: tabular-nums }
.of-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 18px }
@media (min-width: 720px) { .of-grid { grid-template-columns: repeat(3, 1fr); gap: 18px } }
@media (min-width: 1080px) { .of-grid { grid-template-columns: repeat(4, 1fr) } }
.of-card { background: #fff; border: 1px solid var(--line); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column }
.of-card.is-sold { opacity: .6 }
.of-media { position: relative; display: block; aspect-ratio: 1; background: #f3f5f9; padding: 10px }
.of-media img { width: 100%; height: 100%; object-fit: contain; mix-blend-mode: multiply }
.of-badge { position: absolute; top: 8px; inset-inline-start: 8px; background: #c8102e; color: #fff; font-weight: 800; font-size: 13px; border-radius: 8px; padding: 4px 8px }
.of-body { padding: 10px 10px 12px; display: flex; flex-direction: column; gap: 6px; flex: 1 }
.of-name { font-weight: 600; font-size: 13.5px; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.7em }
.of-price { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 8px }
.of-price b { font-size: 19px; color: #c8102e; font-weight: 800; white-space: nowrap }
.of-price s { color: var(--muted); font-size: 13px; white-space: nowrap }
.of-save { margin: 0; font-size: 12px; font-weight: 700; color: var(--ok); min-height: 1.2em }
.of-free { margin: 0 0 4px; font-size: 11.5px; color: var(--muted); line-height: 1.35 }
.of-body .btn { min-height: 44px; padding: 10px 12px; font-size: 14.5px }
.of-buy { margin-top: auto; font-weight: 700 }
.of-row { display: grid; grid-template-columns: 1fr 44px; gap: 6px }
.of-wa { background: #25d366; color: #fff; padding: 0 !important; display: grid; place-items: center }
.of-add.added { background: var(--ok); color: #fff; border-color: var(--ok) }
.of-foot { text-align: center; font-size: 12.5px; color: var(--muted); margin-top: 22px }
.of-foot a { text-decoration: underline }
.of-ended { text-align: center; padding: 60px 0 }
.of-ended-ico { font-size: 44px }
.of-ended h1 { margin: 8px 0 }
.of-ended p { color: var(--muted); margin: 0 0 20px }
@media (max-width: 380px) { .of-body .btn { font-size: 13.5px } .of-price b { font-size: 17px } }
</style>
<script>
(function () {
  function go() {
    var G = window.GMG; if (!G) return;
    var timer = document.querySelector('.of-timer[data-state=live]');
    if (timer) {
      var end = Date.parse(timer.dataset.end), out = timer.querySelector('[data-left]');
      var tick = function () {
        var ms = end - Date.now(); if (ms <= 0) { location.reload(); return; }
        var d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4);
        out.textContent = d ? G.t('{d}d {h}h {m}m', { d: d, h: h, m: m }) : G.t('{h}h {m}m', { h: h, m: m });
      };
      tick(); setInterval(tick, 30000);
    }
    var cardsIds = [].map.call(document.querySelectorAll('.of-card'), function (c) { return JSON.parse(c.dataset.p).sku; });
    if (cardsIds.length) G.track('ViewContent', { content_ids: cardsIds, content_type: 'product', content_name: 'Offers' });
    var item = function (card) { var d = JSON.parse(card.dataset.p); return { sku: d.sku, slug: d.slug, name: G.RTL ? d.name_ar : d.name_en, image: d.image, price_baisa: d.price_baisa, retail_baisa: d.retail_baisa, offer: G.RTL ? d.offer_ar : d.offer, max_qty: d.max_qty }; };
    document.addEventListener('click', function (e) {
      var card = e.target.closest('.of-card'); if (!card) return;
      var p = item(card);
      if (e.target.closest('[data-buy]')) {
        e.preventDefault();
        if (!G.Cart.items().some(function (i) { return i.sku === p.sku; })) {
          G.Cart.add(p, 1);
          G.track('AddToCart', { content_ids: [p.sku], contents: [{ id: p.sku, quantity: 1 }], content_type: 'product', content_name: p.name, num_items: 1, value: p.price_baisa / 1000, currency: 'OMR' });
        }
        location.href = '/checkout';
      } else if (e.target.closest('[data-add]')) {
        e.preventDefault();
        var b = e.target.closest('[data-add]');
        G.addToCart(p, 1, b).then(function (ok) { if (ok) { b.classList.add('added'); setTimeout(function () { b.classList.remove('added'); }, 1400); } });
      } else if (e.target.closest('[data-wa]')) {
        var link = G.waOrderLink([Object.assign({}, p, { qty: 1 })], p.price_baisa);
        if (link) { e.preventDefault(); window.open(link, '_blank', 'noopener'); }
      }
    });
  }
  if (window.GMG) go(); else document.addEventListener('DOMContentLoaded', go);
})();
</script>`;

  let html = fs.readFileSync(TEMPLATE, 'utf8');
  const title = o ? `${o.name_en} — MEVRIO offers | Global Markets Gateway` : 'Offers — Global Markets Gateway';
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="MEVRIO chargers, power banks and cables at offer prices. Free delivery all over Oman. Pay by card (Thawani) or cash on delivery.">
<meta property="og:title" content="${esc(o ? o.name_en : 'MEVRIO offers')} — MEVRIO Oman">
<meta property="og:description" content="Offer prices on MEVRIO chargers, power banks and cables. Free delivery all over Oman.">
<meta property="og:image" content="https://gmgoman.com/offers/img/share-41.jpg">
<meta property="og:url" content="https://gmgoman.com/offers/">`)
    .replace(/<main>[\s\S]*?<\/main>/, main)
    .replace(/<script>\s*document\.addEventListener\('DOMContentLoaded'[\s\S]*?<\/script>/, '');
  return { html, at };
}

module.exports = (req, res) => {
  try {
    const { html } = render();
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  } catch (e) {
    console.error('Offers page error:', e.message);
    res.redirect(302, '/shop');
  }
};
