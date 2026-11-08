/**
 * Aduva Garaj - Checkout Page
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

// Turkish cities data (simplified)
const TURKISH_CITIES = {
  '01': 'Adana', '02': 'Adıyaman', '03': 'Afyonkarahisar', '04': 'Ağrı', '05': 'Amasya',
  '06': 'Ankara', '07': 'Antalya', '08': 'Artvin', '09': 'Aydın', '10': 'Balıkesir',
  '11': 'Bilecik', '12': 'Bingöl', '13': 'Bitlis', '14': 'Bolu', '15': 'Burdur',
  '16': 'Bursa', '17': 'Çanakkale', '18': 'Çankırı', '19': 'Çorum', '20': 'Denizli',
  '21': 'Diyarbakır', '22': 'Edirne', '23': 'Elazığ', '24': 'Erzincan', '25': 'Erzurum',
  '26': 'Eskişehir', '27': 'Gaziantep', '28': 'Giresun', '29': 'Gümüşhane', '30': 'Hakkari',
  '31': 'Hatay', '32': 'Isparta', '33': 'Mersin', '34': 'İstanbul', '35': 'İzmir',
  '36': 'Kars', '37': 'Kastamonu', '38': 'Kayseri', '39': 'Kırklareli', '40': 'Kırşehir',
  '41': 'Kocaeli', '42': 'Konya', '43': 'Kütahya', '44': 'Malatya', '45': 'Manisa',
  '46': 'Kahramanmaraş', '47': 'Mardin', '48': 'Muğla', '49': 'Muş', '50': 'Nevşehir',
  '51': 'Niğde', '52': 'Ordu', '53': 'Rize', '54': 'Sakarya', '55': 'Samsun',
  '56': 'Siirt', '57': 'Sinop', '58': 'Sivas', '59': 'Tekirdağ', '60': 'Tokat',
  '61': 'Trabzon', '62': 'Tunceli', '63': 'Şanlıurfa', '64': 'Uşak', '65': 'Van',
  '66': 'Yozgat', '67': 'Zonguldak', '68': 'Aksaray', '69': 'Bayburt', '70': 'Karaman',
  '71': 'Kırıkkale', '72': 'Batman', '73': 'Şırnak', '74': 'Bartın', '75': 'Ardahan',
  '76': 'Iğdır', '77': 'Yalova', '78': 'Karabük', '79': 'Kilis', '80': 'Osmaniye',
  '81': 'Düzce'
};

const CITY_DISTRICTS = {
  '34': ['Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler', 'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü', 'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt', 'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane', 'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer', 'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla', 'Ümraniye', 'Üsküdar', 'Zeytinburnu'],
  '06': ['Akyurt', 'Altındağ', 'Ayaş', 'Bala', 'Beypazarı', 'Çamlıdere', 'Çankaya', 'Çubuk', 'Elmadağ', 'Etimesgut', 'Evren', 'Gölbaşı', 'Güdül', 'Haymana', 'Kalecik', 'Kazan', 'Keçiören', 'Kızılcahamam', 'Mamak', 'Nallıhan', 'Polatlı', 'Pursaklar', 'Sincan', 'Şereflikoçhisar', 'Yenimahalle'],
  '35': ['Aliağa', 'Balçova', 'Bayındır', 'Bayraklı', 'Bergama', 'Beydağ', 'Bornova', 'Buca', 'Çeşme', 'Çiğli', 'Dikili', 'Foça', 'Gaziemir', 'Güzelbahçe', 'Karabağlar', 'Karaburun', 'Karşıyaka', 'Kemalpaşa', 'Kınık', 'Kiraz', 'Konak', 'Menderes', 'Menemen', 'Narlıdere', 'Ödemiş', 'Seferihisar', 'Selçuk', 'Tire', 'Torbalı', 'Urla'],
  '16': ['Büyükorhan', 'Gemlik', 'Gürsu', 'Harmancık', 'İnegöl', 'İznik', 'Karacabey', 'Keles', 'Kestel', 'Mudanya', 'Mustafakemalpaşa', 'Nilüfer', 'Orhaneli', 'Orhangazi', 'Osmangazi', 'Yenişehir', 'Yıldırım'],
  // Add more as needed
};

class CheckoutPage {
  constructor() {
    this.form = document.getElementById('checkout-form');
    this.sections = document.querySelectorAll('.checkout-section');
    this.steps = document.querySelectorAll('.checkout-steps .step');
    this.prevBtn = document.getElementById('prev-btn');
    this.nextBtn = document.getElementById('next-btn');
    this.placeOrderBtn = document.getElementById('place-order-btn');

    this.currentStep = 1;
    this.totalSteps = 4;
    this.cart = null;

    // Elements
    this.summaryItems = document.getElementById('summary-items');
    this.summarySubtotal = document.getElementById('summary-subtotal');
    this.summaryShipping = document.getElementById('summary-shipping');
    this.summaryVat = document.getElementById('summary-vat');
    this.summaryTotal = document.getElementById('summary-total');
    this.savedAddresses = document.getElementById('saved-addresses');
    this.citySelect = document.getElementById('shipping-city');
    this.districtSelect = document.getElementById('shipping-district');
    this.billingTypeRadios = document.querySelectorAll('input[name="billing_type"]');
    this.paymentMethodRadios = document.querySelectorAll('input[name="payment_method"]');
    this.cardFields = document.getElementById('card-fields');

    this.init();
  }

  async init() {
    await this.loadCart();
    this.setupCitySelect();
    this.bindEvents();
    this.updateStepUI();
    this.updateSummary();
  }

  async loadCart() {
    try {
      this.cart = await apiRequest('/cart');
      if (!this.cart?.items?.length) {
        showToast('Sepetiniz boş', 'warning');
        setTimeout(() => window.location.href = '/sepet', 1500);
      }
    } catch (error) {
      console.error('Cart load error:', error);
      showToast('Sepet yüklenemedi', 'error');
    }
  }

  setupCitySelect() {
    if (!this.citySelect) return;
    this.citySelect.innerHTML = '<option value="">İl Seçin</option>' +
      Object.entries(TURKISH_CITIES).map(([code, name]) => `<option value="${code}">${name}</option>`).join('');

    this.citySelect.addEventListener('change', () => {
      const cityCode = this.citySelect.value;
      this.districtSelect.disabled = !cityCode;
      if (cityCode && CITY_DISTRICTS[cityCode]) {
        this.districtSelect.innerHTML = '<option value="">İlçe Seçin</option>' +
          CITY_DISTRICTS[cityCode].map(d => `<option value="${d}">${d}</option>`).join('');
      } else {
        this.districtSelect.innerHTML = '<option value="">İlçe Seçin</option>';
      }
    });
  }

  bindEvents() {
    // Navigation
    this.nextBtn?.addEventListener('click', () => this.goToStep(this.currentStep + 1));
    this.prevBtn?.addEventListener('click', () => this.goToStep(this.currentStep - 1));

    // Form submission
    this.form?.addEventListener('submit', (e) => this.handleSubmit(e));

    // Billing type toggle
    this.billingTypeRadios.forEach(radio => {
      radio.addEventListener('change', () => this.toggleBillingType(radio.value));
    });

    // Payment method toggle
    this.paymentMethodRadios.forEach(radio => {
      radio.addEventListener('change', () => this.togglePaymentMethod(radio.value));
    });

    // Card number formatting
    const cardNumber = document.getElementById('card-number');
    if (cardNumber) {
      cardNumber.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(\d{4})/g, '$1 ').trim();
        e.target.value = value.substring(0, 19);
      });
    }

    // Card expiry formatting
    const cardExpiry = document.getElementById('card-expiry');
    if (cardExpiry) {
      cardExpiry.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) value = value.substring(0, 2) + '/' + value.substring(2, 4);
        e.target.value = value.substring(0, 5);
      });
    }

    // Card CVC formatting
    const cardCvc = document.getElementById('card-cvc');
    if (cardCvc) {
      cardCvc.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 3);
      });
    }

    // TC Kimlik formatting
    const tcKimlik = document.getElementById('billing-tc_kimlik');
    if (tcKimlik) {
      tcKimlik.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 11);
      });
    }

    // Postal code formatting
    const postalCode = document.getElementById('shipping-postal_code');
    if (postalCode) {
      postalCode.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 5);
      });
    }

    // Phone formatting
    document.querySelectorAll('input[type="tel"]').forEach(input => {
      input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.startsWith('0')) value = value.substring(1);
        if (value.startsWith('5')) value = '0' + value;
        e.target.value = value.substring(0, 11);
      });
    });
  }

  toggleBillingType(type) {
    const individual = document.getElementById('individual-billing');
    const corporate = document.getElementById('corporate-billing');
    if (type === 'INDIVIDUAL') {
      individual.hidden = false;
      corporate.hidden = true;
      individual.querySelectorAll('input, textarea').forEach(el => el.required = true);
      corporate.querySelectorAll('input, textarea').forEach(el => el.required = false);
    } else {
      individual.hidden = true;
      corporate.hidden = false;
      individual.querySelectorAll('input, textarea').forEach(el => el.required = false);
      corporate.querySelectorAll('input, textarea').forEach(el => el.required = true);
    }
  }

  togglePaymentMethod(method) {
    this.cardFields.hidden = method !== 'CARD';
    this.cardFields.querySelectorAll('input').forEach(el => {
      el.required = method === 'CARD';
    });
  }

  goToStep(step) {
    if (step < 1 || step > this.totalSteps) return;

    // Validate current step before moving forward
    if (step > this.currentStep && !this.validateStep(this.currentStep)) {
      return;
    }

    this.currentStep = step;
    this.updateStepUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  validateStep(step) {
    const section = document.querySelector(`.checkout-section[data-step="${step}"]`);
    if (!section) return true;

    const requiredFields = section.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        isValid = false;
        field.setAttribute('aria-invalid', 'true');
        field.focus();
      } else {
        field.removeAttribute('aria-invalid');
      }
    });

    // Special validations
    if (step === 1) {
      const email = section.querySelector('input[type="email"]');
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        isValid = false;
        email.setAttribute('aria-invalid', 'true');
      }
      const phone = section.querySelector('input[type="tel"]');
      if (phone && !/^0?5\d{9}$/.test(phone.value.replace(/\s/g, ''))) {
        isValid = false;
        phone.setAttribute('aria-invalid', 'true');
      }
    }

    if (step === 2) {
      if (!this.citySelect.value || !this.districtSelect.value) {
        isValid = false;
        if (!this.citySelect.value) this.citySelect.setAttribute('aria-invalid', 'true');
        if (!this.districtSelect.value) this.districtSelect.setAttribute('aria-invalid', 'true');
      }
    }

    if (step === 3) {
      const billingType = document.querySelector('input[name="billing_type"]:checked')?.value;
      if (billingType === 'INDIVIDUAL') {
        const tc = document.getElementById('billing-tc_kimlik');
        if (tc && !/^\d{11}$/.test(tc.value)) {
          isValid = false;
          tc.setAttribute('aria-invalid', 'true');
        }
      } else {
        const taxNumber = document.getElementById('billing-tax_number');
        if (taxNumber && !/^\d{10}$/.test(taxNumber.value)) {
          isValid = false;
          taxNumber.setAttribute('aria-invalid', 'true');
        }
      }
    }

    if (step === 4) {
      const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value;
      if (paymentMethod === 'CARD') {
        const cardNumber = document.getElementById('card-number');
        const cardExpiry = document.getElementById('card-expiry');
        const cardCvc = document.getElementById('card-cvc');
        const cardHolder = document.getElementById('card-holder');

        if (cardNumber && cardNumber.value.replace(/\s/g, '').length < 15) {
          isValid = false;
          cardNumber.setAttribute('aria-invalid', 'true');
        }
        if (cardExpiry && !/^\d{2}\/\d{2}$/.test(cardExpiry.value)) {
          isValid = false;
          cardExpiry.setAttribute('aria-invalid', 'true');
        }
        if (cardCvc && cardCvc.value.length < 3) {
          isValid = false;
          cardCvc.setAttribute('aria-invalid', 'true');
        }
        if (cardHolder && !cardHolder.value.trim()) {
          isValid = false;
          cardHolder.setAttribute('aria-invalid', 'true');
        }
      }

      const terms = document.getElementById('terms');
      if (terms && !terms.checked) {
        isValid = false;
        terms.setAttribute('aria-invalid', 'true');
        terms.focus();
      }
    }

    return isValid;
  }

  updateStepUI() {
    // Update steps
    this.steps.forEach((stepEl, index) => {
      const stepNum = index + 1;
      stepEl.classList.toggle('active', stepNum === this.currentStep);
      stepEl.classList.toggle('completed', stepNum < this.currentStep);
    });

    // Update sections
    this.sections.forEach(section => {
      const step = parseInt(section.dataset.step);
      section.hidden = step !== this.currentStep;
    });

    // Update buttons
    this.prevBtn.hidden = this.currentStep === 1;
    this.nextBtn.hidden = this.currentStep === this.totalSteps;
    this.placeOrderBtn.hidden = this.currentStep !== this.totalSteps;
  }

  updateSummary() {
    if (!this.cart) return;

    const items = this.cart.items || [];
    this.summaryItems.innerHTML = items.map(item => `
      <li class="summary-item">
        <img src="${item.image || 'https://via.placeholder.com/50x50'}" alt="${item.title}" class="summary-item-image">
        <div class="summary-item-info">
          <span class="summary-item-title">${item.title}</span>
          <span class="summary-item-meta">${item.brand || 'Aduva Garaj'} × ${item.quantity}</span>
        </div>
        <span class="summary-item-price">${formatPrice(item.price_kurus * item.quantity)}</span>
      </li>
    `).join('');

    const subtotal = items.reduce((sum, item) => sum + item.price_kurus * item.quantity, 0);
    const shipping = subtotal >= 75000 ? 0 : 2990;
    // Calculate VAT (approximate, assuming 20% average)
    const vat = Math.round((subtotal + shipping) * 0.1667);
    const total = subtotal + shipping;

    this.summarySubtotal.textContent = formatPrice(subtotal);
    this.summaryShipping.textContent = shipping === 0 ? 'Ücretsiz' : formatPrice(shipping);
    this.summaryVat.textContent = formatPrice(vat);
    this.summaryTotal.textContent = formatPrice(total);
  }

  async handleSubmit(event) {
    event.preventDefault();

    if (!this.validateStep(this.currentStep)) {
      return;
    }

    const terms = document.getElementById('terms');
    if (!terms.checked) {
      showToast('Mesafe satış sözleşmesini kabul etmelisiniz', 'error');
      terms.focus();
      return;
    }

    setLoading(this.placeOrderBtn, true);

    try {
      // Collect form data
      const formData = new FormData(this.form);
      const data = Object.fromEntries(formData.entries());

      // Convert checkboxes
      data.save_address = data.save_address === 'on';
      data.newsletter = data.newsletter === 'on';

      // Clean up data
      if (data.card_number) data.card_number = data.card_number.replace(/\s/g, '');
      if (data.card_expiry) data.card_expiry = data.card_expiry.replace('/', '');
      if (data.shipping_postal_code) data.shipping_postal_code = data.shipping_postal_code.replace(/\s/g, '');
      if (data.billing_tc_kimlik) data.billing_tc_kimlik = data.billing_tc_kimlik.replace(/\s/g, '');
      if (data.billing_tax_number) data.billing_tax_number = data.billing_tax_number.replace(/\s/g, '');

      // Remove empty card fields if not card payment
      if (data.payment_method !== 'CARD') {
        delete data.card_number;
        delete data.card_expiry;
        delete data.card_cvc;
        delete data.card_holder;
      }

      // Remove unused billing fields
      if (data.billing_type === 'INDIVIDUAL') {
        delete data.billing_company_name;
        delete data.billing_tax_office;
        delete data.billing_tax_number;
      } else {
        delete data.billing_first_name;
        delete data.billing_last_name;
        delete data.billing_tc_kimlik;
      }

      const response = await apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      showToast('Siparişiniz başarıyla alındı!', 'success');
      localStorage.removeItem('aduvagaraj_cart_token');

      setTimeout(() => {
        window.location.href = `/siparis-basarili?order=${response.id || response.order_number}`;
      }, 1500);
    } catch (error) {
      console.error('Order error:', error);
      showToast(error.message || 'Sipariş oluşturulamadı', 'error');
    } finally {
      setLoading(this.placeOrderBtn, false);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new CheckoutPage();
});