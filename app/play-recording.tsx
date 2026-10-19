import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Audio } from 'expo-av';
import { SPACING } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';

const { width } = Dimensions.get('window');

export default function PlayRecordingScreen() {
  const { url, type, psychicName, duration, date } = useLocalSearchParams<{
    url: string;
    type: string;
    psychicName: string;
    duration: string;
    date: string;
  }>();
  
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const videoRef = useRef<Video>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(parseInt(duration || '0'));
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // CLI-050: Audio playback speed state (1.0x, 1.5x, 2.0x)
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  // Use only the exact advisor video URL (no fake sample video)
  const videoUri = useMemo(() => {
    if (!url || typeof url !== 'string' || url === 'test_mode_video') {
      return null;
    }
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('file://')) {
      return trimmed;
    }
    return null;
  }, [url]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => null);
  }, []);

  const togglePlaybackSpeed = async () => {
    const nextRate = playbackRate === 1.0 ? 1.5 : playbackRate === 1.5 ? 2.0 : 1.0;
    setPlaybackRate(nextRate);
    if (sound) {
      await sound.setRateAsync(nextRate, true).catch(() => null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Audio playback for phone calls
  useEffect(() => {
    if (type === 'phone' && url) {
      loadAudio();
    }
    
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [type, url]);

  const loadAudio = async () => {
    try {
      // Validate URL first
      if (!url || url.includes('example.com') || !url.startsWith('http')) {
        setLoadError('Recording not available. This may be a demo or the recording has expired.');
        setIsLoading(false);
        return;
      }

      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      setSound(newSound);
      setLoadError(null);
      setIsLoading(false);
    } catch (error: any) {
      console.error('Error loading audio:', error);
      setLoadError('Unable to load recording. The file may have been removed or is temporarily unavailable.');
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis / 1000);
      if (status.durationMillis) {
        setPlaybackDuration(status.durationMillis / 1000);
      }
      setIsPlaying(status.isPlaying);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPlaybackPosition(0);
      }
    }
  };

  const togglePlayPause = async () => {
    if (loadError) {
      // If there's an error, show alert
      Alert.alert('Recording Unavailable', loadError);
      return;
    }
    
    if (type === 'phone' && sound) {
      try {
        if (isPlaying) {
          await sound.pauseAsync();
        } else {
          await sound.playAsync();
        }
      } catch (error) {
        console.error('Playback error:', error);
        Alert.alert('Playback Error', 'Unable to play the recording. Please try again.');
      }
    } else if (type === 'phone' && !sound && !isLoading) {
      // Sound failed to load, show error
      Alert.alert('Recording Unavailable', loadError || 'Unable to load the recording. The file may no longer be available.');
    }
  };

  const handleVideoPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis / 1000);
      if (status.durationMillis) {
        setPlaybackDuration(status.durationMillis / 1000);
      }
      setIsPlaying(status.isPlaying);
      setIsLoading(false);
      setLoadError(null);
    } else if ((status as any).error) {
      console.warn('Video playback status error:', (status as any).error);
      setIsLoading(false);
      setLoadError('Failed to play video');
    }
  };

  const toggleVideoPlayPause = async () => {
    if (!videoRef.current) return;
    try {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    } catch (err) {
      console.warn('Toggle playback error:', err);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm, backgroundColor: type === 'video' || type === 'recorded' ? 'rgba(0,0,0,0.8)' : colors.backgroundCard }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={type === 'video' || type === 'recorded' ? '#FFF' : colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: type === 'video' || type === 'recorded' ? '#FFF' : colors.textPrimary }]}>
            {type === 'phone' ? 'Phone Recording' : type === 'video' ? 'Video Recording' : 'Recorded Reading'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: type === 'video' || type === 'recorded' ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
            with {psychicName}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      {type === 'phone' ? (
        // Audio Player UI
        <View style={styles.audioContainer}>
          <View style={[styles.audioCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <View style={[styles.audioIconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="call" size={40} color={colors.primary} />
            </View>
            
            <Text style={[styles.psychicNameLarge, { color: colors.textPrimary }]}>{psychicName}</Text>
            <Text style={[styles.dateText, { color: colors.textMuted }]}>{formatDate(date || '')}</Text>
            
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      backgroundColor: colors.primary,
                      width: `${(playbackPosition / playbackDuration) * 100}%`
                    }
                  ]} 
                />
              </View>
              <View style={styles.timeRow}>
                <Text style={[styles.timeText, { color: colors.textMuted }]}>{formatDuration(playbackPosition)}</Text>
                <Text style={[styles.timeText, { color: colors.textMuted }]}>{formatDuration(playbackDuration)}</Text>
              </View>
            </View>
            
            {/* Play Controls */}
            <View style={styles.controlsRow}>
              <TouchableOpacity style={styles.controlButton} disabled={!!loadError}>
                <Ionicons name="play-back" size={28} color={loadError ? colors.textMuted + '50' : colors.textMuted} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.playPauseButton, { backgroundColor: loadError ? '#999' : colors.primary }]}
                onPress={togglePlayPause}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : loadError ? (
                  <Ionicons name="alert-circle" size={32} color="#FFF" />
                ) : (
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#FFF" />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.controlButton} disabled={!!loadError}>
                <Ionicons name="play-forward" size={28} color={loadError ? colors.textMuted + '50' : colors.textMuted} />
              </TouchableOpacity>

              {/* CLI-050: Speed toggle button */}
              <TouchableOpacity
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primary + '20', marginLeft: 8 }}
                onPress={togglePlaybackSpeed}
                disabled={!!loadError}
              >
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>{playbackRate}x</Text>
              </TouchableOpacity>
            </View>
            
            {/* Error Message */}
            {loadError && (
              <View style={styles.errorContainer}>
                <Ionicons name="information-circle" size={18} color="#FF6B6B" />
                <Text style={styles.errorText}>{loadError}</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        // Video Player
        <View style={[styles.videoContainer, { backgroundColor: colors.background }]}>
          {!videoUri ? (
            <View style={[styles.videoPlayerWrapper, { padding: SPACING.lg, justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="videocam-off-outline" size={48} color={colors.textMuted} />
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700', marginTop: 12, textAlign: 'center' }}>
                Video Not Yet Uploaded
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 6, textAlign: 'center' }}>
                Advisor will record and upload the video response here.
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.95}
              style={styles.videoPlayerWrapper}
              onPress={toggleVideoPlayPause}
            >
              <Video
                ref={videoRef}
                source={{ uri: videoUri }}
                style={styles.video}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={true}
                isLooping={false}
                onPlaybackStatusUpdate={handleVideoPlaybackStatusUpdate}
                onLoad={() => {
                  setIsLoading(false);
                  setLoadError(null);
                }}
                onError={(e) => {
                  console.warn('Video load error:', e);
                  setIsLoading(false);
                  setLoadError('Failed to play video. Please check connection or retry.');
                }}
              />

              {isLoading && (
                <View style={styles.videoLoading}>
                  <ActivityIndicator size="large" color="#FFF" />
                  <Text style={{ color: '#FFF', marginTop: 10, fontSize: 13, fontWeight: '500' }}>
                    Loading video...
                  </Text>
                </View>
              )}

              {loadError && (
                <View style={styles.videoLoading}>
                  <Ionicons name="alert-circle-outline" size={44} color="#FF6B6B" />
                  <Text style={{ color: '#FFF', marginTop: 8, fontSize: 14, fontWeight: '600' }}>
                    {loadError}
                  </Text>
                  <TouchableOpacity
                    style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.primary, borderRadius: 20 }}
                    onPress={async () => {
                      if (videoRef.current) {
                        setIsLoading(true);
                        setLoadError(null);
                        await videoRef.current.replayAsync().catch(() => null);
                      }
                    }}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!isLoading && !isPlaying && !loadError && (
                <View style={styles.playOverlay}>
                  <View style={styles.playOverlayButton}>
                    <Ionicons name="play" size={38} color="#FFF" style={{ marginLeft: 4 }} />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Video Info & Controls */}
          <ScrollView style={styles.videoDetailsScroll} contentContainerStyle={{ padding: SPACING.md }}>
            <View style={[styles.videoInfo, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={styles.videoInfoHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.videoInfoTitle, { color: colors.textPrimary }]}>
                    {type === 'video' ? 'Video Reading Response' : 'Recorded Reading'}
                  </Text>
                  <Text style={[styles.videoInfoSubtitle, { color: colors.textMuted }]}>
                    by {psychicName || 'Psychic Advisor'} • {formatDate(date || '')}
                  </Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                  <Text style={styles.verifiedText}>Completed</Text>
                </View>
              </View>

              <View style={[styles.durationRow, { borderTopColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="time-outline" size={18} color={colors.primary} />
                  <Text style={[styles.videoInfoDuration, { color: colors.textSecondary }]}>
                    Duration: {formatDuration(playbackDuration)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.replayButton, { backgroundColor: colors.primary + '20' }]}
                  onPress={async () => {
                    if (videoRef.current) {
                      await videoRef.current.replayAsync().catch(() => null);
                    }
                  }}
                >
                  <Ionicons name="reload" size={15} color={colors.primary} />
                  <Text style={[styles.replayText, { color: colors.primary }]}>Replay</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
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
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  // Audio Player Styles
  audioContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  audioCard: {
    borderRadius: 20,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
  },
  audioIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  psychicNameLarge: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    marginBottom: SPACING.xl,
  },
  progressContainer: {
    width: '100%',
    marginBottom: SPACING.xl,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xl,
  },
  controlButton: {
    padding: 12,
  },
  playPauseButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Video Player Styles
  videoContainer: {
    flex: 1,
  },
  videoPlayerWrapper: {
    width: width,
    height: width * 0.5625, // 16:9 widescreen ratio
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  video: {
    width: width,
    height: width * 0.5625,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playOverlayButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  videoLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  videoDetailsScroll: {
    flex: 1,
  },
  videoInfo: {
    borderRadius: 16,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  videoInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  videoInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  videoInfoSubtitle: {
    fontSize: 14,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '600',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    marginTop: 10,
  },
  videoInfoDuration: {
    fontSize: 14,
    fontWeight: '500',
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  replayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#FF6B6B15',
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#FF6B6B',
    textAlign: 'center',
  },
});
