import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { ColorSchemeProvider } from '@/hooks/useColorScheme';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

// 防止自动隐藏 splash screen
SplashScreen.preventAutoHideAsync();

function RootNavigation() {
  const { theme } = useTheme();
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

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (e) {
        console.warn('Prepare error:', e);
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (isReady) {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn('Hide splash error:', e);
      }
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <ColorSchemeProvider>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <RootNavigation />
      </View>
    </ColorSchemeProvider>
  );
}
