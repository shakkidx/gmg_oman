/* Cart page: lines, server-checked total, offer countdown, checkout + WhatsApp order */
(function () {
  'use strict';
  const start = async () => {
    const { $, esc, omr, api, Cart, lineHtml, bindLines, emptyCartHtml, shipProgressHtml, I, t, waOrderLink, offerLeft, storeReady } = window.GMG;
    let server = null; // totals from the server for the current cart
    let offer = null;

    function render() {
      const items = Cart.items();
      if (!items.length) {
        $('#cartLayout').innerHTML = `<div style="grid-column:1/-1">${emptyCartHtml()}</div>`;
        return;
      }
      const sub = Cart.subtotal();
      const total = server ? server.totalBaisa : sub;
      const hasOffer = items.some(i => i.offer);
      const left = hasOffer && offer && offer.state === 'live' ? offerLeft(offer.ends_at) : '';
      const wa = waOrderLink(items, total);
      $('#cartLines').innerHTML = `<div style="border-top:1px solid var(--line)">${items.map(i => lineHtml(i)).join('')}</div>
        <a class="link-arrow" href="/shop" style="margin-top:20px">${I.left} ${t('Continue shopping')}</a>`;
      $('#cartSummary').innerHTML = `
        <h2>${t('Order summary')}</h2>
        ${left ? `<p class="offer-note">🇴🇲 ${esc(left)} · ${t('Offer ends 30 November')}</p>` : ''}
        <div style="margin:0 -22px 12px">${shipProgressHtml(sub)}</div>
        <div class="sum-row"><span>${Cart.count() === 1 ? t('Subtotal (1 item)') : t('Subtotal ({n} items)', { n: Cart.count() })}</span><b>${omr(server ? server.subtotalBaisa : sub)}</b></div>
        <div class="sum-row"><span>${t('Delivery')}</span><b style="color:var(--ok)">${t('Free')}</b></div>
        ${server && server.vatAddedBaisa ? `<div class="sum-row"><span>${t('VAT ({p}%)', { p: 5 })}</span><b>${omr(server.vatAddedBaisa)}</b></div>` : ''}
        <div class="sum-row total"><span>${t('Total')}</span><b>${omr(total)}</b></div>
        ${server && !server.vatAddedBaisa ? `<p class="secure-note" style="margin:-4px 0 10px">${t('VAT included')}</p>` : ''}
        <a class="btn btn-primary btn-block" href="/checkout">${t('Checkout securely')} ${I.arrow}</a>
        ${wa ? `<a class="btn btn-wa btn-block" href="${wa}" target="_blank" rel="noopener">${I.wa.replace('<svg', '<svg width="18" height="18"')} ${t('Order on WhatsApp')}</a>` : ''}
        <p class="secure-note">${I.lock} ${t('Thawani Pay or cash on delivery')}</p>`;
    }

    async function refresh() {
      const items = Cart.items();
      if (!items.length) { server = null; return render(); }
      try { server = (await api('/api/checkout/calculate', { method: 'POST', body: { items: items.map(i => ({ sku: i.sku, quantity: i.qty })) } })).data; } catch (e) { server = null; }
      render();
    }

    bindLines($('#cartLines'));
    Cart.on(() => { server = null; render(); refresh(); });
    render();

    storeReady.then(s => { offer = s.offer || null; render(); });
    const notes = await Cart.sync();
    if (notes.length) $('#cartNotes').innerHTML = `<div class="alert warn">${notes.map(esc).join('<br>')}</div>`;
    refresh();
  };
  if (window.GMG) start(); else document.addEventListener('DOMContentLoaded', start);
})();
