'use strict';
/* =============================================================================
   ENTITAS MOB: KELABANG RAKSASA (Giant Centipede) — BOSS
   -----------------------------------------------------------------------------
   Boss langka penghuni biome TANAH MERAH (REDLANDS). Diporting & disederhanakan
   dari "NEW MODEL/kelabang_boss.html".

   Tubuh terdiri dari KEPALA + beberapa RUAS badan berkaki. Ruas mengikuti jejak
   kepala (breadcrumb trail) sehingga tubuh melata seperti kelabang sungguhan.

   Mekanik khusus (ditangani js/monsters.js, bukan di sini):
     - HP 50% → tubuh terbelah jadi 2 kelabang independen (segCount dibagi).
     - Mati   → tiap ruas terlepas menjadi entitas 'kelabang_part' yang
                menggelinding, bisa diserang, dan menjatuhkan 'centipede_shell'.

   Objek yang diekspos:
     window.Mob_Kelabang       → kepala + ruas + kaki + animasi melata
     window.Mob_Kelabang_part  → potongan ruas yang menggelinding (kulit kelabang)

   CATATAN MATERIAL: material dibuat BARU per-build (bukan dibagikan antar-mob),
   supaya efek flash saat kena hit (Monsters.animate menulis .emissive) tidak
   bocor ke kelabang lain di layar.
   ============================================================================= */

const Mob_Kelabang=(()=>{

  /* palet warna karapas (dari kelabang_boss.html) */
  const C={
    carapace:0x96332c, carapace2:0xa13a30, dark:0x5f1d1a, belly:0xd9a066,
    leg:0x71231d, legDark:0x471512, bone:0xe7d9b8
  };
  const MAXSEG=7;          // jumlah ruas badan maksimum (di luar kepala)
  const SEG=1.55;          // jarak antar ruas (unit lokal) — badan ~1.6 dalam,
                           // jadi ruas saling menyambung rapat tanpa menumpuk
  const SCALE=1.86;        // skala keseluruhan model (3× dari 0.62 sebelumnya)

  /* set material baru per pemanggilan build (lihat catatan di atas) */
  function makeMats(){
    const mk=c=>new THREE.MeshLambertMaterial({color:c});
    return {
      carapace:mk(C.carapace), carapace2:mk(C.carapace2), dark:mk(C.dark),
      belly:mk(C.belly), leg:mk(C.leg), legDark:mk(C.legDark), bone:mk(C.bone),
    };
  }
  const box=(parent,mat,x,y,z,w,h,d)=>{
    const ms=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    ms.position.set(x,y,z);ms.castShadow=!IS_MOBILE;parent.add(ms);return ms;
  };

  /* ---------- kepala kelabang: karapas, rahang, taring bisa, antena, mata ---------- */
  function buildHead(M){
    const g=new THREE.Group();
    box(g,M.carapace, 0,0.28,0,   1.5,0.95,1.25);
    box(g,M.dark,     0,0.80,-0.05,1.6,0.28,1.1);
    box(g,M.dark,     0,0.72,0.60, 1.55,0.22,0.5);
    box(g,M.carapace, 0,0.18,0.72, 1.05,0.62,0.5);
    box(g,M.dark,     0.78,0.30,0.30, 0.22,0.55,0.8);
    box(g,M.dark,    -0.78,0.30,0.30, 0.22,0.55,0.8);
    box(g,M.dark,     0,0.35,-0.70, 1.15,0.70,0.4);
    box(g,M.bone,     0.42,0.95,-0.2, 0.22,0.3,0.22);
    box(g,M.bone,    -0.42,0.95,-0.2, 0.22,0.3,0.22);
    /* mata menyala (MeshBasic agar tak gelap malam) */
    const eyeMat=new THREE.MeshBasicMaterial({color:0xb9ff2e});
    for(const s of[1,-1]){
      box(g,eyeMat, s*0.50,0.55,0.70, 0.30,0.22,0.14);
      box(g,eyeMat, s*0.68,0.50,0.52, 0.12,0.12,0.10);
    }
    /* rahang bawah */
    const jaw=new THREE.Group();jaw.position.set(0,-0.24,0.60);g.add(jaw);
    box(jaw,M.dark, 0,0,0.18, 0.8,0.18,0.42);
    /* antena kiri-kanan */
    const antGeo=(side)=>{
      const A=new THREE.Group();
      box(A,M.carapace2, 0,0,0.28, 0.12,0.12,0.5);
      box(A,M.dark, side*0.10,0.12,0.62, 0.10,0.10,0.42);
      box(A,M.dark, side*0.22,0.26,0.90, 0.08,0.08,0.36);
      box(A,M.bone, side*0.32,0.42,1.12, 0.07,0.07,0.26);
      return A;
    };
    const antR=antGeo(1);antR.position.set(0.34,0.62,0.55);g.add(antR);
    const antL=antGeo(-1);antL.position.set(-0.34,0.62,0.55);g.add(antL);
    /* taring bisa (forcipules) */
    const clawGeo=(side)=>{
      const K=new THREE.Group();
      box(K,M.bone, 0,0,0.30, 0.22,0.24,0.6);
      box(K,M.bone, -side*0.12,-0.02,0.64, 0.2,0.2,0.34);
      box(K,M.legDark, -side*0.20,-0.04,0.86, 0.14,0.16,0.2);
      return K;
    };
    const clawR=clawGeo(1);clawR.position.set(0.42,-0.12,0.66);g.add(clawR);
    const clawL=clawGeo(-1);clawL.position.set(-0.42,-0.12,0.66);g.add(clawL);
    return {group:g,jaw,antR,antL,clawR,clawL};
  }

  /* ---------- satu ruas badan + sepasang kaki ---------- */
  function buildSegment(M,idx){
    const g=new THREE.Group();
    const main=idx%2?M.carapace2:M.carapace;
    box(g,main,   0,0.42,0,   1.5,0.50,1.6);
    box(g,M.dark, 0,0.66,0,   0.5,0.16,1.35);
    box(g,M.dark,  0.80,0.16,0, 0.24,0.48,1.55);
    box(g,M.dark, -0.80,0.16,0, 0.24,0.48,1.55);
    box(g,M.belly,0,-0.10,0,  1.0,0.30,1.35);
    /* duri punggung pada ruas depan */
    if(idx<=2){
      for(const s of[1,-1]){
        box(g,M.bone, s*0.40,0.78,-0.10, 0.26,0.26,0.26);
        box(g,M.bone, s*0.40,0.98,-0.10, 0.18,0.20,0.18);
      }
    }
    /* sepasang kaki bersendi */
    const legs=[];
    for(const side of[1,-1]){
      const hip=new THREE.Group();
      hip.position.set(side*0.62,-0.26,0);
      box(hip,M.leg, side*0.36,0,0, 0.78,0.22,0.26);
      box(hip,M.legDark, side*0.70,-0.10,0, 0.24,0.26,0.26);
      const knee=new THREE.Group();
      knee.position.set(side*0.78,-0.26,0);
      box(knee,M.leg, 0,-0.28,0, 0.20,0.56,0.22);
      box(knee,M.legDark, 0,-0.54,0.06, 0.18,0.12,0.26);
      hip.add(knee);g.add(hip);
      legs.push({hip,knee,side});
    }
    /* ekor pada ruas terakhir */
    if(idx===MAXSEG-1){
      box(g,M.dark, 0,0.36,-1.05, 0.85,0.40,0.6);
      box(g,M.bone, 0,0.34,-1.45, 0.45,0.28,0.45);
      box(g,M.bone, 0,0.32,-1.78, 0.28,0.22,0.28);
    }
    return {group:g,legs};
  }

  const Mob_Kelabang={
    MAXSEG, SEG, SCALE,

    /* ---------- MODEL 3D ----------
       Kepala di root; ruas ditambahkan sebagai anak root tapi diposisikan tiap
       frame mengikuti jejak (trail) di ruang LOKAL root. */
    build(boss){
      const g=new THREE.Group();
      const parts={};
      g.scale.setScalar(SCALE);
      const M=makeMats();

      const H=buildHead(M);
      g.add(H.group);
      parts.head=H.group;parts.jaw=H.jaw;parts.antR=H.antR;parts.antL=H.antL;
      parts.clawR=H.clawR;parts.clawL=H.clawL;

      parts.segments=[];parts.segLegs=[];
      for(let i=0;i<MAXSEG;i++){
        const S=buildSegment(M,i);
        S.group.position.set(0,0,-(i+1)*SEG);
        g.add(S.group);
        parts.segments.push(S.group);
        parts.segLegs.push(S.legs);
      }
      return {mesh:g,parts};
    },

    /* ---------- sampel titik pada jejak sejauh `dist` di belakang kepala ---------- */
    _sampleTrail(trail,dist){
      if(trail.length<2)return trail[0]||null;
      let acc=0;
      for(let i=0;i<trail.length-1;i++){
        const a=trail[i],b=trail[i+1];
        const d=Math.hypot(b.x-a.x,b.z-a.z,b.y-a.y)||1e-4;
        if(acc+d>=dist){
          const t=(dist-acc)/d;
          return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};
        }
        acc+=d;
      }
      return trail[trail.length-1];
    },

    /* ---------- ANIMASI: tubuh melata mengikuti jejak kepala ---------- */
    animate(m,dt){
      const t=performance.now()*0.001;
      const P=m.parts;
      const head=m.pos;
      const h=m.mesh.rotation.y;
      const cos=Math.cos(h),sin=Math.sin(h);

      /* jejak breadcrumb (ruang dunia). Kepala = m.pos.
         Total panjang badan (dunia) = MAXSEG*SEG*SCALE; jejak harus menyimpan
         cukup titik untuk menutupi seluruh panjang itu + margin. */
      const bodyLen=MAXSEG*SEG*SCALE;              // panjang total tubuh (dunia)
      const seedN=MAXSEG*10;
      const seedStep=bodyLen*1.5/seedN;            // seed menutupi 1.5× panjang tubuh
      if(!m._trail){
        m._trail=[];
        for(let k=0;k<seedN;k++)
          m._trail.push(new THREE.Vector3(head.x-Math.sin(h)*k*seedStep,head.y,head.z-Math.cos(h)*k*seedStep));
      }
      const last=m._trail[0];
      const moved=Math.hypot(head.x-last.x,head.z-last.z);
      if(moved>0.06){
        m._trail.unshift(new THREE.Vector3(head.x,head.y,head.z));
        /* pangkas jejak berdasarkan JARAK KUMULATIF: simpan cukup titik untuk
           menutupi 1.4× panjang tubuh, apa pun kecepatan geraknya (saat lambat
           titik berdekatan, saat cepat titik berjauhan). */
        const keepDist=bodyLen*1.4;
        let acc=0;
        for(let k=0;k<m._trail.length-1;k++){
          const a=m._trail[k],b=m._trail[k+1];
          acc+=Math.hypot(b.x-a.x,b.z-a.z,b.y-a.y);
          if(acc>keepDist){m._trail.length=k+2;break;}
        }
      }else{
        last.y+=(head.y-last.y)*Math.min(1,dt*8); // tetap ikuti ketinggian saat diam
      }

      /* jumlah ruas aktif (berkurang saat tubuh terbelah). Default penuh. */
      const active=(m.segCount!==undefined)?m.segCount:MAXSEG;
      m.gaitPhase=(m.gaitPhase||0)+(moved*3.2+dt*1.2);
      const spd=Math.hypot(m.vel.x,m.vel.z);
      const ampK=Math.min(1,spd/2.2);

      /* liftY (lokal) = seberapa tinggi kepala & ruas depan TERANGKAT saat
         serangan SAMBARAN / SEMBURAN / TERJANG BUMI. Diisi oleh Monsters
         (m.liftY). Ruas depan ikut terangkat, meredam ke belakang. */
      const lift=m.liftY||0;

      for(let i=0;i<MAXSEG;i++){
        const seg=P.segments[i];
        if(i>=active){seg.visible=false;continue;}
        seg.visible=true;
        /* jarak DUNIA ruas ke kepala = spasi lokal SEG dikali skala model.
           Trail disimpan dalam koordinat dunia, jadi sampel juga dunia. */
        const sp=this._sampleTrail(m._trail,(i+1)*SEG*SCALE);
        if(!sp)continue;
        /* dunia → lokal root (rotasi -h, translasi -head) */
        const dwx=sp.x-head.x,dwz=sp.z-head.z;
        const lx=(dwx*cos-dwz*sin)/SCALE;
        const lz=(dwx*sin+dwz*cos)/SCALE;
        const ly=(sp.y-head.y)/SCALE;
        const rear=lift*Math.max(0,1-i*0.42);   // ruas depan terangkat
        seg.position.set(lx,ly+Math.sin(t*1.8+i*0.6)*0.04+rear,lz);
        /* yaw ruas: arah menuju sampel yang lebih dekat kepala */
        const spF=this._sampleTrail(m._trail,i*SEG*SCALE);
        if(spF){
          const ddx=spF.x-sp.x,ddz=spF.z-sp.z;
          if(ddx*ddx+ddz*ddz>1e-5){
            const worldYaw=Math.atan2(ddx,ddz);
            seg.rotation.y=worldYaw-h;
          }
        }
        /* kaki melangkah bergelombang */
        const legs=P.segLegs[i];
        if(legs)for(const L of legs){
          const ph=m.gaitPhase*1.4+i*0.85+(L.side>0?0:Math.PI);
          const swing=Math.sin(ph)*(0.18+0.34*ampK);
          const lift=Math.max(0,Math.cos(ph))*(0.2+0.3*ampK);
          L.hip.rotation.y=-L.side*swing;
          L.hip.rotation.z=L.side*(0.35+lift*0.5);
          L.knee.rotation.z=-L.side*(0.5+lift*0.6);
        }
      }

      /* idle kepala: antena bergoyang, rahang & taring menganga saat mengejar */
      const agg=m.state==='chase'?1:0.35;
      if(P.antR){P.antR.rotation.x=Math.sin(t*2.3)*0.12-agg*0.15;P.antR.rotation.y=Math.sin(t*1.4)*0.16;}
      if(P.antL){P.antL.rotation.x=Math.sin(t*2.3+1.3)*0.12-agg*0.15;P.antL.rotation.y=-Math.sin(t*1.4+0.6)*0.16;}
      const bite=Math.max(0,(m.biteT||0));
      if(m.biteT)m.biteT=Math.max(0,m.biteT-dt);
      /* rahang & taring lebih lebar saat menyembur/menyambar (attackJaw) */
      const aJaw=m.attackJaw||0;
      const jawO=agg*0.25+bite*1.4+aJaw;
      if(P.jaw)P.jaw.rotation.x=Math.min(1.0,jawO);
      if(P.clawR)P.clawR.rotation.y= 0.15+agg*0.5+bite*0.6+aJaw*0.5+Math.sin(t*3)*0.05;
      if(P.clawL)P.clawL.rotation.y=-(0.15+agg*0.5+bite*0.6+aJaw*0.5+Math.sin(t*3+0.7)*0.05);
      /* kepala: mengangguk pelan saat berjalan; TERANGKAT & mendongak saat
         serangan mengangkat tubuh (liftY), lalu menukik (headPitch). */
      P.head.position.y=Math.sin(t*1.9)*0.03+lift;
      P.head.rotation.x=(m.headPitch||0);
    },
  };

  /* =============================================================================
     POTONGAN RUAS KELABANG (kelabang_part)
     -----------------------------------------------------------------------------
     Muncul saat kelabang mati: tiap ruas terlepas & menggelinding. Bisa
     diserang; saat hancur menjatuhkan 'centipede_shell'. Model = satu ruas
     karapas sederhana.
     ============================================================================= */
  const Mob_Kelabang_part={
    build(){
      const g=new THREE.Group();
      const M=makeMats();
      const idx=(Math.random()*2)|0;
      const S=buildSegment(M,idx);
      /* kaki dilipat rapat (sudah mati) */
      for(const L of S.legs){L.hip.rotation.z=L.side*0.9;L.knee.rotation.z=-L.side*1.1;}
      S.group.position.y=0.5;
      g.add(S.group);
      g.scale.setScalar(SCALE);
      return {mesh:g,parts:{seg:S.group}};
    },
    animate(m,dt){
      /* menggelinding sesuai kecepatan horizontalnya */
      const spd=Math.hypot(m.vel.x,m.vel.z);
      m._roll=(m._roll||0)+spd*dt*3.2;
      if(m.parts.seg){
        m.parts.seg.rotation.x=m._roll;
        m.parts.seg.rotation.z=Math.sin(m._roll*0.5)*0.2;
      }
    },
  };

  window.Mob_Kelabang_part=Mob_Kelabang_part;
  return Mob_Kelabang;
})();
window.Mob_Kelabang=Mob_Kelabang;

/* =============================================================================
   PROYEKTIL RACUN KELABANG (SEMBURAN) — pool global
   -----------------------------------------------------------------------------
   Disemburkan saat serangan 'spit'. Di-update SEKALI per frame dari
   Monsters.update (mirip Mob_Lizard.updateAcid). Racun jatuh membusur, kena
   pemain → damage + noda racun kecil di tanah.
   ============================================================================= */
Mob_Kelabang.VENOM_MAX=40;
Mob_Kelabang._venom=null;
Mob_Kelabang._venomMeshes=null;
Mob_Kelabang.venomInit=function(){
  if(this._venom)return;
  this._venom=[];this._venomMeshes=[];
  const scene=(typeof Game!=='undefined'&&Game.scene)?Game.scene:null;
  for(let i=0;i<this.VENOM_MAX;i++){
    this._venom.push({life:0,dmg:6,pos:new THREE.Vector3(),vel:new THREE.Vector3(),
      hit:false,src:null});
    const mm=new THREE.Mesh(new THREE.BoxGeometry(0.30,0.30,0.30),
      new THREE.MeshBasicMaterial({color:0x8dff3a,transparent:true,opacity:0.95,
        blending:THREE.AdditiveBlending,depthWrite:false}));
    mm.visible=false;
    if(scene)scene.add(mm);
    this._venomMeshes.push(mm);
  }
};
/* semburkan racun: MENYEMBUR KE ATAS 5× secara acak di area sekitar kelabang.
   Tiap proyektil meluncur hampir vertikal dengan sebaran horizontal acak,
   lalu jatuh membusur ke tanah di area itu. Saat mendarat → lingkaran merah. */
Mob_Kelabang.venomBurst=function(m){
  this.venomInit();
  const mouth=new THREE.Vector3();
  if(m.parts&&m.parts.head){
    m.parts.head.getWorldPosition(mouth);
    mouth.y+=0.3;
  }else mouth.copy(m.pos).add(new THREE.Vector3(0,1.4,0));
  let spawned=0;
  const N=5;                              // 5× semburan ke atas
  for(let i=0;i<this.VENOM_MAX&&spawned<N;i++){
    const a=this._venom[i];
    if(a.life>0)continue;
    a.life=2.2;a.hit=false;a.dmg=Math.max(4,Math.round(m.dmg*0.6));
    a.src=m;
    a.pos.copy(mouth);
    /* arah acak di area: dominan ke atas + sebaran horizontal acak (segala arah) */
    const ang=Math.random()*Math.PI*2;
    const spread=rand(1.5,5.5);           // kecepatan horizontal acak
    a.vel.set(Math.sin(ang)*spread,rand(11,15),Math.cos(ang)*spread); // menyembur tinggi ke atas
    spawned++;
  }
  if(typeof Sfx!=='undefined'&&Sfx.at)Sfx.at(m.pos,'hit');
};
Mob_Kelabang.updateVenom=function(dt){
  if(!this._venom)return;
  const M=(typeof Monsters!=='undefined')?Monsters:null;
  for(let i=0;i<this.VENOM_MAX;i++){
    const a=this._venom[i],mm=this._venomMeshes[i];
    if(a.life>0){
      a.life-=dt;
      a.vel.y-=20*dt;
      a.pos.addScaledVector(a.vel,dt);
      /* kena siapa? pihak lawan ditentukan Monsters.projTarget, jadi semburan
         racun ikut melukai rekan NPC & pet (bukan hanya pemain) */
      if(!a.hit&&M&&M.projTarget){
        const v=M.projTarget(a.src,a.pos.x,a.pos.y,a.pos.z,1.0);
        if(v&&M.hitTarget(a.src,v,a.dmg,1.6,a.pos.x,a.pos.z,0)){
          a.hit=true;a.life=0;
          FX.debris(v.pos.clone().add(new THREE.Vector3(0,1,0)),0x8dff3a,6,2.2);
          FX.text(v.pos.clone().add(new THREE.Vector3(0,2.2,0)),'☣ racun','#8dff3a');
        }
      }
      /* mendarat di tanah: lingkaran MERAH sebagai tanda noda racun */
      const gy=(typeof World!=='undefined'&&World.groundAt)?World.groundAt(a.pos.x,a.pos.z,a.pos.y+2):0.15;
      if(a.pos.y<=gy+0.15){
        a.life=0;
        if(typeof FX!=='undefined'&&FX.ring){
          FX.ring(a.pos.x,gy+0.05,a.pos.z,0xff2a1a,0.9,3.2);   // lingkaran merah besar
          FX.ring(a.pos.x,gy+0.05,a.pos.z,0xff6b57,0.6,2.0);   // lingkaran merah dalam
        }
        FX.debris(new THREE.Vector3(a.pos.x,gy+0.1,a.pos.z),0xff3322,8,2.2);
        /* damage area kecil ke siapa pun yang berdiri di titik jatuh */
        if(M&&M.areaHit)M.areaHit(a.src,a.pos.x,a.pos.z,2.0,Math.round(a.dmg*0.6),0);
      }
      if(a.life>0){mm.visible=true;mm.position.copy(a.pos);mm.material.opacity=Math.min(1,a.life)*0.95;}
      else mm.visible=false;
    }else mm.visible=false;
  }
};
