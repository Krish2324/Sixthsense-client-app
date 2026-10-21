import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://api.sixthsensepsychics.com';

interface ReadingItem {
  id: string;
  psychic_id: string;
  psychic_name?: string;
  psychic_avatar?: string;
  question_text: string;
  question_type: string;
  delivery_type: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  price: number;
  created_at: string;
  deadline?: string;
  video_response_url?: string;
  client_messages_count?: number;
}

export default function ClientReadingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [readings, setReadings] = useState<ReadingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchReadings = useCallback(async () => {
    const clientId = user?.id || user?.email;
    if (!clientId) {
      setReadings([]);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/questions/client/${encodeURIComponent(clientId)}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setReadings(data);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch readings:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    fetchReadings();
    const interval = setInterval(fetchReadings, 15000);
    return () => clearInterval(interval);
  }, [fetchReadings]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchReadings();
  };

  const filteredReadings = readings.filter((r) => {
    if (activeFilter === 'pending') {
      return r.status === 'pending' || r.status === 'accepted' || r.status === 'in_progress';
    }
    if (activeFilter === 'completed') {
      return r.status === 'completed';
    }
    return true;
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          label: 'Completed',
          bgColor: '#22C55E20',
          textColor: '#22C55E',
          icon: 'checkmark-circle' as const,
        };
      case 'accepted':
      case 'in_progress':
        return {
          label: 'In Progress',
          bgColor: '#3B82F620',
          textColor: '#3B82F6',
          icon: 'hourglass' as const,
        };
      default:
        return {
          label: 'Waiting for Advisor',
          bgColor: '#F59E0B20',
          textColor: '#F59E0B',
          icon: 'time' as const,
        };
    }
  };

  const renderReadingCard = ({ item }: { item: ReadingItem }) => {
    const statusInfo = getStatusBadge(item.status);
    const isCompleted = item.status === 'completed';
    const hasVideo = !!item.video_response_url;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
        activeOpacity={0.8}
        onPress={() =>
          router.push({
            pathname: '/question/[id]',
            params: { id: item.id },
          })
        }
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + '25' }]}>
              <Ionicons name="sparkles" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.advisorName, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.psychic_name || 'Psychic Advisor'}
              </Text>
              <Text style={[styles.dateText, { color: colors.textMuted }]}>
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <Ionicons name={statusInfo.icon} size={14} color={statusInfo.textColor} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: statusInfo.textColor }]}>{statusInfo.label}</Text>
          </View>
        </View>

        {/* Question Text */}
        <Text style={[styles.questionText, { color: colors.textSecondary }]} numberOfLines={3}>
          "{item.question_text}"
        </Text>

        {/* Delivery speed / price info */}
        <View style={styles.infoRow}>
          <View style={styles.tagRow}>
            <View
              style={[
                styles.typeTag,
                { backgroundColor: item.delivery_type === 'emergency' ? '#EF444415' : colors.primary + '15' },
              ]}
            >
              <Ionicons
                name={item.delivery_type === 'emergency' ? 'flash' : 'videocam'}
                size={12}
                color={item.delivery_type === 'emergency' ? '#EF4444' : colors.primary}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.typeTagText,
                  { color: item.delivery_type === 'emergency' ? '#EF4444' : colors.primary },
                ]}
              >
                {item.delivery_type === 'emergency' ? 'Rush (1hr)' : 'Standard (24hr)'}
              </Text>
            </View>
          </View>

          <Text style={[styles.priceText, { color: colors.textPrimary }]}>${item.price?.toFixed(2)}</Text>
        </View>

        {/* Action Button: Watch Video if completed, or Pending Indicator */}
        {isCompleted ? (
          <TouchableOpacity
            style={[styles.watchButton, { backgroundColor: '#22C55E' }]}
            onPress={() => {
              router.push({
                pathname: '/play-recording',
                params: {
                  url: item.video_response_url || '',
                  type: 'video',
                  psychicName: item.psychic_name || 'Advisor',
                  date: item.created_at,
                },
              });
            }}
          >
            <Ionicons name="play-circle" size={20} color="#FFF" />
            <Text style={styles.watchButtonText}>Watch Video Response</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.pendingNotice, { backgroundColor: colors.backgroundElevated }]}>
            <Ionicons name="hourglass-outline" size={16} color={colors.warning} />
            <Text style={[styles.pendingNoticeText, { color: colors.textSecondary }]}>
              Advisor will record your video reading soon
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + SPACING.md,
            backgroundColor: colors.backgroundCard,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>My Readings</Text>
        <TouchableOpacity
          style={[styles.askNewButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(tabs)/home')}
        >
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.askNewText}>Ask Question</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View
        style={[
          styles.filterRow,
          { backgroundColor: colors.backgroundCard, borderBottomColor: colors.border, borderBottomWidth: 1 },
        ]}
      >
        {(['all', 'pending', 'completed'] as const).map((filter) => {
          const isActive = activeFilter === filter;
          const count =
            filter === 'all'
              ? readings.length
              : filter === 'pending'
              ? readings.filter((r) => r.status !== 'completed').length
              : readings.filter((r) => r.status === 'completed').length;

          return (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
                isActive && [styles.filterTabActive, { borderBottomColor: colors.primary }],
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: isActive ? colors.primary : colors.textMuted },
                  isActive && { fontWeight: '700' },
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredReadings}
          keyExtractor={(item) => item.id}
          renderItem={renderReadingCard}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconBg, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="book-outline" size={48} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Readings Found</Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                {activeFilter === 'pending'
                  ? 'You have no pending readings. Submit a question to an advisor!'
                  : activeFilter === 'completed'
                  ? 'No completed video answers yet.'
                  : 'Ask any advisor a question to receive a personalized recorded video response.'}
              </Text>
              <TouchableOpacity
                style={[styles.exploreButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/(tabs)/home')}
              >
                <Ionicons name="sparkles" size={18} color="#FFF" />
                <Text style={styles.exploreButtonText}>Browse Advisors</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
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
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  askNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 4,
  },
  askNewText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
  },
  filterTab: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomWidth: 2,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.md,
  },
  card: {
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  advisorName: {
    fontSize: 15,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  questionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACING.md,
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  watchButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  pendingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  pendingNoticeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: SPACING.xl,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  exploreButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
