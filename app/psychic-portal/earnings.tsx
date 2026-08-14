import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const psychicId = user?.psychic_id || 'psy-demo-001';

  const [totalEarnings, setTotalEarnings] = useState(1250.50);
  const [pendingEarnings, setPendingEarnings] = useState(150.00);
  const [availableBalance, setAvailableBalance] = useState(1100.50);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  const MINIMUM_WITHDRAWAL = 50;

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/psychic-portal/withdrawals/${psychicId}`);
      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data);
      } else {
        // Mock data
        setWithdrawals([
          { id: 'w1', amount: 200, status: 'completed', created_at: '2024-01-15', completed_at: '2024-01-17' },
          { id: 'w2', amount: 150, status: 'processing', created_at: '2024-01-20' },
        ]);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (!amount || amount < MINIMUM_WITHDRAWAL) {
      Alert.alert('Invalid Amount', `Minimum withdrawal is $${MINIMUM_WITHDRAWAL}`);
      return;
    }

    if (amount > availableBalance) {
      Alert.alert('Insufficient Balance', 'You cannot withdraw more than your available balance.');
      return;
    }

    Alert.alert(
      'Confirm Withdrawal',
      `Are you sure you want to withdraw $${amount.toFixed(2)}? Funds will be sent to your connected bank account within 3-5 business days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setIsLoading(true);
            try {
              const response = await fetch(`${BACKEND_URL}/api/psychic-portal/withdraw?psychic_id=${psychicId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  amount: amount,
                  payment_method: 'bank_transfer',
                  payment_details: { account: '****1234' },
                }),
              });

              if (response.ok) {
                Alert.alert('Success!', 'Your withdrawal request has been submitted.');
                setWithdrawAmount('');
                setAvailableBalance(prev => prev - amount);
                fetchWithdrawals();
              } else {
                throw new Error('Failed to submit withdrawal');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to process withdrawal. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return COLORS.online;
      case 'processing': return COLORS.warning;
      case 'pending': return COLORS.textMuted;
      default: return COLORS.textMuted;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Earnings & Withdrawals</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <LinearGradient
            colors={[COLORS.primaryDark, COLORS.primary]}
            style={styles.balanceGradient}
          >
            <Text style={styles.balanceLabel}>Available for Withdrawal</Text>
            <Text style={styles.balanceAmount}>${availableBalance.toFixed(2)}</Text>
            
            <View style={styles.balanceBreakdown}>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Total Earned</Text>
                <Text style={styles.breakdownValue}>${totalEarnings.toFixed(2)}</Text>
              </View>
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Pending</Text>
                <Text style={styles.breakdownValue}>${pendingEarnings.toFixed(2)}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Withdraw Section */}
        <View style={styles.withdrawSection}>
          <Text style={styles.sectionTitle}>Request Withdrawal</Text>
          <Text style={styles.sectionSubtitle}>
            Minimum withdrawal: ${MINIMUM_WITHDRAWAL} • Processing: 3-5 business days
          </Text>

          <View style={styles.amountInputContainer}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />
          </View>

          {/* Quick Amounts */}
          <View style={styles.quickAmounts}>
            {[50, 100, 250, availableBalance].map((amount, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.quickAmount,
                  amount > availableBalance && styles.quickAmountDisabled,
                ]}
                onPress={() => setWithdrawAmount(amount.toString())}
                disabled={amount > availableBalance}
              >
                <Text style={[
                  styles.quickAmountText,
                  amount > availableBalance && styles.quickAmountTextDisabled,
                ]}>
                  {index === 3 ? 'All' : `$${amount}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.withdrawButton,
              (isLoading || !withdrawAmount || parseFloat(withdrawAmount) < MINIMUM_WITHDRAWAL) && 
                styles.withdrawButtonDisabled,
            ]}
            onPress={handleWithdraw}
            disabled={isLoading || !withdrawAmount || parseFloat(withdrawAmount) < MINIMUM_WITHDRAWAL}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.withdrawButtonText}>Request Withdrawal</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Payment Method */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <TouchableOpacity style={styles.paymentCard}>
            <View style={styles.paymentIcon}>
              <Ionicons name="card" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentTitle}>Bank Account</Text>
              <Text style={styles.paymentSubtitle}>•••• •••• •••• 1234</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Withdrawal History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Withdrawal History</Text>
          
          {withdrawals.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="receipt-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No withdrawals yet</Text>
            </View>
          ) : (
            withdrawals.map((withdrawal) => (
              <View key={withdrawal.id} style={styles.historyItem}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyAmount}>${withdrawal.amount.toFixed(2)}</Text>
                  <Text style={styles.historyDate}>{withdrawal.created_at}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(withdrawal.status) + '20' }
                ]}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(withdrawal.status) }
                  ]} />
                  <Text style={[
                    styles.statusText,
                    { color: getStatusColor(withdrawal.status) }
                  ]}>
                    {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  balanceCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
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
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 12,
    padding: SPACING.md,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 2,
  },
  breakdownDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  withdrawSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    height: 64,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  dollarSign: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginRight: SPACING.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  quickAmount: {
    flex: 1,
    backgroundColor: COLORS.backgroundElevated,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  quickAmountDisabled: {
    opacity: 0.4,
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  quickAmountTextDisabled: {
    color: COLORS.textMuted,
  },
  withdrawButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  withdrawButtonDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  withdrawButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  paymentSection: {
    marginBottom: SPACING.lg,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  paymentSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  historySection: {},
  emptyHistory: {
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.xl,
  },
  emptyText: {
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyLeft: {},
  historyAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  historyDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
