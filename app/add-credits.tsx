import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';
import { apiClient } from '../src/services/api';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const CREDIT_PACKAGES = [
  { credits: 10, price: 10, originalPrice: 10, discount: 0 },
  { credits: 25, price: 25, originalPrice: 25, discount: 0 },
  { credits: 50, price: 45, originalPrice: 50, discount: 10, popular: true },
  { credits: 100, price: 92, originalPrice: 100, discount: 8 },
];

export default function AddCreditsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, refreshUser } = useAuth();
  
  const [selectedPackage, setSelectedPackage] = useState(CREDIT_PACKAGES[2]); // Default to popular
  const [isProcessing, setIsProcessing] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState(false);

  useEffect(() => {
    checkPaymentConfig();
  }, []);

  const checkPaymentConfig = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payments/config`);
      const data = await response.json();
      setStripeEnabled(data.stripe_enabled);
    } catch (error) {
      console.error('Error checking payment config:', error);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to purchase credits.');
      return;
    }

    setIsProcessing(true);

    // CLI-037: Retry with exponential backoff (up to 3 retries)
    const maxRetries = 3;
    let lastError: any = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const intentData = await apiClient.post('/api/payments/create-payment-intent', {
          amount: selectedPackage.price,
          user_id: user.id,
          package_credits: selectedPackage.credits,
          description: `Purchase ${selectedPackage.credits} credits`,
        });

        if (intentData.mock) {
          const confirmData = await apiClient.post('/api/payments/confirm-payment', {
            user_id: user.id,
            amount: selectedPackage.price,
            credits: selectedPackage.credits,
            payment_intent_id: intentData.payment_intent_id,
          });

          if (confirmData.success) {
            await refreshUser?.();
            const msg = `Successfully added ${selectedPackage.credits} credits!\n\nNew Balance: $${confirmData.new_balance.toFixed(2)}`;
            if (Platform.OS === 'web') {
              alert(msg);
            } else {
              Alert.alert('Payment Successful', msg);
            }
            router.back();
          }
        } else {
          Alert.alert(
            'Stripe Integration',
            'Real Stripe payment processing would happen here. Please configure STRIPE_SECRET_KEY in backend.'
          );
        }
        lastError = null;
        break;
      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, attempt * 1000)); // Exponential backoff
        }
      }
    }

    if (lastError) {
      const errorMsg = lastError.message || 'Payment failed. Please try again.';
      if (Platform.OS === 'web') {
        alert(errorMsg);
      } else {
        Alert.alert('Payment Error', errorMsg);
      }
    }
    setIsProcessing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Add Credits</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Balance */}
        <LinearGradient
          colors={[colors.primaryDark || '#4A3578', colors.primary || '#6B4EAA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>${(user?.balance || 0).toFixed(2)}</Text>
        </LinearGradient>

        {/* Payment Status */}
        {!stripeEnabled && (
          <View style={[styles.warningBanner, { backgroundColor: colors.warning + '20' }]}>
            <Ionicons name="information-circle" size={20} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.warning }]}>
              Demo Mode: Payments are simulated. Configure Stripe for real payments.
            </Text>
          </View>
        )}

        {/* Credit Packages */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Select Package</Text>
        
        <View style={styles.packagesGrid}>
          {CREDIT_PACKAGES.map((pkg) => (
            <TouchableOpacity
              key={pkg.credits}
              style={[
                styles.packageCard,
                { 
                  backgroundColor: colors.backgroundCard,
                  borderColor: selectedPackage.credits === pkg.credits ? colors.primary : colors.border,
                  borderWidth: selectedPackage.credits === pkg.credits ? 2 : 1,
                },
              ]}
              onPress={() => setSelectedPackage(pkg)}
            >
              {pkg.popular && (
                <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.popularText}>BEST VALUE</Text>
                </View>
              )}
              
              {pkg.discount > 0 && (
                <View style={[styles.discountBadge, { backgroundColor: colors.success }]}>
                  <Text style={styles.discountText}>SAVE ${pkg.originalPrice - pkg.price}</Text>
                </View>
              )}

              <Ionicons 
                name="diamond" 
                size={32} 
                color={selectedPackage.credits === pkg.credits ? colors.primary : colors.textSecondary} 
              />
              <Text style={[styles.creditsAmount, { color: colors.textPrimary }]}>
                {pkg.credits}
              </Text>
              <Text style={[styles.creditsLabel, { color: colors.textSecondary }]}>credits</Text>
              
              <View style={styles.priceContainer}>
                {pkg.discount > 0 && (
                  <Text style={[styles.originalPrice, { color: colors.textMuted }]}>
                    ${pkg.originalPrice}
                  </Text>
                )}
                <Text style={[styles.price, { color: colors.primary }]}>${pkg.price}</Text>
              </View>

              {selectedPackage.credits === pkg.credits && (
                <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]}>
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Purchase Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              {selectedPackage.credits} Credits
            </Text>
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
              ${selectedPackage.originalPrice}.00
            </Text>
          </View>
          
          {selectedPackage.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.success }]}>Discount</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                -${selectedPackage.originalPrice - selectedPackage.price}.00
              </Text>
            </View>
          )}
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
          <View style={styles.summaryRow}>
            <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              ${selectedPackage.price}.00
            </Text>
          </View>
        </View>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark" size={16} color={colors.success} />
          <Text style={[styles.securityText, { color: colors.textMuted }]}>
            Secure payment processing. Your data is encrypted.
          </Text>
        </View>
      </ScrollView>

      {/* Purchase Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
        <TouchableOpacity
          style={[styles.purchaseButton, { backgroundColor: colors.primary }]}
          onPress={handlePurchase}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="card" size={20} color="#FFF" />
              <Text style={styles.purchaseButtonText}>
                Pay ${selectedPackage.price}.00
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  balanceCard: {
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: SPACING.xs,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFF',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  packagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  packageCard: {
    width: '47%',
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  popularText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  creditsAmount: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  creditsLabel: {
    fontSize: 12,
    marginBottom: SPACING.sm,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: SPACING.sm,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  securityText: {
    fontSize: 12,
  },
  footer: {
    padding: SPACING.md,
    paddingTop: 0,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: 14,
    gap: SPACING.sm,
  },
  purchaseButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
