'use client';

import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../stores/auth';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await logout();
    setLoading(false);
  };

  const notificationItems = [
    { key: 'push', label: t('settings.pushNotifications'), desc: t('settings.pushNotificationsDesc'), value: pushEnabled, onChange: setPushEnabled },
    { key: 'email', label: t('settings.emailNotifications'), desc: t('settings.emailNotificationsDesc'), value: emailEnabled, onChange: setEmailEnabled },
    { key: 'sms', label: t('settings.smsNotifications'), desc: t('settings.smsNotificationsDesc'), value: smsEnabled, onChange: setSmsEnabled },
  ];

  const appearanceItems = [
    { key: 'darkMode', label: t('settings.darkMode'), desc: t('settings.darkModeDesc'), value: darkMode, onChange: setDarkMode },
  ];

  const languageItems = [
    { key: 'tr', label: 'Türkçe', value: language === 'tr' },
    { key: 'en', label: 'English', value: language === 'en' },
  ];

  const accountItems = [
    { key: 'profile', icon: 'person-outline', label: t('settings.profile'), route: '/profile' },
    { key: 'vehicles', icon: 'car-outline', label: t('settings.vehicles'), route: '/vehicles' },
    { key: 'addresses', icon: 'location-outline', label: t('settings.addresses'), route: '/addresses' },
    { key: 'notifications', icon: 'notifications-outline', label: t('settings.notifications'), route: '/notifications' },
    { key: 'privacy', icon: 'lock-closed-outline', label: t('settings.privacy'), route: '/legal' },
  ];

  const supportItems = [
    { key: 'help', icon: 'help-circle-outline', label: t('settings.helpCenter'), action: () => { /* Open help */ } },
    { key: 'contact', icon: 'chatbubble-outline', label: t('settings.contactUs'), action: () => { /* Open contact */ } },
    { key: 'faq', icon: 'question-mark-circle-outline', label: t('settings.faq'), action: () => { /* Open FAQ */ } },
  ];

  const legalItems = [
    { key: 'terms', icon: 'document-text-outline', label: t('settings.terms'), route: '/legal' },
    { key: 'privacy', icon: 'shield-outline', label: t('settings.privacyPolicy'), route: '/legal' },
    { key: 'kvkk', icon: 'lock-closed-outline', label: t('settings.kvkk'), route: '/legal' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back-outline" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
          <View style={styles.settingsList}>
            {accountItems.map(item => (
              <TouchableOpacity key={item.key} style={styles.settingsItem} onPress={() => router.push(item.route)}>
                <View style={styles.settingsIcon}>
                  <Ionicons name={item.icon} size={22} color="#E10600" />
                </View>
                <Text style={styles.settingsLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward-outline" size={20} color="#64748b" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
          <View style={styles.settingsList}>
            {notificationItems.map(item => (
              <View key={item.key} style={styles.settingsItemToggle}>
                <View style={styles.settingsIcon}>
                  <Ionicons name={item.key === 'push' ? 'notifications-outline' : item.key === 'email' ? 'mail-outline' : 'chatbubble-outline'} size={22} color="#E10600" />
                </View>
                <View style={styles.settingsItemInfo} style={styles.flex1}>
                  <Text style={styles.settingsLabel}>{item.label}</Text>
                  <Text style={settingsDesc}>{item.desc}</Text>
                </View>
                <Switch
                  value={item.value}
                  onValueChange={item.onChange}
                  thumbColor={item.value ? '#E10600' : '#64748b'}
                  trackColor={{ false: '#334155', true: '#7f1d1d' }}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.appearance')}</Text>
          <View style={styles.settingsList}>
            {appearanceItems.map(item => (
              <View key={item.key} style={styles.settingsItemToggle}>
                <View style={styles.settingsIcon}>
                  <Ionicons name={item.key === 'darkMode' ? 'moon-outline' : 'sunny-outline'} size={22} color="#E10600" />
                </View>
                <View style={styles.settingsItemInfo} style={styles.flex1}>
                  <Text style={styles.settingsLabel}>{item.label}</Text>
                  <Text style={styles.settingsDesc}>{item.desc}</Text>
                </View>
                <Switch
                  value={item.value}
                  onValueChange={item.onChange}
                  thumbColor={item.value ? '#E10600' : '#64748b'}
                  trackColor={{ false: '#334155', true: '#7f1d1d' }}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          <View style={styles.settingsList}>
            {languageItems.map(lang => (
              <TouchableOpacity
                key={lang.key}
                style={[
                  styles.languageItem,
                  lang.value && styles.languageItemActive,
                ]}
                onPress={() => setLanguage(lang.key as 'tr' | 'en')}
              >
                <Text style={[styles.languageItemText, lang.value && styles.languageItemTextActive]}>
                  {lang.label}
                </Text>
                {lang.value && <Ionicons name="checkmark" size={20} color="#E10600" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.support')}</Text>
          <View style={styles.settingsList}>
            {supportItems.map(item => (
              <TouchableOpacity key={item.key} style={styles.settingsItem} onPress={item.action}>
                <View style={styles.settingsIcon}>
                  <Ionicons name={item.icon} size={22} color="#E10600" />
                </View>
                <Text style={styles.settingsLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward-outline" size={20} color="#64748b" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.legal')}</Text>
          <View style={styles.settingsList}>
            {legalItems.map(item => (
              <TouchableOpacity key={item.key} style={styles.settingsItem} onPress={() => router.push(item.route)}>
                <View style={styles.settingsIcon}>
                  <Ionicons name={item.icon} size={22} color="#E10600" />
                </View>
                <Text style={styles.settingsLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward-outline" size={20} color="#64748b" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.appInfo')}</Text>
          <View style={styles.settingsList}>
            <View style={styles.appInfoItem}>
              <Text style={styles.appInfoLabel}>{t('settings.version')}</Text>
              <Text style={styles.appInfoValue}>1.0.0</Text>
            </View>
            <View style={styles.appInfoItem}>
              <Text style={styles.appInfoLabel}>{t('settings.build')}</Text>
              <Text style={styles.appInfoValue}>2026.1.0</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        {user && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={loading}>
            {loading ? (
              <Ionicons name="spinner" size={24} color="#fff" style={styles.spinner} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={24} color="#fff" style={styles.logoutIcon} />
                <Text style={styles.logoutButtonText}>{t('profile.logout')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

import { useState } from 'react';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 },
  section: { marginBottom: 24, backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  settingsList: { gap: 4 },
  settingsItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  settingsItemToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, gap: 12 },
  settingsIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#7f1d1d', justifyContent: 'center', alignItems: 'center' },
  settingsItemInfo: { flex: 1, gap: 2 },
  settingsLabel: { fontSize: 15, fontWeight: '600', color: '#fff' },
  settingsDesc: { fontSize: 12, color: '#64748b' },
  flex1: { flex: 1 },
  languageItem: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  languageItemActive: { borderColor: '#E10600', backgroundColor: '#7f1d1d' },
  languageItemText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  languageItemTextActive: { color: '#E10600' },
  appInfoItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  appInfoLabel: { fontSize: 14, color: '#94a3b8' },
  appInfoValue: { fontSize: 14, fontWeight: '600', color: '#fff' },
  logoutButton: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7f1d1d', borderRadius: 12, paddingVertical: 16, borderWidth: 1, borderColor: '#E10600' },
  logoutIcon: { marginRight: 4 },
  spinner: { marginRight: 4 },
  logoutButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});