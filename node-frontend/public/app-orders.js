/**
 * Aduva Garaj - Orders Page
 */

const { apiRequest, formatPrice, showToast } = window.aduvagaraj || {};

const STATUS_LABELS = {
  'PENDING': 'Beklemede',
  'CONFIRMED': 'Onaylandı',
  'PROCESSING': 'Hazırlanıyor',
  'SHIPPED': 'Kargoda',
  'DELIVERED': 'Teslim Edildi',
  'CANCELLED': 'İptal Edildi',
  'RETURNED': 'İade Edildi',
};

const STATUS_COLORS = {
  'PENDING': 'warning',
  'CONFIRMED': 'info',
  'PROCESSING': 'info',
  'SHIPPED': 'primary',
  'DELIVERED': 'success',
  'CANCELLED': 'error',
  'RETURNED': 'warning',
};

let currentPage = 1;
let currentStatus = '';
let searchQuery = '';

async function loadOrders() {
  const list = document.getElementById('orders-list');
  const loading = list.querySelector('.orders-loading');
  const empty = list.querySelector('.orders-empty');
  const pagination = document.getElementById('orders-pagination');

  if (loading) loading.hidden = false;
  if (empty) empty.hidden = true;
  list.querySelectorAll('.order-card').forEach(el => el.remove());
  if (pagination) pagination.hidden = true;

  try {
    const params = new URLSearchParams();
    params.set('page', currentPage);
    params.set('limit', '10');
    if (currentStatus) params.set('status', currentStatus);
    if (searchQuery) params.set('search', searchQuery);

    const response = await apiRequest(`/orders?${params}`);
    const orders = response.items || [];
    const total = response.total || orders.length;
    const totalPages = Math.ceil(total / 10);

    if (orders.length === 0) {
      if (loading) loading.hidden = true;
      if (empty) empty.hidden = false;
      return;
    }

    if (loading) loading.hidden = true;

    orders.forEach(order => {
      const card = createOrderCard(order);
      list.insertBefore(card, pagination);
    });

    renderPagination(totalPages);
  } catch (error) {
    console.error('Orders load error:', error);
    if (loading) loading.hidden = true;
    showToast('Siparişler yüklenemedi', 'error');
  }
}

function createOrderCard(order) {
  const card = document.createElement('article');
  card.className = 'order-card';
  card.setAttribute('role', 'listitem');

  const itemsHtml = (order.items || []).map(item => `
    <div class="order-item">
      <img src="${item.image || 'https://via.placeholder.com/50x50'}" alt="${item.title}" class="order-item-image" loading="lazy">
      <div class="order-item-info">
        <div class="order-item-title">${item.title}</div>
        <div class="order-item-meta">${item.brand || 'Aduva Garaj'} × ${item.quantity}</div>
      </div>
      <div class="order-item-price">${formatPrice(item.price_kurus * item.quantity)}</div>
    </div>
  `).join('');

  const statusClass = STATUS_COLORS[order.status] || 'default';
  const statusLabel = STATUS_LABELS[order.status] || order.status;

  card.innerHTML = `
    <div class="order-header">
      <div class="order-meta">
        <span class="order-number">${order.order_number || order.id}</span>
        <span class="order-date">${formatDate(order.created_at)}</span>
      </div>
      <span class="order-status status-${statusClass}">${statusLabel}</span>
    </div>
    <div class="order-items">${itemsHtml}</div>
    <div class="order-footer">
      <div class="order-total">
        <span>Toplam</span>
        <strong>${formatPrice(order.total_kurus || 0)}</strong>
      </div>
      <div class="order-actions">
        <button class="btn btn-secondary btn-sm" onclick="viewOrderDetail('${order.id}')">Detay</button>
        ${order.status === 'PENDING' || order.status === 'CONFIRMED' ? `
          <button class="btn btn-danger btn-sm" onclick="cancelOrder('${order.id}')">İptal Et</button>
        ` : ''}
        ${order.status === 'SHIPPED' ? `
          <button class="btn btn-primary btn-sm" onclick="trackShipment('${order.id}')">Takip Et</button>
        ` : ''}
        ${order.status === 'DELIVERED' ? `
          <button class="btn btn-secondary btn-sm" onclick="returnOrder('${order.id}')">İade Et</button>
        ` : ''}
      </div>
    </div>
  `;

  return card;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderPagination(totalPages) {
  const pagination = document.getElementById('orders-pagination');
  if (!pagination || totalPages <= 1) {
    if (pagination) pagination.hidden = true;
    return;
  }

  pagination.hidden = false;
  let html = '';

  if (currentPage > 1) {
    html += `<button data-page="${currentPage - 1}" aria-label="Önceki">&laquo;</button>`;
  }

  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  for (let i = start; i <= end; i++) {
    html += `<button data-page="${i}" ${i === currentPage ? 'class="active" aria-current="page"' : ''}>${i}</button>`;
  }

  if (currentPage < totalPages) {
    html += `<button data-page="${currentPage + 1}" aria-label="Sonraki">&raquo;</button>`;
  }

  pagination.innerHTML = html;

  pagination.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt(btn.dataset.page);
      loadOrders();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

window.viewOrderDetail = async function(orderId) {
  try {
    const order = await apiRequest(`/orders/${orderId}`);
    // Open in modal or navigate to detail page
    alert(`Sipariş: ${order.order_number}\nDurum: ${STATUS_LABELS[order.status]}\nToplam: ${formatPrice(order.total_kurus)}`);
  } catch (error) {
    showToast(error.message, 'error');
  }
};

window.cancelOrder = async function(orderId) {
  if (!confirm('Bu siparişi iptal etmek istediğinizden emin misiniz?')) return;

  try {
    await apiRequest(`/orders/${orderId}/cancel`, { method: 'POST' });
    showToast('Sipariş iptal edildi', 'success');
    loadOrders();
  } catch (error) {
    showToast(error.message, 'error');
  }
};

window.trackShipment = function(orderId) {
  // In a real app, this would open tracking modal or page
  showToast('Kargo takibi yakında eklenecek', 'info');
};

window.returnOrder = function(orderId) {
  window.location.href = `/iade-talebi?order=${orderId}`;
};

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('aduvagaraj_auth_token');
  if (!token) {
    window.location.href = '/giris?redirect=/siparislerim';
    return;
  }

  loadOrders();

  const statusFilter = document.getElementById('status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      currentStatus = statusFilter.value;
      currentPage = 1;
      loadOrders();
    });
  }

  const searchInput = document.getElementById('order-search');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchQuery = searchInput.value.trim();
        currentPage = 1;
        loadOrders();
      }, 300);
    });
  }
});