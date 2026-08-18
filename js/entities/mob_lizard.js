'use strict';
/* =============================================================================
   ENTITAS MOB: LIZARD / KADAL RAWA (🦎)
   -----------------------------------------------------------------------------
   Predator tepi sungai. Model & animasi dipotong dari "NEW MODEL/Lizard.html"
   (voxel): loco idle/walk/run + serangan GIGIT (bite), SAPUAN EKOR (tail spin
   360°), dan ASAM (semburan proyektil dari mulut). Hanya muncul di tepi sungai
   (lihat Monsters.spawnLizard di monsters.js).
   Dipanggil Monsters.make() & Monsters.animate() lewat window.Mob_Lizard.
   ============================================================================= */

const Mob_Lizard={

  /* palet warna persis Lizard.html */
  C:{skin:0x4e8f3a,skin2:0x69a94b,dark:0x33682a,belly:0xc9dfa0,
     spike:0x2c5a22,claw:0xece7d8,tooth:0xf6f3e7,
     eye:0xff4b2e,pupil:0x140f0c,tongue:0xd9503f,tongue2:0xb53a2e},

  /* skala keseluruhan model. Dikecilkan 0.42→0.23 supaya tinggi lizard
     (~1.1 blok) seukuran babi hutan, bukan raksasa 2 blok lagi. */
  SCALE:0.23,

  /* material di-cache PER-BUILD (reset di awal build) supaya voxel sewarna
     dalam satu lizard berbagi material, tapi antar lizard terpisah — dengan
     begitu flash-hit satu lizard tidak menular ke lizard lain. */
  mat(c){
    if(!this._buildMats)this._buildMats={};
    if(!this._buildMats[c])this._buildMats[c]=new THREE.MeshLambertMaterial({color:c});
    return this._buildMats[c];
  },
  /* tambahkan sekumpulan voxel [x,y,z,w,h,d,color,rx,ry,rz] ke parent */
  vox(parent,list){
    for(const v of list){
      const m=new THREE.Mesh(new THREE.BoxGeometry(v[3],v[4],v[5]),this.mat(v[6]));
      m.position.set(v[0],v[1],v[2]);
      if(v[7]||v[8]||v[9])m.rotation.set(v[7]||0,v[8]||0,v[9]||0);
      m.castShadow=!IS_MOBILE;
      parent.add(m);
    }
  },

  /* ---------- MODEL 3D ---------- */
  build(boss){
    this._buildMats={};                    // cache material segar per lizard
    const g=new THREE.Group();const parts={};
    g.scale.setScalar(this.SCALE);
    const C=this.C;
    const D=Math.PI/4;

    const root=new THREE.Group();g.add(root);parts.root=root;
    const body=new THREE.Group();root.add(body);parts.body=body;

    /* ---- torso ---- */
    const T=[
      [0,3.1,1.6, 4,2.6,4.2, C.skin],
      [0,3.0,-0.9, 3.7,2.4,2.8, C.skin],
      [0,3.0,-2.6, 3.9,2.4,2.6, C.skin],
      [0,4.35,1.2, 3.2,0.5,3.6, C.skin2],
      [0,1.95,0.6, 3.1,0.55,5.4, C.belly],
      [0,2.15,3.05, 2.6,0.9,0.8, C.belly],
      [2.03,3.3,1.2, 0.35,0.7,2.6, C.dark],
      [-2.03,3.3,1.2, 0.35,0.7,2.6, C.dark],
      [2.0,2.9,-2.2, 0.35,0.6,1.8, C.dark],
      [-2.0,2.9,-2.2, 0.35,0.6,1.8, C.dark],
      [1.75,4.35,2.6, 1.2,0.55,1.5, C.dark],
      [-1.75,4.35,2.6, 1.2,0.55,1.5, C.dark],
      [1.85,4.3,-2.4, 1.25,0.55,1.6, C.dark],
      [-1.85,4.3,-2.4, 1.25,0.55,1.6, C.dark],
      [0.9,4.52,2.2, 0.7,0.3,0.7, C.dark],
      [-1.2,4.52,0.4, 0.7,0.3,0.7, C.dark],
      [0.3,4.52,-1.4, 0.7,0.3,0.7, C.dark],
      [-0.7,4.52,3.0, 0.7,0.3,0.7, C.dark],
      [1.4,4.52,-0.2, 0.7,0.3,0.7, C.dark],
      [0,4.75,2.8, 0.55,0.55,0.8, C.spike,0,0,D],
      [0,4.75,1.62, 0.55,0.55,0.8, C.spike,0,0,D],
      [0,4.75,0.44, 0.55,0.55,0.8, C.spike,0,0,D],
      [0,4.75,-0.74, 0.55,0.55,0.8, C.spike,0,0,D],
      [0,4.75,-1.92, 0.55,0.55,0.8, C.spike,0,0,D],
      [0,4.75,-3.1, 0.55,0.55,0.8, C.spike,0,0,D],
    ];
    this.vox(body,T);

    /* ---- kepala ---- */
    const head=new THREE.Group();head.position.set(0,3.55,3.2);body.add(head);parts.head=head;
    const H=[
      [0,-0.15,-0.9, 2.7,2.3,1.8, C.skin],
      [0,0.25,0.5, 3.0,2.3,2.9, C.skin],
      [0,-0.1,2.3, 2.3,1.55,2.2, C.skin],
      [0,-0.05,3.35, 1.7,1.25,1.1, C.skin2],
      [0,1.25,0.4, 2.2,0.45,2.2, C.skin2],
      [1.15,0.95,1.55, 0.85,0.5,1.3, C.dark],
      [-1.15,0.95,1.55, 0.85,0.5,1.3, C.dark],
      [1.53,0.45,1.6, 0.28,0.75,1.05, C.eye],
      [-1.53,0.45,1.6, 0.28,0.75,1.05, C.eye],
      [1.63,0.45,1.75, 0.14,0.5,0.32, C.pupil],
      [-1.63,0.45,1.75, 0.14,0.5,0.32, C.pupil],
      [0.5,0.42,3.7, 0.28,0.24,0.3, C.dark],
      [-0.5,0.42,3.7, 0.28,0.24,0.3, C.dark],
      [0.95,1.35,-1.15, 0.8,0.75,0.85, C.spike],
      [-0.95,1.35,-1.15, 0.8,0.75,0.85, C.spike],
      [1.05,1.95,-1.55, 0.6,0.65,0.7, C.spike],
      [-1.05,1.95,-1.55, 0.6,0.65,0.7, C.spike],
      [1.15,2.45,-1.9, 0.42,0.5,0.55, C.spike],
      [-1.15,2.45,-1.9, 0.42,0.5,0.55, C.spike],
      [1.35,0.0,-0.1, 0.55,1.0,1.0, C.skin2],
      [-1.35,0.0,-0.1, 0.55,1.0,1.0, C.skin2],
      [1.1,-0.72,1.5, 0.3,0.42,0.36, C.tooth],
      [-1.1,-0.72,1.5, 0.3,0.42,0.36, C.tooth],
      [1.1,-0.72,2.2, 0.3,0.42,0.36, C.tooth],
      [-1.1,-0.72,2.2, 0.3,0.42,0.36, C.tooth],
      [1.1,-0.72,2.9, 0.3,0.42,0.36, C.tooth],
      [-1.1,-0.72,2.9, 0.3,0.42,0.36, C.tooth],
      [0.62,-0.78,3.15, 0.32,0.5,0.34, C.tooth],
      [-0.62,-0.78,3.15, 0.32,0.5,0.34, C.tooth],
      [0,0.85,2.9, 0.5,0.5,0.6, C.spike,0,0,D],
    ];
    this.vox(head,H);

    /* ---- rahang bawah ---- */
    const jaw=new THREE.Group();jaw.position.set(0,-0.9,0.2);head.add(jaw);parts.jaw=jaw;
    const J=[
      [0,-0.25,1.5, 2.5,0.75,3.1, C.skin],
      [0,-0.18,3.2, 1.9,0.65,0.9, C.skin2],
      [0,-0.52,1.2, 2.0,0.4,2.6, C.dark],
      [1.2,-0.1,-0.2, 0.5,0.7,0.9, C.skin2],
      [-1.2,-0.1,-0.2, 0.5,0.7,0.9, C.skin2],
      [0.75,0.4,3.05, 0.34,0.6,0.36, C.tooth],
      [-0.75,0.4,3.05, 0.34,0.6,0.36, C.tooth],
    ];
    for(const x of[-0.95,-0.48,0.48,0.95])
      for(const z of[0.75,1.35,1.95,2.55])
        J.push([x,0.28,z, 0.26,0.42,0.3, C.tooth]);
    this.vox(jaw,J);

    /* ---- lidah ---- */
    const tongueG=new THREE.Group();tongueG.position.set(0,0.22,0.9);jaw.add(tongueG);parts.tongue=tongueG;
    this.vox(tongueG,[
      [0,0,0.6, 0.6,0.15,1.2, C.tongue],
      [0,0,1.28, 0.42,0.12,0.35, C.tongue2],
    ]);
    tongueG.visible=false;

    /* ---- anchor mulut (titik keluar proyektil asam) ---- */
    const mouth=new THREE.Object3D();mouth.position.set(0,-0.6,3.95);head.add(mouth);parts.mouth=mouth;

    /* ---- glow mulut (asam charge) ---- */
    const glow=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.9,0.9),
      new THREE.MeshBasicMaterial({color:0x7be03a,transparent:true,opacity:0}));
    glow.position.set(0,-0.55,3.5);head.add(glow);parts.glow=glow;

    /* ---- 4 kaki: hip → knee → foot ---- */
    const legPart=()=>{
      const hip=new THREE.Group(),knee=new THREE.Group(),foot=new THREE.Group();
      this.vox(hip,[
        [0,-0.8,0, 1.5,1.7,1.7, C.skin],
        [0,-1.4,0.1, 1.25,0.8,1.4, C.skin2],
        [0,-1.6,0.55, 1.0,0.55,0.55, C.dark],
      ]);
      this.vox(knee,[
        [0,-0.45,0, 1.1,1.0,1.15, C.skin],
        [0,-0.95,0.02, 0.95,0.5,1.0, C.dark],
      ]);
      const F=[[0,-0.1,0.3, 1.4,0.5,1.7, C.skin]];
      for(const x of[-0.48,0,0.48]){
        F.push([x,-0.1,1.3, 0.42,0.42,0.8, C.skin2]);
        F.push([x,-0.06,1.82, 0.24,0.3,0.55, C.claw]);
      }
      this.vox(foot,F);
      knee.position.set(0,-1.6,0);knee.add(foot);
      foot.position.set(0,-1.0,0.05);
      hip.add(knee);
      return {hip,knee,foot};
    };
    parts.legs=[];
    const legDefs=[
      {x:2.0,z:2.35,side:1,off:Math.PI},
      {x:-2.0,z:2.35,side:-1,off:0},
      {x:2.25,z:-2.4,side:1,off:0},
      {x:-2.25,z:-2.4,side:-1,off:Math.PI},
    ];
    for(const d of legDefs){
      const p=legPart();
      p.hip.position.set(d.x,3.0,d.z);
      p.hip.rotation.z=d.side*0.12;
      p.foot.rotation.y=d.side*0.15;
      body.add(p.hip);
      parts.legs.push({hip:p.hip,knee:p.knee,side:d.side,off:d.off});
    }

    /* ---- ekor 3 segmen berantai ---- */
    const tailRoot=new THREE.Group();tailRoot.position.set(0,3.1,-3.7);body.add(tailRoot);
    const S1=[
      [0,0.1,0.3, 3.0,2.3,1.2, C.skin],
      [0,-0.15,-1.5, 2.7,2.0,3.1, C.skin],
      [0,0.8,-1.4, 1.9,0.4,2.6, C.skin2],
      [0,1.15,-0.8, 0.5,0.5,0.7, C.spike,0,0,D],
      [0,1.05,-2.2, 0.45,0.45,0.6, C.spike,0,0,D],
      [1.38,0.0,-1.2, 0.3,0.5,1.4, C.dark],
      [-1.38,0.0,-1.2, 0.3,0.5,1.4, C.dark],
    ];
    const S2=[
      [0,-0.05,-1.35, 1.8,1.5,2.8, C.skin],
      [0,0.62,-1.2, 1.2,0.3,2.2, C.skin2],
      [0,0.85,-1.2, 0.4,0.4,0.55, C.spike,0,0,D],
      [0,-0.55,-1.3, 1.3,0.35,2.2, C.dark],
    ];
    const S3=[
      [0,0,-1.1, 1.15,1.05,2.3, C.skin],
      [0,0.02,-2.45, 0.7,0.7,1.1, C.skin2],
      [0,0.65,-0.9, 0.32,0.32,0.45, C.spike,0,0,D],
      [0,0.03,-3.1, 0.4,0.4,0.5, C.dark],
    ];
    const seg1=new THREE.Group();this.vox(seg1,S1);tailRoot.add(seg1);
    const seg2=new THREE.Group();seg2.position.set(0,-0.35,-3.0);this.vox(seg2,S2);seg1.add(seg2);
    const seg3=new THREE.Group();seg3.position.set(0,-0.35,-2.7);this.vox(seg3,S3);seg2.add(seg3);
    parts.tail=[seg1,seg2,seg3];

    return {mesh:g,parts};
  },

  /* =========================================================================
     ANIMASI — state loco (idle/walk/run) + serangan (bite/tail/acid).
     Timer serangan diset monsters.js: m.biteT, m.tailT, m.acidT.
     ========================================================================= */
  easeO(t){return 1-Math.pow(1-clamp(t,0,1),3);},
  easeIO(t){t=clamp(t,0,1);return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;},

  DUR:{bite:0.62,tail:1.2,acid:1.05},

  /* state animasi per-lizard */
  lizState(){return {phase:0,ampW:0,ampR:0,time:0,atk:null,atkT:0,spin:0};},

  animate(m,dt){
    if(!m.liz)m.liz=this.lizState();
    const L=m.liz;
    L.time+=dt;

    /* decrement timer serangan (diset monsters.js saat menyerang) */
    if((m.biteT||0)>0)m.biteT=Math.max(0,m.biteT-dt);
    if((m.tailT||0)>0)m.tailT=Math.max(0,m.tailT-dt);
    if((m.acidT||0)>0)m.acidT=Math.max(0,m.acidT-dt);

    /* flash merah saat terluka */
    const em=m.flash>0?0xaa2222:0x000000;
    m.mesh.traverse(o=>{if(o.material&&o.material.emissive)o.material.emissive.setHex(em);});

    /* tentukan serangan aktif */
    let atk=null;
    if((m.biteT||0)>0)atk='bite';
    else if((m.tailT||0)>0)atk='tail';
    else if((m.acidT||0)>0)atk='acid';

    /* kecepatan gerak → amplitudo loco */
    const sp=Math.hypot(m.vel.x,m.vel.z);
    const tW=(sp>0.4&&sp<=3.4)?1:0, tR=sp>3.4?1:0;
    L.ampW+=(tW-L.ampW)*Math.min(1,dt*5);
    L.ampR+=(tR-L.ampR)*Math.min(1,dt*4);
    const gm=Math.min(1,L.ampW+L.ampR);
    /* fase langkah sinkron jarak (anti foot-sliding) */
    const stride=2.6;
    if(gm>0.05)L.phase+=(sp*dt/stride)*Math.PI*2;

    /* reset pose channel */
    const A={jaw:0,headP:0,headZ:0,rootZ:0,bodyP:0,crouch:0,glow:0,tc:[0,0,0],spin:0};

    /* ---- timeline serangan ---- */
    if(atk){
      if(L.atk!==atk){L.atk=atk;L.atkT=0;}
      L.atkT+=dt;
      const d=this.DUR[atk],p=L.atkT/d;
      if(p>=1){L.atk=null;L.atkT=0;}
      else if(atk==='bite'){
        if(p<0.32){const k=this.easeO(p/0.32);
          A.jaw=1.15*k;A.headP=-0.16*k;A.rootZ=-0.18*k;A.bodyP=-0.05*k;}
        else if(p<0.46){const k=(p-0.32)/0.14,e=k*k;
          A.jaw=1.15*(1-e);A.headP=-0.16+0.55*e;A.rootZ=-0.18+0.85*e;A.bodyP=-0.05+0.22*e;}
        else{const k=this.easeO((p-0.46)/0.54);
          A.jaw=0.12*(1-k);A.headP=0.39*(1-k);A.rootZ=0.67*(1-k);A.bodyP=0.17*(1-k);}
      }
      else if(atk==='tail'){
        if(p<0.16){const k=this.easeO(p/0.16);
          A.crouch=k;A.bodyP=-0.08*k;A.tc=[k*1.15,k*1.35,k*1.5];}
        else if(p<0.82){const k=(p-0.16)/0.66,e=this.easeIO(k);
          A.spin=e*Math.PI*2;A.crouch=1;
          for(let i=0;i<3;i++){const ei=this.easeIO(clamp(k*1.25-i*0.12,0,1));
            A.tc[i]=(1.15+i*0.2)*(1-ei)-0.1*ei;}}
        else{const k=this.easeO((p-0.82)/0.18);
          A.crouch=1-k;A.spin=Math.PI*2;}
      }
      else{ /* acid */
        if(p<0.3){const k=this.easeO(p/0.3);
          A.jaw=1.25*k;A.headP=-0.3*k;A.bodyP=-0.2*k;A.rootZ=-0.25*k;A.glow=k;A.crouch=0.15*k;}
        else if(p<0.5){const k=(p-0.3)/0.2,e=k*k;
          A.headP=-0.3+0.75*e;A.bodyP=-0.2+0.35*e;A.rootZ=-0.25+0.6*e;
          A.jaw=1.25-0.35*e;A.glow=1-k;
          if(!m._acidFired){m._acidFired=true;this.acidBurst(m);}}
        else{const k=this.easeO((p-0.5)/0.5);
          A.headP=0.45*(1-k);A.bodyP=0.15*(1-k);A.rootZ=0.35*(1-k);A.jaw=0.9*(1-k);A.glow=0;}
      }
    }else{
      L.atk=null;L.atkT=0;m._acidFired=false;
      /* idle jaw buka-tutup halus + lidah menjulur */
      A.jaw=0.03+0.04*Math.max(0,Math.sin(L.time*0.7));
    }

    /* ---- terapkan pose ---- */
    const P=m.parts;
    const ampSwing=0.55*L.ampW+0.95*L.ampR;
    const ampKnee=0.5*L.ampW+0.95*L.ampR;
    const bob=Math.sin(L.phase*2)*0.09*L.ampW+Math.abs(Math.sin(L.phase))*0.24*L.ampR;

    /* spin tail attack diputar di root (bagian dalam) agar tidak mengganggu
       rotation.y outer (arah hadap yang diatur monsters.js) */
    P.root.rotation.y=A.spin;
    P.root.position.z=A.rootZ;
    P.body.position.y=-A.crouch*0.5+bob;
    P.body.rotation.x=A.bodyP+0.1*L.ampR+Math.sin(L.phase*2+1.2)*0.03*L.ampW;
    P.body.rotation.y=Math.sin(L.phase)*0.045*L.ampW;
    P.body.rotation.z=Math.sin(L.phase)*0.05*(L.ampW+0.6*L.ampR);

    P.head.position.set(0,3.55,3.2+A.headZ);
    P.head.rotation.x=A.headP+Math.sin(L.phase*2+0.5)*0.05*gm
                     +Math.sin(L.time*1.3)*0.035*(1-gm);
    P.jaw.rotation.x=A.jaw+L.ampR*0.1*(0.6+0.4*Math.sin(L.time*10));

    for(const leg of P.legs){
      const sw=Math.sin(L.phase+leg.off);
      const lift=Math.max(0,Math.sin(L.phase+leg.off+1.15));
      leg.hip.rotation.x=-sw*ampSwing+A.crouch*0.55;
      leg.hip.rotation.z=leg.side*0.12+sw*0.04;
      leg.knee.rotation.x=lift*ampKnee+A.crouch*0.95;
    }
    for(let i=0;i<3;i++){
      const idleSway=Math.sin(L.time*1.4+i*0.9)*0.09*(1-gm*0.55);
      const gaitSway=Math.sin(L.phase+i*0.75)*(0.14*L.ampW+0.09*L.ampR);
      P.tail[i].rotation.y=A.tc[i]+idleSway+gaitSway;
      P.tail[i].rotation.x=[0.05,-0.06,-0.1][i]*(1-L.ampR*0.6);
    }
    /* glow asam */
    const gs=A.glow*(1.6+Math.sin(L.time*22)*0.25);
    P.glow.scale.setScalar(Math.max(0.001,gs));
    P.glow.material.opacity=Math.min(1,A.glow*0.9);
    /* lidah menjulur sesaat */
    let tong=0;
    if(atk==='acid'&&A.jaw>0.3)tong=1.1;
    else{
      m._tongT=(m._tongT||2)-dt;
      if(m._tongT<=0){m._tongT=2.2+Math.random()*2.8;m._flick=0.5;}
      if((m._flick||0)>0){m._flick-=dt;
        tong=Math.sin(Math.PI*clamp(1-m._flick/0.5,0,1))*1.7;}
    }
    P.tongue.scale.z=Math.max(0.001,tong);
    P.tongue.visible=tong>0.01;
  },

  /* =========================================================================
     PROYEKTIL ASAM — pool global, di-update sekali per frame.
     ========================================================================= */
  ACID_MAX:60,_acid:null,_acidMeshes:null,_acidLast:-1,
  acidInit(){
    if(this._acid)return;
    this._acid=[];this._acidMeshes=[];
    const scene=(typeof Game!=='undefined'&&Game.scene)?Game.scene:null;
    for(let i=0;i<this.ACID_MAX;i++){
      this._acid.push({life:0,dmg:6,pos:new THREE.Vector3(),vel:new THREE.Vector3(),hit:false});
      const mm=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.34,0.34),
        new THREE.MeshBasicMaterial({color:0x74ef3a,transparent:true,opacity:0.95,
          blending:THREE.AdditiveBlending,depthWrite:false}));
      mm.visible=false;
      if(scene)scene.add(mm);
      this._acidMeshes.push(mm);
    }
  },
  /* semburkan proyektil asam dari mulut lizard ke arah pemain */
  acidBurst(m){
    this.acidInit();
    const mouth=new THREE.Vector3();
    if(m.parts&&m.parts.mouth)m.parts.mouth.getWorldPosition(mouth);
    else mouth.copy(m.pos).add(new THREE.Vector3(0,1.5,0));
    /* arah ke pemain (dengan sedikit sebaran) */
    const toP=new THREE.Vector3().subVectors(Player.pos,m.pos);
    toP.normalize();
    let spawned=0;
    for(let i=0;i<this.ACID_MAX&&spawned<8;i++){
      const a=this._acid[i];
      if(a.life>0)continue;
      a.life=1.4;a.hit=false;a.dmg=Math.max(3,Math.round(m.dmg*0.5));
      a.pos.copy(mouth);
      const dir=toP.clone();
      dir.x+=(Math.random()-0.5)*0.3;
      dir.y+=(Math.random()-0.5)*0.2+0.15;
      dir.z+=(Math.random()-0.5)*0.3;
      dir.normalize();
      a.vel.copy(dir).multiplyScalar(9+Math.random()*4);
      spawned++;
    }
    Sfx.at(m.pos,'cast');
  },
  /* update semua proyektil asam — dipanggil SEKALI per frame dari Monsters.update */
  updateAcid(dt){
    this.acidInit();
    for(let i=0;i<this.ACID_MAX;i++){
      const a=this._acid[i],mm=this._acidMeshes[i];
      if(a.life>0){
        a.life-=dt;
        a.vel.y-=14*dt;
        a.pos.addScaledVector(a.vel,dt);
        /* kena pemain? */
        if(!a.hit&&!Player.dead&&a.pos.distanceTo(Player.pos.clone().add(new THREE.Vector3(0,0.9,0)))<1.0){
          a.hit=true;a.life=0;
          Player.takeDamage(a.dmg,null);
          FX.debris(Player.pos.clone().add(new THREE.Vector3(0,1,0)),0x74ef3a,6,2.2);
          FX.text(Player.pos.clone().add(new THREE.Vector3(0,2.2,0)),'☠ asam','#7be05a');
        }
        if(a.pos.y<0.15)a.life=0;
        if(a.life>0){
          mm.visible=true;
          mm.position.copy(a.pos);
          mm.material.opacity=Math.min(1,a.life)*0.95;
        }else mm.visible=false;
      }else mm.visible=false;
    }
  },
};
window.Mob_Lizard=Mob_Lizard;
