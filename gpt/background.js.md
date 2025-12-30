# `background.js` の解説

ファイルの役割（責務）

- 拡張の注入制御とストレージ管理を担う service worker（MV3）。  
- 手動注入（Popup 経由）と自動注入（content.js の要求）双方を受け取り、`chrome.scripting.executeScript` で `inject/main.js` を Main World に注入する。
- 注入済みのタブを `injectedTabs` という Set で管理し、再注入を防止する。

主要データ・変数

- `injectedTabs` (Set): 注入済みタブの ID を保持。タブ移動やクローズ時にクリアする。

主要関数

1. `injectMainScript(tabId)`
   - contract: 引数 `tabId` を受け取り、まだ注入されていなければ `chrome.scripting.executeScript` で `inject/main.js` を `world: 'MAIN'` で実行する。成功したら `injectedTabs.add(tabId)`。
   - エラー: Scripting API の失敗は例外として上げる。

2. `checkDomainEnabled(domain)`
   - chrome.storage.sync から `enabledDomains` を読み出し、指定ドメインが true かどうかを返す Promise を返す。

3. `enableDomain(domain)` / `disableDomain(domain)`
   - chrome.storage.sync にドメインを追加/削除し、成功可否を Promise で返す。

イベントハンドラ

- `chrome.runtime.onInstalled`: 初回インストール時に `enabledDomains` がなければ空オブジェクトを作る。
- `chrome.runtime.onMessage`: Popup や content からのメッセージを受け付ける。 `action` に応じて inject/check/enable/disable を行う。非同期処理には `return true` してチャネルを開いたままにする。
- `chrome.tabs.onRemoved` / `chrome.tabs.onUpdated`: タブ閉鎖やナビゲーション開始時に `injectedTabs` をクリーンアップする。

設計意図 / ルール

- 注入は必ず service worker 側で行い、Main World で実行されるコードは `inject/main.js` のみであることを保証する。
- `injectedTabs` を持つことで、同一タブに複数回注入されるのを防ぐ。これにより `EventTarget.prototype.addEventListener` 上書きの副作用を最小限にする。
- ストレージ操作はすべて `chrome.storage.sync` を通す。エラーハンドリングでは `chrome.runtime.lastError` を参照している。

注意点 / エッジケース

- サービスワーカーは短命なので、長時間状態を保持する必要がある場合は `injectedTabs` の内容が消える可能性がある（ただしタブの情報はブラウザ側の再生成で復旧可能）。必要なら persistent なストレージを使う設計が必要。
- `scripting.executeScript` が `world: 'MAIN'` を受けない環境やホスト権限不足で失敗する場合がある。
- タブ遷移や iframe などの複雑なケースで再注入ロジックをどう扱うか（現在はタブが loading になったら `injectedTabs` から除外している）。

要約

- `background.js` は注入のゲートキーパー（許可・記録）であり、実際の DOM 改変コードは持たない。これにより権限と注入の分離が実現されている。