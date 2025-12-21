(() => {
  "use strict";

  /* ===============================
     設定・定数
  =============================== */

  const DECISION_API =
    "https://KGNINJA-FunctionGemmabotdemo-docker.hf.space/decide";

  const DT = 0.016; // 60fps
  const DECISION_INTERVAL = 300; // ms

  let lastDecisionAt = 0;

  /* ===============================
     ロボット状態（唯一の真実）
  =============================== */

  const robot = {
    x: 200,
    y: 200,
    theta: 0,

    vLin: 0,
    vAng: 0,

    running: false, // Uキー
    auto: false,    // Oキー
  };

  /* ===============================
     入力状態
  =============================== */

  const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
  };

  /* ===============================
     キー入力
  =============================== */

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();

    if (k === "u") {
      robot.running = !robot.running;
      console.log("RUNNING:", robot.running);
    }
    if (k === "o") {
      robot.auto = !robot.auto;
      console.log("AUTO:", robot.auto);
    }

    if (k in keys) keys[k] = true;
  });

  window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    if (k in keys) keys[k] = false;
  });

  /* ===============================
     手動操作
  =============================== */

  function manualControlStep() {
    let v = 0;
    let w = 0;

    if (keys.w) v += 0.4;
    if (keys.s) v -= 0.2;
    if (keys.a) w -= 2.0;
    if (keys.d) w += 2.0;

    sendRobotCommand(v, w);
  }

  /* ===============================
     AI / API 自律制御
  =============================== */

  async function autoControlStep() {
    const now = performance.now();
    if (now - lastDecisionAt < DECISION_INTERVAL) return;
    lastDecisionAt = now;

    // シンプルな疑似センサー（後で差し替え可）
    const obstacleRatio = Math.random(); // デモ用

    try {
      const res = await fetch(DECISION_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front_distance: 1.0 - obstacleRatio,
          speed: robot.vLin,
        }),
      });

      if (!res.ok) throw new Error("API error");
      const d = await res.json();

      switch (d.action) {
        case "move_forward":
          sendRobotCommand(d.speed ?? 0.3, 0);
          break;
        case "turn_left":
          sendRobotCommand(0.2, 1.0);
          break;
        case "turn_right":
          sendRobotCommand(0.2, -1.0);
          break;
        case "stop":
        default:
          sendRobotCommand(0, 0);
          break;
      }
    } catch (err) {
      console.warn("Decision API failed → STOP", err);
      sendRobotCommand(0, 0);
    }
  }

  /* ===============================
     出力（唯一の制御出口）
  =============================== */

  function sendRobotCommand(v, w) {
    robot.vLin = v;
    robot.vAng = w;
  }

  /* ===============================
     物理更新
  =============================== */

  function updateWorld(dt) {
    robot.theta += robot.vAng * dt;
    robot.x += Math.cos(robot.theta) * robot.vLin * 100 * dt;
    robot.y += Math.sin(robot.theta) * robot.vLin * 100 * dt;
  }

  /* ===============================
     メイン制御
  =============================== */

  function updateRobotControl() {
    if (!robot.running) {
      sendRobotCommand(0, 0);
      return;
    }

    if (robot.auto) {
      autoControlStep();
    } else {
      manualControlStep();
    }
  }

  /* ===============================
     描画（最低限）
  =============================== */

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(robot.x, robot.y);
    ctx.rotate(robot.theta);

    ctx.fillStyle = robot.auto ? "#4ade80" : "#60a5fa";
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-10, -10);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = "#fff";
    ctx.fillText(
      `RUN:${robot.running} AUTO:${robot.auto}`,
      10,
      20
    );
  }

  /* ===============================
     ループ
  =============================== */

  function loop() {
    updateRobotControl();
    updateWorld(DT);
    render();
    requestAnimationFrame(loop);
  }

  loop();
})();
