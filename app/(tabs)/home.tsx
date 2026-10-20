import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import CategoryIcons from '../../src/components/CategoryIcons';
import FilterChips from '../../src/components/FilterChips';
import Section from '../../src/components/Section';
import HorizontalPsychicCard from '../../src/components/HorizontalPsychicCard';
import { HomeSEO } from '../../src/components/SEO';
import NotificationBanner from '../../src/components/NotificationBanner';
import { psychicEvents, doesPsychicMatchEvent } from '../../src/services/psychicEvents';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.29.73:8000';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [psychics, setPsychics] = useState<any[]>([]);
  const [newPsychics, setNewPsychics] = useState<any[]>([]);
  const [highlyRated, setHighlyRated] = useState<any[]>([]);
  const [recommended, setRecommended] = useState<any[]>([]);
  const [topRated, setTopRated] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [suggested, setSuggested] = useState<any[]>([]);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [liveChatPsychics, setLiveChatPsychics] = useState<any[]>([]);
  const [psychicOfWeek, setPsychicOfWeek] = useState<any>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [activeSale, setActiveSale] = useState<any>(null);
  const [recentlyVisited, setRecentlyVisited] = useState<any[]>([]);

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Real-time WebSocket listener for advisor online/offline changes
  useEffect(() => {
    const unsubscribe = psychicEvents.subscribe((event) => {
      const updateList = (list: any[]) =>
        list.map((p) => {
          if (doesPsychicMatchEvent(p, event)) {
            return {
              ...p,
              online_status: event.online_status,
              is_online: event.online_status === 'online',
              offers_chat: event.offers_chat !== undefined ? event.offers_chat : event.online_status === 'online',
              offers_phone: event.offers_phone !== undefined ? event.offers_phone : event.online_status === 'online',
              offers_video: event.offers_video !== undefined ? event.offers_video : event.online_status === 'online',
              offers_video_call: event.offers_video_call !== undefined ? event.offers_video_call : event.online_status === 'online',
            };
          }
          return p;
        });

      setPsychics((prev) => {
        const updated = updateList(prev);
        setLiveChatPsychics(
          updated.filter((p: any) => p.offers_chat && (p.online_status === 'online' || p.online_status === 'busy'))
        );
        return updated;
      });
      setNewPsychics(updateList);
      setHighlyRated(updateList);
      setRecommended(updateList);
      setTopRated(updateList);
      setTrending(updateList);
      setSuggested(updateList);
      setRecentlyVisited(updateList);
      setPsychicOfWeek((prev: any) => {
        if (prev?.psychic && doesPsychicMatchEvent(prev.psychic, event)) {
          return {
            ...prev,
            psychic: {
              ...prev.psychic,
              online_status: event.online_status,
              is_online: event.online_status === 'online',
              offers_chat: event.offers_chat !== undefined ? event.offers_chat : event.online_status === 'online',
              offers_phone: event.offers_phone !== undefined ? event.offers_phone : event.online_status === 'online',
              offers_video: event.offers_video !== undefined ? event.offers_video : event.online_status === 'online',
              offers_video_call: event.offers_video_call !== undefined ? event.offers_video_call : event.online_status === 'online',
            },
          };
        }
        return prev;
      });
    });

    return unsubscribe;
  }, []);

  const fetchActiveSale = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/sales/active`);
      if (response.ok) {
        const data = await response.json();
        setActiveSale(data);
      }
    } catch (error) {
      // Quiet fallback
    }
  }, []);

  const fetchUnreadMessages = useCallback(async () => {
    try {
      const userId = user?.id;
      if (!userId) return;
      
      const response = await fetch(`${BACKEND_URL}/api/messages/unread-count/${userId}?user_type=client`);
      if (response.ok) {
        const data = await response.json();
        setUnreadMessagesCount(data.count || 0);
      }
    } catch (error) {
      // Quiet fallback
    }
  }, [user]);

  const fetchPsychics = useCallback(async () => {
    try {
      // Fetch all psychics
      const allRes = await fetch(`${BACKEND_URL}/api/psychics/`);
      const allData = await allRes.json();
      setPsychics(allData);

      // Fetch categories
      const newRes = await fetch(`${BACKEND_URL}/api/psychics/?category=new`);
      const newData = await newRes.json();
      setNewPsychics(newData);

      const ratedRes = await fetch(`${BACKEND_URL}/api/psychics/?category=highly_rated`);
      const ratedData = await ratedRes.json();
      setHighlyRated(ratedData);

      const recRes = await fetch(`${BACKEND_URL}/api/psychics/?category=recommended`);
      const recData = await recRes.json();
      setRecommended(recData);

      const topRes = await fetch(`${BACKEND_URL}/api/psychics/?category=top_rated`);
      const topData = await topRes.json();
      setTopRated(topData);

      // Fetch trending psychics
      const trendingRes = await fetch(`${BACKEND_URL}/api/psychics/?category=trending`);
      const trendingData = await trendingRes.json();
      setTrending(trendingData);

      // Fetch suggested psychics based on user's interests
      const userId = user?.id || 'guest';
      const suggestedRes = await fetch(`${BACKEND_URL}/api/psychics/suggested/${userId}`);
      const suggestedData = await suggestedRes.json();
      setSuggested(suggestedData.psychics || []);
      setUserInterests(suggestedData.user_interests || []);

      // Fetch psychic of the week
      const weekRes = await fetch(`${BACKEND_URL}/api/psychics/psychic-of-the-week`);
      const weekData = await weekRes.json();
      if (weekData.show_section) {
        setPsychicOfWeek(weekData);
      }

      // Filter for live chat available psychics
      const liveChatAvailable = allData.filter(
        (p: any) => p.offers_chat && (p.online_status === 'online' || p.online_status === 'busy')
      );
      setLiveChatPsychics(liveChatAvailable);

      // Fetch recently visited psychics
      if (user?.id) {
        try {
          const recentRes = await fetch(`${BACKEND_URL}/api/users/${user.id}/recently-visited`);
          if (recentRes.ok) {
            const recentData = await recentRes.json();
            setRecentlyVisited(recentData.psychics || []);
          }
        } catch (e) {
          console.log('No recently visited data');
        }
      }
    } catch (error) {
      // Quiet network fallback
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPsychics();
    fetchUnreadMessages();
    fetchActiveSale();
  }, [fetchPsychics, fetchUnreadMessages, fetchActiveSale]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPsychics();
    await fetchUnreadMessages();
    await fetchActiveSale();
    setRefreshing(false);
  };


  const handleFilterPress = (filter: string) => {
    router.push({
      pathname: '/advisors/[filter]',
      params: { filter }
    });
  };

  const getFilteredPsychics = () => {
    switch (selectedFilter) {
      case 'new':
        return newPsychics.filter(p => p.online_status === 'online' || p.online_status === 'busy');
      case 'live_chat':
        return liveChatPsychics;
      case 'all':
      default:
        return psychics;
    }
  };

  const filterOnlineOrBusy = (list: any[]) => {
    return list.filter(p => p.online_status === 'online' || p.online_status === 'busy');
  };

  const getFilterTitle = () => {
    switch (selectedFilter) {
      case 'new': return 'New Advisors';
      case 'live_chat': return 'Live Chat Readings';
      case 'all': return 'All Advisors';
      default: return 'Advisors';
    }
  };

  const filteredPsychics = getFilteredPsychics();

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Finding advisors...</Text>
      </View>
    );
  }

  const showFilteredResults = selectedFilter !== 'all';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* SEO Meta Tags */}
      <HomeSEO />
      
      {/* Fixed Header */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top + SPACING.sm, backgroundColor: colors.background }]}>
        <View style={styles.logoContainer}>
          <View style={[styles.logoIconWrapper, { backgroundColor: colors.primary }]}>
            <Ionicons name="sparkles" size={18} color="#FFF" />
          </View>
          <Text style={[styles.logoText, { color: colors.textPrimary }]}>Sixth Sense Psychics</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.headerButton, { backgroundColor: colors.backgroundCard }]}
            onPress={() => router.push('/search-advisors')}
          >
            <Ionicons name="search" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Notification Banner at top of home */}
        <NotificationBanner />

        {/* Active Sale Banner */}
        {activeSale && (
          <TouchableOpacity 
            style={[styles.saleBanner, { backgroundColor: colors.gold }]}
            activeOpacity={0.9}
          >
            <View style={styles.saleBannerContent}>
              <View style={styles.saleBannerLeft}>
                <View style={styles.saleLiveTag}>
                  <Text style={styles.saleLiveText}>LIVE</Text>
                </View>
                <Text style={styles.saleBannerTitle}>{activeSale.name}</Text>
                <Text style={styles.saleBannerDesc}>{activeSale.description}</Text>
              </View>
              <View style={styles.saleBannerRight}>
                <Text style={styles.saleDiscount}>{activeSale.discount_percentage}%</Text>
                <Text style={styles.saleDiscountLabel}>OFF</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Category Icons */}
        <CategoryIcons onSelectCategory={(category) => {
          router.push({
            pathname: '/category/[id]',
            params: { id: category }
          });
        }} />

        {/* Filter Chips */}
        <FilterChips selectedFilter={selectedFilter} onSelectFilter={handleFilterPress} />

        {showFilteredResults ? (
          /* Filtered Results Grid */
          <View style={styles.filteredSection}>
            <View style={styles.filteredHeader}>
              <Text style={[styles.filteredTitle, { color: colors.textPrimary }]}>{getFilterTitle()}</Text>
              <Text style={[styles.filteredCount, { color: colors.textSecondary }]}>
                {filteredPsychics.length} {filteredPsychics.length === 1 ? 'advisor' : 'advisors'}
              </Text>
            </View>
            
            {filteredPsychics.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No advisors found</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Try a different filter</Text>
              </View>
            ) : (
              <View style={styles.filteredGrid}>
                {filteredPsychics.map((psychic) => (
                  <TouchableOpacity
                    key={psychic.id}
                    style={styles.filteredCard}
                    onPress={() => router.push(`/psychic/${psychic.id}`)}
                    activeOpacity={0.7}
                  >
                    <HorizontalPsychicCard psychic={psychic} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          /* Default Home View with Horizontal Sections */
          <>
            {/* Suggested For You Section */}
            {filterOnlineOrBusy(suggested).length > 0 && (
              <Section
                title="Suggested For You"
                icon="sparkles"
                iconColor={colors.secondary}
                psychics={filterOnlineOrBusy(suggested)}
                onSeeAll={() => router.push('/advisors/all')}
              />
            )}

            {/* Top Rated Section */}
            {filterOnlineOrBusy(topRated).length > 0 && (
              <Section
                title="Top Rated"
                icon="star"
                iconColor={colors.gold}
                psychics={filterOnlineOrBusy(topRated)}
                onSeeAll={() => router.push('/advisors/top_rated')}
              />
            )}

            {/* Psychic of the Week */}
            {psychicOfWeek && psychicOfWeek.psychic && (
              <TouchableOpacity 
                style={[styles.weeklyCard, { backgroundColor: colors.backgroundCard, borderColor: colors.gold }]}
                onPress={() => router.push(`/psychic/${psychicOfWeek.psychic.id}`)}
                activeOpacity={0.85}
              >
                <View style={[styles.weeklyHeader, { backgroundColor: colors.gold + '15', borderBottomColor: colors.gold + '30' }]}>
                  <Ionicons name="trophy" size={16} color={colors.gold} />
                  <Text style={[styles.weeklyTitle, { color: colors.gold }]}>Psychic of the Week</Text>
                </View>
                <View style={styles.weeklyContent}>
                  {psychicOfWeek.psychic.profile_picture ? (
                    <Image 
                      source={{ uri: psychicOfWeek.psychic.profile_picture }} 
                      style={[styles.weeklyImage, { borderColor: colors.gold }]} 
                    />
                  ) : (
                    <View style={[styles.weeklyImagePlaceholder, { backgroundColor: colors.backgroundElevated, borderColor: colors.gold }]}>
                      <Ionicons name="person" size={32} color={colors.primary} />
                    </View>
                  )}
                  <View style={styles.weeklyInfo}>
                    <Text style={[styles.weeklyName, { color: colors.textPrimary }]}>{psychicOfWeek.psychic.name}</Text>
                    <Text style={[styles.weeklyExperience, { color: colors.primary }]}>
                      {psychicOfWeek.psychic.years_experience}+ years experience
                    </Text>
                    <Text style={[styles.weeklyPraise, { color: colors.textSecondary }]} numberOfLines={2}>
                      {psychicOfWeek.selection_reason}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={colors.gold} />
                </View>
              </TouchableOpacity>
            )}

            {/* Trending Section */}
            {filterOnlineOrBusy(trending).length > 0 && (
              <Section
                title="Trending Now"
                icon="flame"
                iconColor={colors.error}
                psychics={filterOnlineOrBusy(trending)}
                onSeeAll={() => router.push('/advisors/trending')}
              />
            )}

            {/* New Advisors Section */}
            {filterOnlineOrBusy(newPsychics).length > 0 && (
              <Section
                title="New Advisors"
                icon="sparkles"
                iconColor={colors.primary}
                psychics={filterOnlineOrBusy(newPsychics)}
                onSeeAll={() => router.push('/advisors/new')}
              />
            )}

            {/* Highly Rated Section */}
            {filterOnlineOrBusy(highlyRated).length > 0 && (
              <Section
                title="Highly Rated"
                icon="heart"
                iconColor={colors.secondary}
                psychics={filterOnlineOrBusy(highlyRated)}
                onSeeAll={() => router.push('/advisors/highly_rated')}
              />
            )}

            {/* Recently Visited Section */}
            {recentlyVisited.length > 0 && (
              <Section
                title="Recently Visited"
                icon="time"
                iconColor={colors.info || '#3498db'}
                psychics={recentlyVisited}
                onSeeAll={() => {}}
              />
            )}

            {/* Not Sure? All Advisors Section */}
            <View style={styles.notSureSection}>
              <View style={[styles.notSureCard, { backgroundColor: colors.backgroundCard }]}>
                <View style={styles.notSureContent}>
                  <Ionicons name="help-circle" size={32} color={colors.primary} />
                  <View style={styles.notSureText}>
                    <Text style={[styles.notSureTitle, { color: colors.textPrimary }]}>Not sure?</Text>
                    <Text style={[styles.notSureSubtitle, { color: colors.textSecondary }]}>
                      Browse all our gifted advisors
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.allAdvisorsButton, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/advisors/all')}
                >
                  <Text style={styles.allAdvisorsText}>All Advisors</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  fixedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  messageBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  messageBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  filteredSection: {
    paddingHorizontal: SPACING.md,
  },
  filteredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  filteredTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  filteredCount: {
    fontSize: 14,
  },
  filteredGrid: {
    gap: SPACING.sm,
  },
  filteredCard: {
    marginBottom: SPACING.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  weeklyCard: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.md,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  weeklyTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weeklyContent: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.md,
    alignItems: 'center',
  },
  weeklyImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
  },
  weeklyImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  weeklyInfo: {
    flex: 1,
  },
  weeklyName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  weeklyExperience: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  weeklyPraise: {
    fontSize: 13,
    lineHeight: 18,
  },
  saleBanner: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    borderRadius: 16,
    padding: SPACING.md,
  },
  saleBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saleBannerLeft: {
    flex: 1,
  },
  saleLiveTag: {
    backgroundColor: '#E53935',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  saleLiveText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  saleBannerTitle: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  saleBannerDesc: {
    color: '#333',
    fontSize: 12,
  },
  saleBannerRight: {
    alignItems: 'center',
    paddingLeft: SPACING.md,
  },
  saleDiscount: {
    color: '#000',
    fontSize: 36,
    fontWeight: '800',
  },
  saleDiscountLabel: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  appLogoImage: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  logoIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  appLogoIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  notSureSection: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  notSureCard: {
    borderRadius: 16,
    padding: SPACING.lg,
  },
  notSureContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  notSureText: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  notSureTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  notSureSubtitle: {
    fontSize: 14,
  },
  allAdvisorsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  allAdvisorsText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});
