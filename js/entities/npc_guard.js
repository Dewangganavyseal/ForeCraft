'use strict';
/* =============================================================================
   ENTITAS NPC: PENJAGA DESA (🛡️)
   -----------------------------------------------------------------------------
   Model 3D: Prajurit penjaga desa berhelm kettle hat baja dengan pelindung hidung,
   zirah dada pelat baja, perisai bundar desa di lengan kiri, dan tombak halberd
   yang menghadap ke depan dengan gagah.
   ============================================================================= */

const NPC_Guard={

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
    const ROBE=0xa8552f,ROBE_D=0x783618,ROBE_L=0xc06840,
          BLUE=0x354460,BLUE_D=0x222d40,
          SKIN=0xd49b6a,SKIN_D=0xb87a4c,SKIN_L=0xebb282,
          HAIR=0x38281c,HAIR_D=0x261910,
          BOOT=0x2e2318,BOOT_D=0x1e160e,
          WOODC=0x5c3d22,WOOD_D=0x3d2714,
          METAL=0xb0bcc9,METAL_D=0x7d8996,METAL_H=0xdce6f0,
          GOLD=0xd4a028,LEATHER=0x50351f;
    const BODY_Y=0.78;

    /* --- kaki berlapis: celana prajurit, pelindung lutut baja & sepatu bersol --- */
    const legs=[];
    for(const side of[1,-1]){
      const lg=new THREE.Group();lg.position.set(0.12*side,0.52,0);
      lg.add(at(box(0.19,0.18,0.21,BLUE),0,-0.09,0));
      lg.add(at(box(0.17,0.18,0.19,BLUE_D),0,-0.24,0));
      // pelindung lutut baja
      lg.add(at(box(0.14,0.10,0.06,METAL),0,-0.18,0.10));
      lg.add(at(box(0.11,0.06,0.03,METAL_H),0,-0.18,0.12));
      // sepatu bot baja & sol
      lg.add(at(box(0.16,0.14,0.18,BOOT),0,-0.35,0.01));
      lg.add(at(box(0.175,0.09,0.23,BOOT),0,-0.44,0.03));
      lg.add(at(box(0.185,0.04,0.25,BOOT_D),0,-0.49,0.035));
      g.add(lg);legs.push(lg);
    }

    /* --- torso: tunik merah penjaga + pelat dada baja + sabuk perlengkapan --- */
    const body=box(0.50,0.46,0.34,ROBE);body.position.y=BODY_Y;g.add(body);
    // lipatan bawah tunik
    body.add(at(box(0.53,0.12,0.37,ROBE_D),0,-0.22,0));
    // pelat dada baja depan & belakang
    body.add(at(box(0.44,0.32,0.12,METAL),0,0.05,0.14));
    body.add(at(box(0.40,0.24,0.04,METAL_H),0,0.07,0.20));
    body.add(at(box(0.42,0.30,0.08,METAL_D),0,0.04,-0.15));
    // paku keling emas dada
    body.add(at(box(0.04,0.04,0.02,GOLD),-0.16,0.16,0.20));
    body.add(at(box(0.04,0.04,0.02,GOLD),0.16,0.16,0.20));
    // sabuk kulit tebal & gesper kuningan
    body.add(at(box(0.52,0.08,0.36,LEATHER),0,-0.10,0));
    body.add(at(box(0.12,0.10,0.38,GOLD),0,-0.10,0));
    body.add(at(box(0.06,0.05,0.02,0x222222),0,-0.10,0.192));
    // kantong kulit di pinggul kanan
    body.add(at(box(0.10,0.11,0.08,LEATHER),0.22,-0.12,0.12));
    body.add(at(box(0.08,0.03,0.06,WOODC),0.22,-0.06,0.12));

    /* --- kepala: wajah prajurit, kumis disiplin & helm kettle hat baja --- */
    const head=box(0.34,0.32,0.32,SKIN);head.position.y=1.16;g.add(head);
    head.add(at(box(0.30,0.08,0.30,SKIN_D),0,-0.14,0));
    // telinga
    head.add(at(box(0.04,0.09,0.06,SKIN_D),0.18,-0.01,0));
    head.add(at(box(0.04,0.09,0.06,SKIN_D),-0.18,-0.01,0));
    // mata detail dengan kilau
    for(const s of[1,-1]){
      head.add(at(box(0.07,0.055,0.02,0xffffff),0.08*s,0.02,0.163));
      head.add(at(box(0.04,0.055,0.02,0x1b2330),0.08*s,0.02,0.174));
      head.add(at(box(0.015,0.015,0.01,0xffffff),0.09*s,0.035,0.182));
      // alis tegas
      head.add(at(box(0.09,0.03,0.025,HAIR_D),0.08*s,0.07,0.17));
    }
    // hidung mancung & kumis tebal penjaga
    head.add(at(box(0.06,0.10,0.08,SKIN_D),0,-0.02,0.19));
    head.add(at(box(0.22,0.06,0.05,HAIR_D),0,-0.08,0.18));
    head.add(at(box(0.26,0.03,0.04,HAIR),0,-0.10,0.18));

    // Helm Kettle Hat baja lengkap
    head.add(at(box(0.39,0.18,0.39,METAL),0,0.16,-0.01));
    head.add(at(box(0.50,0.04,0.50,METAL_D),0,0.09,-0.01));
    head.add(at(box(0.06,0.12,0.36,METAL_H),0,0.27,-0.01)); // jambul/crest atas
    head.add(at(box(0.05,0.13,0.05,METAL_H),0,0.01,0.20));  // pelindung hidung
    head.add(at(box(0.36,0.03,0.04,LEATHER),0,-0.14,0.08)); // tali dagu kulit

    /* --- lengan kiri: pauldron baja, lengan tunik & perisai bundar desa --- */
    const armL=new THREE.Group();armL.position.set(-0.32,0.94,0);
    // pauldron baja pundak
    armL.add(at(box(0.19,0.10,0.20,METAL),-0.02,0.03,0));
    armL.add(at(box(0.16,0.06,0.18,METAL_H),-0.02,0.07,0));
    armL.add(at(box(0.14,0.24,0.14,ROBE),0,-0.14,0));
    armL.add(at(box(0.15,0.10,0.15,METAL_D),0,-0.28,0)); // bracer baja
    armL.add(at(box(0.13,0.10,0.13,LEATHER),0,-0.38,0)); // sarung tangan
    g.add(armL);

    // Perisai bundar desa di lengan kiri (menghadap ke depan +Z)
    const shield=new THREE.Group();shield.position.set(-0.16,-0.24,0.12);
    shield.add(at(box(0.44,0.44,0.05,0x6a3820),0,0,0));
    shield.add(at(box(0.48,0.48,0.02,METAL),0,0,0.028));
    shield.add(at(box(0.36,0.09,0.02,ROBE),0,0,0.032));
    shield.add(at(box(0.09,0.36,0.02,ROBE),0,0,0.032));
    shield.add(at(box(0.13,0.13,0.06,METAL_H),0,0,0.06)); // boss tengah
    armL.add(shield);

    /* --- lengan kanan: pauldron baja & halberd menghadap ke depan --- */
    const armR=new THREE.Group();armR.position.set(0.32,0.94,0);
    armR.add(at(box(0.19,0.10,0.20,METAL),0.02,0.03,0));
    armR.add(at(box(0.16,0.06,0.18,METAL_H),0.02,0.07,0));
    armR.add(at(box(0.14,0.24,0.14,ROBE),0,-0.14,0));
    armR.add(at(box(0.15,0.10,0.15,METAL_D),0,-0.28,0));
    armR.add(at(box(0.13,0.10,0.13,LEATHER),0,-0.38,0));

    // Grip senjata di tangan kanan (menghadap ke depan +Z)
    const grip=new THREE.Group();grip.position.set(0,-0.38,0.06);
    grip.rotation.set(-0.25,0,0.05); // posisi siap laras ke depan
    armR.add(grip);

    // Senjata Halberd Penjaga Desa (ujung bilah lurus ke depan +Z)
    grip.add(at(box(0.045,0.045,1.25,WOODC),0,0,0.32)); // gagang kayu panjang
    grip.add(at(box(0.055,0.055,0.20,LEATHER),0,0,0));  // pegangan tangan kulit
    grip.add(at(box(0.07,0.07,0.07,GOLD),0,0,0.86));    // cincin emas pengunci
    // Mata kapak halberd
    grip.add(at(box(0.025,0.26,0.22,METAL),-0.08,0.05,0.96));
    grip.add(at(box(0.015,0.22,0.18,METAL_H),-0.08,0.05,0.96));
    // Kait belakang anti-tunggangan
    grip.add(at(box(0.025,0.08,0.12,METAL_D),0.07,0.02,0.93));
    // Ujung tombak lurus depan (+Z)
    grip.add(at(box(0.06,0.03,0.30,METAL_H),0,0,1.10));
    grip.add(at(box(0.03,0.02,0.12,0xffffff),0,0,1.26)); // mata tajam tombak
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
    if(n.parts.armL)n.parts.armL.rotation.x=-step*0.5;
    const sw=n.swing>0?1-n.swing/0.25:0;
    if(n.parts.armR)n.parts.armR.rotation.x=lerp(step*0.5,-1.4,sw);
    if(n.parts.body)n.parts.body.position.y=n.parts.bodyY+
      Math.abs(Math.sin(t*9))*0.03*Math.min(1,sp/2);
    if(n.parts.head)n.parts.head.rotation.y=n.target?0:Math.sin(t*1.4)*0.35;
  },
};
window.NPC_Guard=NPC_Guard;
