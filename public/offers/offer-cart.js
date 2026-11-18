/* National Day offers page — add to cart, then send the order on WhatsApp. */
(function () {
  'use strict';
  var WA_NUMBER = '96896907526';
  var STORE_KEY = 'gmg_offer_cart_v1';
  var GOVS = ['Muscat', 'Dhofar', 'Musandam', 'Al Buraimi', 'Ad Dakhiliyah', 'North Al Batinah', 'South Al Batinah', 'South Ash Sharqiyah', 'North Ash Sharqiyah', 'Ad Dhahirah', 'Al Wusta'];

  function px() { try { if (window.fbq) window.fbq.apply(null, arguments); } catch (e) { /* ignore */ } }
  function omr(baisa) { return (baisa / 1000).toFixed(3) + ' OMR'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function load() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(cart)); } catch (e) { /* ignore */ } }

  // ---------- Read the products from the catalogue pages ----------
  var products = {};
  var sections = Array.prototype.slice.call(document.querySelectorAll('section.post'));
  sections.forEach(function (sec) {
    var m = /MODEL\s+([A-Z0-9-]+)/.exec(sec.textContent);
    var h1 = sec.querySelector('h1');
    var priceEl = Array.prototype.find.call(sec.querySelectorAll('span'), function (s) { return /font-size:\s*128px/.test(s.getAttribute('style') || ''); });
    var oldEl = sec.querySelector('span[style*="line-through"]');
    if (!m || !h1 || !priceEl) return;
    var model = m[1];
    var img = sec.querySelector('img[alt="' + h1.textContent.replace(/"/g, '') + '"]');
    products[model] = {
      model: model,
      name: h1.textContent.trim(),
      price: Math.round(parseFloat(priceEl.textContent) * 1000),
      old: oldEl ? Math.round(parseFloat(oldEl.textContent) * 1000) : 0,
      img: img ? img.getAttribute('src') : ''
    };
    var bar = document.createElement('div');
    bar.className = 'oc-bar';
    bar.innerHTML = '<div><div class="oc-name">' + esc(products[model].name) + '</div><div class="oc-price">' + omr(products[model].price) + '</div></div>' +
      '<div class="oc-ctl" data-ctl="' + model + '"></div>';
    var slot = sec.closest('.slot') || sec;
    slot.parentNode.insertBefore(bar, slot.nextSibling);
  });

  // ---------- Offer period: 20–30 November 2026, Oman time ----------
  var START = Date.parse('2026-11-20T00:00:00+04:00'), END = Date.parse('2026-11-30T23:59:59+04:00');
  var preview = /[?&]preview=1\b/.test(location.search);
  function phase() { var t = Date.now(); if (preview) return 'live'; return t < START ? 'soon' : (t > END ? 'ended' : 'live'); }
  var period = document.createElement('div');
  period.className = 'oc-period';
  document.body.insertBefore(period, document.body.firstChild);
  function showPeriod() {
    var ph = phase();
    period.className = 'oc-period ' + ph;
    var home = '<a class="oc-btn" href="/" aria-label="gmgoman.com home"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg><span>Home</span></a>';
    var shop = '<a class="oc-btn" href="/shop" aria-label="Full shop"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 7h12l-1 13H7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg><span>Shop</span></a>';
    var mid = ph === 'ended'
      ? '<b>This offer has ended</b><small dir="rtl">انتهى العرض</small>'
      : '<b>Offer valid 20–30 Nov 2026</b><small dir="rtl">العرض ساري من ٢٠ إلى ٣٠ نوفمبر</small>' + (ph === 'soon' ? '<em>Orders open on 20 November</em>' : '');
    period.innerHTML = home + '<div class="oc-mid">' + mid + '</div>' + shop;
    return ph;
  }

  var cart = load();
  Object.keys(cart).forEach(function (k) { if (!products[k] || !(cart[k] > 0)) delete cart[k]; });



  // ---------- Floating buttons + sheet ----------
  var fab = document.createElement('div');
  fab.className = 'oc-fab';
  fab.innerHTML = '<button class="cart" type="button" hidden>🛒 Cart <b>0</b> <span></span></button>' +
    '<a class="wa" href="https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent("Hi, I'm interested in the National Day offers") + '" target="_blank" rel="noopener">WhatsApp</a>';
  document.body.appendChild(fab);
  var cartBtn = fab.querySelector('.cart');

  var sheet = document.createElement('div');
  sheet.className = 'oc-sheet';
  sheet.innerHTML = '<div class="bg"></div><div class="panel" role="dialog" aria-modal="true" aria-label="Your order">' +
    '<h2>Your order <button class="x" type="button" aria-label="Close">×</button></h2>' +
    '<div class="oc-items"></div><div class="oc-sum"><span>Total</span><span class="oc-total"></span></div>' +
    '<div class="oc-note">✓ Free delivery across Oman · VAT paid by us</div>' +
    '<form class="oc-form" novalidate>' +
    '<label for="ocName">Full name</label><input id="ocName" autocomplete="name" required>' +
    '<label for="ocTel">Mobile number</label><div class="tel"><span>+968</span><input id="ocTel" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="9XXXXXXX" maxlength="8" required></div>' +
    '<label for="ocGov">Governorate</label><select id="ocGov" required><option value="">Select…</option>' + GOVS.map(function (g) { return '<option>' + g + '</option>'; }).join('') + '</select>' +
    '<label for="ocArea">Area / city</label><input id="ocArea" placeholder="e.g. Al Khuwair" required>' +
    '<label for="ocAddr">Address details</label><textarea id="ocAddr" rows="2" placeholder="Building, street, landmark" required></textarea>' +
    '<label for="ocNote">Notes (optional)</label><input id="ocNote">' +
    '<div class="oc-err" aria-live="polite"></div>' +
    '<button class="oc-send" type="submit">Send order on WhatsApp</button></form></div>';
  document.body.appendChild(sheet);

  var CART_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2"/></svg>';
  var toastEl = document.createElement('div'); toastEl.className = 'oc-toast'; document.body.appendChild(toastEl);
  var toastT;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2200); }

  function count() { return Object.keys(cart).reduce(function (n, k) { return n + cart[k]; }, 0); }
  function total() { return Object.keys(cart).reduce(function (t, k) { return t + products[k].price * cart[k]; }, 0); }

  function render() {
    if (showPeriod() === 'ended') { cart = {}; }
    var n = count();
    cartBtn.hidden = n === 0;
    cartBtn.querySelector('b').textContent = n;
    cartBtn.querySelector('span').textContent = n ? omr(total()) : '';
    var ph = phase();
    document.querySelectorAll('[data-ctl]').forEach(function (box) {
      var k = box.dataset.ctl, q = cart[k] || 0;
      if (ph === 'ended') { box.innerHTML = '<button class="oc-add" type="button" disabled>Offer ended</button>'; return; }
      box.innerHTML = q
        ? '<div class="oc-step" role="group" aria-label="Quantity"><button type="button" data-dec="' + k + '" aria-label="Remove one">−</button><span>' + CART_ICON + q + '</span><button type="button" data-inc="' + k + '" aria-label="Add one">+</button></div>'
        : '<button class="oc-add" type="button" data-model="' + k + '">' + CART_ICON + 'Add to cart</button>';
    });
    var list = sheet.querySelector('.oc-items');
    list.innerHTML = n ? Object.keys(cart).map(function (k) {
      var p = products[k];
      return '<div class="oc-item">' + (p.img ? '<img src="' + esc(p.img) + '" alt="">' : '') +
        '<div class="t"><b>' + esc(p.name) + '</b><span>' + omr(p.price) + ' · ' + esc(p.model) + '</span></div>' +
        '<div class="oc-qty"><button type="button" data-dec="' + k + '" aria-label="Less">−</button><span>' + cart[k] + '</span><button type="button" data-inc="' + k + '" aria-label="More">+</button></div></div>';
    }).join('') : '<div class="oc-empty">Your cart is empty.</div>';
    sheet.querySelector('.oc-total').textContent = omr(total());
    save();
  }

  function open() { sheet.classList.add('open'); document.body.style.overflow = 'hidden'; px('track', 'InitiateCheckout', { value: total() / 1000, currency: 'OMR', num_items: count() }); }
  function close() { sheet.classList.remove('open'); document.body.style.overflow = ''; }

  document.addEventListener('click', function (e) {
    var add = e.target.closest('.oc-add');
    if ((add || e.target.closest('[data-inc]')) && phase() === 'soon') { toast('Orders open on 20 November 🇴🇲'); return; }
    if (add && phase() !== 'live') { render(); return; }
    if (add) {
      var k = add.dataset.model;
      cart[k] = Math.min(20, (cart[k] || 0) + 1);
      render();
      px('track', 'AddToCart', { content_ids: [k], content_name: products[k].name, content_type: 'product', value: products[k].price / 1000, currency: 'OMR' });
      return;
    }
    var inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]');
    if (inc) { cart[inc.dataset.inc] = Math.min(20, cart[inc.dataset.inc] + 1); render(); return; }
    if (dec) { var d = dec.dataset.dec; cart[d] -= 1; if (cart[d] <= 0) delete cart[d]; render(); if (!count()) close(); return; }
  });
  cartBtn.addEventListener('click', open);
  sheet.querySelector('.bg').addEventListener('click', close);
  sheet.querySelector('.x').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  sheet.querySelector('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = sheet.querySelector('.oc-err');
    var v = function (id) { return document.getElementById(id).value.trim(); };
    var tel = v('ocTel').replace(/\D/g, '').replace(/^968/, '');
    if (phase() !== 'live') { err.textContent = phase() === 'soon' ? 'Orders open on 20 November.' : 'This offer has ended.'; return; }
    if (!count()) { err.textContent = 'Your cart is empty.'; return; }
    if (v('ocName').length < 2) { err.textContent = 'Please enter your name.'; return; }
    if (!/^[279]\d{7}$/.test(tel)) { err.textContent = 'Please enter an 8-digit Omani mobile number.'; return; }
    if (!v('ocGov')) { err.textContent = 'Please choose your governorate.'; return; }
    if (!v('ocArea') || !v('ocAddr')) { err.textContent = 'Please enter your area and address.'; return; }
    err.textContent = '';

    var lines = ['*New order — National Day offer (50% off, 20–30 Nov)*', ''];
    Object.keys(cart).forEach(function (k, i) {
      var p = products[k];
      lines.push((i + 1) + '. ' + p.name + ' (' + p.model + ') × ' + cart[k] + ' = ' + omr(p.price * cart[k]));
    });
    lines.push('', '*Total: ' + omr(total()) + '*', 'Free delivery · VAT paid by us', '',
      '*Name:* ' + v('ocName'), '*Mobile:* +968 ' + tel, '*Governorate:* ' + v('ocGov'), '*Area:* ' + v('ocArea'), '*Address:* ' + v('ocAddr'));
    if (v('ocNote')) lines.push('*Notes:* ' + v('ocNote'));

    px('track', 'Lead', { value: total() / 1000, currency: 'OMR', content_ids: Object.keys(cart), num_items: count() });
    window.location.href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));
  });

  render();
})();
