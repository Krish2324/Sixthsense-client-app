import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';

const FILTERS = [
  { id: 'all', name: 'All advisors', icon: 'grid' },
  { id: 'new', name: 'New advisors', icon: 'checkmark-circle', iconColor: COLORS.online },
  { id: 'live_chat', name: 'Live chat readings', icon: 'chatbubble', iconColor: COLORS.chatGreen },
];

interface FilterChipsProps {
  selectedFilter: string;
  onSelectFilter: (filter: string) => void;
}

export default function FilterChips({ selectedFilter, onSelectFilter }: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {FILTERS.map((filter) => {
        const isSelected = selectedFilter === filter.id;
        return (
          <TouchableOpacity
            key={filter.id}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelectFilter(filter.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={filter.icon as any}
              size={16}
              color={isSelected ? '#FFF' : (filter.iconColor || COLORS.textSecondary)}
            />
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {filter.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingTop: 2,
    paddingBottom: SPACING.sm,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
});
