import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../src/constants/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function PsychicsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [psychics, setPsychics] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPsychics();
  }, []);

  const fetchPsychics = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/psychics/`);
      if (response.ok) {
        const data = await response.json();
        setPsychics(data);
      }
    } catch (error) {
      console.error('Error fetching psychics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspend = (psychic: any) => {
    Alert.alert(
      psychic.suspended ? 'Unsuspend Psychic' : 'Suspend Psychic',
      `Are you sure you want to ${psychic.suspended ? 'unsuspend' : 'suspend'} ${psychic.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: psychic.suspended ? 'Unsuspend' : 'Suspend',
          style: psychic.suspended ? 'default' : 'destructive',
          onPress: async () => {
            try {
              if (psychic.suspended) {
                await fetch(`${BACKEND_URL}/api/admin/unsuspend/${psychic.id}`, { method: 'POST' });
              } else {
                await fetch(`${BACKEND_URL}/api/admin/suspend?user_id=${psychic.id}&user_type=psychic&reason=Admin action`, {
                  method: 'POST',
                });
              }
              setPsychics(prev => prev.map(p => 
                p.id === psychic.id ? { ...p, suspended: !p.suspended } : p
              ));
            } catch (error) {
              Alert.alert('Error', 'Action failed');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return COLORS.online;
      case 'busy': return COLORS.busy;
      default: return COLORS.offline;
    }
  };

  const filteredPsychics = psychics.filter(psychic =>
    psychic.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Psychics</Text>
        <Text style={styles.count}>{psychics.length}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search psychics..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {filteredPsychics.map((psychic) => (
            <View key={psychic.id} style={[
              styles.psychicCard,
              psychic.suspended && styles.psychicCardSuspended
            ]}>
              <View style={styles.psychicHeader}>
                <Image source={{ uri: psychic.profile_picture }} style={styles.psychicImage} />
                <View style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(psychic.online_status) }
                ]} />
                <View style={styles.psychicInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.psychicName}>{psychic.name}</Text>
                    {psychic.suspended && (
                      <View style={styles.suspendedBadge}>
                        <Text style={styles.suspendedText}>Suspended</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.statsRow}>
                    <Ionicons name="star" size={14} color={COLORS.star} />
                    <Text style={styles.statText}>
                      {psychic.average_rating?.toFixed(1) || '0.0'} ({psychic.total_reviews || 0})
                    </Text>
                    <Text style={styles.statDivider}>•</Text>
                    <Text style={styles.statText}>
                      {psychic.total_readings || 0} readings
                    </Text>
                  </View>
                  <Text style={styles.earningsText}>
                    Earnings: ${psychic.total_earnings?.toFixed(2) || '0.00'}
                  </Text>
                </View>
              </View>

              <View style={styles.ratesRow}>
                {psychic.offers_chat && (
                  <View style={styles.rateItem}>
                    <Ionicons name="chatbubble" size={14} color={COLORS.chatGreen} />
                    <Text style={styles.rateText}>${psychic.chat_rate}/min</Text>
                  </View>
                )}
                {psychic.offers_phone && (
                  <View style={styles.rateItem}>
                    <Ionicons name="call" size={14} color={COLORS.phoneRose} />
                    <Text style={styles.rateText}>${psychic.phone_rate}/min</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  psychic.suspended ? styles.unsuspendButton : styles.suspendButton
                ]}
                onPress={() => handleSuspend(psychic)}
              >
                <Text style={[
                  styles.actionButtonText,
                  psychic.suspended && { color: COLORS.online }
                ]}>
                  {psychic.suspended ? 'Unsuspend' : 'Suspend'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
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
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  count: {
    width: 40,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SPACING.md,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: SPACING.md,
    paddingTop: 0,
    gap: SPACING.md,
  },
  psychicCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  psychicCardSuspended: {
    borderColor: COLORS.error + '50',
    backgroundColor: COLORS.error + '05',
  },
  psychicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  psychicImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  statusDot: {
    position: 'absolute',
    left: 48,
    top: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.backgroundCard,
  },
  psychicInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  psychicName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  suspendedBadge: {
    backgroundColor: COLORS.error + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  suspendedText: {
    color: COLORS.error,
    fontSize: 11,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statDivider: {
    color: COLORS.textMuted,
  },
  earningsText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  ratesRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  rateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rateText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  actionButton: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  suspendButton: {
    backgroundColor: COLORS.error + '15',
  },
  unsuspendButton: {
    backgroundColor: COLORS.online + '15',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },
});
