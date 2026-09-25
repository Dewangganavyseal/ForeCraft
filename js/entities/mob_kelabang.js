'use strict';
/* =============================================================================
   ENTITAS MOB: KELABANG RAKSASA (Giant Centipede) — BOSS
   -----------------------------------------------------------------------------
   Boss langka penghuni biome TANAH MERAH (REDLANDS). Diporting & disederhanakan
   dari "NEW MODEL/kelabang_boss.html".

   Tubuh terdiri dari KEPALA + beberapa RUAS badan berkaki. Ruas mengikuti jejak
   kepala (breadcrumb trail) sehingga tubuh melata seperti kelabang sungguhan.

   Mekanik khusus (ditangani js/monsters.js, bukan di sini):
     - HP 50% → tubuh terbelah jadi 2 kelabang independen (segCount dibagi).
     - Mati   → tiap ruas terlepas menjadi entitas 'kelabang_part' yang
                menggelinding, bisa diserang, dan menjatuhkan 'centipede_shell'.

   Objek yang diekspos:
     window.Mob_Kelabang       → kepala + ruas + kaki + animasi melata
     window.Mob_Kelabang_part  → potongan ruas yang menggelinding (kulit kelabang)

   CATATAN MATERIAL: material dibuat BARU per-build (bukan dibagikan antar-mob),
   supaya efek flash saat kena hit (Monsters.animate menulis .emissive) tidak
   bocor ke kelabang lain di layar.
   ============================================================================= */

const Mob_Kelabang=(()=>{

  /* palet warna karapas (dari kelabang_boss.html) */
  const C={
    carapace:0x96332c, carapace2:0xa13a30, dark:0x5f1d1a, belly:0xd9a066,
    leg:0x71231d, legDark:0x471512, bone:0xe7d9b8
  };
  const MAXSEG=7;          // jumlah ruas badan maksimum (di luar kepala)
  const SEG=1.55;          // jarak antar ruas (unit lokal) — badan ~1.6 dalam,
                           // jadi ruas saling menyambung rapat tanpa menumpuk
  const SCALE=1.86;        // skala keseluruhan model (3× dari 0.62 sebelumnya)
  const LEG_L1=0.82;       // panjang segmen femur / paha atas (unit lokal ruas)
  const LEG_L2=0.94;       // panjang segmen tibia / betis + cakar kitin

  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth5=x=>{x=clamp(x,0,1);return x*x*x*(x*(x*6-15)+10);};
  const rand=(a,b)=>a+Math.random()*(b-a);

  /* set material baru per pemanggilan build (lihat catatan di atas) */
  function makeMats(){
    const mk=c=>new THREE.MeshLambertMaterial({color:c});
    return {
      carapace:mk(C.carapace), carapace2:mk(C.carapace2), dark:mk(C.dark),
      belly:mk(C.belly), leg:mk(C.leg), legDark:mk(C.legDark), bone:mk(C.bone),
    };
  }
  const box=(parent,mat,x,y,z,w,h,d)=>{
    const ms=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    ms.position.set(x,y,z);ms.castShadow=!IS_MOBILE;parent.add(ms);return ms;
  };

  /* ---------- kepala kelabang: karapas, rahang, taring bisa, antena, mata ---------- */
  function buildHead(M){
    const g=new THREE.Group();
    box(g,M.carapace, 0,0.28,0,   1.5,0.95,1.25);
    box(g,M.dark,     0,0.80,-0.05,1.6,0.28,1.1);
    box(g,M.dark,     0,0.72,0.60, 1.55,0.22,0.5);
    box(g,M.carapace, 0,0.18,0.72, 1.05,0.62,0.5);
    box(g,M.dark,     0.78,0.30,0.30, 0.22,0.55,0.8);
    box(g,M.dark,    -0.78,0.30,0.30, 0.22,0.55,0.8);
    box(g,M.dark,     0,0.35,-0.70, 1.15,0.70,0.4);
    box(g,M.bone,     0.42,0.95,-0.2, 0.22,0.3,0.22);
    box(g,M.bone,    -0.42,0.95,-0.2, 0.22,0.3,0.22);
    /* mata menyala (MeshBasic agar tak gelap malam) */
    const eyeMat=new THREE.MeshBasicMaterial({color:0xb9ff2e});
    for(const s of[1,-1]){
      box(g,eyeMat, s*0.50,0.55,0.70, 0.30,0.22,0.14);
      box(g,eyeMat, s*0.68,0.50,0.52, 0.12,0.12,0.10);
    }
    /* rahang bawah */
    const jaw=new THREE.Group();jaw.position.set(0,-0.24,0.60);g.add(jaw);
    box(jaw,M.dark, 0,0,0.18, 0.8,0.18,0.42);
    /* antena kiri-kanan */
    const antGeo=(side)=>{
      const A=new THREE.Group();
      box(A,M.carapace2, 0,0,0.28, 0.12,0.12,0.5);
      box(A,M.dark, side*0.10,0.12,0.62, 0.10,0.10,0.42);
      box(A,M.dark, side*0.22,0.26,0.90, 0.08,0.08,0.36);
      box(A,M.bone, side*0.32,0.42,1.12, 0.07,0.07,0.26);
      return A;
    };
    const antR=antGeo(1);antR.position.set(0.34,0.62,0.55);g.add(antR);
    const antL=antGeo(-1);antL.position.set(-0.34,0.62,0.55);g.add(antL);
    /* taring bisa (forcipules) */
    const clawGeo=(side)=>{
      const K=new THREE.Group();
      box(K,M.bone, 0,0,0.30, 0.22,0.24,0.6);
      box(K,M.bone, -side*0.12,-0.02,0.64, 0.2,0.2,0.34);
      box(K,M.legDark, -side*0.20,-0.04,0.86, 0.14,0.16,0.2);
      return K;
    };
    const clawR=clawGeo(1);clawR.position.set(0.42,-0.12,0.66);g.add(clawR);
    const clawL=clawGeo(-1);clawL.position.set(-0.42,-0.12,0.66);g.add(clawL);
    return {group:g,jaw,antR,antL,clawR,clawL};
  }

  /* ---------- geometri kaki IK: femur (paha) & tibia (betis + cakar) ---------- */
  function buildFemur(parent, M){
    box(parent, M.dark,     0, 0, 0.08, 0.28, 0.26, 0.18);
    box(parent, M.leg,      0, 0, LEG_L1 * 0.46, 0.24, 0.24, LEG_L1 * 0.72);
    box(parent, M.carapace, 0, 0.11, LEG_L1 * 0.46, 0.28, 0.08, LEG_L1 * 0.68);
    box(parent, M.legDark,  0, -0.09, LEG_L1 * 0.46, 0.20, 0.08, LEG_L1 * 0.60);
    box(parent, M.legDark,  0, 0, LEG_L1, 0.28, 0.28, 0.22);
    box(parent, M.bone,     0, 0.16, LEG_L1 - 0.03, 0.12, 0.20, 0.14);
  }

  function buildTibia(parent, M){
    box(parent, M.legDark,   0, 0, 0.08, 0.26, 0.26, 0.16);
    box(parent, M.leg,       0, 0, LEG_L2 * 0.36, 0.22, 0.22, LEG_L2 * 0.50);
    box(parent, M.carapace2, 0, 0.08, LEG_L2 * 0.36, 0.24, 0.08, LEG_L2 * 0.46);
    box(parent, M.legDark,   0, 0, LEG_L2 * 0.72, 0.16, 0.16, LEG_L2 * 0.38);
    box(parent, M.bone,      0, -0.03, LEG_L2, 0.12, 0.14, 0.22);
    box(parent, M.dark,      0, -0.07, LEG_L2 + 0.07, 0.08, 0.08, 0.12);
  }

  /* ---------- satu ruas badan + sepasang kaki IK ---------- */
  function buildSegment(M,idx){
    const g=new THREE.Group();
    const main=idx%2?M.carapace2:M.carapace;
    box(g,main,   0,0.42,0,   1.5,0.50,1.6);
    box(g,M.dark, 0,0.66,0,   0.5,0.16,1.35);
    box(g,M.dark,  0.80,0.16,0, 0.24,0.48,1.55);
    box(g,M.dark, -0.80,0.16,0, 0.24,0.48,1.55);
    box(g,M.belly,0,-0.10,0,  1.0,0.30,1.35);
    /* duri punggung pada ruas depan */
    if(idx<=2){
      for(const s of[1,-1]){
        box(g,M.bone, s*0.40,0.78,-0.10, 0.26,0.26,0.26);
        box(g,M.bone, s*0.40,0.98,-0.10, 0.18,0.20,0.18);
      }
    }
    /* sepasang kaki IK (femur + tibia per kaki, Euler YXZ) */
    const legs=[];
    for(const side of[1,-1]){
      const femurG=new THREE.Group();
      buildFemur(femurG,M);
      g.add(femurG);

      const tibiaG=new THREE.Group();
      buildTibia(tibiaG,M);
      g.add(tibiaG);

      femurG.rotation.order='YXZ';
      tibiaG.rotation.order='YXZ';

      const hipLocal=new THREE.Vector3(side*0.72, 0.08, idx%2 ? 0.10 : -0.10);
      const splayZ=(idx<=1 ? 0.18 : idx>=5 ? -0.20 : 0);
      const restLocal=new THREE.Vector3(side*1.82, -0.42, splayZ);

      legs.push({
        id:`seg${idx}_${side>0?'R':'L'}`,
        segIdx:idx,
        side,
        group:(idx+(side>0?0:1))%2,
        hipLocal,
        restLocal,
        femurGroup:femurG,
        tibiaGroup:tibiaG,
        worldFoot:new THREE.Vector3(),
        targetFoot:new THREE.Vector3(),
        stepStartFoot:new THREE.Vector3(),
        isStepping:false,
        stepProgress:1.0,
        stepDuration:0.16,
        stepHeight:0.40,
        initialized:false,
        needsLandSnap:false,
      });
    }
    /* ekor pada ruas terakhir */
    if(idx===MAXSEG-1){
      box(g,M.dark, 0,0.36,-1.05, 0.85,0.40,0.6);
      box(g,M.bone, 0,0.34,-1.45, 0.45,0.28,0.45);
      box(g,M.bone, 0,0.32,-1.78, 0.28,0.22,0.28);
    }
    return {group:g,legs};
  }

  const Mob_Kelabang={
    MAXSEG, SEG, SCALE, LEG_L1, LEG_L2,

    /* ---------- solver IK analitis 3D (Euler YXZ seperti Tarantula) ---------- */
    solveLeg(leg,hipW,footW){
      let dx=footW.x-hipW.x;
      let dy=footW.y-hipW.y;
      let dz=footW.z-hipW.z;
      const maxReach=(LEG_L1+LEG_L2)*0.996;
      const minReach=Math.abs(LEG_L1-LEG_L2)+0.05;
      let dist3D=Math.hypot(dx,dy,dz);
      if(dist3D>maxReach){
        const f=maxReach/dist3D;
        dx*=f;dy*=f;dz*=f;
        dist3D=maxReach;
      }
      const distXZ=Math.hypot(dx,dz)||1e-4;
      dist3D=Math.max(minReach,Math.min(maxReach,dist3D));
      const yaw=Math.atan2(dx,dz);
      const elev=Math.atan2(dy,distXZ);
      const cosA=(LEG_L1*LEG_L1+dist3D*dist3D-LEG_L2*LEG_L2)/(2*LEG_L1*dist3D);
      const alpha=Math.acos(clamp(cosA,-1,1));
      const femurElev=elev+alpha;
      const kx=hipW.x+Math.sin(yaw)*Math.cos(femurElev)*LEG_L1;
      const ky=hipW.y+Math.sin(femurElev)*LEG_L1;
      const kz=hipW.z+Math.cos(yaw)*Math.cos(femurElev)*LEG_L1;
      leg.femurGroup.position.copy(hipW);
      leg.femurGroup.rotation.set(-femurElev,yaw,0);
      const d2x=footW.x-kx,d2y=footW.y-ky,d2z=footW.z-kz;
      const yaw2=Math.atan2(d2x,d2z);
      const elev2=Math.atan2(d2y,Math.hypot(d2x,d2z)||1e-4);
      leg.tibiaGroup.position.set(kx,ky,kz);
      leg.tibiaGroup.rotation.set(-elev2,yaw2,0);
    },

    /* ---------- MODEL 3D ----------
       Kepala di root; ruas ditambahkan sebagai anak root tapi diposisikan tiap
       frame mengikuti jejak (trail) di ruang LOKAL root. */
    build(boss){
      const g=new THREE.Group();
      const parts={};
      g.scale.setScalar(SCALE);
      const M=makeMats();

      const H=buildHead(M);
      g.add(H.group);
      parts.head=H.group;parts.jaw=H.jaw;parts.antR=H.antR;parts.antL=H.antL;
      parts.clawR=H.clawR;parts.clawL=H.clawL;

      parts.segments=[];parts.segLegs=[];
      for(let i=0;i<MAXSEG;i++){
        const S=buildSegment(M,i);
        S.group.position.set(0,0,-(i+1)*SEG);
        g.add(S.group);
        parts.segments.push(S.group);
        parts.segLegs.push(S.legs);
      }
      return {mesh:g,parts};
    },

    /* ---------- sampel titik pada jejak sejauh `dist` di belakang kepala ---------- */
    _sampleTrail(trail,dist){
      if(trail.length<2)return trail[0]||null;
      let acc=0;
      for(let i=0;i<trail.length-1;i++){
        const a=trail[i],b=trail[i+1];
        const d=Math.hypot(b.x-a.x,b.z-a.z,b.y-a.y)||1e-4;
        if(acc+d>=dist){
          const t=(dist-acc)/d;
          return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};
        }
        acc+=d;
      }
      return trail[trail.length-1];
    },

    /* ---------- ANIMASI: tubuh melata mengikuti jejak kepala + KAKI IK TANAH ---------- */
    animate(m,dt){
      const t=(typeof performance!=='undefined'?performance.now():Date.now())*0.001;
      const P=m.parts;
      const head=m.pos;
      const h=m.mesh.rotation.y;
      const cos=Math.cos(h),sin=Math.sin(h);
      const spd=Math.hypot(m.vel.x,m.vel.z);
      const isMoving=(spd>0.10);
      const sc=SCALE;

      /* jejak breadcrumb (ruang dunia). Kepala = m.pos.
         Total panjang badan (dunia) = MAXSEG*SEG*SCALE; jejak harus menyimpan
         cukup titik untuk menutupi seluruh panjang itu + margin. */
      const bodyLen=MAXSEG*SEG*SCALE;              // panjang total tubuh (dunia)
      const seedN=MAXSEG*10;
      const seedStep=bodyLen*1.5/seedN;            // seed menutupi 1.5× panjang tubuh
      if(!m._trail){
        m._trail=[];
        for(let k=0;k<seedN;k++)
          m._trail.push(new THREE.Vector3(head.x-Math.sin(h)*k*seedStep,head.y,head.z-Math.cos(h)*k*seedStep));
      }
      const last=m._trail[0];
      const moved=Math.hypot(head.x-last.x,head.z-last.z);
      if(moved>0.06){
        m._trail.unshift(new THREE.Vector3(head.x,head.y,head.z));
        /* pangkas jejak berdasarkan JARAK KUMULATIF: simpan cukup titik untuk
           menutupi 1.4× panjang tubuh, apa pun kecepatan geraknya (saat lambat
           titik berdekatan, saat cepat titik berjauhan). */
        const keepDist=bodyLen*1.4;
        let acc=0;
        for(let k=0;k<m._trail.length-1;k++){
          const a=m._trail[k],b=m._trail[k+1];
          acc+=Math.hypot(b.x-a.x,b.z-a.z,b.y-a.y);
          if(acc>keepDist){m._trail.length=k+2;break;}
        }
      }else{
        last.y+=(head.y-last.y)*Math.min(1,dt*8); // tetap ikuti ketinggian saat diam
      }

      /* gait wave metachronal untuk 14 kaki kelabang (bergerak beriak harmonis) */
      if(!m._gaitT)m._gaitT=0;
      if(isMoving){
        const strideWorld=Math.max(0.3,1.1*sc);
        const cadence=clamp(spd/strideWorld*1.5,2.0,6.5);
        m._gaitT+=dt*cadence;
      }
      const gaitCycle=m._gaitT%1.0;
      const activeGrp=(gaitCycle<0.5)?0:1;

      /* jumlah ruas aktif (berkurang saat tubuh terbelah). Default penuh. */
      const active=(m.segCount!==undefined)?m.segCount:MAXSEG;

      /* liftY (lokal) = seberapa tinggi kepala & ruas depan TERANGKAT saat
         serangan SAMBARAN / SEMBURAN / TERJANG BUMI. Diisi oleh Monsters
         (m.liftY). Ruas depan ikut terangkat, meredam ke belakang. */
      const lift=m.liftY||0;

      for(let i=0;i<MAXSEG;i++){
        const seg=P.segments[i];
        if(i>=active){seg.visible=false;continue;}
        seg.visible=true;
        /* jarak DUNIA ruas ke kepala = spasi lokal SEG dikali skala model.
           Trail disimpan dalam koordinat dunia, jadi sampel juga dunia. */
        const sp=this._sampleTrail(m._trail,(i+1)*SEG*SCALE);
        if(!sp)continue;
        /* dunia → lokal root (rotasi -h, translasi -head) */
        const dwx=sp.x-head.x,dwz=sp.z-head.z;
        const lx=(dwx*cos-dwz*sin)/SCALE;
        const lz=(dwx*sin+dwz*cos)/SCALE;
        const ly=(sp.y-head.y)/SCALE;
        const rear=lift*Math.max(0,1-i*0.42);   // ruas depan terangkat
        seg.position.set(lx,ly+Math.sin(t*1.8+i*0.6)*0.04+rear,lz);
        /* yaw ruas: arah menuju sampel yang lebih dekat kepala */
        const spF=this._sampleTrail(m._trail,i*SEG*SCALE);
        let worldYaw=h;
        if(spF){
          const ddx=spF.x-sp.x,ddz=spF.z-sp.z;
          if(ddx*ddx+ddz*ddz>1e-5){
            worldYaw=Math.atan2(ddx,ddz);
            seg.rotation.y=worldYaw-h;
          }
        }

        /* transformasi dunia ruas saat ini */
        const segWorldX=sp.x;
        const segWorldZ=sp.z;
        const segWorldY=sp.y+(Math.sin(t*1.8+i*0.6)*0.04+rear)*sc;
        const segYaw=worldYaw;
        const cosSegY=Math.cos(segYaw),sinSegY=Math.sin(segYaw);

        /* =====================================================================
           PROCEDURAL 3D TWO-BONE IK LEGS & GROUND ADAPTATION
           ---------------------------------------------------------------------
           Kaki menapak di koordinat dunia (blok tanah / kontur Redlands).
           Saat merayap: telapak kaki diam di tanah (stance), badan meluncur
           maju di atas kaki. Saat drift melebihi batas gait, kaki mengangkat
           dalam lengkungan parabola (swing) dan mendarat pada elevasi tanah
           berikutnya. Saat ruas terangkat tinggi (sambaran/semburan), kaki
           mengembang & berayun garang di udara.
           ===================================================================== */
        const legs=P.segLegs[i];
        if(legs)for(const leg of legs){
          const rx=leg.restLocal.x;
          const rz=leg.restLocal.z;
          const idealWorldX=segWorldX+(rx*cosSegY+rz*sinSegY)*sc;
          const idealWorldZ=segWorldZ+(-rx*sinSegY+rz*cosSegY)*sc;
          let idealGroundY=(typeof World!=='undefined'&&World.groundAt)
            ?World.groundAt(idealWorldX,idealWorldZ,segWorldY+2.5):segWorldY;
          if(idealGroundY===undefined||!isFinite(idealGroundY)||idealGroundY<=0)idealGroundY=segWorldY;

          // Inisialisasi awal saat baru spawn
          if(!leg.initialized){
            leg.initialized=true;
            leg.worldFoot.set(idealWorldX,idealGroundY,idealWorldZ);
            leg.targetFoot.set(idealWorldX,idealGroundY,idealWorldZ);
            leg.stepStartFoot.set(idealWorldX,idealGroundY,idealWorldZ);
            leg.isStepping=false;
            leg.stepProgress=1.0;
          }

          // KASUS 1: RUAS TERANGKAT TINGGI DI UDARA ATAU SEDANG MENYELAM (BURROW)
          const heightAboveGround=segWorldY-idealGroundY;
          const isReared=heightAboveGround>(LEG_L1+LEG_L2)*sc*0.72;
          if(isReared||(m.underground&&m.katk==='burrow')){
            leg.isStepping=false;
            const flareZ=(i<=1?0.28:i>=5?-0.22:0);
            const footPosLocal=leg.restLocal.clone();
            footPosLocal.x*=1.25;
            footPosLocal.y=-0.32+Math.sin(t*8+i*1.4+leg.side)*0.12;
            footPosLocal.z+=flareZ;
            this.solveLeg(leg,leg.hipLocal,footPosLocal);
            leg.needsLandSnap=true;
            continue;
          }
          if(leg.needsLandSnap){
            leg.needsLandSnap=false;
            leg.worldFoot.set(idealWorldX,idealGroundY,idealWorldZ);
            leg.targetFoot.set(idealWorldX,idealGroundY,idealWorldZ);
            leg.isStepping=false;
          }

          // Jarak drift telapak kaki di dunia terhadap titik ideal
          const drift=Math.hypot(leg.worldFoot.x-idealWorldX,leg.worldFoot.z-idealWorldZ);
          if(drift>2.6*sc){
            leg.worldFoot.set(idealWorldX,idealGroundY,idealWorldZ);
            leg.targetFoot.set(idealWorldX,idealGroundY,idealWorldZ);
            leg.isStepping=false;
          }

          // FASE MELANGKAH (SWING) ATAU MENAPAK (STANCE)
          const isRunning=(spd>4.0);
          const stepThreshold=(isRunning?0.32:0.22)*sc;
          const maxDrift=0.75*sc;

          if(leg.isStepping){
            leg.stepProgress+=dt/leg.stepDuration;
            const prog=Math.min(1.0,leg.stepProgress);
            const u=smooth5(prog);
            const stepLift=(leg.stepHeight||0.40)*sc*(isRunning?1.3:1.0);
            const arc=Math.sin(prog*Math.PI)*stepLift;

            leg.worldFoot.x=lerp(leg.stepStartFoot.x,leg.targetFoot.x,u);
            leg.worldFoot.z=lerp(leg.stepStartFoot.z,leg.targetFoot.z,u);
            leg.worldFoot.y=lerp(leg.stepStartFoot.y,leg.targetFoot.y,u)+arc;

            if(prog>=1.0){
              leg.isStepping=false;
              leg.worldFoot.copy(leg.targetFoot);
              if(typeof FX!=='undefined'&&FX.debris&&Math.random()<0.22){
                FX.debris(leg.worldFoot.clone().add(new THREE.Vector3(0,0.05,0)),0x9e3b2c,2,0.6);
              }
            }
          }else{
            const isAllowedGait=(leg.group===activeGrp)||(drift>maxDrift);
            if(isAllowedGait&&drift>stepThreshold&&isMoving){
              leg.isStepping=true;
              leg.stepProgress=0.0;
              leg.stepStartFoot.copy(leg.worldFoot);

              leg.stepDuration=isRunning?0.11:0.16;
              leg.stepHeight=isRunning?0.50:0.35;

              const lead=leg.stepDuration*1.3;
              let predX=idealWorldX+m.vel.x*lead;
              let predZ=idealWorldZ+m.vel.z*lead;
              let landY=(typeof World!=='undefined'&&World.groundAt)
                ?World.groundAt(predX,predZ,segWorldY+2.5):idealGroundY;
              if(landY===undefined||!isFinite(landY)||landY<=0)landY=idealGroundY;
              leg.targetFoot.set(predX,landY,predZ);
            }else if(!isMoving){
              // Menyesuaikan kontur blok tanah di bawahnya secara halus saat diam
              let curGroundY=(typeof World!=='undefined'&&World.groundAt)
                ?World.groundAt(leg.worldFoot.x,leg.worldFoot.z,segWorldY+2.5):segWorldY;
              if(curGroundY!==undefined&&isFinite(curGroundY)&&curGroundY>0){
                leg.worldFoot.y=lerp(leg.worldFoot.y,curGroundY,clamp(12*dt,0,1));
              }
            }
          }

          // Konversi worldFoot ke koordinat lokal ruas
          const fdx=leg.worldFoot.x-segWorldX;
          const fdy=leg.worldFoot.y-segWorldY;
          const fdz=leg.worldFoot.z-segWorldZ;
          const footLocalX=(fdx*cosSegY-fdz*sinSegY)/sc;
          const footLocalY=fdy/sc;
          const footLocalZ=(fdx*sinSegY+fdz*cosSegY)/sc;
          const footPosLocal=new THREE.Vector3(footLocalX,footLocalY,footLocalZ);

          // Selesaikan 3D Two-Bone IK dari hipLocal ke footPosLocal
          this.solveLeg(leg,leg.hipLocal,footPosLocal);
        }
      }

      /* idle kepala: antena bergoyang, rahang & taring menganga saat mengejar */
      const agg=m.state==='chase'?1:0.35;
      if(P.antR){P.antR.rotation.x=Math.sin(t*2.3)*0.12-agg*0.15;P.antR.rotation.y=Math.sin(t*1.4)*0.16;}
      if(P.antL){P.antL.rotation.x=Math.sin(t*2.3+1.3)*0.12-agg*0.15;P.antL.rotation.y=-Math.sin(t*1.4+0.6)*0.16;}
      const bite=Math.max(0,(m.biteT||0));
      if(m.biteT)m.biteT=Math.max(0,m.biteT-dt);
      /* rahang & taring lebih lebar saat menyembur/menyambar (attackJaw) */
      const aJaw=m.attackJaw||0;
      const jawO=agg*0.25+bite*1.4+aJaw;
      if(P.jaw)P.jaw.rotation.x=Math.min(1.0,jawO);
      if(P.clawR)P.clawR.rotation.y= 0.15+agg*0.5+bite*0.6+aJaw*0.5+Math.sin(t*3)*0.05;
      if(P.clawL)P.clawL.rotation.y=-(0.15+agg*0.5+bite*0.6+aJaw*0.5+Math.sin(t*3+0.7)*0.05);
      /* kepala: mengangguk pelan saat berjalan; TERANGKAT & mendongak saat
         serangan mengangkat tubuh (liftY), lalu menukik (headPitch). */
      P.head.position.y=Math.sin(t*1.9)*0.03+lift;
      P.head.rotation.x=(m.headPitch||0);
    },
  };

  /* =============================================================================
     POTONGAN RUAS KELABANG (kelabang_part)
     -----------------------------------------------------------------------------
     Muncul saat kelabang mati: tiap ruas terlepas & menggelinding. Bisa
     diserang; saat hancur menjatuhkan 'centipede_shell'. Model = satu ruas
     karapas sederhana.
     ============================================================================= */
  const Mob_Kelabang_part={
    build(){
      const g=new THREE.Group();
      const M=makeMats();
      const idx=(Math.random()*2)|0;
      const S=buildSegment(M,idx);
      /* kaki IK dilipat melengkung ke bawah (pose mati serangga) */
      for(const L of S.legs){
        L.femurGroup.position.copy(L.hipLocal);
        L.femurGroup.rotation.set(0, L.side * 1.5, L.side * 0.6);
        L.tibiaGroup.position.set(L.hipLocal.x + L.side * 0.35, L.hipLocal.y + 0.30, L.hipLocal.z);
        L.tibiaGroup.rotation.set(0, L.side * 1.5, -L.side * 1.4);
      }
      S.group.position.y=0.5;
      g.add(S.group);
      g.scale.setScalar(SCALE);
      return {mesh:g,parts:{seg:S.group}};
    },
    animate(m,dt){
      /* menggelinding sesuai kecepatan horizontalnya */
      const spd=Math.hypot(m.vel.x,m.vel.z);
      m._roll=(m._roll||0)+spd*dt*3.2;
      if(m.parts.seg){
        m.parts.seg.rotation.x=m._roll;
        m.parts.seg.rotation.z=Math.sin(m._roll*0.5)*0.2;
      }
    },
  };

  window.Mob_Kelabang_part=Mob_Kelabang_part;
  return Mob_Kelabang;
})();
window.Mob_Kelabang=Mob_Kelabang;

/* =============================================================================
   PROYEKTIL RACUN KELABANG (SEMBURAN) — pool global
   -----------------------------------------------------------------------------
   Disemburkan saat serangan 'spit'. Di-update SEKALI per frame dari
   Monsters.update (mirip Mob_Lizard.updateAcid). Racun jatuh membusur, kena
   pemain → damage + noda racun kecil di tanah.
   ============================================================================= */
Mob_Kelabang.VENOM_MAX=40;
Mob_Kelabang._venom=null;
Mob_Kelabang._venomMeshes=null;
Mob_Kelabang.venomInit=function(){
  if(this._venom)return;
  this._venom=[];this._venomMeshes=[];
  const scene=(typeof Game!=='undefined'&&Game.scene)?Game.scene:null;
  for(let i=0;i<this.VENOM_MAX;i++){
    this._venom.push({life:0,dmg:6,pos:new THREE.Vector3(),vel:new THREE.Vector3(),
      hit:false,src:null});
    const mm=new THREE.Mesh(new THREE.BoxGeometry(0.30,0.30,0.30),
      new THREE.MeshBasicMaterial({color:0x8dff3a,transparent:true,opacity:0.95,
        blending:THREE.AdditiveBlending,depthWrite:false}));
    mm.visible=false;
    if(scene)scene.add(mm);
    this._venomMeshes.push(mm);
  }
};
/* semburkan racun: MENYEMBUR KE ATAS 5× secara acak di area sekitar kelabang.
   Tiap proyektil meluncur hampir vertikal dengan sebaran horizontal acak,
   lalu jatuh membusur ke tanah di area itu. Saat mendarat → lingkaran merah. */
Mob_Kelabang.venomBurst=function(m){
  this.venomInit();
  const mouth=new THREE.Vector3();
  if(m.parts&&m.parts.head){
    m.parts.head.getWorldPosition(mouth);
    mouth.y+=0.3;
  }else mouth.copy(m.pos).add(new THREE.Vector3(0,1.4,0));
  let spawned=0;
  const N=5;                              // 5× semburan ke atas
  for(let i=0;i<this.VENOM_MAX&&spawned<N;i++){
    const a=this._venom[i];
    if(a.life>0)continue;
    a.life=2.2;a.hit=false;a.dmg=Math.max(4,Math.round(m.dmg*0.6));
    a.src=m;
    a.pos.copy(mouth);
    /* arah acak di area: dominan ke atas + sebaran horizontal acak (segala arah) */
    const ang=Math.random()*Math.PI*2;
    const spread=rand(1.5,5.5);           // kecepatan horizontal acak
    a.vel.set(Math.sin(ang)*spread,rand(11,15),Math.cos(ang)*spread); // menyembur tinggi ke atas
    spawned++;
  }
  if(typeof Sfx!=='undefined'&&Sfx.at)Sfx.at(m.pos,'hit');
};
Mob_Kelabang.updateVenom=function(dt){
  if(!this._venom)return;
  const M=(typeof Monsters!=='undefined')?Monsters:null;
  for(let i=0;i<this.VENOM_MAX;i++){
    const a=this._venom[i],mm=this._venomMeshes[i];
    if(a.life>0){
      a.life-=dt;
      a.vel.y-=20*dt;
      a.pos.addScaledVector(a.vel,dt);
      /* kena siapa? pihak lawan ditentukan Monsters.projTarget, jadi semburan
         racun ikut melukai rekan NPC & pet (bukan hanya pemain) */
      if(!a.hit&&M&&M.projTarget){
        const v=M.projTarget(a.src,a.pos.x,a.pos.y,a.pos.z,1.0);
        if(v&&M.hitTarget(a.src,v,a.dmg,1.6,a.pos.x,a.pos.z,0)){
          a.hit=true;a.life=0;
          FX.debris(v.pos.clone().add(new THREE.Vector3(0,1,0)),0x8dff3a,6,2.2);
          FX.text(v.pos.clone().add(new THREE.Vector3(0,2.2,0)),'☣ racun','#8dff3a');
        }
      }
      /* mendarat di tanah: lingkaran MERAH sebagai tanda noda racun */
      const gy=(typeof World!=='undefined'&&World.groundAt)?World.groundAt(a.pos.x,a.pos.z,a.pos.y+2):0.15;
      if(a.pos.y<=gy+0.15){
        a.life=0;
        if(typeof FX!=='undefined'&&FX.ring){
          FX.ring(a.pos.x,gy+0.05,a.pos.z,0xff2a1a,0.9,3.2);   // lingkaran merah besar
          FX.ring(a.pos.x,gy+0.05,a.pos.z,0xff6b57,0.6,2.0);   // lingkaran merah dalam
        }
        FX.debris(new THREE.Vector3(a.pos.x,gy+0.1,a.pos.z),0xff3322,8,2.2);
        /* damage area kecil ke siapa pun yang berdiri di titik jatuh */
        if(M&&M.areaHit)M.areaHit(a.src,a.pos.x,a.pos.z,2.0,Math.round(a.dmg*0.6),0);
      }
      if(a.life>0){mm.visible=true;mm.position.copy(a.pos);mm.material.opacity=Math.min(1,a.life)*0.95;}
      else mm.visible=false;
    }else mm.visible=false;
  }
};
