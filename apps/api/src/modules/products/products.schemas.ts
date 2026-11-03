import { z } from 'zod';

export const autocompleteQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(15).default(6),
});

export const fitmentCheckQuerySchema = z.object({
  productId: z.string().trim().min(1),
  vehicleId: z.string().trim().min(1),
});

export const userVehicleCreateSchema = z.object({
  vehicleId: z.string().trim().min(1, 'Araç seçimi zorunludur.'),
  nickname: z.string().trim().max(60).optional(),
  vinCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'Geçerli 17 haneli ISO-3779 şasi numarası girin.')
    .optional(),
  isPrimary: z.boolean().default(true),
});

export const adminProductCreateSchema = z.object({
  sellerCode: z.string().trim().min(2).max(64),
  oemCode: z.string().trim().max(64).optional(),
  title: z.string().trim().min(5).max(240),
  description: z.string().trim().max(4000).optional(),
  brand: z.string().trim().min(2).max(80),
  priceKurus: z.number().int().min(100),
  listPriceKurus: z.number().int().min(100).optional(),
  stock: z.number().int().min(0),
  maxPerOrder: z.number().int().min(1).max(50).default(10),
  categoryId: z.string().trim().min(1),
  isUniversal: z.boolean().default(false),
  requiresMontage: z.boolean().default(false),
  fitmentVehicleIds: z.array(z.string()).default([]),
  imageUrl: z.string().url().optional(),
  attributes: z.record(z.string(), z.string()).default({}),
});

export type AutocompleteQuery = z.infer<typeof autocompleteQuerySchema>;
export type FitmentCheckQuery = z.infer<typeof fitmentCheckQuerySchema>;
export type UserVehicleCreateInput = z.infer<typeof userVehicleCreateSchema>;
export type AdminProductCreateInput = z.infer<typeof adminProductCreateSchema>;
