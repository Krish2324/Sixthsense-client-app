import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { COLORS, SPACING, SHADOWS } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { apiClient } from '../../src/services/api';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const WEBSITE_URL = 'https://www.sixthsensepsychics.com';

// Show payments on all platforms - this is for real services (psychic consultations), not digital goods
// Apple's 30% fee only applies to digital content/subscriptions, not service marketplaces
const showPayments = true;

// Credit packages with pricing (1 credit = $1)
const CREDIT_PACKAGES = [
  { credits: 5, price: 5, originalPrice: 5, discount: 0 },
  { credits: 10, price: 10, originalPrice: 10, discount: 0 },
  { credits: 25, price: 23, originalPrice: 25, discount: 8, popular: true },
  { credits: 50, price: 45, originalPrice: 50, discount: 10 },
  { credits: 100, price: 90, originalPrice: 100, discount: 10, bestDeal: true },
];

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, refreshUser } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [customAmount, setCustomAmount] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<typeof CREDIT_PACKAGES[0] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const totalBalance = user?.balance || 0;

  const pollingRef = useRef<any>(null);

  // CLI-034: Poll balance every 10s after payment opens
  const startBalancePolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      await refreshUser();
    }, 10000);
    setTimeout(() => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }, 120000); // Stop after 2 minutes
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleAddFunds = async () => {
    const amount = selectedPackage?.price || parseFloat(customAmount);
    const credits = selectedPackage?.credits || parseFloat(customAmount);

    // CLI-031: Enforce $5 minimum with inline validation
    if (!amount || isNaN(amount) || amount < 5) {
      Alert.alert('Minimum Amount', 'Please select a package or enter at least $5 to continue.');
      return;
    }

    setIsLoading(true);
    try {
      // CLI-036/CLI-032: Use apiClient with Bearer auth
      const data = await apiClient.post('/api/payments/create-checkout-session', {
        amount: amount * 100, // Stripe uses cents
        credits: credits,
        user_id: user?.id,
        success_url: `sixthsensepsychics://payment-success?success=true`,
        cancel_url: `sixthsensepsychics://payment-success?cancelled=true`,
      });

      // CLI-032: Use WebBrowser.openAuthSessionAsync for Stripe 3DS support
      if (data.checkout_url) {
        if (Platform.OS === 'web') {
          await Linking.openURL(data.checkout_url);
        } else {
          const result = await WebBrowser.openAuthSessionAsync(
            data.checkout_url,
            'sixthsensepsychics://payment-success'
          );
          // CLI-033: Refresh balance after session closes
          if (result.type === 'success') {
            await refreshUser();
          }
        }
        // CLI-034: Start 10s polling for balance update
        startBalancePolling();
        Alert.alert(
          'Payment Started',
          'Complete your payment in the browser. Credits will be added after successful payment.',
          [{ text: 'OK', onPress: () => { setSelectedPackage(null); setCustomAmount(''); } }]
        );
      }
    } catch (error: any) {
      Alert.alert('Payment Error', error.message || 'Failed to process payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // CLI-035: Low-balance warning (< $5)
  const showLowBalanceWarning = totalBalance > 0 && totalBalance < 5;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* CLI-035: Low Balance Warning Banner */}
      {showLowBalanceWarning && (
        <View style={[styles.lowBalanceBanner, { backgroundColor: '#FF5252' + '22', borderColor: '#FF5252' }]}>
          <Ionicons name="warning" size={18} color="#FF5252" />
          <Text style={[styles.lowBalanceText, { color: '#FF5252' }]}>
            Low balance! Add credits to continue your readings.
          </Text>
          <TouchableOpacity onPress={handleAddFunds}>
            <Text style={[styles.lowBalanceCta, { color: '#FF5252' }]}>Add Now</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SPACING.xl }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Wallet</Text>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <LinearGradient
            colors={[colors.primaryDark || COLORS.primaryDark, colors.primary || COLORS.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceGradient}
          >
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Text style={styles.balanceAmount}>${totalBalance.toFixed(2)}</Text>
            
            <View style={styles.balanceBreakdown}>
              <View style={styles.breakdownItem}>
                <Ionicons name="wallet" size={18} color="rgba(255,255,255,0.8)" />
                <Text style={styles.breakdownLabel}>Wallet Balance</Text>
                <Text style={styles.breakdownValue}>${(user?.balance || 0).toFixed(2)}</Text>
              </View>
              {user?.is_new_user && !user?.first_reading_free_used && (
                <>
                  <View style={styles.dividerVertical} />
                  <View style={styles.breakdownItem}>
                    <Ionicons name="time" size={18} color="#E8A0B8" />
                    <Text style={styles.breakdownLabel}>New User Bonus</Text>
                    <Text style={[styles.breakdownValue, { color: '#E8A0B8' }]}>
                      4 min FREE
                    </Text>
                  </View>
                </>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Buy Credits Section - Show on Web & Android, hide on iOS */}
        {showPayments ? (
          /* FULL PAYMENT UI FOR WEBSITE & ANDROID */
          <View style={styles.addFundsSection}>
            {/* Show Free Minutes Banner for NEW USERS */}
            {!user?.first_reading_free_used && (
              <View style={[styles.freeMinutesBanner, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
                <Ionicons name="gift" size={28} color={colors.primary} />
                <View style={styles.freeMinutesContent}>
                  <Text style={[styles.freeMinutesTitle, { color: colors.primary }]}>
                    🎁 4 FREE Minutes!
                  </Text>
                  <Text style={[styles.freeMinutesSubtext, { color: colors.textSecondary }]}>
                    Your first reading includes 4 free minutes with any psychic!
                  </Text>
                </View>
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Buy Credits</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Select a package to add credits to your wallet
            </Text>
            
            {/* Credit Packages */}
            <View style={styles.packagesContainer}>
              {CREDIT_PACKAGES.map((pkg) => (
                <TouchableOpacity
                  key={pkg.credits}
                  style={[
                    styles.packageCard,
                    { 
                      backgroundColor: colors.backgroundCard,
                      borderColor: selectedPackage?.credits === pkg.credits ? colors.primary : colors.border,
                    },
                    selectedPackage?.credits === pkg.credits && { backgroundColor: colors.primary + '15' },
                    pkg.popular && styles.packageCardPopular,
                  ]}
                  onPress={() => {
                    setSelectedPackage(pkg);
                    setCustomAmount('');
                  }}
                >
                  {pkg.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>BEST VALUE</Text>
                    </View>
                  )}
                  
                  <View style={styles.creditsContainer}>
                    <Ionicons 
                      name="diamond" 
                      size={24} 
                      color={selectedPackage?.credits === pkg.credits ? colors.primary : colors.textSecondary} 
                    />
                    <Text style={[
                      styles.creditsAmount,
                      { color: selectedPackage?.credits === pkg.credits ? colors.primary : colors.textPrimary }
                    ]}>
                      {pkg.credits}
                    </Text>
                    <Text style={[styles.creditsLabel, { color: colors.textSecondary }]}>credits</Text>
                  </View>
                  
                  <View style={styles.priceContainer}>
                    {pkg.discount > 0 ? (
                      <>
                        <Text style={[styles.originalPrice, { color: colors.textMuted }]}>
                          ${pkg.originalPrice}
                        </Text>
                        <Text style={[styles.discountedPrice, { color: colors.primary }]}>
                          ${pkg.price}
                        </Text>
                      </>
                    ) : (
                      <Text style={[styles.normalPrice, { color: colors.textPrimary }]}>
                        ${pkg.price}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Amount */}
            <View style={[styles.customAmountContainer, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <Text style={[styles.dollarSign, { color: colors.textMuted }]}>$</Text>
              <TextInput
                style={[styles.customAmountInput, { color: colors.textPrimary }]}
                placeholder="Or enter custom amount"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={customAmount}
                onChangeText={(text) => {
                  setCustomAmount(text);
                  setSelectedPackage(null);
                }}
              />
            </View>

            {/* Purchase Summary */}
            {(selectedPackage || customAmount) && (
              <View style={[styles.summaryCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Credits</Text>
                  <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                    {selectedPackage?.credits || customAmount}
                  </Text>
                </View>
                {(selectedPackage?.discount ?? 0) > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: '#4CAF50' }]}>Discount</Text>
                    <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                      -${(selectedPackage?.originalPrice ?? 0) - (selectedPackage?.price ?? 0)}
                    </Text>
                  </View>
                )}
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabelTotal, { color: colors.textPrimary }]}>Total</Text>
                  <Text style={[styles.summaryValueTotal, { color: colors.primary }]}>
                    ${selectedPackage?.price || customAmount}
                  </Text>
                </View>
              </View>
            )}

            {/* Add Funds Button */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddFunds}
              disabled={isLoading || (!selectedPackage && !customAmount)}
            >
              <LinearGradient
                colors={
                  (!selectedPackage && !customAmount) 
                    ? ['#999', '#777'] 
                    : [colors.primary || COLORS.primary, colors.primaryDark || COLORS.primaryDark]
                }
                style={styles.addButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="card" size={20} color="#FFF" />
                    <Text style={styles.addButtonText}>
                      {selectedPackage 
                        ? `Purchase ${selectedPackage.credits} Credits for $${selectedPackage.price}`
                        : customAmount 
                          ? `Purchase $${customAmount} Credits`
                          : 'Select a Package'
                      }
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={[styles.noteText, { color: colors.textMuted }]}>
              🔒 Payments are securely processed. Credits never expire.
            </Text>
          </View>
        ) : (
          /* iOS APP - Show message based on user's balance and free minutes status */
          <View style={styles.addFundsSection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Credits</Text>
            
            {/* Check if user has used free minutes or has low balance */}
            {user?.first_reading_free_used || (user?.balance || 0) > 0 ? (
              /* User has used free minutes - direct to website */
              <View style={[styles.freeMinutesBox, { backgroundColor: colors.backgroundCard, borderColor: colors.primary }]}>
                <Ionicons name="card-outline" size={40} color={colors.primary} />
                <Text style={[styles.freeMinutesTitle, { color: colors.textPrimary }]}>
                  Need More Credits?
                </Text>
                <Text style={[styles.freeMinutesText, { color: colors.textSecondary }]}>
                  Visit our website to add credits to your account. Your credits will sync automatically!
                </Text>
                <TouchableOpacity 
                  style={[styles.exploreButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    // Open website in Safari/external browser
                    Linking.openURL(WEBSITE_URL);
                  }}
                >
                  <Text style={styles.exploreButtonText}>Open Website</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Linking.openURL(WEBSITE_URL)}>
                  <Text style={[styles.websiteUrl, { color: colors.primary }]}>
                    www.sixthsensepsychics.com
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* New user - show free minutes message */
              <View style={[styles.freeMinutesBox, { backgroundColor: colors.backgroundCard, borderColor: colors.primary }]}>
                <Ionicons name="gift-outline" size={40} color={colors.primary} />
                <Text style={[styles.freeMinutesTitle, { color: colors.textPrimary }]}>
                  Enjoy Your Free Minutes!
                </Text>
                <Text style={[styles.freeMinutesText, { color: colors.textSecondary }]}>
                  As a new user, you get 4 free minutes on your first reading with any psychic. Start connecting now!
                </Text>
                <TouchableOpacity 
                  style={[styles.exploreButton, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/(tabs)/home')}
                >
                  <Text style={styles.exploreButtonText}>Explore Psychics</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Payment Methods */}
        <View style={styles.paymentMethodsSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Payment Methods</Text>
          
          <TouchableOpacity 
            style={[styles.addPaymentButton, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
            onPress={() => {
              Alert.alert(
                'Payment Methods',
                'When you purchase credits, you can pay with:\n\n• Credit/Debit Card\n• Apple Pay\n• Google Pay\n\nYour payment info is securely processed by Stripe.',
                [{ text: 'Got it', style: 'default' }]
              );
            }}
          >
            <View style={[styles.addPaymentIcon, { backgroundColor: colors.backgroundElevated }]}>
              <Ionicons name="card" size={24} color={colors.primary} />
            </View>
            <View style={styles.addPaymentText}>
              <Text style={[styles.addPaymentTitle, { color: colors.textPrimary }]}>Secure Checkout</Text>
              <Text style={[styles.addPaymentSubtitle, { color: colors.textSecondary }]}>Card, Apple Pay, or Google Pay</Text>
            </View>
            <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        {/* Transaction History */}
        <View style={styles.historySection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Transactions</Text>
          
          <View style={[styles.emptyHistory, { backgroundColor: colors.backgroundCard }]}>
            <Ionicons name="receipt-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyHistoryText, { color: colors.textPrimary }]}>No transactions yet</Text>
            <Text style={[styles.emptyHistorySubtext, { color: colors.textSecondary }]}>Your reading history will appear here</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  balanceCard: {
    marginHorizontal: SPACING.md,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    ...SHADOWS.large,
  },
  balanceGradient: {
    padding: SPACING.lg,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFF',
    marginVertical: SPACING.sm,
  },
  balanceBreakdown: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  dividerVertical: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: SPACING.md,
  },
  addFundsSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  packagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  packageCard: {
    width: '48%',
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 2,
    alignItems: 'center',
    position: 'relative',
    minHeight: 140,
  },
  packageCardPopular: {
    borderColor: '#9C27B0',
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#9C27B0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  discountBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  creditsContainer: {
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  creditsAmount: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
  },
  creditsLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  priceContainer: {
    alignItems: 'center',
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  discountedPrice: {
    fontSize: 20,
    fontWeight: '800',
  },
  normalPrice: {
    fontSize: 20,
    fontWeight: '700',
  },
  customAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    height: 56,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  dollarSign: {
    fontSize: 20,
    fontWeight: '600',
    marginRight: SPACING.sm,
  },
  customAmountInput: {
    flex: 1,
    fontSize: 18,
  },
  summaryCard: {
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    marginVertical: SPACING.sm,
  },
  summaryLabelTotal: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryValueTotal: {
    fontSize: 20,
    fontWeight: '800',
  },
  addButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  noteText: {
    fontSize: 12,
    textAlign: 'center',
  },
  paymentMethodsSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: SPACING.md,
    borderWidth: 1,
  },
  addPaymentIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPaymentText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  addPaymentTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  addPaymentSubtitle: {
    fontSize: 13,
  },
  historySection: {
    paddingHorizontal: SPACING.md,
  },
  emptyHistory: {
    alignItems: 'center',
    borderRadius: 14,
    padding: SPACING.xl,
  },
  emptyHistoryText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: SPACING.md,
  },
  emptyHistorySubtext: {
    fontSize: 13,
    marginTop: 4,
  },
  freeMinutesBox: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: 16,
    borderWidth: 2,
    marginTop: SPACING.md,
  },
  freeMinutesTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  freeMinutesText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  exploreButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    borderRadius: 25,
    marginTop: SPACING.lg,
  },
  exploreButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  websiteUrl: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  freeMinutesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  freeMinutesContent: {
    flex: 1,
  },
  freeMinutesSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  lowBalanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  lowBalanceText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  lowBalanceCta: {
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
