'use strict';
/* =============================================================================
   ENTITAS MOB: REAPER (⚰ Voxel Black Ghost / Grim Reaper)
   -----------------------------------------------------------------------------
   Diporting dari "NEW MODEL/reaper.html". Hantu hitam berjubah yang MELAYANG
   (tanpa kaki) sambil menggenggam sabit besar dengan dua tangan.

   Mob ini KHUSUS DUNGEON: tidak pernah ikut undian mob biome (lihat
   BIOME_INFO.mobs) — hanya dipanggil Dungeon.update sebagai penjaga reruntuhan.
   Ia MENGGANTI wujud "Wraith" lama (jubah hitam polos) yang dulu hanya menempel
   sebagai skin pada mob biasa; sekarang reaper adalah tipe mob penuh dengan
   model, animasi, dan serangannya sendiri.

   SELURUH 6 AKSI dari file asli dipakai di dalam game:
     idle                                  → melayang di tempat, sabit di depan
     move (MELAYANG)                        → meluncur, jubah & jumbai berkibar
     a1  'Sabit Horizontal'                 → tebasan mendatar lebar
     a2  'Tebasan Balik'                    → tebasan balik arah (backhand)
     a3  'Hukuman Maut'                     → sabit diangkat lalu dihempas + AoE
     skill '3 Arwah Menyerang'              → memanggil 3 arwah pemburu

   Rig & keyframe dipertahankan apa adanya (pose* di bawah persis file asli,
   memakai kurva ss/eo/seg/lerp yang sama). Yang diubah hanya cara aksi
   dijalankan: timeline dikendalikan js/monsters.js (aiReaper) lewat
   m.rAct / m.rActT, dan damage dilepas pada waktu HIT di bawah.

   SKALA: file asli memakai `model.scale=0.24` di dalam dunia yang groundnya y=0
   dan hover 2.28 satuan. Di sini strukturnya dipertahankan (model 0.24 di dalam
   grup pelayang) lalu SELURUHNYA diskalakan W=0.70 supaya tinggi totalnya ±3
   blok — sebanding yeti. Semua rumus hover dari file asli tetap dalam satuan
   "dunia demo" sehingga keyframe aslinya tidak perlu diubah sama sekali.
   ============================================================================= */

const Mob_Reaper=(()=>{

  /* ---------- konstanta skala ----------
     W       = pengali dunia (satuan demo → blok game)
     REST_Y  = offset diam grup pelayang (satuan demo) supaya ujung jubah
               menggantung ±0.35 blok di atas tanah — jelas melayang, tapi tidak
               mengambang terlalu tinggi seperti di halaman demo.
     HOV_REST= nilai hover diam di file asli; dipakai sebagai titik nol supaya
               seluruh keyframe hover aslinya bisa dipakai langsung. */
  const W=0.70;
  const REST_Y=-0.34;
  const HOV_REST=2.28;
  const MODEL_S=0.24;                 // skala internal model (persis file asli)

  /* ---------- helper kurva (persis file asli) ---------- */
  const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
  const cl01=v=>cl(v,0,1);
  const ss=v=>{v=cl01(v);return v*v*(3-2*v);};
  const eo=v=>{v=cl01(v);return 1-Math.pow(1-v,3);};
  const lr=(a,b,t)=>a+(b-a)*t;
  const seg=(w,a,b)=>cl01((w-a)/(b-a));

  /* random deterministik untuk variasi kecil (menggantikan Math.random di
     file asli supaya bentuk model selalu sama) */
  const hash3=(x,y,z)=>{
    const v=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;
    return v-Math.floor(v);
  };

  /* ---------- palet (persis file asli) ---------- */
  const ROBE=[0x15151d,0x1b1b26,0x101018];
  const HOOD=0x131319,HOOD_D=0x0b0b10,TRIM=0x46297a,TRIM_B=0x7b4fd6;
  const HAND=0xa9bccf,SHAFT=0x2a221d,SHAFT_D=0x1e1815;
  const BLADE=0xdde3ec,BLADE_D=0xa7b1c3,EDGE=0xffffff,BONE=0xd8dfe9;
  const RUNE_C=0x8b5cf6;

  /* ---------- wajah kubus (persis file asli) ---------- */
  const FACES=[
    {n:[1,0,0], v:[[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5],[.5,-.5,.5]]},
    {n:[-1,0,0],v:[[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5],[-.5,-.5,-.5]]},
    {n:[0,1,0], v:[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]]},
    {n:[0,-1,0],v:[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]]},
    {n:[0,0,1], v:[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]},
    {n:[0,0,-1],v:[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]}
  ];
  function buildGeoFrom(boxes){
    const pos=[],nor=[],col=[],idx=[];
    const C=new THREE.Color();
    boxes.forEach((b,i)=>{
      C.setHex(b.c);
      const jit=1-((i*37)%5)*0.014;
      FACES.forEach(f=>{
        const base=pos.length/3;
        const sh=f.n[1]===1?1:f.n[1]===-1?.72:f.n[0]!==0?.86:(f.n[2]>0?.96:.9);
        f.v.forEach(o=>{
          pos.push(b.x+o[0]*b.sx,b.y+o[1]*b.sy,b.z+o[2]*b.sz);
          nor.push(f.n[0],f.n[1],f.n[2]);
          col.push(C.r*sh*jit,C.g*sh*jit,C.b*sh*jit);
        });
        idx.push(base,base+1,base+2,base,base+2,base+3);
      });
    });
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
    g.setIndex(idx);
    return g;
  }
  /* kumpulan kotak voxel (VB di file asli) */
  class VB{
    constructor(){this.b=[];}
    box(x,y,z,c,sx=1,sy=1,sz=1){this.b.push({x,y,z,c,sx,sy,sz});return this;}
    layer(y,rows,map){
      const H=rows.length,W2=rows[0].length,cx=(W2-1)/2,cz=(H-1)/2;
      for(let zi=0;zi<H;zi++)for(let xi=0;xi<rows[zi].length;xi++){
        const ch=rows[zi][xi];if(ch==='.')continue;
        let c=typeof map==='function'?map(ch,xi,zi):map[ch];
        if(c==null)continue;
        if(Array.isArray(c))c=c[(xi*7+zi*13+((y*5|0)+50))%c.length];
        this.box(xi-cx,y,zi-cz,c);
      }
      return this;
    }
    geo(){return buildGeoFrom(this.b);}
  }

  /* =========================================================================
     GEOMETRI (dibangun SEKALI, dipakai ulang semua reaper)
     ========================================================================= */
  let GEO=null;
  function buildGeo(){
    if(GEO)return GEO;

    /* --- torso: jubah bahu lebar melebar ke bawah --- */
    const TB=new VB();
    const robeMap=ch=>ch==='K'?ROBE:ch==='P'?TRIM:ch==='D'?HOOD_D:null;
    TB.layer(2,[".KKK.","KKKKK","KKKKK","KKKKK",".KKK."],robeMap);
    TB.layer(1,[".KKK.","KKKKK","KKKKK","KKKKK",".KKK."],robeMap);
    TB.layer(0,[".KKK.","KKKKK","KKKKK","KKKKK","PPPPP"],robeMap);
    TB.layer(-1,[".KKK.","KKKKK","KKKKK","KKKKK",".KKK."],robeMap);
    const W7=[".KKKKK.","KKKKKKK","KKKKKKK","KKKKKKK","KKKKKKK","KKKKKKK",".KKKKK."];
    TB.layer(-2,W7,robeMap);TB.layer(-3,W7,robeMap);TB.layer(-4,W7,robeMap);
    TB.layer(-5,["KK.K.KK","K.KKK.K","KK.K.KK","KKKKKKK","K.KKK.K","KK.K.KK","K.K.K.K"],robeMap);
    TB.box(-3.1,2,0,HOOD_D,1.5,1,1.5);TB.box(3.1,2,0,HOOD_D,1.5,1,1.5);
    TB.box(-3.1,2.8,0,TRIM,.9,.4,.9); TB.box(3.1,2.8,0,TRIM,.9,.4,.9);

    /* --- kepala: tudung dalam gelap, puncak menjuntai --- */
    const HB=new VB();
    HB.layer(0,[".KKK.","K...K","K...K","K...K",".PPP."],{K:HOOD,P:TRIM});
    HB.layer(1,["KKKKK","K...K","K...K","K...K","....."],{K:HOOD});
    HB.layer(2,["KKKKK","K...K","K...K","K...K","....."],{K:HOOD});
    HB.layer(3,["KKKKK","KKKKK","KKKKK","KKKKK","DDDDD"],{K:HOOD,D:HOOD_D});
    HB.layer(4,[".KKK.","KKKKK","KKKKK","KKKKK",".KKK."],{K:HOOD});
    HB.layer(5,[".....",".KKK.","KKKKK",".KKK.","....."],{K:HOOD});
    HB.layer(6,[".....","..K..",".KKK.","..K..","....."],{K:HOOD});
    HB.layer(7,["..K..",".....",".....",".....","....."],{K:HOOD_D});
    HB.layer(8,["..K..",".....",".....",".....","....."],{K:HOOD_D});
    HB.box(0,1.7,-1.05,0x05050a,3.3,2.7,.7);

    /* --- mata (material sendiri supaya bisa menyala) --- */
    const EB=new VB();
    EB.box(-.85,2.05,-.25,0xffffff,.55,.34,.45);
    EB.box(.85,2.05,-.25,0xffffff,.55,.34,.45);

    /* --- lengan (dipakai kiri & kanan) --- */
    const UB=new VB();
    UB.box(0,.2,0,HOOD_D,1.15,.7,1.15);
    UB.box(0,-1,0,ROBE[1],1.1,1,1.1);
    UB.box(0,-2,0,ROBE[2],1.05,1,1.05);
    const FB=new VB();
    FB.box(0,-.8,0,ROBE[2],1,1,1);
    FB.box(0,-1.7,0,HOOD_D,.95,1,.95);
    FB.box(0,-2.35,0,TRIM,1.02,.3,1.02);
    FB.box(0,-2.95,0,HAND,.8,.85,.8);
    FB.box(0,-3.42,.18,HAND,.55,.4,.45);

    /* --- SABIT: bilah dibangun MENGHADAP +Z (depan) --- */
    const SB=new VB();
    for(let y=-3;y<=13;y++)SB.box(0,y,0,y%2?SHAFT:SHAFT_D,.55,1,.55);
    SB.box(0,-3.7,0,BONE,.4,.8,.4);
    [[.6,5,0],[-.6,5,0],[0,5,.6],[0,5,-.6]].forEach(p=>SB.box(p[0],p[1],p[2],TRIM_B,.32,.4,.32));
    SB.box(0,13,.7,SHAFT_D,.8,1.1,1.7);                       // socket puncak
    [[0,14,2],[0,14,3],[0,13.2,4]].forEach(p=>SB.box(p[0],p[1],p[2],BLADE_D,1,.72,1));
    [[0,13,2],[0,13,3],[.4,12.4,4],[.8,12,5],[1.1,11.4,5],[1.5,11,6],[1.7,10.4,6],[2.1,10,7]]
      .forEach(p=>SB.box(p[0],p[1],p[2],BLADE,.95,1.05,1.05));
    [[.2,11.6,3],[.6,11,4],[1,10.4,5],[1.4,9.6,6]].forEach(p=>SB.box(p[0],p[1],p[2],EDGE,.42,.62,1));
    SB.box(2.1,9.2,7,EDGE,.45,.95,.75);
    /* rune pada tangkai & bilah (material menyala sendiri) */
    const RB=new VB();
    RB.box(.45,7.5,0,RUNE_C,.28,.42,.42);
    RB.box(.45,10.5,0,RUNE_C,.28,.42,.42);
    RB.box(0,13.6,1.2,RUNE_C,.5,.5,.5);

    /* --- satu ruas jumbai jubah (3 ukuran) --- */
    const tailGeo=[];
    for(let j=0;j<3;j++){
      const sz=.95-j*.22;
      const B=new VB();
      B.box(0,-.42,0,ROBE[j%3],sz,.9,sz);
      if(j===2)B.box(0,-.95,0,TRIM,.4,.5,.4);
      tailGeo.push(B.geo());
    }

    GEO={T:TB.geo(),H:HB.geo(),E:EB.geo(),U:UB.geo(),F:FB.geo(),
         S:SB.geo(),R:RB.geo(),tails:tailGeo};
    return GEO;
  }

  /* ---------- posisi pivot jumbai (persis file asli) ---------- */
  const TAIL_POS=[[0,-2.6],[-2.3,-.6],[2.3,-.6],[0,1.6]];
  const TAIL_DIR=[0,1,-1,0.35];

  /* ---------- channel animasi (persis file asli) ---------- */
  const CH=['hov','lean','twist','headX','headY','shRx','shRy','shRz','elR',
            'shLx','shLz','elL','scyX','scyY','scyZ','tailA','tailS','tailT',
            'tailSp','flare','bank'];
  const zero=()=>{const o={};for(const k of CH)o[k]=0;return o;};

  /* ---------- POSE DASAR: sabit di depan, dua tangan ---------- */
  function baseIdle(T,g){
    g.hov=2.28+Math.sin(T*1.5)*.15;
    g.lean=.025*Math.sin(T*1.5+1);g.twist=.06*Math.sin(T*.8);
    g.headX=.04*Math.sin(T*1.1);g.headY=.16*Math.sin(T*.6)+.05*Math.sin(T*1.9);
    g.shRx=-.55+.04*Math.sin(T*1.5+.4);g.shRy=.1;g.shRz=.45;g.elR=-.85+.05*Math.sin(T*1.5);
    g.shLx=-.42+.05*Math.sin(T*1.5+2.1);g.shLz=-.55;g.elL=-.95+.06*Math.sin(T*1.7+1);
    g.scyX=.12+.04*Math.sin(T*1.3);g.scyY=-.12+.05*Math.sin(T*1.1);g.scyZ=.05;
    g.tailA=.22;g.tailS=2.1;g.tailT=.12;g.tailSp=0;g.flare=0;g.bank=0;
  }
  function baseMove(T,g){
    g.hov=2.38+Math.sin(T*3.4)*.2;
    g.lean=.22+.03*Math.sin(T*3.4);g.twist=.05*Math.sin(T*3.4);
    g.headX=.03*Math.sin(T*2.2);g.headY=.1*Math.sin(T*1.2);
    g.shRx=-.6+.14*Math.sin(T*3.4+Math.PI);g.shRy=.05;g.shRz=.5;g.elR=-.9;
    g.shLx=-.45+.25*Math.sin(T*3.4);g.shLz=-.55;g.elL=-.9+.2*Math.sin(T*3.4+1);
    g.scyX=.08;g.scyY=-.3;g.scyZ=.06;
    g.tailA=.3;g.tailS=4.4;g.tailT=.6;g.tailSp=0;g.flare=0;g.bank=.13;
  }

  /* ---------- POSE AKSI (keyframe persis file asli) ---------- */
  function poseA1(w,g){                      // ayunan horizontal lebar
    const wind=ss(seg(w,0,.26)),sw=eo(seg(w,.26,.44)),rec=ss(seg(w,.47,1));
    let s=lr(0,-1,wind);s=lr(s,1.18,sw);s=lr(s,0,rec);
    g.twist=s*.5;g.lean=.15*sw*(1-rec*.7);
    g.shRy=s*1.6;g.shRx=-.6-.2*sw+.1*rec;g.shRz=.45-.18*sw;
    g.elR=lr(lr(-.85,-.25,sw),-.85,rec);
    g.shLx=-.42+.35*sw*(1-rec);
    g.scyY=-.12+s*.9+Math.sin(Math.PI*ss(seg(w,.24,.52)))*.5;
    g.scyX=.12-.1*sw;g.headY=-s*.35;
    g.hov-=.12*ss(seg(w,.26,.5))*(1-rec*.6);
    g.tailA=.3;g.tailS=3.6;
  }
  function poseA2(w,g){                      // tebasan balik
    const wind=ss(seg(w,0,.24)),sw=eo(seg(w,.24,.42)),rec=ss(seg(w,.45,1));
    let s=lr(0,1,wind);s=lr(s,-1.22,sw);s=lr(s,0,rec);
    g.twist=s*.55;g.lean=.12*sw*(1-rec*.6);
    g.shRy=s*1.5;g.shRz=.45-.15*sw;
    let ax=lr(-.6,-.45,wind);ax=lr(ax,-1.55,sw);ax=lr(ax,-.6,rec);
    g.shRx=ax;
    g.elR=lr(lr(-.85,-.3,sw),-.85,rec);
    g.scyY=-.12+s*.95-Math.sin(Math.PI*ss(seg(w,.22,.5)))*.5;
    g.scyX=.12-.25*sw+.1*rec;g.scyZ=.05-.12*sw;
    g.headY=-s*.3;
    g.hov+=.1*sw*(1-rec)-.08*wind;
    g.tailA=.3;g.tailS=3.6;
  }
  function poseA3(w,g){                      // angkat → hempas vertikal
    const rise=ss(seg(w,0,.32)),slam=Math.pow(seg(w,.34,.5),1.7),rec=ss(seg(w,.58,1));
    g.hov+=.85*rise*(1-rec*.4)-1.1*slam*(1-rec);
    g.lean=-.14*rise*(1-slam)+.5*slam*(1-rec*.7);
    let arm=lr(-.6,-2.45,rise);arm=lr(arm,.35,slam);arm=lr(arm,-.6,rec);
    g.shRx=arm;g.shRy=0;g.shRz=.45-.3*rise;
    g.elR=lr(lr(-.85,-.15,rise),.1,slam);
    g.shLx=lr(-.42,-2.1,rise*(1-slam))*(1-rec);g.shLz=-.55+.3*rise;
    let sc=lr(.12,-2.1,rise);sc=lr(sc,.8,slam);sc=lr(sc,.12,rec);
    g.scyX=sc;g.scyY=-.12;g.scyZ=.05;
    g.headX=-.15*rise*(1-slam)+.2*slam*(1-rec);
    g.tailSp=.55*rise*(1-rec);g.tailA=.35;g.tailS=3.6;g.tailT=.2;
    g.flare=rise*(1-rec*.5)*.8;
  }
  function poseSkill(w,g){                   // angkat sabit, panggil 3 arwah
    const ch=ss(seg(w,0,.16)),rel=ss(seg(w,.78,.9)),rec=ss(seg(w,.88,1));
    g.hov+=.45*ch*(1-rel);
    g.shRx=lr(-.6,-2.35,ch*(1-rec));g.elR=lr(-.85,-.2,ch);
    g.shRz=.45-.25*ch;
    g.scyX=lr(.12,-2.2,ch*(1-rec));g.scyY=-.12;g.scyZ=.05;
    g.shLx=-.42-.35*ch;g.shLz=-.55-.4*ch*(1-rec);
    g.lean=-.1*ch*(1-rel);
    g.tailA=.28+.25*ch;g.tailS=3.2;g.tailSp=.75*ch*(1-rec);
    g.flare=ch*(1-rec*.5);
  }

  const DUR={a1:.78,a2:.74,a3:1.12,skill:3.4};

  const Mob_Reaper={
    W,DUR,
    /* saat damage/efek dilepas dalam tiap aksi (DETIK).
       Diambil dari ambang `w` di file asli dikali durasinya:
         a1  w>=.37  × .78  = 0.29
         a2  w>=.34  × .74  = 0.25
         a3  w>=.28  × 1.12 = 0.31 (getaran awal), w>=.53 = 0.59 (hempasan)
         skill w>=.16/.21/.26 × 3.4 = 0.54 / 0.71 / 0.88 (tiga arwah) */
    HIT:{a1:0.29,a2:0.25,a3a:0.31,a3b:0.59,s0:0.54,s1:0.71,s2:0.88},
    SPIR_ANG:[-.75,0,.75],

    /* ---------- MODEL 3D ---------- */
    build(boss){
      const G=buildGeo();
      const g=new THREE.Group();
      g.scale.setScalar(W);
      const parts={};

      /* material per reaper supaya flash-hit tidak menular antar mob */
      const robeMat=new THREE.MeshLambertMaterial({vertexColors:true});
      const eyeMat=new THREE.MeshBasicMaterial({color:0x74f0ff});
      const runeMat=new THREE.MeshBasicMaterial({color:RUNE_C});
      const amuletMat=new THREE.MeshBasicMaterial({color:0x9d5cff});
      parts.eyeMat=eyeMat;parts.runeMat=runeMat;parts.amuletMat=amuletMat;
      const vm=geo=>{
        const m=new THREE.Mesh(geo,robeMat);
        m.castShadow=!IS_MOBILE;m.receiveShadow=true;
        return m;
      };

      /* float: grup pelayang (satuan dunia demo) — jubah tidak menyentuh tanah */
      const float=new THREE.Group();float.position.y=REST_Y;g.add(float);
      parts.float=float;
      /* model: skala internal 0.24 seperti file asli */
      const model=new THREE.Group();model.scale.setScalar(MODEL_S);float.add(model);
      parts.model=model;

      const torso=new THREE.Group();torso.position.set(0,11,0);model.add(torso);
      parts.torso=torso;
      torso.add(vm(G.T));

      /* amulet ungu di dada */
      const amulet=new THREE.Mesh(new THREE.BoxGeometry(.55,.55,.3),amuletMat);
      amulet.position.set(0,1.15,2.42);amulet.rotation.y=Math.PI/4;torso.add(amulet);

      const head=new THREE.Group();head.position.set(0,2,0);torso.add(head);
      parts.head=head;
      head.add(vm(G.H));
      const eyes=new THREE.Mesh(G.E,eyeMat);head.add(eyes);parts.eyes=eyes;

      /* jumbai jubah: 4 rantai × 3 ruas */
      const tails=[];
      for(let i=0;i<TAIL_POS.length;i++){
        const p=TAIL_POS[i];
        const pivot=new THREE.Group();pivot.position.set(p[0],-5,p[1]);
        torso.add(pivot);
        const segs=[];let parent=pivot;
        for(let j=0;j<3;j++){
          const sg=new THREE.Group();if(j>0)sg.position.y=-.85;
          sg.add(vm(G.tails[j]));
          parent.add(sg);parent=sg;segs.push(sg);
        }
        tails.push({segs,ph:i*1.7,dir:TAIL_DIR[i]});
      }
      parts.tails=tails;

      /* lengan: kanan menggenggam sabit, kiri menopang */
      const mkArm=withScythe=>{
        const ag=new THREE.Group();
        ag.add(vm(G.U));
        const el=new THREE.Group();el.position.set(0,-2.9,0);ag.add(el);
        el.add(vm(G.F));
        let scy=null;
        if(withScythe){
          scy=new THREE.Group();scy.position.set(0,-2.95,0);el.add(scy);
          scy.add(vm(G.S));
          scy.add(new THREE.Mesh(G.R,runeMat));
          /* titik mata bilah (dipakai FX tebasan keluar dari ujung sabit) */
          const tip=new THREE.Object3D();tip.position.set(2.1,9.2,7);scy.add(tip);
          parts.tip=tip;
        }
        return {g:ag,el,scy};
      };
      const armR=mkArm(true); armR.g.position.set(-3.1,1.2,0);torso.add(armR.g);
      const armL=mkArm(false);armL.g.position.set(3.1,1.2,0); torso.add(armL.g);
      parts.armR=armR;parts.armL=armL;

      return {mesh:g,parts};
    },

    /* ---------- ANIMASI ---------- */
    animate(m,dt){
      const P=m.parts;if(!P||!P.torso)return;
      const T=(m._rt=(m._rt||0)+dt);
      if(!m._rCur){m._rCur=zero();m._rTgt=zero();
        /* mulai dari pose diam supaya tidak "meledak" dari nol di frame pertama */
        baseIdle(0,m._rCur);
      }
      const cur=m._rCur,tgt=m._rTgt;
      for(const k of CH)tgt[k]=0;

      /* pose dasar: melayang bila sedang bergerak, diam bila tidak */
      const speed=Math.hypot(m.vel.x,m.vel.z);
      if(speed>0.35)baseMove(T,tgt);else baseIdle(T,tgt);

      const act=m.rAct;
      if(act){
        const w=cl01((m.rActT||0)/(DUR[act]||0.9));
        if(act==='a1')poseA1(w,tgt);
        else if(act==='a2')poseA2(w,tgt);
        else if(act==='a3')poseA3(w,tgt);
        else poseSkill(w,tgt);
      }
      /* kilau tambahan sesaat setelah hit (diisi monsters.js) */
      tgt.flare+=(m._rFlare||0);

      const K=act?15:8;
      const a=1-Math.exp(-dt*K);
      for(const k of CH)cur[k]+=(tgt[k]-cur[k])*a;
      m._rFlare=Math.max(0,(m._rFlare||0)-dt*2.2);

      /* --- terapkan pose --- */
      P.float.position.y=REST_Y+(cur.hov-HOV_REST);
      P.model.rotation.z=cur.bank;
      P.torso.rotation.set(cur.lean,cur.twist,0);
      P.head.rotation.set(cur.headX,cur.headY,0);
      P.armR.g.rotation.set(cur.shRx,cur.shRy,cur.shRz);P.armR.el.rotation.x=cur.elR;
      P.armL.g.rotation.set(cur.shLx,0,cur.shLz);      P.armL.el.rotation.x=cur.elL;
      if(P.armR.scy)P.armR.scy.rotation.set(cur.scyX,cur.scyY,cur.scyZ);
      for(const ch of P.tails){
        ch.segs.forEach((sg,j)=>{
          sg.rotation.x=Math.sin(T*cur.tailS+ch.ph+j*.55)*cur.tailA*(.5+j*.4)+cur.tailT*(.4+j*.35);
          sg.rotation.z=Math.cos(T*cur.tailS*.8+ch.ph+j*.5)*cur.tailA*.4+ch.dir*cur.tailSp*(.3+j*.25);
        });
      }
      /* mata & amulet menyala mengikuti `flare`; saat kena hit warnanya
         diambil alih flash Monsters supaya umpan baliknya tetap terlihat */
      if(m.flash<=0){
        const f=cl01(cur.flare);
        if(P.eyeMat){
          P.eyeMat.color.setRGB(lr(0.455,1,f),lr(0.941,1,f),lr(1,1,f));
          if(P.eyes)P.eyes.scale.setScalar(1+f*.5);
        }
        if(P.amuletMat)
          P.amuletMat.color.setRGB(lr(0.616,1,f*.7),lr(0.361,1,f*.7),lr(1,1,f*.7));
      }
    },

    /* =======================================================================
       FX TEBASAN SABIT
       -----------------------------------------------------------------------
       mode 'h' mendatar, 'd' diagonal (tebasan balik), 'v' menurun (hempasan).
       Memakai crescent PortFX (sama seperti golem/yeti) + serpihan ungu.
       ======================================================================= */
    slashFX(m,x,y,z,yaw,mode,size){
      if(typeof PortFX!=='undefined'&&PortFX.crescent){
        const pitch=mode==='v'?-1.5:mode==='d'?-1.0:-1.25;
        const tilt=mode==='h'?0:(mode==='d'?0.7:-0.2);
        PortFX.crescent(x,y,z,yaw,pitch,tilt,2.2,size,0.28,0x8b5cf6);
      }
      if(typeof FX!=='undefined')
        FX.debris(new THREE.Vector3(x,y,z),0xb98cff,7,2.4);
    },
    /* gelombang ungu di tanah (spawnShock di file asli) */
    shockFX(m,x,z,scale){
      const gy=(typeof World!=='undefined'&&World.groundAt)
        ?World.groundAt(x,z,m.pos.y+2):m.pos.y;
      if(typeof FX==='undefined')return;
      FX.ring(x,gy+0.06,z,0x7b4fd6,0.55,scale);
      FX.ring(x,gy+0.05,z,0xb98cff,0.7,scale*0.6);
      FX.debris(new THREE.Vector3(x,gy+0.2,z),0x8b5cf6,8,2.4);
    },
  };

  window.Mob_Reaper=Mob_Reaper;
  return Mob_Reaper;
})();

/* =============================================================================
   ARWAH PEMBURU (skill '3 Arwah Menyerang')
   -----------------------------------------------------------------------------
   Diporting dari bagian spirit di reaper.html. Tiga arwah kecil keluar dari dada
   reaper, mengorbit sebentar, lalu MELUNCUR ke sasaran dan menghantamnya.

   Beda dari demo: sasarannya bukan titik statis melainkan posisi sasaran nyata
   saat arwah dilepas (pemain/NPC/pet), dan saat mengenai sasaran ia memberi
   damage lewat Monsters.hitTarget. Pool global (bukan per-mob) supaya jumlah
   objek tetap terbatas walau ada beberapa reaper sekaligus — pola yang sama
   dengan Mob_Kelabang.updateVenom & Mob_Kumbang.updateBlocks.

   Fase (detik, persis file asli): E=0.5 muncul & mengorbit, D=0.62 meluncur,
   H=0.45 menggantung di sasaran, RR=0.65 kembali & memudar.
   ============================================================================= */
Mob_Reaper.SPIRIT_MAX=9;                 // 3 reaper × 3 arwah
Mob_Reaper._spirits=null;

Mob_Reaper.spiritInit=function(){
  if(this._spirits)return;
  this._spirits=[];
  const scene=(typeof Game!=='undefined'&&Game.scene)?Game.scene:null;
  /* geometri & material dibuat sekali, dibagi seluruh pool */
  if(!this._spirGeo){
    const B=[];
    const push=(x,y,z,c,sx,sy,sz)=>B.push({x,y,z,c,sx,sy,sz});
    push(0,0,.25,0xeef6ff,.85,.85,.85);
    push(0,-.15,-.35,0xdfeefc,.55,.55,.5);
    push(0,-.02,-.75,0xd3e6f8,.34,.34,.34);
    /* buildGeoFrom tidak diekspor; bangun geometri sederhana setara di sini */
    const pos=[],nor=[],col=[],idx=[];
    const C=new THREE.Color();
    const F=[
      {n:[1,0,0], v:[[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5],[.5,-.5,.5]]},
      {n:[-1,0,0],v:[[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5],[-.5,-.5,-.5]]},
      {n:[0,1,0], v:[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]]},
      {n:[0,-1,0],v:[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]]},
      {n:[0,0,1], v:[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]},
      {n:[0,0,-1],v:[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]}
    ];
    for(const b of B){
      C.setHex(b.c);
      for(const f of F){
        const base=pos.length/3;
        const sh=f.n[1]===1?1:f.n[1]===-1?.72:f.n[0]!==0?.86:(f.n[2]>0?.96:.9);
        for(const o of f.v){
          pos.push(b.x+o[0]*b.sx,b.y+o[1]*b.sy,b.z+o[2]*b.sz);
          nor.push(f.n[0],f.n[1],f.n[2]);
          col.push(C.r*sh,C.g*sh,C.b*sh);
        }
        idx.push(base,base+1,base+2,base,base+2,base+3);
      }
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
    g.setIndex(idx);
    this._spirGeo=g;
    this._spirMat=new THREE.MeshLambertMaterial({vertexColors:true});
    this._trailGeo=new THREE.BoxGeometry(.34,.34,.8);
    this._trailMat=new THREE.MeshBasicMaterial({color:0xeaf7ff,transparent:true,
      opacity:.45,depthWrite:false});
  }
  for(let i=0;i<this.SPIRIT_MAX;i++){
    const grp=new THREE.Group();
    grp.scale.setScalar(0.01);grp.visible=false;
    grp.add(new THREE.Mesh(this._spirGeo,this._spirMat));
    const tr=new THREE.Mesh(this._trailGeo,this._trailMat);
    tr.position.set(0,0,-1.15);grp.add(tr);
    if(scene)scene.add(grp);
    this._spirits.push({g:grp,trail:tr,active:false,t:0,struck:false,off:0,dmg:8,
      mob:null,tgt:null,
      chest:new THREE.Vector3(),target:new THREE.Vector3(),
      orbit:new THREE.Vector3(),prev:new THREE.Vector3()});
  }
};

/* lepaskan satu arwah dari dada `m` menuju `tgt` (indeks i menentukan sudut) */
Mob_Reaper.spawnSpirit=function(m,i,tgt){
  this.spiritInit();
  const s=this._spirits.find(x=>!x.active);
  if(!s)return;
  s.active=true;s.t=0;s.struck=false;s.off=i*2.1;
  s.mob=m;
  /* Jika reaper adalah pet, arwah TIDAK BOLEH menargetkan pemain atau rekan */
  if(m&&m.pet&&(tgt===Player||(tgt&&(tgt.pet||tgt.role))))tgt=null;
  s.tgt=tgt||null;
  s.dmg=Math.max(3,Math.round(m.dmg*0.55));
  /* titik dada reaper */
  const chestY=m.pos.y+2.0;
  s.chest.set(m.pos.x,chestY,m.pos.z);
  /* sasaran: posisi nyata sasaran saat dilepas, digeser per arwah supaya
     ketiganya datang dari arah berbeda (SPIR_ANG seperti file asli) */
  const yaw=m.mesh?m.mesh.rotation.y:0;
  const ang=yaw+this.SPIR_ANG[i%3];
  if(tgt&&tgt.pos&&!tgt.dead){
    s.target.set(tgt.pos.x,tgt.pos.y+0.9,tgt.pos.z);
  }else{
    s.target.set(m.pos.x+Math.sin(ang)*6.5,m.pos.y+1.2,m.pos.z+Math.cos(ang)*6.5);
  }
  s.orbit.copy(s.chest);s.prev.copy(s.chest);
  s.g.visible=true;s.g.scale.setScalar(0.01);
  s.g.position.copy(s.chest);
};

/* HANTAMAN satu arwah: damage ke sasaran + efek.
   Dipisah jadi metode sendiri supaya bisa dipanggil dari dua tempat (akhir fase
   meluncur & jaring pengaman di awal fase menggantung) tanpa duplikasi.
   Radius 2.2 diukur dari POSISI SASARAN saat arwah dilepas; sasaran yang sudah
   berlari jauh tidak kena — itu memang jalan keluarnya. */
Mob_Reaper.spiritStrike=function(s){
  if(s.struck)return;
  s.struck=true;
  /* Jika reaper adalah pet, pastikan tidak melukai pemain atau tim */
  if(s.mob&&s.mob.pet&&(s.tgt===Player||(s.tgt&&(s.tgt.pet||s.tgt.role))))s.tgt=null;
  if(typeof Monsters!=='undefined'&&Monsters.hitTarget)
    Monsters.hitTarget(s.mob,s.tgt,s.dmg,2.2,s.target.x,s.target.z,4);
  if(typeof FX!=='undefined'){
    FX.debris(s.target.clone(),0xeaf7ff,7,2.6);
    FX.ring(s.target.x,s.target.y-0.8,s.target.z,0x8b5cf6,0.5,1.8);
    FX.addShake(0.18);
  }
  if(typeof Sfx!=='undefined'&&Sfx.at)Sfx.at(s.target,'hit',0.6);
  if(s.mob)s.mob._rFlare=Math.max(s.mob._rFlare||0,0.4);
};

/* update seluruh arwah — dipanggil sekali per frame dari Monsters.update */
Mob_Reaper.updateSpirits=function(dt){
  if(!this._spirits)return;
  const T=performance.now()*0.001;
  const E=.5,D=.62,H=.45,RR=.65;
  const ss=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
  for(const s of this._spirits){
    if(!s.active)continue;
    /* reaper mati / hilang → arwah ikut menghilang */
    if(!s.mob||s.mob.dead||(typeof Monsters!=='undefined'&&Monsters.list.indexOf(s.mob)<0)){
      s.active=false;s.g.visible=false;continue;
    }
    s.t+=dt;
    const t=s.t;
    const p=new THREE.Vector3();
    if(t<E){
      /* muncul & mengorbit dada */
      const u=t/E,e=ss(u),ang=s.off+u*6,r=.5+1.5*e;
      s.chest.set(s.mob.pos.x,s.mob.pos.y+2.0,s.mob.pos.z);
      p.set(s.chest.x+Math.cos(ang)*r,s.chest.y+.3+Math.sin(u*Math.PI)*.8,
            s.chest.z+Math.sin(ang)*r);
      s.g.scale.setScalar(.95*ss(Math.min(1,u*2.2)));
      /* simpan titik akhir orbit sebagai pangkal luncuran.
         Sama seperti bug hantaman di bawah, file sumber memakai `u>=1` padahal
         di cabang ini u=t/E selalu < 1 — akibatnya orbit tidak pernah terisi
         dan arwah meluncur dari dada, bukan dari titik orbit terakhir.
         Ambang 0.97 membuat pangkalnya benar tanpa mengubah bentuk lintasan. */
      if(u>=0.97)s.orbit.copy(p);
    }else if(t<E+D){
      /* meluncur ke sasaran dengan lintasan melengkung */
      const u=(t-E)/D,e=ss(u);
      /* sasaran diperbarui pelan (mengejar, tapi masih bisa dihindari) */
      if(s.mob&&s.mob.pet&&(s.tgt===Player||(s.tgt&&(s.tgt.pet||s.tgt.role))))s.tgt=null;
      if(s.tgt&&s.tgt.pos&&!s.tgt.dead){
        s.target.lerp(new THREE.Vector3(s.tgt.pos.x,s.tgt.pos.y+0.9,s.tgt.pos.z),
                      Math.min(1,dt*2.2));
      }else if(s.mob&&s.mob.pet){
        /* Target musuh sudah mati/hilang: cari musuh lain terdekat agar tidak meluncur ke arah pemain */
        if(typeof Monsters!=='undefined'){
          let nearFoe=null,minD=14;
          for(const o of Monsters.list){
            if(o===s.mob||o.dead||o.pet||o.catchActive)continue;
            if(typeof Monsters.isAnimal==='function'&&Monsters.isAnimal(o))continue;
            const d=o.pos.distanceTo(s.target);
            if(d<minD){minD=d;nearFoe=o;}
          }
          if(nearFoe){
            s.tgt=nearFoe;
            s.target.lerp(new THREE.Vector3(nearFoe.pos.x,nearFoe.pos.y+0.9,nearFoe.pos.z),Math.min(1,dt*2.2));
          }
        }
      }
      p.lerpVectors(s.orbit,s.target,e);
      const dx=s.target.x-s.orbit.x,dz=s.target.z-s.orbit.z;
      const L=Math.hypot(dx,dz)||1;
      const k=Math.sin(u*Math.PI*2.5)*(1-u)*.8;
      p.x+=(-dz/L)*k;p.z+=(dx/L)*k;p.y+=Math.sin(u*Math.PI)*.5;
      s.g.scale.setScalar(.95);
      /* HANTAMAN saat arwah praktis sampai di sasaran.
         BUGFIX: file sumber memakai `if(!s.struck&&u>=1)` DI DALAM cabang
         `t<E+D`. Di cabang itu u=(t-E)/D selalu < 1 (karena t-E < D), jadi
         syarat u>=1 TIDAK PERNAH terpenuhi dan hantaman tidak pernah dipicu —
         di demo hal itu cuma berarti efek visualnya hilang, tapi di game
         berarti skill 3 Arwah sama sekali TIDAK memberi damage.
         Sekarang dipicu pada u>=0.97 (saat arwah sudah menyentuh sasaran), dan
         ada jaring pengaman di awal fase menggantung di bawah. */
      if(!s.struck&&u>=0.97)this.spiritStrike(s);
    }else if(t<E+D+H){
      /* menggantung sebentar di titik hantaman */
      if(!s.struck)this.spiritStrike(s);      // jaring pengaman (frame lompat)
      p.copy(s.target);
      p.x+=Math.cos(T*5+s.off)*.15;
      p.y+=Math.sin(T*6+s.off)*.18;
      p.z+=Math.sin(T*4.5+s.off)*.15;
      s.g.scale.setScalar(.95);
    }else if(t<E+D+H+RR){
      /* kembali ke reaper & memudar */
      const u=(t-E-D-H)/RR,e=ss(u);
      p.lerpVectors(s.target,
        new THREE.Vector3(s.mob.pos.x,s.mob.pos.y+2.0,s.mob.pos.z),e);
      s.g.scale.setScalar(.95*(1-e));
    }else{
      s.active=false;s.g.visible=false;continue;
    }
    s.g.position.copy(p);
    /* hadap & panjang jejak mengikuti kecepatan */
    const vx=p.x-s.prev.x,vy=p.y-s.prev.y,vz=p.z-s.prev.z;
    const spd=Math.hypot(vx,vy,vz)/Math.max(dt,1e-4);
    if(spd>.3)s.g.lookAt(p.x+vx,p.y+vy,p.z+vz);
    s.trail.scale.z=Math.max(.5,Math.min(2.8,spd*.22));
    s.prev.copy(p);
  }
};
