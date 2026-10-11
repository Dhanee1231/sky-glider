// ===== Fun Zone learning record (shared, v1): what she has practised, mastered, and still finds tricky, across all apps =====
// The same block lives in Sky Glider (index.html + SkyGlider.html), Crystal Cave (crystal-cave/index.html), Gem Tiles (tiles/learn.js)
// and the hub (home/learn.js). Source of truth: dev/learn/funlearn.js. After editing it, run dev/learn/sync.py.
// Its OWN NEW key 'funzone.learn.v1' only ever grows: counts go up, items and days are added, nothing is renamed or removed.
// Every write re-reads the store first, so two apps (or two tabs) never wipe each other's entries. No game save is read or written.
// Shape: {v:1, items:{key:{n,c,run,best,t0,t,a:{app:n}}}, days:{'YYYY-MM-DD':{app:n}}, log:[[t,app,key,ok], …last 400]}
//   key examples: 'mul:7x8', 'add:8+5', 'sub:12-5', 'div:56/7', 'skip:3', 'money:pay', 'rhythm:normal'
window.FunLearn = (function () {
  const KEY = 'funzone.learn.v1', LOG = 400;
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const num = v => (typeof v === 'number' && isFinite(v) && v >= 0) ? v : 0;
  const day = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function read() {
    let raw = null; try { raw = localStorage.getItem(KEY); } catch (e) { }
    const D = { v: 1, items: {}, days: {}, log: [] };
    if (!raw) return D;
    try { const d = JSON.parse(raw); if (!isObj(d)) throw 0;
      for (const k in d) D[k] = d[k];                                  // unknown fields are kept
      if (!isObj(D.items)) D.items = {}; if (!isObj(D.days)) D.days = {}; if (!Array.isArray(D.log)) D.log = [];
    } catch (e) { try { if (localStorage.getItem(KEY + '.bad') == null) localStorage.setItem(KEY + '.bad', raw); } catch (_) { } }
    return D;
  }
  const write = D => { try { localStorage.setItem(KEY, JSON.stringify(D)); return true; } catch (e) {
    try { D.log = D.log.slice(-100); localStorage.setItem(KEY, JSON.stringify(D)); return true; } catch (_) { return false; } } };
  // add one practice result. app: 'cc' | 'sg' | 'gt' | …; key: item id; ok: true/false
  function add(app, key, ok) {
    if (!app || !key) return;
    const D = read(), t = Date.now(); key = String(key).slice(0, 40);
    const it = isObj(D.items[key]) ? D.items[key] : (D.items[key] = { n: 0, c: 0, run: 0, best: 0, t0: t, t: t, a: {} });
    it.n = num(it.n) + 1; if (ok) it.c = num(it.c) + 1;
    it.run = ok ? num(it.run) + 1 : 0; it.best = Math.max(num(it.best), it.run); it.t = t; if (!it.t0) it.t0 = t;
    if (!isObj(it.a)) it.a = {}; it.a[app] = num(it.a[app]) + 1;
    const dk = day(t); if (!isObj(D.days[dk])) D.days[dk] = {}; D.days[dk][app] = num(D.days[dk][app]) + 1;
    D.log.push([t, app, key, ok ? 1 : 0]); if (D.log.length > LOG) D.log.splice(0, D.log.length - LOG);
    write(D);
  }
  // mastered: right at least 5 times and the last 3 in a row right. tricky: missed at least twice and not right twice in a row since.
  const mastered = it => num(it.c) >= 5 && num(it.run) >= 3;
  const tricky = it => num(it.n) - num(it.c) >= 2 && num(it.run) < 2;
  function summary(prefix) {
    const D = read(), out = { practised: 0, mastered: [], tricky: [], right: 0, days: Object.keys(D.days).length };
    for (const k in D.items) { if (prefix && k.indexOf(prefix) !== 0) continue; const it = D.items[k]; if (!isObj(it)) continue;
      out.practised++; out.right += num(it.c); if (mastered(it)) out.mastered.push(k); else if (tricky(it)) out.tricky.push(k); }
    return out;
  }
  // merge another copy in (family backup restore): adds missing items/days/log entries, keeps the larger counts, never removes anything
  function merge(o) {
    if (!isObj(o)) return; const D = read();
    if (isObj(o.items)) for (const k in o.items) { const b = o.items[k]; if (!isObj(b)) continue; const a = D.items[k];
      if (!isObj(a)) { D.items[k] = b; continue; }
      for (const f of ['n', 'c', 'best']) a[f] = Math.max(num(a[f]), num(b[f]));
      if (num(b.t) > num(a.t)) { a.t = b.t; a.run = num(b.run); } a.t0 = Math.min(num(a.t0) || Infinity, num(b.t0) || Infinity); if (!isFinite(a.t0)) a.t0 = 0;
      if (!isObj(a.a)) a.a = {}; if (isObj(b.a)) for (const x in b.a) a.a[x] = Math.max(num(a.a[x]), num(b.a[x])); }
    if (isObj(o.days)) for (const k in o.days) { if (!isObj(o.days[k])) continue; if (!isObj(D.days[k])) D.days[k] = {};
      for (const x in o.days[k]) D.days[k][x] = Math.max(num(D.days[k][x]), num(o.days[k][x])); }
    if (Array.isArray(o.log)) { const seen = new Set(D.log.map(e => JSON.stringify(e)));
      for (const e of o.log) if (Array.isArray(e) && !seen.has(JSON.stringify(e))) D.log.push(e);
      D.log.sort((x, y) => num(x[0]) - num(y[0])); if (D.log.length > LOG) D.log.splice(0, D.log.length - LOG); }
    write(D);
  }
  return { KEY, add, read, summary, merge, mastered, tricky };
})();
