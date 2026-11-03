import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

type IconName = keyof typeof Ionicons.glyphMap;
const TABS: { name: string; key: string; icon: IconName }[] = [
  { name: 'index', key: 'home', icon: 'home' },
  { name: 'categories', key: 'categories', icon: 'grid' },
  { name: 'garage', key: 'garage', icon: 'car-sport' },
  { name: 'cart', key: 'cart', icon: 'cart' },
  { name: 'profile', key: 'profile', icon: 'person' },
];

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E10600',
        tabBarInactiveTintColor: '#9AA3AE',
        tabBarStyle: { backgroundColor: '#15181D', borderTopColor: '#2A2F37', height: 64, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(`tabs.${tab.key}`),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={(focused ? tab.icon : `${tab.icon}-outline`) as IconName} size={24} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
