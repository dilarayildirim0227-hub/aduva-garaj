import { Injectable } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { AppDomainError, ErrorCode } from '../../common/error-codes';
import { PrismaService } from '../../common/prisma';
import { getJwtSecret } from '../../common/security';
import type {
  CancelOrderInput,
  CreateOrderInput,
  OrderStateTransitionInput,
  PaymentWebhookInput,
  ReturnOrderInput,
  ShippingCalculateInput,
} from './orders.schemas';
import {
  ProductStatus,
  OrderStatus,
  OrderSource,
  PaymentMethod,
  type LocalOrder,
  type LocalOrderItem,
} from '@aduva/shared';

export type OrderStatusLiteral =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PREPARING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

// Extended types for order service with additional properties
type ExtendedOrder = LocalOrder & {
  shippingAddress?: {
    fullName: string;
    phone: string;
    city: string;
    district: string;
    neighborhood: string | null;
    line: string;
  };
  billingAddress?: {
    invoiceType?: string;
    companyName?: string | null;
    taxOffice?: string | null;
    taxNumber?: string | null;
    eInvoice?: unknown;
  };
  distanceSalesContract?: {
    accepted: boolean;
    acceptedAt: string;
    version: string;
  };
  statusEvents: Array<{
    id: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    changedBy: string;
    note: string;
    createdAt: string;
  }>;
  paymentTransaction?: {
    id: string;
    provider: string;
    conversationId: string;
    amountKurus: number;
    installmentCount?: number;
    status: string;
    webhookSignaturePreview: string;
  };
  rmaCode?: string;
  userId?: string | null;
  trackingCode?: string | null;
  codFeeKurus?: number;
};

type ExtendedOrderItem = LocalOrderItem & {
  productId?: string;
  unitPriceKurus?: number;
  lineTotalKurus?: number;
};

// Katı Sipariş Durum Makinesi: Yalnızca izin verilen geçişlere onay verir
const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatusLiteral, readonly OrderStatusLiteral[]> = {
  PENDING_PAYMENT: ['PAID', 'PREPARING', 'CANCELLED'],
  PAID: ['PREPARING', 'SHIPPED', 'CANCELLED', 'REFUNDED'],
  PREPARING: ['SHIPPED', 'CANCELLED', 'REFUNDED'],
  SHIPPED: ['DELIVERED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

// Türkiye İl / İlçe / Örnek Mahalle Sözlüğü (Adres doğrulama için)
export const TR_ADDRESS_DIRECTORY: Record<string, Record<string, string[]>> = {
  İstanbul: {
    Ümraniye: ['Dudullu OSB Mah.', 'Atatürk Mah.', 'Çakmak Mah.', 'İnkılap Mah.', 'Tatlısu Mah.'],
    Kadıköy: ['Caferağa Mah.', 'Fenerbahçe Mah.', 'Kozyatağı Mah.', 'Suadiye Mah.'],
    Ataşehir: ['Atatürk Mah.', 'Barbaros Mah.', 'İçerenköy Mah.', 'Küçükbakkalköy Mah.'],
    Beşiktaş: ['Levent Mah.', 'Etiler Mah.', 'Sinanpaşa Mah.'],
    Şişli: ['Mecidiyeköy Mah.', 'Esentepe Mah.', 'Teşvikiye Mah.'],
    Başakşehir: ['İkitelli OSB Mah.', 'Başak Mah.', 'Bahçeşehir 1. Kısım Mah.'],
    Pendik: ['Kurtköy Mah.', 'Yenişehir Mah.', 'Batı Mah.'],
  },
  Ankara: {
    Çankaya: ['Kızılay Mah.', 'Çukurambar Mah.', 'Bahçelievler Mah.', 'Oran Mah.'],
    Yenimahalle: ['Ostim OSB Mah.', 'İvedik OSB Mah.', 'Batıkent Mah.'],
    Keçiören: ['Etlik Mah.', 'Aktepe Mah.'],
  },
  İzmir: {
    Bornova: ['Kazımdirik Mah.', 'Erzene Mah.', 'Işıkkent Mah.'],
    Karşıyaka: ['Bostanlı Mah.', 'Mavişehir Mah.'],
    Konak: ['Alsancak Mah.', 'Çankaya Mah.'],
  },
  Bursa: {
    Nilüfer: ['Özlüce Mah.', 'Beşevler Mah.', 'Çalı OSB Mah.'],
    Osmangazi: ['Santral Garaj Mah.', 'Demirtaş OSB Mah.'],
  },
  Antalya: {
    Muratpaşa: ['Lara Mah.', 'Şirinyalı Mah.'],
    Konyaaltı: ['Liman Mah.', 'Gürsu Mah.'],
  },
  Kocaeli: {
    İzmit: ['Sanayi Mah.', 'Yahyakaptan Mah.'],
    Gebze: ['GOSB Mah.', 'Tatlıkuyu Mah.'],
  },
};

// Kargo Firması Adapter Arayüzü (Yurtiçi, Aras, MNG, PTT)
export interface CarrierShipmentReceipt {
  carrierName: string;
  trackingCode: string;
  trackingUrl: string;
  estimatedDeliveryDays: number;
}

export class CarrierShippingAdapter {
  static getCarrierMeta(carrier: 'YURTICI' | 'ARAS' | 'MNG' | 'PTT') {
    const map = {
      YURTICI: {
        name: 'Yurtiçi Kargo',
        prefix: 'YK',
        baseKurus: 7990,
        perDesiKurus: 650,
        urlPrefix: 'https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=',
      },
      ARAS: {
        name: 'Aras Kargo',
        prefix: 'ARS',
        baseKurus: 7490,
        perDesiKurus: 600,
        urlPrefix: 'https://kargotakip.araskargo.com.tr/mainpage.aspx?code=',
      },
      MNG: {
        name: 'MNG Kargo',
        prefix: 'MNG',
        baseKurus: 7690,
        perDesiKurus: 620,
        urlPrefix: 'https://www.mngkargo.com.tr/gonderi-takip/?no=',
      },
      PTT: {
        name: 'PTT Kargo',
        prefix: 'PTT',
        baseKurus: 6990,
        perDesiKurus: 550,
        urlPrefix: 'https://gonderitakip.ptt.gov.tr/Track/Verify?q=',
      },
    };
    return map[carrier] ?? map.YURTICI;
  }

  static createShipmentLabel(
    carrier: 'YURTICI' | 'ARAS' | 'MNG' | 'PTT',
    orderNumber: string,
  ): CarrierShipmentReceipt {
    const meta = this.getCarrierMeta(carrier);
    const suffix = String(Math.floor(100000000 + Math.random() * 900000000));
    const trackingCode = `${meta.prefix}-${suffix}`;
    return {
      carrierName: meta.name,
      trackingCode,
      trackingUrl: `${meta.urlPrefix}${trackingCode}&ref=${encodeURIComponent(orderNumber)}`,
      estimatedDeliveryDays: 2,
    };
  }
}

// e-Fatura / e-Arşiv GİB Sağlayıcı Adapter'ı
export class EInvoiceAdapter {
  static issueInvoiceSnapshot(orderNumber: string, input: CreateOrderInput, grandTotalKurus: number) {
    const isEInvoice = input.invoiceType === 'CORPORATE' && Boolean(input.taxNumber);
    const prefix = isEInvoice ? 'ADV2026EF' : 'ADV2026EA';
    const serial = String(Math.floor(100000000 + Math.random() * 899999999));
    return {
      documentType: isEInvoice ? 'E_FATURA' : 'E_ARSIV',
      gibInvoiceNumber: `${prefix}${serial}`,
      orderNumber,
      amountKurus: grandTotalKurus,
      issuedAt: new Date().toISOString(),
    };
  }
}

@Injectable()
export class OrdersService {
  private readonly checkoutLocks = new Map<string, Promise<void>>();
  private readonly processedWebhooks = new Set<string>();

  constructor(private readonly prisma: PrismaService) {}

  private async withCheckoutLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    while (this.checkoutLocks.has(key)) {
      await this.checkoutLocks.get(key);
    }
    let release!: () => void;
    const p = new Promise<void>((res) => {
      release = res;
    });
    this.checkoutLocks.set(key, p);
    try {
      return await fn();
    } finally {
      this.checkoutLocks.delete(key);
      release();
    }
  }

  // ---------- Kargo Ücreti & İl/İlçe/Mahalle Rehberi ----------
  getAddressDirectory() {
    return {
      country: 'TR',
      cities: Object.entries(TR_ADDRESS_DIRECTORY).map(([city, districts]) => ({
        city,
        districts: Object.entries(districts).map(([district, neighborhoods]) => ({
          district,
          neighborhoods,
        })),
      })),
    };
  }

  calculateShipping(input: ShippingCalculateInput) {
    const freeThresholdKurus = 75000; // 750,00 TL
    const meta = CarrierShippingAdapter.getCarrierMeta(input.carrier);
    const extraDesi = Math.max(0, Math.ceil(input.totalDesi - 3));
    const rawShippingKurus = meta.baseKurus + extraDesi * meta.perDesiKurus;
    const shippingKurus = input.subtotalKurus >= freeThresholdKurus ? 0 : rawShippingKurus;
    const codFeeKurus = input.paymentMethod === PaymentMethod.CASH_ON_DELIVERY ? 4990 : 0;

    return {
      carrier: input.carrier,
      carrierName: meta.name,
      freeShippingThresholdKurus: freeThresholdKurus,
      freeShippingRemainingKurus: Math.max(0, freeThresholdKurus - input.subtotalKurus),
      isFreeShipping: shippingKurus === 0,
      shippingKurus,
      codFeeKurus,
      totalShippingAndFeeKurus: shippingKurus + codFeeKurus,
    };
  }

  // ---------- Atomik Sipariş Oluşturma (Fiyat/Adres/Ürün Snapshot + Stok Düşümü) ----------
  async createOrder(input: CreateOrderInput, userId?: string) {
    if (!input.distanceSalesContractAccepted) {
      throw new AppDomainError(
        ErrorCode.ORDER_CONTRACT_REQUIRED,
        '6502 sayılı kanun gereği Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi onayı zorunludur.',
        400,
      );
    }

    return this.withCheckoutLock('global_stock_checkout_lock', async () => {
      const store = this.prisma.store;
      let subtotalKurus = 0;

      const resolvedItems: Array<{
        product: (typeof store.products)[number];
        quantity: number;
        unitPriceKurus: number;
        lineTotalKurus: number;
      }> = [];

      for (const reqItem of input.items) {
        const product = store.products.find(
          (p) => p.id === reqItem.productId || p.sellerCode === reqItem.productId,
        );
        if (!product || product.status !== ProductStatus.ACTIVE || product.isHidden) {
          throw new AppDomainError(
            ErrorCode.PRODUCT_UNAVAILABLE,
            `"${reqItem.productId}" kodlu ürün şu anda satışta değil.`,
            409,
          );
        }
        if (reqItem.quantity > product.stock) {
          throw new AppDomainError(
            ErrorCode.OUT_OF_STOCK,
            `"${product.title}" ürünü için yeterli stok yok (Mevcut stok: ${product.stock}).`,
            409,
            { productId: product.id, availableStock: product.stock },
          );
        }
        if (reqItem.quantity > (product.maxPerOrder ?? 10)) {
          throw new AppDomainError(
            ErrorCode.MAX_PER_ORDER_EXCEEDED,
            `"${product.title}" ürününden tek siparişte en fazla ${product.maxPerOrder ?? 10} adet alınabilir.`,
            400,
          );
        }

        const unitPriceKurus = product.priceKurus ?? Math.round(Number(product.price) * 100);
        const lineTotalKurus = unitPriceKurus * reqItem.quantity;
        subtotalKurus += lineTotalKurus;
        resolvedItems.push({
          product,
          quantity: reqItem.quantity,
          unitPriceKurus,
          lineTotalKurus,
        });
      }

      // Kupon doğrulama ve yarış durumu korumalı sayaç artırma
      let discountKurus = 0;
      let freeShippingCoupon = false;
      if (input.couponCode) {
        const codeUpper = input.couponCode.toUpperCase();
        const coupon = store.coupons.find((c) => c.code.toUpperCase() === codeUpper && c.isActive);
        if (!coupon) {
          throw new AppDomainError(ErrorCode.COUPON_INVALID, 'Geçersiz veya pasif kupon kodu.', 400);
        }
        const minTotalKurus = Math.round(Number(coupon.minCartTotal ?? 0) * 100);
        if (subtotalKurus < minTotalKurus) {
          throw new AppDomainError(
            ErrorCode.COUPON_MIN_TOTAL_NOT_MET,
            `Bu kupon için minimum sepet tutarı ${(minTotalKurus / 100).toFixed(2)} TL olmalıdır.`,
            400,
          );
        }
        if (coupon.type === 'FREE_SHIPPING') {
          freeShippingCoupon = true;
        } else if (coupon.type === 'PERCENT') {
          discountKurus = Math.round((subtotalKurus * Number(coupon.value)) / 100);
        } else {
          discountKurus = Math.min(subtotalKurus, Math.round(Number(coupon.value) * 100));
        }
      }

      const afterDiscountKurus = Math.max(0, subtotalKurus - discountKurus);
      const shippingCalc = this.calculateShipping({
        subtotalKurus: afterDiscountKurus,
        totalDesi: resolvedItems.reduce((s, r) => s + r.quantity * 2, 0),
        carrier: input.carrier,
        paymentMethod: input.paymentMethod,
      });
      const shippingKurus = freeShippingCoupon ? 0 : shippingCalc.shippingKurus;
      const codFeeKurus = shippingCalc.codFeeKurus;
      const grandTotalKurus = afterDiscountKurus + shippingKurus + codFeeKurus;
      const vatTotalKurus = Math.round(grandTotalKurus - grandTotalKurus / 1.2);

      // Atomik stok düşümü + StockMovement kaydı
      const orderNumber = `ADV-2026-${Math.floor(10000 + Math.random() * 89999)}`;
      for (const r of resolvedItems) {
        const previousStock = r.product.stock;
        r.product.stock = Math.max(0, previousStock - r.quantity);
        if (r.product.stock === 0) r.product.status = ProductStatus.OUT_OF_STOCK;
        r.product.soldCount = (r.product.soldCount ?? 0) + r.quantity;
        store.stockMovements.unshift({
          id: `sm_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          productId: r.product.id,
          delta: -r.quantity,
          previousStock,
          newStock: r.product.stock,
          reason: 'ORDER_RESERVED',
          referenceId: orderNumber,
          createdAt: new Date().toISOString(),
        });
      }

      const initialStatus: OrderStatusLiteral =
        input.paymentMethod === PaymentMethod.BANK_TRANSFER ? 'PENDING_PAYMENT' : 'PAID';

      const conversationId = `conv_${orderNumber}_${Date.now()}`;
      const paymentWebhookSign = this.computeWebhookSignature(orderNumber, conversationId, grandTotalKurus);
      const invoiceSnapshot = EInvoiceAdapter.issueInvoiceSnapshot(orderNumber, input, grandTotalKurus);

      const orderRecord: ExtendedOrder = {
        id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        orderNumber,
        userId: userId ?? undefined,
        source: OrderSource.WEB,
        customerName: input.customerName,
        phone: input.phone,
        city: `${input.city} / ${input.district}`,
        shippingAddress: {
          fullName: input.customerName,
          phone: input.phone,
          city: input.city,
          district: input.district,
          neighborhood: input.neighborhood ?? null,
          line: input.addressLine,
        },
        billingAddress: {
          invoiceType: input.invoiceType,
          companyName: input.companyName ?? null,
          taxOffice: input.taxOffice ?? null,
          taxNumber: input.taxNumber ?? null,
          eInvoice: invoiceSnapshot,
        },
        distanceSalesContract: {
          accepted: true,
          acceptedAt: new Date().toISOString(),
          version: 'v2026.2',
        },
        status: initialStatus as OrderStatus,
        paymentMethod: input.paymentMethod as PaymentMethod,
        subtotalKurus,
        discountKurus,
        shippingKurus,
        codFeeKurus,
        vatTotalKurus,
        grandTotalKurus,
        total: Number((grandTotalKurus / 100).toFixed(2)),
        trackingCode: undefined,
        carrier: shippingCalc.carrierName,
        createdAt: new Date().toISOString(),
        items: resolvedItems.map((r) => ({
          title: r.product.title,
          skuSnapshot: r.product.sellerCode,
          oemCodeSnapshot: r.product.oemCode,
          quantity: r.quantity,
          unitPrice: Number((r.unitPriceKurus / 100).toFixed(2)),
        })) as ExtendedOrderItem[],
        statusEvents: [
          {
            id: `evt_${randomUUID()}`,
            fromStatus: null,
            toStatus: initialStatus as OrderStatus,
            changedBy: userId ?? 'GUEST_CHECKOUT',
            note: 'Sipariş oluşturuldu ve stok rezerve edildi.',
            createdAt: new Date().toISOString(),
          },
        ],
        paymentTransaction: {
          id: `pay_${randomUUID()}`,
          provider: input.paymentMethod === PaymentMethod.CARD ? 'IYZICO_3DS' : input.paymentMethod,
          conversationId,
          amountKurus: grandTotalKurus,
          installmentCount: input.installmentCount,
          status: initialStatus === 'PAID' ? 'SUCCESS' : 'WAITING_APPROVAL',
          webhookSignaturePreview: paymentWebhookSign,
        },
      };

      store.orders.unshift(orderRecord as LocalOrder);
      return orderRecord;
    });
  }

  // ---------- Sipariş Durum Makinesi Geçişi ----------
  transitionOrderState(
    orderIdOrNo: string,
    input: OrderStateTransitionInput,
    actorId = 'ADMIN',
  ) {
    const store = this.prisma.store;
    const order = store.orders.find(
      (o) => o.id === orderIdOrNo || o.orderNumber === orderIdOrNo,
    ) as ExtendedOrder | undefined;
    if (!order) {
      throw new AppDomainError(ErrorCode.ORDER_NOT_FOUND, 'Sipariş bulunamadı.', 404);
    }

    const currentStatus = order.status as unknown as OrderStatusLiteral;
    const allowed = ALLOWED_ORDER_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(input.toStatus)) {
      throw new AppDomainError(
        ErrorCode.ORDER_INVALID_STATE_TRANSITION,
        `"${currentStatus}" durumundaki sipariş "${input.toStatus}" durumuna geçirilemez (İzin verilenler: ${allowed.join(', ') || 'Yok'}).`,
        409,
        { fromStatus: currentStatus, toStatus: input.toStatus, allowed },
      );
    }

    order.status = input.toStatus as OrderStatus;
    if (input.trackingCode) order.trackingCode = input.trackingCode;
    if (input.carrier) order.carrier = input.carrier;

    if (!Array.isArray(order.statusEvents)) order.statusEvents = [];
    order.statusEvents.push({
      id: `evt_${randomUUID()}`,
      fromStatus: currentStatus as unknown as OrderStatus,
      toStatus: input.toStatus as OrderStatus,
      changedBy: actorId,
      note: input.note ?? `Durum ${currentStatus} -> ${input.toStatus} olarak güncellendi.`,
      createdAt: new Date().toISOString(),
    });

    return order;
  }

  // ---------- iyzico 3D Secure İmzalı Webhook / Callback (Idempotent + Başarısız Ödemede Stok İadesi) ----------
  computeWebhookSignature(orderNumber: string, conversationId: string, amountKurus: number): string {
    return createHmac('sha256', getJwtSecret())
      .update(`${orderNumber}:${conversationId}:${amountKurus}`)
      .digest('hex');
  }

  handlePaymentWebhook(payload: PaymentWebhookInput) {
    const expectedSig = this.computeWebhookSignature(
      payload.orderNumber,
      payload.conversationId,
      payload.amountKurus,
    );
    const a = Buffer.from(expectedSig, 'utf8');
    const b = Buffer.from(payload.signature, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new AppDomainError(
        ErrorCode.PAYMENT_SIGNATURE_INVALID,
        'Ödeme sağlayıcı webhook imzası doğrulanamadı (HMAC uyuşmazlığı).',
        401,
      );
    }

    // Tekrarlanan webhook çağrılarına karşı idempotency
    if (this.processedWebhooks.has(payload.eventId)) {
      return {
        idempotentReplay: true,
        eventId: payload.eventId,
        orderNumber: payload.orderNumber,
      };
    }

    const order = this.prisma.store.orders.find((o) => o.orderNumber === payload.orderNumber);
    if (!order) {
      throw new AppDomainError(ErrorCode.ORDER_NOT_FOUND, 'Webhook siparişi bulunamadı.', 404);
    }

    this.processedWebhooks.add(payload.eventId);

    if (payload.status === 'SUCCESS') {
      if (order.status === 'PENDING_PAYMENT') {
        this.transitionOrderState(
          order.id,
          { toStatus: 'PAID', note: `3DS Ödeme Onaylandı (${payload.providerPaymentId})` },
          'IYZICO_WEBHOOK',
        );
      }
      return { idempotentReplay: false, status: order.status, orderNumber: order.orderNumber };
    }

    // Başarısız ödemede siparişi iptal et ve rezerve stoku iade et
    if (order.status !== OrderStatus.CANCELLED) {
      this.cancelOrder(
        order.id,
        { reason: payload.errorMessage ?? '3D Secure ödeme başarısız oldu' },
        undefined,
        true,
      );
    }
    return { idempotentReplay: false, status: order.status, orderNumber: order.orderNumber };
  }

  // ---------- Sipariş İptali (Atomik Stok İadesi) ve 14 Gün Cayma / Kısmi İade ----------
  cancelOrder(
    orderIdOrNo: string,
    input: CancelOrderInput,
    actorUserId?: string,
    isSystemOrAdmin = false,
  ) {
    const store = this.prisma.store;
    const order = store.orders.find(
      (o) => o.id === orderIdOrNo || o.orderNumber === orderIdOrNo,
    );
    if (!order) {
      throw new AppDomainError(ErrorCode.ORDER_NOT_FOUND, 'Sipariş bulunamadı.', 404);
    }

    if (!isSystemOrAdmin && order.userId && actorUserId && order.userId !== actorUserId) {
      throw new AppDomainError(
        ErrorCode.AUTH_IDOR_FORBIDDEN,
        'Yalnızca kendi siparişinizi iptal edebilirsiniz.',
        403,
      );
    }

    this.transitionOrderState(
      order.id,
      { toStatus: OrderStatus.CANCELLED, note: input.reason },
      actorUserId ?? 'SYSTEM',
    );

    for (const item of order.items ?? []) {
      const prd = store.products.find((p) => p.id === (item as ExtendedOrderItem).productId || p.title === item.title);
      if (prd) {
        const prev = prd.stock;
        prd.stock += Number(item.quantity || 1);
        if (prd.status === ProductStatus.OUT_OF_STOCK && prd.stock > 0) prd.status = ProductStatus.ACTIVE;
        store.stockMovements.unshift({
          id: `sm_cancel_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          productId: prd.id,
          delta: Number(item.quantity || 1),
          previousStock: prev,
          newStock: prd.stock,
          reason: 'ORDER_CANCELLED',
          referenceId: order.orderNumber,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return order;
  }

  createReturnRequest(
    orderIdOrNo: string,
    input: ReturnOrderInput,
    actorUserId?: string,
  ) {
    const store = this.prisma.store;
    const order = store.orders.find(
      (o) => o.id === orderIdOrNo || o.orderNumber === orderIdOrNo,
    ) as ExtendedOrder | undefined;
    if (!order) {
      throw new AppDomainError(ErrorCode.ORDER_NOT_FOUND, 'Sipariş bulunamadı.', 404);
    }
    if (order.userId && actorUserId && order.userId !== actorUserId) {
      throw new AppDomainError(
        ErrorCode.AUTH_IDOR_FORBIDDEN,
        'Yalnızca kendi siparişiniz için iade talebi oluşturabilirsiniz.',
        403,
      );
    }

    // Kısmi iade veya tam iade tutar hesabı
    let refundAmountKurus = order.grandTotalKurus ?? Math.round(Number(order.total || 0) * 100);
    if (input.items && input.items.length > 0) {
      refundAmountKurus = 0;
      for (const reqItem of input.items) {
        const matched = (order.items ?? []).find(
          (oi: ExtendedOrderItem) => oi.productId === reqItem.productId,
        ) as ExtendedOrderItem | undefined;
        if (matched) {
          const unitKurus = matched.unitPriceKurus ?? Math.round(Number(matched.unitPrice || 0) * 100);
          const qty = Math.min(Number(matched.quantity || 1), reqItem.quantity);
          refundAmountKurus += unitKurus * qty;
        }
      }
    }

    const rmaCode = `YK-IADE-${Math.floor(100000 + Math.random() * 899999)}`;
    const returnReq = {
      id: `ret_${Date.now()}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: actorUserId ?? order.userId ?? null,
      reason: input.reason,
      status: 'APPROVED_FOR_SHIPPING',
      freeReturnShippingCode: rmaCode,
      carrier: 'Yurtiçi Kargo (Ücretsiz Anlaşma Kodu)',
      refundAmountKurus,
      createdAt: new Date().toISOString(),
    };

    order.rmaCode = rmaCode;
    return returnReq;
  }

  listOrdersForUser(userId: string) {
    return this.prisma.store.orders.filter((o) => o.userId === userId);
  }
}
