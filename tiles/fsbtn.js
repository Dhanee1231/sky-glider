/* Our Fun Zone full-screen button. One classic script, copied byte-for-byte into every app.
   No modules, no network. window.FZFS = {installed, own, btn, toggle, check}. Safe to load twice.
   Per-app config on the script tag: data-own (reuse the app's button) or data-pos (tl|tr|bl|br) + data-dx/data-dy,
   and data-hide: a selector list; while any match is on screen the created button is hidden (screens or HUDs with no free corner). */
(function () {
  if (window.FZFS) return;
  var me = document.currentScript, ownSel = me && me.getAttribute('data-own');
  var ownEl = null;
  try { if (ownSel) ownEl = document.querySelector(ownSel); } catch (e) { ownSel = ''; ownEl = null; }
  var installed = false;
  try {
    var mq = window.matchMedia;
    installed = !!((mq && (mq('(display-mode: fullscreen)').matches || mq('(display-mode: standalone)').matches)) || navigator.standalone === true);
  } catch (e1) { installed = false; }
  // A browser full-screen tab also matches display-mode:fullscreen, so that is not "installed".
  if (document.fullscreenElement || document.webkitFullscreenElement) installed = false;
  var de = document.documentElement;
  var supported = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled || de.requestFullscreen || de.webkitRequestFullscreen);
  window.FZFS = { installed: installed, own: !!ownEl, btn: ownEl || null, toggle: function () {}, check: function () {} };

  var hideSel = ownSel || '#fz-fs';
  var css = document.createElement('style');
  css.textContent = 'html.fz-installed #fz-fs,html.fz-installed ' + hideSel + ',html.fz-nofull ' + hideSel + ',html.fz-fshide #fz-fs{display:none!important}';
  (document.head || de).appendChild(css);

  function isFS() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function writeKey(v) { try { localStorage.setItem('funzone-fs', v); } catch (e) {} }
  function readKey() { try { return localStorage.getItem('funzone-fs'); } catch (e) { return null; } }
  function go(on) {
    try {
      if (on) {
        var req = de.requestFullscreen || de.webkitRequestFullscreen;
        if (!req) return;
        var p;
        try { p = req.call(de, { navigationUI: 'hide' }); } catch (e2) { try { p = req.call(de); } catch (e3) { p = null; } }
        if (p && p.catch) p.catch(function () {});
      } else {
        var ex = document.exitFullscreen || document.webkitExitFullscreen;
        if (!ex) return;
        var q = ex.call(document);
        if (q && q.catch) q.catch(function () {});
      }
    } catch (e4) {}
  }
  function toggle() {
    var on = !isFS();
    writeKey(on ? '1' : '0');
    go(on);
  }
  window.FZFS.toggle = toggle;

  // Installed: hide the button and stop. Swallow requestFullscreen so an older
  // "first tap restores" snippet in the page cannot enter full screen either.
  if (installed) {
    de.classList.add('fz-installed');
    var nope = function () { try { return Promise.reject(new Error('installed')); } catch (e) { return { catch: function () {} }; } };
    try { de.requestFullscreen = nope; } catch (e5) {}
    try { de.webkitRequestFullscreen = nope; } catch (e6) {}
    return;
  }
  if (!supported) { de.classList.add('fz-nofull'); return; }

  var IN = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  var OUT = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
  var btn = ownEl, own = !!ownEl;
  if (!own) {
    btn = document.createElement('button');
    btn.id = 'fz-fs';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Full screen');
    var pos = (me && me.getAttribute('data-pos')) || 'tr';
    var dx = parseFloat(me && me.getAttribute('data-dx')) || 0;
    var dy = parseFloat(me && me.getAttribute('data-dy')) || 0;
    if (pos !== 'tr' && pos !== 'tl' && pos !== 'br' && pos !== 'bl') pos = 'tr';
    var edge = pos.charAt(0) === 'b'
      ? 'bottom:calc(env(safe-area-inset-bottom,0px) + ' + dy + 'px)'
      : 'top:calc(env(safe-area-inset-top,0px) + ' + dy + 'px)';
    var side = pos.charAt(1) === 'l'
      ? 'left:calc(env(safe-area-inset-left,0px) + ' + dx + 'px)'
      : 'right:calc(env(safe-area-inset-right,0px) + ' + dx + 'px)';
    // z-index 6: above Neon Rush's title layer (5), below its settings (7) and every app dialog.
    btn.style.cssText = 'position:fixed;z-index:6;width:48px;height:48px;box-sizing:border-box;border-radius:50%;border:3px solid #fff;padding:0;margin:0;display:grid;place-items:center;cursor:pointer;touch-action:manipulation;color:#fff;background:radial-gradient(circle at 35% 30%,#ffd0ec,#ff4fa3 55%,#d6339f);box-shadow:0 0 12px #ff5fb4,0 3px 0 #9a1060;' + edge + ';' + side + ';';
    btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); toggle(); });
    ['pointerdown', 'touchstart'].forEach(function (n) {
      btn.addEventListener(n, function (e) { e.stopPropagation(); });
    });
    (document.body || de).appendChild(btn);
    window.FZFS.own = false;
    watchHide(me && me.getAttribute('data-hide'));
  } else if (!pageWrites()) {
    // Capture runs before the app's own click, so the stored value is the state the tap is heading to.
    btn.addEventListener('click', function () { writeKey(isFS() ? '0' : '1'); }, true);
  }
  window.FZFS.btn = btn;
  function paint() {
    if (!btn || own) return;
    var on = isFS();
    btn.innerHTML = on ? OUT : IN;
    btn.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen');
  }
  paint();
  document.addEventListener('fullscreenchange', paint);
  document.addEventListener('webkitfullscreenchange', paint);

  // First tap anywhere brings full screen back. A tap on the button itself only toggles once.
  var once = false;
  function back(e) {
    if (once) return;
    once = true;
    ['pointerup', 'touchend', 'click'].forEach(function (n) { document.removeEventListener(n, back, true); });
    var t = e.target;
    if (t && t.nodeType !== 1) t = t.parentElement;
    if (btn && t && (t === btn || btn.contains(t))) return;
    if (readKey() !== '1' || isFS()) return;
    go(true);
  }
  ['pointerup', 'touchend', 'click'].forEach(function (n) { document.addEventListener(n, back, true); });

  // data-hide: no per-frame work. A MutationObserver on class/hidden/data-fz-scene changes plus a slow 500 ms
  // fallback re-check (skipped while the tab is hidden), and resize/orientation changes.
  function watchHide(list) {
    if (!list) return;
    var sels = [], i;
    var parts = list.split(',');
    for (i = 0; i < parts.length; i++) {
      var q = parts[i].replace(/^\s+|\s+$/g, '');
      if (!q) continue;
      try { document.querySelector(q); sels.push(q); } catch (e) {}
    }
    if (!sels.length) return;
    var hidden = null, queued = false;
    function shown(el) {
      if (!el.getClientRects().length) return false;
      try { var cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return false; } catch (e) {}
      return true;
    }
    function check() {
      queued = false;
      var hit = false, j, k, els;
      for (j = 0; j < sels.length && !hit; j++) {
        els = document.querySelectorAll(sels[j]);
        for (k = 0; k < els.length; k++) { if (shown(els[k])) { hit = true; break; } }
      }
      if (hit !== hidden) { hidden = hit; de.classList.toggle('fz-fshide', hit); }
    }
    function soon() { if (!queued) { queued = true; setTimeout(check, 0); } }
    window.FZFS.check = check;
    check();
    try {
      new MutationObserver(soon).observe(de, { subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'data-fz-scene', 'open'] });
    } catch (e) {}
    window.addEventListener('resize', soon);
    window.addEventListener('orientationchange', soon);
    setInterval(function () { if (!document.hidden) check(); }, 500);
  }

  function pageWrites() {
    try {
      var i, s, txt, re = /setItem\(\s*['"]funzone-fs['"]|LS\.set\(\s*['"]funzone-fs['"]/;
      for (i = 0; i < document.scripts.length; i++) {
        s = document.scripts[i];
        if (s === me) continue;
        txt = s.text || '';
        if (txt && re.test(txt)) return true;
      }
    } catch (e) {}
    return false;
  }
})();
