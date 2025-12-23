# VBR - Video Background Removal & Remote Control

統合されたビデオ背景除去・リモート操作アプリケーション

## 概要

VBRは、動画の背景除去とリモート操作機能を統合したアプリケーションです。
Windows PC用のデスクトップアプリとスマートフォン用のモバイルアプリの2つで構成されています。

## プロジェクト構成

```
VBR/
├── README.md                    # このファイル
├── .gitignore                   # Git除外設定
├── package.json                 # デスクトップアプリの依存関係
├── main.js                      # Electronメインプロセス
├── index.html                   # デスクトップアプリのUI
├── renderer.js                  # デスクトップアプリのロジック
├── uploads/                     # アップロードされた動画
├── processed/                   # 処理済み動画
├── mobile-app/                  # スマートフォンアプリ
│   ├── README.md               # モバイルアプリのドキュメント
│   ├── package.json            # モバイルアプリの依存関係
│   ├── App.js                  # メインアプリケーション
│   ├── app.json                # Expo設定
│   ├── eas.json                # ビルド設定
│   └── src/
│       └── screens/            # 各画面コンポーネント
├── video-remote-app/            # 元のリモコンアプリ（参考用）
├── video-screen-app/            # 元のスクリーンアプリ（参考用）
└── VideoBackgroundRemoval-main/ # 元の背景除去アプリ（参考用）
```

## アプリケーション

### 1. デスクトップアプリ（Windows PC）

Electronベースのデスクトップアプリケーション

**機能:**
- 動画の受信と再生
- リモート操作の受信
- 背景除去処理
- WebSocketサーバー

**起動方法:**
```bash
npm install
npm start
```

詳細は [README.md](README.md) の「統合元のアプリケーション」セクションを参照

### 2. モバイルアプリ（Android/iOS）

React Native（Expo）ベースのスマートフォンアプリ

**機能:**
- カメラでの動画撮影
- 背景除去処理
- PCへのリモート接続と操作
- 設定管理

**起動方法:**
```bash
cd mobile-app
npm install
npm start
```

詳細は [mobile-app/README.md](mobile-app/README.md) を参照

## 主な機能

### 🎮 リモートコントロール
- スマートフォンからの動画アップロード
- WebSocket による リアルタイム再生制御
- 再生 / 一時停止 / 停止コントロール

### 🖥️ ビデオスクリーン
- HTTP サーバーで動画ファイルを受信（ポート 3000）
- WebSocket サーバーで制御コマンドを受信（ポート 3001）
- シンプルで美しい UI デザイン

### 🎨 背景除去
- リアルタイム背景除去処理
- カスタマイズ可能な背景色（白 / 黒 / グリーン）
- 閾値調整スライダー

## 技術スタック

- **Electron** - デスクトップアプリケーションフレームワーク
- **Express** - HTTP サーバー
- **Socket.IO** - WebSocket 通信
- **Canvas API** - ビデオ処理

## インストール

```bash
cd VBR
npm install
```

## 起動方法

### 通常起動
```bash
npm start
```

### デバッグモード（DevTools を開く）
```bash
npm run dev
```

## 使い方

### 1. アプリケーション起動
アプリを起動すると、画面左サイドバーに以下の情報が表示されます：
- **IP Address**: ローカルネットワークの IP アドレス
- **HTTP Port**: 3000
- **WebSocket Port**: 3001

### 2. スマートフォンからの接続
スマートフォンアプリから表示された IP アドレスに接続します：
- 接続先: `http://[表示されたIP]:3000`

### 3. 動画のアップロード
スマートフォンアプリから動画を送信すると、自動的に読み込まれます。

### 4. リモートコントロール
**リモコンタブ**で以下の操作が可能：
- ▶ 再生
- ⏸ 一時停止
- ⏹ 停止

### 5. 背景除去
**背景除去タブ**で以下の設定が可能：
1. 閾値スライダーで感度を調整
2. 「背景除去を有効化」ボタンをクリック
3. 背景色を選択（白 / 黒 / グリーン）

## API 仕様

### HTTP エンドポイント

#### `GET /health`
ヘルスチェック

**レスポンス:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-22T00:00:00.000Z"
}
```

#### `POST /upload-video`
動画ファイルをアップロード

**リクエスト:**
- Content-Type: `multipart/form-data`
- フィールド名: `video`
- 最大サイズ: 2GB

**レスポンス:**
```json
{
  "success": true,
  "videoId": "video_1234567890",
  "filename": "video_1234567890.mp4",
  "path": "/uploads/video_1234567890.mp4",
  "size": 12345678
}
```

### WebSocket イベント

#### `play`
動画を再生
```javascript
socket.emit('play');
```

#### `pause`
動画を一時停止
```javascript
socket.emit('pause');
```

#### `stop`
動画を停止して最初に戻す
```javascript
socket.emit('stop');
```

#### `seek`
動画の再生位置を変更
```javascript
socket.emit('seek', { time: 10.5 });
```

## プロジェクト構造

```
VBR/
├── package.json              # プロジェクト設定
├── main.js                   # Electron メインプロセス
├── index.html                # UI レイアウト
├── renderer.js               # レンダラープロセス（UI ロジック）
├── README.md                 # このファイル
├── uploads/                  # アップロードされた動画
├── processed/                # 処理済み動画
├── video-remote-app/         # 元のリモコンアプリ（参考用）
├── video-screen-app/         # 元のスクリーンアプリ（参考用）
└── VideoBackgroundRemoval-main/  # 元の背景除去アプリ（参考用）
```

## 統合元のアプリケーション

このアプリは以下の3つのアプリケーションを統合しています：
- `video-remote-app` - React Native (Expo) スマホアプリ
- `video-screen-app` - Electron デスクトップアプリ
- `VideoBackgroundRemoval-main` - Android 背景除去アプリ

## スマートフォンアプリとの連携

スマートフォン側のアプリケーション（`video-remote-app`）を使用する場合：

1. `video-remote-app` フォルダに移動
2. `npm install` でインストール
3. `npx expo start` で起動
4. Expo Go アプリで QR コードをスキャン
5. 表示された IP アドレスを入力して接続

## 開発

### 依存関係の追加
```bash
npm install [パッケージ名]
```

### ビルド
```bash
npm run build
```

## ライセンス

MIT

## 作成者

Kaito

## バージョン

1.0.0
