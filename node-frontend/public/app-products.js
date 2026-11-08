/**
 * Aduva Garaj - Products Page
 */

const API_BASE = '/v1';

function formatPrice(kurus) {
  const tl = (kurus / 100).toFixed(2);
  return `₺${tl.replace('.', ',')}`;
}

async function apiRequest(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const cartToken = localStorage.getItem('aduvagaraj_cart_token');
  if (cartToken) headers['X-Cart-Token'] = cartToken;
  const authToken = localStorage.getItem('aduvagaraj_auth_token');
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Bir hata oluştu' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `<span>${message}</span><button class="toast-close">&times;</button>`;
  container.appendChild(toast);
  toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
  setTimeout(() => toast.remove(), 4000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:400;display:flex;flex-direction:column;gap:8px;';
  document.body.appendChild(container);
  return container;
}

class ProductsPage {
  constructor() {
    this.grid = document.getElementById('product-grid');
    this.pagination = document.getElementById('pagination');
    this.resultsCount = document.getElementById('results-count');
    this.categoryFilters = document.getElementById('category-filters');
    this.sortSelect = document.getElementById('sort-select');
    this.clearFiltersBtn = document.getElementById('clear-filters');
    this.priceMin = document.getElementById('price-min');
    this.priceMax = document.getElementById('price-max');
    this.priceMinLabel = document.getElementById('price-min-label');
    this.priceMaxLabel = document.getElementById('price-max-label');
    this.inStockOnly = document.getElementById('in-stock-only');

    this.products = [];
    this.categories = [];
    this.currentPage = 1;
    this.totalPages = 1;
    this.filters = {
      category: null,
      vehicle_id: null,
      price_min: 0,
      price_max: 500000,
      in_stock_only: false,
      sort: 'newest',
      page: 1,
      limit: 20,
    };

    this.init();
  }

  async init() {
    await this.loadCategories();
    this.bindEvents();
    this.applyUrlParams();
    await this.loadProducts();
  }

  applyUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('category')) this.filters.category = params.get('category');
    if (params.get('vehicle')) this.filters.vehicle_id = params.get('vehicle');
    if (params.get('page')) this.filters.page = parseInt(params.get('page'));
    this.currentPage = this.filters.page;
  }

  async loadCategories() {
    try {
      this.categories = await apiRequest('/categories');
      this.renderCategoryFilters();
    } catch (error) {
      console.error('Categories load error:', error);
    }
  }

  renderCategoryFilters() {
    if (!this.categoryFilters) return;
    this.categoryFilters.innerHTML = this.categories.map(cat => `
      <li>
        <label class="checkbox-label">
          <input type="checkbox" name="category" value="${cat.id}" ${this.filters.category === cat.id ? 'checked' : ''}>
          <span>${cat.name}</span>
        </label>
      </li>
    `).join('');
  }

  bindEvents() {
    // Category filters
    this.categoryFilters?.addEventListener('change', (e) => {
      if (e.target.matches('input[name="category"]')) {
        this.filters.category = e.target.checked ? e.target.value : null;
        this.filters.page = 1;
        this.loadProducts();
        this.updateUrl();
      }
    });

    // Sort
    this.sortSelect?.addEventListener('change', (e) => {
      this.filters.sort = e.target.value;
      this.loadProducts();
    });

    // Price range
    this.priceMin?.addEventListener('input', debounce(() => {
      this.filters.price_min = parseInt(this.priceMin.value);
      this.priceMinLabel.textContent = formatPrice(this.filters.price_min);
      this.loadProducts();
    }, 300));

    this.priceMax?.addEventListener('input', debounce(() => {
      this.filters.price_max = parseInt(this.priceMax.value);
      this.priceMaxLabel.textContent = formatPrice(this.filters.price_max);
      this.loadProducts();
    }, 300));

    // In stock only
    this.inStockOnly?.addEventListener('change', (e) => {
      this.filters.in_stock_only = e.target.checked;
      this.loadProducts();
    });

    // Clear filters
    this.clearFiltersBtn?.addEventListener('click', () => {
      this.filters = {
        category: null,
        vehicle_id: null,
        price_min: 0,
        price_max: 500000,
        in_stock_only: false,
        sort: 'newest',
        page: 1,
        limit: 20,
      };
      this.resetForm();
      this.loadProducts();
      this.updateUrl();
    });

    // Pagination
    this.pagination?.addEventListener('click', (e) => {
      const pageBtn = e.target.closest('[data-page]');
      if (pageBtn) {
        this.filters.page = parseInt(pageBtn.dataset.page);
        this.loadProducts();
        this.updateUrl();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  resetForm() {
    this.categoryFilters?.querySelectorAll('input').forEach(i => i.checked = false);
    this.priceMin.value = 0;
    this.priceMax.value = 500000;
    this.priceMinLabel.textContent = '₺0';
    this.priceMaxLabel.textContent = '₺5.000,00';
    this.inStockOnly.checked = false;
    this.sortSelect.value = 'newest';
  }

  updateUrl() {
    const params = new URLSearchParams();
    if (this.filters.category) params.set('category', this.filters.category);
    if (this.filters.vehicle_id) params.set('vehicle', this.filters.vehicle_id);
    if (this.filters.page > 1) params.set('page', this.filters.page);
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
  }

  async loadProducts() {
    try {
      const params = new URLSearchParams();
      Object.entries(this.filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) params.set(key, value);
      });

      const response = await apiRequest(`/products?${params}`);
      this.products = response.items || response;
      this.totalPages = Math.ceil((response.total || this.products.length) / this.filters.limit);
      this.renderProducts();
      this.renderPagination();
      this.updateResultsCount(response.total || this.products.length);
    } catch (error) {
      console.error('Products load error:', error);
      showToast('Ürünler yüklenemedi', 'error');
    }
  }

  renderProducts() {
    if (!this.grid) return;

    if (this.products.length === 0) {
      this.grid.innerHTML = `
        <div class="no-products" style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--color-text-muted);">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 16px; opacity: 0.4;">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          <p>Kriterlerinize uygun ürün bulunamadı</p>
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
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              Sepete Ekle
            </button>
            <a href="/urun/${product.id}" class="btn btn-ghost btn-detail btn-sm">Detay</a>
          </div>
        </div>
      </article>
    `;
  }

  bindProductEvents() {
    this.grid?.querySelectorAll('.btn-add-cart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const productId = e.currentTarget.dataset.productId;
        this.addToCart(productId);
      });
    });
  }

  async addToCart(productId) {
    try {
      await apiRequest('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, quantity: 1 }),
      });
      showToast('Ürün sepete eklendi', 'success');
      // Update cart count in header
      const cartCount = document.querySelector('.cart-count');
      if (cartCount) {
        const count = parseInt(cartCount.textContent) + 1;
        cartCount.textContent = count;
        cartCount.style.display = 'flex';
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  renderPagination() {
    if (!this.pagination || this.totalPages <= 1) {
      if (this.pagination) this.pagination.innerHTML = '';
      return;
    }

    let html = '';
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);

    if (this.currentPage > 1) {
      html += `<button data-page="${this.currentPage - 1}" aria-label="Önceki">&laquo;</button>`;
    }

    for (let i = start; i <= end; i++) {
      html += `<button data-page="${i}" ${i === this.currentPage ? 'class="active" aria-current="page"' : ''}>${i}</button>`;
    }

    if (this.currentPage < this.totalPages) {
      html += `<button data-page="${this.currentPage + 1}" aria-label="Sonraki">&raquo;</button>`;
    }

    this.pagination.innerHTML = html;
  }

  updateResultsCount(total) {
    if (this.resultsCount) {
      this.resultsCount.textContent = `${total} ürün bulundu`;
    }
  }
}

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

document.addEventListener('DOMContentLoaded', () => {
  new ProductsPage();
});