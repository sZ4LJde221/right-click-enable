# ① AIに渡すためのマスタードキュメント（最重要）

## 1. プロジェクト概要（必須）

### 目的

- Webページ上の **コピー・選択・右クリック等の妨害をJSレベルで完全に無効化**する
    
- ブックマークレットと **同等以上の効力**を持つ Chrome 拡張機能を作る.
元ファイルは以下
js-rightclick.js
    

### 非目的

- デザインの洗練
    
- 一般ユーザー向け安全設計
    
- CSP 回避の保証
    
- Firefox対応
    

---

## 2. 絶対条件（AIに必ず守らせる）

- **Main World にコードを注入すること**
    
- **EventTarget.prototype.addEventListener を上書きすること**
    
- **常時注入しない**
    
- **ユーザー操作（Popup）を起点にする**
    
- **同一タブへの再注入は禁止**
    
- **設定はドメイン単位のみ**
    

CSS-only 実装は禁止。  
MutationObserver は禁止。

---

## 3. アーキテクチャ（固定）

```
extension/
├ manifest.json
├ background.js
├ content.js
├ inject/
│  └ main.js
├ popup/
│  ├ popup.html
│  └ popup.js
└ options/
   ├ options.html
   └ options.js
```

### 責務分離（重要）

|ファイル|責務|
|---|---|
|inject/main.js|ページ破壊ロジック（唯一の実体）|
|background.js|状態管理・注入制御|
|content.js|軽量ブリッジ（判断しない）|
|popup|ユーザー操作|
|options|ドメイン管理|

---

## 4. Main World 注入仕様（核心）

### 実装要件

- `chrome.scripting.executeScript`
    
- `world: "MAIN"`
    
- **scriptタグ注入は禁止**
    
- グローバルフラグを必ず立てる
    

### main.js の責務（これ以外やるな）

- user-select 強制
    
- 妨害イベントの capture 停止
    
- addEventListener の上書き
    
- 自身の多重実行防止
    

通信・設定参照・ログは禁止。

---

## 5. 実行フロー（固定）

### 手動実行（Popup）

1. Popup → background
    
2. background → scripting.executeScript
    
3. main.js 実行
    
4. window フラグ立つ
    
5. 再実行不可
    

### 自動実行（ドメイン有効時）

1. タブ更新
    
2. content.js 起動
    
3. background にドメイン照会
    
4. 有効なら注入
    

---

## 6. ストレージ仕様（単純）

```js
{
  enabledDomains: {
    "example.com": true,
    "foo.bar": true
  }
}
```

- 正規表現なし
    
- ワイルドカードなし
    
- 完全一致のみ
    

---

## 7. Popup UI 要件（最低限）

- 現在のドメイン表示
    
- ボタン3つ
    
    - このタブで有効化
        
    - このドメインで常時有効化
        
    - 停止（何もしない）
        

見た目は HTML + button で十分。

---

## 8. Options UI 要件

- ドメイン一覧
    
- 削除ボタン
    
- ON/OFF トグル
    

---

## 9. 禁止事項まとめ（AI暴走防止）

- ❌ CSS-only モード
    
- ❌ MutationObserver
    
- ❌ all_urls 常時注入
    
- ❌ prototype 上書きを Isolated World で行う
    
- ❌ 独自最適化
    
- ❌ 勝手な安全対策
    

---

# ② 作成順序（これを1つずつやる）

**絶対に飛ばすな**

---

## STEP 1：manifest.json

- MV3
    
- permissions 最小
    
- content_scripts は空 or 最小
    
- scripting 使用
    

👉 ここだけで一度レビュー

---

## STEP 2：inject/main.js

- 単体で即実行できる形
    
- IIFE
    
- グローバルフラグあり
    

👉 **最重要ファイル**

---

## STEP 3：background.js

- 注入関数
    
- タブID管理
    
- storage 読み書き
    

---

## STEP 4：content.js

- ドメイン取得
    
- background への問い合わせ
    
- 注入要求のみ
    

---

## STEP 5：popup.html / popup.js

- 手動注入
    
- 状態表示
    

---

## STEP 6：options.html / options.js

- ドメイン管理
    

---

# 次にやること

まず **STEP 1：manifest.json** を作る。  
そのために次の指示を出す。

> 「上記ドキュメントを前提として、  
> Chrome Manifest V3 の manifest.json を作成せよ。  
> 不要な permission は入れるな。」

次の返答で **STEP 1 だけ**を作る。