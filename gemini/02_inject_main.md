# 02. inject/main.js の解説（最重要）

このファイルは、**この拡張機能の心臓部**です。
`background.js` によってWebページの中に送り込まれ（注入され）、実際に右クリック禁止やコピー禁止を解除する仕事をします。

このスクリプトは **Main World**（Webページの元のJavaScriptと同じ世界）で実行されるため、Webページが設定した制限を直接上書きして無効化できます。

## コード解説

```javascript
// 即時関数 (IIFE) で囲む
// これにより、変数がグローバルスコープ（全体）に漏れ出すのを防ぎつつ、
// 定義した直後に実行されます。
(function () {
    'use strict'; // 厳格モード（エラーチェックを厳しくする）

    // 【多重実行防止】
    // 既にこのスクリプトが実行済みかどうかを確認するフラグ（旗）。
    // windowオブジェクトはページ全体で共有されるので、そこに目印をつけておきます。
    if (window.__JS_RIGHTCLICK_ENABLED__) {
        console.log('[JS Right-Click] Already injected, skipping');
        return; // 既に実行済みなら、何もしないで終了
    }

    // まだ実行してないなら、フラグを立てる（trueにする）
    window.__JS_RIGHTCLICK_ENABLED__ = true;

    console.log('[JS Right-Click] Injecting into Main World');

    // ---------------------------------------------------------
    // 1. CSSによる制限解除
    // ---------------------------------------------------------
    // ページによってはCSSで `user-select: none` (選択不可) にしている場合があるため、
    // 新しいスタイルタグを作って、それを強制的に `auto` (選択可能) に上書きします。
    const style = document.createElement('style');
    // `!important` は「最優先」という意味。既存のルールを無視して適用させます。
    style.innerHTML = '* { user-select: auto !important; -webkit-user-select: auto !important; }';
    document.head.appendChild(style); // <head>タグに追加して反映

    // ---------------------------------------------------------
    // 2. 禁止イベントの定義
    // ---------------------------------------------------------
    // Webサイトが「禁止」に使いたがるイベント名のリスト
    const forbiddenEvents = [
        'selectstart', // テキスト選択開始
        'copy',        // コピー操作
        'contextmenu', // 右クリックメニュー
        'dragstart',   // ドラッグ開始
        'mousedown'    // マウスクリック
    ];

    // ---------------------------------------------------------
    // 3. イベントの遮断（キャプチャフェーズ）
    // ---------------------------------------------------------
    // Webページ側が「右クリックされたら無効化する！」というプログラムを動かす前に、
    // この拡張機能が先にイベントを捕まえて、「そのイベントはなかったことにする」処理をします。
    
    forbiddenEvents.forEach(eventType => {
        // addEventListenerの第3引数 `true` が重要（キャプチャフェーズ）
        // イベントは 親要素(window) → 子要素(target) へ降りていき（キャプチャ）、
        // その後 子要素 → 親要素 へ戻ってきます（バブリング）。
        // `true` にすると、一番最初の「降りていく段階」でイベントを捕まえられます。
        document.addEventListener(eventType, function (e) {
            // イベントの伝播を止める。
            // これにより、Webページ側の「右クリック禁止スクリプト」までイベントが届かなくなります。
            e.stopImmediatePropagation();
        }, true); 
    });

    // ---------------------------------------------------------
    // 4. `addEventListener` の上書き（ハッキング）
    // ---------------------------------------------------------
    // サイトによっては、後からJavaScriptで「右クリック禁止」を追加してくる場合があります。
    // それを防ぐため、ブラウザ標準の `addEventListener` 関数そのものを書き換えます。

    // 元々の本物の関数をバックアップしておく
    const originalAddEventListener = EventTarget.prototype.addEventListener;

    // 新しい関数で上書き
    EventTarget.prototype.addEventListener = function (type, listener, options) {
        // 登録されようとしているイベントが、禁止リストに含まれているかチェック
        if (!forbiddenEvents.includes(type)) {
            // 禁止リストに含まれていなければ、元の関数を呼んで普通に登録させる
            originalAddEventListener.call(this, type, listener, options);
        }
        // もし禁止リストに含まれていたら（例：contextmenu）、
        // 何もしない（＝登録を無視する）。
        // これで、サイト側はイベントを登録したつもりでも、実際には登録されていません。
    };

    console.log('[JS Right-Click] Successfully injected - restrictions disabled');
})();
```

## 初心者向けポイント

### 1. なぜ `window` オブジェクトを使うの？
`window` はブラウザのJavaScriptにおける「一番外側の世界」です。ここに `__JS_RIGHTCLICK_ENABLED__` のような独自の変数をセットすることで、スクリプトが2回、3回と無駄に実行されるのを防いでいます。これを**冪等性（べきとうせい）の確保**といいます。

### 2. イベントの「キャプチャ」と「バブリング」
JavaScriptのイベントは「親から子へ（キャプチャ）」伝わり、ターゲットに届いた後、「子から親へ（バブリング）」戻っていきます。
- 通常の `addEventListener` は戻ってくる時（バブリング）に動きます。
- 第3引数を `true` にすると、降りていく時（キャプチャ）に動きます。
サイト側の禁止スクリプトより「先」に動くために、キャプチャフェーズを利用しています。

### 3. プロトタイプ汚染（Override）
`EventTarget.prototype.addEventListener` を書き換えるテクニックは強力ですが、危険も伴います。
これは、**ブラウザが元々持っている標準機能を、自作の関数にすり替える**行為です。
これによって、「右クリック禁止イベントを登録しようとしても、こっそり無視する」ということが可能になります。
これは通常のWeb開発では「やってはいけない禁じ手」とされることが多いですが、今回のような「制限解除ツール」では必須のテクニックです。
