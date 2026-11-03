'use client';

import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';

interface BannerItem {
  id: string;
  title: string;
  imageUrl: string;
  linkType: string;
  linkTarget?: string;
}

interface BannerProps {
  banner: BannerItem;
}

export function Banner({ banner }: BannerProps) {
  const handlePress = () => {
    if (banner.linkTarget) {
      if (banner.linkType === 'category') {
        router.push(`/category/${banner.linkTarget}`);
      } else if (banner.linkType === 'product') {
        router.push(`/product/${banner.linkTarget}`);
      } else if (banner.linkType === 'url') {
        // External URL - would need Linking.openURL
        console.log('Open external URL:', banner.linkTarget);
      }
    }
  };

  return (
    <TouchableOpacity style={styles.banner} onPress={handlePress} activeOpacity={0.9}>
      <Image
        source={{ uri: banner.imageUrl }}
        style={styles.bannerImage}
        resizeMode="cover"
      />
      <View style={styles.overlay} />
      <View style={styles.content}>
        <Text style={styles.title}>{banner.title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: 320,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerImage: { width: '100%', height: '100%' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  title: { fontSize: 16, fontWeight: '800', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
});