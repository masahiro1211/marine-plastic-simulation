# Open Questions

## 1. 決定済み事項

### DECISION: 終了条件

- シミュレーション終了条件は時間固定とする
- `steps` に達した時点で終了する

### DECISION: バッテリー回復

- バッテリー回復は拠点帰還方式とする
- 拠点は単一とする
- 拠点座標は固定とする
- 拠点は画面下部に配置する
- ごみ搬入と充電は同じ基地で扱う
- バッテリー 0 のロボットも低速帰還モードで自力帰還可能とする
- 帰還速度は後で調整可能なパラメータとして持つ

### DECISION: marine life のロボット接触・ゴミ誤飲

- 旧 stress 蓄積・消滅・再生成ルールは廃止する
- marine life は常に生存し、個体数は `marine_life_count` を維持する
- ロボットが `marine_life_avoid_radius` へ入った瞬間をエッジ検知して `robot_fish_contacts` を加算する
- `fish_eat_radius` 内のごみは偶発的に食べて消し、`fish_ate_trash` を加算する
- 接触・誤飲はスコア計算や events には載せず、backend stats のみで可視化する

### DECISION: trash の出現

- trash は初期配置のみではなく継続生成とする

### DECISION: 盤面モデル

- 位置計算は連続座標で扱う

### DECISION: UI パラメータ数

- ユーザーに常時公開する主要パラメータは 5 個程度を目安とする

### DECISION: score 係数

- score の係数は固定値に閉じず、調整可能な設計を維持する

### DECISION: scout 共有モード

- 初期実装では `全体共有` をデフォルトとする
- `近傍共有` は mode 追加で後追い対応する

### DECISION: collision 定義

- collision は半径ベースの当たり判定とする
- AABB やセルベース境界判定は初期実装では採用しない

## 2. 残っている未解決事項

- 現時点で実装と CI を止める未解決事項はなし
- 新しい論点が出た場合のみ、この節に `OPEN:` として追加する

## 3. 追加の決定事項

### DECISION: frontend dependency 管理

- frontend 依存変更時は `package-lock.json` を必ず同時更新する
- `npm ci` と `npm run build` をローカルで確認してから push する
- peer dependency の自動解決に依存しすぎず、必要なものは明示 dependency として持つ

### DECISION: コメント形式

- backend の Python コードは Google docstring 形式を基本とする
- frontend の TypeScript / TSX は JSDoc 形式で主要関数を説明する
- 実装変更時はコードコメントと `documents/` の更新をセットで行う

## 4. 実装に使える暫定方針

- 既存契約を尊重しながら `schema -> engine/api -> frontend -> docs` の順で更新する
- dependency 変更時は `ci -> build -> docs` の確認を追加する

## 5. 運用ルール

- 口頭で決まった事項はこのファイルに `DECISION:` または `OPEN:` として追記する
- 曖昧な日本語だけで残さず、実装可能な粒度まで落とす
- engine 実装を止める未解決事項が出た場合は、その都度 `OPEN:` を再追加する
