'use strict';
/* =============================================================================
   ENTITAS NPC: PENAMBANG (⛏️)
   -----------------------------------------------------------------------------
   Model 3D: Pekerja tambang tangguh bertopi pelindung dengan lampu karbida menyala,
   kain lap debu di leher, baju kerja denim berlapis penutup lutut, lentera tambang
   kuningan di tangan kiri, dan beliung tambang berkepala ganda tajam yang menghadap
   lurus ke depan.
   ============================================================================= */

const NPC_Miner={

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
    const SHIRT=0x665236,SHIRT_D=0x463520,
          DENIM=0x344254,DENIM_D=0x222c3a,
          SKIN=0xd09462,SKIN_D=0xae7448,
          HAIR=0x281c12,HAIR_D=0x18100a,
          BOOT=0x241c14,BOOT_D=0x16100a,
          WOODC=0x5c3d22,WOOD_D=0x3d2714,
          METAL=0xa8b4c0,METAL_D=0x707c88,METAL_H=0xd4e0ec,
          GOLD=0xdca832,LAMP_L=0xfff0a0,KERCHIEF=0x8c382a;
    const BODY_Y=0.78;

    /* --- kaki: celana kerja denim kokoh, penutup lutut kulit & sepatu bot baja --- */
    const legs=[];
    for(const side of[1,-1]){
      const lg=new THREE.Group();lg.position.set(0.12*side,0.52,0);
      lg.add(at(box(0.19,0.18,0.21,DENIM),0,-0.09,0));
      lg.add(at(box(0.17,0.18,0.19,DENIM_D),0,-0.24,0));
      // bantalan lutut kulit pelindung benturan batu
      lg.add(at(box(0.15,0.11,0.06,WOODC),0,-0.18,0.10));
      // sepatu bot tambang bersol tebal dengan pelindung jari baja
      lg.add(at(box(0.165,0.14,0.185,BOOT),0,-0.35,0.01));
      lg.add(at(box(0.18,0.09,0.23,BOOT),0,-0.44,0.03));
      lg.add(at(box(0.14,0.06,0.06,METAL),0,-0.45,0.12)); // sol jari baja
      lg.add(at(box(0.19,0.04,0.25,BOOT_D),0,-0.49,0.035));
      g.add(lg);legs.push(lg);
    }

    /* --- torso: kemeja kerja cokelat + rompi/suspender denim + sabuk perkakas --- */
    const body=box(0.50,0.46,0.34,SHIRT);body.position.y=BODY_Y;g.add(body);
    // celana kodok denim (bib overalls)
    body.add(at(box(0.48,0.28,0.12,DENIM),0,-0.04,0.13));
    body.add(at(box(0.46,0.26,0.08,DENIM_D),0,-0.04,-0.14));
    // tali suspender bahu
    body.add(at(box(0.08,0.46,0.02,DENIM_D),-0.14,0.03,0.175));
    body.add(at(box(0.08,0.46,0.02,DENIM_D),0.14,0.03,0.175));
    body.add(at(box(0.04,0.04,0.01,GOLD),-0.14,0.12,0.187)); // kancing suspender
    body.add(at(box(0.04,0.04,0.01,GOLD),0.14,0.12,0.187));
    // sabuk kulit penambang & kantong bijih
    body.add(at(box(0.52,0.08,0.36,WOOD_D),0,-0.11,0));
    body.add(at(box(0.12,0.09,0.38,GOLD),0,-0.11,0));
    body.add(at(box(0.14,0.14,0.10,WOOD_D),0.20,-0.11,0.13)); // kantong bijih emas/batu
    body.add(at(box(0.05,0.14,0.04,METAL),-0.19,-0.12,0.13)); // pahat batu terselip

    // Kain lap debu / scarf merah di leher
    body.add(at(box(0.38,0.08,0.36,KERCHIEF),0,0.21,0.01));
    body.add(at(box(0.12,0.12,0.04,KERCHIEF),0,0.14,0.18));

    /* --- kepala: helm tambang dengan lampu karbida menyala + noda debu tambang --- */
    const head=box(0.34,0.32,0.32,SKIN);head.position.y=1.16;g.add(head);
    head.add(at(box(0.30,0.08,0.30,SKIN_D),0,-0.14,0));

    // Helm pelindung tambang kulit/baja
    head.add(at(box(0.39,0.16,0.39,WOOD_D),0,0.16,-0.01));
    head.add(at(box(0.44,0.04,0.44,WOOD_D),0,0.10,-0.01));
    head.add(at(box(0.38,0.03,0.08,WOODC),0,0.09,0.22)); // pet pelindung depan

    // Lampu Karbida Penambang di dahi helm (menyala terang)
    const lamp=new THREE.Group();lamp.position.set(0,0.17,0.21);
    lamp.add(at(box(0.10,0.10,0.05,GOLD),0,0,0)); // rumah lampu kuningan
    lamp.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.07,0.07,0.04),
      new THREE.MeshBasicMaterial({color:LAMP_L})),0,0,0.03)); // lensa kaca berpendar
    lamp.add(at(box(0.03,0.08,0.03,METAL_D),0,0.08,-0.01)); // cerobong atas
    head.add(lamp);

    // Mata penambang fokus
    for(const s of[1,-1]){
      head.add(at(box(0.07,0.05,0.02,0xffffff),0.08*s,0.02,0.163));
      head.add(at(box(0.04,0.05,0.02,0x282018),0.08*s,0.02,0.174));
      head.add(at(box(0.015,0.015,0.01,0xffffff),0.085*s,0.035,0.182));
      head.add(at(box(0.09,0.03,0.02,HAIR_D),0.08*s,0.065,0.17));
    }
    head.add(at(box(0.06,0.09,0.08,SKIN_D),0,-0.02,0.19));
    // noda jelaga tambang di pipi
    head.add(at(box(0.06,0.04,0.01,0x30261e),0.11,-0.04,0.166));
    head.add(at(box(0.05,0.03,0.01,0x30261e),-0.10,-0.05,0.166));
    // janggut kasar pekerja tambang
    head.add(at(box(0.24,0.10,0.06,HAIR_D),0,-0.12,0.15));

    /* --- lengan kiri: lengan baju gulung & lentera tambang kuningan --- */
    const armL=new THREE.Group();armL.position.set(-0.31,0.94,0);
    armL.add(at(box(0.16,0.14,0.16,SHIRT),0,-0.08,0));
    armL.add(at(box(0.17,0.06,0.17,SHIRT_D),0,-0.18,0)); // lipatan lengan baju gulung
    armL.add(at(box(0.14,0.16,0.14,SKIN_D),0,-0.27,0));  // lengan berotot
    armL.add(at(box(0.13,0.10,0.13,WOOD_D),0,-0.38,0));  // sarung tangan kerja

    // Lentera Minyak Tambang Kuningan di tangan kiri
    const lantern=new THREE.Group();lantern.position.set(0,-0.48,0.10);
    lantern.add(at(box(0.15,0.03,0.15,GOLD),0,-0.10,0));  // dasar kuningan
    lantern.add(at(box(0.15,0.04,0.15,GOLD),0,0.10,0));   // penutup atas
    lantern.add(at(box(0.04,0.08,0.04,METAL_D),0,0.15,0)); // gantungan
    lantern.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.11,0.16,0.11),
      new THREE.MeshBasicMaterial({color:0xffaa33})),0,0,0)); // kaca kuning berpendar
    armL.add(lantern);
    g.add(armL);

    /* --- lengan kanan: beliung tambang besi kokoh menghadap ke depan --- */
    const armR=new THREE.Group();armR.position.set(0.31,0.94,0);
    armR.add(at(box(0.16,0.14,0.16,SHIRT),0,-0.08,0));
    armR.add(at(box(0.17,0.06,0.17,SHIRT_D),0,-0.18,0));
    armR.add(at(box(0.14,0.16,0.14,SKIN_D),0,-0.27,0));
    armR.add(at(box(0.13,0.10,0.13,WOOD_D),0,-0.38,0));

    // Grip beliung tangan kanan (menghadap ke depan +Z)
    const grip=new THREE.Group();grip.position.set(0,-0.38,0.06);
    grip.rotation.set(-0.25,0,0.04);
    armR.add(grip);

    // Gagang beliung kayu panjang mengarah ke depan (+Z)
    grip.add(at(box(0.05,0.05,0.95,WOODC),0,0,0.30));
    grip.add(at(box(0.06,0.06,0.22,WOOD_D),0,0,0)); // pegangan tangan lilitan
    grip.add(at(box(0.08,0.08,0.12,METAL_D),0,0,0.72)); // cincin pengunci kepala beliung
    // Kepala beliung baja berkepala ganda (pickaxe head tajam menghadap depan)
    grip.add(at(box(0.44,0.08,0.08,METAL),0,0,0.78));
    grip.add(at(box(0.10,0.12,0.10,METAL_D),0,0,0.78));
    // Ujung taring beliung tajam kiri & kanan melengkung ke depan
    grip.add(at(box(0.07,0.07,0.16,METAL_H),0.20,0,0.84));
    grip.add(at(box(0.07,0.07,0.16,METAL_H),-0.20,0,0.84));
    grip.add(at(box(0.04,0.04,0.08,0xffffff),0.20,0,0.94)); // ujung intan tajam
    grip.add(at(box(0.04,0.04,0.08,0xffffff),-0.20,0,0.94));
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
    if(n.parts.armR)n.parts.armR.rotation.x=lerp(step*0.4,-1.5,sw);
    if(n.parts.body)n.parts.body.position.y=n.parts.bodyY+
      Math.abs(Math.sin(t*9))*0.03*Math.min(1,sp/2);
    if(n.parts.head)n.parts.head.rotation.y=n.target?0:Math.sin(t*1.4)*0.35;
  },
};
window.NPC_Miner=NPC_Miner;
