(function () {
  'use strict';

  // ⚠️ 自分のHugging Face Space URL
  const API_URL = "https://kgninja-functiongemmabotdemo-docker.hf.space/decide";

  var robot = {
    controlEnabled: false,
    x: 200, y: 200, // SIM_SIZEの中央
    theta: 0, vLin: 0, vAng: 0,
    lastDecisionAt: 0, isThinking: false,
    lastActionText: "WAITING"
  };

  async function askGemmaDecision() {
    if (robot.isThinking || !robot.controlEnabled) return;
    robot.isThinking = true;

    // 既存のステータスからスコアを取得 (0.488など)
    const rawScore = window.state?.lastObstacleScore || 1.0;
    const scaledDistance = Math.round(Number(rawScore) * 100);

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

        // 左側パネルの「Last Decision」を更新する（もしHTML要素があれば）
        const lastDecisionElem = document.querySelector('.status-item:last-child span') || 
                                 Array.from(document.querySelectorAll('div')).find(el => el.textContent.includes('Last Decision'));
        if (lastDecisionElem) {
            lastDecisionElem.textContent = `Last Decision: ${robot.lastActionText}`;
        }

        if (data.action.includes("forward")) {
          robot.vLin = 0.8; robot.vAng = 0;
        } else {
          robot.vLin = 0.1; robot.vAng = 1.8;
        }
      }
    } catch (e) {
      robot.lastActionText = "API ERROR";
    } finally {
      robot.isThinking = false;
    }
  }

  // メインの描画関数を上書きまたは拡張
  function updateRobotControl(now) {
    // window.updateRobotControl が外部から呼ばれることを想定
    // 右下のCanvas（シミュレーター）を取得
    const canvases = document.querySelectorAll('canvas');
    // 通常、最後に追加されたCanvasか、特定のサイズ(200x200等)のものがシミュレーター
    const simCanvas = canvases[canvases.length - 1]; 
    if (!simCanvas) return;
    const ctx = simCanvas.getContext('2d');
    const SW = simCanvas.width;
    const SH = simCanvas.height;

    if (!robot.controlEnabled) {
       // ロボットOFFの時は待機文字だけ出す
       ctx.fillStyle = "rgba(0, 255, 0, 0.2)";
       ctx.font = "12px monospace";
       ctx.fillText("ROBOT MODE: OFF", 10, SH - 10);
       return;
    }

    if (now - robot.lastDecisionAt > 1200) {
      askGemmaDecision();
      robot.lastDecisionAt = now;
    }

    // 物理演算
    var dt = 0.1;
    robot.theta += robot.vAng * dt;
    robot.x += Math.cos(robot.theta) * robot.vLin * dt * 40; // 枠に合わせて調整
    robot.y += Math.sin(robot.theta) * robot.vLin * dt * 40;

    // 枠内ループ
    if (robot.x < 0) robot.x = SW; if (robot.x > SW) robot.x = 0;
    if (robot.y < 0) robot.y = SH; if (robot.y > SH) robot.y = 0;

    // --- 描画 ---
    // 背景（透過させて元のグリッドを残す場合はclearRectしない）
    ctx.fillStyle = "rgba(0, 20, 0, 0.4)";
    ctx.fillRect(0, 0, 120, 50); // テキスト背景

    // AIの状態を表示
    ctx.fillStyle = "#0f0";
    ctx.font = "bold 14px monospace";
    ctx.fillText("AI: " + robot.lastActionText, 10, 20);
    ctx.font = "10px monospace";
    ctx.fillText("DIST: " + (Math.round(window.state?.lastObstacleScore * 100) || 0), 10, 35);
    
    if (robot.isThinking) {
      ctx.fillStyle = "#ff0";
      ctx.fillText("THINKING...", 10, 48);
    }

    // ロボット自体の描画
    ctx.save();
    ctx.translate(robot.x, robot.y);
    ctx.rotate(robot.theta);
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(-8, -8, 16, 16);
    ctx.beginPath();
    ctx.moveTo(0,0); ctx.lineTo(12,0);
    ctx.stroke();
    ctx.restore();
  }

  // キー入力
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR') {
      robot.controlEnabled = !robot.controlEnabled;
      const modeIndicator = Array.from(document.querySelectorAll('div')).find(el => el.textContent.includes('Robot Mode'));
      if(modeIndicator) modeIndicator.style.color = robot.controlEnabled ? "#0f0" : "#f00";
    }
  });

  // 既存のループに潜り込ませる
  window.updateRobotControl = updateRobotControl;

})();
