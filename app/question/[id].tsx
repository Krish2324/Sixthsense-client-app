import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface ClarificationMessage {
  id: string;
  sender_type: string;
  message: string;
  created_at: string;
}

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
  clarification_messages: ClarificationMessage[];
  client_messages_count: number;
  psychic_messages_count: number;
  is_third_party: boolean;
  third_party_details: any;
  video_response_url: string | null;
  psychic_name?: string;
}

export default function QuestionDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [question, setQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const MAX_MESSAGES = 5;
  const remainingMessages = MAX_MESSAGES - (question?.client_messages_count || 0);

  useEffect(() => {
    fetchQuestion();
  }, [id]);

  const fetchQuestion = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/questions/${id}`);
      if (response.ok) {
        const data = await response.json();
        setQuestion(data);
      }
    } catch (error) {
      console.error('Failed to fetch question:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim()) return;
    if (remainingMessages <= 0) {
      Alert.alert('Limit Reached', 'You have used all 5 clarification messages.');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/questions/${id}/clarification?user_type=client`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question_id: id,
          message: messageText,
        }),
      });

      if (response.ok) {
        setMessageText('');
        fetchQuestion(); // Refresh to get updated messages
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to send message');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setIsSending(false);
    }
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
        return 'Awaiting Response';
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
      year: 'numeric',
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

  if (!question) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.errorText}>Question not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Question Details</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(question.status) + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(question.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(question.status) }]}>
              {getStatusLabel(question.status)}
            </Text>
          </View>
          <View style={styles.metaInfo}>
            <View style={styles.metaRow}>
              <Ionicons
                name={question.delivery_type === 'emergency' ? 'flash' : 'time-outline'}
                size={16}
                color={COLORS.textMuted}
              />
              <Text style={styles.metaText}>
                {question.delivery_type === 'emergency' ? 'Emergency (1hr)' : 'Standard (24hr)'}
              </Text>
            </View>
            <Text style={styles.price}>${question.price.toFixed(2)}</Text>
          </View>
          <Text style={styles.dateText}>Submitted: {formatDate(question.created_at)}</Text>
        </View>

        {/* Question Text */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Question</Text>
          <View style={styles.questionBox}>
            <Text style={styles.questionText}>{question.question_text}</Text>
          </View>
        </View>

        {/* Third Party Details */}
        {question.is_third_party && question.third_party_details && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reading For</Text>
            <View style={styles.thirdPartyBox}>
              <Ionicons name="person" size={20} color={COLORS.primary} />
              <View style={styles.thirdPartyInfo}>
                <Text style={styles.thirdPartyName}>{question.third_party_details.name}</Text>
                {question.third_party_details.birth_date && (
                  <Text style={styles.thirdPartyDetail}>
                    Born: {question.third_party_details.birth_date}
                    {question.third_party_details.birth_time && ` at ${question.third_party_details.birth_time}`}
                  </Text>
                )}
                {question.third_party_details.birth_location && (
                  <Text style={styles.thirdPartyDetail}>
                    Location: {question.third_party_details.birth_location}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Clarification Messages */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Clarification Messages</Text>
            <Text style={styles.messageLimit}>
              {remainingMessages} of {MAX_MESSAGES} remaining
            </Text>
          </View>

          {question.clarification_messages.length === 0 ? (
            <View style={styles.noMessages}>
              <Ionicons name="chatbubbles-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.noMessagesText}>No messages yet</Text>
              <Text style={styles.noMessagesSubtext}>
                You can exchange up to 5 messages with the advisor for clarifications
              </Text>
            </View>
          ) : (
            <View style={styles.messagesList}>
              {question.clarification_messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageItem,
                    msg.sender_type === 'client' ? styles.clientMessage : styles.psychicMessage,
                  ]}
                >
                  <Text style={styles.messageSender}>
                    {msg.sender_type === 'client' ? 'You' : 'Advisor'}
                  </Text>
                  <Text style={styles.messageText}>{msg.message}</Text>
                  <Text style={styles.messageTime}>{formatDate(msg.created_at)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Video Response (if completed) */}
        {question.status === 'completed' && question.video_response_url && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Video Response</Text>
            <TouchableOpacity
              style={styles.videoCard}
              activeOpacity={0.8}
              onPress={() => {
                router.push({
                  pathname: '/play-recording',
                  params: {
                    url: question.video_response_url || '',
                    type: 'video',
                    psychicName: question.psychic_name || 'Advisor',
                    date: question.created_at,
                  },
                });
              }}
            >
              <Ionicons name="play-circle" size={48} color={COLORS.primary} />
              <Text style={styles.videoText}>Watch Your Reading</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Message Input */}
      {remainingMessages > 0 && question.status !== 'completed' && question.status !== 'cancelled' && (
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + SPACING.sm }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Send a clarification message..."
              placeholderTextColor={COLORS.textMuted}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={isSending || !messageText.trim()}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
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
  errorText: {
    color: COLORS.textSecondary,
    fontSize: 16,
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
  statusCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    marginBottom: SPACING.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  messageLimit: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  questionBox: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  questionText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  thirdPartyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 14,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  thirdPartyInfo: {
    flex: 1,
  },
  thirdPartyName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  thirdPartyDetail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  noMessages: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noMessagesText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  noMessagesSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  messagesList: {
    gap: SPACING.sm,
  },
  messageItem: {
    padding: SPACING.md,
    borderRadius: 14,
    maxWidth: '85%',
  },
  clientMessage: {
    backgroundColor: COLORS.primary + '15',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  psychicMessage: {
    backgroundColor: COLORS.backgroundCard,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageSender: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  videoCard: {
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  videoText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: SPACING.sm,
  },
  inputBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 15,
    color: COLORS.textPrimary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textMuted,
  },
});
