import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Aşama 2/3'te dolacak sekmeler için ortak "yakında" görünümü */
export function ComingSoon({ title, icon }: { title: string; icon: keyof typeof Ionicons.glyphMap }) {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <Text className="text-fg text-2xl font-extrabold px-5 pt-2">{title}</Text>
      <View className="flex-1 items-center justify-center px-10">
        <View className="w-24 h-24 rounded-full bg-surface border border-line items-center justify-center mb-5">
          <Ionicons name={icon} size={44} color="#E10600" />
        </View>
        <Text className="text-fg-muted text-center">{t('soon')}</Text>
      </View>
    </SafeAreaView>
  );
}
