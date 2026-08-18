'use strict';
/* Monster: slime, babi hutan, golem perusak tanah, serigala, kalajengking */
/* nama tampilan untuk notifikasi & teks UI */
const MOB_NAME={slime:'Slime',boar:'Babi Hutan',golem:'Golem',
  wolf:'Serigala',scorpion:'Kalajengking',rabbit:'Kelinci',dragon:'Naga',
  lizard:'Lizard Rawa',cow:'Sapi',horse:'Kuda'};
const Monsters={

  list:[],timer:0,
  TYPES:{
    slime:{hp:22,dmg:6,xp:14,speed:2.2,r:0.45,aggro:10},
    boar:{hp:40,dmg:9,xp:22,speed:4.6,r:0.5,aggro:14},
    golem:{hp:170,dmg:20,xp:90,speed:1.7,r:0.9,aggro:16},
    /* serigala: cepat, menggigit beruntun — ancaman utama di tundra & malam */
    wolf:{hp:52,dmg:11,xp:34,speed:5.6,r:0.5,aggro:18},
    /* kalajengking: lambat tapi sengatnya beracun (damage susulan) */
    scorpion:{hp:64,dmg:13,xp:40,speed:3.0,r:0.55,aggro:13},
    /* kelinci: pasif, kabur kalau ada pemain/monster, drop daging mentah */
    rabbit:{hp:16,dmg:0,xp:8,speed:6.5,r:0.35,aggro:0,passive:true},
    /* NAGA: boss terbesar. Selalu boss (alwaysBoss) tapi TIDAK diberi skala
       visual boss tambahan (noBossScale) karena modelnya sudah besar dari
       sananya. HP dasar 420 → dikali multiplier boss (×6) = 2520 HP, jadi
       naga sangat sulit dibunuh (setingkat raid boss). dmg dasar 18 ×2.2 ≈ 40.
       Hanya muncul di biome PEGUNUNGAN dengan peluang 10%. */
    dragon:{hp:420,dmg:18,xp:60,speed:2.0,r:0.9,aggro:26,alwaysBoss:true,noBossScale:true},
    /* LIZARD RAWA: predator tepi sungai. Serangannya gigitan (jarak dekat),
       sapuan ekor (AoE), dan semburan asam (proyektil jarak jauh). Hanya
       muncul di tepi sungai/danau (lihat spawnLizard). Radius tabrakan kecil
       (0.55, seukuran babi hutan) mengikuti modelnya yang dikecilkan. */
    lizard:{hp:90,dmg:14,xp:48,speed:3.6,r:0.55,aggro:16},
    /* TERNAK PASIF: kategori ANIMAL, bukan monster buruan NPC. Tidak menyerang
       pemain/NPC. Sapi & kuda berkeliaran, merumput, dan kabur dari predator. */
    cow:{hp:60,dmg:0,xp:12,speed:2.6,r:0.65,aggro:0,passive:true,livestock:true,animal:true},
    horse:{hp:75,dmg:0,xp:14,speed:3.8,r:0.7,aggro:0,passive:true,livestock:true,animal:true},
  },
  /* ---------- varian boss ----------
     Boss bukan tipe terpisah: monster biasa dipromosikan jadi boss dengan
     skala tubuh, HP/damage berlipat, dan drop inti boss. Ini menjaga semua
     AI/animasi tetap berlaku sekaligus membuat pertemuan boss terasa acak. */
  bossCount(){return this.list.filter(m=>m.boss&&!m.dead).length;},

  /* ---------- apakah titik ini di dalam bangunan desa? ----------
     Monster tidak boleh muncul di dalam rumah (dulu bisa terjebak di ruang
     tamu penduduk). pad=1 juga menolak titik yang menempel dinding luar. */
  inBuilding(x,z){
    if(typeof WGEN==='undefined'||!WGEN.buildingAt)return false;
    return !!WGEN.buildingAt(Math.floor(x),Math.floor(z),1);
  },

  /* jumlah monster hidup dengan tipe tertentu */
  countType(type){

    let c=0;
    for(const m of this.list)if(!m.dead&&m.type===type)c++;
    return c;
  },
  /* pilih tipe monster memakai bobot BIOME_INFO.mobW (fallback: rata) */
  pickType(biome,night){
    const BI=BIOME_INFO[biome];
    const pool=BI.mobs,W=BI.mobW;
    if(!W)return pool[(Math.random()*pool.length)|0];
    let total=0;const w=[];
    for(const t of pool){
      /* golem tetap ditekan pada siang hari supaya awal permainan tidak brutal,
         tapi sekarang lewat bobot — bukan diubah paksa menjadi slime seperti
         dulu (itu ikut memakan kuota populasi milik serigala). */
      let ww=W[t]!==undefined?W[t]:1;
      if(t==='golem')ww*=night?0.7:0.35;
      /* serigala pemburu malam, tapi kenaikan malamnya ditekan (1.6→1.15)
         agar serigala tidak lagi mendominasi populasi */
      if(t==='wolf')ww*=night?1.15:1;
      w.push(ww);total+=ww;
    }
    let r=Math.random()*total;
    for(let i=0;i<pool.length;i++){r-=w[i];if(r<=0)return pool[i];}
    return pool[pool.length-1];
  },
  /* ---------- definisi entitas per tipe mob ----------
     Mengambil objek Mob_X dari js/entities/mob_x.js (model + animasi). */
  def(type){
    return window['Mob_'+type.charAt(0).toUpperCase()+type.slice(1)];
  },

  spawn(){
    const night=Weather.nightF>0.5;
    const cap=night?13:9;
    if(this.list.length>=cap)return;
    const a=Math.random()*Math.PI*2,d=rand(17,28);
    const x=Player.pos.x+Math.sin(a)*d,z=Player.pos.z+Math.cos(a)*d;
    const h=World.topY(Math.floor(x),Math.floor(z));
    if(h<CFG.SEA)return; // hanya daratan (di atas permukaan air)
    /* JANGAN spawn di dalam / menempel bangunan desa. Dulu monster bisa
       muncul di ruang tamu penduduk lalu terjebak di antara dinding. */
    if(this.inBuilding(x,z))return;

    /* pilih monster dari daftar biome tempat spawn → tiap wilayah beda musuh */
    const biome=WGEN.biomeAt(Math.floor(x),Math.floor(z));
    let type=this.pickType(biome,night);
    /* NAGA hanya boleh muncul di ALAM TERBUKA — tidak di dalam/dekat desa dan
       tidak di dalam dungeon. Bila posisi spawn tak memenuhi, undi ulang sekali;
       masih naga juga maka percobaan spawn ini dibatalkan. */
    if(type==='dragon'){
      const nv=WGEN.nearestVillage(x,z);
      const nd=(typeof WGEN.nearestDungeon==='function')?WGEN.nearestDungeon(x,z):null;
      const nearVillage=nv&&nv.dist<nv.v.r+6;
      const inDungeon=nd&&nd.dist<=nd.d.r+6;
      if(nearVillage||inDungeon){
        type=this.pickType(biome,night);
        if(type==='dragon')return;
      }
    }
    /* Kuota lunak per tipe: mencegah satu jenis (dulu slime) mendominasi
       seluruh populasi sehingga jenis lain seperti serigala nyaris tak
       pernah terlihat. Bila kuota penuh, undi ulang sekali. */
    const quota=Math.max(3,Math.ceil(cap*0.45));
    if(this.countType(type)>=quota){
      const alt=this.pickType(biome,night);
      if(this.countType(alt)<quota)type=alt;
      else if(this.countType(type)>=quota+1)return;
    }
    /* peluang boss: naik seiring level pemain & malam hari, dibatasi BOSS_MAX.
       Mob alwaysBoss (naga) SELALU boss bila slot boss masih tersedia. */
    const bossChance=Math.min(0.16,0.02+Player.level*0.006)*(night?1.8:1);
    let boss=this.bossCount()<CFG.BOSS_MAX&&Math.random()<bossChance;
    if(this.TYPES[type].alwaysBoss&&this.bossCount()<CFG.BOSS_MAX)boss=true;
    const m=this.make(type,new THREE.Vector3(x,h,z),boss);
    this.list.push(m);
    if(boss){
      UI.toast(`☠️ ${MOB_NAME[type]||type} Raksasa muncul!`);
      FX.ring(x,h+0.1,z,0xff6bd6,1.2,5);
    }
    /* ---------- KAWANAN SERIGALA ----------
       Serigala berburu berkelompok, tapi jumlah kawan DIKURANGI (dulu 1-2
       hampir selalu) supaya populasi serigala tidak berlebihan. Sekarang
       hanya 30% peluang membawa 1 kawan (malam 45%). */
    if(type==='wolf'&&!boss){
      const mates=(Math.random()<(night?0.45:0.30))?1:0;
      for(let k=0;k<mates;k++){
        if(this.list.length>=cap)break;
        const px=x+rand(-3.5,3.5),pz=z+rand(-3.5,3.5);
        const ph=World.topY(Math.floor(px),Math.floor(pz));
        if(ph<CFG.SEA||this.inBuilding(px,pz))continue;
        this.list.push(this.make('wolf',new THREE.Vector3(px,ph,pz),false));

      }
    }
  },

  /* ---------- SPAWN LIZARD (khusus tepi sungai/danau) ----------
     Lizard tidak ikut undian biome; ia spawn terpisah di blok daratan yang
     bersebelahan langsung dengan air. Dicoba berkala (timer lizardT) selama
     jumlah lizard hidup belum mencapai kuota.

     ANTI-SPAM: lizard sengaja dibuat LANGKA. Kuota hanya 2 ekor, percobaan
     tiap 14 detik, dan hanya ~55% percobaan yang benar-benar undi posisi.
     Posisi juga harus berjarak 16-34 blok dari pemain dan tidak boleh ada
     lizard lain dalam 12 blok supaya tidak menumpuk di satu tepi sungai. */
  LIZARD_MAX:2,
  spawnLizard(){
    if(this.countType('lizard')>=this.LIZARD_MAX)return;
    if(Math.random()>0.55)return;                       // tidak selalu spawn
    for(let t=0;t<14;t++){
      const a=Math.random()*Math.PI*2,d=rand(16,34);
      const x=Player.pos.x+Math.sin(a)*d,z=Player.pos.z+Math.cos(a)*d;
      const bx=Math.floor(x),bz=Math.floor(z);
      const h=World.topY(bx,bz);
      if(h<CFG.SEA)continue;                       // harus daratan
      if(this.inBuilding(bx,bz))continue;          // bukan di desa
      /* wajib bersebelahan dengan air (tepi sungai/danau) */
      let nearWater=false;
      for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){
        if(World.inWaterAt(bx+dx,CFG.WATER_Y-0.2,bz+dz)){nearWater=true;break;}
      }
      if(!nearWater)continue;
      /* jangan menumpuk: tolak bila sudah ada lizard terlalu dekat */
      let crowded=false;
      for(const m of this.list){
        if(m.dead||m.type!=='lizard')continue;
        if(Math.hypot(m.pos.x-x,m.pos.z-z)<12){crowded=true;break;}
      }
      if(crowded)continue;
      const m=this.make('lizard',new THREE.Vector3(bx+0.5,h,bz+0.5),false);
      this.list.push(m);
      return;
    }
  },

  /* ---------- SPAWN TERNAK PASIF (sapi & kuda) ----------
     Kuota kecil supaya tidak memenuhi populasi. Sapi muncul di hutan,
     kuda juga bisa muncul di gurun. Spawn dalam kelompok kecil. */
  COW_MAX:3,
  HORSE_MAX:2,
  spawnLivestock(){
    if(this.list.length>18)return;
    const cows=this.countType('cow'),horses=this.countType('horse');
    let type=null;
    if(cows<this.COW_MAX&&(horses>=this.HORSE_MAX||Math.random()<0.6))type='cow';
    else if(horses<this.HORSE_MAX)type='horse';
    if(!type)return;
    for(let t=0;t<12;t++){
      const a=Math.random()*Math.PI*2,d=rand(18,32);
      const x=Player.pos.x+Math.sin(a)*d,z=Player.pos.z+Math.cos(a)*d;
      const bx=Math.floor(x),bz=Math.floor(z);
      const h=World.topY(bx,bz);
      if(h<CFG.SEA)continue;
      if(this.inBuilding(bx,bz))continue;
      const biome=WGEN.biomeAt(bx,bz);
      if(biome!==BIOME.FOREST&&!(type==='horse'&&biome===BIOME.DESERT))continue;
      const n=rand(1,2);
      for(let k=0;k<n;k++){
        const px=x+rand(-2.5,2.5),pz=z+rand(-2.5,2.5);
        const ph=World.topY(Math.floor(px),Math.floor(pz));
        if(ph<CFG.SEA||this.inBuilding(Math.floor(px),Math.floor(pz)))continue;
        this.list.push(this.make(type,new THREE.Vector3(px,ph,pz),false));
      }
      return;
    }
  },

  make(type,pos,boss=false){
    const T=this.TYPES[type];

    /* Model & parts dibangun file entitas per mob di js/entities/ */
    const built=this.def(type).build(boss);
    const g=built.mesh,parts=built.parts;
    g.position.copy(pos);
    /* boss: tubuh diperbesar + aura ungu berdenyut agar langsung terbaca.
       Mob noBossScale (naga) sudah besar dari modelnya, jadi skala 1.75
       dilewati agar tidak raksasa ganda — tapi aura & mahkota tetap dipasang. */
    if(boss){
      if(!T.noBossScale)g.scale.setScalar(1.75);
      const aura=new THREE.Mesh(
        new THREE.BoxGeometry(1.5,1.5,1.5),
        new THREE.MeshBasicMaterial({color:0xff6bd6,transparent:true,opacity:0.16}));
      aura.position.y=meshHeight(type)*0.5;
      g.add(aura);parts.aura=aura;
      /* mahkota rune melayang di atas kepala */
      for(let i=0;i<4;i++){
        const sp=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.3,0.12),
          new THREE.MeshBasicMaterial({color:0xffa8ea}));
        const a=i/4*Math.PI*2;
        sp.position.set(Math.cos(a)*0.5,meshHeight(type)+0.5,Math.sin(a)*0.5);
        g.add(sp);
      }
    }
    Game.scene.add(g);
    /* skala dasar model (lizard punya skala kecil bawaan build; boss 1.75).
        Disimpan supaya animasi mati (scale-down) mengalikan dari skala ini,
        BUKAN menimpanya ke 1 — dulu lizard "membesar" dulu saat mati karena
        skala 0.23 ditimpa setScalar(1-...). */
    const baseScale=g.scale.x;
    /* stat boss: HP & damage berlipat, XP besar, sedikit lebih lambat */
    const mul=boss?CFG.BOSS_HP_MUL||6:1;
    const hp=Math.round(T.hp*mul);
    return {type,boss,mesh:g,parts,pos:pos.clone(),vel:new THREE.Vector3(),
      baseScale,
      hp,maxhp:hp,state:'wander',t:rand(0.5,2),atkCd:rand(0,1),
      dir:Math.random()*Math.PI*2,
      speed:T.speed*(boss?0.85:1),
      dmg:Math.round(T.dmg*(boss?2.2:1)),
      xp:Math.round(T.xp*(boss?7:1)),
      r:T.r*(boss?1.75:1),
      dead:false,deathT:0,flash:0,hopT:rand(0.5,1.5),onGround:false,inWater:false,
      windup:0,smashTarget:null,poisonHit:0,
      /* status dari efek senjata: pendarahan, racun bilah, perlambatan */
      bleedHit:0,bleedT:0,bleedDmg:0,
      venomHit:0,venomT:0,venomDmg:0,
      slowT:0,slowMul:1};

  },


  /* =========================================================================
     ANCAMAN (THREAT / AGGRO)
     -------------------------------------------------------------------------
     Dulu monster selalu menargetkan pemain, jadi rekan NPC yang memukulinya
     diabaikan. Sekarang setiap monster mencatat total damage per penyerang;
     penyerang paling agresif (threat tertinggi) menjadi sasarannya. Nilai
     threat menyusut perlahan supaya monster kembali ke pemain bila rekannya
     berhenti menyerang. Skill 'taunt' menambah threat lewat pengali.
     ========================================================================= */
  THREAT_DECAY:0.12,          // fraksi threat yang menyusut per detik
  threatKey(src){return !src||src===Player?'player':'npc'+src.id;},
  addThreat(m,src,dmg,mul=1){
    if(!m.threat)m.threat={};
    const k=this.threatKey(src);
    const e=m.threat[k]||(m.threat[k]={v:0,npc:src&&src!==Player?src:null});
    e.v+=dmg*mul;
  },
  /* pilih sasaran dengan threat tertinggi; NPC yang mati/jauh dibuang */
  pickFoe(m,dt){
    if(!m.threat)return;
    let bestK=null,bestV=0;
    for(const k in m.threat){
      const e=m.threat[k];
      e.v*=Math.max(0,1-this.THREAT_DECAY*dt);
      if(e.npc&&(e.npc.dead||e.npc.pos.distanceTo(m.pos)>24))e.v=0;
      if(e.v<0.5){delete m.threat[k];continue;}
      if(e.v>bestV){bestV=e.v;bestK=k;}
    }
    const e=bestK?m.threat[bestK]:null;
    /* threat NPC harus jelas melampaui threat pemain (20% margin) supaya
       monster tidak berkedip bolak-balik antara dua sasaran yang seimbang */
    const pv=(m.threat.player&&m.threat.player.v)||0;
    m.foe=(e&&e.npc&&e.v>pv*1.2)?e.npc:null;
  },

  hurt(m,dmg,dir,knock,src){
    if(m.dead)return;
    /* NPC (rekan/penjaga) tidak boleh melukai hewan ternak (animal).
       Pemain tetap bisa, predator juga bisa. */
    if(this.isAnimal(m)&&src&&src!==Player&&src.role)return;
    /* siapa sumber serangan terakhir (untuk XP/drop & ternak kabur) */
    m.lastSrc=src;
    /* akumulasi damage pemain untuk kontribusi XP saat monster mati.
       src kosong = skill pemain (slam/whirl), bleed/venom senjata, atau
       thorns — semuanya dihitung sebagai damage pemain. Damage dibatasi
       HP tersisa supaya overkill tidak menggelembungkan kontribusi. */
    if(!src||src===Player)m.pDmg=(m.pDmg||0)+Math.min(dmg,Math.max(0,m.hp));
    /* dipukul = otomatis waspada walau pemain di luar kerucut pandang */
    m.hp-=dmg;m.flash=0.18;m.state='chase';
    m.alert=Math.max(m.alert||0,6);m.seeT=CFG.MOB.MEM;
    /* catat siapa yang memukul — dasar pemilihan sasaran */
    this.addThreat(m,src,dmg,
      src&&src!==Player&&src.role&&(src.role.skill.id==='taunt'||src.role.skill.id==='lionclaw')?2.2:1);
    m.vel.addScaledVector(dir,knock);m.vel.y=Math.max(m.vel.y,2.5);
    FX.text(m.pos.clone().add(new THREE.Vector3(0,meshHeight(m.type)+0.6,0)),
      String(Math.round(dmg)),'#ffd24d');
    FX.debris(m.pos.clone().add(new THREE.Vector3(0,1,0)),0xff5544,4,2);
    Sfx.hit();
    if(m.hp<=0)this.kill(m);
  },
  kill(m){
    m.dead=true;m.deathT=0;
    /* XP & kill credit sebanding dengan kontribusi damage pemain.
       contrib = porsi HP monster yang dihancurkan pemain (0..1).
       Monster yang mati murni oleh rekan NPC / monster lain tanpa bantuan
       pemain tidak memberi XP/proficiency — pemain hanya bisa ambil drop. */
    const contrib=(m.pDmg>0&&m.maxhp>0)?clamp(m.pDmg/m.maxhp,0,1):0;
    if(contrib>0){
      /* efek 'greed' (set emas) menambah XP yang diperoleh */
      const xp=Math.max(1,Math.round(m.xp*contrib*(RPG.xpMult?RPG.xpMult():1)));
      Player.addXP(xp);Player.kills++;
      FX.text(m.pos.clone().add(new THREE.Vector3(0,2.2,0)),
        contrib>=0.999?`+${xp} XP`:`+${xp} XP (${Math.round(contrib*100)}%)`,'#8fd4ff');
      /* proficiency bertarung ikut porsi kontribusi; monster kuat tetap
         berharga walau level tinggi. typeof-guard supaya 3D Studio (yang
         memuat monsters.js tanpa skills.js) tidak error bila memanggil kill(). */
      if(typeof Prof!=='undefined'){
        const al=(m.xp>=40)?30:(m.xp>=25)?20:(m.xp>=15)?10:1;
        const base=6+Math.round((m.xp||10)*0.5);
        Prof.gain('combat',Math.max(1,Math.round(base*contrib)),al);
      }
    }

    const d=
      m.type==='slime'?[['gel',1+(Math.random()<0.5?1:0)]]:
      m.type==='boar'?[['meat',1+(Math.random()<0.5?1:0)],['fiber',Math.random()<0.4?1:0]]:
      /* serigala: kulit bulu untuk armor kulit + daging */
      m.type==='wolf'?[['pelt',1+(Math.random()<0.45?1:0)],['meat',1]]:
      /* kalajengking: racun sebagai bahan langka */
      m.type==='scorpion'?[['venom',1],['fiber',Math.random()<0.5?1:0]]:
       /* kelinci: daging + jarang sekali bulu halus */
       m.type==='rabbit'?[['meat',1],['fiber',Math.random()<0.25?1:0]]:
       /* ternak: daging + kulit */
       m.type==='cow'?[['meat',2],['leather',2]]:
       m.type==='horse'?[['meat',2],['leather',2]]:
       [['stone',2+(Math.random()<0.5?1:0)],['meat',1]];
    /* boss selalu menjatuhkan inti boss (bahan set kristal) + drop ganda */
    if(m.boss){
      d.push(['boss_core',1]);
      for(const e of d)e[1]*=2;
    }
    for(const[id,n]of d)if(n>0)
      FX.spawnDrop(m.pos.clone().add(new THREE.Vector3(rand(-0.4,0.4),0.6,rand(-0.4,0.4))),id,n);
    /* koin: peluang drop dari tiap monster (lebih besar utk mob kuat & boss).
       Koin langsung masuk kantong (bukan item dunia) agar tidak nyangkut.
       Hanya dapat koin bila pemain ikut berkontribusi damage. */
    const coinChance=m.boss?1:0.45;
    if(contrib>0&&Math.random()<coinChance){
      const base=m.boss?18:Math.max(1,Math.round(m.xp/14));
      const coin=base+(Math.random()<0.3?1:0);
      RPG.addCoin(coin);
    }
    const dustColor=m.type==='slime'?0x67c74f:m.type==='boar'?0x6b4a34:
      m.type==='wolf'?0x6f7480:m.type==='scorpion'?0x8a5a2b:
      m.type==='lizard'?0x4e8f3a:0x8a8f98;
    FX.debris(m.pos.clone().add(new THREE.Vector3(0,0.8,0)),
      m.boss?0xff6bd6:dustColor,m.boss?32:16,m.boss?5:3.5);
    /* GORE: bagian tubuh (kepala/kaki/daging) terlepas terhambur. Hanya untuk
       makhluk organik; golem (batu) cukup reruntuhan di atas. Dioptimalkan
       memakai pool InstancedMesh FX.gib. */
    const GIB_COLORS={
      slime:[0x67c74f,0x82e065,0x4f9e3a],
      boar:[0x6b4a34,0x8a5f42,0xc94f43],
      wolf:[0x6f7480,0x8f95a2,0xa9aeb8],
      scorpion:[0x8a5a2b,0x6a4320,0xb07a3c],
      rabbit:[0xc9b5a0,0xa08570,0xe0d0bc],
      lizard:[0x4e8f3a,0x69a94b,0x33682a],
      cow:[0xefe8d8,0x2e2a25,0xd9ac92],
      horse:[0x945c33,0x2b2b30,0xe8e4da],
    };
    if(GIB_COLORS[m.type])
      FX.gib(m.pos.clone().add(new THREE.Vector3(0,m.boss?1.4:0.7,0)),
        GIB_COLORS[m.type],m.boss?26:12,m.boss?4.5:3);
    if(m.boss){
      FX.ring(m.pos.x,m.pos.y+0.1,m.pos.z,0xff6bd6,1.2,7);
      UI.toast(`🏆 ${MOB_NAME[m.type]||m.type} Raksasa dikalahkan!`);
    }
  },


  update(dt){
    this.timer-=dt;
    if(this.timer<=0){this.timer=1.4;this.spawn();}
    /* lizard tepi sungai: dicoba tiap 14 detik (langka, anti-spam) */
    this.lizardT=(this.lizardT||0)-dt;
    if(this.lizardT<=0){this.lizardT=14;this.spawnLizard();}
    /* ternak pasif (sapi/kuda): dicoba berkala dengan kuota kecil */
    this.liveT=(this.liveT||0)-dt;
    if(this.liveT<=0){this.liveT=9;this.spawnLivestock();}
    for(let i=this.list.length-1;i>=0;i--){
      const m=this.list[i];
      if(m.dead){
        m.deathT+=dt;
        m.mesh.scale.setScalar(Math.max(0.001,(m.baseScale||1)*(1-m.deathT*2)));
        m.mesh.rotation.x=m.deathT*2;
        if(m.deathT>0.55){
          Game.scene.remove(m.mesh);
          m.mesh.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});
          this.list.splice(i,1);
        }
        continue;
      }
      m.flash=Math.max(0,m.flash-dt);
      m.atkCd-=dt;
      /* ---- status dari efek senjata pemain ---- */
      /* pendarahan (Bilah Besi Bergerigi): damage kecil beruntun */
      if(m.bleedHit>0){
        m.bleedT-=dt;
        if(m.bleedT<=0){
          m.bleedT=0.6;m.bleedHit--;
          this.hurt(m,m.bleedDmg||2,new THREE.Vector3(0,0.1,0),0);
          FX.debris(m.pos.clone().add(new THREE.Vector3(0,0.9,0)),0xd64550,3,1.2);
        }
      }
      /* racun bilah (Taring Racun): tumpukan damage bertahap */
      if(m.venomHit>0){
        m.venomT-=dt;
        if(m.venomT<=0){
          m.venomT=0.8;m.venomHit--;
          this.hurt(m,m.venomDmg||2,new THREE.Vector3(0,0.1,0),0);
          FX.debris(m.pos.clone().add(new THREE.Vector3(0,0.9,0)),0x9ad84f,3,1.2);
        }
      }
      /* perlambatan (Pedang Fajar Beku): dipakai saat menghitung kecepatan */
      if(m.slowT>0){
        m.slowT-=dt;
        if(m.slowT<=0)m.slowMul=1;
        else if(Math.random()<dt*4)
          FX.debris(m.pos.clone().add(new THREE.Vector3(0,0.8,0)),0x9fe8ff,1,0.8);
      }
      if(m.dead)continue;

      /* efek racun kalajengking: damage susulan tiap 1 detik */
      if(m.poisonHit>0){
        m.poisonT-=dt;
        if(m.poisonT<=0){
          m.poisonT=1.0;m.poisonHit--;
          if(!Player.dead){
            Player.takeDamage(Math.max(2,Math.round(m.dmg*0.35)),null);
            FX.text(Player.pos.clone().add(new THREE.Vector3(0,2.2,0)),'☠ racun','#9ad84f');
          }
        }
      }
      /* aura & mahkota boss berdenyut supaya mudah dibedakan dari jauh */
      if(m.boss&&m.parts.aura){
        const p=0.12+0.10*Math.sin(performance.now()*0.004);
        m.parts.aura.material.opacity=p;
        m.parts.aura.rotation.y+=dt*0.8;
      }

      const dp=m.pos.distanceTo(Player.pos);
      if(dp>55){Game.scene.remove(m.mesh);this.list.splice(i,1);continue;}
      this.ai(m,dt,dp);
      this.physics(m,dt);
      /* hewan ternak punya tabrakan badan dengan pemain/NPC/mob lain */
      if(m.type==='cow'||m.type==='horse')this.separateAnimal(m);
      m.mesh.position.copy(m.pos);
      this.animate(m,dt);

      /* ---------- SEMBURAN API NAGA saat terbang ----------
         Selama jendela sembur api (flyFireActive>0), pemain di dalam kerucut
         ~60° di depan naga (jarak <6) menerima damage berkala, dan BLOCK di
         titik jatuh api ikut TERBAKAR/hancur berkala seperti Hantaman golem. */
      if(m.type==='dragon'&&m.flyT>0&&!Player.dead){
        const stT=m.drag&&m.drag.stateT||0;
        const fb=(typeof Mob_Dragon!=='undefined')?Mob_Dragon.flyFireActive(stT):0;
        if(fb>0){
          m.fireCd=(m.fireCd||0)-dt;
          if(m.fireCd<=0){
            m.fireCd=0.4;
            const toP=new THREE.Vector3().subVectors(Player.pos,m.pos).setY(0);
            const dpp=toP.length();
            const yaw=m.mesh.rotation.y;
            const fx=Math.sin(yaw),fz=Math.cos(yaw);
            /* API MEMBAKAR BLOCK: titik jatuh api di tanah (searah hadap naga ke
               arah pemain), dihancurkan berkala persis pola destroyArea golem. */
            const reach=clamp(dpp,1.5,6);
            const ix=m.pos.x+fx*reach,iz=m.pos.z+fz*reach;
            World.destroyArea(ix,iz,1.6);
            FX.ring(ix,World.topY(Math.floor(ix),Math.floor(iz))+0.05,iz,0xff5a2a,0.5,1.8);
            FX.debris(new THREE.Vector3(ix,World.topY(Math.floor(ix),Math.floor(iz)),iz),0xff6a30,6,2.2);
            if(dpp<6&&dpp>0.001){
              const dot=(toP.x*fx+toP.z*fz)/dpp;
              if(dot>0.5){                       // kerucut ~60° di depan naga
                Player.takeDamage(Math.max(3,Math.round(m.dmg*0.7)),m.pos);
                FX.debris(Player.pos.clone().add(new THREE.Vector3(0,1,0)),0xff7a2e,6,2.4);
                FX.text(Player.pos.clone().add(new THREE.Vector3(0,2.2,0)),'🔥','#ff7a2e');
              }
            }
          }
        }
      }
      /* SAPUAN EKOR LIZARD: damage AoE di frame hit (tengah spin ~0.55-0.7).
         Radius diperkecil 3.2→2.5 mengikuti model yang kini seukuran babi. */
      if(m.type==='lizard'&&(m.tailT||0)>0&&!m._tailHit&&m.tailT<0.7){
        m._tailHit=true;
        FX.ring(m.pos.x,m.pos.y+0.1,m.pos.z,0x2fae24,0.8,2.5);
        if(m.pos.distanceTo(Player.pos)<2.5&&!Player.dead){
          Player.takeDamage(Math.max(3,Math.round(m.dmg*0.8)),m.pos);
          FX.debris(Player.pos.clone().add(new THREE.Vector3(0,1,0)),0x69a94b,8,2.6);
          FX.text(Player.pos.clone().add(new THREE.Vector3(0,2.2,0)),'💥','#69a94b');
        }
      }
    }
    /* proyektil asam lizard: update global sekali per frame */
    if(typeof Mob_Lizard!=='undefined')Mob_Lizard.updateAcid(dt);
  },

  ai(m,dt,dp){
    const T=this.TYPES[m.type];
    const toP=new THREE.Vector3().subVectors(Player.pos,m.pos).setY(0);
    const angP=Math.atan2(toP.x,toP.z);
    
    /* ---------- TERNAK PASIF: sapi & kuda ----------
       Tidak menyerang; hanya jalan-jalan, merumput, tidur (sapi), dan kabur
       dari predator atau pemain yang menyerang. */
    if(m.type==='cow'||m.type==='horse'){
      this.aiLivestock(m,dt,dp);
      return;
    }

    /* ---------- KELINCI PASIF: kabur dari bahaya ----------
       Kelinci tidak menyerang. Bila ada pemain atau monster lain dalam radius
       10 blok, kelinci kabur berlari kencang ke arah berlawanan. */
    if(m.type==='rabbit'){
      const FLEE_DIST=10;
      let threat=null,threatD=999;
      /* cek pemain */
      if(!Player.dead&&dp<FLEE_DIST&&dp<threatD){threat=Player.pos;threatD=dp;}
      /* cek monster lain (predator) */
      for(const o of this.list){
        if(o===m||o.dead||o.type==='rabbit')continue;
        const d=m.pos.distanceTo(o.pos);
        if(d<FLEE_DIST&&d<threatD){threat=o.pos;threatD=d;}
      }
      if(threat){
        /* kabur: arah berlawanan dari ancaman */
        const away=new THREE.Vector3().subVectors(m.pos,threat).setY(0);
        if(away.lengthSq()>0.01){
          const fleeAng=Math.atan2(away.x,away.z);
          m.mesh.rotation.y=angLerp(m.mesh.rotation.y,fleeAng,dt*8);
          const sp=m.speed*(m.inWater?0.5:1)*(m.slowMul||1);
          m.vel.x=lerp(m.vel.x,Math.sin(fleeAng)*sp,clamp(8*dt,0,1));
          m.vel.z=lerp(m.vel.z,Math.cos(fleeAng)*sp,clamp(8*dt,0,1));
          /* lompatan panik: kelinci melompat cepat saat kabur */
          if(m.onGround){
            m.hopT-=dt;
            if(m.hopT<=0){
              m.hopT=rand(0.4,0.8);
              m.vel.y=5.5;
              m.vel.x+=Math.sin(fleeAng)*3;m.vel.z+=Math.cos(fleeAng)*3;
            }
          }
        }
      }else{
        /* aman: jelajah santai */
        m.t-=dt;
        if(m.t<=0){m.t=rand(2,5);m.dir=Math.random()*Math.PI*2;m.walking=Math.random()<0.7;}
        if(m.walking){
          m.mesh.rotation.y=angLerp(m.mesh.rotation.y,m.dir,dt*3);
          const sp=m.speed*0.25;
          m.vel.x=lerp(m.vel.x,Math.sin(m.dir)*sp,clamp(4*dt,0,1));
          m.vel.z=lerp(m.vel.z,Math.cos(m.dir)*sp,clamp(4*dt,0,1));
          /* lompatan kecil santai */
          if(m.onGround){
            m.hopT-=dt;
            if(m.hopT<=0){m.hopT=rand(1.2,2.5);m.vel.y=4.2;}
          }
        }else{m.vel.x*=0.88;m.vel.z*=0.88;}
      }
      return;
    }
    
    if(m.windup>0){ /* golem: telegraph smash */
      m.windup-=dt;
      const p=1-m.windup/0.8;
      m.parts.armL.rotation.x=lerp(0,-2.6,Math.min(1,p*1.6));
      m.parts.armR.rotation.x=lerp(0,-2.6,Math.min(1,p*1.6));
      m.mesh.rotation.y=angLerp(m.mesh.rotation.y,angP,dt*5);
      if(m.windup<=0){this.doSmash(m);}
      return;
    }
    /* ---------- sasaran paling agresif ----------
       Bila ada NPC yang threat-nya melampaui pemain, monster berbalik
       melawan NPC itu dan mengabaikan pemain sampai threat-nya menyusut. */
    this.pickFoe(m,dt);
    if(m.foe&&!m.foe.dead){this.aiVsNpc(m,dt);return;}
    /* ---------- PREDATOR MEMBURU SAPI ----------
       Semua predator kecuali golem & slime dapat menyerang sapi. Dilakukan
       hanya bila pemain tidak terlalu dekat, supaya monster tidak mengabaikan
       ancaman utama. */
    if(!T.passive&&m.type!=='golem'&&m.type!=='slime'&&!(m.flyT>0)){
      const prey=this.nearestCow(m,15);
      if(prey&&dp>Math.max(10,T.aggro*0.45)){
        this.aiVsCow(m,dt,prey);
        return;
      }
    }
    /* ---------- aggro berbasis penglihatan ----------
       Monster tidak lagi otomatis mengejar begitu pemain masuk radius.
       Syaratnya: pemain cukup dekat DAN berada di dalam kerucut pandang
       monster (arah hadap mesh). Bila pemain sangat dekat (CFG.MOB.NEAR)
       monster tetap sadar walau membelakangi — dianggap mendengar langkah.
       Setelah kehilangan pandangan, monster masih mengejar CFG.MOB.MEM detik
       supaya tidak langsung "lupa". m.alert diisi saat monster dipukul. */
    const MB=CFG.MOB;
    const sight=Math.min(T.aggro,MB.SIGHT);
    m.seeT=Math.max(0,(m.seeT||0)-dt);
    m.alert=Math.max(0,(m.alert||0)-dt);
    let sees=false;
    if(!Player.dead&&dp<sight){
      if(dp<MB.NEAR)sees=true;                       // terlalu dekat: pasti sadar
      else{
        let da=angP-m.mesh.rotation.y;               // selisih sudut hadap
        da=Math.atan2(Math.sin(da),Math.cos(da));
        sees=Math.abs(da)<MB.FOV;
      }
      /* LINE OF SIGHT: monster tidak bisa melihat menembus blok padat (dinding
         rumah, batu, dsb). Bila terhalang, pemain dianggap tak terlihat walau
         dekat & berada di kerucut pandang. */
      if(sees&&World.losBlocked(m.pos.x,m.pos.y+Math.max(1.0,meshHeight(m.type)*0.6),m.pos.z,
                                Player.pos.x,Player.pos.y+1.4,Player.pos.z))sees=false;
    }
    if(sees)m.seeT=MB.MEM;

    if(Player.dead){m.state='wander';}
    else if(sees||m.seeT>0||m.alert>0)m.state='chase';
    else m.state='wander';

    if(m.state==='chase'&&!Player.dead){
      m.mesh.rotation.y=angLerp(m.mesh.rotation.y,angP,dt*6);
      /* slowMul: perlambatan dari efek beku senjata pemain */
      let sp=m.speed*(m.inWater?0.5:1)*(m.slowMul||1);
      /* NAGA LARI: saat target masih jauh, naga berlari mengejar (burst speed)
         supaya animasi poseRun terpakai, bukan terus berjalan pelan. */
      if(m.type==='dragon'&&dp>5.0)sp*=2.3;

      if(m.type==='slime'){
        this.slimeHop(m,dt,angP,sp*2.1,0.75,1.25);
      }else{
        m.vel.x=lerp(m.vel.x,Math.sin(angP)*sp,clamp(6*dt,0,1));
        m.vel.z=lerp(m.vel.z,Math.cos(angP)*sp,clamp(6*dt,0,1));
      }

      /* serangan */
      if(m.atkCd<=0){
        if(m.type==='slime'&&dp<1.1){Player.takeDamage(m.dmg,m.pos);m.atkCd=1.0;}
        else if(m.type==='boar'&&dp<1.5){
          Player.takeDamage(m.dmg,m.pos);m.atkCd=1.2;
          m.parts.head.rotation.x=-0.6;
        }
        else if(m.type==='wolf'&&dp<1.7){
          /* gigitan cepat + lompatan kecil ke arah pemain */
          Player.takeDamage(m.dmg,m.pos);m.atkCd=0.85;
          m.biteT=0.22;
          if(m.onGround){m.vel.y=3.2;
            m.vel.x+=Math.sin(angP)*3;m.vel.z+=Math.cos(angP)*3;}
        }
        else if(m.type==='scorpion'&&dp<1.9){
          /* sengat beracun: damage awal + dua kali damage susulan */
          Player.takeDamage(m.dmg,m.pos);m.atkCd=1.6;
          m.stingT=0.3;m.poisonHit=2;m.poisonT=1.0;
          FX.debris(Player.pos.clone().add(new THREE.Vector3(0,1,0)),0x9ad84f,6,2);
        }
        else if(m.type==='golem'&&dp<3.4){
          m.windup=0.8;m.atkCd=4;
          m.smashTarget=Player.pos.clone();
          FX.ring(m.smashTarget.x,m.smashTarget.y+0.05,m.smashTarget.z,0xff5544,0.8,3.4);
        }
        else if(m.type==='dragon'&&dp<4.0){
          /* Naga punya 2 serangan: cakar (jarak dekat) dan SEMBURAN API sambil
             terbang (30% peluang). Semburan api = terbang + semburkan api ke
             arah pemain selama jendela terbang. */
          if(!m.flyT&&Math.random()<0.3){
            m.flyT=3.9;m.atkCd=5.0;m.fireCd=0;      // semburan api sambil terbang
          }else{
            Player.takeDamage(m.dmg,m.pos);m.atkCd=2.0;
            m.clawT=0.95;
            FX.debris(Player.pos.clone().add(new THREE.Vector3(0,1,0)),0xC8352A,6,2.4);
            Sfx.at(m.pos,'hurt');
          }
        }
        else if(m.type==='lizard'){
          /* LIZARD: 3 serangan. Gigit (dekat), Sapuan Ekor (AoE, menengah),
             Semburan Asam (proyektil, jauh). Jarak gigit & sapuan diperkecil
             mengikuti model yang kini seukuran babi hutan. */
          if(dp<1.8){
            Player.takeDamage(m.dmg,m.pos);m.atkCd=1.15;
            m.biteT=0.62;
            FX.debris(Player.pos.clone().add(new THREE.Vector3(0,1,0)),0x4e8f3a,5,2.0);
            Sfx.at(m.pos,'hurt');
          }else if(dp<3.4&&Math.random()<0.45){
            m.tailT=1.2;m.atkCd=2.3;m._tailHit=false;
          }else if(dp<9.5){
            m.acidT=1.05;m.atkCd=2.6;m._acidFired=false;
          }
        }

      }
    }else{
      /* wander */
      m.t-=dt;
      if(m.t<=0){m.t=rand(1.5,4);m.dir=Math.random()*Math.PI*2;
        m.walking=Math.random()<0.6;}
      if(m.walking){
        m.mesh.rotation.y=angLerp(m.mesh.rotation.y,m.dir,dt*3);
        const sp=m.speed*0.4;
        m.vel.x=lerp(m.vel.x,Math.sin(m.dir)*sp,clamp(4*dt,0,1));
        m.vel.z=lerp(m.vel.z,Math.cos(m.dir)*sp,clamp(4*dt,0,1));
        if(m.type==='slime')this.slimeHop(m,dt,m.dir,m.speed*1.5,1.0,1.9);
      }else if(m.type==='slime'){
        /* slime tidak punya mode "berdiri diam": ia selalu memantul pelan
           supaya tidak pernah terlihat mematung di satu titik */
        this.slimeHop(m,dt,m.dir,m.speed*1.1,1.4,2.4);
      }else{m.vel.x*=0.85;m.vel.z*=0.85;}

    }
    /* splash monster di air */
    if(m.inWater&&Math.hypot(m.vel.x,m.vel.z)>1){
      if(Math.random()<dt*5)FX.debris(m.pos.clone().setY(CFG.WATER_Y),0xdff2fa,2,1.5);
    }
  },

  /* ---------- monster mengejar & menyerang NPC ----------
     Cabang terpisah dari jalur pemain supaya logika serangan ke pemain tetap
     utuh. Damage ke NPC memakai NPCS.hurt sehingga NPC bisa ikut mundur. */
  aiVsNpc(m,dt){
    const f=m.foe;
    /* BACKSTAB LEAP goblin: lawan yang sedang menunggangi punggung monster
       ini tidak bisa dipukul — monster tak bisa menggigit punggungnya
       sendiri. Ia hanya bisa bergetar di tempat sambil dirugikan. */
    if(f.gobRide===m){m.vel.x*=0.7;m.vel.z*=0.7;return;}
    const to=new THREE.Vector3().subVectors(f.pos,m.pos).setY(0);
    const ang=Math.atan2(to.x,to.z),d=to.length();
    m.state='chase';
    m.mesh.rotation.y=angLerp(m.mesh.rotation.y,ang,dt*6);
    let sp=m.speed*(m.inWater?0.5:1)*(m.slowMul||1);
    /* naga juga berlari saat mengejar NPC yang masih jauh */
    if(m.type==='dragon'&&d>5.0)sp*=2.3;
    if(d>1.2){
      m.vel.x=lerp(m.vel.x,Math.sin(ang)*sp,clamp(6*dt,0,1));
      m.vel.z=lerp(m.vel.z,Math.cos(ang)*sp,clamp(6*dt,0,1));
      if(m.type==='slime')this.slimeHop(m,dt,ang,sp*2.1,0.75,1.25);

    }else{m.vel.x*=0.7;m.vel.z*=0.7;}
    const reach=m.type==='golem'?3.2:m.type==='scorpion'?1.9:1.7;
    if(m.atkCd<=0&&d<reach){
      m.atkCd=m.type==='wolf'?0.85:m.type==='golem'?2.6:1.2;
      NPCS.hurt(f,m.dmg);
      if(m.type==='wolf')m.biteT=0.22;
      if(m.type==='scorpion')m.stingT=0.3;
      FX.debris(f.pos.clone().add(new THREE.Vector3(0,1,0)),0xff5544,4,2);
    }
  },

  /* =========================================================================
     TERNAK PASIF & PREDASI SAPI
     ========================================================================= */

  /* ---------- COLLISION HEWAN TERNAK ----------
     Sapi/kuda tidak tembus pemain, NPC, maupun mob lain. Penyelesaian gaya
     dorong simetris: kedua badan dipisahkan setengah penetrasi, dengan cek
     terrain agar tidak terdorong masuk tembok. */
  separateAnimal(m){
    if(m.dead)return;
    const R=m.r||0.6;
    const pushPair=(ox,oz,or,target)=>{
      const dx=m.pos.x-ox,dz=m.pos.z-oz;
      const d=Math.hypot(dx,dz),min=R+or;
      if(d>=min||d<1e-4)return;
      const push=(min-d)*0.5,ux=dx/d,uz=dz/d;
      /* dorong lawan */
      if(target==='player'){
        const px=ox-ux*push,pz=oz-uz*push;
        if(!World.blockedAt(px,Player.pos.y,Player.pos.z,0.3))Player.pos.x=px;
        if(!World.blockedAt(Player.pos.x,Player.pos.y,pz,0.3))Player.pos.z=pz;
      }else if(target&&target.pos){
        const nx=ox-ux*push,nz=oz-uz*push;
        if(target===m){/* tidak dipakai */}
        else if(this.canStand(target,nx,target.pos.z))target.pos.x=nx;
        if(this.canStand(target,target.pos.x,nz))target.pos.z=nz;
      }
      /* dorong hewan ini */
      const mx=m.pos.x+ux*push,mz=m.pos.z+uz*push;
      if(this.canStand(m,mx,m.pos.z))m.pos.x=mx;
      if(this.canStand(m,m.pos.x,mz))m.pos.z=mz;
    };

    /* pemain */
    if(!Player.dead)pushPair(Player.pos.x,Player.pos.z,CFG.PLAYER.radius||0.35,'player');

    /* NPC */
    if(typeof NPCS!=='undefined'){
      for(const n of NPCS.list){
        if(n.dead)continue;
        pushPair(n.pos.x,n.pos.z,0.42,n);
      }
    }

    /* mob lain */
    for(const o of this.list){
      if(o===m||o.dead)continue;
      pushPair(o.pos.x,o.pos.z,o.r||0.5,o);
    }
  },

  PREDATORS:['wolf','boar','scorpion','lizard','dragon'],

  /* kategori animal: sapi/kuda. NPC tidak boleh memburu/menyerang animal. */
  isAnimal(m){
    const T=m&&this.TYPES[m.type];
    return !!(T&&(T.animal||T.livestock));
  },

  /* sapi terdekat untuk predator */
  nearestCow(m,r){
    let best=null,bd=r;
    for(const o of this.list){
      if(o===m||o.dead||o.type!=='cow')continue;
      const d=m.pos.distanceTo(o.pos);
      if(d<bd){bd=d;best=o;}
    }
    return best;
  },

  /* AI sapi/kuda: santai, merumput, tidur, kabur */
  aiLivestock(m,dt,dp){
    m.grazeT=Math.max(0,(m.grazeT||0)-dt);
    m.sleepT=Math.max(0,(m.sleepT||0)-dt);
    m.alert=Math.max(0,(m.alert||0)-dt);

    /* cari ancaman: predator dekat, atau pemain yang baru menyerang */
    let threat=null,td=999;
    if(!Player.dead&&m.alert>0&&dp<13){threat=Player.pos;td=dp;}
    for(const o of this.list){
      if(o===m||o.dead)continue;
      if(this.PREDATORS.indexOf(o.type)<0)continue;
      const d=m.pos.distanceTo(o.pos);
      if(d<11&&d<td){threat=o.pos;td=d;}
    }

    /* KABUR dari ancaman */
    if(threat){
      m.sleepT=0;m.grazeT=0;m.walking=false;
      const away=new THREE.Vector3().subVectors(m.pos,threat).setY(0);
      if(away.lengthSq()>0.01){
        const ang=Math.atan2(away.x,away.z);
        m.mesh.rotation.y=angLerp(m.mesh.rotation.y,ang,dt*6);
        const sp=m.speed*(m.inWater?0.55:1)*(m.slowMul||1)*(m.type==='horse'?1.25:1.15);
        m.vel.x=lerp(m.vel.x,Math.sin(ang)*sp,clamp(7*dt,0,1));
        m.vel.z=lerp(m.vel.z,Math.cos(ang)*sp,clamp(7*dt,0,1));
        /* lompatan panik kecil saat kabur */
        if(m.onGround&&Math.random()<dt*1.3)m.vel.y=4.2;
      }
      return;
    }

    /* state machine santai */
    m.t-=dt;
    if(m.t<=0){
      const r=Math.random();
      if(m.type==='cow'&&r<0.12&&((typeof Weather!=='undefined'&&Weather.nightF>0.5)||Math.random()<0.25)){
        m.sleepT=rand(6,12);m.t=m.sleepT;
      }else if(r<0.48){
        m.grazeT=rand(3,7);m.t=m.grazeT;
      }else if(r<0.75){
        m.walking=true;m.dir=Math.random()*Math.PI*2;m.t=rand(2,5);
      }else{
        m.walking=false;m.t=rand(1.5,3.5);
      }
    }

    if(m.sleepT>0||m.grazeT>0){
      m.vel.x*=Math.exp(-5*dt);m.vel.z*=Math.exp(-5*dt);
      m.walking=false;
      return;
    }

    if(m.walking){
      m.mesh.rotation.y=angLerp(m.mesh.rotation.y,m.dir,dt*3);
      const sp=m.speed*0.4*(m.inWater?0.55:1);
      m.vel.x=lerp(m.vel.x,Math.sin(m.dir)*sp,clamp(4*dt,0,1));
      m.vel.z=lerp(m.vel.z,Math.cos(m.dir)*sp,clamp(4*dt,0,1));
    }else{
      m.vel.x*=0.85;m.vel.z*=0.85;
    }
  },

  /* predator mengejar & menyerang sapi */
  aiVsCow(m,dt,prey){
    const to=new THREE.Vector3().subVectors(prey.pos,m.pos).setY(0);
    const d=to.length(),ang=Math.atan2(to.x,to.z);
    m.state='chase';
    m.mesh.rotation.y=angLerp(m.mesh.rotation.y,ang,dt*6);
    const sp=m.speed*(m.inWater?0.5:1)*(m.slowMul||1);
    if(d>1.4){
      m.vel.x=lerp(m.vel.x,Math.sin(ang)*sp,clamp(6*dt,0,1));
      m.vel.z=lerp(m.vel.z,Math.cos(ang)*sp,clamp(6*dt,0,1));
    }else{
      m.vel.x*=0.7;m.vel.z*=0.7;
    }
    const reach=m.type==='dragon'?3.6:m.type==='lizard'?1.8:1.7;
    if(m.atkCd<=0&&d<reach){
      m.atkCd=m.type==='wolf'?0.9:1.3;
      const dir=d>0.001?to.clone().divideScalar(d):new THREE.Vector3(0,0,1);
      this.hurt(prey,m.dmg,dir,1.4,m);
      FX.debris(prey.pos.clone().add(new THREE.Vector3(0,1,0)),0xc94f43,5,2);
    }
  },

  doSmash(m){
    const c=m.smashTarget||m.pos;
    Sfx.smash();FX.addShake(0.75);
    /* efek hantaman persis fxSlam golem.html: dua ring + crescent slash
       merah menyapu tanah + serpihan batu */
    FX.ring(c.x,c.y+0.05,c.z,0xff5a35,0.55,5.5);
    FX.ring(c.x,c.y+0.05,c.z,0xdddddd,0.4,3.5);
    if(typeof PortFX!=='undefined')
      PortFX.crescent(c.x,c.y+1.1,c.z,m.mesh.rotation.y,-1.35,0,2.4,1.9,0.3,0xff5a2a);
    FX.debris(new THREE.Vector3(c.x,c.y+0.4,c.z),0x8a8a8a,22,4);
    World.destroyArea(c.x,c.z,2.4);
    const dp=Math.hypot(Player.pos.x-c.x,Player.pos.z-c.z);
    if(dp<3.0&&!Player.dead){
      Player.takeDamage(m.dmg,c);
      const diff=new THREE.Vector3().subVectors(Player.pos,c).setY(0);
      if(diff.lengthSq()>0.0001){
        const kd=diff.normalize();
        Player.vel.addScaledVector(kd,9);Player.vel.y=6;
      }
    }
    if(m.parts.armL)m.parts.armL.rotation.x=0.7;
    if(m.parts.armR)m.parts.armR.rotation.x=0.7;
  },

  /* ---------- LOMPATAN SLIME ----------
     BUG LAMA: setiap frame kecepatan horizontal slime dikalikan 0.2 —
     termasuk saat ia sedang melayang. Impuls lompatan langsung habis dalam
     satu-dua frame, jadi slime hanya bergetar di tempat dan tampak mematung.

     Sekarang: gaya dorong hanya diberikan pada saat kaki menyentuh tanah
     (satu impuls per lompatan) lalu momentum DIPERTAHANKAN selama di udara,
     sehingga slime benar-benar berpindah tempat tiap kali memantul.
     `push` = kekuatan dorong horizontal, `tMin/tMax` = jeda antar lompatan. */
  slimeHop(m,dt,ang,push,tMin,tMax){
    if(m.onGround){
      /* di tanah slime nyaris tak bisa menggeser badan (gesekan lendir) */
      m.vel.x*=Math.exp(-9*dt);m.vel.z*=Math.exp(-9*dt);
      m.hopT-=dt;
      if(m.hopT<=0){
        m.hopT=rand(tMin,tMax);
        m.vel.y=6.2;
        m.vel.x=Math.sin(ang)*push;
        m.vel.z=Math.cos(ang)*push;
        /* debu kecil saat melompat supaya gerakannya terbaca jelas */
        if(Math.random()<0.5)
          FX.debris(m.pos.clone().add(new THREE.Vector3(0,0.1,0)),0x67c74f,2,1.2);
      }
    }
    /* saat melayang: tidak ada peredaman tambahan → slime melesat mengikuti
       impuls tadi sampai mendarat kembali */
  },

  /* ---------- apakah langkah ke (x,z) bisa dilewati? ----------
     Dipakai bersama oleh fisika dan penghindar rintangan. Batas pencarian
     lantai = setinggi kepala agar ambang atas pintu tidak dianggap lantai. */
  canStand(m,x,z){

    return World.groundAt(x,z,m.pos.y+1.8)<=m.pos.y+1.02&&
           !World.blockedAt(x,m.pos.y,z);
  },

  /* ---------- REPATH: cari arah bebas terdekat ----------
     Monster dulu hanya memutar 90° saat mentok, jadi sering menempel di
     pohon/tembok lalu menabrak berulang. Sekarang arah yang diinginkan
     "digeser" ke kiri/kanan bertahap sampai menemukan jalur bebas —
     perilaku menyusur dinding sederhana tanpa biaya A* penuh.

     `want` = arah tujuan (radian). Mengembalikan arah yang aman, atau null
     bila semua arah dalam 120° tertutup. */
  freeDir(m,want,dist=0.85){
    const test=a=>this.canStand(m,
      m.pos.x+Math.sin(a)*dist, m.pos.z+Math.cos(a)*dist);
    if(test(want))return want;
    /* sudut coba: makin jauh dari arah tujuan makin akhir dicoba.
       Sisi yang dicoba lebih dulu dikunci per monster (m.side) supaya
       monster tidak bergetar bolak-balik di depan rintangan yang sama. */
    if(m.side===undefined)m.side=Math.random()<0.5?1:-1;
    for(const off of[0.45,0.9,1.35,1.8,2.3]){
      for(const s of[m.side,-m.side]){
        const a=want+off*s;
        if(test(a)){m.side=s;return a;}
      }
    }
    return null;
  },

  physics(m,dt){
    m.inWater=World.inWaterAt(m.pos.x,m.pos.y+0.3,m.pos.z);
    m.vel.y-=CFG.GRAV*(m.inWater?0.3:1)*dt;
    if(m.inWater){
      if(m.pos.y<CFG.WATER_Y-0.5)m.vel.y+=18*dt;
      m.vel.y=clamp(m.vel.y,-3,3.5);
    }
    /* ---------- hindari rintangan sebelum menabrak ----------
       Diperiksa saat monster benar-benar bergerak. Bila jalur di depan
       tertutup, kecepatan diputar ke arah bebas terdekat sehingga monster
       menyusuri tembok/pohon, bukan menempel lalu bergetar di sana. */
    const spd=Math.hypot(m.vel.x,m.vel.z);
    if(spd>0.25){
      const want=Math.atan2(m.vel.x,m.vel.z);
      /* jarak lihat ke depan mengikuti kecepatan: makin cepat, makin awal
         belokannya supaya tidak terlambat menghindar */
      const look=clamp(spd*0.32,0.55,1.4);
      if(!this.canStand(m,m.pos.x+Math.sin(want)*look,
                          m.pos.z+Math.cos(want)*look)){
        const alt=this.freeDir(m,want,look);
        if(alt!==null){
          m.vel.x=Math.sin(alt)*spd;m.vel.z=Math.cos(alt)*spd;
          /* arah jelajah & hadap ikut diperbarui agar animasinya konsisten */
          if(m.state!=='chase')m.dir=alt;
          m.mesh.rotation.y=angLerp(m.mesh.rotation.y,alt,clamp(dt*7,0,1));
        }else if(m.state!=='chase'){
          /* benar-benar terkurung: pilih arah acak baru & jeda sejenak */
          m.dir=Math.random()*Math.PI*2;m.t=rand(0.4,1.1);
        }
      }
    }
    const px0=m.pos.x,pz0=m.pos.z,py0=m.pos.y;   // patokan sebelum gravitasi
    const nx=m.pos.x+m.vel.x*dt;
    /* monster juga berhenti di blok padat, tidak menembus tembok/pohon */
    if(this.canStand(m,nx,m.pos.z))m.pos.x=nx;
    else{m.vel.x=0;if(m.type!=='slime')m.dir+=Math.PI*0.5;}
    const nz=m.pos.z+m.vel.z*dt;
    if(this.canStand(m,m.pos.x,nz))m.pos.z=nz;
    else{m.vel.z=0;if(m.type!=='slime')m.dir+=Math.PI*0.5;}
    m.pos.y+=m.vel.y*dt;
    /* BUGFIX tersedot ke dalam terrain: batalkan gerak bila tanah di posisi
       baru terlalu tinggi, dan selalu dorong mob ke permukaan bila terbenam.
       Pencarian lantai diukur dari py0 (sebelum gravitasi) agar konsisten &
       tidak terpotong saat mob sedang turun; pass unburyY menjamin mob tidak
       pernah tersisa DI DALAM blok padat. */
    const mrefY=Math.max(py0,m.pos.y)+1.8;
    let g=World.groundAt(m.pos.x,m.pos.z,mrefY);
    if(g>py0+1.05){
      m.pos.x=px0;m.pos.z=pz0;m.vel.x=0;m.vel.z=0;
      g=World.groundAt(px0,pz0,mrefY);
    }
    m.onGround=false;
    if(m.pos.y<=g){m.pos.y=g;if(m.vel.y<0)m.vel.y=0;m.onGround=true;}
    const mub=World.unburyY(m.pos.x,m.pos.z,m.pos.y);
    if(mub>m.pos.y){m.pos.y=mub;if(m.vel.y<0)m.vel.y=0;m.onGround=true;}
    /* RIDE WAVE: monster yang berdiri di atas blok tanah yang sedang
       terangkat oleh gelombang ikut naik mengikuti collision bloknya */
    if(typeof FX!=='undefined'&&FX.waveHeightAt){
      const wh=FX.waveHeightAt(m.pos.x,m.pos.z);
      if(wh>0.03&&m.pos.y<g+wh){m.pos.y=g+wh;if(m.vel.y<0)m.vel.y=0;m.onGround=true;}
    }
    /* naik satu blok: bila terhalang tapi ada pijakan setinggi 1 blok di
       depan, monster melompat kecil agar tidak tersangkut di tepi teras */
    if(m.onGround&&spd>0.6){
      const want=Math.atan2(m.vel.x,m.vel.z);
      const tx=m.pos.x+Math.sin(want)*0.7,tz=m.pos.z+Math.cos(want)*0.7;
      const step=World.groundAt(tx,tz,m.pos.y+1.8);
      if(step>m.pos.y+0.15&&step<=m.pos.y+1.25&&
         !World.blockedAt(tx,m.pos.y+1,tz))m.vel.y=5.6;
    }
    m.vel.x*=Math.exp(-2*dt);m.vel.z*=Math.exp(-2*dt);
  },

  animate(m,dt){
    const t=performance.now()*0.001;
    if(m.flash>0){
      /* flash putih terang saat kena hit, lalu memudar ke merah */
      const flashP=1-m.flash/0.18;
      const flashColor=flashP<0.4?0xffffff:0xaa2222;
      m.mesh.traverse(o=>{if(o.material&&o.material.emissive)o.material.emissive.setHex(flashColor);});
    }else{
      m.mesh.traverse(o=>{if(o.material&&o.material.emissive&&!o.material.__keep)o.material.emissive.setHex(0x000000);});
    }
    /* Seluruh animasi per tipe kini tinggal di file entitas js/entities/ */
    const def=this.def(m.type);
    if(def&&def.animate)def.animate(m,dt);
  },
};
/* tinggi kira-kira model, dipakai untuk posisi teks damage & aura boss */
function meshHeight(type){
  return type==='golem'?3:type==='dragon'?4.2:type==='cow'?1.8:type==='horse'?2.1:
    type==='lizard'?1.2:type==='boar'?1.1:
    type==='wolf'?1.35:type==='scorpion'?0.85:0.9;
}
