/* Hub only: Add Our Fun Zone to the Home screen. No speech, no new images.
   The hub's inline script and CSP stay untouched; this file only adds tags and a section. */
(function () {
  if (window.FZA2HS) return;
  window.FZA2HS = true;
  var KEY = 'funzone.a2hs.v1';
  var promptEv = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    promptEv = e;
  });

  function seen() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return false;
      var o = JSON.parse(raw);
      return !!(o && o.v === 1 && o.seen === 1);
    } catch (e) { return false; }
  }
  function mark() {
    try { localStorage.setItem(KEY, '{"v":1,"seen":1}'); } catch (e) {}
  }

  var css = document.createElement('style');
  css.textContent = '#fzA2hsChip{display:flex;align-items:center;gap:4px;margin:6px 0 0;width:max-content;max-width:100%;min-height:32px;padding:2px 6px 2px 8px;border-radius:99px;border:2px solid #fff;background:rgba(255,255,255,.94);color:#8a1270;font:800 13px/1.15 "Trebuchet MS",system-ui,sans-serif;box-shadow:0 2px 0 rgba(80,0,70,.25);cursor:pointer;touch-action:manipulation}' +
    '#fzA2hsChip i{font-style:normal;width:22px;height:22px;border-radius:50%;background:#e9d5f5;display:grid;place-items:center;font-size:13px}' +
    '#fzA2hs .steps{display:flex;flex-direction:column;gap:8px;margin:8px 0}' +
    '#fzA2hs .step{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:14px;font-weight:700}' +
    '#fzA2hs .ico{display:inline-grid;place-items:center;width:36px;height:36px;border-radius:10px;background:#2a0a2e;color:#fff;font-size:20px;font-weight:900;box-shadow:0 0 0 2px #f5c542}' +
    '#fzA2hs .arr{opacity:.6}#fzA2hs p.note{font-size:14px;font-weight:800}';
  document.head.appendChild(css);

  function steps() {
    var box = document.createElement('div');
    box.className = 'steps';
    box.innerHTML = '<div class="step"><b>Chrome</b> <span class="ico" aria-hidden="true">⋮</span><span class="arr">→</span> Add to Home screen <span class="arr">→</span> Install</div>' +
      '<div class="step"><b>Samsung Internet</b> <span class="ico" aria-hidden="true">☰</span><span class="arr">→</span> Add page to <span class="arr">→</span> Home screen</div>';
    return box;
  }
  function fill(host) {
    host.innerHTML = '';
    var h = document.createElement('h3');
    h.textContent = 'Add Our Fun Zone to Home screen';
    host.appendChild(h);
    if (promptEv) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Install';
      b.addEventListener('click', function () {
        try {
          var p = promptEv.prompt();
          if (p && p.then) p.then(function () {}, function () {});
        } catch (e) {}
      });
      host.appendChild(b);
    } else host.appendChild(steps());
    var note = document.createElement('p');
    note.className = 'note';
    note.textContent = 'then open Our Fun Zone from the new icon: no address bar in any game';
    host.appendChild(note);
  }
  function ensure() {
    var gb = document.getElementById('gbody');
    if (!gb || gb.querySelector('#fzA2hs')) return;
    if (gb.innerHTML.indexOf('bClose') === -1) return;
    var sec = document.createElement('div');
    sec.className = 'sec';
    sec.id = 'fzA2hs';
    fill(sec);
    gb.insertBefore(sec, gb.firstChild);
  }

  var gb = document.getElementById('gbody');
  if (gb) {
    var desc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    Object.defineProperty(gb, 'innerHTML', {
      configurable: true,
      get: function () { return desc.get.call(this); },
      set: function (v) { desc.set.call(this, v); try { ensure(); } catch (e) {} }
    });
  }

  if (window.FZFS && window.FZFS.installed) return;
  if (seen()) return;
  var title = document.querySelector('header .title');
  if (!title) return;
  var chip = document.createElement('button');
  chip.type = 'button';
  chip.id = 'fzA2hsChip';
  chip.innerHTML = '👨‍👧 📲 Add to Home screen <i aria-label="Dismiss">✕</i>';
  title.appendChild(chip);
  mark();
  chip.addEventListener('click', function (e) {
    var x = e.target && e.target.closest ? e.target.closest('i') : null;
    if (x) { chip.remove(); return; }
    var gear = document.getElementById('gear');
    if (!gear) return;
    try {
      gear.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch' }));
      setTimeout(function () {
        try { gear.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch' })); } catch (e2) {}
      }, 3100);
    } catch (err) {}
  });
})();
