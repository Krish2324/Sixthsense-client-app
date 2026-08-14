import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import HorizontalPsychicCard from './HorizontalPsychicCard';

interface SectionProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  psychics: any[];
  onSeeAll?: () => void;
}

export default function Section({ title, icon, iconColor, psychics, onSeeAll }: SectionProps) {
  const { colors } = useTheme();
  
  if (!psychics || psychics.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name={icon} size={20} color={iconColor || colors.primary} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        </View>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll} style={styles.seeAllButton}>
            <Text style={[styles.seeAllText, { color: colors.textSecondary }]}>See All</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {psychics.slice(0, 6).map((psychic) => (
          <HorizontalPsychicCard key={psychic.id} psychic={psychic} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
});
