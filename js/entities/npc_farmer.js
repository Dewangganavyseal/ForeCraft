'use strict';
/* =============================================================================
   ENTITAS NPC: PETANI (🌾)
   -----------------------------------------------------------------------------
   Model 3D: Petani desa ceria bertopi jerami anyaman lebar dengan tangkai gandum
   di mulut, celemek kerja bertali rami, seikat bulir gandum emas di tangan kiri,
   dan sabit pemanen/cangkul baja bergagang kayu yang menghadap lurus ke depan.
   ============================================================================= */

const NPC_Farmer={

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
    const ROBE=0x668b3c,ROBE_D=0x466226,ROBE_L=0x88ad52,
          APRON=0x5a4026,APRON_D=0x3e2b18,
          SKIN=0xd69c68,SKIN_D=0xb87a4c,
          STRAW=0xdfb840,STRAW_D=0xb58e2a,STRAW_L=0xf5d262,
          BOOT=0x2c2218,BOOT_D=0x1a130c,
          WOODC=0x634224,WOOD_D=0x422a16,
          METAL=0xb0bcc8,METAL_H=0xdce8f2,
          WHEAT=0xe8be3e,WHEAT_L=0xffdf6c;
    const BODY_Y=0.78;

    /* --- kaki: celana kerja cokelat bertambal lutut & sepatu bot kebun --- */
    const legs=[];
    for(const side of[1,-1]){
      const lg=new THREE.Group();lg.position.set(0.12*side,0.52,0);
      lg.add(at(box(0.18,0.18,0.20,0x4a3b2a),0,-0.09,0));
      lg.add(at(box(0.165,0.18,0.185,0x3a2d20),0,-0.24,0));
      // tambalan kain di lutut
      lg.add(at(box(0.14,0.11,0.05,ROBE_D),0,-0.18,0.10));
      // sepatu bot kebun bersol lumpur
      lg.add(at(box(0.16,0.14,0.18,BOOT),0,-0.35,0.01));
      lg.add(at(box(0.175,0.09,0.22,BOOT),0,-0.44,0.03));
      lg.add(at(box(0.185,0.04,0.24,BOOT_D),0,-0.49,0.035));
      g.add(lg);legs.push(lg);
    }

    /* --- torso: kemeja hijau daun + celemek kain rami bertali --- */
    const body=box(0.48,0.46,0.33,ROBE);body.position.y=BODY_Y;g.add(body);
    // celemek kerja cokelat di depan
    body.add(at(box(0.44,0.36,0.10,APRON),0,-0.02,0.13));
    // kantong bibit besar di depan celemek
    body.add(at(box(0.32,0.16,0.06,APRON_D),0,-0.10,0.18));
    body.add(at(box(0.10,0.04,0.02,WHEAT),0,-0.02,0.20)); // sedikit bulir jerami mencuat
    // tali suspender celemek
    body.add(at(box(0.06,0.46,0.02,APRON_D),-0.13,0.03,0.168));
    body.add(at(box(0.06,0.46,0.02,APRON_D),0.13,0.03,0.168));
    // sabuk tali rami
    body.add(at(box(0.50,0.06,0.35,STRAW_D),0,-0.10,0));
    body.add(at(box(0.08,0.09,0.08,STRAW),-0.16,-0.10,0.16)); // simpul tali rami

    /* --- kepala: topi jerami anyaman lebar + tangkai gandum di mulut --- */
    const head=box(0.34,0.32,0.32,SKIN);head.position.y=1.16;g.add(head);
    head.add(at(box(0.30,0.08,0.30,SKIN_D),0,-0.14,0));

    // Topi Jerami Anyaman Lebar (Wide-brim straw hat)
    head.add(at(box(0.56,0.04,0.56,STRAW),0,0.14,0));       // pinggiran caping lebar
    head.add(at(box(0.58,0.02,0.58,STRAW_L),0,0.13,0));     // tepian anyaman luar
    head.add(at(box(0.34,0.16,0.34,STRAW),0,0.23,0));       // mahkota topi
    head.add(at(box(0.36,0.04,0.36,APRON_D),0,0.16,0));     // pita pengikat cokelat

    // Mata ramah petani desa
    for(const s of[1,-1]){
      head.add(at(box(0.07,0.05,0.02,0xffffff),0.08*s,0.02,0.163));
      head.add(at(box(0.04,0.05,0.02,0x243218),0.08*s,0.02,0.174));
      head.add(at(box(0.015,0.015,0.01,0xffffff),0.085*s,0.035,0.182));
      head.add(at(box(0.09,0.03,0.02,0x3e2b18),0.08*s,0.065,0.17));
    }
    head.add(at(box(0.06,0.09,0.08,SKIN_D),0,-0.02,0.19));
    // senyum ramah & tangkai gandum di sudut mulut
    head.add(at(box(0.12,0.03,0.02,0x8c4636),0,-0.08,0.17));
    const wheatStalk=new THREE.Group();wheatStalk.position.set(0.07,-0.08,0.18);
    wheatStalk.rotation.z=-0.35;
    wheatStalk.add(at(box(0.02,0.16,0.02,0x8fa838),0,0.06,0)); // batang hijau
    wheatStalk.add(at(box(0.04,0.08,0.04,WHEAT_L),0,0.14,0));  // bulir emas
    head.add(wheatStalk);

    /* --- lengan kiri: lengan baju gulung & seikat bulir gandum emas --- */
    const armL=new THREE.Group();armL.position.set(-0.31,0.94,0);
    armL.add(at(box(0.16,0.14,0.16,ROBE),0,-0.08,0));
    armL.add(at(box(0.17,0.06,0.17,ROBE_D),0,-0.18,0)); // lipatan lengan baju gulung
    armL.add(at(box(0.14,0.16,0.14,SKIN),0,-0.27,0));
    armL.add(at(box(0.13,0.09,0.13,SKIN_D),0,-0.38,0));

    // Seikat Gandum Emas (Wheat Sheaf) di tangan kiri
    const wheat=new THREE.Group();wheat.position.set(-0.06,-0.34,0.12);
    wheat.rotation.set(0.2,0,0.15);
    wheat.add(at(box(0.16,0.28,0.16,0x7d9c36),0,-0.04,0)); // rumpun batang
    wheat.add(at(box(0.18,0.04,0.18,WOOD_D),0,-0.04,0));  // tali pengikat jerami
    wheat.add(at(box(0.22,0.20,0.22,WHEAT),0,0.16,0));    // bulir gandum emas
    wheat.add(at(box(0.18,0.12,0.18,WHEAT_L),0,0.28,0));  // puncak bulir cerah
    armL.add(wheat);
    g.add(armL);

    /* --- lengan kanan: sabit pemanen / cangkul baja menghadap ke depan --- */
    const armR=new THREE.Group();armR.position.set(0.31,0.94,0);
    armR.add(at(box(0.16,0.14,0.16,ROBE),0,-0.08,0));
    armR.add(at(box(0.17,0.06,0.17,ROBE_D),0,-0.18,0));
    armR.add(at(box(0.14,0.16,0.14,SKIN),0,-0.27,0));
    armR.add(at(box(0.13,0.09,0.13,SKIN_D),0,-0.38,0));

    // Grip tangan kanan (menghadap ke depan +Z)
    const grip=new THREE.Group();grip.position.set(0,-0.38,0.06);
    grip.rotation.set(-0.25,0,0.04);
    armR.add(grip);

    // Gagang kayu panjang sabit pemanen mengarah ke depan (+Z)
    grip.add(at(box(0.045,0.045,1.05,WOODC),0,0,0.36));
    grip.add(at(box(0.055,0.055,0.20,APRON_D),0,0,0)); // lilitan pegangan tangan
    grip.add(at(box(0.07,0.07,0.10,METAL),0,0,0.82));   // cincin pengunci besi
    // Bilah sabit pemanen baja melengkung lebar ke depan (+Z)
    grip.add(at(box(0.26,0.03,0.16,METAL),0.10,0.06,0.88));
    grip.add(at(box(0.24,0.02,0.14,METAL_H),0.10,0.06,0.88));
    grip.add(at(box(0.16,0.02,0.18,0xffffff),0.06,0.06,0.98)); // ujung sabit tajam depan
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
window.NPC_Farmer=NPC_Farmer;
