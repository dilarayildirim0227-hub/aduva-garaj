/**
 * Aduva Garaj - Auth Pages (Login & Register)
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

function setFieldError(fieldId, message) {
  const errorEl = document.getElementById(`${fieldId}-error`);
  const inputEl = document.getElementById(fieldId);
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.hidden = !message;
  }
  if (inputEl) {
    inputEl.setAttribute('aria-invalid', message ? 'true' : 'false');
  }
}

function clearAllErrors(form) {
  form.querySelectorAll('.form-error').forEach(el => {
    el.textContent = '';
    el.hidden = true;
  });
  form.querySelectorAll('[aria-invalid="true"]').forEach(el => {
    el.removeAttribute('aria-invalid');
  });
}

function setLoading(button, loading) {
  const btnText = button.querySelector('.btn-text');
  const btnLoading = button.querySelector('.btn-loading');
  if (btnText) btnText.hidden = loading;
  if (btnLoading) btnLoading.hidden = !loading;
  button.disabled = loading;
}

function checkPasswordStrength(password) {
  let score = 0;
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  score = Object.values(checks).filter(Boolean).length;

  let label = '';
  let color = '';
  if (score <= 2) { label = 'Zayıf'; color = 'var(--color-error)'; }
  else if (score === 3) { label = 'Orta'; color = 'var(--color-warning)'; }
  else if (score === 4) { label = 'Güçlü'; color = 'var(--color-success)'; }
  else { label = 'Çok Güçlü'; color = 'var(--color-success)'; }

  return { score, label, color, checks };
}

function renderPasswordStrength(strengthEl, password) {
  if (!strengthEl) return;
  if (!password) {
    strengthEl.innerHTML = '';
    return;
  }
  const { score, label, color } = checkPasswordStrength(password);
  strengthEl.innerHTML = `
    <div class="strength-bar">
      <div class="strength-fill" style="width: ${(score / 5) * 100}%; background-color: ${color}"></div>
    </div>
    <span class="strength-label" style="color: ${color}">${label}</span>
  `;
}

function togglePasswordVisibility(button) {
  const input = button.parentElement.querySelector('input');
  const eyeIcon = button.querySelector('.icon-eye');
  const eyeOffIcon = button.querySelector('.icon-eye-off');
  if (input.type === 'password') {
    input.type = 'text';
    eyeIcon.hidden = true;
    eyeOffIcon.hidden = false;
    button.setAttribute('aria-label', 'Şifreyi gizle');
  } else {
    input.type = 'password';
    eyeIcon.hidden = false;
    eyeOffIcon.hidden = true;
    button.setAttribute('aria-label', 'Şifreyi göster');
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  clearAllErrors(form);

  const email = form.email.value.trim();
  const password = form.password.value;
  const remember = form.remember.checked;

  let hasError = false;

  if (!email) {
    setFieldError('email', 'E-posta adresi gereklidir');
    hasError = true;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setFieldError('email', 'Geçerli bir e-posta adresi girin');
    hasError = true;
  }

  if (!password) {
    setFieldError('password', 'Şifre gereklidir');
    hasError = true;
  }

  if (hasError) return;

  const btn = form.querySelector('button[type="submit"]');
  setLoading(btn, true);

  try {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, remember }),
    });

    localStorage.setItem('aduvagaraj_auth_token', response.access_token);
    if (response.refresh_token) {
      localStorage.setItem('aduvagaraj_refresh_token', response.refresh_token);
    }

    // Merge cart if exists
    const cartToken = localStorage.getItem('aduvagaraj_cart_token');
    if (cartToken) {
      try {
        await apiRequest('/cart/merge', {
          method: 'POST',
          headers: { 'X-Cart-Token': cartToken },
        });
        localStorage.removeItem('aduvagaraj_cart_token');
      } catch (e) {
        console.warn('Cart merge failed:', e);
      }
    }

    showToast('Giriş başarılı! Yönlendiriliyorsunuz...', 'success');

    // Redirect
    setTimeout(() => {
      const redirect = new URLSearchParams(window.location.search).get('redirect') || '/hesabim';
      window.location.href = redirect;
    }, 1000);
  } catch (error) {
    if (error.message.includes('Invalid credentials') || error.message.includes('401')) {
      setFieldError('password', 'E-posta veya şifre hatalı');
      setFieldError('email', 'E-posta veya şifre hatalı');
    } else {
      showToast(error.message, 'error');
    }
  } finally {
    setLoading(btn, false);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const form = event.target;
  clearAllErrors(form);

  const firstName = form.first_name.value.trim();
  const lastName = form.last_name.value.trim();
  const email = form.email.value.trim();
  const phone = form.phone.value.trim();
  const password = form.password.value;
  const passwordConfirm = form.password_confirm.value;
  const kvkk = form.kvkk.checked;
  const newsletter = form.newsletter.checked;

  let hasError = false;

  if (!firstName) {
    setFieldError('first_name', 'Ad gereklidir');
    hasError = true;
  }

  if (!lastName) {
    setFieldError('last_name', 'Soyad gereklidir');
    hasError = true;
  }

  if (!email) {
    setFieldError('email', 'E-posta adresi gereklidir');
    hasError = true;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setFieldError('email', 'Geçerli bir e-posta adresi girin');
    hasError = true;
  }

  if (phone && !/^0?5\d{9}$/.test(phone.replace(/\s/g, ''))) {
    setFieldError('phone', 'Geçerli bir telefon numarası girin (05XX XXX XX XX)');
    hasError = true;
  }

  const { score } = checkPasswordStrength(password);
  if (score < 3) {
    setFieldError('password', 'Şifre en az 8 karakter, büyük/küçük harf ve rakam içermeli');
    hasError = true;
  }

  if (password !== passwordConfirm) {
    setFieldError('password_confirm', 'Şifreler eşleşmiyor');
    hasError = true;
  }

  if (!kvkk) {
    setFieldError('kvkk', 'KVKK aydınlatma metnini kabul etmelisiniz');
    hasError = true;
  }

  if (hasError) return;

  const btn = form.querySelector('button[type="submit"]');
  setLoading(btn, true);

  try {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        password,
        newsletter,
      }),
    });

    localStorage.setItem('aduvagaraj_auth_token', response.access_token);
    if (response.refresh_token) {
      localStorage.setItem('aduvagaraj_refresh_token', response.refresh_token);
    }

    // Merge cart if exists
    const cartToken = localStorage.getItem('aduvagaraj_cart_token');
    if (cartToken) {
      try {
        await apiRequest('/cart/merge', {
          method: 'POST',
          headers: { 'X-Cart-Token': cartToken },
        });
        localStorage.removeItem('aduvagaraj_cart_token');
      } catch (e) {
        console.warn('Cart merge failed:', e);
      }
    }

    showToast('Kayıt başarılı! Yönlendiriliyorsunuz...', 'success');

    setTimeout(() => {
      window.location.href = '/hesabim';
    }, 1000);
  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('409')) {
      setFieldError('email', 'Bu e-posta adresi zaten kayıtlı');
    } else {
      showToast(error.message, 'error');
    }
  } finally {
    setLoading(btn, false);
  }
}

// Initialize based on page
document.addEventListener('DOMContentLoaded', () => {
  // Password toggles
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => togglePasswordVisibility(btn));
  });

  // Password strength indicator
  const passwordInput = document.getElementById('password');
  const strengthEl = document.getElementById('password-strength');
  if (passwordInput && strengthEl) {
    passwordInput.addEventListener('input', () => {
      renderPasswordStrength(strengthEl, passwordInput.value);
    });
  }

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

  // Logout button
  document.querySelectorAll('.btn-logout').forEach(btn => {
    btn.addEventListener('click', () => {
      localStorage.removeItem('aduvagaraj_auth_token');
      localStorage.removeItem('aduvagaraj_refresh_token');
      showToast('Çıkış yapıldı', 'success');
      setTimeout(() => window.location.href = '/', 500);
    });
  });
});