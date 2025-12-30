# プロジェクト概要（about.md のまとめ）

このプロジェクトは、Web ページ上でサイト側が行う「コピー・選択・右クリックの制限」を JavaScript レベルで無効化する Chrome 拡張機能です。目的、アーキテクチャ、実行フロー、制約（禁止事項）が `about.md` にまとまっています。

主なポイント

- 目的: ページ側による妨害（selectstart, copy, contextmenu 等）を無効化する。ユーザーの操作に基づいて注入する。  
- アーキテクチャ: `inject/main.js` が唯一の「実体（Main World で動く）」で、`background.js` が注入制御、`content.js` は軽量ブリッジ、`popup` と `options` が UI を担う。  
- 実装制約: Main World に注入、EventTarget.prototype.addEventListener の上書き、MutationObserver や CSS-only 実装は禁止、常時注入は避ける（ユーザーアクションやドメイン有効化がトリガー）。

ストレージ仕様

- `enabledDomains` にドメインごとの真偽値を保持。正規表現やワイルドカードは使わない（完全一致）。

注記／運用

- `scripting.executeScript` を使って `world: "MAIN"` で `inject/main.js` を実行する。  
- `inject/main.js` は DOM 変更や通信、ストレージ参照を行わず、ページ内部で即時に妨害を無効化する単一責務に限定する。  

次の作業は、各ファイルの詳細な解説ドキュメントを作成することです。