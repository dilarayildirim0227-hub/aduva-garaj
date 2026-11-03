import { HttpException, HttpStatus } from '@nestjs/common';
import { z } from 'zod';

/** Hata kodları (Bölüm 4 + Güvenlik Denetimi SEC-01/SEC-03/SEC-04) */
export type CartErrorCode =
  | 'OUT_OF_STOCK'
  | 'MAX_QUANTITY_EXCEEDED'
  | 'PRODUCT_UNAVAILABLE'
  | 'INVALID_COUPON'
  | 'COUPON_EXPIRED'
  | 'MIN_TOTAL_NOT_MET'
  | 'VALIDATION_ERROR'
  | 'IDEMPOTENCY_PAYLOAD_MISMATCH'
  | 'UNAUTHORIZED_USER'
  | 'IDOR_FORBIDDEN'
  | 'CSRF_TOKEN_INVALID';

/** Standart hata zarfı: { error: { code, message, details } } */
export class CartDomainException extends HttpException {
  constructor(
    public readonly code: CartErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.CONFLICT,
    public readonly details: Record<string, unknown> = {},
  ) {
    super({ error: { code, message, details } }, status);
  }
}

/** Zod giriş doğrulama şemaları */
export const addCartItemSchema = z
  .object({
    productId: z.string().trim().min(1, 'Ürün kimliği zorunludur'),
    variantId: z.string().trim().min(1).optional().nullable(),
    quantity: z.number().int('Miktar tam sayı olmalıdır').min(1, 'Miktar en az 1 olmalıdır').max(100),
    vehicleId: z.string().trim().min(1).optional().nullable(),
  })
  .strict();

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;

export const updateCartItemSchema = z
  .object({
    quantity: z.number().int('Miktar tam sayı olmalıdır').min(1, 'Miktar en az 1 olmalıdır').max(100),
  })
  .strict();

export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export const applyCouponSchema = z
  .object({
    code: z.string().trim().min(2, 'Kupon kodu girin').max(40).transform((s) => s.toUpperCase()),
  })
  .strict();

export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;

/** n11 senkronundan gelen yerel veritabanı stok/fiyat sağlayıcı soyutlaması */
export interface StockSnapshot {
  productId: string;
  variantId: string | null;
  title: string;
  image: string | null;
  unitPriceKurus: number; // KDV dahil kuruş cinsinden integer
  stock: number;
  maxPerOrder: number;
  available: boolean; // ACTIVE ve silinmemiş/gizlenmemiş
  isUniversal: boolean;
  fitmentVehicleIds: string[];
}

export abstract class N11StockProvider {
  abstract getStockSnapshot(productId: string, variantId?: string | null): Promise<StockSnapshot | null>;
}

/** Sepet satırı görünümü (tüm tutarlar kuruş cinsinden integer) */
export interface CartItemView {
  id: string;
  productId: string;
  variantId: string | null;
  title: string;
  image: string | null;
  quantity: number;
  unitPrice: number; // kuruş
  unitPriceSnapshot: number; // eklenme anındaki kuruş fiyatı
  lineTotal: number; // kuruş
  stock: number;
  maxPerOrder: number;
  priceChanged: boolean;
  unavailable: boolean;
  fitmentWarning: boolean;
}

/** Sepet yanıt formatı (Bölüm 4) */
export interface CartView {
  id: string;
  items: CartItemView[];
  subtotal: number; // kuruş
  discount: number; // kuruş
  shipping: number; // kuruş
  tax: number; // kuruş (KDV %20 iç kırılımı)
  total: number; // kuruş (KDV dahil ödenecek net tutar)
  coupon: { code: string; type: 'PERCENT' | 'FIXED' | 'FREE_SHIPPING'; value: number } | null;
  freeShippingRemaining: number; // kuruş
  freeShippingThreshold: number; // kuruş
  itemCount: number;
  currency: 'TRY';
}

export interface CartSummaryView {
  itemCount: number;
  total: number;
  freeShippingRemaining: number;
  currency: 'TRY';
}
