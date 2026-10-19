import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth, registerPushToken } from '../src/context/AuthContext';
import { apiClient } from '../src/services/api';
import { notifiedPaymentSessions } from './(tabs)/wallet';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, refreshUser } = useAuth();
  const params = useLocalSearchParams();
  
  const [isLoading, setIsLoading] = useState(true);
  const [success, setSuccess] = useState(true);
  const [creditsAdded, setCreditsAdded] = useState(0);
  const [totalWalletBalance, setTotalWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    const handlePaymentResult = async () => {
      const isExplicitlyCancelled = params.cancelled === 'true' || params.canceled === 'true';
      if (isExplicitlyCancelled) {
        setSuccess(false);
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      let finalCredits = params.credits ? parseInt(params.credits as string) : 0;
      if (finalCredits > 0) setCreditsAdded(finalCredits);

      const sessionId = (params.session_id as string) || '';
      const activeUserId = user?.id || (params.user_id as string) || 'usr_client_1792000155236';
      registerPushToken(activeUserId);

      let finalBalance: number | null = null;

      // Direct verify with Stripe via backend if sessionId is present
      if (sessionId) {
        try {
          const res = await apiClient.post('/api/payments/verify-checkout-session', {
            session_id: sessionId,
            user_id: activeUserId,
            credits: finalCredits || 25,
          }).catch(() => null);
          if (res && (res.credits_added || res.credits)) {
            finalCredits = res.credits_added || res.credits;
            setCreditsAdded(finalCredits);
          }
          if (res && typeof res.balance === 'number') {
            finalBalance = res.balance;
            setTotalWalletBalance(res.balance);
          }
        } catch (e) {
          console.log('Session verification in success screen:', e);
        }
      }

      try {
        if (typeof refreshUser === 'function') {
          await refreshUser();
        }
        setTimeout(() => {
          try {
            refreshUser?.();
          } catch {}
        }, 1500);
      } catch (error) {
        console.error('Error refreshing user:', error);
      }

      // Show push notification banner if not already triggered for this session
      const dedupKey = sessionId || `local_success_${Date.now()}`;
      if (!notifiedPaymentSessions.has(dedupKey) && Platform.OS !== 'web') {
        notifiedPaymentSessions.add(dedupKey);
        try {
          const NotifModule = require('expo-notifications');
          if (NotifModule && typeof NotifModule.scheduleNotificationAsync === 'function') {
            try {
              const perm = await NotifModule.getPermissionsAsync();
              if (perm.status !== 'granted') {
                await NotifModule.requestPermissionsAsync();
              }
            } catch {}
            const balStr = finalBalance !== null ? `$${finalBalance.toFixed(2)}` : `$${(user?.balance || 0).toFixed(2)}`;
            await NotifModule.scheduleNotificationAsync({
              content: {
                title: '🎉 Funds Added to Wallet!',
                body: finalCredits > 0
                  ? `+${finalCredits} credits added! Your wallet balance is now ${balStr}.`
                  : `Your payment was verified! Wallet balance: ${balStr}.`,
                sound: 'default',
                priority: NotifModule.AndroidNotificationPriority?.MAX || 'max',
                data: { type: 'wallet_credited', action_url: '/(tabs)/wallet' },
              },
              trigger: null,
            });
          }
        } catch (notifErr) {
          console.log('PaymentSuccessScreen notification notice:', notifErr);
        }
      }

      setIsLoading(false);
    };

    handlePaymentResult();
  }, [params]);

  const handleContinue = () => {
    try {
      refreshUser?.();
    } catch {}

    try {
      router.replace('/(tabs)/wallet');
    } catch {
      try {
        router.push('/(tabs)/wallet');
      } catch {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)/home');
        }
      }
    }
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

  const displayedBalance = totalWalletBalance !== null ? totalWalletBalance : (user?.balance || 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.content}>
        {success ? (
          <>
            {/* Success Icon */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.iconGradient}
              >
                <Ionicons name="checkmark" size={64} color="#FFF" />
              </LinearGradient>
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {creditsAdded > 0 ? `+${creditsAdded} Credits Added!` : 'Payment Successful!'}
            </Text>
            
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Your payment has been verified and your credits have been added to your wallet.
            </Text>

            {/* Total Wallet Balance Card */}
            <View style={[styles.balanceCard, { backgroundColor: colors.backgroundCard || '#1C1635', borderColor: 'rgba(168, 85, 247, 0.25)' }]}>
              <View style={styles.balanceHeader}>
                <Ionicons name="wallet-outline" size={20} color={colors.primary || '#A855F7'} />
                <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
                  Total Wallet Balance
                </Text>
              </View>
              <Text style={[styles.balanceAmount, { color: colors.textPrimary }]}>
                ${displayedBalance.toFixed(2)}
              </Text>
              <Text style={[styles.balanceSubtext, { color: colors.primary || '#A855F7' }]}>
                {Math.round(displayedBalance)} Available Credits
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.button} 
              activeOpacity={0.8} 
              onPress={handleContinue}
            >
              <LinearGradient
                colors={[colors.primary || '#8B5CF6', colors.primaryDark || '#6B46C1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
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
                <Ionicons name="close" size={64} color="#FFF" />
              </View>
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Payment Cancelled
            </Text>
            
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Your payment was cancelled. No charges were made to your account.
            </Text>

            <TouchableOpacity 
              style={styles.button} 
              activeOpacity={0.8} 
              onPress={handleContinue}
            >
              <LinearGradient
                colors={[colors.primary || '#8B5CF6', colors.primaryDark || '#6B46C1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
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
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconGradient: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  balanceCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  balanceSubtext: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  button: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
