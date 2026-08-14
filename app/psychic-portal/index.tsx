import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';

export default function PsychicPortalIndex() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  // Check if user is an approved psychic
  const isPsychic = user?.is_psychic || false;

  const benefits = [
    {
      icon: 'cash',
      title: 'Earn Money',
      description: 'Set your own rates and earn 40% of each session',
    },
    {
      icon: 'time',
      title: 'Flexible Schedule',
      description: 'Work when you want, from anywhere',
    },
    {
      icon: 'people',
      title: 'Growing Community',
      description: 'Connect with thousands of seekers worldwide',
    },
    {
      icon: 'shield-checkmark',
      title: 'Safe Platform',
      description: 'Secure payments and dispute protection',
    },
  ];

  if (isPsychic) {
    // Redirect to dashboard
    router.replace('/psychic-portal/dashboard');
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Become a Psychic</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="sparkles" size={48} color={COLORS.secondary} />
          </View>
          <Text style={styles.heroTitle}>Share Your Gift</Text>
          <Text style={styles.heroSubtitle}>
            Join our community of trusted psychic advisors and help people find clarity
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Why Join Us?</Text>
          {benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitCard}>
              <View style={styles.benefitIcon}>
                <Ionicons name={benefit.icon as any} size={24} color={COLORS.primary} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDescription}>{benefit.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Requirements */}
        <View style={styles.requirementsSection}>
          <Text style={styles.sectionTitle}>Requirements</Text>
          <View style={styles.requirementsList}>
            <View style={styles.requirementItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.online} />
              <Text style={styles.requirementText}>At least 2 years of experience</Text>
            </View>
            <View style={styles.requirementItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.online} />
              <Text style={styles.requirementText}>Reliable internet connection</Text>
            </View>
            <View style={styles.requirementItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.online} />
              <Text style={styles.requirementText}>Quiet workspace for sessions</Text>
            </View>
            <View style={styles.requirementItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.online} />
              <Text style={styles.requirementText}>Commitment to client satisfaction</Text>
            </View>
          </View>
        </View>

        {/* Earnings Info */}
        <View style={styles.earningsCard}>
          <LinearGradient
            colors={[COLORS.primaryDark, COLORS.primary]}
            style={styles.earningsGradient}
          >
            <Ionicons name="wallet" size={32} color="#FFF" />
            <Text style={styles.earningsTitle}>Earn Up To</Text>
            <Text style={styles.earningsAmount}>$50+/hour</Text>
            <Text style={styles.earningsSubtitle}>Top advisors earn even more!</Text>
          </LinearGradient>
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={styles.applyButton}
          onPress={() => router.push('/psychic-portal/apply')}
        >
          <LinearGradient
            colors={[COLORS.secondary, COLORS.secondaryDark]}
            style={styles.applyButtonGradient}
          >
            <Text style={styles.applyButtonText}>Start Your Application</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.noteText}>
          Application review takes 2-5 business days
        </Text>
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
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  heroIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  heroSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  benefitsSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  benefitDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  requirementsSection: {
    marginBottom: SPACING.lg,
  },
  requirementsList: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  requirementText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  earningsCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  earningsGradient: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  earningsTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: SPACING.sm,
  },
  earningsAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFF',
  },
  earningsSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  applyButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  applyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  noteText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
