'use strict';
/* =============================================================================
   ENTITAS MOB: BABI HUTAN (Wild Boar)
   -----------------------------------------------------------------------------
   File mandiri: MODEL 3D (build) + ANIMASI LENGKAP (animate: idle, bergerak,
   menyerang/windup, efek khusus). Dipanggil Monsters.make() & Monsters.animate()
   di js/monsters.js lewat window.Mob_Boar.
   ============================================================================= */
const Mob_Boar={

  /* ---------- MODEL 3D ----------
     Dipanggil Monsters.make(type,pos,boss) -> {mesh,parts}.
     Skala & aura boss ditambahkan Monsters.make agar seragam. */
  build(boss){
    const g=new THREE.Group();const parts={};
    const box=(w,h,d,c)=>{const ms=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:c}));ms.castShadow=true;return ms;};
      // === REMODELED 3D VOXEL WILD BOAR ===
      // Main Body Group with muscular hump
      const body=box(1.05, 0.68, 0.65, 0x5c3c28); body.position.set(0, 0.70, -0.05); g.add(body); parts.body=body;
      
      // Muscular Shoulder Hump ( iconic wild boar silhouette )
      const hump=box(0.92, 0.35, 0.58, 0x482d1c); hump.position.set(0, 0.45, 0.22); body.add(hump);
      
      // Spine Bristles / Mane (jagged dark coarse fur along the back)
      for(let i=0; i<6; i++){
        const hair=box(0.16 + (i%2)*0.08, 0.22 - i*0.02, 0.12, (i%2===0?0x26160c:0x362115));
        hair.position.set((i%2===0?0.04:-0.04), 0.52 - i*0.03, 0.35 - i*0.14);
        hair.rotation.x = -0.15 + i*0.05;
        hair.rotation.z = (i%2===0?0.08:-0.08);
        body.add(hair);
      }

      // Heavy Wedge Head attached to front of body
      const head=box(0.58, 0.52, 0.55, 0x6e4832); head.position.set(0, 0.88, 0.65); g.add(head); parts.head=head;

      // Brow ridge over eyes (angry ferocious look)
      const brow=box(0.62, 0.12, 0.18, 0x3d2417); brow.position.set(0, 0.22, 0.18); head.add(brow);

      // Snout Disc & Bridge
      const snoutBridge=box(0.38, 0.32, 0.38, 0x7c543c); snoutBridge.position.set(0, -0.10, 0.35); head.add(snoutBridge);
      const snoutDisc=box(0.32, 0.26, 0.10, 0xd49a80); snoutDisc.position.set(0, -0.12, 0.56); head.add(snoutDisc);
      // Nostrils
      const nostrilL=box(0.06, 0.08, 0.04, 0x24140c); nostrilL.position.set(0.08, -0.12, 0.60); head.add(nostrilL);
      const nostrilR=nostrilL.clone(); nostrilR.position.x=-0.08; head.add(nostrilR);

      // Sharp Curved Ivory Tusks curving out and up
      const tuskLGroup=new THREE.Group(); tuskLGroup.position.set(0.18, -0.16, 0.38);
      const tuskRoot=box(0.08, 0.12, 0.08, 0x8c7e6b); tuskLGroup.add(tuskRoot);
      const tuskMain=box(0.07, 0.24, 0.07, 0xfffcf2); tuskMain.position.set(0.04, 0.14, 0.04); tuskMain.rotation.z=-0.35; tuskMain.rotation.x=-0.2; tuskLGroup.add(tuskMain);
      const tuskTip=box(0.05, 0.12, 0.05, 0xffffff); tuskTip.position.set(0.10, 0.26, 0.08); tuskTip.rotation.z=-0.45; tuskLGroup.add(tuskTip);
      head.add(tuskLGroup);

      const tuskRGroup=new THREE.Group(); tuskRGroup.position.set(-0.18, -0.16, 0.38);
      const tuskRootR=tuskRoot.clone(); tuskRGroup.add(tuskRootR);
      const tuskMainR=box(0.07, 0.24, 0.07, 0xfffcf2); tuskMainR.position.set(-0.04, 0.14, 0.04); tuskMainR.rotation.z=0.35; tuskMainR.rotation.x=-0.2; tuskRGroup.add(tuskMainR);
      const tuskTipR=box(0.05, 0.12, 0.05, 0xffffff); tuskTipR.position.set(-0.10, 0.26, 0.08); tuskTipR.rotation.z=0.45; tuskRGroup.add(tuskTipR);
      head.add(tuskRGroup);

      // Alert Triangular Boar Ears with inner pink lining
      const earL=box(0.16, 0.26, 0.08, 0x543622); earL.position.set(0.26, 0.22, -0.12); earL.rotation.z=-0.3; earL.rotation.x=-0.1; head.add(earL);
      const earInnerL=box(0.10, 0.18, 0.04, 0xb87d6e); earInnerL.position.set(0.26, 0.22, -0.09); earInnerL.rotation.z=-0.3; head.add(earInnerL);
      const earR=earL.clone(); earR.position.x=-0.26; earR.rotation.z=0.3; head.add(earR);
      const earInnerR=earInnerL.clone(); earInnerR.position.x=-0.26; earInnerR.rotation.z=0.3; head.add(earInnerR);

      // Glowing Furious Red Eyes
      const eyeL=box(0.09, 0.11, 0.05, 0xd92626); eyeL.position.set(0.22, 0.12, 0.22); head.add(eyeL);
      const eyeR=eyeL.clone(); eyeR.position.x=-0.22; head.add(eyeR);
      const eyeShineL=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.04,0.02), new THREE.MeshBasicMaterial({color:0xffffff}));
      eyeShineL.position.set(0.24, 0.14, 0.25); head.add(eyeShineL);
      const eyeShineR=eyeShineL.clone(); eyeShineR.position.x=-0.24; head.add(eyeShineR);

      // Curled / Wiggling Tail at rear
      const tail=new THREE.Group(); tail.position.set(0, 0.78, -0.42);
      const tailBone=box(0.08, 0.22, 0.08, 0x482d1c); tailBone.rotation.x=-0.6; tail.add(tailBone);
      const tailTuft=box(0.12, 0.12, 0.12, 0x24140c); tailTuft.position.set(0, -0.14, -0.08); tail.add(tailTuft);
      g.add(tail); parts.tail=tail;

      // 4 Leg Assemblies with thighs, shins, and split hooves
      parts.legs=[];
      const legCoords=[[0.34, 0.36], [-0.34, 0.36], [0.32, -0.38], [-0.32, -0.38]];
      for(let i=0; i<4; i++){
        const[lx, lz] = legCoords[i];
        const legG=new THREE.Group(); legG.position.set(lx, 0.46, lz);
        const thigh=box(0.22, 0.36, 0.22, 0x54382a); thigh.position.y=-0.18; legG.add(thigh);
        const shin=box(0.18, 0.30, 0.18, 0x462d20); shin.position.y=-0.38; legG.add(shin);
        const hoof=box(0.20, 0.10, 0.22, 0x241710); hoof.position.set(0, -0.20, 0.02); shin.add(hoof);
        g.add(legG);
        parts.legs.push(legG);
      }
    return{mesh:g,parts};
  },

    /* ---------- ANIMASI LENGKAP ----------
     Dipanggil Monsters.animate(m,dt) tiap frame untuk mob tipe ini. */
  animate(m,dt){
    const t=performance.now()*0.001;
      m.parts.head.rotation.x=lerp(m.parts.head.rotation.x,0,dt*5);
      const sp=Math.hypot(m.vel.x,m.vel.z);
      if(m.parts.legs)for(let i=0;i<4;i++){
        const phase=(i===0||i===3)?0:Math.PI;
        m.parts.legs[i].rotation.x=Math.sin(t*12+phase)*0.45*Math.min(1,sp);
      }
      if(m.parts.tail)m.parts.tail.rotation.y=Math.sin(t*8)*0.35;
  },
};
window.Mob_Boar=Mob_Boar;
