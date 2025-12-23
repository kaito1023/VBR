# コントリビューションガイド

VBRプロジェクトへの貢献を歓迎します！

## 貢献方法

### 1. Issue の作成

バグ報告や機能リクエストは、GitHubのIssuesで受け付けています。

**バグ報告の場合:**
- 環境（OS、Node.jsバージョン、デバイス等）
- 再現手順
- 期待される動作と実際の動作
- スクリーンショットやログ（可能な場合）

**機能リクエストの場合:**
- 機能の説明
- ユースケース
- 実装の提案（任意）

### 2. プルリクエストの作成

#### Step 1: フォーク

このリポジトリをフォークして、自分のGitHubアカウントにコピーします。

#### Step 2: クローン

```bash
git clone https://github.com/YOUR_USERNAME/VBR.git
cd VBR
```

#### Step 3: ブランチの作成

```bash
git checkout -b feature/amazing-feature
```

ブランチ名の命名規則：
- `feature/` - 新機能
- `fix/` - バグ修正
- `docs/` - ドキュメント更新
- `refactor/` - リファクタリング

#### Step 4: 変更の実装

コードを変更し、適切にテストします。

#### Step 5: コミット

```bash
git add .
git commit -m "Add amazing feature"
```

コミットメッセージの規則：
- 英語または日本語で記述
- 変更内容を簡潔に説明
- 必要に応じてIssue番号を参照（例: `Fix #123`）

#### Step 6: プッシュ

```bash
git push origin feature/amazing-feature
```

#### Step 7: プルリクエストの作成

GitHubでプルリクエストを作成します。

**プルリクエストには以下を含めてください:**
- 変更内容の説明
- 関連するIssue番号
- テスト方法
- スクリーンショット（UI変更の場合）

## 開発ガイドライン

### コーディングスタイル

#### JavaScript/React Native

- ESLintとPrettierを使用
- 関数コンポーネントとHooksを使用
- わかりやすい変数名と関数名を使用
- 必要に応じてコメントを追加

#### スタイリング

- StyleSheetを使用
- カラーコードは統一（プライマリカラー: `#6366F1`）
- レスポンシブデザインを考慮

### テスト

変更を実装した後は、必ず以下をテストしてください：

- **モバイルアプリ**: Android実機またはエミュレータで動作確認
- **デスクトップアプリ**: Windows PCで動作確認
- **統合テスト**: モバイルとデスクトップ間の通信確認

### ドキュメント

コードの変更に伴い、必要に応じてREADMEやその他のドキュメントも更新してください。

## プロジェクト構造

```
VBR/
├── video-remote-app/          # モバイルアプリ
│   ├── src/
│   │   ├── screens/           # 画面コンポーネント
│   │   ├── services/          # ビジネスロジック
│   │   └── utils/             # ユーティリティ関数
│   ├── assets/                # 画像、モデル等
│   └── App.js                 # エントリーポイント
│
├── video-screen-app/          # デスクトップアプリ
│   ├── main.js                # Electronメインプロセス
│   ├── index.html             # UI
│   └── renderer.js            # レンダラープロセス
│
└── VideoBackgroundRemoval-main/ # Androidネイティブ実装（参考）
```

## 質問

質問がある場合は、以下の方法でお問い合わせください：

- GitHub Issues
- Email: nktototon@gmail.com

## ライセンス

貢献したコードは、プロジェクトのMITライセンスの下でライセンスされます。

---

貢献してくださる全ての方に感謝します！ 🎉
