'use client';

import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { api } from '../lib/api';
import { formatKurus } from '../lib/cart-api';
import { useAuth } from '../stores/auth';

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
  address?: {
    fullName: string;
    phone: string;
    addressLine: string;
    city: string;
    district: string;
  };
}

const STATUS_CONFIG: Record<Order['status'], { label: string; color: string; icon: string }> = {
  PENDING: { label: 'orders.status.pending', color: '#f59e0b', icon: 'time-outline' },
  CONFIRMED: { label: 'orders.status.confirmed', color: '#3b82f6', icon: 'checkmark-circle-outline' },
  PROCESSING: { label: 'orders.status.processing', color: '#8b5cf6', icon: 'cog-outline' },
  SHIPPED: { label: 'orders.status.shipped', color: '#06b6d4', icon: 'cube-outline' },
  DELIVERED: { label: 'orders.status.delivered', color: '#22c55e', icon: 'checkmark-done-outline' },
  CANCELLED: { label: 'orders.status.cancelled', color: '#ef4444', icon: 'close-circle-outline' },
  RETURNED: { label: 'orders.status.returned', color: '#64748b', icon: 'refresh-outline' },
};

export default function OrdersScreen() {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = async () => {
    try {
      const res = await api<Order[]>('/orders');
      setOrders(res);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('orders.title')}</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.orderCard} onPress={() => router.push(`/orders/${item.id}`)} activeOpacity={0.9}>
            {/* Header */}
            <View style={styles.orderHeader}>
              <View style={styles.orderHeaderLeft}>
                <Text style={styles.orderNumber}>{t('orders.orderNumber').replace('{{number}}', item.orderNumber)}</Text>
                <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusConfig(item.status).color }]}>
                <Ionicons name={getStatusConfig(item.status).icon} size={14} color="#fff" />
                <Text style={styles.statusText}>{getStatusConfig(item.status).label}</Text>
              </View>
            </View>

            {/* Items Preview */}
            <View style={styles.itemsPreview}>
              {item.items.slice(0, 3).map((orderItem, idx) => (
                <View key={idx} style={styles.previewItem}>
                  {orderItem.product.image && (
                    <Image source={{ uri: orderItem.product.image }} style={styles.previewImage} resizeMode="cover" />
                  )}
                  <View style={styles.previewInfo}>
                    <Text style={styles.previewTitle} numberOfLines={1}>{orderItem.product.title}</Text>
                    <Text style={styles.previewQty}>x{orderItem.quantity}</Text>
                  </View>
                </View>
              ))}
              {item.items.length > 3 && (
                <View style={styles.moreItems}>
                  <Text style={styles.moreItemsText}>+{item.items.length - 3} {t('orders.moreItems')}</Text>
                </View>
              )}
            </View>

            {/* Footer */}
            <View style={styles.orderFooter}>
              <View style={styles.footerLeft}>
                <Text style={styles.totalLabel}>{t('orders.total')}</Text>
                <Text style={styles.totalAmount}>{formatKurus(item.total)}</Text>
              </View>
              <View style={styles.footerRight}>
                <Ionicons name="chevron-forward-outline" size={20} color="#64748b" />
              </View>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <View style={styles.refreshControl} />
        }
        onRefresh={onRefresh}
        refreshing={refreshing}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="bag-handle-outline" size={80} color="#334155" />
            <Text style={styles.emptyTitle}>{t('orders.empty')}</Text>
            <Text style={styles.emptyDesc}>{t('orders.emptyDesc')}</Text>
            <TouchableOpacity style={styles.shopButton} onPress={() => router.push('/')}>
              <Text style={styles.shopButtonText}>{t('orders.startShopping')}</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  header: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  orderCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderHeaderLeft: { gap: 4 },
  orderNumber: { fontSize: 15, fontWeight: '800', color: '#fff' },
  orderDate: { fontSize: 12, color: '#64748b' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#fff', textTransform: 'uppercase' },
  itemsPreview: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  previewItem: { width: 60, gap: 6 },
  previewImage: { width: 60, height: 60, borderRadius: 8 },
  previewInfo: { gap: 2 },
  previewTitle: { fontSize: 11, fontWeight: '600', color: '#fff' },
  previewQty: { fontSize: 10, color: '#64748b' },
  moreItems: { width: 60, justifyContent: 'center', alignItems: 'center' },
  moreItemsText: { fontSize: 11, fontWeight: '700', color: '#E10600', textAlign: 'center' },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155' },
  footerLeft: { gap: 2 },
  totalLabel: { fontSize: 12, color: '#64748b' },
  totalAmount: { fontSize: 18, fontWeight: '800', color: '#fff' },
  footerRight: {},
  separator: { height: 12 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 16 },
  refreshControl: { height: 0 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  emptyDesc: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  shopButton: { backgroundColor: '#E10600', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 },
  shopButtonText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});