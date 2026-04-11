# Documents

このディレクトリは、実装判断のための README 群を置く入口である。  
詳細な挙動、API、開発フローは `program_docs/` に寄せ、`documents/` では「何を根拠に実装するか」を短く管理する。

## まず読む順番

1. `documents/00_index/DOCUMENT_STRUCTURE.md`
2. `documents/01_source_of_truth/IMPLEMENTATION_SOURCE_OF_TRUTH.md`
3. `documents/02_analysis/CURRENT_STATE_GAP_ANALYSIS.md`
4. `documents/03_readiness/IMPLEMENTATION_READINESS_CHECKLIST.md`
5. `documents/04_delivery/DELIVERY_MILESTONES.md`

## フォルダ構成

- `00_index/`: 読み順とタスク束ね
- `01_source_of_truth/`: 実装判断の単一参照点
- `02_analysis/`: 現状差分とリスク
- `03_readiness/`: 実装着手可否
- `04_delivery/`: マイルストーンと完了条件
- `05_reference/`: ドメインモデルと API 基準
- `06_open_questions/`: 決定事項と今後の論点管理

## 詳細仕様の置き場

- 実行時の挙動: `program_docs/runtime_behavior.md`
- API と状態契約: `program_docs/api_contracts.md`
- Docker / テスト / CI: `program_docs/development_workflow.md`
- ドキュメント索引: `program_docs/README.md`

## 運用ルール

- `documents/` は実装判断を要約する README 的な文書群として扱う
- 詳細説明は `program_docs/` に追加する
- 実装判断は `01_source_of_truth/IMPLEMENTATION_SOURCE_OF_TRUTH.md` を最優先とする
