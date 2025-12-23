import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Progress from 'react-native-progress';
import socketManager from '../utils/socket';
import { uploadVideo } from '../utils/api';

export default function RemoteScreen({ route, navigation }) {
  const { ip } = route.params;

  const [connected, setConnected] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);

  useEffect(() => {
    // WebSocket接続状態の監視
    const handleConnectionChange = (isConnected) => {
      setConnected(isConnected);

      if (!isConnected) {
        Alert.alert(
          '接続が切れました',
          'WebSocketサーバーとの接続が切断されました。',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
    };

    socketManager.onConnectionChange(handleConnectionChange);

    // 初期接続状態を設定
    setConnected(socketManager.isConnected());

    // クリーンアップ
    return () => {
      socketManager.offConnectionChange(handleConnectionChange);
    };
  }, [navigation]);

  const handleSelectVideo = async () => {
    try {
      // 権限確認
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('権限エラー', '写真ライブラリへのアクセスを許可してください');
        return;
      }

      // 動画を選択
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
      });

      console.log('ImagePicker result:', result);

      if (result.canceled) {
        console.log('User cancelled video selection');
        return;
      }

      const selectedFile = result.assets[0];
      console.log('Selected video:', selectedFile);

      // ファイル情報を整形
      const videoInfo = {
        uri: selectedFile.uri,
        name: selectedFile.fileName || `video_${Date.now()}.mp4`,
        type: selectedFile.type || 'video/mp4',
        size: selectedFile.fileSize || 0,
      };

      setSelectedVideo(videoInfo);
      setUploadComplete(false);
    } catch (error) {
      Alert.alert('エラー', '動画の選択に失敗しました');
      console.error('ImagePicker error:', error);
    }
  };

  const handleUploadVideo = async () => {
    if (!selectedVideo) {
      Alert.alert('エラー', '動画を選択してください');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadVideo(
        ip,
        selectedVideo,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      if (result.success) {
        setUploadComplete(true);
        Alert.alert('成功', '動画の送信が完了しました');
      } else {
        Alert.alert('エラー', result.error);
      }
    } catch (error) {
      Alert.alert('エラー', '動画の送信中にエラーが発生しました');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handlePlay = () => {
    if (!connected) {
      Alert.alert('エラー', 'WebSocketに接続されていません');
      return;
    }
    socketManager.emitPlay();
  };

  const handlePause = () => {
    if (!connected) {
      Alert.alert('エラー', 'WebSocketに接続されていません');
      return;
    }
    socketManager.emitPause();
  };

  const handleStop = () => {
    if (!connected) {
      Alert.alert('エラー', 'WebSocketに接続されていません');
      return;
    }
    socketManager.emitStop();
  };

  const handleDisconnect = () => {
    Alert.alert(
      '切断',
      '接続を切断しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '切断',
          style: 'destructive',
          onPress: () => {
            socketManager.disconnect();
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleOpenBackgroundRemoval = () => {
    navigation.navigate('BackgroundRemoval');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.connectionStatus}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: connected ? '#10B981' : '#EF4444' }
            ]}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.ipText}>{ip}</Text>
            <Text style={styles.statusText}>
              {connected ? '✓ 接続中' : '✗ 切断'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📹 動画選択</Text>

        <TouchableOpacity
          style={[styles.button, styles.selectButton]}
          onPress={handleSelectVideo}
          disabled={Boolean(uploading)}
        >
          <Text style={styles.buttonText}>
            {selectedVideo ? '📝 動画を変更' : '📂 動画を選択'}
          </Text>
        </TouchableOpacity>

        {selectedVideo && (
          <View style={styles.videoInfo}>
            <Text style={styles.videoLabel}>選択中:</Text>
            <Text style={styles.videoName} numberOfLines={1}>
              {selectedVideo.name}
            </Text>
            <Text style={styles.videoSize}>
              💾 {(selectedVideo.size / 1024 / 1024).toFixed(2)} MB
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📤 動画送信</Text>

        <TouchableOpacity
          style={[
            styles.button,
            styles.uploadButton,
            !selectedVideo && styles.buttonDisabled
          ]}
          onPress={handleUploadVideo}
          disabled={Boolean(!selectedVideo || uploading)}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>🚀 PCに送信</Text>
          )}
        </TouchableOpacity>

        {uploading && (
          <View style={styles.progressContainer}>
            <Progress.Bar
              progress={uploadProgress / 100}
              width={null}
              height={12}
              color="#6366F1"
              unfilledColor="#E5E7EB"
              borderWidth={0}
              borderRadius={6}
            />
            <Text style={styles.progressText}>📊 {uploadProgress.toFixed(0)}%</Text>
          </View>
        )}

        {uploadComplete && !uploading && (
          <View style={styles.successBadge}>
            <Text style={styles.successText}>✓ 送信完了</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎮 再生制御</Text>

        <View style={styles.controlButtons}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              styles.playButton,
              !uploadComplete && styles.buttonDisabled
            ]}
            onPress={handlePlay}
            disabled={Boolean(!uploadComplete || !connected)}
          >
            <Text style={styles.controlButtonText}>▶️</Text>
            <Text style={styles.controlLabel}>再生</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              styles.pauseButton,
              !uploadComplete && styles.buttonDisabled
            ]}
            onPress={handlePause}
            disabled={Boolean(!uploadComplete || !connected)}
          >
            <Text style={styles.controlButtonText}>⏸</Text>
            <Text style={styles.controlLabel}>一時停止</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              styles.stopButton,
              !uploadComplete && styles.buttonDisabled
            ]}
            onPress={handleStop}
            disabled={Boolean(!uploadComplete || !connected)}
          >
            <Text style={styles.controlButtonText}>⏹</Text>
            <Text style={styles.controlLabel}>停止</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎨 その他の機能</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.backgroundRemovalButton]}
          onPress={handleOpenBackgroundRemoval}
        >
          <Text style={styles.buttonText}>🖼 背景除去</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.disconnectButton]}
        onPress={handleDisconnect}
      >
        <Text style={styles.buttonText}>🔌 切断</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>VBR v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  ipText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectButton: {
    backgroundColor: '#3B82F6',
  },
  uploadButton: {
    backgroundColor: '#F59E0B',
  },
  backgroundRemovalButton: {
    backgroundColor: '#8B5CF6',
  },
  disconnectButton: {
    backgroundColor: '#EF4444',
    marginHorizontal: 20,
    marginVertical: 16,
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  videoInfo: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
    marginTop: 8,
  },
  videoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '600',
  },
  videoName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  videoSize: {
    fontSize: 13,
    color: '#6B7280',
  },
  progressContainer: {
    marginTop: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '600',
  },
  successBadge: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    alignItems: 'center',
  },
  successText: {
    color: '#065F46',
    fontSize: 14,
    fontWeight: '700',
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  controlButton: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  playButton: {
    backgroundColor: '#10B981',
  },
  pauseButton: {
    backgroundColor: '#F59E0B',
  },
  stopButton: {
    backgroundColor: '#EF4444',
  },
  controlButtonText: {
    fontSize: 28,
    marginBottom: 4,
  },
  controlLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
