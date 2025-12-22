(function () {
  'use strict';

  var SIM_SIZE = 400;
  const API_URL = "https://kgninja-functiongemmabotdemo-docker.hf.space/decide";

  var robot = {
    controlEnabled: false,
    x: SIM_SIZE / 2, y: SIM_SIZE / 2,
    theta: 0, vLin: 0, vAng: 0,
    lastDecisionAt: 0, isThinking: false,
    lastActionText: "STANDBY",
    lastDistText: "---",
    statusColor: "#00FF00"
  };

  var simCanvas = null, simCtx = null, hudDiv = null;

  // 🤖 画面上に直接テキストを表示するための要素を作成
  function ensureElements() {
    if (simCanvas) return;
    
    // Canvasの作成
    simCanvas = document.createElement('canvas');
    simCanvas.width = SIM_SIZE; simCanvas.height = SIM_SIZE;
    simCanvas.style.cssText = 'position:fixed !important; bottom:10px; right:10px; border:2px solid #0f0; background:rgba(0,10,0,0.8); z-index:999999; pointer-events:none;';
    document.body.appendChild(simCanvas);
    simCtx = simCanvas.getContext('2d');

    // HUDテキスト（Canvas外の表示）の作成
    hudDiv = document.createElement('div');
    hudDiv.style.cssText = 'position:fixed !important; bottom:420px; right:10px; color:#0f0; font-family:monospace; font-size:18px; font-weight:bold; background:rgba(0,0,0,0.7); padding:10px; border-radius:5px; z-index:999999; white-space:pre; border-left:5px solid #0f0;';
    document.body.appendChild(hudDiv);
  }

  async function askGemmaDecision() {
    if (robot.isThinking || !robot.controlEnabled) return;
    robot.isThinking = true;

    const rawScore = window.state?.lastObstacleScore || 1.0;
    const scaledDistance = Math.round(Number(rawScore) * 100);
    robot.lastDistText = scaledDistance;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front_distance: scaledDistance,
          speed: Number(robot.vLin || 0),
          ml_results: []
        })
      });

      const json = await res.json();
      const rawText = json.data[0];
      const match = rawText.match(/\{.*\}/s);
      
      if (match) {
        const data = JSON.parse(match[0]);
        robot.lastActionText = data.action.toUpperCase();
        
        if (data.action.includes("forward")) {
          robot.vLin = 0.8; robot.vAng = 0;
          robot.statusColor = "#00FF00";
        } else {
          robot.vLin = 0.1; robot.vAng = 1.8;
          robot.statusColor = "#FF00FF";
        }
      }
    } catch (e) {
      robot.lastActionText = "API ERROR";
      robot.statusColor = "#FF0000";
    } finally {
      robot.isThinking = false;
    }
  }

  function update() {
    if (!robot.controlEnabled) {
      if(simCanvas) { simCanvas.style.display = 'none'; hudDiv.style.display = 'none'; }
      requestAnimationFrame(update);
      return;
    }

    ensureElements();
    simCanvas.style.display = 'block';
    hudDiv.style.display = 'block';

    const now = performance.now();
    if (now - robot.lastDecisionAt > 1200) {
      askGemmaDecision();
      robot.lastDecisionAt = now;
    }

    // 物理演算
    var dt = 0.1;
    robot.theta += robot.vAng * dt;
    robot.x += Math.cos(robot.theta) * robot.vLin * dt * 100;
    robot.y += Math.sin(robot.theta) * robot.vLin * dt * 100;

    if (robot.x < 0) robot.x = SIM_SIZE; if (robot.x > SIM_SIZE) robot.x = 0;
    if (robot.y < 0) robot.y = SIM_SIZE; if (robot.y > SIM_SIZE) robot.y = 0;

    // 🤖 HUD（テキスト）の更新
    hudDiv.style.borderColor = robot.statusColor;
    hudDiv.style.color = robot.statusColor;
    hudDiv.textContent = `[ GEMMA AI STATUS ]\nDIST: ${robot.lastDistText}\nDECISION: ${robot.lastActionText}\nTHINKING: ${robot.isThinking ? "YES" : "NO"}`;

    // 🤖 Canvas描画
    simCtx.clearRect(0, 0, SIM_SIZE, SIM_SIZE);
    simCtx.save();
    simCtx.translate(robot.x, robot.y);
    simCtx.rotate(robot.theta);
    simCtx.strokeStyle = robot.statusColor;
    simCtx.lineWidth = 3;
    simCtx.strokeRect(-12, -12, 24, 24);
    simCtx.beginPath();
    simCtx.moveTo(0,0); simCtx.lineTo(20,0);
    simCtx.stroke();
    simCtx.restore();

    requestAnimationFrame(update);
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR') {
      robot.controlEnabled = !robot.controlEnabled;
      console.log("R Pressed: Control is " + robot.controlEnabled);
    }
  });

  // 実行開始
  requestAnimationFrame(update);

  // メインシステム用のインターフェース（互換性のため）
  window.updateRobotControl = function(){}; 
})();
