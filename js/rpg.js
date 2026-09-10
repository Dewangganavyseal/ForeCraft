'use strict';
/* Inventory, crafting, skill, save/load */
const RPG={
  sp:0,skills:{},sel:0,
  /* cooldown tiap skill aktif; kuncinya harus lengkap agar updateActive
      ikut menghitung mundur semua skill, bukan hanya slam & roll */
  activeCD:{slam:0,whirl:0,roar:0,herb:0},
  roarT:0,                       // sisa durasi buff damage Teriakan Perang
  hotbar:new Array(7).fill(null),bag:new Array(14).fill(null),
  /* slot khusus mob hasil tangkapan (bukan item biasa; tidak bisa di-drop) */
  mobSlots:new Array(4).fill(null),
  deployedPet:-1,
  /* armor + tameng (tameng khusus karakter utama). Nilai slot bisa berupa
     string id (save lama) atau objek {id,lvl} hasil tempa Landasan Tempa —
     baca selalu lewat equipId()/equipLv(). */
  equip:{helm:null,chest:null,boots:null,shield:null},
  equipId(slot){
    const v=this.equip[slot];
    if(!v)return null;
    return typeof v==='string'?v:v.id;
  },
  equipLv(slot){
    const v=this.equip[slot];
    return (v&&typeof v==='object')?(v.lvl||0):0;
  },
  /* Mata uang koin: didapat dari quest, drop monster, dan menjual item ke
     pedagang. Dipakai untuk membeli barang dari pedagang desa. */
  coin:0,
  /* Tier tas: tiap tingkat menambah 7 slot kantong (maks 5 tingkat).
     Dibeli dari pedagang (item 'bag' langka). */
  bagTier:0,
  BAG_BASE:14,BAG_PER_TIER:7,BAG_MAX_TIER:5,
  bagMax(){return this.BAG_BASE+this.bagTier*this.BAG_PER_TIER;},
  /* tambah 7 slot kantong (dipanggil saat membeli bag) */
  expandBag(){
    if(this.bagTier>=this.BAG_MAX_TIER)return false;
    this.bagTier++;
    while(this.bag.length<this.bagMax())this.bag.push(null);
    return true;
  },

  SAVE_KEY:'forest_survival_v1',

  /* ---------- save slots (5 slot) ---------- */
  SLOT_MAX:5,
  slot:1,
  META_KEY:'forest_survival_slots_meta',
  slotKey(i){return 'forest_survival_slot_'+i;},

  initSlots(){
    /* migrasi save lama single-slot ke slot 1 */
    try{
      const old=localStorage.getItem(this.SAVE_KEY);
      if(old&&!localStorage.getItem(this.slotKey(1))){
        localStorage.setItem(this.slotKey(1),old);
      }
    }catch(e){}
  },

  slotsMeta(){
    try{
      const m=JSON.parse(localStorage.getItem(this.META_KEY)||'null');
      if(Array.isArray(m))return m;
    }catch(e){}
    return new Array(this.SLOT_MAX).fill(null);
  },

  saveSlotsMeta(meta){
    try{localStorage.setItem(this.META_KEY,JSON.stringify(meta));}catch(e){}
  },

  hasSlot(i){
    try{return !!localStorage.getItem(this.slotKey(i));}catch(e){return false;}
  },

  slotInfo(i){
    if(!this.hasSlot(i))return null;
    const meta=this.slotsMeta()[i-1];
    if(meta)return meta;
    /* fallback dari isi save */
    try{
      const d=JSON.parse(localStorage.getItem(this.slotKey(i))||'null');
      if(!d)return null;
      return{level:d.level||1,day:d.day||1,time:d.time||0.32};
    }catch(e){return null;}
  },

  loadSlot(i){
    try{
      const d=JSON.parse(localStorage.getItem(this.slotKey(i))||'null');
      if(!d)return null;
      this.slot=i;
      return d;
    }catch(e){return null;}
  },

  clearSlot(i){
    try{localStorage.removeItem(this.slotKey(i));}catch(e){}
    const meta=this.slotsMeta();
    meta[i-1]=null;
    this.saveSlotsMeta(meta);
  },

  /* compatible helper */
  hasSave(){
    for(let i=1;i<=this.SLOT_MAX;i++)if(this.hasSlot(i))return true;
    return false;
  },

  /* ---------- koin ---------- */
  addCoin(n,silent){
    if(n<=0)return;
    this.coin+=n;
    if(!silent){
      const coinIco=(typeof UI!=='undefined'&&UI.coinIcoHtml)?UI.coinIcoHtml(18):'🪙';
      UI.toast(`${coinIco} +${n} koin`);
      if(typeof FX!=='undefined'&&FX.text)
        FX.text(Player.pos.clone().add(new THREE.Vector3(0,2.6,0)),`+${n} koin`,'#ffd24d','ui_coin');
      Sfx.pickup();
    }
    this.renderCoin&&this.renderCoin();
  },
  spendCoin(n){
    if(this.coin<n)return false;
    this.coin-=n;
    this.renderCoin&&this.renderCoin();
    return true;
  },
  renderCoin(){
    const el=document.getElementById('coin-num');
    if(el)el.textContent=this.coin;
  },


  skillVal(id){return this.skills[id]||0;},
  /* ---------- NILAI PER-RANK DISELARASKAN KE MAX RANK BARU ----------
     Max rank tiap skill diperbanyak (lihat catatan di SKILLS, config.js) supaya
     pohon skill tetap punya tujuan sampai Lv ~148. Nilai per-rank di bawah
     DIBAGI dengan faktor yang sama sehingga TOTAL di rank maksimum tidak
     berubah — kekuatan puncak pemain tetap, hanya lebih bertahap.
        dmg        3×20%  → 6×10%   = +60%   (sama)
        combo      2×12%  → 4×6%    = +24%   (sama)
        slam       2×40%  → 4×20%   = +80%   (sama)
        vamp       1×8%   → 3×2.7%  = +8.1%  (≈sama)
        run        3×6%   → 6×3%    = +18%   (sama)
        stam       3×15%  → 6×7.5%  = -45%   (sama)
        harv       3×30%  → 6×15%   = +90%   (sama)
        blk_guard  3×6%   → 6×3%    = +18%   (sama)
        blk_solid  3×10%  → 6×5%    = +30%   (sama)
        logm/minm/wildm 3×10% → 6×5% = +30%  (sama)
        greenthumb 2×12%  → 4×6%    = +24%   (sama)
     Ini penting karena kalibrasi mob dungeon dihitung dari kekuatan puncak
     pemain (Dungeon._dpsRef); menaikkan ceiling akan merusak seluruh kalibrasi. */
  dmgMult(){return (1+0.10*this.skillVal('dmg'))*(this.roarT>0?1.35:1)
    *(1+((typeof Prof!=='undefined')?Prof.combatDmg():0));},
  comboSpeedMult(){return 1+0.06*this.skillVal('combo');},
  comboWindowMult(){return 1+0.125*this.skillVal('combo');},
  slamMult(){return 1+0.2*this.skillVal('slam');},
  lifesteal(){return 0.027*this.skillVal('vamp');},
  /* efek 'swift' (Mantel Angin) menambah kecepatan gerak di atas skill */
  speedMult(){return (1+0.03*this.skillVal('run'))*(this.hasEffect('swift')?1.08:1);},
  /* efek 'guard' (Helm Penjaga) memotong biaya stamina */
  stamCostMult(){
    let c=Math.max(0.4,1-0.075*this.skillVal('stam'));
    if(this.hasEffect('guard'))c*=0.75;
    return c;
  },
  /* efek 'greed' (Sepatu Pemburu Harta) menaikkan XP dari monster */
  xpMult(){return this.hasEffect('greed')?1.25:1;},
  /* efek 'regen' (Zirah Nadi Kristal) memulihkan HP per detik */
  regenPerSec(){return this.hasEffect('regen')?1.2:0;},
  /* efek 'thorns' (Mahkota Duri Titan) membalas damage penyerang */
  thornsRatio(){return this.hasEffect('thorns')?0.3:0;},

  /* cooldown dodge tetap (skill 'roll' sudah dihapus) */
  dodgeCD(){return 1.2;},
  harvestBonus(){return 0.15*this.skillVal('harv');},
  /* peluang hasil ekstra dari cabang GATHER; dipetakan per jenis drop.
     Digabung dgn harvestBonus() (Pemanen) & Prof.yield di world.js/farming.js. */
  gatherBonus(dropId){
    let b=0.05*this.skillVal('groot')+0.25*this.skillVal('mgather');
    if(dropId==='wood')b+=0.05*this.skillVal('logm');
    else if(dropId==='stone'||dropId==='iron_ore'||dropId==='gold_ore'||dropId==='crystal')
      b+=0.05*this.skillVal('minm');
    else if(dropId==='fiber'||dropId==='berry'||dropId==='mush'||dropId==='resin')
      b+=0.05*this.skillVal('wildm');
    else if(dropId==='wheat'||dropId==='carrot'||dropId==='cabbage'||dropId==='tomato'||dropId==='watermelon')
      b+=0.06*this.skillVal('greenthumb');
    return b;
  },
  /* 'cook' rank 1 sudah membuka Salad; bonus hunger mulai rank 2 (tak berubah) */
  cookBonus(){return this.skillVal('cook')>=2?1.25:1;},

  /* ---------- SKILL PENEBANG (axe) ----------
     BUGFIX: skill ini dulu TIDAK PUNYA IMPLEMENTASI sama sekali. Deskripsinya
     menjanjikan "+35% cepat & +1 kayu / rank", tapi skillVal('axe') tidak
     pernah dipanggil di file mana pun — ia hanya berfungsi sebagai prasyarat
     (req) untuk 'smith', sehingga setiap SP yang dibelanjakan ke situ hangus.

     Sekarang dua efeknya nyata:
       chopSpeedMult() → dipakai Player.tryAttack saat memukul blok KAYU,
                         menambah damage pukul sehingga pohon lebih cepat patah
                         (+18%/rank, 6 rank = +108% ≈ dua kali lebih cepat).
       woodBonus()     → peluang kayu ekstra saat blok kayu hancur, DI ATAS
                         gatherBonus('wood') milik cabang GATHER (+9%/rank).

     Hanya berlaku untuk KAYU. Kecepatan menambang batu/bijih tetap urusan
     proficiency Penambangan (Prof.speedBonus) supaya kedua sistem tidak
     bertabrakan. */
  chopSpeedMult(){return 1+0.18*this.skillVal('axe');},
  woodBonus(){return 0.09*this.skillVal('axe');},
  /* stasiun kerja yang dibutuhkan resep:
     - Makanan & ramuan wajib menggunakan kompor/tungku masak ('stove')
     - Peralatan sederhana bisa dibuat dengan tangan tanpa meja kerja
     - Peralatan & zirah lanjutan wajib menggunakan meja kerja ('workbench') */
  stationReq(r){
    if(!r)return null;
    const it=ITEMS[r.out];
    if(it&&(it.food||r.out==='potion_stam'))return 'stove';
    const HAND_CRAFT=new Set([
      'f_workbench','f_campfire','f_chair','f_table',
      'hoe','sword_wood','shield_wood',
      'cap_leather','vest_leather','boots_leather',
      'leather','rope','bandage','sugar','log_pass',
      'seed_wheat','seed_carrot','seed_cabbage','seed_tomato','seed_watermelon'
    ]);
    if(!HAND_CRAFT.has(r.out))return 'workbench';
    return null;
  },
  /* cek apakah pemain berada dekat dengan stasiun kerja yang dibutuhkan */
  hasStation(st){
    if(!st)return true;
    if(typeof Furni==='undefined'||typeof Player==='undefined'||!Player.pos)return true;
    if(st==='stove')return Furni.isNear('stove',Player.pos,3.8);
    if(st==='workbench')return Furni.isNear('workbench',Player.pos,3.8);
    return true;
  },
  /* apakah resep sudah dipelajari (skill tree + proficiency) */
  isLearned(r){
    if(r.skill&&this.skillVal(r.skill)<=0)return false;
    if(r.prof&&typeof Prof!=='undefined')
      for(const id in r.prof)if(Prof.level(id)<r.prof[id])return false;
    return true;
  },
  /* resep bisa dibuat jika sudah dipelajari dan stasiun kerja terpenuhi */
  canRecipe(r){
    if(!this.isLearned(r))return false;
    const st=this.stationReq(r);
    if(st&&!this.hasStation(st))return false;
    return true;
  },
  /* teks syarat resep (untuk toast & label kunci di UI crafting) */
  recipeReqText(r){
    const parts=[];
    if(r.skill){const s=SKILLS.find(x=>x.id===r.skill);parts.push('skill '+(s?s.name:r.skill));}
    if(r.prof&&typeof SUBSKILLS!=='undefined')
      for(const id in r.prof){
        const s=SUBSKILLS[id];
        parts.push('📈 '+(s?s.icon+' ':'')+(s?s.name:id)+' Lv '+r.prof[id]);
      }
    return parts.join(' · ');
  },
  updateActive(dt){
    for(const id in this.activeCD)this.activeCD[id]=Math.max(0,this.activeCD[id]-dt);
    if(this.roarT>0)this.roarT=Math.max(0,this.roarT-dt);
    /* ledakan Teriakan Perang menyusul di frame teriakannya (bukan saat tombol
       ditekan) supaya suara & gelombang pas dengan mulut terbuka */
    if(this._roarFX){
      this._roarFX.t-=dt;
      if(this._roarFX.t<=0){this._roarFX=null;if(!Player.dead)this._roarBurst();}
    }
  },
  /* cooldown diambil dari tabel SKILLS supaya angka di tooltip selalu sama
     dengan cooldown yang benar-benar dipakai */
  activeCDMax(id){
    const sk=SKILLS.find(s=>s.id===id);
    return (sk&&sk.cd)||10;
  },
  /* ---------- HANTAM BUMI (slam) ----------
     _slamAoE = efek ledakan melingkar di satu titik (damage + FX). Dipakai
     oleh tekan-cepat (hantam di tempat) maupun slam terarah (hantam di titik
     pendaratan sesudah loncat). doSlamDipakai oleh SlamAim saat mendarat. */
  _slamAoE(x,y,z){
    const actualY=(typeof World!=='undefined'&&World.groundAt)?(World.groundAt(x,z,CFG.WORLD_H-1)||y):y;
    y=actualY;
    const C=new THREE.Vector3(x,y,z);
    /* damage Hantam Bumi kini ditautkan ke weaponDmg() (skala level, pedang,
       tempaan & skill pasif) — dulu angka datar 24 sehingga di level tinggi
       damage skill tertinggal jauh dibanding pukulan biasa */
    const sDmg=Math.max(1,Math.round(this.weaponDmg()*2.0*this.slamMult()));
    for(const m of Monsters.list){
      if(m.dead||m.pos.distanceTo(C)>=4.5)continue;
      const d=new THREE.Vector3().subVectors(m.pos,C).setY(.3).normalize();
      Monsters.hurt(m,sDmg,d,7);
      if(typeof NPCS!=='undefined'&&NPCS.onPlayerAttack)NPCS.onPlayerAttack(m);
    }
    FX.ring(x,y+.05,z,0xffb33c,.7,4.5);
    FX.shockwave(x,y,z,0xffd24d,5);
    if(typeof FX.groundWave==='function')FX.groundWave(x,y,z,{mode:'radial',color:0xffb33c,radius:4.5});
    FX.addShake(.7);Sfx.hit();
  },
  /* eksekusi slam di titik (x,y,z): cek cooldown & stamina, lalu ledakkan.
     Dipanggil SlamAim saat pemain mendarat dari loncatan terarah.

     `prepaid` = biaya (stamina + cooldown) SUDAH dibayar saat skill diaktifkan.
     BUGFIX: tekan-cepat (loncat di tempat) memakai useActive('slam') yang
     langsung memasang cooldown; saat mendarat, doSlamAt lalu ditolak sendiri
     oleh cek `activeCD.slam>0` sehingga tanahnya tidak pernah meledak — pemain
     hanya melihat loncatan tanpa gelombang. Dengan prepaid=true fase mendarat
     hanya memicu efek & damage, tanpa memungut biaya dua kali. */
  doSlamAt(x,y,z,prepaid){
    if(!prepaid){
      if(this.activeCD.slam>0)return false;
      /* biaya ikut stamCostMult (skill Daya Tahan + Helm Penjaga) — sama dengan
         jalur useActive('slam'), supaya kedua cara memicu slam berbiaya sama */
      const need=Math.max(1,Math.round(25*this.stamCostMult()));
      if(Player.stamina<need){UI.toast('⚡ Stamina kurang!');Sfx.noStamina();return false;}
      Player.stamina-=need;
      this.activeCD.slam=this.activeCDMax('slam');
    }
    this._slamAoE(x,y,z);
    UI.renderActiveSkills();
    return true;
  },
  /* ---------- TERIAKAN PERANG: ledakan suara ----------
     Dipicu updateActive() 0.26s sesudah tombol, yaitu saat animasi 'roar'
     mencapai puncak (mulut terbuka). Gelombangnya keluar dari KEPALA lalu
     menyebar ke tanah supaya terbaca sebagai teriakan, bukan hantaman. */
  _roarBurst(){
    const P=Player.pos;
    for(const m of Monsters.list){
      if(m.dead||m.pos.distanceTo(P)>=8)continue;
      const d=new THREE.Vector3().subVectors(m.pos,P).setY(.2).normalize();
      m.vel.addScaledVector(d,6);m.vel.y=Math.max(m.vel.y,2.2);
      m.seeT=0;m.alert=0;m.state='wander';
      m.dir=Math.atan2(d.x,d.z);m.walking=true;m.t=Math.max(m.t,2.2);
    }
    /* koordinat DISALIN: cincin susulan dipicu setTimeout, jadi titiknya harus
       tetap di tempat pemain berteriak walau pemain sudah bergerak */
    const px=P.x,py=P.y,pz=P.z,hy=P.y+1.45;
    /* tiga cincin susul-menyusul dari tinggi kepala → kesan suara menyebar */
    FX.shockwave(px,hy,pz,0xffd08a,6);
    FX.ring(px,hy,pz,0xffa23c,.55,5);
    setTimeout(()=>{if(typeof FX!=='undefined')FX.shockwave(px,hy-0.4,pz,0xffa23c,8);},90);
    setTimeout(()=>{if(typeof FX!=='undefined')FX.ring(px,py+.05,pz,0xff6b57,.8,8);},170);
    /* embusan napas ke arah hadap + teks teriakan di atas kepala */
    FX.debris(new THREE.Vector3(px+Math.sin(Player.facing)*0.35,hy,
      pz+Math.cos(Player.facing)*0.35),0xffe0b0,8,2.2);
    FX.text(new THREE.Vector3(px,py+2.5,pz),'AAARGH!','#ffb347');
    FX.addShake(.8);
    /* suara TERIAKAN manusia (bukan raungan monster) */
    if(typeof Sfx!=='undefined'){
      if(Sfx.shout)Sfx.shout();
      else if(Sfx.roar)Sfx.roar();
      else Sfx.hit();
    }
  },
  /* Pemakaian skill aktif. Dipanggil tombol HUD (mobile), bar skill (PC),
     dan tombol keyboard Q/E/R/T lewat UI.useActiveSlot(). */
  useActive(id){
    if(!this.skillVal(id)||Player.dead)return false;
    if(typeof Capture!=='undefined'&&Capture.riding){
      UI.toast('🐴 Tidak bisa memakai skill saat menunggangi');
      return false;
    }
    if(this.activeCD[id]>0){
      UI.toast(`⏳ ${Math.ceil(this.activeCD[id])}s lagi`);return false;
    }
    /* Biaya stamina skill aktif kini ikut memperhitungkan stamCostMult(), yaitu
       skill 'Daya Tahan' & efek 'guard' (Helm Penjaga).
       BUGFIX: dulu biayanya angka datar (slam 25, whirl 30), jadi Helm Penjaga
       yang menjanjikan "-25% biaya stamina" tidak berpengaruh sama sekali pada
       skill aktif — padahal di situlah stamina paling banyak terpakai. */
    const cost=c=>{
      const need=Math.max(1,Math.round(c*this.stamCostMult()));
      if(Player.stamina<need){UI.toast('⚡ Stamina kurang!');Sfx.noStamina();return false;}
      Player.stamina-=need;return true;
    };
    const P=Player.pos;
    let msg='';

    if(id==='slam'){
      /* Tekan cepat (Q sekali): JONGKOK dulu → lompat fisika → BARU menghantam
         tanah saat mendarat. Damage & efek dipicu updateSlamQuick() di fase
         'land', bukan instan di sini. Versi bidik: SlamAim (player.js). */
      if(!cost(25))return false;
      Player.startSlamQuick();
      msg='💥 Hantam Bumi!';
    }
    else if(id==='whirl'){
      /* Tebasan Angin Puyuh: dua busur berlawanan + damage melingkar penuh.
         Ditautkan ke weaponDmg() agar tumbuh bersama level & pedang pemain */
      if(!cost(30))return false;
      const dmg=Math.max(1,Math.round(this.weaponDmg()*(1.2+0.15*this.skillVal('whirl'))));
      for(const m of Monsters.list){
        if(m.dead||m.pos.distanceTo(P)>=3.6)continue;
        const d=new THREE.Vector3().subVectors(m.pos,P).setY(.25).normalize();
        Monsters.hurt(m,dmg,d,5);
        if(typeof NPCS!=='undefined'&&NPCS.onPlayerAttack)NPCS.onPlayerAttack(m);
      }
      const up=P.clone().add(new THREE.Vector3(0,1,0));
      FX.trail(up,Cam.yaw,false,2);
      FX.trail(up,Cam.yaw+Math.PI,false,3);
      FX.ring(P.x,P.y+.05,P.z,0x7dff9d,.55,4);
      /* gelombang blok melingkar: terangkat dari tengah menjalar ke samping */
      if(typeof FX.groundWave==='function')FX.groundWave(P.x,P.y,P.z,{mode:'radial',color:0x7dff9d,radius:3.6});
      FX.addShake(.5);Sfx.hit();
      msg='🌪️ Tebasan Angin Puyuh!';
    }
    else if(id==='roar'){
      /* Teriakan Perang: buff damage langsung menyala, tapi gelombang suara &
         dorongan monster MENYUSUL 0.26s kemudian — tepat saat animasi 'roar'
         sampai di puncak teriakan (mulut terbuka). */
      this.roarT=8;
      this._roarFX={t:0.26};
      msg='🦁 Teriakan Perang! +35% damage';
    }
    else if(id==='herb'){
      /* Ramuan Herbal: penyembuhan instan tanpa memakai item */
      const heal=35*(1+0.1333*(this.skillVal('herb')-1));
      const before=Player.hp;
      Player.hp=Math.min(Player.maxHp(),Player.hp+heal);
      const got=Math.round(Player.hp-before);
      if(got<=0){UI.toast('❤️ HP sudah penuh');return false;}
      FX.text(P.clone().add(new THREE.Vector3(0,2.1,0)),'+'+got,'#8fe07a');
      FX.ring(P.x,P.y+.05,P.z,0x8fe07a,.6,2.6);
      msg=`🌱 Ramuan Herbal +${got} HP`;
    }
    else return false;                     // skill aktif tanpa implementasi

    /* animasi tubuh khas per skill aktif (slam lewat mesin fase slamQuick) */
    if(id!=='slam'&&typeof Player!=='undefined'&&Player.playSkillAnim)
      Player.playSkillAnim(id);
    this.activeCD[id]=this.activeCDMax(id);
    UI.toast(msg);
    UI.renderActiveSkills();
    return true;
  },

  /* ---------- senjata ---------- */
  /* stat pedang yang sedang dipakai; kalau kosong pakai kepalan tangan
     yang lemah supaya pemain terdorong membuat pedang lebih dulu. */
  /* senjata awal permainan: pemain selalu mulai dengan Pedang Kayu */
  START_WEAPON:'sword_wood',
  /* kepalan tangan punya efek sendiri ('crush') supaya rasanya jelas beda
     dengan pedang: jangkauan pendek, damage kecil, hanya menyentak musuh. */
  FIST:{dmg:7,spd:1.0,crit:0.03,reach:2.6,fx:'crush',blade:0xdcb894,trim:0xb08a52},
  /* item yang sedang dipilih di hotbar; sel -1 = tangan kosong */
  heldId(){
    if(this.sel<0)return null;
    const s=this.hotbar[this.sel];
    return s&&s.id?s.id:null;
  },
  weapon(){
    const id=this.weaponId();
    if(id&&ITEMS[id]&&ITEMS[id].weapon)return ITEMS[id].weapon;
    return this.FIST;
  },
  weaponId(){
    const id=this.heldId();
    return (id&&ITEMS[id]&&ITEMS[id].weapon)?id:null;
  },
  /* true bila pemain bertarung dengan tangan kosong */
  isUnarmed(){return !this.weaponId();},
  /* pengali rarity dari item di sebuah slot (1.0 bila tidak ada) */
  rarityMul(id){
    const r=id&&ITEMS[id]&&ITEMS[id].rarity;
    return (r&&RARITY[r])?RARITY[r].mul:1;
  },
  /* level tempa (Landasan Tempa) dari senjata yang sedang digenggam */
  heldLv(){
    if(this.sel<0)return 0;
    const s=this.hotbar[this.sel];
    return (s&&s.lvl)||0;
  },
  /* damage dasar pukulan: stat pedang × rarity × skill × level tempa
     + KURVA LEVEL PEMAIN: dulu damage tidak naik dengan level sama sekali
     (hanya dari gear/skill/tempa) sehingga pemain Lv 70 terasa LEMAH
     berbanding rekan NPC (Giant Lv 70 damage ±278). Sekarang damage senjata
     ikut tumbuh +1.2%/level pemain (×2.03 pada Lv 70, ×3.28 pada Lv 200) —
     kurang agresif daripada kurva NPC (+12%/lv) supaya gear & skill tetap
     menjadi penentu utama, tapi level tetap terasa memberi kekuatan. */
  weaponDmg(){
    const lvMul=1+(typeof Anvil!=='undefined'?Anvil.DMG_PER_LV:0.08)*this.heldLv();
    const lvlGrow=1+0.012*(Math.max(1,Player.level)-1);
    return this.weapon().dmg*this.rarityMul(this.weaponId())*this.dmgMult()*lvMul*lvlGrow;
  },
  weaponReach(){return this.weapon().reach;},
  weaponSpeed(){return this.weapon().spd;},
  /* peluang critical: dari pedang, dinaikkan rarity & proficiency bertarung */
  critChance(){
    const profCrit=(typeof Prof!=='undefined')?Prof.combatCrit():0;
    return Math.min(0.6,this.weapon().crit*this.rarityMul(this.weaponId())+profCrit);
  },
  /* daftar id efek aktif dari seluruh slot armor + senjata yang dipegang */
  gearEffects(){
    const out=[];
    const slots=(typeof PLAYER_GEAR_SLOTS!=='undefined')?PLAYER_GEAR_SLOTS:ARMOR_SLOTS;
    for(const s of slots){
      const id=this.equipId(s.id);if(!id||!ITEMS[id])continue;
      const it=ITEMS[id];
      const fx=(it.armor&&it.armor.fx)||(it.weapon&&it.weapon.fx);
      if(fx&&EFFECTS[fx])out.push(fx);
    }
    /* efek senjata kini mengikuti item hotbar yang sedang digenggam */
    const wid=this.weaponId();
    if(wid&&ITEMS[wid]&&ITEMS[wid].weapon&&ITEMS[wid].weapon.fx&&EFFECTS[ITEMS[wid].weapon.fx])
      out.push(ITEMS[wid].weapon.fx);
    return out;
  },
  hasEffect(fx){return this.gearEffects().indexOf(fx)>=0;},

  /* ---------- armor ---------- */
  /* total reduksi damage 0..0.7 dari armor + tameng yang dipakai;
     level tempa menambah pertahanan tiap item. */
  /* ---------- REDUKSI DAMAGE DARI ARMOR ----------
     BUGFIX PROGRESI: dulu total `def` dijumlahkan mentah lalu dipotong keras
     `Math.min(0.7, d)`. Nilai armor di game jauh melampaui itu:
        best-in-slot tanpa tempa  = 1.25  (178% dari batas)
        best-in-slot tempa Lv 10  = 1.99  (285% dari batas)
        set besi penuh tanpa tempa= 0.56  → cukup tempa Lv ~4 untuk mentok
     Artinya sejak tier besi/emas, SETIAP kenaikan def, setiap rarity, dan
     setiap koin yang dipakai menempa armor dibuang total oleh clamp — tooltip
     memamerkan angka yang tidak pernah berlaku.

     Sekarang penjumlahan mentah (`raw`) dilewatkan kurva DIMINISHING RETURNS
     sebelum dibatasi:

         def = DEF_CAP × raw / (raw + DEF_K)

     Sifatnya: monoton naik (tambahan armor SELALU terasa, sekecil apa pun),
     tapi tidak pernah mencapai DEF_CAP. Kalibrasi dipilih supaya UJUNG-UJUNGNYA
     mendekati sistem lama — yang berubah adalah bagian tengah yang dulu
     terpotong, bukan rasa di awal maupun di puncak:

         raw 0.27 (kulit awal)   → 0.27   (dulu 0.27  — sama)
         raw 0.43 (kulit tempa)  → 0.36   (dulu 0.43)
         raw 0.56 (besi penuh)   → 0.42   (dulu 0.56)
         raw 0.81 (emas penuh)   → 0.50   (dulu 0.70 = mentok)
         raw 1.25 (terbaik)      → 0.59   (dulu 0.70 = mentok)
         raw 1.99 (tempa maks)   → 0.67   (dulu 0.70 = mentok)

     Jadi pemain berperlengkapan terbaik tetap berada di sekitar 0.67–0.70
     seperti sebelumnya, tapi sekarang ia SAMPAI di sana lewat pendakian yang
     terasa, bukan mentok di tengah jalan. Sisa ruang sampai DEF_CAP (0.88)
     disediakan untuk perlengkapan yang mungkin ditambahkan nanti.

     Efek sampingan yang diinginkan: kalibrasi mob dungeon memakai ARMOR_CAL
     0.50 sebagai acuan (lihat Dungeon), dan kini 50% benar-benar berada di
     tengah rentang yang dicapai pemain — dulu hampir semua pemain ada di 70%. */
  DEF_CAP:0.88,
  DEF_K:0.62,
  defense(){
    let raw=0;
    const lvMul=(typeof Anvil!=='undefined')?Anvil.DEF_PER_LV:0.06;
    const slots=(typeof PLAYER_GEAR_SLOTS!=='undefined')?PLAYER_GEAR_SLOTS:ARMOR_SLOTS;
    for(const s of slots){
      const id=this.equipId(s.id);
      if(id&&ITEMS[id]&&ITEMS[id].armor){
        const lv=this.equipLv(s.id);
        raw+=ITEMS[id].armor.def*this.rarityMul(id)*(1+lvMul*lv);
      }
    }
    if(raw<=0)return 0;
    return this.DEF_CAP*raw/(raw+this.DEF_K);
  },

  /* =====================================================================
     BLOCK / TANGKIS PERISAI
     ---------------------------------------------------------------------
     Berbeda dari `defense()` yang selalu memotong damage sedikit, block
     bersifat PELUANG: saat berhasil, sebagian besar damage hilang sekaligus.
     Sumber angkanya berlapis supaya tiap sistem terasa:
       item     → ITEMS[id].armor.blk / .bkp
       rarity   → rarityMul(id)
       tempa    → level tempa tameng (Anvil)
       skill    → blk_guard / blk_solid / blk_bastion
       prof     → Prof.blockChance() / Prof.blockPower()
     ===================================================================== */
  /* stat tameng yang sedang dipakai (null bila slot Tameng kosong) */
  shieldStat(){
    const id=this.equipId('shield');
    if(!id||!ITEMS[id]||!ITEMS[id].armor)return null;
    const a=ITEMS[id].armor;
    if(a.blk===undefined)return null;
    return {id,a,lv:this.equipLv('shield')};
  },
  hasShield(){return !!this.shieldStat();},
  /* peluang menangkis, dibatasi 0..0.55 — block harus tetap terasa sebagai
     undian, bukan kekebalan, karena defense() sudah memotong damage duluan */
  blockChance(){
    const s=this.shieldStat();
    if(!s)return 0;
    const lvMul=1+((typeof Anvil!=='undefined')?Anvil.DEF_PER_LV:0.06)*s.lv;
    let c=s.a.blk*this.rarityMul(s.id)*lvMul;
    c+=0.03*this.skillVal('blk_guard');
    if(this.skillVal('blk_bastion')>0)c+=0.08;
    c+=(typeof Prof!=='undefined')?Prof.blockChance():0;
    return Math.min(0.55,c);
  },
  /* porsi damage yang ditahan saat tangkisan berhasil 0..0.85 */
  blockPower(){
    const s=this.shieldStat();
    if(!s)return 0;
    const lvMul=1+((typeof Anvil!=='undefined')?Anvil.DEF_PER_LV:0.06)*s.lv;
    let p=s.a.bkp*lvMul;
    p*=1+0.05*this.skillVal('blk_solid');
    p+=(typeof Prof!=='undefined')?Prof.blockPower():0;
    return Math.min(0.85,p);
  },
  /* Benteng Tak Goyah: tangkisan berhasil tidak membuat pemain terpental */
  blockNoStagger(){return this.skillVal('blk_bastion')>0;},
  /* undian tangkisan untuk satu serangan; true = berhasil menangkis */
  rollBlock(){
    const c=this.blockChance();
    return c>0&&Math.random()<c;
  },
  /* pakai item armor dari hotbar-tas; item lama kembali ke inventory.
     Senjata TIDAK dipasang lewat slot equipment — cukup pilih di hotbar.
     g/i opsional = stack asal (agar level tempa item ikut terbawa). */
  equipItem(id,g,i){
    const it=ITEMS[id];
    if(!it||!it.armor){
      if(it&&it.weapon)UI.toast('⚔️ Senjata dipakai dari hotbar');
      else UI.toast('Item ini tidak bisa dipakai!');
      return;
    }
    if(this.countItem(id)<=0)return;
    const slot=it.armor.slot;
    /* cari stack sumber (prioritas slot yang ditunjuk UI) */
    let arr=null,idx=-1;
    if(g!=null&&i!=null){
      const a=g===0?this.hotbar:this.bag;
      if(a[i]&&a[i].id===id){arr=a;idx=i;}
    }
    if(!arr){
      outer:
      for(const a of[this.hotbar,this.bag])
        for(let k=0;k<a.length;k++)
          if(a[k]&&a[k].id===id){arr=a;idx=k;break outer;}
    }
    if(!arr)return;
    const lvl=arr[idx].lvl||0;
    const oldId=this.equipId(slot),oldLv=this.equipLv(slot);
    arr[idx].n--;if(arr[idx].n<=0)arr[idx]=null;
    this.equip[slot]=lvl?{id,lvl}:id;
    if(oldId)this.addItem(oldId,1,oldLv);
    Sfx.craft();
    const fx=it.armor.fx?` · ${EFFECTS[it.armor.fx].e} ${EFFECTS[it.armor.fx].n}`:'';
    /* memakai tameng: sekalian tampilkan peluang menangkisnya */
    const blk=(slot==='shield'&&this.blockChance)
      ? ` · 🛡 Block ${Math.round(this.blockChance()*100)}%` : '';
    const itemIco=(typeof UI!=='undefined'&&UI.itemIcon)?UI.itemIcon(id):it.e;
    UI.toast(`${itemIco} ${it.n}${lvl?' Lv '+lvl:''} dipakai · Pertahanan ${Math.round(this.defense()*100)}%${blk}${fx}`);
    Player.refreshArmor();
    UI.renderAll();
  },

  unequip(slot){
    const id=this.equipId(slot);
    if(!id)return;
    const lvl=this.equipLv(slot);
    this.equip[slot]=null;
    if(this.addItem(id,1,lvl)>0){
      /* inventory penuh → jatuhkan ke tanah (jeda ambil agar tak langsung balik) */
      World.dropItem(Player.pos.x,Player.pos.y+0.6,Player.pos.z,id,1,{owner:true});
      UI.toast('🎒 Tas penuh, item dijatuhkan');
    }else{
      const itemIco=(typeof UI!=='undefined'&&UI.itemIcon)?UI.itemIcon(id):(ITEMS[id]?ITEMS[id].e:'');
      UI.toast(`${itemIco} dilepas`);
    }
    if(slot==='weapon')Player.refreshWeapon();
    else Player.refreshArmor();
    UI.renderAll();
  },



  /* ---------- masukkan item ke inventory ----------
     `lvl`  = level tempa (Landasan Tempa) — data PER-INSTANCE.
     `mark` = tanda lokasi Log Pass {name,x,y,z} — juga PER-INSTANCE.
     Keduanya membuat item tidak boleh digabung ke stack lain, karena
     menggabungkannya berarti membuang data salah satu instance.

     BUGFIX slot hantu: dulu `if(n<=0)break;` hanya keluar dari loop DALAM,
     sedangkan loop luar (hotbar → bag) tetap lanjut. Akibatnya setelah item
     habis ditempatkan di hotbar, satu slot tas ikut terisi `{id,n:0}` — slot
     hantu yang tampak kosong tapi memakan tempat. Kini pengisian berhenti
     total lewat flag `done`. */
  addItem(id,n,lvl,mark){
    n=n||1;
    const before=n;
    /* equipment (pedang/armor/tameng) maks 1 per slot — tidak pernah ditumpuk */
    const cap=(typeof stackCap==='function')?stackCap(id):64;
    /* item hasil tempa (lvl>0) & item bertanda (mark) tidak pernah digabung */
    if(!lvl&&!mark){
      for(const arr of[this.hotbar,this.bag]){
        if(n<=0)break;
        for(let i=0;i<arr.length;i++){
          if(arr[i]&&arr[i].id===id&&!arr[i].lvl&&!arr[i].mark&&arr[i].n<cap){
            const add=Math.min(n,cap-arr[i].n);arr[i].n+=add;n-=add;
            if(n<=0)break;
          }
        }
      }
    }
    if(n>0){
      for(const arr of[this.hotbar,this.bag]){
        if(n<=0)break;
        for(let i=0;i<arr.length;i++){
          if(arr[i])continue;
          const add=Math.min(n,cap);
          const slot={id,n:add};
          if(lvl)slot.lvl=lvl;
          if(mark)slot.mark=mark;
          arr[i]=slot;
          n-=add;
          if(n<=0)break;
        }
      }
    }
    if(before>0&&n<before&&typeof UI!=='undefined'&&UI.markInvDirty)UI.markInvDirty();
    return n;
  },
  countItem(id){
    let c=0;
    for(const arr of[this.hotbar,this.bag])for(const s of arr)if(s&&s.id===id)c+=s.n;
    return c;
  },
  removeItems(need){
    for(const id in need){
      let left=need[id];
      for(const arr of[this.hotbar,this.bag])
        for(let i=0;i<arr.length;i++){
          const s=arr[i];
          if(s&&s.id===id){
            const take=Math.min(left,s.n);s.n-=take;left-=take;
            if(s.n<=0)arr[i]=null;
            if(left<=0)break;
          }
        }
    }
    if(typeof UI!=='undefined'&&UI.markInvDirty)UI.markInvDirty();
  },
  /* craft `count` item sekaligus (default 1). Hasil MASUK TAS; bila tas penuh
     sisanya dijatuhkan ke tanah (tidak hilang). Berhenti bila bahan habis. */
  craft(r,count){
    /* penjaga awal: pesan jelas bila resep masih terkunci skill/proficiency atau butuh stasiun */
    if(!this.isLearned(r)){UI.toast('🔒 Belum terbuka — butuh '+this.recipeReqText(r));return 0;}
    const st=this.stationReq(r);
    if(st&&!this.hasStation(st)){
      const stoveIco=(typeof UI!=='undefined'&&UI.ITEM_IMG&&UI.ITEM_IMG.f_stove)?`<img class="iico" src="${UI.ITEM_IMG.f_stove}"> `:'';
      const benchIco=(typeof UI!=='undefined'&&UI.ITEM_IMG&&UI.ITEM_IMG.f_workbench)?`<img class="iico" src="${UI.ITEM_IMG.f_workbench}"> `:'';
      if(st==='stove')UI.toast(`${stoveIco}Memasak makanan harus menggunakan kompor/tungku masak!`);
      else UI.toast(`${benchIco}Butuh Meja Kerja (Crafting Table) untuk peralatan ini!`);
      return 0;
    }
    count=Math.max(1,Math.floor(count)||1);
    let made=0,dropped=0;
    for(let k=0;k<count;k++){
      if(!this.canRecipe(r))break;
      let ok=true;
      for(const id in r.need)if(this.countItem(id)<r.need[id]){ok=false;break;}
      if(!ok)break;
      this.removeItems(r.need);
      const left=this.addItem(r.out,1);
      if(left>0){
        dropped+=left;
        World.dropItem(Player.pos.x,Player.pos.y+0.6,Player.pos.z,r.out,left,{owner:true});
      }
      made++;
    }
    const craftIco=(typeof UI!=='undefined'&&UI.ITEM_IMG&&UI.ITEM_IMG.craft)?`<img class="iico" src="${UI.ITEM_IMG.craft}"> `:'';
    if(made>0){
      Sfx.craft();
      const itemIco=(typeof UI!=='undefined'&&UI.itemIcon)?UI.itemIcon(r.out):(ITEMS[r.out]?ITEMS[r.out].e:'');
      UI.toast(`${craftIco}${itemIco} Membuat ${ITEMS[r.out].n} ×${made}`+
        (dropped?` (${dropped} jatuh, tas penuh)`:''));
      if(typeof FX!=='undefined'&&FX.text){
        const rar=(ITEMS[r.out]&&ITEMS[r.out].rarity)||'common';
        const rarColor=(typeof RARITY!=='undefined'&&RARITY[rar])?RARITY[rar].css:'#8fe07a';
        FX.text(Player.pos.clone().add(new THREE.Vector3(0,2.2,0)),`+${made} ${ITEMS[r.out].n}`,rarColor,r.out);
      }
      Player.addXP(3*made);
      /* proficiency kriya; resep makanan sekaligus menaikkan memasak */
      const al=r.skill?10:1;                 // resep lanjutan berharga lebih lama
      Prof.gain('crafting',12*made,al);
      if(ITEMS[r.out]&&ITEMS[r.out].food)Prof.gain('cooking',15*made,al);
    }else{
      UI.toast(`${craftIco}Bahan tidak cukup`);
    }
    UI.renderCraft();UI.renderBag();UI.renderHotbar();
    return made;
  },
  /* =========================================================================
     PEMAKAIAN ITEM (hook generik)
     -------------------------------------------------------------------------
     Item NON-makanan dengan mekanik pakai (tool) ditangani di sini; dipanggil
     dari Player.tryAttack SETELAH tryEatSelected. Mengembalikan true bila item
     hotbar terpilih punya aksi pakai sehingga klik tidak dilanjutkan jadi
     ayunan serangan. Item yang tak punya aksi mengembalikan false. */
  useSelected(){
    const s=this.hotbar[this.sel];
    if(!s)return false;
    if(s.id==='dungeon_changer'){this.useDungeonChanger(this.sel);return true;}
    return false;
  },
  /* ---------- DUNGEON CHANGER ----------
     Mengubah level dungeon yang sedang dimasuki pemain ke level yang tersimpan
     pada instance item (slot.lvl). Hanya bisa dipakai DI DALAM dungeon
     (uji jarak yang sama seperti dungeon.js: dist <= d.r + 2). */
  useDungeonChanger(hotbarIdx){
    const s=this.hotbar[hotbarIdx!==undefined?hotbarIdx:this.sel];
    if(!s||s.id!=='dungeon_changer')return;
    const near=WGEN.nearestDungeon(Player.pos.x,Player.pos.z);
    if(!near||near.dist>near.d.r+2){
      UI.toast('🗝️ Hanya bisa digunakan di dalam dungeon');
      return;
    }
    const lvl=clamp(s.lvl||1,1,WGEN.DUNGEON_MAX_LVL);
    Dungeon.applyChanger(near.d,lvl);
    /* konsumsi satu item dari slot hotbar */
    s.n--;if(s.n<=0)this.hotbar[hotbarIdx!==undefined?hotbarIdx:this.sel]=null;
    Sfx.craft();
    FX.text(Player.pos.clone().add(new THREE.Vector3(0,2.2,0)),
      `🗝️ Lv ${lvl}`,'#c9a0ff');
    const bTxt=(typeof Dungeon!=='undefined'&&Dungeon.bandText)?(` (untuk pemain Lv ${Dungeon.bandText(lvl)})`):'';
    UI.toast(`🗝️ Dungeon Changer: level dungeon ini berubah menjadi Lv ${lvl}${bTxt}!`);
    UI.renderHotbar();this.save();
  },
  /* makan item hotbar terpilih; mengembalikan true bila benar-benar makanan
     (atau ditolak karena kenyang), false bila item bukan makanan. Dipakai
     oleh klik/tombol serang saat pemain sedang memegang makanan. */
  tryEatSelected(){
    const s=this.hotbar[this.sel];
    if(!s)return false;
    const it=ITEMS[s.id];
    const food=it&&it.food;
    if(!food)return false;
    /* Item murni penyembuh (mis. Perban) boleh dipakai walau perut penuh;
       yang ditolak hanya makanan pengisi perut saat sudah kenyang. */
    if(food.hunger>0&&Player.hunger>=99){UI.toast('🍖 Sudah kenyang!');return true;}
    Player.hunger=clamp(Player.hunger+food.hunger*this.cookBonus(),0,100);
    /* BUGFIX: dulu HP di-clamp ke 100 mati, padahal maxHp() bertambah setiap
       naik level. Sekarang batas atas mengikuti maxHp() yang sebenarnya. */
    const mHp=Player.maxHp();
    const before=Player.hp;
    Player.hp=clamp(Player.hp+food.hp,0,mHp);
    const delta=Math.round(Player.hp-before);
    if(food.buff==='speed'){Player.buffSpeed=20;UI.toast('💨 Buff kecepatan 20 detik!');}
    if(food.buff==='stam'||(it.potion&&it.potion.stamina)){
      const addStam=Math.round(Player.maxStamina()*0.30);
      Player.stamina=Math.min(Player.maxStamina(),Player.stamina+addStam);
      FX.text(Player.pos.clone().add(new THREE.Vector3(0,2.3,0)),`+${addStam} STAM`,'#ffd24d');
      UI.toast(`⚡ ${it.n} diminum (+30% Stamina)!`);
    }
    s.n--;if(s.n<=0)this.hotbar[this.sel]=null;
    Sfx.eat();
    /* umpan balik jelas: hijau bila menyembuhkan, merah bila item memang
       merugikan (daging mentah), dengan icon custom */
    const itemIco=(typeof UI!=='undefined'&&UI.itemIcon)?UI.itemIcon(s.id):it.e;
    FX.text(Player.pos.clone().add(new THREE.Vector3(0,2.2,0)),
      delta!==0?`${delta>0?'+':''}${delta} HP`:`${it.n}`,
      delta<0?'#ff8f7a':'#8fe07a',s.id);
    if(delta<0)UI.toast(`${itemIco} ${it.n} mentah — HP ${delta}! Panggang dulu di api unggun.`);
    UI.renderHotbar();
    return true;
  },
  eatSelected(){
    if(this.tryEatSelected())return;
    const s=this.hotbar[this.sel];
    if(!s)UI.toast('Pilih makanan di hotbar dulu!');
    else UI.toast('Itu bukan makanan!');
  },
  /* true bila syarat proficiency skill (field `prof`) terpenuhi.
     sk.prof = {subSkillId: minLevel}. Tanpa syarat = selalu true. */
  meetsProf(sk){
    if(!sk.prof||typeof Prof==='undefined')return true;
    for(const id in sk.prof)if(Prof.level(id)<sk.prof[id])return false;
    return true;
  },
  /* teks ringkas syarat proficiency, untuk alasan kunci di UI skill tree */
  profReqText(sk){
    if(!sk.prof)return '';
    return Object.keys(sk.prof).map(id=>{
      const s=(typeof SUBSKILLS!=='undefined')?SUBSKILLS[id]:null;
      return `${s?s.icon+' ':''}${s?s.name:id} Lv ${sk.prof[id]}`;
    }).join(', ');
  },
  learn(id){
    const sk=SKILLS.find(s=>s.id===id);if(!sk)return;
    const rank=this.skillVal(id);
    if(rank>=sk.max)return;
    if(sk.req&&this.skillVal(sk.req)<=0){UI.toast('🔒 Butuh skill sebelumnya!');return;}
    /* GERBANG LEVEL: skill puncak tiap cabang butuh level pemain minimum, jadi
       cabang tetap punya tujuan jangka panjang sampai cap Lv 200. */
    if(sk.lvl&&Player.level<sk.lvl){UI.toast(`🔒 Butuh Level ${sk.lvl}!`);return;}
    if(!this.meetsProf(sk)){UI.toast(`🔒 Butuh proficiency ${this.profReqText(sk)}`);return;}
    if(this.sp<sk.cost){UI.toast('Skill point kurang!');return;}
    this.sp-=sk.cost;this.skills[id]=rank+1;
    Sfx.craft();UI.toast(`${sk.icon} ${sk.name} → Rank ${rank+1}`);
    UI.renderSkills();UI.renderActiveSkills(true);
  },
  save(){
    try{
      const data={
        slot:this.slot,
        seed:Game.seed,time:Weather.time,day:Weather.day,
        hp:Player.hp,hunger:Player.hunger,level:Player.level,xp:Player.xp,kills:Player.kills,
        pos:[Player.pos.x,Player.pos.y,Player.pos.z],
        sp:this.sp,skills:this.skills,hotbar:this.hotbar,bag:this.bag,
        equip:this.equip,coin:this.coin,bagTier:this.bagTier,
        mobSlots:(typeof Capture!=='undefined'&&Capture.serialize)?Capture.serialize():this.mobSlots,
        deployedPet:(typeof Capture!=='undefined'&&typeof Capture.deployedSlot==='number')?Capture.deployedSlot:this.deployedPet,
        /* proficiency "belajar dengan melakukan" (ala Durango) */
        prof:Prof.serialize(),
        /* rekan yang sedang ikut; penduduk desa biasa tidak perlu disimpan
           karena akan dibangkitkan lagi oleh generator desa */
        team:(typeof NPCS!=='undefined'&&NPCS.serializeTeam)?NPCS.serializeTeam():[],
      };
      localStorage.setItem(this.slotKey(this.slot),JSON.stringify(data));
      /* update info slot untuk main menu */
      const meta=this.slotsMeta();
      meta[this.slot-1]={
        level:Player.level,
        day:Weather.day,
        time:Weather.time,
        updated:Date.now(),
      };
      this.saveSlotsMeta(meta);
    }catch(e){}
  },

  /* compat: load(slot) */
  load(slot){
    if(slot)return this.loadSlot(slot);
    return this.loadSlot(this.slot);
  },

  clearSave(){this.clearSlot(this.slot);},
};
