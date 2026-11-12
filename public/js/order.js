/* Order confirmation (after checkout / Thawani) and order tracking (/track) */
(function () {
  'use strict';
  const start = async () => {
    const { $, esc, api, Cart, I, t, RTL } = window.GMG;
    const params = new URLSearchParams(location.search);
    const orderNo = params.get('order') || params.get('order_id');
    const fromThawani = params.get('paid') === '1' || params.has('session_id');
    const box = $('#confirm');
    const last = (() => { try { return JSON.parse(sessionStorage.getItem('gmg_last_order') || 'null'); } catch (e) { return null; } })();

    const STATUS = {
      pending: ['Awaiting payment', 'warn'], confirmed: ['Confirmed', 'ok'], processing: ['Being prepared', 'ok'],
      shipped: ['On the way', 'ok'], delivered: ['Delivered', 'ok'], cancelled: ['Cancelled', 'bad'], refunded: ['Refunded', 'bad']
    };
    const PAY = { paid: ['Paid', 'ok'], unpaid: ['Pay on delivery', ''], pending: ['Payment pending', 'warn'], cancelled: ['Payment cancelled', 'bad'], failed: ['Payment failed', 'bad'], refunded: ['Refunded', 'bad'] };
    const EVENT = { order_placed: 'Order placed', payment_verified: 'Payment received', status_change: 'Status updated' };
    const pill = ([label, c]) => `<span class="pill ${c}">${esc(t(label))}</span>`;
    const when = s => { const d = new Date(String(s).replace(' ', 'T') + 'Z'); return isNaN(d) ? '' : d.toLocaleString(RTL ? 'ar-OM' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };

    function orderBox(o) {
      const status = STATUS[o.statuses.fulfillment_status] || [o.statuses.fulfillment_status, ''];
      const pay = PAY[o.statuses.payment_status] || [o.statuses.payment_status, ''];
      return `<div class="order-box">
        <div class="top"><div><small style="color:var(--muted)">${t('Order')}</small><br><b>${esc(o.order_number)}</b></div><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">${pill(status)}${pill(pay)}</div></div>
        ${o.items.map(it => `<div class="sum-row"><span>${it.quantity} × ${esc(it.name)}</span><b>${esc(it.line_total_formatted)}</b></div>`).join('')}
        <div class="sum-row"><span>${t('Delivery')}</span><b>${esc(o.financials.delivery_formatted)}</b></div>
        <div class="sum-row"><span>${t('VAT')}</span><b>${esc(o.financials.vat_formatted)}</b></div>
        <div class="sum-row total"><span>${t('Total')}</span><b>${esc(o.financials.total_formatted)}</b></div>
        <p style="font-size:13.5px;color:var(--muted);margin-top:14px">${t('Delivering to {a}', { a: `${esc(o.delivery.address)}, ${esc(o.delivery.city)}, ${esc(o.delivery.governorate)}` })}</p>
        ${o.timeline && o.timeline.length ? `<ul class="timeline">${o.timeline.map(e => `<li>${esc(t(EVENT[e.event_type] || 'Update'))}${e.event_type === 'status_change' ? ` — ${esc((e.description.match(/to (\w+)/) || [])[1] ? t((STATUS[(e.description.match(/to (\w+)/) || [])[1]] || [''])[0]) : '')}` : ''}<small>${when(e.created_at)}</small></li>`).join('')}</ul>` : ''}
      </div>`;
    }

    async function fetchOrder(number, contact) {
      return (await api(`/api/orders/track?orderNumber=${encodeURIComponent(number)}&contact=${encodeURIComponent(contact)}`)).data;
    }

    function trackForm(msg) {
      box.innerHTML = `
        <h1>${t('Track your order')}</h1>
        <p class="lead">${t('Enter your order number and the mobile number you used at checkout.')}</p>
        ${msg ? `<div class="alert error" style="margin-top:20px;text-align:left">${esc(msg)}</div>` : ''}
        <form class="track-form" id="trackForm" style="margin-top:28px">
          <div class="field"><label for="tNo">${t('Order number')}</label><input id="tNo" placeholder="GMG-123456-789" required value="${esc(orderNo || '')}"></div>
          <div class="field"><label for="tPhone">${t('Mobile number or email')}</label><input id="tPhone" required placeholder="9123 4567"></div>
          <button class="btn btn-primary btn-block" type="submit">${t('Find my order')}</button>
        </form>
        <div id="trackResult"></div>`;
      $('#trackForm').onsubmit = async e => {
        e.preventDefault();
        const btn = e.target.querySelector('button'); btn.disabled = true;
        try {
          const o = await fetchOrder($('#tNo').value.trim(), $('#tPhone').value.trim());
          $('#trackResult').innerHTML = orderBox(o);
        } catch (err) {
          $('#trackResult').innerHTML = `<div class="alert error" style="margin-top:20px;text-align:left">${esc(err.message)}</div>`;
        }
        btn.disabled = false;
      };
    }

    if (!orderNo || location.pathname === '/track') { trackForm(); return; }

    // Verify online payment with Thawani before showing success
    let state = 'ok';
    if (fromThawani) {
      box.innerHTML = `<div class="confirm-icon pending"><span class="spinner" style="border-color:rgba(179,92,0,.25);border-top-color:var(--warn);width:30px;height:30px"></span></div><h1>${t('Confirming your payment…')}</h1><p class="lead">${t('This only takes a moment.')}</p>`;
      state = 'pending';
      for (let i = 0; i < 4 && state === 'pending'; i++) {
        try {
          const v = (await api(`/api/thawani/verify?order=${encodeURIComponent(orderNo)}`)).data;
          if (v.isPaid) state = 'ok';
          else if (v.paymentStatus === 'cancelled') state = 'fail';
        } catch (e) { /* retry */ }
        if (state === 'pending') await new Promise(r => setTimeout(r, 2000));
      }
    }
    if (state === 'ok') {
      // Meta Pixel: report the purchase once per order
      try {
        const key = 'gmg_px_' + orderNo;
        const items = Cart.items();
        if (window.fbq && !sessionStorage.getItem(key) && items.length) {
          fbq('track', 'Purchase', { content_ids: items.map(i => i.sku), content_type: 'product', num_items: items.reduce((n, i) => n + i.qty, 0), value: items.reduce((v, i) => v + i.price_baisa * i.qty, 0) / 1000, currency: 'OMR' }, { eventID: orderNo });
          sessionStorage.setItem(key, '1');
        }
      } catch (e) { /* ignore */ }
      Cart.clear();
    }

    const head = {
      ok: `<div class="confirm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path class="check" d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
           <h1>${t('Thank you — order received!')}</h1><p class="lead">${fromThawani ? t('Your payment was successful. ') : ''}${t('We’ll call or WhatsApp you to confirm delivery. Keep your order number handy.')}</p>`,
      pending: `<div class="confirm-icon pending">${I.refresh}</div><h1>${t('Payment not confirmed yet')}</h1><p class="lead">${t('If money was taken from your card, your order is safe — we’ll confirm it shortly. Otherwise you can try paying again.')}</p>`,
      fail: `<div class="confirm-icon fail">${I.close}</div><h1>${t('Payment was not completed')}</h1><p class="lead">${t('No money was taken. Your cart is still saved — try again or choose cash on delivery.')}</p>`
    }[state];

    let details = '';
    const contact = last && last.number === orderNo ? last.phone : null;
    if (contact) {
      try { details = orderBox(await fetchOrder(orderNo, contact)); } catch (e) { /* show without details */ }
    }
    if (!details) details = `<div class="order-box"><div class="top"><div><small style="color:var(--muted)">${t('Order number')}</small><br><b>${esc(orderNo)}</b></div></div><p style="font-size:14px;color:var(--muted)">${t('You can track this order any time from the')} <a href="/track" style="text-decoration:underline">${t('order tracking page')}</a>.</p></div>`;

    box.innerHTML = head + details + `<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      ${state === 'ok' ? `<a class="btn btn-primary" href="/shop">${t('Continue shopping')}</a><a class="btn btn-ghost" href="/track?order=${encodeURIComponent(orderNo)}">${t('Track order')}</a>` : `<a class="btn btn-primary" href="/checkout">${t('Try again')}</a><a class="btn btn-ghost" href="/contact">${t('Contact us')}</a>`}
    </div>`;
  };
  if (window.GMG) start(); else document.addEventListener('DOMContentLoaded', start);
})();
