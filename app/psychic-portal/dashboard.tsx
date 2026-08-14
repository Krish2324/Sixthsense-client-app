import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function PsychicDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mock psychic ID for demo (would come from user object in production)
  const psychicId = user?.psychic_id || 'psy-demo-001';

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/psychic-portal/dashboard/${psychicId}`);
      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
      } else {
        // Set mock data for demo
        setDashboard({
          total_earnings: 1250.50,
          pending_earnings: 150.00,
          total_readings: 156,
          average_rating: 4.8,
          total_reviews: 89,
          pending_questions: 3,
          active_sessions: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      // Set mock data for demo
      setDashboard({
        total_earnings: 1250.50,
        pending_earnings: 150.00,
        total_readings: 156,
        average_rating: 4.8,
        total_reviews: 89,
        pending_questions: 3,
        active_sessions: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [psychicId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  const toggleOnlineStatus = async (value: boolean) => {
    setIsOnline(value);
    // In production, update status via API
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SPACING.xxl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
          <View>
            <Text style={styles.greeting}>Welcome back!</Text>
            <Text style={styles.name}>{user?.name || 'Advisor'}</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/psychic-portal/settings')}
          >
            <Ionicons name="settings-outline" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Online Toggle */}
        <View style={styles.onlineToggle}>
          <View style={styles.onlineInfo}>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: isOnline ? COLORS.online : COLORS.offline }
            ]} />
            <Text style={styles.onlineLabel}>
              {isOnline ? 'Online - Accepting Clients' : 'Offline'}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={toggleOnlineStatus}
            trackColor={{ false: COLORS.border, true: COLORS.online + '50' }}
            thumbColor={isOnline ? COLORS.online : COLORS.textMuted}
          />
        </View>

        {/* Earnings Card */}
        <View style={styles.earningsCard}>
          <LinearGradient
            colors={[COLORS.primaryDark, COLORS.primary]}
            style={styles.earningsGradient}
          >
            <View style={styles.earningsTop}>
              <Text style={styles.earningsLabel}>Total Earnings</Text>
              <TouchableOpacity
                style={styles.withdrawButton}
                onPress={() => router.push('/psychic-portal/earnings')}
              >
                <Text style={styles.withdrawText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.earningsAmount}>
              ${dashboard?.total_earnings?.toFixed(2) || '0.00'}
            </Text>
            <View style={styles.earningsRow}>
              <View style={styles.earningsStat}>
                <Text style={styles.earningsStatLabel}>Pending</Text>
                <Text style={styles.earningsStatValue}>
                  ${dashboard?.pending_earnings?.toFixed(2) || '0.00'}
                </Text>
              </View>
              <View style={styles.earningsDivider} />
              <View style={styles.earningsStat}>
                <Text style={styles.earningsStatLabel}>This Month</Text>
                <Text style={styles.earningsStatValue}>$0.00</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="chatbubbles" size={28} color={COLORS.primary} />
            <Text style={styles.statValue}>{dashboard?.total_readings || 0}</Text>
            <Text style={styles.statLabel}>Total Readings</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star" size={28} color={COLORS.star} />
            <Text style={styles.statValue}>
              {dashboard?.average_rating?.toFixed(1) || '0.0'}
            </Text>
            <Text style={styles.statLabel}>{dashboard?.total_reviews || 0} Reviews</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          {/* Pending Questions */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/psychic-portal/questions')}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.secondary + '20' }]}>
              <Ionicons name="mail" size={24} color={COLORS.secondary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Pending Questions</Text>
              <Text style={styles.actionSubtitle}>
                {dashboard?.pending_questions || 0} questions awaiting your response
              </Text>
            </View>
            {(dashboard?.pending_questions || 0) > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{dashboard?.pending_questions}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Active Sessions */}
          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: COLORS.online + '20' }]}>
              <Ionicons name="radio" size={24} color={COLORS.online} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Active Sessions</Text>
              <Text style={styles.actionSubtitle}>
                {dashboard?.active_sessions || 0} sessions in progress
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Earnings & Withdrawals */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/psychic-portal/earnings')}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.primary + '20' }]}>
              <Ionicons name="wallet" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Earnings & Withdrawals</Text>
              <Text style={styles.actionSubtitle}>View history and request payout</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Profile Settings */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/psychic-portal/settings')}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.videoPlum + '20' }]}>
              <Ionicons name="person" size={24} color={COLORS.videoPlum} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Profile Settings</Text>
              <Text style={styles.actionSubtitle}>Edit bio, rates, and availability</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Tips Card */}
        <View style={styles.tipsCard}>
          <Ionicons name="bulb" size={24} color={COLORS.gold} />
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>Pro Tip</Text>
            <Text style={styles.tipsText}>
              Responding to questions within 2 hours increases your visibility and booking rate!
            </Text>
          </View>
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  onlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  onlineLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  earningsCard: {
    marginHorizontal: SPACING.md,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  earningsGradient: {
    padding: SPACING.lg,
  },
  earningsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  withdrawButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  withdrawText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  earningsAmount: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFF',
    marginVertical: SPACING.sm,
  },
  earningsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 12,
    padding: SPACING.md,
  },
  earningsStat: {
    flex: 1,
    alignItems: 'center',
  },
  earningsStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  earningsStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 2,
  },
  earningsDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  section: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  actionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: SPACING.sm,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tipsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.gold + '15',
    borderRadius: 14,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.gold + '30',
  },
  tipsContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gold,
  },
  tipsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
});
