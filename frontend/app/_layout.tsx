import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import '../utils/i18n';

function RootLayoutNav() {
  const { isAuthenticated, isLoading, needsOnboarding } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inDetailsGroup = segments[0] === 'details';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && needsOnboarding && (segments.length < 2 || segments[1] !== 'onboarding')) {
      router.replace('/(auth)/onboarding');
    } else if (isAuthenticated && !needsOnboarding && !inTabsGroup && !inDetailsGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, needsOnboarding, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="details" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  );
}
