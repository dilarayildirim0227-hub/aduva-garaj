import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ProductListQuery } from '@aduva/shared';
import { AppDomainError, ErrorCode } from '../../common/error-codes';
import { PrismaService } from '../../common/prisma';
import { normalizeTurkishSearch } from '../../common/catalog-generator';
import type {
  AdminProductCreateInput,
  AutocompleteQuery,
  FitmentCheckQuery,
  UserVehicleCreateInput,
} from './products.schemas';

// Türkçe karakter dönüşümlü SEO dostu slug üretici
export function toTurkishSlug(text: string): string {
  const charMap: Record<string, string> = {
    ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', I: 'i', İ: 'i',
    ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u',
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

export interface UserGarageItem {
  id: string;
  userId: string;
  vehicleId: string;
  nickname: string | null;
  vinCode: string | null;
  isPrimary: boolean;
  createdAt: string;
  vehicle: {
    id: string;
    brand: string;
    model: string;
    generation?: string;
    yearFrom: number;
    yearTo: number | null;
    body: string;
    engine: string;
  };
}

@Injectable()
export class ProductsService {
  private readonly userGarageStore = new Map<string, UserGarageItem[]>();
  private readonly recentlyViewedStore = new Map<string, string[]>();

  constructor(private readonly prisma: PrismaService) {}

  generateUniqueSlug(title: string, existingSlugs: Set<string>): string {
    const base = toTurkishSlug(title) || 'oto-aksesuar';
    if (!existingSlugs.has(base)) return base;
    let counter = 2;
    while (existingSlugs.has(`${base}-${counter}`)) {
      counter += 1;
    }
    return `${base}-${counter}`;
  }

  async list(q: ProductListQuery) {
    if (!this.prisma.isConnected) {
      let items = [...this.prisma.store.products].filter((p) => !p.isHidden);
      if (q.inStock) items = items.filter((p) => p.stock > 0);
      if (q.categoryId) items = items.filter((p) => p.categoryId === q.categoryId);
      if (q.vehicleId) {
        items = items.filter(
          (p) => p.isUniversal || (p.fitmentVehicleIds ?? []).includes(q.vehicleId!),
        );
      }
      if (q.q) {
        const needle = normalizeTurkishSearch(q.q);
        items = items.filter((p) => {
          const hay = normalizeTurkishSearch(
            `${p.title} ${p.brand ?? ''} ${p.sellerCode ?? ''} ${p.oemCode ?? ''}`,
          );
          return hay.includes(needle);
        });
      }
      if (q.minPrice !== undefined) items = items.filter((p) => p.price >= q.minPrice!);
      if (q.maxPrice !== undefined) items = items.filter((p) => p.price <= q.maxPrice!);

      if (q.sort === 'price_asc') items.sort((a, b) => a.price - b.price);
      else if (q.sort === 'price_desc') items.sort((a, b) => b.price - a.price);
      else if (q.sort === 'bestseller') items.sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0));

      const startIdx = q.cursor ? Math.max(0, items.findIndex((x) => x.id === q.cursor) + 1) : 0;
      const sliced = items.slice(startIdx, startIdx + q.limit + 1);
      const hasMore = sliced.length > q.limit;
      const page = hasMore ? sliced.slice(0, q.limit) : sliced;

      return {
        items: page,
        nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
      };
    }

    const where: Prisma.ProductWhereInput = {
      isHidden: false,
      deletedAt: null,
      status: { in: q.inStock ? ['ACTIVE'] : ['ACTIVE', 'OUT_OF_STOCK'] },
      ...(q.categoryId && { categoryId: q.categoryId }),
      ...(q.q && { title: { contains: q.q, mode: 'insensitive' } }),
      ...(q.vehicleId && {
        OR: [{ isUniversal: true }, { fitments: { some: { vehicleId: q.vehicleId } } }],
      }),
      ...((q.minPrice !== undefined || q.maxPrice !== undefined) && {
        price: { gte: q.minPrice, lte: q.maxPrice },
      }),
    };
    const orderBy: Prisma.ProductOrderByWithRelationInput[] = {
      newest: [{ createdAt: 'desc' as const }],
      price_asc: [{ price: 'asc' as const }],
      price_desc: [{ price: 'desc' as const }],
      bestseller: [{ soldCount: 'desc' as const }],
    }[q.sort];
    orderBy.push({ id: 'asc' });

    const items = await this.prisma.product.findMany({
      where,
      orderBy,
      take: q.limit + 1,
      ...(q.cursor && { cursor: { id: q.cursor }, skip: 1 }),
      select: {
        id: true,
        slug: true,
        title: true,
        price: true,
        listPrice: true,
        priceKurus: true,
        stock: true,
        status: true,
        ratingAvg: true,
        ratingCount: true,
        isUniversal: true,
        requiresMontage: true,
        brand: true,
        oemCode: true,
        sellerCode: true,
        images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
      },
    });
    const hasMore = items.length > q.limit;
    const page = hasMore ? items.slice(0, q.limit) : items;
    return {
      items: page.map(({ images, ...p }) => ({
        ...p,
        price: Number(p.price),
        listPrice: p.listPrice ? Number(p.listPrice) : null,
        image: images[0]?.url ?? null,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  async autocomplete(query: AutocompleteQuery) {
    const norm = normalizeTurkishSearch(query.q);
    const items = this.prisma.store.products
      .filter((p) => !p.isHidden && p.stock > 0)
      .map((p) => {
        const hay = normalizeTurkishSearch(
          `${p.title} ${p.brand ?? ''} ${p.oemCode ?? ''} ${p.sellerCode ?? ''}`,
        );
        const exactPrefix = hay.startsWith(norm) ? 100 : hay.includes(norm) ? 75 : 0;
        return { product: p, score: exactPrefix };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, query.limit)
      .map((x) => ({
        id: x.product.id,
        slug: x.product.slug ?? toTurkishSlug(x.product.title),
        title: x.product.title,
        brand: x.product.brand,
        oemCode: x.product.oemCode,
        sellerCode: x.product.sellerCode,
        price: x.product.price,
        priceKurus: x.product.priceKurus ?? Math.round(x.product.price * 100),
        image: x.product.image,
      }));

    return { query: query.q, suggestions: items };
  }

  async detail(slugOrId: string, viewerKey?: string) {
    const p = this.prisma.store.products.find(
      (x) => (x.slug === slugOrId || x.id === slugOrId) && !x.isHidden,
    );
    if (!p) {
      throw new AppDomainError(ErrorCode.PRODUCT_NOT_FOUND, 'Ürün bulunamadı.', 404);
    }
    if (viewerKey) {
      const prev = this.recentlyViewedStore.get(viewerKey) ?? [];
      const next = [p.id, ...prev.filter((id) => id !== p.id)].slice(0, 12);
      this.recentlyViewedStore.set(viewerKey, next);
    }
    return p;
  }

  async getRecommendations(productId: string, viewerKey?: string) {
    const target = this.prisma.store.products.find((p) => p.id === productId);
    if (!target) {
      throw new AppDomainError(ErrorCode.PRODUCT_NOT_FOUND, 'Ürün bulunamadı.', 404);
    }

    const activeProducts = this.prisma.store.products.filter(
      (p) => p.id !== productId && !p.isHidden && p.stock > 0,
    );

    // 1. Benzer Ürünler (Aynı kategori ve ortak araç uyumluluğu)
    const similarProducts = activeProducts
      .filter((p) => p.categoryId === target.categoryId)
      .slice(0, 4);

    // 2. Birlikte Alınanlar (Farklı tamamlayıcı kategoriden aynı araca uyumlu ürünler)
    const targetVehs = new Set<string>(target.fitmentVehicleIds ?? []);
    const boughtTogether = activeProducts
      .filter(
        (p) =>
          p.categoryId !== target.categoryId &&
          (p.isUniversal || (p.fitmentVehicleIds ?? []).some((vid: string) => targetVehs.has(vid))),
      )
      .slice(0, 4);

    // 3. Son Görüntülenenler
    const recentIds = viewerKey ? this.recentlyViewedStore.get(viewerKey) ?? [] : [];
    const recentlyViewed = recentIds
      .filter((id) => id !== productId)
      .map((id) => this.prisma.store.products.find((p) => p.id === id))
      .filter(Boolean)
      .slice(0, 6);

    return {
      productId,
      similarProducts,
      boughtTogether,
      recentlyViewed,
    };
  }

  // ---------- Araç Hiyerarşisi & Uyumluluk Motoru ----------
  getVehicleHierarchy() {
    const vehicles = this.prisma.store.vehicles;
    const tree: Record<
      string,
      Record<
        string,
        Array<{
          id: string;
          generation: string;
          yearFrom: number;
          yearTo: number | null;
          body: string;
          engine: string;
          ktypeCode?: string;
        }>
      >
    > = {};

    for (const v of vehicles) {
      if (!tree[v.brand]) tree[v.brand] = {};
      if (!tree[v.brand][v.model]) tree[v.brand][v.model] = [];
      tree[v.brand][v.model].push({
        id: v.id,
        generation: v.generation ?? `${v.model} (${v.yearFrom}-${v.yearTo ?? 'Günümüz'})`,
        yearFrom: v.yearFrom,
        yearTo: v.yearTo ?? null,
        body: v.body,
        engine: v.engine,
        ktypeCode: v.ktypeCode,
      });
    }

    return {
      totalBrands: Object.keys(tree).length,
      totalModels: vehicles.length,
      hierarchy: tree,
    };
  }

  checkFitment(query: FitmentCheckQuery) {
    const product = this.prisma.store.products.find((p) => p.id === query.productId);
    if (!product) {
      throw new AppDomainError(ErrorCode.PRODUCT_NOT_FOUND, 'Ürün bulunamadı.', 404);
    }
    const vehicle = this.prisma.store.vehicles.find((v) => v.id === query.vehicleId);
    if (!vehicle) {
      throw new AppDomainError(ErrorCode.VEHICLE_NOT_FOUND, 'Araç modeli bulunamadı.', 404);
    }

    const compatible =
      Boolean(product.isUniversal) ||
      (product.fitmentVehicleIds ?? []).includes(vehicle.id);

    return {
      productId: product.id,
      vehicleId: vehicle.id,
      vehicleLabel: `${vehicle.brand} ${vehicle.model} (${vehicle.yearFrom}-${vehicle.yearTo ?? 'Günümüz'} ${vehicle.engine})`,
      compatible,
      isUniversal: Boolean(product.isUniversal),
      fitmentWarning: !compatible,
      message: compatible
        ? `Bu ürün ${vehicle.brand} ${vehicle.model} aracınız ile %100 uyumludur.`
        : `Dikkat: Bu ürün ${vehicle.brand} ${vehicle.model} aracınız ile doğrudan eşleşmemektedir.`,
    };
  }

  // ---------- Kullanıcı "Garajım" (Çoklu Araç & Aktif Araç) ----------
  listUserGarage(userId: string): UserGarageItem[] {
    return this.userGarageStore.get(userId) ?? [];
  }

  addUserVehicle(userId: string, input: UserVehicleCreateInput): UserGarageItem {
    const vehicle = this.prisma.store.vehicles.find((v) => v.id === input.vehicleId);
    if (!vehicle) {
      throw new AppDomainError(ErrorCode.VEHICLE_NOT_FOUND, 'Seçilen araç modeli bulunamadı.', 404);
    }

    const current = this.userGarageStore.get(userId) ?? [];
    if (input.isPrimary) {
      for (const item of current) item.isPrimary = false;
    }

    const entry: UserGarageItem = {
      id: `uveh_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId,
      vehicleId: vehicle.id,
      nickname: input.nickname ?? `${vehicle.brand} ${vehicle.model}`,
      vinCode: input.vinCode ?? null,
      isPrimary: input.isPrimary || current.length === 0,
      createdAt: new Date().toISOString(),
      vehicle: {
        id: vehicle.id,
        brand: vehicle.brand,
        model: vehicle.model,
        generation: vehicle.generation,
        yearFrom: vehicle.yearFrom,
        yearTo: vehicle.yearTo ?? null,
        body: vehicle.body,
        engine: vehicle.engine,
      },
    };

    current.unshift(entry);
    this.userGarageStore.set(userId, current);
    return entry;
  }

  setPrimaryUserVehicle(userId: string, garageItemId: string): UserGarageItem[] {
    const current = this.userGarageStore.get(userId) ?? [];
    const target = current.find((x) => x.id === garageItemId || x.vehicleId === garageItemId);
    if (!target) {
      throw new AppDomainError(ErrorCode.VEHICLE_NOT_FOUND, 'Garajınızda bu araç bulunamadı.', 404);
    }
    for (const item of current) {
      item.isPrimary = item.id === target.id;
    }
    return current;
  }

  removeUserVehicle(userId: string, garageItemId: string): { deleted: boolean; items: UserGarageItem[] } {
    const current = this.userGarageStore.get(userId) ?? [];
    const next = current.filter((x) => x.id !== garageItemId && x.vehicleId !== garageItemId);
    if (next.length > 0 && !next.some((x) => x.isPrimary)) {
      next[0].isPrimary = true;
    }
    this.userGarageStore.set(userId, next);
    return { deleted: next.length < current.length, items: next };
  }

  // ---------- Admin Katalog CRUD ----------
  createProduct(input: AdminProductCreateInput) {
    const existingSlugs = new Set<string>(
      this.prisma.store.products.map((p) => String(p.slug ?? toTurkishSlug(p.title))),
    );
    const slug = this.generateUniqueSlug(input.title, existingSlugs);
    const price = Number((input.priceKurus / 100).toFixed(2));
    const listPrice = input.listPriceKurus
      ? Number((input.listPriceKurus / 100).toFixed(2))
      : null;

    const created = {
      id: `prd-custom-${Date.now()}`,
      n11Id: `${Math.floor(200000 + Math.random() * 799999)}`,
      sellerCode: input.sellerCode,
      oemCode: input.oemCode ?? `OEM-${input.sellerCode}`,
      title: input.title,
      description: input.description ?? input.title,
      slug,
      brand: input.brand,
      price,
      listPrice,
      priceKurus: input.priceKurus,
      listPriceKurus: input.listPriceKurus ?? null,
      vatRate: 20,
      stock: input.stock,
      maxPerOrder: input.maxPerOrder,
      status: input.stock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
      categoryId: input.categoryId,
      isUniversal: input.isUniversal,
      isFeatured: false,
      isHidden: false,
      requiresMontage: input.requiresMontage,
      ratingAvg: 5.0,
      ratingCount: 1,
      soldCount: 0,
      version: 1,
      n11Url: 'https://www.n11.com/magaza/aduvagaraj',
      image:
        input.imageUrl ??
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
      fitmentVehicleIds: input.fitmentVehicleIds,
      attributes: input.attributes,
    };

    this.prisma.store.products.unshift(created);
    return created;
  }
}
