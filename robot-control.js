(function () {
  'use strict';

  var SIM_SIZE = 400;
  // Hugging Face SpaceのダイレクトURL（あなたのSpaceに合わせて変更してください）
  const API_URL = "https://kgninja-functiongemmabotdemo-docker.hf.space/decide";

  var robot = {
    controlEnabled: false,
    x: SIM_SIZE / 2, y: SIM_SIZE / 2,
    theta: 0, vLin: 0, vAng: 0,
    lastDecisionAt: 0, isThinking: false,
    trail: []
  };

  var simCanvas = null, simCtx = null;

  function ensureCanvas() {
    if (simCanvas) return;
    simCanvas = document.createElement('canvas');
    simCanvas.width = SIM_SIZE; simCanvas.height = SIM_SIZE;
    simCanvas.style.position = 'fixed';
    simCanvas.style.bottom = '10px'; simCanvas.style.right = '10px';
    simCanvas.style.border = '2px solid #0f0';
    simCanvas.style.background = 'rgba(0,20,0,0.8)';
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

      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

      const json = await res.json();
      const match = json.data[0].match(/\{.*\}/s);
      
      if (match) {
        const data = JSON.parse(match[0]);
        console.log("🤖 AI Decision:", data.action);
        
        if (data.action === "move_forward") { robot.vLin = 0.5; robot.vAng = 0; }
        else if (data.action === "turn_left") { robot.vLin = 0.1; robot.vAng = 1.0; }
        else { robot.vLin = 0; robot.vAng = 0; }
      }
    } catch (e) {
      console.error("Gemma API Error:", e);
    } finally {
      robot.isThinking = false;
    }
  }

  function updateRobotControl(now) {
    if (!robot.controlEnabled) return;
    ensureCanvas();

    if (now - robot.lastDecisionAt > 1500) {
      askGemmaDecision();
      robot.lastDecisionAt = now;
    }

    // 物理更新
    var dt = 0.1;
    robot.theta += robot.vAng * dt;
    robot.x += Math.cos(robot.theta) * robot.vLin * dt * 80;
    robot.y += Math.sin(robot.theta) * robot.vLin * dt * 80;

    // 描画
    simCtx.clearRect(0,0,SIM_SIZE,SIM_SIZE);
    simCtx.save();
    simCtx.translate(robot.x, robot.y);
    simCtx.rotate(robot.theta);
    simCtx.strokeStyle = '#0f0';
    simCtx.strokeRect(-8, -8, 16, 16); // ロボット本体
    simCtx.beginPath(); // 向きを示す線
    simCtx.moveTo(0,0); simCtx.lineTo(12,0);
    simCtx.stroke();
    simCtx.restore();
  }

  window.addEventListener('keydown', (e) => {
    if(e.code==='KeyR') {
      robot.controlEnabled = !robot.controlEnabled;
      if(simCanvas) simCanvas.style.display = robot.controlEnabled ? 'block' : 'none';
      console.log("Robot Control Mode:", robot.controlEnabled ? "ON" : "OFF");
    }
  });

  window.updateRobotControl = updateRobotControl;
})();
