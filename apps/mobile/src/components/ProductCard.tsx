'use client';

import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { formatKurus } from '../lib/cart-api';

interface Product {
  id: string;
  slug?: string;
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
}

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const { t } = useTranslation();
  const priceKurus = product.priceKurus ?? Math.round(Number(product.price) * 100);
  const listPriceKurus = product.listPrice ? Math.round(Number(product.listPrice) * 100) : null;
  const hasDiscount = listPriceKurus && listPriceKurus > priceKurus;
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/product/${product.slug || product.id}`);
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.85}>
      {/* Product Image */}
      <View style={styles.imageContainer}>
        {product.image ? (
          <Image
            source={{ uri: product.image }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <Ionicons name="cube-outline" size={32} color="#334155" />
          </View>
        )}

        {/* Badges */}
        <View style={styles.badgeContainer}>
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>-%{Math.round(((listPriceKurus - priceKurus) / listPriceKurus) * 100)}</Text>
            </View>
          )}
          {product.isFeatured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={12} color="#fff" />
              <Text style={styles.featuredBadgeText}>{t('product.featured')}</Text>
            </View>
          )}
          {isOutOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>{t('product.outOfStock')}</Text>
            </View>
          )}
        </View>

        {/* Universal Badge */}
        {product.isUniversal && (
          <View style={styles.universalBadge}>
            <Ionicons name="globe-outline" size={10} color="#fff" />
            <Text style={styles.universalBadgeText}>{t('product.universal')}</Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.infoContainer}>
        <View style={styles.brandRow}>
          <Text style={styles.brandText}>{product.brand}</Text>
          <Text style={styles.skuText}>{product.sellerCode}</Text>
        </View>

        <Text style={styles.titleText} numberOfLines={2}>{product.title}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.priceText}>{formatKurus(priceKurus)}</Text>
          {hasDiscount && (
            <Text style={styles.listPriceText}>{formatKurus(listPriceKurus!)}</Text>
          )}
        </View>

        <View style={styles.stockRow}>
          <View style={styles.stockBadge}>
            <View style={[styles.stockDot, isOutOfStock && styles.stockDotOut, isLowStock && !isOutOfStock && styles.stockDotLow]} />
            <Text style={styles.stockText}>
              {isOutOfStock ? t('product.outOfStock') : isLowStock ? t('product.lowStock') : t('product.inStock')}
            </Text>
          </View>
          {product.fitmentVehicleIds && product.fitmentVehicleIds.length > 0 && !product.isUniversal && (
            <View style={styles.fitmentBadge}>
              <Ionicons name="checkmark-shield-outline" size={12} color="#22c55e" />
              <Text style={styles.fitmentBadgeText}>{product.fitmentVehicleIds.length} araç</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    width: '48%',
  },
  imageContainer: { position: 'relative', height: 140 },
  image: { width: '100%', height: '100%' },
  placeholderImage: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  badgeContainer: { position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between' },
  discountBadge: { backgroundColor: '#E10600', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  discountBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  featuredBadge: { backgroundColor: '#f59e0b', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 2 },
  featuredBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  outOfStockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  outOfStockText: { fontSize: 12, fontWeight: '700', color: '#fca5a5' },
  universalBadge: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 2 },
  universalBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff', textTransform: 'uppercase' },
  infoContainer: { padding: 12, gap: 6 },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandText: { fontSize: 11, fontWeight: '700', color: '#E10600', textTransform: 'uppercase', letterSpacing: 0.3 },
  skuText: { fontSize: 10, fontWeight: '500', color: '#64748b', fontFamily: 'monospace' },
  titleText: { fontSize: 13, fontWeight: '700', color: '#fff', lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  priceText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  listPriceText: { fontSize: 12, fontWeight: '500', color: '#64748b', textDecorationLine: 'line-through' },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  stockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stockDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  stockDotOut: { backgroundColor: '#ef4444' },
  stockDotLow: { backgroundColor: '#f59e0b' },
  stockText: { fontSize: 10, fontWeight: '600', color: '#94a3b8' },
  fitmentBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#052e16', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  fitmentBadgeText: { fontSize: 9, fontWeight: '700', color: '#22c55e' },
});