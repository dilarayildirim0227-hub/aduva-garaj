'use client';

import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { api } from '../lib/api';
import { useAuth } from '../stores/auth';

interface Appointment {
  id: string;
  appointmentNumber: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  type: 'INSTALLATION' | 'INSPECTION' | 'MAINTENANCE' | 'REPAIR' | 'OTHER';
  scheduledAt: string;
  completedAt: string | null;
  notes: string | null;
  vehicle: {
    id: string;
    brand: string;
    model: string;
    year: number;
  };
  service?: {
    id: string;
    name: string;
    price: number;
  };
  address?: {
    addressLine: string;
    city: string;
    district: string;
  };
}

const STATUS_CONFIG: Record<Appointment['status'], { label: string; color: string; icon: string }> = {
  PENDING: { label: 'appointments.status.pending', color: '#f59e0b', icon: 'time-outline' },
  CONFIRMED: { label: 'appointments.status.confirmed', color: '#3b82f6', icon: 'checkmark-circle-outline' },
  IN_PROGRESS: { label: 'appointments.status.inProgress', color: '#8b5cf6', icon: 'construct-outline' },
  COMPLETED: { label: 'appointments.status.completed', color: '#22c55e', icon: 'checkmark-done-outline' },
  CANCELLED: { label: 'appointments.status.cancelled', color: '#ef4444', icon: 'close-circle-outline' },
};

const TYPE_CONFIG: Record<Appointment['type'], { label: string; icon: string; color: string }> = {
  INSTALLATION: { label: 'appointments.type.installation', icon: 'build-outline', color: '#3b82f6' },
  INSPECTION: { label: 'appointments.type.inspection', icon: 'search-outline', color: '#06b6d4' },
  MAINTENANCE: { label: 'appointments.type.maintenance', icon: 'settings-outline', color: '#8b5cf6' },
  REPAIR: { label: 'appointments.type.repair', icon: 'wrench-outline', color: '#f59e0b' },
  OTHER: { label: 'appointments.type.other', icon: 'help-outline', color: '#64748b' },
};

export default function AppointmentsScreen() {
  const { t } = useTranslation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  const loadAppointments = async () => {
    try {
      const res = await api<Appointment[]>('/appointments');
      setAppointments(res);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments();
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

  const getStatusConfig = (status: Appointment['status']) => {
    const config = STATUS_CONFIG[status];
    return { ...config, label: t(config.label) };
  };

  const getTypeConfig = (type: Appointment['type']) => {
    const config = TYPE_CONFIG[type];
    return { ...config, label: t(config.label) };
  };

  const now = new Date();
  const filteredAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.scheduledAt);
    if (filter === 'upcoming') return aptDate >= now && !['COMPLETED', 'CANCELLED'].includes(apt.status);
    if (filter === 'past') return aptDate < now || ['COMPLETED', 'CANCELLED'].includes(apt.status);
    return true;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="calendar-outline" size={48} color="#E10600" />
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
        <Text style={styles.headerTitle}>{t('appointments.title')}</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/appointments/create')}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'upcoming', 'past'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {t(`appointments.filter.${f}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={
        <View style={styles.refreshControl} />
      } onRefresh={onRefresh} refreshing={refreshing}>
        {filteredAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={80} color="#334155" />
            <Text style={styles.emptyTitle}>{t('appointments.empty')}</Text>
            <Text style={styles.emptyDesc}>{t(`appointments.emptyDesc.${filter}`)}</Text>
            {filter !== 'all' && (
              <TouchableOpacity style={styles.clearFilterButton} onPress={() => setFilter('all')}>
                <Text style={styles.clearFilterText}>{t('appointments.clearFilter')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.bookButton} onPress={() => router.push('/appointments/create')}>
              <Ionicons name="add-outline" size={20} color="#fff" style={styles.bookIcon} />
              <Text style={styles.bookButtonText}>{t('appointments.bookAppointment')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredAppointments}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              const statusConfig = getStatusConfig(item.status);
              const typeConfig = getTypeConfig(item.type);
              const isUpcoming = new Date(item.scheduledAt) >= now;

              return (
                <TouchableOpacity
                  style={[
                    styles.appointmentCard,
                    ['COMPLETED', 'CANCELLED'].includes(item.status) && styles.appointmentCardPast,
                  ]}
                  onPress={() => router.push(`/appointments/${item.id}`)}
                  activeOpacity={0.9}
                >
                  <View style={styles.appointmentHeader}>
                    <View style={styles.appointmentType}>
                      <View style={[styles.typeIcon, { backgroundColor: typeConfig.color || '#E10600' }]}>
                        <Ionicons name={typeConfig.icon} size={18} color="#fff" />
                      </View>
                      <Text style={styles.typeLabel}>{typeConfig.label}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
                      <Ionicons name={statusConfig.icon} size={12} color="#fff" />
                      <Text style={styles.statusText}>{statusConfig.label}</Text>
                    </View>
                  </View>

                  <View style={styles.appointmentDate}>
                    <Ionicons name="calendar-outline" size={16} color="#E10600" />
                    <Text style={styles.dateText}>{formatDate(item.scheduledAt)}</Text>
                    {isUpcoming && (
                      <Text style={styles.upcomingBadge}>{t('appointments.upcoming')}</Text>
                    )}
                  </View>

                  <View style={styles.appointmentVehicle}>
                    <Ionicons name="car-outline" size={16} color="#64748b" />
                    <Text style={styles.vehicleText}>
                      {item.vehicle.brand} {item.vehicle.model} ({item.vehicle.year})
                    </Text>
                  </View>

                  {item.address && (
                    <View style={styles.appointmentAddress}>
                      <Ionicons name="location-outline" size={16} color="#64748b" />
                      <Text style={styles.addressText}>
                        {item.address.addressLine}, {item.address.district}, {item.address.city}
                      </Text>
                    </View>
                  )}

                  {item.service && (
                    <View style={styles.appointmentService}>
                      <Ionicons name="card-outline" size={16} color="#64748b" />
                      <Text style={styles.serviceText}>{item.service.name}</Text>
                    </View>
                  )}

                  {item.notes && (
                    <View style={styles.appointmentNotes}>
                      <Ionicons name="document-text-outline" size={16} color="#64748b" />
                      <Text style={styles.notesText} numberOfLines={1}>{item.notes}</Text>
                    </View>
                  )}

                  <View style={styles.appointmentFooter}>
                    <Text style={styles.appointmentNumber}>{t('appointments.number').replace('{{number}}', item.appointmentNumber)}</Text>
                    <Ionicons name="chevron-forward-outline" size={20} color="#64748b" />
                  </View>
                </TouchableOpacity>
              );
            }}
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
  filterContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  filterTabActive: { backgroundColor: '#E10600', borderColor: '#E10600' },
  filterTabText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  filterTabTextActive: { color: '#fff', fontWeight: '700' },
  scrollContent: { paddingBottom: 24 },
  refreshControl: { height: 0 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32, marginTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  emptyDesc: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  clearFilterButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#1e293b', borderRadius: 20, borderWidth: 1, borderColor: '#334155', marginTop: 8 },
  clearFilterText: { fontSize: 13, fontWeight: '600', color: '#E10600' },
  bookButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E10600', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, marginTop: 16 },
  bookIcon: { marginRight: 4 },
  bookButtonText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  appointmentCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155', marginHorizontal: 16, marginBottom: 12 },
  appointmentCardPast: { opacity: 0.7, borderColor: '#1e293b' },
  appointmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  appointmentType: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  typeLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#fff', textTransform: 'uppercase' },
  appointmentDate: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  dateText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  upcomingBadge: { fontSize: 11, fontWeight: '700', color: '#22c55e', backgroundColor: '#052e16', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  appointmentVehicle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  vehicleText: { fontSize: 13, color: '#e2e8f0' },
  appointmentAddress: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  addressText: { fontSize: 12, color: '#94a3b8' },
  appointmentService: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  serviceText: { fontSize: 12, color: '#94a3b8' },
  appointmentNotes: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  notesText: { fontSize: 12, color: '#64748b', flex: 1 },
  appointmentFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#334155' },
  appointmentNumber: { fontSize: 11, color: '#64748b' },
  separator: { height: 8 },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
});