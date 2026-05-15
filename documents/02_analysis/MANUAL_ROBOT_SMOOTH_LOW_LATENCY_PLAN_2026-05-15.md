# Manual Robot Smooth Low-Latency Rendering Plan

Date: 2026-05-15
Branch for work: `ogawa`
PR base after implementation: `develop`

## Problem

直近の入力遅延対策では、manual collector だけ `SNAPSHOT_INTERPOLATION_DELAY_MS = 120` の補間遅延から外した。

これにより入力反映の視覚遅延は減ったが、manual collector は snapshot 更新点をほぼそのまま描画するようになった。backend tick は default 50ms、frontend の running snapshot apply は通常 100ms 間引きなので、manual collector だけ位置が階段状に更新され、カクついて見える。

つまり、現在の状態は以下の tradeoff になっている。

- 通常 agent: 120ms 遅れて滑らか
- manual collector: 遅延は少ないが、snapshot cadence が見えてカクつく

ユーザー操作対象に必要なのは、どちらか片方ではなく「入力直後は遅れず、表示は毎 frame 滑らかに動く」こと。

## Root Cause

manual collector の表示を補間経路から完全に切ったため、描画が WebSocket snapshot の到着頻度に依存している。

入力値そのものは frontend で即時に分かっているが、現在の `Canvas3D` はその入力値を知らない。そのため、次の server snapshot が届くまで manual collector の表示を frame-by-frame に進められない。

## Design Goal

manual collector だけ、authoritative state と visual state を分ける。

- authoritative state: backend snapshot の `agent.x/y/vx/vy`
- visual state: frontend の `useFrame()` で毎 frame 更新する表示専用位置

manual collector の visual state は、frontend が保持している最新入力 intent で即時に進める。server snapshot は正解値として扱い、visual state を滑らかに補正する。

これにより、入力遅延とカクつきの両方を避ける。

## Proposed Architecture

### 1. manual input intent を frontend state として保持する

`useSimulation.ts` の `manualMove(dx, dy)` は WebSocket 送信だけでなく、最新の manual input intent を保持する。

追加する state / return value:

```ts
interface ManualControlIntent {
  dx: number;
  dy: number;
  updatedAt: number;
  active: boolean;
}
```

方針:

- `manualMove(dx, dy)` 実行時に `updatedAt = performance.now()` を記録する。
- `dx/dy` が 0 なら `active = false`。
- `dx/dy` が非 0 なら `active = true`。
- `App.tsx` から `Canvas3D` へ `manualControlIntent` を渡す。
- 2D canvas には当面渡さない。今回のカクつきは 3D manual collector の問題なので、変更範囲を狭くする。

### 2. Canvas3D に manual rendering props を追加する

`Canvas3DProps` に以下を追加する。

```ts
manualControlIntent?: ManualControlIntent;
tickIntervalMs: number;
collectorSpeed: number;
```

`App.tsx` からは以下を渡す。

- `manualControlIntent`
- `config.tick_interval_ms`
- `config.collector_speed`

manual collector の表示予測では、backend の tick speed を frame time speed に変換する。

```ts
const speedPxPerSecond = collectorSpeed * (1000 / tickIntervalMs);
```

upgrade 後は backend 側で speed multiplier がある。第一実装では以下の順で speed を推定する。

1. snapshot の `agent.vx/vy` の大きさが十分あれば、それを `1000 / tickIntervalMs` 倍して測定 speed として使う。
2. snapshot velocity が 0 で、入力が active なら `collectorSpeed * 1000 / tickIntervalMs` を fallback にする。
3. 必要なら次パッチで `metadata.is_upgraded` も加味する。

### 3. manual collector 用の display-only dead reckoning を追加する

`AgentsLayer` に manual visual state ref を追加する。

```ts
interface ManualVisualState {
  x: number;
  y: number;
  initialized: boolean;
  lastFrameAt: number;
}
```

manual collector の frame 更新は以下にする。

1. 初回は server snapshot position で初期化。
2. manual input が active なら、入力 direction を正規化し、visual position を `speedPxPerSecond * delta` で進める。
3. その後、server snapshot position との差分を小さく補正する。
4. 差分が大きすぎる場合は snap する。
5. manual input が inactive なら、server position に高めの係数で追従して停止のズレを早く消す。

補正の目安:

```ts
const MANUAL_CORRECTION_RATE = 10; // per second
const MANUAL_IDLE_CORRECTION_RATE = 24; // per second
const correctionAlpha = 1 - Math.exp(-rate * delta);
```

この方式では、入力直後の表示は frontend の入力値で即動く。一方で、pickup / collision / wall clamp / slowdown など backend 固有の結果は snapshot が届くたびに補正される。

### 4. manual collector には 120ms 遅延補間を使わない

manual collector は通常 agent の `resolveInterpolatedMotion()` には戻さない。

理由:

- 120ms 遅延補間に戻すと、操作遅延が再発する。
- ただし snapshot 生描画でもカクつく。
- そのため manual collector だけは「入力 intent による local visual prediction + server correction」にする。

通常 agent は PR53 の補間を維持する。

### 5. snapshot immediate apply は維持するが、役割を限定する

現在の `MANUAL_INPUT_FAST_SNAPSHOT_WINDOW_MS = 250` は維持する。

役割:

- server correction を早く受け取るため。
- visual prediction の drift を早く直すため。

ただし、滑らかさの主役は snapshot apply 頻度ではなく `useFrame()` の visual prediction に移す。これにより、snapshot が 50-100ms cadence でも manual collector は毎 frame 動く。

## Implementation Steps

### Step 1: type definition

- `frontend/src/types.ts` に `ManualControlIntent` を追加する、または `useSimulation.ts` 内で export する。
- 循環依存を避けるなら `types.ts` に置く。

### Step 2: useSimulation

- `manualControlIntent` state を追加する。
- `manualMove(dx, dy)` で intent を更新する。
- `SimulationState` の return に `manualControlIntent` を追加する。
- 既存の `lastManualMoveSentAtRef` と 250ms fast apply は残す。

### Step 3: App

- `useSimulation()` から `manualControlIntent` を受け取る。
- 3D 表示時だけ `Canvas3D` に渡す。
- `tickIntervalMs={config.tick_interval_ms}` と `collectorSpeed={config.collector_speed}` を渡す。

### Step 4: Canvas3D

- `Canvas3DProps` に props を追加する。
- `AgentsLayer` に props を渡す。
- `AgentsLayer` に `manualVisualStatesRef` を追加する。
- `useFrame()` 内で manual collector のみ new path に分岐する。
- non-manual agent は現行の interpolation path を維持する。

Pseudo flow:

```ts
if (isManualAgent(agent)) {
  const motion = resolveManualVisualMotion({
    agent,
    intent: manualControlIntent,
    delta,
    tickIntervalMs,
    collectorSpeed,
    visualState,
  });
  group.position.set(motion.x - cx, y, motion.y - cz);
  rotate from motion.vx/vy;
  continue;
}

const motion = perfOptions.disableInterpolation
  ? latestSnapshotMotion
  : resolveInterpolatedMotion(...);
```

### Step 5: cleanup

- manual visual state map から存在しなくなった agent id を削除する。
- reset 後に manual agent id が変わるため、存在しない id の state を残さない。

## Verification Plan

### Automated

- `npm run typecheck`
- `npm run build`

### Manual QA

3D 表示で確認する。

- `W/A/S/D` 押下直後に manual collector が即動く。
- キーを押しっぱなしにしても manual collector が滑らかに進む。
- キーを離したときに即停止方向へ寄る。
- 反対方向へ切り替えたときに 1拍遅れない。
- 自動 robot / fish / trash の滑らかさが落ちない。
- `?perf` overlay で FPS が大きく落ちない。
- `?perfNoInterp` は既存 debug option として維持される。

## Acceptance Criteria

- manual collector が snapshot cadence で階段状に動いて見えない。
- manual collector の入力反映が 120ms 遅延補間に戻らない。
- server authoritative state と大きく乖離した場合は自動補正される。
- pickup、delivery、collision、slowdown は backend snapshot を正として維持される。
- `develop` 向け PR で差分が説明しやすい範囲に収まる。

## Notes

今回の問題は「入力値と描画を縁切った影響」という見方でほぼ正しい。厳密には、入力値そのものを切ったというより、manual collector の描画を delayed interpolation から外した結果、frontend が入力値で中間 frame を生成できない状態になったことが原因。

次の実装では、manual collector のみ入力 intent を描画へ渡し、表示専用の予測移動を入れる。これが、低遅延と滑らかさを同時に満たす最小構成になる。
