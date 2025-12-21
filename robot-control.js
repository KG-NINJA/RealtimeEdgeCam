(function () {
  'use strict';

  var SIM_SIZE = 400;
  // ⚠️ 自分のHugging Face SpaceのURLに必ず書き換えてください
  const API_URL = "https://kgninja-functiongemmabotdemo-docker.hf.space/decide";

  var robot = {
    controlEnabled: false,
    x: SIM_SIZE / 2, y: SIM_SIZE / 2,
    theta: 0, vLin: 0, vAng: 0,
    lastDecisionAt: 0, isThinking: false
  };

  var simCanvas = null, simCtx = null;

  function ensureCanvas() {
    if (simCanvas) return;
    simCanvas = document.createElement('canvas');
    simCanvas.width = SIM_SIZE; simCanvas.height = SIM_SIZE;
    simCanvas.style.position = 'fixed';
    simCanvas.style.bottom = '10px'; simCanvas.style.right = '10px';
    simCanvas.style.border = '2px solid #0f0';
    simCanvas.style.background = 'rgba(0,10,0,0.8)';
    simCanvas.style.zIndex = '1000';
    document.body.appendChild(simCanvas);
    simCtx = simCanvas.getContext('2d');
  }

  async function askGemmaDecision() {
    if (robot.isThinking || !robot.controlEnabled) return;
    robot.isThinking = true;

    const payload = {
      front_distance: Number(window.state?.lastObstacleScore || 100),
      speed: Number(robot.vLin || 0),
      ml_results: []
    };

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      const rawText = json.data[0];
      console.log("🤖 AI raw output:", rawText);

      // JSONを安全に抽出してパース
      const match = rawText.match(/\{.*\}/s);
      if (match) {
        const data = JSON.parse(match[0]);
        console.log("✅ Action:", data.action);

        // アクションを物理値に変換
        if (data.action && data.action.includes("forward")) {
          robot.vLin = 0.6; robot.vAng = 0;
        } else {
          // 障害物がある場合は旋回
          robot.vLin = 0.1; robot.vAng = 1.2;
        }
      }
    } catch (e) {
      console.warn("⚠️ Gemma Decision Error (Using fallback):", e);
      // 通信エラー時は安全のため少し旋回させる
      robot.vLin = 0.2; robot.vAng = 0.5;
    } finally {
      robot.isThinking = false;
    }
  }

  function updateRobotControl(now) {
    if (!robot.controlEnabled) return;
    ensureCanvas();

    // 1.5秒おきにAIに問い合わせ
    if (now - robot.lastDecisionAt > 1500) {
      askGemmaDecision();
      robot.lastDecisionAt = now;
    }

    // 物理演算（オイラー法）
    var dt = 0.1;
    robot.theta += robot.vAng * dt;
    robot.x += Math.cos(robot.theta) * robot.vLin * dt * 80;
    robot.y += Math.sin(robot.theta) * robot.vLin * dt * 80;

    // キャンバス端でのラップトップ（ループ）
    if (robot.x < 0) robot.x = SIM_SIZE; if (robot.x > SIM_SIZE) robot.x = 0;
    if (robot.y < 0) robot.y = SIM_SIZE; if (robot.y > SIM_SIZE) robot.y = 0;

    // 描画
    simCtx.clearRect(0, 0, SIM_SIZE, SIM_SIZE);
    simCtx.save();
    simCtx.translate(robot.x, robot.y);
    simCtx.rotate(robot.theta);
    simCtx.strokeStyle = '#0f0';
    simCtx.lineWidth = 2;
    simCtx.strokeRect(-8, -8, 16, 16);
    simCtx.beginPath();
    simCtx.moveTo(0, 0); simCtx.lineTo(12, 0); // 進行方向
    simCtx.stroke();
    simCtx.restore();
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR') {
      robot.controlEnabled = !robot.controlEnabled;
      if (simCanvas) simCanvas.style.display = robot.controlEnabled ? 'block' : 'none';
    }
  });

  window.updateRobotControl = updateRobotControl;
})();
