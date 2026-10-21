import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { COLORS, SPACING } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

interface StartSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onStart: (minutes: number, serviceType: 'chat' | 'phone' | 'video') => void;
  psychicName: string;
  chatRate: number;
  phoneRate: number;
  videoRate: number;
  balance: number;
  serviceType: 'chat' | 'phone' | 'video';
}

export default function StartSessionModal({
  visible,
  onClose,
  onStart,
  psychicName,
  chatRate,
  phoneRate,
  videoRate,
  balance,
  serviceType,
}: StartSessionModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isFreeChatEligible = serviceType === 'chat' && !user?.first_reading_free_used;
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(isFreeChatEligible ? 4 : null);

  useEffect(() => {
    if (visible) {
      setSelectedMinutes(isFreeChatEligible ? 4 : null);
    }
  }, [visible, isFreeChatEligible]);

  const getRate = () => {
    switch (serviceType) {
      case 'phone': return phoneRate;
      case 'video': return videoRate;
      default: return chatRate;
    }
  };

  const rate = getRate();
  const maxAffordableMinutes = Math.floor(balance / rate);

  const getServiceLabel = () => {
    switch (serviceType) {
      case 'phone': return 'Live Phone Call';
      case 'video': return 'Live Video Call';
      default: return 'Live Chat';
    }
  };

  const getServiceIcon = () => {
    switch (serviceType) {
      case 'phone': return 'call';
      case 'video': return 'videocam';
      default: return 'chatbubble';
    }
  };

  const standardMinutes = [5, 10, 15, 20, 30].filter(m => m <= maxAffordableMinutes);
  const minuteOptions = isFreeChatEligible ? [4, ...standardMinutes] : standardMinutes;

  const handleStart = () => {
    if (selectedMinutes) {
      onStart(selectedMinutes, serviceType);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.serviceHeader}>
              <View style={[styles.serviceIcon, { backgroundColor: COLORS.primary + '20' }]}>
                <Ionicons name={getServiceIcon() as any} size={24} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.title}>{getServiceLabel()}</Text>
                <Text style={styles.subtitle}>with {psychicName}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Free Chat Welcome Banner */}
          {isFreeChatEligible && (
            <View style={{ backgroundColor: 'rgba(255,215,0,0.15)', borderWidth: 1, borderColor: '#FFD700', borderRadius: 12, padding: SPACING.sm, marginBottom: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="gift" size={20} color="#FFD700" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFD700', fontWeight: '800', fontSize: 13 }}>WELCOME OFFER • 4 MIN FREE</Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>Enjoy your first 4 minutes of live chat completely free!</Text>
              </View>
            </View>
          )}

          {/* Rate Info */}
          <View style={styles.rateInfo}>
            <Text style={styles.rateLabel}>Rate</Text>
            <Text style={styles.rateValue}>${rate.toFixed(2)}/min</Text>
          </View>

          {/* Balance */}
          <View style={styles.balanceInfo}>
            <Ionicons name="wallet" size={18} color={COLORS.textSecondary} />
            <Text style={styles.balanceText}>Your balance: ${balance.toFixed(2)}</Text>
            {isFreeChatEligible ? (
              <Text style={[styles.maxText, { color: '#FFD700', fontWeight: '700' }]}>(+4 min free)</Text>
            ) : (
              <Text style={styles.maxText}>(up to {maxAffordableMinutes} min)</Text>
            )}
          </View>

          {/* Minute Selection */}
          <Text style={styles.selectLabel}>Select session duration:</Text>
          <View style={styles.minuteOptions}>
            {minuteOptions.length > 0 ? (
              minuteOptions.map((mins) => {
                const isThisFreeOpt = mins === 4 && isFreeChatEligible;
                return (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.minuteOption,
                      isThisFreeOpt && { borderColor: '#FFD700', borderWidth: 1.5, backgroundColor: 'rgba(255,215,0,0.08)' },
                      selectedMinutes === mins && styles.minuteOptionSelected,
                    ]}
                    onPress={() => setSelectedMinutes(mins)}
                  >
                    <Text
                      style={[
                        styles.minuteValue,
                        isThisFreeOpt && { color: '#FFD700', fontWeight: '800' },
                        selectedMinutes === mins && styles.minuteValueSelected,
                      ]}
                    >
                      {mins} min
                    </Text>
                    <Text
                      style={[
                        styles.minuteCost,
                        isThisFreeOpt && { color: '#FFD700', fontWeight: '800' },
                        selectedMinutes === mins && styles.minuteCostSelected,
                      ]}
                    >
                      {isThisFreeOpt ? 'FREE' : `$${(mins * rate).toFixed(2)}`}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.insufficientFunds}>
                <Ionicons name="alert-circle" size={24} color={COLORS.warning} />
                <Text style={styles.insufficientText}>Insufficient balance</Text>
                <Text style={styles.insufficientSubtext}>Add funds to start a session</Text>
              </View>
            )}
          </View>

          {/* Start Button */}
          {minuteOptions.length > 0 ? (
            <TouchableOpacity
              style={[styles.startButton, !selectedMinutes && styles.startButtonDisabled]}
              onPress={handleStart}
              disabled={!selectedMinutes}
            >
              <LinearGradient
                colors={selectedMinutes === 4 && isFreeChatEligible ? ['#FFD700', '#FFA000'] : (selectedMinutes ? [COLORS.primary, COLORS.primaryDark] : [COLORS.textMuted, COLORS.textMuted])}
                style={styles.startGradient}
              >
                <Ionicons name={getServiceIcon() as any} size={20} color={selectedMinutes === 4 && isFreeChatEligible ? '#1A1A2E' : '#FFF'} />
                <Text style={[styles.startText, selectedMinutes === 4 && isFreeChatEligible && { color: '#1A1A2E', fontWeight: '800' }]}>
                  {selectedMinutes === 4 && isFreeChatEligible
                    ? 'Start 4 Min FREE Chat'
                    : selectedMinutes
                    ? `Start ${selectedMinutes} min session`
                    : 'Select duration'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.addFundsButton} 
              onPress={() => {
                onClose();
                router.push('/(tabs)/wallet');
              }}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.startGradient}
              >
                <Ionicons name="wallet" size={20} color="#FFF" />
                <Text style={styles.startText}>Add Funds</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Info Text */}
          <Text style={styles.infoText}>
            You can add more time during the session with one tap.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.backgroundCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  closeButton: {
    padding: 4,
  },
  rateInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  rateLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  rateValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  balanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  balanceText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  maxText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  selectLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  minuteOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  minuteOption: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: COLORS.backgroundElevated,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  minuteOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  minuteValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  minuteValueSelected: {
    color: COLORS.primary,
  },
  minuteCost: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  minuteCostSelected: {
    color: COLORS.primary,
  },
  insufficientFunds: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.lg,
  },
  insufficientText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  insufficientSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  startButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  startButtonDisabled: {
    opacity: 0.7,
  },
  addFundsButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  startGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  startText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
