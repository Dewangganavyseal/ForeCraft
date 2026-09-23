'use strict';
/* Keyboard + mouse (PC) dan joystick + tombol (mobile) */
const Input={
  keys:{},jumpQ:false,attackQ:false,dodgeQ:false,pointerLocked:false,
  joyX:0,joyY:0,lastShift:0,camDrag:false,lastMX:0,lastMY:0,rmb:false,
  mouseX:undefined,mouseY:undefined,   // posisi kursor ( utk SlamAim PC )

  init(){
    /* ---------- keyboard ---------- */
    window.addEventListener('keydown',e=>{
      if(e.repeat)return;
      const k=e.code;
      if(k==='Escape'&&this.pointerLocked){
        if(document.exitPointerLock)document.exitPointerLock();
      }
      /* Selama chat terbuka SEMUA tombol diserahkan ke kolom chat: karakter
         tidak boleh bergerak/menyerang saat pemain mengetik. Escape menutup
         chat; tombol lain diabaikan di sini (diketik ke input). */
      if(typeof Chat!=='undefined'&&Chat.active){
        if(k==='Escape')Chat.close();
        return;
      }
      /* UI Studio: selama editor aktif, input game dimatikan; U/Escape menutup */
      if(typeof UIStudio!=='undefined'&&UIStudio.active){
        if(k==='Escape'||k==='KeyU')UIStudio.close();
        return;
      }
      if(k==='KeyU'&&typeof UIStudio!=='undefined'){UIStudio.toggle();return;}
      this.keys[k]=true;
      if(UI.open){
        /* Dulu tombol panel lain diabaikan saat sebuah panel terbuka,
           sehingga pemain harus menutup dulu baru membuka yang lain.
           Sekarang tombolnya diteruskan ke UI.toggle: tombol panel yang
           sama menutup, tombol panel lain berpindah ke panel itu. */
        const PANEL_KEY={KeyB:'bag',KeyK:'skills',KeyC:'craft',
                         KeyG:'party',KeyH:'help',KeyP:'char'};
        if(k==='Escape')UI.closeAll();
        else if(PANEL_KEY[k])UI.toggle(PANEL_KEY[k]);
        return;
      }
      /* V: toggle mode bangun voxel */
      if(k==='KeyV'){
        if(typeof BuildSys!=='undefined')BuildSys.toggle();
      }
      if(k==='Escape'&&typeof BuildSys!=='undefined'&&BuildSys.active){
        BuildSys.toggle(false);
        return;
      }
      /* MODE PENEMPATAN: R memutar ghost 90°, Escape membatalkan. Tombol gerak
         tetap aktif supaya pemain bisa berpindah posisi untuk mengarahkan. */
      if(k==='KeyR'){
        if(typeof BuildSys!=='undefined'&&BuildSys.active&&BuildSys.mode==='furniture'){
          BuildSys.rotateFurni();
          return;
        }
        if(typeof Furni!=='undefined'&&Furni.placing){Furni.rotatePlace();return;}
      }
      if(typeof Furni!=='undefined'&&Furni.placing){
        if(k==='Escape'){Furni.cancelPlace();return;}
      }
      /* ATUR PINTU: Q/E (atau ◀ ▶ di bar) melangkah antar posisi pintu yang sah,
         Enter menerapkan, Escape membatalkan. Sengaja memakai tombol yang sama
         fungsinya dengan tombol layar supaya perilakunya identik di PC & mobile. */
      if(typeof Furni!=='undefined'&&Furni.doorEdit){
        if(k==='Escape'){Furni.cancelDoorEdit();return;}
        if(k==='KeyQ'){Furni.stepDoor(-1);return;}
        if(k==='KeyE'){Furni.stepDoor(1);return;}
        if(k==='Enter'){e.preventDefault();Furni.applyDoorEdit();return;}
      }
      /* ENTER: buka / fokus kotak chat di kiri bawah (di bawah bar Lv).
          Chat.open() sendiri menolak saat panel lain terbuka / pemain mati. */
      if(k==='Enter'){
        e.preventDefault();
        if(typeof Chat!=='undefined')Chat.open();
        return;
      }
      if(k==='Space'){this.jumpQ=true;e.preventDefault();}
      if(k==='ShiftLeft'||k==='ShiftRight'){
        const t=performance.now();
        if(t-this.lastShift<280)this.dodgeQ=true;
        this.lastShift=t;
      }
      if(k==='KeyB')UI.toggle('bag');
      if(k==='KeyK')UI.toggle('skills');
      if(k==='KeyC')UI.toggle('craft');
      if(k==='KeyH')UI.toggle('help');
      /* P: panel Karakter (stat detail) — sama dengan mengetuk bingkai potret */
      if(k==='KeyP')UI.toggle('char');
      /* F: tombol interaksi universal — bicara dengan penduduk, memakai
         perabot (duduk/tidur/meja kerja), mengisi altar, atau meletakkan
         perabot dari tangan. (Dulu ini fungsi G.) */
      if(k==='KeyF'){
        if(Action.current())Action.trigger();
      }
      /* G: buka panel PARTY (daftar rekan tim). */
      if(k==='KeyG'){
        UI.toggle('party');
      }

      /* makan kini lewat klik/tombol serang saat memegang makanan */
      /* Q/E/R/T = empat slot skill aktif (urutannya sama dengan tombol di
         HUD). Dipakai di PC; di mobile slot yang sama ditekan lewat tombol.
         Khusus 'slam' (Hantam Bumi): pakai SlamAim supaya bisa DITAHAN untuk
         membidik (ala MOBA) — tekan cepat tetap menghantam di tempat. */
      const si=this.SKILL_KEYS.indexOf(k);
      if(si>=0){
        const sid=(typeof UI!=='undefined'&&UI.activeSlotSkill)?UI.activeSlotSkill(si):null;
        if(sid==='slam'&&typeof SlamAim!=='undefined')SlamAim.press();
        else UI.useActiveSlot(si);
        e.preventDefault();
      }
      if(k.startsWith('Digit')){
        const n=+k.slice(5);
        if(n>=1&&n<=7){
          const idx=n-1;
          /* tekan nomor yang sama lagi = kosongkan tangan */
          RPG.sel=(RPG.sel===idx)?-1:idx;
        }
      }
    });
    window.addEventListener('keyup',e=>{
      this.keys[e.code]=false;
      /* lepas tombol skill 'slam' -> eksekusi bidikan / hantam di tempat */
      const si=this.SKILL_KEYS.indexOf(e.code);
      if(si>=0&&typeof UI!=='undefined'&&UI.activeSlotSkill&&
         UI.activeSlotSkill(si)==='slam'&&typeof SlamAim!=='undefined')SlamAim.release();
    });
    /* ---------- mouse & pointer lock ---------- */
    const cv=()=>Game.renderer&&Game.renderer.domElement;
    const onLockChange=()=>{
      const c=cv();
      this.pointerLocked=!!(document.pointerLockElement&&(document.pointerLockElement===c||document.pointerLockElement===document.body));
    };
    document.addEventListener('pointerlockchange',onLockChange);
    document.addEventListener('mozpointerlockchange',onLockChange);

    window.addEventListener('mousedown',e=>{
      if(!Game.started)return;
      const el=e.target;
      const isUI=!!(el&&el.closest&&el.closest('#modal-ov,#catchbtn,#catch-ui,#actbtn,#mobile,.panel,#team,#hotbar,#toast,#bag-float-menu,#chat,#build-hud'));
      if(isUI||UI.open||(typeof Chat!=='undefined'&&Chat.active)){
        if(this.pointerLocked&&document.exitPointerLock)document.exitPointerLock();
        return;
      }

      /* Kunci pointer/mouse saat klik di layar khusus mode TPP (zoom dekat) */
      if(!IS_MOBILE&&!this.pointerLocked&&(typeof Cam!=='undefined'&&Cam.tppEnabled&&Cam.zoom<4.8&&Cam.tppWeight>0.2)){
        const c=cv();
        if(c&&c.requestPointerLock){
          try{c.requestPointerLock();}catch(err){}
        }
      }

      if(e.button===0){
        /* saat mode bangun aktif, mulai seleksi pasang / drag blok */
        if(typeof BuildSys!=='undefined'&&BuildSys.active){
          const isBuildUI=!!(el&&el.closest&&el.closest('#build-hud,#modal-ov,#mobile,.panel,#team,#hotbar,#toast,#actbtn,#bag-float-menu'));
          if(!isBuildUI){
            BuildSys.onPointerDown(e.clientX,e.clientY);
            return;
          }
        }
        /* saat mode penempatan / atur pintu, klik kiri menunjuk sasaran —
           tapi klik pada elemen UI (bar pasang, hotbar, panel) diabaikan */
        if(typeof Furni!=='undefined'&&(Furni.placing||Furni.doorEdit)){
          const el=e.target;
          if(!(el&&el.closest&&el.closest('#place-bar,#door-bar,#mobile,.panel,#team,#hotbar,#toast,#actbtn'))){
            if(Furni.doorEdit)Furni.pickDoorAt(e.clientX,e.clientY);
            else Furni.moveGhostTo(e.clientX,e.clientY);
          }
        }
        /* saat mencangkul atau menanam benih, klik langsung ke blok */
        else if(typeof Farming!=='undefined'&&Farming.tryClickBlock&&Farming.tryClickBlock(e.clientX,e.clientY)){
          return;
        }
        else this.attackQ=true;
      }
      if(e.button===2){this.rmb=true;this.lastMX=e.clientX;this.lastMY=e.clientY;}
    });
    window.addEventListener('mouseup',e=>{
      if(e.button===2)this.rmb=false;
      if(e.button===0&&typeof BuildSys!=='undefined'&&BuildSys.active&&BuildSys.isDragging){
        BuildSys.onPointerUp(e.clientX,e.clientY);
      }
    });
    window.addEventListener('mousemove',e=>{
      this.mouseX=e.clientX;this.mouseY=e.clientY;   // utk bidikan slam (PC)
      if(typeof BuildSys!=='undefined'&&BuildSys.active&&BuildSys.isDragging){
        BuildSys.onPointerMove(e.clientX,e.clientY);
      }
      if(this.inMenu())return;

      if(this.pointerLocked){
        const dx=e.movementX||e.mozMovementX||e.webkitMovementX||0;
        const dy=e.movementY||e.mozMovementY||e.webkitMovementY||0;
        const sens=0.0032;
        Cam.yaw-=dx*sens;
        /* Gerak mouse ke bawah (dy > 0): elevasi naik -> kamera menunduk melihat tanah.
           Gerak mouse ke atas (dy < 0): elevasi turun -> kamera mendongak ke atas karakter.
           Rentang diperluas agar orbit FPP bebas penuh ke atas/bawah (khusus FPP/TPP, isometrik tak terpengaruh). */
        Cam.tppPitch=clamp((Cam.tppPitch||0)+dy*sens,-1.55,1.22);
      }else if(this.rmb){
        const dx=e.clientX-this.lastMX;
        const dy=e.clientY-this.lastMY;
        Cam.yaw-=dx*0.005;
        Cam.tppPitch=clamp((Cam.tppPitch||0)+dy*0.005,-1.55,1.22);
        this.lastMX=e.clientX;this.lastMY=e.clientY;
      }
    });
    window.addEventListener('wheel',e=>{
      /* Saat panel terbuka, roda mouse dipakai untuk menggulir isi panel —
         jangan ikut mengubah zoom kamera di belakangnya. */
      if(UI.open)return;
      /* main menu: zoom kamera dinonaktifkan (panorama terkunci) */
      if(this.inMenu())return;
      if(e.target&&e.target.closest&&e.target.closest('.panel,#team,#toast,#chat'))return;
      const minZ = (typeof Cam !== 'undefined' && Cam.throneMode) ? 12.0 : ((typeof Cam!=='undefined'&&(Cam.tppEnabled||Cam.fppEnabled))?0.8:5);
      const maxZ = (typeof Cam !== 'undefined' && Cam.throneMode) ? 45.0 : 16;
      Cam.targetZoom=clamp(Cam.targetZoom*(1+e.deltaY*0.0012),minZ,maxZ);
      /* Bila zoom menjauh kembali ke isometrik (zoom >= 4.8), segera lepas lock mouse */
      if(Cam.targetZoom>=4.8&&this.pointerLocked&&document.exitPointerLock){
        try{document.exitPointerLock();}catch(err){}
      }
    },{passive:true});
    window.addEventListener('contextmenu',e=>e.preventDefault());
    if(IS_MOBILE)this.initTouch();
  },

  /* ---------- mobile ---------- */
  initTouch(){
    const zone=document.getElementById('joy-zone');
    const base=document.getElementById('joy-base'),knob=document.getElementById('joy-knob');
    let jid=null,ox=0,oy=0;
    /* KAMERA: hanya dua jari. Satu jari di area dunia tidak lagi memutar
       kamera supaya tidak berputar tanpa sengaja saat pemain menyentuh layar;
       memutar dan zoom sama-sama memakai dua jari (geser = putar, cubit = zoom). */
    const cam={a:null,b:null,dist:0,zoom:0,midX:0};
    const pos={};                       // posisi terakhir tiap jari kamera
    /* sentuhan di joystick, tombol, atau panel tidak boleh memutar/zoom kamera */
    const isWorldTouch=t=>{
      const el=t.target;
      return !(el&&el.closest&&el.closest('#mobile,.panel,#team,#hotbar,#toast'));
    };
    const twoDist=()=>{
      const a=pos[cam.a],b=pos[cam.b];
      return (a&&b)?Math.hypot(a.x-b.x,a.y-b.y):0;
    };
    const twoMidX=()=>{
      const a=pos[cam.a],b=pos[cam.b];
      return (a&&b)?(a.x+b.x)/2:0;
    };

    /* =====================================================================
       ANALOG DINAMIS (gaya MOBA)
       ---------------------------------------------------------------------
       #joy-zone kini area sentuh besar & transparan di kiri bawah. Analog
       tidak lagi terpaku di pojok: ia muncul tepat di bawah jari saat area
       itu disentuh, lalu kembali ke posisi diamnya ketika jari diangkat.
       ===================================================================== */
    const baseR=()=>(base.getBoundingClientRect().width||120)/2;
    /* radius gerak knob mengikuti ukuran ring analog */
    const maxR=()=>Math.max(30,(base.getBoundingClientRect().width||120)*0.36);
    /* Pindahkan ring analog ke titik (cx,cy). Batasnya viewport (bukan zona)
       supaya ring benar-benar mengikuti jari di seluruh area sentuh, tapi
       tetap utuh terlihat di layar. */
    const moveBase=(cx,cy)=>{
      const r=zone.getBoundingClientRect(),br=baseR()+4;
      const sx=clamp(cx,br,Math.max(br,innerWidth-br));
      const sy=clamp(cy,br,Math.max(br,innerHeight-br));
      base.style.left=(sx-r.left)+'px';base.style.top=(sy-r.top)+'px';
      ox=sx;oy=sy;
    };
    /* posisi diam: dekat pojok kiri bawah zona, tetap nyaman untuk jempol */
    const homeBase=()=>{
      const r=zone.getBoundingClientRect(),br=baseR();
      moveBase(r.left+br+10,r.bottom-br-10);
    };
    homeBase();
    window.addEventListener('resize',()=>{if(jid===null)homeBase();});
    window.addEventListener('orientationchange',()=>setTimeout(homeBase,220));

    zone.addEventListener('touchstart',e=>{
      e.preventDefault();
      const t=e.changedTouches[0];jid=t.identifier;
      zone.classList.add('active');
      /* ring analog melompat ke posisi jari, knob langsung netral di tengah */
      moveBase(t.clientX,t.clientY);
      applyJoy(t.clientX,t.clientY);
    },{passive:false});

    const applyJoy=(cx,cy)=>{
      const max=maxR();
      let dx=cx-ox,dy=cy-oy;
      const d=Math.hypot(dx,dy);
      if(d>max){dx=dx/d*max;dy=dy/d*max;}
      knob.style.transform=`translate(${dx}px,${dy}px)`;
      this.joyX=dx/max;this.joyY=-dy/max;
      /* tandai sprint saat stick hampir penuh */
      if(Math.hypot(this.joyX,this.joyY)>0.95)knob.classList.add('sprint');
      else knob.classList.remove('sprint');
    };

    window.addEventListener('touchmove',e=>{
      if(typeof BuildSys!=='undefined'&&BuildSys.active&&BuildSys.isDragging){
        for(const t of e.changedTouches){
          BuildSys.onPointerMove(t.clientX,t.clientY);
        }
        if(e.cancelable)e.preventDefault();
        return;
      }
      for(const t of e.changedTouches){
        if(t.identifier===jid)applyJoy(t.clientX,t.clientY);
        if(pos[t.identifier])pos[t.identifier]={x:t.clientX,y:t.clientY};
      }
      /* DUA JARI: geser mendatar = putar kamera, cubit = zoom in/out.
         Dinonaktifkan di main menu (panorama terkunci). */
      if(cam.b!==null&&!this.inMenu()){
        const d=twoDist(),mx=twoMidX();
        if(d>10&&cam.dist>10){
          const minZ = (typeof Cam !== 'undefined' && Cam.throneMode) ? 12.0 : ((typeof Cam!=='undefined'&&(Cam.tppEnabled||Cam.fppEnabled))?0.8:5);
          const maxZ = (typeof Cam !== 'undefined' && Cam.throneMode) ? 45.0 : 16;
          Cam.targetZoom=clamp(cam.zoom*cam.dist/d,minZ,maxZ);
        }
        if(cam.midX)Cam.yaw-=(mx-cam.midX)*0.010;
        cam.midX=mx;
        if(e.cancelable)e.preventDefault();
      }
    },{passive:false});
    const end=e=>{
      if(typeof BuildSys!=='undefined'&&BuildSys.active&&BuildSys.isDragging){
        for(const t of e.changedTouches){
          BuildSys.onPointerUp(t.clientX,t.clientY);
        }
      }
      for(const t of e.changedTouches){
        if(t.identifier===jid){jid=null;this.joyX=0;this.joyY=0;
          zone.classList.remove('active');
          knob.classList.remove('sprint');
          knob.style.transform='';
          homeBase();}                 // analog kembali ke posisi diamnya
        delete pos[t.identifier];
        if(t.identifier===cam.a||t.identifier===cam.b){
          /* jari sisa disimpan, tapi kamera baru bergerak lagi setelah
             jari kedua menyentuh layar (aturan dua jari) */
          cam.a=(t.identifier===cam.a)?cam.b:cam.a;
          cam.b=null;cam.midX=0;
        }
      }
    };
    window.addEventListener('touchend',end);window.addEventListener('touchcancel',end);
    /* daftarkan jari di area dunia; kamera aktif saat jari kedua menyentuh.
       Di main menu pendaftaran kamera dilewati (panorama tidak boleh diputar). */
    window.addEventListener('touchstart',e=>{
      if(this.inMenu())return;
      for(const t of e.changedTouches){
        if(t.identifier===jid||!isWorldTouch(t))continue;
        pos[t.identifier]={x:t.clientX,y:t.clientY};
        if(cam.a===null)cam.a=t.identifier;
        else if(cam.b===null&&t.identifier!==cam.a){
          cam.b=t.identifier;
          cam.dist=twoDist();cam.zoom=Cam.targetZoom;cam.midX=twoMidX();
        }
      }
    },{passive:true});
    /* MODE BANGUN (mobile): sentuhan di area dunia menata/memasang/drag blok */
    window.addEventListener('touchstart',e=>{
      if(typeof BuildSys==='undefined'||!BuildSys.active)return;
      const t=e.changedTouches[0];
      const el=t.target;
      if(el&&el.closest&&el.closest('#build-hud,#modal-ov,#mobile,.panel,#team,#hotbar,#toast,#bag-float-menu,#joy-zone'))return;
      BuildSys.onPointerDown(t.clientX,t.clientY);
    },{passive:true});

    /* MODE PENEMPATAN / ATUR PINTU (mobile): satu ketukan di area dunia
       menunjuk sasaran. Ketukan di UI (bar/tombol/panel) diabaikan.
       Satu ketuk dipilih (bukan seret/gestur) karena di mobile jempol menutupi
       sasaran saat menyeret, dan gestur multi-jari bentrok dengan putar/zoom
       kamera dua jari. */
    window.addEventListener('touchstart',e=>{
      if(typeof Furni==='undefined')return;
      if(!Furni.placing&&!Furni.doorEdit)return;
      const t=e.changedTouches[0];
      const el=t.target;
      if(el&&el.closest&&el.closest('#place-bar,#door-bar,#mobile,.panel,#team,#hotbar,#toast'))return;
      if(Furni.doorEdit)Furni.pickDoorAt(t.clientX,t.clientY);
      else Furni.moveGhostTo(t.clientX,t.clientY);
    },{passive:true});

    /* MENCANGKUL / MENANAM LANGSUNG KE BLOK (mobile): ketuk langsung blok di layar */
    window.addEventListener('touchstart',e=>{
      if(typeof Game==='undefined'||!Game.started||this.inMenu())return;
      if(typeof BuildSys!=='undefined'&&BuildSys.active)return;
      if(typeof Furni!=='undefined'&&(Furni.placing||Furni.doorEdit))return;
      const t=e.changedTouches[0];
      const el=t.target;
      if(el&&el.closest&&el.closest('#build-hud,#modal-ov,#mobile,.panel,#team,#hotbar,#toast,#bag-float-menu,#joy-zone,#actbtn'))return;
      if(typeof Farming!=='undefined'&&Farming.tryClickBlock&&Farming.tryClickBlock(t.clientX,t.clientY)){
        if(e.cancelable)e.preventDefault();
      }
    },{passive:false});
    const bind=(id,fn)=>{
      const el=document.getElementById(id);
      if(!el)return;
      el.addEventListener('touchstart',e=>{e.preventDefault();el.classList.add('pressed');fn();},{passive:false});
      /* efek tekan (mengecil) dilepas saat jari angkat / batal */
      const unpress=()=>el.classList.remove('pressed');
      el.addEventListener('touchend',unpress);
      el.addEventListener('touchcancel',unpress);
    };
    bind('m-attack',()=>this.attackQ=true);
    bind('m-jump',()=>this.jumpQ=true);
    bind('m-roll',()=>this.dodgeQ=true);
    /* 💬 buka chat (versi mobile dari tombol ENTER di PC) */
    bind('m-chat',()=>{if(typeof Chat!=='undefined')Chat.open();});
    bind('m-bag',()=>UI.toggle('bag'));
    bind('m-craft',()=>UI.toggle('craft'));
    bind('m-skill',()=>UI.toggle('skills'));
    bind('m-party',()=>UI.toggle('party'));
    bind('m-build',()=>{if(typeof BuildSys!=='undefined')BuildSys.toggle();});
    /* tombol 🤝: interaksi kontekstual (bicara / perabot / mengisi altar /
       meletakkan). Membuka panel Party dilakukan lewat tombol/ikon terpisah. */
    bind('m-talk',()=>{
      if(Action.current())Action.trigger();
      else UI.toggle('party');
    });
  },

  /* ---------- query ---------- */
  moveVec(){
    /* selama mengetik di chat atau UI Studio aktif karakter diam */
    if(typeof Chat!=='undefined'&&Chat.active)return{x:0,z:0};
    if(typeof UIStudio!=='undefined'&&UIStudio.active)return{x:0,z:0};
    let ix=(this.keys.KeyD||this.keys.ArrowRight&&!this.keys.ShiftLeft?1:0)-(this.keys.KeyA?1:0);
    let iz=(this.keys.KeyW?1:0)-(this.keys.KeyS?1:0);
    ix+=this.joyX;iz+=this.joyY;
    const l=Math.hypot(ix,iz);if(l>1){ix/=l;iz/=l;}
    const yaw=Cam.yaw;
    return {
      x:-Math.sin(yaw)*iz+Math.cos(yaw)*ix,
      z:-Math.cos(yaw)*iz-Math.sin(yaw)*ix,
    };
  },
  sprintHeld(){return !!(this.keys.ShiftLeft||this.keys.ShiftRight)||
    (Math.hypot(this.joyX,this.joyY)>0.95);},
  /* Q/E/R/T dipakai untuk skill aktif, jadi rotasi kamera memakai panah
     kiri/kanan (atau klik-kanan seret / dua jari di mobile). */
  SKILL_KEYS:['KeyQ','KeyE','KeyR','KeyT'],
  /* true saat main menu aktif — kamera panorama tidak boleh digerakkan pengguna */
  inMenu(){return typeof Game!=='undefined'&&Game.menuMode;},
  camTurn(){
    let t=0;
    if(this.keys.ArrowLeft)t-=1;
    if(this.keys.ArrowRight)t+=1;
    return t;
  },
  camPitchTurn(){
    let t=0;
    if(this.keys.ArrowUp)t-=1;   // Panah atas: mendongak ke atas
    if(this.keys.ArrowDown)t+=1; // Panah bawah: menunduk ke bawah
    return t;
  },

};
