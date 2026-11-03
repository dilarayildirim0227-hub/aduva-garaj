import { z } from 'zod';

// Güçlü parola kuralı: en az 8 karakter, 1 büyük harf, 1 küçük harf, 1 rakam
export const strongPasswordSchema = z
  .string()
  .min(8, 'Parola en az 8 karakter olmalıdır.')
  .max(128, 'Parola en fazla 128 karakter olabilir.')
  .regex(/[A-ZÇĞİÖŞÜ]/, 'Parola en az bir büyük harf içermelidir.')
  .regex(/[a-zçğıöşü]/, 'Parola en az bir küçük harf içermelidir.')
  .regex(/[0-9]/, 'Parola en az bir rakam içermelidir.');

export const forgotPasswordSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin.'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(16, 'Geçersiz parola sıfırlama anahtarı.'),
  newPassword: strongPasswordSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
