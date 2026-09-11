'use strict';
/* =========================================================================
   SKILLS / PROFICIENCY — sistem "belajar dengan melakukan" ala Durango
   -------------------------------------------------------------------------
   Ini adalah LAPISAN BARU di atas sistem yang sudah ada:
     - Player.addXP()  -> level karakter (TIDAK diubah, rasanya tetap sama)
     - RPG.sp + SKILLS -> skill tree (TIDAK diubah)

   Lapisan ini menambah "proficiency": tiap aksi produktif (menebang,
   menambang, bertarung, crafting, memasak, bertani, memanen) menaikkan
   level sub-skill terkait. Semakin tinggi levelnya, semakin efisien aksinya
   (peluang hasil tambahan), dan XP-nya mengikuti kurva "graying" supaya
   pemain terdorong mencari tantangan yang setara (anti-grinding statis).

   Prinsip integrasi (aman & non-destruktif):
     - gain() dipanggil BERDAMPINGAN dengan Player.addXP() di titik aksi.
     - Semua state bisa di-serialize untuk save/load, dan dirancang agar
       mudah dipindah ke server (multiplayer) nanti karena murni data.
   ========================================================================= */

/* ---------- definisi sub-skill (data-driven, mudah di-tune) ----------
   base & exp membentuk kurva XP: need(level)=round(base*level^exp).
   max = level maksimum sub-skill tersebut. */
const SUBSKILLS={
  logging:   {name:'Penebangan',  icon:'🪓', branch:'gathering', base:40, exp:1.30, max:50},
  mining:    {name:'Penambangan', icon:'⛏️', branch:'gathering', base:50, exp:1.35, max:50},
  harvesting:{name:'Pemanenan',   icon:'🌿', branch:'gathering', base:35, exp:1.30, max:50},
  combat:    {name:'Pertarungan', icon:'⚔️', branch:'combat',    base:60, exp:1.35, max:50},
  /* Penangkisan: naik setiap kali tameng benar-benar berhasil menahan
     serangan (lihat Player.takeDamage → Prof.gainParry). Levelnya menambah
     peluang & kekuatan tangkisan, jadi perisai makin andal karena DIPAKAI. */
  blocking:  {name:'Penangkisan',  icon:'🛡️', branch:'combat',    base:55, exp:1.32, max:50},
  crafting:  {name:'Kriya',       icon:'🔨', branch:'crafting',  base:80, exp:1.40, max:50},
  cooking:   {name:'Memasak',     icon:'🍳', branch:'survival',  base:45, exp:1.30, max:50},
  farming:   {name:'Pertanian',   icon:'🌾', branch:'survival',  base:55, exp:1.35, max:50},
  /* Kelincahan: naik saat dodge & lompat; dipakai untuk meng-gate skill gerak */
  agility:   {name:'Kelincahan',  icon:'💨', branch:'movement',  base:50, exp:1.35, max:50},
};

/* ---------- pemetaan blok -> sub-skill (dipakai World.breakBlock) ----------
   `lvl` = "level aksi". Makin tinggi, makin lama XP-nya mulai berkurang
   (graying), sehingga menambang kristal tetap berharga walau Penambangan
   sudah tinggi. Nilai XP sebanding dengan kesulitan blok (lihat hp di
   BLOCK_INFO). */
const BLOCK_PROF={};
BLOCK_PROF[B.WOOD]        ={sk:'logging',    xp:5,  lvl:1};
BLOCK_PROF[B.PLANK]       ={sk:'logging',    xp:3,  lvl:1};
BLOCK_PROF[B.ROOF]        ={sk:'logging',    xp:3,  lvl:1};
BLOCK_PROF[B.STONE]       ={sk:'mining',     xp:8,  lvl:1};
BLOCK_PROF[B.ORE_COAL]    ={sk:'mining',     xp:10, lvl:4};
BLOCK_PROF[B.ORE_COPPER]  ={sk:'mining',     xp:12, lvl:7};
BLOCK_PROF[B.ORE_IRON]    ={sk:'mining',     xp:15, lvl:12};
BLOCK_PROF[B.ORE_STEEL]   ={sk:'mining',     xp:24, lvl:18};
BLOCK_PROF[B.ORE_GOLD]    ={sk:'mining',     xp:22, lvl:22};
BLOCK_PROF[B.ORE_TUNGSTEN]={sk:'mining',     xp:26, lvl:26};
BLOCK_PROF[B.ORE_CRYSTAL] ={sk:'mining',     xp:30, lvl:32};
BLOCK_PROF[B.ORE_TUNGSTENSTEEL]={sk:'mining',xp:34, lvl:38};
BLOCK_PROF[B.LEAF]        ={sk:'harvesting', xp:2,  lvl:1};

/* =========================================================================
   PROF — objek utama proficiency
   ========================================================================= */
const Prof={
  lvl:{},   // level tiap sub-skill
  xp:{},    // progres XP menuju level berikutnya

  /* pastikan semua sub-skill punya state (game baru / load) */
  init(){
    for(const id in SUBSKILLS){
      if(this.lvl[id]===undefined)this.lvl[id]=1;
      if(this.xp[id]===undefined)this.xp[id]=0;
    }
  },
  reset(){ this.lvl={}; this.xp={}; this.init(); },

  level(id){ return this.lvl[id]||1; },

  /* XP yang dibutuhkan untuk naik dari level saat ini */
  need(id){
    const s=SUBSKILLS[id]; if(!s)return Infinity;
    return Math.round(s.base*Math.pow(this.level(id), s.exp));
  },

  /* ---------- graying (anti-grinding statis) ----------
     Aksi yang "level aksi"-nya jauh di bawah level proficiency memberi XP
     berkurang, mendorong pemain mencari tantangan setara. Ada floor 0.1 agar
     tidak pernah benar-benar 0 (tetap ada progres kecil). */
  gray(id, actionLevel){
    const diff=this.level(id)-(actionLevel||1);
    if(diff<=0)return 1;
    return clamp(1-diff*0.12, 0.1, 1);
  },

  /* ---------- tambah XP proficiency ----------
     return true bila terjadi minimal satu level-up (untuk feedback ekstra). */
  gain(id, baseXP, actionLevel){
    if(!SUBSKILLS[id]||baseXP<=0)return false;
    const s=SUBSKILLS[id];
    const amount=baseXP*this.gray(id, actionLevel);
    if(amount<=0)return false;
    this.xp[id]=(this.xp[id]||0)+amount;
    let leveled=false;
    while(this.level(id)<s.max && this.xp[id]>=this.need(id)){
      this.xp[id]-=this.need(id);
      this.lvl[id]=this.level(id)+1;
      leveled=true;
      this.onLevelUp(id);
    }
    if(this.level(id)>=s.max)this.xp[id]=0; // cap: XP tidak menumpuk di max
    /* refresh panel hanya saat panel skill terbuka (hemat DOM) */
    if(typeof UI!=='undefined'&&UI.open==='skills'&&UI.renderProficiency)UI.renderProficiency();
    return leveled;
  },

  /* jalur cepat dari pemecahan blok (World.breakBlock) */
  gainBlock(blockId){
    const def=BLOCK_PROF[blockId];
    if(def)this.gain(def.sk, def.xp, def.lvl);
  },

  onLevelUp(id){
    const s=SUBSKILLS[id], lv=this.level(id);
    if(typeof UI!=='undefined'&&UI.toast)UI.toast(`${s.icon} ${s.name} naik ke Lv ${lv}!`);
    if(typeof Sfx!=='undefined'&&Sfx.levelup)Sfx.levelup();
    if(typeof FX!=='undefined'&&FX.text&&typeof Player!=='undefined'&&Player.pos)
      FX.text(Player.pos.clone().add(new THREE.Vector3(0,2.4,0)),
        `${s.icon} ${s.name} Lv ${lv}`,'#ffd24d');
  },

  /* ---------- efek gameplay dari level proficiency ----------
     Dipanggil sistem dunia untuk membuat kenaikan level TERASA. */

  /* peluang hasil tambahan (0..0.25); aktif mulai level 5 */
  yieldBonus(id){
    const l=this.level(id);
    return l<5?0:Math.min(0.25,(l-4)*0.01);
  },
  /* peluang hasil tambahan untuk sebuah blok (mapping BLOCK_PROF) */
  yieldForBlock(blockId){
    const def=BLOCK_PROF[blockId];
    return def?this.yieldBonus(def.sk):0;
  },
  /* +1% kecepatan aksi per level, cap +50%. Dipakai Player saat memukul blok
     supaya gathering makin cepat seiring naiknya proficiency terkait. */
  speedBonus(id){ return Math.min(0.5,(this.level(id)-1)*0.01); },

  /* ---------- efek proficiency bertarung ----------
     Makin sering bertarung, serangan makin kuat & kritis. +1% damage dan
     +0.3% crit per level (cap +50% damage, +15% crit). */
  combatDmg(){ return Math.min(0.5,(this.level('combat')-1)*0.01); },
  combatCrit(){ return Math.min(0.15,(this.level('combat')-1)*0.003); },

  /* ---------- efek proficiency penangkisan ----------
     +0.5% peluang block per level (cap +20%) dan +0.6% kekuatan block per
     level (cap +25%). Karena XP-nya hanya didapat dari tangkisan yang BERHASIL,
     satu-satunya cara menaikkannya adalah benar-benar bertahan di pertarungan. */
  blockChance(){ return Math.min(0.20,(this.level('blocking')-1)*0.005); },
  blockPower(){ return Math.min(0.25,(this.level('blocking')-1)*0.006); },
  /* XP saat sebuah tangkisan berhasil. `actionLevel` diambil dari damage
     serangan yang ditahan supaya menahan pukulan besar lebih berharga
     (graying: menahan slime terus-terusan cepat kehilangan nilai).
     CATATAN NAMA: gainBlock() sudah dipakai untuk memecah BLOK dunia, jadi
     penangkisan memakai nama gainParry() agar tidak bertabrakan. */
  gainParry(rawDmg){
    const lvl=clamp(Math.round((rawDmg||0)/3),1,40);
    this.gain('blocking',6,lvl);
  },

  /* ---------- save / load ----------
     Murni data sehingga nanti bisa divalidasi di server (multiplayer). */
  serialize(){ return {lvl:Object.assign({},this.lvl), xp:Object.assign({},this.xp)}; },
  load(data){
    this.reset();
    if(!data)return;
    if(data.lvl)for(const id in data.lvl)if(SUBSKILLS[id])this.lvl[id]=data.lvl[id];
    if(data.xp)for(const id in data.xp)if(SUBSKILLS[id])this.xp[id]=data.xp[id];
  },
};
Prof.init();
