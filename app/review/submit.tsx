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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function SubmitReviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { psychicId, psychicName, sessionId, psychicImage } = useLocalSearchParams();
  const { user } = useAuth();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [canReview, setCanReview] = useState(true);
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    checkCanReview();
  }, []);

  const checkCanReview = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/reviews/can-review/${psychicId}?user_id=${user?.id}`
      );
      const data = await response.json();
      setCanReview(data.can_review);
      if (!data.can_review && data.days_left) {
        setDaysLeft(data.days_left);
      }
    } catch (error) {
      console.error('Error checking review eligibility:', error);
    }
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/reviews/?user_id=${user?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          psychic_id: psychicId,
          session_id: sessionId || null,
          rating: rating,
          comment: comment || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to submit review');
      }

      Alert.alert(
        'Thank You! ⭐',
        'Your review has been submitted successfully.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit review');
    } finally {
      setIsLoading(false);
    }
  };

  const getRatingLabel = () => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent!';
      default: return 'Tap to rate';
    }
  };

  if (!canReview) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Write a Review</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.cooldownContainer}>
          <View style={styles.cooldownIcon}>
            <Ionicons name="time" size={48} color={COLORS.warning} />
          </View>
          <Text style={styles.cooldownTitle}>Review Cooldown</Text>
          <Text style={styles.cooldownText}>
            You've already reviewed this psychic recently.
            You can submit another review in {daysLeft} days.
          </Text>
          <TouchableOpacity
            style={styles.cooldownButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cooldownButtonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
        <Text style={styles.title}>Write a Review</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Psychic Info */}
        <View style={styles.psychicInfo}>
          {psychicImage ? (
            <Image source={{ uri: psychicImage as string }} style={styles.psychicImage} />
          ) : (
            <View style={styles.psychicImagePlaceholder}>
              <Ionicons name="person" size={32} color={COLORS.textMuted} />
            </View>
          )}
          <Text style={styles.psychicName}>{psychicName}</Text>
          <Text style={styles.reviewSubtitle}>How was your experience?</Text>
        </View>

        {/* Star Rating */}
        <View style={styles.ratingSection}>
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
                  color={star <= rating ? COLORS.star : COLORS.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[
            styles.ratingLabel,
            rating > 0 && { color: COLORS.star }
          ]}>
            {getRatingLabel()}
          </Text>
        </View>

        {/* Comment */}
        <View style={styles.commentSection}>
          <Text style={styles.sectionLabel}>Your Review (Optional)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Share your experience with this psychic..."
            placeholderTextColor={COLORS.textMuted}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={5}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{comment.length}/500</Text>
        </View>

        {/* Tips for Writing */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips for a helpful review:</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.online} />
            <Text style={styles.tipText}>Was the reading accurate?</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.online} />
            <Text style={styles.tipText}>Did the psychic make you feel comfortable?</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.online} />
            <Text style={styles.tipText}>Would you recommend this psychic?</Text>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (rating === 0 || isLoading) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmitReview}
          disabled={rating === 0 || isLoading}
        >
          <LinearGradient
            colors={
              rating > 0
                ? [COLORS.primary, COLORS.primaryDark]
                : [COLORS.textMuted, COLORS.textMuted]
            }
            style={styles.submitButtonGradient}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="star" size={20} color="#FFF" />
                <Text style={styles.submitButtonText}>Submit Review</Text>
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
  psychicImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: SPACING.md,
  },
  psychicImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  psychicName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  reviewSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  ratingSection: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  commentSection: {
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
  commentInput: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 12,
    padding: SPACING.md,
    height: 140,
    color: COLORS.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  tipsCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 12,
    padding: SPACING.md,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 4,
  },
  tipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  cooldownContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  cooldownIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  cooldownTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  cooldownText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  cooldownButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  cooldownButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
