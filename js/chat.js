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
  maxRaritySeen:2,           // minimal tier rare (2) agar notifikasi item sampah tidak muncul

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
    if(tab==='notif'){
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
    const RARITY_MAP={common:0,uncommon:1,rare:2,epic:3,legendary:4,mythic:5};

    if(itemId&&typeof ITEMS!=='undefined'&&ITEMS[itemId]){
      itemRarity=ITEMS[itemId].rarity||'common';
    }else if(typeof ITEMS!=='undefined'){
      let highestFound=-1;
      for(const id in ITEMS){
        const it=ITEMS[id];
        if(it&&it.n&&text.includes(it.n)){
          const r=it.rarity||'common';
          const sc=RARITY_MAP[r]||0;
          if(sc>highestFound){
            highestFound=sc;
            itemRarity=r;
          }
        }
      }
    }

    if(itemRarity!==null){
      const sc=RARITY_MAP[itemRarity]||0;
      if(sc>this.maxRaritySeen)this.maxRaritySeen=sc;
      // HANYA tampilkan notifikasi item dengan rarity paling tinggi yang pernah ditemukan
      if(sc<this.maxRaritySeen)return;
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
    const g={food:[],mat:[],weapon:[],armor:[],furni:[]};
    const legacyAliases=new Set([
      'sword_wood','sword_copper','sword_gold','sword_storm','sword_venom',
      'sword_tungsten','sword_frost','sword_titan','cap_leather','vest_leather','boots_leather'
    ]);
    for(const id in ITEMS){
      if(legacyAliases.has(id))continue;
      const it=ITEMS[id];
      if(!it)continue;
      if(it.weapon)g.weapon.push(id);
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

    /* --- baris kontrol: jumlah & varian boss --- */
    const ctl=document.createElement('div');
    ctl.className='term-ctl';
    ctl.innerHTML=
      '<label>🔢 Jumlah <input id="term-qty" type="number" min="1" max="64" value="1"></label>'+
      '<label><input id="term-boss" type="checkbox"> 👹 Varian Boss (monster)</label>';

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

    /* --- helper pembuat kelompok tombol --- */
    const section=(title)=>{
      const h=document.createElement('div');
      h.className='term-sub';h.textContent=title;body.appendChild(h);
      const grid=document.createElement('div');
      grid.className='term-grid';body.appendChild(grid);
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
    let gr=section('🍖 Consumable — makanan & obat');
    g.food.forEach(id=>itemBtn(gr,id));
    gr=section('🌲 Bahan — resource');
    g.mat.forEach(id=>itemBtn(gr,id));
    gr=section('⚔️ Equipment — senjata');
    g.weapon.forEach(id=>itemBtn(gr,id));
    gr=section('🛡️ Armor — pelindung');
    g.armor.forEach(id=>itemBtn(gr,id));
    gr=section('🪑 Furnitur — bisa dipasang');
    g.furni.forEach(id=>itemBtn(gr,id));

    /* --- kelompok NPC: semua arketipe NPC_ROLES --- */
    gr=section('🤝 NPC — spawn di dekatmu');
    for(const role of NPC_ROLES){
      const b=document.createElement('button');
      b.className='tbtn';
      b.innerHTML=`<span class="te">${role.e}</span>${role.name}`+
        (role.rare?' <small>langka</small>':'');
      b.addEventListener('click',()=>this.spawnNPC(role.id,this.qty()));
      gr.appendChild(b);
    }

    /* --- kelompok ANIMAL: hewan pasif (sapi/kuda) --- */
    const mobBtn=(grid,type)=>{
      const b=document.createElement('button');
      b.className='tbtn';
      b.innerHTML=`<span class="te">${this.MOB_E[type]||'👾'}</span>`+
        `${MOB_NAME[type]||type}`;
      b.addEventListener('click',()=>this.spawnMob(type,this.qty()));
      grid.appendChild(b);
    };
    gr=section('🐄 Animal — hewan pasif');
    for(const type in Monsters.TYPES){
      if(Monsters.isAnimal&&Monsters.isAnimal({type}))mobBtn(gr,type);
    }

    /* --- kelompok monster --- */
    gr=section('👹 Monster — spawn di dekatmu');
    for(const type in Monsters.TYPES){
      if(Monsters.isAnimal&&Monsters.isAnimal({type}))continue;
      mobBtn(gr,type);
    }

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
    let ok=0;
    for(let i=0;i<n;i++){
      const p=this.groundNear(2.5,6);
      if(!p)break;
      const npc=NPCS.make(role,p.x,p.y,p.z,{x:p.x,z:p.z});
      NPCS.list.push(npc);
      FX.debris(npc.pos.clone().add(new THREE.Vector3(0,1.4,0)),0xffe066,8,2);
      ok++;
    }
    if(ok)UI.toast(`${role.e} ${role.name} ×${ok} muncul!`);
    this.termLog(ok
      ?`spawn ${role.e} ${role.name} ×${ok} — dekati & tekan G untuk bicara`
      :'gagal spawn NPC: tidak ada tanah kosong di sekitar');
  },

  /* ---------------- spawn monster ---------------- */
  spawnMob(type,n){
    if(!Monsters.TYPES[type])return;
    const boss=this.bossMode();
    let ok=0;
    for(let i=0;i<n;i++){
      const p=this.groundNear(3.5,8);
      if(!p)break;
      const m=Monsters.make(type,p,boss);
      Monsters.list.push(m);
      ok++;
    }
    if(ok&&boss){
      UI.toast(`☠️ ${MOB_NAME[type]} Raksasa ×${ok} muncul!`);
      FX.addShake(.5);
    }else if(ok)UI.toast(`👹 ${MOB_NAME[type]} ×${ok} muncul!`);
    this.termLog(ok
      ?`spawn ${boss?'BOSS ':''}${MOB_NAME[type]} ×${ok}`
      :'gagal spawn monster: tidak ada tanah kosong di sekitar');
  },
};
Chat.init();
