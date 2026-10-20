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
  Modal,
  Keyboard,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { apiClient } from '../../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import AgoraVideoCall from '../../src/components/AgoraVideoCall';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.29.73:8000';
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

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
  type?: 'text' | 'image' | 'warning' | 'tarot_spread';
  imageUrl?: string;
}

const MessageItem = React.memo(({ message, onImagePress }: { message: Message; onImagePress?: (uri: string) => void }) => {
  // If the message is just '[Photo]' text without an image, do not render a bare text bubble
  if (message.text === '[Photo]' && !message.imageUrl && message.type !== 'image') {
    return null;
  }

  const isImage = message.type === 'image' || !!message.imageUrl || (typeof message.text === 'string' && (message.text.startsWith('data:image') || !!message.text.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i)));
  const imageUri = message.imageUrl || (isImage && typeof message.text === 'string' && message.text.startsWith('data:image') ? message.text : undefined);

  const handleLongPress = () => {
    if (message.sender === 'system') return;
    Alert.alert(
      'Message Options',
      message.text,
      [
        {
          text: 'Copy Text 📋',
          onPress: () => {
            Alert.alert('Copied!', 'Message text copied to clipboard.');
          }
        },
        {
          text: 'Bookmark Insight 🔖',
          onPress: () => {
            Alert.alert('Bookmarked!', 'Insight saved to your bookmarked readings.');
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onLongPress={handleLongPress}
      style={[
        styles.messageBubble,
        message.sender === 'client' && styles.clientMessage,
        message.sender === 'psychic' && styles.psychicMessage,
        message.sender === 'system' && styles.systemMessage,
        message.type === 'warning' && styles.warningMessage,
      ]}
    >
      {message.type === 'tarot_spread' ? (
        <View style={{ gap: 8, paddingVertical: 4 }}>
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13, marginBottom: 4 }}>🔮 3-Card Tarot Spread</Text>
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
            {['Past', 'Present', 'Future'].map((label, idx) => (
              <View key={idx} style={{ width: 64, height: 96, borderRadius: 8, backgroundColor: '#4C1D95', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#A78BFA' }}>
                <Ionicons name="sparkles" size={20} color="#FFD700" />
                <Text style={{ color: '#FFF', fontSize: 10, marginTop: 4, fontWeight: '600' }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : isImage && imageUri ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onImagePress?.(imageUri)}
        >
          <Image
            source={{ uri: imageUri, cache: 'force-cache' }}
            style={{ width: 220, height: 160, borderRadius: 12, resizeMode: 'cover' }}
          />
        </TouchableOpacity>
      ) : (
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
      )}
    </TouchableOpacity>
  );
});

export default function ChatScreen() {
  const {
    id,
    psychicId,
    rate,
    minutes: initialMinutes,
    serviceType: paramServiceType,
    agoraChannel: paramAgoraChannel,
    agoraAppId: paramAgoraAppId,
    agoraUid: paramAgoraUid,
    agoraToken: paramAgoraToken,
  } = useLocalSearchParams();
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
  // CLI-047: Lightbox selected image state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const normalizedInitType = (paramServiceType as string) === 'voice' || (paramServiceType as string) === 'audio'
    ? 'phone'
    : ((paramServiceType as 'chat' | 'phone' | 'video') || 'chat');
  const [activeServiceType, setActiveServiceType] = useState<'chat' | 'phone' | 'video'>(normalizedInitType);
  const [showChatInCall, setShowChatInCall] = useState(false);
  const cleanSessionId = String(id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
  const fallbackChannel = `sixthsense_${cleanSessionId}`;
  const [agoraConfig, setAgoraConfig] = useState<{
    appId: string;
    channelName: string;
    token?: string;
    uid: number;
  }>({
    appId: (paramAgoraAppId as string) || process.env.EXPO_PUBLIC_AGORA_APP_ID || 'adff706fa53f45529d871c60da335b84',
    channelName: (paramAgoraChannel as string) || fallbackChannel,
    token: (paramAgoraToken as string) || undefined,
    uid: parseInt((paramAgoraUid as string) || '1', 10) || 1,
  });
  
  // WebSocket ref & ScrollView ref
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Auto-scroll when keyboard opens on mobile
  useEffect(() => {
    const sub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 120);
      }
    );
    return () => sub.remove();
  }, []);

  // Auto-scroll whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);
  
  // CLI-053: Delivery receipt state per message ('sent' | 'delivered')
  const [messageStatus, setMessageStatus] = useState<Record<string, 'sent' | 'delivered'>>({});

  // Free 4 minutes for users with active free chat credit/minutes offer
  const hasFreeChatOffer = Boolean(
    !user?.first_reading_free_used &&
    ((user?.free_credits || 0) > 0 || (user?.free_minutes_available || 0) > 0)
  );
  const [isNewUser, setIsNewUser] = useState(hasFreeChatOffer);
  const [freeMinutesRemaining, setFreeMinutesRemaining] = useState(
    hasFreeChatOffer ? 4 * 60 : 0
  );
  const [hasNotifiedFreeTimeEnded, setHasNotifiedFreeTimeEnded] = useState(false);

  // Tip state on session end
  const [showTipModal, setShowTipModal] = useState(false);
  const [selectedTipAmount, setSelectedTipAmount] = useState<number | null>(5);
  const [customTipAmount, setCustomTipAmount] = useState('');
  const [isProcessingTip, setIsProcessingTip] = useState(false);

  const chatRate = parseFloat(rate as string || '3.99');
  const balance = user?.balance || 0;
  
  const conversationId = id as string;
  const DRAFT_KEY = `chat_draft_${conversationId}`;

  // CLI-052: Load unsent draft message on mount
  useEffect(() => {
    if (!conversationId) return;
    AsyncStorage.getItem(DRAFT_KEY).then(draft => {
      if (draft) setInputText(draft);
    }).catch(() => null);

    // Immediately fetch session details to ensure Agora credentials are ready
    fetch(`${BACKEND_URL}/api/chat/${conversationId}`)
      .then(res => res.ok ? res.json() : null)
      .then(sessData => {
        if (!sessData) return;
        if (sessData.session_type) {
          const st = sessData.session_type === 'voice' || sessData.session_type === 'audio' ? 'phone' : sessData.session_type;
          setActiveServiceType(st);
        }
        if (sessData.agora_channel) {
          setAgoraConfig(prev => ({
            appId: sessData.agora_app_id || prev.appId,
            channelName: sessData.agora_channel || prev.channelName,
            token: sessData.client_token || prev.token,
            uid: sessData.client_uid || prev.uid,
          }));
        }
      })
      .catch(err => console.warn('Immediate session fetch error:', err));
  }, [conversationId]);

  // CLI-046: Guard to prevent duplicate WS reconnect loops
  const isConnectedRef = useRef(false);
  const heartbeatRef = useRef<any>(null);
  const pongTimeoutRef = useRef<any>(null);
  const wsUnmountedRef = useRef(false);
  const reconnectTimerRef = useRef<any>(null);

  // Billing summary popup state when session ends (either by Client or Advisor)
  const [billingSummary, setBillingSummary] = useState<{
    visible: boolean;
    endedBy: string;
    durationSeconds: number;
    ratePerMinute: number;
    amountDeducted: number;
    remainingBalance: number;
  } | null>(null);
  const sessionEndedHandledRef = useRef(false);

  const finalizeSessionUI = useCallback((summaryData: {
    endedBy?: string;
    durationSeconds?: number;
    ratePerMinute?: number;
    totalCost?: number;
    remainingBalance?: number;
  }) => {
    if (sessionEndedHandledRef.current) return;
    sessionEndedHandledRef.current = true;
    setIsSessionActive(false);
    setShowAddTimeModal(false);

    const fallbackElapsed = Math.max(1, parseInt(initialMinutes as string || '5') * 60 - timeRemaining);
    const durSecs = summaryData.durationSeconds || fallbackElapsed;
    const rateVal = summaryData.ratePerMinute || chatRate;
    const costVal = summaryData.totalCost !== undefined
      ? Number(summaryData.totalCost)
      : Number((Math.max(1, durSecs / 60) * rateVal).toFixed(2));
    const remBal = summaryData.remainingBalance !== undefined
      ? Number(summaryData.remainingBalance)
      : Math.max(0, Number((balance - costVal).toFixed(2)));

    setTotalSpent(costVal);
    refreshUser && refreshUser();

    const endMessage: Message = {
      id: `sys-end-${Date.now()}`,
      text: `Session ended • Duration: ${Math.floor(durSecs / 60)}m ${durSecs % 60}s • Amount Deducted: $${costVal.toFixed(2)}`,
      sender: 'system',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, endMessage]);

    setBillingSummary({
      visible: true,
      endedBy: summaryData.endedBy || 'user',
      durationSeconds: durSecs,
      ratePerMinute: rateVal,
      amountDeducted: costVal,
      remainingBalance: remBal,
    });
  }, [initialMinutes, timeRemaining, chatRate, balance, refreshUser]);

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
          flushUnsentQueue();
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
              if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current);
            } else if (data.type === 'new_message' || data.type === 'message') {
              const msg = data.message || data;
              if (msg.conversation_id && msg.conversation_id !== conversationId) return;
              const imgUrl = msg.image_url || data.image_url;
              const isImage = msg.type === 'image' || data.type === 'image' || !!imgUrl;
              const newMsg: Message = {
                id: msg.id || `msg-${Date.now()}`,
                text: isImage ? (imgUrl || msg.content || msg.text || '') : (msg.content || msg.text || ''),
                sender: msg.sender_id === user.id ? 'client' : 'psychic',
                timestamp: new Date(msg.created_at || msg.timestamp || Date.now()),
                type: isImage ? 'image' : undefined,
              };
              setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              setPsychicIsTyping(false);
              if (msg.sender_id === user.id) {
                setMessageStatus(prev => ({ ...prev, [msg.id]: 'delivered' }));
              }
            } else if (data.type === 'typing_indicator' || data.type === 'typing') {
              if (data.user_id !== user.id) {
                setPsychicIsTyping(data.is_typing);
              }
            } else if (data.type === 'partner_joined') {
              console.log('✅ Advisor partner_joined received via WebSocket:', data);
              setIsSessionActive(true);
            } else if (data.type === 'one_minute_warning') {
              if (!hasShownWarning) {
                showOneMinuteWarning();
                setHasShownWarning(true);
              }
            } else if (data.type === 'message_sent') {
              setMessageStatus(prev => ({ ...prev, [data.message_id]: 'sent' }));
            } else if (data.type === 'session_ended') {
              if (!data.session_id || data.session_id === conversationId) {
                finalizeSessionUI({
                  endedBy: data.ended_by || 'advisor',
                  durationSeconds: data.duration_seconds || Math.round((data.duration_minutes || 1) * 60),
                  ratePerMinute: data.rate_per_minute || chatRate,
                  totalCost: data.total_cost,
                  remainingBalance: data.remaining_balance,
                });
              }
            }
          } catch (e) {
            console.error('Error parsing WS message:', e);
          }
        };

        wsRef.current.onerror = () => {
          console.warn('WebSocket connection issue (Client) — will retry');
        };

        wsRef.current.onclose = () => {
          console.log('WebSocket closed');
          isConnectedRef.current = false;
          if (heartbeatRef.current) clearInterval(heartbeatRef.current);
          if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current);
          if (!sessionEndedHandledRef.current && !wsUnmountedRef.current) {
            reconnectTimerRef.current = setTimeout(connectWebSocket, 3000);
          }
        };
      } catch (e) {
        console.warn('WebSocket connection error:', e);
        isConnectedRef.current = false;
      }
    };

    wsUnmountedRef.current = false;
    connectWebSocket();

    return () => {
      wsUnmountedRef.current = true;
      isConnectedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [user?.id, conversationId]);

  // Real-time sync poll (every 2.5s) for messages and session end status backup
  useEffect(() => {
    if (!conversationId || !isSessionActive) return;

    const syncInterval = setInterval(async () => {
      if (sessionEndedHandledRef.current) return;
      try {
        const [sessRes, msgRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/chat/${conversationId}`),
          fetch(`${BACKEND_URL}/api/messages/conversation/${conversationId}?user_id=${user?.id || 'client'}`),
        ]);

        if (msgRes.ok) {
          const historyData = await msgRes.json();
          if (Array.isArray(historyData) && historyData.length > 0) {
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              let changed = false;
              const updated = [...prev];
              for (const m of historyData) {
                const img = m.image_url;
                const isImage = m.type === 'image' || !!img || (typeof m.content === 'string' && m.content.startsWith('data:image'));
                const actualImg = img || (isImage && typeof m.content === 'string' && m.content.startsWith('data:image') ? m.content : undefined);

                // If content is just '[Photo]' with an image, don't show '[Photo]' as text
                const textContent = isImage ? (actualImg || '') : (m.content === '[Photo]' ? '' : (m.content || ''));
                if (!textContent && !actualImg) continue;

                if (!existingIds.has(m.id)) {
                  // Check if this image was already optimistically added
                  const isExistingLocalImage = isImage && actualImg && prev.some(p => p.type === 'image' && (p.imageUrl === actualImg || p.text === actualImg));
                  if (!isExistingLocalImage) {
                    updated.push({
                      id: m.id,
                      text: isImage ? (actualImg || '') : textContent,
                      imageUrl: actualImg,
                      sender: m.sender_id === user?.id ? 'client' : 'psychic',
                      timestamp: new Date(m.created_at || Date.now()),
                      type: isImage ? 'image' : undefined,
                    });
                    changed = true;
                  }
                }
              }
              return changed ? updated : prev;
            });
          }
        }

        if (sessRes.ok) {
          const sessData = await sessRes.json();
          if (sessData.session_type) {
            const st = sessData.session_type === 'voice' || sessData.session_type === 'audio' ? 'phone' : sessData.session_type;
            setActiveServiceType(st);
          }
          if (sessData.agora_channel) {
            setAgoraConfig(prev => ({
              appId: sessData.agora_app_id || prev.appId,
              channelName: sessData.agora_channel || prev.channelName,
              token: sessData.client_token || prev.token,
              uid: sessData.client_uid || prev.uid,
            }));
          }
          if (sessData.status === 'ended' && !sessionEndedHandledRef.current) {
            finalizeSessionUI({
              endedBy: sessData.ended_by || 'advisor',
              durationSeconds: sessData.duration_seconds || Math.round((sessData.total_minutes || 1) * 60),
              ratePerMinute: sessData.rate_per_minute || chatRate,
              totalCost: sessData.total_cost,
              remainingBalance: sessData.remaining_balance,
            });
          }
        }
      } catch (e) {
        // Ignore transient network errors
      }
    }, 2500);

    return () => clearInterval(syncInterval);
  }, [conversationId, isSessionActive, user?.id, finalizeSessionUI, chatRate]);

  // Fetch psychic info
  useEffect(() => {
    fetchPsychic();
  }, [psychicId]);

  const fetchPsychic = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/psychics/${psychicId}`);
      const data = await response.json();
      setPsychic(data);
      
      // Check if this user has an active free chat offer
      const isGettingFreeTime = !user?.first_reading_free_used && ((user?.free_credits || 0) > 0 || (user?.free_minutes_available || 0) > 0);
      
      // Add welcome message
      const welcomeMessages: Message[] = [{
        id: '1',
        text: `Connected with ${data.name}. Your session has started.`,
        sender: 'system',
        timestamp: new Date(),
      }];
      
      // Add free time notification ONLY when user has free credit / free chat offer
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

      // Load existing message history for this conversation/session
      try {
        const historyRes = await fetch(`${BACKEND_URL}/api/messages/conversation/${conversationId}?user_id=${user?.id || 'client'}`);
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          if (Array.isArray(historyData) && historyData.length > 0) {
            const loadedMsgs: Message[] = historyData.map((m: any) => ({
              id: m.id,
              text: m.content,
              sender: m.sender_id === user?.id ? 'client' : 'psychic',
              timestamp: new Date(m.created_at || Date.now()),
            }));
            setMessages(prev => {
              const map = new Map();
              prev.forEach(m => map.set(m.id, m));
              loadedMsgs.forEach(m => map.set(m.id, m));
              return Array.from(map.values());
            });
          }
        }
      } catch (err) {
        console.warn('Error fetching conversation history:', err);
      }
    } catch (error) {
      console.error('Error fetching psychic:', error);
    }
  };

  // Timer countdown - handles free minutes first, then paid time
  useEffect(() => {
    if (!isSessionActive) return;

    const timer = setInterval(() => {
      if (freeMinutesRemaining > 0) {
        setFreeMinutesRemaining(prev => {
          const newValue = prev - 1;
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
            markFreeReadingUsed();
          }
          return newValue;
        });
      } else {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            endSession();
            return 0;
          }
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
    const warningMessage: Message = {
      id: Date.now().toString(),
      text: '⏰ 1 minute remaining! Add more time to continue your reading.',
      sender: 'system',
      timestamp: new Date(),
      type: 'warning',
    };
    setMessages(prev => [...prev, warningMessage]);
    setShowAddTimeModal(true);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'one_minute_warning',
        conversation_id: conversationId,
        receiver_id: psychicId,
      }));
    }
  };

  const endSession = async () => {
    if (sessionEndedHandledRef.current) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/end/${conversationId}?ended_by=client`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        finalizeSessionUI({
          endedBy: 'client',
          durationSeconds: data.duration_seconds || Math.round((data.duration_minutes || 1) * 60),
          ratePerMinute: data.rate_per_minute || chatRate,
          totalCost: data.total_cost,
          remainingBalance: data.remaining_balance,
        });
        return;
      }
    } catch (err) {
      console.error('Error ending session on backend:', err);
    }
    finalizeSessionUI({ endedBy: 'client' });
  };

  const handlePayTipWithStripe = async () => {
    const tipAmount = customTipAmount ? parseFloat(customTipAmount) : selectedTipAmount;
    if (!tipAmount || isNaN(tipAmount) || tipAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please select or enter a valid tip amount.');
      return;
    }

    setIsProcessingTip(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/payments/create-tip-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user?.id || 'usr_client',
          psychic_id: psychicId,
          amount: tipAmount,
          app_return_url: 'sixthsense://session-review',
          backend_url: BACKEND_URL,
        }),
      });

      if (!response.ok) {
        throw new Error('Could not initiate Stripe tip checkout');
      }

      const data = await response.json();
      if (data.checkout_url) {
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined') window.open(data.checkout_url, '_blank');
        } else {
          try {
            await WebBrowser.openBrowserAsync(data.checkout_url);
          } catch {
            Linking.openURL(data.checkout_url);
          }
        }
        setShowTipModal(false);
        Alert.alert('Tip Sent! 🎁', `Thank you for your $${tipAmount.toFixed(2)} tip for ${psychic?.name || 'your advisor'}!`);
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Error processing tip:', error);
      Alert.alert('Tip Error', error.message || 'Unable to open Stripe checkout. Please try again.');
    } finally {
      setIsProcessingTip(false);
    }
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

  // CLI-046: Unsent message queue for cellular network drops
  const unsentQueueRef = useRef<{ id: string; text: string }[]>([]);

  const flushUnsentQueue = async () => {
    if (unsentQueueRef.current.length === 0) return;
    const queue = [...unsentQueueRef.current];
    unsentQueueRef.current = [];
    for (const item of queue) {
      await sendMessageViaHttp(item.text, item.id);
    }
  };

  // Photo attachment selection with base64 encoding and instant WebSocket dispatch
  const handleAttachImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permissions are required to share photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.4,
        base64: true,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        const imageAsset = result.assets[0];
        const msgId = `img-${Date.now()}`;
        const base64Data = imageAsset.base64;
        const fullDataUri = base64Data ? `data:image/jpeg;base64,${base64Data}` : imageAsset.uri;

        const imgMsg: Message = {
          id: msgId,
          text: fullDataUri,
          imageUrl: fullDataUri,
          sender: 'client',
          timestamp: new Date(),
          type: 'image',
        };
        setMessages(prev => [...prev, imgMsg]);

        scrollToBottom();

        // Send via WebSocket to advisor in real-time
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            id: msgId,
            type: 'message',
            conversation_id: conversationId,
            receiver_id: psychicId,
            content: '',
            image_url: fullDataUri,
          }));
        } else {
          // HTTP fallback only if WebSocket is not active
          try {
            await fetch(`${BACKEND_URL}/api/messages/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: msgId,
                conversation_id: conversationId,
                sender_id: user?.id || 'client',
                sender_type: 'client',
                receiver_id: psychicId,
                content: '',
                image_url: fullDataUri,
              }),
            });
          } catch (httpErr) {
            console.warn('HTTP image save fallback notice:', httpErr);
          }
        }
      }
    } catch (e) {
      console.error('Error selecting image:', e);
    }
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
    AsyncStorage.removeItem(DRAFT_KEY).catch(() => null);

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
      unsentQueueRef.current.push({ id: messageId, text: messageText });
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
      // Remove from unsent queue on success
      unsentQueueRef.current = unsentQueueRef.current.filter(m => m.id !== messageId);
      setMessageStatus(prev => ({ ...prev, [messageId]: 'delivered' }));
    } catch (e) {
      console.error('Error sending message via HTTP, will retry upon reconnection:', e);
    }
  };

  // CLI-049: Debounced typing indicator — emit max once per 2s
  const lastTypingEmitRef = useRef(0);
  const handleInputChange = (text: string) => {
    setInputText(text);
    // CLI-052: Save draft on keystroke
    if (text) {
      AsyncStorage.setItem(DRAFT_KEY, text).catch(() => null);
    } else {
      AsyncStorage.removeItem(DRAFT_KEY).catch(() => null);
    }
    // CLI-052: Reset inactivity timer on every keystroke
    resetInactivityTimer?.();

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      if (text.length === 0) {
        wsRef.current.send(JSON.stringify({
          type: 'typing',
          conversation_id: conversationId,
          receiver_id: psychicId,
          is_typing: false,
        }));
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        return;
      }

      const now = Date.now();
      if (now - lastTypingEmitRef.current > 1500) {
        wsRef.current.send(JSON.stringify({
          type: 'typing',
          conversation_id: conversationId,
          receiver_id: psychicId,
          is_typing: true,
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
      }, 2500);
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

  const isCallMode = activeServiceType === 'phone' || activeServiceType === 'video';
  const sessionModeLabel = activeServiceType === 'video'
    ? '📹 Video Call'
    : activeServiceType === 'phone'
      ? '📞 Audio Call'
      : '💬 Live Chat';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
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
              <Text style={styles.headerName} numberOfLines={1}>{psychic.name}</Text>
            </>
          )}
        </View>
        
        {/* Header Right Controls */}
        <View style={styles.headerRight}>
          {/* CLI-049: Per-minute billing counter header */}
          <View style={[styles.timerContainer, { backgroundColor: freeMinutesRemaining > 0 ? '#FFD700' + '30' : getTimeColor() + '20' }]}>
            {freeMinutesRemaining > 0 ? (
              <>
                <Ionicons name="gift" size={14} color="#FFD700" />
                <Text style={[styles.timerText, { color: '#FFD700' }]}>
                  {formatTime(freeMinutesRemaining)}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="time" size={14} color={getTimeColor()} />
                <Text style={[styles.timerText, { color: getTimeColor() }]}>
                  {formatTime(timeRemaining)}
                </Text>
              </>
            )}
          </View>

          {isCallMode && isSessionActive && (
            <TouchableOpacity
              onPress={() => setShowChatInCall(prev => !prev)}
              style={styles.callToggleBtn}
            >
              <Ionicons name={showChatInCall ? (activeServiceType === 'video' ? 'videocam' : 'call') : 'chatbubble-ellipses'} size={15} color="#FFF" />
            </TouchableOpacity>
          )}

          {/* Quick End Session header button */}
          {isSessionActive && (
            <TouchableOpacity onPress={handleEndSession} style={styles.headerEndBtn}>
              <Text style={styles.headerEndBtnText}>End</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Rate Info Bar with End Session Button */}
      <View style={styles.rateBar}>
        <Text style={styles.rateText} numberOfLines={1}>
          {freeMinutesRemaining > 0 
            ? '🎁 FREE Session - New Client Bonus!'
            : `${sessionModeLabel} • $${chatRate.toFixed(2)}/min`
          }
        </Text>
        <View style={styles.rateBarRight}>
          {freeMinutesRemaining <= 0 && (
            <TouchableOpacity onPress={() => setShowAddTimeModal(true)}>
              <Text style={styles.addTimeLink}>+ Add time</Text>
            </TouchableOpacity>
          )}
          {isSessionActive && (
            <TouchableOpacity onPress={handleEndSession} style={styles.rateBarEndBtn}>
              <Ionicons name="close-circle-outline" size={13} color="#EF4444" />
              <Text style={styles.rateBarEndBtnText}>End Session</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* CLI-057: Free Introductory Minutes Countdown Bar */}
      {freeMinutesRemaining > 0 && (
        <View style={{ height: 4, backgroundColor: 'rgba(255,215,0,0.2)', width: '100%' }}>
          <View style={{ height: '100%', backgroundColor: '#FFD700', width: `${(freeMinutesRemaining / (4 * 60)) * 100}%` }} />
        </View>
      )}

      {/* Agora Audio / Video Call OR Chat Messages */}
      {isCallMode && isSessionActive && !showChatInCall ? (
        <View style={{ flex: 1 }}>
          <AgoraVideoCall
            appId={agoraConfig.appId}
            channelName={agoraConfig.channelName}
            token={agoraConfig.token || ''}
            uid={agoraConfig.uid}
            isVideo={activeServiceType === 'video'}
            remoteName={psychic?.name || 'Advisor'}
            timerText={freeMinutesRemaining > 0 ? `FREE ${formatTime(freeMinutesRemaining)}` : formatTime(timeRemaining)}
            subStatusText={`${sessionModeLabel} • $${chatRate.toFixed(2)}/min • Bal: $${balance.toFixed(2)}`}
            onCallEnd={endSession}
          />
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={scrollToBottom}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message) => (
            <MessageItem key={message.id} message={message} onImagePress={(uri) => setSelectedImage(uri)} />
          ))}
          
          {/* CLI-051: Advisor typing indicator bubble */}
          {psychicIsTyping && (
            <View style={[styles.messageBubble, styles.psychicMessage, styles.typingBubble, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
              <Ionicons name="chatbubbles" size={14} color={COLORS.primary} />
              <Text style={styles.typingText}>{psychic?.name || 'Advisor'} is typing...</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Time Modal */}
      {showAddTimeModal && (
        <View style={styles.addTimeModal}>
          <View style={styles.addTimeContent}>
            <Text style={styles.addTimeTitle}>⏰ Add More Time</Text>
            <Text style={styles.addTimeSubtitle}>
              Balance: ${balance.toFixed(2)} • Rate: ${chatRate.toFixed(2)}/min
            </Text>
            
            {/* CLI-059: Quick 1-tap in-chat recharge drawer */}
            <View style={styles.timeOptions}>
              {[5, 10, 15, 20].map((mins) => (
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

      {/* CLI-047: Full-Screen Image Lightbox Modal */}
      {selectedImage && (
        <Modal visible={!!selectedImage} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity
              style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }}
              onPress={() => setSelectedImage(null)}
            >
              <Ionicons name="close" size={32} color="#FFF" />
            </TouchableOpacity>
            <Image
              source={{ uri: selectedImage }}
              style={{ width: '95%', height: '80%', resizeMode: 'contain' }}
            />
          </View>
        </Modal>
      )}

      {/* Session Ended Billing Summary Popup Modal */}
      {billingSummary?.visible && (
        <Modal visible={billingSummary.visible} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ width: '100%', maxWidth: 380, backgroundColor: COLORS.backgroundCard, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}>
                <Ionicons name="receipt" size={32} color={COLORS.primary} />
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 }}>
                Session Ended
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 }}>
                {billingSummary.endedBy === 'advisor'
                  ? `${psychic?.name || 'Advisor'} ended the ${activeServiceType === 'video' ? 'video call' : activeServiceType === 'phone' ? 'audio call' : 'chat'} session.`
                  : `Your ${activeServiceType === 'video' ? 'video call' : activeServiceType === 'phone' ? 'audio call' : 'chat'} session with ${psychic?.name || 'Advisor'} has ended.`}
              </Text>

              {/* Amount Deducted Highlight Box */}
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark || '#4A3578']}
                style={{ width: '100%', borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 18 }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', marginBottom: 4 }}>
                  TOTAL AMOUNT DEDUCTED
                </Text>
                <Text style={{ color: '#FFF', fontSize: 36, fontWeight: '800' }}>
                  -${billingSummary.amountDeducted.toFixed(2)}
                </Text>
              </LinearGradient>

              {/* Breakdown Rows */}
              <View style={{ width: '100%', backgroundColor: COLORS.backgroundElevated, borderRadius: 14, padding: 14, gap: 10, marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>Session Type:</Text>
                  <Text style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' }}>
                    {activeServiceType === 'video' ? 'Video Call' : activeServiceType === 'phone' ? 'Audio Call' : 'Live Chat'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>Duration:</Text>
                  <Text style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' }}>
                    {Math.floor(billingSummary.durationSeconds / 60)}m {billingSummary.durationSeconds % 60}s
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>Rate:</Text>
                  <Text style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' }}>
                    ${billingSummary.ratePerMinute.toFixed(2)}/min
                  </Text>
                </View>
                <View style={{ height: 1, backgroundColor: COLORS.border }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>Remaining Wallet Balance:</Text>
                  <Text style={{ color: '#10B981', fontSize: 15, fontWeight: '800' }}>
                    ${billingSummary.remainingBalance.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              {/* Add Tip Button hidden */}

              <TouchableOpacity
                style={{ width: '100%', borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}
                onPress={() => {
                  setBillingSummary(null);
                  router.replace({
                    pathname: '/session-review',
                    params: {
                      psychicId: psychicId as string,
                      psychicName: psychic?.name || 'Your Advisor',
                      psychicAvatar: psychic?.profile_picture || '',
                      sessionType: activeServiceType,
                      sessionDuration: billingSummary.durationSeconds.toString(),
                      totalSpent: billingSummary.amountDeducted.toFixed(2),
                    },
                  });
                }}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark || '#4A3578']}
                  style={{ paddingVertical: 14, alignItems: 'center' }}
                >
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Rate & Review Advisor ⭐</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ width: '100%', paddingVertical: 12, alignItems: 'center' }}
                onPress={() => {
                  setBillingSummary(null);
                  router.replace('/(tabs)/home');
                }}
              >
                <Text style={{ color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' }}>Back to Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Client Tip Popup Modal */}
      <Modal
        visible={showTipModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTipModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 360, backgroundColor: COLORS.backgroundCard, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FDF2F8', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="gift" size={30} color="#DB2777" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4, textAlign: 'center' }}>
              Add a Tip for {psychic?.name || 'Advisor'}
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 }}>
              Show your appreciation for the reading! 100% of your gratuity goes directly to your advisor.
            </Text>

            {/* Preset Tip Options */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16, width: '100%' }}>
              {[2, 5, 10, 20, 50].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: selectedTipAmount === amt && !customTipAmount ? '#DB2777' : COLORS.backgroundElevated,
                    borderWidth: 1,
                    borderColor: selectedTipAmount === amt && !customTipAmount ? '#DB2777' : COLORS.border,
                  }}
                  onPress={() => {
                    setSelectedTipAmount(amt);
                    setCustomTipAmount('');
                  }}
                >
                  <Text style={{
                    color: selectedTipAmount === amt && !customTipAmount ? '#FFF' : COLORS.textPrimary,
                    fontWeight: '700',
                    fontSize: 15,
                  }}>
                    ${amt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Amount */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: COLORS.backgroundElevated,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: customTipAmount ? '#DB2777' : COLORS.border,
              paddingHorizontal: 14,
              paddingVertical: 8,
              width: '100%',
              marginBottom: 20,
            }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 16, fontWeight: '700', marginRight: 6 }}>$</Text>
              <TextInput
                style={{ flex: 1, color: COLORS.textPrimary, fontSize: 15 }}
                placeholder="Custom tip amount"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
                value={customTipAmount}
                onChangeText={(val) => {
                  setCustomTipAmount(val);
                  setSelectedTipAmount(null);
                }}
              />
            </View>

            {/* Pay with Stripe Button */}
            <TouchableOpacity
              style={{ width: '100%', borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}
              onPress={handlePayTipWithStripe}
              disabled={isProcessingTip}
            >
              <LinearGradient
                colors={['#DB2777', '#9D174D']}
                style={{ paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
              >
                {isProcessingTip ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="card" size={18} color="#FFF" />
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Pay Tip via Stripe 💳</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={{ paddingVertical: 10, width: '100%', alignItems: 'center' }}
              onPress={() => setShowTipModal(false)}
            >
              <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Input Area (shown in chat mode or when chat overlay is opened during call) */}
      {(!isCallMode || showChatInCall || !isSessionActive) && (
        <View style={[styles.inputArea, { paddingBottom: insets.bottom + SPACING.sm }]}>
          {isSessionActive ? (
            <>
              <TouchableOpacity style={styles.attachButton} onPress={handleAttachImage}>
                <Ionicons name="image" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <TextInput
                style={styles.textInput}
                placeholder="Type a message..."
                placeholderTextColor={COLORS.textMuted}
                value={inputText}
                onChangeText={handleInputChange}
                onFocus={() => scrollToBottom()}
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
              onPress={() => router.replace('/(tabs)/home')}
            >
              <Text style={styles.endedButtonText}>Session Ended • Return to Home</Text>
            </TouchableOpacity>
          )}
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.xs,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  callToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerEndBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  headerEndBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
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
    flex: 1,
    marginRight: SPACING.sm,
  },
  rateBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rateBarEndBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rateBarEndBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
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
