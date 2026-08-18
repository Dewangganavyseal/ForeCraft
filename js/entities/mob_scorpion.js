'use strict';
/* =============================================================================
   ENTITAS MOB: KALAJENGKING (Scorpion)
   -----------------------------------------------------------------------------
   File mandiri: MODEL 3D (build) + ANIMASI LENGKAP (animate: idle, bergerak,
   menyerang/windup, efek khusus). Dipanggil Monsters.make() & Monsters.animate()
   di js/monsters.js lewat window.Mob_Scorpion.
   ============================================================================= */
const Mob_Scorpion={

  /* ---------- MODEL 3D ----------
     Dipanggil Monsters.make(type,pos,boss) -> {mesh,parts}.
     Skala & aura boss ditambahkan Monsters.make agar seragam. */
  build(boss){
    const g=new THREE.Group();const parts={};
    const box=(w,h,d,c)=>{const ms=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:c}));ms.castShadow=true;return ms;};
      /* === KALAJENGKING GURUN: karapas berlapis, ekor bersengat, dua cakar ===
         Ekor dibuat sebagai rantai segmen agar bisa dianimasikan melengkung. */
      const SHELL=0x8a5a2b,SHELL_D=0x6a4320,SHELL_L=0xb07a3c,CLAW=0x5d3a19;
      const body=new THREE.Group();body.position.y=0.46;g.add(body);parts.body=body;
      /* karapas: tiga segmen menyusut ke belakang */
      const c1=box(0.72,0.26,0.60,SHELL);c1.position.set(0,0,0.10);body.add(c1);
      const c2=box(0.60,0.22,0.34,SHELL_D);c2.position.set(0,-0.02,-0.30);body.add(c2);
      const c3=box(0.46,0.18,0.26,SHELL);c3.position.set(0,-0.02,-0.56);body.add(c3);
      /* pelat punggung lebih terang + tonjolan tulang */
      const plate=box(0.50,0.10,0.44,SHELL_L);plate.position.set(0,0.16,0.12);body.add(plate);
      for(let i=0;i<3;i++){
        const spike=box(0.10,0.10,0.10,SHELL_D);
        spike.position.set(0,0.22,0.24-i*0.20);body.add(spike);
      }
      /* mata majemuk kecil menyala */
      for(const side of[1,-1]){
        const eye=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.06,0.04),
          new THREE.MeshBasicMaterial({color:0xff4d3d}));
        eye.position.set(0.10*side,0.14,0.40);body.add(eye);
        parts[side>0?'eyeL':'eyeR']=eye;
      }
      /* dua cakar besar di depan: lengan + penjepit atas-bawah */
      parts.claws=[];
      for(const side of[1,-1]){
        const armG=new THREE.Group();armG.position.set(0.36*side,0.0,0.34);
        const arm=box(0.14,0.12,0.30,SHELL_D);arm.position.set(0,0,0.14);armG.add(arm);
        const clawG=new THREE.Group();clawG.position.set(0.06*side,0,0.32);
        const palm=box(0.20,0.14,0.26,CLAW);palm.position.set(0,0,0.10);clawG.add(palm);
        const fTop=box(0.07,0.08,0.22,SHELL_L);fTop.position.set(0.05*side,0.05,0.28);clawG.add(fTop);
        const fBot=box(0.07,0.08,0.18,SHELL_L);fBot.position.set(-0.03*side,-0.05,0.26);clawG.add(fBot);
        armG.add(clawG);body.add(armG);parts.claws.push(clawG);
      }
      /* 8 kaki bersendi di kedua sisi */
      parts.legs=[];
      for(const side of[1,-1])for(let i=0;i<4;i++){
        const legG=new THREE.Group();legG.position.set(0.30*side,-0.06,0.22-i*0.18);
        legG.rotation.z=-0.5*side;
        const femur=box(0.22,0.06,0.06,SHELL_D);femur.position.set(0.11*side,0,0);legG.add(femur);
        const tibia=box(0.06,0.20,0.06,CLAW);tibia.position.set(0.22*side,-0.10,0);legG.add(tibia);
        body.add(legG);parts.legs.push(legG);
      }
      /* ekor: 5 segmen menaik + sengat bercahaya racun */
      const tail=new THREE.Group();tail.position.set(0,0.06,-0.62);body.add(tail);parts.tail=tail;
      let seg=tail;
      for(let i=0;i<5;i++){
        const s=new THREE.Group();
        s.position.set(0,i===0?0.10:0.16,i===0?-0.10:-0.06);
        s.rotation.x=0.42;
        const segBox=box(0.20-i*0.02,0.18,0.18,i%2?SHELL:SHELL_D);
        segBox.position.set(0,0.06,0);s.add(segBox);
        seg.add(s);seg=s;
      }
      const stingMat=new THREE.MeshBasicMaterial({color:0x9ad84f});
      const sting=new THREE.Mesh(new THREE.BoxGeometry(0.10,0.22,0.10),stingMat);
      sting.position.set(0,0.16,0.04);sting.rotation.x=-0.9;seg.add(sting);
      parts.sting=sting;
      const stingGlow=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.30,0.18),
        new THREE.MeshBasicMaterial({color:0xc4ff7a,transparent:true,opacity:0.35}));
      stingGlow.position.copy(sting.position);seg.add(stingGlow);parts.stingGlow=stingGlow;

    return{mesh:g,parts};
  },

    /* ---------- ANIMASI LENGKAP ----------
     Dipanggil Monsters.animate(m,dt) tiap frame untuk mob tipe ini. */
  animate(m,dt){
    const t=performance.now()*0.001;
      const sp=Math.hypot(m.vel.x,m.vel.z);
      /* 8 kaki bergerak bergelombang (gaya arthropoda) */
      if(m.parts.legs)m.parts.legs.forEach((lg,i)=>{
        const side=i<4?1:-1,idx=i%4;
        lg.rotation.y=Math.sin(t*10+idx*1.1+(side>0?0:Math.PI))*0.35*Math.min(1,sp/2);
        lg.rotation.z=-0.5*side+Math.cos(t*10+idx*1.1)*0.12*Math.min(1,sp/2);
      });
      /* cakar membuka-menutup, lebih agresif saat mengejar */
      if(m.parts.claws){
        const agg=m.state==='chase'?1:0.4;
        m.parts.claws.forEach((c,i)=>{
          c.rotation.y=Math.sin(t*6+i*Math.PI)*0.3*agg;
          c.rotation.x=Math.sin(t*4+i)*0.12*agg;
        });
      }
      /* ekor melengkung; menghentak ke depan saat menyengat */
      m.stingT=Math.max(0,(m.stingT||0)-dt);
      const st=m.stingT>0?1-m.stingT/0.3:0;
      if(m.parts.tail)
        m.parts.tail.rotation.x=lerp(Math.sin(t*2.5)*0.12,-0.9,st);
      /* sengat berkilau racun: makin terang saat siap menyerang */
      if(m.parts.stingGlow){
        const ready=m.atkCd<=0.3?1:0.4;
        m.parts.stingGlow.material.opacity=(0.25+0.25*Math.sin(t*8))*ready+0.1;
        m.parts.stingGlow.scale.setScalar(1+0.2*Math.sin(t*8)*ready);
      }
      /* mata berdenyut merah */
      if(m.parts.eyeL){
        const c=m.state==='chase'?0xff2a1a:0xff4d3d;
        m.parts.eyeL.material.color.setHex(c);
        m.parts.eyeR.material.color.setHex(c);
      }
  },
};
window.Mob_Scorpion=Mob_Scorpion;
