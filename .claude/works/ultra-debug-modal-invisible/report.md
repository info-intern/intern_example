# コード「1」読み取り後に何も起きない — 根本原因調査

**Date**: 2026-06-30
**Status**: CONFIRMED

## Problem Statement

iPhone 11 + IroatoReader の WebView 上で動く備品棚卸アプリにおいて、カメレオンコード「1」を実機で読み取ると、リーダー画面に紐づく商品名「ノートPC 13インチ」が表示される（＝認識・displayData は正常動作）。しかしその後、本来表示されるべき「自動撮影 — 保存確認」モーダル（`#modal-confirm`）が画面に現れず、ユーザーには「何も起きない」ように見える。

## Root Cause

確認モーダルは **JS 上は正しく表示処理まで到達している**（`hidden` 解除済み・`display:grid`・実サイズあり・ページリロード無し）が、**iOS の WebView が `display:none → display:grid` への切替時に CSS 入場アニメーションを発火させず、`animation-fill-mode: both` が `@keyframes` の `from { opacity: 0 }` 状態をそのまま保持したため、モーダルが「表示状態なのに完全に透明（opacity:0）」で固定され、視覚的に見えなかった**。

これは確認モーダルだけでなく、同じ `.modal` / `.modal__card` を使う汎用ダイアログ（未登録コード・取り違え確認）と写真ビューアにも共通して発生する。つまり「認識後に出るはずの“あらゆるモーダル”が透明で見えない」状態であり、ユーザーから見れば一様に「何も起きない」と観測される。

この根本原因は build-H（コミット `b607e2c`）で `animation-fill-mode: both → forwards` ＋ `opacity: 1` 明示により修正済み。**症状が現在も続いている場合、その原因は本修正（build-H）が実機にロードされていない（WebView / GitHub Pages のキャッシュ）こと**であり、コードロジック側の不具合ではない。

## Evidence

| # | Finding | Source |
|---|---------|--------|
| 1 | コード「1」は台帳 `EQ-0001`（`ccCode:"1"`, name「ノートPC 13インチ」）に対応。`displayData["1"]="ノートPC 13インチ"` が生成され、リーダーの認識表示に出る | [js/seed-data.js:12](https://github.com/info-intern/intern_example/blob/b607e2c6fb9d12afa90d185201762063c323fb5e/js/seed-data.js#L12), [js/reader.js:33-39](https://github.com/info-intern/intern_example/blob/b607e2c6fb9d12afa90d185201762063c323fb5e/js/reader.js#L33-L39) |
| 2 | `byCcCode("1")` は `parseInt` で 1 に正規化し `EQ-0001` に一致するため、「未登録コード」分岐には入らず確認モーダル経路へ進む | [js/equipment.js:25-29](https://github.com/info-intern/intern_example/blob/b607e2c6fb9d12afa90d185201762063c323fb5e/js/equipment.js#L25-L29) |
| 3 | 読み取りコールバックは発火している。build-G の実機ログ目的が「ロジックは openConfirm まで到達するが実機でモーダルが見えない事象の切り分け」と明記。openConfirm は read コールバック → onResult → handleScanResult からのみ呼ばれるため、コールバック発火は確定 | コミット `dd76905`（build-G）コミットメッセージ／[js/reader.js:74-119](https://github.com/info-intern/intern_example/blob/b607e2c6fb9d12afa90d185201762063c323fb5e/js/reader.js#L74-L119) |
| 4 | 実機ログ判定：`modal-confirm` が `display:grid`・実サイズあり・`hidden` 解除・**リロード無し**なのに画面に出ない＝`opacity:0` 固定、と build-H コミットで結論 | コミット `b607e2c`（build-H）コミットメッセージ |
| 5 | 透明化の機序：`.modal { animation: fadeIn 0.2s both }` / `.modal__card { animation: cardIn ... both }`。`@keyframes fadeIn` は `from{opacity:0}`、`cardIn` も `from{opacity:0}`。`both` は入場アニメ未発火時に `from` 状態（opacity:0）を保持する | 修正前 [css/style.css](https://github.com/info-intern/intern_example/blob/b607e2c6fb9d12afa90d185201762063c323fb5e/css/style.css)（build-H diff の `-animation: fadeIn 0.2s both` 行）, [css/style.css:1095](https://github.com/info-intern/intern_example/blob/b607e2c6fb9d12afa90d185201762063c323fb5e/css/style.css#L1095), [css/style.css:1216-1219](https://github.com/info-intern/intern_example/blob/b607e2c6fb9d12afa90d185201762063c323fb5e/css/style.css#L1216-L1219) |
| 6 | 修正後の現行 CSS は `animation: ... forwards` ＋ `opacity: 1` を明示。アニメ未発火でも基準 opacity:1 が効き、モーダルは見える | [css/style.css:1198-1199](https://github.com/info-intern/intern_example/blob/b607e2c6fb9d12afa90d185201762063c323fb5e/css/style.css#L1198-L1199), [css/style.css:1210-1211](https://github.com/info-intern/intern_example/blob/b607e2c6fb9d12afa90d185201762063c323fb5e/css/style.css#L1210-L1211) |
| 7 | 過去の lessons にも「デスクトップChromeで正常でも実機iOS（IroatoReaderのWebView）で崩れる」「最新CSS機能はフォールバック必須」と記録あり。本件と同系統 | tasks/lessons.md（2026-06-30 のエントリ） |
| 8 | boot ログは build タグ（`v2.1-debug-H`）と `href` を localStorage に永続記録する設計で、キャッシュ／リロード判定用に意図的に作られている | [index.html:356-357](https://github.com/info-intern/intern_example/blob/b607e2c6fb9d12afa90d185201762063c323fb5e/index.html#L356-L357) |

## Investigation Timeline

| Hypothesis | Verdict | Summary |
|------------|---------|---------|
| 読み取りコールバックが発火していない | DISPROVED | build-G ログで openConfirm まで到達済みと確認（証拠#3） |
| 読み取り後にページがリロードされ JS コンテキスト／コールバックが破棄される | DISPROVED | build-H 実機ログで「リロード無し」と確認（証拠#4）。boot 行も増えていない |
| コード「1」が台帳に紐づかず処理が止まる | DISPROVED | `byCcCode("1")`→`EQ-0001` に一致（証拠#2）。仮に未一致でも別モーダルが出るだけ |
| モーダルは表示処理されるが iOS WebView で透明（opacity:0）固定 | CONFIRMED | 実機ログ＋CSS の `fill-mode:both`＋`@keyframes from{opacity:0}` が一致（証拠#4・#5） |
| 修正（build-H）後も症状が続くのは実機にロードされていない（キャッシュ） | CONFIRMED（条件付き） | 修正は HEAD に存在（証拠#6）。残存時はキャッシュが唯一の整合的説明。boot ログの build タグで確定可能（証拠#8） |

## Debate Log

### Hypothesis: モーダルが opacity:0 で透明固定（本命）
- **Finding**: 実機ログで `#modal-confirm` は `display:grid`・実サイズあり・`hidden` 解除・リロード無し。それでも不可視。レイアウトされ DOM 上に存在する非ゼロサイズ要素が見えなくなる主因は opacity:0。当時 `.modal`/`.modal__card` には `animation: ... both` が付き、`@keyframes` の `from{opacity:0}`。iOS WebView は `display:none→grid` 切替でアニメを発火しないことがあり、`both` の backwards 充填で `from`（opacity:0）に固定される。
- **Challenge（反証の試み）**: 「不可視は backdrop-filter や z-index、別要素の被りでは？」「`forwards` でも発火したら結局 opacity:1 になるだけで、未発火が前提なのは推測では？」
- **Resolution**: opacity 以外に当該モーダルを透明化し得るルールは CSS 上に存在しない（`.modal`/`.modal__card` で opacity を触るのは当該アニメのみ）。z-index は 70 で最前面、背景被り要素も無い。`forwards` は「アニメが発火すれば to{opacity:1}、未発火なら base の opacity:1」のいずれでも可視になり、both（未発火時 opacity:0）との差が修正の本質。実機ログという一次証拠と CSS の機序が一致するため CONFIRMED。

### Hypothesis: コールバック未発火 / ページリロード（対抗仮説）
- **Finding**: いずれも「認識後に何も起きない」を説明し得る古典的パターン。
- **Challenge**: 実機ログが両者を直接否定するか。
- **Resolution**: build-G が openConfirm 到達を、build-H が「リロード無し」を実機ログで明示（証拠#3・#4）。両仮説とも DISPROVED。

## Recommendations

1. **まず build-H が実機にロードされているか確認する（最優先）**
   実機でアプリを開き、右下の 🐞 ボタンでデバッグログを表示。最上部の `===== boot =====` 行に `v2.1-debug-H` が出ているか確認する（[index.html:356](https://github.com/info-intern/intern_example/blob/b607e2c6fb9d12afa90d185201762063c323fb5e/index.html#L356)）。
   - **古いタグ（debug-G 以前）が出る場合** → キャッシュが原因。WebView/GitHub Pages のキャッシュをクリアして再読込（ハードリロード、もしくはURLに `?v=H` 等のクエリを付与）すれば解消する見込み。
   - **`v2.1-debug-H` が出るのにまだ不可視の場合** → 本レポートの想定外。`openConfirm後 hidden=… display=… size=…` ログ（[js/main.js:453-460](https://github.com/info-intern/intern_example/blob/b607e2c6fb9d12afa90d185201762063c323fb5e/js/main.js#L453-L460)）の実値を採取して再調査する。

2. **デプロイのキャッシュ対策（恒久対応の検討）**
   実機（外部アプリの WebView）はアセットを強くキャッシュする。`css/style.css`・`js/*.js` の参照にバージョンクエリ（`?v=YYYYMMDD`）を付けるか、Pages 側のキャッシュ制御を見直すと、今後「修正したのに反映されない」事故を防げる。

3. **同系統の再発防止**
   本件は lessons.md の「実機iOS WebView では最新CSS機能・アニメ挙動がデスクトップChromeと異なる」系の一例。`hidden`（display 切替）と CSS アニメーションを併用する表示制御では、**入場アニメに依存して可視性を決めない**（基準スタイルで可視を担保し、アニメは装飾に留める）方針を徹底する。

---
*本レポートは原因特定のみを目的とし、ソースの修正は行っていない（build-H の修正は本調査以前に適用済み）。*
