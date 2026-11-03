/**
 * n11 entegrasyonu için sözleşme (adapter arayüzü).
 * Uygulamanın geri kalanı YALNIZCA bu tiplerle çalışır; n11 API'si değişirse
 * sadece N11SoapClient + n11.mapper güncellenir.
 */

export interface N11ProductSummary {
  n11Id: string;
  sellerCode?: string;
  title: string;
  price: number; // KDV dahil satış fiyatı
  listPrice?: number;
  stock: number;
  saleStatus: 'ACTIVE' | 'PASSIVE' | 'UNKNOWN';
}

export interface N11StockItem {
  n11StockId: string;
  sellerCode?: string;
  quantity: number;
  price?: number;
  attributes: Record<string, string>;
}

export interface N11ProductDetail extends N11ProductSummary {
  subtitle?: string;
  description?: string;
  brand?: string;
  category?: { n11Id: string; name: string };
  images: { url: string; order: number }[];
  attributes: Record<string, string>;
  stockItems: N11StockItem[];
  productUrl?: string;
}

export interface N11Page<T> {
  items: T[];
  currentPage: number;
  pageCount: number;
  totalCount: number;
}

export type N11OrderStatus =
  | 'NEW'
  | 'APPROVED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED'
  | 'UNKNOWN';

export interface N11Order {
  n11OrderId: string;
  orderNumber: string;
  status: N11OrderStatus;
  createdAt: Date;
  totalAmount: number;
  buyerName?: string;
  items: { n11ProductId: string; sellerCode?: string; title: string; quantity: number; price: number; shipmentCode?: string; carrier?: string }[];
}

export interface N11Client {
  /** Sayfalı ürün listesi (özet). page 0'dan başlar. */
  listProducts(page: number, pageSize: number): Promise<N11Page<N11ProductSummary>>;
  /** Ürün detayı (görseller, açıklama, özellikler, stok kalemleri) */
  getProduct(n11Id: string): Promise<N11ProductDetail>;
  /** Belirli tarih aralığındaki siparişler */
  listOrders(from: Date, to: Date, page: number): Promise<N11Page<N11Order>>;
  /** Siparişi kargoya verildi olarak işaretle (Aşama 3) */
  markShipped?(n11OrderItemId: string, carrier: string, trackingCode: string): Promise<void>;
}

export const N11_CLIENT = Symbol('N11_CLIENT');
