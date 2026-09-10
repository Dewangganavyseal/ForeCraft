'use strict';
/* =============================================================================
   ENTITAS MOB: SEMUT MONSTER (🐜 Voxel Ant)
   -----------------------------------------------------------------------------
   Diporting dari "NEW MODEL/Semut.html". Mob biome TANAH MERAH (REDLANDS),
   berdampingan dengan Kumbang Tanduk.

   SELURUH 5 AKSI dari file asli dipakai di dalam game:
     idle · walk · run          → locomotion (dipilih dari kecepatan nyata)
     bite  'Serangan Gigit'      → menerjang pendek lalu menggigit dengan rahang
     dash  'Serangan Maju Cepat' → melesat lurus menabrak sasaran

   CATATAN ORIENTASI: model asli menghadap +X, sementara seluruh mob di game ini
   menghadap +Z (arah hadap diatur mesh.rotation.y memakai sin/cos). Karena itu
   model dibungkus grup `face` yang diputar -90° pada Y, jadi rig & seluruh pose
   (yang memakai rotasi sumbu Z untuk ayunan kaki) bisa dipertahankan apa adanya.
   ============================================================================= */

const Mob_Semut=(()=>{

  /* ---------- SKALA ----------
     Disetel agar UKURAN semut setara kumbang. Yang disamakan adalah JANGKAUAN
     TERPANJANG (footprint), bukan tinggi: semut berbadan panjang-rendah
     sedangkan kumbang berdiri tegak di dua kaki, jadi menyamakan tinggi akan
     membuat badan semut memanjang jauh melebihi kumbang dan terlihat lebih
     besar. Perhitungannya:
       panjang model semut (lokal)   = 13.08  → 0.42 lama = 5.49 blok (kebesaran)
       panjang kumbang (dunia)       = 2.63 blok
       skala = 0.42 × (2.63 / 5.49) ≈ 0.20
     Hasil akhir: panjang 2.62 blok & tinggi 1.48 blok — footprint-nya praktis
     identik dengan kumbang (2.63). */
  const SCALE=0.20;
  const BODY_Y=3.45;                // tinggi toraks dalam satuan lokal model
  /* ---------- ANGKAT BADAN AGAR KAKI MENAPAK ----------
     Titik terendah model (cakar tarsus) berada di y=-0.65 satuan LOKAL. Karena
     mesh ditaruh tepat di m.pos (permukaan tanah), tanpa offset ini cakarnya
     tenggelam 0.65*SCALE ≈ 0.16 blok — dan pada mini boss lebih dalam lagi.
     Satuannya lokal, jadi boss ikut terangkat proporsional. */
  const FOOT_LIFT=0.65;

  /* ---------- helper voxel ---------- */
  const unitGeo=()=> new THREE.BoxGeometry(1,1,1);
  let UNIT=null;
  const geo=()=>UNIT||(UNIT=unitGeo());

  /* palet (persis Semut.html) */
  const C={
    body:0x8a3b1f, light:0xa5502a, hi:0xc06a38,
    dark:0x5e2412, deep:0x38130a, band:0x4a1c0d, tooth:0xe8d9b0
  };

  /* ---------- keyframe serangan ---------- */
  const easeOut=t=>1-(1-t)*(1-t);
  const easeInOut=t=>t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;

  const Mob_Semut={
    SCALE,
    /* durasi & titik damage tiap aksi (dibaca js/monsters.js) */
    DUR:{bite:0.85,dash:1.35},
    /* gigitan: fase windup 0.16s, sentak 0.15s; damage dilepas di 62% sentak */
    BITE_W:0.16, BITE_S:0.15,
    HIT:{bite:0.16+0.15*0.62},

    /* ---------- MODEL 3D ---------- */
    build(boss){
      const g=new THREE.Group();
      g.scale.setScalar(SCALE);
      const parts={};

      /* material dibuat baru per semut agar flash-hit tidak menular */
      const cache={};
      const M=(color,emissive,ei)=>{
        const k=color+'_'+(emissive||0)+'_'+(ei||1);
        if(!cache[k])cache[k]=new THREE.MeshLambertMaterial({
          color,emissive:emissive||0x000000,emissiveIntensity:ei===undefined?1:ei});
        return cache[k];
      };
      const vox=(parent,w,h,d,x,y,z,material,rx,ry,rz)=>{
        const m=new THREE.Mesh(geo(),material);
        m.position.set(x,y,z);m.scale.set(w,h,d);
        if(rx||ry||rz)m.rotation.set(rx||0,ry||0,rz||0);
        m.castShadow=!IS_MOBILE;
        parent.add(m);return m;
      };

      const mandMat=new THREE.MeshLambertMaterial({color:0x2e0f06});
      const eyeMat=new THREE.MeshLambertMaterial({color:0x1c0606,
        emissive:0xff2417,emissiveIntensity:0.55});
      const glintMat=new THREE.MeshBasicMaterial({color:0xffffff});
      parts.mandMat=mandMat;parts.eyeMat=eyeMat;

      /* model asli menghadap +X → diputar agar menghadap +Z seperti mob lain.
         `face` juga membawa FOOT_LIFT supaya cakarnya menapak, bukan terbenam. */
      const face=new THREE.Group();
      face.rotation.y=-Math.PI/2;
      face.position.y=FOOT_LIFT;
      g.add(face);
      parts.face=face;

      const body=new THREE.Group();body.position.y=BODY_Y;face.add(body);parts.body=body;

      /* ---- Toraks ---- */
      vox(body,2.9,1.5,1.7,  0,0,0,        M(C.body));
      vox(body,1.7,0.55,1.3, 0.35,0.95,0,  M(C.light));
      vox(body,0.8,1.1,1.4,  1.3,0.35,0,   M(C.body));
      vox(body,2.4,0.4,1.3,  0,-0.78,0,    M(C.dark));
      vox(body,0.5,0.3,0.08, 0.2,0.1,0.86, M(C.deep));
      vox(body,0.5,0.3,0.08, 0.2,0.1,-0.86,M(C.deep));
      vox(body,0.28,0.42,0.28,-0.5,1.2,0.35, M(C.dark));
      vox(body,0.16,0.26,0.16,-0.5,1.5,0.35, M(C.deep));
      vox(body,0.28,0.42,0.28,-0.5,1.2,-0.35,M(C.dark));
      vox(body,0.16,0.26,0.16,-0.5,1.5,-0.35,M(C.deep));

      /* ---- Pinggang ---- */
      vox(body,0.65,0.95,0.95,-1.85,0.05,0, M(C.dark));
      vox(body,0.55,0.8,0.85, -2.35,0.1,0,  M(C.body));
      vox(body,0.2,0.35,0.2,  -2.35,0.62,0, M(C.deep));

      /* ---- Kepala ---- */
      const head=new THREE.Group();head.position.set(1.55,0.5,0);body.add(head);parts.head=head;
      parts.headX=head.position.x;
      vox(head,1.7,1.7,2.05, 0.95,0.15,0,   M(C.body));
      vox(head,1.75,0.35,2.1,0.95,0.95,0,   M(C.dark));
      vox(head,0.3,0.5,2.12, 1.78,0,0,      M(C.light));
      vox(head,0.6,0.5,0.5,  0.75,-0.55,0.55, M(C.dark));
      vox(head,0.6,0.5,0.5,  0.75,-0.55,-0.55,M(C.dark));
      vox(head,0.26,0.5,0.26,0.35,1.15,0.5,  M(C.deep),0,0,-0.45);
      vox(head,0.26,0.5,0.26,0.35,1.15,-0.5, M(C.deep),0,0,-0.45);
      vox(head,0.55,0.78,0.3,1.15,0.35,1.02,  eyeMat);
      vox(head,0.55,0.78,0.3,1.15,0.35,-1.02, eyeMat);
      vox(head,0.12,0.16,0.08,1.3,0.6,1.18,  glintMat);
      vox(head,0.12,0.16,0.08,1.3,0.6,-1.18, glintMat);

      /* ---- Rahang (mandibel) ---- */
      const mand=s=>{
        const a=new THREE.Group();a.position.set(1.75,-0.35,s*0.5);head.add(a);
        vox(a,0.55,0.46,0.46, 0.25,0,0, mandMat);
        vox(a,0.5,0.36,0.36,  0.62,0.02,s*-0.08, mandMat,0,s*-0.2,0);
        vox(a,0.35,0.3,0.28,  0.98,0.05,s*-0.2,  mandMat,0,s*-0.45,0);
        vox(a,0.18,0.22,0.16, 0.8,-0.12,s*-0.15, M(C.tooth));
        return a;
      };
      parts.mandL=mand(1);parts.mandR=mand(-1);
      /* titik ujung rahang: sumber FX gigitan */
      const jawTip=new THREE.Object3D();jawTip.position.set(2.6,-0.3,0);head.add(jawTip);
      parts.jawTip=jawTip;

      /* ---- Antena ---- */
      const ant=s=>{
        const a=new THREE.Group();a.position.set(1.45,0.8,s*0.6);head.add(a);
        a.rotation.set(0.35*s,0,-0.5);
        vox(a,0.2,0.55,0.2, 0,0.25,0, M(C.dark));
        const b=new THREE.Group();b.position.set(0,0.5,0);b.rotation.z=-0.35;a.add(b);
        vox(b,0.17,0.75,0.17, 0,0.35,0, M(C.body));
        const c=new THREE.Group();c.position.set(0,0.72,0);c.rotation.z=-0.3;b.add(c);
        vox(c,0.15,0.55,0.15, 0,0.26,0, M(C.light));
        vox(c,0.14,0.3,0.14,  0,0.62,0, M(C.hi));
        a.userData.tip=c;return a;
      };
      parts.antL=ant(1);parts.antR=ant(-1);

      /* ---- Perut (gaster) ---- */
      const gaster=new THREE.Group();gaster.position.set(-2.7,0.2,0);body.add(gaster);
      parts.gaster=gaster;
      vox(gaster,1.2,1.5,1.55, -0.55,0,0,     M(C.body));
      vox(gaster,0.28,1.62,1.68,-1.2,0,0,     M(C.band));
      vox(gaster,1.5,1.9,1.95, -2.05,0.05,0,  M(C.body));
      vox(gaster,1.1,0.3,1.2,  -2.05,1.0,0,   M(C.hi));
      vox(gaster,0.28,1.8,1.85,-2.95,0.05,0,  M(C.band));
      vox(gaster,1.25,1.6,1.65,-3.7,0.05,0,   M(C.body));
      vox(gaster,0.24,1.4,1.5, -4.4,0.05,0,   M(C.band));
      vox(gaster,0.9,1.15,1.2, -4.95,0,0,     M(C.dark));
      vox(gaster,0.45,0.4,0.4, -5.5,-0.05,0,  M(C.deep));
      vox(gaster,0.2,0.2,0.2,  -5.78,-0.08,0, M(C.deep));

      /* ---- 6 kaki menyamping (coxa → femur keluar → lutut → tibia) ----
         splay 0.85 rad (±49°) memberi stance lebar khas semut. */
      parts.legs=[];
      const buildLeg=(pair,s)=>{
        const hip=new THREE.Group();
        hip.position.set(pair===0?1.15:pair===1?0.05:-1.05,-0.35,
          s*(pair===0?0.75:pair===1?0.9:0.85));
        body.add(hip);
        vox(hip,0.5,0.5,0.7, 0,-0.05,s*0.25, M(C.dark));       // coxa

        const femur=new THREE.Group();
        femur.position.set(0,-0.2,s*0.3);hip.add(femur);
        const baseSplay=0.85;
        femur.rotation.x=-baseSplay*s;
        vox(femur,0.46,0.5,0.46, 0,-0.2,0, M(C.light));
        vox(femur,0.44,1.3,0.44, 0,-0.8,0, M(C.body));
        vox(femur,0.34,0.4,0.34, 0,-1.4,0, M(C.dark));

        const knee=new THREE.Group();
        knee.position.set(0,-1.5,0);femur.add(knee);
        const baseKnee=baseSplay+0.12;
        knee.rotation.x=baseKnee*s;
        vox(knee,0.4,0.42,0.4, 0,0,0,     M(C.dark));
        vox(knee,0.3,1.4,0.3,  0,-0.8,0,  M(C.body));
        vox(knee,0.24,0.5,0.24,0,-1.6,0,  M(C.light));
        vox(knee,0.26,0.4,0.26,0,-1.85,0, M(C.deep));           // tarsus
        vox(knee,0.3,0.16,0.34,0,-1.9,0,  M(C.deep));           // cakar menapak

        const off=(pair===1?Math.PI:0)+(s===1?0:Math.PI);       // gait tripod
        parts.legs.push({hip,femur,knee,s,baseSplay,baseKnee,off});
      };
      for(const s of[1,-1])for(let p=0;p<3;p++)buildLeg(p,s);

      return {mesh:g,parts};
    },

    /* ---------- ANIMASI ---------- */
    /* parameter gait: freq langkah, amplitudo ayun, angkat kaki, bob, pitch,
       roll, dan sudut perut — persis tabel GAITS di file asli. */
    GAITS:{
      idle:{freq:0,   amp:0,   lift:0,   bob:0,   pitch:0,   roll:0,   gaster:0.02},
      walk:{freq:5.0, amp:0.38,lift:0.6, bob:0.07,pitch:0.05,roll:0.03,gaster:0.06},
      run: {freq:9.0, amp:0.5, lift:0.8, bob:0.12,pitch:0.13,roll:0.05,gaster:0.20},
      dash:{freq:14.5,amp:0.6, lift:0.95,bob:0.15,pitch:0.22,roll:0.06,gaster:0.32},
    },

    animate(m,dt){
      const P=m.parts;if(!P||!P.body)return;
      const t=(m._at=(m._at||0)+dt);
      if(!m._aP)m._aP={...this.GAITS.walk};
      const A=m._aP;

      /* ---- gait dipilih dari kecepatan nyata (bukan tombol seperti demo) ---- */
      const speed=Math.hypot(m.vel.x,m.vel.z);
      const top=Math.max(0.6,m.speed||3);
      const rel=clamp(speed/top,0,2.2);
      let key;
      if(m.aAct==='dash')key='dash';
      else if(speed<0.2)key='idle';
      else if(rel<0.62)key='walk';
      else key='run';
      const G=this.GAITS[key];

      /* ---- timeline gigitan (pose crouch / kepala menyentak / rahang) ---- */
      if(!m._aPose)m._aPose={crouch:0,headX:0,headPitch:0,open:0,antBack:0};
      const ap=m._aPose;
      const mandIdle=()=>0.08+0.06*Math.max(0,Math.sin(t*2.3));
      const biting=(m.aAct==='bite');
      if(biting){
        const tt=m.aActT||0,W=this.BITE_W,SS=this.BITE_S;
        if(tt<W){
          const k=easeOut(tt/W);
          ap.crouch=k*0.28;ap.headX=-0.45*k;ap.headPitch=-0.12*k;
          ap.open=k;ap.antBack=k*0.5;
        }else if(tt<W+SS){
          const s=(tt-W)/SS,e=easeOut(s);
          ap.headX=-0.45+1.2*e;ap.crouch=0.28*(1-e);ap.headPitch=-0.12+0.36*e;
          ap.open=s<0.4?1:1-((s-0.4)/0.35)*1.25;
          ap.antBack=(1-e)*0.5;
        }else{
          const r=easeInOut(Math.min(1,(tt-W-SS)/0.45));
          ap.headX=0.75*(1-r);ap.crouch=0;ap.headPitch=0.24*(1-r);
          ap.open=-0.25*(1-r)+mandIdle()*r;ap.antBack=0;
        }
      }else{
        const k=Math.min(1,dt*8);
        ap.crouch*=1-k;ap.headX*=1-k;ap.headPitch*=1-k;ap.antBack*=1-k;
        ap.open=mandIdle();
      }

      /* ---- lerp parameter gait; saat menggigit langkah nyaris berhenti ---- */
      const k=1-Math.exp(-dt*6);
      const tFreq=biting?1.2:G.freq;
      const tAmp =biting?0.1:G.amp;
      A.freq  +=(tFreq   -A.freq  )*k;
      A.amp   +=(tAmp    -A.amp   )*k;
      A.lift  +=(G.lift  -A.lift  )*k;
      A.bob   +=(G.bob   -A.bob   )*k;
      A.pitch +=(G.pitch -A.pitch )*k;
      A.roll  +=(G.roll  -A.roll  )*k;
      A.gaster+=(G.gaster-A.gaster)*k;

      /* fase langkah: frekuensi tabel diskalakan kecepatan nyata supaya kaki
         tidak "sliding" saat mob melambat karena knockback/rintangan */
      const spdF=(key==='idle')?1:clamp(speed/Math.max(0.6,top),0.25,1.8);
      m._aPhase=(m._aPhase||0)+A.freq*spdF*dt;
      const phase=m._aPhase;

      /* ---- KAKI: ayunan depan-belakang + angkat halus (smoothstep) ---- */
      const brace=ap.crouch;
      for(const L of P.legs){
        const ph=phase+L.off;
        const swing=Math.sin(ph)*A.amp;
        const c=Math.max(0,Math.cos(ph));
        const lift=c*c*(3-2*c)*A.lift;
        L.hip.rotation.z=swing+brace*0.3;
        L.hip.rotation.x=Math.sin(ph*2)*0.02;
        L.femur.rotation.x=-(L.baseSplay+lift*0.9)*L.s;
        L.knee.rotation.x=(L.baseKnee+lift*1.0)*L.s;
      }

      /* ---- tubuh ---- */
      const bobY=Math.abs(Math.cos(phase))*A.bob+(A.freq<0.3?Math.sin(t*1.5)*0.03:0);
      P.body.position.y=BODY_Y+bobY-brace*0.5;
      P.body.rotation.z=-A.pitch+Math.sin(phase*2+0.5)*A.bob*0.35-(biting?0.06:0);
      P.body.rotation.x=Math.sin(phase+0.3)*A.roll;

      /* ---- kepala ---- */
      P.head.position.x=P.headX+ap.headX+Math.sin(phase*2+0.8)*A.bob*0.3;
      P.head.rotation.z=-A.pitch*0.7+Math.sin(phase*2+1.2)*0.03+ap.headPitch;
      P.head.rotation.y=Math.sin(t*0.7)*0.05;

      /* ---- rahang ---- */
      const open=biting?ap.open:mandIdle()+(key!=='idle'?0.06:0);
      P.mandL.rotation.y= (0.14-open*0.62);P.mandL.rotation.z=-open*0.08;
      P.mandR.rotation.y=-(0.14-open*0.62);P.mandR.rotation.z= open*0.08;

      /* ---- antena ---- */
      for(const[a,s]of[[P.antL,1],[P.antR,-1]]){
        a.rotation.x=0.35*s+Math.sin(t*2.7+s)*0.15;
        a.rotation.z=-0.5+Math.sin(t*3.1+s*2)*0.08+ap.antBack;
        if(a.userData.tip)a.userData.tip.rotation.z=-0.3+Math.sin(t*4+s)*0.2;
      }

      /* ---- perut ---- */
      P.gaster.rotation.z=-(A.gaster+Math.abs(Math.cos(phase+0.9))*0.06);
      P.gaster.rotation.x=Math.sin(phase*0.9)*0.04;

      /* ---- glow rahang & mata (memudar setelah menggigit) ---- */
      m._aGlow=(m._aGlow||0)*Math.exp(-dt*6);
      m._aFlash=(m._aFlash||0)*Math.exp(-dt*4);
      /* saat kena hit, emissive diambil alih flash Monsters.animate */
      if(m.flash<=0){
        P.mandMat.emissive.setRGB(m._aGlow,m._aGlow*0.12,0.02);
        P.eyeMat.emissiveIntensity=0.55+0.25*Math.sin(t*5)+m._aFlash*1.2;
      }
    },

    /* ---------- EFEK GIGITAN (burst + partikel, dari file asli) ---------- */
    biteFX(m){
      const p=new THREE.Vector3();
      if(m.parts&&m.parts.jawTip)m.parts.jawTip.getWorldPosition(p);
      else p.copy(m.pos).add(new THREE.Vector3(0,1.2,0));
      m._aGlow=1;m._aFlash=1;
      if(typeof FX!=='undefined'){
        FX.debris(p,0xff7a2f,12,3.0);
        FX.ring(p.x,Math.max(0.06,p.y-0.6),p.z,0xff3b2f,0.4,1.6);
      }
      if(typeof Sfx!=='undefined'&&Sfx.at)Sfx.at(m.pos,'hit');
    },
    /* garis kecepatan saat serangan maju cepat */
    dashFX(m){
      if(typeof FX==='undefined')return;
      const gy=World.groundAt(m.pos.x,m.pos.z,m.pos.y+2);
      FX.debris(new THREE.Vector3(m.pos.x,gy+0.15,m.pos.z),0xcfcfcf,3,1.8);
    },
  };

  window.Mob_Semut=Mob_Semut;
  return Mob_Semut;
})();
