'use client';

import { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useAuth } from '../../stores/auth';
import { api } from '../../lib/api';
import { VehicleSelector } from '../../components/VehicleSelector';
import { ProductCard } from '../../components/ProductCard';
import { CategoryCard } from '../../components/CategoryCard';
import { Banner } from '../../components/Banner';

interface Product {
  id: string;
  slug: string;
  sellerCode: string;
  title: string;
  brand: string;
  price: number;
  priceKurus?: number;
  listPrice?: number;
  stock: number;
  maxPerOrder?: number;
  image?: string;
  isUniversal?: boolean;
  isFeatured?: boolean;
  fitmentVehicleIds?: string[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

interface BannerItem {
  id: string;
  title: string;
  imageUrl: string;
  linkType: string;
  linkTarget?: string;
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [productsRes, catalogRes] = await Promise.all([
        api<{ items: Product[] }>(`/products${selectedVehicleId ? `?vehicleId=${selectedVehicleId}` : ''}`),
        api<{ products: Product[]; categories: Category[]; banners: BannerItem[] }>('/catalog/bootstrap'),
      ]);
      setProducts(productsRes.items || []);
      setCategories(catalogRes.categories || []);
      setBanners(catalogRes.banners || []);
    } catch (error) {
      console.error('Failed to fetch home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedVehicleId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E10600" />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E10600']} />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="logo-firebase" size={32} color="#E10600" />
            <Text style={styles.logoText}>Aduva Garaj</Text>
          </View>
          {user && (
            <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/profile')}>
              <Ionicons name="person-circle-outline" size={28} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Vehicle Selector */}
        <VehicleSelector
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={setSelectedVehicleId}
          label={t('home.vehicleSelector')}
        />

        {/* Banners */}
        {banners.length > 0 && (
          <View style={styles.section}>
            <FlatList
              data={banners}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <Banner banner={item} />}
              contentContainerStyle={styles.bannerList}
            />
          </View>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('home.categories')}</Text>
            <FlatList
              data={categories}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <CategoryCard category={item} />}
              contentContainerStyle={styles.categoryList}
            />
          </View>
        )}

        {/* Featured Products */}
        {products.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('home.featuredProducts')}</Text>
            </View>
            <FlatList
              data={products.filter(p => p.isFeatured).slice(0, 10)}
              numColumns={2}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ProductCard product={item} />}
              contentContainerStyle={styles.productGrid}
              ItemSeparatorComponent={() => <View style={styles.gridGap} />}
            />
          </View>
        )}

        {/* All Products */}
        {products.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tüm Ürünler</Text>
            </View>
            <FlatList
              data={products.slice(0, 20)}
              numColumns={2}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ProductCard product={item} />}
              contentContainerStyle={styles.productGrid}
              ItemSeparatorComponent={() => <View style={styles.gridGap} />}
              ListFooterComponent={() => <View style={styles.listFooter} />}
            />
          </View>
        )}

        {products.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#64748b" />
            <Text style={styles.emptyText}>{t('home.noProducts')}</Text>
            <Text style={styles.emptySubtext}>{t('home.selectVehicleFirst')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  scrollContent: { paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  profileButton: { padding: 4 },
  section: { paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  bannerList: { paddingHorizontal: 16, gap: 12 },
  categoryList: { paddingHorizontal: 16, gap: 10 },
  productGrid: { paddingHorizontal: 16, gap: 12 },
  gridGap: { height: 12 },
  listFooter: { height: 80 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center' },
  emptySubtext: { fontSize: 13, color: '#64748b', textAlign: 'center' },
});