#  Android Studio ビルドガイド

##  目的

React Nativeプロジェクトをクローンした後、Android Studioで開いてUSB接続された実機にビルドインストールする手順を説明します。

##  前提条件

- **Android Studio** がインストールされていること
- **JDK 17以上** がインストールされていること
- **Android SDK** がAndroid Studioでインストールされていること
- USBデバッグを有効にしたAndroid端末

##  手順

### 1 リポジトリのクローン

```bash
git clone https://github.com/kaito1023/VBR.git
cd VBR/video-remote-app
```

### 2 依存関係のインストール

```bash
npm install
```

### 3 Android Studioでプロジェクトを開く

1. **Android Studio** を起動
2. **Open** をクリック
3. `VBR/video-remote-app/android` フォルダを選択して開く
4. Gradle Syncが自動的に開始されるので、完了まで待つ

### 4 Android端末の準備

#### USB デバッグの有効化

1. Android端末の**設定**  **端末情報** を開く
2. **ビルド番号**を7回タップして開発者オプションを有効化
3. **設定**  **システム**  **開発者向けオプション** を開く
4. **USBデバッグ**をONにする

#### 端末を接続

1. USBケーブルでPCと端末を接続
2. 端末に「USBデバッグを許可しますか？」と表示されたら**許可**をタップ
3. Android Studioの上部ツールバーに端末名が表示されることを確認

### 5 Metro Bundlerの起動

別のターミナルでMetro Bundlerを起動します：

```bash
cd VBR/video-remote-app
npm start
```

### 6 ビルドと実行

#### 方法1: Android Studioから実行

1. Android Studioの上部ツールバーで接続した端末を選択
2. **Run** ボタン（）をクリック
3. ビルドが開始され、完了後にアプリが端末にインストールされて起動

#### 方法2: コマンドラインから実行

```bash
cd VBR/video-remote-app
npm run android
```

##  トラブルシューティング

### Gradle Sync エラー

- Android Studioで **File  Invalidate Caches** を実行して再起動
- `android/gradle.properties` の設定を確認

### デバイスが認識されない

```bash
adb devices
```

- 何も表示されない場合、USBドライバーを再インストール
- USBケーブルが充電専用でないか確認

### ビルドエラー

```bash
cd android
./gradlew clean
cd ..
npm run android
```

##  APKファイルの生成

リリース用APKを生成する場合：

```bash
cd android
./gradlew assembleRelease
```

生成されたAPKは `android/app/build/outputs/apk/release/` にあります。

##  パッケージ情報

- **Package Name**: `com.kaito1023.vbr`
- **App Name**: VBR (Video Background Removal)
- **Version**: 1.0.0

##  アプリの機能

1. **接続画面**: Windows画面アプリのIPアドレスを設定
2. **リモート画面**: 動画をアップロードして再生コントロール
3. **背景除去画面**: TensorFlow Liteで背景を白に置換（今後実装予定）

##  ヒント

- 初回ビルドは時間がかかります（5-10分）
- Metro Bundlerは常に起動しておく必要があります
- ホットリロード機能で、コード変更が即座に反映されます（端末をダブルタップして開発者メニュー  Reload）
