# GitHubへのアップロードとAndroid Studioでのビルド手順

このドキュメントでは、VBRプロジェクトをGitHubにアップロードし、Android Studioでビルドしてスマホにインストールする手順を説明します。

## 📋 目次

1. [GitHubにアップロード](#1-githubにアップロード)
2. [Android Studioでのビルド](#2-android-studioでのビルド)
3. [スマホへのインストール](#3-スマホへのインストール)

---

## 1. GitHubにアップロード

### 1.1 GitHubアカウントの準備

1. [GitHub](https://github.com/)にアクセス
2. アカウントがない場合は新規登録
3. ログイン

### 1.2 新しいリポジトリの作成

1. GitHubで右上の「+」→「New repository」をクリック
2. リポジトリ情報を入力:
   - **Repository name**: `VBR`
   - **Description**: `Video Background Removal & Remote Control App`
   - **Public** または **Private** を選択
   - **Initialize this repository with:** は全てチェックしない
3. 「Create repository」をクリック

### 1.3 ローカルリポジトリの初期化とプッシュ

PowerShellまたはコマンドプロンプトで以下を実行：

```powershell
# VBRディレクトリに移動
cd "C:\Users\kaito\OneDrive\デスクトップ\開発\VBR"

# Gitリポジトリを初期化
git init

# すべてのファイルをステージング
git add .

# 初回コミット
git commit -m "Initial commit: VBR Desktop and Mobile App"

# GitHubのリポジトリと接続（your-usernameを実際のユーザー名に変更）
git remote add origin https://github.com/your-username/VBR.git

# メインブランチにプッシュ
git branch -M main
git push -u origin main
```

### 1.4 アップロード完了の確認

1. GitHubでリポジトリページを更新
2. ファイルが正しくアップロードされているか確認
3. `GITHUB_README.md` の内容をコピーして `README.md` に貼り付け（オプション）

---

## 2. Android Studioでのビルド

### 2.1 事前準備

#### 必要なソフトウェア

1. **Android Studio** をインストール
   - [Android Studio公式サイト](https://developer.android.com/studio)からダウンロード
   - インストール時に Android SDK も自動的にインストールされます

2. **Java JDK 11以上** をインストール（Android Studio に含まれる場合がある）

#### Expo EAS CLIのインストール

PowerShellで以下を実行：

```powershell
npm install -g eas-cli
```

### 2.2 Expoアカウントの作成（初回のみ）

```powershell
# EASにログイン
eas login
```

アカウントがない場合は、[Expo公式サイト](https://expo.dev/)で作成してください。

### 2.3 モバイルアプリのビルド準備

```powershell
cd mobile-app

# 依存関係をインストール
npm install

# プロジェクトを初期化
eas build:configure
```

### 2.4 ビルド方法の選択

#### 方法A: EAS Build（クラウドビルド - 推奨）

**利点**: ローカルにAndroid開発環境が不要、簡単

```powershell
# APKをビルド（テスト用）
eas build --platform android --profile preview

# ビルドが完了したらAPKをダウンロード
```

ビルドが完了すると、Expoのウェブサイトからダウンロードリンクが提供されます。

#### 方法B: ローカルビルド

**利点**: 完全なコントロール、オフラインでビルド可能

##### Step 1: Androidフォルダを生成

```powershell
cd mobile-app

# Androidプロジェクトを生成
npx expo prebuild
```

これで `android` フォルダが作成されます。

##### Step 2: Android Studioで開く

1. Android Studioを起動
2. 「Open」をクリック
3. `mobile-app/android` フォルダを選択
4. 「OK」をクリック

##### Step 3: Gradleの同期

1. Android Studioが自動的にGradleを同期
2. エラーが出る場合は、指示に従って解決
3. 同期完了まで待機（初回は時間がかかる）

##### Step 4: ビルド

Android Studioで：

1. メニュー → **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. ビルドが完了するまで待機（数分かかる）
3. ビルド完了後、通知が表示される
4. 「locate」をクリックして APK ファイルの場所を開く

APKは以下の場所に生成されます：
```
mobile-app/android/app/build/outputs/apk/debug/app-debug.apk
```

#### 方法C: コマンドラインから直接ビルド

```powershell
cd mobile-app

# Androidアプリをビルドして起動
npx expo run:android
```

※実機またはエミュレータが接続されている必要があります。

---

## 3. スマホへのインストール

### 3.1 開発者オプションの有効化

Androidスマートフォンで：

1. **設定** → **デバイス情報** → **ビルド番号** を7回タップ
2. 「開発者になりました」と表示される
3. **設定** → **システム** → **開発者向けオプション**
4. **USBデバッグ** をONにする

### 3.2 インストール方法

#### 方法A: APKファイルから直接インストール

1. ビルドしたAPKファイル（`app-debug.apk`）をスマートフォンに転送
   - USBケーブルで接続してコピー
   - Google Driveなどでアップロードしてダウンロード
   - メールで送信

2. スマートフォンで APK ファイルをタップ

3. 「提供元不明のアプリ」のインストール許可を求められる場合：
   - **設定** → **セキュリティ** → **提供元不明のアプリ**
   - ファイルマネージャーアプリに許可を与える

4. 「インストール」をタップ

5. インストール完了後、「開く」をタップして起動

#### 方法B: Android Studioから直接インストール

1. スマートフォンをUSBケーブルでPCに接続

2. スマートフォンでUSBデバッグを許可

3. Android Studioで：
   - 上部のデバイス選択ドロップダウンから接続したスマートフォンを選択
   - 緑色の「Run」ボタン（▶）をクリック

4. アプリが自動的にビルドされ、スマートフォンにインストールされる

#### 方法C: adbコマンドでインストール

```powershell
# スマートフォンが認識されているか確認
adb devices

# APKをインストール
adb install "mobile-app\android\app\build\outputs\apk\debug\app-debug.apk"
```

---

## 4. トラブルシューティング

### Git関連

#### Gitがインストールされていない

```powershell
# Gitをインストール
winget install Git.Git
```

#### プッシュ時の認証エラー

1. Personal Access Token (PAT) を使用
   - GitHub → Settings → Developer settings → Personal access tokens
   - 「Generate new token」でトークンを作成
   - パスワードの代わりにトークンを使用

### Android Studio関連

#### Gradleの同期エラー

```powershell
# Gradleのキャッシュをクリア
cd mobile-app/android
./gradlew clean

# または
cd mobile-app
npx expo prebuild --clean
```

#### JDKが見つからない

Android Studio → File → Project Structure → SDK Location → JDK location を確認

#### ビルドエラー「INSTALL_FAILED_UPDATE_INCOMPATIBLE」

古いバージョンがインストールされている場合：

```powershell
adb uninstall com.vbr.mobile
```

その後、再度インストール。

### スマートフォン関連

#### USBデバッグが認識されない

1. USBケーブルを変更（データ転送対応のもの）
2. USB接続モードを「ファイル転送」に変更
3. PCを再起動

#### APKがインストールできない

1. セキュリティ設定を確認
2. ストレージ容量を確認
3. 既存のアプリをアンインストールしてから再度試す

---

## 5. 次のステップ

### アプリの使用

1. **デスクトップアプリを起動**
   - Windows PCで `npm start`
   - 表示されたIPアドレスをメモ

2. **モバイルアプリで接続**
   - アプリを起動
   - 「リモート操作」をタップ
   - IPアドレスを入力して接続

3. **動画を撮影・処理**
   - カメラで動画を撮影
   - 背景除去を実行
   - PCに送信して再生

### GitHubでの管理

```powershell
# 変更をコミット
git add .
git commit -m "Update: 説明"
git push

# ブランチを作成
git checkout -b feature/new-feature

# プルリクエストを作成
# GitHubのWebサイトから実行
```

### アップデート

```powershell
# モバイルアプリを更新
cd mobile-app
npm install
eas build --platform android --profile preview

# デスクトップアプリを更新
cd ..
npm install
npm start
```

---

## 📚 参考リンク

- [Git公式ドキュメント](https://git-scm.com/doc)
- [GitHub Docs](https://docs.github.com/)
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Android Studio User Guide](https://developer.android.com/studio/intro)

---

## 🎉 完了！

これで、VBRプロジェクトがGitHubにアップロードされ、Androidスマートフォンで動作するようになりました！

何か問題が発生した場合は、各セクションのトラブルシューティングを参照するか、GitHubのIssuesで質問してください。
