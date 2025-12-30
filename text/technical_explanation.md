# Chrome拡張機能 エラー原因と修正解説

## 🐛 発生していた問題

### エラーメッセージ
```
Error in invocation of scripting.executeScript(scripting.ScriptInjection injection, optional function callback): 
Error at parameter 'injection': Error at property 'target': Missing required property 'tabId'.
```

### 症状
- 右クリックとテキスト選択が無効化されたまま
- 自動注入（ドメイン登録時）が機能しない
- コンソールに上記エラーが表示される

---

## 🔍 根本原因

### 問題のあったコード（content.js）

```javascript
// ❌ 間違ったコード
chrome.runtime.sendMessage(
  { action: 'injectScript', tabId: chrome.devtools?.inspectedWindow?.tabId },
  //                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //                              これが常に undefined になる！
  (response) => { /* ... */ }
);
```

### なぜ動かなかったのか？

**Content Script内では `chrome.devtools` APIは使用できません**

- `chrome.devtools` は **DevTools拡張機能専用のAPI**
- Content Scriptからは存在しないため `undefined` になる
- その結果、`tabId: undefined` がbackgroundに送信される
- backgroundが `chrome.scripting.executeScript({ target: { tabId: undefined } })` を実行
- Chrome APIが「tabIdが必須なのに指定されていない」とエラーを返す

### Chrome拡張機能のコンテキスト理解

| コンテキスト | 説明 | 利用可能なAPI |
|------------|------|--------------|
| **Content Script** | Webページに注入されるスクリプト | 限定的なChrome API（storage, runtime.sendMessageなど） |
| **Background (Service Worker)** | バックグラウンドで動作 | ほぼ全てのChrome API（tabs, scripting, storageなど） |
| **Popup** | 拡張機能アイコンクリック時のUI | chrome.tabs.queryなど多くのAPI |
| **DevTools** | 開発者ツール拡張 | chrome.devtools専用API |

**Content ScriptはtabIdを直接取得できない**のが重要なポイントです。

---

## ✅ 修正方法

### 解決策：Message Senderを活用

Chrome拡張機能では、`chrome.runtime.onMessage`のリスナーに渡される`sender`オブジェクトに、**送信元のタブ情報が自動的に含まれます**。

### 修正後のコード

#### 1. content.js（送信側）

```javascript
// ✅ 修正後：tabIdを送らない
chrome.runtime.sendMessage(
  { action: 'injectScriptAuto' },  // tabIdを含めない
  (response) => { /* ... */ }
);
```

#### 2. background.js（受信側）

```javascript
// ✅ 修正後：senderからtabIdを取得
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'injectScriptAuto') {
    const tabId = sender.tab?.id;  // ← ここでtabIdを取得！
    //            ^^^^^^^^^^^^^^
    //            Chromeが自動的に送信元タブ情報を付与
    
    if (!tabId) {
      sendResponse({ success: false, error: 'No tab ID available' });
      return false;
    }
    
    injectMainScript(tabId)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});
```

### なぜこれで動くのか？

1. Content ScriptがWebページ上で実行される
2. `chrome.runtime.sendMessage()` でbackgroundにメッセージを送信
3. **Chromeが自動的に `sender` オブジェクトを生成**
   - `sender.tab.id` = Content Scriptが実行されているタブのID
   - `sender.url` = ページのURL
   - `sender.frameId` = フレームID
4. Backgroundが `sender.tab.id` からtabIdを取得
5. `chrome.scripting.executeScript({ target: { tabId } })` を実行

---

## 🎯 設計パターン

### 2つの注入パターンを実装

#### パターン1：手動注入（Popup経由）

```javascript
// Popup → Background
chrome.runtime.sendMessage({
  action: 'injectScript',
  tabId: currentTabId  // PopupはtabIdを取得可能
});
```

#### パターン2：自動注入（Content Script経由）

```javascript
// Content Script → Background
chrome.runtime.sendMessage({
  action: 'injectScriptAuto'  // tabIdなし
});

// Background側でsender.tab.idから取得
```

この分離により、**同じ注入ロジックを異なるコンテキストから呼び出せる**設計になっています。

---

## 📚 学んだこと

### 1. Content Scriptの制約
- Content Scriptは限定的なAPIしか使えない
- `chrome.devtools` は使用不可
- タブIDは直接取得できない

### 2. Message Senderの活用
- `chrome.runtime.onMessage` の `sender` パラメータは強力
- 送信元のタブ、URL、フレーム情報が自動付与される
- Content Scriptからの通信では必須のパターン

### 3. Chrome拡張機能のキャッシュ
- 単なる「リロード」ボタンでは古いコードが残る場合がある
- **削除→再読み込み**が確実
- Service Workerのキャッシュに注意

### 4. デバッグのコツ
- `console.log` で各ステップを追跡
- DevToolsでContent ScriptとBackgroundの両方を確認
- エラーメッセージの「どのAPIが」「何を要求しているか」を読み解く

---

## 🔧 今後の拡張に向けて

この修正により、以下が可能になりました：

✅ **自動注入**: ドメイン登録したサイトで自動的に有効化  
✅ **手動注入**: Popup経由で任意のタブで有効化  
✅ **再注入防止**: `injectedTabs` Setで管理  
✅ **Main World注入**: `EventTarget.prototype` の上書きが可能

このアーキテクチャは、Chrome拡張機能のベストプラクティスに沿った設計です。
