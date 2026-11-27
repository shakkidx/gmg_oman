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
    printer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>'
  };

  const token = () => localStorage.getItem('gmg_admin_token');
  function logout() { localStorage.removeItem('gmg_admin_token'); localStorage.removeItem('gmg_admin_user'); location.replace('/admin/login.html'); }
  async function api(path, opts = {}) {
    const res = await fetch(path, { method: opts.method || 'GET', headers: { Authorization: `Bearer ${token()}`, ...(opts.body ? { 'Content-Type': 'application/json' } : {}) }, body: opts.body ? JSON.stringify(opts.body) : undefined });
    if (res.status === 401) { logout(); throw new Error('Session expired'); }
    let data = null; try { data = await res.json(); } catch (e) { /* not JSON */ }
    if (!res.ok || (data && data.success === false)) { const er = new Error((data && (data.error || data.message)) || `Request failed (${res.status})`); er.data = data; throw er; }
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
    { r: 'visitors', label: 'Visitors', icon: I.eye },
    { r: 'leads', label: 'Leads', icon: I.phone },
    { r: 'offers', label: 'Offers', icon: I.star },
    { r: 'abandoned', label: 'Abandoned', icon: I.wa },
    { r: 'categories', label: 'Categories', icon: I.tag },
    { r: 'odoo', label: 'Odoo sync', icon: I.sync },
    { r: 'settings', label: 'Settings', icon: I.gear }
  ];
  const TAB = ['', 'orders', 'leads', 'abandoned'].map(r => NAV.find(n => n.r === r)).concat({ r: 'more', label: 'More', icon: I.more }); // Dashboard, Orders, Products, Abandoned, More
  let toShip = 0;
  function renderNav(route) {
    const isOn = r => (r === route || (r === 'more' && ['visitors', 'products', 'offers', 'categories', 'odoo', 'settings', 'more'].includes(route)));
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

  /** WhatsApp message asking the customer to confirm the order, in the language they ordered in. */
  function confirmMsg(o, items) {
    const ar = (o.lang || (o.tracking_json && (() => { try { return JSON.parse(o.tracking_json).lang; } catch (e) { return ''; } })())) === 'ar';
    const total = ((o.total_baisa || 0) / 1000).toFixed(3);
    const list = (items || []).map(i => `• ${ar && i.name_ar ? i.name_ar : i.name_en} × ${i.quantity}`).join('\n');
    const paid = o.payment_method === 'thawani' && o.payment_status === 'paid';
    const where = [o.delivery_address, o.delivery_city, o.delivery_governorate].filter((v, i, a) => v && a.indexOf(v) === i).join(', ');
    return ar
      ? `مرحباً ${o.customer_name}، شكراً لطلبك من GMG Oman 🇴🇲\nرقم الطلب: ${o.order_number}${list ? '\n' + list : ''}\nالإجمالي: ${total} ر.ع. (${paid ? 'مدفوع بالبطاقة' : 'الدفع عند الاستلام'})\nالتوصيل مجاني إلى: ${where}\nيرجى الرد بـ "نعم" لتأكيد الطلب وسنقوم بترتيب التوصيل.`
      : `Hello ${o.customer_name}, thank you for your order from GMG Oman 🇴🇲\nOrder: ${o.order_number}${list ? '\n' + list : ''}\nTotal: OMR ${total} (${paid ? 'paid by card' : 'cash on delivery'})\nFree delivery to: ${where}\nPlease reply YES to confirm and we will arrange the delivery.`;
  }
  const waUrl = (phone, text) => `https://wa.me/${String(phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;

  // =====================================================================
  // DASHBOARD
  // =====================================================================
  async function viewDashboard(v) {
    v.innerHTML = `
      <div id="pwBanner"></div><div id="appCard"></div>
      <div class="kpis">${Array.from({ length: 4 }, () => '<div class="card kpi"><div class="skel" style="height:14px;width:60%"></div><div class="skel" style="height:26px;width:80%;margin-top:12px"></div></div>').join('')}</div>
      <div class="dash-grid">
        <div style="display:grid;gap:16px;align-content:start">
          <div class="card card-pad"><div class="card-head"><h3>Sales</h3><div class="seg" id="range"><button data-d="7">7 days</button><button data-d="30" class="on">30 days</button><button data-d="90">90 days</button></div></div><div id="salesSummary" style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:12px"></div><div class="chart" id="chart"></div></div>
          <div class="card card-pad"><div class="card-head"><h3>Orders to pack &amp; ship</h3><a href="#/orders">All orders →</a></div><div class="list" id="shipList"></div></div>
        </div>
        <div style="display:grid;gap:16px;align-content:start">
          <div class="card card-pad" id="webCard"><div class="card-head"><h3>Website today</h3><a href="#/visitors">Details →</a></div><div class="skel" style="height:40px"></div></div>
          <div class="card card-pad" id="odooCard"></div>
          <div class="card card-pad"><div class="card-head"><h3>Top products</h3></div><div class="list" id="topList"></div></div>
          <div class="card card-pad"><div class="card-head"><h3>Low stock</h3><a href="#/products">Products →</a></div><div class="list" id="lowList"></div></div>
        </div>
      </div>`;

    api('/api/admin/insights/analytics?days=7').then(r => {
      const a = r.data;
      $('#webCard').innerHTML = `<div class="card-head"><h3>Website today</h3><a href="#/visitors">Details →</a></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
          <div><div class="v-num">${a.today.visitors}</div><div class="v-lab">visitors</div></div>
          <div><div class="v-num">${a.online_now}</div><div class="v-lab">online now</div></div>
          <div><div class="v-num">${a.period.visitors}</div><div class="v-lab">last 7 days</div></div>
        </div>`;
    }).catch(() => { $('#webCard').remove(); });
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

  function drawChart(el, data, tipFn) {
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
      tip.innerHTML = tipFn ? tipFn(d) : `<b>${omr(d.revenue_baisa)}</b> · ${d.orders} order${d.orders === 1 ? '' : 's'}<br>${new Date(d.day + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`;
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
    v.innerHTML = `<div id="appCard"></div><div class="view-head"><div><h2>Orders</h2><p>Confirm with the customer on WhatsApp, then pack and ship. Tap an order for details.</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost" id="oBatchLabels">${I.printer} Labels to ship</button><button class="btn btn-blue" id="oNew">${I.plus} New order</button></div></div>
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
            <div class="pills">${pill(STATUS, o.fulfillment_status)}${pill(PAY, o.payment_status)}${o.order_source && o.order_source !== 'website' ? `<span class="pill">${esc(SOURCE[o.order_source] || o.order_source)}</span>` : ''}</div>
            ${['confirmed', 'processing'].includes(o.fulfillment_status) ? `<div class="quick">
              <button class="btn btn-sm btn-ghost" data-label="${o.id}" title="Print 4×6 label">${I.printer} Label</button>
              <a class="btn btn-sm qa-wa" href="${waUrl(o.customer_phone, confirmMsg(o))}" target="_blank" rel="noopener" data-stop>${I.wa} Confirm</a>
              <a class="btn btn-sm btn-ghost" href="tel:${esc(o.customer_phone)}" data-stop>${I.phone} Call</a>
              ${o.fulfillment_status === 'confirmed' && (o.payment_method === 'cod' || o.payment_status === 'paid') ? `<button class="btn btn-sm btn-primary" data-quick-set="processing" data-id="${o.id}">Start packing</button>` : ''}
              ${o.fulfillment_status === 'processing' ? `<button class="btn btn-sm btn-primary" data-quick-set="shipped" data-id="${o.id}">Shipped</button>` : ''}
            </div>` : ''}
          </div>`).join('') : `<div class="empty"><h3>No orders here</h3><p>${tab === 'to_ship' ? 'Nothing waiting to be shipped right now.' : 'Try another tab or search.'}</p></div>`;
      } catch (e) { $('#oList').innerHTML = `<div class="empty"><h3>Couldn't load orders</h3><p>${esc(e.message)}</p></div>`; }
    }
    $('#oNew').onclick = () => newOrderSheet(load);
    $('#oBatchLabels').onclick = e => busy(e.currentTarget, async () => {
      const r = await api('/api/admin/orders?limit=100&tab=to_ship');
      const ids = r.data.filter(o => o.payment_method !== 'thawani' || o.payment_status === 'paid').map(o => o.id);
      if (!ids.length) throw new Error('No orders waiting to ship.');
      await printOrderLabels(ids);
    }).catch(err => toast(err.message, 'error'));
    $('#oList').onclick = e => {
      if (e.target.closest('[data-stop]')) return;
      const lb = e.target.closest('[data-label]');
      if (lb) { printOrderLabels([lb.dataset.label]).catch(err => toast(err.message, 'error')); return; }
      const q = e.target.closest('[data-quick-set]');
      if (q) { busy(q, async () => { await api(`/api/admin/orders/${q.dataset.id}/status`, { method: 'PUT', body: { fulfillmentStatus: q.dataset.quickSet } }); toast('Order updated'); load(); }).catch(err => toast(err.message, 'error')); return; }
      const r = e.target.closest('[data-order]'); if (r) openOrder(r.dataset.order, load);
    };
    window.GMG_reloadOrders = load;
    load();
  }

  const SOURCE = { whatsapp: 'WhatsApp', phone: 'Phone', instagram: 'Instagram', walk_in: 'Walk-in' };
  let shopInfo = null;
  async function shopForLabel() {
    if (shopInfo) return shopInfo;
    const s = (await api('/api/admin/settings')).data;
    const v = (c, k) => ((s[c] || {})[k] || {}).value || '';
    // Logo embedded as data so the print window never waits for (or misses) the image
    let logo = '/images/brand/logo-stacked.png';
    try { const blob = await fetch(logo).then(r => r.blob()); logo = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); }); } catch (e) { /* keep the URL */ }
    shopInfo = { name: v('general', 'store_name') || 'Global Markets Gateway', address: v('contact', 'store_address'), phone: v('contact', 'contact_phone'), cr: v('general', 'store_cr_number'), logo };
    return shopInfo;
  }
  /** 4×6 thermal labels for one or more orders */
  async function printOrderLabels(ids) {
    const win = window.open('', '_blank'); // open now (inside the tap) so pop-up blockers allow it
    try {
      const [shop, ...orders] = await Promise.all([shopForLabel(), ...ids.map(id => api(`/api/admin/orders/${encodeURIComponent(id)}`).then(r => r.data))]);
      window.GMG_label.printLabels(orders, shop, win);
    } catch (e) { if (win) win.close(); throw e; }
  }

  // ---------- New order (WhatsApp / phone / walk-in) ----------
  async function newOrderSheet(onDone) {
    openSheet('New order', '<div class="skel" style="height:300px"></div>');
    let products = [], govs = [];
    try {
      const [p, c] = await Promise.all([api('/api/products?limit=200'), api('/api/checkout/config')]);
      products = p.data.filter(x => x.available !== false);
      govs = c.data.governorates;
    } catch (e) { toast(e.message, 'error'); closeSheet(); return; }
    const vatRate = 0.05;
    const incl = p => p.pricing.vat_included ? p.pricing.current_baisa : Math.round(p.pricing.current_baisa * (1 + vatRate));
    const qty = {}; const price = {};
    const total = () => products.reduce((s, p) => s + (qty[p.sku] || 0) * (price[p.sku] != null ? price[p.sku] : incl(p)), 0);
    openSheet('New order', `<div class="card card-pad" id="nForm"><div class="fgrid" style="grid-template-columns:minmax(0,1fr)">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">
        <div class="f"><label for="nSource">Order came from</label><select id="nSource"><option value="whatsapp">WhatsApp</option><option value="phone">Phone call</option><option value="instagram">Instagram</option><option value="walk_in">Walk-in</option></select></div>
        <div class="f"><label for="nPay">Payment</label><select id="nPay"><option value="cod">Cash on delivery</option><option value="bank_transfer">Bank transfer (paid)</option><option value="cash">Cash (paid)</option></select></div>
      </div>
      <div class="f"><label for="nName">Customer name</label><input id="nName" autocomplete="off"></div>
      <div class="f"><label for="nPhone">Mobile</label><div class="money"><span>+968</span><input id="nPhone" inputmode="tel" placeholder="9123 4567"></div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">
        <div class="f"><label for="nGov">Governorate</label><select id="nGov"><option value="">Select…</option>${govs.map(g => `<option value="${esc(g.code)}">${esc(g.name_en)}</option>`).join('')}</select></div>
        <div class="f"><label for="nArea">Area / address</label><input id="nArea" placeholder="Al Khuwair, way 3021, villa 12"></div>
      </div>
      <div class="f"><label for="nNotes">Notes <span class="hint">(optional, printed on the label)</span></label><input id="nNotes"></div>
      <div class="f"><label>Products <span class="hint">— price includes VAT; change it for a special deal</span></label>
        <div class="list">${products.map(p => `<div class="row" style="flex-wrap:wrap;align-items:center" data-sku="${esc(p.sku)}">
          <span class="thumb"><img src="${thumb(p.primary_image)}" alt=""></span>
          <div class="grow" style="min-width:150px"><div class="title">${esc(p.name)}</div><div class="meta">${esc(p.sku)}${p.pricing.offer ? ' · offer' : ''}</div></div>
          <div class="end" style="display:flex;gap:6px;align-items:center;margin-inline-start:auto">
            <div class="money" style="width:112px"><span>OMR</span><input data-np inputmode="decimal" placeholder="${(incl(p) / 1000).toFixed(3)}"></div>
            <button class="btn btn-sm btn-ghost" data-nq="-1" style="width:36px;padding:0">−</button><b data-nqv style="min-width:18px;text-align:center">0</b><button class="btn btn-sm btn-ghost" data-nq="1" style="width:36px;padding:0">+</button>
          </div></div>`).join('')}</div></div>
      <div class="sum-line" style="display:flex;justify-content:space-between;font-size:16px;padding-top:6px;border-top:1px solid var(--line)"><span>Total (free delivery)</span><b id="nTotal">OMR 0.000</b></div>
    </div></div>`, `<span class="spacer"></span><button class="btn btn-ghost" data-close-sheet>Cancel</button><button class="btn btn-primary" id="nSave" data-busy="Saving">Create order</button>`);
    const sheet = $('#nForm');
    const refresh = () => { $('#nTotal').textContent = omr(total()); };
    sheet.addEventListener('click', e => {
      const b = e.target.closest('[data-nq]'); if (!b) return;
      const row = b.closest('[data-sku]'); const sku = row.dataset.sku;
      const p = products.find(x => x.sku === sku);
      qty[sku] = Math.max(0, Math.min((qty[sku] || 0) + Number(b.dataset.nq), p.max_qty || 99));
      $('[data-nqv]', row).textContent = qty[sku]; refresh();
    });
    sheet.addEventListener('input', e => {
      const i = e.target.closest('[data-np]'); if (!i) return;
      const sku = i.closest('[data-sku]').dataset.sku; const v = parseFloat(i.value);
      price[sku] = i.value.trim() === '' || isNaN(v) ? null : Math.round(v * 1000); refresh();
    });
    $('#nSave').onclick = e => busy(e.currentTarget, async () => {
      const items = Object.entries(qty).filter(([, q]) => q > 0).map(([sku, q]) => ({ sku, quantity: q, priceBaisa: price[sku] != null ? price[sku] : undefined }));
      const r = await api('/api/admin/orders/manual', { method: 'POST', body: {
        source: $('#nSource').value, paymentMethod: $('#nPay').value, customerName: $('#nName').value, customerPhone: $('#nPhone').value,
        governorate: $('#nGov').value, deliveryArea: $('#nArea').value, notes: $('#nNotes').value, items } });
      closeSheet(); onDone && onDone();
      toast(`Order ${r.orderNumber} created · ${r.total_formatted}`);
      openOrder(r.id, onDone);
    }).catch(err => toast(err.message, 'error'));
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
    const nextAction = { confirmed: ['processing', 'Customer confirmed · Start packing'], processing: ['shipped', 'Mark as shipped'], shipped: ['delivered', 'Mark as delivered'] }[o.fulfillment_status];
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
        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">${!cancelled ? `<a class="btn btn-sm qa-wa" href="${waUrl(phone, confirmMsg(o, o.items))}" target="_blank" rel="noopener">${I.wa} Confirm on WhatsApp</a>` : ''}<a class="btn btn-sm btn-ghost" href="https://wa.me/${phone}?text=${waMsg}" target="_blank" rel="noopener">${I.wa} Message</a><a class="btn btn-sm btn-ghost" href="tel:+${phone}">${I.phone} Call</a>${!cancelled && !awaitingPay ? `<button class="btn btn-sm btn-ghost" id="oLabel">${I.printer} Print label</button>` : ''}</div>
      </div>
      <div class="card card-pad section">
        <h3 style="margin-bottom:6px">Items</h3>
        <div class="list">${o.items.map(it => `<div class="row"><span class="thumb"><img src="${thumb(it.image_url)}" alt=""></span><div class="grow"><div class="title">${esc(it.name_en)}</div><div class="meta"><span class="mono">${esc(it.sku)}</span> · ${it.quantity} × ${it.unit_price_formatted}${it.original_price_baisa > it.unit_price_baisa ? ` <s>${omr(it.original_price_baisa)}</s>` : ''}</div>${it.offer_name ? `<div class="meta"><span class="pill warn">${esc(it.offer_name)}</span></div>` : ''}</div><div class="end"><b>${it.line_total_formatted}</b></div></div>`).join('')}</div>
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
    const canDelete = !o.odoo_sale_order_id && !o.odoo_sale_order_name && (o.payment_status !== 'paid' || cancelled);
    const foot = cancelled ? (canDelete ? `<button class="btn btn-danger" id="oDelete">${I.trash} Delete order</button>` : '') : `${canDelete ? `<button class="btn btn-ghost" id="oDelete" title="Delete order">${I.trash}</button>` : ''}<button class="btn btn-danger" data-set="cancelled">Cancel order</button><span class="spacer"></span>${o.fulfillment_status !== 'delivered' ? `<select class="btn btn-ghost" id="oManual" aria-label="Set status" style="padding-right:12px"><option value="">Set status…</option>${['confirmed', 'processing', 'shipped', 'delivered'].map(s => `<option value="${s}">${STATUS[s][0]}</option>`).join('')}</select>` : ''}${o.payment_method === 'cod' && o.payment_status !== 'paid' ? `<button class="btn btn-ghost" data-pay="paid">Cash received</button>` : ''}`;
    openSheet(esc(o.order_number), body, foot);

    const update = async (payload, btn) => {
      if (payload.fulfillmentStatus === 'cancelled' && !confirm(`Cancel order ${o.order_number}? Its items go back into website stock.${o.odoo_sale_order_name ? ' Also cancel ' + o.odoo_sale_order_name + ' in Odoo.' : ''}`)) return;
      const run = async () => { await api(`/api/admin/orders/${o.id}/status`, { method: 'PUT', body: payload }); toast('Order updated'); onChange && onChange(); openOrder(o.id, onChange); };
      btn ? busy(btn, run).catch(e => toast(e.message, 'error')) : run().catch(e => toast(e.message, 'error'));
    };
    $$('[data-set]', sheet).forEach(b => b.onclick = () => update({ fulfillmentStatus: b.dataset.set }, b));
    $$('[data-pay]', sheet).forEach(b => b.onclick = () => update({ paymentStatus: b.dataset.pay }, b));
    const man = $('#oManual'); if (man) man.onchange = () => man.value && update({ fulfillmentStatus: man.value });
    const lab = $('#oLabel');
    if (lab) lab.onclick = () => printOrderLabels([o.id]).catch(e => toast(e.message, 'error'));
    const del = $('#oDelete');
    if (del) del.onclick = () => confirm(`Delete order ${o.order_number} permanently? This cannot be undone.${o.payment_status === 'paid' ? ' It was PAID — any refund must be done in Thawani.' : ''}${cancelled ? '' : ' Its items go back into website stock.'}`) && busy(del, async () => { await api(`/api/admin/orders/${o.id}${o.payment_status === 'paid' ? '?confirmPaid=1' : ''}`, { method: 'DELETE' }); toast(`Order ${o.order_number} deleted`); closeSheet(); onChange && onChange(); }).catch(e => toast(e.message, 'error'));
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
  async function loadProductLinks() {
    const box = $('#plList'); box.innerHTML = '<div class="skel" style="height:120px"></div>';
    let r;
    try { r = await api('/api/admin/odoo/products'); } catch (e) { box.innerHTML = `<div class="banner bad"><div><b>Could not load Odoo products</b>${esc(e.message)}</div></div>`; return; }
    const opts = sel => `<option value="">— not linked —</option>` + r.odoo.map(o => `<option value="${o.id}" ${String(o.id) === String(sel) ? 'selected' : ''}>${esc(o.name)}${o.ref ? ' [' + esc(o.ref) + ']' : ''} · stock ${o.qty}</option>`).join('');
    const TAG = { linked: ['Linked', 'ok'], sku: ['Same code', 'ok'], suggested: ['Suggested — check', 'warn'], none: ['Not found', 'bad'] };
    box.innerHTML = `<div class="list">${r.data.map(p => `<div class="row" style="flex-wrap:wrap;align-items:center">
        <div class="grow" style="min-width:200px"><div class="title">${esc(p.name_en)}${p.is_published ? '' : ' <span class="pill">Hidden</span>'}</div><div class="meta mono">${esc(p.sku)}</div></div>
        <div class="end" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-inline-start:auto">${pill(TAG, p.match)}<select data-link="${esc(p.id)}" style="max-width:340px;height:38px;border-radius:10px;border:1px solid var(--line);padding:0 8px">${opts(p.linked_id || p.suggested_id)}</select></div>
      </div>`).join('')}</div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn btn-primary" id="plSave" data-busy="Saving">Save links</button></div>`;
    $('#plSave').onclick = e => busy(e.currentTarget, async () => {
      const links = {}; $$('[data-link]', box).forEach(s => { links[s.dataset.link] = s.value || null; });
      const res = await api('/api/admin/odoo/links', { method: 'PUT', body: { links } });
      toast(`Saved ${res.updated} product links`); loadProductLinks();
    }).catch(err => toast(err.message, 'error'));
  }

  document.addEventListener('click', e => { if (e.target.closest('#plLoad')) loadProductLinks(); });
  async function viewOdoo(v) {
    v.innerHTML = `<div class="view-head"><div><h2>Odoo sync</h2><p>Stock comes from Odoo; website orders are created in Odoo as sales orders.</p></div></div>
      <div class="dash-grid"><div style="display:grid;gap:16px;align-content:start">
        <div class="card card-pad" id="odooStatus"><div class="skel" style="height:90px"></div></div>
        <div class="card card-pad"><div class="card-head"><h3>Connection</h3></div><div id="odooForm"><div class="skel" style="height:200px"></div></div></div>
      </div>
      <div class="card card-pad" style="grid-column:1/-1"><div class="card-head"><h3>Product links</h3><button class="btn btn-sm btn-ghost" id="plLoad">Load Odoo products</button></div>
        <p style="font-size:13.5px;color:var(--muted);margin:0 0 10px">Connect each website product to its product in Odoo. Orders and stock use this link. Nothing is changed in Odoo.</p>
        <div id="plList"></div></div><div style="display:grid;gap:16px;align-content:start">
        <div class="card card-pad"><div class="card-head"><h3>How it works</h3></div><ol style="margin:0;padding-left:18px;font-size:13.5px;color:var(--ink-2);display:grid;gap:8px">
          <li>Each website product is matched to Odoo by its <b>link</b> below, or by <b>SKU = Internal Reference</b>.</li>
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
          ${val('payment', 'thawani_mode') === 'live' && (!val('payment', 'thawani_public_key') || val('payment', 'thawani_public_key') === 'HGvTMLDssJghr9tlN9gr4DVYt0qyBy') ? '<div class="banner bad" style="margin-bottom:12px"><div><b>Card payment is hidden from customers</b>Live mode is on, but the keys below are Thawani <b>test</b> keys. Paste your <b>live</b> publishable and secret keys from Thawani and save — card payment then appears at checkout.</div></div>' : ''}
          <div class="toggle-row" style="padding-top:0"><div><b>Cash on delivery</b></div><label class="switch"><input type="checkbox" data-bool="cod_active" ${val('payment', 'cod_active') !== 'false' ? 'checked' : ''}><i></i></label></div>
          <div class="toggle-row"><div><b>Thawani Pay</b><span>Cards via Thawani</span></div><label class="switch"><input type="checkbox" data-bool="thawani_active" ${val('payment', 'thawani_active') !== 'false' ? 'checked' : ''}><i></i></label></div>
          <div class="toggle-row"><div><b>Thawani live mode</b><span>Off = sandbox (test cards, no real money)</span></div><label class="switch"><input type="checkbox" id="thLive" ${val('payment', 'thawani_mode') === 'live' ? 'checked' : ''}><i></i></label></div>
          <div class="fgrid" style="margin-top:10px"><div class="f"><label>Thawani publishable key</label><input data-s="thawani_public_key" class="mono" value="${esc(val('payment', 'thawani_public_key'))}"></div><div class="f"><label>Thawani secret key</label><input data-s="thawani_secret_key" class="mono" type="password" value="${esc(val('payment', 'thawani_secret_key'))}" autocomplete="new-password"><p class="hint">From your Thawani merchant portal. Leave as-is to keep the saved key.</p></div>
          <div class="f"><label>Release unpaid card orders after</label><select data-s="thawani_order_timeout_minutes">${['30', '45', '60', '120'].map(m => `<option value="${m}" ${val('payment', 'thawani_order_timeout_minutes') === m ? 'selected' : ''}>${m} minutes</option>`).join('')}</select></div></div>
          <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--line)">
            <b>Thawani verification test</b>
            <p class="hint" style="margin:4px 0 10px">Creates a sandbox (UAT) checkout session with success URL, cancel URL and customer metadata. Send the session ID and response below to Thawani. No order is created.</p>
            <button class="btn btn-ghost" id="thTest" data-busy="Creating">Create test session</button>
            <div id="thTestOut" hidden style="margin-top:12px">
              <div class="f"><label>Session ID</label><input id="thSid" class="mono" readonly></div>
              <div class="f" style="margin-top:8px"><label>Full Thawani response</label><textarea id="thJson" class="mono" rows="12" readonly style="font-size:12px"></textarea></div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn btn-ghost" id="thCopy" type="button">Copy response</button><a class="btn btn-ghost" id="thPay" target="_blank" rel="noopener">Open test payment page</a></div>
            </div>
          </div>
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
    $('#thTest').onclick = e => busy(e.currentTarget, async () => {
      const r = await api('/api/admin/settings/thawani-test', { method: 'POST', body: {} });
      const d = r.data;
      $('#thSid').value = d.response.data.session_id;
      $('#thJson').value = JSON.stringify(d.response, null, 2);
      $('#thPay').href = d.payUrl;
      $('#thTestOut').hidden = false;
      toast('Test session created');
    }).catch(err => {
      toast('Thawani: ' + err.message, 'error');
      $('#thSid').value = '— not created —';
      $('#thJson').value = JSON.stringify((err.data && err.data.details) || err.data || { error: err.message }, null, 2);
      $('#thTestOut').hidden = false;
    });
    $('#thCopy').onclick = () => { const t = $('#thJson'); t.select(); try { navigator.clipboard.writeText(t.value); } catch (x) { document.execCommand('copy'); } toast('Copied'); };
    $('#pwSave').onclick = e => busy(e.currentTarget, async () => {
      await api('/api/admin/auth/password', { method: 'POST', body: { currentPassword: $('#pw0').value, newPassword: $('#pw1').value } });
      localStorage.removeItem('gmg_admin_mustchange'); $('#pw0').value = $('#pw1').value = ''; toast('Password updated');
    }).catch(err => toast(err.message, 'error'));
  }

  // =====================================================================
  // OFFERS — name, dates (Oman time), products and offer prices
  // =====================================================================
  const toLocalInput = iso => { const d = new Date(Date.parse(iso) + 4 * 3600e3); return isNaN(d) ? '' : d.toISOString().slice(0, 16); }; // shown in Oman time
  const omanText = iso => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Muscat' });
  async function viewOffers(v) {
    v.innerHTML = `<div class="view-head"><div><h2>Offers</h2><p>Offer prices include VAT and apply automatically between the start and end time (Oman time). Only products listed in the running offer appear on <a href="/offers/" target="_blank" style="text-decoration:underline">/offers</a>.</p></div><button class="btn btn-blue" id="addOffer">${I.plus} New offer</button></div><div id="offerList"></div>`;
    let offers = [];
    const ST = { live: ['Live now', 'ok'], scheduled: ['Scheduled', 'blue'], ended: ['Ended', ''], off: ['Switched off', 'bad'] };
    const load = async () => {
      offers = (await api('/api/admin/offers')).data;
      $('#offerList').innerHTML = offers.length ? offers.map(o => `<div class="card card-pad" style="margin-bottom:14px;cursor:pointer" data-offer="${esc(o.id)}">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><b style="font-size:16px">${esc(o.name_en)}</b><div class="meta" style="color:var(--muted);font-size:13px;margin-top:4px">${omanText(o.starts_at)} → ${omanText(o.ends_at)} (Oman)</div></div>${pill(ST, o.status)}</div>
        <div class="meta" style="color:var(--muted);font-size:13px;margin:8px 0">${o.items.length} products · sold ${o.sold.qty} pcs · ${omr(o.sold.revenue)}</div>
        <div class="list">${o.items.map(i => `<div class="row"><span class="thumb"><img src="${thumb(i.image_url)}" alt=""></span><div class="grow"><div class="title">${esc(i.name_en)}</div><div class="meta mono">${esc(i.sku)} · stock ${i.stock_quantity}</div></div><div class="end"><b>${omr(i.offer_price_baisa)}</b><br><s style="color:var(--muted);font-size:12px">${omr(i.normal_price_baisa)}</s></div></div>`).join('')}</div>
      </div>`).join('') : '<div class="empty"><h3>No offers yet</h3></div>';
    };
    const edit = async o => {
      const products = (await api('/api/admin/products?limit=200')).data;
      o = o || { name_en: '', name_ar: '', starts_at: '', ends_at: '', is_active: 1, items: [] };
      const priceOf = id => { const i = o.items.find(x => x.product_id === id); return i ? (i.offer_price_baisa / 1000).toFixed(3) : ''; };
      openSheet(o.id ? 'Edit offer' : 'New offer', `<div class="card card-pad"><div class="fgrid" style="grid-template-columns:minmax(0,1fr)">
        <div class="f"><label for="oName">Offer name (English)</label><input id="oName" value="${esc(o.name_en)}" placeholder="National Day Offer 2026"></div>
        <div class="f"><label for="oNameAr">Offer name (Arabic)</label><input id="oNameAr" dir="rtl" value="${esc(o.name_ar || '')}"></div>
        <div style="display:grid;grid-template-columns:1fr;gap:10px">
          <div class="f"><label for="oStart">Starts (Oman time)</label><input id="oStart" style="min-width:0;width:100%" type="datetime-local" value="${o.starts_at ? toLocalInput(o.starts_at) : ''}"></div>
          <div class="f"><label for="oEnd">Ends (Oman time)</label><input id="oEnd" style="min-width:0;width:100%" type="datetime-local" value="${o.ends_at ? toLocalInput(o.ends_at) : ''}"></div>
        </div>
        <div class="toggle-row"><div><b>Active</b><p class="hint">Switch off to stop the offer at once.</p></div><label class="switch"><input type="checkbox" id="oAct" ${o.is_active ? 'checked' : ''}><i></i></label></div>
        <div class="f"><label>Products and offer prices (OMR, VAT included)</label><p class="hint">Leave the price empty to keep a product out of the offer.</p>
          <div class="list">${products.map(p => `<div class="row" style="flex-wrap:wrap"><span class="thumb"><img src="${thumb(p.primary_image)}" alt=""></span><div class="grow"><div class="title">${esc(p.name_en)}</div><div class="meta">${esc(p.sku)} · normal ${omr(p.sale_price_baisa && p.sale_price_baisa < p.retail_price_baisa ? p.sale_price_baisa : p.retail_price_baisa)}</div></div><div class="end" style="margin-inline-start:auto"><div class="money" style="width:120px"><span>OMR</span><input data-op="${esc(p.id)}" inputmode="decimal" value="${priceOf(p.id)}" placeholder="—"></div></div></div>`).join('')}</div></div>
      </div></div>`, `<span class="spacer"></span><button class="btn btn-ghost" data-close-sheet>Cancel</button><button class="btn btn-primary" id="oSave" data-busy="Saving">Save offer</button>`);
      $('#oSave').onclick = e => busy(e.currentTarget, async () => {
        const items = $$('[data-op]').filter(i => i.value.trim()).map(i => ({ productId: i.dataset.op, priceBaisa: Math.round(parseFloat(i.value) * 1000) }));
        if (items.some(i => !(i.priceBaisa > 0))) throw new Error('Check the offer prices.');
        const body = { nameEn: $('#oName').value.trim(), nameAr: $('#oNameAr').value.trim(), startsAt: $('#oStart').value, endsAt: $('#oEnd').value, isActive: $('#oAct').checked, items };
        if (o.id) await api(`/api/admin/offers/${o.id}`, { method: 'PUT', body }); else await api('/api/admin/offers', { method: 'POST', body });
        toast('Offer saved'); closeSheet(); load();
      }).catch(err => toast(err.message, 'error'));
    };
    $('#addOffer').onclick = () => edit(null);
    $('#offerList').onclick = e => { const r = e.target.closest('[data-offer]'); if (r) edit(offers.find(o => o.id === r.dataset.offer)); };
    load();
  }

  // =====================================================================
  // ABANDONED CHECKOUTS — phone typed at checkout, order not finished
  // =====================================================================
  async function viewAbandoned(v) {
    let tab = 'open';
    v.innerHTML = `<div class="view-head"><div><h2>Abandoned carts</h2><p>Saved as soon as a customer types a valid phone number at checkout. Tap WhatsApp to follow up.</p></div></div>
      <div class="tabs" id="abTabs" style="display:flex;gap:8px;margin-bottom:12px"></div><div class="card card-pad"><div class="list" id="abList"></div></div>`;
    const waLink = r => {
      const num = String(r.customer_phone || '').replace(/\D/g, '');
      const ar = r.lang === 'ar';
      const lines = r.items.map(i => `• ${i.name} × ${i.quantity}`).join('\n');
      const msg = ar ? `مرحباً ${r.customer_name || ''}، معك GMG Oman. لاحظنا أن طلبك لم يكتمل:\n${lines}\nالإجمالي: ${omr(r.total_baisa)} — التوصيل مجاني. هل نؤكد الطلب لك؟`
        : `Hello ${r.customer_name || ''}, this is GMG Oman. We noticed your order was not completed:\n${lines}\nTotal: ${omr(r.total_baisa)} — free delivery. Shall we confirm it for you?`;
      return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
    };
    const load = async () => {
      const r = await api('/api/admin/abandoned' + (tab === 'all' ? '' : `?status=${tab}`));
      const c = r.counts || {};
      $('#abTabs').innerHTML = [['open', 'Open'], ['contacted', 'Contacted'], ['converted', 'Ordered'], ['all', 'All']].map(([k, l]) => `<button class="btn ${tab === k ? 'btn-primary' : 'btn-ghost'}" data-tab="${k}" style="padding:8px 12px;${tab === k ? 'background:var(--ink);color:#fff' : ''}">${l}${k !== 'all' && c[k] ? ` (${c[k]})` : ''}</button>`).join('');
      $('#abList').innerHTML = r.data.length ? r.data.map(a => `<div class="row" style="align-items:flex-start">
        <div class="grow"><div class="title">${esc(a.customer_name || 'No name')} · <a href="tel:${esc(a.customer_phone)}" class="mono">${esc(a.customer_phone)}</a></div>
          <div class="meta">${a.items.map(i => `${esc(i.name)} × ${i.quantity}${i.offer ? ' (offer)' : ''}`).join('<br>')}</div>
          <div class="meta">${omr(a.total_baisa)} · ${esc(a.governorate || '—')} · ${ago(a.updated_at)}${a.order_number ? ` · order <b>${esc(a.order_number)}</b>` : ''}</div></div>
        <div class="end" style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
          ${a.status !== 'converted' ? `<a class="btn" style="background:#25d366;color:#fff;padding:8px 12px" href="${waLink(a)}" target="_blank" rel="noopener" data-wa-ab="${esc(a.id)}">${I.wa.replace('<svg', '<svg width="16" height="16"')} WhatsApp</a>` : '<span class="pill ok">Ordered</span>'}
          ${a.status === 'contacted' ? `<button class="btn btn-ghost" style="padding:6px 10px;font-size:12px" data-reopen="${esc(a.id)}">Mark open</button>` : ''}
        </div></div>`).join('') : '<p style="color:var(--muted);font-size:14px">Nothing here.</p>';
    };
    v.addEventListener('click', async e => {
      const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; load(); return; }
      const w = e.target.closest('[data-wa-ab]'); if (w) { api(`/api/admin/abandoned/${w.dataset.waAb}`, { method: 'PATCH', body: { status: 'contacted' } }).then(load).catch(() => {}); return; }
      const ro = e.target.closest('[data-reopen]'); if (ro) { await api(`/api/admin/abandoned/${ro.dataset.reopen}`, { method: 'PATCH', body: { status: 'open' } }); load(); }
    });
    load();
  }

  // =====================================================================
  // VISITORS — website visits, sources, pages (no personal data)
  // =====================================================================
  async function viewVisitors(v) {
    let days = 30;
    const SRC = { direct: 'Direct / typed link', instagram: 'Instagram', facebook: 'Facebook', google: 'Google', whatsapp: 'WhatsApp', tiktok: 'TikTok', snapchat: 'Snapchat', twitter: 'X / Twitter', youtube: 'YouTube', bing: 'Bing' };
    const PAGE = p => p === '/' ? 'Home' : p.startsWith('/offers') ? 'Offers' + (p.includes('catalogue') ? ' catalogue' : '') : p.startsWith('/product/') ? 'Product · ' + p.slice(9).replace(/-/g, ' ') : p.startsWith('/category/') ? 'Category · ' + p.slice(10) : p.replace(/^\//, '').replace(/\.html$/, '') || p;
    v.innerHTML = `<div class="view-head"><div><h2>Website visitors</h2><p>Counted on the website without cookies banners or personal data. Your own visits while signed in are not counted.</p></div>
      <div class="seg" id="vRange"><button data-d="1">Today</button><button data-d="7">7 days</button><button data-d="30" class="on">30 days</button><button data-d="90">90 days</button></div></div>
      <div class="kpis" id="vKpis"></div>
      <div class="card card-pad" style="margin-top:16px"><div class="card-head"><h3>Visitors per day</h3></div><div class="chart" id="vChart"></div></div>
      <div class="dash-grid" style="margin-top:16px">
        <div class="card card-pad"><div class="card-head"><h3>Where visitors come from</h3></div><div id="vSrc"></div></div>
        <div class="card card-pad"><div class="card-head"><h3>Top pages</h3></div><div class="list" id="vPages"></div></div>
      </div>`;
    const bars = (rows, label, key) => { const max = Math.max(1, ...rows.map(r => r[key])); return rows.map(r => `<div class="vbar"><div class="vbar-top"><span>${esc(label(r))}</span><b>${r[key]}</b></div><div class="vbar-track"><i style="width:${Math.round(r[key] / max * 100)}%"></i></div></div>`).join('') || '<p style="color:var(--muted);font-size:14px">No visits yet.</p>'; };
    const load = async () => {
      const a = (await api(`/api/admin/insights/analytics?days=${days}`)).data;
      const lbl = days === 1 ? 'today' : `last ${days} days`;
      const mob = (a.devices.find(d => d.device === 'mobile') || {}).visitors || 0;
      const ar = (a.langs.find(d => d.lang === 'ar') || {}).visitors || 0;
      $('#vKpis').innerHTML = `
        <div class="card kpi"><div class="label"><i style="background:var(--blue)"></i>Visitors</div><div class="value">${a.period.visitors}</div><div class="sub">${lbl} · ${a.online_now} online now</div></div>
        <div class="card kpi"><div class="label"><i style="background:#7aa7ff"></i>Page views</div><div class="value">${a.period.views}</div><div class="sub">${a.period.visitors ? (a.period.views / a.period.visitors).toFixed(1) : 0} pages per visitor</div></div>
        <div class="card kpi"><div class="label"><i style="background:var(--ok)"></i>Orders</div><div class="value">${a.orders}</div><div class="sub">${a.conversion}% of visitors ordered</div></div>
        <div class="card kpi"><div class="label"><i style="background:#b35c00"></i>Leads</div><div class="value">${a.leads}</div><div class="sub">${a.period.visitors ? Math.round(mob / a.period.visitors * 100) : 0}% mobile · ${a.period.visitors ? Math.round(ar / a.period.visitors * 100) : 0}% Arabic</div></div>`;
      drawChart($('#vChart'), a.daily.map(d => ({ ...d, revenue_baisa: d.visitors * 1000 })), d => `<b>${d.visitors} visitor${d.visitors === 1 ? '' : 's'}</b> · ${d.views} views<br>${new Date(d.day + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`);
      $('#vSrc').innerHTML = bars(a.sources, r => SRC[r.source] || r.source, 'visitors');
      $('#vPages').innerHTML = bars(a.pages, r => PAGE(r.path), 'views');
    };
    $('#vRange').onclick = e => { const b = e.target.closest('[data-d]'); if (!b) return; days = +b.dataset.d; $$('#vRange button').forEach(x => x.classList.toggle('on', x === b)); load(); };
    load();
  }

  // =====================================================================
  // LEADS — "call me back" form on the website
  // =====================================================================
  async function viewLeads(v) {
    let tab = 'new';
    v.innerHTML = `<div class="view-head"><div><h2>Leads</h2><p>Customers who left their number on the website. Contact them on WhatsApp or call.</p></div></div>
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap" id="lTabs"></div><div class="card card-pad"><div class="list" id="lList"></div></div>`;
    const wa = l => {
      const ar = l.lang === 'ar';
      const msg = ar ? `مرحباً ${l.name || ''}، معك GMG Oman 🇴🇲 بخصوص طلبك على موقعنا${l.interest ? ' (' + l.interest + ')' : ''}. كيف يمكننا مساعدتك؟` : `Hello ${l.name || ''}, this is GMG Oman 🇴🇲 about your request on our website${l.interest ? ' (' + l.interest + ')' : ''}. How can we help you?`;
      return `https://wa.me/${String(l.phone).replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
    };
    const ST = { new: ['New', 'blue'], contacted: ['Contacted', 'warn'], won: ['Ordered', 'ok'], lost: ['No sale', ''] };
    const load = async () => {
      const r = await api('/api/admin/insights/leads' + (tab === 'all' ? '' : `?status=${tab}`));
      const c = r.counts || {};
      $('#lTabs').innerHTML = [['new', 'New'], ['contacted', 'Contacted'], ['won', 'Ordered'], ['lost', 'No sale'], ['all', 'All']].map(([k, l]) => `<button class="btn ${tab === k ? 'btn-primary' : 'btn-ghost'}" data-tab="${k}" style="padding:8px 12px;${tab === k ? 'background:var(--ink);color:#fff' : ''}">${l}${k !== 'all' && c[k] ? ` (${c[k]})` : ''}</button>`).join('');
      $('#lList').innerHTML = r.data.length ? r.data.map(l => `<div class="row" style="align-items:flex-start;flex-wrap:wrap">
        <div class="grow"><div class="title">${esc(l.name || 'No name')} · <a class="mono" href="tel:${esc(l.phone)}">${esc(l.phone)}</a></div>
          <div class="meta">${l.interest ? `<b>${esc(l.interest)}</b> · ` : ''}${esc(l.source || 'direct')} · ${esc(l.page || '')} · ${ago(l.created_at)}</div>
          ${l.message ? `<div class="meta">${esc(l.message)}</div>` : ''}</div>
        <div class="end" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
          ${pill(ST, l.status)}
          <a class="btn btn-sm qa-wa" href="${wa(l)}" target="_blank" rel="noopener" data-wa-lead="${esc(l.id)}">${I.wa} WhatsApp</a>
          <a class="btn btn-sm btn-ghost" href="tel:${esc(l.phone)}" data-call-lead="${esc(l.id)}">${I.phone}</a>
          <select class="btn btn-sm btn-ghost" data-lead-status="${esc(l.id)}" aria-label="Status">${Object.entries(ST).map(([k, [t]]) => `<option value="${k}" ${k === l.status ? 'selected' : ''}>${t}</option>`).join('')}</select>
        </div></div>`).join('') : '<p style="color:var(--muted);font-size:14px">No leads here yet.</p>';
      $$('.row svg', $('#lList')).forEach(s => { s.style.width = '16px'; s.style.height = '16px'; });
    };
    const setStatus = (id, status) => api(`/api/admin/insights/leads/${id}`, { method: 'PATCH', body: { status } });
    v.addEventListener('click', e => {
      const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; load(); return; }
      const w = e.target.closest('[data-wa-lead],[data-call-lead]'); if (w) { const id = w.dataset.waLead || w.dataset.callLead; const row = w.closest('.row'); if (row.querySelector('[data-lead-status]').value === 'new') setStatus(id, 'contacted').then(load).catch(() => {}); }
    });
    v.addEventListener('change', e => { const s = e.target.closest('[data-lead-status]'); if (s) setStatus(s.dataset.leadStatus, s.value).then(() => { toast('Updated'); load(); }).catch(err => toast(err.message, 'error')); });
    load();
  }

  // Mobile "More" page
  function viewMore(v) {
    v.innerHTML = `<div class="view-head"><h2>More</h2></div><div id="appCard"></div><div class="card card-pad"><div class="list">
      <a class="row" href="#/products">${I.box}<div class="grow"><div class="title">Products</div><div class="meta">Prices, stock, photos</div></div></a>
      <a class="row" href="#/visitors">${I.eye}<div class="grow"><div class="title">Website visitors</div><div class="meta">Visits, sources, top pages</div></div></a>
      <a class="row" href="#/leads">${I.phone}<div class="grow"><div class="title">Leads</div><div class="meta">Customers who asked for a call back</div></div></a>
      <a class="row" href="#/abandoned">${I.wa}<div class="grow"><div class="title">Abandoned carts</div><div class="meta">Follow up customers who did not finish</div></div></a>
      <a class="row" href="#/offers">${I.star}<div class="grow"><div class="title">Offers</div><div class="meta">Offer dates, products and offer prices</div></div></a>
      <a class="row" href="#/odoo">${I.sync}<div class="grow"><div class="title">Odoo sync</div></div></a>
      <a class="row" href="#/categories">${I.tag}<div class="grow"><div class="title">Categories</div></div></a>
      <a class="row" href="#/settings">${I.gear}<div class="grow"><div class="title">Settings</div><div class="meta">Store details, delivery, payments, password</div></div></a>
      <a class="row" href="/" target="_blank" rel="noopener">${I.home}<div class="grow"><div class="title">View website</div></div></a>
      <a class="row" href="#" data-logout>${I.out}<div class="grow"><div class="title">Sign out</div></div></a>
    </div></div>`;
    $$('.row svg', v).forEach(s => { s.style.width = '20px'; s.style.height = '20px'; s.style.color = 'var(--muted)'; });
  }

  // ---------- Router ----------
  const VIEWS = { '': ['Dashboard', viewDashboard], orders: ['Orders', viewOrders], products: ['Products', viewProducts], categories: ['Categories', viewCategories], odoo: ['Odoo sync', viewOdoo], offers: ['Offers', viewOffers], visitors: ['Visitors', viewVisitors], leads: ['Leads', viewLeads], abandoned: ['Abandoned carts', viewAbandoned], settings: ['Settings', viewSettings], more: ['More', viewMore] };
  async function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    const r = parts[0] || '';
    const [title, fn] = VIEWS[r] || VIEWS[''];
    closeSheet();
    $('#viewTitle').textContent = title; document.title = `${title} — Admin`;
    renderNav(r);
    const v = $('#view'); window.scrollTo(0, 0);
    try { await fn(v); } catch (e) { v.innerHTML = `<div class="empty"><h3>Something went wrong</h3><p>${esc(e.message)}</p></div>`; }
    if (r === 'orders' && parts[1]) { openOrder(parts[1], window.GMG_reloadOrders); history.replaceState(null, '', '#/orders'); }
  }
  window.addEventListener('hashchange', route);
  const user = (() => { try { return JSON.parse(localStorage.getItem('gmg_admin_user') || '{}'); } catch (e) { return {}; } })();
  $('#topRight').innerHTML = `<span style="font-size:13px;color:var(--muted);font-weight:600" class="hide-sm">${esc(user.fullName || user.username || '')}</span><a class="icon-btn" href="/" target="_blank" rel="noopener" aria-label="View website" title="View website">${I.home}</a>`;
  route();
  initApp();

  // =====================================================================
  // ADMIN APP (installed on iPhone / Android): notifications + live new-order alerts
  // =====================================================================
  function initApp() {
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    let installEvt = null;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' }).catch(() => {});
      navigator.serviceWorker.addEventListener('message', e => {
        if (e.data && e.data.type === 'open' && e.data.url) location.href = e.data.url;
        if (e.data && e.data.type === 'new-order') checkNew(true);
      });
    }
    addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; renderAppCard(); });

    const pushOK = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    async function subscription() { if (!pushOK) return null; const reg = await navigator.serviceWorker.ready; return reg.pushManager.getSubscription(); }
    async function enable(btn) {
      await busy(btn, async () => {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') throw new Error('Notifications are blocked. Allow them in your phone settings for this app.');
        const { publicKey } = await api('/api/admin/push/key');
        const raw = atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')); const key = new Uint8Array([...raw].map(c => c.charCodeAt(0)));
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        await api('/api/admin/push/subscribe', { method: 'POST', body: { subscription: sub.toJSON() } });
        toast('Notifications on for this phone');
      }).catch(err => toast(err.message, 'error'));
      renderAppCard();
    }
    async function disable(btn) {
      await busy(btn, async () => { const s = await subscription(); if (s) { await api('/api/admin/push/unsubscribe', { method: 'POST', body: { endpoint: s.endpoint } }); await s.unsubscribe(); } toast('Notifications off'); }).catch(err => toast(err.message, 'error'));
      renderAppCard();
    }
    async function renderAppCard() {
      const slot = $('#appCard'); if (!slot) return;
      const sub = await subscription().catch(() => null);
      let html = '';
      if (!standalone && ios) html = `<div class="app-card"><img src="/images/brand/admin-icon-192.png?v=2" alt=""><div><b>Install the admin app</b><p>Tap <b>Share</b> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7"/></svg> at the bottom of Safari, then <b>Add to Home Screen</b>. Open it from the home screen to turn on order notifications.</p></div></div>`;
      else if (!standalone && installEvt) html = `<div class="app-card"><img src="/images/brand/admin-icon-192.png?v=2" alt=""><div><b>Install the admin app</b><p>Get it on your home screen with new-order notifications.</p><button class="btn btn-sm btn-primary" id="appInstall">Install app</button></div></div>`;
      else if (pushOK && !sub) html = `<div class="app-card"><img src="/images/brand/admin-icon-192.png?v=2" alt=""><div><b>Get new-order alerts</b><p>Turn on notifications to hear about every new order on this phone, even when the app is closed.</p><button class="btn btn-sm btn-primary" id="pushOn" data-busy="">Turn on notifications</button></div></div>`;
      else if (pushOK && sub) html = `<div class="app-card ok"><img src="/images/brand/admin-icon-192.png?v=2" alt=""><div><b>New-order alerts are on</b><p>This phone gets a notification for every new order.</p><button class="btn btn-sm btn-ghost" id="pushTest" data-busy="">Send test</button> <button class="btn btn-sm btn-ghost" id="pushOff" data-busy="">Turn off</button></div></div>`;
      slot.innerHTML = html;
      const b1 = $('#appInstall'); if (b1) b1.onclick = async () => { installEvt.prompt(); await installEvt.userChoice.catch(() => {}); installEvt = null; renderAppCard(); };
      const b2 = $('#pushOn'); if (b2) b2.onclick = () => enable(b2);
      const b3 = $('#pushOff'); if (b3) b3.onclick = () => disable(b3);
      const b4 = $('#pushTest'); if (b4) b4.onclick = () => busy(b4, async () => { const r = await api('/api/admin/push/test', { method: 'POST' }); toast(`Test sent to ${r.sent} device${r.sent === 1 ? '' : 's'}`); }).catch(err => toast(err.message, 'error'));
    }
    window.GMG_renderAppCard = renderAppCard;
    addEventListener('hashchange', () => setTimeout(renderAppCard, 50));
    setTimeout(renderAppCard, 300);

    // Live alerts while the app is open: check every 30 s, beep + vibrate + badge on a new order
    let last = null;
    function beep() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [0, 0.18, 0.36].forEach((t, i) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.value = [880, 1175, 1568][i]; g.gain.setValueAtTime(0.25, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.16); o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.17); });
      } catch (e) { /* ignore */ }
    }
    async function checkNew(fromPush) {
      try {
        const r = await api('/api/admin/orders?limit=1');
        const newest = r.data[0] ? r.data[0].created_at + r.data[0].id : '';
        toShip = r.tab_counts.to_ship;
        if (navigator.setAppBadge) { try { toShip ? navigator.setAppBadge(toShip) : navigator.clearAppBadge(); } catch (e) { /* ignore */ } }
        const cur = (location.hash.replace(/^#\/?/, '').split('/')[0]) || '';
        renderNav(cur);
        if (last !== null && newest !== last && r.data[0]) {
          if (!fromPush) beep();
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          toast(`New order ${r.data[0].order_number} · ${r.data[0].total_formatted}`);
          if (cur === 'orders' && window.GMG_reloadOrders) window.GMG_reloadOrders();
          if (cur === '') route();
        }
        last = newest;
      } catch (e) { /* offline */ }
    }
    checkNew();
    setInterval(() => { if (!document.hidden) checkNew(); }, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkNew(); });
  }
})();
