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

  /* ---------- main menu background ---------- */
  startMenuBackground(){
    this.menuMode=true;
    this.started=false;
    document.body.classList.add('in-menu');

    /* dunia acak untuk panorama */
    this.seed=(Math.random()*1e9)|0;
    WGEN.init(this.seed);
    this.clearWorldMeshes();

    const sp=this.findSpawn();
    this.menuCenter.set(sp.x+0.5,sp.y+1.4,sp.z+0.5);
    Player.pos.set(sp.x+0.5,sp.y,sp.z+0.5);
    if(Player.mesh)Player.mesh.visible=false;

    Weather.time=0.35;Weather.day=1;
    Cam.targetZoom=8.2;Cam.zoom=8.2;Cam.applyZoom();

    const pcx=Math.floor(this.menuCenter.x/16),pcz=Math.floor(this.menuCenter.z/16);
    for(let dz=-CFG.VIEW_R-1;dz<=CFG.VIEW_R+1;dz++)
      for(let dx=-CFG.VIEW_R-1;dx<=CFG.VIEW_R+1;dx++)
        World.getChunk(pcx+dx,pcz+dz);
  },

  updateMenu(dt){
    /* panorama perlahan: kamera mengorbit tanpa pemain */
    Cam.yaw+=dt*0.045;
    try{
      World.update(dt,this.menuCenter);
      Weather.update(dt);
      FX.update(dt);
      Cam.update(dt,this.menuCenter);
    }catch(e){}
  },

  /* ---------- mulai game ---------- */
  begin(save,slot){
    this.menuMode=false;
    document.body.classList.remove('in-menu');
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
      RPG.updateActive(dt);Player.update(dt);
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
        </div>
      </div>`;
    this.el.querySelector('#mm-load').addEventListener('click',()=>this.showLoad());
    this.el.querySelector('#mm-new').addEventListener('click',()=>this.showNew());
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
    Game.begin(null,i);
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

window.addEventListener('load',()=>Game.init());
