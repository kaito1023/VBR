import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { testConnection, validateIP } from '../utils/api';
import socketManager from '../utils/socket';

const IP_STORAGE_KEY = '@video_remote_ip';

export default function ConnectionScreen({ navigation }) {
  const [ip, setIp] = useState('');
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // 前回のIPアドレスを読み込み
  useEffect(() => {
    loadSavedIP();
  }, []);

  const loadSavedIP = async () => {
    try {
      const savedIP = await AsyncStorage.getItem(IP_STORAGE_KEY);
      if (savedIP) {
        setIp(savedIP);
      }
    } catch (error) {
      console.error('Failed to load IP:', error);
    }
  };

  const saveIP = async (ipAddress) => {
    try {
      await AsyncStorage.setItem(IP_STORAGE_KEY, ipAddress);
    } catch (error) {
      console.error('Failed to save IP:', error);
    }
  };

  const handleTestConnection = async () => {
    if (!ip.trim()) {
      Alert.alert('エラー', 'IPアドレスを入力してください');
      return;
    }

    if (!validateIP(ip)) {
      Alert.alert('エラー', '正しいIPアドレス形式で入力してください\n例: 192.168.1.100');
      return;
    }

    setTesting(true);

    try {
      const isConnected = await testConnection(ip);

      if (isConnected) {
        Alert.alert('成功', 'サーバーに接続できました');
        saveIP(ip);
      } else {
        Alert.alert(
          '接続失敗',
          'サーバーに接続できません。\nIPアドレスとサーバーの起動状態を確認してください。'
        );
      }
    } catch (error) {
      Alert.alert('エラー', error.message);
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!ip.trim()) {
      Alert.alert('エラー', 'IPアドレスを入力してください');
      return;
    }

    if (!validateIP(ip)) {
      Alert.alert('エラー', '正しいIPアドレス形式で入力してください');
      return;
    }

    setConnecting(true);

    try {
      // HTTP接続テスト
      const httpConnected = await testConnection(ip);

      if (!httpConnected) {
        Alert.alert(
          '接続失敗',
          'HTTPサーバーに接続できません。\nサーバーが起動しているか確認してください。'
        );
        setConnecting(false);
        return;
      }

      // WebSocket接続
      await socketManager.connect(ip);

      // IPアドレスを保存
      saveIP(ip);

      // リモコン画面に遷移
      navigation.navigate('Remote', { ip });

    } catch (error) {
      Alert.alert('接続失敗', error.message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>📺</Text>
          <Text style={styles.title}>VBR</Text>
          <Text style={styles.subtitle}>Video Background Removal Remote</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>📍 IPアドレス</Text>
          <TextInput
            style={styles.input}
            placeholder="例: 192.168.1.100"
            placeholderTextColor="#9CA3AF"
            value={ip}
            onChangeText={setIp}
            keyboardType="numeric"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            💡 Windows PCに表示されているIPアドレスを入力
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.testButton, (testing || connecting) && styles.buttonDisabled]}
          onPress={handleTestConnection}
          disabled={Boolean(testing || connecting)}
        >
          {testing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>🔍 接続テスト</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.connectButton, (testing || connecting) && styles.buttonDisabled]}
          onPress={handleConnect}
          disabled={Boolean(testing || connecting)}
        >
          {connecting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>🚀 接続開始</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📋 接続手順</Text>
          <View style={styles.stepContainer}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>Windows PCでアプリを起動</Text>
          </View>
          <View style={styles.stepContainer}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>表示されたIPアドレスを入力</Text>
          </View>
          <View style={styles.stepContainer}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>接続テストで疎通確認</Text>
          </View>
          <View style={styles.stepContainer}>
            <Text style={styles.stepNumber}>4</Text>
            <Text style={styles.stepText}>接続開始ボタンをタップ</Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  hint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    lineHeight: 18,
  },
  button: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  testButton: {
    backgroundColor: '#3B82F6',
  },
  connectButton: {
    backgroundColor: '#10B981',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoBox: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    marginTop: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
});
