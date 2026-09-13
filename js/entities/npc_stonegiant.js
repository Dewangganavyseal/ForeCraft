'use strict';
/* =============================================================================
   ENTITAS NPC: RAKSASA BATU / STONE GIANT (🗿)
   -----------------------------------------------------------------------------
   File mandiri: MODEL 3D voxel (build) + ANIMASI (animate: jalan/quake keyframe)
   + COMBAT skill (combo mace 5-hit, EARTHQUAKE 3 slam). Pengembara langka.
   Sama persis in-game (dulu RareModels.buildGiant + SkillsPort giant).
   ============================================================================= */

const NPC_Stonegiant={

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
  C_GIANT:{
    stone:0x71767d, stoneD:0x565b63, stoneDD:0x43474f, stoneL:0x8d939b,
    iron:0x464e5c, ironD:0x333947, ironL:0x5d6675,
    leather:0x77502f, leatherD:0x5a3b21,
    wood:0x7c5330, steel:0x9ba4ae, steelD:0x7b828c,
    fur:0x4d3d31, glow:0xff8a3d, eye:0xff6a2a,
  },
  buildGiant(){
    const C=this.C_GIANT;
    const B=(p,w,h,d,c,x,y,z,rx,ry,rz,b)=>this.box(p,w,h,d,c,x,y,z,rx,ry,rz,b);
    const outer=new THREE.Group();
    const root=new THREE.Group();
    /* prototipe ±6 unit → diskala jadi ±2.7 blok: terasa raksasa tapi masih
       bisa melewati gerbang desa tanpa menembus atap rumah */
    root.scale.setScalar(0.46);
    outer.add(root);

    /* kaki: paha batu, pelat lutut, boot besi bersol */
    const leg=sx=>{
      const g=new THREE.Group();g.position.set(sx*.58,2.08,0);root.add(g);
      B(g,.82,1.15,.9 ,C.stone  ,0,-.55 ,0);
      B(g,.6 ,.4 ,.16 ,C.ironD  ,0,-1.02,.48);
      B(g,.7 ,.85,.8  ,C.stoneD ,0,-1.45,0);
      B(g,.78,.5 ,1.08,C.stoneDD,0,-1.83,.10);
      B(g,.8 ,.28,.34 ,C.iron   ,0,-1.90,.50);
      B(g,.76,.16,.9  ,C.leather,0,-1.58,.02);
      B(g,.1 ,.1 ,.1  ,C.steel  , .25,-1.45,.42);
      B(g,.1 ,.1 ,.1  ,C.steel  ,-.25,-1.45,.42);
      return g;
    };
    const legL=leg(1),legR=leg(-1);

    /* torso batu berpelat besi + inti menyala di dada */
    const torso=new THREE.Group();torso.position.set(0,2.08,0);root.add(torso);
    B(torso,2.25,1.45,1.35,C.stone  ,0,.75 ,0);
    B(torso,2.55,1.05,1.5 ,C.stoneD ,0,1.9 ,0);
    B(torso,2.2 ,.85 ,.28 ,C.iron   ,0,1.95,.68);
    B(torso,1.7 ,.3  ,1.1 ,C.stoneD ,0,2.5 ,0);
    B(torso,2.0 ,1.6 ,.3  ,C.stoneD ,0,1.3 ,-.72);
    B(torso,2.4 ,.5  ,1.45,C.leather,0,.18 ,0);
    B(torso,.5  ,.36 ,.12 ,C.ironL  ,0,.18 ,.74);
    const chestGlow=B(torso,.5,.12,.06,C.glow,0,1.95,.83,0,0,0,true);
    B(torso,1.6 ,.28 ,.08 ,C.stoneDD,0,1.05,.70);
    B(torso,1.4 ,.26 ,.08 ,C.stoneDD,0,.62 ,.71);
    B(torso,.3  ,.6  ,.1  ,C.stoneL , 1.18,1.6,.66);
    B(torso,.35 ,.5  ,.1  ,C.stoneL ,-1.1 ,.9 ,.66);
    B(torso,.1  ,.1  ,.1  ,C.steel  , .85,2.2,.80);
    B(torso,.1  ,.1  ,.1  ,C.steel  ,-.85,2.2,.80);

    /* kepala: tanduk batu, mata bara, rambut bulu */
    const head=new THREE.Group();head.position.set(0,3.05,0);torso.add(head);
    B(head,.8  ,.35,.8 ,C.stoneD ,0,-.72,0);
    B(head,1.25,1.1,1.2,C.stone  ,0, 0  ,0);
    B(head,1.15,.22,.25,C.stoneDD,0, .22,.62);
    B(head,1.0 ,.4 ,.45,C.stoneD ,0,-.5 ,.42);
    const eyeL=B(head,.24,.14,.06,C.eye, .3,.05,.63,0,0,0,true);
    const eyeR=B(head,.24,.14,.06,C.eye,-.3,.05,.63,0,0,0,true);
    B(head,.16,.5 ,.7 ,C.iron  , .68,0  ,.05);
    B(head,.16,.5 ,.7 ,C.iron  ,-.68,0  ,.05);
    B(head,.22,.5 ,.22,C.stoneL, .5 ,.68,-.1,0,0,-.35);
    B(head,.22,.5 ,.22,C.stoneL,-.5 ,.68,-.1,0,0, .35);
    B(head,.5 ,.35,.7 ,C.fur   ,0   ,.72,-.15);

    /* lengan raksasa: pauldron, bracer, tinju batu */
    const arm=sx=>{
      const g=new THREE.Group();g.position.set(sx*1.62,2.1,0);torso.add(g);
      B(g,1.15,.5 ,1.1,C.stoneD ,0, .12 ,0);
      B(g,.95 ,.35,.95,C.iron   ,0, .42 ,0);
      B(g,.66 ,1.1,.7 ,C.stone  ,0,-.5  ,0);
      B(g,.6  ,.22,.64,C.leather,0,-1.05,0);
      B(g,.58 ,.95,.62,C.stoneD ,0,-1.55,0);
      B(g,.64 ,.5 ,.68,C.iron   ,0,-1.72,0);
      B(g,.62 ,.55,.66,C.stoneDD,0,-2.25,0);
      return g;
    };
    const armL=arm(1),armR=arm(-1);
    /* bulu pauldron tambahan di bahu kiri */
    B(armL,.3,.5 ,.3,C.fur, .35,.6 , .2 , .3 ,0,-.3);
    B(armL,.3,.55,.3,C.fur,0   ,.68,-.2 ,-.25,0, .2);
    B(armL,.3,.45,.3,C.fur,-.3 ,.58, .15, .2 ,0, .35);

    /* MACE berduri — anak lengan kanan, pivot tepat di genggaman */
    const mace=new THREE.Group();mace.position.set(0,-2.45,0);armR.add(mace);
    B(mace,.3 ,.2 ,.3 ,C.steel   ,0, .05,0);
    B(mace,.3 ,.5 ,.3 ,C.leatherD,0,-.15,0);
    B(mace,.24,2.9,.24,C.wood    ,0,-1.5,0);
    B(mace,.3 ,.1 ,.3 ,C.steel   ,0,-.7 ,0);
    B(mace,.3 ,.1 ,.3 ,C.steel   ,0,-1.5,0);
    B(mace,.3 ,.1 ,.3 ,C.steel   ,0,-2.3,0);
    const hy=-2.9;
    B(mace,1.1,1.1,1.1,C.iron  ,0,hy,0);
    B(mace,1.3,.5 ,1.3,C.ironD ,0,hy,0,0,Math.PI/4,0);
    B(mace,1.3,.5 ,1.3,C.ironD ,0,hy,0,Math.PI/4,0,0);
    B(mace,.75,.26,.26,C.steel , .85,hy,0);
    B(mace,.75,.26,.26,C.steel ,-.85,hy,0);
    B(mace,.26,.26,.75,C.steel ,0,hy, .85);
    B(mace,.26,.26,.75,C.steel ,0,hy,-.85);
    B(mace,.26,.6 ,.26,C.steel ,0,hy+.85,0);
    B(mace,.28,.9 ,.28,C.steelD,0,hy-.9 ,0);
    for(const sx of[1,-1])for(const sz of[1,-1])
      B(mace,.22,.55,.22,C.steelD,sx*.62,hy,sz*.62,sx*.61,0,sz*.61);
    const maceGlow=[
      B(mace,.14,.14,.06,C.glow,0   ,hy, .57,0,0,0,true),
      B(mace,.14,.14,.06,C.glow,0   ,hy,-.57,0,0,0,true),
      B(mace,.06,.14,.14,C.glow, .57,hy,0   ,0,0,0,true),
      B(mace,.06,.14,.14,C.glow,-.57,hy,0   ,0,0,0,true),
    ];

    return {
      mesh:outer,
      parts:{
        body:torso,head,armL,armR,legs:[legL,legR],bodyY:torso.position.y,
        rare:{kind:'giant',mace,maceGlow,chestGlow,eyeL,eyeR},
      },
    };
  },
  build(){ return this.buildGiant(); },

  /* ---------- COMBAT & UTIL ---------- */
  /* keyframe evaluator (dari Giant.html) */
  K:(t,v)=>({t,v}),
  evalKeys(keys,t){
    if(t<=keys[0].t)return keys[0].v;
    for(let i=0;i<keys.length-1;i++){
      const a=keys[i],b=keys[i+1];
      if(t<=b.t){let u=(t-a.t)/(b.t-a.t);u=u*u*(3-2*u);return a.v+(b.v-a.v)*u;}
    }
    return keys[keys.length-1].v;
  },
  applyTracks(tr,t,P){for(const ch in tr)P[ch]=this.evalKeys(tr[ch],t);},

  /* ================= PENYIHIR ELF =================
     Skill: proyektil aura (serangan dasar), Hujan Es, Hujan Meteor */
  GIANT_HITS:[
    {dur:.5,fxT:.18,col:0x7fd8ff,size:1.15,arc:[-Math.PI/2,0,0],fy:2.4,fwd:2.4,big:false},
    {dur:.5,fxT:.18,col:0x7fd8ff,size:1.15,arc:[-Math.PI/2,0,0],fy:2.6,fwd:2.4,big:false},
    {dur:.55,fxT:.2,col:0xffd27f,size:1.25,arc:[0,0,.9],fy:2.8,fwd:2.3,big:false},
    {dur:.55,fxT:.2,col:0xffffff,size:1.2,arc:[.25,0,0],fy:2.6,fwd:2.0,big:false},
    {dur:.8,fxT:.45,col:0xff9a4d,size:1.7,arc:[.2,0,0],fy:1.2,fwd:3.3,big:true},
  ],
  QK:{
    crouch:[[0,.05],[.2,.9],[.3,.5],[.5,.55],[.6,.9],[.62,.95],[.85,.55],[1,.45]],
    aRx:[[0,-.5],[.2,-2.7],[.3,-3.05],[.5,-3.1],[.58,-1.6],[.66,-.8],[.85,-.72],[1,-.6]],
    mX:[[0,-1.6],[.15,-.4],[.3,0],[.5,0],[.66,0],[.9,-.1],[1,-.2]],
    lean:[[0,.03],[.2,-.28],[.45,-.18],[.62,.42],[.8,.44],[1,.34]],
    aLx:[[0,.2],[.25,-1.9],[.5,-2.2],[.62,-1.4],[.8,-.5],[1,-.25]],
    headX:[[0,-.05],[.3,-.32],[.62,.4],[1,.25]],
  },
  Q_CYC:1.12,Q_N:3,
  giantCombat(n,dt){
    n.quakeCd=Math.max(0,(n.quakeCd||0)-dt);
    /* ---- sedang EARTHQUAKE ---- */
    if(n.quake){
      const q=n.quake;q.t+=dt;
      n.vel.x*=0.7;n.vel.z*=0.7;
      const DUR=this.Q_N*this.Q_CYC+0.5;
      if(q.t>=DUR){n.quake=null;return true;}
      if(q.t<=this.Q_N*this.Q_CYC){
        const i=Math.min(2,Math.floor(q.t/this.Q_CYC));
        const k=(q.t-i*this.Q_CYC)/this.Q_CYC;
        /* lompat ke arah target lalu menghantam (visual lompatan diterapkan
           di giantAnim supaya tidak ditimpa mesh.position.copy di update) */
        if(k>=0.26&&k<=0.62){
          if(q.target&&!q.target.dead){
            const to=new THREE.Vector3().subVectors(q.target.pos,n.pos).setY(0);
            const d=to.length();
            if(d>2.5){to.normalize();
              const step=Math.min(d-2.5,2.2*dt);
              const nx=n.pos.x+to.x*step,nz=n.pos.z+to.z*step;
              if(NPCS.stepFree(n,nx,n.pos.z))n.pos.x=nx;
              if(NPCS.stepFree(n,n.pos.x,nz))n.pos.z=nz;
            }
          }
        }
        const hitK=(i===2)?0.56:0.62;
        if(k>=hitK&&!q.hitDone[i]){
          q.hitDone[i]=true;
          this.giantSlamFx(n);
          const fwd=this.fwdPoint(n,3.6);
          this.aoe(n,fwd.x,fwd.z,3.5,npcDmgSafe(n)*1.4,6);
        }
      }
      return true;
    }
    if(!n.target)return false;
    /* picu EARTHQUAKE: cooldown habis & ≥2 monster dekat & butuh stamina (30% konsumsi) */
    const qCost=(typeof NPCS!=='undefined'&&NPCS.skillStamCost)?NPCS.skillStamCost(n,40):Math.max(52,Math.round((n.maxStamina||100)*0.30));
    if(n.quakeCd<=0&&this.countNear(n,8)>=2&&n.target.pos.distanceTo(n.pos)<10&&((n.stamina||0)>=qCost)){
      n.stamina=(n.stamina||0)-qCost; n.stamRegenT=1.8;
      n.quake={t:0,hitDone:[false,false,false],target:n.target};
      n.quakeCd=14;
      UI.toast(`🗿 ${n.name} mengguncang bumi!`);
      NPCS.say(n,'HANCUR!!',2);
      FX.text(n.pos.clone().add(new THREE.Vector3(0,2,0)),`-${qCost} STAM`,'#ffd24d');
      return true;
    }
    return false;   // serangan biasa ditangani aiFight (dgn visual combo)
  },
  fwdPoint(n,d){
    const a=n.mesh.rotation.y;
    return{x:n.pos.x+Math.sin(a)*d,z:n.pos.z+Math.cos(a)*d};
  },
  giantSlamFx(n){
    const p=this.fwdPoint(n,3.6);
    const y=n.pos.y;
    PortFX.slash(p.x,y+2.2*0.46,p.z,n.mesh.rotation.y,[.3,0,0],1.5,0xffb066);
    FX.ring(p.x,y+.05,p.z,0xff8a3d,.6,9);
    FX.ring(p.x,y+.05,p.z,0xffffff,.32,4.5);
    /* gelombang tanah menjalar dari titik hantaman (1x per slam = 3x smooth) */
    if(typeof FX.groundWave==='function')FX.groundWave(p.x,y,p.z,{mode:'radial',radius:4.4,color:0xff8a3d});
    FX.debris(new THREE.Vector3(p.x,y+.3,p.z),0x7a7f87,13,4);
    PortFX.spark(p.x,y+.5,p.z,10,0xffd9a0,9);
    FX.addShake(.5);
    Sfx.at(n.pos,'smash');
  },
  /* visual tiap pukulan biasa raksasa: slash arc bergilir ala combo 5-hit */
  onMeleeHit(n){
    if(!n.parts.rare||n.parts.rare.kind!=='giant')return;
    n._hitIdx=(n._hitIdx||0);
    const hit=this.GIANT_HITS[n._hitIdx%5];
    n._hitIdx++;
    const p=this.fwdPoint(n,hit.fwd*0.46);
    PortFX.slash(p.x,n.pos.y+hit.fy*0.46,p.z,n.mesh.rotation.y,hit.arc,hit.size,hit.col);
    PortFX.spark(p.x,n.pos.y+1.2,p.z,7,0xffffff,7);
    if(hit.big){
      FX.ring(p.x,n.pos.y+.05,p.z,0xff9a4d,.5,5.5);
      FX.debris(new THREE.Vector3(p.x,n.pos.y+.3,p.z),0x7a7f87,8,3);
      FX.addShake(.3);
    }
    /* mace ikut terayun di animasi. CEGAH ANIMASI STACK: bila ayunan
       sebelumnya masih berjalan (combo rapat), lanjutkan sisa ayunannya
       alih-alih me-restart dari awal — restart tiap hit bikin mace
       bergetar bolak-balik & animasi tampak macet. */
    if((n._swingPrev||0)>0.12)n.swing=n._swingPrev;
    else n.swing=0.3;
  },
  /* giant pose: idle/jalan/keyframe quake (dari pose system prototipe) */
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
  giantAnim(n,dt){
    const R=n.parts,rr=R.rare,t=performance.now()*0.001;
    /* catat sisa swing SEBELUM aiFight frame berikutnya mengeset ulang —
       dipakai onMeleeHit untuk mencegah restart animasi yang masih berjalan
       (penyebab animasi "stack"/patah-patah saat pukulan combo cepat) */
    n._swingPrev=n.swing;
    const P=n._pose||(n._pose={rootY:0,crouch:0,lean:0,twist:0,headX:0,headY:0,
      aLx:.06,aLy:0,aLz:.12,aRx:-.32,aRy:0,aRz:-.12,mX:-1.6,
      legLx:0,legLz:.04,legRx:0,legRz:-.04});
    const T={rootY:0,crouch:0,lean:0,twist:0,headX:0,headY:0,
      aLx:.06,aLy:0,aLz:.12,aRx:-.32,aRy:0,aRz:-.12,mX:-1.6,
      legLx:0,legLz:.04,legRx:0,legRz:-.04};
    let blend=10;
    const sp=Math.hypot(n.vel.x,n.vel.z);
    if(n.quake){
      blend=20;
      const q=n.quake;
      if(q.t>this.Q_N*this.Q_CYC){
        T.crouch=.4;T.aRx=-.7;T.mX=-.2;
      }else{
        const i=Math.min(2,Math.floor(q.t/this.Q_CYC));
        const k=(q.t-i*this.Q_CYC)/this.Q_CYC;
        const tr={};
        for(const ch in this.QK)tr[ch]=this.QK[ch].map(a=>this.K(a[0],a[1]));
        this.applyTracks(tr,k,T);
        if(i===2&&k>0.38&&k<=0.62){
          const u=(k-0.38)/0.24;
          T.lean=0.03+u*0.72;T.headX=u*0.5;T.aRx=-0.5-u*0.25;
          T.mX=-1.6+u*2.05;T.aLx=0.2-u*2.1;T.legLx=-u*0.65;T.legRx=-u*0.65;
        }
      }
    }else{
      /* ---------- GERAK DASAR: jalan / idle ----------
         Kaki & lengan kiri selalu mengikuti locomotion/idle; ayunan mace
         (swing) dioverlay di atasnya supaya serangan tetap terlihat walau
         raksasa sedang bergerak — dulu swing & jalan saling meniadakan
         sehingga animasi terasa macet/terlambat saat bertarung. */
      if(sp>0.3){
        /* kecepatan fase di-smooth (bukan switch tajam di sp=2.2) supaya
           kaki tidak bergetar saat kecepatan naik-turun di sekitar ambang */
        const phaseSpeed=sp>=2.7?10.2:sp<=1.7?6.8:lerp(6.8,10.2,(sp-1.7)/1.0);
        n._ph=(n._ph||0)+dt*phaseSpeed;
        const ph=n._ph,amp=sp>2.2?1.0:.6,arm=sp>2.2?.9:.5;
        T.legLx=Math.sin(ph)*amp;T.legRx=-Math.sin(ph)*amp;
        T.aLx=-Math.sin(ph)*arm;
        T.aRx=-.35-Math.sin(ph)*arm*.2;
        T.mX=-1.6+Math.sin(ph*2)*.06;
        T.rootY=Math.abs(Math.cos(ph))*(sp>2.2?.16:.08);
        T.lean=sp>2.2?.2:.07;T.twist=Math.sin(ph)*.06;
        T.headY=Math.sin(ph*.5)*.1;
      }else{
        const b=Math.sin(t*1.7);
        T.aLx=.06+b*.04;T.aRx=-.32-b*.04;
        T.mX=-1.6+b*.05;T.lean=.02+b*.015;
        T.headY=Math.sin(t*.6)*.25;T.headX=Math.sin(t*.9)*.06;
        T.rootY=b*.03;
      }
      /* ---------- OVERLAY AYUNAN MACE ----------
         Lengan kanan + mace + condong badan diambil alih animasi swing,
         sementara kaki tetap berjalan. Blend dinaikkan agar pukulan tajam. */
      if(n.swing>0){
        blend=22;
        const sw=1-n.swing/0.3;
        T.aRx=sw<0.4?-3.0*sw/0.4:lerp(-3.0,-0.7,(sw-0.4)/0.6);
        T.mX=sw<0.4?lerp(-1.6,-2.6,sw/0.4):lerp(-2.6,0.1,(sw-0.4)/0.6);
        T.lean+=(sw<0.4?-0.3*(sw/0.4):lerp(-0.3,0.45,(sw-0.4)/0.6));
        T.crouch=sw>0.6?0.4:0.1;
      }
    }
    const f=1-Math.exp(-blend*dt);
    for(const k in T)P[k]+=(T[k]-P[k])*f;
    /* terapkan (skala root 0.46) */
    let yOff=(P.rootY-.55*P.crouch)*0.46;
    /* lompatan EARTHQUAKE: tinggi mengikuti kurva prototipe (2.8/2.8/4.8) */
    if(n.quake&&n.quake.t<=this.Q_N*this.Q_CYC){
      const i=Math.min(2,Math.floor(n.quake.t/this.Q_CYC));
      const k=(n.quake.t-i*this.Q_CYC)/this.Q_CYC;
      if(k>=0.26&&k<=0.62){
        const v=(k-0.26)/0.36;
        const jumpH=(i===2)?4.8:2.8;
        yOff=4*jumpH*v*(1-v)*0.46;
      }
    }
    n.mesh.position.y=n.pos.y+yOff;
    R.body.rotation.set(P.lean,P.twist,0);
    R.head.rotation.set(P.headX,P.headY,0);
    R.armL.rotation.set(P.aLx,P.aLy,P.aLz);
    R.armR.rotation.set(P.aRx,P.aRy,P.aRz);
    if(rr.mace)rr.mace.rotation.set(P.mX,0,0);
    if(R.legs){
      R.legs[0].rotation.set(P.legLx,0,P.legLz);
      R.legs[1].rotation.set(P.legRx,0,P.legRz);
      const s=1-.27*P.crouch;
      R.legs[0].scale.set(1,s,1);R.legs[1].scale.set(1,s,1);
    }
  },
  animate(n,dt){ this.giantAnim(n,dt); },
  combat(n,dt){ return this.giantCombat(n,dt); },
};
window.NPC_Stonegiant=NPC_Stonegiant;
