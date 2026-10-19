import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';
import { apiClient } from '../src/services/api';
const TIP_AMOUNTS = [2, 5, 10, 20, 50];

export default function SessionReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, refreshUser } = useAuth();
  const params = useLocalSearchParams();
  
  const psychicId = params.psychicId as string;
  const psychicName = params.psychicName as string || 'Your Advisor';
  const psychicAvatar = params.psychicAvatar as string;
  const sessionType = params.sessionType as string || 'chat';
  const sessionDuration = params.sessionDuration as string || '0';
  const totalSpentParam = params.totalSpent as string || '0';

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      const msg = 'Please select a rating before submitting.';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Rating Required', msg);
      return;
    }

    setIsSubmitting(true);
    try {
      const uid = user?.id || 'usr_client';
      const cleanComment = (reviewText || '').trim();

      // Submit review to backend
      await apiClient.post(`/api/reviews/?user_id=${uid}`, {
        user_id: uid,
        psychic_id: psychicId,
        session_id: `session-${Date.now()}`,
        rating: rating,
        comment: cleanComment,
      });

      // Submit gratuity tip if chosen
      const tipAmount = selectedTip || (customTip ? parseFloat(customTip) : 0);
      if (tipAmount > 0) {
        try {
          await apiClient.post(`/api/tips/?user_id=${uid}`, {
            user_id: uid,
            client_name: user?.name || 'Client',
            psychic_id: psychicId,
            amount: tipAmount,
          });
          if (typeof refreshUser === 'function') {
            await refreshUser();
          }
        } catch (tipErr: any) {
          console.warn('Tip submission notice:', tipErr);
          const tipErrorMsg = tipErr?.message || 'Tip could not be processed';
          if (Platform.OS === 'web') alert(tipErrorMsg);
          else Alert.alert('Tip Notice', tipErrorMsg);
        }
      }

      const msg = tipAmount > 0
        ? `Thank you for your ${rating}-star review and $${tipAmount.toFixed(2)} tip!`
        : `Thank you for your ${rating}-star review!`;

      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Review Submitted', msg);
      }
      router.replace('/(tabs)/home');
    } catch (error: any) {
      let errorMsg = 'Failed to submit review. Please try again.';
      if (typeof error === 'string') {
        errorMsg = error;
      } else if (typeof error?.message === 'string') {
        errorMsg = error.message;
      } else if (typeof error?.detail === 'string') {
        errorMsg = error.detail;
      }
      if (Platform.OS === 'web') {
        alert(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)/home');
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={40}
              color={star <= rating ? '#FFD700' : colors.textMuted}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getRatingText = () => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent!';
      default: return 'Tap to rate';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.lg }]}
      >
        {/* Header */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>Session Complete!</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          How was your {sessionType} with {psychicName}?
        </Text>

        {/* Psychic Avatar */}
        <View style={styles.avatarContainer}>
          {psychicAvatar ? (
            <Image source={{ uri: psychicAvatar }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={[colors.primary, colors.secondary || '#7B1FA2']}
              style={styles.avatarPlaceholder}
            >
              <Text style={styles.avatarText}>{psychicName[0]}</Text>
            </LinearGradient>
          )}
          <Text style={[styles.psychicName, { color: colors.textPrimary }]}>{psychicName}</Text>
        </View>

        {/* Star Rating */}
        <View style={[styles.ratingCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Rate Your Experience</Text>
          {renderStars()}
          <Text style={[styles.ratingText, { color: rating > 0 ? colors.primary : colors.textMuted }]}>
            {getRatingText()}
          </Text>
        </View>

        {/* Review Text */}
        <View style={[styles.reviewCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Write a Review (Optional)</Text>
          <TextInput
            style={[styles.reviewInput, { 
              backgroundColor: colors.backgroundElevated, 
              color: colors.textPrimary,
              borderColor: colors.border 
            }]}
            placeholder="Share your experience..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            value={reviewText}
            onChangeText={setReviewText}
            textAlignVertical="top"
          />
        </View>

        {/* Tip Section */}
        <View style={[styles.tipCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.tipHeader}>
            <Ionicons name="heart" size={20} color={colors.error} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
              Leave a Tip (Optional)
            </Text>
          </View>
          <Text style={[styles.tipSubtitle, { color: colors.textSecondary }]}>
            Show your appreciation for {psychicName}
          </Text>

          {/* Preset Tips */}
          <View style={styles.tipGrid}>
            {TIP_AMOUNTS.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.tipButton,
                  { 
                    backgroundColor: selectedTip === amount ? colors.primary : colors.backgroundElevated,
                    borderColor: selectedTip === amount ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => {
                  setSelectedTip(selectedTip === amount ? null : amount);
                  setCustomTip('');
                }}
              >
                <Text style={[
                  styles.tipButtonText,
                  { color: selectedTip === amount ? '#FFF' : colors.textPrimary }
                ]}>
                  ${amount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Tip */}
          <View style={[styles.customTipContainer, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
            <Text style={[styles.dollarSign, { color: colors.textSecondary }]}>$</Text>
            <TextInput
              style={[styles.customTipInput, { color: colors.textPrimary }]}
              placeholder="Custom amount"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={customTip}
              onChangeText={(text) => {
                setCustomTip(text);
                setSelectedTip(null);
              }}
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, { opacity: isSubmitting ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary || '#7B1FA2']}
            style={styles.submitGradient}
          >
            <Text style={styles.submitText}>
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Skip Button */}
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip for now</Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: SPACING.sm,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  psychicName: {
    fontSize: 18,
    fontWeight: '600',
  },
  ratingCard: {
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reviewCard: {
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  reviewInput: {
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: 14,
    minHeight: 100,
    borderWidth: 1,
  },
  tipCard: {
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  tipSubtitle: {
    fontSize: 13,
    marginBottom: SPACING.md,
  },
  tipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  tipButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 10,
    borderWidth: 1,
  },
  tipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  customTipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
  },
  dollarSign: {
    fontSize: 16,
    fontWeight: '600',
  },
  customTipInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  submitButton: {
    marginBottom: SPACING.md,
  },
  submitGradient: {
    paddingVertical: SPACING.md,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  skipText: {
    fontSize: 14,
  },
});
