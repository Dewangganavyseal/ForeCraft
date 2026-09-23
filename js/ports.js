'use strict';
/* ===========================================================================
   PORTS — hasil porting folder "NEW MODEL" ke dalam game
   ---------------------------------------------------------------------------
   1. PortChest  — peti voxel ala Minecraft (Chest.html): tutup engsel belakang,
                   easeOutBack saat membuka, harta bercahaya + burst partikel.
   2. PortRabbit — KELINCI CAKAR (NPC Kelinci.html): rig voxel lengkap +
                   animasi idle/jalan/lari/lompat/combo 1-3/skill RAPID CLAW.
   3. FishSys    — 8 spesies ikan (fish.html) berenang di perairan dunia,
                   animasi ekor/sirip persis prototipe; bisa ditangkap.
   4. PortFX     — efek visual porting: slash arc, spark, pecahan es, meteor,
                   proyektil aura, burst harta.
   5. SkillsPort — skill NPC sesuai prototipe NEW MODEL:
                     • Penyihir Elf : proyektil aura / Hujan Es / Hujan Meteor
                     • Raksasa Batu : combo mace 5 hit / EARTHQUAKE 3 slam
                     • Kelinci Cakar: combo sabitan / RAPID CLAW 5 cakaran
   ========================================================================= */

/* ================= util easing (dari prototipe) ================= */
const PE={
  out:t=>{t=clamp(t,0,1);return 1-Math.pow(1-t,3);},
  inOut:t=>{t=clamp(t,0,1);return t*t*(3-2*t);},
  back:t=>{const c=1.2;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);},
  cubicIO:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,
  bell:t=>Math.sin(Math.PI*clamp(t,0,1)),
  seg:(t,a,b)=>clamp((t-a)/(b-a),0,1),
};

/* ===========================================================================
   4. PORTFX — efek visual
   =========================================================================== */
const PortFX={
  ready:false,
  slashes:[],sparks:[],shards:[],meteors:[],projs:[],bursts:[],crescents:[],
  _v:new THREE.Vector3(),

  init(){
    if(this.ready)return;this.ready=true;
    const S=Game.scene;
    /* --- slash arc (combo mace raksasa & sabitan) --- */
    const gO=new THREE.RingGeometry(.55,1.05,26,1,0,2.25);
    const gI=new THREE.RingGeometry(.42,.5,26,1,0,2.25);
    for(let i=0;i<10;i++){
      const g=new THREE.Group();
      const outer=new THREE.Mesh(gO,new THREE.MeshBasicMaterial({color:0x7fd8ff,
        transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
      const inner=new THREE.Mesh(gI,new THREE.MeshBasicMaterial({color:0xffffff,
        transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
      g.add(outer,inner);g.visible=false;S.add(g);
      this.slashes.push({g,outer,inner,t:0,dur:.24,size:1,active:false});
    }
    /* --- sparks --- */
    for(let i=0;i<40;i++){
      const m=new THREE.Mesh(new THREE.BoxGeometry(.13,.13,.13),
        new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false}));
      m.visible=false;S.add(m);
      this.sparks.push({m,v:new THREE.Vector3(),t:0,dur:.4,active:false});
    }
    /* --- pecahan es (hujan es elf) --- */
    const mA=new THREE.MeshBasicMaterial({color:0xcfeeff,transparent:true,opacity:.92});
    const mB=new THREE.MeshBasicMaterial({color:0xa8e2ff,transparent:true,opacity:.85});
    const mC=new THREE.MeshBasicMaterial({color:0xeaf9ff,transparent:true,opacity:.95});
    const mD=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9});
    const sb=(g,w,h,d,m,x,y,z,rz)=>{const ms=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
      ms.position.set(x,y,z);if(rz)ms.rotation.z=rz;g.add(ms);};
    for(let i=0;i<14;i++){
      const g=new THREE.Group();
      sb(g,.26,1.6,.26,mA,0,0,0);
      sb(g,.16,1.05,.16,mB,.15,-.15,0,.14);
      sb(g,.13,.8,.13,mC,-.13,.1,.06,-.18);
      sb(g,.18,.3,.18,mC,0,-.9,0);
      sb(g,.09,1.1,.09,mD,0,0,0);
      g.visible=false;S.add(g);
      this.shards.push({m:g,vy:0,vx:0,vz:0,active:false});
    }
    /* --- meteor --- */
    for(let i=0;i<4;i++){
      const g=new THREE.Group();
      const bx=(w,h,d,c,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
        new THREE.MeshLambertMaterial({color:c}));m.position.set(x,y,z);g.add(m);};
      bx(.8,.8,.8,0x4a3a34,0,0,0);
      bx(.55,.55,.55,0x3a2c26,0,0,0);
      const glow=(x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(.2,.4,.2),
        new THREE.MeshBasicMaterial({color:0xff8a3d}));m.position.set(x,y,z);g.add(m);};
      glow(0,0,.42);glow(.42,0,0);
      const shell=new THREE.Mesh(new THREE.SphereGeometry(.78,8,6),
        new THREE.MeshBasicMaterial({color:0xff8a3d,transparent:true,opacity:.28,depthWrite:false}));
      g.add(shell);g.visible=false;S.add(g);
      this.meteors.push({g,v:new THREE.Vector3(),active:false,smokeT:0});
    }
    /* --- proyektil aura elf --- */
    for(let i=0;i<6;i++){
      const g=new THREE.Group();
      const core=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),
        new THREE.MeshBasicMaterial({color:0xeaffff}));
      const glow=new THREE.Mesh(new THREE.SphereGeometry(.42,10,8),
        new THREE.MeshBasicMaterial({color:0x59c8ff,transparent:true,opacity:.4,depthWrite:false}));
      const ring=new THREE.Mesh(new THREE.RingGeometry(.3,.42,20),
        new THREE.MeshBasicMaterial({color:0x9fe8ff,transparent:true,opacity:.8,
          side:THREE.DoubleSide,depthWrite:false}));
      g.add(core,glow,ring);g.visible=false;S.add(g);
      this.projs.push({g,ring,active:false,life:0,dir:new THREE.Vector3(),
        dmg:0,owner:null,trailT:0});
    }
    /* --- burst harta peti --- */
    const pGeo=new THREE.BoxGeometry(.12,.12,.12);
    const pCols=[0xffd23f,0x7bff8e,0x7df3ff,0xffffff];
    for(let i=0;i<24;i++){
      const m=new THREE.Mesh(pGeo,new THREE.MeshBasicMaterial({
        color:pCols[i%4],transparent:true}));
      m.visible=false;S.add(m);
      this.bursts.push({m,v:new THREE.Vector3(),t:0,life:1,active:false});
    }
    /* --- crescent slash golem (golem.html: RingGeometry 5.7 rad, 2 lapis) --- */
    const cresG=new THREE.RingGeometry(1.05,2.0,40,1,-1.9,3.8);
    for(let i=0;i<6;i++){
      const pivot=new THREE.Group();
      const m1=new THREE.Mesh(cresG,new THREE.MeshBasicMaterial({
        color:0xff4a2a,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
      const m2=new THREE.Mesh(cresG,new THREE.MeshBasicMaterial({
        color:0xffd9a8,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
      m2.scale.setScalar(0.78);
      pivot.add(m1,m2);pivot.visible=false;S.add(pivot);
      this.crescents.push({pivot,m1,m2,active:false,age:0,life:.3,
        tiltA:0,tiltB:0,size:1});
    }
  },

  /* ---------- pemicu efek ---------- */
  slash(x,y,z,yaw,arc,size,color){
    this.init();
    const s=this.slashes.find(s=>!s.active);if(!s)return;
    s.active=true;s.t=0;s.dur=.24;s.size=size;s.g.visible=true;
    s.g.position.set(x,y,z);
    const q1=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw);
    const q2=new THREE.Quaternion().setFromEuler(new THREE.Euler(arc[0],arc[1],arc[2]));
    s.g.quaternion.copy(q1).multiply(q2);
    s.outer.material.color.setHex(color);
    s.g.scale.setScalar(size*.75);
  },
  spark(x,y,z,n,color,spd){
    this.init();spd=spd||9;
    for(let i=0;i<n;i++){
      const s=this.sparks.find(s=>!s.active);if(!s)return;
      s.active=true;s.t=0;s.dur=.3+Math.random()*.25;s.m.visible=true;
      s.m.position.set(x,y,z);s.m.material.color.setHex(color);s.m.material.opacity=1;
      s.v.set((Math.random()-.5)*spd,Math.random()*spd*.6+1.5,(Math.random()-.5)*spd);
      s.m.scale.setScalar(.6+Math.random()*.9);
    }
  },
  shard(cx,cz,topY){
    this.init();
    const s=this.shards.find(s=>!s.active);if(!s)return;
    const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*3.6;
    s.active=true;s.m.visible=true;
    s.m.position.set(cx+Math.cos(a)*r,topY+11+Math.random()*4,cz+Math.sin(a)*r);
    s.m.rotation.set(Math.random()*.3,Math.random()*Math.PI,Math.random()*.3);
    s.vy=-(11+Math.random()*5);s.vx=(Math.random()-.5)*1.2;s.vz=(Math.random()-.5)*1.2;
    s.floor=topY;
  },
  meteor(cx,cz,yaw,topY){
    this.init();
    const m=this.meteors.find(m=>!m.active);if(!m)return;
    const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*3.2;
    const ix=cx+Math.cos(a)*r,iz=cz+Math.sin(a)*r;
    m.active=true;m.smokeT=0;m.g.visible=true;m.floor=topY;
    const sx=ix-Math.sin(yaw)*5+(Math.random()-.5)*3;
    const sz=iz-Math.cos(yaw)*5+(Math.random()-.5)*3;
    m.g.position.set(sx,topY+17+Math.random()*4,sz);
    m.v.set(ix-sx,-(m.g.position.y-topY),iz-sz).normalize().multiplyScalar(21);
    FX.ring(ix,topY+.05,iz,0xff9a4d,.5,2.2);
  },
  fireAura(from,dir,dmg,owner){
    this.init();
    const p=this.projs.find(p=>!p.active);if(!p)return;
    p.active=true;p.life=0;p.trailT=0;p.g.visible=true;
    p.g.position.copy(from);p.dir.copy(dir);p.dmg=dmg;p.owner=owner;
    this.spark(from.x,from.y,from.z,4,0x9fe8ff,4);
  },
  chestBurst(pos){
    this.init();
    for(let i=0;i<24;i++){
      const p=this.bursts.find(p=>!p.active);if(!p)return;
      p.active=true;p.t=0;p.life=rand(.8,1.6);p.m.visible=true;
      p.m.position.set(pos.x+rand(-.4,.4),pos.y+rand(.5,.9),pos.z+rand(-.4,.4));
      p.v.set(rand(-1.5,1.5),rand(3.5,7)*.55,rand(-1.5,1.5));
    }
  },
  /* crescent slash golem — parameter persis spawnSlash golem.html:
     (x,y,z, yaw, pitch, tiltA, tiltB, size, life, color) */
  crescent(x,y,z,yaw,pitch,tiltA,tiltB,size,life,color){
    this.init();
    const s=this.crescents.find(s=>!s.active);if(!s)return;
    s.active=true;s.age=0;s.life=life;s.tiltA=tiltA;s.tiltB=tiltB;s.size=size;
    s.pivot.visible=true;
    s.pivot.position.set(x,y,z);
    s.pivot.rotation.set(pitch,yaw,tiltA,'YXZ');
    s.m1.material.color.setHex(color);
    s.pivot.scale.setScalar(size*0.55);
  },

  /* ---------- update semua pool ---------- */
  update(dt){
    if(!this.ready)return;
    for(const s of this.slashes){if(!s.active)continue;
      s.t+=dt;const u=s.t/s.dur;
      if(u>=1){s.active=false;s.g.visible=false;continue;}
      const e=1-(1-u)*(1-u);
      s.g.scale.setScalar(s.size*(.75+.85*e));
      s.outer.material.opacity=.9*(1-u);s.inner.material.opacity=1-u;
    }
    for(const s of this.sparks){if(!s.active)continue;
      s.t+=dt;const u=s.t/s.dur;
      if(u>=1){s.active=false;s.m.visible=false;continue;}
      s.v.y-=12*dt;s.m.position.addScaledVector(s.v,dt);
      s.m.scale.multiplyScalar(Math.max(0,1-3*dt));s.m.material.opacity=1-u;
    }
    for(const s of this.shards){if(!s.active)continue;
      s.m.position.x+=s.vx*dt;s.m.position.y+=s.vy*dt;s.m.position.z+=s.vz*dt;
      s.m.rotation.y+=2.5*dt;
      if(s.m.position.y<=s.floor+.4){
        s.active=false;s.m.visible=false;
        const x=s.m.position.x,z=s.m.position.z,y=s.floor;
        FX.ring(x,y+.05,z,0x9fe8ff,.45,2.6);
        this.spark(x,y+.3,z,6,0xdff4ff,4.5);
        /* damage area ditangani SkillsPort lewat event tumbukan */
        if(SkillsPort.onShardLand)SkillsPort.onShardLand(x,y,z);
      }
    }
    for(const m of this.meteors){if(!m.active)continue;
      m.g.position.addScaledVector(m.v,dt);
      m.g.rotation.x+=3*dt;m.g.rotation.y+=4*dt;
      m.smokeT-=dt;
      if(m.smokeT<=0){m.smokeT=.09;
        FX.debris(m.g.position.clone(),0x6a625a,1,1.4);}
      if(m.g.position.y<=m.floor+.4){
        m.active=false;m.g.visible=false;
        const x=m.g.position.x,z=m.g.position.z,y=m.floor;
        FX.ring(x,y+.05,z,0xff8a3d,.55,7.5);
        FX.ring(x,y+.05,z,0xffffff,.3,3.5);
        this.spark(x,y+.5,z,14,0xffb066,10);
        FX.debris(new THREE.Vector3(x,y+.3,z),0x5a4a42,9,3.5);
        FX.addShake(.5);
        if(SkillsPort.onMeteorLand)SkillsPort.onMeteorLand(x,y,z);
      }
    }
    for(const p of this.projs){if(!p.active)continue;
      p.life+=dt;
      if(p.life>1.5){p.active=false;p.g.visible=false;continue;}
      p.g.position.addScaledVector(p.dir,15*dt);
      p.ring.rotation.x+=9*dt;p.ring.rotation.y+=7*dt;
      p.g.scale.setScalar(1+Math.sin(p.life*18)*.12);
      p.trailT-=dt;
      if(p.trailT<=0){p.trailT=.06;
        this.spark(p.g.position.x,p.g.position.y,p.g.position.z,1,0x9fe8ff,1.6);}
      /* tabrakan monster */
      let hit=null;
      for(const m of Monsters.list){
        if(m.dead)continue;
        if(m.pos.distanceTo(p.g.position)<1.0){hit=m;break;}
      }
      const blk=World.getBlock(Math.floor(p.g.position.x),
        Math.floor(p.g.position.y),Math.floor(p.g.position.z));
      if(hit){
        Monsters.hurt(hit,p.dmg,p.dir.clone().setY(.2),3,p.owner);
        this.spark(p.g.position.x,p.g.position.y,p.g.position.z,8,0x9fe8ff,5);
        FX.ring(p.g.position.x,p.g.position.y,p.g.position.z,0x59c8ff,.3,1.6);
        Sfx.at(p.g.position,'hit');
        /* XP kill diberikan Monsters.shareKillXp() (dari Monsters.kill): semua
           rekan tim + pet dapat XP penuh. Grant ganda lama dihapus. */
        p.active=false;p.g.visible=false;
      }else if(blk&&blk!==B.AIR&&blk!==B.WATER){
        this.spark(p.g.position.x,p.g.position.y,p.g.position.z,5,0x9fe8ff,3);
        p.active=false;p.g.visible=false;
      }
    }
    for(const p of this.bursts){if(!p.active)continue;
      p.t+=dt;
      if(p.t>=p.life){p.active=false;p.m.visible=false;continue;}
      p.v.y-=7*dt;
      p.m.position.addScaledVector(p.v,dt);
      p.m.rotation.x+=dt*4;p.m.rotation.y+=dt*5;
      const k=1-p.t/p.life;
      p.m.scale.setScalar(Math.max(k,.001));p.m.material.opacity=k;
    }
    for(const s of this.crescents){if(!s.active)continue;
      s.age+=dt;const k=s.age/s.life;
      if(k>=1){s.active=false;s.pivot.visible=false;continue;}
      const e=1-Math.pow(1-k,3);
      s.pivot.rotation.z=lerp(s.tiltA,s.tiltB,e);
      s.pivot.scale.setScalar(s.size*(0.55+1.15*e));
      s.m1.material.opacity=0.95*(1-k);
      s.m2.material.opacity=0.85*(1-k);
    }
  },
};

/* ===========================================================================
   1. PORTCHEST — peti voxel (Chest.html)
   =========================================================================== */
const PortChest={
  OPEN_ANGLE:-1.92,            // ≈ -110° sesuai prototipe
  build(){
    const S=0.055;             // 14 voxel → ±0.77 blok (dikecilkan, dulu 0.075 terlalu besar)
    const tint=(hex,d)=>{const c=new THREE.Color(hex);
      c.offsetHSL(0,0,rand(-.03,.03)+(d||0));return c;};
    const PLANK=0x9c6b38,PLANK_DARK=0x7c5228,INNER=0x4e3214,
      INNER_FLOOR=0x5d3d1c,GOLD=0xf3cf47,GOLD_DARK=0xb0891c,GOLD_BLACK=0x6b520e;
    const X0=-7,X1=6,Z0=-7,Z1=6;
    /* voxel builder → InstancedMesh (sama persis dgn prototipe) */
    const geo=new THREE.BoxGeometry(S,S,S);
    const mat=new THREE.MeshLambertMaterial();
    const build=items=>{
      const mesh=new THREE.InstancedMesh(geo,mat,items.length);
      const M=new THREE.Matrix4(),C=new THREE.Color();
      items.forEach((v,i)=>{
        M.makeTranslation((v.x+.5)*S,(v.y+.5)*S,(v.z+.5)*S);
        mesh.setMatrixAt(i,M);C.copy(v.c);mesh.setColorAt(i,C);
      });
      mesh.castShadow=!IS_MOBILE;
      return mesh;
    };
    const g=new THREE.Group();
    /* --- badan --- */
    const body=[];
    for(let x=X0;x<=X1;x++)for(let z=Z0;z<=Z1;z++)
      body.push({x,y:0,z,c:tint(PLANK,-.03)});
    for(let y=1;y<=9;y++){
      const seam=(y%4===3)?-.11:0;
      for(let x=X0;x<=X1;x++)for(let z=Z0;z<=Z1;z++){
        if(!(x===X0||x===X1||z===Z0||z===Z1))continue;
        const corner=(x===X0||x===X1)&&(z===Z0||z===Z1);
        body.push({x,y,z,c:tint(corner?PLANK_DARK:PLANK,seam)});
      }
    }
    for(let y=1;y<=8;y++)
      for(let x=X0+1;x<=X1-1;x++)for(let z=Z0+1;z<=Z1-1;z++)
        if(x===X0+1||x===X1-1||z===Z0+1||z===Z1-1)body.push({x,y,z,c:tint(INNER)});
    for(let x=X0+2;x<=X1-2;x++)for(let z=Z0+2;z<=Z1-2;z++)
      body.push({x,y:1,z,c:tint(INNER_FLOOR)});
    g.add(build(body));
    /* --- tutup: pivot engsel tepi atas belakang --- */
    const lidPivot=new THREE.Group();
    lidPivot.position.set(0,10*S,Z0*S);
    const lid=[];
    const lp=(x,y,z,c)=>lid.push({x,y:y-10,z:z-Z0,c}); // koordinat lokal pivot
    for(let y=10;y<=11;y++)
      for(let x=X0;x<=X1;x++)for(let z=Z0;z<=Z1;z++)
        if(x===X0||x===X1||z===Z0||z===Z1)lp(x,y,z,tint(PLANK));
    for(let x=X0;x<=X1;x++)for(let z=Z0;z<=Z1;z++){
      const edge=(x===X0||x===X1||z===Z0||z===Z1);
      lid.push({x,y:2,z:z-Z0,c:tint(edge?PLANK:INNER)});
    }
    for(let x=X0;x<=X1;x++)for(let z=Z0+1;z<=Z1-1;z++)
      lid.push({x,y:3,z:z-Z0,c:tint(PLANK,(z===Z0+1||z===Z1-1)?-.05:0)});
    for(let x=X0;x<=X1;x++)for(let z=Z0+2;z<=Z1-2;z++)
      lid.push({x,y:4,z:z-Z0,c:tint(PLANK,(z===Z0+2||z===Z1-2)?-.09:.02)});
    for(let y=9;y<=12;y++)for(let x=-2;x<=1;x++){
      const border=(y===9||y===12||x===-2||x===1);
      const hole=(y===10&&(x===-1||x===0));
      lp(x,y,7,tint(border?GOLD_DARK:hole?GOLD_BLACK:GOLD));
    }
    const lidMesh=build(lid);
    lidPivot.add(lidMesh);g.add(lidPivot);
    /* --- harta di dalam --- */
    const gemMats=[];
    const gems=new THREE.Group();
    const gem=(x,y,z,color,s)=>{
      const m=new THREE.MeshStandardMaterial({color,emissive:color,
        emissiveIntensity:.15,roughness:.3,metalness:.15});
      const ms=new THREE.Mesh(new THREE.BoxGeometry(s||.1,.1,.1),m);
      ms.position.set(x*S,y*S,z*S);gems.add(ms);gemMats.push(m);
    };
    gem(-1.5,2.5,-.5,0xffcf3f);gem(-.5,2.5,-1.5,0xffcf3f);gem(.5,2.5,-.5,0xffcf3f);
    gem(-.5,3.5,-.5,0xffcf3f);gem(2.5,2.5,-2.5,0x35e06e);gem(2.5,3.5,-2.5,0x35e06e);
    gem(1.5,2.5,2.5,0x66e8e2);gem(-3.5,2.5,2.5,0x66e8e2,.085);
    g.add(gems);
    /* cahaya dalam peti (hanya PC; mobile terlalu mahal) */
    let glow=null;
    if(!IS_MOBILE){
      glow=new THREE.PointLight(0xffd76a,0,4,2);
      glow.position.set(0,.35,0);g.add(glow);
    }
    g.userData.lid=lidPivot;
    g.userData.port={glow,gemMats,gems};
    return g;
  },
};

/* ===========================================================================
   1b. PORTGOLDCHEST — PETI EMAS PENJAGA AGUNG (hadiah boss dungeon)
   ---------------------------------------------------------------------------
   Peti mewah khusus hadiah boss, dibangun dengan gaya voxel yang sama seperti
   PortChest supaya menyatu dengan estetika game, tetapi jelas berbeda kelas:

     · badan LEBIH LEBAR & LEBIH TINGGI (16×16 voxel, dinding 10 tinggi)
     · seluruh badan berlapis EMAS dengan dua pita nila gelap sebagai kontras,
       plus urat emas terang di setiap sambungan papan
     · empat PILAR SUDUT bertakhta permata di puncaknya
     · tutup BERUNDAK TIGA TINGKAT (bukan datar) bermahkota lima gerigi emas
     · gembok besar bermata rubi di sisi depan
     · di dalamnya tumpukan batangan emas berlapis + permata warna-warni yang
       berdenyut cahayanya saat tutup terbuka

   Sama seperti PortChest, model mengekspos:
     userData.lid  = Group engsel tutup (dianimasikan Furni.update)
     userData.port = {glow, gemMats, gems} untuk denyut cahaya harta
   =========================================================================== */
const PortGoldChest={
  OPEN_ANGLE:-1.92,
  build(){
    const S=0.055;                       // sama dgn PortChest agar seukuran blok
    const tint=(hex,d)=>{const c=new THREE.Color(hex);
      c.offsetHSL(0,0,rand(-.025,.025)+(d||0));return c;};
    /* palet: emas berlapis + nila gelap sebagai pita kontras */
    const GOLD=0xf0c53c, GOLD_HI=0xffe98a, GOLD_DK=0xa87c12,
          IND=0x2c2350, IND_DK=0x1a1433,
          INNER=0x3a2c10, INNER_FLOOR=0x4a3a14,
          RUBY=0xff3b6b, EMER=0x35e06e, SAPH=0x4da3ff;
    /* badan 16×16 voxel (PortChest 14×14) → peti terasa lebih berbobot */
    const X0=-8,X1=7,Z0=-8,Z1=7;
    const WALL_TOP=10;                   // dinding badan setinggi 10 voxel

    const geo=new THREE.BoxGeometry(S,S,S);
    const mat=new THREE.MeshLambertMaterial();
    const build=items=>{
      const mesh=new THREE.InstancedMesh(geo,mat,items.length);
      const M=new THREE.Matrix4(),C=new THREE.Color();
      items.forEach((v,i)=>{
        M.makeTranslation((v.x+.5)*S,(v.y+.5)*S,(v.z+.5)*S);
        mesh.setMatrixAt(i,M);C.copy(v.c);mesh.setColorAt(i,C);
      });
      mesh.castShadow=!IS_MOBILE;
      return mesh;
    };

    const g=new THREE.Group();

    /* ---------------- BADAN ---------------- */
    const body=[];
    /* dasar penuh */
    for(let x=X0;x<=X1;x++)for(let z=Z0;z<=Z1;z++)
      body.push({x,y:0,z,c:tint(GOLD_DK,-.04)});
    /* dinding: emas dengan DUA pita nila melingkar (y 3 & 7) dan urat emas
       terang di sambungan papan tiap 3 voxel */
    for(let y=1;y<=WALL_TOP;y++){
      const belt=(y===3||y===7);
      const seam=(y%3===0);
      for(let x=X0;x<=X1;x++)for(let z=Z0;z<=Z1;z++){
        if(!(x===X0||x===X1||z===Z0||z===Z1))continue;
        const corner=(x===X0||x===X1)&&(z===Z0||z===Z1);
        let col;
        if(corner)col=tint(GOLD_HI,.02);            // sudut selalu emas terang
        else if(belt)col=tint(IND,-.02);
        else col=tint(GOLD,seam?.05:0);
        body.push({x,y,z,c:col});
      }
    }
    /* dinding dalam gelap + lantai dalam */
    for(let y=1;y<=WALL_TOP-1;y++)
      for(let x=X0+1;x<=X1-1;x++)for(let z=Z0+1;z<=Z1-1;z++)
        if(x===X0+1||x===X1-1||z===Z0+1||z===Z1-1)body.push({x,y,z,c:tint(INNER)});
    for(let x=X0+2;x<=X1-2;x++)for(let z=Z0+2;z<=Z1-2;z++)
      body.push({x,y:1,z,c:tint(INNER_FLOOR)});

    /* PILAR SUDUT: empat tiang emas menjulang 2 voxel di atas dinding,
       masing-masing bertakhta permata di puncaknya */
    const gemTop=[RUBY,EMER,SAPH,EMER];
    let gi=0;
    for(const cx of[X0,X1])for(const cz of[Z0,Z1]){
      for(let y=WALL_TOP+1;y<=WALL_TOP+2;y++)
        body.push({x:cx,y,z:cz,c:tint(GOLD_HI,.03)});
      body.push({x:cx,y:WALL_TOP+3,z:cz,c:new THREE.Color(gemTop[gi++%4])});
    }

    /* GEMBOK besar di sisi depan (z=Z1) bermata rubi */
    for(let y=4;y<=7;y++)for(let x=-2;x<=1;x++){
      const border=(y===4||y===7||x===-2||x===1);
      body.push({x,y,z:Z1,c:tint(border?GOLD_DK:GOLD_HI,border?-.03:.04)});
    }
    body.push({x:-1,y:6,z:Z1+1,c:new THREE.Color(RUBY)});
    body.push({x:0, y:6,z:Z1+1,c:new THREE.Color(RUBY)});
    g.add(build(body));

    /* ---------------- TUTUP BERUNDAK ----------------
       Engsel di tepi atas belakang (z=Z0) seperti PortChest, tapi bentuknya
       tiga undakan yang menyempit ke tengah + gerigi mahkota di depan. */
    const lidPivot=new THREE.Group();
    lidPivot.position.set(0,(WALL_TOP+1)*S,Z0*S);
    const lid=[];
    const lp=(x,y,z,c)=>lid.push({x,y:y-(WALL_TOP+1),z:z-Z0,c});

    /* undakan 1: pelat penuh sebagai dasar tutup */
    for(let x=X0;x<=X1;x++)for(let z=Z0;z<=Z1;z++){
      const edge=(x===X0||x===X1||z===Z0||z===Z1);
      lp(x,WALL_TOP+1,z,tint(edge?GOLD_HI:GOLD,edge?.03:0));
    }
    /* undakan 2: menyempit 1 voxel di keempat sisi, dengan pita nila */
    for(let x=X0+1;x<=X1-1;x++)for(let z=Z0+1;z<=Z1-1;z++){
      const edge=(x===X0+1||x===X1-1||z===Z0+1||z===Z1-1);
      lp(x,WALL_TOP+2,z,tint(edge?IND_DK:GOLD,edge?-.02:.02));
    }
    /* undakan 3: puncak emas terang */
    for(let x=X0+2;x<=X1-2;x++)for(let z=Z0+2;z<=Z1-2;z++)
      lp(x,WALL_TOP+3,z,tint(GOLD_HI,.04));
    /* GERIGI MAHKOTA: lima taji menghadap depan di puncak tutup */
    for(const cx of[-5,-2,0,2,4]){
      lp(cx,WALL_TOP+4,Z1-2,tint(GOLD_HI,.06));
      if(cx===0)lp(cx,WALL_TOP+5,Z1-2,new THREE.Color(RUBY));   // taji tengah tertinggi
    }
    /* bingkai gembok pada tutup (menyambung dgn gembok badan) */
    for(let x=-2;x<=1;x++)lp(x,WALL_TOP+1,Z1,tint(GOLD_DK,-.02));
    const lidMesh=build(lid);
    lidPivot.add(lidMesh);g.add(lidPivot);

    /* ---------------- HARTA DI DALAM ----------------
       Batangan emas bertumpuk + permata warna-warni. Materialnya emissive
       supaya Furni.update bisa menguatkan kilaunya saat tutup terbuka. */
    const gemMats=[];
    const gems=new THREE.Group();
    const addGlow=(x,y,z,color,sx,sy,sz)=>{
      const m=new THREE.MeshStandardMaterial({color,emissive:color,
        emissiveIntensity:.15,roughness:.28,metalness:.35});
      const ms=new THREE.Mesh(new THREE.BoxGeometry(sx||.12,sy||.09,sz||.12),m);
      ms.position.set(x*S,y*S,z*S);gems.add(ms);gemMats.push(m);
    };
    /* tumpukan batangan emas (dua lapis, lapis atas lebih sedikit) */
    for(const[bx,bz]of[[-3,-3],[-1,-3],[1,-3],[-3,-1],[-1,-1],[1,-1],[3,-1]])
      addGlow(bx,2.6,bz,0xffcf3f,.145,.085,.1);
    for(const[bx,bz]of[[-2,-2],[0,-2],[2,-2]])
      addGlow(bx,3.5,bz,0xffe07a,.145,.085,.1);
    /* permata: rubi, zamrud, safir */
    addGlow(-3.5,2.7,2.5,RUBY,.11,.11,.11);
    addGlow(-1,2.7,3,EMER,.1,.1,.1);
    addGlow(1.5,2.7,2.5,SAPH,.115,.115,.115);
    addGlow(3.5,2.7,1.5,EMER,.095,.095,.095);
    addGlow(0,4.3,-2,RUBY,.09,.09,.09);
    g.add(gems);

    /* cahaya dalam peti (hanya PC; mobile terlalu mahal) */
    let glow=null;
    if(!IS_MOBILE){
      glow=new THREE.PointLight(0xffdf8a,0,5.5,2);
      glow.position.set(0,.42,0);g.add(glow);
    }
    g.userData.lid=lidPivot;
    g.userData.port={glow,gemMats,gems};
    return g;
  },
};




/* ===========================================================================
   3. FISH — 8 spesies ikan otentik (fish.html) di Biome Laut
   =========================================================================== */
const FishSys={
  list:[],timer:0,MAX:IS_MOBILE?8:14,
  V:0.22,
  _boxGeo:null,_matVox:null,_d:null,_c:null,

  _J(hex,a=0.06){
    const c=new THREE.Color(hex);const k=1+(Math.random()*2-1)*a;
    c.r=Math.min(1,c.r*k);c.g=Math.min(1,c.g*k);c.b=Math.min(1,c.b*k);
    return c.getHex();
  },

  /* definisi 8 ikan dari NEW MODEL/fish.html */
  DEFS:[
    {id:'teri',name:'Teri Perak',rarity:'common',scale:0.85,
      heights:[2,3,4,4,4,3,2],width:2,
      colorAt(i,y,h){return y<h*0.34?0xe3ebf0:y>h*0.66?0x5e7c94:0x93adc0;},
      finCol:0x8fa6b8,tailCol:0x7e97ab,tail:'forkSmall',
      dorsal:{from:2,to:4,h:()=>1,col:0x6d8296},
      swimSpeed:1.35,wagSpd:13,wagAmp:0.5,finSpd:13,
      hp:18,xp:10,dropFish:1,dropScale:[1,2]},
    {id:'mas',name:'Ikan Mas',rarity:'common',scale:1.0,
      heights:[2,4,5,6,6,4,3],width:3,
      colorAt(i,y,h){if(y<h*0.3)return 0xf4dc9c;
        if(Math.random()<0.1)return 0xb3781a;
        return y>h*0.62?0xd3921d:0xe9b13a;},
      finCol:0xe0703a,tailCol:0xe2953f,tail:'fan',tailH:1,
      dorsal:{from:2,to:4,h:i=>i===3?3:2,col:0xd95f2b},
      swimSpeed:0.95,wagSpd:9,wagAmp:0.45,finSpd:10,
      hp:25,xp:12,dropFish:1,dropScale:[1,2]},
    {id:'lele',name:'Lele Kampung',rarity:'common',scale:1.05,
      heights:[2,2,3,3,3,3,3],widths:[3,3,4,4,5,5,4],
      colorAt(i,y,h){return y<h*0.35?0x8b917f:(Math.random()<0.12?0x39402f:0x565e49);},
      finCol:0x4a5240,tailCol:0x4a5240,tail:'forkSmall',whiskers:true,
      dorsal:{from:2,to:3,h:()=>1,col:0x39402f},
      swimSpeed:0.8,wagSpd:8,wagAmp:0.4,finSpd:8,
      hp:30,xp:14,dropFish:1,dropScale:[1,2]},
    {id:'badut',name:'Badut Karang',rarity:'common',scale:0.95,
      heights:[2,4,5,6,6,5,3],width:3,
      colorAt(i,y,h){return (i===1||i===3||i===5)?0xf2f4f6:(y<h*0.3?0xf9a05c:0xef7218);},
      finCol:0xef7218,tailCol:0xf0863c,tail:'fan',tailH:1,
      dorsal:{from:1,to:5,h:i=>(i===1||i===3||i===5)?2:3,col:0xe2571b},
      swimSpeed:1.05,wagSpd:9,wagAmp:0.45,finSpd:10,
      hp:22,xp:12,dropFish:1,dropScale:[1,2]},
    {id:'puffer',name:'Puffer Duri',rarity:'rare',scale:1.05,
      heights:[3,5,6,6,5,3],widths:[2,3,3,3,3,2],
      colorAt(i,y,h){return y<h*0.3?0xefe3b8:(Math.random()<0.18?0x77571d:0xd8b45e);},
      finCol:0xc39a3c,tailCol:0xc39a3c,tail:'fanSmall',spikesPuffer:true,
      dorsal:{from:2,to:3,h:()=>1,col:0x8a6a25},
      swimSpeed:0.7,wagSpd:7,wagAmp:0.4,finSpd:8,
      hp:50,xp:25,dropFish:2,dropScale:[2,3]},
    {id:'todak',name:'Todak Biru',rarity:'rare',scale:1.2,
      heights:[2,3,4,5,5,4,3],width:3,
      colorAt(i,y,h){return y<h*0.3?0xa9bdd4:y>h*0.66?0x33507e:0x5f80ab;},
      finCol:0x2e4a77,tailCol:0x33507e,tail:'fork',
      dorsal:{from:3,to:5,h:i=>i===4?4:3,col:0x274672},
      sword:{col:0x22304a},
      swimSpeed:1.25,wagSpd:10,wagAmp:0.45,finSpd:10,
      hostile:true,hp:95,dmg:14,aggroR:14,reach:2.2,
      xp:50,dropFish:2,dropScale:[2,4]},
    {id:'lentera',name:'Lentera Jurang',rarity:'rare',scale:1.15,
      heights:[2,4,6,7,7,6,4],widths:[2,3,4,4,5,5,4],
      colorAt(i,y,h){return y<h*0.28?0x5a4373:(Math.random()<0.1?0x221732:0x3a2a50);},
      finCol:0x4a3564,tailCol:0x4a3564,tail:'fan',tailH:0,
      mouthH:0.45,mouthW:0.85,mouthCol:0x120b1c,teeth:true,
      lure:{col:0x3ff2d7},
      dorsal:{from:2,to:4,h:i=>i===3?2:1,col:0x2c1f3a},
      swimSpeed:0.85,wagSpd:7,wagAmp:0.4,finSpd:8,
      hostile:true,hp:140,dmg:18,aggroR:16,reach:2.2,
      xp:65,dropFish:2,dropScale:[2,4]},
    {id:'leviathan',name:'LEVIATHAN',rarity:'mythic',scale:2.0,
      heights:[2,4,5,6,6,5,5,6,6,5,4,3,2],widths:[3,3,4,4,4,3,3,4,4,4,3,2,2],
      colorAt(i,y,h){return y<h*0.25?0x4a5c80:y>h*0.7?0x0e1730:(Math.random()<0.1?0x0e1730:0x1f2c4d);},
      finCol:0x1b2a4a,tailCol:0x16233f,tail:'blade',serpent:true,finScale:1.7,
      spikes:[{i:10,h:3},{i:7,h:2},{i:4,h:2}],spikeCol:0x0a1124,
      glowStripes:true,glowCol:0x38e1ff,glowEyes:true,eyeCol:0x38e1ff,
      jaw:true,jawCol:0x152039,noMouth:true,
      swimSpeed:0.65,wagSpd:5.0,wagAmp:0.35,finSpd:6,
      hostile:true,hp:950,dmg:38,aggroR:22,reach:4.2,
      xp:250,dropFish:5,dropScale:[4,6]},
  ],

  /* ---------- builder voxel ikan (port otentik fish.html) ---------- */
  _init(){
    if(this._boxGeo)return;
    this._boxGeo=new THREE.BoxGeometry(1,1,1);
    this._matVox=new THREE.MeshLambertMaterial({color:0xffffff});
    this._d=new THREE.Object3D();this._c=new THREE.Color();
  },
  _meshOf(list,glowColor){
    this._init();
    if(!list.length)return null;
    const mat=glowColor
      ?new THREE.MeshBasicMaterial({color:0xffffff})
      :this._matVox;
    const im=new THREE.InstancedMesh(this._boxGeo,mat,list.length);
    list.forEach((v,i)=>{
      this._d.position.set(v.x,v.y,v.z);this._d.scale.set(v.sx,v.sy,v.sz);
      this._d.rotation.set(0,0,0);this._d.updateMatrix();
      im.setMatrixAt(i,this._d.matrix);
      this._c.set(v.col);im.setColorAt(i,this._c);
    });
    im.instanceMatrix.needsUpdate=true;
    if(im.instanceColor)im.instanceColor.needsUpdate=true;
    im.frustumCulled=false;
    return im;
  },
  _vox(x,y,z,sx,sy,sz,col){return{x,y,z,sx,sy,sz,col};},
  _tailShape(def,lists){
    const T=lists.tail,C=def.tailCol,xcol=d=>0.7-d;
    if(def.tail==='fan'){const h0=def.tailH??1;
      for(let d=1;d<=3;d++){const hh=Math.round(h0+d*1.7),y0=-(hh-1)/2;
        for(let yy=0;yy<hh;yy++)T.push(this._vox(xcol(d),y0+yy,0,0.9,1,0.85,C));}}
    else if(def.tail==='fanSmall'){
      for(let d=1;d<=2;d++){const hh=Math.round(1+d*1.3),y0=-(hh-1)/2;
        for(let yy=0;yy<hh;yy++)T.push(this._vox(xcol(d),y0+yy,0,0.9,1,0.85,C));}}
    else if(def.tail==='fork'){
      for(const y of[-1,0,1])T.push(this._vox(xcol(1),y,0,0.9,1,0.8,C));
      for(const y of[-2,-1,1,2])T.push(this._vox(xcol(2),y,0,0.9,1,0.8,C));
      for(const y of[-3,-2,2,3])T.push(this._vox(xcol(3),y,0,0.9,1,0.8,C));}
    else if(def.tail==='forkSmall'){
      for(const y of[-1,0,1])T.push(this._vox(xcol(1),y,0,0.9,1,0.8,C));
      for(const y of[-2,2])T.push(this._vox(xcol(2),y,0,0.9,1,0.8,C));}
    else if(def.tail==='blade'){
      for(let d=1;d<=5;d++){const hh=Math.round(2+d*1.8),y0=-(hh-1)/2;
        const target=d<=2?T:lists.tail2,xo=xcol(d<=2?d:d-2);
        for(let yy=0;yy<hh;yy++){
          if(yy===0&&d%2===0)continue;
          if(yy===hh-1&&d%2===1)continue;
          target.push(this._vox(xo,y0+yy,0,0.9,1,0.85,C));}}}
  },
  buildFish(def){
    const lists={body:[],glow:[],tail:[],tail2:[],finL:[],finR:[],jaw:[]};
    const H=def.heights,L=H.length,W=def.widths||H.map(()=>def.width);
    const x0=Math.floor(L*0.35),X=i=>i-x0;
    const top=[],bot=[];
    for(let i=0;i<L;i++){const h=H[i],w=W[i],x=X(i),yb=-Math.floor(h/2);
      top[i]=yb+h-1;bot[i]=yb;
      for(let yy=0;yy<h;yy++)for(let zz=0;zz<w;zz++)
        lists.body.push(this._vox(x,yb+yy,zz-(w-1)/2,1,1,1,def.colorAt(i,yy,h,w)));}
    if(def.dorsal){const dd=def.dorsal;
      for(let i=dd.from;i<=dd.to;i++){const hh=dd.h(i);
        for(let k=1;k<=hh;k++){const s=1-(k-1)/(hh+1)*0.45;
          lists.body.push(this._vox(X(i),top[i]+0.025+k*0.8,0,s,0.85,0.8,dd.col));}}}
    if(def.spikes)def.spikes.forEach(sp=>{let y=top[sp.i]+0.8;
      for(let k=0;k<sp.h;k++){const s=1-k*0.22;
        lists.body.push(this._vox(X(sp.i),y,0,s,0.9,s,def.spikeCol));y+=0.8;}});
    if(def.spikesPuffer){const sw=i=>W[i]/2+0.3;
      const pts=[[2,top[2]+0.7,0],[4,top[4]+0.7,0],[2,bot[2]-0.7,0],[4,bot[4]-0.7,0],
        [1,0.4,sw(1)],[3,0.6,sw(3)],[1,0.4,-sw(1)],[3,0.6,-sw(3)],
        [4,-0.4,sw(4)],[2,-0.5,-sw(2)]];
      pts.forEach(p=>lists.body.push(this._vox(X(p[0]),p[1],p[2],0.55,0.55,0.55,0x8a6a25)));}
    if(!def.noMouth){const i=L-1,h=H[i],w=W[i];
      const mh=Math.max(1,Math.round(h*(def.mouthH||0.3))),mw=Math.max(1,Math.round(w*(def.mouthW||0.55)));
      const y=bot[i]+(mh-1)/2;
      lists.body.push(this._vox(X(i)+0.62,y,0,0.28,mh,mw,def.mouthCol||0x20242c));
      if(def.teeth){const n=Math.min(4,mw+1);
        for(let ti=0;ti<n;ti++){const z=(ti-(n-1)/2)*Math.max(0.8,mw>1?(mw-1)/(n-1):0);
          lists.body.push(this._vox(X(i)+0.72,y+mh*0.5+0.2,z,0.26,0.5,0.26,0xe9eef3));}}}
    {const i=L-2,h=H[i],w=W[i],ey=bot[i]+Math.max(1,Math.round(h*0.62)),ez=w/2+0.12;
     if(def.glowEyes){for(const s of[-1,1])
       lists.glow.push(this._vox(X(i)+0.5,ey,s*ez,0.85,0.6,0.4,def.eyeCol));}
     else for(const s of[-1,1]){
       lists.body.push(this._vox(X(i)+0.5,ey,s*ez,0.62,0.62,0.3,0xf5f7fa));
       lists.body.push(this._vox(X(i)+0.55,ey,s*(ez+0.17),0.34,0.34,0.2,0x14181f));}}
    if(def.whiskers){const i=L-1,x=X(i)+0.6;
      for(const s of[-1,1]){
        lists.body.push(this._vox(x+0.8,0.1,s*(W[i]/2-0.3),1.6,0.22,0.22,0x2f352c));
        lists.body.push(this._vox(x+0.6,-0.5,s*(W[i]/2-0.7),1.3,0.22,0.22,0x2f352c));}}
    if(def.sword){let x=X(L-1)+1.0;
      for(let k=0;k<4;k++){const s=1-k*0.16;
        lists.body.push(this._vox(x,0.5,0,1.4*s,0.44*s,0.44*s,def.sword.col));x+=1.15*s;}}
    if(def.lure){const xb=X(L-2),tb=top[L-2];
      [[-0.3,0.75],[0.15,1.1],[0.6,1.35],[1.05,1.5]].forEach(p=>
        lists.body.push(this._vox(xb+p[0],tb+p[1],0,0.5,0.5,0.5,0x241a30)));
      lists.glow.push(this._vox(xb+1.75,tb+1.45,0,0.95,0.95,0.95,def.lure.col));}
    if(def.glowStripes)for(let i=2;i<L-1;i+=2)
      for(const s of[-1,1])
        lists.glow.push(this._vox(X(i),0,s*(W[i]/2+0.06),0.9,0.35,0.16,def.glowCol));
    const iF=Math.floor(L*0.62),f=def.finScale||1;
    const fx=X(iF),fy=bot[iF]+Math.max(1,Math.round(H[iF]*0.3)),fz=W[iF]/2+0.1;
    const pts=[[0,0,0,1.2,1.0],[-1,0,0.9,1,0.9],[-1.9,0.1,1.75,0.9,0.85],
               [-1.1,0.05,2.05,0.9,0.8],[-2.7,0.15,2.45,0.8,0.7]];
    for(const p of pts){
      lists.finR.push(this._vox(p[0]*f,p[1]*f,p[2]*f,p[3]*f,0.32*f,p[4]*f,def.finCol));
      lists.finL.push(this._vox(p[0]*f,p[1]*f,-p[2]*f,p[3]*f,0.32*f,p[4]*f,def.finCol));}
    this._tailShape(def,lists);
    let jawPos=null;
    if(def.jaw){const iJ=L-3,xj=X(iJ)+1,yj=bot[iJ]-0.15;jawPos={x:xj,y:yj};
      for(let k=0;k<3;k++){const wj=3-(k===2?1:0);
        for(let zz=0;zz<wj;zz++)
          lists.jaw.push(this._vox(0.9+k,-0.35,(zz-(wj-1)/2)*0.95,1,0.75,0.95,def.jawCol));}
      for(let k=0;k<3;k++)for(const s of[-1,0,1])
        lists.jaw.push(this._vox(0.9+k,0.22,s*0.95,0.3,0.5,0.3,0xeef3f6));}
    /* rakit grup (struktur & pivot persis prototipe) */
    const root=new THREE.Group(),inner=new THREE.Group();root.add(inner);
    const parts={};
    let glowMat=null;
    const put=(list,glow,parent)=>{
      const m=this._meshOf(list,glow?def.glowCol||0x38e1ff:null);
      if(m){
        parent.add(m);
        if(glow&&m.material)glowMat=m.material;
      }
      return m;};
    put(lists.body,false,inner);
    parts.glow=put(lists.glow,true,inner);
    parts.glowMat=glowMat;
    const ty=bot[0]+(H[0]-1)/2;
    const tailP=new THREE.Group();tailP.position.set(X(0)-0.5,ty,0);inner.add(tailP);
    parts.tail=tailP;put(lists.tail,false,tailP);
    if(def.serpent&&lists.tail2.length){
      const t2=new THREE.Group();t2.position.set(-1.8,0,0);tailP.add(t2);
      parts.tail2=t2;put(lists.tail2,false,t2);}
    const finR=new THREE.Group();finR.position.set(fx,fy,fz);inner.add(finR);
    parts.finR=finR;put(lists.finR,false,finR);
    const finL=new THREE.Group();finL.position.set(fx,fy,-fz);inner.add(finL);
    parts.finL=finL;put(lists.finL,false,finL);
    if(def.jaw){const jp=new THREE.Group();jp.position.set(jawPos.x,jawPos.y,0);
      inner.add(jp);parts.jaw=jp;put(lists.jaw,false,jp);}
    return{root,inner,parts,k:this.V*def.scale};
  },

  /* ---------- cek apakah perairan adalah laut dengan kedalaman minimal 4 blok untuk spawn ---------- */
  isDeepOcean(x,z){
    const bx=Math.floor(x),bz=Math.floor(z);
    if(typeof WGEN!=='undefined'&&WGEN.biomeAt){
      if(WGEN.biomeAt(bx,bz)!==BIOME.OCEAN)return false;
      const gh=WGEN.height(bx,bz);
      if(CFG.SEA-gh<4)return false; // spawn di perairan berkedalaman minimal 4 blok
    }
    return (typeof World!=='undefined'&&World.inWaterAt)?World.inWaterAt(x,CFG.WATER_Y-0.5,z):true;
  },

  /* ---------- cek apakah posisi aman & bebas untuk berenang ikan ---------- */
  canSwim(x,y,z){
    const bx=Math.floor(x),bz=Math.floor(z);
    // 1. Pastikan perairan terbuka (di air)
    if(typeof World!=='undefined'&&World.inWaterAt){
      if(!World.inWaterAt(x,CFG.WATER_Y-0.3,z))return false;
    }
    // 2. Hindari daratan atau pantai pasir kering (kedalaman minimal 1.1 blok agar tidak terdampar)
    if(typeof WGEN!=='undefined'&&WGEN.height){
      const gh=WGEN.height(bx,bz);
      if(CFG.SEA-gh<1.1)return false;
    }
    // 3. Pastikan tidak menembus blok padat (batu/karang bawah air)
    if(typeof World!=='undefined'&&World.blockedAt){
      const checkY=(y!==undefined)?y:(CFG.WATER_Y-0.8);
      if(World.blockedAt(x,checkY,z,0.2))return false;
    }
    return true;
  },

  /* ---------- cek apakah target (pemain / NPC / pet) benar-benar berada di air ---------- */
  isTargetInWater(tgt){
    if(!tgt||tgt.dead)return false;
    if(tgt===Player){
      // Pemain harus berada di air (bukan berdiri di daratan/pantai kering setinggi permukaan air)
      return !!(Player.inWater || (typeof World!=='undefined'&&World.inWaterAt&&World.inWaterAt(Player.pos.x,Player.pos.y+0.2,Player.pos.z)));
    }
    return !!(tgt.inWater || (typeof World!=='undefined'&&World.inWaterAt&&World.inWaterAt(tgt.pos.x,tgt.pos.y+0.2,tgt.pos.z)));
  },

  /* ---------- spawn di perairan laut dalam sekitar pemain ---------- */
  pickDef(){
    const r=Math.random();
    const pool=this.DEFS.filter(d=>
      r<0.05?d.rarity==='mythic':r<0.30?d.rarity==='rare':d.rarity==='common');
    return pool[(Math.random()*pool.length)|0]||this.DEFS[0];
  },
  findWater(minD,maxD){
    for(let t=0;t<24;t++){
      const a=Math.random()*Math.PI*2,d=rand(minD,maxD);
      const x=Player.pos.x+Math.sin(a)*d,z=Player.pos.z+Math.cos(a)*d;
      if(this.isDeepOcean(x,z)){
        const gh=WGEN.height(Math.floor(x),Math.floor(z));
        const spawnY=gh+0.6+Math.random()*(CFG.WATER_Y-gh-1.1);
        return new THREE.Vector3(x,spawnY,z);
      }
    }
    return null;
  },
  spawn(){
    if(this.list.length>=this.MAX)return;
    const anchor=this.findWater(12,38);
    if(!anchor)return;
    const def=this.pickDef();
    /* bangun model 3D voxel otentik dari fish.html */
    const b=this.buildFish(def);
    b.root.position.copy(anchor);
    b.root.visible=true;
    Game.scene.add(b.root);

    const gh=(typeof WGEN!=='undefined')?WGEN.height(Math.floor(anchor.x),Math.floor(anchor.z)):1;
    const minY=gh+0.5;
    const maxY=CFG.WATER_Y-0.25;

    const fObj={
      def,root:b.root,inner:b.inner,parts:b.parts,k:b.k,
      pos:anchor.clone(),dir:Math.random()*Math.PI*2,visDir:0,
      speed:(def.swimSpeed||0.95)*1.1,turnT:0,
      phase:Math.random()*Math.PI*2,spawnT:0,jawBase:def.jaw?-0.08:0,
      // renang 3D dalam air (rentang hingga 4 blok)
      groundY:gh,minY,maxY,targetY:anchor.y,vy:0,
      depthTimer:rand(2.5,5.5),
      // animasi idle lompat keluar air dengan cipratan
      jumpTimer:rand(10,25),inAir:false,jumpVx:0,jumpVz:0,
      // tempur & kecerdasan buatan
      hp:def.hp||20,maxhp:def.hp||20,flash:0,
      state:'swim',fleeTimer:0,attackCd:rand(0.5,1.5),repositionT:0,
      glideT:0,turnReengageT:0,jawOpen:0,jawBiteT:0
    };

    /* Daftarkan ikan predator buas ke Monsters.list agar diperlakukan sama seperti mob biasa:
       bisa dideteksi & diserang oleh NPC / pet, serta bisa membalas / menyerang NPC */
    if(def.hostile&&typeof Monsters!=='undefined'&&Monsters.list){
      const mobFish={
        isFish:true,
        fishRef:fObj,
        type:'fish',
        fishId:def.id,
        name:def.name,
        pos:fObj.pos,
        vel:new THREE.Vector3(),
        mesh:fObj.root,
        parts:{},
        baseScale:1,
        sizeMul:1,
        hp:fObj.hp,
        maxhp:fObj.maxhp,
        r:(def.id==='leviathan')?2.8:((def.id==='todak')?1.5:1.2),
        dmg:def.dmg||15,
        speed:fObj.speed,
        xp:def.xp||50,
        lvl:(def.id==='leviathan')?50:((def.id==='todak')?28:22),
        boss:def.id==='leviathan',
        dead:false,
        deathT:0,
        flash:0,
        threat:{},
        onGround:false,
        inWater:true,
        state:'chase',
        t:1,
        atkCd:0,
        hpT:0,
        bleedHit:0,bleedT:0,bleedDmg:0,
        venomHit:0,venomT:0,venomDmg:0,
        slowT:0,slowMul:1,
        stunT:0,windup:0,poisonHit:0
      };
      fObj.mobRef=mobFish;
      Monsters.list.push(mobFish);
    }

    this.list.push(fObj);
  },
  despawn(i){
    const f=this.list[i];
    if(!f)return;
    if(f.mobRef&&typeof Monsters!=='undefined'&&Monsters.list){
      const mi=Monsters.list.indexOf(f.mobRef);
      if(mi>=0)Monsters.list.splice(mi,1);
    }
    Game.scene.remove(f.root);
    f.root.traverse(o=>{
      if(o.geometry&&o.geometry!==this._boxGeo)o.geometry.dispose();
      if(o.material&&o.material!==this._matVox)o.material.dispose();
    });
    this.list.splice(i,1);
  },
  clear(){
    for(let i=this.list.length-1;i>=0;i--){
      this.despawn(i);
    }
    this.list=[];
  },

  /* ---------- update: AI ikan hidup (boids, 3D diving, jump splash, predator attack) ---------- */
  update(dt){
    this.updateCatchFx(dt);
    this.timer-=dt;
    if(this.timer<=0){this.timer=2.4;this.spawn();}
    const t=performance.now()*0.001;

    for(let i=this.list.length-1;i>=0;i--){
      const f=this.list[i],d=f.def,p=f.parts,root=f.root,inner=f.inner;
      /* despawn bila jauh dari pemain */
      if(f.pos.distanceTo(Player.pos)>60){this.despawn(i);continue;}
      f.spawnT+=dt;
      root.scale.setScalar(f.k*PE.out(Math.min(f.spawnT/0.5,1)));

      /* pulsa glow bioluminescence (mata & garis leviathan, lentera) */
      if(p.glowMat){
        const gv=0.75+0.25*Math.sin(t*3.2+f.phase);
        p.glowMat.color.setRGB(gv,gv,gv);
      }

      /* flash merah saat terluka */
      if(f.flash>0){
        f.flash-=dt;
        root.traverse(o=>{if(o.material&&o.material.emissive)o.material.emissive.setHex(0xaa2222);});
      }else{
        root.traverse(o=>{if(o.material&&o.material.emissive)o.material.emissive.setHex(0x000000);});
      }

      /* sinkronkan status HP & flash dengan entitas mob predator */
      if(f.mobRef){
        f.hp=f.mobRef.hp;
        if(f.mobRef.flash>0)f.flash=f.mobRef.flash;
        if((f.hp<=0||f.mobRef.dead)&&!f.dead){
          f.dead=true;
          this.onFishKilled(f);
          this.despawn(i);
          continue;
        }
      }

      /* 1. KECERDASAN BUATAN PREDATOR (Leviathan, Todak, Lentera) */
      let target=null, targetDist=999;
      if(d.hostile&&!f.inAir){
        // 1. Cek foe dari threat (pemain/NPC/pet yang menyerang ikan dan berada di air)
        if(f.mobRef&&typeof Monsters!=='undefined'&&Monsters.pickFoe){
          Monsters.pickFoe(f.mobRef,dt);
        }
        const foe=(f.mobRef&&f.mobRef.foe)?f.mobRef.foe:(f.foe||null);
        if(foe&&!foe.dead&&this.isTargetInWater(foe)){
          const fd=Math.hypot(f.pos.x-foe.pos.x,f.pos.z-foe.pos.z);
          if(fd<=d.aggroR*1.4){
            target=foe;targetDist=fd;
          }
        }

        // 2. Jika tidak ada threat khusus, cari target terdekat: Player, rekan/penduduk NPC, atau Pet yang benar-benar di air
        if(!target){
          // Cek Player: Hanya jika pemain benar-benar di air laut
          const pInWater=this.isTargetInWater(Player)&&
                         (typeof WGEN!=='undefined'&&WGEN.biomeAt&&WGEN.biomeAt(Math.floor(Player.pos.x),Math.floor(Player.pos.z))===BIOME.OCEAN);
          const pDist=Math.hypot(f.pos.x-Player.pos.x,f.pos.z-Player.pos.z);
          if(pInWater&&pDist<=d.aggroR&&!Player.dead){
            target=Player;targetDist=pDist;
          }

          // Cek NPC di air
          if(typeof NPCS!=='undefined'&&NPCS.list){
            for(const n of NPCS.list){
              if(n.dead||!this.isTargetInWater(n))continue;
              const nd=Math.hypot(f.pos.x-n.pos.x,f.pos.z-n.pos.z);
              if(nd<=d.aggroR&&nd<targetDist){
                target=n;targetDist=nd;
              }
            }
          }

          // Cek Pet di air
          if(typeof Capture!=='undefined'&&Capture.pet&&!Capture.pet.dead&&this.isTargetInWater(Capture.pet)){
            const pet=Capture.pet;
            const petD=Math.hypot(f.pos.x-pet.pos.x,f.pos.z-pet.pos.z);
            if(petD<=d.aggroR&&petD<targetDist){
              target=pet;targetDist=petD;
            }
          }
        }
      }

      // Hitbox moncong/mulut ikan di depan badan searah visDir
      const mouthDist=(d.id==='leviathan')?4.2:((d.id==='todak')?2.2:1.4);
      const mouthX=f.pos.x+Math.sin(f.visDir)*mouthDist;
      const mouthZ=f.pos.z+Math.cos(f.visDir)*mouthDist;
      const mouthDistToTgt=target?Math.hypot(target.pos.x-mouthX,target.pos.z-mouthZ):999;
      const reachHitbox=(d.id==='leviathan')?2.8:((d.id==='todak')?1.8:1.5);
      const vertDist=target?Math.abs(f.pos.y-target.pos.y):999;
      const inHitbox=(mouthDistToTgt<=reachHitbox)&&(vertDist<=(d.id==='leviathan'?3.5:2.0));

      if(d.hostile&&target&&!f.inAir){
        const toTarget=Math.atan2(target.pos.x-f.pos.x,target.pos.z-f.pos.z);
        f.targetY=clamp(target.pos.y-0.25,f.minY,f.maxY);

        if(f.state==='glide_pass'){
          /* FASE 2: BERENANG SANGAT CEPAT MENEROBOS MELEWATI TARGET SETELAH MENGGIGIT */
          f.glideT=(f.glideT||0)-dt;
          f.burstBoost=(d.id==='todak')?4.6:(d.id==='leviathan'?3.8:3.2);
          // Haluan lurus mempertahankan garis luncur menerobos target
          if(f.glideT<=0){
            f.state='turn_reengage';
            f.turnReengageT=rand(0.9,1.4); // waktu berenang meliuk berputar
          }
        }else if(f.state==='turn_reengage'){
          /* FASE 3: BERENANG MELIUK BERPUTAR KEMBALI MENGARAH KE TARGET */
          f.turnReengageT=(f.turnReengageT||0)-dt;
          f.burstBoost=(d.id==='todak')?2.6:(d.id==='leviathan'?2.2:1.9);
          // Berputar meliuk mengitari air untuk mengunci target di belakang
          if(f.turnT<=0){
            f.dir=angLerp(f.dir,toTarget,dt*5.5);
          }
          let diffAng=Math.abs(f.dir-toTarget);
          if(diffAng>Math.PI)diffAng=Math.PI*2-diffAng;
          // Begitu haluan sudah berputar mengarah ke target (atau waktu habis), langsung tancap gas menyerang lagi!
          if(f.turnReengageT<=0||diffAng<0.45){
            f.state='chase';
          }
        }else{
          /* FASE 1: MENERJANG CEPAT KE ARAH TARGET & BERSIAP MENGGIGIT */
          f.state='chase';
          f.burstBoost=(d.id==='todak')?4.2:(d.id==='leviathan'?3.5:3.0);
          if(f.turnT<=0){
            f.dir=angLerp(f.dir,toTarget,dt*4.5);
          }

          // Animasi ancang-ancang rahang membuka saat mendekati target
          if(mouthDistToTgt<3.5){
            f.jawOpen=lerp(f.jawOpen||0,d.id==='leviathan'?0.85:0.65,clamp(dt*8,0,1));
          }else{
            f.jawOpen=lerp(f.jawOpen||0,0,clamp(dt*4,0,1));
          }

          // KETIKA MASUK JANGKAUAN GIGITAN: GIGIT SAMBIL BERENANG KENCANG MELEWATI TARGET!
          if(inHitbox){
            // 1. Serangan / Gigitan mengenai target
            if(target===Player){
              Player.takeDamage(d.dmg,new THREE.Vector3(mouthX,f.pos.y,mouthZ));
            }else if(target.role&&typeof NPCS!=='undefined'&&NPCS.hurt){
              NPCS.hurt(target,d.dmg,f.mobRef||null);
            }else if(target.pet&&typeof Capture!=='undefined'&&Capture.hurtPet){
              Capture.hurtPet(target,d.dmg);
            }

            // 2. Animasi gigitan mengatup tajam & efek partikel
            f.jawBiteT=0.35; // hentakan gigitan
            if(p.jaw)p.jaw.rotation.z=0.08;

            if(d.id==='todak'){
              if(typeof FX!=='undefined'&&FX.impact)
                FX.impact(target.pos.clone().add(new THREE.Vector3(0,0.8,0)),0x33507e,1.4);
              if(typeof Sfx!=='undefined'&&Sfx.at)Sfx.at(f.pos,'hit');
            }else if(d.id==='lentera'){
              if(typeof FX!=='undefined'&&FX.impact)
                FX.impact(target.pos.clone().add(new THREE.Vector3(0,0.8,0)),0x3ff2d7,1.5);
              if(typeof Sfx!=='undefined'&&Sfx.at)Sfx.at(f.pos,'hit');
            }else if(d.id==='leviathan'){
              const kb=new THREE.Vector3(target.pos.x-mouthX,0.45,target.pos.z-mouthZ).normalize().multiplyScalar(7.5);
              if(target===Player)Player.vel.add(kb);
              else if(target.vel)target.vel.add(kb);
              if(typeof FX!=='undefined'){
                if(FX.shockwave)FX.shockwave(mouthX,CFG.WATER_Y,mouthZ,0x38e1ff,5.0);
                if(FX.addShake)FX.addShake(0.6);
              }
              if(typeof Sfx!=='undefined'&&Sfx.splash)Sfx.splash(true);
              if(typeof Sfx!=='undefined'&&Sfx.at)Sfx.at(f.pos,'hit');
            }

            // 3. Ikan TIDAK BERHENTI! Langsung melesat kencang meluncur melewati target (glide-pass)!
            f.state='glide_pass';
            f.glideT=1.35; // meluncur tembus melewati target
            f.burstBoost=(d.id==='todak')?4.8:(d.id==='leviathan'?4.0:3.4);
          }
        }
      }else if(f.state==='chase'||f.state==='glide_pass'||f.state==='turn_reengage'){
        f.state='swim';
        f.burstBoost=1.0;
        f.jawOpen=0;
      }

      /* 2. KECERDASAN IKAN DAMAI: SCHOOLING (BOIDS) & KABUR DARI PEMANGSA/PEMAIN */
      if(!d.hostile&&!f.inAir){
        // Hindari pemain yang benar-benar berenang di air
        const pDist=Math.hypot(f.pos.x-Player.pos.x,f.pos.z-Player.pos.z);
        const pNear=this.isTargetInWater(Player)&&pDist<3.8;
        if(pNear){
          f.fleeTimer=2.8;
          f.dir=Math.atan2(f.pos.x-Player.pos.x,f.pos.z-Player.pos.z);
          f.targetY=f.minY; // menyelam ke dasar saat panik
        }
        // Hindari predator ikan buas
        for(let j=0;j<this.list.length;j++){
          const o=this.list[j];
          if(o.def.hostile&&Math.hypot(f.pos.x-o.pos.x,f.pos.z-o.pos.z)<5.0){
            f.fleeTimer=2.8;
            f.dir=Math.atan2(f.pos.x-o.pos.x,f.pos.z-o.pos.z);
            f.targetY=f.minY;
            break;
          }
        }
        // Flocking / Schooling antar sesama spesies
        if(f.fleeTimer<=0&&f.state==='swim'){
          let scCount=0,avgDir=0,scX=0,scZ=0;
          for(let j=0;j<this.list.length;j++){
            if(j===i)continue;
            const o=this.list[j];
            if(o.def.hostile)continue;
            const dist=Math.hypot(f.pos.x-o.pos.x,f.pos.z-o.pos.z);
            if(dist<1.3){
              f.dir=angLerp(f.dir,Math.atan2(f.pos.x-o.pos.x,f.pos.z-o.pos.z),dt*2.0); // separation
            }else if(dist<5.5&&o.def.id===d.id){
              avgDir+=o.dir;scX+=o.pos.x;scZ+=o.pos.z;scCount++; // alignment & cohesion
            }
          }
          if(scCount>0){
            avgDir/=scCount;scX/=scCount;scZ/=scCount;
            f.dir=angLerp(f.dir,avgDir,dt*0.8);
            f.dir=angLerp(f.dir,Math.atan2(scX-f.pos.x,scZ-f.pos.z),dt*0.5);
          }
        }
      }

      if(f.fleeTimer>0){
        f.fleeTimer-=dt;
        f.burstBoost=2.2;
      }

      /* 3. ANIMASI IDLE: LOMPAT KELUAR DARI DALAM AIR DENGAN EFEK CIPRATAN */
      if(f.state==='swim'&&!f.inAir){
        f.jumpTimer-=dt;
        if(f.jumpTimer<=0){
          if(f.pos.y>=CFG.WATER_Y-0.55){
            // Mulai melompat keluar air!
            f.inAir=true;
            f.jumpPrep=0;
            f.vy=rand(5.5,7.6);
            f.jumpVx=Math.sin(f.visDir)*f.speed*1.8;
            f.jumpVz=Math.cos(f.visDir)*f.speed*1.8;
            // Cipratan saat menerobos permukaan air
            if(typeof FX!=='undefined'){
              if(FX.ripple)FX.ripple(f.pos.x,CFG.WATER_Y,f.pos.z,0xbfe6f5,2.2);
              if(FX.debris)FX.debris(new THREE.Vector3(f.pos.x,CFG.WATER_Y,f.pos.z),0xdff2fa,8,2.2);
            }
            if(typeof Sfx!=='undefined'&&Sfx.splash)Sfx.splash(d.id==='leviathan');
          }else{
            // Berenang cepat menuju permukaan air untuk bersiap melompat
            f.targetY=CFG.WATER_Y-0.2;
            f.jumpPrep=(f.jumpPrep||0)+dt;
            if(f.jumpPrep>3.5){
              f.jumpTimer=rand(15,30);
              f.jumpPrep=0;
            }
          }
        }
      }

      if(f.inAir){
        // Fisika saat di udara
        f.pos.x+=f.jumpVx*dt;
        f.pos.z+=f.jumpVz*dt;
        f.pos.y+=f.vy*dt;
        f.vy-=18*dt; // gravitasi
        root.position.copy(f.pos);
        inner.rotation.x=Math.atan2(-f.vy,f.speed*1.8); // pitch mengikuti busur lompatan

        // Mendarat kembali ke air
        if(f.pos.y<=CFG.WATER_Y&&f.vy<0){
          if(typeof FX!=='undefined'){
            if(FX.ripple)FX.ripple(f.pos.x,CFG.WATER_Y,f.pos.z,0xbfe6f5,2.5);
            if(FX.debris)FX.debris(new THREE.Vector3(f.pos.x,CFG.WATER_Y,f.pos.z),0xdff2fa,10,2.5);
          }
          if(typeof Sfx!=='undefined'&&Sfx.splash)Sfx.splash(d.id==='leviathan');
          f.inAir=false;
          f.jumpTimer=rand(15,35);
          f.targetY=f.groundY+1.2; // menyelam kembali ke dalam air
        }
      }

      /* 4. RENANG 3D DI DALAM AIR (RENTANG HINGGA 4 BLOK) & KEMUDI HALUS */
      if(!f.inAir){
        // Update kontur dasar laut setempat agar tidak tenggelam di pasir saat dasar laut naik
        const curGh=(typeof WGEN!=='undefined'&&WGEN.height)?WGEN.height(Math.floor(f.pos.x),Math.floor(f.pos.z)):1;
        f.groundY=curGh;
        f.minY=curGh+0.45;
        f.maxY=CFG.WATER_Y-0.25;

        // Pergantian kedalaman renang acak berkala (3D cruise)
        f.depthTimer-=dt;
        if(f.depthTimer<=0){
          f.depthTimer=rand(3.2,6.5);
          if(d.id==='lele'||d.id==='lentera')f.targetY=rand(f.minY,f.minY+1.2);
          else if(d.id==='teri'||d.id==='badut')f.targetY=rand(f.minY+1.8,f.maxY);
          else f.targetY=rand(f.minY+0.6,f.maxY);
        }
        // Naik-turun halus vertikal
        f.vy+=(f.targetY-f.pos.y)*2.2*dt-f.vy*0.9*dt;
        f.pos.y+=f.vy*dt;
        f.pos.y=clamp(f.pos.y,f.minY,f.maxY);
        inner.rotation.x=clamp(-f.vy*0.18,-0.4,0.4);

        // Kemudi haluan & deteksi batas perairan bebas
        f.turnT-=dt;
        const look=1.5;
        const fx=f.pos.x+Math.sin(f.dir)*look,fz=f.pos.z+Math.cos(f.dir)*look;
        if(!this.canSwim(fx,f.pos.y,fz)){
          let turned=false;
          for(const off of[0.6,-0.6,1.2,-1.2,1.8,-1.8,Math.PI]){
            const a=f.dir+off;
            const ax=f.pos.x+Math.sin(a)*look,az=f.pos.z+Math.cos(a)*look;
            if(this.canSwim(ax,f.pos.y,az)){f.dir=a;turned=true;break;}
          }
          if(!turned)f.dir+=Math.PI;
          f.turnT=0.6;
        }else if(f.turnT<=0&&f.state!=='chase'){
          f.turnT=rand(1.8,3.5);
          f.dir+=rand(-0.4,0.4);
        }

        f.visDir=angLerp(f.visDir,f.dir,Math.min(1,dt*4.5));

        // Kecepatan renang: Saat menyerang atau kabur berenang sangat kencang
        const isFastSwim=(f.state==='chase'||f.state==='glide_pass'||f.state==='turn_reengage'||f.fleeTimer>0);
        const burst=isFastSwim
          ?(f.burstBoost||2.6)
          :(0.75+0.45*Math.sin(t*1.2+f.phase*2.3));
        const moveSpd=f.speed*Math.max(0.4,burst)*dt;

        const stepX=Math.sin(f.visDir)*moveSpd;
        const stepZ=Math.cos(f.visDir)*moveSpd;
        const nx=f.pos.x+stepX;
        const nz=f.pos.z+stepZ;

        if(moveSpd>0.0001){
          if(this.canSwim(nx,f.pos.y,nz)){
            f.pos.x=nx;
            f.pos.z=nz;
          }else{
            // Axis sliding navigasi jika salah satu sumbu bebas di perairan
            if(this.canSwim(nx,f.pos.y,f.pos.z)) f.pos.x=nx;
            else if(this.canSwim(f.pos.x,f.pos.y,nz)) f.pos.z=nz;
            else f.dir+=Math.PI*0.5; // belok jika benar-benar terperangkap sudut
          }
        }

        if(f.mobRef){
          f.mobRef.pos.copy(f.pos);
          f.mobRef.state=f.state;
        }

        root.position.copy(f.pos);
        root.rotation.y=f.visDir-Math.PI/2;
      }

      /* 5. ANIMASI ORGAN & SIRIP IKAN */
      const isFastSwim=(f.state==='chase'||f.state==='glide_pass'||f.state==='turn_reengage'||f.fleeTimer>0);
      const wagSpd=d.wagSpd*(isFastSwim?2.8:1.0);
      const wig=Math.sin(t*wagSpd+f.phase);
      const wigTail=Math.sin(t*wagSpd+f.phase-0.9);
      inner.rotation.y=wig*0.12;
      inner.rotation.z=Math.sin(t*2.2+f.phase)*0.06;

      if(p.tail)p.tail.rotation.y=wigTail*(d.wagAmp||0.45);
      if(p.tail2)p.tail2.rotation.y=Math.sin(t*wagSpd*0.9-1.8)*(d.wagAmp||0.45)*1.5; // ekor serpent Leviathan!
      const fl=Math.sin(t*(d.finSpd||10)*(isFastSwim?2.2:1.0)+f.phase)*0.45+0.12;
      if(p.finR)p.finR.rotation.x=fl;
      if(p.finL)p.finL.rotation.x=-fl;

      // Animasi gerak rahang (membuka saat mengincar mangsa, mengatup kuat saat menggigit, bernapas saat santai)
      if(p.jaw){
        if(f.jawBiteT>0){
          f.jawBiteT-=dt;
          p.jaw.rotation.z=0.08+Math.sin(f.jawBiteT*20)*0.05; // mengatup kuat saat gigitan mengenai target
        }else if(f.jawOpen>0.05){
          p.jaw.rotation.z=f.jawOpen; // membuka lebar saat hendak melahap mangsa
        }else{
          p.jaw.rotation.z=f.jawBase+Math.sin(t*1.8)*0.04; // bernapas santai
        }
      }
    }
  },

  /* ---------- ditangkap / diserang oleh pemain ----------
     Sesuai patch: ikan siluet / ikan berenang tidak bisa dipukul langsung dengan serangan */
  checkHit(reach,facing){
    return false;
  },

  /* ---------- penanganan kematian ikan & sistem drop ---------- */
  onFishKilled(f){
    const pos=f.pos.clone();
    /* Ikan yang berenang tidak drop ikan segar saat dibunuh (harus dipancing dengan alat pancing) */

    // 1. Sisik ikan (fish_scale)
    const minSc=(f.def.dropScale&&f.def.dropScale[0])||1;
    const maxSc=(f.def.dropScale&&f.def.dropScale[1])||2;
    const scaleCount=Math.floor(rand(minSc,maxSc+1));
    World.dropItem(pos.x,pos.y+0.4,pos.z,'fish_scale',scaleCount);

    // 3. Sisik ikan emas (golden_fish_scale) - HANYA DARI LEVIATHAN DENGAN CHANCE 10%
    if(f.def.id==='leviathan'&&Math.random()<0.10){
      World.dropItem(pos.x,pos.y+0.6,pos.z,'golden_fish_scale',1);
      if(typeof FX!=='undefined'&&FX.text)
        FX.text(pos.clone().add(new THREE.Vector3(0,1.6,0)),'✨ Sisik Ikan Emas! (10%)','#ffd700');
      if(typeof UI!=='undefined'&&UI.toast)
        UI.toast('✨ Mendapatkan Sisik Ikan Emas langka dari Leviathan!');
    }

    /* Leviathan TIDAK lagi menjatuhkan inti boss — inti boss hanya dari
       mob biasa 7%, mini boss 10%, peti boss dungeon 12%, dan boss altar 50%. */

    if(typeof FX!=='undefined'){
      if(FX.debris)FX.debris(pos,0x8fd8ff,12,3.0);
      if(FX.text)FX.text(pos.clone().add(new THREE.Vector3(0,1.0,0)),`🐟 ${f.def.name}!`,'#8fe0ff');
    }
    if(typeof Player!=='undefined'&&Player.addXP)
      Player.addXP(f.def.xp||15);
  },

  /* efek ikan melompat saat ditangkap */
  catchFx:[],
  showCatch(def,pos){
    try{
      const b=this.buildFish(def);
      b.root.position.copy(pos);
      b.root.scale.setScalar(b.k);
      Game.scene.add(b.root);
      this.catchFx.push({root:b.root,t:0,vy:3.2,def});
    }catch(e){}
  },
  updateCatchFx(dt){
    for(let i=this.catchFx.length-1;i>=0;i--){
      const c=this.catchFx[i];
      c.t+=dt;
      c.vy-=9*dt;
      c.root.position.y+=c.vy*dt;
      c.root.rotation.y+=dt*3;
      const k=Math.max(0.001,1-c.t/1.1);
      c.root.scale.setScalar((this.V*c.def.scale)*(0.6+0.4*k));
      if(c.t>=1.1){
        Game.scene.remove(c.root);
        c.root.traverse(o=>{if(o.geometry&&o.geometry!==this._boxGeo)o.geometry.dispose();});
        this.catchFx.splice(i,1);
      }
    }
  },
};

/* ===========================================================================
   5. SKILLSPORT — skill & animasi pose NPC sesuai prototipe NEW MODEL
   ---------------------------------------------------------------------------
   Dipanggil dari npc.js:
     - SkillsPort.combat(n,dt)  di aiFight → logika skill & serangan khusus;
       mengembalikan true bila aiFight bawaan harus dilewati.
     - SkillsPort.onMeleeHit(n) → visual hit khusus (slash arc raksasa).
     - SkillsPort.animate(n,dt) di NPCS.animate → pose penuh elf/giant/kelinci
       (menggantikan animasi generik supaya sama persis dengan prototipe).
   =========================================================================== */
const SkillsPort={
  /* ---------------------------------------------------------------------
     Dispatcher tipis. Logika combat & animasi elf/giant/rabbit kini tinggal
     di file entitas masing-masing (js/entities/npc_elfmage.js,
     npc_stonegiant.js, npc_rabbitwarrior.js). SkillsPort hanya meneruskan
     panggilan dari npc.js (aiFight / onMeleeHit) dan PortFX (shard/meteor).
     --------------------------------------------------------------------- */
  poseKinds:{elf:1,giant:1,rabbit:1,goblin:1,lion:1,magesupport:1,royalguard:1,lich:1},
  _ent(n){
    const kind=n.parts.rare&&n.parts.rare.kind;
    if(kind==='elf')return window.NPC_Elfmage;
    if(kind==='giant')return window.NPC_Stonegiant;
    if(kind==='rabbit')return window.NPC_Rabbitwarrior;
    if(kind==='goblin')return window.NPC_Goblin;
    if(kind==='lion')return window.NPC_Lionknight;
    if(kind==='magesupport')return window.NPC_Magesupport;
    if(kind==='royalguard')return window.NPC_Royalguard;
    if(kind==='lich')return window.NPC_Lich;
    return null;
  },
  combat(n,dt){const e=this._ent(n);return e&&e.combat?e.combat(n,dt):false;},
  animate(n,dt){const e=this._ent(n);if(e&&e.animate)e.animate(n,dt);},
  onMeleeHit(n){const e=this._ent(n);if(e&&e.onMeleeHit)e.onMeleeHit(n);},
  onShardLand(x,y,z){const e=window.NPC_Elfmage;if(e&&e.onShardLand)e.onShardLand(x,y,z);},
  onMeteorLand(x,y,z){const e=window.NPC_Elfmage;if(e&&e.onMeteorLand)e.onMeteorLand(x,y,z);},
};
/* damage NPC aman (helper global) */
function npcDmgSafe(n){return NPCS.npcDmg(n);}
