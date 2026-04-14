# Implementation Readiness Checklist

## 1. 目的

このチェックリストは、「もうコードを書いてよいか」を判断するためのもの。  
1 つでも未決の項目が多いまま実装を始めると、後工程で構造から壊れる。

## 2. 着手前チェック

### 仕様

- [x] ロボット種別が `scout / collector / marine_life / trash` で固定されている
- [x] スコア式が固定されている
- [x] marine life のストレス増減条件が固定されている
- [x] バッテリー停止と回復条件が固定されている
- [x] `steps` の終了条件が固定されている

### API / Schema

- [x] Config schema が固定されている
- [x] Snapshot schema が固定されている
- [x] Agent 共通項目が固定されている
- [x] Stats と Score の責務分離が定義されている
- [x] event の最小セットが決まっている

### 実装方針

- [x] engine を主導で改修する方針で合意している
- [x] 既存 agent の再利用方針が決まっている
- [x] frontend は backend 契約確定後に変更する方針で合意している
- [x] 受け入れ条件が `DELIVERY_MILESTONES.md` に記載されている

## 3. 現時点の判定

### 判定

- 現行システムは保守・拡張フェーズに入ってよい
- 小規模な機能追加は着手可能
- 契約変更を含む改修も、CI と文書更新を前提に着手可能

### 理由

- 仕様の大枠は固まった
- score / role / event / 終了条件はコードと文書の双方で定着した
- engine ロジックに直結する主要論点は `OPEN_QUESTIONS.md` で決定済み
- 未完了なのは再設計ではなく、保守性向上と追加機能の実装である

## 4. 最低限の Go 条件

以下がすべて満たされれば、Phase 1 の実装に入ってよい。

- [x] Config schema 確定
- [x] Snapshot schema 確定
- [x] Agent 共通項目確定
- [x] score 項目確定
- [x] role 一覧確定
- [x] 初回マイルストーンの受け入れ条件確定
- [x] frontend build が通る
- [x] backend unit test が通る
- [x] Docker build が通る

## 5. Stop 条件

以下の状態では実装を止める。

- schema 名だけ決まって意味が未定義
- `predator` をそのまま `collector` 扱いしようとしている
- frontend だけ先に書き換えようとしている
- ロボット共有情報の構造が未定義
- 仕様変更が issue ではなく口頭だけで増えている
- frontend dependency を変えたのに lockfile と CI を確認していない
