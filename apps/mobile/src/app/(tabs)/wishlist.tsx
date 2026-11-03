'use client';

import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { api } from '../../lib/api';
import { formatKurus } from '../../lib/cart-api';
import { AddToCartButton } from '../../components/AddToCartButton';
import { ProductCard } from '../../components/ProductCard';

interface WishlistItem {
  id: string;
  productId: string;
  product: {
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
    fitmentVehicleIds?: string[];
  };
  priceAlertKurus?: number;
  createdAt: string;
}

export default function WishlistScreen() {
  const { t } = useTranslation();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWishlist = async () => {
    setLoading(true);
    try {
      const res = await api<{ items: WishlistItem[] }>('/users/me/favorites');
      setWishlist(res.items || []);
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const handleRemove = async (itemId: string) => {
    try {
      await api(`/users/me/favorites/${itemId}`, { method: 'DELETE' });
      setWishlist((prev) => prev.filter((item) => item.id !== itemId));
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
    }
  };

  const handleSetPriceAlert = async (itemId: string, priceKurus: number) => {
    try {
      await api('/products/alerts', {
        method: 'POST',
        body: JSON.stringify({ productId: itemId, alertType: 'PRICE_DROP', targetPriceKurus: priceKurus }),
      });
    } catch (error) {
      console.error('Failed to set price alert:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="heart-outline" size={48} color="#E10600" />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('wishlist.title')}</Text>
        <Text style={styles.headerSubtitle}>{wishlist.length} {t('wishlist.items')}</Text>
      </View>

      {wishlist.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={80} color="#334155" />
          <Text style={styles.emptyTitle}>{t('wishlist.empty')}</Text>
          <Text style={styles.emptyDesc}>{t('wishlist.emptyDesc')}</Text>
          <TouchableOpacity style={styles.shopButton} onPress={() => router.push('/')}>
            <Text style={styles.shopButtonText}>{t('wishlist.startShopping')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={wishlist}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.wishlistItem}
              onPress={() => router.push(`/product/${item.product.slug || item.product.id}`)}
              activeOpacity={0.85}
            >
              <View style={styles.itemLeft}>
                {item.product.image && (
                  <Image source={{ uri: item.product.image }} style={styles.itemImage} resizeMode="cover" />
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle}>{item.product.title}</Text>
                  <Text style={styles.itemBrand}>{item.product.brand}</Text>
                  <View style={styles.itemPriceRow}>
                    <Text style={styles.itemPrice}>{formatKurus(item.product.priceKurus ?? Math.round(Number(item.product.price) * 100))}</Text>
                    {item.product.listPrice && (
                      <Text style={styles.itemListPrice}>{formatKurus(Math.round(Number(item.product.listPrice) * 100))}</Text>
                    )}
                  </View>
                  <View style={styles.itemBadges}>
                    {item.product.stock <= 0 && (
                      <View style={styles.outOfStockBadge}>
                        <Text style={styles.outOfStockBadgeText}>{t('product.outOfStock')}</Text>
                      </View>
                    )}
                    {item.product.stock > 0 && item.product.stock <= 5 && (
                      <View style={styles.lowStockBadge}>
                        <Text style={styles.lowStockBadgeText}>{t('product.lowStock')}</Text>
                      </View>
                    )}
                    {item.priceAlertKurus && (
                      <View style={styles.priceAlertBadge}>
                        <Ionicons name="notifications-outline" size={10} color="#f59e0b" />
                        <Text style={styles.priceAlertBadgeText}>
                          {t('wishlist.alertSet').replace('{{price}}', formatKurus(item.priceAlertKurus))}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.itemActions}>
                <AddToCartButton
                  productId={item.product.id}
                  productTitle={item.product.title}
                  stock={item.product.stock}
                  maxPerOrder={item.product.maxPerOrder}
                />
                <TouchableOpacity style={styles.removeButton} onPress={() => handleRemove(item.id)}>
                  <Ionicons name="trash-outline" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: '#64748b' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  emptyDesc: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  shopButton: { backgroundColor: '#E10600', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  shopButtonText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  wishlistItem: { backgroundColor: '#1e293b', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#334155' },
  itemLeft: { flexDirection: 'row', gap: 12, flex: 1 },
  itemImage: { width: 70, height: 70, borderRadius: 10 },
  itemInfo: { justifyContent: 'center', gap: 4 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  itemBrand: { fontSize: 11, fontWeight: '700', color: '#E10600', textTransform: 'uppercase' },
  itemPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  itemPrice: { fontSize: 16, fontWeight: '800', color: '#fff' },
  itemListPrice: { fontSize: 12, fontWeight: '500', color: '#64748b', textDecorationLine: 'line-through' },
  itemBadges: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  outOfStockBadge: { backgroundColor: '#7f1d1d', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  outOfStockBadgeText: { fontSize: 10, fontWeight: '700', color: '#fca5a5' },
  lowStockBadge: { backgroundColor: '#78350f', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  lowStockBadgeText: { fontSize: 10, fontWeight: '700', color: '#fde68a' },
  priceAlertBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#78350f', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  priceAlertBadgeText: { fontSize: 10, fontWeight: '700', color: '#fde68a' },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  removeButton: { padding: 8 },
  separator: { height: 10 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
});