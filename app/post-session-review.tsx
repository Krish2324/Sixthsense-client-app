import React, { useState, useEffect } from 'react';
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

const BONUS_AMOUNTS = [5, 10, 20, 50];

export default function PostSessionReviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { psychicId, psychicName, sessionId } = useLocalSearchParams();
  const { user, refreshUser } = useAuth();
  const { colors } = useTheme();

  // Review state
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Bonus state (only shown after 4-5 star review)
  const [showBonusSection, setShowBonusSection] = useState(false);
  const [selectedBonus, setSelectedBonus] = useState<number | null>(null);
  const [customBonus, setCustomBonus] = useState('');
  const [bonusMessage, setBonusMessage] = useState('');
  const [isSubmittingBonus, setIsSubmittingBonus] = useState(false);

  const balance = user?.balance || 0;

  const getBonusAmount = () => {
    return selectedBonus || parseFloat(customBonus) || 0;
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await apiClient.post(`/api/reviews/?user_id=${user?.id}`, {
        psychic_id: psychicId,
        rating: rating,
        comment: reviewText || null,
        session_id: sessionId || null,
      });

      setReviewSubmitted(true);

      // Show bonus section only if 4-5 stars
      if (rating >= 4) {
        setShowBonusSection(true);
      } else {
        Alert.alert(
          'Thank You! 🙏',
          'Your review has been submitted.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleSendBonus = async () => {
    const amount = getBonusAmount();
    
    if (amount < 1) {
      Alert.alert('Invalid Amount', 'Minimum bonus is $1');
      return;
    }

    if (amount > 500) {
      Alert.alert('Invalid Amount', 'Maximum bonus is $500');
      return;
    }

    if (amount > balance) {
      Alert.alert(
        'Insufficient Balance',
        'Please add funds to your wallet.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Funds', onPress: () => router.push('/(tabs)/wallet') },
        ]
      );
      return;
    }

    setIsSubmittingBonus(true);
    try {
      await apiClient.post(`/api/tips/?user_id=${user?.id}`, {
        psychic_id: psychicId,
        amount: amount,
        message: bonusMessage || 'Great session bonus!',
        session_id: sessionId || null,
        is_bonus: true,
      });

      await refreshUser();
      
      Alert.alert(
        'Bonus Sent! 🎉',
        `Thank you for sending a $${amount.toFixed(2)} bonus to ${psychicName}!`,
        [{ text: 'Done', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send bonus');
    } finally {
      setIsSubmittingBonus(false);
    }
  };

  const handleSkipBonus = () => {
    Alert.alert(
      'Thank You!',
      'Your review has been submitted.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  // Review Section
  const renderReviewSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>How was your session?</Text>
      <Text style={styles.sectionSubtitle}>Rate your experience with {psychicName}</Text>

      {/* Star Rating */}
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={44}
              color={star <= rating ? COLORS.star : colors.textMuted}
            />
          </TouchableOpacity>
        ))}
      </View>

      {rating > 0 && (
        <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>
          {rating === 5 ? 'Excellent!' : rating === 4 ? 'Great!' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
        </Text>
      )}

      {/* Review Text */}
      <TextInput
        style={[styles.reviewInput, { backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.border }]}
        placeholder="Share your experience (optional)..."
        placeholderTextColor={colors.textMuted}
        value={reviewText}
        onChangeText={setReviewText}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, rating === 0 && styles.submitButtonDisabled]}
        onPress={handleSubmitReview}
        disabled={isSubmittingReview || rating === 0}
      >
        <LinearGradient
          colors={rating > 0 ? [COLORS.primary, COLORS.primaryDark] : [colors.textMuted, colors.textMuted]}
          style={styles.submitButtonGradient}
        >
          {isSubmittingReview ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#FFF" />
              <Text style={styles.submitButtonText}>Submit Review</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // Bonus Section (only after 4-5 star review)
  const renderBonusSection = () => (
    <View style={styles.section}>
      <View style={styles.bonusHeader}>
        <Ionicons name="gift" size={32} color={COLORS.gold} />
        <Text style={styles.sectionTitle}>Give a Bonus!</Text>
      </View>
      <Text style={styles.sectionSubtitle}>
        Show extra appreciation for {psychicName}'s great reading
      </Text>

      {/* Bonus Amounts */}
      <View style={styles.amountsGrid}>
        {BONUS_AMOUNTS.map((amount) => (
          <TouchableOpacity
            key={amount}
            style={[
              styles.amountButton,
              { backgroundColor: colors.card, borderColor: selectedBonus === amount ? COLORS.primary : colors.border },
              selectedBonus === amount && styles.amountButtonSelected
            ]}
            onPress={() => {
              setSelectedBonus(amount);
              setCustomBonus('');
            }}
          >
            <Text style={[
              styles.amountText,
              { color: selectedBonus === amount ? COLORS.primary : colors.textPrimary }
            ]}>
              ${amount}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom Amount */}
      <View style={[styles.customAmountContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.dollarSign, { color: colors.textPrimary }]}>$</Text>
        <TextInput
          style={[styles.customInput, { color: colors.textPrimary }]}
          placeholder="Custom amount"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          value={customBonus}
          onChangeText={(text) => {
            setCustomBonus(text);
            setSelectedBonus(null);
          }}
        />
      </View>

      {/* Optional Message */}
      <TextInput
        style={[styles.messageInput, { backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.border }]}
        placeholder="Add a thank you message (optional)"
        placeholderTextColor={colors.textMuted}
        value={bonusMessage}
        onChangeText={setBonusMessage}
      />

      {/* Balance */}
      <View style={styles.balanceRow}>
        <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Your Balance:</Text>
        <Text style={[styles.balanceAmount, { color: colors.textPrimary }]}>${balance.toFixed(2)}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.bonusActions}>
        <TouchableOpacity
          style={[styles.skipButton, { borderColor: colors.border }]}
          onPress={handleSkipBonus}
        >
          <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sendBonusButton, getBonusAmount() < 1 && styles.sendBonusButtonDisabled]}
          onPress={handleSendBonus}
          disabled={isSubmittingBonus || getBonusAmount() < 1}
        >
          <LinearGradient
            colors={getBonusAmount() >= 1 ? [COLORS.gold, '#D4A10A'] : [colors.textMuted, colors.textMuted]}
            style={styles.sendBonusGradient}
          >
            {isSubmittingBonus ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="gift" size={20} color="#FFF" />
                <Text style={styles.sendBonusText}>
                  Send ${getBonusAmount().toFixed(2)} Bonus
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {showBonusSection ? 'Give Bonus' : 'Rate Your Session'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!showBonusSection ? renderReviewSection() : renderBonusSection()}
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingBottom: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  section: {
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  bonusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
  },
  reviewInput: {
    width: '100%',
    minHeight: 120,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 20,
  },
  submitButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary + '15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },
  amountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    width: '100%',
    justifyContent: 'center',
  },
  amountButton: {
    width: '45%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  amountButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  amountText: {
    fontSize: 24,
    fontWeight: '700',
  },
  advisorShare: {
    fontSize: 12,
    marginTop: 4,
  },
  customAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    width: '100%',
  },
  dollarSign: {
    fontSize: 20,
    fontWeight: '600',
  },
  customInput: {
    flex: 1,
    fontSize: 18,
    paddingVertical: 14,
    marginLeft: 8,
  },
  messageInput: {
    width: '100%',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  bonusActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sendBonusButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sendBonusButtonDisabled: {
    opacity: 0.6,
  },
  sendBonusGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  sendBonusText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
