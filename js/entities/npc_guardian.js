'use strict';
/* =============================================================================
   ENTITAS NPC: GUARDIAN (🛡️)
   -----------------------------------------------------------------------------
   Model 3D: Ksatria pelindung benteng berzirah baja penuh, helm pelat ksatria
   berjambul biru, pelat pundak bertingkat (heavy pauldrons), perisai menara
   (tower shield) raksasa berlapis baja di tangan kiri, dan gada tempur bergerigi
   (flanged war mace) yang menghadap lurus ke depan.
   ============================================================================= */

const NPC_Guardian={

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
    const ROBE=0x324666,ROBE_D=0x1f2e46,
          METAL=0xa8b6c6,METAL_D=0x707e8e,METAL_H=0xdde6f2,
          GOLD=0xdca832,GOLD_D=0xab7e1c,
          BOOT=0x222a36,BOOT_D=0x141a22,
          PLUME=0x2b528e;
    const BODY_Y=0.78;

    /* --- kaki: zirah pelat kaki baja penuh (greaves & sabatons) --- */
    const legs=[];
    for(const side of[1,-1]){
      const lg=new THREE.Group();lg.position.set(0.13*side,0.52,0);
      lg.add(at(box(0.20,0.18,0.22,ROBE_D),0,-0.09,0));
      // pelat paha baja
      lg.add(at(box(0.18,0.18,0.20,METAL),0,-0.24,0));
      // pelat pelindung lutut ksatria
      lg.add(at(box(0.16,0.12,0.08,METAL_H),0,-0.18,0.11));
      lg.add(at(box(0.08,0.06,0.04,GOLD),0,-0.18,0.15)); // ornamen emas lutut
      // sepatu perang baja (sabatons)
      lg.add(at(box(0.17,0.14,0.19,METAL_D),0,-0.35,0.01));
      lg.add(at(box(0.185,0.10,0.24,METAL),0,-0.44,0.03));
      lg.add(at(box(0.195,0.04,0.26,BOOT_D),0,-0.49,0.035));
      g.add(lg);legs.push(lg);
    }

    /* --- torso: zirah pelat dada baja tebal + sabuk ksatria bergesper emas --- */
    const body=box(0.52,0.48,0.36,ROBE);body.position.y=BODY_Y;g.add(body);
    // pelat dada baja cembung depan & belakang
    body.add(at(box(0.48,0.38,0.16,METAL),0,0.04,0.13));
    body.add(at(box(0.42,0.28,0.06,METAL_H),0,0.06,0.20)); // pelat dada utama berkilau
    body.add(at(box(0.46,0.36,0.10,METAL_D),0,0.04,-0.15));
    // paku keling & lambang salib ksatria emas di dada
    body.add(at(box(0.08,0.20,0.02,GOLD),0,0.08,0.232));
    body.add(at(box(0.20,0.08,0.02,GOLD),0,0.12,0.232));
    // sabuk perang ksatria tebal
    body.add(at(box(0.54,0.09,0.38,0x2a1c12),0,-0.12,0));
    body.add(at(box(0.14,0.11,0.40,GOLD),0,-0.12,0)); // gesper emas singa
    // pelat pelindung paha bawah (tassets baja)
    body.add(at(box(0.18,0.14,0.04,METAL),-0.16,-0.24,0.18));
    body.add(at(box(0.18,0.14,0.04,METAL),0.16,-0.24,0.18));

    /* --- kepala: Helm Ksatria Agung (Great Helm) dengan visor celah & jambul biru --- */
    const head=box(0.36,0.36,0.36,METAL);head.position.y=1.18;g.add(head);
    // pelat penguat sudut helm
    head.add(at(box(0.38,0.06,0.38,METAL_H),0,-0.10,0));
    head.add(at(box(0.06,0.38,0.38,GOLD),0,0.01,0));    // pita salib emas vertikal
    head.add(at(box(0.38,0.06,0.38,GOLD),0,0.03,0));    // pita salib emas horizontal
    // celah mata ksatria (visor eye-slit hitam tajam)
    head.add(at(box(0.26,0.04,0.04,0x10141a),0,0.03,0.185));
    // lubang ventilasi nafas helm
    for(const vx of[-0.08,-0.03,0.03,0.08]){
      head.add(at(box(0.02,0.06,0.02,0x10141a),vx,-0.08,0.185));
    }
    // Jambul bulu biru ksatria (Plume) megah di atas helm
    const plume=new THREE.Group();plume.position.set(0,0.26,-0.04);
    plume.add(at(box(0.06,0.16,0.30,PLUME),0,0,0));
    plume.add(at(box(0.05,0.22,0.18,PLUME),0,0.04,-0.06));
    head.add(plume);

    /* --- lengan kiri: pauldron pelat raksasa & perisai menara baja (tower shield) --- */
    const armL=new THREE.Group();armL.position.set(-0.35,0.94,0);
    // Pauldron baja bertingkat raksasa
    armL.add(at(box(0.22,0.12,0.22,METAL),-0.03,0.05,0));
    armL.add(at(box(0.20,0.08,0.20,METAL_H),-0.03,0.09,0));
    armL.add(at(box(0.18,0.04,0.18,GOLD),-0.03,0.12,0)); // mahkota bahu emas
    armL.add(at(box(0.15,0.22,0.15,ROBE),0,-0.12,0));
    armL.add(at(box(0.17,0.14,0.17,METAL_D),0,-0.27,0)); // sarung tangan pelat baja
    armL.add(at(box(0.15,0.10,0.15,METAL),0,-0.38,0));

    // Perisai Menara Raksasa (Tower Shield) di tangan kiri (menghadap lurus ke depan +Z)
    const shield=new THREE.Group();shield.position.set(-0.16,-0.20,0.14);
    shield.add(at(box(0.54,0.82,0.06,ROBE),0,0,0));        // badan perisai biru navy
    shield.add(at(box(0.58,0.86,0.03,METAL),0,0,0.025));   // bingkai baja pelindung
    shield.add(at(box(0.08,0.84,0.04,GOLD),0,0,0.035));    // garis emas vertikal
    shield.add(at(box(0.46,0.08,0.04,GOLD),0,0.12,0.035)); // palang emas horizontal
    shield.add(at(box(0.14,0.14,0.06,METAL_H),0,0.12,0.065)); // boss baja perisai depan
    armL.add(shield);
    g.add(armL);

    /* --- lengan kanan: pauldron & gada tempur bergerigi lurus ke depan --- */
    const armR=new THREE.Group();armR.position.set(0.35,0.94,0);
    armR.add(at(box(0.22,0.12,0.22,METAL),0.03,0.05,0));
    armR.add(at(box(0.20,0.08,0.20,METAL_H),0.03,0.09,0));
    armR.add(at(box(0.18,0.04,0.18,GOLD),0.03,0.12,0));
    armR.add(at(box(0.15,0.22,0.15,ROBE),0,-0.12,0));
    armR.add(at(box(0.17,0.14,0.17,METAL_D),0,-0.27,0));
    armR.add(at(box(0.15,0.10,0.15,METAL),0,-0.38,0));

    // Grip gada tempur di tangan kanan (menghadap lurus ke depan +Z)
    const grip=new THREE.Group();grip.position.set(0,-0.38,0.06);
    grip.rotation.set(-0.25,0,0.04);
    armR.add(grip);

    // Gagang gada baja berulir mengarah lurus ke depan (+Z)
    grip.add(at(box(0.05,0.05,0.80,METAL_D),0,0,0.22));
    grip.add(at(box(0.06,0.06,0.22,0x221810),0,0,0));  // lilitan pegangan tangan kulit
    grip.add(at(box(0.08,0.08,0.06,GOLD),0,0,-0.12));  // pommel emas berat penyeimbang
    grip.add(at(box(0.09,0.09,0.10,GOLD),0,0,0.58));   // kerah emas pengunci
    // Kepala gada tempur bergerigi (Flanged War Mace Head) baja menghadap depan
    grip.add(at(box(0.18,0.18,0.22,METAL),0,0,0.72));
    // 4 sirip pemecah zirah baja runcing
    grip.add(at(box(0.03,0.28,0.22,METAL_H),0,0,0.72));
    grip.add(at(box(0.28,0.03,0.22,METAL_H),0,0,0.72));
    // Ujung paku penembus zirah di puncak mace (+Z)
    grip.add(at(box(0.05,0.05,0.14,METAL_H),0,0,0.88));
    grip.add(at(box(0.02,0.02,0.06,0xffffff),0,0,0.96)); // mata paku tajam
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
    const step=Math.sin(t*8)*0.45*Math.min(1,sp/2);
    if(n.parts.legs){
      n.parts.legs[0].rotation.x=step;
      n.parts.legs[1].rotation.x=-step;
    }
    if(n.parts.armL)n.parts.armL.rotation.x=-step*0.3;
    const sw=n.swing>0?1-n.swing/0.25:0;
    if(n.parts.armR)n.parts.armR.rotation.x=lerp(step*0.3,-1.4,sw);
    if(n.parts.body)n.parts.body.position.y=n.parts.bodyY+
      Math.abs(Math.sin(t*8))*0.025*Math.min(1,sp/2);
    if(n.parts.head)n.parts.head.rotation.y=n.target?0:Math.sin(t*1.2)*0.25;
  },
};
window.NPC_Guardian=NPC_Guardian;
