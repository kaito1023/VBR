# React Native開発の現実

##  不可能なこと

Android StudioのRunボタンだけでReact Nativeアプリを実行することは**構造上不可能**です。

理由：
- React Native = Android (Kotlin) + JavaScript (React)
- 必ず2つのプロセスが必要
  1. Gradle (Android Studio)
  2. Metro Bundler (Node.js)

##  最も簡単な方法

### 初回セットアップ
```bash
git clone https://github.com/kaito1023/VBR.git
cd VBR/video-remote-app
npm install
```

### 開発時（毎回）
```bash
# 1. Metro Bundlerを起動（ターミナル）
npm start

# 2. Android Studioで実行
# video-remote-app/android/ を開く
# Run  ボタンをクリック
```

**Metro Bundlerは起動しっぱなしでOK** なので、実質：
- PCを起動したら1回 `npm start`
- あとはAndroid Studioのだけ

##  自動化する方法

Android Studioの**Run Configuration**でMetro Bundlerも自動起動できます。

### 設定手順

1. Android Studio: **Run  Edit Configurations**
2. **app** を選択
3. **Before launch** セクションで **+**  **Run External tool**
4. 以下を設定：
   - Name: `Start Metro`
   - Program: `npm`
   - Arguments: `start`
   - Working directory: `$ProjectFileDir$\..`

これでボタン1つで両方起動します。

##  リリースビルド（配布用）

開発完了後、独立したAPKを作成：

```bash
cd android
./gradlew assembleRelease
```

このAPKは：
-  npm不要
-  Metro Bundler不要
-  スマホにインストールするだけ

ただし、ビルドに時間がかかる（5-10分）ので開発中は非推奨。

##  結論

### 開発中
**最低限2ステップ必要：**
1. `npm start` (初回のみ/PC起動時)
2. Android Studioの

### リリース時
**1ステップ：**
1. APKをビルド  インストール

これ以上簡略化することは、React Nativeの構造上不可能です。
