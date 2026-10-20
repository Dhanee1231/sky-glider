// Candy Crystal Peaks (M7, Track 5): a frosted-candy mountain loop. Glitter road, candy-cane kerbs, lollipop trees, glowing gem clusters,
// a rainbow taffy arch over the start, a Sprinkle Tunnel and a Gem Bridge (the two forks), a mountain-pass climb with a Gem Jump ramp.
// Data + landmarks only (world.js builds the road / bridge / tunnel kit). Original shapes and names only.
export default {
 id:'candy',name:'Candy Crystal Peaks',music:'candy',pace:1.006,seed:67,
 pts:[[0,141],[0,28],[-26,-40],[-10,-110],[42,-190],[132,-237],[244,-242],[357,-237],[442,-190],[470,-103],[451,-24],[404,42],[423,118],[470,188],[442,268],[357,301],[235,306],[122,301],[38,282],[-9,235]],
 elev:[[780,1010,3.6,50,50]],                      // the mountain pass: a gentle climb, a plateau and a drop on the right side
 tunnels:[[285,355,'sprinkle']],                    // Sprinkle Tunnel after the left-hand chicane
 boost:[372,380,388,672,680,688,1564,1572,1580],ramps:[{s0:1625,len:7,h:1.1}],
 items:[95,235,418,718,903,1088,1273,1683],
 // kid-fair groups: every one leaves a >= 5 m clear lane; lv = first level that has a mover (0 Easy, 1 Medium, 2 Hard, 3 Extreme)
 obstacles:[
  {kind:'cones',s:82,x:-3.2},{kind:'ball',s:117,x:3.2},{kind:'rollball',s:153,x:2.6,lv:0},{kind:'castle',s:190,x:3.2},
  {kind:'bumper',s:228,x:-3.2},{kind:'swinggate',s:416,x:3.35,lv:1},{kind:'barrel',s:456,x:-3.2},{kind:'crate',s:716,x:3.2},
  {kind:'rollball',s:758,x:-2.6,lv:2},{kind:'umbrella',s:792,x:3.2},{kind:'trap',s:827,x:-3.2},{kind:'slidebar',s:863,x:2.55,lv:3},
  {kind:'cones',s:900,x:-3.2},{kind:'ball',s:938,x:3.2},{kind:'rollball',s:977,x:2.6,lv:0},{kind:'castle',s:1017,x:3.2},
  {kind:'bumper',s:1058,x:-3.2},{kind:'rotor',s:1100,x:3.1,lv:1},{kind:'barrel',s:1134,x:-3.2},{kind:'crate',s:1169,x:3.2},
  {kind:'rollball',s:1205,x:-2.6,lv:2},{kind:'umbrella',s:1242,x:3.2},{kind:'trap',s:1280,x:-3.2},{kind:'swinggate',s:1319,x:3.35,lv:3},
  {kind:'cones',s:1681,x:-3.2},{kind:'ball',s:1722,x:3.2},{kind:'rollball',s:1764,x:2.6,lv:0}],
 forks:[[500,650],[1392,1542]],   // fork 1 = Sprinkle Pass (top straight), fork 2 = Gem Bridge (bottom straight); risky branch = boost pads + hazards, sides swap per lap
 crowd:[[-66,14,0],[510,570,-1],[1100,1150,1],[1400,1450,-1]],party:[-20,540,1130,1425],
 walk:2.5,mirror:false,mirrorY:-.6,far:false,rain:false,lampSides:[-1,1],
 pal:{fog:0xffc4e8,fogD:.0036,env:[[0,'#5a3a9a'],[.42,'#ff9ad0'],[.5,'#fff0d8'],[.56,'#9ad8ff'],[1,'#7a5ab0']],neon:[0xff4fd8,0x35f2ff,0xffd23a,0x7dffb0],
  bg:[[0,'#3a2a8a'],[.3,'#8a5ad0'],[.52,'#ff8ac8'],[.68,'#ffc0d8'],[.82,'#ffe0c8'],[1,'#fff0e0']],hemi:[0xffd8f0,0xb890d0,1],key:[0xfff0d0,1.0,[-60,40,-80]],rim:[0x9adcff,.5],
  edge:0xff4fd8,edge2:0xffd23a,tunnel:[0xff4fd8,0x7dffd8,0xffd23a,0x9ab0ff],tunnelLight:0xffb0e0,mirror:0xe0c8f0,ground:0xffe0f2,groundRough:.6,
  asphalt:'#c9a2e6',edgeLine:'rgba(255,255,255,.95)',dry:1,conc:'#fff0f6',metal:0xf0e0f8,lamp:0xfff0d0,pool:0xffb0e0,moon:[-70,30,-330],top:0xffd8f0,bloom:.35,
  words:[['GUMDROPS','#ff4fd8'],['LOLLIPOPS','#35f2ff'],['SPRINKLES','#ffd23a'],['CANDY','#ff7ab8'],['TAFFY','#7dffb0'],['SWEETS','#ff8a2a'],['FUDGE','#b07aff'],['YUM!','#ff4fd8']]},
 build(c){const {THREE,S,V,C,merge,paintCol,sample,ribbon,ranges,minDistToTrack,L,W,WALK,CURB,emit,rnd,signs,cv,tex,glowT,yAt,HIGH,CX,CZ,RAD,wrap,inTunnel}=c;const o={},solid=[];
  const OUT=W/2+.35+WALK;
  const M=(x,y,z,ry=0,rx=0,rz=0,sx=1,sy=sx,sz=sx)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz,'YXZ')),new THREE.Vector3(sx,sy,sz));
  const put=(g,col,m,P,out=solid)=>{g=g.index?g.toNonIndexed():g.clone();if(m)g.applyMatrix4(m);if(P)g.applyMatrix4(P);out.push(col==null?g:paintCol(g,col instanceof THREE.Color?col:C(col)));return g;};
  const glow=(g,col,m,P)=>put(g,col,m,P,emit);
  const F=(s,d)=>{sample(s,o);return {x:o.x-o.tz*d,z:o.z+o.tx*d,y:o.y,ang:Math.atan2(o.tx,o.tz),tx:o.tx,tz:o.tz,face:Math.atan2(o.tz*Math.sign(d),-o.tx*Math.sign(d))};};   // face = yaw that turns a +z-facing panel toward the road
  const hash=(x,y,z)=>{const v=Math.sin(x*12.9898+y*78.233+z*37.719)*43758.5453;return v-Math.floor(v);};
  const far=(x,z)=>minDistToTrack(x,z);
  const PASTEL=[0xffb0d8,0xc8a8ff,0xa8ffd8,0xffd0a8,0xa8d8ff,0xffa8c0];
  // ---------- frosted candy mountains: jagged cones with a dripping white frosting cap, all one lit mesh ----------
  const peak=(x,z,r,h,col)=>{const body=new THREE.ConeGeometry(r,h,HIGH?16:10,HIGH?3:2,true).toNonIndexed(),p=body.attributes.position,cc=new Float32Array(p.count*3),b=C(col),w=new THREE.Color(1,.96,1);
   for(let i=0;i<p.count;i++){const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),t=(py+h/2)/h,k=py>h/2-.01?0:(hash(Math.round(px*3),Math.round(py*3),Math.round(pz*3))-.5);
    p.setXYZ(i,px*(1+k*.28),py+(k*h*.06),pz*(1+k*.28));const m=Math.min(1,Math.max(0,(t-.52)*2.4));cc[i*3]=b.r+(w.r-b.r)*m;cc[i*3+1]=b.g+(w.g-b.g)*m;cc[i*3+2]=b.b+(w.b-b.b)*m;}
   body.setAttribute('color',new THREE.BufferAttribute(cc,3));body.computeVertexNormals();solid.push(body.applyMatrix4(M(x,h/2,z,rnd()*6.28)));
   // frosting drips: a shorter, wider white cone whose rim hangs down in scallops
   const hc=h*.42,rc=r*.5,cap=new THREE.ConeGeometry(rc,hc,HIGH?16:10,1,true).toNonIndexed(),q=cap.attributes.position;
   for(let i=0;i<q.count;i++){if(q.getY(i)<0){const a=Math.atan2(q.getZ(i),q.getX(i));q.setY(i,q.getY(i)-(Math.sin(a*5)*.5+.5)*hc*.32);}}
   cap.computeVertexNormals();put(cap,C(0xfff4fa,1.05),M(x,h-hc/2+.4,z,0,0,0,1.0),null);};
  const placed=[];const okPeak=(x,z,r)=>placed.every(q=>Math.hypot(q.x-x,q.z-z)>(q.r+r)*.7);
  {const NP=HIGH?34:20;let tries=0;while(placed.length<NP&&tries++<900){const a=rnd()*6.283,rr=Math.sqrt(rnd())*(RAD+170),x=CX+Math.cos(a)*rr,z=CZ+Math.sin(a)*rr,r=22+rnd()*40,h=26+rnd()*50+r*.5;
    const d=far(x,z);if(d<OUT+r*.75+14||d>260||!okPeak(x,z,r))continue;placed.push({x,z,r});peak(x,z,r,h,PASTEL[Math.floor(rnd()*PASTEL.length)]);}}
  // ---------- lollipop trees (instanced: stick + swirled candy disc, hue per instance) ----------
  const NL=HIGH?96:48;
  const lolliG=(()=>{const ps=[];const stick=new THREE.CylinderGeometry(.13,.16,4.6,5).translate(0,2.3,0).toNonIndexed();ps.push(paintCol(stick,new THREE.Color(1,1,1)));
   const nw=HIGH?20:12,d=new THREE.CircleGeometry(1.7,nw).toNonIndexed(),pp=d.attributes.position,cc=new Float32Array(pp.count*3);
   for(let i=0;i<pp.count;i+=3){const tri=i/3,v=tri%2?.46:1;for(let j=0;j<3;j++){cc[(i+j)*3]=v;cc[(i+j)*3+1]=v;cc[(i+j)*3+2]=v;}}
   d.setAttribute('color',new THREE.BufferAttribute(cc,3));ps.push(d.translate(0,5.9,0));
   const rim=new THREE.TorusGeometry(1.7,.14,4,HIGH?20:12).translate(0,5.9,0).toNonIndexed();ps.push(paintCol(rim,new THREE.Color(1,1,1)));
   return merge(ps);})();
  const lolli=new THREE.InstancedMesh(lolliG,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.35,metalness:.05,side:THREE.DoubleSide,emissive:0x331126,emissiveIntensity:.35}),NL);lolli.frustumCulled=false;lolli.layers.set(1);
  {const hues=[0xff5aa8,0x4fd8ff,0xffd23a,0x8aff7a,0xb07aff,0xff8a4a];let n=0,tries=0;const col=new THREE.Color(),mat=new THREE.Matrix4();
   while(n<NL&&tries++<5000){const s=rnd()*L,side=rnd()<.62?1:-1,d=side*(OUT+3.5+rnd()*(rnd()<.3?30:11));const f=F(s,d);if(inTunnel(s,12)||yAt(s)>.05&&rnd()<.7)continue;
    if(far(f.x,f.z)<OUT+2.8)continue;const sc=.8+rnd()*.9;const yaw=F(s,d).face+(rnd()-.5)*.8;
    mat.compose(new THREE.Vector3(f.x,(yAt(s)>.05?f.y:0),f.z),new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd()-.5)*.12,yaw,(rnd()-.5)*.12,'YXZ')),new THREE.Vector3(sc,sc,sc));
    lolli.setMatrixAt(n,mat);lolli.setColorAt(n,col.setHex(hues[n%hues.length]));n++;}
   lolli.count=n;}
  S.add(lolli);
  // ---------- gumdrop mounds along the verge (instanced domes, sugar-coated) ----------
  const NG=HIGH?90:44;
  const gdG=(()=>{const g=new THREE.SphereGeometry(1,HIGH?10:7,HIGH?5:4,0,6.283,0,Math.PI/2).toNonIndexed(),p=g.attributes.position,cc=new Float32Array(p.count*3);
   for(let i=0;i<p.count;i++){const v=.72+.28*Math.min(1,p.getY(i)*1.1);const sp=hash(Math.round(p.getX(i)*6),Math.round(p.getY(i)*6),Math.round(p.getZ(i)*6))>.93?1.25:v;cc[i*3]=sp;cc[i*3+1]=sp;cc[i*3+2]=sp;}
   g.setAttribute('color',new THREE.BufferAttribute(cc,3));g.scale(1,.8,1);return g;})();
  const gum=new THREE.InstancedMesh(gdG,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.28,metalness:.1}),NG);gum.frustumCulled=false;gum.layers.set(1);
  {const hues=[0xff7ab8,0x7affd0,0xffe05a,0xb08aff,0xff9a5a,0x7ac8ff];let n=0,tries=0;const col=new THREE.Color(),mat=new THREE.Matrix4();
   while(n<NG&&tries++<4000){const s=rnd()*L,side=rnd()<.5?1:-1,d=side*(OUT+1.2+rnd()*9);const f=F(s,d);if(inTunnel(s,8))continue;if(far(f.x,f.z)<OUT+.6)continue;const sc=.7+rnd()*1.5;
    mat.compose(new THREE.Vector3(f.x,(yAt(s)>.05?f.y-.1:-.1),f.z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,rnd()*6.28,0)),new THREE.Vector3(sc,sc,sc));
    gum.setMatrixAt(n,mat);gum.setColorAt(n,col.setHex(hues[n%hues.length]));n++;}gum.count=n;}
  S.add(gum);
  // ---------- giant glowing gem clusters (instanced, unlit + bloom; brighter on the night lap) ----------
  const NC=HIGH?40:22;
  const gemG=(()=>{const ps=[];const spec=[[0,0,1.0,3.6,0,0],[.8,.2,.62,2.4,.35,.2],[-.7,.3,.7,2.8,-.3,-.25],[.2,-.7,.55,2,.1,-.4],[-.2,.8,.5,2.2,-.1,.45]];
   for(const [x,z,r,h,tx,tz] of spec){const body=new THREE.CylinderGeometry(r*.8,r,h*.55,6).translate(0,h*.27,0),top=new THREE.ConeGeometry(r*.8,h*.45,6).translate(0,h*.55+h*.22,0);
    for(const g0 of[body,top]){const g=g0.toNonIndexed(),pp=g.attributes.position,cc=new Float32Array(pp.count*3);for(let i=0;i<pp.count;i+=3){const v=.6+.4*hash(i,x*5,z*5);for(let j=0;j<3;j++){const y=pp.getY(i+j);const t=.7+.5*Math.min(1,Math.max(0,y/h));cc[(i+j)*3]=cc[(i+j)*3+1]=cc[(i+j)*3+2]=v*t;}}
     g.setAttribute('color',new THREE.BufferAttribute(cc,3));g.applyMatrix4(M(x,0,z,0,tx,tz));ps.push(g);}}
   return merge(ps);})();
  const gemMat=new THREE.MeshBasicMaterial({vertexColors:true,color:new THREE.Color(1.6,1.6,1.6)});
  const gems=new THREE.InstancedMesh(gemG,gemMat,NC);gems.frustumCulled=false;gems.layers.set(1);
  {const hues=[0x35f2ff,0xff4fd8,0x7affb0,0xffd23a,0xb07aff];let n=0,tries=0;const col=new THREE.Color(),mat=new THREE.Matrix4();
   while(n<NC&&tries++<4000){const big=n%4===0;const s=rnd()*L,side=rnd()<.5?1:-1,d=side*(OUT+6+rnd()*(big?40:12));const f=F(s,d);if(inTunnel(s,14))continue;if(far(f.x,f.z)<OUT+4+(big?3:0))continue;
    const sc=big?2.6+rnd()*2.2:1+rnd()*1.1;
    mat.compose(new THREE.Vector3(f.x,(yAt(s)>.05?f.y-.2:-.2),f.z),new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd()-.5)*.1,rnd()*6.28,(rnd()-.5)*.1,'YXZ')),new THREE.Vector3(sc,sc,sc));
    gems.setMatrixAt(n,mat);gems.setColorAt(n,col.setHex(hues[n%hues.length]).multiplyScalar(1.4));n++;}gems.count=n;}
  S.add(gems);
  // ---------- candy-cane kerbs (red/white diagonal stripes over the kerb tops) ----------
  {const cane=tex(cv(64,128,(g,w,h)=>{g.fillStyle='#fff';g.fillRect(0,0,w,h);g.fillStyle='#ff2f6a';for(let i=-2;i<4;i++){g.beginPath();g.moveTo(0,i*h/2);g.lineTo(w,i*h/2-h/4);g.lineTo(w,i*h/2+h/4-h/4+h/4);g.lineTo(0,i*h/2+h/2);g.closePath();g.fill();}}),true,true);
   const m=new THREE.Mesh(merge([ribbon(.35,CURB+.012,1.2,-(W/2+.175)),ribbon(.35,CURB+.012,1.2,W/2+.175)]),new THREE.MeshStandardMaterial({map:cane,roughness:.3,metalness:0,polygonOffset:true,polygonOffsetFactor:-2}));m.layers.set(1);S.add(m);}
  // ---------- glitter road: a sparkle layer over the whole road (additive), twinkles ----------
  const glitT=tex(cv(256,256,(g,w,h)=>{g.clearRect(0,0,w,h);const cols=['#ffffff','#ffd0f0','#c8f4ff','#fff3b0'];for(let i=0;i<230;i++){const x=rnd()*w,y=rnd()*h,r=.55+rnd()*1.3;g.fillStyle=cols[i%4];g.globalAlpha=.55+rnd()*.45;
     g.beginPath();g.moveTo(x-r*2.4,y);g.lineTo(x,y-r*.5);g.lineTo(x+r*2.4,y);g.lineTo(x,y+r*.5);g.closePath();g.fill();g.beginPath();g.moveTo(x,y-r*2.4);g.lineTo(x+r*.5,y);g.lineTo(x,y+r*2.4);g.lineTo(x-r*.5,y);g.closePath();g.fill();}g.globalAlpha=1;}),true,true);
  const glitM=new THREE.MeshBasicMaterial({map:glitT,transparent:true,opacity:.62,blending:THREE.AdditiveBlending,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,fog:false});
  {const m=new THREE.Mesh(ribbon(W-.5,.022,9,0),glitM);m.renderOrder=2;m.layers.set(1);S.add(m);}
  // ---------- rainbow taffy arch over the start straight + the two fork landmarks ----------
  const RB=[0xff3a5a,0xff9a2a,0xffe03a,0x4adf6a,0x35b8ff,0xb06aff];
  const arch=(s,R,thick,cols,pillar=true)=>{const f=F(s,0),P=M(f.x,f.y,f.z,f.ang);cols.forEach((col,i)=>{const r=R-i*thick*1.9;glow(new THREE.TorusGeometry(r,thick,6,HIGH?28:18,Math.PI),C(col,2.1),M(0,0,0),P);});
   if(pillar)for(const sx of[-1,1]){const x=sx*(R-cols.length*thick*.9);put(new THREE.SphereGeometry(thick*3.2,10,6,0,6.283,0,Math.PI/2).scale(1,1.4,1),C(0xfff0f8),M(x,0,0),P);}};
  arch(42,OUT+1.4,.34,RB);
  // fork 1 = Sprinkle Pass: a gantry of confetti sprinkles; fork 2 = Gem Bridge: crystal pylons + a glowing gem arch
  {const SPR=[0xff5aa8,0x35f2ff,0xffd23a,0x7affb0,0xb07aff,0xffffff];const fa=500;
   arch(fa-14,OUT+.8,.22,[0xff5aa8,0xffd23a,0x35f2ff]);
   for(let i=0;i<(HIGH?70:36);i++){const s=fa-14+(rnd()-.5)*6,a=Math.PI*rnd(),R=OUT+.8-rnd()*1.6;const f=F(s,0),P=M(f.x,f.y,f.z,f.ang);
    glow(new THREE.CapsuleGeometry(.07,.3,2,4),C(SPR[i%6],2.4),M(Math.cos(a)*R,Math.sin(a)*R,(rnd()-.5)*.5,0,rnd()*3,rnd()*3),P);}}
  {const fb=1392,f0=F(fb-16,0),P=M(f0.x,f0.y,f0.z,f0.ang);
   for(const sx of[-1,1]){for(let k=0;k<4;k++){const g=new THREE.ConeGeometry(.9-k*.1,5.5+k*.9,6);put(g,C(k%2?0x7af0ff:0xff7ae8,1.6),M(sx*(OUT+1.2+k*.9),(5.5+k*.9)/2,k*.7-1,0,sx*.12,-sx*.22*k*.3),P);}}
   glow(new THREE.TorusGeometry(OUT+1.2,.3,6,HIGH?30:18,Math.PI),C(0x35f2ff,2.6),M(0,0,0),P);glow(new THREE.TorusGeometry(OUT+.3,.18,6,HIGH?30:18,Math.PI),C(0xff4fd8,2.6),M(0,0,0),P);
   for(let i=0;i<9;i++){const a=Math.PI*(i+.5)/9,R=OUT+.75;put(new THREE.OctahedronGeometry(.42,0),C([0x35f2ff,0xff4fd8,0xffd23a][i%3],2),M(Math.cos(a)*R,Math.sin(a)*R-.9,0,0,0,0,.8,1.5,.8),P);}}
  // Sprinkle Tunnel: rainbow sprinkles on the roof and a sign over each mouth
  {const [ta,tb]=this.tunnels[0];const SPR=[0xff5aa8,0x35f2ff,0xffd23a,0x7affb0,0xb07aff];const TH=c.TH,TOFF=c.TOFF;
   for(let s=ta+2;s<tb-1;s+=2.2){const f=F(s,0),P=M(f.x,f.y,f.z,f.ang);for(let k=0;k<(HIGH?4:2);k++){const x=(rnd()-.5)*2*(TOFF-.5),hy=TH-.2;glow(new THREE.CapsuleGeometry(.06,.34,2,4),C(SPR[(k+Math.floor(s))%5],2.6),M(x,hy,(rnd()-.5)*1.8,rnd()*6,Math.PI/2,0),P);}}
   for(const [e,dir] of[[ta,1],[tb,-1]]){sample(e,o);const sa=Math.atan2(o.tx*dir,o.tz*dir)+Math.PI;signs.push({raw:1,x:o.x,y:9.2,z:o.z,ang:sa,w:10,k:2});}}
  // roadside billboards (the shared sign mesh)
  for(const [s,k,d] of[[170,0,1],[610,3,-1],[770,1,1],[1160,4,1],[1330,6,-1],[1750,7,1]]){const f=F(s,d*(OUT+2.5));const P=M(f.x,0,f.z);put(new THREE.CylinderGeometry(.14,.14,6.2,5),0xffffff,M(0,3.1,0),P);
   put(new THREE.SphereGeometry(.35,6,5),0xff7ab8,M(0,6.3,0),P);signs.push({raw:1,x:f.x,y:7.4,z:f.z,ang:f.face,w:6,k});}
  // ---------- one lit mesh for every static landmark ----------
  S.add(Object.assign(new THREE.Mesh(merge(solid),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.05,side:THREE.DoubleSide})),{name:'candy'}));
  // ---------- drifting sugar sparkles around the hero (one additive Points object) ----------
  const NSP=HIGH?110:0;let sparkle=null,spos=null;
  if(NSP){spos=new Float32Array(NSP*3);const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(spos,3));
   for(let i=0;i<NSP;i++){spos[i*3]=CX+(rnd()-.5)*90;spos[i*3+1]=rnd()*22;spos[i*3+2]=CZ+(rnd()-.5)*90;}
   sparkle=new THREE.Points(sg,new THREE.PointsMaterial({size:.55,map:glowT,color:new THREE.Color(1.6,1.3,1.6),sizeAttenuation:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));sparkle.frustumCulled=false;sparkle.layers.set(1);S.add(sparkle);}
  // night lap: the frosting ground and the fog turn dusky plum (the world already dims the lights); gems and lollipops glow brighter
  let gnd=null;for(const ch of S.children)if(ch.isMesh&&ch.geometry.type==='PlaneGeometry'&&ch.material.isMeshStandardMaterial&&!ch.material.map)gnd=ch;
  const GD=new THREE.Color(this.pal.ground),GN=new THREE.Color(0x7a4a9a),FN=new THREE.Color(0x2a1048);let nite=0;
  return {update(dt,t,g){const nt=g&&g.night?1:0;nite+=(nt-nite)*Math.min(1,dt*1.2);gemMat.color.setScalar(1.6+.9*nite+.25*Math.sin(t*2.2));
   glitM.opacity=.5+.2*Math.sin(t*3.1)+.18*nite;lolli.material.emissiveIntensity=.35+.5*nite;if(gnd)gnd.material.color.copy(GD).lerp(GN,.78*nite);if(nite>.002)S.fog.color.lerp(FN,.65*nite);
   if(sparkle){sample(g?g.heroS:0,o);for(let i=0;i<NSP;i++){const q=i*3;let y=spos[q+1]-dt*(1.2+(i%5)*.3);if(y<0)y+=22;spos[q+1]=y;spos[q]+=Math.sin(t*.7+i)*dt*.6;
     if(spos[q]-o.x>45)spos[q]-=90;else if(spos[q]-o.x<-45)spos[q]+=90;if(spos[q+2]-o.z>45)spos[q+2]-=90;else if(spos[q+2]-o.z<-45)spos[q+2]+=90;}
    sparkle.geometry.attributes.position.needsUpdate=true;}
  }};}
};
