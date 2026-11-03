import { z } from 'zod';

export const orderItemInputSchema = z.object({
  productId: z.string().trim().min(1),
  variantId: z.string().trim().min(1).nullable().optional(),
  quantity: z.number().int().min(1).max(50),
});

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(2, 'Ad Soyad en az 2 karakter olmalıdır.').max(120),
  phone: z
    .string()
    .trim()
    .regex(/^(\+90|0)?5[0-9]{9}$/, 'Geçerli bir Türkiye cep telefonu girin (05XX XXX XX XX).')
    .default('05320000000'),
  city: z.string().trim().min(2).max(60),
  district: z.string().trim().min(2).max(60),
  neighborhood: z.string().trim().max(80).optional(),
  addressLine: z.string().trim().min(5).max(300).default('Merkez Mah. Atatürk Cad. No:1'),
  invoiceType: z.enum(['INDIVIDUAL', 'CORPORATE']).default('INDIVIDUAL'),
  companyName: z.string().trim().max(160).nullable().optional(),
  taxOffice: z.string().trim().max(80).nullable().optional(),
  taxNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{10,11}$/, 'VKN 10, TCKN 11 haneli rakam olmalıdır.')
    .nullable()
    .optional(),
  paymentMethod: z.enum(['CARD', 'CASH_ON_DELIVERY', 'BANK_TRANSFER']).default('CARD'),
  installmentCount: z.number().int().min(1).max(12).default(1),
  couponCode: z.string().trim().max(32).nullable().optional(),
  carrier: z.enum(['YURTICI', 'ARAS', 'MNG', 'PTT']).default('YURTICI'),
  distanceSalesContractAccepted: z.boolean().refine((val) => val === true, {
    message: '6502 sayılı kanun gereği Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi onayı zorunludur.',
  }),
  items: z.array(orderItemInputSchema).min(1, 'Sipariş için en az 1 ürün gereklidir.'),
});

export const orderStateTransitionSchema = z.object({
  toStatus: z.enum([
    'PENDING_PAYMENT',
    'PAID',
    'PREPARING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED',
  ]),
  trackingCode: z.string().trim().max(64).optional(),
  carrier: z.string().trim().max(64).optional(),
  note: z.string().trim().max(240).optional(),
});

export const paymentWebhookSchema = z.object({
  eventId: z.string().trim().min(4),
  orderNumber: z.string().trim().min(4),
  conversationId: z.string().trim().min(4),
  providerPaymentId: z.string().trim().min(4),
  status: z.enum(['SUCCESS', 'FAILURE']),
  amountKurus: z.number().int().min(0),
  signature: z.string().trim().min(16),
  errorMessage: z.string().optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(3).max(240).default('Müşteri talebi ile iptal'),
});

export const returnOrderSchema = z.object({
  reason: z.string().trim().min(3).max(240).default('14 Gün Cayma Hakkı Kapsamında İade'),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        quantity: z.number().int().min(1),
      }),
    )
    .optional(),
});

export const shippingCalculateSchema = z.object({
  subtotalKurus: z.number().int().min(0),
  totalDesi: z.number().min(0.5).max(200).default(3),
  carrier: z.enum(['YURTICI', 'ARAS', 'MNG', 'PTT']).default('YURTICI'),
  paymentMethod: z.enum(['CARD', 'CASH_ON_DELIVERY', 'BANK_TRANSFER']).default('CARD'),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderStateTransitionInput = z.infer<typeof orderStateTransitionSchema>;
export type PaymentWebhookInput = z.infer<typeof paymentWebhookSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type ReturnOrderInput = z.infer<typeof returnOrderSchema>;
export type ShippingCalculateInput = z.infer<typeof shippingCalculateSchema>;
