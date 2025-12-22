/* =========================================================
   A-1 POODLE ROBOT – FINAL STABLE JS
   Edge Detection + Steering + Emotion
   (IndexSizeError 完全対策済み)
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
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
  .then(stream => {
    video.srcObject = stream;
    video.play();
  });

/* =========================================================
   OPENCV INIT
========================================================= */
cv.onRuntimeInitialized = () => {
  video.addEventListener('loadedmetadata', () => {

    // 内部解像度は video に完全一致させる
    capCanvas.width  = video.videoWidth;
    capCanvas.height = video.videoHeight;
    cvCanvas.width   = video.videoWidth;
    cvCanvas.height  = video.videoHeight;

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

  const vw = capCanvas.width;
  const vh = capCanvas.height;

  // video → capCanvas
  capCtx.drawImage(video, 0, 0, vw, vh);
  const imgData = capCtx.getImageData(0, 0, vw, vh);
  src.data.set(imgData.data);

  // Edge
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  cv.Canny(gray, edge, 80, 150);

  /* -------- 前方中央エッジ密度 -------- */
  let count = 0;
  const cx = Math.floor(vw / 2);
  const band = Math.floor(vw * 0.15);

  for (let y = Math.floor(vh * 0.4); y < Math.floor(vh * 0.6); y++) {
    for (let x = cx - band; x < cx + band; x++) {
      if (edge.ucharPtr(y, x)[0]) count++;
    }
  }

  state.lastObstacleScore = Math.max(0, 100 - count / 120);

  /* -------- canvas 解像度基準で RGBA 生成 -------- */
  const cw = cvCanvas.width;
  const ch = cvCanvas.height;
  const rgba = new Uint8ClampedArray(cw * ch * 4);

  for (let y = 0; y < ch; y++) {
    const sy = Math.floor(y * vh / ch);
    for (let x = 0; x < cw; x++) {
      const sx = Math.floor(x * vw / cw);
      const v = edge.ucharPtr(sy, sx)[0];
      const i = (y * cw + x) * 4;

      // プードル用やさしい色
      rgba[i]     = 180;
      rgba[i + 1] = 255;
      rgba[i + 2] = 200;
      rgba[i + 3] = v ? 255 : 0;
    }
  }

  const edgeImg = new ImageData(rgba, cw, ch);
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

  // なつっこい慣性
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

  if (fast && d > 80) {
    state.emotionBase = 'excited';
  } else if (d > 60) {
    state.emotionBase = 'happy';
  } else {
    state.emotionBase = 'curious';
  }

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
