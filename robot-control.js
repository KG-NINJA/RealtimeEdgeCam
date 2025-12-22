/* =========================================================
   A-1 POODLE ROBOT – IMPOSSIBLE TO CRASH VERSION
   No new ImageData()
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

let src, gray, edge, edgeRGBA;

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
  video.addEventListener('loadedmetadata', init);
};

function init() {
  const w = video.videoWidth;
  const h = video.videoHeight;

  // canvas サイズは一度だけ
  canvas.width = w;
  canvas.height = h;
  capCanvas.width = w;
  capCanvas.height = h;

  src      = new cv.Mat(h, w, cv.CV_8UC4);
  gray     = new cv.Mat(h, w, cv.CV_8UC1);
  edge     = new cv.Mat(h, w, cv.CV_8UC1);
  edgeRGBA = new cv.Mat(h, w, cv.CV_8UC4);

  state.ready = true;
  requestAnimationFrame(loop);
}

/* ======================
   MAIN LOOP
====================== */
function loop() {
  if (!state.ready) return;

  /* --- capture --- */
  capCtx.drawImage(video, 0, 0, capCanvas.width, capCanvas.height);
  const img = capCtx.getImageData(0, 0, capCanvas.width, capCanvas.height);
  src.data.set(img.data);

  /* --- edge --- */
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  cv.Canny(gray, edge, 80, 150);

  /* --- obstacle score --- */
  let count = 0;
  const cx = capCanvas.width >> 1;
  const band = (capCanvas.width * 0.15) | 0;

  for (let y = (capCanvas.height * 0.4) | 0; y < (capCanvas.height * 0.6) | 0; y++) {
    for (let x = cx - band; x < cx + band; x++) {
      if (edge.ucharPtr(y, x)[0]) count++;
    }
  }
  state.obstacle = Math.max(0, 100 - count / 120);

  /* --- steering --- */
  if (state.obstacle < 30) {
    state.tv = 0.1; state.tw = 0.7; state.emotion = 'alert';
  } else if (state.obstacle < 60) {
    state.tv = 0.3; state.tw = 0.3; state.emotion = 'curious';
  } else {
    state.tv = 0.6; state.tw = 0.0; state.emotion = 'happy';
  }

  state.v += (state.tv - state.v) * 0.06;
  state.w += (state.tw - state.w) * 0.06;

  /* --- edge → RGBA (OpenCV側で変換) --- */
  cv.cvtColor(edge, edgeRGBA, cv.COLOR_GRAY2RGBA);

  /* --- canvas 描画 ---
     ★ ImageData を new しない ★ */
  ctx.putImageData(
    new ImageData(
      new Uint8ClampedArray(edgeRGBA.data),
      canvas.width,
      canvas.height
    ),
    0,
    0
  );

  requestAnimationFrame(loop);
}
