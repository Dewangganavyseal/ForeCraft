'use strict';
/* =============================================================================
   WORKSTATION MODELS  (port dari NEW MODEL/Workstation.html)
   -----------------------------------------------------------------------------
   Empat stasiun kerja voxel: Anvil, Crafting Bench (Meja Kerja), Stove
   (Tungku), dan Campfire (Api Unggun). Model dibangun dari grid voxel
   16×16 lalu diubah menjadi InstancedMesh berwarna per-instance (ringan:
   1 draw call per model + 1 untuk voxel menyala).

   Dipakai oleh Furni.DEFS di js/furni.js lewat WSModels.make(name, scale).
   Skala dipilih agar ukuran perabot wajar dibanding pemain (~1.9 blok).
   ============================================================================= */
const WSModels={
  VOX:0.3,

  /* ---------- helper voxel (sama seperti file aslinya) ---------- */
  Vox:class{
    constructor(){this.m=new Map();}
    k(x,y,z){return x+','+y+','+z;}
    set(x,y,z,c){this.m.set(this.k(x,y,z),c);}
    del(x,y,z){this.m.delete(this.k(x,y,z));}
    box(x1,y1,z1,x2,y2,z2,c){
      for(let x=x1;x<=x2;x++)for(let y=y1;y<=y2;y++)for(let z=z1;z<=z2;z++)this.set(x,y,z,c);
    }
    delBox(x1,y1,z1,x2,y2,z2){
      for(let x=x1;x<=x2;x++)for(let y=y1;y<=y2;y++)for(let z=z1;z<=z2;z++)this.del(x,y,z);
    }
  },

  _hash(x,y,z){const s=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return s-Math.floor(s);},

  /* ubah peta voxel menjadi InstancedMesh; glowing=true memakai material
     tak-terpengaruh cahaya (bara/api). Geometri dibuat per-panggilan agar
     aman di-dispose saat furnitur dibongkar. */
  toMesh(vox,glowing){
    const V=this.VOX;
    const arr=[...vox.m];
    const geo=new THREE.BoxGeometry(V,V,V);
    const mat=glowing?new THREE.MeshBasicMaterial():new THREE.MeshLambertMaterial();
    const mesh=new THREE.InstancedMesh(geo,mat,arr.length);
    const d=new THREE.Object3D(),c=new THREE.Color();
    arr.forEach(([key,col],i)=>{
      const p=key.split(',').map(Number);
      d.position.set((p[0]-7.5)*V,p[1]*V+V*0.5,(p[2]-7.5)*V);
      d.updateMatrix();
      mesh.setMatrixAt(i,d.matrix);
      c.setHex(col).multiplyScalar(0.9+this._hash(p[0],p[1],p[2])*0.16);
      mesh.setColorAt(i,c);
    });
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    mesh.frustumCulled=false;
    return mesh;
  },

  /* ---------- MODEL 1: ANVIL (Landasan Tempa) ---------- */
  buildAnvil(){
    const V=this.Vox,v=new V();
    const EDGE=0x25282c,DARK=0x34383d,MID=0x474c52,LIGHT=0x5c6268,FACE=0x6a7077,HI=0x7d848c;
    v.box(2,0,2,13,2,13,MID);
    v.box(2,0,2,13,0,13,DARK);
    v.box(5,3,5,10,8,10,DARK);
    v.box(5,3,5,10,3,10,EDGE);
    v.box(0,9,2,15,14,13,MID);
    v.box(0,13,2,15,14,13,LIGHT);
    v.box(1,14,3,14,14,12,FACE);
    v.box(0,15,2,15,15,2,EDGE); v.box(0,15,13,15,15,13,EDGE);
    v.box(0,15,3,0,15,12,EDGE); v.box(15,15,3,15,15,12,EDGE);
    [[0,2],[15,2],[0,13],[15,13]].forEach(([x,z])=>v.del(x,9,z));
    [[3,5],[6,9],[10,4],[12,10],[8,12],[4,11]].forEach(([x,z])=>v.set(x,14,z,EDGE));
    [[5,7],[11,6],[13,11]].forEach(([x,z])=>v.set(x,14,z,HI));
    return {solid:v};
  },

  /* ---------- MODEL 2: CRAFTING BENCH (Meja Kerja) ---------- */
  buildBench(){
    const V=this.Vox,v=new V();
    const LEG=0x4d2f16,RAIL=0x7a4a24,SHELF=0x8a5c34,TOP=0xb8894f,
          SEAM=0x66401f,TOP2=0xc79a63,IRON=0x9aa1a8,IRON_D=0x70767d,
          WOOD_D=0x452a12,CRATE=0x5a3a1e;
    for(const [x0,z0] of [[0,0],[14,0],[0,14],[14,14]])
      v.box(x0,0,z0,x0+1,12,z0+1,LEG);
    v.box(2,10,0,13,11,0,RAIL); v.box(2,10,15,13,11,15,RAIL);
    v.box(0,10,2,0,11,13,RAIL); v.box(15,10,2,15,11,13,RAIL);
    v.box(1,3,1,14,4,14,SHELF);
    v.box(1,4,5,14,4,5,SEAM); v.box(1,4,9,14,4,9,SEAM);
    v.box(3,5,9,6,8,12,CRATE);
    v.box(3,8,9,6,8,12,SHELF);
    v.box(3,5,9,3,8,9,WOOD_D);
    v.box(6,5,12,6,8,12,WOOD_D);
    v.box(0,13,0,15,15,15,TOP);
    for(const sx of [4,8,12]) v.box(sx,15,0,sx,15,15,SEAM);
    v.box(0,15,0,15,15,0,SEAM); v.box(0,15,15,15,15,15,SEAM);
    v.box(0,15,1,0,15,14,SEAM); v.box(15,15,1,15,15,14,SEAM);
    [[2,7],[6,13],[10,2],[13,9]].forEach(([x,z])=>v.set(x,15,z,SEAM));
    /* perkakas di atas meja: palu, gergaji, tumpukan papan */
    v.box(3,16,11,8,16,11,WOOD_D);
    v.box(9,16,10,10,17,12,IRON);
    v.box(10,16,4,14,16,4,IRON_D);
    v.box(8,16,4,9,17,4,WOOD_D);
    v.box(2,16,3,6,16,6,SHELF);
    v.box(3,17,4,6,17,5,TOP2);
    return {solid:v};
  },

  /* ---------- MODEL 3: STOVE (Tungku) ---------- */
  buildStove(){
    const V=this.Vox,v=new V(),g=new V();
    const BRICK=0x8f4a38,BRICK2=0x9d5844,MORTAR=0xd8cfc0,
          IRON=0x43484e,IRON_D=0x2c3035,IRON_L=0x5c636b,POT=0x24272b;
    const EMB=[0xff7a1e,0xffa02e,0xe85d04,0xffc83d];
    v.box(0,0,0,15,11,15,BRICK);
    for(let i=0;i<120;i++){
      if(Math.random()<0.5)continue;
      const f=(Math.random()*4)|0,a=(Math.random()*16)|0,b=(Math.random()*12)|0;
      if(f===0)v.set(a,b,0,BRICK2);else if(f===1)v.set(a,b,15,BRICK2);
      else if(f===2)v.set(0,b,a,BRICK2);else v.set(15,b,a,BRICK2);
    }
    for(const ym of [2,5,8,11]) v.box(0,ym,0,15,ym,15,MORTAR);
    const seamX=[[5,11],[2,8,13],[5,11],[2,8,13]];
    const seamZ=[[3,9],[6,12],[3,9],[6,12]];
    for(let c=0;c<4;c++){
      const y0=c*3,y1=c*3+1;
      for(const sx of seamX[c]) v.box(sx,y0,0,sx,y1,15,MORTAR);
      for(const sz of seamZ[c]) v.box(0,y0,sz,15,y1,sz,MORTAR);
    }
    v.delBox(5,1,12,10,5,15); v.delBox(6,6,12,9,6,15);
    for(let x=6;x<=9;x++)for(let y=1;y<=2;y++) g.set(x,y,12,EMB[(x+y)%4]);
    g.set(7,3,12,0xffc83d); g.set(8,3,12,0xff7a1e);
    g.set(7,1,13,0xffd75e); g.set(8,1,13,0xffb13d);
    g.set(7,2,13,0xffa02e); g.set(8,2,14,0xff7a1e); g.set(7,3,13,0xff5a00);
    for(let y=1;y<=6;y++){v.set(4,y,15,IRON_D);v.set(11,y,15,IRON_D);}
    for(let x=5;x<=10;x++) v.set(x,7,15,IRON_D);
    v.set(5,6,15,IRON_D); v.set(10,6,15,IRON_D);
    [[6,8],[8,8],[7,9],[9,10]].forEach(([x,y])=>v.set(x,y,15,0x5a4a42));
    v.box(0,12,0,15,12,15,IRON);
    v.delBox(6,12,6,9,12,9);
    for(let x=6;x<=9;x++)for(let z=6;z<=9;z++){
      g.set(x,11,z,EMB[(x*z+x)%4]);
      if((x+z)%2===0) v.set(x,12,z,IRON_D);
    }
    v.box(0,13,0,15,13,0,IRON_L); v.box(0,13,15,15,13,15,IRON_L);
    v.box(0,13,1,0,13,14,IRON_L); v.box(15,13,1,15,13,14,IRON_L);
    v.box(12,13,1,14,19,3,IRON_D);
    v.box(12,15,1,14,15,3,IRON); v.box(12,17,1,14,17,3,IRON);
    v.box(11,20,0,15,20,4,IRON); v.del(13,20,2); v.set(13,19,2,0x17181a);
    v.box(2,13,10,5,16,13,POT);
    v.delBox(3,14,11,4,16,12);
    return {solid:v,glow:g};
  },

  /* ---------- MODEL 4: CAMPFIRE (Api Unggun) ---------- */
  buildCampfire(){
    const V=this.Vox,v=new V(),g=new V();
    const BARK=0x5a4128,BARK_D=0x4a3520,BARK_L=0x6b4e31,
          END=0xc19a6b,RING=0x8a6a3e,CHAR=0x282420;
    const logX=(z0)=>{
      for(let x=0;x<16;x++)for(let y=0;y<3;y++)for(let z=z0;z<z0+2;z++){
        let c=BARK;
        if(y===2)c=BARK_L;else if(x%4===((z0===2)?1:3))c=BARK_D;
        v.set(x,y,z,c);
      }
      for(const xe of [0,15])for(let y=0;y<3;y++)for(let z=z0;z<z0+2;z++) v.set(xe,y,z,END);
      v.set(0,1,z0,RING); v.set(0,1,z0+1,RING); v.set(15,1,z0,RING); v.set(15,1,z0+1,RING);
    };
    const logZ=(x0)=>{
      for(let z=0;z<16;z++)for(let y=0;y<3;y++)for(let x=x0;x<x0+2;x++){
        let c=BARK;
        if(y===2)c=BARK_L;else if(z%4===((x0===2)?2:0))c=BARK_D;
        v.set(x,y,z,c);
      }
      for(const ze of [0,15])for(let y=0;y<3;y++)for(let x=x0;x<x0+2;x++) v.set(x,y,ze,END);
      v.set(x0,1,0,RING); v.set(x0+1,1,0,RING); v.set(x0,1,15,RING); v.set(x0+1,1,15,RING);
    };
    logX(2); logX(12); logZ(2); logZ(12);
    for(let x=5;x<=10;x++)for(let z=5;z<=10;z++){
      v.set(x,0,z,CHAR);
      const h=this._hash(x,1,z);
      if(h>0.72)g.set(x,1,z,0xff7a1e);
      else if(h>0.58)g.set(x,1,z,0xffa02e);
      else if(h<0.2)v.set(x,1,z,CHAR);
    }
    g.set(7,1,7,0xffd75e); g.set(8,1,8,0xffd75e); g.set(7,1,8,0xffb13d); g.set(8,1,7,0xffb13d);
    g.set(7,2,7,0xffa02e); g.set(8,2,8,0xff8c1a); g.set(8,2,7,0xffc83d);
    g.set(7,3,8,0xff7a1e); g.set(8,3,7,0xff5a00); g.set(7,4,7,0xff5a00);
    return {solid:v,glow:g};
  },

  BUILDERS:{
    anvil:'buildAnvil',bench:'buildBench',stove:'buildStove',campfire:'buildCampfire',
  },

  /* rakit Group siap pakai untuk Furni: pusat di (0,0), berdiri di y=0,
     diskalakan sesuai skala perabot yang diminta */
  make(name,scale){
    const fn=this.BUILDERS[name];
    if(!fn)return new THREE.Group();
    const b=this[fn]();
    const g=new THREE.Group();
    g.add(this.toMesh(b.solid,false));
    if(b.glow)g.add(this.toMesh(b.glow,true));
    g.scale.setScalar(scale||1);
    return g;
  },
};
