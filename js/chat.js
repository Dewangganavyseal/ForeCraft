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
  teleportEnabled:(typeof localStorage!=='undefined'&&localStorage.getItem('forecraft_teleport_enabled')==='1'),

  setTeleport(enable){
    this.teleportEnabled=!!enable;
    if(typeof localStorage!=='undefined'){
      localStorage.setItem('forecraft_teleport_enabled',this.teleportEnabled?'1':'0');
    }
    if(this._updateTpBtn)this._updateTpBtn();
  },

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

    /* ---- KODE RAHASIA: buka terminal spawn / toggle mode TPP / Teleport ---- */
    if(text.startsWith(this.SECRET) || text === '/tpp' || text === '/fpp'){
      const arg = text.slice(this.SECRET.length).trim().toLowerCase();
      if(arg === 'tpp' || arg === 'fpp' || arg === 'toggle' || text === '/tpp' || text === '/fpp'){
        if(typeof Cam !== 'undefined') Cam.setTPP(!Cam.tppEnabled);
        this.pushLog('>> Mode TPP: ' + (Cam.tppEnabled ? 'AKTIF (zoom dekat untuk kamera belakang karakter)' : 'NONAKTIF'), 'sys');
        this.close();
        return;
      }
      if(arg === 'tp' || arg === 'teleport'){
        this.setTeleport(!this.teleportEnabled);
        this.pushLog('>> Mode Teleport: ' + (this.teleportEnabled ? 'AKTIF [ON]' : 'NONAKTIF [OFF]'), 'sys');
        this.close();
        return;
      }
      this.pushLog('>> akses diterima — TERMINAL dibuka','sys');
      this.close();
      UI.toggle('term');
      return;
    }

    /* ---- PERINTAH TELEPORT: /teleport <target> atau /tp <target> ---- */
    if(text.startsWith('/teleport') || text.startsWith('/tp ') || text === '/tp'){
      let targetName = '';
      if(text.startsWith('/teleport')) targetName = text.slice(9).trim();
      else if(text.startsWith('/tp')) targetName = text.slice(3).trim();
      this.executeTeleport(targetName);
      this.close();
      return;
    }

    /* ---- pesan biasa: log + gelembung teks di atas kepala pemain ---- */
    if(typeof Game!=='undefined'&&Game.isMultiplayer&&typeof Network!=='undefined'&&Network.active){
      Network.sendChat(text);
      return;
    }
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

  /* ------------------------------ sistem teleportasi --------------------- */
  executeTeleport(targetName){
    const raw=(targetName||'').trim();
    const query=raw.toLowerCase();

    // Teleport hanya bisa diaktifkan melalui /280195
    if(query==='on'||query==='enable'||query==='1'||query==='off'||query==='disable'||query==='0'){
      this.pushLog('⚠️ <b>Mode Teleport hanya bisa diaktifkan/dinonaktifkan melalui menu rahasia /280195!</b>','sys');
      return false;
    }

    if(!this.teleportEnabled){
      this.pushLog('⚠️ <b>Mode Teleport sedang NONAKTIF!</b> Fitur ini hanya dapat diaktifkan melalui menu rahasia <code>/280195</code>.','sys');
      return false;
    }

    if(!raw){
      this.pushLog('❓ Gunakan: <code>/teleport &lt;nama pemain / NPC / monster / koordinat x y z / spawn / desa&gt;</code>','sys');
      return false;
    }

    // 1. Cek jika koordinat angka: "/teleport 100 25 -50" atau "/tp 100, 25, -50"
    const coords=raw.split(/[\s,]+/).map(Number);
    if(coords.length===3&&!coords.some(isNaN)){
      return this._doTeleport(coords[0],coords[1],coords[2],`Koordinat (${Math.round(coords[0])}, ${Math.round(coords[1])}, ${Math.round(coords[2])})`);
    }

    // 2. Keyword khusus: spawn & desa
    if(query==='spawn'){
      if(typeof Player!=='undefined'&&Player.spawnP){
        return this._doTeleport(Player.spawnP.x,Player.spawnP.y,Player.spawnP.z,'Titik Spawn');
      }
    }
    if(query==='desa'||query==='village'||query==='kampung'){
      const nearest=(typeof WGEN!=='undefined'&&WGEN.nearestVillage)?WGEN.nearestVillage(Player.pos.x,Player.pos.z):null;
      if(nearest){
        const seaH=(typeof CFG!=='undefined'?CFG.SEA:22)+1.2;
        return this._doTeleport(nearest.x,seaH,nearest.z,'Desa Terdekat');
      }
    }

    // 3. Cari pemain lain di Multiplayer (Network.remotePlayers)
    if(typeof Network!=='undefined'&&Network.remotePlayers&&Network.remotePlayers.size>0){
      let matchedPlayer=null;
      for(const rp of Network.remotePlayers.values()){
        const rpName=(rp.name||'').toLowerCase();
        if(rpName===query){
          matchedPlayer=rp;
          break;
        }
        if(rpName.includes(query)&&!matchedPlayer){
          matchedPlayer=rp;
        }
      }
      if(matchedPlayer){
        const pos=matchedPlayer.currentPos||(matchedPlayer.mesh?matchedPlayer.mesh.position:null);
        if(pos){
          return this._doTeleport(pos.x,pos.y,pos.z,`Pemain "${matchedPlayer.name}"`);
        }
      }
    }

    // 4. Cari NPC di sekitar (NPCS.list atau NPCS.team)
    if(typeof NPCS!=='undefined'){
      const allNpcs=[...(NPCS.list||[]),...(NPCS.team||[])];
      let matchedNpc=null;
      for(const n of allNpcs){
        const nName=(n.name||'').toLowerCase();
        const nRole=(n.role||'').toLowerCase();
        if(nName===query||nRole===query){
          matchedNpc=n;
          break;
        }
        if((nName.includes(query)||nRole.includes(query))&&!matchedNpc){
          matchedNpc=n;
        }
      }
      if(matchedNpc){
        const p=matchedNpc.pos||(matchedNpc.mesh?matchedNpc.mesh.position:null);
        if(p){
          return this._doTeleport(p.x,p.y,p.z,`NPC "${matchedNpc.name||matchedNpc.role}"`);
        }
      }
    }

    // 5. Cari Monster / Boss (Monsters.list)
    if(typeof Monsters!=='undefined'&&Monsters.list&&Monsters.list.length>0){
      let matchedMob=null;
      for(const m of Monsters.list){
        if(m.dead)continue;
        const mType=(m.type||'').toLowerCase();
        const mName=(m.name||'').toLowerCase();
        if(mType===query||mName===query){
          matchedMob=m;
          break;
        }
        if((mType.includes(query)||mName.includes(query))&&!matchedMob){
          matchedMob=m;
        }
      }
      if(matchedMob){
        const p=matchedMob.pos||(matchedMob.mesh?matchedMob.mesh.position:null);
        if(p){
          return this._doTeleport(p.x,p.y,p.z,`Monster "${matchedMob.name||matchedMob.type}"`);
        }
      }
    }

    // 6. Tidak ditemukan
    this.pushLog(`❌ Target "<b>${raw}</b>" tidak ditemukan. Pastikan target ada di room / dunia ini (Pemain, NPC, Monster, atau koordinat x y z).`,'sys');
    return false;
  },

  _doTeleport(x,y,z,label){
    if(typeof Player==='undefined'||!Player.pos)return false;

    // Pastikan ketinggian aman di atas daratan/blok
    let safeY=y;
    if(typeof WGEN!=='undefined'&&WGEN.height){
      const groundH=WGEN.height(Math.round(x),Math.round(z));
      safeY=Math.max(y,groundH+0.5);
    }

    // Efek kepulan asap sebelum teleport
    if(typeof FX!=='undefined'&&FX.puff){
      FX.puff(Player.pos.clone());
    }

    Player.pos.set(x,safeY,z);
    if(Player.vel)Player.vel.set(0,0,0);

    if(typeof Game!=='undefined'){
      Game.camTarget.set(x,safeY+1.3,z);
      if(typeof Cam!=='undefined'){
        Cam.update(0.016,Game.camTarget);
      }
    }

    // Efek partikel & suara di posisi baru
    if(typeof FX!=='undefined'){
      if(FX.puff)FX.puff(new THREE.Vector3(x,safeY,z));
      if(FX.sparks)FX.sparks(new THREE.Vector3(x,safeY,z));
    }
    if(typeof Sfx!=='undefined'&&Sfx.pop){
      Sfx.pop();
    }

    // Beritahukan ke server multiplayer
    if(typeof Game!=='undefined'&&Game.isMultiplayer&&typeof Network!=='undefined'&&Network.active){
      Network.sendTeleport(x,safeY,z);
    }

    const info=`⚡ Teleportasi berhasil ke <b>${label}</b> [${Math.round(x)}, ${Math.round(safeY)}, ${Math.round(z)}]`;
    this.pushLog(info,'sys');
    if(typeof UI!=='undefined'&&UI.toast){
      UI.toast(`⚡ Teleport ke ${label}`);
    }
    return true;
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
          cow:'🐄',horse:'🐎',dragon:'🐲',trex:'🦖',mammoth:'🦣',lizard:'🦎',snake:'🐍',
         kelabang:'🐛',kumbang:'🪲',yeti:'❄️',semut:'🐜',reaper:'⚰️',tarantula:'🕷️'},

  /* dipanggil UI.toggle('term'); isi cukup dibangun sekali */
  renderTerm(){
    const body=document.getElementById('term-body');
    if(!body)return;
    if(this._termBuilt){
      if(this._updateFppBtn)this._updateFppBtn();
      if(this._updateTpBtn)this._updateTpBtn();
      return;
    }
    this._termBuilt=true;

    /* --- baris kontrol: jumlah, level, bintang, varian boss, mode rekrut tim/pet --- */
    const ctl=document.createElement('div');
    ctl.className='term-ctl';
    ctl.innerHTML=
      '<label>🔢 Jumlah <input id="term-qty" type="number" min="1" max="64" value="1"></label>'+
      '<label>⭐ Level <input id="term-lvl" type="number" min="1" max="200" value="1"></label>'+
      '<label>✨ Bintang <input id="term-stars" type="number" min="1" max="5" value="1"></label>'+
      '<label><input id="term-boss" type="checkbox"> 👹 Varian Boss</label>'+
      '<label style="color:#fdba74;font-weight:700;"><input id="term-direct-team" type="checkbox"> 👥 Mode Rekrut Tim / Pet</label>';

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

    /* Tombol Toggle Mode Teleport */
    const tpBtn=document.createElement('button');
    tpBtn.className='tbtn';
    tpBtn.style.cssText='width:100%;margin:4px 0 6px;padding:9px 12px;font-size:12px;font-weight:700;border-radius:8px;cursor:pointer;transition:.15s;text-align:left;';
    const updateTpBtn=()=>{
      const on=!!Chat.teleportEnabled;
      tpBtn.style.borderColor=on?'#38bdf8':'#64748b';
      tpBtn.style.background=on?'rgba(56,189,248,0.22)':'rgba(0,0,0,0.40)';
      tpBtn.style.color=on?'#7dd3fc':'#cbd5e1';
      tpBtn.innerHTML='⚡ Mode Teleport (/teleport &lt;nama target&gt;): <b>'+(on?'AKTIF [ON]':'NONAKTIF [OFF]')+'</b>';
    };
    this._updateTpBtn=updateTpBtn;
    updateTpBtn();
    tpBtn.addEventListener('click',()=>{
      Chat.setTeleport(!Chat.teleportEnabled);
      updateTpBtn();
    });
    ctl.appendChild(tpBtn);

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
    gr=section('npc','🤝 NPC — spawn atau rekrut ke tim ('+NPC_ROLES.length+')');
    for(const role of NPC_ROLES){
      const box=document.createElement('div');
      box.className='tbtn-box';
      box.style.cssText='display:inline-flex;gap:3px;align-items:center;';

      const b=document.createElement('button');
      b.type='button';
      b.className='tbtn';
      const maxL=(role.rare)?(CFG.NPC_RARE_MAX_LEVEL||150):(CFG.NPC_MAX_LEVEL||100);
      b.innerHTML=`<span class="te">${role.e}</span>${role.name}`+
        ` <small>max Lv ${maxL}</small>`;
      b.addEventListener('click',()=>{
        if(this.directTeamMode())this.recruitNPC(role.id);
        else this.spawnNPC(role.id,this.qty());
      });
      box.appendChild(b);

      const bTeam=document.createElement('button');
      bTeam.type='button';
      bTeam.className='tbtn';
      bTeam.style.cssText='padding:5px 8px;background-color:#c2410c;border:1.5px solid #7c2d12;color:#fff;font-weight:700;font-size:11px;';
      bTeam.title='Rekrut langsung ke Tim';
      bTeam.textContent='👥 Tim';
      bTeam.addEventListener('click',()=>this.recruitNPC(role.id));
      box.appendChild(bTeam);

      gr.appendChild(box);
    }

    /* --- kelompok ANIMAL: hewan pasif (sapi/kuda/kelinci) --- */
    const mobBtn=(grid,type)=>{
      const box=document.createElement('div');
      box.className='tbtn-box';
      box.style.cssText='display:inline-flex;gap:3px;align-items:center;';

      const b=document.createElement('button');
      b.type='button';
      b.className='tbtn';
      b.innerHTML=`<span class="te">${this.MOB_E[type]||'👾'}</span>`+
        `${MOB_NAME[type]||type}`;
      b.addEventListener('click',()=>{
        if(this.directTeamMode())this.addPet(type);
        else this.spawnMob(type,this.qty());
      });
      box.appendChild(b);

      const bPet=document.createElement('button');
      bPet.type='button';
      bPet.className='tbtn';
      bPet.style.cssText='padding:5px 8px;background-color:#c2410c;border:1.5px solid #7c2d12;color:#fff;font-weight:700;font-size:11px;';
      bPet.title='Tambahkan langsung sebagai Pet ke tim';
      bPet.textContent='🐾 Pet';
      bPet.addEventListener('click',()=>this.addPet(type));
      box.appendChild(bPet);

      grid.appendChild(box);
    };
    const animals=[];
    for(const type in Monsters.TYPES){
      if(Monsters.isAnimal&&Monsters.isAnimal({type}))animals.push(type);
    }
    gr=section('animal','🐄 Animal — hewan pasif / pet ('+animals.length+')');
    animals.forEach(type=>mobBtn(gr,type));

    /* --- kelompok monster --- */
    const mobs=[];
    for(const type in Monsters.TYPES){
      if(Monsters.isAnimal&&Monsters.isAnimal({type}))continue;
      mobs.push(type);
    }
    gr=section('mob','👹 Monster — monster liar / pet ('+mobs.length+')');
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
  directTeamMode(){
    const el=document.getElementById('term-direct-team');
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
      if(type==='tarantula'&&boss&&Monsters.spawnTarantulaMinions){
        Monsters.spawnTarantulaMinions(m);
      }
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

  /* ---------------- rekrut NPC langsung ke tim ---------------- */
  recruitNPC(roleId){
    if(typeof NPCS==='undefined')return;
    const maxTeam=(typeof CFG!=='undefined'&&CFG.NPC)?CFG.NPC.TEAM_MAX:3;
    if(NPCS.teamFull()||NPCS.team.length>=maxTeam){
      if(typeof UI!=='undefined'&&UI.centerAlert)UI.centerAlert('👥 TEAM PENUH!');
      if(typeof Sfx!=='undefined'&&Sfx.noStamina)Sfx.noStamina();
      this.termLog(`Gagal rekrut: Team sudah penuh (maks ${maxTeam} rekan)!`);
      return;
    }
    const role=NPC_ROLES.find(r=>r.id===roleId);
    if(!role)return;
    const maxLvl=(role.rare)?(CFG.NPC_RARE_MAX_LEVEL||150):(CFG.NPC_MAX_LEVEL||100);
    const lvl=clamp(this.lvl(),1,maxLvl);
    const p=this.groundNear(1.5,3.5)||Player.pos.clone();
    const npc=NPCS.make(role,p.x,p.y,p.z,{x:p.x,z:p.z},lvl);
    NPCS.list.push(npc);
    NPCS.recruit(npc);
    this.termLog(`👥 ${role.e} ${npc.name} (Lv ${lvl}) langsung bergabung ke tim!`);
  },

  /* ---------------- tambah pet langsung ke tim / slot pet ---------------- */
  addPet(type){
    if(typeof RPG==='undefined'||!RPG.mobSlots)return;
    const idx=RPG.mobSlots.findIndex(s=>!s);
    if(idx<0){
      if(typeof UI!=='undefined'&&UI.centerAlert)UI.centerAlert('🐾 PET PENUH!');
      if(typeof Sfx!=='undefined'&&Sfx.noStamina)Sfx.noStamina();
      this.termLog('Gagal tambah: Slot pet sudah penuh (maks 4 pet)!');
      return;
    }
    const boss=this.bossMode();
    const maxLvl=CFG.MAX_LEVEL||200;
    const curLvl=clamp(this.lvl(),1,maxLvl);
    const stars=clamp(this.stars(),1,5);
    const starMult=1+(stars-1)*0.15+(boss?0.15:0);
    const statDef=(typeof Capture!=='undefined'&&Capture.PET_BASE_STATS&&Capture.PET_BASE_STATS[type])||{baseHp:100,baseDmg:30};
    const maxhp=Math.round(statDef.baseHp*starMult+statDef.baseHp*0.08*starMult*(curLvl-1));
    const dmg=Math.round(statDef.baseDmg*starMult+statDef.baseDmg*0.05*starMult*(curLvl-1));
    const mobName=(typeof Capture!=='undefined'&&Capture.mobName)?Capture.mobName(type):(MOB_NAME[type]||type);
    const pet={
      type,
      boss,
      stars,
      lvl:curLvl,
      xp:0,
      power:starMult,
      hp:maxhp,
      maxhp,
      dmg,
      saddle:false,
      name:mobName,
    };
    RPG.mobSlots[idx]=pet;
    const starStr='⭐'.repeat(stars);
    // Bila saat ini belum ada pet aktif di tim/lapangan, langsung deploy!
    if(typeof Capture!=='undefined'&&!Capture.pet&&Capture.deploy){
      Capture.deploy(idx);
    }
    if(typeof UI!=='undefined'){
      if(UI.renderTeam)UI.renderTeam();
      if(UI.renderBag)UI.renderBag();
    }
    UI.toast(`🐾 ${pet.name}${pet.boss?' Raksasa':''} ${starStr} Lv ${curLvl} masuk ke tim & slot pet!`);
    this.termLog(`🐾 Pet ${pet.name}${pet.boss?' Raksasa':''} ${starStr} Lv ${curLvl} berhasil ditambahkan!`);
    if(typeof FX!=='undefined'){
      FX.debris(Player.pos.clone().add(new THREE.Vector3(0,0.5,0)),0xffa53d,12,2);
      FX.ring(Player.pos.x,Player.pos.y+0.1,Player.pos.z,0xffa53d,0.5,2);
    }
    if(typeof Sfx!=='undefined'&&Sfx.levelup)Sfx.levelup();
  },
};
Chat.init();
