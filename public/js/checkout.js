/* Checkout: contact + address + payment, live totals, Thawani redirect or COD confirmation */
(function () {
  'use strict';
  const start = async () => {
    const { $, $$, esc, omr, thumb, api, Cart, I, toast , t, RTL } = window.GMG;
    const params = new URLSearchParams(location.search);
    try { const it = Cart.items(); if (window.fbq && it.length) fbq('track', 'InitiateCheckout', { content_ids: it.map(i => i.sku), content_type: 'product', num_items: Cart.count(), value: Cart.subtotal() / 1000, currency: 'OMR' }); } catch (e) { /* ignore */ }

    // Returning from a cancelled Thawani payment: release that attempt and keep the cart
    if (params.get('payment') === 'cancelled') {
      const ord = params.get('order');
      $('#coAlerts').innerHTML = `<div class="alert warn">${t('Your card payment was cancelled, so no money was taken. Your cart is still here — you can try again or choose cash on delivery.')}</div>`;
      if (ord) api(`/api/thawani/verify?order=${encodeURIComponent(ord)}`).catch(() => {});
      history.replaceState(null, '', '/checkout');
    }

    if (!Cart.items().length) {
      $('#coLayout').innerHTML = `<div style="grid-column:1/-1" class="cart-empty">${I.bag}<h3>${t('Your cart is empty')}</h3><p>${t('Add something before checking out.')}</p><a class="btn btn-primary" href="/shop">${t('Shop now')}</a></div>`;
      return;
    }

    $('#secureNote').innerHTML = `${I.lock} ${t('Secure checkout · your details are only used for delivery')}`;
    if (innerWidth >= 960) $('#sumToggle').style.display = 'none';
    $('.desk-only').style.display = innerWidth >= 960 ? '' : 'none';
    $('#sumToggle').onclick = () => {
      const s = $('#coSummary'); const open = !s.classList.contains('is-open');
      s.classList.toggle('is-open', open);
      $('#sumToggle').setAttribute('aria-expanded', open);
      $('#sumToggle span').textContent = open ? t('Hide order summary') : t('Show order summary');
    };

    // Restore saved details (this device only)
    const saved = (() => { try { return JSON.parse(localStorage.getItem('gmg_checkout') || '{}'); } catch (e) { return {}; } })();

    // ---------- Config: governorates & payment methods ----------
    let config;
    try { config = (await api('/api/checkout/config')).data; } catch (e) { toast(t('Could not load checkout. Please refresh.'), 'error'); return; }
    const days = d => t('{d} days', { d: String(d).replace(/\s*days?/, '') });
    $('#fGov').innerHTML = `<option value="">${t('Select governorate')}</option>` + config.governorates.map(g => `<option value="${esc(g.code)}">${esc(RTL ? g.name_ar : g.name_en)} — ${omr(g.delivery_fee_baisa)} · ${esc(days(g.delivery_days))}</option>`).join('');

    const methods = config.payment_methods.filter(m => m.is_active).sort((a, b) => (a.id === 'thawani' ? -1 : 0) - (b.id === 'thawani' ? -1 : 0));
    $('#payOptions').innerHTML = methods.map((m, i) => `
      <label class="pay-opt">
        <input type="radio" name="paymentMethod" value="${m.id}" ${i === 0 ? 'checked' : ''}>
        <span class="radio"></span>
        <span><b>${m.id === 'thawani' ? t('Pay online with Thawani') : t('Cash on delivery')}</b>
          <span class="d">${m.id === 'thawani' ? t('Visa, Mastercard or Omani debit card. You’ll be taken to Thawani’s secure page to pay.') : t('Pay by cash or card to the courier when your order arrives.')}</span>
          ${m.id === 'thawani' ? `<span class="tags"><em>Visa</em><em>Mastercard</em><em>${t('Debit')}</em></span>` : ''}
        </span>
      </label>`).join('') || `<div class="alert error">${t('Online ordering is temporarily unavailable. Please contact us on WhatsApp.')}</div>`;
    if (methods.length && !methods.some(m => m.id === 'thawani')) $$('.tags').forEach(t => t.remove());

    // Fill saved values
    const fill = (id, v) => { if (v && $(id)) $(id).value = v; };
    fill('#fName', saved.customerName); fill('#fPhone', saved.customerPhone); fill('#fEmail', saved.customerEmail);
    fill('#fGov', saved.deliveryGovernorate); fill('#fCity', saved.deliveryCity); fill('#fAddr', saved.deliveryAddress);

    const payment = () => ($('input[name="paymentMethod"]:checked') || {}).value || 'cod';
    const updateButton = () => {
      const m = payment();
      $('#placeBtn').innerHTML = m === 'thawani' ? `${I.lock.replace('<svg', '<svg width="18" height="18"')} ${t('Pay {x}', { x: $('#placeBtn').dataset.total || '' })}` : ($('#placeBtn').dataset.total ? t('Place order · {x}', { x: $('#placeBtn').dataset.total }) : t('Place order'));
    };
    $('#payOptions').addEventListener('change', updateButton);

    // ---------- Totals ----------
    let calcSeq = 0;
    async function recalc() {
      const items = Cart.items();
      $('#coItems').innerHTML = items.map(i => `<div class="co-item"><span class="thumb"><img src="${thumb(i.image, 480)}" alt=""><i>${i.qty}</i></span><b>${esc(i.name)}</b><span>${omr(i.price_baisa * i.qty)}</span></div>`).join('');
      const my = ++calcSeq;
      try {
        const r = (await api('/api/checkout/calculate', { method: 'POST', body: { governorateCode: $('#fGov').value || 'MCT', items: items.map(i => ({ sku: i.sku, quantity: i.qty })) } })).data;
        if (my !== calcSeq) return;
        const govChosen = Boolean($('#fGov').value);
        const delivery = r.is_free_shipping ? `<b style="color:var(--ok)">${t('Free')}</b>` : (govChosen ? `<b>${omr(r.deliveryFeeBaisa)}</b>` : `<span>${t('from {x}', { x: omr(r.deliveryFeeBaisa) })}</span>`);
        $('#coTotals').innerHTML = `
          <div class="sum-row"><span>${t('Subtotal')}</span><b>${omr(r.subtotalBaisa)}</b></div>
          ${r.discountBaisa ? `<div class="sum-row"><span>${t('Discount')}</span><b>−${omr(r.discountBaisa)}</b></div>` : ''}
          <div class="sum-row"><span>${t('Delivery')}${govChosen ? ` · ${esc(r.governorate.name)}` : ''}</span>${delivery}</div>
          <div class="sum-row"><span>${t(config.vat_inclusive ? 'VAT ({p}%) included' : 'VAT ({p}%)', { p: Math.round(config.vat_rate * 100) })}</span><b>${omr(r.vatBaisa)}</b></div>
          <div class="sum-row total"><span>${t('Total')}</span><b>${omr(r.totalBaisa)}</b></div>`;
        $('#placeBtn').dataset.total = omr(r.totalBaisa);
        $('#sumToggleTotal').textContent = omr(r.totalBaisa);
        updateButton();
      } catch (e) {
        $('#coTotals').innerHTML = `<div class="alert error">${esc(e.message)}</div>`;
      }
    }
    $('#fGov').addEventListener('change', recalc);

    const notes = await Cart.sync();
    if (notes.length) $('#coAlerts').insertAdjacentHTML('beforeend', `<div class="alert warn">${notes.map(esc).join('<br>')}</div>`);
    if (!Cart.items().length) { location.href = '/cart'; return; }
    recalc();

    // ---------- Validation ----------
    const rules = {
      fName: v => v.trim().length >= 2,
      fPhone: v => /^[279]\d{7}$/.test(v.replace(/\D/g, '').replace(/^968/, '')),
      fEmail: v => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
      fGov: v => Boolean(v),
      fCity: v => v.trim().length >= 2,
      fAddr: v => v.trim().length >= 4
    };
    function check(id) {
      const el = $('#' + id); const ok = rules[id](el.value);
      el.closest('.field').classList.toggle('has-error', !ok);
      el.setAttribute('aria-invalid', ok ? 'false' : 'true');
      return ok;
    }
    Object.keys(rules).forEach(id => {
      const el = $('#' + id);
      el.addEventListener('blur', () => { if (el.value) check(id); });
      el.addEventListener('input', () => { if (el.closest('.field').classList.contains('has-error')) check(id); });
    });

    // ---------- Submit ----------
    let submitting = false;
    $('#coForm').addEventListener('submit', async e => {
      e.preventDefault();
      if (submitting) return;
      const bad = Object.keys(rules).filter(id => !check(id));
      if (bad.length) { $('#' + bad[0]).focus(); $('#' + bad[0]).scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }

      const phoneDigits = $('#fPhone').value.replace(/\D/g, '').replace(/^968/, '');
      const body = {
        customerName: $('#fName').value.trim(),
        customerPhone: '+968' + phoneDigits,
        customerEmail: $('#fEmail').value.trim() || null,
        deliveryGovernorate: $('#fGov').value,
        deliveryCity: $('#fCity').value.trim(),
        deliveryAddress: $('#fAddr').value.trim(),
        customerNotes: $('#fNotes').value.trim() || null,
        paymentMethod: payment(),
        items: Cart.items().map(i => ({ sku: i.sku, quantity: i.qty })),
        idempotencyKey: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random())
      };
      try { localStorage.setItem('gmg_checkout', JSON.stringify({ customerName: body.customerName, customerPhone: phoneDigits, customerEmail: body.customerEmail, deliveryGovernorate: body.deliveryGovernorate, deliveryCity: body.deliveryCity, deliveryAddress: body.deliveryAddress })); } catch (err) { /* ignore */ }

      submitting = true;
      const btn = $('#placeBtn'); const label = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> ${body.paymentMethod === 'thawani' ? t('Opening secure payment…') : t('Placing order…')}`;
      try {
        const r = await api('/api/checkout/order', { method: 'POST', body });
        try { sessionStorage.setItem('gmg_last_order', JSON.stringify({ number: r.orderNumber, phone: body.customerPhone })); } catch (err) { /* ignore */ }
        if (r.requiresRedirect && r.redirectUrl) {
          location.href = r.redirectUrl; // Thawani — cart is cleared after payment is confirmed
          return;
        }
        Cart.clear();
        location.href = `/order-confirmation.html?order=${encodeURIComponent(r.orderNumber)}`;
      } catch (err) {
        submitting = false; btn.disabled = false; btn.innerHTML = label;
        $('#coAlerts').innerHTML = `<div class="alert error">${esc(err.message)}</div>`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        Cart.sync().then(n => { if (n.length) $('#coAlerts').insertAdjacentHTML('beforeend', `<div class="alert warn">${n.map(esc).join('<br>')}</div>`); recalc(); });
      }
    });
  };
  if (window.GMG) start(); else document.addEventListener('DOMContentLoaded', start);
})();
