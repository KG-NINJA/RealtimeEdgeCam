(function () {
  'use strict';

  var SIM_SIZE = 300;
  var robot = {
    controlEnabled: false,
    x: SIM_SIZE / 2, y: SIM_SIZE / 2,
    theta: 0, vLin: 0, vAng: 0,
    trail: [], lastUpdate: 0,
    isThinking: false // 通信中フラグ
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
    simCanvas.style.border = '1px solid #0f0';
    simCanvas.style.background = 'rgba(0,20,0,0.5)';
    simCanvas.style.zIndex = '1000';
    document.body.appendChild(simCanvas);
    simCtx = simCanvas.getContext('2d');
  }

  /* =====================
     Gemmaへの意志決定リクエスト (422エラー対策済み)
  ===================== */
  async function askGemmaDecision() {
    if (robot.isThinking || !robot.controlEnabled) return;
    robot.isThinking = true;

    // index.html側の状態(state)を参照
    const mlClass = window.state?.mlLastClass || "";
    const obstacle = window.state?.lastObstacleScore || 100;

    const payload = {
      front_distance: parseFloat(obstacle), // 数値型に変換
      speed: parseFloat(robot.vLin),        // 数値型に変換
      ml_results: mlClass ? [mlClass] : []  // 必ず配列形式にする
    };

    try {
      const res = await fetch("/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json();
        console.error("Gemma 422 Error Detail:", errJson);
        return;
      }

      const json = await res.json();
      const rawText = json.data[0];

      // JSON部分だけを抽出する(Gemmaの余計なトークン対策)
      const match = rawText.match(/\{.*\}/s);
      if (match) {
        const data = JSON.parse(match[0]);
        
        // 制御への反映
        if (data.action === "move_forward") { robot.vLin = data.speed || 0.5; robot.vAng = 0; }
        else if (data.action === "turn_left") { robot.vLin = 0.1; robot.vAng = 1.0; }
        else if (data.action === "turn_right") { robot.vLin = 0.1; robot.vAng = -1.0; }
        else { robot.vLin = 0; robot.vAng = 0; }

        // 挨拶表示
        if (data.message) {
          console.log("📢 Gemma says: " + data.message);
          const log = document.getElementById('gemma-log');
          if (log) log.innerHTML = `<div>🤖 ${data.message}</div>` + log.innerHTML;
        }
      }
    } catch (e) {
      console.error("Gemma Connection Failed", e);
    } finally {
      robot.isThinking = false;
    }
  }

  function updateRobotControl(now) {
    ensureCanvas();
    if (!robot.controlEnabled) return;

    // 定期的にGemmaに判断を仰ぐ (例: 2秒おき)
    if (now - robot.lastUpdate > 2000) {
      askGemmaDecision();
      robot.lastUpdate = now;
    }

    // 物理演算
    var dt = 0.1;
    robot.theta += robot.vAng * dt;
    robot.x += Math.cos(robot.theta) * robot.vLin * dt * 50;
    robot.y += Math.sin(robot.theta) * robot.vLin * dt * 50;

    // 描画
    simCtx.clearRect(0, 0, SIM_SIZE, SIM_SIZE);
    simCtx.strokeStyle = '#0f0';
    simCtx.strokeRect(0, 0, SIM_SIZE, SIM_SIZE);
    
    // ロボット（三角）
    simCtx.save();
    simCtx.translate(robot.x, robot.y);
    simCtx.rotate(robot.theta);
    simCtx.beginPath();
    simCtx.moveTo(10, 0); simCtx.lineTo(-8, 7); simCtx.lineTo(-8, -7);
    simCtx.closePath();
    simCtx.stroke();
    simCtx.restore();
  }

  window.addEventListener('keydown', (ev) => {
    if (ev.code === 'KeyR') {
      robot.controlEnabled = !robot.controlEnabled;
      if (simCanvas) simCanvas.style.display = robot.controlEnabled ? 'block' : 'none';
    }
  });

  window.updateRobotControl = updateRobotControl;
})();
