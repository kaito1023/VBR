# VBR - Android Studio ビルドガイド

## 🎯 概要

このガイドに従って、VBRをAndroid Studioでビルドし、USB接続した実機にインストールできます。

## ⚡ クイックスタート

### 1. Node.jsのインストール確認

```powershell
node --version
npm --version
```

表示されない場合は、[Node.js公式サイト](https://nodejs.org/)からLTS版をインストールしてください。

### 2. プロジェクトのクローンと準備

```powershell
git clone https://github.com/kaito1023/VBR.git
cd VBR/video-remote-app
npm install
```

### 3. ネイティブプロジェクトの生成

```powershell
npx expo prebuild --clean
```

これで`android/`フォルダが生成されます。

### 4. Android Studioで開く

1. Android Studioを起動
2. **Open** → `VBR/video-remote-app/android` を選択
3. Gradle同期が完了するまで待機

### 5. 実機接続とビルド

1. Android端末のUSBデバッグを有効化
2. USBケーブルでPCに接続
3. Android Studioのツールバーで実機を選択
4. **Run**ボタン（▶）をクリック

## 📖 詳細手順

詳しい手順は [ANDROID_BUILD.md](./ANDROID_BUILD.md) を参照してください。

## ✅ 現在のコードの状態

- ✅ **Expo設定**: Android Studio対応済み
- ✅ **パッケージ名**: `com.kaito1023.vbr`
- ✅ **権限設定**: 必要な権限を事前に設定済み
- ✅ **TFLiteモデル**: アセットバンドルに含まれる
- ✅ **.gitignore**: `android/`フォルダを追跡

## 🚀 ビルド後の動作確認

1. **接続画面**: Windows PCのIPアドレスを入力
2. **リモコン画面**: 動画をアップロード・再生制御
3. **背景除去画面**: 画像から背景を除去

## 問題が発生した場合

- [ANDROID_BUILD.md](./ANDROID_BUILD.md) のトラブルシューティングを参照
- [GitHub Issues](https://github.com/kaito1023/VBR/issues) で報告

---

**現在のコードはAndroid Studioでのビルドに完全対応しています！** 🎉
