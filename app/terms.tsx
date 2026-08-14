import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';

const TERMS_SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    content: `By accessing and using Sixth Sense ("the App"), you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use the App.

These terms apply to all users of the App, including clients seeking readings and spiritual advisors providing services.`
  },
  {
    title: '2. Service Description',
    content: `Sixth Sense provides a platform connecting users with spiritual advisors for entertainment and psychic readings purposes. Services include:

• Live chat readings
• Phone call sessions
• Video consultations
• Recorded video responses

Readings are provided for entertainment purposes only and should not be considered a substitute for professional advice including medical, legal, financial, or psychological counseling.`
  },
  {
    title: '3. User Accounts',
    content: `To use certain features of the App, you must create an account. You agree to:

• Provide accurate and complete information
• Maintain the security of your account credentials
• Notify us immediately of any unauthorized access
• Accept responsibility for all activities under your account

We reserve the right to suspend or terminate accounts that violate these terms.`
  },
  {
    title: '4. Payment Terms',
    content: `• Credits are purchased in advance and used to pay for readings
• Rates are set by individual spiritual advisors and displayed before sessions
• Connection fees apply: Chat ($0.00), Phone ($0.50), Video ($1.00)
• Refunds may be requested within 24 hours for technical issues
• Unused credits do not expire
• The platform retains 60% of session fees; advisors receive 40%`
  },
  {
    title: '5. User Conduct',
    content: `Users agree not to:

• Use the App for any illegal purpose
• Harass, abuse, or harm other users or advisors
• Share explicit, offensive, or inappropriate content
• Attempt to circumvent payment systems
• Create multiple accounts to abuse promotions
• Record sessions without consent of all parties

Violation of these rules may result in immediate account suspension.`
  },
  {
    title: '6. Advisor Terms',
    content: `Psychic advisors on our platform agree to:

• Provide readings in good faith for entertainment purposes
• Maintain professional conduct at all times
• Not make guarantees or predictions about health, legal matters, or finances
• Respect client privacy and confidentiality
• Comply with all applicable laws and regulations

Advisors are independent contractors, not employees of Sixth Sense.`
  },
  {
    title: '7. Privacy & Data',
    content: `We collect and process personal data as described in our Privacy Policy. Key points:

• We encrypt all communications and payment information
• Chat logs may be reviewed for quality assurance
• We do not sell personal data to third parties
• Users may request data deletion by contacting support

By using the App, you consent to our data practices.`
  },
  {
    title: '8. Disclaimers',
    content: `IMPORTANT DISCLAIMERS:

• Readings are for entertainment purposes only
• We make no guarantees about the accuracy of readings
• Psychic advisors are not licensed professionals
• Do not make important life decisions based solely on readings
• Seek appropriate professional advice for medical, legal, or financial matters

THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.`
  },
  {
    title: '9. Limitation of Liability',
    content: `To the maximum extent permitted by law, Sixth Sense shall not be liable for:

• Any indirect, incidental, or consequential damages
• Loss of profits, data, or business opportunities
• Actions or advice given by spiritual advisors
• Technical issues or service interruptions

Our total liability shall not exceed the amount paid by you in the last 30 days.`
  },
  {
    title: '10. Changes to Terms',
    content: `We reserve the right to modify these Terms at any time. Changes will be effective upon posting to the App. Continued use of the App after changes constitutes acceptance of the new terms.

We will notify users of significant changes via email or in-app notification.`
  },
  {
    title: '11. Contact Information',
    content: `For questions about these Terms, please contact us:

• Email: support@sixthsensepsychics.com
• In-App: Support Center
• Response Time: 24-48 hours

Last Updated: February 2026`
  },
];

export default function TermsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Terms & Conditions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Intro */}
        <View style={[styles.introCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
          <Ionicons name="document-text" size={24} color={colors.primary} />
          <Text style={[styles.introTitle, { color: colors.textPrimary }]}>Terms of Service</Text>
          <Text style={[styles.introText, { color: colors.textSecondary }]}>
            Please read these terms carefully before using Sixth Sense.
          </Text>
          <Text style={[styles.lastUpdated, { color: colors.textMuted }]}>Last updated: February 2026</Text>
        </View>

        {/* Terms Sections */}
        {TERMS_SECTIONS.map((section, index) => (
          <View key={index} style={[styles.section, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{section.title}</Text>
            <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>{section.content}</Text>
          </View>
        ))}

        {/* Agreement Footer */}
        <View style={[styles.agreementFooter, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          <Text style={[styles.agreementText, { color: colors.textPrimary }]}>
            By using Sixth Sense, you agree to these Terms & Conditions.
          </Text>
        </View>

        {/* Contact Support */}
        <TouchableOpacity 
          style={[styles.supportButton, { borderColor: colors.primary }]}
          onPress={() => router.push('/support')}
        >
          <Ionicons name="help-circle" size={20} color={colors.primary} />
          <Text style={[styles.supportButtonText, { color: colors.primary }]}>Have Questions? Contact Support</Text>
        </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
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
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  introCard: {
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  introText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  lastUpdated: {
    fontSize: 12,
    marginTop: SPACING.sm,
  },
  section: {
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
  },
  agreementFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    gap: SPACING.sm,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  agreementText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 2,
    gap: SPACING.sm,
  },
  supportButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
