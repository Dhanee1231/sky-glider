// On-device pose estimation with MediaPipe Pose Landmarker (lite), vendored in ./vendor.
// Video frames are processed in memory on this device only: nothing is uploaded or recorded.
import { evaluate } from './rules.js';
let landmarker = null, loading = null, curPoses = 1;
const base = new URL('./vendor/', import.meta.url).href;
// quiet MediaPipe's verbose engine logs (INFO/W/I lines) so the console stays clean
const origErr = console.error, origWarn = console.warn, origLog = console.log, origInfo = console.info;
const noisy = a => typeof a[0] === 'string' && /^(INFO:|[IWE]\d{4} |Graph successfully|.*gl_context|.*inference_feedback|.*landmark_projection|.*OpenGL error checking)/.test(a[0]);
function quiet(on) {
  if (on) { console.error = (...a) => noisy(a) ? 0 : origErr(...a); console.warn = (...a) => noisy(a) ? 0 : origWarn(...a); console.log = (...a) => noisy(a) ? 0 : origLog(...a); console.info = (...a) => noisy(a) ? 0 : origInfo(...a); }
}
quiet(true);
export let delegateUsed = null;
export async function loadModel(numPoses = 1, onStatus = () => { }) {
  if (landmarker) { if (numPoses !== curPoses) { await landmarker.setOptions({ numPoses }); curPoses = numPoses; } return landmarker; }
  if (loading) return loading;
  loading = (async () => {
    onStatus('Loading the pose coach (first time takes a moment)…');
    const { PoseLandmarker } = await import('./vendor/vision_bundle.mjs');
    const fileset = { wasmLoaderPath: base + 'vision_wasm_internal.js', wasmBinaryPath: base + 'vision_wasm_internal.wasm' };
    const opts = d => ({ baseOptions: { modelAssetPath: base + 'pose_landmarker_lite.task', delegate: d }, runningMode: 'VIDEO', numPoses, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
    try { landmarker = await PoseLandmarker.createFromOptions(fileset, opts('GPU')); delegateUsed = 'GPU'; }
    catch (e) { landmarker = await PoseLandmarker.createFromOptions(fileset, opts('CPU')); delegateUsed = 'CPU'; }
    curPoses = numPoses; onStatus(''); return landmarker;
  })();
  try { return await loading; } finally { loading = null; }
}

const EDGES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 31], [28, 32], [27, 29], [28, 30]];
const COL = { good: '#2ecc71', ok: '#f5c400', bad: '#ff4d4d', none: 'rgba(255,255,255,.85)' };
const PCOL = ['#5ad1ff', '#ff8fd0'];

// PoseCam: manages a <video> + overlay <canvas>, runs detection, evaluates a pose, calls onFrame(results)
export class PoseCam {
  constructor(video, canvas, opts = {}) { this.v = video; this.c = canvas; this.x = canvas.getContext('2d'); this.opts = opts; this.poseId = opts.poseId || null; this.numPoses = opts.numPoses || 1; this.facing = opts.facing || 'user'; this.running = false; this.smooth = []; this.lastT = -1; this.stream = null; this.fps = 0; }
  async start(onStatus = () => { }) {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera is not available in this browser.');
    await this.openStream();
    onStatus('Loading the pose coach…');
    await loadModel(this.numPoses, onStatus);
    this.running = true; this.loop(); onStatus('');
  }
  async openStream() {
    this.stopStream();
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: this.facing, width: { ideal: 640 }, height: { ideal: 480 } } });
    this.v.srcObject = this.stream; this.v.muted = true; this.v.playsInline = true; await this.v.play().catch(() => { });
    this.mirror = this.facing === 'user'; this.v.parentElement?.classList.toggle('mirror', this.mirror);
  }
  async flip() { this.facing = this.facing === 'user' ? 'environment' : 'user'; await this.openStream(); return this.facing; }
  async setPeople(n) { this.numPoses = n; this.smooth = []; if (landmarker) await loadModel(n); }
  stopStream() { if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; } this.v.srcObject = null; }
  stop() { this.running = false; cancelAnimationFrame(this.raf); this.stopStream(); this.x.clearRect(0, 0, this.c.width, this.c.height); }
  loop() {
    if (!this.running) return;
    this.raf = requestAnimationFrame(() => this.loop());
    const v = this.v; if (v.readyState < 2 || !landmarker) return;
    if (v.currentTime === this.lastT) return; this.lastT = v.currentTime;
    const now = performance.now(); let res;
    try { res = landmarker.detectForVideo(v, now); } catch (e) { return; }
    if (this.prevNow) this.fps = this.fps * 0.9 + 100 / Math.max(1, now - this.prevNow); this.prevNow = now;
    const asp = (v.videoWidth || 4) / (v.videoHeight || 3);
    // sort people left-to-right as seen on screen
    let people = (res.landmarks || []).map(l => l);
    const hipX = l => (l[23].x + l[24].x) / 2;
    people.sort((a, b) => this.mirror ? hipX(b) - hipX(a) : hipX(a) - hipX(b));
    people = people.map((l, i) => this.ema(i, l));
    const evals = people.map(l => this.poseId ? evaluate(this.poseId, l, asp) : null);
    this.draw(people, evals);
    // stillness (for Freeze game): mean movement of key joints
    const still = people.map((l, i) => { const p = this.prevPeople?.[i]; if (!p) return 0; let s = 0; for (const j of [11, 12, 15, 16, 23, 24, 27, 28]) s += Math.hypot(l[j].x - p[j].x, l[j].y - p[j].y); return s / 8; });
    this.prevPeople = people.map(l => l.map(p => ({ ...p })));
    this.opts.onFrame?.({ people, evals, still, asp, fps: this.fps });
  }
  ema(i, l) {
    const prev = this.smooth[i]; const a = 0.55;
    const out = l.map((p, j) => prev ? { x: prev[j].x + (p.x - prev[j].x) * a, y: prev[j].y + (p.y - prev[j].y) * a, visibility: p.visibility } : { x: p.x, y: p.y, visibility: p.visibility });
    this.smooth[i] = out; return out;
  }
  draw(people, evals) {
    const c = this.c, v = this.v, x = this.x;
    const W = c.clientWidth, H = c.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    // map normalized video coords -> canvas (object-fit: cover)
    const vw = v.videoWidth || 640, vh = v.videoHeight || 480; const s = Math.max(W / vw, H / vh); const dx = (W - vw * s) / 2, dy = (H - vh * s) / 2;
    const P = p => [dx + p.x * vw * s, dy + p.y * vh * s];
    people.forEach((l, pi) => {
      const ev = evals[pi]; const jc = {};
      if (ev && ev.rules) for (const r of ev.rules) for (const j of r.joints) { const prev = jc[j]; if (!prev || (prev === 'good') || (prev === 'ok' && r.status === 'bad')) jc[j] = r.status; }
      x.lineCap = 'round'; x.lineWidth = 6;
      for (const [a, b] of EDGES) { if ((l[a].visibility ?? 1) < 0.3 || (l[b].visibility ?? 1) < 0.3) continue; const A = P(l[a]), B = P(l[b]); x.strokeStyle = people.length > 1 ? PCOL[pi % 2] : 'rgba(255,255,255,.8)'; x.beginPath(); x.moveTo(A[0], A[1]); x.lineTo(B[0], B[1]); x.stroke(); }
      for (const j of [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) { if ((l[j].visibility ?? 1) < 0.3) continue; const A = P(l[j]); const st = jc[j]; x.fillStyle = COL[st || 'none']; x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; x.beginPath(); x.arc(A[0], A[1], st ? 9 : 6, 0, 7); x.fill(); x.stroke(); }
    });
  }
}
