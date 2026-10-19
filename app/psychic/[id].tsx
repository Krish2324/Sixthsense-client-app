import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { COLORS, SPACING, SHADOWS } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import StartSessionModal from '../../src/components/StartSessionModal';
import { psychicEvents, doesPsychicMatchEvent } from '../../src/services/psychicEvents';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.29.227:8000';

export default function PsychicProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [psychic, setPsychic] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedService, setSelectedService] = useState<'chat' | 'phone' | 'video'>('chat');
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState({ positive: 0, negative: 0 });

  const balance = user?.balance || 0;

  useEffect(() => {
    fetchPsychic();
    checkFavorite();
    trackRecentlyVisited();
    fetchReviews();
  }, [id]);

  // Real-time WebSocket listener for advisor status changes
  useEffect(() => {
    const unsubscribe = psychicEvents.subscribe((event) => {
      setPsychic((prev: any) => {
        if (!prev) return prev;
        if (doesPsychicMatchEvent(prev, event) || event.psychic_id === id || (event.alias_ids || []).includes(id as string)) {
          const isOnline = event.online_status === 'online';
          return {
            ...prev,
            online_status: event.online_status,
            is_online: isOnline,
            offers_chat: event.offers_chat !== undefined ? event.offers_chat : isOnline,
            offers_phone: event.offers_phone !== undefined ? event.offers_phone : isOnline,
            offers_video: event.offers_video !== undefined ? event.offers_video : isOnline,
            offers_video_call: event.offers_video_call !== undefined ? event.offers_video_call : (event.offers_video !== undefined ? event.offers_video : isOnline),
          };
        }
        return prev;
      });
    });

    return unsubscribe;
  }, [id]);


  const trackRecentlyVisited = async () => {
    if (!user?.id || !id) return;
    try {
      await fetch(`${BACKEND_URL}/api/users/${user.id}/recently-visited/${id}`, {
        method: 'POST',
      });
    } catch (error) {
      console.log('Error tracking visit:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/reviews/psychic/${id}?limit=10`);
      if (response.ok) {
        const data = await response.json();
        const reviewsList = data.reviews || [];
        setReviews(reviewsList);
        
        // Calculate positive (4-5 stars) vs negative (1-3 stars)
        const positive = reviewsList.filter((r: any) => r.rating >= 4).length;
        const negative = reviewsList.filter((r: any) => r.rating < 4).length;
        setReviewStats({ positive, negative });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchPsychic = async () => {
    try {
      console.log(`Fetching psychic from: ${BACKEND_URL}/api/psychics/${id}`);
      const response = await fetch(`${BACKEND_URL}/api/psychics/${id}`);
      console.log(`Response status: ${response.status}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error response: ${errorText}`);
        throw new Error('Psychic not found');
      }
      const data = await response.json();
      setPsychic(data);
    } catch (error) {
      console.error('Fetch psychic error:', error);
      console.error('BACKEND_URL was:', BACKEND_URL);
      Alert.alert('Error', 'Failed to load psychic profile');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const checkFavorite = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/favorites/check/${id}?user_id=${user.id}`);
      const data = await response.json();
      setIsFavorite(data.is_favorite);
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user?.id) {
      Alert.alert('Sign In Required', 'Please sign in to save favorites.');
      return;
    }
    try {
      if (isFavorite) {
        await fetch(`${BACKEND_URL}/api/favorites/${id}?user_id=${user.id}`, { method: 'DELETE' });
      } else {
        await fetch(`${BACKEND_URL}/api/favorites/?user_id=${user.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ psychic_id: id }),
        });
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorites');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return COLORS.online;
      case 'busy': return COLORS.busy;
      default: return COLORS.offline;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'busy': return 'In Session';
      default: return 'Offline';
    }
  };

  const handleStartService = (serviceType: 'chat' | 'phone' | 'video') => {
    // CLI-030: Force account sign-in prompt for guest users
    if (!user) {
      Alert.alert(
        'Account Required',
        'Please sign in or create an account to start a reading with an advisor.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In / Register', onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }

    if (psychic?.online_status !== 'online') {
      Alert.alert('Unavailable', 'This advisor is currently unavailable.');
      return;
    }
    setSelectedService(serviceType);
    setShowSessionModal(true);
  };

  const handleSessionStart = (minutes: number, serviceType: 'chat' | 'phone' | 'video') => {
    setShowSessionModal(false);
    
    const rate =
      serviceType === 'video'
        ? (psychic.video_call_rate || psychic.video_rate || 7.99)
        : serviceType === 'phone'
        ? (psychic.phone_rate || 5.99)
        : (psychic.chat_rate || 3.99);
    
    // Navigate to waiting screen - psychic must accept the request first
    router.push({
      pathname: '/waiting-for-advisor',
      params: {
        psychicId: psychic.id,
        psychicName: psychic.name,
        psychicAvatar: psychic.profile_picture,
        serviceType: serviceType,
        rate: rate.toString(),
        minutes: minutes.toString(),
      },
    });
  };

  const handleRequestVideo = (deliveryType: 'standard' | 'emergency') => {
    router.push({
      pathname: '/question/submit',
      params: {
        psychicId: psychic.id,
        psychicName: psychic.name,
        deliveryType,
      },
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!psychic) return null;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Back Button */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={toggleFavorite}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? COLORS.heart : COLORS.textPrimary}
            />
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: psychic.profile_picture }} style={styles.profileImage} />
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(psychic.online_status) }]}>
              <Text style={styles.statusText}>{getStatusText(psychic.online_status)}</Text>
            </View>
          </View>

          <Text style={styles.name}>{psychic.name}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={16} color={COLORS.star} />
              <Text style={styles.statValue}>{psychic.average_rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>({psychic.total_reviews} reviews)</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="chatbubbles" size={16} color={COLORS.primary} />
              <Text style={styles.statValue}>{psychic.total_readings}</Text>
              <Text style={styles.statLabel}>readings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="thumbs-up" size={16} color="#22C55E" />
              <Text style={styles.statValue}>{reviewStats.positive}</Text>
              <Text style={styles.statLabel}>positive</Text>
            </View>
          </View>
        </View>

        {/* Intro Video Section */}
        {psychic.intro_video_url && (
          <View style={styles.section}>
            <View style={styles.introVideoHeader}>
              <Ionicons name="play-circle" size={22} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Meet {psychic.name.split(' ')[0]}</Text>
            </View>
            <View style={styles.introVideoContainer}>
              <Video
                source={{ uri: psychic.intro_video_url }}
                style={styles.introVideo}
                useNativeControls
                resizeMode={ResizeMode.COVER}
                posterSource={{ uri: psychic.profile_picture }}
                usePoster
              />
            </View>
            <Text style={styles.introVideoHint}>
              Watch this 1-minute intro to learn about their gifts
            </Text>
          </View>
        )}

        {/* Live Reading Options - Chat, Audio Call & Video Call */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Reading Options</Text>
          <View style={{ gap: 10 }}>
            {/* Live Chat */}
            <TouchableOpacity 
              style={[
                styles.chatServiceCard,
                !(psychic.online_status === 'online' && (psychic.offers_chat ?? true)) && styles.serviceCardDisabled
              ]}
              onPress={() => handleStartService('chat')}
              activeOpacity={psychic.online_status === 'online' ? 0.8 : 1}
              disabled={!(psychic.online_status === 'online' && (psychic.offers_chat ?? true))}
            >
              <View style={[
                styles.serviceIconBg, 
                { backgroundColor: (psychic.online_status === 'online' && (psychic.offers_chat ?? true)) ? COLORS.chatGreen + '20' : '#E5E7EB' }
              ]}>
                <Ionicons 
                  name="chatbubble" 
                  size={26} 
                  color={(psychic.online_status === 'online' && (psychic.offers_chat ?? true)) ? COLORS.chatGreen : '#9CA3AF'} 
                />
              </View>
              <View style={styles.chatServiceInfo}>
                <Text style={[
                  styles.chatServiceTitle,
                  !(psychic.online_status === 'online' && (psychic.offers_chat ?? true)) && styles.serviceTitleDisabled
                ]}>Start Live Chat</Text>
                <Text style={[
                  styles.chatServicePrice,
                  !(psychic.online_status === 'online' && (psychic.offers_chat ?? true)) && styles.servicePriceDisabled
                ]}>${(psychic.chat_rate || 3.99).toFixed(2)}/min</Text>
              </View>
              {(psychic.online_status === 'online' && (psychic.offers_chat ?? true)) ? (
                <Ionicons name="chevron-forward" size={24} color={COLORS.chatGreen} />
              ) : (
                <Text style={styles.serviceUnavailable}>Unavailable</Text>
              )}
            </TouchableOpacity>

            {/* Audio Call */}
            <TouchableOpacity 
              style={[
                styles.chatServiceCard,
                !(psychic.online_status === 'online' && (psychic.offers_phone ?? true)) && styles.serviceCardDisabled
              ]}
              onPress={() => handleStartService('phone')}
              activeOpacity={psychic.online_status === 'online' ? 0.8 : 1}
              disabled={!(psychic.online_status === 'online' && (psychic.offers_phone ?? true))}
            >
              <View style={[
                styles.serviceIconBg, 
                { backgroundColor: (psychic.online_status === 'online' && (psychic.offers_phone ?? true)) ? COLORS.primary + '20' : '#E5E7EB' }
              ]}>
                <Ionicons 
                  name="call" 
                  size={26} 
                  color={(psychic.online_status === 'online' && (psychic.offers_phone ?? true)) ? COLORS.primary : '#9CA3AF'} 
                />
              </View>
              <View style={styles.chatServiceInfo}>
                <Text style={[
                  styles.chatServiceTitle,
                  !(psychic.online_status === 'online' && (psychic.offers_phone ?? true)) && styles.serviceTitleDisabled
                ]}>Start Audio Call</Text>
                <Text style={[
                  styles.chatServicePrice,
                  !(psychic.online_status === 'online' && (psychic.offers_phone ?? true)) && styles.servicePriceDisabled
                ]}>${(psychic.phone_rate || 5.99).toFixed(2)}/min</Text>
              </View>
              {(psychic.online_status === 'online' && (psychic.offers_phone ?? true)) ? (
                <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
              ) : (
                <Text style={styles.serviceUnavailable}>Unavailable</Text>
              )}
            </TouchableOpacity>

            {/* Video Call */}
            <TouchableOpacity 
              style={[
                styles.chatServiceCard,
                !(psychic.online_status === 'online' && (psychic.offers_video ?? psychic.offers_video_call ?? true)) && styles.serviceCardDisabled
              ]}
              onPress={() => handleStartService('video')}
              activeOpacity={psychic.online_status === 'online' ? 0.8 : 1}
              disabled={!(psychic.online_status === 'online' && (psychic.offers_video ?? psychic.offers_video_call ?? true))}
            >
              <View style={[
                styles.serviceIconBg, 
                { backgroundColor: (psychic.online_status === 'online' && (psychic.offers_video ?? psychic.offers_video_call ?? true)) ? '#8B5CF620' : '#E5E7EB' }
              ]}>
                <Ionicons 
                  name="videocam" 
                  size={26} 
                  color={(psychic.online_status === 'online' && (psychic.offers_video ?? psychic.offers_video_call ?? true)) ? '#8B5CF6' : '#9CA3AF'} 
                />
              </View>
              <View style={styles.chatServiceInfo}>
                <Text style={[
                  styles.chatServiceTitle,
                  !(psychic.online_status === 'online' && (psychic.offers_video ?? psychic.offers_video_call ?? true)) && styles.serviceTitleDisabled
                ]}>Start Video Call</Text>
                <Text style={[
                  styles.chatServicePrice,
                  !(psychic.online_status === 'online' && (psychic.offers_video ?? psychic.offers_video_call ?? true)) && styles.servicePriceDisabled
                ]}>${(psychic.video_call_rate || psychic.video_rate || 7.99).toFixed(2)}/min</Text>
              </View>
              {(psychic.online_status === 'online' && (psychic.offers_video ?? psychic.offers_video_call ?? true)) ? (
                <Ionicons name="chevron-forward" size={24} color="#8B5CF6" />
              ) : (
                <Text style={styles.serviceUnavailable}>Unavailable</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Ask a Question (Recorded Video Reading) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ask a Question (Recorded Video)</Text>
          <View style={styles.recordedVideoOptions}>
            {/* Standard Question - $12 */}
            <TouchableOpacity
              style={styles.videoOption}
              onPress={() => handleRequestVideo('standard')}
              activeOpacity={0.8}
            >
              <View style={styles.videoOptionHeader}>
                <View style={[styles.serviceIconBg, { backgroundColor: COLORS.primary + '20' }]}>
                  <Ionicons name="videocam" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.videoOptionInfo}>
                  <Text style={styles.videoOptionTitle}>Ask a Question</Text>
                  <Text style={styles.videoOptionDesc}>24 hours delivery • Detailed video answer</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <Text style={styles.videoOptionPrice}>$12.00</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </View>
            </TouchableOpacity>

            {/* Emergency / Rush Question - $20 */}
            <TouchableOpacity
              style={[styles.videoOption, styles.videoOptionUrgent]}
              onPress={() => handleRequestVideo('emergency')}
              activeOpacity={0.8}
            >
              <View style={styles.videoOptionHeader}>
                <View style={[styles.serviceIconBg, { backgroundColor: COLORS.error + '20' }]}>
                  <Ionicons name="flash" size={24} color={COLORS.error} />
                </View>
                <View style={styles.videoOptionInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.videoOptionTitle}>Rush / Urgent</Text>
                    <View style={{ backgroundColor: COLORS.error + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ color: COLORS.error, fontSize: 10, fontWeight: '700' }}>1 HOUR</Text>
                    </View>
                  </View>
                  <Text style={styles.videoOptionDesc}>Guaranteed 1-hour fast video response</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <Text style={[styles.videoOptionPrice, { color: COLORS.error }]}>$20.00</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.error} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.description}>{psychic.description}</Text>
          </View>
        </View>

        {/* Experience & Background */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience & Background</Text>
          <View style={styles.aboutCard}>
            <View style={styles.experienceItem}>
              <Ionicons name="time-outline" size={18} color={COLORS.secondary} />
              <Text style={styles.experienceText}>
                {psychic.years_experience || '5+'} years of experience
              </Text>
            </View>
            <View style={styles.experienceItem}>
              <Ionicons name="school-outline" size={18} color={COLORS.secondary} />
              <Text style={styles.experienceText}>
                Professionally trained & certified
              </Text>
            </View>
            <View style={styles.experienceItem}>
              <Ionicons name="star-outline" size={18} color={COLORS.secondary} />
              <Text style={styles.experienceText}>
                {psychic.total_readings || '1000+'} readings completed
              </Text>
            </View>
          </View>
        </View>

        {/* Specialties Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specialties</Text>
          <View style={styles.tagsContainer}>
            {psychic.specialties?.map((specialty: string, index: number) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{specialty}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Topics Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Topics</Text>
          <View style={styles.tagsContainer}>
            {psychic.topics?.map((topic: string, index: number) => (
              <View key={index} style={[styles.tag, styles.topicTag]}>
                <Text style={[styles.tagText, styles.topicTagText]}>{topic}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              <View style={styles.reviewsSummary}>
                <View style={styles.reviewStat}>
                  <Ionicons name="thumbs-up" size={14} color="#22C55E" />
                  <Text style={styles.reviewStatText}>{reviewStats.positive}</Text>
                </View>
                <View style={styles.reviewStat}>
                  <Ionicons name="thumbs-down" size={14} color="#EF4444" />
                  <Text style={styles.reviewStatText}>{reviewStats.negative}</Text>
                </View>
              </View>
            </View>
            {reviews.slice(0, 3).map((review: any, index: number) => (
              <View key={review.id || index} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= review.rating ? 'star' : 'star-outline'}
                        size={14}
                        color={star <= review.rating ? COLORS.star : COLORS.textMuted}
                      />
                    ))}
                  </View>
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </Text>
                </View>
                {review.comment && (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                )}
                <Text style={styles.reviewAuthor}>
                  — {review.user_name || 'Anonymous'}
                </Text>
              </View>
            ))}
            {reviews.length > 3 && (
              <TouchableOpacity style={styles.seeAllReviewsButton}>
                <Text style={styles.seeAllReviewsText}>See all {reviews.length} reviews</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Bottom Padding */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Fixed Action Bar with Chat, Audio Call, and Video Call */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + SPACING.md, flexDirection: 'row', gap: 8 }]}>
        {psychic.online_status === 'online' ? (
          <>
            <TouchableOpacity
              style={{ flex: 1, borderRadius: 14, overflow: 'hidden', opacity: (psychic.offers_chat ?? true) ? 1 : 0.45 }}
              onPress={() => handleStartService('chat')}
              disabled={!(psychic.offers_chat ?? true)}
            >
              <LinearGradient
                colors={[COLORS.chatGreen || '#10B981', '#059669']}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6 }}
              >
                <Ionicons name="chatbubble" size={18} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>
                  Chat ${psychic.chat_rate || '3.99'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1, borderRadius: 14, overflow: 'hidden', opacity: (psychic.offers_phone ?? true) ? 1 : 0.45 }}
              onPress={() => handleStartService('phone')}
              disabled={!(psychic.offers_phone ?? true)}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6 }}
              >
                <Ionicons name="call" size={18} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>
                  Audio ${psychic.phone_rate || '5.99'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1, borderRadius: 14, overflow: 'hidden', opacity: (psychic.offers_video ?? psychic.offers_video_call ?? true) ? 1 : 0.45 }}
              onPress={() => handleStartService('video')}
              disabled={!(psychic.offers_video ?? psychic.offers_video_call ?? true)}
            >
              <LinearGradient
                colors={['#8B5CF6', '#6D28D9']}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6 }}
              >
                <Ionicons name="videocam" size={18} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>
                  Video ${psychic.video_call_rate || psychic.video_rate || '7.99'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.chatButton, styles.chatButtonDisabled, { flex: 1 }]}
            disabled
          >
            <LinearGradient
              colors={[COLORS.textMuted, COLORS.textMuted]}
              style={styles.chatButtonGradient}
            >
              <Ionicons name="moon" size={20} color="#FFF" />
              <Text style={styles.chatButtonText}>Advisor is Offline</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* Session Modal */}
      <StartSessionModal
        visible={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        onStart={handleSessionStart}
        psychicName={psychic?.name || ''}
        chatRate={psychic?.chat_rate || 3.99}
        phoneRate={psychic?.phone_rate || 5.99}
        videoRate={psychic?.video_call_rate || psychic?.video_rate || 7.99}
        balance={balance}
        serviceType={selectedService}
      />
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
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  profileImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 4,
    borderColor: COLORS.primary,
  },
  statusBadge: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  section: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  liveServicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  serviceCard: {
    width: '48%',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  serviceCardDisabled: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
  },
  serviceIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  serviceTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  serviceTitleDisabled: {
    color: '#9CA3AF',
  },
  servicePrice: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  servicePriceDisabled: {
    color: '#9CA3AF',
  },
  serviceUnavailable: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  chatServiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chatServiceInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  chatServiceTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  chatServicePrice: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  recordedVideoOptions: {
    gap: SPACING.sm,
  },
  videoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  videoOptionUrgent: {
    borderColor: COLORS.error + '40',
    backgroundColor: '#FEF2F2',
  },
  videoOptionHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 8,
  },
  videoOptionInfo: {
    flex: 1,
  },
  videoOptionTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  videoOptionDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  videoOptionPrice: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  aboutCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  experienceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  experienceText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tag: {
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  topicTag: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary + '30',
  },
  topicTagText: {
    color: COLORS.primary,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  chatButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  chatButtonDisabled: {
    opacity: 0.6,
  },
  chatButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  chatButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Install App Banner Styles
  installAppBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  installAppGradient: {
    padding: SPACING.lg,
  },
  installAppContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  installAppIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  installAppTextContainer: {
    flex: 1,
  },
  installAppTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  installAppDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  installAppButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  appStoreButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  playStoreButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  appStoreButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  installAppFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  installAppFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  installAppFeatureText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
  },
  // Intro Video Styles
  introVideoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  introVideoContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  introVideo: {
    width: '100%',
    height: 220,
    borderRadius: 16,
  },
  introVideoHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  // Recorded Video Order Styles
  recordedVideoCard: {
    backgroundColor: '#F8F5FF',
    borderRadius: 16,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    position: 'relative',
  },
  rushCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B40',
  },
  rushBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  rushBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  recordedVideoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  recordedVideoIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  rushIcon: {
    backgroundColor: '#FEF3C7',
  },
  recordedVideoDetails: {
    flex: 1,
  },
  recordedVideoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  recordedVideoPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  rushPrice: {
    color: '#F59E0B',
  },
  recordedVideoDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  // Disabled states for recorded video cards
  recordedVideoCardDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  recordedVideoIconDisabled: {
    backgroundColor: '#E5E7EB',
  },
  recordedVideoTitleDisabled: {
    color: '#9CA3AF',
  },
  recordedVideoPriceDisabled: {
    color: '#9CA3AF',
  },
  recordedVideoDescDisabled: {
    color: '#9CA3AF',
  },
  orderButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  orderButtonTextDisabled: {
    color: '#9CA3AF',
  },
  orderRecordedVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  rushButton: {
    backgroundColor: '#F59E0B',
  },
  orderRecordedVideoText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Reviews section styles
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  reviewsSummary: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  reviewStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewStatText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  reviewCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  reviewComment: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  reviewAuthor: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  seeAllReviewsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    gap: 4,
  },
  seeAllReviewsText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
