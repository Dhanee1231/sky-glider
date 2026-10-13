// Sparkle Kingdom save + read-only peeks.
// Own key: sparkle-kingdom.v1 = {v:1, gems, lv:{"1":{s,g}}, stk:{id:1}, muted, seen, cr?, sec?}. A value that cannot be read is copied to
// sparkle-kingdom.v1.bad once and never overwritten; every field is sanitized on load; new fields must be optional with defaults.
// v3 adds two OPTIONAL top-level fields (old v1/v2 copies keep unknown top-level fields untouched, so they survive a round trip):
//   cr  = {"1": 0-7}  sparkle crowns found per level (bit mask of the level's 3 crowns; all 3 = golden sticker frame)
//   sec = {"1": 1}    secret rooms found per level
// v4 adds one more OPTIONAL top-level field: set = {vol:0-100, mus:bool, voice:bool} (Settings panel; defaults 100/true/true)
// v5 (fun Phase 1) adds three more OPTIONAL top-level fields (all sanitized here; unknown ids/entries are kept untouched):
//   day   = {last:"YYYY-MM-DD", beads:0-999, opened:"YYYY-MM-DD"}  local-date daily surprise (beads = Phase 2 streak moon)
//   wd    = {own:{id:1}, on:{hat,cape,wings,shoes,pet}, pn:"name", silly:"YYYY-MM-DD"}  wardrobe + pets bought with gems
//   shiny = {"stickerId":1}  shiny sticker variants (from 3-crown runs)
//   stk keeps the 5 level stickers and gains the sticker-book ids in SKFun.STK (validated in fun.js; everything else kept as before)
// Peeks (READ ONLY, never written): crystalcave.v2 (Glimmer's look) and skyglider.v3 (sticker count). Both survive missing/corrupt data.
(function () {
  const KEY = 'sparkle-kingdom.v1';
  const isO = o => !!o && typeof o === 'object' && !Array.isArray(o);
  const num = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v)) ? Math.max(lo, Math.min(hi, Math.round(v))) : d;
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } } };
  const LEVELS = 5, STICKERS = ['heart', 'flower', 'rainbow', 'gem', 'crown'];
  const def = () => ({ v: 1, gems: 0, lv: {}, stk: {}, muted: false, seen: {}, cr: {}, sec: {}, set: { vol: 100, mus: true, voice: true }, day: { last: '', beads: 0, opened: '' }, wd: { own: {}, on: {} }, shiny: {} });
  const BAD = k => k === '__proto__' || k === 'constructor' || k === 'prototype';
  const lvIdx = k => { const i = +k; return Number.isInteger(i) && i >= 1 && i <= LEVELS ? i : 0; };
  function load() {
    const raw = ls.get(KEY), s = def(); if (raw == null) return s;
    let d = null; try { d = JSON.parse(raw); } catch (e) { }
    if (!isO(d)) { if (ls.get(KEY + '.bad') == null) ls.set(KEY + '.bad', raw); return s; }
    s.gems = num(d.gems, 0, 1e6, 0); s.muted = d.muted === true;
    if (isO(d.lv)) for (const k of Object.keys(d.lv)) { const e = d.lv[k]; if (BAD(k)) continue; const i = lvIdx(k);
      if (i) { if (isO(e)) s.lv[i] = { s: num(e.s, 0, 3, 0), g: num(e.g, 0, 9999, 0) }; }
      else s.lv[k] = e; } // level entries this version doesn't know (a newer copy's levels) are kept untouched
    if (isO(d.stk)) for (const k of Object.keys(d.stk)) { if (BAD(k)) continue; if (STICKERS.includes(k)) { if (d.stk[k]) s.stk[k] = 1; } else s.stk[k] = d.stk[k]; } // unknown stickers kept too
    if (isO(d.seen)) for (const k in d.seen) if (d.seen[k] === true && /^[a-z]{1,12}$/.test(k)) s.seen[k] = true;
    // v3: crowns + secret rooms (optional; known levels sanitized, unknown entries kept as they are)
    for (const f of ['cr', 'sec']) if (isO(d[f])) for (const k of Object.keys(d[f])) { if (BAD(k)) continue; const i = lvIdx(k);
      if (i) { const v = num(d[f][k], 0, f === 'cr' ? 7 : 1, 0); if (v) s[f][i] = v; } else s[f][k] = d[f][k]; }
    // v4: settings (optional; anything missing or odd falls back to the default)
    if (isO(d.set)) { s.set.vol = num(d.set.vol, 0, 100, 100); s.set.mus = d.set.mus !== false; s.set.voice = d.set.voice !== false; }
    // v5: daily surprise, wardrobe, shiny stickers (optional; odd values fall back to defaults, unknown keys kept)
    const DATE = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
    if (isO(d.day)) { for (const k in d.day) if (!BAD(k)) s.day[k] = d.day[k]; s.day.last = DATE(d.day.last); s.day.opened = DATE(d.day.opened); s.day.beads = num(d.day.beads, 0, 999, 0); }
    if (isO(d.wd)) { for (const k in d.wd) if (!BAD(k) && k !== 'own' && k !== 'on') s.wd[k] = d.wd[k];
      if (isO(d.wd.own)) for (const k in d.wd.own) if (!BAD(k)) s.wd.own[k] = d.wd.own[k];
      if (isO(d.wd.on)) for (const k in d.wd.on) if (!BAD(k) && (typeof d.wd.on[k] === 'string' || d.wd.on[k] == null)) s.wd.on[k] = d.wd.on[k];
      if (typeof s.wd.pn !== 'string' || s.wd.pn.length > 16) delete s.wd.pn; if (s.wd.silly != null && !DATE(s.wd.silly)) delete s.wd.silly; }
    if (isO(d.shiny)) for (const k in d.shiny) if (!BAD(k)) s.shiny[k] = d.shiny[k];
    // keep unknown future fields untouched so an older copy of the page never drops them
    for (const k in d) if (!(k in s) && !BAD(k)) s[k] = d[k];
    return s;
  }
  let save = load(), timer = 0;
  const persist = () => { clearTimeout(timer); timer = 0; ls.set(KEY, JSON.stringify(save)); };
  const later = () => { if (!timer) timer = setTimeout(persist, 400); };
  addEventListener('pagehide', () => { if (timer) persist(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && timer) persist(); });

  // ---- Glimmer's look, read-only from Crystal Cave (same level steps and wear flags it uses) ----
  const GLIM = [0, 25, 75, 150, 300, 500, 800];
  function glim() {
    const o = { lv: 0, wear: { bow: true, neck: true, cheeks: true, tiara: true, crown: true, glow: true } };
    try {
      const raw = ls.get('crystalcave.v2'); if (!raw) return o;
      const d = JSON.parse(raw); if (!isO(d)) return o;
      const n = num(d.correct, 0, 1e7, 0); GLIM.forEach((t, i) => { if (n >= t) o.lv = i; });
      if (isO(d.glimWear)) for (const k in o.wear) if (d.glimWear[k] === false) o.wear[k] = false;
    } catch (e) { }
    return o;
  }
  // ---- how many Sky Glider stickers she owns (cosmetic) ----
  function skyStickers() {
    try {
      const raw = ls.get('skyglider.v3'); if (!raw) return 0;
      const d = JSON.parse(raw); if (!isO(d) || !isO(d.stk)) return 0;
      let n = 0; for (const k in d.stk) if (+d.stk[k] > 0) n++;
      return Math.min(n, 999);
    } catch (e) { return 0; }
  }
  const bits = m => (m & 1) + (m >> 1 & 1) + (m >> 2 & 1);
  window.SKSave = {
    KEY, LEVELS, STICKERS, get: () => save, persist, later,
    glim, skyStickers,
    level: i => save.lv[i] || { s: 0, g: 0 },
    done: i => !!(save.lv[i] && save.lv[i].s > 0),
    unlocked: i => i <= 1 || !!(save.lv[i - 1] && save.lv[i - 1].s > 0),
    finish(i, stars, gems) {   // returns {newSticker}
      const e = save.lv[i] || (save.lv[i] = { s: 0, g: 0 });
      e.s = Math.max(e.s, num(stars, 1, 3, 1)); e.g = Math.max(e.g, num(gems, 0, 9999, 0));
      save.gems = Math.min(1e6, save.gems + num(gems, 0, 9999, 0));
      const id = STICKERS[i - 1], fresh = !save.stk[id]; save.stk[id] = 1; persist(); return { newSticker: fresh ? id : '' };
    },
    // crowns are kept the moment she finds them (even if she leaves the level); returns true if all 3 just became found
    crowns: i => num(save.cr[i], 0, 7, 0), crownCount: i => bits(num(save.cr[i], 0, 7, 0)),
    addCrown(i, b) { const was = num(save.cr[i], 0, 7, 0), now = was | (1 << b); if (now === was) return false; save.cr[i] = now; persist(); return now === 7; },
    secret: i => save.sec[i] === 1, markSecret(i) { if (save.sec[i] !== 1) { save.sec[i] = 1; later(); } },
    addGems(n) { save.gems = Math.min(1e6, save.gems + n); later(); },
    setMuted(m) { save.muted = !!m; persist(); },
    settings: () => save.set, setSettings(o) { const t = save.set; if (o && 'vol' in o) t.vol = num(o.vol, 0, 100, t.vol); if (o && 'mus' in o) t.mus = !!o.mus; if (o && 'voice' in o) t.voice = !!o.voice; persist(); },
    seen: k => !!save.seen[k], markSeen(k) { save.seen[k] = true; later(); }
  };
})();
