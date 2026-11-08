/**
 * Aduva Garaj - Vehicles Page
 */

const { apiRequest, formatPrice, showToast } = window.aduvagaraj || {};

let fitmentHierarchy = null;
let editingVehicleId = null;

function setLoading(button, loading) {
  const btnText = button.querySelector('.btn-text');
  const btnLoading = button.querySelector('.btn-loading');
  if (btnText) btnText.hidden = loading;
  if (btnLoading) btnLoading.hidden = !loading;
  button.disabled = loading;
}

async function loadHierarchy() {
  try {
    fitmentHierarchy = await apiRequest('/fitment/hierarchy');
  } catch (error) {
    console.error('Hierarchy load error:', error);
  }
}

async function loadVehicles() {
  const grid = document.getElementById('vehicles-grid');
  const loading = grid.querySelector('.vehicles-loading');
  const empty = grid.querySelector('.vehicles-empty');

  if (loading) loading.hidden = false;
  if (empty) empty.hidden = true;
  grid.querySelectorAll('.vehicle-card').forEach(el => el.remove());

  try {
    const vehicles = await apiRequest('/vehicles');
    if (!vehicles.length) {
      if (loading) loading.hidden = true;
      if (empty) empty.hidden = false;
      return;
    }

    if (loading) loading.hidden = true;

    vehicles.forEach(vehicle => {
      const card = createVehicleCard(vehicle);
      grid.insertBefore(card, empty);
    });
  } catch (error) {
    console.error('Vehicles load error:', error);
    if (loading) loading.hidden = true;
    showToast('Araçlar yüklenemedi', 'error');
  }
}

function createVehicleCard(vehicle) {
  const card = document.createElement('article');
  card.className = 'vehicle-card';
  card.setAttribute('role', 'listitem');
  card.dataset.vehicleId = vehicle.id;

  const isDefault = vehicle.is_default;
  const displayName = `${vehicle.brand} ${vehicle.model} ${vehicle.year} ${vehicle.engine}`;

  card.innerHTML = `
    ${isDefault ? '<span class="vehicle-badge default">Varsayılan</span>' : ''}
    <div class="vehicle-image">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      </svg>
    </div>
    <div class="vehicle-info">
      <h3 class="vehicle-name">${displayName}</h3>
      <div class="vehicle-meta">
        ${vehicle.plate ? `<span class="vehicle-plate">${vehicle.plate}</span>` : ''}
        ${vehicle.vin ? `<span class="vehicle-vin">VIN: ${vehicle.vin.substring(0, 8)}...</span>` : ''}
        ${vehicle.mileage ? `<span class="vehicle-mileage">${vehicle.mileage.toLocaleString('tr-TR')} km</span>` : ''}
        ${vehicle.fuel_type ? `<span class="vehicle-fuel">${vehicle.fuel_type}</span>` : ''}
        ${vehicle.transmission ? `<span class="vehicle-transmission">${vehicle.transmission}</span>` : ''}
      </div>
    </div>
    <div class="vehicle-actions">
      <button class="btn btn-ghost btn-sm" onclick="editVehicle('${vehicle.id}')">Düzenle</button>
      <button class="btn btn-danger btn-sm" onclick="deleteVehicle('${vehicle.id}')">Sil</button>
    </div>
  `;

  return card;
}

async function populateBrandSelect() {
  const brandSelect = document.getElementById('vehicle-brand');
  if (!brandSelect || !fitmentHierarchy) return;

  brandSelect.innerHTML = '<option value="">Marka Seçin</option>' +
    (fitmentHierarchy.brands || []).map(b => `<option value="${b}">${b}</option>`).join('');

  brandSelect.addEventListener('change', () => {
    const modelSelect = document.getElementById('vehicle-model');
    const models = fitmentHierarchy.models[brandSelect.value] || [];
    modelSelect.innerHTML = '<option value="">Model Seçin</option>' +
      models.map(m => `<option value="${m}">${m}</option>`).join('');
    modelSelect.disabled = models.length === 0;
    resetSelects(['vehicle-year', 'vehicle-engine']);
  });

  document.getElementById('vehicle-model')?.addEventListener('change', () => {
    const brand = brandSelect.value;
    const yearSelect = document.getElementById('vehicle-year');
    const years = fitmentHierarchy.years[`${brand}:${document.getElementById('vehicle-model').value}`] || [];
    yearSelect.innerHTML = '<option value="">Yıl Seçin</option>' +
      years.map(y => `<option value="${y}">${y}</option>`).join('');
    yearSelect.disabled = years.length === 0;
    resetSelects(['vehicle-engine']);
  });

  document.getElementById('vehicle-year')?.addEventListener('change', () => {
    const brand = brandSelect.value;
    const model = document.getElementById('vehicle-model').value;
    const engineSelect = document.getElementById('vehicle-engine');
    const engines = fitmentHierarchy.engines[`${brand}:${model}`] || [];
    engineSelect.innerHTML = '<option value="">Motor Seçin</option>' +
      engines.map(e => `<option value="${e}">${e}</option>`).join('');
    engineSelect.disabled = engines.length === 0;
  });
}

function resetSelects(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const first = el.querySelector('option');
      el.innerHTML = first?.outerHTML || '<option value="">Seçin</option>';
      el.disabled = true;
    }
  });
}

function openModal(edit = false) {
  const modal = document.getElementById('vehicle-modal');
  const overlay = document.getElementById('vehicle-modal-overlay');
  const title = document.getElementById('vehicle-modal-title');
  const submitBtn = document.getElementById('vehicle-submit');

  if (edit) {
    title.textContent = 'Araç Düzenle';
    submitBtn.querySelector('.btn-text').textContent = 'Güncelle';
  } else {
    title.textContent = 'Araç Ekle';
    submitBtn.querySelector('.btn-text').textContent = 'Kaydet';
    document.getElementById('vehicle-form').reset();
    document.getElementById('vehicle-id').value = '';
    editingVehicleId = null;
    resetSelects(['vehicle-model', 'vehicle-year', 'vehicle-engine']);
  }

  modal.showModal();
  overlay.hidden = false;
}

function closeModal() {
  const modal = document.getElementById('vehicle-modal');
  const overlay = document.getElementById('vehicle-modal-overlay');
  modal.close();
  overlay.hidden = true;
}

window.editVehicle = async function(vehicleId) {
  try {
    const vehicle = await apiRequest(`/vehicles/${vehicleId}`);
    editingVehicleId = vehicleId;

    document.getElementById('vehicle-id').value = vehicle.id;
    document.getElementById('vehicle-brand').value = vehicle.brand || '';
    document.getElementById('vehicle-plate').value = vehicle.plate || '';
    document.getElementById('vehicle-vin').value = vehicle.vin || '';
    document.getElementById('vehicle-mileage').value = vehicle.mileage || '';
    document.getElementById('vehicle-fuel_type').value = vehicle.fuel_type || '';
    document.getElementById('vehicle-transmission').value = vehicle.transmission || '';
    document.getElementById('vehicle-is_default').checked = vehicle.is_default || false;

    // Trigger brand change to populate models
    const brandSelect = document.getElementById('vehicle-brand');
    if (vehicle.brand && fitmentHierarchy) {
      const models = fitmentHierarchy.models[vehicle.brand] || [];
      const modelSelect = document.getElementById('vehicle-model');
      modelSelect.innerHTML = '<option value="">Model Seçin</option>' +
        models.map(m => `<option value="${m}" ${m === vehicle.model ? 'selected' : ''}>${m}</option>`).join('');
      modelSelect.disabled = false;

      if (vehicle.model) {
        const years = fitmentHierarchy.years[`${vehicle.brand}:${vehicle.model}`] || [];
        const yearSelect = document.getElementById('vehicle-year');
        yearSelect.innerHTML = '<option value="">Yıl Seçin</option>' +
          years.map(y => `<option value="${y}" ${y == vehicle.year ? 'selected' : ''}>${y}</option>`).join('');
        yearSelect.disabled = false;

        if (vehicle.year) {
          const engines = fitmentHierarchy.engines[`${vehicle.brand}:${vehicle.model}`] || [];
          const engineSelect = document.getElementById('vehicle-engine');
          engineSelect.innerHTML = '<option value="">Motor Seçin</option>' +
            engines.map(e => `<option value="${e}" ${e === vehicle.engine ? 'selected' : ''}>${e}</option>`).join('');
          engineSelect.disabled = false;
        }
      }
    }

    openModal(true);
  } catch (error) {
    showToast('Araç yüklenemedi', 'error');
  }
};

window.deleteVehicle = async function(vehicleId) {
  if (!confirm('Bu aracı silmek istediğinizden emin misiniz?')) return;

  try {
    await apiRequest(`/vehicles/${vehicleId}`, { method: 'DELETE' });
    showToast('Araç silindi', 'success');
    loadVehicles();
  } catch (error) {
    showToast(error.message, 'error');
  }
};

async function handleVehicleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const btn = document.getElementById('vehicle-submit');
  setLoading(btn, true);

  const data = {
    brand: form.brand.value,
    model: form.model.value,
    year: parseInt(form.year.value),
    engine: form.engine.value,
    plate: form.plate.value.trim().toUpperCase() || null,
    vin: form.vin.value.trim().toUpperCase() || null,
    mileage: form.mileage.value ? parseInt(form.mileage.value) : null,
    fuel_type: form.fuel_type.value || null,
    transmission: form.transmission.value || null,
    is_default: form.is_default.checked,
  };

  try {
    if (editingVehicleId) {
      await apiRequest(`/vehicles/${editingVehicleId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      showToast('Araç güncellendi', 'success');
    } else {
      await apiRequest('/vehicles', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      showToast('Araç eklendi', 'success');
    }
    closeModal();
    loadVehicles();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('aduvagaraj_auth_token');
  if (!token) {
    window.location.href = '/giris?redirect=/araclarim';
    return;
  }

  await loadHierarchy();
  populateBrandSelect();
  loadVehicles();

  const addBtn = document.getElementById('add-vehicle-btn');
  const addFirstBtn = document.getElementById('add-first-vehicle-btn');
  const modal = document.getElementById('vehicle-modal');
  const overlay = document.getElementById('vehicle-modal-overlay');
  const form = document.getElementById('vehicle-form');

  if (addBtn) addBtn.addEventListener('click', () => openModal(false));
  if (addFirstBtn) addFirstBtn.addEventListener('click', () => openModal(false));

  modal?.addEventListener('close', () => {
    overlay.hidden = true;
  });

  overlay?.addEventListener('click', closeModal);

  modal?.querySelector('.modal-close')?.addEventListener('click', closeModal);
  modal?.querySelector('[value="cancel"]')?.addEventListener('click', closeModal);

  form?.addEventListener('submit', handleVehicleSubmit);

  // Plate formatting
  const plateInput = document.getElementById('vehicle-plate');
  if (plateInput) {
    plateInput.addEventListener('input', () => {
      plateInput.value = plateInput.value.toUpperCase();
    });
  }

  // VIN formatting
  const vinInput = document.getElementById('vehicle-vin');
  if (vinInput) {
    vinInput.addEventListener('input', () => {
      vinInput.value = vinInput.value.toUpperCase().substring(0, 17);
    });
  }
});