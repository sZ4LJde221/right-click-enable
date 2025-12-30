# `manifest.json` の解説

目的

- 拡張機能全体のメタ情報、必要な権限、background/service worker、content script の登録、ポップアップやオプションページを定義します。

重要なフィールド

- `manifest_version: 3` — MV3 を使用。
- `permissions`: `scripting`, `storage`, `activeTab` が宣言されています。
  - `scripting` は `chrome.scripting.executeScript` を利用するため必須。
  - `storage` はドメイン有効化設定の保存に使用。
  - `activeTab` は現在のタブへの一時的なアクセス（注入時）に便利。
- `host_permissions`: `<all_urls>` が指定されています。これは content script のマッチや scripting の対象にアクセスするためのホスト許可です。
- `background.service_worker`: `background.js` を指定 — 注入制御・状態管理を行う。
- `content_scripts`: `content.js` を `document_start` で全 URL に対して登録しています。
- `action.default_popup`: `popup/popup.html`、`options_page`: `options/options.html`

設計意図／注意点

- `content.js` は軽量ブリッジとして全ページで走ってドメインが有効か確認するために登録されています。常時 `inject/main.js` を注入してしまうとユーザビリティやセキュリティの問題になるため、content script は判断のみを行い、実際の Main World 注入は `background.js`（scripting API）に委ねています。
- `host_permissions` に `<all_urls>` を入れると拡張の公開で審査が厳しくなる可能性があるため、実運用であれば必要最小限にすることを検討します。

実装の最小契約（Contract）

- 入力: manifest によってブラウザが拡張を読み込む。
- 出力: ブラウザは `background.js` を service worker として起動し、`content.js` を全ページで実行する。
- エラー: ホスト権限が不足すると `scripting.executeScript` が失敗する。

簡単な境界ケース

- 非標準 URL（file: など）では `content.js` の `window.location.hostname` が空または例外になる可能性がある。
- `host_permissions` が厳格すぎると自動注入が機能しない。
