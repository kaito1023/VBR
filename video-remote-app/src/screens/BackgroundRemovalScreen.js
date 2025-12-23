import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function BackgroundRemovalScreen() {
  const [selectedImage, setSelectedImage] = useState(null);

  const handleSelectImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('権限エラー', '写真ライブラリへのアクセスを許可してください');
        return;
      }

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
    } catch (error) {
      Alert.alert('エラー', '画像の選択に失敗しました');
      console.error(error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.headerIcon}>🎨</Text>
        </View>
        <Text style={styles.title}>背景除去</Text>
        <Text style={styles.subtitle}>※ Android Studioビルド後に実装予定</Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.selectButton]}
          onPress={handleSelectImage}
        >
          <Text style={styles.buttonText}>📷 画像を選択</Text>
        </TouchableOpacity>

        {selectedImage && (
          <View style={styles.imageContainer}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>🖼 選択した画像</Text>
            </View>
            <Image source={{ uri: selectedImage }} style={styles.image} />
          </View>
        )}
      </View>

      <View style={styles.guideSection}>
        <Text style={styles.guideTitle}>📝 TensorFlow Lite機能について</Text>
        <Text style={styles.guideText}>
          背景除去機能は、Android Studioでビルド後にTensorFlow Liteライブラリを追加することで利用可能になります。
        </Text>
        <Text style={styles.guideText style={{marginTop: 12}}>
          現在は画像選択機能のみ実装されています。
        </Text>
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
    fontSize: 13,
    color: '#EF4444',
    marginBottom: 16,
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
    marginBottom: 16,
  },
  guideText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },
});
