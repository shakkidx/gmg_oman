// Global Store State Manager (Cart, Wishlist, Currency, Language)

const Store = {
  // 1. Language Handling
  getLang() {
    return localStorage.getItem('gmg_lang') || 'en';
  },

  setLang(lang) {
    localStorage.setItem('gmg_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    window.dispatchEvent(new CustomEvent('lang-changed', { detail: { lang } }));
  },

  initLang() {
    const lang = this.getLang();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  },

  getCurrency() {
    return localStorage.getItem('techno_currency') || 'USD';
  },

  setCurrency(curr) {
    localStorage.setItem('techno_currency', curr);
    window.dispatchEvent(new CustomEvent('currency-changed', { detail: { currency: curr } }));
  },

  // 2. Format Money (USD default as per reference design, or OMR)
  formatMoney(baisa) {
    const lang = this.getLang();
    const curr = this.getCurrency();
    if (curr === 'USD') {
      const usd = ((baisa || 0) / 100).toFixed(2);
      return `$${usd} USD`;
    }
    const omr = (baisa || 0) / 1000;
    const formatted = omr.toFixed(3);
    if (lang === 'ar') {
      return `${formatted} ر.ع.`;
    }
    return `OMR ${formatted}`;
  },

  // 3. Cart State
  getCart() {
    try {
      return JSON.parse(localStorage.getItem('gmg_cart')) || [];
    } catch (e) {
      return [];
    }
  },

  saveCart(cart) {
    localStorage.setItem('gmg_cart', JSON.stringify(cart));
    this.updateCartCount();
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: { cart } }));
  },

  addToCart(product, quantity = 1, variant = null) {
    const cart = this.getCart();
    const sku = variant ? variant.sku : product.sku;
    const existingIndex = cart.findIndex(it => it.sku === sku);

    if (existingIndex > -1) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        sku: sku,
        name_en: variant ? `${product.name_en} (${variant.title_en})` : product.name_en,
        name_ar: variant ? `${product.name_ar} (${variant.title_ar})` : product.name_ar,
        image_url: product.primary_image || (product.images && product.images[0]?.url) || 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=400&q=80',
        unit_price_baisa: variant ? variant.price_baisa : product.pricing.current_baisa,
        quantity: quantity
      });
    }

    this.saveCart(cart);
  },

  updateCartQty(sku, quantity) {
    let cart = this.getCart();
    if (quantity <= 0) {
      cart = cart.filter(it => it.sku !== sku);
    } else {
      const it = cart.find(i => i.sku === sku);
      if (it) it.quantity = quantity;
    }
    this.saveCart(cart);
  },

  removeFromCart(sku) {
    let cart = this.getCart();
    cart = cart.filter(it => it.sku !== sku);
    this.saveCart(cart);
  },

  clearCart() {
    localStorage.removeItem('gmg_cart');
    this.updateCartCount();
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: { cart: [] } }));
  },

  getCartSubtotalBaisa() {
    return this.getCart().reduce((sum, it) => sum + (it.unit_price_baisa * it.quantity), 0);
  },

  updateCartCount() {
    const cart = this.getCart();
    const count = cart.reduce((total, it) => total + it.quantity, 0);
    const badges = document.querySelectorAll('.cart-badge-count, #cart-badge-count, #mobile-cart-badge-count');
    badges.forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });
  },

  // 4. Wishlist State
  getWishlist() {
    try {
      return JSON.parse(localStorage.getItem('gmg_wishlist')) || [];
    } catch (e) {
      return [];
    }
  },

  toggleWishlist(product) {
    let wishlist = this.getWishlist();
    const idx = wishlist.findIndex(p => p.id === product.id);
    if (idx > -1) {
      wishlist.splice(idx, 1);
    } else {
      wishlist.push(product);
    }
    localStorage.setItem('gmg_wishlist', JSON.stringify(wishlist));
    this.updateWishlistCount();
    window.dispatchEvent(new CustomEvent('wishlist-updated', { detail: { wishlist } }));
  },

  isInWishlist(productId) {
    return this.getWishlist().some(p => p.id === productId);
  },

  updateWishlistCount() {
    const count = this.getWishlist().length;
    const badge = document.getElementById('wishlist-badge-count');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  }
};

// Initialize language and counters immediately
Store.initLang();
document.addEventListener('DOMContentLoaded', () => {
  Store.updateCartCount();
  Store.updateWishlistCount();
});
