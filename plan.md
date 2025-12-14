# 3Dcap plan（A-1 Artificial Structure Wireframe Mapper）

## Goal
- iPhone Safariで「カメラ→直線抽出→疑似3Dワイヤフレーム」を20fps以上で安定動作させる
- 人工物らしい直線（長い・水平/垂直）を強調し、ノイズとフリッカーを抑える

## Progress（ピクセル進捗）
- 現在: 80%（🏅ボーナス到達）

```
🟩🟩🟩🟩🟩🟨🟨🟨⬜⬜
```

## Done
- Mat再利用（VideoCapture + 低解像度proc Mat）でメモリ/CPU削減
- CVを時間間引き（msスロットリング）してフレームレート維持
- Manhattanフィルタ（水平/垂直）+ 長さ閾値 + 線分マージで構造強調
- Three.jsをLineSegments + TypedArray更新に集約（毎フレームの大量オブジェクト生成を排除）
- 線分トラッキング（TTL + 指数平滑）でフリッカー抑制

## Next
- iPhone実機でのパラメータ詰め（Canny/Hough/TTL/間引き）と限界測定
- 追従カメラ/座標系（疑似3D）の定量的整理（後段Depth/SLAMに繋げるため）

## Risks（Game Over回避）
- OpenCV.jsの初回ロードが重い/ネットが不安定だと起動が遅い（ローカル同梱は将来検討）
