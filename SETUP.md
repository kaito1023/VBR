# セットアップガイド

VBRプロジェクトのセットアップ手順を説明します。

## 前提条件

以下のソフトウェアがインストールされていることを確認してください：

- **Node.js** v16以上
- **npm** または **yarn**
- **Git**
- **Android Studio**（モバイルアプリをエミュレータで実行する場合）

## クローンとインストール

### 1. リポジトリのクローン

```bash
git clone https://github.com/kaito1023/VBR.git
cd VBR
```

### 2. デスクトップアプリのセットアップ

```bash
cd video-screen-app
npm install
cd ..
```

### 3. モバイルアプリのセットアップ

```bash
cd video-remote-app
npm install
cd ..
```

## Windows PC（デスクトップアプリ）

### 起動

```bash
cd video-screen-app
npm start
```

起動すると、画面にIPアドレスが表示されます。このIPアドレスをメモしてください。

### デバッグモード

開発者ツールを開いてデバッグする場合：

```bash
npm run dev
```

## スマートフォン（モバイルアプリ）

### Androidエミュレータで起動

```bash
cd video-remote-app
npx expo start --android
```

### 実機で起動（Expo Go使用）

1. スマートフォンに **Expo Go** アプリをインストール
   - [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS](https://apps.apple.com/app/expo-go/id982107779)

2. 開発サーバーを起動：
   ```bash
   cd video-remote-app
   npx expo start
   ```

3. 表示されたQRコードをExpo Goアプリでスキャン

## 使用手順

### Step 1: デスクトップアプリの起動

1. Windows PCで `video-screen-app` を起動
2. 画面に表示されるIPアドレスをメモ（例: `192.168.1.100`）

### Step 2: モバイルアプリの起動と接続

1. スマートフォンで `video-remote-app` を起動
2. **接続画面**が表示されます
3. デスクトップに表示されたIPアドレスを入力
4. 「🔍 接続テスト」をタップして接続確認
5. 「🚀 接続開始」をタップ

### Step 3: 動画の送信と再生

1. **リモコン画面**に移動
2. 「📂 動画を選択」から動画ファイルを選択
3. 「🚀 PCに送信」で動画をアップロード
4. アップロード完了後、再生制御ボタンが有効になります
   - ▶️ 再生
   - ⏸ 一時停止
   - ⏹ 停止

### Step 4: 背景除去機能の使用

1. **リモコン画面**から「🖼 背景除去」をタップ
2. **背景除去画面**に移動
3. 「📷 画像を選択」から人物画像を選択
4. 「✨ 背景を除去」をタップ
5. 処理結果（背景が白に置換された画像）が表示されます

## トラブルシューティング

### 接続できない場合

1. **ファイアウォールの確認**
   - Windows Defenderファイアウォールで、ポート3000と3001が開いているか確認

2. **同じネットワークに接続**
   - PCとスマートフォンが同じWi-Fiネットワークに接続されているか確認

3. **IPアドレスの確認**
   - コマンドプロンプトで `ipconfig` を実行し、正しいIPアドレスを確認

### モバイルアプリが起動しない場合

1. **依存関係の再インストール**
   ```bash
   cd video-remote-app
   rm -rf node_modules
   npm install
   ```

2. **キャッシュのクリア**
   ```bash
   npx expo start -c
   ```

### 背景除去が動作しない場合

1. **モデルファイルの確認**
   - `video-remote-app/assets/models/` にTFLiteモデルファイルがあるか確認

2. **権限の確認**
   - スマートフォンの設定で、アプリに写真ライブラリへのアクセス権限が付与されているか確認

## 開発環境

### 推奨エディタ

- Visual Studio Code

### 推奨VS Code拡張機能

- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint

## その他

### ログの確認

#### デスクトップアプリ
デバッグモードで起動すると、開発者ツールのConsoleタブでログを確認できます。

#### モバイルアプリ
Expoの開発サーバーのターミナルでログを確認できます。

---

問題が解決しない場合は、[GitHub Issues](https://github.com/kaito1023/VBR/issues)で報告してください。
