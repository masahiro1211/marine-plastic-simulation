# Documents

このディレクトリは、実装判断と現在の到達状態を短く共有するための文書群である。  
詳細な API 契約、実行挙動、開発フローは `program_docs/` に置き、`documents/` では「今このリポジトリがどういう状態か」と「どこを根拠に次の変更を入れるか」を管理する。

## まず読む順番

1. `documents/00_index/DOCUMENT_STRUCTURE.md`
2. `documents/01_source_of_truth/IMPLEMENTATION_SOURCE_OF_TRUTH.md`
3. `documents/03_readiness/IMPLEMENTATION_READINESS_CHECKLIST.md`
4. `documents/04_delivery/DELIVERY_MILESTONES.md`
5. `documents/06_open_questions/OPEN_QUESTIONS.md`

## フォルダ構成

- `00_index/`: 読み順とタスク束ね
- `01_source_of_truth/`: 実装判断の単一参照点
- `02_analysis/`: 現状差分とリスク
- `03_readiness/`: 実装着手可否
- `04_delivery/`: マイルストーンと完了条件
- `05_reference/`: ドメインモデルと API 基準
- `06_open_questions/`: 決定事項と今後の論点管理

## 現在の実装状態

- backend は `scout / collector / marine_life / trash` モデルへ移行済み
- frontend は React + TypeScript で新契約に追随済み
- CI では backend test、frontend build、`docker compose build` を検証対象としている
- frontend の lockfile は `yaml` を含めて CI 実行環境と整合するよう更新済み
- backend の主要 Python モジュールは Google docstring 形式で整備済み
- `docs/` は Git 管理対象ではなく、`documents/` と `program_docs/` を参照する運用にしている

## 詳細仕様の置き場

- 実行時の挙動: `program_docs/runtime_behavior.md`
- API と状態契約: `program_docs/api_contracts.md`
- Docker / テスト / CI: `program_docs/development_workflow.md`
- ドキュメント索引: `program_docs/README.md`

## 運用ルール

- `documents/` は実装判断を要約する README 的な文書群として扱う
- 詳細説明は `program_docs/` に追加する
- 実装判断は `01_source_of_truth/IMPLEMENTATION_SOURCE_OF_TRUTH.md` を最優先とする
- 実装完了後は「計画」ではなく「現在の状態」を反映するよう内容を更新する
