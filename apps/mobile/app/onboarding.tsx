import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, FlatList, Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePrefs } from '../src/stores/auth';

const { width } = Dimensions.get('window');
const ICONS = ['car-sport', 'musical-notes', 'rocket'] as const;

export default function Onboarding() {
  const { t } = useTranslation();
  const slides = t('onboarding', { returnObjects: true }) as { title: string; text: string }[];
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const finish = usePrefs((s) => s.setOnboardingDone);

  const done = () => {
    finish();
    router.replace('/(tabs)');
  };
  const next = () => (index < slides.length - 1 ? listRef.current?.scrollToIndex({ index: index + 1 }) : done());

  return (
    <LinearGradient colors={['#1a0606', '#0B0D10', '#0B0D10']} className="flex-1">
      <SafeAreaView className="flex-1">
        <View className="flex-row justify-between items-center px-6 pt-2">
          <Text className="text-fg text-lg font-extrabold tracking-widest">
            ADUVA <Text className="text-primary">GARAJ</Text>
          </Text>
          <Pressable onPress={done} hitSlop={16} accessibilityRole="button">
            <Text className="text-fg-muted text-base">{t('common.skip')}</Text>
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index: i }) => (
            <View style={{ width }} className="flex-1 items-center justify-center px-8">
              <Animated.View entering={FadeInDown.duration(600)} className="w-44 h-44 rounded-full bg-surface items-center justify-center border border-line mb-10">
                <View className="absolute w-56 h-56 rounded-full bg-primary/10" />
                <Ionicons name={ICONS[i]} size={84} color="#E10600" />
              </Animated.View>
              <Text className="text-fg text-3xl font-extrabold text-center mb-4">{item.title}</Text>
              <Text className="text-fg-muted text-base text-center leading-6">{item.text}</Text>
            </View>
          )}
        />

        <View className="px-6 pb-6">
          <View className="flex-row justify-center gap-2 mb-6">
            {slides.map((_, i) => (
              <View key={i} className={`h-2 rounded-full ${i === index ? 'w-8 bg-primary' : 'w-2 bg-line'}`} />
            ))}
          </View>
          <Pressable
            onPress={next}
            accessibilityRole="button"
            className="bg-primary active:bg-primary-dark rounded-2xl h-14 items-center justify-center"
          >
            <Text className="text-white text-base font-bold">
              {index === slides.length - 1 ? t('common.start') : t('common.continue')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
