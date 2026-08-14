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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Question {
  id: string;
  psychic_id: string;
  question_text: string;
  question_type: string;
  delivery_type: string;
  status: string;
  price: number;
  created_at: string;
  deadline: string;
  client_messages_count: number;
  psychic_messages_count: number;
}

export default function QuestionListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      // Use mock user ID for now
      const clientId = user?.id || 'mock-user-123';
      const response = await fetch(`${BACKEND_URL}/api/questions/client/${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
      }
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchQuestions();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return COLORS.success;
      case 'pending':
        return COLORS.warning;
      case 'in_progress':
        return COLORS.info;
      case 'cancelled':
      case 'refunded':
        return COLORS.error;
      default:
        return COLORS.textMuted;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'accepted':
        return 'Accepted';
      case 'in_progress':
        return 'In Progress';
      case 'cancelled':
        return 'Cancelled';
      case 'refunded':
        return 'Refunded';
      default:
        return status;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reading History</Text>
        <TouchableOpacity 
          style={styles.messagesButton} 
          onPress={() => router.push('/messages')}
        >
          <Ionicons name="chatbubbles-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Messages Banner */}
      <TouchableOpacity 
        style={styles.messagesBanner}
        onPress={() => router.push('/messages')}
      >
        <View style={styles.messagesBannerLeft}>
          <View style={styles.messagesBannerIcon}>
            <Ionicons name="chatbubbles" size={20} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.messagesBannerTitle}>Messages</Text>
            <Text style={styles.messagesBannerSubtitle}>Chat with your advisors (5/day)</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + SPACING.lg }]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
      >
        {questions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="help-circle-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No Questions Yet</Text>
            <Text style={styles.emptyText}>Submit a question to an advisor to get started</Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push('/(tabs)/home')}
            >
              <Text style={styles.browseButtonText}>Browse Advisors</Text>
            </TouchableOpacity>
          </View>
        ) : (
          questions.map((question) => (
            <TouchableOpacity
              key={question.id}
              style={styles.questionCard}
              onPress={() =>
                router.push({
                  pathname: '/question/[id]',
                  params: { id: question.id },
                })
              }
            >
              <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(question.status) + '20' }]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(question.status) }]} />
                  <Text style={[styles.statusText, { color: getStatusColor(question.status) }]}>
                    {getStatusLabel(question.status)}
                  </Text>
                </View>
                <Text style={styles.price}>${question.price.toFixed(2)}</Text>
              </View>

              <Text style={styles.questionText} numberOfLines={2}>
                {question.question_text}
              </Text>

              <View style={styles.cardFooter}>
                <View style={styles.metaRow}>
                  <Ionicons
                    name={question.delivery_type === 'emergency' ? 'flash' : 'time-outline'}
                    size={14}
                    color={COLORS.textMuted}
                  />
                  <Text style={styles.metaText}>
                    {question.delivery_type === 'emergency' ? 'Emergency' : 'Standard'}
                  </Text>
                </View>
                <Text style={styles.dateText}>{formatDate(question.created_at)}</Text>
              </View>

              {/* Message count indicator */}
              {(question.client_messages_count > 0 || question.psychic_messages_count > 0) && (
                <View style={styles.messageIndicator}>
                  <Ionicons name="chatbubbles-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.messageCount}>
                    {question.client_messages_count + question.psychic_messages_count} messages
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  browseButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  browseButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  questionCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  questionText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  messageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  messageCount: {
    fontSize: 12,
    color: COLORS.primary,
  },
  messagesButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundCard,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  messagesBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  messagesBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  messagesBannerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
