/**
 * Toast Module - Toast Container, Auto-dismiss, Slide-in Animation
 */
import { state, subscribe } from './state.js';

// DOM Elements
let toastContainer = null;

function cacheToastElements() {
  toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    // Create toast container if it doesn't exist
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
}

/**
 * Initialize toast module
 */
export function initToasts() {
  cacheToastElements();
  subscribe('toasts', renderToasts);
}

/**
 * Render all toasts
 */
function renderToasts() {
  if (!toastContainer) return;

  toastContainer.innerHTML = state.toasts.map(toast => `
    <div class="toast toast--${toast.type}" data-toast-id="${toast.id}" role="alert" aria-live="polite" style="animation: slideIn 0.3s ease;">
      <span class="toast__message">${escapeHtml(toast.message)}</span>
      <button class="toast__close" data-action="close-toast" data-toast-id="${toast.id}" aria-label="Kapat">✕</button>
    </div>
  `).join('');
}

/**
 * Show a toast notification
 */
export function showToast(message, type = 'success', duration = 4000) {
  const id = Date.now() + Math.random();
  const toast = { id, message, type, duration };
  state.toasts.push(toast);

  // Trigger re-render via subscription
  const { notify } = await import('./state.js');
  notify('toasts', [...state.toasts]);

  // Auto dismiss
  setTimeout(() => removeToast(id), duration);

  return id;
}

/**
 * Remove a toast by ID
 */
export function removeToast(id) {
  state.toasts = state.toasts.filter(t => t.id !== id);
  const { notify } = await import('./state.js');
  notify('toasts', [...state.toasts]);
}

/**
 * Show success toast
 */
export function showSuccess(message, duration = 4000) {
  return showToast(message, 'success', duration);
}

/**
 * Show error toast
 */
export function showError(message, duration = 5000) {
  return showToast(message, 'error', duration);
}

/**
 * Show info toast
 */
export function showInfo(message, duration = 4000) {
  return showToast(message, 'info', duration);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Also export the state's addToast for compatibility
export { addToast, removeToast } from './state.js';

window.ToastModule = {
  initToasts,
  showToast,
  showSuccess,
  showError,
  showInfo,
  removeToast
};
