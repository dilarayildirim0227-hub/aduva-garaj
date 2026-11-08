/**
 * Application State Management
 */

// Global state
const state = {
  // User & Auth
  user: null,
  isAuthenticated: false,
  isAdmin: false,

  // Products & Filters
  products: [],
  totalProducts: 0,
  categoryCounts: {},
  currentFilters: {
    q: '',
    category: '',
    brand: '',
    minPrice: '',
    maxPrice: '',
    sort: 'featured',
    vehicle: null,
    page: 1,
    limit: 105
  },
  selectedCategory: 'all',
  selectedBrands: [],
  priceRange: { min: '', max: '' },

  // Vehicle Wizard
  wizard: {
    makes: [],
    models: [],
    years: [],
    engines: [],
    selected: {
      make: '',
      model: '',
      year: '',
      engine: ''
    }
  },

  // Cart
  cart: {
    items: [],
    subtotal: 0,
    shipping: 0,
    total: 0,
    installment6: 0,
    itemCount: 0
  },
  guestCart: [],

  // Wishlist
  wishlist: [],

  // UI State
  theme: 'light',
  loading: false,
  skeletonCount: 12,
  showSidebar: false,
  activeModal: null,
  activeModalTab: 'login',
  modalError: '',

  // Toast notifications
  toasts: [],

  // Countdown
  countdownTarget: null,
  countdownInterval: null,

  // Quick login accounts
  quickAccounts: [
    { name: 'Ahmet Yılmaz', email: 'ahmet@aduvagaraj.com', vehicle: 'Golf 7' },
    { name: 'Mehmet Kaya', email: 'mehmet@aduvagaraj.com', vehicle: 'Astra J' }
  ]
};

// Subscribers for reactive updates
const subscribers = new Map();

function subscribe(key, callback) {
  if (!subscribers.has(key)) {
    subscribers.set(key, new Set());
  }
  subscribers.get(key).add(callback);
  return () => {
    const set = subscribers.get(key);
    if (set) set.delete(callback);
  };
}

function notify(key, value) {
  const set = subscribers.get(key);
  if (set) {
    set.forEach(cb => cb(value));
  }
}

// State setters with notification
function setState(key, value) {
  const keys = key.split('.');
  let obj = state;
  for (let i = 0; i < keys.length - 1; i++) {
    obj = obj[keys[i]];
  }
  obj[keys[keys.length - 1]] = value;
  notify(key, value);
}

function getState(key) {
  const keys = key.split('.');
  let obj = state;
  for (const k of keys) {
    obj = obj[k];
    if (obj === undefined) return undefined;
  }
  return obj;
}

// Cart helpers
function getGuestCart() {
  try {
    const stored = localStorage.getItem('aduvajar_guest_cart');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveGuestCart(cart) {
  localStorage.setItem('aduvajar_guest_cart', JSON.stringify(cart));
  state.guestCart = cart;
  notify('cart.guestCart', cart);
}

function getGuestCartCount() {
  return state.guestCart.reduce((sum, item) => sum + item.qty, 0);
}

// Theme helpers
function getTheme() {
  return localStorage.getItem('aduvajar_theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

function setTheme(theme) {
  state.theme = theme;
  localStorage.setItem('aduvajar_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  notify('theme', theme);
}

// Toast helpers
function addToast(message, type = 'success', duration = 4000) {
  const id = Date.now() + Math.random();
  const toast = { id, message, type, duration };
  state.toasts.push(toast);
  notify('toasts', [...state.toasts]);

  setTimeout(() => removeToast(id), duration);
  return id;
}

function removeToast(id) {
  state.toasts = state.toasts.filter(t => t.id !== id);
  notify('toasts', [...state.toasts]);
}

// Countdown calculation
function calculateCountdownTarget() {
  const now = new Date();
  const cutoffHour = 16; // 16:00
  let target = new Date(now);
  target.setHours(cutoffHour, 0, 0, 0);

  if (now >= target) {
    target.setDate(target.getDate() + 1);
  }

  return target;
}

function updateCountdown() {
  const target = state.countdownTarget || calculateCountdownTarget();
  state.countdownTarget = target;
  const now = new Date();
  const diff = target - now;

  if (diff <= 0) {
    state.countdownTarget = calculateCountdownTarget();
    return updateCountdown();
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  notify('countdown', { hours, minutes, seconds });
}

function startCountdown() {
  if (state.countdownInterval) return;
  updateCountdown();
  state.countdownInterval = setInterval(updateCountdown, 1000);
}

function stopCountdown() {
  if (state.countdownInterval) {
    clearInterval(state.countdownInterval);
    state.countdownInterval = null;
  }
}

// Initialize guest cart on load
state.guestCart = getGuestCart();

export {
  state,
  subscribe,
  setState,
  getState,
  getGuestCart,
  saveGuestCart,
  getGuestCartCount,
  getTheme,
  setTheme,
  addToast,
  removeToast,
  startCountdown,
  stopCountdown,
  updateCountdown
};
