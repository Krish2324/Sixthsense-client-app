import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function PsychicSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const psychicId = user?.psychic_id || 'psy-demo-001';

  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    chatRate: '2.99',
    phoneRate: '3.99',
    videoRate: '4.99',
    offersChat: true,
    offersPhone: true,
    offersVideo: true,
    offersStandardRecordings: true,   // Standard recordings ($12, 24hr response)
    offersEmergencyRecordings: false, // Emergency recordings ($20, 1hr response)
    vacationMode: false,
    vacationEndDate: '',
    notificationsEnabled: true,
    autoAcceptQuestions: false,
  });

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await fetch(`${BACKEND_URL}/api/psychic-portal/settings/${psychicId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_rate: parseFloat(settings.chatRate),
          phone_rate: parseFloat(settings.phoneRate),
          video_rate: parseFloat(settings.videoRate),
          offers_chat: settings.offersChat,
          offers_phone: settings.offersPhone,
          offers_video: settings.offersVideo,
          notifications_enabled: settings.notificationsEnabled,
          auto_accept_questions: settings.autoAcceptQuestions,
        }),
      });
      Alert.alert('Saved!', 'Your settings have been updated.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVacation = async (enabled: boolean) => {
    setSettings(prev => ({ ...prev, vacationMode: enabled }));
    try {
      await fetch(`${BACKEND_URL}/api/psychic-portal/vacation/${psychicId}?enable=${enabled}`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error toggling vacation:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity onPress={handleSave} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Rates Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rates (Per Minute)</Text>
          <Text style={styles.sectionSubtitle}>
            Set your own rates from $1.99 to $9.99 • You receive 40% of each rate
          </Text>

          <View style={styles.priceRangeNote}>
            <Ionicons name="information-circle" size={16} color={COLORS.primary} />
            <Text style={styles.priceRangeText}>
              You decide your pricing for all live sessions
            </Text>
          </View>

          <View style={styles.rateRow}>
            <View style={styles.rateInfo}>
              <View style={[styles.rateIcon, { backgroundColor: COLORS.chatGreen + '20' }]}>
                <Ionicons name="chatbubble" size={20} color={COLORS.chatGreen} />
              </View>
              <View style={styles.rateLabels}>
                <Text style={styles.rateLabel}>Live Chat</Text>
                <Switch
                  value={settings.offersChat}
                  onValueChange={(v) => setSettings(prev => ({ ...prev, offersChat: v }))}
                  trackColor={{ false: COLORS.border, true: COLORS.online + '50' }}
                  thumbColor={settings.offersChat ? COLORS.online : COLORS.textMuted}
                />
              </View>
            </View>
            <View style={styles.rateInput}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.rateValue}
                value={settings.chatRate}
                onChangeText={(v) => setSettings(prev => ({ ...prev, chatRate: v }))}
                keyboardType="decimal-pad"
                placeholder="1.99-9.99"
                maxLength={4}
              />
            </View>
          </View>

          <View style={styles.rateRow}>
            <View style={styles.rateInfo}>
              <View style={[styles.rateIcon, { backgroundColor: COLORS.phoneRose + '20' }]}>
                <Ionicons name="call" size={20} color={COLORS.phoneRose} />
              </View>
              <View style={styles.rateLabels}>
                <Text style={styles.rateLabel}>Phone Call</Text>
                <Switch
                  value={settings.offersPhone}
                  onValueChange={(v) => setSettings(prev => ({ ...prev, offersPhone: v }))}
                  trackColor={{ false: COLORS.border, true: COLORS.online + '50' }}
                  thumbColor={settings.offersPhone ? COLORS.online : COLORS.textMuted}
                />
              </View>
            </View>
            <View style={styles.rateInput}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.rateValue}
                value={settings.phoneRate}
                onChangeText={(v) => setSettings(prev => ({ ...prev, phoneRate: v }))}
                keyboardType="decimal-pad"
                placeholder="1.99-9.99"
                maxLength={4}
              />
            </View>
          </View>

          <View style={styles.rateRow}>
            <View style={styles.rateInfo}>
              <View style={[styles.rateIcon, { backgroundColor: COLORS.videoPlum + '20' }]}>
                <Ionicons name="videocam" size={20} color={COLORS.videoPlum} />
              </View>
              <View style={styles.rateLabels}>
                <Text style={styles.rateLabel}>Video Call</Text>
                <Switch
                  value={settings.offersVideo}
                  onValueChange={(v) => setSettings(prev => ({ ...prev, offersVideo: v }))}
                  trackColor={{ false: COLORS.border, true: COLORS.online + '50' }}
                  thumbColor={settings.offersVideo ? COLORS.online : COLORS.textMuted}
                />
              </View>
            </View>
            <View style={styles.rateInput}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.rateValue}
                value={settings.videoRate}
                onChangeText={(v) => setSettings(prev => ({ ...prev, videoRate: v }))}
                keyboardType="decimal-pad"
                placeholder="1.99-9.99"
                maxLength={4}
              />
            </View>
          </View>
        </View>

        {/* Recorded Readings Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recorded Readings</Text>
          <Text style={styles.sectionSubtitle}>
            Accept video questions from clients. When online, you must complete paid questions.
          </Text>

          {/* Standard Recordings */}
          <View style={styles.recordingTypeCard}>
            <View style={styles.recordingTypeHeader}>
              <View style={[styles.recordingTypeIcon, { backgroundColor: COLORS.primary + '15' }]}>
                <Ionicons name="time" size={22} color={COLORS.primary} />
              </View>
              <View style={styles.recordingTypeInfo}>
                <Text style={styles.recordingTypeTitle}>Standard Questions</Text>
                <View style={styles.recordingTypeDetails}>
                  <View style={styles.detailBadge}>
                    <Text style={styles.detailBadgeText}>$12</Text>
                  </View>
                  <Text style={styles.recordingTypeSubtitle}>24 hour response time</Text>
                </View>
              </View>
              <Switch
                value={settings.offersStandardRecordings}
                onValueChange={(v) => setSettings(prev => ({ ...prev, offersStandardRecordings: v }))}
                trackColor={{ false: COLORS.border, true: COLORS.primary + '50' }}
                thumbColor={settings.offersStandardRecordings ? COLORS.primary : COLORS.textMuted}
              />
            </View>
          </View>

          {/* Emergency Recordings */}
          <View style={[styles.recordingTypeCard, { marginTop: SPACING.sm }]}>
            <View style={styles.recordingTypeHeader}>
              <View style={[styles.recordingTypeIcon, { backgroundColor: COLORS.error + '15' }]}>
                <Ionicons name="flash" size={22} color={COLORS.error} />
              </View>
              <View style={styles.recordingTypeInfo}>
                <Text style={styles.recordingTypeTitle}>Emergency Questions</Text>
                <View style={styles.recordingTypeDetails}>
                  <View style={[styles.detailBadge, { backgroundColor: COLORS.error + '15' }]}>
                    <Text style={[styles.detailBadgeText, { color: COLORS.error }]}>$20</Text>
                  </View>
                  <Text style={styles.recordingTypeSubtitle}>1 hour response time</Text>
                </View>
              </View>
              <Switch
                value={settings.offersEmergencyRecordings}
                onValueChange={(v) => setSettings(prev => ({ ...prev, offersEmergencyRecordings: v }))}
                trackColor={{ false: COLORS.border, true: COLORS.error + '50' }}
                thumbColor={settings.offersEmergencyRecordings ? COLORS.error : COLORS.textMuted}
              />
            </View>
            {settings.offersEmergencyRecordings && (
              <View style={styles.emergencyWarning}>
                <Ionicons name="warning" size={14} color={COLORS.error} />
                <Text style={styles.emergencyWarningText}>
                  You must respond within 1 hour when online
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Vacation Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vacation Mode</Text>
          <View style={styles.vacationCard}>
            <View style={styles.vacationInfo}>
              <Ionicons name="airplane" size={24} color={COLORS.secondary} />
              <View style={styles.vacationText}>
                <Text style={styles.vacationTitle}>Take a Break</Text>
                <Text style={styles.vacationSubtitle}>
                  You won't appear in search results while on vacation
                </Text>
              </View>
            </View>
            <Switch
              value={settings.vacationMode}
              onValueChange={toggleVacation}
              trackColor={{ false: COLORS.border, true: COLORS.secondary + '50' }}
              thumbColor={settings.vacationMode ? COLORS.secondary : COLORS.textMuted}
            />
          </View>
        </View>

        {/* Free Readings for Loyal Clients */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Free Readings Program</Text>
          {/* New Client Policy Info (Read-only) */}
          <View style={[styles.freeReadingsCard, { borderColor: COLORS.primary + '50' }]}>
            <View style={styles.freeReadingsHeader}>
              <View style={[styles.freeReadingsIcon, { backgroundColor: COLORS.primary + '20' }]}>
                <Ionicons name="people" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.freeReadingsInfo}>
                <Text style={styles.freeReadingsTitle}>New Client Policy</Text>
                <Text style={styles.freeReadingsSubtitle}>
                  All new clients receive 4 minutes free (mandatory)
                </Text>
              </View>
              <View style={[styles.mandatoryBadge]}>
                <Text style={styles.mandatoryText}>REQUIRED</Text>
              </View>
            </View>
            
            <View style={styles.freeReadingsBenefits}>
              <View style={styles.benefitRow}>
                <Ionicons name="information-circle" size={16} color={COLORS.primary} />
                <Text style={styles.benefitText}>
                  You'll be notified when connecting with a new client
                </Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="information-circle" size={16} color={COLORS.primary} />
                <Text style={styles.benefitText}>
                  First 4 minutes are free, then your paid rate applies
                </Text>
              </View>
              <View style={styles.benefitRow}>
                <Ionicons name="information-circle" size={16} color={COLORS.primary} />
                <Text style={styles.benefitText}>
                  Great first impressions lead to loyal, returning clients
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Push Notifications</Text>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(v) => setSettings(prev => ({ ...prev, notificationsEnabled: v }))}
              trackColor={{ false: COLORS.border, true: COLORS.primary + '50' }}
              thumbColor={settings.notificationsEnabled ? COLORS.primary : COLORS.textMuted}
            />
          </View>

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Auto-Accept Questions</Text>
              <Text style={styles.toggleSubtitle}>Automatically accept incoming questions</Text>
            </View>
            <Switch
              value={settings.autoAcceptQuestions}
              onValueChange={(v) => setSettings(prev => ({ ...prev, autoAcceptQuestions: v }))}
              trackColor={{ false: COLORS.border, true: COLORS.primary + '50' }}
              thumbColor={settings.autoAcceptQuestions ? COLORS.primary : COLORS.textMuted}
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: COLORS.error }]}>Danger Zone</Text>
          <TouchableOpacity style={styles.dangerButton}>
            <Ionicons name="trash" size={20} color={COLORS.error} />
            <Text style={styles.dangerText}>Deactivate Account</Text>
          </TouchableOpacity>
        </View>

        {/* Legal & Guidelines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal & Guidelines</Text>
          <TouchableOpacity 
            style={styles.legalLink}
            onPress={() => router.push('/terms-psychic')}
          >
            <Ionicons name="document-text" size={20} color={COLORS.primary} />
            <View style={styles.legalLinkText}>
              <Text style={styles.legalLinkTitle}>Psychic Advisor Agreement</Text>
              <Text style={styles.legalLinkSubtitle}>Terms, policies & suspension rules</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
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
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rateIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateLabels: {
    marginLeft: SPACING.md,
  },
  rateLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  rateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  dollarSign: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  rateValue: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    minWidth: 50,
    textAlign: 'right',
  },
  priceRangeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    borderRadius: 10,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    gap: 8,
  },
  priceRangeText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  vacationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vacationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  vacationText: {
    flex: 1,
  },
  vacationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  vacationSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  recordedCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recordedInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: SPACING.md,
  },
  recordedText: {
    flex: 1,
  },
  recordedTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  recordedSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  recordedNote: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  recordingTypeCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recordingTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingTypeInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  recordingTypeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  recordingTypeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  detailBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  detailBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  recordingTypeSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emergencyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 6,
  },
  emergencyWarningText: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '500',
  },
  freeReadingsCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.online + '30',
  },
  freeReadingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  freeReadingsIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.online + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  freeReadingsInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  freeReadingsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  freeReadingsSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  freeReadingsBenefits: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  benefitText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error + '15',
    borderRadius: 14,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  dangerText: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: '600',
  },
  legalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  legalLinkText: {
    flex: 1,
  },
  legalLinkTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  legalLinkSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  mandatoryBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mandatoryText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
});
