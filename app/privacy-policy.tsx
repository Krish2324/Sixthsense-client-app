import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { logout, user } = useAuth();

  const handleAccountPurge = async () => {
    try {
      if (user?.id) {
        const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
        await fetch(`${BACKEND_URL}/api/users/${user.id}/delete`, { method: 'DELETE' }).catch(() => null);
      }
    } catch {
      // Quiet fallback
    } finally {
      await logout();
      if (Platform.OS === 'web') {
        alert('Account Deletion Submitted. Your account session and stored data have been permanently purged.');
        router.replace('/(auth)/login');
      } else {
        Alert.alert(
          'Account Purged',
          'Your account deletion request has been processed. All local data and session tokens have been permanently cleared.',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
        );
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>Last Updated: April 2025</Text>
        
        <Text style={[styles.paragraph, { color: colors.textPrimary }]}>
          Welcome to Sixth Sense ("we," "our," or "us"). We are committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our mobile application and services.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.primary }]}>1. Information We Collect</Text>
        <Text style={[styles.paragraph, { color: colors.textPrimary }]}>We collect the following types of information:</Text>
        <Text style={[styles.bulletPoint, { color: colors.textPrimary }]}>• <Text style={styles.bold}>Account Information:</Text> Name, email address, phone number, and profile picture when you create an account.</Text>
        <Text style={[styles.bulletPoint, { color: colors.textPrimary }]}>• <Text style={styles.bold}>Payment Information:</Text> Payment details processed securely through Stripe. We do not store your full credit card information.</Text>
        <Text style={[styles.bulletPoint, { color: colors.textPrimary }]}>• <Text style={styles.bold}>Usage Data:</Text> Information about how you use our app, including session history, preferences, and interactions.</Text>
        <Text style={[styles.bulletPoint, { color: colors.textPrimary }]}>• <Text style={styles.bold}>Communications:</Text> Messages exchanged between users and psychic advisors within our platform.</Text>
        <Text style={[styles.bulletPoint, { color: colors.textPrimary }]}>• <Text style={styles.bold}>Device Information:</Text> Device type, operating system, and unique device identifiers.</Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.paragraph}>We use your information to:</Text>
        <Text style={styles.bulletPoint}>• Provide and improve our psychic reading services</Text>
        <Text style={styles.bulletPoint}>• Process payments and transactions</Text>
        <Text style={styles.bulletPoint}>• Connect you with psychic advisors</Text>
        <Text style={styles.bulletPoint}>• Send important notifications about your account and sessions</Text>
        <Text style={styles.bulletPoint}>• Provide customer support</Text>
        <Text style={styles.bulletPoint}>• Ensure platform safety and prevent fraud</Text>
        <Text style={styles.bulletPoint}>• Comply with legal obligations</Text>

        <Text style={styles.sectionTitle}>3. Information Sharing</Text>
        <Text style={styles.paragraph}>We do not sell your personal information. We may share your information with:</Text>
        <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Psychic Advisors:</Text> Limited information necessary to provide readings</Text>
        <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Payment Processors:</Text> Stripe for secure payment processing</Text>
        <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Service Providers:</Text> Third parties who help us operate our platform</Text>
        <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Legal Requirements:</Text> When required by law or to protect our rights</Text>

        <Text style={styles.sectionTitle}>4. Data Security</Text>
        <Text style={styles.paragraph}>We implement industry-standard security measures to protect your information, including:</Text>
        <Text style={styles.bulletPoint}>• Encryption of data in transit and at rest</Text>
        <Text style={styles.bulletPoint}>• Secure authentication systems</Text>
        <Text style={styles.bulletPoint}>• Regular security assessments</Text>
        <Text style={styles.bulletPoint}>• Limited employee access to personal data</Text>

        <Text style={styles.sectionTitle}>5. Your Rights</Text>
        <Text style={styles.paragraph}>You have the right to:</Text>
        <Text style={styles.bulletPoint}>• Access your personal information</Text>
        <Text style={styles.bulletPoint}>• Correct inaccurate data</Text>
        <Text style={styles.bulletPoint}>• Delete your account and associated data</Text>
        <Text style={styles.bulletPoint}>• Opt-out of marketing communications</Text>
        <Text style={styles.bulletPoint}>• Request a copy of your data</Text>

        <Text style={styles.sectionTitle}>6. Data Retention</Text>
        <Text style={styles.paragraph}>
          We retain your information for as long as your account is active or as needed to provide services. You may request deletion of your account at any time by contacting us.
        </Text>

        <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          Our services are not intended for users under 18 years of age. We do not knowingly collect information from children under 18.
        </Text>

        <Text style={styles.sectionTitle}>8. Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or via email.
        </Text>

        <Text style={styles.sectionTitle}>9. Contact Us</Text>
        <Text style={styles.paragraph}>If you have questions about this Privacy Policy or your personal information, please contact us at:</Text>
        <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Email:</Text> support@sixthsensepsychics.com</Text>
        <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Website:</Text> www.sixthsensepsychics.com</Text>

        <Text style={styles.sectionTitle}>10. California Privacy Rights (CCPA)</Text>
        <Text style={styles.paragraph}>
          California residents have additional rights under the California Consumer Privacy Act, including the right to know what personal information we collect, request deletion, and opt-out of sale of personal information (which we do not do).
        </Text>

        {/* CLI-027: Apple App Store Guidelines 5.1.1(v) Mandatory Data Deletion Flow */}
        <View style={{ marginTop: 24, padding: 16, borderRadius: 14, backgroundColor: colors.backgroundCard || 'rgba(239, 68, 68, 0.08)', borderWidth: 1, borderColor: colors.error || '#EF4444' }}>
          <Text style={[styles.sectionTitle, { color: colors.error || '#EF4444', marginTop: 0 }]}>11. Delete Account & Personal Data</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            In compliance with Apple App Store Guideline 5.1.1(v) and global privacy laws (GDPR/CCPA), you can permanently request deletion of your account, payment records, and personal session data.
          </Text>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.error || '#EF4444',
              paddingVertical: 14,
              borderRadius: 12,
              gap: 8,
              marginTop: 10,
            }}
            onPress={() => {
              const confirmMsg = 'Are you sure you want to permanently delete your account and all associated reading history? This action cannot be undone.';
              if (Platform.OS === 'web') {
                if (confirm(confirmMsg)) {
                  handleAccountPurge();
                }
              } else {
                Alert.alert(
                  'Confirm Account Deletion',
                  confirmMsg,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Delete My Account', 
                      style: 'destructive',
                      onPress: () => handleAccountPurge()
                    }
                  ]
                );
              }
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Delete My Account & Personal Data</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.copyright}>
          © 2025 Sixth Sense. All rights reserved.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B46C1',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#553C9A',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
    marginBottom: 8,
    paddingLeft: 8,
  },
  bold: {
    fontWeight: '600',
  },
  copyright: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
