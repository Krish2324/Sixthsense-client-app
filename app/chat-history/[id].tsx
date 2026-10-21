import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://api.sixthsensepsychics.com';

interface HistoryMessage {
  id: string;
  content: string;
  sender_type: 'client' | 'psychic';
  image_url?: string;
  created_at: string;
}

export default function ChatHistoryDetailScreen() {
  const { id, psychicName, psychicId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<HistoryMessage[]>([]);
  const [advisorNotes, setAdvisorNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSessionAndMessages() {
      if (!id) return;
      try {
        const [sessRes, msgRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/chat/${id}`),
          fetch(`${BACKEND_URL}/api/messages/conversation/${id}?user_id=${user?.id || 'client'}`),
        ]);

        if (sessRes.ok) {
          const sessData = await sessRes.json();
          setSession(sessData);
          if (sessData.notes || sessData.psychic_notes) {
            setAdvisorNotes(sessData.notes || sessData.psychic_notes);
          }
        }

        // Also fetch from dedicated notes endpoint
        try {
          const notesRes = await fetch(`${BACKEND_URL}/api/sessions/${id}/notes`);
          if (notesRes.ok) {
            const nData = await notesRes.json();
            if (nData?.notes) {
              setAdvisorNotes(nData.notes);
            }
          }
        } catch {}

        if (msgRes.ok) {
          const msgsData = await msgRes.json();
          if (Array.isArray(msgsData) && msgsData.length > 0) {
            setMessages(
              msgsData.map((m: any) => ({
                id: m.id || String(Math.random()),
                content: m.content || m.text || m.message || '',
                sender_type: m.sender_type || (m.sender_id === user?.id ? 'client' : 'psychic'),
                image_url: m.image_url,
                created_at: m.created_at || m.timestamp || '',
              }))
            );
          } else if (sessRes.ok) {
            // Check session messages array as fallback
            const sessData = await sessRes.json().catch(() => null);
            if (sessData?.messages) {
              setMessages(
                sessData.messages.map((m: any) => ({
                  id: m.id || String(Math.random()),
                  content: m.message || m.content || '',
                  sender_type: m.sender_type || (m.sender_id === user?.id ? 'client' : 'psychic'),
                  image_url: m.image_url,
                  created_at: m.timestamp || '',
                }))
              );
            }
          }
        }
      } catch (err) {
        console.warn('Error loading chat history detail:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSessionAndMessages();
  }, [id, user?.id]);

  const advisorName = (psychicName as string) || session?.psychic_name || 'Psychic Advisor';
  const targetPsychicId = (psychicId as string) || session?.psychic_id;

  const formatMessageTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm, backgroundColor: colors.backgroundCard }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {advisorName}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Past Reading • {messages.length} messages
          </Text>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => targetPsychicId && router.push(`/psychic/${targetPsychicId}` as any)}
        >
          <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Lightbox Modal for Photo Viewing */}
      {selectedImage && (
        <Modal visible={!!selectedImage} transparent animationType="fade">
          <View style={styles.lightboxOverlay}>
            <TouchableOpacity
              style={styles.lightboxCloseBtn}
              onPress={() => setSelectedImage(null)}
            >
              <Ionicons name="close" size={30} color="#FFF" />
            </TouchableOpacity>
            <Image source={{ uri: selectedImage }} style={styles.lightboxImage} />
          </View>
        </Modal>
      )}

      {/* Messages Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading past conversation...
          </Text>
        </View>
      ) : messages.length === 0 ? (
        <ScrollView
          style={styles.messagesScroll}
          contentContainerStyle={[styles.messagesContent, { paddingBottom: insets.bottom + 90 }]}
        >
          {advisorNotes ? (
            <View style={[styles.advisorNotesCard, { backgroundColor: colors.backgroundCard, borderColor: colors.primary + '35' }]}>
              <View style={styles.advisorNotesHeader}>
                <View style={[styles.advisorNotesIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="sparkles" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.advisorNotesTitle, { color: colors.textPrimary }]}>
                    {advisorName}'s Reading Notes & Guidance
                  </Text>
                  <Text style={[styles.advisorNotesSub, { color: colors.textMuted }]}>
                    Personal notes left for you after this reading
                  </Text>
                </View>
              </View>
              <Text style={[styles.advisorNotesBody, { color: colors.textSecondary }]}>
                {advisorNotes}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Messages Saved</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                This reading session had no recorded chat messages.
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.messagesScroll}
          contentContainerStyle={[styles.messagesContent, { paddingBottom: insets.bottom + 90 }]}
        >
          {/* Advisor's Reading & Session Notes */}
          {advisorNotes ? (
            <View style={[styles.advisorNotesCard, { backgroundColor: colors.backgroundCard, borderColor: colors.primary + '35' }]}>
              <View style={styles.advisorNotesHeader}>
                <View style={[styles.advisorNotesIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="sparkles" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.advisorNotesTitle, { color: colors.textPrimary }]}>
                    {advisorName}'s Reading Notes & Guidance
                  </Text>
                  <Text style={[styles.advisorNotesSub, { color: colors.textMuted }]}>
                    Personal notes left for you after this reading
                  </Text>
                </View>
              </View>
              <Text style={[styles.advisorNotesBody, { color: colors.textSecondary }]}>
                {advisorNotes}
              </Text>
            </View>
          ) : null}
          {messages.map((m) => {
            const isClient = m.sender_type === 'client';
            const hasImage = !!m.image_url;
            return (
              <View
                key={m.id}
                style={[
                  styles.messageRow,
                  isClient ? styles.messageRowClient : styles.messageRowAdvisor,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isClient
                      ? [styles.clientBubble, { backgroundColor: colors.primary }]
                      : [styles.advisorBubble, { backgroundColor: colors.backgroundCard }],
                  ]}
                >
                  {hasImage && (
                    <TouchableOpacity
                      onPress={() => setSelectedImage(m.image_url || null)}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={{ uri: m.image_url }}
                        style={styles.messageImage}
                      />
                    </TouchableOpacity>
                  )}
                  {m.content && m.content !== '[Photo]' ? (
                    <Text
                      style={[
                        styles.messageText,
                        { color: isClient ? '#FFF' : colors.textPrimary },
                      ]}
                    >
                      {m.content}
                    </Text>
                  ) : null}
                  {m.created_at ? (
                    <Text
                      style={[
                        styles.messageTime,
                        { color: isClient ? 'rgba(255,255,255,0.7)' : colors.textMuted },
                      ]}
                    >
                      {formatMessageTime(m.created_at)}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Start New Session Floating Action Button */}
      {targetPsychicId && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + SPACING.sm, backgroundColor: colors.backgroundCard }]}>
          <TouchableOpacity
            style={styles.newSessionBtn}
            onPress={() => router.push(`/psychic/${targetPsychicId}` as any)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark || '#4A3578']}
              style={styles.newSessionGradient}
            >
              <Ionicons name="chatbubbles" size={20} color="#FFF" />
              <Text style={styles.newSessionText}>Chat Again with {advisorName}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  profileBtn: {
    padding: SPACING.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  messageRowClient: {
    justifyContent: 'flex-end',
  },
  messageRowAdvisor: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  clientBubble: {
    borderBottomRightRadius: 4,
  },
  advisorBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  messageImage: {
    width: 210,
    height: 155,
    borderRadius: 12,
    marginBottom: 6,
    resizeMode: 'cover',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  lightboxImage: {
    width: '94%',
    height: '80%',
    resizeMode: 'contain',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  newSessionBtn: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  newSessionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  newSessionText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  advisorNotesCard: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  advisorNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  advisorNotesIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  advisorNotesTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  advisorNotesSub: {
    fontSize: 11,
    marginTop: 1,
  },
  advisorNotesBody: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
});
