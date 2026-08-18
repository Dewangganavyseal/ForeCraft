'use strict';
/* =============================================================================
   ENTITAS MOB: KUDA (Horse)
   -----------------------------------------------------------------------------
   Port model + animasi dari "NEW MODEL/Kuda.html".
   Animasi: idle, walk, run, eat, jump, serta aksi idle tambahan
   (menoleh, mengendus, mengais, kibas ekor).
   Dipanggil Monsters.make() & Monsters.animate() lewat window.Mob_Horse.
   ============================================================================= */

/* ---------- data voxel kuda: dibangun SEKALI, dipakai semua kuda ---------- */
const HORSE_DATA=(()=>{
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function hash3(x,y,z){const n=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return n-Math.floor(n);}
  function vnoise(x,y,z){
    const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z);
    const xf=x-xi,yf=y-yi,zf=z-zi;
    const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),w=zf*zf*(3-2*zf);
    const h=(i,j,k)=>hash3(xi+i,yi+j,zi+k),L=(a,b,t)=>a+(b-a)*t;
    return L(L(L(h(0,0,0),h(1,0,0),u),L(h(0,1,0),h(1,1,0),u),v),
             L(L(h(0,0,1),h(1,0,1),u),L(h(0,1,1),h(1,1,1),u),v),w);
  }

  const defs=new Map();
  const def=k=>(defs.has(k)||defs.set(k,{key:k,vox:[]}),defs.get(k));
  function V(k,px,py,pz,lx,ly,lz,tag,data){
    def(k).vox.push({lx,ly,lz,wx:px+lx,wy:py+ly,wz:pz+lz,tag,data});
  }
  function BOX(k,p,x0,x1,y0,y1,z0,z1,tag,data,skip){
    for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++){
      if(skip&&skip(x,y,z))continue;V(k,p[0],p[1],p[2],x,y,z,tag,data);
    }
  }

  const BY=7.5;
  /* badan */
  const bp=[0,BY,0];
  BOX('body',bp,-2,2,0,5,-6,4,'coat',null,(x,y,z)=>
    (z===-6&&y===5&&Math.abs(x)===2)||(z===4&&y===5&&Math.abs(x)===2));
  BOX('body',bp,-2,2,-1,-1,2,4,'coat',null,(x,y,z)=>(Math.abs(x)===2&&z===4));
  for(const s of[-3,3]){
    BOX('body',bp,s,s,2,4,2,4,'coat',null,(x,y,z)=>(y===4&&z===4));
    BOX('body',bp,s,s,1,4,-6,-3,'coat',null,(x,y,z)=>((y===4||y===1)&&z===-6));
  }
  V('body',bp[0],bp[1],bp[2],0,6,2,'coat');V('body',bp[0],bp[1],bp[2],0,6,1,'coat');

  /* leher */
  const np=[0,BY+4.75,2.5];
  const nd=[[-2,1],[-2,1],[-2,1],[-1,1],[-1,1],[-1,0],[-1,0],[-1,1]];
  for(let i=0;i<8;i++){
    BOX('neck',np,-1,1,i,i,nd[i][0],nd[i][1],'coat');
    if(i>=1)V('neck',np[0],np[1],np[2],0,i,nd[i][0]-1,'mane');
  }

  /* kepala */
  const hp=[0,7.5,0];
  BOX('head',hp,-1,1,-1,1,0,1,'coat');
  BOX('head',hp,-1,1,2,2,0,1,'coat');
  for(const s of[-1,1]){V('head',hp[0],hp[1],hp[2],s,3,1,'coat');V('head',hp[0],hp[1],hp[2],s,4,1,'coat');}
  BOX('head',hp,-1,1,-1,0,2,5,'coat');
  BOX('head',hp,-1,1,-2,-2,1,3,'coat');
  V('head',hp[0],hp[1],hp[2],0,3,0,'mane');

  /* ekor */
  const tp=[0,BY+4.5,-6];
  [[0,1,0],[0,0,0],[0,-1,0],[0,-2,0]].forEach(a=>V('tail',tp[0],tp[1],tp[2],...a,'tail'));
  for(let y=-3;y>=-8;y--){V('tail',tp[0],tp[1],tp[2],0,y,0,'tail');V('tail',tp[0],tp[1],tp[2],0,y,-1,'tail');}
  V('tail',tp[0],tp[1],tp[2],0,-9,-1,'tail');

  /* kaki */
  const LEG_ORDER=['FL','FR','RL','RR'];
  const legP={FL:[-1.5,BY+.5,2.5],FR:[1.5,BY+.5,2.5],RL:[-1.5,BY+.5,-4.5],RR:[1.5,BY+.5,-4.5]};
  for(const id of LEG_ORDER){
    const p=legP[id];
    for(const x of[-.5,.5])for(const z of[-.5,.5]){
      for(const y of[.5,-.5,-1.5,-2.5,-3.5])V('u'+id,p[0],p[1],p[2],x,y,z,'leg',id);
      const q=[p[0],p[1]-4,p[2]];
      for(const y of[.5,-.5,-1.5,-2.5])V('l'+id,q[0],q[1],q[2],x,y,z,'leg',id);
      V('l'+id,q[0],q[1],q[2],x,-3.5,z,'hoof',id);
    }
  }

  /* pewarnaan dua motif */
  const SOCKS=new Set(['FL','RR']);
  function paint(v,motif){
    const x=v.wx,y=v.wy,z=v.wz;
    const dth=.93+.13*hash3(x*3.71+11.3,y*2.93+5.7,z*3.37+2.1);
    const grd=.90+.10*clamp((y-.5)/12,0,1);
    let r,g,b;
    if(v.tag==='mane'||v.tag==='tail'){
      if(motif===0){r=.94;g=.87;b=.66}else{r=.15;g=.15;b=.19}
    }else if(v.tag==='hoof'){
      if(motif===0){const s=SOCKS.has(v.data);r=s?.88:.36;g=s?.85:.27;b=s?.8:.22;}
      else{const w=vnoise(x*.34+7.3,y*.34,z*.34)>.5;r=g=w?.82:.14;b=w?.84:.17;}
    }else if(v.tag==='leg'){
      if(motif===0){if(SOCKS.has(v.data)&&y<3.4){r=.96;g=.94;b=.9}else{r=.58;g=.35;b=.19}}
      else{const w=vnoise(x*.34+7.3,y*.34,z*.34)>.5;r=g=w?.96:.1;b=w?.97:.13;}
    }else{
      if(motif===0){
        r=.58;g=.35;b=.19;
        if(v.tag==='head'&&(v.lz>=4||(v.lx===0&&v.ly>=1&&v.lz>=0))){r=.96;g=.94;b=.9}
      }else{
        const w=vnoise(x*.34+7.3,y*.34,z*.34)>.5;
        r=g=w?.96:.1;b=w?.97:.13;
        if(v.tag==='head'&&v.lx===0&&v.ly>=1){r=.96;g=.96;b=.97}
      }
    }
    if(v.tag==='head'){
      if(Math.abs(v.lx)===1&&v.ly===1&&v.lz===1){r=.1;g=.07;b=.06}
      else if(v.lz===5&&v.ly===-1&&Math.abs(v.lx)===1){r=.35;g=.22;b=.2}
      else if(v.lz===5){if(motif===0){r=.33;g=.2;b=.15}else{r=.86;g=.64;b=.6}}
    }
    const f=dth*grd;return[r*f,g*f,b*f];
  }

  defs.forEach(d=>{
    const n=d.vox.length;
    d.colA=new Float32Array(n*3);d.colB=new Float32Array(n*3);
    d.vox.forEach((v,i)=>{
      const a=paint(v,0),b=paint(v,1);
      d.colA.set(a,i*3);d.colB.set(b,i*3);
    });
  });

  return{defsList:[...defs.values()],LEG_ORDER,legP};
})();

const HORSE_OFFS_WALK=[Math.PI*.5,Math.PI*1.5,0,Math.PI];
const HORSE_OFFS_RUN=[3.35,3.85,0,.5];
const HORSE_PRESETS={
  idle:{freq:0,A1:0,A2:0,A2ph:0,bendF:0,bendR:0,lag:1.1,hindSwing:1,idleW:1,bob:.22,bobRate:1.5,pitchA:.012,pitchB:0,rollA:.016,surge:0,
        neckB:.5,neckO:.04,neckRate:.6,neckPh:.7,headB:-.46,headO:.05,headRate:.7,headPh:1.1,tailA:.16,tailF:.5,hgt:0,eatW:0,offs:HORSE_OFFS_WALK},
  walk:{freq:1.9,A1:.52,A2:.07,A2ph:1.4,bendF:.42,bendR:.55,lag:1.15,hindSwing:1.06,idleW:0,bob:.28,bobRate:3.8,pitchA:.03,pitchB:0,rollA:.02,surge:.32,
        neckB:.58,neckO:.07,neckRate:1.9,neckPh:1.6,headB:-.5,headO:.07,headRate:1.9,headPh:3.14,tailA:.24,tailF:.9,hgt:0,eatW:0,offs:HORSE_OFFS_WALK},
  run :{freq:3.6,A1:1.02,A2:.24,A2ph:1.2,bendF:1.18,bendR:1.3,lag:1.05,hindSwing:1.18,idleW:0,bob:.8,bobRate:3.6,pitchA:.12,pitchB:-.03,rollA:.01,surge:.7,
        neckB:.68,neckO:.18,neckRate:3.6,neckPh:2.1,headB:-.34,headO:.16,headRate:3.6,headPh:2.6,tailA:.5,tailF:1.3,hgt:0,eatW:0,offs:HORSE_OFFS_RUN},
  eat :{freq:0,A1:0,A2:0,A2ph:0,bendF:0,bendR:0,lag:1.1,hindSwing:1,idleW:0,bob:.1,bobRate:.9,pitchA:0,pitchB:.16,rollA:0,surge:0,
        neckB:2.28,neckO:.02,neckRate:.35,neckPh:0,headB:-1.08,headO:.05,headRate:7,headPh:0,tailA:.3,tailF:.45,hgt:-.9,eatW:1,offs:HORSE_OFFS_WALK},
};
const HORSE_JP={ANT:.22,LN:.16,AIR:.5,LN2:.18,REC:.26};
HORSE_JP.TOT=HORSE_JP.ANT+HORSE_JP.LN+HORSE_JP.AIR+HORSE_JP.LN2+HORSE_JP.REC;

const Mob_Horse={
  SCALE:0.105,
  BY:7.5,

  /* ---------------- model ---------------- */
  build(){
    const g=new THREE.Group();g.scale.setScalar(this.SCALE);
    const parts={};
    const body=new THREE.Group();body.position.set(0,this.BY,0);g.add(body);parts.body=body;
    const neck=new THREE.Group();neck.position.set(0,4.75,2.5);body.add(neck);parts.neck=neck;
    const head=new THREE.Group();head.position.set(0,7.5,0);neck.add(head);parts.head=head;
    const tail=new THREE.Group();tail.position.set(0,4.5,-6);body.add(tail);parts.tail=tail;

    const up=[],low=[];
    for(const id of HORSE_DATA.LEG_ORDER){
      const p=HORSE_DATA.legP[id];
      const gu=new THREE.Group();gu.position.set(p[0],p[1]-this.BY,p[2]);body.add(gu);up.push(gu);
      const gl=new THREE.Group();gl.position.set(0,-4,0);gu.add(gl);low.push(gl);
    }
    parts.up=up;parts.low=low;

    if(!this._boxGeo)this._boxGeo=new THREE.BoxGeometry(1,1,1);
    const mat=new THREE.MeshLambertMaterial({color:0xffffff});
    const motif=Math.random()<0.5?0:1;
    const c=new THREE.Color(),m4=new THREE.Matrix4();

    for(const d of HORSE_DATA.defsList){
      const im=new THREE.InstancedMesh(this._boxGeo,mat,d.vox.length);
      d.vox.forEach((v,i)=>{m4.setPosition(v.lx,v.ly,v.lz);im.setMatrixAt(i,m4);});
      const src=motif?d.colB:d.colA;
      for(let i=0;i<d.vox.length;i++){
        c.setRGB(src[i*3],src[i*3+1],src[i*3+2]);
        im.setColorAt(i,c);
      }
      if(im.instanceColor)im.instanceColor.needsUpdate=true;
      im.castShadow=false;

      let host;
      if(d.key==='body')host=body;
      else if(d.key==='neck')host=neck;
      else if(d.key==='head')host=head;
      else if(d.key==='tail')host=tail;
      else{
        const idx=HORSE_DATA.LEG_ORDER.indexOf(d.key.slice(1));
        host=d.key[0]==='u'?up[idx]:low[idx];
      }
      host.add(im);
    }

    return{mesh:g,parts};
  },

  /* ---------------- helper animasi ---------------- */
  damp:(a,b,k,dt)=>b+(a-b)*Math.exp(-k*dt),
  ease3:t=>t*t*(3-2*t),
  envHold(u,ui,uo){
    if(u<ui)return this.ease3(u/ui);
    if(u<uo)return 1;
    return 1-this.ease3((u-uo)/(1-uo));
  },

  mode(m){
    if((m.grazeT||0)>0)return'eat';
    const sp=Math.hypot(m.vel.x,m.vel.z);
    if(sp>3.0)return'run';
    if(sp>0.4)return'walk';
    return'idle';
  },

  initState(m){
    const C=Object.assign({},HORSE_PRESETS.idle);
    C.offs=HORSE_PRESETS.idle.offs.slice();
    m.horse={
      C,tt:Math.random()*10,phase:Math.random()*6,bb:Math.random()*6,nn:Math.random()*6,hh:Math.random()*6,
      cur:{a:[0,0,0,0],b:[0,0,0,0],hgt:0,pitch:0,roll:0,surge:0,
           neck:.5,head:-.46,neckYaw:0,headYaw:0,tailX:.45,tailZ:0},
      nextFlick:2,flickT:9,flickSide:1,jDelay:Math.random()*0.12,
      action:null,nextAction:1.2+Math.random()*2.2,
      jump:{active:false,t:0,ret:'idle'},
    };
  },

  pickIdleAction(){
    const r=Math.random();
    if(r<.30)return{type:'look',side:Math.random()<.5?-1:1,t:0,dur:2.8};
    if(r<.55)return{type:'sniff',side:0,t:0,dur:2.4};
    if(r<.75)return{type:'paw',side:Math.random()<.5?-1:1,t:0,dur:1.15};
    return{type:'swish',side:0,t:0,dur:0.9};
  },

  applyIdleAction(o,a,u,W){
    if(a.type==='look'){
      const e=this.envHold(u,.2,.7);
      o.neck+=-.28*e*W;o.head+=-.22*e*W;
      o.neckYaw+=a.side*.38*e*W;o.headYaw+=a.side*.55*e*W;
      o.hgt+=.08*e*W;
    }else if(a.type==='sniff'){
      const e=this.envHold(u,.22,.68);
      o.neck+=.55*e*W;o.head+=.42*e*W;
      o.head+=.05*Math.sin(a.t*9)*e*W;
      o.hgt+=-.1*e*W;
    }else if(a.type==='paw'){
      const e=Math.pow(Math.sin(Math.PI*u),1.3);
      const li=a.side>0?0:1;
      o.b[li]+=1.05*e*W;o.a[li]+=-.16*e*W;
      o.hgt+=-.12*e*W;o.head+=.08*e*W;
    }else if(a.type==='swish'){
      o.tailZ+=.8*Math.sin(u*Math.PI*2.5)*(1-u*.4)*W;
      o.tailX+=-.12*Math.sin(Math.PI*u)*W;
    }
  },

  updateIdle(H,o,tt,dt){
    const W=H.C.idleW;
    if(W<.02)return;
    if(!H.action&&!H.jump.active&&tt>H.nextAction&&W>.5){
      H.action=this.pickIdleAction();
    }
    if(H.action){
      const a=H.action;a.t+=dt;
      const u=a.t/a.dur;
      if(u>=1){H.action=null;H.nextAction=tt+1.2+Math.random()*2.6;}
      else this.applyIdleAction(o,a,u,W);
    }
  },

  applyJump(o,jt,C){
    const{ANT,LN,AIR,LN2}=HORSE_JP;
    o.roll=0;o.surge=0;
    if(jt<ANT){
      const u=jt/ANT,e=u*u;
      o.hgt=-2.3*e;o.pitch=.06*e;
      o.neck=C.neckB-.55*e;o.head=C.headB+.35*e;
      o.a[0]=o.a[1]=.3*e;o.b[0]=o.b[1]=.85*e;
      o.a[2]=o.a[3]=-.28*e;o.b[2]=o.b[3]=.85*e;
    }else if(jt<ANT+LN){
      const u=(jt-ANT)/LN,e=1-(1-u)*(1-u);
      o.hgt=-2.3+3.4*e;o.pitch=.06-.4*e;
      o.neck=C.neckB-.55+.95*e;o.head=C.headB+.35-.8*e;
      o.a[0]=o.a[1]=.3-.15*e;o.b[0]=o.b[1]=.85+.3*e;
      o.a[2]=o.a[3]=-.28+1.3*e;o.b[2]=o.b[3]=.85*(1-e);
    }else if(jt<ANT+LN+AIR){
      const u=(jt-ANT-LN)/AIR;
      o.hgt=1.1+4.9*4*u*(1-u);o.pitch=-.34+.5*u;
      o.neck=C.neckB+.4-.2*u;o.head=C.headB-.45+.3*u;o.tailX=.22;
      if(u<.5){const v=u*2;o.a[0]=o.a[1]=.15+.2*v;o.b[0]=o.b[1]=1.15+.1*v;}
      else{const v=(u-.5)*2;o.a[0]=o.a[1]=.35-1.05*v;o.b[0]=o.b[1]=1.25*(1-.7*v);}
      o.a[2]=o.a[3]=1.02-1.75*u;o.b[2]=o.b[3]=1.2*Math.min(1,u*1.7);
    }else if(jt<ANT+LN+AIR+LN2){
      const u=(jt-ANT-LN-AIR)/LN2,e=Math.sin(u*Math.PI);
      o.hgt=-1.6*e;o.pitch=.17*(1-u);
      o.neck=C.neckB+.2*(1-u);o.head=C.headB-.15*(1-u);
      o.a[0]=o.a[1]=-.7*(1-u);o.b[0]=o.b[1]=.75*e;
      o.a[2]=o.a[3]=-.6*(1-u);o.b[2]=o.b[3]=.7*e;
    }else{
      o.hgt=0;o.pitch=0;o.neck=C.neckB;o.head=C.headB;
      o.a[0]=o.a[1]=o.a[2]=o.a[3]=0;o.b[0]=o.b[1]=o.b[2]=o.b[3]=0;
    }
  },

  computeTargets(m,H,dt){
    const C=H.C,p=H.phase,bb=H.bb,nn=H.nn,hh=H.hh;
    const o={a:[0,0,0,0],b:[0,0,0,0],neckYaw:0,headYaw:0};
    const lagH=Math.max(.35,C.lag-.25);

    for(let i=0;i<4;i++){
      const off=C.offs[i];
      const sw=i<2?1:C.hindSwing;
      o.a[i]=sw*(C.A1*Math.sin(p+off)+C.A2*Math.sin(2*(p+off)+C.A2ph));
      if(i<2){
        const w=Math.pow(Math.max(0,Math.sin(p+off-C.lag)),1.15);
        o.b[i]=C.bendF*w;
      }else{
        const w=Math.pow(Math.max(0,Math.sin(p+off-lagH)),1.15);
        o.b[i]=C.bendR*w;
      }
    }

    o.hgt=C.hgt+C.bob*Math.sin(bb);
    o.pitch=C.pitchB+C.pitchA*Math.sin(bb+1.9);
    o.roll=C.rollA*Math.sin(bb*.5+.7);
    o.surge=C.surge*Math.sin(p+1.5708)*.45;
    o.neck=C.neckB+C.neckO*Math.sin(nn+C.neckPh);
    o.head=C.headB+C.headO*Math.sin(hh+C.headPh);
    o.tailX=.45+.07*Math.sin(H.tt*1.6+H.phase);
    o.tailZ=C.tailA*Math.sin(H.tt*C.tailF*3+H.phase*2)+.06*Math.sin(H.tt*.9+H.phase);
    o.a[0]-=.10*C.eatW;o.a[1]+=.06*C.eatW;

    /* sentilan kepala kecil saat idle */
    if(C.freq<.5){
      if(H.tt>H.nextFlick){H.flickT=0;H.flickSide=Math.random()<.5?-1:1;H.nextFlick=H.tt+2.5+Math.random()*4;}
      if(H.flickT<.6){
        H.flickT+=dt;
        o.headYaw+=H.flickSide*.28*Math.sin(Math.PI*Math.min(1,H.flickT/.6));
        o.neckYaw+=o.headYaw*.4;
      }
    }

    this.updateIdle(H,o,H.tt,dt);

    if(H.jump.active){
      const jt=H.jump.t-H.jDelay;
      if(jt>=0)this.applyJump(o,jt,C);
    }
    return o;
  },

  /* ---------------- loop animasi ---------------- */
  animate(m,dt){
    if(!m.horse)this.initState(m);
    const H=m.horse;
    H.tt+=dt;

    const mode=this.mode(m);
    const target=HORSE_PRESETS[mode];

    /* haluskan channel menuju preset */
    for(const k in target){
      if(k==='offs')continue;
      H.C[k]=this.damp(H.C[k],target[k],3.2,dt);
    }
    for(let i=0;i<4;i++)H.C.offs[i]=this.damp(H.C.offs[i],target.offs[i],2.2,dt);

    H.phase+=dt*H.C.freq;
    H.bb+=dt*H.C.bobRate;
    H.nn+=dt*H.C.neckRate;
    H.hh+=dt*H.C.headRate;

    /* lompat visual sesekali saat lari/kabur */
    if(!H.jump.active&&mode==='run'&&m.onGround&&Math.random()<dt*0.10){
      H.jump.active=true;H.jump.t=0;H.jump.ret=mode;
    }
    if(H.jump.active){
      H.jump.t+=dt;
      if(H.jump.t>HORSE_JP.TOT+0.32)H.jump.active=false;
    }

    const o=this.computeTargets(m,H,dt);
    const c=H.cur,kr=13,kp=11;
    for(let i=0;i<4;i++){
      c.a[i]=this.damp(c.a[i],o.a[i],kr,dt);
      c.b[i]=this.damp(c.b[i],o.b[i],kr,dt);
    }
    c.hgt=this.damp(c.hgt,o.hgt,kp,dt);
    c.pitch=this.damp(c.pitch,o.pitch,kp,dt);
    c.roll=this.damp(c.roll,o.roll,kp,dt);
    c.surge=this.damp(c.surge,o.surge,kp,dt);
    c.neck=this.damp(c.neck,o.neck,10,dt);
    c.head=this.damp(c.head,o.head,10,dt);
    c.neckYaw=this.damp(c.neckYaw,o.neckYaw,8,dt);
    c.headYaw=this.damp(c.headYaw,o.headYaw,8,dt);
    c.tailX=this.damp(c.tailX,o.tailX,8,dt);
    c.tailZ=this.damp(c.tailZ,o.tailZ,8,dt);

    /* terapkan ke rig */
    const P=m.parts;
    P.body.position.y=this.BY+c.hgt;
    P.body.position.z=c.surge;
    P.body.rotation.x=c.pitch;
    P.body.rotation.z=c.roll;
    P.neck.rotation.x=c.neck;P.neck.rotation.y=c.neckYaw;
    P.head.rotation.x=c.head;P.head.rotation.y=c.headYaw;
    P.tail.rotation.x=c.tailX;P.tail.rotation.z=c.tailZ;
    for(let i=0;i<4;i++){
      P.up[i].rotation.x=c.a[i];
      P.low[i].rotation.x=c.b[i];
    }
  },
};
window.Mob_Horse=Mob_Horse;
