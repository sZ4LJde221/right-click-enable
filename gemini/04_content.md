# 04. content.js の解説

`content.js` は、Webページが開かれたときに自動的に実行される**偵察兵（スカウト）**です。
`manifest.json` で設定されているため、全てのページで読み込まれます。

このファイルの役割は非常にシンプルです。
**「ここは有効化対象のドメインですか？」** と Background（司令塔）に聞きに行くだけです。

## コード解説

```javascript
// 即時関数で囲む（グローバル汚染防止）
(function () {
    // 1. 今開いているページのドメイン（ホスト名）を取得
    // 例: "www.google.com"
    const domain = window.location.hostname;

    console.log('[Content] Checking domain:', domain);

    // 2. Backgroundに問い合わせる
    // "checkDomain" という合言葉でメッセージを送る
    chrome.runtime.sendMessage(
        { action: 'checkDomain', domain: domain },
        (response) => {
            // Backgroundから返事が返ってきたらここが動く

            // エラーチェック
            if (chrome.runtime.lastError) {
                console.error('[Content] Error checking domain:', chrome.runtime.lastError);
                return;
            }

            // 3. 返事の内容を確認
            // response.enabled が true なら「有効化対象だよ」という意味
            if (response && response.enabled) {
                console.log('[Content] Domain is enabled, requesting auto-injection');
                
                // 4. 有効化対象なら、改めて「注入して！」とお願いする
                chrome.runtime.sendMessage(
                    { action: 'injectScriptAuto' },
                    (injectResponse) => {
                        // 注入結果のログ出し
                        if (injectResponse && injectResponse.success) {
                            console.log('[Content] Auto-injection successful');
                        } else {
                            console.error('[Content] Auto-injection failed:', injectResponse?.error);
                        }
                    }
                );
            } else {
                // 有効化対象でなければ何もしない
                console.log('[Content] Domain not enabled for auto-injection');
            }
        }
    );
})();
```

## 初心者向けポイント

### 1. なぜ直接 `inject/main.js` を実行しないの？
`content.js` は **Isolated World**（隔離された世界）で実行されます。ここで `EventTarget.prototype.addEventListener` を書き換えても、Webページ本体のJavaScriptには影響を与えられません。
だから、`content.js` は自分では戦わず、強力な権限を持つ `background.js` に「Main World に部隊（`main.js`）を送ってください」とお願いする役割に徹しているのです。

### 2. なぜ `content.js` で設定（Storage）を直接見ないの？
技術的には `chrome.storage` を `content.js` から読み込むことも可能です。しかし、
- ロジックを `background.js` に集中させたい
- `background.js` の方が常に最新の状態を知っている
という設計思想から、あえてメッセージを送って聞いています。これを**SST (Single Source of Truth)** といいます。判断基準を一箇所にまとめることで、バグを減らせます。

### 3. 実行タイミング
`manifest.json` で `"run_at": "document_start"` と指定しているため、このスクリプトはHTMLの中身が表示されるより前、可能な限り早い段階で実行されます。これにより、ページが表示される前に自動有効化が間に合う可能性が高くなります。
