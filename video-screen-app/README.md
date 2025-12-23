# VBR Desktop Screen

スマホから送信された動画を受信して再生するWindows デスクトップアプリケーションです。

## 🎯 機能

- **HTTPサーバー（ポート3000）**: 動画ファイルを受信
- **WebSocketサーバー（ポート3001）**: 再生制御（再生/停止/一時停止/シーク）
- **シンプルで美しいUI**: モダンなグラデーションデザイン
- **フルスクリーン対応**: 大画面での視聴
- **キーボードショートカット対応**: 快適な操作

## 🛠 必要要件

- Node.js (v16以上推奨)
- npm
- Windows OS

## 📦 インストール

```bash
cd video-screen-app
npm install
```

## ▶️ 起動方法

```bash
npm start
```

デバッグモード（DevToolsを開く）で起動:

```bash
npm run dev
```

## 📱 使い方

1. アプリを起動すると、画面にIPアドレスとポート番号が表示されます
2. スマホアプリから表示されたIPアドレスに接続します
3. スマホから動画を送信すると、自動的に動画プレイヤーにロードされます
4. スマホアプリまたは画面上のコントロールボタンで再生制御できます

## 🎮 キーボードショートカット

| キー | 動作 |
|------|------|
| `Space` | 再生/一時停止 |
| `F` | フルスクリーン切り替え |
| `Esc` | フルスクリーン解除 |
| `←` | 5秒巻き戻し |
| `→` | 5秒早送り |

## 📡 API仕様

### HTTPエンドポイント

#### POST /upload-video
動画ファイルをアップロード

**リクエスト:**
- Content-Type: multipart/form-data
- フィールド名: `video`
- 最大ファイルサイズ: 2GB

**レスポンス:**
```json
{
  "success": true,
  "videoId": "video_1234567890",
  "filename": "video_1234567890.mp4",
  "size": 12345678
}
```

#### GET /health
ヘルスチェック

**レスポンス:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-23T00:00:00.000Z"
}
```

### WebSocketイベント

| イベント | 説明 |
|---------|------|
| `play` | 動画を再生 |
| `pause` | 動画を一時停止 |
| `stop` | 動画を停止して最初に戻す |
| `seek` | 指定時間にシーク |

## 📂 プロジェクト構成

```
video-screen-app/
├── main.js          # Electronメインプロセス
├── index.html       # UI
├── renderer.js      # レンダラープロセス
├── package.json     # プロジェクト設定
└── uploads/         # 受信動画の保存先
```

## 📄 ライセンス

MIT License

## 👤 作成者

Kaito <nktototon@gmail.com>

指定秒数にシーク

```javascript
socket.emit('seek', { time: 30 }); // 30秒の位置に移動
```

## テスト方法

### curlで動画をアップロード

```bash
curl -X POST -F "video=@test.mp4" http://localhost:3000/upload-video
```

### ブラウザコンソールでWebSocket接続テスト

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:3001');

socket.emit('play');
socket.emit('pause');
socket.emit('stop');
socket.emit('seek', { time: 30 });
```

### Node.jsでテスト

動画アップロードのテストスクリプト例:

```javascript
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

const form = new FormData();
form.append('video', fs.createReadStream('test.mp4'));

axios.post('http://192.168.1.100:3000/upload-video', form, {
  headers: form.getHeaders()
})
.then(response => console.log(response.data))
.catch(error => console.error(error));
```

## キーボードショートカット

- `Space`: 再生/一時停止の切り替え
- `F`: フルスクリーン切り替え
- `Escape`: フルスクリーン解除
- `←`: 5秒巻き戻し
- `→`: 5秒早送り

## ディレクトリ構成

```
video-screen-app/
├── package.json          # プロジェクト設定と依存関係
├── main.js              # Electronメインプロセス、HTTPサーバー、WebSocketサーバー
├── index.html           # 動画プレイヤーUI
├── renderer.js          # レンダラープロセス（UI制御）
├── uploads/             # 受信した動画の保存先（自動生成）
└── README.md            # このファイル
```

## トラブルシューティング

### ポートが使用中のエラー

ポート3000または3001が既に使用されている場合は、`main.js`の以下の行を編集してポート番号を変更してください:

```javascript
const HTTP_PORT = 3000;
const WEBSOCKET_PORT = 3001;
```

### 動画が再生されない

1. 動画ファイルの形式が対応しているか確認（MP4, WebM推奨）
2. ブラウザのコンソール（DevTools）でエラーメッセージを確認
3. 動画ファイルが正しく`uploads/`ディレクトリに保存されているか確認

### スマホから接続できない

1. Windowsのファイアウォールでポート3000と3001が許可されているか確認
2. スマホとPCが同じネットワークに接続されているか確認
3. IPアドレスが正しいか確認

## ライセンス

MIT
