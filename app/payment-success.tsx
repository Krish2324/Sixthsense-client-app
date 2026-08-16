import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { refreshUser } = useAuth();
  const params = useLocalSearchParams();
  
  const [isLoading, setIsLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [creditsAdded, setCreditsAdded] = useState(0);

  useEffect(() => {
    const handlePaymentResult = async () => {
      if (params.success === 'true') {
        setSuccess(true);
        // CLI-042: Immediately refresh balance on payment-success mount
        try {
          await refreshUser();
          // Poll once more after 3 seconds to catch webhook delay
          setTimeout(() => refreshUser().catch(() => {}), 3000);
        } catch (error) {
          console.error('Error refreshing user:', error);
        }
      } else if (params.cancelled === 'true') {
        setSuccess(false);
      }
      setIsLoading(false);
    };

    handlePaymentResult();
  }, [params]);

  const handleContinue = () => {
    router.replace('/(tabs)/wallet');
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Processing payment...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.content}>
        {success ? (
          <>
            {/* Success Icon */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#4CAF50', '#2E7D32']}
                style={styles.iconGradient}
              >
                <Ionicons name="checkmark" size={60} color="#FFF" />
              </LinearGradient>
            </View>

            {/* CLI-038: Festive Bonus Celebration Badge */}
            <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, borderWidth: 1, borderColor: '#F59E0B' }}>
              <Ionicons name="sparkles" size={18} color="#D97706" />
              <Text style={{ color: '#92400E', fontWeight: '700', fontSize: 14 }}>🎉 Free Bonus Reading Minutes Unlocked!</Text>
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Payment Successful!
            </Text>
            
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Your credits have been added to your wallet. You can now start connecting with psychics!
            </Text>

            <TouchableOpacity style={styles.button} onPress={handleContinue}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark || '#6B46C1']}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Go to Wallet</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Cancelled Icon */}
            <View style={styles.iconContainer}>
              <View style={[styles.iconCircle, { backgroundColor: '#FF5252' }]}>
                <Ionicons name="close" size={60} color="#FFF" />
              </View>
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Payment Cancelled
            </Text>
            
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Your payment was cancelled. No charges were made to your account.
            </Text>

            <TouchableOpacity style={styles.button} onPress={handleContinue}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark || '#6B46C1']}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Back to Wallet</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
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
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  button: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
