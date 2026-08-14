import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { saveAuthData, getAuthData, clearAuthData } from '../services/secureStorage';
import { registerUnauthorizedHandler } from '../services/api';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // CLI-018: 15-min inactivity auto-logout

// Log for debugging
console.log('AuthContext BACKEND_URL:', BACKEND_URL);

// Register push token with backend
async function registerPushToken(userId: string) {
  if (Platform.OS === 'web') return;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const tokenResp = await Notifications.getDevicePushTokenAsync();
    await fetch(`${BACKEND_URL}/api/push/register-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        platform: Platform.OS,
        device_token: tokenResp.data,
      }),
    });
    console.log('Push token registered successfully');
  } catch (error) {
    console.error('Failed to register push token:', error);
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
  psychic_id?: string;
  is_psychic?: boolean;
  birth_date?: string;
  zodiac_sign?: string;
  profile_picture?: string;
  balance: number;
  free_credits: number;
  status: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, birthDate?: string) => Promise<void>;
  socialLogin: (accessToken: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  resetInactivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const inactivityTimerRef = useRef<any>(null);

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
      if (storedToken) setToken(storedToken);
      if (storedUser) setUser(storedUser);
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();
      const accessToken = data.access_token;
      await saveAuthData(accessToken, data.user);
      setToken(accessToken);
      setUser(data.user);
      resetInactivityTimer();
      if (data.user?.id) {
        registerPushToken(data.user.id);
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, birthDate?: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, birth_date: birthDate }),
      });

      // Get response text first to handle non-JSON responses
      const responseText = await response.text();
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        // Response is not JSON - likely a server/proxy error
        console.error('Non-JSON response:', responseText);
        throw new Error('Server error. Please check your internet connection and try again.');
      }

      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      await saveAuthData(data.access_token, data.user);
      setToken(data.access_token);
      setUser(data.user);
    } catch (error) {
      throw error;
    }
  };

  // Social login (Google/Apple) - token and user data already provided from auth flow
  const socialLogin = async (accessToken: string, userData: User) => {
    try {
      await saveAuthData(accessToken, userData);
      setToken(accessToken);
      setUser(userData);
      resetInactivityTimer();
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
    if (!token) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/me?token=${token}`);
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        await saveAuthData(token, userData);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (!user) return;
    try {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser as User);
      if (token) await saveAuthData(token, updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, socialLogin, logout, refreshUser, updateUser, resetInactivityTimer }}>
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
