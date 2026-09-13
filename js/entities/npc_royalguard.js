'use strict';
/* PI lokal: game tidak punya konstanta global PI */
const RPI=Math.PI;
/* =============================================================================
   ROYAL GUARD â€” pengawal kerajaan berzirah merah (NPC RARE)
   -----------------------------------------------------------------------------
   Diporting dari "NEW MODEL/Royal Guard.html". Yang DIAMBIL: karakter Royal
   Guard (armor merah bulky + helm bertanduk jambul + cape physics) beserta
   SELURUH animasinya (idle, jalan, lari, combo pedang 3 hit, SHIELD BASH,
   PROVOKE). Yang TIDAK diambil sesuai instruksi: editor perisai, arena, dan
   mob latihan â€” itu alat uji prototipe, bukan bagian NPC.

   DUA SKILL (angka dari tabel SKILL file asli, Lv1 vs Lv100):
     SHIELD BASH  â€” hantaman perisai ke depan:
       Â· kerucut ~70Â° di depan, jangkauan 8 blok (permintaan pemain; prototipe
         4.2)
       Â· mob terkena: knockback + STUN 3 dtk (Lv1) â†’ 6 dtk (Lv100)
       Â· VFX: shockwave tanah yang MENGANGKAT blok â€” mengerucut dari titik
         pukulan (lebar 1 blok) lalu menyebar hingga 5 blok secara halus,
         memakai FX.groundWave mode 'line' + angleSpread (lerap lihat bawah).
     PROVOKE      â€” teriakan penantang:
       Â· cincin kuning mengembang dari kakinya
       Â· SEMUA monster dalam radius menarik threat ke dirinya (taunt besar) &
         ditarik mendekat pelan selama durasi
       Â· durasi 7 dtk (Lv1) â†’ 10 dtk (Lv100); CD 15 â†’ 12 dtk
       Â· saat aktif: aura perisai kuning menyala + damage yang diterimanya
         dipotong 70% (persis file asli)

   GEAR IKUT PEMAIN: senjata & perisai yang diberi pemain (NPCS.give)
   digantikan modelnya secara visual â€” pedang dari WeaponManager (model asli
   pedang pemain), tameng dari ShieldModels â€” kecuali armor yang tidak
   diganti (armor Royal Guard memang bagian dari karakternya). Fungsi
   refreshGear(n) di panggil NPCS saat gear berubah.
   ============================================================================= */
/* skala pedang prototipe (buildSword: g.scale.setScalar(SWORD_SCALE)) */
const SWORD_SCALE_D=1.6;
const NPC_RoyalGuard={
  /* ------------------------------------------------------------------ */
  /* TUNING (semua angka bisa disetel di sini)                           */
  /* ------------------------------------------------------------------ */
  RG:{
    /* ---- SHIELD BASH ---- */
    bashRange:8,          // jangkauan kerucut (blok) â€” permintaan pemain
    bashDot:0.35,         // cos sudut kerucut (~70Â° bukaan penuh)
    bashStun1:3,          // durasi stun Lv 1
    bashStun100:6,        // durasi stun Lv 100 (prototipe SKILL.max)
    bashKnock1:4.2,
    bashKnock100:6.0,
    bashCd:14.4,          // cooldown bash (+20% lebih lama, sebelumnya 12)
    bashDmgMul:1.6,       // damage bash terhadap npcDmgSafe
    bashWind:0.34,        // animasi ancang-ancang (detik) â€” file asli
    bashHit:0.16,         // jendela impact
    /* ---- shockwave tanah terangkat (kalibrasi hantam bumi player & giant slam) ----
       Dibuat lurus menyebar ke depan: satu gelombang tanah bertenaga penuh (amp 0.95),
       menjalar cepat dan mengangkat blok tanah secara nyata & rapi */
    waveSpeed:8.2,
    waveAmp:0.95,         // persis hantam bumi player & giant slam (0.95)
    waveWidth:1.15,       // lebar awal front (mengerucut di dekat perisai)
    waveSpread:4.8,       // menyebar ke depan hingga 4.8 blok
    /* ---- PROVOKE ---- */
    provDur1:7, provDur100:10,
    provCd1:15, provCd100:12,
    provRange:10,         // radius mob yang diprovokasi
    provPull:2.6,         // kecepatan tarikan (blok/detik)
    provDr:0.70,          // reduksi damage saat provoke (file asli: 0.70)
  },

  /* ------------------------------------------------------------------ */
  /* MODEL                                                               */
  /* ------------------------------------------------------------------ */
  /* palet armor merah bulky â€” dari file asli */
  C:{
    red:0xb02a26, redD:0x8a1e1c, redL:0xd44039,
    gold:0xe0b048, goldD:0xa87e28, goldL:0xffd870,
    steel:0x9aa0a8, steelD:0x6a7078, steelL:0xc4cad2,
    iron:0x4a4e56, ironD:0x32363c,
    cape:0x14121a, capeD:0x0c0a10, capeL:0x201d28,
    leather:0x4a3428,
    eyeGlow:0xffd23d, plume:0xd4382e, plumeD:0xa02620,
  },

  build(){
    const C=this.C,M=(c)=>Furni.M('rg'+c,c);
    const boxGeo=RG_BOX();                     // satu geometri kubus dipakai semua
    const g=new THREE.Group();
    /* proporsi NPC manusia lain: elf 0.62, giant 0.46. Guard bulky â†’ 0.60
       dari tinggi prototipe (yang memang dirancang seukuran 2 blok lebih). */
    g.scale.setScalar(0.60);
    const box=(p,w,h,d,c,x,y,z,rx,ry,rz)=>{
      const m=new THREE.Mesh(boxGeo,M(c));
      m.scale.set(w,h,d);m.position.set(x,y,z);
      if(rx||ry||rz)m.rotation.set(rx||0,ry||0,rz||0);
      m.castShadow=!(typeof IS_MOBILE!=='undefined'&&IS_MOBILE);
      p.add(m);return m;
    };
    const B=(parent,w,h,d,c,x,y,z)=>box(parent,w,h,d,c,x,y,z);

    /* ---------- KAKI (2 segmen: pinggul â†’ lutut) ---------- */
    const mkLeg=(sx)=>{
      const leg=new THREE.Group();leg.position.set(sx*0.3,1.32,0.02);g.add(leg);
      B(leg,0.44,0.32,0.46,C.red  ,0,-0.14,0);
      B(leg,0.48,0.08,0.50,C.gold ,0,-0.32,0);
      B(leg,0.40,0.22,0.42,C.iron ,0,-0.44,0);
      const shin=new THREE.Group();shin.position.y=-0.55;leg.add(shin);
      B(shin,0.36,0.20,0.24,C.steelL,0, 0.02,0.14);
      B(shin,0.38,0.16,0.40,C.redD  ,0,-0.02,0);
      B(shin,0.36,0.30,0.38,C.iron  ,0,-0.24,0);
      B(shin,0.40,0.08,0.42,C.gold  ,0,-0.42,0);
      B(shin,0.44,0.20,0.50,C.iron  ,0,-0.58,0.02);
      B(shin,0.46,0.08,0.54,C.red   ,0,-0.67,0.02);
      B(shin,0.42,0.09,0.18,C.steelD,0,-0.60,0.24);
      B(shin,0.15,0.13,0.10,C.gold  ,0,-0.56,0.28,0,0,RPI/4);
      leg.userData.shin=shin;
      return leg;
    };
    const legL=mkLeg(1),legR=mkLeg(-1);

    /* ---------- ROK ARMOR ---------- */
    const skirt=new THREE.Group();skirt.position.set(0,1.5,0);g.add(skirt);
    B(skirt,1.36,0.38,1.02,C.redD,0,-0.24,0);
    B(skirt,1.42,0.10,1.08,C.gold,0,-0.45,0);
    B(skirt,1.30,0.30,0.96,C.red ,0,-0.04,0);
    for(let i=-1;i<=1;i++){
      B(skirt,0.36,0.44,0.10,C.redD,i*0.4,-0.36,0.5);
      B(skirt,0.36,0.08,0.11,C.gold,i*0.4,-0.56,0.5);
    }
    B(skirt,0.12,0.42,0.90,C.redD, 0.68,-0.30,0);
    B(skirt,0.12,0.42,0.90,C.redD,-0.68,-0.30,0);

    /* ---------- TORSO ---------- */
    const body=new THREE.Group();body.position.set(0,1.5,0);g.add(body);
    B(body,1.18,0.90,0.72,C.red  ,0,0.46,0);
    B(body,1.24,0.34,0.78,C.redL ,0,0.82,0);
    B(body,1.10,0.24,0.66,C.redD ,0,0.06,0);
    B(body,0.20,0.86,0.10,C.gold ,0,0.46,0.38);
    B(body,0.50,0.14,0.09,C.gold ,0,0.74,0.38);
    B(body,0.30,0.30,0.07,C.goldL,0,0.50,0.42,0,0,RPI/4);
    B(body,0.14,0.14,0.08,C.plume,0,0.50,0.46,0,0,RPI/4);
    B(body,1.22,0.20,0.80,C.leather,0,0.02,0);
    B(body,0.30,0.24,0.10,C.gold ,0,0.02,0.42);

    /* pauldron besar */
    const mkPald=(sx)=>{
      const p=new THREE.Group();p.position.set(sx*0.72,0.78,0);body.add(p);
      B(p,0.52,0.34,0.86,C.red  ,sx*0.06, 0.06,0);
      B(p,0.56,0.16,0.90,C.redL ,sx*0.06, 0.24,0);
      B(p,0.58,0.08,0.92,C.gold ,sx*0.06, 0.34,0);
      B(p,0.44,0.24,0.74,C.redD ,sx*0.14,-0.16,0);
      B(p,0.46,0.07,0.76,C.gold ,sx*0.14,-0.28,0);
      B(p,0.14,0.26,0.14,C.steelL,sx*0.28,0.30, 0.24, 0.3,0,sx*-0.4);
      B(p,0.14,0.26,0.14,C.steelL,sx*0.28,0.30,-0.24,-0.3,0,sx*-0.4);
      return p;
    };
    mkPald(1);mkPald(-1);
    /* gorget */
    B(body,0.66,0.22,0.60,C.iron,0,1.00,0);
    B(body,0.70,0.08,0.64,C.gold,0,1.10,0);

    /* ---------- KEPALA: helm tertutup + jambul ---------- */
    const head=new THREE.Group();head.position.set(0,1.20,0);body.add(head);
    B(head,0.72,0.70,0.72,C.iron  ,0,0,0);
    B(head,0.78,0.30,0.78,C.red   ,0,0.28,0);
    B(head,0.80,0.09,0.80,C.gold  ,0,0.46,0);
    B(head,0.76,0.24,0.74,C.redD  ,0,-0.30,0);
    B(head,0.66,0.20,0.10,C.ironD ,0,0.04,0.34);
    B(head,0.50,0.07,0.05,C.eyeGlow,0,0.04,0.40);
    B(head,0.10,0.34,0.12,C.steelL,0,-0.06,0.36);
    B(head,0.08,0.20,0.06,C.ironD, 0.22,-0.14,0.36);
    B(head,0.08,0.20,0.06,C.ironD,-0.22,-0.14,0.36);
    B(head,0.10,0.50,0.60,C.red , 0.38,0.02,-0.02);
    B(head,0.10,0.50,0.60,C.red ,-0.38,0.02,-0.02);
    B(head,0.11,0.09,0.62,C.gold, 0.38,0.26,-0.02);
    B(head,0.11,0.09,0.62,C.gold,-0.38,0.26,-0.02);
    const plume=new THREE.Group();plume.position.set(0,0.5,-0.02);head.add(plume);
    B(plume,0.12,0.20,0.50,C.gold,0,0.02,0);
    for(let i=0;i<5;i++)
      B(plume,0.14,0.26-i*0.03,0.16,i%2?C.plume:C.plumeD,0,0.20-i*0.015,-0.06-i*0.14);

    /* ---------- LENGAN (2 segmen) ---------- */
    const FIST_Y=-0.68;
    const mkArm=(sx)=>{
      const arm=new THREE.Group();arm.position.set(sx*0.78,0.66,0);body.add(arm);
      B(arm,0.42,0.38,0.42,C.red  ,0,-0.06,0);
      B(arm,0.38,0.34,0.38,C.iron ,0,-0.36,0);
      B(arm,0.42,0.09,0.42,C.gold ,0,-0.55,0);
      const fore=new THREE.Group();fore.position.y=-0.62;arm.add(fore);
      B(fore,0.44,0.16,0.44,C.redD  ,0,-0.02,0);
      B(fore,0.30,0.18,0.20,C.steelL,0,-0.04,0.22);
      B(fore,0.42,0.40,0.42,C.red   ,0,-0.24,0);
      B(fore,0.46,0.09,0.46,C.gold  ,0,-0.46,0);
      B(fore,0.38,0.16,0.38,C.iron  ,0,-0.56,0);
      B(fore,0.34,0.26,0.36,C.steelD,0,FIST_Y,0);
      B(fore,0.36,0.07,0.38,C.gold  ,0,FIST_Y+0.14,0);
      B(fore,0.12,0.15,0.15,C.steelL,sx*0.10,FIST_Y-0.08,0.14);
      arm.userData.fore=fore;
      return arm;
    };
    const armL=mkArm(1),armR=mkArm(-1);
    const foreL=armL.userData.fore,foreR=armR.userData.fore;

    /* ---------- SLOT SENJATA & PERISAI ----------
       PENTING — DUA PERBEDAAN dengan versi lama yang membuat grip salah:

       1. PEDANG: builder pedang game (js/player/weapons/*.js) membawa POSISI &
          ROTASI-nya SENDIRI (build() diakhiri position.set(0,-0.31,0.02),
          rotation.x=-PI/2 — persis gaya pemain yang gripnya di fore -0.31).
          Versi lama menaruhnya di dalam swordSlot yang DIROTASI -90° lagi →
          rotasi ganda: bilah menghadap KE ATAS dan kepalan jatuh di tempat
          yang salah. Sekarang swordSlot adalah pivot TANPA rotasi, dan
          refreshGear meng-override posisi/rotasi builder ke grip prototipe:
          foreR @ (0, FIST_Y, SWORD_GRIP_Y*SWORD_SCALE), rot.x=-90° (file asli
          baris 738-741) — gagang (lokal +Y .22 builder) tepat di kepalan.

       2. PERISAI: file asli menjaga perisai TEGAK MENGHADAP DEPAN lewat
          counter-rotation quaternion tiap frame (applyPose baris 1222-1234):
          editorPivot (offset SHIELD_BASE) → shieldSlot (pitch editor) →
          perisai. Tanpa itu, perisai ikut rebah/miring mengikuti siku yang
          ditekuk (fLx -1.15) — itulah "perisai tidak pas". Strukturnya
          direplikasi di sini dan quaternion-nya dihitung di animate(). */
    /* Slot pedang: grip di kepalan kanan, rotasi forward menghadap lurus ke depan */
    const swordSlot=new THREE.Group();foreR.add(swordSlot);
    swordSlot.position.set(0,FIST_Y,0.04);
    swordSlot.rotation.x=Math.PI/2+0.62; // Menghadap lurus ke depan (+Z)
    foreR.userData.swordSlot=swordSlot;
    /* shield chain: foreL → editorPivot(offset) → shieldSlot(pitch) → mesh */
    const shieldPivot=new THREE.Group();foreL.add(shieldPivot);
    shieldPivot.position.set(-0.5,-0.71,0.1);      // SHIELD_BASE file asli
    const shieldSlot=new THREE.Group();shieldPivot.add(shieldSlot);
    shieldSlot.rotation.x=-0.01;                   // pitch editor SHIELD_BASE

    /* cape belakang (versi game: selendang kaku sederhana â€” cape verlet 35
       partikel prototipe terlalu mahal di mobile; siluetnya tetap sama) */
    B(body,1.40,0.12,0.14,C.gold,0,0.94,-0.44);
    const cape=B(body,1.15,1.55,0.10,C.cape,0,0.10,-0.50);
    B(body,1.15,0.10,0.11,C.capeD,0,-0.66,-0.50);

    /* label pembaca SkillsPort */
    const parts={body,head,armL,armR,legs:[legL,legR],
      shinL:legL.userData.shin,shinR:legR.userData.shin,skirt,plume,
      /* foreL/foreR WAJIB diekspor: animate() menerapkan rotasi siku lewat
         parts.foreL/foreR — tanpa ini siku tidak pernah ditekuk (guard
         `if(R.foreL)` melompati diam-diam) dan pose tidak seperti file asli */
      foreL,foreR,
      bodyY:1.5,swordSlot,shieldSlot,shieldPivot,
      rare:{kind:'royalguard'}};
    return {mesh:g,parts};
  },

  /* =====================================================================
     GEAR IKUT PEMAIN (senjata + perisai; armor tidak)
     ---------------------------------------------------------------------
     Dipanggil NPCS.refreshGear saat pemain memberi item lewat panel NPC.
     - Pedang  : WeaponManager.buildWeapon(id) â€” model yang PERSIS dipakai
                 pemain, diskalakan 1.6x (prototipe SWORD_SCALE).
     - Perisai : ShieldModels.buildFor(id), ditempel di lengan bawah kiri
                 (posisi dari Shield Editor hasil kalibrasi prototipe).
     ===================================================================== */
  refreshGear(n){
    if(!n||!n.mesh||!n.parts||!n.parts.swordSlot)return;
    const P=n.parts;
    /* senjata */
    const sw=P.swordSlot;
    for(let i=sw.children.length-1;i>=0;i--){
      const c=sw.children[i];sw.remove(c);
      c.traverse(o=>{if(o.geometry)o.geometry.dispose();});
    }
    const wid=n.gear&&n.gear.weapon;
    if(wid&&typeof WeaponManager!=='undefined'){
      const w=WeaponManager.buildWeapon(wid);
      if(w){
        /* builder pedang membawa posisi & rotasi untuk rig PEMAIN
           (position (0,-0.31,0.02), rotation.x=-90°). Nolkan dulu — grip
           prototipe dipasang di sini: gagang (lokal +Y≈.22 builder, diskala
           1.6) jatuh tepat di kepalan foreR, bilah menghadap +Z (depan),
           persis konvensi buildSword file asli. */
        w.position.set(0,0,0);
        w.rotation.set(0,0,0);
        w.scale.setScalar(SWORD_SCALE_D);
        sw.add(w);
      }
    }
    /* perisai */
    const sh=P.shieldSlot;
    for(let i=sh.children.length-1;i>=0;i--){
      const c=sh.children[i];sh.remove(c);
      c.traverse(o=>{if(o.geometry)o.geometry.dispose();});
    }
    const sid=n.gear&&n.gear.shield;
    if(sid&&typeof ShieldModels!=='undefined'){
      const m=ShieldModels.buildFor(sid);
      if(m){
        /* UKURAN PERSIS PROTOTIPE: ShieldModels.buildFor menskalakan tameng ke
           TARGET_H 0.85 (ukuran pemain). Prototipe Royal Guard memakai
           SHIELD_TARGET_H 2.05 — 2.4x lebih besar. 0.85/2.05 diembuskan di sini
           lewat pengali 2.4, lalu faktor editor 1.06 dari file asli. */
        m.scale.multiplyScalar(2.41*1.06);
        sh.add(m);
        /* pelat depan disimpan untuk efek menyala saat PROVOKE */
        P.shieldPlate=m.userData.plate||null;
        if(!P.shieldPlate){
          m.traverse(o=>{if(o.isMesh&&!P.shieldPlate&&o.material&&o.material.color){
            P.shieldPlate=o;
          }});
        }
      }
    }
  },

  /* =====================================================================
     ANIMASI â€” port penuh pose system prototipe
     ===================================================================== */
  /* kuda-kuda tank: perisai terangkat di dada kiri, pedang di genggaman */
  guardStance(P){
    P.aLx=-0.42;P.aLy=0.8;P.aLz=0.26;P.fLx=-1.15;
    P.aRx=-0.14;P.aRy=-0.12;P.aRz=-0.22;P.fRx=-0.62;
    P.shX=0.06;P.shY=-0.2;
  },

  animate(n,dt){
    const P=n.rgPose||(n.rgPose={aLx:0,aLy:0,aLz:0,fLx:0,aRx:0,aRy:0,aRz:0,
      fRx:0,legLx:0,legRx:0,legLz:0,legRz:0,shinL:0,shinR:0,
      rootY:0,lean:0,twist:0,headX:0,headY:0});
    const R=n.parts;
    const t=(n.rgT=((n.rgT||0)+dt));
    const sp=Math.hypot(n.vel.x,n.vel.z);
    const run=sp>3.4;

    /* ---------- POSE DASAR ---------- */
    this.guardStance(P);
    const ph=(n.rgPh=((n.rgPh||0)+dt*(run?10.2:6.4)));
    const s=Math.sin(ph),c=Math.cos(ph);
    const thigh=run?0.78:0.5,knee=run?1.0:0.58;
    P.legLx=s*thigh;P.legRx=-s*thigh;
    P.shinL=Math.max(0,-c)*knee;P.shinR=Math.max(0,c)*knee;
    P.legLz=0.03;P.legRz=-0.03;
    P.rootY=Math.abs(s)*(run?0.09:0.055);
    P.lean=run?0.2:0.07;
    P.twist=s*(run?0.09:0.07);
    P.headY=-s*0.06;
    P.headX=run?0.05:0.02;
    /* idle bob halus saat berdiri */
    if(sp<0.3){
      const b=Math.sin(t*1.5);
      P.rootY=b*0.022;P.lean=0.02+b*0.012;
      P.aLx+=b*0.03;P.fLx+=b*0.02;
      P.aRx+=b*0.025;P.fRx+=b*0.03;
      P.headY=Math.sin(t*0.5)*0.2;P.headX=Math.sin(t*0.8)*0.03;
      P.legLx=P.legRx=P.shinL=P.shinR=0;P.legLz=0;P.legRz=0;
    }else{
      /* lengan mengayun: perisai tetap di dada, pedang berlawanan fase */
      P.aLx+=-s*(run?0.14:0.09);
      P.fLx+=run?-0.12:-0.06;
      P.aRx=-0.14+s*(run?0.62:0.4);
      P.fRx=run?-0.95:-0.6;
      if(R.skirt){R.skirt.rotation.x=s*0.05;R.skirt.rotation.z=Math.sin(ph*0.5)*0.035;}
    }
    if(R.plume)R.plume.rotation.x=0.12+Math.sin(t*2.2)*0.05+(sp>4?0.3:sp>0?0.15:0);

    /* ---------- Aksi khusus (bash / provoke) menimpa pose dasar ----------
       A.t = WAKTU AKSI, bukan waktu global: t parameter di sini adalah n.rgT
       (jam animasi). Dulu A.t dipakai langsung di _poseBash sehingga guard
       yang sudah lama hidup menyelesaikan bash-nya seketika saat dipicu. */
    const A=n.rgAct;
    if(A){
      A.t+=dt;
      if(A.type==='bash')this._poseBash(n,P,A,A.t);
      else if(A.type==='provoke')this._poseProvoke(n,P,A,A.t);
    }
    else if(n.swing>0)this._poseSwing(n,P,1-n.swing/0.25);

    /* ---------- terapkan pose ke rig ---------- */
    R.armL.rotation.set(P.aLx,P.aLy,P.aLz);
    R.armR.rotation.set(P.aRx,P.aRy,P.aRz);
    if(R.foreL)R.foreL.rotation.x=P.fLx;
    if(R.foreR)R.foreR.rotation.x=P.fRx;
    R.legs[0].rotation.set(P.legLx,0,P.legLz);
    R.legs[1].rotation.set(P.legRx,0,P.legRz);
    R.shinL.rotation.x=P.shinL;R.shinR.rotation.x=P.shinR;
    R.body.position.y=R.bodyY+P.rootY;
    R.body.rotation.set(P.lean,P.twist,0);
    R.head.rotation.set(P.headX,P.headY,0);

    /* ---------- PERISAI TEGAK MENGHADAP DEPAN ----------
       Port applyPose file asli (baris 1222-1234): perisai anak lengan bawah,
       tapi rotasinya DI-COUNTER dengan quaternion dunia lengan sehingga pelat
       selalu tegak menghadap arah hadap tubuh + deviasi pose shX/shY.
       Chain: foreL (pose) → shieldPivot (quaternion counter) → shieldSlot
       (pitch editor) → mesh. Tanpa ini perisai rebah mengikuti siku. */
    if(R.shieldPivot){
      R.foreL.updateWorldMatrix(true,false);
      R.foreL.getWorldQuaternion(RG_QA);
      /* deviasi eksplisit per-skill (shX/shY) + yaw tubuh */
      RG_E.set(P.shX,n.mesh.rotation.y+P.shY,0);
      RG_QB.setFromEuler(RG_E);
      RG_QA.invert().multiply(RG_QB);
      R.shieldPivot.quaternion.copy(RG_QA);
    }

    /* ---------- aura perisai saat provoke ---------- */
    const st=n.rgSt||(n.rgSt={});
    if(st.provT>0){
      const pulse=0.5+Math.sin(t*8)*0.5;
      /* cincin tanah mengembang diputar pelan */
      if(!st.ring){
        st.ring=new THREE.Mesh(new THREE.RingGeometry(3.1,3.45,44),
          new THREE.MeshBasicMaterial({color:0xffd23d,transparent:true,
            opacity:0.3,side:THREE.DoubleSide,depthWrite:false}));
        st.ring.rotation.x=-RPI/2;
        (typeof Game!=='undefined'&&Game.scene)?Game.scene.add(st.ring):null;
      }
      st.ring.visible=true;
      st.ring.position.set(n.pos.x,n.pos.y+0.07,n.pos.z);
      st.ring.rotation.z+=dt*1.4;
      st.ring.material.opacity=0.22+pulse*0.22;
      /* aura glow di sekeliling perisai (torus additive, dari prototipe) */
      if(!st.aura){
        st.aura=new THREE.Group();
        const am=new THREE.MeshBasicMaterial({color:0xffd23d,transparent:true,
          opacity:0.3,blending:THREE.AdditiveBlending,depthWrite:false,
          side:THREE.DoubleSide});
        st.auraMat=am;
        const glow=new THREE.Mesh(new THREE.SphereGeometry(0.55,12,9),am);
        st.aura.add(glow);
        for(let i=0;i<2;i++){
          const rg=new THREE.Mesh(new THREE.TorusGeometry(0.5+i*0.12,0.03,8,26),am);
          rg.rotation.x=RPI/2+i*0.4;
          st.aura.add(rg);
        }
        (typeof Game!=='undefined'&&Game.scene)?Game.scene.add(st.aura):null;
      }
      st.aura.visible=true;
      /* aura menempel di perisai (ikuti lengan kiri) */
      const sp2=new THREE.Vector3();
      if(P.shieldSlot){P.shieldSlot.getWorldPosition(sp2);st.aura.position.copy(sp2);}
      else st.aura.position.set(n.pos.x,n.pos.y+1.2,n.pos.z);
      st.aura.rotation.y+=dt*2.2;
      st.aura.rotation.z=Math.sin(t*3)*0.2;
      st.auraMat.opacity=0.24+pulse*0.24;
      st.aura.scale.setScalar(1+pulse*0.1);
      /* perisai ikut menyala */
      if(P.shieldPlate&&P.shieldPlate.material&&P.shieldPlate.material.emissive)
        P.shieldPlate.material.emissiveIntensity=0.35+pulse*0.4;
    }else{
      if(st.ring)st.ring.visible=false;
      if(st.aura)st.aura.visible=false;
      if(P.shieldPlate&&P.shieldPlate.material&&P.shieldPlate.material.emissive)
        P.shieldPlate.material.emissiveIntensity=0;
    }
  },

  /* pose ayunan pedang biasa (dipakai saat swing dari aiFight) */
  _poseSwing(n,P,u){
    u=clamp(u,0,1);
    P.aRx=-0.14+u*0.8;P.aRz=-0.22-u*0.4;P.fRx=-0.62-u*0.5;
    P.twist=0.25*u;P.lean=0.1;
  },

  /* ---------- POSE SHIELD BASH (prototipe: wind 0.34 â†’ hit 0.16 â†’ recov) --- */
  _poseBash(n,P,A,t){
    const RG=this.RG;
    let shX=0.06,shY=-0.2;
    if(t<RG.bashWind){
      const u=t/RG.bashWind;
      P.aLx=-0.42-u*0.36;P.aLy=0.3+u*0.5;P.aLz=0.26;P.fLx=-1.15+u*0.5;
      P.twist=-u*0.42;P.lean=-u*0.14;
      P.aRx=-0.14+u*0.4;P.aRz=-0.22-u*0.2;P.fRx=-0.62-u*0.3;
      P.rootY=u*0.08;
      P.legLx=-u*0.24;P.legRx=u*0.3;P.shinR=u*0.4;
      shX=0.06+u*0.3;shY=-0.2-u*0.4;
    }else if(t<RG.bashWind+RG.bashHit){
      const u=(t-RG.bashWind)/RG.bashHit;
      P.aLx=-0.78+u*0.5;P.aLy=0.8-u*0.66;P.aLz=0.26-u*0.2;
      P.fLx=-0.65-u*0.5;
      P.twist=-0.42+u*0.72;P.lean=-0.14+u*0.4;
      P.aRx=0.26-u*0.3;P.aRz=-0.42+u*0.2;P.fRx=-0.92+u*0.3;
      P.rootY=0.08-u*0.08;
      P.legLx=-0.24+u*0.6;P.legRx=0.3-u*0.44;P.shinR=0.4-u*0.3;
      shX=0.36-u*0.44;shY=-0.6+u*0.6;
      if(!A.fired&&u>0.45){A.fired=true;this._doBash(n);}
    }else if(t<RG.bashWind+RG.bashHit+0.6){
      const u=Math.min(1,(t-RG.bashWind-RG.bashHit)/0.6);
      P.aLx=-0.28-u*0.14;P.aLy=0.14+u*0.16;P.aLz=0.06+u*0.2;
      P.fLx=-1.15;
      P.twist=0.3*(1-u);P.lean=0.26-u*0.24;
      P.aRx=-0.04-u*0.1;P.aRz=-0.22;P.fRx=-0.62;
      P.legLx=0.36*(1-u);P.legRx=-0.14*(1-u);P.shinR=0.1*(1-u);
      shX=-0.08+u*0.14;shY=-u*0.2;
    }else{
      n.rgAct=null;
    }
    P.shX=shX;P.shY=shY;      // deviasi orientasi perisai (file asli)
  },

    /* ---------- POSE PROVOKE (teriak penantang singkat 0.45 dtk) ---------- */
  _poseProvoke(n,P,A,t){
    const u=clamp(t/0.45,0,1);
    P.aRx=-0.14-u*2.3;P.aRz=-0.22+u*0.28;P.fRx=-0.62+u*0.5;
    P.aLx=-0.42-u*0.22;P.aLy=0.3-u*0.36;P.fLx=-1.15+u*0.28;
    P.lean=-u*0.2;P.rootY=u*0.1;
    P.headX=-u*0.24;
    P.legLz=u*0.16;P.legRz=-u*0.16;
    P.legLx=-u*0.1;P.legRx=-u*0.1;
    P.shX=0.06;P.shY=-0.2+u*0.2;          // perisai dibuka ke depan saat teriak
    if(t>=0.45){
      n.rgAct=null;                       // selesai teriak: guard langsung bebas menyerang & bergerak
    }
  },

  /* =====================================================================
     SHIELD BASH — eksekusi
     ---------------------------------------------------------------------
     Kerucut depan ~70°, jangkauan 8 blok. Mob kena: knockback + STUN.
     Gelombang tanah terangkat dibuat persis hantam bumi player & giant slam:
     satu gelombang bertenaga penuh (amp 0.95), menjalar lurus menyebar ke
     depan mengikuti arah perisai tanpa tumpang-tindih glitch.
     ===================================================================== */
  _doBash(n){
    const RG=this.RG,st=n.rgSt||(n.rgSt={});
    const fx=Math.sin(n.mesh.rotation.y),fz=Math.cos(n.mesh.rotation.y);
    const Lv=typeof Player!=='undefined'?Player.level:1;
    const stun=lerp(RG.bashStun1,RG.bashStun100,clamp((Lv-1)/99,0,1));
    const knock=lerp(RG.bashKnock1,RG.bashKnock100,clamp((Lv-1)/99,0,1));

    /* Titik benturan perisai di depan guard */
    const ix=n.pos.x+fx*1.4,iz=n.pos.z+fz*1.4,iy=n.pos.y+0.2;

    /* VFX benturan tanah persis hantam bumi player & giant slam */
    FX.ring(ix,iy+0.05,iz,0xff9a4d,0.6,6);
    FX.ring(ix,iy+0.05,iz,0xffffff,0.35,3.5);
    FX.shockwave(ix,iy,iz,0xffd24d,5);
    FX.debris(new THREE.Vector3(ix,iy+0.3,iz),0x8a6b4a,18,4.5);
    PortFX.spark(ix,iy+0.5,iz,14,0xffd9a0,9);
    FX.addShake(0.65);
    Sfx.at(n.pos,'smash');

    /* GELOMBANG TANAH TERANGKAT:
       Lurus menyebar ke depan, bertenaga penuh (amp 0.95) & mulus menjalar */
    if(typeof FX!=='undefined'&&FX.groundWave){
      FX.groundWave(ix,iy,iz,{
        mode:'line',
        dir:n.mesh.rotation.y,
        speed:RG.waveSpeed,
        amp:RG.waveAmp,
        radius:RG.bashRange,
        width:RG.waveWidth,
        angleSpread:RG.waveSpread,
        smooth:false
      });
    }

    /* damage + stun semua mob di kerucut */
    const dmg=npcDmgSafe(n)*RG.bashDmgMul;
    let hit=0;
    for(const m of Monsters.list){
      if(m.dead||m.pet||m.catchActive)continue;
      const dx=m.pos.x-n.pos.x,dz=m.pos.z-n.pos.z;
      const d=Math.hypot(dx,dz);
      if(d>RG.bashRange)continue;
      const dot=(dx*fx+dz*fz)/(d||0.001);
      if(dot<RG.bashDot)continue;
      hit++;
      m.stunT=stun;                       // MONSTERS STUN
      m.vx=m.vx||0;m.vz=m.vz||0;
      const kx=d>0.001?(dx/d):fx, kz=d>0.001?(dz/d):fz;
      m.vel.x+=kx*knock;m.vel.z+=kz*knock;
      Monsters.hurt(m,dmg,new THREE.Vector3(kx,0.2,kz),knock*0.5,n);
      FX.text(m.pos.clone().add(new THREE.Vector3(0,1.6,0)),
        `⭐ STUN ${stun.toFixed(0)}s`,'#ffb066');
      PortFX.spark(m.pos.x,m.pos.y+0.9,m.pos.z,5,0xffe066,5);
    }
    if(hit)FX.addShake(0.25);
  },

  /* =====================================================================
      PROVOKE
      ===================================================================== */
  _endProvoke(n){
    const st=n.rgSt||(n.rgSt={});
    st.provT=0;
    n.provDr=0;
    for(const m of Monsters.list)if(m.provokedBy===n)m.provokedBy=null;
  },
  _doProvoke(n){
    const RG=this.RG,st=n.rgSt||(n.rgSt={});
    const Lv=typeof Player!=='undefined'?Player.level:1;
    const k=clamp((Lv-1)/99,0,1);
    st.provT=lerp(RG.provDur1,RG.provDur100,k);
    st.provDur=st.provT;
    st.provCd=lerp(RG.provCd1,RG.provCd100,k);
    n.provDr=RG.provDr;                        // 70% damage reduction aktif
    FX.ring(n.pos.x,n.pos.y+0.07,n.pos.z,0xffd23d,0.8,14);
    FX.impact(n.pos.clone().add(new THREE.Vector3(0,1.4,0)),0xffe066,1.8);
    FX.addShake(0.2);
    if(typeof NPCS!=='undefined')NPCS.say(n,'KE SINI KALIAN!',1.8);
    /* pindahkan sasaran semua mob dalam radius ke guard + KUNCI target */
    let taunt=0;
    for(const m of Monsters.list){
      if(m.dead||m.pet||m.catchActive)continue;
      if(typeof Monsters.isAnimal==='function'&&Monsters.isAnimal(m))continue;
      if(m.pos.distanceTo(n.pos)>RG.provRange)continue;
      taunt++;
      m.provokedBy=n;                          // KUNCI TARGET (dicek pickFoe)
      if(m.foe)m.foe=n;                        // balik arah seketika frame ini
      if(typeof Monsters.addThreat==='function')Monsters.addThreat(m,n,25,99);
    }
    if(taunt)FX.text(n.pos.clone().add(new THREE.Vector3(0,2.3,0)),
      `🛡️ ${taunt} target!`,'#ffd23d');
  },

  /* =====================================================================
     COMBAT — dipanggil SkillsPort.combat dari NPCS.aiFight
     ===================================================================== */
  combat(n,dt){
    const st=n.rgSt||(n.rgSt={});
    const RG=this.RG;
    /* cooldown turun selalu */
    st.bashCd=Math.max(0,(st.bashCd||0)-dt);
    st.provCd=Math.max(0,(st.provCd||0)-dt);
    /* ---------- sedang memainkan aksi ---------- */
    const A=n.rgAct;
    if(A){
      if(A.type==='provoke'){
        if(A.t>=0.45){
          n.rgAct=null;                        // selesai animasi teriak: guard langsung aktif bertarung!
        }else{
          return true;                         // jeda sekejap hanya saat animasi teriak
        }
      }else{
        return true;                           // bash sedang berjalan
      }
    }
    /* ---------- picu skill ---------- */
    if(!n.target||n.target.dead)return false;
    const d=n.target.pos.distanceTo(n.pos);
    /* PROVOKE (Berserk / Taunt): kecerdasan buatan & butuh stamina (35) */
    if(st.provCd<=0&&((n.stamina||0)>=35)){
      let inRange=0;
      for(const m of Monsters.list){
        if(m.dead||m.pet||m.catchActive)continue;
        if(typeof Monsters.isAnimal==='function'&&Monsters.isAnimal(m))continue;
        if(m.pos.distanceTo(n.pos)<=4.5)inRange++;
      }
      const provCost=(typeof NPCS!=='undefined'&&NPCS.skillStamCost)?NPCS.skillStamCost(n,35):Math.max(46,Math.round((n.maxStamina||100)*0.30));
      if(inRange>=1&&((n.stamina||0)>=provCost)){
        n.stamina=(n.stamina||0)-provCost; n.stamRegenT=1.8;
        n.rgAct={type:'provoke',t:0,fired:false};
        this._doProvoke(n);
        FX.text(n.pos.clone().add(new THREE.Vector3(0,2,0)),`-${provCost} STAM`,'#ffd24d');
        return true;
      }
    }
    /* BASH: target di depan dalam jangkauan & butuh stamina (30% konsumsi) */
    const bashCost=(typeof NPCS!=='undefined'&&NPCS.skillStamCost)?NPCS.skillStamCost(n,30):Math.max(39,Math.round((n.maxStamina||100)*0.30));
    if(st.bashCd<=0&&d<=RG.bashRange*0.8&&((n.stamina||0)>=bashCost)){
      const fx=Math.sin(n.mesh.rotation.y),fz=Math.cos(n.mesh.rotation.y);
      const dx=n.target.pos.x-n.pos.x,dz=n.target.pos.z-n.pos.z;
      const dot=(dx*fx+dz*fz)/(d||0.001);
      if(dot>=RG.bashDot){
        n.stamina=(n.stamina||0)-bashCost; n.stamRegenT=1.8;
        n.rgAct={type:'bash',t:0,fired:false};
        st.bashCd=RG.bashCd;
        if(typeof NPCS!=='undefined')NPCS.say(n,'BASH!',1.2);
        FX.text(n.pos.clone().add(new THREE.Vector3(0,2,0)),`-${bashCost} STAM`,'#ffd24d');
        return true;
      }
    }
    return false;    // serangan biasa ditangani aiFight
  },

  /* timer yang perlu jalan walau di luar combat (panggil dari NPCS.update) */
  tick(n,dt){
    const st=n.rgSt;if(!st)return;
    st.bashCd=Math.max(0,(st.bashCd||0)-dt);
    st.provCd=Math.max(0,(st.provCd||0)-dt);
    if(n.dead){
      if(st.provT>0)this._endProvoke(n);
      return;
    }
    if(st.provT>0){
      st.provT-=dt;
      /* durasi habis: lepas KUNCI TARGET semua mob yang diprovokasi */
      if(st.provT<=0)this._endProvoke(n);
    }
  },
};
/* geometri kubus bersama untuk seluruh model guard (hemat GPU) */
let _rgBox=null;
function RG_BOX(){return _rgBox||(_rgBox=new THREE.BoxGeometry(1,1,1));}
/* scratch object untuk counter-rotation perisai (dipakai tiap frame) */
const RG_QA=new THREE.Quaternion(),RG_QB=new THREE.Quaternion(),
      RG_E=new THREE.Euler(),
      RG_QPITCH=new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1,0,0),-0.01);   // pitch editor file asli (SHIELD_BASE.rot)
window.NPC_Royalguard=NPC_RoyalGuard;
