import React, { useState, useEffect, useRef } from 'react';
import { Platform, LogBox } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AnimatedSplash from '../src/components/AnimatedSplash';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import { psychicEvents } from '../src/services/psychicEvents';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.29.227:8000';
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

// Suppress Expo Go SDK 53 remote push warning logged via console.error by expo-notifications
if (Platform.OS !== 'web') {
  try {
    LogBox.ignoreLogs([
      'expo-notifications: Android Push notifications',
      'removed from Expo Go',
      'not fully supported in Expo Go',
    ]);
  } catch {}
  const _origError = console.error;
  console.error = (...args: any[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (
      msg.includes('expo-notifications: Android Push notifications') ||
      msg.includes('removed from Expo Go') ||
      msg.includes('not fully supported in Expo Go')
    ) {
      return;
    }
    _origError(...args);
  };
}

// Logo image - using require for local asset
const LOGO_IMAGE = require('../assets/icon.png');

let Notifications: any = null;
if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
  } catch (e) {
    console.log('expo-notifications not available');
  }
}

// 1. Foreground handler - MODULE SCOPE, before any component
if (Notifications && Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {}
}

// 2. Android channel - MODULE SCOPE, before any component
if (Notifications && Platform.OS === 'android') {
  try {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6B4EAA',
    });
    Notifications.setNotificationChannelAsync('high_importance_channel', {
      name: 'High Importance Notifications',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6B4EAA',
    });
  } catch {}
}

function RootLayoutContent() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const router = useRouter();
  const guestIdRef = useRef(`guest_${Math.random().toString(36).slice(2, 10)}`);

  // Global real-time WebSocket connection for instant advisor online/offline status updates
  useEffect(() => {
    const wsUserId = user?.id || guestIdRef.current;
    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;
    let isMounted = true;

    const connectWs = () => {
      if (!isMounted) return;
      try {
        ws = new WebSocket(`${WS_URL}/api/ws/${encodeURIComponent(wsUserId)}`);
        ws.onopen = () => {
          console.log('🔌 Client global WebSocket connected for real-time status');
        };
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'psychic_status_changed') {
              console.log('📡 Real-time psychic status change received in Client App:', msg);
              psychicEvents.emit(msg);
            }
          } catch (e) {}
        };
        ws.onclose = () => {
          if (isMounted) {
            reconnectTimer = setTimeout(connectWs, 3000);
          }
        };
        ws.onerror = () => {};
      } catch (e) {}
    };

    connectWs();

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        ws?.close();
      } catch {}
    };
  }, [user?.id]);

  useEffect(() => {
    if (Platform.OS === 'web' || !Notifications) return;

    // 3. Warm tap - user taps notification while app is open
    const tapSub = Notifications.addNotificationResponseReceivedListener(
      (response: any) => {
        const data = response.notification.request.content.data || {};
        const url = data.deeplink || data.action_url;
        if (!url) return;
        if (typeof url === 'string') {
          url.startsWith('http') ? Linking.openURL(url) : router.push(url as any);
        }
      }
    );

    // 4. Cold-start tap - user tapped notification while app was killed
    Notifications.getLastNotificationResponseAsync().then((response: any) => {
      if (!response) return;
      const data = response.notification.request.content.data || {};
      const url = data.deeplink || data.action_url;
      if (url && typeof url === 'string') {
        url.startsWith('http') ? Linking.openURL(url) : router.push(url as any);
      }
    });

    // Cleanup
    return () => {
      tapSub?.remove();
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
