# GitHub への公開手順

このドキュメントでは、VBRプロジェクトをGitHubに公開する手順を説明します。

## 前提条件

- Gitがインストールされていること
- GitHubアカウントを持っていること
- リポジトリ https://github.com/kaito1023/VBR が作成済みであること

## 手順

### 1. Gitの初期化（必要な場合のみ）

プロジェクトディレクトリでGitが初期化されていない場合：

```powershell
cd "c:\Users\kaito\OneDrive\デスクトップ\開発\VBR"
git init
```

### 2. Gitユーザー情報の設定

```powershell
git config user.name "kaito1023"
git config user.email "nktototon@gmail.com"
```

### 3. リモートリポジトリの追加

```powershell
git remote add origin https://github.com/kaito1023/VBR.git
```

既にリモートが設定されている場合は、確認：

```powershell
git remote -v
```

### 4. ファイルをステージング

```powershell
git add .
```

### 5. コミット

```powershell
git commit -m "Initial commit: VBR v1.0.0 - Video Background Removal Remote application"
```

### 6. mainブランチにプッシュ

```powershell
git branch -M main
git push -u origin main
```

## 認証エラーが出る場合

GitHubの認証には、個人アクセストークン（PAT）を使用する必要があります。

### Personal Access Token の作成

1. GitHubにログイン
2. Settings → Developer settings → Personal access tokens → Tokens (classic)
3. "Generate new token" をクリック
4. 以下の権限を選択：
   - `repo` (全て)
5. トークンを生成してコピー（一度しか表示されません）

### 認証情報の設定

プッシュ時にユーザー名とパスワードを求められたら：
- **ユーザー名**: kaito1023
- **パスワード**: 生成した個人アクセストークン

または、Git Credential Managerを使用：

```powershell
git config --global credential.helper manager
```

## .gitignoreの確認

不要なファイルがコミットされないように、`.gitignore`が正しく設定されているか確認：

```powershell
type .gitignore
```

## 今後の更新

プロジェクトを更新する際：

```powershell
git add .
git commit -m "Update: 更新内容の説明"
git push origin main
```

## トラブルシューティング

### Large File Size エラー

GitHubは100MBを超えるファイルをプッシュできません。大きなファイル（TFLiteモデル等）がある場合は、Git LFSを使用：

```powershell
git lfs install
git lfs track "*.tflite"
git add .gitattributes
git commit -m "Add Git LFS tracking"
```

### リモートとの競合

```powershell
git pull origin main --rebase
git push origin main
```

---

問題が発生した場合は、エラーメッセージを確認し、必要に応じて GitHub Issues でサポートを求めてください。
