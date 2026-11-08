/**
 * Aduva Garaj - Account Page
 */

const { apiRequest, formatPrice, showToast } = window.aduvagaraj || {};

function setLoading(button, loading) {
  const btnText = button.querySelector('.btn-text');
  const btnLoading = button.querySelector('.btn-loading');
  if (btnText) btnText.hidden = loading;
  if (btnLoading) btnLoading.hidden = !loading;
  button.disabled = loading;
}

async function loadProfile() {
  try {
    const user = await apiRequest('/auth/me');
    if (user) {
      document.getElementById('first_name')?.value = user.first_name || '';
      document.getElementById('last_name')?.value = user.last_name || '';
      document.getElementById('email')?.value = user.email || '';
      document.getElementById('phone')?.value = user.phone || '';
      document.getElementById('newsletter')?.checked = user.newsletter || false;
    }
  } catch (error) {
    console.error('Profile load error:', error);
  }
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const btn = form.querySelector('button[type="submit"]');
  setLoading(btn, true);

  const data = {
    first_name: form.first_name.value.trim(),
    last_name: form.last_name.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    newsletter: form.newsletter.checked,
  };

  try {
    await apiRequest('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    showToast('Profil güncellendi', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function handleNotificationsSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const btn = form.querySelector('button[type="submit"]');
  setLoading(btn, true);

  const data = {
    notify_order: form.notify_order.checked,
    notify_marketing: form.notify_marketing.checked,
    notify_sms: form.notify_sms.checked,
    notify_push: form.notify_push.checked,
  };

  try {
    await apiRequest('/auth/notification-preferences', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    showToast('Bildirim tercihleri kaydedildi', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

function initTabs() {
  const navLinks = document.querySelectorAll('.account-nav a[data-tab]');
  const sections = document.querySelectorAll('.account-section');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;

      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      sections.forEach(s => s.hidden = true);
      const targetSection = document.getElementById(`section-${tab}`);
      if (targetSection) targetSection.hidden = false;

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('aduvagaraj_auth_token');
  if (!token) {
    window.location.href = '/giris?redirect=/hesabim';
    return;
  }

  initTabs();
  loadProfile();

  const profileForm = document.getElementById('profile-form');
  if (profileForm) profileForm.addEventListener('submit', handleProfileSubmit);

  const notificationsForm = document.getElementById('notifications-form');
  if (notificationsForm) notificationsForm.addEventListener('submit', handleNotificationsSubmit);
});