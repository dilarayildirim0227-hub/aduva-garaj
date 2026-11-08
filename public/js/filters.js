/**
 * Filters Module - Brand Checkboxes, Price Inputs, URL Hash Sync
 */
import { state, setState, getState, subscribe } from './state.js';
import { renderBrandFilters, renderPriceChips } from './render.js';

// DOM Elements
let brandFiltersContainer = null;
let priceMinInput = null;
let priceMaxInput = null;
let priceChipsContainer = null;

function cacheFilterElements() {
  brandFiltersContainer = document.getElementById('brand-filters');
  priceMinInput = document.getElementById('price-min');
  priceMaxInput = document.getElementById('price-max');
  priceChipsContainer = document.getElementById('price-chips');
}

/**
 * Initialize filters module
 */
export function initFilters() {
  cacheFilterElements();
  initBrandFilters();
  initPriceInputs();
  initPriceChips();
  syncFiltersFromURL();
  subscribeToFilterChanges();
}

/**
 * Initialize brand filter checkboxes
 */
function initBrandFilters() {
  if (!brandFiltersContainer) return;

  brandFiltersContainer.addEventListener('change', (e) => {
    const checkbox = e.target.closest('input[type="checkbox"]');
    if (!checkbox) return;

    const brandSlug = checkbox.dataset.brand;
    if (!brandSlug) return;

    if (checkbox.checked) {
      if (!state.selectedBrands.includes(brandSlug)) {
        state.selectedBrands.push(brandSlug);
      }
    } else {
      state.selectedBrands = state.selectedBrands.filter(b => b !== brandSlug);
    }

    updateURLHash();
    loadProducts();
  });
}

/**
 * Initialize price range inputs
 */
function initPriceInputs() {
  const debouncedFilter = debounce(() => {
    if (!priceMinInput || !priceMaxInput) return;

    state.priceRange = {
      min: priceMinInput.value || '',
      max: priceMaxInput.value || ''
    };

    // Clear chip selection
    document.querySelectorAll('.price-range__chip').forEach(c => c.classList.remove('price-range__chip--active'));

    updateURLHash();
    loadProducts();
  }, 500);

  if (priceMinInput) priceMinInput.addEventListener('input', debouncedFilter);
  if (priceMaxInput) priceMaxInput.addEventListener('input', debouncedFilter);
}

/**
 * Initialize price range chips
 */
function initPriceChips() {
  if (!priceChipsContainer) return;

  renderPriceChips();

  priceChipsContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.price-range__chip');
    if (!chip) return;

    const min = chip.dataset.min === '' ? '' : parseInt(chip.dataset.min, 10);
    const max = chip.dataset.max === '' ? '' : parseInt(chip.dataset.max, 10);

    state.priceRange = { min, max };

    // Update active state
    document.querySelectorAll('.price-range__chip').forEach(c => c.classList.remove('price-range__chip--active'));
    chip.classList.add('price-range__chip--active');

    // Sync with inputs
    if (priceMinInput) priceMinInput.value = min === '' ? '' : min;
    if (priceMaxInput) priceMaxInput.value = max === '' ? '' : max;

    updateURLHash();
    loadProducts();
  });
}

/**
 * Subscribe to filter changes and re-render
 */
function subscribeToFilterChanges() {
  subscribe('selectedBrands', () => {
    renderBrandFilters(getBrandsFromState());
  });

  subscribe('priceRange', () => {
    renderPriceChips();
  });
}

/**
 * Get brands from state (placeholder - would come from API)
 */
function getBrandsFromState() {
  // This would typically come from the API
  // For now, return empty array - the render will be called after brands are loaded
  return [];
}

/**
 * Sync filters from URL hash
 */
function syncFiltersFromURL() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;

  const params = new URLSearchParams(hash);

  // Category
  const category = params.get('category');
  if (category) {
    state.currentFilters.category = category;
    state.selectedCategory = category;
  }

  // Search query
  const q = params.get('q');
  if (q) {
    state.currentFilters.q = q;
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = q;
  }

  // Brands
  const brands = params.get('brands');
  if (brands) {
    state.selectedBrands = brands.split(',');
  }

  // Price range
  const minPrice = params.get('min');
  const maxPrice = params.get('max');
  if (minPrice) state.priceRange.min = parseFloat(minPrice);
  if (maxPrice) state.priceRange.max = parseFloat(maxPrice);

  // Sort
  const sort = params.get('sort');
  if (sort) {
    state.currentFilters.sort = sort;
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = sort;
  }

  // Vehicle
  const vehicle = params.get('vehicle');
  if (vehicle) {
    try {
      state.wizard.selected = JSON.parse(decodeURIComponent(vehicle));
    } catch (e) {
      console.warn('Invalid vehicle param in URL');
    }
  }
}

/**
 * Update URL hash with current filters
 */
export function updateURLHash() {
  const params = new URLSearchParams();

  if (state.currentFilters.q) params.set('q', state.currentFilters.q);
  if (state.currentFilters.category) params.set('category', state.currentFilters.category);
  if (state.selectedBrands.length > 0) params.set('brands', state.selectedBrands.join(','));
  if (state.priceRange.min !== '') params.set('min', state.priceRange.min);
  if (state.priceRange.max !== '') params.set('max', state.priceRange.max);
  if (state.currentFilters.sort && state.currentFilters.sort !== 'featured') params.set('sort', state.currentFilters.sort);
  if (state.wizard.selected.make && state.wizard.selected.model && state.wizard.selected.year) {
    params.set('vehicle', encodeURIComponent(JSON.stringify(state.wizard.selected)));
  }

  const hash = params.toString();
  window.location.hash = hash ? '#' + hash : '';
}

/**
 * Load products with current filters (calls main loadProducts)
 */
function loadProducts() {
  // This will be called from main.js
  if (window.ADUVA && window.ADUVA.loadProducts) {
    window.ADUVA.loadProducts();
  }
}

/**
 * Debounce utility
 */
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Clear all filters
 */
export function clearAllFilters() {
  state.currentFilters = {
    q: '',
    category: '',
    brand: '',
    minPrice: '',
    maxPrice: '',
    sort: 'featured',
    vehicle: null,
    page: 1,
    limit: 105
  };
  state.selectedCategory = 'all';
  state.selectedBrands = [];
  state.priceRange = { min: '', max: '' };
  state.wizard.selected = { make: '', model: '', year: '', engine: '' };

  // Reset UI
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

  document.querySelectorAll('.cat-bar__item').forEach(item => {
    item.classList.toggle('cat-bar__item--active', item.dataset.category === 'all');
  });

  document.querySelectorAll('.category-tree__item').forEach(item => {
    item.classList.toggle('category-tree__item--active', item.dataset.category === 'all');
  });

  document.querySelectorAll('#brand-filters input[type="checkbox"]').forEach(cb => cb.checked = false);

  if (priceMinInput) priceMinInput.value = '';
  if (priceMaxInput) priceMaxInput.value = '';
  document.querySelectorAll('.price-range__chip').forEach(c => c.classList.remove('price-range__chip--active'));

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.value = 'featured';

  updateURLHash();
  loadProducts();
}

window.FiltersModule = {
  initFilters,
  updateURLHash,
  clearAllFilters,
  loadProducts
};
