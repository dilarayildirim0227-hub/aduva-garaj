'use client';

import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { api } from '../lib/api';
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
  isBilling: boolean;
}

export default function AddressesScreen() {
  const { t } = useTranslation();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAddresses = async () => {
    try {
      const res = await api<Address[]>('/users/me/addresses');
      setAddresses(res);
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAddresses();
  };

  const handleSetDefault = async (addressId: string, isBilling = false) => {
    try {
      await api(`/users/me/addresses/${addressId}/default`, {
        method: 'POST',
        body: JSON.stringify({ isBilling }),
      });
      loadAddresses();
    } catch (error) {
      console.error('Failed to set default address:', error);
    }
  };

  const handleDelete = async (addressId: string) => {
    try {
      await api(`/users/me/addresses/${addressId}`, { method: 'DELETE' });
      loadAddresses();
    } catch (error) {
      console.error('Failed to delete address:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="location-outline" size={48} color="#E10600" />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('addresses.title')}</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/addresses/add')}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={
        <View style={styles.refreshControl} />
      } onRefresh={onRefresh} refreshing={refreshing}>
        {addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={80} color="#334155" />
            <Text style={styles.emptyTitle}>{t('addresses.empty')}</Text>
            <Text style={styles.emptyDesc}>{t('addresses.emptyDesc')}</Text>
            <TouchableOpacity style={styles.addAddressButton} onPress={() => router.push('/addresses/add')}>
              <Ionicons name="add-outline" size={20} color="#fff" style={styles.addAddressIcon} />
              <Text style={styles.addAddressText}>{t('addresses.addAddress')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={addresses}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.addressCard,
                  item.isDefault && styles.addressCardDefault,
                ]}
                onPress={() => router.push(`/addresses/edit/${item.id}`)}
                activeOpacity={0.9}
              >
                <View style={styles.addressCardHeader}>
                  <View style={styles.addressTitleRow}>
                    <Text style={styles.addressTitle}>{item.title}</Text>
                    {item.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>{t('addresses.default')}</Text>
                      </View>
                    )}
                    {item.isBilling && (
                      <View style={styles.billingBadge}>
                        <Text style={styles.billingBadgeText}>{t('addresses.billing')}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.addressInfo}>
                  <Text style={styles.addressName}>{item.fullName}</Text>
                  <Text style={styles.addressPhone}>{item.phone}</Text>
                  <Text style={styles.addressLine}>{item.addressLine}</Text>
                  <Text style={styles.addressLine}>
                    {item.neighborhood}, {item.district}, {item.city} {item.postalCode}
                  </Text>
                </View>

                <View style={styles.addressActions}>
                  {!item.isDefault && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={(e) => { e.stopPropagation(); handleSetDefault(item.id); }}
                    >
                      <Ionicons name="star-outline" size={18} color="#f59e0b" />
                      <Text style={styles.actionButtonText}>{t('addresses.setDefault')}</Text>
                    </TouchableOpacity>
                  )}
                  {!item.isBilling && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={(e) => { e.stopPropagation(); handleSetDefault(item.id, true); }}
                    >
                      <Ionicons name="document-text-outline" size={18} color="#3b82f6" />
                      <Text style={styles.actionButtonText}>{t('addresses.setBilling')}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionButtonDanger}
                    onPress={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    <Text style={styles.actionButtonText}>{t('addresses.delete')}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  addButton: { padding: 8 },
  scrollContent: { paddingBottom: 24 },
  refreshControl: { height: 0 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32, marginTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  emptyDesc: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  addAddressButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E10600', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, marginTop: 8 },
  addAddressIcon: { marginRight: 4 },
  addAddressText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  addressCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155', marginHorizontal: 16, marginBottom: 12 },
  addressCardDefault: { borderColor: '#f59e0b' },
  addressCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  addressTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addressTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  defaultBadge: { backgroundColor: '#f59e0b', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  defaultBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff', textTransform: 'uppercase' },
  billingBadge: { backgroundColor: '#3b82f6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  billingBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff', textTransform: 'uppercase' },
  addressInfo: { gap: 4, marginBottom: 12 },
  addressName: { fontSize: 14, fontWeight: '600', color: '#e2e8f0' },
  addressPhone: { fontSize: 13, color: '#E10600', fontWeight: '600' },
  addressLine: { fontSize: 12, color: '#94a3b8' },
  addressActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  actionButtonDanger: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#7f1d1d', borderRadius: 8, borderWidth: 1, borderColor: '#ef4444' },
  actionButtonText: { fontSize: 11, fontWeight: '700' },
  separator: { height: 8 },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
});