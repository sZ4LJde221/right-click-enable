# `popup/popup.js` の解説

役割

- Popup UI の振る舞いを制御するスクリプト。現在タブのドメイン状態を読み取り、UI を更新し、ユーザーアクションに応じて background にメッセージを送る。

主要変数

- `currentDomain` (string): 現在表示中のドメイン。
- `currentTabId` (number): 現在アクティブなタブ ID。
- `isDomainEnabled` (boolean): ドメインが `enabledDomains` に登録されているか。

主要処理

1. 初期化 (`DOMContentLoaded` イベント)
   - `chrome.tabs.query({ active: true, currentWindow: true })` でタブ情報を取得。
   - URL から `hostname` を取り出し、`chrome.runtime.sendMessage({ action: 'checkDomain', domain })` で状態を問い合わせる。
   - 返答により `isDomainEnabled` をセットし、`updateUI()` を呼ぶ。

2. `updateUI()`
   - DOM の表示（有効／無効）とボタンの表示切替を行う。  

3. `enableDomain` ボタン押下処理
   - `enableDomain` を background に送信して保存し、続けて `injectScript` を送って即注入を試みる。
   - 成功すれば UI を更新して成功メッセージを表示する。

4. `disableDomain` ボタン押下処理
   - `disableDomain` を送信し、成功すれば UI を更新する。

5. `close` ボタン
   - `window.close()` によるポップアップの閉鎖。

注意点 / エッジケース

- `chrome.tabs.query` でタブが取得できない場合や URL が無効な場合のフォールバックが実装されている（ボタン無効化等）。  
- `enableDomain` の後に `injectScript` を行う設計により、ユーザーの期待する "即時効果" を提供しているが、`injectScript` が失敗する（権限不足など）とユーザー体験が損なわれる可能性がある。
- 非同期メッセージの戻り値チェックを適切に行っており、失敗時にエラーメッセージを表示している。

要約

- `popup.js` は現状シンプルかつ実用的で、ユーザーが現在のタブに対して即時注入するワークフローと、そのドメインの永続化を行うワークフローを提供する。