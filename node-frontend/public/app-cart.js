/**
 * Aduva Garaj - Cart Page
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

function parsePrice(priceStr) {
  return parseInt(priceStr.replace(/[₺.,]/g, '').replace(',', '')) * 100;
}

class CartPage {
  constructor() {
    this.cartBody = document.getElementById('cart-body');
    this.cartEmptyState = document.getElementById('cart-empty-state');
    this.cartTable = document.querySelector('.cart-table');
    this.summarySubtotal = document.getElementById('summary-subtotal');
    this.summaryShipping = document.getElementById('summary-shipping');
    this.summaryTotal = document.getElementById('summary-total');
    this.freeShippingProgress = document.getElementById('free-shipping-progress');
    this.freeShippingRemaining = document.getElementById('free-shipping-remaining');
    this.checkoutBtn = document.getElementById('checkout-btn');

    this.cart = null;
    this.freeShippingThreshold = 75000; // 750 TL in kurus

    this.init();
  }

  async init() {
    await this.loadCart();
    this.bindEvents();
  }

  async loadCart() {
    try {
      this.cart = await apiRequest('/cart');
      this.renderCart();
    } catch (error) {
      console.error('Cart load error:', error);
      showToast('Sepet yüklenemedi', 'error');
    }
  }

  renderCart() {
    const items = this.cart?.items || [];

    if (items.length === 0) {
      this.showEmptyState();
      return;
    }

    this.showCartTable();

    this.cartBody.innerHTML = items.map(item => this.renderCartItem(item)).join('');
    this.bindItemEvents();
    this.updateSummary();
  }

  showEmptyState() {
    this.cartEmptyState.hidden = false;
    this.cartTable.hidden = true;
    this.checkoutBtn.style.pointerEvents = 'none';
    this.checkoutBtn.style.opacity = '0.5';
    this.updateSummary();
  }

  showCartTable() {
    this.cartEmptyState.hidden = true;
    this.cartTable.hidden = false;
    this.checkoutBtn.style.pointerEvents = 'auto';
    this.checkoutBtn.style.opacity = '1';
  }

  renderCartItem(item) {
    const image = item.image || 'https://via.placeholder.com/80x80?text=Ürün';
    const lineTotal = item.price_kurus * item.quantity;
    const maxQuantity = item.max_per_order || 100;

    return `
      <div class="cart-row" role="row" data-item-id="${item.id}" data-product-id="${item.product_id}">
        <div class="cart-col product" role="cell">
          <div class="cart-product">
            <img src="${image}" alt="${item.title}" class="cart-product-image" loading="lazy">
            <div class="cart-product-info">
              <div class="cart-product-brand">${item.brand || 'Aduva Garaj'}</div>
              <h4 class="cart-product-title">${item.title}</h4>
              <div class="cart-product-meta">
                <span>SKU: ${item.seller_code}</span>
                ${item.oem_code ? `<span>OEM: ${item.oem_code}</span>` : ''}
              </div>
              <p class="cart-product-stock ${item.stock > 0 ? 'in-stock' : 'out-of-stock'}">
                ${item.stock > 0 ? `Stokta: ${item.stock} adet` : 'Stokta yok'}
              </p>
            </div>
          </div>
        </div>
        <div class="cart-col price" role="cell">
          <span class="cart-item-price">${formatPrice(item.price_kurus)}</span>
          ${item.list_price_kurus && item.list_price_kurus > item.price_kurus
            ? `<span class="cart-item-original">${formatPrice(item.list_price_kurus)}</span>`
            : ''}
        </div>
        <div class="cart-col quantity" role="cell">
          <div class="quantity-selector-inline">
            <button class="quantity-btn qty-decrease" aria-label="Azalt" ${item.quantity <= 1 ? 'disabled' : ''}>−</button>
            <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="${maxQuantity}" aria-label="Miktar">
            <button class="quantity-btn qty-increase" aria-label="Artır" ${item.quantity >= maxQuantity ? 'disabled' : ''}>+</button>
          </div>
        </div>
        <div class="cart-col total" role="cell">
          <span class="cart-line-total">${formatPrice(lineTotal)}</span>
        </div>
        <div class="cart-col actions" role="cell">
          <button class="btn btn-ghost btn-sm btn-remove" aria-label="Ürünü sepetten çıkar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  bindItemEvents() {
    // Quantity decrease
    this.cartBody.querySelectorAll('.qty-decrease').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const row = e.currentTarget.closest('.cart-row');
        const input = row.querySelector('.quantity-input');
        const newValue = parseInt(input.value) - 1;
        if (newValue >= 1) {
          input.value = newValue;
          this.updateQuantity(row.dataset.itemId, newValue);
        }
      });
    });

    // Quantity increase
    this.cartBody.querySelectorAll('.qty-increase').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const row = e.currentTarget.closest('.cart-row');
        const input = row.querySelector('.quantity-input');
        const max = parseInt(input.max);
        const newValue = parseInt(input.value) + 1;
        if (newValue <= max) {
          input.value = newValue;
          this.updateQuantity(row.dataset.itemId, newValue);
        }
      });
    });

    // Quantity input change
    this.cartBody.querySelectorAll('.quantity-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const row = e.currentTarget.closest('.cart-row');
        const value = Math.max(1, Math.min(parseInt(e.currentTarget.value) || 1, parseInt(e.currentTarget.max)));
        e.currentTarget.value = value;
        this.updateQuantity(row.dataset.itemId, value);
      });
    });

    // Remove item
    this.cartBody.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const row = e.currentTarget.closest('.cart-row');
        this.removeItem(row.dataset.itemId);
      });
    });
  }

  async updateQuantity(itemId, quantity) {
    try {
      await apiRequest(`/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
      await this.loadCart();
      showToast('Sepet güncellendi', 'success');
    } catch (error) {
      showToast(error.message, 'error');
      await this.loadCart(); // Revert to server state
    }
  }

  async removeItem(itemId) {
    if (!confirm('Bu ürünü sepetten çıkarmak istediğinizden emin misiniz?')) return;

    try {
      await apiRequest(`/cart/items/${itemId}`, { method: 'DELETE' });
      await this.loadCart();
      showToast('Ürün sepetten çıkarıldı', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  updateSummary() {
    const items = this.cart?.items || [];
    const subtotal = items.reduce((sum, item) => sum + item.price_kurus * item.quantity, 0);

    // Shipping: free over threshold, otherwise 29.90 TL
    const shipping = subtotal >= this.freeShippingThreshold ? 0 : 2990;
    const total = subtotal + shipping;

    this.summarySubtotal.textContent = formatPrice(subtotal);
    this.summaryShipping.textContent = shipping === 0 ? 'Ücretsiz' : formatPrice(shipping);
    this.summaryTotal.textContent = formatPrice(total);

    // Free shipping progress
    const progress = Math.min(100, (subtotal / this.freeShippingThreshold) * 100);
    this.freeShippingProgress.style.width = `${progress}%`;

    if (subtotal >= this.freeShippingThreshold) {
      this.freeShippingRemaining.textContent = '₺0,00';
      this.freeShippingRemaining.parentElement.innerHTML = 'Ücretsiz kargo kazandınız! 🎉';
    } else {
      const remaining = this.freeShippingThreshold - subtotal;
      this.freeShippingRemaining.textContent = formatPrice(remaining);
    }

    // Update header cart count
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
      cartCount.textContent = totalItems;
      cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
  }

  bindEvents() {
    // Checkout button
    this.checkoutBtn?.addEventListener('click', (e) => {
      const items = this.cart?.items || [];
      if (items.length === 0) {
        e.preventDefault();
        showToast('Sepetiniz boş', 'warning');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new CartPage();
});