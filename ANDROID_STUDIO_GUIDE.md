#  Android Studio 完全セットアップガイド

##  重要：必ずこの順番で実行してください！

React Nativeプロジェクトは**Node.js依存関係のインストールが必須**です。Android Studioだけでは動きません。

---

##  初回セットアップ（GitHubからクローン）

### 1 リポジトリをクローン

```bash
git clone https://github.com/kaito1023/VBR.git
cd VBR
```

### 2 React Native依存関係をインストール（必須！）

```bash
cd video-remote-app
npm install
```

**この手順を飛ばすとGradleエラーが発生します！**

### 3 Android Studioで正しいフォルダを開く

####  間違い
```
VBR/ を開く（リポジトリルート）
```

####  正解
```
VBR/video-remote-app/android/ を開く
```

**手順：**
1. Android Studioを起動
2. **Open** をクリック
3. `VBR/video-remote-app/android` フォルダを選択
4. **OK** をクリック
5. Gradle Syncが自動開始（初回は5-10分）

### 4 Metro Bundler を起動（別ターミナル）

Android Studioとは**別のターミナル**で：

```bash
cd VBR/video-remote-app
npm start
```

**Metro Bundlerは常に起動しておく必要があります！**

### 5 Android端末の準備

#### USB デバッグを有効化

1. **設定**  **端末情報**  **ビルド番号**を7回タップ
2. **設定**  **開発者向けオプション**  **USBデバッグ**をON
3. USBケーブルでPCと接続
4. 「USBデバッグを許可しますか？」 **許可**

### 6 ビルドと実行

1. Android Studioの上部ツールバーで端末を選択
2. **Run** ボタン（）をクリック
3. 初回ビルド完了まで5-10分待つ

---

##  よくあるエラーと解決方法

###  エラー1: "SDK location not found"

**原因：** `local.properties` がない

**解決方法：**
```bash
cd VBR/video-remote-app/android
echo "sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk" > local.properties
```

 `YOUR_USERNAME` を実際のユーザー名に置き換えてください

###  エラー2: "Unable to resolve module"

**原因：** `npm install` を実行していない

**解決方法：**
```bash
cd VBR/video-remote-app
npm install
npm start  # Metro Bundler起動
```

###  エラー3: "Gradle sync failed"

**原因：** インターネット接続 or Gradle キャッシュ

**解決方法：**
```bash
cd VBR/video-remote-app/android
.\gradlew clean
```

Android Studioで：
```
File  Invalidate Caches  Invalidate and Restart
```

###  エラー4: "Could not connect to development server"

**原因：** Metro Bundler が起動していない

**解決方法：**
```bash
# 別ターミナルで
cd VBR/video-remote-app
npm start
```

###  エラー5: "adb: device not found"

**原因：** 端末が認識されていない

**解決方法：**
```bash
adb devices  # リスト表示
adb kill-server
adb start-server
```

---

##  チーム開発での手順

### 他の人がコードを更新した場合

```bash
# 1. 最新コードを取得
cd VBR
git pull

# 2. 依存関係を再インストール（package.jsonが更新された場合）
cd video-remote-app
npm install

# 3. Android Studioで Gradle Sync
File  Sync Project with Gradle Files

# 4. Metro Bundler を再起動
npm start

# 5. アプリを実行
Android Studioで Run ボタン
```

---

##  開発ワークフロー

### 日常的なコード編集

```
1. Metro Bundler起動（常時起動）
   npm start

2. Android Studioでコード編集
   - MainActivity.kt
   - その他Kotlinファイル

3. JavaScript/React編集
   - App.js
   - src/screens/*.js

4. ホットリロード
   - JavaScript変更  自動反映
   - Kotlin変更  Run ボタンで再ビルド

5. デバッグ
   - Android Studio: Logcat
   - React Native: 端末シェイク  Dev Menu
```

---

##  プロジェクト構造

```
VBR/
 video-remote-app/              # React Nativeアプリ
    android/                   #  Android Studioで開くフォルダ
       app/
       gradle/
       build.gradle
       gradlew                # Gradle Wrapper（重要）
       settings.gradle
    src/                       # JavaScript/React コード
    App.js                     # メインエントリーポイント
    package.json               # Node.js依存関係
    node_modules/              # npm install で生成
 video-screen-app/              # Electron Windowsアプリ
 ANDROID_STUDIO_GUIDE.md        # このファイル
```

---

##  重要なポイント

###  DO（すべきこと）

-  必ず `npm install` を最初に実行
-  `video-remote-app/android/` を開く（リポジトリルートではない）
-  Metro Bundler を常に起動しておく
-  `node_modules/` は `.gitignore` で除外（巨大）
-  `android/build/` は除外（ビルド成果物）

###  DON'T（すべきでないこと）

-  リポジトリルート `VBR/` を Android Studioで開く
-  `npm install` なしで Android Studio を開く
-  Metro Bundler なしでアプリを実行
-  `node_modules/` をコミット
-  `android/app/build/` をコミット

---

##  クイックスタート（まとめ）

```bash
# 1. クローン
git clone https://github.com/kaito1023/VBR.git
cd VBR/video-remote-app

# 2. 依存関係インストール
npm install

# 3. Metro Bundler 起動（別ターミナル）
npm start

# 4. Android Studio で開く
# Open  VBR/video-remote-app/android

# 5. 端末接続  Run 
```

---

##  パッケージ情報

- **Package Name**: `com.kaito1023.vbr`
- **App Name**: VBR (Video Background Removal)
- **React Native**: 0.76.6
- **Node.js**: 18以上推奨

---

##  トラブルシューティング チェックリスト

起動できない場合、順番に確認：

- [ ] `npm install` を実行したか？
- [ ] `node_modules/` フォルダが存在するか？
- [ ] Metro Bundler が起動しているか？（`npm start`）
- [ ] `android/` フォルダを開いているか？（リポジトリルートではない）
- [ ] USBデバッグが有効か？
- [ ] `adb devices` で端末が表示されるか？
- [ ] Android SDK がインストールされているか？
- [ ] Gradle Sync が完了しているか？

---

すべての手順を正しく実行すれば、確実に動作します！ 
