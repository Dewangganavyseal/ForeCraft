'use strict';
/* =============================================================================
   ENTITAS MOB: TARANTULA RAKSASA (🕷️)
   -----------------------------------------------------------------------------
   Diporting dari "NEW MODEL/Tarantula.html" (model bulky + IK analitis 3D).
   Mob darat biome TANAH MERAH (REDLANDS), lebih kuat dari kumbang & semut.

   SELURUH aksi file asli dipakai di game:
     idle · walk · run   → locomotion IK tetrapod (dipilih dari kecepatan nyata)
     bite  'Gigitan Mandibel' → windup → sentak maju → kunyah kedua
     leap  'Lompat Sergap'    → crouch → parabola smooth → hantam tanah (AoE)
     web   'Sembur Jaring'    → putar 180° → 3 proyektil jaring → putar kembali

   IK TETAP DIPAKAI: 8 kaki (femur L1=2.9 + tibia L2=3.5) diselesaikan analitis
   per frame di ruang LOKAL model (tanpa lookAt dunia, memakai Euler YXZ
   sehingga stabil di dalam grup mesh yang diskalakan/diputar game).
   Damage & timeline serangan dikendalikan js/monsters.js (aiTarantula), file
   ini menyediakan MODEL, pose animasi, dan POOL JARING global + stun 5 detik.
   ============================================================================= */

const Mob_Tarantula=(()=>{

  const SCALE=0.34;                 // skala model di dunia voxel
  const LEG_L1=2.9, LEG_L2=3.5;     // panjang segmen IK (sama persis file asli)
  const BODY_Y=0.48;                // tinggi badan netral (satuan lokal model)
  const FOOT_LIFT=0;                // kaki sudah menapak di y=0 lokal

  const C={
    CARAPACE:0x2e1910, CARAPACE_M:0x1c0e08, ABDOMEN:0x25140b,
    HAIR_RUST:0x9e4b1e, HAIR_GOLD:0xb3772a, CHELICERA:0x1f0f08,
    FANG_ROOT:0x140705, LEG_DARK:0x26140b, SCOPULA:0x120905,
  };

  const smooth5=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(x*(x*6-15)+10);};

  const legConfigs=[
    {id:'L1',side:1,idx:0,hip:[1.40,0.75,1.4],rest:[5.2,0,5.2],grp:0},
    {id:'L2',side:1,idx:1,hip:[1.55,0.75,0.5],rest:[5.9,0,1.9],grp:1},
    {id:'L3',side:1,idx:2,hip:[1.55,0.75,-0.5],rest:[5.9,0,-2.1],grp:0},
    {id:'L4',side:1,idx:3,hip:[1.40,0.75,-1.4],rest:[4.9,0,-5.2],grp:1},
    {id:'R1',side:-1,idx:0,hip:[-1.40,0.75,1.4],rest:[-5.2,0,5.2],grp:1},
    {id:'R2',side:-1,idx:1,hip:[-1.55,0.75,0.5],rest:[-5.9,0,1.9],grp:0},
    {id:'R3',side:-1,idx:2,hip:[-1.55,0.75,-0.5],rest:[-5.9,0,-2.1],grp:1},
    {id:'R4',side:-1,idx:3,hip:[-1.40,0.75,-1.4],rest:[-4.9,0,-5.2],grp:0},
  ];

  const Mob_Tarantula={
    SCALE, LEG_L1, LEG_L2,
    DUR:{bite:0.88,leap:1.42,web:1.85},
    HIT:{bite:0.34,leapLand:0.90,web:[0.43,0.70,0.97]},
    WEB_STUN:5,

    /* ---------- MODEL 3D ---------- */
    build(boss){
      const g=new THREE.Group();
      g.scale.setScalar(SCALE);
      const parts={};
      const cache={};
      const M=c=>{
        if(!cache[c])cache[c]=new THREE.MeshLambertMaterial({color:c});
        return cache[c];
      };
      const eyeMat=new THREE.MeshLambertMaterial({color:0x1a0505,emissive:0xff1a1a,emissiveIntensity:0.9});
      const glintMat=new THREE.MeshBasicMaterial({color:0xffffff});
      parts.eyeMat=eyeMat;
      const vox=(parent,w,h,d,x,y,z,mat,rx,ry,rz)=>{
        const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
        m.position.set(x,y,z);
        if(rx||ry||rz)m.rotation.set(rx||0,ry||0,rz||0);
        m.castShadow=!IS_MOBILE;
        parent.add(m);return m;
      };

      const bodyRig=new THREE.Group();
      bodyRig.position.set(0,BODY_Y,0);
      g.add(bodyRig);parts.bodyRig=bodyRig;

      /* ----- prosoma / karapas ----- */
      const pros=new THREE.Group();bodyRig.add(pros);parts.prosoma=pros;
      vox(pros,4.1,1.65,4.4, 0,1.15,0.35, M(C.CARAPACE));
      vox(pros,4.4,1.05,4.7, 0,0.82,0.35, M(C.CARAPACE_M));
      vox(pros,1.2,0.40,1.5, 0,1.88,0.2,  M(C.CARAPACE_M));
      vox(pros,3.6,0.65,3.8, 0,1.68,0.3,  M(C.CARAPACE));
      vox(pros,3.8,0.32,0.48,0,1.80,1.0,  M(C.HAIR_RUST));
      vox(pros,3.8,0.32,0.48,0,1.80,-0.4, M(C.HAIR_RUST));
      vox(pros,3.6,0.32,0.48,0,1.80,0.3,  M(C.HAIR_RUST));
      vox(pros,1.5,0.55,1.1, 0,2.05,1.95, M(C.CARAPACE_M));
      vox(pros,3.4,0.75,4.0, 0,0.38,0.3,  M(C.CARAPACE_M));
      for(const cp of legConfigs){
        vox(pros,0.85,0.70,0.85, cp.hip[0],cp.hip[1],cp.hip[2], M(C.CARAPACE_M));
        vox(pros,0.72,0.58,0.72, cp.hip[0],cp.hip[1],cp.hip[2], M(C.LEG_DARK));
      }

      /* ----- 8 mata merah ----- */
      const eyes=new THREE.Group();eyes.position.set(0,2.05,1.95);bodyRig.add(eyes);
      const addEye=(x,y,z,s,main)=>{
        vox(eyes,s,s,s*0.8, x,y,z, eyeMat);
        if(main)vox(eyes,s*0.4,s*0.4,s*0.9, x+(x>0?0.03:-0.03),y+0.03,z+0.02, glintMat);
      };
      addEye(0.28,0.24,0.48,0.36,true);addEye(-0.28,0.24,0.48,0.36,true);
      addEye(0.60,0.20,0.38,0.26);addEye(-0.60,0.20,0.38,0.26);
      addEye(0.30,0.32,0.06,0.24);addEye(-0.30,0.32,0.06,0.24);
      addEye(0.62,0.26,-0.06,0.24);addEye(-0.62,0.26,-0.06,0.24);

      /* ----- chelicerae + taring menyatu ----- */
      const cheGrp=new THREE.Group();cheGrp.position.set(0,0.9,2.4);bodyRig.add(cheGrp);
      parts.cheliceraGrp=cheGrp;
      vox(cheGrp,1.20,0.90,1.40, 0,-0.75,0.45, M(C.CARAPACE_M));
      vox(cheGrp,0.90,0.50,1.10, 0,-1.00,0.55, M(0x160a06));
      const buildChelicera=side=>{
        const cg=new THREE.Group();cg.position.set(side*0.72,0,0);cheGrp.add(cg);
        vox(cg,1.26,1.65,1.85, 0,-0.38,0.50, M(C.CHELICERA));
        vox(cg,1.32,1.10,1.65, side*0.04,-0.75,0.52, M(C.CARAPACE_M));
        vox(cg,0.95,0.40,1.40, 0,0.22,0.45, M(C.CARAPACE));
        vox(cg,0.25,1.20,1.30, side*0.54,-0.45,0.50, M(C.CHELICERA));
        vox(cg,0.25,0.85,1.10, -side*0.45,-0.65,0.50, M(0x1f0f08));
        vox(cg,0.68,0.45,0.68, side*0.12,-1.05,1.05, M(C.CARAPACE_M));
        const fang=new THREE.Group();fang.position.set(side*0.12,-1.15,1.05);cg.add(fang);
        const F=M(C.FANG_ROOT);
        vox(fang,0.56,0.50,0.56, 0,0.05,0.02, F);
        vox(fang,0.48,0.55,0.48, 0,-0.20,0.06, F);
        vox(fang,0.42,0.55,0.42, 0,-0.46,0.14, F);
        vox(fang,0.36,0.55,0.36, 0,-0.72,0.26, F);
        vox(fang,0.30,0.55,0.30, 0,-0.98,0.42, F);
        vox(fang,0.24,0.50,0.24, 0,-1.22,0.60, F);
        vox(fang,0.16,0.45,0.16, 0,-1.43,0.78, M(0x2e0606));
        vox(fang,0.10,0.32,0.10, 0,-1.60,0.92, M(0x1a0404));
        cg.userData.fang=fang;
        return cg;
      };
      parts.cheliceraL=buildChelicera(1);
      parts.cheliceraR=buildChelicera(-1);

      /* ----- pedipalps ----- */
      const buildPedipalp=side=>{
        const pd=new THREE.Group();pd.position.set(side*1.35,0.6,2.1);bodyRig.add(pd);
        vox(pd,0.50,0.50,0.60, 0,0,0.25, M(C.CARAPACE_M));
        vox(pd,0.42,0.42,1.40, side*0.10,0.20,0.85, M(C.LEG_DARK), -0.25,side*0.12,0);
        vox(pd,0.46,0.46,0.35, side*0.12,0.28,1.40, M(C.HAIR_RUST));
        vox(pd,0.36,0.36,1.25, side*0.18,-0.05,2.05, M(C.LEG_DARK), 0.30,-side*0.08,0);
        vox(pd,0.42,0.34,0.55, side*0.18,-0.20,2.75, M(C.SCOPULA));
        return pd;
      };
      parts.pedipalpL=buildPedipalp(1);
      parts.pedipalpR=buildPedipalp(-1);

      /* ----- abdomen + spineret ----- */
      const abd=new THREE.Group();abd.position.set(0,1.35,-1.8);bodyRig.add(abd);
      parts.abdomenGrp=abd;
      vox(abd,1.7,1.15,1.3, 0,0,0.5, M(C.CARAPACE_M));
      vox(abd,5.4,4.0,6.4, 0,0.45,-2.8, M(C.ABDOMEN));
      vox(abd,4.9,4.3,5.9, 0,0.55,-2.8, M(C.ABDOMEN));
      vox(abd,5.6,3.5,5.5, 0,0.35,-2.8, M(C.ABDOMEN));
      vox(abd,2.9,0.45,3.6, 0,2.50,-2.9, M(C.HAIR_GOLD));
      vox(abd,3.4,0.35,4.1, 0,2.40,-2.9, M(C.HAIR_RUST));
      vox(abd,0.55,0.55,1.5, 0.75,-0.65,-6.1, M(C.CHELICERA), 0.3,0.2,0);
      vox(abd,0.55,0.55,1.5, -0.75,-0.65,-6.1, M(C.CHELICERA), 0.3,-0.2,0);
      vox(abd,0.42,0.42,1.0, 0.92,-0.45,-6.9, M(C.HAIR_RUST), 0.6,0.3,0);
      vox(abd,0.42,0.42,1.0, -0.92,-0.45,-6.9, M(C.HAIR_RUST), 0.6,-0.3,0);
      const anchor=new THREE.Group();anchor.position.set(0,-0.45,-6.6);abd.add(anchor);
      parts.spinneretAnchor=anchor;

      /* ----- 8 kaki IK (femur + tibia per kaki) ----- */
      const buildFemur=parent=>{
        vox(parent,0.74,0.70,0.55, 0,0,0.22, M(C.CARAPACE_M));
        vox(parent,0.62,0.60,0.50, 0,0,0.26, M(C.LEG_DARK));
        vox(parent,0.62,0.58,LEG_L1*0.88, 0,0,LEG_L1*0.46, M(C.LEG_DARK));
        vox(parent,0.72,0.48,LEG_L1*0.72, 0,0,LEG_L1*0.46, M(C.CARAPACE));
        vox(parent,0.44,0.26,LEG_L1*0.80, 0,0.28,LEG_L1*0.48, M(C.CARAPACE));
        vox(parent,0.50,0.22,LEG_L1*0.52, 0,0.26,LEG_L1*0.55, M(C.HAIR_RUST));
        vox(parent,0.48,0.22,LEG_L1*0.74, 0,-0.25,LEG_L1*0.46, M(C.CARAPACE_M));
        vox(parent,0.76,0.72,0.65, 0,0,LEG_L1-0.05, M(C.CARAPACE_M));
        vox(parent,0.82,0.76,0.45, 0,0,LEG_L1, M(C.HAIR_RUST));
        vox(parent,0.58,0.30,0.40, 0,0.32,LEG_L1, M(C.HAIR_GOLD));
      };
      const buildTibia=parent=>{
        vox(parent,0.78,0.74,0.52, 0,0,0.16, M(C.HAIR_RUST));
        vox(parent,0.68,0.64,0.35, 0,0,0.30, M(C.CARAPACE_M));
        vox(parent,0.56,0.52,LEG_L2*0.50, 0,0,LEG_L2*0.28, M(C.LEG_DARK));
        vox(parent,0.66,0.42,LEG_L2*0.44, 0,0,LEG_L2*0.28, M(C.CARAPACE));
        vox(parent,0.40,0.20,LEG_L2*0.46, 0,-0.22,LEG_L2*0.30, M(C.HAIR_RUST));
        vox(parent,0.46,0.44,LEG_L2*0.45, 0,0,LEG_L2*0.70, M(C.LEG_DARK));
        vox(parent,0.52,0.34,LEG_L2*0.38, 0,-0.08,LEG_L2*0.70, M(C.HAIR_RUST));
        vox(parent,0.50,0.46,0.28, 0,0,LEG_L2*0.88, M(C.CARAPACE_M));
        vox(parent,0.54,0.30,0.55, 0,-0.06,LEG_L2, M(C.SCOPULA));
        vox(parent,0.42,0.22,0.45, 0,0.08,LEG_L2-0.06, M(C.CARAPACE_M));
        vox(parent,0.10,0.12,0.22, 0.12,-0.10,LEG_L2+0.14, M(0x0a0a0a), 0.35,0,0);
        vox(parent,0.10,0.12,0.22, -0.12,-0.10,LEG_L2+0.14, M(0x0a0a0a), 0.35,0,0);
      };
      parts.legs=legConfigs.map(cfg=>{
        const femurG=new THREE.Group();buildFemur(femurG);g.add(femurG);
        const tibiaG=new THREE.Group();buildTibia(tibiaG);g.add(tibiaG);
        femurG.rotation.order='YXZ';tibiaG.rotation.order='YXZ';
        return {
          id:cfg.id,side:cfg.side,index:cfg.idx,group:cfg.grp,
          hipLocal:new THREE.Vector3(cfg.hip[0],cfg.hip[1],cfg.hip[2]),
          restLocal:new THREE.Vector3(cfg.rest[0],cfg.rest[1],cfg.rest[2]),
          femurGroup:femurG,tibiaGroup:tibiaG,
          worldFoot:new THREE.Vector3(),targetFoot:new THREE.Vector3(),
          stepStartFoot:new THREE.Vector3(),
          isStepping:false,stepProgress:1.0,stepDuration:0.20,stepHeight:0.7,stepReach:1,
          initialized:false,
        };
      });

      return {mesh:g,parts};
    },

    /* ---------- solver IK lokal (analitis Euler YXZ) ---------- */
    solveLeg(leg,hipW,footW){
      let dx=footW.x-hipW.x,dy=footW.y-hipW.y,dz=footW.z-hipW.z;
      const maxReach=(LEG_L1+LEG_L2)*0.996;
      const minReach=Math.abs(LEG_L1-LEG_L2)+0.1;
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
      const alpha=Math.acos(Math.max(-1,Math.min(1,cosA)));
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

    /* ---------- ANIMASI ---------- */
    animate(m,dt){
      const P=m.parts;if(!P||!P.bodyRig)return;
      const t=(m._tt=(m._tt||0)+dt);
      const speed=Math.hypot(m.vel.x,m.vel.z);
      const top=Math.max(0.6,m.speed||3.5);
      const act=m.tAct, tA=m.tActT||0;

      // Koordinat dunia mob
      const mobX=m.pos.x, mobY=m.pos.y, mobZ=m.pos.z;
      const yaw=m.mesh.rotation.y;
      const cosY=Math.cos(yaw), sinY=Math.sin(yaw);
      const sc=(m.mesh&&m.mesh.scale&&m.mesh.scale.x)?m.mesh.scale.x:SCALE;
      const isMoving=(speed>0.12);

      /* jam gait tetrapod sinkron kecepatan gerak */
      const isWebSpin=(act==='web'&&(tA<0.35||(tA>=1.25&&tA<1.60)));
      if(!m._gaitT)m._gaitT=0;
      if((isMoving||isWebSpin)&&act!=='leap'){
        const strideWorld=Math.max(0.4,1.8*sc);
        const cadence=(isWebSpin)?4.5:clamp(speed/strideWorld*1.3,1.4,4.2);
        m._gaitT+=dt*cadence;
      }
      const gaitCycle=m._gaitT%1.0;
      const activeGrp=(gaitCycle<0.5)?0:1;

      let bodyPitch=0,bodyRoll=0,bodyY=BODY_Y,flyY=0;
      const bodyRig=P.bodyRig, cheGrp=P.cheliceraGrp;
      const fL=P.cheliceraL.userData.fang, fR=P.cheliceraR.userData.fang;

      for(const leg of P.legs)leg.stepReach=1.0;

      if(act==='bite'){
        if(tA<0.22){
          const u=smooth5(tA/0.22);
          bodyPitch=-0.24*u;bodyY=BODY_Y+0.12*u;
          P.cheliceraL.rotation.y=0.35*u;P.cheliceraR.rotation.y=-0.35*u;
          fL.rotation.x=-0.85*u;fR.rotation.x=-0.85*u;
          P.pedipalpL.rotation.set(0.35*u,0.40*u,0);
          P.pedipalpR.rotation.set(0.35*u,-0.40*u,0);
        }else if(tA<0.52){
          const sub=smooth5((tA-0.22)/0.30), wave=Math.sin(sub*Math.PI);
          bodyPitch=0.34*wave;bodyY=BODY_Y-0.14*wave;
          cheGrp.position.z=2.4+0.48*wave;cheGrp.position.y=0.9-0.16*wave;
          P.cheliceraL.rotation.y=-0.24*wave;P.cheliceraR.rotation.y=0.24*wave;
          fL.rotation.x=0.85*wave;fR.rotation.x=0.85*wave;
          P.pedipalpL.rotation.set(-0.65*wave,0.12,0);
          P.pedipalpR.rotation.set(-0.65*wave,-0.12,0);
        }else if(tA<0.72){
          const nib=Math.sin((tA-0.52)*Math.PI*10);
          fL.rotation.x=0.32+nib*0.26;fR.rotation.x=0.32+nib*0.26;
          cheGrp.position.z=2.4+0.18;bodyPitch=0.10;
        }else{
          const rec=smooth5((tA-0.72)/0.16);
          bodyPitch=0.10*(1-rec);
          if(rec>=1){cheGrp.position.set(0,0.9,2.4);
            P.cheliceraL.rotation.set(0,0,0);P.cheliceraR.rotation.set(0,0,0);
            fL.rotation.set(0,0,0);fR.rotation.set(0,0,0);
            P.pedipalpL.rotation.set(0,0,0);P.pedipalpR.rotation.set(0,0,0);}
        }
      }else if(act==='leap'){
        if(tA<0.28){
          const u=smooth5(tA/0.28);
          bodyY=BODY_Y-0.30*u;bodyPitch=-0.24*u;
          fL.rotation.x=-0.45*u;fR.rotation.x=-0.45*u;
          P.pedipalpL.rotation.x=0.35*u;P.pedipalpR.rotation.x=0.35*u;
        }else if(tA<0.90){
          const sub=(tA-0.28)/0.62;
          flyY=Math.sin(sub*Math.PI)*0.9;
          bodyPitch=(sub<0.48)?(0.42*(1-sub/0.48)):(-0.38*((sub-0.48)/0.52));
          fL.rotation.x=-0.80;fR.rotation.x=-0.80;
          P.pedipalpL.rotation.x=0.65;P.pedipalpR.rotation.x=0.65;
        }else{
          flyY=0;bodyPitch=0;
          fL.rotation.x=0;fR.rotation.x=0;
          P.pedipalpL.rotation.x=-0.20;P.pedipalpR.rotation.x=-0.20;
        }
      }else if(act==='web'){
        if(tA<0.35){
          bodyPitch=0.05*smooth5(tA/0.35);
        }else if(tA<1.25){
          const tW=tA-0.35;
          P.abdomenGrp.rotation.x=-0.58+Math.sin(tW*22)*0.07;
          bodyPitch=0.12;
        }else if(tA<1.60){
          const u=smooth5((tA-1.25)/0.35);
          P.abdomenGrp.rotation.x=-0.58*(1-u);bodyPitch=0.12*(1-u);
        }else{
          P.abdomenGrp.rotation.x=0;bodyPitch=0;
        }
      }else{
        /* locomotion: bobbing + roll sinkron langkah kaki */
        if(isMoving){
          const runF=(speed/top>0.62);
          const bob=Math.abs(Math.sin(m._gaitT*Math.PI*4))*(runF?0.10:0.05);
          bodyY=BODY_Y+bob;
          bodyRoll=Math.sin(m._gaitT*Math.PI*2)*(runF?0.04:0.02);
        }
        P.pedipalpL.rotation.x=Math.sin(t*3.5)*0.12;
        P.pedipalpR.rotation.x=Math.cos(t*3.5)*0.12;
        fL.rotation.x=0;fR.rotation.x=0;
        if(!act){cheGrp.position.set(0,0.9,2.4);
          P.cheliceraL.rotation.set(0,0,0);P.cheliceraR.rotation.set(0,0,0);}
        P.abdomenGrp.rotation.x=0;
      }

      /* napas perut + kilau mata */
      const br=Math.sin(t*2.2);
      P.abdomenGrp.scale.set(1+br*0.025,1+br*0.035,1+br*0.02);
      if(P.eyeMat&&m.flash<=0)P.eyeMat.emissiveIntensity=0.85+0.3*Math.sin(t*5);

      /* peredaman pegas saat mendarat (spring absorption) */
      if((m.landSpringT||0)>0){
        m.landSpringT-=dt;
        const prog=1-Math.max(0,m.landSpringT)/0.35;
        m.tSpringSink=Math.sin(prog*Math.PI)*Math.exp(-prog*3.0)*0.38;
      }else if(!m.tSuperLeap){
        m.tSpringSink=0;
      }

      bodyRig.position.set(0,bodyY+flyY-(m.tSpringSink||0),0);
      bodyRig.rotation.set(bodyPitch,0,bodyRoll);
      m.tFlyY=flyY;
      const bq=bodyRig.quaternion,bp=bodyRig.position;

      /* =========================================================================
         PROCEDURAL IK LEG STEPPING & GROUND ADAPTATION
         -------------------------------------------------------------------------
         Kaki menapak pada koordinat dunia nyata (blok tanah / obstacle).
         Saat mob berjalan di dunia, telapak kaki menempel diam di tanah (stance),
         sehingga badan meluncur maju di atas kaki (anti-sliding).
         Ketika jarak drift melebihi batas, kaki mengangkat dalam lengkungan
         parabola (swing) dan mendarat pada ketinggian blok tanah berikutnya.
         ========================================================================= */
      const isRunning=(speed/top>0.62);
      const stepThreshold=((isRunning)?0.45:(isWebSpin?0.24:0.36))*sc;
      const maxDrift=0.95*sc;

      for(const leg of P.legs){
        const hipLocal=leg.hipLocal.clone().applyQuaternion(bq).add(bp);

        // Posisi telapak kaki ideal di dunia (posisi rest horizontal yang diputar arah hadap mob)
        const reach=Math.max(0.85,Math.min(1.45,leg.stepReach||1));
        const lx=leg.restLocal.x*reach;
        const lz=leg.restLocal.z*reach;
        const idealWorldX=mobX+(lx*cosY+lz*sinY)*sc;
        const idealWorldZ=mobZ+(-lx*sinY+lz*cosY)*sc;
        let idealGroundY=(typeof World!=='undefined'&&World.groundAt)
          ?World.groundAt(idealWorldX,idealWorldZ,mobY+2.5):mobY;
        if(idealGroundY===undefined||!isFinite(idealGroundY)||idealGroundY<=0)idealGroundY=mobY;

        // Inisialisasi awal saat mob baru spawn
        if(!leg.initialized){
          leg.initialized=true;
          leg.worldFoot=new THREE.Vector3(idealWorldX,idealGroundY,idealWorldZ);
          leg.targetFoot=new THREE.Vector3(idealWorldX,idealGroundY,idealWorldZ);
          leg.stepStartFoot=new THREE.Vector3(idealWorldX,idealGroundY,idealWorldZ);
          leg.isStepping=false;
          leg.stepProgress=1.0;
        }

        // KASUS KHUSUS LOMPAT DI UDARA (AERODYNAMIC POSE BAIK SKILL MAUPUN TUNGGANGAN / LOMPAT OBSTACLE 2 BLOK)
        const isSuperLeaping = (m.tSuperLeap || m._tJumping) && !m.onGround;
        if((act==='leap'&&tA>=0.28&&tA<0.90) || isSuperLeaping){
          leg.isStepping=false;
          const stretchZ=(leg.index<=1)?1.4:-1.5;
          const footPosLocal=leg.restLocal.clone();
          footPosLocal.z+=stretchZ*0.9;
          footPosLocal.y=-(Math.max(0.5,2.1-(flyY||0)*0.3));
          this.solveLeg(leg,hipLocal,footPosLocal);
          leg.needsLandSnap=true;
          continue;
        }
        if(leg.needsLandSnap&&(act!=='leap'||tA>=0.90)&&!isSuperLeaping){
          leg.needsLandSnap=false;
          leg.worldFoot.set(idealWorldX,idealGroundY,idealWorldZ);
          leg.targetFoot.set(idealWorldX,idealGroundY,idealWorldZ);
          leg.isStepping=false;
        }

        // Jarak drift di dunia antara telapak kaki saat ini dengan posisi ideal
        const drift=Math.hypot(leg.worldFoot.x-idealWorldX,leg.worldFoot.z-idealWorldZ);

        // Pengaman knockback/teleport ekstrem
        if(drift>2.8*sc){
          leg.worldFoot.set(idealWorldX,idealGroundY,idealWorldZ);
          leg.isStepping=false;
        }

        // Kaki sedang melangkah di udara (swing phase)
        if(leg.isStepping){
          leg.stepProgress+=dt/leg.stepDuration;
          const prog=Math.min(1.0,leg.stepProgress);
          const u=smooth5(prog);
          const stepLift=(leg.stepHeight||0.7)*sc*(isRunning?1.25:1.0);
          const arc=Math.sin(prog*Math.PI)*stepLift;

          leg.worldFoot.x=lerp(leg.stepStartFoot.x,leg.targetFoot.x,u);
          leg.worldFoot.z=lerp(leg.stepStartFoot.z,leg.targetFoot.z,u);
          leg.worldFoot.y=lerp(leg.stepStartFoot.y,leg.targetFoot.y,u)+arc;

          if(prog>=1.0){
            leg.isStepping=false;
            leg.worldFoot.copy(leg.targetFoot);
            if(typeof FX!=='undefined'&&FX.debris&&Math.random()<0.35){
              FX.debris(leg.worldFoot.clone().add(new THREE.Vector3(0,0.05,0)),0xb8a68e,2,0.8);
            }
          }
        }else{
          // Kaki sedang menapak di tanah (stance phase)
          const isAllowedGait=(leg.group===activeGrp)||(drift>maxDrift)||isWebSpin;
          const shouldStep=(isMoving||isWebSpin)&&act!=='bite';

          if(isAllowedGait&&drift>stepThreshold&&shouldStep){
            leg.isStepping=true;
            leg.stepProgress=0.0;
            leg.stepStartFoot.copy(leg.worldFoot);

            // Durasi langkah sesuai ritme kecepatan
            leg.stepDuration=isRunning?0.13:(isWebSpin?0.10:0.18);
            leg.stepHeight=isRunning?1.0:0.7;

            // Prediksi titik pendaratan masa depan di tanah dunia
            const leadMultiplier=leg.stepDuration*1.4;
            let predX=idealWorldX;
            let predZ=idealWorldZ;
            if(isMoving){
              predX+=m.vel.x*leadMultiplier;
              predZ+=m.vel.z*leadMultiplier;
            }

            // Ketinggian blok tanah di titik pendaratan target
            let landY=(typeof World!=='undefined'&&World.groundAt)
              ?World.groundAt(predX,predZ,mobY+2.5):idealGroundY;
            if(landY===undefined||!isFinite(landY)||landY<=0)landY=idealGroundY;

            leg.targetFoot.set(predX,landY,predZ);
          }else if(!isMoving&&!isWebSpin){
            // Saat diam: telapak kaki menyesuaikan kontur blok tanah di bawahnya secara halus
            let curGroundY=(typeof World!=='undefined'&&World.groundAt)
              ?World.groundAt(leg.worldFoot.x,leg.worldFoot.z,mobY+2.5):mobY;
            if(curGroundY!==undefined&&isFinite(curGroundY)&&curGroundY>0){
              leg.worldFoot.y=lerp(leg.worldFoot.y,curGroundY,clamp(12*dt,0,1));
            }
          }
        }

        // Konversikan koordinat dunia kaki ke ruang lokal mesh tarantula
        const dx=leg.worldFoot.x-mobX;
        const dy=leg.worldFoot.y-mobY;
        const dz=leg.worldFoot.z-mobZ;
        const footLocalX=(dx*cosY-dz*sinY)/sc;
        const footLocalY=dy/sc;
        const footLocalZ=(dx*sinY+dz*cosY)/sc;
        const footPosLocal=new THREE.Vector3(footLocalX,footLocalY,footLocalZ);

        // Solve 3D Inverse Kinematics dari Hip ke Foot
        this.solveLeg(leg,hipLocal,footPosLocal);
      }
    },

    /* ---------- FX aksi ---------- */
    biteFX(m){
      const p=new THREE.Vector3();p.copy(m.pos);
      p.x+=Math.sin(m.mesh.rotation.y)*1.4;p.z+=Math.cos(m.mesh.rotation.y)*1.4;p.y+=1.0;
      if(typeof FX!=='undefined'){
        FX.debris(p,0xff3b2f,12,3.0);
        FX.debris(p,0x16a34a,8,2.4);
        FX.ring(p.x,Math.max(0.06,p.y-0.6),p.z,0xff3b2f,0.4,1.8);
      }
      if(typeof Sfx!=='undefined'&&Sfx.at)Sfx.at(m.pos,'hit');
    },
    leapLandFX(m){
      if(typeof FX!=='undefined'){
        FX.debris(m.pos.clone().add(new THREE.Vector3(0,0.3,0)),0xb8a68e,18,3.2);
        FX.ring(m.pos.x,m.pos.y+0.08,m.pos.z,0xffa53d,0.6,3.4);
        FX.addShake(0.55);
      }
      if(typeof Sfx!=='undefined'&&Sfx.smash)Sfx.smash();
    },
    webShootFX(origin){
      if(typeof FX!=='undefined'){
        FX.debris(origin.clone(),0xffffff,6,1.6);
        FX.ring(origin.x,Math.max(0.06,origin.y-0.5),origin.z,0xe0f2fe,0.35,1.6);
      }
      if(typeof Sfx!=='undefined'&&Sfx.at)Sfx.at(origin,'cast');
    },

    /* =========================================================================
       POOL JARING LABA-LABA — pool global, di-update sekali per frame.
       - Saat melayang di udara: berbentuk gumpalan bola sutra putih voxel padat.
       - Saat mengenai sasaran / menempel di tanah: mekar menjadi jaring laba-laba
         voxel 3D otentik (ukuran diperkecil setengahnya agar tidak terlalu besar).
       - Efek: damage kecil + STUN 5 DETIK ke korban.
       ========================================================================= */
    WEB_MAX:24,_web:null,_webMesh:null,
    // 1. Gumpalan sutra putih padat saat melesat di udara (silk ball / cocoon)
    buildCocoonBlobMesh(){
      const group=new THREE.Group();
      const mat=new THREE.MeshLambertMaterial({color:0xf8fafc});
      const glowMat=new THREE.MeshLambertMaterial({color:0xffffff,emissive:0xa5f3fc,emissiveIntensity:0.5});
      const vox=(w,h,d,x,y,z,m)=>{
        const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m||mat);
        mesh.position.set(x,y,z);
        group.add(mesh);
      };
      // Gumpalan bola sutra berdiameter ~0.35 blok
      vox(0.26,0.26,0.26, 0,0,0, glowMat);
      vox(0.32,0.18,0.18, 0,0,0);
      vox(0.18,0.32,0.18, 0,0,0);
      vox(0.18,0.18,0.32, 0,0,0);
      vox(0.12,0.12,0.12, 0.12,0.10,0.10, glowMat);
      vox(0.12,0.12,0.12, -0.10,-0.12,-0.08);
      return group;
    },
    // 2. Jaring laba-laba voxel 3D terbuka (ukuran setengah dari sebelumnya)
    buildSpiderWebMesh(){
      const group=new THREE.Group();
      const mat=new THREE.MeshLambertMaterial({
        color:0xf8fafc,
        transparent:true,
        opacity:0.95,
        side:THREE.DoubleSide
      });
      const dropMat=new THREE.MeshLambertMaterial({
        color:0xffffff,
        emissive:0xa5f3fc,
        emissiveIntensity:0.45
      });
      const box=(w,h,d,x,y,z,rz,m)=>{
        const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m||mat);
        mesh.position.set(x,y,z);
        if(rz)mesh.rotation.z=rz;
        group.add(mesh);
      };

      // Hub Pusat
      box(0.15,0.15,0.06, 0,0,0, 0, dropMat);

      // Delapan Jari-jari Radial (Spokes) ukuran proporsional (~0.68)
      const spokes=8;
      for(let s=0;s<spokes;s++){
        const ang=(s/spokes)*Math.PI*2;
        const len=0.68, midR=0.36;
        box(0.045,len,0.04, Math.sin(ang)*midR, Math.cos(ang)*midR, 0, -ang);
      }

      // Tiga Cincin Spiral Poligonal Konsentris (skala setengah)
      const rings=[0.22, 0.42, 0.65];
      for(const r of rings){
        for(let s=0;s<spokes;s++){
          const a1=(s/spokes)*Math.PI*2;
          const a2=((s+1)/spokes)*Math.PI*2;
          const x1=Math.sin(a1)*r, y1=Math.cos(a1)*r;
          const x2=Math.sin(a2)*r, y2=Math.cos(a2)*r;

          const sag=0.91;
          const am=(a1+a2)*0.5;
          const xm=Math.sin(am)*r*sag, ym=Math.cos(am)*r*sag;

          const len1=Math.hypot(xm-x1, ym-y1);
          const ang1=Math.atan2(xm-x1, ym-y1);
          box(0.04,len1*1.04,0.035, (x1+xm)*0.5,(y1+ym)*0.5,0, -ang1);

          const len2=Math.hypot(x2-xm, y2-ym);
          const ang2=Math.atan2(x2-xm, y2-ym);
          box(0.04,len2*1.04,0.035, (xm+x2)*0.5,(ym+y2)*0.5,0, -ang2);

          // Butiran sutra di simpul
          box(0.06,0.06,0.05, x1,y1,0, 0, dropMat);
        }
      }
      return group;
    },
    webInit(){
      if(this._web)return;
      this._web=[];this._webMesh=[];
      const scene=(typeof Game!=='undefined'&&Game.scene)?Game.scene:null;
      for(let i=0;i<this.WEB_MAX;i++){
        this._web.push({life:0,dmg:6,pos:new THREE.Vector3(),vel:new THREE.Vector3(),
          hit:false,src:null,stuck:0,spin:0,spinAngle:Math.random()*Math.PI*2});
        const container=new THREE.Group();
        const cocoon=this.buildCocoonBlobMesh();
        const web=this.buildSpiderWebMesh();
        container.add(cocoon);
        container.add(web);
        container.userData={cocoon,web};
        container.visible=false;
        if(scene)scene.add(container);
        this._webMesh.push(container);
      }
    },
    applyWebStun(src,tgt){
      const S=this.WEB_STUN;
      if(src&&!src.dead){
        src.atkCd=Math.min(src.atkCd||0,0.25); // potong cooldown agar tarantula langsung menerkam
      }
      if(tgt===Player){
        if(Player.dead)return;
        Player.stunT=S;
        Player._webStunned=true;
        // JIKA SEDANG MENUNGGANGI PET: Mount ikut terkena stun jaring!
        if(typeof Capture!=='undefined'&&Capture.riding&&Capture.pet){
          Capture.pet.stunT=S;
        }
        if(typeof FX!=='undefined'){
          FX.text(Player.pos.clone().add(new THREE.Vector3(0,2.3,0)),'🕸️ STUN 5s','#e0f2fe');
          FX.debris(Player.pos.clone().add(new THREE.Vector3(0,1.2,0)),0xffffff,10,2.2);
        }
        return;
      }
      if(tgt&&tgt.role){
        tgt.stunT=S;
        if(typeof FX!=='undefined'){
          FX.text(tgt.pos.clone().add(new THREE.Vector3(0,2.1,0)),'🕸️ STUN 5s','#e0f2fe');
          FX.debris(tgt.pos.clone().add(new THREE.Vector3(0,1.1,0)),0xffffff,8,2.0);
        }
        return;
      }
      if(tgt&&tgt.hp!==undefined){
        tgt.stunT=Math.max(tgt.stunT||0,S);
        // JIKA PET SEDANG DITUNGGANGI: Pemain di atasnya ikut terjerat jaring!
        if(typeof Capture!=='undefined'&&Capture.riding&&Capture.pet===tgt){
          Player.stunT=S;
          Player._webStunned=true;
        }
        if(typeof FX!=='undefined')
          FX.text(tgt.pos.clone().add(new THREE.Vector3(0,2.0,0)),'🕸️ STUN 5s','#e0f2fe');
      }
    },
    webBurst(m,tgt){
      this.webInit();
      const origin=new THREE.Vector3();
      if(m.parts&&m.parts.spinneretAnchor)m.parts.spinneretAnchor.getWorldPosition(origin);
      else origin.copy(m.pos).add(new THREE.Vector3(0,1.6,0));
      let target=(tgt&&!tgt.dead)?tgt:null;
      if(!target&&typeof Monsters!=='undefined'&&Monsters.battleTarget)
        target=Monsters.battleTarget(m,16);
      if(!target&&!m.pet&&typeof Player!=='undefined'&&!Player.dead)target=Player;
      if(!target)return;
      const aim=new THREE.Vector3().subVectors(
        target.pos.clone().add(new THREE.Vector3(0,1.0,0)),origin);
      const dist=aim.length();aim.normalize();
      if(target.vel){aim.x+=target.vel.x*0.03*dist;aim.z+=target.vel.z*0.03*dist;aim.normalize();}
      for(let i=0;i<this.WEB_MAX;i++){
        const w=this._web[i];
        if(w.life>0)continue;
        w.life=2.2;w.hit=false;w.stuck=0;w.dmg=Math.max(3,Math.round(m.dmg*0.5));
        w.src=m;w.pos.copy(origin);
        w.vel.copy(aim).multiplyScalar(15+Math.random()*3);
        w.vel.x+=(Math.random()-0.5)*1.2;w.vel.y+=(Math.random()-0.5)*0.8;w.vel.z+=(Math.random()-0.5)*1.2;
        w.spin=(Math.random()-0.5)*7;
        this.webShootFX(origin);
        break;
      }
    },
    updateWebs(dt){
      this.webInit();
      for(let i=0;i<this.WEB_MAX;i++){
        const w=this._web[i],mm=this._webMesh[i];
        if(w.life>0){
          w.life-=dt;
          if(!w.hit){
            w.vel.y-=6*dt;
            w.pos.addScaledVector(w.vel,dt);
            if(typeof Monsters!=='undefined'&&Monsters.projTarget){
              const v=Monsters.projTarget(w.src,w.pos.x,w.pos.y,w.pos.z,1.1);
              if(v&&Monsters.hitTarget(w.src,v,w.dmg,1.8,w.pos.x,w.pos.z,2)){
                w.hit=true;w.life=Math.min(w.life,1.2);
                this.applyWebStun(w.src,v);
                if(typeof FX!=='undefined')
                  FX.debris(v.pos.clone().add(new THREE.Vector3(0,1.2,0)),0xffffff,10,2.4);
              }
            }
            const gy=(typeof World!=='undefined'&&World.groundAt)
              ?World.groundAt(w.pos.x,w.pos.z,w.pos.y+2):0;
            if(w.pos.y<=gy+0.12&&w.vel.y<0){
              w.hit=true;w.stuck=1;w.life=Math.min(w.life,1.6);
              w.pos.y=gy+0.12;
              if(typeof FX!=='undefined')
                FX.debris(w.pos.clone(),0xe2e8f0,5,1.4);
            }
          }
          if(w.life>0){
            mm.visible=true;mm.position.copy(w.pos);
            const ud=mm.userData||{};
            const isOpened=w.hit||w.stuck;
            if(ud.cocoon)ud.cocoon.visible=!isOpened;
            if(ud.web)ud.web.visible=isOpened;

            if(w.stuck){
              mm.rotation.set(-Math.PI/2,0,w.spinAngle||0);
              mm.scale.setScalar(1.25); // Ukuran jaring terbuka setengahnya dari sebelumnya
            }else if(w.hit){
              mm.rotation.set(0,w.spinAngle||0,0);
              mm.scale.setScalar(1.15);
            }else{
              // Fase bola sutra melayang di udara: berputar cepat di sumbu putarnya
              const spdXZ=Math.hypot(w.vel.x,w.vel.z)||1e-4;
              mm.rotation.y=Math.atan2(w.vel.x,w.vel.z);
              mm.rotation.x=-Math.atan2(w.vel.y,spdXZ);
              mm.rotation.z+=w.spin*dt;
              mm.scale.setScalar(1.0);
            }
            mm.traverse(child=>{
              if(child.material)child.material.opacity=Math.min(1,Math.max(0.15,w.life))*0.95;
            });
          }else mm.visible=false;
        }else mm.visible=false;
      }
    },
  };

  window.Mob_Tarantula=Mob_Tarantula;
  return Mob_Tarantula;
})();
