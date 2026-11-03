'use client';

import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

interface CategoryCardProps {
  category: Category;
}

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  '📺': 'tv-outline',
  '🛡️': 'shield-outline',
  '💺': 'chair-outline',
  '✨': 'sparkles-outline',
  '💡': 'bulb-outline',
  '🔊': 'volume-high-outline',
  '🔧': 'build-outline',
};

export function CategoryCard({ category }: CategoryCardProps) {
  const iconName = ICON_MAP[category.icon] || 'cube-outline';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/category/${category.slug}`)}
      activeOpacity={0.85}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={iconName} size={28} color="#E10600" />
      </View>
      <Text style={styles.nameText}>{category.name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 100,
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    width: 100,
  },
});