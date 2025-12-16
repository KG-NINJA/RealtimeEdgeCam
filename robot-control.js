// 日本語コメント: ロボット制御抽象レイヤー＋Canvasシミュレーター
(function () {
  'use strict';

  var MAX_LINEAR = 0.5;   // m/s
  var MAX_ANGULAR = 1.0;  // rad/s
  var DT_MS = 100;        // シミュレーター更新間隔
  var SIM_SIZE = 400;

  var robot = {
    connected: false,
    controlEnabled: false,
    autoMode: true,
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

  function ensureCanvas() {
    if (simCanvas) return;
    simCanvas = document.createElement('canvas');
    simCanvas.width = SIM_SIZE;
    simCanvas.height = SIM_SIZE;
    simCanvas.style.position = 'fixed';
    simCanvas.style.right = '10px';
    simCanvas.style.bottom = '10px';
    simCanvas.style.width = '400px';
    simCanvas.style.height = '400px';
    simCanvas.style.border = '1px solid #0af';
    simCanvas.style.background = 'rgba(0,0,0,0.7)';
    simCanvas.style.pointerEvents = 'none';
    document.body.appendChild(simCanvas);
    simCtx = simCanvas.getContext('2d');
  }

  function drawSimulator() {
    if (!simCtx) return;
    simCtx.clearRect(0, 0, SIM_SIZE, SIM_SIZE);
    simCtx.strokeStyle = '#0a4';
    simCtx.lineWidth = 1;
    for (var i = 0; i <= SIM_SIZE; i += 40) {
      simCtx.beginPath(); simCtx.moveTo(i + 0.5, 0); simCtx.lineTo(i + 0.5, SIM_SIZE); simCtx.stroke();
      simCtx.beginPath(); simCtx.moveTo(0, i + 0.5); simCtx.lineTo(SIM_SIZE, i + 0.5); simCtx.stroke();
    }
    if (robot.trail.length > 1) {
      simCtx.strokeStyle = '#0ff';
      simCtx.beginPath();
      for (var t = 0; t < robot.trail.length; t += 1) {
        var p = robot.trail[t];
        if (t === 0) simCtx.moveTo(p.x, p.y); else simCtx.lineTo(p.x, p.y);
      }
      simCtx.stroke();
    }
    simCtx.save();
    simCtx.translate(robot.x, robot.y);
    simCtx.rotate(robot.theta);
    simCtx.fillStyle = robot.controlEnabled ? '#0f0' : '#555';
    simCtx.strokeStyle = '#fff';
    simCtx.beginPath();
    simCtx.moveTo(12, 0);
    simCtx.lineTo(-12, -8);
    simCtx.lineTo(-12, 8);
    simCtx.closePath();
    simCtx.fill();
    simCtx.stroke();
    simCtx.restore();

    simCtx.fillStyle = '#0ff';
    simCtx.font = '12px monospace';
    simCtx.fillText('mode: ' + (robot.autoMode ? 'AUTO' : 'MANUAL') + ' (O)', 8, 16);
    simCtx.fillText('ctrl: ' + (robot.controlEnabled ? 'ON' : 'OFF') + ' (R)', 8, 32);
    simCtx.fillText('cmd: v=' + robot.vLin.toFixed(2) + ' w=' + robot.vAng.toFixed(2), 8, 48);
  }

  function sendRobotCommand(linear, angular) {
    robot.vLin = clamp(linear, -MAX_LINEAR, MAX_LINEAR);
    robot.vAng = clamp(angular, -MAX_ANGULAR, MAX_ANGULAR);
    robot.connected = true; // 日本語コメント: シミュレーター接続扱い
  }

  function emergencyStop() { sendRobotCommand(0, 0); }

  function autoControlStep() {
    var sem = window.semantic || {};
    var st = window.state || {};
    var obstacleRatio = 0;
    if (sem.stats && sem.stats.total > 0) {
      obstacleRatio = sem.stats.obstacle / Math.max(1, sem.stats.total);
    } else if (st.mlLastBox && st.procW && st.procH) {
      var area = st.mlLastBox.w * st.mlLastBox.h;
      obstacleRatio = area / Math.max(1, st.procW * st.procH);
    }

    if (obstacleRatio >= 0.30) {
      sendRobotCommand(0, 0);
    } else if (obstacleRatio >= 0.15) {
      sendRobotCommand(0.15, 0.4 * Math.sign((window.hazard && window.hazard.bestSteer) || 0));
    } else {
      sendRobotCommand(0.35, 0.2 * ((window.hazard && window.hazard.bestSteer) || 0));
    }
  }

  function handleManualKeys() {
    var lin = 0, ang = 0;
    if (keys.KeyW || keys.ArrowUp) lin += 1;
    if (keys.KeyS || keys.ArrowDown) lin -= 1;
    if (keys.KeyA || keys.ArrowLeft) ang += 1;
    if (keys.KeyD || keys.ArrowRight) ang -= 1;
    sendRobotCommand(lin * MAX_LINEAR, ang * MAX_ANGULAR);
  }

  window.addEventListener('keydown', function (ev) {
    if (ev.code === 'KeyR') {
      ev.preventDefault();
      robot.controlEnabled = !robot.controlEnabled;
      ensureCanvas();
      if (!robot.controlEnabled) emergencyStop();
    } else if (ev.code === 'KeyO') {
      ev.preventDefault();
      robot.autoMode = !robot.autoMode;
    } else if (ev.code === 'KeyX') {
      ev.preventDefault();
      emergencyStop();
    }
    keys[ev.code] = true;
  });

  window.addEventListener('keyup', function (ev) {
    keys[ev.code] = false;
  });

  function updateRobotControl(nowMs) {
    if (!robot.controlEnabled) return;
    ensureCanvas();
    if (robot.lastUpdate === 0) robot.lastUpdate = nowMs;
    if (nowMs - robot.lastUpdate < DT_MS) return;
    robot.lastUpdate = nowMs;

    if (robot.autoMode) {
      autoControlStep();
    } else {
      handleManualKeys();
    }

    var dt = DT_MS / 1000;
    robot.theta += robot.vAng * dt;
    var dx = Math.cos(robot.theta) * robot.vLin * dt * 80; // 視認性スケール
    var dy = Math.sin(robot.theta) * robot.vLin * dt * 80;
    robot.x = clamp(robot.x + dx, 10, SIM_SIZE - 10);
    robot.y = clamp(robot.y + dy, 10, SIM_SIZE - 10);

    robot.trail.push({ x: robot.x, y: robot.y });
    if (robot.trail.length > 400) robot.trail.shift();

    drawSimulator();
  }

  window.robot = robot;
  window.sendRobotCommand = sendRobotCommand;
  window.updateRobotControl = updateRobotControl;
})();
