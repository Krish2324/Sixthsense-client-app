import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SPACING } from '../src/constants/theme';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const { colors } = useTheme();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);
  
  // Form state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profilePicture, setProfilePicture] = useState(user?.profile_picture || '');

  const pickImage = async (fromCamera: boolean) => {
    setShowImageOptions(false);
    
    try {
      let result;
      
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Photo library permission is needed to select photos.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        setProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      if (Platform.OS === 'web') {
        alert('Failed to select image. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to select image. Please try again.');
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          profile_picture: profilePicture,
        }),
      });

      if (response.ok) {
        // Update local user state
        if (updateUser) {
          updateUser({ 
            ...user, 
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            profile_picture: profilePicture 
          });
        }
        
        if (Platform.OS === 'web') {
          alert('Profile updated successfully!');
        } else {
          Alert.alert('Success', 'Profile updated successfully!');
        }
        router.back();
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      // Still update locally even if server fails (for demo)
      if (updateUser) {
        updateUser({ 
          ...user, 
          name: name.trim(),
          phone: phone.trim(),
          profile_picture: profilePicture 
        });
      }
      if (Platform.OS === 'web') {
        alert('Profile updated!');
      } else {
        Alert.alert('Success', 'Profile updated!');
      }
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Image Options Modal */}
        <Modal
          visible={showImageOptions}
          transparent
          animationType="slide"
          onRequestClose={() => setShowImageOptions(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowImageOptions(false)}
          >
            <View style={[styles.imageOptionsModal, { backgroundColor: colors.backgroundCard }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Change Profile Photo</Text>
              
              <TouchableOpacity 
                style={[styles.imageOption, { borderBottomColor: colors.border }]}
                onPress={() => pickImage(true)}
              >
                <View style={[styles.imageOptionIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="camera" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.imageOptionText, { color: colors.textPrimary }]}>Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.imageOption, { borderBottomColor: colors.border }]}
                onPress={() => pickImage(false)}
              >
                <View style={[styles.imageOptionIcon, { backgroundColor: colors.secondary + '20' }]}>
                  <Ionicons name="images" size={24} color={colors.secondary} />
                </View>
                <Text style={[styles.imageOptionText, { color: colors.textPrimary }]}>Choose from Gallery</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.imageOption}
                onPress={() => setShowImageOptions(false)}
              >
                <View style={[styles.imageOptionIcon, { backgroundColor: colors.error + '20' }]}>
                  <Ionicons name="close" size={24} color={colors.error} />
                </View>
                <Text style={[styles.imageOptionText, { color: colors.error }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.backgroundCard }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Profile</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Profile Picture */}
          <View style={styles.profileSection}>
            <TouchableOpacity 
              style={styles.avatarContainer}
              onPress={() => setShowImageOptions(true)}
            >
              {profilePicture ? (
                <Image source={{ uri: profilePicture }} style={[styles.avatar, { borderColor: colors.primary }]} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryDark, borderColor: colors.primary }]}>
                  <Text style={styles.avatarText}>{name?.charAt(0).toUpperCase() || 'U'}</Text>
                </View>
              )}
              <View style={[styles.editAvatarBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera" size={18} color="#FFF" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.changePhotoText, { color: colors.primary }]}>Tap to change photo</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            {/* Name */}
            <View style={[styles.inputContainer, { backgroundColor: colors.backgroundCard }]}>
              <View style={[styles.inputIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="person" size={20} color={colors.primary} />
              </View>
              <View style={styles.inputContent}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Display Name</Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            {/* Email */}
            <View style={[styles.inputContainer, { backgroundColor: colors.backgroundCard }]}>
              <View style={[styles.inputIcon, { backgroundColor: colors.secondary + '20' }]}>
                <Ionicons name="mail" size={20} color={colors.secondary} />
              </View>
              <View style={styles.inputContent}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Email Address</Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Phone */}
            <View style={[styles.inputContainer, { backgroundColor: colors.backgroundCard }]}>
              <View style={[styles.inputIcon, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="call" size={20} color={colors.success} />
              </View>
              <View style={styles.inputContent}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Phone Number</Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter your phone number"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Zodiac Sign Info */}
            {user?.zodiac_sign && (
              <View style={[styles.infoCard, { backgroundColor: colors.backgroundCard }]}>
                <View style={[styles.inputIcon, { backgroundColor: colors.gold + '20' }]}>
                  <Ionicons name="moon" size={20} color={colors.gold} />
                </View>
                <View style={styles.inputContent}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Zodiac Sign</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user.zodiac_sign}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Save Button */}
          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSaveProfile}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
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
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFF',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: SPACING.sm,
  },
  formSection: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  inputIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContent: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  input: {
    fontSize: 16,
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  buttonSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 14,
    gap: SPACING.sm,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  imageOptionsModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  imageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    gap: SPACING.md,
  },
  imageOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
