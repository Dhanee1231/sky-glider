// Gem Tiles v6: custom-song analysis off the main thread, so menus, the loading bar and music never stall while a song is being charted.
// Same code as the page fallback (analyze.js), so the result is identical whichever side runs it.
importScripts('./analyze.js');
const DIFFS = ['easy', 'normal', 'hard', 'veryhard'];
onmessage = e => { const { id, mono, seed } = e.data;
  try { const AN = self.TileAnalyze, an = AN.analyzeMono(mono), charts = {}; for (const d of DIFFS) charts[d] = AN.makeChart(an, d, seed || 1);
    postMessage({ id, ok: true, an, charts }); }
  catch (err) { postMessage({ id, ok: false, err: String(err && err.message || err) }); } };
