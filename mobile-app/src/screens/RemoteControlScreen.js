import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import io from 'socket.io-client';
import * as DocumentPicker from 'expo-document-picker';
import * as Progress from 'react-native-progress';

export default function RemoteControlScreen({ navigation }) {
  const [ipAddress, setIpAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadSavedIP();
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const loadSavedIP = async () => {
    try {
      const saved = await AsyncStorage.getItem('serverIP');
      if (saved) {
        setIpAddress(saved);
      }
    } catch (error) {
      console.error('Error loading IP:', error);
    }
  };

  const saveIP = async (ip) => {
    try {
      await AsyncStorage.setItem('serverIP', ip);
    } catch (error) {
      console.error('Error saving IP:', error);
    }
  };

  const testConnection = async () => {
    if (!ipAddress) {
      Alert.alert('エラー', 'IPアドレスを入力してください');
      return;
    }

    try {
      const response = await axios.get(`http://${ipAddress}:3000/health`, {
        timeout: 5000,
      });
      
      if (response.data.status === 'ok') {
        Alert.alert('成功', 'サーバーに接続できました！');
        return true;
      }
    } catch (error) {
      Alert.alert('エラー', 'サーバーに接続できませんでした');
      return false;
    }
  };

  const connect = async () => {
    if (await testConnection()) {
      const newSocket = io(`http://${ipAddress}:3000`, {
        transports: ['websocket'],
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
        setSocket(newSocket);
        saveIP(ipAddress);
        Alert.alert('成功', 'リモート接続しました！');
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        Alert.alert('エラー', '接続エラーが発生しました');
      });
    }
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  };

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setVideoFile(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('エラー', '動画の選択に失敗しました');
    }
  };

  const uploadVideo = async () => {
    if (!videoFile) {
      Alert.alert('エラー', '動画を選択してください');
      return;
    }

    if (!ipAddress) {
      Alert.alert('エラー', 'IPアドレスを入力してください');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('video', {
        uri: videoFile.uri,
        type: 'video/mp4',
        name: videoFile.name,
      });

      const response = await axios.post(
        `http://${ipAddress}:3000/upload-video`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const progress = progressEvent.loaded / progressEvent.total;
            setUploadProgress(progress);
          },
        }
      );

      setIsUploading(false);
      Alert.alert('成功', '動画をアップロードしました！');
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      Alert.alert('エラー', '動画のアップロードに失敗しました');
    }
  };

  const sendCommand = (command) => {
    if (!socket || !isConnected) {
      Alert.alert('エラー', 'サーバーに接続されていません');
      return;
    }
    socket.emit(command);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 接続設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>サーバー接続</Text>
          <TextInput
            style={styles.input}
            placeholder="192.168.x.x"
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
            value={ipAddress}
            onChangeText={setIpAddress}
            keyboardType="numeric"
            editable={!isConnected}
          />
          <View style={styles.connectionStatus}>
            <View
              style={[
                styles.statusDot,
                isConnected && styles.statusDotActive,
              ]}
            />
            <Text style={styles.statusText}>
              {isConnected ? '接続中' : '未接続'}
            </Text>
          </View>
          {!isConnected ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { flex: 1 }]}
                onPress={testConnection}
              >
                <Text style={styles.buttonText}>テスト</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { flex: 2 }]}
                onPress={connect}
              >
                <Text style={styles.buttonText}>接続</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={disconnect}
            >
              <Text style={styles.buttonText}>切断</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 動画アップロード */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>動画アップロード</Text>
          {videoFile && (
            <View style={styles.fileInfo}>
              <Text style={styles.fileName}>{videoFile.name}</Text>
              <Text style={styles.fileSize}>
                {(videoFile.size / 1024 / 1024).toFixed(2)} MB
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={pickVideo}
            disabled={isUploading}
          >
            <Text style={styles.buttonText}>📁 動画を選択</Text>
          </TouchableOpacity>
          {videoFile && (
            <>
              {isUploading && (
                <View style={styles.progressContainer}>
                  <Progress.Bar
                    progress={uploadProgress}
                    width={null}
                    height={8}
                    color="#667eea"
                    borderRadius={4}
                  />
                  <Text style={styles.progressText}>
                    {Math.round(uploadProgress * 100)}%
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={uploadVideo}
                disabled={isUploading}
              >
                <Text style={styles.buttonText}>
                  {isUploading ? 'アップロード中...' : '📤 動画を送信'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* 再生コントロール */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>再生コントロール</Text>
          <View style={styles.controlButtons}>
            <TouchableOpacity
              style={[styles.controlButton, styles.playButton]}
              onPress={() => sendCommand('play')}
              disabled={!isConnected}
            >
              <Text style={styles.controlButtonText}>▶</Text>
              <Text style={styles.controlButtonLabel}>再生</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, styles.pauseButton]}
              onPress={() => sendCommand('pause')}
              disabled={!isConnected}
            >
              <Text style={styles.controlButtonText}>⏸</Text>
              <Text style={styles.controlButtonLabel}>一時停止</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={() => sendCommand('stop')}
              disabled={!isConnected}
            >
              <Text style={styles.controlButtonText}>⏹</Text>
              <Text style={styles.controlButtonLabel}>停止</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 12,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6b7280',
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: '#4ade80',
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
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
  dangerButton: {
    backgroundColor: '#f5576c',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  fileInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  fileName: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 4,
  },
  fileSize: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  progressContainer: {
    marginVertical: 16,
  },
  progressText: {
    color: '#667eea',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  playButton: {
    backgroundColor: '#43e97b',
  },
  pauseButton: {
    backgroundColor: '#f093fb',
  },
  stopButton: {
    backgroundColor: '#f5576c',
  },
  controlButtonText: {
    fontSize: 32,
    marginBottom: 8,
  },
  controlButtonLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
