// Arcade Skyway (M4): an elevated deck high over a deep, lit city. A spiral bridge ramp climbs a full loop and crosses
// over the start straight; neon hoops, a claw-machine tower inside the spiral, pixel billboards, a glowing arcade tunnel,
// and a rich lower city (lit streets, moving light trails, rooftops with neon, signs).
export default {
 id:'skyway',name:'Arcade Skyway',music:'skyway',pace:.992,seed:37,
 pts:[[0,120],[0,-60],[20,-130],[80,-160],[130,-120],[120,-60],[60,-50],[20,-90],[-20,-150],[-90,-190],[-175,-250],[-285,-275],[-375,-215],[-410,-110],[-385,0],[-335,85],[-335,175],[-300,255],[-215,285],[-140,220],[-70,190],[-20,170]],
 elev:[[250,735,9.5,300,110]],                    // spiral ramp: climbs the loop, crosses over the start straight at s~592, back down
 tunnels:[[1767,1839,'arcade']],
 deck:true,ground:-36,mirror:false,walk:3,tunnelH:7.4,
 boost:[70,78,86,952,960,968,1372,1380,1388],ramps:[{s0:25,len:7,h:1.1},{s0:160,len:7,h:1.1}],puddles:{s0:1162,n:7,step:9},
 items:[114,205,237,858,1136,1413,1637,1860],
 obstacles:[
   // M6B: 40-60% longer lap -> relocated out of the forks + new groups (lv = first level that has a mover: 0 Easy, 1 Medium, 2 Hard, 3 Extreme)
  {kind:'rotor',s:125,x:-3.1,lv:2},{kind:'slidebar',s:220,x:2.55,lv:0},{kind:'sweeper',s:260,x:-3.2},{kind:'pixel',s:300,x:3},
  {kind:'drone',s:355,x:-2.65,lv:3},{kind:'gate',s:400,x:3},{kind:'bumper',s:435,x:3.2},{kind:'cones',s:470,x:-3},
  {kind:'drone',s:505,x:-2.65,lv:2},{kind:'wheel',s:540,x:3.2},{kind:'swinggate',s:570,x:3.35,lv:1},{kind:'bumper',s:600,x:3.2},
  {kind:'slidebar',s:630,x:-2.55,lv:2},{kind:'sign',s:660,x:-3.2},{kind:'paddle',s:719,x:-3},{kind:'sweeper',s:958,x:3},
  {kind:'rotor',s:995,x:3.1,lv:0},{kind:'cones',s:1041,x:3.2},{kind:'gate',s:1086,x:-3},{kind:'goo',s:1122,x:-3.2},
  {kind:'pixel',s:1158,x:-3.2},{kind:'goo',s:1360,x:2.8},{kind:'rotor',s:1403,x:-3.1,lv:0},{kind:'drone',s:1445,x:-2.65,lv:3},
  {kind:'slidebar',s:1483,x:2.55,lv:1},{kind:'pixel',s:1520,x:-3},{kind:'wheel',s:1562,x:3.2},{kind:'car',s:1603,x:3.5,len:70},
  {kind:'bumper',s:1704,x:-3},{kind:'cones',s:1905,x:-3.1},{kind:'swinggate',s:1872,x:3.35,lv:1}],
 forks:[[780,930],[1200,1350]],   // M6B: split sections (median island; risky branch = boost pads + hazards, safe branch = clear; sides swap per lap)
 crowd:[[-46,34,0],[178,212,0],[808,848,0],[1391,1431,-1],[1848,1882,1]],party:[-14,195,858,1434,1866],
 signals:[],far:{n:70,h0:40,h1:120,y0:-36},
 pal:{fog:0x4a1a6a,fogD:.0035,env:[[0,'#160a30'],[.4,'#4a1a7a'],[.5,'#ff6a3a'],[.56,'#3a1a4a'],[1,'#0a0618']],neon:[0xff4fd8,0x35f2ff,0xffd23a,0x7dff6a],
  bg:[[0,'#0c0626'],[.34,'#3a1470'],[.56,'#a03aa0'],[.7,'#ff6a5a'],[.8,'#ffb06a'],[1,'#2a1040']],hemi:[0xa080e0,0x200c30,.62],key:[0xff9a70,1.15,[-60,40,-110]],rim:[0x70d8ff,.75],
  edge:0xff4fd8,edge2:0x35f2ff,tunnel:[0xff4fd8,0xffd23a,0x35f2ff,0x7dff6a,0x8a6bff],tunnelLight:0x9a6bff,ground:0x0c0818,groundRough:.6,asphalt:'#3a3448',
  farTint:0x7050b0,bloom:.42,moon:[60,90,-360],
  words:[['ARCADE','#35f2ff'],['1UP','#7dff6a'],['HI-SCORE','#ffd23a'],['PRIZES','#ff4fc8'],['GAME ON','#ff8a2a'],['TOKENS','#ffd23a'],['BOBA TEA','#7dff6a'],['NOODLES','#ff4fc8']]},
 build(c){const {THREE,S,V,C,merge,paintCol,sample,pointAt,minDistToTrack,L,W,WALK,CURB,TH,TOFF,GROUND,conc,metal,emit,rnd,signs,lampPos,cv,tex,glowT,addBuilding,CX,CZ,RAD,bb}=c;const o={};
  const solid=[];
  // ---- lower city: street grid with lit roads, blocks of buildings (roofs well below the deck), a few towers rising past it ----
  const G0=GROUND,STEPG=34,ROAD=8;const x0=Math.floor((bb[0]-110)/STEPG)*STEPG,x1=bb[1]+110,z0=Math.floor((bb[2]-110)/STEPG)*STEPG,z1=bb[3]+110;
  const streets=[];   // [ax,az,bx,bz] centre lines for traffic
  const flat=(w,d,x,y,z,col)=>emit.push(paintCol(new THREE.PlaneGeometry(w,d).rotateX(-Math.PI/2).translate(x,y,z),col));   // top-facing strip (seen from above only)
  for(let x=x0;x<=x1;x+=STEPG){streets.push([x,z0,x,z1]);for(const k of[-1,1])flat(.3,z1-z0,x+k*(ROAD/2-.5),G0+.03,(z0+z1)/2,C(0xffb860,1.3));}
  for(let z=z0;z<=z1;z+=STEPG){streets.push([x0,z,x1,z]);for(const k of[-1,1])flat(x1-x0,.3,(x0+x1)/2,G0+.03,z+k*(ROAD/2-.5),C(0xffb860,1.3));}
  const roofCols=[0xff4fd8,0x35f2ff,0xffd23a,0x7dff6a,0x8a6bff];let nb=0;
  for(let x=x0;x<x1;x+=STEPG)for(let z=z0;z<z1;z+=STEPG){const cx=x+STEPG/2,cz=z+STEPG/2;   // each block: 1-4 buildings
   const n=1+Math.floor(rnd()*3);for(let i=0;i<n;i++){const w=8+rnd()*(STEPG-ROAD-12),d=8+rnd()*(STEPG-ROAD-12),bx=cx+(rnd()-.5)*(STEPG-ROAD-w),bz=cz+(rnd()-.5)*(STEPG-ROAD-d);
    const near=minDistToTrack(bx,bz);let h=6+rnd()*22;if(near>34&&rnd()<.12)h=48+rnd()*40;   // towers only away from the deck
    if(near<Math.max(w,d)/2+3&&h>30)h=26;
    addBuilding(bx,bz,0,d,w,h,G0);nb++;const top=G0+h;
    if(rnd()<.8){const col=C(roofCols[(nb*7)%5],2.2);for(const [ax,az,lx,lz] of[[0,d/2,w,.3],[0,-d/2,w,.3],[w/2,0,.3,d],[-w/2,0,.3,d]])flat(lx,lz,bx+ax,top+.06,bz+az,col);}
    if(rnd()<.35&&h<34)signs.push({raw:1,x:bx,y:top+1.6,z:bz+(rnd()<.5?d/2:-d/2)*.6,ang:rnd()*6.28,w:7});
    if(rnd()<.3)solid.push(paintCol(new THREE.BoxGeometry(2.4,1.2,1.6).translate(bx+(rnd()-.5)*w*.6,top+.6,bz+(rnd()-.5)*d*.6),C(0x8a8a9a)));}}
  // street lamps glow (tiny emissive heads only; light comes from emissive + bloom)
  for(const [ax,az,bx2,bz2] of streets){const len=Math.hypot(bx2-ax,bz2-az),n=Math.floor(len/22);for(let i=0;i<n;i++){const t=(i+.5)/n,x=ax+(bx2-ax)*t,z=az+(bz2-az)*t;emit.push(paintCol(new THREE.OctahedronGeometry(.4,0).translate(x+(bx2===ax?ROAD/2:0),G0+5,z+(bz2===az?ROAD/2:0)),C(0xffd8a0,2.8)));}}
  // ---- moving light trails: little cars (head/tail light pairs) gliding along the streets ----
  const NT=c.HIGH?150:70,trails=new THREE.InstancedMesh(new THREE.PlaneGeometry(.9,2.6).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:glowT,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}),NT);
  trails.frustumCulled=false;trails.layers.set(1);S.add(trails);const tr=[];const tc=new THREE.Color();
  for(let i=0;i<NT;i++){const st=streets[Math.floor(rnd()*streets.length)],dir=rnd()<.5?1:-1;tr.push({st,u:rnd(),dir,v:(10+rnd()*8)/Math.hypot(st[2]-st[0],st[3]-st[1]),lane:dir*1.8});
   trails.setColorAt(i,tc.setHex(dir>0?0xfff0c0:0xff3050).multiplyScalar(2.2));}
  // ---- neon hoops over the start straight ----
  for(let i=0;i<6;i++){const s=96+i*6;sample(s,o);const ang=Math.atan2(o.tx,o.tz);const g=new THREE.TorusGeometry(W/2+2.2,.22,6,40,Math.PI);g.rotateY(ang);g.translate(o.x,o.y,o.z);emit.push(paintCol(g,C(roofCols[i%5],2.8)));
}
  // ---- claw-machine tower inside the spiral loop ----
  let claw,clawY;{const cx=78,cz=-105,base=G0,H=52;const glassG=new THREE.BoxGeometry(14,30,14).translate(cx,base+H-15,cz);
   const glass=new THREE.Mesh(glassG,new THREE.MeshStandardMaterial({color:0x6ad8ff,transparent:true,opacity:.22,roughness:.05,metalness:.3,envMapIntensity:2,depthWrite:false}));glass.renderOrder=5;glass.layers.set(1);S.add(glass);
   solid.push(paintCol(new THREE.BoxGeometry(15,H-30,15).translate(cx,base+(H-30)/2,cz),C(0x5a2a8a)));   // cabinet body
   for(const sx of[-1,1])for(const sz of[-1,1])solid.push(paintCol(new THREE.BoxGeometry(.6,30.4,.6).translate(cx+sx*7,base+H-15,cz+sz*7),C(0xd8d8e8)));
   emit.push(paintCol(new THREE.BoxGeometry(15.4,2.4,15.4).translate(cx,base+H+1.2,cz),C(0xff4fd8,2.4)),paintCol(new THREE.BoxGeometry(15.4,1,15.4).translate(cx,base+H-30.2,cz),C(0xffd23a,2.4)));
   for(let i=0;i<12;i++)emit.push(paintCol(new THREE.SphereGeometry(.3,8,6).translate(cx-7.3+i*1.33,base+H+2.8,cz+7.7),C(roofCols[i%5],3)));
   const pz=[];for(let i=0;i<46;i++){const r=1+rnd()*.6;pz.push(paintCol(new THREE.SphereGeometry(r,8,6).translate(cx+(rnd()-.5)*11,base+H-29+rnd()*5,cz+(rnd()-.5)*11),C([0xff9ad8,0x9ae8ff,0xffe07a,0xb4ff9a,0xc8a8ff][i%5],1.2)));}solid.push(...pz);
   signs.push({raw:1,x:cx,y:base+H+5.4,z:cz+7.8,ang:0,w:12,k:3},{raw:1,x:cx,y:base+H+5.4,z:cz-7.8,ang:Math.PI,w:12,k:3});
   const cg=[new THREE.CylinderGeometry(.12,.12,12,6).translate(0,6,0),new THREE.CylinderGeometry(.7,.7,.8,10)];for(let i=0;i<3;i++)cg.push(new THREE.BoxGeometry(.3,2.4,.3).translate(0,-1.2,.6).rotateX(.4).rotateY(i/3*Math.PI*2));
   claw=new THREE.Mesh(merge(cg),new THREE.MeshStandardMaterial({color:0xe8e8f4,metalness:.9,roughness:.2}));clawY=base+H-12;claw.position.set(cx,clawY,cz);claw.layers.set(1);S.add(claw);claw.userData.c=[cx,cz];}
  // ---- pixel billboards (2-frame pixel art, flips every half second) ----
  let bill;{const pc=cv(128,64,(g)=>{g.imageSmoothingEnabled=false;for(let f=0;f<2;f++){const ox=f*64;g.fillStyle='#10061e';g.fillRect(ox,0,64,64);
     const art=f?['..X....X..','.XXXXXXXX.','XXOXXXXOXX','XXXXXXXXXX','.X.X..X.X.']:['..X....X..','.XXXXXXXX.','XXOXXXXOXX','XXXXXXXXXX','X.X....X.X'];
     art.forEach((r,y)=>[...r].forEach((ch,x)=>{if(ch!=='.'){g.fillStyle=ch==='O'?'#ffffff':f?'#35f2ff':'#ff4fd8';g.fillRect(ox+4+x*3,8+y*4,3,4);}}));
     g.fillStyle='#ffd23a';g.fillRect(ox+38,10,4,4);g.fillRect(ox+46,10,4,4);g.fillRect(ox+54,10,4,4);g.fillStyle=f?'#7dff6a':'#ff8a2a';for(let i=0;i<4;i++)g.fillRect(ox+38+i*5,22+(i+f)%2*3,4,4);
     g.fillStyle='#ffffff';g.fillRect(ox+4,44,56,2);g.fillStyle='#ff4fd8';for(let i=0;i<7;i++)if((i+f)%2)g.fillRect(ox+4+i*8,50,6,6);}});
   const t=tex(pc,true,true);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;t.repeat.set(.5,1);
   const gs=[];[[230,1],[689,-1],[1300,1],[1623,-1],[1900,1]].forEach(([s,sd])=>{sample(s,o);const ang=Math.atan2(o.tx,o.tz),off=sd*(W/2+WALK+5),x=o.x-o.tz*off,z=o.z+o.tx*off;
     const g=new THREE.PlaneGeometry(11,5.5).rotateY(ang+Math.PI-sd*.45).translate(x,o.y+8.5,z);gs.push(g);
     solid.push(paintCol(new THREE.BoxGeometry(.5,9,.5).translate(x,o.y+3,z),C(0x2a1a40)),paintCol(new THREE.BoxGeometry(11.6,6.1,.3).rotateY(ang+Math.PI-sd*.45).translate(x-Math.sin(ang+Math.PI-sd*.45)*.2,o.y+8.5,z-Math.cos(ang+Math.PI-sd*.45)*.2),C(0x1a1030)));
     emit.push(paintCol(new THREE.BoxGeometry(11.8,.2,.34).rotateY(ang+Math.PI-sd*.45).translate(x,o.y+11.6,z),C(0x35f2ff,2.6)),paintCol(new THREE.BoxGeometry(11.8,.2,.34).rotateY(ang+Math.PI-sd*.45).translate(x,o.y+5.4,z),C(0xff4fd8,2.6)));});
   bill=new THREE.Mesh(merge(gs),new THREE.MeshBasicMaterial({map:t,color:new THREE.Color(1.7,1.7,1.7),side:THREE.DoubleSide}));bill.layers.set(1);S.add(bill);}
  // ---- arcade tunnel extras: LED dots along every rib + a glowing floor strip ----
  {const [a,b]=this.tunnels[0];let k=0;for(let s=a+2;s<b-1;s+=4,k++){sample(s,o);for(let i=0;i<=10;i++){const t=i/10;const x=-TOFF+.15+t*(2*TOFF-.3);emit.push(paintCol(new THREE.OctahedronGeometry(.1,0).translate(o.x-o.tz*x,o.y+TH-.25,o.z+o.tx*x),C(roofCols[(i+k)%5],3.2)));}}
   for(const sd of[-1,1]){const m=c.ribbon(.25,.02,4,sd*(W/2-1.2),a,b);emit.push(paintCol(m,C(sd>0?0xff4fd8:0x35f2ff,2.4)));}}
  // ---- spiral: glowing guide rings on the deck edge so the climb reads as a spiral ----
  {const [s0,s1]=this.elev[0];for(let s=s0+10;s<s1-10;s+=8){sample(s,o);if(o.y<1.5)continue;for(const sd of[-1,1]){const x=sd*(W/2+WALK+.6);emit.push(paintCol(new THREE.OctahedronGeometry(.24,0).translate(o.x-o.tz*x,o.y+1.4,o.z+o.tx*x),C(sd>0?0xffd23a:0xff4fd8,3)));}}}
  S.add(new THREE.Mesh(merge(solid),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.5,metalness:.2})));
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),sc=new THREE.Vector3(1,1,1);let fT=0;
  return {update(dt,t){
   for(let i=0;i<NT;i++){const p=tr[i];p.u+=p.v*p.dir*dt;if(p.u>1)p.u-=1;if(p.u<0)p.u+=1;const [ax,az,bx2,bz2]=p.st;const vert=ax===bx2;
    v.set(ax+(bx2-ax)*p.u+(vert?p.lane:0),G0+.12,az+(bz2-az)*p.u+(vert?0:p.lane));q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,vert?0:Math.PI/2);m.compose(v,q,sc);trails.setMatrixAt(i,m);}
   trails.instanceMatrix.needsUpdate=true;
   const [cx,cz]=claw.userData.c;claw.position.set(cx+Math.sin(t*.5)*4,clawY-Math.max(0,Math.sin(t*.9))*9,cz+Math.cos(t*.37)*4);claw.rotation.y=t*.6;
   fT+=dt;if(fT>.5){fT=0;bill.material.map.offset.x=bill.material.map.offset.x?0:.5;}}};}
};
