# Game Improvement Backlog And Implementation Plan

作成日: 2026-05-13

## 目的

この文書は、海洋ごみ回収ロボットシミュレーションを「壊れにくいデモ」から「遊びとして目的が分かるゲーム」へ寄せるための改善バックログである。

個別バグだけではなく、ゲーム全体として修正すべき点、改善すべき点、実装案、優先順位をまとめる。

## 現在の課題

### 1. 基本ループの安定性

手動 Collector がゴミを回収し、基地へ戻って納品した直後に停止することがある。

原因:

- 同一 tick 内で基地搬入が先に処理され、`carrying_trash_id` が消える。
- その後に衝突判定が走る。
- 基地付近に他ロボットがいると、手動 Collector が「空荷の通常状態」として衝突停止ペナルティを受ける。

実装案:

- `SimulationEngine.step()` の tick 内順序を修正する。
- robot collision resolution を base charging / delivery より前に実行する。
- 満載帰還中は既存ルール通り衝突停止ペナルティを受けない。
- その後に基地搬入を行う。

検証案:

- 手動 Collector と自動 Collector を基地上に重ねる。
- 手動 Collector に `carrying_trash_id` を持たせる。
- 1 tick 後に `delivered_trash` が増え、`slowdown_ticks` は 0 のままであることをテストする。

### 2. プレイヤーの目的が弱い

現状は観察シミュレーションとしては動くが、プレイヤーが何を最適化すればよいかが弱い。

修正すべき点:

- 回収量、魚への悪影響、衝突、エネルギーの関係がゲーム内で明確ではない。
- 完了時に「良い結果だったか」が分かりにくい。
- 手動操作ロボットの役割が、観察対象なのか攻略手段なのか曖昧。

実装案:

- mission result summary を追加する。
- `trash_delivered`, `trash_remaining`, `fish_ate_trash`, `robot_fish_contacts`, `collisions`, `energy_remaining` から評価ランクを算出する。
- 評価ランクは `S / A / B / C` 程度に抑える。
- 既存 score を壊さず、frontend 側で summary 表示から始める。

優先度:

- P1。基本ループ安定化の次に実装する。

### 3. 手動操作の状態が分かりにくい

手動 Collector が止まったとき、停止理由が見えにくい。

修正すべき点:

- `status` が `manual`, `delivering`, `slowed_down`, `charging` と変わるが、UI 上で意味が分かりにくい。
- `metadata.slowdown_ticks` は snapshot に含まれるが、プレイヤー向けには表示されていない。
- エネルギー切れ、充電中、衝突ペナルティ中、運搬中が同じ「止まった」に見える。

実装案:

- manual robot 専用の小さな status chip を Canvas 周辺または StatsPanel に追加する。
- 表示内容は `操作中`, `運搬中`, `充電中`, `衝突停止中` に絞る。
- `slowdown_ticks > 0` の場合だけ残り tick を表示する。
- backend contract は変更せず、既存 metadata を使う。

優先度:

- P1。バグ再発時の切り分けにも効くため、早めに入れる。

### 4. 難易度とミッション設計が薄い

現状のプリセットは scout / collector / marine life / trash の数を変える程度で、ゲームとしての違いが弱い。

改善すべき点:

- 難易度が単なる数の増減になっている。
- ごみの出現、海流、魚リスク、制限時間が連動していない。
- 「どのシナリオを遊んでいるか」が画面から伝わりにくい。

実装案:

- mission preset を 3 つに整理する。
  - `Calm Coast`: 練習用。ごみ少なめ、魚リスク低め。
  - `Busy Harbor`: 港湾。局所的にごみが増える。
  - `Storm Drift`: 高難度。ごみ生成と流れが強い。
- 各 preset は既存 `SimulationConfig` の組み合わせだけで表現する。
- backend に新しい agent 種は追加しない。
- frontend の preset UI は、単なる難易度ではなく mission selection として見せる。

優先度:

- P2。安定化と状態表示の後。

### 5. ごみ発生モデルの説明力

ごみ生成は既に source profile を持っているが、ゲーム体験としての見え方がまだ弱い。

改善すべき点:

- なぜそこにごみが出るのかが画面上で伝わりにくい。
- source profile と mission preset の関係が UI で見えない。
- 海流や収束域が視覚的に分かりにくい。

実装案:

- source marker を 2D/3D の背景要素として表示する。
- current direction を薄い矢印または粒子流で表示する。
- trash source profile を mission preset に紐付ける。
- backend の粒子モデルは大きく変えず、まず視覚説明を足す。

優先度:

- P2。ゲーム理解を上げるが、安定性より後。

### 6. 3D 表示の操作性

3D view は見栄えは良いが、ゲーム操作の視認性はまだ改善余地がある。

改善すべき点:

- 手動ロボットと自動 Collector の識別が弱い。
- ゴミを持っている状態、基地範囲、進行方向が分かりにくい場面がある。
- 斜めカメラでは基地周辺の混雑が読みづらい。

実装案:

- manual Collector に専用色または ring indicator を追加する。
- carrying 状態の indicator を少し強くする。
- base radius を 3D でも常時読みやすくする。
- top view を gameplay 確認用、angle view を展示用として明確に分ける。

優先度:

- P3。見た目の改善なので、ゲームループ修正後。

## 推奨実装順

1. 納品直後に手動 Collector が停止する問題を修正する。
2. tick 内処理順を `program_docs/runtime_behavior.md` に明文化する。
3. 手動 Collector の状態表示を追加する。
4. mission result summary と評価ランクを追加する。
5. mission preset を再設計する。
6. ごみ発生源と海流の視覚説明を追加する。
7. 3D view の manual robot 視認性を改善する。

## 今回実装する範囲

今回の実装対象:

- 納品直後の手動 Collector 停止問題を修正する。
- regression test を追加する。
- tick 内処理順を runtime docs に反映する。

今回の実装対象外:

- mission result summary
- 評価ランク
- manual status UI
- mission preset 再設計
- source marker / current visualization
- 3D 表示改善

## 完了条件

- 手動 Collector が満載状態で基地に入った tick に、基地上の他ロボットとの衝突で停止ペナルティを受けない。
- `delivered_trash` は従来通り 1 回の納品につき 1 増える。
- 既存の collision cooldown / penalty guard のテストが通る。
- backend test suite が通る。
- runtime docs の tick 順序が実装と一致する。
