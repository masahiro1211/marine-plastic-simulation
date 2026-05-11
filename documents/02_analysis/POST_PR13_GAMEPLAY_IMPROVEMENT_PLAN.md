# PR #13 後のゲーム性改善計画

## 1. 目的

本書は、PR #13 を PR #12 側のブランチへ merge し、その後 PR #12 を `develop` に merge した後の改善計画を定義する。

目的は、コアとなるエージェント種を増やさずに、海洋清掃シミュレーションを「ゲームとして分かりやすく、説明可能な体験」に改善することである。

対象とする既存のエージェント種は以下に限定する。

- 魚 / 海洋生物
- スカウティングロボット
- ごみ回収ロボット

本計画では、まずバグ修正と安定化を最優先に扱う。その上で、エージェント種を変えない範囲のゲーム性、ごみ生成、学術的整合性、実装順序を整理する。

UI 改善、背景演出、オブジェクト画像の刷新は本計画の初期優先対象から外す。

## 2. 前提

- PR #13 は `feature/fish-model-improvement` に merge 済みである。
- その後、PR #12 は `develop` に merge 済みである。
- merge 後のアプリには以下が含まれる。
  - 日本語 UI
  - 捕食者の描画
  - panic / flash expansion 挙動
  - manual robot の有効 / 無効切替
  - 簡略化された HUD 風の統計パネル
- 本計画では、新しいロボット種や新しい海洋生物種を追加しない。
- 既存エージェントの責務は維持する。

## 3. プロダクト方針

このプロジェクトは、単なるエージェント挙動のデモではなく、インタラクティブな海洋清掃シミュレーションとして見せるべきである。

次の改善では、まず壊れていない状態を保証し、その後にユーザーへ以下の 3 点が伝わる状態を目指す。

1. 既存機能が安定して動くこと
2. なぜその場所にごみが発生するのか
3. プレイヤーまたは観察者は何を最適化すればよいのか
4. 魚、ロボット、ごみ、捕食者の挙動がどの程度科学的に妥当な簡略モデルなのか

PM として最も重要な判断は、現在の基本ループが読みやすくなる前にエージェント種を増やさないことである。まず磨くべきループは以下である。

```text
ごみが発生する -> スカウトが見つける -> 回収ロボットが運ぶ -> 魚に悪影響が出る可能性がある -> スコアが変わる
```

## 4. 改善領域

### 4.1 バグ修正と安定化バックログ

#### 現在の懸念

PR #12 と PR #13 の後に起きやすい問題は、構文エラーよりも、backend snapshot、frontend rendering、reset behavior の整合性崩れである。

特に main へ反映する前は、新機能追加よりも、既存の simulation flow が安定していることを確認する。

#### 最優先で確認する項目

- reset behavior の確認
  - `Apply And Reset` 後に manual robot toggle が反映される
  - config 変更が静かに巻き戻らない
  - reset 後に tick、score、stats、agents が一貫した初期状態へ戻る
- backend / frontend contract の確認
  - backend の全 `agent.type` が frontend で安全に処理される
  - snapshot 内の `stats`, `score`, `events` が frontend 型とズレていない
  - optional field の欠落で UI や canvas が落ちない
- score consistency の確認
  - delivered trash が 1 回の納品につき 1 回だけ増える
  - 魚が誤飲したごみは shared target から消える
  - collision penalty が二重計上されない
  - energy bonus が意図した計算式と一致する
- simulation lifecycle の確認
  - start / stop / reset / completion の phase 遷移が破綻しない
  - completion 後に runtime trash が追加されない
  - WebSocket 切断後も REST reset 経路で復帰できる
- PR #12 由来の挙動確認
  - predator 追加後も tick が極端に重くならない
  - panic propagation が NaN や異常速度を生まない
  - marine life / predator / trash が境界外へ消えない
- PR #13 由来の挙動確認
  - manual robot OFF 時に keyboard input が送信されない
  - manual robot ON に戻したときに操作が再開できる
  - toggle 状態が reset 後の config と一致する

#### 実装範囲

- backend test を追加する。
  - reset 初期化
  - score 二重計上防止
  - runtime trash spawn 停止条件
  - fish ingestion と shared target 削除
  - phase completion 後の不変条件
- frontend build check を必ず実行する。
- 可能であれば最小限の frontend test を追加する。
  - config toggle
  - missing optional field
  - unknown agent type fallback
- manual QA checklist を docs に追加する。

#### 優先度

最優先。

ここが終わるまで、UI 改善、画像改善、背景演出には着手しない。

### 4.2 ゲーム性とスコア

#### 現在の懸念

現状でもスコアや回収数は存在するが、プレイヤーにとっての目的がまだ弱い。ユーザーは動きを観察できるものの、「良い結果とは何か」が直感的に分かりにくい。

#### 改善案

- ミッションプリセットを追加する。
  - `Calm Coast`
  - `Busy Harbor`
  - `Storm Drift`
- エージェント種は変えず、以下だけをプリセットごとに変える。
  - ごみの発生間隔
  - 最大ごみ数
  - 海流の向きと強さ
  - 魚へのリスクの高さ
  - ミッション時間
- 終了時の評価ランクを追加する。
  - `S`, `A`, `B`, `C`
  - 回収ごみ数、魚の誤飲数、ロボット衝突数、残エネルギーをもとに算出する
- シミュレーション完了時に簡潔なミッションサマリーを表示する。
  - 回収したごみ
  - 残ったごみ
  - 魚が誤飲したごみ
  - ロボット衝突数
  - エネルギー効率

#### 実装範囲

- frontend にプリセット config を追加する。
- 選択した config を既存の backend reset 経路へ渡す。
- 既存の score / stats から評価ランクを算出する。
- スカウト、回収ロボット、魚の意思決定ロジックは変更しない。

#### 優先度

中。

バグ修正と安定化が完了した後に着手する。シミュレーションロジックを不安定にせず、ユーザー体験を改善できる。

### 4.3 ごみ生成と海流

#### 現在の懸念

ごみはランダム配置と定期生成で発生している。機能としては十分だが、汚染源、季節性、海流による輸送を説明しにくい。

実際の海洋プラスチック研究では、主な入力源として陸域・沿岸・河川、輸送過程として表層流・風・収束域が扱われる。したがって、次のごみ生成アルゴリズムは「完全ランダム」ではなく、簡略化した source-to-transport model として設計する。

#### 論文から採用する考え方

- 陸域由来の入力
  - Jambeck et al. (2015) は、沿岸国の固形廃棄物、人口密度、廃棄物管理状況を結びつけて、陸域から海へ入るプラスチック量を推定している。
  - 本プロジェクトでは、人口や廃棄物管理データそのものは持たないため、`source_weight` として「港・河口・沿岸」の重みへ落とし込む。
- 河川入力と季節性
  - Lebreton et al. (2017) は、河川から海へのプラスチック入力を、mismanaged plastic waste、人口密度、runoff、人工障壁などから推定している。
  - 同研究では河川入力の季節性が強く、雨量・runoff が入力量に影響する。
  - 本プロジェクトでは、雨・嵐シナリオで spawn rate と cluster size を増やす。
- 粒子追跡による輸送
  - Lebreton et al. (2012) は、海洋循環モデルと Lagrangian particle tracking を組み合わせ、浮遊ごみの入力、輸送、蓄積を扱っている。
  - 本プロジェクトでは、各 trash を粒子として扱い、海流ベクトル、弱い乱流、境界処理で移動させる。
- 収束域と蓄積
  - Maximenko et al. (2012) や van Sebille et al. (2012) は、表層流や drifter data に基づいて、浮遊ごみが収束域へ集まりやすいことを扱っている。
  - 本プロジェクトでは、画面内に大規模な gyre を再現するのではなく、弱い convergence zone を 1 つだけ置き、ごみが少し集まりやすい領域として表現する。
- モデルの限界
  - 実際の研究は全球・長期・観測データを扱うが、本プロジェクトは教育・ゲーム向けの 2D 簡略モデルである。
  - 数値は実測値の再現ではなく、論文で示された因果関係をゲーム内パラメータへ写像する。

#### 再構成するアルゴリズム

1. Source selection
   - ごみ発生源を複数定義する。
     - `river_mouth`: 河口からの流入
     - `coastal_city`: 沿岸人口・生活ごみ由来
     - `harbor`: 港湾・船舶活動由来
     - `offshore`: 画面外から漂着する既存浮遊ごみ
   - 各 source は `weight`, `x`, `y`, `spread_radius`, `seasonal_factor` を持つ。
   - spawn 時は source weight に基づいて発生源を選ぶ。

2. Event intensity
   - 基本発生率に、シナリオ係数を掛ける。
   - `calm`: 平常時。小さな cluster が低頻度で発生する。
   - `rain`: runoff 増加を表現する。河口 source の weight と cluster size を増やす。
   - `storm`: runoff と漂流を強める。spawn interval を短くし、current と random diffusion を強める。
   - `harbor`: 港湾 source の weight を高くし、局所的な高密度発生を表現する。

3. Cluster spawning
   - 選ばれた source の周辺に、1 から 5 個の trash を生成する。
   - cluster size は scenario intensity に応じて変える。
   - `max_trash` を超えない範囲で切り詰める。
   - 完全な点発生ではなく、source 周辺の正規分布または一様円分布でばらす。

4. Particle transport
   - trash の移動は以下の合成とする。

```text
trash_velocity =
  base_drift
  + global_current
  + source_outflow
  + convergence_pull
  + random_diffusion
```

   - `global_current`: シナリオごとの一定方向の海流。
   - `source_outflow`: 河口や港から外側へ押し出す弱い流れ。
   - `convergence_pull`: 画面内の弱い蓄積域へ向かう小さな引力。
   - `random_diffusion`: 現在の random motion を残し、乱流・波によるばらつきとして扱う。

5. Retention and boundary
   - trash が基地下端や canvas 外へ不自然に消えないよう、境界反射または再流入ルールを定義する。
   - 画面外へ出た trash を即消す場合は、`escaped_trash` として stats に記録する案を検討する。
   - ただし最初の PR では stats 追加を避け、既存契約を壊さない境界処理を優先する。

#### 実装パラメータ案

最初から大量の UI 項目を追加しない。backend 側に scenario preset として持たせる。

```text
trash_source_profile: "calm" | "rain" | "storm" | "harbor"
trash_cluster_min: int
trash_cluster_max: int
trash_source_weights: optional internal preset
current_x: float
current_y: float
current_strength: float
diffusion_strength: float
convergence_x: float
convergence_y: float
convergence_strength: float
```

frontend に出すとしても、最初は `trash_source_profile` だけにする。

#### 実装範囲

- `Trash` は同じオブジェクト種として維持する。
- `SimulationConfig` には最小限の scenario field だけを追加する。
- source 定義と重みは backend preset として隠す。
- `SimulationEngine._spawn_runtime_trash()` を 1 個 spawn から cluster spawn に変更する。
- `_spawn_trash()` は source 位置を受け取れるように拡張する。
- `Trash.update()` に current / diffusion / convergence の簡略輸送を入れる。
- spawn 上限、cluster size、source weight、境界処理に unit test を追加する。

#### 優先度

高。ただし、バグ修正と安定化の後に着手する。

ゲーム感、科学的な説明、戦略性を同時に改善でき、かつエージェント種を増やさずに済むため。

#### 参考文献

- Jambeck, J. R. et al. (2015). Plastic waste inputs from land into the ocean. Science. https://doi.org/10.1126/science.1260352
- Lebreton, L. C. M. et al. (2017). River plastic emissions to the world's oceans. Nature Communications. https://doi.org/10.1038/ncomms15611
- Lebreton, L. C.-M. et al. (2012). Numerical modelling of floating debris in the world's oceans. Marine Pollution Bulletin. https://doi.org/10.1016/j.marpolbul.2011.10.027
- Maximenko, N. et al. (2012). Pathways of marine debris derived from trajectories of Lagrangian drifters. Marine Pollution Bulletin. https://doi.org/10.1016/j.marpolbul.2011.04.016
- van Sebille, E. et al. (2012). Origin, dynamics and evolution of ocean garbage patches from observed surface drifters. Environmental Research Letters. https://doi.org/10.1088/1748-9326/7/4/044040

### 4.4 学術的整合性

#### 現在の懸念

本プロジェクトでは schooling、panic、predator、foraging、drift など、生物学・生態学に由来する用語を使っている。これらを学術的な挙動として見せる場合、過剰な主張を避ける必要がある。

#### 改善案

- プロダクト上の説明と科学的主張を分ける。
  - product: 「魚群が捕食者に反応して広がる」
  - academic note: 「群れ行動と捕食者回避を簡略化したモデル」
- 短い model note 文書を追加し、以下を説明する。
  - 何を近似しているのか
  - 何を意図的に簡略化しているのか
  - どのパラメータが heuristic なのか
- 参考文献やモデル名は慎重に扱う。
  - schooling / flocking model
  - predator avoidance と panic propagation
  - Lévy-style search behavior
  - ocean drift は完全な流体力学ではなく simplified advection として扱う
- 注意書きはメイン UI ではなく docs 側に置く。

#### 実装範囲

- `documents/05_reference/MODEL_ASSUMPTIONS.md` を追加する。
- citation や reference 名は、検証後に docs にのみ記載する。
- 現在の assumptions が文書化されるまで、新しい生物学的メカニクスは追加しない。

#### 優先度

中。

PM として重要だが、まずは実装の安定性を優先する。バグ修正後、ごみ生成やシナリオ設計と並行して整理する。

## 5. 推奨 PR 順序

### PR A: PR #13 後のバグ修正と安定化

目的: 新機能追加前に、#12 + #13 の挙動を安定化する。

タスク:

- backend test と frontend build を実行する。
- manual robot toggle を確認する。
- predator rendering を確認する。
- reset behavior を確認する。
- completion / spawn / score にテスト不足があれば追加する。
- WebSocket / REST reset の復帰経路を確認する。
- NaN、境界外移動、二重スコア計上がないことを確認する。

完了条件:

- CI が通る。
- desktop と narrow viewport で基本的な manual QA が通る。
- 通常の simulation flow で既知のクラッシュがない。
- main へ上げる前に残すべき blocker bug がない。

### PR B: Trash Scenario Foundation

目的: 論文で扱われる陸域・河川入力、季節性、粒子輸送、収束域の考え方を簡略化し、ごみ生成を説明可能で戦略性のあるものにする。

タスク:

- `trash_source_profile` を追加する。
- `river_mouth`, `coastal_city`, `harbor`, `offshore` の source preset を backend に定義する。
- source weight に基づく発生源選択を追加する。
- scenario intensity に応じた cluster spawning を追加する。
- `global_current`, `source_outflow`, `convergence_pull`, `random_diffusion` を合成した trash transport を追加する。
- `max_trash` を超えない cluster spawn にする。
- spawn limit、cluster size、source selection、boundary behavior のテストを追加する。
- 参考文献と簡略化した点を docs に明記する。

完了条件:

- ごみの発生源と流れが、コードと docs の両方で説明できる。
- `max_trash` が常に守られる。
- 同じ random seed では再現可能な spawn 結果になる。
- `calm`, `rain`, `storm`, `harbor` の挙動差が unit test または snapshot で確認できる。
- 既存の scout / collector / fish logic が変更なしで動作する。

### PR C: Model Assumptions and Academic Notes

目的: 科学的な説明を正確で守れるものにする。

タスク:

- model assumptions document を追加する。
- 簡略化している挙動を列挙する。
- 検証済みの reference candidate を追加する。
- docs の表現を model limitation と整合させる。

完了条件:

- docs 上で、簡略シミュレーションと現実予測モデルの違いが明確である。
- 未検証の学術的主張が事実として提示されていない。

### PR D: Mission Presets and End Result

目的: シミュレーションを playable mission として分かりやすくする。

タスク:

- mission preset selector を追加する。
- end-of-run grade を追加する。
- completion summary を追加する。
- advanced parameters は main UI には出さない。

完了条件:

- ユーザーが、実行結果が良かったのか悪かったのか理解できる。
- プリセットごとに難易度の違いが分かる。
- backend contract を変える場合は frontend も同時に追随している。

## 6. まだやらないこと

- 新しい agent category を追加しない。
- main UI にすべての simulation parameter を出さない。
- 本格的な hydrodynamic ocean modeling を導入しない。
- database persistence を導入しない。
- gameplay goal が固まる前に frontend 全体を redesign しない。
- trash generation の変更を #12 / #13 と同じ PR に混ぜない。
- 背景演出やオブジェクト画像の刷新は、bug fix と安定化が終わるまで着手しない。
- UI の大きな変更は、現時点では計画対象外とする。

## 7. PM 判断まとめ

次に行うべきことは、さらに agent logic を増やすことではない。既存のループを、より読みやすく、より戦略的で、より説明しやすくすることである。

推奨する直近の順序は以下である。

1. #13 を #12 側のブランチへ merge する。
2. #12 を `develop` へ merge する。
3. merge 後の bug fix と安定化を最優先で行う。
4. trash scenario foundation を実装する。
5. model assumptions と学術的な限界を文書化する。
6. mission preset と end-of-run feedback を追加する。
