/* =========================================================
   A-1 POODLE ROBOT – ABSOLUTE FINAL STABLE JS
   IndexSizeError 永久封印版
========================================================= */

const state = {
  ready: false,

  obstacle: 100,

  v: 0, w: 0,
  tv: 0.4, tw: 0,

  emotion: 'happy'
};

const video = document.getElementById('video');
const canvas = document.getElementById('cv');
const ctx = canvas.getContext('2d');

const capCanvas = document.createElement('canvas');
const capCtx = capCanvas.getContext('2d', { willReadFrequently: true });

let src, gray, edge;
let DRAW_W = 0;
let DRAW_H = 0;
let RGBA_BUF = null;

/* ======================
   CAMERA
====================== */
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
  .then(s => {
    video.srcObject = s;
    video.play();
  });

/* ======================
   OPENCV INIT
====================== */
cv.onRuntimeInitialized = () => {
  video.addEventListener('loadedmetadata', initOnce);
};

function initOnce() {
  // ★ サイズはここで一度だけ決定 ★
  DRAW_W = video.videoWidth;
  DRAW_H = video.videoHeight;

  canvas.width = DRAW_W;
  canvas.height = DRAW_H;
  capCanvas.width = DRAW_W;
  capCanvas.height = DRAW_H;

  RGBA_BUF = new Uint8ClampedArray(DRAW_W * DRAW_H * 4);

  src  = new cv.Mat(DRAW_H, DRAW_W, cv.CV_8UC4);
  gray = new cv.Mat();
  edge = new cv.Mat();

  state.ready = true;
  requestAnimationFrame(loop);
}

/* ======================
   MAIN LOOP
====================== */
function loop(now) {
  if (!state.ready) return;

  /* --- Capture --- */
  capCtx.drawImage(video, 0, 0, DRAW_W, DRAW_H);
  const img = capCtx.getImageData(0, 0, DRAW_W, DRAW_H);
  src.data.set(img.data);

  /* --- Edge --- */
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  cv.Canny(gray, edge, 80, 150);

  /* --- Obstacle score --- */
  let count = 0;
  const cx = DRAW_W >> 1;
  const band = (DRAW_W * 0.15) | 0;

  for (let y = (DRAW_H * 0.4) | 0; y < (DRAW_H * 0.6) | 0; y++) {
    for (let x = cx - band; x < cx + band; x++) {
      if (edge.ucharPtr(y, x)[0]) count++;
    }
  }

  state.obstacle = Math.max(0, 100 - count / 120);

  /* --- Steering --- */
  if (state.obstacle < 30) {
    state.tv = 0.1; state.tw = 0.7;
    state.emotion = 'alert';
  } else if (state.obstacle < 60) {
    state.tv = 0.3; state.tw = 0.3;
    state.emotion = 'curious';
  } else {
    state.tv = 0.6; state.tw = 0.0;
    state.emotion = 'happy';
  }

  state.v += (state.tv - state.v) * 0.06;
  state.w += (state.tw - state.w) * 0.06;

  /* --- RGBA (固定バッファ) --- */
  const buf = RGBA_BUF;
  for (let i = 0, p = 0; i < DRAW_W * DRAW_H; i++, p += 4) {
    const v = edge.data[i];
    buf[p]     = 180;
    buf[p + 1] = 255;
    buf[p + 2] = 200;
    buf[p + 3] = v ? 255 : 0;
  }

  // ★ width / height は固定値のみ使用 ★
  const imgOut = new ImageData(buf, DRAW_W, DRAW_H);
  ctx.putImageData(imgOut, 0, 0);

  requestAnimationFrame(loop);
}
