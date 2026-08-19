'use strict';
/* Inventory, crafting, skill, save/load */
const RPG={
  sp:0,skills:{},sel:0,
  /* cooldown tiap skill aktif; kuncinya harus lengkap agar updateActive
      ikut menghitung mundur semua skill, bukan hanya slam & roll */
  activeCD:{slam:0,whirl:0,roar:0,herb:0},
  roarT:0,                       // sisa durasi buff damage Teriakan Perang
  hotbar:new Array(7).fill(null),bag:new Array(14).fill(null),
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
      UI.toast(`🪙 +${n} koin`);
      if(typeof FX!=='undefined')
        FX.text(Player.pos.clone().add(new THREE.Vector3(0,2.6,0)),`+${n} 🪙`,'#ffd24d');
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
  dmgMult(){return (1+0.2*this.skillVal('dmg'))*(this.roarT>0?1.35:1)
    *(1+((typeof Prof!=='undefined')?Prof.combatDmg():0));},
  comboSpeedMult(){return 1+0.12*this.skillVal('combo');},
  comboWindowMult(){return 1+0.25*this.skillVal('combo');},
  slamMult(){return 1+0.4*this.skillVal('slam');},
  lifesteal(){return this.skillVal('vamp')>0?0.08:0;},
  /* efek 'swift' (Mantel Angin) menambah kecepatan gerak di atas skill */
  speedMult(){return (1+0.06*this.skillVal('run'))*(this.hasEffect('swift')?1.08:1);},
  /* efek 'guard' (Helm Penjaga) memotong biaya stamina */
  stamCostMult(){
    let c=Math.max(0.4,1-0.15*this.skillVal('stam'));
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
  harvestBonus(){return 0.3*this.skillVal('harv');},
  /* peluang hasil ekstra dari cabang GATHER; dipetakan per jenis drop.
     Digabung dgn harvestBonus() (Pemanen) & Prof.yield di world.js/farming.js. */
  gatherBonus(dropId){
    let b=0.05*this.skillVal('groot')+0.25*this.skillVal('mgather');
    if(dropId==='wood')b+=0.10*this.skillVal('logm');
    else if(dropId==='stone'||dropId==='iron_ore'||dropId==='gold_ore'||dropId==='crystal')
      b+=0.10*this.skillVal('minm');
    else if(dropId==='fiber'||dropId==='berry'||dropId==='mush'||dropId==='resin')
      b+=0.10*this.skillVal('wildm');
    else if(dropId==='wheat'||dropId==='carrot'||dropId==='cabbage'||dropId==='tomato'||dropId==='watermelon')
      b+=0.12*this.skillVal('greenthumb');
    return b;
  },
  cookBonus(){return this.skillVal('cook')>=2?1.25:1;},
  /* resep terkunci oleh skill tree (r.skill) DAN/ATAU milestone proficiency
     (r.prof) — "dua kunci" ala Durango. */
  canRecipe(r){
    if(r.skill&&this.skillVal(r.skill)<=0)return false;
    if(r.prof&&typeof Prof!=='undefined')
      for(const id in r.prof)if(Prof.level(id)<r.prof[id])return false;
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
    const C=new THREE.Vector3(x,y,z);
    for(const m of Monsters.list){
      if(m.dead||m.pos.distanceTo(C)>=4.5)continue;
      const d=new THREE.Vector3().subVectors(m.pos,C).setY(.3).normalize();
      Monsters.hurt(m,24*this.slamMult()*this.dmgMult(),d,7);
      if(typeof NPCS!=='undefined'&&NPCS.onPlayerAttack)NPCS.onPlayerAttack(m);
    }
    FX.ring(x,y+.05,z,0xffb33c,.7,4.5);
    FX.shockwave(x,y,z,0xffd24d,5);
    if(typeof FX.groundWave==='function')FX.groundWave(x,y,z,{mode:'radial',color:0xffb33c,radius:4.5});
    FX.addShake(.7);Sfx.hit();
  },
  /* eksekusi slam di titik (x,y,z): cek cooldown & stamina, lalu ledakkan.
     Dipanggil SlamAim saat pemain mendarat dari loncatan terarah. */
  doSlamAt(x,y,z){
    if(this.activeCD.slam>0)return false;
    if(Player.stamina<25){UI.toast('⚡ Stamina kurang!');Sfx.noStamina();return false;}
    Player.stamina-=25;
    this._slamAoE(x,y,z);
    this.activeCD.slam=this.activeCDMax('slam');
    UI.renderActiveSkills();
    return true;
  },
  /* Pemakaian skill aktif. Dipanggil tombol HUD (mobile), bar skill (PC),
     dan tombol keyboard Q/E/R/T lewat UI.useActiveSlot(). */
  useActive(id){
    if(!this.skillVal(id)||Player.dead)return false;
    if(this.activeCD[id]>0){
      UI.toast(`⏳ ${Math.ceil(this.activeCD[id])}s lagi`);return false;
    }
    const cost=c=>{
      if(Player.stamina<c){UI.toast('⚡ Stamina kurang!');Sfx.noStamina();return false;}
      Player.stamina-=c;return true;
    };
    const P=Player.pos;
    let msg='';

    if(id==='slam'){
      /* Tekan cepat (Q sekali): loncat kecil di tempat lalu hantam tanah.
         Versi tahan-untuk-membidik ditangani SlamAim (player.js). */
      if(!cost(25))return false;
      Player.vel.y=Math.max(Player.vel.y,6);
      this._slamAoE(P.x,P.y,P.z);
      msg='💥 Hantam Bumi!';
    }
    else if(id==='whirl'){
      /* Tebasan Angin Puyuh: dua busur berlawanan + damage melingkar penuh */
      if(!cost(30))return false;
      const dmg=(18+6*this.skillVal('whirl'))*this.dmgMult();
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
      /* Teriakan Perang: monster terdorong & kehilangan jejak, damage naik */
      this.roarT=8;
      for(const m of Monsters.list){
        if(m.dead||m.pos.distanceTo(P)>=8)continue;
        const d=new THREE.Vector3().subVectors(m.pos,P).setY(.2).normalize();
        m.vel.addScaledVector(d,6);m.vel.y=Math.max(m.vel.y,2.2);
        m.seeT=0;m.alert=0;m.state='wander';
        m.dir=Math.atan2(d.x,d.z);m.walking=true;m.t=Math.max(m.t,2.2);
      }
      FX.shockwave(P.x,P.y,P.z,0xffa23c,8);
      FX.ring(P.x,P.y+.05,P.z,0xff6b57,.8,8);
      FX.addShake(.8);Sfx.hit();
      msg='🦁 Teriakan Perang! +35% damage';
    }
    else if(id==='herb'){
      /* Ramuan Herbal: penyembuhan instan tanpa memakai item */
      const heal=35*(1+0.4*(this.skillVal('herb')-1));
      const before=Player.hp;
      Player.hp=Math.min(Player.maxHp(),Player.hp+heal);
      const got=Math.round(Player.hp-before);
      if(got<=0){UI.toast('❤️ HP sudah penuh');return false;}
      FX.text(P.clone().add(new THREE.Vector3(0,2.1,0)),'+'+got,'#8fe07a');
      FX.ring(P.x,P.y+.05,P.z,0x8fe07a,.6,2.6);
      msg=`🌱 Ramuan Herbal +${got} HP`;
    }
    else return false;                     // skill aktif tanpa implementasi

    /* animasi tubuh khas per skill aktif */
    if(typeof Player!=='undefined'&&Player.playSkillAnim)Player.playSkillAnim(id);
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
  /* damage dasar pukulan: stat pedang × rarity × skill × level tempa */
  weaponDmg(){
    const lvMul=1+(typeof Anvil!=='undefined'?Anvil.DMG_PER_LV:0.08)*this.heldLv();
    return this.weapon().dmg*this.rarityMul(this.weaponId())*this.dmgMult()*lvMul;
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
  defense(){
    let d=0;
    const lvMul=(typeof Anvil!=='undefined')?Anvil.DEF_PER_LV:0.06;
    const slots=(typeof PLAYER_GEAR_SLOTS!=='undefined')?PLAYER_GEAR_SLOTS:ARMOR_SLOTS;
    for(const s of slots){
      const id=this.equipId(s.id);
      if(id&&ITEMS[id]&&ITEMS[id].armor){
        const lv=this.equipLv(s.id);
        d+=ITEMS[id].armor.def*this.rarityMul(id)*(1+lvMul*lv);
      }
    }
    return Math.min(0.7,d);
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
    UI.toast(`${it.e} ${it.n}${lvl?' Lv '+lvl:''} dipakai · Pertahanan ${Math.round(this.defense()*100)}%${fx}`);
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
    }else UI.toast(`${ITEMS[id].e} dilepas`);
    if(slot==='weapon')Player.refreshWeapon();
    else Player.refreshArmor();
    UI.renderAll();
  },



  addItem(id,n,lvl){
    n=n||1;
    /* item hasil tempa (lvl>0) tidak pernah digabung ke stack lain */
    if(!lvl){
      for(const arr of[this.hotbar,this.bag])
        for(let i=0;i<arr.length;i++)
          if(arr[i]&&arr[i].id===id&&!arr[i].lvl&&arr[i].n<64){
            const add=Math.min(n,64-arr[i].n);arr[i].n+=add;n-=add;if(n<=0)return 0;
          }
    }
    for(const arr of[this.hotbar,this.bag])
      for(let i=0;i<arr.length;i++)
        if(!arr[i]){
          arr[i]=lvl?{id,n:Math.min(n,64),lvl}:{id,n:Math.min(n,64)};
          n-=Math.min(n,64);if(n<=0)return 0;
        }
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
  },
  /* craft `count` item sekaligus (default 1). Hasil MASUK TAS; bila tas penuh
     sisanya dijatuhkan ke tanah (tidak hilang). Berhenti bila bahan habis. */
  craft(r,count){
    /* penjaga awal: pesan jelas bila resep masih terkunci skill/proficiency */
    if(!this.canRecipe(r)){UI.toast('🔒 Belum terbuka — butuh '+this.recipeReqText(r));return 0;}
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
    if(made>0){
      Sfx.craft();
      UI.toast(`🔨 Membuat ${ITEMS[r.out].e} ${ITEMS[r.out].n} ×${made}`+
        (dropped?` (${dropped} jatuh, tas penuh)`:''));
      Player.addXP(3*made);
      /* proficiency kriya; resep makanan sekaligus menaikkan memasak */
      const al=r.skill?10:1;                 // resep lanjutan berharga lebih lama
      Prof.gain('crafting',12*made,al);
      if(ITEMS[r.out]&&ITEMS[r.out].food)Prof.gain('cooking',15*made,al);
    }else{
      UI.toast('🔨 Bahan tidak cukup');
    }
    UI.renderCraft();UI.renderBag();UI.renderHotbar();
    return made;
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
    s.n--;if(s.n<=0)this.hotbar[this.sel]=null;
    Sfx.eat();
    /* umpan balik jelas: hijau bila menyembuhkan, merah bila item memang
       merugikan (daging mentah), sehingga pemain tahu efek aslinya */
    FX.text(Player.pos.clone().add(new THREE.Vector3(0,2.2,0)),
      delta!==0?`${it.e}${delta>0?'+':''}${delta} HP`:it.e,
      delta<0?'#ff8f7a':'#8fe07a');
    if(delta<0)UI.toast(`${it.e} ${it.n} mentah — HP ${delta}! Panggang dulu di api unggun.`);
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
