'use strict';
/* =============================================================================
   ENTITAS MOB: KELINCI (Rabbit)
   -----------------------------------------------------------------------------
   File mandiri: MODEL 3D (build) + ANIMASI LENGKAP (animate: idle, bergerak,
   menyerang/windup, efek khusus). Dipanggil Monsters.make() & Monsters.animate()
   di js/monsters.js lewat window.Mob_Rabbit.
   ============================================================================= */
const Mob_Rabbit={

  /* ---------- MODEL 3D ----------
     Dipanggil Monsters.make(type,pos,boss) -> {mesh,parts}.
     Skala & aura boss ditambahkan Monsters.make agar seragam. */
  build(boss){
    const g=new THREE.Group();const parts={};
    const box=(w,h,d,c)=>{const ms=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:c}));ms.castShadow=true;return ms;};
      /* === KELINCI: hewan pasif, kabur saat ada bahaya ===
         Tubuh bulat, telinga panjang, kaki belakang kuat untuk melompat. */
      const FUR=0xc9b5a0,FUR_D=0xa08570,FUR_L=0xe0d0bc,BELLY=0xf5ebe0;
      
      const body=new THREE.Group();body.position.y=0.38;g.add(body);parts.body=body;
      
      /* tubuh bulat utama */
      const mainBody=box(0.48,0.42,0.56,FUR);mainBody.position.set(0,0,0);body.add(mainBody);
      /* perut lebih terang */
      const belly=box(0.38,0.28,0.46,BELLY);belly.position.set(0,-0.08,0.04);body.add(belly);
      /* dada lebih bulat di depan */
      const chest=box(0.42,0.38,0.26,FUR_L);chest.position.set(0,0.02,0.20);body.add(chest);
      
      /* kepala bulat dengan moncong */
      const head=new THREE.Group();head.position.set(0,0.52,0.32);g.add(head);parts.head=head;
      head.add(box(0.36,0.34,0.36,FUR));
      const snout=box(0.24,0.18,0.20,FUR_L);snout.position.set(0,-0.06,0.24);head.add(snout);
      /* hidung kecil pink */
      const nose=box(0.08,0.06,0.06,0xffb3c1);nose.position.set(0,-0.06,0.36);head.add(nose);
      
      /* telinga panjang tegak */
      for(const side of[1,-1]){
        const earG=new THREE.Group();earG.position.set(0.12*side,0.22,0.0);
        const ear=box(0.10,0.42,0.10,FUR_D);ear.position.set(0,0.21,0);ear.rotation.z=0.10*side;earG.add(ear);
        const earIn=box(0.06,0.32,0.06,0xffccd9);earIn.position.set(0,0.19,0.01);earG.add(earIn);
        head.add(earG);
        parts[side>0?'earR':'earL']=earG;
      }
      
      /* mata besar hitam mengkilat */
      for(const side of[1,-1]){
        const eye=box(0.10,0.10,0.04,0x1a1a1a);
        eye.position.set(0.11*side,0.06,0.16);head.add(eye);
        const shine=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.04,0.02),
          new THREE.MeshBasicMaterial({color:0xffffff}));
        shine.position.set(0.12*side,0.09,0.19);head.add(shine);
      }
      
      /* kumis tipis */
      for(const side of[1,-1]){
        const whisker=box(0.20,0.02,0.02,0x5a4a3a);
        whisker.position.set(0.13*side,-0.02,0.30);whisker.rotation.y=0.25*side;head.add(whisker);
      }
      
      /* 4 kaki: depan pendek, belakang panjang */
      parts.legs=[];
      /* kaki depan */
      for(const side of[1,-1]){
        const legG=new THREE.Group();legG.position.set(0.16*side,0.28,0.18);
        const leg=box(0.12,0.28,0.12,FUR_D);leg.position.y=-0.14;legG.add(leg);
        const paw=box(0.14,0.08,0.16,FUR_L);paw.position.set(0,-0.30,0.02);legG.add(paw);
        g.add(legG);parts.legs.push(legG);
      }
      /* kaki belakang (lebih panjang & kuat untuk melompat) */
      for(const side of[1,-1]){
        const legG=new THREE.Group();legG.position.set(0.18*side,0.34,-0.16);
        const thigh=box(0.16,0.24,0.20,FUR);thigh.position.y=-0.12;legG.add(thigh);
        const shin=box(0.14,0.22,0.14,FUR_D);shin.position.y=-0.32;legG.add(shin);
        const foot=box(0.16,0.08,0.24,FUR_L);foot.position.set(0,-0.44,-0.04);legG.add(foot);
        g.add(legG);parts.legs.push(legG);
      }
      
      /* ekor bulat kecil */
      const tail=box(0.16,0.16,0.16,BELLY);tail.position.set(0,0.42,-0.32);
      g.add(tail);parts.tail=tail;
      
    return{mesh:g,parts};
  },

    /* ---------- ANIMASI LENGKAP ----------
     Dipanggil Monsters.animate(m,dt) tiap frame untuk mob tipe ini. */
  animate(m,dt){
    const t=performance.now()*0.001;
      const sp=Math.hypot(m.vel.x,m.vel.z);
      /* telinga bergoyang: lebih aktif saat bergerak */
      if(m.parts.earL&&m.parts.earR){
        const earSwing=sp>0.5?0.15:0.08;
        m.parts.earL.rotation.z=0.10+Math.sin(t*6)*earSwing;
        m.parts.earR.rotation.z=-0.10+Math.sin(t*6+Math.PI)*earSwing;
        /* telinga menghadap ke depan saat waspada (kecepatan tinggi) */
        const alert=sp>4?0.25:0;
        m.parts.earL.rotation.x=Math.sin(t*5)*0.08+alert;
        m.parts.earR.rotation.x=Math.sin(t*5)*0.08+alert;
      }
      /* kaki depan & belakang: lompatan kelinci */
      if(m.parts.legs){
        /* saat di udara: kaki depan diangkat, kaki belakang ditarik */
        const airborne=!m.onGround?1:0;
        /* kaki depan (index 0,1) */
        for(let i=0;i<2;i++){
          m.parts.legs[i].rotation.x=lerp(
            Math.sin(t*10+(i*Math.PI))*0.25*Math.min(1,sp/2),
            -0.6,airborne);
        }
        /* kaki belakang (index 2,3): ekstensi penuh saat melompat */
        for(let i=2;i<4;i++){
          m.parts.legs[i].rotation.x=lerp(
            Math.sin(t*10+(i*Math.PI))*0.35*Math.min(1,sp/2),
            0.4,airborne);
        }
      }
      /* tubuh: squash & stretch saat melompat/mendarat */
      const jumpSquash=m.onGround&&m.vel.y<0.1?
        1+Math.abs(Math.sin(t*11))*0.06:0.92;
      m.parts.body.scale.set(1.12-jumpSquash*0.12,jumpSquash,1.12-jumpSquash*0.12);
      /* tubuh sedikit miring saat berbelok cepat */
      m.parts.body.rotation.z=Math.sin(t*4)*0.05*Math.min(1,sp/3);
      /* hidung berkedut (gerakan kecil lucu) */
      if(m.parts.head){
        m.parts.head.rotation.y=Math.sin(t*12)*0.08*Math.min(0.5,sp/4);
        m.parts.head.position.y=0.52+Math.abs(Math.sin(t*8))*0.02;
      }
      /* ekor bergerak ringan */
      if(m.parts.tail){
        m.parts.tail.rotation.y=Math.sin(t*7)*0.12;
        m.parts.tail.scale.setScalar(1+Math.sin(t*9)*0.05);
      }
  },
};
window.Mob_Rabbit=Mob_Rabbit;
