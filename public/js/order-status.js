// Order Confirmation & Live Tracking Logic

document.addEventListener('DOMContentLoaded', async () => {
  Store.initLang();
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  const orderId = urlParams.get('order_id');

  // If redirected from Thawani with session_id, execute server verification
  if (sessionId) {
    await verifyThawaniSession(sessionId, orderId);
  }

  if (orderId) {
    document.getElementById('display-order-number').textContent = `#${orderId}`;
    loadOrderDetails(orderId);
  }

  // Setup manual track form
  const trackForm = document.getElementById('manual-track-form');
  if (trackForm) {
    trackForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const num = document.getElementById('track-order-input').value.trim();
      const contact = document.getElementById('track-contact-input').value.trim();
      loadOrderDetails(num, contact);
    });
  }
});

async function verifyThawaniSession(sessionId, orderId) {
  const statusBanner = document.getElementById('payment-verification-banner');
  const lang = Store.getLang();

  if (statusBanner) {
    statusBanner.style.display = 'block';
    statusBanner.innerHTML = `<div class="spinner" style="margin-right: 12px;"></div> ${lang === 'ar' ? 'جارٍ التحقق من نجاح عملية الدفع عبر بوابة ثواني...' : 'Verifying Thawani online payment status...'}`;
  }

  try {
    const res = await fetch(`/api/thawani/verify?session_id=${encodeURIComponent(sessionId)}&order_id=${encodeURIComponent(orderId || '')}`);
    const json = await res.json();

    if (json.success && json.data.isPaid) {
      if (statusBanner) {
        statusBanner.className = 'status-pill status-paid';
        statusBanner.style.padding = '14px 20px';
        statusBanner.style.fontSize = '0.95rem';
        statusBanner.innerHTML = `✓ ${lang === 'ar' ? 'تم استلام وتأكيد الدفع بنجاح عبر بوابة ثواني!' : 'Thawani Online Payment Confirmed Successfully!'}`;
      }
    } else {
      if (statusBanner) {
        statusBanner.className = 'status-pill status-unpaid';
        statusBanner.style.padding = '14px 20px';
        statusBanner.innerHTML = `⚠ ${lang === 'ar' ? 'لم تكتمل عملية الدفع أو تم إلغاؤها.' : 'Payment was not completed or was cancelled.'}`;
      }
    }
  } catch (err) {
    console.error('Verification error:', err);
  }
}

async function loadOrderDetails(orderNumber, contact = '') {
  const lang = Store.getLang();
  const container = document.getElementById('order-details-container');
  if (!container) return;

  try {
    // If contact is not provided yet, try to query without contact or show prompt
    let url = `/api/orders/track?orderNumber=${encodeURIComponent(orderNumber)}`;
    if (contact) {
      url += `&contact=${encodeURIComponent(contact)}`;
    } else {
      // Default placeholder lookup or display order number confirmation
      document.getElementById('confirmation-card')?.classList.remove('hidden');
      return;
    }

    const res = await fetch(url);
    const json = await res.json();

    if (!json.success) {
      alert(json.error || 'Could not find order.');
      return;
    }

    const ord = json.data;
    renderOrderView(ord, lang);
  } catch (err) {
    console.error('Track error:', err);
  }
}

function renderOrderView(ord, lang) {
  const container = document.getElementById('order-details-container');
  if (!container) return;

  container.innerHTML = `
    <div style="background: #ffffff; border-radius: var(--radius-lg); padding: 32px; border: 1px solid var(--border-light); margin-top: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-light); padding-bottom: 20px; margin-bottom: 24px;">
        <div>
          <h2 style="font-size: 1.4rem; font-weight: 800;">Order #${ord.order_number}</h2>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Placed on: ${new Date(ord.created_at).toLocaleString()}</div>
        </div>
        <div>
          <span class="status-pill status-${ord.statuses.payment_status}">${ord.statuses.payment_status}</span>
          <span class="status-pill status-${ord.statuses.fulfillment_status}" style="margin-left: 8px;">${ord.statuses.fulfillment_status}</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px;">
        <div>
          <h4 style="font-weight: 700; margin-bottom: 8px; font-size: 0.95rem;">Delivery Destination (Oman)</h4>
          <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.5;">
            <strong>${ord.customer_name}</strong><br>
            ${ord.delivery.address}<br>
            ${ord.delivery.city}, ${ord.delivery.governorate}<br>
            Sultanate of Oman
          </p>
        </div>
        <div>
          <h4 style="font-weight: 700; margin-bottom: 8px; font-size: 0.95rem;">Financial Summary</h4>
          <div style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.6;">
            <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span> <span>${ord.financials.subtotal_formatted}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Delivery Fee:</span> <span>${ord.financials.delivery_formatted}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>VAT (5%):</span> <span>${ord.financials.vat_formatted}</span></div>
            <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 1.1rem; color: var(--text-main); margin-top: 8px; border-top: 1px solid var(--border-light); padding-top: 8px;">
              <span>Total Amount:</span> <span>${ord.financials.total_formatted}</span>
            </div>
          </div>
        </div>
      </div>

      <h4 style="font-weight: 700; margin-bottom: 16px; font-size: 0.95rem;">Purchased Items</h4>
      <div style="border-top: 1px solid var(--border-light); padding-top: 16px;">
        ${ord.items.map(it => `
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border-light); font-size: 0.9rem;">
            <div><strong>${it.name}</strong> <span style="color: var(--text-muted); font-size: 0.8rem;">(SKU: ${it.sku}) × ${it.quantity}</span></div>
            <div>${it.line_total_formatted}</div>
          </div>
        `).join('')}
      </div>

      ${ord.timeline && ord.timeline.length > 0 ? `
        <h4 style="font-weight: 700; margin-top: 32px; margin-bottom: 16px; font-size: 0.95rem;">Order Timeline</h4>
        <div style="background: var(--bg-subtle); border-radius: var(--radius-md); padding: 16px 20px;">
          ${ord.timeline.map(e => `
            <div style="font-size: 0.85rem; margin-bottom: 8px;">
              <span style="color: var(--text-light);">${new Date(e.created_at).toLocaleTimeString()}</span> — 
              <strong>${e.description}</strong>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}
