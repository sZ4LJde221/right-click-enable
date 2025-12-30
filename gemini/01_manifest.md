# 01. manifest.json の解説

`manifest.json` は、Chrome拡張機能にとっての**「身分証明書」兼「設定ファイル」**です。
拡張機能を作る時は、必ずこのファイルから始まります。

## コード解説

```json
{
    // マニフェストのバージョン。現在は "3" が最新の標準です。
    "manifest_version": 3,

    // 拡張機能の名前
    "name": "JS Right-Click Enabler",

    // バージョン番号。更新するたびに少しずつ上げます。
    "version": "1.0.0",

    // 拡張機能の説明文。Chromeウェブストアなどで表示されます。
    "description": "Disable copy/selection/right-click restrictions on web pages",

    // 【重要】権限（Permissions）の設定
    // Chromeに対して「この機能を使わせてください」と申請するリストです。
    "permissions": [
        "scripting",   // プログラムからJavaScriptをWebページに注入するために必要
        "storage",     // 設定（有効化ドメインなど）を保存するために必要
        "activeTab"    // 現在開いているタブを操作するために必要
    ],

    // どのサイトでこの拡張機能を動かすか。
    // "<all_urls>" は「インターネット上の全てのサイト」という意味です。
    "host_permissions": [
        "<all_urls>"
    ],

    // 裏方（バックグラウンド）で動くスクリプトの指定
    // Service Workerとして動作し、常駐せずに必要な時だけ起きます。
    "background": {
        "service_worker": "background.js"
    },

    // Webページが開かれた時に自動で読み込まれるスクリプト（偵察兵）
    "content_scripts": [
        {
            // 全てのURLでマッチさせる
            "matches": [
                "<all_urls>"
            ],
            // 実行するファイル
            "js": [
                "content.js"
            ],
            // いつ実行するか。"document_start" はページ読み込み開始直後。
            // 早く動くことで、ページのスクリプトより先にチェックなどができます。
            "run_at": "document_start"
        }
    ],

    // ツールバーのアイコンをクリックした時の挙動
    "action": {
        "default_popup": "popup/popup.html",  // ポップアップ画面のHTML
        "default_title": "JS Right-Click Enabler" // マウスオーバー時のタイトル
    },

    // 設定ページの指定
    "options_page": "options/options.html"
}
```

## 初心者向けポイント

### 1. `permissions` は必要最小限に
ここに書いた権限が多いほど、インストール時にユーザーに「この拡張機能は○○と××の権限を要求しています」と怖い警告が出ます。セキュリティ的にも、使うものだけを書くのが鉄則です。今回は「スクリプトの注入」「設定保存」「タブ操作」だけを使っています。

### 2. `manifest_version: 3` (MV3)
現在はバージョン3（MV3）で作るのがルールです。古い解説記事だとバージョン2（MV2）のものが多いので注意してください。MV3では `background` が `service_worker` になるなどの大きな変更があります。

### 3. `host_permissions`
どのサイトにアクセスするかを決めます。今回は「どんなサイトでも右クリック禁止を解除したい」ので `<all_urls>` ですが、特定のサイト（例：YouTubeだけ）専用のツールなら、`*://www.youtube.com/*` のように限定します。

---
**カスタマイズのヒント:**
もしアイコン画像を設定したい場合は、`"icons"` フィールドを追加します。
```json
"icons": {
  "16": "images/icon16.png",
  "48": "images/icon48.png",
  "128": "images/icon128.png"
}
```
