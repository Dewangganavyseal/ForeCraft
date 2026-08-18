'use strict';
/* =============================================================================
   ENTITAS NPC: KELINCI CAKAR / RABBIT WARRIOR (🐰)
   -----------------------------------------------------------------------------
   File mandiri: MODEL 3D voxel (build) + ANIMASI penuh (animate: gait, combo
   sabitan, RAPID CLAW) + COMBAT skill. Pengembara langka. Sama persis in-game
   (dulu PortRabbit + SkillsPort rabbit di js/ports.js).
   ============================================================================= */

const PortRabbit={
  C:{fur:0x8ea6c0,furD:0x6b86a5,furL:0xb8c9dc,cream:0xf2e7d1,creamD:0xe0d2b6,
    pink:0xef9aa2,ivory:0xf3ecd8,bone:0xcfc3a2,tip:0x454250,eye:0x1d2129,
    white:0xffffff,scarf:0x2fa3a0,scarfD:0x1f7c7a},
  _mat:null,
  /* gabung banyak BoxGeometry jadi satu mesh vertex-color (hemat draw call).
     Meniru makeSeg() prototipe, tanpa addon mergeGeometries (tak ada di r128). */
  seg(list){
    if(!this._mat)this._mat=new THREE.MeshLambertMaterial({vertexColors:true});
    let vc=0,ic=0;
    const geos=list.map(b=>{
      const g=new THREE.BoxGeometry(b[0],b[1],b[2]);
      g.translate(b[3],b[4],b[5]);
      vc+=g.attributes.position.count;ic+=g.index.count;return g;
    });
    const pos=new Float32Array(vc*3),nor=new Float32Array(vc*3),col=new Float32Array(vc*3);
    const idx=new Uint16Array(ic);
    let vo=0,io=0;const c=new THREE.Color();
    geos.forEach((g,i)=>{
      const p=g.attributes.position,nn=g.attributes.normal,ix=g.index;
      pos.set(p.array,vo*3);nor.set(nn.array,vo*3);
      c.set(this.C[list[i][6]]);
      const h=Math.abs(Math.sin(list[i][3]*12.9898+list[i][4]*37.719+list[i][5]*78.233+i)*43758.5453)%1;
      const k=.955+.09*h;
      for(let j=0;j<p.count;j++){
        col[(vo+j)*3]=c.r*k;col[(vo+j)*3+1]=c.g*k;col[(vo+j)*3+2]=c.b*k;
      }
      for(let j=0;j<ix.count;j++)idx[io+j]=ix.getX(j)+vo;
      vo+=p.count;io+=ix.count;g.dispose();
    });
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));
    geo.setAttribute('color',new THREE.BufferAttribute(col,3));
    geo.setIndex(new THREE.BufferAttribute(idx,1));
    return new THREE.Mesh(geo,this._mat);
  },

  /* ---------- data voxel (persis prototipe) ---------- */
  VOX:{
    torso:[
      [.48,.44,.30, 0,.49,0,'fur'],[.42,.22,.27, 0,.12,0,'furD'],
      [.30,.32,.03, 0,.45,.152,'cream'],[.10,.10,.03,-.11,.63,.152,'cream'],
      [.10,.10,.03, .11,.63,.152,'cream'],
      [.16,.09,.31,-.21,.665,0,'furD'],[.16,.09,.31, .21,.665,0,'furD'],
      [.52,.13,.33, 0,.735,0,'scarf'],[.46,.05,.28, 0,.665,0,'scarfD'],
      [.13,.20,.06, .13,.55,.16,'scarf'],[.13,.09,.06, .13,.43,.17,'scarfD']],
    tail:[
      [.20,.20,.16, 0,.02,-.05,'cream'],[.14,.14,.12, 0,.10,-.13,'white'],
      [.13,.13,.11, 0,-.07,-.12,'white']],
    head:[
      [.54,.50,.50, 0,.30,0,'fur'],[.58,.17,.44, 0,.155,.01,'fur'],
      [.26,.20,.10, 0,.17,.28,'cream'],[.10,.07,.045,0,.255,.315,'pink'],
      [.052,.08,.03,-.031,.05,.325,'white'],[.052,.08,.03,.031,.05,.325,'white'],
      [.085,.115,.03,-.145,.35,.262,'eye'],[.085,.115,.03,.145,.35,.262,'eye'],
      [.032,.032,.014,-.130,.385,.280,'white'],[.032,.032,.014,.130,.385,.280,'white'],
      [.115,.045,.03,-.145,.447,.262,'furD'],[.115,.045,.03,.145,.447,.262,'furD'],
      [.16,.10,.03, 0,.52,.256,'furL'],
      [.07,.13,.12,-.30,.22,.06,'furL'],[.07,.13,.12,.30,.22,.06,'furL'],
      [.05,.16,.20,-.295,.33,-.06,'fur'],[.05,.16,.20,.295,.33,-.06,'fur'],
      [.34,.15,.06, 0,.46,-.27,'furD'],
      [.17,.016,.016,-.35,.26,.22,'white'],[.17,.016,.016,.35,.26,.22,'white'],
      [.15,.016,.016,-.34,.215,.18,'white'],[.15,.016,.016,.34,.215,.18,'white']],
    ear:[
      [.15,.50,.09, 0,.28,0,'fur'],[.11,.16,.08, 0,.585,0,'furD'],
      [.085,.34,.03, 0,.30,.052,'pink'],[.09,.30,.02, 0,.30,-.052,'furD']],
    armUp:[[.19,.10,.21,0,-.03,0,'furD'],[.17,.28,.19,0,-.17,0,'fur']],
    armFo:[[.155,.25,.175,0,-.12,0,'fur'],[.17,.06,.19,0,-.235,0,'scarf']],
    hand:[[.165,.15,.19,0,-.06,.02,'furL'],[.165,.06,.09,0,-.015,.10,'furD']],
    claw:[
      [.05,.20,.058, 0,-.10,0,'ivory'],
      [.042,.15,.05, 0,-.255,.02,'bone'],
      [.034,.10,.042,0,-.355,.04,'tip']],
    thigh:[[.22,.34,.25,0,-.17,0,'fur'],[.20,.08,.23,0,-.315,.02,'furD']],
    shin:[[.175,.32,.205,0,-.16,0,'fur']],
    foot:[
      [.195,.075,.23, 0,0,0,'furD'],
      [.20,.115,.42, 0,-.06,.10,'furL'],[.16,.09,.11, 0,-.05,-.135,'fur'],
      [.025,.118,.13, 0,-.059,.26,'furD'],
      [.042,.055,.10,-.066,-.075,.335,'ivory'],
      [.042,.055,.10, .066,-.075,.335,'ivory']],
  },
  HIP:.78,

  build(){
    const V=this.VOX,R={};
    const outer=new THREE.Group();
    outer.scale.setScalar(1.15);   // sedikit diperbesar agar setara tinggi NPC
    const root=new THREE.Group();outer.add(root);R.root=root;
    R.body=new THREE.Group();R.body.position.y=this.HIP;root.add(R.body);
    R.body.add(this.seg(V.torso));
    R.tail=new THREE.Group();R.tail.position.set(0,.18,-.14);R.body.add(R.tail);
    R.tail.add(this.seg(V.tail));
    R.head=new THREE.Group();R.head.position.set(0,.64,.02);R.body.add(R.head);
    R.head.add(this.seg(V.head));
    R.earL=new THREE.Group();R.earL.position.set(.135,.555,-.03);R.earL.rotation.z=.12;
    R.earR=new THREE.Group();R.earR.position.set(-.135,.555,-.03);R.earR.rotation.z=-.12;
    R.earL.add(this.seg(V.ear));R.earR.add(this.seg(V.ear));
    R.head.add(R.earL,R.earR);
    const mkArm=sx=>{
      const sh=new THREE.Group();sh.position.set(.30*sx,.58,0);sh.rotation.order='YXZ';
      sh.add(this.seg(V.armUp));
      const el=new THREE.Group();el.position.y=-.30;sh.add(el);el.add(this.seg(V.armFo));
      const hand=new THREE.Group();hand.position.y=-.27;el.add(hand);hand.add(this.seg(V.hand));
      const claws=[];
      [-1,0,1].forEach(i=>{const cg=new THREE.Group();cg.position.set(.058*i,-.115,.055);
        cg.add(this.seg(V.claw));hand.add(cg);claws.push(cg);});
      R.body.add(sh);return{sh,el,hand,claws};
    };
    const mkLeg=sx=>{
      const hip=new THREE.Group();hip.position.set(.13*sx,0,0);hip.add(this.seg(V.thigh));
      const knee=new THREE.Group();knee.position.y=-.34;hip.add(knee);knee.add(this.seg(V.shin));
      const ankle=new THREE.Group();ankle.position.y=-.32;knee.add(ankle);ankle.add(this.seg(V.foot));
      R.body.add(hip);return{hip,knee,ankle};
    };
    const aL=mkArm(1),aR=mkArm(-1),lL=mkLeg(1),lR=mkLeg(-1);
    Object.assign(R,{shL:aL.sh,elL:aL.el,handL:aL.hand,clawsL:aL.claws,
      shR:aR.sh,elR:aR.el,handR:aR.hand,clawsR:aR.claws,
      hipL:lL.hip,kneeL:lL.knee,ankleL:lL.ankle,hipR:lR.hip,kneeR:lR.knee,ankleR:lR.ankle});
    /* kontrak NPCS.animate + animasi penuh lewat SkillsPort */
    const parts={body:R.body,head:R.head,armL:R.shL,armR:R.shR,
      legs:[lL.hip,lR.hip],bodyY:this.HIP,
      rare:{kind:'rabbit',R}};
    return{mesh:outer,parts};
  },

  setClaws(R,splay,curl){
    [R.clawsL,R.clawsR].forEach(arr=>arr.forEach((cl,i)=>{
      cl.rotation.z=(i-1)*.20*splay;cl.rotation.x=curl;
    }));
  },
  ankleAuto(h){
    h.rotation.x=clamp(-(h.parent.rotation.x+h.rotation.x)*.55,-.9,.4);
  },
};

/* ===========================================================================
   3. FISH — 8 spesies ikan (fish.html)
   =========================================================================== */

const NPC_Rabbitwarrior={

  /* ---------- MODEL 3D ---------- */
  build(){ return PortRabbit.build(); },

  /* ---------- COMBAT & UTIL ---------- */
  RAB:{ant:.24,dash:.15,hit:.09,back:.13,rec:.55,n:5,dzF:.95,dzB:.55},
  RAB_DUR:{jump:1.30,combo1:.62,combo2:.62,combo3:.95,skill:2.64},
  rabbitCombat(n,dt){
    n.rapidCd=Math.max(0,(n.rapidCd||0)-dt);
    const rb=n.rab||(n.rab=this.rabbitState());
    /* RAPID CLAW sedang berjalan */
    if(rb.action&&rb.action.name==='skill'){
      n.vel.x*=0.6;n.vel.z*=0.6;
      const t=rb.action.t,SK=this.RAB;
      const cyc=SK.dash+SK.hit+SK.back;
      const te=t-SK.ant;
      if(te>0){
        const i=Math.min(4,Math.floor(te/cyc));
        const tl=te-i*cyc;
        if(tl>=SK.dash&&rb.lastStrike<i){
          rb.lastStrike=i;
          if(n.target&&!n.target.dead){
            const wasDead=n.target.dead;
            Monsters.hurt(n.target,npcDmgSafe(n)*0.7,
              new THREE.Vector3(0,.25,0),2,n);
            PortFX.spark(n.target.pos.x,n.target.pos.y+1,n.target.pos.z,
              6,0xf2e7d1,6);
            Sfx.at(n.target.pos,'hit');
            if(!wasDead&&n.target.dead&&NPCS.isTeam(n))
              NPCS.gainXp(n,CFG.NPC.XP_PER_KILL);
          }
        }
      }
      return true;
    }
    if(!n.target)return false;
    const d=n.target.pos.distanceTo(n.pos);
    /* picu RAPID CLAW */
    if(n.rapidCd<=0&&d<3.2){
      rb.action={name:'skill',t:0,lastStrike:-1};
      rb.skillYaw=n.mesh.rotation.y;
      rb.skillPos=n.pos.clone();
      n.rapidCd=12;
      NPCS.say(n,'RAPID CLAW!',1.6);
      UI.toast(`🐰 ${n.name}: RAPID CLAW!`);
      return true;
    }
    /* serangan biasa: combo 1→2→3 bergilir */
    if(n.atkCd<=0&&d<NPCS.npcReach(n)){
      n.atkCd=CFG.NPC.ATK_CD*0.9;n.swing=0.25;
      const seq=['combo1','combo2','combo3'];
      rb.comboIdx=((rb.comboIdx||0)+1)%3;
      rb.action={name:seq[rb.comboIdx],t:0};
      const dir=new THREE.Vector3().subVectors(n.target.pos,n.pos)
        .setY(0.25).normalize();
      const wasDead=n.target.dead;
      Monsters.hurt(n.target,npcDmgSafe(n)*(rb.comboIdx===2?1.3:1),dir,4,n);
      PortFX.spark(n.target.pos.x,n.target.pos.y+1,n.target.pos.z,
        4,0xf2e7d1,5);
      Sfx.at(n.target.pos,'hit');
      if(!wasDead&&n.target.dead&&NPCS.isTeam(n))
        NPCS.gainXp(n,CFG.NPC.XP_PER_KILL);
    }
    return false;   // gerak mendekat tetap dari aiFight
  },
  rabbitState(){
    return{action:null,gaitPhase:0,leanS:0,earX:-.1,earKick:0,earTarget:-.08,
      prevRY:0,twT:1,nextTw:2,lastStrike:-1,comboIdx:0,skillYaw:0,skillPos:null};
  },
  /* animator penuh kelinci — port applyIdle/applyGait/atkSlash/atkX/skillPose */

  /* ---------- ANIMASI ---------- */
  rabbitAnim(n,dt){
    const rr=n.parts.rare,R=rr.R,rb=n.rab||(n.rab=this.rabbitState());
    const t=performance.now()*0.001;
    const HIP=PortRabbit.HIP;
    /* --- reset pose dasar (persis resetPose prototipe) --- */
    R.body.position.set(0,HIP,0);R.body.rotation.set(0,0,0);
    R.head.rotation.set(0,0,0);R.tail.rotation.set(0,0,0);
    R.shL.rotation.set(0,0,.10);R.shR.rotation.set(0,0,-.10);
    R.elL.rotation.x=-.15;R.elR.rotation.x=-.15;
    R.handL.rotation.x=.15;R.handR.rotation.x=.15;
    R.hipL.rotation.set(0,0,0);R.hipR.rotation.set(0,0,0);
    R.kneeL.rotation.x=0;R.kneeR.rotation.x=0;
    R.ankleL.rotation.x=0;R.ankleR.rotation.x=0;
    PortRabbit.setClaws(R,1,.20);
    rb.earTarget=-.08;
    const ankleAuto=PortRabbit.ankleAuto;

    let oz=0,ox=0,jy=0;
    if(rb.action){
      rb.action.t+=dt;
      const a=rb.action,T=rb.action.t;
      if(a.name==='combo1'||a.name==='combo2'){
        const m=a.name==='combo1'?1:-1,rise=a.name!=='combo1';
        const w=PE.out(PE.seg(T,0,.14)),k=Math.pow(PE.seg(T,.14,.30),.75),
          r=PE.inOut(PE.seg(T,.44,.62)),g=1-r;
        const shS=m>0?R.shR:R.shL,shO=m>0?R.shL:R.shR,elS=m>0?R.elR:R.elL;
        shS.rotation.x=(-.25*w-1.25*k-(rise?.35*k:0))*g;
        shS.rotation.y=m*(1.35*w-2.65*k)*g;
        elS.rotation.x=(-.15+.10*k)*g;
        shO.rotation.x=(.30*w+.45*k)*g;
        shO.rotation.y=-m*(.35*w+.50*k)*g;
        R.body.rotation.y=m*(.55*w-1.10*k)*g;
        R.body.rotation.x=(.08*w+.24*k)*g;
        R.body.position.y=HIP+(-.07*w-.05*k+(rise?.06*k:0))*g;
        R.hipL.rotation.x=(-.28*w-.12*k)*g;R.hipR.rotation.x=(.22*w+.30*k)*g;
        R.kneeL.rotation.x=R.kneeR.rotation.x=(.30*w+.22*k)*g;
        R.head.rotation.y=m*(-.25*w+.35*k)*g;R.head.rotation.x=(.05*w+.10*k)*g;
        const b=PE.bell(PE.seg(T,.10,.40));PortRabbit.setClaws(R,1+1.3*b,.20-.30*b);
        rb.earTarget=-.7;R.tail.rotation.y=m*.5*b;
        oz=.34*Math.sin(Math.PI*PE.seg(T,.14,.52));
      }else if(a.name==='combo3'){
        const w=PE.out(PE.seg(T,0,.20)),k=Math.pow(PE.seg(T,.20,.33),.7),
          r=PE.inOut(PE.seg(T,.52,.95)),g=1-r;
        R.shL.rotation.x=(-2.75*w+2.15*k)*g;R.shR.rotation.x=(-2.75*w+2.15*k)*g;
        R.shL.rotation.z=(.85*w-1.35*k)*g;R.shR.rotation.z=(-.85*w+1.35*k)*g;
        R.shL.rotation.y=(-.30*k)*g;R.shR.rotation.y=(.30*k)*g;
        R.body.rotation.x=(-.32*w+.78*k)*g;
        R.body.position.y=HIP+(.03*w-.16*k)*g;
        R.hipL.rotation.x=(-.15*w-.20*k)*g;R.hipR.rotation.x=(.10*w+.28*k)*g;
        R.kneeL.rotation.x=R.kneeR.rotation.x=(.20*w+.38*k)*g;
        R.head.rotation.x=(-.18*w+.42*k)*g;
        const b=PE.bell(PE.seg(T,.15,.5));PortRabbit.setClaws(R,1+1.4*b,.20-.35*b);
        rb.earTarget=-.9;R.tail.rotation.x=-.4*b;
        oz=.30*Math.sin(Math.PI*PE.seg(T,.20,.60));
      }else if(a.name==='skill'){
        const SK=this.RAB,cyc=SK.dash+SK.hit+SK.back;
        for(let j=0;j<SK.n;j++){
          const d0=SK.ant+j*cyc,b0=d0+SK.dash+SK.hit;
          if(T>=d0){const e=clamp((T-d0)/SK.dash,0,1);oz+=SK.dzF*(1-(1-e)*(1-e));}
          if(T>=b0){const e=clamp((T-b0)/SK.back,0,1);oz-=SK.dzB*(e*e*(3-2*e));}
        }
        if(T<SK.ant){
          const e=PE.out(T/SK.ant);
          R.body.position.y=HIP-.26*e;R.body.rotation.x=.38*e;
          R.hipL.rotation.x=-.55*e;R.hipR.rotation.x=-.40*e;
          R.kneeL.rotation.x=1.05*e;R.kneeR.rotation.x=.90*e;
          ankleAuto(R.ankleL);ankleAuto(R.ankleR);
          R.shL.rotation.x=R.shR.rotation.x=.80*e;
          R.shL.rotation.y=.55*e;R.shR.rotation.y=-.55*e;
          R.head.rotation.x=.18*e;R.tail.rotation.x=-.3*e;
          PortRabbit.setClaws(R,1.7,.05);rb.earTarget=-1.0;
        }else{
          const te=T-SK.ant,i=Math.min(4,Math.floor(te/cyc)),tl=te-i*cyc;
          ox=(i%2?-1:1)*.16*PE.bell(clamp(tl/(SK.dash+SK.hit),0,1));
          const backE=PE.inOut(clamp((tl-SK.dash-SK.hit)/SK.back,0,1));
          const side=i%2===0?1:-1;
          const shS=side>0?R.shR:R.shL,shO=side>0?R.shL:R.shR;
          const swE=PE.out(clamp(tl/(SK.dash+SK.hit),0,1));
          const sp=Math.sin(T*24),cp=Math.cos(T*24);
          R.hipL.rotation.x=sp*.85*(1-backE*.6);R.hipR.rotation.x=-sp*.85*(1-backE*.6);
          R.kneeL.rotation.x=R.kneeR.rotation.x=.55+.55*Math.abs(cp);
          R.body.position.y=HIP-.14+Math.abs(sp)*.05;
          R.body.rotation.x=lerp(.50,-.28,backE);
          shS.rotation.x=lerp(-1.45,.5,backE*.8);
          shS.rotation.y=side*lerp(lerp(1.30,-1.20,swE),.9,backE);
          shO.rotation.x=-.95*(1-backE*.5);shO.rotation.y=-side*.45*(1-backE*.5);
          const hitOn=tl>=SK.dash&&tl<SK.dash+SK.hit;
          PortRabbit.setClaws(R,hitOn?2.2:1.4,-.05);
          R.head.rotation.x=.25*(1-backE);R.tail.rotation.x=-.35;
          rb.earTarget=-1.15;
          const tRec=SK.ant+SK.n*cyc;
          if(T>=tRec){
            const e=PE.inOut(PE.seg(T,tRec,tRec+SK.rec)),f=Math.sin(Math.PI*e);
            R.body.position.y=HIP-.14*(1-e);R.body.rotation.x=-.06*f;
            R.hipL.rotation.x=R.hipR.rotation.x=0;
            R.kneeL.rotation.x=R.kneeR.rotation.x=.1*f;
            R.shL.rotation.x=R.shR.rotation.x=-.5*f;
            R.shL.rotation.z=.10+.18*f;R.shR.rotation.z=-.10-.18*f;
            R.shL.rotation.y=R.shR.rotation.y=0;
            R.head.rotation.x=-.14*f;PortRabbit.setClaws(R,1+.5*f,.1);
            rb.earTarget=-.3;
          }
        }
        /* dorong badan mengikuti oz (dash) dengan cek tabrakan */
        if(rb.skillPos){
          const yaw=rb.skillYaw;
          const tx=rb.skillPos.x+Math.sin(yaw)*oz+(-Math.cos(yaw))*ox;
          const tz=rb.skillPos.z+Math.cos(yaw)*oz+(Math.sin(yaw))*ox;
          if(NPCS.stepFree(n,tx,n.pos.z))n.pos.x=tx;
          if(NPCS.stepFree(n,n.pos.x,tz))n.pos.z=tz;
        }
      }
      if(rb.action.t>=this.RAB_DUR[rb.action.name]){
        rb.leanS=R.body.rotation.x;
        rb.action=null;rb.skillPos=null;
      }
    }else{
      /* --- gerak dasar: idle / jalan / lari (applyGait prototipe) --- */
      const sp=Math.hypot(n.vel.x,n.vel.z);
      const move=sp>3.0?'run':sp>0.4?'walk':'idle';
      if(move==='idle'){
        const b=Math.sin(t*2.1);
        R.body.position.y=HIP-.015+b*.012;
        R.shL.rotation.x=.06+b*.03;R.shR.rotation.x=.06-b*.03;
        R.head.rotation.y=Math.sin(t*.55)*.22;R.head.rotation.x=Math.sin(t*.8)*.04;
        R.tail.rotation.y=Math.sin(t*1.6)*.32;R.tail.rotation.x=.12;
      }else{
        const run=move==='run',f=run?2.9:1.85;
        rb.gaitPhase+=dt*f*Math.PI*2;
        const p=rb.gaitPhase,s=Math.sin(p),s2=-s;
        const aH=run?1.0:.55,aK=run?1.5:.95,aA=run?.9:.5;
        R.hipL.rotation.x=s*aH;R.hipR.rotation.x=s2*aH;
        R.kneeL.rotation.x=Math.max(0,Math.sin(p+2.0))*aK;
        R.kneeR.rotation.x=Math.max(0,Math.sin(p+Math.PI+2.0))*aK;
        ankleAuto(R.ankleL);ankleAuto(R.ankleR);
        R.shL.rotation.x=-s2*aA-(run?.5:.05);
        R.shR.rotation.x=-s*aA-(run?.5:.05);
        R.elL.rotation.x=-(run?1.05:.30)-Math.max(0,s2)*.2;
        R.elR.rotation.x=-(run?1.05:.30)-Math.max(0,s)*.2;
        R.body.position.y=HIP+Math.abs(Math.cos(p))*(run?.075:.04);
        const lt=run?.34:.10;
        rb.leanS+=(lt-rb.leanS)*Math.min(1,dt*6);
        R.body.rotation.x=rb.leanS;
        R.body.rotation.z=Math.sin(p)*(run?.05:.025);
        R.head.rotation.x=-rb.leanS*.45;
        R.tail.rotation.y=s*(run?.5:.35);R.tail.rotation.x=run?-.25:.1;
        rb.earTarget=run?-1.05+Math.sin(p*2)*.06:-.12;
        PortRabbit.setClaws(R,run?1.3:1,run?.05:.22);
      }
    }
    /* --- sekunder: telinga pegas (persis secondary prototipe) --- */
    const vy=(n.mesh.position.y-rb.prevRY)/Math.max(dt,1e-4);
    rb.prevRY=n.mesh.position.y;
    rb.earX+=(rb.earTarget-rb.earX)*Math.min(1,dt*8);
    const kt=clamp(-vy*.10,-.35,.35);
    rb.earKick+=(kt-rb.earKick)*Math.min(1,dt*9);
    let tw=0;
    if(!rb.action&&Math.hypot(n.vel.x,n.vel.z)<0.4){
      if(t>rb.nextTw){rb.twT=0;rb.nextTw=t+1.2+Math.random()*2.8;}
      if(rb.twT<.35){rb.twT+=dt;tw=Math.sin(rb.twT*42)*Math.exp(-rb.twT*10)*.5;}
    }
    R.earL.rotation.x=rb.earX+rb.earKick+tw*.6;
    R.earR.rotation.x=rb.earX+rb.earKick+tw;
    /* offset lompatan combo kecil */
    n.mesh.position.y=n.pos.y+jy;
  },
  animate(n,dt){ this.rabbitAnim(n,dt); },
  combat(n,dt){ return this.rabbitCombat(n,dt); },
};
window.NPC_Rabbitwarrior=NPC_Rabbitwarrior;
