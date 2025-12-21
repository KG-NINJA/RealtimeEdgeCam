(function () {
  'use strict';

  var SIM_SIZE = 300;
  var robot = {
    controlEnabled: false,
    x: SIM_SIZE / 2, y: SIM_SIZE / 2,
    theta: 0, vLin: 0, vAng: 0,
    lastDecisionAt: 0, isThinking: false
  };

  /* ===== Gemma API通信 (422エラー完全回避版) ===== */
  async function askGemmaDecision() {
    if (robot.isThinking || !robot.controlEnabled) return;
    robot.isThinking = true;

    // 422エラーの原因「front_dist」を「front_distance」に修正し、
    // 必須項目「ml_results」を空配列として追加します
    const payload = {
      front_distance: Number(window.state?.lastObstacleScore || 0),
      speed: Number(robot.vLin || 0),
      ml_results: [] // 挨拶機能削除のため常に空
    };

    try {
      const res = await fetch("/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        console.error("422 Error: Check if server field names match 'front_distance' and 'ml_results'");
        return;
      }

      const json = await res.json();
      const match = json.data[0].match(/\{.*\}/s);
      if (match) {
        const data = JSON.parse(match[0]);
        
        // シンプルなアクション反映
        if (data.action === "move_forward") {
          robot.vLin = 0.5; robot.vAng = 0;
        } else if (data.action === "turn_left") {
          robot.vLin = 0.1; robot.vAng = 1.0;
        } else {
          robot.vLin = 0; robot.vAng = 0; // stop
        }
      }
    } catch (e) {
      console.error("Gemma Error:", e);
    } finally {
      robot.isThinking = false;
    }
  }

  /* ===== 更新ループ ===== */
  function updateRobotControl(now) {
    if (!robot.controlEnabled) return;

    // 2秒ごとに判断
    if (now - robot.lastDecisionAt > 2000) {
      askGemmaDecision();
      robot.lastDecisionAt = now;
    }

    var dt = 0.1;
    robot.theta += robot.vAng * dt;
    robot.x += Math.cos(robot.theta) * robot.vLin * dt * 60;
    robot.y += Math.sin(robot.theta) * robot.vLin * dt * 60;

    // 描画処理 (simCtxなど既存のものは維持)
    drawRobot(); 
  }

  function drawRobot() {
    var canvas = document.querySelector('canvas[style*="fixed"]'); 
    if(!canvas) return;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,SIM_SIZE,SIM_SIZE);
    ctx.save();
    ctx.translate(robot.x, robot.y);
    ctx.rotate(robot.theta);
    ctx.strokeStyle = '#0f0';
    ctx.strokeRect(-5, -5, 10, 10); // 簡易的な四角
    ctx.restore();
  }

  window.addEventListener('keydown', (e) => { if(e.code==='KeyR') robot.controlEnabled = !robot.controlEnabled; });
  window.updateRobotControl = updateRobotControl;
})();
