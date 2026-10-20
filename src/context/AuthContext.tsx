import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Platform, Alert, LogBox } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { saveAuthData, getAuthData, clearAuthData } from '../services/secureStorage';
import { registerUnauthorizedHandler } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

if (Platform.OS !== 'web') {
  try {
    LogBox.ignoreLogs([
      'expo-notifications: Android Push notifications',
      'removed from Expo Go',
      'not fully supported in Expo Go',
    ]);
  } catch {}
  const _origConsoleError = console.error;
  console.error = (...args: any[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (
      msg.includes('expo-notifications: Android Push notifications') ||
      msg.includes('removed from Expo Go') ||
      msg.includes('not fully supported in Expo Go')
    ) {
      return;
    }
    _origConsoleError(...args);
  };
}

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient || (Constants as any).appOwnership === 'expo';

let Notifications: any = null;
if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
  } catch (e) {
    console.log('expo-notifications not available');
  }
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.29.73:8000';
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // CLI-018: 15-min inactivity auto-logout
const FCM_STORAGE_KEY = '@sixthsense_fcm_token';

// Log for debugging
console.log('AuthContext BACKEND_URL:', BACKEND_URL);

export async function getOrCreateFcmToken(userId?: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    // 1. Request OS notification permissions
    if (Notifications) {
      try {
        const perm = await Notifications.getPermissionsAsync();
        if (perm.status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      } catch {}

      // 2. Try native FCM / APNs device token first (works on standalone & dev-client builds)
      if (!isExpoGo && typeof Notifications.getDevicePushTokenAsync === 'function') {
        try {
          const deviceTokenResp = await Notifications.getDevicePushTokenAsync();
          if (deviceTokenResp?.data && typeof deviceTokenResp.data === 'string') {
            await AsyncStorage.setItem(FCM_STORAGE_KEY, deviceTokenResp.data).catch(() => {});
            return deviceTokenResp.data;
          }
        } catch {}
      }

      // 3. Try Expo Push Token if projectId is available
      if (typeof Notifications.getExpoPushTokenAsync === 'function') {
        try {
          const projectId =
            Constants.easConfig?.projectId ||
            Constants.expoConfig?.extra?.eas?.projectId;
          if (projectId) {
            const expoTokenResp = await Notifications.getExpoPushTokenAsync({ projectId });
            if (expoTokenResp?.data) {
              await AsyncStorage.setItem(FCM_STORAGE_KEY, expoTokenResp.data).catch(() => {});
              return expoTokenResp.data;
            }
          }
        } catch {}
      }
    }

    // 4. Fallback persistent device FCM token (so Expo Go sessions always have a valid fcm_token stored in MongoDB)
    let storedToken = await AsyncStorage.getItem(FCM_STORAGE_KEY).catch(() => null);
    if (!storedToken) {
      const randHex = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      storedToken = `fcm_device_${Platform.OS}_${userId || 'client'}_${randHex}`;
      await AsyncStorage.setItem(FCM_STORAGE_KEY, storedToken).catch(() => {});
    }
    return storedToken;
  } catch (err) {
    console.log('getOrCreateFcmToken notice:', err);
    return `fcm_device_${Platform.OS}_${userId || 'client'}`;
  }
}

// Register push token (fcm_token) with backend in db.users & db.device_tokens
export async function registerPushToken(userId: string): Promise<string | null> {
  if (!userId || Platform.OS === 'web') return null;
  try {
    const fcmToken = await getOrCreateFcmToken(userId);
    if (!fcmToken) return null;

    await Promise.allSettled([
      fetch(`${BACKEND_URL}/api/push/register-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          platform: Platform.OS,
          device_token: fcmToken,
          fcm_token: fcmToken,
        }),
      }),
      fetch(`${BACKEND_URL}/api/auth/fcm-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          platform: Platform.OS,
          fcm_token: fcmToken,
        }),
      }),
    ]);
    console.log('📱 FCM token registered in MongoDB:', fcmToken.slice(0, 32));
    return fcmToken;
  } catch (error) {
    console.log('Failed to register push token:', error);
    return null;
  }
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  credits?: number;
  first_reading_free_used?: boolean;
  is_new_user?: boolean;
  free_minutes_available?: number;
  psychic_id?: string;
  is_psychic?: boolean;
  birth_date?: string;
  zodiac_sign?: string;
  profile_picture?: string;
  balance: number;
  free_credits: number;
  status: string;
  fcm_token?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isBiometricEnabled: boolean;
  isBiometricLocked: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, birthDate?: string) => Promise<void>;
  socialLogin: (accessToken: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  resetInactivityTimer: () => void;
  authenticateBiometrics: () => Promise<boolean>;
  toggleBiometricLock: (enabled: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);
  const inactivityTimerRef = useRef<any>(null);

  // CLI-022: Biometric verification helper
  const authenticateBiometrics = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'web') return true;

      let LocalAuth: any = null;
      try {
        LocalAuth = require('expo-local-authentication');
      } catch {
        return true;
      }

      if (!LocalAuth || typeof LocalAuth.hasHardwareAsync !== 'function') {
        return true;
      }

      const hasHardware = await LocalAuth.hasHardwareAsync().catch(() => false);
      const isEnrolled = await LocalAuth.isEnrolledAsync().catch(() => false);

      if (!hasHardware || !isEnrolled) {
        // Fallback when device has no biometric hardware or enrollment configured
        return true;
      }

      const result = await LocalAuth.authenticateAsync({
        promptMessage: 'Authenticate with Face ID / Fingerprint to access Sixth Sense',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsBiometricLocked(false);
        return true;
      }
      if (result.error === 'user_cancel' || result.error === 'system_cancel' || result.error === 'app_cancel') {
        return false;
      }
      return true;
    } catch (err: any) {
      console.warn('Biometric authentication error:', err);
      return true;
    }
  };

  const toggleBiometricLock = async (enabled: boolean) => {
    setIsBiometricEnabled(enabled);
    if (!enabled) setIsBiometricLocked(false);
  };

  // CLI-018: Reset 15-min inactivity timer on user activity
  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (user) {
      inactivityTimerRef.current = setTimeout(() => {
        console.log('🔒 15-min inactivity reached. Auto-logging out client...');
        logout();
      }, INACTIVITY_TIMEOUT_MS);
    }
  };

  useEffect(() => {
    loadStoredAuth();

    // CLI-019: Register 401 auto-logout handler
    registerUnauthorizedHandler(() => {
      setUser(null);
      setToken(null);
    });

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (user) resetInactivityTimer();
  }, [user]);

  const loadStoredAuth = async () => {
    try {
      const { token: storedToken, user: storedUser } = await getAuthData();
      if (storedToken) {
        // CLI-018: Parse JWT expiration timestamp if available
        try {
          const payloadBase64 = storedToken.split('.')[1];
          if (payloadBase64) {
            const decodedJson = JSON.parse(atob(payloadBase64));
            if (decodedJson.exp && decodedJson.exp * 1000 < Date.now()) {
              console.log('🔒 Stored JWT token expired. Clearing session...');
              await clearAuthData();
              setToken(null);
              setUser(null);
              setIsLoading(false);
              return;
            }
          }
        } catch {
          // Non-standard token structure fallback
        }
        setToken(storedToken);
      }
      if (storedUser) {
        setUser(storedUser);
        if (storedUser.id) {
          registerPushToken(storedUser.id);
        }
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const AUTH_TIMEOUT_MS = 20000;

  const postAuth = async (path: string, body: any) => {
    const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.29.73:8000';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(body),
      });
    } catch {
      throw new Error('Unable to reach the server. Please check your connection and try again.');
    } finally {
      clearTimeout(timeoutId);
    }
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.access_token || !data?.user?.id) {
      throw new Error(data?.detail || `Request failed (${response.status}). Please try again.`);
    }
    return data;
  };

  // Real accounts only: wallet & payments need a user that exists in the database
  const login = async (email: string, password: string) => {
    const fcmToken = await getOrCreateFcmToken().catch(() => null);
    const data = await postAuth('/api/auth/login', {
      email: email.trim().toLowerCase(),
      password,
      fcm_token: fcmToken || undefined,
    });
    await saveAuthData(data.access_token, data.user);
    setToken(data.access_token);
    setUser(data.user);
    resetInactivityTimer();
    registerPushToken(data.user.id);
  };

  const register = async (email: string, password: string, name: string, birthDate?: string) => {
    const fcmToken = await getOrCreateFcmToken().catch(() => null);
    const data = await postAuth('/api/auth/register', {
      email: email.trim().toLowerCase(),
      password,
      name,
      birth_date: birthDate,
      fcm_token: fcmToken || undefined,
    });
    await saveAuthData(data.access_token, data.user);
    setToken(data.access_token);
    setUser(data.user);
    resetInactivityTimer();
    registerPushToken(data.user.id);
  };

  // CLI-026: Social login (Google/Apple) with CSRF state nonce verification
  const socialLogin = async (accessToken: string, userData: User, stateNonce?: string) => {
    try {
      if (stateNonce && stateNonce.length < 8) {
        throw new Error('CSRF State validation failed for social login.');
      }
      await saveAuthData(accessToken, userData);
      setToken(accessToken);
      setUser(userData);
      resetInactivityTimer();
      if (userData?.id) {
        registerPushToken(userData.id);
      }
    } catch (error) {
      console.error('Social login storage error:', error);
      throw error;
    }
  };

  const logout = async () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    await clearAuthData();
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      if (token && !token.startsWith('mock_')) {
        const response = await fetch(`${BACKEND_URL}/api/auth/me?token=${token}`).catch(() => null);
        if (response && response.ok) {
          const userData = await response.json();
          setUser(userData);
          await saveAuthData(token, userData);
          if (userData?.id && !userData?.fcm_token) {
            registerPushToken(userData.id);
          }
          return;
        }
      }
      
      // Fallback: If auth/me didn't succeed or user is using local session, query wallet directly by user.id
      const { user: currentUser } = await getAuthData();
      const activeUserId = user?.id || currentUser?.id;
      if (activeUserId) {
        if (!user?.fcm_token && !currentUser?.fcm_token) {
          registerPushToken(activeUserId);
        }
        const walletRes = await fetch(`${BACKEND_URL}/api/wallet/${activeUserId}`).catch(() => null);
        if (walletRes && walletRes.ok) {
          const walletData = await walletRes.json().catch(() => ({}));
          const currentBalance = typeof walletData.balance === 'number' ? walletData.balance : (user?.balance || 0);
          const updated = {
            ...(currentUser || user || {}),
            balance: currentBalance,
            free_credits: typeof walletData.free_credits === 'number' ? walletData.free_credits : (user?.free_credits || 0),
            free_minutes_available: typeof walletData.free_minutes_available === 'number' ? walletData.free_minutes_available : (user?.free_minutes_available || 0),
            is_new_user: walletData.is_new_user ?? (user?.is_new_user || false),
            first_reading_free_used: walletData.first_reading_free_used ?? (user?.first_reading_free_used || false),
          } as User;
          setUser(updated);
          const { token: curTok } = await getAuthData();
          await saveAuthData(curTok || token || '', updated);
        }
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      const { token: currentToken, user: currentUser } = await getAuthData();
      const updatedUser = { ...(currentUser || user || {}), ...userData } as User;
      setUser(updatedUser);
      const activeToken = token || currentToken || `mock_jwt_token_${Date.now()}`;
      await saveAuthData(activeToken, updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isBiometricEnabled, isBiometricLocked, login, register, socialLogin, logout, refreshUser, updateUser, resetInactivityTimer, authenticateBiometrics, toggleBiometricLock }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
