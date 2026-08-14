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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../src/constants/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function UsersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/users`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        // Mock data
        setUsers([
          { id: 'u1', name: 'Sarah Miller', email: 'sarah@example.com', balance: 45.00, suspended: false, created_at: '2024-01-15' },
          { id: 'u2', name: 'John Doe', email: 'john@example.com', balance: 120.50, suspended: false, created_at: '2024-01-10' },
          { id: 'u3', name: 'Emma Wilson', email: 'emma@example.com', balance: 0, suspended: true, created_at: '2024-01-05' },
        ]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspend = (user: any) => {
    Alert.alert(
      user.suspended ? 'Unsuspend User' : 'Suspend User',
      `Are you sure you want to ${user.suspended ? 'unsuspend' : 'suspend'} ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: user.suspended ? 'Unsuspend' : 'Suspend',
          style: user.suspended ? 'default' : 'destructive',
          onPress: async () => {
            try {
              if (user.suspended) {
                await fetch(`${BACKEND_URL}/api/admin/unsuspend/${user.id}`, { method: 'POST' });
              } else {
                await fetch(`${BACKEND_URL}/api/admin/suspend?user_id=${user.id}&user_type=client&reason=Admin action`, {
                  method: 'POST',
                });
              }
              setUsers(prev => prev.map(u => 
                u.id === user.id ? { ...u, suspended: !u.suspended } : u
              ));
            } catch (error) {
              Alert.alert('Error', 'Action failed');
            }
          },
        },
      ]
    );
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Users</Text>
        <Text style={styles.count}>{users.length}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
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
          {filteredUsers.map((user) => (
            <View key={user.id} style={[
              styles.userCard,
              user.suspended && styles.userCardSuspended
            ]}>
              <View style={styles.userInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user.name?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={styles.userDetails}>
                  <View style={styles.nameRow}>
                    <Text style={styles.userName}>{user.name}</Text>
                    {user.suspended && (
                      <View style={styles.suspendedBadge}>
                        <Text style={styles.suspendedText}>Suspended</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <Text style={styles.userBalance}>Balance: ${user.balance?.toFixed(2)}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  user.suspended ? styles.unsuspendButton : styles.suspendButton
                ]}
                onPress={() => handleSuspend(user)}
              >
                <Text style={[
                  styles.actionButtonText,
                  user.suspended && { color: COLORS.online }
                ]}>
                  {user.suspended ? 'Unsuspend' : 'Suspend'}
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
    gap: SPACING.sm,
  },
  userCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userCardSuspended: {
    borderColor: COLORS.error + '50',
    backgroundColor: COLORS.error + '05',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
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
  userEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  userBalance: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: 2,
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
