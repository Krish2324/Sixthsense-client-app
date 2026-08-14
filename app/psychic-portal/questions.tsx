import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function PsychicQuestionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Psychic settings - determines if they can decline questions
  const [psychicSettings, setPsychicSettings] = useState({
    isOnline: true,
    offersRecordedReadings: true,
  });

  const psychicId = user?.psychic_id || 'psy-demo-001';
  
  // Check if psychic can decline questions
  // If online AND has recorded readings enabled, they MUST complete paid questions
  const canDeclineQuestions = !psychicSettings.isOnline || !psychicSettings.offersRecordedReadings;

  const fetchQuestions = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/psychic-portal/questions/${psychicId}`);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
      } else {
        // Mock data for demo
        setQuestions([
          {
            id: 'q1',
            client_name: 'Sarah M.',
            question_text: 'I\'ve been feeling disconnected from my partner lately. Can you give me insight into what\'s happening in our relationship?',
            delivery_type: 'standard',
            price: 12,
            status: 'pending',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'q2',
            client_name: 'Michael T.',
            question_text: 'Should I accept this new job offer or stay at my current position?',
            delivery_type: 'emergency',
            price: 20,
            status: 'pending',
            created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          },
          {
            id: 'q3',
            client_name: 'Emma K.',
            question_text: 'What energy do you see around my upcoming move to a new city?',
            delivery_type: 'standard',
            price: 12,
            status: 'accepted',
            created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [psychicId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchQuestions();
    setRefreshing(false);
  };

  const handleAccept = async (questionId: string) => {
    try {
      await fetch(`${BACKEND_URL}/api/psychic-portal/questions/${questionId}/accept`, {
        method: 'POST',
      });
      setQuestions(prev => 
        prev.map(q => q.id === questionId ? { ...q, status: 'accepted' } : q)
      );
      Alert.alert('Accepted!', 'You have accepted this question. Please submit your video response.');
    } catch (error) {
      Alert.alert('Error', 'Failed to accept question');
    }
  };

  const handleRecordVideo = (question: any) => {
    Alert.alert(
      'Record Video Answer',
      'This will open the video recorder to create your response.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Record', 
          onPress: () => {
            // In production, this would open video recorder
            Alert.alert('Video Recorded', 'Your video has been submitted!');
            setQuestions(prev => prev.filter(q => q.id !== question.id));
          } 
        },
      ]
    );
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getDeadline = (question: any) => {
    const created = new Date(question.created_at);
    const hours = question.delivery_type === 'emergency' ? 1 : 24;
    const deadline = new Date(created.getTime() + hours * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    
    if (diffMs <= 0) return { text: 'Overdue', urgent: true };
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffMins < 60) return { text: `${diffMins}m left`, urgent: diffMins < 30 };
    return { text: `${diffHours}h left`, urgent: diffHours < 2 };
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Pending Questions</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : questions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="checkmark-circle" size={60} color={COLORS.online} />
          </View>
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptySubtitle}>
            You don't have any pending questions right now.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
        >
          {questions.map((question) => {
            const deadline = getDeadline(question);
            return (
              <View key={question.id} style={styles.questionCard}>
                {/* Header Row */}
                <View style={styles.questionHeader}>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{question.client_name}</Text>
                    <Text style={styles.timeAgo}>{getTimeAgo(question.created_at)}</Text>
                  </View>
                  <View style={[
                    styles.priceBadge,
                    question.delivery_type === 'emergency' && styles.emergencyBadge
                  ]}>
                    <Text style={[
                      styles.priceText,
                      question.delivery_type === 'emergency' && styles.emergencyText
                    ]}>
                      ${question.price}
                    </Text>
                  </View>
                </View>

                {/* Delivery Type */}
                <View style={styles.deliveryRow}>
                  <Ionicons
                    name={question.delivery_type === 'emergency' ? 'flash' : 'time'}
                    size={16}
                    color={question.delivery_type === 'emergency' ? COLORS.error : COLORS.secondary}
                  />
                  <Text style={[
                    styles.deliveryType,
                    question.delivery_type === 'emergency' && { color: COLORS.error }
                  ]}>
                    {question.delivery_type === 'emergency' ? 'Emergency (1hr)' : 'Standard (24hr)'}
                  </Text>
                  <View style={[
                    styles.deadlineBadge,
                    deadline.urgent && styles.deadlineUrgent
                  ]}>
                    <Text style={[
                      styles.deadlineText,
                      deadline.urgent && styles.deadlineTextUrgent
                    ]}>
                      {deadline.text}
                    </Text>
                  </View>
                </View>

                {/* Question Text */}
                <Text style={styles.questionText}>{question.question_text}</Text>

                {/* Client Video (if attached) */}
                {question.client_video_url && (
                  <TouchableOpacity style={styles.clientVideoRow}>
                    <Ionicons name="play-circle" size={24} color={COLORS.secondary} />
                    <Text style={styles.clientVideoText}>Watch Client's Video Question</Text>
                  </TouchableOpacity>
                )}

                {/* Must Complete Reminder */}
                {question.status === 'accepted' && (
                  <View style={styles.mustCompleteReminder}>
                    <Ionicons name="information-circle" size={16} color={COLORS.primary} />
                    <Text style={styles.mustCompleteText}>
                      Client has paid. Please complete this reading on time.
                    </Text>
                  </View>
                )}

                {/* Mandatory Completion Notice - shown when psychic cannot decline */}
                {question.status === 'pending' && !canDeclineQuestions && (
                  <View style={styles.mandatoryNotice}>
                    <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                    <Text style={styles.mandatoryText}>
                      Requirement: You must complete this paid question. Go offline or disable recorded readings in Settings if unavailable.
                    </Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.actions}>
                  {question.status === 'pending' ? (
                    canDeclineQuestions ? (
                      // Can decline - show both buttons
                      <>
                        <TouchableOpacity
                          style={styles.declineButton}
                          onPress={() => Alert.alert(
                            'Decline Question',
                            'Are you sure you want to decline this question? The client will be notified and refunded.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Decline', style: 'destructive', onPress: () => {
                                // Handle decline logic
                                setQuestions(prev => prev.filter(q => q.id !== question.id));
                                Alert.alert('Declined', 'The question has been declined and the client has been notified.');
                              }}
                            ]
                          )}
                        >
                          <Text style={styles.declineText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.acceptButton}
                          onPress={() => handleAccept(question.id)}
                        >
                          <Text style={styles.acceptText}>Accept & Record</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      // Cannot decline - only show accept button (full width)
                      <TouchableOpacity
                        style={styles.acceptButtonFull}
                        onPress={() => handleAccept(question.id)}
                      >
                        <Text style={styles.acceptText}>Accept & Start Recording</Text>
                      </TouchableOpacity>
                    )
                  ) : (
                    <TouchableOpacity
                      style={styles.recordButton}
                      onPress={() => handleRecordVideo(question)}
                    >
                      <Ionicons name="videocam" size={18} color="#FFF" />
                      <Text style={styles.recordText}>Record Video Answer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.online + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  content: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  questionCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  timeAgo: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  priceBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  emergencyBadge: {
    backgroundColor: COLORS.error + '20',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emergencyText: {
    color: COLORS.error,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: 6,
  },
  deliveryType: {
    fontSize: 13,
    color: COLORS.secondary,
    fontWeight: '500',
  },
  deadlineBadge: {
    marginLeft: 'auto',
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deadlineUrgent: {
    backgroundColor: COLORS.error + '20',
  },
  deadlineText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  deadlineTextUrgent: {
    color: COLORS.error,
  },
  clientVideoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary + '15',
    borderRadius: 10,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  clientVideoText: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '500',
  },
  mustCompleteReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    borderRadius: 10,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  mustCompleteText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  mandatoryNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.error + '12',
    borderRadius: 10,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
  },
  mandatoryText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '500',
    lineHeight: 18,
  },
  questionText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  declineButton: {
    flex: 1,
    backgroundColor: COLORS.backgroundElevated,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  declineText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptButtonFull: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  recordButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.secondary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  recordText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});
