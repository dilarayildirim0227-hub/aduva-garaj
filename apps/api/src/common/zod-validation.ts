import { HttpStatus } from '@nestjs/common';
import { z } from 'zod';
import { AppDomainError, ErrorCode } from './error-codes';

export function validateWithZod<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.errors.map((e) => `${e.path.join('.') || 'root'}: ${e.message}`).join('; ');
    throw new AppDomainError(
      ErrorCode.VALIDATION_FAILED,
      `Veri doğrulama hatası: ${issues}`,
      HttpStatus.BAD_REQUEST,
      { errors: result.error.errors },
    );
  }
  return result.data;
}
