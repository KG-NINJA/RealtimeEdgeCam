(function () {
  'use strict';

  var SIM_SIZE = 400;
  const API_URL = "https://kgninja-functiongemmabotdemo-docker.hf.space/decide";

  var robot = {
    controlEnabled: false,
    x: SIM_SIZE / 2, y: SIM_SIZE / 2,
    theta: 0, vLin: 0, vAng: 0,
    lastDecisionAt: 0, isThinking: false,
    lastActionText: "Waiting...", // 画面表示用
    lastDistText: "0"             // 画面表示用
  };

  var simCanvas = null, simCtx = null;

  function ensureCanvas() {
    if (simCanvas) return;
    simCanvas = document.createElement('canvas');
    simCanvas.width = SIM_SIZE; simCanvas.height = SIM_SIZE;
    simCanvas.style.position = 'fixed';
    simCanvas.style.bottom = '10px'; simCanvas.style.right = '10px';
    simCanvas.style.border = '3px solid #0f0';
    simCanvas.style.background = 'rgba(0,10,0,0.85)';
    simCanvas.style.zIndex = '1000';
    document.body.appendChild(simCanvas);
    simCtx = simCanvas.getContext('2d');
  }

  async function askGemmaDecision() {
    if (robot.isThinking || !robot.controlEnabled) return;
    robot.isThinking = true;

    const rawScore = window.state?.lastObstacleScore || 1.0;
    const scaledDistance = Math.round(Number(rawScore) * 100);
    robot.lastDistText = scaledDistance;

    const payload = {
      front_distance: scaledDistance,
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
      
      const match = rawText.match(/\{.*\}/s);
      if (match) {
        const data = JSON.parse(match[0]);
        // 🤖 画面表示用のテキストを更新
        robot.lastActionText = data.action.toUpperCase();

        if (data.action && data.action.includes("forward")) {
          robot.vLin = 0.8; robot.vAng = 0;
        } else {
          robot.vLin = 0.1; robot.vAng = 1.8;
        }
      }
    } catch (e) {
      robot.lastActionText = "ERROR";
      robot.vLin = 0.2; robot.vAng = 0.5;
    } finally {
      robot.isThinking = false;
    }
  }

  function updateRobotControl(now) {
    if (!robot.controlEnabled) return;
    ensureCanvas();

    if (now - robot.lastDecisionAt > 1200) {
      askGemmaDecision();
      robot.lastDecisionAt = now;
    }

    var dt = 0.1;
    robot.theta += robot.vAng * dt;
    robot.x += Math.cos(robot.theta) * robot.vLin * dt * 100;
    robot.y += Math.sin(robot.theta) * robot.vLin * dt * 100;

    if (robot.x < 0) robot.x = SIM_SIZE; if (robot.x > SIM_SIZE) robot.x = 0;
    if (robot.y < 0) robot.y = SIM_SIZE; if (robot.y > SIM_SIZE) robot.y = 0;

    // --- 描画処理 ---
    simCtx.clearRect(0, 0, SIM_SIZE, SIM_SIZE);
    
    // 🤖 ステータス情報の表示（左上に表示）
    simCtx.fillStyle = "#0f0";
    simCtx.font = "bold 16px monospace";
    simCtx.fillText(`DISTANCE: ${robot.lastDistText}`, 15, 25);
    simCtx.fillText(`AI DECISION: ${robot.lastActionText}`, 15, 45);
    if(robot.isThinking) {
      simCtx.fillStyle = "#ff0";
      simCtx.fillText("THINKING...", 15, 65);
    }

    // ロボット本体の描画
    simCtx.save();
    simCtx.translate(robot.x, robot.y);
    simCtx.rotate(robot.theta);
    simCtx.strokeStyle = '#0f0';
    simCtx.lineWidth = 3;
    simCtx.strokeRect(-12, -12, 24, 24);
    simCtx.beginPath();
    simCtx.moveTo(0,0); simCtx.lineTo(18,0);
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
