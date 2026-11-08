/**
 * Auth Module - Login/Register/Admin Login, Token Management, Wishlist Toggle, Quick Account Buttons
 */
import { state, setState, getState, addToast } from './state.js';
import api from './api.js';
import { renderUserMenu, renderWishlistButtons } from './render.js';

// DOM Elements
let loginModal = null;
let modalTabs = null;
let modalPanels = null;
let modalCloseBtns = null;
let modalErrorEl = null;
let quickAccountBtns = null;

function cacheAuthElements() {
  loginModal = document.getElementById('login-modal');
  modalTabs = document.querySelectorAll('.modal__tab');
  modalPanels = document.querySelectorAll('.modal__panel');
  modalCloseBtns = document.querySelectorAll('.modal__close');
  modalErrorEl = document.getElementById('modal-error');
  quickAccountBtns = document.querySelectorAll('.modal__quick-account');
}

/**
 * Initialize auth module
 */
export async function initAuth() {
  cacheAuthElements();
  await checkStoredToken();
  initQuickAccountButtons();
  initModalTabs();
  initAuthForms();
}

/**
 * Check for stored token and validate
 */
async function checkStoredToken() {
  const token = localStorage.getItem('aduvajar_token');
  if (!token) return;

  try {
    api.setToken(token);
    const user = await api.getMe();
    state.user = user;
    state.isAuthenticated = true;
    state.isAdmin = user.role === 'admin';
    renderUserMenu();
    renderWishlistButtons();
  } catch (error) {
    console.error('Token validation failed:', error);
    localStorage.removeItem('aduvajar_token');
    api.setToken(null);
  }
}

/**
 * Initialize quick account buttons in login modal
 */
function initQuickAccountButtons() {
  quickAccountBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const email = btn.dataset.email;
      const password = '123456'; // Demo password
      document.getElementById('login-email').value = email;
      document.getElementById('login-password').value = password;
    });
  });
}

/**
 * Initialize modal tabs
 */
function initModalTabs() {
  modalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      if (!tabName) return;

      state.activeModalTab = tabName;
      modalTabs.forEach(t => t.classList.toggle('modal__tab--active', t.dataset.tab === tabName));
      modalPanels.forEach(p => p.classList.toggle('modal__panel--active', p.id === 'modal-panel-' + tabName));

      // Clear error when switching tabs
      hideModalError();
    });
  });
}

/**
 * Initialize auth forms
 */
function initAuthForms() {
  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Register form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  // Admin login form
  const adminLoginForm = document.getElementById('admin-login-form');
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', handleAdminLogin);
  }

  // Merge guest cart checkbox
  const mergeCheckbox = document.getElementById('merge-guest-cart');
  if (mergeCheckbox) {
    mergeCheckbox.addEventListener('change', () => {
      updateMergeCheckboxText();
    });
    updateMergeCheckboxText();
  }
}

/**
 * Update merge guest cart checkbox text with current count
 */
function updateMergeCheckboxText() {
  const checkbox = document.getElementById('merge-guest-cart');
  const label = document.querySelector('label[for="merge-guest-cart"]');
  if (checkbox && label) {
    const count = state.guestCart.reduce((sum, item) => sum + item.qty, 0);
    label.innerHTML = 'Misafir sepetimdeki ürünleri (<strong>' + count + '</strong> adet) üye sepetime birleştir';
  }
}

/**
 * Handle user login
 */
async function handleLogin(e) {
  e.preventDefault();
  hideModalError();

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const mergeCart = document.getElementById('merge-guest-cart')?.checked;

  if (!email || !password) {
    showModalError('E-posta ve şifre gereklidir');
    return;
  }

  try {
    const data = await api.login(email, password);
    api.setToken(data.access_token);
    localStorage.setItem('aduvajar_token', data.access_token);

    state.user = data.user;
    state.isAuthenticated = true;
    state.isAdmin = data.user.role === 'admin';

    renderUserMenu();
    renderWishlistButtons();
    renderCartSummary();

    if (mergeCart && state.guestCart.length > 0) {
      await mergeGuestCartToUser();
    }

    closeLoginModal();
    addToast('Giriş başarılı! Hoş geldiniz ' + data.user.name, 'success');
  } catch (error) {
    showModalError(error.message || 'Giriş başarısız');
  }
}

/**
 * Handle user registration
 */
async function handleRegister(e) {
  e.preventDefault();
  hideModalError();

  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const phone = document.getElementById('register-phone').value.trim();
  const password = document.getElementById('register-password').value;
  const passwordConfirm = document.getElementById('register-password-confirm').value;
  const kvkk = document.getElementById('register-kvkk')?.checked;

  if (!name || !email || !password) {
    showModalError('Ad, e-posta ve şifre gereklidir');
    return;
  }

  if (password !== passwordConfirm) {
    showModalError('Şifreler eşleşmiyor');
    return;
  }

  if (password.length < 6) {
    showModalError('Şifre en az 6 karakter olmalıdır');
    return;
  }

  if (!kvkk) {
    showModalError('KVKK onayı gereklidir');
    return;
  }

  try {
    const data = await api.register(name, email, password);
    api.setToken(data.access_token);
    localStorage.setItem('aduvajar_token', data.access_token);

    state.user = data.user;
    state.isAuthenticated = true;
    state.isAdmin = false;

    renderUserMenu();
    renderWishlistButtons();
    renderCartSummary();

    closeLoginModal();
    addToast('Kayıt başarılı! Hoş geldiniz ' + data.user.name, 'success');
  } catch (error) {
    showModalError(error.message || 'Kayıt başarısız');
  }
}

/**
 * Handle admin login
 */
async function handleAdminLogin(e) {
  e.preventDefault();
  hideModalError();

  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;

  if (!email || !password) {
    showModalError('E-posta ve şifre gereklidir');
    return;
  }

  try {
    const data = await api.adminLogin(email, password);
    api.setToken(data.access_token);
    localStorage.setItem('aduvajar_token', data.access_token);

    state.user = data.user;
    state.isAuthenticated = true;
    state.isAdmin = true;

    renderUserMenu();
    closeLoginModal();
    addToast('Yetkili girişi başarılı! Yönetim paneli açılıyor...', 'success');

    // Navigate to admin panel
    setTimeout(() => {
      window.location.hash = '#/admin';
    }, 500);
  } catch (error) {
    showModalError(error.message || 'Yetkili girişi başarısız');
  }
}

/**
 * Quick login with demo account
 */
export async function quickLogin(email, name) {
  hideModalError();

  try {
    const data = await api.login(email, '123456');
    api.setToken(data.access_token);
    localStorage.setItem('aduvajar_token', data.access_token);

    state.user = data.user;
    state.isAuthenticated = true;
    state.isAdmin = data.user.role === 'admin';

    renderUserMenu();
    renderWishlistButtons();
    renderCartSummary();

    // Merge guest cart if any
    if (state.guestCart.length > 0) {
      await mergeGuestCartToUser();
    }

    closeLoginModal();
    addToast('Giriş başarılı! Hoş geldiniz ' + data.user.name, 'success');
  } catch (error) {
    showModalError(error.message || 'Hızlı giriş başarısız');
  }
}

/**
 * Merge guest cart to user cart
 */
async function mergeGuestCartToUser() {
  if (state.guestCart.length === 0) return;

  try {
    const items = state.guestCart.map(item => ({
      product_id: item.product_id,
      qty: item.qty
    }));

    await api.mergeGuestCart(items);
    // Clear guest cart
    const { saveGuestCart } = await import('./state.js');
    saveGuestCart([]);
    state.guestCart = [];
    addToast('Misafir sepetiniz birleştirildi', 'success');
  } catch (error) {
    console.error('Merge cart error:', error);
    addToast('Sepet birleştirilirken hata oluştu', 'error');
  }
}

/**
 * Toggle wishlist
 */
export async function toggleWishlist(productId) {
  if (!state.isAuthenticated) {
    openLoginModal('login');
    return;
  }

  try {
    const isInWishlist = state.wishlist.some(w => w.product_id === productId);

    if (isInWishlist) {
      await api.removeFromWishlist(productId);
      state.wishlist = state.wishlist.filter(w => w.product_id !== productId);
      addToast('Favorilerden çıkarıldı', 'success');
    } else {
      const data = await api.addToWishlist(productId);
      state.wishlist.push(data);
      addToast('Favorilere eklendi', 'success');
    }

    renderWishlistButtons();
  } catch (error) {
    console.error('Wishlist error:', error);
    addToast(error.message || 'İşlem başarısız', 'error');
  }
}

/**
 * Load wishlist from server
 */
export async function loadWishlist() {
  if (!state.isAuthenticated) return;

  try {
    const data = await api.getWishlist();
    state.wishlist = data;
    renderWishlistButtons();
  } catch (error) {
    console.error('Failed to load wishlist:', error);
  }
}

/**
 * Logout user
 */
export function logout() {
  state.user = null;
  state.isAuthenticated = false;
  state.isAdmin = false;
  state.cart = { items: [], subtotal: 0, shipping: 0, total: 0, installment6: 0, itemCount: 0 };
  state.wishlist = [];

  localStorage.removeItem('aduvajar_token');
  api.setToken(null);

  renderUserMenu();
  renderWishlistButtons();
  renderCartSummary();
  addToast('Çıkış yapıldı', 'success');
}

/**
 * Show modal error
 */
function showModalError(message) {
  if (modalErrorEl) {
    modalErrorEl.textContent = message;
    modalErrorEl.classList.add('modal__error--visible');
  }
}

/**
 * Hide modal error
 */
function hideModalError() {
  if (modalErrorEl) {
    modalErrorEl.classList.remove('modal__error--visible');
  }
}

/**
 * Open login modal
 */
export function openLoginModal(defaultTab = 'login') {
  if (!loginModal) return;
  cacheAuthElements();

  state.activeModal = 'login';
  state.activeModalTab = defaultTab;
  loginModal.classList.add('modal-overlay--open');
  document.body.style.overflow = 'hidden';

  // Update tabs
  modalTabs.forEach(t => t.classList.toggle('modal__tab--active', t.dataset.tab === defaultTab));
  modalPanels.forEach(p => p.classList.toggle('modal__panel--active', p.id === 'modal-panel-' + defaultTab));

  // Update merge checkbox text
  updateMergeCheckboxText();

  // Focus first input
  setTimeout(() => {
    const activePanel = document.querySelector('.modal__panel--active');
    const firstInput = activePanel?.querySelector('input');
    firstInput?.focus();
  }, 300);
}

/**
 * Close login modal
 */
export function closeLoginModal() {
  if (!loginModal) return;
  state.activeModal = null;
  loginModal.classList.remove('modal-overlay--open');
  document.body.style.overflow = '';
  hideModalError();

  // Reset forms
  document.querySelectorAll('.modal__panel form').forEach(form => form.reset());
}

/**
 * Render cart summary (imported from cart module)
 */
function renderCartSummary() {
  const badgeEl = document.getElementById('cart-badge');
  const labelEl = document.getElementById('cart-label');
  const cartEl = document.getElementById('header-cart');

  if (!cartEl) return;

  const guestCount = state.guestCart.reduce((sum, item) => sum + item.qty, 0);
  const userCount = state.cart.itemCount || 0;
  const totalCount = state.isAuthenticated ? userCount : guestCount;
  const userName = state.user?.name ? '(' + state.user.name.split(' ')[0] + ')' : '(MİSAFİR)';

  if (labelEl) {
    labelEl.textContent = 'SEPETİM ' + userName;
  }

  if (badgeEl) {
    badgeEl.textContent = totalCount;
    badgeEl.style.display = totalCount > 0 ? 'flex' : 'none';
  }
}

window.AuthModule = {
  initAuth,
  openLoginModal,
  closeLoginModal,
  quickLogin,
  toggleWishlist,
  loadWishlist,
  logout,
  handleLogin,
  handleRegister,
  handleAdminLogin
};
