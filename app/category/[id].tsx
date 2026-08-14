import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../src/constants/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Category definitions with topics/specialties mapping
const CATEGORY_CONFIG: { [key: string]: {
  title: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  topics: string[];
  specialties: string[];
}} = {
  love: {
    title: 'Love Readings',
    description: 'Find guidance in matters of the heart',
    icon: 'heart',
    color: '#E8A0B8',
    bgColor: '#FDEEF4',
    topics: ['Love & Relationships', 'Love', 'Relationships', 'Marriage & Family', 'Family & Friends', 'Soulmates', 'Twin Flames'],
    specialties: ['Love Specialist', 'Intuitive', 'Relationship Expert'],
  },
  psychic: {
    title: 'Psychic Readings',
    description: 'Connect with gifted advisors for spiritual insight',
    icon: 'eye',
    color: '#9B7BD4',
    bgColor: '#F0E8F8',
    topics: ['Psychic Readings', 'Life Path', 'Spiritual Guidance', 'Past Lives'],
    specialties: ['Clairvoyance', 'Mediumship', 'Intuitive', 'Psychic', 'Crystal Ball', 'Pendulum'],
  },
  tarot: {
    title: 'Tarot Readings',
    description: 'Discover what the cards reveal for you',
    icon: 'sparkles',
    color: '#7BA4D4',
    bgColor: '#E8F0F8',
    topics: ['Love & Relationships', 'Career & Finance', 'Life Path', 'Career'],
    specialties: ['Tarot Cards', 'Tarot', 'Guidance Cards', 'Oracle Cards'],
  },
  'card reading': {
    title: 'Tarot Readings',
    description: 'Discover what the cards reveal for you',
    icon: 'sparkles',
    color: '#7BA4D4',
    bgColor: '#E8F0F8',
    topics: ['Love & Relationships', 'Career & Finance', 'Life Path', 'Career'],
    specialties: ['Tarot Cards', 'Tarot', 'Guidance Cards', 'Oracle Cards'],
  },
  angel: {
    title: 'Angel Insights',
    description: 'Receive messages from angelic guidance',
    icon: 'hand-left',
    color: '#E8A0B8',
    bgColor: '#FFF0F4',
    topics: ['Psychic Readings', 'Life Path', 'Spiritual Guidance'],
    specialties: ['Angel Cards', 'Tarot', 'Spiritual Guidance', 'Angel Communication'],
  },
  dream: {
    title: 'Dream Analysis',
    description: 'Unlock the hidden meanings in your dreams',
    icon: 'cloudy-night',
    color: '#8B7BC4',
    bgColor: '#EDE8F8',
    topics: ['Dream Analysis', 'Psychic Readings', 'Life Path', 'Dream Interpretation'],
    specialties: ['Dream Analysis', 'Dream Interpretation', 'Intuitive'],
  },
  'astrology': {
    title: 'Astrology & Horoscopes',
    description: 'Explore your cosmic path and birth chart',
    icon: 'planet',
    color: '#7BCAC4',
    bgColor: '#E8F8F4',
    topics: ['Life Path', 'Career & Finance', 'Love & Relationships', 'Career'],
    specialties: ['Astrology', 'Numerology', 'Birth Chart'],
  },
  career: {
    title: 'Career & Finance',
    description: 'Get guidance on your professional journey',
    icon: 'briefcase',
    color: '#D4A87B',
    bgColor: '#FFF4E8',
    topics: ['Career & Finance', 'Money & Abundance', 'Life Path', 'Career'],
    specialties: ['Career Expert', 'Numerology', 'Business'],
  },
};

export default function CategoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [psychics, setPsychics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const category = CATEGORY_CONFIG[id || 'love'] || CATEGORY_CONFIG.love;

  const fetchPsychics = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/psychics/`);
      const data = await res.json();
      
      // Filter psychics by topics or specialties matching this category
      // Use case-insensitive partial matching for better results
      const filtered = data.filter((psychic: any) => {
        const psychicTopics = (psychic.topics || []).map((t: string) => t.toLowerCase());
        const psychicSpecialties = (psychic.specialties || []).map((s: string) => s.toLowerCase());
        
        const categoryTopics = category.topics.map(t => t.toLowerCase());
        const categorySpecialties = category.specialties.map(s => s.toLowerCase());
        
        // Check if any psychic topic matches any category topic (partial match)
        const matchesTopic = psychicTopics.some((pt: string) => 
          categoryTopics.some(ct => pt.includes(ct) || ct.includes(pt))
        );
        
        // Check if any psychic specialty matches any category specialty (partial match)
        const matchesSpecialty = psychicSpecialties.some((ps: string) => 
          categorySpecialties.some(cs => ps.includes(cs) || cs.includes(ps))
        );
        
        return matchesTopic || matchesSpecialty;
      });
      
      setPsychics(filtered);
    } catch (error) {
      console.error('Error fetching psychics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPsychics();
  }, [id]);

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

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={category.color} />
        <Text style={styles.loadingText}>Finding advisors...</Text>
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
        <Text style={styles.headerTitle}>{category.title}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={category.color}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Category Banner */}
        <View style={[styles.banner, { backgroundColor: category.bgColor }]}>
          <View style={[styles.bannerIcon, { backgroundColor: category.color + '30' }]}>
            <Ionicons name={category.icon as any} size={36} color={category.color} />
          </View>
          <Text style={[styles.bannerTitle, { color: category.color }]}>{category.title}</Text>
          <Text style={styles.bannerDesc}>{category.description}</Text>
          <Text style={styles.bannerCount}>
            {psychics.length} {psychics.length === 1 ? 'advisor' : 'advisors'} available
          </Text>
        </View>

        {/* Psychics List */}
        {psychics.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={60} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No advisors found</Text>
            <Text style={styles.emptySubtitle}>
              Check back later for advisors specializing in {category.title.toLowerCase()}
            </Text>
          </View>
        ) : (
          <View style={styles.psychicsList}>
            {psychics.map((psychic) => (
              <TouchableOpacity
                key={psychic.id}
                style={styles.psychicCard}
                onPress={() => router.push(`/psychic/${psychic.id}`)}
                activeOpacity={0.7}
              >
                {/* Profile Image */}
                <View style={styles.imageContainer}>
                  {psychic.profile_picture ? (
                    <Image 
                      source={{ uri: psychic.profile_picture }} 
                      style={styles.profileImage}
                    />
                  ) : (
                    <View style={[styles.profilePlaceholder, { backgroundColor: category.bgColor }]}>
                      <Ionicons name="person" size={30} color={category.color} />
                    </View>
                  )}
                  {/* Status Badge */}
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(psychic.online_status) }]}>
                    <Text style={styles.statusText}>{getStatusText(psychic.online_status)}</Text>
                  </View>
                </View>

                {/* Info */}
                <View style={styles.psychicInfo}>
                  <Text style={styles.psychicName}>{psychic.name}</Text>
                  
                  {/* Rating */}
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color={COLORS.gold} />
                    <Text style={styles.ratingText}>{psychic.average_rating?.toFixed(1) || '5.0'}</Text>
                    <Text style={styles.reviewsText}>({psychic.total_reviews || 0})</Text>
                  </View>

                  {/* Specialties */}
                  <View style={styles.specialtiesRow}>
                    {psychic.specialties?.slice(0, 2).map((spec: string, idx: number) => (
                      <View key={idx} style={[styles.specialtyTag, { backgroundColor: category.bgColor }]}>
                        <Text style={[styles.specialtyText, { color: category.color }]}>{spec}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Price */}
                  <Text style={styles.priceText}>
                    From ${psychic.chat_rate?.toFixed(2) || '2.99'}/min
                  </Text>
                </View>

                {/* Arrow */}
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
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
  scrollContent: {
    paddingBottom: 40,
  },
  banner: {
    margin: SPACING.md,
    borderRadius: 20,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  bannerIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  bannerDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  bannerCount: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xl,
    marginTop: SPACING.xl,
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
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: SPACING.xl,
  },
  psychicsList: {
    paddingHorizontal: SPACING.md,
  },
  psychicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  profilePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  psychicInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  psychicName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  reviewsText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  specialtiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  specialtyTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  specialtyText: {
    fontSize: 11,
    fontWeight: '500',
  },
  priceText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
