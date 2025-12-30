# 拡張機能概要ドキュメント

このドキュメントは、`right-click-enable` 拡張機能の全体像（各ファイルの役割・プロジェクト設計ルール）をまとめ、別の拡張機能を作る際の応用例を示します。

## 1. この拡張機能の目的

- Web ページ側が仕掛けた「コピー・選択・右クリックなどの妨害」をユーザー側で無効化する。  
- ユーザー操作（Popup）やドメイン単位の永続設定を起点とし、必要なときだけ Main World にコードを注入して妨害を解除する。

## 2. ファイル／ディレクトリ別の役割（短く）

- `manifest.json`  
  - 拡張の定義。権限（permissions / host_permissions）、background（service worker）、content script、popup/options の登録を行う。

- `background.js`  
  - service worker。注入制御（いつ・どのタブに inject するか）とストレージ管理（`enabledDomains`）を担当する。  
  - `chrome.scripting.executeScript` を使って `inject/main.js` を Main World に注入する。

- `content.js`  
  - Isolated World で動く軽量ブリッジ。現在のドメインを取得し、`background` に「このドメインが有効か？」を問い合わせる。  
  - 自動注入が必要な場合は background に inject をリクエストするだけで、実行は background に任せる。

- `inject/main.js`  
  - Main World に注入される唯一の実体。DOM やイベントの扱いを行い、妨害停止のために prototype 上書きやキャプチャでのイベント停止を行う。  
  - 通信やストレージ参照は行わない（単一責務）。

- `popup/`（`popup.html` / `popup.js`）  
  - ユーザー操作起点。現在タブのドメイン表示、即時注入、ドメインの永続化（有効化/無効化）を行う。

- `options/`（`options.html` / `options.js`）  
  - 永続設定（ドメイン一覧）の管理 UI。ユーザーが登録・削除・オンオフできる。

## 3. このプロジェクトで守るべきルール（設計ルール）

1. Main World 注入が必須
   - `EventTarget.prototype.addEventListener` のようなグローバルな振る舞いを変えるには、ページのコンテキスト（Main World）で実行する必要がある。Isolated World（content script）では効果が及ばないため、必ず `scripting.executeScript` で `world: 'MAIN'` を指定して注入する。

2. 注入ロジックは 1 つに限定する（単一責務）
   - `inject/main.js` が妨害解除の唯一の実体であること。background は注入を決定するだけ、content は判断のみ、inject スクリプトは DOM に対してのみ操作する。

3. 常時注入は行わない
   - ユーザーの操作や設定に基づき必要なときだけ注入する。常時（all_urls の script タグ挿入で無差別に）注入すると副作用やプライバシー問題、拡張の審査での問題が生じる。

4. DOM 改変と通信（外部へ送信）を分離する
   - `inject/main.js` は外部通信や storage の読み書きを行わず、ページ内で完結する操作のみを行う。これにより実行時の権限を限定し、安全性を確保する。

5. 多重注入の防止
   - グローバルフラグ（例: `window.__JS_RIGHTCLICK_ENABLED__`）と background 側の `injectedTabs` で同一タブへの二重注入を防ぐ。

6. 設定は単純に保つ
   - ストレージのスキーマは単純な key:value（例: `{ enabledDomains: { 'example.com': true } }`）。正規表現やワイルドカードは使わない（実装と判定を単純化するため）。

7. MutationObserver・CSS-only 実装の禁止
   - 設計方針上、MutationObserver や CSS のみでの回避は許可していない（about.md の絶対条件）。ただし実務上は例外的に検討するケースもある。

## 4. 権限（Permissions）と設計上の注意点

- `scripting` — Main World へスクリプトを注入するために必須。  
- `storage` — 設定の永続化に使用。  
- `activeTab` — 現在のタブへ注入するための一時的なアクセス（popup からの注入で便利）。  
- `host_permissions` (`<all_urls>` は強力) — content script の登録や scripting の対象に必要。可能なら最小化する。

注意: `host_permissions` や `<all_urls>` はストアでの審査やユーザーの信頼に影響するため、公開前に最小権限化を検討する。

## 5. 実行フロー（高レベル）

1. ユーザーが popup で「このタブで有効化」するか、options でドメインを登録する。  
2. content.js がページロード時にドメインを問い合わせ、enabled なら background に自動注入リクエストを送る。  
3. background が `chrome.scripting.executeScript`（`world: 'MAIN'`）で `inject/main.js` を実行する。  
4. `inject/main.js` がグローバルフラグを立て、CSS とイベント操作で妨害を無効化する。

## 6. 別の拡張機能を作るときの応用例（設計テンプレート）

以下は、このアーキテクチャをベースに別の拡張機能（例: Auto Dark Mode / Media Unblocker）を作るためのガイドです。

### 例 A: Auto Dark Mode（ページを自動でダークモードにする拡張）

- 目的: サイトごとに常にダークモードを適用する（user が設定したサイトに対して自動で style を注入）。

設計（ファイル構成）:
- `manifest.json` — permissions: `scripting`, `storage`, `activeTab`（必要に応じ host_permissions を制限）。
- `background.js` — domain 設定の管理と注入コントロール。
- `content.js` — domain チェックのための軽量ブリッジ（現在のドメインを background に問い合わせる）。
- `inject/darkmode.js` — Main World 注入スクリプト。document.head に style を追加してダークテーマ CSS を適用する。外部通信や storage 参照は行わない。
- `popup` / `options` — ドメインごとのオン/オフ UI。

ストレージスキーマ例:
{
  enabledDomains: { "example.com": true },
  options: { mode: 'auto' }
}

注入時の振る舞い（`inject/darkmode.js`）:
- グローバルフラグで多重注入防止。
- head に `<style>` を追加して背景/文字色/リンク色を上書き（`!important` を利用）。
- 可能ならページ側のテーマ切替 UI を壊さないように最小限の上書きに留める。

メリット:
- `right-click-enable` と同じ分離原則を守ることで、安全かつ保守しやすい実装になる。

### 例 B: Media Unblocker（オートプレイ/広告による再生制限の回避）

- 目的: サイトがメディアの自動再生をブロックしている場合、ユーザーが明示的に有効化すると再生を補助するコードを注入する。

設計のポイント:
- `inject/main.js` 相当のスクリプトはメディア操作（play/pause）のフックやイベントを変更するため Main World 実行が必要。  
- ユーザー操作でのみ注入（自動注入は慎重に）。  
- Privacy と規約に注意（サイトの利用規約違反にならないように）。

## 7. 作るときのチェックリスト（最小ガイド）

1. 目的を 1 文で決める（単一責務）。
2. 実行が Main World を必要とするか確認する（グローバルな prototype 上書きが必要かなど）。
3. `manifest.json` の権限を最小化する（`<all_urls>` を避ける・必要なホストだけ許可する）。
4. 注入スクリプトは DOM 操作のみに限定し、通信・ストレージは background 経由にする。  
5. 多重注入防止の仕組みを入れる（グローバルフラグ + background の記録）。
6. ユーザー操作起点のワークフロー（popup）と永続設定（options）を用意する。  
7. 拡張の副作用（他の拡張やページ機能の破壊）を考慮し、ユーザーに分かりやすい文言で注意を表示する。

## 8. まとめ

- `right-click-enable` は「注入の意思決定」と「注入される実体」を厳密に分離した設計を採用しています。  
- このパターンは多くの拡張機能に適用可能で、安全性と保守性を高めます。  
- 新しい拡張を作る際は、このテンプレート（manifest / background / content / inject / popup / options）を再利用すると良いでしょう。

---

ファイル: `gpt/extension_overview.md` に保存しました。必要であれば、この概要をより詳細に（逐次コードの抜粋と逐行解説、セキュリティの深掘り）拡張します。