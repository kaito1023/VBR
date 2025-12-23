# Android Studio でのビルド手順

このドキュメントでは、VBR Mobile RemoteアプリをAndroid Studioでビルドし、実機にインストールする手順を説明します。

## 📋 前提条件

### 必須ソフトウェア

1. **Node.js** (v16以上)
   - [公式サイト](https://nodejs.org/)からダウンロード
   - インストール後、PowerShellを再起動

2. **Android Studio**
   - [公式サイト](https://developer.android.com/studio)からダウンロード
   - Android SDK、NDK、CMakeをインストール

3. **Java JDK** (v17推奨)
   - Android Studioに同梱されているものを使用可能

### 環境変数の設定

PowerShellで環境変数を設定：

```powershell
# ANDROID_HOME
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")

# JAVA_HOME (Android Studio付属のJDKを使用する場合)
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Android\Android Studio\jbr", "User")

# PowerShellを再起動して反映
```

## 🔧 ネイティブプロジェクトの生成

### Step 1: 依存関係のインストール

```powershell
cd "C:\Users\kaito\OneDrive\デスクトップ\開発\VBR\video-remote-app"
npm install
```

### Step 2: Expo Prebuild の実行

```powershell
npx expo prebuild --clean
```

このコマンドで以下が生成されます：
- `android/` フォルダ（Androidネイティブプロジェクト）
- `ios/` フォルダ（iOSネイティブプロジェクト）

**注意**: `--clean`オプションは既存のネイティブフォルダを削除してから再生成します。

## 🏗 Android Studio でのビルド

### Step 1: プロジェクトを開く

1. **Android Studio**を起動
2. **File → Open**
3. `C:\Users\kaito\OneDrive\デスクトップ\開発\VBR\video-remote-app\android` フォルダを選択
4. **OK**をクリック

### Step 2: Gradleの同期

- Android Studioが自動的にGradle同期を開始します
- 初回は数分かかる場合があります
- エラーが出た場合は、**File → Sync Project with Gradle Files**

### Step 3: Android実機の準備

#### 実機の設定

1. **開発者向けオプション**を有効化
   - 設定 → デバイス情報 → ビルド番号を7回タップ
   
2. **USBデバッグ**を有効化
   - 設定 → システム → 開発者向けオプション → USBデバッグ

3. **USBケーブル**でPCに接続

4. **接続確認**
   ```powershell
   adb devices
   ```
   デバイスが表示されればOK

### Step 4: ビルドと実行

#### 方法1: Android Studio UI から

1. ツールバーのデバイス選択で実機を選択
2. **Run** ボタン（緑の▶）をクリック
3. アプリが自動的にビルド→インストール→起動

#### 方法2: コマンドラインから

```powershell
cd "C:\Users\kaito\OneDrive\デスクトップ\開発\VBR\video-remote-app"

# 実機でビルド・実行
npx expo run:android --device

# または、Gradleを直接使用
cd android
.\gradlew assembleDebug
.\gradlew installDebug
```

## 📦 APK の生成

### Debug APK（開発用）

```powershell
cd android
.\gradlew assembleDebug
```

生成場所: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK（本番用）

1. **キーストアの作成**（初回のみ）
   ```powershell
   keytool -genkeypair -v -storetype PKCS12 -keystore vbr-release-key.keystore -alias vbr-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **gradle.properties を編集**
   `android/gradle.properties`に追加：
   ```properties
   MYAPP_RELEASE_STORE_FILE=vbr-release-key.keystore
   MYAPP_RELEASE_KEY_ALIAS=vbr-key-alias
   MYAPP_RELEASE_STORE_PASSWORD=your_password
   MYAPP_RELEASE_KEY_PASSWORD=your_password
   ```

3. **Release ビルド**
   ```powershell
   cd android
   .\gradlew assembleRelease
   ```

生成場所: `android/app/build/outputs/apk/release/app-release.apk`

## 🐛 トラブルシューティング

### エラー: "SDK location not found"

**解決策**:
```powershell
echo "sdk.dir=$env:LOCALAPPDATA\Android\Sdk" > android\local.properties
```

### エラー: "INSTALL_FAILED_UPDATE_INCOMPATIBLE"

既存のアプリとの署名の不一致です。

**解決策**:
```powershell
adb uninstall com.kaito1023.vbr
```

その後、再度インストール。

### エラー: Gradle build failed

**解決策**:
```powershell
cd android
.\gradlew clean
.\gradlew assembleDebug
```

### Metro Bundler のエラー

**解決策**:
```powershell
# キャッシュをクリア
npx expo start -c

# または
npx react-native start --reset-cache
```

### TFLite モデルが読み込めない

**解決策**:

`android/app/build.gradle`に以下を追加：
```gradle
android {
    ...
    aaptOptions {
        noCompress "tflite"
        noCompress "lite"
    }
}
```

## 📱 初回起動時の確認事項

1. **ネットワーク接続**: Wi-Fiに接続されているか
2. **権限の許可**: 
   - 写真ライブラリへのアクセス
   - ネットワークへのアクセス
3. **Windows PCのIPアドレス**: デスクトップアプリで確認

## 🔄 コード変更後の再ビルド

```powershell
# JavaScriptのみ変更した場合（ホットリロード）
# → 自動的に反映されます

# ネイティブコード（Java/Kotlin）を変更した場合
cd android
.\gradlew assembleDebug
.\gradlew installDebug
```

## 📖 参考リソース

- [Expo Prebuild](https://docs.expo.dev/workflow/prebuild/)
- [React Native Environment Setup](https://reactnative.dev/docs/environment-setup)
- [Android Studio User Guide](https://developer.android.com/studio/intro)

---

問題が発生した場合は、エラーメッセージをGitHub Issuesに報告してください。
