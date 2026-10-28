/* Product page: /product/:slug */
(function () {
  'use strict';
  const start = async () => {
    const { $, $$, esc, omr, thumb, api, addToCart, cardHtml, bindCards, I, reveal, t, RTL } = window.GMG;
    const slug = decodeURIComponent((location.pathname.match(/^\/product\/([^/]+)/) || [])[1] || new URLSearchParams(location.search).get('p') || '');

    let p;
    try {
      p = (await api(`/api/products/${encodeURIComponent(slug)}`)).data;
    } catch (e) {
      $('#pdp').innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>${t('Product not found')}</h3><p>${t('It may have been moved or is no longer available.')}</p><a class="btn btn-primary" href="/shop">${t('Browse the shop')}</a></div>`;
      return;
    }

    document.title = `${p.name} — Global Markets Gateway`;
    const md = document.querySelector('meta[name="description"]');
    if (md && p.short_desc) md.content = p.short_desc;

    $('#crumbs').innerHTML = `<a href="/">${t('Home')}</a><span aria-hidden="true">/</span><a href="/category/${esc(p.category.slug)}">${esc(p.category.name)}</a><span aria-hidden="true">/</span><span>${esc(p.name.replace(/^MEVRIO\s+/i, '').replace(/\s*ميفريو\s*/, ' ').trim())}</span>`;

    const images = p.images.length ? p.images.map(i => i.url) : ['/images/placeholder-product.svg'];
    const soldOut = !p.available;
    const maxQty = p.max_qty || 0;
    const specs = Object.entries(p.specifications || {});
    const sale = p.pricing.is_on_sale;
    const saveBaisa = p.pricing.retail_baisa - p.pricing.current_baisa;

    $('#pdp').innerHTML = `
      <div class="gallery${images.length > 1 ? '' : ' single'}">
        <div class="gallery-main" id="galleryMain">
          <div class="gallery-track" id="track">${images.map((u, i) => `<figure><img src="${thumb(u, 1100)}" alt="${esc(p.name)}${images.length > 1 ? ` — ${t('view {n}', { n: i + 1 })}` : ''}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}></figure>`).join('')}</div>
          ${images.length > 1 ? `<div class="gallery-dots" id="dots">${images.map((_, i) => `<i class="${i ? '' : 'is-active'}"></i>`).join('')}</div>` : ''}
          ${soldOut ? `<span class="badge soft">${t('Sold out')}</span>` : (sale ? `<span class="badge" dir="ltr">−${p.pricing.discount_percentage}%</span>` : '')}
        </div>
        ${images.length > 1 ? `<div class="thumbs" id="thumbs">${images.map((u, i) => `<button type="button" class="${i ? '' : 'is-active'}" data-i="${i}" aria-label="${t('Show image {n}', { n: i + 1 })}"><img src="${thumb(u, 480)}" alt=""></button>`).join('')}</div>` : ''}
      </div>
      <div class="pdp-info">
        <a class="card-cat" href="/category/${esc(p.category.slug)}">${esc(p.brand)} · ${esc(p.category.name)}</a>
        <h1>${esc(p.name)}</h1>
        <div class="pdp-price"><b>${omr(p.pricing.current_baisa)}</b>${sale ? `<s>${omr(p.pricing.retail_baisa)}</s><span class="save-tag">${t('Save {x}', { x: omr(saveBaisa) })}</span>` : ''}</div>
        <p class="tax-note" id="taxNote">${t('Delivery calculated at checkout.')}</p>
        ${p.short_desc ? `<p class="pdp-lead">${esc(p.short_desc)}</p>` : ''}
        <div class="stock-line ${soldOut ? 'out' : ''}"><i></i>${soldOut ? t('Sold out — check back soon') : t('In stock · ready to ship')}</div>
        <div class="buy-row">
          <div class="qty" role="group" aria-label="${t('Quantity')}">
            <button type="button" id="qMinus" aria-label="${t('Decrease quantity')}" disabled>−</button>
            <input type="number" id="qInput" value="1" min="1" max="${maxQty}" inputmode="numeric" aria-label="${t('Quantity')}" ${soldOut ? 'disabled' : ''}>
            <button type="button" id="qPlus" aria-label="${t('Increase quantity')}" ${maxQty <= 1 ? 'disabled' : ''}>+</button>
          </div>
          <button class="btn btn-primary" type="button" id="addBtn" ${soldOut ? 'disabled' : ''}>${soldOut ? t('Sold out') : t('Add to cart')}</button>
        </div>
        <p class="qty-hint" id="qHint" aria-live="polite"></p>
        ${soldOut ? '' : `<button class="btn btn-blue btn-block pdp-buynow" type="button" id="buyNow">${t('Buy now')}</button>`}
        <div class="perks">
          <div class="perk">${I.truck}<div><b>${t('Delivery across Oman')}</b><span>${t('Muscat 1–2 days · other governorates 2–5 days · free over {x}', { x: '<span data-free>OMR 25</span>' })}</span></div></div>
          <div class="perk">${I.lock}<div><b>${t('Pay your way')}</b><span>${t('Thawani Pay (Visa, Mastercard, debit) or cash on delivery')}</span></div></div>
          <div class="perk">${I.shield}<div><b>${t('1-year warranty')}</b><span>${t('Genuine product · 14-day returns on defects')}</span></div></div>
        </div>
        <div class="acc">
          ${p.full_desc ? `<details open><summary>${t('Description')}</summary><div class="acc-body"><p>${esc(p.full_desc)}</p></div></details>` : ''}
          ${specs.length ? `<details ${p.full_desc ? '' : 'open'}><summary>${t('Specifications')}</summary><div class="acc-body"><table class="spec-table"><tbody>${specs.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}<tr><th>${t('SKU')}</th><td dir="ltr">${esc(p.sku)}</td></tr></tbody></table></div></details>` : ''}
          <details><summary>${t('Delivery & returns')}</summary><div class="acc-body"><p>${t('Orders placed before 2 pm are usually dispatched the same day from Muscat. You can return a defective item within 14 days in its original packaging.')} <a href="/policies" style="text-decoration:underline">${t('Read our policies')}</a>.</p></div></details>
        </div>
      </div>`;

    window.GMG.storeReady.then(s => { if (s.free_shipping_threshold_formatted) $$('[data-free]').forEach(el => el.textContent = s.free_shipping_threshold_formatted.replace('.000', '')); });
    api('/api/checkout/config').then(r => { if (!r.data.vat_inclusive) $('#taxNote').textContent = t('+ {p}% VAT and delivery calculated at checkout.', { p: r.data.vat_percentage }); else $('#taxNote').textContent = t('Price includes VAT. Delivery calculated at checkout.'); }).catch(() => {});

    // ---------- Gallery ----------
    const track = $('#track'); let gi = 0;
    function show(i) {
      gi = Math.max(0, Math.min(images.length - 1, i));
      track.style.transform = `translateX(${(RTL ? 1 : -1) * gi * 100}%)`;
      $$('#dots i').forEach((d, k) => d.classList.toggle('is-active', k === gi));
      $$('#thumbs button').forEach((b, k) => b.classList.toggle('is-active', k === gi));
    }
    const thumbsEl = $('#thumbs');
    if (thumbsEl) thumbsEl.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) show(+b.dataset.i); });
    if (images.length > 1) {
      let sx = 0, sy = 0, dx = 0, drag = false;
      const main = $('#galleryMain');
      main.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; dx = 0; drag = true; track.style.transition = 'none'; }, { passive: true });
      main.addEventListener('touchmove', e => {
        if (!drag) return;
        dx = e.touches[0].clientX - sx;
        if (Math.abs(e.touches[0].clientY - sy) > Math.abs(dx)) return;
        track.style.transform = `translateX(calc(${(RTL ? 1 : -1) * gi * 100}% + ${dx}px))`;
      }, { passive: true });
      main.addEventListener('touchend', () => { drag = false; track.style.transition = ''; if (Math.abs(dx) > 50) show(gi + ((dx < 0) !== RTL ? 1 : -1)); else show(gi); });
    }

    // ---------- Quantity ----------
    const qInput = $('#qInput'), qMinus = $('#qMinus'), qPlus = $('#qPlus'), qHint = $('#qHint');
    function setQty(n) {
      const v = Math.max(1, Math.min(maxQty || 1, n || 1));
      qInput.value = v;
      qMinus.disabled = v <= 1;
      qPlus.disabled = v >= maxQty;
      qHint.textContent = (v >= maxQty && maxQty > 0 && maxQty < 10) ? t('That’s the most you can order right now.') : '';
    }
    qMinus.onclick = () => setQty(+qInput.value - 1);
    qPlus.onclick = () => setQty(+qInput.value + 1);
    qInput.onchange = () => setQty(parseInt(qInput.value, 10));

    const cartItem = { sku: p.sku, slug: p.slug, name: p.name, image: images[0], price_baisa: p.pricing.current_baisa, retail_baisa: p.pricing.retail_baisa, max_qty: maxQty };
    const addBtn = $('#addBtn');
    addBtn.onclick = async () => {
      const ok = await addToCart(cartItem, +qInput.value, addBtn, { openDrawer: true });
      if (ok) setQty(1);
    };
    const buyNow = $('#buyNow');
    if (buyNow) buyNow.onclick = async () => {
      const inCart = window.GMG.Cart.items().find(i => i.sku === p.sku);
      if (!inCart) window.GMG.Cart.add(cartItem, +qInput.value);
      location.href = '/checkout';
    };

    // ---------- Sticky add-to-cart on mobile ----------
    const sticky = $('#stickyBuy');
    if (!soldOut) {
      $('#stickyName').textContent = p.name;
      $('#stickyPrice').textContent = omr(p.pricing.current_baisa);
      $('#stickyAdd').onclick = e => addToCart(cartItem, 1, e.currentTarget, { openDrawer: true });
      const io = new IntersectionObserver(([en]) => {
        const show = !en.isIntersecting && en.boundingClientRect.top < 0;
        sticky.classList.toggle('is-visible', show);
        sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
        document.body.classList.toggle('has-sticky-buy', show && innerWidth < 960);
      });
      io.observe(addBtn);
    }

    // ---------- Related ----------
    {
      const rel = await api(`/api/products?category=${encodeURIComponent(p.category.slug)}&limit=12`).then(r => r.data.filter(x => x.sku !== p.sku && x.available).slice(0, 4)).catch(() => []);
      let list = rel;
      if (list.length < 4) {
        const more = await api('/api/products?sort=bestselling&limit=12').then(r => r.data).catch(() => []);
        list = list.concat(more.filter(x => x.sku !== p.sku && x.available && !list.some(l => l.sku === x.sku))).slice(0, 4);
      }
      if (list.length) {
        $('#related').innerHTML = list.map(cardHtml).join('');
        $('#related').classList.add('reveal-stagger');
        bindCards($('#related'), list);
        $('#relatedSection').hidden = false;
        reveal();
      }
    }
  };
  if (window.GMG) start(); else document.addEventListener('DOMContentLoaded', start);
})();
