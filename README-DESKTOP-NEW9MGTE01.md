# VBR - Video Background Removal Remote

リモートでビデオ背景除去と再生制御を行うアプリケーション

<div align="center">
  <img src="https://img.shields.io/badge/React%20Native-0.81-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React Native" />
  <img src="https://img.shields.io/badge/Electron-28.0-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/TensorFlow%20Lite-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white" alt="TensorFlow Lite" />
</div>

## 🎯 概要

VBRは、スマートフォンとWindows PC間でビデオを送受信し、リアルタイムで背景除去や再生制御ができる統合アプリケーションです。

### 主な機能

- 📱 **モバイルリモコン**: スマートフォンからPCの動画再生を制御
- 🎨 **背景除去**: TensorFlow Liteによるリアルタイム背景除去（白背景化）
- 📺 **デスクトップスクリーン**: Windows PCでの動画受信・再生
- 🔄 **リアルタイム通信**: WebSocketによる低遅延制御

## 🏗 プロジェクト構造

```
VBR/
├── video-remote-app/          # React Native モバイルアプリ（リモコン + 背景除去）
│   ├── src/
│   │   ├── screens/           # 画面コンポーネント
│   │   │   ├── ConnectionScreen.js      # サーバー接続画面
│   │   │   ├── RemoteScreen.js          # リモコン画面
│   │   │   └── BackgroundRemovalScreen.js # 背景除去画面
│   │   ├── services/
│   │   │   └── TFLiteService.js         # TensorFlow Lite処理
│   │   └── utils/
│   │       ├── api.js         # HTTP通信
│   │       └── socket.js      # WebSocket通信
│   ├── assets/
│   │   └── models/            # TFLiteモデル
│   ├── App.js
│   └── package.json
│
├── video-screen-app/          # Electron Windowsアプリ（受信側）
│   ├── main.js                # Electronメインプロセス
│   ├── index.html             # UI
│   ├── renderer.js            # レンダラープロセス
│   ├── uploads/               # 受信動画の保存先
│   └── package.json
│
└── VideoBackgroundRemoval-main/ # Androidネイティブ実装（参考用）
    └── app/
        └── src/main/
            ├── java/          # Kotlin実装
            └── assets/        # TFLiteモデル
```

## 🚀 セットアップ

### 必要環境

- **Node.js** v16以上
- **npm** または **yarn**
- **Android端末** または **エミュレータ**（モバイルアプリ用）
- **Windows PC**（デスクトップアプリ用）

### インストール手順

#### 1. リポジトリのクローン

```bash
git clone https://github.com/kaito1023/VBR.git
cd VBR
```

#### 2. デスクトップアプリのセットアップ

```bash
cd video-screen-app
npm install
```

#### 3. モバイルアプリのセットアップ

```bash
cd ../video-remote-app
npm install
```

## 📱 使い方

### Step 1: デスクトップアプリを起動

```bash
cd video-screen-app
npm start
```

画面に表示される **IPアドレス** をメモしてください（例: `192.168.1.100`）

### Step 2: モバイルアプリを起動

```bash
cd video-remote-app
npx expo start
```

- Android実機: Expo Goアプリでスキャン
- Androidエミュレータ: `npx expo start --android`

### Step 3: 接続して使用

1. **接続画面**: デスクトップに表示されたIPアドレスを入力
2. **接続テスト**: 疎通確認
3. **接続**: WebSocket接続確立
4. **リモコン画面**: 動画選択・アップロード・再生制御
5. **背景除去画面**: 画像の背景を白く置き換え

## 🎨 背景除去機能

TensorFlow Liteを使用したリアルタイム人物セグメンテーション

- **モデル**: DeepLab v3 (MobileNet v2 backbone)
- **処理**: 人物領域を検出し、背景を白色に置換
- **サポート**: iOS/Android

## 📡 通信プロトコル

### HTTP API

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/health` | GET | ヘルスチェック |
| `/upload-video` | POST | 動画アップロード |

### WebSocket イベント

| イベント | 方向 | 説明 |
|---------|------|------|
| `play` | Client → Server | 再生 |
| `pause` | Client → Server | 一時停止 |
| `stop` | Client → Server | 停止 |
| `seek` | Client → Server | シーク |

## 🛠 開発

### デバッグモード

```bash
# デスクトップアプリ（DevTools有効）
cd video-screen-app
npm run dev

# モバイルアプリ
cd video-remote-app
npx expo start
```

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照

## 👤 作成者

**Kaito**
- GitHub: [@kaito1023](https://github.com/kaito1023)
- Email: nktototon@gmail.com

## 🤝 貢献

プルリクエストを歓迎します！

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📝 更新履歴

### v1.0.0 (2025-12-23)
- 初回リリース
- モバイルリモコン機能
- デスクトップスクリーン機能
- TensorFlow Lite背景除去機能

---

<div align="center">
  Made with ❤️ by Kaito
</div>
