import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AppDomainError, ErrorCode } from '../../common/error-codes';
import { StructuredLogger } from '../../common/observability';
import { PrismaService } from '../../common/prisma';
import {
  AddressCreateInput,
  AddressUpdateInput,
  AppointmentCreateInput,
  CampaignCreateInput,
  CouponCreateInput,
  KvkkConsentUpdateInput,
  ProductAlertInput,
  ReviewCreateInput,
} from './users.schemas';
import { AppointmentStatus, CouponType } from '@aduva/shared';

export interface StoredAddress {
  id: string;
  userId: string;
  title: string;
  recipient: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string;
  fullAddress: string;
  postalCode: string | null;
  isDefault: boolean;
  invoiceType: 'INDIVIDUAL' | 'CORPORATE';
  tcIdentityNumber: string | null;
  companyName: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredFavorite {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
}

export interface StoredProductAlert {
  id: string;
  userId: string;
  productId: string;
  variantId: string | null;
  alertType: 'BACK_IN_STOCK' | 'PRICE_DROP';
  targetPriceKurus: number | null;
  isTriggered: boolean;
  triggeredAt: string | null;
  createdAt: string;
}

export interface StoredReview {
  id: string;
  userId: string;
  userName: string;
  productId: string;
  orderId: string | null;
  rating: number;
  comment: string;
  images: string[];
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  helpfulCount: number;
  helpfulVoterIds: string[];
  createdAt: string;
}

export interface StoredKvkkConsent {
  userId: string;
  kvkkExplicitConsent: boolean;
  distanceSalesSampleConsent: boolean;
  marketingEmail: boolean;
  marketingSms: boolean;
  marketingPush: boolean;
  analyticsConsent: boolean;
  ipAddress: string;
  updatedAt: string;
}

const STANDARD_APPOINTMENT_SLOTS = ['09:30', '11:00', '13:00', '14:00', '15:30', '17:00'];

@Injectable()
export class UsersService {
  private readonly logger = new StructuredLogger('UsersService');
  private readonly addressesByUser = new Map<string, StoredAddress[]>();
  private readonly favoritesByUser = new Map<string, StoredFavorite[]>();
  private readonly alertsByUser = new Map<string, StoredProductAlert[]>();
  private readonly reviews: StoredReview[] = [
    {
      id: 'rev-seed-1',
      userId: 'usr-customer-1',
      userName: 'Mehmet Y.',
      productId: 'prd-1',
      orderId: 'ord-101',
      rating: 5,
      comment: 'Golf 7 aracım için aldım, kablosuz CarPlay çok hızlı bağlanıyor. Direksiyon tuşları sorunsuz çalıştı.',
      images: [],
      isVerifiedPurchase: true,
      isApproved: true,
      helpfulCount: 14,
      helpfulVoterIds: [],
      createdAt: new Date(Date.now() - 172800_000).toISOString(),
    },
    {
      id: 'rev-seed-2',
      userId: 'usr-customer-2',
      userName: 'Burak D.',
      productId: 'prd-2',
      orderId: 'ord-102',
      rating: 5,
      comment: 'Kesinlikle koku yapmıyor ve klips yerleri birebir oturdu.',
      images: [],
      isVerifiedPurchase: true,
      isApproved: true,
      helpfulCount: 9,
      helpfulVoterIds: [],
      createdAt: new Date(Date.now() - 86400_000).toISOString(),
    },
  ];
  private readonly couponRedemptionsByUser = new Map<string, Map<string, number>>();
  private readonly kvkkConsentsByUser = new Map<string, StoredKvkkConsent>();

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // 1. ADRES DEFTERİ (CRUD + IDOR KORUMASI)
  // ===========================================================================

  listAddresses(userId: string): StoredAddress[] {
    return this.addressesByUser.get(userId) ?? [];
  }

  createAddress(userId: string, input: AddressCreateInput): StoredAddress {
    const current = this.addressesByUser.get(userId) ?? [];
    const isDefault = input.isDefault || current.length === 0;
    if (isDefault) {
      for (const a of current) {
        a.isDefault = false;
      }
    }

    const now = new Date().toISOString();
    const created: StoredAddress = {
      id: `adr_${randomUUID().slice(0, 10)}`,
      userId,
      title: input.title,
      recipient: input.recipient,
      phone: input.phone,
      city: input.city,
      district: input.district,
      neighborhood: input.neighborhood ?? 'Merkez Mah.',
      fullAddress: input.fullAddress,
      postalCode: input.postalCode ?? null,
      isDefault,
      invoiceType: input.invoiceType ?? 'INDIVIDUAL',
      tcIdentityNumber: input.tcIdentityNumber ?? null,
      companyName: input.companyName ?? null,
      taxOffice: input.taxOffice ?? null,
      taxNumber: input.taxNumber ?? null,
      createdAt: now,
      updatedAt: now,
    };

    current.unshift(created);
    this.addressesByUser.set(userId, current);
    return created;
  }

  updateAddress(userId: string, addressId: string, input: AddressUpdateInput): StoredAddress {
    // Tüm kullanıcı adreslerinde ara (IDOR tespiti için)
    let foundOwnerId: string | null = null;
    let targetAddress: StoredAddress | null = null;
    for (const [ownerId, list] of this.addressesByUser.entries()) {
      const match = list.find((a) => a.id === addressId);
      if (match) {
        foundOwnerId = ownerId;
        targetAddress = match;
        break;
      }
    }

    if (!targetAddress) {
      throw new AppDomainError(ErrorCode.RESOURCE_NOT_FOUND, 'Adres kaydı bulunamadı.', HttpStatus.NOT_FOUND);
    }

    if (foundOwnerId !== userId) {
      throw new AppDomainError(
        ErrorCode.IDOR_FORBIDDEN,
        'Başka bir kullanıcıya ait adresi düzenleyemezsiniz.',
        HttpStatus.FORBIDDEN,
      );
    }

    const userList = this.addressesByUser.get(userId) ?? [];
    if (input.isDefault) {
      for (const a of userList) {
        a.isDefault = a.id === addressId;
      }
    }

    Object.assign(targetAddress, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.recipient !== undefined ? { recipient: input.recipient } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.district !== undefined ? { district: input.district } : {}),
      ...(input.neighborhood !== undefined ? { neighborhood: input.neighborhood } : {}),
      ...(input.fullAddress !== undefined ? { fullAddress: input.fullAddress } : {}),
      ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
      ...(input.invoiceType !== undefined ? { invoiceType: input.invoiceType } : {}),
      ...(input.tcIdentityNumber !== undefined ? { tcIdentityNumber: input.tcIdentityNumber } : {}),
      ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
      ...(input.taxOffice !== undefined ? { taxOffice: input.taxOffice } : {}),
      ...(input.taxNumber !== undefined ? { taxNumber: input.taxNumber } : {}),
      updatedAt: new Date().toISOString(),
    });

    return targetAddress;
  }

  deleteAddress(userId: string, addressId: string): { deleted: true; id: string } {
    for (const [ownerId, list] of this.addressesByUser.entries()) {
      const idx = list.findIndex((a) => a.id === addressId);
      if (idx !== -1) {
        if (ownerId !== userId) {
          throw new AppDomainError(
            ErrorCode.IDOR_FORBIDDEN,
            'Başka bir kullanıcıya ait adresi silemezsiniz.',
            HttpStatus.FORBIDDEN,
          );
        }
        const [removed] = list.splice(idx, 1);
        if (removed.isDefault && list.length > 0) {
          list[0].isDefault = true;
        }
        return { deleted: true, id: addressId };
      }
    }

    throw new AppDomainError(ErrorCode.RESOURCE_NOT_FOUND, 'Silinecek adres bulunamadı.', HttpStatus.NOT_FOUND);
  }

  // ===========================================================================
  // 2. FAVORİLER & STOK / FİYAT HABER VER ALARMLARI
  // ===========================================================================

  listFavorites(userId: string) {
    const favs = this.favoritesByUser.get(userId) ?? [];
    return favs.map((f) => {
      const product = this.prisma.store.products.find((p) => p.id === f.productId) ?? null;
      return {
        ...f,
        product: product
          ? {
              id: product.id,
              title: product.title,
              slug: product.slug,
              price: product.price,
              stock: product.stock,
              image: product.image,
            }
          : null,
      };
    });
  }

  addFavorite(userId: string, productId: string) {
    const product = this.prisma.store.products.find((p) => p.id === productId);
    if (!product) {
      throw new AppDomainError(ErrorCode.PRODUCT_NOT_FOUND, 'Ürün bulunamadı.', HttpStatus.NOT_FOUND);
    }

    const list = this.favoritesByUser.get(userId) ?? [];
    const existing = list.find((f) => f.productId === productId);
    if (existing) {
      return existing;
    }

    const created: StoredFavorite = {
      id: `fav_${randomUUID().slice(0, 10)}`,
      userId,
      productId,
      createdAt: new Date().toISOString(),
    };
    list.unshift(created);
    this.favoritesByUser.set(userId, list);
    return created;
  }

  removeFavorite(userId: string, productId: string): { removed: boolean; productId: string } {
    const list = this.favoritesByUser.get(userId) ?? [];
    const next = list.filter((f) => f.productId !== productId);
    this.favoritesByUser.set(userId, next);
    return { removed: next.length !== list.length, productId };
  }

  listAlerts(userId: string): StoredProductAlert[] {
    return this.alertsByUser.get(userId) ?? [];
  }

  upsertAlert(userId: string, input: ProductAlertInput): StoredProductAlert {
    const product = this.prisma.store.products.find((p) => p.id === input.productId);
    if (!product) {
      throw new AppDomainError(ErrorCode.PRODUCT_NOT_FOUND, 'Alarm kurulacak ürün bulunamadı.', HttpStatus.NOT_FOUND);
    }

    const list = this.alertsByUser.get(userId) ?? [];
    const existing = list.find(
      (a) =>
        a.productId === input.productId &&
        (a.variantId ?? null) === (input.variantId ?? null) &&
        a.alertType === input.alertType,
    );

    if (existing) {
      existing.targetPriceKurus = input.targetPriceKurus ?? null;
      existing.isTriggered = false;
      existing.triggeredAt = null;
      return existing;
    }

    const created: StoredProductAlert = {
      id: `alt_${randomUUID().slice(0, 10)}`,
      userId,
      productId: input.productId,
      variantId: input.variantId ?? null,
      alertType: input.alertType,
      targetPriceKurus: input.targetPriceKurus ?? null,
      isTriggered: false,
      triggeredAt: null,
      createdAt: new Date().toISOString(),
    };
    list.unshift(created);
    this.alertsByUser.set(userId, list);
    return created;
  }

  /**
   * Stok 0'dan >0'a çıktığında bekleyen BACK_IN_STOCK alarmlarını tetikler.
   */
  triggerBackInStockAlerts(productId: string): StoredProductAlert[] {
    const triggered: StoredProductAlert[] = [];
    const now = new Date().toISOString();
    for (const alerts of this.alertsByUser.values()) {
      for (const alert of alerts) {
        if (alert.productId === productId && alert.alertType === 'BACK_IN_STOCK' && !alert.isTriggered) {
          alert.isTriggered = true;
          alert.triggeredAt = now;
          triggered.push(alert);
        }
      }
    }
    if (triggered.length > 0) {
      this.logger.info('Back-in-stock alerts triggered', { productId, count: triggered.length });
    }
    return triggered;
  }

  // ===========================================================================
  // 3. ÜRÜN YORUMLARI (SATIN ALAN KULLANICI DOĞRULAMASI, MODERASYON, FAYDALI OYU)
  // ===========================================================================

  listProductReviews(productId: string, includeUnapproved = false): StoredReview[] {
    return this.reviews.filter((r) => r.productId === productId && (includeUnapproved || r.isApproved));
  }

  createReview(userId: string, userEmail: string, input: ReviewCreateInput): StoredReview {
    const product = this.prisma.store.products.find((p) => p.id === input.productId);
    if (!product) {
      throw new AppDomainError(ErrorCode.PRODUCT_NOT_FOUND, 'Yorum yapılacak ürün bulunamadı.', HttpStatus.NOT_FOUND);
    }

    // Doğrulanmış satın alım kontrolü: Kullanıcının bu ürünü içeren ödenmiş/teslim edilmiş siparişi olmalı
    const eligibleStatuses = new Set(['PAID', 'PREPARING', 'SHIPPED', 'DELIVERED']);
    const matchingOrder = this.prisma.store.orders.find((o) => {
      const belongsToUser = o.userId === userId || (input.orderId && o.id === input.orderId && o.userId === userId);
      if (!belongsToUser || !eligibleStatuses.has(String(o.status))) {
        return false;
      }
      return Array.isArray(o.items) && o.items.some((it) => (it as { productId?: string }).productId === input.productId);
    });

    if (!matchingOrder) {
      throw new AppDomainError(
        ErrorCode.REVIEW_REQUIRES_PURCHASE,
        'Yalnızca bu ürünü satın almış ve ödemesi tamamlanmış müşterilerimiz yorum yazabilir.',
        HttpStatus.FORBIDDEN,
        { productId: input.productId },
      );
    }

    const maskedUserName = userEmail.split('@')[0].slice(0, 3) + '***';
    const created: StoredReview = {
      id: `rev_${randomUUID().slice(0, 10)}`,
      userId,
      userName: maskedUserName,
      productId: input.productId,
      orderId: matchingOrder.id,
      rating: input.rating,
      comment: input.comment,
      images: input.images ?? [],
      isVerifiedPurchase: true,
      isApproved: true, // Doğrulanmış satın alımlar otomatik onaylı, admin moderasyonla gizleyebilir
      helpfulCount: 0,
      helpfulVoterIds: [],
      createdAt: new Date().toISOString(),
    };

    this.reviews.unshift(created);
    this.recalculateProductRating(input.productId);
    return created;
  }

  moderateReview(reviewId: string, isApproved: boolean): StoredReview {
    const rev = this.reviews.find((r) => r.id === reviewId);
    if (!rev) {
      throw new AppDomainError(ErrorCode.RESOURCE_NOT_FOUND, 'Yorum bulunamadı.', HttpStatus.NOT_FOUND);
    }
    rev.isApproved = isApproved;
    this.recalculateProductRating(rev.productId);
    return rev;
  }

  voteReviewHelpful(userId: string, reviewId: string): StoredReview {
    const rev = this.reviews.find((r) => r.id === reviewId);
    if (!rev) {
      throw new AppDomainError(ErrorCode.RESOURCE_NOT_FOUND, 'Yorum bulunamadı.', HttpStatus.NOT_FOUND);
    }
    if (!rev.helpfulVoterIds.includes(userId)) {
      rev.helpfulVoterIds.push(userId);
      rev.helpfulCount += 1;
    }
    return rev;
  }

  private recalculateProductRating(productId: string): void {
    const product = this.prisma.store.products.find((p) => p.id === productId);
    if (!product) return;

    const approved = this.reviews.filter((r) => r.productId === productId && r.isApproved);
    if (approved.length === 0) {
      product.ratingAvg = 0;
      product.ratingCount = 0;
      return;
    }
    const sum = approved.reduce((acc, r) => acc + r.rating, 0);
    product.ratingAvg = Number((sum / approved.length).toFixed(2));
    product.ratingCount = approved.length;
  }

  // ===========================================================================
  // 4. MONTAJ RANDEVUSU (SLOT UYGUNLUK & ÇAKIŞMA KONTROLÜ)
  // ===========================================================================

  getAvailableSlots(date: string) {
    const appointmentsOnDate = this.prisma.store.appointments.filter(
      (a) => String(a.scheduledAt).startsWith(date) && a.status !== 'CANCELLED',
    );

    const slots = STANDARD_APPOINTMENT_SLOTS.map((timeSlot) => {
      const scheduledAt = `${date} ${timeSlot}`;
      const bookedBays = appointmentsOnDate
        .filter((a) => a.scheduledAt === scheduledAt)
        .map((a) => Number(a.bayNumber ?? 1));

      const availableBays = [1, 2, 3].filter((bay) => !bookedBays.includes(bay));
      return {
        date,
        timeSlot,
        available: availableBays.length > 0,
        availableBays,
      };
    });

    return { date, slots };
  }

  listAppointments(userId?: string, isAdmin = false) {
    if (isAdmin) {
      return this.prisma.store.appointments;
    }
    return this.prisma.store.appointments.filter((a) => a.userId === userId);
  }

  createAppointment(userId: string | null, input: AppointmentCreateInput) {
    const scheduledAt = `${input.date} ${input.timeSlot}`;
    const bayNumber = input.bayNumber ?? 1;

    const conflict = this.prisma.store.appointments.find(
      (a) =>
        a.scheduledAt === scheduledAt &&
        Number(a.bayNumber ?? 1) === bayNumber &&
        a.status !== 'CANCELLED',
    );

    if (conflict) {
      throw new AppDomainError(
        ErrorCode.APPOINTMENT_SLOT_TAKEN,
        `${input.date} tarihi ${input.timeSlot} saatinde İstasyon #${bayNumber} dolu. Lütfen başka bir saat veya istasyon seçin.`,
        HttpStatus.CONFLICT,
        { date: input.date, timeSlot: input.timeSlot, bayNumber },
      );
    }

    const created = {
      id: `apt_${randomUUID().slice(0, 10)}`,
      userId: userId ?? undefined,
      customerName: input.customerName,
      phone: input.phone,
      vehicleInfo: input.vehicleInfo,
      vehicleId: input.vehicleId ?? undefined,
      productId: input.productId ?? undefined,
      orderId: input.orderId ?? undefined,
      serviceType: input.serviceType,
      scheduledAt,
      bayNumber,
      notes: input.notes ?? undefined,
      status: AppointmentStatus.CONFIRMED,
      createdAt: new Date().toISOString(),
    };

    this.prisma.store.appointments.unshift(created);
    return created;
  }

  cancelAppointment(userId: string, appointmentId: string, isAdmin = false) {
    const apt = this.prisma.store.appointments.find((a) => a.id === appointmentId);
    if (!apt) {
      throw new AppDomainError(ErrorCode.RESOURCE_NOT_FOUND, 'Randevu bulunamadı.', HttpStatus.NOT_FOUND);
    }
    if (!isAdmin && apt.userId && apt.userId !== userId) {
      throw new AppDomainError(
        ErrorCode.IDOR_FORBIDDEN,
        'Başka bir kullanıcıya ait randevuyu iptal edemezsiniz.',
        HttpStatus.FORBIDDEN,
      );
    }
    apt.status = AppointmentStatus.CANCELLED;
    apt.cancelledAt = new Date().toISOString();
    return apt;
  }

  // ===========================================================================
  // 5. KUPON & KAMPANYA YÖNETİMİ (YARIŞ DURUMU KORUMALI KULLANIM)
  // ===========================================================================

  listCoupons() {
    return this.prisma.store.coupons;
  }

  createCoupon(input: CouponCreateInput) {
    const existing = this.prisma.store.coupons.find((c) => String(c.code).toUpperCase() === input.code);
    if (existing) {
      throw new AppDomainError(
        ErrorCode.VALIDATION_ERROR,
        `"${input.code}" kupon kodu zaten mevcut.`,
        HttpStatus.CONFLICT,
      );
    }

    const created = {
      id: `cpn_${randomUUID().slice(0, 8)}`,
      code: input.code,
      type: input.type as CouponType,
      value: input.type === 'FREE_SHIPPING' ? 0 : input.value,
      minTotal: input.minTotalKurus,
      minCartTotal: Math.round(input.minTotalKurus / 100),
      maxUses: input.maxUses ?? undefined,
      perUserLimit: input.perUserLimit ?? 1,
      categoryId: input.categoryId ?? undefined,
      usedCount: 0,
      startsAt: input.startsAt ?? undefined,
      endsAt: input.endsAt ?? undefined,
      active: true,
      isActive: true,
      description: input.description ?? '',
      createdAt: new Date().toISOString(),
    };

    this.prisma.store.coupons.unshift(created);
    return created;
  }

  redeemCouponForUser(userId: string, code: string): { code: string; usedCount: number; userUsedCount: number } {
    const normalized = code.trim().toUpperCase();
    const coupon = this.prisma.store.coupons.find((c) => String(c.code).toUpperCase() === normalized);
    if (!coupon || !coupon.active) {
      throw new AppDomainError(ErrorCode.INVALID_COUPON, 'Geçersiz kupon kodu.', HttpStatus.BAD_REQUEST);
    }

    if (coupon.maxUses !== null && coupon.maxUses !== undefined && coupon.usedCount >= coupon.maxUses) {
      throw new AppDomainError(
        ErrorCode.INVALID_COUPON,
        'Kupon toplam kullanım limitine ulaştı.',
        HttpStatus.CONFLICT,
      );
    }

    const userMap = this.couponRedemptionsByUser.get(userId) ?? new Map<string, number>();
    const currentUserUses = userMap.get(normalized) ?? 0;
    const perUserLimit = Number(coupon.perUserLimit ?? 1);

    if (currentUserUses >= perUserLimit) {
      throw new AppDomainError(
        ErrorCode.COUPON_USER_LIMIT_EXCEEDED,
        `Bu kuponu kişi başı en fazla ${perUserLimit} kez kullanabilirsiniz.`,
        HttpStatus.CONFLICT,
        { code: normalized, perUserLimit, currentUserUses },
      );
    }

    coupon.usedCount = Number(coupon.usedCount ?? 0) + 1;
    userMap.set(normalized, currentUserUses + 1);
    this.couponRedemptionsByUser.set(userId, userMap);

    return {
      code: normalized,
      usedCount: coupon.usedCount,
      userUsedCount: currentUserUses + 1,
    };
  }

  listCampaigns() {
    return this.prisma.store.banners;
  }

  createCampaign(input: CampaignCreateInput) {
    const created = {
      id: `bn_${randomUUID().slice(0, 8)}`,
      title: input.title,
      subtitle: input.subtitle,
      badge: input.badge,
      categoryId: input.categoryId ?? undefined,
      discountPercent: input.discountPercent,
      startsAt: input.startsAt ?? undefined,
      endsAt: input.endsAt ?? undefined,
      isActive: input.isActive,
      sortOrder: 0,
      createdAt: new Date().toISOString(),
    };
    this.prisma.store.banners.unshift(created);
    return created;
  }

  // ===========================================================================
  // 6. KVKK AÇIK RIZA & KİŞİSEL VERİ DIŞA AKTARMA (MADDE 11)
  // ===========================================================================

  getKvkkConsents(userId: string): StoredKvkkConsent {
    const existing = this.kvkkConsentsByUser.get(userId);
    if (existing) return existing;

    const initial: StoredKvkkConsent = {
      userId,
      kvkkExplicitConsent: true,
      distanceSalesSampleConsent: true,
      marketingEmail: false,
      marketingSms: false,
      marketingPush: false,
      analyticsConsent: true,
      ipAddress: '127.0.0.1',
      updatedAt: new Date().toISOString(),
    };
    this.kvkkConsentsByUser.set(userId, initial);
    return initial;
  }

  updateKvkkConsents(userId: string, input: KvkkConsentUpdateInput, ipAddress = '127.0.0.1'): StoredKvkkConsent {
    const current = this.getKvkkConsents(userId);
    const updated: StoredKvkkConsent = {
      ...current,
      ...(input.marketingEmail !== undefined ? { marketingEmail: input.marketingEmail } : {}),
      ...(input.marketingSms !== undefined ? { marketingSms: input.marketingSms } : {}),
      ...(input.marketingPush !== undefined ? { marketingPush: input.marketingPush } : {}),
      ...(input.analyticsConsent !== undefined ? { analyticsConsent: input.analyticsConsent } : {}),
      ipAddress,
      updatedAt: new Date().toISOString(),
    };
    this.kvkkConsentsByUser.set(userId, updated);
    return updated;
  }

  exportMyPersonalData(userId: string, userEmail: string) {
    const addresses = this.listAddresses(userId);
    const favorites = this.listFavorites(userId);
    const alerts = this.listAlerts(userId);
    const reviews = this.reviews.filter((r) => r.userId === userId);
    const orders = this.prisma.store.orders.filter((o) => o.userId === userId);
    const appointments = this.listAppointments(userId, false);
    const consents = this.getKvkkConsents(userId);

    return {
      standard: 'KVKK-6698-Madde-11-Veri-Tasinabilirligi',
      exportedAt: new Date().toISOString(),
      subject: {
        userId,
        email: userEmail,
      },
      consents,
      addresses,
      favorites,
      productAlerts: alerts,
      orders,
      reviews,
      appointments,
    };
  }
}
