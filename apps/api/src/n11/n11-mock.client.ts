import type { N11Client, N11Order, N11Page, N11ProductDetail, N11ProductSummary } from './n11-client.interface';

/** n11 anahtarları yokken geliştirme/test için deterministik sahte veri */
const CATALOG: N11ProductDetail[] = [
  ['Android Auto & CarPlay 9" Multimedya Ekran 4GB/64GB', 7499, 8999, 12, 'Multimedya', 'Universal'],
  ['VW Golf 7 Uyumlu 3D Havuzlu Paspas Seti', 1249, 1499, 30, 'Paspas', 'Volkswagen'],
  ['Fiat Egea Deri Koltuk Kılıfı Seti Siyah-Kırmızı', 3299, 3899, 8, 'Koltuk Kılıfı', 'Fiat'],
  ['Renault Clio 5 Krom Cam Çıtası 4 Parça', 649, 799, 0, 'Krom Aksesuar', 'Renault'],
  ['Universal Ortopedik Bel Destekli Oto Minder', 449, 549, 55, 'Minder', 'Universal'],
  ['Toyota Corolla Jant Göbeği Arması 4\'lü Set 62mm', 399, 0, 40, 'Jant Göbeği', 'Toyota'],
  ['Ambiyans RGB LED Torpido Şeridi 6m Uygulama Kontrollü', 899, 1099, 22, 'LED Aydınlatma', 'Universal'],
  ['Geri Görüş Kamerası Gece Görüşlü 170°', 599, 749, 17, 'Kamera', 'Universal'],
  ['Pioneer 16cm 2 Yollu Oto Hoparlör 300W', 1899, 2199, 9, 'Ses Sistemi', 'Universal'],
].map(([title, price, list, stock, cat, brand], i) => ({
  n11Id: String(100000 + i),
  sellerCode: `ADV-${1000 + i}`,
  title: title as string,
  price: price as number,
  listPrice: (list as number) || undefined,
  stock: stock as number,
  saleStatus: 'ACTIVE' as const,
  description: `<p>${title} — Aduva Garaj güvencesiyle, hızlı kargo.</p>`,
  brand: brand as string,
  category: { n11Id: `cat-${cat}`, name: cat as string },
  images: [1, 2, 3].map((n) => ({ url: `https://picsum.photos/seed/aduva${i}-${n}/800/800`, order: n })),
  attributes: { Marka: brand as string, Garanti: '2 Yıl' },
  stockItems: [{ n11StockId: `stk-${i}`, sellerCode: `ADV-${1000 + i}`, quantity: stock as number, attributes: {} }],
  productUrl: `https://www.n11.com/arama?q=${encodeURIComponent(title as string)}`,
}));

export class N11MockClient implements N11Client {
  async listProducts(page: number, pageSize: number): Promise<N11Page<N11ProductSummary>> {
    const start = page * pageSize;
    return {
      items: CATALOG.slice(start, start + pageSize),
      currentPage: page,
      pageCount: Math.ceil(CATALOG.length / pageSize),
      totalCount: CATALOG.length,
    };
  }
  async getProduct(n11Id: string): Promise<N11ProductDetail> {
    const p = CATALOG.find((x) => x.n11Id === n11Id);
    if (!p) throw new Error(`Ürün bulunamadı: ${n11Id}`);
    return p;
  }
  async listOrders(): Promise<N11Page<N11Order>> {
    return { items: [], currentPage: 0, pageCount: 0, totalCount: 0 };
  }
}
