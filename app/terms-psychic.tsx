import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../src/constants/theme';

export default function PsychicTermsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Psychic Advisor Agreement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Introduction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Welcome, Psychic Advisor</Text>
          <Text style={styles.paragraph}>
            Thank you for joining our platform as a Psychic Advisor. This agreement outlines
            your responsibilities, service standards, and the policies that govern your
            participation on our platform. By providing readings on this platform, you agree
            to adhere to the following terms and conditions.
          </Text>
        </View>

        {/* Service Standards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Service Standards</Text>
          
          <View style={styles.subSection}>
            <Text style={styles.subTitle}>1.1 Quality of Readings</Text>
            <Text style={styles.paragraph}>
              You are expected to provide thoughtful, compassionate, and professional
              readings to all clients. Each reading should demonstrate genuine effort
              and meaningful insight. Generic or dismissive responses are not acceptable
              and may result in account review.
            </Text>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>1.2 Response Times</Text>
            <Text style={styles.paragraph}>
              • <Text style={styles.bold}>Standard Questions ($12):</Text> Must be answered
              within 24 hours of acceptance.
            </Text>
            <Text style={styles.paragraph}>
              • <Text style={styles.bold}>Emergency Questions ($20):</Text> Must be answered
              within 1 hour of acceptance.
            </Text>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>1.3 Video Answer Requirements</Text>
            <Text style={styles.paragraph}>
              Video answers must be a minimum of 3 minutes for standard questions and
              5 minutes for emergency questions. The video must directly address the
              client's question with clear, audible speech and appropriate lighting.
            </Text>
          </View>
        </View>

        {/* Mandatory Completion Policy - Critical Section */}
        <View style={[styles.section, styles.criticalSection]}>
          <View style={styles.criticalHeader}>
            <Ionicons name="warning" size={24} color={COLORS.error} />
            <Text style={[styles.sectionTitle, { color: COLORS.error, marginLeft: 8 }]}>
              2. Mandatory Completion Policy
            </Text>
          </View>
          
          <View style={styles.highlightBox}>
            <Text style={styles.highlightTitle}>Important Requirement</Text>
            <Text style={styles.highlightText}>
              When you are <Text style={styles.bold}>ONLINE</Text> and have
              <Text style={styles.bold}> Recorded Readings</Text> enabled in your settings,
              you are <Text style={styles.bold}>REQUIRED</Text> to complete all incoming
              paid video questions. There is no option to decline.
            </Text>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>2.1 Why This Policy Exists</Text>
            <Text style={styles.paragraph}>
              Clients pay for their questions upfront. When they see you are online
              and available for recorded readings, they expect their question to be
              answered. Declining paid questions while actively accepting them creates
              a poor client experience and damages platform trust.
            </Text>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>2.2 Your Options</Text>
            <Text style={styles.paragraph}>
              • <Text style={styles.bold}>Go Offline:</Text> If you cannot accept new
              questions, set your status to offline.
            </Text>
            <Text style={styles.paragraph}>
              • <Text style={styles.bold}>Disable Recorded Readings:</Text> Turn off the
              "Accept Video Questions" toggle in your Settings.
            </Text>
            <Text style={styles.paragraph}>
              • <Text style={styles.bold}>Vacation Mode:</Text> Enable vacation mode for
              extended breaks.
            </Text>
          </View>
        </View>

        {/* Suspension Policy - Critical Section */}
        <View style={[styles.section, styles.warningSection]}>
          <View style={styles.criticalHeader}>
            <Ionicons name="ban" size={24} color="#DC2626" />
            <Text style={[styles.sectionTitle, { color: '#DC2626', marginLeft: 8 }]}>
              3. Five-Day Suspension Policy
            </Text>
          </View>

          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Account Suspension Terms</Text>
            <Text style={styles.warningText}>
              Failure to complete a paid video question within the required timeframe
              while you were online and had recorded readings enabled will result in
              an <Text style={styles.bold}>automatic 5-day account suspension</Text>.
            </Text>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>3.1 What Triggers Suspension</Text>
            <Text style={styles.paragraph}>
              • Missing the deadline for a Standard question (24 hours)
            </Text>
            <Text style={styles.paragraph}>
              • Missing the deadline for an Emergency question (1 hour)
            </Text>
            <Text style={styles.paragraph}>
              • Submitting an incomplete or placeholder video response
            </Text>
            <Text style={styles.paragraph}>
              • Submitting a video that does not address the client's question
            </Text>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>3.2 During Suspension</Text>
            <Text style={styles.paragraph}>
              • Your profile will be hidden from all search results
            </Text>
            <Text style={styles.paragraph}>
              • You cannot receive new questions or reading requests
            </Text>
            <Text style={styles.paragraph}>
              • Existing accepted questions must still be completed
            </Text>
            <Text style={styles.paragraph}>
              • You can still access your earnings and dashboard
            </Text>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>3.3 Repeat Violations</Text>
            <Text style={styles.paragraph}>
              • <Text style={styles.bold}>2nd violation:</Text> 10-day suspension
            </Text>
            <Text style={styles.paragraph}>
              • <Text style={styles.bold}>3rd violation:</Text> 30-day suspension
            </Text>
            <Text style={styles.paragraph}>
              • <Text style={styles.bold}>4th violation:</Text> Permanent account termination
            </Text>
          </View>
        </View>

        {/* Compensation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Compensation & Payouts</Text>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>4.1 Revenue Split</Text>
            <Text style={styles.paragraph}>
              You receive <Text style={styles.bold}>40%</Text> of all earnings from
              readings. The platform retains 60% to cover payment processing, marketing,
              customer support, and platform maintenance.
            </Text>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>4.2 Payout Schedule</Text>
            <Text style={styles.paragraph}>
              • Minimum withdrawal: $50
            </Text>
            <Text style={styles.paragraph}>
              • Payout methods: Bank transfer, PayPal
            </Text>
            <Text style={styles.paragraph}>
              • Processing time: 3-5 business days
            </Text>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>4.3 Refund Deductions</Text>
            <Text style={styles.paragraph}>
              If a client requests a refund due to poor service quality and the
              refund is approved, the corresponding amount will be deducted from
              your available balance.
            </Text>
          </View>
        </View>

        {/* New Client Policy */}
        <View style={[styles.section, styles.rewardSection]}>
          <View style={styles.rewardHeader}>
            <Ionicons name="people" size={24} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, { color: COLORS.primary, marginLeft: 8 }]}>
              5. New Client Policy (Mandatory)
            </Text>
          </View>

          <View style={styles.rewardBox}>
            <Text style={styles.rewardTitle}>4 Minutes Free for New Clients</Text>
            <Text style={styles.rewardText}>
              All advisors are required to provide 4 free minutes to new clients
              on their very first reading. This policy is mandatory.
            </Text>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>5.1 How It Works</Text>
            <Text style={styles.paragraph}>
              • <Text style={styles.bold}>New clients only:</Text> The first 4 minutes are free
              only for a client's very first reading on the platform.
            </Text>
            <Text style={styles.paragraph}>
              • <Text style={styles.bold}>Notification:</Text> You will see a "New Client" indicator
              when connecting with a first-time user.
            </Text>
            <Text style={styles.paragraph}>
              • <Text style={styles.bold}>After 4 minutes:</Text> The session converts to your standard
              paid rate. The client is notified to add time to continue.
            </Text>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>5.2 Why This Matters</Text>
            <Text style={styles.paragraph}>
              • First impressions lead to loyal, returning clients
            </Text>
            <Text style={styles.paragraph}>
              • New clients who have a great experience become long-term customers
            </Text>
            <Text style={styles.paragraph}>
              • Quality service during free time builds your reputation and reviews
            </Text>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>5.3 Mandatory Participation</Text>
            <Text style={styles.paragraph}>
              This policy is <Text style={styles.bold}>mandatory for all advisors</Text>. There is no
              opt-out option. By accepting readings on this platform, you agree to provide
              new clients with their first 4 minutes free.
            </Text>
          </View>
        </View>

        {/* Client Relations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Client Relations</Text>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>6.1 Confidentiality</Text>
            <Text style={styles.paragraph}>
              All client information, questions, and reading content must remain
              strictly confidential. You may not share, discuss, or reference any
              client's reading outside of the platform.
            </Text>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>6.2 Professional Conduct</Text>
            <Text style={styles.paragraph}>
              • No harassment or inappropriate behavior toward clients
            </Text>
            <Text style={styles.paragraph}>
              • No solicitation of clients to platforms outside this service
            </Text>
            <Text style={styles.paragraph}>
              • No promises of guaranteed outcomes
            </Text>
            <Text style={styles.paragraph}>
              • No medical, legal, or financial advice
            </Text>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>6.3 Reviews & Ratings</Text>
            <Text style={styles.paragraph}>
              Clients can leave reviews after each reading. Your average rating
              affects your visibility in search results. Advisors with ratings
              below 3.5 stars may be subject to account review.
            </Text>
          </View>
        </View>

        {/* New Advisor Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. New Advisor Classification</Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>New Advisor Badge</Text>
            <Text style={styles.infoText}>
              Advisors with fewer than 300 completed readings are classified as
              "New Advisors" and receive a special badge on their profile. This
              helps clients identify newer members of our community.
            </Text>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>7.1 Exceptions</Text>
            <Text style={styles.paragraph}>
              Founding advisors (the first 30 advisors to join our platform) are
              exempt from the new advisor classification regardless of their
              reading count, in recognition of their early contribution to
              building our community.
            </Text>
          </View>
        </View>

        {/* Account Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Account Management</Text>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>8.1 Online Status</Text>
            <Text style={styles.paragraph}>
              Your online status should accurately reflect your availability.
              Do not set yourself as "online" if you are not actively available
              to respond to clients.
            </Text>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>8.2 Profile Information</Text>
            <Text style={styles.paragraph}>
              All profile information, including your experience, specialties,
              and bio must be accurate and truthful. Misrepresentation may
              result in account termination.
            </Text>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.subTitle}>8.3 Account Termination</Text>
            <Text style={styles.paragraph}>
              You may deactivate your account at any time. Pending questions must
              be completed before deactivation. Any outstanding balance will be
              paid according to the normal payout schedule.
            </Text>
          </View>
        </View>

        {/* Agreement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Agreement & Updates</Text>
          <Text style={styles.paragraph}>
            By continuing to provide readings on this platform, you acknowledge
            that you have read, understood, and agree to these terms and conditions.
            We may update these terms from time to time, and you will be notified
            of any significant changes via email.
          </Text>
          <Text style={[styles.paragraph, { marginTop: SPACING.md }]}>
            <Text style={styles.bold}>Last Updated:</Text> February 2026
          </Text>
        </View>

        {/* Contact */}
        <View style={[styles.section, styles.contactSection]}>
          <View style={styles.contactIcon}>
            <Ionicons name="mail" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.contactTitle}>Questions or Concerns?</Text>
          <Text style={styles.contactText}>
            If you have any questions about these terms, please contact our
            Advisor Support team at support@sixthsensepsychics.com
          </Text>
        </View>
      </ScrollView>
    </View>
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
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  criticalSection: {
    backgroundColor: COLORS.error + '08',
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.error + '20',
  },
  warningSection: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  criticalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subSection: {
    marginTop: SPACING.md,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  paragraph: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.xs,
  },
  bold: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  highlightBox: {
    backgroundColor: COLORS.error + '15',
    borderRadius: 12,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.error,
    marginBottom: SPACING.xs,
  },
  highlightText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  warningBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: SPACING.xs,
  },
  warningText: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 22,
  },
  infoBox: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  rewardSection: {
    backgroundColor: COLORS.online + '08',
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.online + '20',
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  rewardBox: {
    backgroundColor: COLORS.online + '15',
    borderRadius: 12,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.online,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.online,
    marginBottom: SPACING.xs,
  },
  rewardText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  contactSection: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  contactText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
