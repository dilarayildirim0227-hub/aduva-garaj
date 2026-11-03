import '../global.css';
import '../src/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { restoreSession } from '../src/lib/api';
import { usePrefs } from '../src/stores/auth';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, gcTime: 24 * 60 * 60_000, retry: 2 },
  },
});

export default function RootLayout() {
  useEffect(() => {
    // Oturum geri yükleme + kalıcı tercihlerin okunması bitince splash kapanır
    const waitPrefs = new Promise<void>((resolve) => {
      if (usePrefs.persist.hasHydrated()) return resolve();
      const unsub = usePrefs.persist.onFinishHydration(() => { unsub(); resolve(); });
    });
    Promise.all([restoreSession(), waitPrefs]).finally(() => SplashScreen.hideAsync());
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0D10' } }}>
          <Stack.Screen name="auth/login" options={{ presentation: 'modal' }} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
