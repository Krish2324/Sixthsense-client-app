import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';

export default function Index() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { colors } = useTheme();
  const [checkingPermissions, setCheckingPermissions] = useState(true);

  useEffect(() => {
    const checkPermissionsAndNavigate = async () => {
      try {
        // Check if permissions have been requested before
        const permissionsRequested = await AsyncStorage.getItem('permissions_requested');
        
        if (!isLoading) {
          // On web, show landing page for non-authenticated users
          if (Platform.OS === 'web' && !user) {
            router.replace('/landing');
          } else if (!permissionsRequested) {
            // First time user on mobile - show permissions screen
            router.replace('/permissions');
          } else if (user) {
            router.replace('/(tabs)/home');
          } else {
            router.replace('/(auth)/welcome');
          }
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
        // Fallback to normal flow
        if (!isLoading) {
          if (Platform.OS === 'web' && !user) {
            router.replace('/landing');
          } else if (user) {
            router.replace('/(tabs)/home');
          } else {
            router.replace('/(auth)/welcome');
          }
        }
      } finally {
        setCheckingPermissions(false);
      }
    };

    checkPermissionsAndNavigate();
  }, [isLoading, user]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
