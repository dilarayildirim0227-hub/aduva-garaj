'use client';

import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { api } from '../lib/api';

interface Notification {
  id: string;
  type: 'ORDER' | 'SHIPPING' | 'PROMOTION' | 'PRICE_ALERT' | 'APPOINTMENT' | 'SYSTEM';
  title: string;
  message: string;
  isRead: boolean;
  relatedId: string | null;
  relatedType: string | null;
  createdAt: string;
}

const TYPE_CONFIG: Record<Notification['type'], { icon: string; color: string; label: string }> = {
  ORDER: { icon: 'bag-handle-outline', color: '#3b82f6', label: 'notifications.type.order' },
  SHIPPING: { icon: 'cube-outline', color: '#06b6d4', label: 'notifications.type.shipping' },
  PROMOTION: { icon: 'pricetag-outline', color: '#f59e0b', label: 'notifications.type.promotion' },
  PRICE_ALERT: { icon: 'alert-circle-outline', color: '#ef4444', label: 'notifications.type.priceAlert' },
  APPOINTMENT: { icon: 'calendar-outline', color: '#8b5cf6', label: 'notifications.type.appointment' },
  SYSTEM: { icon: 'information-circle-outline', color: '#64748b', label: 'notifications.type.system' },
};

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      const res = await api<Notification[]>('/notifications');
      setNotifications(res);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api(`/notifications/${notificationId}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api('/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('notifications.justNow');
    if (diffMins < 60) return t('notifications.minutesAgo').replace('{{count}}', diffMins.toString());
    if (diffHours < 24) return t('notifications.hoursAgo').replace('{{count}}', diffHours.toString());
    if (diffDays < 7) return t('notifications.daysAgo').replace('{{count}}', diffDays.toString());
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="notifications-outline" size={48} color="#E10600" />
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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllText}>{t('notifications.markAllRead')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={
        <View style={styles.refreshControl} />
      } onRefresh={onRefresh} refreshing={refreshing}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={80} color="#334155" />
            <Text style={styles.emptyTitle}>{t('notifications.empty')}</Text>
            <Text style={styles.emptyDesc}>{t('notifications.emptyDesc')}</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              const config = TYPE_CONFIG[item.type];
              return (
                <TouchableOpacity
                  style={[
                    styles.notificationItem,
                    !item.isRead && styles.notificationItemUnread,
                  ]}
                  onPress={() => {
                    if (!item.isRead) handleMarkAsRead(item.id);
                    if (item.relatedId && item.relatedType) {
                      if (item.relatedType === 'order') router.push(`/orders/${item.relatedId}`);
                      else if (item.relatedType === 'product') router.push(`/product/${item.relatedId}`);
                      else if (item.relatedType === 'appointment') router.push(`/appointments/${item.relatedId}`);
                    }
                  }}
                  activeOpacity={0.9}
                >
                  <View style={styles.notificationIcon}>
                    <Ionicons name={config.icon} size={22} color={config.color} />
                  </View>
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <Text style={[
                        styles.notificationTitle,
                        !item.isRead && styles.notificationTitleUnread,
                      ]}>
                        {item.title}
                      </Text>
                      <Text style={styles.notificationTime}>{formatDate(item.createdAt)}</Text>
                    </View>
                    <Text style={styles.notificationMessage}>{item.message}</Text>
                    <View style={styles.notificationMeta}>
                      <View style={[styles.typeBadge, { backgroundColor: config.color }]}>
                        <Text style={styles.typeBadgeText}>{t(config.label)}</Text>
                      </View>
                      {!item.isRead && (
                        <View style={styles.unreadDot} />
                      )}
                    </View>
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
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  unreadBadge: { backgroundColor: '#E10600', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  unreadBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  markAllButton: { paddingHorizontal: 16, paddingVertical: 8 },
  markAllText: { fontSize: 13, fontWeight: '600', color: '#E10600' },
  scrollContent: { paddingBottom: 24 },
  refreshControl: { height: 0 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32, marginTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  emptyDesc: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  notificationItem: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  notificationItemUnread: { borderColor: '#E10600', backgroundColor: '#7f1d1d' },
  notificationIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  notificationContent: { flex: 1, gap: 4 },
  notificationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  notificationTitle: { fontSize: 14, fontWeight: '600', color: '#fff', flex: 1 },
  notificationTitleUnread: { fontWeight: '800' },
  notificationTime: { fontSize: 11, color: '#64748b', marginLeft: 8 },
  notificationMessage: { fontSize: 13, color: '#94a3b8', lineHeight: 18 },
  notificationMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff', textTransform: 'uppercase' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E10600' },
  separator: { height: 8 },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
});