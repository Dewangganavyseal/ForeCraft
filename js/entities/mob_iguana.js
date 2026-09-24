'use strict';
/* =============================================================================
   ENTITAS MOB: IGUANA HUTAN / ULAR VOXEL (🐍)
   -----------------------------------------------------------------------------
   Model ular voxel panjang tanpa kaki dengan tulang belakang dinamis (spine trail IK).
   Pergerakan sangat lentur & organik:
     - Saat bergerak & berbelok, belokan merambat berurutan dari kepala hingga ke
       ujung ekor seperti ular sungguhan (path-following breadcrumb trail).
     - Tubuh melata fleksibel mengikuti kontur blok medan (World.groundAt) dan
       berkelok-kelok anggun dengan gelombang lateral S-curve (serpentine undulation).
     - Kepala tenang & terfokus lurus ke depan tanpa menoleh-noleh gelisah.
     - Frill (tudung kobra) mekar saat marah / menyembur bisa.
     - Lidah bercabang menjulur & bergetar secara berkala.
     - Aksi tempur otentik: Patuk (lunge), Sembur Bisa (rearing venom spray),
       Lompat (coiled strike leap AoE).
   ============================================================================= */

const Mob_Iguana=(()=>{

  const SCALE=0.42;                  // skala model di dunia voxel
  const NUM_SEGS=22;                 // jumlah ruas badan ular dari leher ke ekor
  const SEG_DIST=0.72;               // jarak antar ruas (satuan lokal)
  const SEG_WORLD_DIST=SEG_DIST*SCALE*0.92; // jarak antar ruas di koordinat dunia (~0.28 blok)
  const DUR={attack:1.15,venom:2.45,jump:1.5};
  const VENOM_MAX=110;

  /* ---------- helper interpolasi kurva ---------- */
  const sstep=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  const eOC=t=>1-Math.pow(1-Math.max(0,Math.min(1,t)),3);
  const eOB=t=>{t=Math.max(0,Math.min(1,t));const c=1.9;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);};
  const bump=(x,w)=>{const q=Math.max(0,Math.min(1,x/w));return Math.sin(Math.PI*q);};
  function keyInterp(keys,u){
    if(u<=keys[0][0])return keys[0][1];
    for(let i=0;i<keys.length-1;i++){
      const u0=keys[i][0],v0=keys[i][1],u1=keys[i+1][0],v1=keys[i+1][1];
      if(u<=u1){const t=(u-u0)/(u1-u0);return v0+(v1-v0)*(1-Math.cos(Math.PI*t))/2;}
    }
    return keys[keys.length-1][1];
  }

  /* keyframe lompat */
  const JUMP_DUR=1.5;
  const JUMP_HEADU=[[0,0],[.15,-.25],[.30,.75],[.55,.60],[.78,.15],[.90,-.15],[1,0]];
  const JUMP_HEADF=[[0,0],[.15,-.30],[.35,.40],[.60,.60],[.85,-.05],[1,0]];
  const JUMP_PITCH=[[0,0],[.15,.25],[.30,-.38],[.55,-.15],[.78,.32],[.92,.05],[1,0]];
  const JUMP_FRILL=[[0,0],[.20,.5],[.55,.7],[.85,.2],[1,0]];
  const JUMP_JAW  =[[0,0],[.30,.3],[.60,.5],[.85,.1],[1,0]];

  /* ---------- tekstur voxel otentik ---------- */
  function canvasTex(size,painter){
    const cv=document.createElement('canvas');cv.width=cv.height=size;
    painter(cv.getContext('2d'),size);
    const t=new THREE.CanvasTexture(cv);
    t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;
    if(THREE.SRGBColorSpace!==undefined&&'colorSpace' in t)t.colorSpace=THREE.SRGBColorSpace;
    else if(THREE.sRGBEncoding!==undefined)t.encoding=THREE.sRGBEncoding;
    return t;
  }
  const rgb=(c,v)=>`rgb(${Math.max(0,Math.min(255,c[0]+v))|0},${Math.max(0,Math.min(255,c[1]+v))|0},${Math.max(0,Math.min(255,c[2]+v))|0})`;
  function noisePaint(cx,s,base,contrast,opts){
    opts=opts||{};
    for(let y=0;y<s;y++)for(let x=0;x<s;x++){
      let v=(Math.random()*2-1)*contrast;
      if(opts.spots&&Math.random()<opts.spots)v-=contrast*2.4;
      if(opts.hi&&Math.random()<opts.hi)v+=contrast*1.9;
      cx.fillStyle=rgb(base,v);cx.fillRect(x,y,1,1);
    }
    if(opts.topLight){cx.fillStyle=rgb(base,24);cx.fillRect(0,0,s,1);}
    if(opts.botDark){cx.fillStyle=rgb(base,-30);cx.fillRect(0,s-2,s,2);}
  }
  const TAU=Math.PI*2;
  const texSideA=canvasTex(16,(c,s)=>noisePaint(c,s,[84,134,54],13,{spots:.06,hi:.05,topLight:1,botDark:1}));
  const texSideB=canvasTex(16,(c,s)=>noisePaint(c,s,[72,118,48],13,{spots:.07,hi:.04,topLight:1,botDark:1}));
  const texTop=canvasTex(16,(c,s)=>{noisePaint(c,s,[48,88,34],10,{spots:.08});
    c.fillStyle=rgb([48,88,34],42);for(let y=0;y<16;y++){const w=2+((y/4)|0)%2;c.fillRect(8-(w>>1),y,w,1);}});
  const texBelly=canvasTex(16,(c,s)=>{noisePaint(c,s,[199,191,139],8);
    c.fillStyle=rgb([199,191,139],-34);for(let y=3;y<16;y+=4)c.fillRect(0,y,16,1);});
  const texBone=canvasTex(16,(c,s)=>noisePaint(c,s,[228,220,192],7,{spots:.04}));
  const texDark=canvasTex(16,(c,s)=>noisePaint(c,s,[40,70,30],8,{spots:.06}));
  const texFrill=canvasTex(16,(c,s)=>{noisePaint(c,s,[108,168,60],10,{spots:.05});
    c.fillStyle='#1c1a12';c.beginPath();c.arc(8,8,4.8,0,TAU);c.fill();
    c.fillStyle='#efa22e';c.beginPath();c.arc(8,8,3.5,0,TAU);c.fill();
    c.fillStyle='#241c10';c.beginPath();c.arc(8,8,1.5,0,TAU);c.fill();});

  /* ---------- profil 22 ruas badan ular ---------- */
  const SEGS_SPEC=[];
  for(let i=0;i<NUM_SEGS;i++){
    const u=i/(NUM_SEGS-1);
    let w,h;
    if(u<0.22){
      const t=u/0.22;
      w=1.05+0.55*Math.sin(t*Math.PI*0.5);
      h=0.95+0.45*Math.sin(t*Math.PI*0.5);
    }else if(u<0.50){
      const t=(u-0.22)/0.28;
      w=1.60-0.12*t;
      h=1.40-0.12*t;
    }else{
      const t=(u-0.50)/0.50;
      w=1.48*(1-t*0.76);
      h=1.28*(1-t*0.74);
    }
    let dorsal='plate',side=false,belly=true;
    if(i<3){
      dorsal='ridge';
    }else if(i<10){
      dorsal='spike';
      side=(i>=4&&i<=8);
    }else if(i<16){
      dorsal='ridge';
    }else{
      dorsal='plate';
      belly=(i<19);
    }
    SEGS_SPEC.push({w,h,len:SEG_DIST,dorsal,side,belly});
  }

  const Mob_Iguana={
    SCALE, DUR, NUM_SEGS, SEG_WORLD_DIST,

    /* ================= MODEL 3D: ULAR PANJANG TANPA KAKI ================= */
    build(boss){
      const cache={};
      const M=c=>{if(!cache[c])cache[c]=new THREE.MeshLambertMaterial({color:c});return cache[c];};
      const matSideA=M(texSideA),matSideB=M(texSideB),matTop=M(texTop),
            matBelly=M(texBelly),matBone=M(texBone),matDark=M(texDark),matFrill=M(texFrill);
      const matMouth=new THREE.MeshLambertMaterial({color:0x7a2f38});
      const matTongue=new THREE.MeshLambertMaterial({color:0xd0486e});
      const eyeMat=new THREE.MeshLambertMaterial({color:0xff5a1e,emissive:0xb32a08});
      const segMatA=[matSideA,matSideA,matTop,matBelly,matSideA,matSideA];
      const segMatB=[matSideB,matSideB,matTop,matBelly,matSideB,matSideB];

      const box=(parent,w,h,d,mat,x,y,z)=>{
        const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
        m.position.set(x||0,y||0,z||0);m.castShadow=!IS_MOBILE;
        parent.add(m);return m;
      };

      const g=new THREE.Group();
      g.scale.setScalar(SCALE);
      const parts={eyeMat};

      /* ---- 22 ruas badan ular ---- */
      const segs=[];
      for(let k=0;k<NUM_SEGS;k++){
        const spec=SEGS_SPEC[k];
        const w=spec.w,h=spec.h,len=spec.len;
        const grp=new THREE.Group();grp.rotation.order='YXZ';
        box(grp,w,h,len+0.08,k%2?segMatB:segMatA,0,0,0);

        const sp=Math.min(0.42,w*0.26);
        if(spec.dorsal==='spike'){
          box(grp,sp,sp*.7,sp*1.2,matDark,0,h/2+sp*.30,0);
          box(grp,sp*.72,sp*1.05,sp*.85,matBone,0,h/2+sp*1.05,-sp*.05);
          box(grp,sp*.4,sp*.7,sp*.5,matBone,0,h/2+sp*1.85,-sp*.1);
        }else if(spec.dorsal==='ridge'){
          box(grp,w*.42,.16,len*.85,matDark,0,h/2+.06,0);
          box(grp,w*.2,.2,.2,matBone,0,h/2+.18,len*.18);
        }else if(spec.dorsal==='plate'){
          box(grp,w*.5,.1,len*.8,matDark,0,h/2+.04,0);
        }
        if(spec.side){
          for(const s of[-1,1]){
            const sk=box(grp,.48,.13,.16,matBone,s*(w/2+.14),-h*.10,0);
            sk.rotation.z=-s*.4;
          }
        }
        if(spec.belly)box(grp,w*.82,.07,len*.9,matBelly,0,-h/2-.025,0);

        g.add(grp);segs.push(grp);
      }
      parts.segs=segs;

      /* ---- kubus penghubung antar-ruas (joint cubes) ---- */
      const jCubes=[];
      for(let k=0;k<NUM_SEGS-1;k++){
        const s=(SEGS_SPEC[k].w+SEGS_SPEC[k+1].w)/2*0.72;
        const jm=box(g,s,s,s,matSideB,0,-99,0);
        jCubes.push(jm);
      }
      parts.jCubes=jCubes;

      /* ---- ujung ekor runcing (rattle / needle tail tip) ---- */
      const tailTip=new THREE.Group();tailTip.rotation.order='YXZ';
      box(tailTip,.22,.20,.32,matBone,0,0,-.15);
      box(tailTip,.14,.12,.28,matBone,0,0,-.40);
      box(tailTip,.08,.06,.20,matBone,0,0,-.62);
      g.add(tailTip);
      parts.tailTip=tailTip;

      /* ---- KEPALA ULAR (otentik, tudung kobra, taring bisa & lidah bergetar) ---- */
      const headG=new THREE.Group();headG.rotation.order='YXZ';g.add(headG);
      const HR={};parts.head=headG;
      box(headG,.95,.8,1.15,segMatA,0,.10,.55);
      box(headG,1.0,.22,.85,matDark,0,.58,.45);
      box(headG,1.02,.14,.3,matDark,0,.42,1.02);
      box(headG,.72,.5,.55,segMatA,0,0,1.28);
      box(headG,.55,.34,.25,segMatB,0,.02,1.62);
      box(headG,.09,.09,.06,matDark,-.16,.12,1.74);
      box(headG,.09,.09,.06,matDark,.16,.12,1.74);
      const noseHorn=box(headG,.14,.34,.14,matBone,0,.30,1.50);noseHorn.rotation.x=.3;
      box(headG,.6,.06,.9,matMouth,0,-.32,.85);
      for(const z of[.8,1.05,1.3])for(const s of[-1,1])box(headG,.05,.12,.05,matBone,s*.30,-.36,z);
      for(const s of[-1,1]){const f=box(headG,.10,.34,.10,matBone,s*.30,-.42,1.28);f.rotation.x=.18;}
      HR.eyeL=box(headG,.20,.24,.26,eyeMat,-.42,.28,.92);
      HR.eyeR=box(headG,.20,.24,.26,eyeMat,.42,.28,.92);
      box(headG,.04,.16,.09,matDark,-.535,.28,.92);
      box(headG,.04,.16,.09,matDark,.535,.28,.92);
      HR.lidL=box(headG,.26,.34,.30,matSideA,-.42,.66,.92);
      HR.lidR=box(headG,.26,.34,.30,matSideA,.42,.66,.92);
      for(const s of[-1,1]){
        const hg=new THREE.Group();hg.position.set(s*.36,.55,.08);hg.rotation.set(-.15,s*.15,-s*.18);
        box(hg,.20,.20,.24,matBone,0,0,0);box(hg,.16,.16,.20,matBone,0,.14,-.10);
        box(hg,.11,.11,.16,matBone,0,.27,-.19);box(hg,.07,.07,.12,matBone,0,.38,-.27);
        headG.add(hg);
      }
      for(const s of[-1,1]){
        const ck=box(headG,.10,.10,.45,matBone,s*.50,-.02,-.15);
        ck.rotation.y=s*.6;ck.rotation.z=-s*.2;
      }
      /* tudung kobra (frill) mekar saat aksi */
      const makeFrill=s=>{
        const piv=new THREE.Group();piv.position.set(s*.5,.12,.15);
        box(piv,.85,1.15,.09,matFrill,s*.45,-.15,-.15);
        box(piv,.85,.09,.09,matDark,s*.45,.42,-.15);
        box(piv,.09,.09,.09,matBone,s*.86,-.15,-.15);
        headG.add(piv);return piv;
      };
      HR.frillR=makeFrill(1);HR.frillL=makeFrill(-1);

      /* rahang bawah */
      HR.jaw=new THREE.Group();HR.jaw.position.set(0,-.18,.10);
      box(HR.jaw,.66,.24,1.05,segMatB,0,-.16,.62);
      box(HR.jaw,.50,.10,.30,matBelly,0,-.06,1.10);
      box(HR.jaw,.50,.05,.80,matMouth,0,-.03,.55);
      for(const z of[.40,.62,.84,1.02])for(const s of[-1,1])box(HR.jaw,.05,.12,.05,matBone,s*.24,-.02,z);
      for(const s of[-1,1]){const f=box(HR.jaw,.08,.30,.08,matBone,s*.27,.02,1.02);f.rotation.x=-.15;}
      headG.add(HR.jaw);

      /* lidah bercabang (forked tongue) */
      HR.tongue=new THREE.Group();HR.tongue.position.set(0,-.28,1.45);
      box(HR.tongue,.06,.045,.5,matTongue,0,0,.28);
      for(const s of[-1,1]){const tp=box(HR.tongue,.04,.04,.16,matTongue,s*.05,0,.60);tp.rotation.y=s*.35;}
      HR.tongue.scale.z=.001;HR.tongue.visible=false;headG.add(HR.tongue);
      parts.HR=HR;

      /* anchor mulut (titik keluar semburan bisa) */
      const mouth=new THREE.Object3D();mouth.position.set(0,-.30,1.75);headG.add(mouth);
      parts.mouth=mouth;

      return {mesh:g,parts};
    },

    /* ---------- sampel kurva jejak sejauh `dist` dari kepala ---------- */
    _sampleTrail(trail,dist){
      if(trail.length<2)return trail[0]?{x:trail[0].x,y:trail[0].y,z:trail[0].z}:{x:0,y:0,z:0};
      let acc=0;
      for(let i=0;i<trail.length-1;i++){
        const a=trail[i],b=trail[i+1];
        const d=Math.hypot(b.x-a.x,b.z-a.z,b.y-a.y)||1e-4;
        if(acc+d>=dist){
          const t=(dist-acc)/d;
          return {
            x:a.x+(b.x-a.x)*t,
            y:a.y+(b.y-a.y)*t,
            z:a.z+(b.z-a.z)*t
          };
        }
        acc+=d;
      }
      const end=trail[trail.length-1];
      return {x:end.x,y:end.y,z:end.z};
    },

    /* ================= ANIMASI: TULANG BELAKANG MERAMBAT BERURUTAN ================= */
    animate(m,dt){
      const P=m.parts;if(!P||!P.segs)return;
      if(!m._ig){
        m._ig={T:0,slitherPhase:0,breathPhase:0,blinkT:3,blinkP:9,tongueT:1.5,tongueP:9,
          jawOpen:0,frill:0,emitAcc:0,shake:0};
      }
      const R=m._ig;
      R.T+=dt;const T=R.T;

      const mobX=m.pos.x, mobY=m.pos.y, mobZ=m.pos.z;
      const h=m.mesh?m.mesh.rotation.y:0;
      const cosH=Math.cos(h), sinH=Math.sin(h);
      const sc=(m.mesh&&m.mesh.scale&&m.mesh.scale.x)?m.mesh.scale.x:SCALE;
      const speed=Math.hypot(m.vel.x,m.vel.z);
      const isMoving=speed>0.12;

      /* =====================================================================
         1. BREADCRUMB TRAIL (JEJAK DUNIA)
         Kepala memimpin, seluruh ruas tubuh di belakang mengikuti jejak yang
         ditinggalkan kepala. Saat berbelok, belokan merambat dari depan ke belakang!
         ===================================================================== */
      const totalLen=NUM_SEGS*SEG_WORLD_DIST;
      if(!m._trail||m._trail.length<2){
        m._trail=[];
        const seedStep=0.08;
        const numSeed=Math.ceil((totalLen*1.5)/seedStep);
        for(let k=0;k<numSeed;k++){
          const d=k*seedStep;
          const px=mobX-Math.sin(h)*d;
          const pz=mobZ-Math.cos(h)*d;
          const py=(typeof World!=='undefined'&&World.groundAt)?World.groundAt(px,pz,mobY+2.5):mobY;
          m._trail.push(new THREE.Vector3(px,py,pz));
        }
      }

      const first=m._trail[0];
      const movedDist=Math.hypot(mobX-first.x,mobZ-first.z);
      if(movedDist>0.035){
        m._trail.unshift(new THREE.Vector3(mobX,mobY,mobZ));
        const maxKeep=totalLen*1.45;
        let acc=0;
        for(let k=0;k<m._trail.length-1;k++){
          const a=m._trail[k],b=m._trail[k+1];
          acc+=Math.hypot(b.x-a.x,b.z-a.z,b.y-a.y);
          if(acc>maxKeep){m._trail.length=k+2;break;}
        }
      }else{
        /* saat diam: titik pertama tetap sinkron dengan elevasi & posisi kepala */
        first.x=mobX;first.y=mobY;first.z=mobZ;
      }

      /* =====================================================================
         2. TIMELINE AKSI TEMPUR (Patuk, Sembur Bisa, Lompat)
         ===================================================================== */
      const act=m.iAct, tA=m.iActT||0;
      let headOffF=0,headOffU=0,pitchAdd=0,jawT=0,frillT=0,spraying=false,jumpFly=0;

      if(act==='attack'){
        const t=tA;
        if(t<.30){const k=sstep(t/.30);
          headOffF=-0.8*k;headOffU=0.45*k;jawT=0.3*k;frillT=0.85*k;pitchAdd=-0.25*k;
        }else if(t<.44){const k=(t-.30)/.14,e=k*k;
          headOffF=-0.8+2.6*e;headOffU=0.45-0.8*e;
          jawT=0.3+0.7*sstep(k);frillT=1;pitchAdd=-0.25+0.55*e;
        }else{const k=(t-.44)/.71,e=eOC(k),eb=eOB(Math.min(1,k*1.08));
          headOffF=1.8*(1-eb);headOffU=-0.35*(1-e);
          jawT=Math.max(0,1-k*2.2);frillT=Math.max(0,1-k*1.4);pitchAdd=0.30*(1-e);
        }
      }else if(act==='venom'){
        const t=tA;
        if(t<.55){const k=sstep(t/.55);
          headOffU=1.2*k;headOffF=-0.25*k;jawT=0.95*k;frillT=k;pitchAdd=-0.38*k;
        }else if(t<1.85){spraying=true;
          jawT=1;frillT=1;
          headOffU=1.2+Math.sin(t*45)*0.03;headOffF=-0.30;
          pitchAdd=-0.38+0.65*sstep((t-.55)/.25)+Math.sin(t*40)*0.015;
        }else{const k=(t-1.85)/.60,e=eOC(k);
          jawT=1-e;frillT=1-e;headOffU=1.2*(1-e);headOffF=-0.30*(1-e);pitchAdd=0.27*(1-e);
        }
      }else if(act==='jump'){
        const u=tA/JUMP_DUR;
        headOffU=keyInterp(JUMP_HEADU,u)*1.1;
        headOffF=keyInterp(JUMP_HEADF,u)*1.1;
        pitchAdd=keyInterp(JUMP_PITCH,u);
        frillT=keyInterp(JUMP_FRILL,u);
        jawT=keyInterp(JUMP_JAW,u);
        jumpFly=Math.sin(Math.PI*Math.max(0,Math.min(1,(u-0.18)/0.62)))*1.6;
      }

      /* =====================================================================
         3. KEPALA ULAR: TERFOKUS LURUS KE DEPAN (TIDAK MENOLEH-NOLEH)
         Kepala menghadap ke arah hadap tubuh (tangent gerak), diam stabil.
         ===================================================================== */
      const HR=P.HR;
      P.head.position.set(0,(headOffU+jumpFly)*0.8,0.15+headOffF*0.75);
      P.head.rotation.set(pitchAdd,0,0); // yaw = 0 (tetap lurus ke depan, tidak menoleh)

      R.jawOpen+=(jawT*0.95-R.jawOpen)*Math.min(1,(act?14:8)*dt);
      HR.jaw.rotation.x=R.jawOpen+Math.sin(T*1.3)*0.008;
      R.frill+=(frillT-R.frill)*Math.min(1,9*dt);
      const fv=R.frill+(spraying?Math.sin(T*30)*0.03:0);
      HR.frillR.rotation.y=1.30-1.48*fv;HR.frillR.rotation.z=.50-.46*fv;
      HR.frillL.rotation.y=-1.30+1.48*fv;HR.frillL.rotation.z=-.50+.46*fv;

      if(m.flash<=0&&P.eyeMat)P.eyeMat.emissive.setHex(act?0xff4400:0xb32a08);

      /* kedipan kelopak mata */
      R.blinkT-=dt;
      if(R.blinkT<=0&&R.blinkP>1){R.blinkP=0;R.blinkT=2.5+Math.random()*3.5;}
      let lidK=0;
      if(R.blinkP<=.14){lidK=Math.sin(Math.PI*R.blinkP/.14);R.blinkP+=dt;}else R.blinkP=9;
      HR.lidL.position.y=HR.lidR.position.y=.66-.30*lidK;

      /* lidah bercabang bergetar keluar-masuk secara berkala */
      R.tongueT-=dt*(speed<1?1:0.5);
      let tgK=0;
      if(R.tongueT<=0&&R.tongueP>1&&!act){R.tongueP=0;R.tongueT=1.8+Math.random()*2.4;}
      if(R.tongueP<=.55){tgK=Math.pow(Math.sin(Math.PI*R.tongueP/.55),.6);R.tongueP+=dt;}else R.tongueP=9;
      HR.tongue.visible=tgK>.02;HR.tongue.scale.z=Math.max(tgK,.001);
      HR.tongue.rotation.y=Math.sin(T*35)*0.25*tgK;

      /* =====================================================================
         4. GELOMBANG LATERAL (S-CURVE) & GELOMBANG LOMPAT BERURUTAN
         Saat melompat, gelombang terangkat secara dinamis dan berurutan dari
         atas (kepala) lalu menjalar seperti gelombang ke arah belakang!
         ===================================================================== */
      R.slitherPhase+=dt*(1.4+speed*2.6);
      R.breathPhase+=dt*1.8;
      const br=Math.sin(R.breathPhase);

      const groundAt=(x,z,refY)=>{
        if(typeof World!=='undefined'&&World.groundAt){
          const g2=World.groundAt(x,z,refY);
          if(g2!==undefined&&isFinite(g2)&&g2>0)return g2;
        }
        return mobY;
      };

      const groundHead=groundAt(mobX,mobZ,mobY+2.5);
      const headWorldY=mobY+P.head.position.y*SCALE;
      const headLift=Math.max(0,headWorldY-(groundHead+0.15*SCALE));
      const uJump=(act==='jump')?Math.max(0,Math.min(1.0,tA/JUMP_DUR)):0;

      /* Posisi kepala di dunia untuk tautan tulang leher */
      const headFwdOffset=0.15+headOffF*0.75;
      const headWorldPos={
        x:mobX+(sinH*headFwdOffset*SCALE),
        y:headWorldY,
        z:mobZ+(cosH*headFwdOffset*SCALE)
      };

      /* hitung posisi dunia tiap ruas */
      const segWorldPos=[];
      for(let i=0;i<NUM_SEGS;i++){
        const sampleDist=(i+1)*SEG_WORLD_DIST;
        const sp=this._sampleTrail(m._trail,sampleDist);
        const spFwd=this._sampleTrail(m._trail,Math.max(0,sampleDist-0.12));
        const spBwd=this._sampleTrail(m._trail,sampleDist+0.12);

        /* vektor arah maju lokal di titik jejak */
        let tanX=spFwd.x-spBwd.x, tanZ=spFwd.z-spBwd.z;
        const tLen=Math.hypot(tanX,tanZ)||1e-4;
        tanX/=tLen;tanZ/=tLen;
        /* vektor normal kanan (perpendicular) */
        const normX=-tanZ, normZ=tanX;

        /* gelombang lateral (S-curve): nol di kepala, membesar di badan, mereda di ekor */
        const bodyEnv=Math.sin(((i+1)/NUM_SEGS)*Math.PI);
        const waveAmp=isMoving?(0.24+Math.min(0.20,speed*0.06)):0.06;
        const latOffset=Math.sin(R.slitherPhase-(i+1)*0.44)*waveAmp*bodyEnv*SCALE;

        let wx=sp.x+normX*latOffset;
        let wz=sp.z+normZ*latOffset;

        /* menempel di atas tanah blok medan */
        const spec=SEGS_SPEC[i];
        let gy=groundAt(wx,wz,sp.y+2.5);
        let wy=gy+(spec.h*0.5-0.02)*SCALE;

        /* 1. LIFT KEPALA DI UDARA (baik saat ditunggangi melompat, skill lompat, maupun jatuh):
              Rantai ruas menyambung leher & kepala, merambat ke belakang */
        if(headLift>0.02){
          const chainRatio=Math.max(0,1-(i/NUM_SEGS)*0.78);
          wy+=headLift*chainRatio;
        }

        /* 2. GELOMBANG LOMPAT SKILL BERURUTAN (dari depan menjalar ke belakang) */
        if(act==='jump'&&uJump>0.08){
          const waveDelay=(i/NUM_SEGS)*0.32; // ruas depan naik duluan, ekor menyusul
          const segU=Math.max(0,Math.min(1.0,(uJump-(0.08+waveDelay))/0.54));
          const segWave=Math.sin(segU*Math.PI); // parabola halus
          const peakHeight=Math.max(headLift,1.8*SCALE)*Math.max(0.40,1-(i/NUM_SEGS)*0.55);
          wy+=segWave*peakHeight;
        }

        /* 3. saat mendongak sembur bisa / patuk: ruas leher (0-4) ikut terangkat proporsional */
        if(headOffU>0&&i<6){
          wy+=headOffU*(1-i/6)*SCALE*0.9;
        }

        /* 4. TAUTAN KINEMATIKA FISIK (RIGID DISTANCE CONSTRAINT):
              Setiap ruas i DIKUNCI menyambung rapat dengan ruas i-1 (atau kepala untuk ruas 0).
              Badan di belakang kepala TIDAK AKAN PERNAH terputus / terlepas saat loncat! */
        const fwdPt=(i===0)?headWorldPos:segWorldPos[i-1];
        let cdx=wx-fwdPt.x, cdy=wy-fwdPt.y, cdz=wz-fwdPt.z;
        const curDist=Math.hypot(cdx,cdy,cdz)||1e-4;
        const linkRatio=SEG_WORLD_DIST/curDist;
        wx=fwdPt.x+cdx*linkRatio;
        wy=fwdPt.y+cdy*linkRatio;
        wz=fwdPt.z+cdz*linkRatio;

        const minGroundY=groundAt(wx,wz,wy+2.5)+(spec.h*0.5-0.02)*SCALE;
        if(wy<minGroundY)wy=minGroundY;

        segWorldPos.push({x:wx,y:wy,z:wz});
      }

      /* terapkan posisi & rotasi ke mesh lokal */
      for(let i=0;i<NUM_SEGS;i++){
        const cur=segWorldPos[i];
        /* titik pemandu di depan (ruas i-1 atau kepala headWorldPos) */
        const fwdPt=(i===0)?headWorldPos:segWorldPos[i-1];

        const fdx=fwdPt.x-cur.x, fdz=fwdPt.z-cur.z, fdy=fwdPt.y-cur.y;
        const segYaw=Math.atan2(fdx,fdz);
        const segPitch=-Math.atan2(fdy,Math.hypot(fdx,fdz)||1e-4);
        const segRoll=Math.cos(R.slitherPhase-(i+1)*0.44)*0.10*Math.min(1,speed/3.0);

        /* konversi posisi dunia -> lokal m.mesh */
        const dwx=cur.x-mobX, dwz=cur.z-mobZ, dwy=cur.y-mobY;
        const lx=(dwx*cosH-dwz*sinH)/SCALE;
        const lz=(dwx*sinH+dwz*cosH)/SCALE;
        const ly=dwy/SCALE;

        P.segs[i].position.set(lx,ly,lz);
        P.segs[i].rotation.set(segPitch,segYaw-h,segRoll);

        /* napas halus di badan depan */
        if(i>=1&&i<=4){
          const sB=1+br*0.02*(1-(i-1)/3);
          P.segs[i].scale.set(sB,sB,1);
        }

        /* posisikan kubus penghubung (joint cubes) di antara ruas */
        if(i<NUM_SEGS-1&&P.jCubes[i]){
          const nxt=segWorldPos[i+1];
          const jwx=(cur.x+nxt.x)*0.5-mobX;
          const jwz=(cur.z+nxt.z)*0.5-mobZ;
          const jwy=(cur.y+nxt.y)*0.5-mobY;
          P.jCubes[i].position.set(
            (jwx*cosH-jwz*sinH)/SCALE,
            jwy/SCALE,
            (jwx*sinH+jwz*cosH)/SCALE
          );
          P.jCubes[i].rotation.set(segPitch,segYaw-h,segRoll);
        }
      }

      /* posisikan ujung ekor (tail tip) di belakang ruas terakhir */
      if(P.tailTip){
        const lastSeg=P.segs[NUM_SEGS-1];
        P.tailTip.position.copy(lastSeg.position);
        P.tailTip.rotation.set(lastSeg.rotation.x,lastSeg.rotation.y,lastSeg.rotation.z);
      }

      /* semprotan partikel bisa saat jendela sembur */
      if(spraying&&m.iTarget!==undefined){
        R.emitAcc+=dt*75;
        while(R.emitAcc>=1){R.emitAcc--;this.venomBurst(m,true);}
      }else R.emitAcc=0;

      R.shake+=(0-R.shake)*Math.min(1,7*dt);
    },

    /* guncangan layar */
    addShake(m,v){
      if(typeof FX!=='undefined'&&FX.addShake)FX.addShake(Math.min(0.6,v*0.5));
    },

    /* =========================================================================
       SEMBURAN BISA — pool partikel bisa global
       ========================================================================= */
    _venom:null,_venomMesh:null,
    venomInit(){
      if(this._venom)return;
      this._venom=[];this._venomMesh=[];
      const scene=(typeof Game!=='undefined'&&Game.scene)?Game.scene:null;
      for(let i=0;i<VENOM_MAX;i++){
        this._venom.push({life:0,dmg:6,pos:new THREE.Vector3(),vel:new THREE.Vector3(),
          hit:false,src:null,rot:Math.random()*9});
        const mm=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.16,0.16),
          new THREE.MeshBasicMaterial({color:0x8fe02a,transparent:true,opacity:0.95}));
        mm.visible=false;
        if(scene)scene.add(mm);
        this._venomMesh.push(mm);
      }
    },
    venomBurst(m,single){
      this.venomInit();
      const mouth=new THREE.Vector3();
      if(m.parts&&m.parts.mouth)m.parts.mouth.getWorldPosition(mouth);
      else mouth.copy(m.pos).add(new THREE.Vector3(0,0.8,0));
      let tgt=(m.iTarget&&!m.iTarget.dead)?m.iTarget:null;
      if(!tgt&&typeof Monsters!=='undefined'&&Monsters.battleTarget)
        tgt=Monsters.battleTarget(m,14);
      if(!tgt&&!m.pet&&typeof Player!=='undefined'&&!Player.dead)tgt=Player;
      if(!tgt)return;
      const toT=new THREE.Vector3().subVectors(
        tgt.pos.clone().add(new THREE.Vector3(0,0.9,0)),mouth);
      const dist=toT.length()||1e-4;toT.multiplyScalar(1/dist);
      if(tgt.vel){toT.x+=tgt.vel.x*0.03*dist;toT.z+=tgt.vel.z*0.03*dist;const d2=toT.length()||1e-4;toT.multiplyScalar(1/d2);}
      const n=single?1:10;
      let spawned=0;
      for(let i=0;i<VENOM_MAX&&spawned<n;i++){
        const a=this._venom[i];
        if(a.life>0)continue;
        a.life=0.9+Math.random()*0.4;a.hit=false;a.dmg=Math.max(3,Math.round(m.dmg*0.45));
        a.src=m;
        a.pos.copy(mouth);
        a.pos.x+=(Math.random()-.5)*.14;a.pos.y+=(Math.random()-.5)*.14;a.pos.z+=(Math.random()-.5)*.14;
        a.vel.copy(toT).multiplyScalar(11+Math.random()*6);
        a.vel.x+=(Math.random()-.5)*3;a.vel.y+=(Math.random()-.5)*1.4+0.6;a.vel.z+=(Math.random()-.5)*3;
        const mm=this._venomMesh[i];
        if(mm)mm.material.color.setHex([0x9aff3a,0x77dd2a,0xbaff60,0x5fc422][(Math.random()*4)|0]);
        spawned++;
      }
      if(!single&&typeof Sfx!=='undefined'&&Sfx.at)Sfx.at(m.pos,'cast');
    },
    updateVenom(dt){
      this.venomInit();
      for(let i=0;i<VENOM_MAX;i++){
        const a=this._venom[i],mm=this._venomMesh[i];
        if(a.life>0){
          a.life-=dt;
          a.vel.y-=19*dt;
          a.vel.multiplyScalar(Math.max(0,1-1.1*dt));
          a.pos.addScaledVector(a.vel,dt);
          if(!a.hit&&typeof Monsters!=='undefined'&&Monsters.projTarget){
            const v=Monsters.projTarget(a.src,a.pos.x,a.pos.y,a.pos.z,0.9);
            if(v&&Monsters.hitTarget(a.src,v,a.dmg,1.5,a.pos.x,a.pos.z,1)){
              a.hit=true;a.life=0;
              if(a.src&&!a.src.pet){a.src.poisonHit=2;a.src.poisonT=1.0;}
              if(typeof FX!=='undefined'){
                FX.debris(v.pos.clone().add(new THREE.Vector3(0,1,0)),0x8fe02a,6,2.2);
                FX.text(v.pos.clone().add(new THREE.Vector3(0,2.2,0)),'☠ bisa','#8fe02a');
              }
            }
          }
          let gy=0.12;
          if(typeof World!=='undefined'&&World.groundAt){
            const g2=World.groundAt(a.pos.x,a.pos.z,a.pos.y+2);
            if(g2!==undefined&&isFinite(g2)&&g2>0)gy=g2+0.1;
          }
          if(a.pos.y<=gy&&a.vel.y<0){
            a.life=0;
            if(Math.random()<.35&&typeof FX!=='undefined')
              FX.debris(a.pos.clone(),0x6fae2a,3,1.2);
          }
          if(a.life>0){
            mm.visible=true;
            mm.position.copy(a.pos);
            mm.rotation.set(a.rot+a.life*6,a.rot*.7+a.life*5,0);
            mm.material.opacity=Math.min(1,a.life*3.2)*0.95;
          }else mm.visible=false;
        }else mm.visible=false;
      }
    },
  };

  window.Mob_Ular=Mob_Iguana;
  window.Mob_Iguana=Mob_Iguana;
  return Mob_Iguana;
})();
