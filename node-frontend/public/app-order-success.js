/**
 * Aduva Garaj - Order Success Page
 */

const { apiRequest, formatPrice, showToast } = window.aduvagaraj || {};

async function loadOrderDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('order');

  if (!orderId) {
    // Try to get from localStorage (last order)
    const lastOrderId = localStorage.getItem('last_order_id');
    if (lastOrderId) {
      loadOrder(lastOrderId);
    }
    return;
  }

  loadOrder(orderId);
}

async function loadOrder(orderId) {
  try {
    const order = await apiRequest(`/orders/${orderId}`);

    document.getElementById('order-number').textContent = order.order_number || order.id;
    document.getElementById('order-date').textContent = formatDate(order.created_at);
    document.getElementById('order-total').textContent = formatPrice(order.total_kurus || 0);
    document.getElementById('order-payment').textContent = getPaymentLabel(order.payment_method);

    const address = order.shipping_address;
    if (address) {
      document.getElementById('order-address').textContent =
        `${address.first_name} ${address.last_name}, ${address.address_line1}, ${address.district}/${address.city}, ${address.postal_code}, Türkiye`;
    }

    // Clear last order from localStorage
    localStorage.removeItem('last_order_id');
  } catch (error) {
    console.error('Order detail load error:', error);
    document.getElementById('order-number').textContent = 'Bulunamadı';
    document.getElementById('order-date').textContent = '-';
    document.getElementById('order-total').textContent = '-';
    document.getElementById('order-payment').textContent = '-';
    document.getElementById('order-address').textContent = '-';
  }
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

function getPaymentLabel(method) {
  const labels = {
    'CARD': 'Kredi / Banka Kartı',
    'BANK_TRANSFER': 'Havale / EFT',
    'CASH_ON_DELIVERY': 'Kapıda Ödeme',
  };
  return labels[method] || method;
}

document.addEventListener('DOMContentLoaded', loadOrderDetails);