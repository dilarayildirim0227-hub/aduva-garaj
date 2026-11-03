'use client';

import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { api } from '../../../lib/api';
import { formatKurus } from '../../../lib/cart-api';
import { AddToCartButton } from '../../../components/AddToCartButton';
import { VehicleSelector } from '../../../components/VehicleSelector';
import { useAuth } from '../../../stores/auth';

interface Product {
  id: string;
  slug: string;
  sellerCode: string;
  title: string;
  brand: string;
  description: string | null;
  price: number;
  priceKurus?: number;
  listPrice?: number;
  stock: number;
  maxPerOrder?: number;
  images: string[];
  isUniversal?: boolean;
  fitmentVehicleIds?: string[];
  variants?: Array<{
    id: string;
    name: string;
    stock: number;
    priceKurus?: number;
  }>;
  category?: {
    id: string;
    slug: string;
    name: string;
  };
  attributes?: Array<{
    key: string;
    value: string;
  }>;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { t } = useTranslation();
  const { selectedVehicleId } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Get product ID from route params
  const productId = router.getParams()?.id as string;

  const loadProduct = async () => {
    if (!productId) {
      setError(t('product.notFound'));
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api<Product>(`/products/${productId}`);
      setProduct(res);
    } catch (err: any) {
      setError(err?.message || t('product.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const priceKurus = product?.priceKurus ?? Math.round(Number(product?.price || 0) * 100);
  const listPriceKurus = product?.listPrice ? Math.round(Number(product.listPrice) * 100) : null;
  const hasDiscount = listPriceKurus && listPriceKurus > priceKurus;
  const discountPct = hasDiscount ? Math.round(((listPriceKurus! - priceKurus) / listPriceKuris!) * 100) : 0;

  const handleAddToCart = (cart: any) => {
    // Cart updated callback
    console.log('Cart updated:', cart);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="cube-outline" size={48} color="#E10600" />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>{t('product.notFound')}</Text>
          <Text style={styles.errorDesc}>{error || t('product.loadError')}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageGallery}>
          {product.images.length > 0 ? (
            <Image
              source={{ uri: product.images[selectedImageIndex] }}
              style={styles.mainImage}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.mainImage, styles.placeholderImage]}>
              <Ionicons name="image-outline" size={64} color="#334155" />
            </View>
          )}

          {product.images.length > 1 && (
            <View style={styles.thumbnails}>
              {product.images.map((img, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.thumbnail,
                    idx === selectedImageIndex && styles.thumbnailActive,
                  ]}
                  onPress={() => setSelectedImageIndex(idx)}
                >
                  <Image source={{ uri: img }} style={styles.thumbnailImage} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Badges */}
          <View style={styles.badgeContainer}>
            {hasDiscount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>-%{discountPct}</Text>
              </View>
            )}
            {isOutOfStock && (
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockBadgeText}>{t('product.outOfStock')}</Text>
              </View>
            )}
            {isLowStock && (
              <View style={styles.lowStockBadge}>
                <Text style={styles.lowStockBadgeText}>{t('product.lowStock')}</Text>
              </View>
            )}
            {product.isUniversal && (
              <View style={styles.universalBadge}>
                <Ionicons name="globe-outline" size={12} color="#fff" />
                <Text style={styles.universalBadgeText}>{t('product.universal')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.infoSection}>
          {/* Brand & Category */}
          <View style={styles.metaRow}>
            {product.category && (
              <TouchableOpacity style={styles.categoryChip} onPress={() => router.push(`/category/${product.category!.slug}`)}>
                <Text style={styles.categoryChipText}>{product.category.name}</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.brandText}>{product.brand}</Text>
            <Text style={styles.skuText}>{t('product.sku')}: {product.sellerCode}</Text>
          </View>

          <Text style={styles.title}>{product.title}</Text>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatKurus(priceKurus)}</Text>
            {hasDiscount && (
              <View style={styles.priceOldContainer}>
                <Text style={styles.priceOld}>{formatKurus(listPriceKurus!)}</Text>
                <View style={styles.discountPill}>
                  <Text style={styles.discountPillText}>-%{discountPct}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Stock Status */}
          <View style={styles.stockRow}>
            {isOutOfStock ? (
              <View style={styles.stockOut}>
                <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                <Text style={styles.stockOutText}>{t('product.outOfStock')}</Text>
              </View>
            ) : isLowStock ? (
              <View style={styles.stockLow}>
                <Ionicons name="alert-circle-outline" size={16} color="#f59e0b" />
                <Text style={styles.stockLowText}>{t('product.onlyLeft').replace('{{count}}', product.stock.toString())}</Text>
              </View>
            ) : (
              <View style={styles.stockOk}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#22c55e" />
                <Text style={styles.stockOkText}>{t('product.inStock')}</Text>
              </View>
            )}
          </View>

          {/* Vehicle Selector */}
          {!product.isUniversal && product.fitmentVehicleIds && product.fitmentVehicleIds.length > 0 && (
            <TouchableOpacity style={styles.vehicleSelectorButton} onPress={() => setShowVehicleSelector(true)}>
              <View style={styles.vehicleSelectorIcon}>
                <Ionicons name="car-outline" size={20} color="#E10600" />
              </View>
              <View style={styles.vehicleSelectorInfo}>
                <Text style={styles.vehicleSelectorLabel}>{t('product.vehicleCompatibility')}</Text>
                <Text style={styles.vehicleSelectorValue}>
                  {selectedVehicleId ? t('product.vehicleSelected') : t('product.selectVehicle')}
                </Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color="#64748b" />
            </TouchableOpacity>
          )}

          {/* Add to Cart / Wishlist */}
          <View style={styles.actionsRow}>
            <AddToCartButton
              productId={product.id}
              productTitle={product.title}
              stock={product.stock}
              maxPerOrder={product.maxPerOrder}
              variants={product.variants}
              selectedVehicleId={selectedVehicleId}
              onCartUpdated={handleAddToCart}
              style={styles.addToCartWrapper}
            />
            <TouchableOpacity style={styles.wishlistButton}>
              <Ionicons name="heart-outline" size={24} color="#E10600" />
            </TouchableOpacity>
          </View>

          {/* Description */}
          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('product.description')}</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          )}

          {/* Attributes */}
          {product.attributes && product.attributes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('product.specifications')}</Text>
              <View style={styles.attributesList}>
                {product.attributes.map((attr, idx) => (
                  <View key={idx} style={styles.attributeRow}>
                    <Text style={styles.attributeKey}>{attr.key}</Text>
                    <Text style={styles.attributeValue}>{attr.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Vehicle Selector Modal */}
      <VehicleSelector
        visible={showVehicleSelector}
        onClose={() => setShowVehicleSelector(false)}
        onSelect={(vehicleId) => {
          // Vehicle selection is handled via context in auth store
          setShowVehicleSelector(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  errorDesc: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  backButton: { marginTop: 16, backgroundColor: '#E10600', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  backButtonText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  scrollContent: { paddingBottom: 24 },
  imageGallery: { backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155' },
  mainImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.8, backgroundColor: '#0f172a' },
  placeholderImage: { justifyContent: 'center', alignItems: 'center' },
  thumbnails: { flexDirection: 'row', padding: 12, gap: 8 },
  thumbnail: { width: 70, height: 70, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  thumbnailActive: { borderColor: '#E10600' },
  thumbnailImage: { width: '100%', height: '100%' },
  badgeContainer: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  discountBadge: { backgroundColor: '#ef4444', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  discountBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  outOfStockBadge: { backgroundColor: '#7f1d1d', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  outOfStockBadgeText: { fontSize: 11, fontWeight: '700', color: '#fca5a5' },
  lowStockBadge: { backgroundColor: '#78350f', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  lowStockBadgeText: { fontSize: 11, fontWeight: '700', color: '#fde68a' },
  universalBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1e3a5f', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  universalBadgeText: { fontSize: 11, fontWeight: '700', color: '#60a5fa' },
  infoSection: { padding: 16, gap: 16 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { backgroundColor: '#1e293b', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#334155' },
  categoryChipText: { fontSize: 11, fontWeight: '700', color: '#E10600', textTransform: 'uppercase' },
  brandText: { fontSize: 13, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  skuText: { fontSize: 12, color: '#64748b' },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', lineHeight: 28, letterSpacing: -0.3 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' },
  price: { fontSize: 28, fontWeight: '800', color: '#fff' },
  priceOldContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceOld: { fontSize: 18, fontWeight: '500', color: '#64748b', textDecorationLine: 'line-through' },
  discountPill: { backgroundColor: '#ef4444', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  discountPillText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stockOut: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7f1d1d', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  stockOutText: { fontSize: 13, fontWeight: '700', color: '#fca5a5' },
  stockLow: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#78350f', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  stockLowText: { fontSize: 13, fontWeight: '700', color: '#fde68a' },
  stockOk: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#052e16', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  stockOkText: { fontSize: 13, fontWeight: '700', color: '#22c55e' },
  vehicleSelectorButton: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1e293b', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#334155' },
  vehicleSelectorIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#7f1d1d', justifyContent: 'center', alignItems: 'center' },
  vehicleSelectorInfo: { flex: 1, gap: 2 },
  vehicleSelectorLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  vehicleSelectorValue: { fontSize: 14, fontWeight: '600', color: '#fff' },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  addToCartWrapper: { flex: 1 },
  wishlistButton: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  section: { borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 12 },
  descriptionText: { fontSize: 14, color: '#e2e8f0', lineHeight: 22 },
  attributesList: { gap: 8 },
  attributeRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  attributeKey: { flex: 1, fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  attributeValue: { flex: 1, fontSize: 13, fontWeight: '500', color: '#fff', textAlign: 'right' },
});