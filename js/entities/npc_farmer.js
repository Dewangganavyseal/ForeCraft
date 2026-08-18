'use strict';
/* =============================================================================
   ENTITAS NPC: PETANI (🌾)
   -----------------------------------------------------------------------------
   Model sederhana bergaya villager dengan topi jerami & cangkul.
   Dipanggil NPCS.buildModel(role) -> {mesh,parts}.
   ============================================================================= */
const NPC_Farmer={
  build(){
    const g=new THREE.Group();
    const box=(w,h,d,c)=>{
      const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
        new THREE.MeshLambertMaterial({color:c}));
      m.castShadow=!IS_MOBILE;return m;
    };
    const at=(m,x,y,z)=>{m.position.set(x,y,z);return m;};
    const ROBE=0x6a8f3f,HOOD=0x465f2a,
          ROBE_D=(ROBE&0xfefefe)>>1,ROBE_L=Math.min(0xffffff,ROBE+0x181818),
          SKIN=0xc98b5e,SKIN_D=0xb0764c,
          BOOT=0x3b2f22,BOOT_D=0x2a2116,
          STRAW=0xd9b23a,STRAW_D=0xb98a2f,
          WOODC=0x6f4d2a,METAL=0xc9d3de;
    const BODY_Y=0.78;

    /* kaki */
    const legs=[];
    for(const side of[1,-1]){
      const lg=new THREE.Group();lg.position.set(0.12*side,0.52,0);
      lg.add(at(box(0.18,0.14,0.20,ROBE_D),0,-0.07,0));
      lg.add(at(box(0.165,0.20,0.185,ROBE_D),0,-0.22,0));
      lg.add(at(box(0.15,0.14,0.17,BOOT),0,-0.36,0.01));
      lg.add(at(box(0.17,0.09,0.22,BOOT),0,-0.44,0.03));
      lg.add(at(box(0.18,0.035,0.25,BOOT_D),0,-0.49,0.04));
      g.add(lg);legs.push(lg);
    }

    /* torso */
    const body=box(0.50,0.44,0.34,ROBE);body.position.y=BODY_Y;g.add(body);
    body.add(at(box(0.54,0.12,0.38,ROBE_D),0,-0.20,0));
    body.add(at(box(0.46,0.10,0.35,ROBE_L),0,0.12,0));
    body.add(at(box(0.42,0.08,0.36,0x5c3f24),0,0.02,0));
    body.add(at(box(0.10,0.10,0.37,0xd9a531),0,0.02,0));

    /* kepala + topi jerami */
    const head=box(0.34,0.32,0.32,SKIN);head.position.y=1.16;g.add(head);
    head.add(at(box(0.30,0.10,0.30,SKIN_D),0,-0.14,0));
    head.add(at(box(0.46,0.06,0.46,STRAW),0,0.18,0));
    head.add(at(box(0.30,0.14,0.30,STRAW_D),0,0.26,0));
    for(const side of[1,-1]){
      head.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.075,0.06,0.02),
        new THREE.MeshLambertMaterial({color:0xf6f1e6})),0.08*side,0.0,0.165));
      head.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.045,0.06,0.02),
        new THREE.MeshBasicMaterial({color:0x1b1f26})),0.08*side,0.0,0.175));
    }
    head.add(at(box(0.10,0.02,0.02,0xb07a6a),0,-0.09,0.17));

    /* lengan kiri */
    const armL=new THREE.Group();armL.position.set(-0.31,0.94,0);
    armL.add(at(box(0.17,0.09,0.18,HOOD),0,0.0,0));
    armL.add(at(box(0.14,0.24,0.14,ROBE),0,-0.14,0));
    armL.add(at(box(0.13,0.09,0.13,SKIN),0,-0.42,0));
    g.add(armL);

    /* lengan kanan + cangkul */
    const armR=new THREE.Group();armR.position.set(0.31,0.94,0);
    armR.add(at(box(0.17,0.09,0.18,HOOD),0,0.0,0));
    armR.add(at(box(0.14,0.24,0.14,ROBE),0,-0.14,0));
    armR.add(at(box(0.13,0.09,0.13,SKIN),0,-0.42,0));
    const grip=new THREE.Group();
    grip.position.set(0,-0.44,0.06);
    armR.add(grip);
    grip.add(at(box(0.055,0.80,0.055,WOODC),0,-0.30,0));
    const blade=box(0.20,0.10,0.05,METAL);
    blade.position.set(0,-0.72,0.05);
    blade.rotation.x=0.5;
    grip.add(blade);
    grip.rotation.set(0.28,0,0.10);
    g.add(armR);

    return{mesh:g,parts:{body,head,armL,armR,legs,bodyY:BODY_Y}};
  },

  /* animasi generik NPC desa */
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
    if(n.parts.armL)n.parts.armL.rotation.x=-step*0.6;
    const sw=n.swing>0?1-n.swing/0.25:0;
    if(n.parts.armR)n.parts.armR.rotation.x=lerp(step*0.6,-1.5,sw);
    if(n.parts.body)n.parts.body.position.y=n.parts.bodyY+
      Math.abs(Math.sin(t*9))*0.03*Math.min(1,sp/2);
    if(n.parts.head)n.parts.head.rotation.y=n.target?0:Math.sin(t*1.4)*0.35;
  },
};
window.NPC_Farmer=NPC_Farmer;
