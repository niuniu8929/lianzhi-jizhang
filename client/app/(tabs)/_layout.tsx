import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

export default function TabLayout() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.backgroundRoot,
          borderTopColor: theme.border,
          height: Platform.OS === 'web' ? 60 : 50 + insets.bottom,
          paddingBottom: Platform.OS === 'web' ? 0 : insets.bottom,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarItemStyle: {
          height: Platform.OS === 'web' ? 60 : undefined,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '记工',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="clock" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: '项目',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="folder" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workers"
        options={{
          title: '人员',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="users" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: '统计',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="chart-bar" size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
