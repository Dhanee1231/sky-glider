// Sparkle Kingdom save + read-only peeks.
// Own key: sparkle-kingdom.v1 = {v:1, gems, lv:{"1":{s,g}}, stk:{id:1}, muted, seen}. A value that cannot be read is copied to
// sparkle-kingdom.v1.bad once and never overwritten; every field is sanitized on load; new fields must be optional with defaults.
// Peeks (READ ONLY, never written): crystalcave.v2 (Glimmer's look) and skyglider.v3 (sticker count). Both survive missing/corrupt data.
(function () {
  const KEY = 'sparkle-kingdom.v1';
  const isO = o => !!o && typeof o === 'object' && !Array.isArray(o);
  const num = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v)) ? Math.max(lo, Math.min(hi, Math.round(v))) : d;
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } } };
  const LEVELS = 5, STICKERS = ['heart', 'flower', 'rainbow', 'gem', 'crown'];
  const def = () => ({ v: 1, gems: 0, lv: {}, stk: {}, muted: false, seen: {} });
  function load() {
    const raw = ls.get(KEY), s = def(); if (raw == null) return s;
    let d = null; try { d = JSON.parse(raw); } catch (e) { }
    if (!isO(d)) { if (ls.get(KEY + '.bad') == null) ls.set(KEY + '.bad', raw); return s; }
    s.gems = num(d.gems, 0, 1e6, 0); s.muted = d.muted === true;
    const BAD = k => k === '__proto__' || k === 'constructor' || k === 'prototype';
    if (isO(d.lv)) for (const k of Object.keys(d.lv)) { const e = d.lv[k]; if (BAD(k)) continue; const i = +k;
      if (Number.isInteger(i) && i >= 1 && i <= LEVELS) { if (isO(e)) s.lv[i] = { s: num(e.s, 0, 3, 0), g: num(e.g, 0, 9999, 0) }; }
      else s.lv[k] = e; } // follow-up: level entries this version doesn't know (a newer copy's levels) are kept untouched
    if (isO(d.stk)) for (const k of Object.keys(d.stk)) { if (BAD(k)) continue; if (STICKERS.includes(k)) { if (d.stk[k]) s.stk[k] = 1; } else s.stk[k] = d.stk[k]; } // unknown stickers kept too
    if (isO(d.seen)) for (const k in d.seen) if (d.seen[k] === true && /^[a-z]{1,12}$/.test(k)) s.seen[k] = true;
    // keep unknown future fields untouched so an older copy of the page never drops them
    for (const k in d) if (!(k in s)) s[k] = d[k];
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
    addGems(n) { save.gems = Math.min(1e6, save.gems + n); later(); },
    setMuted(m) { save.muted = !!m; persist(); },
    seen: k => !!save.seen[k], markSeen(k) { save.seen[k] = true; later(); }
  };
})();
