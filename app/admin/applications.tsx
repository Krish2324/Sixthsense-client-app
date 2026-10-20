import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../src/constants/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.29.73:8000';

export default function ApplicationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchApplications = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/applications?status=all`);
      if (response.ok) {
        const data = await response.json();
        setApplications(Array.isArray(data) ? data : (data.applications || []));
      } else {
        setApplications([]);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchApplications();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchApplications();
    setRefreshing(false);
  };

  const handleApprove = async (app: any) => {
    Alert.alert(
      'Approve Application',
      `Approve ${app.name || app.full_name}? Their profile will become visible to all users immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Make Visible',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/admin/applications/${app.id}/approve`, {
                method: 'POST',
              });
              if (response.ok) {
                setApplications(prev => prev.filter(a => a.id !== app.id));
                Alert.alert(
                  '✅ Advisor Approved!', 
                  `${app.name || app.full_name} is now listed and visible to all users on the platform.`
                );
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to approve');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (app: any) => {
    Alert.alert(
      'Reject Application',
      `Are you sure you want to reject ${app.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${BACKEND_URL}/api/admin/applications/${app.id}/reject`, {
                method: 'POST',
              });
              setApplications(prev => prev.filter(a => a.id !== app.id));
            } catch (error) {
              Alert.alert('Error', 'Failed to reject');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Applications</Text>
        <Text style={styles.count}>{applications.length}</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : applications.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        >
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={60} color={COLORS.online} />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptySubtitle}>No pending applications</Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        >
          {applications.map((app) => (
            <View key={app.id} style={styles.appCard}>
              <View style={styles.appHeader}>
                {app.profile_picture ? (
                  <View style={styles.appAvatarImg}>
                    <Ionicons name="person" size={26} color={COLORS.primary} />
                  </View>
                ) : (
                  <View style={styles.appAvatar}>
                    <Text style={styles.appAvatarText}>
                      {(app.name || app.full_name)?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.appInfo}>
                  <Text style={styles.appName}>{app.name || app.full_name}</Text>
                  <Text style={styles.appEmail}>{app.email}</Text>
                  <Text style={styles.appDate}>
                    Applied: {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : app.created_at}
                  </Text>
                </View>
              </View>

              <View style={styles.appDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Experience:</Text>
                  <Text style={styles.detailValue}>{app.years_experience || app.experience_years} years</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Chat Rate:</Text>
                  <Text style={styles.detailValue}>${app.chat_rate}/min</Text>
                </View>
                {app.previous_platforms && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Previous:</Text>
                    <Text style={styles.detailValue}>{app.previous_platforms}</Text>
                  </View>
                )}
              </View>

              <View style={styles.tagsSection}>
                <Text style={styles.tagsLabel}>Specialties:</Text>
                <View style={styles.tagsRow}>
                  {app.specialties?.map((spec: string, idx: number) => (
                    <View key={idx} style={styles.tag}>
                      <Text style={styles.tagText}>{spec}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.tagsSection}>
                <Text style={styles.tagsLabel}>Reading Methods:</Text>
                <View style={styles.tagsRow}>
                  {app.reading_methods?.map((method: string, idx: number) => (
                    <View key={idx} style={[styles.tag, styles.methodTag]}>
                      <Text style={[styles.tagText, styles.methodTagText]}>
                        {method.charAt(0).toUpperCase() + method.slice(1)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {(app.bio || app.description || app.about_me) && (
                <View style={styles.bioSection}>
                  <Text style={styles.bioLabel}>Bio:</Text>
                  <Text style={styles.bioText} numberOfLines={3}>
                    {app.description || app.about_me || app.bio}
                  </Text>
                </View>
              )}

              <View style={styles.visibilityNote}>
                <Ionicons name="eye-off" size={14} color={COLORS.textMuted} />
                <Text style={styles.visibilityText}>
                  Not visible to users until approved
                </Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleReject(app)}
                >
                  <Ionicons name="close" size={18} color={COLORS.error} />
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => handleApprove(app)}
                >
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                  <Text style={styles.approveText}>Approve</Text>
                </TouchableOpacity>
              </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  content: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  appCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  appAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appAvatarImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appAvatarText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '600',
  },
  appInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  appName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  appEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  appDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  appDetails: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 10,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  tagsSection: {
    marginBottom: SPACING.sm,
  },
  tagsLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  methodTag: {
    backgroundColor: COLORS.secondary + '20',
  },
  methodTagText: {
    color: COLORS.secondary,
  },
  bioSection: {
    marginBottom: SPACING.md,
  },
  bioLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  bioText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  visibilityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.textMuted + '15',
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    gap: 6,
  },
  visibilityText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error + '15',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  rejectText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.online,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  approveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});
