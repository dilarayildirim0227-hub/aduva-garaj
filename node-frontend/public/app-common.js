/**
 * Aduva Garaj - Common Page Scripts
 */

const API_BASE = '/v1';

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

function formatPrice(kurus) {
  const tl = (kurus / 100).toFixed(2);
  return `₺${tl.replace('.', ',')}`;
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

function initHeader() {
  // Cart drawer
  const cartTrigger = document.querySelector('.cart-trigger');
  const cartDrawer = document.getElementById('cart-drawer');
  const cartOverlay = document.querySelector('.cart-overlay');
  const cartClose = document.querySelector('.cart-close');

  if (cartTrigger && cartDrawer) {
    cartTrigger.addEventListener('click', () => {
      const isOpen = cartDrawer.getAttribute('aria-hidden') === 'false';
      cartDrawer.setAttribute('aria-hidden', isOpen);
      cartTrigger.setAttribute('aria-expanded', !isOpen);
      cartOverlay.hidden = isOpen;
      if (!isOpen) loadCartDrawer();
    });
  }

  if (cartClose) {
    cartClose.addEventListener('click', () => {
      cartDrawer.setAttribute('aria-hidden', 'true');
      cartTrigger.setAttribute('aria-expanded', 'false');
      cartOverlay.hidden = true;
    });
  }

  if (cartOverlay) {
    cartOverlay.addEventListener('click', () => {
      cartDrawer.setAttribute('aria-hidden', 'true');
      cartTrigger.setAttribute('aria-expanded', 'false');
      cartOverlay.hidden = true;
    });
  }

  // User dropdown
  const userTrigger = document.querySelector('.user-trigger');
  const userDropdown = document.querySelector('.user-dropdown');

  if (userTrigger && userDropdown) {
    userTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = userDropdown.hidden;
      userDropdown.hidden = !isOpen;
      userTrigger.setAttribute('aria-expanded', isOpen);
    });

    document.addEventListener('click', (e) => {
      if (!userTrigger.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.hidden = true;
        userTrigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Logout buttons
  document.querySelectorAll('.btn-logout').forEach(btn => {
    btn.addEventListener('click', () => {
      localStorage.removeItem('aduvagaraj_auth_token');
      localStorage.removeItem('aduvagaraj_refresh_token');
      showToast('Çıkış yapıldı', 'success');
      setTimeout(() => window.location.href = '/', 500);
    });
  });

  // Update cart count
  updateCartCount();

  // Highlight active nav
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });
}

async function loadCartDrawer() {
  const cartItems = document.querySelector('.cart-items');
  const cartEmpty = document.querySelector('.cart-empty');
  const cartFooter = document.querySelector('.cart-footer');
  const cartSubtotal = document.querySelector('.cart-summary .subtotal');
  const cartShipping = document.querySelector('.cart-summary .shipping');
  const cartTotal = document.querySelector('.cart-summary .total');
  const freeShippingProgress = document.querySelector('.free-shipping-progress');
  const freeShippingRemaining = document.querySelector('.free-shipping-text .remaining');

  if (!cartItems) return;

  try {
    const cart = await apiRequest('/cart');
    const items = cart?.items || [];

    if (items.length === 0) {
      cartEmpty.hidden = false;
      cartItems.innerHTML = '';
      cartFooter.hidden = true;
      return;
    }

    cartEmpty.hidden = true;
    cartFooter.hidden = false;

    cartItems.innerHTML = items.map(item => `
      <li class="cart-item" role="listitem">
        <img src="${item.image || 'https://via.placeholder.com/60x60'}" alt="${item.title}" class="cart-item-image" loading="lazy">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.title}</div>
          <div class="cart-item-meta">${item.brand || 'Aduva Garaj'} × ${item.quantity}</div>
        </div>
        <div class="cart-item-price">${formatPrice(item.price_kurus * item.quantity)}</div>
        <button class="cart-item-remove" data-item-id="${item.id}" aria-label="${item.title} ürününü sepetten çıkar">&times;</button>
      </li>
    `).join('');

    // Bind remove events
    cartItems.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const itemId = e.currentTarget.dataset.itemId;
        try {
          await apiRequest(`/cart/items/${itemId}`, { method: 'DELETE' });
          showToast('Ürün çıkarıldı', 'success');
          loadCartDrawer();
          updateCartCount();
        } catch (error) {
          showToast(error.message, 'error');
        }
      });
    });

    // Update summary
    const subtotal = items.reduce((sum, item) => sum + item.price_kurus * item.quantity, 0);
    const shipping = subtotal >= 75000 ? 0 : 2990;
    const total = subtotal + shipping;

    if (cartSubtotal) cartSubtotal.textContent = formatPrice(subtotal);
    if (cartShipping) cartShipping.textContent = shipping === 0 ? 'Ücretsiz' : formatPrice(shipping);
    if (cartTotal) cartTotal.textContent = formatPrice(total);

    if (freeShippingProgress) {
      const progress = Math.min(100, (subtotal / 75000) * 100);
      freeShippingProgress.style.width = `${progress}%`;
    }
    if (freeShippingRemaining) {
      if (subtotal >= 75000) {
        freeShippingRemaining.textContent = '₺0,00';
        freeShippingRemaining.parentElement.innerHTML = 'Ücretsiz kargo kazandınız! 🎉';
      } else {
        freeShippingRemaining.textContent = formatPrice(75000 - subtotal);
      }
    }
  } catch (error) {
    console.error('Cart drawer load error:', error);
  }
}

function updateCartCount() {
  const cartCount = document.querySelector('.cart-count');
  if (!cartCount) return;

  // Try to get from localStorage first (for guest cart)
  const cartToken = localStorage.getItem('aduvagaraj_cart_token');
  if (cartToken) {
    // We'll update from API when cart drawer opens
    cartCount.textContent = '…';
    cartCount.style.display = 'flex';
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initHeader);

// Export for other modules
window.aduvagaraj = {
  apiRequest,
  formatPrice,
  showToast,
  loadCartDrawer,
  updateCartCount,
};