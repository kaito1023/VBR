import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import TFLiteService from '../services/TFLiteService';

export default function BackgroundRemovalScreen() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [segmentationResult, setSegmentationResult] = useState(null);

  // モデルをロード
  useEffect(() => {
    loadModel();
  }, []);

  const loadModel = async () => {
    setLoading(true);
    try {
      await TFLiteService.loadModel();
      setModelLoaded(true);
      Alert.alert('成功', 'モデルのロードが完了しました');
    } catch (error) {
      Alert.alert('エラー', error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectImage = async () => {
    try {
      // 権限確認
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('権限エラー', '写真ライブラリへのアクセスを許可してください');
        return;
      }

      // 画像を選択
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled) {
        return;
      }

      const imageUri = result.assets[0].uri;
      setSelectedImage(imageUri);
      setProcessedImage(null);
      setSegmentationResult(null);

      console.log('Selected image:', imageUri);
    } catch (error) {
      Alert.alert('エラー', '画像の選択に失敗しました');
      console.error(error);
    }
  };

  const handleSegmentImage = async () => {
    if (!selectedImage) {
      Alert.alert('エラー', '画像を選択してください');
      return;
    }

    if (!modelLoaded) {
      Alert.alert('エラー', 'モデルがロードされていません');
      return;
    }

    setLoading(true);
    try {
      // セグメンテーション実行
      const result = await TFLiteService.segmentImage(selectedImage);
      setSegmentationResult(result);

      // 背景を白に置き換え
      const processed = await TFLiteService.applyWhiteBackground(
        selectedImage,
        result.maskData
      );
      setProcessedImage(processed);

      Alert.alert('成功', '背景除去が完了しました');
    } catch (error) {
      Alert.alert('エラー', error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.headerIcon}>🎨</Text>
        </View>
        <Text style={styles.title}>背景除去</Text>
        <Text style={styles.subtitle}>TensorFlow Lite</Text>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: modelLoaded ? '#10B981' : '#EF4444' },
            ]}
          />
          <Text style={styles.statusText}>
            {modelLoaded ? '✓ モデル準備完了' : '○ モデル未ロード'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.selectButton]}
          onPress={handleSelectImage}
          disabled={loading}
        >
          <Text style={styles.buttonText}>📷 画像を選択</Text>
        </TouchableOpacity>

        {selectedImage && (
          <View style={styles.imageContainer}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>🖼 元画像</Text>
            </View>
            <Image source={{ uri: selectedImage }} style={styles.image} />
          </View>
        )}
      </View>

      {selectedImage && (
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.processButton,
              !modelLoaded && styles.buttonDisabled,
            ]}
            onPress={handleSegmentImage}
            disabled={loading || !modelLoaded}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>✨ 背景を除去</Text>
            )}
          </TouchableOpacity>

          {segmentationResult && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>📊 セグメンテーション情報</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>マスクサイズ:</Text>
                <Text style={styles.infoValue}>
                  {segmentationResult.width} × {segmentationResult.height}
                </Text>
              </View>
            </View>
          )}

          {processedImage && (
            <View style={styles.imageContainer}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>✨ 処理後（背景白化）</Text>
              </View>
              <Image source={{ uri: processedImage }} style={styles.image} />
            </View>
          )}
        </View>
      )}

      {!selectedImage && (
        <View style={styles.guideSection}>
          <Text style={styles.guideTitle}>📝 使い方</Text>
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>画像を選択ボタンから人物画像を選択</Text>
          </View>
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>背景を除去ボタンをタップ</Text>
          </View>
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>処理結果を確認（背景が白になります）</Text>
          </View>
        </View>
      )}
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
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    marginBottom: 12,
  },
  headerIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
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
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectButton: {
    backgroundColor: '#3B82F6',
  },
  processButton: {
    backgroundColor: '#10B981',
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
  imageContainer: {
    marginVertical: 16,
  },
  labelContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoBox: {
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 12,
    marginVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '700',
  },
  guideSection: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    margin: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    paddingTop: 6,
  },
});
