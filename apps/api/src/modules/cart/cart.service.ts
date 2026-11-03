import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma';
import { CartRepository, StoredCart } from './cart.repository';
import {
  AddCartItemInput,
  ApplyCouponInput,
  CartDomainException,
  CartItemView,
  CartSummaryView,
  CartView,
  N11StockProvider,
  UpdateCartItemInput,
} from './cart.types';

/** Varsayılan kargo ayarları (kuruş cinsinden integer: 750 TL = 75000 kuruş, 79.90 TL = 7990 kuruş) */
const DEFAULT_FREE_SHIPPING_THRESHOLD_KURUS = 75000;
const DEFAULT_SHIPPING_FEE_KURUS = 7990;
const DEFAULT_MAX_PER_ORDER = 10;

export interface CartIdentity {
  userId?: string | null;
  token?: string | null;
}

@Injectable()
export class CartService {
  constructor(
    private readonly repo: CartRepository,
    private readonly stockProvider: N11StockProvider,
    private readonly prisma: PrismaService,
  ) {}

  /** Ücretsiz kargo eşiğini kuruş cinsinden döner */
  private getFreeShippingThresholdKurus(): number {
    const envVal = process.env.CART_FREE_SHIPPING_KURUS;
    if (envVal && !Number.isNaN(Number(envVal))) {
      return Math.round(Number(envVal));
    }
    const rawSetting = Number(this.prisma.store?.settings?.free_shipping_threshold ?? 750);
    // Ayar TL cinsindeyse (< 10000) kuruşa çevir, kuruşsa olduğu gibi kullan
    return rawSetting < 10000 ? Math.round(rawSetting * 100) : Math.round(rawSetting);
  }

  /** Sabit kargo ücretini kuruş cinsinden döner */
  private getShippingFeeKurus(): number {
    const envVal = process.env.CART_SHIPPING_FEE_KURUS;
    if (envVal && !Number.isNaN(Number(envVal))) {
      return Math.round(Number(envVal));
    }
    const rawSetting = Number(this.prisma.store?.settings?.shipping_flat_rate ?? 79.9);
    return rawSetting < 1000 ? Math.round(rawSetting * 100) : Math.round(rawSetting);
  }

  /**
   * Sepeti getirir ve güncel stok/fiyat/kupon/kargo/KDV hesaplamalarını kuruş cinsinden yapar.
   */
  async getCart(identity: CartIdentity): Promise<{ cart: CartView; token: string | null }> {
    const stored = await this.repo.findOrCreateCart(identity);
    const view = await this.buildCartView(stored);
    return { cart: view, token: stored.token };
  }

  /**
   * Header rozeti için sadece adet ve toplam döner (/api/cart/summary)
   */
  async getSummary(identity: CartIdentity): Promise<{ summary: CartSummaryView; token: string | null }> {
    const { cart, token } = await this.getCart(identity);
    return {
      token,
      summary: {
        itemCount: cart.itemCount,
        total: cart.total,
        freeShippingRemaining: cart.freeShippingRemaining,
        currency: 'TRY',
      },
    };
  }

  /**
   * Sepete ürün ekler veya mevcut satırın miktarını artırır.
   * Eşzamanlı isteklerde SELECT ... FOR UPDATE / kilit mekanizması ile yarış durumunu önler.
   */
  async addItem(
    identity: CartIdentity,
    input: AddCartItemInput,
  ): Promise<{ cart: CartView; token: string | null }> {
    const lockKey = `cart_product_${input.productId}_${input.variantId ?? 'base'}`;

    return this.repo.withLock(lockKey, async () => {
      const snapshot = await this.stockProvider.getStockSnapshot(input.productId, input.variantId);
      if (!snapshot) {
        throw new CartDomainException(
          'PRODUCT_UNAVAILABLE',
          'Bu ürün bulunamadı veya satıştan kaldırıldı.',
          HttpStatus.CONFLICT,
          { productId: input.productId, variantId: input.variantId ?? null },
        );
      }

      if (!snapshot.available) {
        if (snapshot.stock <= 0) {
          throw new CartDomainException(
            'OUT_OF_STOCK',
            `"${snapshot.title}" ürünü şu anda stokta bulunmamaktadır.`,
            HttpStatus.CONFLICT,
            { productId: input.productId, availableStock: 0 },
          );
        }
        throw new CartDomainException(
          'PRODUCT_UNAVAILABLE',
          `"${snapshot.title}" ürünü şu anda satışa kapalıdır.`,
          HttpStatus.CONFLICT,
          { productId: input.productId },
        );
      }

      const stored = await this.repo.findOrCreateCart(identity);
      const existingLine = stored.items.find(
        (i) => i.productId === input.productId && (i.variantId ?? null) === (input.variantId ?? null),
      );

      const currentQty = existingLine ? existingLine.quantity : 0;
      const targetQty = currentQty + input.quantity;
      const maxPerOrder = snapshot.maxPerOrder || DEFAULT_MAX_PER_ORDER;

      // Kural 5: Maksimum satır başı miktar kontrolü
      if (targetQty > maxPerOrder) {
        throw new CartDomainException(
          'MAX_QUANTITY_EXCEEDED',
          `Bu üründen tek siparişte en fazla ${maxPerOrder} adet ekleyebilirsiniz (sepette: ${currentQty}).`,
          HttpStatus.CONFLICT,
          { maxPerOrder, currentQuantity: currentQty, requestedAdd: input.quantity },
        );
      }

      // Kural 4: Stok doğrulama
      if (targetQty > snapshot.stock) {
        throw new CartDomainException(
          'OUT_OF_STOCK',
          `Yetersiz stok! "${snapshot.title}" için mevcut stok ${snapshot.stock} adettir (sepette: ${currentQty}, eklenmek istenen: ${input.quantity}).`,
          HttpStatus.CONFLICT,
          { availableStock: snapshot.stock, currentQuantity: currentQty, requestedQuantity: targetQty },
        );
      }

      if (existingLine) {
        existingLine.quantity = targetQty;
        if (input.vehicleId !== undefined) {
          existingLine.vehicleId = input.vehicleId ?? null;
        }
      } else {
        stored.items.push({
          id: `ci_${randomUUID().slice(0, 10)}`,
          cartId: stored.id,
          productId: input.productId,
          variantId: input.variantId ?? null,
          vehicleId: input.vehicleId ?? null,
          quantity: input.quantity,
          unitPriceSnapshot: snapshot.unitPriceKurus,
          createdAt: new Date(),
        });
      }

      await this.repo.saveCart(stored);
      const view = await this.buildCartView(stored);
      return { cart: view, token: stored.token };
    });
  }

  /**
   * Sepet satırı miktarını günceller (PATCH /api/cart/items/:itemId)
   */
  async updateItemQuantity(
    identity: CartIdentity,
    itemId: string,
    input: UpdateCartItemInput,
  ): Promise<{ cart: CartView; token: string | null }> {
    const stored = await this.repo.findOrCreateCart(identity);
    const line = stored.items.find((i) => i.id === itemId);
    if (!line) {
      throw new CartDomainException(
        'PRODUCT_UNAVAILABLE',
        'Güncellenmek istenen sepet satırı bulunamadı.',
        HttpStatus.NOT_FOUND,
        { itemId },
      );
    }

    const lockKey = `cart_product_${line.productId}_${line.variantId ?? 'base'}`;
    return this.repo.withLock(lockKey, async () => {
      const snapshot = await this.stockProvider.getStockSnapshot(line.productId, line.variantId);
      if (!snapshot || !snapshot.available) {
        throw new CartDomainException(
          'PRODUCT_UNAVAILABLE',
          'Bu ürün artık satışta değil veya stokları tükendi.',
          HttpStatus.CONFLICT,
          { itemId, productId: line.productId },
        );
      }

      const maxPerOrder = snapshot.maxPerOrder || DEFAULT_MAX_PER_ORDER;
      if (input.quantity > maxPerOrder) {
        throw new CartDomainException(
          'MAX_QUANTITY_EXCEEDED',
          `Bu üründen en fazla ${maxPerOrder} adet sipariş verebilirsiniz.`,
          HttpStatus.CONFLICT,
          { maxPerOrder, requestedQuantity: input.quantity },
        );
      }

      if (input.quantity > snapshot.stock) {
        throw new CartDomainException(
          'OUT_OF_STOCK',
          `Stok yetersiz! "${snapshot.title}" ürünü için en fazla ${snapshot.stock} adet seçebilirsiniz.`,
          HttpStatus.CONFLICT,
          { availableStock: snapshot.stock, requestedQuantity: input.quantity },
        );
      }

      line.quantity = input.quantity;
      await this.repo.saveCart(stored);
      const view = await this.buildCartView(stored);
      return { cart: view, token: stored.token };
    });
  }

  /**
   * Sepetten tek bir satırı siler (DELETE /api/cart/items/:itemId)
   */
  async removeItem(
    identity: CartIdentity,
    itemId: string,
  ): Promise<{ cart: CartView; token: string | null }> {
    const stored = await this.repo.findOrCreateCart(identity);
    stored.items = stored.items.filter((i) => i.id !== itemId);
    if (stored.items.length === 0) {
      stored.couponCode = null;
    }
    await this.repo.saveCart(stored);
    const view = await this.buildCartView(stored);
    return { cart: view, token: stored.token };
  }

  /**
   * Sepeti tamamen boşaltır (DELETE /api/cart)
   */
  async clearCart(identity: CartIdentity): Promise<{ cart: CartView; token: string | null }> {
    const stored = await this.repo.findOrCreateCart(identity);
    stored.items = [];
    stored.couponCode = null;
    await this.repo.saveCart(stored);
    const view = await this.buildCartView(stored);
    return { cart: view, token: stored.token };
  }

  /**
   * Sepete kupon kodu uygular (POST /api/cart/coupon). Aynı anda tek kupon.
   */
  async applyCoupon(
    identity: CartIdentity,
    input: ApplyCouponInput,
  ): Promise<{ cart: CartView; token: string | null }> {
    const stored = await this.repo.findOrCreateCart(identity);
    const coupon = await this.repo.findCouponByCode(input.code);

    if (!coupon || !coupon.active) {
      throw new CartDomainException(
        'INVALID_COUPON',
        `"${input.code}" geçerli bir indirim kuponu değil.`,
        HttpStatus.BAD_REQUEST,
        { code: input.code },
      );
    }

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      throw new CartDomainException(
        'INVALID_COUPON',
        `"${coupon.code}" kuponunun kullanım süresi henüz başlamadı.`,
        HttpStatus.BAD_REQUEST,
        { code: coupon.code },
      );
    }

    if (coupon.endsAt && coupon.endsAt < now) {
      throw new CartDomainException(
        'COUPON_EXPIRED',
        `"${coupon.code}" kuponunun kullanım süresi dolmuştur.`,
        HttpStatus.BAD_REQUEST,
        { code: coupon.code, endsAt: coupon.endsAt.toISOString() },
      );
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new CartDomainException(
        'INVALID_COUPON',
        `"${coupon.code}" kuponu maksimum kullanım limitine ulaşmıştır.`,
        HttpStatus.BAD_REQUEST,
        { code: coupon.code },
      );
    }

    // Ara toplamı kontrol et
    const currentView = await this.buildCartView(stored);
    if (currentView.subtotal < coupon.minTotal) {
      const minTl = (coupon.minTotal / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
      const subTl = (currentView.subtotal / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
      throw new CartDomainException(
        'MIN_TOTAL_NOT_MET',
        `"${coupon.code}" kuponu için minimum sepet tutarı ${minTl} TL olmalıdır (mevcut: ${subTl} TL).`,
        HttpStatus.BAD_REQUEST,
        { minTotal: coupon.minTotal, currentSubtotal: currentView.subtotal },
      );
    }

    stored.couponCode = coupon.code;
    await this.repo.saveCart(stored);
    const view = await this.buildCartView(stored);
    return { cart: view, token: stored.token };
  }

  /**
   * Sepetteki kuponu kaldırır (DELETE /api/cart/coupon)
   */
  async removeCoupon(identity: CartIdentity): Promise<{ cart: CartView; token: string | null }> {
    const stored = await this.repo.findOrCreateCart(identity);
    stored.couponCode = null;
    await this.repo.saveCart(stored);
    const view = await this.buildCartView(stored);
    return { cart: view, token: stored.token };
  }

  /**
   * Kural 2: Kullanıcı giriş yaptığında misafir sepetini kullanıcı sepetiyle birleştirir.
   * Aynı ürün+varyantta miktarlar toplanır, stok sınırı ve maxPerOrder sınırı aşılmaz.
   */
  async mergeGuestCart(
    userId: string,
    guestToken?: string | null,
  ): Promise<{ cart: CartView; token: string | null }> {
    const userCart = await this.repo.findOrCreateCart({ userId });
    if (!guestToken) {
      const view = await this.buildCartView(userCart);
      return { cart: view, token: null };
    }

    const guestCart = await this.repo.findGuestCartByToken(guestToken);
    if (!guestCart || guestCart.items.length === 0) {
      const view = await this.buildCartView(userCart);
      return { cart: view, token: null };
    }

    for (const guestItem of guestCart.items) {
      const snapshot = await this.stockProvider.getStockSnapshot(guestItem.productId, guestItem.variantId);
      if (!snapshot || !snapshot.available || snapshot.stock <= 0) {
        continue;
      }

      const maxAllowed = Math.min(snapshot.stock, snapshot.maxPerOrder || DEFAULT_MAX_PER_ORDER);
      const existing = userCart.items.find(
        (i) => i.productId === guestItem.productId && (i.variantId ?? null) === (guestItem.variantId ?? null),
      );

      if (existing) {
        existing.quantity = Math.min(existing.quantity + guestItem.quantity, maxAllowed);
        if (!existing.vehicleId && guestItem.vehicleId) {
          existing.vehicleId = guestItem.vehicleId;
        }
      } else {
        userCart.items.push({
          ...guestItem,
          id: `ci_${randomUUID().slice(0, 10)}`,
          cartId: userCart.id,
          quantity: Math.min(guestItem.quantity, maxAllowed),
        });
      }
    }

    if (!userCart.couponCode && guestCart.couponCode) {
      userCart.couponCode = guestCart.couponCode;
    }

    await this.repo.saveCart(userCart);
    await this.repo.deleteCart(guestCart.id);

    const view = await this.buildCartView(userCart);
    return { cart: view, token: null };
  }

  /**
   * Sepet görünümünü ve tüm kuruş bazlı tutarları hesaplar.
   * Kural 3: unitPriceSnapshot ile güncel fiyat farklıysa priceChanged = true
   * Kural 6: Pasif/silinmiş/stoksuz ürün sepette kalmışsa unavailable = true ve toplamdan çıkarılır
   * Kural 7: vehicleId uyumsuzsa fitmentWarning = true
   * Kural 9: Ücretsiz kargo eşiği ve freeShippingRemaining hesabı
   * Kural 10: Tüm hesaplamalar kuruş cinsinden integer, KDV dahil fiyat ve %20 KDV iç kırılımı
   */
  private async buildCartView(stored: StoredCart): Promise<CartView> {
    const itemsView: CartItemView[] = [];
    let subtotalKurus = 0;
    let activeItemCount = 0;

    for (const item of stored.items) {
      const snapshot = await this.stockProvider.getStockSnapshot(item.productId, item.variantId);

      if (!snapshot) {
        itemsView.push({
          id: item.id,
          productId: item.productId,
          variantId: item.variantId,
          title: 'Satıştan Kaldırılan Ürün',
          image: null,
          quantity: item.quantity,
          unitPrice: item.unitPriceSnapshot,
          unitPriceSnapshot: item.unitPriceSnapshot,
          lineTotal: 0,
          stock: 0,
          maxPerOrder: DEFAULT_MAX_PER_ORDER,
          priceChanged: false,
          unavailable: true,
          fitmentWarning: false,
        });
        continue;
      }

      const unavailable = !snapshot.available || snapshot.stock <= 0;
      const priceChanged = snapshot.unitPriceKurus !== item.unitPriceSnapshot;

      // Kural 7: Araç uyumluluğu kontrolü
      let fitmentWarning = false;
      if (item.vehicleId && !snapshot.isUniversal) {
        fitmentWarning = !snapshot.fitmentVehicleIds.includes(item.vehicleId);
      }

      const effectiveQty = unavailable ? item.quantity : Math.min(item.quantity, snapshot.stock);
      const lineTotalKurus = unavailable ? 0 : snapshot.unitPriceKurus * effectiveQty;

      if (!unavailable) {
        subtotalKurus += lineTotalKurus;
        activeItemCount += effectiveQty;
      }

      itemsView.push({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        title: snapshot.title,
        image: snapshot.image,
        quantity: effectiveQty,
        unitPrice: snapshot.unitPriceKurus,
        unitPriceSnapshot: item.unitPriceSnapshot,
        lineTotal: lineTotalKurus,
        stock: snapshot.stock,
        maxPerOrder: snapshot.maxPerOrder || DEFAULT_MAX_PER_ORDER,
        priceChanged,
        unavailable,
        fitmentWarning,
      });
    }

    // Kupon indirimi hesapla (kuruş integer)
    let discountKurus = 0;
    let appliedCoupon: CartView['coupon'] = null;

    if (stored.couponCode && subtotalKurus > 0) {
      const coupon = await this.repo.findCouponByCode(stored.couponCode);
      const now = new Date();
      const isValid =
        coupon &&
        coupon.active &&
        (!coupon.startsAt || coupon.startsAt <= now) &&
        (!coupon.endsAt || coupon.endsAt >= now) &&
        (coupon.maxUses === null || coupon.usedCount < coupon.maxUses) &&
        subtotalKurus >= coupon.minTotal;

      if (isValid && coupon) {
        if (coupon.type === 'PERCENT') {
          discountKurus = Math.round((subtotalKurus * coupon.value) / 100);
        } else if (coupon.type === 'FREE_SHIPPING') {
          discountKurus = 0;
        } else {
          discountKurus = Math.min(subtotalKurus, coupon.value);
        }
        appliedCoupon = {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
        };
      } else {
        // Kupon artık şartları sağlamıyorsa sepetten düşür
        stored.couponCode = null;
      }
    }

    const discountedSubtotalKurus = Math.max(0, subtotalKurus - discountKurus);
    const freeShippingThreshold = this.getFreeShippingThresholdKurus();
    const shippingFee = this.getShippingFeeKurus();
    const isFreeShippingCoupon = appliedCoupon?.type === 'FREE_SHIPPING';

    const shippingKurus =
      isFreeShippingCoupon || discountedSubtotalKurus === 0 || discountedSubtotalKurus >= freeShippingThreshold
        ? 0
        : shippingFee;

    const freeShippingRemaining =
      isFreeShippingCoupon || discountedSubtotalKurus >= freeShippingThreshold
        ? 0
        : Math.max(0, freeShippingThreshold - discountedSubtotalKurus);

    const totalKurus = discountedSubtotalKurus + shippingKurus;

    // KDV (%20) dahil fiyattan iç KDV kırılımı: Net * 20 / 120 (tam kuruş yuvarlama)
    const taxKurus = Math.round((totalKurus * 20) / 120);

    return {
      id: stored.id,
      items: itemsView,
      subtotal: subtotalKurus,
      discount: discountKurus,
      shipping: shippingKurus,
      tax: taxKurus,
      total: totalKurus,
      coupon: appliedCoupon,
      freeShippingRemaining,
      freeShippingThreshold,
      itemCount: activeItemCount,
      currency: 'TRY',
    };
  }
}
