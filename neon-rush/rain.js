// Neon Rush rain + puddle splash rings (M3 Track B; M4 Track A: follows the road height, hidden inside tunnels).
// Drops live in WORLD space (they do not slide along with the camera) inside a box that wraps around the camera.
// Each streak is stretched along the drop's velocity RELATIVE to the camera (fall + wind - camVel), like a real
// camera shutter would see it, so at speed the rain leans toward you. Lamp-lit colour is kept.
import * as THREE from 'three';
export function createRain(kit,cam){const {S,HIGH,cv,tex,rnd,lampPos,W,pointAt}=kit;
 const RAIN=HIGH?1300:500;
 const FALL=9.5,WIND_X=.9,WIND_Z=.4;           // m/s: terminal speed of a raindrop, light breeze
 const BX=34,BY=16,BZ=46,FWD=16;                // wrap box size; box centre sits FWD m ahead of the camera
 const SHUTTER=1/40;                             // streak length = apparent speed x shutter time
 const geo=new THREE.PlaneGeometry(.014,1);      // unit-length streak (scaled per frame), centred
 const rain=new THREE.InstancedMesh(geo,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false}),RAIN);rain.frustumCulled=false;rain.layers.set(1);S.add(rain);
 const rp=new Float32Array(RAIN*3);const rcol=new THREE.Color();
 const c0=cam.position;for(let i=0;i<RAIN;i++){rp[i*3]=c0.x+(rnd()-.5)*BX;rp[i*3+1]=c0.y-3.2+rnd()*BY;rp[i*3+2]=c0.z+(rnd()-.5)*BZ;}
 function litColor(x,y,z){let best=0;for(let i=0;i<lampPos.length;i++){const lp=lampPos[i];const dx=lp.x-x,dz=lp.z-z;if(dx>14||dx<-14||dz>14||dz<-14)continue;const d=dx*dx+(lp.y-y)**2*.5+dz*dz;const b=1/(1+d*.03);if(b>best)best=b;}return rcol.setRGB(.18+best*1.6,.17+best*1.15,.26+best*.6);}
 for(let i=0;i<RAIN;i++)rain.setColorAt(i,litColor(rp[i*3],rp[i*3+1],rp[i*3+2]));
 const SPL=HIGH?120:40;const ringT=tex(cv(64,64,(g)=>{g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=3;g.beginPath();g.arc(32,32,27,0,7);g.stroke();}),false,false);
 const spl=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:ringT,color:0xb8c0e0,transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false}),SPL);spl.frustumCulled=false;spl.renderOrder=7;spl.layers.set(1);S.add(spl);
 const sp=new Float32Array(SPL*4);for(let i=0;i<SPL;i++)sp[i*4+2]=1+rnd();
 const rMat=rain.material,sMat=spl.material,RO=rMat.opacity,SO=sMat.opacity;

 const M4=new THREE.Matrix4(),v=new THREE.Vector3(),q=new THREE.Quaternion(),q2=new THREE.Quaternion(),sc=new THREE.Vector3(),rel=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),
  fwd=new THREE.Vector3(),toCam=new THREE.Vector3(),xa=new THREE.Vector3(),za=new THREE.Vector3(),basis=new THREE.Matrix4(),cv0=new THREE.Vector3();
 // g: {heroS, hero (Object3D), camVel (Vector3, m/s), cover (0..1: inside a tunnel)}
 function update(dt,g){
  const cov=g.cover||0;rMat.opacity=RO*(1-cov);sMat.opacity=SO*(1-cov);const hide=cov>.97;rain.visible=spl.visible=!hide;if(hide)return;
  // smoothed camera velocity (ignore snaps/teleports)
  if(g.camVel&&g.camVel.lengthSq()<60*60)cv0.lerp(g.camVel,Math.min(1,dt*6));
  // apparent drop velocity in the camera's frame -> one shared streak orientation (all drops fall the same way)
  rel.set(WIND_X-cv0.x,-FALL-cv0.y,WIND_Z-cv0.z);const spd=rel.length();rel.multiplyScalar(1/spd);
  cam.getWorldDirection(toCam).negate();xa.crossVectors(rel,toCam);if(xa.lengthSq()<1e-6)xa.set(1,0,0);xa.normalize();za.crossVectors(xa,rel);
  basis.makeBasis(xa,rel,za);q.setFromRotationMatrix(basis);const len=Math.min(2.2,Math.max(.35,spd*SHUTTER));sc.set(1,len,1);
  // wrap box follows the camera, centred ahead of it
  cam.getWorldDirection(fwd);fwd.y=0;fwd.normalize();const cx=cam.position.x+fwd.x*FWD,cz=cam.position.z+fwd.z*FWD;const hx=BX/2,hz=BZ/2;
  const dx=WIND_X*dt,dy=-FALL*dt,dz=WIND_Z*dt;let recol=0;const base=cam.position.y-3.2;
  for(let i=0;i<RAIN;i++){const j=i*3;let x=rp[j]+dx,y=rp[j+1]+dy,z=rp[j+2]+dz,moved=false;
   if(y<base){y+=BY*Math.ceil((base-y)/BY);moved=true;}else if(y>base+BY){y-=BY*Math.floor((y-base)/BY);moved=true;}
   const ox=x-cx,oz=z-cz;   // wrap in the box (world-fixed drops; only the far edge re-enters, so nothing pops in front of you)
   if(ox>hx){x-=BX;moved=true;}else if(ox<-hx){x+=BX;moved=true;}
   if(oz>hz){z-=BZ;moved=true;}else if(oz<-hz){z+=BZ;moved=true;}
   rp[j]=x;rp[j+1]=y;rp[j+2]=z;
   if(moved&&recol<160){rain.setColorAt(i,litColor(x,y,z));recol++;}
   v.set(x,y,z);M4.compose(v,q,sc);rain.setMatrixAt(i,M4);}
  rain.instanceMatrix.needsUpdate=true;rain.instanceColor.needsUpdate=true;
  for(let i=0;i<SPL;i++){let a=sp[i*4+2]+dt*2.4;if(a>2)a=1.01;if(a>1){a-=1;const ss=g.heroS+3+rnd()*30;pointAt(ss,(rnd()-.5)*W,v);sp[i*4]=v.x;sp[i*4+1]=v.z;sp[i*4+3]=g.inTunnel&&g.inTunnel(ss)?-99:v.y;}sp[i*4+2]=a;
   v.set(sp[i*4],sp[i*4+3]+.015,sp[i*4+1]);sc.set(.05+a*.3,1,.05+a*.3);M4.compose(v,q2.identity(),sc);spl.setMatrixAt(i,M4);}spl.instanceMatrix.needsUpdate=true;
 }
 return {update};}
