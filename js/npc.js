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
  isTeam(n){return n.state==='follow'||n.state==='gather'||n.state==='wait';},
  teamFull(){return this.team.length>=CFG.NPC.TEAM_MAX;},

  /* Permintaan rekrut: 2–3 bahan dari daftar arketipe, jumlah acak.
     Diacak sekali saat NPC lahir sehingga tiap NPC punya syarat berbeda. */
  rollDemand(role){
    if(!role.recruit||!role.ask.length)return null;
    const pool=role.ask.slice();
    const need={};
    const cnt=2+(Math.random()<0.5?0:1);
    for(let i=0;i<cnt&&pool.length;i++){
      const id=pool.splice(Math.floor(Math.random()*pool.length),1)[0];
      /* bahan umum diminta lebih banyak, bahan langka lebih sedikit */
      const rare=(id==='iron_ore'||id==='pelt'||id==='resin'||id==='leather');
      need[id]=rare?2+Math.floor(Math.random()*3):3+Math.floor(Math.random()*8);
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
    return Math.min(0.7,d);
  },

  /* =========================================================================
     AURA GUARDIAN (Aegis)
     ------------------------------------------------------------------------- 
     Selama ada Guardian hidup di dalam tim dan berada dalam AEGIS_R blok,
     seluruh anggota tim DAN pemain menerima damage lebih kecil. Dipanggil
     oleh NPCS.npcDef dan Player.takeDamage.
     ========================================================================= */
  AEGIS_R:10,
  auraDef(pos){
    for(const g of this.team){
      if(g.dead||g.role.skill.id!=='aegis')continue;
      if(g.pos.distanceTo(pos)<=this.AEGIS_R)return NPC_AEGIS_DEF;
    }
    return 0;
  },

  /* ---------- XP & level rekan ---------- */
  gainXp(n,amount){
    n.xp+=amount;
    let need=npcXpNeed(n.level);
    while(n.xp>=need){
      n.xp-=need;n.level++;
      n.maxhp=this.npcMaxHp(n);n.hp=n.maxhp;
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
    if(!here)UI.toast('🏘️ Ada penduduk desa di sekitar sini — dekati dan tekan G');

    /* Penjaga selalu ada; pedagang menetap satu per desa (slot kedua bila belum
       ada); sisanya arketipe yang bisa direkrut. Slot pertama di tiap desa
       dipaksa penjaga agar desa tidak pernah tanpa pelindung. Arketipe dengan
       `weight` kecil (mis. Manusia Singa) muncul lebih jarang. */
    const hasMerchant=this.list.some(o=>!o.dead&&o.role.id==='merchant'&&
      o.home.x===v.x&&o.home.z===v.z);
    const hasFarmer=this.list.some(o=>!o.dead&&o.role.id==='farmer'&&
      o.home.x===v.x&&o.home.z===v.z);
    let role;
    if(here===0){role=NPC_ROLES[0];}                    // penjaga
    else if(!hasMerchant){role=NPC_ROLES.find(r=>r.id==='merchant')||NPC_ROLES[0];}
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
  make(role,x,y,z,home,lvlOverride,village){
    const {mesh,parts}=this.buildModel(role);
    mesh.position.set(x,y,z);
    Game.scene.add(mesh);
    const lvl=lvlOverride||1+Math.floor(Math.random()*Math.max(1,Math.min(5,Player.level)));
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
      demand:this.rollDemand(role),
      mineT:0,mineAt:null,healT:0,
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
    n.maxhp=this.npcMaxHp(n);n.hp=n.maxhp;
    /* Pedagang mendapat stok barang ACAK sendiri saat diciptakan (tiap desa
       bisa berbeda). Upgrade tas muncul dgn peluang 25% di genShopStock. */
    if(role.id==='merchant'&&!n.shop){
      n.shop=(typeof genShopStock==='function')
        ?genShopStock(typeof RPG!=='undefined'?RPG.bagTier:0):[];
    }
    return n;
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
    /* NPC penjaga: hanya obrolan biasa */
    if(!n.role.recruit||!n.demand){
      UI.bubble.show(n,npcLine(n.role.id,'chat'));
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
    n.demand=this.rollDemand(n.role);
    UI.toast(`${n.role.e} ${n.name} keluar dari tim`);
    UI.renderTeam();UI.renderNpcPanel();
  },
  setOrder(n,order){
    n.order=order;n.mineAt=null;n.mineT=0;n.farmTask=null;n.farmT=0;
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
    if(typeof Monsters!=='undefined'&&Monsters.isAnimal&&Monsters.isAnimal(m))return;
    for(const n of this.team){
      if(n.dead||n.aggr!==false||n.retreat)continue;
      const gone=!n.target||n.target.dead||Monsters.list.indexOf(n.target)<0;
      if(gone){n.target=m;n.focus=true;}
    }
  },

  /* ---------- tas rekan ---------- */
  bagAdd(n,id,cnt){
    for(const s of n.bag)if(s&&s.id===id){s.n+=cnt;return true;}
    for(let i=0;i<n.bag.length;i++)if(!n.bag[i]){n.bag[i]={id,n:cnt};return true;}
    return false;                                    // tas penuh
  },
  bagFull(n){return n.bag.every(s=>s!==null);},
  /* pemain mengambil satu tumpuk dari tas rekan */
  takeFromBag(n,i){
    const s=n.bag[i];if(!s)return;
    RPG.addItem(s.id,s.n);
    UI.toast(`Mengambil ${ITEMS[s.id].e} ${ITEMS[s.id].n} ×${s.n}`);
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
      const old=n.gear[slot];
      n.gear[slot]=s.id;
      if(old)RPG.addItem(old,1);                     // tukar, item lama kembali
      UI.toast(`${n.name} memakai ${it.e} ${it.n}`);
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
  hurt(n,dmg){
    if(n.dead)return;
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

    for(let i=this.list.length-1;i>=0;i--){
      const n=this.list[i];
      if(n.dead){
        n.deathT+=dt;
        n.mesh.scale.setScalar(Math.max(0.001,1-n.deathT*2));
        n.mesh.rotation.z=n.deathT*2.4;
        if(n.deathT>0.55)this.despawn(i);
        continue;
      }
      /* rekan tidak pernah dibuang; yang tertinggal jauh dipanggil kembali.
         Pengembara langka (n.wander) juga tidak dibuang di sini — RareNPC
         sendiri yang menyembunyikan/menampilkan meshnya sesuai jarak. */
      if(this.isTeam(n)){
        if(n.pos.distanceTo(Player.pos)>CFG.NPC.TELEPORT_R)this.recall(n);
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
    }
    this.updateArrows(dt);
    this.passives(dt);
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

  /* efek pasif rekan yang bekerja terus-menerus */
  passives(dt){
    for(const n of this.team){
      if(n.dead)continue;
      if(n.role.skill.id==='mend'&&n.pos.distanceTo(Player.pos)<8&&!Player.dead){
        n.healT+=dt;
        if(n.healT>=1){n.healT=0;
          Player.hp=Math.min(Player.maxHp(),Player.hp+1.5);}
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

        if(!wasDead&&hit.dead&&this.isTeam(a.owner))
          this.gainXp(a.owner,CFG.NPC.XP_PER_KILL);
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
    this.aiPatrol(n,dt);
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
     (masih bisa dilompati) dan di depannya bukan jurang. */
  stepFree(n,x,z){
    /* Batas pencarian lantai = setinggi kepala NPC. Tanpa batas ini ambang
       atas pintu terbaca sebagai lantai setinggi atap, sehingga NPC menolak
       melangkah ke ambang pintu desanya sendiri. */
    const hy=n.pos.y+1.8;
    if(!World.blockedAt(x,n.pos.y,z,this.BODY_R)){
      return World.groundAt(x,z,hy)>=n.pos.y-3.2;
    }
    /* halangan pendek: bebas asal ada ruang di atasnya */
    return !World.blockedAt(x,n.pos.y+1,z,this.BODY_R)&&
           World.groundAt(x,z,hy)<=n.pos.y+1.3;
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
        const nx=n.pos.x+dx/dp*push,nz=n.pos.z+dz/dp*push;
        if(!World.blockedAt(nx,n.pos.y,n.pos.z,this.BODY_R))n.pos.x=nx;
        if(!World.blockedAt(n.pos.x,n.pos.y,nz,this.BODY_R))n.pos.z=nz;
      }
    }
  },
  /* dipanggil physics saat satu langkah ditolak tembok */
  onBump(n,tx,tz){
    /* rintangan setinggi 1 blok (pagar, batu kecil, undakan) cukup dilompati */
    if(n.onGround&&!World.blockedAt(tx,n.pos.y+1,tz)&&
       World.groundAt(tx,tz,n.pos.y+1.8)<=n.pos.y+1.3)n.vel.y=6.2;
    /* Tembok sungguhan: sisi belokan yang sedang dipakai jelas salah, jadi
       langsung dibalik dan dikunci sebentar supaya NPC menyusuri dinding
       ke arah baru, bukan menempel terus di titik tabrakan. */
    else{n.turnSide=-(n.turnSide||1);n.detourT=1.8;}
  },
  /* deteksi macet: tiap 0.5 detik dicek apakah NPC benar-benar berpindah */
  checkStuck(n,dt){
    n.detourT=Math.max(0,(n.detourT||0)-dt);
    if(!n.lastP)n.lastP=n.pos.clone();
    n.stuckChk=(n.stuckChk||0)+dt;
    if(n.stuckChk<0.5)return;
    const moved=n.pos.distanceTo(n.lastP);
    n.lastP.copy(n.pos);n.stuckChk=0;
    const wantsToMove=n.state!=='wait'&&(this.isTeam(n)||!!n.target);
    if(!wantsToMove||moved>=0.18){n.stuckT=0;return;}
    n.stuckT=(n.stuckT||0)+0.5;
    /* macet sebentar → balik sisi belokan & paksa repath (detourT di-nol-kan
       supaya steer() langsung memilih arah baru); buang target tambang agar
       tidak terpaku pada node yang tak tercapai */
    if(n.stuckT>1.0){n.turnSide=-(n.turnSide||1);n.detourT=0;n.mineAt=null;n.turnCd=0.4;n.lastSteer=undefined;}
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
    n.mesh.rotation.y=angLerp(n.mesh.rotation.y,ang,dt*7);
    const reach=this.npcReach(n);
    /* hysteresis gerak maju/mundur saat bertarung agar tidak bergetar
       di sekitar batas jangkauan */
    if(n._fightMove===undefined)n._fightMove=d>reach*0.8;
    if(d>reach*0.95)n._fightMove=true;
    else if(d<reach*0.65)n._fightMove=false;

    if(n._fightMove){
      const sp=n.speed*(n.inWater?0.5:1);
      /* badan tetap menghadap musuh, tapi kakinya boleh memutari rintangan */
      const wa=this.steer(n,ang);
      n.vel.x=lerp(n.vel.x,Math.sin(wa)*sp,clamp(7*dt,0,1));
      n.vel.z=lerp(n.vel.z,Math.cos(wa)*sp,clamp(7*dt,0,1));
    }else{
      const damp=Math.exp(-7*dt);
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

      /* rekan mendapat XP bila pukulannya yang menumbangkan monster */
      if(!wasDead&&n.target.dead&&this.isTeam(n))
        this.gainXp(n,CFG.NPC.XP_PER_KILL);
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
      const shelter=this.isTeam(n)?Player.pos:
        new THREE.Vector3(n.home.x,n.pos.y,n.home.z);
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
      if(this.isTeam(n))UI.renderTeam();
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
     selama MINE_TIME, lalu menyimpan hasilnya ke tasnya sendiri. */
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
        found={x,y,z,item:g.item};break;
      }
      if(found){best=found;bd=dn;}
    }
    return best;
  },
  /* blok bisa dikerjakan bila salah satu sisinya terbuka & tidak terlalu tinggi */
  reachable(x,y,z,n){
    if(y>Math.floor(n.pos.y)+3)return false;
    const air=b=>b===B.AIR||b===B.WATER||b===B.LEAF;
    return air(World.getBlock(x,y+1,z))||air(World.getBlock(x+1,y,z))||
           air(World.getBlock(x,y,z+1))||air(World.getBlock(x,y,z-1));
  },
  /* ---------- mencari makanan (beri & jamur) di sekitar pemain ---------- 
     Tanaman disimpan per-chunk sebagai daftar {x,y,z,t} dengan koordinat lokal;
     t=4 beri, t=5 jamur. Rekan memanennya untuk menambah bekal makanan. */
  findFood(n){
    const R=CFG.NPC.GATHER_R;
    let best=null,bd=1e9;
    const pcx=Math.floor(Player.pos.x/16),pcz=Math.floor(Player.pos.z/16);
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
      const cx=pcx+dx,cz=pcz+dz;
      const c=World.chunks.get(cx+','+cz);
      if(!c||!c.plants)continue;
      for(const p of c.plants){
        if(p.t!==4&&p.t!==5)continue;                 // hanya beri & jamur
        const wx=cx*16+p.x+0.5,wz=cz*16+p.z+0.5;
        if(Math.hypot(wx-Player.pos.x,wz-Player.pos.z)>R)continue;
        const dn=Math.hypot(wx-n.pos.x,wz-n.pos.z);
        if(dn<bd){bd=dn;best={x:wx,y:p.y,z:wz,cx,cz,p,
          item:p.t===4?'berry':'mush',cnt:p.t===4?2:1};}
      }
    }
    return best;
  },
  /* apakah rekan perlu menimbun makanan? (bekal menipis) */
  needsFood(n){
    let stock=0;
    for(const s of n.bag)if(s&&ITEMS[s.id].food)stock+=s.n;
    return stock<3;
  },
  aiGather(n,dt){
    if(this.bagFull(n)){
      UI.toast(`Tas ${n.name} penuh — ambil isinya dulu`);
      this.setOrder(n,'follow');return;
    }
    /* prioritaskan mencari makanan bila bekalnya hampir habis */
    if(!n.mineAt&&this.needsFood(n)){
      const food=this.findFood(n);
      if(food){this.aiForage(n,dt,food);return;}
    }
    /* target hilang / sudah ditambang orang lain → cari lagi */
    if(n.mineAt){
      const b=World.getBlock(n.mineAt.x,n.mineAt.y,n.mineAt.z);
      if(!NPC_GATHER.some(e=>e.block===b))n.mineAt=null;
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
    if(d>1.6){
      const sp=n.speed*(n.inWater?0.5:1)*0.9;
      n.vel.x=lerp(n.vel.x,Math.sin(ang)*sp,clamp(6*dt,0,1));
      n.vel.z=lerp(n.vel.z,Math.cos(ang)*sp,clamp(6*dt,0,1));
      n.mineT=0;
      return;
    }
    n.vel.x*=0.7;n.vel.z*=0.7;
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
    World.setBlock(t.x,t.y,t.z,B.AIR);
    FX.debris(new THREE.Vector3(t.x+0.5,t.y+0.5,t.z+0.5),
      BLOCK_INFO[World.getBlock(t.x,t.y,t.z)]?0x9aa0a8:0x9aa0a8,5,2);
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
      `${ITEMS[f.item].e}+${got}`,'#c9f07a');
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
    n.inWater=World.inWaterAt(n.pos.x,n.pos.y+0.3,n.pos.z);
    n.vel.y-=CFG.GRAV*(n.inWater?0.3:1)*dt;
    if(n.inWater){
      if(n.pos.y<CFG.WATER_Y-0.5)n.vel.y+=18*dt;
      n.vel.y=clamp(n.vel.y,-3,3.5);
    }
    /* patokan tinggi SEBELUM gravitasi (lihat BUGFIX di Player.update) */
    const px0=n.pos.x,pz0=n.pos.z,py0=n.pos.y;
    const nx=n.pos.x+n.vel.x*dt;
    /* langkah sumbu X ditolak bila ada blok padat di depan badan, sama
       seperti aturan tabrakan pemain, supaya NPC tidak menembus objek */
    if(World.groundAt(nx,n.pos.z,py0+1.8)<=py0+1.02&&
       !World.blockedAt(nx,n.pos.y,n.pos.z))n.pos.x=nx;
    else{n.vel.x=0;n.dir+=Math.PI*0.5;this.onBump(n,nx,n.pos.z);}
    const nz=n.pos.z+n.vel.z*dt;
    if(World.groundAt(n.pos.x,nz,py0+1.8)<=py0+1.02&&
       !World.blockedAt(n.pos.x,n.pos.y,nz))n.pos.z=nz;
    else{n.vel.z=0;n.dir+=Math.PI*0.5;this.onBump(n,n.pos.x,nz);}
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

