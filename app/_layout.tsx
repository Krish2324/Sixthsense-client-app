import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AnimatedSplash from '../src/components/AnimatedSplash';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';

// Logo image - using require for local asset
const LOGO_IMAGE = require('../assets/icon.png');

// 1. Foreground handler - MODULE SCOPE, before any component
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// 2. Android channel - MODULE SCOPE, before any component
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6B4EAA',
  });
}

function RootLayoutContent() {
  const { colors, isDark } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    // 3. Warm tap - user taps notification while app is open
    const tapSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data || {};
        const url = data.deeplink || data.action_url;
        if (!url) return;
        if (typeof url === 'string') {
          url.startsWith('http') ? Linking.openURL(url) : router.push(url as any);
        }
      }
    );

    // 4. Cold-start tap - user tapped notification while app was killed
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data || {};
      const url = data.deeplink || data.action_url;
      if (url && typeof url === 'string') {
        url.startsWith('http') ? Linking.openURL(url) : router.push(url as any);
      }
    });

    // Cleanup
    return () => {
      tapSub.remove();
    };
  }, [router]);
  
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {showSplash && (
        <AnimatedSplash
          onFinish={() => setShowSplash(false)}
          appName="Sixth Sense"
          tagline="Your Spiritual Journey Starts Here"
          logoSource={LOGO_IMAGE}
          gradientColors={['#1A1A2E', '#16213E', '#0F3460']}
        />
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
          animationDuration: 300,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="psychic/[id]" options={{ headerShown: false, presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="order-recorded-video" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootLayoutContent />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
