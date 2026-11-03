'use client';

import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { cartApi, CartDto, formatKurus } from '../../lib/cart-api';
import { CartDrawer } from '../../components/CartDrawer';
import { AddToCartButton } from '../../components/AddToCartButton';

export default function CartScreen() {
  const { t } = useTranslation();
  const [cart, setCart] = useState<CartDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [couponInput, setCouponInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const loadCart = async () => {
    setLoading(true);
    try {
      const data = await cartApi.getCart();
      setCart(data);
    } catch (err: any) {
      setErrorMsg(err?.message || t('cart.emptyDesc'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const handleQuantity = async (itemId: string, nextQty: number) => {
    setErrorMsg(null);
    try {
      const updated = nextQty <= 0 ? await cartApi.removeItem(itemId) : await cartApi.updateQuantity(itemId, nextQty);
      setCart(updated);
    } catch (err: any) {
      setErrorMsg(err?.message || t('cart.emptyDesc'));
    }
  };

  const handleRemove = async (itemId: string) => {
    setErrorMsg(null);
    try {
      const updated = await cartApi.removeItem(itemId);
      setCart(updated);
    } catch (err: any) {
      setErrorMsg(err?.message || t('cart.emptyDesc'));
    }
  };

  const handleClear = async () => {
    setErrorMsg(null);
    try {
      const updated = await cartApi.clearCart();
      setCart(updated);
    } catch (err: any) {
      setErrorMsg(err?.message || t('cart.emptyDesc'));
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setErrorMsg(null);
    try {
      const updated = await cartApi.applyCoupon(couponInput.trim());
      setCart(updated);
      setCouponInput('');
    } catch (err: any) {
      setErrorMsg(err?.message || t('cart.emptyDesc'));
    }
  };

  const handleRemoveCoupon = async () => {
    setErrorMsg(null);
    try {
      const updated = await cartApi.removeCoupon();
      setCart(updated);
    } catch (err: any) {
      setErrorMsg(err?.message || t('cart.emptyDesc'));
    }
  };

  const progressPct = cart
    ? Math.min(100, Math.round(((cart.freeShippingThreshold - cart.freeShippingRemaining) / cart.freeShippingThreshold) * 100))
    : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="cart-outline" size={48} color="#E10600" />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={
        <View style={styles.refreshControl} />
      }>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>{t('cart.title')}</Text>
            <Text style={styles.headerSubtitle}>{cart?.itemCount || 0} {t('cart.items')}</Text>
          </View>
          <TouchableOpacity style={styles.clearButton} onPress={handleClear} disabled={!cart || cart.items.length === 0}>
            <Text style={styles.clearButtonText}>{t('cart.clearCart')}</Text>
          </TouchableOpacity>
        </View>

        {/* Free Shipping Progress */}
        {cart && (
          <View style={styles.progressContainer}>
            <Text style={cart.freeShippingRemaining === 0 ? styles.progressAchieved : styles.progressText}>
              {cart.freeShippingRemaining === 0
                ? t('cart.freeShippingAchieved')
                : t('cart.freeShippingProgress').replace('{{amount}}', formatKurus(cart.freeShippingRemaining))}
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
          </View>
        )}

        {errorMsg && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color="#fca5a5" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Cart Items */}
        {!cart || cart.items.length === 0 ? (
          <View style={styles.emptyCart}>
            <Ionicons name="cart-outline" size={80} color="#334155" />
            <Text style={styles.emptyCartTitle}>{t('cart.empty')}</Text>
            <Text style={styles.emptyCartDesc}>{t('cart.emptyDesc')}</Text>
            <TouchableOpacity style={styles.shopButton} onPress={() => router.push('/')}>
              <Text style={styles.shopButtonText}>{t('cart.startShopping')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {cart.items.map((item) => (
              <View key={item.id} style={[styles.cartItem, item.unavailable && styles.cartItemUnavailable]}>
                <View style={styles.itemLeft}>
                  {item.image && (
                    <View style={styles.itemImageContainer}>
                      <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="cover" />
                    </View>
                  )}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemPrice}>{formatKurus(item.unitPrice)}</Text>
                    <Text style={styles.itemStock}>Stok: {item.stock} adet</Text>
                  </View>
                </View>

                {/* Warnings */}
                <View style={styles.warningsContainer}>
                  {item.unavailable && (
                    <View style={styles.warningBadge}>
                      <Ionicons name="warning-outline" size={12} color="#ef4444" />
                      <Text style={styles.warningText}>{t('cart.unavailable')}</Text>
                    </View>
                  )}
                  {item.priceChanged && (
                    <View style={styles.warningBadge}>
                      <Ionicons name="flash-outline" size={12} color="#f59e0b" />
                      <Text style={styles.warningText}>
                        {t('cart.priceWarning').replace('{{old}}', formatKurus(item.unitPriceSnapshot)).replace('{{new}}', formatKurus(item.unitPrice))}
                      </Text>
                    </View>
                  )}
                  {item.fitmentWarning && (
                    <View style={styles.warningBadge}>
                      <Ionicons name="shield-outline" size={12} color="#f59e0b" />
                      <Text style={styles.warningText}>{t('cart.fitmentWarning')}</Text>
                    </View>
                  )}
                </View>

                {/* Quantity & Line Total */}
                <View style={styles.itemRight}>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={[styles.qtyButton, item.unavailable || item.quantity <= 1 && styles.qtyButtonDisabled]}
                      onPress={() => handleQuantity(item.id, item.quantity - 1)}
                      disabled={item.unavailable || item.quantity <= 1}
                    >
                      <Ionicons name="remove" size={18} color={item.unavailable || item.quantity <= 1 ? '#64748b' : '#fff'} />
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={[styles.qtyButton, item.unavailable || item.quantity >= Math.min(item.stock, item.maxPerOrder) && styles.qtyButtonDisabled]}
                      onPress={() => handleQuantity(item.id, item.quantity + 1)}
                      disabled={item.unavailable || item.quantity >= Math.min(item.stock, item.maxPerOrder)}
                    >
                      <Ionicons name="add" size={18} color={item.unavailable || item.quantity >= Math.min(item.stock, item.maxPerOrder) ? '#64748b' : '#fff'} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.lineTotalContainer}>
                    <TouchableOpacity onPress={() => handleRemove(item.id)} style={styles.removeButton}>
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                    <Text style={styles.lineTotal}>{formatKurus(item.lineTotal)}</Text>
                  </View>
                </View>
              </View>
            ))}

            {/* Coupon Section */}
            <View style={styles.couponSection}>
              {cart.coupon ? (
                <View style={styles.activeCoupon}>
                  <View style={styles.couponInfo}>
                    <View style={styles.couponBadge}>
                      <Ionicons name="ticket-outline" size={16} color="#22c55e" />
                      <Text style={styles.couponCode}>{cart.coupon.code}</Text>
                    </View>
                    <Text style={styles.couponDiscount}>- {formatKurus(cart.discount)}</Text>
                  </View>
                  <TouchableOpacity onPress={handleRemoveCoupon} style={styles.removeCouponButton}>
                    <Text style={styles.removeCouponText}>{t('cart.removeCoupon')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.couponInput}>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="ticket-outline" size={20} color="#64748b" />
                    <TextInput
                      style={styles.couponTextInput}
                      placeholder={t('cart.couponPlaceholder')}
                      placeholderTextColor="#64748b"
                      onChangeText={setCouponInput}
                      value={couponInput}
                      autoCapitalize="characters"
                    />
                  </View>
                  <TouchableOpacity onPress={handleApplyCoupon} style={styles.applyCouponButton} disabled={!couponInput.trim()}>
                    <Text style={styles.applyCouponText}>{t('cart.applyCoupon')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Order Summary */}
            <View style={styles.summarySection}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('cart.subtotal')}</Text>
                <Text style={styles.summaryValue}>{formatKurus(cart.subtotal)}</Text>
              </View>
              {cart.discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, styles.discountLabel]}>{t('cart.discount')} ({cart.coupon?.code})</Text>
                  <Text style={[styles.summaryValue, styles.discountValue]}>- {formatKurus(cart.discount)}</Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('cart.shipping')}</Text>
                <Text style={styles.summaryValue}>{cart.shipping === 0 ? t('cart.freeShipping') : formatKurus(cart.shipping)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('cart.tax')}</Text>
                <Text style={styles.summaryValue}>{formatKurus(cart.tax)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={[styles.summaryLabel, styles.totalLabel]}>{t('cart.total')}</Text>
                <Text style={[styles.summaryValue, styles.totalValue]}>{formatKurus(cart.total)}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                <Text style={styles.clearButtonText}>{t('cart.clearCart')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.checkoutButton} onPress={() => router.push('/checkout')}>
                <Text style={styles.checkoutButtonText}>{t('cart.checkout')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <CartDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </SafeAreaView>
  );
}

// Import TextInput
import { TextInput } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  scrollContent: { paddingBottom: 120, paddingHorizontal: 16 },
  refreshControl: { height: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: { gap: 4 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: '#64748b' },
  clearButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#1e293b', borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  clearButtonText: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  progressContainer: { marginBottom: 16, gap: 8 },
  progressText: { fontSize: 13, fontWeight: '600', color: '#f59e0b' },
  progressAchieved: { fontSize: 13, fontWeight: '700', color: '#22c55e' },
  progressBar: { height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#E10600', borderRadius: 3 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7f1d1d', borderWidth: 1, borderColor: '#E10600', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { flex: 1, fontSize: 13, color: '#fca5a5' },
  emptyCart: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32 },
  emptyCartTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  emptyCartDesc: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  shopButton: { backgroundColor: '#E10600', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  shopButtonText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  itemsList: { gap: 10 },
  cartItem: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 12, padding: 12, gap: 10 },
  cartItemUnavailable: { opacity: 0.6, borderWidth: 1, borderColor: '#7f1d1d' },
  itemLeft: { flexDirection: 'row', gap: 12, flex: 1 },
  itemImageContainer: { width: 70, height: 70, borderRadius: 10, overflow: 'hidden', backgroundColor: '#0f172a' },
  itemImage: { width: '100%', height: '100%' },
  itemInfo: { justifyContent: 'center', gap: 4 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  itemPrice: { fontSize: 13, fontWeight: '600', color: '#E10600' },
  itemStock: { fontSize: 11, color: '#64748b' },
  warningsContainer: { gap: 4, marginTop: 4 },
  warningBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7f1d1d', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  warningText: { fontSize: 10, fontWeight: '600', color: '#fca5a5' },
  itemRight: { flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', minWidth: 100 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  qtyButtonDisabled: { backgroundColor: '#1e293b' },
  qtyValue: { fontSize: 16, fontWeight: '700', color: '#fff', minWidth: 28, textAlign: 'center' },
  lineTotalContainer: { alignItems: 'flex-end', marginTop: 8, gap: 8 },
  removeButton: { padding: 6 },
  lineTotal: { fontSize: 16, fontWeight: '800', color: '#fff' },
  couponSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#334155' },
  activeCoupon: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#052e16', borderWidth: 1, borderColor: '#22c55e', borderRadius: 12, padding: 12 },
  couponInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  couponBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#22c55e', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  couponCode: { fontSize: 12, fontWeight: '800', color: '#fff' },
  couponDiscount: { fontSize: 14, fontWeight: '700', color: '#22c55e' },
  removeCouponButton: { padding: 4 },
  removeCouponText: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
  couponInput: { flexDirection: 'row', gap: 8 },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingHorizontal: 12 },
  couponTextInput: { flex: 1, fontSize: 14, color: '#fff', paddingVertical: 12 },
  applyCouponButton: { backgroundColor: '#E10600', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, justifyContent: 'center' },
  applyCouponText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  summarySection: { marginTop: 16, padding: 16, backgroundColor: '#1e293b', borderRadius: 16, borderWidth: 1, borderColor: '#334155', gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, color: '#94a3b8' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: '#fff' },
  discountLabel: { color: '#22c55e' },
  discountValue: { color: '#22c55e' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 12, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#fff' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#E10600' },
  actions: { marginTop: 16, gap: 10 },
  checkoutButton: { backgroundColor: '#E10600', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  checkoutButtonText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});