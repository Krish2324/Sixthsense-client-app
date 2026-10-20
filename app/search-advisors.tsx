import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING, SHADOWS, COLORS } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import Slider from '@react-native-community/slider';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Price limits
const MIN_PRICE = 1.99;
const MAX_PRICE = 9.99;

interface Psychic {
  id: string;
  name: string;
  specialties: string[];
  rating: number;
  total_readings: number;
  price_per_minute?: number;
  chat_rate?: number;
  phone_rate?: number;
  video_rate?: number;
  profile_image?: string;
  profile_picture?: string;
  online_status: string;
  years_experience: number;
}

export default function SearchAdvisorsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
  const [psychics, setPsychics] = useState<Psychic[]>([]);
  const [filteredPsychics, setFilteredPsychics] = useState<Psychic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all psychics
  const fetchPsychics = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/psychics/`);
      if (response.ok) {
        const data = await response.json();
        setPsychics(data);
        setFilteredPsychics(data);
      }
    } catch (error) {
      console.error('Error fetching psychics:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPsychics();
  }, [fetchPsychics]);

  // Filter psychics based on search and price
  useEffect(() => {
    let results = [...psychics];

    // Filter by search query (name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      results = results.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.specialties?.some(s => s.toLowerCase().includes(query))
      );
    }

    // Filter by max price - check all rate fields
    if (maxPrice < MAX_PRICE) {
      results = results.filter(p => {
        // Get the lowest rate for this psychic (could be chat_rate, phone_rate, price_per_minute, etc.)
        const rate = p.chat_rate || p.price_per_minute || p.phone_rate || 2.99;
        return rate <= maxPrice;
      });
    }

    // Sort: Online first, then Busy, then Offline
    results.sort((a, b) => {
      const statusOrder = { online: 0, busy: 1, offline: 2 };
      const aOrder = statusOrder[a.online_status as keyof typeof statusOrder] ?? 2;
      const bOrder = statusOrder[b.online_status as keyof typeof statusOrder] ?? 2;
      return aOrder - bOrder;
    });

    setFilteredPsychics(results);
  }, [searchQuery, maxPrice, psychics]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return COLORS.online;
      case 'busy': return COLORS.busy;
      default: return COLORS.offline;
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setMaxPrice(MAX_PRICE);
  };

  const hasActiveFilters = searchQuery || maxPrice < MAX_PRICE;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading advisors...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Your Advisor</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or specialty..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Price Range Filter */}
      <View style={styles.priceFilterContainer}>
        <View style={styles.priceFilterHeader}>
          <Text style={styles.filterLabel}>Price Range</Text>
          <Text style={styles.priceValue}>
            Up to ${maxPrice.toFixed(2)}/min
          </Text>
        </View>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderMinMax}>${MIN_PRICE.toFixed(2)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={MIN_PRICE}
            maximumValue={MAX_PRICE}
            value={maxPrice}
            onValueChange={setMaxPrice}
            minimumTrackTintColor={COLORS.primary}
            maximumTrackTintColor={COLORS.border}
            thumbTintColor={COLORS.primary}
            step={0.50}
          />
          <Text style={styles.sliderMinMax}>${MAX_PRICE.toFixed(2)}</Text>
        </View>
      </View>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <TouchableOpacity style={styles.clearFilters} onPress={clearFilters}>
          <Ionicons name="refresh" size={16} color={COLORS.primary} />
          <Text style={styles.clearFiltersText}>Clear all filters</Text>
        </TouchableOpacity>
      )}

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredPsychics.length} {filteredPsychics.length === 1 ? 'advisor' : 'advisors'} found
        </Text>
      </View>

      {/* Results List */}
      <ScrollView 
        style={styles.resultsList}
        contentContainerStyle={styles.resultsContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredPsychics.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={60} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No advisors found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your filters or search term
            </Text>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {filteredPsychics.map((psychic) => (
              <TouchableOpacity
                key={psychic.id}
                style={styles.advisorCard}
                onPress={() => router.push(`/psychic/${psychic.id}`)}
                activeOpacity={0.7}
              >
                {/* Profile Image */}
                <View style={styles.imageContainer}>
                  {(() => {
                    const rawUri = psychic.profile_picture || psychic.profile_image;
                    const uri = (rawUri && rawUri.startsWith('http')) 
                      ? rawUri 
                      : (rawUri && !rawUri.startsWith('file://')) 
                        ? rawUri 
                        : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400';
                    return (
                      <Image 
                        source={{ uri }} 
                        style={styles.profileImage}
                      />
                    );
                  })()}
                  {/* Status Badge */}
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(psychic.online_status) }]} />
                </View>

                {/* Info */}
                <View style={styles.cardInfo}>
                  <Text style={styles.advisorName} numberOfLines={1}>{psychic.name}</Text>
                  
                  {/* Specialties */}
                  <Text style={styles.specialties} numberOfLines={1}>
                    {psychic.specialties?.slice(0, 2).join(', ') || 'General Readings'}
                  </Text>

                  {/* Rating */}
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={12} color={COLORS.gold} />
                    <Text style={styles.ratingText}>{psychic.rating?.toFixed(1) || '5.0'}</Text>
                    <Text style={styles.reviewCount}>({psychic.total_readings || 0})</Text>
                  </View>

                  {/* Price */}
                  <View style={styles.priceRow}>
                    <Text style={styles.priceText}>${psychic.price_per_minute?.toFixed(2) || '2.99'}</Text>
                    <Text style={styles.perMinute}>/min</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
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
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    height: 48,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  budgetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  budgetSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    gap: SPACING.xs,
  },
  budgetText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  budgetDropdown: {
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    ...SHADOWS.medium,
  },
  budgetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  budgetOptionActive: {
    backgroundColor: COLORS.primary + '10',
  },
  budgetOptionText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  budgetOptionTextActive: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Price Range Slider styles
  priceFilterContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  priceFilterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderMinMax: {
    fontSize: 12,
    color: COLORS.textMuted,
    width: 45,
  },
  categoryWrapper: {
    height: 44,
    marginBottom: SPACING.xs,
  },
  categoryContainer: {
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundElevated,
    marginRight: SPACING.sm,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  clearFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.xs,
  },
  clearFiltersText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  resultsHeader: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  resultsCount: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  resultsList: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: SPACING.md,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  advisorCard: {
    width: '48%',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.backgroundElevated,
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.pastelPurple,
  },
  statusBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  cardInfo: {
    padding: SPACING.sm,
  },
  advisorName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  specialties: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
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
  reviewCount: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  perMinute: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.lg,
  },
  clearButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  clearButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
