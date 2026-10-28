/* Homepage: animated hero slider, categories, best sellers, spotlight, collection grid */
(function () {
  'use strict';
  const start = () => {
    const { $, $$, esc, omr, thumb, api, cardHtml, bindCards, productFromApi, addToCart, skeletonCards, reveal, I, t, RTL } = window.GMG;

    $$('[data-arrow]').forEach(a => a.insertAdjacentHTML('beforeend', I.arrow));
    $('#heroPrev').innerHTML = I.left; $('#heroNext').innerHTML = I.right;
    $$('[data-rail="prev"]').forEach(b => b.innerHTML = I.left);
    $$('[data-rail="next"]').forEach(b => b.innerHTML = I.right);

    // Trust strip
    $('#trustRow').innerHTML = [
      [I.truck, 'Free delivery over OMR 25', 'All 11 governorates'],
      [I.lock, 'Secure Thawani checkout', 'Cards or cash on delivery'],
      [I.shield, '1-year warranty', 'Genuine MEVRIO products'],
      [I.refresh, '14-day returns', 'Hassle-free exchange']
    ].map(([ic, b, s]) => `<div class="trust-item">${ic}<div><b>${t(b)}</b><span>${t(s)}</span></div></div>`).join('');

    $('#catGrid').innerHTML = skeletonCards(4);
    $('#bestRail').innerHTML = skeletonCards(4);
    $('#newGrid').innerHTML = skeletonCards(8);

    // ---------- Hero ----------
    const TINTS = { 'power-banks': '#e4ebf8', chargers: '#e8eaf0', cables: '#e3edf5', 'car-chargers': '#e7e9f2' };
    function headline(text, fallback) {
      const t = (text || '').trim();
      if (!t) return `<span class="line"><span>${esc(fallback)}</span></span>`;
      const parts = t.match(/[^.!?]+[.!?]?/g).map(s => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        return parts.map((p, i) => `<span class="line"><span>${i === parts.length - 1 ? `<em>${esc(p)}</em>` : esc(p)}</span></span>`).join('');
      }
      const words = t.split(' ');
      const last = words.pop();
      return `<span class="line"><span>${esc(words.join(' '))} <em>${esc(last)}</em></span></span>`;
    }
    function shortName(name) { return name.replace(/^MEVRIO\s+/i, '').replace(/\s*ميفريو\s*/, ' ').trim(); }

    async function initHero(all) {
      let slides = all.filter(p => p.hero_tagline && p.available);
      if (slides.length < 2) slides = slides.concat(all.filter(p => p.is_featured && p.available && !slides.includes(p))).slice(0, 5);
      slides = slides.slice(0, 6);
      if (!slides.length) { $('#hero').hidden = true; return; }

      const imgs = $('#heroImages'); const copy = $('#heroCopy'); const bars = $('#heroBars');
      imgs.innerHTML = slides.map((p, i) => `<div class="hero-slide-img" data-i="${i}"><img src="${thumb(p.primary_image, 1100)}" alt="${esc(p.name)}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}></div>`).join('');
      copy.innerHTML = slides.map((p, i) => `
        <div class="hero-slide-copy" data-i="${i}" aria-hidden="true" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${slides.length}">
          <span class="eyebrow hero-kicker fade"><i class="dot"></i>${esc(p.category.name)}</span>
          <h1 class="hero-title">${headline(p.hero_tagline, shortName(p.name))}</h1>
          <p class="hero-name fade d1">${esc(p.name)}</p>
          <div class="hero-buy fade d2">
            <a class="btn btn-primary" href="/product/${esc(p.slug)}" tabindex="-1">${t('Shop now')} ${I.arrow}</a>
            <button class="btn btn-ghost" type="button" data-hero-add="${i}" tabindex="-1">${t('Add to cart')}</button>
            <span class="hero-price"><b>${omr(p.pricing.current_baisa)}</b>${p.pricing.is_on_sale ? `<s>${omr(p.pricing.retail_baisa)}</s>` : ''}</span>
          </div>
        </div>`).join('');
      bars.innerHTML = slides.map((_, i) => `<button type="button" class="hero-bar" data-go="${i}" aria-label="${i + 1}"><i></i></button>`).join('');
      $('#heroControls').hidden = slides.length < 2;

      const hero = $('#hero');
      const DUR = 6500;
      hero.style.setProperty('--hero-dur', DUR + 'ms');
      let cur = -1; let timer = null; let remaining = DUR; let startedAt = 0;

      function go(n, user) {
        n = (n + slides.length) % slides.length;
        if (n === cur) return;
        const prev = cur; cur = n;
        $$('.hero-slide-img', imgs).forEach((el, i) => { el.classList.toggle('is-active', i === n); el.classList.toggle('is-leaving', i === prev); });
        $$('.hero-slide-copy', copy).forEach((el, i) => {
          el.classList.toggle('is-active', i === n); el.classList.toggle('is-leaving', i === prev);
          el.setAttribute('aria-hidden', i === n ? 'false' : 'true');
          $$('a, button', el).forEach(b => b.tabIndex = i === n ? 0 : -1);
        });
        $$('.hero-bar', bars).forEach((b, i) => {
          b.classList.toggle('is-done', i < n); b.classList.remove('is-active');
          if (i === n) { void b.offsetWidth; b.classList.add('is-active'); }
        });
        $('#heroCount').innerHTML = `<b>${String(n + 1).padStart(2, '0')}</b> / ${String(slides.length).padStart(2, '0')}`;
        hero.style.setProperty('--hero-tint', TINTS[slides[n].category.slug] || '#e7edf7');
        setTimeout(() => { $$('.is-leaving', hero).forEach(el => el.classList.remove('is-leaving')); }, 700);
        schedule(DUR);
      }
      function schedule(ms) {
        clearTimeout(timer);
        if (slides.length < 2) return;
        remaining = ms; startedAt = Date.now();
        timer = setTimeout(() => go(cur + 1), ms);
      }
      function pause() { if (hero.classList.contains('is-paused')) return; hero.classList.add('is-paused'); clearTimeout(timer); remaining -= Date.now() - startedAt; }
      function resume() { if (!hero.classList.contains('is-paused')) return; hero.classList.remove('is-paused'); schedule(Math.max(400, remaining)); }

      $('#heroPrev').onclick = () => go(cur - 1, true);
      $('#heroNext').onclick = () => go(cur + 1, true);
      bars.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) go(+b.dataset.go, true); });
      hero.addEventListener('mouseenter', () => matchMedia('(hover: hover)').matches && pause());
      hero.addEventListener('mouseleave', resume);
      hero.addEventListener('focusin', pause);
      hero.addEventListener('focusout', resume);
      document.addEventListener('visibilitychange', () => document.hidden ? pause() : resume());
      hero.addEventListener('keydown', e => { const f = RTL ? -1 : 1; if (e.key === 'ArrowRight') go(cur + f); if (e.key === 'ArrowLeft') go(cur - f); });
      copy.addEventListener('click', e => {
        const b = e.target.closest('[data-hero-add]'); if (!b) return;
        addToCart(productFromApi(slides[+b.dataset.heroAdd]), 1, b);
      });

      // Swipe on touch devices
      let sx = 0, sy = 0, swiping = false;
      const stage = hero;
      stage.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; swiping = true; }, { passive: true });
      stage.addEventListener('touchend', e => {
        if (!swiping) return; swiping = false;
        const dx = e.changedTouches[0].clientX - sx; const dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) go(cur + ((dx < 0) !== RTL ? 1 : -1), true);
      }, { passive: true });

      const firstImg = $('img', imgs);
      const begin = () => { hero.classList.add('is-ready'); go(0); };
      if (firstImg.complete) begin(); else { firstImg.addEventListener('load', begin, { once: true }); firstImg.addEventListener('error', begin, { once: true }); setTimeout(() => { if (cur < 0) begin(); }, 1500); }
    }

    // ---------- Rails ----------
    function bindRail(rail) {
      const section = rail.closest('.section');
      const prev = $('[data-rail="prev"]', section); const next = $('[data-rail="next"]', section);
      const step = () => rail.clientWidth * .85;
      // In Arabic the rail scrolls right-to-left (scrollLeft goes negative), so flip the direction
      const dir = RTL ? -1 : 1;
      const update = () => { const s = Math.abs(rail.scrollLeft); prev.disabled = s < 8; next.disabled = s + rail.clientWidth > rail.scrollWidth - 8; };
      prev.onclick = () => rail.scrollBy({ left: -step() * dir, behavior: 'smooth' });
      next.onclick = () => rail.scrollBy({ left: step() * dir, behavior: 'smooth' });
      rail.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      update();
    }

    // ---------- Load data ----------
    Promise.all([
      api('/api/products?limit=60'),
      api('/api/products?sort=bestselling&limit=10'),
      window.GMG.categoriesReady
    ]).then(([allRes, bestRes, cats]) => {
      const all = allRes.data;
      initHero(all);

      // Categories
      $('#catGrid').innerHTML = cats.map(c => `
        <a class="cat-tile" href="/category/${esc(c.slug)}">
          <img src="${thumb(c.image_url, 480)}" alt="" loading="lazy">
          <h3>${esc(c.name)}</h3>
          <div class="meta" style="margin-top:auto"><span>${c.product_count === 1 ? t('1 product') : t('{n} products', { n: c.product_count })}</span><span class="go">${I.arrow}</span></div>
        </a>`).join('');

      // Best sellers
      const best = bestRes.data.filter(p => p.available);
      $('#bestRail').innerHTML = best.map(cardHtml).join('');
      bindCards($('#bestRail'), best);
      bindRail($('#bestRail'));

      // Spotlight: the most powerful GaN wall charger we have
      const charger = all.find(p => p.category.slug === 'chargers' && /45\s?w/i.test(p.name) && p.available) || all.find(p => p.category.slug === 'chargers');
      if (charger) {
        $('#spotImg').src = thumb(charger.primary_image, 1100);
        $('#spotImg').alt = charger.name;
        $('#spotCta').href = `/product/${charger.slug}`;
        $('#spotCta').innerHTML = RTL ? `${t('Shop now')} ${I.arrow}` : `Shop ${esc(charger.name.replace(/^MEVRIO\s+/i, '').split(' ').slice(0, 3).join(' '))} ${I.arrow}`;
        $('#spotlight').hidden = false;
      }

      // Collection grid: a mix across categories, featured first
      const shown = new Set(best.slice(0, 4).map(p => p.sku));
      const grid = all.filter(p => !shown.has(p.sku) && p.available).slice(0, 8);
      $('#newGrid').innerHTML = grid.map(cardHtml).join('');
      $('#newGrid').classList.add('reveal-stagger');
      bindCards($('#newGrid'), grid);
      reveal();
    }).catch(err => {
      console.error(err);
      $('#newGrid').innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>${t("We couldn't load products")}</h3><p>${t('Please refresh the page.')}</p></div>`;
    });
  };
  if (window.GMG) start(); else document.addEventListener('DOMContentLoaded', start);
})();
