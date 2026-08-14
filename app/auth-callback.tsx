import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../src/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

/**
 * Auth Callback Screen
 * 
 * This screen handles the OAuth redirect from Google Sign-In (Emergent Auth).
 * It extracts the session_id from the URL hash and exchanges it for user data.
 * 
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const { socialLogin } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Get session_id from URL hash (e.g., #session_id=abc123)
      let sessionId: string | null = null;
      
      if (typeof window !== 'undefined') {
        const hash = window.location.hash;
        const match = hash.match(/session_id=([^&]+)/);
        sessionId = match ? match[1] : null;
      }

      if (!sessionId) {
        setError('No session ID received from Google');
        setTimeout(() => router.replace('/(auth)/login'), 3000);
        return;
      }

      // Exchange session_id for user data
      const response = await fetch(`${BACKEND_URL}/api/auth/google/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to verify Google session');
      }

      const data = await response.json();

      // Save auth data and redirect to home
      await socialLogin(data.access_token, data.user);
      
      // Clear the hash from URL and redirect
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
      }
      
      router.replace('/(tabs)/home');
    } catch (err: any) {
      console.error('Auth callback error:', err);
      setError(err.message || 'Authentication failed');
      setTimeout(() => router.replace('/(auth)/login'), 3000);
    }
  };

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <View style={styles.content}>
        {error ? (
          <>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.subText}>Redirecting to login...</Text>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color="#9B7BD4" />
            <Text style={styles.loadingText}>Completing sign in...</Text>
            <Text style={styles.subText}>Please wait while we verify your account</Text>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
