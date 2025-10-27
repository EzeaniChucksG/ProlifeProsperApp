import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { store } from '@/store';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { loadStoredAuth } from '@/store/slices/authSlice';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [authLoaded, setAuthLoaded] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const loadAuth = async () => {
      await dispatch(loadStoredAuth());
      setAuthLoaded(true);
    };
    loadAuth();
  }, [dispatch]);

  useEffect(() => {
    if (!authLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAdminAuthGroup = segments[0] === '(admin-auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inAdminTabsGroup = segments[0] === '(admin-tabs)';
    
    // Standalone authenticated screens that shouldn't redirect
    const standaloneScreens = ['donate', 'campaign', 'scan', 'payment-methods', 'notifications', 'admin'];
    const isStandaloneScreen = standaloneScreens.includes(segments[0] || '');

    if (!isAuthenticated && !inAuthGroup && !inAdminAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && !inTabsGroup && !inAdminTabsGroup && !inAuthGroup && !inAdminAuthGroup && !isStandaloneScreen) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, authLoaded, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(admin-auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(admin-tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

function ReduxProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <ReduxProvider>
      <RootLayoutNav />
    </ReduxProvider>
  );
}
