// Main Storefront Application Logic

let currentCategory = '';
let currentSort = 'featured';
let currentSearch = '';
let activeModalProduct = null;

document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  loadProducts();
  setupEventListeners();
  renderCartDrawer();
});

// Listen to language changes
window.addEventListener('lang-changed', () => {
  loadCategories();
  loadProducts();
  renderCartDrawer();
});

// Listen to cart updates
window.addEventListener('cart-updated', () => {
  renderCartDrawer();
});

function setupEventListeners() {
  // Search input & bar toggle
  const searchToggle = document.getElementById('search-toggle-trigger');
  const searchBar = document.getElementById('techno-search-bar');
  const searchClose = document.getElementById('search-close-btn');
  const searchInput = document.getElementById('search-input');

  if (searchToggle && searchBar) {
    searchToggle.addEventListener('click', () => {
      const isVisible = searchBar.style.display === 'block';
      searchBar.style.display = isVisible ? 'none' : 'block';
      if (!isVisible && searchInput) searchInput.focus();
    });
  }

  if (searchClose && searchBar) {
    searchClose.addEventListener('click', () => {
      searchBar.style.display = 'none';
    });
  }

  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        currentSearch = e.target.value;
        loadProducts();
      }, 300);
    });
  }

  // Currency Toggle Buttons
  document.querySelectorAll('.currency-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const curr = btn.getAttribute('data-curr');
      Store.setCurrency(curr);
      document.querySelectorAll('.currency-toggle-btn').forEach(b => {
        const isMatch = b.getAttribute('data-curr') === curr;
        b.style.fontWeight = isMatch ? '700' : '600';
        b.style.background = isMatch ? '#e4e4e7' : 'transparent';
        b.style.color = isMatch ? '#18181b' : '#71717a';
      });
      updateStaticCardPrices();
      loadProducts();
      renderCartDrawer();
    });
  });

  // Sort dropdown
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      loadProducts();
    });
  }

  // Cart Drawer open/close
  const cartTrigger = document.getElementById('cart-btn-trigger');
  const cartDrawer = document.getElementById('cart-drawer-backdrop');
  const cartClose = document.getElementById('cart-drawer-close');

  if (cartTrigger && cartDrawer) {
    cartTrigger.addEventListener('click', () => cartDrawer.classList.add('open'));
  }
  
  // Mobile Bottom Tab Cart Triggers
  document.querySelectorAll('.mobile-cart-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (cartDrawer) cartDrawer.classList.add('open');
    });
  });

  if (cartClose && cartDrawer) {
    cartClose.addEventListener('click', () => cartDrawer.classList.remove('open'));
  }

  // Mobile Navigation Drawer toggle
  const hamburger = document.getElementById('hamburger-btn');
  const drawer = document.getElementById('mobile-nav-drawer');
  const navClose = document.getElementById('mobile-nav-close');

  if (hamburger && drawer) {
    hamburger.addEventListener('click', () => {
      const isOpen = drawer.classList.contains('open');
      drawer.classList.toggle('open', !isOpen);
      hamburger.classList.toggle('open', !isOpen);
      document.body.style.overflow = !isOpen ? 'hidden' : '';
    });

    if (navClose) {
      navClose.addEventListener('click', () => {
        drawer.classList.remove('open');
        hamburger.classList.remove('open');
        document.body.style.overflow = '';
      });
    }

    drawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        drawer.classList.remove('open');
        hamburger.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // Language toggle buttons
  const langBtns = document.querySelectorAll('.lang-btn');
  langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetLang = btn.getAttribute('data-lang');
      Store.setLang(targetLang);
    });
  });

  // Modal close
  const modalBackdrop = document.getElementById('product-modal-backdrop');
  const modalClose = document.getElementById('modal-close-btn');
  if (modalBackdrop && modalClose) {
    modalClose.addEventListener('click', () => modalBackdrop.classList.remove('open'));
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) modalBackdrop.classList.remove('open');
    });
  }

  // Attach Static Showcase Product Handlers
  setupStaticShowcaseCards();
  updateStaticCardPrices();
}

// Attach click & add-to-cart on static Best Seller & Featured Cards
function setupStaticShowcaseCards() {
  document.querySelectorAll('.techno-card[data-slug]').forEach(card => {
    const slug = card.getAttribute('data-slug');
    card.addEventListener('click', (e) => {
      if (e.target.closest('.add-cart-btn')) return;
      openProductModal(slug);
    });
  });

  document.querySelectorAll('.techno-quick-action.add-cart-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      try {
        const res = await fetch(`/api/products?id=${id}`);
        const json = await res.json();
        const prod = json.data?.find(p => p.id === id);
        if (prod) {
          Store.addToCart(prod, 1);
          showToast(`Added "${prod.name}" to your shopping bag`);
        }
      } catch (err) {
        console.error('Quick add failed:', err);
      }
    });
  });
}

function updateStaticCardPrices() {
  document.querySelectorAll('.price-val-old').forEach(el => {
    const baisa = parseInt(el.getAttribute('data-baisa'), 10) || 29900;
    el.textContent = Store.formatMoney(baisa);
  });
  document.querySelectorAll('.price-val-sale').forEach(el => {
    const baisa = parseInt(el.getAttribute('data-baisa'), 10) || 19900;
    el.textContent = Store.formatMoney(baisa);
  });
}

// 1. Load Categories
async function loadCategories() {
  const container = document.getElementById('categories-pills-container');
  if (!container) return;

  const lang = Store.getLang();
  try {
    const res = await fetch(`/api/categories?lang=${lang}`);
    const json = await res.json();
    if (!json.success) return;

    const allLabel = lang === 'ar' ? 'جميع المنتجات' : 'All Products';
    let html = `<button class="cat-pill ${!currentCategory ? 'active' : ''}" data-slug="">${allLabel}</button>`;

    json.data.forEach(c => {
      const active = currentCategory === c.slug ? 'active' : '';
      html += `<button class="cat-pill ${active}" data-slug="${c.slug}">${c.name}</button>`;
    });

    container.innerHTML = html;

    // Attach click handlers
    container.querySelectorAll('.cat-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.getAttribute('data-slug');
        loadProducts();
      });
    });
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

// 2. Load Products (Rendered in matching TECHNO card aesthetic)
async function loadProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const lang = Store.getLang();
  grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 48px;"><div class="spinner"></div><p style="margin-top: 12px; color: #71717a;">Loading products...</p></div>';

  try {
    const query = new URLSearchParams({
      lang,
      sort: currentSort,
      category: currentCategory,
      search: currentSearch,
      limit: 20
    });

    const res = await fetch(`/api/products?${query}`);
    const json = await res.json();

    if (!json.success || json.data.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
          <h3 style="font-size: 1.2rem; margin-bottom: 8px;">${lang === 'ar' ? 'لا توجد منتجات مطابقة' : 'No Products Found'}</h3>
          <p style="color: #71717a;">${lang === 'ar' ? 'جرب البحث عن مصطلح آخر' : 'Try searching with different terms or reset category filters.'}</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = json.data.map(p => renderProductCard(p, lang)).join('');

    // Attach product event listeners
    grid.querySelectorAll('.techno-card').forEach(card => {
      const slug = card.getAttribute('data-slug');
      const id = card.getAttribute('data-id');
      const prod = json.data.find(p => p.id === id);

      card.addEventListener('click', (e) => {
        if (e.target.closest('.add-cart-btn')) return;
        openProductModal(slug);
      });

      const addBtn = card.querySelector('.add-cart-btn');
      if (addBtn && prod) {
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          Store.addToCart(prod, 1);
          showToast(`Added "${prod.name}" to your shopping bag`);
        });
      }
    });
  } catch (err) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--accent-red); padding: 40px;">Failed to load products: ${err.message}</div>`;
  }
}

function renderProductCard(p, lang) {
  const currentPriceFormatted = Store.formatMoney(p.pricing.current_baisa);
  const retailPriceFormatted = Store.formatMoney(p.pricing.retail_baisa);

  let badgeHtml = '';
  if (p.pricing.is_on_sale) {
    badgeHtml = `<span class="techno-sale-badge">Sale</span>`;
  } else if (p.is_featured) {
    badgeHtml = `<span class="techno-sale-badge" style="background:#18181b;">Featured</span>`;
  }

  return `
    <div class="techno-card" data-id="${p.id}" data-slug="${p.slug}">
      <div class="techno-card-img-box">
        ${badgeHtml}
        <button class="techno-quick-action add-cart-btn" title="Add to Bag" data-id="${p.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
        </button>
        <img src="${p.primary_image}" alt="${p.name}" loading="lazy">
      </div>
      <div class="techno-card-info">
        <h3 class="techno-card-title">${p.name}</h3>
        <div class="techno-price-row">
          ${p.pricing.is_on_sale ? `<span class="techno-price-old">${retailPriceFormatted}</span>` : ''}
          <span class="techno-price-sale">${currentPriceFormatted}</span>
        </div>
      </div>
    </div>
  `;
}

// 3. Open Detailed Product Modal
async function openProductModal(slug) {
  const modal = document.getElementById('product-modal-backdrop');
  const lang = Store.getLang();
  if (!modal) return;

  try {
    const res = await fetch(`/api/products/${slug}?lang=${lang}`);
    const json = await res.json();
    if (!json.success) return;

    const p = json.data;
    activeModalProduct = p;

    document.getElementById('modal-main-img').src = p.images[0]?.url || p.primary_image;
    document.getElementById('modal-product-name').textContent = p.name;
    document.getElementById('modal-product-category').textContent = p.category.name;
    document.getElementById('modal-product-price').textContent = p.pricing.current_formatted;
    document.getElementById('modal-product-desc').textContent = p.full_desc || p.short_desc;
    document.getElementById('modal-product-sku').textContent = `SKU: ${p.sku}`;

    // Render Specs
    const specsTable = document.getElementById('modal-specs-table');
    if (specsTable) {
      specsTable.innerHTML = Object.entries(p.specifications || {}).map(([k, v]) => `
        <tr><td>${k}</td><td>${v}</td></tr>
      `).join('');
    }

    // Render Thumbs
    const thumbsWrap = document.getElementById('modal-thumbs-wrap');
    if (thumbsWrap && p.images) {
      thumbsWrap.innerHTML = p.images.map((img, idx) => `
        <div class="modal-thumb ${idx === 0 ? 'active' : ''}" data-url="${img.url}">
          <img src="${img.url}" alt="${img.alt}">
        </div>
      `).join('');

      thumbsWrap.querySelectorAll('.modal-thumb').forEach(thumb => {
        thumb.addEventListener('click', () => {
          thumbsWrap.querySelectorAll('.modal-thumb').forEach(t => t.classList.remove('active'));
          thumb.classList.add('active');
          document.getElementById('modal-main-img').src = thumb.getAttribute('data-url');
        });
      });
    }

    // Modal Add To Cart
    const addBtn = document.getElementById('modal-add-cart-btn');
    if (addBtn) {
      addBtn.onclick = () => {
        const qty = parseInt(document.getElementById('modal-qty-input')?.value || '1', 10);
        Store.addToCart(p, qty);
        modal.classList.remove('open');
        showToast(lang === 'ar' ? `تمت إضافة "${p.name}" إلى السلة` : `Added "${p.name}" to your cart`);
      };
    }

    modal.classList.add('open');
  } catch (err) {
    console.error('Failed to open product modal:', err);
  }
}

// 4. Render Cart Drawer
function renderCartDrawer() {
  const container = document.getElementById('cart-drawer-items');
  const subtotalEl = document.getElementById('cart-drawer-subtotal');
  const freeShippingText = document.getElementById('free-shipping-text');
  const freeShippingFill = document.getElementById('free-shipping-fill');
  if (!container) return;

  const cart = Store.getCart();
  const lang = Store.getLang();
  const subtotalBaisa = Store.getCartSubtotalBaisa();

  // Free shipping in Oman (25.000 OMR = 25000 Baisa)
  const freeThreshold = 25000;
  if (freeShippingText && freeShippingFill) {
    if (subtotalBaisa >= freeThreshold) {
      freeShippingText.innerHTML = lang === 'ar' 
        ? '🎉 تهانينا! طلبيتك مؤهلة لـ <strong>التوصيل المجاني</strong> في عمان.'
        : '🎉 Congratulations! You unlocked <strong>FREE Delivery</strong> anywhere in Oman.';
      freeShippingFill.style.width = '100%';
    } else {
      const remainingBaisa = freeThreshold - subtotalBaisa;
      const pct = Math.min(100, Math.round((subtotalBaisa / freeThreshold) * 100));
      freeShippingText.innerHTML = lang === 'ar'
        ? `أضف بقيمة <strong>${Store.formatMoney(remainingBaisa)}</strong> للحصول على توصيل مجاني!`
        : `Add <strong>${Store.formatMoney(remainingBaisa)}</strong> more for FREE Oman Delivery!`;
      freeShippingFill.style.width = `${pct}%`;
    }
  }

  if (cart.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 48px 0; color: var(--text-muted);">
        <p style="font-size: 1.1rem; margin-bottom: 8px;">${lang === 'ar' ? 'سلة التسوق فارغة' : 'Your cart is empty'}</p>
        <p style="font-size: 0.85rem;">${lang === 'ar' ? 'استكشف ملحقاتنا المتطورة وأضفها إلى السلة' : 'Explore our premium electronics and add them to your cart.'}</p>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = Store.formatMoney(0);
    return;
  }

  container.innerHTML = cart.map(it => `
    <div class="cart-item" data-sku="${it.sku}">
      <img src="${it.image_url}" alt="${it.name_en}" class="cart-item-img">
      <div class="cart-item-info">
        <h4 class="cart-item-title">${lang === 'ar' ? it.name_ar : it.name_en}</h4>
        <div class="cart-item-price">${Store.formatMoney(it.unit_price_baisa)}</div>
        <div style="display: flex; align-items: center;">
          <div class="qty-control">
            <button class="qty-btn cart-qty-minus">-</button>
            <input type="text" class="qty-input" value="${it.quantity}" readonly>
            <button class="qty-btn cart-qty-plus">+</button>
          </div>
          <button class="item-remove-btn cart-item-remove">${lang === 'ar' ? 'حذف' : 'Remove'}</button>
        </div>
      </div>
    </div>
  `).join('');

  if (subtotalEl) {
    subtotalEl.textContent = Store.formatMoney(subtotalBaisa);
  }

  // Attach Stepper Handlers
  container.querySelectorAll('.cart-item').forEach(el => {
    const sku = el.getAttribute('data-sku');
    const it = cart.find(c => c.sku === sku);

    el.querySelector('.cart-qty-minus')?.addEventListener('click', () => {
      Store.updateCartQty(sku, it.quantity - 1);
    });
    el.querySelector('.cart-qty-plus')?.addEventListener('click', () => {
      Store.updateCartQty(sku, it.quantity + 1);
    });
    el.querySelector('.cart-item-remove')?.addEventListener('click', () => {
      Store.removeFromCart(sku);
    });
  });
}

// 5. Toast Notification Helper
function showToast(message) {
  let toast = document.getElementById('gmg-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'gmg-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--text-main);
      color: #ffffff;
      padding: 14px 22px;
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 0.9rem;
      box-shadow: var(--shadow-float);
      z-index: 9999;
      opacity: 0;
      transform: translateY(20px);
      transition: all 250ms ease;
    `;
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
  }, 2800);
}
