import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { Platform, Alert } from 'react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

// Apple Sign-In is only available on iOS
const APPLE_ENABLED = Platform.OS === 'ios';

WebBrowser.maybeCompleteAuthSession();

interface SocialAuthResult {
  success: boolean;
  user?: any;
  token?: string;
  error?: string;
}

export function useSocialAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Sign-In
  const signInWithGoogle = async (): Promise<SocialAuthResult> => {
    if (!GOOGLE_CLIENT_ID) {
      const msg = 'Google Sign-In is not configured. Please add GOOGLE_CLIENT_ID to environment.';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Not Available', 'Google Sign-In is coming soon!');
      }
      return { success: false, error: msg };
    }

    setIsLoading(true);
    setError(null);

    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'sixthsensepsychics',
        path: 'auth/google/callback',
      });

      const discovery = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
      };

      const clientId = Platform.select({
        ios: GOOGLE_IOS_CLIENT_ID || GOOGLE_CLIENT_ID,
        android: GOOGLE_ANDROID_CLIENT_ID || GOOGLE_CLIENT_ID,
        default: GOOGLE_CLIENT_ID,
      });

      const request = new AuthSession.AuthRequest({
        clientId: clientId!,
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
      });

      const result = await request.promptAsync(discovery);

      if (result.type === 'success' && result.params.code) {
        // Exchange code for tokens via backend
        const response = await fetch(`${BACKEND_URL}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: result.params.code,
            redirect_uri: redirectUri,
          }),
        });

        const data = await response.json();

        if (data.success) {
          return {
            success: true,
            user: data.user,
            token: data.token,
          };
        } else {
          throw new Error(data.detail || 'Google sign-in failed');
        }
      } else if (result.type === 'cancel') {
        return { success: false, error: 'Sign-in cancelled' };
      } else {
        throw new Error('Google sign-in failed');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Google sign-in failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  // Apple Sign-In
  const signInWithApple = async (): Promise<SocialAuthResult> => {
    if (!APPLE_ENABLED) {
      const msg = 'Apple Sign-In is only available on iOS devices.';
      Alert.alert('Not Available', msg);
      return { success: false, error: msg };
    }

    setIsLoading(true);
    setError(null);

    try {
      // Import Apple auth dynamically since it's iOS only
      const AppleAuthentication = require('@invertase/react-native-apple-authentication');
      const { appleAuth } = AppleAuthentication;

      // Generate nonce
      const rawNonce = Crypto.getRandomBytes(32).toString();
      const nonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      // Perform Apple sign-in
      const appleAuthResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
        nonce,
      });

      // Verify credentials
      const credentialState = await appleAuth.getCredentialStateForUser(
        appleAuthResponse.user
      );

      if (credentialState === appleAuth.State.AUTHORIZED) {
        // Send to backend
        const response = await fetch(`${BACKEND_URL}/api/auth/apple`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identity_token: appleAuthResponse.identityToken,
            user_id: appleAuthResponse.user,
            email: appleAuthResponse.email,
            full_name: appleAuthResponse.fullName,
            nonce: rawNonce,
          }),
        });

        const data = await response.json();

        if (data.success) {
          return {
            success: true,
            user: data.user,
            token: data.token,
          };
        } else {
          throw new Error(data.detail || 'Apple sign-in failed');
        }
      } else {
        throw new Error('Apple credentials not authorized');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Apple sign-in failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    signInWithGoogle,
    signInWithApple,
    isLoading,
    error,
    googleEnabled: !!GOOGLE_CLIENT_ID,
    appleEnabled: APPLE_ENABLED,
  };
}
