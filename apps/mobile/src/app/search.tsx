'use client';

import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, TextInput, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useEffect, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { api } from '../lib/api';
import { formatKurus } from '../lib/cart-api';
import { ProductCard } from '../components/ProductCard';
import { CategoryCard } from '../components/CategoryCard';

interface SearchResult {
  products: Array<{
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
  }>;
  categories: Array<{
    id: string;
    slug: string;
    name: string;
    image: string | null;
    _count: { products: number };
  }>;
  suggestions: string[];
}

interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

const SEARCH_HISTORY_KEY = '@search_history';

export default function SearchScreen() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const stored = await router.getParams() || {};
      // Using async storage would be better, but for now use local state
      const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SearchHistoryItem[];
        setHistory(parsed);
        setRecentSearches(parsed.map(h => h.query).slice(0, 8));
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const saveToHistory = (searchQuery: string) => {
    const newItem: SearchHistoryItem = { query: searchQuery, timestamp: Date.now() };
    const filtered = history.filter(h => h.query.toLowerCase() !== searchQuery.toLowerCase());
    const updated = [newItem, ...filtered].slice(0, 20);
    setHistory(updated);
    setRecentSearches(updated.map(h => h.query).slice(0, 8));
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    try {
      const res = await api<SearchResult>(`/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
      setResults(res);
      saveToHistory(searchQuery);
      setShowHistory(false);
    } catch (error) {
      console.error('Search failed:', error);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    setRecentSearches([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const handleHistoryPress = (searchQuery: string) => {
    setQuery(searchQuery);
    handleSearch(searchQuery);
  };

  const handleCategoryPress = (slug: string) => {
    router.push(`/category/${slug}`);
  };

  if (loading && !results) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="search-outline" size={48} color="#E10600" />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={24} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('search.placeholder')}
            placeholderTextColor="#64748b"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch(query)}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query && (
            <TouchableOpacity style={styles.clearButton} onPress={() => { setQuery(''); setResults(null); }}>
              <Ionicons name="close-outline" size={24} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Recent Searches */}
        {(showHistory || (!query && !results)) && recentSearches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('search.recentSearches')}</Text>
              {recentSearches.length > 0 && (
                <TouchableOpacity style={styles.clearHistoryButton} onPress={handleClearHistory}>
                  <Text style={styles.clearHistoryText}>{t('search.clearHistory')}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.historyList}>
              {recentSearches.map((item, idx) => (
                <TouchableOpacity key={idx} style={styles.historyItem} onPress={() => handleHistoryPress(item)}>
                  <Ionicons name="time-outline" size={20} color="#64748b" />
                  <Text style={styles.historyItemText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Search Results */}
        {query && (
          <>
            {loading ? (
              <View style={styles.searchingContainer}>
                <Ionicons name="spinner" size={32} color="#E10600" style={styles.spinner} />
                <Text style={styles.searchingText}>{t('search.searching')}</Text>
              </View>
            ) : results ? (
              <>
                {/* Categories */}
                {results.categories.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('search.categoriesFound').replace('{{count}}', results.categories.length.toString())}</Text>
                    <FlatList
                      data={results.categories}
                      keyExtractor={item => item.id}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      renderItem={({ item }) => (
                        <CategoryCard
                          category={item}
                          onPress={() => handleCategoryPress(item.slug)}
                        />
                      )}
                      contentContainerStyle={styles.horizontalListContent}
                      ItemSeparatorComponent={() => <View style={styles.horizontalGap} />}
                    />
                  </View>
                )}

                {/* Products */}
                {results.products.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('search.productsFound').replace('{{count}}', results.products.length.toString())}</Text>
                    <FlatList
                      data={results.products}
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
                    />
                  </View>
                )}

                {/* No Results */}
                {results.products.length === 0 && results.categories.length === 0 && (
                  <View style={styles.noResults}>
                    <Ionicons name="search-outline" size={64} color="#334155" />
                    <Text style={styles.noResultsTitle}>{t('search.noResults')}</Text>
                    <Text style={styles.noResultsDesc}>{t('search.noResultsDesc').replace('{{query}}', query)}</Text>
                    <View style={styles.suggestions}>
                      <Text style={styles.suggestionsLabel}>{t('search.suggestions')}</Text>
                      <View style={styles.suggestionsTags}>
                        {results.suggestions.slice(0, 5).map((sugg, idx) => (
                          <TouchableOpacity key={idx} style={styles.suggestionTag} onPress={() => handleSearch(sugg)}>
                            <Text style={styles.suggestionTagText}>{sugg}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </>
            ) : null}
          </>
        )}

        {/* Popular Categories (when no query) */}
        {!query && !results && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('search.popularCategories')}</Text>
            <PopularCategories onPress={handleCategoryPress} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Popular Categories Component
function PopularCategories({ onPress }: { onPress: (slug: string) => void }) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Array<{ id: string; slug: string; name: string; image: string | null; _count: { products: number } }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api<Array<{ id: string; slug: string; name: string; image: string | null; _count: { products: number } }>>('/categories?parentId=null&limit=8');
        setCategories(res.filter(c => c.isActive));
      } catch (error) {
        console.error('Failed to load popular categories:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <View style={styles.loadingInline} />;

  return (
    <FlatList
      data={categories}
      keyExtractor={item => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      renderItem={({ item }) => (
        <CategoryCard category={item} onPress={() => onPress(item.slug)} />
      )}
      contentContainerStyle={styles.horizontalListContent}
      ItemSeparatorComponent={() => <View style={styles.horizontalGap} />}
    />
  );
}

import { useState } from 'react';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#fff', paddingVertical: 12 },
  clearButton: { padding: 4 },
  cancelButton: { paddingHorizontal: 8 },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#E10600' },
  scrollContent: { paddingBottom: 24 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  clearHistoryButton: { padding: 4 },
  clearHistoryText: { fontSize: 13, fontWeight: '600', color: '#E10600' },
  historyList: { paddingHorizontal: 16, gap: 4 },
  historyItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  historyItemText: { flex: 1, fontSize: 14, color: '#fff' },
  searchingContainer: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  spinner: { marginTop: 4 },
  searchingText: { fontSize: 14, color: '#94a3b8' },
  horizontalListContent: { paddingHorizontal: 16 },
  horizontalGap: { width: 12 },
  gridContent: { paddingHorizontal: 16 },
  gridHeader: { height: 8 },
  gridFooter: { height: 24 },
  gridGap: { width: 12 },
  noResults: { alignItems: 'center', gap: 16, paddingHorizontal: 32, paddingVertical: 40 },
  noResultsTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  noResultsDesc: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  suggestions: { width: '100%', gap: 12, marginTop: 16 },
  suggestionsLabel: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  suggestionsTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  suggestionTag: { backgroundColor: '#1e293b', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#334155' },
  suggestionTagText: { fontSize: 13, fontWeight: '600', color: '#E10600' },
  loadingInline: { height: 100, justifyContent: 'center', alignItems: 'center' },
});