# 06. options (options.js / options.html) の解説

`options` フォルダにあるファイルは、拡張機能の**全体設定画面**です。
Popupは「今のページ」に対する操作ですが、Options画面は「登録済みの全ドメイン」を一覧で管理します。

## 主な機能
- 登録されたドメインの一覧表示
- 個別のON/OFF切り替え
- 削除機能

## コード解説（options.js）

### 1. データの読み込みと表示
```javascript
function loadDomains() {
    // Chromeの保存領域(Storage)からデータを全部取ってくる
    chrome.storage.sync.get(['enabledDomains'], (result) => {
        const enabledDomains = result.enabledDomains || {};
        renderDomains(enabledDomains); // 描画関数へ
    });
}
```
`chrome.storage.sync` は、Googleアカウントでログインしていれば、別のPCでも設定が同期される便利な保存領域です。

### 2. リストの描画（DOM生成）
```javascript
function renderDomains(enabledDomains) {
    const domainList = document.getElementById('domainList');
    // 一度中身を空にする
    domainList.innerHTML = '';
    
    // ドメインの数だけループしてHTML要素を作る
    Object.keys(enabledDomains).forEach(domain => {
        // ... div や button を document.createElement で作る ...
        // ... appendChild で画面に追加する ...
    });
}
```
ここもフレームワークを使わない基本のDOM操作です。
データを受け取り、ループで回して、HTML要素を動的に生成しています。

### 3. 削除機能
```javascript
function deleteDomain(domain) {
    if (!confirm(`${domain} を削除しますか？`)) {
        return; // キャンセルされたら終わり
    }

    chrome.storage.sync.get(['enabledDomains'], (result) => {
        const enabledDomains = result.enabledDomains || {};
        delete enabledDomains[domain]; // オブジェクトからキーを削除

        // 変更を保存
        chrome.storage.sync.set({ enabledDomains }, () => {
            // 保存が終わったら
            showStatus('削除しました', 'success');
            loadDomains(); // リストを再読み込みして表示を更新
        });
    });
}
```
データの更新フローは常に以下の通りです。
1. 現在のデータを取得 (`get`)
2. メモリ上でデータを書き換え
3. 保存 (`set`)
4. 画面を更新

## 初心者向けポイント

### 1. `chrome.storage.sync` vs `chrome.storage.local`
- `sync`: ユーザーがChromeにログインしていれば、他のデバイスと設定が同期されます。容量制限が小さめ（100KB程度）。設定などの軽いデータ向け。
- `local`: そのブラウザ内だけ。容量は大きい（5MB〜）。同期されない。
今回はドメインリストという軽いテキストデータなので、利便性を取って `sync` を使っています。

### 2. コールバック地獄（Callback Hell）への対処
このファイルでは昔ながらの `callback` スタイル（関数の引数に関数を渡す）を使っていますが、階層が深くなると読みづらくなります（`get` の中に `set` があり、その中に...）。
最近のJavaScriptでは、`background.js` の解説で見たように `Promise` や `async/await` を使って、これをスッキリ書くのが主流です。
今回はシンプルなコードなのでそのままですが、複雑になるようなら書き換えを検討すべきポイントです。

### 3. 動的なイベントリスナー
リストの項目（ドメイン）は動的に増減します。
HTMLに直接 `<button onclick="...">` と書くのではなく、JavaScriptの中で要素を作ったタイミングで `element.addEventListener` を設定しています。これが現代的なJavaScriptの書き方です。
