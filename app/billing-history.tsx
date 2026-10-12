import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';
import { apiClient } from '../src/services/api';

const PAGE_SIZE = 20;

interface Transaction {
  id: string;
  type: 'credit_purchase' | 'reading_payment' | 'refund' | 'tip';
  amount: number;
  credits?: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
  psychic_name?: string;
}

export default function BillingHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1); // CLI-040: pagination
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  // CLI-036: Paginated transaction history feed (PAGE_SIZE = 20)
  const fetchTransactions = async (pageNum = 1, append = false) => {
    try {
      const data = await apiClient.get(
        `/api/payments/history/${user?.id}?page=${pageNum}&limit=${PAGE_SIZE}`,
        false // no cache for billing
      );
      const incoming: Transaction[] = data.transactions || [];
      setTransactions((prev) => append ? [...prev, ...incoming] : incoming);
      setHasMore(incoming.length >= PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      if (!append) setTransactions([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1);
  }, [user?.id]);

  const onRefresh = () => {
    setIsRefreshing(true);
    setPage(1);
    fetchTransactions(1);
  };

  // CLI-040: Load next page
  const loadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTransactions(nextPage, true);
  };

  // CLI-033: Printable PDF / HTML Tax Receipt Exporter
  const downloadReceipt = (transaction: Transaction) => {
    if (Platform.OS === 'web') {
      const windowRef = window.open('', '_blank');
      if (windowRef) {
        windowRef.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Official Receipt #${transaction.id}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #111; max-width: 600px; margin: 0 auto; }
                .header { text-align: center; border-bottom: 2px solid #6B4EAA; padding-bottom: 20px; margin-bottom: 30px; }
                .title { font-size: 24px; font-weight: bold; color: #6B4EAA; margin: 0; }
                .subtitle { color: #666; font-size: 14px; margin-top: 4px; }
                .row { display: flex; justify-space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
                .label { font-weight: 600; color: #555; }
                .value { font-weight: bold; text-align: right; }
                .total { font-size: 20px; font-weight: 800; color: #6B4EAA; margin-top: 20px; }
                .print-btn { background: #6B4EAA; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 30px; width: 100%; font-size: 16px; }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="title">Sixth Sense Psychics</div>
                <div class="subtitle">Official Payment Receipt & Tax Invoice</div>
              </div>
              <div class="row"><span class="label">Receipt ID</span><span class="value">#${transaction.id}</span></div>
              <div class="row"><span class="label">Date & Time</span><span class="value">${formatDate(transaction.created_at)}</span></div>
              <div class="row"><span class="label">Description</span><span class="value">${transaction.description}</span></div>
              <div class="row"><span class="label">Payment Type</span><span class="value">${transaction.type.replace('_', ' ').toUpperCase()}</span></div>
              <div class="row"><span class="label">Status</span><span class="value" style="color: green;">${transaction.status.toUpperCase()}</span></div>
              <div class="row total"><span class="label">Amount Paid</span><span class="value">$${transaction.amount.toFixed(2)}</span></div>
              <button class="print-btn" onclick="window.print()">Print / Save as PDF Receipt</button>
            </body>
          </html>
        `);
      }
    } else {
      const receiptUrl = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/payments/receipt/${transaction.id}`;
      Linking.openURL(receiptUrl).catch(() => {
        const AlertModule = require('react-native').Alert;
        AlertModule.alert(
          'Tax Receipt Generated',
          `Official Receipt #${transaction.id}\n\nDescription: ${transaction.description}\nAmount: $${transaction.amount.toFixed(2)}\nStatus: ${transaction.status.toUpperCase()}\nDate: ${formatDate(transaction.created_at)}`
        );
      });
    }
  };


  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit_purchase':
        return 'card';
      case 'reading_payment':
        return 'chatbubbles';
      case 'refund':
        return 'return-down-back';
      case 'tip':
        return 'gift';
      default:
        return 'receipt';
    }
  };

  const getTransactionColor = (type: string, status: string) => {
    if (status === 'failed') return colors.error;
    if (status === 'pending') return colors.warning || '#FFA500';
    
    switch (type) {
      case 'credit_purchase':
        return colors.success || '#4CAF50';
      case 'reading_payment':
        return colors.error;
      case 'refund':
        return colors.success || '#4CAF50';
      case 'tip':
        return colors.error;
      default:
        return colors.textPrimary;
    }
  };

  const formatAmount = (type: string, amount: number) => {
    const prefix = type === 'credit_purchase' || type === 'refund' ? '+' : '-';
    return `${prefix}$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Billing History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* CLI-041: Transaction Type Filter Pills */}
      <View style={{ maxHeight: 50, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'credit_purchase', label: 'Recharges' },
            { id: 'reading_payment', label: 'Readings' },
            { id: 'tip', label: 'Tips' },
            { id: 'refund', label: 'Refunds' },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: filterType === item.id ? colors.primary : colors.backgroundCard,
                borderWidth: 1,
                borderColor: filterType === item.id ? colors.primary : colors.border,
              }}
              onPress={() => setFilterType(item.id)}
            >
              <Text style={{ color: filterType === item.id ? '#FFF' : colors.textSecondary, fontWeight: '600', fontSize: 13 }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading transactions...</Text>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Transactions Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Your billing history will appear here once you make a purchase.
          </Text>
          <TouchableOpacity
            style={[styles.addCreditsButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/wallet')}
          >
            <Ionicons name="add-circle" size={20} color="#FFF" />
            <Text style={styles.addCreditsText}>Add Credits</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {transactions
            .filter((t) => filterType === 'all' || t.type === filterType)
            .map((transaction) => (
            <View
              key={transaction.id}
              style={[styles.transactionItem, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
            >
              <View style={[styles.transactionIcon, { backgroundColor: colors.backgroundElevated }]}>
                <Ionicons
                  name={getTransactionIcon(transaction.type) as any}
                  size={22}
                  color={getTransactionColor(transaction.type, transaction.status)}
                />
              </View>
              <View style={styles.transactionDetails}>
                <Text style={[styles.transactionDescription, { color: colors.textPrimary }]}>
                  {transaction.description}
                </Text>
                {transaction.psychic_name && (
                  <Text style={[styles.transactionPsychic, { color: colors.textSecondary }]}>
                    with {transaction.psychic_name}
                  </Text>
                )}
                <Text style={[styles.transactionDate, { color: colors.textMuted }]}>
                  {formatDate(transaction.created_at)}
                </Text>
                {/* CLI-045: Refunded to Card status badge */}
                {transaction.type === 'refund' && (
                  <View style={{ backgroundColor: '#10B981' + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4, alignSelf: 'flex-start' }}>
                    <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '700' }}>Refunded to Card</Text>
                  </View>
                )}
              </View>
              <View style={styles.transactionAmount}>
                <Text
                  style={[
                    styles.amountText,
                    { color: getTransactionColor(transaction.type, transaction.status) },
                  ]}
                >
                  {formatAmount(transaction.type, transaction.amount)}
                </Text>
                {transaction.credits && (
                  <Text style={[styles.creditsText, { color: colors.textSecondary }]}>
                    {transaction.credits} credits
                  </Text>
                )}
                {transaction.status !== 'completed' && (
                  <Text
                    style={[
                      styles.statusText,
                      { color: transaction.status === 'pending' ? colors.warning || '#FFA500' : colors.error },
                    ]}
                  >
                    {transaction.status}
                  </Text>
                )}
              </View>
              {/* CLI-041: Receipt download */}
              <TouchableOpacity
                onPress={() => downloadReceipt(transaction)}
                style={styles.receiptBtn}
              >
                <Ionicons name="download-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
          {/* CLI-040: Load More */}
          {hasMore && (
            <TouchableOpacity
              style={[styles.loadMoreBtn, { borderColor: colors.border }]}
              onPress={loadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load More</Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  addCreditsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addCreditsText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionPsychic: {
    fontSize: 13,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  creditsText: {
    fontSize: 12,
    marginTop: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  receiptBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadMoreBtn: {
    marginTop: 12,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
