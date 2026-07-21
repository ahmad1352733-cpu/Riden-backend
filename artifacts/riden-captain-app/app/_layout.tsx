import React, { useEffect } from 'react';
import { I18nManager } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// تفعيل RTL مرة واحدة فقط عند بدء التطبيق
if (!I18nManager.isRTL) {
  I18nManager.forceRTL(true);
}
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Redirect, Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { setBaseUrl } from '@workspace/api-client-react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { SplashLoadingScreen } from '@/components/SplashLoadingScreen';
// تسجيل الـ background task عند تحميل التطبيق (يجب أن يكون قبل أي navigator)
import '@/tasks/backgroundTripTask';

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN ?? 'riden-api-production.up.railway.app'}`);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function RootLayoutNav() {
  const { token, user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // تسجيل Push Notifications عند تسجيل الدخول
  usePushNotifications(token);

  useEffect(() => {
    if (isLoading) return;

    const inAuth    = segments[0] === '(auth)';
    const inPending = segments[0] === 'pending';
    const inTabs    = segments[0] === '(tabs)';

    if (!token) {
      if (!inAuth) router.replace('/(auth)/login');
    } else if (token && user?.isApproved === false) {
      if (!inPending) router.replace('/pending');
    } else if (token && user?.isApproved !== false) {
      if (!inTabs) router.replace('/(tabs)');
    }
  }, [token, user?.isApproved, isLoading, segments]);

  if (isLoading) return <SplashLoadingScreen />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)"   options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)"   options={{ headerShown: false }} />
      <Stack.Screen name="pending"  options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return <SplashLoadingScreen />;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <RootLayoutNav />
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
