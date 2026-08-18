'use strict';
/* =============================================================================
   ENTITAS MOB: SAPI (Cow)
   -----------------------------------------------------------------------------
   Port model + animasi dari "NEW MODEL/Sapi.html".
   Animasi: idle, walk, run, eat, sleep (lengkap dengan blend + kedip).
   Dipanggil Monsters.make() & Monsters.animate() lewat window.Mob_Cow.
   ============================================================================= */
const Mob_Cow={
  HP:[0,13.2,6],
  S:0.095,

  /* ---------------- model ---------------- */
  build(){
    const S=this.S,HP=this.HP;
    const g=new THREE.Group();g.scale.setScalar(S);
    const parts={};
    const mats={};
    const mat=c=>mats[c]||(mats[c]=new THREE.MeshLambertMaterial({color:c}));
    const box=(parent,hex,pv,x,y,z,w,h,d)=>{
      const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(hex));
      m.position.set(x-pv[0],y-pv[1],z-pv[2]);
      m.castShadow=(typeof IS_MOBILE!=='undefined')?!IS_MOBILE:false;
      parent.add(m);return m;
    };

    const C={
      WHITE:0xefe8d8, WHITE2:0xded5c2, WHITES:0xfbf8ef,
      BLACK:0x2e2a25, BLACK2:0x3b352d,
      SNOUT:0xd9ac92, SNOUTD:0xc09377, NOST:0x6d4a3a, MOUTH:0x5a3226,
      HORN:0xe6ddc6, HOOF:0x51463c, PINK:0xe8a8a4, TEAT:0xcf8f8c,
      EARP:0xd99a94, EYE:0x221a14
    };

    const rig=new THREE.Group();g.add(rig);parts.rig=rig;
    const body=new THREE.Group();rig.add(body);parts.body=body;
    const P0=[0,0,0];

    /* badan */
    box(body,C.WHITE,P0,0,11,0,9,8,12);
    box(body,C.WHITE2,P0,0,7.7,0,9.3,1.8,12.3);
    box(body,C.WHITE2,P0,0,15.2,3.4,7,.5,3);
    box(body,C.BLACK,P0,-4.6,12.4,2.6,.4,4.2,3.2);
    box(body,C.BLACK2,P0,-4.6,9.6,4.4,.4,2.2,2.4);
    box(body,C.BLACK,P0,-4.6,9.4,-3.9,.4,3,2.6);
    box(body,C.BLACK,P0,4.6,11.6,-1.2,.4,4.6,3.6);
    box(body,C.BLACK2,P0,4.6,13.2,3.8,.4,2.2,2.2);
    box(body,C.BLACK,P0,4.6,9.2,-4.6,.4,2.6,2);
    box(body,C.BLACK,P0,-1.6,15.2,2.2,3,.4,3);
    box(body,C.BLACK2,P0,2,15.2,-3.2,2.6,.4,2.6);
    box(body,C.BLACK,P0,1.4,12,-6.15,3,2.6,.4);
    box(body,C.PINK,P0,0,6.7,-3,4.2,2.2,3.4);
    box(body,C.TEAT,P0,-.95,5.5,-3.6,.7,1,.7);
    box(body,C.TEAT,P0,.95,5.5,-3.6,.7,1,.7);
    box(body,C.TEAT,P0,-.95,5.5,-2.5,.7,1,.7);
    box(body,C.TEAT,P0,.95,5.5,-2.5,.7,1,.7);

    /* kepala */
    const head=new THREE.Group();head.position.set(HP[0],HP[1],HP[2]);
    body.add(head);parts.head=head;
    box(head,C.WHITE,HP,0,13.2,6.3,5,5,2.8);
    box(head,C.WHITE,HP,0,14.8,9.7,6,6,6);
    box(head,C.BLACK2,HP,.9,17.95,8.8,3,.4,2.8);
    box(head,C.BLACK,HP,-3.12,15.4,9.4,.4,3.4,3.2);
    box(head,C.WHITES,HP,0,15.8,12.82,1.8,2.6,.4);
    box(head,C.SNOUT,HP,0,12.8,13.7,5,4,3);
    box(head,C.NOST,HP,-1.25,13.4,15.32,.8,.9,.3);
    box(head,C.NOST,HP,1.25,13.4,15.32,.8,.9,.3);
    box(head,C.NOST,HP,0,11.35,15.32,2.8,.4,.3);
    box(head,C.MOUTH,HP,0,10.7,14.6,4.4,.5,1.2);
    box(head,C.HORN,HP,-2.5,18.5,8.6,1.1,1.5,1.1);
    box(head,C.HORN,HP,-3.0,19.5,8.4,.7,1,.7);
    box(head,C.HORN,HP,2.5,18.5,8.6,1.1,1.5,1.1);
    box(head,C.HORN,HP,3.0,19.5,8.4,.7,1,.7);

    /* mata terbuka & tertutup */
    const eyesO=new THREE.Group();head.add(eyesO);parts.eyesO=eyesO;
    box(eyesO,C.EYE,HP,-3.12,15.9,11.2,.95,1.15,.35);
    box(eyesO,C.WHITES,HP,-2.9,16.25,11.25,.35,.35,.38);
    box(eyesO,C.EYE,HP,3.12,15.9,11.2,.95,1.15,.35);
    box(eyesO,C.WHITES,HP,3.34,16.25,11.25,.35,.35,.38);
    const eyesC=new THREE.Group();head.add(eyesC);parts.eyesC=eyesC;
    box(eyesC,C.EYE,HP,-3.12,15.9,11.2,1.3,.3,.35);
    box(eyesC,C.EYE,HP,3.12,15.9,11.2,1.3,.3,.35);

    /* telinga */
    const EL=[-3.05,17.5,8.9],ER=[3.05,17.5,8.9];
    const earL=new THREE.Group();earL.position.set(EL[0]-HP[0],EL[1]-HP[1],EL[2]-HP[2]);
    head.add(earL);parts.earL=earL;
    box(earL,C.WHITE,EL,-4.6,17.6,8.9,2.8,1.1,2);
    box(earL,C.BLACK2,EL,-5.8,17.6,8.9,.8,1.15,2.05);
    box(earL,C.EARP,EL,-4.5,17.0,8.9,2.3,.35,1.6);
    const earR=new THREE.Group();earR.position.set(ER[0]-HP[0],ER[1]-HP[1],ER[2]-HP[2]);
    head.add(earR);parts.earR=earR;
    box(earR,C.WHITE,ER,4.6,17.6,8.9,2.8,1.1,2);
    box(earR,C.BLACK2,ER,5.8,17.6,8.9,.8,1.15,2.05);
    box(earR,C.EARP,ER,4.5,17.0,8.9,2.3,.35,1.6);

    /* rahang bawah */
    const JP=[0,11.3,12.3];
    const jaw=new THREE.Group();jaw.position.set(JP[0]-HP[0],JP[1]-HP[1],JP[2]-HP[2]);
    head.add(jaw);parts.jaw=jaw;
    box(jaw,C.SNOUTD,JP,0,10.5,14,4.6,1.5,3.6);
    box(jaw,C.NOST,JP,0,11.1,15.75,4.7,.5,.3);

    /* ekor */
    const TP=[0,14.5,-6];
    const tail=new THREE.Group();tail.position.set(TP[0],TP[1],TP[2]);
    body.add(tail);parts.tail=tail;
    box(tail,C.WHITE,TP,0,13,-6.25,1,3.2,1);
    box(tail,C.WHITE2,TP,0,10,-6.3,.9,3,.9);
    box(tail,C.BLACK,TP,0,7.9,-6.35,1.7,2.1,1.7);
    box(tail,C.BLACK2,TP,0,6.6,-6.4,1.2,1.1,1.2);

    /* kaki */
    const legDefs=[[-2.7,3.6,C.BLACK,'legFL'],[2.7,3.6,null,'legFR'],
                   [-2.7,-3.6,C.BLACK2,'legBL'],[2.7,-3.6,null,'legBR']];
    for(const[x,z,spot,name]of legDefs){
      const lg=new THREE.Group();lg.position.set(x,7.5,z);
      rig.add(lg);parts[name]=lg;
      box(lg,C.WHITE,[x,7.5,z],x,4,z,2.6,8.4,2.6);
      if(spot)box(lg,spot,[x,7.5,z],x,6.2,z,2.7,3,2.7);
      box(lg,C.HOOF,[x,7.5,z],x,.75,z,2.75,1.5,2.75);
    }

    return{mesh:g,parts};
  },

  /* ---------------- animasi ---------------- */
  ss:x=>x*x*(3-2*x),
  burst:(t,f,p=6,ph=0)=>Math.max(0,Math.sin(t*f+ph))**p,

  P:{
    idle(t){return{
      rigY:0,pitch:0,roll:Math.sin(t*.55)*.018,
      headPitch:.06+Math.sin(t*.8)*.05,headYaw:Math.sin(t*.31)*.16,headRoll:Math.sin(t*.23)*.035,
      headExt:0,jaw:.03+Mob_Cow.burst(t,.5,10)*.1,
      earL:Mob_Cow.burst(t,.6,14)*.5,earR:Mob_Cow.burst(t,.6,14,2.4)*.5,earF:Math.sin(t*1.3)*.05,
      tailX:.08,tailZ:Math.sin(t*2.6)*(.25+Mob_Cow.burst(t,.4,3)*.6),
      fl:.03,fr:-.03,bl:.02,br:-.02,
      breathe:.006+.005*Math.sin(t*1.6),eye:0};},
    walk(t,f){const s=Math.sin(f);return{
      rigY:Math.abs(Math.cos(f))*.22,
      pitch:.03,roll:s*.035,
      headPitch:.1-Math.sin(2*f)*.07,headYaw:Math.sin(f*.5+1.2)*.09+s*.05,headRoll:s*.02,
      headExt:0,jaw:.02,
      earL:Mob_Cow.burst(t,.9,12)*.4,earR:Mob_Cow.burst(t,.9,12,1.8)*.4,earF:Math.sin(f*2)*.09,
      tailX:.06,tailZ:Math.sin(t*3.2)*.55,
      fl:s*.62+.06*Math.sin(2*f),fr:-s*.62-.06*Math.sin(2*f),
      bl:-s*.62-.06*Math.sin(2*f),br:s*.62+.06*Math.sin(2*f),
      breathe:.005,eye:0};},
    run(t,f){return{
      rigY:Math.abs(Math.sin(f))*.6+.1,
      pitch:.13+Math.sin(f+.9)*.075,roll:Math.sin(f)*.022,
      headPitch:.24+Math.sin(f+.9)*.1,headYaw:Math.sin(f*.5)*.04,headRoll:Math.sin(f)*.015,
      headExt:.5,jaw:.06,
      earL:.14,earR:.14,earF:.3+Math.sin(f*2)*.12,
      tailX:1.22+Math.sin(f)*.08,tailZ:Math.sin(t*6)*.28,
      fl:Math.sin(f)*1.02,fr:Math.sin(f+.32)*.95,
      bl:Math.sin(f-1.15)*1.02,br:Math.sin(f-.85)*.95,
      breathe:.012,eye:0};},
    eat(t){const m=Math.sin(t*7.2);
      const lift= Mob_Cow.burst(t-2,.9,18);
      return{
      rigY:0,pitch:.11,roll:Math.sin(t*.5)*.015,
      headPitch:(1.3+Math.sin(t*.9)*.03+Math.max(0,m)**2*.04)-lift*.55,
      headYaw:Math.sin(t*.42)*.27*(1-lift*.6),headRoll:Math.sin(t*.42+1.2)*.05,
      headExt:.5,jaw:(.06+(0.5+0.5*m)*.4)*(1-lift*.85)+.03,
      earL:Mob_Cow.burst(t,.7,12)*.4,earR:Mob_Cow.burst(t,.7,12,2)*.4,earF:Math.sin(t*1.1)*.07+.05,
      tailX:.12,tailZ:Math.sin(t*2.3)*.45,
      fl:.06,fr:.04,bl:-.03,br:-.05,
      breathe:.005,eye:0};},
    sleep(t){const b=Math.sin(t*1.15);return{
      rigY:-5.95,pitch:.02,roll:.11,
      headPitch:.9+b*.012,headYaw:.28,headRoll:.55,
      headExt:.35,jaw:.02,
      earL:.34,earR:.3,earF:.18+b*.02,
      tailX:.35,tailZ:.6+Math.sin(t*.35)*.1,
      fl:1.52,fr:1.45,bl:-1.45,br:-1.52,
      breathe:.016+.012*b,eye:1};},
  },

  state(m){
    if((m.sleepT||0)>0)return'sleep';
    if((m.grazeT||0)>0)return'eat';
    const sp=Math.hypot(m.vel.x,m.vel.z);
    if(sp>3.0)return'run';
    if(sp>0.4)return'walk';
    return'idle';
  },

  blendPose(from,to,k){
    const out={};
    for(const key in to){
      out[key]=(from&&from[key]!==undefined)?from[key]+(to[key]-from[key])*k:to[key];
    }
    return out;
  },

  applyPose(m,p){
    const P=m.parts,HP=this.HP;
    P.rig.position.y=p.rigY;
    P.rig.rotation.x=p.pitch;P.rig.rotation.z=p.roll;
    P.head.position.set(0,HP[1],HP[2]+p.headExt);
    P.head.rotation.set(p.headPitch,p.headYaw,p.headRoll);
    P.jaw.rotation.x=p.jaw;
    P.earL.rotation.z=(p.earL+p.earF);
    P.earR.rotation.z=-(p.earR+p.earF);
    P.tail.rotation.x=p.tailX;P.tail.rotation.z=p.tailZ;
    P.legFL.rotation.x=p.fl;P.legFR.rotation.x=p.fr;
    P.legBL.rotation.x=p.bl;P.legBR.rotation.x=p.br;
    const b=1+p.breathe;
    P.body.scale.set(1+(b-1)*.6,b,1+(b-1)*.3);
    const closed=p.eye>0.5;
    P.eyesO.visible=!closed;P.eyesC.visible=closed;
  },

  animate(m,dt){
    if(!m.cow){
      m.cow={state:'',t:0,blend:1,from:null,cur:null,
             nextBlink:2.5,blinkUntil:-1,moo:0};
    }
    const a=m.cow;
    a.t+=dt;
    const state=this.state(m);

    /* ganti state -> simpan pose terakhir untuk blending */
    if(state!==a.state){
      a.from=a.cur?Object.assign({},a.cur):null;
      a.state=state;a.t=0;a.blend=0;
    }
    a.blend=Math.min(1,a.blend+dt/0.55);

    /* fase langkah sinkron dengan kecepatan gerak */
    const sp=Math.hypot(m.vel.x,m.vel.z);
    if(state==='walk'||state==='run'){
      const stride=state==='walk'?2.2:2.9;
      m.gaitPh=(m.gaitPh||0)+(sp*dt/stride)*Math.PI*2;
    }

    let p;
    if(state==='idle')p=this.P.idle(a.t);
    else if(state==='walk')p=this.P.walk(a.t,m.gaitPh||0);
    else if(state==='run')p=this.P.run(a.t,m.gaitPh||0);
    else if(state==='eat')p=this.P.eat(a.t);
    else p=this.P.sleep(a.t);

    /* blend */
    if(a.blend<1&&a.from)p=this.blendPose(a.from,p,this.ss(a.blend));

    /* kedip */
    if(state!=='sleep'){
      if(a.t>a.nextBlink){a.blinkUntil=a.t+.13;a.nextBlink=a.t+2.2+Math.random()*3.4;}
      if(a.t<a.blinkUntil)p.eye=1;
    }

    /* impuls MOO saat terkena serangan */
    if(m.flash>0.15&&a.moo<0.05)a.moo=1;
    if(a.moo>0.001){
      a.moo*=Math.exp(-dt*2.1);
      p.headPitch-=a.moo*.55;p.jaw+=a.moo*.3;
      p.headYaw+=Math.sin(a.t*26)*.12*a.moo;
      p.tailZ+=Math.sin(a.t*24)*.5*a.moo;
    }

    this.applyPose(m,p);
    a.cur=p;
  },
};
window.Mob_Cow=Mob_Cow;
