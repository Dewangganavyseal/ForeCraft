'use strict';
/* =============================================================================
   ENTITAS MOB: YETI (❄ Voxel Yeti)
   -----------------------------------------------------------------------------
   Diporting dari "NEW MODEL/Yeti.html". Mob besar biome TUNDRA SALJU.

   SELURUH 7 AKSI dari file asli dipakai di dalam game:
     idle · walk · run                    → locomotion (dipilih dari kecepatan)
     jump  'Lompat & Hantam Tanah'         → lompat menerjang + hantam tanah
     atk1  'Sapuan Cakar'                  → sabetan cepat satu sasaran
     atk2  'Hantaman Ganda'                → dua tangan dihantamkan ke depan
     atk3  'Pusaran Salju 360°'            → berputar penuh, AoE di sekeliling

   Rig & keyframe dipertahankan apa adanya (fungsi tr / poseX di bawah persis
   file asli). Yang diubah hanya cara aksi dijalankan: timeline dikendalikan
   js/monsters.js (aiYeti) lewat m.yAct / m.yActT / m.yActDur, sedangkan gerak
   nyata (lompat, terjangan) memakai fisika mob supaya damage & posisi visual
   selalu sinkron — bukan translasi root seperti di halaman demo.
   ============================================================================= */

const Mob_Yeti=(()=>{

  const S=0.16;                    // ukuran satu voxel (dari file asli)
  const SCALE=0.70;                // skala model di dunia → tinggi ±2.6 blok
  const TWO_PI=Math.PI*2;

  /* ---------- helper voxel ---------- */
  function box(a,x0,y0,z0,x1,y1,z1,c){
    for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)a.push({x,y,z,c});
  }
  const hash3=(x,y,z)=>{
    const v=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;
    return v-Math.floor(v);
  };

  const FACES=[
    {n:[0,0,1], sh:1.00, v:[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]},
    {n:[0,0,-1],sh:0.82, v:[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]},
    {n:[1,0,0], sh:0.92, v:[[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]]},
    {n:[-1,0,0],sh:0.86, v:[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]]},
    {n:[0,1,0], sh:1.10, v:[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]]},
    {n:[0,-1,0],sh:0.68, v:[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]]},
  ];

  /* satu geometri per bagian tubuh; warna disimpan di atribut verteks */
  function voxGeo(list,s){
    const pos=[],nor=[],col=[],idx=[];let vi=0;
    const c=new THREE.Color();
    for(const v of list){
      c.setHex(v.c);
      const j=0.94+0.10*hash3(v.x,v.y,v.z);
      for(const f of FACES){
        for(let k=0;k<4;k++){
          pos.push((v.x+f.v[k][0])*s,(v.y+f.v[k][1])*s,(v.z+f.v[k][2])*s);
          nor.push(f.n[0],f.n[1],f.n[2]);
          const m=f.sh*j;
          col.push(Math.min(1,c.r*m),Math.min(1,c.g*m),Math.min(1,c.b*m));
        }
        idx.push(vi,vi+1,vi+2,vi,vi+2,vi+3);vi+=4;
      }
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
    g.setIndex(idx);
    return g;
  }

  /* palet & daftar voxel per bagian (persis Yeti.html) */
  const P={
    fur:0xeaf1f8, fur2:0xcfe0f2, fur3:0xa6c0db,
    belly:0xbfd7ee, face:0x3c4c60, face2:0x2d3a4b,
    mouth:0x1c242f, horn:0xf4f9ff, claw:0x232c38
  };

  /* daftar voxel dibuat SEKALI (deterministik) lalu geometrinya dipakai ulang
     oleh semua yeti — hanya materialnya yang dibuat baru per mob. */
  let GEO=null;
  function buildGeo(){
    if(GEO)return GEO;
    let _s=1234;
    const srnd=()=>{_s=(_s*16807)%2147483647;return _s/2147483647;};

    const T=[];
    box(T,-4,0,-2,4,8,2,P.fur);
    box(T,-5,4,-2,-5,8,2,P.fur2);
    box(T,5,4,-2,5,8,2,P.fur2);
    box(T,-3,9,-1,3,9,1,P.fur);
    box(T,-2,1,3,2,5,3,P.belly);
    box(T,-1,0,3,1,0,3,P.belly);
    box(T,0,2,3,0,5,3,P.fur3);
    for(let x=-4;x<=4;x+=2)T.push({x,y:0,z:3,c:P.fur2});
    for(let y=1;y<=7;y++){
      if(srnd()<0.6)T.push({x:Math.floor(srnd()*9)-4,y,z:-3,c:srnd()<0.5?P.fur2:P.fur3});
    }

    const Hd=[];
    box(Hd,-3,0,-2,3,4,2,P.fur);
    box(Hd,-2,1,2,2,3,2,P.face);
    box(Hd,-2,1,2,2,1,2,P.face2);
    box(Hd,-3,3,2,3,3,2,P.fur3);
    box(Hd,-1,0,3,1,1,3,P.fur2);
    box(Hd,-1,0,3,1,0,3,P.mouth);
    Hd.push({x:0,y:1,z:4,c:P.face2});
    box(Hd,-2,0,3,-2,1,3,P.horn);
    box(Hd,2,0,3,2,1,3,P.horn);
    box(Hd,-3,0,3,-3,2,3,P.fur3);
    box(Hd,3,0,3,3,2,3,P.fur3);
    for(const sx of[-1,1]){
      Hd.push({x:3*sx,y:5,z:0,c:P.fur3});
      Hd.push({x:3*sx,y:6,z:0,c:P.horn});
      Hd.push({x:3*sx,y:7,z:-1,c:P.horn});
    }
    for(let x=-2;x<=2;x++){
      if(srnd()<0.6)Hd.push({x,y:5,z:Math.floor(srnd()*3)-1,c:P.fur2});
    }

    const A=[];
    box(A,-1,-6,-1,1,-1,1,P.fur);
    box(A,-1,0,-1,1,0,1,P.fur2);
    for(let y=-5;y<=-2;y++){
      if(srnd()<0.5)A.push({x:Math.floor(srnd()*3)-1,y,z:-2,c:P.fur2});
    }

    const F=[];
    box(F,-1,-5,-1,1,-1,1,P.fur);
    box(F,-1,-7,-1,1,-5,1,P.fur2);
    box(F,-1,-5,-1,1,-5,1,P.fur3);
    F.push({x:-1,y:-6,z:2,c:P.fur3},{x:1,y:-6,z:2,c:P.fur3});
    for(const x of[-1,0,1])F.push({x,y:-8,z:0,c:P.claw},{x,y:-8,z:1,c:P.claw});

    const L=[];
    box(L,-1,-3,-1,1,-1,1,P.fur);
    L.push({x:0,y:-2,z:-2,c:P.fur2});

    const Sn=[];
    box(Sn,-1,-3,-1,1,-1,1,P.fur2);
    box(Sn,-1,-4,-2,1,-3,2,P.fur3);
    for(const x of[-1,0,1])Sn.push({x,y:-4,z:3,c:P.claw});

    GEO={T:voxGeo(T,S),H:voxGeo(Hd,S),A:voxGeo(A,S),
         F:voxGeo(F,S),L:voxGeo(L,S),S:voxGeo(Sn,S)};
    return GEO;
  }

  /* ---------- interpolasi keyframe (persis tr() di file asli) ---------- */
  function tr(t,keys){
    if(t<=keys[0][0])return keys[0][1];
    for(let i=0;i<keys.length-1;i++){
      const t0=keys[i][0],v0=keys[i][1],t1=keys[i+1][0],v1=keys[i+1][1];
      if(t<=t1){
        let u=(t-t0)/(t1-t0);
        u=u*u*(3-2*u);
        return v0+(v1-v0)*u;
      }
    }
    return keys[keys.length-1][1];
  }

  const CH=['rootY','rootZ','spin','torsoX','torsoY','torsoZ','headX','headY','headZ',
            'shLX','shLY','shLZ','elL','shRX','shRY','shRZ','elR','hipL','kneeL','hipR','kneeR'];
  const zero=()=>{const o={};for(const k of CH)o[k]=0;return o;};

  /* ---------- POSE LOCOMOTION (idle / walk / run) ---------- */
  function poseIdle(t,tgt){
    tgt.torsoX=0.07+0.035*Math.sin(t*1.5);
    tgt.torsoY=0.06*Math.sin(t*0.6);
    tgt.torsoZ=0.02*Math.sin(t*0.8);
    tgt.headX=-0.05+0.05*Math.sin(t*0.9);
    tgt.headY=0.28*Math.sin(t*0.45)+0.1*Math.sin(t*1.7);
    tgt.shLX=-0.16+0.06*Math.sin(t*1.5+1.2);
    tgt.shRX=-0.16+0.06*Math.sin(t*1.5+2.6);
    tgt.shLZ=-0.1;tgt.shRZ=0.1;
    tgt.elL=-0.32+0.07*Math.sin(t*1.5+0.5);
    tgt.elR=-0.32+0.07*Math.sin(t*1.5+1.9);
    tgt.kneeL=tgt.kneeR=0.08;
    tgt.rootY=0.02*Math.sin(t*1.5);
  }
  function poseWalk(p,tgt){
    const s=Math.sin(p);
    tgt.hipL=-0.6*s;tgt.hipR=0.6*s;
    tgt.kneeL=0.12+0.7*Math.max(0,Math.sin(p+2.2));
    tgt.kneeR=0.12+0.7*Math.max(0,Math.sin(p+2.2-Math.PI));
    tgt.torsoX=0.15+0.03*Math.sin(2*p);
    tgt.torsoY=0.14*s;tgt.torsoZ=0.045*Math.cos(p);
    tgt.headX=-0.05;tgt.headY=-0.12*s;
    tgt.shLX=0.5*s;tgt.shRX=-0.5*s;
    tgt.shLZ=-0.12;tgt.shRZ=0.12;
    tgt.elL=-0.35-0.35*Math.max(0,-s);
    tgt.elR=-0.35-0.35*Math.max(0,s);
    tgt.rootY=0.05*(0.5+0.5*Math.cos(2*p));
  }
  function poseRun(p,tgt){
    const s=Math.sin(p);
    tgt.hipL=-1.0*s;tgt.hipR=1.0*s;
    tgt.kneeL=0.2+1.05*Math.max(0,Math.sin(p+2.2));
    tgt.kneeR=0.2+1.05*Math.max(0,Math.sin(p+2.2-Math.PI));
    tgt.torsoX=0.36+0.05*Math.sin(2*p);
    tgt.torsoY=0.18*s;tgt.torsoZ=0.06*Math.cos(p);
    tgt.headX=-0.14;tgt.headY=-0.15*s;
    tgt.shLX=0.9*s;tgt.shRX=-0.9*s;
    tgt.shLZ=-0.16;tgt.shRZ=0.16;
    tgt.elL=-1.05-0.3*Math.max(0,-s);
    tgt.elR=-1.05-0.3*Math.max(0,s);
    tgt.rootY=0.11*(0.5+0.5*Math.cos(2*p))-0.02;
  }

  /* ---------- POSE AKSI (keyframe persis file asli) ---------- */
  const JD=1.95;
  function poseJump(tJ,tgt){
    tgt.rootY=tr(tJ,[[0,0],[.16,-.28],[.24,-.34],[.5,1.3],[.66,1.9],[.9,1.05],[1.03,.1],[1.06,-.32],[1.4,-.12],[JD,0]]);
    tgt.rootZ=tr(tJ,[[0,0],[.24,0],[.66,1.6],[1.06,3.1],[1.45,3.1],[JD,0]]);
    tgt.torsoX=tr(tJ,[[0,.06],[.16,.44],[.32,-.2],[.62,-.26],[.95,-.05],[1.06,.55],[1.45,.32],[JD,.06]]);
    const arm=tr(tJ,[[0,-.15],[.16,.6],[.32,1.9],[.6,2.75],[.92,2.8],[1.0,-.3],[1.06,-1.05],[1.25,-.8],[JD,-.15]]);
    tgt.shLX=tgt.shRX=arm;
    tgt.elL=tgt.elR=tr(tJ,[[0,-.3],[.6,-.55],[1.0,-.25],[1.06,-.4],[JD,-.3]]);
    tgt.shLZ=tr(tJ,[[0,-.1],[.6,-.28],[1.06,-.08],[JD,-.1]]);tgt.shRZ=-tgt.shLZ;
    tgt.hipL=tr(tJ,[[0,0],[.16,-.75],[.24,-.95],[.5,-1.15],[.9,-.55],[1.06,-.95],[1.45,-.35],[JD,0]]);
    tgt.hipR=tr(tJ,[[0,0],[.16,-.7],[.24,-.9],[.5,-1.05],[.9,-.5],[1.06,-.9],[1.45,-.3],[JD,0]]);
    tgt.kneeL=tr(tJ,[[0,.08],[.16,1.15],[.24,1.35],[.55,1.75],[.9,1.5],[1.06,1.3],[1.5,.45],[JD,.08]]);
    tgt.kneeR=tr(tJ,[[0,.08],[.16,1.1],[.24,1.3],[.55,1.7],[.9,1.45],[1.06,1.25],[1.5,.4],[JD,.08]]);
    tgt.headX=tr(tJ,[[0,0],[.3,-.35],[.92,-.28],[1.06,.4],[1.5,.12],[JD,0]]);
  }
  function poseAtk1(tA,tgt){
    tgt.torsoY=tr(tA,[[0,0],[.14,-.85],[.22,-.95],[.44,.7],[.75,0]]);
    tgt.torsoX=tr(tA,[[0,.08],[.2,.22],[.44,.3],[.75,.08]]);
    tgt.headY=tr(tA,[[0,0],[.18,-.35],[.44,.4],[.75,0]]);
    tgt.headX=tr(tA,[[0,0],[.2,.05],[.44,.12],[.75,0]]);
    tgt.shRX=tr(tA,[[0,-.15],[.14,.8],[.22,.9],[.44,-.75],[.75,-.15]]);
    tgt.shRZ=tr(tA,[[0,.12],[.16,1.3],[.44,1.15],[.75,.12]]);
    tgt.shRY=tr(tA,[[0,0],[.2,-.4],[.44,.5],[.75,0]]);
    tgt.elR=tr(tA,[[0,-.3],[.16,-1.15],[.26,-.85],[.44,-.2],[.75,-.3]]);
    tgt.shLX=-0.55;tgt.elL=-0.85;tgt.shLZ=-0.25;
    tgt.rootY=tr(tA,[[0,0],[.2,-.13],[.44,-.17],[.75,0]]);
    tgt.hipL=tgt.hipR=tr(tA,[[0,0],[.2,-.3],[.75,0]]);
    tgt.kneeL=tgt.kneeR=tr(tA,[[0,.08],[.2,.55],[.75,.08]]);
  }
  function poseAtk2(tA,tgt){
    const arm=tr(tA,[[0,-.15],[.2,2.1],[.32,2.9],[.44,2.95],[.52,-1.05],[.66,-.85],[.9,-.15]]);
    tgt.shLX=tgt.shRX=arm;
    tgt.elL=tgt.elR=tr(tA,[[0,-.3],[.3,-.7],[.44,-.55],[.52,-.3],[.9,-.3]]);
    tgt.shLZ=tr(tA,[[0,-.12],[.3,-.32],[.52,-.16],[.9,-.12]]);tgt.shRZ=-tgt.shLZ;
    tgt.torsoX=tr(tA,[[0,.06],[.3,-.3],[.44,-.32],[.52,.52],[.68,.4],[.9,.06]]);
    tgt.headX=tr(tA,[[0,0],[.3,-.32],[.52,.42],[.9,0]]);
    tgt.rootY=tr(tA,[[0,0],[.3,-.06],[.52,-.3],[.7,-.16],[.9,0]]);
    tgt.hipL=tgt.hipR=tr(tA,[[0,0],[.44,-.2],[.52,-.55],[.9,0]]);
    tgt.kneeL=tgt.kneeR=tr(tA,[[0,.08],[.44,.3],[.52,.85],[.9,.08]]);
  }
  function poseAtk3(tA,tgt){
    /* putaran 360° dipakai sebagai rotasi LOKAL (channel `spin`) supaya arah
       hadap mob (mesh.rotation.y, diatur monsters.js) tidak ikut terganggu */
    tgt.spin=tr(tA,[[0,0],[.18,0],[.85,TWO_PI],[1.15,TWO_PI]]);
    tgt.shLZ=tr(tA,[[0,-.12],[.18,-1.5],[.6,-1.55],[.85,-.7],[1.15,-.12]]);tgt.shRZ=-tgt.shLZ;
    tgt.shLX=tgt.shRX=tr(tA,[[0,-.15],[.18,-.4],[.85,-.35],[1.15,-.15]]);
    tgt.elL=tgt.elR=tr(tA,[[0,-.3],[.18,-.12],[.85,-.2],[1.15,-.3]]);
    tgt.rootY=tr(tA,[[0,0],[.18,-.26],[.8,-.22],[1.15,0]]);
    tgt.hipL=tgt.hipR=tr(tA,[[0,0],[.18,-.45],[.8,-.4],[1.15,0]]);
    tgt.kneeL=tgt.kneeR=tr(tA,[[0,.08],[.18,.75],[.8,.65],[1.15,.08]]);
    tgt.torsoX=tr(tA,[[0,.06],[.18,.32],[.8,.28],[1.15,.06]]);
    tgt.headX=0.12;
  }

  const Mob_Yeti={
    SCALE,
    /* durasi tiap aksi (dipakai monsters.js saat memulai serangan) */
    DUR:{jump:JD,atk1:0.75,atk2:0.90,atk3:1.15},
    /* saat mana damage/efek dilepas dalam tiap aksi (detik) */
    HIT:{jump:1.06,atk1:0.22,atk2:0.50,atk3a:0.30,atk3b:0.58},
    /* waktu tolakan lompat (detik) — dipakai monsters.js memberi vel.y */
    JUMP_LAUNCH:0.26,

    /* ---------- MODEL 3D ---------- */
    build(boss){
      const G=buildGeo();
      const g=new THREE.Group();
      g.scale.setScalar(SCALE);
      const parts={};

      /* material baru per yeti supaya flash-hit tidak menular antar mob */
      const fur=new THREE.MeshLambertMaterial({vertexColors:true});
      const vMesh=geo=>{
        const m=new THREE.Mesh(geo,fur);
        m.castShadow=!IS_MOBILE;m.receiveShadow=true;
        return m;
      };

      /* `spinner` menampung seluruh tubuh: dipakai jurus Pusaran Salju 360°
         tanpa mengubah arah hadap mob. */
      const spinner=new THREE.Group();g.add(spinner);parts.spinner=spinner;
      const root=new THREE.Group();spinner.add(root);parts.root=root;

      const torso=new THREE.Group();torso.position.y=7*S;root.add(torso);parts.torso=torso;
      torso.add(vMesh(G.T));

      const head=new THREE.Group();head.position.y=9*S;torso.add(head);parts.head=head;
      head.add(vMesh(G.H));

      /* mata menyala (biru es) — berdenyut lembut di animate */
      const eyeMat=new THREE.MeshBasicMaterial({color:0x00f0ff});
      parts.eyeMat=eyeMat;
      for(const sx of[-1,1]){
        const e=new THREE.Mesh(new THREE.BoxGeometry(1.1*S,0.55*S,0.4*S),eyeMat);
        e.position.set(sx*S,2*S,2.55*S);
        head.add(e);
      }

      const shL=new THREE.Group(),shR=new THREE.Group();
      shL.position.set(-4.6*S,8*S,0);shR.position.set(4.6*S,8*S,0);
      torso.add(shL);torso.add(shR);
      shL.add(vMesh(G.A));shR.add(vMesh(G.A));
      parts.shL=shL;parts.shR=shR;

      const elL=new THREE.Group(),elR=new THREE.Group();
      elL.position.y=-6*S;elR.position.y=-6*S;
      shL.add(elL);shR.add(elR);
      elL.add(vMesh(G.F));elR.add(vMesh(G.F));
      parts.elL=elL;parts.elR=elR;
      /* titik telapak (dipakai FX hantaman keluar dari tangan) */
      const fistL=new THREE.Object3D();fistL.position.y=-8*S;elL.add(fistL);parts.fistL=fistL;
      const fistR=new THREE.Object3D();fistR.position.y=-8*S;elR.add(fistR);parts.fistR=fistR;

      const hipL=new THREE.Group(),hipR=new THREE.Group();
      hipL.position.set(-2.2*S,7*S,0);hipR.position.set(2.2*S,7*S,0);
      root.add(hipL);root.add(hipR);
      hipL.add(vMesh(G.L));hipR.add(vMesh(G.L));
      parts.hipL=hipL;parts.hipR=hipR;

      const kneeL=new THREE.Group(),kneeR=new THREE.Group();
      kneeL.position.y=-3*S;kneeR.position.y=-3*S;
      hipL.add(kneeL);hipR.add(kneeR);
      kneeL.add(vMesh(G.S));kneeR.add(vMesh(G.S));
      parts.kneeL=kneeL;parts.kneeR=kneeR;

      return {mesh:g,parts};
    },

    /* ---------- ANIMASI ---------- */
    animate(m,dt){
      const P=m.parts;if(!P||!P.torso)return;
      const t=(m._yt=(m._yt||0)+dt);
      if(!m._yCur){m._yCur=zero();m._yTgt=zero();}
      const cur=m._yCur,tgt=m._yTgt;
      for(const k of CH)tgt[k]=0;

      const act=m.yAct;
      if(act){
        const tA=m.yActT||0;
        if(act==='jump')poseJump(tA,tgt);
        else if(act==='atk1')poseAtk1(tA,tgt);
        else if(act==='atk2')poseAtk2(tA,tgt);
        else poseAtk3(tA,tgt);
      }else{
        /* ---------- GAIT dari kecepatan nyata ----------
           Ambang dibuat RELATIF terhadap kecepatan puncak mob supaya boss
           (yang lebih lambat tapi berkaki lebih panjang) tetap bisa masuk pose
           berlari, sama seperti penanganan gait kumbang. */
        const speed=Math.hypot(m.vel.x,m.vel.z);
        const top=Math.max(0.6,m.speed||3);
        const rel=clamp(speed/top,0,1.4);
        /* frekuensi langkah = kecepatan ÷ panjang langkah (panjang langkah
           sebanding tinggi pinggul), jadi kaki tidak pernah "sliding" */
        const wScale=(m.mesh&&m.mesh.scale&&m.mesh.scale.x)?m.mesh.scale.x:SCALE;
        const stride=Math.max(0.5,7*S*wScale*1.9);
        m._yPhase=(m._yPhase||0)+clamp(speed/stride,0,2.6)*Math.PI*2*dt;
        if(speed<0.2)poseIdle(t,tgt);
        else if(rel<0.62)poseWalk(m._yPhase,tgt);
        else poseRun(m._yPhase,tgt);
      }

      /* pelicin: aksi lebih tegas (K besar), locomotion lebih lembut */
      const K=act?22:16;
      const a=1-Math.exp(-dt*K);
      for(const k of CH)cur[k]+=(tgt[k]-cur[k])*a;

      /* rootY: hanya bagian NEGATIF (kuda-kuda menekuk) dipakai sebagai offset
         visual. Bagian positif (melayang) sengaja dibuang karena lompatan
         sungguhan sudah ditangani fisika mob (m.vel.y di monsters.js) — kalau
         keduanya dipakai, yeti akan terlihat melompat dua kali lipat. */
      P.root.position.y=Math.min(0,cur.rootY);
      P.root.position.z=0;
      P.spinner.rotation.y=cur.spin;

      P.torso.rotation.set(cur.torsoX,cur.torsoY,cur.torsoZ);
      P.head.rotation.set(cur.headX,cur.headY,cur.headZ);
      P.shL.rotation.set(cur.shLX,cur.shLY,cur.shLZ);P.elL.rotation.x=cur.elL;
      P.shR.rotation.set(cur.shRX,cur.shRY,cur.shRZ);P.elR.rotation.x=cur.elR;
      P.hipL.rotation.x=cur.hipL;P.kneeL.rotation.x=cur.kneeL;
      P.hipR.rotation.x=cur.hipR;P.kneeR.rotation.x=cur.kneeR;

      /* mata berdenyut; saat kena hit warnanya diambil alih flash Monsters */
      if(P.eyeMat&&m.flash<=0){
        const k=0.8+0.25*Math.sin(t*3);
        P.eyeMat.color.setRGB(0,0.94*k,k);
      }
    },

    /* ---------- EFEK: hantaman tanah (groundBurst di file asli) ---------- */
    groundBurst(m,x,z,big){
      const gy=(typeof World!=='undefined')?World.groundAt(x,z,m.pos.y+2):m.pos.y;
      if(typeof FX==='undefined')return;
      FX.ring(x,gy+0.07,z,0x00b4ff,0.5,1.35*big*2.2);
      FX.ring(x,gy+0.06,z,0x90e0ef,0.6,1.0*big*2.2);
      FX.debris(new THREE.Vector3(x,gy+0.2,z),0xdff0ff,big>1?18:9,big>1?3.4:2.2);
      if(FX.groundWave)
        FX.groundWave(x,gy,z,{mode:'radial',radius:1.6*big*1.9,color:0xcfe0f2,amp:0.5*big});
    },
    /* sabetan cakar: crescent biru es di depan yeti */
    slashFX(m,x,y,z,yaw,size){
      if(typeof PortFX!=='undefined'&&PortFX.crescent)
        PortFX.crescent(x,y,z,yaw,-1.2,0,2.2,size,0.26,0x00b4ff);
      if(typeof FX!=='undefined')
        FX.debris(new THREE.Vector3(x,y,z),0xe0f7ff,6,2.2);
    },
  };

  window.Mob_Yeti=Mob_Yeti;
  return Mob_Yeti;
})();
