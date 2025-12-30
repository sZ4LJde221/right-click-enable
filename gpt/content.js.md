# `content.js` の解説

ファイルの役割（責務）

- サイト上のページで軽量に動作し、現在のドメインが自動注入（常時有効）設定されているか `background` に問い合わせるブリッジ役です。
- 重要: `content.js` は Isolated World で実行されるため、DOM を直接攻撃したり、prototype を書き換えたりしない。決定とリクエストのみ行う。

処理フロー（簡潔）

1. ページロード時に実行され、`window.location.hostname` からドメインを取得する。  
2. `chrome.runtime.sendMessage({ action: 'checkDomain', domain })` で background に問い合わせる。  
3. background から `enabled: true` が返れば、自動注入を要求する `chrome.runtime.sendMessage({ action: 'injectScriptAuto' })` を送る。

主な実装ポイント

- 実行タイミングは `manifest.json` の `run_at: 'document_start'` によって早期に行われる。  
- `content.js` 自体は注入を行わず、background に tabId を通さずに送信する（service worker 側は sender.tab から tabId を取得する）。

注意点 / エッジケース

- `window.location.hostname` が空の場合や `file://` のようなスキームだと正しく動作しないことがある（エラーハンドリングは必要）。  
- `chrome.runtime.lastError` をチェックしているが、より詳細な再試行やログが必要な場合は拡張のロギング方針を決める。  
- content script 自体が早期に走るため、ページ側のスクリプトが later load した場合は注入タイミングの問題が起き得る。現在の仕様では domain 有効なら background に注入を依頼し、background が `scripting.executeScript` で `inject/main.js` を Main World に注入する。

要約

- `content.js` は判断ロジックだけを持つ軽量ブリッジ。安全に、かつ最小限の権限で自動注入のトリガーを提供する。