import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../stores/auth';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

const TAB_BAR_BG = '#0f172a';
const ACTIVE_COLOR = '#E10600';
const INACTIVE_COLOR = '#64748b';

export default function TabLayout() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (!loading && !user) {
      // Onboarding kontrolü yapılabilir
    }
  }, [user, loading]);

  const tabs = [
    { name: 'index', labelKey: 'tabs.home', icon: 'home', testId: 'tab-home' },
    { name: 'category', labelKey: 'tabs.categories', icon: 'grid', testId: 'tab-categories' },
    { name: 'cart', labelKey: 'tabs.cart', icon: 'cart', testId: 'tab-cart', badge: true },
    { name: 'wishlist', labelKey: 'tabs.wishlist', icon: 'heart', testId: 'tab-wishlist' },
    { name: 'profile', labelKey: 'tabs.profile', icon: 'person', testId: 'tab-profile' },
  ];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          backgroundColor: TAB_BAR_BG,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          height: 70,
          paddingBottom: 10,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        headerShown: false,
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.labelKey),
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? `${tab.icon}-sharp` : `${tab.icon}-outline`} size={size} color={color} />
            ),
            tabBarAccessibilityLabel: t(tab.labelKey),
            testID: tab.testId,
          }}
        />
      ))}
    </Tabs>
  );
}