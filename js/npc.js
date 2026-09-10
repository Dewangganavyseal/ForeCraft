'use strict';
/* --------------------------------------------------------------------------- 
   NPC Desa & Rekan Tim
   --------------------------------------------------------------------------- 
   NPC muncul di sekitar desa (WGEN.villageAt) memakai arketipe dari NPC_ROLES.
   Setiap NPC punya HP, level, XP, dan satu skill pasif miliknya sendiri, serta
   bisa dilukai monster (Monsters memanggil NPCS.hurt lewat AI di bawah).

   Sebagian arketipe bisa direkrut (role.recruit) dengan memenuhi permintaan
   bahan yang diacak per-NPC. Rekan yang bergabung akan:
     - mengikuti pemain (state 'follow') dan ikut bertarung,
     - membawa tas sendiri (n.bag) yang isinya bisa diambil pemain,
     - bisa diberi makanan (langsung menyembuhkan) & equipment (menaikkan stat),
     - bisa diperintah mengumpulkan resource di radius terbatas dari pemain.
   Maksimum rekan aktif = CFG.NPC.TEAM_MAX (3).
--------------------------------------------------------------------------- */
const NPCS={
  list:[],team:[],timer:0,uid:1,

  /* ---------- helper arketipe ---------- */
  role(n){return n.role;},
  /* =========================================================================
     REKAN HILANG TAPI IKONNYA MASIH ADA — perbaikan menyeluruh
     -------------------------------------------------------------------------
     Laporan pemain: rekan tiba-tiba hilang entah ke mana, berlari menjauh
     tidak membuatnya muncul lagi, tapi ikonnya tetap terdaftar di party.

     Akar masalah: keanggotaan tim ditentukan dari STATE (isTeam membaca
     n.state). Bila state rekan sempat keluar dari follow/gather/wait —
     cukup satu frame — maka:

       1. isTeam(n) = false → cabang recall (teleport ke pemain) TIDAK jalan,
          dan karena wander=false, rekan di-despawn saat >70 blok:
          mesh dibuang dari scene. Yang tidak ikut dibuang: entri di
          this.team & UI ikon. Hasilnya persis yang dilaporkan: ikon ada,
          tubuhnya tidak.

     Tiga lapis perbaikan:

       a. isTeam memeriksa keanggotaan this.team LANGSUNG (indexOf), bukan
          menebak dari state. Rekan yang di-dismiss sengaja dikeluarkan dari
          this.team lebih dulu di dismiss(), jadi perilaku lain tidak berubah.
       b. Pemeriksaan despawn memakai keanggotaan tim juga — rekan TIDAK PERNAH
          dibuang karena jarak, apa pun statenya; yang tertinggal jauh cukup
          di-teleport.
       c. Penjaga mesh di akhir update: bila mesh rekan entah bagaimana tidak
          lagi berada di scene (referensi hilang), ia dibuat ulang dari
          buildModel + refreshGear dan diletakkan di samping pemain. Ini jaring
          pengaman untuk jalur yang belum kita ketahui.

     isTeam dipanggil ±18 kali per frame (tim maks 3 + list penduduk), jadi
     indexOf pada array ≤3 elemen biayanya dapat diabaikan.
     ========================================================================= */
  isTeam(n){return this.team.indexOf(n)>=0;},
  teamFull(){return this.team.length>=CFG.NPC.TEAM_MAX;},

  /* ---------- PERLENGKAPAN ACAK ROYAL GUARD ----------
     Setiap RG yang lahir mengundi pedang & tamengnya sendiri. Bobot menentukan
     kelangkaan: common paling sering, legendaris paling jarang
     (pedang: legendaris ±8% · tameng: legendaris ±3%, epik ±14%). */
  RG_WEAPON_POOL:[
    {id:'sword_wood',  w:24},   // common
    {id:'sword_iron',  w:18},   // uncommon
    {id:'sword_storm', w:10},   // rare
    {id:'sword_venom', w:6},    // epic
    {id:'sword_frost', w:3},    // legendary
    {id:'sword_titan', w:2},    // legendary
  ],
  RG_SHIELD_POOL:[
    {id:'shield_wood',  w:24},  // common
    {id:'shield_iron',  w:18},  // uncommon
    {id:'shield_flame', w:10},  // rare
    {id:'shield_venom', w:8},   // rare
    {id:'shield_storm', w:6},   // epic
    {id:'shield_frost', w:4},   // epic
    {id:'shield_dark',  w:2},   // legendary
  ],
  rollWeighted(pool){
    let total=0;
    for(const e of pool)total+=e.w;
    let p=Math.random()*total;
    for(const e of pool){p-=e.w;if(p<=0)return e.id;}
    return pool[pool.length-1].id;
  },
  rollRoyalGuardGear(n){
    if(!n.gear)n.gear={weapon:null,helm:null,chest:null,boots:null};
    if(!n.gear.weapon)n.gear.weapon=this.rollWeighted(this.RG_WEAPON_POOL);
    if(!n.gear.shield)n.gear.shield=this.rollWeighted(this.RG_SHIELD_POOL);
    if(typeof NPC_Royalguard!=='undefined'&&NPC_Royalguard.refreshGear)
      NPC_Royalguard.refreshGear(n);
  },

  /* Permintaan rekrut: jumlah & variasi bahan SCALING dengan level NPC.
     Makin besar level NPC, makin banyak & makin berat permintaannya. */  rollDemand(role, lvl=1){
    if(!role.recruit||!role.ask.length)return null;
    const L=Math.max(1,Math.round(lvl||1));
    const pool=role.ask.slice();
    const need={};
    /* NPC level tinggi meminta lebih banyak macam bahan (3-4 jenis untuk Lv 40+) */
    const cnt=L>=45?Math.min(pool.length,3+(Math.random()<0.5?1:0))
             :L>=20?Math.min(pool.length,2+(Math.random()<0.5?1:0))
             :Math.min(pool.length,2);
    for(let i=0;i<cnt&&pool.length;i++){
      const id=pool.splice(Math.floor(Math.random()*pool.length),1)[0];
      const rare=(id==='iron_ore'||id==='gold_ore'||id==='iron_ingot'||id==='gold_ingot'||
                  id==='pelt'||id==='resin'||id==='leather'||id==='crystal'||id==='soul_shard');
      /* Jumlah scaling dengan level:
         - bahan langka: 2..4 di Lv 1, naik s.d. 8..15 di Lv 75
         - bahan biasa: 4..10 di Lv 1, naik s.d. 18..40 di Lv 75 */
      if(rare){
        const base=2+Math.floor(Math.random()*3);
        need[id]=Math.max(2,Math.round(base*(1+0.045*(L-1))));
      }else{
        const base=4+Math.floor(Math.random()*6);
        need[id]=Math.max(3,Math.round(base*(1+0.065*(L-1))));
      }
    }
    return need;
  },
  demandText(n){
    if(!n.demand)return 'Tidak ingin ikut siapa pun';
    return Object.keys(n.demand).map(id=>{
      const it=ITEMS[id];
      const have=RPG.countItem(id);
      return `${it?it.e:''} ${it?it.n:id} ${have}/${n.demand[id]}`;
    }).join(' · ');
  },
  demandMet(n){
    if(!n.demand)return false;
    for(const id in n.demand)if(RPG.countItem(id)<n.demand[id])return false;
    return true;
  },

  /* ---------- stat efektif (level + equipment yang diberi pemain) ---------- */
  npcDmg(n){
    let d=n.baseDmg*(1+0.12*(n.level-1));
    if(n.gear.weapon&&ITEMS[n.gear.weapon]&&ITEMS[n.gear.weapon].weapon)
      d+=ITEMS[n.gear.weapon].weapon.dmg*0.6;
    if(n.role.skill.id==='keen')d*=1.25;                 // skill Mata Pemburu
    if(n.role.skill.id==='lionclaw')d*=1.20;             // skill Cakar Singa
    return d;
  },
  npcMaxHp(n){return Math.round(n.role.hp*(1+0.15*(n.level-1)));},
  npcMaxStamina(n){return Math.round(100+2*(n.level-1));},
  npcReach(n){return CFG.NPC.REACH+(n.role.skill.id==='keen'?0.9:0)+(n.role.skill.id==='lionclaw'?0.7:0);},
  npcDef(n){
    let d=0;
    for(const s of['helm','chest','boots']){
      const id=n.gear[s];
      if(id&&ITEMS[id]&&ITEMS[id].armor)d+=ITEMS[id].armor.def;
    }
    if(n.role.skill.id==='bulwark')d+=0.20;              // skill Benteng Desa
    if(n.role.skill.id==='aegis')d+=NPC_AEGIS_DEF;       // Guardian melindungi diri juga
    if(n.role.skill.id==='lionclaw')d+=0.15;             // zirah emas Manusia Singa
    d+=this.auraDef(n.pos);                              // aura Guardian di tim
    /* buff Aura Perisai dari Mage Support (n.shieldT/shieldV diisi
       NPC_Magesupport.applyShieldAura, di-tick NPCS.update di bawah) */
    if(n.shieldT>0)d+=n.shieldV||0;
    return Math.min(0.85,d);
  },

  /* =========================================================================
     AURA PERTAHANAN TIM (Guardian Aegis + Mage Support Passive Aura)
     ------------------------------------------------------------------------- 
     1. Guardian (skill 'aegis'): +10% DEF (NPC_AEGIS_DEF) dalam radius 10 blok.
     2. Mage Support: aura pasif +10% (Lv 1) -> +15% (Lv 100) DEF dalam radius
        14 blok untuk SELURUH tim (pemain, rekan, dan pet).
     Syarat mutlak: HANYA berlaku bila SUDAH DIREKRUT ke dalam tim (ada di
     dalam this.team). Mage Support liar/pengembara yang belum direkrut
     tidak memberikan aura perlindungan ini.
     ========================================================================= */
  AEGIS_R:10,
  MAGE_AURA_R:14,
  auraDef(pos){
    let def=0;
    /* 1. Aura Guardian */
    for(const g of this.team){
      if(g.dead||g.role.skill.id!=='aegis')continue;
      if(g.pos.distanceTo(pos)<=this.AEGIS_R){def+=NPC_AEGIS_DEF;break;}
    }
    /* 2. Aura Pasif Mage Support (hanya jika sudah direkrut ke dalam tim) */
    for(const m of this.team){
      if(m.dead||m.role.id!=='magesupport')continue;
      if(m.pos.distanceTo(pos)<=this.MAGE_AURA_R){
        const k=clamp(((m.level||1)-1)/99,0,1);
        def+=(0.10+0.05*k);                     // +10% (Lv 1) -> +15% (Lv 100)
        break;
      }
    }
    return def;
  },

  /* ---------- XP & level rekan ---------- */
  /* cap berbeda untuk rekan biasa vs langka (rare). NPC biasa (penjaga, pemburu,
     petani, dll.) dibatasi NPC_MAX_LEVEL (50); arketipe `rare:true` (penyihir
     elf, raksasa batu, manusia singa, goblin, kelinci cakar, mage support)
     dibatasi NPC_RARE_MAX_LEVEL (100) supaya mereka tetap berkembang di end-game
     sejalan dengan mob dungeon Lv 100. */
  npcLevelCap(n){
    return (n.role&&n.role.rare)?CFG.NPC_RARE_MAX_LEVEL:CFG.NPC_MAX_LEVEL;
  },
  gainXp(n,amount){
    n.xp+=amount;
    const cap=this.npcLevelCap(n);
    let need=npcXpNeed(n.level);
    while(n.xp>=need&&n.level<cap){
      n.xp-=need;n.level++;
    n.maxhp=this.npcMaxHp(n);n.hp=n.maxhp;
    n.maxStamina=this.npcMaxStamina(n);n.stamina=n.maxStamina;
      n.maxStamina=this.npcMaxStamina(n);n.stamina=n.maxStamina;
      FX.text(n.pos.clone().add(new THREE.Vector3(0,2.1,0)),'LV '+n.level,'#ffe066');
      if(this.isTeam(n))UI.toast(`${n.role.e} ${n.name} naik ke Lv ${n.level}!`);
      need=npcXpNeed(n.level);
    }
    if(this.isTeam(n))UI.renderTeam();
  },

  /* ---------- spawn di desa terdekat ----------
     BUGFIX: kuota per desa dulu hanya 3 NPC dan syarat tinggi tanah dipatok
     y>=4&&y<=5 — setelah terrain ditinggikan (SEA=6, desa rata di y=6) syarat
     itu tidak pernah terpenuhi sehingga NPC desa nyaris tidak pernah muncul.
     Sekarang: kuota 6 NPC/desa dan tinggi tanah mengikuti CFG.SEA. */
  spawn(){
    if(this.list.length>=CFG.NPC.MAX)return;
    const near=WGEN.nearestVillage(Player.pos.x,Player.pos.z);
    if(!near||near.dist>56)return;
    const v=near.v;
    const here=this.list.filter(n=>!n.dead&&!this.isTeam(n)&&
      n.home.x===v.x&&n.home.z===v.z).length;
    if(here>=CFG.NPC.PER_VILLAGE)return;

    let x=0,z=0,y=0,ok=false;
    for(let t=0;t<20&&!ok;t++){
      const a=Math.random()*Math.PI*2,d=rand(3,v.r-3);
      x=v.x+Math.cos(a)*d;z=v.z+Math.sin(a)*d;
      y=World.topY(Math.floor(x),Math.floor(z));
      /* lantai desa diratakan ke CFG.SEA; beri toleransi ±2 blok */
      if(y>=CFG.SEA&&y<=CFG.SEA+2)ok=true;
    }
    if(!ok)return;
    if(!here)UI.toast('🏘️ Ada penduduk desa di sekitar sini — dekati dan tekan F');

    /* Penjaga selalu ada; pedagang menetap satu per desa (slot kedua bila belum
       ada); sisanya arketipe yang bisa direkrut. Slot pertama di tiap desa
       dipaksa penjaga agar desa tidak pernah tanpa pelindung. Arketipe dengan
       `weight` kecil (mis. Manusia Singa) muncul lebih jarang.
       Pemeriksa per desa memakai VILLAGE ANCHOR (home asli sebelum ditimpa
       lapak) dengan fallback home langsung — tanpa itu DM yang sudah
       ditambatkan ke kios (home = koordinat lapak) tidak pernah dikenali
       dan terus di-spawn ulang (bug "DM banyak di kios"). */
    const atVillage=(o)=>{const h=o.villageAnchor||o.home;
      return h&&h.x===v.x&&h.z===v.z;};
    const hasMerchant=this.list.some(o=>!o.dead&&o.role.id==='merchant'&&atVillage(o));
    const hasDMaster=this.list.some(o=>!o.dead&&o.role.id==='dungeonmaster'&&atVillage(o));
    const hasFarmer=this.list.some(o=>!o.dead&&o.role.id==='farmer'&&atVillage(o));
    let role;
    if(here===0){role=NPC_ROLES[0];}                    // penjaga
    else if(!hasMerchant){role=NPC_ROLES.find(r=>r.id==='merchant')||NPC_ROLES[0];}
    else if(!hasDMaster){role=NPC_ROLES.find(r=>r.id==='dungeonmaster')||NPC_ROLES[0];}
    else if(!hasFarmer){role=NPC_ROLES.find(r=>r.id==='farmer')||NPC_ROLES[0];}
    else{
      /* arketipe `rare:true` (pengembara) & non-rekrut (penjaga/pedagang)
          dikecualikan dari undian penduduk biasa. */
      const pool=NPC_ROLES.slice(1).filter(r=>!r.rare&&r.recruit);
      let total=0;

      for(const r of pool)total+=(r.weight!==undefined?r.weight:1);
      let pick=Math.random()*total;
      role=pool[pool.length-1];
      for(const r of pool){
        pick-=(r.weight!==undefined?r.weight:1);
        if(pick<=0){role=r;break;}
      }
    }
    const n=this.make(role,x,y,z,{x:v.x,z:v.z},null,v);
    this.list.push(n);
    if(role.id==='merchant')UI.toast('🏪 Seorang pedagang membuka lapak di desa ini');
    if(role.id==='dungeonmaster')UI.toast('🧙 Seorang Dungeon Master singgah di desa ini');
  },

  /* =========================================================================
     PABRIK ENTITAS NPC
     -------------------------------------------------------------------------
     Dipisah dari spawn() supaya sistem lain (RareNPC, pengembara antar desa)
     bisa membuat NPC di koordinat mana pun tanpa syarat desa.
     ========================================================================= */
  /* Pemilihan model berdasarkan arketipe. Dipakai make() DAN restoreTeam()
     (save.js) supaya rekan yang dimuat dari save mendapat model yang PERSIS
     sama dengan saat pertama muncul. Setiap arketipe kini punya file mandiri
     di js/entities/npc_*.js berisi model + animasi. makeMesh() hanya fallback. */
  def(id){
    return window['NPC_'+id.charAt(0).toUpperCase()+id.slice(1)];
  },
  buildModel(role){
    const ent=this.def(role.id);
    if(ent&&ent.build)return ent.build();
    /* Fallback darurat: semua arketipe sudah punya file di js/entities/, jadi
       cabang ini normalnya tak pernah terpakai. Kembalikan grup kosong aman. */
    return {mesh:new THREE.Group(),
      parts:{body:null,head:null,armL:null,armR:null,legs:null,bodyY:0.78}};
  },
  /* Level NPC mengikuti band biome tempat ia berada / desa spawn:
     Pegunungan [50, 75], Tanah Merah [30, 50], Gurun [20, 30], lainnya [1, 20].
     Dengan begini penjaga dan penduduk desa bisa bertahan melawan mob liar setempat. */
  rollBiomeLevel(biome,x,z){
    if(typeof Monsters!=='undefined'&&Monsters.rollLevel){
      return Monsters.rollLevel(biome,x,z);
    }
    const bands=(typeof BIOME!=='undefined')?{
      [BIOME.MOUNTAIN]:[50,75],
      [BIOME.REDLANDS]:[30,50],
      [BIOME.DESERT]:[20,30],
    }:{};
    const b=(typeof BIOME!=='undefined'&&bands[biome])||[1,20];
    return b[0]+Math.floor(Math.random()*(b[1]-b[0]+1));
  },
  make(role,x,y,z,home,lvlOverride,village){
    const {mesh,parts}=this.buildModel(role);
    mesh.position.set(x,y,z);
    Game.scene.add(mesh);
    const biome=(village&&village.biome!==undefined)?village.biome:
                (typeof WGEN!=='undefined'&&WGEN.biomeAt)?WGEN.biomeAt(x,z):
                (typeof BIOME!=='undefined'?BIOME.FOREST:0);
    const lvl=lvlOverride||this.rollBiomeLevel(biome,x,z);
    const n={
      id:this.uid++,role,name:role.name,mesh,parts,
      home:home||{x,z},
      pos:new THREE.Vector3(x,y,z),vel:new THREE.Vector3(),
      level:lvl,xp:0,baseDmg:role.dmg,speed:role.speed,
      target:null,atkCd:0,swing:0,flash:0,
      state:'patrol',order:'follow',dir:Math.random()*Math.PI*2,t:rand(0.5,2),
      dead:false,deathT:0,onGround:false,inWater:false,
      bag:new Array(CFG.NPC.BAG).fill(null),
      gear:{weapon:null,helm:null,chest:null,boots:null},
      demand:this.rollDemand(role,lvl),
      mineT:0,mineAt:null,healT:0,working:false,
      /* ---- MODE BERTARUNG: aggressive (default) / passive ---- */
      aggr:true,focus:false,
      /* ---- TAVERN: sebagian penduduk "berkumpul di tavern" ----
         NPC yang bertugas nongkrong di tavern memakai titik tengah tavern
         sebagai rumah patroli, sehingga mereka berkumpul di dalamnya. */
      tavernSpot:null,
    };
    if(village&&village.tavern&&role.recruit&&Math.random()<0.5){
      const tv=village.tavern;
      n.tavernSpot={x:tv.cx+rand(-3.5,3.5),z:tv.cz+rand(-3,3)};
      n.home={x:n.tavernSpot.x,z:n.tavernSpot.z};
    }
    /* ROYAL GUARD: undi peralatan bawaannya SENDIRI sejak lahir —
       pedang & tameng acak dengan rarity tinggi makin jarang. Dulu semua RG
       memakai prototipe sword_frost + shield_flame sehingga tampak "menyamai"
       peralatan pemain. */
    if(role.id==='royalguard')this.rollRoyalGuardGear(n);
    n.maxhp=this.npcMaxHp(n);n.hp=n.maxhp;
    n.maxStamina=this.npcMaxStamina(n);n.stamina=n.maxStamina;
    /* Pedagang mendapat stok barang ACAK sendiri saat diciptakan (tiap desa
       bisa berbeda). Upgrade tas muncul dgn peluang 25% di genShopStock. */
    if(role.id==='merchant'&&!n.shop){
      n.shop=(typeof genShopStock==='function')
        ?genShopStock(typeof RPG!=='undefined'?RPG.bagTier:0):[];
    }
    /* Dungeon Master: stok changer diambil PER-DESA (persisten + restock
       berkala) — bukan milik NPC-nya — supaya tidak hilang saat NPC despawn
       dan tidak bisa direset dengan membunuhnya. */
    if(role.id==='dungeonmaster')this.checkDshopRestock(n.home.x,n.home.z);
    return n;
  },

  /* =========================================================================
     STOK DUNGEON MASTER (per desa, persisten, restock 30 menit)
     -------------------------------------------------------------------------
     Daftar level changer deterministik dari posisi desa (genDungeonChangerStock
     di config.js). Yang tersimpan per desa hanya {key → {lvl: sisa stok}} plus
     timestamp restock terakhir; harga & maxStock selalu dihitung ulang dari
     config. Disimpan ke localStorage terpisah (pola Dungeon.save) sehingga
     stok bertahan antar sesi dan tidak terikat pada slot save pemain.
     ========================================================================= */
  DSHOP:{},             // 'vx,vz' → {s:{lvl:stock}, t:timestamp restock}
  DSHOP_KEY:'forest_survival_dshop_v1',
  DSHOP_RESET_MS:30*60*1000,       // stok penuh kembali tiap 30 menit (real time)
  checkDshopRestock(vx,vz){
    const key=vx+','+vz;
    let e=this.DSHOP[key];
    if(!e){e=this.DSHOP[key]={s:{},t:Date.now()};}
    if(Date.now()-e.t>=this.DSHOP_RESET_MS){
      e.s={};e.t=Date.now();       // kosongkan catatan → terisi penuh saat dibaca
      this.saveDshop();
      if(typeof UI!=='undefined'&&UI.open==='shop'&&UI.shopNpc&&
         UI.shopNpc.role.id==='dungeonmaster'&&
         UI.shopNpc.home.x===vx&&UI.shopNpc.home.z===vz)UI.renderShop();
    }
    return e;
  },
  /* stok gabungan untuk panel toko: entri config (lvl/price/maxStock) +
     sisa stok tersimpan. Memanggil checkDshopRestock lebih dulu. */
  dshopStock(vx,vz){
    this.checkDshopRestock(vx,vz);
    const e=this.DSHOP[vx+','+vz];
    return genDungeonChangerStock(vx,vz).map(g=>({
      lvl:g.lvl,price:g.price,maxStock:g.maxStock,
      stock:(e.s[g.lvl]!==undefined)?e.s[g.lvl]:g.maxStock,
    }));
  },
  /* beli satu changer level `lvl` di desa (vx,vz): mengurangi sisa stok */
  dshopBuy(vx,vz,lvl){
    const row=this.dshopStock(vx,vz).find(r=>r.lvl===lvl);
    if(!row||row.stock<=0)return false;
    this.DSHOP[vx+','+vz].s[lvl]=row.stock-1;
    this.saveDshop();
    return true;
  },
  saveDshop(){
    try{localStorage.setItem(this.DSHOP_KEY,JSON.stringify(this.DSHOP));}catch(e){}
  },
  loadDshop(){
    try{
      const o=JSON.parse(localStorage.getItem(this.DSHOP_KEY));
      if(o&&typeof o==='object')this.DSHOP=o;
    }catch(e){}
  },


  /* ---------- interaksi pemain ---------- */
  /* NPC terdekat dalam jarak bicara yang belum jadi rekan */
  nearby(){
    let best=null,bd=CFG.NPC.TALK_R;
    for(const n of this.list){
      if(n.dead||this.isTeam(n))continue;
      const d=n.pos.distanceTo(Player.pos);
      if(d<bd){best=n;bd=d;}
    }
    return best;
  },
  /* dipanggil tombol G / tombol HUD mobile (kompatibilitas lama) */
  interact(){
    const n=this.nearby();
    if(!n){UI.toast('Tidak ada penduduk desa di dekatmu');return;}
    this.talk(n);
  },

  /* =========================================================================
     PERCAKAPAN
     ------------------------------------------------------------------------- 
     Semua interaksi dengan penduduk kini lewat bubble di atas kepalanya.
     - NPC yang tidak bisa direkrut  → obrolan ringan soal desa / dirinya.
     - NPC yang bisa direkrut        → memperkenalkan diri lalu menawarkan
       diri untuk ikut, dengan dua pilihan Ya / Tidak.
     "Tidak" hanya menutup bubble, bukan penolakan permanen.
     ========================================================================= */
  talk(n){
    if(!n||n.dead)return;
    Sfx.click();
    /* pedagang desa: membuka panel toko (jual-beli dgn koin), bukan merekrut.
       Stok acak pedagang disimpan di n.shop (dibuat saat make()). */
    if(n.role.id==='merchant'){
      this.say(n,'Mau beli apa hari ini? Kubayar tunai hasil buruanmu.',2.6);
      UI.shopNpc=n;
      UI.toggle('shop');
      return;
    }
    /* Dungeon Master: membuka panel TOKO KHUSUS Dungeon Changer (daftar level
       per desa), bukan toko pedagang biasa. */
    if(n.role.id==='dungeonmaster'){
      this.say(n,'Reruntuhan menyimpan rahasia... levelnya bisa kuubah untukmu.',2.8);
      UI.shopNpc=n;
      UI.toggle('shop');
      return;
    }
    /* NPC penjaga: hanya obrolan biasa */
    if(!n.role.recruit||!n.demand){
      UI.bubble.show(n,npcLine(n.role.id,'chat'));
      return;
    }
    /* ATURAN REKRUT LEVEL: pemain tidak bisa merekrut NPC dengan level > Player.level + 10 */
    const pLvl=(typeof Player!=='undefined')?Player.level:1;
    if(n.level>pLvl+10){
      UI.bubble.show(n,`Kau terlalu lemah (Lv ${pLvl}) untuk memimpinku (Lv ${n.level})!<br>`+
        `Capai minimal <b>Lv ${n.level-10}</b> dulu, baru aku mau mengikutimu.`);
      if(typeof UI!=='undefined'&&UI.toast)
        UI.toast(`❌ ${n.name} (Lv ${n.level}) menolak: levelmu (Lv ${pLvl}) terlalu rendah!`);
      if(typeof Sfx!=='undefined'&&Sfx.hit)Sfx.hit();
      return;
    }
    if(this.teamFull()){
      UI.bubble.show(n,`Timmu sudah penuh (maks ${CFG.NPC.TEAM_MAX} rekan). `+
        'Bubarkan salah satu dulu, baru aku ikut.');
      return;
    }
    /* perkenalan + syarat bergabung */
    const intro=npcLine(n.role.id,'intro');
    const met=this.demandMet(n);
    const body=`${intro}<br><span class="bq">Bekalku kurang: ${this.demandText(n)}</span>`+
      '<br>Mau merekrutku ikut bersamamu?';
    UI.bubble.show(n,body,[
      {t:'✅ Ya',cls:'yes',fn:()=>{
        if(!this.demandMet(n)){
          UI.bubble.show(n,`Aku masih butuh ${this.demandText(n)} dulu. `+
            'Bawakan itu, baru aku ikut.');
          return;
        }
        RPG.removeItems(n.demand);
        UI.bubble.hide();
        this.recruit(n);
      }},
      {t:'❌ Tidak',cls:'no',fn:()=>{UI.bubble.hide();}},
    ],met);
  },
  recruit(n){
    n.state='follow';n.order='follow';n.demand=null;n.target=null;
    /* mode default: agresif (bertarung otomatis melindungi pemain) */
    n.aggr=true;n.focus=false;
    this.team.push(n);
    /* ROYAL GUARD: peralatan bawaannya sendiri (hasil undian sejak spawn)
       dipasang ke model — pemain tetap bisa menggantinya lewat panel NPC. */
    if(n.role&&n.role.id==='royalguard'){
      /* RG membawa peralatan undiannya sendiri sejak spawn (rollRoyalGuardGear
         di make()) — JANGAN menimpanya. Cukup segarkan tampilan agar pedang &
         tameng bawaannya terlihat di tangannya. */
      if(typeof NPC_Royalguard!=='undefined'&&NPC_Royalguard.refreshGear)
        NPC_Royalguard.refreshGear(n);
    }
    FX.debris(n.pos.clone().add(new THREE.Vector3(0,1.2,0)),0xffe066,12,2.4);
    UI.toast(`${n.role.e} ${n.name} (Lv ${n.level}) bergabung ke timmu!`);
    UI.renderTeam();
  },
  dismiss(n){
    const i=this.team.indexOf(n);
    if(i>=0)this.team.splice(i,1);
    /* barang di tas rekan dikembalikan supaya tidak hilang */
    for(let s=0;s<n.bag.length;s++){
      const it=n.bag[s];
      if(it){RPG.addItem(it.id,it.n);n.bag[s]=null;}
    }
    n.state='patrol';n.home={x:n.pos.x,z:n.pos.z};
    n.demand=this.rollDemand(n.role,n.level);
    UI.toast(`${n.role.e} ${n.name} keluar dari tim`);
    UI.renderTeam();UI.renderNpcPanel();
  },
  setOrder(n,order){
    /* getaran blok yang sedang digarap harus dibersihkan, kalau tidak bloknya
       tertinggal bergetar selamanya setelah perintahnya diganti */
    if(n.mineAt&&typeof FX!=='undefined'&&FX.clearBlockShake)
      FX.clearBlockShake(n.mineAt.x,n.mineAt.y,n.mineAt.z);
    n.order=order;n.mineAt=null;n.mineT=0;n.farmTask=null;n.farmT=0;
    n.working=false;n.minePulse=0;
    n.state=order==='gather'?'gather':order==='wait'?'wait':
            order==='farm'?'farm':'follow';
    const t={follow:'mengikutimu',gather:'mencari resource di sekitarmu',
      wait:'menunggu di tempat',farm:'mengerjakan ladang'}[order];
    UI.toast(`${n.role.e} ${n.name} ${t}`);
    UI.renderTeam();UI.renderNpcPanel();
  },
  /* ---------- MODE BERTARUNG: AGGRESSIVE / PASSIVE ----------
     Aggressive: NPC mencari & menyerang monster yang mendekat ke pemain.
     Passive   : NPC tidak menyerang sendiri; baru menyerang target yang
                 diserang pemain, dan mengejarnya sampai target mati. */
  setMode(n,mode){
    n.aggr=(mode!=='passive');
    if(!n.aggr){n.target=null;n.focus=false;}
    UI.toast(`${n.role.e} ${n.name}: mode ${n.aggr?'AGRESIF ⚔️':'PASIF 🕊️'}`);
    UI.renderTeam();UI.renderNpcPanel();
  },
  /* dipanggil saat pemain menyerang monster: rekan PASIF ikut mengunci target
     itu sampai mati, baru kembali pasif. */
  onPlayerAttack(m){
    if(!m||m.dead)return;
    if(m.pet)return;
    if(m.type==='kelabang_part')return; // ruas kelabang terlepas bukan target
    if(typeof Monsters!=='undefined'&&Monsters.isAnimal&&Monsters.isAnimal(m))return;
    for(const n of this.team){
      if(n.dead||n.aggr!==false||n.retreat)continue;
      const gone=!n.target||n.target.dead||Monsters.list.indexOf(n.target)<0;
      if(gone){n.target=m;n.focus=true;}
    }
  },

  /* ---------- tas rekan ---------- */
  bagAdd(n,id,cnt){
    /* equipment (pedang/armor/tameng) maks 1 per slot -> tidak ditumpuk */
    const cap=(typeof stackCap==='function')?stackCap(id):64;
    if(cap>1){
      for(const s of n.bag){
        if(s&&s.id===id&&s.n<cap){
          const add=Math.min(cnt,cap-s.n);s.n+=add;cnt-=add;
          if(cnt<=0)return true;
        }
      }
    }
    for(let i=0;i<n.bag.length&&cnt>0;i++)
      if(!n.bag[i]){const add=Math.min(cnt,cap);n.bag[i]={id,n:add};cnt-=add;}
    return cnt<=0;                              // false bila tas penuh
  },
  bagFull(n){return n.bag.every(s=>s!==null);},
  /* pemain mengambil satu tumpuk dari tas rekan */
  takeFromBag(n,i){
    const s=n.bag[i];if(!s)return;
    RPG.addItem(s.id,s.n);
    const sIco=(typeof UI!=='undefined'&&UI.itemIcon)?UI.itemIcon(s.id):ITEMS[s.id].e;
    UI.toast(`Mengambil ${sIco} ${ITEMS[s.id].n} ×${s.n}`);
    n.bag[i]=null;
    UI.renderNpcPanel();UI.renderAll();
  },
  /* pemain memberi item dari hotbar/tas: senjata & armor langsung dipakai
     rekan (selalu 1), makanan & resource masuk tas bekal sejumlah `count`.
     count default 1; UI kini menampilkan dialog jumlah sebelum memberi. */
  give(n,group,idx,count){
    const arr=group===0?RPG.hotbar:RPG.bag;
    const s=arr[idx];if(!s)return;
    const it=ITEMS[s.id];
    const isEquip=!!(it.weapon||it.armor);
    const giveN=isEquip?1:clamp(Math.floor(count)||1,1,s.n);
    if(!isEquip){
      /* Ramuan stamina langsung diminum untuk memulihkan stamina rekan */
      if(it.id==='potion_stam'||(it.potion&&it.potion.stamina)){
        const maxStam=n.maxStamina||100;
        const addStam=Math.round(maxStam*0.30);
        n.stamina=Math.min(maxStam,(n.stamina!==undefined?n.stamina:maxStam)+addStam);
        FX.text(n.pos.clone().add(new THREE.Vector3(0,2,0)),`+${addStam} STAM`,'#ffd24d');
        UI.toast(`⚡ ${n.name} meminum ${it.n} (+30% Stamina)`);
        this.say(n,'Terima kasih, staminaku pulih!');
        s.n-=1;if(s.n<=0)arr[idx]=null;
        UI.renderNpcPanel();UI.renderAll();
        return;
      }
      /* Makanan TIDAK langsung dimakan: ia masuk ke tas bekal rekan, sama
         seperti resource. Rekan sendiri yang memutuskan kapan memakannya
         (lihat autoEat) sehingga pemain bisa menitipkan perbekalan. */
      if(!this.bagAdd(n,s.id,giveN)){UI.toast('Tas rekan penuh');return;}
      n.starving=false;
      FX.text(n.pos.clone().add(new THREE.Vector3(0,2,0)),
        `${it.e}${giveN>1?'×'+giveN:''}`,'#8fe07a');
      UI.toast(`${it.e} ${it.n} ×${giveN} masuk ke tas bekal ${n.name}`);
      this.say(n,'Terima kasih, ini kusimpan dulu.');
    }else{
      const slot=it.weapon?'weapon':it.armor.slot;
      /* TAMENG HANYA BISA DIGUNAKAN ROYAL GUARD:
         Arketipe lain tidak memiliki slot atau model tameng sehingga perisai akan lenyap. */
      if(slot==='shield'&&(!n.role||n.role.id!=='royalguard')){
        UI.toast('🛡️ Hanya Royal Guard yang bisa memakai tameng!');
        if(typeof Sfx!=='undefined'&&Sfx.hit)Sfx.hit();
        return;
      }
      const old=n.gear[slot];
      n.gear[slot]=s.id;
      if(old)RPG.addItem(old,1);                     // tukar, item lama kembali
      UI.toast(`${n.name} memakai ${it.e} ${it.n}`);
      /* ROYAL GUARD: senjata & perisai yang diberi pemain langsung tampil di
         tangannya (model yang sama dengan milik pemain). Armor tidak — zirah
         merah Royal Guard adalah bagian karakternya. */
      if(n.role&&n.role.id==='royalguard'&&
         typeof NPC_Royalguard!=='undefined'&&NPC_Royalguard.refreshGear)
        NPC_Royalguard.refreshGear(n);
    }
    s.n-=giveN;if(s.n<=0)arr[idx]=null;
    UI.renderNpcPanel();UI.renderAll();
  },

  /* ---------- pertarungan ---------- */
  findTarget(n){
    let best=null,bd=CFG.NPC.SIGHT;
    for(const m of Monsters.list){
      if(m.dead)continue;
      /* hewan ternak (animal), MOB PELIHARAAN, dan mob yang sedang ditangkap
         tidak pernah menjadi target NPC */
      if(m.pet)continue;
      if(m.catchActive)continue;
      if(m.type==='kelabang_part')continue; // ruas kelabang terlepas: bukan target
      if(Monsters.isAnimal&&Monsters.isAnimal(m))continue;
      const d=m.pos.distanceTo(n.pos);
      if(d>=bd)continue;
      if(this.isTeam(n)){
        /* rekan hanya melayani monster yang mengancam sekitar pemain */
        if(m.pos.distanceTo(Player.pos)>CFG.NPC.SIGHT+2)continue;
      }else if(!n.wander){
        const dh=Math.hypot(m.pos.x-n.home.x,m.pos.z-n.home.z);
        if(dh>=CFG.NPC.HOME_R+6)continue;
      }
      /* pengembara langka (n.wander) tidak dibatasi home: mereka bebas
         melawan monster yang ditemui di perjalanan antar desa */
      /* LINE OF SIGHT: NPC tidak bisa melihat monster menembus blok padat
         (dinding rumah, batu). Monster di balik tembok dilewati. */
      if(World.losBlocked(n.pos.x,n.pos.y+1.5,n.pos.z,
                          m.pos.x,m.pos.y+0.9,m.pos.z))continue;
      best=m;bd=d;
    }
    return best;
  },
  hurt(n,dmg,src){
    if(n.dead)return;
    /* DUNGEON MASTER tidak boleh terdorong dari lapaknya: serangan monster
       tidak merugikannya (dia penjaga toko, bukan kombatan) — iklas di tempat. */
    if(n.shopSpot){
      FX.text(n.pos.clone().add(new THREE.Vector3(0,1.9,0)),'⭕','#9fb7c8');
      return;
    }
    /* PROVOKE Royal Guard: selama menantang, damage yang diterima dipotong
       70% (nilai `dr` file asli). Dipasang lewat n.provDr oleh
       NPC_Royalguard._doProvoke dan dilepas saat durasi habis. */
    if(n.provDr>0)dmg*=(1-n.provDr);
    n.hp-=dmg*(1-this.npcDef(n));n.flash=0.18;
    n.hpT=6; /* durasi tampil HP bar setelah terkena serangan */
    FX.text(n.pos.clone().add(new THREE.Vector3(0,1.9,0)),
      String(Math.round(dmg)),'#ff9d8a');
    FX.debris(n.pos.clone().add(new THREE.Vector3(0,1,0)),0xff5544,3,1.6);
    if(this.isTeam(n))UI.renderTeam();
    if(n.hp<=0){this.kill(n);return;}
    /* ---------- naluri bertahan hidup ---------- 
       Begitu HP jatuh di bawah RETREAT_HP, NPC berhenti bertarung dan kabur
       untuk memulihkan diri. Flag `retreat` sengaja TIDAK dilepas saat lepas
       dari kejaran — pelepasannya diurus aiRetreat setelah HP mencapai
       REJOIN_HP — supaya NPC tidak bolak-balik masuk pertarungan dengan HP
       kritis lalu langsung tewas. */
    if(!n.retreat&&n.hp<this.npcMaxHp(n)*CFG.NPC.RETREAT_HP){
      n.retreat=true;n.target=null;
      this.say(n,NPC_RETREAT_LINE(),3.2);
      FX.text(n.pos.clone().add(new THREE.Vector3(0,2.3,0)),'⚠ mundur!','#ffb347');
    }
  },
  kill(n){
    n.dead=true;n.deathT=0;
    const wasTeam=this.isTeam(n);
    const i=this.team.indexOf(n);if(i>=0)this.team.splice(i,1);
    FX.debris(n.pos.clone().add(new THREE.Vector3(0,0.9,0)),0x4f6f8f,14,3);
    /* GORE: bagian tubuh terlepas (warna jubah + kulit) saat penduduk tewas */
    FX.gib(n.pos.clone().add(new THREE.Vector3(0,0.9,0)),
      [n.role.robe,n.role.hood,0xeac9a6,0xc94f43],12,3);
    /* isi tas & perlengkapan rekan yang tewas berjatuhan di tempat */
    for(const s of n.bag)if(s)FX.spawnDrop(n.pos.clone().add(
      new THREE.Vector3(rand(-.4,.4),0.6,rand(-.4,.4))),s.id,s.n);
    for(const k in n.gear)if(n.gear[k])
      FX.spawnDrop(n.pos.clone().add(new THREE.Vector3(0,0.6,0)),n.gear[k],1);
    if(!wasTeam){
      FX.spawnDrop(n.pos.clone().add(new THREE.Vector3(0,0.6,0)),'bread',1);
      if(Math.random()<0.4)
        FX.spawnDrop(n.pos.clone().add(new THREE.Vector3(0.3,0.6,0)),'fiber',2);
    }
    UI.toast(wasTeam?`💀 ${n.name}, rekanmu, tewas!`:'💀 Penduduk desa tewas!');
    if(wasTeam){UI.renderTeam();UI.renderNpcPanel();}
  },

  update(dt){
    this.timer-=dt;
    if(this.timer<=0){this.timer=1.2;this.spawn();}   // lebih sering mengisi desa

    /* restock Dungeon Master: diperiksa tiap 30 detik (murah) — tiap desa
       yang tercatat di DSHOP diisi ulang bila sudah lewat 30 menit */
    this._dshopT=(this._dshopT||0)-dt;
    if(this._dshopT<=0){
      this._dshopT=30;
      for(const k in this.DSHOP){
        const p=k.split(',');
        this.checkDshopRestock(+p[0],+p[1]);
      }
    }
    this.supportBuffs(dt);

    for(let i=this.list.length-1;i>=0;i--){
      const n=this.list[i];
      if(n.dead){
        n.deathT+=dt;
        n.mesh.scale.setScalar(Math.max(0.001,1-n.deathT*2));
        n.mesh.rotation.z=n.deathT*2.4;
        if(n.deathT>0.55)this.despawn(i);
        continue;
      }
      /* regenerasi stamina NPC dengan JEDA (stamRegenT):
         setelah memakai skill, stamina baru mulai pulih setelah jeda habis.
         Di luar pertarungan 8/dtk, saat bertarung (ada target) 4.5/dtk —
         biaya skill 30-45 terasa nyata, bukan langsung penuh lagi. */
      n.maxStamina = n.maxStamina || this.npcMaxStamina(n);
      if(n.stamina === undefined) n.stamina = n.maxStamina;
      n.stamRegenT = Math.max(0, (n.stamRegenT || 0) - dt);
      if(n.stamRegenT <= 0)
        n.stamina = Math.min(n.maxStamina, n.stamina + (n.target&&!n.target.dead ? 4.5 : 8) * dt);
      /* ROYAL GUARD: cooldown skill & sisa durasi provoke harus turun walau
         guard sedang tidak bertarung (combat() hanya jalan saat ada target) */
      if(n.role&&n.role.id==='royalguard'&&
         typeof NPC_Royalguard!=='undefined'&&NPC_Royalguard.tick)
        NPC_Royalguard.tick(n,dt);
      /* rekan tidak pernah dibuang; yang tertinggal jauh dipanggil kembali.
         Pengembara langka (n.wander) juga tidak dibuang di sini — RareNPC
         sendiri yang menyembunyikan/menampilkan meshnya sesuai jarak. */
      if(this.isTeam(n)){
        /* recall dua tingkat: lembut di TELEPORT_R, PAKSA di 1.5× itu.
           Recall paksa menimpa Y dengan tanah aktual & membersihkan flag
           khusus (mine/retreat) supaya rekan benar-benar muncul di samping,
           bukan sekadar "pindah koordinat di dalam kegelapan chunk". */
        const dd=n.pos.distanceTo(Player.pos);
        if(dd>CFG.NPC.TELEPORT_R*1.5)this.forcedRecall(n);
        else if(dd>CFG.NPC.TELEPORT_R)this.recall(n);
      }else if(!n.wander&&n.pos.distanceTo(Player.pos)>70){this.despawn(i);continue;}


      n.flash=Math.max(0,n.flash-dt);
      n.atkCd-=dt;
      n.swing=Math.max(0,n.swing-dt);
      n.turnCd=Math.max(0,(n.turnCd||0)-dt);
      this.ai(n,dt);
      this.physics(n,dt);
      this.checkStuck(n,dt);
      this.unstickTavern(n);
      n.mesh.position.copy(n.pos);
      this.animate(n,dt);
      /* ---------- PENJAGA MESH REKAN ----------
         Bila mesh rekan entah bagaimana lepas dari scene (jalur pembersihan
         yang belum kita ketahui), buat ulang & tempatkan di samping pemain.
         Murah: this.team maks 3, dan pembandingnya hanya O(parent). */
      if(this.isTeam(n)&&n.mesh.parent!==Game.scene){
        Game.scene.add(n.mesh);
        n.pos.set(Player.pos.x+rand(-1.5,1.5),Player.pos.y,Player.pos.z+rand(-1.5,1.5));
        n.pos.y=World.groundAt(n.pos.x,n.pos.z,Player.pos.y+2);
        n.mesh.position.copy(n.pos);
        FX.ring(n.pos.x,n.pos.y+0.1,n.pos.z,0x9fd7ff,0.6,3);
      }
    }
    this.updateArrows(dt);
    this.passives(dt);
  },

  /* =========================================================================
     BUFF MAGE SUPPORT (🔯)
     -------------------------------------------------------------------------
     Mage Support (js/entities/npc_magesupport.js) memberi buff ke SELURUH
     tim — pemain (Player), seluruh rekan (NPCS.team), dan pet yang sedang
     dikeluarkan (Capture.pet). Karena ketiganya disimpan di objek berbeda,
     tick-nya dipusatkan di sini:

       healHot = {rem, dur, left} — HoT Healing Aura: memulihkan HP sebesar
                  `rem` yang disebar merata selama `dur` detik. Angkanya
                  persen max-HP MASING-MASING penerima (dihitung saat cast).
       shieldT / shieldV — Aura Perisai: reduksi damage `shieldV` selama
                  `shieldT` detik. Dibaca NPCS.npcDef (rekan), Player.takeDamage
                  (pemain), dan Capture.hurtPet (pet).

     DoT bintang (m.starDot = {rate, left, src}) juga di-tick di sini karena
     menempel pada MONSTER — damage di-route lewat Monsters.hurt supaya
     threat/aggro tetap konsisten.
     ========================================================================= */
  supportBuffs(dt){
    /* ---------- pemain ---------- */
    if(typeof Player!=='undefined'&&!Player.dead){
      Player.shieldT=Math.max(0,(Player.shieldT||0)-dt);
      if(Player.healHot){
        const h=Player.healHot;h.left-=dt;
        if(h.left<=0)Player.healHot=null;
        else{
          const rate=h.rem/h.dur;
          Player.hp=Math.min(Player.maxHp(),Player.hp+rate*dt);
          this._healFx(Player.pos,dt);
        }
      }
    }
    /* ---------- rekan tim ---------- */
    for(const n of this.team){
      if(n.dead)continue;
      n.shieldT=Math.max(0,(n.shieldT||0)-dt);
      if(n.healHot){
        const h=n.healHot;h.left-=dt;
        if(h.left<=0)n.healHot=null;
        else{
          const rate=h.rem/h.dur;
          n.hp=Math.min(this.npcMaxHp(n),n.hp+rate*dt);
          this._healFx(n.pos,dt);
        }
      }
    }
    /* ---------- pet yang dikeluarkan ---------- */
    if(typeof Capture!=='undefined'&&Capture.pet&&!Capture.pet.dead){
      const p=Capture.pet;
      p.shieldT=Math.max(0,(p.shieldT||0)-dt);
      if(p.healHot){
        const h=p.healHot;h.left-=dt;
        if(h.left<=0)p.healHot=null;
        else{
          const rate=h.rem/h.dur;
          p.hp=Math.min(p.maxhp,p.hp+rate*dt);
          this._healFx(p.pos,dt);
        }
      }
    }
    /* ---------- DoT Hujan Bintang Spirit pada monster ---------- */
    if(typeof Monsters!=='undefined'){
      for(const m of Monsters.list){
        if(m.dead||!m.starDot)continue;
        const s=m.starDot;s.left-=dt;
        if(s.left<=0){m.starDot=null;continue;}
        /* tick damage 1×/detik supaya HP bar & flash tidak spam tiap frame */
        s.acc=(s.acc||0)+dt;
        if(s.acc>=1){
          s.acc=0;
          Monsters.hurt(m,s.rate,new THREE.Vector3(0,0.1,0),0,s.src);
        }
      }
    }
  },
  /* percikan hijau kecil di atas penerima HoT (agar aura terasa hidup) */
  _healFx(pos,dt){
    if(typeof FX==='undefined'||!FX.debris)return;
    if(Math.random()<dt*2.5)
      FX.debris(pos.clone().add(new THREE.Vector3(0,1.3,0)),0x9dffb8,1,1.1);
  },
  despawn(i){
    const n=this.list[i];
    Game.scene.remove(n.mesh);
    n.mesh.traverse(o=>{if(o.geometry)o.geometry.dispose();
      if(o.material)o.material.dispose();});
    this.list.splice(i,1);
  },
  /* teleport ringan ke belakang pemain agar rekan tidak hilang saat chunk
     bergeser cepat atau pemain jatuh jauh */
  recall(n){
    const a=Cam.yaw+Math.PI;
    n.pos.set(Player.pos.x+Math.sin(a)*2,Player.pos.y+0.2,Player.pos.z+Math.cos(a)*2);
    n.pos.y=Math.max(n.pos.y,World.groundAt(n.pos.x,n.pos.z,n.pos.y+1.8));
    n.vel.set(0,0,0);n.mineAt=null;
  },
  /* ---------- RECALL PAKSA — jaring pengaman rekan hilang ----------
     Bila rekan melewati 1.5×TELEPORT_R dan recall lembut tidak membawanya
     pulang (pos terjebak di chunk belum termuat, tertahan tabrakan, atau
     mesh sudah lepas dari scene), recall ini memindahkannya dengan TANPA
     syarat: Y dihitung ulang dari tanah aktual, semua flag pekerjaan
     dibersihkan, dan mesh dipastikan ada di scene. */
  forcedRecall(n){
    const a=Cam.yaw+Math.PI;
    const x=Player.pos.x+Math.sin(a)*2,z=Player.pos.z+Math.cos(a)*2;
    n.pos.set(x,World.groundAt(x,z,Player.pos.y+2.5),z);
    n.vel.set(0,0,0);
    n.mineAt=null;n.mineT=0;n.retreat=false;n.working=false;
    n.state='follow';n.target=null;n.stuckT=0;
    /* mesh wajib di scene */
    if(!n.mesh.parent){Game.scene.add(n.mesh);}
    n.onGround=false;
    FX.ring(n.pos.x,n.pos.y+0.1,n.pos.z,0x9fd7ff,0.7,3);
    if(typeof Sfx!=='undefined'&&Sfx.jump)Sfx.jump();
  },

  /* efek pasif rekan yang bekerja terus-menerus */
  passives(dt){
    for(const n of this.team){
      if(n.dead)continue;
      if(n.role.skill.id==='mend'&&n.pos.distanceTo(Player.pos)<8&&!Player.dead&&((n.stamina||0)>=5)){
        n.healT+=dt;
        if(n.healT>=1){
          n.healT=0;
          n.stamina=(n.stamina||0)-5;
          Player.hp=Math.min(Player.maxHp(),Player.hp+1.5);
        }
      }
      this.autoEat(n,dt);
    }
  },

  /* =========================================================================
     REKAN MAKAN SENDIRI
     ------------------------------------------------------------------------- 
     Rekan menyimpan bekal di tasnya (hasil pemberian pemain maupun hasil
     memanen sendiri). Begitu HP-nya turun di bawah 65% dan sedang tidak dalam
     ancaman langsung, ia otomatis memakan satu makanan dari tas. Makanan
     mentah dipilih paling akhir supaya bekal terbaik disimpan untuk keadaan
     gawat. Ada jeda EAT_CD detik supaya bekal tidak habis sekaligus.
     ========================================================================= */
  EAT_CD:6,
  /* nilai satu porsi makanan bagi NPC */
  foodValue(id){
    const f=ITEMS[id]&&ITEMS[id].food;
    if(!f)return 0;
    return Math.max(0,f.hp)+Math.round(f.hunger*0.4);
  },
  /* slot bekal terbaik di tas rekan (paling menyembuhkan) */
  bestFoodSlot(n){
    let bi=-1,bv=0;
    for(let i=0;i<n.bag.length;i++){
      const s=n.bag[i];if(!s)continue;
      const v=this.foodValue(s.id);
      if(v>bv){bv=v;bi=i;}
    }
    return bi;
  },
  autoEat(n,dt){
    n.eatCd=Math.max(0,(n.eatCd||0)-dt);
    /* minum ramuan stamina bila stamina kritis (<40%) dan tidak terdesak */
    const maxStam=n.maxStamina||100;
    if((n.stamina||0)<maxStam*0.40&&n.eatCd<=0&&(!n.target||n.target.pos.distanceTo(n.pos)>=3.2)){
      for(let j=0;j<n.bag.length;j++){
        const bs=n.bag[j];
        if(bs&&(bs.id==='potion_stam'||(ITEMS[bs.id]&&ITEMS[bs.id].potion&&ITEMS[bs.id].potion.stamina))){
          const addStam=Math.round(maxStam*0.30);
          n.stamina=Math.min(maxStam,(n.stamina||0)+addStam);
          n.eatCd=this.EAT_CD;
          bs.n--;if(bs.n<=0)n.bag[j]=null;
          FX.text(n.pos.clone().add(new THREE.Vector3(0,2,0)),`+${addStam} STAM`,'#ffd24d');
          return;
        }
      }
    }
    if(n.hp>=n.maxhp*0.65||n.eatCd>0)return;
    /* jangan makan saat sedang beradu pukul dengan monster */
    if(n.target&&n.target.pos.distanceTo(n.pos)<3.2)return;
    const i=this.bestFoodSlot(n);
    if(i<0){
      /* tas bekal kosong → rekan kelaparan dan akan berinisiatif mencari
         makanan sendiri di sekitar pemain (lihat ai()) */
      if(!n.starving){
        n.starving=true;n.sayT=0;
        UI.toast(`${n.role.e} ${n.name} kelaparan dan mencari makanan sendiri`);
      }
      return;
    }
    n.starving=false;
    const s=n.bag[i],it=ITEMS[s.id];
    const heal=this.foodValue(s.id);
    n.hp=Math.min(n.maxhp,n.hp+heal);
    n.eatCd=this.EAT_CD;
    s.n--;if(s.n<=0)n.bag[i]=null;
    Sfx.eat();
    FX.text(n.pos.clone().add(new THREE.Vector3(0,2.05,0)),
      `${it.e}+${heal}`,'#8fe07a');
    UI.toast(`${n.role.e} ${n.name} memakan ${it.e} ${it.n} sendiri (+${heal} HP)`);
    UI.renderTeam();UI.renderNpcPanel();
  },

  /* =========================================================================
     TABEL PANEN
     ------------------------------------------------------------------------- 
     NPC_GATHER dari config memuat bijih/kayu/batu. Rekan sengaja hanya
     mengambil yang bernilai — kayu dari pohon, bijih, dan batu bara — bukan
     blok lanskap seperti rumput, tanah, pasir, atau daun, supaya ia tidak
     sibuk mencangkul permukaan tanah di dekat pemain. Batu biasa juga tidak
     diambil karena ada di setiap kolom tanah sampai ke dasar peta. Buah
     dipanen lewat jalur makanan (findFood). Angka pri = prioritas.
     ========================================================================= */
  gatherTable:null,
  buildGatherTable(){
    const t={};
    /* dasar dari config, saring hanya kayu & bahan tambang */
    for(const e of NPC_GATHER){
      if(!/ore|crystal|wood|coal/.test(e.item))continue;
      const pri=/ore|crystal/.test(e.item)?5:e.item==='wood'?4:3;
      t[e.block]={item:e.item,pri};
    }
    /* tambahan: hanya dipakai bila blok & item-nya memang ada */
    const extra=[
      [B.COAL,'coal',4],
    ];
    for(const[bl,it,pri]of extra){
      if(bl===undefined||t[bl]||!ITEMS[it])continue;
      t[bl]={item:it,pri};
    }
    this.gatherTable=t;
  },
  gatherInfo(b){
    if(!this.gatherTable)this.buildGatherTable();
    return this.gatherTable[b]||null;
  },

  /* ---------- celetukan singkat di atas kepala NPC ---------- */
  say(npc,text,secs){
    if(UI.say)UI.say(npc,text,secs||3);
  },

  /* =========================================================================
     SERANGAN JARAK JAUH
     ------------------------------------------------------------------------- 
     Pemburu (atau rekan yang dibekali busur) menjaga jarak lalu melepaskan
     anak panah. Panahnya objek nyata yang terbang dan mengenai monster
     pertama yang dilewatinya.
     ========================================================================= */
  arrows:[],
  isRanged(n){
    if(n.role.id==='hunter')return true;
    const w=n.gear.weapon;
    return !!(w&&/bow|arrow|panah|busur/i.test(w));
  },
  shoot(n,m){
    const g=new THREE.Group();
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,0.7,6),
      new THREE.MeshLambertMaterial({color:0x8a6a3a}));
    shaft.rotation.x=Math.PI/2;g.add(shaft);
    const tip=new THREE.Mesh(new THREE.ConeGeometry(0.055,0.16,6),
      new THREE.MeshLambertMaterial({color:0xc9d3de}));
    tip.rotation.x=Math.PI/2;tip.position.z=0.42;g.add(tip);
    const fin=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.13,0.13),
      new THREE.MeshLambertMaterial({color:0xe8e2d2}));
    fin.position.z=-0.32;g.add(fin);
    const from=n.pos.clone().add(new THREE.Vector3(0,1.15,0));
    const to=m.pos.clone().add(new THREE.Vector3(0,0.8,0));
    const dir=to.sub(from).normalize();
    g.position.copy(from);
    g.lookAt(from.clone().add(dir));
    Game.scene.add(g);
    this.arrows.push({mesh:g,pos:from.clone(),dir,
      dmg:this.npcDmg(n)*1.15,life:2.2,owner:n});
    n.swing=0.25;
    /* suara panah dilepas: diredam sesuai jarak NPC ke pemain */
    Sfx.at(n.pos,'swing',0);
  },

  updateArrows(dt){
    for(let i=this.arrows.length-1;i>=0;i--){
      const a=this.arrows[i];
      a.life-=dt;
      const step=26*dt;
      a.pos.addScaledVector(a.dir,step);
      a.mesh.position.copy(a.pos);
      let hit=null;
      for(const m of Monsters.list){
        if(m.dead)continue;
        /* panah NPC tidak mengenai hewan ternak, mob peliharaan,
           atau mob yang sedang dalam proses tangkap */
        if(m.pet)continue;
        if(m.catchActive)continue;
        if(m.type==='kelabang_part')continue; // ruas kelabang terlepas bukan target
        if(Monsters.isAnimal&&Monsters.isAnimal(m))continue;
        if(m.pos.distanceTo(a.pos)<1.0){hit=m;break;}
      }
      const blocked=World.getBlock(Math.floor(a.pos.x),Math.floor(a.pos.y),
        Math.floor(a.pos.z));
      if(hit){
        const wasDead=hit.dead;
        /* pemilik panah dicatat sebagai sumber threat */
        Monsters.hurt(hit,a.dmg,a.dir.clone().setY(0.2),3,a.owner);
        FX.debris(a.pos.clone(),0xffe08a,4,2);
        /* bunyi panah menancap: hanya terdengar bila kejadiannya dekat */
        Sfx.at(a.pos,'hit');

        /* XP kill kini diberikan oleh Monsters.shareKillXp() (dipanggil dari
           Monsters.kill) — semua rekan tim + pet dapat XP penuh, bukan hanya
           pemilik panah. Grant ganda lama di sini dihapus. */
      }
      if(hit||a.life<=0||(blocked&&blocked!==B.AIR&&blocked!==B.WATER)){
        Game.scene.remove(a.mesh);
        a.mesh.traverse(o=>{if(o.geometry)o.geometry.dispose();});
        this.arrows.splice(i,1);
      }
    }
  },
  /* menjaga jarak sambil menembak */
  aiRanged(n,dt){
    const to=new THREE.Vector3().subVectors(n.target.pos,n.pos).setY(0);
    const d=to.length();
    const ang=Math.atan2(to.x,to.z);
    n.mesh.rotation.y=angLerp(n.mesh.rotation.y,ang,dt*8);
    const sp=n.speed*(n.inWater?0.5:1);
    if(d>9){                                    // terlalu jauh → mendekat
      n.vel.x=lerp(n.vel.x,Math.sin(ang)*sp,clamp(6*dt,0,1));
      n.vel.z=lerp(n.vel.z,Math.cos(ang)*sp,clamp(6*dt,0,1));
    }else if(d<4){                              // terlalu dekat → mundur
      n.vel.x=lerp(n.vel.x,-Math.sin(ang)*sp*0.9,clamp(6*dt,0,1));
      n.vel.z=lerp(n.vel.z,-Math.cos(ang)*sp*0.9,clamp(6*dt,0,1));
    }else{n.vel.x*=0.75;n.vel.z*=0.75;}
    if(n.atkCd<=0&&d<12){
      n.atkCd=CFG.NPC.ATK_CD*1.3;
      this.shoot(n,n.target);
    }
    /* monster tetap membalas bila sempat merapat */
    const m=n.target;
    if(m.atkCd<=0&&d<2.1){m.atkCd=1.1;this.hurt(n,m.dmg);}
  },

  ai(n,dt){
    /* NPC yang sedang mundur tidak mencari musuh sampai pulih ≥ REJOIN_HP */
    if(n.retreat){this.aiRetreat(n,dt);return;}
    const passive=this.isTeam(n)&&n.aggr===false;
    /* bersihkan target yang mati/hilang. Target fokus (dari serangan pemain)
       tidak dibatasi jarak pendek — passive mengejar sampai target mati. */
    if(n.target){
      const gone=n.target.dead||n.target.pet||n.target.catchActive||Monsters.list.indexOf(n.target)<0;
      if(gone){n.target=null;n.focus=false;}
      else if(!n.focus&&n.target.pos.distanceTo(n.pos)>CFG.NPC.SIGHT+4)
        n.target=null;
    }
    if(!n.target&&!passive)n.target=this.findTarget(n);

    /* BUGFIX animasi macet: skill porting (giant quake, elf, kelinci) harus
       terus di-update walau target hilang/mati di tengah skill — bila tidak,
       timer skill berhenti dan NPC beku di pose skill selamanya. */
    if(!n.target&&n.quake&&typeof SkillsPort!=='undefined')SkillsPort.combat(n,dt);

    if(n.target){this.aiFight(n,dt);return;}
    /* lapar & tidak punya bekal → cari makanan sendiri di sekitar pemain */
    if(this.isTeam(n)&&n.starving){
      const food=this.findFood(n);
      if(food){
        n.sayT=(n.sayT||0)-dt;
        if(n.sayT<=0){n.sayT=7;this.say(n,NPC_HUNGRY_LINE());}
        this.aiForage(n,dt,food);
        return;
      }
    }
    if(n.state==='wait'){n.vel.x*=0.8;n.vel.z*=0.8;return;}
    /* petani: desa otomatis bertani; rekan petani hanya saat diperintah farm */
    if(n.role.id==='farmer'&&(!this.isTeam(n)||n.order==='farm')){
      this.aiFarmer(n,dt);return;
    }
    if(n.state==='gather'){this.aiGather(n,dt);return;}
    if(this.isTeam(n)){this.aiFollow(n,dt);return;}
    /* PENJAGA LAPAK: NPC yang punya `shopSpot` (Dungeon Master) tidak
       berpatroli — ia berdiri di belakang meja tokonya. Lihat aiShopkeeper. */
    if(n.shopSpot){this.aiShopkeeper(n,dt);return;}
    this.aiPatrol(n,dt);
  },

  /* =========================================================================
     PENJAGA LAPAK — BERDIRI DI TOKONYA
     -------------------------------------------------------------------------
     Dungeon Master punya bangunan toko sendiri (Furni 'dmshop'), jadi ia tidak
     boleh berkeliaran seperti penduduk lain: pemain harus bisa menemukannya di
     tempat yang sama setiap kali. NPC ditambatkan ke n.shopSpot {x,z,yaw}:

       - bila tergeser dari titiknya (terdorong pemain/mob, atau chunk baru
         dimuat), ia berjalan pulang;
       - bila sudah di tempat, ia berdiri diam dan MENGHADAP PEMAIN saat pemain
         dekat (biar terasa melayani), atau menghadap arah lapak (yaw) saat
         tidak ada siapa-siapa.
     ========================================================================= */
  SHOP_SNAP:0.55,          // jarak dianggap "sudah di tempat"
  SHOP_FACE_R:7,           // radius mulai menghadap pemain
  aiShopkeeper(n,dt){
    n.state='shop';
    const s=n.shopSpot;
    const dx=s.x-n.pos.x, dz=s.z-n.pos.z;
    const d=Math.hypot(dx,dz);
    if(d>this.SHOP_SNAP){
      /* pulang ke belakang meja */
      n.dir=Math.atan2(dx,dz);
      n.walking=true;
      n.mesh.rotation.y=angLerp(n.mesh.rotation.y,n.dir,dt*5);
      const sp=n.speed*0.5;
      n.vel.x=lerp(n.vel.x,Math.sin(n.dir)*sp,clamp(5*dt,0,1));
      n.vel.z=lerp(n.vel.z,Math.cos(n.dir)*sp,clamp(5*dt,0,1));
      return;
    }
    /* di tempat: berhenti total */
    n.walking=false;
    n.vel.x*=0.6;n.vel.z*=0.6;
    let face=s.yaw||0;
    if(typeof Player!=='undefined'&&!Player.dead){
      const pd=Math.hypot(Player.pos.x-n.pos.x,Player.pos.z-n.pos.z);
      if(pd<this.SHOP_FACE_R)
        face=Math.atan2(Player.pos.x-n.pos.x,Player.pos.z-n.pos.z);
    }
    n.mesh.rotation.y=angLerp(n.mesh.rotation.y,face,dt*4);
  },

  /* =========================================================================
     NAVIGASI: menghindar & mencari jalan lain
     ------------------------------------------------------------------------- 
     NPC tidak memakai A* (mahal untuk dunia voxel yang terus berubah). Sebagai
     gantinya dipakai steering: sebelum melangkah, arah tujuan "diraba" dulu;
     bila terhalang, NPC memutar arah bertahap ke sisi yang bebas dan bertahan
     di sisi itu selama beberapa saat agar tidak bergetar kiri-kanan. Rintangan
     setinggi satu blok cukup dilompati, dan bila benar-benar terjepit lama,
     rekan dipanggil kembali ke sisi pemain.
     ========================================================================= */
  BODY_R:0.42,
  /* Satu titik jalan dianggap boleh dilalui bila badan NPC (radius BODY_R)
     tidak menembus blok padat, atau bila halangannya hanya setinggi satu blok
     (masih bisa dilompati) dan di depannya bukan jurang atau air yang tak diinginkan. */
  stepFree(n,x,z){
    const hy=n.pos.y+1.8;
    const gy=World.groundAt(x,z,hy);
    /* 1. HALANGAN TINGGI 2+ BLOK (tebing, dinding batu/tanah/kayu):
       Bila tanah di depan > 1.25 blok, anggap BUNTU agar steer() repath mencari jalan memutar. */
    if(gy > n.pos.y + 1.25) return false;

    /* CEK BLOK RINTANGAN (batang pohon, perabot, tembok bangunan) */
    if(World.blockedAt(x,n.pos.y,z,this.BODY_R)){
      /* jika rintangan ada di ketinggian kepala/dada (2 blok), pasti buntu */
      if(World.blockedAt(x,n.pos.y+1,z,this.BODY_R)) return false;
      /* jika rintangan 1 blok tapi tanahnya terlalu tinggi */
      if(gy > n.pos.y + 1.25) return false;
    }

    /* Target NPC (musuh, atau Player bila anggota tim) */
    const target=(n.target&&!n.target.dead)?n.target:(this.isTeam(n)?Player:null);

    /* 2. AIR: bila titik tujuan adalah air dan NPC saat ini di darat,
       repath/hindari air KECUALI targetnya memang ada di dalam air */
    const inWater=(typeof World.inWaterAt==='function')&&World.inWaterAt(x,gy+0.2,z);
    if(inWater&&!n.inWater){
      const targetInWater=target&&(target.inWater||(target.pos&&target.pos.y<=CFG.WATER_Y+0.3));
      if(!targetInWater) return false;
    }

    /* 3. TURUN: tidak ada batasan turun (bisa menuruni 2 blok / lereng bebas) */
    /* CEK HEADROOM: pastikan ada ruang berdiri setinggi tubuh di atas tanah baru */
    if(World.headroomOK && !World.headroomOK(x,z,gy)) return false;
    return true;
  },
  /* Meraba SELURUH ruas jalur (bukan hanya titik ujung) — inilah sebab NPC
     dulu masih menyeruduk tembok: sudut belokannya lolos uji satu titik,
     padahal dindingnya ada di tengah lintasan. */
  pathClear(n,ang,dist){
    const sx=Math.sin(ang),sz=Math.cos(ang);
    const steps=Math.max(2,Math.ceil(dist/0.5));
    for(let i=1;i<=steps;i++){
      const t=dist*i/steps;
      if(!this.stepFree(n,n.pos.x+sx*t,n.pos.z+sz*t))return false;
    }
    return true;
  },
  /* mengembalikan sudut jalan yang sudah dibelokkan bila jalur lurus buntu.
      PENINGKATAN: sapuan sudut diperlebar sampai hampir 180° dan fallback
      terakhir kini PUTAR BALIK 180°, sehingga NPC yang terhalang tembok 2 blok
      (tak bisa dilompati) benar-benar memutar MENGELILINGI alih-alih terus
      menyeruduk. Undakan 1 blok (tangga) tetap lolos stepFree jadi masih bisa
      dinaiki — yang dianggap buntu hanya rintangan yang benar-benar menutup. */
  steer(n,ang){
    const LOOK=2.6;
    if(this.pathClear(n,ang,LOOK)){
      if((n.detourT||0)<=0)n.turnSide=0;         // jalan lega → lupakan belokan
      n.lastSteer=ang;
      return ang;
    }
    /* anti-getar: saat baru memilih belokan, kunci arah terakhir sebentar
       supaya NPC tidak berkedip kiri-kanan di depan rintangan yang sama */
    if((n.turnCd||0)>0&&n.lastSteer!==undefined)return n.lastSteer;

    /* pilih sisi memutar sekali saja, lalu dipertahankan (wall following) */
    if(!n.turnSide||(n.detourT||0)<=0){
      const kanan=this.pathClear(n,ang+0.9,LOOK*0.8);
      const kiri=this.pathClear(n,ang-0.9,LOOK*0.8);
      n.turnSide=kanan&&!kiri?1:kiri&&!kanan?-1:(n.turnSide||(Math.random()<0.5?1:-1));
    }
    n.detourT=1.8;
    n.turnCd=0.30;
    /* sapuan sudut lebar: sisi terpilih dijelajah dulu sampai ~178°, baru sisi
       lawannya. Ini memberi NPC banyak pilihan arah memutar. */
    const OFF=[0.4,0.8,1.2,1.6,2.0,2.4,2.8,3.1];
    for(const off of OFF){
      const a=ang+off*n.turnSide;
      if(this.pathClear(n,a,LOOK*0.75)){n.lastSteer=a;return a;}
    }
    for(const off of OFF){                        // sisi ini buntu → coba lawannya
      const a=ang-off*n.turnSide;
      if(this.pathClear(n,a,LOOK*0.75)){
        n.turnSide=-n.turnSide;n.lastSteer=a;return a;
      }
    }
    /* buntu total: putar balik, tapi dikunci sebentar agar tidak bolak-balik */
    const back=ang+Math.PI*(n.turnSide||1);
    n.lastSteer=back;
    n.turnCd=0.60;
    return back;
  },

  /* ---------- PINTU BANGUNAN ----------
     Menghitung koordinat dunia pintu sebuah bangunan desa (b) beserta titik
     tepat di LUAR pintu (pendekatan) dan titik di DALAM pintu. Dipakai NPC
     supaya tahu jalan masuk rumah — tidak menabrak tembok saat mengikuti
     pemain yang masuk ke dalam bangunan. b.ds = sisi pintu, b.dc = posisi
     tengah pintu di sisi itu (lihat buildVillagePart di worldgen.js). */
  doorOf(b){
    const span=b.ds<2?b.w:b.d;
    const dc2=b.dc+1<=span-2?b.dc+1:(b.dc-1>=1?b.dc-1:b.dc);
    const mid=(b.dc+dc2)/2;
    let dx,dz,ox,oz,ix,iz;
    if(b.ds===0){        // pintu di sisi z maksimum (depan)
      dx=b.x+mid; dz=b.z+b.d-0.5;
      ox=dx; oz=b.z+b.d+0.7;
      ix=dx; iz=b.z+b.d-2.5;
    }else if(b.ds===1){  // pintu di sisi z minimum (belakang)
      dx=b.x+mid; dz=b.z+0.5;
      ox=dx; oz=b.z-0.7;
      ix=dx; iz=b.z+2.5;
    }else if(b.ds===2){  // pintu di sisi x maksimum (kanan)
      dx=b.x+b.w-0.5; dz=b.z+mid;
      ox=b.x+b.w+0.7; oz=dz;
      ix=b.x+b.w-2.5; iz=dz;
    }else{               // pintu di sisi x minimum (kiri)
      dx=b.x+0.5; dz=b.z+mid;
      ox=b.x-0.7; oz=dz;
      ix=b.x+2.5; iz=dz;
    }
    return {x:dx,z:dz,ox,oz,ix,iz};
  },
  /* =========================================================================
     TABRAKAN ANTAR-NPC
      -------------------------------------------------------------------------
      Tanpa ini beberapa NPC bisa berdiri di titik yang sama persis sehingga
      terlihat menyatu/saling menembus. Penyelesaiannya KERAS (bukan dorongan
      lemah): tiap pasangan yang tumpang-tindih langsung dipisahkan sejauh
      setengah penetrasi per frame — karena kedua NPC memanggil fungsi ini,
      total pemisahan penuh tercapai dalam 1 frame dan mereka benar-benar
      "menabrak" alih-alih tembus. Dorongan tetap dicek tembok supaya tidak
      terdorong masuk ke dinding; bila terjepit tembok, sisi lain yang mengalah.
      ========================================================================= */
  SEP_R:0.86,                    // jarak kontak dua badan (2 × BODY_R ≈ 0.84)
  separate(n,dt){
    const R=this.SEP_R;
    /* PENJAGA LAPAK (Dungeon Master): tidak digeser NPC lain — hanya lawan
       yang menyingkir; kalau dia ikut didorong, ia tergeser dari lapaknya. */
    const immovable=!!n.shopSpot;
    for(const o of this.list){
      if(o===n||o.dead)continue;
      const dx=n.pos.x-o.pos.x,dz=n.pos.z-o.pos.z;
      const d2=dx*dx+dz*dz;
      if(d2>=R*R)continue;
      const d=Math.sqrt(d2);
      /* dua NPC bertumpuk persis → arah acak deterministik per id */
      const ux=d<1e-4?Math.cos(n.id*2.4):dx/d;
      const uz=d<1e-4?Math.sin(n.id*2.4):dz/d;
      /* dorongan dilembutkan agar tidak menimbulkan getar saat berjalan
         berdekatan; pemisahan tetap terjadi beberapa frame */
      if(d>R-0.02)continue;
      const push=(R-d)*0.28;              // sebagian kecil penetrasi per frame
      if(immovable){
        /* dorong HANYA lawan menjauh, posisi n tetap */
        const ox=o.pos.x-ux*push,oz=o.pos.z-uz*push;
        if(!World.blockedAt(ox,o.pos.y,oz,o.BODY_R||this.BODY_R))o.pos.x=ox;
        if(!World.blockedAt(o.pos.x,o.pos.y,oz,o.BODY_R||this.BODY_R))o.pos.z=oz;
        continue;
      }
      const nx=n.pos.x+ux*push,nz=n.pos.z+uz*push;
      /* dorongan tidak boleh menyorong NPC menembus tembok */
      if(!World.blockedAt(nx,n.pos.y,n.pos.z,this.BODY_R))n.pos.x=nx;
      if(!World.blockedAt(n.pos.x,n.pos.y,nz,this.BODY_R))n.pos.z=nz;
    }
    /* badan pemain juga tidak boleh ditembus NPC */
    const dx=n.pos.x-Player.pos.x,dz=n.pos.z-Player.pos.z;
    const dp2=dx*dx+dz*dz;
    if(dp2<0.85*0.85&&dp2>1e-6){
      const dp=Math.sqrt(dp2);
      if(dp<0.83){
        const push=(0.85-dp)*0.35;
        /* DUNGEON MASTER tidak pernah digeser dari lapaknya — pemain yang
           mundur (aiShopkeeper menuntunnya pulang bila tergeser, tapi lebih
           baik sekali ini dicegah dari sumbernya). */
        if(!(n.shopSpot&&dp<=0.85)){
          const nx=n.pos.x+dx/dp*push,nz=n.pos.z+dz/dp*push;
          if(!World.blockedAt(nx,n.pos.y,n.pos.z,this.BODY_R))n.pos.x=nx;
          if(!World.blockedAt(n.pos.x,n.pos.y,nz,this.BODY_R))n.pos.z=nz;
        }
      }
    }
  },
  /* dipanggil physics saat satu langkah ditolak tembok */
  onBump(n,tx,tz){
    /* rintangan setinggi 1 blok (pagar, batu kecil, undakan) cukup dilompati */
    if(this.tryStepUp(n,tx,tz))return;
    /* Rintangan 2+ blok / dinding: belok dan repath memutari dinding */
    n.turnSide=-(n.turnSide||1);n.detourT=1.8;
    n.dir+=Math.PI*0.5*n.turnSide;
  },
  /* =========================================================================
     LOMPAT SATU BLOK (NPC)
     -------------------------------------------------------------------------
     Dipakai dua tempat: saat menabrak sesuatu (onBump) dan sebagai pemeriksaan
     rutin di physics() ketika NPC sedang berjalan. Berhasil bila pijakan di
     depan lebih tinggi TAPI masih dalam satu blok, dan ruang di atasnya bebas.

     PENTING untuk kasus "dari air ke daratan": saat berada di air, `onGround`
     bernilai false (NPC mengapung), jadi syarat lama `n.onGround` membuat NPC
     tidak pernah bisa melompat naik ke tepi darat — ia hanya menempel di
     dinding air. Karena itu di air lompatan tetap diizinkan, dengan dorongan
     vertikal yang lebih besar karena kecepatan naik di air dibatasi (clamp
     3.5) dan gravitasi air hanya 0.3×.
     ========================================================================= */
  tryStepUp(n,tx,tz){
    if(!n.onGround&&!n.inWater)return false;
    if((n._stepCd||0)>0)return false;
    const hy=n.pos.y+1.8;
    const step=World.groundAt(tx,tz,hy);
    /* pijakan harus lebih tinggi, tapi tidak lebih dari 1 blok penuh */
    if(step<=n.pos.y+0.12||step>n.pos.y+1.3)return false;
    /* ruang setinggi badan di atas pijakan harus bebas */
    if(World.blockedAt(tx,step+0.05,tz,this.BODY_R))return false;
    n.vel.y=n.inWater?5.4:6.2;
    /* dorongan mendatar ke arah pijakan supaya benar-benar naik ke atas, bukan
       melompat lurus lalu jatuh kembali. Di air dorongannya lebih besar karena
       kecepatan naik dibatasi clamp ±3.5 (physics air). */
    const dx=tx-n.pos.x,dz=tz-n.pos.z;
    const dl=Math.hypot(dx,dz);
    if(dl>0.001){
      const push=n.inWater?4.2:2.4;
      n.vel.x+=(dx/dl)*push;
      n.vel.z+=(dz/dl)*push;
    }
    n._stepCd=0.35;                 // jeda supaya tidak melompat tiap frame
    return true;
  },
  /* deteksi macet: tiap 0.5 detik dicek apakah NPC benar-benar berpindah */
  checkStuck(n,dt){
    n.detourT=Math.max(0,(n.detourT||0)-dt);
    if(!n.lastP)n.lastP=n.pos.clone();
    n.stuckChk=(n.stuckChk||0)+dt;
    if(n.stuckChk<0.5)return;
    const moved=n.pos.distanceTo(n.lastP);
    n.lastP.copy(n.pos);n.stuckChk=0;
    /* BUGFIX rekan menambang selamanya tanpa blok pecah:
       NPC yang sedang MENAMBANG / MEMANEN memang berdiri diam di depan
       bloknya — itu bukan macet. Dulu pemeriksaan ini tidak tahu bedanya,
       sehingga setelah ~1 detik berdiri ia menganggap NPC nyangkut lalu
       MEMBUANG n.mineAt (baris di bawah). Target hilang → findNode memilih blok
       yang sama → n.mineT kembali 0. Karena MINE_TIME (1.5s) lebih lama dari
       ambang macet, progresnya selalu ter-reset sesaat sebelum selesai: rekan
       terlihat memukul terus tanpa blok pernah hancur.
       Itu juga sebabnya "disenggol lalu bisa": dorongan membuat moved>=0.18,
       stuckT ter-reset, dan rekan mendapat jendela penuh untuk menyelesaikan.
       `n.working` diisi aiGather/aiForage hanya saat benar-benar dalam
       jangkauan & sedang mengayun, jadi macet SUNGGUHAN (tak bisa mencapai
       node) tetap terdeteksi seperti biasa. */
    if(n.working){n.stuckT=0;n.working=false;return;}
    const wantsToMove=n.state!=='wait'&&(this.isTeam(n)||!!n.target);
    if(!wantsToMove||moved>=0.18){n.stuckT=0;return;}
    n.stuckT=(n.stuckT||0)+0.5;
    /* macet sebentar → balik sisi belokan & paksa repath (detourT di-nol-kan
       supaya steer() langsung memilih arah baru); buang target tambang agar
       tidak terpaku pada node yang tak tercapai. Getaran blok dibersihkan
       supaya tidak tertinggal bergetar setelah nodenya dilepas. */
    if(n.stuckT>1.0){
      n.turnSide=-(n.turnSide||1);n.detourT=0;n.turnCd=0.4;n.lastSteer=undefined;
      if(n.mineAt){
        if(typeof FX!=='undefined'&&FX.clearBlockShake)
          FX.clearBlockShake(n.mineAt.x,n.mineAt.y,n.mineAt.z);
        n.mineAt=null;n.mineT=0;
      }
    }
    /* masih macet → berbalik 180° supaya keluar dari kantong buntu, lalu
       sisi belokan dibalik lagi agar memutar lewat sisi sebaliknya */
    if(n.stuckT>2.5){n.dir=(n.dir||0)+Math.PI;n.turnSide=-(n.turnSide||1);n.detourT=0;n.turnCd=0.8;n.lastSteer=undefined;}
    /* macet lama → rekan ditarik kembali ke sisi pemain */
    if(n.stuckT>5&&this.isTeam(n)&&n.pos.distanceTo(Player.pos)>4){
      this.recall(n);n.stuckT=0;
      FX.debris(n.pos.clone().add(new THREE.Vector3(0,1,0)),0x9fd7ff,6,1.6);
    }
  },

  /* =========================================================================
     ANTI-STUCK NPC TAVERN
      -------------------------------------------------------------------------
     NPC yang ditugaskan nongkrong di tavern kadang berakhir NYANGKUT: muncul
     di atas genteng (topY mengenai atap saat spawn interior), atau terdorong
     fisika naik ke perabot/dinding lalu tak bisa turun. Karena lantai tavern
     selalu rata CFG.SEA, tiap frame dicek: bila ketinggiannya jauh di atas
     lantai (>2.6 blok), kembalikan paksa ke titik tavern-nya di lantai.
     ========================================================================= */
  unstickTavern(n){
    if(!n.tavernSpot)return;
    if(isFinite(n.pos.y)&&n.pos.y<=CFG.SEA+2.6)return;   // masih wajar di lantai
    n.pos.set(n.tavernSpot.x,CFG.SEA,n.tavernSpot.z);
    n.vel.set(0,0,0);
    n.onGround=true;n.stuckT=0;
    FX.debris(n.pos.clone().add(new THREE.Vector3(0,1,0)),0xd6c58f,5,1.4);
  },

  aiFight(n,dt){
    /* pemakai busur bertarung dari kejauhan */
    if(this.isRanged(n)){this.aiRanged(n,dt);return;}
    /* skill porting NEW MODEL (elf/giant/kelinci): bila ditangani di sini,
       alur pertarungan bawaan dilewati */
    if(typeof SkillsPort!=='undefined'&&SkillsPort.combat(n,dt))return;
    const to=new THREE.Vector3().subVectors(n.target.pos,n.pos).setY(0);
    const ang=Math.atan2(to.x,to.z),d=to.length();
    /* deadzone sudut saat sangat dekat: jangan bergetar kiri-kanan */
    if(d>0.45)n.mesh.rotation.y=angLerp(n.mesh.rotation.y,ang,dt*7);
    const reach=this.npcReach(n);
    /* DIAM saat dalam jangkauan serang: tidak terus menyeruduk ke musuh
       yang menyebabkan saling dorong fisika & glitch geleng kepala kiri-kanan */
    if(d>reach*0.85){
      const sp=n.speed*(n.inWater?0.5:1);
      /* badan tetap menghadap musuh, tapi kakinya boleh memutari rintangan */
      const wa=this.steer(n,ang);
      n.vel.x=lerp(n.vel.x,Math.sin(wa)*sp,clamp(7*dt,0,1));
      n.vel.z=lerp(n.vel.z,Math.cos(wa)*sp,clamp(7*dt,0,1));
    }else{
      const damp=Math.exp(-8*dt);
      n.vel.x*=damp;n.vel.z*=damp;
    }

    if(n.atkCd<=0&&d<reach){
      n.atkCd=CFG.NPC.ATK_CD;n.swing=0.25;
      const dir=to.clone().normalize().setY(0.25);
      const wasDead=n.target.dead;
      /* argumen terakhir = sumber serangan, dipakai sistem threat monster */
      Monsters.hurt(n.target,this.npcDmg(n),dir,4,n);
      FX.debris(n.target.pos.clone().add(new THREE.Vector3(0,1,0)),0xffe08a,4,2);
      /* visual hit khusus arketipe porting (slash arc raksasa, dll.) */
      if(typeof SkillsPort!=='undefined')SkillsPort.onMeleeHit(n);
      /* BUGFIX: dulu Sfx.hit() dipanggil dengan volume penuh, sehingga
         pertarungan NPC vs monster di seberang peta tetap terdengar keras.
         Sekarang suara pukulan diredam sesuai jarak ke pemain. */
      Sfx.at(n.target.pos,'hit');

      /* XP saat pukulannya menumbangkan monster kini diurus SATU PINTU oleh
         Monsters.shareKillXp() (dipanggil dari Monsters.kill), yang memberi XP
         penuh ke SELURUH rekan tim + pet — bukan hanya penumbangnya. Grant
         ganda lama di sini dihapus supaya pembunuh tidak mendapat XP dua kali. */
    }

    /* ---------- monster balas menyerang ---------- 
       AI monster hanya mengenal pemain, jadi perkelahian dibuat dua arah dari
       sisi NPC. Skill 'taunt' (Tameng Hidup) memaksa monster mengalihkan
       perhatian ke rekan walau sedang mengejar pemain. */
    const m=n.target;
    /* 'aegis' (Guardian) ikut memancing seperti 'taunt': tugasnya menjadi
       sasaran utama supaya pemain & rekan lain aman. */
    const taunt=n.role.skill.id==='taunt'||n.role.skill.id==='aegis'||n.role.skill.id==='lionclaw';
    if(m.state!=='chase'||taunt){
      m.dir=Math.atan2(n.pos.x-m.pos.x,n.pos.z-m.pos.z);
      m.walking=true;m.t=Math.max(m.t,0.4);
    }
    if(m.atkCd<=0&&d<2.1){m.atkCd=1.1;this.hurt(n,m.dmg);}
  },

  /* ---------- MUNDUR & PULIHKAN DIRI ---------- 
     Dua fase:
     1. Kabur — selama masih ada monster dalam RETREAT_SAFE, NPC bergerak
        menjauhi monster terdekat (rekan cenderung berlindung ke arah pemain,
        penjaga desa ke arah rumahnya).
     2. Menepi — setelah aman, NPC berhenti dan memulihkan HP RETREAT_REGEN
        per detik. Baru setelah HP ≥ REJOIN_HP ia mau bertarung lagi. */
  aiRetreat(n,dt){
    const maxHp=this.npcMaxHp(n);
    /* REKAN TIM TIDAK KABUR MENJAUH — pemain melaporkan rekan lari menjauh
       persis saat paling dibutuhkan. Sekarang rekan yang terluka justru
       MERAPAT ke pemain (berlindung di belakangnya), berhenti di sisi
       FOLLOW_R+2, dan pulih di sana. Penduduk desa tetap kabur ke rumahnya. */
    if(this.isTeam(n)){
      const pdx=Player.pos.x-n.pos.x,pdz=Player.pos.z-n.pos.z;
      const pd=Math.hypot(pdx,pdz)||0.001;
      const hold=CFG.NPC.FOLLOW_R+2;
      if(pd>hold){
        const ang=this.steer(n,Math.atan2(pdx,pdz));
        n.mesh.rotation.y=angLerp(n.mesh.rotation.y,ang,dt*7);
        const sp=n.speed*(n.inWater?0.5:1)*CFG.NPC.RETREAT_SPEED;
        n.vel.x=lerp(n.vel.x,Math.sin(ang)*sp,clamp(7*dt,0,1));
        n.vel.z=lerp(n.vel.z,Math.cos(ang)*sp,clamp(7*dt,0,1));
      }else{
        /* sudah di sisi pemain: berhenti & pulihkan diri */
        const damp=Math.exp(-6*dt);
        n.vel.x*=damp;n.vel.z*=damp;
        n.hp=Math.min(maxHp,n.hp+CFG.NPC.RETREAT_REGEN*dt);
        n.healFxT=(n.healFxT||0)-dt;
        if(n.healFxT<=0){
          n.healFxT=0.5;
          FX.debris(n.pos.clone().add(new THREE.Vector3(0,1.2,0)),0x7dffb0,2,1.2);
        }
        UI.renderTeam();
      }
      if(n.hp>=maxHp*CFG.NPC.REJOIN_HP){
        n.retreat=false;
        this.say(n,NPC_REJOIN_LINE(),2.6);
        FX.text(n.pos.clone().add(new THREE.Vector3(0,2.3,0)),'⚔ siap lagi','#8fe07a');
      }
      return;
    }
    /* ---------- penduduk desa: perilaku lama (kabur dari monster) ---------- */
    /* monster terdekat sebagai sumber ancaman */
    let threat=null,td=1e9;
    for(const m of Monsters.list){
      if(m.dead)continue;
      const d=m.pos.distanceTo(n.pos);
      if(d<td){td=d;threat=m;}
    }
    /* hysteresis: batas aman diperlebar saat sedang kabur supaya NPC tidak
       bergetar bolak-balik antara kabur dan berhenti di sekitar threshold */
    const safe=!threat||td>CFG.NPC.RETREAT_SAFE+2;
    if(!safe){
      /* arah kabur: menjauhi monster, dicampur arah tempat berlindung */
      const away=new THREE.Vector3().subVectors(n.pos,threat.pos).setY(0);
      if(away.lengthSq()<0.0001)away.set(1,0,0);
      away.normalize();
      const shelter=new THREE.Vector3(n.home.x,n.pos.y,n.home.z);
      const toShelter=new THREE.Vector3().subVectors(shelter,n.pos).setY(0);
      if(toShelter.lengthSq()>0.0001)away.addScaledVector(toShelter.normalize(),0.6);
      const ang=this.steer(n,Math.atan2(away.x,away.z));
      n.mesh.rotation.y=angLerp(n.mesh.rotation.y,ang,dt*7);
      const sp=n.speed*(n.inWater?0.5:1)*CFG.NPC.RETREAT_SPEED;
      n.vel.x=lerp(n.vel.x,Math.sin(ang)*sp,clamp(7*dt,0,1));
      n.vel.z=lerp(n.vel.z,Math.cos(ang)*sp,clamp(7*dt,0,1));
    }else{
      /* menepi: berhenti & mengobati luka */
      const damp=Math.exp(-6*dt);
      n.vel.x*=damp;n.vel.z*=damp;
      n.hp=Math.min(maxHp,n.hp+CFG.NPC.RETREAT_REGEN*dt);
      n.healFxT=(n.healFxT||0)-dt;
      if(n.healFxT<=0){
        n.healFxT=0.5;
        FX.debris(n.pos.clone().add(new THREE.Vector3(0,1.2,0)),0x7dffb0,2,1.2);
      }
    }
    /* syarat kembali bertarung: HP sudah mencapai REJOIN_HP */
    if(n.hp>=maxHp*CFG.NPC.REJOIN_HP){
      n.retreat=false;
      this.say(n,NPC_REJOIN_LINE(),2.6);
      FX.text(n.pos.clone().add(new THREE.Vector3(0,2.3,0)),'⚔ siap lagi','#8fe07a');
    }
  },

  /* rekan berjalan di belakang pemain, berhenti bila sudah cukup dekat.
     Hysteresis dipakai agar NPC tidak maju-mundur kecil di batas jarak. */
  aiFollow(n,dt){
    const pdx=Player.pos.x-n.pos.x,pdz=Player.pos.z-n.pos.z;
    const pd=Math.hypot(pdx,pdz);
    if(n._followMove===undefined)n._followMove=pd>CFG.NPC.FOLLOW_R;
    if(pd>CFG.NPC.FOLLOW_R+0.5)n._followMove=true;
    else if(pd<CFG.NPC.FOLLOW_R-0.35)n._followMove=false;

    if(n._followMove){
      /* tujuan default = pemain. TAPI bila pemain di dalam bangunan sementara
         NPC masih di luar, arahkan NPC ke pintu dulu (titik luar -> titik dalam)
         supaya ia masuk lewat pintu, bukan menabrak tembok. */
      let gx=Player.pos.x,gz=Player.pos.z;
      if(typeof WGEN!=='undefined'&&WGEN.buildingAt){
        const pb=WGEN.buildingAt(Player.pos.x,Player.pos.z,0);
        const nb=WGEN.buildingAt(n.pos.x,n.pos.z,0);
        if(pb&&nb!==pb){
          const dr=this.doorOf(pb);
          const dOut=Math.hypot(dr.ox-n.pos.x,dr.oz-n.pos.z);
          if(dOut>1.15){gx=dr.ox;gz=dr.oz;}       // masih jauh -> menuju mulut pintu
          else{gx=dr.ix;gz=dr.iz;}                 // sudah dekat -> lewat pintu masuk
        }
      }
      const to=new THREE.Vector3(gx-n.pos.x,0,gz-n.pos.z);
      const gd=to.length();
      /* arah lurus ke tujuan, lalu dibelokkan bila terhalang pohon/tembok */
      const ang=this.steer(n,Math.atan2(to.x,to.z));
      n.mesh.rotation.y=angLerp(n.mesh.rotation.y,ang,dt*6);
      /* makin jauh makin cepat supaya tidak pernah tertinggal saat sprint */
      const sp=n.speed*(n.inWater?0.5:1)*clamp(gd/6,0.5,1.6);
      n.vel.x=lerp(n.vel.x,Math.sin(ang)*sp,clamp(6*dt,0,1));
      n.vel.z=lerp(n.vel.z,Math.cos(ang)*sp,clamp(6*dt,0,1));
    }else{
      const damp=Math.exp(-6*dt);
      n.vel.x*=damp;n.vel.z*=damp;
      /* menghadap arah pandang pemain saat berdiri menunggu */
      n.mesh.rotation.y=angLerp(n.mesh.rotation.y,Cam.yaw,dt*3);
    }
  },

  /* ---------- PETANI ----------
     NPC farmer mencari lahan B.FARM:
     - panen tanaman matang,
     - tanam benih di ladang kosong.
     Petani desa (bukan team) memakai benih internal tak terbatas.
     Petani team HARUS punya benih di tasnya. */
  findFarmTask(n){
    if(typeof Farming==='undefined')return null;
    const R=42;
    let best=null,bd=1e9;
    /* panen dulu */
    for(const p of Farming.list){
      if(p.stage!==3)continue;
      const d=Math.hypot(p.x+0.5-n.pos.x,p.z+0.5-n.pos.z);
      if(d<R&&d<bd){bd=d;best={action:'harvest',x:p.x,y:p.y,z:p.z};}
    }
    if(best)return best;

    /* tanam: team butuh benih di tas */
    const team=this.isTeam(n);
    let seedIdx=null,crop=null;
    if(team){
      for(let i=0;i<n.bag.length;i++){
        const s=n.bag[i];
        if(s&&Farming.SEED_TO_CROP[s.id]){
          seedIdx=i;crop=Farming.SEED_TO_CROP[s.id];break;
        }
      }
      if(seedIdx===null)return null;
    }else{
      const keys=Object.keys(Farming.CROPS);
      crop=keys[(Math.random()*keys.length)|0];
    }

    for(const[k,f]of Farming.farmBlocks){
      if(Farming.map.has(k))continue;
      const d=Math.hypot(f.x+0.5-n.pos.x,f.z+0.5-n.pos.z);
      if(d<R&&d<bd){
        bd=d;
        best={action:'plant',x:f.x,y:f.y,z:f.z,seedIdx,crop};
      }
    }
    return best;
  },

  aiFarmer(n,dt){
    const team=this.isTeam(n);
    n.farmT=(n.farmT||0);
    n._noSeedT=Math.max(0,(n._noSeedT||0)-dt);

    if(!n.farmTask){
      n.farmTask=this.findFarmTask(n);
      n.farmT=0;
      if(!n.farmTask&&team&&n._noSeedT<=0){
        /* cek apakah memang tidak ada benih */
        let hasSeed=false;
        for(const s of n.bag)if(s&&Farming.SEED_TO_CROP[s.id]){hasSeed=true;break;}
        if(!hasSeed){
          UI.toast(`🌾 ${n.name} butuh benih di tasnya untuk farming`);
          n._noSeedT=25;
        }
      }
    }

    const task=n.farmTask;
    if(!task){
      /* PETANI DESA: bila mengantongi hasil panen, simpan ke peti rumah terdekat */
      if(!team){
        const isCrop=id=>id==='wheat'||id==='carrot'||id==='cabbage'||id==='tomato'||id==='watermelon'||
                         (typeof Farming!=='undefined'&&Farming.CROPS&&Farming.CROPS[id]);
        const hasCrops=n.bag&&n.bag.some(s=>s&&isCrop(s.id));
        if(hasCrops){
          const chest=(typeof Furni!=='undefined'&&Furni.list)
            ?Furni.list.find(f=>f.def==='chest'&&Math.hypot(f.x-n.pos.x,f.z-n.pos.z)<50):null;
          if(chest){
            const cdx=chest.x+0.5-n.pos.x,cdz=chest.z+0.5-n.pos.z;
            const cd=Math.hypot(cdx,cdz);
            const ang=this.steer(n,Math.atan2(cdx,cdz));
            n.mesh.rotation.y=angLerp(n.mesh.rotation.y,ang,dt*6);
            if(cd>1.8){
              const sp=n.speed*(n.inWater?0.5:1)*0.85;
              n.vel.x=lerp(n.vel.x,Math.sin(ang)*sp,clamp(6*dt,0,1));
              n.vel.z=lerp(n.vel.z,Math.cos(ang)*sp,clamp(6*dt,0,1));
              return;
            }
            n.vel.x*=0.5;n.vel.z*=0.5;
            let stored=0;
            for(let i=0;i<n.bag.length;i++){
              const s=n.bag[i];
              if(s&&isCrop(s.id)){
                Furni.chestAdd(chest,s.id,s.n);
                stored+=s.n;
                n.bag[i]=null;
              }
            }
            if(stored>0){
              if(typeof FX!=='undefined'&&FX.text)
                FX.text(new THREE.Vector3(chest.x,chest.y+1.2,chest.z),`+${stored} Panen disimpan!`,'#63d471','f_chest');
              if(typeof Sfx!=='undefined'&&Sfx.craft)Sfx.craft();
            }
            return;
          }
        }
      }
      /* tidak ada kerjaan: jalan santai di sekitar */
      n.t-=dt;
      if(n.t<=0){n.t=rand(2,5);n.dir=Math.random()*Math.PI*2;n.walking=Math.random()<0.55;}
      if(n.walking){
        n.mesh.rotation.y=angLerp(n.mesh.rotation.y,n.dir,dt*4);
        const sp=n.speed*(n.inWater?0.5:1)*0.45;
        n.vel.x=lerp(n.vel.x,Math.sin(n.dir)*sp,clamp(5*dt,0,1));
        n.vel.z=lerp(n.vel.z,Math.cos(n.dir)*sp,clamp(5*dt,0,1));
      }else{
        const damp=Math.exp(-5*dt);
        n.vel.x*=damp;n.vel.z*=damp;
      }
      return;
    }

    /* validasi task */
    const k=Farming.key(task.x,task.y,task.z);
    if(task.action==='harvest'){
      const p=Farming.map.get(k);
      if(!p||p.stage!==3){n.farmTask=null;return;}
    }else{
      if(World.getBlock(task.x,task.y,task.z)!==B.FARM||Farming.map.has(k)){n.farmTask=null;return;}
      if(team&&(task.seedIdx==null||!n.bag[task.seedIdx])){n.farmTask=null;return;}
    }

    /* jalan ke ladang */
    const tx=task.x+0.5,tz=task.z+0.5;
    const dx=tx-n.pos.x,dz=tz-n.pos.z;
    const d=Math.hypot(dx,dz);
    const ang=this.steer(n,Math.atan2(dx,dz));
    n.mesh.rotation.y=angLerp(n.mesh.rotation.y,ang,dt*6);
    if(d>1.5){
      const sp=n.speed*(n.inWater?0.5:1)*0.9;
      n.vel.x=lerp(n.vel.x,Math.sin(ang)*sp,clamp(6*dt,0,1));
      n.vel.z=lerp(n.vel.z,Math.cos(ang)*sp,clamp(6*dt,0,1));
      n.farmT=0;
      return;
    }

    /* sampai: kerjakan */
    const damp=Math.exp(-6*dt);
    n.vel.x*=damp;n.vel.z*=damp;
    n.farmT+=dt;
    n.swing=Math.max(n.swing,0.2);
    const dur=(n.role.skill&&n.role.skill.id==='green')?0.8:1.2;
    if(n.farmT>=dur){
      if(task.action==='harvest'){
        const p=Farming.map.get(k);
        if(p)Farming.harvestByNpc(p,n);
      }else{
        if(team&&task.seedIdx!=null){
          const s=n.bag[task.seedIdx];
          if(s){
            s.n--;if(s.n<=0)n.bag[task.seedIdx]=null;
            UI.renderNpcPanel();UI.renderTeam();
          }
        }
        Farming.plant(task.x,task.y,task.z,task.crop);
      }
      n.farmTask=null;
      n.farmT=0;
    }
  },

  /* ---------- perintah: kumpulkan resource ---------- 
     Rekan mencari blok yang boleh dipanen di sekitar PEMAIN (radius
     CFG.NPC.GATHER_R) supaya tidak pernah berkeliaran terlalu jauh, menambang
     selama MINE_TIME, lalu menyimpan hasilnya ke tasnya sendiri.

     KLAIM NODE: tiap rekan MEMBOOKING blok yang sedang dikerjakannya. Tanpa ini
     dua rekan bisa memilih blok yang sama, lalu separate() saling mendorong
     mereka keluar-masuk jangkauan tambang sehingga progresnya terus ter-reset
     dan bloknya tidak pernah hancur. */
  nodeKey(t){return t.x+','+t.y+','+t.z;},
  /* apakah node ini sudah diklaim rekan LAIN yang masih hidup & masih menggarapnya? */
  nodeClaimed(x,y,z,self){
    const k=x+','+y+','+z;
    for(const o of this.list){
      if(o===self||o.dead||!o.mineAt)continue;
      if(this.nodeKey(o.mineAt)===k)return true;
    }
    return false;
  },
  /* =========================================================================
     BLOK MILIK BANGUNAN — TIDAK BOLEH DIPANEN REKAN
     -------------------------------------------------------------------------
     Dinding rumah memakai blok WOOD sebagai tiang sudut & balok atas, dan WOOD
     ada di tabel panen (kayu pohon). Akibatnya rekan yang diperintah "cari
     resource" ikut membongkar tiang rumah pemain maupun rumah desa — rumah jadi
     berlubang sendiri. Fungsi ini menandai blok yang merupakan bagian bangunan
     sehingga findNode melewatinya:
       · footprint rumah modular pemain (Furni.houses),
       · footprint bangunan desa (WGEN.buildingAt),
       · blok bahan bangunan (PLANK & ROOF) di mana pun ia berada — keduanya
         tidak pernah muncul secara alami di terrain.
     ========================================================================= */
  isStructureBlock(x,y,z){
    const b=World.getBlock(x,y,z);
    if(b===B.PLANK||b===B.ROOF)return true;
    /* rumah modular milik pemain */
    if(typeof Furni!=='undefined'&&Furni.houses&&Furni.houses.length&&
       Furni.houseFpAt&&Furni.houseFpAt(x,z))return true;
    /* bangunan desa (rumah penduduk, tavern, menara, sumur) — pad 1 blok
       supaya tritisan atap & tiang tepi ikut terlindung */
    if(typeof WGEN!=='undefined'&&WGEN.buildingAt&&WGEN.buildingAt(x,z,1))return true;
    return false;
  },
  findNode(n){
    const px=Math.floor(Player.pos.x),pz=Math.floor(Player.pos.z);
    const R=CFG.NPC.GATHER_R;
    let best=null,bd=1e9;
    for(let dx=-R;dx<=R;dx++)for(let dz=-R;dz<=R;dz++){
      const x=px+dx,z=pz+dz;
      if(dx*dx+dz*dz>R*R)continue;
      /* Jaraknya diukur dari NPC, bukan dari pemain: rekan selalu mengerjakan
         node yang paling dekat dengan tempatnya berdiri dulu. */
      const ddx=x+0.5-n.pos.x,ddz=z+0.5-n.pos.z;
      const dn=ddx*ddx+ddz*ddz;
      if(dn>=bd)continue;
      /* seluruh kolom ini milik bangunan → lewati tanpa memindai */
      if(this.isStructureBlock(x,1,z))continue;
      /* Kolom dipindai dari BAWAH ke atas dan berhenti di blok pertama yang
         boleh dipanen — pohon jadi ditebang mulai dari pangkalnya lalu naik,
         bukan dipetik dari pucuk. Blok yang terkubur (tidak bersentuhan
         dengan udara) dilewati karena mustahil dijangkau. */
      let found=null;
      for(let y=1;y<CFG.WORLD_H;y++){
        const b=World.getBlock(x,y,z);
        if(b===B.AIR||b===B.WATER)continue;
        const g=this.gatherInfo(b);
        if(!g||!this.reachable(x,y,z,n))continue;
        if(this.isStructureBlock(x,y,z))break;   // bagian bangunan: jangan dibongkar
        if(this.nodeClaimed(x,y,z,n))break;      // sedang digarap rekan lain
        found={x,y,z,item:g.item};break;
      }
      if(found){best=found;bd=dn;}
    }
    return best;
  },
  /* blok bisa dikerjakan bila salah satu sisinya terbuka & tidak terlalu tinggi.
     CATATAN: keenam sisi diperiksa. Dulu sisi −X terlewat, sehingga blok yang
     hanya menganga ke arah itu dianggap mustahil dijangkau dan rekan memilih
     node lain yang lebih jauh. */
  reachable(x,y,z,n){
    if(y>Math.floor(n.pos.y)+3)return false;
    const air=b=>b===B.AIR||b===B.WATER||b===B.LEAF;
    return air(World.getBlock(x,y+1,z))||
           air(World.getBlock(x+1,y,z))||air(World.getBlock(x-1,y,z))||
           air(World.getBlock(x,y,z+1))||air(World.getBlock(x,y,z-1));
  },
  /* ---------- mencari makanan (beri & jamur) di sekitar pemain ---------- 
     Tanaman disimpan per-chunk sebagai daftar {x,y,z,t} dengan koordinat lokal.
     t=7 SEMAK BERI (model voxel; dulu t=4 billboard), t=5 jamur. Rekan
     memanennya untuk menambah bekal makanan. */
  findFood(n){
    const R=CFG.NPC.GATHER_R;
    let best=null,bd=1e9;
    const pcx=Math.floor(Player.pos.x/16),pcz=Math.floor(Player.pos.z/16);
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
      const cx=pcx+dx,cz=pcz+dz;
      const c=World.chunks.get(cx+','+cz);
      if(!c||!c.plants)continue;
      for(const p of c.plants){
        /* t=4 tetap diterima demi chunk lama yang dibuat sebelum semak voxel */
        const berry=(p.t===7||p.t===4);
        if(!berry&&p.t!==5)continue;                  // hanya beri & jamur
        const wx=cx*16+p.x+0.5,wz=cz*16+p.z+0.5;
        if(Math.hypot(wx-Player.pos.x,wz-Player.pos.z)>R)continue;
        const dn=Math.hypot(wx-n.pos.x,wz-n.pos.z);
        if(dn<bd){bd=dn;best={x:wx,y:p.y,z:wz,cx,cz,p,
          item:berry?'berry':'mush',cnt:berry?2:1};}
      }
    }
    return best;
  },
  /* ---------- apakah rekan perlu menimbun makanan? (bekal menipis) ---------- */
  needsFood(n){
    let stock=0;
    for(const s of n.bag)if(s&&ITEMS[s.id].food)stock+=s.n;
    return stock<3;
  },
  /* =========================================================================
     BERBURU HEWAN untuk BEKAL (sapi & kelinci)
     -------------------------------------------------------------------------
     Selain memetik semak beri & jamur, rekan yang diperintah "cari resource"
     kini ikut memburu hewan jinak terdekat — sapi (daging + kulit) dan kelinci
     (daging). Keduanya tidak menyerang balik, jadi ini murni pengumpulan bekal.

     `n.prey` menandai hewan yang sedang diburu. Monsters.hurt punya penjaga
     "NPC tidak boleh melukai hewan ternak" supaya penjaga desa tidak
     menyembelih sapi sembarangan; penjaga itu kini memberi pengecualian khusus
     untuk hewan yang memang sedang diburu (lihat monsters.js).
     ========================================================================= */
  PREY:{cow:1,rabbit:1},
  findPrey(n){
    if(typeof Monsters==='undefined'||!Monsters.list)return null;
    const R=CFG.NPC.GATHER_R;
    let best=null,bd=1e9;
    for(const m of Monsters.list){
      if(m.dead||m.pet||m.catchActive)continue;
      if(!this.PREY[m.type])continue;
      /* tetap di sekitar pemain supaya rekan tidak berkeliaran jauh */
      if(Math.hypot(m.pos.x-Player.pos.x,m.pos.z-Player.pos.z)>R)continue;
      const d=Math.hypot(m.pos.x-n.pos.x,m.pos.z-n.pos.z);
      if(d<bd){bd=d;best=m;}
    }
    return best;
  },
  aiHunt(n,dt,prey){
    n.prey=prey;
    const to=new THREE.Vector3().subVectors(prey.pos,n.pos).setY(0);
    const d=to.length();
    const ang=this.steer(n,Math.atan2(to.x,to.z));
    n.mesh.rotation.y=angLerp(n.mesh.rotation.y,ang,dt*7);
    const reach=this.npcReach(n);
    if(d>reach*0.85){
      const sp=n.speed*(n.inWater?0.5:1);
      n.vel.x=lerp(n.vel.x,Math.sin(ang)*sp,clamp(7*dt,0,1));
      n.vel.z=lerp(n.vel.z,Math.cos(ang)*sp,clamp(7*dt,0,1));
      return;
    }
    n.vel.x*=Math.exp(-7*dt);n.vel.z*=Math.exp(-7*dt);
    n.working=true;                       // memburu = bekerja (anti checkStuck)
    if(n.atkCd>0)return;
    n.atkCd=CFG.NPC.ATK_CD;n.swing=0.25;
    const dir=to.clone().normalize().setY(0.25);
    const wasDead=prey.dead;
    Monsters.hurt(prey,this.npcDmg(n),dir,3,n);
    FX.debris(prey.pos.clone().add(new THREE.Vector3(0,1,0)),0xffe08a,4,2);
    Sfx.at(prey.pos,'hit');
    if(!wasDead&&prey.dead){
      /* hasil buruan langsung masuk tas rekan supaya tidak berserakan */
      const loot=prey.type==='cow'?[['meat',2],['leather',1]]:[['meat',1]];
      for(const [id,cnt] of loot)this.bagAdd(n,id,cnt);
      FX.text(n.pos.clone().add(new THREE.Vector3(0,2,0)),
        `${ITEMS.meat.e}+${prey.type==='cow'?2:1}`,'#ffc98a');
      this.gainXp(n,4);
      n.prey=null;
      UI.renderNpcPanel();
    }
  },
  aiGather(n,dt){
    if(this.bagFull(n)){
      UI.toast(`Tas ${n.name} penuh — ambil isinya dulu`);
      this.setOrder(n,'follow');return;
    }
    /* buruan yang sudah mati / hilang dilepas */
    if(n.prey&&(n.prey.dead||Monsters.list.indexOf(n.prey)<0))n.prey=null;
    /* PRIORITAS BEKAL: selama makanan menipis, rekan mencari makanan dulu —
       semak beri / jamur, lalu berburu sapi & kelinci terdekat. Blok tambang
       baru dikerjakan setelah bekalnya cukup. */
    if(!n.mineAt&&this.needsFood(n)){
      if(n.prey&&!n.prey.dead){this.aiHunt(n,dt,n.prey);return;}
      const food=this.findFood(n);
      if(food){this.aiForage(n,dt,food);return;}
      const prey=this.findPrey(n);
      if(prey){this.aiHunt(n,dt,prey);return;}
    }
    /* target hilang / sudah ditambang orang lain → cari lagi.
       Sekaligus penjaga: bila node sudah TIDAK terjangkau (mis. tertimbun blok
       lain), lepaskan supaya rekan tidak berdiri mengayun tanpa hasil. */
    if(n.mineAt){
      const b=World.getBlock(n.mineAt.x,n.mineAt.y,n.mineAt.z);
      if(!NPC_GATHER.some(e=>e.block===b))n.mineAt=null;
      /* penjaga tambahan: blok yang ternyata bagian bangunan dilepas, mis.
         rumah baru dipasang pemain tepat di atas node yang sedang digarap */
      else if(this.isStructureBlock(n.mineAt.x,n.mineAt.y,n.mineAt.z)){
        FX.clearBlockShake(n.mineAt.x,n.mineAt.y,n.mineAt.z);
        n.mineAt=null;n.mineT=0;
      }
      else if(!this.reachable(n.mineAt.x,n.mineAt.y,n.mineAt.z,n)){
        FX.clearBlockShake(n.mineAt.x,n.mineAt.y,n.mineAt.z);
        n.mineAt=null;n.mineT=0;
      }
    }
    if(!n.mineAt){
      n.mineAt=this.findNode(n);n.mineT=0;
      if(!n.mineAt){this.aiFollow(n,dt);return;}
    }
    const t=n.mineAt;
    const to=new THREE.Vector3(t.x+0.5-n.pos.x,0,t.z+0.5-n.pos.z);
    const d=to.length();
    const ang=this.steer(n,Math.atan2(to.x,to.z));
    n.mesh.rotation.y=angLerp(n.mesh.rotation.y,ang,dt*6);
    /* Jangkauan tambang lebih longgar daripada jarak berhenti (1.6 vs 2.4):
       tanpa histeresis ini, dorongan separate() sedikit saja membuat NPC
       melewati batas, `n.mineT=0` dijalankan, dan progresnya hilang terus —
       salah satu penyebab blok tak pernah hancur. Sekarang NPC berhenti pada
       1.6 tapi progres tetap jalan sampai 2.4. */
    const REACH=2.4;
    if(d>REACH){
      const sp=n.speed*(n.inWater?0.5:1)*0.9;
      n.vel.x=lerp(n.vel.x,Math.sin(ang)*sp,clamp(6*dt,0,1));
      n.vel.z=lerp(n.vel.z,Math.cos(ang)*sp,clamp(6*dt,0,1));
      n.mineT=0;
      return;
    }
    if(d>1.6){
      /* masih dalam jangkauan tapi belum ideal: terus merapat TANPA membuang
         progres yang sudah terkumpul */
      const sp=n.speed*(n.inWater?0.5:1)*0.9;
      n.vel.x=lerp(n.vel.x,Math.sin(ang)*sp,clamp(6*dt,0,1));
      n.vel.z=lerp(n.vel.z,Math.cos(ang)*sp,clamp(6*dt,0,1));
    }else{
      n.vel.x*=0.7;n.vel.z*=0.7;
    }
    /* menandai "sedang bekerja" agar checkStuck tidak salah menilai NPC yang
       berdiri diam menambang sebagai macet (lihat catatan di checkStuck). */
    n.working=true;
    n.swing=Math.max(n.swing,0.2);                  // animasi mengayun alat
    /* skill Tangan Tambang mempercepat penambangan 2× */
    const rate=n.role.skill.id==='digger'?2:1;
    n.mineT+=dt*rate;
    /* tiap ayunan alat, blok yang ditambang ikut bergetar + memercik supaya
       terlihat jelas rekan NPC sedang mengerjakan resource itu */
    n.minePulse=(n.minePulse||0)+dt*rate;
    if(n.minePulse>=0.42){
      n.minePulse=0;
      const bid=World.getBlock(t.x,t.y,t.z);
      const col=(BLOCK_INFO[bid]||{}).color||0x9aa0a8;
      FX.blockShake(t.x,t.y,t.z,col,0.85);
      FX.debris(new THREE.Vector3(t.x+0.5,t.y+0.5,t.z+0.5),col,2,1.3);
      /* suara menambang rekan juga diredam jarak (dulu selalu volume penuh) */
      const spos=new THREE.Vector3(t.x+0.5,t.y+0.5,t.z+0.5);
      if(bid===B.STONE)Sfx.at(spos,'rock');else Sfx.at(spos,'chop');

    }
    if(n.mineT<CFG.NPC.MINE_TIME)return;
    n.mineT=0;n.minePulse=0;
    FX.clearBlockShake(t.x,t.y,t.z);
    const mined=World.getBlock(t.x,t.y,t.z);
    World.setBlock(t.x,t.y,t.z,B.AIR);
    FX.debris(new THREE.Vector3(t.x+0.5,t.y+0.5,t.z+0.5),
      (BLOCK_INFO[mined]||{}).color||0x9aa0a8,5,2);
    /* POHON TUMBANG: menebang batang paling bawah membuat sisa batang di
       atasnya runtuh berurutan, sama seperti saat PEMAIN menebangnya
       (World.fellTree). Dulu rekan hanya melenyapkan satu blok kayu, jadi
       pohon tetap menggantung di udara dan rekan harus memanjat blok demi
       blok — pohon pun tidak pernah benar-benar tumbang. */
    if(mined===B.WOOD&&World.fellTree)World.fellTree(t.x,t.y,t.z);
    /* daun yang kehilangan batang penopang ikut membusuk */
    if(mined===B.WOOD&&World.leafDecay)World.leafDecay(t.x,t.y,t.z);
    let cnt=1;
    if(n.role.skill.id==='digger'&&Math.random()<0.35)cnt++;
    this.bagAdd(n,t.item,cnt);
    /* batu kadang menghasilkan batu bara sebagai bahan bakar tambahan */
    if(t.item==='stone'&&Math.random()<0.25)this.bagAdd(n,'coal',1);
    this.gainXp(n,3);
    n.mineAt=null;
    UI.renderNpcPanel();
  },

  /* memanen tanaman makanan lalu menyimpannya sebagai bekal */
  aiForage(n,dt,f){
    const to=new THREE.Vector3(f.x-n.pos.x,0,f.z-n.pos.z);
    const d=to.length();
    const ang=this.steer(n,Math.atan2(to.x,to.z));
    n.mesh.rotation.y=angLerp(n.mesh.rotation.y,ang,dt*6);
    if(d>1.3){
      const sp=n.speed*(n.inWater?0.5:1)*0.9;
      n.vel.x=lerp(n.vel.x,Math.sin(ang)*sp,clamp(6*dt,0,1));
      n.vel.z=lerp(n.vel.z,Math.cos(ang)*sp,clamp(6*dt,0,1));
      return;
    }
    n.vel.x*=0.7;n.vel.z*=0.7;
    n.working=true;            // memanen juga "bekerja" (lihat checkStuck)
    n.swing=Math.max(n.swing,0.2);
    n.forageT=(n.forageT||0)+dt;
    if(n.forageT<0.9)return;
    n.forageT=0;
    /* cabut tanaman langsung dari chunk — hasilnya masuk tas rekan, bukan
       berserakan di tanah seperti panen pemain */
    const c=World.chunks.get(f.cx+','+f.cz);
    if(!c)return;
    const i=c.plants.indexOf(f.p);
    if(i<0)return;
    c.plants.splice(i,1);
    World.markDirty(f.cx,f.cz);
    const got=f.cnt;
    this.bagAdd(n,f.item,got);
    FX.debris(new THREE.Vector3(f.x,f.y+0.4,f.z),0x5d9e3f,4,1.5);
    FX.text(n.pos.clone().add(new THREE.Vector3(0,2,0)),
      `+${got}`,'#c9f07a',f.item);
    Sfx.pickup();
    this.gainXp(n,2);
    UI.renderNpcPanel();
  },

  aiPatrol(n,dt){
    n.state='patrol';
    n.t-=dt;
    /* NPC bertugas tavern berpatroli dalam radius kecil di dalam tavern */
    const R=n.tavernSpot?4.5:CFG.NPC.HOME_R;
    const dh=Math.hypot(n.pos.x-n.home.x,n.pos.z-n.home.z);
    if(dh>R){
      n.dir=Math.atan2(n.home.x-n.pos.x,n.home.z-n.pos.z);n.t=1.5;
    }else if(n.t<=0){
      n.t=rand(2,5);n.dir=Math.random()*Math.PI*2;
      n.walking=Math.random()<(n.tavernSpot?0.35:0.65);
    }
    if(n.walking||dh>R){
      n.mesh.rotation.y=angLerp(n.mesh.rotation.y,n.dir,dt*4);
      const sp=n.speed*(n.tavernSpot?0.28:0.42);
      n.vel.x=lerp(n.vel.x,Math.sin(n.dir)*sp,clamp(4*dt,0,1));
      n.vel.z=lerp(n.vel.z,Math.cos(n.dir)*sp,clamp(4*dt,0,1));
    }else{n.vel.x*=0.85;n.vel.z*=0.85;}
  },

  physics(n,dt){
    n._stepCd=Math.max(0,(n._stepCd||0)-dt);
    n.inWater=World.inWaterAt(n.pos.x,n.pos.y+0.3,n.pos.z);
    n.vel.y-=CFG.GRAV*(n.inWater?0.3:1)*dt;
    if(n.inWater){
      if(n.pos.y<CFG.WATER_Y-0.5)n.vel.y+=18*dt;
      n.vel.y=clamp(n.vel.y,-3,3.5);
    }
    /* ---------- NAIK SATU BLOK (proaktif, SEBELUM uji tabrakan) ----------
       Dijalankan lebih dulu supaya arah lompatan masih arah gerak asli: uji
       tabrakan di bawah menolak langkah ke pijakan yang lebih tinggi lalu
       memutar arah, jadi cek yang dijalankan sesudahnya akan meleset.
       Ini juga yang membuat NPC bisa keluar dari air ke tepi daratan setinggi
       1 blok — di air `onGround` selalu false sehingga jalur onBump lama tidak
       pernah aktif. */
    const hspd0=Math.hypot(n.vel.x,n.vel.z);
    if(hspd0>0.15){
      const wa=Math.atan2(n.vel.x,n.vel.z);
      this.tryStepUp(n,n.pos.x+Math.sin(wa)*0.8,n.pos.z+Math.cos(wa)*0.8);
    }
    /* patokan tinggi SEBELUM gravitasi (lihat BUGFIX di Player.update) */
    const px0=n.pos.x,pz0=n.pos.z,py0=n.pos.y;
    const nx=n.pos.x+n.vel.x*dt;
    /* Langkah sumbu X: 1 blok (<= py0+1.25) boleh dilewati; 2+ blok / tembok dihadang & onBump */
    if(World.groundAt(nx,n.pos.z,py0+1.8)<=py0+1.25&&
       !World.blockedAt(nx,n.pos.y+0.2,n.pos.z,this.BODY_R))n.pos.x=nx;
    else{n.vel.x=0;this.onBump(n,nx,n.pos.z);}
    const nz=n.pos.z+n.vel.z*dt;
    if(World.groundAt(n.pos.x,nz,py0+1.8)<=py0+1.25&&
       !World.blockedAt(n.pos.x,n.pos.y+0.2,nz,this.BODY_R))n.pos.z=nz;
    else{n.vel.z=0;this.onBump(n,n.pos.x,nz);}
    n.pos.y+=n.vel.y*dt;
    /* BUGFIX tersedot ke dalam terrain: bila tanah di posisi baru terlalu
       tinggi, gerak horizontal dibatalkan; dan NPC selalu didorong ke
       permukaan bila berada di bawahnya. Pencarian lantai diukur dari py0
       (sebelum gravitasi) agar konsisten; pass unburyY menjamin NPC tidak
       pernah tersisa DI DALAM blok padat. */
    const nrefY=Math.max(py0,n.pos.y)+1.8;
    let g=World.groundAt(n.pos.x,n.pos.z,nrefY);
    if(g>py0+1.05){
      n.pos.x=px0;n.pos.z=pz0;n.vel.x=0;n.vel.z=0;
      g=World.groundAt(px0,pz0,nrefY);
    }
    n.onGround=false;
    if(n.pos.y<=g){n.pos.y=g;if(n.vel.y<0)n.vel.y=0;n.onGround=true;}
    const nub=World.unburyY(n.pos.x,n.pos.z,n.pos.y);
    if(nub>n.pos.y){n.pos.y=nub;if(n.vel.y<0)n.vel.y=0;n.onGround=true;}
    /* RIDE WAVE: NPC yang berdiri di atas blok tanah terangkat ikut naik */
    if(typeof FX!=='undefined'&&FX.waveHeightAt){
      const wh=FX.waveHeightAt(n.pos.x,n.pos.z);
      if(wh>0.03&&n.pos.y<g+wh){n.pos.y=g+wh;if(n.vel.y<0)n.vel.y=0;n.onGround=true;}
    }
    /* CATATAN: cek "naik satu blok" sudah dijalankan di AWAL physics(). */
    n.vel.x*=Math.exp(-2*dt);n.vel.z*=Math.exp(-2*dt);
    this.separate(n,dt);                          // badan tidak saling menembus
    this.unroof(n);                               // anti-nyangkut di atap/tembok rumah
  },

  /* =========================================================================
     ANTI-STUCK ATAP RUMAH
      -------------------------------------------------------------------------
     unburyY mendorong NPC KE ATAS sepanjang kolom dinding bila kakinya
     menembus blok dinding rumah, sehingga NPC bisa berakhir "berenang" di atas
     genteng/tembok dan tidak bisa turun. Fungsi ini mendeteksi NPC yang berdiri
     di dalam footprint bangunan desa tetapi kakinya jauh di atas lantai desa
     (artinya ia di atas tembok/atap), lalu langsung memindahkannya ke titik
     bebas terdekat di luar bangunan.
     ========================================================================= */
  unroof(n){
    if(typeof WGEN==='undefined'||!WGEN.buildingAt)return;
    const b=WGEN.buildingAt(n.pos.x,n.pos.z,0);
    if(!b)return;
    /* lantai desa = tanah tepat di samping bangunan (desa diratakan) */
    const gy=World.groundAt(b.x-1.5,b.z-1.5,CFG.WORLD_H);
    if(n.pos.y<=gy+1.2)return;                  // masih di lantai/ambang, aman
    /* cari arah keluar dengan penetrasi tertipis, lalu melangkah keluar
       footprint sampai benar-benar tidak di dalam bangunan mana pun */
    const cx=n.pos.x,cz=n.pos.z;
    const dl=cx-b.x, dr=(b.x+b.w)-cx, df=cz-b.z, db=(b.z+b.d)-cz;
    const m=Math.min(dl,dr,df,db);
    let dirx=0,dirz=0;
    if(m===dl)dirx=-1; else if(m===dr)dirx=1; else if(m===df)dirz=-1; else dirz=1;
    let tx=cx,tz=cz;
    for(let k=0;k<10;k++){
      tx+=dirx*1.5; tz+=dirz*1.5;
      if(!WGEN.buildingAt(tx,tz,0))break;
    }
    const ty=World.groundAt(tx,tz,CFG.WORLD_H);
    n.pos.set(tx,ty,tz);
    n.vel.set(0,0,0);
    n.onGround=true;n.stuckT=0;n.turnSide=0;n.detourT=0;
    FX.debris(new THREE.Vector3(tx,ty+1,tz),0xd6c58f,5,1.4);
  },

  /* Animasi NPC: tiap arketipe kini punya animate() sendiri di
     js/entities/npc_*.js (jalan, ayunan senjata, pose skill, ekor, dll).
     NPCS.animate hanya meneruskan ke entitas yang sesuai. */
  animate(n,dt){
    const ent=n.role&&this.def(n.role.id);
    if(ent&&ent.animate){ent.animate(n,dt);return;}

    /* Fallback generik bila file entitas belum dimuat */
    const t=performance.now()*0.001;
    const sp=Math.hypot(n.vel.x,n.vel.z);
    const em=n.flash>0?0xaa2222:0x000000;
    n.mesh.traverse(o=>{if(o.material&&o.material.emissive)
      o.material.emissive.setHex(em);});
    const step=Math.sin(t*9)*0.5*Math.min(1,sp/2);
    if(n.parts.legs){
      n.parts.legs[0].rotation.x=step;
      n.parts.legs[1].rotation.x=-step;
    }
    if(n.parts.armL)n.parts.armL.rotation.x=-step*0.6;
    const sw=n.swing>0?1-n.swing/0.25:0;
    if(n.parts.armR)n.parts.armR.rotation.x=lerp(step*0.6,-1.5,sw);
    if(n.parts.body)n.parts.body.position.y=n.parts.bodyY+
      Math.abs(Math.sin(t*9))*0.03*Math.min(1,sp/2);
    if(n.parts.head)n.parts.head.rotation.y=n.target?0:Math.sin(t*1.4)*0.35;
    if(n.parts.tail){
      n.parts.tail.rotation.y=Math.sin(t*2.8)*0.25;
      n.parts.tail.rotation.x=-0.5+Math.sin(t*1.7)*0.08;
    }
  },
};

