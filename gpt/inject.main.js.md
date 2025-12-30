# `inject/main.js` の解説（Main World 注入スクリプト）

役割（責務）

- 実際にページの妨害を無効化する唯一のスクリプトで、Main World（ページ側コンテキスト）で実行されることが必須です。
- 重要な操作は: CSS による user-select の強制、妨害イベントの capture フェーズでの無効化、`EventTarget.prototype.addEventListener` の上書きによる新規禁止。

実装の主な要素

1. グローバルフラグ
   - `window.__JS_RIGHTCLICK_ENABLED__` をチェックして、二重注入を防止する。  
2. user-select 強制
   - style 要素を作成して `* { user-select: auto !important; }` を document.head に追加する。
3. forbiddenEvents 配列
   - ブロック対象イベント: `['selectstart', 'copy', 'contextmenu', 'dragstart', 'mousedown']`。
4. キャプチャフェーズでのイベント停止
   - `document.addEventListener(eventType, e => e.stopImmediatePropagation(), true)` により、ページ側のリスナーに到達する前にイベントを遮断する。
5. `addEventListener` の上書き
   - `const originalAddEventListener = EventTarget.prototype.addEventListener` を保存し、上書き関数は forbiddenEvents に含まれるタイプの登録は無視し、それ以外は元の関数を呼ぶ。

意図と理由

- Main World で実行することで、ページが自身のグローバルスコープで動作するリスナーや API を上書きすることが可能になる（Isolated World では prototype の変更はページ側には反映されない）。
- capture フェーズで stopImmediatePropagation することで、ページが登録した capture または bubble 前のハンドラに届くのを防ぐ。  
- `addEventListener` の上書きは、後から追加される妨害リスナーの登録を阻止する。

制約と注意点

- このスクリプトは DOM 変更や通信、storage 操作を **行わない** こと（設計上の制約）。主たる責務は「妨害を物理的に止める」こと。
- `stopImmediatePropagation()` による干渉は副作用を生む可能性がある（ページの通常機能も阻害する可能性がある）。ユーザーにそれを理解してもらう UI やオプションが必要。
- `forbiddenEvents` に何を含めるかは慎重に決める（過度に広げると誤動作のリスクが増える）。

セキュリティと互換性

- `EventTarget.prototype` を上書きする行為は強力だが、他の拡張やページのセキュリティ機構と衝突する可能性がある。  
- `world: 'MAIN'` での実行は必須。script タグ注入は禁止されているので `scripting.executeScript` を使う。  

要約

- `inject/main.js` はこのプロジェクトで最も重要なファイル。副作用を最小限にしつつページ側の妨害を無効化するためのシンプルで自己完結型の実装を目指している。