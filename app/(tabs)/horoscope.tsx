import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { InsightsSEO } from '../../src/components/SEO';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const ZODIAC_SIGNS = [
  { name: 'Aries', symbol: '♈', dates: 'Mar 21 - Apr 19', element: 'fire' },
  { name: 'Taurus', symbol: '♉', dates: 'Apr 20 - May 20', element: 'earth' },
  { name: 'Gemini', symbol: '♊', dates: 'May 21 - Jun 20', element: 'air' },
  { name: 'Cancer', symbol: '♋', dates: 'Jun 21 - Jul 22', element: 'water' },
  { name: 'Leo', symbol: '♌', dates: 'Jul 23 - Aug 22', element: 'fire' },
  { name: 'Virgo', symbol: '♍', dates: 'Aug 23 - Sep 22', element: 'earth' },
  { name: 'Libra', symbol: '♎', dates: 'Sep 23 - Oct 22', element: 'air' },
  { name: 'Scorpio', symbol: '♏', dates: 'Oct 23 - Nov 21', element: 'water' },
  { name: 'Sagittarius', symbol: '♐', dates: 'Nov 22 - Dec 21', element: 'fire' },
  { name: 'Capricorn', symbol: '♑', dates: 'Dec 22 - Jan 19', element: 'earth' },
  { name: 'Aquarius', symbol: '♒', dates: 'Jan 20 - Feb 18', element: 'air' },
  { name: 'Pisces', symbol: '♓', dates: 'Feb 19 - Mar 20', element: 'water' },
];

const ELEMENT_COLORS: { [key: string]: string } = {
  fire: '#FF6B6B',
  earth: '#4ECDC4',
  air: '#9B7BD4',
  water: '#5DA5DA',
};

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [selectedSign, setSelectedSign] = useState<string>(user?.zodiac_sign || 'Aries');
  const [insights, setInsightsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSignPicker, setShowSignPicker] = useState(false);

  const currentSignData = ZODIAC_SIGNS.find(s => s.name === selectedSign) || ZODIAC_SIGNS[0];

  const fetchInsightsData = async (sign: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/horoscope/${sign.toLowerCase()}?use_ai=true`);
      const data = await response.json();
      // Backend returns data in 'horoscope' field
      setInsightsData(data.horoscope);
    } catch (error) {
      console.error('Error fetching insights:', error);
      // Use fallback
      setInsightsData({
        overall: "The stars align in your favor today. Trust your intuition and embrace new opportunities.",
        love: "Romance blooms when you least expect it. Open your heart to possibilities.",
        career: "Your dedication will be recognized. Stay focused on your goals.",
        lucky_numbers: [7, 14, 21],
        message: "Trust the journey."
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsightsData(selectedSign);
  }, [selectedSign]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInsightsData(selectedSign);
    setRefreshing(false);
  };

  const handleSignSelect = (sign: string) => {
    setSelectedSign(sign);
    setShowSignPicker(false);
    setIsLoading(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* SEO Meta Tags */}
      <InsightsSEO sign={selectedSign} />
      
      {/* Fixed Header */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top + SPACING.sm, backgroundColor: colors.background }]}>
        <Text style={[styles.fixedHeaderTitle, { color: colors.textPrimary }]}>Insights</Text>
        <Text style={[styles.fixedHeaderDate, { color: colors.textSecondary }]}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SPACING.xl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Zodiac Sign Selector */}
        <TouchableOpacity 
          style={styles.zodiacCard}
          onPress={() => setShowSignPicker(!showSignPicker)}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[ELEMENT_COLORS[currentSignData.element], '#5E35B1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.zodiacGradient}
          >
            <Text style={styles.zodiacSymbol}>{currentSignData.symbol}</Text>
            <View style={styles.zodiacInfo}>
              <Text style={styles.zodiacName}>{currentSignData.name}</Text>
              <Text style={styles.zodiacDates}>{currentSignData.dates}</Text>
            </View>
            <Ionicons 
              name={showSignPicker ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color="rgba(255,255,255,0.8)" 
            />
          </LinearGradient>
        </TouchableOpacity>

        {/* Sign Picker */}
        {showSignPicker && (
          <View style={[styles.signPicker, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <View style={styles.signGrid}>
              {ZODIAC_SIGNS.map((sign) => (
                <TouchableOpacity
                  key={sign.name}
                  style={[
                    styles.signOption,
                    { backgroundColor: colors.backgroundElevated },
                    selectedSign === sign.name && { backgroundColor: colors.primary + '20' },
                    { borderColor: ELEMENT_COLORS[sign.element] }
                  ]}
                  onPress={() => handleSignSelect(sign.name)}
                >
                  <Text style={styles.signOptionSymbol}>{sign.symbol}</Text>
                  <Text style={[
                    styles.signOptionName,
                    { color: colors.textSecondary },
                    selectedSign === sign.name && { color: colors.primary }
                  ]}>
                    {sign.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Loading State */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Consulting the stars...</Text>
          </View>
        ) : (
          <>
            {/* AI Generated Badge */}
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={14} color={colors.primary} />
              <Text style={[styles.aiBadgeText, { color: colors.primary }]}>AI-Powered Reading</Text>
            </View>

            {/* Insights Sections */}
            <View style={styles.sectionsContainer}>
              <View style={[styles.section, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '30' }]}>
                    <Ionicons name="sparkles" size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Overall Energy</Text>
                </View>
                <Text style={[styles.sectionText, { color: colors.textSecondary }]}>{insights?.overall}</Text>
              </View>

              <View style={[styles.section, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: '#EF4444' + '30' }]}>
                    <Ionicons name="heart" size={20} color="#EF4444" />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Love & Relationships</Text>
                </View>
                <Text style={[styles.sectionText, { color: colors.textSecondary }]}>{insights?.love}</Text>
              </View>

              <View style={[styles.section, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '30' }]}>
                    <Ionicons name="briefcase" size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Career & Finance</Text>
                </View>
                <Text style={[styles.sectionText, { color: colors.textSecondary }]}>{insights?.career}</Text>
              </View>

              {/* Lucky Numbers */}
              {insights?.lucky_numbers && (
                <View style={[styles.luckySection, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <Text style={[styles.luckyTitle, { color: colors.textSecondary }]}>Lucky Numbers</Text>
                  <View style={styles.luckyNumbers}>
                    {insights.lucky_numbers.map((num: number, idx: number) => (
                      <View key={idx} style={[styles.luckyNumber, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.luckyNumberText, { color: colors.primary }]}>{num}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Inspirational Message */}
              {insights?.message && (
                <View style={[styles.messageCard, { backgroundColor: colors.gold + '15', borderColor: colors.gold + '30' }]}>
                  <Ionicons name="sunny" size={24} color={colors.gold} />
                  <Text style={[styles.messageText, { color: colors.textPrimary }]}>"{insights.message}"</Text>
                </View>
              )}
            </View>

            {/* CTA */}
            <View style={[styles.ctaContainer, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <Text style={[styles.ctaTitle, { color: colors.textPrimary }]}>Want a personalized reading?</Text>
              <Text style={[styles.ctaSubtitle, { color: colors.textSecondary }]}>Connect with a psychic for deeper insights</Text>
              <TouchableOpacity 
                style={styles.ctaButton}
                onPress={() => router.push('/(tabs)/home')}
              >
                <LinearGradient
                  colors={[colors.primary, "#5E35B1"]}
                  style={styles.ctaGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.ctaButtonText}>Find Your Advisor</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeader: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  fixedHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  fixedHeaderDate: {
    fontSize: 13,
    marginTop: 2,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  date: {
    fontSize: 14,
    marginTop: 4,
  },
  zodiacCard: {
    marginHorizontal: SPACING.md,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  zodiacGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  zodiacSymbol: {
    fontSize: 48,
  },
  zodiacInfo: {
    flex: 1,
  },
  zodiacName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
  zodiacDates: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  signPicker: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  signOptionSelected: {},
  signOptionSymbol: {
    fontSize: 24,
    marginBottom: 2,
  },
  signOptionName: {
    fontSize: 10,
    fontWeight: '500',
  },
  signOptionNameSelected: {
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: SPACING.md,
  },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionsContainer: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  section: {
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 24,
  },
  luckySection: {
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  luckyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  luckyNumbers: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  luckyNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  luckyNumberText: {
    fontSize: 18,
    fontWeight: '700',
  },
  messageCard: {
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    fontWeight: '500',
  },
  compatibilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
  },
  compatibilityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compatibilityText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  compatibilityTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  compatibilitySubtitle: {
    fontSize: 13,
  },
  ctaContainer: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  ctaButton: {
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  ctaButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
