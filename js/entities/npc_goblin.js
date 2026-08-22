'use strict';
/* =============================================================================
   ENTITAS NPC: GOBLIN EMAS / MINI GOBLIN (👺)
   -----------------------------------------------------------------------------
   File mandiri: MODEL 3D voxel (build) + ANIMASI penuh (animate: idle, jalan,
   lari, tusuk belati, pose skill) + COMBAT skill. Pengembara langka seperti
   Penyihir Elf / Raksasa Batu / Kelinci Cakar.

   Goblin hijau mungil berzirah emas lengkap (helm bertanduk, pelindung dada,
   pauldron, sepatu lapis emas) bersenjata belati emas.

   SKILL: BACKSTAB LEAP
   Melompat salto ke punggung monster target lalu menungganginya sambil
   menusuk 5× beruntun (total damage 5×). Selama ditunggangi, monster tidak
   bisa membalas (tak bisa menggigit punggungnya sendiri), lalu goblin
   melompat turun dengan salto belakang. Cooldown 12 detik.
   ============================================================================= */

const NPC_Goblin={

  /* ---------- timing skill (dipakai bersama oleh combat & animate) ----- */
  GB:{ant:0.22,fly:0.38,ride:0.86,hop:0.36,rec:0.14,cd:12,range:6.2},
  GB_HITS:[0.08,0.24,0.40,0.56,0.72],        // detik tusukan di dalam fase ride
  GB_DUR:0.22+0.38+0.86+0.36+0.14,

  gobState(){return{action:null,cd:0,gaitPhase:0};},

  /* ---------- MODEL 3D ----------
     Dipanggil NPCS.buildModel(role) -> {mesh,parts}. Tinggi total ±1.2 blok —
     sengaja mini dibanding NPC desa (±1.45) supaya terasa "mini goblin". */
  HIP:0.52,
  build(){
    const g=new THREE.Group();
    const box=(w,h,d,c)=>{
      const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
        new THREE.MeshLambertMaterial({color:c}));
      m.castShadow=!IS_MOBILE;return m;
    };
    const at=(m,x,y,z)=>{m.position.set(x,y,z);return m;};

    /* palet: kulit hijau 3 tingkat + emas 3 tingkat + kulit gelap/kain */
    const SKIN=0x4f9e3a,SKIN_D=0x3a7a2b,SKIN_L=0x6cbf52,
          BELLY=0x8fc97a,
          GOLD=0xd9a531,GOLD_D=0xa87d1f,GOLD_L=0xf0c04a,GOLD_H=0xffe9a0,
          LEATHER=0x5c3f24,LEATHER_D=0x3e2a17,
          IVORY=0xf3ecd8,EYE=0xffd94d,PUPIL=0x14181f,MOUTH=0x2a1f14;
    const HIP=this.HIP;
    const R={};

    /* --- badan (grup pinggul): perut hijau + zirah dada emas ---------- */
    const body=new THREE.Group();body.position.y=HIP;g.add(body);R.body=body;
    body.add(at(box(0.34,0.34,0.24,SKIN),0,0.17,0));            // perut
    body.add(at(box(0.20,0.12,0.02,BELLY),0,0.03,0.125));       // perut terang
    body.add(at(box(0.38,0.22,0.28,GOLD),0,0.27,0));            // pelindung dada
    body.add(at(box(0.30,0.10,0.06,GOLD_L),0,0.30,0.13));       // ukiran dada
    body.add(at(box(0.40,0.06,0.30,GOLD_D),0,0.165,0));         // trim bawah zirah
    body.add(at(box(0.30,0.20,0.05,GOLD_D),0,0.27,-0.135));     // pelat punggung
    body.add(at(box(0.38,0.07,0.27,LEATHER),0,0.045,0));        // sabuk kulit
    body.add(at(box(0.09,0.065,0.03,GOLD_L),0,0.045,0.14));     // gesper emas

    /* --- ekor kecil ----------------------------------------------------- */
    const tail=new THREE.Group();tail.position.set(0,0.02,-0.13);body.add(tail);
    const t1=box(0.07,0.07,0.16,SKIN_D);t1.rotation.x=-0.5;at(t1,0,0.02,-0.07);tail.add(t1);
    const t2=box(0.05,0.05,0.10,SKIN);t2.rotation.x=-0.9;at(t2,0,0.10,-0.14);tail.add(t2);
    R.tail=tail;

    /* --- kepala besar khas goblin: wajah, telinga panjang, helm emas ---- */
    const head=new THREE.Group();head.position.set(0,0.50,0);body.add(head);R.head=head;
    head.add(at(box(0.36,0.30,0.32,SKIN),0,0.15,0));            // tengkorak
    head.add(at(box(0.30,0.10,0.26,SKIN_D),0,-0.02,0.02));      // rahang
    const nose=box(0.08,0.07,0.13,SKIN_L);nose.rotation.x=-0.25;
    at(nose,0,0.10,0.21);head.add(nose);                        // hidung mancung
    for(const side of[1,-1]){                                   // mata kuning tajam
      head.add(at(box(0.09,0.08,0.03,EYE),0.09*side,0.19,0.165));
      head.add(at(box(0.035,0.06,0.02,PUPIL),0.09*side,0.19,0.18));
      const brow=box(0.11,0.03,0.03,SKIN_D);                    // alis marah
      brow.rotation.z=-0.28*side;at(brow,0.09*side,0.245,0.17);head.add(brow);
    }
    head.add(at(box(0.18,0.035,0.03,MOUTH),0,0.015,0.145));     // mulut menyeringai
    head.add(at(box(0.035,0.055,0.025,IVORY),0.06,0.045,0.15)); // taring
    head.add(at(box(0.035,0.055,0.025,IVORY),-0.06,0.045,0.15));
    /* helm emas: tempurung, pinggiran, pelindung hidung, tanduk kecil */
    head.add(at(box(0.40,0.14,0.36,GOLD),0,0.30,0));
    head.add(at(box(0.44,0.05,0.40,GOLD_D),0,0.235,0));
    head.add(at(box(0.06,0.12,0.04,GOLD),0,0.19,0.185));
    head.add(at(box(0.06,0.05,0.38,GOLD_L),0,0.375,0));
    for(const side of[1,-1]){
      const horn=box(0.06,0.12,0.06,GOLD_L);
      horn.rotation.z=-0.35*side;at(horn,0.15*side,0.41,0);head.add(horn);
      const tip=box(0.04,0.07,0.04,GOLD_H);
      tip.rotation.z=-0.35*side;at(tip,0.19*side,0.49,0);head.add(tip);
    }
    /* telinga panjang runcing menembus sisi helm */
    const mkEar=sx=>{
      const ear=new THREE.Group();ear.position.set(0.19*sx,0.15,0);
      const e1=box(0.24,0.11,0.045,SKIN);at(e1,0.11*sx,0,0);ear.add(e1);
      const e2=box(0.14,0.08,0.035,SKIN);e2.rotation.z=0.3*sx;
      at(e2,0.26*sx,0.05,0);ear.add(e2);
      const e3=box(0.16,0.05,0.02,SKIN_D);at(e3,0.12*sx,0.005,0.025);ear.add(e3);
      head.add(ear);return ear;
    };
    R.earL=mkEar(1);R.earR=mkEar(-1);

    /* --- lengan: pauldron emas + lengan hijau + tangan ------------------ */
    const mkArm=sx=>{
      const sh=new THREE.Group();sh.position.set(0.24*sx,0.36,0);body.add(sh);
      sh.add(at(box(0.17,0.10,0.18,GOLD),0,0.02,0));            // pauldron
      sh.add(at(box(0.19,0.045,0.20,GOLD_D),0,-0.025,0));       // trim pauldron
      sh.add(at(box(0.11,0.16,0.12,SKIN),0,-0.12,0));           // lengan atas
      sh.add(at(box(0.10,0.10,0.11,SKIN_L),0,-0.25,0));         // tangan
      return sh;
    };
    const shL=mkArm(1),shR=mkArm(-1);R.shL=shL;R.shR=shR;

    /* belati emas di tangan kanan: pivot grip di telapak, bilah menjulur -Y */
    const grip=new THREE.Group();grip.position.set(0,-0.30,0.03);shR.add(grip);
    grip.add(at(box(0.05,0.05,0.05,GOLD_D),0,0.05,0));          // pommel
    grip.add(at(box(0.045,0.12,0.045,LEATHER),0,-0.02,0));      // gagang
    grip.add(at(box(0.14,0.035,0.06,GOLD),0,-0.10,0));          // guard
    grip.add(at(box(0.055,0.34,0.02,GOLD_L),0,-0.29,0));        // bilah
    grip.add(at(box(0.035,0.10,0.016,GOLD_H),0,-0.48,0));       // ujung bilah
    R.grip=grip;

    /* --- kaki mini dengan sepatu lapis emas ------------------------------ */
    const mkLeg=sx=>{
      const hip=new THREE.Group();hip.position.set(0.10*sx,0,0);body.add(hip);
      hip.add(at(box(0.13,0.16,0.14,SKIN_D),0,-0.08,0));        // paha
      const knee=new THREE.Group();knee.position.y=-0.17;hip.add(knee);
      knee.add(at(box(0.115,0.15,0.12,SKIN),0,-0.07,0));        // betis
      knee.add(at(box(0.14,0.09,0.20,GOLD_D),0,-0.16,0.03));    // sepatu emas
      knee.add(at(box(0.12,0.06,0.08,GOLD),0,-0.17,0.13));      // ujung sepatu
      return{hip,knee};
    };
    const lL=mkLeg(1),lR=mkLeg(-1);
    R.hipL=lL.hip;R.kneeL=lL.knee;R.hipR=lR.hip;R.kneeR=lR.knee;

    /* kontrak NPCS: parts standar + rare.kind untuk dispatcher SkillsPort */
    const parts={body,head,armL:shL,armR:shR,
      legs:[lL.hip,lR.hip],bodyY:HIP,
      rare:{kind:'goblin',R}};
    return{mesh:g,parts};
  },

  /* ---------- helper posisi punggung mob -------------------------------
     Titik tunggang = sedikit di belakang pusat mob (arah hadap mesh) dan
     setinggi ±72% tinggi modelnya. Boss (skala 1.75) ikut diperhitungkan. */
  backPoint(m){
    const ry=m.mesh.rotation.y;
    const fx=Math.sin(ry),fz=Math.cos(ry);
    const back=m.r*0.7+0.12;
    const h=meshHeight(m.type)*(m.boss?1.75:1)*0.72+0.05;
    return new THREE.Vector3(m.pos.x-fx*back,m.pos.y+h,m.pos.z-fz*back);
  },

  /* =========================================================================
     COMBAT — dipanggil SkillsPort.combat dari NPCS.aiFight.
     Mengembalikan true selama skill berjalan (aiFight bawaan dilewati,
     termasuk balasan monster). Mengembalikan false agar serangan belati
     biasa tetap ditangani aiFight.
     ========================================================================= */
  combat(n,dt){
    const gb=n.gob||(n.gob=this.gobState());
    const GB=this.GB;
    const m=n.target;
    const A=gb.action;

    if(A){
      A.t+=dt;
      const T=A.t;
      const tRide=GB.ant+GB.fly,tHop=tRide+GB.ride,tEnd=tHop+GB.hop;
      n.vel.set(0,0,0);                       // posisi diatur manual di sini

      /* target lenyap/tumbang di tengah skill → berhenti & jatuh bebas */
      if(!m||m.dead){gb.action=null;n.gobRide=null;return true;}
      /* pengaman: jangan terseret lintas peta bila target terpental jauh */
      if(m.pos.distanceTo(n.pos)>24){gb.action=null;n.gobRide=null;return true;}

      const bp=this.backPoint(m);
      if(T<GB.ant){
        /* ancang-ancang jongkok: hadap target, kaki menyiapkan lompatan */
        n.mesh.rotation.y=angLerp(n.mesh.rotation.y,
          Math.atan2(m.pos.x-n.pos.x,m.pos.z-n.pos.z),dt*10);
      }else if(T<tRide){
        /* terbang salto: lerpar startPos → punggung mob + busur parabola */
        const u=(T-GB.ant)/GB.fly,eu=1-(1-u)*(1-u);
        n.pos.lerpVectors(A.startPos,bp,eu);
        n.pos.y+=Math.sin(Math.PI*u)*A.arc;
        n.mesh.rotation.y=angLerp(n.mesh.rotation.y,
          Math.atan2(m.pos.x-n.pos.x,m.pos.z-n.pos.z),dt*8);
      }else if(T<tHop){
        /* menunggang: menempel di punggung, tusuk 5× bergantian kiri-kanan */
        n.pos.copy(bp);
        n.gobRide=m;                          // mobs.js: jangan serang penunggang
        n.mesh.rotation.y=m.mesh.rotation.y;
        const tr=T-tRide;
        for(let i=A.lastHit+1;i<5;i++){
          if(tr<this.GB_HITS[i])break;
          A.lastHit=i;
          const wasDead=m.dead;
          Monsters.hurt(m,npcDmgSafe(n),new THREE.Vector3(0,-0.5,0),1,n);
          PortFX.spark(m.pos.x,bp.y+0.25,m.pos.z,5,0xffd24d,5);
          Sfx.at(m.pos,'hit');
          if(!wasDead&&m.dead&&NPCS.isTeam(n))
            NPCS.gainXp(n,CFG.NPC.XP_PER_KILL);
        }
      }else if(T<tEnd){
        /* lompat turun: salto belakang ke titik di belakang mob */
        if(!A.hopFrom){
          A.hopFrom=n.pos.clone();
          A.hopYaw=m.mesh.rotation.y;
          A.hopTo=new THREE.Vector3(
            A.hopFrom.x-Math.sin(A.hopYaw)*1.9,
            A.hopFrom.y,
            A.hopFrom.z-Math.cos(A.hopYaw)*1.9);
          n.gobRide=null;
          FX.debris(A.hopFrom.clone(),0xffd24d,6,2);
        }
        const u=(T-tHop)/GB.hop;
        n.pos.lerpVectors(A.hopFrom,A.hopTo,u);
        n.pos.y+=Math.sin(Math.PI*u)*0.85;
        n.mesh.rotation.y=A.hopYaw;
      }else if(T<this.GB_DUR){
        /* mendarat: jongkok menahan benturan */
        if(!A.landed){
          A.landed=true;
          Sfx.at(n.pos,'land');
          FX.debris(n.pos.clone().add(new THREE.Vector3(0,0.2,0)),0x8a8f98,4,1.4);
        }
      }else{
        gb.action=null;n.gobRide=null;
        n.atkCd=CFG.NPC.ATK_CD*0.7;
      }
      return true;
    }

    /* ---------- picu BACKSTAB LEAP ---------- */
    if(!m||m.dead)return false;
    const d=m.pos.distanceTo(n.pos);
    if(gb.cd<=0&&d<GB.range&&d>0.8){
      gb.action={name:'leap',t:0,lastHit:-1,startPos:n.pos.clone(),
        arc:clamp(0.9+d*0.22,1.0,2.6)};
      gb.cd=GB.cd;
      NPCS.say(n,'BACKSTAB LEAP!',1.6);
      UI.toast(`👺 ${n.name}: Backstab Leap!`);
      FX.ring(n.pos.x,n.pos.y+0.1,n.pos.z,0xffd24d,0.5,2);
      Sfx.at(n.pos,'dash');
      return true;
    }
    return false;                             // tusukan biasa lewat aiFight
  },

  /* visual tusukan belati saat serangan biasa mengenai (lewat aiFight) */
  onMeleeHit(n){
    if(!n.target)return;
    PortFX.spark(n.target.pos.x,n.target.pos.y+0.9,n.target.pos.z,
      3,0xf0c04a,4);
  },

  /* =========================================================================
     ANIMASI — dipanggil NPCS.animate tiap frame.
     Fase: idle / jalan / lari / tusuk (n.swing) / timeline skill (gb.action).
     ========================================================================= */
  animate(n,dt){
    const gb=n.gob||(n.gob=this.gobState());
    gb.cd=Math.max(0,gb.cd-dt);
    const R=n.parts.rare&&n.parts.rare.R;
    if(!R)return;
    const HIP=this.HIP;
    const t=performance.now()*0.001;

    /* flash merah saat terluka */
    const em=n.flash>0?0xaa2222:0x000000;
    n.mesh.traverse(o=>{if(o.material&&o.material.emissive)
      o.material.emissive.setHex(em);});

    /* mundur paksa (HP kritis) membatalkan skill yang sedang berjalan */
    if(gb.action&&n.retreat){gb.action=null;n.gobRide=null;}

    /* BUGFIX animasi macet: gb.action.t HANYA bertambah di combat(), dan
       combat() hanya dipanggil aiFight selama n.target ada. Bila target
       mati/hilang DI TENGAH skill (sering: goblin sendiri yang membunuhnya
       saat tusukan beruntun), ai() meng-null-kan target sebelum aiFight →
       combat() tak dipanggil → timer beku → goblin macet di pose skill sambil
       tetap berjalan. Safeguard: teruskan timeline di sini sampai selesai lalu
       clear, sehingga pose kembali ke locomotion normal (mirip elf & lion). */
    if(gb.action&&(!n.target||n.target.dead)){
      n.gobRide=null;                        // mob tunggangan sudah tak ada
      gb.action.t+=dt;
      if(gb.action.t>=this.GB_DUR){
        gb.action=null;
        n.atkCd=CFG.NPC.ATK_CD*0.7;
      }
    }

    /* --- reset pose dasar --- */
    R.body.position.set(0,HIP,0);R.body.rotation.set(0,0,0);
    R.head.rotation.set(0,0,0);
    R.shL.rotation.set(0.08,0,0.12);R.shR.rotation.set(0.08,0,-0.12);
    R.hipL.rotation.set(0,0,0);R.hipR.rotation.set(0,0,0);
    R.kneeL.rotation.x=0;R.kneeR.rotation.x=0;
    R.earL.rotation.set(0,0,0);R.earR.rotation.set(0,0,0);
    R.tail.rotation.set(0,0,0);
    R.grip.rotation.set(0.15,0,0);

    const A=gb.action;
    if(A){
      this.skillPose(n,R,A,dt);
      return;
    }

    /* --- tusukan belati serangan biasa (n.swing diisi aiFight) --- */
    if(n.swing>0){
      const sw=PE.out(1-n.swing/0.25);
      R.shR.rotation.x=lerp(0.5,-1.6,sw);
      R.shR.rotation.y=lerp(-0.3,0,sw);
      R.shL.rotation.x=lerp(0.1,0.5,sw);
      R.body.rotation.x=0.22*Math.sin(Math.PI*sw);
      R.body.position.y=HIP-0.03*Math.sin(Math.PI*sw);
      R.hipL.rotation.x=-0.25*sw;R.hipR.rotation.x=0.3*sw;
      R.head.rotation.x=0.1*sw;
      R.earL.rotation.x=-0.3*sw;R.earR.rotation.x=-0.3*sw;
      return;
    }

    /* --- gerak dasar: idle / jalan / lari --- */
    const sp=Math.hypot(n.vel.x,n.vel.z);
    if(sp<0.4){
      const b=Math.sin(t*2.4);
      R.body.position.y=HIP+b*0.012;
      R.body.rotation.x=0.02+b*0.02;
      R.head.rotation.y=Math.sin(t*0.7)*0.3;
      R.head.rotation.x=Math.sin(t*1.1)*0.05;
      R.earL.rotation.x=Math.sin(t*3.1)*0.08;
      R.earR.rotation.x=Math.sin(t*3.4+1)*0.08;
      /* kedutan telinga sesekali */
      if(Math.sin(t*0.9)>0.97){R.earL.rotation.x=-0.4;R.earR.rotation.x=0.15;}
      R.tail.rotation.y=Math.sin(t*2.2)*0.3;
      R.shL.rotation.x=0.08+b*0.03;R.shR.rotation.x=0.08-b*0.03;
    }else{
      const run=sp>3.4,f=run?3.2:2.1;
      gb.gaitPhase+=dt*f*Math.PI*2;
      const p=gb.gaitPhase,s=Math.sin(p);
      const aH=run?1.05:0.6,aK=run?1.5:0.9,aA=run?0.9:0.5;
      R.hipL.rotation.x=s*aH;R.hipR.rotation.x=-s*aH;
      R.kneeL.rotation.x=Math.max(0,Math.sin(p+2.0))*aK;
      R.kneeR.rotation.x=Math.max(0,Math.sin(p+Math.PI+2.0))*aK;
      R.shL.rotation.x=-(-s)*aA;                    // ayunan lengan berlawanan
      R.shR.rotation.x=-s*aA*0.8-(run?0.35:0.08);   // tangan belati menggenggam
      R.body.position.y=HIP+Math.abs(Math.cos(p))*(run?0.06:0.03);
      R.body.rotation.x=run?0.28:0.10;              // condong ke depan
      R.body.rotation.z=Math.sin(p)*(run?0.05:0.02);
      R.head.rotation.x=-(run?0.14:0.05);
      R.earL.rotation.x=run?-0.45:-0.1;             // telinga tersapu angin
      R.earR.rotation.x=run?-0.45:-0.1;
      R.tail.rotation.y=s*(run?0.5:0.3);
    }
  },

  /* ---------- pose timeline skill BACKSTAB LEAP ------------------------
     Fase dihitung dari A.t memakai konstanta GB yang sama dengan combat. */
  skillPose(n,R,A,dt){
    const GB=this.GB,HIP=this.HIP;
    const T=A.t;
    const tRide=GB.ant+GB.fly,tHop=tRide+GB.ride,tEnd=tHop+GB.hop;

    if(T<GB.ant){
      /* jongkok ancang-ancang: pegas kaki, lengan ditarik ke belakang */
      const e=PE.out(T/GB.ant);
      R.body.position.y=HIP-0.20*e;
      R.body.rotation.x=0.45*e;
      R.hipL.rotation.x=-0.9*e;R.hipR.rotation.x=-0.75*e;
      R.kneeL.rotation.x=1.5*e;R.kneeR.rotation.x=1.4*e;
      R.shL.rotation.x=0.75*e;R.shR.rotation.x=0.7*e;
      R.shL.rotation.z=0.3*e;R.shR.rotation.z=-0.3*e;
      R.head.rotation.x=-0.3*e;                     // menatap target
      R.earL.rotation.x=-0.6*e;R.earR.rotation.x=-0.6*e;
      R.tail.rotation.x=-0.4*e;
    }else if(T<tRide){
      /* salto depan satu putaran penuh di udara; kaki & tangan terlipat */
      const u=(T-GB.ant)/GB.fly;
      R.body.rotation.x=-u*Math.PI*2;
      R.body.position.y=HIP+0.06;
      R.hipL.rotation.x=-1.1;R.hipR.rotation.x=-1.1;
      R.kneeL.rotation.x=1.6;R.kneeR.rotation.x=1.6;
      R.shL.rotation.x=-2.3;R.shR.rotation.x=-2.3;  // lengan merangkul lutut
      R.shL.rotation.z=0.4;R.shR.rotation.z=-0.4;
      R.head.rotation.x=0.35;                       // dagu menempel dada
      R.earL.rotation.x=-0.9;R.earR.rotation.x=-0.9;
      R.tail.rotation.x=-0.7;
    }else if(T<tHop){
      /* menunggang: duduk mengangkang, tusuk bergantian kiri-kanan */
      const tr=T-tRide;
      let pi=-1;
      for(let i=0;i<5;i++)if(tr>=this.GB_HITS[i])pi=i;
      const local=pi>=0?clamp((tr-this.GB_HITS[pi])/0.16,0,1):0;
      const pulse=PE.bell(local);
      const side=pi%2===0?1:-1;                     // 1 = tangan kanan
      R.body.position.y=HIP-0.10+Math.abs(Math.sin(tr*18))*0.025;
      R.body.rotation.x=0.30;
      R.hipL.rotation.x=-1.0;R.hipR.rotation.x=-1.0; // mengangkang punggung
      R.hipL.rotation.z=0.2;R.hipR.rotation.z=-0.2;
      R.kneeL.rotation.x=1.3;R.kneeR.rotation.x=1.3;
      const shS=side>0?R.shR:R.shL,shO=side>0?R.shL:R.shR;
      shS.rotation.x=-1.9+1.5*pulse;                 // angkat → hentak tusuk
      shS.rotation.z=(side>0?-0.15:0.15)*pulse;
      shO.rotation.x=-0.7;                           // tangan kiri mencengkeram
      R.head.rotation.x=0.35;                        // menunduk ke punggung
      R.earL.rotation.x=Math.sin(tr*20)*0.15;
      R.earR.rotation.x=Math.sin(tr*20+1)*0.15;
      R.tail.rotation.y=Math.sin(tr*16)*0.5;         // ekor senang
      R.grip.rotation.x=0.15-0.5*pulse*(side>0?1:0);
    }else if(T<tEnd){
      /* salto belakang turun dari punggung */
      const u=(T-tHop)/GB.hop;
      R.body.rotation.x=u*Math.PI*2;
      R.body.position.y=HIP+0.05;
      R.hipL.rotation.x=-0.6;R.hipR.rotation.x=-0.6;
      R.kneeL.rotation.x=0.9;R.kneeR.rotation.x=0.9;
      R.shL.rotation.set(-0.5,0,1.2);R.shR.rotation.set(-0.5,0,-1.2);
      R.head.rotation.x=0.2;
      R.earL.rotation.x=-0.7;R.earR.rotation.x=-0.7;
      R.tail.rotation.x=-0.5;
    }else{
      /* mendarat: jongkok menyerap benturan lalu berdiri */
      const e=PE.out(clamp((T-tEnd)/GB.rec,0,1));
      R.body.position.y=HIP-0.16*(1-e);
      R.body.rotation.x=0.3*(1-e);
      R.hipL.rotation.x=-0.8*(1-e);R.hipR.rotation.x=-0.8*(1-e);
      R.kneeL.rotation.x=1.4*(1-e);R.kneeR.rotation.x=1.4*(1-e);
      R.shL.rotation.x=0.4*(1-e);R.shR.rotation.x=0.4*(1-e);
      R.shL.rotation.z=0.25*(1-e);R.shR.rotation.z=-0.25*(1-e);
      R.head.rotation.x=-0.15*(1-e);
      R.earL.rotation.x=-0.3*(1-e);R.earR.rotation.x=-0.3*(1-e);
    }
  },
};
window.NPC_Goblin=NPC_Goblin;
