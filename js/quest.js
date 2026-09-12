'use strict';
/* =============================================================================
   SISTEM QUEST
   -----------------------------------------------------------------------------
   Modul ini berdiri sendiri: seluruh integrasi dilakukan dengan membungkus
   fungsi modul lain (Monsters.kill, RPG.craft, RPG.save, UI.toggle, UI.hudExtra)
   sehingga file lain nyaris tidak perlu diubah.

   Tiga jenis tujuan:
     kill   → membunuh sejumlah mob bertipe tertentu (dihitung lewat hook)
     craft  → membuat sejumlah item lewat crafting (dihitung lewat hook)
     gather → membawa sejumlah item di tas (dihitung langsung dari inventory,
              item baru dipotong saat hadiah diambil)

   Quest diambil dari PAPAN QUEST yang berdiri di dekat sumur desa; pemain juga
   bisa membuat papannya sendiri (item f_board) untuk dipasang di basis.
   ============================================================================= */
const Quest={
  MAX:3,                                  // quest aktif maksimum
  OFFER:3,                                // jumlah tawaran per papan
  SAVE_KEY:'forest_survival_quest_v1',
  active:[],                              // [{id,have}]
  done:{},                                // {id: berapa kali diselesaikan}
  board:null,                             // papan yang panelnya sedang dibuka

  /* =========================================================================
     RARITY QUEST (4 tingkat) & KALIBRASI HADIAH
     -------------------------------------------------------------------------
     Hadiah TIDAK lagi ditulis manual per quest (dulu xp datar 35–1000, yang
     jadi tidak berarti di level tinggi: quest xp 900 hanya 8,9% dari satu level
     pemain Lv 35). Sekarang XP & koin DIHITUNG dari level quest × rarity,
     memakai kurva XP pemain yang sesungguhnya:

         needXp(L) = 70 · L^1.4     (kurva Player.addXP)

     Tiap rarity memberi porsi tetap dari satu level pemain di level itu:

         common    4%      rare  15%
         uncommon  8%      epic  28%

     Jadi quest selalu terasa berharga di level mana pun — di Lv 1 quest epik
     memberi 20 XP, di Lv 45 memberi 4.043 XP.

     Koin dipatok ke biaya tempa (Anvil.COIN_BASE: common 15 · uncommon 30 ·
     rare 60 · epic 120 per tingkat), sehingga satu quest epik cukup membiayai
     satu kali tempa item rare.
     ========================================================================= */
  RARITY:{
    common   :{n:'Umum',       e:'⚪', css:'#b8c0cc', xp:0.04, coin:0.9, item:1},
    uncommon :{n:'Tidak Biasa',e:'🟢', css:'#63d471', xp:0.08, coin:1.6, item:2},
    rare     :{n:'Langka',     e:'🔵', css:'#4da3ff', xp:0.15, coin:3.0, item:3},
    epic     :{n:'Epik',       e:'🟣', css:'#b46bff', xp:0.28, coin:5.5, item:5},
  },
  RARITY_ORDER:['common','uncommon','rare','epic'],
  /* XP yang dibutuhkan pemain untuk naik dari level L (mengikuti Player.addXP) */
  needXp(L){return CFG.playerXpNeed(L);},
  rarOf(d){return this.RARITY[d&&d.rar]||this.RARITY.common;},
  /* XP hadiah quest.
     Porsi tetap dari satu level pemain, DENGAN LANTAI MINIMUM: di level rendah
     satu level pemain hanya butuh 70 XP (Lv1), jadi porsi 4% = 3 XP saja —
     terasa tidak berarti. Lantai (8+lvl·2) × bobot rarity menjaga quest awal
     tetap layak tanpa mengubah apa pun di level tinggi (di sana porsi selalu
     jauh lebih besar daripada lantainya). */
  questXp(d){
    const R=this.rarOf(d);
    const share=this.needXp(d.lvl)*R.xp;
    const floor=(8+d.lvl*2)*(R.xp/this.RARITY.common.xp);
    return Math.max(5,Math.round(Math.max(share,floor)));
  },
  /* koin hadiah quest */
  questCoin(d){
    const R=this.rarOf(d);
    return Math.max(5,Math.round((8+d.lvl*2.2)*R.coin));
  },
  /* jumlah tiap item hadiah: dasar dari definisi × pengali rarity, naik landai
     bersama level supaya hadiah bahan tetap relevan di level tinggi */
  rewardCount(d,base){
    const R=this.rarOf(d);
    return Math.max(1,Math.round(base*R.item*(1+0.03*(d.lvl-1))));
  },

  /* ---------------------------------------------------------------------------
     DEFINISI QUEST
     lvl : level minimum pemain agar quest ditawarkan
     rar : rarity (common | uncommon | rare | epic) → menentukan XP/koin/hadiah
     rep : true → bisa diambil berulang kali
     reward : {itemId: jumlah DASAR} — dikalikan rarity & level (rewardCount)

     ZONA MOB MENGIKUTI LEVEL PEMAIN (lihat Monsters.BIOME_LVL):
       Lv 1–20  : mob hutan, tundra, tepi sungai, reruntuhan
                  (slime, babi, serigala, golem, kelinci, lizard, yeti, reaper)
       Lv 20–30 : mob GURUN (kalajengking + babi/golem gurun)
       Lv 30–50 : mob TANAH MERAH / REDLANDS (kumbang, semut, kelabang)
       Lv 50–75 : mob PEGUNUNGAN (naga & golem) — zona biome tertinggi
       Lv 50+   : mob DUNGEON (reaper elit, Penjaga Agung) & material end-game
     Biome lain akan ditambahkan pada update berikutnya.
     --------------------------------------------------------------------------- */
  DEFS:[
    /* ===================== Lv 1–5 · sekitar desa ===================== */
    {id:'q_wood',   e:'🌲', name:'Tumpukan Kayu',       lvl:1, rar:'common', rep:true,
     type:'gather', target:'wood',  n:12,
     desc:'Desa perlu kayu untuk memperbaiki atap rumah.',
     reward:{bread:2,fiber:3}},
    {id:'q_stone',  e:'⛰️', name:'Batu Fondasi',        lvl:1, rar:'common', rep:true,
     type:'gather', target:'stone', n:14,
     desc:'Batu untuk memperkuat dinding sumur desa.',
     reward:{cmeat:2}},
    {id:'q_slime',  e:'💧', name:'Bersihkan Slime',     lvl:1, rar:'common', rep:true,
     type:'kill',   target:'slime', n:5,
     desc:'Slime berkeliaran di ladang dan merusak tanaman.',
     reward:{bandage:1,berry:3}},
    {id:'q_berry',  e:'🫐', name:'Keranjang Beri',      lvl:2, rar:'common', rep:true,
     type:'gather', target:'berry', n:10,
     desc:'Kedai desa menyiapkan pai dan kehabisan beri.',
     reward:{bread:2,mush:2}},
    {id:'q_boar',   e:'🐗', name:'Babi Perusak Ladang', lvl:3, rar:'uncommon', rep:true,
     type:'kill',   target:'boar',  n:4,
     desc:'Kawanan babi hutan menginjak-injak kebun beri.',
     reward:{leather:2,cmeat:2}},
    {id:'q_cook',   e:'🍖', name:'Perbekalan Pemburu',  lvl:3, rar:'common', rep:true,
     type:'craft',  target:'cmeat', n:4,
     desc:'Masak daging panggang sebagai perbekalan penjaga desa.',
     reward:{fiber:4,resin:2}},
    {id:'q_hoe',    e:'🪒', name:'Cangkul Petani',      lvl:4, rar:'uncommon', rep:false,
     type:'craft',  target:'hoe',   n:1,
     desc:'Petani desa kehilangan cangkulnya — buatkan yang baru.',
     reward:{seed_wheat:3,seed_carrot:2}},
    {id:'q_fish',   e:'🎣', name:'Tangkapan Sungai',    lvl:5, rar:'uncommon', rep:true,
     type:'gather', target:'fish',  n:6,
     desc:'Juru masak kedai ingin ikan segar dari sungai.',
     reward:{cfish:2,fiber:3}},

    /* ===================== Lv 6–12 · hutan & ladang ===================== */
    {id:'q_pelt',   e:'🐺', name:'Bulu untuk Musim Dingin', lvl:6, rar:'uncommon', rep:true,
     type:'gather', target:'pelt',  n:4,
     desc:'Penjahit desa butuh bulu serigala untuk mantel.',
     reward:{leather:2,bandage:1}},
    {id:'q_wolf',   e:'🌙', name:'Kawanan di Tepi Hutan', lvl:7, rar:'uncommon', rep:true,
     type:'kill',   target:'wolf',  n:5,
     desc:'Serigala mulai memangsa ternak saat malam.',
     reward:{leather:2,cmeat:2}},
    {id:'q_wheat',  e:'🌾', name:'Panen Gandum Pertama', lvl:7, rar:'common', rep:true,
     type:'gather', target:'wheat', n:10,
     desc:'Cangkul tanah, tanam benih, lalu antar gandumnya ke kedai.',
     reward:{bread:2,seed_wheat:2}},
    {id:'q_grill',  e:'🐟', name:'Ikan Bakar Kedai',    lvl:8, rar:'common', rep:true,
     type:'craft',  target:'cfish', n:5,
     desc:'Kedai kehabisan lauk — bakar ikan di api unggun atau tungku.',
     reward:{sugar_cane:3,berry:3}},
    {id:'q_rope',   e:'➰', name:'Tali Pawang',          lvl:9, rar:'uncommon', rep:true,
     type:'craft',  target:'rope',  n:3,
     desc:'Pawang desa memesan tali untuk menjinakkan mob liar.',
     reward:{leather:2,fiber:4}},
    {id:'q_veggie', e:'🥕', name:'Sayur untuk Kedai',   lvl:10, rar:'common', rep:true,
     type:'gather', target:'carrot', n:8,
     desc:'Wortel dari ladangmu dibeli kedai untuk sup.',
     reward:{seed_carrot:2,salad:1}},
    {id:'q_lizard', e:'🦎', name:'Kadal Rawa Tepi Sungai', lvl:10, rar:'rare', rep:true,
     type:'kill',   target:'lizard', n:3,
     desc:'Kadal rawa menyembur asam ke siapa pun yang mengambil air.',
     reward:{leather:2,bandage:2}},
    {id:'q_coal',   e:'🖤', name:'Bahan Bakar Tanur',   lvl:11, rar:'common', rep:true,
     type:'gather', target:'coal',  n:8,
     desc:'Pandai besi kehabisan batu bara untuk tanurnya.',
     reward:{iron_ore:3}},
    {id:'q_bench',  e:'🛠️', name:'Meja Kerja Desa',      lvl:12, rar:'uncommon', rep:false,
     type:'craft',  target:'f_workbench', n:1,
     desc:'Tukang desa ingin satu meja kerja lagi untuk bengkelnya.',
     reward:{iron_ingot:1,resin:3}},

    /* ===================== Lv 13–20 · tambang, tundra, reruntuhan ===================== */
    {id:'q_ingot',  e:'🔩', name:'Pesanan Pandai Besi', lvl:13, rar:'uncommon', rep:true,
     type:'craft',  target:'iron_ingot', n:3,
     desc:'Lebur bijih besi menjadi batang siap tempa.',
     reward:{coal:4,gold_ore:2}},
    {id:'q_saddle', e:'🐴', name:'Sadel Penunggang',    lvl:14, rar:'rare', rep:true,
     type:'craft',  target:'saddle', n:1,
     desc:'Pawang butuh sadel untuk menunggangi mob tangkapannya.',
     reward:{leather:3,rope:1}},
    {id:'q_golem',  e:'🗿', name:'Golem Hutan',          lvl:15, rar:'rare', rep:true,
     type:'kill',   target:'golem', n:2,
     desc:'Golem menghancurkan jalan menuju desa sebelah.',
     reward:{crystal:2,gold_ingot:1}},
    {id:'q_cake',   e:'🎂', name:'Kue Perayaan Desa',   lvl:15, rar:'uncommon', rep:true,
     type:'craft',  target:'cake',  n:2,
     desc:'Panen usai — kedai memesan kue untuk perayaan.',
     reward:{sugar:3,pie:1}},
    {id:'q_yeti',   e:'❄️', name:'Raksasa Salju Tundra', lvl:16, rar:'rare', rep:true,
     type:'kill',   target:'yeti',  n:3,
     desc:'Yeti mengusir pemburu dari jalur salju di utara.',
     reward:{pelt:3,crystal:1}},
    {id:'q_crystal',e:'💎', name:'Kristal Beku',         lvl:17, rar:'uncommon', rep:true,
     type:'gather', target:'crystal', n:5,
     desc:'Tetua desa memerlukan kristal untuk jimat pelindung.',
     reward:{iron_ingot:2,gold_ingot:1}},
    {id:'q_anvil',  e:'⚒️', name:'Landasan Tempa',       lvl:18, rar:'rare', rep:false,
     type:'craft',  target:'f_anvil', n:1,
     desc:'Bengkel desa ingin landasan tempa kedua untuk enchant.',
     reward:{gold_ingot:2,coal:5}},
    {id:'q_reaper', e:'💀', name:'Penjaga Reruntuhan',   lvl:19, rar:'rare', rep:true,
     type:'kill',   target:'reaper', n:2,
     desc:'Reaper bersabit menjaga peti di reruntuhan — bersihkan jalannya.',
     reward:{soul_shard:2,crystal:2}},
    {id:'q_soul',   e:'🔮', name:'Pecahan Jiwa',         lvl:20, rar:'rare', rep:true,
     type:'gather', target:'soul_shard', n:4,
     desc:'Tetua mempelajari pecahan jiwa dari dalam reruntuhan.',
     reward:{gold_ingot:2,bandage:3}},
    {id:'q_shell',  e:'🛡️', name:'Karapas untuk Zirah',  lvl:20, rar:'uncommon', rep:true,
     type:'gather', target:'centipede_shell', n:8,
     desc:'Pandai besi menempa zirah karapas untuk penjaga desa.',
     reward:{iron_ingot:3,leather:3}},

    /* ===================== Lv 20–30 · GURUN PASIR ===================== */
    {id:'q_scorp',  e:'🦂', name:'Sarang Kalajengking',  lvl:21, rar:'uncommon', rep:true,
     type:'kill',   target:'scorpion', n:5,
     desc:'Kalajengking gurun meresahkan kafilah pedagang.',
     reward:{venom:2,bandage:2}},
    {id:'q_venom',  e:'☠️', name:'Racun untuk Bilah',    lvl:23, rar:'rare', rep:true,
     type:'gather', target:'venom', n:6,
     desc:'Pandai besi meracik Shadow Tungsten Ninjato — butuh racun kalajengking gurun.',
     reward:{iron_ingot:3,gold_ore:3}},
    {id:'q_sand',   e:'🏜️', name:'Pasir Kaca Gurun',     lvl:24, rar:'common', rep:true,
     type:'gather', target:'sand', n:20,
     desc:'Perajin desa membakar pasir gurun menjadi kaca jendela.',
     reward:{coal:4,bread:2}},
    {id:'q_desgolem',e:'🗿', name:'Golem Batu Gurun',    lvl:25, rar:'rare', rep:true,
     type:'kill',   target:'golem', n:4,
     desc:'Golem gurun meruntuhkan sumur di jalur kafilah.',
     reward:{crystal:2,gold_ingot:2}},
    {id:'q_scorp2', e:'🦂', name:'Pembersihan Sarang Besar', lvl:27, rar:'epic', rep:true,
     type:'kill',   target:'scorpion', n:12,
     desc:'Seluruh sarang kalajengking harus dibersihkan sebelum musim dagang.',
     reward:{venom:4,gold_ingot:3,crystal:2}},
    {id:'q_gold',   e:'🥇', name:'Bijih Emas Gurun',     lvl:28, rar:'rare', rep:true,
     type:'gather', target:'gold_ore', n:12,
     desc:'Tambang gurun kaya emas — kumpulkan untuk kas desa.',
     reward:{gold_ingot:3,coal:5}},
    {id:'q_frost',  e:'❄️', name:'Yeti Glacier Claymore', lvl:29, rar:'epic', rep:false,
     type:'craft',  target:'sword_frost', n:1,
     desc:'Tempa pedang glasier es tundra untuk penjaga desa.',
     reward:{crystal:4,boss_core:1,gold_ingot:3}},

    /* ===================== Lv 30–50 · TANAH MERAH (REDLANDS) ===================== */
    {id:'q_kumbang',e:'🪲', name:'Kumbang Tanah Merah',  lvl:30, rar:'uncommon', rep:true,
     type:'kill',   target:'kumbang', n:5,
     desc:'Kumbang bertanduk melempar bongkahan batu ke jalur dagang.',
     reward:{centipede_shell:3,iron_ore:3}},
    {id:'q_semut',  e:'🐜', name:'Koloni Semut Raksasa', lvl:32, rar:'uncommon', rep:true,
     type:'kill',   target:'semut', n:6,
     desc:'Semut raksasa menggali terowongan sampai ke gudang desa.',
     reward:{centipede_shell:3,cmeat:3}},
    {id:'q_shell2', e:'🦴', name:'Karapas Tanah Merah',  lvl:34, rar:'rare', rep:true,
     type:'gather', target:'centipede_shell', n:16,
     desc:'Zirah karapas tingkat tinggi butuh cangkang dari Tanah Merah.',
     reward:{iron_ingot:4,gold_ingot:2}},
    {id:'q_kumbang2',e:'🪲', name:'Perburuan Kumbang Besar', lvl:36, rar:'epic', rep:true,
     type:'kill',   target:'kumbang', n:14,
     desc:'Kawanan kumbang menutup seluruh jalur menuju Tanah Merah.',
     reward:{centipede_shell:5,crystal:3,gold_ingot:3}},
    {id:'q_core',   e:'🧿', name:'Inti Boss',            lvl:38, rar:'rare', rep:true,
     type:'gather', target:'boss_core', n:3,
     desc:'Inti dari mob raksasa dipakai menempa perlengkapan kristal.',
     reward:{crystal:3,gold_ingot:3}},
    {id:'q_ritual', e:'☣️', name:'Bahan Ritual Altar',   lvl:40, rar:'epic', rep:true,
     type:'gather', target:'hard_shell', n:2,
     desc:'Bahan ritual Altar hanya jatuh dari mob di Tanah Merah — sangat langka.',
     reward:{boss_core:1,crystal:3,gold_ingot:2}},
    {id:'q_semut2', e:'🐜', name:'Sarang Semut Terdalam', lvl:42, rar:'epic', rep:true,
     type:'kill',   target:'semut', n:16,
     desc:'Sarang semut terdalam di Tanah Merah harus diruntuhkan.',
     reward:{centipede_shell:6,boss_core:1,crystal:3}},
    {id:'q_titan',  e:'🗡️', name:'Dragonfang Greatsword', lvl:44, rar:'epic', rep:false,
     type:'craft',  target:'sword_titan', n:1,
     desc:'Tempa greatsword naga terkuat dari inti boss Tanah Merah.',
     reward:{boss_core:2,crystal:4,gold_ingot:4}},
    {id:'q_dragon', e:'🐲', name:'Naga Pegunungan',      lvl:52, rar:'epic', rep:true,
     type:'kill',   target:'dragon', n:1,
     desc:'Naga di pegunungan membakar hutan setiap kali terbang. Pegunungan kini zona Lv 50–75.',
     reward:{boss_core:2,gold_ingot:4,crystal:3}},
    {id:'q_toxic',  e:'🧪', name:'Racun Berbisa Kelabang', lvl:48, rar:'epic', rep:true,
     type:'gather', target:'toxic_venom', n:2,
     desc:'Racun paling berbisa di Tanah Merah — hanya dari mob di sana.',
     reward:{boss_core:2,crystal:4}},
    {id:'q_kelabang',e:'🪱', name:'Kelabang dari Altar',  lvl:50, rar:'epic', rep:true,
     type:'kill',   target:'kelabang', n:1,
     desc:'Panggil kelabang raksasa lewat ritual Altar, lalu kalahkan.',
     reward:{boss_core:3,centipede_shell:8,crystal:5}},

    /* ===================== Lv 50–200 · DUNGEON & END-GAME =====================
       Di atas Lv 50 konten berpindah ke dungeon (mob dungeon bisa sampai Lv 100)
       dan material end-game. Quest di band ini menugaskan membunuh mob dungeon
       & mengumpulkan material langka yang hanya jatuh di sana, jadi papan quest
       tetap berguna sampai level cap 200. */
    {id:'q_reaper2', e:'💀', name:'Pasukan Reaper Reruntuhan', lvl:52, rar:'rare', rep:true,
     type:'kill',   target:'reaper', n:6,
     desc:'Reaper di dungeon Lv 11+ jauh lebih ganas — bersihkan satu benteng.',
     reward:{soul_shard:4,crystal:4,gold_ingot:3}},
    {id:'q_soul2',   e:'🔮', name:'Panen Pecahan Jiwa',       lvl:55, rar:'rare', rep:true,
     type:'gather', target:'soul_shard', n:10,
     desc:'Dungeon dalam menyimpan pecahan jiwa dalam jumlah besar.',
     reward:{boss_core:1,crystal:5,gold_ingot:3}},
    {id:'q_dguard',  e:'⚔️', name:'Penjaga Benteng Dalam',     lvl:60, rar:'epic', rep:true,
     type:'kill',   target:'reaper', n:10,
     desc:'Benteng dungeon Lv 20+ dijaga reaper elit yang tak kenal lelah.',
     reward:{soul_shard:6,boss_core:2,crystal:5}},
    {id:'q_crystal2',e:'💎', name:'Tambang Kristal Dalam',     lvl:65, rar:'rare', rep:true,
     type:'gather', target:'crystal', n:20,
     desc:'Urat kristal di dungeon dalam jauh lebih kaya dari permukaan.',
     reward:{gold_ingot:5,boss_core:1,crystal:5}},
    {id:'q_dboss1',  e:'👑', name:'Penjaga Agung Pertama',      lvl:70, rar:'epic', rep:true,
     type:'kill',   target:'reaper', n:1, boss:true,
     desc:'Tantang dan kalahkan Penjaga Agung sebuah dungeon.',
     reward:{boss_core:2,soul_shard:6,gold_ingot:5}},
    {id:'q_core2',   e:'🧿', name:'Inti Boss Ganda',           lvl:80, rar:'epic', rep:true,
     type:'gather', target:'boss_core', n:5,
     desc:'Kumpulkan inti boss dari beberapa dungeon untuk tempaan tertinggi.',
     reward:{boss_core:2,crystal:6,gold_ingot:6}},
    {id:'q_dguard2', e:'💀', name:'Legiun Reaper',             lvl:90, rar:'epic', rep:true,
     type:'kill',   target:'reaper', n:16,
     desc:'Dungeon Lv 40+ dipenuhi reaper — musnahkan satu legiun.',
     reward:{soul_shard:8,boss_core:2,crystal:6}},
    {id:'q_dboss2',  e:'👑', name:'Penakluk Reruntuhan',       lvl:100, rar:'epic', rep:true,
     type:'kill',   target:'reaper', n:1, boss:true,
     desc:'Kalahkan Penjaga Agung dungeon level tinggi.',
     reward:{boss_core:3,soul_shard:8,gold_ingot:8}},
    {id:'q_soul3',   e:'🔮', name:'Pecahan Jiwa Massal',       lvl:120, rar:'epic', rep:true,
     type:'gather', target:'soul_shard', n:24,
     desc:'Persediaan pecahan jiwa untuk ritual besar memerlukan ekspedisi panjang.',
     reward:{boss_core:3,crystal:8,gold_ingot:8}},
    {id:'q_dboss3',  e:'👑', name:'Dewa Reruntuhan',           lvl:150, rar:'epic', rep:true,
     type:'kill',   target:'reaper', n:1, boss:true,
     desc:'Hanya petarung terkuat yang sanggup menjatuhkan Penjaga Agung dungeon Lv 60+.',
     reward:{boss_core:4,soul_shard:10,gold_ingot:10}},
    {id:'q_core3',   e:'🧿', name:'Gudang Inti Boss',          lvl:180, rar:'epic', rep:true,
     type:'gather', target:'boss_core', n:10,
     desc:'Sepuluh inti boss — bukti penguasaan penuh atas dungeon.',
     reward:{boss_core:5,crystal:10,gold_ingot:12}},
    {id:'q_dboss4',  e:'👑', name:'Puncak Reruntuhan',         lvl:200, rar:'epic', rep:true,
     type:'kill',   target:'reaper', n:1, boss:true,
     desc:'Tantangan tertinggi: Penjaga Agung dungeon Lv 100 menanti.',
     reward:{boss_core:6,soul_shard:12,gold_ingot:15}},
  ],

  def(id){return this.DEFS.find(d=>d.id===id)||null;},
  isActive(id){return this.active.some(a=>a.id===id);},
  entry(id){return this.active.find(a=>a.id===id)||null;},

  /* jumlah progres saat ini: gather dibaca langsung dari tas supaya tetap
     akurat walau item dibuang, dititipkan ke peti, atau dipakai */
  have(a){
    const d=this.def(a.id);
    if(!d)return 0;
    if(d.type==='gather')return RPG.countItem(d.target);
    return a.have||0;
  },
  complete(a){
    const d=this.def(a.id);
    return !!d&&this.have(a)>=d.n;
  },

  /* ---------------------------------------------------------------------------
     TAWARAN PAPAN
     Papan berbeda menawarkan kombinasi berbeda (dirotasi memakai id papan),
     tetapi tetap stabil selama papan itu ada sehingga tidak "berkedip".

     Daftar quest sekarang panjang (Lv 1–10). Kalau tawaran diambil dari awal
     daftar saja, pemain level tinggi akan terus disuguhi quest Lv 1. Karena itu
     kandidat diurutkan dari yang PALING DEKAT dengan level pemain, lalu dipotong
     ke jendela beberapa tingkat terakhir sebelum dirotasi per papan.
     --------------------------------------------------------------------------- */
  TIER_WINDOW:3,                          // selisih level maksimum yang diutamakan
  offers(board){
    const lvl=(Player&&Player.level)||1;
    const pool=this.DEFS.filter(d=>
      lvl>=d.lvl&&!this.isActive(d.id)&&(d.rep||!this.done[d.id]));
    if(!pool.length)return [];
    /* utamakan quest sekelas level pemain; urutan stabil (bukan acak) supaya
       isi papan tidak berubah setiap kali panel dibuka */
    const sorted=pool.slice().sort((a,b)=>(b.lvl-a.lvl)||
      (this.DEFS.indexOf(a)-this.DEFS.indexOf(b)));
    let cand=sorted.filter(d=>lvl-d.lvl<=this.TIER_WINDOW);
    if(cand.length<this.OFFER)cand=sorted;
    const off=(board&&board.id)||0;
    const out=[];
    for(let i=0;i<Math.min(this.OFFER,cand.length);i++)
      out.push(cand[(off+i)%cand.length]);
    return out;
  },

  accept(id){
    const d=this.def(id);
    if(!d)return;
    if(this.active.length>=this.MAX){
      UI.toast(`📜 Maksimal ${this.MAX} quest aktif — selesaikan dulu salah satunya`);
      return;
    }
    if(this.isActive(id))return;
    this.active.push({id,have:0});
    Sfx.open();
    UI.toast(`📜 Quest diambil: ${d.e} ${d.name}`);
    this.save();this.refresh();
  },
  abandon(id){
    const i=this.active.findIndex(a=>a.id===id);
    if(i<0)return;
    const d=this.def(id);
    this.active.splice(i,1);
    Sfx.click();
    UI.toast(`🚫 Quest dilepas: ${d?d.name:id}`);
    this.save();this.refresh();
  },
  /* ambil hadiah; untuk quest gather, itemnya diserahkan (dipotong dari tas) */
  claim(id){
    const a=this.entry(id),d=this.def(id);
    if(!a||!d)return;
    /* Hadiah HANYA bisa diklaim di papan quest. Panel yang dibuka lewat tombol
       J berperan sebagai jurnal (lihat renderPanel); tombolnya sudah dimatikan
       di sana, dan pemeriksaan ini menutup jalur lain (mis. pemanggilan dari
       konsol atau sisa event listener). */
    if(!this.atBoard()){
      UI.toast('📍 Kembali ke papan quest di tavern untuk mengambil hadiah');
      return;
    }
    if(!this.complete(a)){UI.toast('Tujuan quest belum selesai');return;}
    if(d.type==='gather')RPG.removeItems({[d.target]:d.n});
    const got=[];
    for(const rid in (d.reward||{})){
      /* jumlah item hadiah dikalikan rarity & level (lihat rewardCount) */
      const n=this.rewardCount(d,d.reward[rid]);
      const left=RPG.addItem(rid,n);
      if(left<n){
        const rIco=(typeof UI!=='undefined'&&UI.itemIcon)?UI.itemIcon(rid):ITEMS[rid].e;
        got.push(`${rIco} ${ITEMS[rid].n} ×${n-left}`);
      }
      /* tas penuh → sisanya dijatuhkan di kaki pemain agar tidak hilang */
      if(left>0&&typeof FX!=='undefined')
        FX.spawnDrop(Player.pos.clone().add(new THREE.Vector3(0,0.6,0)),rid,left);
    }
    /* XP & koin dihitung dari level quest × rarity (lihat questXp/questCoin) */
    const xp=this.questXp(d),coin=this.questCoin(d);
    Player.addXP(xp);
    if(coin)RPG.addCoin(coin,true);
    this.done[d.id]=(this.done[d.id]||0)+1;
    this.active.splice(this.active.indexOf(a),1);
    Sfx.craft();
    const R=this.rarOf(d);
    const cIco=(typeof UI!=='undefined'&&UI.coinIcoHtml)?UI.coinIcoHtml(14):'🪙';
    UI.toast(`🏅 ${R.e} ${d.name} selesai! +${xp} XP · +${coin} ${cIco}${got.length?' · '+got.join(', '):''}`);
    if(typeof FX!=='undefined')
      FX.text(Player.pos.clone().add(new THREE.Vector3(0,2.4,0)),
        `+${xp} XP +${coin} koin`,R.css,'ui_coin');
    this.save();this.refresh();
    RPG.save();UI.renderBag&&UI.renderBag();UI.renderHotbar();
  },

  /* ---------------------------------------------------------------------------
     HOOK PROGRES
     --------------------------------------------------------------------------- */
  bump(type,target,n){
    let changed=false;
    for(const a of this.active){
      const d=this.def(a.id);
      if(!d||d.type!==type||d.target!==target)continue;
      if((a.have||0)>=d.n)continue;
      a.have=Math.min(d.n,(a.have||0)+(n||1));
      changed=true;
      if(a.have>=d.n)
        UI.toast(`✅ ${d.e} ${d.name} — tujuan tercapai, lapor ke papan quest`);
    }
    if(changed){this.save();this.refresh();}
  },
  onKill(type){this.bump('kill',type,1);},
  onCraft(id){this.bump('craft',id,1);},

  /* ---------------------------------------------------------------------------
     TAMPILAN
     -----------------------------------------------------------------------------
     DUA MODE, dibedakan oleh `this.board`:

       board terisi (dibuka dari PAPAN QUEST di tavern)
         → daftar quest aktif + tawaran papan; hadiah bisa diklaim di sini.

       board null (dibuka lewat tombol J / tombol HUD)
         → HANYA quest aktif. Tidak ada tawaran, dan tombol klaim dinonaktifkan
           dengan keterangan "lapor ke papan". Ini membuat papan quest punya
           fungsi nyata: mengambil DAN menyetorkan quest harus di tempatnya,
           bukan dari mana saja lewat satu tombol.
     --------------------------------------------------------------------------- */
  open(board){
    this.board=board||null;
    Sfx.open();
    if(UI.open!=='quest')UI.toggle('quest');
    else this.renderPanel();
  },
  /* apakah panel sedang dibuka DARI papan quest? */
  atBoard(){return !!this.board;},
  refresh(){
    if(UI.open==='quest')this.renderPanel();
    this.renderTracker();
  },
  bar(have,n){
    const p=Math.round(Math.min(1,have/n)*100);
    return `<div class="qbar"><i style="width:${p}%"></i></div>`;
  },
  rewardStr(d){
    const r=[`⭐ ${this.questXp(d)} XP`,`🪙 ${this.questCoin(d)} koin`];
    for(const id in (d.reward||{}))
      r.push(`${ITEMS[id].e} ${ITEMS[id].n} ×${this.rewardCount(d,d.reward[id])}`);
    return r.join(' · ');
  },
  /* label rarity untuk kartu quest */
  rarBadge(d){
    const R=this.rarOf(d);
    return `<span class="qrar" style="color:${R.css};border-color:${R.css}">`+
      `${R.e} ${R.n}</span>`;
  },
  /* ikon gambar quest: pakai PNG item target bila quest-nya gather/craft,
     ikon pet/monster bila kill, emoji bila tidak tersedia */
  questIcon(d){
    if(!d)return '📜';
    let file=null;
    if((d.type==='gather'||d.type==='craft')&&ITEMS[d.target])file=d.target;
    else if(d.type==='kill')file='pet_'+d.target;
    if(!file)return d.e;
    return `<img class="q-ico" src="buttons/${file}.png" alt="" onerror="this.outerHTML='${d.e}'">`;
  },
  goalStr(d,have){
    const t=d.type==='kill'?`Kalahkan ${MOB_NAME&&MOB_NAME[d.target]||d.target}`:
      d.type==='craft'?`Buat ${ITEMS[d.target]?ITEMS[d.target].n:d.target}`:
      `Kumpulkan ${ITEMS[d.target]?ITEMS[d.target].n:d.target}`;
    return `${t} — ${Math.min(have,d.n)}/${d.n}`;
  },

  renderPanel(){
    const el=document.getElementById('quest-body');
    if(!el)return;
    const atBoard=this.atBoard();
    /* judul & keterangan panel menyesuaikan mode (papan vs jurnal) */
    const ttl=document.getElementById('quest-title');
    if(ttl)ttl.innerHTML=atBoard
      ?'<img class="ph-ico" src="buttons/ui_scroll.png" alt="" onerror="this.outerHTML=\'📜\'"> Papan Quest'
      :'<img class="ph-ico" src="buttons/ui_scroll.png" alt="" onerror="this.outerHTML=\'📜\'"> Quest Aktif';
    const tip=document.getElementById('quest-tip');
    if(tip)tip.textContent=atBoard
      ?'Ambil quest dari papan, penuhi tujuannya, lalu kembali ke papan mana pun untuk mengambil hadiah.'
      :'Ini jurnal quest yang sedang kamu jalani. Untuk mengambil hadiah & quest baru, kunjungi papan quest di tavern desa.';
    const h=[];
    /* --- quest yang sedang dijalani --- */
    h.push(`<div class="sub">Quest Aktif ${this.active.length}/${this.MAX}</div>`);
    if(!this.active.length)
      h.push(atBoard
        ?'<p class="tip">Belum ada quest aktif. Ambil dari daftar di bawah.</p>'
        :'<p class="tip">Belum ada quest aktif. Kunjungi papan quest di tavern desa untuk mengambilnya.</p>');
    for(const a of this.active){
      const d=this.def(a.id);if(!d)continue;
      const have=this.have(a),ok=have>=d.n;
      /* Tombol klaim hanya AKTIF di papan. Di jurnal (tombol J) quest yang
         sudah tuntas ditandai "lapor ke papan" — sesuai alur yang diminta. */
      const canClaim=ok&&atBoard;
      const claimLabel=!ok?'⏳ Belum Selesai'
        :atBoard?'🏅 Ambil Hadiah':'📍 Lapor ke Papan Quest';
      h.push(
        `<div class="qcard r-${d.rar||'common'}${ok?' ok':''}">`+
        `<div class="qh"><b>${this.questIcon(d)} ${d.name}</b>`+
        `<span class="qlv">Lv ${d.lvl}+</span></div>`+
        `<div class="qmeta">${this.rarBadge(d)}</div>`+
        `<div class="qgoal">${this.goalStr(d,have)}</div>`+
        this.bar(have,d.n)+
        `<div class="qrew">${this.rewardStr(d)}</div>`+
        `<div class="qbtns">`+
        `<button class="mini q-claim${canClaim?'':' dim'}"`+
        `${canClaim?'':' disabled'} data-q="${d.id}">`+
        `${claimLabel}</button>`+
        `<button class="mini q-drop" data-q="${d.id}">🚫 Lepas</button>`+
        `</div></div>`);
    }
    /* --- tawaran dari papan: HANYA saat panel dibuka dari papan --- */
    if(atBoard){
      const off=this.offers(this.board);
      h.push('<div class="sub">Papan Pengumuman Desa</div>');
      if(!off.length)
        h.push('<p class="tip">Tidak ada tawaran baru untuk saat ini — naikkan level atau selesaikan quest yang berjalan.</p>');
      for(const d of off){
        const times=this.done[d.id]||0;
        h.push(
          `<div class="qcard offer r-${d.rar||'common'}">`+
          `<div class="qh"><b>${this.questIcon(d)} ${d.name}</b>`+
          `<span class="qlv">Lv ${d.lvl}+</span></div>`+
          `<div class="qmeta">${this.rarBadge(d)}</div>`+
          `<div class="qdesc">${d.desc}</div>`+
          `<div class="qgoal">${this.goalStr(d,d.type==='gather'?RPG.countItem(d.target):0)}</div>`+
          `<div class="qrew">${this.rewardStr(d)}`+
          `${times?` · <i>sudah ${times}×</i>`:''}</div>`+
          `<div class="qbtns"><button class="mini q-take" data-q="${d.id}">`+
          `📜 Ambil Quest</button></div></div>`);
      }
    }
    el.innerHTML=h.join('');
    if(typeof I18N!=='undefined'&&I18N.lang!=='id')I18N.localizeTree(el,I18N.lang);
    el.querySelectorAll('.q-take').forEach(b=>
      b.addEventListener('click',()=>this.accept(b.dataset.q)));
    el.querySelectorAll('.q-claim').forEach(b=>
      b.addEventListener('click',()=>this.claim(b.dataset.q)));
    el.querySelectorAll('.q-drop').forEach(b=>
      b.addEventListener('click',()=>this.abandon(b.dataset.q)));
  },

  /* pelacak ringkas di kanan layar; diklik untuk membuka panel */
  renderTracker(){
    const el=document.getElementById('questtrack');
    if(!el)return;
    if(!this.active.length||(typeof Game!=='undefined'&&!Game.started)){
      el.style.display='none';el.innerHTML='';return;
    }
    el.style.display='';
    const h=['<div class="qt-h"><img class="q-ico" src="buttons/ui_scroll.png" alt="" onerror="this.outerHTML=\'📜\'"> Quest</div>'];
    for(const a of this.active){
      const d=this.def(a.id);if(!d)continue;
      const have=this.have(a),ok=have>=d.n;
      const R=this.rarOf(d);
      h.push(
        `<div class="qt-row${ok?' ok':''}">`+
        `<span class="qt-n" style="border-left:2px solid ${R.css};padding-left:4px">`+
        `${this.questIcon(d)} ${d.name}</span>`+
        `<span class="qt-c">${Math.min(have,d.n)}/${d.n}</span>`+
        this.bar(have,d.n)+`</div>`);
    }
    el.innerHTML=h.join('');
    if(typeof I18N!=='undefined'&&I18N.lang!=='id')I18N.localizeTree(el,I18N.lang);
  },

  /* ---------------------------------------------------------------------------
     PENYIMPANAN
     --------------------------------------------------------------------------- */
  save(){
    try{
      localStorage.setItem(this.SAVE_KEY,JSON.stringify({
        a:this.active.map(a=>({i:a.id,h:a.have||0})),d:this.done}));
    }catch(e){}
  },
  load(){
    try{
      const o=JSON.parse(localStorage.getItem(this.SAVE_KEY));
      if(!o)return;
      if(Array.isArray(o.a))
        this.active=o.a.filter(x=>this.def(x.i)).map(x=>({id:x.i,have:x.h||0}));
      if(o.d&&typeof o.d==='object')this.done=o.d;
    }catch(e){}
  },
  clearSave(){
    try{localStorage.removeItem(this.SAVE_KEY);}catch(e){}
    this.active=[];this.done={};this.refresh();
  },
};

/* =============================================================================
   PAPAN QUEST: MODEL 3D MINECRAFT-DETAILED
   -----------------------------------------------------------------------------
   Gaya voxel/kotak penuh (tanpa silinder/bola) agar menyatu dengan estetika
   Minecraft: tiang balok kayu berukir, papan bergaris papan (plank), bingkai
   tebal, atap bersirap bertingkat, lentera kecil, dan lembaran quest berpaku.
   ============================================================================= */
Furni.buildBoard=function(){
  const wood=this.M('wood',0x8a5a2b),dark=this.M('wood',0x5d3c1c),
        plank=this.M('wood',0xa8703a),plankL=this.M('wood',0xbb8148),
        paper=this.M('paper',0xf2e9cf),paperD=this.M('paper',0xe0d4b4),
        ink=this.M('paper',0x6b5a3a),
        iron=this.M('metal',0x8d949e),ironD=this.M('metal',0x5f666e),
        lamp=this.M('lamp',0xffd98a);
  const g=new THREE.Group();
  const box=(w,h,d,mat,x,y,z)=>{
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;
  };

  /* ---------- dua tiang balok kayu (kotak, bukan silinder) ---------- */
  for(const sx of[-1,1]){
    box(0.18,1.9,0.18,dark,sx*0.66,0.95,0);            // tiang utama
    /* ukiran/ring di tiang tiap 0.45 blok */
    for(const yy of[0.35,0.80,1.25,1.70])
      box(0.22,0.06,0.22,wood,sx*0.66,yy,0);
    box(0.24,0.10,0.24,wood,sx*0.66,1.92,0);           // kepala tiang
    /* kaki penopang miring ke tanah */
    box(0.12,0.12,0.34,dark,sx*0.66,0.08,0.16);
  }
  /* palang penghubung bawah antar tiang */
  box(1.34,0.12,0.14,dark,0,0.24,0);

  /* ---------- papan utama: susunan bilah plank horizontal ---------- */
  const boardY=1.28;
  for(let i=0;i<5;i++){
    const m=(i%2===0)?plank:plankL;
    box(1.42,0.19,0.10,m,0,boardY-0.38+i*0.195,0.02);
  }
  /* bingkai tebal keliling papan */
  box(1.58,0.10,0.14,dark,0,boardY+0.56,0.02);         // atas
  box(1.58,0.10,0.14,dark,0,boardY-0.52,0.02);         // bawah
  box(0.10,1.18,0.14,dark,-0.74,boardY+0.02,0.02);     // kiri
  box(0.10,1.18,0.14,dark, 0.74,boardY+0.02,0.02);     // kanan
  /* paku besi di keempat sudut bingkai */
  for(const sx of[-1,1])for(const sy of[-1,1])
    box(0.07,0.07,0.05,ironD,sx*0.70,boardY+sy*0.50,0.10);

  /* ---------- atap sirap bertingkat (2 undakan tiap sisi) ---------- */
  box(1.80,0.12,0.30,dark,0,1.98,0.10);
  box(1.62,0.11,0.26,wood,0,2.08,0.16);
  box(1.40,0.10,0.22,dark,0,2.17,0.21);
  /* balok punggungan */
  box(1.86,0.08,0.10,ironD,0,2.24,0.20);

  /* ---------- lentera kecil di sisi kanan atap ---------- */
  box(0.10,0.10,0.10,ironD,0.62,1.86,0.24);            // gantungan
  box(0.16,0.18,0.16,iron,0.62,1.72,0.24);             // rangka
  box(0.11,0.13,0.11,lamp,0.62,1.72,0.24);             // nyala

  /* ---------- lembaran quest berpaku (kotak tipis) ---------- */
  const sheets=[[-0.44,1.50,0.30,0.36],[0.04,1.54,0.32,0.40],
                [0.48,1.44,0.28,0.32],[-0.18,1.06,0.30,0.28],
                [0.40,1.02,0.26,0.24]];
  for(const s of sheets){
    box(s[2],s[3],0.03,(Math.random()<0.5?paper:paperD),s[0],s[1],0.10);
    /* garis tulisan: 3 bilah tipis */
    for(let i=0;i<3;i++)
      box(s[2]*0.68,0.025,0.012,ink,s[0],s[1]+0.08-i*0.075,0.12);
    /* paku di sudut atas kiri & kanan lembar */
    for(const sx of[-1,1])
      box(0.045,0.045,0.035,ironD,s[0]+sx*(s[2]/2-0.04),s[1]+s[3]/2-0.03,0.125);
  }
  return g;
};

Furni.DEFS.board={
  n:'Papan Quest',e:'📜',item:'f_board',r:2.2,label:'📜 Papan Quest',
  build(){return Furni.buildBoard();},
  use(f){Quest.open(f);},
};

/* =============================================================================
   INTEGRASI DENGAN MODUL LAIN (membungkus fungsi asli)
   ============================================================================= */
(function(){
  /* ---------- progres dari membunuh mob ---------- */
  const _kill=Monsters.kill.bind(Monsters);
  Monsters.kill=function(m){
    const t=m&&m.type;
    _kill(m);
    if(t)Quest.onKill(t);
  };

  /* ---------- progres dari crafting ---------- */
  const _craft=RPG.craft.bind(RPG);
  RPG.craft=function(r,count){
    const made=_craft(r,count);
    if(r&&made>0)for(let i=0;i<made;i++)Quest.onCraft(r.out);
    return made;
  };

  /* ---------- ikut alur simpan/hapus save milik RPG ---------- */
  const _save=RPG.save.bind(RPG);
  RPG.save=function(){_save();Quest.save();};
  const _clear=RPG.clearSave.bind(RPG);
  RPG.clearSave=function(){_clear();Quest.clearSave();};

  /* ---------- panel quest ---------- */
  UI.PANELS.push('quest');
  const _toggle=UI.toggle.bind(UI);
  UI.toggle=function(name){
    _toggle(name);
    if(UI.open==='quest')Quest.renderPanel();
    else if(name==='quest')Quest.board=null;   // panel ditutup → lepas papan
  };

  const panel=document.createElement('div');
  panel.className='panel hidden';panel.id='panel-quest';
  panel.innerHTML=
    '<h2><span id="quest-title"><img class="ph-ico" src="buttons/ui_scroll.png" alt="" onerror="this.outerHTML=\'📜\'"> Papan Quest</span> '+
    '<button class="x" data-close="quest">✕</button></h2>'+
    '<p class="tip" id="quest-tip">Ambil quest dari papan di desa, penuhi tujuannya, lalu '+
    'kembali ke papan mana pun untuk mengambil hadiah.</p>'+
    '<div id="quest-body"></div>';
  document.body.appendChild(panel);

  /* Pelacak quest di sisi kanan HUD bersifat INFORMATIF saja.
     BUGFIX: dulu ada listener klik yang membuka Papan Quest, sehingga menekan
     pelacak (atau menyentuhnya di layar sentuh) memungkinkan pemain mengambil
     quest lain tanpa berada di papan. Listener dihapus dan elemennya dibuat
     tembus-klik lewat CSS (pointer-events:none). */
  const track=document.createElement('div');
  track.id='questtrack';track.style.display='none';
  document.body.appendChild(track);


  /* ---------- pelacak ikut diperbarui bersama HUD ----------
     updateHUD dipanggil tiap frame oleh Game.loop; pelacak hanya digambar
     ulang tiap ~0.4 detik supaya tidak membebani DOM. */
  const _hud=UI.updateHUD.bind(UI);
  UI.updateHUD=function(){
    _hud();
    const t=performance.now();
    if(t-(Quest.trackT||0)>400){Quest.trackT=t;Quest.renderTracker();}
  };


  /* ---------- papan quest kini berada DI DALAM TAVERN ----------
     Dulu papan dipasang di halaman sumur. Sekarang papan sudah menjadi bagian
     dari peta perabot TAVERN (worldgen: TAVERN_MODEL.furn berisi id 'board'),
     jadi Furni.furnishVillage otomatis memasangnya di dinding dalam tavern.
     Hook di bawah hanya jadi JARING PENGAMAN: bila karena satu hal papan tidak
     terpasang (mis. bentrok perabot), papan dipasang ulang di tengah tavern. */
  const _furnish=Furni.furnishVillage.bind(Furni);
  Furni.furnishVillage=function(v){
    _furnish(v);
    if(!v||!v.plan)return;
    const key=v.x+','+v.z,FLOOR=CFG.SEA;
    /* apakah sudah ada papan milik desa ini? */
    const has=this.list.some(f=>f.d==='board'&&f.vkey===key);
    if(has)return;
    const tv=v.tavern;
    if(!tv)return;
    /* coba beberapa titik di dalam tavern yang belum terpakai */
    const spots=[[tv.x+1.6,tv.z+tv.d/2,-Math.PI/2],
                 [tv.x+tv.w-1.6,tv.z+tv.d/2,Math.PI/2],
                 [tv.cx,tv.z+1.6,0]];
    for(const s of spots){
      let blocked=false;
      for(const f of this.list)
        if(Math.hypot(f.x-s[0],f.z-s[1])<1.2){blocked=true;break;}
      if(blocked)continue;
      const f=this.place('board',s[0],FLOOR,s[1],s[2],true);
      if(f)f.vkey=key;
      return;
    }
  };


  /* ---------- tombol J: buka/tutup JURNAL quest ----------
     Selalu membuka mode jurnal (board=null) — hanya quest aktif, tanpa tawaran
     & tanpa klaim. Papan quest sungguhan dibuka dengan mendekati papannya di
     tavern (Furni 'board' → Quest.open(board)). */
  window.addEventListener('keydown',e=>{
    if(e.code!=='KeyJ')return;
    if(typeof Game==='undefined'||!Game.started)return;
    if(UI.open==='quest'){UI.toggle('quest');return;}
    Quest.board=null;
    UI.toggle('quest');
  });

  Quest.load();
})();
