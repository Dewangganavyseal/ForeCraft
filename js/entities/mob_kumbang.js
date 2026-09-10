'use strict';
/* =============================================================================
   ENTITAS MOB: KUMBANG TANDUK (Horned Beetle)
   -----------------------------------------------------------------------------
   Diporting dari "NEW MODEL/Kumbang.html". Mob khusus biome TANAH MERAH
   (REDLANDS). Berkaki dua, bertanduk kepala & thorax, dengan sayap keras
   (elytra), lengan bercakar, dan perut bersegmen.

   Animasi (dipertahankan dari file asli):
     - idle  : napas, antena bergoyang, kepala menoleh
     - walk  : siklus kaki+lengan, bob badan, sayap bergetar
     - run   : gait lebih cepat, sedikit "melayang" tiap langkah
   Serangan (2, dipertahankan dari file asli):
     - attack ('Seruduk Tanduk')       : windup lalu hantam tanduk ke atas + slash
     - throw  ('Angkat & Lempar Balok') : mengangkat balok batu lalu melemparnya

   Damage & timeline serangan dikendalikan js/monsters.js (aiKumbang), sedangkan
   file ini menyediakan MODEL, pose animasi, dan POOL BALOK LEMPAR global.
   ============================================================================= */

const Mob_Kumbang=(()=>{

  const SCALE=0.6;                 // skala model di dunia voxel
  const HIP_Y=1.86, BASE_LEAN=0.34, HEAD_COMP=-0.26;
  /* ---------- ANGKAT BADAN AGAR KAKI MENAPAK ----------
     Titik terendah model (telapak + cakar) berada di y=-0.42 dalam satuan
     LOKAL model. Karena mesh kumbang ditaruh tepat di m.pos (permukaan tanah),
     kaki jadi tenggelam 0.42*SCALE ≈ 0.25 blok — dan pada boss (skala 1.75)
     hampir 0.45 blok, sehingga telapaknya hilang di dalam tanah.
     Nilai ini dipakai sebagai offset dasar root.position.y sehingga kaki
     benar-benar menapak; karena satuannya lokal, boss ikut terangkat
     proporsional tanpa perhitungan tambahan. */
  const FOOT_LIFT=0.42;

  /* material baru per-build supaya efek flash (emissive) tidak bocor antar mob */
  function makeMats(){
    const mk=c=>new THREE.MeshLambertMaterial({color:c});
    return {
      shell:mk(0x7a4f24), shellDark:mk(0x5a3a1a), shellLight:mk(0x96682f),
      horn:mk(0x8f5c26), hornDark:mk(0x4f3315), belly:mk(0x4a3319),
      leg:mk(0x5f3f1e), dark:mk(0x2e2013), accent:mk(0xc97b2f),
      eyeW:mk(0xfafaf2), pupil:mk(0x141414),
    };
  }
  const box=(w,h,d,material,x=0,y=0,z=0,cast=true)=>{
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    m.position.set(x,y,z);m.castShadow=cast&&!IS_MOBILE;
    return m;
  };

  /* ---------- keyframe pose serangan (dipertahankan dari file) ---------- */
  const CH=['hipsDY','crouch','spineP','headP','shL','shR','elL','elR','hornP','thorP','elyO','rootHop','abdP'];
  const Pose=o=>{const r={};CH.forEach(c=>r[c]=o[c]||0);return r;};
  const ZERO=Pose({});
  const easeInOutCubic=x=>x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
  const easeOutCubic  =x=>1-Math.pow(1-x,3);
  const ATK={
    times:[0,0.3,0.46,1],
    eases:[easeInOutCubic,easeOutCubic,easeInOutCubic],
    poses:[ZERO,
      Pose({crouch:0.85,hipsDY:-0.02,spineP:0.3,headP:0.5,shL:0.55,shR:0.55,elL:0.7,elR:0.7,
        hornP:0.4,thorP:0.18,abdP:-0.18}),
      Pose({crouch:-0.2,hipsDY:0.1,spineP:-0.24,headP:-1.0,shL:0.8,shR:0.8,elL:0.35,elR:0.35,
        hornP:-1.2,thorP:-0.4,abdP:0.25,elyO:0.5,rootHop:0.28}),
      ZERO]
  };
  const THR={
    times:[0,0.18,0.45,0.585,1],
    eases:[easeInOutCubic,easeInOutCubic,easeOutCubic,easeInOutCubic],
    poses:[ZERO,
      Pose({crouch:0.95,hipsDY:-0.02,spineP:0.52,headP:0.4,shL:-1.25,shR:-1.25,elL:-0.35,elR:-0.35,
        hornP:0.15,thorP:0.08,abdP:-0.1}),
      Pose({crouch:0.2,hipsDY:0.02,spineP:-0.16,headP:-0.35,shL:-3.0,shR:-3.0,elL:-0.3,elR:-0.3,
        hornP:-0.25,thorP:-0.15,abdP:0.12,elyO:0.2}),
      Pose({crouch:0.05,hipsDY:0.06,spineP:0.42,headP:0.12,shL:-0.45,shR:-0.45,elL:-0.1,elR:-0.1,
        hornP:0.12,thorP:0.05,abdP:0.18}),
      ZERO]
  };
  function samplePose(def,u){
    const {times,poses,eases}=def;
    if(u<=times[0])return poses[0];
    for(let i=0;i<times.length-1;i++){
      if(u<=times[i+1]){
        const k=eases[i]((u-times[i])/(times[i+1]-times[i]));
        const a=poses[i],b=poses[i+1],o={};
        for(const c of CH)o[c]=(a[c]||0)+((b[c]||0)-(a[c]||0))*k;
        return o;
      }
    }
    return poses[poses.length-1];
  }

  const Mob_Kumbang={
    SCALE,

    /* ---------- MODEL 3D ---------- */
    build(boss){
      const g=new THREE.Group();
      g.scale.setScalar(SCALE);
      const M=makeMats();
      const parts={};

      const root=new THREE.Group();root.position.y=FOOT_LIFT;g.add(root);parts.root=root;
      const hips=new THREE.Group();hips.position.y=HIP_Y;root.add(hips);parts.hips=hips;
      hips.add(box(1.1,0.5,0.85,M.shellDark,0,0.05,-0.1));
      hips.add(box(0.8,0.42,0.3,M.belly,0,-0.05,0.34));

      /* kaki: paha + betis + telapak & cakar */
      const makeLeg=side=>{
        const thigh=new THREE.Group();thigh.position.set(0.44*side,-0.05,0.05);hips.add(thigh);
        thigh.add(box(0.5,1.0,0.58,M.leg,0,-0.5,0));
        thigh.add(box(0.16,0.32,0.2,M.dark,0,-0.78,0.32));
        const knee=new THREE.Group();knee.position.set(0,-0.98,0.03);thigh.add(knee);
        knee.add(box(0.42,0.92,0.5,M.leg,0,-0.46,0));
        knee.add(box(0.14,0.28,0.16,M.dark,0,-0.32,0.28));
        knee.add(box(0.12,0.22,0.14,M.dark,0,-0.6,0.27));
        const ankle=new THREE.Group();ankle.position.set(0,-0.9,-0.02);knee.add(ankle);
        ankle.add(box(0.5,0.3,0.8,M.dark,0,-0.16,0.14));
        ankle.add(box(0.16,0.22,0.36,M.hornDark,-0.13,-0.24,0.62));
        ankle.add(box(0.16,0.22,0.36,M.hornDark,0.13,-0.24,0.62));
        ankle.add(box(0.3,0.2,0.2,M.dark,0,-0.2,-0.28));
        return {thigh,knee,ankle};
      };
      parts.legL=makeLeg(1);parts.legR=makeLeg(-1);

      /* dada / tulang belakang */
      const spine=new THREE.Group();spine.position.set(0,0.32,0.05);hips.add(spine);parts.spine=spine;
      spine.add(box(1.25,1.0,1.15,M.shell,0,0.55,0.1));
      spine.add(box(0.9,0.85,0.5,M.shellLight,0,0.5,0.62));
      spine.add(box(1.0,0.2,0.9,M.shellDark,0,1.08,0.12));
      spine.add(box(0.75,0.3,0.35,M.belly,0,-0.08,0.5,false));
      spine.add(box(0.1,0.1,1.2,M.dark,0,1.0,-0.65,false));

      /* sayap keras (elytra) */
      const makeElytron=side=>{
        const e=new THREE.Group();e.position.set(0.33*side,0.95,-0.15);spine.add(e);
        e.add(box(0.56,0.3,1.3,M.shell,0.02*side,0.05,-0.55));
        e.add(box(0.08,0.08,1.1,M.shellDark,0.14*side,0.2,-0.5));
        e.add(box(0.08,0.08,1.0,M.shellDark,-0.08*side,0.2,-0.48));
        e.add(box(0.16,0.05,0.16,M.accent,0.05*side,0.22,-0.25,false));
        e.add(box(0.14,0.05,0.14,M.accent,-0.02*side,0.22,-0.75,false));
        e.rotation.z=-0.1*side;e.rotation.x=0.18;
        return e;
      };
      parts.elyL=makeElytron(1);parts.elyR=makeElytron(-1);

      /* perut bersegmen */
      const abdomen=new THREE.Group();abdomen.position.set(0,0.42,-0.7);spine.add(abdomen);parts.abdomen=abdomen;
      abdomen.add(box(1.05,0.72,0.75,M.shellDark,0,-0.02,-0.2));
      abdomen.add(box(0.9,0.62,0.62,M.shell,0,-0.14,-0.72));
      abdomen.add(box(0.72,0.5,0.55,M.shellDark,0,-0.28,-1.18));
      abdomen.add(box(0.5,0.38,0.4,M.shell,0,-0.42,-1.58));
      abdomen.add(box(0.28,0.24,0.3,M.dark,0,-0.5,-1.86));
      abdomen.add(box(0.95,0.09,0.1,M.shellLight,0,0.3,-0.4,false));
      abdomen.add(box(0.8,0.08,0.09,M.shellLight,0,0.16,-0.9,false));

      /* lengan: bahu + siku + telapak & cakar */
      const makeArm=side=>{
        const sh=new THREE.Group();sh.position.set(0.82*side,0.78,0.32);spine.add(sh);
        sh.add(box(0.5,0.34,0.56,M.shellDark,0,0.05,0));
        sh.add(box(0.38,0.7,0.44,M.leg,0,-0.35,0));
        const el=new THREE.Group();el.position.set(0,-0.72,0);sh.add(el);
        el.add(box(0.34,0.62,0.4,M.leg,0,-0.28,0));
        el.add(box(0.14,0.3,0.16,M.dark,0,-0.08,-0.26));
        const hand=new THREE.Group();hand.position.set(0,-0.6,0);el.add(hand);
        hand.add(box(0.4,0.3,0.46,M.shellDark,0,-0.12,0.02));
        for(let i=-1;i<=1;i++)hand.add(box(0.11,0.34,0.13,M.dark,i*0.13,-0.34,0.16));
        return {sh,el,hand};
      };
      parts.armL=makeArm(1);parts.armR=makeArm(-1);

      /* kepala + mata + rahang + antena */
      const neck=new THREE.Group();neck.position.set(0,1.12,0.4);spine.add(neck);parts.neck=neck;
      neck.add(box(0.95,0.8,0.85,M.shell,0,0.28,0.25));
      neck.add(box(0.72,0.36,0.28,M.shellLight,0,0.1,0.72));
      for(const side of[1,-1]){
        neck.add(box(0.3,0.34,0.16,M.eyeW,0.34*side,0.42,0.62));
        neck.add(box(0.14,0.2,0.06,M.pupil,0.34*side,0.4,0.71));
        const brow=box(0.36,0.12,0.2,M.dark,0.34*side,0.63,0.62);brow.rotation.z=-0.3*side;neck.add(brow);
        const mand=box(0.15,0.18,0.38,M.dark,0.2*side,-0.02,0.85);mand.rotation.y=0.25*side;neck.add(mand);
      }
      const makeAntenna=side=>{
        const a=new THREE.Group();a.position.set(0.3*side,0.62,0.5);neck.add(a);
        a.add(box(0.07,0.07,0.3,M.dark,0,0.06,0.12));
        a.add(box(0.12,0.18,0.06,M.hornDark,0,0.14,0.28));
        a.add(box(0.12,0.14,0.05,M.hornDark,0,0.24,0.26));
        a.rotation.x=-0.6;a.rotation.z=-0.35*side;
        return a;
      };
      parts.antL=makeAntenna(1);parts.antR=makeAntenna(-1);

      /* tanduk kepala (melengkung, bercabang) + titik ujung */
      const hornPivot=new THREE.Group();hornPivot.position.set(0,0.6,0.5);neck.add(hornPivot);parts.hornPivot=hornPivot;
      {
        const s1=box(0.36,0.3,0.5,M.horn,0,0.16,0.2);s1.rotation.x=-0.5;
        const s2=box(0.3,0.26,0.52,M.horn,0,0.44,0.42);s2.rotation.x=-0.85;
        const s3=box(0.26,0.22,0.46,M.horn,0,0.74,0.55);s3.rotation.x=-1.15;
        hornPivot.add(s1,s2,s3);
        for(const side of[1,-1]){
          const f=box(0.12,0.14,0.32,M.hornDark,0.1*side,1.0,0.58);
          f.rotation.x=-1.5;f.rotation.y=0.25*side;hornPivot.add(f);
        }
      }
      const hornTip=new THREE.Object3D();hornTip.position.set(0,1.05,0.7);hornPivot.add(hornTip);parts.hornTip=hornTip;

      /* tanduk thorax besar melengkung di atas kepala */
      const thorPivot=new THREE.Group();thorPivot.position.set(0,0.95,0.7);spine.add(thorPivot);parts.thorPivot=thorPivot;
      {
        const t1=box(0.44,0.34,0.55,M.horn,0,0.2,0.2);t1.rotation.x=-0.55;
        const t2=box(0.36,0.3,0.6,M.horn,0,0.62,0.42);t2.rotation.x=-0.95;
        const t3=box(0.3,0.24,0.5,M.horn,0,1.1,0.5);t3.rotation.x=-1.25;
        thorPivot.add(t1,t2,t3);
        for(const side of[1,-1]){
          const f=box(0.13,0.14,0.36,M.hornDark,0.1*side,1.42,0.45);
          f.rotation.x=-1.5;f.rotation.y=0.3*side;thorPivot.add(f);
        }
      }

      return {mesh:g,parts};
    },

    /* ---------- ANIMASI (locomotion + overlay serangan) ---------- */
    animate(m,dt){
      const P=m.parts;if(!P||!P.hips)return;
      const t=(m._kt=(m._kt||0)+dt);
      const speed=Math.hypot(m.vel.x,m.vel.z);

      /* ---------- GAIT: dinilai RELATIF terhadap kecepatan puncak mob ----------
         Dulu ambangnya absolut (speed<3.0 → walk, di atasnya → run). Boss
         berjalan 2.55 blok/detik sehingga selalu terkunci di 'walk', padahal
         kakinya jauh lebih panjang. Sekarang dipakai rasio speed/topSpeed agar
         pose berlari muncul saat mob memang mendekati kecepatan maksimalnya,
         berapa pun ukurannya. */
      const top=Math.max(0.6,m.speed||3.0);
      const rel=clamp(speed/top,0,1.4);
      const gt=speed<0.18?0:(rel<0.62?0.5:1);
      m._gait=(m._gait||0);m._gait+=(gt-m._gait)*(1-Math.exp(-5*dt));
      const gait=m._gait;
      const gVis=clamp(gait/0.5,0,1),runA=clamp((gait-0.5)/0.5,0,1);

      /* ---------- FREKUENSI LANGKAH = KECEPATAN ÷ PANJANG LANGKAH ----------
         BUGFIX "kaki bergerak cepat padahal jalan lambat":
         Dulu frekuensinya konstan (1.55 Hz jalan / 2.9 Hz lari) dan sama sekali
         tidak melihat kecepatan nyata maupun ukuran tubuh. Akibatnya boss
         kumbang — yang skalanya 1.75 (kaki hampir 3x lebih panjang) dan justru
         BERJALAN LEBIH LAMBAT (speed x0.85) — mengayuh kakinya secepat kumbang
         kecil, sehingga terlihat "sliding"/ngebut di tempat.

         Kini dipakai hubungan fisik yang benar: satu siklus langkah memindahkan
         tubuh sejauh SATU PANJANG LANGKAH, dan panjang langkah sebanding dengan
         panjang kaki (tinggi pinggul di dunia). Jadi:
             frekuensi (siklus/detik) = kecepatan / panjang langkah
         Mob besar otomatis melangkah lebih jarang tapi lebih lebar, dan tiap
         perubahan kecepatan langsung tercermin di kaki. */
      const wScale=(m.mesh&&m.mesh.scale&&m.mesh.scale.x)?m.mesh.scale.x:SCALE;
      const hipW=HIP_Y*wScale;                  // tinggi pinggul dalam satuan dunia
      const stride=Math.max(0.45,hipW*1.15);    // panjang satu siklus langkah
      /* dibatasi supaya kaki tidak pernah berkedut saat mob terdorong/knockback */
      const strideFreq=clamp(speed/stride,0,3.2);
      m._phase=(m._phase||0)+strideFreq*Math.PI*2*dt;
      const p=m._phase;
      const sL=Math.sin(p),sR=Math.sin(p+Math.PI);
      const swing=(0.55+0.5*runA)*gVis,kneeAmp=(0.5+0.75*runA)*gVis;
      let thighL=-sL*swing,thighR=-sR*swing;
      let kneeL=Math.max(0,sL)*kneeAmp,kneeR=Math.max(0,sR)*kneeAmp;
      const armSwing=(0.4+0.5*runA)*gVis;
      let shL=sL*armSwing,shR=sR*armSwing;
      let elL=-(0.25+Math.max(0,-sL)*0.6*gVis);
      let elR=-(0.25+Math.max(0,-sR)*0.6*gVis);

      /* overlay pose serangan (timeline di-drive monsters.js: m.kumAtk*) */
      let A=ZERO;
      if(m.kumAtk){
        const u=clamp((m.kumAtkT||0)/(m.kumAtkDur||1),0,1);
        A=samplePose(m.kumAtk==='attack'?ATK:THR,u);
      }

      const cT=0.12+runA*0.12*gVis+A.crouch;
      thighL+=-0.5*cT;thighR+=-0.5*cT;
      kneeL+=0.95*cT;kneeR+=0.95*cT;
      const footL=-(thighL+kneeL)*0.72,footR=-(thighR+kneeR)*0.72;
      shL+=A.shL;shR+=A.shR;elL+=A.elL;elR+=A.elR;

      const bobA=(0.05+0.08*runA)*gVis;
      const bob=(0.5+0.5*Math.cos(2*p))*bobA;
      const flight=Math.max(0,-Math.cos(p))*0.1*runA*gVis;
      const breath=Math.sin(t*2.2)*0.02*(1-gVis);

      P.root.position.y=FOOT_LIFT+flight+Math.max(0,A.rootHop);
      P.hips.position.y=HIP_Y-cT*0.55-bob+A.hipsDY;
      P.hips.rotation.y=Math.sin(p)*0.06*gVis;
      P.hips.rotation.z=Math.sin(p)*0.035*gVis+Math.sin(t*0.9)*0.02*(1-gVis);

      P.spine.rotation.x=BASE_LEAN+gVis*(0.05+0.24*runA)+Math.sin(p)*0.03*gVis+A.spineP+breath;
      P.spine.rotation.y=-Math.sin(p)*0.05*gVis;

      P.neck.rotation.x=HEAD_COMP-gVis*(0.05+0.18*runA)+Math.sin(p+0.7)*0.05*gVis+A.headP+breath*0.6;
      P.neck.rotation.y=Math.sin(t*0.6)*0.22*(1-gVis)+Math.sin(p)*0.03*gVis;
      P.neck.rotation.z=Math.sin(t*0.8)*0.03*(1-gVis);

      P.hornPivot.rotation.x=Math.sin(p-0.9)*0.06*gVis+Math.sin(t*1.7)*0.025+A.hornP;
      P.thorPivot.rotation.x=Math.sin(p-1.3)*0.05*gVis+Math.sin(t*1.4+1)*0.02+A.thorP;

      P.antL.rotation.z=-0.35+Math.sin(t*3.1)*0.15+gVis*Math.sin(p*2)*0.08;
      P.antR.rotation.z=0.35+Math.sin(t*3.1+1.3)*0.15+gVis*Math.sin(p*2+1)*0.08;

      P.elyL.rotation.x=0.18+A.elyO*0.5+runA*gVis*Math.sin(t*25)*0.02;
      P.elyR.rotation.x=0.18+A.elyO*0.5+runA*gVis*Math.sin(t*25+0.5)*0.02;

      P.abdomen.rotation.x=0.1+Math.sin(p-0.8)*0.06*gVis+Math.sin(t*2.2+1)*0.02*(1-gVis)+A.abdP;
      P.abdomen.rotation.y=Math.sin(p-0.6)*0.1*gVis;

      P.legL.thigh.rotation.x=thighL;P.legL.knee.rotation.x=kneeL;P.legL.ankle.rotation.x=footL;
      P.legR.thigh.rotation.x=thighR;P.legR.knee.rotation.x=kneeR;P.legR.ankle.rotation.x=footR;
      P.armL.sh.rotation.x=shL;P.armL.el.rotation.x=elL;
      P.armR.sh.rotation.x=shR;P.armR.el.rotation.x=elR;
    },
  };

  /* =============================================================================
     POOL BATU LEMPAR (serangan 'throw') — global, di-update sekali per frame
     dari Monsters.update.

     DUA UKURAN, mengikuti pelempranya:
       · kumbang biasa → BATU KECIL satu kubus (seperti versi awal). Kumbang
         biasa bertubuh kecil, jadi bongkahan raksasa terlihat mustahil.
       · kumbang BOSS  → BONGKAHAN 4×4 voxel, menyesuaikan tubuhnya yang 1.75×.
         Ukurannya setengah dari versi sebelumnya (voxel 0.92 → 0.46) supaya
         proporsional, tidak menutupi layar.

     LINTASAN: kecepatan lempar dihitung BALISTIK sehingga batu mendarat tepat
     di titik sasaran (lihat throwBlock) — bukan lagi tebakan sudut tetap.
     ============================================================================= */
  Mob_Kumbang.BLOCK_GRID=4;               // 4×4 voxel per sisi (bongkahan boss)
  Mob_Kumbang.BLOCK_VOX=0.46;             // ukuran satu voxel (½ dari sebelumnya)
  Mob_Kumbang.BLOCK_SIZE=Mob_Kumbang.BLOCK_GRID*Mob_Kumbang.BLOCK_VOX;  // ≈1.84
  Mob_Kumbang.SMALL_SIZE=0.55;            // batu kumbang biasa (versi awal)
  Mob_Kumbang.GRAV=15;                    // gravitasi batu (dipakai juga saat membidik)
  Mob_Kumbang.BLOCK_MAX=6;
  Mob_Kumbang._blocks=null;
  /* bongkahan boss = grup voxel abu-abu dengan sedikit variasi warna supaya
     seams antar voxel terlihat (bukan kubus polos raksasa) */
  Mob_Kumbang._buildBoulder=function(){
    const G=this.BLOCK_GRID,V=this.BLOCK_VOX;
    const g=new THREE.Group();
    const mats=[
      new THREE.MeshLambertMaterial({color:0x9a9a9a}),
      new THREE.MeshLambertMaterial({color:0x8b8b8b}),
      new THREE.MeshLambertMaterial({color:0xa6a6a6}),
    ];
    const off=(G-1)/2;
    for(let x=0;x<G;x++)for(let y=0;y<G;y++)for(let z=0;z<G;z++){
      /* kulit saja: voxel dalam tidak pernah terlihat */
      const edge=(x===0||x===G-1||y===0||y===G-1||z===0||z===G-1);
      if(!edge)continue;
      const c=new THREE.Mesh(new THREE.BoxGeometry(V,V,V),
        mats[(x+y+z)%mats.length]);
      c.position.set((x-off)*V,(y-off)*V,(z-off)*V);
      c.castShadow=!IS_MOBILE;
      g.add(c);
    }
    g.userData.mats=mats;
    return g;
  };
  /* batu kecil kumbang biasa: satu kubus, persis seperti versi awal */
  Mob_Kumbang._buildPebble=function(){
    const S=this.SMALL_SIZE;
    const m=new THREE.Mesh(new THREE.BoxGeometry(S,S,S),
      new THREE.MeshLambertMaterial({color:0x9a9a9a}));
    m.castShadow=!IS_MOBILE;
    return m;
  };
  /* Pool dipisah per jenis: mesh bongkahan mahal dibuat, jadi keduanya
     disiapkan sekali lalu dipakai ulang. `kind`:'big'|'small'. */
  Mob_Kumbang.blockInit=function(){
    if(this._blocks)return;
    this._blocks=[];
    const scene=(typeof Game!=='undefined'&&Game.scene)?Game.scene:null;
    const push=(mesh,kind,base)=>{
      mesh.visible=false;
      if(scene)scene.add(mesh);
      this._blocks.push({mesh,kind,base,vel:new THREE.Vector3(),ang:new THREE.Vector3(),
        life:0,dmg:8,hit:false,alive:false,scale:1,half:base*0.5,
        owner:null,foe:null});
    };
    for(let i=0;i<this.BLOCK_MAX;i++)push(this._buildPebble(),'small',this.SMALL_SIZE);
    for(let i=0;i<3;i++)push(this._buildBoulder(),'big',this.BLOCK_SIZE);
  };

  /* ---------------------------------------------------------------------------
     LEMPAR BATU
     `m`      = kumbang pelempar
     `target` = sasaran (opsional). Default pemain; saat kumbang menjadi PET,
                Monsters.petAttack mengirim monster musuh sebagai sasaran.

     PEMBIDIKAN BALISTIK: dulu kecepatannya ditebak (`vy=6+dist*0.22`) sehingga
     batu sering jatuh jauh di depan/belakang sasaran. Sekarang waktu terbang
     `t` ditentukan dari jarak, lalu kecepatan dihitung dari persamaan gerak
     supaya batu MENDARAT TEPAT di titik sasaran:
         vx,vz = Δx/t , Δz/t
         vy    = (Δy + ½·g·t²) / t
     Sasaran yang bergerak diberi sedikit lead (prediksi posisi saat batu tiba)
     supaya lemparan tidak selalu ketinggalan di belakang. */
  Mob_Kumbang.throwBlock=function(m,target){
    this.blockInit();
    const tgt=target||((typeof Player!=='undefined')?Player:null);
    if(!tgt||!tgt.pos)return;
    /* boss memakai bongkahan besar; kumbang biasa memakai batu kecil */
    const mScale=(m.mesh&&m.mesh.scale&&m.mesh.scale.x)?m.mesh.scale.x/SCALE:1;
    const big=!!m.boss||mScale>1.3;
    const kind=big?'big':'small';
    let b=this._blocks.find(x=>!x.alive&&x.kind===kind);
    if(!b)b=this._blocks.find(x=>!x.alive);        // pool sejenis penuh
    if(!b)return;

    /* titik lempar: dari kepala (cakar mengangkat batu di depan kepala) */
    const from=new THREE.Vector3();
    if(m.parts&&m.parts.neck){m.parts.neck.getWorldPosition(from);from.y+=0.6;}
    else from.copy(m.pos).add(new THREE.Vector3(0,2.2,0));

    /* skala batu: bongkahan boss ikut ukuran tubuh, batu kecil tetap 1× */
    const sc=big?clamp(Math.sqrt(mScale),0.9,1.35):1;
    b.scale=sc;
    b.half=b.base*0.5*sc;

    /* geser titik lempar ke depan supaya batu tidak menembus kepala sendiri */
    const flat0=Math.hypot(tgt.pos.x-from.x,tgt.pos.z-from.z)||1e-4;
    const dx0=(tgt.pos.x-from.x)/flat0,dz0=(tgt.pos.z-from.z)/flat0;
    from.x+=dx0*(b.half+0.15);
    from.z+=dz0*(b.half+0.15);

    /* ---- SOLUSI BALISTIK ke titik sasaran ---- */
    const aimY=(tgt===Player)?0.9:                        // dada pemain
               (tgt.r?Math.max(0.6,tgt.r*1.2):0.9);        // badan monster
    let tx=tgt.pos.x,ty=tgt.pos.y+aimY,tz=tgt.pos.z;
    const dist0=Math.hypot(tx-from.x,tz-from.z);
    /* waktu terbang: makin jauh makin lama, dibatasi agar tetap terasa cepat */
    const t=clamp(0.35+dist0*0.075,0.5,1.8);
    /* lead sasaran bergerak (setengah prediksi supaya masih bisa dihindari) */
    if(tgt.vel){
      tx+=tgt.vel.x*t*0.5;
      tz+=tgt.vel.z*t*0.5;
    }
    const dx=tx-from.x,dy=ty-from.y,dz=tz-from.z;
    const g=this.GRAV;
    b.vel.set(dx/t,(dy+0.5*g*t*t)/t,dz/t);

    b.alive=true;b.hit=false;b.life=t+3;
    b.dmg=Math.max(4,Math.round(m.dmg*1.0));
    b.owner=m;
    /* pet melempar ke monster: batunya tidak boleh melukai pemain */
    b.foe=(tgt!==Player)?tgt:null;
    b.fromPet=!!m.pet;
    b.mesh.visible=true;
    b.mesh.position.copy(from);
    b.mesh.scale.setScalar(sc);
    /* bongkahan berat berputar lebih lambat daripada batu kecil */
    const spin=big?3.4:9;
    b.ang.set((Math.random()-0.5)*spin,(Math.random()-0.5)*spin,(Math.random()-0.5)*spin);
    if(typeof Sfx!=='undefined'&&Sfx.at)Sfx.at(m.pos,big?'smash':'hit');
  };
  Mob_Kumbang.updateBlocks=function(dt){
    if(!this._blocks)return;
    for(const b of this._blocks){
      if(!b.alive)continue;
      const half=b.half||b.base*0.5;
      const big=b.kind==='big';
      b.life-=dt;
      b.vel.y-=this.GRAV*dt;
      b.mesh.position.addScaledVector(b.vel,dt);
      b.mesh.rotation.x+=b.ang.x*dt;b.mesh.rotation.y+=b.ang.y*dt;b.mesh.rotation.z+=b.ang.z*dt;

      /* ---- kena sasaran ---- */
      if(!b.hit){
        if(b.foe){
          /* batu pet: hanya melukai monster sasaran (dan monster liar lain) */
          if(!b.foe.dead&&
             b.mesh.position.distanceTo(b.foe.pos)<half+(b.foe.r||0.6)+0.4){
            b.hit=true;
            if(typeof Monsters!=='undefined'&&Monsters.hurt){
              const kb=new THREE.Vector3(b.vel.x,0.3,b.vel.z);
              Monsters.hurt(b.foe,b.dmg,kb,big?5:3,b.owner);
            }
            if(typeof FX!=='undefined')
              FX.debris(b.foe.pos.clone().add(new THREE.Vector3(0,1,0)),0x9a9a9a,big?12:7,big?3:2.2);
            this._destroyBlock(b);
            continue;
          }
        }else if(!b.fromPet&&typeof Player!=='undefined'&&!Player.dead&&
                 b.mesh.position.distanceTo(Player.pos.clone().add(new THREE.Vector3(0,0.9,0)))<half+0.7){
          b.hit=true;
          Player.takeDamage(b.dmg,null);
          const a=Math.atan2(Player.pos.x-b.mesh.position.x,Player.pos.z-b.mesh.position.z);
          /* bongkahan besar melempar pemain lebih jauh */
          const push=big?8:5;
          Player.vel.x+=Math.sin(a)*push;Player.vel.z+=Math.cos(a)*push;
          if(big)Player.vel.y=Math.max(Player.vel.y,3.5);
          if(typeof FX!=='undefined'){
            FX.debris(Player.pos.clone().add(new THREE.Vector3(0,1,0)),0x9a9a9a,big?14:8,big?3.2:2.4);
            FX.text(Player.pos.clone().add(new THREE.Vector3(0,2.2,0)),'📦','#bfbfbf');
            if(big)FX.addShake(0.5);
          }
          this._destroyBlock(b);
          continue;
        }
      }

      /* ---- menyentuh tanah ---- */
      const gy=(typeof World!=='undefined'&&World.groundAt)?World.groundAt(b.mesh.position.x,b.mesh.position.z,b.mesh.position.y+2):0.3;
      if(b.mesh.position.y<=gy+half&&b.vel.y<0){
        if(Math.abs(b.vel.y)>2.2){
          b.mesh.position.y=gy+half;
          /* bongkahan besar memantul lebih tumpul & mengguncang tanah */
          b.vel.y*=big?-0.3:-0.42;
          b.vel.x*=big?0.66:0.72;b.vel.z*=big?0.66:0.72;
          b.ang.multiplyScalar(big?0.55:0.6);
          if(typeof FX!=='undefined'){
            FX.debris(new THREE.Vector3(b.mesh.position.x,gy+0.1,b.mesh.position.z),0xcfcfcf,big?8:4,big?2.2:1.6);
            if(big){
              if(FX.ring)FX.ring(b.mesh.position.x,gy+0.06,b.mesh.position.z,0xbfbfbf,0.4,half*1.6);
              FX.addShake(0.22);
            }
          }
        }else{this._destroyBlock(b);continue;}
      }
      if(b.life<=0){this._destroyBlock(b);}
    }
  };
  Mob_Kumbang._destroyBlock=function(b){
    b.alive=false;b.mesh.visible=false;b.owner=null;b.foe=null;
    if(typeof FX!=='undefined'){
      const half=b.half||b.base*0.5;
      const big=b.kind==='big';
      FX.debris(b.mesh.position.clone(),0x9a9a9a,big?18:10,big?3.4:2.6);
      if(FX.ring)FX.ring(b.mesh.position.x,0.06,b.mesh.position.z,0xbfbfbf,0.5,half*2.2);
    }
  };

  window.Mob_Kumbang=Mob_Kumbang;
  return Mob_Kumbang;
})();
