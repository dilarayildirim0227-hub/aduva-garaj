'use client';

import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { api } from '../../../lib/api';
import { formatKurus } from '../../../lib/cart-api';
import { ProductCard } from '../../../components/ProductCard';
import { CategoryCard } from '../../../components/CategoryCard';

interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  children?: Category[];
  _count?: { products: number };
}

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
}

export default function CategoryDetailScreen() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<'relevance' | 'price_asc' | 'price_desc' | 'newest'>('relevance');

  const slug = router.getParams()?.slug as string;

  const loadCategory = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const [catRes, subRes] = await Promise.all([
        api<Category>(`/categories/${slug}`),
        api<Category[]>(`/categories?parentId=${slug}`),
      ]);
      setCategory(catRes);
      setSubCategories(subRes.filter(c => c.isActive));
      await loadProducts(true);
    } catch (error) {
      console.error('Failed to fetch category:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (reset = false) => {
    if (!slug) return;
    const nextPage = reset ? 1 : page + 1;
    try {
      const res = await api<{ items: Product[]; total: number; page: number; pageSize: number }>(
        `/products?category=${slug}&page=${nextPage}&pageSize=20&sort=${sortBy}`
      );
      if (reset) {
        setProducts(res.items);
      } else {
        setProducts(prev => [...prev, ...res.items]);
      }
      setHasMore(res.items.length === res.pageSize);
      setPage(nextPage);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const handleSortChange = (newSort: typeof sortBy) => {
    setSortBy(newSort);
    setPage(0);
    loadProducts(true);
  };

  useEffect(() => {
    loadCategory();
  }, [slug]);

  const onEndReached = () => {
    if (hasMore && !loading) {
      loadProducts(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="grid-outline" size={48} color="#E10600" />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!category) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>{t('categories.notFound')}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderHeader = () => (
    <View style={styles.header}>
      {category.image && (
        <Image source={{ uri: category.image }} style={styles.headerImage} resizeMode="cover" />
      )}
      <View style={styles.headerOverlay}>
        <Text style={styles.headerTitle}>{category.name}</Text>
        {category.description && <Text style={styles.headerDesc}>{category.description}</Text>}
        <View style={styles.headerMeta}>
          <Text style={styles.headerMetaText}>
            {category._count?.products || 0} {t('categories.products')}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <View style={styles.refreshControl} />
        }
        onRefresh={() => { setPage(0); loadProducts(true); }}
        refreshing={loading}
        ListHeaderComponent={renderHeader}
      >
        {/* Sub Categories */}
        {subCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('categories.subCategories')}</Text>
            <FlatList
              data={subCategories}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <CategoryCard
                  category={item}
                  onPress={() => router.push(`/category/${item.slug}`)}
                />
              )}
              contentContainerStyle={styles.horizontalListContent}
              ItemSeparatorComponent={() => <View style={styles.horizontalGap} />}
            />
          </View>
        )}

        {/* Sort Options */}
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>{t('categories.sortBy')}</Text>
          <View style={styles.sortOptions}>
            {[
              { key: 'relevance', label: t('categories.sort.relevance') },
              { key: 'price_asc', label: t('categories.sort.priceAsc') },
              { key: 'price_desc', label: t('categories.sort.priceDesc') },
              { key: 'newest', label: t('categories.sort.newest') },
            ].map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.sortOption,
                  sortBy === opt.key && styles.sortOptionActive,
                ]}
                onPress={() => handleSortChange(opt.key as typeof sortBy)}
              >
                <Text style={[
                  styles.sortOptionText,
                  sortBy === opt.key && styles.sortOptionTextActive,
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Products */}
        <View style={styles.productsSection}>
          {products.length === 0 ? (
            <View style={styles.emptyProducts}>
              <Ionicons name="cube-outline" size={64} color="#334155" />
              <Text style={styles.emptyTitle}>{t('categories.noProducts')}</Text>
              <Text style={styles.emptyDesc}>{t('categories.noProductsDesc')}</Text>
            </View>
          ) : (
            <FlatList
              data={products}
              keyExtractor={item => item.id}
              numColumns={2}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  onPress={() => router.push(`/product/${item.slug || item.id}`)}
                />
              )}
              contentContainerStyle={styles.gridContent}
              ItemSeparatorComponent={() => <View style={styles.gridGap} />}
              ListHeaderComponent={() => <View style={styles.gridHeader} />}
              ListFooterComponent={() => <View style={styles.gridFooter} />}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.5}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  backButton: { marginTop: 16, backgroundColor: '#E10600', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  backButtonText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  scrollContent: { paddingBottom: 24 },
  refreshControl: { height: 0 },
  header: { position: 'relative', height: 200 },
  headerImage: { width: '100%', height: '100%' },
  headerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(15, 23, 42, 0.95)' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerDesc: { fontSize: 13, color: '#94a3b8', marginBottom: 8 },
  headerMeta: { flexDirection: 'row', gap: 16 },
  headerMetaText: { fontSize: 12, fontWeight: '600', color: '#E10600' },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 12 },
  horizontalListContent: { paddingHorizontal: 16, paddingRight: 16 },
  horizontalGap: { width: 12 },
  sortContainer: { paddingHorizontal: 16, marginBottom: 16 },
  sortLabel: { fontSize: 13, fontWeight: '700', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' },
  sortOptions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  sortOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  sortOptionActive: { backgroundColor: '#E10600', borderColor: '#E10600' },
  sortOptionText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  sortOptionTextActive: { color: '#fff', fontWeight: '700' },
  productsSection: { paddingHorizontal: 16 },
  emptyProducts: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emptyDesc: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  gridContent: { paddingBottom: 24 },
  gridHeader: { height: 8 },
  gridFooter: { height: 24 },
  gridGap: { width: 12 },
});