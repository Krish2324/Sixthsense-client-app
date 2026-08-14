import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const SPECIALTIES = [
  'Tarot Reading', 'Astrology', 'Clairvoyance', 'Mediumship',
  'Love & Relationships', 'Career & Finance', 'Past Lives',
  'Dream Interpretation', 'Angel Cards', 'Numerology',
];

const READING_METHODS = [
  { id: 'chat', label: 'Live Chat', icon: 'chatbubble' },
  { id: 'phone', label: 'Phone Call', icon: 'call' },
  { id: 'video', label: 'Video Call', icon: 'videocam' },
];

export default function ApplyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form data
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['chat']);
  const [bio, setBio] = useState('');
  const [chatRate, setChatRate] = useState('2.99');
  const [phoneRate, setPhoneRate] = useState('3.99');
  const [videoRate, setVideoRate] = useState('4.99');
  
  // New fields for profile picture and videos
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [introVideo, setIntroVideo] = useState<string | null>(null);
  const [testReadingVideo, setTestReadingVideo] = useState<string | null>(null);

  const toggleSpecialty = (specialty: string) => {
    setSelectedSpecialties(prev => 
      prev.includes(specialty)
        ? prev.filter(s => s !== specialty)
        : [...prev, specialty]
    );
  };

  const toggleMethod = (method: string) => {
    setSelectedMethods(prev => 
      prev.includes(method)
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  // Image picker functions
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setProfilePicture(base64Image);
    }
  };

  const takePhoto = async () => {
    // Use ImagePicker camera for cross-platform support
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setProfilePicture(base64Image);
    }
  };

  // Video picker functions
  const pickVideo = async (type: 'intro' | 'test') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'intro') {
        setIntroVideo(result.assets[0].uri);
      } else {
        setTestReadingVideo(result.assets[0].uri);
      }
    }
  };

  const recordVideo = async (type: 'intro' | 'test') => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.7,
      videoMaxDuration: type === 'intro' ? 60 : 180, // 1 min for intro, 3 min for test
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'intro') {
        setIntroVideo(result.assets[0].uri);
      } else {
        setTestReadingVideo(result.assets[0].uri);
      }
    }
  };

  const validateStep1 = () => {
    if (!fullName.trim()) {
      Alert.alert('Required', 'Please enter your full name');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your email');
      return false;
    }
    if (!password || password.length < 6) {
      Alert.alert('Required', 'Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    if (!experienceYears) {
      Alert.alert('Required', 'Please enter years of experience');
      return false;
    }
    if (!profilePicture) {
      Alert.alert('Required', 'Please add a profile picture');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (selectedSpecialties.length === 0) {
      Alert.alert('Required', 'Please select at least one specialty');
      return false;
    }
    if (selectedMethods.length === 0) {
      Alert.alert('Required', 'Please select at least one reading method');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!bio.trim() || bio.length < 50) {
      Alert.alert('Required', 'Please write at least 50 characters about yourself');
      return false;
    }
    if (!introVideo) {
      Alert.alert('Required', 'Please record an introductory video');
      return false;
    }
    if (!testReadingVideo) {
      Alert.alert('Required', 'Please record a test reading video');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      submitApplication();
    }
  };

  const submitApplication = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/psychic-portal/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          full_name: fullName,
          email: email,
          password: password,
          phone: phone,
          experience_years: parseInt(experienceYears),
          specialties: selectedSpecialties,
          reading_methods: selectedMethods,
          bio: bio,
          chat_rate: parseFloat(chatRate),
          phone_rate: parseFloat(phoneRate),
          video_rate: parseFloat(videoRate),
          profile_picture: profilePicture,
          intro_video_url: introVideo,
          test_reading_video_url: testReadingVideo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to submit application');
      }

      Alert.alert(
        'Application Submitted! 🎉',
        'Thank you for applying! We\'ll review your application and get back to you within 2-5 business days.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <>
      <Text style={styles.stepTitle}>Basic Information</Text>

      {/* Profile Picture */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Profile Picture *</Text>
        <View style={styles.profilePictureContainer}>
          {profilePicture ? (
            <Image source={{ uri: profilePicture }} style={styles.profilePicturePreview} />
          ) : (
            <View style={styles.profilePicturePlaceholder}>
              <Ionicons name="person" size={40} color={COLORS.textMuted} />
            </View>
          )}
          <View style={styles.profilePictureButtons}>
            <TouchableOpacity style={styles.pictureButton} onPress={pickImage}>
              <Ionicons name="image" size={20} color={COLORS.primary} />
              <Text style={styles.pictureButtonText}>Upload Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pictureButton} onPress={takePhoto}>
              <Ionicons name="camera" size={20} color={COLORS.primary} />
              <Text style={styles.pictureButtonText}>Take Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Your full name"
          placeholderTextColor={COLORS.textMuted}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Password *</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Create a password (min 6 characters)"
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Confirm Password *</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm your password"
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone (Optional)</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 (555) 000-0000"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Years of Experience *</Text>
        <TextInput
          style={styles.input}
          value={experienceYears}
          onChangeText={setExperienceYears}
          placeholder="e.g., 5"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
        />
      </View>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={styles.stepTitle}>Your Expertise</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Specialties * (Select all that apply)</Text>
        <View style={styles.tagsGrid}>
          {SPECIALTIES.map((specialty) => (
            <TouchableOpacity
              key={specialty}
              style={[
                styles.tagButton,
                selectedSpecialties.includes(specialty) && styles.tagButtonSelected,
              ]}
              onPress={() => toggleSpecialty(specialty)}
            >
              <Text style={[
                styles.tagText,
                selectedSpecialties.includes(specialty) && styles.tagTextSelected,
              ]}>
                {specialty}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Reading Methods * (Select all you offer)</Text>
        <View style={styles.methodsRow}>
          {READING_METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodCard,
                selectedMethods.includes(method.id) && styles.methodCardSelected,
              ]}
              onPress={() => toggleMethod(method.id)}
            >
              <Ionicons
                name={method.icon as any}
                size={28}
                color={selectedMethods.includes(method.id) ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[
                styles.methodLabel,
                selectedMethods.includes(method.id) && styles.methodLabelSelected,
              ]}>
                {method.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={styles.stepTitle}>Profile & Rates</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>About You * (Min 50 characters)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell seekers about your experience, approach, and what makes you unique..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{bio.length} characters</Text>
      </View>

      {/* Introductory Video */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Introductory Video * (Max 1 min)</Text>
        <Text style={styles.inputHint}>This video will appear on your profile</Text>
        <View style={styles.videoUploadContainer}>
          {introVideo ? (
            <View style={styles.videoPreview}>
              <Ionicons name="checkmark-circle" size={40} color={COLORS.online} />
              <Text style={styles.videoPreviewText}>Video Added</Text>
              <TouchableOpacity onPress={() => setIntroVideo(null)}>
                <Text style={styles.removeVideoText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.videoButtons}>
              <TouchableOpacity style={styles.videoButton} onPress={() => recordVideo('intro')}>
                <Ionicons name="videocam" size={24} color={COLORS.primary} />
                <Text style={styles.videoButtonText}>Record Video</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.videoButton} onPress={() => pickVideo('intro')}>
                <Ionicons name="cloud-upload" size={24} color={COLORS.primary} />
                <Text style={styles.videoButtonText}>Upload Video</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Test Reading Video */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Test Reading Video * (Max 3 min)</Text>
        <Text style={styles.inputHint}>Record a sample reading for review</Text>
        <View style={styles.videoUploadContainer}>
          {testReadingVideo ? (
            <View style={styles.videoPreview}>
              <Ionicons name="checkmark-circle" size={40} color={COLORS.online} />
              <Text style={styles.videoPreviewText}>Video Added</Text>
              <TouchableOpacity onPress={() => setTestReadingVideo(null)}>
                <Text style={styles.removeVideoText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.videoButtons}>
              <TouchableOpacity style={styles.videoButton} onPress={() => recordVideo('test')}>
                <Ionicons name="videocam" size={24} color={COLORS.primary} />
                <Text style={styles.videoButtonText}>Record Video</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.videoButton} onPress={() => pickVideo('test')}>
                <Ionicons name="cloud-upload" size={24} color={COLORS.primary} />
                <Text style={styles.videoButtonText}>Upload Video</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.ratesTitle}>Set Your Rates (Per Minute)</Text>
      <Text style={styles.ratesSubtitle}>You receive 40% of each rate</Text>

      {selectedMethods.includes('chat') && (
        <View style={styles.rateRow}>
          <View style={styles.rateIcon}>
            <Ionicons name="chatbubble" size={20} color={COLORS.chatGreen} />
          </View>
          <Text style={styles.rateLabel}>Chat Rate</Text>
          <View style={styles.rateInput}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.rateValue}
              value={chatRate}
              onChangeText={setChatRate}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      )}

      {selectedMethods.includes('phone') && (
        <View style={styles.rateRow}>
          <View style={styles.rateIcon}>
            <Ionicons name="call" size={20} color={COLORS.phoneRose} />
          </View>
          <Text style={styles.rateLabel}>Phone Rate</Text>
          <View style={styles.rateInput}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.rateValue}
              value={phoneRate}
              onChangeText={setPhoneRate}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      )}

      {selectedMethods.includes('video') && (
        <View style={styles.rateRow}>
          <View style={styles.rateIcon}>
            <Ionicons name="videocam" size={20} color={COLORS.videoPlum} />
          </View>
          <Text style={styles.rateLabel}>Video Rate</Text>
          <View style={styles.rateInput}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.rateValue}
              value={videoRate}
              onChangeText={setVideoRate}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      )}
    </>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Application</Text>
        <Text style={styles.stepIndicator}>Step {step}/3</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${(step / 3) * 100}%` }]} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      {/* Footer Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          disabled={isLoading}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.nextButtonGradient}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {step === 3 ? 'Submit Application' : 'Continue'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
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
    paddingBottom: SPACING.sm,
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
  stepIndicator: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  progressContainer: {
    height: 4,
    backgroundColor: COLORS.border,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tagButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagButtonSelected: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  tagText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  tagTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  methodsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  methodCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderRadius: 14,
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  methodCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  methodLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  methodLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  ratesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  ratesSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginLeft: SPACING.md,
  },
  rateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dollarSign: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  rateValue: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    minWidth: 50,
    textAlign: 'right',
  },
  footer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  nextButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  // Profile Picture Styles
  profilePictureContainer: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  profilePicturePreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  profilePicturePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  profilePictureButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  pictureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 6,
  },
  pictureButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  // Video Upload Styles
  videoUploadContainer: {
    marginTop: SPACING.sm,
  },
  videoButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  videoButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    gap: 8,
  },
  videoButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  videoPreview: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.online,
    gap: 8,
  },
  videoPreviewText: {
    color: COLORS.online,
    fontSize: 16,
    fontWeight: '600',
  },
  removeVideoText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  inputHint: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: SPACING.sm,
  },
});
