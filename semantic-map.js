// 日本語コメント: Agent Vision向け「単色セマンティックマップ」生成
// - 入力: Depth(Float32Array, 単位m, width*height)
// - 出力: Canvasへ 走行可能(青) / 障害物(赤) / 未知(黒) を描画
// - 重要: 植物由来の欠損は「埋めない」。未知=黒として危険扱いに寄せる。

(function () {
  "use strict";

  // 日本語コメント: 色は固定（Agentが学習せずともルール化できる）
  const COLORS = {
    // 走行可能（通路/地面）
    safe: [0x00, 0x7b, 0xff, 0xff], // #007BFF
    // 障害物
    obstacle: [0xff, 0x00, 0x00, 0xff], // #FF0000
    // 未知（欠損/不確実）
    unknown: [0x00, 0x00, 0x00, 0xff], // #000000
  };

  function isFiniteDepth(z) {
    return Number.isFinite(z) && z > 0;
  }

  // 日本語コメント: 低コストな「地面期待Depth」推定（カメラ内部パラメータ不要）
  function estimateExpectedDepthPerRow({
    depth,
    width,
    height,
    nearM,
    farM,
    yStart,
    minSamplesPerRow,
    quantile,
  }) {
    const expected = new Float32Array(height);
    expected.fill(NaN);

    // 日本語コメント: sort用バッファ（毎行再利用）
    const row = new Float32Array(width);

    for (let y = yStart; y < height; y++) {
      const base = y * width;
      let n = 0;
      for (let x = 0; x < width; x++) {
        const z = depth[base + x];
        if (!isFiniteDepth(z) || z < nearM || z > farM) continue;
        row[n++] = z;
      }
      if (n < minSamplesPerRow) continue;

      // 日本語コメント: Float32Arrayのsortは数値昇順になる（比較関数不要）
      row.subarray(0, n).sort();
      const idx = Math.max(0, Math.min(n - 1, Math.floor(n * quantile)));
      expected[y] = row[idx];
    }

    // 日本語コメント: NaN穴埋め（前後行の値を流用して安定化）
    for (let y = 1; y < height; y++) {
      if (!Number.isFinite(expected[y])) expected[y] = expected[y - 1];
    }
    for (let y = height - 2; y >= 0; y--) {
      if (!Number.isFinite(expected[y])) expected[y] = expected[y + 1];
    }

    return expected;
  }

  // 日本語コメント: 外部公開API（window.renderSemanticMap）
  // 返り値: 統計（デバッグ/チューニング用）
  function renderSemanticMap({
    depth,
    width,
    height,
    canvas,
    // 日本語コメント: 近距離はDepthが暴れやすいので「未知」に逃がす（安全側）
    nearM = 0.25,
    farM = 6.0,
    // 日本語コメント: 「地面らしさ」許容幅（行ごとの期待Depthとの差）
    groundBandM = 0.02,
    // 日本語コメント: 5cm段差を障害物扱い（zが期待値より近い = 飛び出し）
    obstacleDeltaM = 0.05,
    // 日本語コメント: 地面推定に使う行（植物の混入を減らすため下側から）
    yStartRatio = 0.55,
    // 日本語コメント: 地面期待Depthの下位分位（値が小さいほど「近い」点を採用）
    // 下位20%は、障害物/植生の影響を受けにくいケースが多い
    expectedQuantile = 0.2,
  }) {
    if (!(depth instanceof Float32Array)) {
      throw new Error("depth must be Float32Array");
    }
    if (!canvas) {
      throw new Error("canvas is required");
    }
    if (depth.length !== width * height) {
      throw new Error(`depth length mismatch: got ${depth.length}, expected ${width * height}`);
    }

    // 日本語コメント: 出力Canvasの実解像度を固定（CSSで拡大してもピクセル境界を維持）
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const img = ctx.createImageData(width, height);
    const out = img.data;

    const yStart = Math.max(0, Math.min(height - 1, Math.floor(height * yStartRatio)));
    const expected = estimateExpectedDepthPerRow({
      depth,
      width,
      height,
      nearM,
      farM,
      yStart,
      minSamplesPerRow: 32,
      quantile: expectedQuantile,
    });

    let safeCount = 0;
    let obstacleCount = 0;
    let unknownCount = 0;

    for (let y = 0; y < height; y++) {
      const base = y * width;
      const zExp = expected[y];
      for (let x = 0; x < width; x++) {
        const z = depth[base + x];
        const i = (base + x) * 4;

        // 未知（黒）
        if (!isFiniteDepth(z) || z < nearM || z > farM || !Number.isFinite(zExp)) {
          out[i] = COLORS.unknown[0];
          out[i + 1] = COLORS.unknown[1];
          out[i + 2] = COLORS.unknown[2];
          out[i + 3] = COLORS.unknown[3];
          unknownCount++;
          continue;
        }

        // 障害物（赤）：期待地面より「近い」= 出っ張り/段差/物体の可能性
        if (z < zExp - obstacleDeltaM) {
          out[i] = COLORS.obstacle[0];
          out[i + 1] = COLORS.obstacle[1];
          out[i + 2] = COLORS.obstacle[2];
          out[i + 3] = COLORS.obstacle[3];
          obstacleCount++;
          continue;
        }

        // 走行可能（青）：期待地面付近
        if (Math.abs(z - zExp) <= groundBandM) {
          out[i] = COLORS.safe[0];
          out[i + 1] = COLORS.safe[1];
          out[i + 2] = COLORS.safe[2];
          out[i + 3] = COLORS.safe[3];
          safeCount++;
          continue;
        }

        // それ以外は未知（黒）：植物/段差の手前/反射などの不確実を危険側に倒す
        out[i] = COLORS.unknown[0];
        out[i + 1] = COLORS.unknown[1];
        out[i + 2] = COLORS.unknown[2];
        out[i + 3] = COLORS.unknown[3];
        unknownCount++;
      }
    }

    ctx.putImageData(img, 0, 0);

    return {
      safeCount,
      obstacleCount,
      unknownCount,
      total: width * height,
    };
  }

  // 日本語コメント: グローバルに公開（既存のnon-module構成に合わせる）
  window.renderSemanticMap = renderSemanticMap;
})();

