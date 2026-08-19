'use strict';
/* Bootstrap & game loop */
const Game={
  seed:1,scene:null,renderer:null,clock:null,
  started:false,loadingDone:false,menuMode:false,
  camTarget:new THREE.Vector3(),menuCenter:new THREE.Vector3(),

  init(){
    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color(0x8fb8de);
    this.scene.fog=new THREE.Fog(0x8fb8de,34,90);
    this.renderer=new THREE.WebGLRenderer({antialias:true});
    this.renderer.setSize(window.innerWidth,window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,IS_MOBILE?1.6:2));
    this.renderer.shadowMap.enabled=!IS_MOBILE;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding=THREE.sRGBEncoding;
    document.getElementById('game').appendChild(this.renderer.domElement);
    window.addEventListener('resize',()=>{
      this.renderer.setSize(window.innerWidth,window.innerHeight);
      Cam.resize();
    });

    RPG.initSlots();
    WGEN.init(this.seed);
    Weather.init(this.scene);
    FX.init(this.scene);
    Furni.init(this.scene);
    Dungeon.init();
    SaveGame.init();
    Music.initUI();
    Player.buildModel();
    Cam.init();
    Input.init();
    UI.init();
    this.scene.add(World.group);

    /* main menu baru + background panorama */
    MainMenu.init();
    this.startMenuBackground();

    this.clock=new THREE.Clock();
    this.loop=this.loop.bind(this);
    requestAnimationFrame(this.loop);
  },

  /* ---------- helper ---------- */
  clearWorldMeshes(){
    for(const[,c]of World.chunks){
      if(c.group)World.disposeGroup(c);
    }
    World.chunks.clear();
  },

  findSpawn(){
    let sx=0,sz=0;
    for(let r=0;r<40;r++){
      let found=false;
      for(let a=0;a<16;a++){
        const ang=a/16*Math.PI*2;
        const x=Math.round(Math.cos(ang)*r),z=Math.round(Math.sin(ang)*r);
        if(WGEN.height(x,z)>=CFG.SEA&&!WGEN.treeAt(x,z,WGEN.height(x,z))){
          sx=x;sz=z;found=true;break;
        }
      }
      if(found)break;
    }
    return{x:sx,z:sz,y:WGEN.height(sx,sz)};
  },

  /* ---------- main menu background ----------
     Panorama yang BERJALAN antar desa: kamera mengorbit pelan (otomatis, tanpa
     input pengguna) di atas sebuah desa, lalu setelah beberapa detik memudar
     gelap dan berpindah ke desa lain. Desa diratakan ke tinggi CFG.SEA, jadi
     target kamera selalu CFG.SEA+1.4 di atas tanah. */
  startMenuBackground(){
    this.menuMode=true;
    this.started=false;
    document.body.classList.add('in-menu');

    /* dunia acak untuk panorama */
    this.seed=(Math.random()*1e9)|0;
    WGEN.init(this.seed);
    this.clearWorldMeshes();

    /* daftar desa yang akan dikunjungi panorama */
    this.menuTour=this.buildVillageTour();
    this.menuTourState={phase:'hold',t:0,idx:0};
    this.menuHoldMax=11;                       // detik bertahan di tiap desa

    const first=this.menuTour[0];
    this.menuCenter.set(first.x,first.y,first.z);
    Player.pos.set(first.x,first.y-1.4,first.z);
    if(Player.mesh)Player.mesh.visible=false;

    Weather.time=0.35;Weather.day=1;
    Cam.targetZoom=8.2;Cam.zoom=8.2;Cam.applyZoom();
    this.setMenuFade(0);
    this.menuLoadChunks();
    /* musik main menu (mulai pada gestur pengguna pertama bila autoplay ditolak) */
    if(typeof Music!=='undefined'&&Music.playMenu)Music.playMenu();
  },

  /* kumpulkan beberapa posisi desa untuk tur panorama (cari yang ada desanya) */
  buildVillageTour(){
    const tour=[],seen={};
    for(let i=0;i<60&&tour.length<6;i++){
      const gx=Math.floor(Math.random()*7)-3;
      const gz=Math.floor(Math.random()*7)-3;
      const key=gx+','+gz;
      if(seen[key])continue;
      const v=(typeof WGEN.villageInCell==='function')?WGEN.villageInCell(gx,gz):null;
      if(!v)continue;
      seen[key]=true;
      tour.push({x:v.x+0.5,y:CFG.SEA+1.4,z:v.z+0.5});
    }
    if(!tour.length){                       // fallback bila tak ada desa
      const sp=this.findSpawn();
      tour.push({x:sp.x+0.5,y:sp.y+1.4,z:sp.z+0.5});
    }
    return tour;
  },

  /* pre-load chunk di sekitar menuCenter agar panorama tidak bolong */
  menuLoadChunks(){
    const pcx=Math.floor(this.menuCenter.x/16),pcz=Math.floor(this.menuCenter.z/16);
    for(let dz=-CFG.VIEW_R-1;dz<=CFG.VIEW_R+1;dz++)
      for(let dx=-CFG.VIEW_R-1;dx<=CFG.VIEW_R+1;dx++)
        World.getChunk(pcx+dx,pcz+dz);
  },

  /* true bila semua chunk dalam radius render sudah berupa mesh (siap fade-in) */
  menuAreaReady(){
    if(typeof World==='undefined'||!World.loadList||!World.loadList.length)return false;
    const R=CFG.VIEW_R;
    for(const e of World.loadList){
      if(e.d>R*R)break;
      const c=World.chunks.get(World.key(e.cx,e.cz));
      if(!c||!c.group)return false;
    }
    return true;
  },

  setMenuFade(o){
    const el=document.getElementById('menu-fade');
    if(el)el.style.opacity=o;
  },

  updateMenu(dt){
    /* kamera mengorbit pelan secara OTOMATIS (input pengguna tidak dipakai) */
    Cam.yaw+=dt*0.045;
    this.menuTourUpdate(dt);
    try{
      World.update(dt,this.menuCenter);
      Weather.update(dt);
      FX.update(dt);
      Cam.update(dt,this.menuCenter);
    }catch(e){}
  },

  /* mesin-state tur panorama: hold di desa -> fade out -> pindah -> tunggu chunk
     termuat -> fade in -> hold di desa baru, dst. */
  menuTourUpdate(dt){
    const T=this.menuTour;
    if(!T||!T.length)return;
    const st=this.menuTourState;
    st.t+=dt;
    if(st.phase==='hold'){
      if(st.t>=this.menuHoldMax&&T.length>1){
        st.phase='fadeOut';st.t=0;
        this.setMenuFade(1);                  // pudarkan layar jadi gelap
      }
    }else if(st.phase==='fadeOut'){
      if(st.t>=0.7){                          // layar sudah gelap -> pindah desa
        st.idx=(st.idx+1)%T.length;
        const v=T[st.idx];
        this.menuCenter.set(v.x,v.y,v.z);
        Player.pos.set(v.x,v.y-1.4,v.z);
        this.menuLoadChunks();
        st.phase='load';st.t=0;
      }
    }else if(st.phase==='load'){
      /* tunggu chunk desa baru selesai di-mesh (maks 3 dtk) baru fade in */
      if(this.menuAreaReady()||st.t>=3){
        st.phase='fadeIn';st.t=0;
        this.setMenuFade(0);
      }
    }else if(st.phase==='fadeIn'){
      if(st.t>=0.7){st.phase='hold';st.t=0;}
    }
  },

  /* ---------- mulai game ---------- */
  begin(save,slot){
    this.menuMode=false;
    document.body.classList.remove('in-menu');
    this.setMenuFade(0);                       // jangan sampai layar hitam terbawa ke game
    if(Player.mesh)Player.mesh.visible=true;

    if(slot)RPG.slot=slot;
    else if(save&&save.slot)RPG.slot=save.slot;

    document.getElementById('start').classList.add('hidden');
    document.getElementById('loading').style.display='flex';
    this.loadingDone=false;

    if(save){
      this.seed=save.seed;
    }else{
      this.seed=(Math.random()*1e9)|0;
    }
    WGEN.init(this.seed);
    this.clearWorldMeshes();

    /* spawn */
    const sp=this.findSpawn();
    Player.spawnP.set(sp.x+0.5,sp.y,sp.z+0.5);
    Player.pos.copy(Player.spawnP);

    if(save){
      Player.hp=save.hp;Player.hunger=save.hunger;
      Player.level=save.level;Player.xp=save.xp;Player.kills=save.kills||0;
      RPG.sp=save.sp||0;RPG.skills=save.skills||{};
      RPG.coin=save.coin||0;
      RPG.bagTier=clamp(save.bagTier||0,0,RPG.BAG_MAX_TIER);
      RPG.hotbar=save.hotbar||new Array(7).fill(null);
      RPG.bag=save.bag||new Array(RPG.BAG_BASE).fill(null);
      while(RPG.bag.length<RPG.bagMax())RPG.bag.push(null);

      const savedEq=save.equip||{};
      RPG.equip={helm:savedEq.helm||null,chest:savedEq.chest||null,boots:savedEq.boots||null};
      if(savedEq.weapon)RPG.addItem(savedEq.weapon,1);

      Weather.time=save.time||0.32;Weather.day=save.day||1;
      if(save.pos)Player.pos.set(save.pos[0],save.pos[1],save.pos[2]);
      if(save.team&&NPCS.restoreTeam)NPCS.restoreTeam(save.team);
    }else{
      RPG.addItem('bread',2);
      RPG.addItem(RPG.START_WEAPON,1);
    }

    /* proficiency: muat dari save, atau reset untuk permainan baru */
    if(typeof Prof!=='undefined')Prof.load(save?save.prof:null);

    Player.refreshArmor();

    /* pre-generate data sekitar spawn */
    const pcx=Math.floor(Player.pos.x/16),pcz=Math.floor(Player.pos.z/16);
    for(let dz=-CFG.VIEW_R;dz<=CFG.VIEW_R;dz++)
      for(let dx=-CFG.VIEW_R;dx<=CFG.VIEW_R;dx++)
        World.getChunk(pcx+dx,pcz+dz);

    UI.renderHotbar();
    RPG.renderCoin();

    if(typeof Farming!=='undefined'){
      if(save)Farming.load();else Farming.clear();
    }

    this.started=true;

    /* simpan slot saat game dimulai (menandai slot terpakai) */
    RPG.save();

    /* tutorial hanya muncul sekali untuk game baru, bukan load */
    if(!save&&typeof Tutorial!=='undefined')Tutorial.show();

    if(!this._saveInterval){
      this._saveInterval=setInterval(()=>{if(!Player.dead)RPG.save();},8000);
    }
    if(!this._beforeUnload){
      this._beforeUnload=true;
      window.addEventListener('beforeunload',()=>RPG.save());
    }
    Sfx.init();
    /* musik latar: mulai pelan-pelan sesudah gestur pengguna (klik mulai) */
    Music.start();
  },

  loop(){
    requestAnimationFrame(this.loop);
    const dt=clamp(this.clock.getDelta(),0,0.05);

    /* main menu panorama */
    if(this.menuMode){
      this.updateMenu(dt);
      this.renderer.render(this.scene,Cam.cam);
      return;
    }

    if(!this.started){this.renderer.render(this.scene,Cam.cam);return;}

    /* konsumsi input sekali; Chat.active = pemain sedang mengetik di chat,
       semua aksi karakter ditahan dulu */
    const chatActive=(typeof Chat!=='undefined')&&Chat.active;
    const studioActive=(typeof UIStudio!=='undefined')&&UIStudio.active;
    if(!UI.open&&!chatActive&&!studioActive&&!Player.dead){
      if(Input.jumpQ)Player.tryJump();
      if(Input.attackQ&&!(typeof Furni!=='undefined'&&Furni.placing))Player.tryAttack();
      if(Input.dodgeQ&&!Furni.placing)Player.tryDodge();
    }
    Input.jumpQ=false;Input.attackQ=false;Input.dodgeQ=false;

    try{
      RPG.updateActive(dt);
      if(typeof SlamAim!=='undefined')SlamAim.update(dt);
      Player.update(dt);
      Monsters.update(dt);
      NPCS.update(dt);
      if(typeof RareNPC!=='undefined')RareNPC.update(dt);
      if(typeof FishSys!=='undefined')FishSys.update(dt);
      if(typeof PortFX!=='undefined')PortFX.update(dt);
      Furni.update(dt);
      Dungeon.update(dt);
      if(UI.hudExtra)UI.hudExtra(dt);
      World.update(dt,Player.pos);
      FX.update(dt);
      Weather.update(dt);
      this.camTarget.set(Player.pos.x,Player.pos.y+1.3,Player.pos.z);
      Cam.update(dt,this.camTarget);
      UI.updateHUD();
    }catch(err){
      if(!this._errShown){this._errShown=true;
        console.error('[Game loop error]',err);
        if(typeof UI!=='undefined'&&UI.toast)UI.toast('⚠️ Error: '+(err&&err.message||err));
      }
    }

    if(!this.loadingDone&&World.loadList.length){
      const c=World.getChunk(World.loadList[0].cx,World.loadList[0].cz);
      if(c.group){this.loadingDone=true;
        document.getElementById('loading').style.display='none';
        UI.toast('🌲 Selamat datang di hutan! Waspadai malam...');
      }
    }
    this.renderer.render(this.scene,Cam.cam);
  },
};

/* =============================================================================
   MAIN MENU — FORECRAFT
   -----------------------------------------------------------------------------
   - Judul FORECRAFT
   - Load Game: 5 slot
   - New Game: pilih slot, overwrite konfirmasi
   - Background: panorama dunia in-game tanpa pemain
   ============================================================================= */
const MainMenu={
  el:null,

  init(){
    this.el=document.getElementById('start');
    if(!this.el)return;
    this.showMain();
  },

  fmtTime(t){
    const mins=Math.floor((t||0.32)*1440);
    const hh=String(Math.floor(mins/60)).padStart(2,'0');
    const mm=String(mins%60).padStart(2,'0');
    return hh+':'+mm;
  },

  slotHtml(i,mode){
    const info=RPG.slotInfo(i);
    const occupied=!!info;
    let desc='Slot kosong';
    if(occupied){
      desc=`Lv ${info.level||1} · Hari ${info.day||1} · ${this.fmtTime(info.time)}`;
    }
    const dis=(mode==='load'&&!occupied)?'disabled':'';
    return `<button class="slot-btn ${occupied?'':'empty'}" data-slot="${i}" ${dis}>
      <span class="s-title">Slot ${i}</span>
      <span class="s-info">${desc}</span>
    </button>`;
  },

  showMain(){
    this.el.classList.remove('hidden');
    this.el.innerHTML=`
      <div class="menu-wrap">
        <h1 class="menu-title">FORECRAFT</h1>
        <div class="menu-sub">Voxel Survival</div>
        <div class="menu-btns">
          <button id="mm-load" class="big">📂 Load Game</button>
          <button id="mm-new" class="big">🌱 New Game</button>
          <button id="mm-music" class="big mm-music">🎵 Musik</button>
        </div>
      </div>`;
    this.el.querySelector('#mm-load').addEventListener('click',()=>this.showLoad());
    this.el.querySelector('#mm-new').addEventListener('click',()=>this.showNew());
    this.el.querySelector('#mm-music').addEventListener('click',()=>this.showMusic());
  },

  /* ---------- pengaturan musik (di main menu) ---------- */
  showMusic(){
    this.el.innerHTML=`
      <div class="menu-wrap">
        <h2 class="menu-head">🎵 Musik</h2>
        <div class="mus-box">
          <div class="mus-row"><span>Putar musik</span><button id="mm-mus-tg" class="mus-tg"></button></div>
          <div class="mus-row"><span>Volume</span><input id="mm-mus-vol" type="range" min="0" max="100" step="1"></div>
          <p class="tip">Perubahan disimpan otomatis.</p>
        </div>
        <button class="big mm-back">← Kembali</button>
      </div>`;
    this.el.querySelector('.mm-back').addEventListener('click',()=>this.showMain());
    const tg=this.el.querySelector('#mm-mus-tg');
    const vol=this.el.querySelector('#mm-mus-vol');
    const sync=()=>{
      tg.textContent=Music.on?'ON':'OFF';
      tg.classList.toggle('on',Music.on);
      vol.value=Math.round(Music.vol*100);
    };
    tg.addEventListener('click',()=>{Music.toggle();sync();});
    vol.addEventListener('input',()=>Music.setVol((+vol.value)/100));
    sync();
  },

  showLoad(){
    let slots='';
    for(let i=1;i<=RPG.SLOT_MAX;i++)slots+=this.slotHtml(i,'load');
    this.el.innerHTML=`
      <div class="menu-wrap">
        <h2 class="menu-head">📂 Load Game</h2>
        <div class="slot-list">${slots}</div>
        <button class="big mm-back">← Kembali</button>
      </div>`;
    this.el.querySelector('.mm-back').addEventListener('click',()=>this.showMain());
    this.el.querySelectorAll('.slot-btn').forEach(b=>{
      b.addEventListener('click',()=>{
        const i=+b.dataset.slot;
        const save=RPG.loadSlot(i);
        if(save)Game.begin(save,i);
      });
    });
  },

  showNew(){
    let slots='';
    for(let i=1;i<=RPG.SLOT_MAX;i++)slots+=this.slotHtml(i,'new');
    this.el.innerHTML=`
      <div class="menu-wrap">
        <h2 class="menu-head">🌱 New Game — pilih slot</h2>
        <div class="slot-list">${slots}</div>
        <button class="big mm-back">← Kembali</button>
      </div>`;
    this.el.querySelector('.mm-back').addEventListener('click',()=>this.showMain());
    this.el.querySelectorAll('.slot-btn').forEach(b=>{
      b.addEventListener('click',()=>{
        const i=+b.dataset.slot;
        if(RPG.hasSlot(i)){
          this.confirm(
            `Slot ${i} sudah berisi data.<br>Overwrite save lama?`,
            ()=>this.startNew(i)
          );
        }else{
          this.startNew(i);
        }
      });
    });
  },

  startNew(i){
    RPG.slot=i;
    RPG.clearSlot(i);
    /* Cutscene intro "Mimpi yang Terbakar": diputar SEKALI (disimpan di
       localStorage) saat New Game pertama; New Game berikutnya langsung mulai. */
    if(typeof CutsceneIntro!=='undefined'&&!CutsceneIntro.done()){
      CutsceneIntro.play(()=>Game.begin(null,i));
    }else{
      Game.begin(null,i);
    }
  },

  confirm(msg,onOk){
    const ov=document.createElement('div');
    ov.className='mm-confirm';
    ov.innerHTML=`
      <div class="mm-confirm-box">
        <div class="mm-msg">${msg}</div>
        <div class="mm-btns">
          <button class="big mm-yes">✔ Ya</button>
          <button class="big mm-no">✖ Batal</button>
        </div>
      </div>`;
    this.el.appendChild(ov);
    ov.querySelector('.mm-no').addEventListener('click',()=>ov.remove());
    ov.querySelector('.mm-yes').addEventListener('click',()=>{ov.remove();onOk();});
  },
};

/* =============================================================================
   TUTORIAL — muncul SEKALI saat pertama kali New Game
   ============================================================================= */
const Tutorial={
  KEY:'forecraft_tutorial_v1',

  done(){
    try{return localStorage.getItem(this.KEY)==='1';}catch(e){return true;}
  },

  markDone(){
    try{localStorage.setItem(this.KEY,'1');}catch(e){}
  },

  show(){
    if(this.done())return;
    if(document.getElementById('tutorial-ov'))return;
    const ov=document.createElement('div');
    ov.id='tutorial-ov';
    ov.innerHTML=`
      <div class="tutorial-box">
        <h2>📖 PANDUAN DASAR</h2>
        <ul>
          <li>🕹️ Bergerak: WASD / joystick (mobile).</li>
          <li>⚔️ Klik / tombol serang: menyerang, makan saat memegang makanan, mencangkul, menanam, memanen.</li>
          <li>🎒 B: tas · K: skill · C: crafting.</li>
          <li>🌾 Cangkul rumput menjadi ladang, lalu tanam benih.</li>
          <li>🧑 Dekati penduduk lalu tekan G / tombol 🤝 untuk bicara atau rekrut.</li>
          <li>🌙 Malam berbahaya — siapkan makanan dan senjata.</li>
        </ul>
        <button id="tutorial-ok">✔ Mengerti</button>
      </div>`;
    document.body.appendChild(ov);
    ov.querySelector('#tutorial-ok').addEventListener('click',()=>{
      this.markDone();
      ov.remove();
    });
  },
};

/* =============================================================================
   INTRO CUTSCENE — kisah "Mimpi yang Terbakar"
   -----------------------------------------------------------------------------
   Diputar SEKALI saja saat pertama kali New Game (flag di localStorage).
   Cutscene dimuat dari Cutscene/Page 1 - Lost Memory.html dalam iframe
   fullscreen dengan mode "?embed=1" (autoplay tanpa layar mulai). Saat selesai
   atau dilewati, cutscene mengirim postMessage {type:'forecraft-cutscene'}
   dan game langsung dimulai. Tombol "Lewati" bawaan cutscene mengakhiri
   seketika (fade out -> mulai game).
   ============================================================================= */
const CutsceneIntro={
  KEY:'forecraft_cutscene_v1',
  SRC:'Cutscene/Page 1 - Lost Memory.html?embed=1',
  active:false,

  done(){
    try{return localStorage.getItem(this.KEY)==='1';}catch(e){return true;}
  },
  markDone(){
    try{localStorage.setItem(this.KEY,'1');}catch(e){}
  },

  play(onDone){
    if(this.active)return;
    this.active=true;
    this.markDone();                    // dihitung sudah dilihat walau dilewati

    /* pause musik main menu supaya tidak bertumpuk dengan audio cutscene;
       musik dalam game akan dimulai oleh Game.begin() -> Music.start() */
    if(typeof Music!=='undefined'&&Music.el){try{Music.el.pause();}catch(e){}}

    const ov=document.createElement('div');
    ov.id='cutscene-ov';
    ov.style.cssText='position:fixed;inset:0;z-index:9999;background:#000;';
    const fr=document.createElement('iframe');
    fr.src=this.SRC;
    fr.setAttribute('allow','autoplay; fullscreen');
    fr.style.cssText='display:block;width:100%;height:100%;border:0;';
    ov.appendChild(fr);
    document.body.appendChild(ov);

    let finished=false,guard=null;
    const finish=()=>{
      if(finished)return;
      finished=true;
      window.removeEventListener('message',onMsg);
      if(guard)clearTimeout(guard);
      ov.remove();                      // buang iframe -> WebGL loop cutscene berhenti
      this.active=false;
      if(onDone)onDone();
    };
    const onMsg=(e)=>{
      if(e&&e.data&&e.data.type==='forecraft-cutscene')finish();
    };
    window.addEventListener('message',onMsg);
    /* jaring pengaman: bila file cutscene hilang / gagal mengirim sinyal,
       game tetap bisa dimulai (maksimal menunggu 2 menit) */
    guard=setTimeout(finish,120000);
  },
};

window.addEventListener('load',()=>Game.init());
