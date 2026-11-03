'use client';

import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { api } from '../lib/api';
import { cartApi, CartDto, formatKurus } from '../lib/cart-api';
import { useAuth } from '../stores/auth';

interface Address {
  id: string;
  title: string;
  fullName: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string;
  addressLine: string;
  postalCode: string;
  isDefault: boolean;
}

interface OrderCreatePayload {
  addressId: string;
  couponCode?: string;
  notes?: string;
  paymentMethod: 'CREDIT_CARD' | 'BANK_TRANSFER' | 'CASH_ON_DELIVERY';
}

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const { user, accessToken } = useAuth();
  const [cart, setCart] = useState<CartDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'BANK_TRANSFER' | 'CASH_ON_DELIVERY'>('CREDIT_CARD');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cartData, addressesData] = await Promise.all([
        cartApi.getCart(),
        api<Address[]>('/users/me/addresses'),
      ]);
      setCart(cartData);
      setAddresses(addressesData);
      const defaultAddr = addressesData.find(a => a.isDefault);
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      else if (addressesData.length > 0) setSelectedAddressId(addressesData[0].id);
    } catch (err: any) {
      setError(err?.message || t('checkout.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setError(t('checkout.selectAddress'));
      return;
    }
    if (!cart || cart.items.length === 0) {
      setError(t('checkout.emptyCart'));
      return;
    }
    if (cart.items.some(item => item.unavailable)) {
      setError(t('checkout.hasUnavailable'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: OrderCreatePayload = {
        addressId: selectedAddressId,
        paymentMethod,
        notes: notes.trim() || undefined,
      };

      const res = await api<{ orderId: string; orderNumber: string }>('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Clear cart after successful order
      await cartApi.clearCart();

      router.replace(`/orders/${res.orderId}?success=true`);
    } catch (err: any) {
      setError(err?.message || t('checkout.orderFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="card-outline" size={48} color="#E10600" />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !cart) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>{t('checkout.error')}</Text>
          <Text style={styles.errorDesc}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#334155" />
          <Text style={styles.emptyTitle}>{t('checkout.emptyCart')}</Text>
          <Text style={styles.emptyDesc}>{t('checkout.emptyDesc')}</Text>
          <TouchableOpacity style={styles.shopButton} onPress={() => router.push('/')}>
            <Text style={styles.shopButtonText}>{t('checkout.continueShopping')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const paymentMethods = [
    { id: 'CREDIT_CARD', icon: 'card-outline', label: t('checkout.payment.creditCard'), desc: t('checkout.payment.creditCardDesc') },
    { id: 'BANK_TRANSFER', icon: 'logo-bitcoin', label: t('checkout.payment.bankTransfer'), desc: t('checkout.payment.bankTransferDesc') },
    { id: 'CASH_ON_DELIVERY', icon: 'cash-outline', label: t('checkout.payment.cashOnDelivery'), desc: t('checkout.payment.cashOnDeliveryDesc') },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back-outline" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('checkout.title')}</Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color="#fca5a5" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Shipping Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('checkout.shippingAddress')}</Text>
            <TouchableOpacity style={styles.addAddressButton} onPress={() => router.push('/addresses/add')}>
              <Ionicons name="add-outline" size={18} color="#E10600" />
              <Text style={styles.addAddressText}>{t('checkout.addNewAddress')}</Text>
            </TouchableOpacity>
          </View>

          {addresses.length === 0 ? (
            <View style={styles.noAddress}>
              <Ionicons name="location-outline" size={48} color="#64748b" />
              <Text style={styles.noAddressTitle}>{t('checkout.noAddress')}</Text>
              <Text style={styles.noAddressDesc}>{t('checkout.noAddressDesc')}</Text>
              <TouchableOpacity style={styles.addAddressPrimary} onPress={() => router.push('/addresses/add')}>
                <Text style={styles.addAddressPrimaryText}>{t('checkout.addAddress')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.addressList}>
              {addresses.map(addr => (
                <TouchableOpacity
                  key={addr.id}
                  style={[
                    styles.addressCard,
                    selectedAddressId === addr.id && styles.addressCardSelected,
                  ]}
                  onPress={() => setSelectedAddressId(addr.id)}
                >
                  <View style={styles.addressCardMain}>
                    <View style={styles.addressInfo}>
                      <View style={styles.addressHeader}>
                        <Text style={styles.addressTitle}>{addr.title}</Text>
                        {addr.isDefault && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>{t('checkout.default')}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.addressName}>{addr.fullName}</Text>
                      <Text style={styles.addressLine}>{addr.addressLine}</Text>
                      <Text style={styles.addressLine}>
                        {addr.neighborhood}, {addr.district}, {addr.city} {addr.postalCode}
                      </Text>
                      <Text style={styles.addressPhone}>{addr.phone}</Text>
                    </View>
                    <View style={styles.addressRadio}>
                      <View style={[
                        styles.radioOuter,
                        selectedAddressId === addr.id && styles.radioOuterSelected,
                      ]}>
                        {selectedAddressId === addr.id && (
                          <View style={styles.radioInner} />
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('checkout.paymentMethod')}</Text>
          <View style={styles.paymentList}>
            {paymentMethods.map(method => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentCard,
                  paymentMethod === method.id && styles.paymentCardSelected,
                ]}
                onPress={() => setPaymentMethod(method.id as any)}
              >
                <View style={styles.paymentIcon}>
                  <Ionicons name={method.icon} size={24} color={paymentMethod === method.id ? '#fff' : '#E10600'} />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={[
                    styles.paymentLabel,
                    paymentMethod === method.id && styles.paymentLabelSelected,
                  ]}>
                    {method.label}
                  </Text>
                  <Text style={[
                    styles.paymentDesc,
                    paymentMethod === method.id && styles.paymentDescSelected,
                  ]}>
                    {method.desc}
                  </Text>
                </View>
                <View style={[
                  styles.paymentRadio,
                  paymentMethod === method.id && styles.paymentRadioSelected,
                ]}>
                  {paymentMethod === method.id && (
                    <View style={styles.paymentRadioInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Order Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('checkout.notes')}</Text>
          <TextInput
            style={styles.notesInput}
            placeholder={t('checkout.notesPlaceholder')}
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('checkout.orderSummary')}</Text>

          <View style={styles.summaryItems}>
            {cart.items.map(item => (
              <View key={item.id} style={styles.summaryItem}>
                <View style={styles.summaryItemLeft}>
                  {item.image && (
                    <Image source={{ uri: item.image }} style={styles.summaryItemImage} resizeMode="cover" />
                  )}
                  <View style={styles.summaryItemInfo}>
                    <Text style={styles.summaryItemTitle}>{item.title}</Text>
                    <Text style={styles.summaryItemQty}>x{item.quantity}</Text>
                  </View>
                </View>
                <Text style={styles.summaryItemPrice}>{formatKurus(item.lineTotal)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.summaryDivider} />

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

        {/* Place Order Button */}
        <TouchableOpacity
          style={[
            styles.placeOrderButton,
            submitting && styles.placeOrderButtonDisabled,
          ]}
          onPress={handlePlaceOrder}
          disabled={submitting || !selectedAddressId}
        >
          {submitting ? (
            <Ionicons name="spinner" size={24} color="#fff" style={styles.spinner} />
          ) : (
            <>
              <Ionicons name="checkmark-outline" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.placeOrderText}>{t('checkout.placeOrder')}</Text>
              <Text style={styles.placeOrderPrice}>{formatKurus(cart.total)}</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.secureText}>
          <Ionicons name="lock-closed-outline" size={12} color="#64748b" />
          {' '}{t('checkout.secureCheckout')}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  errorDesc: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  retryButton: { marginTop: 16, backgroundColor: '#E10600', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  retryButtonText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  emptyDesc: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  shopButton: { backgroundColor: '#E10600', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  shopButtonText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  scrollContent: { paddingBottom: 100, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, paddingTop: 8 },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7f1d1d', borderWidth: 1, borderColor: '#E10600', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { flex: 1, fontSize: 13, color: '#fca5a5' },
  section: { marginBottom: 20, backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  addAddressButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#7f1d1d', borderRadius: 8 },
  addAddressText: { fontSize: 12, fontWeight: '700', color: '#E10600' },
  noAddress: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  noAddressTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  noAddressDesc: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  addAddressPrimary: { backgroundColor: '#E10600', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  addAddressPrimaryText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  addressList: { gap: 10 },
  addressCard: { flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#334155' },
  addressCardSelected: { borderColor: '#E10600', backgroundColor: '#7f1d1d' },
  addressCardMain: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  addressInfo: { gap: 4 },
  addressHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addressTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  defaultBadge: { backgroundColor: '#E10600', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  defaultBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },
  addressName: { fontSize: 13, fontWeight: '600', color: '#e2e8f0' },
  addressLine: { fontSize: 12, color: '#94a3b8' },
  addressPhone: { fontSize: 12, color: '#E10600', fontWeight: '600' },
  addressRadio: { paddingTop: 2 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#64748b', justifyContent: 'center', alignItems: 'center' },
  radioOuterSelected: { borderColor: '#E10600' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E10600' },
  paymentList: { gap: 10 },
  paymentCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0f172a', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#334155' },
  paymentCardSelected: { borderColor: '#E10600', backgroundColor: '#7f1d1d' },
  paymentIcon: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  paymentInfo: { flex: 1, gap: 2 },
  paymentLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },
  paymentLabelSelected: { color: '#fff' },
  paymentDesc: { fontSize: 12, color: '#64748b' },
  paymentDescSelected: { color: '#94a3b8' },
  paymentRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#64748b', justifyContent: 'center', alignItems: 'center' },
  paymentRadioSelected: { borderColor: '#E10600' },
  paymentRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E10600' },
  notesInput: { backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', padding: 12, fontSize: 14, color: '#fff', minHeight: 80, textAlignVertical: 'top' },
  summaryItems: { gap: 10, marginBottom: 12 },
  summaryItem: { flexDirection: 'row', gap: 10 },
  summaryItemLeft: { flexDirection: 'row', gap: 10, flex: 1 },
  summaryItemImage: { width: 50, height: 50, borderRadius: 8 },
  summaryItemInfo: { justifyContent: 'center', gap: 2 },
  summaryItemTitle: { fontSize: 13, fontWeight: '600', color: '#fff' },
  summaryItemQty: { fontSize: 11, color: '#64748b' },
  summaryItemPrice: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 'auto' },
  summaryDivider: { height: 1, backgroundColor: '#334155', marginVertical: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 13, color: '#94a3b8' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: '#fff' },
  discountLabel: { color: '#22c55e' },
  discountValue: { color: '#22c55e' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 12, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#fff' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#E10600' },
  placeOrderButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16, backgroundColor: '#E10600', borderRadius: 14, paddingVertical: 18, borderWidth: 1, borderColor: '#E10600' },
  placeOrderButtonDisabled: { backgroundColor: '#334155', borderColor: '#334155' },
  spinner: { marginRight: 4 },
  buttonIcon: { marginRight: 4 },
  placeOrderText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  placeOrderPrice: { fontSize: 16, fontWeight: '800', color: '#fff' },
  secureText: { textAlign: 'center', fontSize: 12, color: '#64748b', marginTop: 16, marginBottom: 24 },
});