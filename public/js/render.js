import { state, getState, subscribe, formatPrice } from './state.js';

/**
 * Format price as Turkish Lira
 */
export function formatPrice(amount) {
  if (amount === undefined || amount === null) return '₺0,00';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Calculate discount percentage
 */
export function calculateDiscount(oldPrice, currentPrice) {
  if (!oldPrice || oldPrice <= currentPrice) return 0;
  return Math.round((oldPrice - currentPrice) / oldPrice * 100);
}

/**
 * Calculate 6-month installment
 */
export function calculateInstallment(price) {
  if (!price) return 0;
  return Math.round((price / 6) * 100) / 100;
}

/**
 * Format installment display
 */
export function formatInstallment(price) {
  const installment = calculateInstallment(price);
  return `6 x ${formatPrice(installment)}`;
}

/**
 * Get badge HTML for product
 */
export function getProductBadges(product) {
  const badges = [];

  // Discount badge
  const discount = calculateDiscount(product.old_price, product.price);
  if (discount > 0) {
    badges.push(`
      <span class="badge badge--discount">%${discount}</span>
    `);
  }

  // Compatibility badge
  if (product.badge_type) {
    badges.push(`
      <span class="badge badge--compat">✓ ${product.badge_type}</span>
    `);
  }

  // Free shipping badge
  if (product.free_shipping) {
    badges.push(`
      <span class="badge badge--free-shipping">Kargo Bedava</span>
    `);
  }

  return badges.join('');
}

/**
 * Get bottom badges HTML
 */
export function getBottomBadges(product) {
  const badges = [];

  if (product.badge_type) {
    badges.push(`
      <span class="badge badge--compat">✓ ${product.badge_type}</span>
    `);
  }

  if (product.free_shipping) {
    badges.push(`
      <span class="badge badge--free-shipping">Kargo Bedava</span>
    `);
  }

  return badges.join('');
}

/**
 * Render a single product card
 */
export function renderProductCard(product) {
  const discount = calculateDiscount(product.old_price, product.price);
  const inStock = product.stock > 0;
  const imageUrl = product.image || 'img/placeholder.svg';

  return `
    <article class="product-card" data-product-id="${product.id}" data-sku="${product.sku}">
      <div class="product-card__image-wrapper">
        <img
          class="product-card__image"
          src="${imageUrl}"
          alt="${product.title}"
          loading="lazy"
          onerror="this.src='img/placeholder.svg'"
        >
        <div class="product-card__badges">
          ${getProductBadges(product)}
        </div>
        <div class="product-card__actions">
          <button
            class="product-card__icon-btn product-card__icon-btn--wishlist ${state.wishlist.some(w => w.product_id === product.id) ? 'active' : ''}"
            data-action="wishlist"
            data-product-id="${product.id}"
            aria-label="Favorilere ekle"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </button>
          <button
            class="product-card__icon-btn"
            data-action="compare"
            data-product-id="${product.id}"
            aria-label="Karşılaştır"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 16 12 12 6 8"></polyline><polyline points="6 16 12 12 18 8"></polyline></svg>
          </button>
        </div>
        <div class="product-card__bottom-badges">
          ${getBottomBadges(product)}
        </div>
      </div>
      <div class="product-card__body">
        <div class="product-card__brand-row">
          <span class="product-card__brand">${product.brand?.name || ''}</span>
          <span class="product-card__sku">Stok: ${product.sku}</span>
        </div>
        <h3 class="product-card__title">${product.title}</h3>
        <div class="product-card__rating">
          <div class="product-card__stars">
            <span>★</span> ${product.rating?.toFixed(1) || '0.0'}
            <span class="product-card__reviews">(${product.review_count || 0})</span>
          </div>
          <span class="product-card__stock ${inStock ? 'product-card__stock--in' : 'product-card__stock--out'}">
            <span class="product-card__stock-dot"></span>
            ${inStock ? 'Stokta' : 'Tükendi'}
          </span>
        </div>
        <div class="product-card__divider"></div>
        <div class="product-card__price-row">
          <div class="product-card__prices">
            ${product.old_price && product.old_price > product.price ? `
              <span class="product-card__old-price">${formatPrice(product.old_price)}</span>
            ` : ''}
            <span class="product-card__current-price">${formatPrice(product.price)}</span>
          </div>
          <div class="product-card__price-meta">
            <span class="product-card__vat">KDV DAHİL</span>
            <span class="product-card__installment">${formatInstallment(product.price)}</span>
          </div>
        </div>
        <div class="product-card__actions-row">
          <div class="quantity-stepper" data-product-id="${product.id}">
            <button class="quantity-stepper__btn" data-action="decrease" aria-label="Azalt">−</button>
            <input
              type="number"
              class="quantity-stepper__input"
              value="1"
              min="1"
              max="${product.stock}"
              readonly
              aria-label="Adet"
            >
            <button class="quantity-stepper__btn" data-action="increase" aria-label="Artır">+</button>
          </div>
          <button
            class="btn--add-to-cart"
            data-action="add-to-cart"
            data-product-id="${product.id}"
            ${!inStock ? 'disabled' : ''}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1 4 4v4"></path></svg>
            Sepete Ekle
          </button>
          <button
            class="btn--detail"
            data-action="detail"
            data-product-id="${product.id}"
          >
            Detay
          </button>
        </div>
      </div>
    </article>
  `;
}

/**
 * Render product skeleton cards
 */
export function renderProductSkeletons(count = 12) {
  return Array(count).fill(0).map(() => `
    <article class="product-card product-card--skeleton">
      <div class="product-card__image-wrapper skeleton"></div>
      <div class="product-card__body">
        <div class="skeleton" style="width: 60%; height: 12px;"></div>
        <div class="skeleton" style="width: 80%; height: 20px;"></div>
        <div class="skeleton" style="width: 50%; height: 12px;"></div>
        <div class="skeleton" style="width: 100%; height: 24px;"></div>
      </div>
    </article>
  `).join('');
}

/**
 * Render product grid
 */
export function renderProductGrid(products) {
  const container = document.getElementById('product-grid');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `
      <div class="no-products" style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; color: var(--text-muted);">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 1rem; opacity: 0.5;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <h3 style="margin-bottom: 0.5rem; color: var(--text-secondary);">Ürün bulunamadı</h3>
        <p>Filtrelerinizi değiştirip tekrar deneyin.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(renderProductCard).join('');
}

/**
 * Render category tree in sidebar
 */
export function renderCategoryTree(categories, selectedSlug) {
  const container = document.getElementById('category-tree');
  if (!container) return;

  const allCount = categories.reduce((sum, c) => sum + (c.product_count || 0), 0);

  const items = [
    {
      slug: 'all',
      name: 'Tüm Ürünler',
      icon: '📦',
      count: allCount
    },
    ...categories.map(c => ({
      slug: c.slug,
      name: c.name,
      icon: c.icon,
      count: c.product_count || 0
    }))
  ];

  container.innerHTML = items.map(cat => `
    <button
      class="category-tree__item ${cat.slug === selectedSlug ? 'category-tree__item--active' : ''}"
      data-category="${cat.slug}"
      aria-pressed="${cat.slug === selectedSlug}"
    >
      <span class="category-tree__label">
        <span>${cat.icon}</span>
        ${cat.name}
      </span>
      <span class="category-tree__count">${cat.count}</span>
    </button>
  `).join('');
}

/**
 * Render brand filters in sidebar
 */
export function renderBrandFilters(brands) {
  const container = document.getElementById('brand-filters');
  if (!container) return;

  container.innerHTML = brands.map(brand => `
    <label class="brand-filter">
      <input
        type="checkbox"
        value="${brand.slug}"
        ${state.selectedBrands.includes(brand.slug) ? 'checked' : ''}
        data-brand="${brand.slug}"
      >
      <span class="brand-filter__label">
        ${brand.name}
        <span class="brand-filter__count">${brand.product_count || 0}</span>
      </span>
    </label>
  `).join('');
}

/**
 * Render price range chips
 */
export function renderPriceChips() {
  const container = document.getElementById('price-chips');
  if (!container) return;

  const chips = [
    { label: '0 - 1.000 ₺', min: 0, max: 1000 },
    { label: '1.000 - 3.500 ₺', min: 1000, max: 3500 },
    { label: '3.500 ₺ +', min: 3500, max: null }
  ];

  container.innerHTML = chips.map(chip => `
    <button
      class="price-range__chip ${state.priceRange.min === chip.min && state.priceRange.max === chip.max ? 'price-range__chip--active' : ''}"
      data-min="${chip.min}"
      data-max="${chip.max ?? ''}"
    >
      ${chip.label}
    </button>
  `).join('');
}

/**
 * Render vehicle wizard steps
 */
export function renderWizardStep(step) {
  const makeSelect = document.getElementById('wizard-make');
  const modelSelect = document.getElementById('wizard-model');
  const yearSelect = document.getElementById('wizard-year');
  const engineSelect = document.getElementById('wizard-engine');

  if (makeSelect && step.makes) {
    makeSelect.innerHTML = '<option value="">Marka Seçin</option>' +
      step.makes.map(m => `<option value="${m}" ${state.wizard.selected.make === m ? 'selected' : ''}>${m}</option>`).join('');
    makeSelect.disabled = false;
  }

  if (modelSelect) {
    if (step.models && step.models.length > 0) {
      modelSelect.innerHTML = '<option value="">Model Seçin</option>' +
        step.models.map(m => `<option value="${m}" ${state.wizard.selected.model === m ? 'selected' : ''}>${m}</option>`).join('');
      modelSelect.disabled = false;
    } else {
      modelSelect.innerHTML = '<option value="">Önce marka seçin</option>';
      modelSelect.disabled = true;
    }
  }

  if (yearSelect) {
    if (step.years && step.years.length > 0) {
      yearSelect.innerHTML = '<option value="">Yıl Seçin</option>' +
        step.years.map(y => `<option value="${y}" ${state.wizard.selected.year === String(y) ? 'selected' : ''}>${y}</option>`).join('');
      yearSelect.disabled = false;
    } else {
      yearSelect.innerHTML = '<option value="">Önce model seçin</option>';
      yearSelect.disabled = true;
    }
  }

  if (engineSelect) {
    if (step.engines && step.engines.length > 0) {
      engineSelect.innerHTML = '<option value="">Motor/Yakıt Seçin</option>' +
        step.engines.map(e => `<option value="${e}" ${state.wizard.selected.engine === e ? 'selected' : ''}>${e}</option>`).join('');
      engineSelect.disabled = false;
    } else {
      engineSelect.innerHTML = '<option value="">Önce yıl seçin</option>';
      engineSelect.disabled = true;
    }
  }
}

/**
 * Render selected vehicle in sidebar
 */
export function renderSelectedVehicle() {
  const container = document.getElementById('selected-vehicle');
  const emptyContainer = document.getElementById('no-vehicle-selected');

  if (!container || !emptyContainer) return;

  const { make, model, year, engine } = state.wizard.selected;

  if (make && model && year) {
    emptyContainer.style.display = 'none';
    container.style.display = 'flex';
    container.innerHTML = `
      <div class="sidebar__vehicle-info">
        <span class="sidebar__vehicle-name">${make} ${model}</span>
        <span class="sidebar__vehicle-spec">${year}${engine ? ` • ${engine}` : ''}</span>
      </div>
      <button class="btn--remove-vehicle" data-action="remove-vehicle">Aracı Kaldır</button>
    `;
  } else {
    emptyContainer.style.display = 'block';
    container.style.display = 'none';
  }
}

/**
 * Render cart summary in header
 */
export function renderCartSummary() {
  const cartEl = document.getElementById('header-cart');
  const badgeEl = document.getElementById('cart-badge');
  const labelEl = document.getElementById('cart-label');

  if (!cartEl) return;

  const itemCount = state.cart.itemCount || 0;
  const total = state.cart.total || 0;
  const userName = state.user?.name ? `(${state.user.name.split(' ')[0]})` : '(MİSAFİR)';

  if (labelEl) {
    labelEl.textContent = `SEPETİM ${userName}`;
  }

  if (badgeEl) {
    badgeEl.textContent = itemCount;
    badgeEl.style.display = itemCount > 0 ? 'flex' : 'none';
  }
}

/**
 * Render countdown timer
 */
export function renderCountdown(countdown) {
  const container = document.getElementById('countdown');
  if (!container) return;

  container.innerHTML = `
    <span>${String(countdown.hours).padStart(2, '0')}</span>
    <span class="countdown-sep">:</span>
    <span>${String(countdown.minutes).padStart(2, '0')}</span>
    <span class="countdown-sep">:</span>
    <span>${String(countdown.seconds).padStart(2, '0')}</span>
  `;
}

/**
 * Render toasts
 */
export function renderToasts() {
  const container = document.getElementById('toast-container');
  if (!container) return;

  container.innerHTML = state.toasts.map(toast => `
    <div class="toast toast--${toast.type}" data-toast-id="${toast.id}" role="alert" aria-live="polite">
      <span class="toast__message">${toast.message}</span>
      <button class="toast__close" data-action="close-toast" data-toast-id="${toast.id}" aria-label="Kapat">✕</button>
    </div>
  `).join('');
}

/**
 * Render user menu in header
 */
export function renderUserMenu() {
  const loginBtn = document.getElementById('header-login');
  const userMenu = document.getElementById('header-user-menu');
  const userNameEl = document.getElementById('user-name');

  if (state.isAuthenticated && state.user) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (userMenu) userMenu.style.display = 'flex';
    if (userNameEl) userNameEl.textContent = state.user.name;
  } else {
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (userMenu) userMenu.style.display = 'none';
  }
}

/**
 * Render wishlist buttons state
 */
export function renderWishlistButtons() {
  document.querySelectorAll('.product-card__icon-btn--wishlist').forEach(btn => {
    const productId = parseInt(btn.dataset.productId, 10);
    const isInWishlist = state.wishlist.some(w => w.product_id === productId);
    btn.classList.toggle('active', isInWishlist);
  });
}

/**
 * Render admin panel
 */
export function renderAdminPanel(orders) {
  const container = document.getElementById('admin-orders-table');
  if (!container) return;

  container.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Sipariş No</th>
          <th>Tarih</th>
          <th>Müşteri</th>
          <th>Durum</th>
          <th>Toplam</th>
          <th>Kargo Takip</th>
          <th>İşlemler</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(order => `
          <tr data-order-id="${order.id}">
            <td>#${order.id}</td>
            <td>${new Date(order.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
            <td>${order.user?.name || '-'}</td>
            <td><span class="admin-badge admin-badge--${order.status}">${order.status}</span></td>
            <td>${formatPrice(order.total)}</td>
            <td>${order.tracking_number || '-'}</td>
            <td>
              <button class="btn--icon" data-action="edit-order" data-order-id="${order.id}" aria-label="Düzenle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

export { formatPrice, calculateDiscount, calculateInstallment, formatInstallment };
