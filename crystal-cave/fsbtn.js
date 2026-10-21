/* Our Fun Zone full-screen button. One classic script, copied byte-for-byte into every app.
   No modules, no network. window.FZFS = {installed, own, btn, toggle}. Safe to load twice. */
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
  window.FZFS = { installed: installed, own: !!ownEl, btn: ownEl || null, toggle: function () {} };

  var hideSel = ownSel || '#fz-fs';
  var css = document.createElement('style');
  css.textContent = 'html.fz-installed #fz-fs,html.fz-installed ' + hideSel + ',html.fz-nofull ' + hideSel + '{display:none!important}';
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

  var IN = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  var OUT = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
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
    btn.style.cssText = 'position:fixed;z-index:6;width:44px;height:44px;box-sizing:border-box;border-radius:50%;border:3px solid #fff;padding:0;margin:0;display:grid;place-items:center;cursor:pointer;touch-action:manipulation;color:#fff;background:radial-gradient(circle at 35% 30%,#ffd0ec,#ff4fa3 55%,#d6339f);box-shadow:0 0 12px #ff5fb4,0 3px 0 #9a1060;' + edge + ';' + side + ';';
    btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); toggle(); });
    ['pointerdown', 'touchstart'].forEach(function (n) {
      btn.addEventListener(n, function (e) { e.stopPropagation(); });
    });
    (document.body || de).appendChild(btn);
    window.FZFS.own = false;
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
