'use client';

import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../stores/auth';
import { router } from 'expo-router';
import { api } from '../../lib/api';
import { formatKurus } from '../../lib/cart-api';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, accessToken, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  const menuItems = [
    { key: 'orders', icon: 'bag-handle-outline', label: t('profile.myOrders'), route: '/orders', testId: 'menu-orders' },
    { key: 'vehicles', icon: 'car-outline', label: t('profile.myVehicles'), route: '/vehicles', testId: 'menu-vehicles' },
    { key: 'addresses', icon: 'location-outline', label: t('profile.myAddresses'), route: '/addresses', testId: 'menu-addresses' },
    { key: 'wishlist', icon: 'heart-outline', label: t('profile.myWishlist'), route: '/wishlist', testId: 'menu-wishlist' },
    { key: 'notifications', icon: 'notifications-outline', label: t('profile.notifications'), route: '/notifications', testId: 'menu-notifications' },
    { key: 'appointments', icon: 'calendar-outline', label: t('profile.appointments'), route: '/appointments', testId: 'menu-appointments' },
    { key: 'settings', icon: 'settings-outline', label: t('profile.settings'), route: '/settings', testId: 'menu-settings' },
    { key: 'legal', icon: 'document-text-outline', label: t('profile.kvkk'), route: '/legal', testId: 'menu-legal' },
  ];

  const handleLogout = async () => {
    setLoading(true);
    await logout();
    setLoading(false);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.guestHeader}>
            <Ionicons name="person-circle-outline" size={80} color="#64748b" />
            <Text style={styles.guestTitle}>{t('profile.guestMode')}</Text>
            <Text style={styles.guestDesc}>{t('profile.guestDesc')}</Text>
            <View style={styles.guestButtons}>
              <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
                <Text style={styles.loginButtonText}>{t('auth.login')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.registerButton} onPress={() => router.push('/register')}>
                <Text style={styles.registerButtonText}>{t('auth.registerNow')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.quickLinks')}</Text>
            <View style={styles.menuList}>
              {menuItems.slice(0, 4).map((item) => (
                <TouchableOpacity key={item.key} style={styles.menuItem} onPress={() => router.push(item.route)}>
                  <Ionicons name={item.icon} size={24} color="#E10600" />
                  <Text style={styles.menuItemText}>{item.label}</Text>
                  <Ionicons name="chevron-forward-outline" size={20} color="#64748b" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user.name ? (
              <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
            ) : (
              <Ionicons name="person" size={40} color="#fff" />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.name || t('profile.noName')}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
            <View style={styles.profileMeta}>
              {user.phone && (
                <View style={styles.metaItem}>
                  <Ionicons name="call-outline" size={14} color="#64748b" />
                  <Text style={styles.metaText}>{user.phone}</Text>
                </View>
              )}
              {user.role === 'ADMIN' && (
                <View style={styles.adminBadge}>
                  <Ionicons name="shield-checkmark-outline" size={12} color="#fff" />
                  <Text style={styles.adminBadgeText}>{t('auth.adminLogin')}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.account')}</Text>
          <View style={styles.menuList}>
            {menuItems.map((item) => (
              <TouchableOpacity key={item.key} style={styles.menuItem} onPress={() => router.push(item.route)} testID={item.testId}>
                <Ionicons name={item.icon} size={24} color="#E10600" />
                <Text style={styles.menuItemText}>{item.label}</Text>
                <Ionicons name="chevron-forward-outline" size={20} color="#64748b" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.appInfo')}</Text>
          <View style={styles.menuList}>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/legal')}>
              <Ionicons name="document-text-outline" size={24} color="#E10600" />
              <Text style={styles.menuItemText}>{t('profile.privacyPolicy')}</Text>
              <Ionicons name="chevron-forward-outline" size={20} color="#64748b" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/legal')}>
              <Ionicons name="shield-outline" size={24} color="#E10600" />
              <Text style={styles.menuItemText}>{t('profile.termsOfService')}</Text>
              <Ionicons name="chevron-forward-outline" size={20} color="#64748b" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/legal')}>
              <Ionicons name="information-circle-outline" size={24} color="#E10600" />
              <Text style={styles.menuItemText}>{t('profile.about')}</Text>
              <Ionicons name="chevron-forward-outline" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={loading}>
          {loading ? (
            <Ionicons name="spinner" size={24} color="#fff" style={styles.spinner} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={24} color="#fff" />
              <Text style={styles.logoutButtonText}>{t('profile.logout')}</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.versionText}>{t('profile.version')} 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// Need to import useState
import { useState } from 'react';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scrollContent: { paddingBottom: 40 },
  guestHeader: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 32, gap: 16 },
  guestTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  guestDesc: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  guestButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  loginButton: { flex: 1, backgroundColor: '#E10600', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  loginButtonText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  registerButton: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  registerButtonText: { fontSize: 14, fontWeight: '800', color: '#E10600' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 20 },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E10600',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: 20, fontWeight: '800', color: '#fff' },
  profileEmail: { fontSize: 13, color: '#94a3b8' },
  profileMeta: { flexDirection: 'row', gap: 12, marginTop: 4, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: '#64748b' },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7f1d1d', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  adminBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff', textTransform: 'uppercase' },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  menuList: { backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuItemText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#fff' },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#7f1d1d',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E10600',
  },
  spinner: { marginRight: 4 },
  logoutButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  versionText: { textAlign: 'center', fontSize: 12, color: '#64748b', marginTop: 24, marginBottom: 16 },
});