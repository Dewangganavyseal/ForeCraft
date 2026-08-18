'use strict';
/* =============================================================================
   ENTITAS MOB: SLIME (Gelatinous Ooze)
   -----------------------------------------------------------------------------
   File mandiri: MODEL 3D (build) + ANIMASI LENGKAP (animate: idle, bergerak,
   menyerang/windup, efek khusus). Dipanggil Monsters.make() & Monsters.animate()
   di js/monsters.js lewat window.Mob_Slime.
   ============================================================================= */
const Mob_Slime={

  /* ---------- MODEL 3D ----------
     Dipanggil Monsters.make(type,pos,boss) -> {mesh,parts}.
     Skala & aura boss ditambahkan Monsters.make agar seragam. */
  build(boss){
    const g=new THREE.Group();const parts={};
    const box=(w,h,d,c)=>{const ms=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:c}));ms.castShadow=true;return ms;};
      /* === REMODELED 3D VOXEL SLIME (Gelatinous Ooze) ===
         Dibentuk berlapis: shell luar tembus pandang, lapisan tengah,
         inti bercahaya, plus tetesan lendir & gelembung di dalam tubuh. */
      const body=new THREE.Group(); body.position.y=0.38; g.add(body);

      // Shell luar: bagian bawah melebar (menumpuk seperti lendir)
      const shellBase=box(0.92,0.30,0.92,0x67c74f);
      shellBase.material.transparent=true; shellBase.material.opacity=0.72;
      shellBase.position.y=-0.20; body.add(shellBase);

      const shellMid=box(0.85,0.34,0.85,0x74d45a);
      shellMid.material.transparent=true; shellMid.material.opacity=0.68;
      shellMid.position.y=0.06; body.add(shellMid);

      // Kubah atas yang mengecil bertahap
      const shellTop=box(0.66,0.24,0.66,0x82e065);
      shellTop.material.transparent=true; shellTop.material.opacity=0.66;
      shellTop.position.y=0.32; body.add(shellTop);

      const shellCap=box(0.42,0.14,0.42,0x93ea74);
      shellCap.material.transparent=true; shellCap.material.opacity=0.6;
      shellCap.position.y=0.48; body.add(shellCap);

      // Gelembung udara terperangkap di dalam lendir
      for(let i=0;i<5;i++){
        const bs=rand(0.07,0.14);
        const bub=new THREE.Mesh(
          new THREE.BoxGeometry(bs,bs,bs),
          new THREE.MeshPhongMaterial({color:0xd8ffcf,transparent:true,opacity:0.45,shininess:90})
        );
        bub.position.set(rand(-0.28,0.28),rand(-0.18,0.34),rand(-0.28,0.28));
        body.add(bub);
      }

      // Tetesan lendir menggantung di tepi bawah
      for(let i=0;i<6;i++){
        const a=i/6*Math.PI*2;
        const dripH=rand(0.10,0.22);
        const drip=box(0.10,dripH,0.10,0x58b543);
        drip.material.transparent=true; drip.material.opacity=0.8;
        drip.position.set(Math.cos(a)*0.40,-0.34-dripH*0.4,Math.sin(a)*0.40);
        body.add(drip);
      }
      
      // Inti bercahaya (nukleus) berlapis dua agar terlihat berdenyut
      const core=new THREE.Mesh(
        new THREE.BoxGeometry(0.34,0.30,0.34),
        new THREE.MeshBasicMaterial({color:0x9dff6b,transparent:true,opacity:0.85})
      );
      core.position.y=0.02; core.userData.isGlowing=true; body.add(core);
      const coreShell=box(0.46,0.42,0.46,0x3f8f2f);
      coreShell.material.transparent=true; coreShell.material.opacity=0.5;
      coreShell.position.y=0.02; body.add(coreShell);
      parts.coreShell=coreShell;

      // Wajah: kelopak, mata, kilau, dan mulut bergerigi
      const faceZ=0.34;
      for(const side of [1,-1]){
        const socket=box(0.20,0.20,0.06,0x3d7d33);
        socket.material.transparent=true; socket.material.opacity=0.9;
        socket.position.set(0.19*side,0.30,faceZ); body.add(socket);

        const eye=box(0.14,0.16,0.06,0x101510);
        eye.position.set(0.19*side,0.30,faceZ+0.04); body.add(eye);

        // pupil terang + kilau kecil di sudut
        const pupil=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.07,0.02),
          new THREE.MeshBasicMaterial({color:0xffffff}));
        pupil.position.set(0.21*side,0.33,faceZ+0.08); body.add(pupil);
        const glint=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.03,0.02),
          new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.8}));
        glint.position.set(0.15*side,0.26,faceZ+0.08); body.add(glint);
      }

      // Mulut cekung dengan dua gigi kecil
      const mouth=box(0.30,0.10,0.06,0x22461f);
      mouth.position.set(0,0.08,faceZ+0.03); body.add(mouth);
      for(const side of [1,-1]){
        const tooth=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.07,0.03),
          new THREE.MeshLambertMaterial({color:0xfdfff0}));
        tooth.position.set(0.08*side,0.11,faceZ+0.06); body.add(tooth);
      }

      // Bercak lendir lebih terang di permukaan (variasi tekstur)
      for(let i=0;i<6;i++){
        const spot=box(rand(0.10,0.18),rand(0.08,0.14),0.05,0x9ee88f);
        spot.material.transparent=true; spot.material.opacity=0.55;
        const a=rand(0,Math.PI*2), r=0.42;
        spot.position.set(Math.cos(a)*r,rand(-0.14,0.42),Math.sin(a)*r);
        spot.rotation.y=-a;
        body.add(spot);
      }

      parts.body=body;parts.core=core;
    return{mesh:g,parts};
  },

    /* ---------- ANIMASI LENGKAP ----------
     Dipanggil Monsters.animate(m,dt) tiap frame untuk mob tipe ini. */
  animate(m,dt){
    const t=performance.now()*0.001;
      /* squash saat mendarat, stretch saat melompat */
      const sq=m.onGround?1+Math.sin(t*9)*0.06:0.82;
      m.parts.body.scale.set(2-sq,sq,2-sq);
      /* goyangan lendir ringan agar tubuh terasa lembek */
      m.parts.body.rotation.z=Math.sin(t*5)*0.05;
      m.parts.body.rotation.x=Math.cos(t*4.3)*0.04;
      /* inti berdenyut: skala + kecerahan naik-turun */
      if(m.parts.core){
        const pulse=0.85+Math.sin(t*7)*0.15;
        m.parts.core.scale.setScalar(pulse);
        m.parts.core.material.opacity=0.6+0.3*pulse;
      }
      if(m.parts.coreShell)m.parts.coreShell.scale.setScalar(1+Math.sin(t*7+0.6)*0.06);
  },
};
window.Mob_Slime=Mob_Slime;
