// Neon Rush M5 emblems + minimap marker shapes. All original, drawn from simple polygons (unit square -1..1, y up).
// One shape table feeds: SVG icons (garage), Path2D (minimap, gantry banner) and THREE.Shape (kart decal).
const circ=(cx,cy,r,n=16)=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return[cx+Math.cos(a)*r,cy+Math.sin(a)*r];});
const heart=()=>Array.from({length:28},(_,i)=>{const t=i/28*Math.PI*2;return[16*Math.sin(t)**3/17,(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/17-.05];});
const star=(n=5,ri=.42)=>Array.from({length:n*2},(_,i)=>{const a=i/(n*2)*Math.PI*2-Math.PI/2,r=i%2?ri:1;return[Math.cos(a)*r,-Math.sin(a)*r];});
const flower=()=>[...[0,1,2,3,4].map(i=>circ(Math.cos(i*1.2566+1.5708)*.55,Math.sin(i*1.2566+1.5708)*.55,.42,12)),circ(0,0,.3,10)];
export const SHAPES={
 star:[star()],
 bolt:[[[.2,1],[-.55,-.1],[-.05,-.1],[-.25,-1],[.6,.2],[.1,.2]]],
 heart:[heart()],
 crown:[[[-.95,-.6],[-.95,.55],[-.45,0],[0,.85],[.45,0],[.95,.55],[.95,-.6]]],
 comet:[circ(.3,-.3,.5,16),[[-.95,.95],[-.05,-.45],[.55,.15]]],
 paw:[circ(0,-.3,.5,14),circ(-.72,.18,.22,10),circ(-.26,.6,.22,10),circ(.26,.6,.22,10),circ(.72,.18,.22,10)],
 gem:[[[-.55,.7],[.55,.7],[1,.15],[0,-1],[-1,.15]]],
 rocket:[[[0,1],[.4,.4],[.4,-.45],[-.4,-.45],[-.4,.4]],[[.4,-.05],[.85,-.75],[.4,-.45]],[[-.4,-.05],[-.85,-.75],[-.4,-.45]],[[-.22,-.5],[0,-1],[.22,-.5]]],
 butterfly:[[[0,.1],[.95,.85],[1,.05],[.35,-.15]],[[0,.1],[-.95,.85],[-1,.05],[-.35,-.15]],[[0,-.1],[.75,-.95],[.8,-.45],[.2,.0]],[[0,-.1],[-.75,-.95],[-.8,-.45],[-.2,.0]],[[-.08,.5],[.08,.5],[.08,-.8],[-.08,-.8]]],
 horn:[[[0,1],[.38,-.55],[-.38,-.55]],[[-.55,-.62],[.55,-.62],[.45,-.95],[-.45,-.95]]],
 flower:flower()};
export const EMB_ORDER=['star','bolt','heart','crown','comet','paw','gem','rocket'];       // kart.emblem 1..8 (0 = none)
export const MARK_ORDER=['heart','star','crown','butterfly','horn','flower','gem','rocket']; // kart.marker 0..7
export const EMB_NAMES=['None','Star','Bolt','Heart','Crown','Comet','Paw','Gem','Rocket'];
export const MARK_NAMES=['Heart','Star','Crown','Butterfly','Unicorn horn','Flower','Gem','Rocket'];
export const FX_NAMES=['Plain','Glow','Sparkle trail'];
export const NEON=[0xff3fd8,0x35f2ff,0xffd23a,0x7dff6a,0xff7a1a,0xffffff,0x8a6bff,0xff3a5a];   // 8 neon colours (kart.emblemColor 0..7, kart.markerColor 0..7; markerColor 8 = rainbow)
export const NEON_NAMES=['Pink','Cyan','Gold','Lime','Orange','White','Purple','Red'];
export const hexCss=h=>'#'+h.toString(16).padStart(6,'0');
// rainbow marker colour at time t (s)
export const rainbow=t=>`hsl(${Math.floor(t*120)%360} 100% 62%)`;
export const markCss=(ci,t=0)=>ci>=8?rainbow(t):hexCss(NEON[ci]||NEON[0]);
// SVG path data for a shape (viewBox 0 0 24 24), flipped to y-down
const R=10,C=12;
export function svgPath(name){return (SHAPES[name]||[]).map(p=>'M'+p.map(([x,y])=>(C+x*R).toFixed(1)+' '+(C-y*R).toFixed(1)).join('L')+'Z').join('');}
export const svgIcon=(name,col,extra='')=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${svgPath(name)}" fill="${col}" stroke="#fff" stroke-width="1.2" stroke-linejoin="round" ${extra}/></svg>`;
// Path2D at (cx,cy) with radius r (canvas, y down)
export function path2d(name,cx,cy,r){const P=new Path2D();for(const p of SHAPES[name]||[]){p.forEach(([x,y],i)=>i?P.lineTo(cx+x*r,cy-y*r):P.moveTo(cx+x*r,cy-y*r));P.closePath();}return P;}
// THREE shapes in the XY plane (caller rotates them flat)
export function threeShapes(THREE,name){return (SHAPES[name]||[]).map(p=>{const sh=new THREE.Shape();p.forEach(([x,y],i)=>i?sh.lineTo(x,y):sh.moveTo(x,y));sh.closePath();return sh;});}
export const emblemName=i=>i>0&&i<=EMB_ORDER.length?EMB_ORDER[i-1]:null;
// tiny portrait badge (inner SVG markup for the 24x24 ladder portrait): emblem in the corner
export function badgeInner(emb,col){const n=emblemName(emb);if(!n)return '';return `<g transform="translate(13.2 13.2) scale(.46)"><path d="${svgPath(n)}" transform="translate(-12 -12)" fill="${hexCss(NEON[col]||NEON[0])}" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/></g>`;}
