// Neon Sky City (M4 remake of the M1-M3 loop at ~1.2 km): rainy downtown, a lit tunnel under a building block,
// a short canal bridge with neon arches, the holo cat. Data + landmarks only (world.js builds the shared road kit).
export default {
 id:'sky',name:'Neon Sky City',music:'sky',pace:.995,seed:11,
 pts:[[0,130],[0,-55],[-15,-152],[0,-225],[-30,-310],[-100,-350],[-175,-330],[-215,-265],[-212,-190],[-252,-107],[-237,0],[-181,63],[-205,159],[-235,245],[-215,330],[-150,375],[-80,340],[-52,255],[-10,190]],
 elev:[[863,969,3.6,34]],                         // canal bridge
 tunnels:[[132,214,'building']],                  // tunnel under a building block (start straight)
 boost:[86,94,102,1252,1260,1268],ramps:[{s0:55,len:7,h:1.1},{s0:726,len:7,h:1.1},{s0:1397,len:7,h:1.1},{s0:1442,len:7,h:1.1}],puddles:{s0:1029,n:9,step:8},
 items:[244,497,750,833,1037,1241,1520,1639],                        // item-box rows (flat ground only)
 signals:[0.3,0.5,0.9],
 // kid-fair obstacle groups: s = metres along the lap, x = lateral (+ right); every group leaves a >= 5.5 m clear lane
 obstacles:[
   // M6B: 40-60% longer lap -> relocated out of the forks + new groups (lv = first level that has a mover: 0 Easy, 1 Medium, 2 Hard, 3 Extreme)
  {kind:'slidebar',s:254,x:-2.55,lv:2},{kind:'barrel',s:307,x:-3.3},{kind:'crate',s:368,x:3.2},{kind:'barrel',s:429,x:-3.2},
  {kind:'slidebar',s:490,x:-2.55,lv:0},{kind:'sweeper',s:552,x:-3},{kind:'drone',s:588,x:2.65,lv:1},{kind:'sweeper',s:624,x:3.2},
  {kind:'cones',s:660,x:-3.2},{kind:'crate',s:697,x:-3.3},{kind:'cones',s:781,x:3.1},{kind:'sign',s:807,x:-3.2},
  {kind:'fan',s:855,x:3.4},{kind:'drone',s:890,x:2.65,lv:0},{kind:'rollbot',s:925,x:-3},{kind:'rotor',s:954,x:-3.1,lv:3},
  {kind:'bollards',s:996,x:3.2},{kind:'barrier',s:1040,x:3.3},{kind:'goo',s:1240,x:-2.8},{kind:'swinggate',s:1275,x:3.35,lv:1},
  {kind:'drone',s:1328,x:-2.65,lv:2},{kind:'car',s:316,x:-3.5,len:40},{kind:'slidebar',s:1478,x:2.55,lv:0},{kind:'rotor',s:1535,x:-3.1,lv:3},
  {kind:'crane',s:1571,x:3.2},{kind:'barrel',s:1638,x:-3.3},{kind:'swinggate',s:1673,x:3.35,lv:1},{kind:'barrier',s:1703,x:3.3}],
 forks:[[1080,1230]],   // M6B: split sections (median island; risky branch = boost pads + hazards, safe branch = clear; sides swap per lap)
 crowd:[[-53,27,0],[235,299,0],[733,813,1],[1145,1215,-1],[1587,1647,0]],party:[-16,261,753,1212,1621],
 city:{sides:[-1,1],f0:4,f1:14,dp0:10,dpR:6,chunks:1},
 pal:{fog:0x6a3a78,fogD:.0048,env:[[0,'#1a0c34'],[.42,'#5a2a80'],[.5,'#ff8a7a'],[.56,'#3a2040'],[1,'#120a18']],neon:[0xff3fd8,0x35f2ff,0xffb060,0x8a6bff],
  bg:[[0,'#140a2c'],[.38,'#3c1a66'],[.6,'#a8407e'],[.75,'#e8787a'],[1,'#f0a888']],hemi:[0x9a80d0,0x281830,.6],key:[0xffa080,1.2,[-40,25,-90]],rim:[0x70d8ff,.7],
  edge:0x35f2ff,edge2:0xff4fd8,tunnel:[0xff4fd8,0x35f2ff,0xffd23a],tunnelLight:0xff6ad8,mirror:0xa098b8},
 build(c){const {THREE,S,V,C,merge,paintCol,sample,pointAt,L,W,WALK,TH,TOFF,conc,metal,emit,rnd,addBuilding,signs}=c;const o={};
  // building block over the tunnel (straight): one big lit block across the road, a lower wing each side
  {const [a,b]=this.tunnels[0];sample((a+b)/2,o);const ang=Math.atan2(o.tx,o.tz),len=b-a+4,wide=W+2*WALK+8;
   addBuilding(o.x,o.z,ang,len,wide,30,TH+.4,[1,.9,1]);for(const s of[-1,1])addBuilding(o.x-o.tz*s*(wide/2+7),o.z+o.tx*s*(wide/2+7),ang,len*.8,14,22+s*6,0);
   // big neon sign on the front face + pink edge lines up the corners
   sample(a-1.5,o);const fa=Math.atan2(o.tx,o.tz);signs.push({raw:1,x:o.x,y:TH+4.2,z:o.z,ang:fa+Math.PI,w:10,k:1});
   for(const e of[a-2,b+2])for(const s of[-1,1]){sample(e,o);const g=new THREE.BoxGeometry(.18,30,.18);g.translate(o.x-o.tz*s*(wide/2),TH+.4+15,o.z+o.tx*s*(wide/2));emit.push(paintCol(g,C(s>0?0xff4fd8:0x35f2ff,2.4)));}}
  // canal under the bridge: dark water band across the loop with glowing banks
  const [b0,b1]=this.elev[0];sample((b0+b1)/2,o);const ca=Math.atan2(o.tx,o.tz),cx=o.x,cz=o.z;
  {const water=new THREE.Mesh(new THREE.PlaneGeometry(26,240).rotateX(-Math.PI/2).rotateY(ca+Math.PI/2),new THREE.MeshStandardMaterial({color:0x0a1830,roughness:.08,metalness:.7,transparent:true,opacity:.75,envMapIntensity:1.6,depthWrite:false}));
   water.position.set(cx,.004,cz);water.renderOrder=2;S.add(water);
   for(const s of[-1,1]){const gg=new THREE.BoxGeometry(.25,.1,240).rotateY(ca+Math.PI/2).translate(cx+o.tx*s*13,.06,cz+o.tz*s*13);emit.push(paintCol(gg,C(0x35f2ff,1.8)));}}
  // neon arch trusses over the bridge plateau (both sides), lights along the arch
  {const n=24,a0=b0+30,a1=b1-30;for(const s of[-1,1]){const pts=[];for(let i=0;i<=n;i++){const t=i/n,ss=a0+(a1-a0)*t;sample(ss,o);const off=s*(W/2+.6);pts.push(V(o.x-o.tz*off,o.y+.2+Math.sin(t*Math.PI)*7,o.z+o.tx*off));}
    for(let i=0;i<n;i++){const p=pts[i],q=pts[i+1],d=q.clone().sub(p),g=new THREE.CylinderGeometry(.13,.13,d.length(),6);g.translate(0,d.length()/2,0);g.applyMatrix4(new THREE.Matrix4().lookAt(d,V(0,0,0),V(0,1,0)).multiply(new THREE.Matrix4().makeRotationX(Math.PI/2)));g.translate(p.x,p.y,p.z);metal.push(g);
     if(i%2===0)emit.push(paintCol(new THREE.SphereGeometry(.16,8,6).translate(p.x,p.y+.15,p.z),C(i%4?0xff4fd8:0xffd23a,3)));
    }}}
  // holo cat over the start straight (after the tunnel)
  {const holo=c.tex(c.cv(256,256,(g)=>{g.scale(2,2);g.strokeStyle='#5ff4ff';g.fillStyle='rgba(95,244,255,.25)';g.lineWidth=4;g.beginPath();g.arc(64,70,34,0,7);g.fill();g.stroke();
    g.beginPath();g.moveTo(36,52);g.lineTo(40,18);g.lineTo(58,40);g.moveTo(92,52);g.lineTo(88,18);g.lineTo(70,40);g.stroke();g.fillStyle='#fff';g.beginPath();g.arc(52,66,5,0,7);g.arc(76,66,5,0,7);g.fill();
    g.beginPath();g.arc(64,80,8,.2,Math.PI-.2);g.stroke();g.beginPath();g.moveTo(98,80);g.quadraticCurveTo(118,60,112,36);g.stroke();for(let y=0;y<128;y+=4){g.fillStyle='rgba(0,0,0,.3)';g.fillRect(0,y,128,1.5);}}),true,false);
   const cat=new THREE.Sprite(new THREE.SpriteMaterial({map:holo,blending:THREE.AdditiveBlending,depthWrite:false,color:new THREE.Color(1.4,1.4,1.4)}));cat.scale.set(7,7,1);
   sample(244,o);cat.position.set(o.x+o.tz*4,11,o.z-o.tx*4);cat.layers.set(1);S.add(cat);
   return {update(dt,t){cat.position.y=11+Math.sin(t*1.3)*.4;cat.material.opacity=.85+.15*Math.sin(t*7);}};}}
};
