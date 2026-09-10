'use strict';
/* Monster: slime, babi hutan, golem perusak tanah, serigala, kalajengking */
/* nama tampilan untuk notifikasi & teks UI */
const MOB_NAME={slime:'Slime',boar:'Babi Hutan',golem:'Golem',
  wolf:'Serigala',scorpion:'Kalajengking',rabbit:'Kelinci',dragon:'Naga',
  lizard:'Lizard Rawa',cow:'Sapi',horse:'Kuda',
  kelabang:'Kelabang',kelabang_part:'Ruas Kelabang',kumbang:'Kumbang Tanduk',
  yeti:'Yeti',semut:'Semut Raksasa',reaper:'Reaper'};
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
    /* kelinci: pasif, kabur kalau ada pemain/monster, drop daging mentah.
       Kecepatan larinya diturunkan 20% (6.5 → 5.2) supaya masih bisa dikejar;
       dulu kelinci lebih cepat dari lari pemain (CFG.PLAYER.sprint 7.4 hanya
       saat sprint) sehingga nyaris mustahil ditangkap. */
    rabbit:{hp:16,dmg:0,xp:8,speed:5.2,r:0.35,aggro:0,passive:true,animal:true},
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
    /* KELABANG RAKSASA: boss langka penghuni biome TANAH MERAH (REDLANDS),
       hanya bisa dipanggil lewat ritual Altar.
       Selalu boss (alwaysBoss) & tidak diberi skala boss tambahan (noBossScale)
       karena modelnya sudah raksasa. HP 4160 (dikurangi 20% dari 5200 supaya
       pertarungannya tidak terlalu panjang) × CFG.BOSS_HP_MUL.
       Tubuhnya melata, terbelah jadi 2 saat HP 50%, dan saat mati ruas-ruasnya
       terlepas menjadi 'kelabang_part' yang menggelinding & bisa dipanen. */
    kelabang:{hp:4160,dmg:45,xp:70,speed:3.4,r:1.6,aggro:22,alwaysBoss:true,noBossScale:true},
    /* RUAS KELABANG: potongan tubuh yang terlepas saat kelabang mati. Pasif,
       tidak menyerang; hanya menggelinding & bisa dihancurkan untuk kulit. */
    kelabang_part:{hp:40,dmg:0,xp:6,speed:0,r:0.5,aggro:0,passive:true},
    /* KUMBANG TANDUK: mob darat biome TANAH MERAH (REDLANDS). Bertanduk,
       menyeruduk (jarak dekat) & melempar balok batu (jarak jauh). Cukup
       tangguh tapi bukan boss. */
    kumbang:{hp:120,dmg:16,xp:46,speed:3.0,r:0.6,aggro:16},
    /* YETI: mob besar biome TUNDRA SALJU. Kuat & lambat, dengan 4 aksi tempur
       (lompat+hantam, sapuan cakar, hantaman ganda, pusaran salju 360°).
       Sebanding lizard-plus: lebih tangguh dari serigala, di bawah golem. */
    yeti:{hp:210,dmg:22,xp:78,speed:2.9,r:0.85,aggro:18},
    /* SEMUT RAKSASA: mob biome TANAH MERAH, berdampingan dengan kumbang.
       Cepat & agresif tapi tidak terlalu tebal; dua serangan (gigit & terjang).
       `bossScale` 0.583 = 0.20 × (1.75/0.6), yaitu skala bawaan semut dikali
       rasio pembesaran boss milik kumbang (2.92×). Tanpa ini, skala boss
       absolut 1.75 akan membuat semut 8.75× ukuran normalnya (skala bawaannya
       cuma 0.20) — jauh lebih besar dari mini boss kumbang di biome sama. */
    semut:{hp:95,dmg:14,xp:42,speed:4.2,r:0.55,aggro:17,bossScale:0.583},
    /* REAPER: hantu hitam bersabit, KHUSUS PENJAGA DUNGEON. Tidak pernah ikut
       undian mob biome (namanya tidak ada di BIOME_INFO.mobs) — hanya dipanggil
       Dungeon.update. Menggantikan wujud "Wraith" lama yang cuma skin.
       Tubuhnya MELAYANG: fisikanya tetap normal (berpijak di tanah), tetapi
       modelnya digeser naik di dalam grup `float` sehingga ujung jubahnya
       menggantung ±0.33 blok di atas permukaan — lihat REST_Y di mob_reaper.js.
       Tangguh setingkat yeti, dengan 4 aksi: dua tebasan sabit, hempasan AoE,
       dan panggilan 3 arwah. */
    reaper:{hp:230,dmg:24,xp:88,speed:3.2,r:0.75,aggro:19},
  },
  /* ---------- varian boss ----------
     Boss bukan tipe terpisah: monster biasa dipromosikan jadi boss dengan
     skala tubuh, HP/damage berlipat, dan drop inti boss. Ini menjaga semua
     AI/animasi tetap berlaku sekaligus membuat pertemuan boss terasa acak. */
  bossCount(){return this.list.filter(m=>m.boss&&!m.dead&&!m.pet).length;},

  /* ---------- apakah titik ini di dalam bangunan desa? ----------
     Monster tidak boleh muncul di dalam rumah (dulu bisa terjebak di ruang
     tamu penduduk). pad=1 juga menolak titik yang menempel dinding luar. */
  inBuilding(x,z){
    if(typeof WGEN==='undefined'||!WGEN.buildingAt)return false;
    return !!WGEN.buildingAt(Math.floor(x),Math.floor(z),1);
  },

  /* =========================================================================
     AREA DESA — PEREDAM SPAWN MONSTER
     -------------------------------------------------------------------------
     Dulu satu-satunya pelindung desa adalah inBuilding(), yang hanya menolak
     titik TEPAT di atas rumah. Seluruh halaman, jalan, ladang, dan pekarangan
     desa tetap terbuka penuh untuk spawn, sehingga desa sering dipenuhi
     monster — pemain pulang ke desa dan menemukan gerombolan slime/serigala di
     antara rumah penduduk.

     Sekarang ada AREA DESA berbentuk cakram (radius v.r + VILLAGE_PAD). Titik
     spawn yang jatuh di dalamnya hanya diterima dengan peluang
     VILLAGE_SPAWN_CHANCE (20%); 80% sisanya dibatalkan. Desa jadi jauh lebih
     tenang tanpa membuatnya benar-benar kebal — masih ada monster nyasar
     sesekali supaya penjaga desa tetap punya alasan berpatroli.

     PAD dipakai supaya tepi luar desa (tempat ladang & pagar berada) ikut
     terlindungi; tanpa itu monster akan berbaris tepat di garis radius.
     ========================================================================= */
  VILLAGE_SPAWN_CHANCE:0.20,   // peluang spawn DITERIMA di dalam area desa
  VILLAGE_PAD:6,               // pelebaran radius desa yang ikut diredam

  /* Desa yang area-nya memuat titik (x,z), atau null bila di luar semua desa.
     Memakai jarak EUCLID (cakram) — bukan kotak Chebyshev seperti
     WGEN.villageAt — supaya peredaman terasa merata ke segala arah. */
  villageArea(x,z){
    if(typeof WGEN==='undefined'||!WGEN.villagesNear)return null;
    for(const v of WGEN.villagesNear(x,z)){
      if(Math.hypot(v.x-x,v.z-z)<=v.r+this.VILLAGE_PAD)return v;
    }
    return null;
  },
  /* Boleh spawn di titik ini? false bila di dalam bangunan, atau bila titiknya
     di area desa dan undian 20%-nya gagal. Satu pintu untuk SEMUA spawner
     (undian biome, kawanan, lizard, ternak) sehingga tidak ada jalur yang
     lupa menghormati ketenangan desa. */
  spawnAllowed(x,z){
    if(this.inBuilding(x,z))return false;
    if(this.villageArea(x,z)&&Math.random()>=this.VILLAGE_SPAWN_CHANCE)return false;
    return true;
  },

  /* jumlah monster hidup dengan tipe tertentu */
  countType(type){

    let c=0;
    for(const m of this.list)if(!m.dead&&m.type===type)c++;
    return c;
  },
  /* pilih tipe monster memakai bobot BIOME_INFO.mobW (fallback: rata).
     BIOME_INFO.mobFix diundi LEBIH DULU sebagai peluang tetap (persentase
     sungguhan), sehingga mob seperti Yeti benar-benar muncul 30% di tundra
     tanpa terpengaruh bobot mob lain maupun pengali siang/malam. */
  pickType(biome,night){
    const BI=BIOME_INFO[biome];
    /* --- peluang tetap (mobFix) --- */
    if(BI.mobFix){
      for(const t in BI.mobFix){
        if(Math.random()<BI.mobFix[t])return t;
      }
    }
    const W=BI.mobW;
    /* mob yang punya peluang tetap dikeluarkan dari undian bobot supaya tidak
       mendapat kesempatan kedua (yang akan menaikkan peluangnya di atas angka
       yang ditetapkan) */
    const pool=BI.mobFix?BI.mobs.filter(t=>BI.mobFix[t]===undefined):BI.mobs;
    if(!pool.length)return BI.mobs[(Math.random()*BI.mobs.length)|0];
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

  /* =========================================================================
     LEVEL MOB PER BIOME — DUNIA BERZONA
     -------------------------------------------------------------------------
     Dulu mob liar TIDAK punya level: stat-nya selalu angka mentah di TYPES, di
     mana pun ia muncul. Akibatnya seluruh dunia terasa seperti zona level 1 —
     serigala di ujung peta sama lemahnya dengan serigala di depan rumah, dan
     pemain Lv 40 tidak punya tempat berburu yang sepadan.

     Sekarang setiap biome punya BAND LEVEL. Mob yang muncul di sana diundi
     levelnya di dalam band itu, lalu stat-nya dikalikan sesuai level:

         PEGUNUNGAN (MOUNTAIN)  → Lv 50–75   (habitat NAGA, zona tertinggi)
         TANAH MERAH (REDLANDS) → Lv 30–50   (untuk pemain Lv 30–50)
         GURUN PASIR (DESERT)   → Lv 20–30   (untuk pemain Lv 20–30)
         biome lainnya          → Lv 1–20    (untuk pemain Lv 1–20)

     PEGUNUNGAN ADALAH ZONA TERATAS di antara biome yang sudah ditata. Alasannya
     bukan sekadar urutan: penghuninya NAGA (HP dasar 420, alwaysBoss, sehingga
     ia SELALU mendapat pengali boss ×6 → 2.520 HP pada Lv 1) dan GOLEM dengan
     bobot 7,5 dari total 9,3 — dua mob terkuat di luar dungeon. Menaruhnya di
     band 1–20 seperti sebelumnya membuat pegunungan jadi zona paling
     mematikan di peta justru bagi pemain awal.

     Biome lain (tundra, pantai) masih memakai band bawaan 1–20; band khususnya
     menyusul di update berikutnya. Menambahkannya cukup satu baris di
     BIOME_LVL — tidak ada tempat lain yang perlu disentuh.

     KALIBRASI. Pengali stat diikatkan LANGSUNG ke kurva HP pemain
     (100 + CFG.HP_PER_LVL × (L-1)), bukan angka pilihan sendiri:

         statMul(L) = maxHp(L) / maxHp(1)

     Efeknya, mob Lv L melawan pemain Lv L selalu terasa sama beratnya di level
     berapa pun: damage mob tetap memakan PERSEN HP pemain yang sama, dan HP mob
     tumbuh sejalan dengan naiknya damage pemain lewat senjata & tempaan. Pada
     Lv 1 pengalinya tepat 1.0, jadi permainan awal sama sekali tidak berubah.

     XP memakai pangkat LVL_XP_POW (0.82) terhadap level, bukan pengali stat.
     Kurva XP pemain tumbuh L^1.35; kalau XP mob dibiarkan datar, satu level di
     Lv 30 butuh ratusan ekor, sedangkan bila dibuat sebanding penuh cukup 2 ekor
     di level mana pun — dua-duanya rusak. Dengan 0.82 jumlah ekor per level naik
     landai: ±2 di Lv 1, ±10 di Lv 20, ±12 di Lv 50, ±48 di Lv 200 (setelah
     XP_MOB_MUL), ditambah penalti gap level di bawah — makin besar level, makin
     seret. Kurvanya: gap 0-5 = XP penuh, gap 15 = 60%, gap 20 = 40%, gap 25
     ke atas = 20% (lantai XP_GAP_FLOOR).

     Yang TIDAK ikut sistem ini: pet (stat-nya dari data pet), boss ritual Altar
     (kelabang, sudah ditala tangan), dan mob dungeon — dungeon punya kalibrasi
     sendiri lewat Dungeon.scaleMob yang mengikuti level dungeon, bukan biome.
     ========================================================================= */
  BIOME_LVL:{
    [BIOME.MOUNTAIN]:[50,75],
    [BIOME.REDLANDS]:[30,50],
    [BIOME.DESERT]:[20,30],
  },
  LVL_BAND_DEFAULT:[1,20],
  LVL_XP_POW:0.82,
  /* ---------- PENALTI GAP LEVEL (acuan MMORPG klasik) ----------
     Membunuh mob yang levelnya jauh DI BAWAH pemain memberi XP makin kecil —
     standar di Ragnarok Online (abadi: mob lv99 vs pemain lv10 ~0 XP), RF
     Online, dan Durango. Tanpa ini, pemain lv83 membantai mob lv10 tetap
     menaikkan level secepat grind yang benar. Sisi atas (mob jauh lebih TINGGI
     dari pemain) TIDAK dipenalti — challenge tetap terbayar, ala kebanyakan
     MMO. Kurva mulus: gap 0-4 = 100%, gap 5-9 = turun landai (60%..20%),
     gap 10+ = 20% dibagi gap-nya (gap 20 = 10%, gap 50 = 4%).
     dipakai di kill() dan shareKillXp() lewat xpGapMul(). */
  XP_GAP_LOOSE:5,      // gap <= ini masih XP penuh (grind normal)
  XP_GAP_FLOOR:0.20,   // XP terendah relatif pada gap besar
  xpGapMul(mLvl,pLvl){
    const g=Math.max(0,(pLvl||1)-(mLvl||1));
    if(g<=this.XP_GAP_LOOSE)return 1;
    const f=this.XP_GAP_FLOOR;
    const t=Math.min(1,(g-this.XP_GAP_LOOSE)/20); // gap 25 ke atas = floor
    return Math.max(f,1-(1-f)*t);
  },
  /* ---------- POSISI LEVEL DI DALAM BAND: JARAK DARI TITIK AWAL ----------
     Level TIDAK diundi merata di sepanjang band, melainkan naik bersama jarak
     dari titik spawn lalu dipotong oleh band biome-nya.

     Kalau band 1-20 diundi merata, pemain Lv 1 yang baru mulai bisa bertemu
     serigala Lv 20 tepat di depan rumah: 171 HP (butuh 12 detik dipukul pedang
     kayu) dan damage 36 — tiga pukulan dan pemain mati. Awal permainan jadi
     mustahil. Dengan gradien jarak, hutan di sekitar spawn berisi Lv 1-3 dan
     level 20 baru tercapai ±1000 blok dari rumah.

     LVL_DIST_SPAN diturunkan dari zonasi dungeon yang sudah ada supaya kedua
     sistem sepakat: dungeon naik satu tingkat (= 5 level pemain) tiap
     WGEN.DUNGEON_LVL_SPAN (260) blok, jadi satu level pemain = 260/5 = 52 blok.
     Dungeon di jarak 1040 blok adalah D4-D5 (pemain Lv 16-25) — sepadan dengan
     mob liar Lv 20 di jarak yang sama.

     BIOME BERLEVEL TINGGI TETAP BERBAHAYA DI MANA PUN. Redlands yang muncul
     dekat spawn tetap berisi mob Lv 30+ karena band memotong di bawah: gradien
     hanya bisa menaikkan level di dalam band, tidak pernah menurunkannya di
     bawah batas bawah band. Inilah yang membuat Tanah Merah menjadi zona
     terlarang sampai pemain cukup kuat — sesuai maksud pembagian zona. */
  LVL_DIST_SPAN:52,
  LVL_JITTER:2,
  /* band level [min,max] untuk biome tertentu */
  lvlBand(biome){return this.BIOME_LVL[biome]||this.LVL_BAND_DEFAULT;},
  /* level dasar dari jarak titik ke spawn (sebelum dipotong band) */
  lvlFromDist(x,z){
    const span=(typeof WGEN!=='undefined'&&WGEN.DUNGEON_LVL_SPAN)
      ? WGEN.DUNGEON_LVL_SPAN/5 : this.LVL_DIST_SPAN;
    return 1+Math.hypot(x||0,z||0)/Math.max(1,span);
  },
  /* Level mob yang muncul di (x,z): gradien jarak + goyangan kecil, dipotong
     band biome. Tanpa (x,z) jatuh kembali ke undian merata di dalam band. */
  rollLevel(biome,x,z){
    const b=this.lvlBand(biome);
    const lo=Math.max(1,b[0]),hi=Math.max(lo,b[1]);
    if(x===undefined||z===undefined)
      return lo+Math.floor(Math.random()*(hi-lo+1));
    const j=this.LVL_JITTER;
    const L=Math.round(this.lvlFromDist(x,z)+rand(-j,j));
    return clamp(L,lo,hi);
  },
  /* pengali HP & damage: rasio kurva HP pemain di level itu terhadap Lv 1 */
  lvlStatMul(L){
    const per=(typeof CFG!=='undefined'&&CFG.HP_PER_LVL)||12;
    return (100+per*(Math.max(1,L)-1))/100;
  },
  lvlXpMul(L){return Math.pow(Math.max(1,L),this.LVL_XP_POW);},
  /* Terapkan level ke mob yang BARU dibuat make(). Dipanggil setelah make()
     supaya pengali boss (CFG.BOSS_HP_MUL) sudah masuk hitungan — mini boss Lv L
     tetap 6× mob biasa Lv L, bukan 6× mob Lv 1. */
  setLevel(m,L){
    if(!m)return m;
    const s=this.lvlStatMul(L),xs=this.lvlXpMul(L);
    m.lvl=Math.max(1,Math.round(L));
    m.maxhp=Math.max(1,Math.round(m.maxhp*s));
    m.hp=m.maxhp;
    /* mob pasif (kelinci, sapi, kuda) damage-nya 0 — jangan sampai jadi 1 */
    m.dmg=m.dmg>0?Math.max(1,Math.round(m.dmg*s)):0;
    m.xp=Math.max(1,Math.round(m.xp*xs));
    return m;
  },
  /* undi level dari biome titik spawn lalu terapkan */
  applyBiomeLevel(m,x,z){
    if(!m||m.pet)return m;
    const bx=Math.floor(x!==undefined?x:m.pos.x),bz=Math.floor(z!==undefined?z:m.pos.z);
    const biome=(typeof WGEN!=='undefined'&&WGEN.biomeAt)?WGEN.biomeAt(bx,bz):BIOME.FOREST;
    return this.setLevel(m,this.rollLevel(biome,bx,bz));
  },

  spawn(){
    const night=Weather.nightF>0.5;
    const cap=night?13:9;
    if(this.list.length>=cap)return;
    const a=Math.random()*Math.PI*2,d=rand(17,28);
    const x=Player.pos.x+Math.sin(a)*d,z=Player.pos.z+Math.cos(a)*d;
    const h=World.topY(Math.floor(x),Math.floor(z));
    if(h<CFG.SEA)return; // hanya daratan (di atas permukaan air)
    /* JANGAN spawn di dalam / menempel bangunan desa, dan REDAM spawn di
       seluruh area desa (hanya 20% yang diterima) — lihat spawnAllowed. */
    if(!this.spawnAllowed(x,z))return;

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
    if(this.TYPES[type].passive||this.TYPES[type].animal)boss=false;
    const m=this.make(type,new THREE.Vector3(x,h,z),boss);
    /* LEVEL MENGIKUTI BIOME (redlands 30-50, gurun 20-30, sisanya 1-20) */
    this.applyBiomeLevel(m,x,z);
    this.list.push(m);
    if(boss){
      UI.toast(`☠️ ${MOB_NAME[type]||type} Raksasa Lv ${m.lvl} muncul!`);
      FX.ring(x,h+0.1,z,0xff6bd6,1.2,5);
    }
    /* ---------- KAWANAN SERIGALA ----------
       Serigala berburu berkelompok, tapi jumlah kawan DIKURANGI (dulu 1-2
       hampir selalu) supaya populasi serigala tidak berlebihan. Sekarang
       hanya 30% peluang membawa 1 kawan (malam 45%).
       Kawanan memakai LEVEL YANG SAMA dengan pemimpinnya: satu kawanan
       seharusnya sepadan, bukan campuran Lv 3 dan Lv 19. */
    if(type==='wolf'&&!boss){
      const mates=(Math.random()<(night?0.45:0.30))?1:0;
      for(let k=0;k<mates;k++){
        if(this.list.length>=cap)break;
        const px=x+rand(-3.5,3.5),pz=z+rand(-3.5,3.5);
        const ph=World.topY(Math.floor(px),Math.floor(pz));
        if(ph<CFG.SEA||!this.spawnAllowed(px,pz))continue;
        const w=this.make('wolf',new THREE.Vector3(px,ph,pz),false);
        this.setLevel(w,m.lvl);
        this.list.push(w);
      }
    }
    /* ---------- KAWANAN KELINCI: sering muncul berpasangan / 2 ekor ---------- */
    if(type==='rabbit'){
      const mates=(Math.random()<0.40)?1:0;
      for(let k=0;k<mates;k++){
        if(this.list.length>=cap)break;
        const px=x+rand(-2.5,2.5),pz=z+rand(-2.5,2.5);
        const ph=World.topY(Math.floor(px),Math.floor(pz));
        if(ph<CFG.SEA||!this.spawnAllowed(px,pz))continue;
        const rb=this.make('rabbit',new THREE.Vector3(px,ph,pz),false);
        this.setLevel(rb,m.lvl);
        this.list.push(rb);
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
      if(!this.spawnAllowed(bx,bz))continue;       // bukan di desa (redam 20%)
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
      this.applyBiomeLevel(m,bx,bz);
      this.list.push(m);
      return;
    }
  },

  /* ---------- KELABANG RAKSASA: HANYA LEWAT RITUAL ALTAR ----------
     Kelabang TIDAK lagi muncul liar di dunia. Satu-satunya cara memunculkannya
     adalah ritual di Altar (js/altar.js) memakai ingredient langka dari biome
     TANAH MERAH. Spawner liar lama dihapus; fungsi di bawah dibiarkan sebagai
     no-op agar pemanggilan lama tetap aman. */
  KELABANG_MAX:1,
  spawnKelabang(){ /* dinonaktifkan: kelabang hanya bisa disummon dari Altar */ },

  /* ---------- SPAWN HEWAN JINAK (sapi, kuda, KELINCI) ----------
     Kuota kecil supaya tidak memenuhi populasi. Sapi muncul di hutan,
     kuda juga bisa muncul di gurun. Spawn dalam kelompok kecil.

     KELINCI ikut jalur ini (dulu hanya lewat undian mob biome). Bedanya besar:
     undian biome dibatasi cap populasi monster (9 siang / 13 malam) dan kuota
     lunak per tipe, jadi kelinci sering kalah bersaing dengan slime/serigala
     dan praktis jarang terlihat. Lewat spawner khusus ini kelinci punya kuota
     sendiri seperti sapi (RABBIT_MAX) dan dicoba tiap kali timer liveT jalan,
     sehingga populasinya stabil. */
  COW_MAX:3,
  HORSE_MAX:2,
  RABBIT_MAX:3,
  /* biome tempat tiap hewan jinak boleh muncul */
  TAME_BIOME:{
    cow:[BIOME.FOREST],
    horse:[BIOME.FOREST,BIOME.DESERT],
    rabbit:[BIOME.FOREST,BIOME.DESERT,BIOME.TUNDRA],
  },
  spawnLivestock(){
    if(this.list.length>18)return;
    const cows=this.countType('cow'),horses=this.countType('horse'),
          rabbits=this.countType('rabbit');
    /* pilih jenis yang kuotanya masih kosong; diundi supaya tidak selalu
       jenis yang sama yang menang */
    const want=[];
    if(cows<this.COW_MAX)want.push('cow');
    if(horses<this.HORSE_MAX)want.push('horse');
    if(rabbits<this.RABBIT_MAX)want.push('rabbit');
    if(!want.length)return;
    const type=want[(Math.random()*want.length)|0];
    const okBiome=this.TAME_BIOME[type]||[BIOME.FOREST];
    for(let t=0;t<12;t++){
      const a=Math.random()*Math.PI*2,d=rand(18,32);
      const x=Player.pos.x+Math.sin(a)*d,z=Player.pos.z+Math.cos(a)*d;
      const bx=Math.floor(x),bz=Math.floor(z);
      const h=World.topY(bx,bz);
      if(h<CFG.SEA)continue;
      if(!this.spawnAllowed(bx,bz))continue;
      const biome=WGEN.biomeAt(bx,bz);
      if(okBiome.indexOf(biome)<0)continue;
      /* kelinci hidup berkelompok agak lebih besar */
      const n=type==='rabbit'?rand(2,3):rand(1,2);
      /* satu kelompok = satu level (diundi dari biome & jarak kelompoknya) */
      const gl=this.rollLevel(biome,bx,bz);
      for(let k=0;k<n;k++){
        const px=x+rand(-2.5,2.5),pz=z+rand(-2.5,2.5);
        const ph=World.topY(Math.floor(px),Math.floor(pz));
        if(ph<CFG.SEA||!this.spawnAllowed(px,pz))continue;
        const a2=this.make(type,new THREE.Vector3(px,ph,pz),false);
        this.setLevel(a2,gl);
        this.list.push(a2);
      }
      return;
    }
  },

  /* ---------- tinggi NYATA mesh di atas titik pijak ----------
     meshHeight() hanyalah tabel perkiraan per tipe dan TIDAK cocok untuk mob
     yang modelnya punya skala bawaan sendiri (kumbang 0.6, lizard 0.23) —
     angkanya jauh lebih kecil dari tinggi model sesungguhnya. Di sini tinggi
     diukur langsung dari bounding box mesh, lalu dikembalikan dalam satuan
     LOKAL mesh supaya aman dipakai sebagai posisi anak. */
  meshTopLocal(g,fallback){
    try{
      /* matrixWorld harus diperbarui dulu: saat make() dipanggil, mesh belum
         ditambahkan ke scene sehingga matriksnya masih basi. */
      if(g.updateMatrixWorld)g.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(g);
      if(box&&isFinite(box.max.y)&&isFinite(box.min.y)){
        const sc=g.scale.y||1;
        /* box dalam satuan dunia & g berada di posisinya; tinggi relatif origin
           mesh = max.y - posisi mesh, lalu dibagi skala → satuan lokal */
        const h=(box.max.y-g.position.y)/sc;
        if(isFinite(h)&&h>0)return h;
      }
    }catch(e){}
    return (fallback||1)/(g.scale.y||1);
  },

  /* ---------- SKALA MINI BOSS ----------
     Pengali ukuran tubuh mini boss terhadap ukuran ALAMI modelnya. Dipakai
     lewat opts.scaleMul; lihat catatan di make() tentang bedanya dengan skala
     absolut 1.75 yang lama. */
  BOSS_SCALE_MUL:1.75,

  /* `opts.mark`=false → tanpa penanda boss (dipakai boss ritual Altar)
     `opts.scaleMul` → skala boss RELATIF terhadap ukuran alami model */
  make(type,pos,boss=false,opts){
    const T=this.TYPES[type];
    opts=opts||{};

    /* Model & parts dibangun file entitas per mob di js/entities/ */
    const built=this.def(type).build(boss);
    const g=built.mesh,parts=built.parts;
    g.position.copy(pos);
    /* ukuran ALAMI model (sebelum skala boss ditimpa). Golem 0.41, yeti 0.70,
       semut 0.20, lizard 0.23, serigala/slime/babi 1.0. */
    const natScale=g.scale.x||1;
    /* boss: tubuh diperbesar + SATU TITIK KUNING melayang di atas kepala.
       Mob noBossScale (naga, kelabang) sudah besar dari modelnya, jadi skala
       1.75 dilewati agar tidak raksasa ganda — tapi penandanya tetap dipasang.

       Kotak aura ungu & mahkota 4 rune DIHAPUS: keduanya kubus besar yang
       menutupi model (terlihat seperti bug "kubus muncul di boss"). Penanda
       cukup satu titik kuning kecil di atas kepala.

       PENANDA hanya untuk MINI BOSS (monster biasa yang dipromosikan). Boss
       ritual Altar dipanggil dengan opts.mark=false: ia sudah jelas raksasa &
       punya bar HP boss sendiri, jadi tidak perlu penanda apa pun.

       DUA MODE SKALA BOSS:

       1. ABSOLUT (bawaan, tanpa opts.scaleMul) — g.scale ditimpa 1.75 atau
          T.bossScale. Rasio pembesarannya jadi BERBEDA-BEDA per mob karena
          skala alami tiap model berbeda: serigala 1.75× tapi golem
          1.75/0.41 = 4.3× dan lizard 1.75/0.23 = 7.6×. Mode ini dipertahankan
          untuk mini boss dunia terbuka supaya penampakannya tidak berubah.

       2. RELATIF (opts.scaleMul) — g.scale = skala alami × pengali, jadi SEMUA
          tipe naik dengan rasio yang sama. Ini yang dipakai BOSS DUNGEON:
          dengan mode absolut, boss golem menjadi 4.3× (tinggi ±12.8 blok) dan
          menjulang menembus atap arena, sedangkan boss serigala hanya 1.75×.
          Mode relatif membuat besarnya konsisten "seukuran mini boss" apa pun
          tipe yang terundi. Bonus: radius tabrakan (r di bawah) juga naik 1.75×
          secara relatif, jadi hitbox dan tubuh akhirnya sejalan — dulu golem
          boss bertubuh 4.3× tapi hitbox-nya cuma 1.75×. */
    if(boss){
      if(!T.noBossScale){
        if(opts.scaleMul)g.scale.setScalar(natScale*opts.scaleMul);
        else g.scale.setScalar(T.bossScale!==undefined?T.bossScale:1.75);
      }
      if(opts.mark!==false){
        const dot=new THREE.Mesh(new THREE.SphereGeometry(0.17,10,8),
          new THREE.MeshBasicMaterial({color:0xffd24d}));
        /* Tinggi diukur dari mesh sesungguhnya. Dulu memakai meshHeight()
           dibagi skala; untuk kumbang hasilnya (1.8+0.55)/1.75 = 1.34 satuan
           lokal padahal puncak modelnya ada di 5.38 — titiknya terbenam di
           dalam tubuh sehingga terlihat "tidak ada tanda". */
        const top=this.meshTopLocal(g,meshHeight(type));
        dot.position.set(0,top+0.55/(g.scale.y||1),0);
        /* skala titik dijaga tetap kecil di layar walau tubuhnya diskalakan */
        const inv=1/(g.scale.y||1);
        dot.scale.setScalar(inv);
        g.add(dot);parts.bossDot=dot;
      }
    }
    Game.scene.add(g);
    /* skala dasar model (lizard punya skala kecil bawaan build; boss 1.75).
        Disimpan supaya animasi mati (scale-down) mengalikan dari skala ini,
        BUKAN menimpanya ke 1 — dulu lizard "membesar" dulu saat mati karena
        skala 0.23 ditimpa setScalar(1-...). */
    const baseScale=g.scale.x;
    /* PENGALI UKURAN terhadap model normalnya. Dipakai HPBars untuk menaruh bar
       di atas kepala: tanpa ini bar boss menempel di dada karena meshHeight()
       hanya tahu tinggi model pada skala alaminya. */
    const sizeMul=natScale>0?baseScale/natScale:1;
    /* stat boss: HP & damage berlipat, XP 2x mob biasa (dulu 7x — satu mini
       boss golem memberi 81% XP satu level penuh; kini ±20%, dijadikan acuan
       kalibrasi XP "satu kill boss kecil = 20% level"), sedikit lebih lambat */
    const mul=boss?CFG.BOSS_HP_MUL||6:1;
    const hp=Math.round(T.hp*mul);
    return {type,boss,mesh:g,parts,pos:pos.clone(),vel:new THREE.Vector3(),
      baseScale,sizeMul,
      /* LEVEL mob: diisi setLevel() sesuai biome tempat ia muncul (mob dungeon
         memakai kalibrasi Dungeon.scaleMob). Default 1 supaya mob yang dibuat
         jalur lain (pet, ritual altar, konsol chat) tetap punya field ini. */
      lvl:1,
      hp,maxhp:hp,state:'wander',t:rand(0.5,2),atkCd:rand(0,1),
      dir:Math.random()*Math.PI*2,
      speed:T.speed*(boss?0.85:1),
      dmg:Math.round(T.dmg*(boss?2.2:1)),
      xp:Math.round(T.xp*(boss?2:1)),
      r:T.r*(boss?1.75:1),
      dead:false,deathT:0,flash:0,hopT:rand(0.5,1.5),onGround:false,inWater:false,
      windup:0,smashTarget:null,poisonHit:0,
      /* status dari efek senjata: pendarahan, racun bilah, perlambatan */
      bleedHit:0,bleedT:0,bleedDmg:0,
      venomHit:0,venomT:0,venomDmg:0,
      slowT:0,slowMul:1,
  /* STUN (Shield Bash Royal Guard): detik tersisa mob membeku. */
  stunT:0};

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
    /* PROVOKE aktif: threat dari pihak lain tidak menggeser sasaran —
       monster tetap fokus ke penantang sampai durasi habis */
    if(m.provokedBy&&!m.provokedBy.dead)return;
    const k=this.threatKey(src);
    const e=m.threat[k]||(m.threat[k]={v:0,npc:src&&src!==Player?src:null});
    e.v+=dmg*mul;
  },
  /* pilih sasaran dengan threat tertinggi; NPC/pet yang mati/jauh dibuang.
     Pemenangnya boleh siapa saja �?" pemain, rekan NPC, maupun pet �?" sesuai
     siapa yang memberi damage paling banyak. */
  pickFoe(m,dt){
    /* PROVOKE Royal Guard: sasaran TERKUNCI ke penantang selama efeknya
       berlaku — pemilihan threat dilewati, jadi serangan pemain/rekan lain
       tidak menggeser target sampai durasi habis (atau penantang tewas). */
    if(m.provokedBy){
      if(!m.provokedBy.dead){m.foe=m.provokedBy;return;}
      m.provokedBy=null;
    }
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
  /* ---------- sasaran serangan saat ini ----------
     Satu pintu untuk SEMUA AI: bila ada NPC/pet yang threat-nya melampaui
     pemain (m.foe terisi oleh pickFoe), itulah sasarannya; kalau tidak, pemain.
     Dipakai kelabang & kumbang yang punya AI sendiri, supaya keduanya ikut
     berbalik menyerang siapa pun yang memberi damage paling banyak — dulu
     keduanya melewati pickFoe sehingga SELALU menyerang pemain. */
  aimTarget(m){
    if(m.foe&&!m.foe.dead)return m.foe;
    return (typeof Player!=='undefined'&&!Player.dead)?Player:null;
  },
  /* damage ke sasaran apa pun (pemain / NPC / pet) dari satu titik.
     `kb` = kekuatan dorong. Mengembalikan true bila sasaran benar-benar kena. */
  hitTarget(m,tgt,dmg,radius,hx,hz,kb){
    if(!tgt)return false;
    const px=(hx===undefined)?m.pos.x:hx;
    const pz=(hz===undefined)?m.pos.z:hz;
    if(Math.hypot(tgt.pos.x-px,tgt.pos.z-pz)>radius+((tgt!==Player&&tgt.r)?tgt.r:0))return false;
    if(tgt===Player){
      if(Player.dead)return false;
      Player.takeDamage(dmg,m.pos);
      if(kb){
        const a=Math.atan2(Player.pos.x-px,Player.pos.z-pz);
        Player.vel.x+=Math.sin(a)*kb;Player.vel.z+=Math.cos(a)*kb;
        Player.vel.y=Math.max(Player.vel.y,kb*0.6);
      }
      return true;
    }
    /* pet = monster milik pemain; NPC = rekan/penduduk */
    if(tgt.pet&&typeof Capture!=='undefined'&&Capture.hurtPet){Capture.hurtPet(tgt,dmg);return true;}
    if(tgt.role&&typeof NPCS!=='undefined'&&NPCS.hurt){NPCS.hurt(tgt,dmg);return true;}
    /* monster lain (mis. pet tanpa flag) */
    if(this.hurt&&tgt.hp!==undefined){
      const a=Math.atan2(tgt.pos.x-px,tgt.pos.z-pz);
      this.hurt(tgt,dmg,new THREE.Vector3(Math.sin(a),0.3,Math.cos(a)),kb||3,m);
      return true;
    }
    return false;
  },

  /* ---------- PIHAK LAWAN: kumpulkan korban sah di sebuah area ----------
     Satu pintu untuk SEMUA serangan area milik mob (hantaman golem, semburan
     api naga, sapuan ekor lizard). Korbannya ditentukan oleh pihak si mob:
       mob liar → pemain, rekan NPC, dan pet peliharaan
       mob pet  → hanya monster liar (tidak pernah pemain/NPC/pet lain)
     Dengan begitu jurus yang dulu hanya melukai pemain kini tetap berlaku saat
     mob bertarung dengan NPC, dan pet tidak lagi melukai tuannya sendiri. */
  areaTargets(m,cx,cz,radius){
    const out=[];
    if(!m)return out;
    const near=(p,extra)=>Math.hypot(p.x-cx,p.z-cz)<=radius+(extra||0);
    if(m.pet){
      for(const o of this.list){
        if(o===m||o.dead||o.pet||o.catchActive||this.isAnimal(o))continue;
        if(near(o.pos,o.r||0.5))out.push(o);
      }
      return out;
    }
    if(typeof Player!=='undefined'&&!Player.dead&&near(Player.pos))out.push(Player);
    if(typeof NPCS!=='undefined')
      for(const n of NPCS.list){if(!n.dead&&near(n.pos))out.push(n);}
    for(const o of this.list){
      if(o===m||o.dead||!o.pet||o.catchActive)continue;
      if(near(o.pos,o.r||0.5))out.push(o);
    }
    return out;
  },
  /* damage area sekali jalan; mengembalikan jumlah korban yang benar-benar kena */
  areaHit(m,cx,cz,radius,dmg,kb){
    let n=0;
    for(const t of this.areaTargets(m,cx,cz,radius))
      if(this.hitTarget(m,t,dmg,radius,cx,cz,kb))n++;
    return n;
  },
  /* korban satu proyektil mob di titik (x,y,z) — dipakai semburan asam lizard
     & racun kelabang supaya proyektilnya melukai NPC/pet/monster juga, bukan
     hanya pemain. `r` = radius tumbukan horizontal; ketinggian diberi jendela
     agak longgar (±1.3) supaya proyektil yang melewati dada/badan tetap kena
     seperti pemeriksaan bola 3D versi lama. */
  projTarget(src,x,y,z,r){
    if(!src)return null;
    const hitY=p=>Math.abs((p.y+0.9)-y)<1.3;
    const hitXZ=(p,extra)=>Math.hypot(p.x-x,p.z-z)<r+(extra||0);
    if(src.pet){
      for(const o of this.list){
        if(o===src||o.dead||o.pet||o.catchActive||this.isAnimal(o))continue;
        if(hitXZ(o.pos,o.r||0.5)&&hitY(o.pos))return o;
      }
      return null;
    }
    if(typeof Player!=='undefined'&&!Player.dead&&hitXZ(Player.pos)&&hitY(Player.pos))return Player;
    if(typeof NPCS!=='undefined')
      for(const n of NPCS.list){if(!n.dead&&hitXZ(n.pos)&&hitY(n.pos))return n;}
    for(const o of this.list){
      if(o===src||o.dead||!o.pet||o.catchActive)continue;
      if(hitXZ(o.pos,o.r||0.5)&&hitY(o.pos))return o;
    }
    return null;
  },
  /* sasaran tempur mob apa pun: pet mengincar monster liar terdekat, mob liar
     mengincar pemenang threat (pemain / rekan NPC / pet). */
  battleTarget(m,range){
    if(m.pet){
      let best=null,bd=range||20;
      for(const o of this.list){
        if(o===m||o.dead||o.pet||o.catchActive||this.isAnimal(o))continue;
        const d=o.pos.distanceTo(m.pos);
        if(d<bd){bd=d;best=o;}
      }
      return best;
    }
    return this.aimTarget(m);
  },

  hurt(m,dmg,dir,knock,src){
    if(m.dead)return;
    /* Mob yang sedang dalam minigame tangkap tidak boleh menerima damage,
       supaya proses tangkap tidak dirusak oleh NPC, pet, DoT, atau serangan lain. */
    if(m.catchActive)return;
    /* NPC (rekan/penjaga) tidak boleh melukai hewan ternak (animal) —
       KECUALI rekan yang sedang BERBURU hewan itu untuk bekal (NPCS.aiHunt
       menandainya lewat src.prey). Tanpa pengecualian ini penjaga desa akan
       menyembelih sapi sembarangan; dengan pengecualian, hanya rekan yang
       memang diperintah mencari resource yang boleh memanennya.
       Pemain tetap bisa, predator juga bisa. */
    if(this.isAnimal(m)&&src&&src!==Player&&src.role&&src.prey!==m)return;
    /* RUAS KELABANG yang terlepas hanya boleh dihancurkan PEMAIN — NPC/rekan
       & pet tidak boleh menyerangnya (src.role = NPC, src.pet = pet). */
    if(m.type==='kelabang_part'&&src&&src!==Player&&(src.role||src.pet))return;
    /* NPC (rekan/penjaga/penduduk) tidak boleh melukai mob peliharaan pemain */
    if(m.pet&&src&&src!==Player&&src.role)return;
    /* PLAYER tidak bisa melukai pet; hanya monster liar yang bisa.
       src kosong = skill pemain (slam/whirl), bleed/venom, thorns, dsb. */
    if(m.pet&&(!src||src===Player))return;
    /* siapa sumber serangan terakhir (untuk XP/drop & ternak kabur) */
    m.lastSrc=src;
    /* akumulasi damage pemain untuk kontribusi XP saat monster mati.
       src kosong = skill pemain (slam/whirl), bleed/venom senjata, atau
       thorns — semuanya dihitung sebagai damage pemain. Damage dibatasi
       HP tersisa supaya overkill tidak menggelembungkan kontribusi.
       m.aDmg = damage dari PIHAK PEMAIN selain pemain sendiri (rekan tim &
       pet). Dipisah dari pDmg supaya XP-nya bisa dibobot ALLY_XP_SHARE, dan
       dicatat per-pukulan — bukan dari siapa yang memukul terakhir — sehingga
       pemain tetap dapat XP walau timnya yang menghabisi mob. */
    if(!src||src===Player)m.pDmg=(m.pDmg||0)+Math.min(dmg,Math.max(0,m.hp));
    else if(this.isAllySrc(src))m.aDmg=(m.aDmg||0)+Math.min(dmg,Math.max(0,m.hp));
    /* dipukul = otomatis waspada walau pemain di luar kerucut pandang */
    m.hp-=dmg;m.flash=0.18;m.state='chase';
    m.alert=Math.max(m.alert||0,6);m.seeT=CFG.MOB.MEM;
    m.hpT=6; /* durasi tampil HP bar setelah terkena serangan */
    /* catat siapa yang memukul — dasar pemilihan sasaran */
    this.addThreat(m,src,dmg,
      src&&src!==Player&&src.role&&(src.role.skill.id==='taunt'||src.role.skill.id==='lionclaw')?2.2:1);
    m.vel.addScaledVector(dir,knock);m.vel.y=Math.max(m.vel.y,2.5);
    FX.text(m.pos.clone().add(new THREE.Vector3(0,meshHeight(m.type)+0.6,0)),
      String(Math.round(dmg)),'#ffd24d');
    FX.debris(m.pos.clone().add(new THREE.Vector3(0,1,0)),0xff5544,4,2);
    Sfx.hit();
    /* KELABANG: tubuh terbelah jadi 2 saat HP mencapai 50% (sekali saja) */
    if(m.type==='kelabang'&&!m.hasSplit&&m.hp>0&&m.hp<=m.maxhp*0.5){
      this.splitKelabang(m);
    }
    if(m.hp<=0){
      if(m.pet&&typeof Capture!=='undefined')Capture.petDown(m);
      else this.kill(m);
    }
  },

  /* ---------- KELABANG TERBELAH DUA ----------
     Saat HP kelabang menembus 50%, separuh ruas belakangnya "putus" dan menjadi
     kelabang kedua yang bergerak mandiri. HP sisa dibagi dua di antara keduanya.
     Kedua bagian ditandai hasSplit=true supaya tidak terbelah berulang. */
  splitKelabang(parent){
    parent.hasSplit=true;
    const full=(parent.segCount!==undefined)?parent.segCount:
      ((typeof Mob_Kelabang!=='undefined')?Mob_Kelabang.MAXSEG:7);
    const keep=Math.max(2,Math.ceil(full/2));
    const give=Math.max(2,full-keep);
    parent.segCount=keep;
    /* HP dibagi dua (masing-masing minimal 1) */
    const half=Math.max(1,Math.round(parent.hp/2));
    parent.hp=half;
    /* posisi anak: di belakang induk sejauh panjang ruas yang disisakan,
       mengikuti ukuran besar kelabang agar tidak menumpuk dengan induknya. */
    const yaw=parent.mesh.rotation.y;
    const segLen=(typeof Mob_Kelabang!=='undefined')?Mob_Kelabang.SEG*Mob_Kelabang.SCALE:2.9;
    const back=(keep+1)*segLen;
    const bx=parent.pos.x-Math.sin(yaw)*back;
    const bz=parent.pos.z-Math.cos(yaw)*back;
    const by=World.topY(Math.floor(bx),Math.floor(bz));
    /* anak kelabang juga tanpa penanda: ia bagian dari boss ritual yang sama */
    const child=this.make('kelabang',new THREE.Vector3(bx,Math.max(CFG.SEA,by),bz),true,{mark:false});
    child.hasSplit=true;
    child.segCount=give;
    child.hp=child.maxhp=half;
    child.mesh.rotation.y=yaw;
    child.state='chase';child.alert=6;child.seeT=CFG.MOB.MEM;
    this.list.push(child);
    FX.ring(parent.pos.x,parent.pos.y+0.1,parent.pos.z,0x8dff3a,1.2,5);
    FX.debris(parent.pos.clone().add(new THREE.Vector3(0,1,0)),0x96332c,18,3.5);
    Sfx.hit();
    UI.toast('🐛 Tubuh kelabang terbelah menjadi dua!');
  },
  /* Porsi XP monster yang tetap diterima PEMAIN atas bagian HP yang dirobohkan
     rekan tim / pet-nya (1 = penuh). 0.6 dipilih agar menyamai porsi lama jalur
     pet, dan tetap membuat bertarung sendiri lebih menguntungkan. */
  ALLY_XP_SHARE:0.6,

  /* Sumber serangan yang tergolong "pihak pemain": rekan tim aktif dan mob
     peliharaan. Penduduk desa / penjaga yang BUKAN rekan tidak masuk — mereka
     bukan milik pemain, jadi kill mereka tidak memberi XP.
     Keanggotaan diuji lewat NPCS.team (bukan hanya NPCS.isTeam) karena isTeam
     membaca n.state, dan rekan yang diperintah 'farm' berstatus state='farm'
     sehingga lolos dari uji itu. */
  isAllySrc(src){
    if(!src||src===Player)return false;
    if(src.pet)return true;
    if(!src.role||typeof NPCS==='undefined')return false;
    if(NPCS.team&&NPCS.team.indexOf(src)>=0)return true;
    return !!(NPCS.isTeam&&NPCS.isTeam(src));
  },

  /* ---------- BERBAGI XP SAAT PEMAIN/TIM MEMBUNUH MOB ----------
     Dipanggil kill(). Aturannya:
       - Pembunuh REKAN TIM/PET  → tiap anggota hidup + pet ter-deploy dapat
         XP PENUH sebesar m.xp (dihitung terpisah, bukan dibagi).
       - Pembunuh PEMAIN SENDIRI → tiap anggota hidup + pet ter-deploy dapat
         50% XP mob (dulu: pemain solo tidak membagikan apa pun ke tim).
       - Mob-vs-mob / lingkungan → tanpa XP tim.
     Rekan memakai NPCS.gainXp (naik levelnya), pet memakai
     Capture.petGainXp (naik levelnya).
     XP PEMAIN tidak diurus di sini, melainkan di kill() (lihat ALLY_XP_SHARE). */
  shareKillXp(m){
    const src=m.lastSrc;
    const playerKill=(!src||src===Player);
    const allyKill=!playerKill&&this.isAllySrc(src);
    if(!playerKill&&!allyKill)return;
    /* XP_MOB_MUL -20% & penalti gap level berlaku sama; porsi tim = 100%
       saat rekan menumbangkan, 50% saat pemain sendiri yang menumbangkan */
    const xp=Math.max(1,Math.round((m.xp||10)*0.80*
      this.xpGapMul(m.lvl,Player.level)*(allyKill?1:0.5)));
    let given=0;
    /* seluruh rekan tim yang hidup — termasuk yang ikut bertarung & yang lain */
    if(typeof NPCS!=='undefined'&&NPCS.team){
      for(const n of NPCS.team){
        if(!n||n.dead)continue;
        NPCS.gainXp(n,xp);given++;
      }
    }
    /* pet yang sedang ter-deploy (deployedSlot = slot tas yang aktif) */
    if(typeof Capture!=='undefined'&&Capture.pet&&!Capture.pet.dead){
      Capture.petGainXp(Capture.pet,xp);given++;
    }
    if(given>0)
      FX.text(m.pos.clone().add(new THREE.Vector3(0,meshHeight(m.type)+1.0,0)),
        `+${xp} XP tim${allyKill?'':' (50%)'}`,'#9fd7ff');
  },

  kill(m){
    m.dead=true;m.deathT=0;
    /* ---------- BERBAGI XP KE SELURUH TIM & PET ----------
       Setiap pembunuhan yang melibatkan pemain/tim membagikan XP ke tim:
       pembunuh rekan/pet → 100% XP mob per anggota; pembunuh pemain → 50%
       XP mob per anggota. XP pemain tetap dihitung dari kontribusinya
       sendiri di bawah, supaya perkembangan pemain tidak bisa "ditinggal"
       penuh oleh timnya. */
    this.shareKillXp(m);
    /* ---------- XP PEMAIN: KONTRIBUSI SENDIRI + KONTRIBUSI TIM/PET ----------
       pShare = porsi HP monster yang dirobohkan pemain sendiri (bobot penuh).
       aShare = porsi yang dirobohkan rekan tim & pet, dibobot ALLY_XP_SHARE.
       Dulu XP pemain HANYA dari pDmg, dan jalur pet hanya jalan bila pet yang
       memukul TERAKHIR — jadi monster yang dihabisi tim (atau yang dilemahkan
       pet lalu diselesaikan rekan) tidak memberi XP sama sekali. Sekarang
       damage sekutu diakumulasi per-pukulan di hurt() (m.aDmg), sehingga
       pemain selalu ikut naik level dari kerja timnya.
       Jumlah keduanya dibatasi 1 supaya overkill tidak menggelembungkan XP.
       KOIN & PROFICIENCY sengaja TETAP memakai kontribusi pemain sendiri:
       koin adalah jarahan dan proficiency adalah latihan bertarung — keduanya
       bukan XP, jadi perilakunya tidak diubah patch ini. */
    const pShare=(m.pDmg>0&&m.maxhp>0)?clamp(m.pDmg/m.maxhp,0,1):0;
    const aShare=(m.aDmg>0&&m.maxhp>0)?clamp(m.aDmg/m.maxhp,0,1):0;
    const contrib=pShare;
    const xpShare=clamp(pShare+aShare*this.ALLY_XP_SHARE,0,1);
    /* XP_MOB_MUL: kurangi XP yang didapat pemain per pembunuhan mob (0.80 = -20%) */
    const XP_MOB_MUL=0.80;
    if(xpShare>0){
      /* efek 'greed' (set emas) menambah XP yang diperoleh.
         xpGapMul: mob yang jauh lebih rendah levelnya memberi XP makin kecil
         (mob lv75 vs pemain lv83 gap 8 = 88%; mob lv10 vs lv83 gap 73 = 20%).
         Kasus acuan: mini boss golem lv75 dibunuh pemain lv83 — pengali boss
         7x→2x dan gap 88% menurunkannya dari 17.378 XP (81% satu level)
         menjadi ±4.370 XP (±20% satu level). */
      const gapMul=this.xpGapMul(m.lvl,Player.level);
      const xp=Math.max(1,Math.round(m.xp*xpShare*XP_MOB_MUL*gapMul*(RPG.xpMult?RPG.xpMult():1)));
      Player.addXP(xp);Player.kills++;
      /* label menerangkan asal XP: murni pemain, murni tim/pet, atau campuran */
      const tag=pShare<=0.001?' (tim)':aShare>0.001?` (${Math.round(pShare*100)}%+tim)`:
                pShare>=0.999?'':` (${Math.round(pShare*100)}%)`;
      FX.text(m.pos.clone().add(new THREE.Vector3(0,2.2,0)),
        `+${xp} XP${tag}`,'#8fd4ff');
      /* proficiency bertarung ikut porsi kontribusi; monster kuat tetap
         berharga walau level tinggi. typeof-guard supaya 3D Studio (yang
         memuat monsters.js tanpa skills.js) tidak error bila memanggil kill(). */
      if(contrib>0&&typeof Prof!=='undefined'){
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
       /* kelabang: kulit kelabang + racun (kepala; ruas menjatuhkan kulit sendiri) */
       m.type==='kelabang'?[['centipede_shell',2],['venom',1]]:
       /* potongan ruas kelabang: kulit kelabang murni */
       m.type==='kelabang_part'?[['centipede_shell',1+(Math.random()<0.5?1:0)]]:
       /* kumbang tanduk: cangkang (kulit kelabang) + serat */
       m.type==='kumbang'?[['centipede_shell',1+(Math.random()<0.4?1:0)],['fiber',Math.random()<0.5?1:0]]:
       /* yeti: bulu tebal (dipakai armor kulit) + daging besar */
       m.type==='yeti'?[['pelt',2],['meat',2]]:
       /* semut raksasa: cangkang keras + kaki serangga sesekali */
       m.type==='semut'?[['centipede_shell',1],['fiber',Math.random()<0.5?1:0]]:
       /* REAPER (penjaga dungeon): pecahan jiwa + inti boss bila mini boss.
          `soul_shard` adalah bahan langka khas reruntuhan. */
       m.type==='reaper'?[['soul_shard',1+(Math.random()<0.45?1:0)],
                          ['crystal',Math.random()<0.35?1:0]]:
       [['stone',2+(Math.random()<0.5?1:0)],['meat',1]];
    /* boss selalu menjatuhkan inti boss (bahan set kristal) + drop ganda */
    if(m.boss){
      d.push(['boss_core',1]);
      for(const e of d)e[1]*=2;
    }
    /* ---------- 4 BAHAN RITUAL ALTAR: SANGAT LANGKA (masing-masing 1%) ----------
       Kaki Serangga, Kulit Keras, Darah Hijau, dan Racun Berbisa hanya
       dijatuhkan MOB BIASA yang mati di dalam biome TANAH MERAH (REDLANDS).
       Peluang tiap bahan diundi terpisah 1%, jadi mengumpulkan keempatnya butuh
       usaha panjang. KELABANG (boss) & ruas tubuhnya TIDAK menjatuhkan bahan ini
       supaya ritual tidak bisa "mendaur" boss-nya sendiri. */
    if(m.type!=='kelabang'&&m.type!=='kelabang_part'&&
       typeof WGEN!=='undefined'&&WGEN.biomeAt&&
       typeof BIOME!=='undefined'&&BIOME.REDLANDS!==undefined){
      const bi=WGEN.biomeAt(Math.floor(m.pos.x),Math.floor(m.pos.z));
      if(bi===BIOME.REDLANDS){
        for(const rid of ['insect_leg','hard_shell','green_blood','toxic_venom'])
          if(Math.random()<0.01)d.push([rid,1]);
      }
    }
    /* ---------- MINI BOSS: peluang 15% menjatuhkan 1 bahan ritual Altar ----------
       Permintaan pemain: sumber bahan altar selain Redlands & peti boss.
       Mini boss dunia (boss raksasa acak, bukan kelabang ritual) menjatuhkan
       SATU bahan altar acak dengan peluang 15% (+5% dari 10% pembanding peti
       boss dungeon yang kini 20%). Berlaku di biome mana pun agar kejar-kejaran
       mini boss lebih terasa berharga. */
    if(m.boss&&m.type!=='kelabang'&&m.type!=='kelabang_part'&&Math.random()<0.15){
      const altar=['insect_leg','hard_shell','green_blood','toxic_venom'];
      d.push([altar[(Math.random()*altar.length)|0],1]);
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
      m.type==='lizard'?0x4e8f3a:m.type==='kumbang'?0x7a4f24:
      m.type==='yeti'?0xcfe0f2:m.type==='semut'?0x8a3b1f:
      m.type==='reaper'?0x2a2140:0x8a8f98;
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
      kelabang:[0x96332c,0x5f1d1a,0xd9a066],
      kelabang_part:[0x96332c,0x5f1d1a,0xa13a30],
      kumbang:[0x7a4f24,0x5a3a1a,0x96682f],
      yeti:[0xeaf1f8,0xcfe0f2,0xa6c0db],
      semut:[0x8a3b1f,0x5e2412,0xa5502a],
      /* reaper: serpihan jubah hitam + kilau ungu rune */
      reaper:[0x15151d,0x2a2140,0x7b4fd6],
    };
    if(GIB_COLORS[m.type])
      FX.gib(m.pos.clone().add(new THREE.Vector3(0,m.boss?1.4:0.7,0)),
        GIB_COLORS[m.type],m.boss?26:12,m.boss?4.5:3);
    if(m.boss){
      FX.ring(m.pos.x,m.pos.y+0.1,m.pos.z,0xff6bd6,1.2,7);
      UI.toast(`🏆 ${MOB_NAME[m.type]||m.type} Raksasa dikalahkan!`);
    }
    /* KELABANG: saat mati, tiap ruas tubuh yang tersambung TERLEPAS menjadi
       entitas 'kelabang_part' yang menggelinding menjauh. Tiap potongan bisa
       diserang & menjatuhkan kulit kelabang. Hanya untuk kepala kelabang, bukan
       untuk potongan ruas itu sendiri (agar tidak beranak-pinak). */
    if(m.type==='kelabang')this.shedKelabangParts(m);
  },

  /* ---------- LEPASKAN RUAS KELABANG SAAT MATI ----------
     Membuat satu 'kelabang_part' per ruas aktif di posisi ruas tersebut (dibaca
     dari jejak animasi bila ada), lalu melemparnya menggelinding ke arah acak. */
  shedKelabangParts(m){
    if(m._shed)return;m._shed=true;
    const SEG=(typeof Mob_Kelabang!=='undefined')?Mob_Kelabang.SEG:0.9;
    const SCALE=(typeof Mob_Kelabang!=='undefined')?Mob_Kelabang.SCALE:0.62;
    const active=(m.segCount!==undefined)?m.segCount:
      ((typeof Mob_Kelabang!=='undefined')?Mob_Kelabang.MAXSEG:7);
    const yaw=m.mesh.rotation.y;
    for(let i=0;i<active;i++){
      /* posisi ruas: coba dari jejak, kalau tidak ada pakai garis lurus */
      let px,pz;
      if(m._trail&&typeof Mob_Kelabang!=='undefined'){
        const sp=Mob_Kelabang._sampleTrail(m._trail,(i+1)*SEG*SCALE);
        if(sp){px=sp.x;pz=sp.z;}
      }
      if(px===undefined){
        px=m.pos.x-Math.sin(yaw)*(i+1)*SEG*SCALE;
        pz=m.pos.z-Math.cos(yaw)*(i+1)*SEG*SCALE;
      }
      const py=Math.max(CFG.SEA,World.topY(Math.floor(px),Math.floor(pz)));
      const part=this.make('kelabang_part',new THREE.Vector3(px,py+0.3,pz),false);
      /* impuls menggelinding menjauh dari titik kematian */
      const a=Math.atan2(px-m.pos.x,pz-m.pos.z)+rand(-0.6,0.6);
      const sp=rand(3,6);
      part.vel.set(Math.sin(a)*sp,rand(3,5),Math.cos(a)*sp);
      part.rollT=rand(2.5,4.5);          // lama fase menggelinding aktif
      this.list.push(part);
    }
    FX.debris(m.pos.clone().add(new THREE.Vector3(0,1,0)),0x96332c,24,4);
  },


  update(dt){
    this.timer-=dt;
    if(this.timer<=0){this.timer=1.4;this.spawn();}
    /* lizard tepi sungai: dicoba tiap 14 detik (langka, anti-spam) */
    this.lizardT=(this.lizardT||0)-dt;
    if(this.lizardT<=0){this.lizardT=14;this.spawnLizard();}
    /* KELABANG: tidak ada spawner liar — hanya lewat ritual Altar */
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
      /* ---------- STUN (SHIELD BASH Royal Guard) ----------
         m.stunT>0: mob membeku total — AI & angkatancang-ancang ditunda,
         kecepatan horizontal dibuang, tubuh terguncang (goyang-goyang lewat
         rotasi mesh). Indikatornya teks "STUN" + bintang saat kena. */
      if(m.stunT>0){
        m.stunT-=dt;
        if(m.stunT<=0)m.stunT=0;
        else{
          m.vel.x*=0.7;m.vel.z*=0.7;                 // momentum dibendung
          if(m.mesh)m.mesh.rotation.z=Math.sin(performance.now()*0.022)*0.09;
          if(m.windup>0)m.windup=0;                  // serangan yang dibatalkan
          if(Math.random()<dt*3)
            FX.text(m.pos.clone().add(new THREE.Vector3(0,1.9,0)),'💫','#ffe066');
          m.mesh.position.copy(m.pos);
          this.animate(m,dt);
          continue;                                   // lewati seluruh AI
        }
      }else if(m.mesh)m.mesh.rotation.z*=0.85;       // pulih dari guncangan
      if(m.dead)continue;

      /* efek racun kalajengking: damage susulan tiap 1 detik.
         Mob yang sedang dalam proses tangkap tidak boleh menyerang pemain, dan
         mob PELIHARAAN tidak boleh meracuni tuannya (dulu sengat kalajengking
         pet ikut menyetel poisonHit sehingga pemain sendiri yang teracuni). */
      if(!m.catchActive&&!m.pet&&m.poisonHit>0){
        m.poisonT-=dt;
        if(m.poisonT<=0){
          m.poisonT=1.0;m.poisonHit--;
          if(!Player.dead){
            Player.takeDamage(Math.max(2,Math.round(m.dmg*0.35)),null);
            FX.text(Player.pos.clone().add(new THREE.Vector3(0,2.2,0)),'☠ racun','#9ad84f');
          }
        }
      }
      /* penanda boss: titik kuning melayang naik-turun & berdenyut lembut */
      if(m.boss&&m.parts.bossDot){
        const t=performance.now()*0.001;
        const d=m.parts.bossDot;
        if(d.userData.baseY===undefined)d.userData.baseY=d.position.y;
        const sc=m.mesh.scale.y||1;
        d.position.y=d.userData.baseY+Math.sin(t*2.2)*0.12/sc;
        const s=1+0.16*Math.sin(t*4.4);
        d.scale.setScalar(s);
      }

      const dp=m.pos.distanceTo(Player.pos);
      if(!m.pet&&dp>55){Game.scene.remove(m.mesh);this.list.splice(i,1);continue;}
      /* TELEGRAPH HANTAMAN GOLEM diproses di sini, di luar cabang AI, supaya
         golem PET juga benar-benar melepas hantamannya. Dulu windup hanya
         diturunkan di dalam ai() (jalur mob liar), jadi golem peliharaan
         memasang ancang-ancang lalu membeku selamanya tanpa doSmash.
         Mob yang sedang ditangkap membatalkan ancang-ancangnya. */
      if(m.windup>0&&m.catchActive)m.windup=0;
      if(m.windup>0)this.windupTick(m,dt);
      else if(m.pet&&typeof Capture!=='undefined'){Capture.petAI(m,dt,dp);}
      else if(m.catchActive&&typeof Capture!=='undefined'){Capture.catchAI(m,dt,dp);}
      else this.ai(m,dt,dp);
      this.physics(m,dt);
      /* hewan ternak punya tabrakan badan dengan pemain/NPC/mob lain
         Saat ditunggangi, jangan pisahkan: penunggang duduk di punggungnya;
         bila dipisah, kuda terdorong maju tiap frame → bug kuda ngebut.
         PET juga: pemain melaporkan peliharaan menembus NPC & mob lain
         (pet melewati badan apapun karena physics-nya hanya menguji blok). */
      const beingRidden=(typeof Capture!=='undefined')&&Capture.riding&&(Capture.pet===m);
      if(((m.type==='cow'||m.type==='horse')||m.pet)&&!beingRidden&&!m.catchActive)
        this.separateAnimal(m);
      m.mesh.position.copy(m.pos);
      this.animate(m,dt);

      /* ---------- SEMBURAN API NAGA saat terbang ----------
         Selama jendela sembur api (flyFireActive>0), SEMUA korban sah di dalam
         kerucut ~60° di depan naga (jarak <6) menerima damage berkala, dan
         BLOCK di titik jatuh api ikut TERBAKAR/hancur seperti Hantaman golem.

         Sasaran arah semburan memakai battleTarget: naga liar menyembur ke
         pemenang threat (pemain / rekan NPC / pet), naga PET menyembur ke
         monster liar. Dulu titik api & damagenya dipaku ke Player sehingga naga
         tidak pernah menyemburkan api ketika lawannya NPC, dan naga peliharaan
         tidak pernah membakar musuhnya. */
      if(m.type==='dragon'&&m.flyT>0&&!m.catchActive){
        const stT=m.drag&&m.drag.stateT||0;
        const fb=(typeof Mob_Dragon!=='undefined')?Mob_Dragon.flyFireActive(stT):0;
        const ft=this.battleTarget(m,26);
        if(fb>0&&ft){
          m.fireCd=(m.fireCd||0)-dt;
          if(m.fireCd<=0){
            m.fireCd=0.4;
            const toT=new THREE.Vector3().subVectors(ft.pos,m.pos).setY(0);
            const dpp=toT.length();
            const yaw=m.mesh.rotation.y;
            const fx=Math.sin(yaw),fz=Math.cos(yaw);
            /* API MEMBAKAR BLOCK: titik jatuh api di tanah searah hadap naga.
               Naga PET tidak merusak dunia milik pemain. */
            const reach=clamp(dpp,1.5,6);
            const ix=m.pos.x+fx*reach,iz=m.pos.z+fz*reach;
            if(!m.pet)World.destroyArea(ix,iz,1.6);
            FX.ring(ix,World.topY(Math.floor(ix),Math.floor(iz))+0.05,iz,0xff5a2a,0.5,1.8);
            FX.debris(new THREE.Vector3(ix,World.topY(Math.floor(ix),Math.floor(iz)),iz),0xff6a30,6,2.2);
            /* kerucut ~60° di depan naga: siapa pun di dalamnya terbakar */
            const fdmg=Math.max(3,Math.round(m.dmg*0.7));
            for(const t of this.areaTargets(m,m.pos.x,m.pos.z,6)){
              const dx=t.pos.x-m.pos.x,dz=t.pos.z-m.pos.z;
              const dd=Math.hypot(dx,dz);
              if(dd<0.001)continue;
              if((dx*fx+dz*fz)/dd<=0.5)continue;
              if(!this.hitTarget(m,t,fdmg,6,m.pos.x,m.pos.z,0))continue;
              FX.debris(t.pos.clone().add(new THREE.Vector3(0,1,0)),0xff7a2e,6,2.4);
              FX.text(t.pos.clone().add(new THREE.Vector3(0,2.2,0)),'🔥','#ff7a2e');
            }
          }
        }
      }
      /* SAPUAN EKOR LIZARD: damage AoE di frame hit (tengah spin ~0.55-0.7).
         Radius diperkecil 3.2→2.5 mengikuti model yang kini seukuran babi.
         AoE-nya kini menyapu semua korban sah, bukan hanya pemain. */
      if(m.type==='lizard'&&!m.catchActive&&(m.tailT||0)>0&&!m._tailHit&&m.tailT<0.7){
        m._tailHit=true;
        FX.ring(m.pos.x,m.pos.y+0.1,m.pos.z,0x2fae24,0.8,2.5);
        const tdmg=Math.max(3,Math.round(m.dmg*0.8));
        for(const t of this.areaTargets(m,m.pos.x,m.pos.z,2.5)){
          if(!this.hitTarget(m,t,tdmg,2.5,m.pos.x,m.pos.z,4))continue;
          FX.debris(t.pos.clone().add(new THREE.Vector3(0,1,0)),0x69a94b,8,2.6);
          FX.text(t.pos.clone().add(new THREE.Vector3(0,2.2,0)),'💥','#69a94b');
        }
      }
    }
    /* proyektil asam lizard: update global sekali per frame */
    if(typeof Mob_Lizard!=='undefined')Mob_Lizard.updateAcid(dt);
    /* proyektil racun kelabang (SEMBURAN): update global sekali per frame */
    if(typeof Mob_Kelabang!=='undefined'&&Mob_Kelabang.updateVenom)Mob_Kelabang.updateVenom(dt);
    /* balok lempar kumbang: update global sekali per frame */
    if(typeof Mob_Kumbang!=='undefined'&&Mob_Kumbang.updateBlocks)Mob_Kumbang.updateBlocks(dt);
    /* arwah pemburu reaper (skill 3 arwah): update global sekali per frame */
    if(typeof Mob_Reaper!=='undefined'&&Mob_Reaper.updateSpirits)Mob_Reaper.updateSpirits(dt);
  },

  ai(m,dt,dp){
    const T=this.TYPES[m.type];
    const toP=new THREE.Vector3().subVectors(Player.pos,m.pos).setY(0);
    const angP=Math.atan2(toP.x,toP.z);
    
    /* ---------- POTONGAN RUAS KELABANG (kelabang_part) ----------
       Sisa tubuh yang menggelinding. Tidak menyerang & tidak mengejar; hanya
       meluncur karena momentum lalu melambat sendiri (physics friksi). */
    if(m.type==='kelabang_part'){
      m.rollT=Math.max(0,(m.rollT||0)-dt);
      return;
    }

    /* ---------- KELABANG RAKSASA: AI boss dengan 4 serangan ---------- */
    if(m.type==='kelabang'){
      this.aiKelabang(m,dt,dp,angP);
      return;
    }

    /* ---------- KUMBANG TANDUK: seruduk (dekat) & lempar balok (jauh) ---------- */
    if(m.type==='kumbang'){
      this.aiKumbang(m,dt,dp,angP);
      return;
    }

    /* ---------- YETI: lompat+hantam, cakar, hantaman ganda, pusaran 360° ---------- */
    if(m.type==='yeti'){
      this.aiYeti(m,dt,dp,angP);
      return;
    }

    /* ---------- SEMUT RAKSASA: gigit & terjang cepat ---------- */
    if(m.type==='semut'){
      this.aiSemut(m,dt,dp,angP);
      return;
    }

    /* ---------- REAPER (penjaga dungeon): 2 tebasan, hempasan, 3 arwah ---------- */
    if(m.type==='reaper'){
      this.aiReaper(m,dt,dp,angP);
      return;
    }

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
          /* lompatan panik: kelinci melompat cepat saat kabur. Dorongan
             mendatarnya ikut diturunkan 20% (3 → 2.4) sejalan dengan
             penurunan m.speed, supaya kelinci benar-benar bisa dikejar. */
          if(m.onGround){
            m.hopT-=dt;
            if(m.hopT<=0){
              m.hopT=rand(0.4,0.8);
              m.vel.y=5.5;
              m.vel.x+=Math.sin(fleeAng)*2.4;m.vel.z+=Math.cos(fleeAng)*2.4;
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
    
    /* CATATAN: telegraph hantaman golem (m.windup) tidak lagi diproses di sini —
       update() memanggil windupTick() sebelum masuk AI, supaya golem liar dan
       golem peliharaan sama-sama menuntaskan hantamannya. */
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
      /* deadzone sudut hadap saat sangat dekat: cegah glitch jitter kiri-kanan */
      if(dp>0.45)m.mesh.rotation.y=angLerp(m.mesh.rotation.y,angP,dt*6);
      /* slowMul: perlambatan dari efek beku senjata pemain */
      let sp=m.speed*(m.inWater?0.5:1)*(m.slowMul||1);
      /* NAGA LARI: saat target masih jauh, naga berlari mengejar (burst speed)
         supaya animasi poseRun terpakai, bukan terus berjalan pelan. */
      if(m.type==='dragon'&&dp>5.0)sp*=2.3;

      /* DIAM SAAT DALAM JANGKAUAN SERANG: mob berhenti merangsek agar tidak
         memicu saling dorong fisika & glitch geleng kepala */
      const mReach=(m.type==='dragon'?3.4:m.type==='golem'?3.0:m.type==='lizard'?2.2:1.6);
      if(dp>mReach*0.85){
        if(m.type==='slime'){
          this.slimeHop(m,dt,angP,sp*2.1,0.75,1.25);
        }else{
          m.vel.x=lerp(m.vel.x,Math.sin(angP)*sp,clamp(6*dt,0,1));
          m.vel.z=lerp(m.vel.z,Math.cos(angP)*sp,clamp(6*dt,0,1));
        }
      }else{
        const damp=Math.exp(-8*dt);
        m.vel.x*=damp;m.vel.z*=damp;
      }

      /* serangan — satu jalur untuk semua sasaran (pemain/NPC/pet/monster) */
      this.mobAttack(m,Player,dp,angP);
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

  /* =========================================================================
     AI KELABANG RAKSASA — 4 serangan (port dari kelabang_boss.html)
     -------------------------------------------------------------------------
     Total 4 jurus di kelabang_boss.html: SAMBARAN (strike), SERBUAN (charge),
     SEMBURAN (spit), TERJANG BUMI (burrow). Semua diterapkan di sini sebagai
     state-machine berbasis timer (m.katk = jurus aktif, m.katkT = waktu).

     SASARAN mengikuti sistem threat (Monsters.aimTarget): siapa pun yang
     memberi damage paling banyak — pemain, rekan NPC, atau pet — menjadi
     targetnya. Dulu AI ini melewati pickFoe sehingga selalu mengejar pemain.
     ========================================================================= */
  aiKelabang(m,dt,dp,angP){
    /* reset field animasi tiap frame (diisi oleh jurus yang berjalan) */
    m.liftY=m.liftY||0;m.headPitch=m.headPitch||0;m.attackJaw=m.attackJaw||0;

    /* sasaran paling agresif (pemain / NPC / pet) */
    this.pickFoe(m,dt);
    const tgt=this.aimTarget(m);
    m.kTgt=tgt;
    const tpos=tgt?tgt.pos:Player.pos;
    const dT=tgt?Math.hypot(tpos.x-m.pos.x,tpos.z-m.pos.z):999;
    const angT=Math.atan2(tpos.x-m.pos.x,tpos.z-m.pos.z);

    /* jurus sedang berjalan? proses lalu jangan lakukan AI kejar biasa */
    if(m.katk){this.kelabangAtk(m,dt,dT,angT);return;}

    /* peluruhan halus pose animasi ke default saat tidak menyerang */
    m.liftY+=(0-m.liftY)*Math.min(1,dt*6);
    m.headPitch+=(0-m.headPitch)*Math.min(1,dt*6);
    m.attackJaw+=(0-m.attackJaw)*Math.min(1,dt*6);

    /* ---- deteksi & kejar sasaran ---- */
    const MB=CFG.MOB;
    const sight=Math.max(this.TYPES.kelabang.aggro,MB.SIGHT);
    m.seeT=Math.max(0,(m.seeT||0)-dt);
    m.alert=Math.max(0,(m.alert||0)-dt);
    if(tgt&&dT<sight)m.seeT=MB.MEM;
    const active=!!tgt&&(m.seeT>0||m.alert>0||dT<sight);
    m.state=active?'chase':'wander';

    if(active){
      m.mesh.rotation.y=angLerp(m.mesh.rotation.y,angT,dt*4);
      const sp=m.speed*(m.inWater?0.5:1)*(m.slowMul||1);
      m.vel.x=lerp(m.vel.x,Math.sin(angT)*sp,clamp(5*dt,0,1));
      m.vel.z=lerp(m.vel.z,Math.cos(angT)*sp,clamp(5*dt,0,1));
      /* timer khusus TERJANG BUMI: menghitung waktu sejak terakhir menyelam.
         Tanpa ini, kelabang hampir selalu berada <3 blok dari sasaran (karena
         terus mengejar) sehingga selalu memilih SAMBARAN dan nyaris tak pernah
         masuk tanah. Timer memaksa burrow muncul secara berkala. */
      m.burrowCd=(m.burrowCd===undefined)?rand(6,9):m.burrowCd-dt;
      /* pilih jurus saat cooldown habis */
      if(m.atkCd<=0){
        let choice;
        /* PRIORITAS: bila timer terjang bumi habis, langsung menyelam
           (berapa pun jaraknya) supaya jurus ini benar-benar sering terlihat */
        if(m.burrowCd<=0){
          choice='burrow';
          m.burrowCd=rand(8,12);
        }else if(dT<3.2){
          /* dekat: kebanyakan sambaran, sesekali semburan */
          choice=Math.random()<0.75?'strike':'spit';
        }else{
          const r=Math.random();
          if(dT>13)choice=r<0.5?'charge':(r<0.8?'burrow':'spit');
          else if(r<0.30)choice='charge';
          else if(r<0.58)choice='spit';
          else if(r<0.82)choice='burrow';
          else choice='strike';
        }
        this.startKelabangAtk(m,choice);
      }
    }else{
      /* wander tenang */
      m.t-=dt;
      if(m.t<=0){m.t=rand(1.6,3.8);m.dir=Math.random()*Math.PI*2;m.walking=Math.random()<0.6;}
      if(m.walking){
        m.mesh.rotation.y=angLerp(m.mesh.rotation.y,m.dir,dt*3);
        const sp=m.speed*0.4;
        m.vel.x=lerp(m.vel.x,Math.sin(m.dir)*sp,clamp(4*dt,0,1));
        m.vel.z=lerp(m.vel.z,Math.cos(m.dir)*sp,clamp(4*dt,0,1));
      }else{m.vel.x*=0.85;m.vel.z*=0.85;}
    }
  },

  /* mulai jurus kelabang: set durasi & reset flag internal */
  startKelabangAtk(m,name){
    m.katk=name;m.katkT=0;
    m._kFlag=false;m._kFlag2=false;
    m.dur=name==='strike'?1.5:name==='charge'?2.2:name==='spit'?1.6:name==='burrow'?4.4:1.5;
    /* cooldown berikutnya diset saat jurus selesai */
    if(name==='charge'){m._lockYaw=m.mesh.rotation.y;}
    if(name==='burrow'){
      /* ---------- TERJANG BUMI: MUNCUL DI BAWAH SASARAN ----------
         Dulu titik muncul digeser 3-6 blok DI BELAKANG sasaran, jadi kelabang
         seperti meleset dan jurusnya tidak terasa mengancam. Sekarang ia
         menyerang TEPAT di posisi sasaran.

         Agar tetap bisa dihindari, titik muncul TIDAK mengikuti sasaran secara
         terus-menerus: ia dibekukan pada fase awal menyelam (lihat _lockAt) dan
         diberi telegraph — cincin bahaya + gelombang tanah di titik itu — jadi
         pemain punya waktu ~1 detik untuk menyingkir dari lokasi tersebut. */
      const tgt=this.aimTarget(m)||Player;
      m._ex=tgt.pos.x;
      m._ez=tgt.pos.z;
      m._lockAt=0;                  // waktu (katkT) saat titik muncul dibekukan
      m._diveY=null;
      if(typeof Sfx!=='undefined'&&Sfx.at)Sfx.at(m.pos,'smash',0.6);
    }
  },

  /* update jurus kelabang yang sedang berjalan.
     `dp`/`angP` = jarak & arah ke SASARAN (bisa pemain, NPC, atau pet). */
  kelabangAtk(m,dt,dp,angP){
    m.katkT+=dt;
    const k=Math.min(1,m.katkT/m.dur);
    const name=m.katk;
    const tgt=(m.kTgt&&!m.kTgt.dead)?m.kTgt:this.aimTarget(m);

    if(name==='strike'){
      /* SAMBARAN: angkat kepala & ruas depan tinggi, lalu tukik menyambar.
         Fase: 0-0.4 angkat, 0.4-0.55 tahan, 0.55-0.7 tukik (hit), sisanya pulih.
         Selama mengangkat & menahan, kelabang SELALU mengarah ke target. */
      m.vel.x*=0.82;m.vel.z*=0.82;
      if(k<0.7)m.mesh.rotation.y=angLerp(m.mesh.rotation.y,angP,dt*10);
      if(k<0.4){const p=k/0.4;m.liftY=p*1.9;m.headPitch=-0.5*p;m.attackJaw=p*0.8;}
      else if(k<0.55){m.liftY=1.9;m.headPitch=-0.5;m.attackJaw=1.0;}
      else if(k<0.7){
        const p=(k-0.55)/0.15;
        m.liftY=1.9*(1-p);m.headPitch=lerp(-0.5,0.6,p);m.attackJaw=1.0;
        if(!m._kFlag&&k>=0.62){
          m._kFlag=true;
          FX.addShake(0.7);
          if(typeof Sfx!=='undefined')Sfx.hit();
          /* titik hantam di depan kepala — jangkauan mengikuti ukuran besar */
          const hx=m.pos.x+Math.sin(m.mesh.rotation.y)*3.4;
          const hz=m.pos.z+Math.cos(m.mesh.rotation.y)*3.4;
          FX.debris(new THREE.Vector3(hx,0.3,hz),0x96332c,20,4);
          FX.ring(hx,0.06,hz,0x8dff3a,0.8,5.5);
          if(typeof FX.groundWave==='function')
            FX.groundWave(hx,World.topY(Math.floor(hx),Math.floor(hz)),hz,{mode:'radial',radius:3.2,color:0x9e3b2c,amp:0.9});
          if(this.hitTarget(m,tgt,Math.round(m.dmg*1.3),4.6,hx,hz,0)){
            m.poisonHit=2;m.poisonT=1.0;
          }
        }
      }else{const p=(k-0.7)/0.3;m.liftY=0;m.headPitch=0.6*(1-p);m.attackJaw=1.0*(1-p);}
    }

    else if(name==='charge'){
      /* SERBUAN: melesat lurus ke depan dengan kecepatan tinggi. */
      m.headPitch+=(0.12-m.headPitch)*Math.min(1,dt*8);
      m.attackJaw+=(0.4-m.attackJaw)*Math.min(1,dt*8);
      let v=0;
      if(k<0.18)v=lerp(0,4,k/0.18);
      else if(k<0.8)v=15;
      else v=lerp(15,0,(k-0.8)/0.2);
      const yaw=m._lockYaw!==undefined?m._lockYaw:m.mesh.rotation.y;
      m.vel.x=Math.sin(yaw)*v;m.vel.z=Math.cos(yaw)*v;
      /* debu di kaki saat melesat (area lebih lebar mengikuti tubuh besar) */
      if(v>4&&Math.random()<dt*24)
        FX.debris(new THREE.Vector3(m.pos.x+rand(-2,2),0.1,m.pos.z+rand(-2,2)),0x9e3b2c,3,1.8);
      /* tabrak sasaran saat melesat (satu kali per serbuan) */
      if(v>6&&!m._kFlag&&dp<3.4){
        if(this.hitTarget(m,tgt,Math.round(m.dmg*1.1),3.4,m.pos.x,m.pos.z,9)){
          m._kFlag=true;
          FX.addShake(0.5);
        }
      }
    }

    else if(name==='spit'){
      /* SEMBURAN: angkat tubuh, semburkan racun membusur ke sasaran.
         Saat mengangkat tubuh, kelabang SELALU mengarah ke target. */
      m.vel.x*=0.8;m.vel.z*=0.8;
      if(k<0.55)m.mesh.rotation.y=angLerp(m.mesh.rotation.y,angP,dt*10);
      if(k<0.4){const p=k/0.4;m.liftY=p*1.5;m.headPitch=-0.35*p;m.attackJaw=p*0.6;}
      else if(k<0.55){
        m.liftY=1.5;m.headPitch=lerp(-0.35,0.25,(k-0.4)/0.15);m.attackJaw=1.0;
        if(!m._kFlag&&k>=0.46){
          m._kFlag=true;
          /* semburan menyebar acak di area (bukan proyektil terarah), jadi
             tidak perlu sasaran — siapa pun yang berdiri di titik jatuh kena */
          if(typeof Mob_Kelabang!=='undefined')Mob_Kelabang.venomBurst(m);
        }
      }else{const p=(k-0.55)/0.45;m.liftY=1.5*(1-p);m.headPitch=0.25*(1-p);m.attackJaw=1.0*(1-p);}
    }

    else if(name==='burrow'){
      /* TERJANG BUMI: seluruh tubuh menyelam, meluncur di bawah tanah menuju
         titik muncul, lalu MELEDAK KELUAR DARI BAWAH SASARAN.

         BISA DIHINDARI: titik muncul hanya mengikuti sasaran selama fase
         menukik (k<LOCK_K). Sesudah itu titiknya DIKUNCI dan ditandai dengan
         cincin bahaya + gelombang tanah yang berdenyut di permukaan, jadi
         pemain melihat dengan jelas ke mana kelabang akan muncul dan punya
         waktu ±1,5 detik untuk menyingkir. */
      const LOCK_K=0.30;
      if(m._diveY===null||m._diveY===undefined)m._diveY=m.pos.y;
      const groundY=Math.max(CFG.SEA,World.topY(Math.floor(m.pos.x),Math.floor(m.pos.z)));
      /* selama belum terkunci, incar posisi sasaran saat ini */
      if(k<LOCK_K&&tgt){m._ex=tgt.pos.x;m._ez=tgt.pos.z;}
      if(k<0.16){
        /* menukik masuk: kepala mendongak lalu menghunjam */
        const p=k/0.16;
        m.headPitch=lerp(-0.3,0.9,p);
        m.vel.x*=0.9;m.vel.z*=0.9;
        if(!m._kFlag&&p>0.5){
          m._kFlag=true;
          FX.addShake(0.7);
          FX.debris(new THREE.Vector3(m.pos.x,0.2,m.pos.z),0x9e3b2c,28,4.5);
          FX.ring(m.pos.x,0.06,m.pos.z,0x8a6b4a,1.0,5.5);
          if(typeof Sfx!=='undefined'&&Sfx.at)Sfx.at(m.pos,'smash',0.7);
        }
      }else if(k<0.7){
        /* meluncur cepat di bawah tanah menuju titik muncul */
        m.underground=true;
        m.mesh.visible=false;                 // sembunyikan model saat di bawah
        const yaw=Math.atan2(m._ex-m.pos.x,m._ez-m.pos.z);
        m.mesh.rotation.y=angLerp(m.mesh.rotation.y,yaw,dt*6);
        const sp=15;
        const remain=Math.hypot(m._ex-m.pos.x,m._ez-m.pos.z);
        const step=Math.min(sp*dt,remain);    // jangan melewati titik muncul
        if(remain>0.001){
          m.pos.x+=Math.sin(yaw)*step;
          m.pos.z+=Math.cos(yaw)*step;
        }
        m.pos.y=groundY;                      // tetap menempel tanah
        m.vel.set(0,0,0);
        /* GELOMBANG TANAH TERANGKAT di jalur (mirip leap pemain). Radius & amp
           diperbesar mengikuti tubuh kelabang yang kini 3× lebih besar. */
        m._moundT=(m._moundT||0)-dt;
        if(m._moundT<=0){
          m._moundT=0.08;
          if(typeof FX.groundWave==='function')
            FX.groundWave(m.pos.x,groundY,m.pos.z,{mode:'radial',radius:3.4,color:0x9e3b2c,amp:1.2,speed:6});
          FX.debris(new THREE.Vector3(m.pos.x,groundY+0.1,m.pos.z),0x9e3b2c,5,2.6);
        }
        /* ---- TELEGRAPH di titik muncul: peringatan agar bisa dihindari ---- */
        if(k>=LOCK_K){
          m._warnT=(m._warnT||0)-dt;
          if(m._warnT<=0){
            m._warnT=0.22;
            const wy=Math.max(CFG.SEA,World.topY(Math.floor(m._ex),Math.floor(m._ez)));
            FX.ring(m._ex,wy+0.07,m._ez,0xff5a3c,0.34,5.2);
            FX.debris(new THREE.Vector3(m._ex,wy+0.15,m._ez),0x9e3b2c,4,2.2);
          }
        }
        /* sudah sampai titik muncul? percepat ke fase keluar */
        if(remain<1.2&&m.katkT<m.dur*0.7)
          m.katkT=m.dur*0.7;
      }else{
        /* meledak keluar dari tanah, TEPAT di titik yang sudah ditandai */
        m.mesh.visible=true;m.underground=false;
        if(!m._kFlag2&&m._ex!==undefined){
          /* pastikan muncul di titik telegraph, bukan di tempat berhenti */
          m.pos.x=m._ex;m.pos.z=m._ez;
          m.pos.y=Math.max(CFG.SEA,World.topY(Math.floor(m.pos.x),Math.floor(m.pos.z)));
        }
        const p=(k-0.7)/0.3;
        m.headPitch=lerp(-0.6,0,p);
        m.liftY=Math.sin(p*Math.PI)*1.4;
        m.vel.x*=0.7;m.vel.z*=0.7;
        if(!m._kFlag2){
          m._kFlag2=true;
          const gy2=Math.max(CFG.SEA,World.topY(Math.floor(m.pos.x),Math.floor(m.pos.z)));
          FX.addShake(1.2);
          FX.debris(new THREE.Vector3(m.pos.x,gy2+0.2,m.pos.z),0x9e3b2c,44,6.5);
          FX.ring(m.pos.x,0.06,m.pos.z,0x8a6b4a,1.2,8);
          FX.ring(m.pos.x,0.06,m.pos.z,0x8dff3a,0.9,5.5);
          if(typeof FX.groundWave==='function')
            FX.groundWave(m.pos.x,gy2,m.pos.z,{mode:'radial',radius:5.5,color:0x9e3b2c,amp:1.4});
          if(typeof Sfx!=='undefined'&&Sfx.at)Sfx.at(m.pos,'smash',1);
          /* radius ledakan 3.6 (dari 5.0): pemain yang sudah menyingkir dari
             cincin peringatan benar-benar aman, bukan tetap terkena */
          if(this.hitTarget(m,tgt,Math.round(m.dmg*1.5),3.6,m.pos.x,m.pos.z,8)){
            m.poisonHit=2;m.poisonT=1.0;
          }
        }
      }
    }

    /* jurus selesai */
    if(m.katkT>=m.dur){
      m.katk=null;
      m.mesh.visible=true;m.underground=false;
      m.liftY=0;m.headPitch=0;
      m.atkCd=rand(2.4,4.0);
    }
  },

  /* =========================================================================
     AI KUMBANG TANDUK — 2 serangan (port dari Kumbang.html)
     -------------------------------------------------------------------------
     'attack' (Seruduk Tanduk): menerjang & menghantam tanduk ke atas.
     'throw'  (Angkat & Lempar Batu): melempar batu ke sasaran.

     PEMILIHAN JURUS ACAK: dulu jurus ditentukan murni oleh jarak (`dp<2.6`),
     jadi selama pemain menjaga jarak kumbang HANYA melempar tanpa henti dan
     serudukan praktis tak pernah terlihat. Sekarang keduanya diundi; jarak
     hanya memiringkan peluangnya (dekat → lebih sering seruduk, jauh → lebih
     sering lempar) dan jurus yang tidak mungkin dilakukan pada jarak tertentu
     tetap dicegah (seruduk butuh ancang-ancang, lempar butuh ruang).

     SASARAN mengikuti sistem threat (Monsters.aimTarget) sehingga kumbang ikut
     berbalik menyerang NPC/pet yang memberi damage lebih banyak.
     Timeline dijalankan lewat m.kumAtk/m.kumAtkT/m.kumAtkDur (dibaca oleh
     Mob_Kumbang.animate untuk overlay pose keyframe).
     ========================================================================= */
  /* undi jurus kumbang berdasarkan jarak ke sasaran */
  pickKumbangAtk(d){
    /* peluang seruduk: 85% saat menempel, turun halus sampai 15% di jarak 12+.
       Keduanya selalu punya peluang, jadi tidak pernah monoton. */
    let pCharge;
    if(d<2.2)pCharge=0.85;
    else if(d>12)pCharge=0.15;
    else pCharge=lerp(0.85,0.15,(d-2.2)/9.8);
    /* terlalu jauh untuk menyeruduk (tidak akan sampai) → paksa lempar */
    if(d>16)pCharge=0;
    /* menempel badan → lempar sulit dilakukan, paksa seruduk */
    if(d<1.4)pCharge=1;
    return Math.random()<pCharge?'attack':'throw';
  },
  aiKumbang(m,dt,dp,angP){
    /* sasaran paling agresif (pemain / NPC / pet) */
    this.pickFoe(m,dt);
    const tgt=this.aimTarget(m);
    const tpos=tgt?tgt.pos:Player.pos;
    const dT=tgt?Math.hypot(tpos.x-m.pos.x,tpos.z-m.pos.z):999;
    const angT=Math.atan2(tpos.x-m.pos.x,tpos.z-m.pos.z);

    /* jurus sedang berjalan? proses, jangan lakukan kejar biasa */
    if(m.kumAtk){this.kumbangAtk(m,dt,dT,angT);return;}

    /* deteksi & kejar sasaran (berbasis penglihatan seperti mob umum) */
    const MB=CFG.MOB;
    const sight=Math.min(this.TYPES.kumbang.aggro,MB.SIGHT);
    m.seeT=Math.max(0,(m.seeT||0)-dt);
    m.alert=Math.max(0,(m.alert||0)-dt);
    if(tgt&&dT<sight)m.seeT=MB.MEM;
    const active=!!tgt&&(m.seeT>0||m.alert>0);
    m.state=active?'chase':'wander';

    if(active){
      if(dT>0.45)m.mesh.rotation.y=angLerp(m.mesh.rotation.y,angT,dt*6);
      const sp=m.speed*(m.inWater?0.5:1)*(m.slowMul||1);
      /* JANGKAUAN SERANG KUMBANG: jika sudah dekat, diam sambil bersiap serang */
      if(dT>1.8){
        m.vel.x=lerp(m.vel.x,Math.sin(angT)*sp,clamp(6*dt,0,1));
        m.vel.z=lerp(m.vel.z,Math.cos(angT)*sp,clamp(6*dt,0,1));
      }else{
        const damp=Math.exp(-8*dt);
        m.vel.x*=damp;m.vel.z*=damp;
      }
      if(m.atkCd<=0){
        /* jurus diundi (jarak hanya memiringkan peluang) */
        this.startKumbangAtk(m,this.pickKumbangAtk(dT),m.foe&&!m.foe.dead?m.foe:null);
      }
    }else{
      /* wander tenang */
      m.t-=dt;
      if(m.t<=0){m.t=rand(1.5,4);m.dir=Math.random()*Math.PI*2;m.walking=Math.random()<0.6;}
      if(m.walking){
        m.mesh.rotation.y=angLerp(m.mesh.rotation.y,m.dir,dt*3);
        const sp=m.speed*0.4;
        m.vel.x=lerp(m.vel.x,Math.sin(m.dir)*sp,clamp(4*dt,0,1));
        m.vel.z=lerp(m.vel.z,Math.cos(m.dir)*sp,clamp(4*dt,0,1));
      }else{m.vel.x*=0.85;m.vel.z*=0.85;}
    }
  },
  startKumbangAtk(m,name,target){
    m.kumAtk=name;m.kumAtkT=0;m._kumFired=false;m._kumThrew=false;
    m.kumAtkDur=name==='attack'?0.95:1.7;
    /* sasaran serangan: null = pemain (kumbang liar). Saat menjadi PET, target
       diisi monster musuh sehingga seruduk & lemparannya mengarah ke sana. */
    m.kumTarget=target||null;
    if(name==='attack'){m._lockYaw=m.mesh.rotation.y;}
  },
  /* Jalankan timeline serangan kumbang.
     `angP` = arah ke sasaran. m.kumTarget = NPC/pet/monster yang sedang jadi
     sasaran (dari sistem threat, atau musuh pet); null = pemain. */
  kumbangAtk(m,dt,dp,angP){
    m.kumAtkT+=dt;
    const u=Math.min(1,m.kumAtkT/m.kumAtkDur);
    /* sasaran: yang dikunci saat jurus dimulai, atau pemain bila kosong.
       Pet TIDAK PERNAH menyasar pemain, jadi sasarannya wajib ada. */
    let foe=(m.kumTarget&&!m.kumTarget.dead)?m.kumTarget:null;
    const tgt=foe||(m.pet?null:((typeof Player!=='undefined'&&!Player.dead)?Player:null));
    if(m.kumAtk==='attack'){
      /* SERUDUK TANDUK: terjang maju saat menghantam, damage di puncak animasi */
      if(u<0.42&&dp>0.45)m.mesh.rotation.y=angLerp(m.mesh.rotation.y,angP,dt*8);
      const yaw=m._lockYaw!==undefined?m._lockYaw:m.mesh.rotation.y;
      let v=0;
      if(u>=0.42&&u<0.6)v=9;                 // dorongan seruduk
      m.vel.x=lerp(m.vel.x,Math.sin(yaw)*v,clamp(10*dt,0,1));
      m.vel.z=lerp(m.vel.z,Math.cos(yaw)*v,clamp(10*dt,0,1));
      if(!m._kumFired&&u>=0.46){
        m._kumFired=true;
        if(typeof Sfx!=='undefined')Sfx.at?Sfx.at(m.pos,'hit'):Sfx.hit();
        const hx=m.pos.x+Math.sin(yaw)*1.4,hz=m.pos.z+Math.cos(yaw)*1.4;
        FX.debris(new THREE.Vector3(hx,0.6,hz),0xffa53d,10,2.6);
        FX.ring(hx,0.06,hz,0xffa53d,0.5,2.4);
        /* satu jalur damage untuk semua jenis sasaran (pemain/NPC/pet/monster) */
        if(this.hitTarget(m,tgt,Math.round(m.dmg*1.2),2.2,hx,hz,7)&&tgt===Player)
          FX.addShake(0.3);
      }
    }else{
      /* ANGKAT & LEMPAR BATU: lepaskan batu pada fase lempar (u≈0.585) */
      m.vel.x*=0.8;m.vel.z*=0.8;
      if(u<0.5)m.mesh.rotation.y=angLerp(m.mesh.rotation.y,angP,dt*6);
      if(!m._kumThrew&&u>=0.585){
        m._kumThrew=true;
        if(typeof Mob_Kumbang!=='undefined')Mob_Kumbang.throwBlock(m,foe);
      }
    }
    if(m.kumAtkT>=m.kumAtkDur){
      m.kumAtk=null;m.kumTarget=null;
      m.atkCd=rand(1.8,3.2);
    }
  },

  /* =========================================================================
     AI YETI — 4 aksi tempur (port dari Yeti.html)
     -------------------------------------------------------------------------
     SELURUH aksi di file model dipakai di game:
       atk1 'Sapuan Cakar'          — sabetan cepat, jangkauan dekat.
       atk2 'Hantaman Ganda'        — dua tangan dihantamkan ke depan + ledakan
                                      tanah kecil.
       atk3 'Pusaran Salju 360°'    — berputar penuh, damage AoE di sekeliling
                                      (dua gelombang).
       jump 'Lompat & Hantam Tanah' — melompat sungguhan (lewat fisika mob) lalu
                                      menghantam tanah saat mendarat.
     Pemilihan aksi DIUNDI dengan jarak sebagai pemiring peluang, mengikuti pola
     yang sama seperti kumbang, supaya tidak ada aksi yang praktis tak terlihat.

     SASARAN memakai sistem threat (aimTarget), jadi yeti ikut berbalik ke
     NPC/pet yang memberi damage terbanyak.
     ========================================================================= */
  pickYetiAct(d){
    const r=Math.random();
    /* jarak jauh: hanya lompat yang bisa menjangkau */
    if(d>7)return 'jump';
    /* menengah: lompat menerjang atau hantaman ganda */
    if(d>3.4)return r<0.55?'jump':(r<0.85?'atk2':'atk3');
    /* dekat: ketiga jurus jarak dekat diundi merata-condong ke cakar */
    if(r<0.40)return 'atk1';
    if(r<0.70)return 'atk2';
    if(r<0.90)return 'atk3';
    return 'jump';
  },
  aiYeti(m,dt,dp,angP){
    this.pickFoe(m,dt);
    const tgt=this.aimTarget(m);
    const tpos=tgt?tgt.pos:Player.pos;
    const dT=tgt?Math.hypot(tpos.x-m.pos.x,tpos.z-m.pos.z):999;
    const angT=Math.atan2(tpos.x-m.pos.x,tpos.z-m.pos.z);

    /* aksi sedang berjalan? jalankan timeline-nya, jangan kejar biasa */
    if(m.yAct){this.yetiAct(m,dt,dT,angT,tgt);return;}

    const MB=CFG.MOB;
    const sight=Math.min(this.TYPES.yeti.aggro,MB.SIGHT);
    m.seeT=Math.max(0,(m.seeT||0)-dt);
    m.alert=Math.max(0,(m.alert||0)-dt);
    if(tgt&&dT<sight)m.seeT=MB.MEM;
    const active=!!tgt&&(m.seeT>0||m.alert>0);
    m.state=active?'chase':'wander';

    if(active){
      if(dT>0.45)m.mesh.rotation.y=angLerp(m.mesh.rotation.y,angT,dt*5);
      let sp=m.speed*(m.inWater?0.5:1)*(m.slowMul||1);
      if(dT>5)sp*=1.7;
      if(dT>2.0){
        m.vel.x=lerp(m.vel.x,Math.sin(angT)*sp,clamp(5*dt,0,1));
        m.vel.z=lerp(m.vel.z,Math.cos(angT)*sp,clamp(5*dt,0,1));
      }else{
        const damp=Math.exp(-8*dt);
        m.vel.x*=damp;m.vel.z*=damp;
      }
      if(m.atkCd<=0)this.startYetiAct(m,this.pickYetiAct(dT),tgt);
    }else{
      m.t-=dt;
      if(m.t<=0){m.t=rand(1.8,4.2);m.dir=Math.random()*Math.PI*2;m.walking=Math.random()<0.6;}
      if(m.walking){
        m.mesh.rotation.y=angLerp(m.mesh.rotation.y,m.dir,dt*3);
        const sp=m.speed*0.4;
        m.vel.x=lerp(m.vel.x,Math.sin(m.dir)*sp,clamp(4*dt,0,1));
        m.vel.z=lerp(m.vel.z,Math.cos(m.dir)*sp,clamp(4*dt,0,1));
      }else{m.vel.x*=0.85;m.vel.z*=0.85;}
    }
  },
  startYetiAct(m,name,target){
    const Y=(typeof Mob_Yeti!=='undefined')?Mob_Yeti:null;
    m.yAct=name;m.yActT=0;
    m.yActDur=(Y&&Y.DUR[name])||0.9;
    m.yTarget=(target&&target!==Player)?target:null;
    m._yF1=false;m._yF2=false;m._yLaunched=false;
    /* arah dikunci saat aksi dimulai: hantaman & lompatan tidak boleh
       "menempel" mengikuti sasaran, supaya masih bisa dihindari */
    m._yYaw=m.mesh.rotation.y;
    if(name==='jump'&&typeof Sfx!=='undefined'&&Sfx.at)Sfx.at(m.pos,'smash',0.5);
  },
  /* jalankan timeline aksi yeti. `dp`/`angP` = jarak & arah ke sasaran. */
  yetiAct(m,dt,dp,angP,tgtIn){
    const Y=(typeof Mob_Yeti!=='undefined')?Mob_Yeti:null;
    m.yActT+=dt;
    const tA=m.yActT,name=m.yAct;
    const tgt=(m.yTarget&&!m.yTarget.dead)?m.yTarget:
              (tgtIn||this.aimTarget(m));
    const HIT=(Y&&Y.HIT)||{jump:1.06,atk1:0.22,atk2:0.5,atk3a:0.3,atk3b:0.58};

    if(name==='jump'){
      /* LOMPAT & HANTAM TANAH.
         Lompatannya nyata: pada saat tolakan diberi vel.y + dorongan maju ke
         arah sasaran, jadi posisi visual = posisi tabrakan (tidak ada offset
         root palsu). Hantaman dilepas saat mendarat kembali. */
      if(tA<(Y?Y.JUMP_LAUNCH:0.26)){
        /* ancang-ancang: menekuk, masih boleh membidik */
        m.mesh.rotation.y=angLerp(m.mesh.rotation.y,angP,dt*8);
        m._yYaw=m.mesh.rotation.y;
        m.vel.x*=0.82;m.vel.z*=0.82;
      }else if(!m._yLaunched){
        m._yLaunched=true;
        const reach=clamp(dp,1.5,7.5);
        m.vel.y=Math.max(m.vel.y,11);
        m.vel.x=Math.sin(m._yYaw)*reach*1.5;
        m.vel.z=Math.cos(m._yYaw)*reach*1.5;
        if(Y)Y.groundBurst(m,m.pos.x,m.pos.z,0.55);
      }
      /* mendarat = hantaman. Dipicu oleh kontak tanah setelah melayang, atau
         oleh batas waktu keyframe (pengaman bila mendarat di dinding). */
      if(m._yLaunched&&!m._yF1&&((m.onGround&&tA>0.5)||tA>=HIT.jump)){
        m._yF1=true;
        if(typeof FX!=='undefined')FX.addShake(0.75);
        if(typeof Sfx!=='undefined')Sfx.smash();
        if(Y)Y.groundBurst(m,m.pos.x,m.pos.z,1.6);
        /* AoE di sekitar titik mendarat */
        if(this.hitTarget(m,tgt,Math.round(m.dmg*1.5),3.2,m.pos.x,m.pos.z,9)&&
           typeof FX!=='undefined')FX.addShake(0.4);
      }
      if(m._yF1){m.vel.x*=0.86;m.vel.z*=0.86;}
    }

    else if(name==='atk1'){
      /* SAPUAN CAKAR: sabetan cepat satu sasaran di depan */
      m.vel.x*=0.8;m.vel.z*=0.8;
      if(tA<HIT.atk1)m.mesh.rotation.y=angLerp(m.mesh.rotation.y,angP,dt*9);
      if(!m._yF1&&tA>=HIT.atk1){
        m._yF1=true;
        const yaw=m.mesh.rotation.y;
        const hx=m.pos.x+Math.sin(yaw)*1.6,hz=m.pos.z+Math.cos(yaw)*1.6;
        if(Y)Y.slashFX(m,hx,m.pos.y+1.5,hz,yaw,1.25);
        if(typeof Sfx!=='undefined')Sfx.at?Sfx.at(m.pos,'swing',1):Sfx.hit();
        this.hitTarget(m,tgt,m.dmg,2.4,hx,hz,5);
      }
    }

    else if(name==='atk2'){
      /* HANTAMAN GANDA: dua tangan dihantamkan ke depan + ledakan tanah */
      m.vel.x*=0.82;m.vel.z*=0.82;
      if(tA<0.36)m.mesh.rotation.y=angLerp(m.mesh.rotation.y,angP,dt*7);
      if(!m._yF1&&tA>=HIT.atk2){
        m._yF1=true;
        const yaw=m.mesh.rotation.y;
        const hx=m.pos.x+Math.sin(yaw)*2.0,hz=m.pos.z+Math.cos(yaw)*2.0;
        if(Y){Y.slashFX(m,hx,m.pos.y+1.6,hz,yaw,1.3);Y.groundBurst(m,hx,hz,0.75);}
        if(typeof FX!=='undefined')FX.addShake(0.3);
        if(typeof Sfx!=='undefined')Sfx.at?Sfx.at(m.pos,'smash',0.6):Sfx.smash();
        this.hitTarget(m,tgt,Math.round(m.dmg*1.35),2.8,hx,hz,7);
      }
    }

    else{
      /* PUSARAN SALJU 360°: dua gelombang AoE di sekeliling tubuh. Selama
         berputar yeti bergeser pelan ke arah sasaran supaya tidak mudah
         dihindari hanya dengan mundur satu langkah. */
      const sp=m.speed*0.5;
      m.vel.x=lerp(m.vel.x,Math.sin(angP)*sp,clamp(3*dt,0,1));
      m.vel.z=lerp(m.vel.z,Math.cos(angP)*sp,clamp(3*dt,0,1));
      if(!m._yF1&&tA>=HIT.atk3a){
        m._yF1=true;
        if(Y)Y.groundBurst(m,m.pos.x,m.pos.z,1.15);
        if(typeof FX!=='undefined')FX.addShake(0.35);
        if(typeof Sfx!=='undefined')Sfx.at?Sfx.at(m.pos,'wave',0.8):null;
        this.hitTarget(m,tgt,Math.round(m.dmg*0.9),3.0,m.pos.x,m.pos.z,6);
      }
      if(!m._yF2&&tA>=HIT.atk3b){
        m._yF2=true;
        if(Y)Y.slashFX(m,m.pos.x,m.pos.y+1.7,m.pos.z,m.mesh.rotation.y,1.3);
        this.hitTarget(m,tgt,Math.round(m.dmg*0.9),3.4,m.pos.x,m.pos.z,6);
      }
    }

    if(m.yActT>=m.yActDur){
      m.yAct=null;m.yTarget=null;
      m.atkCd=rand(1.6,3.0);
    }
  },

  /* =========================================================================
     AI REAPER — 4 aksi tempur (port dari reaper.html)
     -------------------------------------------------------------------------
     SELURUH aksi di file model dipakai di game:
       a1    'Sabit Horizontal'  — tebasan mendatar lebar di depan.
       a2    'Tebasan Balik'     — tebasan balik arah, sedikit lebih cepat.
       a3    'Hukuman Maut'      — sabit diangkat lalu dihempas: getaran tanah
                                   lebih dulu, lalu hempasan AoE besar.
       skill '3 Arwah Menyerang' — memanggil tiga arwah yang meluncur & memukul
                                   sasaran satu per satu (jarak jauh).
     Pose melayang (idle/move) dipilih otomatis oleh Mob_Reaper.animate dari
     kecepatan mob, jadi tidak perlu diatur di sini.

     Reaper MELAYANG: ia mendekat sampai jarak dekat lalu menebas, dan memakai
     `skill` sebagai serangan jarak jauh — inilah satu-satunya cara ia menyerang
     dari jauh, sehingga pemain tetap punya kesempatan mengambil jarak.
     SASARAN memakai sistem threat (aimTarget) seperti mob lain.
     ========================================================================= */
  pickReaperAct(d){
    const r=Math.random();
    /* jauh: hanya arwah yang bisa menjangkau */
    if(d>6.5)return 'skill';
    /* menengah: hempasan maut atau arwah */
    if(d>3.2)return r<0.45?'a3':(r<0.75?'skill':'a1');
    /* dekat: dua tebasan sabit condong dominan, sesekali hempasan */
    if(r<0.36)return 'a1';
    if(r<0.68)return 'a2';
    if(r<0.88)return 'a3';
    return 'skill';
  },
  aiReaper(m,dt,dp,angP){
    this.pickFoe(m,dt);
    const tgt=this.aimTarget(m);
    const tpos=tgt?tgt.pos:Player.pos;
    const dT=tgt?Math.hypot(tpos.x-m.pos.x,tpos.z-m.pos.z):999;
    const angT=Math.atan2(tpos.x-m.pos.x,tpos.z-m.pos.z);

    /* aksi sedang berjalan? jalankan timeline-nya */
    if(m.rAct){this.reaperAct(m,dt,dT,angT,tgt);return;}

    const MB=CFG.MOB;
    const sight=Math.min(this.TYPES.reaper.aggro,MB.SIGHT);
    m.seeT=Math.max(0,(m.seeT||0)-dt);
    m.alert=Math.max(0,(m.alert||0)-dt);
    if(tgt&&dT<sight)m.seeT=MB.MEM;
    const active=!!tgt&&(m.seeT>0||m.alert>0);
    m.state=active?'chase':'wander';

    if(active){
      if(dT>0.45)m.mesh.rotation.y=angLerp(m.mesh.rotation.y,angT,dt*6);
      /* meluncur mendekat; berhenti mendorong bila sudah cukup dekat supaya
         tidak menempel menembus badan sasaran */
      let sp=m.speed*(m.inWater?0.6:1)*(m.slowMul||1);
      if(dT>1.8){
        m.vel.x=lerp(m.vel.x,Math.sin(angT)*sp,clamp(4*dt,0,1));
        m.vel.z=lerp(m.vel.z,Math.cos(angT)*sp,clamp(4*dt,0,1));
      }else{
        const damp=Math.exp(-8*dt);
        m.vel.x*=damp;m.vel.z*=damp;
      }
      if(m.atkCd<=0)this.startReaperAct(m,this.pickReaperAct(dT),tgt);
    }else{
      m.t-=dt;
      if(m.t<=0){m.t=rand(1.6,3.8);m.dir=Math.random()*Math.PI*2;m.walking=Math.random()<0.65;}
      if(m.walking){
        m.mesh.rotation.y=angLerp(m.mesh.rotation.y,m.dir,dt*3);
        const sp=m.speed*0.42;
        m.vel.x=lerp(m.vel.x,Math.sin(m.dir)*sp,clamp(4*dt,0,1));
        m.vel.z=lerp(m.vel.z,Math.cos(m.dir)*sp,clamp(4*dt,0,1));
      }else{m.vel.x*=0.88;m.vel.z*=0.88;}
    }
  },
  startReaperAct(m,name,target){
    const R=(typeof Mob_Reaper!=='undefined')?Mob_Reaper:null;
    m.rAct=name;m.rActT=0;
    m.rActDur=(R&&R.DUR[name])||0.9;
    m.rTarget=(target&&target!==Player)?target:null;
    m._rF1=false;m._rF2=false;m._rS=0;
    /* arah dikunci saat aksi dimulai supaya serangan masih bisa dihindari */
    m._rYaw=m.mesh.rotation.y;
    if(typeof Sfx!=='undefined'&&Sfx.at)
      Sfx.at(m.pos,name==='skill'?'growl':'swing',0.55);
  },
  /* jalankan timeline aksi reaper. `dp`/`angP` = jarak & arah ke sasaran. */
  reaperAct(m,dt,dp,angP,tgtIn){
    const R=(typeof Mob_Reaper!=='undefined')?Mob_Reaper:null;
    m.rActT+=dt;
    const tA=m.rActT,name=m.rAct;
    const tgt=(m.rTarget&&!m.rTarget.dead)?m.rTarget:(tgtIn||this.aimTarget(m));
    const HIT=(R&&R.HIT)||{a1:0.29,a2:0.25,a3a:0.31,a3b:0.59,s0:0.54,s1:0.71,s2:0.88};

    if(name==='a1'){
      /* SABIT HORIZONTAL: tebasan mendatar lebar */
      m.vel.x*=0.84;m.vel.z*=0.84;
      if(tA<HIT.a1)m.mesh.rotation.y=angLerp(m.mesh.rotation.y,angP,dt*9);
      if(!m._rF1&&tA>=HIT.a1){
        m._rF1=true;
        const yaw=m.mesh.rotation.y;
        const hx=m.pos.x+Math.sin(yaw)*2.0,hz=m.pos.z+Math.cos(yaw)*2.0;
        if(R)R.slashFX(m,hx,m.pos.y+1.7,hz,yaw,'h',1.35);
        m._rFlare=0.75;
        if(typeof Sfx!=='undefined')Sfx.at?Sfx.at(m.pos,'swing',1):Sfx.hit();
        this.hitTarget(m,tgt,Math.round(m.dmg*1.1),2.9,hx,hz,6);
      }
    }

    else if(name==='a2'){
      /* TEBASAN BALIK: arah ayunan berlawanan, sedikit lebih cepat & dekat */
      m.vel.x*=0.84;m.vel.z*=0.84;
      if(tA<HIT.a2)m.mesh.rotation.y=angLerp(m.mesh.rotation.y,angP,dt*10);
      if(!m._rF1&&tA>=HIT.a2){
        m._rF1=true;
        const yaw=m.mesh.rotation.y;
        const hx=m.pos.x+Math.sin(yaw)*1.8,hz=m.pos.z+Math.cos(yaw)*1.8;
        if(R)R.slashFX(m,hx,m.pos.y+1.6,hz,yaw,'d',1.3);
        m._rFlare=0.75;
        if(typeof Sfx!=='undefined')Sfx.at?Sfx.at(m.pos,'swing',1):Sfx.hit();
        this.hitTarget(m,tgt,m.dmg,2.6,hx,hz,5);
      }
    }

    else if(name==='a3'){
      /* HUKUMAN MAUT: getaran tanah saat sabit terangkat, lalu hempasan AoE */
      m.vel.x*=0.8;m.vel.z*=0.8;
      if(tA<HIT.a3b)m.mesh.rotation.y=angLerp(m.mesh.rotation.y,angP,dt*6);
      if(!m._rF1&&tA>=HIT.a3a){
        m._rF1=true;
        if(R)R.shockFX(m,m.pos.x,m.pos.z,2.4);
        if(typeof FX!=='undefined')FX.addShake(0.22);
      }
      if(!m._rF2&&tA>=HIT.a3b){
        m._rF2=true;
        const yaw=m.mesh.rotation.y;
        const hx=m.pos.x+Math.sin(yaw)*1.9,hz=m.pos.z+Math.cos(yaw)*1.9;
        if(R){
          R.slashFX(m,hx,m.pos.y+1.5,hz,yaw,'v',1.55);
          R.shockFX(m,m.pos.x,m.pos.z,4.8);
        }
        m._rFlare=0.9;
        if(typeof FX!=='undefined')FX.addShake(0.6);
        if(typeof Sfx!=='undefined')Sfx.at?Sfx.at(m.pos,'smash',0.7):Sfx.smash();
        this.hitTarget(m,tgt,Math.round(m.dmg*1.6),3.4,hx,hz,9);
      }
    }

    else{
      /* 3 ARWAH MENYERANG: tiga arwah dilepas berurutan dari dada.
         Reaper berhenti bergerak selama memanggil (jadi ada jeda untuk
         mendekat & memukulnya), damage-nya dikerjakan Mob_Reaper.updateSpirits. */
      m.vel.x*=0.9;m.vel.z*=0.9;
      if(tA<HIT.s0)m.mesh.rotation.y=angLerp(m.mesh.rotation.y,angP,dt*5);
      const times=[HIT.s0,HIT.s1,HIT.s2];
      while(m._rS<3&&tA>=times[m._rS]){
        if(R&&R.spawnSpirit)R.spawnSpirit(m,m._rS,tgt);
        if(m._rS===0){
          if(R)R.shockFX(m,m.pos.x,m.pos.z,5.2);
          m._rFlare=0.9;
        }
        m._rS++;
      }
    }

    if(m.rActT>=m.rActDur){
      m.rAct=null;m.rTarget=null;
      /* jeda lebih panjang setelah skill supaya arwah tidak terus-menerus */
      m.atkCd=(name==='skill')?rand(4.5,7.0):rand(1.4,2.6);
    }
  },

  /* =========================================================================
     AI SEMUT RAKSASA — 2 serangan (port dari Semut.html)
     -------------------------------------------------------------------------
     'bite' (Serangan Gigit)      : menerjang pendek lalu menggigit dengan rahang.
     'dash' (Serangan Maju Cepat) : melesat lurus, menabrak siapa pun di jalurnya.
     Keduanya DIUNDI dengan jarak sebagai pemiring peluang (pola sama seperti
     kumbang): menempel → hampir selalu gigit, jauh → hampir selalu terjang.
     ========================================================================= */
  pickSemutAtk(d){
    /* peluang gigit: 90% saat menempel, turun ke 10% di jarak 9+ */
    let pBite;
    if(d<1.8)pBite=0.90;
    else if(d>9)pBite=0.10;
    else pBite=lerp(0.90,0.10,(d-1.8)/7.2);
    if(d>12)pBite=0;          // terlalu jauh untuk menggigit → terjang
    if(d<1.2)pBite=1;         // sudah menempel → terjang tak berguna
    return Math.random()<pBite?'bite':'dash';
  },
  aiSemut(m,dt,dp,angP){
    this.pickFoe(m,dt);
    const tgt=this.aimTarget(m);
    const tpos=tgt?tgt.pos:Player.pos;
    const dT=tgt?Math.hypot(tpos.x-m.pos.x,tpos.z-m.pos.z):999;
    const angT=Math.atan2(tpos.x-m.pos.x,tpos.z-m.pos.z);

    if(m.aAct){this.semutAtk(m,dt,dT,angT,tgt);return;}

    const MB=CFG.MOB;
    const sight=Math.min(this.TYPES.semut.aggro,MB.SIGHT);
    m.seeT=Math.max(0,(m.seeT||0)-dt);
    m.alert=Math.max(0,(m.alert||0)-dt);
    if(tgt&&dT<sight)m.seeT=MB.MEM;
    const active=!!tgt&&(m.seeT>0||m.alert>0);
    m.state=active?'chase':'wander';

    if(active){
      if(dT>0.45)m.mesh.rotation.y=angLerp(m.mesh.rotation.y,angT,dt*7);
      const sp=m.speed*(m.inWater?0.5:1)*(m.slowMul||1);
      /* JANGKAUAN GIGIT SEMUT: jika sudah dekat sasaran, diam dan gigit */
      if(dT>1.5){
        m.vel.x=lerp(m.vel.x,Math.sin(angT)*sp,clamp(7*dt,0,1));
        m.vel.z=lerp(m.vel.z,Math.cos(angT)*sp,clamp(7*dt,0,1));
      }else{
        const damp=Math.exp(-8*dt);
        m.vel.x*=damp;m.vel.z*=damp;
      }
      if(m.atkCd<=0)this.startSemutAtk(m,this.pickSemutAtk(dT),tgt);
    }else{
      m.t-=dt;
      if(m.t<=0){m.t=rand(1.2,3.2);m.dir=Math.random()*Math.PI*2;m.walking=Math.random()<0.7;}
      if(m.walking){
        m.mesh.rotation.y=angLerp(m.mesh.rotation.y,m.dir,dt*3);
        const sp=m.speed*0.35;
        m.vel.x=lerp(m.vel.x,Math.sin(m.dir)*sp,clamp(4*dt,0,1));
        m.vel.z=lerp(m.vel.z,Math.cos(m.dir)*sp,clamp(4*dt,0,1));
      }else{m.vel.x*=0.85;m.vel.z*=0.85;}
    }
  },
  startSemutAtk(m,name,target){
    const A=(typeof Mob_Semut!=='undefined')?Mob_Semut:null;
    m.aAct=name;m.aActT=0;
    m.aActDur=(A&&A.DUR[name])||0.9;
    m.aTarget=(target&&target!==Player)?target:null;
    m._aHit=false;
    /* dash: arah belum dikunci di sini. Ancang-ancang (fase awal semutAtk)
       yang membidik ke sasaran dulu, baru dikunci — supaya terjangan mengarah
       ke target, bukan ke arah hadap mentah saat jurus dimulai. */
    if(name==='dash')m._aYaw=undefined;
  },
  semutAtk(m,dt,dp,angP,tgtIn){
    const A=(typeof Mob_Semut!=='undefined')?Mob_Semut:null;
    m.aActT+=dt;
    const tA=m.aActT;
    const tgt=(m.aTarget&&!m.aTarget.dead)?m.aTarget:
              (tgtIn||(m.pet?null:this.aimTarget(m)));

    if(m.aAct==='bite'){
      /* GIGIT: terjangan pendek (lunge) di fase sentak, damage saat rahang
         menutup. Kecepatan maju kecil supaya tidak menembus sasaran. */
      const W=(A?A.BITE_W:0.16),S=(A?A.BITE_S:0.15);
      if(tA<W){
        if(dp>0.45)m.mesh.rotation.y=angLerp(m.mesh.rotation.y,angP,dt*10);
        m.vel.x*=0.8;m.vel.z*=0.8;
      }else if(tA<W+S){
        const yaw=m.mesh.rotation.y;
        m.vel.x=lerp(m.vel.x,Math.sin(yaw)*7.5,clamp(12*dt,0,1));
        m.vel.z=lerp(m.vel.z,Math.cos(yaw)*7.5,clamp(12*dt,0,1));
      }else{m.vel.x*=0.86;m.vel.z*=0.86;}
      if(!m._aHit&&tA>=(A?A.HIT.bite:0.253)){
        m._aHit=true;
        if(A)A.biteFX(m);
        const yaw=m.mesh.rotation.y;
        const hx=m.pos.x+Math.sin(yaw)*1.1,hz=m.pos.z+Math.cos(yaw)*1.1;
        this.hitTarget(m,tgt,m.dmg,1.9,hx,hz,5);
      }
    }else{
      /* MAJU CEPAT: ancang-ancang MENGUNCI arah ke sasaran, lalu MELESAT ke
         arah itu. Dulu arah dikunci saat jurus dimulai (arah hadap mentah),
         jadi terjangan sering meleset kalau sasaran tidak tepat di depan.
         Sekarang selama fase ancang-ancang (tA<0.15) arah bidik = arah ke
         sasaran SAAT INI (angP) dan itulah yang dikunci ke _aYaw — jadi
         terjangan selalu menuju sasaran walau ia berada di belakang (U-turn
         180° pun tepat). Badan diputar cepat ke arah itu untuk visual.
         Damage sekali per terjangan (seperti serbuan kelabang) + garis kecepatan. */
      let v=0;
      if(tA<0.15){
        /* kunci arah ke sasaran; mesh berputar cepat mengikutinya */
        m._aYaw=angP;
        m.mesh.rotation.y=angLerp(m.mesh.rotation.y,angP,clamp(dt*20,0,1));
        v=lerp(0,4,tA/0.15);
      }else{
        if(tA<0.95)v=13;
        else v=lerp(13,0,clamp((tA-0.95)/0.4,0,1));
      }
      const yaw=(m._aYaw!==undefined)?m._aYaw:m.mesh.rotation.y;
      /* saat melesat, mesh menghadap tepat arah terjangan */
      if(tA>=0.15)m.mesh.rotation.y=yaw;
      m.vel.x=Math.sin(yaw)*v;m.vel.z=Math.cos(yaw)*v;
      if(v>5&&A&&Math.random()<dt*22)A.dashFX(m);
      if(v>5&&!m._aHit&&dp<2.0){
        if(this.hitTarget(m,tgt,Math.round(m.dmg*1.25),2.0,m.pos.x,m.pos.z,8)){
          m._aHit=true;
          if(typeof FX!=='undefined')FX.addShake(0.3);
          if(A)A.biteFX(m);
        }
      }
    }

    if(m.aActT>=m.aActDur){
      m.aAct=null;m.aTarget=null;
      m.atkCd=rand(1.2,2.4);
    }
  },

  /* =========================================================================
     SERANGAN MOB SEDERHANA — SATU JALUR UNTUK SEMUA SASARAN
     -------------------------------------------------------------------------
     Dipakai oleh ai() (lawan pemain), aiVsNpc() (lawan rekan NPC/pet), dan
     petAttack() (pet melawan monster liar). Seluruh jurus khas tiap mob —
     gigitan serigala, sengat kalajengking, hantaman golem, semburan api naga,
     sapuan ekor & semburan asam lizard — dijalankan di sini, jadi mob memakai
     kemampuan yang sama siapa pun lawannya.

     `tgt` = sasaran, `d` = jarak, `ang` = arah ke sasaran.
     Mengembalikan true bila sebuah serangan dimulai pada frame ini.
     ========================================================================= */
  mobAttack(m,tgt,d,ang){
    if(!tgt||tgt.dead||m.atkCd>0)return false;
    /* mob pasif (sapi, kuda, kelinci, ruas kelabang) berdamage 0 — mereka tidak
       menyerang apa pun, termasuk saat dijadikan pet */
    if(!(m.dmg>0))return false;
    const isPlayer=(typeof Player!=='undefined'&&tgt===Player);
    /* damage langsung + efek partikel di badan sasaran.
       kb dibiarkan 0 untuk pukulan melee biasa supaya rasa bertarung melawan
       pemain tetap sama seperti sebelumnya (dulu tanpa dorongan); sasaran
       monster tetap terdorong lewat nilai bawaan di hitTarget. */
    const strike=(dmg,kb)=>this.hitTarget(m,tgt,dmg,99,m.pos.x,m.pos.z,kb||0);
    const burst=(color,n,sp)=>FX.debris(tgt.pos.clone().add(new THREE.Vector3(0,1,0)),color,n,sp);

    switch(m.type){
      case 'slime':
        if(d>=1.1)return false;
        strike(m.dmg);m.atkCd=1.0;
        return true;

      case 'boar':
        if(d>=1.5)return false;
        strike(m.dmg);m.atkCd=1.2;
        if(m.parts.head)m.parts.head.rotation.x=-0.6;
        return true;

      case 'wolf':
        /* gigitan cepat + lompatan kecil ke arah sasaran */
        if(d>=1.7)return false;
        strike(m.dmg);m.atkCd=0.85;
        m.biteT=0.22;
        if(m.onGround){m.vel.y=3.2;
          m.vel.x+=Math.sin(ang)*3;m.vel.z+=Math.cos(ang)*3;}
        return true;

      case 'scorpion':
        /* sengat beracun: damage awal + damage susulan (racun) */
        if(d>=1.9)return false;
        m.atkCd=1.6;
        m.stingT=0.3;
        /* Racun susulan (DoT) hanya berlaku ke pemain — efeknya dijalankan di
           update(). Ke sasaran lain porsi racunnya dijadikan damage langsung
           supaya jurusnya tetap sekuat versi lawan-pemain. */
        if(isPlayer){
          strike(m.dmg);
          m.poisonHit=2;m.poisonT=1.0;
        }else{
          strike(Math.round(m.dmg*1.3));
        }
        burst(0x9ad84f,6,2);
        return true;

      case 'golem':
        /* HANTAMAN: telegraph 0.8s lalu doSmash() melepas AoE di titik bidik */
        if(d>=3.4)return false;
        m.windup=0.8;m.atkCd=4;
        m.smashTarget=tgt.pos.clone();
        FX.ring(m.smashTarget.x,m.smashTarget.y+0.05,m.smashTarget.z,0xff5544,0.8,3.4);
        return true;

      case 'dragon':
        /* dua serangan: cakar (dekat) & SEMBURAN API sambil terbang (30%) */
        if(d>=4.0)return false;
        if(!m.flyT&&Math.random()<0.3){
          m.flyT=3.9;m.atkCd=5.0;m.fireCd=0;
        }else{
          strike(m.dmg);m.atkCd=2.0;
          m.clawT=0.95;
          burst(0xC8352A,6,2.4);
          Sfx.at(m.pos,'hurt');
        }
        return true;

      case 'lizard':
        /* tiga serangan: gigit (dekat), sapuan ekor (AoE), semburan asam (jauh) */
        if(d<1.8){
          strike(m.dmg);m.atkCd=1.15;
          m.biteT=0.62;
          burst(0x4e8f3a,5,2.0);
          Sfx.at(m.pos,'hurt');
          return true;
        }
        if(d<3.4&&Math.random()<0.45){
          m.tailT=1.2;m.atkCd=2.3;m._tailHit=false;
          return true;
        }
        if(d<9.5){
          /* titik bidik semburan disimpan supaya proyektilnya mengarah ke
             sasaran ini, bukan selalu ke pemain */
          m.acidT=1.05;m.atkCd=2.6;m._acidFired=false;m.acidTarget=tgt;
          return true;
        }
        return false;
    }
    /* mob tanpa jurus khusus: pukulan biasa saat menempel */
    if(d<1.7){strike(m.dmg);m.atkCd=1.2;return true;}
    return false;
  },

  /* ---------- monster mengejar & menyerang NPC / pet ----------
     Gerak & pemilihan jurusnya identik dengan jalur pemain: mobAttack() yang
     sama dipakai, sehingga naga tetap menyemburkan api, golem tetap menghantam
     tanah, dan lizard tetap menyapu ekor & menyemburkan asam saat lawannya
     rekan NPC atau pet — dulu semuanya hanya jadi pukulan polos. */
  aiVsNpc(m,dt){
    const f=m.foe;
    /* BACKSTAB LEAP goblin: lawan yang sedang menunggangi punggung monster
       ini tidak bisa dipukul — monster tak bisa menggigit punggungnya
       sendiri. Ia hanya bisa bergetar di tempat sambil dirugikan. */
    if(f.gobRide===m){m.vel.x*=0.7;m.vel.z*=0.7;return;}
    const to=new THREE.Vector3().subVectors(f.pos,m.pos).setY(0);
    const ang=Math.atan2(to.x,to.z),d=to.length();
    m.state='chase';
    if(d>0.45)m.mesh.rotation.y=angLerp(m.mesh.rotation.y,ang,dt*6);
    let sp=m.speed*(m.inWater?0.5:1)*(m.slowMul||1);
    /* naga juga berlari saat mengejar NPC yang masih jauh */
    if(m.type==='dragon'&&d>5.0)sp*=2.3;
    /* jarak berhenti mengikuti jangkauan jurus tiap mob */
    const hold=m.type==='golem'?3.0:m.type==='dragon'?3.4:
               m.type==='lizard'?2.4:1.6;
    if(d>hold*0.85){
      m.vel.x=lerp(m.vel.x,Math.sin(ang)*sp,clamp(6*dt,0,1));
      m.vel.z=lerp(m.vel.z,Math.cos(ang)*sp,clamp(6*dt,0,1));
      if(m.type==='slime')this.slimeHop(m,dt,ang,sp*2.1,0.75,1.25);
    }else{
      const damp=Math.exp(-8*dt);
      m.vel.x*=damp;m.vel.z*=damp;
    }
    this.mobAttack(m,f,d,ang);
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
        /* Dungeon Master tidak boleh tersorong dari lapaknya */
        if(n.shopSpot){
          pushPair(n.pos.x,n.pos.z,0.42,null);continue;
        }
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
    if(d>0.45)m.mesh.rotation.y=angLerp(m.mesh.rotation.y,ang,dt*6);
    const sp=m.speed*(m.inWater?0.5:1)*(m.slowMul||1);
    if(d>1.5){
      m.vel.x=lerp(m.vel.x,Math.sin(ang)*sp,clamp(6*dt,0,1));
      m.vel.z=lerp(m.vel.z,Math.cos(ang)*sp,clamp(6*dt,0,1));
    }else{
      const damp=Math.exp(-8*dt);
      m.vel.x*=damp;m.vel.z*=damp;
    }
    const reach=m.type==='dragon'?3.6:m.type==='lizard'?1.8:1.7;
    if(m.atkCd<=0&&d<reach){
      m.atkCd=m.type==='wolf'?0.9:1.3;
      const dir=d>0.001?to.clone().divideScalar(d):new THREE.Vector3(0,0,1);
      this.hurt(prey,m.dmg,dir,1.4,m);
      FX.debris(prey.pos.clone().add(new THREE.Vector3(0,1,0)),0xc94f43,5,2);
    }
  },

  /* ---------- TELEGRAPH HANTAMAN GOLEM ----------
     Dipisah dari ai() supaya jalur mob liar DAN jalur pet memakai kode yang
     sama: lengan terangkat 0.8 detik sambil menghadap titik hantaman, lalu
     doSmash() melepas AoE-nya. */
  windupTick(m,dt,fallbackAng){
    m.windup-=dt;
    const p=1-m.windup/0.8;
    if(m.parts.armL)m.parts.armL.rotation.x=lerp(0,-2.6,Math.min(1,p*1.6));
    if(m.parts.armR)m.parts.armR.rotation.x=lerp(0,-2.6,Math.min(1,p*1.6));
    const sT=m.smashTarget;
    const aim=sT?Math.atan2(sT.x-m.pos.x,sT.z-m.pos.z):
      (fallbackAng!==undefined?fallbackAng:m.mesh.rotation.y);
    m.mesh.rotation.y=angLerp(m.mesh.rotation.y,aim,dt*5);
    m.vel.x*=0.82;m.vel.z*=0.82;
    if(m.windup<=0)this.doSmash(m);
  },

  doSmash(m){
    const c=m.smashTarget||m.pos;
    Sfx.smash();FX.addShake(0.75);
    /* efek hantaman persis fxSlam golem.html: dua ring + crescent slash
       merah menyapu tanah + serpihan batu */
    FX.ring(c.x,c.y+0.05,c.z,0xff5a35,0.55,5.5);
    FX.ring(c.x,c.y+0.05,c.z,0xdddddd,0.4,3.5);
    /* gelombang tanah menjalar dari titik hantaman, lalu tanah hancur */
    if(typeof FX.groundWave==='function')FX.groundWave(c.x,c.y,c.z,{mode:'radial',radius:3.4,color:0xff5a35});
    if(typeof PortFX!=='undefined')
      PortFX.crescent(c.x,c.y+1.1,c.z,m.mesh.rotation.y,-1.35,0,2.4,1.9,0.3,0xff5a2a);
    FX.debris(new THREE.Vector3(c.x,c.y+0.4,c.z),0x8a8a8a,22,4);
    /* HANCURKAN TANAH: hanya golem liar. Golem pet tidak boleh merusak dunia
       milik pemain saat bertarung dengan monster. */
    if(!m.pet)World.destroyArea(c.x,c.z,2.4);
    /* AoE ke SEMUA korban sah di radius (pemain, rekan NPC, pet — atau monster
       liar bila si golem adalah pet). Dulu hanya pemain yang bisa terkena,
       sehingga hantaman golem tidak berarti apa-apa saat melawan NPC. */
    this.areaHit(m,c.x,c.z,3.0,m.dmg,9);
    if(m.parts.armL)m.parts.armL.rotation.x=0.7;
    if(m.parts.armR)m.parts.armR.rotation.x=0.7;
  },


  /* ATTACK PET MONSTER: reproduksi ai() tapi target monster, bukan Player
      Pet menggunakan SEMUA skill monster liar (naga api, golem smash, lizard acid/tail,
      scorpion poison, wolf jump, boar headbutt, dll.). Target adalah "target"
      (monster non-pet), atau nearest hostile monster bila null.
      
      Bila m.pet=true, efek area damage / terrain destruction langsung ditargetkan
      ke monster lain dan tidak mengancurkan world map / Player.
   ----------- */
  petAttack(m,target,dp,dt){
    const T=this.TYPES[m.type];
    let d=target?target.pos.distanceTo(m.pos):dp;
    
    if(!target&&this.list.length){
      // cari musuh pet: monster non-pet yang non-animal, kecuali dirinya sendiri
      let best=null,bd=20;
      for(const o of this.list){
        if(o===m||o.dead||o.pet||typeof this.isAnimal==='function'&&this.isAnimal(o))continue;
        const dist=o.pos.distanceTo(m.pos);
        if(dist<bd){best=o;bd=dist;}
      }
      if(best){target=best;d=bd;}else return false;
    }
    if(!target||target.dead)return false;
    
    if(m.atkCd<=0){
      /* ---------- KUMBANG PET: memakai KEDUA jurus aslinya ----------
         Sama seperti kumbang liar: dekat → Seruduk Tanduk, jauh → Angkat &
         Lempar Batu. Timeline-nya dijalankan kumbangAtk() (dipanggil dari
         Capture.petAI) dengan m.kumTarget = monster musuh, sehingga damage
         & arah lemparannya mengarah ke sana, bukan ke pemain. */
      if(m.type==='kumbang'){
        if(!m.kumAtk)this.startKumbangAtk(m,this.pickKumbangAtk(d),target);
      }
      /* ---------- YETI PET: keempat aksinya dipakai ----------
         Timeline dijalankan yetiAct() (dipanggil dari Capture.petAI) dengan
         m.yTarget = monster musuh, jadi hantaman & AoE-nya mengarah ke sana. */
      else if(m.type==='yeti'){
        if(!m.yAct)this.startYetiAct(m,this.pickYetiAct(d),target);
      }
      /* ---------- SEMUT PET: gigit & terjang cepat ---------- */
      else if(m.type==='semut'){
        if(!m.aAct)this.startSemutAtk(m,this.pickSemutAtk(d),target);
      }
      /* ---------- REAPER PET: keempat aksinya dipakai ----------
         Timeline dijalankan reaperAct() (dipanggil dari Capture.petAI) dengan
         m.rTarget = monster musuh, sehingga tebasan, hempasan, dan ketiga arwah
         mengarah ke sana — bukan ke pemain. */
      else if(m.type==='reaper'){
        if(!m.rAct)this.startReaperAct(m,this.pickReaperAct(d),target);
      }
      /* ---------- MOB LAIN: jurus yang sama dengan versi liarnya ----------
         Satu jalur mobAttack() dipakai bersama ai()/aiVsNpc(), jadi naga pet
         tetap menyemburkan api, golem pet tetap menghantam tanah, dan lizard
         pet tetap menyapu ekor & menyemburkan asam — mengarah ke monster
         musuh, bukan ke pemain. */
      else{
        const ang=Math.atan2(target.pos.x-m.pos.x,target.pos.z-m.pos.z);
        this.mobAttack(m,target,d,ang);
      }
    }
    return true;
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

  /* ---------- NAIK SATU BLOK (mob) ----------
     Dipisah menjadi fungsi sendiri supaya bisa dipanggil SEBELUM logika
     hindar-rintangan. Urutan itu penting: canStand() menolak langkah ke pijakan
     yang lebih tinggi, jadi penghindar akan memutar kecepatan ke samping —
     kalau cek lompat dijalankan sesudahnya, arah yang diperiksa sudah bukan
     arah pijakan lagi dan mob selamanya menyusuri tepi tanpa pernah naik.

     Di AIR lompatan tetap diizinkan (onGround selalu false saat mengapung),
     dengan dorongan mendatar yang lebih besar supaya mob benar-benar terlempar
     ke atas pijakan — kecepatan naik di air dibatasi clamp ±3.5 sehingga
     dorongan vertikal saja tidak cukup. */
  tryStepUp(m,dt){
    if((m._stepCd||0)>0)return false;
    if(!m.onGround&&!m.inWater)return false;
    const spd=Math.hypot(m.vel.x,m.vel.z);
    if(spd<0.5)return false;
    const want=Math.atan2(m.vel.x,m.vel.z);
    const tx=m.pos.x+Math.sin(want)*0.8,tz=m.pos.z+Math.cos(want)*0.8;
    const step=World.groundAt(tx,tz,m.pos.y+1.8);
    if(step<=m.pos.y+0.12||step>m.pos.y+1.3)return false;
    if(World.blockedAt(tx,step+0.05,tz,m.r||0.4))return false;
    m.vel.y=m.inWater?5.4:6.2;
    /* dorongan mendatar: di air lebih kuat karena gerak vertikal dibatasi */
    const push=m.inWater?4.2:2.4;
    m.vel.x+=Math.sin(want)*push;
    m.vel.z+=Math.cos(want)*push;
    m._stepCd=0.35;
    return true;
  },

  physics(m,dt){
    m._stepCd=Math.max(0,(m._stepCd||0)-dt);
    m.inWater=World.inWaterAt(m.pos.x,m.pos.y+0.3,m.pos.z);
    m.vel.y-=CFG.GRAV*(m.inWater?0.3:1)*dt;
    if(m.inWater){
      if(m.pos.y<CFG.WATER_Y-0.5)m.vel.y+=18*dt;
      m.vel.y=clamp(m.vel.y,-3,3.5);
    }
    /* NAIK SATU BLOK — dicoba LEBIH DULU daripada penghindar rintangan (lihat
       catatan di tryStepUp). Bila berhasil, penghindaran dilewati frame ini
       supaya arah lompatan tidak dibelokkan. */
    const stepped=this.tryStepUp(m,dt);
    /* ---------- hindari rintangan sebelum menabrak ----------
       Diperiksa saat monster benar-benar bergerak. Bila jalur di depan
       tertutup, kecepatan diputar ke arah bebas terdekat sehingga monster
       menyusuri tembok/pohon, bukan menempel lalu bergetar di sana. */
    const spd=Math.hypot(m.vel.x,m.vel.z);
    if(!stepped&&spd>0.25){
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
    /* CATATAN: cek "naik satu blok" sudah dijalankan di AWAL physics() lewat
       tryStepUp(), sebelum penghindar rintangan membelokkan arah gerak. */
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
    type==='kelabang'?3.9:type==='kelabang_part'?1.4:
    type==='kumbang'?1.8:
    type==='yeti'?2.6:type==='semut'?1.5:
    type==='reaper'?2.9:
    type==='wolf'?1.35:type==='scorpion'?0.85:type==='rabbit'?0.7:0.9;
}
