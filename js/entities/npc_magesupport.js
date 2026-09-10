'use strict';
/* =============================================================================
   ENTITAS NPC: MAGE SUPPORT / IMAM PENDUKUNG (🔯)
   -----------------------------------------------------------------------------
   File mandiri: MODEL 3D (build) + ANIMASI (animate: idle/jalan/cast) +
   COMBAT skill pendukung (Healing Aura, Aura Perisai, Hujan Bintang Spirit).
   Diadaptasi dari prototipe NEW MODEL/Mage Support.html — imam berkerudung
   putih-emas dengan staff permata hijau. Pengembara langka (js/npc_rare.js).

   Perannya MURNI pendukung: ketiga skill menyasar TIM (pemain + seluruh
   rekan + pet yang dikeluarkan), bukan dirinya sendiri. Semua angka skill
   dinaikkan linear mengikuti n.level antara Lv 1 dan CFG.NPC_RARE_MAX_LEVEL
   (100) — lihat blok konstanta SUP di bawah.

   VFX skill (HUJAN BINTANG SPIRIT & AURA PERISAI) di-port 1:1 dari prototipe:
   geometri, material, warna dan kurva geraknya sama, hanya SEMUA UKURAN
   dikalikan SUP.S (0.62) karena rig in-game diperkecil ke tinggi manusia.
   Efek dunia dititipkan ke FX.trails (js/effects.js) yang sudah di-tick
   Game.loop tiap frame, sehingga mesh & materialnya otomatis dibuang walau
   mage-nya despawn di tengah efek — tidak ada kebocoran di mobile.
   ============================================================================= */

const NPC_Magesupport={

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
  /* palet warna persis prototipe: jubah putih krem + trim emas + permata hijau */
  C_SUP:{
    robe:0xf8f4e8, robeD:0xe8e0cc, trim:0xffd870, cape:0xf0e8d5,
    gold:0xe8c96a, goldD:0xc9a84a, belt:0xb8923a,
    skin:0xf5d5b8, hair:0xf8f0e0, hairD:0xd8cfc0, boot:0xd8cfc0,
    wood:0x8a5c2e, wrap:0xe8c96a,
    gem:0x4ade80, gemCore:0xaaffcc, eye:0x4ade80,
  },
  build(){
    const C=this.C_SUP;
    const B=(p,w,h,d,c,x,y,z,rx,ry,rz,b)=>this.box(p,w,h,d,c,x,y,z,rx,ry,rz,b);
    /* Prototipe dibuat setinggi ±3 unit; dunia game memakai tinggi manusia
       ±1.8 blok. Group luar hanya untuk skala, titik nol tetap di telapak. */
    const outer=new THREE.Group();
    const root=new THREE.Group();
    root.scale.setScalar(0.62);
    outer.add(root);

    /* sepatu boots tinggi (satu mesh per kaki; tungkai tertutup jubah) */
    const footL=B(root,.28,.22,.44,C.boot, .24,.11,.06);
    const footR=B(root,.28,.22,.44,C.boot,-.24,.11,.06);
    B(root,.3,.06,.46,C.gold, .24,.23,.06);
    B(root,.3,.06,.46,C.gold,-.24,.23,.06);

    /* jubah panjang sampai kaki + belahan depan & bordir emas */
    const robe=new THREE.Group();robe.position.set(0,1.52,0);root.add(robe);
    B(robe,1.2 ,.6 ,.94,C.robeD,0,-1.22,0);
    B(robe,1.08,.58,.84,C.robe ,0,-.68 ,0);
    B(robe,.98 ,.52,.76,C.robe ,0,-.2  ,0);
    B(robe,.4  ,.9 ,.06,C.robeD, .24,-.85,.46);      /* panel belahan kanan */
    B(robe,.4  ,.9 ,.06,C.robeD,-.24,-.85,.46);      /* panel belahan kiri  */
    B(robe,.07 ,.9 ,.07,C.gold , .45,-.85,.46);      /* trim tepi belahan   */
    B(robe,.07 ,.9 ,.07,C.gold ,-.45,-.85,.46);
    B(robe,.1  ,1.1,.05,C.trim ,0,-.8  ,.48);        /* bordir tengah       */
    B(robe,1.22,.08,.96,C.gold ,0,-1.48,0);          /* hem emas bawah      */
    B(robe,.22 ,.22,.05,C.gold ,0,-.45 ,.44,0,0,Math.PI/4,true); /* simbol dada */
    B(robe,.08 ,.8 ,.7 ,C.robeD, .56,-.8,0);         /* lipatan samping     */
    B(robe,.08 ,.8 ,.7 ,C.robeD,-.56,-.8,0);

    /* torso: dada, bahu emas, kerah tinggi, sabuk permata, cape belakang */
    const torso=new THREE.Group();torso.position.set(0,1.5,0);root.add(torso);
    B(torso,.9 ,.78,.58,C.robe ,0,.42,0);
    B(torso,.94,.3 ,.62,C.robeD,0,.78,0);
    B(torso,.32,.2 ,.66,C.gold , .5,.82,0);          /* pauldron kain       */
    B(torso,.32,.2 ,.66,C.gold ,-.5,.82,0);
    B(torso,.36,.1 ,.7 ,C.goldD, .5,.94,0);
    B(torso,.36,.1 ,.7 ,C.goldD,-.5,.94,0);
    B(torso,.56,.22,.5 ,C.robeD,0,.92,0);            /* kerah tinggi        */
    B(torso,.96,.18,.64,C.belt ,0,.08,0);            /* sabuk emas          */
    B(torso,.24,.18,.1 ,C.gold ,0,.08,.34);
    B(torso,.12,.12,.06,C.gem  ,0,.08,.4 ,0,0,Math.PI/4,true);
    B(torso,.07,.75,.05,C.gold , .16,.5 ,.3 ,0,0, .28); /* tali silang dada */
    B(torso,.07,.75,.05,C.gold ,-.16,.5 ,.3 ,0,0,-.28);
    const cape=B(torso,.84,1.35,.14,C.cape ,0,.08,-.36);  /* selendang belakang */
    B(torso,.86,.1 ,.16,C.gold ,0,-.58,-.36);
    B(torso,.05,.3 ,.05,C.gold ,0,.72,.3 );          /* liontin suci        */
    B(torso,.14,.18,.05,C.gem  ,0,.52,.3 ,0,0,Math.PI/4,true);

    /* kepala: wajah lembut + KERUDUNG priest (ciri khas, bukan rambut elf) */
    const head=new THREE.Group();head.position.set(0,1.05,0);torso.add(head);
    B(head,.68,.66,.68,C.skin,0,-.02,0);
    B(head,.1 ,.07,.03,0xf0b8a0, .24,-.1,.35,0,0,0,true);  /* blush pipi  */
    B(head,.1 ,.07,.03,0xf0b8a0,-.24,-.1,.35,0,0,0,true);
    const eyeL=B(head,.13,.16,.05,C.eye, .16,.02,.35,0,0,0,true); /* mata hijau */
    const eyeR=B(head,.13,.16,.05,C.eye,-.16,.02,.35,0,0,0,true);
    B(head,.16,.04,.04,C.hairD, .16,.16,.35);             /* alis          */
    B(head,.16,.04,.04,C.hairD,-.16,.16,.35);
    B(head,.1 ,.03,.03,0xd89888,0,-.2,.35,0,0,0,true);    /* senyum        */
    B(head,.82,.24,.82,C.robe ,0,.4 ,0);                  /* kerudung atas */
    B(head,.84,.5 ,.2 ,C.robe ,0,.12,-.38);               /* kerudung blkg */
    B(head,.18,.56,.7 ,C.robe , .39,.08,-.04);            /* sisi kanan    */
    B(head,.18,.56,.7 ,C.robe ,-.39,.08,-.04);            /* sisi kiri     */
    B(head,.76,.16,.12,C.robe ,0,.32,.36);                /* dahi          */
    B(head,.84,.06,.84,C.gold ,0,.51,0,0,0,0,true);       /* trim kerudung */
    B(head,.78,.06,.14,C.gold ,0,.39,.37,0,0,0,true);
    B(head,.2 ,.06,.72,C.gold , .4,.37,-.04,0,0,0,true);
    B(head,.2 ,.06,.72,C.gold ,-.4,.37,-.04,0,0,0,true);
    B(head,.5 ,.7 ,.16,C.robeD,0,-.28,-.44);              /* ekor kerudung */
    B(head,.3 ,.4 ,.12,C.robeD,0,-.78,-.45);
    B(head,.2 ,.14,.1 ,C.hair , .12,.24,.38);             /* poni tipis    */
    B(head,.14,.12,.1 ,C.hair ,-.14,.22,.38);

    /* lengan: pivot di bahu; lengan jubah lebar + manset emas khas priest */
    const arm=sx=>{
      const g=new THREE.Group();g.position.set(sx*.58,.62,0);torso.add(g);
      B(g,.32,.32,.34,C.robe ,0,.02 ,0);
      B(g,.3 ,.5 ,.32,C.robeD,0,-.32,0);
      B(g,.48,.42,.5 ,C.robe ,0,-.72,0);          /* lengan jubah lebar  */
      B(g,.5 ,.1 ,.52,C.gold ,0,-.55,0,0,0,0,true);
      B(g,.4 ,.16,.42,C.trim ,0,-.9 ,0);          /* manset emas         */
      B(g,.42,.05,.44,C.goldD,0,-.99,0,0,0,0,true);
      B(g,.18,.22,.2 ,C.skin ,0,-1.06,0);
      return g;
    };
    const armL=arm(1),armR=arm(-1);

    /* staff cokelat dengan permata hijau — anak lengan kanan (ikut ayunan) */
    const staff=new THREE.Group();staff.position.set(0,-.98,.06);armR.add(staff);
    B(staff,.11,2.7,.11,C.wood,0,.25,0);
    B(staff,.15,.3 ,.15,C.wrap,0,-.1 ,0);
    B(staff,.13,.08,.13,C.gold,0,1.42,0);
    B(staff,.06,.3,.06,C.wood, .11,1.52, .11, .35,0,-.3);   /* 4 cabang penyangga */
    B(staff,.06,.3,.06,C.wood,-.11,1.52, .11, .35,0, .3);
    B(staff,.06,.3,.06,C.wood, .11,1.52,-.11,-.35,0,-.3);
    B(staff,.06,.3,.06,C.wood,-.11,1.52,-.11,-.35,0, .3);
    const gemG=new THREE.Group();gemG.position.set(0,1.78,0);staff.add(gemG);
    B(gemG,.34,.5 ,.34,C.gem    ,0, 0  ,0,0,Math.PI/4,0,true);
    const core=B(gemG,.2,.72,.2,C.gemCore,0,0,0,0,Math.PI/4,0,true);
    B(gemG,.16,.22,.16,C.gem    ,0, .42,0,0,Math.PI/4,0,true);
    B(gemG,.14,.18,.14,C.gem    ,0,-.42,0,0,Math.PI/4,0,true);

    /* cahaya permata hanya di PC — PointLight terlalu mahal untuk mobile */
    let light=null;
    if(!IS_MOBILE){
      light=new THREE.PointLight(0x4ade80,1.6,7,2);
      light.position.set(0,1.8,0);
      staff.add(light);
    }

    return {
      mesh:outer,
      parts:{
        body:torso,head,armL,armR,legs:[footL,footR],bodyY:torso.position.y,
        rare:{kind:'magesupport',robe,cape,gemG,core,light,eyeL,eyeR,staff},
      },
    };
  },

  /* ==========================================================================
     KONSTANTA SKILL — semua angka yang bisa di-tune ada di sini.
     Skala linear mengikuti level: nilai = L1 + (L100-L1) * (level-1)/(CAP-1).
     ========================================================================== */
  SUP:{
    /* ---- COOLDOWN (detik) ----
       Healing Aura & Aura Perisai makin sering dipakai saat level naik
       (interpolasi linear Lv 1 → CFG.NPC_RARE_MAX_LEVEL, lihat lvHealCd/lvShCd):
         Healing Aura : 15 dtk @Lv 1 → 10 dtk @Lv 100
         Aura Perisai : 17 dtk @Lv 1 → 13 dtk @Lv 100
       Hujan Bintang Spirit tetap 14 dtk di semua level. */
    healCd1:15, healCd100:10, shCd1:17, shCd100:13, starCd:14,
    /* HEALING AURA: total persen max-HP SECARA BERTAHAP (HoT) + durasinya.
       Lv 1   : 50% max HP selama 7 detik
       Lv 100 : 80% max HP selama 5 detik */
    healP1:0.50, healP100:0.80, healD1:7, healD100:5,
    /* ambang pemicu heal: cukup KEHILANGAN healEps HP (bukan lagi 85% HP)
       supaya heal dipakai begitu ada rekan yang HP-nya berkurang. Nilai kecil
       ini hanya menyaring pecahan HP dari regen/HoT.
       healToastPct: karena heal kini boleh dirapal untuk luka sekecil apa pun
       (termasuk di luar pertarungan), TOAST layar hanya ditampilkan bila ada
       anggota tim yang HP-nya di bawah persen ini. Celetukan di atas kepala
       mage tetap selalu muncul, jadi pemain tahu auranya bekerja. */
    healEps:0.5, healToastPct:0.85,
    /* AURA PERISAI: reduksi damage TETAP 20%; yang naik level = durasinya.
       Lv 1   : 20% selama 5 detik
       Lv 100 : 20% selama 20 detik */
    shV:0.20, shD1:5, shD100:20,
    /* HUJAN BINTANG SPIRIT: bola cahaya berjatuhan; tiap bola yang mendarat
       memberi DoT = persen dari MAX HP musuh, disebar selama durasinya.
       Persen & durasi di sini TOTAL untuk SATU hujan (dibagi rata ke semua
       bola yang jatuh, jadi mengubah jadwal bola tidak mengubah balance).
       Lv 1   : total 10% max HP selama 5 detik
       Lv 100 : total 20% max HP selama 6 detik */
    starP1:0.10, starP100:0.20, starD1:5, starD100:6,
    /* radius DoT tiap bola yang mendarat (BLOK) */
    starR:2.4,

    /* =====================================================================
       ANGKA VFX — SATUAN PROTOTIPE (NEW MODEL/Mage Support.html)
       ---------------------------------------------------------------------
       Rig prototipe tingginya ±3 unit, rig in-game dikecilkan root.scale
       0.62 (lihat build()). Semua ukuran/kecepatan VFX di bawah memakai
       angka prototipe APA ADANYA lalu dikali S di kode, sehingga animasinya
       sama persis dengan file aslinya hanya berbeda skala. Karena JARAK dan
       KECEPATAN dikali skala yang sama, TIMING-nya identik.
       ===================================================================== */
    S:0.62,
    /* ---- linimasa ULT prototipe (case 'ult'): total 5 detik, bola turun
       tiap starGap detik selama jendela starT0..starT1 → 12 bola ---- */
    starDur:5, starT0:1, starT1:3.8, starGap:0.22,
    /* melayang: prototipe naik 4.5 unit (0-1.2s), melayang, lalu turun.
       In-game ketinggiannya dikali starFlyK karena bayangan, HP bar & badan
       fisik mage tetap di tanah — mengangkat mesh setinggi prototipe membuat
       ketiganya terlihat terlepas dari tubuhnya. */
    starFly:4.5, starFlyK:0.2,
    /* HUJAN BINTANG (spawnStarFall + updateFx prototipe) */
    starRi:1.5, starRo:3.2,   /* titik jatuh: r = starRi + √rand * starRo   */
    starJit:2,                /* mesh digeser ±starJit/2 dari titik pola    */
    starH:6, starHr:3,        /* tinggi spawn: flyH + starH + rand*starHr   */
    starVy:16, starVyr:6,     /* kecepatan jatuh: -(starVy + rand*starVyr)  */
    starHit:0.5,              /* ketinggian tumbukan di atas tanah          */
    starSpin:3,               /* rotasi.z bola saat jatuh (rad/dtk)         */
    starTrail:0.05,           /* jeda percikan jejak (mobile: ×2.4)         */
    starShake:0.18,           /* getar kamera saat mendarat (semantik max)  */
    starSfxEvery:3,           /* suara tumbukan tiap N bola (12 bola/hujan) */
    areaFade:0.6,             /* lama penanda area memudar di akhir hujan   */
    /* AURA PERISAI (shieldG prototipe): 3 torus + 4 orb oktahedron.
       auraSeg = segmen torus PC (persis prototipe: 8×40); auraSegM dipakai
       di mobile agar torus tidak boros draw (siluetnya sama). */
    auraSeg:[8,40], auraSegM:[6,20], auraFade:0.6,
    /* efek atmosfer tambahan (puff asap & bekas di tanah) dimatikan di mobile
       supaya 12 tumbukan tidak menumpuk overdraw transparan */
    fxLite:(typeof IS_MOBILE!=='undefined'&&IS_MOBILE),
  },
  /* interpolasi linear skill berdasarkan level NPC (1 .. NPC_RARE_MAX_LEVEL) */
  _lvK(n){
    const cap=(typeof CFG!=='undefined'&&CFG.NPC_RARE_MAX_LEVEL)||100;
    return clamp(((n.level||1)-1)/(cap-1),0,1);
  },
  lvHealPct(n){return lerp(this.SUP.healP1,this.SUP.healP100,this._lvK(n));},
  lvHealDur(n){return lerp(this.SUP.healD1,this.SUP.healD100,this._lvK(n));},
  lvHealCd(n) {return lerp(this.SUP.healCd1,this.SUP.healCd100,this._lvK(n));},
  lvShDur(n)  {return lerp(this.SUP.shD1,  this.SUP.shD100,  this._lvK(n));},
  lvShCd(n)   {return lerp(this.SUP.shCd1, this.SUP.shCd100, this._lvK(n));},
  lvStarPct(n){return lerp(this.SUP.starP1,this.SUP.starP100,this._lvK(n));},
  lvStarDur(n){return lerp(this.SUP.starD1,this.SUP.starD100,this._lvK(n));},

  /* state skill per-NPC (cooldown, cast aktif & aura perisai yang tampil) */
  _st(n){
    return n.supState||(n.supState={
      healCd:0, shCd:0, starCd:0,
      cast:null,      // {kind:'heal'|'shield'|'star', t, dur, ...}
      aura:null,      // group aura perisai yang sedang melingkari mage
    });
  },

  /* ==========================================================================
     COMBAT — dipanggil SkillsPort.combat dari NPCS.aiFight. Mengembalikan
     true SELALU: mage support murni pendukung (serangan dasar = bola spirit
     jarak jauh seperti penyihir elf), jadi aiFight bawaan dilewati penuh.
     ========================================================================== */
  combat(n,dt){
    const S=this._st(n);
    /* ---------- sedang merapal skill ---------- */
    if(S.cast){
      S.cast.t+=dt;
      n.vel.x*=0.8;n.vel.z*=0.8;                  // berdiri diam merapal
      const c=S.cast;
      if(c.kind==='star'){
        /* jatuhkan bola cahaya sesuai jadwal hujan prototipe */
        this.starTick(n,c,dt);
        if(c.t>=c.dur)this._endCast(S);
      }else{
        /* heal & shield: buff diberikan SEKALI saat pose rapal penuh */
        if(!c.fired&&c.t>=c.fireAt){
          c.fired=true;
          if(c.kind==='heal')this.applyHealAura(n);
          else this.applyShieldAura(n);
        }
        if(c.t>=c.dur)this._endCast(S);
      }
      /* bola bintang & aura yang sudah melayang di-tick FX.update sendiri */
      return true;
    }

    const tgt=n.target;
    if(!tgt||tgt.dead)return false;
    const d=tgt.pos.distanceTo(n.pos);
    /* tetap menghadap & jaga jarak seperti penyihir elf */
    const to=new THREE.Vector3().subVectors(tgt.pos,n.pos).setY(0);
    const ang=Math.atan2(to.x,to.z);
    n.mesh.rotation.y=angLerp(n.mesh.rotation.y,ang,dt*8);
    const sp=n.speed*(n.inWater?0.5:1);
    if(d>9){n.vel.x=lerp(n.vel.x,Math.sin(ang)*sp,clamp(6*dt,0,1));
      n.vel.z=lerp(n.vel.z,Math.cos(ang)*sp,clamp(6*dt,0,1));}
    else if(d<4){n.vel.x=lerp(n.vel.x,-Math.sin(ang)*sp*0.9,clamp(6*dt,0,1));
      n.vel.z=lerp(n.vel.z,-Math.cos(ang)*sp*0.9,clamp(6*dt,0,1));}
    else{n.vel.x*=0.75;n.vel.z*=0.75;}

    /* ---------- pilih skill pendukung (prioritas: heal → shield → ult) --
       HEAL: dirapal begitu ADA anggota tim yang HP-nya berkurang (tanpa
       ambang persen HP lagi). Buffnya menyasar seluruh tim, bukan target,
       jadi jarak ke musuh tidak lagi jadi syarat. Masing-masing butuh stamina. */
    if(S.healCd<=0&&this.teamHurt()&&((n.stamina||0)>=35)){
      n.stamina=(n.stamina||0)-35; n.stamRegenT=1.8;
      FX.text(n.pos.clone().add(new THREE.Vector3(0,2,0)),'-35 STAM','#ffd24d');
      this.startCast(n,'heal');return true;
    }
    if(S.shCd<=0&&d<13&&((n.stamina||0)>=30)){
      n.stamina=(n.stamina||0)-30; n.stamRegenT=1.8;
      FX.text(n.pos.clone().add(new THREE.Vector3(0,2,0)),'-30 STAM','#ffd24d');
      this.startCast(n,'shield');return true;
    }
    if(S.starCd<=0&&d<13&&((n.stamina||0)>=40)){
      n.stamina=(n.stamina||0)-40; n.stamRegenT=1.8;
      FX.text(n.pos.clone().add(new THREE.Vector3(0,2,0)),'-40 STAM','#ffd24d');
      this.startCast(n,'star',tgt);return true;
    }

    /* ---------- serangan dasar: BOLA SPIRIT putih-emas ---------- */
    if(n.atkCd<=0&&d<13){
      n.atkCd=0.85;n.swing=0.25;
      const from=n.pos.clone().add(new THREE.Vector3(0,1.6,0));
      const dir=tgt.pos.clone().add(new THREE.Vector3(0,0.8,0)).sub(from).normalize();
      if(typeof PortFX!=='undefined'&&PortFX.fireAura)
        PortFX.fireAura(from,dir,npcDmgSafe(n)*1.05,n);
      Sfx.at(n.pos,'swing',0);
    }
    /* monster tetap membalas bila sempat merapat */
    if(tgt.atkCd<=0&&d<2.1){tgt.atkCd=1.1;NPCS.hurt(n,tgt.dmg);}
    return true;
  },

  /* ---------- daftar sekutu yang dilayani skill: pemain + rekan + pet ------ */
  teamAllies(){
    const out=[];
    if(typeof Player!=='undefined'&&!Player.dead)
      out.push({pos:Player.pos,hp:Player.hp,max:Player.maxHp(),player:true,ref:Player});
    if(typeof NPCS!=='undefined')
      for(const a of NPCS.team){
        if(a.dead)continue;
        out.push({pos:a.pos,hp:a.hp,max:NPCS.npcMaxHp(a),npc:true,ref:a});
      }
    if(typeof Capture!=='undefined'&&Capture.pet&&!Capture.pet.dead){
      const p=Capture.pet;
      out.push({pos:p.pos,hp:p.hp,max:p.maxhp,pet:true,ref:p});
    }
    return out;
  },
  /* persentase HP TERENDAH di tim (0..1). Ditulis tanpa membuat objek/array
     apa pun karena dipanggil TIAP FRAME selama cooldown heal siap — versi
     lama (teamAllies()) menyampahi GC di mobile. */
  teamLowPct(){
    let lo=1;
    if(typeof Player!=='undefined'&&!Player.dead)
      lo=Math.min(lo,Player.hp/Math.max(1,Player.maxHp()));
    if(typeof NPCS!=='undefined'&&NPCS.team)
      for(const a of NPCS.team){
        if(a.dead)continue;
        lo=Math.min(lo,a.hp/Math.max(1,NPCS.npcMaxHp(a)));
      }
    if(typeof Capture!=='undefined'&&Capture.pet&&!Capture.pet.dead){
      const p=Capture.pet;
      lo=Math.min(lo,p.hp/Math.max(1,p.maxhp));
    }
    return lo;
  },
  /* ada anggota tim yang HP-nya BERKURANG? (satu-satunya syarat picu heal)
     Cukup kehilangan SUP.healEps HP — tidak ada lagi ambang persen HP, sesuai
     peran healer: begitu ada rekan terluka, aura langsung dirapal. */
  teamHurt(){
    const eps=this.SUP.healEps;
    if(typeof Player!=='undefined'&&!Player.dead&&Player.hp<Player.maxHp()-eps)
      return true;
    if(typeof NPCS!=='undefined'&&NPCS.team)
      for(const a of NPCS.team){
        if(!a.dead&&a.hp<NPCS.npcMaxHp(a)-eps)return true;
      }
    if(typeof Capture!=='undefined'&&Capture.pet&&!Capture.pet.dead){
      const p=Capture.pet;
      if(p.hp<p.maxhp-eps)return true;
    }
    return false;
  },

  /* ---------- mulai merapal satu skill ---------- */
  startCast(n,kind,tgt){
    const S=this._st(n),SUP=this.SUP;
    n.vel.x*=0.5;n.vel.z*=0.5;
    if(kind==='heal'){
      S.healCd=this.lvHealCd(n);
      S.cast={kind,t:0,dur:1.1,fireAt:0.7,fired:false};
      NPCS.say(n,'💚 Healing Aura!',1.8);
      /* toast hanya untuk luka yang berarti (lihat SUP.healToastPct) supaya
         layar tidak dibanjiri notifikasi saat heal dirapal untuk luka kecil */
      if(this.teamLowPct()<SUP.healToastPct)
        UI.toast(`🔯 ${n.name}: 💚 HEALING AURA!`);
    }else if(kind==='shield'){
      S.shCd=this.lvShCd(n);
      S.cast={kind,t:0,dur:1.1,fireAt:0.7,fired:false};
      NPCS.say(n,'🛡️ Aura Perisai!',1.8);
      UI.toast(`🔯 ${n.name}: 🛡️ AURA PERISAI!`);
    }else{
      /* ULT : HUJAN BINTANG SPIRIT — linimasa persis prototipe (5 detik:
         naik 0-1.2s, melayang sampai 3.8s, turun sampai 5s). Bola cahaya
         turun tiap SUP.starGap detik selama jendela starT0..starT1, jadi
         jumlahnya (dan kerapatannya) sama dengan file aslinya. */
      S.starCd=SUP.starCd;
      const total=Math.max(1,Math.floor((SUP.starT1-SUP.starT0)/SUP.starGap));
      const gy=this.groundY(tgt.pos);
      S.cast={kind:'star',t:0,dur:SUP.starDur,acc:0,drops:0,total,
        pctPer:this.lvStarPct(n)/total,dotDur:this.lvStarDur(n),pool:0,sfx:0,
        cx:tgt.pos.x,cy:gy,cz:tgt.pos.z,areaFx:null};
      /* cincin + cahaya area di tanah (areaRing & areaGlow prototipe) */
      S.cast.areaFx=this.spawnStarArea(S.cast.cx,gy,S.cast.cz,SUP.starDur);
      NPCS.say(n,'🌠 Hujan Bintang Spirit!',1.8);
      UI.toast(`🔯 ${n.name}: 🌠 HUJAN BINTANG SPIRIT!`);
    }
    Sfx.at(n.pos,'craft');
  },
  /* rapalan selesai/dibatalkan: penanda area ult ikut dipudarkan (prototipe
     langsung menyembunyikannya; di sini dipudarkan supaya tidak berkedip) */
  _endCast(S){
    const c=S.cast;
    S.cast=null;
    if(c&&c.areaFx)
      c.areaFx.life=Math.min(c.areaFx.life,this.SUP.areaFade);
  },
  /* tinggi tanah di bawah sebuah titik (tempat bola bintang mendarat) */
  groundY(p){
    if(typeof World!=='undefined'&&World.groundAt)
      return World.groundAt(p.x,p.z,p.y+1.2);
    return p.y;
  },

  /* ---------- HEALING AURA: HoT persen max-HP untuk SELURUH tim ---------- */
  applyHealAura(n){
    const pct=this.lvHealPct(n),dur=this.lvHealDur(n);
    for(const a of this.teamAllies()){
      const r=a.ref;
      /* buff HoT: di-tick NPCS.update (js/npc.js); cap sisa ke total buff */
      r.healHot={rem:a.max*pct,dur,left:dur};
      if(typeof FX!=='undefined'){
        FX.ring(a.pos.x,a.pos.y+0.1,a.pos.z,0x7ae8a0,0.7,2.6);
        FX.debris(a.pos.clone().add(new THREE.Vector3(0,1.2,0)),0x9dffb8,5,1.6);
        FX.text(a.pos.clone().add(new THREE.Vector3(0,2.2,0)),
          '💚 +'+Math.round(pct*100)+'%','#7ae8a0');
      }
    }
    if(typeof UI!=='undefined'&&UI.renderTeam)UI.renderTeam();
  },

  /* ---------- AURA PERISAI: reduksi damage SEMENTARA untuk SELURUH tim ----- */
  applyShieldAura(n){
    const v=this.SUP.shV,dur=this.lvShDur(n);
    for(const a of this.teamAllies()){
      const r=a.ref;
      /* buff perisai: dibaca NPCS.npcDef, Player.takeDamage & hurtPet */
      r.shieldT=dur;r.shieldV=v;
      if(typeof FX!=='undefined'){
        FX.ring(a.pos.x,a.pos.y+0.1,a.pos.z,0xb8f0c8,0.9,3);
        FX.ring(a.pos.x,a.pos.y+0.9,a.pos.z,0xd8ffe8,0.7,2);
        FX.text(a.pos.clone().add(new THREE.Vector3(0,2.2,0)),
          '🛡️ -'+Math.round(v*100)+'%','#b8f0c8');
      }
    }
    /* aura torus + orb yang melingkari mage selama buff berjalan */
    this.spawnShieldAura(n,dur);
    if(typeof UI!=='undefined'&&UI.renderTeam)UI.renderTeam();
  },

  /* ==========================================================================
     VFX PORT — persis NEW MODEL/Mage Support.html
     --------------------------------------------------------------------------
     Semua mesh efek dititipkan ke FX.trails (js/effects.js): FX.update yang
     memanggil onUpdate tiap frame lalu MEMBUANG mesh-nya saat umurnya habis.
     Karena tick-nya di FX (bukan di NPC), efek tetap selesai & tidak bocor
     walau mage-nya despawn di tengah animasi — penting di mobile. onUpdate
     menerima (entry, dt, u) dengan u = 0..1 progres umur, sama seperti
     variabel `u` di updateFx() prototipe.

     GEOMETRI DIBAGI PAKAI (_geo): ukuran semua efek konstan, jadi geometrinya
     dibuat SEKALI lalu dipakai ulang seumur permainan — satu hujan bintang
     memakai 12 bola × 5 mesh, membuat/membuang buffer GPU sebanyak itu tiap
     rapalan terlalu mahal di mobile. Yang dibuang per efek hanya material
     (opacity tiap efek beda). Mesh dengan geometri bersama ditandai
     userData.sg supaya tidak ikut di-dispose.
     ========================================================================== */
  _geoCache:{},
  _geo(key,make){
    const c=this._geoCache;
    if(!c[key])c[key]=make();
    return c[key];
  },
  /* mesh dengan geometri bersama (geometry TIDAK di-dispose) */
  _mesh(geo,mat){
    const m=new THREE.Mesh(geo,mat);
    m.userData.sg=true;
    return m;
  },
  _fx(obj,dur,onUpdate,onDispose){
    /* FX.update membuang geometry mesh AKAR; geometri kita dipakai bersama,
       jadi mesh tunggal selalu dibungkus Group kosong (posisi anak sudah
       koordinat dunia, Group tetap di origin). */
    const root=obj.isGroup?obj:new THREE.Group();
    if(root!==obj)root.add(obj);
    if(typeof FX==='undefined'||!FX.group||!FX.trails){
      /* FX belum siap: buang material supaya tidak menggantung */
      root.traverse(o=>{if(o.material)o.material.dispose();});
      return null;
    }
    FX.group.add(root);
    const e={mesh:root,life:dur,max:dur};
    e.onUpdate=(dt,frac)=>{if(onUpdate)onUpdate(e,dt,1-frac);};
    e.onDispose=()=>{
      root.traverse(o=>{
        if(o.geometry&&!o.userData.sg)o.geometry.dispose();
        if(o.material)o.material.dispose();
      });
      if(onDispose)onDispose();
    };
    FX.trails.push(e);
    return e;
  },
  /* material aditif ala prototipe (satu sisi / dua sisi) */
  _gm(c,op){return new THREE.MeshBasicMaterial({color:c,transparent:true,
    opacity:op,blending:THREE.AdditiveBlending,depthWrite:false});},
  _gmD(c,op){return new THREE.MeshBasicMaterial({color:c,transparent:true,
    opacity:op,blending:THREE.AdditiveBlending,depthWrite:false,
    side:THREE.DoubleSide});},

  /* ---------- POOL EFEK PROTOTIPE (ring / flash / puff / patch) ----------
     Geometri, warna & kurva geraknya sama dengan updateFx() prototipe; hanya
     ukurannya dikali SUP.S karena rig in-game lebih kecil. */
  fxRing(x,y,z,color,max,dur){
    const S=this.SUP.S,L=this.SUP.fxLite;
    const m=this._mesh(this._geo('ring',()=>
      new THREE.RingGeometry(0.45*S,0.62*S,L?16:32)),
      new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.9,
        side:THREE.DoubleSide,depthWrite:false}));
    m.rotation.x=-Math.PI/2;m.position.set(x,y,z);m.renderOrder=3;
    m.scale.setScalar(0.5);
    this._fx(m,dur,(e,dt,u)=>{
      const s=0.5+u*max;
      m.scale.set(s,s,s);
      m.material.opacity=0.9*(1-u);
    });
  },
  fxFlash(x,y,z,color,max,dur){
    const S=this.SUP.S,L=this.SUP.fxLite;
    const m=this._mesh(this._geo('flash',()=>
      new THREE.SphereGeometry(0.5*S,L?8:10,L?6:8)),this._gm(color,0.85));
    m.position.set(x,y,z);m.renderOrder=5;m.scale.setScalar(0.3);
    this._fx(m,dur,(e,dt,u)=>{
      const k=1-(1-u)*(1-u),s=0.3+k*max;
      m.scale.set(s,s,s);
      m.material.opacity=0.85*(1-u);
    });
  },
  /* asap & bekas cahaya di tanah: dilewati di mobile (overdraw transparan) */
  fxPuff(x,y,z,color,max,dur){
    if(this.SUP.fxLite)return;
    const S=this.SUP.S;
    const m=this._mesh(this._geo('puff',()=>
      new THREE.SphereGeometry(0.5*S,8,6)),
      new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.3,
        depthWrite:false}));
    m.position.set(x,y,z);m.renderOrder=4;m.scale.setScalar(0.35*max);
    this._fx(m,dur,(e,dt,u)=>{
      const k=1-(1-u)*(1-u),s=max*(0.35+0.65*k);
      m.scale.set(s,s,s);
      m.position.y+=dt*0.4*S;
      m.material.opacity=0.3*(1-u);
    });
  },
  fxPatch(x,y,z,color,op,max,dur){
    if(this.SUP.fxLite)return;
    const S=this.SUP.S;
    const m=this._mesh(this._geo('patch',()=>
      new THREE.CircleGeometry(S,20)),
      new THREE.MeshBasicMaterial({color,transparent:true,opacity:op,
        depthWrite:false}));
    m.rotation.x=-Math.PI/2;m.position.set(x,y,z);m.renderOrder=2;
    this._fx(m,dur,(e,dt,u)=>{
      const s=max*(0.6+0.4*Math.min(1,(dur-e.life)*4));
      m.scale.set(s,s,s);
      m.material.opacity=op*(1-u*u);
    });
  },

  /* ==========================================================================
     ULT : HUJAN BINTANG SPIRIT
     --------------------------------------------------------------------------
     Port penuh dari prototipe: spawnStarFall() + cabang `falling` di
     updateFx() + areaRing/areaGlow di case 'ult'. Satu-satunya perbedaan yang
     disengaja: PUSAT hujan dipasang di TARGET, bukan di kaki mage seperti
     prototipe — in-game bintangnya senjata (memberi DoT ke monster), jadi
     harus turun di atas musuh. Pola sebaran, ketinggian, kecepatan jatuh,
     kilatan tumbukan & linimasanya sama persis.
     ========================================================================== */
  /* jadwal turunnya bola: prototipe menumpuk acc lalu menjatuhkan satu bola
     tiap SUP.starGap detik selama jendela starT0..starT1 */
  starTick(n,c,dt){
    const SUP=this.SUP;
    if(c.t<SUP.starT0||c.t>SUP.starT1)return;
    c.acc+=dt;
    while(c.acc>SUP.starGap&&c.drops<c.total){
      c.acc-=SUP.starGap;
      c.drops++;
      this.spawnStarFall(n,c);
    }
  },
  /* kurva melayang prototipe (targetFly di case 'ult'):
       t<1.2  : naik lurus 0 → starFly
       t<3.8  : melayang di starFly (bergoyang halus)
       sisanya: turun kembali ke 0 sampai t = starDur */
  ultFly(t){
    const SUP=this.SUP,H=SUP.starFly;
    if(t<1.2)return (t/1.2)*H;
    if(t<SUP.starT1)return H+Math.sin(t*2)*0.15;
    return Math.max(0,H*(1-(t-SUP.starT1)/(SUP.starDur-SUP.starT1)));
  },
  /* satu bola cahaya: titik jatuh diundi pada anulus di sekitar pusat hujan
     (r = starRi + √rand × starRo), mesh digeser sedikit (starJit), dan cincin
     penanda muncul lebih dulu di titik pendaratan — persis prototipe. */
  spawnStarFall(n,c){
    const SUP=this.SUP,S=SUP.S,L=SUP.fxLite;
    const a=Math.random()*Math.PI*2;
    const r=(SUP.starRi+Math.sqrt(Math.random())*SUP.starRo)*S;
    const ix=c.cx+Math.cos(a)*r,iz=c.cz+Math.sin(a)*r;
    const jx=ix+(Math.random()-0.5)*SUP.starJit*S;
    const jz=iz+(Math.random()-0.5)*SUP.starJit*S;
    /* tanah dicari di titik jatuh masing-masing bola: medan voxel berundak,
       jadi tumbukan harus di permukaan setempat bukan di tinggi pusat hujan */
    const gy=(typeof World!=='undefined'&&World.groundAt)
      ?World.groundAt(jx,jz,c.cy+3):c.cy;
    this.fxRing(ix,gy+0.05,iz,0xffe4a0,2,0.4);
    /* mesh bola: inti putih + 2 lapis glow + 2 cincin berputar (spiritPool) */
    const g=new THREE.Group();
    const core=this._mesh(this._geo('sCore',()=>
      new THREE.SphereGeometry(0.18*S,L?8:12,L?6:10)),
      new THREE.MeshBasicMaterial({color:0xffffff}));
    const inner=this._mesh(this._geo('sInner',()=>
      new THREE.SphereGeometry(0.26*S,L?8:10,L?6:8)),this._gm(0xfff8dc,0.7));
    const glow=this._mesh(this._geo('sGlow',()=>
      new THREE.SphereGeometry(0.48*S,L?8:10,L?6:8)),this._gm(0xffe4a0,0.35));
    const ring1=this._mesh(this._geo('sRing1',()=>
      new THREE.RingGeometry(0.38*S,0.52*S,L?14:24)),this._gmD(0xffe4a0,0.85));
    const ring2=this._mesh(this._geo('sRing2',()=>
      new THREE.RingGeometry(0.3*S,0.4*S,L?12:20)),this._gmD(0xffffff,0.7));
    core.renderOrder=6;inner.renderOrder=5;glow.renderOrder=5;
    ring1.renderOrder=6;ring2.renderOrder=6;
    g.add(core,inner,glow,ring1,ring2);
    /* tinggi spawn memakai acuan melayang prototipe (starFly) supaya jarak &
       lama jatuhnya sama walau mage in-game tidak terbang setinggi itu */
    g.position.set(jx,gy+(SUP.starFly+SUP.starH+Math.random()*SUP.starHr)*S,jz);
    g.scale.setScalar(0.9);
    const vy=-(SUP.starVy+Math.random()*SUP.starVyr)*S;
    const hitY=gy+SUP.starHit*S;
    let life=0,trailT=0,done=false;
    /* umur 2.5 dtk hanya jaring pengaman; bola normalnya mendarat <0.8 dtk */
    this._fx(g,2.5,(e,dt)=>{
      if(done)return;
      life+=dt;
      g.position.y+=vy*dt;
      g.rotation.z+=SUP.starSpin*dt;
      ring1.rotation.x+=8*dt;ring1.rotation.y+=6*dt;
      ring2.rotation.y-=7*dt;ring2.rotation.z+=5*dt;
      g.scale.setScalar(g.scale.x*(1+Math.sin(life*18)*0.004));
      trailT-=dt;
      if(trailT<=0){
        trailT=SUP.starTrail*(L?2.4:1);
        if(typeof PortFX!=='undefined'&&PortFX.spark)
          PortFX.spark(g.position.x,g.position.y,g.position.z,1,0xffe4a0,1.8*S);
      }
      if(g.position.y<=hitY){
        done=true;g.visible=false;e.life=0;      // dibuang FX.update frame ini
        this.starImpact(n,g.position.x,gy,g.position.z,c);
      }
    });
  },
  /* tumbukan bola: 2 cincin + kilatan + percikan + asap + bekas tanah + getar
     (persis blok `if(p.g.position.y<=.5)` prototipe), lalu DoT ke monster */
  starImpact(n,x,gy,z,c){
    const SUP=this.SUP,S=SUP.S;
    this.fxRing(x,gy+0.05,z,0xffe4a0,3,0.5);
    this.fxRing(x,gy+0.05,z,0xffffff,1.8,0.3);
    this.fxFlash(x,gy+0.6*S,z,0xfff8dc,2.2,0.28);
    if(typeof PortFX!=='undefined'&&PortFX.spark)
      PortFX.spark(x,gy+0.4*S,z,SUP.fxLite?4:8,0xffe4a0,6*S);
    this.fxPuff(x,gy+0.5*S,z,0xfff4d8,1.6,1);
    this.fxPatch(x,gy+0.03,z,0xf0e0b0,0.35,1.2,3);
    /* getar kamera: semantik prototipe shakeAmp=max(shakeAmp,starShake) */
    if(typeof FX!=='undefined')
      FX.shake=Math.min(1.2,Math.max(FX.shake||0,SUP.starShake));
    /* suara tumbukan hanya tiap starSfxEvery bola: satu hujan = 12 bola */
    c.sfx=(c.sfx||0)+1;
    if(c.sfx%SUP.starSfxEvery===1&&typeof Sfx!=='undefined')
      Sfx.at(new THREE.Vector3(x,gy,z),'hit');
    /* ---- DoT persen MAX HP ke monster dalam radius ----
       di-tick NPCS.supportBuffs → Monsters.hurt per detik supaya threat/aggro
       tetap konsisten (sumber = mage ini). Dua penyesuaian balance:
       1) sisa DoT lama DITUMPUK (bukan ditimpa) supaya monster yang tersentuh
          beberapa bola tidak kehilangan kikisan yang belum terbayar;
       2) bagian bola yang jatuh di tanah kosong DISIMPAN di c.pool lalu
          ditambahkan ke bola berikutnya. Pola sebaran prototipe lebar (sampai
          ~3 blok dari pusat), jadi tanpa ini sebagian besar bola akan luput
          dari target dan total kikisan satu hujan jauh di bawah lvStarPct. */
    if(typeof Monsters==='undefined')return;
    const r=SUP.starR,dur=c.dotDur;
    const share=c.pctPer+(c.pool||0);
    let hit=false;
    for(const m of Monsters.list){
      if(m.dead)continue;
      const dx=m.pos.x-x,dz=m.pos.z-z;
      if(dx*dx+dz*dz>r*r)continue;
      hit=true;
      const prev=m.starDot;
      const rem=(prev&&prev.left>0?prev.rate*prev.left:0)+m.maxhp*share;
      m.starDot={rate:rem/dur,left:dur,src:n,acc:(prev&&prev.acc)||0};
    }
    c.pool=hit?0:share;
  },
  /* cincin & cahaya area di tanah selama hujan berlangsung (areaRing+areaGlow) */
  spawnStarArea(x,gy,z,dur){
    const SUP=this.SUP,S=SUP.S,L=SUP.fxLite;
    const g=new THREE.Group();
    g.position.set(x,gy,z);
    const ring=this._mesh(this._geo('aRing',()=>
      new THREE.RingGeometry(3.7*S,3.95*S,L?24:44)),
      new THREE.MeshBasicMaterial({color:0xffe4a0,transparent:true,opacity:0.5,
        side:THREE.DoubleSide,depthWrite:false}));
    ring.rotation.x=-Math.PI/2;ring.position.y=0.06;ring.renderOrder=3;
    const glow=this._mesh(this._geo('aGlow',()=>
      new THREE.CircleGeometry(4*S,L?18:36)),
      new THREE.MeshBasicMaterial({color:0xfff8dc,transparent:true,opacity:0,
        depthWrite:false}));
    glow.rotation.x=-Math.PI/2;glow.position.y=0.025;glow.renderOrder=2;
    g.add(ring,glow);
    let t=0;
    return this._fx(g,dur,(e,dt)=>{
      t+=dt;
      /* prototipe hanya menyembunyikan penanda saat ult usai; di sini
         dipudarkan di ujung umur supaya tidak berkedip hilang */
      const k=clamp(e.life/SUP.areaFade,0,1);
      ring.rotation.z+=dt*1.2;
      ring.material.opacity=(0.35+Math.sin(t*8)*0.15)*k;
      const grow=Math.min(1,t/0.8);
      glow.scale.set(grow,grow,grow);
      glow.material.opacity=(0.14+Math.sin(t*5)*0.04)*k;
    });
  },

  /* ==========================================================================
     PASSIF : AURA PERISAI — port grup `shieldG` prototipe
     --------------------------------------------------------------------------
     3 cincin torus (material shieldMat / shieldMat2 bergantian) + 4 orb
     oktahedron yang mengorbit, dengan rotasi & denyut yang sama. Grup hidup
     di FX.group (KOORDINAT DUNIA) lalu mengikuti posisi mage tiap frame —
     sama seperti prototipe yang menaruh shieldG di scene, bukan di dalam rig,
     sehingga aura tidak ikut berputar saat mage berbalik badan.
     Urutan anak: indeks 0-2 = torus, 3-6 = orb (prototipe memeriksa
     geometry.type, di sini cukup indeksnya karena urutan build sama).
     ========================================================================== */
  spawnShieldAura(n,dur){
    const St=this._st(n),SUP=this.SUP,K=SUP.S,L=SUP.fxLite;
    /* rapalan berikutnya cukup memperpanjang aura yang sudah tampil */
    if(St.aura&&St.aura.life>0){
      St.aura.life=dur+SUP.auraFade;
      St.aura.max=Math.max(St.aura.max,St.aura.life);
      return St.aura;
    }
    const g=new THREE.Group();
    const seg=L?SUP.auraSegM:SUP.auraSeg;
    const mats=[];
    for(let i=0;i<3;i++){
      const op=i%2?0.25:0.35;
      const m=new THREE.MeshBasicMaterial({color:i%2?0xd8ffe8:0xb8f0c8,
        transparent:true,opacity:op,blending:THREE.AdditiveBlending,
        depthWrite:false,side:THREE.DoubleSide});
      const ring=this._mesh(this._geo('aur'+i,()=>
        new THREE.TorusGeometry((1.3+i*0.22)*K,0.06*K,seg[0],seg[1])),m);
      ring.rotation.x=Math.PI/2+(i-1)*0.28;
      ring.renderOrder=4;
      g.add(ring);mats.push({m,op});
    }
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2+Math.PI/4;
      const m=this._gm(0x7ae8a0,0.8);
      const orb=this._mesh(this._geo('aurOrb',()=>
        new THREE.OctahedronGeometry(0.14*K)),m);
      orb.position.set(Math.cos(a)*1.45*K,0,Math.sin(a)*1.45*K);
      orb.renderOrder=4;
      g.add(orb);mats.push({m,op:0.8});
    }
    let t=0;
    St.aura=this._fx(g,dur+SUP.auraFade,(e,dt)=>{
      t+=dt;
      /* mage sudah tumbang / meshnya dilepas (despawn): aura langsung pudar */
      const gone=n.dead||!n.mesh||!n.mesh.parent;
      if(gone)e.life=Math.min(e.life,SUP.auraFade);
      else g.position.set(n.pos.x,n.pos.y+(1.5+Math.sin(t*2)*0.08)*K,n.pos.z);
      g.rotation.y+=dt*2.4;
      g.children.forEach((c,i)=>{
        if(i<3){
          c.rotation.z+=dt*(0.6+i*0.3)*((i%2)?1:-1);
        }else{
          const a=t*2.4+i*Math.PI/2+Math.PI/4;
          c.position.x=Math.cos(a)*1.45*K;
          c.position.z=Math.sin(a)*1.45*K;
          c.position.y=Math.sin(t*3+i)*0.25*K;
          c.rotation.y+=dt*4;
        }
      });
      /* pudar di SUP.auraFade detik terakhir buff */
      const k=clamp(e.life/SUP.auraFade,0,1);
      for(const mm of mats)mm.m.opacity=mm.op*k;
      /* percikan hijau lembut di sekeliling mage (prototipe: random<dt*6) */
      if(!gone&&typeof PortFX!=='undefined'&&PortFX.spark&&Math.random()<dt*6)
        PortFX.spark(n.pos.x+(Math.random()-0.5)*2*K,
          n.pos.y+(0.5+Math.random()*2)*K,
          n.pos.z+(Math.random()-0.5)*2*K,1,0xb8f0c8,1.5*K);
    },()=>{if(St.aura&&St.aura.mesh===g)St.aura=null;});
    return St.aura;
  },

  /* visual serangan dasar (dipanggil SkillsPort.onMeleeHit — tidak dipakai
     karena combat() selalu true, disediakan untuk kelengkapan kontrak) */
  onMeleeHit(n){},

  /* ==========================================================================
     ANIMASI — idle bobbing / jalan (kaki & jubah) / pose cast per-skill.
     Mengikuti pose system prototipe (defaultPose + blend), disederhanakan
     agar seirama dengan npc_elfmage.js.
     ========================================================================== */
  animate(n,dt){
    const S=this._st(n);
    /* cooldown skill di-tick di sini supaya tetap berjalan walau target
       hilang (combat() hanya dipanggil selama ada target dari aiFight). */
    S.healCd=Math.max(0,S.healCd-dt);
    S.shCd  =Math.max(0,S.shCd-dt);
    S.starCd=Math.max(0,S.starCd-dt);
    /* safeguard: cast yang tertinggal tanpa target tetap diselesaikan di
       sini (hujan bintang tetap turun sampai jendelanya habis), lalu pose
       kembali normal. Sama seperti pola safeguard di npc_elfmage/npc_goblin. */
    if(S.cast&&(!n.target||n.target.dead)){
      S.cast.t+=dt;
      /* BERHENTI merapal, bukan sekadar diperlambat: di luar pertarungan
         aiFollow terus mendorong mage mengejar pemain, sedangkan pose rapal
         membuat kakinya diam — tanpa ini ia tampak meluncur. animate() berjalan
         SESUDAH physics, jadi sisa geseran per frame hanya dari satu lerp
         aiFollow (±0.4 blok/detik) dan tidak terlihat selama 1.1 detik rapalan. */
      n.vel.x=0;n.vel.z=0;
      const c=S.cast;
      if(c.kind==='star'){
        this.starTick(n,c,dt);
        if(c.t>=c.dur)this._endCast(S);
      }else{
        /* buff tim tetap diberikan walau musuh sudah tumbang */
        if(!c.fired&&c.t>=c.fireAt){
          c.fired=true;
          if(c.kind==='heal')this.applyHealAura(n);
          else this.applyShieldAura(n);
        }
        if(c.t>=c.dur)this._endCast(S);
      }
    }
    /* mundur paksa (HP kritis) membatalkan rapalan */
    if(S.cast&&n.retreat)this._endCast(S);
    /* ---------- HEALING AURA DI LUAR PERTARUNGAN ----------
       combat() hanya dipanggil aiFight selama mage punya target, padahal justru
       SESUDAH bertarung tim paling butuh dipulihkan. Di sini heal tetap
       dirapal begitu ada anggota tim yang HP-nya berkurang & cooldown siap.
       Dibatasi ke mage yang SUDAH jadi rekan (NPCS.isTeam) supaya pengembara
       langka yang cuma melintas tidak menghujani pemain dengan heal gratis. */
    if(!S.cast&&S.healCd<=0&&!n.retreat&&(!n.target||n.target.dead)&&
       typeof NPCS!=='undefined'&&NPCS.isTeam&&NPCS.isTeam(n)&&this.teamHurt()&&((n.stamina||0)>=35)){
      n.stamina=(n.stamina||0)-35; n.stamRegenT=1.8;
      FX.text(n.pos.clone().add(new THREE.Vector3(0,2,0)),'-35 STAM','#ffd24d');
      this.startCast(n,'heal');
    }
    /* bola bintang & aura perisai yang sudah tampil di-tick FX.update sendiri
       (lihat _fx) sehingga tetap selesai walau mage-nya despawn */

    const R=n.parts,rr=R.rare,t=performance.now()*0.001;
    const P=n._pose||(n._pose={rootY:0,lean:0,twist:0,headX:0,headY:0,
      aLx:.08,aLy:0,aLz:.14,aRx:-.2,aRy:0,aRz:-.14,sX:0});
    const T={rootY:0,lean:0,twist:0,headX:0,headY:0,
      aLx:.08,aLy:0,aLz:.14,aRx:-.2,aRy:0,aRz:-.14,sX:0};
    let blend=10,ph=n._ph||(n._ph=0);
    const sp=Math.hypot(n.vel.x,n.vel.z);

    /* flash merah saat terluka */
    const em=n.flash>0?0xaa2222:0x000000;
    n.mesh.traverse(o=>{if(o.material&&o.material.emissive)
      o.material.emissive.setHex(em);});

    if(S.cast){
      /* ---------- pose cast sesuai jenis skill ---------- */
      const kind=S.cast.kind;
      blend=14;
      if(kind==='heal'){
        /* prototipe 'heal': kedua tangan terangkat tinggi, badan melayang */
        T.aRx=-2.2;T.sX=Math.PI;T.aLx=-2.2;T.aLz=-.3;T.aRz=.3;
        T.lean=-.06;T.headX=-.15;
        T.rootY=.12+Math.sin(t*5)*.04;
      }else if(kind==='shield'){
        /* prototipe 'shield': staff horizontal, tangan kiri memagari */
        T.aRx=-.9;T.sX=Math.PI*.5;T.aLx=-.5;T.aLz=.4;
        T.lean=.04;
      }else{
        /* prototipe 'ult': staff lurus ke atas, kepala menengadah, tubuh
           MELAYANG mengikuti kurva flyH prototipe (naik 0-1.2s → melayang
           sampai 3.8s → turun sampai 5s). Ketinggiannya dikali SUP.starFlyK
           karena bayangan, HP bar & tabrakan in-game tetap di tanah. */
        T.aRx=-2.85;T.sX=Math.PI;T.aLx=-2.5;T.aLz=.5;
        T.lean=-.12;T.headX=-.3;
        T.rootY=.18+this.ultFly(S.cast.t)*this.SUP.starFlyK;
        if(rr.robe)rr.robe.rotation.x=Math.sin(t*7)*.12;
      }
    }else if(sp>0.4){
      /* ---------- jalan/lari: kaki & jubah ala locomotion prototipe ------ */
      n._ph=ph+=dt*(sp>3.2?11:7);
      const run=sp>3.2,amp=run?.32:.22;
      if(R.legs){
        R.legs[0].position.z=.06+Math.sin(ph)*amp;
        R.legs[1].position.z=.06-Math.sin(ph)*amp;
        R.legs[0].position.y=.11+Math.max(0,Math.sin(ph))*.12;
        R.legs[1].position.y=.11+Math.max(0,-Math.sin(ph))*.12;
      }
      if(rr.robe){rr.robe.rotation.x=Math.sin(ph)*.07;
        rr.robe.rotation.z=Math.sin(ph*.5)*.05;}
      T.aLx=-Math.sin(ph)*(run?.5:.3);
      T.aRx=-.28+Math.sin(ph)*.06;
      T.rootY=Math.abs(Math.cos(ph))*(run?.09:.05);
      T.lean=run?.14:.05;
      T.headY=Math.sin(ph*.5)*.08;
    }else{
      /* ---------- idle: bobbing napas + kepala menengok pelan ---------- */
      const b=Math.sin(t*1.6);
      T.aLx=.08+b*.05;T.aRx=-.2-b*.04;
      T.lean=.02+b*.015;T.rootY=b*.025;
      T.headY=Math.sin(t*.6)*.28;T.headX=Math.sin(t*.9)*.05;
      if(R.legs){R.legs[0].position.set(.24,.11,.06);
        R.legs[1].position.set(-.24,.11,.06);}
      if(rr.robe)rr.robe.rotation.set(0,0,0);
      T.aRx=-.2;T.sX=0;
    }
    /* serangan bola spirit = pose cast singkat (prototipe 'shoot') */
    if(!S.cast&&n.swing>0){
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
    /* permata berdenyut + cahaya menguat saat merapal (prototipe) */
    if(rr.gemG)rr.gemG.scale.setScalar(1+Math.sin(t*3)*.06+
      (S.cast?0.25:0)+(n.swing>0?0.2:0));
    if(rr.light)rr.light.intensity=1.4+Math.sin(t*5)*0.4+
      (S.cast?2.2:0)+(n.swing>0?1.2:0);
  },
};
window.NPC_Magesupport=NPC_Magesupport;
