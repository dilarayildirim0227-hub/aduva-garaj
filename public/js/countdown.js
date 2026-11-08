/**
 * Countdown Module - 16:00 Cutoff Countdown (HH:MM:SS), Gold Mono Font
 */
import { state, setState, getState, startCountdown, stopCountdown, updateCountdown, subscribe } from './state.js';

// DOM Elements
let countdownEl = null;

function cacheCountdownElements() {
  countdownEl = document.getElementById('countdown');
}

/**
 * Initialize countdown module
 */
export function initCountdown() {
  cacheCountdownElements();
  subscribe('countdown', renderCountdown);
  startCountdown();
}

/**
 * Render countdown timer
 */
export function renderCountdown(countdown) {
  if (!countdownEl) return;

  countdownEl.innerHTML = `
    <span>${String(countdown.hours).padStart(2, '0')}</span>
    <span class="countdown-sep">:</span>
    <span>${String(countdown.minutes).padStart(2, '0')}</span>
    <span class="countdown-sep">:</span>
    <span>${String(countdown.seconds).padStart(2, '0')}</span>
  `;
}

/**
 * Manually update countdown (for testing)
 */
export function forceUpdateCountdown() {
  updateCountdown();
}

/**
 * Stop countdown
 */
export function stopCountdownTimer() {
  stopCountdown();
}

/**
 * Start countdown
 */
export function startCountdownTimer() {
  startCountdown();
}

window.CountdownModule = {
  initCountdown,
  renderCountdown,
  forceUpdateCountdown,
  stopCountdownTimer,
  startCountdownTimer
};
