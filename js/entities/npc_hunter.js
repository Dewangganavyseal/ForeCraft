'use strict';
/* =============================================================================
   ENTITAS NPC: PEMBURU (🏹)
   -----------------------------------------------------------------------------
   Model 3D: Pemanah hutan berkerudung hijau ranger dengan bulu emas, tabung
   anak panah (quiver) di punggung, busur lengkung (recurve bow) di tangan kiri,
   dan anak panah berujung baja tajam di tangan kanan yang mengarah ke depan.
   ============================================================================= */

const NPC_Hunter={

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
    const ROBE=0x4a6632,ROBE_D=0x314620,ROBE_L=0x668846,
          HOOD=0x2b3d1c,HOOD_D=0x1c2812,
          SKIN=0xd29a68,SKIN_D=0xb0764c,SKIN_L=0xebb282,
          HAIR=0x382414,HAIR_D=0x22150a,
          BOOT=0x2e2116,BOOT_D=0x1a120b,
          WOODC=0x5c3d22,WOOD_D=0x3d2714,
          METAL=0xb0bcc9,METAL_D=0x7d8996,METAL_H=0xdce6f0,
          GOLD=0xdca832,FUR=0x6e563b,STRING=0xe8e2d2;
    const BODY_Y=0.78;

    /* --- kaki: celana ranger kelana, pembungkus betis kulit & sepatu senyap --- */
    const legs=[];
    for(const side of[1,-1]){
      const lg=new THREE.Group();lg.position.set(0.12*side,0.52,0);
      lg.add(at(box(0.18,0.18,0.20,ROBE_D),0,-0.09,0));
      lg.add(at(box(0.165,0.18,0.185,HOOD_D),0,-0.24,0));
      // lilitan tali kamuflase betis
      lg.add(at(box(0.175,0.04,0.19,WOODC),0,-0.20,0));
      lg.add(at(box(0.175,0.04,0.19,WOODC),0,-0.28,0));
      // sepatu pemburu senyap
      lg.add(at(box(0.155,0.14,0.175,BOOT),0,-0.35,0.01));
      lg.add(at(box(0.17,0.09,0.22,BOOT),0,-0.44,0.03));
      lg.add(at(box(0.18,0.035,0.24,BOOT_D),0,-0.49,0.035));
      g.add(lg);legs.push(lg);
    }

    /* --- torso: tunik hijau hutan + kerah bulu + tabung anak panah di punggung --- */
    const body=box(0.48,0.46,0.33,ROBE);body.position.y=BODY_Y;g.add(body);
    // kerah bulu hangat di pundak
    body.add(at(box(0.52,0.10,0.37,FUR),0,0.19,0));
    body.add(at(box(0.44,0.06,0.10,FUR),0,0.21,0.15));
    // rompi kulit pelindung dada
    body.add(at(box(0.44,0.30,0.10,HOOD),0,0.02,0.13));
    body.add(at(box(0.42,0.28,0.06,HOOD_D),0,0.02,-0.14));
    // sabuk pemburu & kantong perlengkapan
    body.add(at(box(0.50,0.08,0.35,WOOD_D),0,-0.10,0));
    body.add(at(box(0.10,0.09,0.37,GOLD),0,-0.10,0));
    body.add(at(box(0.11,0.12,0.08,WOOD_D),0.19,-0.11,0.13)); // kantong obat/umpan
    body.add(at(box(0.06,0.14,0.06,WOODC),-0.18,-0.12,0.13)); // terompet buru kecil

    // Tabung anak panah (Quiver) di punggung berisi panah berbulu
    const quiver=new THREE.Group();quiver.position.set(0.06,0.06,-0.19);
    quiver.rotation.z=0.45;
    quiver.add(at(box(0.12,0.44,0.12,WOOD_D),0,0,0));
    quiver.add(at(box(0.13,0.06,0.13,FUR),0,0.20,0));   // rim bulu tabung
    quiver.add(at(box(0.13,0.05,0.13,GOLD),0,-0.19,0)); // dasar tabung
    // Batang & bulu anak panah di dalam tabung
    for(const pa of[[-0.03,0.28,0],[0.03,0.26,-0.02],[0,0.31,0.02]]){
      quiver.add(at(box(0.02,0.22,0.02,WOODC),pa[0],pa[1],pa[2]));
      quiver.add(at(box(0.045,0.08,0.012,STRING),pa[0],pa[1]+0.10,pa[2]));
    }
    body.add(quiver);

    /* --- kepala: tudung ranger hijau + bulu emas + wajah pengintai --- */
    const head=box(0.34,0.32,0.32,SKIN);head.position.y=1.16;g.add(head);
    head.add(at(box(0.30,0.08,0.30,SKIN_D),0,-0.14,0));
    // Tudung ranger kain hijau
    head.add(at(box(0.40,0.18,0.38,HOOD),0,0.14,-0.02));
    head.add(at(box(0.42,0.12,0.16,HOOD_D),0,0.04,-0.14));
    head.add(at(box(0.36,0.08,0.12,HOOD),0,0.19,0.11)); // pet tudung depan
    // Bulu pheasant emas di samping kiri tudung
    const feather=new THREE.Group();feather.position.set(-0.21,0.16,0.02);
    feather.rotation.z=0.35;
    feather.add(at(box(0.02,0.26,0.05,GOLD),0,0.08,0));
    feather.add(at(box(0.015,0.16,0.04,ROBE_L),0,0.14,0));
    head.add(feather);

    // Mata pengintai (iris hijau hutan)
    for(const s of[1,-1]){
      head.add(at(box(0.07,0.055,0.02,0xffffff),0.08*s,0.02,0.163));
      head.add(at(box(0.04,0.055,0.02,0x2b4f24),0.08*s,0.02,0.174));
      head.add(at(box(0.015,0.015,0.01,0xffffff),0.085*s,0.035,0.182));
      head.add(at(box(0.09,0.03,0.02,HAIR_D),0.08*s,0.065,0.17));
    }
    head.add(at(box(0.06,0.09,0.08,SKIN_D),0,-0.02,0.19));
    // janggut pendek pemburu
    head.add(at(box(0.14,0.06,0.05,HAIR_D),0,-0.08,0.175));
    head.add(at(box(0.08,0.08,0.04,HAIR),0,-0.13,0.165));

    /* --- lengan kiri: pelindung lengan panahan & busur lengkung ke depan --- */
    const armL=new THREE.Group();armL.position.set(-0.31,0.94,0);
    armL.add(at(box(0.17,0.09,0.18,HOOD),0,0.01,0));
    armL.add(at(box(0.14,0.24,0.14,ROBE),0,-0.14,0));
    armL.add(at(box(0.15,0.12,0.15,WOOD_D),0,-0.27,0)); // pelindung pergelangan panah
    armL.add(at(box(0.13,0.09,0.13,SKIN),0,-0.38,0));

    // Busur Lengkung Berburu (Recurve Bow) di tangan kiri (menghadap ke depan +Z)
    const bowGrip=new THREE.Group();bowGrip.position.set(0,-0.38,0.06);
    bowGrip.rotation.set(-0.10,0.15,0);
    const bow=new THREE.Group();
    // Riser tengah
    bow.add(at(box(0.05,0.24,0.06,WOOD_D),0,0,0));
    bow.add(at(box(0.056,0.08,0.066,LEATH),0,0,0)); // balutan kulit pegangan
    // Sayap atas & lengkungan
    bow.add(at(box(0.04,0.28,0.05,WOODC),0,0.20,-0.03));
    const tipT=box(0.035,0.14,0.04,GOLD);tipT.position.set(0,0.36,0.04);tipT.rotation.x=-0.4;bow.add(tipT);
    // Sayap bawah & lengkungan
    bow.add(at(box(0.04,0.28,0.05,WOODC),0,-0.20,-0.03));
    const tipB=box(0.035,0.14,0.04,GOLD);tipB.position.set(0,-0.36,0.04);tipB.rotation.x=0.4;bow.add(tipB);
    // Tali busur
    bow.add(at(box(0.015,0.80,0.015,STRING),0,0,-0.08));
    bowGrip.add(bow);
    armL.add(bowGrip);
    g.add(armL);

    /* --- lengan kanan: sarung tangan tali & anak panah baja siap tempur --- */
    const armR=new THREE.Group();armR.position.set(0.31,0.94,0);
    armR.add(at(box(0.17,0.09,0.18,HOOD),0,0.01,0));
    armR.add(at(box(0.14,0.24,0.14,ROBE),0,-0.14,0));
    armR.add(at(box(0.15,0.12,0.15,WOOD_D),0,-0.27,0));
    armR.add(at(box(0.13,0.09,0.13,SKIN),0,-0.38,0));

    // Grip tangan kanan: memegang anak panah baja tajam (menghadap ke depan +Z)
    const gripR=new THREE.Group();gripR.position.set(0,-0.38,0.06);
    gripR.rotation.set(-0.25,0,0.04);
    // Batang panah kayu lurus ke depan
    gripR.add(at(box(0.025,0.025,0.72,WOODC),0,0,0.26));
    // Bulu unggas belakang
    gripR.add(at(box(0.06,0.015,0.14,STRING),0,0,-0.05));
    gripR.add(at(box(0.015,0.06,0.14,STRING),0,0,-0.05));
    // Mata panah baja lebar (broadhead) di ujung depan (+Z)
    gripR.add(at(box(0.07,0.02,0.12,METAL_H),0,0,0.64));
    gripR.add(at(box(0.02,0.06,0.12,METAL_H),0,0,0.64));
    gripR.add(at(box(0.03,0.015,0.08,0xffffff),0,0,0.72)); // ujung runcing tajam
    armR.add(gripR);
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
window.NPC_Hunter=NPC_Hunter;
