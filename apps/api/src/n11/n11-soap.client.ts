import { Logger } from '@nestjs/common';
import * as soap from 'soap';
import type { N11Client, N11Order, N11Page, N11ProductDetail, N11ProductSummary } from './n11-client.interface';
import { asArray, formatN11Date, mapOrder, mapProductDetail, mapProductSummary, num } from './n11.mapper';
import { RateLimiter, withRetry } from './resilience';

type ServiceName = 'ProductService' | 'OrderService' | 'CategoryService';

export class N11ApiError extends Error {
  constructor(message: string, readonly errorCode?: string, readonly retryable = false) {
    super(message);
  }
}

/**
 * Resmi n11 SOAP Satıcı API istemcisi.
 * WSDL: {N11_BASE_URL}/{Service}.wsdl  — ör. https://api.n11.com/ws/ProductService.wsdl
 * Kimlik: her istekte auth: { appKey, appSecret }
 */
export class N11SoapClient implements N11Client {
  private readonly logger = new Logger('N11SoapClient');
  private readonly clients = new Map<ServiceName, Promise<soap.Client>>();
  // TODO(n11): Resmi rate limit değeri dokümante değil; muhafazakâr 3 istek/sn
  private readonly limiter = new RateLimiter(3);

  constructor(
    private readonly appKey: string,
    private readonly appSecret: string,
    private readonly baseUrl = 'https://api.n11.com/ws',
  ) {}

  private client(name: ServiceName): Promise<soap.Client> {
    if (!this.clients.has(name)) {
      const p = soap.createClientAsync(`${this.baseUrl}/${name}.wsdl`, { disableCache: false });
      p.catch(() => this.clients.delete(name)); // hata olursa bir sonraki çağrıda tekrar dene
      this.clients.set(name, p);
    }
    return this.clients.get(name)!;
  }

  private async call(service: ServiceName, method: string, args: Record<string, unknown>): Promise<any> {
    return withRetry(
      async () => {
        await this.limiter.take();
        const c = await this.client(service);
        let res: any;
        try {
          [res] = await c[`${method}Async`]({ auth: { appKey: this.appKey, appSecret: this.appSecret }, ...args });
        } catch (e: any) {
          // Ağ / 5xx hataları yeniden denenir
          throw new N11ApiError(e?.message ?? 'SOAP hatası', undefined, true);
        }
        const result = res?.result;
        if (result?.status && String(result.status).toLowerCase() !== 'success') {
          const code = result.errorCode ? String(result.errorCode) : undefined;
          // TODO(n11): hangi errorCode'ların geçici olduğu dokümante edilmeli (ör. throttling)
          const retryable = /limit|timeout|throttl|SERVICE/i.test(`${code} ${result.errorMessage}`);
          throw new N11ApiError(result.errorMessage ?? 'n11 hata döndü', code, retryable);
        }
        return res;
      },
      {
        retries: 4,
        isRetryable: (e) => e instanceof N11ApiError && e.retryable,
        onRetry: (e: any, attempt, delay) =>
          this.logger.warn(`${service}.${method} deneme ${attempt} (${delay}ms sonra): ${e?.message}`),
      },
    );
  }

  async listProducts(page: number, pageSize: number): Promise<N11Page<N11ProductSummary>> {
    const res = await this.call('ProductService', 'GetProductList', {
      pagingData: { currentPage: page, pageSize },
    });
    return {
      items: asArray(res.products?.product).map(mapProductSummary),
      currentPage: num(res.pagingData?.currentPage),
      pageCount: num(res.pagingData?.pageCount),
      totalCount: num(res.pagingData?.totalCount),
    };
  }

  async getProduct(n11Id: string): Promise<N11ProductDetail> {
    const res = await this.call('ProductService', 'GetProductByProductId', { productId: n11Id });
    return mapProductDetail(res.product);
  }

  async listOrders(from: Date, to: Date, page: number): Promise<N11Page<N11Order>> {
    // TODO(n11): DetailedOrderList parametre yapısı (searchData.period) doğrulanmalı
    const res = await this.call('OrderService', 'DetailedOrderList', {
      searchData: { period: { startDate: formatN11Date(from), endDate: formatN11Date(to) } },
      pagingData: { currentPage: page, pageSize: 100 },
    });
    return {
      items: asArray(res.orderList?.order).map(mapOrder),
      currentPage: num(res.pagingData?.currentPage),
      pageCount: num(res.pagingData?.pageCount),
      totalCount: num(res.pagingData?.totalCount),
    };
  }
}
