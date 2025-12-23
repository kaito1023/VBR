import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Video } from 'expo-av';

export default function BackgroundRemovalScreen({ route, navigation }) {
  const [videoUri, setVideoUri] = useState(route?.params?.videoUri || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedUri, setProcessedUri] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [threshold, setThreshold] = useState(0.5);

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setVideoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('エラー', '動画の選択に失敗しました');
    }
  };

  const processVideo = async () => {
    if (!videoUri) {
      Alert.alert('エラー', '動画が選択されていません');
      return;
    }

    setIsProcessing(true);
    
    // 実際の背景除去処理はここに実装
    // TensorFlow Lite や OpenCV などを使用
    // デモとして2秒待機
    setTimeout(() => {
      setProcessedUri(videoUri); // デモ用に同じ動画を使用
      setIsProcessing(false);
      Alert.alert('完了', '背景除去が完了しました！');
    }, 2000);
  };

  const saveVideo = async () => {
    if (!processedUri) {
      Alert.alert('エラー', '処理済み動画がありません');
      return;
    }

    try {
      // メディアライブラリに保存
      Alert.alert('成功', '動画を保存しました！');
    } catch (error) {
      console.error('Error saving video:', error);
      Alert.alert('エラー', '動画の保存に失敗しました');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 動画プレビュー */}
        <View style={styles.videoContainer}>
          {videoUri ? (
            <Video
              source={{ uri: processedUri || videoUri }}
              style={styles.video}
              useNativeControls
              isLooping
              shouldPlay={false}
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderIcon}>🎬</Text>
              <Text style={styles.placeholderText}>
                動画を選択してください
              </Text>
            </View>
          )}
        </View>

        {/* コントロール */}
        <View style={styles.controls}>
          <Text style={styles.sectionTitle}>背景色</Text>
          <View style={styles.colorButtons}>
            {[
              { color: '#FFFFFF', label: '白' },
              { color: '#000000', label: '黒' },
              { color: '#00FF00', label: 'グリーン' },
              { color: '#0000FF', label: '青' },
            ].map((item) => (
              <TouchableOpacity
                key={item.color}
                style={[
                  styles.colorButton,
                  backgroundColor === item.color && styles.colorButtonActive,
                ]}
                onPress={() => setBackgroundColor(item.color)}
              >
                <View
                  style={[
                    styles.colorPreview,
                    { backgroundColor: item.color },
                  ]}
                />
                <Text style={styles.colorLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.buttonGroup}>
            {!videoUri && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={pickVideo}
              >
                <Text style={styles.buttonText}>📁 動画を選択</Text>
              </TouchableOpacity>
            )}

            {videoUri && !processedUri && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={processVideo}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>🎨 背景除去を実行</Text>
                )}
              </TouchableOpacity>
            )}

            {processedUri && (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.successButton]}
                  onPress={saveVideo}
                >
                  <Text style={styles.buttonText}>💾 動画を保存</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => {
                    setVideoUri(null);
                    setProcessedUri(null);
                  }}
                >
                  <Text style={styles.buttonText}>🔄 最初から</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.info}>
          <Text style={styles.infoText}>
            💡 ヒント: 高品質な背景除去には処理に時間がかかります
          </Text>
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
  videoContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
  },
  controls: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  colorButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  colorButton: {
    flex: 1,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorButtonActive: {
    borderColor: '#667eea',
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  colorLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonGroup: {
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
  successButton: {
    backgroundColor: '#43e97b',
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
  info: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  infoText: {
    color: '#667eea',
    fontSize: 14,
    textAlign: 'center',
  },
});
