#  VBR - Video Background Removal

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React Native](https://img.shields.io/badge/React%20Native-0.76.6-blue)](https://reactnative.dev/)
[![Electron](https://img.shields.io/badge/Electron-28.0-blue)](https://www.electronjs.org/)

リモート制御で動画背景除去を行うアプリケーション統合プロジェクト

---

##  クイックスタート（Android Studio）

###  完全自動化版（推奨）

```bash
# 1. リポジトリをクローン
git clone https://github.com/kaito1023/VBR.git

# 2. Android Studioで開く
# File  Open  VBR/video-remote-app/android

# 3. USBデバッグを有効にした端末を接続

# 4. Run  ボタンをクリック
```

**これだけです！** 以下が自動で実行されます：
-  `npm install` の自動実行
-  `local.properties` の自動生成
-  Metro Bundlerの自動起動
-  アプリのビルドとインストール

---

##  プロジェクト構成

```
VBR/
 video-remote-app/           # React Nativeモバイルアプリ
    android/                #  Android Studioで開くフォルダ
       app/build.gradle    # 自動化スクリプト追加済み
       build.gradle        # local.properties自動生成
    src/                    # アプリソースコード
    App.js                  # エントリーポイント
    package.json
 video-screen-app/           # Electron Windowsアプリ
    index.html
    main.js
    package.json
 VideoBackgroundRemoval-main/ # 参考用Androidプロジェクト
```

---

##  アプリの機能

###  モバイルアプリ（video-remote-app）

1. **接続画面** 
   - Windows画面アプリのIPアドレスを設定
   - 接続状態の確認

2. **リモート画面** 
   - 動画のアップロード（最大2GB）
   - 再生/一時停止/停止コントロール
   - リアルタイム操作

3. **背景除去画面** 
   - TensorFlow Lite統合予定
   - 画像選択機能実装済み

###  Windows画面アプリ（video-screen-app）

- Socket.IOで動画受信
- フルスクリーン表示
- リモートコントロール対応

---

##  手動セットアップ（トラブル時）

自動化が失敗した場合のみ実行：

```bash
# 1. リポジトリをクローン
git clone https://github.com/kaito1023/VBR.git
cd VBR/video-remote-app

# 2. 依存関係をインストール
npm install

# 3. Metro Bundlerを起動（別ターミナル）
npm start

# 4. Android Studioで実行
# video-remote-app/android/ を開く
# Run 
```

---

##  Android端末の準備

### USBデバッグの有効化

1. **設定**  **端末情報**  **ビルド番号**を7回タップ
2. **設定**  **開発者向けオプション**  **USBデバッグ**をON
3. USBケーブルでPCと接続
4. 「USBデバッグを許可しますか？」 **許可**

---

##  トラブルシューティング

###  "SDK location not found"

自動生成に失敗した場合、手動で作成：

```bash
cd VBR/video-remote-app/android
echo "sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk" > local.properties
```

###  Metro Bundler起動しない

手動で起動：

```bash
cd VBR/video-remote-app
npm start
```

###  "Gradle sync failed"

キャッシュをクリア：

```bash
cd VBR/video-remote-app/android
.\gradlew clean
```

Android Studio:
```
File  Invalidate Caches  Invalidate and Restart
```

###  端末が認識されない

```bash
adb devices  # 端末確認
adb kill-server
adb start-server
```

---

##  Windows画面アプリの起動

```bash
cd VBR/video-screen-app
npm install
npm start
```

---

##  開発情報

- **Package Name**: `com.kaito1023.vbr`
- **React Native**: 0.76.6
- **Node.js**: 18以上推奨
- **Electron**: 28.0

---

##  ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照

---

##  コントリビューション

詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照

---

##  ドキュメント

- [Android Studioセットアップガイド](ANDROID_STUDIO_GUIDE.md)
- [セットアップ手順](SETUP.md)

---

##  作成者

**kaito1023**
- GitHub: [@kaito1023](https://github.com/kaito1023)
- Email: nktototon@gmail.com
