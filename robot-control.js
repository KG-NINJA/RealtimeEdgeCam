(function () {
  'use strict';

  var SIM_SIZE = 300;
  var robot = {
    controlEnabled: false,
    x: SIM_SIZE / 2, y: SIM_SIZE / 2,
    theta: 0, vLin: 0, vAng: 0,
    trail: [], lastUpdate: 0,
    lastDecisionAt: 0,
    isThinking: false
  };

  var simCanvas = null;
  var simCtx = null;

  function ensureCanvas() {
    if (simCanvas) return;
    simCanvas = document.createElement('canvas');
    simCanvas.width = SIM_SIZE;
    simCanvas.height = SIM_SIZE;
    simCanvas.style.position = 'fixed';
    simCanvas.style.bottom = '10px';
    simCanvas.style.right = '10px';
    simCanvas.style.border = '2px solid #0f0';
    simCanvas.style.background = 'rgba(0,20,0,0.7)';
    simCanvas.style.zIndex = '1000';
    document.body.appendChild(simCanvas);
    simCtx = simCanvas.getContext('2d');
  }

  /* ===== Gemma API通信 (422エラーを解決した完全な関数) ===== */
  async function askGemmaDecision() {
    if (robot.isThinking || !robot.controlEnabled) return;
    robot.isThinking = true;

    // Python側の SensorInput クラスの定義に 100% 合わせる
    const payload = {
      // ⚠️ front_dist ではなく front_distance に修正
      front_distance: Number(window.state?.lastObstacleScore || 0),
      speed: Number(robot.vLin || 0),
      // ⚠️ 必須項目 ml_results を必ず配列として追加
      ml_results: window.state?.mlLastClass ? [String(window.state.mlLastClass)] : []
    };

    console.log("🚀 Gemma Request:", payload);

    try {
      const res = await fetch("/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorDetail = await res.json();
        console.error("❌ 422 Error Detail:", errorDetail);
        return;
      }

      const json = await res.json();
      const rawText = json.data[0];

      // Gemmaの回答からJSONを抽出
      const match = rawText.match(/\{.*\}/s);
      if (match) {
        const data = JSON.parse(match[0]);
        
        // 挨拶表示 (UI連携)
        if (data.message) {
          const log = document.getElementById('gemma-log');
          if (log) log.innerHTML = `<div style="color:#0ff; border-left:3px solid #f0f; padding-left:8px; margin-bottom:4px;">🤖 ${data.message}</div>` + log.innerHTML;
        }

        // ロボット動作反映
        switch (data.action) {
          case "move_forward": robot.vLin = data.speed || 0.5; robot.vAng = 0; break;
          case "turn_left":    robot.vLin = 0.1; robot.vAng = 1.0; break;
          case "turn_right":   robot.vLin = 0.1; robot.vAng = -1.0; break;
          default:             robot.vLin = 0; robot.vAng = 0;
        }
      }
    } catch (e) {
      console.error("❌ Gemma Error:", e);
    } finally {
      robot.isThinking = false;
    }
  }

  function updateRobotControl(now) {
    if (!robot.controlEnabled) return;
    ensureCanvas();

    // 2秒ごとにAIに判断を仰ぐ
    if (now - robot.lastDecisionAt > 2000) {
      askGemmaDecision();
      robot.lastDecisionAt = now;
    }

    // 物理演算
    var dt = 0.1;
    robot.theta += robot.vAng * dt;
    robot.x += Math.cos(robot.theta) * robot.vLin * dt * 60;
    robot.y += Math.sin(robot.theta) * robot.vLin * dt * 60;

    // 描画
    simCtx.clearRect(0, 0, SIM_SIZE, SIM_SIZE);
    simCtx.save();
    simCtx.translate(robot.x, robot.y);
    simCtx.rotate(robot.theta);
    simCtx.strokeStyle = '#0f0';
    simCtx.lineWidth = 2;
    simCtx.beginPath();
    simCtx.moveTo(12, 0); simCtx.lineTo(-10, 8); simCtx.lineTo(-10, -8);
    simCtx.closePath();
    simCtx.stroke();
    simCtx.restore();
  }

  window.addEventListener('keydown', (ev) => {
    if (ev.code === 'KeyR') {
      robot.controlEnabled = !robot.controlEnabled;
      if (simCanvas) simCanvas.style.display = robot.controlEnabled ? 'block' : 'none';
      console.log("Robot Control:", robot.controlEnabled ? "ON" : "OFF");
    }
  });

  window.updateRobotControl = updateRobotControl;
})();
