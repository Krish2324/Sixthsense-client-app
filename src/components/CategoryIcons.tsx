import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';

const CATEGORIES = [
  { id: 'love', name: 'Love\nReadings', icon: 'heart', color: '#E8A0B8', bgColor: '#FDEEF4' },
  { id: 'psychic', name: 'Psychic\nReadings', icon: 'eye', color: '#9B7BD4', bgColor: '#F0E8F8' },
  { id: 'tarot', name: 'Tarot\nReadings', icon: 'sparkles', color: '#7BA4D4', bgColor: '#E8F0F8' },
  { id: 'angel', name: 'Angel\nInsights', icon: 'hand-left', color: '#E8A0B8', bgColor: '#FFF0F4' },
  { id: 'dream', name: 'Dream\nAnalysis', icon: 'cloudy-night', color: '#8B7BC4', bgColor: '#EDE8F8' },
  { id: 'astrology', name: 'Astrology\nHoroscopes', icon: 'planet', color: '#7BCAC4', bgColor: '#E8F8F4' },
  { id: 'career', name: 'Career\nFinance', icon: 'briefcase', color: '#D4A87B', bgColor: '#FFF4E8' },
];

interface CategoryIconsProps {
  onSelectCategory?: (category: string) => void;
}

export default function CategoryIcons({ onSelectCategory }: CategoryIconsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CATEGORIES.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          style={styles.categoryItem}
          onPress={() => onSelectCategory?.(cat.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: cat.bgColor }]}>
            <Ionicons name={cat.icon as any} size={28} color={cat.color} />
          </View>
          <Text style={styles.categoryName}>{cat.name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: SPACING.sm,
    width: 72,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 15,
  },
});
