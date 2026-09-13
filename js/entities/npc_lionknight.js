'use strict';
/* =============================================================================
   ENTITAS NPC: MANUSIA SINGA / LION KNIGHT (🦁)
   -----------------------------------------------------------------------------
   File mandiri: MODEL 3D voxel (build) + ANIMASI lengkap (animate: jalan,
   ayunan pedang, ekor bergoyang). Ksatria beast-kin berzirah emas. Model &
   animasi sama persis in-game (dulu NPCS.makeLionMesh di js/npc.js).
   ============================================================================= */

const NPC_Lionknight={

  /* ---------- MODEL 3D ---------- */
  build(){
    const box=(w,h,d,c)=>{
      const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
        new THREE.MeshLambertMaterial({color:c}));
      m.castShadow=!IS_MOBILE;return m;
    };
    const at=(m,x,y,z)=>{m.position.set(x,y,z);return m;};
    const glow=(w,h,d,c)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
      new THREE.MeshBasicMaterial({color:c}));
    const FUR=0xC8912F,FUR_L=0xE3B45A,FUR_D=0x9A6B1E,BELLY=0xE8C56A,
          MANE=0xA85C1A,MANE_D=0x7A3E10,
          GOLD=0xFFD700,GOLD_D=0xB8860B,GOLD_H=0xFFF0A8,
          STEEL=0xD9DDE2,STEEL_D=0xAAB2BC,
          LEATHER=0x4A3116,RED=0x9E1B1B,EYE=0xFFC400,
          NOSE=0x2A1A10,CLAW=0xF2EAD8,GRIP=0x5C3317;
    const g=new THREE.Group();
    const BODY_Y=0.72;

    /* --- KAKI: beast-kin digitigrade, pivot pinggul terpisah supaya
           bisa mengayun saat berjalan --- */
    const legs=[];
    for(const side of[1,-1]){
      const lg=new THREE.Group();lg.position.set(0.19*side,BODY_Y,0);
      lg.add(at(box(0.22,0.22,0.26,FUR),0,-0.1,0));            // paha
      lg.add(at(box(0.2,0.1,0.24,GOLD_D),0,-0.23,0));          // gelang emas
      lg.add(at(box(0.17,0.3,0.2,FUR_D),0,-0.42,-0.02));       // tulang kering
      lg.add(at(box(0.2,0.12,0.3,FUR),0,-0.62,0.04));          // telapak
      lg.add(at(box(0.22,0.06,0.34,FUR_L),0,-0.68,0.1));       // jari maju
      if(CFG.NPC.LION_DETAIL){
        for(const cx of[-0.07,0,0.07])
          lg.add(at(box(0.045,0.05,0.07,CLAW),cx,-0.69,0.28)); // cakar kaki
      }
      g.add(lg);legs.push(lg);
    }

    /* --- BADAN: torso fur + zirah emas + jubah merah --- */
    const body=box(0.62,0.56,0.4,FUR);body.position.y=BODY_Y+0.28;g.add(body);
    body.add(at(box(0.5,0.3,0.06,BELLY),0,-0.08,0.19));        // dada terang
    body.add(at(box(0.66,0.34,0.44,GOLD),0,0.06,0));           // zirah emas
    body.add(at(box(0.54,0.22,0.46,GOLD_H),0,0.12,0));         // highlight zirah
    body.add(at(box(0.2,0.18,0.06,GOLD_D),0,0.06,0.21));       // emblem singa
    body.add(at(box(0.64,0.08,0.42,LEATHER),0,-0.22,0));       // sabuk kulit
    body.add(at(box(0.12,0.1,0.44,GOLD),0,-0.22,0));           // gesper emas
    body.add(at(box(0.58,0.16,0.44,LEATHER),0,-0.36,0));       // rok zirah
    body.add(at(box(0.5,0.1,0.46,GOLD_D),0,-0.44,0));          // trim rok
    body.add(at(box(0.46,0.5,0.06,RED),0,-0.05,-0.22));        // jubah merah

    /* --- LENGAN + PAULDRON EMAS --- */
    const mkArm=(side)=>{
      const arm=new THREE.Group();arm.position.set(0.42*side,BODY_Y+0.5,0);
      arm.add(at(box(0.26,0.16,0.28,GOLD),0,0.02,0));          // pauldron
      arm.add(at(box(0.2,0.08,0.22,GOLD_H),0,0.08,0));         // highlight
      arm.add(at(box(0.18,0.24,0.2,FUR),0,-0.16,0));           // lengan atas
      arm.add(at(box(0.17,0.2,0.19,FUR_D),0,-0.36,0));         // lengan bawah
      arm.add(at(box(0.18,0.12,0.2,STEEL_D),0,-0.44,0));       // bracer baja
      arm.add(at(box(0.17,0.14,0.19,FUR_L),0,-0.56,0));        // kepalan
      if(CFG.NPC.LION_DETAIL){
        for(const cz of[-0.05,0.05])
          arm.add(at(box(0.04,0.06,0.05,CLAW),0,-0.64,cz));    // cakar tangan
      }
      g.add(arm);return arm;
    };
    const armL=mkArm(1),armR=mkArm(-1);

    /* --- PEDANG PUSAKA di tangan kanan (pivot grip di kepalan, bilah
           memanjang ke -Y lokal sehingga ayunan armR presisi) --- */
    const grip=new THREE.Group();grip.position.set(0,-0.58,0.06);armR.add(grip);
    grip.add(at(box(0.07,0.16,0.07,GRIP),0,0.02,0));
    grip.add(at(box(0.09,0.06,0.09,GOLD),0,0.12,0));
    grip.add(at(box(0.3,0.06,0.1,GOLD),0,-0.1,0));             // guard
    grip.add(at(box(0.08,0.08,0.08,GOLD_D),0,-0.1,0));
    const bladeL=new THREE.Group();bladeL.position.set(0,-0.14,0);grip.add(bladeL);
    bladeL.add(at(box(0.11,0.5,0.045,STEEL_D),0,-0.25,0));
    bladeL.add(at(box(0.07,0.56,0.035,STEEL),0,-0.28,0));
    bladeL.add(at(box(0.016,0.5,0.05,0xFFFFFF),0,-0.25,0));    // garis tengah
    bladeL.add(at(box(0.08,0.07,0.035,STEEL),0,-0.58,0));      // ujung
    grip.rotation.x=-0.15;

    /* --- KEPALA SINGA: moncong, mata menyala, surai berlapis --- */
    const head=new THREE.Group();head.position.set(0,BODY_Y+0.62,0);g.add(head);
    head.add(at(box(0.16,0.14,0.14,FUR),0,-0.02,0));           // leher
    head.add(at(box(0.4,0.36,0.38,FUR),0,0.22,0));             // tengkorak
    head.add(at(box(0.26,0.2,0.22,FUR_L),0,0.12,0.26));        // moncong
    head.add(at(box(0.12,0.07,0.06,NOSE),0,0.2,0.38));         // hidung
    /* rahang bawah berpivot di belakang mulut: membuka lebar saat
       AUMAN SINGA (animasi di animate() → roarPose) */
    const jaw=new THREE.Group();jaw.position.set(0,0.06,0.10);head.add(jaw);
    jaw.add(at(box(0.22,0.08,0.20,FUR_D),0,-0.02,0.13));
    if(CFG.NPC.LION_DETAIL){
      jaw.add(at(box(0.04,0.07,0.03,CLAW),0.07,0.03,0.21));    // taring bawah
      jaw.add(at(box(0.04,0.07,0.03,CLAW),-0.07,0.03,0.21));
    }
    for(const side of[1,-1]){                                  // mata menyala
      const e=glow(0.07,0.06,0.03,EYE);
      e.position.set(0.11*side,0.28,0.19);head.add(e);
    }
    for(const side of[1,-1]){                                  // telinga
      head.add(at(box(0.1,0.12,0.08,FUR),0.15*side,0.44,-0.02));
      if(CFG.NPC.LION_DETAIL)
        head.add(at(box(0.05,0.07,0.04,MANE),0.15*side,0.44,0.01));
    }
    /* surai berlapis mengelilingi kepala — siluet khas singa */
    head.add(at(box(0.56,0.44,0.2,MANE),0,0.2,-0.16));
    head.add(at(box(0.52,0.5,0.16,MANE_D),0,0.14,-0.24));
    head.add(at(box(0.6,0.16,0.4,MANE),0,0.42,-0.02));
    head.add(at(box(0.6,0.14,0.36,MANE_D),0,0.02,-0.04));
    head.add(at(box(0.5,0.3,0.16,MANE),0,-0.02,0.12));         // surai dagu
    for(const side of[1,-1])
      head.add(at(box(0.14,0.4,0.3,MANE),0.26*side,0.18,0.04));
    /* helm emas terbuka + puncak merah */
    head.add(at(box(0.44,0.12,0.42,GOLD),0,0.44,0));
    head.add(at(box(0.3,0.1,0.3,GOLD_H),0,0.5,0));
    head.add(at(box(0.08,0.16,0.24,RED),0,0.58,0));
    if(CFG.NPC.LION_DETAIL){
      head.add(at(box(0.05,0.1,0.05,GOLD_D),0.18,0.48,0.16));
      head.add(at(box(0.05,0.1,0.05,GOLD_D),-0.18,0.48,0.16));
    }

    /* --- EKOR: grup terpisah agar bisa bergoyang di animate() --- */
    const tail=new THREE.Group();tail.position.set(0,BODY_Y+0.05,-0.22);g.add(tail);
    tail.add(at(box(0.08,0.1,0.24,FUR),0,-0.02,-0.1));
    tail.add(at(box(0.07,0.09,0.22,FUR_D),0,-0.1,-0.28));
    tail.add(at(box(0.06,0.08,0.2,FUR),0,-0.16,-0.44));
    tail.add(at(box(0.12,0.14,0.12,MANE_D),0,-0.2,-0.56));     // ujung surai
    tail.rotation.x=-0.5;

    /* parts: kontrak SAMA dengan makeMesh() → animasi generik langsung jalan.
       `rare.kind='lion'` dibaca SkillsPort._ent (js/ports.js) agar skill
       AUMAN SINGA di combat() terpanggil dari NPCS.aiFight. */
    return {mesh:g,parts:{body,head,armL,armR,legs,tail,jaw,bodyY:BODY_Y+0.28,
      rare:{kind:'lion'}}};
  },

  /* =========================================================================
     AUMAN SINGA — skill aktif (cooldown 14 dtk)
     -------------------------------------------------------------------------
     Raungan 360° dua gelombang berpusat pada Manusia Singa:
       gelombang 1 (R1) : damage 1.3× + dorongan kuat keluar
       gelombang 2 (R2) : damage 0.7× + dorongan susulan (gema raungan)
     Syarat picu: ≥2 monster dalam radius 7 blok (sang singa memang bertugas
     memancing mereka mendekat lewat skill pasif Cakar Singa).

     BALANCE dibanding NPC langka lain (dmg = npcDmgSafe, sudah termasuk
     pasif +20% Cakar Singa):
       Kelinci Cakar  RAPID CLAW    5×0.7 = 3.5×  single-target  CD 12
       Goblin Emas    BACKSTAB LEAP 5×1.0 = 5×    single-target  CD 12
       Raksasa Batu   EARTHQUAKE    3 slam×1.4    area depan     CD 14
       Penyihir Elf   Es/Meteor     0.9× tick / 1.5× meteor      CD 10/16
       Manusia Singa  AUMAN SINGA   1.3×+0.7× = 2×/monster, 360° CD 14
     Per target totalnya paling hemat — adil, karena melee biasa singa sudah
     yang terkuat (dmg dasar 26 + pasif) dan ia tank ber-threat tinggi.
     ========================================================================= */
  LK:{wind:0.55,mid:0.45,rec:0.60,cd:14,range:7,R1:4.5,R2:6.0,m1:1.3,m2:0.7},
  LK_DUR:0.55+0.45+0.60,

  /* ---------- COMBAT ----------
     Dipanggil SkillsPort.combat dari NPCS.aiFight. Mengembalikan true selama
     AUMAN SINGA berjalan (aiFight bawaan dilewati); false agar serangan pedang
     biasa + gerak mendekat tetap ditangani aiFight. */
  combat(n,dt){
    const lk=n.lion||(n.lion={roarCd:0});
    const R=n.roar;
    if(R){
      n.vel.x*=0.65;n.vel.z*=0.65;            // berdiri tegak saat meraung
      /* timeline R.t dijalankan animate() supaya tetap maju walau target
         hilang; di sini hanya eksekusi damage gelombangnya sekali. */
      if(!R.w1&&R.t>=this.LK.wind){
        R.w1=true;
        this.roarWave(n,this.LK.R1,this.LK.m1,8);
        this.roarFx(n,1);
      }
      if(!R.w2&&R.t>=this.LK.wind+this.LK.mid){
        R.w2=true;
        this.roarWave(n,this.LK.R2,this.LK.m2,5);
        this.roarFx(n,2);
      }
      return true;
    }
    if(!n.target||n.target.dead)return false;
    /* picu: cooldown siap & singa sedang dikerubuti & butuh stamina (35) */
    const roarCost=(typeof NPCS!=='undefined'&&NPCS.skillStamCost)?NPCS.skillStamCost(n,35):Math.max(46,Math.round((n.maxStamina||100)*0.30));
    if(lk.roarCd<=0&&this.countNear(n,this.LK.range)>=2&&((n.stamina||0)>=roarCost)){
      n.stamina=(n.stamina||0)-roarCost; n.stamRegenT=1.8;
      n.roar={t:0,w1:false,w2:false};
      lk.roarCd=this.LK.cd;
      NPCS.say(n,'AUMAN SINGA!',1.8);
      UI.toast(`🦁 ${n.name}: AUMAN SINGA!`);
      FX.ring(n.pos.x,n.pos.y+0.15,n.pos.z,0xffd24d,0.5,1.6);
      FX.text(n.pos.clone().add(new THREE.Vector3(0,2,0)),`-${roarCost} STAM`,'#ffd24d');
      PortFX.spark(n.pos.x,n.pos.y+1.2,n.pos.z,6,0xfff0a8,3);
      return true;
    }
    return false;
  },

  /* damage satu gelombang raungan ke semua monster dalam radius */
  roarWave(n,r,mult,knock){
    const dmg=npcDmgSafe(n)*mult;
    for(const m of Monsters.list){
      if(m.dead)continue;
      const dx=m.pos.x-n.pos.x,dz=m.pos.z-n.pos.z;
      if(dx*dx+dz*dz>r*r)continue;
      const d=Math.hypot(dx,dz)||0.001;
      /* arah dorongan = menjauhi singa, sedikit terangkat */
      Monsters.hurt(m,dmg,new THREE.Vector3(dx/d,0.3,dz/d),knock,n);
      /* XP kill diurus Monsters.shareKillXp() — seluruh tim + pet dapat XP
         penuh. Grant ganda lama di sini dihapus. */
    }
  },

  /* ---------- EFEK DINAMIS raungan ----------
     wave 1 = ledakan cincin emas + getar layar + partikel; wave 2 = gema
     cincin lebih besar & tipis. Suara roar() baru di js/audio.js. */
  roarFx(n,wave){
    if(wave===1){
      FX.ring(n.pos.x,n.pos.y+0.2,n.pos.z,0xffd24d,1.4,8);
      FX.ring(n.pos.x,n.pos.y+0.1,n.pos.z,0xfff3c4,0.7,4.5);
      /* gelombang tanah sekali, menjalar dari posisi singa */
      if(typeof FX.groundWave==='function')FX.groundWave(n.pos.x,n.pos.y,n.pos.z,{mode:'radial',radius:5.2,color:0xffd24d});
      PortFX.spark(n.pos.x,n.pos.y+1.4,n.pos.z,16,0xffd24d,11);
      FX.debris(n.pos.clone().add(new THREE.Vector3(0,1.5,0)),0xE3B45A,14,4.5);
      FX.text(n.pos.clone().add(new THREE.Vector3(0,2.6,0)),'AUM!!','#ffd24d');
      FX.addShake(0.6);
      Sfx.at(n.pos,'roar');
    }else{
      FX.ring(n.pos.x,n.pos.y+0.15,n.pos.z,0xE3B45A,1.8,5);
      PortFX.spark(n.pos.x,n.pos.y+1.2,n.pos.z,8,0xffe9a0,7);
    }
  },

  /* jumlah monster hidup dalam radius (syarat picu raungan) */
  countNear(n,r){
    let c=0;
    for(const m of Monsters.list)
      if(!m.dead&&m.pos.distanceTo(n.pos)<r)c++;
    return c;
  },

  /* visual ayunan pedang biasa (damage tetap dari aiFight — balance utuh):
     slash arc emas bergilir arah, tiap pukulan ke-3 "berat" (cincin + getar) */
  onMeleeHit(n){
    n._hitIdx=(n._hitIdx||0)+1;
    const heavy=n._hitIdx%3===0;
    const a=n.mesh.rotation.y;
    const px=n.pos.x+Math.sin(a)*1.3,pz=n.pos.z+Math.cos(a)*1.3;
    PortFX.slash(px,n.pos.y+1.25,pz,a,
      [n._hitIdx%2?0.45:-0.45,0,0],heavy?1.35:1.0,0xffd97a);
    PortFX.spark(px,n.pos.y+1.2,pz,heavy?8:4,0xfff0a8,heavy?8:5);
    if(heavy){
      FX.ring(px,n.pos.y+0.05,pz,0xffd24d,0.5,4.5);
      FX.addShake(0.22);
    }
  },

  /* =========================================================================
     ANIMASI — idle / jalan / lari / ayunan pedang / pose AUMAN SINGA.
     ========================================================================= */
  animate(n,dt){
    const lk=n.lion||(n.lion={roarCd:0});
    lk.roarCd=Math.max(0,lk.roarCd-dt);
    const P=n.parts,t=performance.now()*0.001;
    const BODY_Y=P.bodyY;

    /* flash merah saat terluka */
    const em=n.flash>0?0xaa2222:0x000000;
    n.mesh.traverse(o=>{if(o.material&&o.material.emissive)
      o.material.emissive.setHex(em);});

    /* mundur paksa (HP kritis) membatalkan raungan */
    if(n.roar&&n.retreat)n.roar=null;
    /* timeline raungan tetap maju di sini (dipakai combat utk damage) */
    if(n.roar){
      n.roar.t+=dt;
      if(n.roar.t>=this.LK_DUR)n.roar=null;
    }

    /* --- reset pose dasar --- */
    P.body.position.y=BODY_Y;P.body.rotation.set(0,0,0);P.body.scale.setScalar(1);
    P.head.rotation.set(0,0,0);P.head.scale.setScalar(1);
    P.armL.rotation.set(0,0,0);P.armR.rotation.set(0,0,0);
    P.legs[0].rotation.x=0;P.legs[1].rotation.x=0;
    P.tail.rotation.x=-0.5;P.tail.rotation.y=0;
    if(P.jaw)P.jaw.rotation.x=0.04;

    if(n.roar){this.roarPose(n,P,n.roar.t);return;}

    /* --- ayunan pedang (n.swing diisi aiFight saat melee mendarat) --- */
    if(n.swing>0){
      const sw=PE.out(1-n.swing/0.25);
      const dir=(n._hitIdx||0)%2?1:-1;
      P.armR.rotation.x=lerp(0.5,-1.6,sw);
      P.armR.rotation.y=dir*lerp(1.0,-0.6,sw);
      P.armL.rotation.x=lerp(0.1,0.55,sw);
      P.body.rotation.y=dir*0.35*Math.sin(Math.PI*sw);
      P.head.rotation.y=dir*0.2*Math.sin(Math.PI*sw);
      P.legs[0].rotation.x=-0.25*sw;P.legs[1].rotation.x=0.3*sw;
      P.tail.rotation.y=-dir*0.4*Math.sin(Math.PI*sw);
      return;
    }

    /* --- idle / jalan / lari --- */
    const sp=Math.hypot(n.vel.x,n.vel.z);
    const step=Math.sin(t*9)*0.5*Math.min(1,sp/2);
    P.legs[0].rotation.x=step;P.legs[1].rotation.x=-step;
    P.armL.rotation.x=-step*0.6;
    P.armR.rotation.x=step*0.6-(sp>3?0.25:0);   // pedang siaga saat lari
    P.body.position.y=BODY_Y+Math.abs(Math.sin(t*9))*0.03*Math.min(1,sp/2);
    if(sp>3)P.body.rotation.x=0.12;             // condong mengejar
    P.head.rotation.y=n.target?0:Math.sin(t*1.4)*0.35;
    /* ekor bergoyang santai */
    P.tail.rotation.y=Math.sin(t*2.8)*0.25;
    P.tail.rotation.x=-0.5+Math.sin(t*1.7)*0.08;
  },

  /* ---------- pose timeline AUMAN SINGA -------------------------------
     wind = tarik napas (surai mengembang) → roar = raung (mulut terbuka,
     lengan terbentang, badan bergetar) → rec = turun kembali. */
  roarPose(n,P,T){
    const LK=this.LK;
    if(T<LK.wind){
      const e=PE.out(T/LK.wind);
      P.body.rotation.x=-0.22*e;
      P.body.scale.setScalar(1+0.07*e);         // dada mengembang
      P.head.rotation.x=-0.45*e;                // menengadah
      P.head.scale.setScalar(1+0.10*e);         // surai mekar
      if(P.jaw)P.jaw.rotation.x=0.04+0.12*e;
      P.armL.rotation.x=0.7*e;P.armL.rotation.z=0.45*e;
      P.armR.rotation.x=0.6*e;P.armR.rotation.z=-0.4*e;
      P.legs[0].rotation.x=-0.2*e;P.legs[1].rotation.x=0.25*e;
      P.tail.rotation.x=-0.5+0.5*e;
      return;
    }
    /* fase raung + pemulihan */
    const rec=T>=LK.wind+LK.mid;
    const k=rec?1-PE.inOut(clamp((T-LK.wind-LK.mid)/LK.rec,0,1)):1;
    const tr=Math.sin(T*45)*0.02*k;             // getaran raungan
    P.body.rotation.x=-0.34*k;
    P.body.rotation.z=tr;
    P.body.scale.setScalar(1+0.09*k);
    P.head.rotation.x=-0.62*k;
    P.head.scale.setScalar(1+0.14*k);
    if(P.jaw)P.jaw.rotation.x=0.04+0.5*k;       // mulut menganga lebar
    P.armL.rotation.set(-1.1*k,0,0.75*k);       // lengan terbentang
    P.armR.rotation.set(-1.0*k,0,-0.7*k);
    P.legs[0].rotation.x=-0.3*k;P.legs[1].rotation.x=0.35*k;
    P.tail.rotation.x=-0.5+0.9*k;
    P.tail.rotation.y=Math.sin(T*20)*0.2*k;
  },
};
window.NPC_Lionknight=NPC_Lionknight;
