# 03. background.js の解説

`background.js` は、拡張機能の**司令塔**です。
Service Worker として動作し、ユーザー（Popup）やWebページ（Content Script）からの指示を受けて、適切な処理を行います。

## 主な役割
1. **メッセージの受信**: PopupやContent Scriptからの「注入して！」等の依頼を受け取る。
2. **スクリプトの注入**: `chrome.scripting.executeScript` を使って、実際に `main.js` をページに送り込む。
3. **設定の管理**: どのドメインが有効化されているかを保存・読み出しする。
4. **状態管理**: どのタブに既に注入したかを覚えておき、無駄な再注入を防ぐ。

## コードのポイント解説

### 1. メッセージリスナー
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 誰かからメッセージが届いたらここが動く
    
    if (message.action === 'injectScript') {
        // Popupから「手動で注入して」と言われたとき
        // ...
    }

    if (message.action === 'injectScriptAuto') {
        // Content Scriptから「自動で注入して」と言われたとき
        // ...
    }
    
    // trueを返すと、「後で非同期に返事をするよ」という意味になる
    // (これがないと、処理が終わる前に通信が切れてしまうことがある)
    return true; 
});
```
`onMessage` は拡張機能内の通信の窓口です。`action` という合言葉を決めて、どんな依頼かを判断しています。

### 2. スクリプトの注入（重要）
```javascript
async function injectMainScript(tabId) {
    // 既に注入済みなら何もしない
    if (injectedTabs.has(tabId)) {
        return;
    }

    try {
        // ここが注入の実行部分！
        await chrome.scripting.executeScript({
            target: { tabId: tabId }, // 対象のタブ
            files: ['inject/main.js'], // 注入するファイル
            
            // 【超重要】world: 'MAIN'
            // これを指定すると、Webページと同じ世界でスクリプトが動く。
            // 指定しないと 'ISOLATED' になり、Webページの変数を書き換えられない。
            world: 'MAIN', 
            
            injectImmediately: true // すぐに実行
        });

        // 注入したことを記録
        injectedTabs.add(tabId);
    } catch (error) {
        // エラー処理
    }
}
```
`world: 'MAIN'` がこの拡張機能の肝です。通常の拡張機能はセキュリティのため隔離された世界（Isolated World）で動きますが、今回はあえて相手の懐に入り込む必要があります。

### 3. Promiseを使った非同期処理
```javascript
async function enableDomain(domain) {
    return new Promise((resolve, reject) => {
        // chrome.storage は非同期（処理が終わるのに時間がかかる）
        chrome.storage.sync.get(['enabledDomains'], (result) => {
            // 読み込み完了後にここが動く
            // ... 保存処理 ...
            resolve(); // 完了報告
        });
    });
}
```
`chrome.storage` などのAPIは、結果がすぐに返ってきません。そのため `Promise` や `async/await` を使って、「処理が終わるまで待つ」書き方をしています。

### 4. タブのお掃除
```javascript
// タブが閉じられたら
chrome.tabs.onRemoved.addListener((tabId) => {
    injectedTabs.delete(tabId); // 記録から消す
});

// タブが更新（ページ遷移）されたら
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
        injectedTabs.delete(tabId); // 記録から消す（新しいページでは再注入が必要だから）
    }
});
```
タブはずっと同じ状態ではありません。閉じたり、別のURLに移動したりします。古い記録（`injectedTabs`）が残ったままだと、「まだ注入してないのに注入済みと勘違いする」バグになるので、こまめに掃除しています。

## 初心者向けポイント
- **Service Workerはすぐ寝る**: Backgroundスクリプトは、用事がないとすぐに停止（スリープ）します。なので、変数の値（`injectedTabs` など）は消えてしまう可能性があります。厳密に永続化したい場合は `chrome.storage` に保存する必要がありますが、今回は「ブラウザを開いている間の状態」で十分なので変数で管理しています。
- **非同期処理**: JavaScript（特に拡張機能）は非同期だらけです。「コードは上から下にすぐ実行されるとは限らない」と覚えておきましょう。`callback` や `Promise` の理解が必須になります。
