import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

export default function RootLayout() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.backgroundRoot,
          paddingTop: insets.top,
        },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="worker-detail" />
      <Stack.Screen name="project-detail" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
