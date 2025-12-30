# 🐛 バグ修正完了

## 修正内容

### 1. ❌ → ✅ TabID取得エラーの修正

**問題**: content scriptから`chrome.devtools?.inspectedWindow?.tabId`でtabIdを取得しようとしていたが、これは存在しないため常に`undefined`となり注入が失敗していました。

**修正**:
- `content.js`: 新しいアクション`injectScriptAuto`を送信（tabIdなし）
- `background.js`: メッセージの`sender.tab.id`からtabIdを取得
- これにより自動注入が正常に動作するようになりました

### 2. ✨ ポップアップUI改善

**変更点**:
- ✅ **ドメインの有効化状態を表示**: 「✅ 有効」または「❌ 無効」と表示
- ✅ **ボタンを簡潔化**: 「このタブで有効化」ボタンを削除（意味不明だったため）
- ✅ **有効化/無効化の切り替え**: 状態に応じてボタンが切り替わる

## 🧪 テスト手順

1. Chrome拡張機能ページ（`chrome://extensions/`）で拡張機能を**リロード**してください
2. https://www.fe-siken.com/fekakomon.php にアクセス
3. 拡張機能アイコンをクリック
4. 「状態: ❌ 無効」と表示されることを確認
5. 「このドメインで有効化」ボタンをクリック
6. 「状態: ✅ 有効」に変わることを確認
7. **右クリック**と**テキスト選択**が可能になることを確認

## 📝 変更ファイル

- `extension/content.js` - tabId取得方法を修正
- `extension/background.js` - `injectScriptAuto`と`disableDomain`ハンドラーを追加
- `extension/popup/popup.html` - ドメイン状態表示を追加、ボタンを整理
- `extension/popup/popup.js` - 状態確認とUI更新ロジックを実装
