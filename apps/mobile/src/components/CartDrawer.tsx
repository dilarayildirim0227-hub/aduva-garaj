'use client';

import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { cartApi, CartDto, formatKurus } from '../lib/cart-api';

interface CartDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export function CartDrawer({ visible, onClose }: CartDrawerProps) {
  const { t } = useTranslation();
  const [cart, setCart] = useState<CartDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadCart();
    }
  }, [visible]);

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

  const handleQuantity = async (itemId: string, nextQty: number) => {
    setErrorMsg(null);
    try {
      const updated = nextQty <= 0
        ? await cartApi.removeItem(itemId)
        : await cartApi.updateQuantity(itemId, nextQty);
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

  const handleApplyCoupon = async (code: string) => {
    setErrorMsg(null);
    try {
      const updated = await cartApi.applyCoupon(code);
      setCart(updated);
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

  if (!visible) return null;

  const progressPct = cart
    ? Math.min(100, Math.round(((cart.freeShippingThreshold - cart.freeShippingRemaining) / cart.freeShippingThreshold) * 100))
    : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} />
      <View style={styles.drawerContainer}>
        <View style={styles.drawerHeader}>
          <View style={styles.headerLeft}>
            <Ionicons name="cart-outline" size={24} color="#E10600" />
            <Text style={styles.drawerTitle}>{t('cart.title')} ({cart?.itemCount || 0})</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close-outline" size={28} color="#fff" />
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
        <ScrollView style={styles.itemsContainer} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingItems}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles.skeletonItem}>
                  <View style={styles.skeletonLine} />
                  <View style={styles.skeletonLineShort} />
                </View>
              ))}
            </View>
          ) : !cart || cart.items.length === 0 ? (
            <View style={styles.emptyCart}>
              <Ionicons name="cart-outline" size={64} color="#64748b" />
              <Text style={styles.emptyCartTitle}>{t('cart.empty')}</Text>
              <Text style={styles.emptyCartDesc}>{t('cart.emptyDesc')}</Text>
              <TouchableOpacity style={styles.shopButton} onPress={() => { onClose(); router.push('/'); }}>
                <Text style={styles.shopButtonText}>{t('cart.startShopping')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {cart.items.map((item) => (
                <View key={item.id} style={[styles.cartItem, item.unavailable && styles.cartItemUnavailable]}>
                  <View style={styles.itemLeft}>
                    {item.image && (
                      <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="cover" />
                    )}
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.itemPrice}>{formatKurus(item.unitPrice)}</Text>
                      <Text style={styles.itemStock}>{t('cart.inStock').replace('{{stock}}', item.stock.toString())}</Text>
                    </View>
                  </View>

                  {/* Warnings */}
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

                  {/* Quantity Controls */}
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={[styles.qtyButton, item.unavailable && styles.qtyButtonDisabled]}
                      onPress={() => handleQuantity(item.id, item.quantity - 1)}
                      disabled={item.unavailable || item.quantity <= 1}
                    >
                      <Ionicons name="remove" size={20} color={item.unavailable || item.quantity <= 1 ? '#64748b' : '#fff'} />
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={[styles.qtyButton, item.unavailable || item.quantity >= Math.min(item.stock, item.maxPerOrder) && styles.qtyButtonDisabled]}
                      onPress={() => handleQuantity(item.id, item.quantity + 1)}
                      disabled={item.unavailable || item.quantity >= Math.min(item.stock, item.maxPerOrder)}
                    >
                      <Ionicons name="add" size={20} color={item.unavailable || item.quantity >= Math.min(item.stock, item.maxPerOrder) ? '#64748b' : '#fff'} />
                    </TouchableOpacity>
                  </View>

                  {/* Remove & Line Total */}
                  <View style={styles.itemRight}>
                    <TouchableOpacity onPress={() => handleRemove(item.id)} style={styles.removeButton}>
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                    <Text style={styles.lineTotal}>{formatKurus(item.lineTotal)}</Text>
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
                    <TouchableOpacity onPress={() => handleApplyCoupon(couponInput)} style={styles.applyCouponButton} disabled={!couponInput.trim()}>
                      <Text style={styles.applyCouponText}>{t('cart.applyCoupon')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Order Summary */}
          {cart && cart.items.length > 0 && (
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
          )}
        </ScrollView>

        {/* Actions */}
        {cart && cart.items.length > 0 && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Text style={styles.clearButtonText}>{t('cart.clearCart')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.checkoutButton} onPress={() => { onClose(); router.push('/checkout'); }}>
              <Text style={styles.checkoutButtonText}>{t('cart.checkout')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

// Need to import TextInput
import { TextInput } from 'react-native';

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  drawerContainer: { flex: 1, backgroundColor: '#0f172a', width: '100%' },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#334155' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  drawerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  closeButton: { padding: 4 },
  progressContainer: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155' },
  progressText: { fontSize: 13, fontWeight: '600', color: '#f59e0b' },
  progressAchieved: { fontSize: 13, fontWeight: '700', color: '#22c55e' },
  progressBar: { height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#E10600', borderRadius: 3 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7f1d1d', borderWidth: 1, borderColor: '#E10600', borderRadius: 8, padding: 12, marginHorizontal: 16, marginTop: 8 },
  errorText: { flex: 1, fontSize: 13, color: '#fca5a5' },
  itemsContainer: { flex: 1 },
  loadingItems: { paddingHorizontal: 16, gap: 12 },
  skeletonItem: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
  skeletonLine: { height: 16, backgroundColor: '#334155', borderRadius: 4, flex: 1, width: '60%' },
  skeletonLineShort: { height: 12, backgroundColor: '#334155', borderRadius: 4, width: '40%' },
  emptyCart: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 12 },
  emptyCartTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emptyCartDesc: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  shopButton: { backgroundColor: '#E10600', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  shopButtonText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  itemsList: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  cartItem: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 12, padding: 12, gap: 10 },
  cartItemUnavailable: { opacity: 0.6, borderWidth: 1, borderColor: '#7f1d1d' },
  itemLeft: { flexDirection: 'row', gap: 12, flex: 1 },
  itemImage: { width: 60, height: 60, borderRadius: 8 },
  itemInfo: { justifyContent: 'center', gap: 4 },
  itemTitle: { fontSize: 13, fontWeight: '700', color: '#fff' },
  itemPrice: { fontSize: 13, fontWeight: '600', color: '#E10600' },
  itemStock: { fontSize: 11, color: '#64748b' },
  warningBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7f1d1d', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginTop: 4, alignSelf: 'flex-start' },
  warningText: { fontSize: 10, fontWeight: '600', color: '#fca5a5' },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  qtyButton: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  qtyButtonDisabled: { backgroundColor: '#1e293b' },
  qtyValue: { fontSize: 16, fontWeight: '700', color: '#fff', minWidth: 24, textAlign: 'center' },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'flex-end' },
  removeButton: { padding: 4 },
  lineTotal: { fontSize: 14, fontWeight: '800', color: '#fff' },
  couponSection: { paddingHorizontal: 16, paddingTop: 8 },
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
  applyCouponButton: { backgroundColor: '#E10600', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center' },
  applyCouponText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  summarySection: { paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#1e293b', borderTopWidth: 1, borderTopColor: '#334155', gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, color: '#94a3b8' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: '#fff' },
  discountLabel: { color: '#22c55e' },
  discountValue: { color: '#22c55e' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 12, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#fff' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#E10600' },
  actions: { paddingHorizontal: 16, paddingVertical: 16, gap: 10, borderTopWidth: 1, borderTopColor: '#334155' },
  clearButton: { borderWidth: 1, borderColor: '#334155', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  clearButtonText: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
  checkoutButton: { backgroundColor: '#E10600', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  checkoutButtonText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});