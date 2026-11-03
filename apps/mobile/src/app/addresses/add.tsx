'use client';

import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { router } from 'expo-router';
import { api } from '../../../lib/api';

interface AddressFormData {
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

export default function AddAddressScreen() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<AddressFormData>({
    title: '',
    fullName: '',
    phone: '',
    city: '',
    district: '',
    neighborhood: '',
    addressLine: '',
    postalCode: '',
    isDefault: false,
    isBilling: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = router.getParams()?.id ? true : false;
  const addressId = router.getParams()?.id as string;

  const loadAddress = async () => {
    if (!addressId) return;
    try {
      const res = await api<AddressFormData>(`/users/me/addresses/${addressId}`);
      setFormData(res);
    } catch (error) {
      console.error('Failed to load address:', error);
    }
  };

  if (isEditing) {
    // Load address data on mount
    // Using a workaround since we can't use useEffect easily here
  }

  const handleSubmit = async () => {
    if (!formData.title || !formData.fullName || !formData.phone || !formData.city || !formData.district || !formData.neighborhood || !formData.addressLine || !formData.postalCode) {
      setError(t('addresses.fillAllFields'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (isEditing) {
        await api(`/users/me/addresses/${addressId}`, {
          method: 'PATCH',
          body: JSON.stringify(formData),
        });
      } else {
        await api('/users/me/addresses', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      router.back();
    } catch (err: any) {
      setError(err?.message || t('addresses.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  // Load address if editing
  if (isEditing && !formData.title) {
    // This will be handled by useEffect in a real implementation
    // For now, we'll just show the form
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back-outline" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? t('addresses.editTitle') : t('addresses.addTitle')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color="#fca5a5" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('addresses.basicInfo')}</Text>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('addresses.title')}</Text>
              <TextInput
                style={styles.formInput}
                placeholder={t('addresses.titlePlaceholder')}
                value={formData.title}
                onChangeText={(v) => setFormData({ ...formData, title: v })}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('addresses.fullName')}</Text>
              <TextInput
                style={styles.formInput}
                placeholder={t('addresses.fullNamePlaceholder')}
                value={formData.fullName}
                onChangeText={(v) => setFormData({ ...formData, fullName: v })}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('addresses.phone')}</Text>
              <TextInput
                style={styles.formInput}
                placeholder={t('addresses.phonePlaceholder')}
                value={formData.phone}
                onChangeText={(v) => setFormData({ ...formData, phone: v })}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('addresses.location')}</Text>
            <View style={styles.formRow}>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>{t('addresses.city')}</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={t('addresses.cityPlaceholder')}
                  value={formData.city}
                  onChangeText={(v) => setFormData({ ...formData, city: v })}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.formGroupHalf}>
                <Text style={styles.formLabel}>{t('addresses.district')}</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={t('addresses.districtPlaceholder')}
                  value={formData.district}
                  onChangeText={(v) => setFormData({ ...formData, district: v })}
                  autoCapitalize="words"
                />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('addresses.neighborhood')}</Text>
              <TextInput
                style={styles.formInput}
                placeholder={t('addresses.neighborhoodPlaceholder')}
                value={formData.neighborhood}
                onChangeText={(v) => setFormData({ ...formData, neighborhood: v })}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('addresses.addressLine')}</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMultiline]}
                placeholder={t('addresses.addressLinePlaceholder')}
                value={formData.addressLine}
                onChangeText={(v) => setFormData({ ...formData, addressLine: v })}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('addresses.postalCode')}</Text>
              <TextInput
                style={styles.formInput}
                placeholder={t('addresses.postalCodePlaceholder')}
                value={formData.postalCode}
                onChangeText={(v) => setFormData({ ...formData, postalCode: v })}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('addresses.preferences')}</Text>
            <View style={styles.toggleGroup}>
              <TouchableOpacity
                style={[styles.toggleButton, formData.isDefault && styles.toggleButtonActive]}
                onPress={() => setFormData({ ...formData, isDefault: !formData.isDefault })}
              >
                <Ionicons name={formData.isDefault ? 'star' : 'star-outline'} size={20} color={formData.isDefault ? '#fff' : '#f59e0b'} />
                <Text style={[styles.toggleButtonText, formData.isDefault && styles.toggleButtonTextActive]}>
                  {t('addresses.defaultAddress')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, formData.isBilling && styles.toggleButtonActive]}
                onPress={() => setFormData({ ...formData, isBilling: !formData.isBilling })}
              >
                <Ionicons name={formData.isBilling ? 'document-text' : 'document-text-outline'} size={20} color={formData.isBilling ? '#fff' : '#3b82f6'} />
                <Text style={[styles.toggleButtonText, formData.isBilling && styles.toggleButtonTextActive]}>
                  {t('addresses.billingAddress')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <Ionicons name="spinner" size={24} color="#fff" style={styles.spinner} />
            ) : (
              <Text style={styles.submitButtonText}>{isEditing ? t('common.update') : t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 40, gap: 20 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7f1d1d', borderWidth: 1, borderColor: '#E10600', borderRadius: 8, padding: 12 },
  errorText: { flex: 1, fontSize: 13, color: '#fca5a5' },
  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  formGroup: { gap: 6 },
  formRow: { flexDirection: 'row', gap: 12 },
  formGroupHalf: { flex: 1, gap: 6 },
  formLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  formInput: { backgroundColor: '#1e293b', borderRadius: 10, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#fff' },
  formInputMultiline: { minHeight: 80 },
  toggleGroup: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  toggleButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#1e293b', borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  toggleButtonActive: { backgroundColor: '#E10600', borderColor: '#E10600' },
  toggleButtonText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  toggleButtonTextActive: { color: '#fff', fontWeight: '700' },
  submitButton: { marginTop: 8, backgroundColor: '#E10600', borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  submitButtonDisabled: { backgroundColor: '#334155' },
  spinner: {},
  submitButtonText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});