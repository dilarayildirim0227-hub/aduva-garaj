import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { createHash } from 'crypto';
import slugify from 'slugify';
import { PrismaService } from '../common/prisma';
import { N11_CLIENT, N11Client, N11ProductDetail } from '../n11/n11-client.interface';

const PAGE_SIZE = 50;

export type SyncStatus = 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';

export interface ProductChange {
  productId: string;
  oldPrice?: number;
  newPrice?: number;
  oldStock?: number;
  newStock?: number;
}

export const toSlug = (title: string, n11Id: string) =>
  `${slugify(title, { lower: true, strict: true, locale: 'tr' }).slice(0, 80)}-${n11Id}`;

/** n11'den gelen alanların özeti — değişmediyse DB yazımı atlanır */
export function hashDetail(d: N11ProductDetail): string {
  return createHash('sha1')
    .update(JSON.stringify([d.title, d.price, d.listPrice, d.stock, d.saleStatus, d.description, d.images, d.attributes, d.stockItems, d.category]))
    .digest('hex');
}

@Injectable()
export class ProductSyncService {
  private readonly logger = new Logger('ProductSync');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(N11_CLIENT) private readonly n11: N11Client,
  ) {}

  /** Tam ürün senkronu. Dönen `changes` fiyat düşüşü / stok geldi bildirimleri için kullanılır. */
  async run(trigger: 'cron' | 'manual' = 'cron') {
    const log = await this.prisma.syncLog.create({
      data: { type: 'PRODUCTS', trigger: trigger === 'manual' ? 'MANUAL' : 'CRON', status: 'RUNNING' },
    });
    const errors: { ref: string; message: string }[] = [];
    const seen = new Set<string>();
    const changes: ProductChange[] = [];
    let created = 0, updated = 0, total = 0;

    try {
      let page = 0, pageCount = 1;
      while (page < pageCount) {
        const res = await this.n11.listProducts(page, PAGE_SIZE);
        pageCount = res.pageCount;
        for (const summary of res.items) {
          total++;
          seen.add(summary.n11Id);
          try {
            const detail = await this.n11.getProduct(summary.n11Id);
            const r = await this.upsert(detail);
            if (r.created) created++;
            if (r.updated) updated++;
            if (r.change) changes.push(r.change);
          } catch (e: any) {
            errors.push({ ref: summary.n11Id, message: e?.message ?? String(e) });
            this.logger.error(`Ürün ${summary.n11Id} senkronlanamadı: ${e?.message}`);
          }
        }
        page++;
      }

      // n11'de artık listelenmeyen ürünleri pasife al (sadece liste eksiksiz çekildiyse)
      if (total > 0 && errors.length === 0) {
        await this.prisma.product.updateMany({
          where: { n11Id: { notIn: [...seen] }, status: { not: ProductStatus.PASSIVE } },
          data: { status: ProductStatus.PASSIVE },
        });
      }

      const status: SyncStatus = errors.length === 0 ? 'SUCCESS' : errors.length < total ? 'PARTIAL' : 'FAILED';
      await this.finish(log.id, status, { total, created, updated, failed: errors.length, errors });
      this.logger.log(`Senkron bitti: ${status} toplam=${total} yeni=${created} güncel=${updated} hata=${errors.length}`);
      return { logId: log.id, status, total, created, updated, failed: errors.length, changes };
    } catch (e: any) {
      errors.push({ ref: 'list', message: e?.message ?? String(e) });
      await this.finish(log.id, 'FAILED', { total, created, updated, failed: errors.length, errors });
      throw e;
    }
  }

  private finish(id: string, status: SyncStatus, d: { total: number; created: number; updated: number; failed: number; errors: unknown[] }) {
    return this.prisma.syncLog.update({
      where: { id },
      data: {
        status,
        finishedAt: new Date(),
        total: d.total,
        created: d.created,
        updated: d.updated,
        failed: d.failed,
        error: d.errors.length ? JSON.stringify(d.errors.slice(0, 50)) : null,
      },
    });
  }

  async upsert(d: N11ProductDetail): Promise<{ created: boolean; updated: boolean; change?: ProductChange }> {
    const existing = await this.prisma.product.findUnique({
      where: { n11Id: d.n11Id },
      select: { id: true, price: true, stock: true, isHidden: true },
    });

    const categoryId = d.category ? await this.ensureCategory(d.category.n11Id, d.category.name) : null;
    const status: ProductStatus =
      d.saleStatus === 'PASSIVE' ? 'PASSIVE' : d.stock <= 0 ? 'OUT_OF_STOCK' : 'ACTIVE';

    const priceKurus = Math.round(Number(d.price) * 100);
    const listPriceKurus = d.listPrice ? Math.round(Number(d.listPrice) * 100) : null;

    // Not: isFeatured, isHidden, isUniversal, fitments gibi uygulamaya özel alanlara DOKUNULMAZ.
    const n11Fields = {
      sellerCode: d.sellerCode || d.n11Id,
      title: d.title,
      description: d.description,
      brand: d.brand,
      price: new Prisma.Decimal(d.price),
      listPrice: d.listPrice ? new Prisma.Decimal(d.listPrice) : null,
      priceKurus,
      listPriceKurus,
      stock: d.stock,
      status,
      attributes: (d.attributes || {}) as Prisma.InputJsonValue,
      categoryId,
      n11Url: d.productUrl,
      lastSyncedAt: new Date(),
    };

    const product = await this.prisma.$transaction(async (tx) => {
      const p = await tx.product.upsert({
        where: { n11Id: d.n11Id },
        create: { n11Id: d.n11Id, slug: toSlug(d.title, d.n11Id), ...n11Fields },
        update: n11Fields,
      });
      await tx.productImage.deleteMany({ where: { productId: p.id } });
      if (d.images.length) {
        await tx.productImage.createMany({
          data: d.images.map((img, i) => ({ productId: p.id, url: img.url, sortOrder: i })),
        });
      }
      // Varyantlar: birden fazla stok kalemi varsa
      const keep: string[] = [];
      if (d.stockItems && d.stockItems.length > 1) {
        for (const s of d.stockItems) {
          const name = Object.values(s.attributes || {}).join(' / ') || s.sellerCode || 'Standart';
          const sku = s.sellerCode || `N11-${s.n11StockId}`;
          const variantPriceKurus = Math.round(Number(s.price ?? d.price) * 100);
          const v = await tx.productVariant.upsert({
            where: { sku },
            create: {
              productId: p.id,
              sku,
              n11Id: String(s.n11StockId),
              name,
              attributes: (s.attributes || {}) as Prisma.InputJsonValue,
              price: new Prisma.Decimal(s.price ?? d.price),
              priceKurus: variantPriceKurus,
              stock: s.quantity,
            },
            update: {
              name,
              attributes: (s.attributes || {}) as Prisma.InputJsonValue,
              price: new Prisma.Decimal(s.price ?? d.price),
              priceKurus: variantPriceKurus,
              stock: s.quantity,
            },
          });
          keep.push(v.id);
        }
      }
      if (keep.length > 0) {
        await tx.productVariant.deleteMany({ where: { productId: p.id, id: { notIn: keep }, cartItems: { none: {} }, orderItems: { none: {} } } });
      }
      return p;
    });

    let change: ProductChange | undefined;
    if (existing) {
      const oldPrice = Number(existing.price);
      if (oldPrice !== d.price || existing.stock !== d.stock) {
        change = { productId: product.id, oldPrice, newPrice: d.price, oldStock: existing.stock, newStock: d.stock };
      }
    }

    return { created: !existing, updated: !!existing, change };
  }

  private async ensureCategory(n11Id: string, name: string): Promise<string> {
    const c = await this.prisma.category.upsert({
      where: { n11Id },
      create: { n11Id, name, slug: `${slugify(name, { lower: true, strict: true, locale: 'tr' })}-${n11Id}`.slice(0, 100) },
      update: { name },
    });
    return c.id;
  }
}
