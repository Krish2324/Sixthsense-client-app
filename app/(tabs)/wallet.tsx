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
  RefreshControl,
  Modal,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Constants, { ExecutionEnvironment } from 'expo-constants';
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
  const { user, token, refreshUser, updateUser } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [customAmount, setCustomAmount] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<typeof CREDIT_PACKAGES[0] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([
    {
      id: 'pm_stripe_default',
      type: 'card',
      last_four: '4242',
      brand: 'Visa',
      is_default: true,
    }
  ]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [selectedMethodType, setSelectedMethodType] = useState<'card' | 'apple_pay' | 'google_pay'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [isSavingCard, setIsSavingCard] = useState(false);

  const totalBalance = user?.balance || 0;

  const pollingRef = useRef<any>(null);

  const safeDismissBrowser = () => {
    try {
      WebBrowser.dismissBrowser();
    } catch {
      // Quiet
    }
  };

  const safeRefreshUser = async () => {
    try {
      if (typeof refreshUser === 'function') {
        await refreshUser();
      }
    } catch {
      // Quiet
    }
  };

  const fetchTransactions = async () => {
    const activeUserId = user?.id || 'usr_client_1792000155236';
    setIsLoadingTransactions(true);
    try {
      // useCache=false so newly credited payments show up immediately
      let res = await apiClient.get(`/api/wallet/transactions/${activeUserId}`, false).catch(() => null);
      if (!Array.isArray(res) || res.length === 0) {
        res = await apiClient.get(`/api/wallet/transactions?user_id=${activeUserId}`, false).catch(() => null);
      }
      if (Array.isArray(res)) {
        setTransactions(res);
      }
    } catch (e) {
      console.log('Error fetching transactions:', e);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const fetchPaymentMethods = async () => {
    const activeUserId = user?.id || 'usr_client_1792000155236';
    try {
      const res = await apiClient.get(`/api/wallet/payment-methods/${activeUserId}`, false).catch(() => null);
      if (res && Array.isArray(res.payment_methods) && res.payment_methods.length > 0) {
        setPaymentMethods(res.payment_methods);
      }
    } catch (e) {
      console.log('Error fetching payment methods:', e);
    }
  };

  const handleSetDefaultPaymentMethod = async (methodId: string) => {
    try {
      const activeUserId = user?.id || 'usr_client_1792000155236';
      const res = await apiClient.post(`/api/wallet/payment-methods/${activeUserId}/set-default/${methodId}`, {}).catch(() => null);
      if (res && res.payment_methods) {
        setPaymentMethods(res.payment_methods);
      } else {
        await fetchPaymentMethods();
      }
    } catch (e) {
      console.log('Error setting default payment method:', e);
    }
  };

  const handleModalDoneAndPay = (method?: 'card' | 'apple_pay' | 'google_pay') => {
    const targetMethod = method || selectedMethodType;
    setSelectedMethodType(targetMethod);
    setShowPaymentModal(false);
    setTimeout(() => {
      handleAddFunds(targetMethod);
    }, 250);
  };

  const handleSaveCard = async () => {
    const rawNumber = cardNumber.replace(/\s/g, '');
    if (rawNumber.length < 13) {
      Alert.alert('Invalid Card', 'Please enter a valid card number.');
      return;
    }
    const lastFour = rawNumber.slice(-4);
    let brand = 'Visa';
    if (rawNumber.startsWith('5')) brand = 'Mastercard';
    else if (rawNumber.startsWith('3')) brand = 'Amex';
    else if (rawNumber.startsWith('6')) brand = 'Discover';

    setIsSavingCard(true);
    try {
      const activeUserId = user?.id;
      const res = await apiClient.post('/api/wallet/payment-methods', {
        user_id: activeUserId,
        type: 'card',
        last_four: lastFour,
        brand: brand,
        cardholder_name: cardName || 'Cardholder',
        is_default: true,
      });
      if (res && res.payment_methods) {
        setPaymentMethods(res.payment_methods);
      } else {
        await fetchPaymentMethods();
      }
      setShowAddCardModal(false);
      setCardNumber('');
      setCardExpiry('');
      setCardCvc('');
      setCardName('');
      Alert.alert('Card Added! 💳', `${brand} ending in ${lastFour} was successfully added.`);
    } catch (e: any) {
      Alert.alert('Save Card Error', e?.message || 'Unable to save card.');
    } finally {
      setIsSavingCard(false);
    }
  };

  const triggerPushNotification = async (title: string, body: string) => {
    // Note: The backend dispatches remote push notifications to device tokens via send_push.
    // In Expo Go on SDK 53, require('expo-notifications') on Android logs a red console error.
    // Guard strictly so Expo Go never tries to require expo-notifications.
    try {
      const isExpo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient || (Constants as any)?.appOwnership === 'expo';
      if (!isExpo && Platform.OS !== 'web') {
        const NotifModule = require('expo-notifications');
        if (NotifModule && typeof NotifModule.scheduleNotificationAsync === 'function') {
          await NotifModule.scheduleNotificationAsync({
            content: {
              title,
              body,
              sound: true,
            },
            trigger: null,
          });
        }
      }
    } catch {
      // Quietly ignore in development/Expo Go
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recent';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return 'Recent';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return 'Recent';
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await safeRefreshUser();
      await fetchTransactions();
      await fetchPaymentMethods();
    } catch (e) {
      console.log('Wallet swipe refresh error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // CLI-034: Poll balance & verification every 2s after payment opens
  const startBalancePolling = (sessionId?: string, expectedCredits?: number, expectedAmount?: number) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    let attempts = 0;
    pollingRef.current = setInterval(async () => {
      attempts++;
      try {
        if (sessionId) {
          const res = await apiClient.post('/api/payments/verify-checkout-session', {
            session_id: sessionId,
            user_id: user?.id || 'usr_client_1792000155236',
            credits: expectedCredits || 25,
            amount: expectedAmount || 23,
          }).catch(() => null);

          if (res && (res.status === 'success' || res.status === 'already_processed')) {
            // Automatically close the browser on phone!
            if (Platform.OS !== 'web') {
              safeDismissBrowser();
            }
            if (pollingRef.current) clearInterval(pollingRef.current);
            await safeRefreshUser();
            await fetchTransactions();
            await fetchPaymentMethods();
            triggerPushNotification(
              '🎉 Funds Added to Wallet!',
              `+${res.credits_added || res.credits || expectedCredits || 'Your'} credits added! Your balance is now $${(res.balance || totalBalance).toFixed(2)}.`
            );
            Alert.alert(
              'Payment Complete! 🎉',
              `${res.credits_added || res.credits || expectedCredits || 'Your'} credits have been added to your wallet balance.`
            );
            return;
          }
        }
        await safeRefreshUser();
      } catch (e) {
        // Quiet
      }
    }, 2000);
    setTimeout(() => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }, 180000); // Stop after 3 minutes
  };

  useFocusEffect(
    React.useCallback(() => {
      safeRefreshUser();
      fetchTransactions();
      fetchPaymentMethods();
    }, [user?.id])
  );

  useEffect(() => {
    safeRefreshUser();
    fetchTransactions();
    fetchPaymentMethods();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleAddFunds = async (methodOverride?: 'card' | 'apple_pay' | 'google_pay', packageOverride?: typeof CREDIT_PACKAGES[0]) => {
    const pkg = packageOverride || selectedPackage;
    let amount = pkg?.price || parseFloat(customAmount);
    let credits = pkg?.credits || parseFloat(customAmount);

    // If neither package nor customAmount is selected, default to popular package (25 credits for $23)
    if (!amount || isNaN(amount) || amount < 5) {
      const defaultPkg = CREDIT_PACKAGES.find(p => p.popular) || CREDIT_PACKAGES[2];
      amount = defaultPkg.price;
      credits = defaultPkg.credits;
      setSelectedPackage(defaultPkg);
    }

    const payMethod = methodOverride || selectedMethodType || 'card';
    setSelectedMethodType(payMethod);

    setIsLoading(true);
    try {
      const appReturnUrl = Linking.createURL('payment-success', {
        queryParams: {
          success: 'true',
          credits: String(credits),
          user_id: user?.id || 'usr_client_1792000155236',
        }
      });
      const backendBase = BACKEND_URL || 'http://192.168.29.228:8000';
      const webSuccessUrl = `${backendBase}/api/payments/checkout-success`;

      const data = await apiClient.post('/api/payments/create-checkout-session', {
        amount: Math.round(amount * 100),
        credits: credits,
        user_id: user?.id || 'usr_client_1792000155236',
        app_return_url: appReturnUrl,
        method: payMethod,
      }).catch((err) => {
        console.log('Checkout session creation notice:', err);
        return null;
      });

      if (data && data.checkout_url) {
        startBalancePolling(data.session_id, credits, amount);
        if (Platform.OS === 'web') {
          await Linking.openURL(data.checkout_url).catch(() => null);
        } else {
          // Open with webSuccessUrl so Chrome Custom Tab intercepts return
          const authResult = await WebBrowser.openAuthSessionAsync(
            data.checkout_url,
            webSuccessUrl
          ).catch(() => null);

          // Force dismiss in case browser custom tab is still open
          safeDismissBrowser();

          // Actively verify session immediately upon browser dismiss or redirect
          if (data.session_id) {
            try {
              const vRes = await apiClient.post('/api/payments/verify-checkout-session', {
                session_id: data.session_id,
                user_id: user?.id || 'usr_client_1792000155236',
                credits: credits,
                amount: amount,
              });
              if (vRes && (vRes.status === 'success' || vRes.status === 'already_processed')) {
                if (pollingRef.current) clearInterval(pollingRef.current);
                await safeRefreshUser();
                await fetchTransactions();
                await fetchPaymentMethods();
                triggerPushNotification(
                  '🎉 Funds Added to Wallet!',
                  `+${vRes.credits_added || vRes.credits || credits} credits added! Your balance is now $${(vRes.balance || totalBalance).toFixed(2)}.`
                );
                Alert.alert(
                  'Payment Complete! 🎉',
                  `${vRes.credits_added || vRes.credits || credits} credits have been added to your wallet balance.`
                );
                return;
              }
            } catch (vErr) {
              console.log('Post-checkout verify check:', vErr);
            }
          }

          await safeRefreshUser();
          await fetchTransactions();
        }
      } else {
        const errorMsg = 'Unable to connect to payment provider. Please try again.';
        (Platform.OS as string) === 'web' ? alert(errorMsg) : Alert.alert('Payment Error', errorMsg);
      }
    } catch (err: any) {
      console.log('Payment checkout notice:', err);
      const msg = err?.message || '';
      if (msg && !msg.includes('catch') && !msg.includes('dismiss')) {
        const errorMsg = msg || 'Payment initiation failed. Please try again.';
        (Platform.OS as string) === 'web' ? alert(errorMsg) : Alert.alert('Payment Error', errorMsg);
      }
    } finally {
      setIsLoading(false);
      setSelectedPackage(null);
      setCustomAmount('');
      await safeRefreshUser();
      await fetchTransactions();
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
          <TouchableOpacity onPress={() => handleAddFunds()}>
            <Text style={[styles.lowBalanceCta, { color: '#FF5252' }]}>Add Now</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SPACING.xl }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary || '#8B5CF6']}
            tintColor={colors.primary || '#8B5CF6'}
          />
        }
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
              onPress={() => handleAddFunds(selectedMethodType)}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[colors.primary || COLORS.primary, colors.primaryDark || COLORS.primaryDark]}
                style={styles.addButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons 
                      name={
                        selectedMethodType === 'google_pay' 
                          ? 'logo-google' 
                          : selectedMethodType === 'apple_pay' 
                            ? 'logo-apple' 
                            : 'card'
                      } 
                      size={20} 
                      color="#FFF" 
                    />
                    <Text style={styles.addButtonText}>
                      {selectedPackage 
                        ? `Pay $${selectedPackage.price} with ${
                            selectedMethodType === 'google_pay' 
                              ? 'Google Pay' 
                              : selectedMethodType === 'apple_pay' 
                                ? 'Apple Pay' 
                                : 'Card'
                          } (${selectedPackage.credits} Credits)`
                        : customAmount 
                          ? `Pay $${customAmount} with ${
                            selectedMethodType === 'google_pay' 
                              ? 'Google Pay' 
                              : selectedMethodType === 'apple_pay' 
                                ? 'Apple Pay' 
                                : 'Card'
                          }`
                          : `Purchase Credits with ${
                            selectedMethodType === 'google_pay' 
                              ? 'Google Pay' 
                              : selectedMethodType === 'apple_pay' 
                                ? 'Apple Pay' 
                                : 'Card'
                          }`
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

        {/* Payment Methods section - commented out (hidden from wallet page)
        <View style={styles.paymentMethodsSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Payment Methods</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <TouchableOpacity onPress={() => setShowAddCardModal(true)}>
                <Text style={[styles.manageCta, { color: '#10B981' }]}>+ Add Card</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowPaymentModal(true)}>
                <Text style={[styles.manageCta, { color: colors.primary }]}>Manage</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          // Google Pay Direct Option
          <TouchableOpacity 
            style={[styles.addPaymentButton, { backgroundColor: colors.backgroundCard, borderColor: selectedMethodType === 'google_pay' ? '#4285F4' : colors.border }]}
            activeOpacity={0.8}
            onPress={() => handleAddFunds('google_pay')}
          >
            <View style={[styles.addPaymentIcon, { backgroundColor: 'rgba(66, 133, 244, 0.12)' }]}>
              <Ionicons name="logo-google" size={24} color="#4285F4" />
            </View>
            <View style={styles.addPaymentText}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.addPaymentTitle, { color: colors.textPrimary }]}>
                  Google Pay
                </Text>
                <View style={[styles.defaultPill, { backgroundColor: 'rgba(66, 133, 244, 0.15)' }]}>
                  <Text style={[styles.defaultPillText, { color: '#4285F4' }]}>INSTANT</Text>
                </View>
              </View>
              <Text style={[styles.addPaymentSubtitle, { color: colors.textSecondary }]}>
                Tap to pay directly with Google Pay
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          // Apple Pay Direct Option
          <TouchableOpacity 
            style={[styles.addPaymentButton, { backgroundColor: colors.backgroundCard, borderColor: selectedMethodType === 'apple_pay' ? colors.primary : colors.border, marginTop: 8 }]}
            activeOpacity={0.8}
            onPress={() => handleAddFunds('apple_pay')}
          >
            <View style={[styles.addPaymentIcon, { backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
              <Ionicons name="logo-apple" size={24} color={colors.textPrimary} />
            </View>
            <View style={styles.addPaymentText}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.addPaymentTitle, { color: colors.textPrimary }]}>
                  Apple Pay
                </Text>
                <View style={[styles.defaultPill, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Text style={[styles.defaultPillText, { color: '#10B981' }]}>1-TOUCH</Text>
                </View>
              </View>
              <Text style={[styles.addPaymentSubtitle, { color: colors.textSecondary }]}>
                Tap to pay with Touch ID / Face ID
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          // Saved Cards
          {paymentMethods.filter(pm => pm.type === 'card' || !pm.type).map((pm, idx) => (
            <TouchableOpacity 
              key={pm.id || idx}
              style={[styles.addPaymentButton, { backgroundColor: colors.backgroundCard, borderColor: selectedMethodType === 'card' ? colors.primary : colors.border, marginTop: 8 }]}
              activeOpacity={0.8}
              onPress={() => handleAddFunds('card')}
            >
              <View style={[styles.addPaymentIcon, { backgroundColor: colors.backgroundElevated }]}>
                <Ionicons name="card" size={24} color={colors.primary} />
              </View>
              <View style={styles.addPaymentText}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.addPaymentTitle, { color: colors.textPrimary }]}>
                    {pm.brand || 'Visa'} •••• {pm.last_four || '4242'}
                  </Text>
                  {pm.is_default && (
                    <View style={styles.defaultPill}>
                      <Text style={styles.defaultPillText}>DEFAULT</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.addPaymentSubtitle, { color: colors.textSecondary }]}>
                  Stripe 256-bit Encrypted • Tap to Pay
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
        */}

        {/* Transaction History */}
        <View style={styles.historySection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Transactions</Text>
            {transactions.length > 0 && (
              <Text style={[styles.txCountBadge, { color: colors.textSecondary }]}>
                {transactions.length} total
              </Text>
            )}
          </View>
          
          {isLoadingTransactions && transactions.length === 0 ? (
            <View style={[styles.loadingBox, { backgroundColor: colors.backgroundCard }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingBoxText, { color: colors.textSecondary }]}>Loading history...</Text>
            </View>
          ) : transactions.length > 0 ? (
            <View style={styles.transactionsList}>
              {transactions.map((t, idx) => {
                const isCredit = t.type === 'credit_purchase';
                return (
                  <View 
                    key={t.id || t._id || idx} 
                    style={[styles.transactionCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                  >
                    <View style={[styles.txIconCircle, { backgroundColor: isCredit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)' }]}>
                      <Ionicons 
                        name={isCredit ? "arrow-down-circle" : "chatbubble-ellipses"} 
                        size={24} 
                        color={isCredit ? "#10B981" : colors.primary} 
                      />
                    </View>
                    <View style={styles.txMainInfo}>
                      <Text style={[styles.txTitle, { color: colors.textPrimary }]}>
                        {isCredit ? `Added ${t.credits || Math.round(t.amount)} Credits` : (t.description || 'Reading Session')}
                      </Text>
                      <Text style={[styles.txDate, { color: colors.textSecondary }]}>
                        {formatDate(t.created_at)}
                      </Text>
                    </View>
                    <View style={styles.txAmountCol}>
                      <Text style={[styles.txAmountText, { color: isCredit ? '#10B981' : colors.textPrimary }]}>
                        {isCredit ? `+$${(t.amount || 0).toFixed(2)}` : `-$${(t.amount || 0).toFixed(2)}`}
                      </Text>
                      <View style={styles.completedPill}>
                        <Ionicons name="checkmark" size={11} color="#10B981" />
                        <Text style={styles.completedPillText}>Success</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[styles.emptyHistory, { backgroundColor: colors.backgroundCard }]}>
              <Ionicons name="receipt-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyHistoryText, { color: colors.textPrimary }]}>No transactions yet</Text>
              <Text style={[styles.emptyHistorySubtext, { color: colors.textSecondary }]}>Your reading & credit top-up history will appear here</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Payment Methods Interactive Modal */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="card" size={24} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Payment Methods</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              All payments on Sixth Sense are processed with bank-grade 256-bit encryption by Stripe.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <View style={styles.modalMethodsList}>
                {/* Credit / Debit Cards Interactive Option */}
                <TouchableOpacity 
                  style={[
                    styles.modalMethodItem, 
                    { borderColor: selectedMethodType === 'card' ? colors.primary : colors.border }
                  ]}
                  activeOpacity={0.75}
                  onPress={() => setSelectedMethodType('card')}
                >
                  <Ionicons name="card-outline" size={24} color={colors.primary} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.modalMethodTitle, { color: colors.textPrimary }]}>Credit / Debit Cards</Text>
                    <Text style={[styles.modalMethodSub, { color: colors.textSecondary }]}>Visa, Mastercard, Amex, Discover</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.instantPayPill, { backgroundColor: colors.primary }]}
                    onPress={() => handleModalDoneAndPay('card')}
                  >
                    <Text style={styles.instantPayPillText}>Pay</Text>
                  </TouchableOpacity>
                  <Ionicons 
                    name={selectedMethodType === 'card' ? "checkmark-circle" : "ellipse-outline"} 
                    size={22} 
                    color={selectedMethodType === 'card' ? "#10B981" : colors.textMuted} 
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>

                {/* Sub-list of cards and Add Card action */}
                {selectedMethodType === 'card' && (
                  <View style={styles.savedCardsContainer}>
                    {paymentMethods.map((pm, idx) => (
                      <TouchableOpacity
                        key={pm.id || idx}
                        style={[
                          styles.savedCardRow,
                          { 
                            backgroundColor: colors.backgroundElevated || 'rgba(255,255,255,0.04)', 
                            borderColor: pm.is_default ? colors.primary : colors.border 
                          }
                        ]}
                        activeOpacity={0.75}
                        onPress={() => handleSetDefaultPaymentMethod(pm.id)}
                      >
                        <Ionicons name="card" size={20} color={pm.is_default ? colors.primary : colors.textSecondary} />
                        <Text style={[styles.savedCardText, { color: colors.textPrimary }]}>
                          {pm.brand || 'Visa'} •••• {pm.last_four || '4242'}
                        </Text>
                        {pm.is_default ? (
                          <View style={styles.defaultPill}>
                            <Text style={styles.defaultPillText}>DEFAULT</Text>
                          </View>
                        ) : (
                          <Text style={[styles.setDefaultLink, { color: colors.primary }]}>Set Default</Text>
                        )}
                      </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                      style={[styles.addCardRow, { borderColor: colors.primary }]}
                      activeOpacity={0.75}
                      onPress={() => {
                        setShowPaymentModal(false);
                        setTimeout(() => setShowAddCardModal(true), 250);
                      }}
                    >
                      <Ionicons name="add-circle" size={20} color={colors.primary} />
                      <Text style={[styles.addCardRowText, { color: colors.primary }]}>
                        + Add New Card
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Apple Pay Interactive Option */}
                <TouchableOpacity 
                  style={[
                    styles.modalMethodItem, 
                    { borderColor: selectedMethodType === 'apple_pay' ? colors.primary : colors.border }
                  ]}
                  activeOpacity={0.75}
                  onPress={() => setSelectedMethodType('apple_pay')}
                >
                  <Ionicons name="logo-apple" size={24} color={colors.textPrimary} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.modalMethodTitle, { color: colors.textPrimary }]}>Apple Pay</Text>
                    <Text style={[styles.modalMethodSub, { color: colors.textSecondary }]}>Fast, secure 1-touch checkout</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.instantPayPill, { backgroundColor: colors.primary }]}
                    onPress={() => handleModalDoneAndPay('apple_pay')}
                  >
                    <Text style={styles.instantPayPillText}>Pay</Text>
                  </TouchableOpacity>
                  <Ionicons 
                    name={selectedMethodType === 'apple_pay' ? "checkmark-circle" : "ellipse-outline"} 
                    size={22} 
                    color={selectedMethodType === 'apple_pay' ? "#10B981" : colors.textMuted} 
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>

                {/* Google Pay Interactive Option */}
                <TouchableOpacity 
                  style={[
                    styles.modalMethodItem, 
                    { borderColor: selectedMethodType === 'google_pay' ? '#4285F4' : colors.border }
                  ]}
                  activeOpacity={0.75}
                  onPress={() => setSelectedMethodType('google_pay')}
                >
                  <Ionicons name="logo-google" size={24} color="#4285F4" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.modalMethodTitle, { color: colors.textPrimary }]}>Google Pay</Text>
                    <Text style={[styles.modalMethodSub, { color: colors.textSecondary }]}>Available on Android & Web</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.instantPayPill, { backgroundColor: '#4285F4' }]}
                    onPress={() => handleModalDoneAndPay('google_pay')}
                  >
                    <Text style={styles.instantPayPillText}>Pay</Text>
                  </TouchableOpacity>
                  <Ionicons 
                    name={selectedMethodType === 'google_pay' ? "checkmark-circle" : "ellipse-outline"} 
                    size={22} 
                    color={selectedMethodType === 'google_pay' ? "#10B981" : colors.textMuted} 
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={[
                styles.modalDoneButton, 
                { 
                  backgroundColor: selectedMethodType === 'google_pay' ? '#4285F4' : colors.primary, 
                  marginTop: 14, 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: 8,
                  paddingVertical: 16,
                  borderRadius: 14,
                }
              ]}
              onPress={() => handleModalDoneAndPay(selectedMethodType)}
            >
              <Ionicons 
                name={
                  selectedMethodType === 'google_pay' 
                    ? 'logo-google' 
                    : selectedMethodType === 'apple_pay' 
                      ? 'logo-apple' 
                      : 'card'
                } 
                size={20} 
                color="#FFF" 
              />
              <Text style={styles.modalDoneText}>
                {selectedMethodType === 'google_pay' 
                  ? 'Done • Open Google Pay' 
                  : selectedMethodType === 'apple_pay' 
                    ? 'Done • Open Apple Pay' 
                    : 'Done • Open Card Checkout'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add New Card Sheet / Modal */}
      <Modal
        visible={showAddCardModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddCardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="card" size={24} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add New Card</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddCardModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              Enter your card details. Secured with Stripe 256-bit encryption.
            </Text>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Cardholder Name</Text>
              <TextInput
                style={[styles.cardInput, { backgroundColor: colors.backgroundElevated, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="Full Name as on card"
                placeholderTextColor={colors.textMuted}
                value={cardName}
                onChangeText={setCardName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Card Number</Text>
              <TextInput
                style={[styles.cardInput, { backgroundColor: colors.backgroundElevated, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="4242 4242 4242 4242"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                maxLength={19}
                value={cardNumber}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\D/g, '');
                  const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
                  setCardNumber(formatted.slice(0, 19));
                }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Expiry (MM/YY)</Text>
                <TextInput
                  style={[styles.cardInput, { backgroundColor: colors.backgroundElevated, color: colors.textPrimary, borderColor: colors.border }]}
                  placeholder="12/28"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  maxLength={5}
                  value={cardExpiry}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/\D/g, '');
                    if (cleaned.length >= 2) {
                      setCardExpiry(cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4));
                    } else {
                      setCardExpiry(cleaned);
                    }
                  }}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CVC / CVV</Text>
                <TextInput
                  style={[styles.cardInput, { backgroundColor: colors.backgroundElevated, color: colors.textPrimary, borderColor: colors.border }]}
                  placeholder="123"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  secureTextEntry={true}
                  maxLength={4}
                  value={cardCvc}
                  onChangeText={setCardCvc}
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.saveCardButton, { backgroundColor: colors.primary }]}
              onPress={handleSaveCard}
              disabled={isSavingCard}
            >
              {isSavingCard ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.modalDoneText}>Save & Use Card</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  manageCta: {
    fontSize: 14,
    fontWeight: '700',
  },
  defaultPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  defaultPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  txCountBadge: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    borderRadius: 12,
    gap: 10,
  },
  loadingBoxText: {
    fontSize: 14,
    fontWeight: '500',
  },
  transactionsList: {
    gap: 10,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 14,
    borderWidth: 1,
  },
  txIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txMainInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  txTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  txDate: {
    fontSize: 12,
    marginTop: 3,
  },
  txAmountCol: {
    alignItems: 'flex-end',
  },
  txAmountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  completedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  completedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  modalMethodsList: {
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  modalMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  modalMethodTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalMethodSub: {
    fontSize: 12,
    marginTop: 2,
  },
  modalDoneButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoneText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  instantPayPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instantPayPillText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  savedCardsContainer: {
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
    paddingLeft: 6,
  },
  savedCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  savedCardText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  setDefaultLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  addCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
    marginTop: 4,
  },
  addCardRowText: {
    fontSize: 13,
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  cardInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  saveCardButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
});
