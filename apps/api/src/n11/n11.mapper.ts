/**
 * n11 SOAP yanıtlarını domain tiplerine çeviren saf fonksiyonlar (birim test edilebilir).
 * Alan adları n11 ProductService / OrderService WSDL'lerine göredir.
 * TODO(n11): Alan adlarını güncel resmi dokümana (https://api.n11.com/ws/ ... .wsdl) göre doğrulayın.
 */
import type {
  N11Order,
  N11OrderStatus,
  N11ProductDetail,
  N11ProductSummary,
  N11StockItem,
} from './n11-client.interface';

/** SOAP tekil/çoğul belirsizliği: tek eleman obje, çoklu eleman dizi gelebilir */
export function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

export function num(v: unknown): number {
  if (v === undefined || v === null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function attrsToRecord(list: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of asArray<any>(list)) {
    if (a?.name) out[String(a.name)] = String(a.value ?? '');
  }
  return out;
}

function mapStockItems(raw: any): N11StockItem[] {
  return asArray<any>(raw?.stockItem).map((s) => ({
    n11StockId: String(s.id ?? s.sellerStockCode ?? ''),
    sellerCode: s.sellerStockCode ?? undefined,
    quantity: num(s.quantity),
    // TODO(n11): optionPrice varyant fiyat farkı mı, mutlak fiyat mı? Dokümana göre doğrulayın.
    price: s.optionPrice !== undefined ? num(s.optionPrice) : undefined,
    attributes: attrsToRecord(s.attributes?.attribute),
  }));
}

function mapSaleStatus(v: unknown): N11ProductSummary['saleStatus'] {
  // TODO(n11): saleStatus kodları (1: satış öncesi, 2: satışta, 3: stok yok, 4: satış kapalı?) doğrulanmalı
  const s = String(v ?? '');
  if (s === '2' || s.toLowerCase() === 'active') return 'ACTIVE';
  if (s) return 'PASSIVE';
  return 'UNKNOWN';
}

export function mapProductSummary(p: any): N11ProductSummary {
  const stockItems = mapStockItems(p.stockItems);
  return {
    n11Id: String(p.id),
    sellerCode: p.productSellerCode ?? undefined,
    title: String(p.title ?? '').trim(),
    // displayPrice = indirimli satış fiyatı, price = liste fiyatı (KDV dahil)
    price: num(p.displayPrice ?? p.price),
    listPrice: p.price !== undefined && num(p.price) > num(p.displayPrice) ? num(p.price) : undefined,
    stock: stockItems.reduce((t, s) => t + s.quantity, 0),
    saleStatus: mapSaleStatus(p.saleStatus),
  };
}

export function mapProductDetail(p: any): N11ProductDetail {
  const summary = mapProductSummary(p);
  const attributes = attrsToRecord(p.attributes?.attribute);
  return {
    ...summary,
    subtitle: p.subtitle ?? undefined,
    description: p.description ?? undefined,
    brand: attributes['Marka'] ?? undefined,
    category: p.category?.id ? { n11Id: String(p.category.id), name: String(p.category.name ?? '') } : undefined,
    images: asArray<any>(p.images?.image)
      .map((i) => ({ url: String(i.url), order: num(i.order) }))
      .filter((i) => i.url.startsWith('http'))
      .sort((a, b) => a.order - b.order),
    attributes,
    stockItems: mapStockItems(p.stockItems),
    // TODO(n11): API ürün URL'si dönmüyorsa n11Id ile oluşturma kuralı doğrulanmalı
    productUrl: p.productUrl ?? undefined,
  };
}

export function mapOrderStatus(v: unknown): N11OrderStatus {
  // TODO(n11): OrderService durum kodları (1: İşlemde, 5: Onaylandı, 6: Kargoda, 7: Teslim, 8/9: İptal/İade?) doğrulanmalı
  switch (String(v)) {
    case '1': return 'NEW';
    case '5': return 'APPROVED';
    case '6': return 'SHIPPED';
    case '7': return 'DELIVERED';
    case '8': return 'CANCELLED';
    case '9': return 'RETURNED';
    default: return 'UNKNOWN';
  }
}

export function mapOrder(o: any): N11Order {
  return {
    n11OrderId: String(o.id),
    orderNumber: String(o.orderNumber ?? o.id),
    status: mapOrderStatus(o.status),
    createdAt: parseN11Date(o.createDate),
    totalAmount: num(o.billingTemplate?.dueAmount ?? o.totalAmount),
    buyerName: o.buyer?.fullName ?? undefined,
    items: asArray<any>(o.itemList?.item).map((i) => ({
      n11ProductId: String(i.productId),
      sellerCode: i.productSellerCode ?? undefined,
      title: String(i.productName ?? ''),
      quantity: num(i.quantity),
      price: num(i.price),
      shipmentCode: i.shipmenCompanyCampaignNumber ?? i.shipmentInfo?.trackingNumber ?? undefined, // TODO(n11)
      carrier: i.shipmentInfo?.shipmentCompany?.name ?? undefined,
    })),
  };
}

/** n11 tarih formatı: "dd/MM/yyyy HH:mm" (TODO(n11): doğrula) */
export function parseN11Date(v: unknown): Date {
  const s = String(v ?? '');
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] ?? 0), Number(m[5] ?? 0));
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function formatN11Date(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
