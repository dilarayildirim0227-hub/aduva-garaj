/**
 * Aduva Garaj - Product Detail Page
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

function generateStars(rating) {
  const fullStars = Math.floor(rating / 20);
  const hasHalf = rating % 20 >= 10;
  let html = '';
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    } else if (i === fullStars && hasHalf) {
      html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    } else {
      html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    }
  }
  return html;
}

class ProductDetailPage {
  constructor() {
    this.productId = this.getProductIdFromUrl();
    this.product = null;
    this.currentImageIndex = 0;
    this.quantity = 1;
    this.selectedVehicleId = null;

    // Elements
    this.mainImg = document.getElementById('main-img');
    this.thumbnails = document.getElementById('thumbnails');
    this.breadcrumbTitle = document.getElementById('breadcrumb-title');
    this.productBrand = document.getElementById('product-brand');
    this.productSku = document.getElementById('product-sku');
    this.productTitle = document.getElementById('product-title');
    this.productRating = document.getElementById('product-rating');
    this.ratingCount = document.getElementById('rating-count');
    this.priceCurrent = document.getElementById('price-current');
    this.priceOriginal = document.getElementById('price-original');
    this.productDescription = document.getElementById('product-description');
    this.descText = document.getElementById('desc-text');
    this.fitmentCheck = document.getElementById('fitment-check');
    this.vehicleSelectorMini = document.getElementById('vehicle-selector-mini');
    this.checkFitmentBtn = document.getElementById('check-fitment-btn');
    this.fitmentResult = document.getElementById('fitment-result');
    this.qtyInput = document.getElementById('quantity');
    this.addToCartBtn = document.getElementById('add-to-cart-detail');
    this.detailsContent = document.getElementById('details-content');
    this.specsList = document.getElementById('specs-list');
    this.fitmentList = document.getElementById('fitment-list');
    this.reviewsSummary = document.getElementById('reviews-summary');
    this.reviewsList = document.getElementById('reviews-list');
    this.tabBtns = document.querySelectorAll('.tab-btn');
    this.tabPanels = document.querySelectorAll('.tab-panel');

    this.init();
  }

  getProductIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/urun\/([^/]+)/);
    return match ? match[1] : null;
  }

  async init() {
    if (!this.productId) {
      showToast('Geçersiz ürün', 'error');
      return;
    }

    await this.loadProduct();
    this.bindEvents();
  }

  async loadProduct() {
    try {
      this.product = await apiRequest(`/products/${this.productId}`);
      this.renderProduct();
      this.loadFitmentVehicles();
    } catch (error) {
      console.error('Product load error:', error);
      showToast('Ürün yüklenemedi', 'error');
    }
  }

  renderProduct() {
    const p = this.product;
    if (!p) return;

    document.title = `${p.title} - Aduva Garaj`;
    this.breadcrumbTitle.textContent = p.title;

    // Brand & SKU
    this.productBrand.textContent = p.brand || 'Aduva Garaj';
    this.productSku.textContent = `SKU: ${p.seller_code}${p.oem_code ? ` • OEM: ${p.oem_code}` : ''}`;

    // Title
    this.productTitle.textContent = p.title;

    // Rating
    if (p.rating_count > 0) {
      this.productRating.hidden = false;
      this.productRating.querySelector('.stars').innerHTML = generateStars(p.rating_avg);
      this.ratingCount.textContent = `(${p.rating_count} değerlendirme)`;
    }

    // Price
    this.priceCurrent.textContent = formatPrice(p.price_kurus);
    if (p.list_price_kurus && p.list_price_kurus > p.price_kurus) {
      this.priceOriginal.textContent = formatPrice(p.list_price_kurus);
      this.priceOriginal.hidden = false;
    }

    // Description
    if (p.description) {
      this.productDescription.hidden = false;
      this.descText.textContent = p.description;
    }

    // Images
    this.renderImages();

    // Fitment check
    if (!p.is_universal && p.fitment_vehicle_ids.length > 0) {
      this.fitmentCheck.hidden = false;
      this.renderVehicleSelectorMini();
    } else if (p.is_universal) {
      this.fitmentCheck.hidden = false;
      this.vehicleSelectorMini.innerHTML = '<p class="fitment-universal">Bu ürün evrenseldir, tüm araçlarla uyumludur.</p>';
      this.checkFitmentBtn.disabled = true;
      this.checkFitmentBtn.textContent = 'Evrensel Ürün';
    }

    // Details tab
    this.renderDetails();

    // Specs tab
    this.renderSpecs();

    // Fitment tab
    this.renderFitmentList();

    // Reviews tab
    this.renderReviews();
  }

  renderImages() {
    const images = this.product.images || [];
    const mainImage = images[0]?.url || 'https://via.placeholder.com/600x600?text=Ürün+Görseli';

    this.mainImg.src = mainImage;
    this.mainImg.alt = this.product.title;

    if (images.length > 1) {
      this.thumbnails.innerHTML = images.map((img, index) => `
        <button class="thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}" aria-label="Görsel ${index + 1}">
          <img src="${img.url}" alt="${this.product.title} - Görsel ${index + 1}" loading="lazy">
        </button>
      `).join('');

      this.thumbnails.querySelectorAll('.thumbnail').forEach(btn => {
        btn.addEventListener('click', () => this.changeImage(parseInt(btn.dataset.index)));
      });
    }
  }

  changeImage(index) {
    const images = this.product.images || [];
    if (images[index]) {
      this.mainImg.src = images[index].url;
      this.currentImageIndex = index;
      this.thumbnails.querySelectorAll('.thumbnail').forEach((btn, i) => {
        btn.classList.toggle('active', i === index);
      });
    }
  }

  renderVehicleSelectorMini() {
    // Simplified vehicle selector for product page
    this.vehicleSelectorMini.innerHTML = `
      <div class="selector-row-mini">
        <div class="select-wrapper">
          <label for="fitment-brand">Marka</label>
          <select id="fitment-brand"><option value="">Marka Seçin</option></select>
        </div>
        <div class="select-wrapper">
          <label for="fitment-model">Model</label>
          <select id="fitment-model" disabled><option value="">Önce Marka Seçin</option></select>
        </div>
      </div>
      <div class="selector-row-mini">
        <div class="select-wrapper">
          <label for="fitment-year">Yıl</label>
          <select id="fitment-year" disabled><option value="">Önce Model Seçin</option></select>
        </div>
        <div class="select-wrapper">
          <label for="fitment-engine">Motor</label>
          <select id="fitment-engine" disabled><option value="">Önce Yıl Seçin</option></select>
        </div>
      </div>
    `;

    this.loadFitmentHierarchy();
  }

  async loadFitmentHierarchy() {
    try {
      const hierarchy = await apiRequest('/fitment/hierarchy');
      const brandSelect = document.getElementById('fitment-brand');
      brandSelect.innerHTML = '<option value="">Marka Seçin</option>' +
        hierarchy.brands.map(b => `<option value="${b}">${b}</option>`).join('');

      brandSelect.addEventListener('change', (e) => {
        const modelSelect = document.getElementById('fitment-model');
        const models = hierarchy.models[e.target.value] || [];
        modelSelect.innerHTML = '<option value="">Model Seçin</option>' +
          models.map(m => `<option value="${m}">${m}</option>`).join('');
        modelSelect.disabled = models.length === 0;
        this.resetSelects(['fitment-year', 'fitment-engine']);
      });

      document.getElementById('fitment-model').addEventListener('change', (e) => {
        const brand = brandSelect.value;
        const yearSelect = document.getElementById('fitment-year');
        const years = hierarchy.years[`${brand}:${e.target.value}`] || [];
        yearSelect.innerHTML = '<option value="">Yıl Seçin</option>' +
          years.map(y => `<option value="${y}">${y}</option>`).join('');
        yearSelect.disabled = years.length === 0;
        this.resetSelects(['fitment-engine']);
      });

      document.getElementById('fitment-year').addEventListener('change', (e) => {
        const brand = brandSelect.value;
        const model = document.getElementById('fitment-model').value;
        const engineSelect = document.getElementById('fitment-engine');
        const engines = hierarchy.engines[`${brand}:${model}`] || [];
        engineSelect.innerHTML = '<option value="">Motor Seçin</option>' +
          engines.map(en => `<option value="${en}">${en}</option>`).join('');
        engineSelect.disabled = engines.length === 0;
      });

      document.getElementById('fitment-engine').addEventListener('change', async (e) => {
        if (e.target.value) {
          await this.findVehicleIdForFitment();
        }
      });

    } catch (error) {
      console.error('Fitment hierarchy error:', error);
    }
  }

  resetSelects(ids) {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const first = el.querySelector('option');
        el.innerHTML = first?.outerHTML || '<option value="">Seçin</option>';
        el.disabled = true;
      }
    });
    this.checkFitmentBtn.disabled = true;
    this.selectedVehicleId = null;
  }

  async findVehicleIdForFitment() {
    // In a real implementation, we'd search for the vehicle ID
    // For now, we'll enable the check button
    this.checkFitmentBtn.disabled = false;
    this.checkFitmentBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      Uyumluluğu Kontrol Et
    `;
  }

  async loadFitmentVehicles() {
    if (!this.product?.fitment_vehicle_ids?.length) return;

    try {
      // Load vehicle details for fitment tab
      const vehicleIds = this.product.fitment_vehicle_ids.join(',');
      // In a real API, we'd have a batch endpoint
    } catch (error) {
      console.error('Fitment vehicles load error:', error);
    }
  }

  renderDetails() {
    const p = this.product;
    let html = '';

    if (p.subtitle) {
      html += `<p class="product-subtitle">${p.subtitle}</p>`;
    }

    html += `
      <ul class="detail-list">
        <li><strong>Marka:</strong> ${p.brand || 'Belirtilmemiş'}</li>
        <li><strong>Satıcı Kodu:</strong> ${p.seller_code}</li>
        ${p.oem_code ? `<li><strong>OEM Kodu:</strong> ${p.oem_code}</li>` : ''}
        <li><strong>KDV Oranı:</strong> %${p.vat_rate}</li>
        <li><strong>Stok Durumu:</strong> <span class="${p.status === 'ACTIVE' ? 'in-stock' : 'out-of-stock'}">${this.getStatusText(p.status)}</span></li>
        <li><strong>Maksimum Sipariş:</strong> ${p.max_per_order} adet</li>
        <li><strong>Montaj Gerektirir:</strong> ${p.requires_montage ? 'Evet' : 'Hayır'}</li>
        <li><strong>Evrensel:</strong> ${p.is_universal ? 'Evet' : 'Hayır'}</li>
      </ul>
    `;

    if (p.attributes && Object.keys(p.attributes).length > 0) {
      html += '<h4>Özellikler</h4><ul class="detail-list">';
      Object.entries(p.attributes).forEach(([key, value]) => {
        html += `<li><strong>${key}:</strong> ${value}</li>`;
      });
      html += '</ul>';
    }

    this.detailsContent.innerHTML = html;
  }

  getStatusText(status) {
    const map = {
      'ACTIVE': 'Stokta',
      'OUT_OF_STOCK': 'Stokta Yok',
      'PASSIVE': 'Pasif',
      'DRAFT': 'Taslak',
    };
    return map[status] || status;
  }

  renderSpecs() {
    const p = this.product;
    let html = '';

    const specs = [
      { key: 'Satıcı Kodu', value: p.seller_code },
      { key: 'OEM Kodu', value: p.oem_code || 'Yok' },
      { key: 'Marka', value: p.brand || 'Belirtilmemiş' },
      { key: 'Fiyat (Kuruş)', value: p.price_kurus.toLocaleString('tr-TR') },
      { key: 'Liste Fiyatı (Kuruş)', value: p.list_price_kurus?.toLocaleString('tr-TR') || 'Yok' },
      { key: 'Son 30 Gün En Düşük (Kuruş)', value: p.lowest_price_30d_kurus?.toLocaleString('tr-TR') || 'Yok' },
      { key: 'KDV Oranı', value: `%${p.vat_rate}` },
      { key: 'Para Birimi', value: p.currency },
      { key: 'Stok', value: p.stock.toLocaleString('tr-TR') },
      { key: 'Rezerve Stok', value: p.reserved_stock.toLocaleString('tr-TR') },
      { key: 'Maksimum Sipariş Adedi', value: p.max_per_order },
      { key: 'Durum', value: this.getStatusText(p.status) },
      { key: 'Evrensel', value: p.is_universal ? 'Evet' : 'Hayır' },
      { key: 'Öne Çıkan', value: p.is_featured ? 'Evet' : 'Hayır' },
      { key: 'Gizli', value: p.is_hidden ? 'Evet' : 'Hayır' },
      { key: 'Montaj Gerektirir', value: p.requires_montage ? 'Evet' : 'Hayır' },
      { key: 'Ortalama Puan', value: p.rating_avg / 20 },
      { key: 'Değerlendirme Sayısı', value: p.rating_count },
      { key: 'Satış Sayısı', value: p.sold_count },
      { key: 'Versiyon', value: p.version },
    ];

    html = specs.map(s => `
      <dt>${s.key}</dt>
      <dd>${s.value}</dd>
    `).join('');

    this.specsList.innerHTML = html;
  }

  renderFitmentList() {
    const p = this.product;
    if (!p.fitment_vehicle_ids?.length) {
      this.fitmentList.innerHTML = '<p class="empty-state">Bu ürün için uyumlu araç listesi bulunmuyor.</p>';
      return;
    }

    // In a real implementation, we'd fetch vehicle details
    this.fitmentList.innerHTML = `
      <p class="fitment-count">${p.fitment_vehicle_ids.length} araçla uyumlu</p>
      <div class="fitment-vehicles">
        ${p.fitment_vehicle_ids.slice(0, 10).map(id => `<span class="vehicle-tag">${id}</span>`).join('')}
        ${p.fitment_vehicle_ids.length > 10 ? `<span class="vehicle-tag more">+${p.fitment_vehicle_ids.length - 10} daha</span>` : ''}
      </div>
    `;
  }

  renderReviews() {
    const p = this.product;
    this.reviewsSummary.innerHTML = `
      <div class="reviews-score">
        <span class="score-value">${(p.rating_avg / 20).toFixed(1)}</span>
        <div class="score-stars">${generateStars(p.rating_avg)}</div>
        <span class="score-count">${p.rating_count} değerlendirme</span>
      </div>
    `;

    this.reviewsList.innerHTML = `
      <div class="empty-reviews">
        <p>Henüz değerlendirme yok.</p>
        <p class="hint">Bu ürünü satın alan ilk kişi siz olun!</p>
      </div>
    `;
  }

  bindEvents() {
    // Tabs
    this.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // Quantity
    document.getElementById('qty-decrease')?.addEventListener('click', () => {
      if (this.quantity > 1) {
        this.quantity--;
        this.qtyInput.value = this.quantity;
      }
    });

    document.getElementById('qty-increase')?.addEventListener('click', () => {
      const max = this.product?.max_per_order || 100;
      if (this.quantity < max) {
        this.quantity++;
        this.qtyInput.value = this.quantity;
      }
    });

    this.qtyInput?.addEventListener('change', () => {
      this.quantity = Math.max(1, Math.min(parseInt(this.qtyInput.value) || 1, this.product?.max_per_order || 100));
      this.qtyInput.value = this.quantity;
    });

    // Add to cart
    this.addToCartBtn?.addEventListener('click', () => this.addToCart());

    // Fitment check
    this.checkFitmentBtn?.addEventListener('click', () => this.checkFitment());
  }

  switchTab(tabName) {
    this.tabBtns.forEach(btn => {
      const isActive = btn.dataset.tab === tabName;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });
    this.tabPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });
  }

  async addToCart() {
    try {
      await apiRequest('/cart/items', {
        method: 'POST',
        body: JSON.stringify({
          product_id: this.productId,
          quantity: this.quantity,
        }),
      });
      showToast('Ürün sepete eklendi', 'success');

      // Update cart count
      const cartCount = document.querySelector('.cart-count');
      if (cartCount) {
        const count = parseInt(cartCount.textContent) + this.quantity;
        cartCount.textContent = count;
        cartCount.style.display = 'flex';
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async checkFitment() {
    if (!this.selectedVehicleId) {
      showToast('Lütfen aracınızı seçin', 'warning');
      return;
    }

    try {
      const result = await apiRequest('/fitment/check', {
        method: 'POST',
        body: JSON.stringify({
          product_id: this.productId,
          vehicle_id: this.selectedVehicleId,
        }),
      });

      this.renderFitmentResult(result);
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  renderFitmentResult(result) {
    const isCompatible = result.compatible;
    this.fitmentResult.hidden = false;
    this.fitmentResult.innerHTML = `
      <div class="fitment-result ${isCompatible ? 'compatible' : 'incompatible'}">
        <div class="fitment-icon">
          ${isCompatible
            ? '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>'
            : '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
          }
        </div>
        <h4>${isCompatible ? 'Uyumlu ✓' : 'Uyumsuz ✗'}</h4>
        <p>${result.message}</p>
        ${result.match_type ? `<p class="match-type">Eşleşme tipi: ${result.match_type}</p>` : ''}
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ProductDetailPage();
});