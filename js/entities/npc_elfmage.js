'use strict';
/* =============================================================================
   ENTITAS NPC: PENYIHIR ELF / ELF MAGE (🔮)
   -----------------------------------------------------------------------------
   File mandiri: MODEL 3D (build) + ANIMASI (animate: pose cast/jalan/idle) +
   COMBAT skill (Hujan Es, Hujan Meteor, proyektil aura). Pengembara langka.
   Sama persis in-game (dulu RareModels.buildElfMage + SkillsPort elf).
   ============================================================================= */

const NPC_Elfmage={

  /* ---------- MODEL 3D ---------- */
  _mats:{},
  mat(c,basic){
    const k=c+(basic?'b':'');
    if(!this._mats[k]){
      this._mats[k]=basic
        ? new THREE.MeshBasicMaterial({color:c})
        : new THREE.MeshLambertMaterial({color:c});
    }
    return this._mats[k];
  },
  /* box(parent,w,h,d,warna,x,y,z,rx,ry,rz,basic) — helper voxel ala prototipe */
  box(p,w,h,d,c,x,y,z,rx,ry,rz,basic){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.mat(c,!!basic));
    m.position.set(x,y,z);
    m.rotation.set(rx||0,ry||0,rz||0);
    m.castShadow=!IS_MOBILE&&!basic;
    p.add(m);
    return m;
  },
  C_ELF:{
    robe:0x2c4a8c, robeD:0x22386b, trim:0x5a7bd0, cape:0x1f2f57,
    gold:0xd9a94a, belt:0x6b4a2c,
    skin:0xeac9a6, hair:0xe8e6e0, hairD:0xc2c4c0, boot:0x5a4632,
    wood:0x4a3b52, wrap:0x77502f,
    crystal:0x6fd4ff, crystalCore:0xeaffff, eye:0x7fd8ff,
  },
  buildElfMage(){
    const C=this.C_ELF;
    const B=(p,w,h,d,c,x,y,z,rx,ry,rz,b)=>this.box(p,w,h,d,c,x,y,z,rx,ry,rz,b);
    /* Prototipe dibuat setinggi ±3 unit; dunia game memakai tinggi manusia
       ±1.8 blok. Group luar hanya untuk skala, titik nol tetap di telapak. */
    const outer=new THREE.Group();
    const root=new THREE.Group();
    root.scale.setScalar(0.62);
    outer.add(root);

    /* kaki: dua telapak (tungkai tertutup jubah panjang) */
    const footL=B(root,.26,.18,.42,C.boot, .24,.09,.05);
    const footR=B(root,.26,.18,.42,C.boot,-.24,.09,.05);

    /* jubah panjang berlapis + pita emas */
    const robe=new THREE.Group();robe.position.set(0,1.52,0);root.add(robe);
    B(robe,1.16,.55,.9 ,C.robeD,0,-1.24,0);
    B(robe,1.04,.55,.8 ,C.robe ,0,-.72 ,0);
    B(robe,.94 ,.5 ,.72,C.robe ,0,-.22 ,0);
    B(robe,.5  ,.9 ,.06,C.trim ,0,-.85 ,.44);
    B(robe,1.18,.07,.92,C.gold ,0,-1.47,0);
    B(robe,.52 ,.07,.06,C.gold ,0,-.42 ,.47);

    /* torso: dada, kerah, sabuk, cape punggung */
    const torso=new THREE.Group();torso.position.set(0,1.5,0);root.add(torso);
    B(torso,.88,.75,.55,C.robe ,0,.42,0);
    B(torso,.9 ,.3 ,.6 ,C.robeD,0,.78,0);
    B(torso,.5 ,.16,.42,C.robeD,0,.86,0);
    B(torso,.94,.16,.62,C.belt ,0,.08,0);
    B(torso,.2 ,.14,.08,C.gold ,0,.08,.32);
    B(torso,.06,.6 ,.04,C.gold , .2,.45,.29);
    B(torso,.06,.6 ,.04,C.gold ,-.2,.45,.29);
    const cape=B(torso,.8,1.3,.14,C.cape,0,.1,-.34);

    /* kepala: telinga lancip, rambut panjang, mata menyala */
    const head=new THREE.Group();head.position.set(0,1.05,0);torso.add(head);
    B(head,.7 ,.7 ,.7 ,C.skin,0,0,0);
    B(head,.34,.16,.12,C.skin, .44,.05,-.02,0,0, .35);
    B(head,.34,.16,.12,C.skin,-.44,.05,-.02,0,0,-.35);
    B(head,.74,.2 ,.74,C.hair,0,.42,0);
    B(head,.72,.18,.15,C.hair,0,.28,.33);
    B(head,.7 ,.9 ,.2 ,C.hair,0,-.05,-.42);
    B(head,.5 ,.7 ,.16,C.hair,0,-.7 ,-.44);
    B(head,.12,.4 ,.3 ,C.hair, .38,-.05,.12);
    B(head,.12,.4 ,.3 ,C.hair,-.38,-.05,.12);
    B(head,.16,.05,.05,C.hairD, .17,.16,.36);
    B(head,.16,.05,.05,C.hairD,-.17,.16,.36);
    const eyeL=B(head,.14,.1,.05,C.eye, .17,.02,.36,0,0,0,true);
    const eyeR=B(head,.14,.1,.05,C.eye,-.17,.02,.36,0,0,0,true);

    /* lengan: pivot di bahu agar animasi generik npc.js pas */
    const arm=sx=>{
      const g=new THREE.Group();g.position.set(sx*.55,.62,0);torso.add(g);
      B(g,.3 ,.3 ,.32,C.robe ,0,.02 ,0);
      B(g,.28,.5 ,.3 ,C.robeD,0,-.32,0);
      B(g,.42,.36,.44,C.robe ,0,-.68,0);
      B(g,.34,.14,.36,C.trim ,0,-.84,0);
      B(g,.18,.22,.2 ,C.skin ,0,-.98,0);
      return g;
    };
    const armL=arm(1),armR=arm(-1);

    /* staff kristal — anak lengan kanan, ikut terayun saat menyerang */
    const staff=new THREE.Group();staff.position.set(0,-.98,.06);armR.add(staff);
    B(staff,.11,2.7,.11,C.wood,0,.25,0);
    B(staff,.15,.3 ,.15,C.wrap,0,-.1 ,0);
    B(staff,.13,.08,.13,C.gold,0,1.42,0);
    B(staff,.06,.3,.06,C.wood, .11,1.52, .11, .35,0,-.3);
    B(staff,.06,.3,.06,C.wood,-.11,1.52, .11, .35,0, .3);
    B(staff,.06,.3,.06,C.wood, .11,1.52,-.11,-.35,0,-.3);
    B(staff,.06,.3,.06,C.wood,-.11,1.52,-.11,-.35,0, .3);
    const crystalG=new THREE.Group();crystalG.position.set(0,1.78,0);staff.add(crystalG);
    B(crystalG,.34,.5 ,.34,C.crystal    ,0, 0  ,0,0,Math.PI/4,0,true);
    const core=B(crystalG,.2,.72,.2,C.crystalCore,0,0,0,0,Math.PI/4,0,true);
    B(crystalG,.16,.22,.16,C.crystal    ,0, .42,0,0,Math.PI/4,0,true);
    B(crystalG,.14,.18,.14,C.crystal    ,0,-.42,0,0,Math.PI/4,0,true);

    /* cahaya kristal hanya di PC — PointLight terlalu mahal untuk mobile */
    let light=null;
    if(!IS_MOBILE){
      light=new THREE.PointLight(0x66ccff,1.6,7,2);
      light.position.set(0,1.8,0);
      staff.add(light);
    }

    return {
      mesh:outer,
      parts:{
        body:torso,head,armL,armR,legs:[footL,footR],bodyY:torso.position.y,
        rare:{kind:'elf',robe,cape,crystalG,core,light,eyeL,eyeR,staff},
      },
    };
  },
  build(){ return this.buildElfMage(); },

  /* ---------- COMBAT & UTIL ---------- */
  ELF:{iceCd:10,meteorCd:16},
  elfCombat(n,dt){
    const tgt=n.target;
    n.elfIceCd=Math.max(0,(n.elfIceCd||0)-dt);
    n.elfMetCd=Math.max(0,(n.elfMetCd||0)-dt);
    /* ---- sedang channeling skill ---- */
    if(n.cast){
      n.cast.t+=dt;
      n.vel.x*=0.8;n.vel.z*=0.8;          // berdiri diam merapal
      const c=n.cast;
      if(c.type==='ice'){
        if(c.t>=3.2){n.cast=null;}
        else if(c.t>0.35&&c.t<2.4){
          c.acc+=dt;
          while(c.acc>0.1){c.acc-=0.1;PortFX.shard(c.x,c.z,c.y);}
          c.dmgT=(c.dmgT||0)+dt;
          if(c.dmgT>=0.4){c.dmgT=0;this.aoe(n,c.x,c.z,3.6,npcDmgSafe(n)*0.9,2);}
        }
      }else{ /* meteor */
        if(c.t>=3.9){n.cast=null;}
        else if(c.t>0.5&&c.t<2.7){
          c.acc+=dt;
          if(c.acc>=0.36){c.acc=0;PortFX.meteor(c.x,c.z,n.mesh.rotation.y,c.y);}
        }
      }
      return true;
    }
    if(!tgt)return false;
    const d=tgt.pos.distanceTo(n.pos);
    /* pilih skill: meteor bila gerombolan, es bila target tunggal dekat (masing-masing butuh stamina) */
    const near=this.countNear(n,6);
    if(n.elfMetCd<=0&&near>=2&&d<11&&((n.stamina||0)>=45)){
      n.stamina=(n.stamina||0)-45; n.stamRegenT=1.8;
      FX.text(n.pos.clone().add(new THREE.Vector3(0,2,0)),'-45 STAM','#ffd24d');
      this.startElfCast(n,'meteor',tgt);return true;
    }
    if(n.elfIceCd<=0&&d<10&&((n.stamina||0)>=30)){
      n.stamina=(n.stamina||0)-30; n.stamRegenT=1.8;
      FX.text(n.pos.clone().add(new THREE.Vector3(0,2,0)),'-30 STAM','#ffd24d');
      this.startElfCast(n,'ice',tgt);return true;
    }
    /* serangan dasar = proyektil aura (jaga jarak seperti prototipe cast) */
    const to=new THREE.Vector3().subVectors(tgt.pos,n.pos).setY(0);
    const ang=Math.atan2(to.x,to.z);
    n.mesh.rotation.y=angLerp(n.mesh.rotation.y,ang,dt*8);
    const sp=n.speed*(n.inWater?0.5:1);
    if(d>9){n.vel.x=lerp(n.vel.x,Math.sin(ang)*sp,clamp(6*dt,0,1));
      n.vel.z=lerp(n.vel.z,Math.cos(ang)*sp,clamp(6*dt,0,1));}
    else if(d<4){n.vel.x=lerp(n.vel.x,-Math.sin(ang)*sp*0.9,clamp(6*dt,0,1));
      n.vel.z=lerp(n.vel.z,-Math.cos(ang)*sp*0.9,clamp(6*dt,0,1));}
    else{n.vel.x*=0.75;n.vel.z*=0.75;}
    if(n.atkCd<=0&&d<13){
      n.atkCd=0.85;n.swing=0.25;
      const from=n.pos.clone().add(new THREE.Vector3(0,1.6,0));
      const dir=tgt.pos.clone().add(new THREE.Vector3(0,0.8,0)).sub(from).normalize();
      PortFX.fireAura(from,dir,npcDmgSafe(n)*1.05,n);
      Sfx.at(n.pos,'swing',0);
    }
    const m=tgt;
    if(m.atkCd<=0&&d<2.1){m.atkCd=1.1;NPCS.hurt(n,m.dmg);}
    return true;
  },
  startElfCast(n,type,tgt){
    const fwd=new THREE.Vector3().subVectors(tgt.pos,n.pos).setY(0).normalize();
    const p=n.pos.clone().addScaledVector(fwd,4.5);
    n.cast={type,t:0,acc:0,dmgT:0,x:p.x,z:p.z,
      y:Math.max(CFG.SEA,World.topY(Math.floor(p.x),Math.floor(p.z)))};
    if(type==='ice')n.elfIceCd=this.ELF.iceCd;else n.elfMetCd=this.ELF.meteorCd;
    UI.toast(`${n.role.e} ${n.name} merapal ${type==='ice'?'❄️ Hujan Es':'☄️ Hujan Meteor'}!`);
    NPCS.say(n,type==='ice'?'Es dari langit!':'Meteor, jatuhlah!',2.5);
    Sfx.at(n.pos,'craft');
  },
  /* event dari PortFX saat pecahan es/meteor mendarat */
  onShardLand(x,y,z){
    const c=this._activeCast('ice');
    if(c)this.aoe(c.owner,x,z,1.4,npcDmgSafe(c.owner)*0.75,2);
  },
  onMeteorLand(x,y,z){
    const c=this._activeCast('meteor');
    if(c)this.aoe(c.owner,x,z,2.2,npcDmgSafe(c.owner)*1.5,5);
  },
  _activeCast(type){
    for(const n of NPCS.list)
      if(!n.dead&&n.cast&&n.cast.type===type)return n.cast;
    return null;
  },
  countNear(n,r){
    let c=0;
    for(const m of Monsters.list)
      if(!m.dead&&m.pos.distanceTo(n.pos)<r)c++;
    return c;
  },
  aoe(owner,x,z,r,dmg,knock){
    for(const m of Monsters.list){
      if(m.dead)continue;
      const dx=m.pos.x-x,dz=m.pos.z-z;
      if(dx*dx+dz*dz>r*r)continue;
      Monsters.hurt(m,dmg,new THREE.Vector3(dx*0.2,0.4,dz*0.2),knock,owner);
      /* XP kill diurus Monsters.shareKillXp() — seluruh tim + pet dapat XP
         penuh. Grant ganda lama di sini dihapus. */
    }
  },


  /* ---------- ANIMASI ---------- */
  elfAnim(n,dt){
    /* SAFEGUARD BUGFIX: timer cast biasanya berjalan di elfCombat, tapi
       elfCombat hanya dipanggil selama NPC punya target (aiFight). Jika target
       mati/hilang DI TENGAH cast, n.cast tak pernah di-clear dan pose angkat
       tangan menempel selamanya. Di sini timer tetap dijalankan & cast
       di-clear saat tidak ada target, sehingga pose selalu kembali normal. */
    if(n.cast&&(!n.target||n.target.dead)){
      n.cast.t+=dt;
      if(n.cast.t>=(n.cast.type==='ice'?3.2:3.9))n.cast=null;
    }
    const R=n.parts,rr=R.rare,t=performance.now()*0.001;
    const P=n._pose||(n._pose={rootY:0,lean:0,twist:0,headX:0,headY:0,
      aLx:.08,aLy:0,aLz:.14,aRx:-.2,aRy:0,aRz:-.14,sX:0});
    const T={rootY:0,lean:0,twist:0,headX:0,headY:0,
      aLx:.08,aLy:0,aLz:.14,aRx:-.2,aRy:0,aRz:-.14,sX:0};
    let blend=10,ph=n._ph||(n._ph=0);
    const sp=Math.hypot(n.vel.x,n.vel.z);
    if(n.cast){
      if(n.cast.type==='ice'){
        blend=14;
        T.aRx=-2.85;T.sX=Math.PI;T.aLx=-2.5;T.aLz=.5;
        T.lean=-.12;T.headX=-.3;
        T.rootY=.3+Math.sin(t*6)*.06;
        if(rr.robe)rr.robe.rotation.x=Math.sin(t*7)*.12;
      }else{
        blend=14;
        T.sX=Math.PI;T.headX=-.25;
        const ct=n.cast.t;
        if(ct<0.5){T.aRx=-2.85;T.aLx=-2.3;T.aLz=.5;T.lean=-.18;}
        else if(ct<2.7){const u=(ct-0.5)/2.2;
          T.aRx=-2.85+u*0.9;T.aLx=-2.3+u*1.6;T.lean=-.18+u*0.3;}
        else{T.aRx=-.4;T.sX=0;T.aLx=-.3;T.lean=.05;}
      }
    }else if(sp>0.4){
      /* jalan/lari: kaki & jubah sesuai locomotion prototipe */
      n._ph=ph+=dt*(sp>3.2?11:7);
      const run=sp>3.2,amp=run?.32:.22;
      if(R.legs){
        R.legs[0].position.z=.05+Math.sin(ph)*amp;
        R.legs[1].position.z=.05-Math.sin(ph)*amp;
        R.legs[0].position.y=.09+Math.max(0,Math.sin(ph))*.12;
        R.legs[1].position.y=.09+Math.max(0,-Math.sin(ph))*.12;
      }
      if(rr.robe){rr.robe.rotation.x=Math.sin(ph)*.07;
        rr.robe.rotation.z=Math.sin(ph*.5)*.05;}
      T.aLx=-Math.sin(ph)*(run?.5:.3);
      T.aRx=-.28+Math.sin(ph)*.06;
      T.rootY=Math.abs(Math.cos(ph))*(run?.09:.05);
      T.lean=run?.14:.05;
      T.headY=Math.sin(ph*.5)*.08;
    }else{
      /* idle */
      const b=Math.sin(t*1.6);
      T.aLx=.08+b*.05;T.aRx=-.2-b*.04;
      T.lean=.02+b*.015;T.rootY=b*.025;
      T.headY=Math.sin(t*.6)*.28;T.headX=Math.sin(t*.9)*.05;
      if(R.legs){R.legs[0].position.set(.24,.09,.05);
        R.legs[1].position.set(-.24,.09,.05);}
      if(rr.robe)rr.robe.rotation.set(0,0,0);
      /* staff kembali ke posisi istirahat */
      T.aRx=-.2;T.sX=0;
    }
    /* serangan proyektil = pose cast singkat */
    if(!n.cast&&n.swing>0){
      blend=18;
      T.aRx=-1.5;T.sX=Math.PI;T.aLx=-1.15;T.aLz=.35;T.lean=.14;T.headX=.05;
    }
    const f=1-Math.exp(-blend*dt);
    for(const k in T)P[k]+=(T[k]-P[k])*f;
    /* terapkan ke rig (skala root 0.62) */
    n.mesh.position.y=n.pos.y+P.rootY*0.62;
    R.body.rotation.set(P.lean,P.twist,0);
    R.head.rotation.set(P.headX,P.headY,0);
    R.armL.rotation.set(P.aLx,P.aLy,P.aLz);
    R.armR.rotation.set(P.aRx,P.aRy,P.aRz);
    if(rr.staff)rr.staff.rotation.x=P.sX;
    /* kristal berdenyut + cahaya menguat saat merapal (prototipe) */
    if(rr.crystalG)rr.crystalG.scale.setScalar(1+Math.sin(t*3)*.06+
      (n.cast?0.25:0)+(n.swing>0?0.2:0));
    if(rr.light)rr.light.intensity=1.4+Math.sin(t*5)*0.4+
      (n.cast?2.2:0)+(n.swing>0?1.2:0);
  },
  animate(n,dt){ this.elfAnim(n,dt); },
  combat(n,dt){ return this.elfCombat(n,dt); },
};
window.NPC_Elfmage=NPC_Elfmage;
