import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../src/constants/theme';
import { psychicEvents, doesPsychicMatchEvent } from '../../src/services/psychicEvents';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.29.73:8000';
const { width } = Dimensions.get('window');

const CARD_WIDTH = (width - SPACING.md * 3) / 2;

// Sort/Filter options
const SORT_OPTIONS = [
  { id: 'busy', label: 'Busy', icon: 'time', type: 'filter' },
  { id: 'price_high', label: 'High to Low Price', icon: 'arrow-down', type: 'sort' },
  { id: 'price_low', label: 'Low to High Price', icon: 'arrow-up', type: 'sort' },
  { id: 'chat', label: 'Chat', icon: 'chatbubble', type: 'filter' },
  { id: 'call', label: 'Call', icon: 'call', type: 'filter' },
  { id: 'video', label: 'Video Call', icon: 'videocam', type: 'filter' },
  { id: 'emergency', label: 'For Emergency', icon: 'flash', type: 'filter' },
  { id: 'standard', label: 'Standard Readings', icon: 'book', type: 'filter' },
];

// Filter configurations
const FILTER_CONFIG: { [key: string]: {
  title: string;
  description: string;
  icon: string;
  color: string;
  filterFn: (psychics: any[]) => any[];
}} = {
  all: {
    title: 'All Advisors',
    description: 'Browse all our spiritual advisors',
    icon: 'people',
    color: COLORS.primary,
    filterFn: (psychics) => psychics,
  },
  new: {
    title: 'New Advisors',
    description: 'Fresh talent with great energy',
    icon: 'sparkles',
    color: COLORS.secondary,
    filterFn: (psychics) => psychics.filter(p => p.is_new === true),
  },
  live: {
    title: 'Live Chat Readings',
    description: 'Advisors available for live chat',
    icon: 'chatbubbles',
    color: COLORS.chatGreen,
    filterFn: (psychics) => psychics.filter(p => p.offers_chat === true),
  },
};

// Sort psychics based on selected option
const sortPsychics = (psychics: any[], sortBy: string) => {
  const sorted = [...psychics];
  
  switch (sortBy) {
    case 'busy':
      // Busy psychics first
      return sorted.filter(p => p.online_status === 'busy');
    
    case 'price_low':
      return sorted.sort((a, b) => (a.chat_rate || 0) - (b.chat_rate || 0));
    
    case 'price_high':
      return sorted.sort((a, b) => (b.chat_rate || 0) - (a.chat_rate || 0));
    
    case 'chat':
      // Filter psychics who offer chat AND are online/available
      return sorted.filter(p => p.offers_chat && p.online_status === 'online');
    
    case 'call':
      // Filter psychics who offer phone calls AND are online/available
      return sorted.filter(p => p.offers_phone && p.online_status === 'online');
    
    case 'video':
      // Filter psychics who offer video calls AND are online/available
      return sorted.filter(p => p.offers_video && p.online_status === 'online');
    
    case 'emergency':
      // Filter psychics who offer emergency readings AND are online/available
      return sorted.filter(p => p.offers_emergency_readings && (p.online_status === 'online' || p.online_status === 'busy'));
    
    case 'standard':
      // Filter psychics who offer standard recorded readings AND are online/available
      return sorted.filter(p => p.offers_recorded_readings && (p.online_status === 'online' || p.online_status === 'busy'));
    
    default:
      return sorted;
  }
};

export default function AdvisorsListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { filter } = useLocalSearchParams<{ filter: string }>();

  const [psychics, setPsychics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('');
  const [showSortModal, setShowSortModal] = useState(false);
  const [psychicOfWeek, setPsychicOfWeek] = useState<any>(null);

  const config = FILTER_CONFIG[filter || 'all'] || FILTER_CONFIG.all;

  const fetchPsychics = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/psychics/`);
      const data = await res.json();
      
      // Apply filter
      const filtered = config.filterFn(data);
      setPsychics(filtered);
      
      // Fetch psychic of the week
      const weekRes = await fetch(`${BACKEND_URL}/api/psychics/psychic-of-the-week`);
      const weekData = await weekRes.json();
      if (weekData.show_section) {
        setPsychicOfWeek(weekData);
      }
    } catch (error) {
      console.error('Error fetching psychics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPsychics();
  }, [filter]);

  useEffect(() => {
    const unsubscribe = psychicEvents.subscribe((event) => {
      setPsychics((prev) =>
        prev.map((p) => {
          if (doesPsychicMatchEvent(p, event)) {
            return {
              ...p,
              online_status: event.online_status,
              is_online: event.online_status === 'online',
              offers_chat: event.offers_chat !== undefined ? event.offers_chat : event.online_status === 'online',
            };
          }
          return p;
        })
      );
      setPsychicOfWeek((prev: any) => {
        if (prev?.psychic && doesPsychicMatchEvent(prev.psychic, event)) {
          return {
            ...prev,
            psychic: {
              ...prev.psychic,
              online_status: event.online_status,
              is_online: event.online_status === 'online',
              offers_chat: event.offers_chat !== undefined ? event.offers_chat : event.online_status === 'online',
            },
          };
        }
        return prev;
      });
    });

    return unsubscribe;
  }, []);


  // Get sorted psychics
  const sortedPsychics = sortPsychics(psychics, sortBy);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPsychics();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return COLORS.online;
      case 'busy': return COLORS.busy;
      default: return COLORS.textMuted;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'busy': return 'Busy';
      default: return 'Offline';
    }
  };

  const renderPsychicCard = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      style={[
        styles.psychicCard,
        { marginLeft: index % 2 === 0 ? 0 : SPACING.md }
      ]}
      onPress={() => router.push(`/psychic/${item.id}`)}
      activeOpacity={0.7}
    >
      {/* Profile Image */}
      <View style={styles.imageContainer}>
        {item.profile_picture ? (
          <Image 
            source={{ uri: item.profile_picture }} 
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.profilePlaceholder}>
            <Ionicons name="person" size={36} color={COLORS.primary} />
          </View>
        )}
        
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.online_status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.online_status)}</Text>
        </View>

        {/* New Badge */}
        {item.is_new && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.psychicName} numberOfLines={1}>{item.name}</Text>
        
        {/* Rating */}
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color={COLORS.gold} />
          <Text style={styles.ratingText}>{item.average_rating?.toFixed(1) || '5.0'}</Text>
          <Text style={styles.reviewsText}>({item.total_reviews || 0})</Text>
        </View>

        {/* Specialty */}
        {item.specialties?.[0] && (
          <Text style={styles.specialtyText} numberOfLines={1}>
            {item.specialties[0]}
          </Text>
        )}

        {/* Price */}
        <Text style={styles.priceText}>
          ${item.chat_rate?.toFixed(2) || '2.99'}/min
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={config.color} />
        <Text style={styles.loadingText}>Loading advisors...</Text>
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
        <Text style={styles.headerTitle}>{config.title}</Text>
        <TouchableOpacity 
          style={styles.filterButton} 
          onPress={() => setShowSortModal(true)}
        >
          <Ionicons name="options" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Psychics Grid */}
      {sortedPsychics.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={60} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No advisors found</Text>
          <Text style={styles.emptySubtitle}>Check back later</Text>
        </View>
      ) : (
        <FlatList
          data={sortedPsychics}
          renderItem={renderPsychicCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={config.color}
            />
          }
        />
      )}

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSortModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + SPACING.md }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort & Filter</Text>
              <TouchableOpacity 
                style={styles.modalClose}
                onPress={() => setShowSortModal(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.sortOptions}>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.sortOption,
                    sortBy === option.id && styles.sortOptionActive
                  ]}
                  onPress={() => {
                    setSortBy(option.id);
                    setShowSortModal(false);
                  }}
                >
                  <View style={[
                    styles.sortOptionIcon,
                    sortBy === option.id && styles.sortOptionIconActive
                  ]}>
                    <Ionicons 
                      name={option.icon as any} 
                      size={20} 
                      color={sortBy === option.id ? '#FFF' : COLORS.textSecondary} 
                    />
                  </View>
                  <Text style={[
                    styles.sortOptionText,
                    sortBy === option.id && styles.sortOptionTextActive
                  ]}>
                    {option.label}
                  </Text>
                  {sortBy === option.id && (
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 14,
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
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  psychicCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: CARD_WIDTH * 0.9,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  cardInfo: {
    padding: SPACING.sm,
  },
  psychicName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  reviewsText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  specialtyText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  priceText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    gap: 6,
    backgroundColor: COLORS.backgroundElevated,
  },
  sortIndicatorText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortOptions: {
    gap: SPACING.sm,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  sortOptionActive: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary,
  },
  sortOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortOptionIconActive: {
    backgroundColor: COLORS.primary,
  },
  sortOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  sortOptionTextActive: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Psychic of the Week styles
  weeklyHighlight: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.gold,
    overflow: 'hidden',
  },
  weeklyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.gold,
    paddingVertical: SPACING.sm,
  },
  weeklyBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weeklyContent: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  weeklyImageContainer: {
    position: 'relative',
  },
  weeklyImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: COLORS.gold,
  },
  weeklyImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.pastelPurple,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.gold,
  },
  weeklyOnlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.online,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  weeklyInfo: {
    flex: 1,
  },
  weeklyName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  achievementsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  achievementBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  achievementText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primary,
  },
  weeklyPraise: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  weeklyStats: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  weeklyStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weeklyStatText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
