import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { checkAndAutoBackup } from '@/services/LocalStorage';

export default function RootLayout() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // 应用启动时检查并执行自动备份
  useEffect(() => {
    checkAndAutoBackup().catch(() => {
      // 自动备份失败，静默处理
    });
  }, []);

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
