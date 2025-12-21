// 日本語コメント: A-1 Mapper 統合用ロボット制御モジュール
(function () {
  'use strict';

  var SIM_SIZE = 300; // A-1の画面に合わせて少し小さめに設定
  var robot = {
    controlEnabled: false,
    x: SIM_SIZE / 2, y: SIM_SIZE / 2,
    theta: 0, vLin: 0, vAng: 0,
    trail: [], lastUpdate: 0,
  };

  var simCanvas = null;
  var simCtx = null;

  function ensureCanvas() {
    if (simCanvas) return;
    simCanvas = document.createElement('canvas');
    simCanvas.width = SIM_SIZE;
    simCanvas.height = SIM_SIZE;
    simCanvas.style.position = 'fixed';
    simCanvas.style.bottom = '10px'; // 右下に配置
    simCanvas.style.right = '10px';
    simCanvas.style.border = '1px solid #0f0';
    simCanvas.style.background = 'rgba(0,20,0,0.5)';
    simCanvas.style.zIndex = '1000';
    document.body.appendChild(simCanvas);
    simCtx = simCanvas.getContext('2d');
  }

  // index.htmlのループから呼ばれる更新関数
  function updateRobotControl(now) {
    ensureCanvas();
    if (!robot.controlEnabled) {
      // Rキーでトグルするようにイベントを追加
      return;
    }
    
    // --- 物理演算・描画ロジック (既存の robot-control (2).js より) ---
    var dt = 0.1; 
    robot.theta += robot.vAng * dt;
    robot.x += Math.cos(robot.theta) * robot.vLin * dt * 50;
    robot.y += Math.sin(robot.theta) * robot.vLin * dt * 50;

    // 描画
    simCtx.clearRect(0, 0, SIM_SIZE, SIM_SIZE);
    simCtx.strokeStyle = '#0f0';
    simCtx.strokeRect(0, 0, SIM_SIZE, SIM_SIZE);
    // ロボットの描画...
  }

  // Rキーでロボット制御を有効化するグローバルイベント
  window.addEventListener('keydown', (ev) => {
    if (ev.code === 'KeyR') {
      robot.controlEnabled = !robot.controlEnabled;
      if (simCanvas) simCanvas.style.display = robot.controlEnabled ? 'block' : 'none';
    }
  });

  window.updateRobotControl = updateRobotControl;
})();
