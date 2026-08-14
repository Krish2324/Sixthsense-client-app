import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../src/constants/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function RefundsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [refunds, setRefunds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/refunds`);
      if (response.ok) {
        const data = await response.json();
        setRefunds(data);
      } else {
        // Mock data
        setRefunds([
          {
            id: 'r1',
            user_name: 'Sarah Miller',
            amount: 25.00,
            reason: 'Session disconnected unexpectedly',
            session_type: 'chat',
            psychic_name: 'Mystic Luna',
            created_at: '2024-01-20',
            status: 'pending',
          },
          {
            id: 'r2',
            user_name: 'John Doe',
            amount: 12.00,
            reason: 'Video answer was not relevant to my question',
            session_type: 'video',
            psychic_name: 'Star Reader',
            created_at: '2024-01-19',
            status: 'pending',
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching refunds:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (refund: any) => {
    Alert.alert(
      'Approve Refund',
      `Issue $${refund.amount.toFixed(2)} refund to ${refund.user_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await fetch(`${BACKEND_URL}/api/admin/refunds/${refund.id}/approve`, {
                method: 'POST',
              });
              setRefunds(prev => prev.filter(r => r.id !== refund.id));
              Alert.alert('Success', 'Refund approved and credited to user.');
            } catch (error) {
              Alert.alert('Error', 'Failed to approve');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (refund: any) => {
    Alert.alert(
      'Reject Refund',
      `Reject refund request from ${refund.user_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${BACKEND_URL}/api/admin/refunds/${refund.id}/reject?reason=Denied by admin`, {
                method: 'POST',
              });
              setRefunds(prev => prev.filter(r => r.id !== refund.id));
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
        <Text style={styles.title}>Refund Requests</Text>
        <Text style={styles.count}>{refunds.length}</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : refunds.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle" size={60} color={COLORS.online} />
          <Text style={styles.emptyTitle}>No Pending Refunds</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {refunds.map((refund) => (
            <View key={refund.id} style={styles.refundCard}>
              <View style={styles.refundHeader}>
                <View>
                  <Text style={styles.userName}>{refund.user_name}</Text>
                  <Text style={styles.dateText}>{refund.created_at}</Text>
                </View>
                <View style={styles.amountBadge}>
                  <Text style={styles.amountText}>${refund.amount.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.sessionInfo}>
                <Ionicons 
                  name={refund.session_type === 'chat' ? 'chatbubble' : 'videocam'} 
                  size={16} 
                  color={COLORS.textMuted} 
                />
                <Text style={styles.sessionText}>
                  {refund.session_type === 'chat' ? 'Chat Session' : 'Video Answer'} with {refund.psychic_name}
                </Text>
              </View>

              <View style={styles.reasonSection}>
                <Text style={styles.reasonLabel}>Reason:</Text>
                <Text style={styles.reasonText}>{refund.reason}</Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleReject(refund)}
                >
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => handleApprove(refund)}
                >
                  <Text style={styles.approveText}>Approve Refund</Text>
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
  content: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  refundCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  refundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  amountBadge: {
    backgroundColor: COLORS.error + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.error,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  sessionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  reasonSection: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 10,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  reasonLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: COLORS.backgroundElevated,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  rejectText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  approveButton: {
    flex: 2,
    backgroundColor: COLORS.online,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  approveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});
