'use strict';
/* =============================================================================
   ENTITAS NPC: PEDAGANG (🏪)
   -----------------------------------------------------------------------------
   Model 3D: Saudagar kelana kaya bertopi baret beludru berhias bulu dan koin emas,
   rompi mewah bermotif, ransel peti dagangan raksasa (travel packframe) berisi
   tenda gulung dan peta di punggung, buku catatan transaksi di tangan kiri, serta
   tongkat jalan bernisan koin emas berkilau yang menghadap lurus ke depan.
   ============================================================================= */

const NPC_Merchant={

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
    const ROBE=0xc89838,ROBE_D=0x8c621e,ROBE_L=0xdeb44e,
          TUNIC=0x74222a,TUNIC_D=0x4c141a,
          BERET=0x8c2432,BERET_D=0x5c1420,
          SKIN=0xd69c68,SKIN_D=0xb87a4c,
          HAIR=0x3e2818,HAIR_D=0x26160c,
          BOOT=0x2c2016,BOOT_D=0x18110a,
          WOODC=0x664426,WOOD_D=0x422a16,
          METAL=0xc8d4e0,GOLD=0xdca832,GOLD_L=0xffdf6c;
    const BODY_Y=0.78;

    /* --- kaki: celana saudagar bergaris rapi & sepatu bot kulit bergesper emas --- */
    const legs=[];
    for(const side of[1,-1]){
      const lg=new THREE.Group();lg.position.set(0.12*side,0.52,0);
      lg.add(at(box(0.19,0.18,0.21,TUNIC),0,-0.09,0));
      lg.add(at(box(0.165,0.18,0.185,TUNIC_D),0,-0.24,0));
      // sepatu bot saudagar bergesper emas
      lg.add(at(box(0.16,0.14,0.18,BOOT),0,-0.35,0.01));
      lg.add(at(box(0.175,0.09,0.23,BOOT),0,-0.44,0.03));
      lg.add(at(box(0.08,0.04,0.02,GOLD),0,-0.40,0.13)); // gesper sepatu emas
      lg.add(at(box(0.185,0.04,0.25,BOOT_D),0,-0.49,0.035));
      g.add(lg);legs.push(lg);
    }

    /* --- torso: rompi sutra emas + jubah merah marun + kantong koin berderet --- */
    const body=box(0.50,0.46,0.34,TUNIC);body.position.y=BODY_Y;g.add(body);
    // rompi emas saudagar mewah di dada
    body.add(at(box(0.44,0.36,0.12,ROBE),0,0.02,0.13));
    body.add(at(box(0.40,0.32,0.04,ROBE_L),0,0.02,0.18));
    // deretan kancing emas mewah di dada
    for(const by of[0.14,0.05,-0.04]){
      body.add(at(box(0.04,0.04,0.02,GOLD_L),0,by,0.203));
    }
    // sabuk kulit lebar dengan dompet koin bergantungan
    body.add(at(box(0.52,0.08,0.36,WOOD_D),0,-0.11,0));
    body.add(at(box(0.12,0.10,0.38,GOLD),0,-0.11,0)); // gesper emas besar
    // kantong uang koin menggembung di pinggul kiri & kanan
    body.add(at(box(0.12,0.14,0.10,ROBE_D),-0.20,-0.12,0.12));
    body.add(at(box(0.10,0.12,0.09,ROBE),0.20,-0.12,0.12));
    body.add(at(box(0.06,0.04,0.02,GOLD_L),-0.20,-0.06,0.17)); // koin mengintip

    // Ransel Peti Dagangan Raksasa (Travel Packframe) di punggung
    const pack=new THREE.Group();pack.position.set(0,0.08,-0.22);
    // rangka peti kayu
    pack.add(at(box(0.42,0.50,0.22,WOODC),0,0,0));
    pack.add(at(box(0.44,0.04,0.24,WOOD_D),0,0.22,0));  // lis kayu atas
    pack.add(at(box(0.44,0.04,0.24,WOOD_D),0,-0.22,0)); // lis kayu bawah
    // gulungan tenda / karpet tidur di atas peti
    const roll=box(0.44,0.14,0.14,0x58422e);roll.position.set(0,0.30,0);pack.add(roll);
    roll.add(at(box(0.03,0.15,0.15,GOLD),-0.12,0,0)); // tali pengikat kulit/emas
    roll.add(at(box(0.03,0.15,0.15,GOLD),0.12,0,0));
    // lentera kecil bergoyang di sisi peti
    pack.add(at(box(0.08,0.12,0.08,GOLD),0.24,-0.08,0.04));
    pack.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.06,0.07,0.06),
      new THREE.MeshBasicMaterial({color:0xffaa33})),0.24,-0.08,0.04));
    body.add(pack);

    /* --- kepala: baret beludru berhias bulu & koin emas + janggut saudagar cerdik --- */
    const head=box(0.34,0.32,0.32,SKIN);head.position.y=1.16;g.add(head);
    head.add(at(box(0.30,0.08,0.30,SKIN_D),0,-0.14,0));

    // Baret beludru marun miring saudagar (merchant velvet beret)
    const beret=new THREE.Group();beret.position.set(0,0.16,-0.01);
    beret.rotation.z=-0.12;
    beret.add(at(box(0.42,0.14,0.42,BERET),0,0,0));
    beret.add(at(box(0.46,0.06,0.46,BERET_D),0,0.04,0));
    // bros koin emas & bulu merak di samping baret
    beret.add(at(box(0.09,0.09,0.03,GOLD_L),0.18,0.02,0.15));
    const feather=box(0.03,0.28,0.06,ROBE_L);
    feather.position.set(0.22,0.14,0.15);feather.rotation.z=-0.4;beret.add(feather);
    head.add(beret);

    // Mata saudagar cerdik & penuh peluang
    for(const s of[1,-1]){
      head.add(at(box(0.07,0.05,0.02,0xffffff),0.08*s,0.02,0.163));
      head.add(at(box(0.04,0.05,0.02,0x281c10),0.08*s,0.02,0.174));
      head.add(at(box(0.015,0.015,0.01,GOLD_L),0.085*s,0.035,0.182)); // kilau emas di mata!
      head.add(at(box(0.09,0.03,0.02,HAIR_D),0.08*s,0.065,0.17));
    }
    head.add(at(box(0.06,0.09,0.08,SKIN_D),0,-0.02,0.19));
    // kumis melintir & janggut rapi saudagar
    head.add(at(box(0.24,0.05,0.05,HAIR_D),0,-0.07,0.18));
    head.add(at(box(0.06,0.06,0.04,HAIR),-0.12,-0.06,0.17)); // ujung kumis kiri
    head.add(at(box(0.06,0.06,0.04,HAIR),0.12,-0.06,0.17));  // ujung kumis kanan
    head.add(at(box(0.12,0.08,0.05,HAIR_D),0,-0.12,0.16));

    /* --- lengan kiri: buku catatan transaksi bersampul kulit emas --- */
    const armL=new THREE.Group();armL.position.set(-0.31,0.94,0);
    armL.add(at(box(0.16,0.12,0.16,TUNIC),0,-0.07,0));
    armL.add(at(box(0.18,0.08,0.18,ROBE_D),0,-0.16,0)); // manset sutra
    armL.add(at(box(0.14,0.16,0.14,SKIN),0,-0.27,0));
    armL.add(at(box(0.13,0.09,0.13,SKIN_D),0,-0.38,0));

    // Buku Catatan Dagang (Ledger / Trade Book) di tangan kiri
    const book=new THREE.Group();book.position.set(-0.06,-0.34,0.12);
    book.rotation.set(0.25,0,0.10);
    book.add(at(box(0.12,0.26,0.20,0x4a1820),0,0,0));       // sampul beludru marun
    book.add(at(box(0.10,0.24,0.18,0xf4ebd4),0.015,0,0));   // kertas lembaran
    book.add(at(box(0.13,0.04,0.21,GOLD),0,0,0));           // sabuk pengunci emas
    armL.add(book);
    g.add(armL);

    /* --- lengan kanan: tongkat jalan saudagar berkoin emas ke depan --- */
    const armR=new THREE.Group();armR.position.set(0.31,0.94,0);
    armR.add(at(box(0.16,0.12,0.16,TUNIC),0,-0.07,0));
    armR.add(at(box(0.18,0.08,0.18,ROBE_D),0,-0.16,0));
    armR.add(at(box(0.14,0.16,0.14,SKIN),0,-0.27,0));
    armR.add(at(box(0.13,0.09,0.13,SKIN_D),0,-0.38,0));

    // Grip tongkat jalan di tangan kanan (menghadap ke depan +Z)
    const grip=new THREE.Group();grip.position.set(0,-0.38,0.06);
    grip.rotation.set(-0.25,0,0.04);
    armR.add(grip);

    // Batang kayu mahoni mewah tongkat jalan mengarah lurus ke depan (+Z)
    grip.add(at(box(0.045,0.045,1.05,0x3a1810),0,0,0.36));
    grip.add(at(box(0.055,0.055,0.20,GOLD),0,0,0)); // genggaman tangan emas
    grip.add(at(box(0.065,0.065,0.08,GOLD),0,0,0.80)); // kerah emas
    // Nisan Koin Emas Raksasa di kepala tongkat (menghadap depan +Z)
    const coinFinial=new THREE.Group();coinFinial.position.set(0,0,0.94);
    coinFinial.add(at(box(0.18,0.18,0.06,GOLD),0,0,0));     // koin emas tebal
    coinFinial.add(at(box(0.14,0.14,0.08,GOLD_L),0,0,0));   // relief koin berpendar
    coinFinial.add(at(box(0.06,0.06,0.09,0xffffff),0,0,0)); // kilau berlian di pusat koin
    grip.add(coinFinial);
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
window.NPC_Merchant=NPC_Merchant;
