import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { apiClient } from '../../src/services/api';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const WS_URL = BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://');

// CLI-048: Off-platform contact leakage regex sanitizer
const LEAKAGE_PATTERNS = [
  /\b(\+?1?[-.]?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4})\b/g, // Phone numbers
  /\bwhatsapp\.com\b/gi,
  /\btelegram\.me\b/gi,
  /\bt\.me\/\S+/gi,
  /\bsignal\.org\b/gi,
  /\bkik\.com\b/gi,
];
const sanitizeMessage = (text: string): string => {
  let sanitized = text;
  for (const pattern of LEAKAGE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[contact info removed]');
  }
  return sanitized;
};

interface Message {
  id: string;
  text: string;
  sender: 'client' | 'psychic' | 'system';
  timestamp: Date;
  type?: 'text' | 'image' | 'warning';
}

export default function ChatScreen() {
  const { id, psychicId, rate, minutes: initialMinutes } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshUser, resetInactivityTimer } = useAuth();

  const [psychic, setPsychic] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(parseInt(initialMinutes as string || '5') * 60);
  const [isSessionActive, setIsSessionActive] = useState(true);
  const [showAddTimeModal, setShowAddTimeModal] = useState(false);
  const [hasShownWarning, setHasShownWarning] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [psychicIsTyping, setPsychicIsTyping] = useState(false);
  
  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // CLI-053: Delivery receipt state per message ('sent' | 'delivered')
  const [messageStatus, setMessageStatus] = useState<Record<string, 'sent' | 'delivered'>>({});

  // Free 4 minutes for new users
  const [isNewUser, setIsNewUser] = useState(user?.is_new_user ?? false);
  const [freeMinutesRemaining, setFreeMinutesRemaining] = useState(
    (user?.is_new_user && !user?.first_reading_free_used) ? 4 * 60 : 0
  );
  const [hasNotifiedFreeTimeEnded, setHasNotifiedFreeTimeEnded] = useState(false);

  const chatRate = parseFloat(rate as string || '3.99');
  const balance = user?.balance || 0;
  
  const conversationId = id as string;

  // CLI-046: Guard to prevent duplicate WS reconnect loops
  const isConnectedRef = useRef(false);
  const heartbeatRef = useRef<any>(null);
  const pongTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!user?.id) return;

    const connectWebSocket = () => {
      if (isConnectedRef.current) return; // CLI-046: prevent duplicate connections
      try {
        const wsUrl = `${WS_URL}/api/ws/${user.id}`;
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          console.log('WebSocket connected');
          isConnectedRef.current = true;
          wsRef.current?.send(JSON.stringify({
            type: 'join_conversation',
            conversation_id: conversationId
          }));
          // CLI-047: Start 30s heartbeat ping
          heartbeatRef.current = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'ping' }));
              pongTimeoutRef.current = setTimeout(() => {
                console.warn('WS pong timeout — closing for reconnect');
                wsRef.current?.close();
              }, 10000);
            }
          }, 30000);
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'pong') {
              // CLI-047: Clear pong timeout on receipt
              if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current);
            } else if (data.type === 'new_message') {
              const msg = data.message;
              const newMsg: Message = {
                id: msg.id,
                text: msg.content,
                sender: msg.sender_id === user.id ? 'client' : 'psychic',
                timestamp: new Date(msg.created_at),
              };
              setMessages(prev => [...prev, newMsg]);
              setPsychicIsTyping(false);
              // CLI-053: Mark as delivered when ACK received
              if (msg.sender_id === user.id) {
                setMessageStatus(prev => ({ ...prev, [msg.id]: 'delivered' }));
              }
            } else if (data.type === 'typing_indicator') {
              if (data.user_id !== user.id) {
                setPsychicIsTyping(data.is_typing);
              }
            } else if (data.type === 'message_sent') {
              // CLI-053: Mark as sent on ack
              setMessageStatus(prev => ({ ...prev, [data.message_id]: 'sent' }));
            }
          } catch (e) {
            console.error('Error parsing WS message:', e);
          }
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        wsRef.current.onclose = () => {
          console.log('WebSocket closed');
          isConnectedRef.current = false;
          if (heartbeatRef.current) clearInterval(heartbeatRef.current);
          if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current);
          // Reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };
      } catch (e) {
        console.error('WebSocket connection error:', e);
        isConnectedRef.current = false;
      }
    };

    connectWebSocket();

    return () => {
      isConnectedRef.current = false;
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [user?.id, conversationId]);

  // Fetch psychic info
  useEffect(() => {
    fetchPsychic();
  }, [psychicId]);

  const fetchPsychic = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/psychics/${psychicId}`);
      const data = await response.json();
      setPsychic(data);
      
      // Check if this is a new user getting their free 4 minutes
      const isGettingFreeTime = user?.is_new_user && !user?.first_reading_free_used;
      
      // Add welcome message
      const welcomeMessages: Message[] = [{
        id: '1',
        text: `Connected with ${data.name}. Your session has started.`,
        sender: 'system',
        timestamp: new Date(),
      }];
      
      // Add free time notification for new users
      if (isGettingFreeTime) {
        welcomeMessages.push({
          id: '2',
          text: '🎁 Welcome! Your first 4 minutes are FREE as a new client. Enjoy your reading!',
          sender: 'system',
          timestamp: new Date(),
          type: 'warning',
        });
      }
      
      setMessages(welcomeMessages);
    } catch (error) {
      console.error('Error fetching psychic:', error);
    }
  };

  // Timer countdown - handles free minutes first, then paid time
  useEffect(() => {
    if (!isSessionActive) return;

    const timer = setInterval(() => {
      // First, consume free minutes if available
      if (freeMinutesRemaining > 0) {
        setFreeMinutesRemaining(prev => {
          const newValue = prev - 1;
          
          // When free minutes end, notify the user
          if (newValue === 0 && !hasNotifiedFreeTimeEnded) {
            setHasNotifiedFreeTimeEnded(true);
            const freeEndMessage: Message = {
              id: Date.now().toString(),
              text: '⏰ Your free 4 minutes have ended. Add time to continue your reading.',
              sender: 'system',
              timestamp: new Date(),
              type: 'warning',
            };
            setMessages(prev => [...prev, freeEndMessage]);
            setShowAddTimeModal(true);
            
            // Mark free reading as used in backend
            markFreeReadingUsed();
          }
          
          return newValue;
        });
      } else {
        // Consume paid time
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            endSession();
            return 0;
          }
          
          // 1 minute warning
          if (prev === 60 && !hasShownWarning) {
            showOneMinuteWarning();
            setHasShownWarning(true);
          }
          
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isSessionActive, hasShownWarning, freeMinutesRemaining, hasNotifiedFreeTimeEnded]);

  // CLI-051: Migrate markFreeReadingUsed to apiClient.put
  const markFreeReadingUsed = async () => {
    try {
      await apiClient.put(`/api/users/${user?.id}/mark-first-reading-used`, {});
      refreshUser && refreshUser();
    } catch (error) {
      console.error('Error marking free reading as used:', error);
    }
  };

  const showOneMinuteWarning = () => {
    // Add warning message for client
    const warningMessage: Message = {
      id: Date.now().toString(),
      text: '⏰ 1 minute remaining! Add more time to continue your reading.',
      sender: 'system',
      timestamp: new Date(),
      type: 'warning',
    };
    setMessages(prev => [...prev, warningMessage]);
    setShowAddTimeModal(true);
  };

  const endSession = () => {
    setIsSessionActive(false);
    const sessionDuration = parseInt(initialMinutes as string || '5') * 60 - timeRemaining;
    const endMessage: Message = {
      id: Date.now().toString(),
      text: `Session ended. Total: ${formatTime(sessionDuration)} • $${totalSpent.toFixed(2)}`,
      sender: 'system',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, endMessage]);
    
    // Determine if we should show the review screen
    // Conditions: 
    // 1. Session must be at least 5 minutes (300 seconds)
    // 2. Session must NOT be a free-only reading (totalSpent > 0)
    const sessionMinutes = sessionDuration / 60;
    const wasPaidSession = totalSpent > 0;
    const wasLongEnough = sessionMinutes >= 5;
    
    // Only show review if it was a paid session AND lasted 5+ minutes
    const shouldShowReview = wasPaidSession && wasLongEnough;
    
    setTimeout(() => {
      if (shouldShowReview) {
        router.replace({
          pathname: '/session-review',
          params: {
            psychicId: psychicId as string,
            psychicName: psychic?.name || 'Your Advisor',
            psychicAvatar: psychic?.profile_picture || '',
            sessionType: 'chat',
            sessionDuration: sessionDuration.toString(),
            totalSpent: totalSpent.toFixed(2),
          }
        });
      } else {
        // Just go back to home - no review for free/short sessions
        router.replace('/(tabs)/home');
      }
    }, 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeRemaining <= 60) return COLORS.error;
    if (timeRemaining <= 180) return COLORS.warning;
    return COLORS.online;
  };

  // Calculate max minutes client can afford
  const getAffordableMinutes = () => {
    const maxMins = Math.floor(balance / chatRate);
    return [5, 10, 15, 20].filter(m => m <= maxMins);
  };

  const addMoreTime = (minutes: number) => {
    const cost = minutes * chatRate;
    if (cost > balance) {
      Alert.alert('Insufficient Balance', 'Please add funds to continue.');
      return;
    }
    
    // Instant add - one tap
    setTimeRemaining(prev => prev + minutes * 60);
    setTotalSpent(prev => prev + cost);
    setShowAddTimeModal(false);
    setHasShownWarning(false); // Reset warning for new time
    
    const addedMessage: Message = {
      id: Date.now().toString(),
      text: `✅ Added ${minutes} minutes to your session`,
      sender: 'system',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, addedMessage]);
  };

  const sendMessage = () => {
    if (!inputText.trim() || !isSessionActive) return;

    const messageText = sanitizeMessage(inputText.trim()); // CLI-048: sanitize
    const messageId = Date.now().toString();

    const newMessage: Message = {
      id: messageId,
      text: messageText,
      sender: 'client',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    // CLI-053: Mark as 'sent' optimistically
    setMessageStatus(prev => ({ ...prev, [messageId]: 'sent' }));
    setInputText('');

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        conversation_id: conversationId,
        receiver_id: psychicId,
        content: messageText,
      }));
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        conversation_id: conversationId,
        receiver_id: psychicId,
        is_typing: false,
      }));
    } else {
      sendMessageViaHttp(messageText, messageId);
    }
  };
  
  // CLI-050: Migrate HTTP fallback to apiClient with Bearer auth
  const sendMessageViaHttp = async (content: string, messageId: string) => {
    try {
      await apiClient.post('/api/messages/send', {
        conversation_id: conversationId,
        sender_id: user?.id,
        receiver_id: psychicId,
        content: content,
      });
    } catch (e) {
      console.error('Error sending message via HTTP:', e);
    }
  };

  // CLI-049: Debounced typing indicator — emit max once per 2s
  const lastTypingEmitRef = useRef(0);
  const handleInputChange = (text: string) => {
    setInputText(text);
    // CLI-052: Reset inactivity timer on every keystroke
    resetInactivityTimer?.();

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const now = Date.now();
      if (now - lastTypingEmitRef.current > 2000) {
        wsRef.current.send(JSON.stringify({
          type: 'typing',
          conversation_id: conversationId,
          receiver_id: psychicId,
          is_typing: text.length > 0,
        }));
        lastTypingEmitRef.current = now;
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'typing',
            conversation_id: conversationId,
            receiver_id: psychicId,
            is_typing: false,
          }));
        }
      }, 3000);
    }
  };

  const handleEndSession = () => {
    Alert.alert(
      'End Session?',
      'Are you sure you want to end this session early?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End Session', style: 'destructive', onPress: endSession },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header with Timer */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          {psychic && (
            <>
              <Image source={{ uri: psychic.profile_picture }} style={styles.headerAvatar} />
              <Text style={styles.headerName}>{psychic.name}</Text>
            </>
          )}
        </View>
        
        {/* Timer - Show FREE indicator during free minutes */}
        <View style={[styles.timerContainer, { backgroundColor: freeMinutesRemaining > 0 ? '#FFD700' + '30' : getTimeColor() + '20' }]}>
          {freeMinutesRemaining > 0 ? (
            <>
              <Ionicons name="gift" size={16} color="#FFD700" />
              <Text style={[styles.timerText, { color: '#FFD700' }]}>
                FREE {formatTime(freeMinutesRemaining)}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="time" size={16} color={getTimeColor()} />
              <Text style={[styles.timerText, { color: getTimeColor() }]}>
                {formatTime(timeRemaining)}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Rate Info Bar */}
      <View style={styles.rateBar}>
        <Text style={styles.rateText}>
          {freeMinutesRemaining > 0 
            ? '🎁 FREE Session - New Client Bonus!'
            : `💬 Live Chat • $${chatRate.toFixed(2)}/min`
          }
        </Text>
        {freeMinutesRemaining <= 0 && (
          <TouchableOpacity onPress={() => setShowAddTimeModal(true)}>
            <Text style={styles.addTimeLink}>+ Add time</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.sender === 'client' && styles.clientMessage,
              message.sender === 'psychic' && styles.psychicMessage,
              message.sender === 'system' && styles.systemMessage,
              message.type === 'warning' && styles.warningMessage,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                message.sender === 'client' && styles.clientMessageText,
                message.sender === 'system' && styles.systemMessageText,
                message.type === 'warning' && styles.warningMessageText,
              ]}
            >
              {message.text}
            </Text>
          </View>
        ))}
        
        {/* Typing Indicator */}
        {psychicIsTyping && (
          <View style={[styles.messageBubble, styles.psychicMessage, styles.typingBubble]}>
            <Text style={styles.typingText}>{psychic?.name || 'Advisor'} is typing...</Text>
          </View>
        )}
      </ScrollView>

      {/* Add Time Modal */}
      {showAddTimeModal && (
        <View style={styles.addTimeModal}>
          <View style={styles.addTimeContent}>
            <Text style={styles.addTimeTitle}>⏰ Add More Time</Text>
            <Text style={styles.addTimeSubtitle}>
              Balance: ${balance.toFixed(2)} • Rate: ${chatRate.toFixed(2)}/min
            </Text>
            
            <View style={styles.timeOptions}>
              {getAffordableMinutes().map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={styles.timeOption}
                  onPress={() => addMoreTime(mins)}
                >
                  <Text style={styles.timeOptionMins}>+{mins} min</Text>
                  <Text style={styles.timeOptionCost}>${(mins * chatRate).toFixed(2)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {getAffordableMinutes().length === 0 && (
              <TouchableOpacity
                style={styles.addFundsButton}
                onPress={() => router.push('/(tabs)/wallet')}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.addFundsGradient}
                >
                  <Ionicons name="wallet" size={18} color="#FFF" />
                  <Text style={styles.addFundsText}>Add Funds</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={() => setShowAddTimeModal(false)}
            >
              <Text style={styles.dismissText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Input Area */}
      <View style={[styles.inputArea, { paddingBottom: insets.bottom + SPACING.sm }]}>
        {isSessionActive ? (
          <>
            <TouchableOpacity style={styles.attachButton}>
              <Ionicons name="image" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor={COLORS.textMuted}
              value={inputText}
              onChangeText={handleInputChange}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim()}
            >
              <Ionicons name="send" size={20} color="#FFF" />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.endedButton}
            onPress={() => router.back()}
          >
            <Text style={styles.endedButtonText}>Session Ended • Return to Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* End Session Button */}
      {isSessionActive && (
        <TouchableOpacity style={styles.endSessionButton} onPress={handleEndSession}>
          <Text style={styles.endSessionText}>End Session</Text>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
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
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
  },
  rateBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.backgroundElevated,
  },
  rateText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  addTimeLink: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: SPACING.md,
    borderRadius: 16,
  },
  clientMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  psychicMessage: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.backgroundCard,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: COLORS.backgroundElevated,
  },
  warningMessage: {
    alignSelf: 'center',
    backgroundColor: COLORS.warning + '20',
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  messageText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  clientMessageText: {
    color: '#FFF',
  },
  systemMessageText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontSize: 13,
  },
  warningMessageText: {
    color: COLORS.warning,
    textAlign: 'center',
    fontWeight: '600',
  },
  addTimeModal: {
    position: 'absolute',
    bottom: 100,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 20,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  addTimeContent: {
    alignItems: 'center',
  },
  addTimeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  addTimeSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  timeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  timeOption: {
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeOptionMins: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  timeOptionCost: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  addFundsButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  addFundsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  addFundsText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  dismissButton: {
    padding: SPACING.sm,
  },
  dismissText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  attachButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    maxHeight: 100,
    color: COLORS.textPrimary,
    fontSize: 15,
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
  endedButton: {
    flex: 1,
    backgroundColor: COLORS.backgroundElevated,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  endedButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  endSessionButton: {
    position: 'absolute',
    top: 100,
    right: SPACING.md,
    backgroundColor: COLORS.error + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  endSessionText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: '600',
  },
  typingBubble: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  typingText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
});
