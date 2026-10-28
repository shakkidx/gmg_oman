/* Cart page */
(function () {
  'use strict';
  const start = async () => {
    const { $, esc, omr, Cart, lineHtml, bindLines, emptyCartHtml, shipProgressHtml, I, t } = window.GMG;

    function render() {
      const items = Cart.items();
      if (!items.length) {
        $('#cartLayout').innerHTML = `<div style="grid-column:1/-1">${emptyCartHtml()}</div>`;
        return;
      }
      const sub = Cart.subtotal();
      $('#cartLines').innerHTML = `<div style="border-top:1px solid var(--line)">${items.map(i => lineHtml(i)).join('')}</div>
        <a class="link-arrow" href="/shop" style="margin-top:20px">${I.left} ${t('Continue shopping')}</a>`;
      $('#cartSummary').innerHTML = `
        <h2>${t('Order summary')}</h2>
        <div style="margin:0 -22px 12px">${shipProgressHtml(sub)}</div>
        <div class="sum-row"><span>${Cart.count() === 1 ? t('Subtotal (1 item)') : t('Subtotal ({n} items)', { n: Cart.count() })}</span><b>${omr(sub)}</b></div>
        <div class="sum-row"><span>${t('Delivery')}</span><span>${t('Calculated at checkout')}</span></div>
        <div class="sum-row total"><span>${t('Estimated total')}</span><b>${omr(sub)}</b></div>
        <a class="btn btn-primary btn-block" href="/checkout">${t('Checkout securely')} ${I.arrow}</a>
        <p class="secure-note">${I.lock} ${t('Thawani Pay or cash on delivery')}</p>
        <div class="pay-logos"><span>Thawani</span><span>Visa</span><span>Mastercard</span><span>${t('Debit')}</span><span>COD</span></div>`;
    }

    bindLines($('#cartLines'));
    Cart.on(render);
    render();

    const notes = await Cart.sync();
    if (notes.length) $('#cartNotes').innerHTML = `<div class="alert warn">${notes.map(esc).join('<br>')}</div>`;
    render();
  };
  if (window.GMG) start(); else document.addEventListener('DOMContentLoaded', start);
})();
