/**
 * Paylaşılan Tip Tanımları — API, Web, Mobil ortak kullanım
 * Prisma şemasından türetilmiş, any yerine kullanılır.
 */

// ============================================
// Temel Enum'lar (Prisma şemasıyla senkron)
// ============================================

export enum Role {
  CUSTOMER = 'CUSTOMER',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN',
}

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  PASSIVE = 'PASSIVE',
  DRAFT = 'DRAFT',
}

export enum OrderSource {
  APP = 'APP',
  WEB = 'WEB',
}

export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  PREPARING = 'PREPARING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  CARD = 'CARD',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum CouponType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
  FREE_SHIPPING = 'FREE_SHIPPING',
}

export enum AppointmentStatus {
  REQUESTED = 'REQUESTED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
}

// ============================================
// Entity Arayüzleri (LocalStore / In-Memory)
// ============================================

export interface LocalVehicle {
  id: string;
  brand: string;
  model: string;
  generation?: string;
  yearFrom: number;
  yearTo: number | null;
  body?: string;
  engine?: string;
  ktypeCode?: string;
  createdAt: string;
}

export interface LocalCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  parentId?: string;
  sortOrder: number;
}

export interface LocalProductImage {
  url: string;
  sortOrder: number;
}

export interface LocalProduct {
  id: string;
  sellerCode: string;
  oemCode?: string;
  title: string;
  subtitle?: string;
  description?: string;
  slug: string;
  brand?: string;
  price: number;
  listPrice?: number;
  priceKurus: number;
  listPriceKurus?: number;
  lowestPrice30dKurus?: number;
  vatRate: number;
  currency: string;
  stock: number;
  reservedStock: number;
  maxPerOrder: number;
  status: ProductStatus;
  categoryId?: string;
  isUniversal: boolean;
  isFeatured: boolean;
  isHidden: boolean;
  requiresMontage: boolean;
  attributes?: Record<string, unknown>;
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  image?: string;
  images?: LocalProductImage[];
  fitmentVehicleIds?: string[];
}

export interface LocalBanner {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  categoryId?: string;
  imageUrl?: string;
  linkType?: string;
  linkTarget?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface LocalCoupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  minTotal: number;
  minCartTotal?: number;
  maxUses?: number;
  perUserLimit?: number;
  categoryId?: string;
  usedCount: number;
  startsAt?: string;
  endsAt?: string;
  active: boolean;
  isActive: boolean;
  description?: string;
  createdAt: string;
}

export interface LocalOrderItem {
  title: string;
  quantity: number;
  unitPrice: number;
  unitPriceKurus?: number;
  skuSnapshot?: string;
  oemCodeSnapshot?: string;
  variantName?: string;
}

export interface LocalOrder {
  id: string;
  orderNumber: string;
  source: OrderSource;
  customerName: string;
  phone?: string;
  city: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  total: number;
  subtotalKurus?: number;
  discountKurus?: number;
  shippingKurus?: number;
  vatTotalKurus?: number;
  grandTotalKurus?: number;
  trackingCode?: string;
  carrier?: string;
  createdAt: string;
  items: LocalOrderItem[];
  userId?: string;
}

export interface LocalAddress {
  id: string;
  userId: string;
  title: string;
  fullName: string;
  phone: string;
  city: string;
  district: string;
  neighborhood?: string;
  line: string;
  postalCode?: string;
  isCorporate: boolean;
  companyName?: string;
  taxOffice?: string;
  taxNumber?: string;
  isDefault: boolean;
  createdAt: string;
  deletedAt?: string;
}

export interface LocalAppointment {
  id: string;
  userId?: string;
  customerName: string;
  phone: string;
  vehicleInfo?: string;
  vehicleId?: string;
  productId?: string;
  orderId?: string;
  serviceType: string;
  scheduledAt: string;
  status: AppointmentStatus;
  bayNumber: number;
  notes?: string;
  createdAt: string;
  cancelledAt?: string;
}

export interface LocalStockMovement {
  id: string;
  productId: string;
  delta: number;
  previousStock: number;
  newStock: number;
  reason: string;
  referenceId?: string;
  createdAt: string;
}

export interface LocalSettings {
  order_mode: string;
  free_shipping_threshold: number;
  shipping_flat_rate: number;
  cod_fee: number;
}

// ============================================
// LocalStore Veri Yapısı (tip güvenli)
// ============================================

export interface LocalStoreData {
  settings: LocalSettings;
  vehicles: LocalVehicle[];
  categories: LocalCategory[];
  products: LocalProduct[];
  banners: LocalBanner[];
  coupons: LocalCoupon[];
  orders: LocalOrder[];
  appointments: LocalAppointment[];
  stockMovements: LocalStockMovement[];
}

// ============================================
// Pricing / Sepet Hesaplama Sabitleri
// ============================================

export const DEFAULT_FREE_SHIPPING_THRESHOLD_KURUS = 75000; // 750 TL
export const DEFAULT_SHIPPING_FEE_KURUS = 7990; // 79.90 TL
export const DEFAULT_COD_FEE_KURUS = 4990; // 49.90 TL
export const DEFAULT_MAX_PER_ORDER = 10;
export const VAT_RATE = 20; // %20

export interface PricingConfig {
  freeShippingThresholdKurus: number;
  shippingFeeKurus: number;
  codFeeKurus: number;
  maxPerOrder: number;
  vatRate: number;
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  freeShippingThresholdKurus: DEFAULT_FREE_SHIPPING_THRESHOLD_KURUS,
  shippingFeeKurus: DEFAULT_SHIPPING_FEE_KURUS,
  codFeeKurus: DEFAULT_COD_FEE_KURUS,
  maxPerOrder: DEFAULT_MAX_PER_ORDER,
  vatRate: VAT_RATE,
};

// ============================================
// Sipariş Durum Makinesi
// ============================================

export const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PREPARING, OrderStatus.SHIPPED, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
  [OrderStatus.PREPARING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.REFUNDED],
  [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
} as const;

export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  return ALLOWED_ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

// ============================================
// Hata Kodları (Merkezi)
// ============================================

export const ErrorCode = {
  // Auth
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  AUTH_ACCOUNT_DELETED: 'AUTH_ACCOUNT_DELETED',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_REUSED: 'AUTH_TOKEN_REUSED',
  AUTH_SIGNATURE_REQUIRED: 'AUTH_SIGNATURE_REQUIRED',
  AUTH_FORBIDDEN_ROLE: 'AUTH_FORBIDDEN_ROLE',
  AUTH_IDOR_FORBIDDEN: 'AUTH_IDOR_FORBIDDEN',
  AUTH_OTP_RATE_LIMITED: 'AUTH_OTP_RATE_LIMITED',
  AUTH_OTP_INVALID: 'AUTH_OTP_INVALID',
  AUTH_RESET_TOKEN_INVALID: 'AUTH_RESET_TOKEN_INVALID',

  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  CSRF_TOKEN_MISMATCH: 'CSRF_TOKEN_MISMATCH',
  IDEMPOTENCY_PAYLOAD_MISMATCH: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UPLOAD_INVALID_MIME: 'UPLOAD_INVALID_MIME',
  UPLOAD_FILE_TOO_LARGE: 'UPLOAD_FILE_TOO_LARGE',
  UPLOAD_SIGNATURE_INVALID: 'UPLOAD_SIGNATURE_INVALID',
  UPLOAD_MALWARE_DETECTED: 'UPLOAD_MALWARE_DETECTED',
  FILE_MAGIC_BYTES_MISMATCH: 'FILE_MAGIC_BYTES_MISMATCH',
  WEBHOOK_SIGNATURE_INVALID: 'WEBHOOK_SIGNATURE_INVALID',

  // Catalog
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  PRODUCT_UNAVAILABLE: 'PRODUCT_UNAVAILABLE',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  MAX_PER_ORDER_EXCEEDED: 'MAX_PER_ORDER_EXCEEDED',
  VEHICLE_NOT_FOUND: 'VEHICLE_NOT_FOUND',
  CART_EMPTY: 'CART_EMPTY',
  COUPON_INVALID: 'COUPON_INVALID',
  COUPON_LIMIT_REACHED: 'COUPON_LIMIT_REACHED',
  COUPON_MIN_TOTAL_NOT_MET: 'COUPON_MIN_TOTAL_NOT_MET',

  // Orders
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_INVALID_STATE_TRANSITION: 'ORDER_INVALID_STATE_TRANSITION',
  ORDER_CONTRACT_REQUIRED: 'ORDER_CONTRACT_REQUIRED',
  PAYMENT_SIGNATURE_INVALID: 'PAYMENT_SIGNATURE_INVALID',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_DUPLICATE_WEBHOOK: 'PAYMENT_DUPLICATE_WEBHOOK',
  RETURN_WINDOW_EXPIRED: 'RETURN_WINDOW_EXPIRED',
  SHIPPING_ADDRESS_INVALID: 'SHIPPING_ADDRESS_INVALID',

  // User/Review/Appointment
  REVIEW_NOT_VERIFIED_BUYER: 'REVIEW_NOT_VERIFIED_BUYER',
  APPOINTMENT_SLOT_FULL: 'APPOINTMENT_SLOT_FULL',
  APPOINTMENT_SLOT_TAKEN: 'APPOINTMENT_SLOT_FULL',

  // External
  CIRCUIT_BREAKER_OPEN: 'CIRCUIT_BREAKER_OPEN',
  OPTIMISTIC_LOCK_CONFLICT: 'OPTIMISTIC_LOCK_CONFLICT',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',

  // Aliases
  ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  IDOR_FORBIDDEN: 'AUTH_IDOR_FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_FAILED',
  INVALID_COUPON: 'COUPON_INVALID',
  COUPON_USER_LIMIT_EXCEEDED: 'COUPON_LIMIT_REACHED',
  REVIEW_NOT_FOUND: 'REVIEW_NOT_FOUND',
  APPOINTMENT_NOT_FOUND: 'APPOINTMENT_NOT_FOUND',
  ADDRESS_NOT_FOUND: 'ADDRESS_NOT_FOUND',
  FAVORITE_ALREADY_EXISTS: 'FAVORITE_ALREADY_EXISTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  REVIEW_REQUIRES_PURCHASE: 'REVIEW_NOT_VERIFIED_BUYER',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// ============================================
// Yardımcı Fonksiyonlar
// ============================================

export function toTurkishSlug(text: string): string {
  const charMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ı': 'i', 'I': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o', 'ş': 's', 'Ş': 's', 'ü': 'u', 'Ü': 'u',
  };
  return text
    .split('')
    .map((ch) => charMap[ch] ?? ch)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function normalizeTurkishSearch(text?: string | null): string {
  if (!text) return '';
  const charMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ı': 'i', 'I': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o', 'ş': 's', 'Ş': 's', 'ü': 'u', 'Ü': 'u',
  };
  return text
    .split('')
    .map((ch) => charMap[ch] ?? ch)
    .join('')
    .toLowerCase()
    .trim();
}

// ============================================
// API Response Tipleri
// ============================================

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PublicUser {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
}

export interface CartIdentity {
  userId?: string | null;
  token?: string | null;
}

export interface CartSummaryView {
  itemCount: number;
  total: number;
  freeShippingRemaining: number;
  currency: 'TRY';
}

// ============================================
// Sepet Tipleri (API Response)
// ============================================

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

// ============================================
// Product List Params (for search/category/brand pages)
// ============================================

export interface ProductListParams {
  q?: string;
  category?: string;
  brand?: string;
  min?: number;
  max?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'rating';
  vehicle?: string;
  page?: number;
  limit?: number;
  cursor?: string;
}