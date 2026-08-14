import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonLoader({ 
  width = '100%', 
  height = 20, 
  borderRadius = 8,
  style 
}: SkeletonLoaderProps) {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function PsychicCardSkeleton() {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
      <SkeletonLoader width={120} height={120} borderRadius={60} />
      <View style={styles.cardContent}>
        <SkeletonLoader width="70%" height={18} style={{ marginTop: 12 }} />
        <SkeletonLoader width="50%" height={14} style={{ marginTop: 8 }} />
        <SkeletonLoader width="40%" height={14} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function MessageSkeleton() {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.messageRow, { marginBottom: 16 }]}>
      <SkeletonLoader width={44} height={44} borderRadius={22} />
      <View style={styles.messageContent}>
        <SkeletonLoader width="60%" height={16} />
        <SkeletonLoader width="90%" height={14} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View style={styles.profile}>
      <SkeletonLoader width={100} height={100} borderRadius={50} />
      <SkeletonLoader width="50%" height={20} style={{ marginTop: 16 }} />
      <SkeletonLoader width="30%" height={14} style={{ marginTop: 8 }} />
      <View style={styles.profileStats}>
        <SkeletonLoader width={80} height={40} borderRadius={8} />
        <SkeletonLoader width={80} height={40} borderRadius={8} />
        <SkeletonLoader width={80} height={40} borderRadius={8} />
      </View>
    </View>
  );
}

export function ListItemSkeleton() {
  return (
    <View style={styles.listItem}>
      <SkeletonLoader width={48} height={48} borderRadius={24} />
      <View style={styles.listContent}>
        <SkeletonLoader width="70%" height={16} />
        <SkeletonLoader width="50%" height={14} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export function HomeSkeleton() {
  return (
    <View style={styles.home}>
      <SkeletonLoader width="100%" height={180} borderRadius={16} />
      <View style={styles.homeSection}>
        <SkeletonLoader width="40%" height={20} style={{ marginBottom: 12 }} />
        <View style={styles.homeCards}>
          <SkeletonLoader width={140} height={180} borderRadius={12} />
          <SkeletonLoader width={140} height={180} borderRadius={12} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 150,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    width: '100%',
    alignItems: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  messageContent: {
    flex: 1,
    marginLeft: 12,
  },
  profile: {
    alignItems: 'center',
    padding: 20,
  },
  profileStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  listContent: {
    flex: 1,
    marginLeft: 12,
  },
  home: {
    padding: 16,
  },
  homeSection: {
    marginTop: 24,
  },
  homeCards: {
    flexDirection: 'row',
    gap: 12,
  },
});
