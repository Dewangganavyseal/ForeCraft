'use strict';
/* =============================================================================
   CHARACTER VIEW — bingkai potret HUD + panel stat lengkap
   File: js/charpanel.js
   -----------------------------------------------------------------------------
   Dua tampilan yang memakai MODEL KARAKTER YANG SAMA dengan yang berjalan di
   dunia (termasuk armor, tameng, dan senjata yang sedang dipakai):

     1. POTRET (#portrait-cv, 128x128) — setengah badan, di kiri atas HUD
        di samping bar HP/stamina. Diketuk → membuka panel Karakter.
     2. PANEL KARAKTER (#char-cv) — full body yang bisa diputar dengan
        geser/drag, plus daftar stat detail di sisi lainnya.

   ARSITEKTUR RENDER (revisi — perbaikan "potret kosong & game macet"):
   Dulu viewport potret & panel masing-masing membuat SATU konteks WebGL
   sendiri — ditambah konteks game utama berarti 3 permukaan GL aktif. Di
   Android WebView hal ini sering membuat konteks potret GAGAL dibuat /
   context-lost (potret kosong permanen) dan membuat kompositor berat
   (game terasa macet, karakter di panel tampak beku).

   Sekarang HANYA SATU konteks GL tambahan pada canvas tersembunyi 256x256:
   karakter dirender ke sana dengan kamera yang sesuai, lalu hasilnya
   DI-BLIT (copyImage 2D) ke #portrait-cv dan #char-cv. Konteks 2D murah,
   tidak kena batas konteks GL, dan hanya satu permukaan GL yang hidup.

   Model TIDAK di-clone: Player.mesh dipindah sesaat ke scene render ini,
   dirender, lalu DIKEMBALIKAN ke parent aslinya di blok `finally` — potret
   selalu mengikuti pose/equipment terbaru tanpa duplikasi mesh. Pemindahan
   terjadi di dalam satu tugas JS yang sama sehingga tidak pernah terlihat
   "karakter hilang" di dunia.

   Throttle: potret 10 fps, panel 15 fps — hemat GPU di ponsel.
   ============================================================================= */
const CharView={
  scene:null,
  gl:null,glCv:null,               // SATU renderer GL tersembunyi (256x256)
  porCam:null,fullCam:null,        // kamera ortografik per tampilan
  yaw:Math.PI*0.18,                // rotasi tampilan full body (drag)
  porYaw:Math.PI*0.16,             // rotasi tetap potret (sedikit menyamping)
  POR_FPS:10,
  PANEL_FPS:15,
  ready:false,
  glFailed:false,

  /* ---------- bingkai tampilan (koordinat dunia model karakter) ----------
     Model dibangun dengan kaki di y=0; puncak rambut ada di y≈1.96.
     POTRET setengah badan (pinggang → atas kepala), PANEL seluruh badan. */
  POR:{y0:0.88,y1:2.06},
  FULL:{y0:-0.12,y1:2.10},

  /* ---------- scene khusus untuk menampilkan karakter ---------- */
  initScene(){
    if(this.scene)return;
    this.scene=new THREE.Scene();
    /* pencahayaan netral supaya warna armor terbaca jelas, tidak ikut
       gelap/terang siklus siang-malam dunia */
    const hemi=new THREE.HemisphereLight(0xdfe9ff,0x3a3f34,0.95);
    this.scene.add(hemi);
    const dir=new THREE.DirectionalLight(0xfff4e0,1.05);
    dir.position.set(2.4,4.2,3.2);
    this.scene.add(dir);
    const rim=new THREE.DirectionalLight(0x9fd7ff,0.4);
    rim.position.set(-3,2,-2.5);
    this.scene.add(rim);
  },

  /* ---------- SATU konteks GL tersembunyi (dibuat malas, sekali) ---------- */
  ensureGL(){
    if(this.gl)return true;
    if(this.glFailed)return false;
    this.glCv=document.createElement('canvas');
    this.glCv.width=256;this.glCv.height=256;
    try{
      this.gl=new THREE.WebGLRenderer({canvas:this.glCv,antialias:false,alpha:true});
    }catch(e){ this.glFailed=true;return false; }
    this.gl.setPixelRatio(1);
    this.gl.setSize(256,256,false);
    if(THREE.sRGBEncoding)this.gl.outputEncoding=THREE.sRGBEncoding;
    /* konteks hilang (perangkat kehabisan memori GPU) → dibuat ulang nanti */
    this.glCv.addEventListener('webglcontextlost',e=>{
      e.preventDefault();this.gl=null;
    });
    return true;
  },

  /* atur bingkai kamera ortografik: rentang y (y0..y1) + rasio canvas */
  frameCam(cam,y0,y1,aspect){
    const hh=(y1-y0)/2,cy=(y1+y0)/2;
    cam.top=hh;cam.bottom=-hh;
    cam.left=-hh*aspect;cam.right=hh*aspect;
    cam.position.set(0,cy,8);
    cam.lookAt(0,cy,0);
    cam.updateProjectionMatrix();
  },

  init(){
    const cv=document.getElementById('portrait-cv');
    const btn=document.getElementById('portrait');
    if(!cv||!btn)return;
    this.initScene();
    this.porCam=new THREE.OrthographicCamera(-1,1,1,-1,0.01,40);
    this.fullCam=new THREE.OrthographicCamera(-1,1,1,-1,0.01,40);
    btn.addEventListener('click',e=>{
      e.preventDefault();
      if(typeof UI!=='undefined')UI.toggle('char');
    });
    this.ready=true;
  },

  /* ---------- pindahkan Player.mesh ke scene render, render, kembalikan ---- */
  renderPose(cam,yaw){
    if(!this.gl||typeof Player==='undefined'||!Player.mesh)return false;
    const mesh=Player.mesh;
    const parent=mesh.parent;
    const px=mesh.position.x,py=mesh.position.y,pz=mesh.position.z;
    const ry=mesh.rotation.y;
    const vis=mesh.visible;
    try{
      this.scene.add(mesh);                 // add() otomatis melepas dari parent lama
      mesh.position.set(0,0,0);
      mesh.rotation.y=yaw;
      mesh.visible=true;
      this.gl.render(this.scene,cam);
      return true;
    }catch(err){
      return false;                         // jangan pernah menjatuhkan game loop
    }finally{
      if(parent)parent.add(mesh);
      mesh.position.set(px,py,pz);
      mesh.rotation.y=ry;
      mesh.visible=vis;
    }
  },

  /* salin hasil render GL ke canvas 2D tujuan */
  blit(cv){
    if(!cv)return;
    const c=cv.getContext('2d');
    if(!c)return;
    c.clearRect(0,0,cv.width,cv.height);
    c.drawImage(this.glCv,0,0,cv.width,cv.height);
  },

  /* ---------- POTRET: dipanggil dari UI.updateHUD (throttle 10 fps) ------- */
  updatePortrait(){
    if(!this.ready||this.glFailed)return;
    if(typeof Game!=='undefined'&&!Game.started)return;
    const now=performance.now();
    if(this._last&&now-this._last<1000/this.POR_FPS)return;
    this._last=now;
    if(!this.ensureGL())return;
    const cv=document.getElementById('portrait-cv');
    if(!cv||!cv.isConnected)return;         // HUD element hilang → jangan render
    this.frameCam(this.porCam,this.POR.y0,this.POR.y1,1);
    if(this.renderPose(this.porCam,this.porYaw))this.blit(cv);
    const lv=document.getElementById('portrait-lv');
    if(lv&&typeof Player!=='undefined')lv.textContent=Player.level;
  },

  /* ---------- PANEL: full body + drag memutar ---------- */
  openPanel(){
    const cv=document.getElementById('char-cv');
    if(!cv)return;
    this.initScene();
    if(!this.ensureGL())return;
    this.initDrag(cv);
    /* render pertama ditunda satu frame (panel baru lepas .hidden →
       clientWidth masih 0 saat toggle) */
    this.renderStats();
    requestAnimationFrame(()=>{
      if(typeof UI!=='undefined'&&UI.open!=='char')return;
      this.sizePanel();
      this.drawFull(true);
    });
  },

  /* samakan resolusi canvas panel dengan kotaknya (mobile dikecilkan) */
  sizePanel(){
    const cv=document.getElementById('char-cv');
    if(!cv)return;
    const w=cv.clientWidth||cv.width,h=cv.clientHeight||cv.height;
    if(!w||!h)return;
    const cap=typeof IS_MOBILE!=='undefined'&&IS_MOBILE?280:380;
    const s=Math.min(1,cap/Math.max(w,h));
    cv.width=Math.max(2,Math.round(w*s));
    cv.height=Math.max(2,Math.round(h*s));
    this._pw=cv.width;this._ph=cv.height;
  },

  drawFull(force){
    if(typeof UI!=='undefined'&&UI.open!=='char')return;
    const cv=document.getElementById('char-cv');
    if(!cv||!cv.isConnected)return;
    const aspect=cv.width/Math.max(1,cv.height);
    this.frameCam(this.fullCam,this.FULL.y0,this.FULL.y1,aspect);
    if(this.renderPose(this.fullCam,this.yaw))this.blit(cv);
  },

  /* dipanggil tiap frame HUD selama panel terbuka (throttle 15 fps):
     model dianimasikan penuh, daftar stat cukup 4x/detik */
  tickPanel(){
    const now=performance.now();
    if(this._panelT&&now-this._panelT<1000/this.PANEL_FPS)return;
    this._panelT=now;
    const cv=document.getElementById('char-cv');
    if(cv&&(!this._pw||Math.abs((cv.clientWidth||0)-(this._pw||0))>2)){
      this.sizePanel();
    }
    this.drawFull();
    if(now-(this._statT||0)>250){
      this._statT=now;
      this.renderStats();
    }
  },

  /* drag horizontal (mouse & sentuh) untuk memutar karakter */
  initDrag(cv){
    if(cv._dragBound)return;                // pasang sekali saja
    cv._dragBound=true;
    let dragging=false,lastX=0;
    const start=x=>{dragging=true;lastX=x;};
    const move=x=>{
      if(!dragging)return;
      this.yaw+=(x-lastX)*0.012;
      lastX=x;
      this.drawFull();
    };
    const end=()=>{dragging=false;};
    cv.addEventListener('mousedown',e=>{e.preventDefault();start(e.clientX);});
    window.addEventListener('mousemove',e=>move(e.clientX));
    window.addEventListener('mouseup',end);
    cv.addEventListener('touchstart',e=>{
      if(e.touches[0])start(e.touches[0].clientX);
    },{passive:true});
    cv.addEventListener('touchmove',e=>{
      if(e.touches[0]){move(e.touches[0].clientX);e.preventDefault();}
    },{passive:false});
    cv.addEventListener('touchend',end,{passive:true});
    window.addEventListener('resize',()=>{
      if(typeof UI!=='undefined'&&UI.open==='char'){this.sizePanel();this.drawFull();}
    });
  },

  /* ---------- DAFTAR STAT DETAIL ---------- */
  pct(v){return Math.round(v*100)+'%';},

  /* satu baris stat */
  row(icon,label,value,cls){
    return `<div class="cs-row${cls?' '+cls:''}">`+
      `<span class="cs-ic">${icon}</span>`+
      `<span class="cs-lb">${label}</span>`+
      `<b class="cs-vl">${value}</b></div>`;
  },
  head(t){return `<div class="cs-head">${t}</div>`;},

  /* ikon item gambar (PNG kustom) untuk baris stat; fallback emoji bila
     itemnya tidak punya PNG di folder buttons/ */
  uiItemIcon(id){
    if(typeof UI!=='undefined'&&UI.itemIcon){
      const html=UI.itemIcon(id);
      if(html&&html.startsWith('<img'))return html;
    }
    return ITEMS[id]?ITEMS[id].e:'';
  },

  /* ikon stat generik: pakai PNG ui_* / eff_* bila tersedia, fallback emoji */
  stIco(emoji, png){
    if(!png)return emoji;
    return `<img class="cs-ico" src="buttons/${png}.png" alt="" onerror="this.outerHTML='${emoji}'">`;
  },

  renderStats(){
    const el=document.getElementById('char-stats');
    if(!el)return;
    const P=Player,R=RPG;
    const w=R.weapon(),wid=R.weaponId();
    const need=CFG.playerXpNeed(P.level);
    let h='';

    /* ---- ringkasan ---- */
    h+=this.head('⭐ Karakter');
    h+=this.row(this.stIco('⭐'),'Level',P.level);
    h+=this.row('📊','XP',Math.floor(P.xp)+' / '+need);
    h+=this.row('💀','Monster dikalahkan',P.kills||0);
    h+=this.row(this.stIco('🪙','ui_coin'),'Koin',R.coin||0);

    /* ---- vital ---- */
    h+=this.head('❤️ Vital');
    h+=this.row(this.stIco('❤️','ui_hp'),'HP',Math.ceil(P.hp)+' / '+P.maxHp());
    h+=this.row(this.stIco('⚡','ui_stam'),'Stamina',Math.ceil(P.stamina)+' / '+P.maxStamina());
    h+=this.row(this.stIco('🍖','ui_hunger'),'Hunger',Math.ceil(P.hunger)+' / 100');
    const rg=R.regenPerSec?R.regenPerSec():0;
    if(rg>0)h+=this.row(this.stIco('💚','eff_regen'),'Regenerasi',rg.toFixed(1)+' HP/detik');

    /* ---- serangan ---- */
    h+=this.head('⚔️ Serangan');
    h+=this.row(wid?this.uiItemIcon(wid):'✊','Senjata',wid?ITEMS[wid].n:'Tangan kosong');
    h+=this.row(this.stIco('⚔️','prof_combat'),'Damage',Math.round(R.weaponDmg()));
    h+=this.row('🌀','Kecepatan serang','×'+R.weaponSpeed().toFixed(2));
    h+=this.row('🎯','Critical',this.pct(R.critChance()));
    h+=this.row('📏','Jangkauan',R.weaponReach().toFixed(1)+' blok');
    const ls=R.lifesteal?R.lifesteal():0;
    if(ls>0)h+=this.row(this.stIco('🩸','eff_bleed'),'Lifesteal',this.pct(ls));
    const th=R.thornsRatio?R.thornsRatio():0;
    if(th>0)h+=this.row(this.stIco('😈','eff_thorns'),'Balasan duri',this.pct(th));

    /* ---- pertahanan & BLOCK ---- */
    h+=this.head('🛡️ Pertahanan');
    h+=this.row(this.stIco('🛡️','prof_blocking'),'Reduksi armor',this.pct(R.defense()));
    const sid=R.equipId('shield');
    h+=this.row(sid?this.uiItemIcon(sid):'🛡️','Tameng',sid?ITEMS[sid].n:'— tidak memakai');
    const bc=R.blockChance?R.blockChance():0;
    const bp=R.blockPower?R.blockPower():0;
    h+=this.row('🎲','Peluang block',this.pct(bc),bc>0?'good':'dim');
    h+=this.row('🧱','Kekuatan block',this.pct(bp),bp>0?'good':'dim');
    if(bc>0){
      /* damage rata-rata yang dihemat block per serangan */
      h+=this.row('📉','Rata-rata damage ditahan',this.pct(bc*bp));
    }
    if(R.blockNoStagger&&R.blockNoStagger())
      h+=this.row('🏯','Benteng Tak Goyah','Aktif — tidak terpental','good');

    /* ---- gerak ---- */
    h+=this.head('🏃 Gerak');
    h+=this.row(this.stIco('🏃','prof_agility'),'Kecepatan gerak','×'+R.speedMult().toFixed(2));
    h+=this.row(this.stIco('⚡','ui_stam'),'Biaya stamina','×'+R.stamCostMult().toFixed(2));
    h+=this.row(this.stIco('💨','eff_swift'),'Dodge cooldown',R.dodgeCD().toFixed(1)+'s');
    if(R.skillVal('djump')>0)h+=this.row(this.stIco('🪽','prof_agility'),'Lompat ganda','Aktif','good');
    if(R.skillVal('swim')>0)h+=this.row('🏊','Perenang','Aktif','good');

    /* ---- equipment ---- */
    h+=this.head('🎽 Perlengkapan');
    const slots=(typeof PLAYER_GEAR_SLOTS!=='undefined')?PLAYER_GEAR_SLOTS:ARMOR_SLOTS;
    for(const s of slots){
      const id=R.equipId(s.id);
      const lv=R.equipLv(s.id);
      const icon=id?this.uiItemIcon(id):s.e;
      const val=id?(ITEMS[id].n+(lv?' Lv'+lv:'')):'—';
      h+=this.row(icon,s.name,val,id?'':'dim');
    }

    /* ---- efek aktif dari equipment ---- */
    const fx=R.gearEffects?R.gearEffects():[];
    if(fx.length){
      h+=this.head('✨ Efek Perlengkapan');
      const seen={};
      for(const f of fx){
        if(seen[f]||!EFFECTS[f])continue;
        seen[f]=1;
        const icon=(typeof UI!=='undefined'&&UI.effectIcon)?UI.effectIcon(f):EFFECTS[f].e;
        h+=this.row(icon,EFFECTS[f].n,EFFECTS[f].desc||'',
          'wrap');
      }
    }

    /* ---- proficiency ---- */
    if(typeof Prof!=='undefined'&&typeof SUBSKILLS!=='undefined'){
      h+=this.head('📈 Proficiency');
      for(const id in SUBSKILLS){
        const s=SUBSKILLS[id],lv=Prof.level(id);
        const icon=(typeof UI!=='undefined'&&UI.profIcon)?UI.profIcon(id):s.icon;
        h+=this.row(icon,s.name,lv>=s.max?'Lv MAX':'Lv '+lv);
      }
    }
    el.innerHTML=h;
    if(typeof I18N!=='undefined'&&I18N.lang!=='id')I18N.localizeTree(el,I18N.lang);
  },
};
window.CharView=CharView;
