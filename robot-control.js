(function () {
  'use strict';

  const API_URL = "https://kgninja-functiongemmabotdemo-docker.hf.space/decide";

  var robot = {
    controlEnabled: false,
    lastDecisionAt: 0,
    isThinking: false,
    lastAction: "WAITING",
    lastDist: 0
  };

  async function askGemmaDecision() {
    if (robot.isThinking || !robot.controlEnabled) return;
    robot.isThinking = true;

    // 現在のスコアを取得
    const rawScore = window.state?.lastObstacleScore || 1.0;
    robot.lastDist = Math.round(Number(rawScore) * 100);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front_distance: robot.lastDist,
          speed: 0, 
          ml_results: []
        })
      });

      const json = await res.json();
      const match = json.data[0].match(/\{.*\}/s);
      
      if (match) {
        const data = JSON.parse(match[0]);
        robot.lastAction = data.action.toUpperCase();

        // 1. 左側パネルの "Last Decision:" 行を特定して書き換え
        const statusLines = document.querySelectorAll('div, span, p');
        statusLines.forEach(el => {
          if (el.textContent.includes('Last Decision')) {
            el.innerHTML = `📍 Last Decision: <span style="color:#0f0">${robot.lastAction}</span>`;
          }
        });
      }
    } catch (e) {
      robot.lastAction = "ERROR";
    } finally {
      robot.isThinking = false;
    }
  }

  // 既存のシステム描画の後に実行されるようにフック
  function injectHUD() {
    const canvases = document.querySelectorAll('canvas');
    if (canvases.length < 2) return; // メイン映像とシミュレータの計2枚以上を想定

    // 右下のシミュレータ用Canvasを特定（通常は小さい方のCanvas）
    let simCanvas = canvases[canvases.length - 1];
    const ctx = simCanvas.getContext('2d');

    // 描画ループ
    function drawLoop() {
      if (robot.controlEnabled) {
        const now = performance.now();
        if (now - robot.lastDecisionAt > 1500) {
          askGemmaDecision();
          robot.lastDecisionAt = now;
        }

        // シミュレータ枠内にAI情報を強制描画
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(5, 5, 120, 45); // テキスト背景
        
        ctx.font = "bold 12px monospace";
        ctx.fillStyle = "#0f0";
        ctx.fillText("AI: " + robot.lastAction, 10, 20);
        ctx.fillText("DIST: " + robot.lastDist, 10, 35);
        
        if (robot.isThinking) {
          ctx.fillStyle = "#ff0";
          ctx.fillText("THINKING...", 10, 48);
        }
      }
      requestAnimationFrame(drawLoop);
    }
    drawLoop();
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR') {
      robot.controlEnabled = !robot.controlEnabled;
      console.log("Autonomous AI Mode:", robot.controlEnabled ? "ON" : "OFF");
      
      // Robot Mode: OFF/ON の表示も連動させる
      const modeLines = document.querySelectorAll('div, span, p');
      modeLines.forEach(el => {
        if (el.textContent.includes('Robot Mode')) {
          el.innerHTML = `🏎️ Robot Mode: <span style="color:${robot.controlEnabled ? '#0f0' : '#f00'}">${robot.controlEnabled ? 'ON' : 'OFF'}</span>`;
        }
      });
    }
  });

  // ページ読み込み完了後にインジェクション開始
  setTimeout(injectHUD, 2000);

})();
