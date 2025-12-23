import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Camera } from 'expo-camera';
import { Video } from 'expo-av';

export default function CameraScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [videoUri, setVideoUri] = useState(null);
  const cameraRef = useRef(null);

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const startRecording = async () => {
    if (cameraRef.current) {
      try {
        setIsRecording(true);
        const video = await cameraRef.current.recordAsync({
          maxDuration: 60,
        });
        setVideoUri(video.uri);
        setIsRecording(false);
      } catch (error) {
        console.error('Recording error:', error);
        setIsRecording(false);
        Alert.alert('エラー', '録画に失敗しました');
      }
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
    }
  };

  const processVideo = () => {
    if (videoUri) {
      navigation.navigate('BackgroundRemoval', { videoUri });
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>カメラへのアクセスを確認中...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>カメラへのアクセスが拒否されました</Text>
      </View>
    );
  }

  if (videoUri) {
    return (
      <SafeAreaView style={styles.container}>
        <Video
          source={{ uri: videoUri }}
          style={styles.video}
          useNativeControls
          isLooping
        />
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => setVideoUri(null)}
          >
            <Text style={styles.buttonText}>再撮影</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={processVideo}
          >
            <Text style={styles.buttonText}>背景除去へ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Camera style={styles.camera} ref={cameraRef} type={Camera.Constants.Type.back}>
        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording && styles.recordingButton,
            ]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <View
              style={[
                styles.recordButtonInner,
                isRecording && styles.recordingButtonInner,
              ]}
            />
          </TouchableOpacity>
          {isRecording && (
            <Text style={styles.recordingText}>● 録画中</Text>
          )}
        </View>
      </Camera>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  video: {
    flex: 1,
    width: '100%',
  },
  cameraControls: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff3b30',
  },
  recordingButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.5)',
  },
  recordingButtonInner: {
    borderRadius: 8,
  },
  recordingText: {
    color: '#ff3b30',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  controls: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#667eea',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
