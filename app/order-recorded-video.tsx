import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function OrderRecordedVideoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, refreshUser } = useAuth();
  const { colors } = useTheme();
  
  const psychicId = params.psychicId as string;
  const psychicName = params.psychicName as string;
  const price = parseFloat(params.price as string) || 12;
  const deliveryType = params.deliveryType as string || 'standard';
  const deliveryTime = params.deliveryTime as string || '24 hours';
  const isRush = deliveryType === 'rush';
  
  const [question, setQuestion] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [psychicStatus, setPsychicStatus] = useState<'online' | 'offline' | 'busy' | 'loading'>('loading');
  const [notifyRequested, setNotifyRequested] = useState(false);
  
  const balance = user?.balance || user?.credits || 0;
  const hasEnoughCredits = balance >= price;

  // Check psychic availability
  useEffect(() => {
    checkPsychicStatus();
  }, [psychicId]);

  const checkPsychicStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/psychics/${psychicId}`);
      if (response.ok) {
        const data = await response.json();
        setPsychicStatus(data.online_status || 'offline');
      } else {
        setPsychicStatus('offline');
      }
    } catch (error) {
      console.error('Error checking psychic status:', error);
      setPsychicStatus('offline');
    }
  };

  const handleNotifyWhenAvailable = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/psychics/${psychicId}/notify-when-online`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id }),
      });
      
      if (response.ok) {
        setNotifyRequested(true);
        Alert.alert(
          'Notification Set! 🔔',
          `We'll notify you when ${psychicName} is available.`
        );
      }
    } catch (error) {
      console.error('Error setting notification:', error);
      Alert.alert('Error', 'Failed to set notification. Please try again.');
    }
  };

  const handleAddCredits = () => {
    router.push('/(tabs)/wallet');
  };

  const handleSubmitOrder = async () => {
    if (!question.trim()) {
      Alert.alert('Required', 'Please enter your question for the psychic.');
      return;
    }
    
    if (question.length < 20) {
      Alert.alert('Too Short', 'Please provide more details in your question (at least 20 characters).');
      return;
    }
    
    if (!user) {
      Alert.alert('Login Required', 'Please login to order a recorded video reading.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/(auth)/login') }
      ]);
      return;
    }
    
    if (!hasEnoughCredits) {
      Alert.alert(
        'Not Enough Credits',
        `You need $${price.toFixed(2)} but only have $${balance.toFixed(2)}.\n\nAdd credits to your wallet to continue.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Credits', onPress: handleAddCredits }
        ]
      );
      return;
    }

    // Check if psychic is available for ordering
    if (psychicStatus === 'offline' && !isRush) {
      Alert.alert(
        'Psychic Unavailable',
        `${psychicName} is currently offline. Would you like to be notified when they're available?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Notify Me', onPress: handleNotifyWhenAvailable }
        ]
      );
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/recorded-readings/order?user_id=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          psychic_id: psychicId,
          psychic_name: psychicName,
          question: question.trim(),
          additional_details: additionalDetails.trim() || null,
          price: price,
          delivery_type: deliveryType,
          delivery_time: deliveryTime,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to submit order');
      }
      
      const data = await response.json();
      
      // Refresh user to update balance
      await refreshUser();
      
      Alert.alert(
        'Order Submitted! 📹',
        `Your question has been sent to ${psychicName}.\n\nExpected delivery: ${deliveryTime}\n\nYou'll be notified when your reading is ready.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking psychic status
  if (psychicStatus === 'loading') {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {isRush ? 'Emergency Reading' : 'Standard Reading'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Psychic Info Card */}
        <View style={[styles.psychicCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.psychicInfo}>
            <View style={[styles.psychicAvatar, { backgroundColor: isRush ? '#F59E0B20' : colors.primary + '20' }]}>
              <Ionicons name={isRush ? "flash" : "videocam"} size={28} color={isRush ? '#F59E0B' : colors.primary} />
            </View>
            <View style={styles.psychicDetails}>
              <Text style={[styles.psychicName, { color: colors.textPrimary }]}>{psychicName}</Text>
              <View style={styles.statusRow}>
                <View style={[
                  styles.statusDot, 
                  { backgroundColor: psychicStatus === 'online' ? '#10B981' : psychicStatus === 'busy' ? '#F59E0B' : '#EF4444' }
                ]} />
                <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                  {psychicStatus === 'online' ? 'Online' : psychicStatus === 'busy' ? 'In Session' : 'Offline'}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={[styles.priceTag, { backgroundColor: isRush ? '#F59E0B' : colors.primary }]}>
            <Text style={styles.priceText}>${price.toFixed(0)}</Text>
          </View>
        </View>

        {/* Delivery Info */}
        <View style={[styles.deliveryCard, { backgroundColor: isRush ? '#FEF3C720' : colors.primary + '10' }]}>
          <Ionicons name={isRush ? "flash" : "time-outline"} size={20} color={isRush ? '#F59E0B' : colors.primary} />
          <Text style={[styles.deliveryText, { color: colors.textPrimary }]}>
            {isRush ? '⚡ Emergency Delivery' : '📹 Standard Delivery'}: Response within <Text style={styles.deliveryBold}>{deliveryTime}</Text>
          </Text>
        </View>

        {/* Credits Check */}
        {!hasEnoughCredits && (
          <View style={styles.creditsWarning}>
            <View style={styles.warningHeader}>
              <Ionicons name="wallet-outline" size={24} color="#EF4444" />
              <Text style={styles.warningTitle}>Not Enough Credits</Text>
            </View>
            <Text style={styles.warningText}>
              You need <Text style={styles.warningBold}>${price.toFixed(2)}</Text> but only have <Text style={styles.warningBold}>${balance.toFixed(2)}</Text>
            </Text>
            <TouchableOpacity style={styles.addCreditsButton} onPress={handleAddCredits}>
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={styles.addCreditsText}>Add Credits to Wallet</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Balance Display */}
        {hasEnoughCredits && (
          <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.balanceRow}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Your Balance:</Text>
              <Text style={[styles.balanceAmount, { color: colors.textPrimary }]}>${balance.toFixed(2)}</Text>
            </View>
            <View style={styles.balanceRow}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>This Order:</Text>
              <Text style={[styles.orderCost, { color: '#EF4444' }]}>-${price.toFixed(2)}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.balanceRow}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>After Order:</Text>
              <Text style={[styles.balanceAmount, { color: '#10B981' }]}>${(balance - price).toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Question Input */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Your Question *</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Be specific and detailed for the best reading
          </Text>
          <TextInput
            style={[styles.questionInput, { 
              backgroundColor: colors.card, 
              color: colors.textPrimary, 
              borderColor: hasEnoughCredits ? colors.border : '#EF444440'
            }]}
            placeholder="e.g., I want to know about my career path and what opportunities might come my way in the next 6 months..."
            placeholderTextColor={colors.textMuted}
            value={question}
            onChangeText={setQuestion}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            editable={hasEnoughCredits}
          />
          <Text style={[styles.charCount, { color: colors.textMuted }]}>
            {question.length}/500 characters (minimum 20)
          </Text>
        </View>

        {/* Additional Details */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Additional Context (Optional)</Text>
          <TextInput
            style={[styles.detailsInput, { backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="Any background info that might help (birthday, zodiac sign, situation details...)"
            placeholderTextColor={colors.textMuted}
            value={additionalDetails}
            onChangeText={setAdditionalDetails}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={hasEnoughCredits}
          />
        </View>

        {/* Psychic Offline Notice */}
        {psychicStatus === 'offline' && hasEnoughCredits && (
          <View style={styles.offlineNotice}>
            <Ionicons name="information-circle" size={20} color="#F59E0B" />
            <View style={styles.offlineTextContainer}>
              <Text style={[styles.offlineText, { color: colors.textPrimary }]}>
                {psychicName} is currently offline
              </Text>
              <Text style={[styles.offlineSubtext, { color: colors.textSecondary }]}>
                You can still submit your order. They'll receive it when they come online.
              </Text>
            </View>
            {!notifyRequested && (
              <TouchableOpacity style={styles.notifyButton} onPress={handleNotifyWhenAvailable}>
                <Ionicons name="notifications-outline" size={18} color={colors.primary} />
                <Text style={[styles.notifyButtonText, { color: colors.primary }]}>Notify Me</Text>
              </TouchableOpacity>
            )}
            {notifyRequested && (
              <View style={styles.notifySet}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.notifySetText}>Notification Set</Text>
              </View>
            )}
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!hasEnoughCredits || isSubmitting || question.length < 20) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmitOrder}
          disabled={!hasEnoughCredits || isSubmitting || question.length < 20}
        >
          <LinearGradient
            colors={hasEnoughCredits && question.length >= 20 ? (isRush ? ['#F59E0B', '#D97706'] : ['#7C3AED', '#5B21B6']) : ['#9CA3AF', '#9CA3AF']}
            style={styles.submitGradient}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name={hasEnoughCredits ? "send" : "wallet-outline"} size={22} color="#FFF" />
                <Text style={styles.submitText}>
                  {!hasEnoughCredits ? 'Add Credits First' : `Submit Order - $${price.toFixed(0)}`}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
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
    padding: 16,
  },
  psychicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  psychicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  psychicAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  psychicDetails: {
    marginLeft: 12,
    flex: 1,
  },
  psychicName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
  },
  priceTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  priceText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  deliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  deliveryText: {
    fontSize: 14,
    flex: 1,
  },
  deliveryBold: {
    fontWeight: '700',
  },
  creditsWarning: {
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  warningText: {
    fontSize: 14,
    color: '#7F1D1D',
    marginBottom: 12,
  },
  warningBold: {
    fontWeight: '700',
  },
  addCreditsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 10,
  },
  addCreditsText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  balanceCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  balanceLabel: {
    fontSize: 14,
  },
  balanceAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  orderCost: {
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 10,
  },
  questionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
  },
  detailsInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 80,
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  offlineTextContainer: {
    flex: 1,
  },
  offlineText: {
    fontSize: 14,
    fontWeight: '600',
  },
  offlineSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  notifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  notifyButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  notifySet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notifySetText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  submitButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  submitText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
