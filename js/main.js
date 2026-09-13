'use strict';
/* Bootstrap & game loop */
const Game={
  seed:1,scene:null,renderer:null,clock:null,
  started:false,loadingDone:false,menuMode:false,
  camTarget:new THREE.Vector3(),menuCenter:new THREE.Vector3(),

  /* ---------- PERF: FPS meter + RESOLUSI DINAMIS (PC saja) ---------- */
  perf:{scale:1,ema:60,acc:0,cool:0,hudOn:false,showT:0},
  initPerf(){
    if(typeof document==='undefined'||!document.body)return;
    let hud=document.getElementById('fps-hud');
    if(!hud){
      hud=document.createElement('div');
      hud.id='fps-hud';
      document.body.appendChild(hud);
    }
    window.addEventListener('keydown',e=>{
      if(e.code==='F3'){
        e.preventDefault();
        this.perf.hudOn=!this.perf.hudOn;
        hud.style.display=this.perf.hudOn?'block':'none';
      }
    });
  },
  applyPerfRatio(){
    if(typeof IS_MOBILE!=='undefined'&&IS_MOBILE)return;
    if(!this.renderer)return;
    const gp=(typeof Gfx!=='undefined'&&Gfx.preset)?Gfx.preset():null;
    const base=gp?gp.pixelRatio:2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,base*this.perf.scale));
  },
  perfTick(dt){
    if(typeof IS_MOBILE!=='undefined'&&IS_MOBILE)return;
    const P=this.perf;if(!P)return;
    P.ema+=((1/Math.max(dt,1e-4))-P.ema)*0.05;
    P.acc+=dt;P.cool=Math.max(0,P.cool-dt);
    if(P.acc>=1){
      P.acc=0;
      if(P.cool<=0){
        if(P.ema<42&&P.scale>0.7){
          P.scale=Math.max(0.7,P.scale-0.1);
          this.applyPerfRatio();
          if(document.body)document.body.classList.add('perf-hud');
          P.cool=3;P.showT=2.5;
        }else if(P.ema>57&&P.scale<1){
          P.scale=Math.min(1,P.scale+0.05);
          this.applyPerfRatio();
          if(P.scale>=1&&document.body)document.body.classList.remove('perf-hud');
          P.cool=5;P.showT=2.5;
        }
      }
      if(P.hudOn||P.showT>0){
        if(P.showT>0)P.showT-=1;
        const el=document.getElementById('fps-hud');
        if(el){
          el.style.display='block';
          el.textContent=Math.round(P.ema)+' FPS · Res '+Math.round(P.scale*100)+'%';
        }
      }
    }
  },

  init(){
    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color(0x8fb8de);
    this.scene.fog=new THREE.Fog(0x8fb8de,34,90);
    /* preset grafis aktif (Low/Medium/High/Ultra) — lihat GFX_PRESETS di
       config.js. antialias hanya bisa diset saat renderer dibuat, jadi
       mengubahnya butuh reload; sisanya bisa diganti saat main. */
    const gp=(typeof Gfx!=='undefined'&&Gfx.preset)?Gfx.preset():null;
    this.renderer=new THREE.WebGLRenderer({antialias:gp?gp.antialias:true});
    this.renderer.setSize(window.innerWidth,window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,
      gp?gp.pixelRatio:(IS_MOBILE?1.6:2)));
    this.renderer.shadowMap.enabled=gp?gp.shadow:!IS_MOBILE;
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
    if(typeof Altar!=='undefined')Altar.init(this.scene);
    Dungeon.init();
    SaveGame.init();
    Music.initUI();
    if(typeof Settings!=='undefined')Settings.init();
    Player.buildModel();
    Cam.init();
    Input.init();
    UI.init();
    if(typeof CharView!=='undefined')CharView.init();
    this.scene.add(World.group);

    /* main menu baru + background panorama */
    MainMenu.init();
    this.startMenuBackground();

    this.clock=new THREE.Clock();
    this.initPerf();
    this.loop=this.loop.bind(this);
    requestAnimationFrame(this.loop);
  },

  /* ---------- helper ---------- */
  clearWorldMeshes(){
    for(const[,c]of World.chunks){
      if(c.group)World.disposeGroup(c);
    }
    World.chunks.clear();
    if(typeof World!=='undefined'){
      World.lcx=1e9;World.zcz=1e9;World.loadList=[];
    }
    /* pecahan bongkahan ore jangan tertinggal di scene antar dunia */
    if(typeof OreFX!=='undefined'&&OreFX.clear)OreFX.clear();
  },

  findSpawn(){
    let sx=0,sz=0;
    for(let r=0;r<64;r++){
      let found=false;
      for(let a=0;a<16;a++){
        const ang=a/16*Math.PI*2;
        const x=Math.round(Math.cos(ang)*r),z=Math.round(Math.sin(ang)*r);
        /* pemain harus mulai di daratan yang kering, bukan laut/pantai basah */
        if(!WGEN.isLand(x,z))continue;
        const h=WGEN.height(x,z);
        if(h>=CFG.SEA&&!WGEN.treeAt(x,z,h)){
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

  /* kumpulkan beberapa posisi desa untuk tur panorama (cari yang ada desanya).
     Sejak desa jauh lebih langka (peluang 20% per wilayah biome + jeda minimal
     satu wilayah), sapuan ±3 sel hampir selalu hanya menemukan desa spawn.
     Radius diperlebar ke ±14 sel & jumlah percobaan dinaikkan supaya panorama
     tetap berpindah antar desa yang berbeda. */
  buildVillageTour(){
    const tour=[],seen={};
    const R=14;
    for(let i=0;i<400&&tour.length<6;i++){
      const gx=Math.floor(Math.random()*(R*2+1))-R;
      const gz=Math.floor(Math.random()*(R*2+1))-R;
      const key=gx+','+gz;
      if(seen[key])continue;
      seen[key]=true;
      const v=(typeof WGEN.villageInCell==='function')?WGEN.villageInCell(gx,gz):null;
      if(!v)continue;
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

  /* ---------- kembali ke main menu dari in-game ---------- */
  returnToMenu(){
    if(this.menuMode)return;
    /* simpan data permainan saat ini agar progres pemain aman */
    if(typeof SaveGame!=='undefined'&&SaveGame.now)SaveGame.now();
    else if(typeof RPG!=='undefined'&&RPG.save)RPG.save();

    /* tutup UI / chat / panel aktif */
    if(typeof UI!=='undefined'&&UI.open)UI.toggle(UI.open);
    if(typeof Chat!=='undefined'&&Chat.close)Chat.close();

    const startEl=document.getElementById('start');
    if(startEl)startEl.classList.remove('hidden');

    const loadEl=document.getElementById('loading');
    if(loadEl)loadEl.style.display='none';

    /* bersihkan entitas in-game */
    if(typeof NPCS!=='undefined'&&NPCS.list){
      for(let i=NPCS.list.length-1;i>=0;i--){
        const n=NPCS.list[i];
        if(n&&n.mesh&&n.mesh.parent)n.mesh.parent.remove(n.mesh);
      }
      NPCS.list=[];
    }
    if(typeof Monsters!=='undefined'&&Monsters.list){
      for(let i=Monsters.list.length-1;i>=0;i--){
        const m=Monsters.list[i];
        if(m&&m.mesh&&m.mesh.parent)m.mesh.parent.remove(m.mesh);
      }
      Monsters.list=[];
    }

    if(typeof MainMenu!=='undefined'&&MainMenu.showMain)MainMenu.showMain();
    this.startMenuBackground();
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
    this._loadingStartT=(typeof performance!=='undefined')?performance.now():Date.now();

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
      Player.name=save.name||'Ranger';
      Player.hairStyle=(save.hairStyle!==undefined)?save.hairStyle:4;
      Player.hairColor=(save.hairColor!==undefined)?save.hairColor:0x2c1f14;
      Player.hp=save.hp;Player.hunger=save.hunger;
      Player.level=save.level;Player.xp=save.xp;Player.kills=save.kills||0;
      RPG.sp=save.sp||0;RPG.skills=save.skills||{};
      RPG.coin=save.coin||0;
      RPG.bagTier=clamp(save.bagTier||0,0,RPG.BAG_MAX_TIER);
      RPG.hotbar=save.hotbar||new Array(7).fill(null);
      RPG.bag=save.bag||new Array(RPG.BAG_BASE).fill(null);
      while(RPG.bag.length<RPG.bagMax())RPG.bag.push(null);
      RPG.mobSlots=save.mobSlots||new Array(4).fill(null);
      RPG.deployedPet=(typeof save.deployedPet==='number')?save.deployedPet:-1;

      const savedEq=save.equip||{};
      /* nilai slot bisa string (save lama) atau objek {id,lvl} hasil tempa */
      RPG.equip={helm:savedEq.helm||null,chest:savedEq.chest||null,
        boots:savedEq.boots||null,shield:savedEq.shield||null};
      if(savedEq.weapon)RPG.addItem(savedEq.weapon,1);

      Weather.time=save.time||0.32;Weather.day=save.day||1;
      if(save.pos)Player.pos.set(save.pos[0],save.pos[1],save.pos[2]);
      if(save.team&&NPCS.restoreTeam)NPCS.restoreTeam(save.team);
    }else{
      Player.name=(RPG.customPlayer&&RPG.customPlayer.name)||'Ranger';
      Player.hairStyle=(RPG.customPlayer&&RPG.customPlayer.hairStyle!==undefined)?RPG.customPlayer.hairStyle:4;
      Player.hairColor=(RPG.customPlayer&&RPG.customPlayer.hairColor!==undefined)?RPG.customPlayer.hairColor:0x2c1f14;
      RPG.addItem('bread',2);
      RPG.addItem(RPG.START_WEAPON,1);
      RPG.mobSlots=new Array(4).fill(null);
      RPG.deployedPet=-1;
    }

    /* proficiency: muat dari save, atau reset untuk permainan baru */
    if(typeof Prof!=='undefined')Prof.load(save?save.prof:null);

    Player.setHair(Player.hairStyle,Player.hairColor);
    Player.refreshArmor();

    /* pre-generate data sekitar spawn */
    const pcx=Math.floor(Player.pos.x/16),pcz=Math.floor(Player.pos.z/16);
    for(let dz=-CFG.VIEW_R;dz<=CFG.VIEW_R;dz++)
      for(let dx=-CFG.VIEW_R;dx<=CFG.VIEW_R;dx++)
        World.getChunk(pcx+dx,pcz+dz);

    /* RUMAH MODULAR pemain: tulis ulang bloknya SETELAH chunk dunia dibersihkan
       & di-regenerate di atas. Furni.load() memang sudah menulis blok rumah saat
       halaman dibuka, tapi clearWorldMeshes() di awal begin() membuang seluruh
       data chunk itu — tanpa restore ini, rumah yang dibangun hilang setelah
       keluar-masuk game (record-nya tetap ada, jadi bloknya seolah "hantu":
       tak terlihat & tak bisa disentuh sampai pintu dipindah). */
    if(typeof Furni!=='undefined'&&Furni.restoreHouses)Furni.restoreHouses();

    UI.renderHotbar();
    RPG.renderCoin();

    if(typeof Farming!=='undefined'){
      if(save)Farming.load();else Farming.clear();
    }
    if(typeof Capture!=='undefined')Capture.load(save?save.mobSlots:null,save?save.deployedPet:-1);

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
    this.perfTick(dt);

    /* main menu panorama */
    if(this.menuMode){
      this.updateMenu(dt);
      this.renderer.render(this.scene,Cam.cam);
      return;
    }

    if(!this.started){this.renderer.render(this.scene,Cam.cam);return;}

    /* konsumsi input sekali; Chat.active = pemain sedang mengetik di chat,
       semua aksi karakter ditahan dulu. modalOpen = dialog kecil (buang item,
       nama Log Pass) sedang tampil — aksi karakter juga ditahan supaya klik &
       tombol di dialog tidak bocor ke gameplay.

       PENTING: flag input DIRESET LEBIH DULU, lalu handler dijalankan DI DALAM
       try/catch bersama seluruh update. Dulu urutannya kebalikan (handler di
       luar try, reset sesudahnya), sehingga satu exception di tryAttack membuat
       `attackQ` tetap true → frame berikutnya melempar lagi → update & render
       tidak pernah jalan = GAME BEKU TOTAL, bukan sekadar satu frame gagal.
       Dengan urutan ini, error terburuk hanya membatalkan satu aksi. */
    const chatActive=(typeof Chat!=='undefined')&&Chat.active;
    const studioActive=(typeof UIStudio!=='undefined')&&UIStudio.active;
    const modalActive=(typeof UI!=='undefined')&&UI.modalOpen&&UI.modalOpen();
    const canAct=!UI.open&&!chatActive&&!studioActive&&!modalActive&&!Player.dead;
    const qJump=Input.jumpQ,qAtk=Input.attackQ,qDodge=Input.dodgeQ;
    Input.jumpQ=false;Input.attackQ=false;Input.dodgeQ=false;

    try{
      if(canAct){
        if(qJump)Player.tryJump();
        if(qAtk&&!(typeof Furni!=='undefined'&&Furni.placing))Player.tryAttack();
        if(qDodge&&!Furni.placing)Player.tryDodge();
      }
      RPG.updateActive(dt);
      /* Bidikan Hantam Bumi dibatalkan bila pemain tidak boleh beraksi (panel
         terbuka / chat / mati), supaya lingkaran target tidak tertinggal di
         layar saat sentuhan tidak pernah dilepas. */
      if(typeof SlamAim!=='undefined'){
        if(canAct)SlamAim.update(dt);
        else SlamAim.cancel();
      }
      Player.update(dt);
      Monsters.update(dt);
      NPCS.update(dt);
      if(typeof RareNPC!=='undefined')RareNPC.update(dt);
      if(typeof FishSys!=='undefined')FishSys.update(dt);
      if(typeof PortFX!=='undefined')PortFX.update(dt);
      Furni.update(dt);
      if(typeof Altar!=='undefined')Altar.update(dt);
      Dungeon.update(dt);
      if(UI.hudExtra)UI.hudExtra(dt);
      World.update(dt,Player.pos);
      FX.update(dt);
      Weather.update(dt);
      if(typeof HPBars!=='undefined')HPBars.update(dt);
      if(typeof Capture!=='undefined')Capture.update(dt);
    }catch(err){
      /* Error dicatat SEKALI ke toast (agar tidak membanjiri layar), tapi
         SELALU ke console — tanpa ini, bug yang muncul berulang tiap frame
         diam-diam tersembunyi setelah toast pertama. */
      console.error('[Game loop error]',err);
      if(!this._errShown){this._errShown=true;
        if(typeof UI!=='undefined'&&UI.toast)UI.toast('⚠️ Error: '+(err&&err.message||err));
      }
    }finally{
      /* KAMERA & HUD WAJIB SELALU BERJALAN:
         Ditempatkan di finally agar bila terjadi error sekecil apa pun di entitas/efek,
         kamera DIJAMIN tetap mengikuti pergerakan karakter dan tidak pernah membeku. */
      try{
        if(typeof Cam!=='undefined'&&Cam.cam&&typeof Player!=='undefined'&&Player.pos){
          this.camTarget.set(Player.pos.x,Player.pos.y+1.3,Player.pos.z);
          Cam.update(dt,this.camTarget);
        }
        if(Player.comboVfx)Player.comboVfx.updateShake(dt);
        if(typeof UI!=='undefined'&&UI.updateHUD)UI.updateHUD();
      }catch(camErr){console.error('[Cam/HUD error]',camErr);}
    }

    if(!this.loadingDone){
      const now=(typeof performance!=='undefined')?performance.now():Date.now();
      const elapsed=now-(this._loadingStartT||0);
      let ready=false;
      if(typeof World!=='undefined'&&World.loadList&&World.loadList.length){
        const c=World.chunks.get(World.key(World.loadList[0].cx,World.loadList[0].cz));
        if(c&&c.group)ready=true;
      }
      /* Selesai bila chunk pertama pemain sudah ter-mesh, atau batas aman 3.5 detik
         agar pemain tidak pernah terjebak selamanya di layar loading */
      if(ready||elapsed>3500){
        this.loadingDone=true;
        const lEl=document.getElementById('loading');
        if(lEl)lEl.style.display='none';
        if(typeof UI!=='undefined'&&UI.toast)UI.toast('🌲 Selamat datang di hutan! Waspadai malam...');
      }
    }
    this.renderer.render(this.scene,Cam.cam);
    this.perfTick(dt);
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
      const pName=info.name?`${info.name} · `:'';
      desc=`${pName}Lv ${info.level||1} · Hari ${info.day||1} · ${this.fmtTime(info.time)}`;
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
        <div class="menu-sub">Voxel Survival v${(typeof CFG!=='undefined'&&CFG.VERSION)?CFG.VERSION:'0.2.13'}</div>
        <div class="menu-btns">
          <button id="mm-load" class="big">📂 Load Game</button>
          <button id="mm-new" class="big">🌱 New Game</button>
          <button id="mm-music" class="big mm-music">🎵 Musik</button>
        </div>
      </div>`;
    if(typeof I18N!=='undefined'&&I18N.lang!=='id')I18N.localizeTree(this.el,I18N.lang);
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
    if(typeof I18N!=='undefined'&&I18N.lang!=='id')I18N.localizeTree(this.el,I18N.lang);
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
    if(typeof I18N!=='undefined'&&I18N.lang!=='id')I18N.localizeTree(this.el,I18N.lang);
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
    if(typeof I18N!=='undefined'&&I18N.lang!=='id')I18N.localizeTree(this.el,I18N.lang);
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
    /* Buka UI Kustomisasi Karakter (nama, gaya rambut, warna rambut)
       sebelum masuk ke cutscene */
    CharacterCustomizer.open(i,(customData)=>{
      /* Selalu putar cutscene cerita sebelum masuk ke permainan baru */
      if(typeof CutsceneIntro!=='undefined'){
        CutsceneIntro.play(()=>Game.begin(null,i));
      }else{
        Game.begin(null,i);
      }
    });
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
    if(typeof I18N!=='undefined'&&I18N.lang!=='id')I18N.localizeTree(ov,I18N.lang);
    ov.querySelector('.mm-no').addEventListener('click',()=>ov.remove());
    ov.querySelector('.mm-yes').addEventListener('click',()=>{ov.remove();onOk();});
  },
};

/* =============================================================================
   CHARACTER CUSTOMIZER — UI Kustomisasi Karakter (New Game)
   -----------------------------------------------------------------------------
   Muncul saat New Game sebelum cutscene. Menampilkan FULL BODY model karakter
   utama (ala panel karakter in-game) dengan pratinjau 3D rotasi 360 derajat.
   ============================================================================= */
const CharacterCustomizer={
  HAIR_STYLES:[
    {id:4, name:'Undercut (Default)'},
    {id:1, name:'Cepak'},
    {id:2, name:'Cepak Tinggi'},
    {id:3, name:'Belah Samping'},
    {id:5, name:'Poni Lurus'},
    {id:6, name:'Poni Miring'},
    {id:7, name:'Jambul'},
    {id:8, name:'Spiky'},
    {id:11,name:'Mohawk'},
    {id:14,name:'Gondrong'},
    {id:17,name:'Ekor Kuda'},
    {id:27,name:'Man Bun'},
    {id:0, name:'Plontos'},
  ],
  HAIR_COLORS:[
    {hex:0x2c1f14,css:'#2c1f14',name:'Cokelat Tua'},
    {hex:0x141210,css:'#141210',name:'Hitam Pekat'},
    {hex:0x6e4528,css:'#6e4528',name:'Cokelat Terang'},
    {hex:0xc89842,css:'#c89842',name:'Pirang Emas'},
    {hex:0x8a2416,css:'#8a2416',name:'Merah Tembaga'},
    {hex:0x96a2b0,css:'#96a2b0',name:'Abu Perak'},
    {hex:0x3d7090,css:'#3d7090',name:'Biru Es'},
    {hex:0xe0e8f0,css:'#e0e8f0',name:'Putih Salju'},
  ],

  open(slotIndex,onComplete){
    let curStyleIdx=0;
    let curColorHex=0x2c1f14;

    const ov=document.createElement('div');
    ov.className='char-custom-ov';
    ov.innerHTML=`
      <div class="char-custom-box">
        <h2>KUSTOMISASI KARAKTER</h2>
        <div class="char-custom-sub">Tentukan identitas dan penampilan pahlawanmu.</div>
        <div class="char-custom-body">
          <div class="char-preview-col">
            <canvas class="char-preview-canvas" width="160" height="240"></canvas>
            <div class="char-preview-hint">🖱️ Geser untuk memutar 360°</div>
          </div>
          <div class="char-controls-col">
            <div class="char-field-row">
              <label>NAMA KARAKTER</label>
              <input type="text" class="char-name-input" maxlength="14" placeholder="Ranger" value="Ranger">
            </div>
            <div class="char-field-row">
              <label>GAYA RAMBUT</label>
              <div class="char-hair-nav">
                <button class="char-nav-btn char-hair-prev" type="button">&#9664;</button>
                <div class="char-style-name">Undercut (Default)</div>
                <button class="char-nav-btn char-hair-next" type="button">&#9654;</button>
              </div>
            </div>
            <div class="char-field-row">
              <label>WARNA RAMBUT</label>
              <div class="char-color-swatches"></div>
            </div>
            <div class="char-action-btns">
              <button class="char-btn-start" type="button">&#9658; MULAI PETUALANGAN</button>
              <button class="char-btn-cancel" type="button">&#10006; Batal</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(ov);

    const nameInput=ov.querySelector('.char-name-input');
    nameInput.addEventListener('keydown',e=>e.stopPropagation());
    nameInput.addEventListener('keyup',e=>e.stopPropagation());

    const canvas=ov.querySelector('.char-preview-canvas');
    let renderer=null,animId=null;
    let charMesh=null,charParts=null;
    let isDragging=false,prevX=0;
    let charYaw=Math.PI*0.16; // tampak 3/4 depan awal

    if(typeof THREE!=='undefined'){
      try{
        renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
        renderer.setSize(160,240);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));

        const scene=new THREE.Scene();
        // Kamera ortografik persis seperti CharView di charpanel.js (full body)
        const aspect=160/240;
        const hh=1.15; // tinggi setengah bingkai (-0.15 .. 2.15)
        const cy=0.98; // pusat vertikal badan karakter
        const camera=new THREE.OrthographicCamera(-hh*aspect,hh*aspect,hh,-hh,0.1,50);
        camera.position.set(0,cy,8);
        camera.lookAt(0,cy,0);

        // Pencahayaan netral studio cerah
        scene.add(new THREE.AmbientLight(0xffffff,0.85));
        const dirLight=new THREE.DirectionalLight(0xfff8ea,1.1);
        dirLight.position.set(2.5,4.5,3.5);
        scene.add(dirLight);
        const rimLight=new THREE.DirectionalLight(0x82b4ff,0.45);
        rimLight.position.set(-2.5,2.0,-2.5);
        scene.add(rimLight);

        // Pedestal kecil di bawah kaki
        const ped=new THREE.Mesh(
          new THREE.CylinderGeometry(0.55,0.58,0.04,24),
          new THREE.MeshLambertMaterial({color:0x1a202c})
        );
        ped.position.y=-0.02;
        scene.add(ped);

        // Bangun model Full Body Main Character lewat PlayerModelBuilder
        if(typeof PlayerModelBuilder!=='undefined'){
          charMesh=PlayerModelBuilder.build();
          charParts=PlayerModelBuilder.parts;
          scene.add(charMesh);
        }

        let lastT=performance.now();
        const renderLoop=(time)=>{
          animId=requestAnimationFrame(renderLoop);
          const dt=Math.min(0.05,(time-lastT)*0.001);
          lastT=time;
          if(!isDragging){
            charYaw+=dt*0.45; // rotasi otomatis perlahan saat tidak di-drag
          }
          if(charMesh)charMesh.rotation.y=charYaw;
          renderer.render(scene,camera);
        };
        animId=requestAnimationFrame(renderLoop);
      }catch(e){
        console.warn('3D preview failed in customizer:',e);
      }
    }

    // Interaksi drag memutar karakter 360 derajat
    canvas.addEventListener('pointerdown',e=>{
      isDragging=true;
      prevX=e.clientX;
      try{canvas.setPointerCapture(e.pointerId);}catch(err){}
    });
    window.addEventListener('pointermove',e=>{
      if(!isDragging)return;
      const dx=e.clientX-prevX;
      prevX=e.clientX;
      charYaw-=dx*0.022;
    });
    window.addEventListener('pointerup',e=>{
      isDragging=false;
      try{canvas.releasePointerCapture(e.pointerId);}catch(err){}
    });
    window.addEventListener('pointercancel',()=>{isDragging=false;});

    const updateHairPreview=()=>{
      const curStyle=this.HAIR_STYLES[curStyleIdx];
      ov.querySelector('.char-style-name').textContent=curStyle.name;
      if(charParts&&typeof PlayerModelBuilder!=='undefined'){
        PlayerModelBuilder.setHair(curStyle.id,curColorHex,charParts);
      }
    };

    updateHairPreview();

    const swatchesContainer=ov.querySelector('.char-color-swatches');
    this.HAIR_COLORS.forEach((col)=>{
      const sw=document.createElement('button');
      sw.type='button';
      sw.className='char-swatch'+(col.hex===curColorHex?' active':'');
      sw.style.background=col.css;
      sw.title=col.name;
      sw.addEventListener('click',()=>{
        curColorHex=col.hex;
        swatchesContainer.querySelectorAll('.char-swatch').forEach(s=>s.classList.remove('active'));
        sw.classList.add('active');
        updateHairPreview();
      });
      swatchesContainer.appendChild(sw);
    });

    ov.querySelector('.char-hair-prev').addEventListener('click',()=>{
      curStyleIdx=(curStyleIdx-1+this.HAIR_STYLES.length)%this.HAIR_STYLES.length;
      updateHairPreview();
    });
    ov.querySelector('.char-hair-next').addEventListener('click',()=>{
      curStyleIdx=(curStyleIdx+1)%this.HAIR_STYLES.length;
      updateHairPreview();
    });

    const closeOverlay=()=>{
      if(animId)cancelAnimationFrame(animId);
      if(renderer)renderer.dispose();
      if(charMesh){
        charMesh.traverse(o=>{
          if(o.geometry)o.geometry.dispose();
          if(o.material)o.material.dispose();
        });
      }
      ov.remove();
    };

    ov.querySelector('.char-btn-cancel').addEventListener('click',()=>{
      closeOverlay();
      if(typeof MainMenu!=='undefined'&&MainMenu.showNew)MainMenu.showNew();
    });

    ov.querySelector('.char-btn-start').addEventListener('click',()=>{
      const playerName=(nameInput.value.trim()||'Ranger').slice(0,16);
      const chosenStyle=this.HAIR_STYLES[curStyleIdx].id;
      const chosenColor=curColorHex;

      Player.name=playerName;
      Player.hairStyle=chosenStyle;
      Player.hairColor=chosenColor;
      RPG.customPlayer={
        name:playerName,
        hairStyle:chosenStyle,
        hairColor:chosenColor
      };

      closeOverlay();
      if(onComplete)onComplete(RPG.customPlayer);
    });
  }
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
          <li>🎒 B: tas · K: skill · C: crafting · G: party.</li>
          <li>🌾 Cangkul rumput menjadi ladang, lalu tanam benih.</li>
          <li>🧑 Dekati penduduk lalu tekan F / tombol 🤝 untuk bicara atau rekrut.</li>
          <li>🌙 Malam berbahaya — siapkan makanan dan senjata.</li>
        </ul>
        <button id="tutorial-ok">✔ Mengerti</button>
      </div>`;
    document.body.appendChild(ov);
    if(typeof I18N!=='undefined'&&I18N.lang!=='id')I18N.localizeTree(ov,I18N.lang);
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
