// Sparkle Kingdom v7 learning moments (light, NEVER gating): after Gem Catch a "how many?" question with three big number
// buttons (Done always works, a wrong pick just counts together kindly), and colour names now and then in Bubble Pop.
// Hooks only: listens to mgEnd / mgColor / mgStart from minigames.js; owns no game state and writes nothing to the save.
(function () {
  const H = window.SKHooks, B = window.SKBook, Au = window.SKAudio, X = window.SKFx;
  const $ = id => document.getElementById(id);
  const WORD = ['', 'one', 'two', 'three', 'four', 'five'];
  const GEM = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M30 14 H70 L90 38 L50 92 L10 38Z" fill="#9ae8ff" stroke="#fff" stroke-width="6" stroke-linejoin="round"/><path d="M10 38 H90 M38 38 L50 92 L62 38" stroke="#fff" stroke-width="3" fill="none"/></svg>';
  const say = l => { try { B.say(l, true); } catch (e) { } };
  let box = null, ans = 0, done = false, lastColor = 0;
  function ask() {
    const end = $('mgEnd'); if (!end) return; const panel = end.querySelector('.panel'); if (!panel) return;
    if (!box) { box = document.createElement('div'); box.className = 'sk-learn'; box.id = 'skLearn'; panel.insertBefore(box, $('mgDone')); box.addEventListener('click', pick); }
    ans = 2 + (Math.random() * 4 | 0); done = false;   // 2..5 gems: small, friendly numbers
    const opts = [ans - 1, ans, ans + 1].filter(v => v >= 1 && v <= 6); while (opts.length < 3) opts.push(opts[opts.length - 1] + 1);
    opts.sort(() => Math.random() - 0.5);
    box.innerHTML = '<div class="sk-lq">How many gems?</div><div class="sk-lg">' + GEM.repeat(ans) + '</div><div class="sk-lb">' + opts.map(v => '<button class="lb" data-n="' + v + '" aria-label="' + v + '"><b>' + v + '</b></button>').join('') + '</div>';
    box.hidden = false; setTimeout(() => say('How many gems?'), 1600);
  }
  function pick(e) {
    const b = e.target.closest('[data-n]'); if (!b || done) return; done = true; try { Au.tap(); } catch (x) { }
    const v = +b.dataset.n; [...box.querySelectorAll('[data-n]')].forEach(x => x.classList.toggle('ok', +x.dataset.n === ans));
    if (v === ans) { say('Yes! ' + WORD[ans][0].toUpperCase() + WORD[ans].slice(1) + ' gems!'); try { Au.fanfare(); } catch (x) { } }
    else say("Let's count together! " + WORD.slice(1, ans + 1).map(w => w[0].toUpperCase() + w.slice(1)).join(', ') + '!');
    const gs = box.querySelectorAll('.sk-lg svg'); gs.forEach((g, i) => { g.style.animationDelay = (i * 0.45) + 's'; g.classList.add('cnt'); });
  }
  H.on('mgEnd', g => { if (box) box.hidden = true; if (g === 'gemcatch') ask(); });
  H.on('mgStart', () => { if (box) box.hidden = true; lastColor = 0; });
  // colour names: the first pop, then every fourth, so it never chatters
  H.on('mgColor', (c, n) => { if (n === 1 || n - lastColor >= 4) { lastColor = n; say(c[0].toUpperCase() + c.slice(1) + '!'); } });
  window.SKLearn = { ask, get answer() { return ans; } };
})();
