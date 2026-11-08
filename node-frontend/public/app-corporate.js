/**
 * Aduva Garaj - Corporate Page
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

function formatPhone(input) {
  let value = input.value.replace(/\D/g, '');
  if (value.startsWith('0')) value = value.substring(1);
  if (value.startsWith('5')) value = '0' + value;
  input.value = value.substring(0, 11);
}

function formatTaxNumber(input) {
  input.value = input.value.replace(/\D/g, '').substring(0, 10);
}

async function handleCorporateForm(event) {
  event.preventDefault();
  const form = event.target;
  clearAllErrors(form);

  const companyName = form.company_name.value.trim();
  const taxOffice = form.tax_office.value.trim();
  const taxNumber = form.tax_number.value.trim();
  const contactName = form.contact_name.value.trim();
  const contactEmail = form.contact_email.value.trim();
  const contactPhone = form.contact_phone.value.trim();
  const fleetSize = form.fleet_size.value;
  const vehicleTypes = Array.from(form.vehicle_types.selectedOptions).map(o => o.value);
  const message = form.message.value.trim();
  const kvkk = form.kvkk.checked;

  let hasError = false;

  if (!companyName) {
    setFieldError('company-name', 'Firma adı gereklidir');
    hasError = true;
  }

  if (!taxOffice) {
    setFieldError('tax-office', 'Vergi dairesi gereklidir');
    hasError = true;
  }

  if (!taxNumber || !/^\d{10}$/.test(taxNumber)) {
    setFieldError('tax-number', 'Geçerli 10 haneli vergi numarası girin');
    hasError = true;
  }

  if (!contactName) {
    setFieldError('contact-name', 'Yetkili ad soyad gereklidir');
    hasError = true;
  }

  if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    setFieldError('contact-email', 'Geçerli bir e-posta adresi girin');
    hasError = true;
  }

  if (!contactPhone || !/^0?5\d{9}$/.test(contactPhone.replace(/\s/g, ''))) {
    setFieldError('contact-phone', 'Geçerli bir telefon numarası girin');
    hasError = true;
  }

  if (!fleetSize) {
    setFieldError('fleet-size', 'Flot büyüklüğü seçiniz');
    hasError = true;
  }

  if (!kvkk) {
    setFieldError('corporate-kvkk', 'KVKK onayı gereklidir');
    hasError = true;
  }

  if (hasError) return;

  const btn = document.getElementById('corporate-submit');
  setLoading(btn, true);

  try {
    // In a real app, this would call a corporate inquiry endpoint
    // For now, we'll simulate success
    await new Promise(resolve => setTimeout(resolve, 1000));

    showToast('Talebiniz alındı! 1 iş günü içinde size dönüş yapacağız.', 'success');
    form.reset();
  } catch (error) {
    showToast(error.message || 'Bir hata oluştu', 'error');
  } finally {
    setLoading(btn, false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Phone formatting
  document.querySelectorAll('input[type="tel"]').forEach(input => {
    input.addEventListener('input', () => formatPhone(input));
  });

  // Tax number formatting
  const taxNumber = document.getElementById('tax-number');
  if (taxNumber) {
    taxNumber.addEventListener('input', () => formatTaxNumber(taxNumber));
  }

  // Corporate form
  const corporateForm = document.getElementById('corporate-form');
  if (corporateForm) {
    corporateForm.addEventListener('submit', handleCorporateForm);
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