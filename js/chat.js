'use strict';
/* ===========================================================================
   CHAT & TERMINAL RAHASIA
   ---------------------------------------------------------------------------
   CHAT:
     - Tekan ENTER → kotak chat muncul di kiri, persis di bawah bar Lv.
     - Ketik pesan apa pun lalu ENTER untuk mengirim: pesan masuk log chat
       dan ditampilkan sekilas di atas kepala pemain.
     - ESC (atau klik di luar kolom) menutup chat.
     - Selama chat terbuka kendali karakter dikunci (lihat Input & Game loop).

   TERMINAL RAHASIA:
     - Ketik kode "/280195" di chat lalu ENTER → panel TERMINAL terbuka.
     - Terminal adalah konsol dev untuk mendapatkan / men-spawn apa pun yang
       ada di game, dikelompokkan per kategori:
         🍖 Consumable   — makanan & obat
         🌲 Bahan        — resource mentah & olahan
         ⚔️ Senjata      — semua pedang (equipment)
         🛡️ Armor        — semua helm/zirah/sepatu
         🪑 Furnitur     — perabot yang bisa dipasang
         🤝 NPC          — semua arketipe penduduk (spawn di dekatmu)
         👹 Monster      — semua tipe mob, plus opsi varian BOSS
     - Jumlah spawn diatur lewat input "Jumlah" di bagian atas terminal.
   ========================================================================= */
const Chat={
  active:false,
  SECRET:'/280195',          // kode pembuka terminal — jangan disebar!
  MAX_LOG:7,                 // baris log chat yang ditampilkan sekaligus
  _termBuilt:false,
  tab:'chat',
  maxNotifLog:18,
  MIN_NOTIF_RARITY:2,        // minimal tier rare (2: rare, epic, legendary, mythic) agar item sampah tidak membanjiri chat
  _unreadNotif:false,

  /* ------------------------------ inisialisasi --------------------------- */
  init(){
    this.box=document.getElementById('chat');
    this.logEl=document.getElementById('chat-log');
    this.notifEl=document.getElementById('notif-log');
    this.input=document.getElementById('chat-input');
    if(!this.box||!this.input)return;

    /* tab chat / notif */
    this.tabBtns=this.box.querySelectorAll('.chat-tab');
    this.tabBtns.forEach(btn=>{
      btn.addEventListener('mousedown',e=>{e.preventDefault();e.stopPropagation();});
      btn.addEventListener('click',e=>{
        e.stopPropagation();
        this.setTab(btn.dataset.tab);
      });
    });

    /* tombol di kolom chat ditangani sendiri; stopPropagation agar tidak
       bocor ke handler keyboard/mouse game */
    this.input.addEventListener('keydown',e=>{
      e.stopPropagation();
      if(e.key==='Enter'){e.preventDefault();this.send();}
      else if(e.key==='Escape'){e.preventDefault();this.close();}
    });
    /* fokus lepas (klik dunia / elemen lain) = tutup chat */
    this.input.addEventListener('blur',()=>{if(this.active)this.close();});
    /* interaksi di area chat tidak boleh dianggap serangan kamera */
    this.box.addEventListener('mousedown',e=>e.stopPropagation());

    /* tombol KIRIM di samping input (penting untuk mobile). preventDefault
       pada mousedown/touchstart menjaga fokus input agar blur tidak menutup
       chat sebelum pesan terkirim. */
    this.sendBtn=document.getElementById('chat-send');
    if(this.sendBtn){
      this.sendBtn.addEventListener('mousedown',e=>{
        e.preventDefault();e.stopPropagation();
      });
      this.sendBtn.addEventListener('touchstart',e=>{
        e.preventDefault();e.stopPropagation();this.send();
      },{passive:false});
      this.sendBtn.addEventListener('click',e=>{
        e.stopPropagation();this.send();
      });
    }
  },

  setTab(tab){
    this.tab=tab;
    if(this.tabBtns){
      this.tabBtns.forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
    }
    const badge=document.getElementById('notif-badge');
    if(tab==='notif'){
      this._unreadNotif=false;
      if(badge)badge.style.display='none';
      if(this.logEl)this.logEl.style.display='none';
      if(this.notifEl){this.notifEl.style.display='flex';this.notifEl.scrollTop=this.notifEl.scrollHeight;}
    }else{
      if(this.notifEl)this.notifEl.style.display='none';
      if(this.logEl){this.logEl.style.display='flex';this.logEl.scrollTop=this.logEl.scrollHeight;}
      if(this.input&&this.active)this.input.focus();
    }
  },

  /* Masukkan seluruh notifikasi game ke tab Notif dengan saringan rarity tertinggi untuk item */
  pushNotification(text,itemId){
    if(!this.notifEl)this.notifEl=document.getElementById('notif-log');
    if(!this.notifEl)return;

    let itemRarity=null;
    let highestScore=-1;
    let isItem=false;
    const RARITY_MAP={common:0,uncommon:1,rare:2,epic:3,legendary:4,mythic:5};

    if(itemId&&typeof ITEMS!=='undefined'&&ITEMS[itemId]){
      isItem=true;
      itemRarity=ITEMS[itemId].rarity||'common';
      highestScore=RARITY_MAP[itemRarity]||0;
    }else if(typeof ITEMS!=='undefined'){
      for(const id in ITEMS){
        const it=ITEMS[id];
        if(it&&it.n&&text.includes(it.n)){
          isItem=true;
          const r=it.rarity||'common';
          const sc=RARITY_MAP[r]||0;
          if(sc>highestScore){
            highestScore=sc;
            itemRarity=r;
          }
        }
      }
    }

    // Jika notifikasi terkait item, HANYA tampilkan item dengan rarity tertinggi / langka ke atas (rare, epic, legendary, mythic)
    if(isItem&&highestScore<this.MIN_NOTIF_RARITY){
      return;
    }

    const d=document.createElement('div');
    d.className='notif-line'+(itemRarity?(' r-'+itemRarity):'');
    d.innerHTML=text;
    if(typeof UI!=='undefined'&&UI.applyItemIcons)UI.applyItemIcons(d);
    this.notifEl.appendChild(d);
    while(this.notifEl.childElementCount>this.maxNotifLog){
      this.notifEl.firstElementChild.remove();
    }
    this.notifEl.scrollTop=this.notifEl.scrollHeight;

    // Catat notifikasi belum dibaca jika chat sedang tertutup
    if(!this.active){
      this._unreadNotif=true;
    }
    const badge=document.getElementById('notif-badge');
    if(badge&&(!this.active||this.tab!=='notif')){
      badge.style.display='inline-block';
    }
  },

  /* ------------------------------ buka / tutup --------------------------- */
  canOpen(){return typeof Game!=='undefined'&&Game.started&&
    !UI.open&&!Player.dead;},
  open(){
    if(!this.canOpen()||this.active)return;
    if(document.exitPointerLock&&document.pointerLockElement)document.exitPointerLock();
    this.active=true;
    this.box.classList.add('show');
    document.body.classList.add('chat-open');
    if(this._unreadNotif){
      this.setTab('notif');
    }else{
      this.setTab(this.tab||'chat');
    }
    /* bersihkan tombol yang masih dianggap tertahan supaya karakter berhenti */
    if(typeof Input!=='undefined'){
      for(const k in Input.keys)Input.keys[k]=false;
      Input.rmb=false;
    }
    this.input.value='';
    this.input.focus();
    Sfx.click();
  },
  close(){
    if(!this.active)return;
    this.active=false;
    this.box.classList.remove('show');
    document.body.classList.remove('chat-open');
    this.input.blur();
    this.input.value='';
  },

  /* ------------------------------ kirim pesan ---------------------------- */
  send(){
    const text=this.input.value.trim();
    this.input.value='';
    if(!text)return;

    /* ---- KODE RAHASIA: buka terminal spawn / toggle mode TPP ---- */
    if(text.startsWith(this.SECRET) || text === '/tpp' || text === '/fpp'){
      const arg = text.slice(this.SECRET.length).trim().toLowerCase();
      if(arg === 'tpp' || arg === 'fpp' || arg === 'toggle' || text === '/tpp' || text === '/fpp'){
        if(typeof Cam !== 'undefined') Cam.setTPP(!Cam.tppEnabled);
        this.pushLog('>> Mode TPP: ' + (Cam.tppEnabled ? 'AKTIF (zoom dekat untuk kamera belakang karakter)' : 'NONAKTIF'), 'sys');
        this.close();
        return;
      }
      this.pushLog('>> akses diterima — TERMINAL dibuka','sys');
      this.close();
      UI.toggle('term');
      return;
    }

    /* ---- pesan biasa: log + gelembung teks di atas kepala pemain ---- */
    const pName = (typeof Player!=='undefined'&&Player.name) ||
                  (typeof RPG!=='undefined'&&RPG.customPlayer&&RPG.customPlayer.name) ||
                  'Kamu';
    this.pushLog(text,'me');
    if(typeof FX!=='undefined'&&FX.text){
      const bubble = `[${pName}] ${text}`;
      FX.text(Player.pos.clone().add(new THREE.Vector3(0,2.4,0)),
        bubble.length>45?bubble.slice(0,45)+'…':bubble,'#eaffea');
    }
  },
  pushLog(text,cls){
    const d=document.createElement('div');
    d.className='chat-line '+(cls||'');
    if(cls==='me'){
      const pName = (typeof Player!=='undefined'&&Player.name) ||
                    (typeof RPG!=='undefined'&&RPG.customPlayer&&RPG.customPlayer.name) ||
                    'Kamu';
      const b=document.createElement('b');b.textContent=pName+': ';
      d.appendChild(b);d.appendChild(document.createTextNode(text));
    }else d.innerHTML=text;              // baris sistem (aman: kita yang buat)
    this.logEl.appendChild(d);
    while(this.logEl.childElementCount>this.MAX_LOG)
      this.logEl.firstElementChild.remove();
    this.logEl.scrollTop=this.logEl.scrollHeight;
  },

  /* =======================================================================
     TERMINAL SPAWN
     ======================================================================= */
  /* kelompokkan seluruh item dinamis dari tabel ITEMS supaya item baru di
     masa depan otomatis ikut muncul tanpa perlu mengubah terminal */
  itemGroups(){
    const g={food:[],mat:[],block:[],weapon:[],armor:[],furni:[]};
    const legacyAliases=new Set([
      // Weapon legacy aliases
      'sword_wood','sword_copper','sword_gold','sword_storm','sword_venom',
      'sword_tungsten','sword_frost','sword_titan',
      // Armor legacy aliases
      'cap_leather','vest_leather','boots_leather',
      // Shield legacy aliases (duplikat tameng otentik)
      'shield_wood','shield_flame','shield_venom','shield_storm','shield_frost','shield_dark','shield_carapace',
      // Tool duplicate
      'rod'
    ]);
    for(const id in ITEMS){
      if(legacyAliases.has(id))continue;
      const it=ITEMS[id];
      if(!it)continue;
      if(it.isBlock||(typeof id==='string'&&id.startsWith('blk_')))g.block.push(id);
      else if(it.weapon)g.weapon.push(id);
      else if(it.armor)g.armor.push(id);
      else if(it.food)g.food.push(id);
      else if(it.place)g.furni.push(id);
      else g.mat.push(id);
    }
    return g;
  },
  /* emoji untuk monster (Mob tidak punya ikon sendiri di tabel) */
  MOB_E:{slime:'🟢',boar:'🐗',golem:'🗿',wolf:'🐺',scorpion:'🦂',rabbit:'🐇',
         cow:'🐄',horse:'🐎',dragon:'🐲',trex:'🦖',lizard:'🦎',
         kelabang:'🐛',kumbang:'🪲',yeti:'❄️',semut:'🐜',reaper:'⚰️',tarantula:'🕷️'},

  /* dipanggil UI.toggle('term'); isi cukup dibangun sekali */
  renderTerm(){
    const body=document.getElementById('term-body');
    if(!body)return;
    if(this._termBuilt){
      if(this._updateFppBtn)this._updateFppBtn();
      return;
    }
    this._termBuilt=true;

    /* --- baris kontrol: jumlah, level, bintang, varian boss --- */
    const ctl=document.createElement('div');
    ctl.className='term-ctl';
    ctl.innerHTML=
      '<label>🔢 Jumlah <input id="term-qty" type="number" min="1" max="64" value="1"></label>'+
      '<label>⭐ Level <input id="term-lvl" type="number" min="1" max="200" value="1"></label>'+
      '<label>✨ Bintang <input id="term-stars" type="number" min="1" max="5" value="1"></label>'+
      '<label><input id="term-boss" type="checkbox"> 👹 Varian Boss</label>';

    /* Tombol Toggle Mode TPP (Third Person Perspective di belakang karakter) */
    const tppBtn=document.createElement('button');
    tppBtn.className='tbtn';
    tppBtn.style.cssText='width:100%;margin:8px 0 4px;padding:9px 12px;font-size:12px;font-weight:700;border-radius:8px;cursor:pointer;transition:.15s;text-align:left;';
    const updateTppBtn=()=>{
      const on=(typeof Cam!=='undefined'&&(Cam.tppEnabled||Cam.fppEnabled));
      tppBtn.style.borderColor=on?'#4ade80':'#64748b';
      tppBtn.style.background=on?'rgba(74,222,128,0.20)':'rgba(0,0,0,0.40)';
      tppBtn.style.color=on?'#86efac':'#cbd5e1';
      tppBtn.innerHTML='🎥 Mode TPP (Zoom Dekat &rarr; Kamera Belakang Karakter): <b>'+(on?'AKTIF [ON]':'NONAKTIF [OFF]')+'</b>';
    };
    this._updateTppBtn=updateTppBtn;
    updateTppBtn();
    tppBtn.addEventListener('click',()=>{
      if(typeof Cam!=='undefined')Cam.setTPP(!Cam.tppEnabled);
      updateTppBtn();
    });
    ctl.appendChild(tppBtn);

    body.appendChild(ctl);

    /* --- tab navigasi kategori --- */
    const catBar=document.createElement('div');
    catBar.className='term-tabs';
    const CATS=[
      {k:'all',    t:'🌐 Semua'},
      {k:'food',   t:'🍖 Makanan'},
      {k:'mat',    t:'🌲 Bahan'},
      {k:'block',  t:'🧱 Blok'},
      {k:'weapon', t:'⚔️ Senjata'},
      {k:'armor',  t:'🛡️ Armor'},
      {k:'furni',  t:'🪑 Furnitur'},
      {k:'npc',    t:'🤝 NPC'},
      {k:'animal', t:'🐄 Hewan'},
      {k:'mob',    t:'👹 Monster'},
    ];
    const sections=[];
    const updateCatFilter=(catKey)=>{
      catBar.querySelectorAll('.term-tab').forEach(b=>{
        b.classList.toggle('active',b.dataset.cat===catKey);
      });
      sections.forEach(w=>{
        w.style.display=(catKey==='all'||w.dataset.cat===catKey)?'':'none';
      });
    };
    CATS.forEach(c=>{
      const b=document.createElement('button');
      b.type='button';
      b.className='term-tab'+(c.k==='all'?' active':'');
      b.dataset.cat=c.k;
      b.textContent=c.t;
      b.addEventListener('click',()=>updateCatFilter(c.k));
      catBar.appendChild(b);
    });
    body.appendChild(catBar);

    /* --- helper pembuat kelompok tombol per kategori --- */
    const section=(catKey,title)=>{
      const wrap=document.createElement('div');
      wrap.className='term-cat-wrap';
      wrap.dataset.cat=catKey;
      const h=document.createElement('div');
      h.className='term-sub';h.textContent=title;wrap.appendChild(h);
      const grid=document.createElement('div');
      grid.className='term-grid';wrap.appendChild(grid);
      body.appendChild(wrap);
      sections.push(wrap);
      return grid;
    };
    const itemBtn=(grid,id)=>{
      const it=ITEMS[id];if(!it)return;
      const b=document.createElement('button');
      b.className='tbtn';
      const rar=(it.rarity&&RARITY[it.rarity])?` <small>${RARITY[it.rarity].n}</small>`:'';
      const ico=(typeof UI!=='undefined'&&UI.itemIcon)?UI.itemIcon(id):it.e;
      b.innerHTML=`<span class="te">${ico}</span>${it.n}${rar}`;
      b.addEventListener('click',()=>this.giveItem(id,this.qty()));
      grid.appendChild(b);
    };

    /* --- kelompok item --- */
    const g=this.itemGroups();
    let gr=section('food','🍖 Consumable — makanan & obat ('+g.food.length+')');
    g.food.forEach(id=>itemBtn(gr,id));
    gr=section('mat','🌲 Bahan — resource & drop ('+g.mat.length+')');
    g.mat.forEach(id=>itemBtn(gr,id));
    gr=section('block','🧱 Blok — voxel bangunan ('+g.block.length+')');
    g.block.forEach(id=>itemBtn(gr,id));
    gr=section('weapon','⚔️ Equipment — senjata ('+g.weapon.length+')');
    g.weapon.forEach(id=>itemBtn(gr,id));
    gr=section('armor','🛡️ Armor — pelindung & tameng ('+g.armor.length+')');
    g.armor.forEach(id=>itemBtn(gr,id));
    gr=section('furni','🪑 Furnitur — bisa dipasang ('+g.furni.length+')');
    g.furni.forEach(id=>itemBtn(gr,id));

    /* --- kelompok NPC: semua arketipe NPC_ROLES --- */
    gr=section('npc','🤝 NPC — spawn di dekatmu ('+NPC_ROLES.length+')');
    for(const role of NPC_ROLES){
      const b=document.createElement('button');
      b.className='tbtn';
      const maxL=(role.rare)?(CFG.NPC_RARE_MAX_LEVEL||150):(CFG.NPC_MAX_LEVEL||100);
      b.innerHTML=`<span class="te">${role.e}</span>${role.name}`+
        ` <small>max Lv ${maxL}</small>`;
      b.addEventListener('click',()=>this.spawnNPC(role.id,this.qty()));
      gr.appendChild(b);
    }

    /* --- kelompok ANIMAL: hewan pasif (sapi/kuda/kelinci) --- */
    const mobBtn=(grid,type)=>{
      const b=document.createElement('button');
      b.className='tbtn';
      b.innerHTML=`<span class="te">${this.MOB_E[type]||'👾'}</span>`+
        `${MOB_NAME[type]||type}`;
      b.addEventListener('click',()=>this.spawnMob(type,this.qty()));
      grid.appendChild(b);
    };
    const animals=[];
    for(const type in Monsters.TYPES){
      if(Monsters.isAnimal&&Monsters.isAnimal({type}))animals.push(type);
    }
    gr=section('animal','🐄 Animal — hewan pasif ('+animals.length+')');
    animals.forEach(type=>mobBtn(gr,type));

    /* --- kelompok monster --- */
    const mobs=[];
    for(const type in Monsters.TYPES){
      if(Monsters.isAnimal&&Monsters.isAnimal({type}))continue;
      mobs.push(type);
    }
    gr=section('mob','👹 Monster — spawn di dekatmu ('+mobs.length+')');
    mobs.forEach(type=>mobBtn(gr,type));

    /* --- log terminal --- */
    const log=document.createElement('div');
    log.id='term-log';
    body.appendChild(log);
    this.termLog('terminal forecraft v1 — siap. klik tombol untuk spawn.',null);

    const tip=document.createElement('p');
    tip.className='term-tip';
    tip.textContent='> item masuk tas otomatis (lebihan dijatuhkan ke tanah) · '+
      'NPC & monster muncul di tanah kosong sekitarmu · Esc menutup terminal';
    body.appendChild(tip);
  },

  /* jumlah dari input terminal (1–64) */
  qty(){
    const el=document.getElementById('term-qty');
    return clamp(Math.floor(+((el&&el.value)||1))||1,1,64);
  },
  /* level dari input terminal (1–200) */
  lvl(){
    const el=document.getElementById('term-lvl');
    return clamp(Math.floor(+((el&&el.value)||1))||1,1,CFG.MAX_LEVEL||200);
  },
  /* bintang dari input terminal (1–5) */
  stars(){
    const el=document.getElementById('term-stars');
    return clamp(Math.floor(+((el&&el.value)||1))||1,1,5);
  },
  bossMode(){
    const el=document.getElementById('term-boss');
    return !!(el&&el.checked);
  },
  termLog(text){
    const log=document.getElementById('term-log');
    if(!log)return;
    const d=document.createElement('div');
    d.textContent='> '+text;
    log.appendChild(d);
    while(log.childElementCount>12)log.firstElementChild.remove();
    log.scrollTop=log.scrollHeight;
  },

  /* ---------------- beri item ke tas pemain ---------------- */
  giveItem(id,n){
    const it=ITEMS[id];if(!it)return;
    const left=RPG.addItem(id,n);
    if(left>0){
      /* tas penuh → lebihan dijatuhkan di kaki pemain */
      World.dropItem(Player.pos.x,Player.pos.y+0.6,Player.pos.z,id,left);
      this.termLog(`${it.e} ${it.n} ×${n-left} masuk tas · ${left} sisa `+
        'dijatuhkan (tas penuh)');
    }else{
      this.termLog(`+ ${it.e} ${it.n} ×${n}`);
    }
    Sfx.craft();
    UI.renderAll();
  },

  /* ------------- titik tanah kosong di sekitar pemain ------------- */
  groundNear(minD,maxD){
    for(let t=0;t<14;t++){
      const a=Math.random()*Math.PI*2,d=rand(minD,maxD);
      const x=Player.pos.x+Math.sin(a)*d,z=Player.pos.z+Math.cos(a)*d;
      const y=World.topY(Math.floor(x),Math.floor(z));
      if(y>=4)return new THREE.Vector3(x,y,z);   // hanya daratan
    }
    return null;
  },

  /* ---------------- spawn NPC ---------------- */
  spawnNPC(roleId,n){
    const role=NPC_ROLES.find(r=>r.id===roleId);
    if(!role)return;
    const maxLvl=(role.rare)?(CFG.NPC_RARE_MAX_LEVEL||150):(CFG.NPC_MAX_LEVEL||100);
    const lvl=clamp(this.lvl(),1,maxLvl);
    let ok=0;
    for(let i=0;i<n;i++){
      const p=this.groundNear(2.5,6);
      if(!p)break;
      const npc=NPCS.make(role,p.x,p.y,p.z,{x:p.x,z:p.z},lvl);
      NPCS.list.push(npc);
      FX.debris(npc.pos.clone().add(new THREE.Vector3(0,1.4,0)),0xffe066,8,2);
      ok++;
    }
    if(ok)UI.toast(`${role.e} ${role.name} Lv ${lvl} ×${ok} muncul!`);
    this.termLog(ok
      ?`spawn ${role.e} ${role.name} Lv ${lvl} (max ${maxLvl}) ×${ok} — dekati & tekan G untuk bicara`
      :'gagal spawn NPC: tidak ada tanah kosong di sekitar');
  },

  /* ---------------- spawn monster ---------------- */
  spawnMob(type,n){
    if(!Monsters.TYPES[type])return;
    const boss=this.bossMode();
    const maxLvl=CFG.MAX_LEVEL||200;
    const lvl=clamp(this.lvl(),1,maxLvl);
    const stars=clamp(this.stars(),1,5);
    const starStr='⭐'.repeat(stars);
    let ok=0;
    for(let i=0;i<n;i++){
      const p=this.groundNear(3.5,8);
      if(!p)break;
      const m=Monsters.make(type,p,boss);
      // Terapkan level ke monster (HP, DMG, XP berskala)
      Monsters.setLevel(m,lvl);
      // Terapkan bintang & pengali stat bintang ke monster
      m.stars=stars;
      const starMult=1+(stars-1)*0.15+(boss?0.15:0);
      m.maxhp=Math.round(m.maxhp*starMult);
      m.hp=m.maxhp;
      m.dmg=Math.round(m.dmg*starMult);
      Monsters.list.push(m);
      ok++;
    }
    const bossTag=boss?' Raksasa':'';
    if(ok&&boss){
      UI.toast(`☠️ ${MOB_NAME[type]}${bossTag} ${starStr} Lv ${lvl} ×${ok} muncul!`);
      FX.addShake(.5);
    }else if(ok)UI.toast(`👹 ${MOB_NAME[type]} ${starStr} Lv ${lvl} ×${ok} muncul!`);
    this.termLog(ok
      ?`spawn ${boss?'BOSS ':''}${MOB_NAME[type]} ${starStr} Lv ${lvl} (max ${maxLvl}) ×${ok}`
      :'gagal spawn monster: tidak ada tanah kosong di sekitar');
  },
};
Chat.init();
