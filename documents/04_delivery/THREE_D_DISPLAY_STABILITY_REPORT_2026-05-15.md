# 3D Display Stability Report 2026-05-15

## 対象

3D 表示で、ごみや一部の魚が表示されない不安定問題の調査と修正。

## 原因

1. 3D agents 全体を 1 つの `Suspense` で包んでいたため、個別モデルの読み込み待ちや再読み込みが発生すると、レイヤー全体が一時的に空になっていた。
2. 個別モデルの失敗時に fallback はあったが、エラー状態を自動復帰させる仕組みがなく、モデル更新や再試行時に復旧しにくかった。
3. trash は以前 `instancedMesh` で最初の mesh だけ抜く描画だったため、GLB 内の一部しか出ず、モデルによっては簡略化されて見えていた。

## 修正内容

- [frontend/src/components/Canvas3D.tsx](/home/ogawa/programs/marchfes/marine-plastic-simulation/frontend/src/components/Canvas3D.tsx) で agents 全体を包む外側 `Suspense` を外し、各 agent ごとに `Suspense` を分離した。
- 同じく [frontend/src/components/Canvas3D.tsx](/home/ogawa/programs/marchfes/marine-plastic-simulation/frontend/src/components/Canvas3D.tsx) で `ModelErrorBoundary` に `resetKey` を追加し、モデルパスが変わったときに fallback から復帰できるようにした。
- trash は [frontend/src/components/Canvas3D.tsx](/home/ogawa/programs/marchfes/marine-plastic-simulation/frontend/src/components/Canvas3D.tsx) で `SkeletonUtils.clone(scene)` を使って GLB 全体を描画する方式に変更した。
- trash / carried trash の表示倍率を、他のエージェントとバランスする値に調整した。

## 再発防止

- 個別エージェントの読み込みとエラーは、個別の `Suspense` と fallback で閉じる。
- モデル差し替え時に boundary を復帰できるよう `resetKey` を持たせる。
- trash のように形状差が出やすいものは、最初の mesh だけ抜く instancing ではなく、必要ならシーン丸ごとの描画を優先する。

## 検証

- `frontend`: `npm run typecheck`
- `frontend`: `npm run build`

