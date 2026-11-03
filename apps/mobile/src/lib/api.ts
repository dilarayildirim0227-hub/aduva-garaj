import Constants from 'expo-constants';
import type { AuthTokens, PublicUser } from '@aduva/shared';
import { getRefreshToken, useAuth } from '../stores/auth';

/** Android emülatörde localhost yerine 10.0.2.2; gerçek cihazda bilgisayarınızın LAN IP'sini app.json → extra.apiUrl'e yazın */
export const API_URL: string = (Constants.expoConfig?.extra as any)?.apiUrl ?? 'http://localhost:4000/v1';

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly body?: any) {
    super(message);
  }
}

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    await useAuth.getState().logout();
    return null;
  }
  const data = (await res.json()) as AuthTokens & { user: PublicUser };
  await useAuth.getState().setSession(data);
  return data.accessToken;
}

/** Tek noktadan API çağrısı: token ekler, 401'de bir kez yeniler (eşzamanlı istekler tek yenilemeyi paylaşır) */
export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = useAuth.getState().accessToken;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError('Bağlantı sorunu. İnternetinizi kontrol edin.', 0);
  }

  if (res.status === 401 && retry) {
    refreshing ??= refreshAccessToken().finally(() => (refreshing = null));
    if (await refreshing) return api<T>(path, init, false);
  }
  const body = await res.json().catch(() => undefined);
  if (!res.ok) throw new ApiError(body?.message ?? 'Beklenmeyen bir hata oluştu', res.status, body);
  return body as T;
}

/** Uygulama açılışında refresh token ile oturumu geri yükle */
export async function restoreSession() {
  const token = await refreshAccessToken().catch(() => null);
  useAuth.setState({ hydrated: true });
  return !!token;
}
