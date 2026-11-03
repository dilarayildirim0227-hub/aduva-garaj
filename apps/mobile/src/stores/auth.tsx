'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth as useAuthStore, usePrefs } from './auth';
import { api, restoreSession } from '../lib/api';
import type { PublicUser, AuthTokens } from '@aduva/shared';

interface AuthContextType {
  user: PublicUser | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string, loginMode?: 'MEMBER' | 'ADMIN') => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  city?: string;
  district?: string;
  addressLine?: string;
  kvkkAccepted: boolean;
  marketingConsent?: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, accessToken, setSession, logout: storeLogout, hydrate } = useAuthStore();
  const { setOnboardingDone } = usePrefs();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    restoreSession().then((restored) => {
      if (mounted) {
        setLoading(false);
        if (restored) {
          // Oturum geri yüklendi, kullanıcıyı çek
          refreshUser().catch(() => {});
        }
      }
    });
    return () => { mounted = false; };
  }, []);

  const refreshUser = async () => {
    try {
      const data = await api<{ user: PublicUser }>('/auth/me');
      // Store'da user'ı güncelle (accessToken zaten var)
      useAuthStore.setState({ user: data.user });
    } catch {
      await storeLogout();
    }
  };

  const login = async (email: string, password: string, loginMode: 'MEMBER' | 'ADMIN' = 'MEMBER') => {
    const res = await api<AuthTokens & { user: PublicUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, loginMode }),
    });
    await setSession(res);
  };

  const register = async (data: RegisterData) => {
    const res = await api<AuthTokens & { user: PublicUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await setSession(res);
    setOnboardingDone();
  };

  const logout = async () => {
    await storeLogout();
    useAuthStore.setState({ user: null });
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}