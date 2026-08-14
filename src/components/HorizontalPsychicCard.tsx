import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useRouter } from 'expo-router';

const CARD_WIDTH = 170;

interface HorizontalPsychicCardProps {
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
  };
}

export default function HorizontalPsychicCard({ psychic }: HorizontalPsychicCardProps) {
  const router = useRouter();
  const { colors } = useTheme();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return colors.success;
      case 'busy': return colors.warning;
      default: return colors.textMuted;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'busy': return 'Busy';
      default: return 'Offline';
    }
  };

  const handlePress = () => {
    router.push(`/psychic/${psychic.id}`);
  };

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]} 
      onPress={handlePress} 
      activeOpacity={0.85}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: psychic.profile_picture }} style={styles.image} />
        
        {/* Status Badge - Top Left */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(psychic.online_status) }]}>
          <Text style={styles.statusText}>{getStatusText(psychic.online_status)}</Text>
        </View>
        
        {/* Rating Badge - Top Right */}
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={11} color={colors.gold} />
          <Text style={styles.ratingText}>{psychic.average_rating.toFixed(1)}</Text>
        </View>
      </View>
      
      {/* Card Content */}
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{psychic.name}</Text>
        <Text style={[styles.specialty, { color: colors.textSecondary }]} numberOfLines={1}>
          {psychic.specialties?.[0] || 'Psychic Reader'}
        </Text>
        
        {/* Service Icons - Highlight based on what services advisor OFFERS */}
        <View style={styles.serviceRow}>
          {/* Chat Icon - Green if offers chat */}
          <View style={[
            styles.serviceIcon, 
            { 
              backgroundColor: psychic.offers_chat 
                ? colors.success + '20' 
                : colors.textMuted + '10'
            }
          ]}>
            <Ionicons 
              name="chatbubble" 
              size={12} 
              color={psychic.offers_chat ? colors.success : colors.textMuted + '40'} 
            />
          </View>
          
          {/* Phone Icon - Orange if offers phone */}
          <View style={[
            styles.serviceIcon, 
            { 
              backgroundColor: psychic.offers_phone 
                ? colors.secondary + '20' 
                : colors.textMuted + '10'
            }
          ]}>
            <Ionicons 
              name="call" 
              size={12} 
              color={psychic.offers_phone ? colors.secondary : colors.textMuted + '40'} 
            />
          </View>
          
          {/* Video Icon - Purple if offers video */}
          <View style={[
            styles.serviceIcon, 
            { 
              backgroundColor: (psychic.offers_video || psychic.offers_video_call) 
                ? colors.primary + '20' 
                : colors.textMuted + '10'
            }
          ]}>
            <Ionicons 
              name="videocam" 
              size={12} 
              color={(psychic.offers_video || psychic.offers_video_call) ? colors.primary : colors.textMuted + '40'} 
            />
          </View>
          
          {/* Recorded Reading Icon - Blue if offers recorded */}
          <View style={[
            styles.serviceIcon, 
            { 
              backgroundColor: psychic.offers_recorded_readings 
                ? colors.info + '20' 
                : colors.textMuted + '10'
            }
          ]}>
            <Ionicons 
              name="mic" 
              size={12} 
              color={psychic.offers_recorded_readings ? (colors.info || '#3498db') : colors.textMuted + '40'} 
            />
          </View>
        </View>
        
        <Text style={[styles.price, { color: colors.textSecondary }]}>
          From <Text style={[styles.priceValue, { color: colors.textPrimary }]}>${psychic.chat_rate.toFixed(2)}</Text>/min
        </Text>
        <Text style={[styles.readings, { color: colors.textMuted }]}>
          {psychic.total_readings.toLocaleString()} readings ({new Date().getFullYear() - 1})
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  ratingText: {
    color: '#1A1A2E',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: SPACING.sm,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  specialty: {
    fontSize: 12,
    marginBottom: SPACING.xs,
  },
  serviceRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: SPACING.xs,
  },
  serviceIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  price: {
    fontSize: 12,
  },
  priceValue: {
    fontWeight: '700',
  },
  readings: {
    fontSize: 11,
    marginTop: 2,
  },
});
