// Sunny Shores Boardwalk (M5b, Track 4): a golden-hour beach loop. Start on packed sand (beach balls, a foam wave, dune hop),
// climb a wide ramp onto a lit boardwalk past a neon Ferris wheel, an arcade, a spinning carousel and a coaster ring you drive under,
// drop back to the sand through a funhouse tunnel. Dusk fireworks on the last lap, gulls overhead. Original shapes and names only.
// Data + landmarks only (world.js builds the road / bridge / tunnel kit). Landmarks: one lit "solid" mesh, a few glowing/spinning parts.
export default {
 id:'beach',name:'Sunny Shores Boardwalk',music:'beach',pace:.99,seed:53,
 pts:[[0,120],[0,-70],[25,-150],[100,-205],[190,-200],[255,-150],[270,-70],[235,10],[260,90],[220,165],[130,195],[50,190]],
 elev:[[250,830,3.8,55,55]],                       // the boardwalk plateau; the 55 m slopes are the big ramp up and the gentle drop down
 tunnels:[[925,990,'arcade']],                     // funhouse tunnel on the sand
 boost:[100,108,116],ramps:[{s0:70,len:7,h:1.1},{s0:225,len:7,h:1.1},{s0:470,len:7,h:1.1},{s0:720,len:7,h:1.1},{s0:1110,len:7,h:1.1}],puddles:{s0:1005,n:5,step:9},
 items:[345,580,880,1038],
 // kid-fair groups: every one leaves a >= 5 m clear lane; waves are the only movers on the sand
 obstacles:[
  {kind:'ball',s:135,x:3.2},{kind:'wave',s:160,x:-2.9},{kind:'umbrella',s:300,x:3.2},{kind:'board',s:385,x:-3.2},
  {kind:'crate',s:525,x:-3.3},{kind:'bumper',s:640,x:3.2},{kind:'castle',s:835,x:-3.3}],
 crowd:[[-46,34,0],[330,380,-1],[600,650,-1],[860,910,0]],party:[-14,360,600,890],
 walk:2.5,mirror:false,mirrorY:-.6,far:false,rain:false,lampSides:[-1,1],
 pal:{fog:0xffb48e,fogD:.0042,env:[[0,'#2a2870'],[.42,'#ff9a7a'],[.5,'#ffd8a0'],[.56,'#4a9ab0'],[1,'#1a4058']],neon:[0xff4fd8,0x35f2ff,0xffd23a,0x7dff6a],
  bg:[[0,'#1c1858'],[.3,'#4a3490'],[.52,'#e0607e'],[.68,'#ff9a6a'],[.82,'#ffc890'],[1,'#ffe0b0']],hemi:[0xffd0b0,0xc89868,.95],key:[0xffb070,1.5,[-70,28,-90]],rim:[0x9adcff,.55],
  edge:0xffd23a,edge2:0xff4fd8,tunnel:[0xff4fd8,0xffd23a,0x35f2ff,0x7dff6a],tunnelLight:0xffa060,mirror:0xa0c8d8,ground:0x0c88b8,groundRough:.5,
  asphalt:'#fff2d8',dry:1,conc:'#e8d2a8',metal:0xd8d8e8,lamp:0xffe2b8,pool:0xffb070,puddle:0x2ad0e8,moon:[-70,24,-330],top:0xffc890,bloom:.3,
  words:[['PIER GLOW','#ff4fd8'],['ARCADE','#35f2ff'],['ICE CREAM','#ff7ad8'],['SURF SHOP','#35f2ff'],['TACOS','#ffd23a'],['LEMONADE','#7dff6a'],['FUN RIDES','#ff8a2a'],['SNACKS','#ffd23a']]},
 build(c){const {THREE,S,V,C,merge,paintCol,sample,ribbon,ranges,minDistToTrack,L,W,WALK,CURB,conc,emit,rnd,signs,cv,tex,glowT,yAt,HIGH,CX,CZ,wrap}=c;const o={},solid=[];
  const OUT=W/2+.35+WALK;
  const M=(x,y,z,ry=0,rx=0,rz=0,sx=1,sy=sx,sz=sx)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz,'YXZ')),new THREE.Vector3(sx,sy,sz));
  const put=(g,col,m,P,out=solid)=>{g=g.index?g.toNonIndexed():g.clone();if(m)g.applyMatrix4(m);if(P)g.applyMatrix4(P);out.push(col==null?g:paintCol(g,col instanceof THREE.Color?col:C(col)));return g;};
  const glow=(g,col,m,P)=>put(g,col,m,P,emit);
  const F=(s,d)=>{sample(s,o);return {x:o.x-o.tz*d,z:o.z+o.tx*d,y:o.y,ang:Math.atan2(o.tx,o.tz),ry:Math.atan2(-o.tz,o.tx),tx:o.tx,tz:o.tz};};
  const sandR=ranges(s=>yAt(s)<.05&&!(s>915&&s<1000));   // open sand stretches
  const near=(s,list,r)=>list.some(a=>{let d=Math.abs(wrap(s)-a);d=Math.min(d,L-d);return d<r;});
  // ---------- shore: dry sand (inside the loop and out to the sea), a darker wet band and a foam line, as one lit mesh ----------
  {const wob=s=>5+4*Math.sin(s*.021)+2.5*Math.sin(s*.057+1);
   const poly=(extra,y,col)=>{const pts=[];for(let s=0;s<L;s+=3){sample(s,o);const off=OUT+extra+wob(s);pts.push(new THREE.Vector2(o.x+o.tz*off,-(o.z-o.tx*off)));}
    const g=new THREE.ShapeGeometry(new THREE.Shape(pts),1);g.rotateX(-Math.PI/2);g.translate(0,y,0);return paintCol(g,col);};
   const sandT=tex(cv(256,256,(g,w,h)=>{g.fillStyle='#fff';g.fillRect(0,0,w,h);for(let i=0;i<5200;i++){const v=205+rnd()*50|0;g.fillStyle=`rgb(${v},${v-6},${v-22})`;g.fillRect(rnd()*w,rnd()*h,1+rnd()*2,1+rnd()*2);}
     g.strokeStyle='rgba(150,110,60,.13)';g.lineWidth=2;for(let i=0;i<14;i++){g.beginPath();const y=rnd()*h;g.moveTo(0,y);for(let x=0;x<=w;x+=32)g.lineTo(x,y+Math.sin(x*.05+i)*5);g.stroke();}}),true,true);sandT.repeat.set(.045,.045);
   const m=new THREE.Mesh(merge([poly(18,-.34,C(0xe6fff6,1.5)),poly(9,-.07,C(0xb08a58)),poly(0,-.04,C(0xf0cc92))]),new THREE.MeshStandardMaterial({map:sandT,vertexColors:true,roughness:.92,metalness:0}));m.layers.set(1);S.add(m);}
  // ---------- boardwalk planks over the raised road ----------
  {const pl=cv(128,128,(g,w,h)=>{const tone=['#c89a62','#bd8f58','#d3a46a','#b98a52','#c99c64','#c0935a'];for(let i=0;i<6;i++){g.fillStyle=tone[i];g.fillRect(0,i*h/6,w,h/6);g.fillStyle='rgba(60,32,12,.55)';g.fillRect(0,i*h/6,w,3);
     g.fillStyle='rgba(60,32,12,.18)';for(let k=0;k<6;k++)g.fillRect(rnd()*w,i*h/6+4+rnd()*14,10+rnd()*30,1);}});
   const [a,b]=this.elev[0];const m=new THREE.Mesh(ribbon(W-.1,.012,3,0,a,b),new THREE.MeshStandardMaterial({map:tex(pl),roughness:.7,metalness:0,polygonOffset:true,polygonOffsetFactor:-1}));m.layers.set(1);S.add(m);}
  // ---------- props on the sand: palms inside the loop, umbrellas + towels toward the sea, lifeguard towers ----------
  const palm=(x,z,h,lean,ry)=>{const P=M(x,0,z,ry),pts=[];for(let i=0;i<=5;i++){const t=i/5;pts.push(new THREE.Vector3(Math.sin(lean)*h*t*t*1.1,h*t,0));}
   const cur=new THREE.CatmullRomCurve3(pts);put(new THREE.TubeGeometry(cur,6,.3,5),0x8a6440,null,P);const top=cur.getPoint(1),nf=HIGH?7:5;
   for(let k=0;k<nf;k++){const g=new THREE.PlaneGeometry(1.2,4.4,1,5),pp=g.attributes.position;for(let i=0;i<pp.count;i++){const v=pp.getY(i)+2.2;pp.setZ(i,-v*v*.09);pp.setX(i,pp.getX(i)*(1-Math.abs(v-2)/2.6));}
    g.translate(0,2.2,0);put(g,k%2?0x2fa04a:0x44c866,M(top.x,top.y,top.z,k/nf*6.28,-1.05+((k%3)-1)*.25,0),P);}
   put(new THREE.SphereGeometry(.22,6,4),0x5a3a1a,M(top.x,top.y-.3,top.z),P);};
  const umbrella=(x,z,c1,tilt,ry)=>{const P=M(x,0,z,ry,0,tilt);put(new THREE.CylinderGeometry(.06,.06,3.4,5),0xf4f4f4,M(0,1.7,0),P);
   const g=new THREE.ConeGeometry(2.2,.9,10,1,true).toNonIndexed(),p=g.attributes.position,cc=new Float32Array(p.count*3);
   for(let i=0;i<p.count;i+=3){const a=Math.atan2(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2),p.getX(i)+p.getX(i+1)+p.getX(i+2)),k=C(Math.floor((a+Math.PI)/(Math.PI/5))%2?c1:0xffffff,1.2);for(let j=0;j<3;j++){cc[(i+j)*3]=k.r;cc[(i+j)*3+1]=k.g;cc[(i+j)*3+2]=k.b;}}
   g.setAttribute('color',new THREE.BufferAttribute(cc,3));put(g,null,M(0,3.5,0),P);
   for(let i=0;i<4;i++)put(new THREE.BoxGeometry(1.2,.03,.4),i%2?0xffffff:c1,M(.9,.03,-.6+i*.4,.3),P);};
  const lifeguard=(x,z,ry)=>{const P=M(x,0,z,ry);for(const a of[-1,1])for(const b of[-1,1])put(new THREE.BoxGeometry(.2,3.4,.2),0xf4f4f4,M(a*1.1,1.7,b*1.1,0,b*.06,-a*.06),P);
   put(new THREE.BoxGeometry(2.8,.18,2.8),0xffffff,M(0,3.4,0),P);put(new THREE.BoxGeometry(2.2,1.6,2.2),0xff3a3a,M(0,4.3,0),P);put(new THREE.BoxGeometry(2.24,.4,2.24),0xffffff,M(0,4.0,0),P);
   put(new THREE.ConeGeometry(2.1,1,4),0xffffff,M(0,5.6,0,Math.PI/4),P);glow(new THREE.BoxGeometry(1.6,.5,.02),C(0x9ff6ff,1.2),M(0,4.6,-1.12),P);put(new THREE.BoxGeometry(.9,.1,3.8),0xffffff,M(0,1.6,2.6,0,.95),P);};
  const ATT=[410,505,555,610];   // attraction positions along the boardwalk (props keep clear of them)
  for(const [a,b] of sandR)for(let s=a+14;s<b-10;s+=HIGH?30:48){const j=rnd();
   {const f=F(s+j*8,OUT+7+rnd()*8);if(minDistToTrack(f.x,f.z)>OUT+4)palm(f.x,f.z,7+rnd()*3,.15+rnd()*.25,rnd()*6.28);}
   if(rnd()<.55){const f=F(s+14,-(OUT+6+rnd()*5));if(minDistToTrack(f.x,f.z)>OUT+4)umbrella(f.x,f.z,[0xff4f7a,0x35b8ff,0xffc21a,0x7dd84a,0xa060ff][Math.floor(rnd()*5)],.1+rnd()*.15,rnd()*6.28);}}
  {const f1=F(55,-(OUT+13)),f2=F(880,-(OUT+13));lifeguard(f1.x,f1.z,f1.ry+Math.PI/2);lifeguard(f2.x,f2.z,f2.ry+Math.PI/2);}
  // ---------- attractions inside the loop (boardwalk side), all facing the road ----------
  // Ferris wheel: static legs + a spinning wheel (one mesh) + hanging gondolas (one instanced mesh, kept upright)
  const fw=F(410,52),FR=16,FCY=FR+3.2;let wheel,gond;const NG=HIGH?16:12,gcol=new THREE.Color(),gM=new THREE.Matrix4(),gQ=new THREE.Quaternion(),gV=new THREE.Vector3(),gS=new THREE.Vector3(1,1,1);
  {const P=M(fw.x,0,fw.z,fw.ry);for(const dz of[-2.8,2.8])for(const sx of[-1,1]){const len=Math.hypot(6.5,FCY);put(new THREE.BoxGeometry(.7,len,.7),0xf4f0ff,M(sx*3.2,FCY/2,dz,0,0,-sx*Math.atan2(6.5,FCY)),P);}
   put(new THREE.BoxGeometry(15,.6,9),0x3a1a6a,M(0,.3,0),P);put(new THREE.CylinderGeometry(1.1,1.1,5,12).rotateX(Math.PI/2),0xff3fd8,M(0,FCY,0),P);glow(new THREE.CylinderGeometry(.7,.7,5.1,10).rotateX(Math.PI/2),C(0xfff27a,2.4),M(0,FCY,0),P);
   const wg=[],wc=(g,col,m)=>{g=g.index?g.toNonIndexed():g.clone();if(m)g.applyMatrix4(m);wg.push(paintCol(g,col instanceof THREE.Color?col:C(col)));};
   for(const dz of[-1.3,1.3]){wc(new THREE.TorusGeometry(FR,.3,5,HIGH?48:30),0xf6f6ff,M(0,0,dz));wc(new THREE.TorusGeometry(FR*.5,.18,4,HIGH?32:20),0xf6f6ff,M(0,0,dz));
    for(let i=0;i<10;i++){const a=i/10*Math.PI*2;wc(new THREE.BoxGeometry(FR,.14,.14),0xffffff,M(Math.cos(a)*FR/2,Math.sin(a)*FR/2,dz,0,0,a));}
    const nb=HIGH?48:24;for(let i=0;i<nb;i++){const a=i/nb*Math.PI*2;wc(new THREE.SphereGeometry(.2,5,4),C([0xff3fd8,0x35f2ff,0xfff27a,0x8aff6a][i%4],3.2),M(Math.cos(a)*(FR+.4),Math.sin(a)*(FR+.4),dz));}}
   wc(new THREE.CylinderGeometry(.3,.3,2.6,5).rotateX(Math.PI/2),0xffffff,null);
   wheel=new THREE.Mesh(merge(wg),new THREE.MeshBasicMaterial({vertexColors:true}));wheel.position.set(fw.x,FCY,fw.z);wheel.rotation.order='YXZ';wheel.rotation.y=fw.ry;wheel.layers.set(1);S.add(wheel);
   const gg=merge([paintCol(new THREE.BoxGeometry(1.9,1.2,1.9).translate(0,-.9,0),C(0xffffff)),paintCol(new THREE.SphereGeometry(1.1,10,5,0,6.283,0,1.2).scale(1,.55,1).translate(0,-.1,0),C(0xfff0f8)),paintCol(new THREE.BoxGeometry(.08,1.1,.08).translate(0,.5,0),C(0xffffff))]);
   gond=new THREE.InstancedMesh(gg,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.35,metalness:.2,emissive:0x331122,emissiveIntensity:.5}),NG);gond.frustumCulled=false;gond.layers.set(1);
   const gc=[0xff4f7a,0x35b8ff,0xffc21a,0x7aff3a,0xa060ff,0xff8a2a];for(let i=0;i<NG;i++)gond.setColorAt(i,gcol.setHex(gc[i%6]));S.add(gond);}
  // arcade: a big lit hall facing the road, neon trim, a roof of bulbs, a PIER GLOW sign
  {const f=F(505,27),P=M(f.x,0,f.z,f.ang);put(new THREE.BoxGeometry(12,13,26),0x4a2288,M(0,6.5,0),P);put(new THREE.BoxGeometry(13,1.2,27),0x2a1050,M(0,13.5,0),P);
   for(const z of[-12.8,-6.4,0,6.4,12.8]){put(new THREE.BoxGeometry(1.2,12,1.2),0x6a3ab8,M(-6.2,6,z),P);glow(new THREE.BoxGeometry(.2,11.6,.2),C(0x35f2ff,2.6),M(-6.9,6,z),P);}
   for(const z of[-8,8])glow(new THREE.BoxGeometry(.2,4.4,7),C(z<0?0xff3fd8:0xfff27a,2.2),M(-6.1,4.4,z),P);
   glow(new THREE.TorusGeometry(3.4,.18,5,18,Math.PI),C(0xff3fd8,3),M(-6.1,2.6,0,Math.PI/2),P);
   const nb=HIGH?36:18;for(let i=0;i<nb;i++){const t=i/(nb-1);glow(new THREE.SphereGeometry(.2,5,4),C(i%2?0xfff27a:0xffffff,3.2),M(-6.4,14.3,-12+24*t),P);glow(new THREE.SphereGeometry(.18,5,4),C(i%2?0xffffff:0xfff27a,3.2),M(-6.4,8.4,-12+24*t),P);}
   sample(505,o);const sa=Math.atan2(o.tz,-o.tx),sx=f.x+o.tz*6.9,sz=f.z-o.tx*6.9;signs.push({raw:1,x:sx,y:11,z:sz,ang:sa,w:13,k:0},{raw:1,x:sx,y:5.2,z:sz,ang:sa,w:8,k:1});}
  // carousel: static base + a spinning top (one mesh) with sea-horses and dolphins
  let spin,spinA=0;{const f=F(610,38);spinA=f.ang;const P=M(f.x,0,f.z,f.ang);put(new THREE.CylinderGeometry(8.2,8.6,.9,24),0xfff0f6,M(0,.45,0),P);put(new THREE.CylinderGeometry(8.25,8.25,.3,24),0xffc83a,M(0,.95,0),P);
   const nb=HIGH?24:12;for(let i=0;i<nb;i++){const a=i/nb*6.283;glow(new THREE.SphereGeometry(.15,5,4),C([0xfff27a,0xff8ad8][i%2],3.2),M(Math.cos(a)*9.5,7.2,Math.sin(a)*9.5),P);}
   const sg=[],sc=(g,col,m)=>{g=g.index?g.toNonIndexed():g.clone();if(m)g.applyMatrix4(m);sg.push(paintCol(g,col instanceof THREE.Color?col:C(col)));};
   sc(new THREE.CylinderGeometry(1.4,1.4,6,12),0xffd56a,M(0,4,0));sc(new THREE.CylinderGeometry(1.5,1.5,4,12),0xff6aa8,M(0,4,0));
   const can=new THREE.ConeGeometry(9.4,3.6,HIGH?24:14,1,true).toNonIndexed(),cp=can.attributes.position,cc=new Float32Array(cp.count*3);for(let i=0;i<cp.count;i+=3){const a=Math.atan2(cp.getZ(i)+cp.getZ(i+1)+cp.getZ(i+2),cp.getX(i)+cp.getX(i+1)+cp.getX(i+2)),k=C(Math.floor((a+Math.PI)/(Math.PI/12))%2?0xff4f9a:0xfff4fa,1.2);for(let j=0;j<3;j++){cc[(i+j)*3]=k.r;cc[(i+j)*3+1]=k.g;cc[(i+j)*3+2]=k.b;}}
   can.setAttribute('color',new THREE.BufferAttribute(cc,3));sg.push(can.applyMatrix4(M(0,9.3,0)));
   sc(new THREE.CylinderGeometry(9.4,9.4,1.1,HIGH?24:14,1,true),0x35b8ff,M(0,7,0));sc(new THREE.SphereGeometry(.6,8,6),0xffc83a,M(0,11.4,0));
   const ac=[0x8ae8ff,0xffa8d8,0xfff08a,0xa8ffb0,0xd0a8ff,0xffc08a];
   for(let i=0;i<8;i++){const a=i/8*6.283,x=Math.cos(a)*6,z=Math.sin(a)*6,y=2.6+(i%2)*.7,m=M(x,0,z,-a);sc(new THREE.CylinderGeometry(.07,.07,6,4),0xffd56a,M(0,4,0),null);sg[sg.length-1].applyMatrix4(m);
    const body=new THREE.SphereGeometry(.55,8,6);body.scale(.8,1.1,1.5);sc(body,ac[i%6],M(0,y,0).premultiply(m));sc(new THREE.SphereGeometry(.34,8,6),ac[i%6],M(.15,y+.8,.3).premultiply(m));sc(new THREE.BoxGeometry(.6,.1,.7),0xff3a6a,M(0,y+.55,0).premultiply(m));}
   spin=new THREE.Mesh(merge(sg),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.4,metalness:.2,side:THREE.DoubleSide}));spin.position.set(f.x,0,f.z);spin.rotation.y=f.ang;spin.layers.set(1);S.add(spin);}
  // coaster ring over the boardwalk: a big hoop you drive under, a little train always looping round it
  let train;{const f=F(555,0),R=11,cy=f.y+6+R,P=M(f.x,0,f.z,f.ang);const ringP=M(f.x,cy,f.z,f.ang);
   for(const dz of[-.7,.7])put(new THREE.TorusGeometry(R,.28,5,HIGH?44:28),0xff2d6a,M(0,0,dz),ringP);
   const nr=HIGH?36:20;for(let i=0;i<nr;i++){const a=i/nr*Math.PI*2;put(new THREE.BoxGeometry(.1,.1,1.4),0xffffff,M(Math.cos(a)*R,Math.sin(a)*R,0,0,0,a),ringP);glow(new THREE.SphereGeometry(.17,5,4),C([0xfff27a,0x35f2ff,0xff3fd8][i%3],3.2),M(Math.cos(a)*(R+.4),Math.sin(a)*(R+.4),0),ringP);}
   for(const sx of[-1,1]){put(new THREE.CylinderGeometry(.4,.55,cy,8),0x35b8ff,M(sx*(R+.1),cy/2,0),P);put(new THREE.BoxGeometry(2,.4,2),0xeeeeee,M(sx*(R+.1),.2,0),P);}
   put(new THREE.BoxGeometry(1.4,.5,.5),0xeeeeee,M(0,cy-R-.1,0),ringP);
   const tg=[];[0xffd21a,0xff3fd8,0x35f2ff,0x7aff3a].forEach((col,k)=>{tg.push(paintCol(new THREE.BoxGeometry(1.5,.8,1.4).translate(-2.6+k*1.75,-R+.75,0),C(col)));tg.push(paintCol(new THREE.SphereGeometry(.3,6,4).translate(-2.6+k*1.75,-R+1.35,0),C(0xffffff,2.4)));});
   train=new THREE.Mesh(merge(tg),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.35,metalness:.25,emissive:0x221122,emissiveIntensity:.6}));train.position.set(f.x,cy,f.z);train.rotation.order='YXZ';train.rotation.y=f.ang;train.layers.set(1);S.add(train);}
  // funhouse tunnel mouths: big sign above each portal
  for(const [e,k,dir] of[[925,6,1],[990,6,-1]]){sample(e,o);const sa=Math.atan2(o.tx*dir,o.tz*dir)+Math.PI;signs.push({raw:1,x:o.x,y:9.2,z:o.z,ang:sa,w:10,k});}
  // a few beach-ball bunting lights along the shore lamps are the world's lamps; here: bunting flags over the start straight
  {const nfl=HIGH?18:10;for(let i=0;i<nfl;i++){const t=i/(nfl-1);sample(-2,o);const x=o.x-o.tz*(-W/2-1+t*(W+2)),z=o.z+o.tx*(-W/2-1+t*(W+2)),y=9.3-Math.sin(t*Math.PI)*1.3;glow(new THREE.ConeGeometry(.3,.6,3).rotateX(Math.PI),C([0xff4f7a,0xffd21a,0x35b8ff,0x7dd84a][i%4],1.6),M(x,y,z));}}
  // ---------- gulls (instanced, circling over the sea) ----------
  const NGL=HIGH?8:4;const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute([0,0,.3,-1.2,.25,-.2,0,0,-.3, 0,0,.3,0,0,-.3,1.2,.25,-.2],3));wg.setAttribute('uv',new THREE.Float32BufferAttribute(new Array(12).fill(0),2));wg.setAttribute('normal',new THREE.Float32BufferAttribute([0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0],3));
  const gulls=new THREE.InstancedMesh(wg,new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,fog:false}),NGL);gulls.frustumCulled=false;gulls.layers.set(1);S.add(gulls);
  const gl=[];for(let i=0;i<NGL;i++){const f=F(wrap(rnd()*L),-(OUT+50+rnd()*60));gl.push({x:f.x,z:f.z,r:14+rnd()*18,y:16+rnd()*18,w:(.35+rnd()*.3)*(rnd()<.5?-1:1),a:rnd()*6.28,ph:rnd()*6});}
  // ---------- dusk fireworks over the sea (last lap + the finish): one additive Points object, bursts are re-seeded when they end ----------
  const NB=HIGH?6:3,NP=HIGH?36:22,fpos=new Float32Array(NB*NP*3),fcol=new Float32Array(NB*NP*3),fg=new THREE.BufferGeometry();
  fg.setAttribute('position',new THREE.BufferAttribute(fpos,3));fg.setAttribute('color',new THREE.BufferAttribute(fcol,3));
  const fw2=new THREE.Points(fg,new THREE.PointsMaterial({size:2.4,map:glowT,sizeAttenuation:true,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));fw2.frustumCulled=false;fw2.layers.set(1);S.add(fw2);
  const bursts=[];for(let i=0;i<NB;i++)bursts.push({t:-i*.9-1,x:0,y:0,z:0,col:new THREE.Color(),dirs:[]});
  const seed=b=>{const f=F(wrap(rnd()*L),-(OUT+55+rnd()*70));b.x=f.x;b.z=f.z;b.y=38+rnd()*30;b.t=0;b.col.setHSL(rnd(),.9,.62).multiplyScalar(2.2);b.dirs=[];for(let k=0;k<NP;k++){const u=rnd()*2-1,a=rnd()*6.283,r=Math.sqrt(1-u*u),sp=11+rnd()*5;b.dirs.push([r*Math.cos(a)*sp,u*sp,r*Math.sin(a)*sp]);}};
  // ---------- merge the lit landmark parts ----------
  S.add(Object.assign(new THREE.Mesh(merge(solid),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.12,side:THREE.DoubleSide})),{name:'beach'}));
  return {update(dt,t,g){
   wheel.rotation.z=-t*.16;for(let i=0;i<NG;i++){const a=-t*.16+i/NG*6.283,lx=Math.cos(a)*FR,ly=Math.sin(a)*FR;gQ.setFromAxisAngle(gS.set(0,1,0),fw.ry);gS.set(1,1,1);gV.set(fw.x+lx*Math.cos(fw.ry),FCY+ly-.9,fw.z-lx*Math.sin(fw.ry));gM.compose(gV,gQ,gS);gond.setMatrixAt(i,gM);}gond.instanceMatrix.needsUpdate=true;
   spin.rotation.y=spinA+t*.55;
   train.rotation.z=t*1.1;
   for(let i=0;i<NGL;i++){const b=gl[i];b.a+=dt*b.w;gV.set(b.x+Math.cos(b.a)*b.r,b.y+Math.sin(t*.8+b.ph)*1.2,b.z+Math.sin(b.a)*b.r);gQ.setFromEuler(new THREE.Euler(0,-b.a+(b.w>0?0:Math.PI),Math.sin(t*5+b.ph)*.25,'YXZ'));gS.set(1,.6+.5*Math.sin(t*9+b.ph),1);gM.compose(gV,gQ,gS);gulls.setMatrixAt(i,gM);}gulls.instanceMatrix.needsUpdate=true;gS.set(1,1,1);
   const on=g&&(g.lap>=3||g.mode==='finish');fw2.visible=!!on;
   if(on){for(let i=0;i<NB;i++){const b=bursts[i];b.t+=dt;if(b.t<0)continue;if(b.dirs.length===0||b.t>2.4)seed(b);
     const k=b.t,fade=Math.max(0,1-k/2.4);for(let j=0;j<NP;j++){const d=b.dirs[j],q=(i*NP+j)*3,dr=1-Math.exp(-k*1.6);fpos[q]=b.x+d[0]*dr*.9;fpos[q+1]=b.y+d[1]*dr*.9-3.5*k*k;fpos[q+2]=b.z+d[2]*dr*.9;fcol[q]=b.col.r*fade;fcol[q+1]=b.col.g*fade;fcol[q+2]=b.col.b*fade;}}
    fg.attributes.position.needsUpdate=true;fg.attributes.color.needsUpdate=true;}
  }};}
};
