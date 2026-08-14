import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

interface AgoraVideoCallProps {
  channelName: string;
  token: string;
  uid: number;
  appId: string;
  isVideo: boolean;
  onCallEnd: () => void;
  onUserJoined?: () => void;
  onUserLeft?: () => void;
  onError?: (error: string) => void;
}

export default function AgoraVideoCall({
  channelName,
  token,
  uid,
  appId,
  isVideo,
  onCallEnd,
  onUserJoined,
  onUserLeft,
  onError,
}: AgoraVideoCallProps) {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(!isVideo);

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    webViewRef.current?.injectJavaScript(`toggleMute(${newMuted}); true;`);
  };

  const toggleCamera = () => {
    const newCameraOff = !isCameraOff;
    setIsCameraOff(newCameraOff);
    webViewRef.current?.injectJavaScript(`toggleCamera(${newCameraOff}); true;`);
  };

  const endCall = () => {
    webViewRef.current?.injectJavaScript(`leaveChannel(); true;`);
    onCallEnd();
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Agora WebView message:', data);
      
      switch (data.type) {
        case 'ready':
          setIsLoading(false);
          break;
        case 'user-joined':
          onUserJoined?.();
          break;
        case 'user-left':
          onUserLeft?.();
          break;
        case 'error':
          onError?.(data.message);
          break;
        case 'call-ended':
          onCallEnd();
          break;
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
    }
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #1a1a2e; }
    #videos { width: 100%; height: 100%; position: relative; }
    #remote-video { width: 100%; height: 100%; object-fit: cover; background: #2d2d44; }
    #local-video { 
      position: absolute; 
      top: 20px; 
      right: 20px; 
      width: 100px; 
      height: 140px; 
      border-radius: 12px;
      overflow: hidden;
      border: 2px solid white;
      background: #2d2d44;
    }
    #local-video video { width: 100%; height: 100%; object-fit: cover; }
    #remote-video video { width: 100%; height: 100%; object-fit: cover; }
    .placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 16px;
    }
    .connecting {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      text-align: center;
    }
  </style>
</head>
<body>
  <div id="videos">
    <div id="remote-video">
      <div class="connecting" id="status">Connecting...</div>
    </div>
    <div id="local-video"></div>
  </div>

  <script src="https://download.agora.io/sdk/release/AgoraRTC_N-4.20.0.js"></script>
  <script>
    const APP_ID = "${appId}";
    const CHANNEL = "${channelName}";
    const TOKEN = "${token}";
    const UID = ${uid};
    const IS_VIDEO = ${isVideo};

    let client;
    let localAudioTrack;
    let localVideoTrack;

    function sendMessage(type, data = {}) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...data }));
    }

    async function initAgora() {
      try {
        client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

        client.on("user-published", async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          
          if (mediaType === "video") {
            const remoteContainer = document.getElementById("remote-video");
            remoteContainer.innerHTML = "";
            user.videoTrack.play(remoteContainer);
          }
          
          if (mediaType === "audio") {
            user.audioTrack.play();
          }
          
          sendMessage("user-joined", { uid: user.uid });
          document.getElementById("status")?.remove();
        });

        client.on("user-unpublished", (user, mediaType) => {
          if (mediaType === "video") {
            const remoteContainer = document.getElementById("remote-video");
            remoteContainer.innerHTML = '<div class="placeholder">User camera off</div>';
          }
        });

        client.on("user-left", (user) => {
          sendMessage("user-left", { uid: user.uid });
          const remoteContainer = document.getElementById("remote-video");
          remoteContainer.innerHTML = '<div class="connecting">Call ended</div>';
        });

        // Join channel
        await client.join(APP_ID, CHANNEL, TOKEN, UID);

        // Create and publish local tracks
        localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        
        if (IS_VIDEO) {
          localVideoTrack = await AgoraRTC.createCameraVideoTrack();
          localVideoTrack.play(document.getElementById("local-video"));
          await client.publish([localAudioTrack, localVideoTrack]);
        } else {
          await client.publish([localAudioTrack]);
          document.getElementById("local-video").style.display = "none";
        }

        sendMessage("ready");
        document.getElementById("status").textContent = "Waiting for other user...";

      } catch (error) {
        console.error("Agora error:", error);
        sendMessage("error", { message: error.message });
      }
    }

    function toggleMute(muted) {
      if (localAudioTrack) {
        localAudioTrack.setEnabled(!muted);
      }
    }

    function toggleCamera(off) {
      if (localVideoTrack) {
        localVideoTrack.setEnabled(!off);
        document.getElementById("local-video").style.display = off ? "none" : "block";
      }
    }

    async function leaveChannel() {
      if (localAudioTrack) {
        localAudioTrack.close();
      }
      if (localVideoTrack) {
        localVideoTrack.close();
      }
      if (client) {
        await client.leave();
      }
      sendMessage("call-ended");
    }

    // Start
    initAgora();
  </script>
</body>
</html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        mediaCapturePermissionGrantType="grant"
      />
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#9C6ADE" />
          <Text style={styles.loadingText}>Connecting to call...</Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]} 
          onPress={toggleMute}
        >
          <Ionicons name={isMuted ? "mic-off" : "mic"} size={24} color="#FFF" />
        </TouchableOpacity>

        {isVideo && (
          <TouchableOpacity 
            style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]} 
            onPress={toggleCamera}
          >
            <Ionicons name={isCameraOff ? "videocam-off" : "videocam"} size={24} color="#FFF" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
          <Ionicons name="call" size={28} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  webview: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    marginTop: 16,
    fontSize: 16,
  },
  controls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  endCallBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E74C3C',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
