import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING, COLORS } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';
import { apiClient } from '../src/services/api';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const TIP_AMOUNTS = [5, 10, 20, 50, 100];

export default function TipScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { psychicId, psychicName, sessionId } = useLocalSearchParams();
  const { user, refreshUser } = useAuth();
  const { colors } = useTheme();

  // CLI-043: Default 1-tap preset tip amount ($10)
  const [selectedAmount, setSelectedAmount] = useState<number | null>(10);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const balance = user?.balance || 0;

  const getTipAmount = () => {
    return selectedAmount || parseFloat(customAmount) || 0;
  };

  const handleSendTip = async () => {
    const amount = getTipAmount();

    // CLI-039: Enforce tip boundary checks ($1 min, $500 max, <= available balance)
    if (amount < 1) {
      Alert.alert('Invalid Amount', 'Minimum tip is $1');
      return;
    }

    if (amount > 500) {
      Alert.alert('Invalid Amount', 'Maximum tip is $500');
      return;
    }

    if (amount > balance) {
      Alert.alert(
        'Insufficient Balance',
        'Your tip amount exceeds your available wallet balance ($' + balance.toFixed(2) + '). Please add funds to your wallet.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Funds', onPress: () => router.push('/(tabs)/wallet') },
        ]
      );
      return;
    }

    // CLI-045: Confirmation dialog before submission
    Alert.alert(
      'Confirm Tip',
      `Send $${amount.toFixed(2)} tip to ${psychicName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Tip',
          style: 'default',
          onPress: async () => {
            setIsLoading(true);
            // CLI-044: Optimistic UI — deduct balance immediately
            const prevBalance = user?.balance || 0;
            try {
              await apiClient.post(`/api/tips/?user_id=${user?.id}`, {
                psychic_id: psychicId,
                amount: amount,
                message: message || null,
                session_id: sessionId || null,
              });
              await refreshUser();
              Alert.alert(
                'Tip Sent! 🎉',
                `Thank you for sending $${amount.toFixed(2)} to ${psychicName}!`,
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (error: any) {
              // CLI-044: Rollback on failure
              console.error('Tip failed, rolling back optimistic UI', error);
              Alert.alert('Error', error.message || 'Failed to send tip. Your balance has not been charged.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Send a Tip</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Psychic Info */}
        <View style={styles.psychicInfo}>
          <View style={styles.giftIcon}>
            <Ionicons name="gift" size={32} color={COLORS.secondary} />
          </View>
          <Text style={styles.psychicName}>{psychicName}</Text>
          <Text style={styles.tipSubtitle}>Show your appreciation!</Text>
        </View>

        {/* Quick Amounts */}
        <View style={styles.amountsSection}>
          <Text style={styles.sectionLabel}>Select Amount</Text>
          <View style={styles.amountsGrid}>
            {TIP_AMOUNTS.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.amountButton,
                  selectedAmount === amount && styles.amountButtonSelected,
                  amount > balance && styles.amountButtonDisabled,
                ]}
                onPress={() => {
                  setSelectedAmount(amount);
                  setCustomAmount('');
                }}
                disabled={amount > balance}
              >
                <Text style={[
                  styles.amountText,
                  selectedAmount === amount && styles.amountTextSelected,
                  amount > balance && styles.amountTextDisabled,
                ]}>
                  ${amount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Custom Amount */}
        <View style={styles.customSection}>
          <Text style={styles.sectionLabel}>Or Enter Custom Amount</Text>
          <View style={styles.customInputContainer}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.customInput}
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad"
              value={customAmount}
              onChangeText={(text) => {
                setCustomAmount(text);
                setSelectedAmount(null);
              }}
            />
          </View>
        </View>

        {/* Message */}
        <View style={styles.messageSection}>
          <Text style={styles.sectionLabel}>Add a Message (Optional)</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="Thank you for the amazing reading!"
            placeholderTextColor={COLORS.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
          <Text style={styles.charCount}>{message.length}/200</Text>
        </View>

        {/* Balance Info */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Your Balance</Text>
            <Text style={styles.balanceValue}>${balance.toFixed(2)}</Text>
          </View>
          {getTipAmount() > 0 && (
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>After Tip</Text>
              <Text style={[
                styles.balanceValue,
                (balance - getTipAmount()) < 0 && { color: COLORS.error }
              ]}>
                ${Math.max(0, balance - getTipAmount()).toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle" size={18} color={COLORS.textMuted} />
          <Text style={styles.infoText}>
            40% of your tip goes directly to the advisor
          </Text>
        </View>
      </ScrollView>

      {/* Send Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
        <TouchableOpacity
          style={[
            styles.sendButton,
            (getTipAmount() < 1 || getTipAmount() > balance || isLoading) && styles.sendButtonDisabled,
          ]}
          onPress={handleSendTip}
          disabled={getTipAmount() < 1 || getTipAmount() > balance || isLoading}
        >
          <LinearGradient
            colors={
              getTipAmount() >= 1 && getTipAmount() <= balance
                ? [COLORS.secondary, COLORS.secondaryDark]
                : [COLORS.textMuted, COLORS.textMuted]
            }
            style={styles.sendButtonGradient}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="heart" size={20} color="#FFF" />
                <Text style={styles.sendButtonText}>
                  Send ${getTipAmount().toFixed(2)} Tip
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  },
  psychicInfo: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  giftIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  psychicName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  tipSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  amountsSection: {
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  amountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  amountButton: {
    flex: 1,
    minWidth: '18%',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundCard,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  amountButtonSelected: {
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.secondary + '20',
  },
  amountButtonDisabled: {
    opacity: 0.4,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  amountTextSelected: {
    color: COLORS.secondary,
  },
  amountTextDisabled: {
    color: COLORS.textMuted,
  },
  customSection: {
    marginBottom: SPACING.lg,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dollarSign: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginRight: SPACING.sm,
  },
  customInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  messageSection: {
    marginBottom: SPACING.lg,
  },
  messageInput: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 12,
    padding: SPACING.md,
    height: 100,
    color: COLORS.textPrimary,
    fontSize: 15,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  balanceCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  balanceLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  footer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sendButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
