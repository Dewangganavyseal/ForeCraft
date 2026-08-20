'use strict';
/* ================= util global ================= */
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const rand=(a,b)=>a+Math.random()*(b-a);
function angLerp(a,b,t){let d=(b-a)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;return a+d*t;}

/* ================= konstanta dunia ================= */
const CFG={
  /* WORLD_H harus menampung bangunan tertinggi (menara: lantai 4 + dinding 10
     + tembok atap) DAN pohon (terrain 5 + batang 6 + kanopi). Dengan nilai
     lama (10) atap barn/loft/menara serta puncak gable terpotong di batas
     dunia sehingga rumah tampak bolong dari dalam. */
  CHUNK:16, WORLD_H:24,

  /* SEA=5: permukaan air di y=5. Sungai/danau digali ke y=1 (dalam 4 blok) atau
     y=2 (dalam 3 blok) — y=0 selalu bedrock. Daratan SELALU >= SEA (5..7)
     sehingga tidak ada lagi genangan tipis 1-2 blok. */
  SEA:5,                      // air mengisi kolom dgn tinggi < 5
  WATER_Y:4.82,               // tinggi permukaan air
  VIEW_R:4,                   // radius chunk
  DAY_LEN:480,                // detik per hari penuh
  GRAV:26,
  PLAYER:{speed:4.7,sprint:7.4,jump:8.8,radius:0.35},
  CANOPY_FADE:0.15,           // opacity daun saat pemain di bawah kanopi (area trigger per pohon)
  ROOF_FADE:0.0,              // atap FULL transparan saat pemain di dalam rumah (area trigger per rumah)
  /* ---------- oklusi pemain (NONAKTIF) ----------
     Dulu blok apa pun yang menghalangi kamera dibuat memudar. Kini oklusi umum
     dimatikan — hanya atap rumah & daun pohon yang transparan, lewat area
     trigger per rumah / per pohon (lihat World.updateRoof & updateCanopy).
     Nilai di bawah dibiarkan untuk kompatibilitas, tidak lagi memengaruhi. */
  OCCLUDE_FADE:0.10,
  OCCLUDE_R:1.6,
  OCCLUDE_MAX:48,

  /* ---------- penglihatan monster ----------
     Monster hanya mengejar bila pemain berada di dalam kerucut pandangnya
     DAN cukup dekat. Di luar itu monster tetap berkeliaran tenang. */
  MOB:{
    SIGHT:9.5,                // jarak maksimum pemain bisa terlihat
    FOV:Math.PI*0.42,         // setengah sudut kerucut pandang (~75°)
    NEAR:2.4,                 // sedekat ini monster sadar walau membelakangi
    LOSE:13,                  // jarak pemain dianggap lolos dari kejaran
    MEM:2.5,                  // detik monster tetap mengejar setelah kehilangan jejak
  },
  /* ---------- NPC penjaga desa & rekan tim ---------- */
  NPC:{
    MAX:12,                   // jumlah NPC hidup maksimum (dulu 6 → desa terasa kosong)
    PER_VILLAGE:6,            // kuota NPC per desa (dulu 3)
    SIGHT:11,                 // jarak NPC mendeteksi monster
    HOME_R:14,                // radius NPC berpatroli dari rumahnya
    HP:120, DMG:11, SPEED:3.2, ATK_CD:1.1, REACH:1.9,
    /* --- perekrutan & mode rekan --- */
    TEAM_MAX:3,               // rekan aktif maksimum
    TALK_R:3.2,               // jarak pemain bisa mengajak bicara / merekrut
    FOLLOW_R:3.6,             // rekan berhenti mendekat pada jarak ini
    TELEPORT_R:34,            // rekan yang tertinggal jauh dipanggil ulang
    GATHER_R:18,              // radius maksimum rekan mencari resource
    BAG:8,                    // slot tas rekan
    MINE_TIME:1.5,            // detik per blok saat rekan menambang
    XP_PER_KILL:14,           // XP rekan tiap monster tumbang
    /* --- mundur & memulihkan diri ---
       Rekan/penjaga yang HP-nya kritis akan kabur dari monster dan menepi
       untuk memulihkan diri. Ia baru mau ikut bertarung lagi setelah HP
       mencapai REJOIN_HP (50%), bukan langsung setelah lepas dari kejaran. */
    RETREAT_HP:0.25,          // fraksi HP pemicu mundur
    REJOIN_HP:0.50,           // fraksi HP minimum untuk kembali bertarung
    RETREAT_REGEN:5.0,        // HP per detik saat menepi memulihkan diri
    RETREAT_SPEED:1.35,       // pengali kecepatan saat kabur
    RETREAT_SAFE:12,          // jarak dari monster terdekat yang dianggap aman
    /* --- Manusia Singa (ksatria voxel) ---
       Modelnya dibangun kotak-per-kotak (BoxGeometry) dengan hierarki Group
       yang sama seperti NPC desa lain, jadi animasi generik langsung jalan.
       LION_SCALE  = sudah tidak dipakai (dipertahankan untuk kompatibilitas).
       LION_DETAIL = detail dekoratif kecil (cakar, telinga dalam, ornamen
                     helm); dimatikan otomatis di perangkat mobile supaya
                     tetap ringan */
    LION_SCALE:0.05,
    LION_DETAIL:true,
  },
  /* ---------- NPC LANGKA PENGEMBARA (js/npc_rare.js) ----------
     Penyihir Elf & Raksasa Batu tidak tinggal di desa: mereka berjalan dari
     satu desa ke desa lain sambil "mengerjakan quest" sendiri. Yang disimulasi
     hanyalah perjalanan mereka (posisi dunia), sedangkan mesh 3D baru dibuat
     saat pemain cukup dekat supaya tidak memberatkan perangkat. */
  RARE:{
    MAX:5,                    // pengembara langka aktif di dunia sekaligus (semua arketipe)
    SPAWN_CD:25,              // detik minimum antar kemunculan pengembara baru
    SPAWN_CHANCE:0.9,         // peluang tiap kali cooldown habis
    SHOW_R:56,                // jarak mesh 3D mulai ditampilkan
    HIDE_R:72,                // jarak mesh dilepas kembali (histeresis)
    ROAM_R:340,               // jarak maksimum pengembara dari pemain
    SIM_SPEED:3.4,            // blok/detik saat berjalan di luar pandangan
    REST:14,                  // detik berhenti di desa tujuan (mengambil quest)
    QUEST_TIME:45,            // detik "mengerjakan" quest antar desa
    TAVERN_STAY:90,           // detik pengembara singgah di dalam tavern
  },


  /* pertumbuhan stat per level: dipakai Player.maxHp()/maxStamina() */
  HP_PER_LVL:12, STAM_PER_LVL:6,
  BOSS_MAX:3,                 // boss aktif maksimum di dunia sekaligus
  BOSS_HP_MUL:6,              // pengali HP monster yang dipromosikan jadi boss

};

const IS_MOBILE=('ontouchstart' in window)||navigator.maxTouchPoints>0;
if(IS_MOBILE){CFG.VIEW_R=3;document.body.classList.add('touch');CFG.NPC.LION_DETAIL=false;}

/* ================= blok ================= */
const B={AIR:0,GRASS:1,DIRT:2,STONE:3,WOOD:4,LEAF:5,WATER:6,
  SAND:7,SNOW:8,ORE_IRON:9,ORE_GOLD:10,ORE_CRYSTAL:11,PLANK:12,
  /* ROOF dipisah dari WOOD agar atap rumah punya mesh & material sendiri,
     sehingga bisa dibuat transparan saat pemain masuk ke dalam bangunan. */
  ROOF:13,
  /* FARM: tanah ladang hasil cangkul; bisa ditanami */
  FARM:14};
const BLOCK_INFO={
  [B.GRASS]:{name:'Rumput',hp:2.2,drop:null,color:0x5d9e3f},
  [B.DIRT] :{name:'Tanah', hp:2.0,drop:null,color:0x7a5a3a},
  [B.STONE]:{name:'Batu',  hp:6.0,drop:'stone',color:0x8a8f98},
  [B.WOOD] :{name:'Kayu',  hp:4.0,drop:'wood',color:0x6e4f2f},
  [B.LEAF] :{name:'Daun',  hp:0.6,drop:null,color:0x3f7d2f},
  [B.SAND] :{name:'Pasir', hp:1.6,drop:'sand',color:0xdcc78d},
  [B.SNOW] :{name:'Salju', hp:1.4,drop:null,color:0xe8f2fa},
  /* bijih: makin langka makin keras ditambang */
  [B.ORE_IRON]   :{name:'Bijih Besi',   hp:9.0, drop:'iron_ore',   color:0xb08a6a},
  [B.ORE_GOLD]   :{name:'Bijih Emas',   hp:12.0,drop:'gold_ore',   color:0xd9b23a},
  [B.ORE_CRYSTAL]:{name:'Kristal Beku', hp:16.0,drop:'crystal',    color:0x7fd8ff},
  [B.PLANK]:{name:'Papan', hp:3.4,drop:'wood',color:0xb98a55},
  [B.ROOF] :{name:'Atap',  hp:3.4,drop:'wood',color:0x9c5a3c},
  [B.FARM] :{name:'Ladang',hp:2.0,drop:null,color:0x6f4a26},
};
/* blok bijih → dipakai worldgen & UI penambangan */
const ORE_BLOCKS=[B.ORE_IRON,B.ORE_GOLD,B.ORE_CRYSTAL];

/* ================= biome ================= */
/* 3 biome dipilih dari noise suhu; memengaruhi warna kabut, blok
   permukaan, kepadatan pohon, jenis bijih, dan monster yang muncul. */
const BIOME={
  FOREST:0, DESERT:1, TUNDRA:2, MOUNTAIN:3,
};
const BIOME_INFO={
  /* mobW = bobot kemunculan tiap monster di biome ini.
     Bobot serigala DITURUNKAN drastis (hutan 3.4→1.2, tundra 4.5→1.8,
     pegunungan 4.5→1.5) karena dulu serigala terlalu sering muncul dan
     mendominasi populasi. */
  [BIOME.FOREST]:{name:'Hutan Rimba',e:'🌳',surface:B.GRASS,sub:B.DIRT,
    fog:0x9fc8e8,tree:1.0,ore:B.ORE_IRON,mobs:['slime','boar','golem','wolf'],
    mobW:{slime:3.4,boar:2.8,golem:1.2,wolf:1.2}},
  [BIOME.DESERT]:{name:'Gurun Pasir',e:'🏜️',surface:B.SAND,sub:B.SAND,
    fog:0xe4d7a8,tree:0.12,ore:B.ORE_GOLD,mobs:['scorpion','boar','golem']},
  [BIOME.TUNDRA]:{name:'Tundra Salju',e:'🏔️',surface:B.SNOW,sub:B.DIRT,
    fog:0xd8e8f4,tree:0.45,ore:B.ORE_CRYSTAL,mobs:['wolf','slime','golem'],
    mobW:{wolf:1.8,slime:3.2,golem:1.6}},
  /* PEGUNUNGAN: dataran tinggi berbatu, habitat NAGA. Naga kini LANGKA
     (bobot 0.3 dari total ~9.3 ≈ 3% kemunculan) agar tidak sering muncul.
     Permukaan batu, sedikit pohon, bijih kristal. */
  [BIOME.MOUNTAIN]:{name:'Pegunungan',e:'⛰️',surface:B.STONE,sub:B.STONE,
    fog:0xc4d2e0,tree:0.15,ore:B.ORE_CRYSTAL,mobs:['dragon','wolf','golem'],
    mobW:{dragon:0.3,wolf:1.5,golem:7.5}},
};


/* ================= rarity ================= */
/* 5 tingkat kelangkaan. `mul` dipakai sebagai pengali kecil pada stat dasar
   sehingga item rarity tinggi selalu terasa lebih kuat, dan `c` dipakai untuk
   warna bilah pedang / aura item di dunia 3D. */
const RARITY={
  /* Emoji dipilih dari Unicode ≤6.0 karena WebView Android lama belum punya
     glyph kotak warna (🟩🟦🟪🟧, Emoji 12) sehingga tampil sebagai kotak kosong. */
  common   :{n:'Umum',        e:'⚪',c:0xb8c0cc,css:'#b8c0cc',mul:1.00,order:0},
  uncommon :{n:'Tidak Biasa', e:'🔹',c:0x63d471,css:'#63d471',mul:1.08,order:1},
  rare     :{n:'Langka',      e:'🔵',c:0x4da3ff,css:'#4da3ff',mul:1.16,order:2},
  epic     :{n:'Epik',        e:'💜',c:0xb46bff,css:'#b46bff',mul:1.26,order:3},
  legendary:{n:'Legendaris',  e:'⭐',c:0xffa227,css:'#ffa227',mul:1.40,order:4},
};

/* ================= efek perlengkapan =================
   Setiap equipment punya satu efek unik. Efek senjata dipicu saat memukul
   (Player.doHit), efek armor bersifat pasif (dibaca RPG.gearEffects). */
const EFFECTS={
  /* --- efek senjata (on-hit) --- */
  bleed :{n:'Luka Menganga',e:'🔻',c:0xd64550,
    desc:'25% peluang membuat target pendarahan (3× damage susulan)'},
  shock :{n:'Sengat Petir',e:'⚡',c:0xffe066,
    desc:'Petir melompat ke 2 musuh terdekat (50% damage)'},
  venomB:{n:'Bilah Racun',e:'🧪',c:0x9ad84f,
    desc:'Setiap pukulan meracuni target (damage susulan bertahap)'},
  frost :{n:'Gigitan Beku',e:'❄️',c:0x9fe8ff,
    desc:'Memperlambat target 45% selama 2.5 detik'},
  quake :{n:'Hantaman Bumi',e:'🌋',c:0xff7a3c,
    desc:'Pukulan pamungkas memicu gelombang kejut area'},
  /* efek bawaan tangan kosong: tidak ada damage susulan, tapi membuat
     musuh tersentak sesaat sehingga bertahan hidup tetap mungkin */
  crush :{n:'Kepalan Menyentak',e:'👊',c:0xffb066,
    desc:'Pukulan tangan kosong menyentak musuh (gerak melambat 0.9 detik)'},
  /* --- efek armor (pasif) --- */
  swift :{n:'Langkah Ringan',e:'💨',c:0x8fe0ff,desc:'+8% kecepatan gerak'},
  guard :{n:'Kuda-kuda Kokoh',e:'🛡',c:0xc9d2dc,desc:'-25% biaya stamina'},
  greed :{n:'Berkat Emas',e:'💰',c:0xffd24d,desc:'+25% XP dari monster'},
  regen :{n:'Nadi Kristal',e:'💚',c:0x7dffb0,desc:'Pulih 1.2 HP per detik'},
  thorns:{n:'Duri Titan',e:'🌵',c:0xff6bd6,desc:'Balas 30% damage ke penyerang'},
};

/* ================= item ================= */

const ITEMS={
  /* CATATAN EMOJI: seluruh ikon item memakai Unicode ≤6.0. Emoji baru seperti
     🪵 🪨 🫐 🟫 🟡 🦺 🦿 🪖 🩹 belum tersedia di font sistem Android lama,
     sehingga sebelumnya beberapa item (mis. kayu) tampil sebagai kotak kosong. */
  wood:{n:'Kayu',e:'🌲'}, stone:{n:'Batu',e:'⛰️'}, fiber:{n:'Serat',e:'🌾'},
  berry:{n:'Beri',e:'🍇',food:{hunger:8,hp:2}}, mush:{n:'Jamur',e:'🍄',food:{hunger:6,hp:0}},
  gel:{n:'Gel Slime',e:'💧'}, meat:{n:'Daging Mentah',e:'🥩',food:{hunger:10,hp:-3}},
  cmeat:{n:'Daging Panggang',e:'🍖',food:{hunger:35,hp:12}},
  bread:{n:'Roti',e:'🍞',food:{hunger:25,hp:5}},
  salad:{n:'Salad Buah',e:'🥗',food:{hunger:22,hp:18}},
  pie:{n:'Pai Beri',e:'🥧',food:{hunger:50,hp:15,buff:'speed'}},
  bandage:{n:'Perban',e:'💊',food:{hunger:0,hp:35}},
  /* ikan: ditangkap dari perairan (sistem FishSys di js/ports.js) */
  fish:{n:'Ikan Segar',e:'🐟',food:{hunger:12,hp:3}},
  cfish:{n:'Ikan Bakar',e:'🍢',food:{hunger:34,hp:12}},
  resin:{n:'Getah Pohon',e:'🍯'},
  leather:{n:'Kulit',e:'📜'},
  /* ---------- pertanian ---------- */
  hoe:{n:'Cangkul',e:'⛏️',tool:'hoe'},
  /* ---------- pawang / menangkap mob ---------- */
  rope:{n:'Tali',e:'➰'},
  saddle:{n:'Sadel',e:'🐴'},
  pet_charm:{n:'Jimat Pawang',e:'🧿'},
  seed_wheat:{n:'Benih Gandum',e:'🌾'},
  seed_carrot:{n:'Benih Wortel',e:'🥕'},
  seed_cabbage:{n:'Benih Kubis',e:'🥬'},
  seed_tomato:{n:'Benih Tomat',e:'🍅'},
  seed_watermelon:{n:'Benih Semangka',e:'🍉'},
  wheat:{n:'Gandum',e:'🌾',food:{hunger:8,hp:0}},
  carrot:{n:'Wortel',e:'🥕',food:{hunger:10,hp:2}},
  cabbage:{n:'Kubis',e:'🥬',food:{hunger:12,hp:4}},
  tomato:{n:'Tomat',e:'🍅',food:{hunger:10,hp:6}},
  watermelon:{n:'Semangka',e:'🍉',food:{hunger:20,hp:10}},
  /* ---------- hasil tambang & peleburan ---------- */
  sand:{n:'Pasir',e:'⏳'},
  /* batu bara: hasil sampingan menambang batu, dipakai bahan bakar & syarat
     rekrut NPC penambang */
  coal:{n:'Batu Bara',e:'🖤'},
  iron_ore:{n:'Bijih Besi',e:'🔘'},
  gold_ore:{n:'Bijih Emas',e:'🔶'},
  crystal:{n:'Kristal Beku',e:'💎'},
  iron_ingot:{n:'Batang Besi',e:'🔩'},
  gold_ingot:{n:'Batang Emas',e:'🥇'},
  /* drop mob baru */
  pelt:{n:'Bulu Serigala',e:'🐺'},
  venom:{n:'Racun Kalajengking',e:'🧪'},
  /* drop boss */
  boss_core:{n:'Inti Boss',e:'🔮'},
  /* ---------- set emas: tier tertinggi hasil tempa ---------- */
  helm_gold  :{n:'Helm Emas',e:'👑',armor:{slot:'helm', def:0.17,tier:'gold'}},
  plate_gold :{n:'Zirah Emas',e:'🎽',armor:{slot:'chest',def:0.26,tier:'gold'}},
  greaves_gold:{n:'Pelindung Kaki Emas',e:'👖',armor:{slot:'boots',def:0.14,tier:'gold'}},
  /* ---------- set kristal: butuh inti boss ---------- */
  helm_crystal :{n:'Helm Kristal',e:'🔷',armor:{slot:'helm', def:0.22,tier:'crystal'}},
  plate_crystal:{n:'Zirah Kristal',e:'🛡',armor:{slot:'chest',def:0.32,tier:'crystal'}},
  greaves_crystal:{n:'Pelindung Kaki Kristal',e:'❄️',armor:{slot:'boots',def:0.18,tier:'crystal'}},

  /* ---------- armor yang bisa dipasang ---------- */
  cap_leather  :{n:'Topi Kulit',e:'🧢',armor:{slot:'helm', def:0.06,tier:'leather'}},
  vest_leather :{n:'Rompi Kulit',e:'👚',armor:{slot:'chest',def:0.11,tier:'leather'}},
  boots_leather:{n:'Sepatu Kulit',e:'👟',armor:{slot:'boots',def:0.05,tier:'leather'}},
  helm_iron    :{n:'Helm Besi',e:'⛑️',armor:{slot:'helm', def:0.12,tier:'iron'}},
  plate_iron   :{n:'Zirah Besi',e:'🛡️',armor:{slot:'chest',def:0.20,tier:'iron'}},
  greaves_iron :{n:'Pelindung Kaki Besi',e:'👢',armor:{slot:'boots',def:0.10,tier:'iron'}},

  /* ================= PEDANG =================
     weapon: { dmg  = damage dasar per pukulan (base 12 = pedang awal)
               spd  = pengali kecepatan combo (>1 lebih cepat)
               crit = peluang critical (damage ×2)
               reach= jangkauan ayunan dalam blok
               fx   = id efek unik dari EFFECTS
               blade/trim = warna model 3D bilah & guard }
     Lima pedang, satu per rarity, masing-masing dengan efek berbeda. */
  sword_wood:{n:'Pedang Kayu',e:'🗡️',rarity:'common',
    weapon:{dmg:12,spd:1.00,crit:0.05,reach:3.2,fx:null,
      blade:0xc2a06a,trim:0x8a6a3f}},
  sword_iron:{n:'Bilah Besi Bergerigi',e:'⚔️',rarity:'uncommon',
    weapon:{dmg:18,spd:1.05,crit:0.08,reach:3.4,fx:'bleed',
      blade:0xdce2ea,trim:0x9aa2ac}},
  sword_storm:{n:'Pedang Badai',e:'🌩️',rarity:'rare',
    weapon:{dmg:24,spd:1.15,crit:0.12,reach:3.5,fx:'shock',
      blade:0xbfe6ff,trim:0xffe066}},
  sword_venom:{n:'Taring Racun',e:'🐍',rarity:'epic',
    weapon:{dmg:30,spd:1.22,crit:0.16,reach:3.6,fx:'venomB',
      blade:0xa8e86a,trim:0x4f7d3a}},
  sword_frost:{n:'Pedang Fajar Beku',e:'❄️',rarity:'legendary',
    weapon:{dmg:38,spd:1.18,crit:0.22,reach:3.8,fx:'frost',
      blade:0xd6f4ff,trim:0x3f8fbf}},
  sword_titan:{n:'Penghancur Titan',e:'🔥',rarity:'legendary',
    weapon:{dmg:44,spd:0.92,crit:0.14,reach:4.0,fx:'quake',
      blade:0xffb066,trim:0x8f3c1c}},

  /* ================= EQUIPMENT BARU (satu efek unik per item) ================= */
  cloak_swift:{n:'Mantel Angin',e:'🧣',rarity:'uncommon',
    armor:{slot:'chest',def:0.09,tier:'leather',fx:'swift'}},
  helm_guard:{n:'Helm Penjaga',e:'⛑️',rarity:'rare',
    armor:{slot:'helm',def:0.15,tier:'iron',fx:'guard'}},
  boots_greed:{n:'Sepatu Pemburu Harta',e:'👞',rarity:'rare',
    armor:{slot:'boots',def:0.11,tier:'gold',fx:'greed'}},
  plate_regen:{n:'Zirah Nadi Kristal',e:'💠',rarity:'epic',
    armor:{slot:'chest',def:0.28,tier:'crystal',fx:'regen'}},
  helm_thorns:{n:'Mahkota Duri Titan',e:'😈',rarity:'legendary',
    armor:{slot:'helm',def:0.24,tier:'crystal',fx:'thorns'}},

  /* ================= TAMENG (slot shield — khusus karakter utama) =================
     Tujuh tameng dari NEW MODEL/Tameng.html. `tier` menentukan bahan
     enchant di Landasan Tempa (anvil), bukan warna model — tiap tameng
     punya model voxel unik sendiri di js/player/shields.js. */
  shield_wood:  {n:'Tameng Kayu',      e:'🛡️',rarity:'common',
    armor:{slot:'shield',def:0.05,tier:'leather'}},
  shield_iron:  {n:'Tameng Ksatria Besi',e:'🛡️',rarity:'uncommon',
    armor:{slot:'shield',def:0.10,tier:'iron'}},
  shield_flame: {n:'Tameng Bara',      e:'🛡️',rarity:'rare',
    armor:{slot:'shield',def:0.13,tier:'gold'}},
  shield_venom: {n:'Tameng Bisa',      e:'🛡️',rarity:'rare',
    armor:{slot:'shield',def:0.12,tier:'iron'}},
  shield_storm: {n:'Tameng Badai',     e:'🛡️',rarity:'epic',
    armor:{slot:'shield',def:0.15,tier:'gold'}},
  shield_frost: {n:'Tameng Fajar Beku',e:'🛡️',rarity:'epic',
    armor:{slot:'shield',def:0.17,tier:'crystal'}},
  shield_dark:  {n:'Tameng Bayangan',  e:'🛡️',rarity:'legendary',
    armor:{slot:'shield',def:0.20,tier:'crystal'}},
};
/* rarity default untuk item lama agar UI tetap konsisten */
(function(){
  const R={cap_leather:'common',vest_leather:'common',boots_leather:'common',
    helm_iron:'uncommon',plate_iron:'uncommon',greaves_iron:'uncommon',
    helm_gold:'rare',plate_gold:'rare',greaves_gold:'rare',
    helm_crystal:'epic',plate_crystal:'epic',greaves_crystal:'epic'};
  for(const id in R)if(ITEMS[id])ITEMS[id].rarity=R[id];
})();

/* palet warna material armor untuk model 3D */
const ARMOR_TIER={
  leather:{main:0x8a5f35,trim:0x5d3f20,metal:0xb08a52},
  iron   :{main:0x9aa2ac,trim:0x6d747d,metal:0xd2d9e2},
  gold   :{main:0xd9b23a,trim:0x9c7c1e,metal:0xffe07a},
  crystal:{main:0x7fd8ff,trim:0x3f8fbf,metal:0xd6f4ff},
};

const ARMOR_SLOTS=[
  /* sistem baru ala Minecraft: senjata tidak punya slot equipment khusus.
     Senjata/alat dipakai dari item yang sedang dipilih di hotbar. */
  {id:'helm', name:'Kepala',e:'⛑️'},
  {id:'chest',name:'Badan', e:'👕'},
  {id:'boots',name:'Kaki',  e:'👣'},
];
/* slot perlengkapan KHUSUS karakter utama: armor dasar + tameng.
   NPC/rekan tetap memakai NPC_GEAR_SLOTS (tanpa tameng). */
const PLAYER_GEAR_SLOTS=ARMOR_SLOTS.concat([{id:'shield',name:'Tameng',e:'🛡️'}]);
/* slot perlengkapan NPC/rekan: rekan masih bisa memegang senjata sendiri */
const NPC_GEAR_SLOTS=[{id:'weapon',name:'Senjata',e:'🗡️'}].concat(ARMOR_SLOTS);

const DROP_COLOR={wood:0x8a6a3f,stone:0x9aa0a8,fiber:0xc9c26a,berry:0x4d6bd6,mush:0xb5652a,gel:0x7de06a,
  rope:0xc9b98a,saddle:0x8a5f35,pet_charm:0x7fd8ff,
  meat:0xc94f43,cmeat:0x9c5a2e,bread:0xd6a55a,salad:0x7ac96a,pie:0xc98a4d,bandage:0xe8e4da,
  fish:0x93adc0,cfish:0xd98a4d,
  resin:0xd9a13c,leather:0x8a5f35,
  hoe:0x8a5f35,
  seed_wheat:0xd4a431,seed_carrot:0xe07f1d,seed_cabbage:0x5f9e30,
  seed_tomato:0xe2451e,seed_watermelon:0x3a7d23,
  wheat:0xd4a431,carrot:0xe07f1d,cabbage:0x5f9e30,tomato:0xe2451e,watermelon:0x3a7d23,
  cap_leather:0x8a5f35,vest_leather:0x8a5f35,boots_leather:0x5d3f20,
  helm_iron:0x9aa2ac,plate_iron:0x9aa2ac,greaves_iron:0x6d747d,
  sand:0xdcc78d,iron_ore:0xb08a6a,gold_ore:0xd9b23a,crystal:0x7fd8ff,
  iron_ingot:0xd2d9e2,gold_ingot:0xffe07a,pelt:0x9a8b7a,venom:0x9ad84f,
  coal:0x2c2c30,
  boss_core:0xff6bd6,
  helm_gold:0xd9b23a,plate_gold:0xd9b23a,greaves_gold:0x9c7c1e,
  helm_crystal:0x7fd8ff,plate_crystal:0x7fd8ff,greaves_crystal:0x3f8fbf,
  /* pedang & equipment efek */
  sword_wood:0xc2a06a,sword_iron:0xdce2ea,sword_storm:0xbfe6ff,
  sword_venom:0xa8e86a,sword_frost:0xd6f4ff,sword_titan:0xffb066,
  cloak_swift:0x8fe0ff,helm_guard:0xc9d2dc,boots_greed:0xffd24d,
  plate_regen:0x7dffb0,helm_thorns:0xff6bd6,
  /* tameng */
  shield_wood:0x9c6b35,shield_iron:0xa8b2bd,shield_flame:0xff7a1f,
  shield_venom:0x2bcc4f,shield_storm:0xffd75e,shield_frost:0x9fd6ff,
  shield_dark:0xa633ff};



const RECIPES=[
  {out:'cmeat',need:{meat:1,wood:1},name:'Daging Panggang'},
  {out:'cfish',need:{fish:1,wood:1},name:'Ikan Bakar'},
  {out:'bread',need:{fiber:3},name:'Roti'},
  {out:'salad',need:{berry:2,mush:1},skill:'cook',prof:{cooking:3},name:'Salad Buah'},
  {out:'bandage',need:{fiber:2,mush:1},skill:'alchem',name:'Perban'},
  {out:'pie',need:{berry:3,fiber:2},skill:'gourmet',prof:{cooking:6},name:'Pai Beri'},
  {out:'leather',need:{gel:2,fiber:2},name:'Kulit'},
  /* ---------- pawang ---------- */
  {out:'rope',need:{fiber:4,leather:1},name:'Tali'},
  {out:'saddle',need:{leather:4,wood:2},skill:'catcher',name:'Sadel'},
  {out:'pet_charm',need:{boss_core:1,gold_ingot:2,crystal:2},skill:'catch_master',name:'Jimat Pawang'},
  /* ---------- pertanian: cangkul & benih dari hasil panen ---------- */
  {out:'hoe',need:{wood:3,stone:2},name:'Cangkul'},
  {out:'seed_wheat',need:{wheat:1},name:'Benih Gandum'},
  {out:'seed_carrot',need:{carrot:1},name:'Benih Wortel'},
  {out:'seed_cabbage',need:{cabbage:1},name:'Benih Kubis'},
  {out:'seed_tomato',need:{tomato:1},name:'Benih Tomat'},
  {out:'seed_watermelon',need:{watermelon:1},name:'Benih Semangka'},
  {out:'cap_leather',need:{leather:2,fiber:2},name:'Topi Kulit'},
  {out:'vest_leather',need:{leather:4,fiber:3,resin:1},name:'Rompi Kulit'},
  {out:'boots_leather',need:{leather:2,fiber:1},name:'Sepatu Kulit'},
  /* tempa besi: butuh pengalaman menambang (proficiency mining) — "dua kunci"
     ala Durango: skill tree membuka resepnya, proficiency membuka tier-nya. */
  {out:'helm_iron',need:{stone:5,wood:1,resin:1},skill:'smith',prof:{mining:5},name:'Helm Besi'},
  {out:'plate_iron',need:{stone:8,wood:2,leather:2},skill:'smith',prof:{mining:5},name:'Zirah Besi'},
  {out:'greaves_iron',need:{stone:5,leather:1},skill:'smith',prof:{mining:5},name:'Pelindung Kaki Besi'},
  /* ---------- peleburan bijih hasil menambang ---------- */
  {out:'iron_ingot',need:{iron_ore:2,wood:1},name:'Batang Besi'},
  {out:'gold_ingot',need:{gold_ore:2,wood:2},name:'Batang Emas'},
  /* ---------- tempa set emas (butuh Pandai Besi) ---------- */
  {out:'helm_gold',need:{gold_ingot:2,leather:1},skill:'smith',prof:{mining:12},name:'Helm Emas'},
  {out:'plate_gold',need:{gold_ingot:4,iron_ingot:2},skill:'smith',prof:{mining:12},name:'Zirah Emas'},
  {out:'greaves_gold',need:{gold_ingot:2,iron_ingot:1},skill:'smith',prof:{mining:12},name:'Pelindung Kaki Emas'},
  /* ---------- tempa set kristal: butuh inti boss ---------- */
  {out:'helm_crystal',need:{crystal:3,iron_ingot:2,boss_core:1},skill:'smith',prof:{mining:18},name:'Helm Kristal'},
  {out:'plate_crystal',need:{crystal:5,gold_ingot:2,boss_core:1},skill:'smith',prof:{mining:18},name:'Zirah Kristal'},
  {out:'greaves_crystal',need:{crystal:3,iron_ingot:1,boss_core:1},skill:'smith',prof:{mining:18},name:'Pelindung Kaki Kristal'},

  /* ================= TEMPA PEDANG =================
     Rantai progresi: kayu (tanpa skill) → besi → badai → racun → beku → titan.
     Pedang tier atas memakai pedang tier bawah sebagai bahan supaya
     pemain merasakan urutan upgrade yang jelas. Tier logam juga menuntut
     proficiency menambang yang makin tinggi. */
  {out:'sword_wood',need:{wood:4,fiber:2},name:'Pedang Kayu'},
  {out:'sword_iron',need:{sword_wood:1,iron_ingot:3,leather:1},skill:'smith',prof:{mining:5},name:'Bilah Besi Bergerigi'},
  {out:'sword_storm',need:{sword_iron:1,gold_ingot:2,crystal:2},skill:'smith',prof:{mining:10},name:'Pedang Badai'},
  {out:'sword_venom',need:{sword_storm:1,venom:4,iron_ingot:2},skill:'smith',prof:{mining:15},name:'Taring Racun'},
  {out:'sword_frost',need:{sword_storm:1,crystal:6,boss_core:1},skill:'smith',prof:{mining:18},name:'Pedang Fajar Beku'},
  {out:'sword_titan',need:{sword_venom:1,gold_ingot:4,boss_core:2},skill:'smith',prof:{mining:22},name:'Penghancur Titan'},

  /* ================= TEMPA EQUIPMENT EFEK ================= */
  {out:'cloak_swift',need:{pelt:3,fiber:4,resin:1},name:'Mantel Angin'},
  {out:'helm_guard',need:{iron_ingot:3,leather:2},skill:'smith',prof:{mining:12},name:'Helm Penjaga'},
  {out:'boots_greed',need:{gold_ingot:3,pelt:2},skill:'smith',prof:{mining:12},name:'Sepatu Pemburu Harta'},
  {out:'plate_regen',need:{crystal:4,gold_ingot:2,boss_core:1},skill:'smith',prof:{mining:18},name:'Zirah Nadi Kristal'},
  {out:'helm_thorns',need:{crystal:3,venom:5,boss_core:2},skill:'smith',prof:{mining:18},name:'Mahkota Duri Titan'},

  /* ================= TEMPA TAMENG =================
     Rantai upgrade: kayu → besi → (bara/bisa) → badai → beku → bayangan.
     Tier bahan mengikuti rarity logamnya. */
  {out:'shield_wood',need:{wood:6,fiber:2},name:'Tameng Kayu'},
  {out:'shield_iron',need:{shield_wood:1,iron_ingot:4,leather:1},skill:'smith',prof:{mining:5},name:'Tameng Ksatria Besi'},
  {out:'shield_flame',need:{shield_iron:1,gold_ingot:3,coal:4},skill:'smith',prof:{mining:10},name:'Tameng Bara'},
  {out:'shield_venom',need:{shield_iron:1,venom:5,iron_ingot:2},skill:'smith',prof:{mining:12},name:'Tameng Bisa'},
  {out:'shield_storm',need:{shield_flame:1,gold_ingot:4,crystal:2},skill:'smith',prof:{mining:15},name:'Tameng Badai'},
  {out:'shield_frost',need:{shield_storm:1,crystal:6,boss_core:1},skill:'smith',prof:{mining:18},name:'Tameng Fajar Beku'},
  {out:'shield_dark',need:{shield_frost:1,boss_core:2,crystal:4},skill:'smith',prof:{mining:22},name:'Tameng Bayangan'},
];



/* ================= skill tree =================
   `active:true` menandai skill yang harus ditekan manual (muncul sebagai
   tombol di HUD dan punya cooldown di RPG.activeCD). Skill tanpa flag itu
   bersifat pasif: efeknya langsung jalan begitu dipelajari.
   `cd` = cooldown detik untuk skill aktif. */
const SKILLS=[
  /* ---------- COMBAT ---------- */
  {id:'dmg',br:'combat',icon:'⚔️',name:'Bilah Tajam',desc:'+20% damage / rank',max:3,cost:1},
  {id:'combo',br:'combat',icon:'🌀',name:'Aliran Combo',desc:'Serangan 12% lebih cepat / rank',max:2,cost:1,req:'dmg'},
  {id:'slam',br:'combat',icon:'💥',name:'Hantaman Kuat',desc:'Hit ke-5 +40% damage / rank · membuka Hantam Bumi',max:2,cost:1,req:'dmg',active:true,cd:10},
  {id:'vamp',br:'combat',icon:'🩸',name:'Bilah Vampir',desc:'Pulihkan HP 8% dari damage',max:1,cost:2,req:'combo',prof:{combat:15}},
  /* aktif baru: tebasan berputar 360° mengenai semua musuh sekeliling */
  {id:'whirl',br:'combat',icon:'🌪️',name:'Tebasan Angin Puyuh',
    desc:'Berputar menebas semua musuh di sekeliling (radius 3.6) · 30 stamina',
    max:2,cost:2,req:'combo',prof:{combat:8},active:true,cd:12},
  /* aktif baru: teriakan perang menakuti monster & menaikkan damage sesaat */
  {id:'roar',br:'combat',icon:'🦁',name:'Teriakan Perang',
    desc:'Monster sekitar mundur ketakutan · +35% damage 8 detik',
    max:1,cost:2,req:'dmg',prof:{combat:12},active:true,cd:26},
  /* ---------- MOVEMENT ---------- */
  {id:'run',br:'move',icon:'🏃',name:'Pelari',desc:'+6% kecepatan / rank',max:3,cost:1},
  {id:'stam',br:'move',icon:'⚡',name:'Daya Tahan',desc:'Konsumsi stamina -15% / rank',max:3,cost:1},
  /* skill aktif 'roll' (Guling Cepat) DIHAPUS — dodge kini memakai animasi dash
     bawaan tanpa perlu skill. */
  {id:'swim',br:'move',icon:'🏊',name:'Perenang',desc:'Berenang jauh lebih cepat',max:1,cost:2,req:'stam',prof:{agility:8}},
  /* skill aktif 'leap' (Lompatan Rusa) DIHAPUS — digantikan penuh oleh skill
     pasif Lompat Ganda di bawah: cukup dipelajari dari skill tree, lalu tekan
     lompat dua kali kapan saja tanpa cooldown. */
  /* pasif: lompat ganda — tekan lompat 2x (space 2x) untuk melompat lagi
     di udara sehingga bisa mencapai ketinggian ~3 blok. Tanpa cooldown. */
  {id:'djump',br:'move',icon:'🪽',name:'Lompat Ganda',
    desc:'Tekan lompat sekali lagi di udara untuk melompat kedua · capai ~3 blok · tanpa cooldown',
    max:1,cost:2,req:'run',prof:{agility:4}},
  /* ---------- CRAFTING / SURVIVAL ---------- */
  {id:'harv',br:'craft',icon:'🌿',name:'Pemanen',desc:'+30% hasil panen / rank',max:3,cost:1},
  {id:'axe',br:'craft',icon:'🪓',name:'Penebang',desc:'Tebang pohon +35% cepat & +1 kayu / rank',max:3,cost:1},
  {id:'cook',br:'craft',icon:'🍳',name:'Koki',desc:'Buka Salad · makanan +25% hunger',max:2,cost:1,req:'harv',prof:{cooking:3}},
  {id:'smith',br:'craft',icon:'🔧',name:'Pandai Besi',desc:'Buka set armor besi',max:1,cost:2,req:'axe',prof:{mining:5}},
  {id:'gourmet',br:'craft',icon:'👨‍🍳',name:'Juru Rasa',desc:'Buka Pai Beri (buff lari)',max:1,cost:2,req:'cook',prof:{cooking:8}},
  {id:'alchem',br:'craft',icon:'⚗️',name:'Tabib',desc:'Buka Perban penyembuh',max:1,cost:1,req:'harv',prof:{harvesting:5}},
  /* aktif baru: penyembuhan instan dari ramuan herbal */
  {id:'herb',br:'craft',icon:'🌱',name:'Ramuan Herbal',
    desc:'Pulihkan 35 HP seketika tanpa memakai item',
    max:2,cost:2,req:'alchem',prof:{harvesting:10},active:true,cd:30},
  /* ---------- GATHER (terhubung PROFICIENCY) ----------
     Cabang ini "dikunci" oleh level proficiency (field `prof`): untuk
     membukanya pemain harus benar-benar sering melakukan aksi gathering
     (menebang/menambang/memanen/bertani) — inti rasa ala Durango. Efeknya
     menambah peluang hasil ekstra, dihitung RPG.gatherBonus(dropId). */
  {id:'groot',br:'gather',icon:'🧺',name:'Naluri Pengumpul',
    desc:'Pembuka jalur pengumpul · +5% hasil semua gathering',max:1,cost:1},
  {id:'logm',br:'gather',icon:'🪓',name:'Penebang Terampil',
    desc:'+10% peluang kayu ekstra / rank',max:3,cost:1,req:'groot',prof:{logging:5}},
  {id:'minm',br:'gather',icon:'⛏️',name:'Penambang Terampil',
    desc:'+10% peluang batu & bijih ekstra / rank',max:3,cost:1,req:'groot',prof:{mining:5}},
  {id:'wildm',br:'gather',icon:'🌿',name:'Pemanen Terampil',
    desc:'+10% peluang serat, berry & jamur ekstra / rank',max:3,cost:1,req:'groot',prof:{harvesting:5}},
  {id:'greenthumb',br:'gather',icon:'🌾',name:'Tangan Hijau',
    desc:'+12% peluang hasil ladang ekstra / rank',max:2,cost:1,req:'groot',prof:{farming:5}},
  {id:'mgather',br:'gather',icon:'🌳',name:'Penguasa Alam',
    desc:'+25% hasil semua gathering',max:1,cost:3,req:'groot',
    prof:{logging:15,mining:15,harvesting:15}},
  /* ---------- CATCH / PAWANG ----------
     Cabang menangkap monster: membuka Tali & Sadel, memperkuat tarikan,
     mengurangi risiko tali putus, dan memperlambat kaburnya monster. */
  {id:'catcher',br:'catch',icon:'🪢',name:'Pawang Pemula',
    desc:'+10% drain stamina & -10% ketegangan · membuka resep Sadel',
    max:1,cost:1},
  {id:'catch_pow',br:'catch',icon:'💪',name:'Tarikan Kuat',
    desc:'+20% drain stamina monster saat tarik-tarikan / rank',
    max:3,cost:1,req:'catcher'},
  {id:'catch_rope',br:'catch',icon:'🧵',name:'Tali Lentur',
    desc:'-15% kenaikan ketegangan tali / rank',
    max:3,cost:1,req:'catcher'},
  {id:'catch_calm',br:'catch',icon:'🕊️',name:'Suara Tenang',
    desc:'Monster 15% lebih lambat kabur saat proses menangkap / rank',
    max:2,cost:1,req:'catch_pow'},
  {id:'catch_master',br:'catch',icon:'🐉',name:'Pawang Agung',
    desc:'+25% drain stamina & -10% ketegangan · memudahkan menangkap boss/naga',
    max:1,cost:3,req:'catch_rope'},
];
/* label kategori skill untuk ditampilkan di sudut kiri atas kartu skill */
const SKILL_KIND={
  active :{n:'AKTIF', e:'🎯', css:'#ffb347', tip:'Perlu ditekan manual dari tombol di HUD'},
  passive:{n:'PASIF', e:'🔷', css:'#7fd8ff', tip:'Efek langsung berjalan setelah dipelajari'},
};
const skillKind=sk=>sk.active?SKILL_KIND.active:SKILL_KIND.passive;

/* ================= ARKETIPE NPC =================
   Setiap NPC desa memakai satu arketipe yang menentukan nama, warna jubah,
   stat dasar, dan satu skill pasif miliknya sendiri. `recruit:false` berarti
   NPC itu hanya penjaga desa dan tidak akan pernah mau ikut pemain.
   `ask` = daftar bahan yang mungkin diminta sebagai syarat direkrut; jumlah
   pastinya diacak per NPC (lihat NPCS.rollDemand). */
const NPC_ROLES=[
  {id:'guard',   name:'Penjaga Desa', e:'🛡️', recruit:false,
    robe:0xa8552f, hood:0x3c4a68,
    hp:120, dmg:11, speed:3.2,
    skill:{id:'bulwark',name:'Benteng Desa',e:'🛡️',
      desc:'Damage yang diterima -20%'},
    ask:[]},
  {id:'hunter',  name:'Pemburu',      e:'🏹', recruit:true,
    robe:0x4f6b34, hood:0x2f4020,
    hp:105, dmg:16, speed:3.9,
    skill:{id:'keen',name:'Mata Pemburu',e:'🎯',
      desc:'+25% damage & jangkauan serang lebih jauh'},
    ask:['meat','pelt','fiber','wood']},
  {id:'miner',   name:'Penambang',    e:'⛏️', recruit:true,
    robe:0x6b5a3a, hood:0x4a3c26,
    hp:130, dmg:12, speed:3.0,
    skill:{id:'digger',name:'Tangan Tambang',e:'⛏️',
      desc:'Menambang 2× lebih cepat & sesekali dapat bahan ekstra'},
    ask:['stone','coal','wood','iron_ore']},
  {id:'farmer',  name:'Petani',       e:'🌾', recruit:true,
    robe:0x6a8f3f, hood:0x465f2a,
    hp:100, dmg:8, speed:3.1,
    skill:{id:'green',name:'Tangan Hijau',e:'🌾',
      desc:'Farming lebih cepat & hasil panen +1'},
    ask:['wheat','carrot','fiber','wood']},
  {id:'herbal',  name:'Tabib Desa',   e:'⚗️', recruit:true,
    robe:0x7a4f7d, hood:0x4d3050,
    hp:95,  dmg:9,  speed:3.4,
    skill:{id:'mend',name:'Tangan Penyembuh',e:'💚',
      desc:'Memulihkan 1.5 HP/detik ke pemain di dekatnya'},
    ask:['berry','mush','fiber','resin']},
  {id:'warrior', name:'Petarung',     e:'⚔️', recruit:true,
    robe:0x8f3b3b, hood:0x5a2323,
    hp:150, dmg:20, speed:3.3,
    skill:{id:'taunt',name:'Tameng Hidup',e:'😤',
      desc:'Menarik perhatian monster supaya menyerang dirinya'},
    ask:['iron_ore','meat','stone','leather']},
  /* Guardian: rekan bertipe TANK. HP paling besar & damage kecil; tugasnya
     memasang aura pertahanan untuk seluruh tim (termasuk pemain) sekaligus
     memaksa monster memukul dirinya lewat provokasi. */
  {id:'guardian', name:'Guardian',    e:'🛡️', recruit:true,
    robe:0x37527a, hood:0x22314d,
    hp:210, dmg:10, speed:2.9,
    skill:{id:'aegis',name:'Aegis Pelindung',e:'🛡️',
      desc:'Damage yang diterima seluruh tim & pemain -18% · memancing monster'},
    ask:['iron_ingot','stone','leather','coal']},
   /* Manusia Singa: ksatria beast-kin langka berzirah emas lengkap dengan
      pedang pusaka. Model voxel kotak satu gaya dengan NPC lain (hierarki
      kaki/badan/kepala/lengan terpisah) — lihat js/entities/npc_lionknight.js.
      `rare:true` membuatnya TIDAK menetap di desa: ia pengembara langka yang
      berjalan antar desa seperti Penyihir Elf & Raksasa Batu (js/npc_rare.js),
      sehingga hanya bisa direkrut saat kebetulan ditemui di jalan/tavern. */
 {id:'lionknight', name:'Manusia Singa', e:'🦁', recruit:true, rare:true, weight:9,
    robe:0xC8912F, hood:0xFFD700,
    hp:260, dmg:26, speed:3.6,
    skill:{id:'lionclaw',name:'Auman Singa',e:'🦁',
      desc:'Pasif Cakar Singa: +20% damage · +jangkauan pedang · memancing monster · Aktif AUMAN SINGA: raungan 360° dua gelombang (1,3× + 0,7×) merusak & mendorong semua monster di sekeliling'},
    ask:['gold_ingot','meat','pelt','crystal']},
  /* ---- ARKETIPE LANGKA (RARE) ----------------------------------------------
     Dua arketipe berikut TIDAK muncul lewat spawn desa biasa: mereka pengembara
     yang berjalan dari satu desa ke desa lain (lihat js/npc_rare.js) dan hanya
     bisa direkrut saat pemain kebetulan bertemu di jalan. Model + animasinya
     voxel detail di js/entities/ (npc_elfmage.js & npc_stonegiant.js).
     `rare:true` menandai keduanya agar NPCS.spawn melewatinya dan RareNPC yang
     mengurus kemunculannya. */
  {id:'elfmage',   name:'Penyihir Elf', e:'🔮', recruit:true, rare:true, weight:10,
    robe:0x2c4a8c, hood:0x5a7bd0,
    hp:130, dmg:24, speed:3.5,
    skill:{id:'arcane',name:'Berkat Arcane',e:'✨',
      desc:'+18% damage seluruh tim · memulihkan stamina pemain lebih cepat'},
    ask:['crystal','resin','mush','gold_ore']},
  {id:'stonegiant',name:'Raksasa Batu',  e:'🗿', recruit:true, rare:true, weight:8,
    robe:0x71767d, hood:0x464e5c,
    hp:340, dmg:30, speed:2.6,
    skill:{id:'quake',name:'Hantaman Bumi',e:'💥',
      desc:'Hantaman mace mengguncang tanah · damage besar & memancing monster'},
    ask:['iron_ingot','stone','coal','crystal']},
  /* Kelinci Cakar: petarung beast-kin dari prototipe NEW MODEL. Model voxel
     lengkap (js/ports.js → PortRabbit) dengan combo sabitan & skill RAPID
     CLAW 5 cakaran beruntun. Pengembara langka seperti elf & raksasa. */
  {id:'rabbitwarrior',name:'Kelinci Cakar',e:'🐰',recruit:true,rare:true,weight:9,
    robe:0x8ea6c0, hood:0x2fa3a0,
    hp:235, dmg:23, speed:4.8,
    skill:{id:'rapidclaw',name:'Rapid Claw',e:'🐾',
      desc:'5 cakaran kilat beruntun · cakaran ketiga combo +30% damage'},
    ask:['meat','pelt','leather','crystal']},
  /* Goblin Emas: goblin hijau mungil ksatria berzirah emas lengkap (helm
     bertanduk, pelindung dada, pauldron & sepatu emas) bersenjata belati emas.
     Skill khasnya BACKSTAB LEAP: melompat salto ke punggung monster lalu
     menusuk 5× beruntun (total 5× damage) — monster yang ditunggangi tidak
     bisa membalas. Pengembara langka seperti elf, raksasa & kelinci. */
  {id:'goblin', name:'Goblin Emas', e:'👺', recruit:true, rare:true, weight:9,
    robe:0x4f9e3a, hood:0xd9a531,
    hp:185, dmg:19, speed:4.6,
    skill:{id:'backstab',name:'Backstab Leap',e:'🗡️',
      desc:'Loncat ke punggung monster · 5 tusukan beruntun (total damage 5×) · monster yang ditunggangi tak bisa membalas'},
    ask:['gold_ore','gold_ingot','meat','leather']},
  /* Pedagang desa: tidak bisa direkrut. Menetap di desa dan membuka toko —
     pemain membeli item dengan koin atau menjual item untuk dapat koin. */
  {id:'merchant',name:'Pedagang',e:'🏪',recruit:false,
    robe:0xc9a24b, hood:0x8a6a1e,
    hp:100, dmg:6, speed:2.6,
    skill:{id:'trade',name:'Jiwa Dagang',e:'🪙',
      desc:'Menjual barang & membeli hasil buruanmu'},
    ask:[]},
];

/* ================= TOKO / PEDAGANG DESA =================
   GOODS  : daftar barang yang dijual pedagang + harga koin.
   sellPrice(id) : harga jual item oleh pemain (setengah harga beli, atau nilai
                   dasar resource). Dipakai UI panel toko. */
const SHOP_GOODS=[
  {id:'bread',      price:6},
  {id:'cmeat',      price:10},
  {id:'bandage',    price:14},
  {id:'pie',        price:22},
  {id:'fish',       price:8},
  {id:'cfish',      price:12},
  {id:'leather',    price:9},
  {id:'iron_ingot', price:18},
  {id:'gold_ingot', price:30},
  {id:'sword_iron', price:60},
  {id:'sword_storm',price:140},
  {id:'helm_iron',  price:40},
  {id:'plate_iron', price:70},
  {id:'greaves_iron',price:45},
  {id:'cloak_swift',price:90},
];
/* nilai dasar koin per item saat dijual (fallback bila tak ada di toko) */
const SHOP_VALUE={
  wood:1,stone:1,fiber:1,berry:2,mush:1,gel:2,meat:3,cmeat:5,bread:3,salad:6,
  pie:11,bandage:7,fish:4,cfish:6,resin:3,leather:5,sand:1,coal:3,
  iron_ore:5,gold_ore:8,crystal:12,iron_ingot:9,gold_ingot:15,pelt:4,venom:7,
  boss_core:40,
};
function shopPrice(id){
  const g=SHOP_GOODS.find(g=>g.id===id);
  return g?g.price:0;
}
function sellPrice(id){
  if(SHOP_VALUE[id]!==undefined)return SHOP_VALUE[id];
  const it=ITEMS[id];if(!it)return 1;
  if(it.weapon)return Math.round((it.weapon.dmg||10)*1.6);
  if(it.armor)return Math.round((it.armor.def||0.1)*220);
  return 2;
}

/* ================= UPGRADE TAS (dijual pedagang) =================
   Harga naik tiap tingkatan. Tiap tingkat +7 slot kantong, maks 5 tingkat. */
const BAG_PRICES=[50,120,250,500,900];
const BAG_ITEM={n:'Tas Kulit Besar',e:'🎒'};   // ikon & nama item 'bag' di toko

/* Generator stok pedagang: tiap pedagang di desa punya barang ACAK.
   Mengambil beberapa item dari SHOP_GOODS secara acak + peluang 25% menjual
   upgrade tas (bila tier pemain belum maksimum). */
function genShopStock(bagTier){
  const pool=SHOP_GOODS.slice();
  const out=[];
  const count=5+Math.floor(Math.random()*3);      // 5–7 barang
  for(let i=0;i<count&&pool.length;i++){
    const idx=Math.floor(Math.random()*pool.length);
    const g=pool.splice(idx,1)[0];
    const it=ITEMS[g.id];if(!it)continue;
    /* consumable dijual beberapa; senjata/armor satuan */
    const n=(it.weapon||it.armor)?1:(3+Math.floor(Math.random()*4));
    out.push({id:g.id,price:g.price,n});
  }
  /* peluang 25% pedagang menjual upgrade tas (selama belum maks) */
  if((bagTier||0)<5&&Math.random()<0.25){
    out.push({id:'bag',price:BAG_PRICES[(bagTier||0)],n:1});
  }
  return out;
}

/* pengurangan damage dari aura Guardian (dipakai NPCS.auraDef & Player) */
const NPC_AEGIS_DEF=0.18;

/* NPC punya kurva level sendiri: lebih landai dari pemain supaya rekan tetap
   terasa berkembang tanpa melampaui kekuatan pemain. */
const npcXpNeed=lvl=>Math.round(45*Math.pow(lvl,1.35));
/* blok yang boleh dipanen rekan saat diperintah mengumpulkan resource, beserta
   item hasilnya. Rekan tidak menyentuh PLANK/ROOF supaya rumah desa aman. */
const NPC_GATHER=[
  {block:B.WOOD, item:'wood'},
  {block:B.STONE,item:'stone'},
  {block:B.ORE_IRON,item:'iron_ore'},
  {block:B.ORE_GOLD,item:'gold_ore'},
  {block:B.ORE_CRYSTAL,item:'crystal'},
];


/* ================= ringkasan stat item =================
   Dipakai panel Crafting & tooltip Tas supaya pemain tahu persis apa yang
   didapat sebelum membuat item: +ATK, +DEF, bonus makanan, efek unik, dll.
   Nilai stat dikalikan rarity.mul agar sama dengan perhitungan RPG. */
function itemStats(id){
  const it=ITEMS[id];
  if(!it)return [];
  const mul=(it.rarity&&RARITY[it.rarity])?RARITY[it.rarity].mul:1;
  const out=[];
  if(it.weapon){
    const w=it.weapon;
    out.push({k:'ATK',   v:'+'+Math.round(w.dmg*mul),        e:'⚔️',css:'#ff8f6b'});
    out.push({k:'Kecepatan',v:'×'+w.spd.toFixed(2),          e:'⏱️',css:'#ffe066'});
    out.push({k:'Kritikal',v:Math.round(Math.min(0.6,w.crit*mul)*100)+'%',e:'🎯',css:'#ff6bd6'});
    out.push({k:'Jangkauan',v:w.reach.toFixed(1)+' blok',    e:'📏',css:'#b8c0cc'});
  }
  if(it.armor){
    out.push({k:'DEF',v:'+'+Math.round(it.armor.def*mul*100)+'%',e:'🛡️',css:'#8fe0ff'});
    const slots=(typeof PLAYER_GEAR_SLOTS!=='undefined')?PLAYER_GEAR_SLOTS:ARMOR_SLOTS;
    if(slots.some(s=>s.id===it.armor.slot)){
      const sl=slots.find(s=>s.id===it.armor.slot);
      out.push({k:'Slot',v:sl.name,e:sl.e,css:'#c9d2dc'});
    }
  }
  if(it.food){
    const f=it.food;
    if(f.hunger)out.push({k:'Kenyang',v:'+'+f.hunger,e:'🍖',css:'#ffc46b'});
    if(f.hp)out.push({k:'HP',v:(f.hp>0?'+':'')+f.hp,e:'❤️',css:f.hp>0?'#8fe07a':'#ff7a6b'});
    if(f.buff==='speed')out.push({k:'Buff',v:'Lari 20s',e:'💨',css:'#8fe0ff'});
  }
  /* efek unik senjata / armor selalu ditaruh terakhir */
  const fx=(it.weapon&&it.weapon.fx)||(it.armor&&it.armor.fx);
  if(fx&&EFFECTS[fx])
    out.push({k:EFFECTS[fx].n,v:'',e:EFFECTS[fx].e,css:'#'+EFFECTS[fx].c.toString(16).padStart(6,'0'),
      desc:EFFECTS[fx].desc});
  return out;
}

/* =========================================================================
   FURNITUR & DIALOG
   Ditulis terpisah di akhir berkas supaya tabel utama di atas tetap ringkas.
   ========================================================================= */

/* ---------- item furnitur: dibuat lewat crafting lalu diletakkan di dunia ---
   'place' menunjuk ke definisi model 3D di FURNI (js/furni.js). */
Object.assign(ITEMS,{
  f_table:{n:'Meja Kayu',    e:'🍽️', place:'table', rarity:'common'},
  f_chair:{n:'Kursi Kayu',   e:'💺', place:'chair', rarity:'common'},
  f_bed:  {n:'Tempat Tidur', e:'🛏️', place:'bed',   rarity:'uncommon'},
  /* Peti: tempat menitipkan resource supaya tas tidak cepat penuh.
     Isinya milik peti itu sendiri (bukan inventory global) dan ikut disimpan. */
  f_chest:{n:'Peti Penyimpanan', e:'🧰', place:'chest', rarity:'common'},
  /* Perahu: satu-satunya perabot yang diletakkan DI ATAS air. Dipakai untuk
     menyeberangi danau/laut jauh lebih cepat daripada berenang, dan pemain
     tidak kehilangan stamina selama menaikinya. */
  f_boat: {n:'Perahu Kayu', e:'🛶', place:'boat', rarity:'uncommon'},
  /* Papan Quest: salinan papan pengumuman desa yang bisa dipasang di basis
     sendiri, sehingga pemain tidak perlu balik ke desa hanya untuk lapor. */
  f_board:{n:'Papan Quest', e:'📜', place:'board', rarity:'uncommon'},
  /* ---------- STASIUN KERJA (model voxel dari NEW MODEL/Workstation.html) ----------
     Meja Kayu biasa kini hanya dekorasi; crafting dilakukan di Meja Kerja. */
  f_workbench:{n:'Meja Kerja', e:'🔨', place:'workbench', rarity:'common'},
  f_anvil:    {n:'Landasan Tempa', e:'⚒️', place:'anvil', rarity:'rare'},
  f_stove:    {n:'Tungku Masak', e:'🍲', place:'stove', rarity:'uncommon'},
  f_campfire: {n:'Api Unggun', e:'🔥', place:'campfire', rarity:'common'},
});

Object.assign(DROP_COLOR,{f_table:0x8a5a2b,f_chair:0x8a5a2b,f_bed:0xc23b3b,
  f_chest:0x9a6b3c,f_boat:0xb07c46,f_board:0x8a5a2b,
  f_workbench:0xb8894f,f_anvil:0x474c52,f_stove:0x8f4a38,f_campfire:0x5a4128});


RECIPES.push(
  {out:'f_chair',need:{wood:4,fiber:2},name:'Kursi Kayu'},
  {out:'f_table',need:{wood:6,fiber:2},name:'Meja Kayu'},
  {out:'f_bed',  need:{wood:6,fiber:6,leather:2},name:'Tempat Tidur'},
  {out:'f_chest',need:{wood:8,iron_ingot:1},name:'Peti Penyimpanan'},
  /* Perahu memakai kayu & serat biasa. Sebelumnya resep ini meminta item
     'plank' yang tidak pernah terdaftar di ITEMS, sehingga render daftar
     crafting berhenti dengan error dan panel Craft tidak pernah tampil. */
  {out:'f_boat', need:{wood:9,fiber:3,resin:1},name:'Perahu Kayu'},

  {out:'f_board',need:{wood:8,fiber:4,resin:2},name:'Papan Quest'},

  /* ---------- stasiun kerja ---------- */
  {out:'f_workbench',need:{wood:8,stone:4,fiber:2},name:'Meja Kerja'},
  {out:'f_stove',need:{stone:10,wood:4,coal:2},name:'Tungku Masak'},
  {out:'f_campfire',need:{wood:5,fiber:2,coal:1},name:'Api Unggun'},
  {out:'f_anvil',need:{iron_ingot:6,stone:6,wood:2},skill:'smith',prof:{mining:8},name:'Landasan Tempa'}
);


/* jumlah slot satu peti (grid 4×5 di panel penyimpanan) */
const CHEST_SLOTS=20;

/* ---------- dialog penduduk desa ----------
   chat  : obrolan ringan tentang desa / latar belakang dirinya
   intro : perkenalan diri sebelum menawarkan diri untuk ikut bergabung
   Baris dipilih acak supaya percakapan tidak terasa berulang. */
const NPC_DIALOG={
  guard:{chat:[
    'Desa ini berdiri sejak kakekku masih muda. Aku tak akan membiarkannya jatuh.',
    'Malam hari jangan jauh-jauh dari obor. Yang berkeliaran di luar bukan rusa.',
    'Aku terikat sumpah menjaga gerbang, jadi aku tak bisa ikut denganmu.',
    'Kalau kau dengar lolongan dari arah bukit, cepat masuk ke rumah.']},
  hunter:{
    chat:['Jejak rusa di utara makin sedikit belakangan ini.'],
    intro:['Aku pemburu desa ini. Sudah lama aku ingin melihat hutan yang lebih jauh.',
      'Panahku jarang meleset. Sayangnya berburu sendirian itu membosankan.']},
  miner:{
    chat:['Terowongan lama di bawah desa sudah kututup. Terlalu berbahaya.'],
    intro:['Aku menggali batu sejak kecil. Beri aku beliung, aku ikut ke mana pun.',
      'Katanya ada urat besi di balik bukit itu. Aku butuh teman perjalanan.']},
  herbal:{
    chat:['Jamur merah itu jangan dimakan mentah, percayalah padaku.'],
    intro:['Aku tabib desa. Lukamu itu... biar kuobati kalau kita berjalan bersama.',
      'Ramuanku bisa menahan racun, tapi aku tak bisa mengayunkan pedang.']},
  warrior:{
    chat:['Pedangku sudah lama tidak mencicipi monster.'],
    intro:['Aku petarung tanpa perang. Bawalah aku, biar tubuh ini berguna lagi.',
      'Kalau kau butuh perisai hidup di garis depan, akulah orangnya.']},
  guardian:{
    chat:['Perisaiku menahan tiga serangan golem. Ia masih utuh.',
      'Selama aku berdiri, tak ada yang lewat.'],
    intro:['Aku Guardian. Aku tak pandai menyerang, tapi tak ada yang tumbang di belakangku.',
      'Bawa aku, dan biarkan mereka memukulku, bukan dirimu.']},
  lionknight:{
    chat:['Aku mencium bau monster dari kejauhan... zirahku gatal ingin bertarung.',
      'Zirah emas ini ditempa di padang savana kuno, bukan oleh pandai besi biasa.',
      'Aumanku pernah meruntuhkan semangat seekor golem sebelum pedangku menyentuhnya.',
      'Selama suraiku masih berdiri, tak ada monster yang lewat dari sini.'],
    intro:['Aku Ksatria Singa dari savana timur. Pedang pusakaku haus akan monster kuat.',
      'Bawakan bekal yang layak untuk seorang ksatria, dan aku akan mengaum di sisimu.',
      'Tidak ada yang menembus zirah emasku. Ajak aku, biar kumakan cakar mereka.']},
  /* Dua pengembara langka: dialognya menyinggung perjalanan antar desa supaya
     pemain paham mereka bukan penduduk tetap. */
  elfmage:{
    chat:['Aku berjalan dari desa ke desa, mengumpulkan kabar yang tak tercatat.',
      'Kristal di staffku berdenyut bila ada sihir tua di dekat sini.',
      'Aku sedang menuntaskan permintaan tetua desa sebelah. Setelah itu, entah ke mana.',
      'Bangsaku hidup lama. Terlalu lama untuk menetap di satu tempat.'],
    intro:['Aku Penyihir Elf, pengembara. Perjalananmu tampak lebih menarik dari milikku.',
      'Berikan bahan sihir yang kubutuhkan, dan tongkat ini akan menerangi jalanmu.',
      'Aku bisa memberkati rekan-rekanmu. Tapi berkat tidak diberikan gratis.']},
  stonegiant:{
    chat:['Aku berjalan sejak batu ini masih gunung. Desa datang dan pergi.',
      'Kakiku berat, tapi tak ada tebing yang menghalangiku.',
      'Aku mengantar pesan antar desa. Tak ada yang berani merampokku.',
      'Mace ini pernah membelah golem jadi dua tumpuk kerikil.'],
    intro:['Aku Raksasa Batu. Aku berjalan sendiri, tapi bisa berjalan bersamamu.',
      'Beri aku besi dan batu, lalu tunjukkan siapa yang harus kuhantam.',
      'Tubuhku tembok, mace-ku badai. Pilih tempatku berdiri.']},
  rabbitwarrior:{
    chat:['Cakarku lebih tajam dari pedang mana pun. Percayalah.',
      'Aku berkelana mengasah teknik cakar di tiap hutan yang kulewati.',
      'Kelinci lain lari dari bahaya. Aku justru mengejarnya.',
      'Lima cakaran sebelum kau sempat berkedip. Itu janjiku.'],
    intro:['Aku Kelinci Cakar, pengembara. Kudengar kau sering dikeroyok monster.',
      'Bawakan bekal yang layak, dan cakarku akan mencabik mereka untukmu.',
      'RAPID CLAW-ku belum pernah gagal. Ajak aku, biar kubuktikan.']},
  goblin:{
    chat:['Hehehe... punggung monster itu empuk sekali untuk ditikam.',
      'Zirah emas ini rampasan... eh, maksudku hadiah dari ksatria yang baik hati.',
      'Kecil-kecil begini, aku pernah menunggangi golem. Serius!',
      'Kilau emas memang membuatku susah tidur. Tapi aku suka.'],
    intro:['Aku Goblin Emas, penunggang monster tercepat di hutan ini.',
      'Bawakan emas yang kumau, lalu saksikan aku melompat ke punggung monstermu.',
      'Lima tusukan sebelum monster sadar ada apa di punggungnya. Mau lihat langsung?']},
};


const NPC_DIALOG_FALLBACK={
  chat:['Hari yang tenang, ya? Semoga tetap begitu.'],
  intro:['Aku bosan di desa ini. Ajak aku pergi, mungkin?'],
};
/* ambil satu baris acak untuk peran & jenis dialog tertentu */
function npcLine(roleId,kind){
  const d=NPC_DIALOG[roleId];
  const arr=(d&&d[kind])||NPC_DIALOG_FALLBACK[kind]||NPC_DIALOG_FALLBACK.chat;
  return arr[Math.floor(Math.random()*arr.length)];
}


/* celetukan rekan saat kelaparan dan mencari makan sendiri */
const NPC_HUNGRY_LINES=[
  'Perutku keroncongan...','Aku lapar, cari makan dulu ya!',
  'Bekalku habis, aku petik buah dulu.','Kalau ada beri, aku mau...',
  'Tunggu sebentar, aku cari makanan.','Lapar sekali aku hari ini.',
];
function NPC_HUNGRY_LINE(){
  return NPC_HUNGRY_LINES[(Math.random()*NPC_HUNGRY_LINES.length)|0];
}

/* celetukan saat rekan terluka parah & memutuskan mundur dari pertarungan */
const NPC_RETREAT_LINES=[
  'Aku terluka parah! Mundur dulu!','Tidak sanggup lagi... aku menepi!',
  'Tahan mereka, aku obati diriku!','Darahku banyak keluar, aku mundur!',
  'Beri aku waktu, aku akan kembali!','Aku hampir tumbang! Lindungi aku!',
];
function NPC_RETREAT_LINE(){
  return NPC_RETREAT_LINES[(Math.random()*NPC_RETREAT_LINES.length)|0];
}
/* celetukan saat rekan sudah pulih dan siap bertarung kembali */
const NPC_REJOIN_LINES=[
  'Aku sudah pulih. Ayo lanjut!','Cukup istirahatnya, aku kembali!',
  'Lukaku menutup. Mari habisi mereka!','Sekarang aku siap bertarung lagi!',
];
function NPC_REJOIN_LINE(){
  return NPC_REJOIN_LINES[(Math.random()*NPC_REJOIN_LINES.length)|0];
}
