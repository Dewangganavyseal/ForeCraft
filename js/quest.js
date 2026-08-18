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

  /* ---------------------------------------------------------------------------
     DEFINISI QUEST
     lvl : level minimum pemain agar quest ditawarkan
     rep : true → bisa diambil berulang kali
     --------------------------------------------------------------------------- */
  DEFS:[
    /* ---- tahap awal: mengumpulkan bahan dasar ---- */
    {id:'q_wood',   e:'🌲', name:'Tumpukan Kayu',      lvl:1, rep:true,
     type:'gather', target:'wood',  n:12,
     desc:'Desa perlu kayu untuk memperbaiki atap rumah.',
     xp:35,  coin:12, reward:{bread:2,fiber:3}},
    {id:'q_stone',  e:'⛰️', name:'Batu Fondasi',       lvl:1, rep:true,
     type:'gather', target:'stone', n:14,
     desc:'Batu untuk memperkuat dinding sumur desa.',
     xp:40,  coin:14, reward:{cmeat:2}},
    {id:'q_slime',  e:'💧', name:'Bersihkan Slime',    lvl:1, rep:true,
     type:'kill',   target:'slime', n:5,
     desc:'Slime berkeliaran di ladang dan merusak tanaman.',
     xp:55,  coin:18, reward:{bandage:1,berry:3}},

    /* ---- tahap menengah: berburu & memasak ---- */
    {id:'q_boar',   e:'🐗', name:'Babi Perusak Ladang', lvl:2, rep:true,
     type:'kill',   target:'boar',  n:4,
     desc:'Kawanan babi hutan menginjak-injak kebun beri.',
     xp:80,  coin:26, reward:{leather:2,cmeat:2}},
    {id:'q_cook',   e:'🍖', name:'Perbekalan Pemburu',  lvl:2, rep:true,
     type:'craft',  target:'cmeat', n:4,
     desc:'Masak daging panggang sebagai perbekalan penjaga desa.',
     xp:70,  coin:22, reward:{fiber:6,resin:2}},
    {id:'q_pelt',   e:'🐺', name:'Bulu untuk Musim Dingin', lvl:3, rep:true,
     type:'gather', target:'pelt',  n:4,
     desc:'Penjahit desa butuh bulu serigala untuk mantel.',
     xp:110, coin:34, reward:{leather:3,bandage:1}},
    {id:'q_wolf',   e:'🌙', name:'Kawanan di Tepi Hutan', lvl:3, rep:true,
     type:'kill',   target:'wolf',  n:5,
     desc:'Serigala mulai memangsa ternak saat malam.',
     xp:130, coin:40, reward:{leather:2,cmeat:3}},

    /* ---- tahap lanjut: tambang & peleburan ---- */
    {id:'q_coal',   e:'🖤', name:'Bahan Bakar Tanur',   lvl:4, rep:true,
     type:'gather', target:'coal',  n:8,
     desc:'Pandai besi kehabisan batu bara untuk tanurnya.',
     xp:120, coin:36, reward:{iron_ore:3}},
    {id:'q_ingot',  e:'🔩', name:'Pesanan Pandai Besi', lvl:5, rep:true,
     type:'craft',  target:'iron_ingot', n:3,
     desc:'Lebur bijih besi menjadi batang siap tempa.',
     xp:160, coin:48, reward:{coal:4,gold_ore:2}},
    {id:'q_scorp',  e:'🦂', name:'Sarang Kalajengking', lvl:5, rep:true,
     type:'kill',   target:'scorpion', n:4,
     desc:'Racun kalajengking meresahkan pedagang yang lewat.',
     xp:190, coin:55, reward:{venom:2,bandage:2}},

    /* ---- tahap akhir: golem & kristal ---- */
    {id:'q_crystal',e:'💎', name:'Kristal Beku',        lvl:6, rep:true,
     type:'gather', target:'crystal', n:5,
     desc:'Tetua desa memerlukan kristal untuk jimat pelindung.',
     xp:230, coin:70, reward:{iron_ingot:2,gold_ingot:1}},
    {id:'q_golem',  e:'🗿', name:'Golem Hutan',         lvl:7, rep:true,
     type:'kill',   target:'golem', n:2,
     desc:'Golem menghancurkan jalan menuju desa sebelah.',
     xp:320, coin:95, reward:{crystal:2,gold_ingot:2}},
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
     --------------------------------------------------------------------------- */
  offers(board){
    const lvl=(Player&&Player.level)||1;
    const pool=this.DEFS.filter(d=>
      lvl>=d.lvl&&!this.isActive(d.id)&&(d.rep||!this.done[d.id]));
    if(!pool.length)return [];
    const off=(board&&board.id)||0;
    const out=[];
    for(let i=0;i<Math.min(this.OFFER,pool.length);i++)
      out.push(pool[(off+i)%pool.length]);
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
    if(!this.complete(a)){UI.toast('Tujuan quest belum selesai');return;}
    if(d.type==='gather')RPG.removeItems({[d.target]:d.n});
    const got=[];
    for(const rid in (d.reward||{})){
      const n=d.reward[rid];
      const left=RPG.addItem(rid,n);
      if(left<n)got.push(`${ITEMS[rid].e} ${ITEMS[rid].n} ×${n-left}`);
      /* tas penuh → sisanya dijatuhkan di kaki pemain agar tidak hilang */
      if(left>0&&typeof FX!=='undefined')
        FX.spawnDrop(Player.pos.clone().add(new THREE.Vector3(0,0.6,0)),rid,left);
    }
    Player.addXP(d.xp);
    /* hadiah koin (sistem ekonomi desa) */
    if(d.coin)RPG.addCoin(d.coin,true);
    this.done[d.id]=(this.done[d.id]||0)+1;
    this.active.splice(this.active.indexOf(a),1);
    Sfx.craft();
    UI.toast(`🏅 ${d.name} selesai! +${d.xp} XP${d.coin?' · +'+d.coin+' 🪙':''}${got.length?' · '+got.join(', '):''}`);
    if(typeof FX!=='undefined')
      FX.text(Player.pos.clone().add(new THREE.Vector3(0,2.4,0)),
        `+${d.xp} XP${d.coin?' +'+d.coin+'🪙':''}`,'#ffd24d');
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
     --------------------------------------------------------------------------- */
  open(board){
    this.board=board||null;
    Sfx.open();
    if(UI.open!=='quest')UI.toggle('quest');
    else this.renderPanel();
  },
  refresh(){
    if(UI.open==='quest')this.renderPanel();
    this.renderTracker();
  },
  bar(have,n){
    const p=Math.round(Math.min(1,have/n)*100);
    return `<div class="qbar"><i style="width:${p}%"></i></div>`;
  },
  rewardStr(d){
    const r=[`⭐ ${d.xp} XP`];
    if(d.coin)r.push(`🪙 ${d.coin} koin`);
    for(const id in (d.reward||{}))
      r.push(`${ITEMS[id].e} ${ITEMS[id].n} ×${d.reward[id]}`);
    return r.join(' · ');
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
    const h=[];
    /* --- quest yang sedang dijalani --- */
    h.push(`<div class="sub">Quest Aktif ${this.active.length}/${this.MAX}</div>`);
    if(!this.active.length)
      h.push('<p class="tip">Belum ada quest aktif. Ambil dari daftar di bawah.</p>');
    for(const a of this.active){
      const d=this.def(a.id);if(!d)continue;
      const have=this.have(a),ok=have>=d.n;
      h.push(
        `<div class="qcard${ok?' ok':''}">`+
        `<div class="qh"><b>${d.e} ${d.name}</b>`+
        `<span class="qlv">Lv ${d.lvl}+</span></div>`+
        `<div class="qgoal">${this.goalStr(d,have)}</div>`+
        this.bar(have,d.n)+
        `<div class="qrew">${this.rewardStr(d)}</div>`+
        `<div class="qbtns">`+
        `<button class="mini q-claim${ok?'':' dim'}" data-q="${d.id}">`+
        `${ok?'🏅 Ambil Hadiah':'⏳ Belum Selesai'}</button>`+
        `<button class="mini q-drop" data-q="${d.id}">🚫 Lepas</button>`+
        `</div></div>`);
    }
    /* --- tawaran dari papan --- */
    const off=this.offers(this.board);
    h.push('<div class="sub">Papan Pengumuman Desa</div>');
    if(!off.length)
      h.push('<p class="tip">Tidak ada tawaran baru untuk saat ini — naikkan level atau selesaikan quest yang berjalan.</p>');
    for(const d of off){
      const times=this.done[d.id]||0;
      h.push(
        `<div class="qcard offer">`+
        `<div class="qh"><b>${d.e} ${d.name}</b>`+
        `<span class="qlv">Lv ${d.lvl}+</span></div>`+
        `<div class="qdesc">${d.desc}</div>`+
        `<div class="qgoal">${this.goalStr(d,d.type==='gather'?RPG.countItem(d.target):0)}</div>`+
        `<div class="qrew">${this.rewardStr(d)}`+
        `${times?` · <i>sudah ${times}×</i>`:''}</div>`+
        `<div class="qbtns"><button class="mini q-take" data-q="${d.id}">`+
        `📜 Ambil Quest</button></div></div>`);
    }
    el.innerHTML=h.join('');
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
    const h=['<div class="qt-h">📜 Quest</div>'];
    for(const a of this.active){
      const d=this.def(a.id);if(!d)continue;
      const have=this.have(a),ok=have>=d.n;
      h.push(
        `<div class="qt-row${ok?' ok':''}">`+
        `<span class="qt-n">${d.e} ${d.name}</span>`+
        `<span class="qt-c">${Math.min(have,d.n)}/${d.n}</span>`+
        this.bar(have,d.n)+`</div>`);
    }
    el.innerHTML=h.join('');
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
    '<h2>📜 Papan Quest <button class="x" data-close="quest">✕</button></h2>'+
    '<p class="tip">Ambil quest dari papan di desa, penuhi tujuannya, lalu '+
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


  /* ---------- tombol J: buka/tutup panel quest ---------- */
  window.addEventListener('keydown',e=>{
    if(e.code!=='KeyJ')return;
    if(typeof Game==='undefined'||!Game.started)return;
    UI.toggle('quest');
  });

  Quest.load();
})();
