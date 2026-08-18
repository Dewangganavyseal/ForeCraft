'use strict';
/* =============================================================================
   ENTITAS MOB: SERIGALA (Wolf)
   -----------------------------------------------------------------------------
   File mandiri: MODEL 3D (build) + ANIMASI LENGKAP (animate: idle, bergerak,
   menyerang/windup, efek khusus). Dipanggil Monsters.make() & Monsters.animate()
   di js/monsters.js lewat window.Mob_Wolf.
   ============================================================================= */
const Mob_Wolf={

  /* ---------- MODEL 3D ----------
     Dipanggil Monsters.make(type,pos,boss) -> {mesh,parts}.
     Skala & aura boss ditambahkan Monsters.make agar seragam. */
  build(boss){
    const g=new THREE.Group();const parts={};
    const box=(w,h,d,c)=>{const ms=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:c}));ms.castShadow=true;return ms;};
      /* === SERIGALA: pemburu berbulu, tubuh rendah & panjang ===
         Kepala dipisah jadi grup agar bisa menggeram/menerjang. */
      const FUR=0x6f7480,FUR_D=0x51555f,FUR_L=0x8f95a2,BELLY=0xa9aeb8;
      const body=box(0.62,0.52,1.10,FUR);body.position.set(0,0.78,0);g.add(body);parts.body=body;
      /* perut lebih terang + punggung gelap: memberi kedalaman siluet */
      const belly=box(0.50,0.16,1.00,BELLY);belly.position.set(0,-0.24,0);body.add(belly);
      const back=box(0.52,0.14,1.00,FUR_D);back.position.set(0,0.26,0);body.add(back);
      /* surai bulu berdiri di sepanjang punggung */
      for(let i=0;i<5;i++){
        const sp=box(0.10,0.16-i*0.015,0.12,FUR_D);
        sp.position.set(0,0.34,0.40-i*0.20);sp.rotation.x=-0.2+i*0.08;body.add(sp);
      }
      /* pinggul & dada lebih tebal */
      const chest=box(0.66,0.46,0.34,FUR);chest.position.set(0,0.02,0.42);body.add(chest);
      const hip=box(0.60,0.44,0.30,FUR_D);hip.position.set(0,0.0,-0.46);body.add(hip);

      /* kepala: tengkorak, moncong meruncing, hidung, telinga tegak, gigi */
      const head=new THREE.Group();head.position.set(0,1.00,0.66);g.add(head);parts.head=head;
      /* BUGFIX: Object.assign(mesh,{position:...}) melempar TypeError karena
         di three.js r128 properti position read-only — seluruh pembuatan
         serigala gagal & monster tak pernah muncul. Pakai position.set(). */
      const skull=box(0.46,0.40,0.42,FUR);skull.position.set(0,0.06,0);head.add(skull);
      const muzzle=box(0.26,0.22,0.34,FUR_L);muzzle.position.set(0,-0.04,0.32);head.add(muzzle);
      const nose=box(0.14,0.12,0.10,0x1d1f24);nose.position.set(0,0.0,0.50);head.add(nose);
      const jaw=box(0.22,0.10,0.30,0x3a3d44);jaw.position.set(0,-0.14,0.32);head.add(jaw);
      for(const side of[1,-1]){
        const ear=box(0.12,0.24,0.08,FUR_D);
        ear.position.set(0.16*side,0.34,-0.04);ear.rotation.z=-0.18*side;head.add(ear);
        const earIn=box(0.06,0.14,0.04,0x2c2e33);
        earIn.position.set(0.16*side,0.32,0.0);head.add(earIn);
        /* mata kuning menyala + kilau */
        const eye=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.07,0.04),
          new THREE.MeshBasicMaterial({color:0xffd34d}));
        eye.position.set(0.13*side,0.10,0.20);head.add(eye);
        parts[side>0?'eyeL':'eyeR']=eye;
        /* taring atas */
        const fang=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.09,0.04),
          new THREE.MeshLambertMaterial({color:0xfdfff0}));
        fang.position.set(0.07*side,-0.11,0.44);head.add(fang);
      }

      /* 4 kaki: paha + tulang kering + telapak */
      parts.legs=[];
      for(const[lx,lz]of[[0.24,0.38],[-0.24,0.38],[0.22,-0.40],[-0.22,-0.40]]){
        const legG=new THREE.Group();legG.position.set(lx,0.62,lz);
        const thigh=box(0.18,0.34,0.18,FUR_D);thigh.position.y=-0.17;legG.add(thigh);
        const shin=box(0.14,0.28,0.14,FUR);shin.position.y=-0.44;legG.add(shin);
        const paw=box(0.18,0.10,0.22,0x2f3238);paw.position.set(0,-0.60,0.03);legG.add(paw);
        g.add(legG);parts.legs.push(legG);
      }
      /* ekor lebat tiga segmen */
      const tail=new THREE.Group();tail.position.set(0,0.86,-0.60);
      const t1=box(0.16,0.16,0.26,FUR_D);t1.position.set(0,0,-0.12);tail.add(t1);
      const t2=box(0.20,0.20,0.24,FUR);t2.position.set(0,0.04,-0.32);tail.add(t2);
      const t3=box(0.14,0.14,0.16,FUR_L);t3.position.set(0,0.08,-0.48);tail.add(t3);
      g.add(tail);parts.tail=tail;

    return{mesh:g,parts};
  },

    /* ---------- ANIMASI LENGKAP ----------
     Dipanggil Monsters.animate(m,dt) tiap frame untuk mob tipe ini. */
  animate(m,dt){
    const t=performance.now()*0.001;
      const sp=Math.hypot(m.vel.x,m.vel.z);
      /* lari galop: kaki depan & belakang berlawanan fase */
      if(m.parts.legs)for(let i=0;i<4;i++){
        const phase=(i<2)?0:Math.PI;
        m.parts.legs[i].rotation.x=Math.sin(t*14+phase+(i%2)*0.5)*0.55*Math.min(1,sp/3);
      }
      /* badan naik-turun mengikuti langkah + ekor mengibas */
      m.parts.body.position.y=0.78+Math.abs(Math.sin(t*14))*0.05*Math.min(1,sp/3);
      if(m.parts.tail){
        m.parts.tail.rotation.y=Math.sin(t*9)*0.4;
        m.parts.tail.rotation.x=-0.25+Math.sin(t*6)*0.15;
      }
      /* menunduk & kepala menyentak saat menggigit */
      m.biteT=Math.max(0,(m.biteT||0)-dt);
      const bite=m.biteT>0?1-m.biteT/0.22:0;
      m.parts.head.rotation.x=lerp(Math.sin(t*3)*0.06,0.55,bite);
      m.parts.head.position.y=1.00-bite*0.12;
      /* mata makin terang saat mengejar */
      const eyeC=m.state==='chase'?0xffe066:0xffd34d;
      if(m.parts.eyeL){m.parts.eyeL.material.color.setHex(eyeC);
        m.parts.eyeR.material.color.setHex(eyeC);}
  },
};
window.Mob_Wolf=Mob_Wolf;
