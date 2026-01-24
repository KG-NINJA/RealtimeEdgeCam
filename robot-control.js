/* =========================================================
   A-1 POODLE ROBOT – IMPOSSIBLE TO CRASH VERSION
   No new ImageData()
========================================================= */

const state = {
  ready: false,
  obstacle: 100,
  v: 0, w: 0,
  tv: 0.0, tw: 0, // Default to 0 until policy is loaded
  emotion: 'happy',
  reflexStatus: 'NORMAL', // [NEW] NORMAL, CAUTION, HALT
  policy: null           // [NEW] Distilled from VCK5000
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

  src = new cv.Mat(h, w, cv.CV_8UC4);
  gray = new cv.Mat(h, w, cv.CV_8UC1);
  edge = new cv.Mat(h, w, cv.CV_8UC1);
  edgeRGBA = new cv.Mat(h, w, cv.CV_8UC4);

  // [NEW] Load Distilled Reflex Policy
  fetch('reflex-policy.json')
    .then(res => res.json())
    .then(p => {
      state.policy = p;
      console.log('🛡️ VCK5000 Reflex Policy Loaded:', p.metadata);
      state.ready = true;
      requestAnimationFrame(loop);
    })
    .catch(err => {
      console.error('❌ Failed to load policy:', err);
      // Fallback policy if file is missing
      state.policy = { thresholds: { critical_stop_score: 35, slowdown_score: 65, recovery_score: 75 } };
      state.ready = true;
      requestAnimationFrame(loop);
    });
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

  /* --- distilled reflex logic (VCK5000 Derived) --- */
  const { critical_stop_score, slowdown_score, recovery_score } = state.policy.thresholds;

  if (state.obstacle < critical_stop_score) {
    // HALT State (Safety First)
    state.reflexStatus = 'HALT';
    state.tv = 0.0;
    state.tw = 0.8; // Spin in place to find exit
    state.emotion = 'panic';
  } else if (state.obstacle < slowdown_score) {
    // CAUTION State (Buffer zone)
    state.reflexStatus = 'CAUTION';
    state.tv = 0.2;
    state.tw = 0.4;
    state.emotion = 'alert';
  } else if (state.obstacle > recovery_score) {
    // NORMAL State
    state.reflexStatus = 'NORMAL';
    state.tv = 0.6;
    state.tw = 0.0;
    state.emotion = 'happy';
  }

  /* --- update UI --- */
  const statusEl = document.getElementById('reflex-status-text');
  if (statusEl) {
    statusEl.textContent = state.reflexStatus;
    statusEl.style.color = state.reflexStatus === 'HALT' ? '#f00' : (state.reflexStatus === 'CAUTION' ? '#ff0' : '#0f0');
  }
  document.getElementById('obs-score').textContent = Math.round(state.obstacle);

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
