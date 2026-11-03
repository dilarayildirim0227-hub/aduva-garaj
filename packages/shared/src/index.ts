export * from './brand';
export * from './schemas';
export * from './types';

/** TRY formatlama (KDV dahil gÃ¶sterim) */
export function formatTRY(amount: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

export type OrderMode = 'DIRECT_CHECKOUT' | 'N11_REDIRECT';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PublicUser {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  role: 'CUSTOMER' | 'ADMIN' | 'OPERATIONS' | 'STAFF';
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}