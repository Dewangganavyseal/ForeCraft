'use strict';
/* =============================================================================
   ENV_ORE — BONGKAHAN ORE VOXEL & FRAGMENT PHYSICS
   -----------------------------------------------------------------------------
   Porting 100% otentik dari "NEW MODEL/Ore.html":
   - Kluster 5 BONGKAH chamfer/bevel bertingkat, alas datar tepat di y=0
   - TOON OUTLINE gelap shell (inverted hull mesh)
   - Urat ore mengalir di permukaan (random walk) dengan gradasi palet ore
   - Nugget voxel menonjol + patch berkilau
   - 3 Tahap keutuhan:
       Tahap 0 (HP > 66%)  : Utuh penuh
       Tahap 1 (HP 33-66%) : Bongkahan luar rontok (pecahan menggelinding)
       Tahap 2 (HP 1-33%)  : Retak berat ke inti
       Tahap 3 (HP <= 0)   : Hancur total (pecahan inti meledak + item drop)
   - Fisika fragmen: JATUH → MEMANTUL → MENGGELINDING di tanah (rotateOnWorldAxis)
     → berhenti → mengecil → dibuang.
   ============================================================================= */

const FACES_ORE=[
  {d:[1,0,0], c:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]], n:[1,0,0], s:.80},
  {d:[-1,0,0],c:[[0,0,0],[0,0,1],[0,1,1],[0,1,0]], n:[-1,0,0], s:.58},
  {d:[0,1,0], c:[[0,1,0],[0,1,1],[1,1,1],[1,1,0]], n:[0,1,0], s:1.0},
  {d:[0,-1,0],c:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]], n:[0,-1,0], s:.50},
  {d:[0,0,1], c:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]], n:[0,0,1], s:.86},
  {d:[0,0,-1],c:[[0,0,0],[0,1,0],[1,1,0],[1,0,0]], n:[0,0,-1], s:.64},
];
const DIRS_ORE=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const VOX_ORE=0.22, OW_ORE=0.17;

function mulberry32_ore(a){
  return function(){
    a|=0;a=a+0x6D2B79F5|0;
    let t=Math.imul(a^a>>>15,1|a);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return((t^t>>>14)>>>0)/4294967296;
  };
}

function hash3_ore(x,y,z,s){
  let n=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,1440662683)^Math.imul(s,974634);
  n=Math.imul(n^(n>>>13),1274126177);
  n^=n>>>16;
  return (n>>>0)/4294967296;
}

const key3_ore=(x,y,z)=>x+','+y+','+z;

function buildGeo_ore(subset,vox,map,center){
  const pos=[],nor=[],col=[],ind=[]; let vi=0;
  const cA=new THREE.Color(), gray=new THREE.Color(.5,.5,.52);
  for(const i of subset){
    const v=vox[i];
    for(const f of FACES_ORE){
      const j=map.get(key3_ore(v.x+f.d[0],v.y+f.d[1],v.z+f.d[2]));
      if(j!==undefined&&subset.has(j))continue;
      const fracture=j!==undefined&&!subset.has(j);
      cA.copy(v.c).multiplyScalar(f.s*v.sj);
      if(fracture)cA.lerp(gray,.3).multiplyScalar(.62);
      for(const cc of f.c){
        pos.push((v.x+cc[0]-center.x)*VOX_ORE,(v.y+cc[1]-center.y)*VOX_ORE,(v.z+cc[2]-center.z)*VOX_ORE);
        nor.push(f.n[0],f.n[1],f.n[2]);
        col.push(cA.r,cA.g,cA.b);
      }
      ind.push(vi,vi+1,vi+2,vi,vi+2,vi+3); vi+=4;
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  geo.setIndex(ind);
  geo.computeBoundingSphere();
  return geo;
}

function buildShell_ore(subset,vox,map,center){
  const pos=[],ind=[]; let vi=0;
  for(const i of subset){
    const v=vox[i];
    for(const f of FACES_ORE){
      const j=map.get(key3_ore(v.x+f.d[0],v.y+f.d[1],v.z+f.d[2]));
      if(j!==undefined&&subset.has(j))continue;
      for(const cc of f.c){
        const p=[0,0,0];
        for(let a=0;a<3;a++){
          let t;
          if(f.n[a]!==0)t=cc[a]+f.n[a]*OW_ORE;
          else t=(cc[a]===0?-OW_ORE:1+OW_ORE);
          p[a]=t;
        }
        pos.push((v.x+p[0]-center.x)*VOX_ORE,(v.y+p[1]-center.y)*VOX_ORE,(v.z+p[2]-center.z)*VOX_ORE);
      }
      ind.push(vi,vi+1,vi+2,vi,vi+2,vi+3); vi+=4;
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.setIndex(ind);
  geo.computeBoundingSphere();
  return geo;
}

function pickSet_ore(set,rnd){
  const n=Math.floor(rnd()*set.size);
  let it=set.values();
  for(let i=0;i<n;i++)it.next();
  return it.next().value;
}

/* Generator kluster 5 bongkahan chamfer dari Ore.html */
function buildOreChunkData(oreDef,seed){
  const rnd=mulberry32_ore(seed);
  const map=new Map(); const boulders=[];
  const L=[
    {w:6,h:10,d:6,x:5,z:5},
    {w:6,h:6,d:6,x:0,z:6},
    {w:7,h:5,d:6,x:9,z:6},
    {w:4,h:4,d:4,x:6,z:2},
    {w:5,h:7,d:4,x:9,z:9},
  ].map(b=>{
    const j=k=>((rnd()*3)|0)-1;
    return {w:b.w+j(),h:Math.max(3,b.h+j()),d:b.d+j(),x:b.x+j(),z:b.z+j()};
  });
  const baseCols=oreDef.base.map(h=>new THREE.Color(h));
  /* ---- PASS 1: bangun sel voxel tiap bongkah ---- */
  const built=L.map((b,bi)=>{
    const cells=[];
    for(let lx=0;lx<b.w;lx++)for(let ly=0;ly<b.h;ly++)for(let lz=0;lz<b.d;lz++){
      const ex=lx===0||lx===b.w-1, ey=ly===0||ly===b.h-1, ez=lz===0||lz===b.d-1;
      if((ex?1:0)+(ey?1:0)+(ez?1:0)>=2)continue;
      const mx=Math.min(lx,b.w-1-lx), mz=Math.min(lz,b.d-1-lz);
      if(ly>=b.h-2&&Math.min(mx,mz)===0)continue;
      if(ly===b.h-1&&Math.min(mx,mz)<=1)continue;
      cells.push({x:b.x+lx,y:ly,z:b.z+lz});
    }
    return {cells,bi};
  });
  /* ---- PASS 2: GROUNDING — tiap bongkah diturunkan agar sel terendahnya
     tepat di y=0 SEBELUM dedup. Ini menjamin SEMUA bongkah (termasuk yang kecil
     di tepi) menapak blok tanah. Bongkah yang kemudian tertelan penuh oleh
     bongkah lain memang tersembunyi di dalam, tetapi pijakannya tetap benar. */
  for(const b of built){
    if(!b.cells.length)continue;
    let minY=Infinity;
    for(const c of b.cells)if(c.y<minY)minY=c.y;
    if(minY!==0)for(const c of b.cells)c.y-=minY;
  }
  /* ---- PASS 3: tulis ke map dengan GROUNDING SADAR-TUMPUK ----
     Sel ditulis berurutan; bila sebuah bongkah kehilangan SEMUA sel dasarnya
     (y=0) karena tertimpa bongkah lain, ia akan melayang. Untuk mencegahnya,
     kita turunkan bongkah itu selangkah demi selangkah sampai salah satu selnya
     menyentuh y=0 DAN benar-benar tertulis di map (tak tertelan). */
  const claimed=new Set();
  built.forEach((b,bi)=>{
    /* coba turunkan bongkah sampai punya pijakan nyata di y=0 */
    for(let attempt=0;attempt<24;attempt++){
      /* kumpulkan sel yang belum diklaim bongkah lain */
      const free=b.cells.filter(c=>!claimed.has(key3_ore(c.x,c.y,c.z)));
      if(!free.length)break;                       // tertelan penuh
      let minY=Infinity;
      for(const c of free)if(c.y<minY)minY=c.y;
      if(minY<=0)break;                            // sudah menapak
      for(const c of b.cells)c.y--;                // turun 1 voxel
    }
    const cells=[];
    for(const c of b.cells){
      const k=key3_ore(c.x,c.y,c.z);
      if(claimed.has(k))continue;
      claimed.add(k); map.set(k,0); cells.push(c);
    }
    boulders.push({cells,bi});
  });

  const vox=[];
  const entries=[...map.keys()];
  const cellByKey=new Map();
  boulders.forEach((b,bi)=>b.cells.forEach(c=>cellByKey.set(key3_ore(c.x,c.y,c.z),bi)));
  entries.forEach(k=>{
    const [x,y,z]=k.split(',').map(Number);
    const bi=cellByKey.get(k);
    vox.push({x,y,z,bi,bi0:bi,c:null,sj:1});
  });
  map.clear();
  vox.forEach((v,i)=>map.set(key3_ore(v.x,v.y,v.z),i));

  const bTone=boulders.map(()=>.92+rnd()*.18);
  vox.forEach(v=>{
    v.c=baseCols[(v.bi0+((rnd()*baseCols.length)|0))%baseCols.length].clone()
      .multiplyScalar(bTone[v.bi0]*(.96+rnd()*.08));
    v.sj=.96+hash3_ore(v.x,v.y,v.z,seed^4242)*.08;
  });

  const exposedDirs=v=>DIRS_ORE.filter(d=>!map.has(key3_ore(v.x+d[0],v.y+d[1],v.z+d[2])));
  const surfIdx=()=>vox.map((v,i)=>exposedDirs(v).length?i:-1).filter(i=>i>=0);

  const S=surfIdx();
  const oreCols=oreDef.ore.map(h=>new THREE.Color(h));
  const glintC=new THREE.Color(oreDef.glint);

  for(let k=0;k<9;k++){const v=vox[S[(rnd()*S.length)|0]];if(v)v.c.multiplyScalar(1.16);}
  for(let k=0;k<3;k++){
    let cv=vox[S[(rnd()*S.length)|0]];
    const len=4+((rnd()*5)|0);
    for(let s=0;s<len&&cv;s++){
      cv.c.multiplyScalar(.62);
      const nb=exposedDirs(cv).map(d=>map.get(key3_ore(cv.x+d[0],cv.y+d[1],cv.z+d[2]))).filter(j=>j!==undefined);
      if(!nb.length)break; cv=vox[nb[(rnd()*nb.length)|0]];
    }
  }
  const nVeins=4+((rnd()*3)|0);
  for(let k=0;k<nVeins;k++){
    let cv=vox[S[(rnd()*S.length)|0]];
    const len=9+((rnd()*9)|0);
    for(let s=0;s<len&&cv;s++){
      cv.c=oreCols[s%oreCols.length].clone().multiplyScalar(.92+rnd()*.16);
      const nb=exposedDirs(cv).map(d=>map.get(key3_ore(cv.x+d[0],cv.y+d[1],cv.z+d[2]))).filter(j=>j!==undefined);
      if(!nb.length)break; cv=vox[nb[(rnd()*nb.length)|0]];
    }
  }
  for(let k=0;k<3;k++){
    const ci=S[(rnd()*S.length)|0]; const v=vox[ci]; if(!v)continue;
    const ds=exposedDirs(v); if(!ds.length)continue;
    const nrm=ds[(rnd()*ds.length)|0];
    const t1=nrm[0]!==0?[0,1,0]:[1,0,0], t2=nrm[0]!==0?[0,0,1]:(nrm[1]!==0?[0,0,1]:[0,1,0]);
    const paint=vv=>{if(vv)vv.c=oreCols[oreCols.length-1].clone().multiplyScalar(.95+rnd()*.1);};
    paint(v);
    [t1,t2].forEach(t=>{[1,-1].forEach(sg=>{
      const j=map.get(key3_ore(v.x+t[0]*sg,v.y+t[1]*sg,v.z+t[2]*sg));
      if(j!==undefined&&exposedDirs(vox[j]).some(d=>d[0]===nrm[0]&&d[1]===nrm[1]&&d[2]===nrm[2]))paint(vox[j]);
    });});
    v.c.copy(glintC);
  }
  for(let k=0;k<5;k++){
    const v=vox[S[(rnd()*S.length)|0]]; if(!v)continue;
    const ds=exposedDirs(v); if(!ds.length)continue;
    const nrm=ds[(rnd()*ds.length)|0];
    const nx=v.x+nrm[0],ny=v.y+nrm[1],nz=v.z+nrm[2],nk=key3_ore(nx,ny,nz);
    if(map.has(nk))continue;
    const bi0=v.bi0;
    vox.push({x:nx,y:ny,z:nz,bi:bi0,bi0,c:oreCols[1].clone().multiplyScalar(.95+rnd()*.15),sj:1});
    map.set(nk,vox.length-1);
    if(rnd()<.6){
      const t=nrm[1]!==0?[1,0,0]:(nrm[0]!==0?[0,1,0]:[1,0,0]);
      const nk2=key3_ore(nx+t[0],ny+t[1],nz+t[2]);
      if(!map.has(nk2)){vox.push({x:nx+t[0],y:ny+t[1],z:nz+t[2],bi:bi0,bi0,c:oreCols[2].clone(),sj:1});map.set(nk2,vox.length-1);}
    }
  }

  const n=vox.length;
  let cx=0,cz=0;vox.forEach(v=>{cx+=v.x+.5;cz+=v.z+.5;});
  cx/=n;cz/=n;
  const center={x:cx,y:0,z:cz};
  vox.forEach(v=>{v.wx=(v.x+.5-cx)*VOX_ORE;v.wy=(v.y+.5)*VOX_ORE;v.wz=(v.z+.5-cz)*VOX_ORE;});

  const vol=boulders.map(b=>b.cells.length);
  const orderIdx=[...boulders.keys()].sort((a,b)=>vol[a]-vol[b]);
  const force={}; if(orderIdx[0]!==undefined)force[orderIdx[0]]=1e6; if(orderIdx[1]!==undefined)force[orderIdx[1]]=9e5;
  const rel=vox.map(v=>{
    const f=force[v.bi0];
    const base=Math.hypot(v.wx,v.wy-1.1,v.wz)+(hash3_ore(v.x,v.y,v.z,seed^777)-.5)*1.6;
    return f?f+rnd()*10:base;
  });
  const items=vox.map((v,i)=>i).sort((a,b)=>rel[b]-rel[a]);
  const layerOf=new Array(n);
  const n0=Math.round(n*.34),n1=Math.round(n*.33);
  items.forEach((i,idx)=>{layerOf[i]=idx<n0?0:idx<n0+n1?1:2;});
  const layer0=[],layer1=[],layer2=[];
  for(let i=0;i<n;i++)[layer0,layer1,layer2][layerOf[i]].push(i);
  const allSet=new Set([...Array(n).keys()]);
  const s1=new Set(allSet);layer0.forEach(i=>s1.delete(i));
  const s2=new Set(s1);layer1.forEach(i=>s2.delete(i));

  function mkFrag(cluster){
    let fx=0,fy=0,fz=0;cluster.forEach(i=>{fx+=vox[i].wx;fy+=vox[i].wy;fz+=vox[i].wz;});
    fx/=cluster.length;fy/=cluster.length;fz/=cluster.length;
    const cSet=new Set(cluster);
    const geo=buildGeo_ore(cSet,vox,map,center);
    const shell=buildShell_ore(cSet,vox,map,center);
    const g2c=new THREE.Vector3(fx,fy,fz);
    let mr=0;cluster.forEach(i=>{mr=Math.max(mr,new THREE.Vector3(vox[i].wx,vox[i].wy,vox[i].wz).distanceTo(g2c));});
    /* `lowY` = jarak vertikal dari pusat fragmen ke titik TERENDAH voxelnya.
       Dipakai agar fragmen MENDARAT tepat di tanah (dasar fragmen menyentuh
       permukaan), bukan mengambang setinggi radius bounding. Inilah kunci agar
       serpihan terlihat natural menempel ke tanah, tidak melayang. */
    let low=Infinity;
    cluster.forEach(i=>{const d=g2c.y-vox[i].wy;if(d<low)low=d;});
    if(!isFinite(low))low=0;
    return {geo,shell,off:g2c,r:Math.max(VOX_ORE*.9,mr+VOX_ORE*.5),lowY:Math.max(0,low)+VOX_ORE*.5};
  }

  function makeFrags(L){
    const out=[];const rem=new Set();
    boulders.forEach((b,bi)=>{
      const inL=b.cells.map(c=>map.get(key3_ore(c.x,c.y,c.z))).filter(i=>i!==undefined&&layerOf[i]===L);
      if(inL.length&&inL.length===b.cells.length){out.push(mkFrag(inL));return;}
      inL.forEach(i=>rem.add(i));
    });
    for(let i=0;i<n;i++)if(layerOf[i]===L&&!rem.has(i))rem.add(i);
    boulders.forEach(b=>{
      const inL=b.cells.map(c=>map.get(key3_ore(c.x,c.y,c.z))).filter(i=>i!==undefined&&layerOf[i]===L);
      if(inL.length===b.cells.length&&inL.length)inL.forEach(i=>rem.delete(i));
    });
    while(rem.size){
      const target=6+Math.floor(rnd()*9);
      const seedI=pickSet_ore(rem,rnd);
      const cluster=[];const q=[seedI];rem.delete(seedI);
      while(q.length&&cluster.length+q.length<target){
        const i=q.shift();cluster.push(i);const v=vox[i];
        for(const d of DIRS_ORE){
          const j=map.get(key3_ore(v.x+d[0],v.y+d[1],v.z+d[2]));
          if(j!==undefined&&rem.has(j)&&rnd()<.92){rem.delete(j);q.push(j);}
        }
      }
      while(q.length)cluster.push(q.shift());
      out.push(mkFrag(cluster));
    }
    return out;
  }

  return {
    geos:[buildGeo_ore(allSet,vox,map,center),buildGeo_ore(s1,vox,map,center),buildGeo_ore(s2,vox,map,center)],
    shells:[buildShell_ore(allSet,vox,map,center),buildShell_ore(s1,vox,map,center),buildShell_ore(s2,vox,map,center)],
    frags:[makeFrags(0),makeFrags(1),makeFrags(2)],
    /* HEIGHTFIELD COLLISION: tinggi permukaan tertinggi per kolom voxel.
       Kunci = "ix:iz" (koordinat voxel), nilai = tinggi puncak kolom
       dalam satuan voxel. Dipakai topAt() agar pemain BISA MENAPAK DI
       ATAS bongkahan (dan undakannya) lewat World.groundAt. */
    topGrid:(()=>{
      const g={};
      for(const v of vox){
        const k=v.x+':'+v.z;
        if(g[k]===undefined||v.y+1>g[k])g[k]=v.y+1;
      }
      return g;
    })(),
    /* TANGGA COLLISION BERTINGKAT: untuk tiap tingkat tinggi (0.24 blok per
       voxel), radius efektif = kolom terjauh yang mencapai tingkat itu.
       Levels terurut NAIK (dasar lebar → puncak sempit) sehingga collision
       mengikuti BENTUK bongkahan dan TIDAK PERNAH menjebak tubuh: solid
       hanya di dalam radius level pada ketinggian DI BAWAH level itu. */
    levels:(()=>{
      const g={};
      for(const v of vox){
        const k=v.x+':'+v.z;
        if(g[k]===undefined||v.y+1>g[k])g[k]=v.y+1;
      }
      let maxV=0;for(const k in g)if(g[k]>maxV)maxV=g[k];
      const arr=[];
      for(let lv=1;lv<=maxV;lv++){
        let r=0;
        for(const k in g){
          if(g[k]<lv)continue;
          const pr=k.split(':');
          const px=(+pr[0]+0.5-center.x)*VOX_ORE,pz=(+pr[1]+0.5-center.z)*VOX_ORE;
          const d=Math.hypot(px,pz)+VOX_ORE*0.75;
          if(d>r)r=d;
        }
        if(r>0)arr.push({h:lv*VOX_ORE,r});
      }
      return arr;
    })(),
    voxSize:VOX_ORE,center
  };
}

const Env_Ore={
  ORES:[
    {id:'batu',block:21,nama:'BATU',base:['#8f959c','#868c93','#99a0a7'],ore:['#6f767d','#8b9299','#b9c0c7'],glint:'#dfe4e9',chance:0.95},
    {id:'coal',block:16,nama:'COAL',base:['#6d747c','#646b73','#787f87'],ore:['#101216','#1d2025','#3a3f46'],glint:'#707a85',chance:0.85},
    {id:'copper',block:17,nama:'COPPER',base:['#8d8676','#948d7c','#857e6e'],ore:['#a4562a','#c8703a','#e89a58'],glint:'#ffd9a8',chance:0.75},
    {id:'besi',block:9,nama:'BESI',base:['#8f7a68','#96816e','#877260'],ore:['#8a5a3c','#b3836a','#d9b092'],glint:'#f4e0c6',chance:0.65},
    {id:'baja',block:18,nama:'BAJA',base:['#9ba7b1','#a6b2bc','#929ea8'],ore:['#6f7a85','#98a4ae','#dfe7ec'],glint:'#ffffff',chance:0.58},
    {id:'gold',block:10,nama:'GOLD',base:['#7b8188','#737980','#858b92'],ore:['#c98a1e','#f6c445','#ffde74'],glint:'#fff6c4',chance:0.50},
    {id:'diamond',block:11,nama:'DIAMOND',base:['#a9c6d4','#9fc0cf','#b6d2de'],ore:['#2fb3cf','#5fd0e8','#bdf1f9'],glint:'#ffffff',chance:0.42},
    {id:'tungsten',block:19,nama:'TUNGSTEN',base:['#4a4f52','#42474a','#54595c'],ore:['#5c6650','#8b9a7e','#c2cfb4'],glint:'#e4eeda',chance:0.35},
    {id:'tungstensteel',block:20,nama:'BAJA TUNGSTEN',base:['#41505f','#3a4855','#4a5968'],ore:['#5e6c7c','#8fa2b5','#dfe9f2'],glint:'#ffffff',chance:0.30}
  ],

  _oreByBlock:{},
  _templates:{},
  _chunkMat:null,
  _outlineMat:null,
  activeNodes:new Map(),

  init(){
    if(!this._chunkMat){
      this._chunkMat=new THREE.MeshLambertMaterial({vertexColors:true});
      this._outlineMat=new THREE.MeshBasicMaterial({color:0x262b33,side:THREE.BackSide});
      for(const o of this.ORES){
        this._oreByBlock[o.block]=o;
        if(typeof B!=='undefined'&&B[o.id.toUpperCase()]!==undefined){
          this._oreByBlock[B[o.id.toUpperCase()]]=o;
        }
      }
    }
  },

  getTemplate(blockId){
    this.init();
    if(this._templates[blockId])return this._templates[blockId];
    const def=this._oreByBlock[blockId]||this.ORES[0];
    const tmpl=buildOreChunkData(def,blockId*997+13);
    this._templates[blockId]=tmpl;
    return tmpl;
  },

  spawnNode(c,group,wx,wy,wz,blockId,seed,big){
    this.init();
    const tmpl=this.getTemplate(blockId);
    if(!tmpl)return;
    const key=`${wx},${wy},${wz}`;
    if(this.activeNodes.has(key))return;

    const st=(typeof World!=='undefined'&&World.oreStg&&World.oreStg[key])?World.oreStg[key].stage:0;
    const stage=Math.min(2,Math.max(0,st||0));

    const nodeGroup=new THREE.Group();
    nodeGroup.position.set(wx+0.5,wy,wz+0.5);
    const rot=((hash3_ore(wx,wy,wz,91)*4)|0);
    nodeGroup.rotation.y=rot*(Math.PI*0.5);
    /* NODE BESAR: mesh bongkahan raksasa (scale 1.5x) — lebih jarang spawn
       (20% dari node) tetapi hasil panennya jauh lebih banyak, dan butuh
       2x lebih lama dihancurkan */
    const scale=big?1.5:1.0;
    nodeGroup.scale.setScalar(scale);

    /* MATERIAL PER-NODE: klon dari material bersama supaya efek GAGAL
       (berdenyut MERAH ala ore.html) hanya mewarnai bongkahan ini,
       bukan semua ore di dunia. */
    const mat=this._chunkMat.clone();

    const chunkMesh=new THREE.Mesh(tmpl.geos[stage],mat);
    chunkMesh.castShadow=!(typeof IS_MOBILE!=='undefined'&&IS_MOBILE);
    chunkMesh.receiveShadow=true;
    nodeGroup.add(chunkMesh);

    const shellMesh=new THREE.Mesh(tmpl.shells[stage],this._outlineMat);
    nodeGroup.add(shellMesh);

    group.add(nodeGroup);
    this.activeNodes.set(key,{
      key,chunk:c,group:nodeGroup,chunkMesh,shellMesh,mat,
      template:tmpl,stage,wx,wy,wz,blockId,wobble:0,big:!!big,scale,
      rot:rot*(Math.PI*0.5),failPulse:0
    });
  },

  /* ========================================================================
     COLLISION HEIGHTFIELD — collision MENGIKUTI BENTUK bongkahan.
     topAt(x,z)  : tinggi permukaan bongkahan di kolom dunia (x,z), 0 bila
                   di luar bongkahan. Dipakai World.groundAt agar pemain/
                   mob BISA MENAPAK DI ATAS bongkahan (dan undakannya).
     solidAt     : titik dianggap padat HANYA bila berada DI DALAM volume
                   bongkahan (y di bawah topAt kolom itu) — berdiri di atas
                   tidak dianggap menembus. Bentuknya mengikuti undakan
                   bongkahan karena lookup per kolom voxel.
     ======================================================================== */
  /* tinggi lokal template di titik lokal (sx,sz) — satuan voxel → blok */
  _topLookup(tmpl,sx,sz){
    const VOX=tmpl.voxSize;
    const ix=Math.floor(sx/VOX+tmpl.center.x);
    const iz=Math.floor(sz/VOX+tmpl.center.z);
    const v=tmpl.topGrid[ix+':'+iz];
    return v===undefined?0:v*VOX;
  },
  /* tinggi permukaan bongkahan di titik dunia (x,z) — return WORLD Y!
     PENTING: harus mengembalikan ketinggian dunia absolut (node.wy + h),
     bukan tinggi lokal (h). Tanpa node.wy, World.groundAt tidak pernah
     menganggap permukaan bongkahan sebagai lantai (karena h < tanah dunia),
     sehingga pemain tembus ke bawah dan jatuh ke dalam badan ore. */
  topAt(x,z){
    let best=0;
    for(const node of this.activeNodes.values()){
      const maxHalf=2.4*node.scale;
      const dx0=x-(node.wx+0.5),dz0=z-(node.wz+0.5);
      if(Math.abs(dx0)>maxHalf||Math.abs(dz0)>maxHalf)continue;
      /* dunia → lokal node (scale & rotasi dibalik) */
      let lx=dx0/node.scale, lz=dz0/node.scale;
      const cs=Math.cos(-node.rot),sn=Math.sin(-node.rot);
      const sx=lx*cs+lz*sn, sz=-lx*sn+lz*cs;
      const h=this._topLookup(node.template,sx,sz)*node.scale;
      if(h>0){
        const wy=node.wy+h;
        if(wy>best)best=wy;
      }
    }
    return best;
  },

  /* MESH COLLIDER PRESISI: mengikuti tiap lekukan voxel 3D model ore.
     Titik (x,y,z) dianggap padat HANYA jika berada di dalam kontur voxel
     nyata dari ore pada ketinggian di bawah permukaan kolom tersebut.
     Berdiri di atas bongkahan atau berjalan di undakan tidak dianggap
     padat sehingga pemain BISA BERJALAN & MENAPAK BEBAS DI ATAS ORE
     TANPA STUCK. */
  solidAt(x,y,z){
    for(const node of this.activeNodes.values()){
      const maxHalf=2.4*node.scale;
      const dx0=x-(node.wx+0.5),dz0=z-(node.wz+0.5);
      if(Math.abs(dx0)>maxHalf||Math.abs(dz0)>maxHalf)continue;
      let lx=dx0/node.scale, lz=dz0/node.scale;
      const cs=Math.cos(-node.rot),sn=Math.sin(-node.rot);
      const sx=lx*cs+lz*sn, sz=-lx*sn+lz*cs;

      const h=this._topLookup(node.template,sx,sz)*node.scale;
      if(h<=0)continue;                      // di luar kontur voxel 3D ore

      const oreTop=node.wy+h;
      /* Padat HANYA bila titik berada di dalam volume vertikal ore
         (di bawah permukaan kolom voxel, di atas dasar) */
      if(y>=node.wy-0.1&&y<oreTop-0.08){
        return true;
      }
    }
    return false;
  },

  /* NODE tempat blok (bx,by,bz) berada & masih dalam JANGKAUAN AYUNAN
     tubuh pemain (px,py,pz) — mendeteksi dari SISI MANA PUN, sudut mana pun,
     maupun dari ATAS model 3D ore. */
  hitNode(bx,by,bz,px,py,pz){
    for(const node of this.activeNodes.values()){
      if(Math.abs(bx-node.wx)>3||Math.abs(bz-node.wz)>3||
         by<node.wy-2||by>node.wy+5)continue;
      const hx=2.2*node.scale, hz=hx;
      const dx=Math.max(0,Math.abs(px-(node.wx+0.5))-hx);
      const dz=Math.max(0,Math.abs(pz-(node.wz+0.5))-hz);
      const nodeTop=node.wy+2.6*node.scale;
      let dy=0;
      if(py>nodeTop)dy=py-nodeTop;
      else if(py+1.6<node.wy)dy=node.wy-(py+1.6);
      if(Math.hypot(dx,dz,dy)<=1.8)return node;
    }
    return null;
  },

  buildChunkOres(c,group){
    if(c.ores&&c.ores.length){
      const seaLevel=(typeof CFG!=='undefined'&&CFG.SEA!==undefined)?CFG.SEA:5;
      for(const o of c.ores){
        if(o.wy<seaLevel)continue; // Garansi anti-tenggelam di air/sungai
        if(c.data[World.idx(o.x,o.y,o.z)]===o.ore){
          this.spawnNode(c,group,o.wx,o.wy,o.wz,o.ore,o.seed,o.big);
        }
      }
    }
  },

  disposeChunkOres(c){
    if(c.ores){
      for(const o of c.ores){
        const node=this.activeNodes.get(`${o.wx},${o.wy},${o.wz}`);
        if(node&&node.mat)node.mat.dispose();
        this.activeNodes.delete(`${o.wx},${o.wy},${o.wz}`);
      }
    }
  },

  getNode(wx,wy,wz){
    return this.activeNodes.get(`${wx},${wy},${wz}`);
  },

  wobble(wx,wy,wz,amount){
    const node=this.getNode(wx,wy,wz);
    if(node)node.wobble=Math.max(node.wobble,amount||0.25);
  },

  /* ---------- EFEK GAGAL (port doFail ore.html) ----------
     Getaran + DENYUT MERAH pada bongkahan: emissive merah berdenyut cepat
     (osc 42Hz) + tubuh dimerahkan, meluruh 2.1/detik — persis rumus
     failPulse prototipe. Material per-node sehingga hanya ore ini yang
     berubah merah. */
  onFail(wx,wy,wz){
    this.wobble(wx,wy,wz,0.55);
    const node=this.getNode(wx,wy,wz);
    if(node)node.failPulse=1;
  },

  onHit(wx,wy,wz,blockId,newStage){
    const node=this.getNode(wx,wy,wz);
    if(node){
      node.wobble=0.55;                      // getaran KUAT tiap pukulan
      if(newStage>node.stage){
        const prevStage=node.stage;
        node.stage=Math.min(2,newStage);
        node.chunkMesh.geometry=node.template.geos[node.stage];
        node.shellMesh.geometry=node.template.shells[node.stage];
        OreFX.spawnFrags(node.template.frags[prevStage],node.group.position,1.0);
      }
    }
  },

  onDestroy(wx,wy,wz,blockId){
    const key=`${wx},${wy},${wz}`;
    const node=this.activeNodes.get(key);
    if(node){
      OreFX.spawnFrags(node.template.frags[2],node.group.position,1.4);
      if(node.group.parent)node.group.parent.remove(node.group);
      if(node.mat)node.mat.dispose();
      this.activeNodes.delete(key);
    }
  },

  update(dt){
    const t=performance.now()*0.001;
    for(const node of this.activeNodes.values()){
      /* GETARAN ala ore.html: jitter ACAK per frame (bukan sin halus) dengan
         decay lambat — bongkahan jelas terlihat bergetar saat dipukul/gagal,
         lalu kembali TEPAT ke posisi semula saat getaran habis. */
      if(node.wobble>0){
        node.wobble=Math.max(0,node.wobble-dt*1.8);
        const j=node.wobble*node.wobble*0.55;
        node.group.position.x=node.wx+0.5+(Math.random()-0.5)*j;
        node.group.position.z=node.wz+0.5+(Math.random()-0.5)*j;
        if(node.wobble<=0){
          node.group.position.x=node.wx+0.5;
          node.group.position.z=node.wz+0.5;
        }
      }
      /* denyut MERAH saat gagal (port failPulse ore.html) */
      if(node.failPulse>0){
        const osc=0.6+0.4*Math.sin(t*42);
        node.mat.emissive.setRGB(node.failPulse*0.55*osc,node.failPulse*0.04,0);
        node.mat.color.setRGB(1,1-node.failPulse*0.45,1-node.failPulse*0.5);
        node.failPulse-=dt*2.1;
        if(node.failPulse<=0){
          node.mat.emissive.setRGB(0,0,0);
          node.mat.color.setRGB(1,1,1);
        }
      }
    }
  },

  clear(){
    for(const node of this.activeNodes.values())
      if(node.mat)node.mat.dispose();
    this.activeNodes.clear();
  }
};

/* =============================================================================
   OreFX — FRAGMEN PECAHAN ORE DENGAN TOON OUTLINE
   ============================================================================= */
const OreFX={
  list:[],
  MAX:64,

  spawnFrags(fragDefs,pos,boost){
    if(!fragDefs||!fragDefs.length||typeof Game==='undefined'||!Game.scene)return;
    boost=boost||1;
    Env_Ore.init();
    for(const f of fragDefs){
      if(this.list.length>=this.MAX){
        const old=this.list.shift();
        if(old.grp.parent)old.grp.parent.remove(old.grp);
      }
      const grp=new THREE.Group();
      const m=new THREE.Mesh(f.geo,Env_Ore._chunkMat);
      const sh=new THREE.Mesh(f.shell,Env_Ore._outlineMat);
      grp.add(m);grp.add(sh);
      grp.position.copy(pos).addScaledVector(f.off,1);
      /* NATURAL: JANGAN mendongkrak fragmen ke atas sembarangan. Bila fragmen
         muncul TERKUBUR di bawah tanah (mis. dasar bongkahan), angkat HANYA
         sampai dasarnya menyentuh tanah — bukan setinggi radius. Kalau tidak,
         fragmen tampak melayang di udara sejak muncul. */
      const restY=(typeof World!=='undefined'&&World.terrainAt)
        ?World.terrainAt(grp.position.x,grp.position.z,grp.position.y+3)+(f.lowY||f.r)
        :(f.lowY||f.r);
      if(grp.position.y<restY)grp.position.y=restY;
      const dir=f.off.clone();dir.y+=0.18;
      if(dir.lengthSq()<0.001)dir.set(0,1,0);dir.normalize();
      const s=(1.6+Math.random()*2.4)*boost;
      Game.scene.add(grp);
      this.list.push({
        grp,r:f.r,lowY:(f.lowY||f.r),
        vel:new THREE.Vector3(dir.x*s,Math.abs(dir.y)*s*0.7+1.3+Math.random()*1.8*boost,dir.z*s),
        axis:new THREE.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).normalize(),
        ang:2+Math.random()*6,
        resting:false,restT:0,age:0
      });
    }
  },

  burst(x,y,z,blockId,n,power){
    const tmpl=Env_Ore.getTemplate(blockId);
    if(tmpl&&tmpl.frags){
      const l=Math.min(2,Math.floor(Math.random()*3));
      this.spawnFrags(tmpl.frags[l],new THREE.Vector3(x,y,z),power||1);
    }
  },

  update(dt){
    for(let i=this.list.length-1;i>=0;i--){
      const f=this.list[i];f.age+=dt;
      if(!f.resting){
        f.vel.y-=21*dt;
        f.grp.position.x+=f.vel.x*dt;
        f.grp.position.y+=f.vel.y*dt;
        f.grp.position.z+=f.vel.z*dt;
        /* NATURAL LANDING: fragmen mendarat saat DASAR-nya (bukan pusatnya)
           menyentuh TANAH BIOME. Pakai World.terrainAt (bukan groundAt) supaya
           serpihan TIDAK berhenti melayang di atas bongkahan ore yang masih
           tersisa — groundAt menyertakan Env_Ore.topAt sebagai lantai, yang
           membuat serpihan tampak mengambang di udara. `gy` = tinggi tanah +
           jarak pusat→dasar (lowY). */
        const restOff=(f.lowY!==undefined)?f.lowY:f.r;
        const gy=(typeof World!=='undefined'&&World.terrainAt)
          ?World.terrainAt(f.grp.position.x,f.grp.position.z,f.grp.position.y+2)+restOff
          :restOff;
        if(f.grp.position.y<=gy&&f.vel.y<0){
          f.grp.position.y=gy;
          f.vel.y*=-0.34;f.vel.x*=0.72;f.vel.z*=0.72;f.ang*=0.65;
          if(Math.abs(f.vel.y)<0.7)f.vel.y=0;
        }
        if(f.grp.position.y<=gy+0.02&&Math.abs(f.vel.y)<0.05){
          f.vel.x*=Math.exp(-1.6*dt);f.vel.z*=Math.exp(-1.6*dt);
          const hs=Math.hypot(f.vel.x,f.vel.z);
          if(hs>0.02){
            const ax=new THREE.Vector3(f.vel.z,0,-f.vel.x).normalize();
            f.grp.rotateOnWorldAxis(ax,hs*dt/f.r);
          }
          if(hs<0.12){f.resting=true;f.restT=0.8+Math.random()*0.9;}
        }else{
          f.grp.rotateOnAxis(f.axis,f.ang*dt);
        }
      }else{
        f.restT-=dt;
        if(f.restT<=0){
          const s=f.grp.scale.x-dt*1.6;
          if(s<=0.02){
            if(f.grp.parent)f.grp.parent.remove(f.grp);
            this.list.splice(i,1);
            continue;
          }
          f.grp.scale.setScalar(s);
        }
      }
      if(f.age>7){
        if(f.grp.parent)f.grp.parent.remove(f.grp);
        this.list.splice(i,1);
      }
    }
  },

  clear(){
    if(typeof Game==='undefined'||!Game.scene)return;
    for(const f of this.list){
      if(f.grp.parent)f.grp.parent.remove(f.grp);
    }
    this.list.length=0;
  }
};

window.Env_Ore=Env_Ore;
window.OreFX=OreFX;
