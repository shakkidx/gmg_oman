/* =====================================================================
   Global Markets Gateway — Admin panel (single page, hash routes)
   #/            Dashboard (sales, orders to ship, low stock, Odoo)
   #/orders      Orders with tabs + detail sheet with status actions
   #/products    Products grid + add/edit sheet with photo upload
   #/categories  Categories
   #/odoo        Odoo connection, stock sync, order sync log
   #/settings    Store details, delivery, payments, password
   ===================================================================== */
(function () {
  'use strict';

  // ---------- Basics ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const omr = b => 'OMR ' + ((b || 0) / 1000).toFixed(3);
  const thumb = (u, s = 480) => !u ? '/images/placeholder-product.svg' : (/^\/(images\/products|uploads\/products)\//.test(u) ? `/thumbs/${s}${u}.webp` : u);
  const when = s => { const d = new Date(String(s).replace(' ', 'T') + (String(s).includes('Z') || String(s).includes('+') ? '' : 'Z')); return isNaN(d) ? '' : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };
  const ago = s => { const d = new Date(String(s).replace(' ', 'T') + (String(s).includes('Z') || String(s).includes('+') ? '' : 'Z')); const m = Math.round((Date.now() - d) / 60000); if (isNaN(m)) return ''; if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`; if (m < 1440) return `${Math.round(m / 60)} h ago`; return when(s); };

  const I = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/></svg>',
    orders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6" stroke-linecap="round"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/></svg>',
    sync: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.2 21.8l5.1-1.3A9.7 9.7 0 1 0 12 2.2zm4.4 11.7c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3 2.7 2.7 0 0 0-.9 2c0 1.2.9 2.4 1 2.5.1.2 1.7 2.7 4.2 3.8 1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.2.2-.6.2-1.1.1-1.2z"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>'
  };

  const token = () => localStorage.getItem('gmg_admin_token');
  function logout() { localStorage.removeItem('gmg_admin_token'); localStorage.removeItem('gmg_admin_user'); location.replace('/admin/login.html'); }
  async function api(path, opts = {}) {
    const res = await fetch(path, { method: opts.method || 'GET', headers: { Authorization: `Bearer ${token()}`, ...(opts.body ? { 'Content-Type': 'application/json' } : {}) }, body: opts.body ? JSON.stringify(opts.body) : undefined });
    if (res.status === 401) { logout(); throw new Error('Session expired'); }
    let data = null; try { data = await res.json(); } catch (e) { /* not JSON */ }
    if (!res.ok || (data && data.success === false)) throw new Error((data && (data.error || data.message)) || `Request failed (${res.status})`);
    return data;
  }
  function toast(msg, type) {
    let host = $('.toast-host');
    if (!host) { host = document.createElement('div'); host.className = 'toast-host'; host.setAttribute('role', 'status'); document.body.appendChild(host); }
    const t = document.createElement('div'); t.className = 'toast' + (type === 'error' ? ' error' : ''); t.textContent = msg; host.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }
  async function busy(btn, fn) {
    const html = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>${btn.dataset.busy ? ' ' + btn.dataset.busy : ''}`;
    try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = html; }
  }

  // ---------- Sheet (side panel / bottom sheet) ----------
  const sheet = $('#sheet'); const backdrop = $('#backdrop');
  function openSheet(title, bodyHtml, footHtml) {
    sheet.innerHTML = `<div class="sheet-head"><button class="icon-btn" data-close-sheet aria-label="Close">${I.close}</button><h2>${title}</h2></div><div class="sheet-body">${bodyHtml}</div>${footHtml ? `<div class="sheet-foot">${footHtml}</div>` : ''}`;
    sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false'); backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
    return sheet;
  }
  function closeSheet() { sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true'); backdrop.classList.remove('open'); document.body.style.overflow = ''; }
  backdrop.onclick = closeSheet;
  document.addEventListener('click', e => { if (e.target.closest('[data-close-sheet]')) closeSheet(); if (e.target.closest('[data-logout]')) { e.preventDefault(); logout(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheet.classList.contains('open')) closeSheet(); });

  // ---------- Navigation ----------
  const NAV = [
    { r: '', label: 'Dashboard', icon: I.home },
    { r: 'orders', label: 'Orders', icon: I.orders },
    { r: 'products', label: 'Products', icon: I.box },
    { r: 'categories', label: 'Categories', icon: I.tag },
    { r: 'odoo', label: 'Odoo sync', icon: I.sync },
    { r: 'settings', label: 'Settings', icon: I.gear }
  ];
  const TAB = [NAV[0], NAV[1], NAV[2], NAV[4], { r: 'more', label: 'More', icon: I.more }];
  let toShip = 0;
  function renderNav(route) {
    const isOn = r => (r === route || (r === 'more' && ['categories', 'settings', 'more'].includes(route)));
    $('#sideNav').innerHTML = NAV.map(n => `<a href="#/${n.r}" class="${isOn(n.r) ? 'active' : ''}">${n.icon}<span>${n.label}</span>${n.r === 'orders' && toShip ? `<span class="count">${toShip}</span>` : ''}</a>`).join('');
    $('#tabbar').innerHTML = TAB.map(n => `<a href="#/${n.r}" class="${isOn(n.r) ? 'active' : ''}">${n.icon}<span>${n.label}</span>${n.r === 'orders' && toShip ? `<span class="dot">${toShip}</span>` : ''}</a>`).join('');
  }

  const STATUS = {
    pending: ['Awaiting payment', 'warn'], confirmed: ['New · to pack', 'blue'], processing: ['Packing', 'blue'],
    shipped: ['Shipped', 'ok'], delivered: ['Delivered', 'ok'], cancelled: ['Cancelled', 'bad'], refunded: ['Refunded', 'bad']
  };
  const PAY = { paid: ['Paid', 'ok'], unpaid: ['COD', ''], pending: ['Payment pending', 'warn'], cancelled: ['Payment cancelled', 'bad'], failed: ['Payment failed', 'bad'], refunded: ['Refunded', 'bad'] };
  const ODOO = { odoo_confirmed: ['In Odoo', 'ok'], odoo_synced: ['In Odoo', 'ok'], pending_integration: ['Odoo: waiting', ''], odoo_failed: ['Odoo: failed', 'bad'] };
  const pill = (map, k) => { const [t, c] = map[k] || [k, '']; return `<span class="pill ${c}">${esc(t)}</span>`; };

  // =====================================================================
  // DASHBOARD
  // =====================================================================
  async function viewDashboard(v) {
    v.innerHTML = `
      <div id="pwBanner"></div>
      <div class="kpis">${Array.from({ length: 4 }, () => '<div class="card kpi"><div class="skel" style="height:14px;width:60%"></div><div class="skel" style="height:26px;width:80%;margin-top:12px"></div></div>').join('')}</div>
      <div class="dash-grid">
        <div style="display:grid;gap:16px;align-content:start">
          <div class="card card-pad"><div class="card-head"><h3>Sales</h3><div class="seg" id="range"><button data-d="7">7 days</button><button data-d="30" class="on">30 days</button><button data-d="90">90 days</button></div></div><div id="salesSummary" style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:12px"></div><div class="chart" id="chart"></div></div>
          <div class="card card-pad"><div class="card-head"><h3>Orders to pack &amp; ship</h3><a href="#/orders">All orders →</a></div><div class="list" id="shipList"></div></div>
        </div>
        <div style="display:grid;gap:16px;align-content:start">
          <div class="card card-pad" id="odooCard"></div>
          <div class="card card-pad"><div class="card-head"><h3>Top products</h3></div><div class="list" id="topList"></div></div>
          <div class="card card-pad"><div class="card-head"><h3>Low stock</h3><a href="#/products">Products →</a></div><div class="list" id="lowList"></div></div>
        </div>
      </div>`;

    if (localStorage.getItem('gmg_admin_mustchange')) {
      $('#pwBanner').innerHTML = `<div class="banner warn"><div><b>Please change the default password</b>Anyone who knows the factory password could sign in.</div><a class="btn btn-sm btn-primary" href="#/settings">Change now</a></div>`;
    }

    const loadSales = async days => {
      const s = (await api(`/api/admin/dashboard/sales?days=${days}`)).data;
      $('.kpis').innerHTML = `
        <div class="card kpi"><div class="label"><i></i>Today</div><div class="value">${s.today.revenue_formatted}</div><div class="sub">${s.today.orders} order${s.today.orders === 1 ? '' : 's'}</div></div>
        <div class="card kpi"><div class="label"><i style="background:#7fb2ff"></i>This month</div><div class="value">${s.month.revenue_formatted}</div><div class="sub">${s.month.orders} orders</div></div>
        <a class="card kpi ${s.orders_to_ship ? 'alert' : ''}" href="#/orders"><div class="label"><i style="background:var(--warn)"></i>To pack &amp; ship</div><div class="value">${s.orders_to_ship}</div><div class="sub">orders waiting</div></a>
        <div class="card kpi"><div class="label"><i style="background:var(--ok)"></i>Avg. order</div><div class="value">${s.period.avg_order_formatted}</div><div class="sub">last ${s.days} days</div></div>`;
      $('#salesSummary').innerHTML = `<div><div style="font-size:12.5px;color:var(--muted);font-weight:600">Revenue · ${s.days} days</div><div style="font:600 22px var(--display)">${s.period.revenue_formatted}</div></div><div><div style="font-size:12.5px;color:var(--muted);font-weight:600">Orders</div><div style="font:600 22px var(--display)">${s.period.orders}</div></div>` +
        s.by_payment.map(p => `<div><div style="font-size:12.5px;color:var(--muted);font-weight:600">${p.method === 'cod' ? 'Cash on delivery' : 'Thawani'}</div><div style="font:600 22px var(--display)">${p.revenue_formatted}</div></div>`).join('');
      drawChart($('#chart'), s.trend);
      $('#topList').innerHTML = s.top_products.length ? s.top_products.slice(0, 5).map(p => `<div class="row"><span class="thumb"><img src="${thumb(p.image)}" alt=""></span><div class="grow"><div class="title">${esc(p.name_en)}</div><div class="meta">${p.units} sold</div></div><div class="end"><b>${p.revenue_formatted}</b></div></div>`).join('') : '<p style="color:var(--muted);font-size:14px">No sales yet in this period.</p>';
      toShip = s.orders_to_ship; renderNav('');
    };
    $('#range').onclick = e => { const b = e.target.closest('[data-d]'); if (!b) return; $$('#range button').forEach(x => x.classList.toggle('on', x === b)); loadSales(+b.dataset.d); };

    try { await loadSales(30); } catch (e) { toast(e.message, 'error'); }

    api('/api/admin/orders?tab=to_ship&limit=6').then(r => {
      $('#shipList').innerHTML = r.data.length ? r.data.map(o => `<div class="row" style="cursor:pointer" data-order="${o.id}"><div class="grow"><div class="title">${esc(o.order_number)} · ${esc(o.customer_name)}</div><div class="meta">${esc(o.delivery_city)}, ${esc(o.delivery_governorate)} · ${ago(o.created_at)}</div></div><div class="end"><b>${o.total_formatted}</b><div>${pill(PAY, o.payment_status)}</div></div></div>`).join('') : '<p style="color:var(--muted);font-size:14px">All caught up — nothing to ship. 🎉</p>';
      $('#shipList').onclick = e => { const r2 = e.target.closest('[data-order]'); if (r2) openOrder(r2.dataset.order, () => viewDashboard(v)); };
    });
    api('/api/admin/dashboard/kpis').then(r => {
      const k = r.data;
      $('#lowList').innerHTML = k.inventory.low_stock_items.length ? k.inventory.low_stock_items.map(p => `<div class="row"><div class="grow"><div class="title">${esc(p.name_en)}</div><div class="meta mono">${esc(p.sku)}</div></div><div class="end"><span class="stock-badge ${p.stock_quantity === 0 ? 'out' : 'low'}">${p.stock_quantity === 0 ? 'Sold out' : p.stock_quantity + ' left'}</span></div></div>`).join('') : '<p style="color:var(--muted);font-size:14px">Stock levels look healthy.</p>';
      const i = k.integrations;
      $('#odooCard').innerHTML = `<div class="card-head"><h3>Odoo</h3>${i.odoo_mode === 'live' ? (i.odoo_health === 'healthy' ? '<span class="pill ok">Connected</span>' : '<span class="pill bad">Offline</span>') : '<span class="pill warn">Test mode</span>'}</div>
        <p style="font-size:13.5px;color:var(--muted);margin:0 0 14px">${i.odoo_mode === 'live' ? `Stock updates from Odoo automatically. Last sync ${i.odoo_last_sync ? ago(i.odoo_last_sync) : 'never'}.` : 'Not connected to your real Odoo yet. Add your Odoo details on the Odoo page to sync stock and orders.'}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" id="dashSync" data-busy="Syncing">${I.sync} Sync stock now</button><a class="btn btn-ghost btn-sm" href="#/odoo">Odoo settings</a></div>`;
      $('#dashSync').onclick = e => busy(e.currentTarget, async () => { const r2 = await api('/api/admin/odoo/sync-stock', { method: 'POST' }); toast(r2.message); });
    });
  }

  function drawChart(el, data) {
    const W = 640, H = 200, pad = { l: 44, r: 6, t: 10, b: 24 };
    const max = Math.max(1000, ...data.map(d => d.revenue_baisa));
    const nice = Math.ceil(max / 1000 / 4) * 4 * 1000 || 4000;
    const bw = (W - pad.l - pad.r) / data.length;
    const y = v => pad.t + (H - pad.t - pad.b) * (1 - v / nice);
    const step = Math.ceil(data.length / 7);
    let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Daily revenue">`;
    for (let i = 0; i <= 4; i++) { const v = nice * i / 4; svg += `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${pad.l - 8}" y="${y(v) + 3}" text-anchor="end">${(v / 1000).toFixed(0)}</text>`; }
    data.forEach((d, i) => {
      const x = pad.l + i * bw + bw * .18; const h = Math.max(2, H - pad.b - y(d.revenue_baisa));
      svg += `<rect class="bar ${d.revenue_baisa ? '' : 'zero'}" x="${x}" y="${H - pad.b - h}" width="${bw * .64}" height="${h}" rx="${Math.min(3, bw * .3)}" data-i="${i}"/>`;
      if (i % step === 0) svg += `<text class="axis" x="${x + bw * .32}" y="${H - 6}" text-anchor="middle">${new Date(d.day + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</text>`;
    });
    el.innerHTML = svg + '</svg><div class="chart-tip"></div>';
    const tip = $('.chart-tip', el);
    el.onmousemove = e => {
      const r = e.target.closest('rect'); if (!r) { tip.style.opacity = 0; return; }
      const d = data[+r.dataset.i]; const box = el.getBoundingClientRect(); const rb = r.getBoundingClientRect();
      tip.innerHTML = `<b>${omr(d.revenue_baisa)}</b> · ${d.orders} order${d.orders === 1 ? '' : 's'}<br>${new Date(d.day + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`;
      tip.style.left = (rb.left - box.left + rb.width / 2) + 'px'; tip.style.top = (rb.top - box.top) + 'px'; tip.style.opacity = 1;
    };
    el.onmouseleave = () => { tip.style.opacity = 0; };
  }

  // =====================================================================
  // ORDERS
  // =====================================================================
  async function viewOrders(v) {
    const TABS = [['to_ship', 'To ship'], ['', 'All'], ['awaiting_payment', 'Awaiting payment'], ['shipped', 'Shipped'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']];
    let tab = sessionStorage.getItem('adm_order_tab') ?? 'to_ship'; let q = '';
    v.innerHTML = `<div class="view-head"><div><h2>Orders</h2><p>Tap an order to see details and update its status.</p></div></div>
      <div class="tabs" id="oTabs"></div>
      <div class="filters"><label class="search">${I.search}<input id="oSearch" placeholder="Search order no., name or phone" type="search"></label></div>
      <div class="card" id="oList"></div>`;
    let timer;
    $('#oSearch').oninput = e => { clearTimeout(timer); timer = setTimeout(() => { q = e.target.value.trim(); load(); }, 250); };
    $('#oTabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; sessionStorage.setItem('adm_order_tab', tab); load(); };
    async function load() {
      $('#oList').innerHTML = '<div style="padding:18px"><div class="skel" style="height:44px"></div><div class="skel" style="height:44px;margin-top:10px"></div></div>';
      const qs = new URLSearchParams({ limit: '100' }); if (tab) qs.set('tab', tab); if (q) qs.set('search', q);
      try {
        const r = await api('/api/admin/orders?' + qs);
        toShip = r.tab_counts.to_ship; renderNav('orders');
        $('#oTabs').innerHTML = TABS.map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}${k && r.tab_counts[k] ? ` <small>${r.tab_counts[k]}</small>` : ''}</button>`).join('');
        $('#oList').innerHTML = r.data.length ? r.data.map(o => `
          <div class="order-row" data-order="${o.id}">
            <div><div class="no">${esc(o.order_number)}</div><div class="when">${when(o.created_at)}</div></div>
            <div class="amt" style="grid-row:span 1">${o.total_formatted}</div>
            <div class="who">${esc(o.customer_name)} · ${esc(o.customer_phone)}<br><span class="when">${esc(o.delivery_city)}, ${esc(o.delivery_governorate)}</span></div>
            <div class="pills">${pill(STATUS, o.fulfillment_status)}${pill(PAY, o.payment_status)}</div>
          </div>`).join('') : `<div class="empty"><h3>No orders here</h3><p>${tab === 'to_ship' ? 'Nothing waiting to be shipped right now.' : 'Try another tab or search.'}</p></div>`;
      } catch (e) { $('#oList').innerHTML = `<div class="empty"><h3>Couldn't load orders</h3><p>${esc(e.message)}</p></div>`; }
    }
    $('#oList').onclick = e => { const r = e.target.closest('[data-order]'); if (r) openOrder(r.dataset.order, load); };
    load();
  }

  async function openOrder(id, onChange) {
    openSheet('Order', '<div class="skel" style="height:120px"></div><div class="skel" style="height:220px;margin-top:14px"></div>');
    let o;
    try { o = (await api(`/api/admin/orders/${encodeURIComponent(id)}`)).data; } catch (e) { toast(e.message, 'error'); closeSheet(); return; }
    const steps = ['confirmed', 'processing', 'shipped', 'delivered'];
    const si = steps.indexOf(o.fulfillment_status);
    const cancelled = ['cancelled', 'refunded'].includes(o.fulfillment_status);
    const awaitingPay = o.payment_method === 'thawani' && o.payment_status !== 'paid';
    const phone = (o.customer_phone || '').replace(/\D/g, '');
    const nextAction = { confirmed: ['processing', 'Start packing'], processing: ['shipped', 'Mark as shipped'], shipped: ['delivered', 'Mark as delivered'] }[o.fulfillment_status];
    const waMsg = encodeURIComponent(`Hello ${o.customer_name}, this is Global Markets Gateway about your order ${o.order_number}.`);

    const body = `
      ${awaitingPay && !cancelled ? `<div class="banner warn"><div><b>Waiting for Thawani payment</b>Don't ship until the payment shows as Paid. Unpaid orders cancel themselves and return their stock automatically.</div></div>` : ''}
      ${o.odoo_order_status === 'odoo_failed' ? `<div class="banner bad"><div><b>Not in Odoo yet</b>${esc(o.odoo_last_error || 'Odoo could not be reached.')}</div><button class="btn btn-sm btn-ghost" id="oRetry" data-busy="">Retry</button></div>` : ''}
      <div class="card card-pad section">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start">
          <div><div style="font:600 20px var(--display)">${esc(o.order_number)}</div><div style="color:var(--muted);font-size:13px">${when(o.created_at)}</div></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">${pill(STATUS, o.fulfillment_status)}${pill(PAY, o.payment_status)}${cancelled && o.odoo_order_status === 'pending_integration' ? '' : pill(ODOO, o.odoo_order_status)}</div>
        </div>
        ${!cancelled ? `<div style="margin-top:18px"><div class="status-steps">${steps.map((s, i) => `<div class="${i <= si ? 'done' : ''}"></div>`).join('')}</div><div class="status-steps-labels"><span>New</span><span>Packing</span><span>Shipped</span><span>Delivered</span></div></div>` : ''}
        ${!cancelled && !awaitingPay && nextAction ? `<button class="btn btn-primary btn-block" style="height:48px" data-set="${nextAction[0]}">${nextAction[1]}</button>` : ''}
      </div>
      <div class="card card-pad section">
        <h3 style="margin-bottom:12px">Customer</h3>
        <dl class="kv"><dt>Name</dt><dd>${esc(o.customer_name)}</dd><dt>Phone</dt><dd>${esc(o.customer_phone)}</dd>${o.customer_email ? `<dt>Email</dt><dd>${esc(o.customer_email)}</dd>` : ''}<dt>Address</dt><dd>${esc(o.delivery_address)}<br>${esc(o.delivery_city)}, ${esc(o.delivery_governorate)}</dd>${o.customer_notes ? `<dt>Notes</dt><dd>${esc(o.customer_notes)}</dd>` : ''}</dl>
        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><a class="btn btn-sm btn-ghost" href="https://wa.me/${phone}?text=${waMsg}" target="_blank" rel="noopener">${I.wa} WhatsApp</a><a class="btn btn-sm btn-ghost" href="tel:+${phone}">${I.phone} Call</a></div>
      </div>
      <div class="card card-pad section">
        <h3 style="margin-bottom:6px">Items</h3>
        <div class="list">${o.items.map(it => `<div class="row"><span class="thumb"><img src="${thumb(it.image_url)}" alt=""></span><div class="grow"><div class="title">${esc(it.name_en)}</div><div class="meta"><span class="mono">${esc(it.sku)}</span> · ${it.quantity} × ${it.unit_price_formatted}</div></div><div class="end"><b>${it.line_total_formatted}</b></div></div>`).join('')}</div>
        <div style="margin-top:10px">
          <div class="sum"><span>Subtotal</span><b>${o.subtotal_formatted}</b></div>
          ${o.discount_baisa ? `<div class="sum"><span>Discount</span><b>−${o.discount_formatted}</b></div>` : ''}
          <div class="sum"><span>Delivery</span><b>${o.delivery_formatted}</b></div>
          <div class="sum"><span>VAT</span><b>${o.vat_formatted}</b></div>
          <div class="sum total"><span>Total · ${o.payment_method === 'cod' ? 'Cash on delivery' : 'Thawani'}</span><b>${o.total_formatted}</b></div>
          <div class="sum" style="font-size:12.5px"><span>Your profit (excl. delivery &amp; VAT)</span><span>${o.gross_profit_formatted}</span></div>
        </div>
      </div>
      <div class="card card-pad section">
        <h3 style="margin-bottom:12px">History</h3>
        <ul class="timeline">${o.events.slice().reverse().map(ev => `<li>${esc(ev.description)}<small>${when(ev.created_at)} · ${esc(ev.created_by)}</small></li>`).join('')}</ul>
        ${o.odoo_sale_order_name ? `<p style="font-size:13px;color:var(--muted);margin:6px 0 0">Odoo sales order: <b class="mono">${esc(o.odoo_sale_order_name)}</b></p>` : ''}
      </div>`;
    const foot = cancelled ? '' : `<button class="btn btn-danger" data-set="cancelled">Cancel order</button><span class="spacer"></span>${o.fulfillment_status !== 'delivered' ? `<select class="btn btn-ghost" id="oManual" aria-label="Set status" style="padding-right:12px"><option value="">Set status…</option>${['confirmed', 'processing', 'shipped', 'delivered'].map(s => `<option value="${s}">${STATUS[s][0]}</option>`).join('')}</select>` : ''}${o.payment_method === 'cod' && o.payment_status !== 'paid' ? `<button class="btn btn-ghost" data-pay="paid">Cash received</button>` : ''}`;
    openSheet(esc(o.order_number), body, foot);

    const update = async (payload, btn) => {
      if (payload.fulfillmentStatus === 'cancelled' && !confirm(`Cancel order ${o.order_number}? Its items go back into website stock.${o.odoo_sale_order_name ? ' Also cancel ' + o.odoo_sale_order_name + ' in Odoo.' : ''}`)) return;
      const run = async () => { await api(`/api/admin/orders/${o.id}/status`, { method: 'PUT', body: payload }); toast('Order updated'); onChange && onChange(); openOrder(o.id, onChange); };
      btn ? busy(btn, run).catch(e => toast(e.message, 'error')) : run().catch(e => toast(e.message, 'error'));
    };
    $$('[data-set]', sheet).forEach(b => b.onclick = () => update({ fulfillmentStatus: b.dataset.set }, b));
    $$('[data-pay]', sheet).forEach(b => b.onclick = () => update({ paymentStatus: b.dataset.pay }, b));
    const man = $('#oManual'); if (man) man.onchange = () => man.value && update({ fulfillmentStatus: man.value });
    const retry = $('#oRetry'); if (retry) retry.onclick = () => busy(retry, async () => { const r = await api(`/api/admin/orders/${o.id}/sync-odoo`, { method: 'POST' }); toast(r.message, r.success ? '' : 'error'); openOrder(o.id, onChange); }).catch(e => toast(e.message, 'error'));
  }

  // =====================================================================
  // PRODUCTS
  // =====================================================================
  let categoriesCache = null;
  const loadCategories = async () => (categoriesCache = (await api('/api/admin/categories')).data);

  async function viewProducts(v) {
    let filter = 'all'; let q = ''; let cat = '';
    v.innerHTML = `<div class="view-head"><div><h2>Products</h2><p>Add products, set prices and choose what shows on the website.</p></div>
        <div style="display:flex;gap:8px"><a class="btn btn-ghost" href="#" id="csvBtn">${I.download} Export</a><button class="btn btn-blue" id="addProd">${I.plus} Add product</button></div></div>
      <div class="tabs" id="pTabs"></div>
      <div class="filters"><label class="search">${I.search}<input id="pSearch" type="search" placeholder="Search name, SKU or barcode"></label><select class="btn btn-ghost" id="pCat" style="padding-right:12px"><option value="">All categories</option></select></div>
      <div class="prod-grid" id="pGrid"></div>`;
    $('#addProd').onclick = () => openProduct(null, load);
    $('#csvBtn').onclick = async e => {
      e.preventDefault();
      const res = await fetch('/api/admin/products/export/csv', { headers: { Authorization: `Bearer ${token()}` } });
      const blob = await res.blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'products.csv'; a.click();
    };
    const cats = await loadCategories();
    $('#pCat').innerHTML += cats.map(c => `<option value="${c.id}">${esc(c.name_en)}</option>`).join('');
    $('#pCat').onchange = e => { cat = e.target.value; load(); };
    let timer; $('#pSearch').oninput = e => { clearTimeout(timer); timer = setTimeout(() => { q = e.target.value.trim(); load(); }, 250); };
    $('#pTabs').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; filter = b.dataset.f; load(); };
    $('#pGrid').onclick = e => { const c = e.target.closest('[data-id]'); if (c) openProduct(c.dataset.id, load); };

    async function load() {
      $('#pTabs').innerHTML = [['all', 'All'], ['live', 'On website'], ['hidden', 'Hidden'], ['low', 'Low stock'], ['out', 'Sold out']].map(([k, l]) => `<button data-f="${k}" class="${filter === k ? 'on' : ''}">${l}</button>`).join('');
      $('#pGrid').innerHTML = Array.from({ length: 8 }, () => '<div class="card"><div class="skel" style="aspect-ratio:4/3;border-radius:16px 16px 0 0"></div><div style="padding:12px"><div class="skel" style="height:14px"></div></div></div>').join('');
      const qs = new URLSearchParams({ limit: '200' });
      if (q) qs.set('search', q); if (cat) qs.set('category', cat);
      if (filter === 'low') qs.set('stock_status', 'low'); if (filter === 'out') qs.set('stock_status', 'out');
      let list = (await api('/api/admin/products?' + qs)).data;
      if (filter === 'live') list = list.filter(p => p.is_published); if (filter === 'hidden') list = list.filter(p => !p.is_published);
      $('#pGrid').innerHTML = list.length ? list.map(p => {
        const st = p.stock_quantity === 0 ? ['out', 'Sold out'] : (p.stock_quantity <= p.low_stock_threshold ? ['low', `${p.stock_quantity} left`] : ['ok', `${p.stock_quantity} in stock`]);
        return `<div class="card prod" data-id="${p.id}" tabindex="0">
          <div class="ph"><img src="${thumb(p.primary_image)}" alt="" loading="lazy">${!p.is_published ? '<span class="pill">Hidden</span>' : (p.hero_tagline ? '<span class="pill blue">In banner</span>' : (p.is_featured ? '<span class="pill blue">Featured</span>' : ''))}</div>
          <div class="body"><div class="name">${esc(p.name_en)}</div>
            <div class="line"><b>${p.sale_formatted || p.retail_formatted}</b><span class="stock-badge ${st[0]}">${st[1]}</span></div>
            <div class="line" style="color:var(--muted);font-size:12px"><span class="mono">${esc(p.sku)}</span><span>${p.margin_percent}% margin</span></div></div></div>`;
      }).join('') : `<div class="empty" style="grid-column:1/-1"><h3>No products found</h3><p>Try another filter, or add your first product.</p></div>`;
    }
    load();
  }

  /** Resize a photo in the browser before upload (keeps uploads small and fast on mobile data). */
  function resizeImage(file, max = 1600) {
    return new Promise((resolve, reject) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        const webp = c.toDataURL('image/webp', .86);
        resolve(webp.startsWith('data:image/webp') ? webp : c.toDataURL('image/jpeg', .88));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read this image')); };
      img.src = url;
    });
  }

  async function openProduct(id, onSaved) {
    const cats = categoriesCache || await loadCategories();
    let p = { name_en: '', name_ar: '', sku: '', barcode: '', brand: 'MEVRIO', category_id: cats[0] && cats[0].id, retail_price_baisa: '', sale_price_baisa: '', cost_price_baisa: '', stock_quantity: 0, low_stock_threshold: 5, short_desc_en: '', full_desc_en: '', specifications: '{}', is_featured: 0, is_published: 1, hero_tagline: '', images: [] };
    if (id) {
      openSheet('Edit product', '<div class="skel" style="height:300px"></div>');
      try { p = (await api(`/api/admin/products/${id}`)).data; } catch (e) { toast(e.message, 'error'); closeSheet(); return; }
    }
    let images = [...(p.images || [])];
    let specs = []; try { specs = Object.entries(JSON.parse(p.specifications || '{}')); } catch (e) { specs = []; }
    const money = b => (b === '' || b === null || b === undefined) ? '' : (b / 1000).toFixed(3);
    const odooLive = (await api('/api/admin/settings').then(r => r.data.odoo && r.data.odoo.odoo_mode && r.data.odoo.odoo_mode.value).catch(() => 'mock')) === 'live';

    const body = `
      <div class="card card-pad section">
        <h3>Photos</h3>
        <div class="photos" id="photos"></div>
        <p class="hint" style="font-size:12.5px;color:var(--muted);margin:10px 0 0">The first photo is the main one. Square photos on a white background look best.</p>
        <input type="file" id="fileIn" accept="image/*" multiple hidden>
      </div>
      <div class="card card-pad section"><h3>Basic details</h3><div class="fgrid">
        <div class="f"><label for="pName">Product name</label><input id="pName" value="${esc(p.name_en)}" placeholder="e.g. MEVRIO GaN 65W USB-C Charger"></div>
        <div class="fgrid c2">
          <div class="f"><label for="pCatSel">Category</label><select id="pCatSel">${cats.map(c => `<option value="${c.id}" ${c.id === p.category_id ? 'selected' : ''}>${esc(c.name_en)}</option>`).join('')}</select></div>
          <div class="f"><label for="pBrand">Brand</label><input id="pBrand" value="${esc(p.brand)}"></div>
        </div>
        <div class="f"><label for="pShort">Short description <span class="opt">(shown under the price)</span></label><textarea id="pShort" rows="2">${esc(p.short_desc_en || '')}</textarea></div>
        <div class="f"><label for="pFull">Full description <span class="opt">(optional)</span></label><textarea id="pFull" rows="4">${esc(p.full_desc_en || '')}</textarea></div>
      </div></div>
      <div class="card card-pad section"><h3>Arabic · العربية</h3><p style="font-size:13px;color:var(--muted);margin:0 0 12px">Shown when visitors switch the website to Arabic. If left empty, the English text is used.</p><div class="fgrid" dir="rtl">
        <div class="f"><label for="pNameAr">اسم المنتج</label><input id="pNameAr" value="${esc(p.name_ar && p.name_ar !== p.name_en ? p.name_ar : '')}" placeholder="مثال: شاحن ميفريو GaN بقوة ٦٥ واط"></div>
        <div class="f"><label for="pShortAr">وصف قصير</label><textarea id="pShortAr" rows="2">${esc(p.short_desc_ar || '')}</textarea></div>
        <div class="f"><label for="pFullAr">الوصف الكامل <span class="opt">(اختياري)</span></label><textarea id="pFullAr" rows="4">${esc(p.full_desc_ar || '')}</textarea></div>
        <div class="f"><label for="pHeroAr">عنوان البانر الرئيسي <span class="opt">(اختياري)</span></label><input id="pHeroAr" value="${esc(p.hero_tagline_ar || '')}" maxlength="60" placeholder="مثال: نحيف. مغناطيسي. جاهز دائماً."></div>
      </div></div>
      <div class="card card-pad section"><h3>Price</h3><div class="fgrid c3">
        <div class="f"><label for="pRetail">Regular price</label><div class="money"><span>OMR</span><input id="pRetail" inputmode="decimal" value="${money(p.retail_price_baisa)}" placeholder="0.000"></div></div>
        <div class="f"><label for="pSale">Sale price <span class="opt">(optional)</span></label><div class="money"><span>OMR</span><input id="pSale" inputmode="decimal" value="${money(p.sale_price_baisa)}" placeholder="—"></div></div>
        <div class="f"><label for="pCost">Your cost <span class="opt">(private)</span></label><div class="money"><span>OMR</span><input id="pCost" inputmode="decimal" value="${money(p.cost_price_baisa)}" placeholder="0.000"></div></div>
      </div><p id="marginHint" style="font-size:13px;color:var(--muted);margin:10px 0 0"></p></div>
      <div class="card card-pad section"><h3>Stock &amp; Odoo</h3>
        ${odooLive ? '<div class="banner info"><div><b>Stock comes from Odoo</b>The quantity below is updated automatically from your Odoo warehouse. Make sure the SKU matches the Internal Reference in Odoo.</div></div>' : '<div class="banner info"><div><b>Tip</b>Use the same SKU as the product’s Internal Reference in Odoo — that’s how stock and orders are matched.</div></div>'}
        <div class="fgrid c3">
          <div class="f"><label for="pSku">SKU (Odoo reference)</label><input id="pSku" class="mono" value="${esc(p.sku)}" placeholder="MEV-CH-6501"></div>
          <div class="f"><label for="pStock">Stock quantity</label><input id="pStock" type="number" min="0" inputmode="numeric" value="${p.stock_quantity}"></div>
          <div class="f"><label for="pLow">Low stock alert at</label><input id="pLow" type="number" min="0" inputmode="numeric" value="${p.low_stock_threshold}"></div>
        </div>
        <div class="f" style="margin-top:14px"><label for="pBarcode">Barcode <span class="opt">(optional)</span></label><input id="pBarcode" class="mono" value="${esc(p.barcode || '')}"></div>
      </div>
      <div class="card card-pad section"><h3>Specifications</h3><div class="spec-rows" id="specRows"></div><button class="btn btn-ghost btn-sm" type="button" id="addSpec" style="margin-top:10px">${I.plus} Add row</button></div>
      <div class="card card-pad section"><h3>Website</h3>
        <div class="toggle-row"><div><b>Show on website</b><span>Turn off to hide without deleting.</span></div><label class="switch"><input type="checkbox" id="pPub" ${p.is_published ? 'checked' : ''}><i></i></label></div>
        <div class="toggle-row"><div><b>Featured</b><span>Appears first in lists and on the homepage.</span></div><label class="switch"><input type="checkbox" id="pFeat" ${p.is_featured ? 'checked' : ''}><i></i></label></div>
        <div class="f" style="margin-top:14px"><label for="pHero">Homepage banner headline <span class="opt">(fill in to show this product in the big animated banner)</span></label><input id="pHero" value="${esc(p.hero_tagline || '')}" maxlength="60" placeholder="e.g. Slim. Magnetic. Always ready."></div>
      </div>
      ${id ? `<p style="font-size:12.5px;color:var(--muted);text-align:center">${p.units_sold || 0} sold · <a href="/product/${esc(p.slug)}" target="_blank" rel="noopener" style="color:var(--blue);font-weight:700">View on website ↗</a></p>` : ''}`;
    const foot = `${id ? `<button class="btn btn-danger" id="pDel">${I.trash} Delete</button><span class="spacer"></span>` : '<span class="spacer"></span>'}<button class="btn btn-ghost" data-close-sheet>Cancel</button><button class="btn btn-primary" id="pSave" data-busy="Saving">Save product</button>`;
    openSheet(id ? 'Edit product' : 'New product', body, foot);

    // Photos
    const renderPhotos = () => {
      $('#photos').innerHTML = images.map((u, i) => `<div class="photo ${u.startsWith('data:') ? 'uploading' : ''}" data-i="${i}"><img src="${u.startsWith('data:') ? u : thumb(u)}" alt="">${i === 0 ? '<span class="main-tag">Main</span>' : ''}<div class="acts">${i > 0 ? `<button type="button" data-first="${i}" title="Make main photo" aria-label="Make main photo">${I.star}</button>` : ''}<button type="button" data-rm="${i}" title="Remove" aria-label="Remove photo">${I.trash}</button></div></div>`).join('') +
        `<label class="drop" id="drop" for="fileIn">${I.camera}<span>Add photos</span></label>`;
      const drop = $('#drop');
      ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
      ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
      drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));
    };
    async function addFiles(files) {
      for (const f of Array.from(files).filter(f => f.type.startsWith('image/'))) {
        let data;
        try { data = await resizeImage(f); } catch (e) { toast(e.message, 'error'); continue; }
        images.push(data); renderPhotos();
        try {
          const r = await api('/api/admin/uploads', { method: 'POST', body: { dataUrl: data, filename: f.name } });
          images[images.indexOf(data)] = r.url;
        } catch (e) { images = images.filter(x => x !== data); toast(e.message, 'error'); }
        renderPhotos();
      }
    }
    $('#fileIn').onchange = e => { addFiles(e.target.files); e.target.value = ''; };
    $('#photos').onclick = e => {
      const rm = e.target.closest('[data-rm]'); const first = e.target.closest('[data-first]');
      if (rm) { e.preventDefault(); images.splice(+rm.dataset.rm, 1); renderPhotos(); }
      if (first) { e.preventDefault(); const [x] = images.splice(+first.dataset.first, 1); images.unshift(x); renderPhotos(); }
    };
    renderPhotos();

    // Specs
    const renderSpecs = () => {
      $('#specRows').innerHTML = specs.map(([k, val], i) => `<div class="spec-row f"><input data-k="${i}" value="${esc(k)}" placeholder="e.g. Output"><input data-v="${i}" value="${esc(val)}" placeholder="e.g. 45W USB-C PD"><button type="button" class="icon-btn" data-srm="${i}" aria-label="Remove row">${I.close}</button></div>`).join('') || '<p style="font-size:13px;color:var(--muted);margin:0">No specifications yet.</p>';
    };
    $('#specRows').oninput = e => { const k = e.target.dataset.k, vv = e.target.dataset.v; if (k !== undefined) specs[k][0] = e.target.value; if (vv !== undefined) specs[vv][1] = e.target.value; };
    $('#specRows').onclick = e => { const b = e.target.closest('[data-srm]'); if (b) { specs.splice(+b.dataset.srm, 1); renderSpecs(); } };
    $('#addSpec').onclick = () => { specs.push(['', '']); renderSpecs(); $$('#specRows input[data-k]').pop().focus(); };
    renderSpecs();

    // Margin hint
    const num = id2 => { const x = parseFloat(($(id2).value || '').replace(',', '.')); return isNaN(x) ? null : x; };
    const updMargin = () => {
      const price = num('#pSale') || num('#pRetail'); const cost = num('#pCost');
      $('#marginHint').textContent = price && cost !== null ? `You make OMR ${(price - cost).toFixed(3)} per unit (${Math.round((price - cost) / price * 100)}% margin) before VAT and delivery.` : '';
    };
    ['#pRetail', '#pSale', '#pCost'].forEach(s => $(s).addEventListener('input', updMargin)); updMargin();

    // Save
    $('#pSave').onclick = e => {
      const errs = [];
      const name = $('#pName').value.trim(); const sku = $('#pSku').value.trim();
      const retail = num('#pRetail'); const sale = num('#pSale'); const cost = num('#pCost');
      $$('.f.err', sheet).forEach(f => f.classList.remove('err'));
      const bad = (sel, msg) => { $(sel).closest('.f').classList.add('err'); errs.push(msg); };
      if (!name) bad('#pName', 'Add a product name.');
      if (!sku) bad('#pSku', 'Add an SKU.');
      if (!retail || retail <= 0) bad('#pRetail', 'Add the regular price.');
      if (sale !== null && retail && sale >= retail) bad('#pSale', 'Sale price must be lower than the regular price.');
      if (cost === null) bad('#pCost', 'Add your cost (only you can see it).');
      if (images.some(u => u.startsWith('data:'))) errs.push('Please wait for photos to finish uploading.');
      if (errs.length) { toast(errs[0], 'error'); const f = $('.f.err input', sheet); f && f.focus(); return; }
      const specObj = Object.fromEntries(specs.filter(([k, val]) => k.trim() && String(val).trim()).map(([k, val]) => [k.trim(), String(val).trim()]));
      const payload = {
        nameEn: name, nameAr: $('#pNameAr').value.trim() || name, shortDescAr: $('#pShortAr').value.trim(), fullDescAr: $('#pFullAr').value.trim(), heroTaglineAr: $('#pHeroAr').value.trim(), categoryId: $('#pCatSel').value, brand: $('#pBrand').value.trim() || 'MEVRIO', sku, barcode: $('#pBarcode').value.trim(),
        shortDescEn: $('#pShort').value.trim(), fullDescEn: $('#pFull').value.trim(), specifications: specObj,
        retailPriceOmr: retail, salePriceOmr: sale || '', costPriceOmr: cost,
        stockQuantity: parseInt($('#pStock').value, 10) || 0, lowStockThreshold: parseInt($('#pLow').value, 10) || 0,
        isPublished: $('#pPub').checked, isFeatured: $('#pFeat').checked, heroTagline: $('#pHero').value.trim(), images
      };
      busy(e.currentTarget, async () => {
        if (id) await api(`/api/admin/products/${id}`, { method: 'PUT', body: payload });
        else await api('/api/admin/products', { method: 'POST', body: payload });
        toast(id ? 'Product saved' : 'Product added'); closeSheet(); onSaved && onSaved();
      }).catch(err => toast(err.message, 'error'));
    };
    const del = $('#pDel');
    if (del) del.onclick = () => {
      if (!confirm(`Delete “${p.name_en}”? Products with past orders are hidden instead of deleted.`)) return;
      busy(del, async () => { const r = await api(`/api/admin/products/${id}`, { method: 'DELETE' }); toast(r.message); closeSheet(); onSaved && onSaved(); }).catch(err => toast(err.message, 'error'));
    };
  }

  // =====================================================================
  // CATEGORIES
  // =====================================================================
  async function viewCategories(v) {
    v.innerHTML = `<div class="view-head"><div><h2>Categories</h2><p>Categories with no visible products are hidden on the website automatically.</p></div><button class="btn btn-blue" id="addCat">${I.plus} Add category</button></div><div class="card card-pad"><div class="list" id="catList"></div></div>`;
    const load = async () => {
      const cats = await loadCategories();
      $('#catList').innerHTML = cats.map(c => `<div class="row" style="cursor:pointer" data-cat="${c.id}"><span class="thumb"><img src="${thumb(c.image_url)}" alt=""></span><div class="grow"><div class="title">${esc(c.name_en)}</div><div class="meta">${c.product_count} product${c.product_count === 1 ? '' : 's'} · /category/${esc(c.slug)}</div></div><div class="end">${c.is_active ? '<span class="pill ok">Visible</span>' : '<span class="pill">Hidden</span>'}</div></div>`).join('');
    };
    const edit = c => {
      c = c || { name_en: '', description_en: '', image_url: '', sort_order: 0, is_active: 1 };
      openSheet(c.id ? 'Edit category' : 'New category', `<div class="card card-pad"><div class="fgrid">
        <div class="f"><label for="cName">Name</label><input id="cName" value="${esc(c.name_en)}"></div>
        <div class="f"><label for="cDesc">Short description</label><textarea id="cDesc" rows="2">${esc(c.description_en || '')}</textarea></div>
        <div class="f"><label for="cImg">Image</label><select id="cImg"><option value="">Use first product photo</option></select><p class="hint">Pick a product photo to show on the category tile.</p></div>
        <div class="f"><label for="cSort">Position</label><input id="cSort" type="number" value="${c.sort_order || 0}"><p class="hint">Lower numbers appear first.</p></div>
        <div class="toggle-row"><div><b>Visible</b></div><label class="switch"><input type="checkbox" id="cAct" ${c.is_active ? 'checked' : ''}><i></i></label></div>
      </div></div>`, `${c.id ? `<button class="btn btn-danger" id="cDel">${I.trash} Delete</button>` : ''}<span class="spacer"></span><button class="btn btn-ghost" data-close-sheet>Cancel</button><button class="btn btn-primary" id="cSave" data-busy="Saving">Save</button>`);
      api('/api/admin/products?limit=200').then(r => {
        const opts = r.data.filter(x => x.primary_image).map(x => `<option value="${esc(x.primary_image)}" ${x.primary_image === c.image_url ? 'selected' : ''}>${esc(x.name_en)}</option>`);
        $('#cImg').innerHTML += opts.join('');
        if (c.image_url && !r.data.some(x => x.primary_image === c.image_url)) $('#cImg').insertAdjacentHTML('beforeend', `<option value="${esc(c.image_url)}" selected>Current image</option>`);
      });
      $('#cSave').onclick = e => busy(e.currentTarget, async () => {
        const name = $('#cName').value.trim(); if (!name) throw new Error('Please enter a name.');
        let img = $('#cImg').value;
        const body = { nameEn: name, descriptionEn: $('#cDesc').value.trim(), imageUrl: img || null, sortOrder: $('#cSort').value, isActive: $('#cAct').checked };
        if (c.id) await api(`/api/admin/categories/${c.id}`, { method: 'PUT', body }); else await api('/api/admin/categories', { method: 'POST', body });
        toast('Category saved'); closeSheet(); load();
      }).catch(err => toast(err.message, 'error'));
      const del = $('#cDel'); if (del) del.onclick = () => confirm('Delete this category?') && busy(del, async () => { await api(`/api/admin/categories/${c.id}`, { method: 'DELETE' }); toast('Deleted'); closeSheet(); load(); }).catch(err => toast(err.message, 'error'));
    };
    $('#addCat').onclick = () => edit(null);
    $('#catList').onclick = e => { const r = e.target.closest('[data-cat]'); if (r) edit(categoriesCache.find(c => c.id === r.dataset.cat)); };
    load();
  }

  // =====================================================================
  // ODOO
  // =====================================================================
  async function viewOdoo(v) {
    v.innerHTML = `<div class="view-head"><div><h2>Odoo sync</h2><p>Stock comes from Odoo; website orders are created in Odoo as sales orders.</p></div></div>
      <div class="dash-grid"><div style="display:grid;gap:16px;align-content:start">
        <div class="card card-pad" id="odooStatus"><div class="skel" style="height:90px"></div></div>
        <div class="card card-pad"><div class="card-head"><h3>Connection</h3></div><div id="odooForm"><div class="skel" style="height:200px"></div></div></div>
      </div><div style="display:grid;gap:16px;align-content:start">
        <div class="card card-pad"><div class="card-head"><h3>How it works</h3></div><ol style="margin:0;padding-left:18px;font-size:13.5px;color:var(--ink-2);display:grid;gap:8px">
          <li>Each website product's <b>SKU</b> must match the product's <b>Internal Reference</b> in Odoo.</li>
          <li>Stock is read from your retail warehouse (on hand minus reserved) every few minutes. Customers never see the number — they just can’t order more than you have.</li>
          <li>Cash-on-delivery orders go to Odoo immediately. Thawani orders go to Odoo once the payment is confirmed.</li>
          <li>If Odoo is offline, orders are kept and retried automatically every 5 minutes.</li></ol></div>
        <div class="card card-pad"><div class="card-head"><h3>Recent activity</h3></div><div class="list" id="odooLogs"></div></div>
      </div></div>`;

    const settings = (await api('/api/admin/settings')).data.odoo || {};
    const val = k => (settings[k] && settings[k].value) || '';
    $('#odooForm').innerHTML = `<div class="fgrid">
      <div class="toggle-row" style="padding-top:0"><div><b>Live connection</b><span>Off = test mode with sample stock (no real Odoo).</span></div><label class="switch"><input type="checkbox" id="oLive" ${val('odoo_mode') === 'live' ? 'checked' : ''}><i></i></label></div>
      <div class="f"><label for="oUrl">Odoo address</label><input id="oUrl" value="${esc(val('odoo_url'))}" placeholder="https://erp.yourcompany.om"></div>
      <div class="fgrid c2"><div class="f"><label for="oDb">Database name</label><input id="oDb" value="${esc(val('odoo_db'))}"></div><div class="f"><label for="oUser">API user (login email)</label><input id="oUser" value="${esc(val('odoo_username'))}"></div></div>
      <div class="f"><label for="oKey">API key</label><input id="oKey" type="password" value="${esc(val('odoo_api_key'))}" autocomplete="new-password"><p class="hint">In Odoo: your user → Account Security → New API key. Leave as-is to keep the saved key.</p></div>
      <div class="fgrid c3"><div class="f"><label for="oComp">Retail company ID</label><input id="oComp" inputmode="numeric" value="${esc(val('odoo_retail_company_id'))}"></div><div class="f"><label for="oWh">Warehouse ID</label><input id="oWh" inputmode="numeric" value="${esc(val('odoo_retail_warehouse_id'))}"></div><div class="f"><label for="oPl">Pricelist ID</label><input id="oPl" inputmode="numeric" value="${esc(val('odoo_retail_pricelist_id'))}"></div></div>
      <div class="f"><label for="oEvery">Sync stock every</label><select id="oEvery">${[['5', '5 minutes'], ['10', '10 minutes'], ['15', '15 minutes'], ['30', '30 minutes'], ['60', '1 hour'], ['0', 'Off (manual only)']].map(([m, l]) => `<option value="${m}" ${val('odoo_auto_sync_minutes') === m ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary" id="oSave" data-busy="Saving">Save &amp; test connection</button></div></div>`;
    $('#oSave').onclick = e => busy(e.currentTarget, async () => {
      await api('/api/admin/settings', { method: 'PUT', body: { settings: { odoo_mode: $('#oLive').checked ? 'live' : 'mock', odoo_url: $('#oUrl').value.trim(), odoo_db: $('#oDb').value.trim(), odoo_username: $('#oUser').value.trim(), odoo_api_key: $('#oKey').value, odoo_retail_company_id: $('#oComp').value.trim(), odoo_retail_warehouse_id: $('#oWh').value.trim(), odoo_retail_pricelist_id: $('#oPl').value.trim(), odoo_auto_sync_minutes: $('#oEvery').value } } });
      toast('Saved — testing connection…'); await loadStatus();
    }).catch(err => toast(err.message, 'error'));

    async function loadStatus() {
      $('#odooStatus').innerHTML = '<div class="skel" style="height:90px"></div>';
      try {
        const s = (await api('/api/admin/odoo/status')).data;
        $('#odooStatus').innerHTML = `<div class="card-head"><h3>Status</h3>${s.success ? (s.mode === 'live' ? '<span class="pill ok">Connected</span>' : '<span class="pill warn">Test mode</span>') : '<span class="pill bad">Not connected</span>'}</div>
          <p style="margin:0 0 6px;font-size:14px">${esc(s.message || s.error || '')}</p>
          <p style="margin:0 0 14px;font-size:13px;color:var(--muted)">${s.synced_orders} orders in Odoo · ${s.pending_orders} waiting${s.latencyMs ? ` · ${s.latencyMs} ms` : ''}</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" id="oSync" data-busy="Syncing">${I.sync} Sync stock now</button>${s.pending_orders ? `<button class="btn btn-ghost btn-sm" id="oRetryAll" data-busy="Sending">Send waiting orders</button>` : ''}</div>`;
        $('#oSync').onclick = e => busy(e.currentTarget, async () => { const r = await api('/api/admin/odoo/sync-stock', { method: 'POST' }); toast(r.message); loadLogs(); }).catch(err => toast(err.message, 'error'));
        const ra = $('#oRetryAll'); if (ra) ra.onclick = e => busy(e.currentTarget, async () => { const r = await api('/api/admin/odoo/retry-pending', { method: 'POST' }); toast(r.message); loadStatus(); loadLogs(); }).catch(err => toast(err.message, 'error'));
      } catch (e) { $('#odooStatus').innerHTML = `<div class="banner bad"><div><b>Could not check Odoo</b>${esc(e.message)}</div></div>`; }
      loadLogs();
    }
    const LABEL = { health_check: 'Connection check', stock_sync: 'Stock sync', order_create: 'Order sent' };
    async function loadLogs() {
      const logs = (await api('/api/admin/odoo/logs?limit=25')).data;
      $('#odooLogs').innerHTML = logs.length ? logs.map(l => `<div class="row"><div class="grow"><div class="title">${esc(LABEL[l.event_type] || l.event_type)}${l.event_type === 'order_create' ? ' · ' + esc(l.reference_id) : ''}</div><div class="meta">${ago(l.created_at)}${l.error_message ? ' · ' + esc(l.error_message) : ''}</div></div><div class="end">${l.status === 'success' ? '<span class="pill ok">OK</span>' : '<span class="pill bad">Failed</span>'}</div></div>`).join('') : '<p style="color:var(--muted);font-size:14px">No activity yet.</p>';
    }
    loadStatus();
  }

  // =====================================================================
  // SETTINGS
  // =====================================================================
  async function viewSettings(v) {
    const all = (await api('/api/admin/settings')).data;
    const val = (cat, k) => (all[cat] && all[cat][k] && all[cat][k].value) || '';
    const omrVal = (cat, k) => { const b = parseInt(val(cat, k), 10); return isNaN(b) ? '' : (b / 1000).toFixed(3); };
    v.innerHTML = `<div class="view-head"><div><h2>Settings</h2><p>Store details shown on the website, delivery fees and payments.</p></div></div>
      ${localStorage.getItem('gmg_admin_mustchange') ? '<div class="banner warn"><div><b>You are using the default password</b>Set a new one below.</div></div>' : ''}
      <div class="dash-grid"><div style="display:grid;gap:16px;align-content:start">
        <div class="card card-pad"><div class="card-head"><h3>Store &amp; contact</h3></div><div class="fgrid">
          <div class="fgrid c2"><div class="f"><label>Store name</label><input data-s="store_name" value="${esc(val('general', 'store_name'))}"></div><div class="f"><label>Company legal name</label><input data-s="store_legal_name" value="${esc(val('general', 'store_legal_name'))}"></div></div>
          <div class="fgrid c2"><div class="f"><label>CR number</label><input data-s="store_cr_number" value="${esc(val('general', 'store_cr_number'))}"></div><div class="f"><label>Tax ID</label><input data-s="store_tax_number" value="${esc(val('general', 'store_tax_number'))}"></div></div>
          <div class="fgrid c2"><div class="f"><label>Phone</label><input data-s="contact_phone" value="${esc(val('contact', 'contact_phone'))}"></div><div class="f"><label>WhatsApp</label><input data-s="contact_whatsapp" value="${esc(val('contact', 'contact_whatsapp'))}"><p class="hint">With country code, e.g. +968 9123 4567</p></div></div>
          <div class="fgrid c2"><div class="f"><label>Email</label><input data-s="contact_email" value="${esc(val('contact', 'contact_email'))}"></div><div class="f"><label>Instagram link <span class="opt">(optional)</span></label><input data-s="contact_instagram" value="${esc(val('contact', 'contact_instagram'))}"></div></div>
          <div class="f"><label>Address</label><input data-s="store_address" value="${esc(val('contact', 'store_address'))}"></div>
          <div class="f"><label>Top announcement bar</label><input data-s="announcement_text" value="${esc(val('general', 'announcement_text'))}"></div>
          <div class="fgrid c2"><div class="f"><label>Announcement (Arabic)</label><input dir="rtl" data-s="announcement_text_ar" value="${esc(val('general', 'announcement_text_ar'))}"></div><div class="f"><label>Address (Arabic)</label><input dir="rtl" data-s="store_address_ar" value="${esc(val('contact', 'store_address_ar'))}"></div></div>
        </div></div>
        <div class="card card-pad"><div class="card-head"><h3>Delivery &amp; tax</h3></div><div class="fgrid">
          <div class="fgrid c3"><div class="f"><label>Muscat delivery</label><div class="money"><span>OMR</span><input data-omr="muscat_delivery_fee_baisa" inputmode="decimal" value="${omrVal('shipping', 'muscat_delivery_fee_baisa')}"></div></div><div class="f"><label>Other governorates</label><div class="money"><span>OMR</span><input data-omr="other_delivery_fee_baisa" inputmode="decimal" value="${omrVal('shipping', 'other_delivery_fee_baisa')}"></div></div><div class="f"><label>Free delivery from</label><div class="money"><span>OMR</span><input data-omr="free_shipping_threshold_baisa" inputmode="decimal" value="${omrVal('shipping', 'free_shipping_threshold_baisa')}"></div></div></div>
          <div class="toggle-row"><div><b>Prices include VAT</b><span>On = the price customers see already includes 5% VAT. Off = VAT is added at checkout.</span></div><label class="switch"><input type="checkbox" data-bool="vat_inclusive" ${val('tax', 'vat_inclusive') === 'true' ? 'checked' : ''}><i></i></label></div>
          <div class="f"><label>Max quantity per product per order</label><input data-s="max_qty_per_order" type="number" min="1" value="${esc(val('general', 'max_qty_per_order'))}"></div>
        </div></div>
      </div><div style="display:grid;gap:16px;align-content:start">
        <div class="card card-pad"><div class="card-head"><h3>Payments</h3></div>
          <div class="toggle-row" style="padding-top:0"><div><b>Cash on delivery</b></div><label class="switch"><input type="checkbox" data-bool="cod_active" ${val('payment', 'cod_active') !== 'false' ? 'checked' : ''}><i></i></label></div>
          <div class="toggle-row"><div><b>Thawani Pay</b><span>Cards via Thawani</span></div><label class="switch"><input type="checkbox" data-bool="thawani_active" ${val('payment', 'thawani_active') !== 'false' ? 'checked' : ''}><i></i></label></div>
          <div class="toggle-row"><div><b>Thawani live mode</b><span>Off = sandbox (test cards, no real money)</span></div><label class="switch"><input type="checkbox" id="thLive" ${val('payment', 'thawani_mode') === 'live' ? 'checked' : ''}><i></i></label></div>
          <div class="fgrid" style="margin-top:10px"><div class="f"><label>Thawani publishable key</label><input data-s="thawani_public_key" class="mono" value="${esc(val('payment', 'thawani_public_key'))}"></div><div class="f"><label>Thawani secret key</label><input data-s="thawani_secret_key" class="mono" type="password" value="${esc(val('payment', 'thawani_secret_key'))}" autocomplete="new-password"><p class="hint">From your Thawani merchant portal. Leave as-is to keep the saved key.</p></div>
          <div class="f"><label>Release unpaid card orders after</label><select data-s="thawani_order_timeout_minutes">${['30', '45', '60', '120'].map(m => `<option value="${m}" ${val('payment', 'thawani_order_timeout_minutes') === m ? 'selected' : ''}>${m} minutes</option>`).join('')}</select></div></div>
        </div>
        <div class="card card-pad"><div class="card-head"><h3>Change password</h3></div><div class="fgrid">
          <div class="f"><label for="pw0">Current password</label><input id="pw0" type="password" autocomplete="current-password"></div>
          <div class="f"><label for="pw1">New password</label><input id="pw1" type="password" autocomplete="new-password"><p class="hint">At least 8 characters.</p></div>
          <button class="btn btn-ghost" id="pwSave" data-busy="Saving">Update password</button>
        </div></div>
      </div></div>
      <div style="position:sticky;bottom:calc(70px + env(safe-area-inset-bottom));display:flex;justify-content:flex-end;margin-top:16px"><button class="btn btn-primary" id="sSave" data-busy="Saving" style="height:48px;box-shadow:0 10px 30px rgba(11,21,48,.2)">Save settings</button></div>`;

    $('#sSave').onclick = e => busy(e.currentTarget, async () => {
      const s = {};
      $$('[data-s]', v).forEach(el => { s[el.dataset.s] = el.value.trim(); });
      $$('[data-omr]', v).forEach(el => { const x = parseFloat(el.value); if (!isNaN(x)) s[el.dataset.omr] = String(Math.round(x * 1000)); });
      $$('[data-bool]', v).forEach(el => { s[el.dataset.bool] = el.checked ? 'true' : 'false'; });
      s.thawani_mode = $('#thLive').checked ? 'live' : 'sandbox';
      await api('/api/admin/settings', { method: 'PUT', body: { settings: s } });
      toast('Settings saved');
    }).catch(err => toast(err.message, 'error'));
    $('#pwSave').onclick = e => busy(e.currentTarget, async () => {
      await api('/api/admin/auth/password', { method: 'POST', body: { currentPassword: $('#pw0').value, newPassword: $('#pw1').value } });
      localStorage.removeItem('gmg_admin_mustchange'); $('#pw0').value = $('#pw1').value = ''; toast('Password updated');
    }).catch(err => toast(err.message, 'error'));
  }

  // Mobile "More" page
  function viewMore(v) {
    v.innerHTML = `<div class="view-head"><h2>More</h2></div><div class="card card-pad"><div class="list">
      <a class="row" href="#/categories">${I.tag}<div class="grow"><div class="title">Categories</div></div></a>
      <a class="row" href="#/settings">${I.gear}<div class="grow"><div class="title">Settings</div><div class="meta">Store details, delivery, payments, password</div></div></a>
      <a class="row" href="/" target="_blank" rel="noopener">${I.home}<div class="grow"><div class="title">View website</div></div></a>
      <a class="row" href="#" data-logout>${I.out}<div class="grow"><div class="title">Sign out</div></div></a>
    </div></div>`;
    $$('.row svg', v).forEach(s => { s.style.width = '20px'; s.style.height = '20px'; s.style.color = 'var(--muted)'; });
  }

  // ---------- Router ----------
  const VIEWS = { '': ['Dashboard', viewDashboard], orders: ['Orders', viewOrders], products: ['Products', viewProducts], categories: ['Categories', viewCategories], odoo: ['Odoo sync', viewOdoo], settings: ['Settings', viewSettings], more: ['More', viewMore] };
  async function route() {
    const r = (location.hash.replace(/^#\/?/, '').split('/')[0]) || '';
    const [title, fn] = VIEWS[r] || VIEWS[''];
    closeSheet();
    $('#viewTitle').textContent = title; document.title = `${title} — Admin`;
    renderNav(r);
    const v = $('#view'); window.scrollTo(0, 0);
    try { await fn(v); } catch (e) { v.innerHTML = `<div class="empty"><h3>Something went wrong</h3><p>${esc(e.message)}</p></div>`; }
  }
  window.addEventListener('hashchange', route);
  const user = (() => { try { return JSON.parse(localStorage.getItem('gmg_admin_user') || '{}'); } catch (e) { return {}; } })();
  $('#topRight').innerHTML = `<span style="font-size:13px;color:var(--muted);font-weight:600" class="hide-sm">${esc(user.fullName || user.username || '')}</span><a class="icon-btn" href="/" target="_blank" rel="noopener" aria-label="View website" title="View website">${I.home}</a>`;
  route();
})();
