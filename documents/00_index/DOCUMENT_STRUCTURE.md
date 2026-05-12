# Document Structure

## 1. 目的

`documents/` 配下をどの順番で読み、どの文書を判断基準に使うかを固定する。

## 2. 読み順

1. `documents/01_source_of_truth/IMPLEMENTATION_SOURCE_OF_TRUTH.md`
2. `documents/02_analysis/CURRENT_STATE_GAP_ANALYSIS.md`
3. `documents/03_readiness/IMPLEMENTATION_READINESS_CHECKLIST.md`
4. `documents/04_delivery/DELIVERY_MILESTONES.md`
5. `documents/00_index/IMPLEMENTATION_TASK_BREAKDOWN.md`
6. `documents/05_reference/DOMAIN_MODEL.md`
7. `documents/05_reference/API_CONTRACT_BASELINE.md`
8. `documents/06_open_questions/OPEN_QUESTIONS.md`

## 3. 使い分け

### 何を作るか

- `01_source_of_truth`

### 今のコードと何がズレているか

- `02_analysis`

### もう実装を始めてよいか

- `03_readiness`

### 何を完了とみなすか

- `04_delivery`

### 実際のタスクに落とすと何になるか

- `00_index/IMPLEMENTATION_TASK_BREAKDOWN.md`

### 型、概念、契約の補助参照

- `05_reference`

### 未決事項の管理

- `06_open_questions`

## 4. 運用ルール

- 新しい実装判断は、まず `01_source_of_truth` に反映する
- 差分やリスクが見つかったら `02_analysis` を更新する
- 着手条件が変わったら `03_readiness` を更新する
- 完了条件が変わったら `04_delivery` を更新する
- 口頭で決まった未解決事項は `06_open_questions` に記録する
