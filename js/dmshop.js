'use strict';
/* =============================================================================
   TOKO DUNGEON MASTER — KIOS PASAR DI DESA
   -----------------------------------------------------------------------------
   Diporting dari "NEW MODEL/Toko Merchant DM.html": kios kayu berpanggung
   dengan meja counter, empat tiang, kanopi kain merah bergaris, papan nama
   bergambar buku & koin, dua lentera, rak belakang berisi potion/buku/gulungan,
   serta peti & karung di sisinya.

   MENGAPA FILE TERPISAH:
   Furni.DEFS hanya ada setelah js/furni.js dimuat, sedangkan model NPC berada
   di js/entities/* yang dimuat LEBIH DULU. Pola yang sama dipakai dungeon.js
   (Furni.DEFS.dchest) dan quest.js (Furni.DEFS.board): file yang dimuat setelah
   furni.js menambahkan def-nya sendiri. Karena itu file ini disisipkan setelah
   furni.js di index.html.

   TIGA HAL YANG DIURUS DI SINI
     1. Furni.DEFS.dmshop  — model kios + interaksi (membuka toko changer).
     2. Penempatan SATU kios per desa, deterministik & tidak menimpa bangunan
        (membungkus Furni.furnishVillage).
     3. Menambatkan NPC Dungeon Master ke kiosnya (n.shopSpot) sehingga ia
        berdiri di belakang meja, tidak berpatroli — lihat NPCS.aiShopkeeper.
   ============================================================================= */
(function(){
  if(typeof Furni==='undefined')return;

  /* Skala kios di dunia. Prototipe memakai SHOP_SCALE 1.5 pada satuan yang
     kira-kira sama dengan blok, tapi di dunia voxel ini kios sebesar itu
     (lebar 8+ blok) akan menutup kavling tetangga. 0.62 membuat lebarnya
     ±3.3 blok — sepadan dengan gerobak/kios kecil di tepi jalan desa. */
  const S=0.62;
  const LITE=(typeof IS_MOBILE!=='undefined')&&IS_MOBILE;
  const PI=Math.PI;

  /* palet dari prototipe (bagian kios saja; palet karakter ada di file NPC) */
  const C={
    trim:0x8a4a3a, gold:0xc9a84a, goldD:0x9a7d30,
    cape:0x8a2020, capeD:0x6a1818,
    book:0x6a3a20, bookD:0x4a2818, page:0xf0e8d0,
    wood:0x8a6238, woodD:0x6a4828, woodL:0xa87c4a,
    plank:0x9a7048, post:0x5a3f26,
    cloth:0x9a2828, clothD:0x7a1e1e, clothL:0xb83434,
    potGreen:0x4ade80, potRed:0xe05a5a, potBlue:0x5aa8e0, potPurple:0xa060d0,
    glass:0xd8ecf0, cork:0xb08850,
    lamp:0xffd070, lampGlass:0xfff0c0, iron:0x4a4a52,
    paper:0xe8dcc0, paperD:0xc8b898, ink:0x3a3038,
    coin:0xe8c040, coinD:0xb89020, gem:0x50d0c0,
    crate:0x9a7448, crateD:0x7a5a34, sack:0xc8b088, sackD:0xa89068,
  };
  /* geometri kubus dibagi-pakai: satu BoxGeometry(1,1,1) diskalakan per mesh.
     Prototipe membuat BoxGeometry baru untuk SETIAP kotak (±120 geometri per
     kios); dengan satu geometri bersama, satu kios hanya menambah 1 geometri
     ke GPU apa pun jumlah kotaknya. */
  let BOX=null;
  const boxGeo=()=>BOX||(BOX=new THREE.BoxGeometry(1,1,1));
  /* material dibagi lewat Furni.M (cache berdasarkan nama+warna) */
  const M=(c,basic)=>basic
    ? Furni.M('dmB'+c,c,{})            // basic → tetap Lambert agar seragam
    : Furni.M('dm'+c,c);

  /* satu kotak: p.add(box(w,h,d,warna,x,y,z,rx,ry,rz)) */
  function box(p,w,h,d,c,x,y,z,rx,ry,rz){
    const m=new THREE.Mesh(boxGeo(),M(c));
    m.scale.set(w,h,d);
    m.position.set(x,y,z);
    if(rx||ry||rz)m.rotation.set(rx||0,ry||0,rz||0);
    p.add(m);
    return m;
  }

  /* ---------- MODEL KIOS ---------- */
  function buildShop(){
    const root=new THREE.Group();
    const shop=new THREE.Group();
    shop.scale.setScalar(S);
    root.add(shop);

    /* --- lantai panggung --- */
    box(shop,5.4,0.16,3.6,C.plank,0,0.08,-0.2);
    box(shop,5.4,0.06,3.6,C.woodD,0,0.02,-0.2);
    if(!LITE)for(let i=-2;i<=2;i++)box(shop,0.06,0.18,3.6,C.woodD,i*1.05,0.09,-0.2);
    box(shop,5.5,0.10,0.12,C.woodD,0,0.17,1.55);

    /* --- meja counter --- */
    const ct=new THREE.Group();ct.position.set(0,0,1.1);shop.add(ct);
    box(ct,4.6,0.18,1.00,C.woodL,0,1.02,0);
    box(ct,4.6,0.10,1.06,C.woodD,0,0.90,0);
    box(ct,4.2,0.78,0.16,C.wood ,0,0.50,-0.4);
    box(ct,4.2,0.16,0.80,C.woodD,0,0.16,-0.05);
    for(const sx of[-2.1,2.1])for(const sz of[0.36,-0.36])
      box(ct,0.22,0.9,0.22,C.post,sx,0.46,sz);
    box(ct,4.30,0.62,0.10,C.woodD,0,0.58,0.48);
    box(ct,4.34,0.08,0.12,C.trim ,0,0.88,0.49);
    box(ct,4.34,0.08,0.12,C.trim ,0,0.28,0.49);
    box(ct,0.30,0.30,0.06,C.gold ,0,0.58,0.53,0,0,PI/4);
    box(ct,0.16,0.16,0.05,C.cape ,0,0.58,0.57,0,0,PI/4);

    /* --- tiang & palang --- */
    for(const[px,pz]of[[-2.5,-1.5],[2.5,-1.5],[-2.5,1.4],[2.5,1.4]]){
      box(shop,0.20,2.90,0.20,C.post ,px,1.60,pz);
      box(shop,0.28,0.14,0.28,C.woodD,px,3.02,pz);
      box(shop,0.26,0.12,0.26,C.woodD,px,0.22,pz);
    }
    box(shop,5.4,0.18,0.20,C.post,0,3.10,-1.5);
    box(shop,5.4,0.18,0.20,C.post,0,3.10, 1.4);
    box(shop,0.20,0.18,3.10,C.post,-2.5,3.10,-0.05);
    box(shop,0.20,0.18,3.10,C.post, 2.5,3.10,-0.05);

    /* --- kanopi kain bergaris + pinggiran bergelombang --- */
    const aw=new THREE.Group();aw.position.set(0,3.18,0);shop.add(aw);
    const strips=LITE?5:9,sw=LITE?1.08:0.6;
    for(let i=0;i<strips;i++)
      box(aw,sw,0.12,3.3,i%2?C.cloth:C.clothL,-2.4+i*sw,0,-0.05);
    box(aw,5.3,0.10,0.16,C.woodD,0,0.06, 1.5);
    box(aw,5.3,0.10,0.16,C.woodD,0,0.06,-1.6);
    box(aw,5.3,0.14,1.30,C.clothD,0,0.32,-2.05,0.34,0,0);
    const sk=new THREE.Group();sk.position.set(0,3.1,1.62);shop.add(sk);
    for(let i=0;i<strips;i++){
      const col=i%2?C.cloth:C.clothL;
      box(sk,sw*0.93,0.34,0.10,col,-2.4+i*sw,-0.18,0);
      if(!LITE)box(sk,0.30,0.16,0.10,col,-2.4+i*sw,-0.40,0);
    }
    box(sk,5.3,0.08,0.12,C.gold,0,0,0.02);

    /* --- papan nama: buku + koin --- */
    const sg=new THREE.Group();sg.position.set(0,3.75,1.5);shop.add(sg);
    box(sg,2.5,0.70,0.12,C.wood ,0,0,0);
    box(sg,2.6,0.09,0.15,C.woodD,0, 0.36,0);
    box(sg,2.6,0.09,0.15,C.woodD,0,-0.36,0);
    box(sg,0.10,0.70,0.15,C.woodD,-1.28,0,0);
    box(sg,0.10,0.70,0.15,C.woodD, 1.28,0,0);
    box(sg,0.34,0.40,0.05,C.page ,-0.60,0.02,0.08);
    box(sg,0.06,0.40,0.06,C.bookD,-0.78,0.02,0.09);
    if(!LITE){
      box(sg,0.24,0.03,0.03,C.ink,-0.56, 0.10,0.11);
      box(sg,0.24,0.03,0.03,C.ink,-0.56, 0.02,0.11);
      box(sg,0.18,0.03,0.03,C.ink,-0.58,-0.06,0.11);
    }
    box(sg,0.28,0.28,0.05,C.coin ,0.55,0.02,0.08);
    box(sg,0.14,0.14,0.06,C.coinD,0.55,0.02,0.10,0,0,PI/4);
    box(sg,0.10,0.30,0.05,C.gold ,0,   0.02,0.08);
    box(sg,0.05,0.34,0.05,C.iron,-0.9,0.5,0);
    box(sg,0.05,0.34,0.05,C.iron, 0.9,0.5,0);

    /* --- lentera di dua tiang depan ---
       PointLight prototipe DILEWATI di sini: satu titik cahaya per kios
       dikalikan jumlah desa yang termuat akan menembus batas lampu WebGL dan
       memaksa seluruh material dikompilasi ulang. Kesan menyala diambil dari
       material terang (lamp/lampGlass) saja. */
    const lantern=(px,pz)=>{
      const g=new THREE.Group();g.position.set(px,2.5,pz);shop.add(g);
      box(g,0.06,0.30,0.06,C.iron,0,0.28,0);
      box(g,0.26,0.08,0.26,C.iron,0,0.14,0);
      box(g,0.22,0.30,0.22,C.lampGlass,0,-0.06,0);
      box(g,0.14,0.18,0.14,C.lamp,0,-0.06,0);
      box(g,0.26,0.08,0.26,C.iron,0,-0.24,0);
    };
    lantern(-2.5,1.4);lantern(2.5,1.4);

    /* --- rak belakang + dagangan --- */
    const sh=new THREE.Group();sh.position.set(0,0,-1.35);shop.add(sh);
    box(sh,4.6,0.14,0.5,C.woodL,0,1.5,0);
    box(sh,4.6,0.14,0.5,C.woodL,0,2.1,0);
    box(sh,4.6,0.14,0.5,C.woodL,0,2.7,0);
    box(sh,0.16,2.9,0.5,C.post ,-2.3,1.5,0);
    box(sh,0.16,2.9,0.5,C.post , 2.3,1.5,0);
    box(sh,4.6,2.0,0.10,C.woodD,0,2.0,-0.28);
    const potion=(x,y,col,s)=>{
      const g=new THREE.Group();g.position.set(x,y,0.05);g.scale.setScalar(s||1);sh.add(g);
      box(g,0.16,0.20,0.16,C.glass,0,0.10,0);
      box(g,0.12,0.16,0.12,col    ,0,0.08,0);
      box(g,0.07,0.10,0.07,C.glass,0,0.24,0);
      box(g,0.08,0.05,0.08,C.cork ,0,0.31,0);
    };
    potion(-1.90,1.57,C.potGreen);
    potion(-1.55,1.57,C.potRed);
    potion( 1.30,2.17,C.potPurple);
    if(!LITE){
      potion(-1.20,1.57,C.potBlue,0.9);
      potion( 1.65,2.17,C.potGreen,0.85);
      potion( 1.95,2.17,C.potBlue);
    }
    /* tumpukan buku (offset TETAP, bukan Math.random: model dibangun ulang
       tiap kali chunk dimuat, jadi acak akan membuat rak "bergoyang") */
    const stack=(x,y,n)=>{
      const cols=[C.book,C.bookD,C.cape,C.capeD,C.trim];
      const g=new THREE.Group();g.position.set(x,y,0.02);sh.add(g);
      for(let i=0;i<n;i++){
        box(g,0.40,0.09,0.30,cols[i%cols.length],(i%3-1)*0.02,0.05+i*0.10,0,0,(i%2?1:-1)*0.06,0);
        box(g,0.36,0.03,0.26,C.page,(i%3-1)*0.02,0.05+i*0.10,0.03);
      }
    };
    stack(-0.50,1.57,4);
    stack( 0.50,1.57,3);
    if(!LITE)stack(-1.60,2.17,5);
    if(!LITE)for(let i=0;i<7;i++){
      const cols=[C.book,C.bookD,C.cape,C.trim,C.capeD];
      box(sh,0.10,0.44,0.34,cols[i%cols.length],-0.9+i*0.13,2.79,0.02,0,0,(i%2?1:-1)*0.03);
    }
    for(let i=0;i<(LITE?2:4);i++){
      const g=new THREE.Group();g.position.set(1.1+i*0.22,2.82,0.02);sh.add(g);
      box(g,0.10,0.42,0.10,C.paper ,0,0,0);
      box(g,0.12,0.06,0.12,C.paperD,0, 0.21,0);
      box(g,0.12,0.06,0.12,C.paperD,0,-0.21,0);
    }
    box(sh,0.14,0.20,0.14,C.gem,0.95,1.62,0.05,0,PI/4,0);
    box(sh,0.10,0.14,0.10,C.gem,1.10,1.59,0.05,0,PI/4,0);

    /* --- barang di atas counter: buku besar, timbangan, koin, kantong --- */
    const lg=new THREE.Group();lg.position.set(-1.5,1.13,1.05);lg.rotation.y=0.25;shop.add(lg);
    box(lg,0.50,0.05,0.40,C.book ,-0.26,0,0);
    box(lg,0.50,0.05,0.40,C.book , 0.26,0,0);
    box(lg,0.46,0.03,0.36,C.page ,-0.26,0.04,0);
    box(lg,0.46,0.03,0.36,C.page , 0.26,0.04,0);
    box(lg,0.08,0.06,0.40,C.bookD, 0,0.01,0);
    const sc=new THREE.Group();sc.position.set(1.6,1.11,1.0);shop.add(sc);
    box(sc,0.24,0.06,0.24,C.iron ,0,0,0);
    box(sc,0.05,0.44,0.05,C.iron ,0,0.22,0);
    box(sc,0.50,0.04,0.05,C.iron ,0,0.44,0);
    box(sc,0.16,0.03,0.16,C.goldD,-0.22,0.38,0);
    box(sc,0.16,0.03,0.16,C.goldD, 0.22,0.38,0);
    box(sc,0.08,0.06,0.08,C.coin ,-0.22,0.42,0);
    const cs=new THREE.Group();cs.position.set(0.9,1.11,1.15);shop.add(cs);
    for(let i=0;i<5;i++)
      box(cs,0.16,0.03,0.16,i%2?C.coin:C.coinD,0,0.02+i*0.035,0,0,i*0.5,0);
    box(shop,0.30,0.26,0.28,C.sack ,1.15,1.24,0.85);
    box(shop,0.16,0.10,0.16,C.sackD,1.15,1.40,0.85);

    /* --- peti & karung di samping --- */
    box(shop,0.70,0.62,0.70,C.crate ,-2.15,0.47,0.6);
    box(shop,0.74,0.08,0.74,C.crateD,-2.15,0.80,0.6);
    box(shop,0.60,0.50,0.60,C.crate , 2.15,0.41,0.65,0,0.3,0);
    box(shop,0.64,0.07,0.64,C.crateD, 2.15,0.68,0.65,0,0.3,0);
    box(shop,0.50,0.44,0.44,C.sack  , 2.00,0.38,-0.7);
    box(shop,0.30,0.16,0.30,C.sackD , 2.00,0.62,-0.7);
    box(shop,0.44,0.38,0.40,C.sack  ,-2.00,0.35,-0.75,0,0.4,0);
    box(shop,0.26,0.14,0.26,C.sackD ,-2.00,0.57,-0.75,0,0.4,0);

    return root;
  }

  /* ---------- DEF PERABOT ----------
     `r` = radius interaksi. Kios lebar (±3.3 blok), jadi radiusnya diperlebar
     supaya pemain bisa menekan F dari depan meja, bukan hanya dari titik pusat.
     `item:null` = tidak bisa dipungut jadi item; ini bangunan desa.

    /* COLLISION (solid + solidBoxes): dua kotak padat dalam kerangka MODEL
      (sebelum skala S & sebelum yaw — solidAt memutar sesuai yaw perabot):
        - panggung/lantai kios  : 5.5 x 3.7, tinggi 0.35  (pinggir rendah)
        - meja counter          : 4.6 x 1.1, tinggi 1.15, di z +1.1
      DM berdiri di z lokal -0.45 (offset standX/standZ), DI ATAS panggung
      tapi LUAR kotak meja — collision sendiri tidak menolaknya. */
  Furni.DEFS.dmshop={
    n:'Toko Dungeon Master',e:'🧙',item:null,r:3.4,
    label:'🗝️ Toko Dungeon Changer',
    solid:true,
    /* kotak dalam satuan DUNIA (sudah dikali skala kios 0.62):
       panggung 5.5x3.7x0.35 → 3.41x2.29x0.35; meja 4.6x1.1x1.15 → 2.85x0.68x1.15 */
    solidBoxes:[
      {x:0,z:-0.12,w:3.41,d:2.29,h:0.35},
      {x:0,z: 0.68,w:2.85,d:0.68,h:1.15},
    ],
    build(){return buildShop();},
    use(f){
      /* Buka toko changer milik DESA tempat kios ini berdiri. NPC-nya dicari
         supaya panel memakai jalur yang sama dengan berbicara langsung
         (UI.shopNpc). Bila NPC belum ter-spawn (baru masuk desa, atau NPC
         sedang direstock), toko TETAP dibuka dengan DM "virtual" milik desa
         kios ini — stok changer per desa tidak tergantung kehadiran NPC.
         Dulu pemain mendapat pesan "sedang tidak di lapaknya" dan kios
         mati total walau stoknya tersimpan. */
      let npc=null,bd=30;
      if(typeof NPCS!=='undefined'&&NPCS.list){
        for(const n of NPCS.list){
          if(n.dead||!n.role||n.role.id!=='dungeonmaster')continue;
          const d=Math.hypot(n.pos.x-f.x,n.pos.z-f.z);
          if(d<bd){bd=d;npc=n;}
        }
      }
      if(!npc){
        const key=(f.vkey||'0,0').split(',');
        npc={role:{id:'dungeonmaster',e:'🧙'},name:'Dungeon Master',
          home:{x:+key[0],z:+key[1]},
          pos:{x:f.x,y:f.y,z:f.z}};
      }
      if(typeof Sfx!=='undefined'&&Sfx.open)Sfx.open();
      UI.shopNpc=npc;
      UI.toggle('shop');
    },
  };

  /* =========================================================================
     PENEMPATAN: SATU KIOS PER DESA
     -------------------------------------------------------------------------
     BUGFIX (ditemukan pemain): versi pertama menambatkan penempatan kios ke
     Furni.furnishVillage — padahal fungsi itu TIDAK PERNAH dipanggil dari loop
     permainan. Yang benar-benar membangun desa tiap frame adalah rantai
     populate() → queueFurnish() → processFurnishQueue(). Akibatnya hook itu
     mati total dan kios tidak muncul di desa mana pun.

     Sekarang kios ditempatkan lewat queueFurnish, jalur yang benar-benar jalan.
     Bila desa SUDAH pernah dijelajahi (this.villages[key] sudah true), desa itu
     memang tidak diantrekan ulang — jadi kios dipasang terpisah dari daftar
     perabot (lihat di bawah, setelah hook queueFurnish).

     Titik kandidat diuji terhadap bangunan, ladang, dan perabot lain. Kandidat
     sengaja mengambil sisi utara & timur pusat desa: kavling rumah menempati
     z=-14..+14 (V_SLOT) dan tavern di z=+15, jadi tepi utara dan sisi timur
     relatif lapang. Dua titik lama ([6,22] & [18,8]) DIHAPUS: |22| sudah
     melanggar radius desa dan |18| terlalu jauh dari pusat.
     ========================================================================= */
  const SHOP_SPOTS=[
    [ 6,-18, 0       ],   // utara, menghadap selatan (ke pusat desa)
    [-6,-18, 0       ],
    [ 14, -4, -PI/2  ],   // timur, menghadap barat
    [ 14,  6, -PI/2  ],
    [-14, -4,  PI/2  ],   // barat, menghadap timur
    [-14,  6,  PI/2  ],
  ];
  /* Setengah bentang kios setelah diskalakan, dipakai uji tabrakan.
     Model asli 5.5 x 3.6 → dikali S(0.62) ≈ 3.4 x 2.2 blok. */
  const HW=1.8,HD=1.3;

  function spotOK(v,x,z){
    /* jangan menimpa bangunan desa (rumah/tavern/sumur) */
    if(typeof WGEN!=='undefined'&&WGEN.buildingAt){
      for(let ox=-HW;ox<=HW;ox+=1.2)for(let oz=-HD;oz<=HD;oz+=1.2)
        if(WGEN.buildingAt(Math.floor(x+ox),Math.floor(z+oz),1))return false;
    }
    /* jangan menimpa ladang desa */
    if(v.farms){
      for(const f of v.farms){
        if(x+HW>=f.x-1&&x-HW<=f.x+f.w+1&&z+HD>=f.z-1&&z-HD<=f.z+f.d+1)return false;
      }
    }
    /* jangan menimpa perabot lain */
    for(const o of Furni.list){
      if(Math.abs(o.x-x)<HW+1&&Math.abs(o.z-z)<HD+1)return false;
    }
    /* tetap di dalam radius desa & di daratan datar */
    if(Math.hypot(x-v.x,z-v.z)>v.r-2)return false;
    return true;
  }

  /* Pasang kios untuk desa v bila belum ada. Mengembalikan true bila terpasang
     (atau memang sudah ada sebelumnya). */
  function placeShop(v){
    if(!v||!v.plan)return false;
    const key=v.x+','+v.z;
    if(Furni.list.some(f=>f.def==='dmshop'&&f.vkey===key))return true;
    const n=SHOP_SPOTS.length;
    const off=(typeof WGEN!=='undefined'&&WGEN.hash)
      ? Math.floor(WGEN.hash(v.x,v.z,919)*n)%n : 0;
    for(let i=0;i<n;i++){
      const s=SHOP_SPOTS[(off+i)%n];
      const x=v.x+s[0],z=v.z+s[1];
      if(!spotOK(v,x,z))continue;
      const f=Furni.place('dmshop',x,CFG.SEA,z,s[2],true);
      if(f){
        f.vkey=key;
        /* DM BERDIRI DI DALAM KIOS: offset lokal (0,-0.45) dari pusat —
           di balik meja counter (meja di z lokal +1.1, teratas +0.68 dunia)
           tapi masih di atas panggung (panggung membentang z lokal -2.05..
           +1.65), di depan rak belakang (rak di z lokal -1.35). Dulu back
           1.15 membuatnya berdiri DI LUAR kios, menempel rak terluar —
           pemain melihatnya "di belakang kios". */
        const back=0.45;
        f.standX=x-Math.sin(s[2])*back;
        f.standZ=z-Math.cos(s[2])*back;
        f.standYaw=s[2];
        return true;
      }
      return false;
    }
    return false;
  }

  /* ---------- DESA BARU: ikut antrean perabot biasa ---------- */
  const _queueFurnish=Furni.queueFurnish.bind(Furni);
  Furni.queueFurnish=function(v){
    _queueFurnish(v);
    placeShop(v);
  };

  /* ---------- DESA LAMA (sudah pernah dijelajahi): pemeriksa berkala ----------
     populate() menandai desa yang sudah diisi dan melewatinya selamanya
     (`if(this.villages[key])continue`), jadi antrean perabotnya tidak pernah
     jalan ulang. Karena kios ini ditambahkan SETELAH banyak desa dibangun, kita
     perlu jalan pengaman: tiap ~1.5 detik, desa di sekitar pemain yang belum
     punya kios dipasangi satu. Murah — hanya memindai Furni.list + villagesNear. */
  const _populate=Furni.populate.bind(Furni);
  Furni.populate=function(){
    _populate();
    this._dmShopT=(this._dmShopT||0);
    const now=performance.now();
    if(now-this._dmShopT<1500)return;
    this._dmShopT=now;
    if(typeof WGEN==='undefined'||!WGEN.villagesNear)return;
    for(const v of WGEN.villagesNear(Player.pos.x,Player.pos.z)){
      if(Math.hypot(v.x-Player.pos.x,v.z-Player.pos.z)>70)continue;
      placeShop(v);
    }
  };

  /* =========================================================================
     MENAMBATKAN DUNGEON MASTER KE KIOSNYA
     -------------------------------------------------------------------------
     NPCS.make menempatkan NPC di titik acak dalam desa. Untuk Dungeon Master
     titik itu ditimpa dengan posisi di belakang meja kiosnya, dan `shopSpot`
     diisi supaya NPCS.ai memakai aiShopkeeper (berdiri diam) alih-alih
     aiPatrol (berkeliaran).

     Kios dicari dari Furni.list; bila belum terpasang (mis. NPC muncul sebelum
     furnishVillage jalan untuk desa itu), NPC dibiarkan di tempatnya dan akan
     ditambatkan pada percobaan berikutnya lewat NPCS.update.
     ========================================================================= */
  function shopFor(x,z){
    let best=null,bd=1e9;
    for(const f of Furni.list){
      if(f.def!=='dmshop')continue;
      const d=Math.hypot(f.x-x,f.z-z);
      if(d<bd){bd=d;best=f;}
    }
    return (best&&bd<80)?best:null;
  }
  function anchor(n){
    if(!n||n.shopSpot)return false;
    const homeX=n.home?n.home.x:n.pos.x,homeZ=n.home?n.home.z:n.pos.z;
    const f=shopFor(homeX,homeZ);
    if(!f)return false;
    n.shopSpot={x:f.standX!==undefined?f.standX:f.x,
                z:f.standZ!==undefined?f.standZ:f.z,
                yaw:f.standYaw||0};
    /* pindahkan langsung ke lapak & bekukan momentum */
    const g=(typeof World!=='undefined'&&World.groundAt)
      ? World.groundAt(n.shopSpot.x,n.shopSpot.z,CFG.SEA+3) : CFG.SEA;
    n.pos.set(n.shopSpot.x,Math.max(CFG.SEA,g),n.shopSpot.z);
    n.vel.set(0,0,0);
    if(n.mesh){n.mesh.position.copy(n.pos);n.mesh.rotation.y=n.shopSpot.yaw;}
    /* rumah patroli ikut dipindah supaya tidak ada tarikan ke titik lama.
       VILLAGE ANCHOR DISIMPAN TERPISAH (n.villageAnchor): NPCS.spawn mengecek
       kehadiran DM per desa lewat villageAnchor — bila hanya home yang
       ditimpa koordinat lapak, pemeriksa itu tidak pernah mengenali DM yang
       sudah ada dan terus men-spawn DM baru (bug "DM banyak di kios").
       BUGFIX: variabelnya homeX/homeZ (bukan `home`) — dulu baris ini
       melempar ReferenceError sehingga villageAnchor tidak pernah tersimpan. */
    n.villageAnchor={x:homeX,z:homeZ};
    n.home={x:n.shopSpot.x,z:n.shopSpot.z};
    return true;
  }

  if(typeof NPCS!=='undefined'){
    const _make=NPCS.make.bind(NPCS);
    NPCS.make=function(role,x,y,z,home,lvlOverride,village){
      const n=_make(role,x,y,z,home,lvlOverride,village);
      if(n&&role&&role.id==='dungeonmaster')anchor(n);
      return n;
    };
    /* Jaring pengaman: NPC yang belum tertambat (kios terpasang belakangan)
       dicoba lagi berkala. Murah — hanya memindai NPC dungeonmaster.

       PEMBERSIH DM GANDA (perbaikan bug "DM spawn sangat banyak"): save lama
       bisa membawa beberapa DM per desa akibat bug anchor. Beri tanda yang
       pertama per desa (villageAnchor), sisanya di-despawn hingga tersisa satu. */
    const _update=NPCS.update.bind(NPCS);
    NPCS.update=function(dt){
      _update(dt);
      this._dmT=(this._dmT||0)-dt;
      if(this._dmT>0)return;
      this._dmT=2;
      const seen={};
      for(let i=this.list.length-1;i>=0;i--){
        const n=this.list[i];
        if(n.dead||!n.role||n.role.id!=='dungeonmaster')continue;
        if(!n.shopSpot){anchor(n);continue;}
        const va=n.villageAnchor||
          {x:Math.round(n.home.x/32)*32,z:Math.round(n.home.z/32)*32};
        const k=va.x+','+va.z;
        if(seen[k]){this.despawn(i);continue;}
        seen[k]=true;
      }
    };
  }
})();
