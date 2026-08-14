import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SPACING } from '../src/constants/theme';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationPreferences {
  promotional: boolean;
  reading_updates: boolean;
  system: boolean;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors } = useTheme();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    promotional: true,
    reading_updates: true,
    system: true,
  });
  const [showSettings, setShowSettings] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const userId = user?.id || 'mock-user-123';
      
      // Fetch both promotional notifications and message notifications
      const [promoResponse, messagesResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/api/notifications/user/${userId}`),
        fetch(`${BACKEND_URL}/api/messages/notifications/${userId}?user_type=client`)
      ]);
      
      let allNotifications: Notification[] = [];
      
      if (promoResponse.ok) {
        const promoData = await promoResponse.json();
        allNotifications = [...(promoData.notifications || [])];
      }
      
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        // Transform message notifications to match format
        const messageNotifs = (messagesData || []).map((n: any) => ({
          ...n,
          type: n.notification_type || 'message'
        }));
        allNotifications = [...allNotifications, ...messageNotifs];
      }
      
      // Sort by date descending
      allNotifications.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setNotifications(allNotifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  const fetchPreferences = useCallback(async () => {
    try {
      const userId = user?.id || 'mock-user-123';
      const response = await fetch(`${BACKEND_URL}/api/notifications/preferences/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
  }, [fetchNotifications, fetchPreferences]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (notificationId: string, notifType: string) => {
    try {
      const endpoint = notifType === 'promotional' 
        ? `${BACKEND_URL}/api/notifications/mark-read/${notificationId}`
        : `${BACKEND_URL}/api/messages/notifications/${notificationId}/read`;
      
      await fetch(endpoint, { method: 'POST' });
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const userId = user?.id || 'mock-user-123';
      await Promise.all([
        fetch(`${BACKEND_URL}/api/notifications/mark-all-read/${userId}`, { method: 'POST' }),
        fetch(`${BACKEND_URL}/api/messages/notifications/${userId}/read-all?user_type=client`, { method: 'POST' })
      ]);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    
    try {
      const userId = user?.id || 'mock-user-123';
      await fetch(`${BACKEND_URL}/api/notifications/preferences/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrefs)
      });
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    markAsRead(notification.id, notification.type);
    
    if (notification.type === 'message') {
      router.push('/messages');
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return 'chatbubble';
      case 'promotional':
        return 'sparkles';
      case 'reading':
        return 'book';
      case 'tip':
        return 'gift';
      default:
        return 'notifications';
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        { backgroundColor: colors.backgroundCard, borderColor: colors.border },
        !item.is_read && { backgroundColor: colors.primary + '05', borderColor: colors.primary + '30' }
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={[
        styles.iconContainer,
        { backgroundColor: item.is_read ? colors.textMuted + '15' : colors.primary + '15' }
      ]}>
        <Ionicons 
          name={getNotificationIcon(item.type) as any} 
          size={20} 
          color={item.is_read ? colors.textMuted : colors.primary} 
        />
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={[
          styles.notificationTitle,
          { color: colors.textPrimary },
          !item.is_read && styles.unreadText
        ]}>
          {item.title}
        </Text>
        <Text style={[styles.notificationBody, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={[styles.timeText, { color: colors.textMuted }]}>{formatTime(item.created_at)}</Text>
      </View>
      
      {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
    </TouchableOpacity>
  );

  const renderSettings = () => (
    <View style={[styles.settingsContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.settingsHeader, { paddingTop: insets.top, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]} onPress={() => setShowSettings(false)}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Notification Settings</Text>
        <View style={{ width: 44 }} />
      </View>
      
      <View style={styles.settingsContent}>
        <View style={[styles.settingItem, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.settingInfo}>
            <Ionicons name="sparkles" size={24} color={colors.primary} />
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Promotional</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Reading reminders & offers</Text>
            </View>
          </View>
          <Switch
            value={preferences.promotional}
            onValueChange={(value) => updatePreference('promotional', value)}
            trackColor={{ false: colors.border, true: colors.primary + '60' }}
            thumbColor={preferences.promotional ? colors.primary : colors.textMuted}
          />
        </View>
        
        <View style={[styles.settingItem, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.settingInfo}>
            <Ionicons name="book" size={24} color={colors.secondary} />
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Reading Updates</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>New readings & responses</Text>
            </View>
          </View>
          <Switch
            value={preferences.reading_updates}
            onValueChange={(value) => updatePreference('reading_updates', value)}
            trackColor={{ false: colors.border, true: colors.primary + '60' }}
            thumbColor={preferences.reading_updates ? colors.primary : colors.textMuted}
          />
        </View>
        
        <View style={[styles.settingItem, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.settingInfo}>
            <Ionicons name="settings" size={24} color={colors.info} />
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>System</Text>
              <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Account & security alerts</Text>
            </View>
          </View>
          <Switch
            value={preferences.system}
            onValueChange={(value) => updatePreference('system', value)}
            trackColor={{ false: colors.border, true: colors.primary + '60' }}
            thumbColor={preferences.system ? colors.primary : colors.textMuted}
          />
        </View>
      </View>
    </View>
  );

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (showSettings) {
    return renderSettings();
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Notifications</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={() => setShowSettings(true)}>
          <Ionicons name="settings-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {unreadCount > 0 && (
        <TouchableOpacity style={[styles.markAllBar, { backgroundColor: colors.primary + '10' }]} onPress={markAllAsRead}>
          <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all as read ({unreadCount})</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Notifications</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              You'll receive messages and reading updates here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  settingsButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markAllBar: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: '600',
  },
  notificationBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  timeText: {
    fontSize: 12,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: SPACING.sm,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 20,
  },
  // Settings styles
  settingsContainer: {
    flex: 1,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  settingsContent: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: 14,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  settingText: {
    gap: 2,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDesc: {
    fontSize: 13,
  },
});
