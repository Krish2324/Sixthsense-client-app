import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../src/constants/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function WithdrawalsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/withdrawals`);
      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data);
      } else {
        // Mock data
        setWithdrawals([
          {
            id: 'w1',
            psychic_name: 'Mystic Luna',
            amount: 250.00,
            payment_method: 'bank_transfer',
            account_ending: '1234',
            created_at: '2024-01-20',
            status: 'pending',
          },
          {
            id: 'w2',
            psychic_name: 'Star Reader Amy',
            amount: 180.00,
            payment_method: 'paypal',
            account_ending: 'amy@email.com',
            created_at: '2024-01-19',
            status: 'pending',
          },
          {
            id: 'w3',
            psychic_name: 'Cosmic Guide',
            amount: 500.00,
            payment_method: 'bank_transfer',
            account_ending: '5678',
            created_at: '2024-01-18',
            status: 'processing',
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcess = async (withdrawal: any) => {
    Alert.alert(
      'Process Withdrawal',
      `Mark $${withdrawal.amount.toFixed(2)} withdrawal for ${withdrawal.psychic_name} as processing?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Process',
          onPress: async () => {
            try {
              await fetch(`${BACKEND_URL}/api/admin/withdrawals/${withdrawal.id}/process`, {
                method: 'POST',
              });
              setWithdrawals(prev => prev.map(w => 
                w.id === withdrawal.id ? { ...w, status: 'processing' } : w
              ));
            } catch (error) {
              Alert.alert('Error', 'Failed to process');
            }
          },
        },
      ]
    );
  };

  const handleComplete = async (withdrawal: any) => {
    Alert.alert(
      'Complete Withdrawal',
      `Confirm $${withdrawal.amount.toFixed(2)} has been sent to ${withdrawal.psychic_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await fetch(`${BACKEND_URL}/api/admin/withdrawals/${withdrawal.id}/complete`, {
                method: 'POST',
              });
              setWithdrawals(prev => prev.filter(w => w.id !== withdrawal.id));
              Alert.alert('Success', 'Withdrawal marked as completed.');
            } catch (error) {
              Alert.alert('Error', 'Failed to complete');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing': return COLORS.warning;
      case 'completed': return COLORS.online;
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
        <Text style={styles.title}>Withdrawals</Text>
        <Text style={styles.count}>{withdrawals.length}</Text>
      </View>

      {/* Total Pending */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Pending</Text>
        <Text style={styles.totalAmount}>
          ${withdrawals.reduce((sum, w) => sum + (w.status === 'pending' ? w.amount : 0), 0).toFixed(2)}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : withdrawals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle" size={60} color={COLORS.online} />
          <Text style={styles.emptyTitle}>All Processed!</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {withdrawals.map((withdrawal) => (
            <View key={withdrawal.id} style={styles.withdrawalCard}>
              <View style={styles.withdrawalHeader}>
                <View>
                  <Text style={styles.psychicName}>{withdrawal.psychic_name}</Text>
                  <Text style={styles.dateText}>{withdrawal.created_at}</Text>
                </View>
                <View style={styles.amountSection}>
                  <Text style={styles.amountText}>${withdrawal.amount.toFixed(2)}</Text>
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
              </View>

              <View style={styles.paymentInfo}>
                <Ionicons 
                  name={withdrawal.payment_method === 'bank_transfer' ? 'card' : 'logo-paypal'} 
                  size={18} 
                  color={COLORS.textMuted} 
                />
                <Text style={styles.paymentText}>
                  {withdrawal.payment_method === 'bank_transfer' 
                    ? `Bank Account •••• ${withdrawal.account_ending}` 
                    : withdrawal.account_ending}
                </Text>
              </View>

              <View style={styles.actions}>
                {withdrawal.status === 'pending' && (
                  <TouchableOpacity
                    style={styles.processButton}
                    onPress={() => handleProcess(withdrawal)}
                  >
                    <Text style={styles.processText}>Mark as Processing</Text>
                  </TouchableOpacity>
                )}
                {withdrawal.status === 'processing' && (
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={() => handleComplete(withdrawal)}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                    <Text style={styles.completeText}>Mark as Complete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
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
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  count: {
    width: 40,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  totalCard: {
    margin: SPACING.md,
    backgroundColor: COLORS.warning + '20',
    borderRadius: 14,
    padding: SPACING.md,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    color: COLORS.warning,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.warning,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  content: {
    padding: SPACING.md,
    paddingTop: 0,
    gap: SPACING.md,
  },
  withdrawalCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  withdrawalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  psychicName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  amountSection: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  paymentText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  actions: {
    gap: SPACING.sm,
  },
  processButton: {
    backgroundColor: COLORS.warning + '20',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  processText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
  },
  completeButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.online,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  completeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});
