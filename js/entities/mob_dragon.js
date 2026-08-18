'use strict';
/* =============================================================================
   ENTITAS MOB: NAGA MERAH / RED DRAGON (🐉)
   -----------------------------------------------------------------------------
   Monster BOSS terbesar di game. Hanya muncul di biome PEGUNUNGAN (MOUNTAIN)
   dengan peluang 10%. Selalu berupa boss (sudah besar dari sananya), sehingga
   TIDAK mendapat skala boss tambahan (noBossScale) agar tidak raksasa ganda.

   Model dipotong dari "NEW MODEL/Red dragon.html" (voxel, minecraft style).
   Animasi: idle (napas + ekor), walk (kaki & sayap), claw (serangan cakar).
   Dipanggil Monsters.make() & Monsters.animate() lewat window.Mob_Dragon.
   ============================================================================= */

const Mob_Dragon={

  /* ---------- MODEL 3D ---------- */
  build(boss){
    const g=new THREE.Group();               // root luar (ditempatkan di pos)
    const parts={};

    /* material naga merah */
    const M={
      main:    new THREE.MeshLambertMaterial({color:0xC8352A}),
      dark:    new THREE.MeshLambertMaterial({color:0x99251C}),
      darker:  new THREE.MeshLambertMaterial({color:0x6B130F}),
      belly:   new THREE.MeshLambertMaterial({color:0xE8B274}),
      belly2:  new THREE.MeshLambertMaterial({color:0xD99C5C}),
      bone:    new THREE.MeshLambertMaterial({color:0xEDE0C2}),
      membrane:new THREE.MeshLambertMaterial({color:0x8F1B12}),
      eye:     new THREE.MeshBasicMaterial({color:0xFFCC33}),
      pupil:   new THREE.MeshBasicMaterial({color:0x141414}),
    };

    const box=(parent,mat,x,y,z,w,h,d)=>{
      const ms=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
      ms.position.set(x,y,z);ms.castShadow=!IS_MOBILE;parent.add(ms);return ms;
    };

    const TORSO_Y=2.9;
    const root=new THREE.Group();root.position.y=-0.05;g.add(root);  // ground-kan kaki
    parts.root=root;

    /* --- badan --- */
    const torso=new THREE.Group();torso.position.y=TORSO_Y;root.add(torso);
    parts.torso=torso;
    box(torso,M.main,   0, 0.15, 0.55, 2.3,1.9,2.6);
    box(torso,M.main,   0, 0.0,-0.9,  2.05,1.75,1.5);
    box(torso,M.main,   0,-0.1,-1.9,  1.8,1.6,1.2);
    box(torso,M.belly,  0,-0.75,0.7,  1.7,0.55,2.6);
    box(torso,M.belly2, 0,-0.8,-0.85, 1.5,0.5,1.5);
    box(torso,M.darker, 0,-0.62,1.5,  1.72,0.12,0.18);
    box(torso,M.darker, 0,-0.66,0.6,  1.72,0.12,0.18);
    box(torso,M.belly,  0, 0.0,1.82,  1.4,1.2,0.22);
    box(torso,M.dark,   0, 0.95,1.35, 1.5,0.8,0.9);
    box(torso,M.dark,   1.2,0.7,1.0,  0.5,0.95,1.15);
    box(torso,M.dark,  -1.2,0.7,1.0,  0.5,0.95,1.15);
    box(torso,M.dark,   1.12,0.3,-0.4,0.35,0.6,0.9);
    box(torso,M.dark,  -1.12,0.3,-0.4,0.35,0.6,0.9);
    /* sirip punggung */
    const spZ=[1.35,0.85,0.3,-0.25,-0.85,-1.45,-2.0];
    const spH=[0.55,0.7,0.8,0.75,0.65,0.55,0.45];
    const spY=[0,0,0,-0.05,-0.2,-0.3,-0.4];
    for(let i=0;i<spZ.length;i++)
      box(torso,M.darker,0,1.0+spY[i]+spH[i]/2,spZ[i],0.34,spH[i],0.5);

    /* --- leher & kepala --- */
    const neck=new THREE.Group();neck.position.set(0,0.95,1.5);neck.rotation.x=-0.16;
    torso.add(neck);parts.neck=neck;
    box(neck,M.main,  0,0.10,0.45, 1.15,1.15,0.95);
    box(neck,M.main,  0,0.42,1.05, 1.0,1.0,0.9);
    box(neck,M.main,  0,0.72,1.60, 0.9,0.9,0.85);
    box(neck,M.belly2,0,-0.22,0.95,0.7,0.5,1.5);
    box(neck,M.darker,0,0.78,0.5,  0.3,0.45,0.4);
    box(neck,M.darker,0,1.05,1.3,  0.26,0.38,0.34);

    const head=new THREE.Group();head.position.set(0,0.95,2.1);neck.add(head);parts.head=head;
    box(head,M.main,  0,0.15,0.25, 1.35,1.05,1.35);
    box(head,M.dark,  0,0.55,0.70, 1.4,0.3,0.5);
    box(head,M.main,  0,0.00,1.15, 0.95,0.62,0.95);
    box(head,M.main,  0,-0.02,1.62,0.75,0.5,0.45);
    box(head,M.darker,0.18,0.12,1.86,0.12,0.1,0.1);
    box(head,M.darker,-0.18,0.12,1.86,0.12,0.1,0.1);
    box(head,M.bone,  0.30,-0.32,1.35,0.11,0.2,0.11);
    box(head,M.bone, -0.30,-0.32,1.35,0.11,0.2,0.11);
    box(head,M.bone,  0.14,-0.30,1.62,0.1,0.16,0.1);
    box(head,M.bone, -0.14,-0.30,1.62,0.1,0.16,0.1);
    box(head,M.dark,  0,-0.28,0.9, 0.6,0.12,0.8);
    const eyeL=box(head,M.eye,-0.68,0.30,0.75,0.14,0.26,0.34);
    const eyeR=box(head,M.eye, 0.68,0.30,0.75,0.14,0.26,0.34);
    parts.eyeL=eyeL;parts.eyeR=eyeR;
    box(head,M.pupil,-0.72,0.30,0.82,0.06,0.12,0.12);
    box(head,M.pupil, 0.72,0.30,0.82,0.06,0.12,0.12);
    for(const s of[-1,1]){
      box(head,M.bone,  s*0.42,0.72,-0.25,0.28,0.28,0.5);
      box(head,M.bone,  s*0.50,0.95,-0.70,0.22,0.22,0.45);
      box(head,M.bone,  s*0.56,1.12,-1.00,0.16,0.16,0.3);
      box(head,M.darker,s*0.70,0.05,-0.10,0.18,0.18,0.5);
    }
    box(head,M.darker,0,0.80,-0.05,0.3,0.35,0.6);

    /* anchor MULUT — titik keluar semburan api, di depan moncong kepala.
       Dipakai spawnFire() via getWorldPosition supaya api muncul tepat di
       mulut, bukan di leher. */
    const mouth=new THREE.Object3D();mouth.position.set(0,-0.1,1.85);head.add(mouth);parts.mouth=mouth;

    const jaw=new THREE.Group();jaw.position.set(0,-0.3,0.35);head.add(jaw);parts.jaw=jaw;
    box(jaw,M.dark, 0,-0.10,0.50,0.9,0.32,1.2);
    box(jaw,M.main, 0,-0.06,1.05,0.7,0.28,0.5);
    box(jaw,M.bone, 0.25,0.10,0.95,0.1,0.16,0.1);
    box(jaw,M.bone,-0.25,0.10,0.95,0.1,0.16,0.1);

    /* --- sayap --- */
    const buildWing=(side)=>{
      const sh=new THREE.Group();sh.position.set(side*1.2,0.85,0.55);torso.add(sh);
      box(sh,M.main,    side*0.4, 0.16,0.05, 0.8,0.55,0.7);
      box(sh,M.dark,    side*0.55,0.20,0.02, 0.5,0.30,0.45);
      box(sh,M.bone,    side*1.20,0.06,0.00, 2.5,0.36,0.40);
      box(sh,M.membrane,side*1.15,-0.04,-0.90,2.35,0.12,2.00);
      box(sh,M.membrane,side*0.75,-0.03,0.42, 1.30,0.10,0.60);
      const el=new THREE.Group();el.position.set(side*2.45,0.03,0);sh.add(el);
      box(el,M.bone,side*0.12,-0.16,0.26,0.2,0.2,0.55);
      const ang=[0.8,0.42,0.1,-0.22],len=[3.4,3.05,2.6,2.0];
      for(let i=0;i<4;i++){
        const fg=new THREE.Group();fg.rotation.y=ang[i]*side;el.add(fg);
        box(fg,M.bone,    side*len[i]/2,    0.00,0.00,       len[i],0.24,0.28);
        box(fg,M.membrane,side*len[i]*0.48,-0.05,-len[i]*0.42,len[i]*0.92,0.10,len[i]*0.85);
        box(fg,M.membrane,side*len[i]*0.95,-0.06,-len[i]*0.32,len[i]*0.26,0.08,len[i]*0.50);
        if(i<2)box(fg,M.darker,side*(len[i]+0.12),-0.04,0.00,0.3,0.16,0.18);
      }
      return{sh,el};
    };
    parts.wingL=buildWing(-1);parts.wingR=buildWing(1);

    /* --- lengan depan --- */
    const buildArm=(side)=>{
      const sh=new THREE.Group();sh.position.set(side*1.3,-0.32,1.3);torso.add(sh);
      box(sh,M.main,0,-0.55,0,0.6,1.15,0.75);
      box(sh,M.dark,side*0.28,-0.35,0.1,0.18,0.5,0.5);
      const el=new THREE.Group();el.position.set(0,-1.12,0.03);sh.add(el);
      box(el,M.main,0,-0.52,0.02,0.5,1.1,0.6);
      box(el,M.main,0,-1.18,0.10,0.58,0.42,0.75);
      for(const cx of[-0.18,0,0.18])box(el,M.bone,cx,-1.24,0.52,0.14,0.15,0.42);
      return{sh,el};
    };
    parts.armL=buildArm(-1);parts.armR=buildArm(1);

    /* --- kaki belakang --- */
    const buildLeg=(side)=>{
      const hip=new THREE.Group();hip.position.set(side*1.42,-0.42,-1.6);torso.add(hip);
      box(hip,M.main,0,-0.5,0.08,0.95,1.35,1.2);
      box(hip,M.dark,side*0.42,-0.35,0.3,0.2,0.7,0.7);
      const kn=new THREE.Group();kn.position.set(0,-1.18,0.12);hip.add(kn);
      box(kn,M.dark,0,-0.5,-0.05,0.62,1.0,0.7);
      box(kn,M.main,0,-1.02,0.18,0.72,0.42,1.0);
      for(const cx of[-0.22,0,0.22])box(kn,M.bone,cx,-1.06,0.75,0.16,0.16,0.45);
      return{hip,kn};
    };
    parts.legL=buildLeg(-1);parts.legR=buildLeg(1);

    /* --- ekor beruas --- */
    const tailSegs=[];parts.tail=tailSegs;
    {
      const defs=[
        {pos:[0,-0.12,-2.3],size:[1.05,0.95,1.5],off:-0.72,next:[0,-0.06,-1.42]},
        {size:[0.85,0.75,1.35],off:-0.65,next:[0,-0.05,-1.28]},
        {size:[0.62,0.55,1.20],off:-0.58,next:[0,-0.04,-1.16]},
        {size:[0.42,0.38,1.05],off:-0.50,next:[0,-0.02,-1.00]}
      ];
      let parent=torso,prev=null;
      defs.forEach((d,i)=>{
        const seg=new THREE.Group();
        if(i===0)seg.position.set(d.pos[0],d.pos[1],d.pos[2]);
        else seg.position.set(prev[0],prev[1],prev[2]);
        parent.add(seg);
        box(seg,M.main,0,0,d.off,d.size[0],d.size[1],d.size[2]);
        if(i<3)box(seg,M.darker,0,d.size[1]/2+0.12,d.off,0.22,0.3,0.3);
        tailSegs.push(seg);parent=seg;prev=d.next;
      });
      const tip=new THREE.Group();tip.position.set(0,-0.02,-1.0);parent.add(tip);
      tailSegs.push(tip);
      const d1=box(tip,M.darker,0,0,-0.42,0.8,0.8,0.26);d1.rotation.z=Math.PI/4;
      const d2=box(tip,M.darker,0,0,-0.62,0.5,0.5,0.20);d2.rotation.z=Math.PI/4;
      box(tip,M.bone,0,0.42,-0.4,0.14,0.3,0.14);
    }

    return{mesh:g,parts};
  },

  /* =========================================================================
     ANIMASI — porting setia sistem POSE CHANNEL dari Red dragon.html.
     Setiap pose (idle/walk/run/claw/tail) menyetel nilai channel P[...], lalu
     di-blend halus (from→cur) dan dipetakan ke rotasi rig oleh applyPose.
     State serangan cakar disimpan di m.clawT (diset monsters.js saat menyerang).
     Dipakai m.clawT (bukan m.windup) karena m.windup adalah blok khusus golem.
     ========================================================================= */
  TAIL_BASE:[-0.10,-0.09,-0.07,-0.05,-0.02],
  NECK_BASE:-0.16,
  TORSO_Y:2.9,
  CH:['torsoY','torsoPitch','torsoRoll','torsoYaw','neckPitch','neckYaw','headPitch','headYaw','jaw',
      'wingLZ','wingLY','wingLoZ','wingRZ','wingRY','wingRoZ',
      'armLX','armLZ','armLoX','armRX','armRZ','armRoX',
      'legLX','legLoX','legRX','legRoX',
      't0x','t0y','t1x','t1y','t2x','t2y','t3x','t3y','t4x','t4y','rootY','rootZ'],
  sstep(a,b,x){x=clamp((x-a)/(b-a),0,1);return x*x*(3-2*x);},
  lerp(a,b,t){return a+(b-a)*t;},

  /* state channel per-naga, dibuat sekali */
  dragState(){
    const P={},cur={},from={};
    this.CH.forEach(c=>{P[c]=0;cur[c]=0;from[c]=0;});
    return{P,cur,from,blendT:1,state:'',stateT:0};
  },

  resetPose(P){
    P.torsoY=0;P.torsoPitch=0;P.torsoRoll=0;P.torsoYaw=0;
    P.neckPitch=0;P.neckYaw=0;P.headPitch=0;P.headYaw=0;P.jaw=0.02;
    P.wingLZ=-0.95;P.wingRZ=0.95;P.wingLY=-0.22;P.wingRY=0.22;
    P.wingLoZ=-1.15;P.wingRoZ=1.15;
    P.armLX=0.05;P.armRX=0.05;P.armLZ=-0.1;P.armRZ=0.1;
    P.armLoX=0.12;P.armRoX=0.12;
    P.legLX=-0.03;P.legRX=-0.03;P.legLoX=0.18;P.legRoX=0.18;
    for(let i=0;i<5;i++){P['t'+i+'x']=0;P['t'+i+'y']=0;}
    P.rootY=0;P.rootZ=0;
  },

  tailSway(P,t,spd,amp){
    for(let i=0;i<5;i++){
      P['t'+i+'y']=amp*Math.sin(t*spd-i*0.55);
      P['t'+i+'x']=0.05*Math.sin(t*spd*0.6-i*0.4);
    }
  },

  /* ---------- POSE PER STATE (persis Red dragon.html) ---------- */
  poseIdle(P,t){
    const b=Math.sin(t*1.7);
    P.torsoY=0.045*b;P.torsoPitch=0.02*b;P.torsoRoll=0.012*Math.sin(t*0.9);
    P.neckPitch=-0.04+0.03*Math.sin(t*1.7+0.6);P.neckYaw=0.05*Math.sin(t*0.42);
    P.headPitch=0.05*Math.sin(t*0.85+1);
    P.headYaw=0.15*Math.sin(t*0.5)+0.05*Math.sin(t*1.9+2);
    P.jaw=0.03+0.02*Math.max(0,Math.sin(t*0.6));
    P.wingRZ+=0.03*b;P.wingLZ-=0.03*b;
    this.tailSway(P,t,0.9,0.15);
  },
  /* Panjang langkah naga (blok per satu siklus penuh kaki). Dipakai untuk
     menyinkronkan kecepatan animasi dengan kecepatan gerak asli supaya kaki
     tidak "menggeser" (foot sliding) saat jalan/lari. */
  STRIDE:3.4,
  poseWalk(P,t,ph){
    const A=0.55,B=0.48;
    P.legLX=A*Math.sin(ph);P.legRX=A*Math.sin(ph+Math.PI);
    P.armRX=B*Math.sin(ph);P.armLX=B*Math.sin(ph+Math.PI);
    P.legLoX=0.22+0.5*Math.max(0,Math.sin(ph-0.8));
    P.legRoX=0.22+0.5*Math.max(0,Math.sin(ph+Math.PI-0.8));
    P.armLoX=0.12+0.4*Math.max(0,Math.sin(ph+Math.PI-0.8));
    P.armRoX=0.12+0.4*Math.max(0,Math.sin(ph-0.8));
    P.torsoY=0.06*Math.sin(2*ph+Math.PI/2);
    P.torsoPitch=0.045+0.02*Math.sin(2*ph);
    P.torsoRoll=0.05*Math.sin(ph);P.torsoYaw=0.06*Math.sin(ph+Math.PI/2);
    P.neckPitch=-0.07+0.05*Math.sin(2*ph+Math.PI);P.neckYaw=-0.05*Math.sin(ph);
    P.headPitch=0.04*Math.sin(2*ph+0.9);P.headYaw=0.07*Math.sin(ph+Math.PI);
    P.jaw=0.04;
    P.wingRZ+=0.08*Math.sin(2*ph+0.8);P.wingLZ-=0.08*Math.sin(2*ph+0.8);
    P.rootZ=0.07*Math.sin(ph-Math.PI/2);
    /* ekor mengikuti fase langkah agar sinkron dengan kaki */
    for(let i=0;i<5;i++){
      P['t'+i+'y']=0.2*Math.sin(ph*0.5-i*0.55);
      P['t'+i+'x']=0.05*Math.sin(ph*0.3-i*0.4);
    }
  },
  poseRun(P,t,ph){
    const A=0.85,B=0.7;
    P.legLX=A*Math.sin(ph);P.legRX=A*Math.sin(ph+Math.PI);
    P.armRX=B*Math.sin(ph);P.armLX=B*Math.sin(ph+Math.PI);
    P.legLoX=0.3+0.65*Math.max(0,Math.sin(ph-0.9));
    P.legRoX=0.3+0.65*Math.max(0,Math.sin(ph+Math.PI-0.9));
    P.armLoX=0.2+0.5*Math.max(0,Math.sin(ph+Math.PI-0.8));
    P.armRoX=0.2+0.5*Math.max(0,Math.sin(ph-0.8));
    P.torsoY=0.1*Math.sin(2*ph+Math.PI/2);
    P.torsoPitch=0.16+0.03*Math.sin(2*ph);
    P.torsoRoll=0.07*Math.sin(ph);P.torsoYaw=0.08*Math.sin(ph+Math.PI/2);
    P.neckPitch=-0.13+0.04*Math.sin(2*ph+Math.PI);P.neckYaw=-0.05*Math.sin(ph);
    P.headPitch=0.07;P.headYaw=0.05*Math.sin(ph+Math.PI);P.jaw=0.1;
    const fl=0.12*Math.sin(2*ph+0.6);
    P.wingRZ=0.52+fl;P.wingLZ=-(0.52+fl);
    P.wingRY=0.42;P.wingLY=-0.42;P.wingRoZ=0.9;P.wingLoZ=-0.9;
    P.rootZ=0.12*Math.sin(ph-Math.PI/2);
    for(let i=0;i<5;i++){
      P['t'+i+'y']=0.12*Math.sin(ph*0.6-i*0.55)+0.06;
      P['t'+i+'x']=0.06+0.04*Math.sin(ph*0.4-i*0.4);
    }
  },
  poseClaw(P,t){
    const wind=this.sstep(0,0.26,t),strike=this.sstep(0.30,0.40,t),rec=this.sstep(0.55,0.95,t);
    P.armRX=this.lerp(this.lerp(this.lerp(0.08,2.05,wind),-1.35,strike),0.1,rec);
    P.armRZ=this.lerp(this.lerp(0.12,0.72,wind),0.2,strike);
    P.armRZ=this.lerp(P.armRZ,0.1,rec);
    P.armRoX=this.lerp(this.lerp(this.lerp(0.15,-1.15,wind),0.35,strike),0.12,rec);
    P.armLX=0.05-0.3*strike*(1-rec);P.armLZ=-0.12;
    const ty=-0.45*wind*(1-strike)+0.55*strike;
    P.torsoYaw=this.lerp(ty,0,rec);
    P.torsoPitch=this.lerp(0.05-0.08*wind+0.12*strike,0.05,rec);
    P.headYaw=clamp(-0.55*P.torsoYaw,-0.5,0.5);P.headPitch=0.06;
    P.neckYaw=-0.3*P.torsoYaw;
    P.jaw=0.08+0.3*strike*(1-rec*0.7);
    P.rootZ=0.5*Math.sin(clamp((t-0.30)/0.55,0,1)*Math.PI);
    P.rootY=-0.07*wind*(1-strike);
    P.legLX=-0.28*strike*(1-rec);P.legRX=0.32*strike*(1-rec);
    P.legLoX=0.35;P.legRoX=0.3;
    const flare=0.3*strike*(1-rec);
    P.wingLZ=-(0.95+flare*1.2);P.wingRZ=0.95+flare*0.4;
    for(let i=0;i<5;i++)P['t'+i+'y']=(-0.4*wind*(1-strike)+0.6*strike*(1-rec))*(1-0.14*i);
  },
  poseTail(P,t){
    const wind=this.sstep(0,0.25,t),act=this.sstep(0.25,0.45,t),rec=this.sstep(1.08,1.5,t);
    const spread=act*(1-rec),TAU=Math.PI*2,spinK=this.sstepI((t-0.25)/0.8);
    P.rootY=-0.3*wind*(1-rec);
    P.torsoPitch=0.12*wind*(1-rec)-0.05*spread;
    P.torsoRoll=0.05*Math.sin(t*9)*spread;
    P.headPitch=0.12*spread;P.jaw=0.3*spread;
    P.legLX=0.2*spread;P.legRX=0.2*spread;
    P.legLoX=0.18+0.7*spread;P.legRoX=0.18+0.7*spread;
    P.armLX=0.3*spread;P.armRX=0.3*spread;P.armLoX=0.8*spread;P.armRoX=0.8*spread;
    const wz=0.95*(1-spread)+(0.7+0.3*Math.sin(t*13))*spread;
    P.wingRZ=wz;P.wingLZ=-wz;
    P.wingRY=0.35*spread;P.wingLY=-0.35*spread;
    P.wingRoZ=1.15-0.3*spread;P.wingLoZ=-(1.15-0.3*spread);
    const coil=-0.55*wind*(1-act);
    for(let i=0;i<5;i++){
      P['t'+i+'y']=coil*(1-0.1*i)+0.14*Math.sin(spinK*TAU*1.5-i*0.8)*spread;
      P['t'+i+'x']=0.16*spread;
    }
  },
  /* TERBANG + SEMBURAN API (persis poseFly asli).
     lift 0-0.75 = lepas landas, b 1.25-2.95 = jendela sembur api,
     land 3.05-3.85 = mendarat. rootY naik sampai ~2.25. */
  poseFly(P,t){
    const lift=this.sstep(0,0.75,t),land=this.sstep(3.05,3.85,t),flight=lift*(1-land);
    const b=this.sstep(1.25,1.5,t)*(1-this.sstep(2.6,2.95,t));
    const TAU=Math.PI*2,wph=t*TAU*2.3,slow=1-0.55*this.sstep(2.7,3.5,t);
    P.rootY=flight*(2.25+0.16*Math.sin((t-0.75)*4.2));
    P.rootZ=(1-land)*1.0*Math.sin(clamp((t-0.5)/2.5,0,1)*Math.PI);
    P.torsoPitch=flight*(0.15+0.12*b);
    P.torsoRoll=flight*0.03*Math.sin(wph*0.5);
    const fz=0.95*(1-flight)+(0.3+0.85*Math.sin(wph)*slow)*flight;
    const fo=1.15*(1-flight)+(0.4+0.5*Math.sin(wph-0.8)*slow)*flight;
    const fy=0.22*(1-flight)+(0.12+0.12*Math.sin(wph-0.5))*flight;
    P.wingRZ=fz;P.wingLZ=-fz;P.wingRoZ=fo;P.wingLoZ=-fo;P.wingRY=fy;P.wingLY=-fy;
    P.legLX=0.5*flight;P.legRX=0.5*flight;P.legLoX=1.15*flight;P.legRoX=1.15*flight;
    P.armLX=0.35*flight;P.armRX=0.35*flight;P.armLoX=0.8*flight;P.armRoX=0.8*flight;
    P.neckPitch=-0.12*flight+0.2*b;
    P.headPitch=0.1*flight+0.3*b;
    P.headYaw=0.03*Math.sin(t*30)*b;
    P.jaw=0.04+0.58*b;
    for(let i=0;i<5;i++){
      P['t'+i+'x']=flight*(-0.05+0.03*Math.sin(t*3-i*0.5));
      P['t'+i+'y']=0.1*Math.sin(t*2-i*0.55);
    }
  },
  /* apakah naga sedang dalam jendela sembur api (untuk spawn partikel api) */
  flyFireActive(t){
    const b=this.sstep(1.25,1.5,t)*(1-this.sstep(2.6,2.95,t));
    return b>0.12?b:0;
  },

  /* =========================================================================
     SISTEM PARTIKEL API (semburan api saat terbang).
     Pool partikel api dibagi antar semua naga; di-update sekali per frame.
     ========================================================================= */
  FIRE_MAX:120,
  _fire:null,_fireMeshes:null,_fireLast:-1,
  fireInit(){
    if(this._fire)return;
    this._fire=[];this._fireMeshes=[];
    const scene=(typeof Game!=='undefined'&&Game.scene)?Game.scene:null;
    for(let i=0;i<this.FIRE_MAX;i++){
      this._fire.push({life:0,max:1,pos:new THREE.Vector3(),vel:new THREE.Vector3(),size:1});
      const m=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.3),
        new THREE.MeshBasicMaterial({color:0xff7a2e,transparent:true,opacity:0.95,
          blending:THREE.AdditiveBlending,depthWrite:false}));
      m.visible=false;
      if(scene)scene.add(m);
      this._fireMeshes.push(m);
    }
  },
  /* spawn partikel api dari mulut naga ke arah hadap */
  spawnFire(m){
    this.fireInit();
    let p=null;
    for(let i=0;i<this.FIRE_MAX;i++){
      if(this._fire[i].life<=0){p=this._fire[i];break;}
    }
    if(!p)return;
    /* posisi mulut: pakai anchor di kepala (parts.mouth) agar api keluar tepat
       di mulut, bukan di leher. Fallback manual bila anchor tak ada. */
    const mouth=new THREE.Vector3();
    const yaw=m.mesh.rotation.y;
    if(m.parts&&m.parts.mouth){
      m.parts.mouth.getWorldPosition(mouth);
    }else{
      mouth.set(m.pos.x+Math.sin(yaw)*2.4,
        m.pos.y+3.4+(m.drag&&m.drag.cur?m.drag.cur.rootY:0),
        m.pos.z+Math.cos(yaw)*2.4);
    }
    const dir=new THREE.Vector3(Math.sin(yaw),-0.5,Math.cos(yaw)).normalize();
    p.pos.copy(mouth).add(new THREE.Vector3((Math.random()-0.5)*0.2,(Math.random()-0.5)*0.2,(Math.random()-0.5)*0.2));
    p.vel.copy(dir).multiplyScalar(6+Math.random()*3)
       .add(new THREE.Vector3((Math.random()-0.5)*1.4,(Math.random()-0.5)*1.0,(Math.random()-0.5)*1.4));
    p.life=p.max=0.45+Math.random()*0.3;
    p.size=0.7+Math.random()*0.8;
  },
  /* update semua partikel api — dipanggil sekali per frame dari animate */
  updateFire(dt,now){
    if(!this._fire)return;
    if(this._fireLast===now)return;      // hanya sekali per frame
    this._fireLast=now;
    const ramp=[0xFFF6C8,0xFFC24D,0xFF7A2E,0xEF3E23,0x4A120B];
    for(let i=0;i<this.FIRE_MAX;i++){
      const p=this._fire[i],mesh=this._fireMeshes[i];
      if(p.life>0){
        p.life-=dt;
        p.vel.y-=2.2*dt;
        p.vel.multiplyScalar(Math.max(0,1-1.6*dt));
        p.pos.addScaledVector(p.vel,dt);
        if(p.pos.y<0.12){p.pos.y=0.12;p.vel.y*=-0.3;p.vel.x*=1.03;}
        const k=1-p.life/p.max;
        mesh.visible=true;
        mesh.position.copy(p.pos);
        mesh.scale.setScalar(p.size*(1-k*0.5));
        const ci=Math.min(4,Math.floor(k*5));
        mesh.material.color.setHex(ramp[ci]);
        mesh.material.opacity=Math.max(0,(1-k))*0.95;
      }else{
        mesh.visible=false;
      }
    }
  },
  sstepI(x){x=clamp(x,0,1);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;},

  /* petakan channel cur → rotasi rig (persis applyPose asli) */
  applyPose(m,cur){
    const P=m.parts;
    P.torso.position.y=this.TORSO_Y+cur.torsoY;
    P.torso.rotation.set(cur.torsoPitch,cur.torsoYaw,cur.torsoRoll);
    P.neck.rotation.x=this.NECK_BASE+cur.neckPitch;
    P.neck.rotation.y=cur.neckYaw;
    P.head.rotation.x=cur.headPitch;
    P.head.rotation.y=cur.headYaw;
    P.jaw.rotation.x=cur.jaw;
    P.wingL.sh.rotation.set(0,cur.wingLY,cur.wingLZ);P.wingL.el.rotation.z=cur.wingLoZ;
    P.wingR.sh.rotation.set(0,cur.wingRY,cur.wingRZ);P.wingR.el.rotation.z=cur.wingRoZ;
    P.armL.sh.rotation.set(cur.armLX,0,cur.armLZ);P.armL.el.rotation.x=cur.armLoX;
    P.armR.sh.rotation.set(cur.armRX,0,cur.armRZ);P.armR.el.rotation.x=cur.armRoX;
    P.legL.hip.rotation.x=cur.legLX;P.legL.kn.rotation.x=cur.legLoX;
    P.legR.hip.rotation.x=cur.legRX;P.legR.kn.rotation.x=cur.legRoX;
    for(let i=0;i<5;i++){
      P.tail[i].rotation.x=this.TAIL_BASE[i]+cur['t'+i+'x'];
      P.tail[i].rotation.y=cur['t'+i+'y'];
    }
    if(P.root){P.root.position.y=-0.05+cur.rootY;P.root.position.z=cur.rootZ;}
  },

  animate(m,dt){
    if(!m.drag)m.drag=this.dragState();
    const drag=m.drag;
    drag.stateT+=dt;

    /* flash merah saat terluka */
    const em=m.flash>0?0xaa2222:0x000000;
    m.mesh.traverse(o=>{if(o.material&&o.material.emissive)o.material.emissive.setHex(em);});

    /* tentukan state dari kondisi naga */
    const sp=Math.hypot(m.vel.x,m.vel.z);
    let state;
    if((m.clawT||0)>0)state='claw';
    else if((m.tailT||0)>0)state='tail';
    else if((m.flyT||0)>0)state='fly';
    /* lari: naga harus benar-benar terlihat lari saat mengejar (ambang
       sedikit diturunkan; burst kecepatan lari diberikan monsters.js) */
    else if(sp>2.9)state='run';
    else if(sp>0.4)state='walk';
    else state='idle';

    /* ---------- SINKRONISASI KECEPATAN LANGKAH ----------
       Fase langkah dimajukan sesuai JARAK yang benar-benar ditempuh
       (sp*dt / STRIDE), bukan waktu. Dengan begitu kaki naga selalu
       sinkron dengan kecepatan gerak: jalan lambat = langkah lambat,
       lari cepat = langkah cepat, tanpa kaki menggeser di tanah. */
    if(state==='walk'||state==='run'){
      const cyc=(sp*dt)/this.STRIDE;             // siklus penuh yang ditempuh
      m.gaitPh=(m.gaitPh||0)+cyc*Math.PI*2;
    }else if(state==='idle')m.gaitPh=m.gaitPh||0;

    /* ganti state → simpan pose saat ini sebagai titik awal blend */
    if(state!==drag.state){
      this.CH.forEach(c=>{drag.from[c]=drag.cur[c];});
      drag.blendT=0;drag.state=state;drag.stateT=0;
    }
    if((m.clawT||0)>0)m.clawT=Math.max(0,m.clawT-dt);
    if((m.tailT||0)>0)m.tailT=Math.max(0,m.tailT-dt);
    if((m.flyT||0)>0)m.flyT=Math.max(0,m.flyT-dt);

    /* setel pose target sesuai state */
    this.resetPose(drag.P);
    if(state==='idle')this.poseIdle(drag.P,drag.stateT);
    else if(state==='walk')this.poseWalk(drag.P,drag.stateT,m.gaitPh||0);
    else if(state==='run')this.poseRun(drag.P,drag.stateT,m.gaitPh||0);
    else if(state==='claw')this.poseClaw(drag.P,drag.stateT);
    else if(state==='tail')this.poseTail(drag.P,drag.stateT);
    else if(state==='fly'){
      this.poseFly(drag.P,drag.stateT);
      /* semburan api selama jendela terbang */
      const fb=this.flyFireActive(drag.stateT);
      if(fb>0){
        m._fireAcc=(m._fireAcc||0)+dt*(70+40*fb);
        while(m._fireAcc>=1){m._fireAcc-=1;this.spawnFire(m);}
      }
    }

    /* update partikel api sekali per frame (dibagi antar naga) */
    this.updateFire(dt,performance.now());

    /* blend halus from→cur lalu terapkan ke rig */
    drag.blendT+=dt;
    const k=this.sstep(0,0.22,drag.blendT);
    this.CH.forEach(c=>{drag.cur[c]=drag.from[c]+(drag.P[c]-drag.from[c])*k;});
    this.applyPose(m,drag.cur);
  },
};
window.Mob_Dragon=Mob_Dragon;
