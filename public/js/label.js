/* 4×6 inch shipping label for thermal printers (Admin → order → Print label).
   FROM: company logo, name, address, phone, CR number. TO: customer name, phone, address,
   area, governorate. Big "collect cash" or "prepaid" box, order number with a Code 128
   barcode, item list. Opens in a new window sized 4in × 6in and starts printing. */
(function () {
  'use strict';

  // ---------- Code 128 (set B) barcode as SVG ----------
  const P = ['212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412', '211214', '211232', '2331112'];
  function code128(text, height) {
    const chars = String(text).replace(/[^\x20-\x7e]/g, '');
    const codes = [104]; // Start B
    for (const ch of chars) codes.push(ch.charCodeAt(0) - 32);
    let sum = 104; for (let i = 1; i < codes.length; i++) sum += codes[i] * i;
    codes.push(sum % 103, 106);
    let x = 10, bars = '';
    for (const c of codes) {
      const w = P[c];
      for (let i = 0; i < w.length; i++) { const n = +w[i]; if (i % 2 === 0) bars += `<rect x="${x}" y="0" width="${n}" height="${height}"/>`; x += n; }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x + 10} ${height}" preserveAspectRatio="none" class="bc">${bars}</svg>`;
  }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const omr = b => `OMR ${((b || 0) / 1000).toFixed(3)}`;

  /** o = order from /api/admin/orders/:id, s = { name, address, phone, cr, logo } */
  function labelHtml(o, s) {
    const cod = o.payment_method === 'cod' && o.payment_status !== 'paid';
    const items = o.items || [];
    const qty = items.reduce((n, i) => n + (i.quantity || 0), 0);
    const date = new Date(String(o.created_at).replace(' ', 'T') + (/Z|[+-]\d\d:\d\d$/.test(o.created_at) ? '' : 'Z'));
    const dateTxt = isNaN(date) ? '' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Muscat' });
    const addr = [o.delivery_address, o.delivery_city].filter((v, i, a) => v && a.indexOf(v) === i).join(', ');
    const shown = items.slice(0, 5);
    return `<section class="label">
      <header class="from">
        <img src="${esc(s.logo)}" alt="" class="logo">
        <div class="fromtxt"><small>FROM</small><b>${esc(s.name)}</b><span>${esc(s.address)}</span><span>Tel ${esc(s.phone)}${s.cr ? ` · CR No. ${esc(s.cr)}` : ''}</span></div>
      </header>
      <div class="to">
        <small>SHIP TO</small>
        <div class="name">${esc(o.customer_name)}</div>
        <div class="phone">${esc(String(o.customer_phone || '').replace(/^\+?968\s*(\d{4})\s*(\d{4})$/, '+968 $1 $2'))}</div>
        <div class="addr">${esc(addr)}</div>
        <div class="gov">${esc(o.delivery_governorate || '')} · Oman</div>
        ${o.customer_notes ? `<div class="note">Note: ${esc(o.customer_notes)}</div>` : ''}
      </div>
      <div class="pay ${cod ? 'cod' : 'paid'}">${cod ? `<small>CASH ON DELIVERY — COLLECT</small><b>${omr(o.total_baisa)}</b>` : `<b>PREPAID</b><small>Paid online — do not collect cash</small>`}</div>
      <div class="ord">
        ${code128(o.order_number, 60)}
        <div class="ordrow"><b>${esc(o.order_number)}</b><span>${esc(dateTxt)} · ${qty} item${qty === 1 ? '' : 's'}</span></div>
      </div>
      <ul class="items">${shown.map(i => `<li><span>${i.quantity}×</span> ${esc(i.name_en || i.product_name_en || i.sku)}</li>`).join('')}${items.length > shown.length ? `<li>+ ${items.length - shown.length} more</li>` : ''}</ul>
    </section>`;
  }

  const CSS = `
    @page { size: 4in 6in; margin: 0 }
    * { box-sizing: border-box }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact }
    .label { width: 4in; height: 6in; padding: .14in; display: flex; flex-direction: column; gap: .07in; page-break-after: always; break-after: page; overflow: hidden }
    .label:last-child { page-break-after: auto; break-after: auto }
    small { display: block; font-size: 8pt; font-weight: 700; letter-spacing: .08em }
    .from { display: flex; gap: .1in; align-items: center; border-bottom: 2px solid #000; padding-bottom: .07in }
    .logo { width: .85in; height: auto; filter: grayscale(1) contrast(1.4) }
    .fromtxt { display: flex; flex-direction: column; font-size: 7.5pt; line-height: 1.25 }
    .fromtxt b { font-size: 10pt }
    .to { border: 2.5px solid #000; border-radius: 6px; padding: .08in .1in; flex: 1; min-height: 0; overflow: hidden }
    .to .name { font-size: 17pt; font-weight: 800; line-height: 1.1; margin: 2px 0 }
    .to .phone { font-size: 15pt; font-weight: 700; letter-spacing: .02em }
    .to .addr { font-size: 11.5pt; line-height: 1.25; margin-top: 4px }
    .to .gov { font-size: 13pt; font-weight: 800; margin-top: 3px }
    .to .note { font-size: 8.5pt; margin-top: 4px; border-top: 1px dashed #000; padding-top: 3px }
    .pay { border-radius: 6px; padding: .06in .1in; text-align: center }
    .pay.cod { background: #000; color: #fff }
    .pay.cod b { font-size: 20pt; display: block }
    .pay.paid { border: 2.5px solid #000 }
    .pay.paid b { font-size: 17pt; display: block; letter-spacing: .12em }
    .ord .bc { width: 100%; height: .62in; display: block }
    .ord .bc rect { fill: #000 }
    .ordrow { display: flex; justify-content: space-between; align-items: baseline; font-size: 8.5pt; margin-top: 2px }
    .ordrow b { font-size: 12pt; letter-spacing: .04em }
    .items { list-style: none; margin: 0; padding: .04in 0 0; border-top: 1px solid #000; font-size: 7.5pt; line-height: 1.3 }
    .items li { white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
    .items span { font-weight: 700 }
    .bar { font: 14px Arial; padding: 10px; background: #f3f4f6; display: flex; gap: 10px; align-items: center; justify-content: center }
    .bar button { font: 600 14px Arial; padding: 9px 18px; border-radius: 8px; border: 0; background: #0b1f4d; color: #fff; cursor: pointer }
    @media screen { body { background: #e5e7eb } .label { background: #fff; margin: 12px auto; box-shadow: 0 2px 10px rgba(0,0,0,.15) } }
    @media print { .bar { display: none } }`;

  /** Opens the print window for one or more orders. */
  function printLabels(orders, shop, win) {
    const w = win || window.open('', '_blank');
    if (!w) { alert('Allow pop-ups for this site to print labels.'); return; }
    const logo = /^data:/.test(shop.logo || '') ? shop.logo : new URL(shop.logo || '/images/brand/logo-stacked.png', location.origin).href;
    w.document.open();
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Label ${esc(orders.map(o => o.order_number).join(', '))}</title><style>${CSS}</style></head><body>
      <div class="bar">${orders.length} label${orders.length === 1 ? '' : 's'} · 4×6 in <button onclick="window.print()">Print</button></div>
      ${orders.map(o => labelHtml(o, { ...shop, logo })).join('')}
      <script>window.onload=function(){var imgs=[].slice.call(document.images);Promise.all(imgs.map(function(i){return i.complete?0:new Promise(function(r){i.onload=i.onerror=r})})).then(function(){setTimeout(function(){window.print()},250)})};<\/script>
    </body></html>`);
    w.document.close();
  }

  window.GMG_label = { printLabels, labelHtml, code128 };
})();
