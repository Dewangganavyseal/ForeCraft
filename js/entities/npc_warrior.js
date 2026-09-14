'use strict';
/* =============================================================================
   ENTITAS NPC: PETARUNG (⚔️)
   -----------------------------------------------------------------------------
   Model 3D: Pendekar petarung desa berikat kepala tempur, rambut tajam bertekstur,
   rompi pelat baja-kulit (brigandine), sarung pedang di punggung, pelindung tangan
   tangkis di lengan kiri, dan pedang ksatria baja tajam yang menghadap lurus ke depan.
   ============================================================================= */

const NPC_Warrior={

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
    const ROBE=0x8f3b3b,ROBE_D=0x602222,ROBE_L=0xb04a4a,
          LEATH=0x422618,LEATH_D=0x2c180e,LEATH_L=0x633d26,
          SKIN=0xd29664,SKIN_D=0xb0764c,SKIN_L=0xebb07c,
          HAIR=0x302014,HAIR_D=0x1e120a,
          BOOT=0x261d15,BOOT_D=0x18110b,
          METAL=0xb8c4d0,METAL_D=0x7d8a98,METAL_H=0xdfe8f2,
          GOLD=0xdca832,BAND=0x9e2828;
    const BODY_Y=0.78;

    /* --- kaki tempur: celana berikat, pelindung lutut kulit tebal & sepatu baja --- */
    const legs=[];
    for(const side of[1,-1]){
      const lg=new THREE.Group();lg.position.set(0.12*side,0.52,0);
      lg.add(at(box(0.19,0.18,0.21,LEATH),0,-0.09,0));
      lg.add(at(box(0.17,0.18,0.19,LEATH_D),0,-0.24,0));
      // lilitan tali kulit & pelindung lutut
      lg.add(at(box(0.14,0.10,0.06,LEATH_L),0,-0.18,0.10));
      lg.add(at(box(0.10,0.06,0.03,METAL_D),0,-0.18,0.12));
      // sepatu bot bersol tebal dengan ujung baja
      lg.add(at(box(0.16,0.14,0.18,BOOT),0,-0.35,0.01));
      lg.add(at(box(0.175,0.09,0.23,BOOT),0,-0.44,0.03));
      lg.add(at(box(0.13,0.06,0.06,METAL),0,-0.45,0.12)); // pelindung jari baja
      lg.add(at(box(0.185,0.04,0.25,BOOT_D),0,-0.49,0.035));
      g.add(lg);legs.push(lg);
    }

    /* --- torso: tunik merah tempur + brigandine kulit berbintik paku baja --- */
    const body=box(0.50,0.46,0.34,ROBE);body.position.y=BODY_Y;g.add(body);
    // lapisan brigandine depan & paku baja
    body.add(at(box(0.46,0.36,0.14,LEATH),0,0.03,0.13));
    body.add(at(box(0.44,0.34,0.08,LEATH_D),0,0.03,-0.15));
    for(const px of[-0.14,0,0.14]){
      for(const py of[0.12,0.02,-0.08]){
        body.add(at(box(0.035,0.035,0.02,METAL_H),px,py,0.205));
      }
    }
    // sabuk tempur ganda & gesper emas
    body.add(at(box(0.52,0.08,0.36,LEATH_D),0,-0.11,0));
    body.add(at(box(0.12,0.10,0.38,GOLD),0,-0.11,0));
    body.add(at(box(0.06,0.05,0.02,0x1a1a1a),0,-0.11,0.193));
    // tali silang selempang pedang
    const strap=box(0.48,0.06,0.025,LEATH_L);
    strap.rotation.z=0.55;strap.position.set(0,0.06,0.19);body.add(strap);

    // Sarung pedang cadangan di punggung (miring realistis)
    const scabbard=new THREE.Group();scabbard.position.set(-0.06,0.05,-0.20);
    scabbard.rotation.z=-0.55;
    scabbard.add(at(box(0.08,0.66,0.06,LEATH_D),0,0,0));
    scabbard.add(at(box(0.09,0.08,0.07,GOLD),0,0.30,0)); // mulut sarung emas
    scabbard.add(at(box(0.085,0.08,0.065,GOLD),0,-0.30,0)); // ujung sarung emas
    body.add(scabbard);

    /* --- kepala: petarung tegas, ikat kepala merah & rambut bertekstur --- */
    const head=box(0.34,0.32,0.32,SKIN);head.position.y=1.16;g.add(head);
    head.add(at(box(0.30,0.08,0.30,SKIN_D),0,-0.14,0));
    // rambut lebat atas & samping
    head.add(at(box(0.36,0.14,0.36,HAIR),0,0.16,-0.01));
    head.add(at(box(0.38,0.10,0.14,HAIR_D),0,0.10,-0.13)); // rambut belakang
    // jambul rambut depan
    head.add(at(box(0.12,0.08,0.08,HAIR),0,0.22,0.15));
    head.add(at(box(0.08,0.06,0.06,HAIR_D),-0.10,0.20,0.14));
    head.add(at(box(0.08,0.06,0.06,HAIR_D),0.10,0.20,0.14));

    // Ikat kepala tempur merah + medali pelat baja
    head.add(at(box(0.37,0.065,0.35,BAND),0,0.11,0.01));
    head.add(at(box(0.08,0.08,0.02,METAL_H),0,0.11,0.185)); // medali dahi
    head.add(at(box(0.04,0.04,0.01,GOLD),0,0.11,0.196));
    // ujung pita ikat kepala berkibar di belakang
    const bandTail=box(0.06,0.22,0.02,BAND);
    bandTail.position.set(-0.14,0.0,-0.19);bandTail.rotation.z=0.3;head.add(bandTail);

    // Mata tajam petarung
    for(const s of[1,-1]){
      head.add(at(box(0.07,0.05,0.02,0xffffff),0.08*s,0.02,0.163));
      head.add(at(box(0.04,0.05,0.02,0x221a14),0.08*s,0.02,0.174));
      head.add(at(box(0.015,0.015,0.01,0xffffff),0.085*s,0.035,0.182));
      head.add(at(box(0.09,0.03,0.025,HAIR_D),0.08*s,0.065,0.17));
    }
    // hidung & bekas luka tempur di pipi kiri
    head.add(at(box(0.06,0.10,0.08,SKIN_D),0,-0.02,0.19));
    head.add(at(box(0.09,0.02,0.02,0x993333),-0.09,-0.05,0.17)); // bekas luka
    // rahang kokoh & kumis tipis petarung
    head.add(at(box(0.18,0.04,0.04,HAIR_D),0,-0.09,0.175));

    /* --- lengan kiri: pauldron pelat & pelindung lengan tangkis --- */
    const armL=new THREE.Group();armL.position.set(-0.32,0.94,0);
    armL.add(at(box(0.18,0.10,0.19,METAL),-0.02,0.03,0));
    armL.add(at(box(0.14,0.24,0.14,ROBE),0,-0.14,0));
    armL.add(at(box(0.16,0.14,0.16,LEATH_D),0,-0.28,0)); // bracer kulit tebal
    armL.add(at(box(0.04,0.12,0.18,METAL),-0.07,-0.28,0)); // pelat pelindung tangkis luar
    armL.add(at(box(0.13,0.10,0.13,LEATH),0,-0.38,0));
    g.add(armL);

    /* --- lengan kanan: pauldron & pedang ksatria baja lurus ke depan --- */
    const armR=new THREE.Group();armR.position.set(0.32,0.94,0);
    armR.add(at(box(0.18,0.10,0.19,METAL),0.02,0.03,0));
    armR.add(at(box(0.14,0.24,0.14,ROBE),0,-0.14,0));
    armR.add(at(box(0.16,0.14,0.16,LEATH_D),0,-0.28,0));
    armR.add(at(box(0.13,0.10,0.13,LEATH),0,-0.38,0));

    // Grip tangan kanan (menghadap lurus ke depan +Z)
    const grip=new THREE.Group();grip.position.set(0,-0.38,0.06);
    grip.rotation.set(-0.25,0,0.04);
    armR.add(grip);

    // Pedang Ksatria Petarung (Bilah memanjang lurus ke depan +Z)
    grip.add(at(box(0.05,0.05,0.18,LEATH_D),0,0,-0.05)); // gagang lilitan kulit
    grip.add(at(box(0.07,0.07,0.05,GOLD),0,0,-0.15));    // pommel emas penyeimbang
    grip.add(at(box(0.24,0.06,0.05,GOLD),0,0,0.05));     // crossguard emas
    grip.add(at(box(0.08,0.08,0.06,METAL),0,0,0.05));    // pasak bilah
    // Bilah pedang baja berkilau mengarah lurus ke depan (+Z)
    grip.add(at(box(0.085,0.025,0.68,METAL),0,0,0.42));
    grip.add(at(box(0.025,0.032,0.56,METAL_D),0,0,0.38)); // alur darah (fuller)
    grip.add(at(box(0.088,0.015,0.68,METAL_H),0,0,0.42)); // mata tajam kedua sisi
    // Ujung runcing pedang depan
    grip.add(at(box(0.05,0.022,0.10,0xffffff),0,0,0.80));
    grip.add(at(box(0.02,0.015,0.05,0xffffff),0,0,0.86));
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
    if(n.parts.armR)n.parts.armR.rotation.x=lerp(step*0.5,-1.5,sw);
    if(n.parts.body)n.parts.body.position.y=n.parts.bodyY+
      Math.abs(Math.sin(t*9))*0.03*Math.min(1,sp/2);
    if(n.parts.head)n.parts.head.rotation.y=n.target?0:Math.sin(t*1.4)*0.35;
  },
};
window.NPC_Warrior=NPC_Warrior;
