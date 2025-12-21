// 日本語コメント: A-1 Mapper 統合用ロボット制御モジュール（完全版）
(function () {
  'use strict';

  /* ===== 設定と定数 ===== */
  var SIM_SIZE = 300;
  var DT_MS = 100;
  var DECISION_INTERVAL_MS = 2000; // 2秒ごとにGemmaへ問い合わせ

  var robot = {
    controlEnabled: false, // RキーでON/OFF
    x: SIM_SIZE / 2,
    y: SIM_SIZE / 2,
    theta: 0,
    vLin: 0,
    vAng: 0,
    trail: [],
    lastUpdate: 0,
    lastDecisionAt: 0,
    isThinking: false
  };

  var simCanvas = null;
  var simCtx = null;

  /* ===== シミュレーター用Canvas生成 ===== */
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

  /* ===== Gemma API通信 (422エラー完全対策版) ===== */
  async function askGemmaDecision() {
    if (robot.isThinking || !robot.controlEnabled) return;
    robot.isThinking = true;

    // Python側の SensorInput クラス (front_distance, speed, ml_results) に完全一致させる
    const payload = {
      front_distance: Number(window.state?.lastObstacleScore || 0),
      speed: Number(robot.vLin || 0),
      // COCO-SSDの検知クラスを配列で送る
      ml_results: window.state?.mlLastClass ? [String(window.state.mlLastClass)] : []
    };

    console.log("🚀 Requesting Gemma Decision:", payload);

    try {
      const res = await fetch("/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorDetail = await res.json();
        console.error("❌ API Error (422 etc):", errorDetail);
        return;
      }

      const json = await res.json();
      const rawText = json.data[0];

      // Gemmaが余計な文言をつけても大丈夫なようにJSON部分を抽出
      const match = rawText.match(/\{.*\}/s);
      if (match) {
        const decision = JSON.parse(match[0]);
        console.log("✅ Decision Received:", decision);

        // 1. 挨拶メッセージの表示
        if (decision.message) {
          const log = document.getElementById('gemma-log');
          if (log) {
            log.innerHTML = `<div style="color:#0ff; border-left:4px solid #f0f; padding-left:8px; margin-bottom:5px;">🤖 ${decision.message}</div>` + log.innerHTML;
          }
        }

        // 2. ロボット動作への反映
        applyDecision(decision);
      }
    } catch (e) {
      console.error("❌ Connection failed:", e);
    } finally {
      robot.isThinking = false;
    }
  }

  function applyDecision(data) {
    switch (data.action) {
      case "move_forward":
        robot.vLin = data.speed || 0.5;
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
  }

  /* ===== シミュレーター描画とループ ===== */
  function drawSimulator() {
    simCtx.clearRect(0, 0, SIM_SIZE, SIM_SIZE);
    
    // 軌跡
    simCtx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    simCtx.beginPath();
    robot.trail.forEach((p, i) => {
      if (i === 0) simCtx.moveTo(p.x, p.y);
      else simCtx.lineTo(p.x, p.y);
    });
    simCtx.stroke();

    // ロボット（三角形状）
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

  function updateRobotControl(now) {
    if (!robot.controlEnabled) return;
    ensureCanvas();

    // 一定間隔でAI判断を更新
    if (now - robot.lastDecisionAt > DECISION_INTERVAL_MS) {
      askGemmaDecision();
      robot.lastDecisionAt = now;
    }

    // 物理演算
    var dt = DT_MS / 1000;
    robot.theta += robot.vAng * dt;
    robot.x += Math.cos(robot.theta) * robot.vLin * dt * 60;
    robot.y += Math.sin(robot.theta) * robot.vLin * dt * 60;

    // 画面端の折り返し（簡易的な境界処理）
    if (robot.x < 0) robot.x = SIM_SIZE;
    if (robot.x > SIM_SIZE) robot.x = 0;
    if (robot.y < 0) robot.y = SIM_SIZE;
    if (robot.y > SIM_SIZE) robot.y = 0;

    robot.trail.push({ x: robot.x, y: robot.y });
    if (robot.trail.length > 200) robot.trail.shift();

    drawSimulator();
  }

  /* ===== キーイベント ===== */
  window.addEventListener('keydown', (ev) => {
    if (ev.code === 'KeyR') {
      robot.controlEnabled = !robot.controlEnabled;
      if (simCanvas) simCanvas.style.display = robot.controlEnabled ? 'block' : 'none';
      console.log("Robot Control:", robot.controlEnabled ? "ON" : "OFF");
    }
  });

  // グローバルに登録（index.htmlのmainLoopから呼び出すため）
  window.updateRobotControl = updateRobotControl;

})();
