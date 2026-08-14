import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';

const TOPICS = [
  { id: 'all', name: 'All', icon: 'apps' },
  { id: 'Love & Relationships', name: 'Love', icon: 'heart' },
  { id: 'Career & Finance', name: 'Career', icon: 'briefcase' },
  { id: 'Marriage & Family', name: 'Marriage', icon: 'people' },
  { id: 'Life Path', name: 'Life Path', icon: 'compass' },
  { id: 'Psychic Readings', name: 'Spiritual', icon: 'sparkles' },
  { id: 'Dream Analysis', name: 'Dreams', icon: 'moon' },
  { id: 'Pet Readings', name: 'Pets', icon: 'paw' },
  { id: 'Money & Abundance', name: 'Money', icon: 'cash' },
];

interface TopicFilterProps {
  selectedTopic: string;
  onSelectTopic: (topic: string) => void;
}

export default function TopicFilter({ selectedTopic, onSelectTopic }: TopicFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {TOPICS.map((topic) => {
        const isSelected = selectedTopic === topic.id || (selectedTopic === '' && topic.id === 'all');
        return (
          <TouchableOpacity
            key={topic.id}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelectTopic(topic.id === 'all' ? '' : topic.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={topic.icon as any}
              size={16}
              color={isSelected ? COLORS.textPrimary : COLORS.textSecondary}
            />
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {topic.name}
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
    paddingVertical: SPACING.sm,
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
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
});
