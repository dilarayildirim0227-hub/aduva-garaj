'use client';

import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { api } from '../lib/api';
import { useAuth } from '../stores/auth';

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  generation: string;
  year: number;
  engine: string;
  fuelType: 'PETROL' | 'DIESEL' | 'LPG' | 'HYBRID' | 'ELECTRIC';
  transmission: 'MANUAL' | 'AUTOMATIC' | 'CVT' | 'DSG';
  bodyType: string;
  powerKw: number;
  powerPs: number;
  displacementCc: number;
  isDefault: boolean;
  createdAt: string;
}

const FUEL_ICONS: Record<Vehicle['fuelType'], string> = {
  PETROL: 'flask-outline',
  DIESEL: 'leaf-outline',
  LPG: 'flame-outline',
  HYBRID: 'leaf-outline',
  ELECTRIC: 'bolt-outline',
};

const TRANSMISSION_LABELS: Record<Vehicle['transmission'], string> = {
  MANUAL: 'Manuel',
  AUTOMATIC: 'Otomatik',
  CVT: 'CVT',
  DSG: 'DSG',
};

export default function VehiclesScreen() {
  const { t } = useTranslation();
  const { selectedVehicleId, setSelectedVehicle } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const res = await api<Vehicle[]>('/users/me/vehicles');
      setVehicles(res);
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle.id);
    router.back();
  };

  const handleSetDefault = async (vehicleId: string) => {
    try {
      await api(`/users/me/vehicles/${vehicleId}/default`, { method: 'POST' });
      loadVehicles();
    } catch (error) {
      console.error('Failed to set default vehicle:', error);
    }
  };

  const handleDelete = async (vehicleId: string) => {
    try {
      await api(`/users/me/vehicles/${vehicleId}`, { method: 'DELETE' });
      loadVehicles();
    } catch (error) {
      console.error('Failed to delete vehicle:', error);
    }
  };

  const getFuelIcon = (fuelType: Vehicle['fuelType']) => FUEL_ICONS[fuelType] || 'help-outline';

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="car-outline" size={48} color="#E10600" />
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
        <Text style={styles.headerTitle}>{t('vehicles.title')}</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={
        <View style={styles.refreshControl} />
      }>
        {vehicles.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={80} color="#334155" />
            <Text style={styles.emptyTitle}>{t('vehicles.empty')}</Text>
            <Text style={styles.emptyDesc}>{t('vehicles.emptyDesc')}</Text>
            <TouchableOpacity style={styles.addVehicleButton} onPress={() => setShowAddModal(true)}>
              <Ionicons name="add-outline" size={20} color="#fff" style={styles.addVehicleIcon} />
              <Text style={styles.addVehicleText}>{t('vehicles.addVehicle')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={vehicles}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.vehicleCard,
                  item.isDefault && styles.vehicleCardDefault,
                  selectedVehicleId === item.id && styles.vehicleCardSelected,
                ]}
                onPress={() => handleSelectVehicle(item)}
                activeOpacity={0.9}
              >
                <View style={styles.vehicleCardHeader}>
                  <View style={styles.vehicleBadge}>
                    <Ionicons name={getFuelIcon(item.fuelType)} size={18} color="#fff" />
                  </View>
                  <View style={styles.vehicleBadges}>
                    {item.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>{t('vehicles.default')}</Text>
                      </View>
                    )}
                    {selectedVehicleId === item.id && (
                      <View style={styles.selectedBadge}>
                        <Ionicons name="checkmark-outline" size={10} color="#fff" />
                        <Text style={styles.selectedBadgeText}>{t('vehicles.selected')}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleTitle}>{item.brand} {item.model}</Text>
                  <Text style={styles.vehicleSubtitle}>
                    {item.generation} {item.year} - {item.engine}
                  </Text>
                  <View style={styles.vehicleSpecs}>
                    <View style={styles.specItem}>
                      <Ionicons name={getFuelIcon(item.fuelType)} size={14} color="#64748b" />
                      <Text style={styles.specText}>{item.fuelType}</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Ionicons name="settings-outline" size={14} color="#64748b" />
                      <Text style={styles.specText}>{TRANSMISSION_LABELS[item.transmission]}</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Ionicons name="flash-outline" size={14} color="#64748b" />
                      <Text style={styles.specText}>{item.powerPs} PS / {item.powerKw} kW</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Ionicons name="resize-outline" size={14} color="#64748b" />
                      <Text style={styles.specText}>{(item.displacementCc / 1000).toFixed(1)}L</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.vehicleActions}>
                  {!item.isDefault && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={(e) => { e.stopPropagation(); handleSetDefault(item.id); }}
                    >
                      <Ionicons name="star-outline" size={18} color="#f59e0b" />
                      <Text style={styles.actionButtonText}>{t('vehicles.setDefault')}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionButtonDanger}
                    onPress={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    <Text style={styles.actionButtonText}>{t('vehicles.delete')}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </ScrollView>

      {/* Add Vehicle Modal */}
      <AddVehicleModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={loadVehicles}
      />
    </SafeAreaView>
  );
}

// Add Vehicle Modal Component
import { Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';

interface AddVehicleModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: () => void;
}

function AddVehicleModal({ visible, onClose, onAdd }: AddVehicleModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    generation: '',
    year: '',
    engine: '',
    fuelType: 'PETROL' as Vehicle['fuelType'],
    transmission: 'MANUAL' as Vehicle['transmission'],
    bodyType: '',
    powerKw: '',
    powerPs: '',
    displacementCc: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api('/users/me/vehicles', {
        method: 'POST',
        body: JSON.stringify({
          brand: formData.brand,
          model: formData.model,
          generation: formData.generation,
          year: parseInt(formData.year),
          engine: formData.engine,
          fuelType: formData.fuelType,
          transmission: formData.transmission,
          bodyType: formData.bodyType,
          powerKw: parseInt(formData.powerKw),
          powerPs: parseInt(formData.powerPs),
          displacementCc: parseInt(formData.displacementCc),
        }),
      });
      onAdd();
      onClose();
    } catch (error) {
      console.error('Failed to add vehicle:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableOpacity style={styles.modalOverlay} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('vehicles.addVehicle')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Ionicons name="close-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('vehicles.brand')}</Text>
              <TextInput
                style={styles.formInput}
                placeholder={t('vehicles.brandPlaceholder')}
                value={formData.brand}
                onChangeText={(v) => setFormData({ ...formData, brand: v })}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('vehicles.model')}</Text>
              <TextInput
                style={styles.formInput}
                placeholder={t('vehicles.modelPlaceholder')}
                value={formData.model}
                onChangeText={(v) => setFormData({ ...formData, model: v })}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.formRow}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>{t('vehicles.generation')}</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={t('vehicles.generationPlaceholder')}
                  value={formData.generation}
                  onChangeText={(v) => setFormData({ ...formData, generation: v })}
                />
              </View>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>{t('vehicles.year')}</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={t('vehicles.yearPlaceholder')}
                  value={formData.year}
                  onChangeText={(v) => setFormData({ ...formData, year: v })}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('vehicles.engine')}</Text>
              <TextInput
                style={styles.formInput}
                placeholder={t('vehicles.enginePlaceholder')}
                value={formData.engine}
                onChangeText={(v) => setFormData({ ...formData, engine: v })}
              />
            </View>
            <View style={styles.formRow}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>{t('vehicles.fuelType')}</Text>
                <TouchableOpacity
                  style={[styles.selectButton, formData.fuelType === 'PETROL' && styles.selectButtonActive]}
                  onPress={() => setFormData({ ...formData, fuelType: 'PETROL' })}
                >
                  <Text style={[styles.selectButtonText, formData.fuelType === 'PETROL' && styles.selectButtonTextActive]}>Benzin</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>{t('vehicles.transmission')}</Text>
                <TouchableOpacity
                  style={[styles.selectButton, formData.transmission === 'MANUAL' && styles.selectButtonActive]}
                  onPress={() => setFormData({ ...formData, transmission: 'MANUAL' })}
                >
                  <Text style={[styles.selectButtonText, formData.transmission === 'MANUAL' && styles.selectButtonTextActive]}>Manuel</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>{t('vehicles.bodyType')}</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={t('vehicles.bodyTypePlaceholder')}
                  value={formData.bodyType}
                  onChangeText={(v) => setFormData({ ...formData, bodyType: v })}
                />
              </View>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>{t('vehicles.displacement')}</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={t('vehicles.displacementPlaceholder')}
                  value={formData.displacementCc}
                  onChangeText={(v) => setFormData({ ...formData, displacementCc: v })}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>{t('vehicles.powerKw')}</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={t('vehicles.powerKwPlaceholder')}
                  value={formData.powerKw}
                  onChangeText={(v) => setFormData({ ...formData, powerKw: v })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>{t('vehicles.powerPs')}</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={t('vehicles.powerPsPlaceholder')}
                  value={formData.powerPs}
                  onChangeText={(v) => setFormData({ ...formData, powerPs: v })}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose} disabled={submitting}>
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSubmit} onPress={handleSubmit} disabled={submitting}>
              {submitting ? (
                <Ionicons name="spinner" size={20} color="#fff" />
              ) : (
                <Text style={styles.modalSubmitText}>{t('common.save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Import useState
import { useState } from 'react';

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
  addVehicleButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E10600', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, marginTop: 8 },
  addVehicleIcon: { marginRight: 4 },
  addVehicleText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  vehicleCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155', marginHorizontal: 16, marginBottom: 12 },
  vehicleCardDefault: { borderColor: '#f59e0b' },
  vehicleCardSelected: { borderColor: '#E10600', backgroundColor: '#7f1d1d' },
  vehicleCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  vehicleBadge: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#E10600', justifyContent: 'center', alignItems: 'center' },
  vehicleBadges: { flexDirection: 'row', gap: 6 },
  defaultBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f59e0b', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  defaultBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  selectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22c55e', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  selectedBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  vehicleInfo: { gap: 6, marginBottom: 12 },
  vehicleTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  vehicleSubtitle: { fontSize: 13, color: '#94a3b8' },
  vehicleSpecs: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  specItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  specText: { fontSize: 11, color: '#94a3b8' },
  vehicleActions: { flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155' },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  actionButtonDanger: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: '#7f1d1d', borderRadius: 10, borderWidth: 1, borderColor: '#ef4444' },
  actionButtonText: { fontSize: 12, fontWeight: '700' },
  separator: { height: 8 },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  // Modal styles
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  modalOverlay: { flex: 1 },
  modalContent: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', borderWidth: 1, borderColor: '#334155' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#334155' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  modalClose: { padding: 4 },
  modalScroll: { paddingHorizontal: 20, paddingVertical: 16, gap: 16 },
  formGroup: { gap: 6 },
  formRow: { flexDirection: 'row', gap: 12 },
  formGroupHalf: { flex: 1, gap: 6 },
  formLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  formInput: { backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#fff' },
  selectButton: { flex: 1, backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', paddingVertical: 12, alignItems: 'center' },
  selectButtonActive: { borderColor: '#E10600', backgroundColor: '#7f1d1d' },
  selectButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  selectButtonTextActive: { color: '#E10600' },
  modalActions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#334155' },
  modalCancel: { flex: 1, backgroundColor: '#0f172a', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
  modalSubmit: { flex: 1, backgroundColor: '#E10600', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  modalSubmitText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});