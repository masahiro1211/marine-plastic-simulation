# Git 運用ルール

## ブランチ構成

```
main          ← 本番（安定版のみマージ）
└── develop   ← 開発の起点（ここから機能ブランチを切る）
    ├── feature/add-turtle-agent
    ├── feature/population-graph
    ├── fix/fish-collision-bug
    └── ...
```

- **`main`** — 常に動作する安定版。直接コミットしない。
- **`develop`** — 開発のベースブランチ。機能が完成したらここにマージ。
- **`feature/*`** — 新機能の作業ブランチ。develop から切って develop にマージ。
- **`fix/*`** — バグ修正用。develop から切って develop にマージ。

## 基本的な作業の流れ

### 1. 新しい機能を始める

```bash
# develop ブランチに移動して最新を取得
git switch develop
git pull

# 機能ブランチを作成
git switch -c feature/add-turtle-agent
```

### 2. 作業中のコミット

```bash
git add backend/app/simulation/agents.py
git commit -m "feat: ウミガメエージェントを追加"
```

### 3. 作業が完了したらプルリクエストを作成

```bash
# プルリク前に必ず動作確認
docker compose up --build

# リモートにプッシュ
git push -u origin feature/add-turtle-agent

# GitHub でプルリクエストを作成（develop ← feature/add-turtle-agent）
gh pr create --base develop --title "feat: ウミガメエージェントを追加" --body "変更内容の説明"
```

### 4. レビュー → マージ

1. **Slack でプルリクの URL を共有し、レビューを依頼する**
2. レビューで承認されたらマージする
3. マージ後、不要になったブランチを削除する

```bash
git switch develop
git pull
git branch -d feature/add-turtle-agent
```

## マージ時のルール

- **プルリクエスト経由でマージする。** ローカルで直接 `git merge` しない。
- **マージ前に Slack で報告する。** プルリクの URL と影響範囲を共有してからマージすること。
- **マージ前に `docker compose up --build` で動作確認する。** シミュレーションが正常に動くことを確認してからマージする。
- **`develop` へのマージは全員に周知してから行う。**

## 共通コンポーネントの扱い

### バックエンド: `Agent` 基底クラス (`backend/app/simulation/agents.py`)

`Agent` クラスは全エージェントの基底となるため、慎重に扱う。

- **なるべく触らない。** 既存の `Agent` クラスのインターフェースを変更しない。
- **新しいエージェントを追加する場合は `Agent` を継承する。** 基底クラスの `update()` をオーバーライドして独自の行動ロジックを実装する。
- **`Agent` を変更する場合は、全エージェントの動作確認を行う。**
- **特定のエージェントにしか使わないロジックは基底クラスに入れない。** そのエージェントのクラス内に置く。

### フロントエンド: `useSimulation` フック (`frontend/src/hooks/useSimulation.js`)

WebSocket 通信を管理する共通フック。

- **通信プロトコルを変更する場合はバックエンドと同時に変更する。**
- **新しいエージェントを追加しても、このフックの変更は不要。** データ構造は汎用的に設計されている。

### シミュレーションエンジン (`backend/app/simulation/engine.py`)

- **新しいエージェントを追加する場合は `_init_agents()` にスポーン処理を追加する。**
- **`step()` や `get_snapshot()` の変更は影響範囲が大きいため慎重に。**

## よくある作業パターン

### 新しいエージェントを追加する

変更が必要なファイル:

1. `backend/app/simulation/agents.py` — `Agent` を継承した新クラスを作成
2. `backend/app/simulation/engine.py` — `_init_agents()` にスポーン処理を追加
3. `frontend/src/components/Canvas.js` — `COLORS` と `SIZES` に描画設定を追加
4. `backend/app/models/schemas.py` — (任意) `SimulationConfig` にパラメータを追加

詳細な手順は [README.md](README.md) の「新しいエージェントの作り方」を参照。

### フロントエンドの UI を改善する

- コンポーネントは `frontend/src/components/` にある
- Canvas 描画ロジックは `Canvas.js` にまとまっている
- 新しいコンポーネントは `frontend/src/components/` に配置する

## ブランチ命名規則

| 接頭辞 | 用途 | 例 |
|---|---|---|
| `feature/` | 新しいエージェントや機能追加 | `feature/add-turtle-agent` |
| `fix/` | バグ修正 | `fix/predator-energy-bug` |
| `refactor/` | コードの整理・リファクタリング | `refactor/agent-base-class` |
| `docs/` | ドキュメント更新 | `docs/update-readme` |

## コミットメッセージの書き方

`種類: 内容` の形式で書く。日本語OK。

```
feat: ウミガメエージェントを追加
fix: 捕食者のエネルギーが負になるバグを修正
refactor: エージェント基底クラスの距離計算を最適化
docs: READMEにエージェント追加手順を記載
style: Canvas の描画色を調整
```

| 種類 | 意味 |
|---|---|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `refactor` | 動作を変えないコード改善 |
| `docs` | ドキュメントのみ |
| `style` | 見た目の変更（CSS・描画等） |

## コードスタイル

### Python (バックエンド)

- Python 3.12 の型ヒントを使用
- 関数・変数名は `snake_case`
- クラス名は `PascalCase`

### JavaScript (フロントエンド)

- 関数コンポーネント + Hooks を使用
- 変数名は `camelCase`
- コンポーネント名は `PascalCase`

## 注意事項

- **`main` に直接コミットしない。** 必ず develop 経由でマージする。
- **作業前に `git pull` する。** 他の人の変更を取り込んでから作業を始める。
- **こまめにコミットする。** 大きな変更を一度にコミットしない。
- **`.env` や `node_modules/`、`__pycache__/` をコミットしない。** `.gitignore` で除外されていることを確認する。

## よく使うコマンド早見表

```bash
# Git 操作
git switch develop                          # develop に移動
git switch -c feature/xxx                   # 新しいブランチを作成して移動
git status                                  # 変更状態を確認
git add <ファイル名>                          # ステージングに追加
git commit -m "feat: 内容"                   # コミット
git log --oneline                           # 履歴を簡潔に表示
git push -u origin feature/xxx              # リモートにプッシュ
gh pr create --base develop                 # プルリクエストを作成
git switch develop                          # develop に戻る
git pull                                    # リモートの最新を取得
git branch -d feature/xxx                   # マージ済みブランチを削除

# Docker 操作
docker compose up --build                   # ビルドして起動
docker compose up                           # 起動（ビルド済み）
docker compose down                         # 停止
docker compose logs -f backend              # バックエンドのログを追跡
docker compose logs -f frontend             # フロントエンドのログを追跡
```
