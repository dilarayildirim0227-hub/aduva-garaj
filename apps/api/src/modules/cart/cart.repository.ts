import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma';
import { StockProvider, StockSnapshot } from './cart.types';

export interface StoredCartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId: string | null;
  vehicleId: string | null;
  quantity: number;
  unitPriceSnapshot: number; // kuruş
  createdAt: Date;
}

export interface StoredCart {
  id: string;
  userId: string | null;
  token: string | null;
  couponCode: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  items: StoredCartItem[];
}

export interface StoredCoupon {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED' | 'FREE_SHIPPING';
  value: number; // PERCENT: 1..100, FIXED: kuruş, FREE_SHIPPING: 0
  minTotal: number; // kuruş
  maxUses: number | null;
  usedCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
}

const CART_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 gün

/**
 * Yerel veritabanından stok/fiyat okuyan sağlayıcı
 */
@Injectable()
export class LocalStockProvider extends StockProvider {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getStockSnapshot(productId: string, variantId?: string | null): Promise<StockSnapshot | null> {
    if (this.prisma.isConnected) {
      const p = await this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          images: { take: 1, orderBy: { sortOrder: 'asc' } },
          variants: variantId ? { where: { id: variantId } } : false,
          fitments: { select: { vehicleId: true } },
        },
      });
      if (!p) return null;
      const v = variantId && Array.isArray(p.variants) ? p.variants[0] : null;
      if (variantId && !v) return null;
      const priceKurus = v
        ? (v.priceKurus || Math.round(Number(v.price) * 100))
        : (p.priceKurus || Math.round(Number(p.price) * 100));
      const stock = v ? v.stock : p.stock;
      return {
        productId: p.id,
        variantId: v?.id ?? null,
        title: v ? `${p.title} (${v.name})` : p.title,
        image: p.images[0]?.url ?? null,
        unitPriceKurus: priceKurus,
        stock,
        maxPerOrder: p.maxPerOrder || 10,
        available: p.status === 'ACTIVE' && !p.isHidden && stock > 0,
        isUniversal: p.isUniversal,
        fitmentVehicleIds: p.fitments.map((f: { vehicleId: string }) => f.vehicleId),
      };
    }

    // Yerel mağaza (LocalStore) yedek modu
    const p = this.prisma.store.products.find((x) => x.id === productId);
    if (!p) return null;
    const priceKurus = p.priceKurus !== undefined ? Number(p.priceKurus) : Math.round(Number(p.price) * 100);
    return {
      productId: p.id,
      variantId: variantId ?? null,
      title: p.title,
      image: p.image ?? p.images?.[0]?.url ?? null,
      unitPriceKurus: priceKurus,
      stock: Number(p.stock ?? 0),
      maxPerOrder: Number(p.maxPerOrder ?? 10),
      available: p.status === 'ACTIVE' && !p.isHidden && Number(p.stock ?? 0) > 0,
      isUniversal: Boolean(p.isUniversal),
      fitmentVehicleIds: p.fitmentVehicleIds ?? [],
    };
  }
}

/**
 * Sepet Repository Katmanı
 * Eşzamanlı isteklerde yarış durumunu (race condition) önlemek için
 * PostgreSQL'de `SELECT ... FOR UPDATE` satır kilidi + süreç içi anahtar bazlı mutex uygular.
 */
@Injectable()
export class CartRepository {
  private readonly cartsById = new Map<string, StoredCart>();
  private readonly locks = new Map<string, Promise<void>>();

  constructor(private readonly prisma: PrismaService) {}

  /** Aynı sepet/ürün üzerinde paralel işlemleri sıraya sokan kilit (SELECT ... FOR UPDATE + mutex) */
  async withLock<T>(lockKey: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(lockKey) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(lockKey, prev.then(() => next));
    await prev;
    try {
      if (this.prisma.isConnected) {
        return await this.prisma.$transaction(async (tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0]) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
          return fn();
        });
      }
      return await fn();
    } finally {
      release();
      if (this.locks.get(lockKey) === next) {
        this.locks.delete(lockKey);
      }
    }
  }

  private mapDbCartToStored(dbCart: any): StoredCart {
    return {
      id: dbCart.id,
      userId: dbCart.userId ?? null,
      token: dbCart.token ?? null,
      couponCode: dbCart.coupon?.code ?? null,
      createdAt: dbCart.createdAt,
      updatedAt: dbCart.updatedAt,
      expiresAt: dbCart.expiresAt,
      items: (dbCart.items || []).map((i: any) => ({
        id: i.id,
        cartId: i.cartId,
        productId: i.productId,
        variantId: i.variantId ?? null,
        vehicleId: i.vehicleId ?? null,
        quantity: i.quantity,
        unitPriceSnapshot: i.unitPriceSnapshot,
        createdAt: i.createdAt,
      })),
    };
  }

  async findOrCreateCart(identity: { userId?: string | null; token?: string | null }): Promise<StoredCart> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CART_TTL_MS);

    // BE-05 Çözümü: PostgreSQL bağlantısı aktifken sepetleri Prisma üzerinden kalıcı olarak oku/yaz
    if (this.prisma.isConnected) {
      if (identity.userId) {
        const existingUserCart = await this.prisma.cart.findFirst({
          where: { userId: identity.userId },
          include: { items: true, coupon: true },
        });
        if (existingUserCart) return this.mapDbCartToStored(existingUserCart);
      } else if (identity.token) {
        const existingGuestCart = await this.prisma.cart.findFirst({
          where: { token: identity.token, userId: null, expiresAt: { gt: now } },
          include: { items: true, coupon: true },
        });
        if (existingGuestCart) return this.mapDbCartToStored(existingGuestCart);
      }

      const created = await this.prisma.cart.create({
        data: {
          userId: identity.userId ?? null,
          token: identity.userId ? null : (identity.token ?? `gst_${randomUUID().replace(/-/g, '')}`),
          expiresAt,
        },
        include: { items: true, coupon: true },
      });
      return this.mapDbCartToStored(created);
    }

    for (const c of this.cartsById.values()) {
      if (identity.userId && c.userId === identity.userId) return c;
      if (!identity.userId && identity.token && c.token === identity.token && c.expiresAt > now) return c;
    }

    const cart: StoredCart = {
      id: `crt_${randomUUID().slice(0, 12)}`,
      userId: identity.userId ?? null,
      token: identity.userId ? null : (identity.token ?? `gst_${randomUUID().replace(/-/g, '')}`),
      couponCode: null,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      items: [],
    };
    this.cartsById.set(cart.id, cart);
    return cart;
  }

  async findGuestCartByToken(token: string): Promise<StoredCart | null> {
    const now = new Date();
    if (this.prisma.isConnected) {
      const dbCart = await this.prisma.cart.findFirst({
        where: { token, userId: null, expiresAt: { gt: now } },
        include: { items: true, coupon: true },
      });
      return dbCart ? this.mapDbCartToStored(dbCart) : null;
    }
    for (const c of this.cartsById.values()) {
      if (c.token === token && !c.userId && c.expiresAt > now) return c;
    }
    return null;
  }

  async saveCart(cart: StoredCart): Promise<StoredCart> {
    cart.updatedAt = new Date();
    cart.expiresAt = new Date(Date.now() + CART_TTL_MS);

    if (this.prisma.isConnected) {
      let couponId: string | null = null;
      if (cart.couponCode) {
        const cpn = await this.prisma.coupon.findUnique({ where: { code: cart.couponCode.toUpperCase() } });
        couponId = cpn?.id ?? null;
      }

      await this.prisma.cart.update({
        where: { id: cart.id },
        data: {
          couponId,
          expiresAt: cart.expiresAt,
          items: {
            deleteMany: {},
            create: cart.items.map((i) => ({
              id: i.id,
              productId: i.productId,
              variantId: i.variantId,
              vehicleId: i.vehicleId,
              quantity: i.quantity,
              unitPriceSnapshot: i.unitPriceSnapshot,
              createdAt: i.createdAt,
            })),
          },
        },
      });
      return cart;
    }

    this.cartsById.set(cart.id, cart);
    return cart;
  }

  async deleteCart(cartId: string): Promise<void> {
    if (this.prisma.isConnected) {
      await this.prisma.cart.deleteMany({ where: { id: cartId } });
      return;
    }
    this.cartsById.delete(cartId);
  }

  async purgeExpiredCarts(): Promise<number> {
    const now = new Date();
    if (this.prisma.isConnected) {
      const res = await this.prisma.cart.deleteMany({ where: { expiresAt: { lte: now } } });
      return res.count;
    }
    let purged = 0;
    for (const [id, cart] of this.cartsById.entries()) {
      if (cart.expiresAt <= now) {
        this.cartsById.delete(id);
        purged++;
      }
    }
    return purged;
  }

  async findCouponByCode(code: string): Promise<StoredCoupon | null> {
    const normalized = code.trim().toUpperCase();
    if (this.prisma.isConnected) {
      const dbCoupon = await this.prisma.coupon.findUnique({ where: { code: normalized } });
      if (!dbCoupon) return null;
      return {
        id: dbCoupon.id,
        code: dbCoupon.code,
        type:
          dbCoupon.type === 'PERCENT'
            ? 'PERCENT'
            : String(dbCoupon.type) === 'FREE_SHIPPING'
              ? 'FREE_SHIPPING'
              : 'FIXED',
        value: dbCoupon.value,
        minTotal: dbCoupon.minTotal,
        maxUses: dbCoupon.maxUses ?? null,
        usedCount: dbCoupon.usedCount,
        startsAt: dbCoupon.startsAt ?? null,
        endsAt: dbCoupon.endsAt ?? null,
        active: dbCoupon.active,
      };
    }

    const raw = this.prisma.store.coupons.find((c) => String(c.code).toUpperCase() === normalized);
    if (!raw) return null;
    // Kupon değerini kuruş cinsine normalize et
    const minTotalKurus =
      raw.minTotal !== undefined ? Number(raw.minTotal) : Math.round(Number(raw.minCartTotal ?? 0) * 100);
    const valueNormalized =
      raw.type === 'FREE_SHIPPING'
        ? 0
        : raw.type === 'PERCENT'
          ? Number(raw.value)
          : raw.value >= 1000
            ? Number(raw.value)
            : Math.round(Number(raw.value) * 100);

    return {
      id: raw.id ?? `cpn_${normalized}`,
      code: normalized,
      type:
        raw.type === 'PERCENT'
          ? 'PERCENT'
          : raw.type === 'FREE_SHIPPING'
            ? 'FREE_SHIPPING'
            : 'FIXED',
      value: valueNormalized,
      minTotal: minTotalKurus,
      maxUses: raw.maxUses ?? null,
      usedCount: Number(raw.usedCount ?? 0),
      startsAt: raw.startsAt ? new Date(raw.startsAt) : null,
      endsAt: raw.endsAt ? new Date(raw.endsAt) : null,
      active: raw.active !== false && raw.isActive !== false,
    };
  }
}
