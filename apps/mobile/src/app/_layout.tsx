import { Stack } from 'expo-router';
import { Providers } from '../providers';

export default function RootLayout() {
  return (
    <Providers>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0f172a' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ presentation: 'card' }} />
        <Stack.Screen name="product/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="orders" options={{ presentation: 'card' }} />
        <Stack.Screen name="orders/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="checkout" options={{ presentation: 'card' }} />
        <Stack.Screen name="vehicles" options={{ presentation: 'card' }} />
        <Stack.Screen name="appointments" options={{ presentation: 'card' }} />
        <Stack.Screen name="search" options={{ presentation: 'card' }} />
        <Stack.Screen name="category/[slug]" options={{ presentation: 'card' }} />
        <Stack.Screen name="legal" options={{ presentation: 'card' }} />
        <Stack.Screen name="addresses" options={{ presentation: 'card' }} />
        <Stack.Screen name="addresses/add" options={{ presentation: 'card' }} />
        <Stack.Screen name="addresses/edit/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="settings" options={{ presentation: 'card' }} />
        <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
        <Stack.Screen name="+not-found" options={{ presentation: 'card' }} />
      </Stack>
    </Providers>
  );
}