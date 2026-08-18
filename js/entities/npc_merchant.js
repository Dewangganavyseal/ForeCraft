'use strict';
/* =============================================================================
   ENTITAS NPC: PEDAGANG (🏪)
   -----------------------------------------------------------------------------
   File mandiri: MODEL 3D (build) + ANIMASI (animate). Merchant adalah
   pedagang yang membuka toko, memegang garu desa. Badan jubah & animasi sama persis dengan
   in-game (dulu dibangun NPCS.makeMesh di js/npc.js).
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
    const ROT=(m,rx,ry,rz)=>{if(rx)m.rotation.x=rx;if(ry)m.rotation.y=ry;if(rz)m.rotation.z=rz;return m;};
    const ROBE=0xc9a24b,HOOD=0x8a6a1e,
          ROBE_D=(ROBE&0xfefefe)>>1,ROBE_L=Math.min(0xffffff,ROBE+0x181818),
          HOOD_D=(HOOD&0xfefefe)>>1,
          SKIN=0xc98b5e,SKIN_D=0xb0764c,SKIN_L=0xdba273,BEARD=0xe4dcc8,BEARD_D=0xcfc4ae,
          BOOT=0x3b2f22,BOOT_D=0x2a2116,
          WOODC=0x6f4d2a,WOOD_D=0x57391d,METAL=0xc9d3de,METAL_D=0x9aa6b4,METAL_H=0xeef3f8,
          GOLD=0xd9a531,LEATHER=0x5c3f24;
    const BODY_Y=0.78;

    /* --- kaki detail: paha, tulang kering, sepatu bersol --- */
    const legs=[];
    for(const side of[1,-1]){
      const lg=new THREE.Group();lg.position.set(0.12*side,0.52,0);
      lg.add(at(box(0.18,0.14,0.20,ROBE_D),0,-0.07,0));
      lg.add(at(box(0.165,0.20,0.185,ROBE_D),0,-0.22,0));
      lg.add(at(box(0.15,0.14,0.17,BOOT),0,-0.36,0.01));
      lg.add(at(box(0.17,0.09,0.22,BOOT),0,-0.44,0.03));
      lg.add(at(box(0.18,0.035,0.25,BOOT_D),0,-0.49,0.04));
      lg.add(at(box(0.155,0.04,0.175,BOOT_D),0,-0.30,0.01));
      g.add(lg);legs.push(lg);
    }

    /* --- torso berlapis: jubah, ikat pinggang, kerah, tali --- */
    const body=box(0.50,0.44,0.34,ROBE);body.position.y=BODY_Y;g.add(body);
    body.add(at(box(0.54,0.12,0.38,ROBE_D),0,-0.20,0));
    body.add(at(box(0.46,0.10,0.35,ROBE_L),0,0.12,0));
    body.add(at(box(0.42,0.08,0.36,LEATHER),0,0.02,0));
    body.add(at(box(0.10,0.10,0.37,GOLD),0,0.02,0));
    body.add(at(box(0.05,0.05,0.02,0xffe9a0),0,0.02,0.19));
    body.add(at(box(0.56,0.10,0.40,HOOD_D),0,0.20,0));
    const strap=box(0.46,0.06,0.02,LEATHER,0);strap.rotation.z=0.5;
    strap.position.set(0,0.10,0.18);body.add(strap);
    body.add(at(box(0.12,0.10,0.08,LEATHER),0.16,-0.06,0.17));
    body.add(at(box(0.03,0.28,0.02,ROBE_D),0,0.02,0.175));

    /* --- kepala detail: wajah, tudung, janggut, mata, alis --- */
    const head=box(0.34,0.32,0.32,SKIN);head.position.y=1.16;g.add(head);
    head.add(at(box(0.30,0.10,0.30,SKIN_D),0,-0.14,0));
    head.add(at(box(0.40,0.16,0.38,HOOD),0,0.16,-0.02));
    head.add(at(box(0.42,0.10,0.14,HOOD),0,0.06,-0.16));
    head.add(at(box(0.36,0.06,0.10,HOOD_D),0,0.22,0.10));
    head.add(at(box(0.10,0.14,0.10,SKIN_D),0,-0.02,0.18));
    head.add(at(box(0.04,0.02,0.02,SKIN_L),0,-0.01,0.235));
    head.add(at(box(0.26,0.18,0.10,BEARD),0,-0.20,0.10));
    head.add(at(box(0.20,0.10,0.08,BEARD_D),0,-0.30,0.12));
    head.add(at(box(0.24,0.06,0.24,BEARD),0,0.09,0.05));
    head.add(at(box(0.06,0.10,0.06,BEARD_D),0.13,-0.08,0.14));
    head.add(at(box(0.06,0.10,0.06,BEARD_D),-0.13,-0.08,0.14));
    for(const side of[1,-1]){
      head.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.075,0.06,0.02),
        new THREE.MeshLambertMaterial({color:0xf6f1e6})),0.08*side,0.0,0.165));
      head.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.045,0.06,0.02),
        new THREE.MeshBasicMaterial({color:0x1b1f26})),0.08*side,0.0,0.175));
      head.add(at(box(0.09,0.03,0.02,BEARD_D),0.08*side,0.06,0.17));
    }
    head.add(at(box(0.10,0.02,0.02,0xb07a6a),0,-0.09,0.17));

    /* --- lengan kiri: bahu + lengan + tangan + lentera --- */
    const armL=new THREE.Group();armL.position.set(-0.31,0.94,0);
    armL.add(at(box(0.17,0.09,0.18,HOOD_D),0,0.0,0));
    armL.add(at(box(0.14,0.24,0.14,ROBE),0,-0.14,0));
    armL.add(at(box(0.13,0.06,0.13,ROBE_D),0,-0.26,0));
    armL.add(at(box(0.145,0.10,0.145,SKIN_D),0,-0.34,0));
    armL.add(at(box(0.13,0.09,0.13,SKIN),0,-0.42,0));
    const lantern=box(0.16,0.18,0.16,WOODC);
    lantern.position.set(0,-0.56,0.04);armL.add(lantern);
    lantern.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.11,0.12,0.11),
      new THREE.MeshBasicMaterial({color:0xffcc55})),0,0,0));
    lantern.add(at(box(0.18,0.03,0.18,WOOD_D),0,0.10,0));
    lantern.add(at(box(0.18,0.03,0.18,WOOD_D),0,-0.10,0));
    g.add(armL);

    /* --- lengan kanan: bahu + lengan + tangan --- */
    const armR=new THREE.Group();armR.position.set(0.31,0.94,0);
    armR.add(at(box(0.17,0.09,0.18,HOOD_D),0,0.0,0));
    armR.add(at(box(0.14,0.24,0.14,ROBE),0,-0.14,0));
    armR.add(at(box(0.13,0.06,0.13,ROBE_D),0,-0.26,0));
    armR.add(at(box(0.145,0.10,0.145,SKIN_D),0,-0.34,0));
    armR.add(at(box(0.13,0.09,0.13,SKIN),0,-0.42,0));

    /* --- SENJATA: dipasang pada pivot grip di telapak tangan.
       Semua senjata dibangun memanjang ke -Y lokal lalu diputar pada pivot
       sehingga rotasi presisi di sekitar titik genggaman, bukan mengambang. --- */
    const grip=new THREE.Group();
    grip.position.set(0,-0.44,0.06);
    armR.add(grip);

    /* --- ALAT / SENJATA PERAN --- */
                                       /* garu penjaga desa */
    grip.add(at(box(0.055,0.85,0.055,WOODC),0,-0.30,0));
    grip.add(at(box(0.065,0.10,0.065,WOOD_D),0,0.06,0));
    const rake=new THREE.Group();rake.position.set(0,-0.74,0);
    rake.add(at(box(0.26,0.05,0.06,METAL),0,0,0));
    for(const px of[-0.09,0,0.09])
      rake.add(at(box(0.05,0.20,0.05,METAL),px,-0.10,0));
    rake.add(at(box(0.26,0.04,0.05,METAL_D),0,-0.19,0));
    grip.add(rake);
    ROT(grip,0.24,0,0.08);
    g.add(armR);

    return {mesh:g,parts:{body,head,armL,armR,legs,bodyY:BODY_Y}};
  },

  /* ---------- ANIMASI ----------
     Jalan (kaki & lengan mengayun), ayunan alat saat menyerang, kepala
     menoleh santai, flash merah saat terluka. Sama persis dengan logika
     NPCS.animate() in-game untuk NPC non-langka. */
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
    n.parts.armL.rotation.x=-step*0.6;
    const sw=n.swing>0?1-n.swing/0.25:0;
    n.parts.armR.rotation.x=lerp(step*0.6,-1.5,sw);
    n.parts.body.position.y=n.parts.bodyY+
      Math.abs(Math.sin(t*9))*0.03*Math.min(1,sp/2);
    n.parts.head.rotation.y=n.target?0:Math.sin(t*1.4)*0.35;
  },
};
window.NPC_Merchant=NPC_Merchant;
