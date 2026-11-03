'use client';

import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { api } from '../../lib/api';
import { CategoryCard } from '../../components/CategoryCard';

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

export default function CategoryScreen() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await api<Category[]>('/categories');
      const topLevel = res.filter(c => !c.parentId && c.isActive);
      setCategories(topLevel);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const currentCategories = selectedParentId
    ? categories.find(c => c.id === selectedParentId)?.children || []
    : categories;

  const breadcrumbs = selectedParentId
    ? [{ id: null, name: t('categories.all') }, ...getBreadcrumbPath(categories, selectedParentId)]
    : [];

  function getBreadcrumbPath(cats: Category[], targetId: string): Category[] {
    for (const cat of cats) {
      if (cat.id === targetId) return [cat];
      if (cat.children) {
        const found = getBreadcrumbPath(cat.children, targetId);
        if (found.length) return [cat, ...found];
      }
    }
    return [];
  }

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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('categories.title')}</Text>
      </View>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <View style={styles.breadcrumbContainer}>
          <FlatList
            data={breadcrumbs}
            keyExtractor={(item, i) => i.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <TouchableOpacity style={styles.breadcrumbItem} onPress={() => setSelectedParentId(item.id)}>
                <Text style={[styles.breadcrumbText, index === breadcrumbs.length - 1 && styles.breadcrumbActive]}>
                  {item.name}
                </Text>
                {index < breadcrumbs.length - 1 && <Ionicons name="chevron-forward-outline" size={16} color="#64748b" />}
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.breadcrumbContent}
          />
        </View>
      )}

      {/* Category Grid */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {currentCategories.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-outline" size={64} color="#334155" />
            <Text style={styles.emptyTitle}>{t('categories.empty')}</Text>
            <Text style={styles.emptyDesc}>{t('categories.emptyDesc')}</Text>
          </View>
        ) : (
          <FlatList
            data={currentCategories}
            keyExtractor={item => item.id}
            numColumns={2}
            renderItem={({ item }) => (
              <CategoryCard
                category={item}
                onPress={() => {
                  if (item.children && item.children.length > 0) {
                    setSelectedParentId(item.id);
                  } else {
                    router.push(`/category/${item.slug}`);
                  }
                }}
              />
            )}
            contentContainerStyle={styles.gridContent}
            ItemSeparatorComponent={() => <View style={styles.gridGap} />}
            ListHeaderComponent={() => <View style={styles.gridHeader} />}
            ListFooterComponent={() => <View style={styles.gridFooter} />}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Import ScrollView
import { ScrollView } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  header: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  breadcrumbContainer: { borderBottomWidth: 1, borderBottomColor: '#1e293b', paddingVertical: 8 },
  breadcrumbContent: { paddingHorizontal: 16, gap: 4 },
  breadcrumbItem: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  breadcrumbText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  breadcrumbActive: { color: '#E10600', fontWeight: '700' },
  scrollContent: { paddingBottom: 24 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32, marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emptyDesc: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  gridContent: { paddingHorizontal: 16 },
  gridHeader: { height: 8 },
  gridFooter: { height: 24 },
  gridGap: { width: 12 },
});