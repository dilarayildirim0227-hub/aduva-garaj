import { Ionicons } from '@expo/vector-icons';
import { formatTRY, type Paginated } from '@aduva/shared';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/stores/auth';

interface ProductCard {
  id: string;
  slug: string;
  title: string;
  price: number;
  listPrice: number | null;
  stock: number;
  image: string | null;
}

function Skeleton() {
  return (
    <View className="flex-1 m-1.5 rounded-2xl bg-surface overflow-hidden">
      <View className="aspect-square bg-surface-alt" />
      <View className="p-3 gap-2">
        <View className="h-3 rounded bg-surface-alt" />
        <View className="h-3 w-2/3 rounded bg-surface-alt" />
        <View className="h-4 w-1/2 rounded bg-surface-alt mt-1" />
      </View>
    </View>
  );
}

function Card({ p }: { p: ProductCard }) {
  const { t } = useTranslation();
  const discount = p.listPrice ? Math.round((1 - p.price / p.listPrice) * 100) : 0;
  return (
    <Pressable className="flex-1 m-1.5 rounded-2xl bg-surface border border-line overflow-hidden active:opacity-80" accessibilityRole="button" accessibilityLabel={p.title}>
      <View className="aspect-square bg-white">
        {p.image && <Image source={p.image} style={{ flex: 1 }} contentFit="cover" transition={200} cachePolicy="memory-disk" />}
        {discount > 0 && (
          <View className="absolute top-2 left-2 bg-primary rounded-md px-2 py-0.5">
            <Text className="text-white text-xs font-bold">%{discount}</Text>
          </View>
        )}
        {p.stock <= 0 && (
          <View className="absolute inset-0 bg-black/60 items-center justify-center">
            <Text className="text-white font-bold">{t('stock.out')}</Text>
          </View>
        )}
      </View>
      <View className="p-3">
        <Text numberOfLines={2} className="text-fg text-sm min-h-[36px]">{p.title}</Text>
        {p.listPrice && <Text className="text-fg-muted text-xs line-through mt-1">{formatTRY(p.listPrice)}</Text>}
        <Text className="text-fg text-base font-extrabold">{formatTRY(p.price)}</Text>
      </View>
    </Pressable>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user);
  const q = useQuery({
    queryKey: ['products', 'newest'],
    queryFn: () => api<Paginated<ProductCard>>('/products?sort=newest&limit=20'),
  });

  const header = (
    <View className="px-1.5 pb-3">
      <View className="flex-row items-center justify-between mb-5 px-1.5">
        <View>
          <Text className="text-fg-muted text-sm">{t('home.greeting')}{user?.firstName ? `, ${user.firstName}` : ''} 👋</Text>
          <Text className="text-fg text-2xl font-extrabold tracking-wider">ADUVA <Text className="text-primary">GARAJ</Text></Text>
        </View>
        <Pressable className="w-11 h-11 rounded-full bg-surface border border-line items-center justify-center" accessibilityLabel="Bildirimler">
          <Ionicons name="notifications-outline" size={22} color="#F5F6F7" />
        </Pressable>
      </View>

      <Pressable onPress={() => router.push('/(tabs)/garage')} className="mx-1.5 rounded-2xl bg-surface border border-primary/40 p-4 flex-row items-center active:opacity-80">
        <View className="w-12 h-12 rounded-xl bg-primary/15 items-center justify-center mr-3">
          <Ionicons name="car-sport" size={26} color="#E10600" />
        </View>
        <Text className="text-fg flex-1 font-semibold">{t('home.pickVehicle')}</Text>
        <Ionicons name="chevron-forward" size={20} color="#9AA3AE" />
      </Pressable>

      <Text className="text-fg text-lg font-bold mt-6 mb-1 px-1.5">{t('home.newArrivals')}</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      {q.isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cloud-offline-outline" size={56} color="#9AA3AE" />
          <Text className="text-fg-muted text-center my-4">{(q.error as Error).message}</Text>
          <Pressable onPress={() => q.refetch()} className="bg-primary rounded-xl px-6 h-12 justify-center">
            <Text className="text-white font-bold">{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={q.isLoading ? (Array.from({ length: 6 }) as (ProductCard | undefined)[]) : q.data?.items}
          numColumns={2}
          keyExtractor={(item, i) => item?.id ?? `s${i}`}
          contentContainerStyle={{ padding: 10 }}
          ListHeaderComponent={header}
          ListEmptyComponent={<Text className="text-fg-muted text-center mt-10 px-8">{t('home.empty')}</Text>}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={q.refetch} tintColor="#E10600" />}
          renderItem={({ item }) => (item ? <Card p={item} /> : <Skeleton />)}
        />
      )}
    </SafeAreaView>
  );
}
