import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import * as ImagePicker from 'expo-image-picker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://api.sixthsensepsychics.com';

export default function SubmitQuestionScreen() {
  const { psychicId, psychicName } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Form state
  const [questionText, setQuestionText] = useState('');
  const [deliveryType, setDeliveryType] = useState<'standard' | 'emergency'>('standard');
  const [clientVideoUri, setClientVideoUri] = useState<string | null>(null);
  const [clientVideoDuration, setClientVideoDuration] = useState<number | null>(null);
  const [isThirdParty, setIsThirdParty] = useState(false);
  const [thirdPartyName, setThirdPartyName] = useState('');
  const [thirdPartyBirthDate, setThirdPartyBirthDate] = useState('');
  const [thirdPartyBirthTime, setThirdPartyBirthTime] = useState('');
  const [thirdPartyBirthLocation, setThirdPartyBirthLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const price = deliveryType === 'emergency' ? 20 : 12;
  const deliveryTime = deliveryType === 'emergency' ? '1 hour' : '24 hours';
  const balance = user?.balance || 0;
  const canAfford = balance >= price;

  const handleRecordOrPickVideo = () => {
    Alert.alert(
      'Record Video Question',
      'Record yourself asking your question for your advisor (max 2 minutes):',
      [
        {
          text: '📹 Record with Camera',
          onPress: recordVideoWithCamera,
        },
        {
          text: '🖼️ Choose from Gallery',
          onPress: pickVideoFromGallery,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const recordVideoWithCamera = async () => {
    try {
      const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPerm.granted) {
        Alert.alert('Permission Required', 'Camera permission is required to record a video question.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 120,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setClientVideoUri(asset.uri);
        if (asset.duration) {
          setClientVideoDuration(Math.round(asset.duration / 1000));
        }
      }
    } catch (err: any) {
      console.error('Camera record error:', err);
      Alert.alert('Error', 'Could not open camera recorder');
    }
  };

  const pickVideoFromGallery = async () => {
    try {
      const mediaPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!mediaPerm.granted) {
        Alert.alert('Permission Required', 'Media library permission is required to choose a video.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setClientVideoUri(asset.uri);
        if (asset.duration) {
          setClientVideoDuration(Math.round(asset.duration / 1000));
        }
      }
    } catch (err: any) {
      console.error('Gallery pick error:', err);
      Alert.alert('Error', 'Could not select video from gallery');
    }
  };

  const handleSubmit = async () => {
    if (!questionText.trim()) {
      Alert.alert('Error', 'Please enter your question');
      return;
    }

    if (isThirdParty && !thirdPartyName.trim()) {
      Alert.alert('Error', 'Please enter the name of the person for the reading');
      return;
    }

    setIsSubmitting(true);
    try {
      const baseUrl = BACKEND_URL || 'https://api.sixthsensepsychics.com';
      let uploadedClientVideoUrl: string | null = null;

      // If client attached a video, upload it first
      if (clientVideoUri) {
        try {
          const formData = new FormData();
          const filename = `client_q_${user?.id || 'client'}_${Date.now()}.mp4`;
          formData.append('file', {
            uri: clientVideoUri,
            name: filename,
            type: 'video/mp4',
          } as any);
          formData.append('user_id', user?.id || 'client');

          const uploadRes = await fetch(`${baseUrl}/api/storage/upload-video`, {
            method: 'POST',
            body: formData,
          });

          if (uploadRes.ok) {
            const uploadJson = await uploadRes.json();
            uploadedClientVideoUrl = uploadJson.url;
            console.log('Client question video uploaded:', uploadedClientVideoUrl);
          } else {
            console.warn('Video upload response not OK, continuing with text');
          }
        } catch (uploadErr) {
          console.warn('Video upload error:', uploadErr);
        }
      }

      const response = await fetch(`${baseUrl}/api/questions/?user_id=${user?.id || 'guest'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          psychic_id: psychicId,
          question_text: questionText,
          question_type: 'recorded_video',
          delivery_type: deliveryType,
          client_video_url: uploadedClientVideoUrl,
          is_third_party: isThirdParty,
          third_party_name: isThirdParty ? thirdPartyName : null,
          third_party_birth_date: isThirdParty ? thirdPartyBirthDate : null,
          third_party_birth_time: isThirdParty ? thirdPartyBirthTime : null,
          third_party_birth_location: isThirdParty ? thirdPartyBirthLocation : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to submit question');
      }

      const data = await response.json();
      console.log('Question submitted successfully:', data);

      // Navigate to Readings tab after successful submission
      router.replace('/(tabs)/readings' as any);
    } catch (error: any) {
      console.error('Error submitting question:', error);
      Alert.alert('Error', error.message || 'Failed to submit your question. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ask a Question</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Psychic Info */}
        <View style={styles.psychicInfo}>
          <Ionicons name="person-circle" size={40} color={COLORS.primary} />
          <View>
            <Text style={styles.psychicLabel}>Asking</Text>
            <Text style={styles.psychicName}>{psychicName || 'Advisor'}</Text>
          </View>
        </View>

        {/* Delivery Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Speed</Text>
          <View style={styles.deliveryOptions}>
            <TouchableOpacity
              style={[
                styles.deliveryOption,
                deliveryType === 'standard' && styles.deliveryOptionSelected,
              ]}
              onPress={() => setDeliveryType('standard')}
            >
              <View style={styles.deliveryHeader}>
                <Ionicons
                  name="time-outline"
                  size={24}
                  color={deliveryType === 'standard' ? COLORS.primary : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.deliveryTitle,
                    deliveryType === 'standard' && styles.deliveryTitleSelected,
                  ]}
                >
                  Standard
                </Text>
              </View>
              <Text style={styles.deliveryDesc}>24 hour delivery</Text>
              <Text style={styles.deliveryPrice}>$12</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.deliveryOption,
                deliveryType === 'emergency' && styles.deliveryOptionSelected,
                styles.deliveryOptionEmergency,
              ]}
              onPress={() => setDeliveryType('emergency')}
            >
              <View style={styles.deliveryHeader}>
                <Ionicons
                  name="flash"
                  size={24}
                  color={deliveryType === 'emergency' ? COLORS.error : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.deliveryTitle,
                    deliveryType === 'emergency' && styles.deliveryTitleEmergency,
                  ]}
                >
                  Emergency
                </Text>
              </View>
              <Text style={styles.deliveryDesc}>1 hour delivery</Text>
              <Text style={[styles.deliveryPrice, { color: COLORS.error }]}>$20</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Question Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Question</Text>
          <TextInput
            style={styles.questionInput}
            placeholder="Type your question here... Be as detailed as possible for the best reading."
            placeholderTextColor={COLORS.textMuted}
            value={questionText}
            onChangeText={setQuestionText}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{questionText.length}/500</Text>
        </View>

        {/* Video Question Option */}
        <View style={styles.section}>
          <View style={styles.videoQuestionCard}>
            <View style={styles.videoQuestionHeader}>
              <View style={styles.videoQuestionIcon}>
                <Ionicons name="videocam" size={24} color={COLORS.secondary} />
              </View>
              <View style={styles.videoQuestionInfo}>
                <Text style={styles.videoQuestionTitle}>Record Video Question</Text>
                <Text style={styles.videoQuestionDesc}>
                  Optionally record yourself asking your question for a more personal connection
                </Text>
              </View>
            </View>

            {clientVideoUri ? (
              <View style={styles.attachedVideoContainer}>
                <View style={styles.attachedVideoHeader}>
                  <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.attachedVideoTitle}>Video Question Attached</Text>
                    <Text style={styles.attachedVideoSubtitle}>
                      {clientVideoDuration ? `${clientVideoDuration}s • ` : ''}Advisor will watch your video
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setClientVideoUri(null)} style={styles.removeVideoButton}>
                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>

                <View style={styles.attachedVideoActions}>
                  <TouchableOpacity
                    style={styles.previewVideoButton}
                    onPress={() => {
                      router.push({
                        pathname: '/play-recording',
                        params: {
                          url: clientVideoUri,
                          type: 'video',
                          psychicName: 'Your Question Preview',
                        },
                      });
                    }}
                  >
                    <Ionicons name="play" size={16} color={COLORS.primary} />
                    <Text style={styles.previewVideoText}>Preview Video</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.changeVideoButton} onPress={handleRecordOrPickVideo}>
                    <Ionicons name="refresh" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.changeVideoText}>Change</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.recordVideoButton}
                onPress={handleRecordOrPickVideo}
              >
                <Ionicons name="videocam" size={18} color="#FFF" />
                <Text style={styles.recordVideoButtonText}>Record Video</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Third Party Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>Reading for someone else?</Text>
              <Text style={styles.toggleDesc}>Provide their birth details for accuracy</Text>
            </View>
            <Switch
              value={isThirdParty}
              onValueChange={setIsThirdParty}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* Third Party Details */}
        {isThirdParty && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Person's Details</Text>
            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Full Name *"
                  placeholderTextColor={COLORS.textMuted}
                  value={thirdPartyName}
                  onChangeText={setThirdPartyName}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Birth Date (YYYY-MM-DD)"
                  placeholderTextColor={COLORS.textMuted}
                  value={thirdPartyBirthDate}
                  onChangeText={setThirdPartyBirthDate}
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="time-outline" size={20} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Birth Time (HH:MM) - Optional"
                  placeholderTextColor={COLORS.textMuted}
                  value={thirdPartyBirthTime}
                  onChangeText={setThirdPartyBirthTime}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="location-outline" size={20} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Birth Location - Optional"
                  placeholderTextColor={COLORS.textMuted}
                  value={thirdPartyBirthLocation}
                  onChangeText={setThirdPartyBirthLocation}
                />
              </View>
            </View>
          </View>
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={COLORS.info} />
          <Text style={styles.infoText}>
            After submitting, you can exchange up to 5 clarification messages with the advisor if needed.
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={[styles.submitBar, { paddingBottom: insets.bottom + SPACING.md }]}>
        <View style={styles.priceRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalPrice}>${price.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.submitGradient}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#FFF" />
                <Text style={styles.submitText}>Submit Question</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  psychicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.backgroundCard,
    padding: SPACING.md,
    borderRadius: 14,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  psychicLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  psychicName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  deliveryOptions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  deliveryOption: {
    flex: 1,
    backgroundColor: COLORS.backgroundCard,
    padding: SPACING.md,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  deliveryOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  deliveryOptionEmergency: {
    borderColor: COLORS.border,
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  deliveryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  deliveryTitleSelected: {
    color: COLORS.primary,
  },
  deliveryTitleEmergency: {
    color: COLORS.error,
  },
  deliveryDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  deliveryPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  questionInput: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    fontSize: 15,
    color: COLORS.textPrimary,
    minHeight: 150,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  videoQuestionCard: {
    backgroundColor: COLORS.secondary + '10',
    borderRadius: 14,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.secondary + '30',
  },
  videoQuestionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  videoQuestionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoQuestionInfo: {
    flex: 1,
  },
  videoQuestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  videoQuestionDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  recordVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: SPACING.md,
    gap: 6,
  },
  recordVideoButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  attachedVideoContainer: {
    backgroundColor: '#22C55E10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#22C55E40',
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  attachedVideoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attachedVideoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  attachedVideoSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  removeVideoButton: {
    padding: 6,
  },
  attachedVideoActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#22C55E20',
  },
  previewVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  previewVideoText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  changeVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  changeVideoText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    padding: SPACING.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  toggleDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  inputGroup: {
    gap: SPACING.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 52,
    gap: SPACING.sm,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.info + '15',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.info,
    lineHeight: 18,
  },
  submitBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  totalLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  insufficientText: {
    fontSize: 12,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  submitButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
