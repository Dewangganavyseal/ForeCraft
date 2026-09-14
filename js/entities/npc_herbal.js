'use strict';
/* =============================================================================
   ENTITAS NPC: TABIB DESA (⚗️)
   -----------------------------------------------------------------------------
   Model 3D: Tabib penyembuh desa beret ungu dengan kacamata berbingkai perak,
   celemek putih bersih dokter, sabuk selempang ramuan (potion bandolier) dengan
   tiga botol ramuan warna-warni, keranjang tanaman obat di tangan kiri, dan tongkat
   penyembuh berkristal giok hijau yang menghadap lurus ke depan.
   ============================================================================= */

const NPC_Herbal={

  /* ---------- MODEL 3D ----------
     Dipanggil NPCS.buildModel(role) -> {mesh,parts}. */
  build(){
    const g=new THREE.Group();
    const box=(w,h,d,c)=>{
      const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
        new THREE.MeshLambertMaterial({color:c}));
      m.castShadow=!IS_MOBILE;return m;
    };
    const at=(m,x,y,z)=>{m.position.set(x,y,z);return m;};
    const ROBE=0x724878,ROBE_D=0x4c2b52,ROBE_L=0x96689e,
          APRON=0xede6d8,APRON_D=0xd2c8b6,
          SKIN=0xd69c6a,SKIN_D=0xb87a4c,
          HAIR=0xe8dfd2,HAIR_D=0xcfc5b4,
          BOOT=0x2c221a,BOOT_D=0x1a130c,
          WOODC=0x664426,WOOD_D=0x422a16,
          METAL=0xc8d4e0,GOLD=0xdca832,
          CRYSTAL=0x38e078,POT_RED=0xeb3838,POT_BLU=0x3888eb;
    const BODY_Y=0.78;

    /* --- kaki: jubah panjang tabib & sepatu kulit lembut --- */
    const legs=[];
    for(const side of[1,-1]){
      const lg=new THREE.Group();lg.position.set(0.12*side,0.52,0);
      lg.add(at(box(0.19,0.22,0.21,ROBE_D),0,-0.11,0));
      lg.add(at(box(0.17,0.16,0.19,ROBE),0,-0.26,0));
      // sepatu bot kulit lembut
      lg.add(at(box(0.155,0.12,0.175,BOOT),0,-0.36,0.01));
      lg.add(at(box(0.17,0.08,0.22,BOOT),0,-0.44,0.03));
      lg.add(at(box(0.18,0.035,0.24,BOOT_D),0,-0.49,0.035));
      g.add(lg);legs.push(lg);
    }

    /* --- torso: jubah ungu mistis + celemek putih bersih + selempang ramuan --- */
    const body=box(0.48,0.46,0.33,ROBE);body.position.y=BODY_Y;g.add(body);
    // celemek putih bersih tabib di depan
    body.add(at(box(0.42,0.38,0.08,APRON),0,-0.02,0.14));
    body.add(at(box(0.34,0.14,0.05,APRON_D),0,-0.10,0.18)); // saku celemek
    // sabuk kulit cokelat & gesper perak
    body.add(at(box(0.50,0.08,0.35,WOOD_D),0,-0.10,0));
    body.add(at(box(0.10,0.09,0.37,METAL),0,-0.10,0));

    // Selempang Potion Bandolier menyilang di dada
    const strap=box(0.46,0.06,0.025,WOOD_D);
    strap.rotation.z=0.55;strap.position.set(0,0.06,0.19);body.add(strap);
    // 3 Botol Ramuan mini (Merah = HP, Hijau = Herbal, Biru = Mana)
    const pot1=new THREE.Group();pot1.position.set(-0.10,0.12,0.21);
    pot1.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.06,0.08,0.06),
      new THREE.MeshBasicMaterial({color:POT_RED})),0,0,0));
    pot1.add(at(box(0.04,0.03,0.04,WOODC),0,0.055,0)); // tutup gabus
    body.add(pot1);

    const pot2=new THREE.Group();pot2.position.set(0,0.05,0.21);
    pot2.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.06,0.08,0.06),
      new THREE.MeshBasicMaterial({color:CRYSTAL})),0,0,0));
    pot2.add(at(box(0.04,0.03,0.04,WOODC),0,0.055,0));
    body.add(pot2);

    const pot3=new THREE.Group();pot3.position.set(0.10,-0.02,0.21);
    pot3.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.06,0.08,0.06),
      new THREE.MeshBasicMaterial({color:POT_BLU})),0,0,0));
    pot3.add(at(box(0.04,0.03,0.04,WOODC),0,0.055,0));
    body.add(pot3);

    /* --- kepala: baret tabib ungu + kacamata perak + ekspresi bijaksana --- */
    const head=box(0.34,0.32,0.32,SKIN);head.position.y=1.16;g.add(head);
    head.add(at(box(0.30,0.08,0.30,SKIN_D),0,-0.14,0));

    // Baret tabib ungu tua dengan bros daun obat emas
    head.add(at(box(0.40,0.14,0.40,ROBE_D),0,0.16,-0.01));
    head.add(at(box(0.44,0.06,0.44,ROBE),0,0.19,-0.01));
    head.add(at(box(0.08,0.08,0.02,GOLD),0.16,0.16,0.15)); // bros emas samping
    head.add(at(box(0.04,0.04,0.01,CRYSTAL),0.16,0.16,0.165)); // permata hijau

    // Kacamata perak (spectacles) berbingkai di depan mata
    head.add(at(box(0.08,0.06,0.02,METAL),-0.08,0.02,0.18));
    head.add(at(box(0.08,0.06,0.02,METAL),0.08,0.02,0.18));
    head.add(at(box(0.06,0.02,0.02,METAL),0,0.03,0.18)); // jembatan hidung kacamata

    // Mata ramah & bijaksana
    for(const s of[1,-1]){
      head.add(at(box(0.06,0.045,0.01,0xffffff),0.08*s,0.02,0.165));
      head.add(at(box(0.035,0.045,0.01,0x2c1f30),0.08*s,0.02,0.17));
      head.add(at(box(0.08,0.03,0.02,HAIR),0.08*s,0.065,0.17)); // alis uban
    }
    head.add(at(box(0.06,0.09,0.08,SKIN_D),0,-0.02,0.19));
    // janggut putih rapi tabib
    head.add(at(box(0.20,0.12,0.06,HAIR),0,-0.12,0.15));
    head.add(at(box(0.14,0.08,0.04,HAIR_D),0,-0.18,0.14));

    /* --- lengan kiri: keranjang anyaman herbal obat --- */
    const armL=new THREE.Group();armL.position.set(-0.31,0.94,0);
    armL.add(at(box(0.16,0.12,0.16,ROBE),0,-0.07,0));
    armL.add(at(box(0.18,0.08,0.18,ROBE_L),0,-0.16,0)); // manset jubah
    armL.add(at(box(0.14,0.16,0.14,SKIN),0,-0.27,0));
    armL.add(at(box(0.13,0.09,0.13,SKIN_D),0,-0.38,0));

    // Keranjang Anyaman Tanaman Obat di tangan kiri
    const basket=new THREE.Group();basket.position.set(-0.06,-0.36,0.10);
    basket.add(at(box(0.24,0.16,0.22,WOODC),0,-0.04,0));
    basket.add(at(box(0.26,0.03,0.24,WOOD_D),0,0.05,0)); // tepian keranjang
    basket.add(at(box(0.03,0.20,0.20,WOOD_D),0,0.10,0));  // gagang jinjing
    // Tanaman obat & bunga penyembuh di dalam keranjang
    basket.add(at(box(0.18,0.06,0.16,0x3ec255),0,0.06,0));
    basket.add(at(box(0.07,0.05,0.07,0xe83b52),-0.05,0.10,0.04)); // buah berry merah
    basket.add(at(box(0.06,0.06,0.06,0x44a0e8),0.05,0.10,-0.04)); // bunga obat biru
    armL.add(basket);
    g.add(armL);

    /* --- lengan kanan: tongkat tabib berkristal giok menghadap ke depan --- */
    const armR=new THREE.Group();armR.position.set(0.31,0.94,0);
    armR.add(at(box(0.16,0.12,0.16,ROBE),0,-0.07,0));
    armR.add(at(box(0.18,0.08,0.18,ROBE_L),0,-0.16,0));
    armR.add(at(box(0.14,0.16,0.14,SKIN),0,-0.27,0));
    armR.add(at(box(0.13,0.09,0.13,SKIN_D),0,-0.38,0));

    // Grip tongkat tangan kanan (menghadap ke depan +Z)
    const grip=new THREE.Group();grip.position.set(0,-0.38,0.06);
    grip.rotation.set(-0.25,0,0.04);
    armR.add(grip);

    // Batang tongkat kayu ek penyembuh mengarah lurus ke depan (+Z)
    grip.add(at(box(0.045,0.045,1.05,WOODC),0,0,0.35));
    grip.add(at(box(0.055,0.055,0.20,WOOD_D),0,0,0)); // pegangan tangan lilitan
    // Mahkota kepala tongkat emas bertatah kristal penyembuh
    grip.add(at(box(0.12,0.12,0.10,GOLD),0,0,0.85));
    // Kristal Giok Penyembuh Hijau Berpendar (luminous crystal facing forward)
    const crystal=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.09,0.18),
      new THREE.MeshBasicMaterial({color:CRYSTAL}));
    crystal.position.set(0,0,0.98);
    grip.add(crystal);
    // Ujung puncak kristal berlian
    grip.add(at(box(0.05,0.05,0.08,0xffffff),0,0,1.10));
    g.add(armR);

    return {mesh:g,parts:{body,head,armL,armR,legs,bodyY:BODY_Y}};
  },

  /* ---------- ANIMASI ---------- */
  animate(n,dt){
    const t=performance.now()*0.001;
    const sp=Math.hypot(n.vel.x,n.vel.z);
    const em=n.flash>0?0xaa2222:0x000000;
    n.mesh.traverse(o=>{if(o.material&&o.material.emissive)
      o.material.emissive.setHex(em);});
    const step=Math.sin(t*9)*0.5*Math.min(1,sp/2);
    if(n.parts.legs){
      n.parts.legs[0].rotation.x=step;
      n.parts.legs[1].rotation.x=-step;
    }
    if(n.parts.armL)n.parts.armL.rotation.x=-step*0.4;
    const sw=n.swing>0?1-n.swing/0.25:0;
    if(n.parts.armR)n.parts.armR.rotation.x=lerp(step*0.4,-1.4,sw);
    if(n.parts.body)n.parts.body.position.y=n.parts.bodyY+
      Math.abs(Math.sin(t*9))*0.03*Math.min(1,sp/2);
    if(n.parts.head)n.parts.head.rotation.y=n.target?0:Math.sin(t*1.4)*0.35;
  },
};
window.NPC_Herbal=NPC_Herbal;
