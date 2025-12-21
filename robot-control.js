async function askGemmaDecision() {
  if (robot.isThinking || !robot.controlEnabled) return;
  robot.isThinking = true;

  // 1. Python側の SensorInput クラスと完全に一致させる (422エラー対策)
  const payload = {
    front_distance: Number(window.state?.lastObstacleScore || 100), // float
    speed: Number(robot.vLin || 0),                               // float
    ml_results: window.state?.mlLastClass ? [String(window.state.mlLastClass)] : [] // List[str]
  };

  // 送信直前のデータを確認（デバッグ用）
  console.log("🚀 Sending to Gemma:", payload);

  try {
    const res = await fetch("/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorDetail = await res.json();
      console.error("❌ 422 Error Detail:", JSON.stringify(errorDetail, null, 2));
      return;
    }

    const json = await res.json();
    const rawText = json.data[0];

    // 2. Gemmaの出力からJSON部分だけを安全に抽出 (正規表現)
    const jsonMatch = rawText.match(/\{.*\}/s);
    if (jsonMatch) {
      const decision = JSON.parse(jsonMatch[0]);
      console.log("✅ Gemma Decision:", decision);

      // --- 挨拶の表示 (UI連携) ---
      if (decision.message) {
        const log = document.getElementById('gemma-log');
        if (log) {
          log.innerHTML = `<div style="color:#0f0; border-left:3px solid #f0f; padding-left:5px; margin-bottom:4px;">🤖 ${decision.message}</div>` + log.innerHTML;
        }
      }

      // --- ロボット制御への反映 ---
      // actionの値に応じて物理演算の速度を変更
      switch (decision.action) {
        case "move_forward":
          robot.vLin = decision.speed || 0.5;
          robot.vAng = 0;
          break;
        case "turn_left":
          robot.vLin = 0.1;
          robot.vAng = 1.0;
          break;
        case "turn_right":
          robot.vLin = 0.1;
          robot.vAng = -1.0;
          break;
        case "stop":
        default:
          robot.vLin = 0;
          robot.vAng = 0;
          break;
      }
    } else {
      console.warn("⚠️ JSON形式の回答が得られませんでした:", rawText);
    }

  } catch (e) {
    console.error("❌ 通信失敗:", e);
  } finally {
    robot.isThinking = false;
  }
}
