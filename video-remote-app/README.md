# VBR Mobile Remote

スマホから動画を選択して、Windows PCに送信し、リモコンのように再生制御するReact Nativeアプリです。  
TensorFlow Liteによる背景除去機能も搭載しています。

## 🎯 機能

- **Windows PCへの接続**: IPアドレス指定で接続
- **動画ファイルの選択とアップロード**: 進捗表示付き
- **WebSocketによるリアルタイム再生制御**: 再生/一時停止/停止
- **背景除去**: TensorFlow Liteによる人物セグメンテーション
- **IPアドレスの自動保存**: 次回起動時に自動入力

## 🛠 技術スタック

- React Native + Expo
- TensorFlow Lite (react-native-fast-tflite)
- axios (HTTP通信)
- socket.io-client (WebSocket)
- React Navigation (画面遷移)
- AsyncStorage (データ保存)

## 📦 必要要件

- Node.js (v16以上)
- npm
- Android端末またはエミュレータ
- Windows PC側の`vbr-screen`アプリが起動していること

## 🚀 インストール

```bash
cd video-remote-app
npm install
```

## ▶️ 起動方法

### 開発サーバー起動

```bash
npx expo start
```

### Androidで起動

```bash
npx expo start --android
```

### 実機で起動（Expo Goアプリ使用）

1. スマホにExpo Goアプリをインストール
2. `npx expo start` でQRコードを表示
3. Expo GoアプリでQRコードをスキャン

## 📱 使い方

### 1. Windows PC側の準備

1. `vbr-screen` (video-screen-app) を起動
2. 画面に表示されるIPアドレスをメモ（例: 192.168.1.100）

### 2. スマホアプリの操作

1. アプリを起動
2. **接続画面**でIPアドレスを入力
3. 「接続テスト」ボタンで疎通確認
4. 「接続開始」ボタンをタップ
5. **リモコン画面**に移動
6. 「動画を選択」で動画ファイルを選択
7. 「PCに送信」でWindows PCに送信（進捗バー表示）
8. 送信完了後、再生/一時停止/停止ボタンで制御
9. 「背景除去」で背景白化機能を使用

## 🎨 背景除去機能

- **モデル**: DeepLab v3 (MobileNet v2 backbone)
- **処理**: 人物領域を検出し、背景を白色に置換
- **対応**: iOS/Android

## 📂 プロジェクト構成

```
video-remote-app/
├── App.js                     # メインアプリ、ナビゲーション
├── package.json               # プロジェクト設定
├── app.json                   # Expo設定
├── src/
│   ├── screens/
│   │   ├── ConnectionScreen.js        # 接続設定画面
│   │   ├── RemoteScreen.js            # リモコン画面
│   │   └── BackgroundRemovalScreen.js # 背景除去画面
│   ├── services/
│   │   └── TFLiteService.js           # TensorFlow Lite処理
│   └── utils/
│       ├── api.js                     # HTTP通信関数
│       └── socket.js                  # WebSocket接続管理
└── assets/
    └── models/                        # TFLiteモデル
```

## 📄 ライセンス

MIT License

## 👤 作成者

Kaito <nktototon@gmail.com>

- 進捗コールバック付き

### WebSocket通信（socket.js）

#### connect(ip)
- WebSocketサーバーに接続
- URL: `http://{ip}:3001`

#### emitPlay() / emitPause() / emitStop()
- 再生制御イベント送信

## トラブルシューティング

### 接続できない

1. **同じWi-Fiに接続しているか確認**
   - スマホとPCが同じネットワークにいる必要があります

2. **Windowsのファイアウォール確認**
   - ポート3000と3001が許可されているか確認

3. **IPアドレスが正しいか確認**
   - Windows PC側で表示されているIPと一致しているか

### 動画がアップロードできない

1. **動画ファイルのサイズ確認**
   - 最大2GBまで対応

2. **タイムアウト設定**
   - 大容量ファイルは時間がかかります（5分のタイムアウト設定）

3. **ネットワーク速度確認**
   - Wi-Fi接続が安定しているか確認

### WebSocketが切断される

1. **サーバーの起動状態確認**
   - Windows PC側のアプリが起動しているか

2. **ネットワークの安定性**
   - Wi-Fi接続が切れていないか

## 開発者向け情報

### デバッグログの確認

開発中は以下のコマンドでログを確認できます：

```bash
npx expo start
```

コンソールにログが表示されます。

### ビルド方法

Android APKをビルド（Expo EAS Build使用）：

```bash
npx eas build --platform android
```

## 今後の拡張機能

- [ ] シークバー（動画の任意の位置に移動）
- [ ] 音量調整
- [ ] 複数動画のプレイリスト
- [ ] iOS対応
- [ ] インターネット経由での接続（4桁コード）

## ライセンス

MIT
