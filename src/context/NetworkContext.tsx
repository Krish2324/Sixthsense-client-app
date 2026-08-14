import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NetworkContextType {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
}

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
  isInternetReachable: true,
  connectionType: null,
});

export function useNetwork() {
  return useContext(NetworkContext);
}

interface NetworkProviderProps {
  children: ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
  const [networkState, setNetworkState] = useState<NetworkContextType>({
    isConnected: true,
    isInternetReachable: true,
    connectionType: null,
  });
  const [showBanner, setShowBanner] = useState(false);
  const bannerAnimation = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isConnected = state.isConnected ?? true;
      const isInternetReachable = state.isInternetReachable;
      
      setNetworkState({
        isConnected,
        isInternetReachable,
        connectionType: state.type,
      });

      // Show/hide offline banner
      if (!isConnected) {
        setShowBanner(true);
        Animated.timing(bannerAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else if (showBanner) {
        Animated.timing(bannerAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowBanner(false));
      }
    });

    return () => unsubscribe();
  }, [showBanner]);

  return (
    <NetworkContext.Provider value={networkState}>
      {children}
      {showBanner && (
        <Animated.View
          style={[
            styles.offlineBanner,
            {
              transform: [{
                translateY: bannerAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0],
                }),
              }],
              opacity: bannerAnimation,
            },
          ]}
        >
          <Ionicons name="cloud-offline" size={18} color="#FFF" />
          <Text style={styles.offlineText}>No Internet Connection</Text>
        </Animated.View>
      )}
    </NetworkContext.Provider>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#E74C3C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingTop: 50, // Account for status bar
    gap: 8,
    zIndex: 9999,
  },
  offlineText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
