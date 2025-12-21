// 日本語コメント: ロボット制御抽象レイヤー＋Canvasシミュレーター
(function () {
  'use strict';

  /* ===== 定数 ===== */

  var MAX_LINEAR = 0.5;
  var MAX_ANGULAR = 1.0;
  var DT_MS = 100;
  var SIM_SIZE = 400;

  var DECISION_API =
    "https://KGNINJA-FunctionGemmabotdemo-docker.hf.space/decide";

  var DECISION_INTERVAL = 300;
  var lastDecisionAt = 0;

  /* ===== ロボット状態 ===== */

  var robot = {
    connected: false,
    controlEnabled: false, // R
    autoMode: true,        // O
    x: SIM_SIZE / 2,
    y: SIM_SIZE / 2,
    theta: 0,
    vLin: 0,
    vAng: 0,
    trail: [],
    lastUpdate: 0,
  };

  var simCanvas = null;
  var simCtx = null;
  var keys = {};

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ===== Canvas ===== */

  function ensureCanvas() {
    if (simCanvas) return;
    simCanvas = document.createElement('canvas');
    simCanvas.width = SIM_SIZE;
    simCanvas.height = SIM_SIZE;
    simCanvas.style.position = 'fixed';
    simCanvas.style.right = '10px';
    simCanvas.style.bottom = '10px';
    simCanvas.style.border = '1px solid #0af';
    simCanvas.style.background = 'rgba(0,0,0,0.7)';
    simCanvas.style.pointerEvents = 'none';
    document.body.appendChild(simCanvas);
    simCtx = simCanvas.getContext('2d');
  }

  function drawSimulator() {
    if (!simCtx) return;
    simCtx.clearRect(0, 0, SIM_SIZE, SIM_SIZE);

    if (robot.trail.length > 1) {
      simCtx.strokeStyle = '#0ff';
      simCtx.beginPath();
      robot.trail.forEach((p, i) => i ? simCtx.lineTo(p.x, p.y) : simCtx.moveTo(p.x, p.y));
      simCtx.stroke();
    }

    simCtx.save();
    simCtx.translate(robot.x, robot.y);
    simCtx.rotate(robot.theta);
    simCtx.fillStyle = robot.controlEnabled ? '#0f0' : '#555';
    simCtx.beginPath();
    simCtx.moveTo(12, 0);
    simCtx.lineTo(-12, -8);
    simCtx.lineTo(-12, 8);
    simCtx.closePath();
    simCtx.fill();
    simCtx.restore();

    simCtx.fillStyle = '#0ff';
    simCtx.font = '12px monospace';
    simCtx.fillText('mode: ' + (robot.autoMode ? 'AUTO' : 'MANUAL') + ' (O)', 8, 16);
    simCtx.fillText('ctrl: ' + (robot.controlEnabled ? 'ON' : 'OFF') + ' (R)', 8, 32);
  }

  /* ===== 出口 ===== */

  function sendRobotCommand(lin, ang) {
    robot.vLin = clamp(lin, -MAX_LINEAR, MAX_LINEAR);
    robot.vAng = clamp(ang, -MAX_ANGULAR, MAX_ANGULAR);
    robot.connected = true;
  }

  function emergencyStop() { sendRobotCommand(0, 0); }

  /* ===== 自律制御 ===== */

  async function autoControlStep() {
    var now = performance.now();
    if (now - lastDecisionAt < DECISION_INTERVAL) return;
    lastDecisionAt = now;

    try {
      var res = await fetch(DECISION_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front_distance: Math.random(),
          speed: robot.vLin
        })
      });

      var d = await res.json();

      if (d.action === "move_forward") sendRobotCommand(d.speed || 0.3, 0);
      else if (d.action === "turn_left") sendRobotCommand(0.2, 0.6);
      else if (d.action === "turn_right") sendRobotCommand(0.2, -0.6);
      else emergencyStop();

    } catch {
      emergencyStop();
    }
  }

  function handleManualKeys() {
    var lin = 0, ang = 0;
    if (keys.KeyW) lin += 1;
    if (keys.KeyS) lin -= 1;
    if (keys.KeyA) ang += 1;
    if (keys.KeyD) ang -= 1;
    sendRobotCommand(lin * MAX_LINEAR, ang * MAX_ANGULAR);
  }

  /* ===== 入力 ===== */

  window.addEventListener('keydown', function (ev) {
    if (ev.code === 'KeyR') robot.controlEnabled = !robot.controlEnabled;
    else if (ev.code === 'KeyO') robot.autoMode = !robot.autoMode;
    else if (ev.code === 'KeyX') emergencyStop();
    keys[ev.code] = true;
  });

  window.addEventListener('keyup', function (ev) {
    keys[ev.code] = false;
  });

  /* ===== 更新 ===== */

  function updateRobotControl(now) {
    if (!robot.controlEnabled) return;
    ensureCanvas();

    if (now - robot.lastUpdate < DT_MS) return;
    robot.lastUpdate = now;

    if (robot.autoMode) autoControlStep();
    else handleManualKeys();

    var dt = DT_MS / 1000;
    robot.theta += robot.vAng * dt;
    robot.x = clamp(robot.x + Math.cos(robot.theta) * robot.vLin * dt * 80, 10, SIM_SIZE - 10);
    robot.y = clamp(robot.y + Math.sin(robot.theta) * robot.vLin * dt * 80, 10, SIM_SIZE - 10);

    robot.trail.push({ x: robot.x, y: robot.y });
    if (robot.trail.length > 400) robot.trail.shift();

    drawSimulator();
  }

  window.updateRobotControl = updateRobotControl;
})();
const API = "https://KGNINJA-FunctionGemmabotdemo-docker.hf.space/decide";

document.getElementById("testDecision").onclick = async () => {
  const observation = {
    detected: ["person"],
    confidence: Math.random()
  };

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(observation)
    });

    const data = await res.json();
    console.log("REACTION:", data);

    document.getElementById("reactionLog").textContent =
      JSON.stringify(data, null, 2);

  } catch (e) {
    console.error("API ERROR", e);
    document.getElementById("reactionLog").textContent =
      "ERROR: " + e.message;
  }
};
