/* =========================================================
   A-1 POODLE ROBOT – COMPLETE & STABLE JS
   Edge Detection + Steering + Emotion (No cv.imshow)
========================================================= */

const state = {
  cvReady: false,

  // センサ
  lastObstacleScore: 100,

  // ロボット運動
  robotVLin: 0,
  robotVAng: 0,
  targetVLin: 0,
  targetVAng: 0,

  // 感情
  emotionCore: 'happy',
  emotionBase: 'happy',
  emotionOverlay: null,
  emotionOverlayUntil: 0,
  emotionState: 'happy',
  emotionIntensity: 0.7,
  emotionNextUpdate: 0,
};

const video = document.getElementById('video');
const cvCanvas = document.getElementById('cv');
const cvCtx = cvCanvas.getContext('2d');

const capCanvas = document.createElement('canvas');
const capCtx = capCanvas.getContext('2d', { willReadFrequently: true });

let src, gray, edge;

/* =========================================================
   CAMERA
========================================================= */
navigator.mediaDevices.getUserMedia({ video: true }).then(s => {
  video.srcObject = s;
  video.play();
});

/* =========================================================
   OPENCV INIT
========================================================= */
cv['onRuntimeInitialized'] = () => {
  video.addEventListener('loadedmetadata', () => {
    capCanvas.width = video.videoWidth;
    capCanvas.height = video.videoHeight;
    cvCanvas.width = video.videoWidth;
    cvCanvas.height = video.videoHeight;

    src  = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC4);
    gray = new cv.Mat();
    edge = new cv.Mat();

    state.cvReady = true;
    requestAnimationFrame(loop);
  });
};

/* =========================================================
   EDGE DETECTION (SAFE)
========================================================= */
function runCV() {
  if (!state.cvReady) return;

  const w = capCanvas.width;
  const h = capCanvas.height;

  capCtx.drawImage(video, 0, 0, w, h);
  const imgData = capCtx.getImageData(0, 0, w, h);
  src.data.set(imgData.data);

  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  cv.Canny(gray, edge, 80, 150);

  /* --- 前方中央のエッジ密度 --- */
  let count = 0;
  const cx = Math.floor(w / 2);
  const band = Math.floor(w * 0.15);

  for (let y = Math.floor(h * 0.4); y < Math.floor(h * 0.6); y++) {
    for (let x = cx - band; x < cx + band; x++) {
      if (edge.ucharPtr(y, x)[0]) count++;
    }
  }

  state.lastObstacleScore = Math.max(0, 100 - count / 120);

  /* --- 1ch → RGBA 描画 --- */
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const v = edge.data[i];
    const j = i * 4;
    rgba[j]     = 180;           // R（やさしい色）
    rgba[j + 1] = 255;           // G
    rgba[j + 2] = 200;           // B
    rgba[j + 3] = v ? 255 : 0;   // エッジのみ表示
  }

  const edgeImg = new ImageData(rgba, w, h);
  cvCtx.putImageData(edgeImg, 0, 0);
}

/* =========================================================
   STEERING (v / ω)
========================================================= */
function updateSteering() {
  const d = state.lastObstacleScore;

  if (d < 30) {
    state.targetVLin = 0.1;
    state.targetVAng = 0.7;
  } else if (d < 60) {
    state.targetVLin = 0.3;
    state.targetVAng = 0.3;
  } else {
    state.targetVLin = 0.6;
    state.targetVAng = 0.0;
  }

  state.robotVLin += (state.targetVLin - state.robotVLin) * 0.06;
  state.robotVAng += (state.targetVAng - state.robotVAng) * 0.06;
}

/* =========================================================
   🐩 POODLE EMOTION MODEL
========================================================= */
function updateEmotion(now) {
  if (now < state.emotionNextUpdate) return;
  state.emotionNextUpdate = now + 300;

  const d = state.lastObstacleScore;
  const fast = state.robotVLin > 0.5;

  // Base
  if (fast && d > 80) {
    state.emotionBase = 'excited';
  } else if (d > 60) {
    state.emotionBase = 'happy';
  } else {
    state.emotionBase = 'curious';
  }

  // Overlay
  if (d < 30) {
    state.emotionOverlay = 'alert';
    state.emotionOverlayUntil = now + 600;
  }

  if (state.emotionOverlay && now > state.emotionOverlayUntil) {
    state.emotionOverlay = null;
  }

  state.emotionState =
    state.emotionOverlay || state.emotionBase || state.emotionCore;
}

/* =========================================================
   MAIN LOOP
========================================================= */
function loop(now) {
  runCV();
  updateSteering();
  updateEmotion(now);

  requestAnimationFrame(loop);
}
