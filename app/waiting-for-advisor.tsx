import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING } from '../src/constants/theme';
import { useAuth } from '../src/context/AuthContext';
import { apiClient } from '../src/services/api';
import { Audio } from 'expo-av';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.29.227:8000';
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

export default function WaitingForAdvisorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  
  const psychicId = params.psychicId as string;
  const psychicName = params.psychicName as string;
  const psychicAvatar = params.psychicAvatar as string;
  const serviceType = (params.serviceType as string) || 'chat';
  const minutes = params.minutes as string;
  const rate = params.rate as string;
  
  const [requestId, setRequestId] = useState<string | null>(null);
  const [status, setStatus] = useState<'sending' | 'pending' | 'accepted' | 'rejected' | 'expired'>('sending');
  const [countdown, setCountdown] = useState(60); // 60 second timeout
  const [error, setError] = useState<string | null>(null);
  
  // Animation for the pulsing ring
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    // Pulsing animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // CLI-061 / CLI-062: Keep screen active & play ringtone even in silent mode
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      allowsRecordingIOS: false,
    }).catch(() => null);

    return () => pulse.stop();
  }, []);
  
  // CLI-062: WS ref for instant accept/reject events
  const wsRef = useRef<WebSocket | null>(null);
  const navigatedRef = useRef(false);

  const navigateToAcceptedSession = (data: any) => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    setStatus('accepted');
    setTimeout(() => {
      router.replace({
        pathname: '/chat/[id]',
        params: {
          id: data.session_id || `session-${Date.now()}`,
          psychicId,
          rate,
          minutes,
          serviceType: data.session_type || serviceType,
          agoraChannel: data.agora_channel || '',
          agoraAppId: data.agora_app_id || '',
          agoraUid: String(data.client_uid || 1001),
          agoraToken: data.client_token || '',
          requestAccepted: 'true',
        },
      });
    }, 1000);
  };

  const requestSentRef = useRef(false);

  useEffect(() => {
    if (requestSentRef.current) return;
    // CLI-064: Pre-call low-balance guard
    const callRate = parseFloat(rate || '3.99');
    const callMinutes = parseInt(minutes || '5');
    const estimatedCost = callRate * callMinutes;
    if ((user?.balance || 0) < estimatedCost) {
      Alert.alert(
        'Insufficient Balance',
        `You need at least $${estimatedCost.toFixed(2)} for a ${callMinutes}-min session at $${callRate}/min. Please add credits first.`,
        [
          { text: 'Add Credits', onPress: () => router.replace('/(tabs)/wallet') },
          { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
        ]
      );
      return;
    }
    requestSentRef.current = true;
    sendSessionRequest();
  }, []);

  // CLI-062: WS listener for instant accept/reject
  useEffect(() => {
    if (!requestId || !user?.id) return;
    const ws = new WebSocket(`${WS_URL}/api/ws/${user.id}`);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'request_accepted' && data.request_id === requestId) {
          navigateToAcceptedSession(data);
        } else if (data.type === 'request_rejected' && data.request_id === requestId) {
          setStatus('rejected');
        }
      } catch (e) {}
    };
    wsRef.current = ws;
    return () => ws.close();
  }, [requestId, user?.id]);
  
  // Countdown timer
  useEffect(() => {
    if (status !== 'pending') return;
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [status]);
  
  // Poll for request status
  useEffect(() => {
    if (!requestId || status !== 'pending') return;
    
    const pollInterval = setInterval(async () => {
      try {
        const data = await apiClient.get<any>(`/api/chat/request/${requestId}/status`, false);
        if (data && data.status === 'accepted') {
          navigateToAcceptedSession(data);
        } else if (data && data.status === 'rejected') {
          setStatus('rejected');
        }
      } catch (err) {
        console.error('Error polling request status:', err);
      }
    }, 1500);
    
    return () => clearInterval(pollInterval);
  }, [requestId, status]);
  
  // CLI-061: Migrate sendSessionRequest to apiClient with Bearer auth
  const sendSessionRequest = async () => {
    try {
      const data = await apiClient.post(
        `/api/chat/request?user_id=${user?.id}&user_name=${encodeURIComponent(user?.name || 'Client')}`,
        {
          psychic_id: psychicId,
          session_type: serviceType,
          initial_minutes: parseInt(minutes || '5'),
        }
      );
      setRequestId(data.request_id);
      setStatus('pending');
    } catch (err: any) {
      console.error('Error sending request:', err);
      setError(err.message || 'Failed to connect to advisor');
      setStatus('rejected');
    }
  };

  // CLI-063: Cancel request on backend via DELETE
  const handleCancel = async () => {
    if (requestId) {
      try {
        await apiClient.delete(`/api/chat/request/${requestId}`).catch(() => null);
      } catch {
        // Quiet fallback
      }
    }
    wsRef.current?.close();
    router.back();
  };
  
  const handleTryAgain = () => {
    setStatus('sending');
    setCountdown(60);
    requestSentRef.current = true;
    sendSessionRequest();
  };
  
  const getServiceIcon = () => {
    switch (serviceType) {
      case 'phone': return 'call';
      case 'video': return 'videocam';
      default: return 'chatbubble';
    }
  };
  
  const getServiceLabel = () => {
    switch (serviceType) {
      case 'phone': return 'Phone Call';
      case 'video': return 'Video Call';
      default: return 'Chat Session';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F3460']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      <View style={styles.content}>
        {/* Animated Avatar */}
        <View style={styles.avatarContainer}>
          <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
          <Image
            source={{ uri: psychicAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400' }}
            style={styles.avatar}
          />
          <View style={[styles.serviceIconBadge, { backgroundColor: COLORS.primary }]}>
            <Ionicons name={getServiceIcon()} size={16} color="#FFF" />
          </View>
        </View>
        
        {/* Status Text */}
        <Text style={styles.psychicName}>{psychicName}</Text>
        
        {status === 'sending' && (
          <>
            <Text style={styles.statusText}>Connecting...</Text>
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
          </>
        )}
        
        {status === 'pending' && (
          <>
            <Text style={styles.statusText}>Waiting for {psychicName} to accept...</Text>
            <Text style={styles.subText}>
              {getServiceLabel()} • {minutes} min • ${rate}/min
            </Text>
            
            {/* CLI-068: Countdown progress bar */}
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownText}>{countdown}s</Text>
              <View style={{ width: 200, height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                <View style={{ height: '100%', backgroundColor: COLORS.primary, width: `${(countdown / 60) * 100}%` }} />
              </View>
              <Text style={styles.countdownLabel}>Request expires</Text>
            </View>
            
            {/* Info */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>
                The advisor will receive a notification. Please wait while they accept your request.
              </Text>
            </View>
          </>
        )}
        
        {status === 'accepted' && (
          <>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={60} color={COLORS.online} />
            </View>
            <Text style={[styles.statusText, { color: COLORS.online }]}>Request Accepted!</Text>
            <Text style={styles.subText}>Connecting you now...</Text>
          </>
        )}
        
        {status === 'rejected' && (
          <>
            <View style={styles.errorIcon}>
              <Ionicons name="close-circle" size={60} color={COLORS.error} />
            </View>
            <Text style={[styles.statusText, { color: COLORS.error }]}>
              {error || 'Advisor declined the request'}
            </Text>
            <Text style={styles.subText}>Please try another advisor or try again later</Text>
            
            <TouchableOpacity style={styles.tryAgainButton} onPress={handleTryAgain}>
              <Text style={styles.tryAgainText}>Try Again</Text>
            </TouchableOpacity>
          </>
        )}
        
        {status === 'expired' && (
          <>
            <View style={styles.errorIcon}>
              <Ionicons name="time" size={60} color={COLORS.warning} />
            </View>
            <Text style={[styles.statusText, { color: COLORS.warning }]}>Request Timed Out</Text>
            <Text style={styles.subText}>The advisor didn't respond in time</Text>
            
            <TouchableOpacity style={styles.tryAgainButton} onPress={handleTryAgain}>
              <Text style={styles.tryAgainText}>Try Again</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      
      {/* Cancel Button */}
      {(status === 'pending' || status === 'sending') && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel Request</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Back Button for rejected/expired */}
      {(status === 'rejected' || status === 'expired') && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Find Another Advisor</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.xl,
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(155, 89, 182, 0.3)',
    top: -10,
    left: -10,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: COLORS.primary,
  },
  serviceIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1A1A2E',
  },
  psychicName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: SPACING.sm,
  },
  statusText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  countdownContainer: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.primary,
  },
  countdownLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(155, 89, 182, 0.1)',
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.xl,
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  successIcon: {
    marginBottom: SPACING.md,
  },
  errorIcon: {
    marginBottom: SPACING.md,
  },
  tryAgainButton: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 30,
  },
  tryAgainText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: SPACING.lg,
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: SPACING.md,
    borderRadius: 30,
    alignItems: 'center',
  },
  cancelText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '500',
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 30,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
