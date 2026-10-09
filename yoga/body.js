// Simple front/back body diagram with highlightable muscle regions (drawn from basic shapes, no external art).
const R = {
  front: {
    neck: [[60, 43, 6, 5]], shoulders: [[37, 57, 9, 8], [83, 57, 9, 8]], chest: [[50, 68, 10, 8], [70, 68, 10, 8]],
    arms: [[29, 84, 6, 13], [91, 84, 6, 13], [25, 113, 5, 12], [95, 113, 5, 12]], core: [[60, 100, 10, 18]], obliques: [[45, 102, 5, 13], [75, 102, 5, 13]],
    hipflex: [[50, 128, 7, 6], [70, 128, 7, 6]], quads: [[47, 160, 8, 22], [73, 160, 8, 22]], adductors: [[56, 152, 4, 14], [64, 152, 4, 14]]
  },
  back: {
    neck: [[60, 45, 11, 6]], shoulders: [[37, 57, 9, 8], [83, 57, 9, 8]], upperback: [[60, 66, 16, 10]], arms: [[29, 84, 6, 13], [91, 84, 6, 13]],
    lats: [[46, 88, 8, 14], [74, 88, 8, 14]], lowback: [[60, 108, 10, 10]], glutes: [[51, 130, 10, 10], [69, 130, 10, 10]],
    hamstrings: [[49, 163, 8, 22], [71, 163, 8, 22]], calves: [[48, 207, 6, 16], [72, 207, 6, 16]]
  }
};
const SIL = `<g fill="var(--bodyFill,#e6eef2)" stroke="var(--bodyLine,#b9cbd4)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
<circle cx="60" cy="22" r="14"/><rect x="54" y="34" width="12" height="12" rx="4"/>
<path d="M36 50 Q60 44 84 50 L86 66 Q82 96 82 118 L86 142 Q60 148 34 142 L38 118 Q38 96 34 66 Z"/>
<path d="M36 52 L26 92 L22 130" fill="none" stroke-width="13"/><path d="M84 52 L94 92 L98 130" fill="none" stroke-width="13"/>
<path d="M48 140 L48 190 L48 240" fill="none" stroke-width="17"/><path d="M72 140 L72 190 L72 240" fill="none" stroke-width="17"/>
<path d="M36 52 L26 92 L22 130" fill="none" stroke="var(--bodyFill,#e6eef2)" stroke-width="10"/><path d="M84 52 L94 92 L98 130" fill="none" stroke="var(--bodyFill,#e6eef2)" stroke-width="10"/>
<path d="M48 140 L48 190 L48 240" fill="none" stroke="var(--bodyFill,#e6eef2)" stroke-width="14"/><path d="M72 140 L72 190 L72 240" fill="none" stroke="var(--bodyFill,#e6eef2)" stroke-width="14"/>
</g>`;
// colorFn(muscleId) -> fill color or null
export function bodySVG(colorFn, opts = {}) {
  const one = (view, label) => {
    let g = '';
    for (const m in R[view]) { const c = colorFn(m, view); if (!c) continue; for (const [x, y, rx, ry] of R[view][m]) g += `<ellipse data-m="${m}" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" opacity=".9"><title>${m}</title></ellipse>`; }
    return `<svg viewBox="0 0 120 262" class="bodysvg" role="img" aria-label="${label} view">${SIL}${g}<text x="60" y="258" text-anchor="middle" font-size="11" fill="#678">${label}</text></svg>`;
  };
  return `<div class="bodypair">${one('front', 'Front')}${one('back', 'Back')}</div>`;
}
