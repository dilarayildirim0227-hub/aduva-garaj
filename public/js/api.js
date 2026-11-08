/**
 * API Client - Centralized fetch wrapper with error handling
 */
const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.token = null;
    this.listeners = new Set();
  }

  setToken(token) {
    this.token = token;
    this.notifyAuthChange();
  }

  getToken() {
    return this.token;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyAuthChange() {
    this.listeners.forEach(fn => fn(this.token));
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config = {
      ...options,
      headers,
      credentials: 'include'
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Sunucuya ulaşılamadı. Lütfen tekrar deneyin.');
      }
      throw error;
    }
  }

  // Auth endpoints
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async adminLogin(email, password) {
    return this.request('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async register(name, email, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // Products
  async getProducts(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    const query = searchParams.toString();
    return this.request(`/products${query ? `?${query}` : ''}`);
  }

  async getProduct(id) {
    return this.request(`/products/${id}`);
  }

  async getCategories() {
    return this.request('/products/categories');
  }

  async getBrands() {
    return this.request('/products/brands');
  }

  // Vehicle wizard
  async getMakes() {
    return this.request('/products/vehicles/makes');
  }

  async getModels(make) {
    return this.request(`/products/vehicles/models?make=${encodeURIComponent(make)}`);
  }

  async getYears(make, model) {
    return this.request(`/products/vehicles/years?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`);
  }

  async getEngines(make, model, year) {
    return this.request(`/products/vehicles/engines?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&year=${year}`);
  }

  async getWizardStep(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    return this.request(`/products/vehicles/wizard?${searchParams.toString()}`);
  }

  // Cart
  async getCart() {
    return this.request('/cart');
  }

  async addToCart(productId, qty = 1) {
    return this.request('/cart', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, qty })
    });
  }

  async updateCartItem(itemId, qty) {
    return this.request(`/cart/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ qty })
    });
  }

  async removeFromCart(itemId) {
    return this.request(`/cart/${itemId}`, {
      method: 'DELETE'
    });
  }

  async clearCart() {
    return this.request('/cart', {
      method: 'DELETE'
    });
  }

  async mergeGuestCart(items) {
    return this.request('/cart/merge', {
      method: 'POST',
      body: JSON.stringify(items)
    });
  }

  // Wishlist
  async getWishlist() {
    return this.request('/wishlist');
  }

  async addToWishlist(productId) {
    return this.request('/wishlist', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId })
    });
  }

  async removeFromWishlist(productId) {
    return this.request(`/wishlist/${productId}`, {
      method: 'DELETE'
    });
  }

  // VIN
  async lookupVIN(vin) {
    return this.request('/vin/lookup', {
      method: 'POST',
      body: JSON.stringify({ vin })
    });
  }

  // Admin
  async getAdminOrders(params = {}) {
    const searchParams = new URLSearchParams(params);
    return this.request(`/admin/orders?${searchParams.toString()}`);
  }

  async updateOrderShipment(orderId, data) {
    return this.request(`/admin/orders/${orderId}/shipment`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async updateProductAdmin(productId, data) {
    return this.request(`/admin/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async n11Sync() {
    return this.request('/admin/n11/sync', {
      method: 'POST'
    });
  }

  async exportOrdersCSV(params = {}) {
    const searchParams = new URLSearchParams(params);
    const response = await fetch(`${API_BASE}/admin/reports/orders.csv?${searchParams.toString()}`, {
      headers: { 'Authorization': `Bearer ${this.token}` },
      credentials: 'include'
    });
    if (!response.ok) throw new Error('CSV indirilemedi');
    return response.blob();
  }
}

// Singleton instance
const api = new ApiClient();

// Load token from localStorage on init
const storedToken = localStorage.getItem('aduvajar_token');
if (storedToken) {
  api.setToken(storedToken);
}

export default api;
