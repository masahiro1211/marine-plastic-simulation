# Xbox Controller Input Fix Report 2026-05-15

## 対象

Xbox コントローラーで手動操作入力が入らず、ロボットを動かせない問題の修正。

作業ブランチ: `ogawa`

## 原因

フロント側の gamepad ポーリングが `navigator.getGamepads()` の先頭の非 `null` 要素をそのまま使っていたため、Xbox/Edge 環境で残っている切断済みスロットや古い gamepad 情報を拾うと、実際に接続されているコントローラーを読めない状態になっていた。

このため、`manual_move` が送られず、Xbox コントローラー入力が効かないように見えていた。

## 修正内容

- [frontend/src/App.tsx](/home/ogawa/programs/marchfes/marine-plastic-simulation/frontend/src/App.tsx) の gamepad 選択処理を修正した。
- `getGamepads()` の候補から、まず `connected === true` の gamepad を優先して選ぶようにした。
- gamepad の `id` が変わったときに、ボタン状態・リピート状態・最後の移動量をリセットするようにした。
- 既存の manual move 送信ロジックと UI 操作フローは維持した。

## 変更ファイル

- [frontend/src/App.tsx](/home/ogawa/programs/marchfes/marine-plastic-simulation/frontend/src/App.tsx)
- [documents/04_delivery/XBOX_CONTROLLER_INPUT_FIX_REPORT_2026-05-15.md](/home/ogawa/programs/marchfes/marine-plastic-simulation/documents/04_delivery/XBOX_CONTROLLER_INPUT_FIX_REPORT_2026-05-15.md)

## 検証

- `npm run typecheck`
- `npm run build`

## 補足

今回の修正はフロント側のみで、backend の `manual_move` 受信処理は変更していない。
