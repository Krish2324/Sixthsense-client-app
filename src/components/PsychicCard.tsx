import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.md * 3) / 2;

interface PsychicCardProps {
  psychic: {
    id: string;
    name: string;
    profile_picture: string;
    description?: string;
    chat_rate: number;
    online_status: string;
    average_rating: number;
    total_readings: number;
    total_reviews?: number;
    offers_chat: boolean;
    offers_phone?: boolean;
    offers_video: boolean;
    offers_video_call?: boolean;
    offers_recorded_readings?: boolean;
    specialties?: string[];
    free_chat_enabled?: boolean;
    // Service-specific availability (when psychic is online for specific services)
    chat_available?: boolean;
    phone_available?: boolean;
    video_available?: boolean;
  };
  variant?: 'grid' | 'list' | 'horizontal';
}

// Colors for service availability - vibrant when available, grey when not
const SERVICE_COLORS = {
  chat: { active: '#10B981', inactive: '#E5E7EB' },      // Green / Light Grey
  phone: { active: '#EC4899', inactive: '#E5E7EB' },    // Pink / Light Grey  
  video: { active: '#3B82F6', inactive: '#E5E7EB' },    // Blue / Light Grey
  recorded: { active: '#8B5CF6', inactive: '#E5E7EB' }, // Purple / Light Grey
};

export default function PsychicCard({ psychic, variant = 'grid' }: PsychicCardProps) {
  const router = useRouter();
  
  const isOnline = psychic.online_status === 'online';
  const isBusy = psychic.online_status === 'busy';
  
  // Determine if each service is currently available
  // A service is "available" if: psychic offers it AND is online for that specific service
  // Use offers_chat/offers_phone/offers_video as indicators of current availability when online
  const isChatAvailable = isOnline && (psychic.chat_available ?? psychic.offers_chat);
  const isPhoneAvailable = isOnline && (psychic.phone_available ?? psychic.offers_phone);
  const isVideoAvailable = isOnline && (psychic.video_available ?? (psychic.offers_video_call || psychic.offers_video));
  const isRecordedAvailable = psychic.offers_recorded_readings; // Recorded readings don't require online status
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return COLORS.online;
      case 'busy': return COLORS.busy;
      default: return COLORS.offline;
    }
  };
  
  // Get status badge text and color
  const getStatusBadge = () => {
    if (isBusy) return { text: 'Busy', color: COLORS.busy };
    if (isOnline) return { text: 'Online', color: COLORS.online };
    return { text: 'Offline', color: COLORS.offline };
  };
  
  const statusBadge = getStatusBadge();

  const handlePress = () => {
    router.push(`/psychic/${psychic.id}`);
  };

  // Render service icons with availability-based styling
  const renderServiceIcons = (iconSize: number = 14) => {
    const services = [
      { 
        key: 'chat', 
        icon: 'chatbubble' as const, 
        offered: psychic.offers_chat, 
        available: isChatAvailable,
        colors: SERVICE_COLORS.chat 
      },
      { 
        key: 'phone', 
        icon: 'call' as const, 
        offered: psychic.offers_phone, 
        available: isPhoneAvailable,
        colors: SERVICE_COLORS.phone 
      },
      { 
        key: 'video', 
        icon: 'videocam' as const, 
        offered: psychic.offers_video_call || psychic.offers_video, 
        available: isVideoAvailable,
        colors: SERVICE_COLORS.video 
      },
      { 
        key: 'recorded', 
        icon: 'mic' as const, 
        offered: psychic.offers_recorded_readings, 
        available: isRecordedAvailable,
        colors: SERVICE_COLORS.recorded 
      },
    ];
    
    return services
      .filter(service => service.offered)
      .map(service => (
        <View 
          key={service.key} 
          style={[
            styles.serviceIcon,
            { 
              backgroundColor: service.available 
                ? service.colors.active + '20'  // Light tinted background when available
                : '#F3F4F6',  // Very light grey when unavailable
              borderWidth: service.available ? 1 : 0,
              borderColor: service.available ? service.colors.active + '40' : 'transparent',
            }
          ]}
        >
          <Ionicons 
            name={service.icon} 
            size={iconSize} 
            color={service.available ? service.colors.active : service.colors.inactive} 
          />
        </View>
      ));
  };

  if (variant === 'list') {
    return (
      <TouchableOpacity style={styles.listCard} onPress={handlePress} activeOpacity={0.8}>
        <Image source={{ uri: psychic.profile_picture }} style={styles.listImage} />
        {/* Status Badge */}
        <View style={[styles.listStatusBadge, { backgroundColor: statusBadge.color }]}>
          <Text style={styles.listStatusText}>{statusBadge.text}</Text>
        </View>
        
        <View style={styles.listContent}>
          <View style={styles.listHeader}>
            <Text style={styles.listName} numberOfLines={1}>{psychic.name}</Text>
            <View style={styles.ratingBadgeSmall}>
              <Ionicons name="star" size={12} color={COLORS.star} />
              <Text style={styles.ratingTextSmall}>{psychic.average_rating.toFixed(1)}</Text>
            </View>
          </View>
          
          <Text style={styles.listSpecialty} numberOfLines={1}>
            {psychic.specialties?.[0] || 'Psychic Reader'}
          </Text>
          
          {/* Service Icons with availability */}
          <View style={styles.serviceIcons}>
            {renderServiceIcons(14)}
          </View>
          
          <View style={styles.listFooter}>
            <Text style={styles.priceText}>From <Text style={styles.priceValue}>${psychic.chat_rate.toFixed(2)}</Text>/min</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Grid variant (default) - Large photo cards
  return (
    <TouchableOpacity style={styles.gridCard} onPress={handlePress} activeOpacity={0.85}>
      {/* Image with Rating Badge and Status Badge */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: psychic.profile_picture }} style={styles.gridImage} />
        
        {/* Status Badge - Top Left */}
        <View style={[styles.statusBadge, { backgroundColor: statusBadge.color }]}>
          <Text style={styles.statusBadgeText}>{statusBadge.text}</Text>
        </View>
        
        {/* Rating Badge - Top Right */}
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={12} color={COLORS.star} />
          <Text style={styles.ratingText}>{psychic.average_rating.toFixed(1)}</Text>
        </View>
      </View>
      
      {/* Card Content */}
      <View style={styles.cardContent}>
        <Text style={styles.name} numberOfLines={1}>{psychic.name}</Text>
        <Text style={styles.specialty} numberOfLines={1}>
          {psychic.specialties?.[0] || 'Psychic Reader'}
        </Text>
        
        {/* Service Icons with availability-based coloring */}
        <View style={styles.serviceIcons}>
          {renderServiceIcons(14)}
        </View>
        
        <Text style={styles.price}>From <Text style={styles.priceHighlight}>${psychic.chat_rate.toFixed(2)}</Text>/min</Text>
        <Text style={styles.readings}>{psychic.total_readings.toLocaleString()} readings</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Grid Card Styles
  gridCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.medium,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: CARD_WIDTH * 1.1,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  // Status Badge (Online/Busy/Offline) - Top Left
  statusBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  ratingBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  cardContent: {
    padding: SPACING.md,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  specialty: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: SPACING.sm,
  },
  serviceIcons: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  serviceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  price: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  priceHighlight: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  readings: {
    color: COLORS.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  
  // List Card Styles
  listCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    ...SHADOWS.medium,
  },
  listImage: {
    width: 100,
    height: 120,
    resizeMode: 'cover',
  },
  listStatusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  listStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  listContent: {
    flex: 1,
    padding: SPACING.md,
    justifyContent: 'space-between',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  ratingBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  ratingTextSmall: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  listSpecialty: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  listFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  priceValue: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
});
