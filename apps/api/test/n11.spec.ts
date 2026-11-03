import { asArray, mapOrderStatus, mapProductDetail, mapProductSummary, parseN11Date } from '../src/n11/n11.mapper';
import { withRetry } from '../src/n11/resilience';
import { hashDetail, toSlug } from '../src/sync/product-sync.service';

describe('n11.mapper', () => {
  it('asArray tekil/çoğul/boş değerleri diziye çevirir', () => {
    expect(asArray(undefined)).toEqual([]);
    expect(asArray({ a: 1 })).toEqual([{ a: 1 }]);
    expect(asArray([1, 2])).toEqual([1, 2]);
  });

  it('ürün özetini map eder, stokları toplar ve liste fiyatını belirler', () => {
    const p = mapProductSummary({
      id: 123,
      productSellerCode: 'ADV-1',
      title: ' Paspas ',
      price: '1499.00',
      displayPrice: '1249,50',
      saleStatus: '2',
      stockItems: { stockItem: [{ id: 1, quantity: '3' }, { id: 2, quantity: 4 }] },
    });
    expect(p).toMatchObject({ n11Id: '123', title: 'Paspas', price: 1249.5, listPrice: 1499, stock: 7, saleStatus: 'ACTIVE' });
  });

  it('detayda görselleri sıralar, geçersiz URL’leri atar ve markayı özelliklerden alır', () => {
    const d = mapProductDetail({
      id: 1, title: 'X', displayPrice: 10,
      images: { image: [{ url: 'https://b', order: 2 }, { url: 'https://a', order: 1 }, { url: 'bozuk', order: 0 }] },
      attributes: { attribute: { name: 'Marka', value: 'Aduva' } },
      category: { id: 9, name: 'Paspas' },
    });
    expect(d.images.map((i) => i.url)).toEqual(['https://a', 'https://b']);
    expect(d.brand).toBe('Aduva');
    expect(d.category).toEqual({ n11Id: '9', name: 'Paspas' });
  });

  it('sipariş durumlarını ve tarihleri çevirir', () => {
    expect(mapOrderStatus('6')).toBe('SHIPPED');
    expect(mapOrderStatus('999')).toBe('UNKNOWN');
    const d = parseN11Date('05/03/2026 14:30');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 5, 14]);
  });
});

describe('sync yardımcıları', () => {
  it('Türkçe karakterli başlıktan slug üretir', () => {
    expect(toSlug('Koltuk Kılıfı Şık Çift', '42')).toBe('koltuk-kilifi-sik-cift-42');
  });

  it('hash yalnızca n11 alanları değişince değişir', () => {
    const base: any = { title: 'A', price: 1, stock: 1, saleStatus: 'ACTIVE', images: [], attributes: {}, stockItems: [] };
    expect(hashDetail(base)).toBe(hashDetail({ ...base }));
    expect(hashDetail(base)).not.toBe(hashDetail({ ...base, price: 2 }));
  });
});

describe('withRetry', () => {
  it('geçici hatada yeniden dener ve başarır', async () => {
    let n = 0;
    const r = await withRetry(async () => { if (++n < 3) throw new Error('geçici'); return 'ok'; }, { baseMs: 1 });
    expect(r).toBe('ok');
    expect(n).toBe(3);
  });

  it('yeniden denenemez hatada hemen fırlatır', async () => {
    let n = 0;
    await expect(withRetry(async () => { n++; throw new Error('kalıcı'); }, { baseMs: 1, isRetryable: () => false })).rejects.toThrow('kalıcı');
    expect(n).toBe(1);
  });
});
