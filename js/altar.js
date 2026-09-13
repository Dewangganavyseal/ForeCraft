'use strict';
/* =============================================================================
   ALTAR RITUAL — struktur dunia untuk MEMANGGIL BOSS
   -----------------------------------------------------------------------------
   Diporting & disederhanakan dari "NEW MODEL/Altar.html".

   - Muncul acak di SEMUA biome dengan peluang ~5% per sel wilayah (deterministik
     lewat WGEN.hash), diletakkan di permukaan tanah.
   - Pemain berdiri dekat bagian tengah lalu menekan tombol aksi (G / 🤝) untuk
     membuka UI. Di UI, isi ingredient yang dibutuhkan lalu MULAI RITUAL.
   - Animasi summoning berjalan ~10 detik (kristal menyala, cincin energi naik,
     bola inti membesar, partikel), lalu BOSS muncul di tengah dan altar HANCUR
     (voxel-nya berhamburan + ledakan).

   Modul mandiri: window.Altar. Di-update dari Game.loop, di-hook ke sistem
   Action (furni.js) untuk interaksi, dan punya panel UI sendiri (#panel-altar).
   ============================================================================= */
const Altar={
  scene:null,
  list:[],                 // altar aktif di dunia
  seen:{},                 // sel wilayah yang sudah diproses (gx,gz → true)
  used:{},                 // sel wilayah yang altarnya sudah dipakai (permanen)
  current:null,            // altar yang panel-nya sedang dibuka
  SAVE_KEY:'forecraft_altar_v1',
  CELL:88,                 // ukuran sel wilayah (blok) untuk undian kemunculan
  CHANCE:0.05,             // peluang altar per sel
  MIN_GAP:520,             // jarak minimum antar altar (blok) — cegah altar
                           // muncul di biome bersebelahan
  SPAWN_R:70,              // jarak altar mulai dibangun
  DESPAWN_R:120,           // jarak altar dilepas (kecuali sedang ritual)
  INTERACT_R:4.2,          // jarak interaksi ke bagian tengah
  RITUAL_DUR:10,           // detik proses summoning sebelum boss muncul
  BOSS:'kelabang',         // boss yang dipanggil: KELABANG RAKSASA

  /* ---------- KALIBRASI BOSS ALTAR (rekomendasi pemain Lv 150+) ----------
     Dulu kelabang altar memakai stat mentah tipe (HP 24.960 setelah pengali
     boss, damage 99) — mati dalam 20 detik di tangan pemain Lv 80+. Kini
     ditetapkan manual di summonBoss():
       HP  160.000 → pemain Lv 100 ber-gear maksimal (DPS ±1.000) masih bisa
                     menang, tapi pertarungannya ±2,5 menit yang seret;
                     pemain Lv 150+ dengan tim menyelesaikannya ±1 menit.
       DMG 650 mentah (±325 setelah armor menengah) → pemain Lv 100 (HP ±1.288)
                     makan 25% HP per pukulan — sakit, wajib tangkisan/heal;
                     pemain Lv 150 (HP ±1.876) hanya 17% per pukulan.
       XP  2× mob setara Lv 150 (±4.117) → ±12% satu level untuk pemain Lv 100. */
  BOSS_LVL:150,
  BOSS_HP:160000,
  BOSS_DMG:650,

  /* ingredient ritual: 4 bahan langka (masing-masing 1% drop dari mob biasa
     di biome Tanah Merah). Semuanya wajib untuk memanggil Kelabang Raksasa.
     Cukup 1 buah per bahan — yang sulit adalah MENDAPATKANNYA (drop 1%),
     bukan menumpuknya. */
  REQ:{insect_leg:1,hard_shell:1,green_blood:1,toxic_venom:1},

  init(scene){
    this.scene=scene;
    this.load();
  },

  /* ---------- persistensi: hanya menyimpan sel yang altarnya sudah dipakai ---------- */
  save(){
    try{localStorage.setItem(this.SAVE_KEY,JSON.stringify({used:this.used}));}catch(e){}
  },
  load(){
    try{
      const raw=localStorage.getItem(this.SAVE_KEY);
      if(raw){const d=JSON.parse(raw);if(d&&d.used)this.used=d.used;}
    }catch(e){}
  },

  /* ---------- posisi altar deterministik per sel wilayah ----------
     rawCell() = kandidat mentah (lolos undian 5%) tanpa memperhatikan jarak.
     cellPos() = kandidat FINAL setelah aturan jarak minimum diterapkan. */
  _rawCache:{},
  /* Apakah titik ini layak menampung altar?
     Altar butuh lahan 5x5 di DARATAN, di atas permukaan air, dan bukan kavling
     desa. Diperiksa deterministik dari WGEN (tanpa data chunk) supaya bisa
     dipakai saat memilih kandidat, bukan hanya saat membangun. */
  spotOK(bx,bz){
    if(typeof WGEN==='undefined')return true;
    const land=(x,z)=>{
      if(WGEN.isLand&&!WGEN.isLand(x,z))return false;
      if(WGEN.height&&WGEN.height(x,z)<CFG.SEA)return false;
      return true;
    };
    if(!land(bx,bz))return false;
    if(WGEN.buildingAt&&WGEN.buildingAt(bx,bz,3))return false;
    /* keempat sudut platform (5x5 + margin) juga harus daratan supaya altar
       tidak berdiri setengah tercelup di tepi air */
    for(const[dx,dz]of[[-3,-3],[3,-3],[-3,3],[3,3]]){
      if(!land(bx+dx,bz+dz))return false;
    }
    return true;
  },
  rawCell(gx,gz){
    const key=gx+','+gz;
    if(this._rawCache[key]!==undefined)return this._rawCache[key];
    let out=null;
    if(typeof WGEN!=='undefined'&&WGEN.hash&&WGEN.hash(gx,gz,4242)<this.CHANCE){
      const C=this.CELL;
      /* BEBERAPA kandidat titik di dalam sel; dipakai yang benar-benar DARATAN.
         PENTING: dulu hanya SATU titik yang dicoba dan kelayakannya tidak
         diperiksa di sini. Kandidat yang jatuh di laut tetap ikut aturan
         MIN_GAP — ia MENGALAHKAN kandidat darat di sekitarnya lalu gagal
         dibangun sendiri (spawn menolak air), sehingga terbentuk "lubang"
         seluas 520 blok tanpa altar sama sekali. Audit menunjukkan 37% slot
         altar hangus seperti ini. Dengan mencari titik darat lebih dulu, slot
         itu terselamatkan.
         k=0 memakai seed hash yang sama seperti versi lama, jadi altar yang
         sudah berdiri di daratan tetap di posisi yang sama. */
      for(let k=0;k<8;k++){
        const ox=10+WGEN.hash(gx,gz,71+k*13)*(C-20);
        const oz=10+WGEN.hash(gx,gz,97+k*17)*(C-20);
        const tx=Math.floor(gx*C+ox),tz=Math.floor(gz*C+oz);
        if(!this.spotOK(tx,tz))continue;
        /* prio = penentu pemenang saat dua kandidat terlalu berdekatan
           (nilai terkecil menang). Deterministik, jadi hasilnya konsisten. */
        out={x:tx+0.5,z:tz+0.5,prio:WGEN.hash(gx,gz,911)};
        break;
      }
    }
    this._rawCache[key]=out;
    return out;
  },
  /* JARAK MINIMUM ANTAR ALTAR:
     Sebuah kandidat dibatalkan bila ada kandidat lain dalam radius MIN_GAP yang
     "prio"-nya lebih kecil. Karena semua kandidat dihitung dari hash yang sama,
     aturan ini deterministik & simetris — hasilnya: altar tidak akan pernah
     muncul di wilayah/biome bersebelahan, selalu berjarak jauh. */
  _okCache:{},
  cellPos(gx,gz){
    const key=gx+','+gz;
    if(this._okCache[key]!==undefined)return this._okCache[key];
    const me=this.rawCell(gx,gz);
    let res=null;
    if(me){
      const R=Math.ceil(this.MIN_GAP/this.CELL);
      let blocked=false;
      for(let dz=-R;dz<=R&&!blocked;dz++)for(let dx=-R;dx<=R;dx++){
        if(dx===0&&dz===0)continue;
        const o=this.rawCell(gx+dx,gz+dz);
        if(!o)continue;
        if(Math.hypot(o.x-me.x,o.z-me.z)>=this.MIN_GAP)continue;
        /* tetangga terlalu dekat: yang prio lebih kecil yang bertahan.
           Seri (sangat jarang) diputus lewat koordinat sel. */
        if(o.prio<me.prio||(o.prio===me.prio&&(gx+dx)*100003+(gz+dz)<gx*100003+gz)){
          blocked=true;break;
        }
      }
      if(!blocked)res={x:me.x,z:me.z};
    }
    this._okCache[key]=res;
    return res;
  },

  /* =========================================================================
     MODEL VOXEL ALTAR — platform + 4 tugu berkristal + pedestal + rune
     ========================================================================= */
  buildMesh(){
    const g=new THREE.Group();
    const parts={blocks:[],crystals:[],braziers:[]};
    const MAT={
      stone:new THREE.MeshLambertMaterial({color:0x8f8f96}),
      dark:new THREE.MeshLambertMaterial({color:0x5b5b70}),
      moss:new THREE.MeshLambertMaterial({color:0x8a9a80}),
      gold:new THREE.MeshLambertMaterial({color:0xd7ab48}),
      obsid:new THREE.MeshLambertMaterial({color:0x2a2140}),
    };
    parts.MAT=MAT;
    /* satu blok voxel; disimpan untuk animasi ledakan */
    const blk=(mat,x,y,z)=>{
      const m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),mat);
      m.position.set(x,y,z);m.castShadow=!IS_MOBILE;m.receiveShadow=!IS_MOBILE;
      g.add(m);
      parts.blocks.push({mesh:m,alive:true,vel:null,ang:null,fade:0});
      return m;
    };
    /* platform bertingkat (5x5 → 3x3) */
    for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++){
      const r=WGEN?WGEN.hash(x+30,z+30,3):Math.random();
      blk(r<0.1?MAT.moss:MAT.stone,x,0.5,z);
    }
    for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++){
      const edge=Math.abs(x)===1&&Math.abs(z)===1;
      blk(edge?MAT.gold:MAT.stone,x,1.5,z);
    }
    /* pedestal tengah + mangkuk obsidian */
    blk(MAT.stone,0,2.5,0);
    parts.basin=blk(MAT.obsid,0,3.5,0);
    /* 4 tugu di sudut + kristal menyala di atasnya */
    const CRY_COL=[0x53d8ff,0xff8a3c,0x6fe05c,0xb46bff];
    const corners=[[2,2],[-2,2],[-2,-2],[2,-2]];
    corners.forEach((c,i)=>{
      const[cx,cz]=c;
      for(let y=1.5;y<=3.5;y++)blk(WGEN&&WGEN.hash(cx,cz+y,5)<0.12?MAT.moss:MAT.stone,cx,y,cz);
      blk(MAT.gold,cx,4.5,cz);
      /* kristal melayang */
      const col=CRY_COL[i];
      const cg=new THREE.Group();cg.position.set(cx,5.5,cz);
      const cm=new THREE.Mesh(new THREE.OctahedronGeometry(0.42),
        new THREE.MeshLambertMaterial({color:0xbfffff,emissive:col,emissiveIntensity:1.1}));
      cm.scale.set(1,1.7,1);cg.add(cm);
      g.add(cg);
      parts.crystals.push({g:cg,m:cm,phase:Math.random()*6.28,baseY:5.5,col,vel:null});
    });
    /* piringan rune melayang di atas pedestal */
    const rune=new THREE.Mesh(new THREE.CircleGeometry(1.15,28),
      new THREE.MeshBasicMaterial({color:0x8fe8ff,transparent:true,opacity:0.5,
        side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
    rune.rotation.x=-Math.PI/2;rune.position.set(0,4.15,0);g.add(rune);parts.rune=rune;
    /* penanda gem berputar di tengah (titik interaksi) */
    const marker=new THREE.Mesh(new THREE.OctahedronGeometry(0.3),
      new THREE.MeshLambertMaterial({color:0xbfffff,emissive:0x66e0ff,emissiveIntensity:1.2}));
    marker.position.set(0,4.7,0);g.add(marker);parts.marker=marker;
    /* bola inti energi (tersembunyi sampai ritual) */
    const core=new THREE.Mesh(new THREE.SphereGeometry(0.5,16,12),
      new THREE.MeshBasicMaterial({color:0xeaffff,transparent:true,opacity:0.95,
        depthWrite:false,blending:THREE.AdditiveBlending}));
    core.position.set(0,4.3,0);core.scale.setScalar(0.001);g.add(core);parts.core=core;
    /* cahaya inti */
    const light=new THREE.PointLight(0x9fefff,0,26,1.6);
    light.position.set(0,4.3,0);g.add(light);parts.light=light;

    return {mesh:g,parts};
  },

  /* ---------- bangun altar di titik (x,z) ---------- */
  spawn(cellKey,x,z){
    const bx=Math.floor(x),bz=Math.floor(z);
    const gy=World.topY(bx,bz);
    if(gy<CFG.SEA)return null;                       // jangan di air/laut
    if(typeof WGEN!=='undefined'&&WGEN.buildingAt&&WGEN.buildingAt(bx,bz,2))return null; // bukan di desa
    const built=this.buildMesh();
    built.mesh.position.set(bx+0.5,gy,bz+0.5);
    this.scene.add(built.mesh);
    const al={key:cellKey,mesh:built.mesh,parts:built.parts,
      x:bx+0.5,y:gy,z:bz+0.5,
      state:'idle',t:0,ritualT:0,bossSpawned:false,exploding:false,explodeT:0,
      _capT:0};
    this.list.push(al);
    return al;
  },

  nearest(pos){
    let best=null,bd=this.INTERACT_R;
    for(const al of this.list){
      if(al.state!=='idle')continue;                 // sedang ritual/hancur: tak bisa dipakai
      const d=Math.hypot(al.x-pos.x,al.z-pos.z);
      if(d<bd&&Math.abs(al.y-pos.y)<4){best=al;bd=d;}
    }
    return best;
  },

  /* =========================================================================
     TABRAKAN ALTAR
     -------------------------------------------------------------------------
     Altar adalah mesh (bukan blok dunia), jadi World.blockedAt tidak
     mengetahuinya dan pemain/monster bisa menembusnya. Di sini disediakan uji
     padat per-titik yang MENGIKUTI BENTUK MODEL (lihat buildMesh) supaya tidak
     ada dinding tak terlihat di sekitar altar:

       tinggi lokal 0..1  → platform 5×5      (setengah lebar 2.5)
       tinggi lokal 1..2  → undakan 3×3       (setengah lebar 1.5)
       tinggi lokal 2..4  → pedestal + mangkuk (setengah lebar 0.5)
       tinggi lokal 1..5  → 4 tugu di sudut (±2, ±2), masing-masing 1×1

     Altar yang sedang HANCUR (state 'explode') tidak lagi memblokir supaya
     pemain bisa langsung melewati puingnya.
     Dipanggil dari World.blockedAt (dipakai fisika pemain & monster).

     CATATAN: uji ini memakai `ly<...` (bukan `<=`) pada tiap tingkat, sehingga
     titik yang berada TEPAT di permukaan sebuah tingkat TIDAK dianggap padat.
     Itu penting supaya pemain yang sudah berdiri di atas platform tidak
     terhalang oleh altar yang ia pijak sendiri (lihat Altar.topAt). */
  solidAt(x,y,z){
    if(!this.list.length)return false;
    for(const al of this.list){
      if(al.state==='explode')continue;
      const ly=y-al.y;
      if(ly<-0.6||ly>=5)continue;
      const dx=Math.abs(x-al.x),dz=Math.abs(z-al.z);
      if(dx>2.5||dz>2.5)continue;                    // di luar jangkauan altar
      /* tugu sudut: kolom 1×1 di (±2,±2), tinggi lokal 1..5 */
      if(ly>=1&&Math.abs(dx-2)<=0.5&&Math.abs(dz-2)<=0.5)return true;
      if(ly<1){ if(dx<=2.5&&dz<=2.5)return true; }   // platform 5×5
      else if(ly<2){ if(dx<=1.5&&dz<=1.5)return true; }
      else if(ly<4){ if(dx<=0.5&&dz<=0.5)return true; }
    }
    return false;
  },

  /* =========================================================================
     PERMUKAAN ATAS ALTAR (lantai yang bisa dipijak)
     -------------------------------------------------------------------------
     Mengembalikan ketinggian dunia permukaan altar pada kolom (x,z), atau 0
     bila kolom itu tidak menyentuh altar.

     KENAPA PERLU: solidAt() hanya menjawab "padat / tidak", dan World.blockedAt
     memakainya untuk menahan gerak horizontal. Tapi tinggi LANTAI dihitung
     World.groundAt yang membaca blok dunia saja — altar adalah mesh, bukan blok,
     jadi groundAt mengembalikan tinggi TANAH di bawah altar. Akibatnya pemain
     tidak pernah bisa memijak atau melompat ke atas altar: begitu naik, ia
     langsung ditarik kembali ke permukaan tanah, dan gerak horizontal di atas
     platform ditolak karena solidAt masih melaporkan padat di ketinggian kaki.
     Altar pun terasa hanya "punya tabrakan" tanpa bisa dinaiki.

     Tingkatnya mengikuti bentuk model (lihat buildMesh & solidAt):
        platform 5×5   → al.y+1
        undakan  3×3   → al.y+2
        pedestal 1×1   → al.y+4
        tugu sudut     → al.y+5
     Altar yang sedang HANCUR diabaikan supaya puingnya tidak jadi lantai
     hantu. */
  topAt(x,z){
    if(!this.list.length)return 0;
    let top=0;
    for(const al of this.list){
      if(al.state==='explode')continue;
      const dx=Math.abs(x-al.x),dz=Math.abs(z-al.z);
      if(dx>2.5||dz>2.5)continue;
      let t=0;
      if(Math.abs(dx-2)<=0.5&&Math.abs(dz-2)<=0.5)t=al.y+5;      // tugu sudut
      else if(dx<=0.5&&dz<=0.5)t=al.y+4;                          // pedestal
      else if(dx<=1.5&&dz<=1.5)t=al.y+2;                          // undakan
      else t=al.y+1;                                              // platform
      if(t>top)top=t;
    }
    return top;
  },

  /* ---------- buka UI ---------- */
  open(al){
    if(!al||al.state!=='idle')return;
    this.current=al;
    if(UI.open!=='altar')UI.toggle('altar');
    else this.render();
    if(typeof Sfx!=='undefined'&&Sfx.open)Sfx.open();
  },

  reqOK(){
    for(const id in this.REQ)if(RPG.countItem(id)<this.REQ[id])return false;
    return true;
  },

  /* ---------- render panel UI ---------- */
  render(){
    const el=document.getElementById('altar-body');
    if(!el)return;
    if(!this.current){el.innerHTML='<p class="tip">Tidak ada altar aktif.</p>';return;}
    let rows='';
    for(const id in this.REQ){
      const need=this.REQ[id],have=RPG.countItem(id);
      const it=ITEMS[id]||{e:'❔',n:id};
      const ok=have>=need;
      rows+=`<div class="altar-ing ${ok?'ok':'no'}" style="border-color:${ok?'#ff3838':'#7a2020'};background:${ok?'rgba(255,56,56,0.18)':'rgba(40,10,10,0.35)'}">
        <span class="ai-ico">${(typeof UI!=='undefined'&&UI.itemIcon)?UI.itemIcon(id):it.e}</span>
        <span class="ai-nm" style="color:#ff8585;font-weight:700">${it.n}</span>
        <span class="ai-ct" style="color:${ok?'#ff5252':'#ff9999'}">${have}/${need}</span>
      </div>`;
    }
    const ready=this.reqOK();
    el.innerHTML=`
      <div class="altar-ings">${rows}</div>
      <button class="big altar-go" ${ready?'':'disabled'}>✨ MULAI RITUAL ✨</button>
      <p class="tip">Ritual memanggil BOSS raksasa setelah hitung mundur 10 detik, lalu altar hancur. Pastikan kamu siap bertarung!</p>`;
    const btn=el.querySelector('.altar-go');
    if(btn&&ready)btn.addEventListener('click',()=>this.startRitual());
  },

  /* ---------- mulai ritual ---------- */
  startRitual(){
    const al=this.current;
    if(!al||al.state!=='idle')return;
    if(!this.reqOK()){UI.toast('❌ Ingredient belum lengkap');return;}
    /* peringatan bila level pemain di bawah rekomendasi boss */
    if((Player.level||1)<this.BOSS_LVL)
      UI.toast(`⚠️ Kelabang Raksasa setara Lv ${this.BOSS_LVL} — perkuat dirimu dulu atau siapkan tim!`);
    RPG.removeItems(this.REQ);
    if(typeof UI!=='undefined'&&UI.renderAll)UI.renderAll();
    al.state='ritual';al.ritualT=0;al.bossSpawned=false;
    if(UI.open==='altar')UI.toggle('altar');
    this.current=null;
    UI.toast('⚗️ Ritual dimulai! Boss akan muncul dalam 10 detik...');
    if(typeof Sfx!=='undefined'&&Sfx.growl)Sfx.growl(0.7);
  },

  /* ---------- panggil boss di tengah altar ---------- */
  summonBoss(al){
    if(al.bossSpawned)return;
    al.bossSpawned=true;
    if(typeof Monsters==='undefined')return;
    const gy=Math.max(CFG.SEA,World.topY(Math.floor(al.x),Math.floor(al.z)));
    const m=Monsters.make(this.BOSS,new THREE.Vector3(al.x,gy,al.z),true,{mark:false});
    if(m){
      m.state='chase';m.alert=8;m.seeT=(CFG.MOB?CFG.MOB.MEM:2.5);
      /* kalibrasi boss altar (lihat catatan BOSS_LVL/BOSS_HP di atas):
         stat ditetapkan manual — bukan Monsters.setLevel, karena make() sudah
         mengalikan pengali boss (×6 HP / ×2.2 dmg) ke stat mentah tipe. */
      m.lvl=this.BOSS_LVL;
      m.maxhp=m.hp=this.BOSS_HP;
      m.dmg=this.BOSS_DMG;
      m.xp=Math.round(Monsters.TYPES.wolf.xp*
        Math.pow(this.BOSS_LVL,Monsters.LVL_XP_POW)*2);
      Monsters.list.push(m);
    }
    UI.toast(`☠️ ${(MOB_NAME&&MOB_NAME[this.BOSS])||'Boss'} Raksasa terpanggil dari altar!`);    if(typeof FX!=='undefined'){
      FX.ring(al.x,gy+0.1,al.z,0xff6bd6,1.4,7);
      FX.impact(new THREE.Vector3(al.x,gy+1,al.z),0x9fefff,3);
    }
    if(typeof Sfx!=='undefined'&&Sfx.roar)Sfx.roar();
  },

  /* ---------- mulai kehancuran altar (voxel berhamburan) ---------- */
  explode(al){
    al.exploding=true;al.explodeT=0;
    if(typeof FX!=='undefined'){
      FX.addShake(1.0);
      FX.shockwave(al.x,al.y+0.1,al.z,0x9fe8ff,6);
      FX.impact(new THREE.Vector3(al.x,al.y+3,al.z),0xffffff,3.5);
      FX.debris(new THREE.Vector3(al.x,al.y+3,al.z),0x8f8f96,40,6);
    }
    if(typeof Sfx!=='undefined'&&Sfx.smash)Sfx.smash();
    /* beri kecepatan lempar tiap blok altar (relatif ke pusat) */
    const cx=0,cy=3,cz=0;                 // pusat lokal altar
    for(const b of al.parts.blocks){
      if(!b.alive)continue;
      const p=b.mesh.position;
      const dx=p.x-cx,dy=p.y-cy,dz=p.z-cz;
      let l=Math.hypot(dx,dy,dz)||1;
      const nx=dx/l,ny=dy/l,nz=dz/l;
      b.vel=new THREE.Vector3(nx*(3+Math.random()*7),ny*4+3+Math.random()*5,nz*(3+Math.random()*7));
      b.ang=new THREE.Vector3(rand(-4.5,4.5),rand(-4.5,4.5),rand(-4.5,4.5));
      b.fade=0.3+Math.random()*1.0;
      b.mesh.material=b.mesh.material.clone();
      b.mesh.material.transparent=true;
    }
    /* kristal ikut terlempar & memudar */
    for(const cr of al.parts.crystals){
      cr.vel=new THREE.Vector3(cr.g.position.x*0.7,5+Math.random()*4,cr.g.position.z*0.7);
      cr.m.material=cr.m.material.clone();cr.m.material.transparent=true;
    }
    if(al.parts.rune)al.parts.rune.visible=false;
    if(al.parts.marker)al.parts.marker.visible=false;
  },

  /* ---------- lepas altar dari dunia ---------- */
  dispose(al){
    if(this.scene)this.scene.remove(al.mesh);
    al.mesh.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&o.material.dispose)o.material.dispose();});
    const i=this.list.indexOf(al);
    if(i>=0)this.list.splice(i,1);
    if(this.current===al)this.current=null;
  },

  /* =========================================================================
     UPDATE — spawn/despawn + animasi idle + ritual + ledakan
     ========================================================================= */
  update(dt){
    if(typeof Player==='undefined'||!this.scene)return;
    const px=Player.pos.x,pz=Player.pos.z;

    /* --- spawn altar di sel wilayah sekitar pemain (5% chance) --- */
    const C=this.CELL;
    const gpx=Math.floor(px/C),gpz=Math.floor(pz/C);
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const gx=gpx+dx,gz=gpz+dz,key=gx+','+gz;
      if(this.seen[key]||this.used[key])continue;
      const pos=this.cellPos(gx,gz);
      if(!pos)continue;
      if(Math.hypot(pos.x-px,pos.z-pz)>this.SPAWN_R)continue;
      this.seen[key]=true;
      this.spawn(key,pos.x,pos.z);
    }

    const now=performance.now()*0.001;
    for(let i=this.list.length-1;i>=0;i--){
      const al=this.list[i];

      /* despawn saat jauh — hanya bila belum ritual/hancur */
      if(al.state==='idle'){
        if(Math.hypot(al.x-px,al.z-pz)>this.DESPAWN_R){
          this.seen[al.key]=false;   // boleh dibangun ulang bila pemain kembali
          this.dispose(al);
          continue;
        }
        this.animateIdle(al,now,dt);
        continue;
      }

      /* ---------- RITUAL ---------- */
      if(al.state==='ritual'){
        al.ritualT+=dt;
        this.animateRitual(al,now,dt);
        /* hitung mundur tampil tiap detik di atas altar */
        al._capT-=dt;
        if(al._capT<=0){
          al._capT=1;
          const sisa=Math.max(0,Math.ceil(this.RITUAL_DUR-al.ritualT));
          if(sisa>0&&typeof FX!=='undefined'&&FX.text)
            FX.text(new THREE.Vector3(al.x,al.y+6.2,al.z),String(sisa),'#8fe8ff');
        }
        if(al.ritualT>=this.RITUAL_DUR){
          this.summonBoss(al);
          this.explode(al);
          al.state='explode';
          this.used[al.key]=true;      // altar ini tidak muncul lagi
          this.save();
        }
        continue;
      }

      /* ---------- HANCUR (voxel berhamburan) ---------- */
      if(al.state==='explode'){
        al.explodeT+=dt;
        this.animateExplode(al,dt);
        if(al.explodeT>3.2){this.dispose(al);continue;}
      }
    }
  },

  animateIdle(al,t,dt){
    const P=al.parts;
    if(P.marker){P.marker.rotation.y=t*0.9;P.marker.position.y=4.7+Math.sin(t*2.2)*0.1;}
    if(P.rune){P.rune.rotation.z=t*0.5;P.rune.material.opacity=0.4+0.2*Math.sin(t*3);}
    for(const cr of P.crystals){
      cr.g.position.y=cr.baseY+Math.sin(t*1.6+cr.phase)*0.14;
      cr.m.rotation.y=t*1.2+cr.phase;
    }
  },

  animateRitual(al,t,dt){
    const P=al.parts;
    const k=Math.min(1,al.ritualT/this.RITUAL_DUR);
    /* kristal makin terang & berputar cepat */
    for(const cr of P.crystals){
      cr.g.position.y=cr.baseY+Math.sin(t*3+cr.phase)*0.12;
      cr.m.rotation.y=t*4;
      cr.m.material.emissiveIntensity=1.1+2.5*k;
    }
    /* rune berputar cepat & menyala */
    if(P.rune){P.rune.rotation.z=t*2;P.rune.material.opacity=0.5+0.4*k;}
    if(P.marker){P.marker.rotation.y=t*3;P.marker.material.emissiveIntensity=1.2+3*k;}
    /* bola inti membesar */
    if(P.core){
      const s=Math.max(0.001,(0.3+k*1.6)*(1+0.12*Math.sin(t*18)));
      P.core.scale.setScalar(s);
      P.core.material.opacity=0.9;
    }
    if(P.light)P.light.intensity=6+40*k;
    /* partikel naik dari inti + guncangan makin kuat menjelang akhir */
    if(typeof FX!=='undefined'){
      if(Math.random()<0.5)
        FX.debris(new THREE.Vector3(al.x+rand(-0.6,0.6),al.y+4.3,al.z+rand(-0.6,0.6)),
          Math.random()<0.5?0xbfffff:0x7fe8ff,2,3);
      if(al._ringT===undefined)al._ringT=0;
      al._ringT-=dt;
      if(al._ringT<=0){al._ringT=0.4;FX.ring(al.x,al.y+0.1,al.z,0x7fe8ff,1.0,4+k*4);}
      FX.addShake(0.02+0.12*k);
    }
  },

  animateExplode(al,dt){
    const P=al.parts;
    for(const b of P.blocks){
      if(!b.alive)continue;
      b.vel.y-=17*dt;
      b.mesh.position.addScaledVector(b.vel,dt);
      b.mesh.rotation.x+=b.ang.x*dt;b.mesh.rotation.y+=b.ang.y*dt;b.mesh.rotation.z+=b.ang.z*dt;
      if(b.mesh.position.y<0.5&&b.vel.y<0){b.mesh.position.y=0.5;b.vel.y*=-0.32;b.vel.x*=0.7;b.vel.z*=0.7;b.ang.multiplyScalar(0.8);}
      if(al.explodeT>b.fade){
        b.mesh.material.opacity-=dt/0.7;
        b.mesh.scale.setScalar(Math.max(0.1,b.mesh.material.opacity));
        if(b.mesh.material.opacity<=0){b.alive=false;b.mesh.visible=false;}
      }
    }
    for(const cr of P.crystals){
      if(!cr.vel)continue;
      cr.g.position.addScaledVector(cr.vel,dt);cr.vel.y-=5*dt;cr.m.rotation.y+=dt*9;
      cr.m.material.opacity-=dt/1.4;
      if(cr.m.material.opacity<=0){cr.vel=null;cr.g.visible=false;}
    }
    if(P.core){
      P.core.material.opacity*=Math.exp(-dt*3.5);
      P.core.scale.setScalar(P.core.scale.x*Math.exp(-dt*2));
    }
    if(P.light)P.light.intensity*=Math.exp(-dt*3);
  },
};
window.Altar=Altar;
