import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@aduva/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { getRefreshToken, useAuth } from '../../src/stores/auth';

function Row({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center h-14 px-4 border-b border-line active:bg-surface-alt" accessibilityRole="button">
      <Ionicons name={icon} size={22} color={danger ? '#E10600' : '#9AA3AE'} />
      <Text className={`flex-1 ml-3 text-base ${danger ? 'text-primary' : 'text-fg'}`}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#2A2F37" />
    </Pressable>
  );
}

export default function Profile() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const doLogout = async () => {
    const refreshToken = await getRefreshToken();
    if (refreshToken) await api('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }).catch(() => undefined);
    await logout();
  };

  const deleteAccount = () =>
    Alert.alert('Hesabı Sil', 'Hesabınız ve kişisel verileriniz kalıcı olarak silinecek. Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Hesabımı Sil',
        style: 'destructive',
        onPress: async () => {
          await api('/auth/account', { method: 'DELETE' });
          await logout();
        },
      },
    ]);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView>
        <Text className="text-fg text-2xl font-extrabold px-5 pt-2 mb-4">{t('tabs.profile')}</Text>

        <View className="mx-4 rounded-2xl bg-surface border border-line p-5 mb-4">
          {user ? (
            <>
              <Text className="text-fg text-lg font-bold">{[user.firstName, user.lastName].filter(Boolean).join(' ') || 'Aduva Üyesi'}</Text>
              <Text className="text-fg-muted mt-1">{user.email ?? user.phone}</Text>
            </>
          ) : (
            <Pressable onPress={() => router.push('/auth/login')} className="bg-primary rounded-xl h-12 items-center justify-center">
              <Text className="text-white font-bold">{t('auth.title')}</Text>
            </Pressable>
          )}
        </View>

        <View className="mx-4 rounded-2xl bg-surface border border-line overflow-hidden">
          <Row icon="logo-whatsapp" label="WhatsApp ile Yazın" onPress={() => Linking.openURL(`https://wa.me/${BRAND.contact.whatsapp}`)} />
          <Row icon="storefront-outline" label="n11 Mağazamız" onPress={() => Linking.openURL(BRAND.contact.n11StoreUrl)} />
          <Row icon="shield-checkmark-outline" label="KVKK Aydınlatma Metni" onPress={() => Alert.alert('KVKK', t('soon'))} />
          {user && <Row icon="log-out-outline" label={t('auth.logout')} onPress={doLogout} />}
          {user && <Row icon="trash-outline" label="Hesabımı Sil" danger onPress={deleteAccount} />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
