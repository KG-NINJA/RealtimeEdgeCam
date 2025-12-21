(function () {
  'use strict';

  var SIM_SIZE = 400;
  // ⚠️ 自分のHugging Face SpaceのURL
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

    // --- 【重要修正】AIの判定基準（50）に合わせるため数値をスケーリング ---
    // window.state.lastObstacleScore が 0.57 の場合、57 として送る
    const rawScore = window.state?.lastObstacleScore || 1.0;
    const scaledDistance = Math.round(Number(rawScore) * 100);

    const payload = {
      front_distance: scaledDistance,
      speed: Number(robot.vLin || 0),
      ml_results: []
    };

    console.log("🚀 Sending to Gemma:", payload);

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
        console.log("✅ Decided Action:", data.action);

        // アクションを物理値に変換
        // move_forward が含まれていれば前進、それ以外（turn_left, stop等）は旋回
        if (data.action && data.action.includes("forward")) {
          robot.vLin = 0.7; // 少し速度アップ
          robot.vAng = 0;
        } else {
          // 障害物回避：その場で回転
          robot.vLin = 0.1;
          robot.vAng = 1.5; 
        }
      }
    } catch (e) {
      console.warn("⚠️ Gemma Decision Error:", e);
      // 通信エラー時の安全策
      robot.vLin = 0.2; robot.vAng = 0.8;
    } finally {
      robot.isThinking = false;
    }
  }

  function updateRobotControl(now) {
    if (!robot.controlEnabled) return;
    ensureCanvas();

    // 1.2秒おきにAIに問い合わせ（少しレスポンスを速める）
    if (now - robot.lastDecisionAt > 1200) {
      askGemmaDecision();
      robot.lastDecisionAt = now;
    }

    // 物理演算（移動係数を100に強化して動きを分かりやすく）
    var dt = 0.1;
    robot.theta += robot.vAng * dt;
    robot.x += Math.cos(robot.theta) * robot.vLin * dt * 100;
    robot.y += Math.sin(robot.theta) * robot.vLin * dt * 100;

    // 画面端のループ処理
    if (robot.x < 0) robot.x = SIM_SIZE; if (robot.x > SIM_SIZE) robot.x = 0;
    if (robot.y < 0) robot.y = SIM_SIZE; if (robot.y > SIM_SIZE) robot.y = 0;

    // 描画更新
    simCtx.clearRect(0, 0, SIM_SIZE, SIM_SIZE);
    
    // 背景にグリッド（任意：移動感を確認しやすくするため）
    simCtx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
    for(let i=0; i<SIM_SIZE; i+=50){
      simCtx.beginPath(); simCtx.moveTo(i,0); simCtx.lineTo(i,SIM_SIZE); simCtx.stroke();
      simCtx.beginPath(); simCtx.moveTo(0,i); simCtx.lineTo(SIM_SIZE,i); simCtx.stroke();
    }

    simCtx.save();
    simCtx.translate(robot.x, robot.y);
    simCtx.rotate(robot.theta);
    simCtx.strokeStyle = '#0f0';
    simCtx.lineWidth = 3;
    simCtx.strokeRect(-10, -10, 20, 20); // 少し大きく
    simCtx.beginPath();
    simCtx.moveTo(0, 0); simCtx.lineTo(15, 0); // 前方へのガイドライン
    simCtx.stroke();
    simCtx.restore();
  }

  // キーボードイベント登録
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR') {
      robot.controlEnabled = !robot.controlEnabled;
      if (simCanvas) {
        simCanvas.style.display = robot.controlEnabled ? 'block' : 'none';
      }
      console.log("🤖 Autonomous Mode:", robot.controlEnabled ? "ON" : "OFF");
    }
  });

  // メインループから呼ばれるようにグローバル登録
  window.updateRobotControl = updateRobotControl;

})();
