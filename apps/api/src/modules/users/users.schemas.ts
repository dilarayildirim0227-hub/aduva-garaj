import { z } from 'zod';

/**
 * Kullanıcı Adres Defteri Şemaları (Türkiye il/ilçe/mahalle + Kurumsal/Bireysel fatura)
 */
export const addressCreateSchema = z
  .object({
    title: z.string().trim().min(2, 'Adres başlığı en az 2 karakter olmalıdır').max(50),
    recipient: z.string().trim().min(2, 'Alıcı adı soyadı zorunludur').max(100),
    phone: z.string().trim().min(10, 'Geçerli bir telefon numarası girin').max(20),
    city: z.string().trim().min(2, 'İl seçimi zorunludur').max(60),
    district: z.string().trim().min(2, 'İlçe seçimi zorunludur').max(60),
    neighborhood: z.string().trim().min(2, 'Mahalle bilgisi zorunludur').max(100).optional().default('Merkez Mah.'),
    fullAddress: z.string().trim().min(10, 'Açık adres en az 10 karakter olmalıdır').max(400),
    postalCode: z.string().trim().max(10).optional().nullable(),
    isDefault: z.boolean().optional().default(false),
    invoiceType: z.enum(['INDIVIDUAL', 'CORPORATE']).optional().default('INDIVIDUAL'),
    tcIdentityNumber: z.string().trim().regex(/^\d{11}$/, 'T.C. Kimlik No 11 haneli olmalıdır').optional().nullable(),
    companyName: z.string().trim().max(150).optional().nullable(),
    taxOffice: z.string().trim().max(100).optional().nullable(),
    taxNumber: z.string().trim().regex(/^\d{10,11}$/, 'Vergi numarası 10 veya 11 haneli olmalıdır').optional().nullable(),
  })
  .strict();

export type AddressCreateInput = z.infer<typeof addressCreateSchema>;

export const addressUpdateSchema = addressCreateSchema.partial();
export type AddressUpdateInput = z.infer<typeof addressUpdateSchema>;

/**
 * Favori Ekleme Şeması
 */
export const favoriteSchema = z
  .object({
    productId: z.string().trim().min(1, 'Ürün kimliği zorunludur'),
  })
  .strict();

export type FavoriteInput = z.infer<typeof favoriteSchema>;

/**
 * Stok Gelince / Fiyat Düşünce Haber Ver Şeması
 */
export const productAlertSchema = z
  .object({
    productId: z.string().trim().min(1, 'Ürün kimliği zorunludur'),
    variantId: z.string().trim().min(1).optional().nullable(),
    alertType: z.enum(['BACK_IN_STOCK', 'PRICE_DROP']).default('BACK_IN_STOCK'),
    targetPriceKurus: z.number().int().min(0).optional().nullable(),
  })
  .strict();

export type ProductAlertInput = z.infer<typeof productAlertSchema>;

/**
 * Ürün Yorumu Oluşturma Şeması (Satın Alan Kullanıcı Doğrulamalı)
 */
export const reviewCreateSchema = z
  .object({
    productId: z.string().trim().min(1, 'Ürün kimliği zorunludur'),
    orderId: z.string().trim().min(1).optional().nullable(),
    rating: z.number().int().min(1, 'Puan en az 1 olmalıdır').max(5, 'Puan en fazla 5 olabilir'),
    comment: z.string().trim().min(5, 'Yorum en az 5 karakter olmalıdır').max(2000),
    images: z.array(z.string().url()).max(5).optional().default([]),
  })
  .strict();

export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;

export const reviewModerationSchema = z
  .object({
    isApproved: z.boolean(),
  })
  .strict();

export type ReviewModerationInput = z.infer<typeof reviewModerationSchema>;

/**
 * Montaj Randevu Slot Sorgulama ve Oluşturma Şemaları
 */
export const appointmentSlotQuerySchema = z.object({
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-AA-GG formatında olmalıdır'),
});

export const appointmentCreateSchema = z
  .object({
    customerName: z.string().trim().min(2, 'Müşteri adı zorunludur').max(100),
    phone: z.string().trim().min(10, 'Telefon numarası zorunludur').max(20),
    vehicleInfo: z.string().trim().min(2, 'Araç bilgisi zorunludur').max(150),
    vehicleId: z.string().trim().optional().nullable(),
    productId: z.string().trim().optional().nullable(),
    orderId: z.string().trim().optional().nullable(),
    serviceType: z.string().trim().min(3, 'Montaj hizmet tipi zorunludur').max(150),
    date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-AA-GG formatında olmalıdır'),
    timeSlot: z
      .string()
      .trim()
      .regex(/^\d{2}:\d{2}$/, 'Saat SS:DD formatında olmalıdır (ör. 10:00)'),
    bayNumber: z.number().int().min(1).max(3).optional().default(1),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .strict();

export type AppointmentCreateInput = z.infer<typeof appointmentCreateSchema>;

/**
 * Kupon ve Kampanya Şemaları
 */
export const couponCreateSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Kupon kodu en az 3 karakter olmalıdır')
      .max(32)
      .transform((s) => s.toUpperCase()),
    type: z.enum(['PERCENT', 'FIXED', 'FREE_SHIPPING']),
    value: z.number().int().min(0),
    minTotalKurus: z.number().int().min(0).default(0),
    maxUses: z.number().int().min(1).optional().nullable(),
    perUserLimit: z.number().int().min(1).default(1),
    categoryId: z.string().trim().optional().nullable(),
    startsAt: z.string().datetime().optional().nullable(),
    endsAt: z.string().datetime().optional().nullable(),
    description: z.string().trim().max(250).optional().default(''),
  })
  .strict();

export type CouponCreateInput = z.infer<typeof couponCreateSchema>;

export const campaignCreateSchema = z
  .object({
    title: z.string().trim().min(3).max(140),
    subtitle: z.string().trim().max(240).optional().default(''),
    badge: z.string().trim().max(40).optional().default('KAMPANYA'),
    categoryId: z.string().trim().optional().nullable(),
    discountPercent: z.number().int().min(1).max(90).optional().default(15),
    startsAt: z.string().datetime().optional().nullable(),
    endsAt: z.string().datetime().optional().nullable(),
    isActive: z.boolean().optional().default(true),
  })
  .strict();

export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;

/**
 * KVKK İzin Tercihleri Güncelleme Şeması
 */
export const kvkkConsentUpdateSchema = z
  .object({
    marketingEmail: z.boolean().optional(),
    marketingSms: z.boolean().optional(),
    marketingPush: z.boolean().optional(),
    analyticsConsent: z.boolean().optional(),
  })
  .strict();

export type KvkkConsentUpdateInput = z.infer<typeof kvkkConsentUpdateSchema>;
