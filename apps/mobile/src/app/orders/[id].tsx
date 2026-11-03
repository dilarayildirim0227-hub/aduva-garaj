'use client';

import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { api } from '../../../lib/api';
import { formatKurus } from '../../../lib/cart-api';

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product: {
    id: string;
    slug: string;
    title: string;
    brand: string;
    image: string | null;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  currency: 'TRY';
  notes: string | null;
  createdAt: string;
  items: OrderItem[];
  address: {
    fullName: string;
    phone: string;
    addressLine: string;
    city: string;
    district: string;
    neighborhood: string;
    postalCode: string;
  };
  paymentMethod: string;
}

const STATUS_CONFIG: Record<Order['status'], { label: string; color: string; icon: string; progress: number }> = {
  PENDING: { label: 'orders.status.pending', color: '#f59e0b', icon: 'time-outline', progress: 10 },
  CONFIRMED: { label: 'orders.status.confirmed', color: '#3b82f6', icon: 'checkmark-circle-outline', progress: 25 },
  PROCESSING: { label: 'orders.status.processing', color: '#8b5cf6', icon: 'cog-outline', progress: 40 },
  SHIPPED: { label: 'orders.status.shipped', color: '#06b6d4', icon: 'cube-outline', progress: 65 },
  DELIVERED: { label: 'orders.status.delivered', color: '#22c55e', icon: 'checkmark-done-outline', progress: 100 },
  CANCELLED: { label: 'orders.status.cancelled', color: '#ef4444', icon: 'close-circle-outline', progress: 0 },
  RETURNED: { label: 'orders.status.returned', color: '#64748b', icon: 'refresh-outline', progress: 0 },
};

export default function OrderDetailScreen() {
  const { t } = useTranslation();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderId = router.getParams()?.id as string;

  const loadOrder = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await api<Order>(`/orders/${orderId}`);
      setOrder(res);
    } catch (err: any) {
      setError(err?.message || t('orders.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusConfig = (status: Order['status']) => {
    const config = STATUS_CONFIG[status];
    return {
      ...config,
      label: t(config.label),
    };
  };

  const statusSteps = [
    { key: 'CONFIRMED' as Order['status'], label: t('orders.timeline.confirmed') },
    { key: 'PROCESSING' as Order['status'], label: t('orders.timeline.processing') },
    { key: 'SHIPPED' as Order['status'], label: t('orders.timeline.shipped') },
    { key: 'DELIVERED' as Order['status'], label: t('orders.timeline.delivered') },
  ];

  const currentStatusIndex = statusSteps.findIndex(s => s.key === order?.status);
  const isDeliveredOrCancelled = ['DELIVERED', 'CANCELLED', 'RETURNED'].includes(order?.status || '');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="bag-handle-outline" size={48} color="#E10600" />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>{t('orders.notFound')}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const config = getStatusConfig(order.status);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back-outline" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter} />
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.orderNumber}>{t('orders.orderNumber').replace('{{number}}', order.orderNumber)}</Text>
            <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          </View>

          <View style={styles.statusMain}>
            <View style={[styles.statusCircle, { backgroundColor: config.color }]}>
              <Ionicons name={config.icon} size={28} color="#fff" />
            </View>
            <View style={styles.statusInfo}>
              <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
              <Text style={styles.statusProgress}>{t('orders.statusProgress').replace('{{progress}}', STATUS_CONFIG[order.status].progress.toString())}</Text>
            </View>
          </View>

          {/* Timeline */}
          <View style={styles.timeline}>
            {statusSteps.map((step, idx) => {
              const isCompleted = idx <= currentStatusIndex;
              const isCurrent = idx === currentStatusIndex && !isDeliveredOrCancelled;
              const isFuture = idx > currentStatusIndex;

              return (
                <View key={step.key} style={styles.timelineItem}>
                  <View style={styles.timelineConnector}>
                    <View style={[
                      styles.timelineDot,
                      isCompleted && styles.timelineDotCompleted,
                      isCurrent && styles.timelineDotCurrent,
                      isFuture && styles.timelineDotFuture,
                    ]} />
                    {idx < statusSteps.length - 1 && (
                      <View style={[
                        styles.timelineLine,
                        isCompleted && styles.timelineLineCompleted,
                      ]} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[
                      styles.timelineLabel,
                      isCompleted && styles.timelineLabelCompleted,
                      isCurrent && styles.timelineLabelCurrent,
                      isFuture && styles.timelineLabelFuture,
                    ]}>
                      {step.label}
                    </Text>
                    {isCurrent && <Text style={styles.timelineCurrentIndicator}>{t('orders.currentStep')}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('orders.items')}</Text>
          <View style={styles.itemsList}>
            {order.items.map((item, idx) => (
              <View key={idx} style={styles.orderItem}>
                <View style={styles.itemLeft}>
                  {item.product.image && (
                    <Image source={{ uri: item.product.image }} style={styles.itemImage} resizeMode="cover" />
                  )}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>{item.product.title}</Text>
                    <Text style={styles.itemBrand}>{item.product.brand}</Text>
                    <Text style={styles.itemQty}>x{item.quantity}</Text>
                  </View>
                </View>
                <Text style={styles.itemTotal}>{formatKurus(item.lineTotal)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Shipping Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('orders.shippingAddress')}</Text>
          <View style={styles.addressCard}>
            <Text style={styles.addressName}>{order.address.fullName}</Text>
            <Text style={styles.addressPhone}>{order.address.phone}</Text>
            <Text style={styles.addressLine}>{order.address.addressLine}</Text>
            <Text style={styles.addressLine}>
              {order.address.neighborhood}, {order.address.district}, {order.address.city} {order.address.postalCode}
            </Text>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('orders.paymentMethod')}</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentIcon}>
              <Ionicons name={order.paymentMethod === 'CREDIT_CARD' ? 'card-outline' : order.paymentMethod === 'BANK_TRANSFER' ? 'logo-bitcoin' : 'cash-outline'} size={24} color="#E10600" />
            </View>
            <Text style={styles.paymentLabel}>
              {t(`orders.payment.${order.paymentMethod.toLowerCase()}`)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {order.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('orders.notes')}</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{order.notes}</Text>
            </View>
          </View>
        )}

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('orders.summary')}</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('cart.subtotal')}</Text>
              <Text style={styles.summaryValue}>{formatKurus(order.subtotal)}</Text>
            </View>
            {order.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.discountLabel]}>{t('cart.discount')}</Text>
                <Text style={[styles.summaryValue, styles.discountValue]}>- {formatKurus(order.discount)}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('cart.shipping')}</Text>
              <Text style={styles.summaryValue}>{order.shipping === 0 ? t('cart.freeShipping') : formatKurus(order.shipping)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('cart.tax')}</Text>
              <Text style={styles.summaryValue}>{formatKurus(order.tax)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={[styles.summaryLabel, styles.totalLabel]}>{t('cart.total')}</Text>
              <Text style={[styles.summaryValue, styles.totalValue]}>{formatKurus(order.total)}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        {['PENDING', 'CONFIRMED'].includes(order.status) && (
          <TouchableOpacity style={styles.cancelButton} onPress={() => { /* Cancel order */ }}>
            <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
            <Text style={styles.cancelButtonText}>{t('orders.cancelOrder')}</Text>
          </TouchableOpacity>
        )}
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
  scrollContent: { paddingBottom: 24, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingTop: 8 },
  headerCenter: { flex: 1 },
  statusCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 16 },
  statusHeader: { gap: 4, marginBottom: 16 },
  orderNumber: { fontSize: 15, fontWeight: '800', color: '#fff' },
  orderDate: { fontSize: 12, color: '#64748b' },
  statusMain: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  statusCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  statusInfo: { gap: 4 },
  statusLabel: { fontSize: 18, fontWeight: '800' },
  statusProgress: { fontSize: 12, color: '#64748b' },
  timeline: { marginTop: 8 },
  timelineItem: { flexDirection: 'row', paddingVertical: 12 },
  timelineConnector: { width: 24, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#334155', borderWidth: 2, borderColor: '#1e293b' },
  timelineDotCompleted: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  timelineDotCurrent: { backgroundColor: '#E10600', borderColor: '#E10600', width: 16, height: 16, borderRadius: 8 },
  timelineDotFuture: { backgroundColor: '#334155' },
  timelineLine: { position: 'absolute', top: 24, bottom: -12, left: 5, width: 2, backgroundColor: '#334155' },
  timelineLineCompleted: { backgroundColor: '#22c55e' },
  timelineContent: { flex: 1, paddingLeft: 8 },
  timelineLabel: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  timelineLabelCompleted: { color: '#22c55e', fontWeight: '700' },
  timelineLabelCurrent: { color: '#E10600', fontWeight: '700' },
  timelineLabelFuture: { color: '#64748b' },
  timelineCurrentIndicator: { fontSize: 11, color: '#E10600', fontWeight: '700', marginTop: 2 },
  section: { marginBottom: 16, backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 12 },
  itemsList: { gap: 10 },
  orderItem: { flexDirection: 'row', gap: 12 },
  itemLeft: { flexDirection: 'row', gap: 10, flex: 1 },
  itemImage: { width: 60, height: 60, borderRadius: 8 },
  itemInfo: { justifyContent: 'center', gap: 2 },
  itemTitle: { fontSize: 13, fontWeight: '700', color: '#fff' },
  itemBrand: { fontSize: 11, fontWeight: '700', color: '#E10600', textTransform: 'uppercase' },
  itemQty: { fontSize: 11, color: '#64748b' },
  itemTotal: { fontSize: 15, fontWeight: '800', color: '#fff', marginTop: 'auto' },
  addressCard: { backgroundColor: '#0f172a', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#334155' },
  addressName: { fontSize: 14, fontWeight: '700', color: '#fff' },
  addressPhone: { fontSize: 13, color: '#E10600', fontWeight: '600', marginTop: 4 },
  addressLine: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  paymentCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0f172a', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#334155' },
  paymentIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#7f1d1d', justifyContent: 'center', alignItems: 'center' },
  paymentLabel: { fontSize: 14, fontWeight: '600', color: '#fff' },
  notesCard: { backgroundColor: '#0f172a', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#334155' },
  notesText: { fontSize: 13, color: '#e2e8f0', lineHeight: 20 },
  summaryCard: { backgroundColor: '#0f172a', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13, color: '#94a3b8' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: '#fff' },
  discountLabel: { color: '#22c55e' },
  discountValue: { color: '#22c55e' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 12, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#fff' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#E10600' },
  cancelButton: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7f1d1d', borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: '#ef4444' },
  cancelButtonText: { fontSize: 14, fontWeight: '700', color: '#ef4444' },
});