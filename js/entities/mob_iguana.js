'use strict';
/* =============================================================================
   ENTITAS MOB: IGUANA HUTAN (🐍)
   -----------------------------------------------------------------------------
   Diporting 1:1 dari "NEW MODEL/iguana.html" (monster ular voxel — Skeleton IK).
   SELURUH model, animasi IK & skill file asli dipakai di game:
     idle · walk · run → locomotion spine FABRIK + footstep 4 kaki IK 2-tulang
     attack 'Patuk'    → ancang-ancang → sentak maju → damage + shake
     venom 'Sembur Bisa' → dongak + frill mekar → semprotan partikel racun (DoT)
     jump  'Lompat'    → keyframe depan-dulu/belakang-menyusul + AoE mendarat
   IK TETAP DIPAKAI: spine leher (8 ruas) & ekor (7 ruas) diselesaikan FABRIK,
   4 kaki diselesaikan analitis 2-tulang — semuanya di ruang LOKAL model
   (maju = +Z lokal) sehingga stabil di dalam grup mesh game yang diskalakan.
   Damage & timeline serangan dikendalikan js/monsters.js (aiIguana/iguanaAct),
   file ini menyediakan MODEL, pose animasi, dan POOL BISA global + racun DoT.
   Spawn liar di biome HUTAN (lihat BIOME_INFO FOREST di config.js).
   Dipanggil Monsters.make() & Monsters.animate() lewat window.Mob_Iguana.
   ============================================================================= */

const Mob_Iguana=(()=>{

  const SCALE=0.42;                  // skala model di dunia voxel
  const LEG_L1=0.9, LEG_L2=0.9;      // panjang segmen kaki IK (sama persis file asli)
  const HIP_BASE=1.16;               // tinggi pinggul netral (satuan lokal model)

  const DUR={attack:1.15,venom:2.45,jump:1.5};
  const HIT_ATK=0.30+0.14*0.85;      // momen patuk kena (k>.85 pada fase sentak)
  const VENOM_MAX=110;               // pool partikel bisa

  /* ---------- helper matematika (salinan file asli) ---------- */
  const sstep=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  const eOC=t=>1-Math.pow(1-Math.max(0,Math.min(1,t)),3);
  const eOB=t=>{t=Math.max(0,Math.min(1,t));const c=1.9;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);};
  const bump=(x,w)=>{const q=Math.max(0,Math.min(1,x/w));return Math.sin(Math.PI*q);};
  const shortAng=a=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;};
  function keyInterp(keys,u){
    if(u<=keys[0][0])return keys[0][1];
    for(let i=0;i<keys.length-1;i++){
      const u0=keys[i][0],v0=keys[i][1],u1=keys[i+1][0],v1=keys[i+1][1];
      if(u<=u1){const t=(u-u0)/(u1-u0);return v0+(v1-v0)*(1-Math.cos(Math.PI*t))/2;}
    }
    return keys[keys.length-1][1];
  }

  /* ---------- keyframe lompat (salinan file asli) ---------- */
  const JUMP_DUR=1.5;
  const JUMP_HIP  =[[0,0],[.15,-.28],[.32,.38],[.55,1.42],[.78,.30],[.87,-.24],[1,0]];
  const JUMP_HEADU=[[0,0],[.15,-.25],[.30,.45],[.55,.35],[.78,.10],[.90,-.15],[1,0]];
  const JUMP_HEADF=[[0,0],[.15,-.30],[.35,.10],[.60,.20],[.85,-.05],[1,0]];
  const JUMP_PITCH=[[0,0],[.15,.25],[.30,-.32],[.55,-.12],[.78,.28],[.92,.05],[1,0]];
  const JUMP_ROOTF=[[0,0],[.15,-.25],[.40,.30],[.78,.35],[.90,0],[1,0]];
  const JUMP_FRILL=[[0,0],[.20,.5],[.55,.6],[.85,.2],[1,0]];
  const JUMP_JAW  =[[0,0],[.30,.25],[.60,.4],[.85,.1],[1,0]];

  /* ---------- data spine (salinan file asli) ---------- */
  const F_LEN=[0.75,0.8,0.8,0.75,0.62,0.55,0.5,0.45];
  const F_W=[1.45,1.62,1.68,1.52,1.15,0.92,0.80,0.70];
  const F_H=[1.35,1.50,1.56,1.44,1.12,0.86,0.75,0.66];
  const FSPEC=[
    {dorsal:'ridge',side:false,belly:true},{dorsal:'spike',side:true,belly:true},
    {dorsal:'spike',side:true,belly:true},{dorsal:'spike',side:true,belly:true},
    {dorsal:'ridge',side:false,belly:true},{dorsal:'plate',side:false,belly:false},
    {dorsal:'plate',side:false,belly:false},{dorsal:'plate',side:false,belly:false}];
  const B_LEN=[0.60,0.55,0.50,0.45,0.40,0.33,0.26];
  const B_W=[1.42,1.26,1.06,0.86,0.66,0.48,0.34];
  const B_H=[1.32,1.16,0.98,0.80,0.60,0.44,0.30];
  const BSPEC=[
    {dorsal:'spike',side:true,belly:true},{dorsal:'spike',side:false,belly:true},
    {dorsal:'ridge',side:false,belly:true},{dorsal:'plate',side:false,belly:false},
    {dorsal:'plate',side:false,belly:false},{dorsal:'plate',side:false,belly:false},
    {dorsal:'plate',side:false,belly:false}];

  /* ---------- tekstur voxel (salinan file asli; encoding fallback three lama) ---------- */
  function canvasTex(size,painter){
    const cv=document.createElement('canvas');cv.width=cv.height=size;
    painter(cv.getContext('2d'),size);
    const t=new THREE.CanvasTexture(cv);
    t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;
    if(THREE.SRGBColorSpace!==undefined&&'colorSpace' in t)t.colorSpace=THREE.SRGBColorSpace;
    else if(THREE.sRGBEncoding!==undefined)t.encoding=THREE.sRGBEncoding;
    return t;
  }
  const rgb=(c,v)=>`rgb(${Math.max(0,Math.min(255,c[0]+v))|0},${Math.max(0,Math.min(255,c[1]+v))|0},${Math.max(0,Math.min(255,c[2]+v))|0})`;
  function noisePaint(cx,s,base,contrast,opts){
    opts=opts||{};
    for(let y=0;y<s;y++)for(let x=0;x<s;x++){
      let v=(Math.random()*2-1)*contrast;
      if(opts.spots&&Math.random()<opts.spots)v-=contrast*2.4;
      if(opts.hi&&Math.random()<opts.hi)v+=contrast*1.9;
      cx.fillStyle=rgb(base,v);cx.fillRect(x,y,1,1);
    }
    if(opts.topLight){cx.fillStyle=rgb(base,24);cx.fillRect(0,0,s,1);}
    if(opts.botDark){cx.fillStyle=rgb(base,-30);cx.fillRect(0,s-2,s,2);}
  }
  const TAU=Math.PI*2;
  const texSideA=canvasTex(16,(c,s)=>noisePaint(c,s,[84,134,54],13,{spots:.06,hi:.05,topLight:1,botDark:1}));
  const texSideB=canvasTex(16,(c,s)=>noisePaint(c,s,[72,118,48],13,{spots:.07,hi:.04,topLight:1,botDark:1}));
  const texTop=canvasTex(16,(c,s)=>{noisePaint(c,s,[48,88,34],10,{spots:.08});
    c.fillStyle=rgb([48,88,34],42);for(let y=0;y<16;y++){const w=2+((y/4)|0)%2;c.fillRect(8-(w>>1),y,w,1);}});
  const texBelly=canvasTex(16,(c,s)=>{noisePaint(c,s,[199,191,139],8);
    c.fillStyle=rgb([199,191,139],-34);for(let y=3;y<16;y+=4)c.fillRect(0,y,16,1);});
  const texBone=canvasTex(16,(c,s)=>noisePaint(c,s,[228,220,192],7,{spots:.04}));
  const texDark=canvasTex(16,(c,s)=>noisePaint(c,s,[40,70,30],8,{spots:.06}));
  const texFrill=canvasTex(16,(c,s)=>{noisePaint(c,s,[108,168,60],10,{spots:.05});
    c.fillStyle='#1c1a12';c.beginPath();c.arc(8,8,4.8,0,TAU);c.fill();
    c.fillStyle='#efa22e';c.beginPath();c.arc(8,8,3.5,0,TAU);c.fill();
    c.fillStyle='#241c10';c.beginPath();c.arc(8,8,1.5,0,TAU);c.fill();});

  const Mob_Iguana={
    SCALE, DUR,

    /* ================= MODEL 3D ================= */
    build(boss){
      const cache={};
      const M=c=>{if(!cache[c])cache[c]=new THREE.MeshLambertMaterial({color:c});return cache[c];};
      const matSideA=M(texSideA),matSideB=M(texSideB),matTop=M(texTop),
            matBelly=M(texBelly),matBone=M(texBone),matDark=M(texDark),matFrill=M(texFrill);
      const matMouth=new THREE.MeshLambertMaterial({color:0x7a2f38});
      const matTongue=new THREE.MeshLambertMaterial({color:0xd0486e});
      const eyeMat=new THREE.MeshLambertMaterial({color:0xff5a1e,emissive:0xb32a08});
      const segMatA=[matSideA,matSideA,matTop,matBelly,matSideA,matSideA];
      const segMatB=[matSideB,matSideB,matTop,matBelly,matSideB,matSideB];
      const box=(parent,w,h,d,mat,x,y,z)=>{
        const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
        m.position.set(x||0,y||0,z||0);m.castShadow=!IS_MOBILE;
        parent.add(m);return m;
      };

      const g=new THREE.Group();
      g.scale.setScalar(SCALE);
      const parts={eyeMat};

      /* ---- ruas badan depan (8) ---- */
      const fSegG=[];
      for(let k=0;k<8;k++){
        const grp=new THREE.Group();grp.rotation.order='YXZ';
        grp.add(new THREE.Mesh(new THREE.BoxGeometry(F_W[k],F_H[k],F_LEN[k]+0.1),k%2?segMatB:segMatA));
        grp.children[0].castShadow=!IS_MOBILE;
        const sp=Math.min(0.42,F_W[k]*0.26),spec=FSPEC[k],h=F_H[k],w=F_W[k],len=F_LEN[k];
        if(spec.dorsal==='spike'){
          box(grp,sp,sp*.7,sp*1.2,matDark,0,h/2+sp*.30,0);
          box(grp,sp*.72,sp*1.05,sp*.85,matBone,0,h/2+sp*1.05,-sp*.05);
          box(grp,sp*.4,sp*.7,sp*.5,matBone,0,h/2+sp*1.85,-sp*.1);
        }else if(spec.dorsal==='ridge'){
          box(grp,w*.42,.16,len*.85,matDark,0,h/2+.06,0);
          box(grp,w*.2,.2,.2,matBone,0,h/2+.18,len*.18);
        }else if(spec.dorsal==='plate'){
          box(grp,w*.5,.1,len*.8,matDark,0,h/2+.04,0);
        }
        if(spec.side)for(const s of[-1,1]){
          const sk=box(grp,.5,.13,.16,matBone,s*(w/2+.16),-h*.12,0);
          sk.rotation.z=-s*.4;
        }
        if(spec.belly)box(grp,w*.82,.07,len*.9,matBelly,0,-h/2-.025,0);
        g.add(grp);fSegG.push(grp);
      }
      /* ---- ruas ekor (7) ---- */
      const bSegG=[];
      for(let k=0;k<7;k++){
        const grp=new THREE.Group();grp.rotation.order='YXZ';
        grp.add(new THREE.Mesh(new THREE.BoxGeometry(B_W[k],B_H[k],B_LEN[k]+0.1),(k+1)%2?segMatB:segMatA));
        grp.children[0].castShadow=!IS_MOBILE;
        const sp=Math.min(0.42,B_W[k]*0.26),spec=BSPEC[k],h=B_H[k],w=B_W[k],len=B_LEN[k];
        if(spec.dorsal==='spike'){
          box(grp,sp,sp*.7,sp*1.2,matDark,0,h/2+sp*.30,0);
          box(grp,sp*.72,sp*1.05,sp*.85,matBone,0,h/2+sp*1.05,-sp*.05);
          box(grp,sp*.4,sp*.7,sp*.5,matBone,0,h/2+sp*1.85,-sp*.1);
        }else if(spec.dorsal==='ridge'){
          box(grp,w*.42,.16,len*.85,matDark,0,h/2+.06,0);
          box(grp,w*.2,.2,.2,matBone,0,h/2+.18,len*.18);
        }else if(spec.dorsal==='plate'){
          box(grp,w*.5,.1,len*.8,matDark,0,h/2+.04,0);
        }
        if(spec.side)for(const s of[-1,1]){
          const sk=box(grp,.5,.13,.16,matBone,s*(w/2+.16),-h*.12,0);
          sk.rotation.z=-s*.4;
        }
        if(spec.belly)box(grp,w*.82,.07,len*.9,matBelly,0,-h/2-.025,0);
        g.add(grp);bSegG.push(grp);
      }
      /* ---- kubus sendi ---- */
      const jCubeF=[],jCubeB=[];
      for(let k=1;k<=7;k++){const s=(F_W[k-1]+F_W[k])/2*.72;const m=box(g,s,s,s,matSideB,0,-99,0);jCubeF.push(m);}
      for(let k=1;k<=6;k++){const s=(B_W[k-1]+B_W[k])/2*.72;const m=box(g,s,s,s,matSideB,0,-99,0);jCubeB.push(m);}
      /* ---- ujung ekor ---- */
      const tailTip=new THREE.Group();tailTip.rotation.order='YXZ';
      box(tailTip,.2,.18,.3,matBone,0,0,.1);
      box(tailTip,.12,.1,.25,matBone,0,0,.32);
      box(tailTip,.06,.05,.18,matBone,0,0,.5);
      g.add(tailTip);

      /* ---- KEPALA (salinan file asli, menghadap +Z) ---- */
      const headG=new THREE.Group();headG.rotation.order='YXZ';g.add(headG);
      const HR={};parts.head=headG;
      box(headG,.95,.8,1.15,segMatA,0,.10,.55);
      box(headG,1.0,.22,.85,matDark,0,.58,.45);
      box(headG,1.02,.14,.3,matDark,0,.42,1.02);
      box(headG,.72,.5,.55,segMatA,0,0,1.28);
      box(headG,.55,.34,.25,segMatB,0,.02,1.62);
      box(headG,.09,.09,.06,matDark,-.16,.12,1.74);
      box(headG,.09,.09,.06,matDark,.16,.12,1.74);
      const noseHorn=box(headG,.14,.34,.14,matBone,0,.30,1.50);noseHorn.rotation.x=.3;
      box(headG,.6,.06,.9,matMouth,0,-.32,.85);
      for(const z of[.8,1.05,1.3])for(const s of[-1,1])box(headG,.05,.12,.05,matBone,s*.30,-.36,z);
      for(const s of[-1,1]){const f=box(headG,.10,.34,.10,matBone,s*.30,-.42,1.28);f.rotation.x=.18;}
      HR.eyeL=box(headG,.20,.24,.26,eyeMat,-.42,.28,.92);
      HR.eyeR=box(headG,.20,.24,.26,eyeMat,.42,.28,.92);
      box(headG,.04,.16,.09,matDark,-.535,.28,.92);
      box(headG,.04,.16,.09,matDark,.535,.28,.92);
      HR.lidL=box(headG,.26,.34,.30,matSideA,-.42,.66,.92);
      HR.lidR=box(headG,.26,.34,.30,matSideA,.42,.66,.92);
      for(const s of[-1,1]){
        const hg=new THREE.Group();hg.position.set(s*.36,.55,.08);hg.rotation.set(-.15,s*.15,-s*.18);
        box(hg,.20,.20,.24,matBone,0,0,0);box(hg,.16,.16,.20,matBone,0,.14,-.10);
        box(hg,.11,.11,.16,matBone,0,.27,-.19);box(hg,.07,.07,.12,matBone,0,.38,-.27);
        headG.add(hg);
      }
      for(const s of[-1,1]){
        const ck=box(headG,.10,.10,.45,matBone,s*.50,-.02,-.15);
        ck.rotation.y=s*.6;ck.rotation.z=-s*.2;
      }
      const makeFrill=s=>{
        const piv=new THREE.Group();piv.position.set(s*.5,.12,.15);
        box(piv,.85,1.15,.09,matFrill,s*.45,-.15,-.15);
        box(piv,.85,.09,.09,matDark,s*.45,.42,-.15);
        box(piv,.09,.09,.09,matBone,s*.86,-.15,-.15);
        headG.add(piv);return piv;
      };
      HR.frillR=makeFrill(1);HR.frillL=makeFrill(-1);
      HR.jaw=new THREE.Group();HR.jaw.position.set(0,-.18,.10);
      box(HR.jaw,.66,.24,1.05,segMatB,0,-.16,.62);
      box(HR.jaw,.50,.10,.30,matBelly,0,-.06,1.10);
      box(HR.jaw,.50,.05,.80,matMouth,0,-.03,.55);
      for(const z of[.40,.62,.84,1.02])for(const s of[-1,1])box(HR.jaw,.05,.12,.05,matBone,s*.24,-.02,z);
      for(const s of[-1,1]){const f=box(HR.jaw,.08,.30,.08,matBone,s*.27,.02,1.02);f.rotation.x=-.15;}
      headG.add(HR.jaw);
      HR.tongue=new THREE.Group();HR.tongue.position.set(0,-.28,1.45);
      box(HR.tongue,.06,.045,.5,matTongue,0,0,.28);
      for(const s of[-1,1]){const tp=box(HR.tongue,.04,.04,.16,matTongue,s*.05,0,.60);tp.rotation.y=s*.35;}
      HR.tongue.scale.z=.001;HR.tongue.visible=false;headG.add(HR.tongue);
      parts.HR=HR;
      /* anchor mulut (titik keluar semburan bisa) */
      const mouth=new THREE.Object3D();mouth.position.set(0,-.30,1.75);headG.add(mouth);
      parts.mouth=mouth;

      /* ---- 4 KAKI: hip → knee → foot (telapak terkunci di ankle) ---- */
      const legs=[];
      const buildLeg=(side,front)=>{
        const L={side,front};
        L.upper=new THREE.Group();L.upper.rotation.order='YXZ';
        box(L.upper,.40,.40,LEG_L1+.08,matSideB,0,0,0);
        box(L.upper,.54,.50,.42,matDark,0,.05,-.22);
        L.lower=new THREE.Group();L.lower.rotation.order='YXZ';
        box(L.lower,.28,.28,LEG_L2+.06,matSideB,0,0,0);
        box(L.lower,.09,.22,.09,matBone,0,.19,.14);
        box(L.lower,.09,.18,.09,matBone,0,.17,-.16);
        L.knee=box(g,.38,.38,.38,matSideA,0,-99,0);
        L.ankleB=box(g,.24,.24,.24,matSideA,0,-99,0);
        L.foot=new THREE.Group();L.foot.rotation.order='YXZ';
        box(L.foot,.42,.16,.60,matSideB,0,-.14,.06);
        box(L.foot,.30,.14,.18,matSideA,0,-.13,-.26);
        for(const tx of[-.15,0,.15]){
          const tg=new THREE.Group();tg.position.set(tx,-.15,.36);tg.rotation.y=tx*1.6;
          box(tg,.11,.13,.30,matSideB,0,0,.15);
          const cl=box(tg,.06,.08,.14,matBone,0,-.02,.34);cl.rotation.x=-.35;
          L.foot.add(tg);
        }
        L.pad=new THREE.Group();
        box(L.pad,.50,.60,.75,matSideA,0,0,0);
        box(L.pad,.30,.20,.40,matDark,0,.35,-.05);
        g.add(L.upper,L.lower,L.knee,L.ankleB,L.foot,L.pad);
        legs.push(L);
      };
      buildLeg(-1,true);buildLeg(1,true);buildLeg(1,false);buildLeg(-1,false);
      parts.legs=legs;
      parts.fSeg=fSegG;parts.bSeg=bSegG;parts.jF=jCubeF;parts.jB=jCubeB;parts.tailTip=tailTip;

      return {mesh:g,parts};
    },

    /* ---------- solver FABRIK (salinan file asli, ruang lokal) ---------- */
    _fabrik(joints,lengths,base,target,offsets,UP){
      const n=joints.length,last=n-1;
      const _v1=new THREE.Vector3(),_v2=new THREE.Vector3();
      for(let it=0;it<4;it++){
        joints[last].copy(target);
        for(let i=last-1;i>=0;i--){
          _v1.subVectors(joints[i],joints[i+1]);
          const l=_v1.length()||1e-5;
          joints[i].copy(joints[i+1]).addScaledVector(_v1,lengths[i]/l);
        }
        joints[0].copy(base);
        for(let i=1;i<n;i++){
          _v1.subVectors(joints[i],joints[i-1]);
          const l=_v1.length()||1e-5;
          joints[i].copy(joints[i-1]).addScaledVector(_v1,lengths[i-1]/l);
        }
        if(offsets){
          for(let i=1;i<last;i++){
            _v1.subVectors(joints[i+1],joints[i-1]);
            _v2.crossVectors(UP,_v1);
            if(_v2.lengthSq()<1e-6)_v2.set(1,0,0);
            _v2.normalize();
            joints[i].addScaledVector(_v2,offsets[i].x).addScaledVector(UP,offsets[i].y);
          }
          joints[0].copy(base);
          for(let i=1;i<n;i++){
            _v1.subVectors(joints[i],joints[i-1]);
            const l=_v1.length()||1e-5;
            joints[i].copy(joints[i-1]).addScaledVector(_v1,lengths[i-1]/l);
          }
        }
      }
    },
    /* ---------- IK kaki 2-tulang analitik (salinan file asli) ---------- */
    _solveLegIK(hip,ankle,pole,outKnee,outAnkle){
      const _v1=new THREE.Vector3(),_v2=new THREE.Vector3(),_dir=new THREE.Vector3();
      _v1.subVectors(ankle,hip);
      const dFull=_v1.length()||1e-5;
      const d=Math.max(Math.abs(LEG_L1-LEG_L2)+.01,Math.min(LEG_L1+LEG_L2-.02,dFull));
      _dir.copy(_v1).multiplyScalar(1/dFull);
      const a=(LEG_L1*LEG_L1-LEG_L2*LEG_L2+d*d)/(2*d);
      const h=Math.sqrt(Math.max(LEG_L1*LEG_L1-a*a,0));
      _v2.copy(pole).sub(hip);
      _v2.addScaledVector(_dir,-_v2.dot(_dir));
      if(_v2.lengthSq()<1e-6)_v2.set(0,1,0).addScaledVector(_dir,-_dir.y);
      _v2.normalize();
      outKnee.copy(hip).addScaledVector(_dir,a).addScaledVector(_v2,h);
      outAnkle.copy(hip).addScaledVector(_dir,d);
    },
    /* orientasi lokal: yaw dari arah XZ, pitch dari elevasi, roll tambahan */
    _orient(obj,from,to,roll){
      const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z;
      if(dx*dx+dy*dy+dz*dz<1e-8)return;
      const yaw=Math.atan2(dx,dz);
      const pitch=Math.atan2(dy,Math.hypot(dx,dz));
      obj.rotation.set(-pitch,yaw,roll||0);
    },

    /* ================= ANIMASI ================= */
    animate(m,dt){
      const P=m.parts;if(!P||!P.fSeg)return;
      if(!m._ig){
        m._ig={T:0,wavePhase:0,tailPhase:0,gaitPhase:0,breathPhase:0,
          hipH:HIP_BASE,lean:0,bank:0,prevYaw:(m.mesh?m.mesh.rotation.y:0),
          lookYaw:0,lookPitch:0,lookYawT:0,lookPitchT:0,lookTimer:2,
          jawOpen:0,frill:0,blinkT:3,blinkP:9,tongueT:1.5,tongueP:9,shake:0,
          fwdJ:null,bwdJ:null,legs:null,emitAcc:0};
      }
      const R=m._ig;
      if(!R.fwdJ){
        R.fwdJ=[];for(let i=0;i<9;i++)R.fwdJ.push(new THREE.Vector3(0,HIP_BASE,i*0.75));
        R.bwdJ=[];for(let i=0;i<8;i++)R.bwdJ.push(new THREE.Vector3(0,HIP_BASE,-i*0.55));
        R.legs=[];
        const defs=[{side:-1,front:true},{side:1,front:true},{side:1,front:false},{side:-1,front:false}];
        for(let i=0;i<4;i++)R.legs.push({side:defs[i].side,front:defs[i].front,
          pos:new THREE.Vector3(defs[i].side*0.8,0,defs[i].front?2.0:-0.35),
          from:new THREE.Vector3(),to:new THREE.Vector3(),
          grounded:true,stepping:false,airborne:false,stepT:1,stepDur:.4,lift:0,err:0,thr:.7});
        R.legs[0].partner=3;R.legs[1].partner=2;R.legs[2].partner=1;R.legs[3].partner=0;
      }
      R.T+=dt;const T=R.T;
      const UP=new THREE.Vector3(0,1,0);
      /* sumbu lokal: maju +Z, kanan +X (mesh game menghadap +Z via rotation.y) */
      const FX=0,FZ=1,RX=1,RZ=0;

      /* ---------- timeline aksi (salinan file asli) ---------- */
      const act=m.iAct, tA=m.iActT||0;
      let spraying=false;
      let headOffF=0,headOffU=0,headOffR=0,rootOffF=0,hipExtra=0,pitchAdd=0;
      let jawT=0,frillT=0;
      if(act==='attack'){
        const t=tA;
        if(t<.30){const k=sstep(t/.30);
          headOffF=-1.0*k;headOffU=.55*k;jawT=.3*k;frillT=.85*k;
          hipExtra=-.14*k;rootOffF=-.28*k;pitchAdd=-.30*k;
        }else if(t<.44){const k=(t-.30)/.14,e=k*k;
          headOffF=-1.0+2.95*e;headOffU=.55-.95*e;
          jawT=.3+.7*sstep(k);frillT=1;
          hipExtra=-.14+.19*e;rootOffF=-.28+1.03*e;
          pitchAdd=-.30+.65*e;
        }else{const k=(t-.44)/.71,e=eOC(k),eb=eOB(Math.min(1,k*1.08));
          headOffF=1.95*(1-eb);headOffU=-.40*(1-e);
          jawT=Math.max(0,1-k*2.2);frillT=Math.max(0,1-k*1.4);
          hipExtra=.05*(1-e);rootOffF=.75*(1-e);pitchAdd=.35*(1-e);
        }
      }else if(act==='venom'){
        const t=tA;
        if(t<.55){const k=sstep(t/.55);
          headOffU=.95*k;headOffF=-.25*k;jawT=.95*k;frillT=k;
          hipExtra=.34*k;rootOffF=-.22*k;pitchAdd=-.35*k;
        }else if(t<1.85){spraying=true;
          jawT=1;frillT=1;
          headOffU=.85+Math.sin(t*52)*.02;headOffF=-.32;
          hipExtra=.36;rootOffF=-.30;
          pitchAdd=-.35+.63*sstep((t-.55)/.25)+Math.sin(t*47)*.012;
        }else{const k=(t-1.85)/.60,e=eOC(k);
          jawT=1-e;frillT=1-e;headOffU=.85*(1-e);headOffF=-.32*(1-e);
          hipExtra=.36*(1-e);rootOffF=-.30*(1-e);pitchAdd=.28*(1-e);
        }
      }else if(act==='jump'){
        const u=tA/JUMP_DUR;
        hipExtra=keyInterp(JUMP_HIP,u);
        headOffU=keyInterp(JUMP_HEADU,u);
        headOffF=keyInterp(JUMP_HEADF,u);
        pitchAdd=keyInterp(JUMP_PITCH,u);
        rootOffF=keyInterp(JUMP_ROOTF,u);
        frillT=keyInterp(JUMP_FRILL,u);
        jawT=keyInterp(JUMP_JAW,u);
      }

      /* ---------- locomotion dari kecepatan nyata ---------- */
      const speed=Math.hypot(m.vel.x,m.vel.z);
      const speedNorm=Math.max(0,Math.min(1,speed/5.2)),moveK=sstep(speed/.6);
      const yawRate=dt>0?shortAng((m.mesh?m.mesh.rotation.y:0)-R.prevYaw)/dt:0;
      R.prevYaw=m.mesh?m.mesh.rotation.y:0;
      R.bank=-yawRate*speed*.05;
      R.lean+=(speedNorm*speedNorm*.20-R.lean)*Math.min(1,4*dt);
      const ftx=0,fty=-Math.sin(R.lean),ftz=Math.cos(R.lean);

      /* ---------- fase gelombang (salinan file asli) ---------- */
      R.wavePhase+=dt*(1.9+speed*1.05);
      R.tailPhase+=dt*(2.1+speed*1.15);
      R.gaitPhase+=dt*(1.15+speed*.44);
      R.breathPhase+=dt*(1.4+speed*.5);
      const br=Math.sin(R.breathPhase);
      const bobV=Math.sin(R.gaitPhase*2*TAU)*(.02+speedNorm*.07)*moveK;

      /* ---------- pelvis + ADAPTASI BADAN ala tarantula ----------
         Pinggul menyesuaikan tinggi telapak kaki dunia (rata-rata kaki yang
         menapak): bila kaki depan di blok lebih tinggi, badan depan ikut naik
         (pitch), begitu pula sebaliknya — badan jadi lentur mengikuti kontur. */
      const mobX=m.pos.x, mobY=m.pos.y, mobZ=m.pos.z;
      const yawW=m.mesh?m.mesh.rotation.y:0;
      const cosY=Math.cos(yawW), sinY=Math.sin(yawW);
      const sc=(m.mesh&&m.mesh.scale&&m.mesh.scale.x)?m.mesh.scale.x:SCALE;
      const isMoving=speed>0.12;
      if(!m._gaitT)m._gaitT=0;
      if(isMoving&&act!=='jump'){
        const strideWorld=Math.max(0.4,1.8*sc);
        const cadence=Math.max(1.4,Math.min(4.2,speed/strideWorld*1.3));
        m._gaitT+=dt*cadence;
      }
      const gaitCycle=m._gaitT%1.0;
      const activeGrp=(gaitCycle<0.5)?0:1;
      /* rata-rata tinggi kaki depan vs belakang (dunia, relatif ke mobY) */
      let fH=null,bH=null;
      if(R.legs){
        let fS=0,fN=0,bS=0,bN=0;
        for(const RL of R.legs){
          if(!RL.worldFoot)continue;
          const h=(RL.worldFoot.y-mobY)/sc;
          if(RL.front){fS+=h;fN++;}else{bS+=h;bN++;}
        }
        if(fN)fH=fS/fN;if(bN)bH=bS/bN;
      }
      let adaptPitch=0,adaptH=0;
      if(fH!==null&&bH!==null){
        /* depan lebih tinggi → badan miring ke atas (pitch negatif = dongak) */
        adaptPitch=Math.max(-0.35,Math.min(0.35,(bH-fH)*0.28));
        adaptH=(fH+bH)/2;
        /* tanah miring curam → pinggul ikut naik supaya perut tidak nyangkut */
        adaptH=Math.max(-0.4,Math.min(1.2,adaptH));
      }
      R.adaptPitch=((R.adaptPitch===undefined)?0:R.adaptPitch)+(adaptPitch-(R.adaptPitch||0))*Math.min(1,6*dt);
      R.adaptH=((R.adaptH===undefined)?0:R.adaptH)+(adaptH-(R.adaptH||0))*Math.min(1,6*dt);
      const hipBase=speed<.05?HIP_BASE:(1.27+(1.20-1.27)*Math.max(0,Math.min(1,(speed-2)/3.2)));
      R.hipH+=(hipBase+hipExtra+br*.02+R.adaptH-R.hipH)*Math.min(1,(act?10:6)*dt);
      const idleSway=Math.sin(T*.4)*.045*(1-moveK);
      const Px=idleSway,Py=R.hipH+bobV,Pz=rootOffF;
      const bodyAdaptPitch=R.adaptPitch||0;

      /* ---------- look-around (salinan file asli) ---------- */
      if(!act){
        R.lookTimer-=dt;
        if(R.lookTimer<=0){
          R.lookTimer=1.4+Math.random()*2.6;
          if(Math.random()<.25){R.lookYawT=0;R.lookPitchT=0;}
          else{
            const amp=speed<.05?1:.35*(1-speedNorm);
            R.lookYawT=(Math.random()-.5)*1.1*amp;R.lookPitchT=(Math.random()-.5)*.4*amp;
          }
        }
      }else{R.lookYawT=0;R.lookPitchT=0;}
      R.lookYaw+=(R.lookYawT-R.lookYaw)*Math.min(1,(act?8:5)*dt);
      R.lookPitch+=(R.lookPitchT-R.lookPitch)*Math.min(1,5*dt);

      /* ---------- offset FABRIK (salinan file asli) ---------- */
      const ampF=.05+.09*speedNorm;
      const fwdOff=[];
      for(let i=0;i<9;i++)fwdOff.push({x:Math.sin(R.wavePhase-i*.7)*ampF*(i/8+.3),y:0});
      const ampT=.10+.20*speedNorm;
      const bwdOff=[];
      for(let k=0;k<8;k++)bwdOff.push({x:Math.sin(R.tailPhase-k*.85)*ampT*Math.pow(k/7,1.3),y:0});
      if(act==='jump'){
        const u=tA/JUMP_DUR;
        for(let i=0;i<9;i++){
          const delay=.16+(8-i)*.032;
          fwdOff[i].y=.55*(i/8)*bump(u-delay,.30)-.30*(i/8)*bump(u-(.70+(8-i)*.02),.22);
        }
        for(let k=0;k<8;k++){
          const delay=.16+(8+k)*.026;
          bwdOff[k].y=.40*(1-(k+1)/8)*bump(u-delay,.26)-.16*(1-(k+1)/8)*bump(u-(.70+(8+k)*.02),.22);
        }
      }

      /* ---------- SPINE IK: leher → kepala ---------- */
      const neckCsw=Math.sin(R.wavePhase-1.2)*.14*(.25+speedNorm);
      const headTx=Px+ftx*4.62+headOffF*FX+headOffR*RX+neckCsw+R.lookYaw*1.7+bobV*.4;
      const headTy=Py+fty*4.62+1.05+headOffU-R.lookPitch*1.4+Math.sin(R.gaitPhase*2*TAU+.8)*.05*moveK;
      const headTz=Pz+ftz*4.62+headOffF*FZ;
      const base={x:Px,y:Py,z:Pz},headTgt={x:headTx,y:headTy,z:headTz};
      const fJ=R.fwdJ;
      fJ[0].set(Px,Py,Pz);
      this._fabrik(fJ,F_LEN,base,headTgt,fwdOff,UP);

      /* ---------- SPINE IK: ekor ---------- */
      const tailSway=Math.sin(R.tailPhase*.9)*(.25+.35*speedNorm);
      const tailTgt={x:Px-2.62*FX+tailSway*RX,y:Py+.05+.06*Math.sin(R.tailPhase*.7),z:Pz-2.62*FZ};
      const bJ=R.bwdJ;
      bJ[0].set(Px,Py,Pz);
      this._fabrik(bJ,B_LEN,base,tailTgt,bwdOff,UP);

      /* ---------- orientasi ruas tubuh (ikut pitch adaptif tanah) ---------- */
      const microRoll=Math.sin(T*.6)*.02*(1-moveK);
      const _a=new THREE.Vector3(),_b=new THREE.Vector3();
      for(let k=0;k<8;k++){
        const roll=R.bank*(.5+k*.08)+Math.cos(R.wavePhase-k*.7)*.05*speedNorm+microRoll;
        this._orient(P.fSeg[k],fJ[k],fJ[k+1],roll);
        P.fSeg[k].position.copy(fJ[k]).add(fJ[k+1]).multiplyScalar(.5);
        /* lentur depan: ruas depan ikut menengadah/menunduk mengikuti kaki */
        P.fSeg[k].rotation.x+=bodyAdaptPitch*(0.4+0.6*(k/7));
      }
      for(let k=0;k<7;k++){
        const roll=R.bank*.4-Math.cos(R.tailPhase-k*.85)*.10*speedNorm+microRoll;
        this._orient(P.bSeg[k],bJ[k+1],bJ[k],roll);
        P.bSeg[k].position.copy(bJ[k]).add(bJ[k+1]).multiplyScalar(.5);
        /* lentur belakang: ruas ekor melawan sedikit supaya punggung melengkung */
        P.bSeg[k].rotation.x-=bodyAdaptPitch*(0.3+0.5*(1-k/7));
      }
      for(let k=0;k<7;k++){P.jF[k].position.copy(fJ[k+1]);P.jF[k].quaternion.copy(P.fSeg[k].quaternion);}
      for(let k=0;k<6;k++){P.jB[k].position.copy(bJ[k+1]);P.jB[k].quaternion.copy(P.bSeg[k].quaternion);}
      const brF=[0,.6,1,.7];
      for(let k=1;k<=3;k++)P.fSeg[k].scale.set(1+br*.028*brF[k],1+br*.014*brF[k],1);
      _a.subVectors(bJ[7],bJ[6]).normalize();
      P.tailTip.position.copy(bJ[7]);
      _b.copy(bJ[7]).addScaledVector(_a,.4);
      this._orient(P.tailTip,bJ[7],_b,R.bank*.3);

      /* ---------- KEPALA ---------- */
      _a.subVectors(fJ[8],fJ[7]);
      if(_a.lengthSq()<1e-6)_a.set(ftx,fty,ftz);
      _a.normalize();
      /* yaw + pitch pandangan */
      const cosL=Math.cos(R.lookYaw),sinL=Math.sin(R.lookYaw);
      let dx=_a.x*cosL+_a.z*sinL,dz=-_a.x*sinL+_a.z*cosL,dy=_a.y;
      const pitchTot=-R.lookPitch+pitchAdd;
      const cp=Math.cos(pitchTot),sp2=Math.sin(pitchTot);
      const dy2=dy*cp-Math.hypot(dx,dz)*sp2;
      const dh=Math.hypot(dx,dz)*cp+dy*sp2;
      const dl=Math.hypot(dx,dz)||1e-5;
      dx=dx/dl*dh;dz=dz/dl*dh;dy=dy2;
      P.head.position.copy(fJ[8]);
      const hyaw=Math.atan2(dx,dz),hpitch=Math.atan2(dy,Math.hypot(dx,dz));
      P.head.rotation.set(-hpitch,hyaw,-R.bank*.7+Math.sin(T*.5)*.015*(1-moveK));
      const HR=P.HR;
      R.jawOpen+=(jawT*.95-R.jawOpen)*Math.min(1,(act?14:8)*dt);
      HR.jaw.rotation.x=R.jawOpen+Math.sin(T*1.3)*.008;
      R.frill+=(frillT-R.frill)*Math.min(1,9*dt);
      const fv=R.frill+(spraying?Math.sin(T*30)*.03:0);
      HR.frillR.rotation.y=1.30-1.48*fv;HR.frillR.rotation.z=.50-.46*fv;
      HR.frillL.rotation.y=-1.30+.18*0+1.48*fv;HR.frillL.rotation.z=-.50+.46*fv;
      if(m.flash<=0&&P.eyeMat)P.eyeMat.emissive.setHex(act?0xff4400:0xb32a08);
      R.blinkT-=dt;
      if(R.blinkT<=0&&R.blinkP>1){R.blinkP=0;R.blinkT=2.5+Math.random()*3.5;}
      let lidK=0;
      if(R.blinkP<=.14){lidK=Math.sin(Math.PI*R.blinkP/.14);R.blinkP+=dt;}else R.blinkP=9;
      HR.lidL.position.y=HR.lidR.position.y=.66-.30*lidK;
      R.tongueT-=dt*(speed<1?1:.4);
      let tgK=0;
      if(R.tongueT<=0&&R.tongueP>1&&!act){R.tongueP=0;R.tongueT=2+Math.random()*2.5;}
      if(R.tongueP<=.55){tgK=Math.pow(Math.sin(Math.PI*R.tongueP/.55),.6);R.tongueP+=dt;}else R.tongueP=9;
      HR.tongue.visible=tgK>.02;HR.tongue.scale.z=Math.max(tgK,.001);
      HR.tongue.rotation.y=Math.sin(T*35)*.25*tgK;

      /* =====================================================================
         KAKI ala TARANTULA: telapak menapak di permukaan blok DUNIA nyata.
         Tiap kaki menyimpan worldFoot (koordinat dunia): saat stance ia diam
         menempel di tanah (anti-sliding); saat drift melewati ambang ia swing
         parabola dan mendarat di ketinggian blok tanah berikutnya — jadi bila
         satu kaki di blok lebih tinggi, kaki itu menapak di atas blok itu.
         ===================================================================== */
      const jumping=act==='jump';
      const isRunning=speed/Math.max(0.6,m.speed||3.5)>0.62;
      const stepThreshold=(isRunning?0.45:0.36)*sc;
      const maxDrift=0.95*sc;
      const _hip=new THREE.Vector3(),_v=new THREE.Vector3(),_pole=new THREE.Vector3(),
            _knee=new THREE.Vector3(),_ank=new THREE.Vector3(),_at=new THREE.Vector3();
      const groundAt=(x,z,refY)=>{
        if(typeof World!=='undefined'&&World.groundAt){
          const g2=World.groundAt(x,z,refY);
          if(g2!==undefined&&isFinite(g2)&&g2>0)return g2;
        }
        return mobY;
      };
      for(let i=0;i<4;i++){
        const RL=R.legs[i],L=P.legs[i];
        const jIdx=RL.front?3:0;
        /* arah ruas di pinggul */
        _a.subVectors(fJ[jIdx+1],fJ[jIdx]).normalize();
        /* right = up × dir */
        _v.set(-_a.z,0,_a.x);
        if(_v.lengthSq()<1e-6)_v.set(1,0,0);
        _v.normalize();
        _hip.copy(fJ[jIdx]).addScaledVector(_v,RL.side*(RL.front?.55:.60));
        _hip.y-=RL.front?.32:.30;
        _hip.z+=RL.front?.08:-.10;
        /* offset rest lokal (maju +Z, kanan +X) → titik ideal DUNIA */
        const restLX=RL.side*.80, restLZ=RL.front?.30:-.25;
        const idealWorldX=mobX+(restLX*cosY+restLZ*sinY)*sc;
        const idealWorldZ=mobZ+(-restLX*sinY+restLZ*cosY)*sc;
        const idealGroundY=groundAt(idealWorldX,idealWorldZ,mobY+2.5);

        /* inisialisasi awal saat mob baru spawn */
        if(!RL.worldFoot){
          RL.worldFoot=new THREE.Vector3(idealWorldX,idealGroundY,idealWorldZ);
          RL.targetFoot=new THREE.Vector3(idealWorldX,idealGroundY,idealWorldZ);
          RL.stepStartFoot=new THREE.Vector3(idealWorldX,idealGroundY,idealWorldZ);
          RL.isStepping=false;RL.stepProgress=1.0;
          RL.stepDuration=0.2;RL.stepHeight=0.7;
        }

        /* LOMPAT: lipat kaki rapat ke tubuh selama di udara */
        if(jumping){
          const u=tA/JUMP_DUR;
          const airU=RL.front?.20:.33, landU=RL.front?.76:.87;
          if(u>=airU&&u<landU){
            RL.isStepping=false;
            const foldX=_hip.x+_v.x*RL.side*.45+(RL.front?-.30:.15)*FX;
            const foldZ=_hip.z+_v.z*RL.side*.45+(RL.front?-.30:.15)*FZ;
            const foldY=_hip.y-.52;
            RL.airborne=true;RL.grounded=false;
            _at.set(foldX,foldY,foldZ);
            _pole.copy(_hip).addScaledVector(_v,RL.side*1.5);
            _pole.z+=RL.front?-.5:.5;_pole.y+=.3;
            this._solveLegIK(_hip,_at,_pole,_knee,_ank);
            RL._airKnee={x:_knee.x,y:_knee.y,z:_knee.z};
            RL._airAnk={x:_ank.x,y:_ank.y,z:_ank.z};
            RL.needsLandSnap=true;
          }else if(u>=landU&&RL.needsLandSnap){
            RL.needsLandSnap=false;
            RL.worldFoot.set(idealWorldX,idealGroundY,idealWorldZ);
            RL.targetFoot.set(idealWorldX,idealGroundY,idealWorldZ);
            RL.isStepping=false;RL.airborne=false;RL.grounded=true;
          }
          if(RL.airborne&&RL._airKnee){
            _knee.set(RL._airKnee.x,RL._airKnee.y,RL._airKnee.z);
            _ank.set(RL._airAnk.x,RL._airAnk.y,RL._airAnk.z);
            L.upper.position.copy(_hip).add(_knee).multiplyScalar(.5);
            this._orient(L.upper,_hip,_knee,0);
            L.lower.position.copy(_knee).add(_ank).multiplyScalar(.5);
            this._orient(L.lower,_knee,_ank,0);
            L.knee.position.copy(_knee);
            L.ankleB.position.copy(_ank);
            L.pad.position.copy(_hip);L.pad.position.x+=_v.x*RL.side*.12;L.pad.position.z+=_v.z*RL.side*.12;
            L.pad.rotation.set(0,0,0);
            L.foot.position.copy(_ank);
            L.foot.rotation.set(.55,RL.side*.18,0);
            continue;
          }
        }
        if(RL.needsLandSnap&&(!jumping||tA/JUMP_DUR>=0.90)){
          RL.needsLandSnap=false;
          RL.worldFoot.set(idealWorldX,idealGroundY,idealWorldZ);
          RL.targetFoot.set(idealWorldX,idealGroundY,idealWorldZ);
          RL.isStepping=false;RL.airborne=false;
        }

        /* drift telapak vs titik ideal */
        const drift=Math.hypot(RL.worldFoot.x-idealWorldX,RL.worldFoot.z-idealWorldZ);
        if(drift>2.8*sc){
          RL.worldFoot.set(idealWorldX,idealGroundY,idealWorldZ);
          RL.isStepping=false;
        }

        if(RL.isStepping){
          RL.stepProgress+=dt/RL.stepDuration;
          const prog=Math.min(1.0,RL.stepProgress);
          const e=sstep(prog);
          const stepLift=(RL.stepHeight||0.7)*sc*(isRunning?1.25:1.0);
          const arc=Math.sin(prog*Math.PI)*stepLift;
          RL.worldFoot.x=RL.stepStartFoot.x+(RL.targetFoot.x-RL.stepStartFoot.x)*e;
          RL.worldFoot.z=RL.stepStartFoot.z+(RL.targetFoot.z-RL.stepStartFoot.z)*e;
          RL.worldFoot.y=RL.stepStartFoot.y+(RL.targetFoot.y-RL.stepStartFoot.y)*e+arc;
          if(prog>=1.0){
            RL.isStepping=false;
            RL.worldFoot.copy(RL.targetFoot);
            RL.grounded=true;
            if(typeof FX!=='undefined'&&FX.debris&&Math.random()<0.3){
              FX.debris(RL.worldFoot.clone().add(new THREE.Vector3(0,0.05,0)),0xb8a68e,2,0.8);
            }
          }
        }else{
          const grp=(i%2===0)?0:1;   // gait diagonal: (depan-kiri+belakang-kanan) vs sebaliknya
          const isAllowedGait=(grp===activeGrp)||(drift>maxDrift);
          const shouldStep=isMoving&&!act;
          if(isAllowedGait&&drift>stepThreshold&&shouldStep){
            RL.isStepping=true;RL.grounded=false;
            RL.stepProgress=0.0;
            RL.stepStartFoot.copy(RL.worldFoot);
            RL.stepDuration=isRunning?0.13:0.18;
            RL.stepHeight=isRunning?1.0:0.7;
            const lead=RL.stepDuration*1.4;
            let predX=idealWorldX+m.vel.x*lead;
            let predZ=idealWorldZ+m.vel.z*lead;
            const landY=groundAt(predX,predZ,mobY+2.5);
            RL.targetFoot.set(predX,landY,predZ);
          }else if(!isMoving){
            /* diam: telapak menyesuaikan kontur blok di bawahnya */
            const curY=groundAt(RL.worldFoot.x,RL.worldFoot.z,mobY+2.5);
            RL.worldFoot.y+=(curY-RL.worldFoot.y)*Math.min(1,12*dt);
          }
        }

        /* konversi telapak dunia → lokal mesh (mesh di m.pos, grup diskala
           sc; lokal: maju +Z, kanan +X), lalu IK 2-tulang */
        const dx=RL.worldFoot.x-mobX, dy=RL.worldFoot.y-mobY, dz=RL.worldFoot.z-mobZ;
        _at.set((dx*cosY-dz*sinY)/sc, dy/sc, (dx*sinY+dz*cosY)/sc);
        _pole.copy(_hip).addScaledVector(_v,RL.side*1.5);
        _pole.z+=RL.front?-.5:.5;_pole.y+=.3;
        this._solveLegIK(_hip,_at,_pole,_knee,_ank);
        L.upper.position.copy(_hip).add(_knee).multiplyScalar(.5);
        this._orient(L.upper,_hip,_knee,0);
        L.lower.position.copy(_knee).add(_ank).multiplyScalar(.5);
        this._orient(L.lower,_knee,_ank,0);
        L.knee.position.copy(_knee);
        L.ankleB.position.copy(_ank);
        L.pad.position.copy(_hip);L.pad.position.x+=_v.x*RL.side*.12;L.pad.position.z+=_v.z*RL.side*.12;
        L.pad.rotation.set(0,0,0);
        L.foot.position.copy(_ank);
        let tilt=0;
        if(RL.isStepping)tilt=Math.sin(Math.PI*Math.max(0,Math.min(1,RL.stepProgress)))*.45;
        L.foot.rotation.set(tilt,RL.side*.18,0);
      }

      /* ---------- semburan bisa (jendela semprot file asli: 0.55–1.85) ---------- */
      if(spraying&&m.iTarget!==undefined){
        R.emitAcc+=dt*70;
        while(R.emitAcc>=1){R.emitAcc--;this.venomBurst(m,true);}
      }else R.emitAcc=0;

      /* shake tubuh: getaran kecil saat patuk & mendarat (FX.addShake
         menangani guncangan layar; ini hanya getar mesh, lalu dipulihkan) */
      R.shake+=(0-R.shake)*Math.min(1,7*dt);
    },

    /* injeksi guncangan layar (dipakai monsters.js saat patuk & lompat mendarat) */
    addShake(m,v){
      if(typeof FX!=='undefined'&&FX.addShake)FX.addShake(Math.min(0.6,v*0.5));
    },

    /* =========================================================================
       SEMBURAN BISA — pool global, di-update sekali per frame.
       single=true: satu partikel (dipanggil berulang selama jendela semprot).
       Kena → damage + RACUN DoT (poisonHit ala kalajengking, lihat update()).
       ========================================================================= */
    _venom:null,_venomMesh:null,
    venomInit(){
      if(this._venom)return;
      this._venom=[];this._venomMesh=[];
      const scene=(typeof Game!=='undefined'&&Game.scene)?Game.scene:null;
      for(let i=0;i<VENOM_MAX;i++){
        this._venom.push({life:0,dmg:6,pos:new THREE.Vector3(),vel:new THREE.Vector3(),
          hit:false,src:null,rot:Math.random()*9});
        const mm=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.16,0.16),
          new THREE.MeshBasicMaterial({color:0x8fe02a,transparent:true,opacity:0.95}));
        mm.visible=false;
        if(scene)scene.add(mm);
        this._venomMesh.push(mm);
      }
    },
    /* semburkan bisa dari mulut ke arah sasaran tempur (pemain/NPC/pet/monster) */
    venomBurst(m,single){
      this.venomInit();
      const mouth=new THREE.Vector3();
      if(m.parts&&m.parts.mouth)m.parts.mouth.getWorldPosition(mouth);
      else mouth.copy(m.pos).add(new THREE.Vector3(0,1.0,0));
      let tgt=(m.iTarget&&!m.iTarget.dead)?m.iTarget:null;
      if(!tgt&&typeof Monsters!=='undefined'&&Monsters.battleTarget)
        tgt=Monsters.battleTarget(m,12);
      if(!tgt&&!m.pet&&typeof Player!=='undefined'&&!Player.dead)tgt=Player;
      if(!tgt)return;
      const toT=new THREE.Vector3().subVectors(
        tgt.pos.clone().add(new THREE.Vector3(0,0.9,0)),mouth);
      const dist=toT.length();toT.normalize();
      if(tgt.vel){toT.x+=tgt.vel.x*0.03*dist;toT.z+=tgt.vel.z*0.03*dist;toT.normalize();}
      const n=single?1:10;
      let spawned=0;
      for(let i=0;i<VENOM_MAX&&spawned<n;i++){
        const a=this._venom[i];
        if(a.life>0)continue;
        a.life=0.9+Math.random()*0.4;a.hit=false;a.dmg=Math.max(3,Math.round(m.dmg*0.45));
        a.src=m;
        a.pos.copy(mouth);
        a.pos.x+=(Math.random()-.5)*.14;a.pos.y+=(Math.random()-.5)*.14;a.pos.z+=(Math.random()-.5)*.14;
        a.vel.copy(toT).multiplyScalar(10+Math.random()*6);
        a.vel.x+=(Math.random()-.5)*3;a.vel.y+=(Math.random()-.5)*1.4+0.6;a.vel.z+=(Math.random()-.5)*3;
        const mm=this._venomMesh[i];
        if(mm)mm.material.color.setHex([0x9aff3a,0x77dd2a,0xbaff60,0x5fc422][(Math.random()*4)|0]);
        spawned++;
      }
      if(!single&&typeof Sfx!=='undefined'&&Sfx.at)Sfx.at(m.pos,'cast');
    },
    /* update semua partikel bisa — dipanggil SEKALI per frame dari Monsters.update */
    updateVenom(dt){
      this.venomInit();
      for(let i=0;i<VENOM_MAX;i++){
        const a=this._venom[i],mm=this._venomMesh[i];
        if(a.life>0){
          a.life-=dt;
          a.vel.y-=19*dt;
          a.vel.multiplyScalar(Math.max(0,1-1.1*dt));
          a.pos.addScaledVector(a.vel,dt);
          if(!a.hit&&typeof Monsters!=='undefined'&&Monsters.projTarget){
            const v=Monsters.projTarget(a.src,a.pos.x,a.pos.y,a.pos.z,0.9);
            if(v&&Monsters.hitTarget(a.src,v,a.dmg,1.5,a.pos.x,a.pos.z,1)){
              a.hit=true;a.life=0;
              /* RACUN susulan: 2 tick (jalur update() ala kalajengking).
                 Pet tidak boleh meracuni tuannya — hitTarget pet vs pemain/NPC
                 sudah ditolak, jadi aman set flag di sini. */
              if(a.src&&!a.src.pet){a.src.poisonHit=2;a.src.poisonT=1.0;}
              if(typeof FX!=='undefined'){
                FX.debris(v.pos.clone().add(new THREE.Vector3(0,1,0)),0x8fe02a,6,2.2);
                FX.text(v.pos.clone().add(new THREE.Vector3(0,2.2,0)),'☠ bisa','#8fe02a');
              }
            }
          }
          let gy=0.12;
          if(typeof World!=='undefined'&&World.groundAt){
            const g2=World.groundAt(a.pos.x,a.pos.z,a.pos.y+2);
            if(g2!==undefined&&isFinite(g2)&&g2>0)gy=g2+0.1;
          }
          if(a.pos.y<=gy&&a.vel.y<0){
            a.life=0;
            if(Math.random()<.35&&typeof FX!=='undefined')
              FX.debris(a.pos.clone(),0x6fae2a,3,1.2);
          }
          if(a.life>0){
            mm.visible=true;
            mm.position.copy(a.pos);
            mm.rotation.set(a.rot+a.life*6,a.rot*.7+a.life*5,0);
            mm.material.opacity=Math.min(1,a.life*3.2)*0.95;
          }else mm.visible=false;
        }else mm.visible=false;
      }
    },
  };

  window.Mob_Iguana=Mob_Iguana;
  return Mob_Iguana;
})();
