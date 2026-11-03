import { api } from './api';

export interface CartItemDto {
  id: string;
  productId: string;
  variantId: string | null;
  title: string;
  image: string | null;
  quantity: number;
  unitPrice: number; // kuruş
  unitPriceSnapshot: number; // kuruş
  lineTotal: number; // kuruş
  stock: number;
  maxPerOrder: number;
  priceChanged: boolean;
  unavailable: boolean;
  fitmentWarning: boolean;
}

export interface CartDto {
  id: string;
  items: CartItemDto[];
  subtotal: number; // kuruş
  discount: number; // kuruş
  shipping: number; // kuruş
  tax: number; // kuruş
  total: number; // kuruş
  coupon: { code: string; type: 'PERCENT' | 'FIXED'; value: number } | null;
  freeShippingRemaining: number; // kuruş
  freeShippingThreshold: number; // kuruş
  itemCount: number;
  currency: 'TRY';
}

export interface CartSummaryDto {
  itemCount: number;
  total: number;
  freeShippingRemaining: number;
  currency: 'TRY';
}

const API_BASE = '/api';

/** Kuruş cinsinden integer değeri Türkçe Lira formatına dönüştürür */
export function formatKurus(kurus: number): string {
  const tl = (kurus || 0) / 100;
  return `${tl.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

async function requestCart<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string>) || {},
    },
  });

  const data = await res.json();
  if (!res.ok) {
    const errMsg = data?.error?.message || 'Sepet işlemi sırasında bir hata oluştu.';
    const errCode = data?.error?.code || 'VALIDATION_ERROR';
    const error = new Error(errMsg) as Error & { code?: string; status?: number };
    error.code = errCode;
    error.status = res.status;
    throw error;
  }
  return data as T;
}

export const cartApi = {
  getCart: () => requestCart<CartDto>('/cart'),
  getSummary: () => requestCart<CartSummaryDto>('/cart/summary'),
  addItem: (
    payload: { productId: string; variantId?: string | null; quantity: number; vehicleId?: string | null },
    idempotencyKey?: string,
  ) =>
    requestCart<CartDto>('/cart/items', {
      method: 'POST',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      body: JSON.stringify(payload),
    }),
  updateQuantity: (itemId: string, quantity: number) =>
    requestCart<CartDto>(`/cart/items/${encodeURIComponent(itemId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }),
  removeItem: (itemId: string) =>
    requestCart<CartDto>(`/cart/items/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
    }),
  clearCart: () =>
    requestCart<CartDto>('/cart', {
      method: 'DELETE',
    }),
  applyCoupon: (code: string) =>
    requestCart<CartDto>('/cart/coupon', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  removeCoupon: () =>
    requestCart<CartDto>('/cart/coupon', {
      method: 'DELETE',
    }),
  mergeGuestCart: (userId: string, guestToken?: string) =>
    requestCart<CartDto>('/cart/merge', {
      method: 'POST',
      body: JSON.stringify({ userId, guestToken }),
    }),
};