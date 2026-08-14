import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING } from '../../src/constants/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        // Mock data
        setStats({
          total_users: 1250,
          total_psychics: 48,
          active_sessions: 12,
          total_revenue: 45890.50,
          pending_withdrawals: 5,
          pending_refunds: 2,
          pending_applications: 8,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        total_users: 1250,
        total_psychics: 48,
        active_sessions: 12,
        total_revenue: 45890.50,
        pending_withdrawals: 5,
        pending_refunds: 2,
        pending_applications: 8,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
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
            <Text style={styles.greeting}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>Sixth Sense Admin Platform</Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Revenue Card */}
        <View style={styles.revenueCard}>
          <LinearGradient
            colors={[COLORS.primaryDark, COLORS.primary]}
            style={styles.revenueGradient}
          >
            <Text style={styles.revenueLabel}>Total Revenue</Text>
            <Text style={styles.revenueAmount}>
              ${stats?.total_revenue?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
            </Text>
            <View style={styles.revenueStats}>
              <View style={styles.revenueStat}>
                <Ionicons name="trending-up" size={18} color="#4CD964" />
                <Text style={styles.revenueStatText}>+12% this month</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={28} color={COLORS.primary} />
            <Text style={styles.statValue}>{stats?.total_users || 0}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="eye" size={28} color={COLORS.secondary} />
            <Text style={styles.statValue}>{stats?.total_psychics || 0}</Text>
            <Text style={styles.statLabel}>Psychics</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="radio" size={28} color={COLORS.online} />
            <Text style={styles.statValue}>{stats?.active_sessions || 0}</Text>
            <Text style={styles.statLabel}>Live Sessions</Text>
          </View>
        </View>

        {/* Action Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Action Items</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/admin/applications')}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.secondary + '20' }]}>
              <Ionicons name="document-text" size={24} color={COLORS.secondary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Pending Applications</Text>
              <Text style={styles.actionSubtitle}>Review psychic applications</Text>
            </View>
            {(stats?.pending_applications || 0) > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{stats?.pending_applications}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/admin/refunds')}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.error + '20' }]}>
              <Ionicons name="return-down-back" size={24} color={COLORS.error} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Pending Refunds</Text>
              <Text style={styles.actionSubtitle}>Review refund requests</Text>
            </View>
            {(stats?.pending_refunds || 0) > 0 && (
              <View style={[styles.badge, { backgroundColor: COLORS.error }]}>
                <Text style={styles.badgeText}>{stats?.pending_refunds}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/admin/withdrawals')}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.warning + '20' }]}>
              <Ionicons name="wallet" size={24} color={COLORS.warning} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Pending Withdrawals</Text>
              <Text style={styles.actionSubtitle}>Process psychic payouts</Text>
            </View>
            {(stats?.pending_withdrawals || 0) > 0 && (
              <View style={[styles.badge, { backgroundColor: COLORS.warning }]}>
                <Text style={styles.badgeText}>{stats?.pending_withdrawals}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Management</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/admin/users')}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.primary + '20' }]}>
              <Ionicons name="people" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>User Management</Text>
              <Text style={styles.actionSubtitle}>View and manage users</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/admin/psychics')}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.videoPlum + '20' }]}>
              <Ionicons name="eye" size={24} color={COLORS.videoPlum} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Psychic Management</Text>
              <Text style={styles.actionSubtitle}>View and manage psychics</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="mail" size={24} color={COLORS.primary} />
              <Text style={styles.quickActionText}>Send Email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="analytics" size={24} color={COLORS.secondary} />
              <Text style={styles.quickActionText}>Analytics</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="settings" size={24} color={COLORS.textMuted} />
              <Text style={styles.quickActionText}>Settings</Text>
            </TouchableOpacity>
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
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  revenueCard: {
    marginHorizontal: SPACING.md,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  revenueGradient: {
    padding: SPACING.lg,
  },
  revenueLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  revenueAmount: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFF',
    marginVertical: SPACING.sm,
  },
  revenueStats: {
    flexDirection: 'row',
  },
  revenueStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  revenueStatText: {
    color: '#4CD964',
    fontSize: 14,
    fontWeight: '600',
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
    borderRadius: 14,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  statLabel: {
    fontSize: 12,
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
    backgroundColor: COLORS.secondary,
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
  quickActionsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  quickAction: {
    flex: 1,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickActionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    fontWeight: '500',
  },
});
