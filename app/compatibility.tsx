import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING, COLORS } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const ZODIAC_SIGNS = [
  { name: 'Aries', symbol: '♈' },
  { name: 'Taurus', symbol: '♉' },
  { name: 'Gemini', symbol: '♊' },
  { name: 'Cancer', symbol: '♋' },
  { name: 'Leo', symbol: '♌' },
  { name: 'Virgo', symbol: '♍' },
  { name: 'Libra', symbol: '♎' },
  { name: 'Scorpio', symbol: '♏' },
  { name: 'Sagittarius', symbol: '♐' },
  { name: 'Capricorn', symbol: '♑' },
  { name: 'Aquarius', symbol: '♒' },
  { name: 'Pisces', symbol: '♓' },
];

export default function CompatibilityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sign } = useLocalSearchParams();
  const { colors } = useTheme();

  const [yourSign, setYourSign] = useState<string>(sign as string || 'Aries');
  const [partnerSign, setPartnerSign] = useState<string>('');
  const [compatibility, setCompatibility] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkCompatibility = async () => {
    if (!partnerSign) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/insights/compatibility/${yourSign.toLowerCase()}/${partnerSign.toLowerCase()}`
      );
      const data = await response.json();
      setCompatibility(data);
    } catch (error) {
      console.error('Error checking compatibility:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return COLORS.online;
    if (score >= 60) return COLORS.secondary;
    if (score >= 40) return COLORS.warning;
    return COLORS.error;
  };

  const getCompatibilityLabel = (score: number) => {
    if (score >= 90) return 'Soulmates!';
    if (score >= 80) return 'Excellent Match';
    if (score >= 70) return 'Great Compatibility';
    if (score >= 60) return 'Good Match';
    if (score >= 50) return 'Average';
    if (score >= 40) return 'Challenging';
    return 'Opposites Attract?';
  };

  const yourSignData = ZODIAC_SIGNS.find(s => s.name === yourSign);
  const partnerSignData = ZODIAC_SIGNS.find(s => s.name === partnerSign);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Compatibility</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Your Sign */}
        <View style={styles.signSection}>
          <Text style={styles.sectionLabel}>Your Sign</Text>
          <View style={styles.selectedSign}>
            <Text style={styles.selectedSymbol}>{yourSignData?.symbol}</Text>
            <Text style={styles.selectedName}>{yourSign}</Text>
          </View>
        </View>

        {/* Partner Sign Selection */}
        <View style={styles.signSection}>
          <Text style={styles.sectionLabel}>Partner's Sign</Text>
          <View style={styles.signGrid}>
            {ZODIAC_SIGNS.map((s) => (
              <TouchableOpacity
                key={s.name}
                style={[
                  styles.signOption,
                  partnerSign === s.name && styles.signOptionSelected,
                ]}
                onPress={() => setPartnerSign(s.name)}
              >
                <Text style={styles.signSymbol}>{s.symbol}</Text>
                <Text style={[
                  styles.signName,
                  partnerSign === s.name && styles.signNameSelected,
                ]}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Check Button */}
        <TouchableOpacity
          style={[
            styles.checkButton,
            !partnerSign && styles.checkButtonDisabled,
          ]}
          onPress={checkCompatibility}
          disabled={!partnerSign || isLoading}
        >
          <LinearGradient
            colors={partnerSign ? [COLORS.secondary, COLORS.secondaryDark] : [COLORS.textMuted, COLORS.textMuted]}
            style={styles.checkButtonGradient}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="heart-half" size={20} color="#FFF" />
                <Text style={styles.checkButtonText}>Check Compatibility</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Results */}
        {compatibility && (
          <View style={styles.resultsContainer}>
            {/* Score Card */}
            <View style={styles.scoreCard}>
              <View style={styles.signsDisplay}>
                <View style={styles.signCircle}>
                  <Text style={styles.signCircleSymbol}>{yourSignData?.symbol}</Text>
                </View>
                <Ionicons name="heart" size={32} color={COLORS.heart} />
                <View style={styles.signCircle}>
                  <Text style={styles.signCircleSymbol}>{partnerSignData?.symbol}</Text>
                </View>
              </View>

              <View style={styles.scoreContainer}>
                <Text style={[
                  styles.scoreValue,
                  { color: getCompatibilityColor(compatibility.compatibility_score) }
                ]}>
                  {compatibility.compatibility_score}%
                </Text>
                <Text style={styles.scoreLabel}>
                  {getCompatibilityLabel(compatibility.compatibility_score)}
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { 
                        width: `${compatibility.compatibility_score}%`,
                        backgroundColor: getCompatibilityColor(compatibility.compatibility_score)
                      }
                    ]} 
                  />
                </View>
              </View>

              {/* Elements */}
              <View style={styles.elementsRow}>
                <View style={styles.elementBadge}>
                  <Text style={styles.elementText}>
                    {yourSign} ({compatibility.elements?.sign1})
                  </Text>
                </View>
                <Text style={styles.elementConnector}>×</Text>
                <View style={styles.elementBadge}>
                  <Text style={styles.elementText}>
                    {partnerSign} ({compatibility.elements?.sign2})
                  </Text>
                </View>
              </View>
            </View>

            {/* Description */}
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>{compatibility.description}</Text>
            </View>

            {/* CTA */}
            <View style={styles.ctaCard}>
              <Ionicons name="sparkles" size={24} color={COLORS.secondary} />
              <Text style={styles.ctaTitle}>Want deeper insights?</Text>
              <Text style={styles.ctaSubtitle}>
                Get a personalized love reading from our expert advisors
              </Text>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => router.push('/(tabs)/home')}
              >
                <Text style={styles.ctaButtonText}>Find a Love Expert</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  signSection: {
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
  selectedSign: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 14,
    gap: SPACING.md,
  },
  selectedSymbol: {
    fontSize: 36,
  },
  selectedName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  signGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  signOption: {
    width: '23%',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  signOptionSelected: {
    backgroundColor: COLORS.secondary + '20',
    borderColor: COLORS.secondary,
  },
  signSymbol: {
    fontSize: 24,
    marginBottom: 2,
  },
  signName: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  signNameSelected: {
    color: COLORS.secondary,
    fontWeight: '700',
  },
  checkButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  checkButtonDisabled: {
    opacity: 0.7,
  },
  checkButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  checkButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resultsContainer: {
    gap: SPACING.md,
  },
  scoreCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 20,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  signsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  signCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signCircleSymbol: {
    fontSize: 36,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  progressContainer: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  elementsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  elementBadge: {
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  elementText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  elementConnector: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  descriptionCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  descriptionText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
  },
  ctaCard: {
    backgroundColor: COLORS.secondary + '15',
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.secondary + '30',
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  ctaButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
