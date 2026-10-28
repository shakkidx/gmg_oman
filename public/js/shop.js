/* Shop & category listing: /shop, /shop?q=..., /category/:slug */
(function () {
  'use strict';
  const start = async () => {
    const { $, esc, api, cardHtml, skeletonCards, reveal, addToCart, productFromApi, I, t } = window.GMG;

    const params = new URLSearchParams(location.search);
    const catMatch = location.pathname.match(/^\/category\/([^/]+)/);
    let state = {
      cat: catMatch ? decodeURIComponent(catMatch[1]) : (params.get('cat') || ''),
      q: params.get('q') || '',
      sort: params.get('sort') || 'featured'
    };
    $('#sort').value = state.sort;

    const grid = $('#grid');
    let current = [];
    const cats = await window.GMG.categoriesReady;
    const total = cats.reduce((n, c) => n + c.product_count, 0);

    function renderChips() {
      $('#chips').innerHTML = `<a class="chip${!state.cat ? ' is-active' : ''}" href="/shop" data-cat="" role="tab" aria-selected="${!state.cat}">${t('All')} <small>${total}</small></a>` +
        cats.map(c => `<a class="chip${state.cat === c.slug ? ' is-active' : ''}" href="/category/${esc(c.slug)}" data-cat="${esc(c.slug)}" role="tab" aria-selected="${state.cat === c.slug}">${esc(c.name)} <small>${c.product_count}</small></a>`).join('');
      const active = $('#chips .is-active');
      if (active) active.scrollIntoView({ inline: 'center', block: 'nearest' });
    }

    function renderHead() {
      const cat = cats.find(c => c.slug === state.cat);
      if (state.q) {
        $('#shopTitle').textContent = t('Results for “{q}”', { q: state.q });
        $('#shopDesc').innerHTML = `<a class="link-arrow" href="/shop">${t('Clear search')}</a>`;
        $('#crumbHere').textContent = t('Search');
        document.title = `Search: ${state.q} — Global Markets Gateway`;
      } else if (cat) {
        $('#shopTitle').textContent = cat.name;
        $('#shopDesc').textContent = cat.description || '';
        $('#crumbHere').textContent = cat.name;
        document.title = `${cat.name} — Global Markets Gateway`;
      } else {
        $('#shopTitle').textContent = t('All products');
        $('#shopDesc').textContent = t('Fast chargers, power banks and cables — everything to keep your devices going.');
        $('#crumbHere').textContent = t('Shop');
        document.title = 'Shop — Global Markets Gateway';
      }
    }

    async function load() {
      grid.innerHTML = skeletonCards(8);
      $('#resultCount').textContent = '';
      const qs = new URLSearchParams({ limit: '100', sort: state.sort });
      if (state.cat) qs.set('category', state.cat);
      if (state.q) qs.set('search', state.q);
      try {
        const r = await api('/api/products?' + qs);
        current = r.data;
        if (!current.length) {
          grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>${t('No products found')}</h3><p>${t('Try a different search or browse all products.')}</p><a class="btn btn-primary" href="/shop">${t('Browse all')}</a></div>`;
        } else {
          grid.classList.remove('is-in');
          grid.classList.add('reveal-stagger');
          grid.innerHTML = current.map(cardHtml).join('');
          reveal();
        }
        $('#resultCount').textContent = current.length === 1 ? t('1 product') : t('{n} products', { n: current.length });
      } catch (e) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>${t('Something went wrong')}</h3><p>${esc(e.message)}</p></div>`;
      }
    }

    // Quick-add uses whichever products are currently shown
    grid.addEventListener('click', async e => {
      const btn = e.target.closest('[data-quick]'); if (!btn) return;
      e.preventDefault();
      const p = current.find(x => x.sku === btn.dataset.quick); if (!p) return;
      if (await addToCart(productFromApi(p), 1, btn)) {
        btn.classList.add('added'); btn.innerHTML = I.check;
        setTimeout(() => { btn.classList.remove('added'); btn.innerHTML = I.plus; }, 1400);
      }
    });

    function navigate(push) {
      const url = state.cat ? `/category/${encodeURIComponent(state.cat)}` : '/shop';
      const qs = new URLSearchParams();
      if (state.q) qs.set('q', state.q);
      if (state.sort !== 'featured') qs.set('sort', state.sort);
      const full = url + (qs.toString() ? `?${qs}` : '');
      if (push) history.pushState(state, '', full);
      renderChips(); renderHead(); load();
    }

    $('#chips').addEventListener('click', e => {
      const a = e.target.closest('[data-cat]'); if (!a) return;
      e.preventDefault();
      state = { ...state, cat: a.dataset.cat, q: '' };
      navigate(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    $('#sort').addEventListener('change', e => { state.sort = e.target.value; navigate(true); });
    window.addEventListener('popstate', e => { if (e.state) { state = e.state; $('#sort').value = state.sort; navigate(false); } });

    history.replaceState(state, '', location.href);
    navigate(false);
  };
  if (window.GMG) start(); else document.addEventListener('DOMContentLoaded', start);
})();
