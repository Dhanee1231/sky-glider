// PixelFX glue for Neon Rush. Vendored modules are not modified.
// Visual only: no save data, no pixel read-back, no network.
import * as THREE from 'three';
import { createFrame, clearFrame, createFx, composite } from './vendor/pixelfx/src/core/index.js';
import * as collectBurst from './vendor/pixelfx/src/fx/pickups/collect-burst.js';
import * as powerStar from './vendor/pixelfx/src/fx/pickups/power-star.js';
import * as xpOrb from './vendor/pixelfx/src/fx/pickups/xp-orb.js';
import * as divineShield from './vendor/pixelfx/src/fx/holy/divine-shield.js';
import * as sunburst from './vendor/pixelfx/src/fx/holy/sunburst.js';
import * as confetti from './vendor/pixelfx/src/fx/ui/confetti.js';

const MAGENTA = ['#1a0420', '#3d0a48', '#701a78', '#b02aa8', '#ff3fd8', '#ff86ea', '#ffd2f8', '#ffffff'];
const YELLOW = ['#2a1604', '#5e3208', '#a05c0c', '#e09414', '#ffd23a', '#ffe97a', '#fff8c4', '#ffffff'];
const CYAN = ['#04101e', '#082a44', '#0c4a6e', '#128aa8', '#22c8e0', '#35f2ff', '#b8fbff', '#ffffff'];
const PARTY = ['#ff3fd8', '#ffb000', '#ffd23a', '#7dff6a', '#35f2ff', '#8a6bff', '#ff6ab8'];

// fx-2: native pixel size, well under ~25% of the phone screen. Never full-screen.
const SCREEN_CAP = 0.22;
// fx-2: at most 3 collect-burst, and at most 3 one-shots total (collect-burst + confetti).
const BURST_CAP = 3;
const SHOT_CAP = 3;
// Low graphics draws no PixelFX sprites (the 59-call budget has no room).
const LOW_SPRITE_CAP = 0;

const KIND = {
  burst: { mod: collectBurst, palette: MAGENTA, anchor: [0, 0.75, 0], dom: false },
  star: { mod: powerStar, palette: YELLOW, anchor: [0, 1.7, 0], dom: false },
  orb: { mod: xpOrb, palette: CYAN, anchor: [0, 1.15, 0.85], dom: false },
  shield: { mod: divineShield, palette: CYAN, anchor: [0, 0.55, 0], dom: false },
  sun: { mod: sunburst, palette: YELLOW, anchor: null, dom: true },
  confetti: { mod: confetti, palette: PARTY, anchor: null, dom: true },
};

const slots = [];
let bornN = 0;
const state = { scene: null, hero: null, cam: null, mode: '', low: false };
const at = new THREE.Vector3();

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas === 'function') {
    const canvas = new OffscreenCanvas(w, h);
    return { canvas, ctx: canvas.getContext('2d'), off: true };
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.hidden = true;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;pointer-events:none';
  document.body.appendChild(canvas);
  return { canvas, ctx: canvas.getContext('2d'), off: false };
}

function makeSlot(w, h, dom) {
  const { canvas, ctx, off } = makeCanvas(w, h);
  const slot = {
    w, h, canvas, ctx, off, domMode: dom, alive: false, kind: '', anchor: null,
    frame: createFrame(w, h), img: ctx.createImageData(w, h),
    inst: null, sprite: null, tex: null, mat: null, view: null, viewCtx: null,
  };
  if (!dom) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.frustumCulled = false;
    sprite.renderOrder = 20;
    sprite.layers.set(1);
    sprite.visible = false;
    slot.tex = tex;
    slot.mat = mat;
    slot.sprite = sprite;
  }
  return slot;
}

function take(kind) {
  const spec = KIND[kind];
  const meta = spec.mod.meta;
  const w = meta.size[0], h = meta.size[1];
  let slot = null;
  for (const s of slots) if (!s.alive && s.w === w && s.h === h && s.domMode === spec.dom) { slot = s; break; }
  if (!slot) { slot = makeSlot(w, h, spec.dom); slots.push(slot); }
  slot.alive = true;
  slot.stopping = false;
  slot.kind = kind;
  slot.born = ++bornN;
  slot.anchor = spec.anchor;
  // fx-3: divine-shield gets an empty actor. Never null, omitted, [], or {}.
  const opts = kind === 'shield'
    ? { x: meta.origin[0], y: meta.origin[1], palette: CYAN, actor: { mask: { w: 0, h: 0, data: new Uint8Array(0) }, x: 0, y: 0 } }
    : { x: meta.origin[0], y: meta.origin[1], palette: spec.palette };
  slot.inst = createFx(spec.mod, opts);
  if (slot.sprite && state.scene) {
    slot.sprite.visible = true;
    state.scene.add(slot.sprite);
  }
  return slot;
}

function release(slot) {
  slot.alive = false;
  slot.stopping = false;
  slot.inst = null;
  if (slot.sprite) {
    slot.sprite.visible = false;
    if (slot.sprite.parent) slot.sprite.parent.remove(slot.sprite);
  }
  if (slot.view) { slot.view.remove(); slot.view = null; slot.viewCtx = null; }
}

function worldSprites() {
  let n = 0;
  for (const s of slots) if (s.alive && s.sprite && s.sprite.parent) n++;
  return n;
}

function shotCounts() {
  let burst = 0, shot = 0;
  for (const s of slots) if (s.alive && (s.kind === 'burst' || s.kind === 'confetti')) { shot++; if (s.kind === 'burst') burst++; }
  return { burst, shot };
}

function oldestBurst() {
  let best = null;
  for (const s of slots) if (s.alive && s.kind === 'burst' && (!best || s.born < best.born)) best = s;
  return best;
}

function live(kind) {
  for (const s of slots) if (s.alive && s.kind === kind && !s.stopping) return s;
  return null;
}

function end(kind) {
  for (const s of slots) if (s.alive && s.kind === kind && s.inst && !s.stopping) { s.inst.stop(); s.stopping = true; }
}

function roomForSprite() {
  if (!state.low || worldSprites() < LOW_SPRITE_CAP) return true;
  for (const s of slots) if (s.alive && s.kind === 'burst') { release(s); return worldSprites() < LOW_SPRITE_CAP; }
  return false;
}

function hold(kind) {
  if (live(kind)) return;
  for (const s of slots) if (s.alive && s.kind === kind && s.stopping) release(s);
  if (!roomForSprite()) return;
  take(kind);
}

function burst() {
  const n = shotCounts();
  if (n.burst >= BURST_CAP || n.shot >= SHOT_CAP) return;
  if (state.low && worldSprites() >= LOW_SPRITE_CAP) return;
  take('burst');
}

function placeSprite(slot) {
  const hero = state.hero, cam = state.cam;
  if (!hero || !cam || !slot.sprite) return;
  const a = slot.anchor || [0, 0.6, 0];
  at.set(a[0], a[1], a[2]);
  hero.localToWorld(at);
  slot.sprite.position.copy(at);
  const dist = Math.max(0.75, cam.position.distanceTo(at));
  const worldH = 2 * dist * Math.tan((cam.fov * Math.PI / 180) / 2);
  const worldW = worldH * Math.max(0.3, cam.aspect || 1);
  let sw = slot.w * (worldH / Math.max(1, innerHeight));
  let sh = slot.h * (worldH / Math.max(1, innerHeight));
  const frac = Math.max(sw / worldW, sh / worldH);
  if (frac > SCREEN_CAP) { const k = SCREEN_CAP / frac; sw *= k; sh *= k; }
  slot.sprite.scale.set(sw, sh, 1);
}

function cssSize(w, h) {
  const sc = Math.min(1, (SCREEN_CAP * innerWidth) / w, (SCREEN_CAP * innerHeight) / h);
  return [Math.max(8, Math.round(w * sc)), Math.max(8, Math.round(h * sc))];
}

function firstBadge(root) {
  const pod = root.querySelector('#finPod .pt');
  if (pod) return pod;
  const cup = root.querySelectorAll('.cup-pod .slot');
  for (const s of cup) if (s.style.order === '2') return s;
  return null;
}

function mountView(slot, root, badge) {
  const view = document.createElement('canvas');
  view.className = 'pfx-dom';
  view.width = slot.w;
  view.height = slot.h;
  view.setAttribute('aria-hidden', 'true');
  const [cw, ch] = cssSize(slot.w, slot.h);
  view.style.position = 'absolute';
  view.style.pointerEvents = 'none';
  view.style.imageRendering = 'pixelated';
  view.style.width = cw + 'px';
  view.style.height = ch + 'px';
  if (badge) {
    if (getComputedStyle(badge).position === 'static') badge.style.position = 'relative';
    badge.style.zIndex = '1';
    view.style.zIndex = '-1';
    view.style.left = '50%';
    view.style.top = '50%';
    view.style.transform = 'translate(-50%, -50%)';
    badge.insertBefore(view, badge.firstChild);
  } else {
    const host = root.querySelector('.card') || root.querySelector('.mn') || root;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    view.style.zIndex = '0';
    view.style.left = '50%';
    view.style.top = '8%';
    view.style.transform = 'translate(-50%, 0)';
    host.insertBefore(view, host.firstChild);
  }
  for (const row of root.querySelectorAll('.row, .mn-bar')) {
    row.style.position = 'relative';
    row.style.zIndex = '2';
  }
  slot.view = view;
  slot.viewCtx = view.getContext('2d');
}

function step(dt) {
  for (const s of slots) {
    if (!s.alive || !s.inst) continue;
    // fx-1: seconds, clamped, and no update while the tab is hidden.
    if (!document.hidden) s.inst.update(Math.min(Math.max(dt, 0), 0.1));
    s.inst.draw(clearFrame(s.frame));
    composite(s.frame, s.img.data, null);
    s.ctx.putImageData(s.img, 0, 0);
    if (s.tex) s.tex.needsUpdate = true;
    if (s.viewCtx) {
      s.viewCtx.clearRect(0, 0, s.w, s.h);
      s.viewCtx.drawImage(s.canvas, 0, 0);
    }
    if (s.sprite) placeSprite(s);
    if (s.inst.done()) release(s);
  }
}

export function bind(scene) {
  state.scene = scene;
  if (!scene) return;
  for (const s of slots) if (s.alive && s.sprite && s.sprite.parent !== scene) scene.add(s.sprite);
}

export function dispose() {
  for (const s of slots) {
    if (s.sprite) {
      if (s.sprite.parent) s.sprite.parent.remove(s.sprite);
      if (s.mat) s.mat.dispose();
      if (s.tex) s.tex.dispose();
    }
    if (s.view) s.view.remove();
    if (!s.off && s.canvas && s.canvas.parentNode) s.canvas.parentNode.removeChild(s.canvas);
  }
  slots.length = 0;
}

export function sync(dt, P, hero, cam, mode, low) {
  state.hero = hero || state.hero;
  state.cam = cam || state.cam;
  state.mode = mode || '';
  state.low = !!low;
  // A drop to Low must not leave sprites that were spawned on High.
  if (state.low) for (const s of slots) if (s.alive && !s.domMode) release(s);
  const racing = mode === 'race' || mode === 'paused';
  if (P && racing) {
    if (P.rocket > 0) hold('star'); else end('star');
    if (P.shield > 0) hold('shield'); else end('shield');
    if (!(P.boost > 0)) end('orb');
  } else {
    end('star'); end('shield'); end('orb'); end('burst');
  }
  step(dt);
}

export function pickup(k) {
  if (!k || !k.isPlayer) return;
  burst();
}

export function item(k, got, was) {
  if (!k || !k.isPlayer) return;
  if (was === 'box') burst();
  if (got === 'speed') hold('orb');
}

export function boost() { hold('orb'); }

export function shieldOff() { end('shield'); }

export function onFinish(root, place) {
  if (!root) return;
  clearFinish();
  // Finish confetti always plays. If three one-shots are already up, drop the oldest collect-burst first so the cap stays at 3.
  if (shotCounts().shot >= SHOT_CAP) {
    const old = oldestBurst();
    if (old) release(old);
  }
  const slot = take('confetti');
  mountView(slot, root, null);
  if (place === 1) {
    const sun = take('sun');
    mountView(sun, root, firstBadge(root));
  }
}

export function clearFinish() {
  for (const s of slots) if (s.domMode && s.alive) release(s);
  document.querySelectorAll('canvas.pfx-dom').forEach(n => n.remove());
}
