# Manual Robot Input Latency Investigation and Implementation Plan

Date: 2026-05-15
Branch: `ogawa` after fast-forward merge from current `main`

## Summary

手動運転ロボの操作体験が遅く見える主因は、入力送信そのものではなく、入力反映後の snapshot 表示経路にある。

現在の入力経路は以下の通り。

1. `frontend/src/App.tsx` が keyboard / gamepad 入力を検知する。
2. `manualMove(dx, dy)` が WebSocket に `manual_move` を送る。
3. `backend/app/api/ws.py` が `manual_vx/manual_vy` を更新する。
4. 次の simulation tick で `Collector.update()` が速度へ反映する。
5. WebSocket snapshot が frontend に返る。
6. `frontend/src/hooks/useSimulation.ts` が running 中 snapshot の React state 反映を 100ms 間隔に間引く。
7. `frontend/src/components/Canvas3D.tsx` がさらに 120ms 遅らせた時刻で snapshot 間を補間して描画する。

このため、ユーザーがキーやスティックを倒してから 3D 画面で向きや移動が変わるまで、理論上おおむね `0-50ms backend tick待ち + 0-100ms frontend state間引き + 120ms 3D補間遅延 + network/queue` が乗る。最悪寄りでは 270ms 前後になり、操作用途では遅く感じる。

## Inspection Findings

### 入力送信は即時

`frontend/src/App.tsx` の keyboard 経路は、方向が変わった瞬間だけ `manualMove(dx, dy)` を呼ぶ。ここに debounce や throttle はない。

- keyboard: `keydown` / `keyup` で `updateMovement()` を即実行
- gamepad: `requestAnimationFrame` polling で axis 変化時に `manualMove()` を送信
- gamepad は `0.04` 未満の微小変化を抑制しているが、方向転換の主遅延ではない

### WebSocket 受信も即時

`backend/app/api/ws.py` は `manual_move` を受けると、該当 manual collector の `manual_vx/manual_vy` を直接更新している。DB、REST roundtrip、重い validation は挟まっていない。

### backend simulation 反映は次 tick

`backend/app/simulation/agents/collector.py` では、manual collector が `manual_vx/manual_vy` を `vx/vy` に変換するのは `Collector.update()` 内である。

default config の `tick_interval_ms` は 50ms なので、入力タイミングによっては最大約 50ms 後の tick まで物理状態へ反映されない。

### frontend state 更新が 100ms に間引かれている

`frontend/src/hooks/useSimulation.ts` では `LIVE_SNAPSHOT_STATE_INTERVAL_MS = 100` が設定されている。`phase === "running"` の snapshot は最新値だけ保持し、100ms 間隔で React state に apply される。

これは 3D 負荷軽減には効くが、手動操作の即応性には不利。backend が 50ms tick で動いていても、frontend state は running 中に最大 100ms 近く古くなる。

### 3D 表示が 120ms 過去を描画している

`frontend/src/components/Canvas3D.tsx` では `SNAPSHOT_INTERPOLATION_DELAY_MS = 120` が設定され、`performance.now() - 120ms` の時刻で snapshot samples を補間している。

これは低頻度 snapshot でも滑らかに見せるための処理だが、手動運転の操作反映では常に 120ms の視覚遅延になる。PR53 後に「滑らかだが入力が重い」と感じるなら、この変更が最も大きい。

## Root Cause

主因は 3D 描画側の補間遅延と snapshot state の間引きが、手動入力にも一律適用されていること。

backend の manual input handler は即時更新で、入力イベント送信にも目立つ遅延処理はない。したがって、改善対象は「manual robot だけ即応表示する」または「入力中だけ補間/間引きを弱める」設計が適切。

## Implementation Policy

### P0: manual robot の 3D 補間遅延を外す

手動運転ロボだけは `SNAPSHOT_INTERPOLATION_DELAY_MS` を使わず、最新 snapshot の位置・速度をそのまま描画する。

候補実装:

- `AgentState.metadata.is_manual === true` の agent を判定する。
- `AgentsLayer` の `useFrame()` で manual agent は `resolveInterpolatedMotion()` を使わず `{ x: agent.x, y: agent.y, vx: agent.vx, vy: agent.vy }` を使う。
- 自動ロボ、魚、ごみは現行補間を維持する。

狙い:

- PR53 の滑らかさ改善を全体では維持する。
- 操作対象だけ視覚遅延 120ms を削る。
- 変更範囲を `Canvas3D.tsx` に閉じる。

注意:

- manual robot だけ他 agent より少しカクつく可能性はある。
- 操作対象なので、滑らかさより即応性を優先する。

### P1: manual input 直後の snapshot state apply を即時化する

`manualMove()` 送信時刻を frontend 側で保持し、直近に manual input があった間だけ running snapshot の 100ms 間引きを bypass または短縮する。

候補実装:

- `useSimulation.ts` に `lastManualMoveSentAtRef` を追加する。
- `manualMove()` 呼び出し時に `performance.now()` を記録する。
- `scheduleSnapshot()` で `now - lastManualMoveSentAtRef.current < 250` の間は immediate apply、または interval を 16-33ms に短縮する。

狙い:

- 操作開始/方向転換/停止の反映を早める。
- 通常時は 100ms 間引きで描画負荷を抑える。

注意:

- 全 snapshot を常時即時 apply に戻すと PR52/53 の軽量化効果を削る。
- manual input 中だけ限定する。

### P2: 必要なら optimistic local display を追加する

P0/P1 でも足りない場合は、frontend が送信中の `dx/dy` を保持し、manual robot の表示位置だけ短時間ローカル予測する。

候補実装:

- `manualMove()` 送信値を `manualInputRef` に保持する。
- manual agent の最新 snapshot 位置から、次 snapshot まで `collector_speed` 相当で display-only prediction する。
- backend snapshot が届いたら必ず authoritative state に戻す。

狙い:

- network latency や server tick 待ちを隠せる。

注意:

- 実状態と表示状態がズレるため、pickup/base/collision 判定は backend snapshot を正とする。
- 今回の第一手としては P0/P1 の方が安全。

## Recommended First Patch

最初の実装は P0 + P1 の小さな組み合わせにする。

1. `Canvas3D.tsx`
   - `isManualAgent(agent)` helper を追加。
   - manual agent は interpolation delay を使わず最新 snapshot を描画。

2. `useSimulation.ts`
   - `lastManualMoveSentAtRef` を追加。
   - `manualMove()` 送信直後 250ms は `scheduleSnapshot(data, true)` 相当にする、または apply interval を短くする。

3. 検証
   - `npm run typecheck`
   - `npm run build`
   - 3D 表示で keyboard の押下、離上、反転操作を確認。
   - `?perf` overlay で FPS が大きく落ちないことを確認。
   - 可能なら `?perfNoInterp` と通常表示を比較し、manual robot だけ通常表示で近い即応性になっているか確認。

## Acceptance Criteria

- keyboard の押下/離上/方向転換が 3D 上で明確に 1拍遅れない。
- 自動 agent 群の滑らかさは PR53 の状態を維持する。
- manual robot OFF のときは余計な WebSocket 送信や即時 apply が走らない。
- 2D 表示、3D 表示、gamepad 操作で既存機能を壊さない。
- `npm run typecheck` と `npm run build` が通る。
