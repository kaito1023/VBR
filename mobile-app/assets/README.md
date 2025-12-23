# アセットフォルダ

このフォルダには以下のファイルを配置します：

## 必要なアセット

1. **icon.png** (1024x1024px)
   - アプリのメインアイコン
   - PNG形式、透明背景推奨

2. **adaptive-icon.png** (1024x1024px)
   - Android用アダプティブアイコン
   - 中央の512x512pxエリアに重要な要素を配置

3. **splash.png** (1284x2778px)
   - スプラッシュスクリーン画像
   - 中央に配置されるロゴやテキスト

4. **favicon.png** (48x48px)
   - Webブラウザ用ファビコン

## アイコン作成ツール

- [Figma](https://www.figma.com/)
- [Canva](https://www.canva.com/)
- [Icon Kitchen](https://icon.kitchen/)

## 自動生成

アイコンがない場合、Expoが自動的にデフォルトアイコンを使用します。

## カスタムアイコンの追加

1. 上記のサイズで画像を作成
2. このフォルダに配置
3. `app.json` で参照されていることを確認
4. `npx expo start --clear` でキャッシュをクリアして再起動
