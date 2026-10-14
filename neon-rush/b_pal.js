// Neon Rush "palette" meshes (Track B, M3): many independently moving objects in ONE draw call.
// Each vertex carries a slot id (attribute kid); the vertex shader applies matrix kM[kid].
// Matrix row 4 is unused for the affine transform, so elements[3] carries a per-slot fade (0..1+).
import * as THREE from 'three';
import {mergeGeometries} from './vendor/three/jsm/utils/BufferGeometryUtils.js';
const HIDE=new THREE.Matrix4().makeScale(0,0,0);
// fade: 'none' | 'rgb' (additive: dim colour) | 'alpha' (normal blending: dim alpha)
export function palMat(mat,N,fade='none'){const M=[...Array(N)].map(()=>HIDE.clone());
 mat.onBeforeCompile=sh=>{sh.uniforms.kM={value:M};
  sh.vertexShader='attribute float kid;\nuniform mat4 kM['+N+'];\nvarying float vPal;\n'+sh.vertexShader
   .replace('#include <beginnormal_vertex>','mat4 kMi=kM[int(kid+.5)];vPal=kMi[0].w;\nvec3 objectNormal = mat3(kMi) * normal;\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3( tangent.xyz );\n#endif')
   .replace('#include <begin_vertex>','vec3 transformed = (kM[int(kid+.5)] * vec4(position,1.0)).xyz;vPal=kM[int(kid+.5)][0].w;');
  sh.fragmentShader='varying float vPal;\n'+sh.fragmentShader.replace(/}\s*$/,fade==='rgb'?'gl_FragColor.rgb*=vPal;}':fade==='alpha'?'gl_FragColor.a*=vPal;}':'}');};
 mat.customProgramCacheKey=()=>'pal'+N+fade;return M;}
// parts: [{g:BufferGeometry, slot:int}] -> one geometry with the kid attribute (keeps colour if every part has it)
export function palGeo(parts){const gs=parts.map(({g,slot})=>{g=g.index?g.toNonIndexed():g;const n=g.attributes.position.count,a=new Float32Array(n).fill(slot);g.setAttribute('kid',new THREE.BufferAttribute(a,1));return g;});
 const hasCol=gs.every(g=>g.attributes.color),hasUv=gs.every(g=>g.attributes.uv);
 const out=gs.map(g=>{const o=new THREE.BufferGeometry();o.setAttribute('position',g.attributes.position);o.setAttribute('normal',g.attributes.normal||(g.computeVertexNormals(),g.attributes.normal));
  if(hasUv)o.setAttribute('uv',g.attributes.uv);if(hasCol)o.setAttribute('color',g.attributes.color);o.setAttribute('kid',g.attributes.kid);return o;});
 return mergeGeometries(out);}
export function palMesh(S,parts,mat,N,fade='none',layer=1){const M=palMat(mat,N,fade);const m=new THREE.Mesh(palGeo(parts),mat);m.frustumCulled=false;m.layers.set(layer);S.add(m);return {mesh:m,M};}
// set a slot from an Object3D-like (position, quaternion, scale) or hide it
export function setSlot(M,i,obj,fadeV=1){if(!obj){M[i].copy(HIDE);return;}obj.updateMatrix();M[i].copy(obj.matrix);M[i].elements[3]=fadeV;}
export function setSlotM(M,i,m4,fadeV=1){M[i].copy(m4);M[i].elements[3]=fadeV;}
export function hideSlot(M,i){M[i].copy(HIDE);}
