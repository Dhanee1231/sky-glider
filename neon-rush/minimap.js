// Neon Rush M5 race minimap: a cached track outline + live dots on a small 2D canvas (0 GL draw calls, redrawn at <= 30 Hz).
// The player's dot is the garage "map marker" (shape, colour, glow / sparkle trail); rivals stay plain dots.
import {MARK_ORDER,NEON,path2d,markCss,hexCss} from './emblems.js';
const SZ=160,PAD=16;
// draw one marker at (x,y) with radius r. kart = {marker,markerColor,markerFx,emblem,emblemColor}; trail = [{x,y,a}] (sparkle fx)
export function paintMarker(g,x,y,r,kart,t,trail){const name=MARK_ORDER[kart.marker]||MARK_ORDER[0],col=markCss(kart.markerColor,t),fx=kart.markerFx|0;
 if(fx===2&&trail)for(const p of trail){g.globalAlpha=p.a*.8;g.fillStyle=markCss(kart.markerColor,t+p.a);const s=2+p.a*3;g.fillRect(p.x-s/2,p.y-s/2,s,s);}
 g.globalAlpha=1;g.save();if(fx===1){g.shadowColor=col;g.shadowBlur=r*1.3;}
 g.fillStyle='rgba(20,8,40,.75)';g.beginPath();g.arc(x,y,r*1.25,0,7);g.fill();
 g.strokeStyle=kart.emblem>0?hexCss(NEON[kart.emblemColor]||NEON[0]):'#fff';g.lineWidth=2.5;g.stroke();g.shadowBlur=fx===1?r*1.3:0;
 const p=path2d(name,x,y,r*.95);g.fillStyle=col;g.fill(p);g.strokeStyle='#fff';g.lineWidth=1.5;g.lineJoin='round';g.stroke(p);g.restore();}
export function createMinimap(canvas,sample,riskOf){const g=canvas.getContext('2d');canvas.width=canvas.height=SZ;
 let pts=[],L=1,bg=null,acc=0,trail=[],tAcc=0,minx=0,minz=0,sc=1,ox=0,oz=0;const o={};
 const mapX=x=>ox+(x-minx)*sc,mapY=z=>oz+(z-minz)*sc;
 let fk=[];
 function setTrack(len,forks=[]){L=len;pts=[];fk=[];let a=1e9,b=-1e9,c=1e9,d=-1e9;const N=240;for(let i=0;i<N;i++){sample(i/N*L,o);pts.push([o.x,o.z]);a=Math.min(a,o.x);b=Math.max(b,o.x);c=Math.min(c,o.z);d=Math.max(d,o.z);}
  sc=(SZ-PAD*2)/Math.max(b-a,d-c,1);minx=a;minz=c;ox=PAD+((SZ-PAD*2)-(b-a)*sc)/2;oz=PAD+((SZ-PAD*2)-(d-c)*sc)/2;
  bg=document.createElement('canvas');bg.width=bg.height=SZ;const q=bg.getContext('2d');
  q.fillStyle='rgba(20,8,44,.72)';q.beginPath();q.roundRect(1,1,SZ-2,SZ-2,22);q.fill();q.strokeStyle='rgba(255,255,255,.45)';q.lineWidth=3;q.stroke();
  const line=(w,col)=>{q.lineWidth=w;q.strokeStyle=col;q.lineJoin=q.lineCap='round';q.beginPath();pts.forEach(([x,z],i)=>i?q.lineTo(mapX(x),mapY(z)):q.moveTo(mapX(x),mapY(z)));q.closePath();q.stroke();};
  line(13,'#0a0418');line(8,'#35f2ff');line(3,'#fff');   // outline, neon road, centre line
  // M6B forks: the road splits in two thin branches (cyan) around an island; update() paints the risky one orange
  const OFF=3.4/sc;for(const [a,b] of forks){const br={a,b,sides:[[],[]]};for(let s=a;s<=b;s+=6){sample(s,o);for(const [i,sd] of[-1,1].entries()){const m=OFF*smoothT(Math.min((s-a)/12,(b-s)/12));br.sides[i].push([mapX(o.x-o.tz*sd*m),mapY(o.z+o.tx*sd*m)]);}}
   q.lineJoin=q.lineCap='round';q.strokeStyle='#0a0418';q.lineWidth=11;q.beginPath();br.sides.forEach(p=>{p.forEach(([x,y],i)=>i?q.lineTo(x,y):q.moveTo(x,y));});q.stroke();
   for(const p of br.sides){q.strokeStyle='#35f2ff';q.lineWidth=3.2;q.beginPath();p.forEach(([x,y],i)=>i?q.lineTo(x,y):q.moveTo(x,y));q.stroke();}fk.push(br);}
  const [fx,fz]=pts[0];q.fillStyle='#ffd23a';q.fillRect(mapX(fx)-5,mapY(fz)-2,10,4);trail=[];}   // start/finish tick
 const smoothT=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
 const pos=s=>{sample(s,o);return [mapX(o.x),mapY(o.z)];};
 function update(dt,t,P,rivals,kart){acc+=dt;if(acc<1/30)return;const step=acc;acc=0;if(!bg)return;
  g.clearRect(0,0,SZ,SZ);g.drawImage(bg,0,0);
  if(fk.length&&riskOf)fk.forEach((br,i)=>{const side=riskOf(i,P.s);g.strokeStyle='#ff8a1a';g.lineWidth=3.6;g.lineCap='round';g.beginPath();br.sides[side<0?0:1].forEach(([x,y],j)=>j?g.lineTo(x,y):g.moveTo(x,y));g.stroke();});
  for(const r of rivals){const [x,y]=pos(r.s);g.fillStyle=r.css;g.beginPath();g.arc(x,y,6,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=2;g.stroke();}
  const [px,py]=pos(P.s);
  if(kart.markerFx===2){tAcc+=step;if(tAcc>.06){tAcc=0;trail.push({x:px+(Math.random()-.5)*6,y:py+(Math.random()-.5)*6,a:1});if(trail.length>9)trail.shift();}for(const p of trail)p.a=Math.max(0,p.a-step*1.6);}else trail.length=0;
  paintMarker(g,px,py,12,kart,t,trail);}
 return {setTrack,update};}
