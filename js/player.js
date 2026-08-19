'use strict';
/* Karakter: model, fisika, renang, combo 5 slash */
const COMBOS=[
  {dur:0.34,hit:0.14,dmg:1.0,vert:false},
  {dur:0.34,hit:0.14,dmg:1.0,vert:false},
  {dur:0.38,hit:0.16,dmg:1.25,vert:true},
  {dur:0.50,hit:0.22,dmg:1.4,vert:false},
  {dur:0.72,hit:0.34,dmg:2.4,vert:true,knock:7},
];
const Player={
  pos:new THREE.Vector3(),vel:new THREE.Vector3(),
  facing:0,onGround:false,inWater:false,dead:false,airJumped:false,
  hp:100,stamina:100,hunger:100,level:1,xp:0,kills:0,
  /* ---------- stat maksimum ikut level ----------
     Level 1 tetap 100 supaya keseimbangan awal tidak berubah; tiap level
     menambah kapasitas sesuai CFG. UI membaca fungsi ini untuk skala bar. */
  maxHp(){return 100+CFG.HP_PER_LVL*(this.level-1);},
  maxStamina(){return 100+CFG.STAM_PER_LVL*(this.level-1);},

  buffSpeed:0,splashT:0,rippleT:0,stamRegenT:0,hitStop:0,
  attack:{active:false,combo:-1,t:0,hitDone:false,queued:false,sinceEnd:99},
  dodge:{active:false,t:0,cd:0,dir:new THREE.Vector3()},
  skillAnim:null,                       // animasi skill aktif {id,t,max}
  mesh:null,parts:{},rollG:null,spawnP:new THREE.Vector3(),
  armorG:{},

  /* ---------- helper ---------- */
  box(w,h,d,color,yOff=0){
    const g=new THREE.BoxGeometry(w,h,d);g.translate(0,yOff,0);
    const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({color}));
    m.castShadow=true;return m;
  },
  /* kotak dengan posisi (x,y,z) langsung */
  pl(w,h,d,color,y=0,z=0,x=0){
    const m=this.box(w,h,d,color,0);m.position.set(x,y,z);return m;
  },

  /* ---------- model karakter detail ---------- */
  buildModel(){
    const SKIN=0xe8bd92,SKIN_D=0xd2a279,SKIN_L=0xf0cda2,TUNIC=0x40704a,TUNIC_D=0x33593b,
          PANTS=0x4a3b2a,BELT=0x2c2419,HAIR=0x4a3222,HAIR_D=0x372417,BOOT=0x3b2c1d,
          PANTS_D=0x3b2f21,TUNIC_L=0x4d8459,LEATHER=0x6b4a2a,LEATHER_D=0x4a3118;
    this.mesh=new THREE.Group();
    this.rollG=new THREE.Group();this.mesh.add(this.rollG);
    const body=new THREE.Group();this.rollG.add(body);this.parts.body=body;

    /* --- kaki: paha + lutut + tulang kering + sepatu bersol --- */
    const mkLeg=(side)=>{
      const g=new THREE.Group();g.position.set(0.13*side,0.66,0);
      /* paha melebar di pinggul lalu menyempit ke lutut */
      g.add(this.pl(0.20,0.16,0.22,PANTS,-0.08));
      g.add(this.pl(0.185,0.20,0.205,PANTS_D,-0.24));
      /* lipatan kain di sisi luar paha */
      g.add(this.pl(0.035,0.26,0.06,PANTS_D,-0.18,0.09,0.10*side));
      /* jahitan samping */
      g.add(this.pl(0.02,0.28,0.02,PANTS_D,-0.18,0.0,-0.10*side));
      const shin=new THREE.Group();shin.position.y=-0.34;
      shin.add(this.pl(0.165,0.3,0.19,PANTS,-0.15));
      /* pelindung lutut kulit + pembalut kain di tulang kering */
      shin.add(this.pl(0.185,0.08,0.20,0x53401f,-0.02,0.01));
      shin.add(this.pl(0.19,0.03,0.21,LEATHER_D,-0.06,0.015));
      shin.add(this.pl(0.175,0.05,0.20,0x6a5230,-0.14));
      shin.add(this.pl(0.175,0.04,0.20,0x6a5230,-0.21));
      /* sepatu: bagian atas, badan, lalu sol gelap */
      shin.add(this.pl(0.195,0.09,0.22,BOOT,-0.26,0.01));
      shin.add(this.pl(0.2,0.1,0.26,BOOT,-0.31,0.03));
      shin.add(this.pl(0.21,0.035,0.29,0x241a10,-0.37,0.05));
      /* ujung sepatu + tali */
      shin.add(this.pl(0.14,0.06,0.08,BOOT,-0.33,0.14));
      shin.add(this.pl(0.16,0.02,0.02,LEATHER_D,-0.28,0.10));
      g.add(shin);g.userData.shin=shin;body.add(g);return g;
    };
    const legL=mkLeg(1),legR=mkLeg(-1);

    /* --- torso berlapis --- */
    const torso=new THREE.Group();torso.position.y=0.66;body.add(torso);
    torso.add(this.pl(0.42,0.14,0.28,TUNIC_D,0.07));
    torso.add(this.pl(0.46,0.22,0.28,TUNIC,0.25));
    torso.add(this.pl(0.54,0.26,0.31,TUNIC,0.49));
    torso.add(this.pl(0.58,0.08,0.33,TUNIC_D,0.66));
    /* rok tunik menjuntai di atas pinggul */
    torso.add(this.pl(0.50,0.10,0.30,TUNIC_D,0.02));
    torso.add(this.pl(0.16,0.09,0.05,TUNIC_D,-0.05,0.15));
    torso.add(this.pl(0.16,0.09,0.05,TUNIC_D,-0.05,-0.15));
    /* ikat pinggang + gesper emas berkilau */
    torso.add(this.pl(0.48,0.07,0.30,BELT,0.14));
    torso.add(this.pl(0.1,0.09,0.32,0xc9a227,0.14));
    torso.add(this.pl(0.05,0.05,0.02,0xffe9a0,0.14,0.17));
    /* kantung kulit di sisi pinggang (dengan tali pengikat) */
    torso.add(this.pl(0.10,0.11,0.09,LEATHER,0.10,0.02,0.24));
    torso.add(this.pl(0.11,0.03,0.10,0x3f2c17,0.16,0.02,0.24));
    torso.add(this.pl(0.03,0.08,0.02,LEATHER_D,0.12,0.02,0.29));
    /* kantung kecil di sisi lain */
    torso.add(this.pl(0.08,0.09,0.07,LEATHER_D,0.08,0.02,-0.24));
    torso.add(this.pl(0.09,0.025,0.08,0x3f2c17,0.13,0.02,-0.24));
    /* dua tali bahu menyilang dada */
    const strap=this.pl(0.5,0.07,0.02,0x5c3f24,0.42,0.165);
    strap.rotation.z=0.55;torso.add(strap);
    const strap2=this.pl(0.46,0.05,0.02,0x4a3319,0.44,-0.17);
    strap2.rotation.z=-0.5;torso.add(strap2);
    /* gesper tali */
    torso.add(this.pl(0.06,0.06,0.03,0xc9a227,0.38,0.165,0.10));
    /* kerah tunik, jahitan tengah, dan panel dada */
    torso.add(this.pl(0.40,0.06,0.34,TUNIC_L,0.63,0.01));
    torso.add(this.pl(0.03,0.30,0.02,TUNIC_D,0.47,0.158));
    torso.add(this.pl(0.20,0.16,0.02,TUNIC_L,0.52,0.16,0.12));
    torso.add(this.pl(0.20,0.16,0.02,TUNIC_L,0.52,0.16,-0.12));
    /* kancing dada */
    torso.add(this.pl(0.03,0.03,0.02,0xc9a227,0.56,0.165,0.0));
    torso.add(this.pl(0.03,0.03,0.02,0xc9a227,0.48,0.165,0.0));
    /* BUGFIX kepala-leher: leher lama (0.16,0.1,0.16 @ 0.72) terlalu pendek —
       puncaknya y≈1.43 padahal dagu kepala mulai y≈1.45, sehingga kepala
       terlihat mengambang terpisah dari badan. Leher kini lebih tebal & tinggi
       (puncak y≈1.61) dan overlap dengan rahang bawah kepala. */
    torso.add(this.pl(0.18,0.30,0.18,SKIN_D,0.80));
    /* kalung liontin kecil */
    torso.add(this.pl(0.02,0.12,0.02,0x8f6d1c,0.62,0.14));
    torso.add(this.pl(0.05,0.05,0.02,0x4a9fd9,0.56,0.15));

    /* --- lengan: bahu + lengan bawah + tangan --- */
    const mkArm=(side)=>{
      const g=new THREE.Group();g.position.set(0.35*side,1.29,0);
      /* tutup bahu + lengan atas yang menyempit di siku */
      g.add(this.pl(0.19,0.09,0.20,TUNIC_D,0.01));
      g.add(this.pl(0.20,0.05,0.21,TUNIC_D,0.04));
      g.add(this.pl(0.17,0.26,0.18,TUNIC,-0.13));
      g.add(this.pl(0.155,0.06,0.17,TUNIC_D,-0.24));
      /* jahitan lengan */
      g.add(this.pl(0.02,0.22,0.02,TUNIC_D,-0.13,0.0,0.09*side));
      const fore=new THREE.Group();fore.position.y=-0.26;
      fore.add(this.pl(0.145,0.25,0.16,SKIN,-0.13));
      /* bracer kulit dengan dua tali pengikat */
      fore.add(this.pl(0.17,0.10,0.18,LEATHER,-0.05));
      fore.add(this.pl(0.18,0.025,0.19,0x3f2c17,-0.02));
      fore.add(this.pl(0.18,0.025,0.19,0x3f2c17,-0.09));
      /* gesper bracer */
      fore.add(this.pl(0.04,0.04,0.02,0xc9a227,-0.05,0.0,0.10*side));
      /* pergelangan + kepalan tangan.
         Referensi mesh kepalan disimpan supaya pose bertinju bisa
         menebalkannya tanpa menebak indeks anak (armR juga memuat pedang). */
      fore.add(this.pl(0.13,0.05,0.14,SKIN,-0.24));
      const fist=this.pl(0.15,0.12,0.15,SKIN_D,-0.31);
      fore.add(fist);
      const knuckle=this.pl(0.155,0.04,0.15,SKIN,-0.28);
      fore.add(knuckle);
      /* jari-jari */
      fore.add(this.pl(0.035,0.06,0.13,SKIN_D,-0.31,0.0,0.06));
      fore.add(this.pl(0.035,0.06,0.13,SKIN_D,-0.31,0.0,-0.06));
      fore.add(this.pl(0.035,0.07,0.13,SKIN_D,-0.31,0.0,0.0));
      /* ibu jari */
      fore.add(this.pl(0.04,0.05,0.06,SKIN_D,-0.29,0.05,0.09*side));
      fore.userData.fist=fist;fore.userData.knuckle=knuckle;
      g.add(fore);g.userData.fore=fore;body.add(g);return g;
    };
    const armL=mkArm(1),armR=mkArm(-1);

    /* --- pedang: model 3D unik per senjata (REWORK) ---
       Setiap pedang kini punya file sendiri di js/player/weapons/ dengan
       bentuk + aura dinamis khas (WeaponSwordWood/Iron/Storm/Venom/Frost/Titan).
       Mesh dibangun & dipasang oleh refreshWeapon() lewat WeaponManager
       (dipanggil refreshArmor di akhir buildModel) — tidak lagi dibangun
       inline di sini, sehingga mengganti senjata mengganti seluruh model. */

    /* --- kepala: wajah, rambut, telinga, alis ---
        BUGFIX kepala-terlepas: kepala dulu anak `body` (saudara torso), sehingga
        saat torso miring (lari/dash) kepala TIDAK ikut miring → terlihat lepas
        dari leher. Sekarang kepala dijadikan ANAK TORSE (torso.add) sehingga
        TERKUNCI mengikuti rotasi torso: badan miring → kepala ikut miring, dan
        kepala tetap menempel di leher karena leher juga anak torso.
        Posisi lokal (0,0.80,0) relatif torso = posisi dunia lama (0,1.46,0),
        jadi tinggi kepala tidak berubah saat torso tegak. */
    const head=new THREE.Group();head.position.set(0,0.80,0);torso.add(head);
    head.add(this.pl(0.4,0.4,0.38,SKIN,0.2));
    /* rahang & pipi sedikit lebih sempit dari tengkorak */
    head.add(this.pl(0.34,0.10,0.34,SKIN_D,0.04));
    head.add(this.pl(0.26,0.12,0.05,SKIN_D,0.12,0.19));
    /* tulang pipi */
    head.add(this.pl(0.08,0.06,0.04,SKIN_L,0.16,0.17,0.14));
    head.add(this.pl(0.08,0.06,0.04,SKIN_L,0.16,0.17,-0.14));
    /* rambut: batok, jambul depan, cambang, dan tengkuk */
    head.add(this.pl(0.44,0.13,0.42,HAIR,0.42));
    head.add(this.pl(0.42,0.09,0.10,HAIR,0.36,0.17));
    head.add(this.pl(0.30,0.07,0.08,HAIR_D,0.40,0.20));
    head.add(this.pl(0.44,0.16,0.08,HAIR_D,0.3,-0.18));
    head.add(this.pl(0.06,0.20,0.30,HAIR,0.32,-0.02,0.20));
    head.add(this.pl(0.06,0.20,0.30,HAIR,0.32,-0.02,-0.20));
    /* helai rambut tambahan */
    head.add(this.pl(0.08,0.12,0.06,HAIR_D,0.38,0.14,0.10));
    head.add(this.pl(0.08,0.12,0.06,HAIR_D,0.38,0.14,-0.10));
    /* telinga: daun + rongga dalam */
    head.add(this.pl(0.05,0.12,0.09,SKIN_D,0.2,0,0.21));
    head.add(this.pl(0.05,0.12,0.09,SKIN_D,0.2,0,-0.21));
    head.add(this.pl(0.02,0.06,0.05,0xb98a68,0.2,0,0.235));
    head.add(this.pl(0.02,0.06,0.05,0xb98a68,0.2,0,-0.235));
    const eyeM=new THREE.MeshLambertMaterial({color:0x2a2118});
    const scleraM=new THREE.MeshLambertMaterial({color:0xf6f1e6});
    for(const x of[0.095,-0.095]){
      /* putih mata di belakang pupil supaya tatapan lebih hidup */
      const s=new THREE.Mesh(new THREE.BoxGeometry(0.085,0.075,0.02),scleraM);
      s.position.set(x,0.22,0.19);head.add(s);
      const e=new THREE.Mesh(new THREE.BoxGeometry(0.055,0.075,0.02),eyeM);
      e.position.set(x,0.22,0.195);head.add(e);
      /* iris berwarna */
      const iris=new THREE.Mesh(new THREE.BoxGeometry(0.035,0.05,0.02),
        new THREE.MeshLambertMaterial({color:0x4a7a5a}));
      iris.position.set(x,0.22,0.198);head.add(iris);
      /* kilau mata */
      const gl=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.02,0.01),
        new THREE.MeshBasicMaterial({color:0xffffff}));
      gl.position.set(x+0.015,0.245,0.205);head.add(gl);
      /* alis tebal + kelopak bawah */
      head.add(this.pl(0.09,0.035,0.02,HAIR_D,0.30,0.196,x));
      head.add(this.pl(0.085,0.02,0.02,SKIN_D,0.185,0.198,x));
    }
    /* hidung, mulut, dan dagu */
    head.add(this.pl(0.05,0.05,0.04,SKIN_D,0.155,0.2));
    head.add(this.pl(0.04,0.02,0.02,0xb98a68,0.135,0.205));
    head.add(this.pl(0.1,0.02,0.02,0xb07a6a,0.09,0.196));
    head.add(this.pl(0.12,0.05,0.03,SKIN_D,0.045,0.185));
    /* bekas luka kecil di pipi (karakter detail) */
    head.add(this.pl(0.015,0.06,0.01,0xc9856a,0.14,0.19,0.12));

    /* --- wadah armor --- */
    this.armorG={helm:new THREE.Group(),chest:new THREE.Group(),
      bootL:new THREE.Group(),bootR:new THREE.Group(),
      pauldL:new THREE.Group(),pauldR:new THREE.Group(),
      /* tameng (khusus karakter utama) menempel di lengan kiri */
      shield:new THREE.Group()};
    head.add(this.armorG.helm);
    torso.add(this.armorG.chest);
    legL.userData.shin.add(this.armorG.bootL);
    legR.userData.shin.add(this.armorG.bootR);
    armL.add(this.armorG.pauldL);armR.add(this.armorG.pauldR);
    armL.add(this.armorG.shield);

    /* parts.sword diisi refreshWeapon() (model pedang per senjata) */
    this.parts={...this.parts,legL,legR,armL,armR,head,torso,sword:null};
    Game.scene.add(this.mesh);
    this.refreshArmor();
  },

  /* ---------- bangun ulang mesh armor sesuai equipment ----------
     Setiap tier punya SILUET khas agar mudah dibedakan:
       leather = kain sederhana, iron = pelat + paku keling,
       gold    = ornamen mahkota + jubah, crystal = kristal menyala + duri. */
  refreshArmor(){
    if(!this.armorG.helm)return;
    for(const k in this.armorG){
      if(k==='shield')continue;  // dibersihkan & dibangun ulang oleh refreshShield()
      const g=this.armorG[k];
      while(g.children.length){
        const c=g.children.pop();
        if(c.geometry)c.geometry.dispose();
        if(c.material)c.material.dispose();
      }
    }
    const eq=(typeof RPG!=='undefined'&&RPG.equip)?RPG.equip:{};
    const glowMat=(color)=>new THREE.MeshPhongMaterial({color,emissive:color,
      emissiveIntensity:0.55,transparent:true,opacity:0.9,shininess:100});

    /* ===== HELM =====
       BUGFIX helm-rambut: helm lama berukuran hampir sama persis dengan
       batok rambut (mis. kubah leather 0.44×0.42 vs rambut 0.44×0.42) sehingga
       permukaan keduanya berimpit → Z-fighting "kedip-kedip", dan jambul depan
       (z 0.24) menembus keluar kubah besi (z 0.22). Semua helm kini diperbesar:
       kubah 0.54×0.26×0.52 (menutupi rambut + margin), rim lebih lebar,
       pelat pipi digeser keluar, dan mata (y≈0.22) tetap terlihat di bawah
       rim (y≥0.30). */
    const eHelm=(typeof RPG!=='undefined'&&RPG.equipId)?RPG.equipId('helm'):(eq.helm||null);
    if(eHelm&&ITEMS[eHelm]){
      const t=ITEMS[eHelm].armor.tier,C=ARMOR_TIER[t],G=this.armorG.helm;
      if(t==='leather'){
        /* topi kulit: kubah besar + tepi lebar */
        G.add(this.pl(0.54,0.26,0.52,C.main,0.46));
        G.add(this.pl(0.58,0.07,0.56,C.trim,0.34));
      }else if(t==='iron'){
        /* helm besi: kubah + visor depan + pelat pipi + paku keling */
        G.add(this.pl(0.54,0.26,0.52,C.main,0.46));
        G.add(this.pl(0.58,0.08,0.56,C.trim,0.33));
        G.add(this.pl(0.08,0.2,0.1,C.metal,0.30,0.29));          // visor hidung
        G.add(this.pl(0.08,0.28,0.38,C.trim,0.26,0,0.25));       // pipi kanan
        G.add(this.pl(0.08,0.28,0.38,C.trim,0.26,0,-0.25));      // pipi kiri
        G.add(this.pl(0.05,0.1,0.05,C.metal,0.62));              // paku atas
      }else if(t==='gold'){
        /* helm emas mahkota: kubah + 3 sirip mahkota + pelat pipi */
        G.add(this.pl(0.54,0.26,0.52,C.main,0.46));
        G.add(this.pl(0.58,0.08,0.56,C.trim,0.33));
        G.add(this.pl(0.06,0.24,0.08,C.metal,0.66,0,0));         // sirip tengah
        G.add(this.pl(0.05,0.18,0.06,C.metal,0.62,0,0.15));      // sirip samping
        G.add(this.pl(0.05,0.18,0.06,C.metal,0.62,0,-0.15));
        G.add(this.pl(0.08,0.28,0.38,C.trim,0.26,0,0.25));
        G.add(this.pl(0.08,0.28,0.38,C.trim,0.26,0,-0.25));
        G.add(this.pl(0.1,0.06,0.1,C.metal,0.34,0.29));          // ornamen dahi
      }else{ /* crystal */
        /* helm kristal: kubah + tanduk kristal menyala + pelat pipi */
        G.add(this.pl(0.54,0.26,0.52,C.main,0.46));
        G.add(this.pl(0.58,0.08,0.56,C.trim,0.33));
        const spike=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.26,0.07),glowMat(C.metal));
        spike.position.y=0.68;G.add(spike);
        const s2=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.16,0.05),glowMat(C.metal));
        s2.position.set(0.17,0.60,0);G.add(s2);
        const s3=s2.clone();s3.position.x=-0.17;G.add(s3);
        G.add(this.pl(0.08,0.28,0.38,C.trim,0.26,0,0.25));
        G.add(this.pl(0.08,0.28,0.38,C.trim,0.26,0,-0.25));
      }
    }

    /* ===== CHEST + PAULDRON ===== */
    const eChest=(typeof RPG!=='undefined'&&RPG.equipId)?RPG.equipId('chest'):(eq.chest||null);
    if(eChest&&ITEMS[eChest]){
      const t=ITEMS[eChest].armor.tier,C=ARMOR_TIER[t],G=this.armorG.chest;
      if(t==='leather'){
        /* rompi kulit: panel depan + tali silang */
        G.add(this.pl(0.58,0.28,0.34,C.main,0.49));
        G.add(this.pl(0.5,0.18,0.32,C.trim,0.27));
        const strap=this.pl(0.48,0.05,0.02,C.metal,0.45,0.17);
        strap.rotation.z=0.5;G.add(strap);
      }else if(t==='iron'){
        /* zirah besi: pelat dada + paku keling + sabuk logam */
        G.add(this.pl(0.6,0.3,0.36,C.main,0.49));
        G.add(this.pl(0.52,0.2,0.33,C.trim,0.26));
        G.add(this.pl(0.62,0.06,0.37,C.metal,0.64));
        G.add(this.pl(0.1,0.22,0.03,C.metal,0.5,0.19));         // garis tengah
        G.add(this.pl(0.05,0.05,0.04,C.metal,0.56,0.17,0.14));  // keling
        G.add(this.pl(0.05,0.05,0.04,C.metal,0.56,0.17,-0.14));
      }else if(t==='gold'){
        /* zirah emas: pelat + emblem singa + jubah belakang + trim berlapis */
        G.add(this.pl(0.6,0.3,0.36,C.main,0.49));
        G.add(this.pl(0.52,0.2,0.33,C.trim,0.26));
        G.add(this.pl(0.62,0.06,0.37,C.metal,0.64));
        G.add(this.pl(0.64,0.05,0.38,C.metal,0.34));            // sabuk emas
        G.add(this.pl(0.18,0.18,0.04,C.metal,0.5,0.2));         // emblem dada
        G.add(this.pl(0.1,0.1,0.05,C.trim,0.5,0.2));            // inti emblem
        const cape=this.pl(0.44,0.4,0.03,0x9E1B1B,0.3,-0.19);   // jubah merah
        G.add(cape);
      }else{ /* crystal */
        /* zirah kristal: pelat + inti kristal menyala + duri bahu */
        G.add(this.pl(0.6,0.3,0.36,C.main,0.49));
        G.add(this.pl(0.52,0.2,0.33,C.trim,0.26));
        G.add(this.pl(0.62,0.06,0.37,C.metal,0.64));
        const core=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.14,0.06),glowMat(C.metal));
        core.position.set(0,0.5,0.2);core.rotation.y=Math.PI/4;G.add(core);
        G.add(this.pl(0.2,0.2,0.02,C.metal,0.52,0.195));
      }
      /* pauldron berbeda per tier */
      for(const g of[this.armorG.pauldL,this.armorG.pauldR]){
        if(t==='leather'){
          g.add(this.pl(0.2,0.1,0.22,C.main,-0.02));
        }else if(t==='iron'){
          g.add(this.pl(0.24,0.12,0.26,C.main,-0.02));
          g.add(this.pl(0.2,0.06,0.22,C.metal,0.06));
        }else if(t==='gold'){
          g.add(this.pl(0.26,0.14,0.28,C.main,-0.02));
          g.add(this.pl(0.22,0.07,0.24,C.metal,0.07));
          g.add(this.pl(0.06,0.12,0.06,C.metal,0.12));          // sirip pauldron
        }else{
          g.add(this.pl(0.24,0.13,0.26,C.main,-0.02));
          const sp=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.14,0.05),glowMat(C.metal));
          sp.position.set(0,0.1,0);g.add(sp);
        }
      }
    }

    /* ===== BOOTS ===== */
    const eBoots=(typeof RPG!=='undefined'&&RPG.equipId)?RPG.equipId('boots'):(eq.boots||null);
    if(eBoots&&ITEMS[eBoots]){
      const t=ITEMS[eBoots].armor.tier,C=ARMOR_TIER[t];
      for(const g of[this.armorG.bootL,this.armorG.bootR]){
        if(t==='leather'){
          g.add(this.pl(0.2,0.16,0.2,C.main,-0.2));
          g.add(this.pl(0.22,0.09,0.27,C.trim,-0.31,0.04));
        }else if(t==='iron'){
          g.add(this.pl(0.21,0.2,0.21,C.main,-0.18));
          g.add(this.pl(0.23,0.11,0.29,C.trim,-0.31,0.04));
          g.add(this.pl(0.19,0.07,0.2,C.metal,-0.06));         // pelat tulang kering
        }else if(t==='gold'){
          g.add(this.pl(0.21,0.22,0.21,C.main,-0.17));
          g.add(this.pl(0.23,0.11,0.29,C.trim,-0.31,0.04));
          g.add(this.pl(0.19,0.09,0.2,C.metal,-0.05));
          g.add(this.pl(0.05,0.08,0.05,C.metal,-0.02,0,0.1));   // ornamen
        }else{ /* crystal */
          g.add(this.pl(0.21,0.22,0.21,C.main,-0.17));
          g.add(this.pl(0.23,0.11,0.29,C.trim,-0.31,0.04));
          const gl=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.1,0.05),glowMat(C.metal));
          gl.position.set(0,-0.08,0);g.add(gl);
        }
      }
    }
    this.refreshShield();
    this.refreshWeapon();
  },

  /* ---------- pasang model tameng sesuai slot shield ----------
     Model voxel unik per tameng dibangun ShieldModels (js/player/shields.js)
     dan ditempel di lengan kiri (armorG.shield). Hanya karakter utama yang
     punya slot tameng — NPC/rekan tidak. */
  refreshShield(){
    if(!this.armorG||!this.armorG.shield)return;
    const G=this.armorG.shield;
    while(G.children.length){
      const c=G.children.pop();
      c.traverse(o=>{if(o.isMesh){if(o.geometry)o.geometry.dispose();}});
    }
    const id=(typeof RPG!=='undefined'&&RPG.equipId)?RPG.equipId('shield'):null;
    if(!id||typeof ShieldModels==='undefined')return;
    const m=ShieldModels.buildFor(id);
    if(!m)return;
    /* posisi di lengan kiri: menutup sisi depan-kiri tubuh, papan menghadap +Z */
    m.position.set(0.02,-0.42,0.16);
    G.add(m);
  },

  /* ---------- pasang model pedang sesuai senjata yang digenggam ----------
     Tiap senjata punya model 3D unik di js/player/weapons/ (bukan lagi satu
     mesh yang diwarnai ulang). refreshWeapon() membuang mesh lama lalu
     membangun & memasang model baru lewat WeaponManager. Posisi grip &
     rotasi sudah disetel masing-masing builder (gagang di kepalan, bilah
     memanjang ke depan setelah rotasi -90° di X). */
  refreshWeapon(){
    const fore=this.parts.armR&&this.parts.armR.userData.fore;
    if(!fore)return;
    /* copot & buang senjata/item lama */
    for(let i=fore.children.length-1;i>=0;i--){
      const c=fore.children[i];
      if(c.name&&(c.name.indexOf('Weapon_')===0||c.name.indexOf('Held_')===0)){
        fore.remove(c);
        c.traverse(o=>{if(o.geometry)o.geometry.dispose();
          if(o.material)o.material.dispose();});
      }
    }
    const id=(typeof RPG!=='undefined'&&RPG.weaponId)?RPG.weaponId():null;
    this.unarmed=!id;
    this.parts.sword=null;
    if(id&&typeof WeaponManager!=='undefined'){
      WeaponManager.attachToCharacterHand(this.parts,id);
      const sw=this.parts.sword;
      if(sw){
        /* Posisi grip di kepalan (y=-0.31 dari fore). Builder menyetel z=0.02,
           tapi itu membuat tangan jatuh di pangkal bilah (terlihat memegang
           mata pisau). Semua gagang pedang berada di lokal y≈0.22-0.235, jadi
           digeser maju ke z=0.22 agar gagang pas di kepalan & bilah memanjang
           ke depan. Rotasi -90° X memetakan bilah (-Y lokal) ke +Z (depan). */
        sw.position.set(0,-0.31,0.22);
        sw.rotation.x=-Math.PI/2;
        /* kompatibilitas nyala combo (updateSwordGlow): kumpulkan material
           ber-emissive sebagai glowMats + warna dasarnya. Grup aura (userData.fx)
           dianimasikan builder sendiri via tick(), jadi dilewati agar tidak
           bentrok. Material tanpa emissive (kaca/edge transparan) ikut lewat
           marker null supaya opacity-nya bisa dipulsa & dipulihkan. */
        const skip=new Set();
        if(sw.userData.fx)for(const k in sw.userData.fx){
          const o=sw.userData.fx[k];
          if(o&&o.traverse)o.traverse(x=>skip.add(x));
        }
        const gm=[],be=[],bo=[];
        sw.traverse(o=>{
          if(skip.has(o)||!o.material)return;
          const m=o.material;
          if(m.emissive&&typeof m.emissive.getHex==='function'){
            gm.push(m);be.push(m.emissive.getHex());bo.push(-1);
          }else if(m.transparent){
            gm.push(m);be.push(null);bo.push(m.opacity);
          }
        });
        sw.userData.glowMats=gm;
        sw.userData.baseEmissive=be;
        sw.userData.baseOpacity=bo;
      }
    }
    /* item non-senjata yang sedang dipilih di hotbar ikut muncul di tangan
       (ala Minecraft). Posisi/rotasi mengikuti data hold model; default
       diarahkan ke depan seperti memegang pedang. */
    const held=(typeof RPG!=='undefined'&&RPG.heldId)?RPG.heldId():null;
    if(!id&&held&&typeof HeldModels!=='undefined'){
      const h=HeldModels.build(held);
      const hold=h.userData.hold||{};
      const hp=hold.pos||[0,-0.31,0.22];
      const hr=hold.rot||[Math.PI/2,0,0];
      h.position.set(hp[0],hp[1],hp[2]);
      h.rotation.set(hr[0],hr[1],hr[2]);
      if(hold.scale)h.scale.setScalar(hold.scale);
      fore.add(h);
      /* tandai sebagai item yang sedang dipegang */
      this.parts.sword=h;
    }
    /* Tanpa senjata pemain bertarung dengan kepalan; tapi jika sedang memegang
       item (makanan/alat), tangan tidak dibuat mengepal tebal. */
    this.setFistPose(this.unarmed&&!held);
    /* warna trail ayunan ikut rarity senjata; kepalan pakai warna 'crush' */
    const rarity=(id&&ITEMS[id]&&ITEMS[id].rarity)||'common';
    const rc=(RARITY[rarity]||RARITY.common).c;
    this.weaponFxColor=this.unarmed?EFFECTS.crush.c:rc;
  },

  /* cek perubahan item hotbar terpilih -> ganti model tangan bila perlu */
  updateHeld(){
    const id=(typeof RPG!=='undefined'&&RPG.heldId)?RPG.heldId():null;
    if(id!==this._heldId){
      this._heldId=id;
      this.refreshWeapon();
    }
  },

  /* ---------- pose tangan kosong ----------
     Kepalan hanya ditebalkan (scale) memakai mesh tangan yang sudah ada,
     jadi tidak ada geometri baru yang perlu dibuat/dibuang tiap ganti senjata. */
  setFistPose(on){
    for(const key of['armL','armR']){
      const arm=this.parts[key];
      if(!arm||!arm.userData.fore)continue;
      const fore=arm.userData.fore;
      if(fore.userData.fist)fore.userData.fist.scale.setScalar(on?1.3:1);
      if(fore.userData.knuckle)fore.userData.knuckle.scale.setScalar(on?1.25:1);
    }
  },


  /* ---------- aksi ---------- */
  tryJump(){
    if(this.dead)return;
    if(this.onGround){this.vel.y=CFG.PLAYER.jump;this.onGround=false;this.airJumped=false;
      Sfx.jump();
      if(typeof Prof!=='undefined')Prof.gain('agility',2,1);
      if(this.inWater)FX.ripple(this.pos.x,CFG.WATER_Y,this.pos.z,0xdff2fa,2);}
    else if(this.inWater){this.vel.y=3.6;}
    /* LOMPAT GANDA (skill 'djump'): sekali lagi tekan lompat saat di udara,
       vel.y di-reset (sedikit lebih kuat dari lompatan pertama) sehingga total
       lompatan mencapai ~3 blok — cukup untuk memanjat tebing 3 blok. Hanya
       boleh 1x per lompatan (flag airJumped, di-reset saat mendarat). */
    else if(RPG.skillVal('djump')&&!this.airJumped){
      this.vel.y=CFG.PLAYER.jump*1.15;this.airJumped=true;
      Sfx.jump();
      FX.debris(this.pos.clone().add(new THREE.Vector3(0,0.3,0)),0xbfe4ff,6,1.6);
      FX.ring(this.pos.x,this.pos.y+0.2,this.pos.z,0x8fe0ff,0.5,2.2);
    }
  },

  /* ---------- LOMPATAN HANTAM BUMI TERARAH (SlamAim) ----------
     Terbang mengikuti busur dari posisi sekarang ke (tx,tz); saat mendarat
     langsung menghantam tanah (RPG.doSlamAt). Selama lompatan, fisika & gerak
     normal dilewati (di-handle update()). */
  startSlamLeap(tx,tz){
    const dx=tx-this.pos.x,dz=tz-this.pos.z;
    const dist=Math.hypot(dx,dz);
    this.slamLeap={sx:this.pos.x,sy:this.pos.y,sz:this.pos.z,tx,tz,t:0,
      dur:clamp(dist/13,0.32,0.62),arc:clamp(1.8+dist*0.22,2,3.4)};
    if(dist>0.01)this.facing=Math.atan2(dx,dz);
    this.vel.set(0,0,0);
    this.onGround=false;
    /* efek lepas landas: debu + suara lompat. Pose hantam baru diputar saat
       mendarat (bukan di sini) supaya selama terbang terlihat melompat. */
    FX.debris(new THREE.Vector3(this.pos.x,this.pos.y+0.2,this.pos.z),0xc9b48a,9,2.6);
    Sfx.jump();
  },
  updateSlamLeap(dt){
    const L=this.slamLeap;
    L.t+=dt;
    const p=clamp(L.t/L.dur,0,1);
    this.pos.x=lerp(L.sx,L.tx,p);
    this.pos.z=lerp(L.sz,L.tz,p);
    const gy=World.groundAt(this.pos.x,this.pos.z,L.sy+3);
    this.pos.y=lerp(L.sy,gy,p)+Math.sin(p*Math.PI)*L.arc;
    this.vel.set(0,0,0);
    /* anggap melayang supaya animate() memakai pose 'jump' (terlihat melompat,
       bukan diam meluncur) */
    this.onGround=false;this.inWater=false;
    this.animate(dt,false,0,false);
    /* SINKRONISASI MESH: biasanya dilakukan di akhir update() yang dilewati
       selama lompatan. Tanpa ini model tidak mengikuti busur dan hanya
       "pindah tempat" di akhir. */
    if(this.mesh){this.mesh.position.copy(this.pos);this.mesh.rotation.y=this.facing;}
    if(p>=1){
      this.pos.y=gy;this.onGround=true;this.airJumped=false;
      this.slamLeap=null;
      if(this.playSkillAnim)this.playSkillAnim('slam');   // pose hantaman saat mendarat
      if(typeof RPG!=='undefined'&&RPG.doSlamAt)RPG.doSlamAt(this.pos.x,this.pos.y,this.pos.z);
    }
  },
  tryDodge(){
    if(this.dead||this.dodge.active||this.dodge.cd>0)return;
    const cost=20*RPG.stamCostMult();
    if(this.stamina<cost){UI.toast('⚡ Stamina kurang!');Sfx.noStamina();return;}
    this.stamina-=cost;
    const mv=Input.moveVec();
    const dir=(mv.x||mv.z)?new THREE.Vector3(mv.x,0,mv.z).normalize()
      :new THREE.Vector3(Math.sin(this.facing),0,Math.cos(this.facing));
    this.dodge.active=true;this.dodge.t=0;this.dodge.dir.copy(dir);
    this.dodge.cd=RPG.dodgeCD();
    this.attack.active=false;
    if(typeof Prof!=='undefined')Prof.gain('agility',5,1);
    Sfx.dash();
    if(this.inWater){FX.ripple(this.pos.x,CFG.WATER_Y,this.pos.z,0xdff2fa,2.6);Sfx.splash(false);}
  },
   tryAttack(){
     if(this.dead||this.dodge.active)return;
     /* pertanian: cangkul / tanam / panen memakai tombol serang */
     if(typeof Farming!=='undefined'&&Farming.tryUse(this))return;
     /* makanan: klik/tombol serang dipakai untuk makan saat sedang memegang
        makanan (ala Minecraft), bukan memukul. */
     if(typeof RPG!=='undefined'&&RPG.tryEatSelected&&RPG.tryEatSelected())return;
     if(this.attack.active){this.attack.queued=true;return;}
     if(this.stamina<3){UI.toast('⚡ Terlalu lelah!');Sfx.noStamina();return;}
     this.stamina-=5*RPG.stamCostMult();this.stamRegenT=0.5;
     let next=(this.attack.sinceEnd<0.95*RPG.comboWindowMult()&&this.attack.combo<4)?this.attack.combo+1:0;
     this.attack={active:true,combo:next,t:0,hitDone:false,queued:false,sinceEnd:0};
     /* auto-aim ke monster terdekat */
     let best=null,bd=4.2;
     for(const m of Monsters.list){
       if(m.dead)continue;
       const d=m.pos.distanceTo(this.pos);
       if(d<bd){bd=d;best=m;}
     }
     if(best)this.facing=Math.atan2(best.pos.x-this.pos.x,best.pos.z-this.pos.z);
     /* posisi efek: dari bilah bila memegang pedang, dari kepalan bila bertinju */
     const fxPos=new THREE.Vector3();
     const src=this.unarmed
       ? (this.parts.armR&&this.parts.armR.userData.fore)
       : this.parts.sword;
     if(src)src.getWorldPosition(fxPos);
     else fxPos.copy(this.pos).add(new THREE.Vector3(0,1.1,0));

     if(this.unarmed){
       /* tinju: suara & efek tumpul-pendek, bukan sabetan bilah */
       Sfx.punch(next);
       FX.punch(fxPos,this.facing,next);
       /* tidak ada bilah yang menyala saat bertangan kosong */
       this.swordGlow=0;
     }else{
       Sfx.swing(next);
       FX.trail(fxPos,this.facing,COMBOS[next].vert,next);
       /* nyala pedang: makin tinggi combo makin terang & makin lama meredup.
          Warna dasar mengikuti rarity senjata agar pedang langka terlihat khas,
          lalu bergeser ke warna combo saat rangkaian serangan makin tinggi. */
       this.swordGlow=[0.45,0.55,0.7,0.85,1.0][next]||0.5;
       const comboC=[0x4dd0ff,0x4dd0ff,0x7dff9d,0xffd24d,0xff6b57][next]||0x4dd0ff;
       this.swordGlowColor=this.weaponFxColor!==undefined
         ? new THREE.Color(this.weaponFxColor).lerp(new THREE.Color(comboC),next/6).getHex()
         : comboC;
     }

   },

  /* --- animasi nyala pedang: emissive + opacity mata bilah meredup halus --- */
  updateSwordGlow(dt){
    const sw=this.parts.sword;
    if(!sw||!sw.userData.glowMats)return;
    if(this.swordGlow===undefined)this.swordGlow=0;
    if(this.swordGlow<=0.001){
      if(this.swordGlowDirty){
        this.swordGlowDirty=false;
        sw.userData.glowMats.forEach((m,i)=>{
          const base=sw.userData.baseEmissive[i];
          if(base!==null&&m.emissive)m.emissive.setHex(base);
          /* material tanpa emissive dipulihkan ke opacity aslinya */
          if(base===null&&sw.userData.baseOpacity)
            m.opacity=sw.userData.baseOpacity[i];
        });
      }
      return;
    }
    this.swordGlowDirty=true;
    /* denyut cepat supaya ayunan terasa hidup, bukan kilatan statis */
    const pulse=this.swordGlow*(0.8+0.2*Math.sin(performance.now()*0.03));
    const c=new THREE.Color(this.swordGlowColor||0x4dd0ff);
    sw.userData.glowMats.forEach((m,i)=>{
      const base=sw.userData.baseEmissive[i];
      if(base!==null&&m.emissive)
        m.emissive.setHex(base).lerp(c,clamp(pulse,0,1));
      else if(sw.userData.baseOpacity)
        m.opacity=clamp(sw.userData.baseOpacity[i]+pulse*0.45,0,1);
    });
    this.swordGlow=Math.max(0,this.swordGlow-dt*2.6);
  },
  /* ---------- efek unik senjata ----------
     Dipanggil sekali per monster yang terkena. Setiap efek hanya dimiliki
     satu pedang sehingga tiap senjata terasa berbeda saat dipakai. */
  applyWeaponFx(fx,m,dmg,ci){
    if(!fx)return;
    switch(fx){
      /* Bilah Besi: peluang pendarahan — damage kecil beruntun */
      case 'bleed':
        if(Math.random()<0.25){
          m.bleedHit=3;m.bleedT=0.6;m.bleedDmg=dmg*0.18;
          FX.text(m.pos.clone().add(new THREE.Vector3(0,2.4,0)),'🩸','#d64550');
        }
        break;
      /* Pedang Badai: petir melompat ke dua musuh lain di sekitar target */
      case 'shock':{
        let jumps=0;
        for(const o of Monsters.list){
          if(o===m||o.dead||jumps>=2)continue;
          if(o.pos.distanceTo(m.pos)>4.5)continue;
          jumps++;
          Monsters.hurt(o,dmg*0.5,new THREE.Vector3(0,0.2,0),1.5);
          FX.impact(o.pos.clone().add(new THREE.Vector3(0,1.1,0)),0xffe066,0.9);
        }
        if(jumps)FX.ring(m.pos.x,m.pos.y+0.05,m.pos.z,0xffe066,0.35,4.5);
        break;
      }
      /* Taring Racun: setiap pukulan menumpuk racun bertahap */
      case 'venomB':
        m.venomHit=Math.min(5,(m.venomHit||0)+2);
        m.venomT=m.venomT>0?m.venomT:0.8;
        m.venomDmg=dmg*0.12;
        FX.debris(m.pos.clone().add(new THREE.Vector3(0,1,0)),0x9ad84f,4,1.6);
        break;
      /* Pedang Fajar Beku: memperlambat gerak target */
      case 'frost':
        m.slowT=2.5;m.slowMul=0.55;
        FX.debris(m.pos.clone().add(new THREE.Vector3(0,1,0)),0x9fe8ff,6,1.8);
        FX.text(m.pos.clone().add(new THREE.Vector3(0,2.4,0)),'❄','#9fe8ff');
        break;
      /* Kepalan tangan: tanpa damage susulan, hanya menyentak gerak musuh
         sebentar. Ini membuat bertinju tetap berguna tapi jelas lebih lemah
         daripada efek pedang mana pun. */
      case 'crush':
        m.slowT=Math.max(m.slowT||0,0.9);m.slowMul=0.75;
        FX.debris(m.pos.clone().add(new THREE.Vector3(0,1.1,0)),EFFECTS.crush.c,3,1.1);
        break;
      /* Penghancur Titan: pukulan pamungkas melepas gelombang kejut area */
      case 'quake':
        if(ci===4){
          FX.shockwave(m.pos.x,m.pos.y+0.05,m.pos.z,0xff7a3c,5.2);
          for(const o of Monsters.list){
            if(o===m||o.dead)continue;
            if(o.pos.distanceTo(m.pos)>4.2)continue;
            const d=new THREE.Vector3().subVectors(o.pos,m.pos).setY(0.35).normalize();
            Monsters.hurt(o,dmg*0.45,d,6);
          }
          FX.addShake(0.8);
        }
        break;
    }
  },
  doHit(ci){
    const C=COMBOS[ci];

    const W=RPG.weapon();
    /* damage dasar kini berasal dari pedang yang digenggam (bukan angka tetap) */
    let dmg=RPG.weaponDmg()*C.dmg;
    if(ci===4)dmg*=RPG.slamMult();
    /* critical dari stat pedang: damage ganda + umpan balik visual */
    const crit=Math.random()<RPG.critChance();
    if(crit)dmg*=2;
    const reach=RPG.weaponReach();
    let hitAny=false;
    for(const m of Monsters.list){
      if(m.dead)continue;
      const dx=m.pos.x-this.pos.x,dz=m.pos.z-this.pos.z;
      const d=Math.hypot(dx,dz);
      if(d>reach)continue;
      const ang=Math.atan2(dx,dz);
      let diff=Math.abs(ang-this.facing);if(diff>Math.PI)diff=Math.PI*2-diff;
      if(diff>1.35&&d>1.0)continue;
      hitAny=true;
      Monsters.hurt(m,dmg,new THREE.Vector3(dx/d,0.3,dz/d),ci===4?(C.knock||5):3.5);
      /* rekan PASIF mengunci target yang diserang pemain */
      if(typeof NPCS!=='undefined'&&NPCS.onPlayerAttack)NPCS.onPlayerAttack(m);
      if(RPG.lifesteal()>0)this.hp=Math.min(this.maxHp(),this.hp+dmg*RPG.lifesteal());
      /* efek unik senjata dipicu di sini */
      this.applyWeaponFx(W.fx,m,dmg,ci);
      /* impact burst di titik tumbukan monster; critical memakai warna emas.
         Tinju memakai warna kulit-oranye & percikan lebih kecil supaya
         umpan baliknya terasa tumpul, bukan tebasan tajam. */
      const impactColor=crit?0xffe066:(this.unarmed?EFFECTS.crush.c:
        ([0x4dd0ff,0x4dd0ff,0x7dff9d,0xffd24d,0xff6b57][ci]||0x4dd0ff));
      const impactPower=((crit?1.6:1)+ci*0.25)*(this.unarmed?0.6:1);
      FX.impact(m.pos.clone().add(new THREE.Vector3(0,1,0)),impactColor,impactPower);
      if(crit){
        FX.text(m.pos.clone().add(new THREE.Vector3(0,2.1,0)),'CRIT!','#ffe066');
        FX.addShake(0.45);
      }
    }

    /* hit-stop: jeda singkat biar pukulan terasa berat */
    if(hitAny){
      this.hitStop=Math.min(0.09,0.03+ci*0.012);
      if(ci===4)FX.shockwave(this.pos.x+Math.sin(this.facing)*1.3,this.pos.y+0.1,this.pos.z+Math.cos(this.facing)*1.3,0xff6b57,4.5);
    }
    /* ikan yang berenang di perairan bisa ditangkap dengan serangan biasa
       (sistem FishSys — porting fish.html) */
    if(typeof FishSys!=='undefined'&&FishSys.checkHit(reach,this.facing))
      hitAny=true;
    /* ---------- pilih blok yang dipukul ----------
       Dulu hanya batang pohon (WOOD) yang dicari menyapu area, sementara
       batu & bijih memakai satu titik di depan pemain. Akibatnya bijih
       terasa "tidak kena" walau pemain sudah berdiri persis di sebelahnya,
       padahal menebang pohon terasa mudah.

       Sekarang SEMUA blok yang bisa ditambang dinilai dengan penyapuan yang
       sama. Bijih diberi bobot prioritas supaya saat bijih menempel di
       dinding batu, pukulan mengarah ke bijihnya lebih dulu. */
    const fy=Math.floor(this.pos.y+0.25);
    /* prioritas: makin kecil makin diutamakan pada jarak yang sama */
    const PRIO={
      [B.ORE_CRYSTAL]:-0.85,[B.ORE_GOLD]:-0.85,[B.ORE_IRON]:-0.85,
      [B.WOOD]:-0.25,[B.STONE]:0,[B.PLANK]:0,[B.ROOF]:0,
      [B.SAND]:0.25,[B.SNOW]:0.25,[B.GRASS]:0.45,[B.DIRT]:0.45,
    };
    const pcx=Math.floor(this.pos.x),pcz=Math.floor(this.pos.z);
    let blkHit=null,bestScore=Infinity;
    for(let z=Math.floor(this.pos.z-2.4);z<=Math.floor(this.pos.z+2.4);z++)
      for(let x=Math.floor(this.pos.x-2.4);x<=Math.floor(this.pos.x+2.4);x++){
        /* kolom tempat pemain berdiri dilewati supaya menyerang tidak
           menggali lantai di bawah kaki sendiri */
        if(x===pcx&&z===pcz)continue;
        /* Hanya setinggi kaki & kepala — sama seperti sebelumnya. Lapisan di
           bawah kaki sengaja TIDAK disertakan agar lantai tetap utuh. */
        for(const y of[fy,fy+1]){
          const id=World.getBlock(x,y,z);
          if(id===B.AIR||id===B.WATER||id===B.LEAF)continue;
          const prio=PRIO[id];
          if(prio===undefined)continue;
          /* Jarak diukur ke sisi terdekat kubus, bukan ke titik tengahnya.
             Inilah inti perbaikannya: bijih yang menempel di samping pemain
             dulu dianggap "jauh" karena pusat bloknya >1 blok dari badan. */
          const nx2=clamp(this.pos.x,x,x+1),nz2=clamp(this.pos.z,z,z+1);
          const edge=Math.hypot(nx2-this.pos.x,nz2-this.pos.z);
          if(edge>1.8)continue;
          /* arah dinilai dari titik tengah blok supaya stabil saat menempel */
          const dx=x+0.5-this.pos.x,dz=z+0.5-this.pos.z;
          const ang=Math.atan2(dx,dz);
          let diff=Math.abs(ang-this.facing);if(diff>Math.PI)diff=Math.PI*2-diff;
          /* blok yang benar-benar menempel diberi toleransi sudut lebih lebar
             supaya menambang sambil merapat ke dinding tetap responsif */
          if(diff>(edge<0.25?1.7:1.2))continue;
          const score=edge+diff*0.3+prio+(y===fy?0:0.1);
          if(score<bestScore){bestScore=score;blkHit={x,y,z};}
        }
      }
    if(blkHit){
      /* proficiency gathering mempercepat memecah blok: damage pukul blok
         dinaikkan sesuai sub-skill bloknya (mis. Penambangan utk batu/bijih). */
      const bid=World.getBlock(blkHit.x,blkHit.y,blkHit.z);
      const bdef=(typeof BLOCK_PROF!=='undefined')?BLOCK_PROF[bid]:null;
      const spd=(bdef&&typeof Prof!=='undefined')?Prof.speedBonus(bdef.sk):0;
      World.hitBlock(blkHit.x,blkHit.y,blkHit.z,1+spd);
    }
    /* perabot (meja/kursi/kasur/peti/perahu) juga ikut hancur bila dipukul */
    if(typeof Furni!=='undefined'&&Furni.hitNearest)
      Furni.hitNearest(this.pos,this.facing);
    World.harvestPlants(this.pos,1.7);
    if(hitAny){UI.showCombo(ci+1);FX.addShake(ci===4?0.35:0.12);}
    if(ci===4)FX.ring(this.pos.x+Math.sin(this.facing)*1.3,this.pos.y+0.1,this.pos.z+Math.cos(this.facing)*1.3,0xffd24d,0.4,2.4);
  },
  takeDamage(n,src){
    if(this.dead||this.dodge.active)return;
    /* reduksi armor */
    /* Aura Guardian (skill 'aegis') menambah pertahanan pemain selama rekan
       Guardian hidup & berada dalam radius NPCS.AEGIS_R. */
    let def=RPG.defense?RPG.defense():0;
    if(typeof NPCS!=='undefined'&&NPCS.auraDef)def+=NPCS.auraDef(this.pos);
    def=Math.min(0.8,def);
    const blocked=n*def;
    n=Math.max(1,n-blocked);
    this.hp-=n;FX.addShake(0.4);Sfx.hurt();
    UI.flashVignette();
    FX.text(this.pos.clone().add(new THREE.Vector3(0,2,0)),'-'+Math.round(n),'#ff6b57');
    if(blocked>=1)
      FX.text(this.pos.clone().add(new THREE.Vector3(0.5,2.4,0)),'🛡'+Math.round(blocked),'#9fd7ff');

    /* efek 'thorns' dari Mahkota Duri Titan: balas damage ke penyerang terdekat */
    const th=RPG.thornsRatio?RPG.thornsRatio():0;
    if(th>0&&src){
      let atk=null,bd=3.2;
      for(const m of Monsters.list){
        if(m.dead)continue;
        const d=m.pos.distanceTo(src);
        if(d<bd){bd=d;atk=m;}
      }
      if(atk){
        Monsters.hurt(atk,n*th,new THREE.Vector3(0,0.2,0),1.5);
        FX.impact(atk.pos.clone().add(new THREE.Vector3(0,1.1,0)),0xff6bd6,0.9);
      }
    }
    if(src){
      const diff=new THREE.Vector3().subVectors(this.pos,src).setY(0);

      if(diff.lengthSq()>0.0001){
        const d=diff.normalize();
        this.vel.addScaledVector(d,6);this.vel.y=Math.max(this.vel.y,3);
      }
    }
    if(this.hp<=0){this.hp=0;this.die();}
  },
  die(){
    this.dead=true;
    Sfx.die();
    /* GORE: bagian tubuh terlepas saat pemain tewas */
    if(typeof FX!=='undefined'&&FX.gib)
      FX.gib(this.pos.clone().add(new THREE.Vector3(0,1,0)),
        [0xeac9a6,0xc94f43,0x6b4a34,0x9aa2ac],14,3.4);
    document.getElementById('death-stats').textContent=
      `Level ${this.level} · ${this.kills} monster dikalahkan · Hari ${Weather.day}`;
    document.getElementById('death').classList.remove('hidden');
  },
  respawn(){
    this.dead=false;this.hp=this.maxHp()*0.7;this.hunger=60;this.stamina=this.maxStamina();
    this.pos.copy(this.spawnP);this.vel.set(0,0,0);
    document.getElementById('death').classList.add('hidden');
  },
  addXP(n){
    this.xp+=n;
    let need=Math.round(70*Math.pow(this.level,1.4));
    while(this.xp>=need){
      this.xp-=need;this.level++;RPG.sp++;
      need=Math.round(70*Math.pow(this.level,1.4));
      UI.levelUpBanner();Sfx.levelup();
      FX.ring(this.pos.x,this.pos.y+0.1,this.pos.z,0xffd24d,1.0,4);
      /* naik level: kapasitas bertambah dan langsung diisi sebagian */
      this.hp=Math.min(this.maxHp(),this.hp+30+CFG.HP_PER_LVL);
      this.stamina=Math.min(this.maxStamina(),this.stamina+CFG.STAM_PER_LVL);
    }
  },

  /* ---------- update ---------- */
  update(dt){
    if(this.dead)return;
    /* ganti model tangan saat item hotbar terpilih berubah */
    this.updateHeld();
    /* lompatan Hantam Bumi terarah: terbang ke target, hantam saat mendarat */
    if(this.slamLeap){this.updateSlamLeap(dt);return;}
    const A=this.attack,D=this.dodge;
    D.cd=Math.max(0,D.cd-dt);
    this.buffSpeed=Math.max(0,this.buffSpeed-dt);
    this.hitStop=Math.max(0,this.hitStop-dt);
    A.sinceEnd+=dt;
    /* hit-stop: tahan animasi & gerak sesaat biar pukulan terasa berat */
    if(this.hitStop>0)dt*=0.15;

    /* --- dash kedepan cepat dengan efek angin ---
       Pose roll/dash kini ditangani PlayerAnimator (animasi 'roll'), jadi di
       sini hanya diatur kecepatan, arah hadap, & efek partikel. */
    if(D.active){
      D.t+=dt;
      const p=D.t/0.24;
      if(p>=1){
        D.active=false;
        this.rollG.rotation.x=0;
      }else{
        const spd=lerp(21, 9, p);
        this.vel.x=D.dir.x*spd;
        this.vel.z=D.dir.z*spd;
        this.facing=Math.atan2(D.dir.x,D.dir.z);
        this.rollG.rotation.x=0;
        if(Math.random()<0.75)FX.dash(this.pos, D.dir);
      }
    }

    /* --- gerak ---
       Saat menaiki perahu (Furni.riding), posisi & arah pemain sepenuhnya
       dikendalikan Furni.sail(). Fisika jalan/renang di bawah dilewati supaya
       gravitasi dan penalti air tidak berkelahi dengan gerak perahu. */
    const sailing=(typeof Furni!=='undefined'&&!!Furni.riding);
    const mv=Input.moveVec();
    const moving=(mv.x!==0||mv.z!==0);
    const sprint=Input.sprintHeld()&&moving&&this.stamina>1&&!this.inWater&&!sailing;
    let spd=CFG.PLAYER.speed*RPG.speedMult()*(sprint?CFG.PLAYER.sprint/CFG.PLAYER.speed:1);
    if(this.inWater)spd*=RPG.skillVal('swim')>0?0.9:0.55;
    if(this.buffSpeed>0)spd*=1.18;
    if(A.active)spd*=0.45;
    if(D.active)spd=0;
    const acc=this.onGround?30:9;
    if(sailing){
      this.vel.set(0,0,0);
    }else if(!D.active){
      this.vel.x=lerp(this.vel.x,mv.x*spd,clamp(acc*dt,0,1));
      this.vel.z=lerp(this.vel.z,mv.z*spd,clamp(acc*dt,0,1));
    }

    /* stamina & hunger */
    if(sprint){this.stamina-=9*RPG.stamCostMult()*dt;this.hunger-=0.5*dt;this.stamRegenT=0.4;}
    /* mengayuh perahu jauh lebih ringan daripada berenang */
    this.hunger-=(0.11+(!sailing&&this.inWater&&moving?0.25:0))*dt;
    if(this.stamRegenT>0)this.stamRegenT-=dt;
    else this.stamina=Math.min(this.maxStamina(),this.stamina+(moving?9:14)*dt);
    this.stamina=clamp(this.stamina,0,this.maxStamina());
    this.hunger=clamp(this.hunger,0,100);
    if(this.hunger<=0)this.hp-=2*dt;
    else if(this.hunger>85&&this.hp<this.maxHp())this.hp=Math.min(this.maxHp(),this.hp+1.3*dt);
    /* efek 'regen' dari Zirah Nadi Kristal: pemulihan pasif terus-menerus */
    const rg=RPG.regenPerSec?RPG.regenPerSec():0;
    if(rg>0&&this.hp>0&&this.hp<this.maxHp())
      this.hp=Math.min(this.maxHp(),this.hp+rg*dt);

    if(this.hp<=0){this.hp=0;this.die();return;}

    /* --- fisika --- */
    if(sailing){
      /* perahu yang menopang pemain: tidak jatuh, tidak berenang.
         Arah hadap mengikuti haluan perahu supaya badan tidak menyamping. */
      this.inWater=false;this.onGround=true;this.airJumped=false;
      this.facing=angLerp(this.facing,Furni.boatYaw,clamp(6*dt,0,1));
      this.animate(dt,false,0,false);
      this.updateSwordGlow(dt);
      this.mesh.position.copy(this.pos);
      this.mesh.rotation.y=this.facing;
      return;
    }
    const wasInWater=this.inWater;
    /* BUGFIX: inWaterAt men-clamp pemeriksaan ke kolom air (y≤3), sehingga
       inWater tetap true saat pemain MELOMPAT di atas permukaan — akibatnya
       gerak & gravitasi melambat padahal sedang di udara. Sekarang inWater
       hanya true bila kaki memang di bawah permukaan air (jalan/renang).
       Lompat di atas air = fisika normal tanpa penalti. */
    this.inWater=this.pos.y<CFG.WATER_Y&&
      World.inWaterAt(this.pos.x,this.pos.y+0.3,this.pos.z);
    this.vel.y-=CFG.GRAV*(this.inWater?0.3:1)*dt;
    if(this.inWater){
      if(this.pos.y<CFG.WATER_Y-0.55)this.vel.y+=19*dt;
      this.vel.y=clamp(this.vel.y,-3,3.5);
      if(!wasInWater){
        /* baru masuk air: suara kecebur — besar bila jatuh cepat, kecil bila
           melangkah/nyemplung pelan */
        const big=this.vel.y<-3;
        FX.ripple(this.pos.x,CFG.WATER_Y,this.pos.z,0xdff2fa,big?3:1.6);
        FX.debris(this.pos.clone().setY(CFG.WATER_Y),0xbfe6f5,big?10:5,big?2.5:1.4);
        Sfx.splash(big);
      }
    }
    /* horizontal + step-up
       Batas pencarian lantai = setinggi kepala (pos.y+1.8). Tanpa batas ini
       ambang atas pintu terbaca sebagai lantai setinggi atap sehingga pemain
       tertahan "dinding tak terlihat" di depan pintu yang jelas terbuka. */
    const headY=this.pos.y+1.8;
    /* posisi acuan SEBELUM gerak & sebelum gravitasi diterapkan ke pos.y.
       py0 dipakai sebagai patokan tinggi langkah supaya batas naik-lantai
       tidak ikut bergeser saat pos.y turun karena gravitasi (lihat BUGFIX
       di bawah). */
    const px0=this.pos.x,pz0=this.pos.z,py0=this.pos.y;
    /* Penjaga horizontal: selain batas langkah (groundAt) & rintangan batang/
       dinding (blockedAt), `headroomOK` memastikan posisi TUJUAN tidak akan
       menaruh tubuh pemain DI DALAM blok lantai padat. Tanpa ini, kasus sudut
       tertentu bisa meloloskan pemain masuk ke celah blok lalu terjebak
       ("terhisap terrain"); headroomOK menolak gerak itu di hulu. */
    const nx=this.pos.x+this.vel.x*dt;
    const gX=World.groundAt(nx,this.pos.z,headY);
    if(gX<=py0+1.02&&!World.blockedAt(nx,this.pos.y,this.pos.z,0.28)&&World.headroomOK(nx,this.pos.z,Math.max(gX,py0)))this.pos.x=nx;else this.vel.x=0;
    const nz=this.pos.z+this.vel.z*dt;
    const gZ=World.groundAt(this.pos.x,nz,headY);
    if(gZ<=py0+1.02&&!World.blockedAt(this.pos.x,this.pos.y,nz,0.28)&&World.headroomOK(this.pos.x,nz,Math.max(gZ,py0)))this.pos.z=nz;else this.vel.z=0;
    this.pos.y+=this.vel.y*dt;

    /* ---------- resolusi tabrakan vertikal ----------
       BUGFIX "karakter tersedot masuk ke dalam terrain":
       Dulu kode ini memakai `if(g>pos.y+1.05)g=pos.y;` — batas langkah diukur
       dari pos.y yang SUDAH dikurangi gravitasi. Saat frame melambat (dt besar)
       atau setelah jatuh agak jauh, pos.y turun cukup banyak sehingga tanah
       satu blok di depan terbaca "terlalu tinggi"; g dipaksa = pos.y sehingga
       pemain TIDAK dinaikkan ke permukaan, lalu dianggap onGround di dalam
       tanah. Karena kondisinya terulang tiap frame, pemain makin lama makin
       tenggelam (tersedot) dan tidak pernah keluar lagi.

       Perbaikan:
       1. Batas langkah & pencarian lantai diukur dari py0 (tinggi SEBELUM
          gravitasi), konsisten dengan patokan cek horizontal `headY`. memakai
          pos.y sesudah gravitasi membuat langit-langit pencarian turun dan
          dapat memotong blok permukaan saat pemain sudah agak rendah.
       2. Bila tanah di posisi BARU terlalu tinggi (bukan langkah wajar),
          gerak horizontal DIBATALKAN — bukan membiarkan pemain terbenam.
       3. Pemain tidak boleh berada di bawah permukaan tanah: bila pos.y < g
          selalu didorong naik ke g.
       4. GARANSI tambahan anti-"terhisap": setelah semua resolusi, pass
          `unburyY` memastikan kaki tidak berada DI DALAM blok padat; bila ya,
          pemain didorong keluar ke permukaan terdekat. Ini menutup sisa kasus
          (terdorong ke sudut struktur, posisi save lama, dsb.) yang lolos dari
          resolusi biasa. */
    const refY=Math.max(py0,this.pos.y)+1.8;
    let g=World.groundAt(this.pos.x,this.pos.z,refY);
    if(g>py0+1.05){
      this.pos.x=px0;this.pos.z=pz0;
      this.vel.x=0;this.vel.z=0;
      g=World.groundAt(px0,pz0,refY);
    }
    const wasG=this.onGround;
    this.onGround=false;
    if(this.pos.y<g){
      /* terbenam / mendarat: dorong ke permukaan */
      const fall=-this.vel.y;
      if(!wasG&&fall>1.8&&!this.inWater)Sfx.land(clamp((fall-1.8)/9,0,1));
      this.pos.y=g;
      if(this.vel.y<0)this.vel.y=0;
      this.onGround=true;this.airJumped=false;
    }else if(this.pos.y<=g&&this.vel.y<=0){
      /* tepat menyentuh tanah */
      const fall=-this.vel.y;
      if(!wasG&&fall>1.8&&!this.inWater)Sfx.land(clamp((fall-1.8)/9,0,1));
      this.pos.y=g;this.vel.y=0;this.onGround=true;this.airJumped=false;
    }
    /* garansi: kaki tidak boleh berada di dalam blok padat (anti-terhisap) */
    const ub=World.unburyY(this.pos.x,this.pos.z,this.pos.y);
    if(ub>this.pos.y){
      this.pos.y=ub;
      if(this.vel.y<0)this.vel.y=0;
      this.onGround=true;this.airJumped=false;
    }
    /* RIDE WAVE: pemain yang berdiri di atas blok tanah yang terangkat
       gelombang ikut naik bersama bloknya */
    if(typeof FX!=='undefined'&&FX.waveHeightAt){
      const wh=FX.waveHeightAt(this.pos.x,this.pos.z);
      if(wh>0.03&&this.pos.y<g+wh){this.pos.y=g+wh;if(this.vel.y<0)this.vel.y=0;this.onGround=true;this.airJumped=false;}
    }
    if(this.pos.y<-6)this.respawn();

    /* efek air saat bergerak (berenang): desir air lembut berulang */
    const hspd=Math.hypot(this.vel.x,this.vel.z);
    if(this.inWater&&hspd>1.2){
      this.splashT-=dt;this.rippleT-=dt;
      if(this.splashT<=0){this.splashT=0.22;
        FX.debris(this.pos.clone().setY(CFG.WATER_Y),0xdff2fa,3,1.8);
        if(typeof Sfx.swim==='function')Sfx.swim();else Sfx.splash(false);}
      if(this.rippleT<=0){this.rippleT=0.42;
        FX.ripple(this.pos.x,CFG.WATER_Y,this.pos.z,0xbfe6f5,1.6);}
    }

    /* --- combo attack --- */
    if(A.active){
      const C=COMBOS[A.combo];
      const dur=C.dur/RPG.comboSpeedMult();
      A.t+=dt;
      if(!A.hitDone&&A.t>=C.hit){A.hitDone=true;this.doHit(A.combo);}
      if(A.queued&&A.t>dur*0.55){A.queued=false;this.attack.active=false;this.tryAttack();}
      else if(A.t>=dur){A.active=false;A.sinceEnd=0;}
    }
    /* hadap */
    if(!A.active){
      if(moving)this.facing=angLerp(this.facing,Math.atan2(mv.x,mv.z),clamp(12*dt,0,1));
    }
    this.animate(dt,moving,hspd,sprint);
    this.updateSwordGlow(dt);
    this.mesh.position.copy(this.pos);
    /* extraYaw menambahkan putaran 360° combo 3 di atas arah hadap */
    this.mesh.rotation.y=this.facing+(this.extraYaw||0);
  },

  /* ---------- animasi player — DELEGASI ke PlayerAnimator ----------
     Semua gerakan (idle/walk/sprint/jump/swim/roll, 5 combo serangan, dan
     pose skill) kini diambil dari js/player/player_animations.js agar menjadi
     SATU sumber animasi yang mudah disinkronkan. Fungsi ini hanya memetakan
     state game (dodge/skill/combo/gerak) ke nama animasi lalu memanggil
     animator.update(dt). Efek samping lama (extraYaw, moveLean) dinolkan
     karena putaran spin kini dikerjakan animator lewat rotasi body. */

  /* pemetaan skill aktif game → animasi terdekat di PlayerAnimator */
  skillAnimName(id){
    const map={
      slam :'combo5',          // Heavy Cleave = tebasan berat dari atas (paling dekat)
      whirl:'skill_whirlwind', // serangan putar area
      roar :'skill_thunder',   // kedua lengan diangkat (paling dekat dengan auman)
      herb :'skill_heal'       // minum ramuan / penyembuhan
    };
    return map[id]||'skill_heal';
  },

  animate(dt,moving,hspd,sprint){
    /* inisialisasi animator sekali (lazy) supaya aman dipanggil di mana pun */
    if(!this.animator){
      if(typeof PlayerAnimator==='undefined')return;
      this.animator=new PlayerAnimator(this.parts);
    }
    const an=this.animator;

    /* SFX langkah kaki: tetap dipicu dari kecepatan gerak (setengah siklus) */
    if(moving&&this.onGround){
      const prevP=this.walkP||0;
      this.walkP=prevP+dt*hspd*2.1;
      if(Math.floor(this.walkP/Math.PI)!==Math.floor(prevP/Math.PI))
        Sfx.step(this.inWater);
    }else this.walkP=0;

    /* timer skill game tetap berjalan (dipakai logika & penanda state) */
    if(this.skillAnim&&this.skillAnim.t>0)this.skillAnim.t-=dt;

    /* one-shot (dodge/skill/combo) prioritas tertinggi; dipicu sekali per aktivasi */
    const dodgeKey=this.dodge.active?'dodge':null;
    const skillKey=(this.skillAnim&&this.skillAnim.t>0)?('s'+this.skillAnim.id):null;
    const atkKey=this.attack.active?('c'+this.attack.combo):null;
    const actionKey=dodgeKey||skillKey||atkKey||null;

    const oneShotPlaying=(an.durations[an.currentAnim]||0)>0&&!an.finished;

    if(actionKey){
      if(this._animKey!==actionKey){
        const name=dodgeKey?'dash'
          :skillKey?this.skillAnimName(this.skillAnim.id)
          :'combo'+(this.attack.combo+1);
        an.setAnimation(name);
        this._animKey=actionKey;
      }
      an.update(dt);
      this.extraYaw=0;this.moveLean=0;
      return;
    }
    this._animKey=null;

    /* one-shot yang masih bermain (mis. skill lebih panjang dari timer game)
       dibiarkan selesai dulu sebelum kembali ke animasi gerak */
    if(oneShotPlaying){an.update(dt);this.extraYaw=0;this.moveLean=0;return;}

    /* ---------- animasi gerak / idle ----------
       Urutan prioritas: renang (di air, pakai pose 'jump' sehingga pemain
       loncat-loncat di atas air seperti versi awal) → jump (di udara, pose
       statis ditahan) → sprint/walk/idle. */
    if(this.inWater){
      this._airJumpPlayed=false;
      if(an.currentAnim!=='jump')an.setAnimation('jump');
    }else if(!this.onGround){
      /* di udara: pose statis 'jump' ditahan selama melayang (bukan one-shot,
         jadi tidak auto-selesai — fisikanya yang menggerakkan naik-turun) */
      if(an.currentAnim!=='jump')an.setAnimation('jump');
    }else{
      this._airJumpPlayed=false;
      let name;
      if(moving&&sprint)name='sprint';
      else if(moving)name='walk';
      else name='idle';
      if(an.currentAnim!==name)an.setAnimation(name);
    }
    an.update(dt);
    /* spin combo/skill kini diputar animator lewat body, jadi yaw mesh bersih */
    this.extraYaw=0;this.moveLean=0;
  },
  /* ---------- animasi skill aktif ----------
      Dipanggil RPG.useActive saat skill berhasil dipakai; memutar pose singkat
      yang khas per skill (slam/whirl/roar/herb). */
  playSkillAnim(id){
    const dur={slam:0.5,whirl:0.55,roar:0.7,herb:0.6}[id]||0.5;
    this.skillAnim={id,t:dur,max:dur};
  },
};

/* =====================================================================
   SLAM AIM — Hantam Bumi terarah ala MOBA
   ---------------------------------------------------------------------
   Tekan cepat (Q / tombol skill)      -> loncat & hantam di tempat.
   Tahan (PC: kursor; mobile: seret)   -> masuk mode bidik, lalu lepas untuk
                                           melompat ke titik bidik & menghantam.
   PC     : tahan Q, arahkan kursor (dibatasi radius), lepas.
   Mobile : tahan tombol skill lalu seret ke arah mana pun (seperti Mobile
            Legends), lepas untuk mengeksekusi.
   ===================================================================== */
const SlamAim={
  HOLD:0.28,      // detik tahan sebelum masuk mode bidik
  MAX_R:7,        // radius bidik maksimum dari pemain
  state:'idle',   // idle | pending | aiming
  t:0,
  aim:{x:0,z:0},
  dragStart:null,dragCur:null,
  indicator:null,

  active(){return this.state!=='idle';},

  press(){
    if(this.state!=='idle')return;
    if(typeof RPG==='undefined'||RPG.skillVal('slam')<=0||Player.dead)return;
    if(RPG.activeCD.slam>0){UI.toast(`⏳ ${Math.ceil(RPG.activeCD.slam)}s lagi`);return;}
    this.state='pending';this.t=0;
    this.dragStart=null;this.dragCur=null;
  },

  /* dipanggil loop game tiap frame */
  update(dt){
    if(this.state==='idle')return;
    this.t+=dt;
    if(this.state==='pending'&&this.t>=this.HOLD){
      this.state='aiming';
      this.updateAim();
      this.showIndicator();
    }
    if(this.state==='aiming'){
      this.updateAim();
      this.moveIndicator();
    }
  },

  release(){
    if(this.state==='idle')return;
    const wasAiming=this.state==='aiming';
    this.hideIndicator();
    this.state='idle';
    if(Player.dead)return;
    if(!wasAiming){
      /* tekan cepat: hantam di tempat (loncat kecil) */
      RPG.useActive('slam');
      return;
    }
    /* terarah: loncat ke titik bidik lalu hantam saat mendarat */
    const dx=this.aim.x-Player.pos.x,dz=this.aim.z-Player.pos.z;
    if(Math.hypot(dx,dz)<1.2){RPG.useActive('slam');return;}
    Player.startSlamLeap(this.aim.x,this.aim.z);
  },

  /* hitung titik bidik dari kursor (PC) atau seretan jempol (mobile) */
  updateAim(){
    if(IS_MOBILE&&this.dragCur&&this.dragStart){
      /* ala MOBA: arah & jarak mengikuti seretan dari tombol skill */
      const dx=this.dragCur.x-this.dragStart.x;
      const dy=this.dragCur.y-this.dragStart.y;
      const d=Math.hypot(dx,dy);
      if(d<8){this.aim.x=Player.pos.x;this.aim.z=Player.pos.z;return;}
      const ix=dx/d, iz=-dy/d;              // layar -> input (y layar ke bawah)
      const yaw=Cam.yaw;
      const wx=-Math.sin(yaw)*iz+Math.cos(yaw)*ix;
      const wz=-Math.cos(yaw)*iz-Math.sin(yaw)*ix;
      const dist=clamp(d/16,0,1)*this.MAX_R; // skala seretan -> jarak dunia
      this.aim.x=Player.pos.x+wx*dist;
      this.aim.z=Player.pos.z+wz*dist;
    }else if(typeof Input!=='undefined'&&Input.mouseX!==undefined){
      /* PC: proyeksikan kursor ke bidang tanah setinggi pemain */
      const nx=(Input.mouseX/window.innerWidth)*2-1;
      const ny=-(Input.mouseY/window.innerHeight)*2+1;
      const ray=new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(nx,ny),Cam.cam);
      const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-Player.pos.y);
      const hit=new THREE.Vector3();
      if(ray.ray.intersectPlane(plane,hit)){this.aim.x=hit.x;this.aim.z=hit.z;}
    }
    /* batasi radius bidik agar tidak terlalu jauh dari pemain */
    const ax=this.aim.x-Player.pos.x,az=this.aim.z-Player.pos.z;
    const ad=Math.hypot(ax,az);
    if(ad>this.MAX_R){
      this.aim.x=Player.pos.x+ax/ad*this.MAX_R;
      this.aim.z=Player.pos.z+az/ad*this.MAX_R;
    }
  },

  /* indikator lingkaran di titik bidik */
  showIndicator(){
    if(!this.indicator){
      const g=new THREE.RingGeometry(1.6,1.85,40);
      const m=new THREE.MeshBasicMaterial({color:0xffb33c,transparent:true,opacity:0.9,side:THREE.DoubleSide,depthWrite:false});
      this.indicator=new THREE.Mesh(g,m);
      this.indicator.rotation.x=-Math.PI/2;
      this.indicator.renderOrder=4;
    }
    if(!this.indicator.parent)Game.scene.add(this.indicator);
    this.indicator.visible=true;
  },
  hideIndicator(){ if(this.indicator)this.indicator.visible=false; },
  moveIndicator(){
    if(!this.indicator)return;
    const gy=World.groundAt(this.aim.x,this.aim.z,Player.pos.y+3);
    this.indicator.position.set(this.aim.x,gy+0.08,this.aim.z);
  },
};
window.SlamAim=SlamAim;
