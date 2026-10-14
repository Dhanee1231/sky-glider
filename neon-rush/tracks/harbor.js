// Glowtide Harbor (M4): seaside loop. Sea all around the outside (right), a little harbor town inside (left).
// Wooden boardwalk with lantern strings, neon Ferris wheel on a pier, lighthouse with a sweeping beam, bobbing lantern boats,
// a drawbridge over the inner basin, and a covered boathouse tunnel.
import {palMesh,setSlotM} from '../b_pal.js';
export default {
 id:'harbor',name:'Glowtide Harbor',music:'harbor',pace:.999,seed:23,
 pts:[[0,180],[0,-108],[-22,-204],[-90,-252],[-168,-234],[-206,-162],[-198,-72],[-228,12],[-222,108],[-180,192],[-108,246],[-36,240]],
 elev:[[995,1115,4.5,40]],                        // drawbridge over the basin
 tunnels:[[822,900,'boathouse']],
 boost:[80,88,96],ramp:{s0:300,len:7,h:1.1},puddles:{s0:640,n:8,step:9},
 items:[230,470,770,1215],
 obstacles:[
  {kind:'buoy',s:150,x:3.2},{kind:'trap',s:262,x:-3.3},{kind:'cones',s:345,x:3.0},{kind:'net',s:420,x:3.2},
  {kind:'sweeper',s:525,x:-3},{kind:'barrel',s:590,x:3.3},{kind:'goo',s:735,x:-2.8},{kind:'bollards',s:935,x:-3.2},
  {kind:'car',s:1125,x:3.5,len:75},{kind:'buoy',s:1192,x:-3.2}],
 crowd:[[-46,34,0],[190,250,1],[480,540,-1],[940,985,0],[1150,1185,-1]],party:[-14,220,505,962,1160],
 city:{sides:[-1],f0:2,f1:7,dp0:9,dpR:5,gap:.4},lampSides:[-1],
 mirrorY:-.6,walk:4.5,far:{n:60,h0:12,h1:46,y0:-.6},
 pal:{fog:0x2a4a6a,fogD:.0095,env:[[0,'#0a1a3a'],[.42,'#1f5a8a'],[.5,'#ff8ab8'],[.56,'#203050'],[1,'#081020']],neon:[0xff4fd8,0x35f2ff,0xffc26a,0x7affc8],
  bg:[[0,'#06142e'],[.36,'#123a66'],[.55,'#2fa3c0'],[.66,'#ff8ab8'],[.8,'#ffb88a'],[1,'#ffd0a0']],hemi:[0x80a8e0,0x182838,.62],key:[0xffb090,1.1,[60,30,-120]],rim:[0x80e8ff,.75],
  edge:0xffd23a,edge2:0x35f2ff,tunnel:[0xffc26a,0xff7ab8],tunnelLight:0xffb060,mirror:0x6a9ac8,ground:0x0a2238,groundRough:.18,
  facade:'#9a8a90',tints:[[1,.95,.9],[.9,1,1],[1,.9,.95],[.95,.95,1],[1,1,.9]],farTint:0x4070a0,pool:0xffb070,lamp:0xffd8a0,
  words:[['FISH & CHIPS','#ffb03a'],['ICE CREAM','#ff7ad8'],['SURF SHOP','#35f2ff'],['BOATS','#7affc8'],['TAFFY','#ff7ab8'],['CAFE','#ffd23a'],['HOTEL','#35f2ff'],['ARCADE','#b07aff']]},
 build(c){const {THREE,S,V,C,merge,paintCol,sample,pointAt,ribbon,wall,ranges,inTunnel,L,W,WALK,CURB,TH,TOFF,conc,metal,emit,rnd,signs,lampPos,cv,tex,glowT,yAt}=c;const o={},pv=new THREE.Vector3();
  const SEA=this.mirrorY,OUT=W/2+.35+WALK;const solid=[];   // vertex-coloured lit landmark parts -> one mesh
  const flatOpen=ranges(s=>yAt(s)<.05&&!inTunnel(s,1));
  // land: the town inside the loop (opaque paving over the sea mirror), with a basin carved under the drawbridge
  {const [b0,b1]=this.elev[0];const basin=s=>{const m=(b0+b1)/2,h=(b1-b0)/2+30,d=Math.abs(s-m);return d>h?0:42*Math.pow(Math.cos(d/h*Math.PI/2),2);};
   const pts=[],edge=[];for(let s=0;s<L;s+=3){sample(s,o);const off=OUT-.2+basin(s);const x=o.x+o.tz*off,z=o.z-o.tx*off;pts.push(new THREE.Vector2(x,-z));edge.push(V(x,0,z));}
   const g=new THREE.ShapeGeometry(new THREE.Shape(pts),1);g.rotateX(-Math.PI/2);
   const land=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x1c1824,roughness:.75,metalness:.05}));land.position.y=.02;land.layers.set(1);S.add(land);
   // stone quay edge all round the land + a glowing rope light along the basin
   const qw=new THREE.BufferGeometry(),qp=[],qu=[],qi=[];edge.forEach((p,i)=>{qp.push(p.x,SEA-.2,p.z,p.x,.03,p.z);qu.push(i,0,i,.3);if(i<edge.length-1){const a=i*2;qi.push(a,a+2,a+1,a+1,a+2,a+3);}});
   const n=edge.length*2;qi.push(n-2,0,n-1,n-1,0,1);qw.setAttribute('position',new THREE.Float32BufferAttribute(qp,3));qw.setAttribute('uv',new THREE.Float32BufferAttribute(qu,2));qw.setIndex(qi);qw.computeVertexNormals();conc.push(qw);}
  // seawall under the boardwalk (sea side) + under the walkway on the town side where the land is carved away
  for(const [a,b] of flatOpen)conc.push(wall(OUT,SEA-.2,CURB,2,a,b));
  // wooden boardwalk planks over the sea-side walkway
  {const pc=cv(256,256,(g)=>{g.fillStyle='#7a5238';g.fillRect(0,0,256,256);for(let y=0;y<256;y+=16){const v=rnd();g.fillStyle=`rgb(${110+v*30|0},${72+v*20|0},${48+v*14|0})`;g.fillRect(0,y+1,256,14);g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,y,256,2);
     for(let k=0;k<3;k++){g.fillStyle='rgba(40,20,10,.5)';g.fillRect(rnd()*256,y+4+rnd()*8,30+rnd()*40,1);}g.fillStyle='rgba(30,20,10,.8)';const sx=(y*7)%256;g.fillRect(sx,y+2,2,12);}});
   const pl=new THREE.Mesh(merge(flatOpen.map(([a,b])=>ribbon(WALK,CURB+.012,3,W/2+.35+WALK/2,a,b))),new THREE.MeshStandardMaterial({map:tex(pc),roughness:.6,metalness:0,polygonOffset:true,polygonOffsetFactor:-1}));pl.layers.set(1);S.add(pl);}
  // lantern posts + string lights along the boardwalk (warm), lit rain near them
  {const posts=[];for(const [a,b] of flatOpen){for(let s=Math.ceil(a/12)*12;s<b;s+=12){pointAt(s,OUT-.5,pv);o.x=pv.x;o.y=pv.y;o.z=pv.z;posts.push({s,x:o.x,y:o.y,z:o.z});
     metal.push(new THREE.CylinderGeometry(.06,.08,3.4,5,1,true).translate(o.x,o.y+CURB+1.7,o.z));emit.push(paintCol(new THREE.OctahedronGeometry(.3,0).translate(o.x,o.y+CURB+3.5,o.z),C(0xffc26a,3)));
     metal.push(new THREE.CylinderGeometry(.3,.2,.12,6).translate(o.x,o.y+CURB+3.8,o.z));if(s%36===0)lampPos.push(V(o.x,o.y+3.5,o.z));}}
   const cols=[0xff4fd8,0x35f2ff,0xffd23a,0x7affc8,0xff8a5a];let k=0;
   for(let i=0;i<posts.length-1;i++){const p=posts[i],q=posts[i+1];if(q.s-p.s>13)continue;for(let t=.1;t<.95;t+=.16){const y=p.y+CURB+3.3-Math.sin(t*Math.PI)*.7;
     emit.push(paintCol(new THREE.OctahedronGeometry(.07,0).translate(p.x+(q.x-p.x)*t,y,p.z+(q.z-p.z)*t),C(cols[k++%5],3)));}}}
  // Ferris wheel on a pier (sea side), rotating
  const fwS=150,fwOff=40,FR=16;let wheel;{sample(fwS,o);const ang=Math.atan2(o.tx,o.tz),cx=o.x-o.tz*fwOff,cz=o.z+o.tx*fwOff,cy=FR+3.2;
   const rim=[],gold=C(0xffd23a,2.2);
   rim.push(paintCol(new THREE.TorusGeometry(FR,.28,6,72),C(0xff4fd8,2.6)),paintCol(new THREE.TorusGeometry(FR-1.3,.14,6,64),C(0x35f2ff,2.6)),paintCol(new THREE.TorusGeometry(2.2,.3,6,24),C(0xfff0c0,2)));
   for(let i=0;i<18;i++){const a=i/18*Math.PI*2;rim.push(paintCol(new THREE.BoxGeometry(.12,FR-2.2,.12).translate(0,2.2+(FR-2.2)/2,0).rotateZ(a),C(0xfff0c0,1.5)));
    rim.push(paintCol(new THREE.SphereGeometry(.22,8,6).translate(Math.cos(a)*FR,Math.sin(a)*FR,.3),C([0xffd23a,0xff4fd8,0x35f2ff][i%3],3.2)));
    const gd=new THREE.BoxGeometry(1.5,1.3,1.3).translate(Math.cos(a)*(FR+.2),Math.sin(a)*(FR+.2)-1.1,0);rim.push(paintCol(gd,C([0xff7ab8,0x7affc8,0xffd23a,0x8ab0ff][i%4],1.7)));}
   wheel=new THREE.Mesh(merge(rim),new THREE.MeshBasicMaterial({vertexColors:true}));wheel.position.set(cx,cy,cz);wheel.rotation.order='YXZ';wheel.rotation.y=Math.atan2(-o.tz,o.tx);S.add(wheel);
   const ry=Math.atan2(-o.tz,o.tx);for(const sd of[-1,1])for(const lean of[-.36,.36]){const g=new THREE.BoxGeometry(.5,cy+1,.5).translate(0,-(cy+1)/2,0).rotateZ(lean).translate(0,0,sd*1.4).rotateY(ry).translate(cx,cy,cz);solid.push(paintCol(g,C(0x3a4060)));}
   // pier from the boardwalk out to the wheel
   const pier=new THREE.BoxGeometry(fwOff-OUT+12,.5,8).translate((fwOff+OUT)/2,-.15,0).rotateY(ang+Math.PI).translate(o.x,0,o.z);solid.push(paintCol(pier,C(0x6a4a34)));
   for(let i=0;i<5;i++){const t=OUT+2+i*(fwOff-OUT+4)/4;for(const sd of[-3.6,3.6]){const p=V(o.x-o.tz*t+o.tx*sd,0,o.z+o.tx*t+o.tz*sd);solid.push(paintCol(new THREE.CylinderGeometry(.22,.22,1.4,6).translate(p.x,SEA+.3,p.z),C(0x4a3424)));
     emit.push(paintCol(new THREE.SphereGeometry(.16,6,4).translate(p.x,.6,p.z),C(0xffc26a,3)));}}}
  // lighthouse on a rocky islet past the north hairpin + a slow sweeping beam
  let beam;{sample(470,o);const lx=o.x-o.tz*58,lz=o.z+o.tx*58;
   solid.push(paintCol(new THREE.CylinderGeometry(9,12,3,10).translate(lx,SEA+.6,lz),C(0x2a2a34)));
   for(let i=0;i<6;i++)solid.push(paintCol(new THREE.CylinderGeometry(2.3-i*.24,2.5-i*.24,3.2,16).translate(lx,1.6+i*3.2,lz),C(i%2?0xff3a6a:0xf2f0ff)));
   solid.push(paintCol(new THREE.CylinderGeometry(1.8,1.8,.4,16).translate(lx,19.6,lz),C(0x30303a)));emit.push(paintCol(new THREE.CylinderGeometry(1.2,1.2,1.8,12).translate(lx,20.7,lz),C(0xfff2b0,3.2)));
   solid.push(paintCol(new THREE.ConeGeometry(1.7,1.6,12).translate(lx,22.4,lz),C(0xff3a6a)));lampPos.push(V(lx,20,lz));
   const bg=new THREE.ConeGeometry(6,80,20,1,true).translate(0,-40,0).rotateZ(Math.PI/2);const n=bg.attributes.position.count,a=new Float32Array(n*3);
   for(let i=0;i<n;i++){const v=(1-bg.attributes.position.getX(i)/80)*.18+.02;a[i*3]=v;a[i*3+1]=v*.95;a[i*3+2]=v*.7;}bg.setAttribute('color',new THREE.BufferAttribute(a,3));
   beam=new THREE.Mesh(bg,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}));beam.position.set(lx,20.7,lz);beam.layers.set(1);beam.renderOrder=6;S.add(beam);}
  // lantern boats bobbing on the sea (2 palette meshes: lit hulls + glowing lanterns)
  const boats=[];const hulls=[],lights=[];const BC=[0x2a6aa0,0xd04060,0xf0f0f0,0x30a070,0xffb03a,0x8a5ac0];
  [[60,22],[230,30],[560,26],[700,-34],[1080,24],[1180,34]].forEach(([s,off],i)=>{sample(s,o);const side=off>0?1:-1,x=o.x-o.tz*off,z=o.z+o.tx*off;boats.push({x,z,y:SEA,yaw:Math.atan2(o.tx,o.tz)+(rnd()-.5)*.8,ph:i*1.3});
   const hp=[paintCol(new THREE.BoxGeometry(3,1,7.4).translate(0,.2,0),C(BC[i])),paintCol(new THREE.BoxGeometry(2.6,.12,6.6).translate(0,.75,0),C(0xd8c0a0)),paintCol(new THREE.ConeGeometry(1.5,2.2,4,1).rotateY(Math.PI/4).scale(1,1,1.4).rotateX(Math.PI/2).translate(0,.2,-4.5),C(BC[i])),
    paintCol(new THREE.BoxGeometry(1.8,1.3,2.2).translate(0,1.4,.8),C(0xf4f0ea)),paintCol(new THREE.CylinderGeometry(.06,.06,6,5).translate(0,3.8,-1),C(0xddddee))];
   for(const g of hp)hulls.push({g,slot:i});
   for(let k=0;k<9;k++){const t=k/8;lights.push({g:paintCol(new THREE.SphereGeometry(.18,6,4).translate(0,6.6-Math.sin(t*Math.PI)*0+(-Math.abs(t-.5)*2)*4.4+0,(-1)+(t-.5)*7.2),C([0xff4fd8,0x35f2ff,0xffd23a,0x7aff6a][(k+i)%4],3)),slot:i});}
   lights.push({g:paintCol(new THREE.BoxGeometry(1.6,.5,.06).translate(0,1.5,2.12),C(0xffe0a0,2.6)),slot:i});
   lampPos.push(V(x,1.5,z));});
  const bh=palMesh(S,hulls,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.45,metalness:.1}),boats.length);
  const bl=palMesh(S,lights,new THREE.MeshBasicMaterial({vertexColors:true}),boats.length);
  // drawbridge: lift towers at both ends of the span, neon outlines, warning lights, overhead beams
  {const [b0,b1]=this.elev[0];for(const e of[b0+40,b1-40]){sample(e,o);const ang=Math.atan2(o.tx,o.tz);
    for(const sd of[-1,1]){const x=o.x-o.tz*sd*(W/2+1.6),z=o.z+o.tx*sd*(W/2+1.6);solid.push(paintCol(new THREE.BoxGeometry(2.4,15,2.4).rotateY(ang).translate(x,o.y+7,z),C(0x3a4a6a)));
     for(const h of[o.y+3,o.y+14.6])emit.push(paintCol(new THREE.BoxGeometry(2.5,.16,2.5).rotateY(ang).translate(x,h,z),C(0x35f2ff,2.6)));
     emit.push(paintCol(new THREE.SphereGeometry(.28,8,6).translate(x,o.y+15.2,z),C(0xff3a3a,3.2)));solid.push(paintCol(new THREE.BoxGeometry(1.6,2.2,1.6).rotateY(ang).translate(x,o.y+11,z),C(0x24304a)));}
    const beamG=new THREE.BoxGeometry(W+5.6,.9,1.2).rotateY(ang).translate(o.x,o.y+13.2,o.z);solid.push(paintCol(beamG,C(0x3a4a6a)));
    emit.push(paintCol(new THREE.BoxGeometry(W+5.7,.14,1.25).rotateY(ang).translate(o.x,o.y+12.75,o.z),C(0xffd23a,2.6)));}
   // deck seam glow across the middle of the span
   sample((b0+b1)/2,o);emit.push(paintCol(new THREE.BoxGeometry(W,.03,.18).rotateY(Math.atan2(o.tx,o.tz)).translate(o.x,o.y+.02,o.z),C(0xffd23a,2)));}
  // boathouse: wooden cladding over the tunnel, a pitched roof, lantern strings inside, BOATHOUSE sign
  {const [a,b]=this.tunnels[0];const wood=C(0x7a5238),dark=C(0x4a3020),RW=TOFF+.6;
   for(const sd of[-1,1])solid.push(paintCol(wall(sd*(TOFF+.25),SEA,TH+.3,2,a-.5,b+.5),wood));
   const roof=new THREE.BufferGeometry(),rp=[],ri=[];const n=Math.ceil((b-a)/3);
   for(let i=0;i<=n;i++){const s=a-1+(b-a+2)*i/n;sample(s,o);for(const [x,y] of[[-RW-.8,TH+.2],[0,TH+4.2],[RW+.8,TH+.2]])rp.push(o.x-o.tz*x,o.y+y,o.z+o.tx*x);if(i<n){const q=i*3;ri.push(q,q+3,q+1,q+1,q+3,q+4,q+1,q+4,q+2,q+2,q+4,q+5);}}
   roof.setAttribute('position',new THREE.Float32BufferAttribute(rp,3));roof.setAttribute('uv',new THREE.Float32BufferAttribute(new Array(rp.length/3*2).fill(0),2));roof.setIndex(ri);roof.computeVertexNormals();solid.push(paintCol(roof,C(0x5a2a3a)));
   for(const e of[a-1,b+1]){sample(e,o);const ang=Math.atan2(o.tx,o.tz);const gable=new THREE.BufferGeometry();const gp=[];for(const [x,y] of[[-RW-.8,TH+.2],[RW+.8,TH+.2],[0,TH+4.2]])gp.push(o.x-o.tz*x,o.y+y,o.z+o.tx*x);
    gable.setAttribute('position',new THREE.Float32BufferAttribute(gp,3));gable.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,0,0,0,0],2));gable.computeVertexNormals();solid.push(paintCol(gable,dark));
    signs.push({raw:1,x:o.x-o.tx*(e<b?.7:-.7),y:o.y+TH+1.6,z:o.z-o.tz*(e<b?.7:-.7),ang:ang+(e<b?Math.PI:0),w:6.4,k:3});}   // sign k:3 = 'BOATS'
   const cols=[0xffc26a,0xff7ab8,0x7affc8];let k=0;for(let s=a+2;s<b-2;s+=1.1){for(const x of[-W/2+1,W/2-1]){pointAt(s,x,pv);emit.push(paintCol(new THREE.OctahedronGeometry(.08,0).translate(pv.x,pv.y+TH-.6-Math.abs(Math.sin(s*.7))*.5,pv.z),C(cols[k++%3],3)));}}}
  // little harbor extras: mooring bollards with glow tips on the quay, buoy lights out at sea
  for(let i=0;i<14;i++){const s=(i*89+40)%L;if(yAt(s)>.05||inTunnel(s,4))continue;sample(s,o);const off=70+rnd()*90,x=o.x-o.tz*off,z=o.z+o.tx*off;emit.push(paintCol(new THREE.SphereGeometry(.35,8,6).translate(x,SEA+.4,z),C(i%2?0xff3a3a:0x7aff6a,3)));}
  S.add(new THREE.Mesh(merge(solid),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.15,side:THREE.DoubleSide})));
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(0,0,0,'YXZ'),v=new THREE.Vector3(),one=new THREE.Vector3(1,1,1);
  return {update(dt,t){wheel.rotation.z=t*.12;beam.rotation.y=t*.45;
   for(let i=0;i<boats.length;i++){const B=boats[i];e.set(Math.sin(t*1.1+B.ph)*.05,B.yaw,Math.sin(t*.9+B.ph)*.07);q.setFromEuler(e);v.set(B.x,B.y+Math.sin(t*1.3+B.ph)*.18,B.z);m.compose(v,q,one);setSlotM(bh.M,i,m);setSlotM(bl.M,i,m);}}};}
};
