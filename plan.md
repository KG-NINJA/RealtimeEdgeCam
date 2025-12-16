# 3Dcap plan（A-1 Artificial Structure Wireframe Mapper）

## Goal
- エッジ＋COCO-SSDの障害物検知を基盤に、音声挨拶・ロボット制御・AI連携をワンキーで試せるデモにする

## Progress（ピクセル進捗）
- 現在: 90%（🏅ボーナス到達）

```
🟩🟩🟩🟩🟩🟩🟨🟨🟨⬜
```

## Done
- Mat再利用（VideoCapture + 低解像度proc Mat）でメモリ/CPU削減
- CVを時間間引き（msスロットリング）してフレームレート維持
- Manhattanフィルタ（水平/垂直）+ 長さ閾値 + 線分マージで構造強調
- Three.jsをLineSegments + TypedArray更新に集約（毎フレームの大量オブジェクト生成を排除）
- 線分トラッキング（TTL + 指数平滑）でフリッカー抑制
- 音声挨拶（人/動物検出時に自動、H/Tキーで制御）
- ロボット制御レイヤー＋シミュレーター（R/O/X + WASD/矢印、AUTO障害物回避）
- Gemini Nano初期化フック（Gキー）

## Next
- iPhone実機でのパラメータ詰め（Canny/Hough/TTL/間引き）と負荷測定
- 実機ロボットへの送信パス実装（WebSocket/シリアルなど）と安全装置（deadman）
- 挨拶/制御ログをUIに簡易表示（デバッグ容易化）

## Risks（Game Over回避）
- OpenCV.jsの初回ロードが重い/ネットが不安定だと起動が遅い（ローカル同梱は将来検討）
- 実機統合時にネットワーク遅延で停止判定が遅れるリスク（ローカル制御優先を維持）
