import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

// 防止 splash screen 自动隐藏
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // 在布局准备好后隐藏 splash screen
  useEffect(() => {
    // 延迟一帧确保 UI 已渲染
    requestAnimationFrame(() => {
      SplashScreen.hideAsync();
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
