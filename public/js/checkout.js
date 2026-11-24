/* Checkout: guest details, free delivery, live server totals, Thawani card or cash on delivery,
   WhatsApp order, abandoned-cart capture and Meta Pixel events */
(function () {
  'use strict';
  const start = async () => {
    const { $, $$, esc, omr, thumb, api, Cart, I, toast, t, RTL, track, pixelContents, waOrderLink, offerLeft, cookie, storeReady } = window.GMG;
    const params = new URLSearchParams(location.search);
    const store = {
      get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
      set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
    };

    // Returning from Thawani without paying: release that attempt, keep cart and details
    const pay = params.get('payment');
    if (pay === 'cancelled' || pay === 'failed') {
      const ord = params.get('order');
      $('#coAlerts').innerHTML = `<div class="alert warn">${pay === 'failed'
        ? t('Your card payment did not go through, so no money was taken. Your cart and details are saved — try again or choose cash on delivery.')
        : t('Your card payment was cancelled, so no money was taken. Your cart and details are saved — try again or choose cash on delivery.')}</div>`;
      if (ord && pay === 'cancelled') api(`/api/thawani/verify?order=${encodeURIComponent(ord)}`).catch(() => {});
      history.replaceState(null, '', '/checkout' + (params.get('thawani_test') === '1' ? '?thawani_test=1' : ''));
    }
    const thawaniTest = params.get('thawani_test') === '1' || sessionStorage.getItem('gmg_thawani_test') === '1';
    if (thawaniTest) try { sessionStorage.setItem('gmg_thawani_test', '1'); } catch (e) { /* ignore */ }

    if (!Cart.items().length) {
      $('#coLayout').innerHTML = `<div style="grid-column:1/-1" class="cart-empty">${I.bag}<h3>${t('Your cart is empty')}</h3><p>${t('Add something before checking out.')}</p><a class="btn btn-primary" href="/offers/">${t('View offers')}</a></div>`;
      return;
    }
    const startItems = Cart.items();
    track('InitiateCheckout', { ...pixelContents(startItems), value: Cart.subtotal() / 1000, currency: 'OMR' });

    $('#secureNote').innerHTML = `${I.lock} ${t('Secure checkout · your details are only used for delivery')}`;
    const desk = innerWidth >= 960;
    $('#sumToggle').style.display = desk ? 'none' : '';
    $('.desk-only').style.display = desk ? '' : 'none';
    // Mobile: the summary starts open so the customer sees items and total before confirming
    const setOpen = open => {
      $('#coSummary').classList.toggle('is-open', open);
      $('#sumToggle').setAttribute('aria-expanded', open);
      $('#sumToggle span').textContent = open ? t('Hide order summary') : t('Show order summary');
    };
    setOpen(true);
    $('#sumToggle').onclick = () => setOpen(!$('#coSummary').classList.contains('is-open'));

    const saved = store.get('gmg_checkout', {});
    // One id per checkout attempt, used to save the phone + cart for follow-up if the order is not finished
    let checkoutId = store.get('gmg_checkout_id', null);
    if (!checkoutId) { checkoutId = 'ck_' + (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Date.now().toString(36) + Math.random().toString(36).slice(2, 12)); store.set('gmg_checkout_id', checkoutId); }

    // ---------- Config: governorates & payment methods ----------
    let config;
    try { config = (await api('/api/checkout/config' + (thawaniTest ? '?thawani_test=1' : ''))).data; } catch (e) { toast(t('Could not load checkout. Please refresh.'), 'error'); return; }
    const days = d => t('{d} days', { d: String(d).replace(/\s*days?/, '') });
    $('#fGov').innerHTML = `<option value="">${t('Select governorate')}</option>` + config.governorates.map(g => `<option value="${esc(g.code)}">${esc(RTL ? g.name_ar : g.name_en)} — ${g.delivery_fee_baisa ? omr(g.delivery_fee_baisa) : t('Free')} · ${esc(days(g.delivery_days))}</option>`).join('');

    const methods = config.payment_methods.filter(m => m.is_active).sort((a, b) => (a.id === 'thawani' ? -1 : 0) - (b.id === 'thawani' ? -1 : 0));
    $('#payOptions').innerHTML = methods.map((m, i) => `
      <label class="pay-opt">
        <input type="radio" name="paymentMethod" value="${m.id}" ${(saved.paymentMethod ? saved.paymentMethod === m.id : i === 0) ? 'checked' : ''}>
        <span class="radio"></span>
        <span><b>${m.id === 'thawani' ? t('Pay online with Thawani') : t('Cash on delivery')}</b>
          <span class="d">${m.id === 'thawani' ? t('Visa, Mastercard or Omani debit card. You’ll be taken to Thawani’s secure page to pay.') : t('Pay by cash or card to the courier when your order arrives.')}</span>
          ${m.id === 'thawani' ? `<span class="tags"><em>Visa</em><em>Mastercard</em><em>${t('Debit')}</em></span>` : ''}
        </span>
      </label>`).join('') || `<div class="alert error">${t('Online ordering is temporarily unavailable. Please contact us on WhatsApp.')}</div>`;
    if (!$('input[name="paymentMethod"]:checked') && $('input[name="paymentMethod"]')) $('input[name="paymentMethod"]').checked = true;

    const fill = (id, v) => { if (v && $(id)) $(id).value = v; };
    fill('#fName', saved.customerName); fill('#fPhone', saved.customerPhone); fill('#fEmail', saved.customerEmail);
    fill('#fGov', saved.deliveryGovernorate); fill('#fArea', saved.deliveryArea || [saved.deliveryCity, saved.deliveryAddress].filter(Boolean).join(', '));
    fill('#fNotes', saved.customerNotes);

    const payment = () => ($('input[name="paymentMethod"]:checked') || {}).value || 'cod';
    const updateButton = () => {
      const m = payment(); const x = $('#placeBtn').dataset.total || '';
      $('#placeBtn').innerHTML = m === 'thawani' ? `${I.lock.replace('<svg', '<svg width="18" height="18"')} ${t('Pay {x}', { x })}` : (x ? t('Place order · {x}', { x }) : t('Place order'));
    };
    let lastTotal = Cart.subtotal();
    let paymentInfoSent = false;
    const sendPaymentInfo = () => {
      if (paymentInfoSent) return; paymentInfoSent = true;
      track('AddPaymentInfo', { ...pixelContents(Cart.items()), value: lastTotal / 1000, currency: 'OMR', payment_type: payment() });
    };
    $('#payOptions').addEventListener('change', () => { updateButton(); sendPaymentInfo(); saveDraft(); });

    // ---------- Totals (always from the server) ----------
    let calcSeq = 0;
    async function recalc() {
      const items = Cart.items();
      const my = ++calcSeq;
      try {
        const r = (await api('/api/checkout/calculate', { method: 'POST', body: { governorateCode: $('#fGov').value || 'MCT', items: items.map(i => ({ sku: i.sku, quantity: i.qty })) } })).data;
        if (my !== calcSeq) return;
        lastTotal = r.totalBaisa;
        $('#coItems').innerHTML = r.lines.map(l => {
          const it = items.find(i => i.sku === l.sku) || {};
          return `<div class="co-item"><span class="thumb"><img src="${thumb(it.image, 480)}" alt=""><i>${l.quantity}</i></span><b>${esc(l.name)}${l.offer ? `<small class="offer-tag">${esc(l.offer)}</small>` : ''}</b><span>${omr(l.line_total_baisa)}${l.original_price_baisa > l.unit_price_baisa ? `<s>${omr(l.original_price_baisa * l.quantity)}</s>` : ''}</span></div>`;
        }).join('');
        const saved = r.lines.reduce((s, l) => s + Math.max(0, l.original_price_baisa - l.unit_price_baisa) * l.quantity, 0);
        const govChosen = Boolean($('#fGov').value);
        const vatRow = r.vatAddedBaisa
          ? `<div class="sum-row"><span>${t('VAT ({p}%)', { p: Math.round(config.vat_rate * 100) })}</span><b>${omr(r.vatAddedBaisa)}</b></div>`
          : `<div class="sum-row muted"><span>${t('VAT ({p}%) included', { p: Math.round(config.vat_rate * 100) })}</span><span>${omr(r.vatBaisa)}</span></div>`;
        const ends = r.lines.find(l => l.offer) && storeOffer && storeOffer.state === 'live' ? offerLeft(storeOffer.ends_at) : '';
        $('#coTotals').innerHTML = `
          ${ends ? `<p class="offer-note">🇴🇲 ${esc(ends)}</p>` : ''}
          <div class="sum-row"><span>${t('Subtotal')}</span><b>${omr(r.subtotalBaisa)}</b></div>
          ${saved ? `<div class="sum-row save"><span>${t('You save {x}', { x: '' })}</span><b>${omr(saved)}</b></div>` : ''}
          ${r.discountBaisa ? `<div class="sum-row"><span>${t('Discount')}</span><b>−${omr(r.discountBaisa)}</b></div>` : ''}
          <div class="sum-row"><span>${t('Delivery')}${govChosen ? ` · ${esc(r.governorate.name)}` : ''}</span>${r.is_free_shipping ? `<b style="color:var(--ok)">${t('Free')}</b>` : `<b>${omr(r.deliveryFeeBaisa)}</b>`}</div>
          ${vatRow}
          <div class="sum-row total"><span>${t('Total')}</span><b>${omr(r.totalBaisa)}</b></div>`;
        $('#placeBtn').dataset.total = omr(r.totalBaisa);
        $('#sumToggleTotal').textContent = omr(r.totalBaisa);
        updateButton();
        renderWa();
        if (r.issues && r.issues.length) { const n = await Cart.sync(); if (n.length) $('#coAlerts').insertAdjacentHTML('beforeend', `<div class="alert warn">${n.map(esc).join('<br>')}</div>`); }
      } catch (e) {
        $('#coTotals').innerHTML = `<div class="alert error">${esc(e.message)}</div>`;
      }
    }
    function renderWa() {
      const items = Cart.items();
      const area = $('#fArea').value.trim(); const gov = $('#fGov').selectedOptions[0];
      const link = waOrderLink(items, lastTotal, [
        $('#fName').value.trim() && t('Name: {x}', { x: $('#fName').value.trim() }),
        area && t('Area: {x}', { x: area + (gov && gov.value ? ', ' + gov.textContent.split(' — ')[0] : '') })
      ]);
      $('#waSlot').innerHTML = link ? `<p class="or-line"><span>${t('or')}</span></p><a class="btn btn-wa btn-block" href="${link}" target="_blank" rel="noopener" id="waBtn">${I.wa.replace('<svg', '<svg width="18" height="18"')} ${t('Order on WhatsApp')}</a>` : '';
    }
    let storeOffer = null;
    storeReady.then(s => { storeOffer = s.offer || null; renderWa(); recalc(); });
    $('#fGov').addEventListener('change', () => { recalc(); saveDraft(); });
    ['#fName', '#fArea'].forEach(id => $(id).addEventListener('change', renderWa));

    const notes = await Cart.sync();
    if (notes.length) $('#coAlerts').insertAdjacentHTML('beforeend', `<div class="alert warn">${notes.map(esc).join('<br>')}</div>`);
    if (!Cart.items().length) { location.href = '/cart'; return; }
    Cart.on(() => recalc());
    recalc();

    // ---------- Validation ----------
    const phoneDigits = () => $('#fPhone').value.replace(/\D/g, '').replace(/^968/, '');
    const rules = {
      fName: v => v.trim().length >= 2,
      fPhone: () => /^[279]\d{7}$/.test(phoneDigits()),
      fEmail: v => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
      fGov: v => Boolean(v),
      fArea: v => v.trim().length >= 3
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

    // Keep what the customer typed (this device only) so a failed or cancelled payment loses nothing
    function draft() {
      return { customerName: $('#fName').value.trim(), customerPhone: phoneDigits(), customerEmail: $('#fEmail').value.trim(), deliveryGovernorate: $('#fGov').value, deliveryArea: $('#fArea').value.trim(), customerNotes: $('#fNotes').value.trim(), paymentMethod: payment() };
    }
    function saveDraft() { store.set('gmg_checkout', draft()); }
    $$('#coForm input, #coForm textarea').forEach(el => el.addEventListener('change', saveDraft));

    // ---------- Abandoned checkout: save phone + cart as soon as a valid number is typed ----------
    let lastSent = '';
    function captureAbandoned() {
      if (!rules.fPhone()) return;
      const items = Cart.items();
      const sig = [phoneDigits(), $('#fName').value.trim(), $('#fGov').value, items.map(i => i.sku + 'x' + i.qty).join(',')].join('|');
      if (sig === lastSent) return; lastSent = sig;
      api('/api/checkout/abandoned', { method: 'POST', body: { id: checkoutId, name: $('#fName').value.trim(), phone: phoneDigits(), governorate: $('#fGov').value, items: items.map(i => ({ sku: i.sku, quantity: i.qty })), source: 'checkout' } }).catch(() => { lastSent = ''; });
    }
    let capT;
    $('#fPhone').addEventListener('input', () => { clearTimeout(capT); capT = setTimeout(captureAbandoned, 700); });
    ['#fPhone', '#fName', '#fGov'].forEach(id => $(id).addEventListener('change', captureAbandoned));
    if (saved.customerPhone) captureAbandoned();

    // ---------- Submit ----------
    let submitting = false;
    $('#coForm').addEventListener('submit', async e => {
      e.preventDefault();
      if (submitting) return;
      const bad = Object.keys(rules).filter(id => !check(id));
      if (bad.length) { $('#' + bad[0]).focus(); $('#' + bad[0]).scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      sendPaymentInfo();
      saveDraft();
      const d = draft();
      const body = {
        customerName: d.customerName,
        customerPhone: '+968' + d.customerPhone,
        customerEmail: d.customerEmail || null,
        deliveryGovernorate: d.deliveryGovernorate,
        deliveryArea: d.deliveryArea,
        customerNotes: d.customerNotes || null,
        paymentMethod: d.paymentMethod,
        items: Cart.items().map(i => ({ sku: i.sku, quantity: i.qty, price_baisa: i.price_baisa })),
        checkoutId,
        thawaniTest: thawaniTest || undefined,
        fbp: cookie('_fbp'), fbc: cookie('_fbc'), pageUrl: location.href,
        idempotencyKey: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random())
      };

      submitting = true;
      const btn = $('#placeBtn'); const label = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> ${body.paymentMethod === 'thawani' ? t('Opening secure payment…') : t('Placing order…')}`;
      try {
        const r = await api('/api/checkout/order', { method: 'POST', body });
        try {
          sessionStorage.setItem('gmg_last_order', JSON.stringify({ number: r.orderNumber, phone: body.customerPhone }));
          if (r.purchase) localStorage.setItem('gmg_purchase_' + r.orderNumber, JSON.stringify(r.purchase));
          localStorage.removeItem('gmg_checkout_id');
        } catch (err) { /* ignore */ }
        if (r.requiresRedirect && r.redirectUrl) {
          location.href = r.redirectUrl; // Thawani — the cart is cleared only after payment is confirmed
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
