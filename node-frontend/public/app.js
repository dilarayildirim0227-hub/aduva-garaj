/**
 * Aduva Garaj - Frontend Application
 * Vanilla JavaScript ES6+ module
 */

const API_BASE = '/v1';
const CART_TOKEN_KEY = 'aduvagaraj_cart_token';
const AUTH_TOKEN_KEY = 'aduvagaraj_auth_token';

// =============================================================================
// Utility Functions
// =============================================================================

function formatPrice(kurus) {
  const tl = (kurus / 100).toFixed(2);
  return `₺${tl.replace('.', ',')}`;
}

function formatNumber(num) {
  return new Intl.NumberFormat('tr-TR').format(num);
}

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const cartToken = localStorage.getItem(CART_TOKEN_KEY);
  if (cartToken) {
    headers['X-Cart-Token'] = cartToken;
  }

  const authToken = localStorage.getItem(AUTH_TOKEN_KEY);
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Bir hata oluştu' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-close" aria-label="Kapat">&times;</button>
  `;
  container.appendChild(toast);

  toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
  setTimeout(() => toast.remove(), 4000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 400;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `;
  document.body.appendChild(container);
  return container;
}

// =============================================================================
// Cart Manager
// =============================================================================

class CartManager {
  constructor() {
    this.cart = null;
    this.drawer = document.getElementById('cart-drawer');
    this.overlay = document.querySelector('.cart-overlay');
    this.trigger = document.querySelector('.cart-trigger');
    this.closeBtn = document.querySelector('.cart-close');
    this.itemsContainer = document.querySelector('.cart-items');
    this.emptyState = document.querySelector('.cart-empty');
    this.footer = document.querySelector('.cart-footer');
    this.countBadge = document.querySelector('.cart-count');
    this.subtotalEl = document.querySelector('.subtotal');
    this.shippingEl = document.querySelector('.shipping');
    this.totalEl = document.querySelector('.total');
    this.progressBar = document.querySelector('.free-shipping-progress');
    this.remainingText = document.querySelector('.remaining');

    this.init();
  }

  init() {
    this.trigger?.addEventListener('click', () => this.open());
    this.closeBtn?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => e.key === 'Escape' && this.close());

    this.load();
  }

  async load() {
    try {
      this.cart = await apiRequest('/cart');
      this.render();
    } catch (error) {
      console.error('Cart load error:', error);
    }
  }

  open() {
    this.drawer?.classList.add('open');
    this.overlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
    this.trigger?.setAttribute('aria-expanded', 'true');
    this.drawer?.setAttribute('aria-hidden', 'false');
  }

  close() {
    this.drawer?.classList.remove('open');
    this.overlay?.classList.remove('open');
    document.body.style.overflow = '';
    this.trigger?.setAttribute('aria-expanded', 'false');
    this.drawer?.setAttribute('aria-hidden', 'true');
  }

  async addItem(productId, quantity = 1, variantId = null, vehicleId = null) {
    try {
      await apiRequest('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, quantity, variant_id: variantId, vehicle_id: vehicleId }),
      });
      await this.load();
      showToast('Ürün sepete eklendi', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async updateItem(itemId, quantity) {
    try {
      await apiRequest(`/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
      await this.load();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async removeItem(itemId) {
    try {
      await apiRequest(`/cart/items/${itemId}`, { method: 'DELETE' });
      await this.load();
      showToast('Ürün sepetten çıkarıldı', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async applyCoupon(code) {
    try {
      await apiRequest('/cart/coupon', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      await this.load();
      showToast('Kupon uygulandı', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async clear() {
    try {
      await apiRequest('/cart', { method: 'DELETE' });
      await this.load();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  render() {
    if (!this.cart) return;

    const { items, subtotal, discount, shipping, tax, total, free_shipping_remaining, free_shipping_threshold, coupon } = this.cart;
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    // Update count badge
    if (this.countBadge) {
      this.countBadge.textContent = itemCount;
      this.countBadge.style.display = itemCount > 0 ? 'flex' : 'none';
    }

    // Render items
    if (this.itemsContainer) {
      if (items.length === 0) {
        this.itemsContainer.innerHTML = '';
        this.emptyState?.removeAttribute('hidden');
        this.footer?.setAttribute('hidden', '');
      } else {
        this.emptyState?.setAttribute('hidden', '');
        this.footer?.removeAttribute('hidden');
        this.itemsContainer.innerHTML = items.map(item => this.renderItem(item)).join('');
        this.bindItemEvents();
      }
    }

    // Update totals
    if (this.subtotalEl) this.subtotalEl.textContent = formatPrice(subtotal);
    if (this.shippingEl) this.shippingEl.textContent = shipping === 0 ? 'Ücretsiz' : formatPrice(shipping);
    if (this.totalEl) this.totalEl.textContent = formatPrice(total);

    // Update free shipping progress
    const progress = Math.min(100, ((free_shipping_threshold - free_shipping_remaining) / free_shipping_threshold) * 100);
    if (this.progressBar) this.progressBar.style.width = `${progress}%`;
    if (this.remainingText) this.remainingText.textContent = formatPrice(free_shipping_remaining);
  }

  renderItem(item) {
    const { product, quantity, unit_price_snapshot, id } = item;
    const image = product.image || 'https://via.placeholder.com/80';
    const lineTotal = quantity * unit_price_snapshot;

    return `
      <li class="cart-item" data-item-id="${id}">
        <img src="${image}" alt="${product.title}" class="cart-item-image" loading="lazy">
        <div class="cart-item-details">
          <h4 class="cart-item-title">${product.title}</h4>
          <div class="cart-item-meta">
            ${product.brand ? `${product.brand} • ` : ''}
            ${formatPrice(unit_price_snapshot)} x ${quantity} = ${formatPrice(lineTotal)}
          </div>
          <div class="cart-item-controls">
            <button class="quantity-btn btn-decrease" aria-label="Azalt">−</button>
            <input type="number" class="quantity-input" value="${quantity}" min="1" max="100" readonly>
            <button class="quantity-btn btn-increase" aria-label="Artır">+</button>
            <span class="cart-item-price">${formatPrice(lineTotal)}</span>
            <button class="cart-item-remove" aria-label="Kaldır">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </li>
    `;
  }

  bindItemEvents() {
    this.itemsContainer?.querySelectorAll('.cart-item').forEach(itemEl => {
      const itemId = itemEl.dataset.itemId;
      const input = itemEl.querySelector('.quantity-input');

      itemEl.querySelector('.btn-decrease')?.addEventListener('click', () => {
        const newQty = parseInt(input.value) - 1;
        if (newQty >= 1) this.updateItem(itemId, newQty);
      });

      itemEl.querySelector('.btn-increase')?.addEventListener('click', () => {
        const newQty = parseInt(input.value) + 1;
        if (newQty <= 100) this.updateItem(itemId, newQty);
      });

      itemEl.querySelector('.cart-item-remove')?.addEventListener('click', () => {
        this.removeItem(itemId);
      });
    });
  }
}

// =============================================================================
// Vehicle Selector
// =============================================================================

class VehicleSelector {
  constructor() {
    this.selects = {
      brand: document.getElementById('brand-select'),
      model: document.getElementById('model-select'),
      generation: document.getElementById('generation-select'),
      year: document.getElementById('year-select'),
      engine: document.getElementById('engine-select'),
    };
    this.searchBtn = document.getElementById('search-btn');
    this.hint = document.getElementById('selector-hint');
    this.hierarchy = null;
    this.selectedVehicleId = null;

    this.init();
  }

  async init() {
    await this.loadHierarchy();
    this.bindEvents();
  }

  async loadHierarchy() {
    try {
      this.hierarchy = await apiRequest('/fitment/hierarchy');
      this.populateBrands();
    } catch (error) {
      console.error('Hierarchy load error:', error);
      this.hint.textContent = 'Araç verileri yüklenemedi';
    }
  }

  populateBrands() {
    const { brands } = this.hierarchy;
    this.selects.brand.innerHTML = '<option value="">Marka Seçin</option>' +
      brands.map(b => `<option value="${b}">${b}</option>`).join('');
    this.selects.brand.disabled = false;
  }

  populateModels(brand) {
    const { models } = this.hierarchy;
    const modelList = models[brand] || [];
    this.selects.model.innerHTML = '<option value="">Model Seçin</option>' +
      modelList.map(m => `<option value="${m}">${m}</option>`).join('');
    this.selects.model.disabled = false;
    this.resetSelects(['generation', 'year', 'engine']);
  }

  populateGenerations(brand, model) {
    const { generations } = this.hierarchy;
    const key = `${brand}:${model}`;
    const genList = generations[key] || [];
    this.selects.generation.innerHTML = '<option value="">Jenerasyon Seçin</option>' +
      genList.map(g => `<option value="${g}">${g}</option>`).join('');
    this.selects.generation.disabled = genList.length === 0;
    this.resetSelects(['year', 'engine']);
  }

  populateYears(brand, model, generation) {
    const { years } = this.hierarchy;
    const key = `${brand}:${model}`;
    const yearList = years[key] || [];
    this.selects.year.innerHTML = '<option value="">Yıl Seçin</option>' +
      yearList.map(y => `<option value="${y}">${y}</option>`).join('');
    this.selects.year.disabled = yearList.length === 0;
    this.resetSelects(['engine']);
  }

  populateEngines(brand, model, generation, year) {
    const { engines } = this.hierarchy;
    const key = `${brand}:${model}`;
    const engineList = engines[key] || [];
    this.selects.engine.innerHTML = '<option value="">Motor Seçin</option>' +
      engineList.map(e => `<option value="${e}">${e}</option>`).join('');
    this.selects.engine.disabled = engineList.length === 0;
  }

  resetSelects(keys) {
    keys.forEach(key => {
      const select = this.selects[key];
      if (select) {
        const firstOption = select.querySelector('option');
        select.innerHTML = firstOption?.outerHTML || '<option value="">Seçin</option>';
        select.disabled = true;
      }
    });
    this.searchBtn.disabled = true;
    this.selectedVehicleId = null;
  }

  bindEvents() {
    this.selects.brand.addEventListener('change', (e) => {
      this.populateModels(e.target.value);
      this.hint.textContent = e.target.value ? 'Model seçin' : 'Lütfen aracınızı seçin';
    });

    this.selects.model.addEventListener('change', (e) => {
      const brand = this.selects.brand.value;
      this.populateGenerations(brand, e.target.value);
    });

    this.selects.generation.addEventListener('change', (e) => {
      const brand = this.selects.brand.value;
      const model = this.selects.model.value;
      this.populateYears(brand, model, e.target.value);
    });

    this.selects.year.addEventListener('change', (e) => {
      const brand = this.selects.brand.value;
      const model = this.selects.model.value;
      const generation = this.selects.generation.value;
      this.populateEngines(brand, model, generation, e.target.value);
    });

    this.selects.engine.addEventListener('change', async (e) => {
      if (e.target.value) {
        await this.findVehicleId();
      }
    });

    this.searchBtn.addEventListener('click', () => {
      if (this.selectedVehicleId) {
        window.location.href = `/urunler?vehicle=${this.selectedVehicleId}`;
      }
    });
  }

  async findVehicleId() {
    const { brand, model, generation, year, engine } = this.getSelectedValues();
    if (!brand || !model || !year || !engine) return;

    try {
      const response = await apiRequest('/search', {
        method: 'POST',
        body: JSON.stringify({ q: '', brand, model, generation, year, engine }),
      });
      // In a real implementation, the API would return the vehicle ID
      // For now, we'll construct a search URL
      this.hint.textContent = `${brand} ${model} ${generation || ''} ${year} ${engine} seçildi`;
      this.searchBtn.disabled = false;
    } catch (error) {
      console.error('Vehicle ID search error:', error);
    }
  }

  getSelectedValues() {
    return {
      brand: this.selects.brand.value,
      model: this.selects.model.value,
      generation: this.selects.generation.value,
      year: this.selects.year.value,
      engine: this.selects.engine.value,
    };
  }
}

// =============================================================================
// Product Manager
// =============================================================================

class ProductManager {
  constructor() {
    this.grid = document.getElementById('product-grid');
    this.categoryGrid = document.getElementById('category-grid');
    this.products = [];
    this.categories = [];
    this.currentVehicleId = null;
  }

  async init() {
    await this.loadCategories();
    await this.loadProducts();
  }

  async loadCategories() {
    try {
      this.categories = await apiRequest('/categories');
      this.renderCategories();
    } catch (error) {
      console.error('Categories load error:', error);
    }
  }

  async loadProducts(vehicleId = null) {
    this.currentVehicleId = vehicleId;
    try {
      const params = new URLSearchParams({
        limit: '8',
        ...(vehicleId && { vehicle_id: vehicleId }),
      });
      const response = await apiRequest(`/products?${params}`);
      this.products = response.items || response;
      this.renderProducts();
    } catch (error) {
      console.error('Products load error:', error);
    }
  }

  renderCategories() {
    if (!this.categoryGrid) return;

    this.categoryGrid.innerHTML = this.categories.map(cat => `
      <article class="category-card" role="listitem" data-category-id="${cat.id}">
        <div class="category-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${this.getCategoryIcon(cat.name)}
          </svg>
        </div>
        <h3>${cat.name}</h3>
      </article>
    `).join('');

    this.categoryGrid.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', () => {
        const categoryId = card.dataset.categoryId;
        window.location.href = `/urunler?category=${categoryId}`;
      });
    });
  }

  getCategoryIcon(name) {
    const icons = {
      'Fren': '<path d="M12 2v20M17 12H7a2 2 0 0 1 0-4h10a2 2 0 0 1 0 4z"/>',
      'Süspansiyon': '<path d="M12 2v20M17 12H7"/>',
      'Motor': '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
      'Elektrik': '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
      'Karoseri': '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>',
      'Yağ': '<path d="M14 2v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V2"/><path d="M8 2v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V2"/><path d="M4 14v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/>',
    };
    for (const [key, svg] of Object.entries(icons)) {
      if (name.includes(key)) return svg;
    }
    return '<path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>';
  }

  renderProducts() {
    if (!this.grid) return;

    if (this.products.length === 0) {
      this.grid.innerHTML = `
        <div class="no-products" style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--color-text-muted);">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 16px; opacity: 0.4;">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          <p>Bu kriterlere uygun ürün bulunamadı</p>
        </div>
      `;
      return;
    }

    this.grid.innerHTML = this.products.map(product => this.renderProductCard(product)).join('');
    this.bindProductEvents();
  }

  renderProductCard(product) {
    const badges = [];
    if (product.is_featured) badges.push('<span class="product-badge badge-featured">Öne Çıkan</span>');
    if (product.is_universal) badges.push('<span class="product-badge badge-universal">Evrensel</span>');

    const image = product.image || 'https://via.placeholder.com/300x300?text=Ürün+Görseli';
    const hasDiscount = product.list_price_kurus && product.list_price_kurus > product.price_kurus;

    return `
      <article class="product-card" role="listitem" data-product-id="${product.id}">
        <div class="product-image-wrapper">
          <img src="${image}" alt="${product.title}" class="product-image" loading="lazy">
          ${badges.join('')}
        </div>
        <div class="product-content">
          <div class="product-brand">${product.brand || 'Aduva Garaj'}</div>
          <h3 class="product-title">${product.title}</h3>
          <div class="product-price">
            <span class="price-current">${formatPrice(product.price_kurus)}</span>
            ${hasDiscount ? `<span class="price-original">${formatPrice(product.list_price_kurus)}</span>` : ''}
          </div>
          <div class="product-actions">
            <button class="btn btn-primary btn-add-cart" data-product-id="${product.id}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              Sepete Ekle
            </button>
            <button class="btn btn-ghost btn-detail btn-sm" data-product-id="${product.id}">Detay</button>
          </div>
        </div>
      </article>
    `;
  }

  bindProductEvents() {
    this.grid?.querySelectorAll('.btn-add-cart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const productId = e.currentTarget.dataset.productId;
        cartManager.addItem(productId);
      });
    });

    this.grid?.querySelectorAll('.btn-detail').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const productId = e.currentTarget.dataset.productId;
        window.location.href = `/urun/${productId}`;
      });
    });
  }
}

// =============================================================================
// Auth Manager
// =============================================================================

class AuthManager {
  constructor() {
    this.userMenu = document.querySelector('.user-menu');
    this.userTrigger = document.querySelector('.user-trigger');
    this.userDropdown = document.querySelector('.user-dropdown');
    this.logoutBtn = document.querySelector('.btn-logout');
    this.init();
  }

  init() {
    this.userTrigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    document.addEventListener('click', () => this.closeDropdown());

    this.userDropdown?.addEventListener('click', (e) => e.stopPropagation());

    this.logoutBtn?.addEventListener('click', () => this.logout());

    this.checkAuth();
  }

  toggleDropdown() {
    const isOpen = this.userDropdown?.hasAttribute('hidden') === false;
    this.userDropdown?.hidden = isOpen;
    this.userTrigger?.setAttribute('aria-expanded', !isOpen);
  }

  closeDropdown() {
    this.userDropdown?.setAttribute('hidden', '');
    this.userTrigger?.setAttribute('aria-expanded', 'false');
  }

  async checkAuth() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    try {
      const user = await apiRequest('/auth/me');
      this.updateUI(user);
    } catch (error) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }

  updateUI(user) {
    if (user) {
      this.userTrigger.innerHTML = `
        <span style="font-size: 0.875rem; font-weight: 500;">${user.first_name || user.email || 'Kullanıcı'}</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      `;
    }
  }

  logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    window.location.reload();
  }
}

// =============================================================================
// Search Manager
// =============================================================================

class SearchManager {
  constructor() {
    this.init();
  }

  init() {
    // Add search functionality to header if needed
    // For now, we'll use the vehicle selector as primary search
  }
}

// =============================================================================
// Main Application
// =============================================================================

const cartManager = new CartManager();
let vehicleSelector;
let productManager;
let authManager;

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize managers
  vehicleSelector = new VehicleSelector();
  productManager = new ProductManager();
  authManager = new AuthManager();

  await productManager.init();

  // Check URL params for vehicle filter
  const urlParams = new URLSearchParams(window.location.search);
  const vehicleId = urlParams.get('vehicle');
  if (vehicleId) {
    await productManager.loadProducts(vehicleId);
  }

  // Initialize cart token if not exists
  if (!localStorage.getItem(CART_TOKEN_KEY)) {
    localStorage.setItem(CART_TOKEN_KEY, 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
  }

  console.log('Aduva Garaj frontend initialized');
});

// Export for debugging
window.cartManager = cartManager;
window.vehicleSelector = vehicleSelector;
window.productManager = productManager;