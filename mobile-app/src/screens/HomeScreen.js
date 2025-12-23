import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen({ navigation }) {
  const menuItems = [
    {
      id: 'camera',
      title: 'カメラ撮影',
      description: '動画を撮影して背景を除去',
      icon: '📹',
      screen: 'Camera',
      gradient: ['#667eea', '#764ba2'],
    },
    {
      id: 'background',
      title: '背景除去',
      description: '既存の動画の背景を除去',
      icon: '🎨',
      screen: 'BackgroundRemoval',
      gradient: ['#f093fb', '#f5576c'],
    },
    {
      id: 'remote',
      title: 'リモート操作',
      description: 'PCに接続して操作',
      icon: '🎮',
      screen: 'RemoteControl',
      gradient: ['#4facfe', '#00f2fe'],
    },
    {
      id: 'settings',
      title: '設定',
      description: 'アプリの設定を変更',
      icon: '⚙️',
      screen: 'Settings',
      gradient: ['#43e97b', '#38f9d7'],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.logo}>VBR</Text>
          <Text style={styles.subtitle}>Video Background Removal</Text>
          <Text style={styles.description}>
            動画の背景を除去して、リモートで操作できるアプリ
          </Text>
        </View>

        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItemContainer}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={item.gradient}
                style={styles.menuItem}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Version 1.0.0</Text>
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
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  logo: {
    fontSize: 56,
    fontWeight: '900',
    color: '#667eea',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 2,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  menuGrid: {
    gap: 16,
  },
  menuItemContainer: {
    marginBottom: 16,
  },
  menuItem: {
    padding: 24,
    borderRadius: 16,
    minHeight: 140,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  menuDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
  },
});
