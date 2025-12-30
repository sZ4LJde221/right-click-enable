# 05. popup (popup.js / popup.html) の解説

`popup` フォルダにあるファイルは、ブラウザのツールバーにある拡張機能アイコンをクリックした時に表示される**小さなウィンドウ（操作パネル）**です。
ユーザーが手動で「このページで有効化したい」と指示を出す場所です。

## popup.html（見た目）
HTMLは非常にシンプルです。
- 現在のドメインを表示する場所
- ボタン3つ（有効化、無効化、閉じる）
- ステータス表示エリア
CSSでデザインを整えています。

## popup.js（ロジック）

### 1. 初期化処理（開いた瞬間）
```javascript
document.addEventListener('DOMContentLoaded', async () => {
    // 1. 今見ているタブの情報を取得
    // active: true (アクティブなタブ), currentWindow: true (今のウィンドウ)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // ... タブIDの保存 ...

    // 2. URLからドメインを抜き出す
    try {
        const url = new URL(tab.url);
        currentDomain = url.hostname;
        document.getElementById('currentDomain').textContent = currentDomain;
    } catch (error) {
        // http:// や https:// 以外のページ（設定画面など）ではエラーになる
        // ... エラー処理 ...
    }

    // 3. このドメインが既に有効化リストに入っているか確認
    chrome.runtime.sendMessage(
        { action: 'checkDomain', domain: currentDomain },
        (response) => {
            isDomainEnabled = response && response.enabled;
            updateUI(); // 画面のボタンを切り替える
        }
    );
});
```
Popupが開かれた瞬間に、「今どのサイトを見ているか」を確認し、それに応じて画面表示を変えています。

### 2. ボタン操作（有効化ボタン）
```javascript
document.getElementById('enableDomain').addEventListener('click', async () => {
    try {
        // 1. Backgroundに「このドメインをリストに追加して」と依頼
        await chrome.runtime.sendMessage({
            action: 'enableDomain',
            domain: currentDomain
        });

        // 2. Backgroundに「このタブにスクリプトを注入して」と依頼
        const injectResponse = await chrome.runtime.sendMessage({
            action: 'injectScript',
            tabId: currentTabId
        });

        if (injectResponse && injectResponse.success) {
            // 成功したら画面更新
            isDomainEnabled = true;
            updateUI();
            showStatus('有効化しました！', 'success');
        }
    } catch (error) {
        // ...
    }
});
```
ここでも、自分で直接処理をするのではなく、`sendMessage` を使って Background に作業を依頼しています。Popupはあくまで「リモコン」であり、実際の処理は本体（Background）が行うという役割分担です。

## 初心者向けポイント

### 1. ポップアップは「使い捨て」
Popupウィンドウは、開くたびに HTML/JS がゼロから読み込まれ、閉じると完全に消滅します。
変数の値なども全て消えます。
だから、状態（どのドメインが有効かなど）はPopup内で保持せず、毎回 `background.js` や `storage` に確認しに行かなければなりません。

### 2. URLの解析
`new URL(tab.url)` は便利なブラウザ標準機能です。
`https://www.example.com/path/to/page?query=1` のような長いURLから、
`.hostname` を使うだけで `www.example.com` だけを簡単に取り出せます。
手動で文字列操作をするより確実で安全です。

### 3. UIの切り替え
`updateUI()` 関数の部分で、状態に応じてボタンの表示/非表示（`display: none` / `block`）を切り替えています。
ReactやVueなどのフレームワークを使わない、素のJavaScript（Vanilla JS）でのDOM操作の基本形です。
