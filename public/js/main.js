/**
 * Main Application Entry Point
 */
import api from './api.js';
import { state, subscribe, setState, getState, startCountdown, stopCountdown, getTheme, setTheme } from './state.js';
import {
  renderProductGrid,
  renderCategoryTree,
  renderBrandFilters,
  renderPriceChips,
  renderWizardStep,
  renderSelectedVehicle,
  renderCartSummary,
  renderCountdown,
  renderToasts,
  renderUserMenu,
  renderWishlistButtons,
  renderProductSkeletons,
  formatPrice
 } from './render.js';
import { initCart } from './cart.js';
import { initAuth } from './auth.js';
import { initFilters } from './filters.js';
import { initTheme } from './theme.js';
import { initToasts } from './toast.js';
import { initCountdown } from './countdown.js';

// DOM Elements
const elements = {
  // Search
  searchForm: null,
  searchInput: null,
  searchBtn: null,

  // Category bar
  categoryTree: null,
  catBarItems: null,

  // Vehicle wizard
  wizardMake: null,
  wizardModel: null,
  wizardYear: null,
  wizardEngine: null,

  // Sidebar
  categoryTreeContainer: null,
  brandFiltersContainer: null,
  priceChipsContainer: null,
  selectedVehicleContainer: null,
  noVehicleContainer: null,
  removeVehicleBtn: null,

  // Product grid
  productGrid: null,
  productCount: null,
  sortSelect: null,

  // Modals
  loginModal: null,
  loginBtn: null,
  adminBtn: null,
  modalClose: null,
  modalTabs: null,
  modalPanels: null,

  // Cart drawer
  cartDrawer: null,
  cartToggle: null,
  cartClose: null,
  cartOverlay: null,

  // Mobile sidebar
  sidebarToggle: null,
  sidebarOverlay: null,

  // Theme
  themeToggle: null,

  // Toast container
  toastContainer: null,

  // Countdown
  countdownEl: null
};

// Initialize all DOM references
function cacheElements() {
  elements.searchForm = document.getElementById('search-form');
  elements.searchInput = document.getElementById('search-input');
  elements.searchBtn = document.getElementById('search-btn');

  elements.categoryTreeContainer = document.getElementById('category-tree');
  elements.catBarItems = document.querySelectorAll('.cat-bar__item');

  elements.wizardMake = document.getElementById('wizard-make');
  elements.wizardModel = document.getElementById('wizard-model');
  elements.wizardYear = document.getElementById('wizard-year');
  elements.wizardEngine = document.getElementById('wizard-engine');

  elements.brandFiltersContainer = document.getElementById('brand-filters');
  elements.priceChipsContainer = document.getElementById('price-chips');
  elements.selectedVehicleContainer = document.getElementById('selected-vehicle');
  elements.noVehicleContainer = document.getElementById('no-vehicle-selected');
  elements.removeVehicleBtn = document.querySelector('[data-action="remove-vehicle"]');

  elements.productGrid = document.getElementById('product-grid');
  elements.productCount = document.getElementById('product-count');
  elements.sortSelect = document.getElementById('sort-select');

  elements.loginModal = document.getElementById('login-modal');
  elements.loginBtn = document.getElementById('header-login');
  elements.adminBtn = document.getElementById('header-admin');
  elements.modalClose = document.querySelectorAll('.modal__close');
  elements.modalTabs = document.querySelectorAll('.modal__tab');
  elements.modalPanels = document.querySelectorAll('.modal__panel');

  elements.cartDrawer = document.getElementById('cart-drawer');
  elements.cartToggle = document.getElementById('header-cart');
  elements.cartClose = document.getElementById('cart-close');
  elements.cartOverlay = document.getElementById('cart-overlay');

  elements.sidebarToggle = document.getElementById('sidebar-toggle');
  elements.sidebarOverlay = document.getElementById('sidebar-overlay');

  elements.themeToggle = document.getElementById('theme-toggle');

  elements.toastContainer = document.getElementById('toast-container');

  elements.countdownEl = document.getElementById('countdown');
}

// Debounce utility
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Load products with current filters
async function loadProducts(showSkeleton = true) {
  if (showSkeleton && elements.productGrid) {
    elements.productGrid.innerHTML = renderProductSkeletons(12);
  }

  setState('loading', true);

  try {
    const params = { ...state.currentFilters };

    // Add vehicle filter if selected
    if (state.wizard.selected.make && state.wizard.selected.model && state.wizard.selected.year) {
      params.vehicle = JSON.stringify(state.wizard.selected);
    }

    // Add brand filter
    if (state.selectedBrands.length > 0) {
      params.brand = state.selectedBrands.join(',');
    }

    // Add price range
    if (state.priceRange.min !== '') params.min_price = state.priceRange.min;
    if (state.priceRange.max !== '') params.max_price = state.priceRange.max;

    const data = await api.getProducts(params);

    state.products = data.products;
    state.totalProducts = data.total;
    state.categoryCounts = data.category_counts || {};

    renderProductGrid(data.products);
    renderCategoryTree(data.products.length > 0 ?
      Object.entries(data.category_counts || {}).map(([slug, count]) => ({
        slug, name: slug, icon: '📦', product_count: count
      })) : [], state.selectedCategory);

    if (elements.productCount) {
      elements.productCount.textContent = `${data.total} Ürün`;
    }

    // Update document title with count
    document.title = `ADUVA GARAJ - ${data.total} Ürün`;

    // Re-render wishlist buttons
    renderWishlistButtons();

  } catch (error) {
    console.error('Failed to load products:', error);
    addToast('Ürünler yüklenirken hata oluştu', 'error');
    if (elements.productGrid) {
      elements.productGrid.innerHTML = `
        <div class="no-products" style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; color: var(--text-muted);">
          <p>Ürünler yüklenemedi. Lütfen sayfayı yenileyin.</p>
        </div>
      `;
    }
  } finally {
    setState('loading', false);
  }
}

// Debounced search
const debouncedSearch = debounce(() => {
  const query = elements.searchInput?.value.trim() || '';
  state.currentFilters.q = query;
  loadProducts();
}, 250);

// Initialize event listeners
function initEventListeners() {
  // Search form
  if (elements.searchForm) {
    elements.searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = elements.searchInput.value.trim();
      state.currentFilters.q = query;
      loadProducts();
    });
  }

  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', debouncedSearch);
    elements.searchInput.addEventListener('focus', () => {
      elements.searchInput.parentElement.classList.add('search-form--focused');
    });
    elements.searchInput.addEventListener('blur', () => {
      elements.searchInput.parentElement.classList.remove('search-form--focused');
    });
  }

  // Category bar items
  elements.catBarItems.forEach(item => {
    item.addEventListener('click', () => {
      const category = item.dataset.category;
      if (category) {
        state.currentFilters.category = category === 'all' ? '' : category;
        state.selectedCategory = category;
        loadProducts();

        // Update active state
        elements.catBarItems.forEach(i => i.classList.remove('cat-bar__item--active'));
        item.classList.add('cat-bar__item--active');
      }
    });
  });

  // Category tree in sidebar
  if (elements.categoryTreeContainer) {
    elements.categoryTreeContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.category-tree__item');
      if (btn) {
        const category = btn.dataset.category;
        state.currentFilters.category = category === 'all' ? '' : category;
        state.selectedCategory = category;
        loadProducts();

        // Update active states
        document.querySelectorAll('.category-tree__item').forEach(i => i.classList.remove('category-tree__item--active'));
        btn.classList.add('category-tree__item--active');

        // Update top bar active
        elements.catBarItems.forEach(i => {
          i.classList.toggle('cat-bar__item--active', i.dataset.category === category);
        });
      }
    });
  }

  // Sort select
  if (elements.sortSelect) {
    elements.sortSelect.addEventListener('change', () => {
      state.currentFilters.sort = elements.sortSelect.value;
      loadProducts();
    });
  }

  // Vehicle wizard selects
  const wizardSelects = [
    { el: elements.wizardMake, key: 'make', nextKey: 'model', loadFn: () => api.getWizardStep({ make: state.wizard.selected.make }) },
    { el: elements.wizardModel, key: 'model', nextKey: 'year', loadFn: () => api.getWizardStep({ make: state.wizard.selected.make, model: state.wizard.selected.model }) },
    { el: elements.wizardYear, key: 'year', nextKey: 'engine', loadFn: () => api.getWizardStep({ make: state.wizard.selected.make, model: state.wizard.selected.model, year: parseInt(state.wizard.selected.year) }) },
    { el: elements.wizardEngine, key: 'engine', nextKey: null, loadFn: null }
  ];

  wizardSelects.forEach(({ el, key, nextKey, loadFn }) => {
    if (el) {
      el.addEventListener('change', async () => {
        state.wizard.selected[key] = el.value;

        // Reset subsequent steps
        const keys = ['make', 'model', 'year', 'engine'];
        const currentIndex = keys.indexOf(key);
        for (let i = currentIndex + 1; i < keys.length; i++) {
          state.wizard.selected[keys[i]] = '';
        }

        // Load next step
        if (loadFn && el.value) {
          try {
            const data = await loadFn();
            renderWizardStep(data);
          } catch (error) {
            console.error('Failed to load wizard step:', error);
          }
        } else if (nextKey) {
          // Just reset the next select
          renderWizardStep({ [nextKey + 's']: [] });
        }

        // Update selected vehicle display
        renderSelectedVehicle();

        // If all 4 steps complete, filter products
        if (state.wizard.selected.make && state.wizard.selected.model && state.wizard.selected.year && state.wizard.selected.engine) {
          loadProducts();
          addToast(`${state.wizard.selected.make} ${state.wizard.selected.model} için uyumlu ürünler listeleniyor`, 'success');
        }
      });
    }
  });

  // Remove vehicle button
  if (elements.removeVehicleBtn) {
    elements.removeVehicleBtn.addEventListener('click', () => {
      state.wizard.selected = { make: '', model: '', year: '', engine: '' };
      renderWizardStep({ makes: state.wizard.makes });
      renderSelectedVehicle();
      loadProducts();
    });
  }

  // Product card actions (delegated)
  document.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]');
    if (!action) return;

    const actionType = action.dataset.action;
    const productId = parseInt(action.dataset.productId, 10);

    switch (actionType) {
      case 'add-to-cart':
        if (state.isAuthenticated) {
          import('./cart.js').then(m => m.addToCart(productId));
        } else {
          import('./cart.js').then(m => m.addToGuestCart(productId));
        }
        break;
      case 'wishlist':
        if (state.isAuthenticated) {
          import('./auth.js').then(m => m.toggleWishlist(productId));
        } else {
          openLoginModal();
        }
        break;
      case 'compare':
        // TODO: Implement compare
        addToast('Karşılaştırma özelliği yakında gelecek', 'info');
        break;
      case 'increase':
      case 'decrease':
        const input = action.parentElement.querySelector('.quantity-stepper__input');
        const max = parseInt(input.max, 10);
        let value = parseInt(input.value, 10);
        if (actionType === 'increase' && value < max) value++;
        if (actionType === 'decrease' && value > 1) value--;
        input.value = value;
        break;
      case 'detail':
        // TODO: Navigate to product detail
        addToast('Ürün detay sayfası yakında gelecek', 'info');
        break;
      case 'remove-vehicle':
        state.wizard.selected = { make: '', model: '', year: '', engine: '' };
        renderWizardStep({ makes: state.wizard.makes });
        renderSelectedVehicle();
        loadProducts();
        break;
    }
  });

  // Login modal triggers
  if (elements.loginBtn) {
    elements.loginBtn.addEventListener('click', openLoginModal);
  }

  if (elements.adminBtn) {
    elements.adminBtn.addEventListener('click', () => {
      openLoginModal('admin');
    });
  }

  // Modal close buttons
  elements.modalClose.forEach(btn => {
    btn.addEventListener('click', closeLoginModal);
  });

  // Modal overlay click to close
  if (elements.loginModal) {
    elements.loginModal.addEventListener('click', (e) => {
      if (e.target === elements.loginModal) closeLoginModal();
    });
  }

  // Modal tabs
  elements.modalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      if (tabName) {
        state.activeModalTab = tabName;
        elements.modalTabs.forEach(t => t.classList.toggle('modal__tab--active', t.dataset.tab === tabName));
        elements.modalPanels.forEach(p => p.classList.toggle('modal__panel--active', p.id === `modal-panel-${tabName}`));
      }
    });
  });

  // Keyboard: ESC to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.activeModal) {
      closeLoginModal();
    }
  });

  // Cart drawer
  if (elements.cartToggle) {
    elements.cartToggle.addEventListener('click', toggleCartDrawer);
  }

  if (elements.cartClose) {
    elements.cartClose.addEventListener('click', closeCartDrawer);
  }

  if (elements.cartOverlay) {
    elements.cartOverlay.addEventListener('click', closeCartDrawer);
  }

  // Mobile sidebar
  if (elements.sidebarToggle) {
    elements.sidebarToggle.addEventListener('click', toggleMobileSidebar);
  }

  if (elements.sidebarOverlay) {
    elements.sidebarOverlay.addEventListener('click', closeMobileSidebar);
  }

  // Theme toggle
  if (elements.themeToggle) {
    elements.themeToggle.addEventListener('click', () => {
      setTheme(state.theme === 'light' ? 'dark' : 'light');
    });
  }

  // Toast close buttons (delegated)
  document.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('[data-action="close-toast"]');
    if (closeBtn) {
      const toastId = parseFloat(closeBtn.dataset.toastId);
      removeToast(toastId);
    }
  });
}

// Modal functions
function openLoginModal(defaultTab = 'login') {
  if (!elements.loginModal) return;
  state.activeModal = 'login';
  state.activeModalTab = defaultTab;
  elements.loginModal.classList.add('modal-overlay--open');
  document.body.style.overflow = 'hidden';

  // Update tabs
  elements.modalTabs.forEach(t => t.classList.toggle('modal__tab--active', t.dataset.tab === defaultTab));
  elements.modalPanels.forEach(p => p.classList.toggle('modal__panel--active', p.id === `modal-panel-${defaultTab}`));

  // Focus first input
  setTimeout(() => {
    const activePanel = document.querySelector('.modal__panel--active');
    const firstInput = activePanel?.querySelector('input');
    firstInput?.focus();
  }, 300);
}

function closeLoginModal() {
  if (!elements.loginModal) return;
  state.activeModal = null;
  elements.loginModal.classList.remove('modal-overlay--open');
  document.body.style.overflow = '';
}

function toggleCartDrawer() {
  if (!elements.cartDrawer || !elements.cartOverlay) return;
  const isOpen = elements.cartDrawer.classList.toggle('cart-drawer--open');
  elements.cartOverlay.classList.toggle('cart-overlay--open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';

  if (isOpen && state.isAuthenticated) {
    import('./cart.js').then(m => m.loadCart());
  }
}

function closeCartDrawer() {
  if (elements.cartDrawer) elements.cartDrawer.classList.remove('cart-drawer--open');
  if (elements.cartOverlay) elements.cartOverlay.classList.remove('cart-overlay--open');
  document.body.style.overflow = '';
}

function toggleMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.classList.toggle('sidebar--open');
  if (elements.sidebarOverlay) elements.sidebarOverlay.classList.toggle('sidebar-overlay--open');
  document.body.style.overflow = document.body.style.overflow === 'hidden' ? '' : 'hidden';
}

function closeMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.classList.remove('sidebar--open');
  if (elements.sidebarOverlay) elements.sidebarOverlay.classList.remove('sidebar-overlay--open');
  document.body.style.overflow = '';
}

// Initialize wizard on load
async function initWizard() {
  try {
    const data = await api.getWizardStep({});
    state.wizard.makes = data.makes || [];
    renderWizardStep(data);
  } catch (error) {
    console.error('Failed to load wizard makes:', error);
  }
}

// Initialize categories
async function initCategories() {
  try {
    const categories = await api.getCategories();
    renderCategoryTree(categories, state.selectedCategory);
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

// Initialize brands
async function initBrands() {
  try {
    const brands = await api.getBrands();
    renderBrandFilters(brands);
  } catch (error) {
    console.error('Failed to load brands:', error);
  }
}

// Initialize price chips
function initPriceChips() {
  renderPriceChips();

  if (elements.priceChipsContainer) {
    elements.priceChipsContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.price-range__chip');
      if (chip) {
        const min = chip.dataset.min === '' ? '' : parseInt(chip.dataset.min, 10);
        const max = chip.dataset.max === '' ? '' : parseInt(chip.dataset.max, 10);

        state.priceRange = { min, max };

        // Update active state
        document.querySelectorAll('.price-range__chip').forEach(c => c.classList.remove('price-range__chip--active'));
        chip.classList.add('price-range__chip--active');

        // Sync with inputs
        const minInput = document.getElementById('price-min');
        const maxInput = document.getElementById('price-max');
        if (minInput) minInput.value = min;
        if (maxInput) maxInput.value = max;

        loadProducts();
      }
    });
  }

  // Price inputs
  const minInput = document.getElementById('price-min');
  const maxInput = document.getElementById('price-max');

  const debouncedPriceFilter = debounce(() => {
    state.priceRange = {
      min: minInput?.value || '',
      max: maxInput?.value || ''
    };
    // Clear chip selection
    document.querySelectorAll('.price-range__chip').forEach(c => c.classList.remove('price-range__chip--active'));
    loadProducts();
  }, 500);

  if (minInput) minInput.addEventListener('input', debouncedPriceFilter);
  if (maxInput) maxInput.addEventListener('input', debouncedPriceFilter);
}

// Main initialization
async function init() {
  cacheElements();

  // Initialize theme
  initTheme();

  // Initialize toasts
  initToasts();

  // Initialize countdown
  initCountdown();

  // Initialize auth (checks token, loads user)
  await initAuth();

  // Initialize cart
  initCart();

  // Initialize filters
  initFilters();

  // Initialize event listeners
  initEventListeners();

  // Load initial data
  await Promise.all([
    initWizard(),
    initCategories(),
    initBrands()
  ]);

  initPriceChips();
  renderSelectedVehicle();
  renderCartSummary();
  renderUserMenu();

  // Load products
  await loadProducts();

  // Start countdown
  startCountdown();

  console.log('🚀 ADUVA GARAJ initialized');
}

// Export for debugging
window.ADUVA = {
  state,
  api,
  loadProducts,
  formatPrice
};

// Start app when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
