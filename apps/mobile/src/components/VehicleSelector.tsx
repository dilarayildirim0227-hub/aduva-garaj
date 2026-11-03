'use client';

import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  yearFrom: number;
  yearTo: number | null;
  body?: string;
  engine?: string;
}

interface VehicleSelectorProps {
  selectedVehicleId: string;
  onSelectVehicle: (id: string) => void;
  label?: string;
}

export function VehicleSelector({ selectedVehicleId, onSelectVehicle, label }: VehicleSelectorProps) {
  const { t } = useTranslation();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await api<{ items: Vehicle[] }>('/fitment/hierarchy');
      setVehicles(res.vehicles || []);
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const displayName = selectedVehicle
    ? `${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.yearFrom}-${selectedVehicle.yearTo || '2026'})`
    : t('home.allVehicles');

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.selectorButton} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
        <View style={styles.selectorContent}>
          <Ionicons name="car-outline" size={20} color="#E10600" />
          <View style={styles.textContainer}>
            <Text style={styles.selectorLabel}>{label || t('home.vehicleSelector')}</Text>
            <Text style={styles.selectorValue}>{displayName}</Text>
          </View>
        </View>
        <Ionicons name="chevron-down-outline" size={20} color="#64748b" />
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('home.vehicleSelector')}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close-outline" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.vehicleItem, selectedVehicleId === '' && styles.vehicleItemSelected]}
            onPress={() => { onSelectVehicle(''); setModalVisible(false); }}
          >
            <View style={styles.vehicleItemContent}>
              <Ionicons name="car-outline" size={24} color="#E10600" />
              <Text style={[styles.vehicleItemText, selectedVehicleId === '' && styles.vehicleItemTextSelected]}>{t('home.allVehicles')}</Text>
            </View>
            {selectedVehicleId === '' && <Ionicons name="checkmark-circle" size={24} color="#E10600" />}
          </TouchableOpacity>
          <ScrollView contentContainerStyle={styles.modalList}>
            {vehicles.map((vehicle) => (
              <TouchableOpacity
                key={vehicle.id}
                style={[styles.vehicleItem, selectedVehicleId === vehicle.id && styles.vehicleItemSelected]}
                onPress={() => { onSelectVehicle(vehicle.id); setModalVisible(false); }}
              >
                <View style={styles.vehicleItemContent}>
                  <Ionicons name="car-outline" size={24} color="#94a3b8" />
                  <Text style={[styles.vehicleItemText, selectedVehicleId === vehicle.id && styles.vehicleItemTextSelected]}>
                    {vehicle.brand} {vehicle.model} ({vehicle.yearFrom}-${vehicle.yearTo || '2026'})
                    {vehicle.body && ` • ${vehicle.body}`}
                    {vehicle.engine && ` • ${vehicle.engine}`}
                  </Text>
                </View>
                {selectedVehicleId === vehicle.id && <Ionicons name="checkmark-circle" size={24} color="#E10600" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, marginTop: 8 },
  selectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectorContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  selectorLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  selectorValue: { fontSize: 14, fontWeight: '600', color: '#fff', marginTop: 2 },
  modalContainer: { flex: 1, backgroundColor: '#0f172a' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  modalList: { paddingHorizontal: 16, paddingTop: 8, gap: 4 },
  vehicleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  vehicleItemSelected: { backgroundColor: '#7f1d1d', borderWidth: 1, borderColor: '#E10600' },
  vehicleItemContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  vehicleItemText: { fontSize: 14, fontWeight: '500', color: '#e2e8f0', flex: 1 },
  vehicleItemTextSelected: { color: '#fff', fontWeight: '600' },
});