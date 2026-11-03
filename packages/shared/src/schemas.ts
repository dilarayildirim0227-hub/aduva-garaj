import { z } from 'zod';

/** Türkiye cep telefonu: 5XXXXXXXXX (başında 0/+90 olabilir) → normalize edilir */
export const trPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, '').replace(/^(90|0)/, ''))
  .refine((v) => /^5\d{9}$/.test(v), 'Geçerli bir cep telefonu girin (5XX XXX XX XX)');

export const passwordSchema = z
  .string()
  .min(8, 'Şifre en az 8 karakter olmalı')
  .regex(/[A-Za-zÇĞİÖŞÜçğıöşü]/, 'Şifre en az bir harf içermeli')
  .regex(/\d/, 'Şifre en az bir rakam içermeli');

export const registerSchema = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  email: z.string().trim().toLowerCase().email('Geçerli bir e-posta girin'),
  phone: trPhone.optional(),
  password: passwordSchema,
  kvkkAccepted: z.literal(true, { errorMap: () => ({ message: 'KVKK aydınlatma metnini onaylamalısınız' }) }),
  marketingConsent: z.boolean().default(false),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const otpRequestSchema = z.object({ phone: trPhone });
export const otpVerifySchema = z.object({
  phone: trPhone,
  code: z.string().regex(/^\d{6}$/, 'Kod 6 haneli olmalı'),
});

export const refreshSchema = z.object({ refreshToken: z.string().min(20) });

export const socialLoginSchema = z.object({
  provider: z.enum(['google', 'apple']),
  idToken: z.string().min(20),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});
export type SocialLoginInput = z.infer<typeof socialLoginSchema>;

export const productListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  categoryId: z.string().optional(),
  q: z.string().trim().max(100).optional(),
  vehicleId: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  inStock: z.coerce.boolean().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'bestseller']).default('newest'),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
