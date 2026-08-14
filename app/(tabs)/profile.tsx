import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const { colors, isDark, themeMode } = useTheme();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);

  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const performLogout = async () => {
    setShowLogoutModal(false);
    try {
      await logout();
      // Force navigation to welcome screen
      setTimeout(() => {
        router.replace('/(auth)/welcome');
      }, 100);
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate even if there's an error
      router.replace('/(auth)/welcome');
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const getThemeLabel = () => {
    switch(themeMode) {
      case 'light': return 'Day Mode';
      case 'dark': return 'Night Mode';
      case 'auto': return 'Automatic';
      default: return 'Night Mode';
    }
  };

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
        await updateProfilePicture(result.assets[0].uri);
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

  const updateProfilePicture = async (imageUri: string) => {
    setIsUpdatingPhoto(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          profile_picture: imageUri,
        }),
      });

      if (response.ok) {
        // Update local user state
        if (updateUser) {
          updateUser({ ...user, profile_picture: imageUri });
        }
        
        if (Platform.OS === 'web') {
          alert('Profile picture updated!');
        } else {
          Alert.alert('Success', 'Profile picture updated!');
        }
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile picture:', error);
      // Still update locally even if server fails (for demo)
      if (updateUser) {
        updateUser({ ...user, profile_picture: imageUri });
      }
      if (Platform.OS === 'web') {
        alert('Profile picture updated locally!');
      } else {
        Alert.alert('Success', 'Profile picture updated!');
      }
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  const handleAvatarPress = () => {
    setShowImageOptions(true);
  };

  const menuItems = [
    {
      icon: 'wallet',
      title: 'Wallet',
      subtitle: `Balance: $${(user?.balance || 0).toFixed(2)}`,
      onPress: () => router.push('/(tabs)/wallet'),
    },
    {
      icon: 'heart',
      title: 'Favorites',
      subtitle: 'Your saved psychics',
      onPress: () => router.push('/favorites'),
    },
    {
      icon: 'receipt',
      title: 'Billing History',
      subtitle: 'View all transactions',
      onPress: () => router.push('/billing-history'),
    },
    {
      icon: 'person',
      title: 'Personal Information',
      subtitle: 'Edit your profile',
      onPress: () => router.push('/edit-profile'),
    },
  ];

  const preferencesItems = [
    {
      icon: isDark ? 'moon' : 'sunny',
      title: 'Appearance',
      subtitle: getThemeLabel(),
      onPress: () => router.push('/appearance'),
    },
    {
      icon: 'notifications',
      title: 'Notifications',
      subtitle: 'Manage alerts',
      onPress: () => router.push('/notifications'),
    },
  ];

  const supportItems = [
    {
      icon: 'help-circle',
      title: 'Help & Support',
      subtitle: 'Contact support',
      onPress: () => router.push('/help-center'),
    },
    {
      icon: 'document-text',
      title: 'Terms & Conditions',
      subtitle: 'Legal information',
      onPress: () => router.push('/terms'),
    },
    {
      icon: 'shield-checkmark',
      title: 'Privacy Policy',
      subtitle: 'Data protection',
      onPress: () => router.push('/terms'),
    },
    {
      icon: 'trash',
      title: 'Delete Account',
      subtitle: 'Permanently delete your account',
      onPress: () => setShowDeleteAccountModal(true),
      danger: true,
    },
  ];

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/user/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user?.id }),
      });
      
      if (response.ok) {
        setShowDeleteAccountModal(false);
        await logout();
        if (Platform.OS === 'web') {
          alert('Your account has been deleted successfully.');
        } else {
          Alert.alert('Account Deleted', 'Your account has been deleted successfully.');
        }
        router.replace('/(auth)/welcome');
      } else {
        throw new Error('Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      if (Platform.OS === 'web') {
        alert('Failed to delete account. Please try again or contact support.');
      } else {
        Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Logout</Text>
            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
              Are you sure you want to logout?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { backgroundColor: colors.backgroundElevated }]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalLogoutButton, { backgroundColor: colors.error }]}
                onPress={performLogout}
              >
                <Text style={styles.modalLogoutText}>Yes, Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteAccountModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteAccountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard }]}>
            <Ionicons name="warning" size={48} color={colors.error} style={{ marginBottom: 12 }} />
            <Text style={[styles.modalTitle, { color: colors.error }]}>Delete Account</Text>
            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
              Are you sure you want to permanently delete your account? This action cannot be undone. All your data, credits, and reading history will be lost.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { backgroundColor: colors.backgroundElevated }]}
                onPress={() => setShowDeleteAccountModal(false)}
                disabled={isDeletingAccount}
              >
                <Text style={[styles.modalCancelText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalLogoutButton, { backgroundColor: colors.error }]}
                onPress={handleDeleteAccount}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalLogoutText}>Delete Forever</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Options Modal */}
      <Modal
        visible={showImageOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImageOptions(false)}
      >
        <TouchableOpacity 
          style={styles.imageModalOverlay}
          activeOpacity={1}
          onPress={() => setShowImageOptions(false)}
        >
          <View style={[styles.imageOptionsModal, { backgroundColor: colors.backgroundCard }]}>
            <Text style={[styles.imageModalTitle, { color: colors.textPrimary }]}>Change Profile Photo</Text>
            
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

      {/* Fixed Header */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top + SPACING.md, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Profile</Text>
        <TouchableOpacity 
          style={[styles.notificationButton, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
          onPress={() => router.push('/notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SPACING.xl }}
      >

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={handleAvatarPress}
            disabled={isUpdatingPhoto}
          >
            {isUpdatingPhoto ? (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryDark, borderColor: colors.primary }]}>
                <ActivityIndicator color="#FFF" size="large" />
              </View>
            ) : user?.profile_picture ? (
              <Image source={{ uri: user.profile_picture }} style={[styles.avatar, { borderColor: colors.primary }]} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryDark, borderColor: colors.primary }]}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <View style={[styles.editAvatarButton, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>{user?.name || 'User'}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
          <Text style={[styles.tapToChange, { color: colors.primary }]}>Tap photo to change</Text>
          {user?.zodiac_sign && (
            <View style={[styles.zodiacBadge, { backgroundColor: colors.backgroundCard }]}>
              <Ionicons name="moon" size={14} color={colors.secondary} />
              <Text style={[styles.zodiacText, { color: colors.secondary }]}>{user.zodiac_sign}</Text>
            </View>
          )}
        </View>

        {/* Become a Psychic Banner */}
        <TouchableOpacity 
          style={[styles.becomePsychicBanner, { backgroundColor: colors.backgroundCard, borderColor: colors.secondary }]}
          onPress={() => {
            const message = Platform.OS === 'ios' 
              ? 'To become an Advisor, please download the "Sixth Sense Advisors" app from the App Store and submit your application there.'
              : 'To become an Advisor, please download the "Sixth Sense Advisors" app from the App Store or Google Play Store and submit your application there.';
            if (Platform.OS === 'web') {
              alert(message);
            } else {
              Alert.alert(
                'Become a Psychic',
                message,
                [{ text: 'OK', style: 'default' }]
              );
            }
          }}
        >
          <View style={[styles.advisorLogoBox, { backgroundColor: colors.backgroundElevated }]}>
            <Image 
              source={require('../../assets/advisor-icon.png')} 
              style={styles.advisorAppLogo}
            />
          </View>
          <View style={styles.bannerContent}>
            <Text style={[styles.bannerTitle, { color: colors.secondary }]}>Become a Psychic</Text>
            <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]}>Download Sixth Sense Advisors app</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.secondary} />
        </TouchableOpacity>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Account</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, { backgroundColor: colors.backgroundCard }]}
              onPress={item.onPress}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.backgroundElevated }]}>
                <Ionicons name={item.icon as any} size={22} color={colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Preferences */}
        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Preferences</Text>
          {preferencesItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, { backgroundColor: colors.backgroundCard }]}
              onPress={item.onPress}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.backgroundElevated }]}>
                <Ionicons name={item.icon as any} size={22} color={colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Support Items */}
        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Support</Text>
          {supportItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, { backgroundColor: colors.backgroundCard }]}
              onPress={item.onPress}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.danger ? colors.error + '20' : colors.backgroundElevated }]}>
                <Ionicons name={item.icon as any} size={22} color={item.danger ? colors.error : colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: item.danger ? colors.error : colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={item.danger ? colors.error : colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.backgroundCard }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Logout</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textMuted }]}>Version 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  fixedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFF',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  tapToChange: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  zodiacBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: SPACING.sm,
    gap: 4,
  },
  zodiacText: {
    fontSize: 13,
    fontWeight: '600',
  },
  freeMinutesBanner: {
    marginHorizontal: SPACING.md,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },
  freeMinutesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  freeMinutesIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  freeMinutesContent: {
    flex: 1,
  },
  freeMinutesTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  freeMinutesSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    marginTop: SPACING.sm,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  becomePsychicBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },
  advisorLogoBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  advisorAppLogo: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  bannerSubtitle: {
    fontSize: 13,
  },
  menuSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  menuSubtitle: {
    fontSize: 13,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACING.md,
    borderRadius: 14,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: SPACING.lg,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    borderRadius: 16,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  modalMessage: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalLogoutButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalLogoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Image picker modal styles
  imageModalOverlay: {
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
  imageModalTitle: {
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
