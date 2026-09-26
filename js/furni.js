'use strict';
/* =============================================================================
   FURNITUR 3D  (meja, kursi, tempat tidur)
   -----------------------------------------------------------------------------
   Sengaja TIDAK memakai gaya voxel: modelnya dirakit dari silinder tirus,
   torus, dan bola yang diskalakan supaya bentuknya membulat dan organik —
   kontras dengan dunia bloknya, persis seperti perabot buatan tangan.

   Sumber furnitur ada dua:
   1. Otomatis di dalam rumah desa (dibuat saat pemain mendekati desa).
   2. Diletakkan pemain dari item hasil crafting (f_table/f_chair/f_bed).

   Furnitur milik pemain disimpan ke localStorage sendiri supaya tidak perlu
   mengubah format save utama.
   ============================================================================= */
const Furni={
  scene:null,list:[],uid:1,
  villages:{},                 // desa yang perabotnya sudah dibuat
  sitting:null,restT:0,        // status duduk di kursi
  riding:null,                 // perahu yang sedang dinaiki
  boatSpd:0,boatYaw:0,oarP:0,  // kecepatan, arah, & fase ayunan dayung
  wakeT:0,                     // jeda antar riak air di belakang perahu
  bobT:0,                      // fase gelombang untuk perahu yang menganggur
  sleepT:0,                    // animasi layar saat tidur

  chest:null,                  // peti yang panelnya sedang dibuka
  /* dead   : perabot desa yang sudah dihancurkan pemain (tidak dibangkitkan lagi)
     vaults : isi peti desa, disimpan per koordinat supaya tidak hilang saat
              perabot desa dibongkar-pasang oleh populate() */
  dead:{},vaults:{},
  SAVE_KEY:'forest_survival_furni_v1',

  /* ---------- MODE PENEMPATAN (ghost/preview) ----------
     Alih-alih langsung menjatuhkan perabot, pemain masuk ke mode pasang:
     sebuah "ghost" semi-transparan mengikuti arah kamera sehingga posisi bisa
     diarahkan, bisa diputar 90°, lalu dikonfirmasi/dibatalkan. */
  placing:null,ghost:null,ghostMats:[],placeYaw:0,
  placePos:null,placeTarget:null,placeValid:false,placeBar:null,doorBar:null,


  /* ---------- material bersama (hemat memori) ---------- */
  mat:{},
  M(name,color,opt){
    const k=name+color;
    if(!this.mat[k])this.mat[k]=new THREE.MeshLambertMaterial(
      Object.assign({color},opt||{}));
    return this.mat[k];
  },

  /* ---------- COLLISION PERABOT PADAT ----------
     Pola sama dengan Altar.solidAt: perabot adalah MESH (bukan blok dunia),
     jadi tabrakannya diuji terpisah lewat World.blockedAt.
     DEF.solid=true mengaktifkan. Bentuk paling sederhana: satu kotak
     solidW x solidD x solidH berpusat di perabot (ikut yaw).
     DEF.solidBoxes=[{x,z,w,d,h}] untuk bentuk GANDA (mis. meja + badan kios)
     — koordinat & ukuran dalam satuan MODEL (belum dikali skala build). */
  solidAt(x,y,z){
    if(!this.list.length&&(!this.houses||!this.houses.length))return false;
    /* Pintu rumah kayu tertutup memblokir gerakan */
    if(this.houses){
      for(const h of this.houses){
        if(!h.doorOpen&&h.doorMeshPos){
          const ddx=x-h.doorMeshPos.x, ddz=z-h.doorMeshPos.z;
          if(Math.hypot(ddx,ddz)<=0.85&&y>=h.y&&y<=h.y+2.0)return true;
        }
      }
    }
    for(const f of this.list){
      if(typeof FurniCastle!=='undefined'&&f.def&&(f.def.startsWith('castle')||f.def.startsWith('fence')||f.def.startsWith('gate'))){
        if(FurniCastle.solidAt(f,x,y,z))return true;
      }
      const def=this.DEFS[f.def];
      if(!def||!def.solid)continue;
      /* kumpulkan kotak-kotak padat perabot ini */
      const boxes=def.solidBoxes||
        [{x:0,z:0,w:def.solidW||1,d:def.solidD||1,h:def.solidH||1.2}];
      for(const b of boxes){
        const ly=y-f.y;
        if(ly<0.2||ly>=b.h)continue;
        /* koordinat dunia → kerangka lokal perabot.
           Mesh mesh.rotation.y=yaw memetakan lokal (lx,lz) → dunia:
             dx = lx·cos(yaw) + lz·sin(yaw)
             dz = -lx·sin(yaw) + lz·cos(yaw)
           Inversnya (dunia → lokal): lx = dx·cos(yaw) - dz·sin(yaw),
           lz = dx·sin(yaw) + dz·cos(yaw). Dulu dipakai rotasi −yaw — itu
           rotasi SALAH arah (setara +yaw), sehingga untuk perabot dengan
           yaw ±90° kotak collision meja memantul ke sisi berlawanan dari
           meja yang terlihat (bisa menembus meja, nabrak udara di belakang). */
        const dx=x-f.x,dz=z-f.z,c=Math.cos(f.yaw||0),s=Math.sin(f.yaw||0);
        const lx=dx*c-dz*s,lz=dx*s+dz*c;
        const bx=lx-(b.x||0),bz=lz-(b.z||0);
        if(Math.abs(bx)<=b.w*0.5&&Math.abs(bz)<=b.d*0.5)return true;
      }
    }
    return false;
  },

  /* =========================================================================
     DEFINISI PERABOT
     r      : radius interaksi
     label  : teks tombol aksi
     build(): mengembalikan THREE.Group (pusat di titik 0, berdiri di y=0)
     ========================================================================= */
  DEFS:{
    /* Meja kayu biasa kini DEKORASI saja — crafting pindah ke Meja Kerja
       (workbench, model voxel dari NEW MODEL/Workstation.html). */
    table:{n:'Meja Kayu',e:'🍽️',item:'f_table',r:1.1,decor:true,
      build(){return Furni.buildTable();}},
    chair:{n:'Kursi Kayu',e:'💺',item:'f_chair',r:1.1,label:'💺 Duduk',
      build(){return Furni.buildChair();},
      use(f){Furni.sit(f);}},
    bed:{n:'Tempat Tidur',e:'🛏️',item:'f_bed',r:1.3,label:'🛏️ Tidur',
      build(){return Furni.buildBed();},
      use(f){Furni.sleep(f);}},
    /* Peti: gudang pribadi. Isinya menempel pada objek peti (f.inv), bukan
        inventory pemain, sehingga resource bisa dititipkan di basis. */
    chest:{n:'Peti Penyimpanan',e:'🧰',item:'f_chest',r:1.25,label:'🧰 Buka Peti',
      build(){return Furni.buildChest();},
      use(f){Furni.openChest(f);}},
    /* Perahu: satu-satunya perabot yang hidup di atas air. Saat dinaiki,
        pemain bergerak cepat di permukaan tanpa terkena penalti berenang. */
    boat:{n:'Perahu Kayu',e:'🛶',item:'f_boat',r:1.8,label:'🛶 Naiki Perahu',
      build(){return Furni.buildBoat();},
      use(f){Furni.board(f);}},

    /* ---------- STASIUN KERJA (model voxel Workstation.html) ---------- */
    /* Meja Kerja: stasiun crafting pengganti meja biasa */
    workbench:{n:'Meja Kerja',e:'🔨',item:'f_workbench',r:1.25,label:'🔨 Meja Kerja',
      build(){return WSModels.make('bench',0.32);},
      use(){
        const benchIco=(typeof UI!=='undefined'&&UI.ITEM_IMG&&UI.ITEM_IMG.f_workbench)?`<img class="iico" src="${UI.ITEM_IMG.f_workbench}"> `:'';
        UI.toast(benchIco+'Meja kerja — panel crafting terbuka');Sfx.open();
        if(UI.open!=='craft')UI.toggle('craft');}},
    /* Landasan Tempa: enchant/naikkan level equipment (panel anvil) */
    anvil:{n:'Landasan Tempa',e:'⚒️',item:'f_anvil',r:1.25,label:'⚒️ Tempa Equipment',
      build(){return WSModels.make('anvil',0.24);},
      use(){
        const anvilIco=(typeof UI!=='undefined'&&UI.ITEM_IMG&&UI.ITEM_IMG.f_anvil)?`<img class="iico" src="${UI.ITEM_IMG.f_anvil}"> `:'';
        UI.toast(anvilIco+'Landasan tempa — pilih equipment yang akan ditempa');Sfx.open();
        if(UI.open!=='anvil')UI.toggle('anvil');}},
    /* Tungku: stasiun memasak (panel crafting langsung ke tab Makanan) */
    stove:{n:'Tungku Masak',e:'🍲',item:'f_stove',r:1.25,label:'🍲 Masak di Tungku',
      build(){return WSModels.make('stove',0.27);},
      use(){
        const stoveIco=(typeof UI!=='undefined'&&UI.ITEM_IMG&&UI.ITEM_IMG.f_stove)?`<img class="iico" src="${UI.ITEM_IMG.f_stove}"> `:'';
        UI.toast(stoveIco+'Tungku menyala — waktunya memasak');Sfx.open();
        UI.craftTab='food';
        if(UI.open!=='craft')UI.toggle('craft');}},
    /* Api Unggun: tempat beristirahat — pulihkan HP & stamina (cooldown) */
    campfire:{n:'Api Unggun',e:'🔥',item:'f_campfire',r:1.3,label:'🔥 Hangatkan Diri',
      build(){return WSModels.make('campfire',0.30);},
      use(f){Furni.warm(f);}},
    /* Smelter: melebur 2 Ore menjadi 1 Ingot dengan bahan bakar Coal */
    smelter:{n:'Smelter Industri',e:'🏭',item:'f_smelter',r:1.35,label:'🏭 Buka Smelter',
      build(){return (typeof Smelter!=='undefined'&&Smelter.buildModel)?Smelter.buildModel():new THREE.Group();},
      use(f){if(typeof Smelter!=='undefined'&&Smelter.openUI)Smelter.openUI(f);}},

    /* ---------- RUMAH MODULAR 5×5 ----------
       Saat dipasang, rumah DITULIS sebagai blok dunia sungguhan
       (B.PLANK/B.WOOD/B.ROOF) memakai algoritme persis rumah desa — lihat
       writeHouseBlocks(). DEFS ini hanya menyediakan model ghost utk preview;
       tidak punya aksi `use` dan tidak masuk Furni.list. */
    house:{n:'Rumah Kayu',e:'🏠',item:'f_house',r:2.2,decor:true,
      build(){return Furni.buildHouse();}},

    /* ---------- KASTIL, PAGAR & GERBANG (port NEW MODEL/Kastil dan Pagar.html) ---------- */
    castle1:{n:'Kastil T1 (14×14)',e:'🏰',item:'f_castle1',r:6.0,label:'🚪 Buka/Tutup Gerbang',
      build(){return (typeof FurniCastle!=='undefined')?FurniCastle.buildCastle(1):new THREE.Group();},
      use(f){if(typeof FurniCastle!=='undefined')FurniCastle.toggleGate(f);}},
    castle2:{n:'Kastil T2 (17×17)',e:'🏰',item:'f_castle2',r:7.5,label:'🚪 Buka/Tutup Gerbang',
      build(){return (typeof FurniCastle!=='undefined')?FurniCastle.buildCastle(2):new THREE.Group();},
      use(f){if(typeof FurniCastle!=='undefined')FurniCastle.toggleGate(f);}},
    castle3:{n:'Kastil T3 (20×20)',e:'🏰',item:'f_castle3',r:9.0,label:'🚪 Buka/Tutup Gerbang',
      build(){return (typeof FurniCastle!=='undefined')?FurniCastle.buildCastle(3):new THREE.Group();},
      use(f){if(typeof FurniCastle!=='undefined')FurniCastle.toggleGate(f);}},

    fence1:{n:'Pagar Kayu T1',e:'🛡️',item:'f_fence1',r:1.0,decor:true,
      build(){return (typeof FurniCastle!=='undefined')?FurniCastle.buildFence(1):new THREE.Group();}},
    fence2:{n:'Pagar Batu T2',e:'🛡️',item:'f_fence2',r:1.0,decor:true,
      build(){return (typeof FurniCastle!=='undefined')?FurniCastle.buildFence(2):new THREE.Group();}},
    fence3:{n:'Benteng Imperial T3',e:'🛡️',item:'f_fence3',r:1.8,decor:true,
      build(){return (typeof FurniCastle!=='undefined')?FurniCastle.buildFence(3):new THREE.Group();}},

    gate1:{n:'Gerbang Pagar T1',e:'🚪',item:'f_gate1',r:2.4,label:'🚪 Buka/Tutup Gerbang',
      build(){return (typeof FurniCastle!=='undefined')?FurniCastle.buildFenceGate(1):new THREE.Group();},
      use(f){if(typeof FurniCastle!=='undefined')FurniCastle.toggleGate(f);}},
    gate2:{n:'Gerbang Pagar T2',e:'🚪',item:'f_gate2',r:2.4,label:'🚪 Buka/Tutup Gerbang',
      build(){return (typeof FurniCastle!=='undefined')?FurniCastle.buildFenceGate(2):new THREE.Group();},
      use(f){if(typeof FurniCastle!=='undefined')FurniCastle.toggleGate(f);}},
    gate3:{n:'Gerbang Benteng T3',e:'🚪',item:'f_gate3',r:4.2,label:'🚪 Buka/Tutup Gerbang',
      build(){return (typeof FurniCastle!=='undefined')?FurniCastle.buildFenceGate(3):new THREE.Group();},
      use(f){if(typeof FurniCastle!=='undefined')FurniCastle.toggleGate(f);}},
  },

  /* Ukuran satu modul rumah dalam blok (kotak 7×7).
     Dinaikkan 5 → 7 supaya SATU SISI dinding sanggup memuat 1 pintu (lubang
     selebar 2 blok) DAN 2 jendela tanpa bertabrakan:

         X W # D D W X      X=tiang sudut  #=dinding  D=pintu  W=jendela

     Dengan S=5 hanya ada 3 kolom non-sudut; pintu memakan 2 di antaranya
     sehingga tersisa 1 kolom saja — mustahil memuat 2 jendela, dan pola
     jendela lama malah menumpuk di atas pintu. Interior juga naik dari 3×3
     (9 blok) menjadi 5×5 (25 blok), jadi perabot benar-benar bisa ditata.

     Ukuran modul ikut DICATAT di tiap record rumah (rec.s) supaya rumah yang
     sudah dibangun pemain bisa dimigrasikan saat konstanta ini diubah — lihat
     resizeHouseRec(). Naikkan ke 9 bila ingin 3 jendela per sisi; konsekuensinya
     petak tanah rata yang memenuhi syarat makin jarang. */
  HOUSE_SIZE:7,
  /* ukuran modul pada save LAMA yang belum mencatat rec.s */
  LEGACY_SIZE:5,
  /* Tinggi dinding dalam blok. Ruang bebas di dalam = y h..h+H-1 (baris paling
     atas pada kolom TEPI dipakai balok kayu, bagian dalam tetap lega).
     Dinaikkan dari 4 → 6: rumah 4 blok terasa pengap karena pemain saja hampir
     2 blok dan kamera perlu ruang di atas kepala. Semua turunan (balok atas,
     dasar atap, tinggi jendela) mengikuti H otomatis. */
  HOUSE_H:6,
  /* Baris jendela, dihitung dari H supaya jendela tetap di ketinggian mata
     saat tinggi rumah diubah. H=4 → 1 (seperti versi lama), H=6 → 2. */
  windowRow(){return Math.max(1,Math.floor(this.HOUSE_H/2)-1);},


  /* beristirahat di api unggun: +HP & stamina, jeda 30 dtk per api */
  warm(f){
    const now=Date.now()/1000;
    if(f.warmAt&&now-f.warmAt<30){
      UI.toast('🔥 Apinya masih hangat — istirahat lagi nanti');return;
    }
    f.warmAt=now;
    Player.hp=Math.min(Player.maxHp(),Player.hp+10);
    Player.stamina=Math.min(Player.maxStamina(),Player.stamina+30);
    if(typeof FX!=='undefined'&&FX.ring)FX.ring(f.x,f.y+0.6,f.z,0xffa04a);
    Sfx.craft&&Sfx.craft();
    UI.toast('🔥 Kamu menghangatkan diri · +10 ❤️ +30 ⚡');
  },



  /* ---------- helper geometri ---------- */
  /* kaki tirus: bawah lebih ramping dari atas supaya terlihat dibubut */
  leg(x,z,h,rTop,rBot,mat,tilt){
    const g=new THREE.CylinderGeometry(rTop,rBot,h,8);
    const m=new THREE.Mesh(g,mat);
    m.position.set(x,h/2,z);
    if(tilt){m.rotation.z=-x*tilt;m.rotation.x=z*tilt;}
    m.castShadow=true;
    return m;
  },
  /* papan dengan sudut ditumpulkan: box tipis + silinder di kedua tepi */
  slab(w,h,d,mat){
    const g=new THREE.Group();
    const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    b.castShadow=true;g.add(b);
    for(const s of[-1,1]){
      const e=new THREE.Mesh(new THREE.CylinderGeometry(h/2,h/2,d,8),mat);
      e.rotation.x=Math.PI/2;e.position.x=s*w/2;g.add(e);
      const e2=new THREE.Mesh(new THREE.CylinderGeometry(h/2,h/2,w,8),mat);
      e2.rotation.z=Math.PI/2;e2.position.z=s*d/2;g.add(e2);
    }
    return g;
  },

  /* =========================================================================
     FURNITUR VOXEL FORECRAFT
     -------------------------------------------------------------------------
     Satu bahasa visual dengan NPC & monster: kotak-kotak chunky dari
     BoxGeometry, dibangun berlapis (gelap → utama → terang) plus aksen kecil
     supaya terasa "voxelForecraft", bukan sekadar tiruan Minecraft.
     Dimensi & kontrak gameplay dipertahankan:
       - tinggi daun meja 0.78, dudukan kursi 0.46
       - kasur 1.16 × 2.06 (kepala di -z)
       - perahu menyimpan dayung di userData.oar (dianimasikan sail())
     ========================================================================= */

  /* helper voxel furnitur: buat kotak & tempatkan langsung */
  vb(w,h,d,mat){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    m.castShadow=true;
    return m;
  },
  vp(mesh,x,y,z){mesh.position.set(x,y,z);return mesh;},

  /* ---------- MEJA VOXEL ---------- */
  buildTable(){
    const wood=this.M('wood',0x9a6b3c),dark=this.M('wood',0x6f4a26),
          plank=this.M('wood',0xb0804a),plankL=this.M('wood',0xc09058),
          clay=this.M('clay',0xd8cbb8),clayD=this.M('clay',0xb8a892),
          bread=this.M('bread',0xc98a4d),breadD=this.M('bread',0xa86b3c);
    const g=new THREE.Group();
    /* daun meja: 3 papan voxel dengan highlight di tengah */
    for(let i=-1;i<=1;i++)
      g.add(this.vp(this.vb(1.5,0.1,0.3,i===0?plankL:plank),0,0.78,i*0.32));
    /* bibir tepi gelap mengunci siluet meja */
    g.add(this.vp(this.vb(1.56,0.14,0.08,dark),0,0.73,0.47));
    g.add(this.vp(this.vb(1.56,0.14,0.08,dark),0,0.73,-0.47));
    g.add(this.vp(this.vb(0.08,0.14,1.02,dark),-0.74,0.73,0));
    g.add(this.vp(this.vb(0.08,0.14,1.02,dark),0.74,0.73,0));
    /* apron di bawah daun meja */
    g.add(this.vp(this.vb(1.3,0.08,0.86,wood),0,0.65,0));
    /* 4 kaki chunky + tapak gelap + paku aksen */
    for(const sx of[-1,1])for(const sz of[-1,1]){
      g.add(this.vp(this.vb(0.16,0.62,0.16,wood),sx*0.62,0.35,sz*0.36));
      g.add(this.vp(this.vb(0.2,0.08,0.2,dark),sx*0.62,0.04,sz*0.36));
      g.add(this.vp(this.vb(0.05,0.05,0.05,dark),sx*0.62,0.68,sz*0.36));
    }
    /* palang penguat samping */
    g.add(this.vp(this.vb(1.16,0.08,0.08,dark),0,0.2,0.36));
    g.add(this.vp(this.vb(1.16,0.08,0.08,dark),0,0.2,-0.36));
    /* dekorasi voxel: piring + roti + gelas */
    g.add(this.vp(this.vb(0.3,0.04,0.3,clay),0.32,0.85,0.12));
    g.add(this.vp(this.vb(0.22,0.03,0.22,clayD),0.32,0.87,0.12));
    g.add(this.vp(this.vb(0.18,0.08,0.12,bread),0.32,0.92,0.12));
    g.add(this.vp(this.vb(0.12,0.05,0.08,breadD),0.32,0.96,0.12));
    g.add(this.vp(this.vb(0.09,0.12,0.09,clayD),-0.35,0.89,0.18));
    g.add(this.vp(this.vb(0.03,0.06,0.03,clay),-0.41,0.9,0.18));
    return g;
  },

  /* ---------- KURSI VOXEL ---------- */
  buildChair(){
    const wood=this.M('wood',0xa0713f),dark=this.M('wood',0x6f4a26),
          plank=this.M('wood',0xb5824c),cloth=this.M('cloth',0x7a4f7d),
          clothL=this.M('cloth',0x8f6193);
    const g=new THREE.Group();
    /* dudukan dua layer papan */
    g.add(this.vp(this.vb(0.54,0.08,0.52,wood),0,0.46,0));
    g.add(this.vp(this.vb(0.46,0.05,0.44,plank),0,0.51,0));
    /* 4 kaki + tapak gelap */
    for(const sx of[-1,1])for(const sz of[-1,1]){
      g.add(this.vp(this.vb(0.09,0.44,0.09,dark),sx*0.21,0.22,sz*0.2));
      g.add(this.vp(this.vb(0.11,0.05,0.11,dark),sx*0.21,0.025,sz*0.2));
    }
    /* palang penguat antar kaki */
    g.add(this.vp(this.vb(0.42,0.06,0.06,dark),0,0.14,0));
    /* sandaran: 2 tiang + 3 bilah voxel + mahkota tiang */
    for(const sx of[-1,1]){
      g.add(this.vp(this.vb(0.09,0.72,0.09,dark),sx*0.21,0.82,-0.21));
      g.add(this.vp(this.vb(0.11,0.08,0.11,wood),sx*0.21,1.2,-0.21));
    }
    g.add(this.vp(this.vb(0.5,0.14,0.07,wood),0,1.08,-0.21));
    g.add(this.vp(this.vb(0.44,0.1,0.06,plank),0,0.88,-0.21));
    g.add(this.vp(this.vb(0.44,0.08,0.06,plank),0,0.7,-0.21));
    /* bantalan voxel dua warna */
    g.add(this.vp(this.vb(0.42,0.07,0.4,cloth),0,0.56,0.02));
    g.add(this.vp(this.vb(0.34,0.04,0.32,clothL),0,0.6,0.02));
    return g;
  },

  /* ---------- TEMPAT TIDUR VOXEL ---------- */
  buildBed(){
    const wood=this.M('wood',0x8a5a2b),dark=this.M('wood',0x5d3c1c),
          plank=this.M('wood',0x9d6a35),
          sheet=this.M('cloth',0xe6ddc8),sheetL=this.M('cloth',0xf2ead8),
          quilt=this.M('cloth',0xc23b3b),quiltD=this.M('cloth',0x9c2b2b),
          pillow=this.M('cloth',0xf6efdd);
    const g=new THREE.Group();
    /* rangka + 4 kaki */
    g.add(this.vp(this.vb(1.16,0.14,2.06,dark),0,0.34,0));
    for(const sx of[-1,1])for(const sz of[-1,1])
      g.add(this.vp(this.vb(0.12,0.3,0.12,dark),sx*0.5,0.15,sz*0.92));
    /* kasur: dua layer voxel (dasar + atas lebih terang) */
    g.add(this.vp(this.vb(1.06,0.12,1.94,sheet),0,0.46,0));
    g.add(this.vp(this.vb(0.98,0.08,1.86,sheetL),0,0.54,0));
    /* selimut merah menutup 2/3 bawah + lipatan tepi */
    g.add(this.vp(this.vb(1.1,0.1,1.06,quilt),0,0.58,0.46));
    g.add(this.vp(this.vb(1.1,0.05,0.14,quiltD),0,0.61,-0.1));
    g.add(this.vp(this.vb(1.12,0.16,0.08,quiltD),0,0.52,0.99));
    /* bantal voxel bertumpuk dekat kepala (-z) */
    g.add(this.vp(this.vb(0.62,0.1,0.34,pillow),0,0.6,-0.72));
    g.add(this.vp(this.vb(0.5,0.07,0.26,sheetL),0,0.66,-0.72));
    /* kepala ranjang + mahkota + tiang dekoratif */
    g.add(this.vp(this.vb(1.16,0.62,0.1,wood),0,0.72,-1.0));
    g.add(this.vp(this.vb(1.24,0.08,0.12,plank),0,1.06,-1.0));
    for(const sx of[-1,1])
      g.add(this.vp(this.vb(0.1,0.16,0.1,dark),sx*0.56,1.12,-1.0));
    /* papan kaki lebih rendah */
    g.add(this.vp(this.vb(1.16,0.3,0.1,wood),0,0.52,1.0));
    g.add(this.vp(this.vb(1.24,0.06,0.12,plank),0,0.7,1.0));
    return g;
  },

  /* ---------- PETI PENYIMPANAN PEMAIN (STORAGE CHEST) ----------
     Model voxel penyimpanan pemain beraksen kayu oak kokoh, plat besi sudut,
     sabuk plat pelindung, pegangan samping, grendel kuningan, kaki runner,
     dan tutup berengsel di tepi atas belakang.
     DIBEDAKAN dari peti dungeon (PortChest) yang berisi batu mulia berkilau. */
  buildChest(){
    const bGeo = new THREE.BoxGeometry(1, 1, 1);
    const mats = new Map();
    const getMat = c => {
      let m = mats.get(c);
      if (!m) { m = new THREE.MeshLambertMaterial({ color: c }); mats.set(c, m); }
      return m;
    };
    const group = new THREE.Group();
    const box = (x, y, z, w, h, d, c, ry = 0, rz = 0, rx = 0, parent = group) => {
      const m = new THREE.Mesh(bGeo, getMat(c));
      m.position.set(x, y, z);
      m.scale.set(w, h, d);
      if (rx) m.rotation.x = rx;
      if (rz) m.rotation.z = rz;
      if (ry) m.rotation.y = ry;
      m.castShadow = true; m.receiveShadow = true;
      parent.add(m);
      return m;
    };

    const OAK = 0x8a5426, OAK_D = 0x643c18, OAK_L = 0x9c6230,
          IRON = 0x343840, IRON_L = 0x5e6672, BRASS = 0xc9a442,
          FEET = 0x3a2210, INNER = 0x4e2e14;

    // ---- 1. Kaki / Runner Kayu Bawah ----
    box(0, 0.02, 0.22, 0.94, 0.04, 0.12, FEET);
    box(0, 0.02, -0.22, 0.94, 0.04, 0.12, FEET);

    // ---- 2. Dasar & Badan Peti (Hollow Interior Bersih) ----
    box(0, 0.06, 0, 0.92, 0.04, 0.64, OAK_D); // lantai peti
    box(0, 0.25, 0.30, 0.92, 0.34, 0.05, OAK); // dinding depan
    box(0, 0.25, -0.30, 0.92, 0.34, 0.05, OAK); // dinding belakang
    box(0.44, 0.25, 0, 0.05, 0.34, 0.55, OAK); // dinding kanan
    box(-0.44, 0.25, 0, 0.05, 0.34, 0.55, OAK); // dinding kiri
    box(0, 0.23, 0, 0.04, 0.30, 0.55, INNER); // sekat tengah penyimpanan

    // Panel aksen kayu bergaris
    box(0, 0.25, 0.327, 0.88, 0.02, 0.005, OAK_D);
    box(0, 0.25, -0.327, 0.88, 0.02, 0.005, OAK_D);
    box(0, 0.35, 0.326, 0.86, 0.06, 0.005, OAK_L);

    // ---- 3. Penguat Besi Sudut (Corner Braces) & Rivet ----
    for (const sx of [-0.445, 0.445]) {
      for (const sz of [-0.305, 0.305]) {
        box(sx, 0.25, sz, 0.065, 0.35, 0.065, IRON);
        box(sx, 0.40, sz, 0.075, 0.05, 0.075, IRON_L);
        box(sx, 0.10, sz, 0.075, 0.05, 0.075, IRON_L);
      }
    }

    // ---- 4. Sabuk Plat Besi Vertikal ----
    for (const sx of [-0.22, 0.22]) {
      box(sx, 0.25, 0.327, 0.05, 0.35, 0.008, IRON);
      box(sx, 0.25, -0.327, 0.05, 0.35, 0.008, IRON);
      box(sx, 0.045, 0, 0.05, 0.008, 0.65, IRON);
      box(sx, 0.25, 0.332, 0.03, 0.03, 0.005, IRON_L);
      box(sx, 0.12, 0.332, 0.03, 0.03, 0.005, IRON_L);
      box(sx, 0.37, 0.332, 0.03, 0.03, 0.005, IRON_L);
    }

    // ---- 5. Pegangan Samping (Drop Handles) ----
    for (const sx of [-0.47, 0.47]) {
      box(sx, 0.25, 0, 0.015, 0.08, 0.16, IRON);
      box(sx * 1.02, 0.25, 0, 0.02, 0.04, 0.12, IRON_L);
    }

    // ---- 6. Plat Kunci / Grendel Depan (Lock Plate & Brass Clasp) ----
    box(0, 0.32, 0.332, 0.10, 0.12, 0.012, IRON);
    box(0, 0.32, 0.340, 0.06, 0.07, 0.010, BRASS);
    box(0, 0.30, 0.346, 0.02, 0.03, 0.008, 0x1a1a1a); // lubang kunci

    // ---- 7. Tutup Berengsel (Lid Pivot di Tepi Atas Belakang: z = -0.325, y = 0.42) ----
    const lid = new THREE.Group();
    lid.position.set(0, 0.42, -0.325);

    box(0, 0.04, 0.325, 0.94, 0.08, 0.67, OAK, 0, 0, 0, lid);
    box(0, 0.10, 0.325, 0.90, 0.06, 0.59, OAK_L, 0, 0, 0, lid);
    box(0, 0.15, 0.325, 0.84, 0.05, 0.47, OAK, 0, 0, 0, lid);
    box(0, 0.185, 0.325, 0.76, 0.03, 0.33, OAK_D, 0, 0, 0, lid);

    for (const sx of [-0.455, 0.455]) {
      box(sx, 0.05, 0.325, 0.05, 0.10, 0.68, IRON, 0, 0, 0, lid);
    }
    box(0, 0.05, 0.655, 0.95, 0.10, 0.03, IRON, 0, 0, 0, lid);
    box(0, 0.05, 0.005, 0.95, 0.10, 0.03, IRON, 0, 0, 0, lid);

    for (const sx of [-0.22, 0.22]) {
      box(sx, 0.05, 0.325, 0.05, 0.11, 0.68, IRON, 0, 0, 0, lid);
      box(sx, 0.11, 0.325, 0.05, 0.06, 0.60, IRON, 0, 0, 0, lid);
      box(sx, 0.16, 0.325, 0.05, 0.05, 0.48, IRON, 0, 0, 0, lid);
      box(sx, 0.19, 0.325, 0.05, 0.03, 0.34, IRON, 0, 0, 0, lid);
      box(sx, 0.20, 0.325, 0.03, 0.015, 0.20, IRON_L, 0, 0, 0, lid);
    }

    box(0, 0.02, 0.665, 0.08, 0.08, 0.015, BRASS, 0, 0, 0, lid);
    box(0, -0.02, 0.670, 0.04, 0.05, 0.010, IRON, 0, 0, 0, lid);

    group.add(lid);
    group.userData.lid = lid;

    return group;
  },

  /* ---------- PERAHU VOXEL ----------
     Lambung = tumpukan layer voxel yang menyempit ke bawah (sampan kotak
     khas Forecraft, bukan bola). Haluan & buritan menjulang bertingkat agar
     siluetnya terbaca dari jauh. Dayung disimpan di userData.oar supaya
     animasi sail() tetap bekerja tanpa perubahan.

     SKALA: seluruh model dibangun dalam satuan aslinya lalu dikalikan
     BOAT_SCALE. Geladaknya hanya 0.72 blok lebar & 1.7 blok panjang di ukuran
     asli — lebih kecil dari pemain (lebar badan ±0.7 blok, tinggi ±1.8 blok),
     sehingga pemain tampak "kekecilan duduk di atas papan". Dengan skala 1.9
     geladak menjadi ±1.37 × 3.3 blok: pemain benar-benar duduk DI DALAM
     perahu dan proporsinya wajar.

     Semua turunan (tinggi duduk, tinggi apung) dihitung dari BOAT_SCALE di
     board()/sail(), jadi mengubah angka ini saja sudah cukup. */
  BOAT_SCALE:1.9,
  /* tinggi geladak (lantai tempat pemain duduk) dalam satuan model asli */
  BOAT_DECK_Y:0.34,
  /* pergeseran vertikal mesh perahu terhadap permukaan air (satuan model).
     Dinaikkan dari -0.28 → -0.18 karena nilai lama ikut dikali BOAT_SCALE:
     dengan -0.28 perahu tenggelam 0.53 blok sehingga geladaknya hanya 0.11
     blok di atas air (tampak hampir karam). Dengan -0.18 geladak berada ±0.30
     blok di atas permukaan, lunas tetap terendam. */
  BOAT_SINK:-0.18,
  /* tinggi permukaan geladak di koordinat DUNIA */
  boatDeckY(){
    return CFG.WATER_Y+(this.BOAT_SINK+this.BOAT_DECK_Y)*this.BOAT_SCALE;
  },
  buildBoat(){
    const darkOak=this.M('wood',0x442813),oak=this.M('wood',0x8a5a2b),
          oakL=this.M('wood',0xa8743d),rim=this.M('wood',0x361f0e),
          iron=this.M('wood',0x2e333a),brass=this.M('wood',0xd4a437),
          cushion=this.M('cloth',0x3b4c63),rope=this.M('wood',0x9e8052),
          boxMat=this.M('wood',0x6e4726);
    const lanternMat=new THREE.MeshBasicMaterial({color:0xffe28a});

    const g=new THREE.Group();

    /* 1. Lunas & Lantai Dasar Bertingkat (Kedap Air di atas Waterline) */
    // Lunas tulang bawah (terendam penuh di bawah air)
    g.add(this.vp(this.vb(0.24,0.12,2.56,darkOak),0,0.06,-0.02));
    // Lambung bawah peredam air
    g.add(this.vp(this.vb(0.68,0.14,1.76,darkOak),0,0.19,-0.24));

    // Lantai geladak utama (ketinggian y=0.33, kering di atas air)
    g.add(this.vp(this.vb(0.80,0.08,1.72,oak),0,0.29,-0.24));
    g.add(this.vp(this.vb(0.64,0.08,0.46,oak),0,0.29,0.80));
    g.add(this.vp(this.vb(0.42,0.08,0.32,oak),0,0.30,1.13));
    g.add(this.vp(this.vb(0.28,0.10,0.22,oak),0,0.31,1.34));

    // Papan geladak interior bergaris
    g.add(this.vp(this.vb(0.72,0.02,1.66,oakL),0,0.335,-0.24));
    for(let xi of[-0.24,0,0.24]){
      g.add(this.vp(this.vb(0.02,0.03,1.64,darkOak),xi,0.34,-0.24));
    }

    /* 2. Dinding Lambung Samping Tengah (Z: -1.10 s/d 0.60) */
    for(const sx of[-1,1]){
      g.add(this.vp(this.vb(0.12,0.40,1.72,oak),sx*0.45,0.49,-0.24));
      g.add(this.vp(this.vb(0.16,0.08,1.74,rim),sx*0.45,0.71,-0.24));
      for(let zi=-0.95;zi<=0.45;zi+=0.35){
        g.add(this.vp(this.vb(0.03,0.03,0.03,iron),sx*0.52,0.53,zi));
      }
      g.add(this.vp(this.vb(0.06,0.08,0.08,brass),sx*0.47,0.76,-0.15));
    }

    /* 3. Haluan Depan Bertingkat Rapat (Zero-Gap Stepped Bow) */
    for(const sx of[-1,1]){
      // Step 1 siku & dinding
      g.add(this.vp(this.vb(0.16,0.40,0.12,oak),sx*0.41,0.49,0.60));
      g.add(this.vp(this.vb(0.18,0.08,0.14,rim),sx*0.41,0.71,0.60));
      g.add(this.vp(this.vb(0.12,0.40,0.42,oak),sx*0.36,0.49,0.80));
      g.add(this.vp(this.vb(0.15,0.08,0.44,rim),sx*0.36,0.71,0.80));
      // Step 2 siku & dinding
      g.add(this.vp(this.vb(0.16,0.40,0.12,oak),sx*0.28,0.49,1.00));
      g.add(this.vp(this.vb(0.18,0.08,0.14,rim),sx*0.28,0.71,1.00));
      g.add(this.vp(this.vb(0.10,0.40,0.28,oak),sx*0.22,0.49,1.13));
      g.add(this.vp(this.vb(0.13,0.08,0.30,rim),sx*0.22,0.71,1.13));
    }

    // Blok hidung haluan solid depan
    g.add(this.vp(this.vb(0.44,0.42,0.20,oak),0,0.49,1.32));
    g.add(this.vp(this.vb(0.46,0.08,0.22,rim),0,0.71,1.32));

    // Tiang haluan miring menjulang (Stempost)
    const stem=this.vb(0.16,0.54,0.18,darkOak);
    stem.rotation.x=0.18;
    g.add(this.vp(stem,0,0.79,1.40));
    const cap=this.vb(0.18,0.06,0.20,brass);
    cap.rotation.x=0.18;
    g.add(this.vp(cap,0,1.05,1.45));

    // Cleat & tali tambang
    g.add(this.vp(this.vb(0.06,0.08,0.16,iron),0,0.77,1.24));
    g.add(this.vp(this.vb(0.24,0.08,0.24,rope),0,0.36,1.04));

    /* 4. Buritan Belakang (Transom Menutup Rapat) & Kemudi */
    g.add(this.vp(this.vb(1.02,0.40,0.12,oak),0,0.49,-1.08));
    g.add(this.vp(this.vb(1.06,0.08,0.16,rim),0,0.71,-1.08));
    g.add(this.vp(this.vb(0.10,0.48,0.10,darkOak),0,0.54,-1.18));
    g.add(this.vp(this.vb(0.04,0.34,0.26,darkOak),0,0.20,-1.28));
    g.add(this.vp(this.vb(0.06,0.06,0.30,darkOak),0,0.78,-0.98));

    /* 5. Bangku Duduk & Peti Bekal */
    g.add(this.vp(this.vb(0.78,0.08,0.30,oakL),0,0.43,-0.50));
    g.add(this.vp(this.vb(0.54,0.04,0.26,cushion),0,0.48,-0.50));
    g.add(this.vp(this.vb(0.78,0.08,0.28,oakL),0,0.43,0.38));

    g.add(this.vp(this.vb(0.32,0.18,0.24,boxMat),0,0.38,0.05));
    g.add(this.vp(this.vb(0.34,0.04,0.26,rim),0,0.47,0.05));
    g.add(this.vp(this.vb(0.05,0.06,0.03,brass),0,0.41,0.18));

    /* 6. Lentera Haluan Gantung (Rapi & Elegan) */
    const lanternMount=new THREE.Group();
    lanternMount.position.set(0,0.95,1.45);
    lanternMount.add(this.vp(this.vb(0.03,0.03,0.18,iron),0,0.02,0.09));
    lanternMount.add(this.vp(this.vb(0.03,0.08,0.03,iron),0,-0.03,0.18));

    const lantern=new THREE.Group();
    lantern.position.set(0,-0.15,0.18);
    lantern.add(this.vp(this.vb(0.12,0.025,0.12,brass),0,0.08,0));
    lantern.add(this.vp(this.vb(0.12,0.025,0.12,brass),0,-0.08,0));
    for(const lx of[-0.048,0.048])for(const lz of[-0.048,0.048]){
      lantern.add(this.vp(this.vb(0.015,0.16,0.015,iron),lx,0,lz));
    }
    lantern.add(this.vp(this.vb(0.08,0.13,0.08,lanternMat),0,0,0));
    const pLight=new THREE.PointLight(0xffb84d,0.9,4.5);
    lantern.add(pLight);
    lanternMount.add(lantern);
    g.add(lanternMount);

    /* 7. Sepasang Dayung Ganda (Menukik ke Bawah Air) */
    const oarsMaster=new THREE.Group();
    const makeOar=(side)=>{
      const oarPivot=new THREE.Group();
      oarPivot.position.set(side*0.47,0.74,-0.15);

      const arm=new THREE.Group();
      arm.rotation.z=-side*0.48; // Menukik ke bawah air!
      arm.rotation.y=side*0.15;

      const shaftLen=1.45;
      const shaft=this.vb(shaftLen,0.044,0.044,darkOak);
      shaft.position.set(side*(shaftLen/2-0.20),0,0);
      arm.add(shaft);

      const handle=this.vb(0.16,0.06,0.06,oakL);
      handle.position.set(-side*0.14,0,0);
      arm.add(handle);

      const bladeW=0.38,bladeH=0.16,bladeT=0.022;
      const bladeX=side*(1.05+bladeW/2-0.04);
      const blade=this.vb(bladeW,bladeH,bladeT,oakL);
      blade.position.set(bladeX,0,0);
      arm.add(blade);

      const tip=this.vb(0.04,bladeH+0.01,bladeT+0.01,brass);
      tip.position.set(side*(1.05+bladeW),0,0);
      arm.add(tip);

      oarPivot.add(arm);
      return oarPivot;
    };

    const oarR=makeOar(1);
    const oarL=makeOar(-1);
    oarsMaster.add(oarR);
    oarsMaster.add(oarL);
    g.add(oarsMaster);

    g.userData.oar=oarsMaster;
    g.userData.oarL=oarL;
    g.userData.oarR=oarR;
    /* PERBESAR seluruh perahu supaya sepadan dengan ukuran pemain (lihat
       catatan BOAT_SCALE di atas). Diterapkan di grup induk sehingga semua
       bagian — termasuk pivot dayung & animasinya — ikut berskala. */
    g.scale.setScalar(this.BOAT_SCALE);
    return g;
  },


  /* =========================================================================
     RUMAH MODULAR 5×5
     -------------------------------------------------------------------------
     Rumah modular TIDAK berupa mesh Furni — ia ditulis sebagai BLOK DUNIA
     sungguhan (B.PLANK/B.WOOD/B.ROOF) lewat writeHouseBlocks(), memakai
     algoritme yang sama persis dengan rumah desa (buildVillagePart):
       rec.cells : array {bx,bz} = POJOK MIN (blok dunia) tiap modul 5×5 milik
                   gugus ini; setelah digabung bisa banyak modul.
       rec.door  : {x,z,side} blok PERTAMA dari lubang pintu selebar 2 blok
                   ('n'|'s' → pasangan ke +x, 'e'|'w' → pasangan ke +z).
       rec.y     : ketinggian lantai (hasil houseSiteCheck saat dipasang).
     Karena berupa blok dunia: tampilan identik rumah desa, punya collision,
     bisa dihancurkan per blok lewat sistem tambang biasa, dan atapnya ikut
     transparan saat pemain masuk (updateRoof pada B.ROOF).

     ===== POSISI BEBAS PER BLOK (v0.1.9-c) =====
     Dulu modul disimpan sebagai INDEKS GRID (`cx,cz` = floor(x/5)) sehingga
     dunia terbagi kotak 5×5 yang kaku: klik di mana pun di dalam satu kotak
     menghasilkan sel yang sama, dan pemain tidak bisa menggeser rumah 1 blok.

     Sekarang modul disimpan sebagai POJOK MIN dalam koordinat BLOK dunia, dan
     blok yang diklik menjadi BLOK TENGAH modul (lihat cellAt). Jadi klik blok A
     → tengah rumah di A; klik blok sebelahnya → seluruh rumah bergeser 1 blok.
     Berlaku juga untuk modul ke-2 dan seterusnya yang digabung.

     Kenapa ini aman secara geometri: SEMUA perhitungan (dinding, jendela, atap
     bertangga, lisplang) dihitung dari FOOTPRINT GABUNGAN berupa himpunan blok
     (`fp`), bukan dari indeks grid. Modul yang bertumpuk sebagian pun hanya
     menghasilkan union yang lebih kecil — tetap membentuk bangunan yang benar.
     ========================================================================= */
  /* jarak dari pojok min ke blok tengah modul (S=7 → 3) */
  cellHalf(){return Math.floor(this.HOUSE_SIZE/2);},
  /* Ukuran modul milik SATU record. Dicatat di rec.s sejak modul rumah bisa
     berubah ukuran (5 → 7). Record lama tidak punya field ini, jadi dianggap
     LEGACY_SIZE dan akan dimigrasikan oleh resizeHouseRec() saat dimuat. */
  recSize(rec){return (rec&&rec.s)||this.LEGACY_SIZE;},
  /* Modul dari titik dunia: blok yang ditunjuk menjadi BLOK TENGAH modul.
     Mengembalikan pojok MIN modul dalam koordinat blok dunia. */
  cellAt(x,z){
    const o=this.cellHalf();
    return {bx:Math.floor(x)-o,bz:Math.floor(z)-o};
  },
  /* pusat GEOMETRIS modul: footprint menempati [bx .. bx+S-1] → tengah =
     bx+S/2. Untuk S ganjil ini tepat di tengah blok (bx+2.5 = pusat blok bx+2),
     sehingga ghost preview duduk persis di blok yang diklik. */
  cellCenter(bx,bz){const S=this.HOUSE_SIZE;return {x:bx+S/2,z:bz+S/2};},
  /* apakah blok (x,z) termasuk footprint record ini? */
  recHasBlock(rec,x,z){
    const S=this.recSize(rec);
    for(const c of rec.cells)
      if(x>=c.bx&&x<c.bx+S&&z>=c.bz&&z<c.bz+S)return true;
    return false;
  },
  /* footprint record sebagai Set "x,z" */
  recFp(rec){
    const S=this.recSize(rec),fp=new Set();
    for(const c of rec.cells)
      for(let dx=0;dx<S;dx++)for(let dz=0;dz<S;dz++)fp.add((c.bx+dx)+','+(c.bz+dz));
    return fp;
  },
  /* rumah pemain yang memiliki blok (x,z), atau null */
  houseFpAt(x,z){
    for(const h of this.houses)if(this.recHasBlock(h,x,z))return h;
    return null;
  },
  /* rumah pemain yang BERSINGGUNGAN dengan modul calon (bertumpuk maupun
     bersebelahan). Dipakai placeHouse untuk menentukan gugus mana yang digabung
     — pengganti pemeriksaan 4 tetangga grid versi lama. */
  houseNeighbors(bx,bz){
    const S=this.HOUSE_SIZE,out=[];
    for(const h of this.houses){
      let touch=false;
      for(let dx=0;dx<S&&!touch;dx++)for(let dz=0;dz<S&&!touch;dz++){
        const x=bx+dx,z=bz+dz;
        if(this.recHasBlock(h,x,z)||this.recHasBlock(h,x+1,z)||
           this.recHasBlock(h,x-1,z)||this.recHasBlock(h,x,z+1)||
           this.recHasBlock(h,x,z-1))touch=true;
      }
      if(touch)out.push(h);
    }
    return out;
  },
  /* lubang pintu default untuk modul baru: dua blok di tengah sisi `side`.
     Mengembalikan {x,z,side} = blok PERTAMA pasangan. */
  defaultDoor(bx,bz,side){
    const S=this.HOUSE_SIZE,o=Math.floor(S/2);
    if(side==='s')return {x:bx+o,z:bz+S-1,side:'s'};
    if(side==='n')return {x:bx+o,z:bz,side:'n'};
    if(side==='e')return {x:bx+S-1,z:bz+o,side:'e'};
    return {x:bx,z:bz+o,side:'w'};
  },
  /* pasangan blok lubang pintu dari record door */
  doorPair(door){
    if(!door)return [];
    return (door.side==='n'||door.side==='s')
      ? [[door.x,door.z],[door.x+1,door.z]]
      : [[door.x,door.z],[door.x,door.z+1]];
  },


  /* Model satu rumah/gugus rumah — GAYA RUMAH DESA.
     Rumah desa (worldgen buildVillagePart) tersusun dari blok voxel sungguhan:
     dinding PLANK berhiaskan tiang sudut & balok atas kayu (WOOD), jendela
     bolong di baris ke-2 dengan pola selang-seling, pintu bolong selebar 2
     blok, dan atap bertangga dari blok ROOF yang menjulur 1 blok keluar
     (lisplang). Builder ini meniru algoritme itu persis, hanya saja digambar
     sebagai mesh box di atas tanah alih-alih menulis blok ke chunk dunia.

     Keunggulan pendekatan per-kolom-blok: atap bertangga otomatis MENYATU
     mengikuti bentuk gabungan mana pun (lurus, L, T) karena kedalaman tangga
     dihitung dari jarak kolom ke tepi luar footprint gabungan — sama seperti
     rumus lvl rumah desa untuk kotak.

     cells   : array {bx,bz} POJOK MIN modul (koordinat blok dunia),
     door    : {x,z,side} blok pertama lubang pintu selebar 2 blok,
     originBx/Bz : modul asal; mesh dipusatkan di pusat modul asal. */
  buildHouseMesh(cells,door,originBx,originBz){
    const S=this.HOUSE_SIZE,H=this.HOUSE_H;
    /* warna = BLOCK_INFO desa: PLANK 0xb98a55, WOOD 0x6e4f2f, ROOF 0x9c5a3c */
    const wallMat=this.M('wood',0xb98a55),
          beamMat=this.M('wood',0x6e4f2f),
          roofMat=this.M('roof',0x9c5a3c);
    const g=new THREE.Group();

    /* ---- footprint gabungan dalam koordinat BLOK dunia (integer) ---- */
    const fp=new Set(),K=(x,z)=>x+','+z;
    for(const c of cells)
      for(let dx=0;dx<S;dx++)for(let dz=0;dz<S;dz++)
        fp.add(K(c.bx+dx,c.bz+dz));
    const inF=(x,z)=>fp.has(K(x,z));
    let minX=1e9,maxX=-1e9,minZ=1e9,maxZ=-1e9;
    for(const k of fp){const [x,z]=k.split(',').map(Number);
      if(x<minX)minX=x;if(x>maxX)maxX=x;if(z<minZ)minZ=z;if(z>maxZ)maxZ=z;}
    /* asal mesh = pusat modul asal */
    const ox=originBx+S/2,oz=originBz+S/2;
    const boxAt=(x,y,z,w,h,d,mat)=>{
      const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
      m.castShadow=true;m.receiveShadow=true;
      m.position.set(x+0.5-ox,y+h/2,z+0.5-oz);
      g.add(m);
      return m;
    };

    /* ---- blok PINTU: dua blok berdampingan di sisi `side` (ala desa dc & dc2).
       Hanya dibolongkan bila kolomnya memang dinding luar; bila setelah merge
       posisi itu jadi interior, lubang hilang dengan sendirinya. ---- */
    const doorBlocks=new Set();
    if(door){
      for(const [x,z] of this.doorPair(door)){
        /* harus tepat di garis tepi footprint (dinding luar) */
        const outward=door.side==='s'?!inF(x,z+1):door.side==='n'?!inF(x,z-1):
                      door.side==='e'?!inF(x+1,z):!inF(x-1,z);
        if(inF(x,z)&&outward)doorBlocks.add(K(x,z));
      }

      /* Pintu ganda kayu Forecraft (daun pintu ganda dengan engsel) */
      if(typeof FurniCastle!=='undefined'&&FurniCastle.buildHouseDoor){
        const dm=FurniCastle.buildHouseDoor();
        let dx0=0,dz0=0,rotY=0;
        if(door.side==='s'){dx0=door.x+1.0-ox;dz0=door.z+0.5-oz;rotY=0;}
        else if(door.side==='n'){dx0=door.x+1.0-ox;dz0=door.z+0.5-oz;rotY=Math.PI;}
        else if(door.side==='e'){dx0=door.x+0.5-ox;dz0=door.z+1.0-oz;rotY=Math.PI/2;}
        else if(door.side==='w'){dx0=door.x+0.5-ox;dz0=door.z+1.0-oz;rotY=-Math.PI/2;}
        dm.position.set(dx0,0,dz0);
        dm.rotation.y=rotY;
        g.add(dm);
      }
    }

    /* ---- DINDING per kolom blok tepi (meniru buildVillagePart) ----
       Letak jendela memakai houseWindowSet() yang SAMA dengan writeHouseBlocks,
       jadi ghost preview benar-benar sama dengan hasil akhir (dulu preview
       memakai pola papan catur sendiri sehingga bisa beda dari rumah jadinya). */
    const winSet=this.houseWindowSet(fp,doorBlocks,minX,maxX,minZ,maxZ);
    for(const k of fp){
      const [x,z]=k.split(',').map(Number);
      const openN=!inF(x,z-1),openS=!inF(x,z+1),
            openW=!inF(x-1,z),openE=!inF(x+1,z);
      if(!(openN||openS||openW||openE))continue;          // bukan dinding
      /* tiang sudut = sudut BBOX gabungan, sama dengan writeHouseBlocks */
      const corner=((x===minX||x===maxX)&&(z===minZ||z===maxZ));
      const isDoor=doorBlocks.has(k);
      /* susun kolom: jenis per baris y (air = bolong jendela/pintu) */
      const rows=[];
      const winY=this.windowRow();
      const isWin=winSet.has(k);
      for(let wy=0;wy<H;wy++){
        let t='wall';
        if(corner)t='beam';
        else if(isDoor&&wy<2)t='air';                      // lubang pintu (tinggi 2)
        else if(wy===H-1)t='beam';                         // balok atas
        else if(wy===winY&&isWin)t='air';                  // jendela
        rows.push(t);
      }
      /* gabungkan baris berurutan sejenis jadi satu box (hemat mesh) */
      let y0=0;
      for(let i=1;i<=rows.length;i++){
        if(i<rows.length&&rows[i]===rows[y0])continue;
        const t=rows[y0],hh=i-y0;
        if(t!=='air')boxAt(x,y0,z,1,hh,1,t==='beam'?beamMat:wallMat);
        y0=i;
      }
    }

    /* ---- LANTAI papan per modul ---- */
    for(const c of cells)boxAt(c.bx,0,c.bz,S,0.12,S,wallMat);

    /* ---- ATAP ROOF bertangga + lisplang (meniru roof 'pyramid') ----
       lvl kolom = min langkah ke tepi luar footprint di 4 arah (rumus desa:
       floor(min(mx-|lx-mx|,...)) ekuivalen utk kotak; versi ini bekerja untuk
       bentuk gabungan apa pun). Blok luar yang menempel dapat lvl 0 → atap
       datar 1 lapis = lisplang menjulur, persis overhang desa. */
    const runLen=(x,z,dx,dz)=>{let n=0;while(inF(x+dx*n,z+dz*n))n++;return n;};
    for(const k of fp){
      const [x,z]=k.split(',').map(Number);
      const lvl=Math.min(runLen(x,z,1,0),runLen(x,z,-1,0),
                         runLen(x,z,0,1),runLen(x,z,0,-1))-1;
      if(lvl>=0)boxAt(x,H,z,1,lvl+1,1,roofMat);           // kolom atap penuh
    }
    /* lisplang: blok luar yang menempel footprint (8-neighbor, termasuk sudut
       — sama seperti ekspansi ov=1 di buildVillagePart) */
    for(let x=minX-1;x<=maxX+1;x++)for(let z=minZ-1;z<=maxZ+1;z++){
      if(inF(x,z))continue;
      let near=false;
      for(let dx=-1;dx<=1&&!near;dx++)for(let dz=-1;dz<=1&&!near;dz++)
        if((dx||dz)&&inF(x+dx,z+dz))near=true;
      if(!near)continue;
      boxAt(x,H,z,1,1,1,roofMat);
    }

    return g;
  },

  /* model default (dipakai ghost & item preview): satu modul dengan pintu di
     sisi selatan (+z, menghadap arah pemain saat memasang). */
  buildHouse(){
    return this.buildHouseMesh([{bx:0,bz:0}],this.defaultDoor(0,0,'s'),0,0);
  },



  /* =========================================================================
     PENGELOLAAN OBJEK
     ========================================================================= */
  init(scene){
    this.scene=scene;
    this.load();
  },
  /* letakkan satu perabot; auto=true berarti hasil generasi desa */
  /* kunci stabil untuk perabot desa: dipakai mengingat mana yang sudah
     dihancurkan pemain & menyimpan isi petinya antar kunjungan */
  autoKey(defId,x,z){return defId+'@'+x.toFixed(1)+','+z.toFixed(1);},
  place(defId,x,y,z,yaw,auto,fromLoad){
    const def=this.DEFS[defId];
    if(!def)return null;
    /* RUMAH MODULAR: ditangani jalur khusus (snap ke grid + auto-merge);
       yaw dipakai untuk mengarahkan pintu (diputar per 90°). */
    if(defId==='house'&&!auto)return this.placeHouse(x,z,yaw);
    /* KASTIL: validasi kelayakan tanah (harus rata, bebas pohon & ore) — HANYA saat dipasang baru, BUKAN saat relog/load */
    if(defId.startsWith('castle')&&!auto&&!fromLoad&&typeof FurniCastle!=='undefined'){
      const tier=parseInt(defId.replace('castle',''))||1;
      const site=FurniCastle.castleSiteCheck(x,z,tier);
      if(!site.ok){
        if(typeof UI!=='undefined'&&UI.toast)UI.toast(site.reason);
        return null;
      }
      y=site.y;
      x=Math.round(x);
      z=Math.round(z);

      // Geser pemain, NPC, dan monster ke luar area kastil (depan gerbang) agar tidak terjepit di pilar/dinding
      const size=FurniCastle.getCastleSize(tier);
      const half=size/2;
      const safeDist=half+2.5;
      const safeX=x+Math.sin(yaw||0)*safeDist;
      const safeZ=z+Math.cos(yaw||0)*safeDist;
      const safeY=(typeof World!=='undefined'&&World.groundAt)?World.groundAt(safeX,safeZ,y+4):y;
      this.displaceEntitiesFromBuilding(x,y,z,size,size,safeX,safeY,safeZ);
    }
    /* perabot desa yang pernah dihancurkan tidak dibangkitkan lagi */
    const akey=auto?this.autoKey(defId,x,z):null;
    if(akey&&this.dead[akey])return null;
    const mesh=def.build();

    mesh.position.set(x,y,z);
    mesh.rotation.y=yaw||0;
    mesh.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    this.scene.add(mesh);
    const f={id:this.uid++,def:defId,x,y,z,yaw:yaw||0,mesh,auto:!!auto};
    if(akey)f.akey=akey;
    /* peti membawa inventory sendiri (array slot, null = kosong).
       Berlaku juga untuk peti harta dungeon & karam supaya isi yang sudah
       dijarah sebagian tetap tersimpan di vaults antar kunjungan. */
    if(defId==='chest'||defId==='dchest'||defId==='wreck_chest'){
      f.inv=new Array(CHEST_SLOTS).fill(null);
      /* peti desa: kembalikan isi dari kunjungan sebelumnya (v = bentuk ringkas
         {i,n,l,m}; l = level tempa, m = tanda Log Pass) */
      const v=akey&&this.vaults[akey];
      if(Array.isArray(v))
        for(let i=0;i<f.inv.length&&i<v.length;i++){
          if(!v[i]){f.inv[i]=null;continue;}
          const slot={id:v[i].i,n:v[i].n};
          if(v[i].l)slot.lvl=v[i].l;
          if(v[i].m)slot.mark=v[i].m;
          f.inv[i]=slot;
        }
    }
    this.list.push(f);
    if(defId.startsWith('fence')&&typeof FurniCastle!=='undefined')FurniCastle.rebuildFences();

    if(!auto&&!fromLoad)this.save();
    return f;

  },

  /* =========================================================================
     PENEMPATAN & PENGGABUNGAN RUMAH MODULAR (BLOK SUNGGUHAN)
     -------------------------------------------------------------------------
     Rumah TIDAK lagi berupa mesh Furni — ia ditulis sebagai BLOK DUNIA
     (B.PLANK/B.WOOD/B.ROOF) memakai algoritme yang sama persis dengan rumah
     desa (buildVillagePart di worldgen). Keuntungannya:
       - tampilan identik rumah desa (atlas tekstur + pencahayaan mesher),
       - collision otomatis (blockedAt menganggap PLANK/WOOD/STONE padat),
       - bisa dihancurkan per blok lewat sistem tambang biasa,
       - atap transparan saat pemain masuk (updateRoof bekerja pada B.ROOF).
     Data modul (cells+door) tetap disimpan ke localStorage supaya blok bisa
     ditulis ulang setelah game dimuat ulang.

     POSISI: modul disimpan sebagai POJOK MIN dalam koordinat blok dunia
     (bukan indeks grid), jadi rumah bisa diletakkan per blok. Lihat cellAt.
     ========================================================================= */
  /* catatan semua rumah modular yang sudah dibangun */
  houses:[],
  /* permukaan modul yang pojok minnya (bx,bz); {ok,y} atau {ok:false,reason}.
     Semua S×S kolom harus bertempatan sama persis & tanah asli.
     PENGUKURAN melewati B.ROOF (lisplang rumah modular sendiri menjulur 1
     blok ke sel tetangga — tanpa ini, merge selalu ditolak), tetapi
     tetap MENOLAK bila ada PLANK/WOOD di kolom (dinding bangunan apa pun:
     rumah sendiri maupun desa tidak boleh tertimpa).

     `skipFp` (opsional Set "x,z") = blok milik gugus yang SEDANG digabung.
     Kolom di dalamnya sudah berisi lantai/dinding rumah sendiri, jadi tidak
     boleh dinilai sebagai "ada halangan"; tinggi lantainya diambil dari rec. */
  houseSiteCheck(bx,bz,skipFp,skipY){
    const S=this.HOUSE_SIZE;
    let y=(skipY!==undefined)?skipY:null;
    for(let dx=0;dx<S;dx++)for(let dz=0;dz<S;dz++){
      const cx2=bx+dx,cz2=bz+dz;
      if(skipFp&&skipFp.has(cx2+','+cz2))continue;   // sudah bagian rumah sendiri
      /* turuni kolom: lewati udara/air/atap; berhenti di blok pertama lain */
      let ty=CFG.WORLD_H-1,base=B.AIR;
      while(ty>=0){
        const id=World.getBlock(cx2,ty,cz2);
        if(id===B.AIR||id===B.WATER||id===B.ROOF){ty--;continue;}
        base=id;break;
      }
      const waterLevel=(typeof CFG!=='undefined'&&CFG.WATER_Y)?CFG.WATER_Y:4.82;
      if(base===B.AIR)return {ok:false,reason:'🌊 Tidak bisa membangun di air'};
      if(base===B.WATER||ty+1<waterLevel||World.getBlock(cx2,ty+1,cz2)===B.WATER)
        return {ok:false,reason:'🌊 Tidak bisa membangun di air'};
      if(base===B.WOOD)
        return {ok:false,reason:'🌳 Ada halangan di petak ini (tebang dulu)'};
      const natural=(base===B.GRASS||base===B.DIRT||base===B.SAND||
                     base===B.SNOW||base===B.STONE||base===B.RED_SOIL||base===B.FARM||base===B.PLANK);
      if(!natural)return {ok:false,reason:'🌳 Ada halangan di petak ini (bersihkan dulu)'};
      const t=ty+1;
      if(y===null)y=t;
      else if(t!==y)return {ok:false,reason:'⛰️ Daratan tidak rata — ratakan dulu'};
    }
    if(y===null)return {ok:false,reason:'🏠 Petak ini sudah jadi rumah'};
    return {ok:true,y};
  },
  /* ---- tulis/hapus satu gugus rumah ke dunia, meniru buildVillagePart ---- */

  /* =========================================================================
     LETAK JENDELA — dihitung dari GEOMETRI DINDING, bukan pola selang-seling
     -------------------------------------------------------------------------
     BUG LAMA: jendela dipilih dengan pola papan catur `(lx+lz)%2===0` yang sama
     sekali tidak tahu di mana pintunya. Pada modul 5×5 dengan pintu di tengah,
     salah satu kolom pintu SELALU kena pola itu, sehingga di atas lubang pintu
     (baris 0–1) muncul lubang jendela lagi (baris 2) — pintunya jadi tampak
     seperti lubang tinggi 3 blok yang bocor.

     Sekarang tiap SISI dinding ditelusuri sebagai deretan kolom. Kolom yang
     tidak boleh berjendela (tiang sudut & kolom pintu) memutus deretan, lalu
     pada tiap potongan yang tersisa jendela dipasang berselang satu kolom.
     Hasilnya untuk modul 7×7 dengan pintu di tengah:

         X  W  #  D  D  W  X        X=tiang sudut  #=dinding
                                    D=pintu (baris 0–1)  W=jendela (baris winY)

     dan pada sisi tanpa pintu: X W # W # W X (3 jendela, simetris).
     Berlaku untuk bentuk gabungan apa pun karena penelusuran memakai footprint
     gabungan, bukan koordinat lokal modul.

     `doorBlocks` = Set "x,z" kolom lubang pintu; keduanya dijamin tidak pernah
     berjendela sehingga tabrakan pintu-jendela tidak mungkin terjadi lagi. */
  houseWindowSet(fp,doorBlocks,minX,maxX,minZ,maxZ){
    const K=(x,z)=>x+','+z;
    const inF=(x,z)=>fp.has(K(x,z));
    const isCorner=(x,z)=>(x===minX||x===maxX)&&(z===minZ||z===maxZ);
    const win=new Set();
    /* [normal keluar x,z] + [arah menelusuri sisi x,z] */
    const SIDES=[[0,-1,1,0],[0,1,1,0],[-1,0,0,1],[1,0,0,1]];
    for(const [ox,oz,tx,tz] of SIDES){
      /* kolom yang menghadap keluar pada sisi ini */
      const face=new Set();
      for(const k of fp){
        const [x,z]=k.split(',').map(Number);
        if(!inF(x+ox,z+oz))face.add(K(x,z));
      }
      /* telusuri tiap deretan kontinu dari kolom paling awal */
      for(const k of face){
        const [sx,sz]=k.split(',').map(Number);
        if(face.has(K(sx-tx,sz-tz)))continue;        // bukan awal deretan
        let x=sx,z=sz,slot=0;
        while(face.has(K(x,z))){
          const kk=K(x,z);
          if(isCorner(x,z)||(doorBlocks&&doorBlocks.has(kk))){
            slot=0;                                  // pemutus: mulai potongan baru
          }else{
            if(slot===0)win.add(kk);
            slot=(slot+1)%2;                         // berselang satu kolom
          }
          x+=tx;z+=tz;
        }
      }
    }
    return win;
  },

  /* Ubah ukuran modul sebuah record rumah tanpa memindahkan pusatnya.
     Dipakai saat HOUSE_SIZE dinaikkan (5 → 7): rumah yang sudah dibangun ikut
     tumbuh simetris ke segala arah, jadi pemain tidak kehilangan bangunannya.
     Pintu lama otomatis pindah ke kandidat terdekat pada sisi yang sama —
     tanpa ini posisi pintu lama menjadi dinding DALAM setelah rumah melebar,
     sehingga rumah tertutup rapat tanpa jalan masuk. */
  resizeHouseRec(rec,newS){
    const oldS=this.recSize(rec);
    if(oldS===newS){rec.s=newS;return rec;}
    const shift=Math.floor(newS/2)-Math.floor(oldS/2);
    rec.cells=rec.cells.map(c=>({bx:c.bx-shift,bz:c.bz-shift}));
    rec.s=newS;
    const side=(rec.door&&rec.door.side)||'s';
    const ox=rec.door?rec.door.x:rec.cells[0].bx;
    const oz=rec.door?rec.door.z:rec.cells[0].bz;
    const cand=this.doorCandidates(rec);
    let best=null,bd=1e9;
    for(const c of cand){
      /* sisi yang sama sangat diutamakan; jaraknya jadi penentu kedua */
      const d=(c.side===side?0:1000)+Math.hypot(c.x-ox,c.z-oz);
      if(d<bd){bd=d;best=c;}
    }
    if(best)rec.door={x:best.x,z:best.z,side:best.side};
    return rec;
  },

  writeHouseBlocks(rec,erase){
    const S=this.recSize(rec),H=this.HOUSE_H;
    const cells=rec.cells,door=rec.door,h=rec.y;
    const fp=new Set(),K=(x,z)=>x+','+z;
    for(const c of cells)
      for(let dx=0;dx<S;dx++)for(let dz=0;dz<S;dz++)
        fp.add(K(c.bx+dx,c.bz+dz));
    const inF=(x,z)=>fp.has(K(x,z));
    let minX=1e9,maxX=-1e9,minZ=1e9,maxZ=-1e9;
    for(const k of fp){const [x,z]=k.split(',').map(Number);
      if(x<minX)minX=x;if(x>maxX)maxX=x;if(z<minZ)minZ=z;if(z>maxZ)maxZ=z;}
    const put=(x,y,z,id)=>{
      const cur=World.getBlock(x,y,z);
      if(erase){if(cur===B.PLANK||cur===B.WOOD||cur===B.ROOF)World.setBlock(x,y,z,B.AIR);}
      else World.setBlock(x,y,z,id);
    };
    /* blok pintu: dua blok berdampingan di sisi `side` (ala desa dc & dc2) */
    const doorBlocks=new Set();
    if(door&&!erase){
      for(const [x,z] of this.doorPair(door)){
        const outward=door.side==='s'?!inF(x,z+1):door.side==='n'?!inF(x,z-1):
                      door.side==='e'?!inF(x+1,z):!inF(x-1,z);
        if(inF(x,z)&&outward)doorBlocks.add(K(x,z));
      }
    }
    /* lantai + dinding per kolom footprint.
       Lubang JENDELA dihitung oleh houseWindowSet(): letaknya menghindari tiang
       sudut DAN kolom pintu, jadi pintu tidak pernah "kebocoran" satu blok
       tambahan di atasnya (bug lama: pola selang-seling (lx+lz)%2 bisa jatuh
       tepat di kolom pintu sehingga lubangnya jadi setinggi 3 blok). */
    const winSet=erase?null:this.houseWindowSet(fp,doorBlocks,minX,maxX,minZ,maxZ);
    for(const k of fp){
      const [x,z]=k.split(',').map(Number);
      put(x,h-1,z,B.PLANK);                                 // lantai papan
      const openN=!inF(x,z-1),openS=!inF(x,z+1),
            openW=!inF(x-1,z),openE=!inF(x+1,z);
      if(!(openN||openS||openW||openE))continue;            // interior
      /* tiang sudut ala desa: HANYA sudut BBOX gabungan (rumus desa memakai
         lx/lz tepi bangunan). Uji tetangga-lokal membuat kolom pintu ikut
         terhitung sudut pada bentuk L/T sehingga lubang pintu tertutup. */
      const corner=((x===minX||x===maxX)&&(z===minZ||z===maxZ));
      const winY=this.windowRow();
      const isWin=!!winSet&&winSet.has(k);
      for(let wy2=0;wy2<H;wy2++){
        let id=B.PLANK;
        if(corner)id=B.WOOD;                                // tiang sudut
        else if(doorBlocks.has(k)&&wy2<2)id=B.AIR;          // lubang pintu
        else if(wy2===H-1)id=B.WOOD;                        // balok atas
        else if(wy2===winY&&isWin)id=B.AIR;                 // jendela
        put(x,h+wy2,z,id);
      }
    }
    /* atap ROOF bertangga + lisplang ov=1 (rumus desa, umum utk bentuk apa pun).
       Puncak atap DIBATASI batas dunia: rumah kini lebih tinggi (H=6) dan gugus
       gabungan yang lebar membuat lvl besar, sehingga tanpa batas ini lapisan
       teratas akan dibuang setBlock() dan meninggalkan lubang di puncak atap.
       Dengan clamp, atap hanya jadi datar di bagian atas — tetap tertutup. */
    const runLen=(x,z,dx,dz)=>{let n=0;while(inF(x+dx*n,z+dz*n))n++;return n;};
    const lvlMax=Math.max(0,CFG.WORLD_H-1-(h+H));
    for(const k of fp){
      const [x,z]=k.split(',').map(Number);
      const lvl=Math.min(Math.min(runLen(x,z,1,0),runLen(x,z,-1,0),
                                  runLen(x,z,0,1),runLen(x,z,0,-1))-1,lvlMax);
      for(let kk=0;kk<=lvl;kk++)put(x,h+H+kk,z,B.ROOF);
    }
    for(let x=minX-1;x<=maxX+1;x++)for(let z=minZ-1;z<=maxZ+1;z++){
      if(inF(x,z))continue;
      let near=false;
      for(let dx=-1;dx<=1&&!near;dx++)for(let dz=-1;dz<=1&&!near;dz++)
        if((dx||dz)&&inF(x+dx,z+dz))near=true;
      if(near)put(x,h+H,z,B.ROOF);                          // lisplang
    }

    /* Kelola objek 3D daun pintu ganda rumah di scene */
    if(erase){
      if(rec.doorMesh&&this.scene){
        this.scene.remove(rec.doorMesh);
        rec.doorMesh.traverse(o=>{if(o.isMesh&&o.geometry)o.geometry.dispose();});
        rec.doorMesh=null;
      }
    }else if(door&&typeof FurniCastle!=='undefined'&&FurniCastle.buildHouseDoor&&this.scene){
      if(rec.doorMesh){
        this.scene.remove(rec.doorMesh);
        rec.doorMesh.traverse(o=>{if(o.isMesh&&o.geometry)o.geometry.dispose();});
        rec.doorMesh=null;
      }
      const dm=FurniCastle.buildHouseDoor();
      let rotY=0,dx0=0,dz0=0;
      if(door.side==='s'){dx0=door.x+1.0;dz0=door.z+0.5;rotY=0;}
      else if(door.side==='n'){dx0=door.x+1.0;dz0=door.z+0.5;rotY=Math.PI;}
      else if(door.side==='e'){dx0=door.x+0.5;dz0=door.z+1.0;rotY=Math.PI/2;}
      else if(door.side==='w'){dx0=door.x+0.5;dz0=door.z+1.0;rotY=-Math.PI/2;}

      dm.position.set(dx0,h,dz0);
      dm.rotation.y=rotY;
      dm.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
      this.scene.add(dm);
      rec.doorMesh=dm;
      rec.doorMeshPos={x:dx0,y:h,z:dz0};
      if(rec.doorOpen===undefined)rec.doorOpen=false;
      rec.targetDoorProgress=rec.doorOpen?1.0:0.0;
      rec.doorProgress=rec.doorOpen?1.0:0.0;
    }
  },
  /* Pasang satu modul: blok (x,z) yang diklik menjadi BLOK TENGAH modul.
     Modul boleh bersinggungan ATAU bertumpuk sebagian dengan rumah yang sudah
     ada — semuanya digabung menjadi satu gugus dan footprint-nya di-union,
     jadi pemain bisa memperluas rumah per blok, bukan per kotak 5×5. */
  placeHouse(x,z,yaw){
    const S=this.HOUSE_SIZE;
    const {bx,bz}=this.cellAt(x,z);
    /* gugus yang bersinggungan/bertumpuk dengan modul calon */
    const hosts=this.houseNeighbors(bx,bz);
    /* kolom yang sudah menjadi bagian rumah-rumah itu tidak dinilai lagi
       (sudah ada lantai/dinding di sana) */
    let skipFp=null,skipY;
    if(hosts.length){
      skipFp=new Set();
      for(const h of hosts){
        for(const k of this.recFp(h))skipFp.add(k);
        if(skipY===undefined)skipY=h.y;
      }
      /* modul yang SELURUHNYA menimpa rumah yang ada = tidak menambah apa pun */
      let anyNew=false;
      for(let dx=0;dx<S&&!anyNew;dx++)for(let dz=0;dz<S&&!anyNew;dz++)
        if(!skipFp.has((bx+dx)+','+(bz+dz)))anyNew=true;
      if(!anyNew){UI.toast('🏠 Petak ini sudah jadi rumah');return null;}
    }
    const site=this.houseSiteCheck(bx,bz,skipFp,skipY);
    if(!site.ok){UI.toast(site.reason);return null;}
    /* arah pintu mengikuti rotasi ghost: 's'(+z) diputar per 90°.
       rotation.y positif = berlawanan jarum jam dilihat dari atas →
       +z berputar ke +x pada 90°. */
    const q=((Math.round((yaw||0)/(Math.PI/2))%4)+4)%4;
    const side=['s','e','n','w'][q];
    if(hosts.length){
      const host=hosts[0];
      /* jaring aman: gugus dari save lama yang belum dimigrasikan disamakan
         dulu ukurannya, karena cells satu gugus harus seragam */
      if(this.recSize(host)!==S)this.resizeHouseRec(host,S);
      /* hapus blok lama gugus host sebelum menulis komposisi baru supaya
         dinding batas lama ikut terbuka & atap tersusun ulang */
      this.writeHouseBlocks(host,true);
      host.cells.push({bx,bz});
      for(let i=1;i<hosts.length;i++){
        const other=hosts[i];
        if(this.recSize(other)!==S)this.resizeHouseRec(other,S);
        this.writeHouseBlocks(other,true);
        for(const c of other.cells)
          if(!host.cells.some(hc=>hc.bx===c.bx&&hc.bz===c.bz))host.cells.push(c);
        other.cells=[];                                     // kosongkan
        const oi=this.houses.indexOf(other);
        if(oi>=0)this.houses.splice(oi,1);
      }
      this.writeHouseBlocks(host,false);
      this.save();
      UI.toast('🏠 Rumah digabung — total '+host.cells.length+' petak');
      Sfx.craft&&Sfx.craft();
      return host;
    }
    /* rumah baru 1 modul, pintu sesuai rotasi ghost */
    const rec={cells:[{bx,bz}],door:this.defaultDoor(bx,bz,side),y:site.y,s:S};
    this.writeHouseBlocks(rec,false);
    this.houses.push(rec);
    this.save();

    // Geser entitas keluar dari dalam rumah agar tidak terjebak di dinding/tiang
    let safeX=bx+S/2, safeZ=bz+S/2;
    if(rec.door){
      safeX=rec.door.x+1.0; safeZ=rec.door.z+0.5;
      if(rec.door.side==='s') safeZ+=2.0;
      else if(rec.door.side==='n') safeZ-=2.0;
      else if(rec.door.side==='e') safeX+=2.0;
      else if(rec.door.side==='w') safeX-=2.0;
    }
    const safeY=(typeof World!=='undefined'&&World.groundAt)?World.groundAt(safeX,safeZ,site.y+4):site.y;
    this.displaceEntitiesFromBuilding(bx+S/2,site.y,bz+S/2,S,S,safeX,safeY,safeZ);

    return rec;
  },

  /* Geser karakter pemain, NPC, dan monster yang berada di dalam tapak bangunan baru ke luar area aman */
  displaceEntitiesFromBuilding(cx,cy,cz,sizeX,sizeZ,safeX,safeY,safeZ){
    const halfX=sizeX/2, halfZ=sizeZ/2;
    // 1. Karakter pemain
    if(typeof Player!=='undefined'&&Player.pos){
      if(Math.abs(Player.pos.x-cx)<=halfX+0.3 && Math.abs(Player.pos.z-cz)<=halfZ+0.3){
        Player.pos.set(safeX,safeY,safeZ);
        if(Player.vel)Player.vel.set(0,0,0);
        if(Player.mesh)Player.mesh.position.copy(Player.pos);
        if(typeof UI!=='undefined'&&UI.toast)UI.toast('🛡️ Karakter digeser ke area aman di luar bangunan');
      }
    }
    // 2. Penduduk desa / NPC rekan
    if(typeof NPCS!=='undefined'&&NPCS.list){
      for(const n of NPCS.list){
        if(!n.pos||n.dead)continue;
        if(Math.abs(n.pos.x-cx)<=halfX+0.5 && Math.abs(n.pos.z-cz)<=halfZ+0.5){
          const sx=safeX+(Math.random()-0.5)*3.0, sz=safeZ+(Math.random()-0.5)*3.0;
          const sy=(typeof World!=='undefined'&&World.groundAt)?World.groundAt(sx,sz,cy+4):safeY;
          n.pos.set(sx,sy,sz);
          if(n.vel)n.vel.set(0,0,0);
          if(n.mesh)n.mesh.position.copy(n.pos);
        }
      }
    }
    // 3. Mob / Pet
    if(typeof Monsters!=='undefined'&&Monsters.list){
      for(const m of Monsters.list){
        if(!m.pos||m.dead)continue;
        if(Math.abs(m.pos.x-cx)<=halfX+0.5 && Math.abs(m.pos.z-cz)<=halfZ+0.5){
          const sx=safeX+(Math.random()-0.5)*3.0, sz=safeZ+(Math.random()-0.5)*3.0;
          const sy=(typeof World!=='undefined'&&World.groundAt)?World.groundAt(sx,sz,cy+4):safeY;
          m.pos.set(sx,sy,sz);
          if(m.vel)m.vel.set(0,0,0);
          if(m.mesh)m.mesh.position.copy(m.pos);
        }
      }
    }
  },

  remove(f,drop){
    const i=this.list.indexOf(f);
    if(i<0)return;
    this.list.splice(i,1);
    this.scene.remove(f.mesh);
    f.mesh.traverse(o=>{if(o.isMesh&&o.geometry)o.geometry.dispose();});

    // 1. Furnitur dihancurkan: jatuhkan kembali item furnitur ke tanah agar bisa diambil lagi
    if(drop && this.DEFS[f.def]){
      const itm = this.DEFS[f.def].item;
      if(itm){
        if(typeof World !== 'undefined' && World.dropItem){
          World.dropItem(f.x, f.y + 0.45, f.z, itm, 1, {owner:true});
        } else {
          RPG.addItem(itm, 1);
        }
      }
    }

    // 2. PETI DIHANCURKAN: SELURUH isinya keluar tumpah berserakan ke tanah!
    if(drop && f.inv){
      for(const s of f.inv){
        if(!s || !s.id || s.n <= 0) continue;
        const rx = f.x + (Math.random() - 0.5) * 0.7;
        const rz = f.z + (Math.random() - 0.5) * 0.7;
        const ry = f.y + 0.45 + Math.random() * 0.35;
        if(typeof World !== 'undefined' && World.dropItem){
          World.dropItem(rx, ry, rz, s.id, s.n, {owner:true, lvl:s.lvl, mark:s.mark});
        } else {
          RPG.addItem(s.id, s.n, s.lvl, s.mark);
        }
      }
      f.inv = [];
    }

    // 3. SMELTER DIHANCURKAN: batu bara, ore, & ingot yang tersisa keluar tumpah ke tanah!
    if(drop && f.smelter){
      const sm = f.smelter;
      const dropSm = (id, count) => {
        if(!id || count <= 0) return;
        const rx = f.x + (Math.random() - 0.5) * 0.6;
        const rz = f.z + (Math.random() - 0.5) * 0.6;
        if(typeof World !== 'undefined' && World.dropItem) {
          World.dropItem(rx, f.y + 0.45, rz, id, count, {owner:true});
        } else {
          RPG.addItem(id, count);
        }
      };
      if(sm.fuelCoal > 0) { dropSm('coal', sm.fuelCoal); sm.fuelCoal = 0; }
      if(sm.oreType && sm.oreCount > 0) { dropSm(sm.oreType, sm.oreCount); sm.oreCount = 0; sm.oreType = null; }
      if(sm.outType && sm.outCount > 0) { dropSm(sm.outType, sm.outCount); sm.outCount = 0; sm.outType = null; }
    }

    if(this.chest===f){this.chest=null;if(UI.open==='chest')UI.toggle('chest');}
    if(typeof Smelter !== 'undefined' && Smelter.currentFurni === f){
      Smelter.closeUI();
    }
    if(f.akey){
      /* drop=true berarti dihancurkan pemain → jangan dibangkitkan lagi.
         drop=false hanya pembersihan jarak oleh populate(), jadi isi peti
         disimpan supaya tetap ada saat pemain kembali. */
      if(drop){this.dead[f.akey]=1;delete this.vaults[f.akey];}
      else if(f.inv)this.vaults[f.akey]=f.inv.map(s=>s?this._vaultSlot(s):null);
      this.save();
    }else if(!f.auto)this.save();

    if(f.def&&f.def.startsWith('fence')&&typeof FurniCastle!=='undefined')FurniCastle.rebuildFences();
  },
  /* perabot terdekat yang masih dalam radius interaksinya sangat dekat & searah hadap pemain
     (perabot dekorasi tanpa aksi dilewati) */
  nearest(pos){
    let best=null,bd=1e9;
    const pFacing = (typeof Player !== 'undefined' && Player.facing !== undefined) ? Player.facing : null;
    for(const f of this.list){
      const def=this.DEFS[f.def];
      if(!def||def.decor)continue;
      if(f.def && f.def.startsWith('castle')) continue; // Kastil ditangani khusus oleh nearestGate (daun pintu) & throneSeat (tahta)
      const r=def.r;
      const dx = f.x - pos.x, dz = f.z - pos.z;
      const d=Math.hypot(dx, dz);
      const isChest = (f.def === 'wreck_chest' || f.def === 'dchest' || f.def === 'bchest');
      const maxDy = isChest ? 4.2 : 2.0;
      if(d>r||Math.abs(f.y-pos.y)>maxDy)continue;
      let anglePen = 0;
      if(pFacing !== null){
        let diff = Math.abs(Math.atan2(dx, dz) - pFacing);
        if(diff > Math.PI) diff = Math.PI * 2 - diff;
        if(diff > 1.4 && (!isChest || d > 2.5)) continue; // peti tetap bisa dibuka walau sudut hadap agak miring
        anglePen = diff * 0.35;
      }
      const score = d + anglePen - (isChest ? 0.8 : 0);
      if(score < bd){ best = f; bd = score; }
    }
    return best;
  },
  /* apakah pemain berada dekat dengan perabot tipe tertentu (mis. stove / workbench) */
  isNear(defId, pos, maxDist = 3.8){
    if(!this.list || !pos) return false;
    for(const f of this.list){
      if(f.def === defId){
        const d = Math.hypot(f.x - pos.x, f.z - pos.z);
        if(d <= maxDist && Math.abs(f.y - pos.y) < 3.2) return true;
      }
    }
    return false;
  },
  interact(f){
    if(!f)return;
    const def=this.DEFS[f.def];
    if(!def||def.decor||!def.use)return;
    def.use(f);
  },

  /* ---------- MODE PENEMPATAN dari item di hotbar ----------
      alur: beginPlace → KLIK tanah memindahkan ghost (moveGhostTo) →
      rotatePlace / confirmPlace / cancelPlace. Ghost tidak lagi mengikuti
      kamera; pemain menunjuk langsung posisi yang diinginkan.
      PLACE_R = radius maksimum pemasangan dari pemain; klik yang lebih jauh
      di-clamp ke tepi radius sehingga ghost selalu merespons tapi tidak
      pernah bisa dipasang jauh dari pemain. */
  PLACE_R:10,
  placeFromHand(){
    const s=RPG.hotbar[RPG.sel];
    if(!s||!ITEMS[s.id].place)return false;
    this.beginPlace(ITEMS[s.id].place);
    return true;
  },
  beginPlace(defId, sourceSlot){
    const def=this.DEFS[defId];
    if(!def)return;
    this.cancelPlace();                       // pastikan tidak ada ghost tersisa
    this.placing=defId;
    this.placingSlot=(sourceSlot!==undefined)?sourceSlot:null;
    /* orientasi awal menghadap pemain; bisa diputar. Posisi awal di depan
       pemain, lalu dipindah-pindah lewat klik. */
    this.placeYaw=Math.round((Cam.yaw+Math.PI)/(Math.PI/2))*(Math.PI/2);
    this.placeTarget=this.defaultTarget();
    const g=def.build();
    g.traverse(o=>{
      if(o.isMesh){
        o.castShadow=false;o.receiveShadow=false;
        o.material=o.material.clone();
        o.material.transparent=true;
        o.material.opacity=0.55;
        o.material.depthWrite=false;
        this.ghostMats.push(o.material);
      }
    });
    this.ghost=g;
    this.scene.add(g);
    /* bar kontrol pasang: putar / pasang / batal */
    const bar=document.createElement('div');
    bar.id='place-bar';
    bar.innerHTML=`<button id="pb-rot">🔄 Putar</button>`+
      `<button id="pb-ok">✔ Pasang</button>`+
      `<button id="pb-x">✖ Batal</button>`;
    document.body.appendChild(bar);
    bar.querySelector('#pb-rot').addEventListener('click',e=>{e.stopPropagation();this.rotatePlace();});
    bar.querySelector('#pb-ok').addEventListener('click',e=>{e.stopPropagation();this.confirmPlace();});
    bar.querySelector('#pb-x').addEventListener('click',e=>{e.stopPropagation();this.cancelPlace();});
    this.placeBar=bar;
    UI.toast(`📦 Memasang ${def.n} — klik tanah utk geser · Putar/Pasang/Batal di bawah`);
    this.updateGhost();
  },
  /* posisi awal ghost: di depan pemain mengikuti arah kamera */
  defaultTarget(){
    const yaw=Cam.yaw;
    let dist=1.6;
    if(this.placing==='boat') dist=3.4;
    else if(this.placing&&this.placing.startsWith('castle')){
      const tier=parseInt(this.placing.replace('castle',''))||1;
      const size=(typeof FurniCastle!=='undefined')?FurniCastle.getCastleSize(tier):14;
      dist=size*0.6;
    }
    const tx=Math.floor(Player.pos.x-Math.sin(yaw)*dist)+0.5;
    const tz=Math.floor(Player.pos.z-Math.cos(yaw)*dist)+0.5;
    return {x:tx,y:this.surfaceAt(tx,tz),z:tz};
  },
  /* tinggi permukaan kolom (x,z) utk perabot yg sedang dipasang; -1 bila tak ada.

     BUGFIX "properti terpasang di atas genteng":
     Versi lama memindai dari PUNCAK DUNIA ke bawah dan berhenti di blok pertama
     yang bukan udara/air — B.ROOF ikut terhitung. Akibatnya memasang landasan
     tempa (atau perabot apa pun) di DALAM rumah menaruhnya di atas atap, di
     luar jangkauan pemain (nearest() & hitNearest() memakai batas |f.y-pos.y|),
     jadi barangnya praktis hilang.

     Sekarang lantai dicari memakai World.groundAt() — satu-satunya definisi
     "lantai" di game ini, yang memang sudah mengecualikan atap/kanopi/batang —
     dan pemindaian dimulai dari SETINGGI KEPALA PEMAIN, bukan dari langit.
     Dengan begitu:
       - di dalam rumah  → dapat lantai papan tempat pemain berdiri
       - di bawah lisplang / kanopi pohon → tetap dapat tanah
       - di rumah bertingkat → dapat lantai tingkat yang sedang dipijak
     Bila pemindaian ternyata dimulai DI DALAM blok padat (mis. pemain di kaki
     tebing menunjuk puncaknya), pemindaian diulang dari puncak dunia. */
  surfaceAt(tx,tz){
    if(this.placing==='boat')
      return World.inWaterAt(tx,CFG.WATER_Y-0.2,tz)
        ?CFG.WATER_Y+this.BOAT_SINK*this.BOAT_SCALE:-1;
    const bx=Math.floor(tx),bz=Math.floor(tz);
    const solid=(y)=>{
      const b=World.getBlock(bx,y,bz);
      return b!==B.AIR&&b!==B.WATER&&b!==B.ROOF;
    };
    /* 1. dari setinggi kepala pemain (mencakup interior rumah) */
    const head=Math.floor(Player.pos.y)+2;
    let y=World.groundAt(tx,tz,head);
    /* 2. mulai terbenam di dalam terrain → ulangi dari puncak dunia */
    if(y>0&&solid(y))y=World.groundAt(tx,tz,CFG.WORLD_H-1);
    return y>0?y:-1;
  },
  /* validitas posisi target saat ini (this.placeTarget) */
  computeValid(){
    const p=this.placeTarget;
    if(!p||!this.placing)return {valid:false,reason:''};
    let valid=true,reason='';
    const isCastle=this.placing&&this.placing.startsWith('castle');
    const maxR=isCastle?28:(this.PLACE_R+0.6);
    /* pemasangan harus dalam jangkauan pemain (PLACE_R) */
    if(Math.hypot(p.x-Player.pos.x,p.z-Player.pos.z)>maxR){
      valid=false;reason=`Terlalu jauh dari pemain (maks ${Math.round(maxR)} blok)`;
    }
    /* jangkauan TEGAK */
    else if(this.placing!=='boat'&&!isCastle&&p.y>=0&&Math.abs(p.y-Player.pos.y)>2.6){
      valid=false;reason='📏 Terlalu tinggi/rendah — dekati permukaannya';
    }
    else if(this.placing==='house'){
      /* RUMAH: blok yang ditunjuk = BLOK TENGAH modul (bebas per blok, tidak
         lagi dipatok ke grid 5×5). Boleh bersinggungan/bertumpuk sebagian
         dengan rumah sendiri (justru itu tujuannya) selama masih menambah
         kolom baru, dan tanah di kolom baru itu harus rata. */
      const {bx,bz}=this.cellAt(p.x,p.z);
      const hosts=this.houseNeighbors(bx,bz);
      let skipFp=null,skipY;
      if(hosts.length){
        skipFp=new Set();
        for(const h of hosts){
          for(const k of this.recFp(h))skipFp.add(k);
          if(skipY===undefined)skipY=h.y;
        }
        const S=this.HOUSE_SIZE;
        let anyNew=false;
        for(let dx=0;dx<S&&!anyNew;dx++)for(let dz=0;dz<S&&!anyNew;dz++)
          if(!skipFp.has((bx+dx)+','+(bz+dz)))anyNew=true;
        if(!anyNew)return {valid:false,reason:'🏠 Petak ini sudah jadi rumah'};
      }
      const site=this.houseSiteCheck(bx,bz,skipFp,skipY);
      if(!site.ok){valid=false;reason=site.reason;}
      return {valid,reason};
    }
    else if(isCastle){
      const tier=parseInt(this.placing.replace('castle',''))||1;
      if(typeof FurniCastle!=='undefined'&&FurniCastle.castleSiteCheck){
        const site=FurniCastle.castleSiteCheck(p.x,p.z,tier);
        if(!site.ok){valid=false;reason=site.reason;}
      }
    }
    else if(this.placing.startsWith('fence')){
      if(typeof FurniCastle!=='undefined'&&FurniCastle.fenceSiteCheck){
        const site=FurniCastle.fenceSiteCheck(p.x,p.z);
        if(!site.ok){valid=false;reason=site.reason;}
      }
    }
    else if(this.placing.startsWith('gate')){
      const tier=parseInt(this.placing.replace('gate',''))||1;
      const axis=(Math.abs(Math.cos(this.placeYaw)) > 0.7)?'x':'z';
      if(typeof FurniCastle!=='undefined'&&FurniCastle.gateSiteCheck){
        const site=FurniCastle.gateSiteCheck(p.x,p.z,tier,axis);
        if(!site.ok){valid=false;reason=site.reason;}
      }
    }
    else if(this.placing==='boat'){
      if(!World.inWaterAt(p.x,CFG.WATER_Y-0.2,p.z)){valid=false;reason='🛶 Perahu hanya bisa di air';}
    }else if(p.y<0){valid=false;reason='Tidak ada permukaan di sini';}
    else if(p.y<CFG.WATER_Y){valid=false;reason='🌊 Tidak bisa memasang di dalam air';}
    if(valid){
      for(const f of this.list){
        if(isCastle&&f.def&&f.def.startsWith('castle')){
          if(Math.hypot(f.x-p.x,f.z-p.z)<12){valid=false;reason='Terlalu dekat dengan kastil lain';break;}
        }else if(!isCastle&&Math.hypot(f.x-p.x,f.z-p.z)<0.9){
          valid=false;reason='Sudah ada perabot di situ';break;
        }
      }
    }
    return {valid,reason};
  },
  updateGhost(){
    if(!this.placing||!this.ghost)return;
    /* kondisi tak lagi memungkinkan → batalkan */
    if(Player.dead||this.riding){this.cancelPlace();return;}
    if(typeof UI!=='undefined'&&UI.open){this.cancelPlace();return;}
    /* item di tangan atau slot furnitur berubah/habis → batalkan otomatis */
    let s=null;
    if(this.placingSlot!==null&&this.placingSlot!==undefined&&RPG.furniBag&&RPG.furniBag[this.placingSlot]){
      const cs=RPG.furniBag[this.placingSlot];
      if(cs&&ITEMS[cs.id]&&ITEMS[cs.id].place===this.placing)s=cs;
    }
    if(!s&&RPG.furniBag){
      const fi=RPG.furniBag.findIndex(cs=>cs&&ITEMS[cs.id]&&ITEMS[cs.id].place===this.placing);
      if(fi>=0){s=RPG.furniBag[fi];this.placingSlot=fi;}
    }
    if(!s&&RPG.hotbar){
      const hs=RPG.hotbar[RPG.sel];
      if(hs&&ITEMS[hs.id]&&ITEMS[hs.id].place===this.placing)s=hs;
    }
    if(!s){this.cancelPlace();return;}
    if(!this.placeTarget)this.placeTarget=this.defaultTarget();
    const v=this.computeValid();
    this.placeValid=v.valid;
    const p=this.placeTarget;
    /* RUMAH: ghost di-snap ke pusat modul (blok yang ditunjuk = blok tengah)
       supaya preview = hasil akhir. Rotasi TIDAK dinolkan di sini (dulu inilah
       penyebab tombol 🔄 Putar terasa mati — updateGhost menimpanya tiap frame);
       placeYaw dipertahankan dan ikut menentukan arah pintu saat dipasang. */
    if(this.placing==='house'){
      const {bx,bz}=this.cellAt(p.x,p.z);
      const c=this.cellCenter(bx,bz);
      /* tinggi ghost: pakai lantai gugus yang bersinggungan bila ada (supaya
         preview sejajar rumah yang akan digabung), kalau tidak ukur tanahnya */
      const hosts=this.houseNeighbors(bx,bz);
      let gy;
      if(hosts.length)gy=hosts[0].y;
      else{
        const site=this.houseSiteCheck(bx,bz);
        gy=site.ok?site.y:Player.pos.y;
      }
      this.ghost.position.set(c.x,gy,c.z);
      this.ghost.rotation.y=this.placeYaw;
    }else if(this.placing&&this.placing.startsWith('castle')){
      const tier=parseInt(this.placing.replace('castle',''))||1;
      const snapX=Math.round(p.x), snapZ=Math.round(p.z);
      let gy=p.y;
      if(typeof FurniCastle!=='undefined'&&FurniCastle.castleSiteCheck){
        const site=FurniCastle.castleSiteCheck(snapX,snapZ,tier);
        if(site.ok)gy=site.y;
      }
      this.ghost.position.set(snapX,gy,snapZ);
      this.ghost.rotation.y=this.placeYaw;
    }else{
      this.ghost.position.set(p.x,p.y>=0?p.y:Player.pos.y,p.z);
      this.ghost.rotation.y=this.placeYaw;
    }
    const em=v.valid?0x245c24:0x6b1a12;
    for(const m of this.ghostMats){if(m.emissive)m.emissive.setHex(em);}
  },
  /* pindahkan ghost ke titik yang diklik: kamera → ray, lalu raycast langsung
      ke MESH CHUNK (semua grup chunk yang termuat di scene).
      BUGFIX #1: versi paling awal raycast ke `World.group.children` yang kosong
      (chunk ditempel langsung ke Game.scene) → ghost tak pernah pindah.
      BUGFIX #2: kamera game ini diparkir jauh dari pemain (Cam.DIST puluhan
      blok, y kamera tinggi). Voxel-DDA yang mulai dari posisi kamera langsung
      gagal karena guard `y>=WORLD_H+8` terpenuhi di titik awal. Raycast mesh
      Three.js menangani jarak jauh dengan benar — baik saat kamera ortografik
      (versi lama) maupun perspektif (sekarang) — plus culling bounding-box
      sehingga tetap murah.
      Dipanggil dari Input saat klik/tap di area dunia selama mode pasang. */
  moveGhostTo(clientX,clientY){
    if(!this.placing||!this.ghost)return;
    const nx=(clientX/window.innerWidth)*2-1;
    const ny=-(clientY/window.innerHeight)*2+1;
    const ray=new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(nx,ny),Cam.cam);
    /* kumpulkan semua grup chunk yang sedang termuat */
    const groups=[];
    for(const c of World.chunks.values())if(c.group)groups.push(c.group);
    const hits=ray.intersectObjects(groups,true);
    if(!hits.length)return;
    /* RUMAH MODULAR: abaikan hit pada blok milik rumah sendiri (dinding/atap/
       lisplang). Lisplang menjulur 1 blok keluar footprint — tanpa ini, klik
       tanah di samping rumah sering mengenai lisplang dulu sehingga ghost
       "bergeser" ke petak yang salah. Ray diteruskan ke hit berikutnya.
       Margin 1 blok memakai footprint NYATA (recHasBlock), bukan kotak grid,
       karena modul kini bisa berada di posisi blok mana pun. */
    const inOwnedHouse=(wx,wz)=>{
      for(const hrec of this.houses)
        for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)
          if(this.recHasBlock(hrec,wx+dx,wz+dz))return true;
      return false;
    };
    /* blok yang benar-benar tertumbuk: titik hit berada di PERMUKAAN blok, jadi
       digeser sedikit MASUK melawan arah normal untuk mendapat kubusnya. */
    const hitBlock=(cand)=>{
      const p=cand.point,n=(cand.face&&cand.face.normal)||{x:0,y:0,z:0};
      return World.getBlock(Math.floor(p.x-n.x*0.5),
                            Math.floor(p.y-n.y*0.5),
                            Math.floor(p.z-n.z*0.5));
    };
    let h=null;
    const pPos = (typeof Player !== 'undefined' && Player.pos) ? Player.pos : { x: 0, y: 5, z: 0 };
    const inside = !!(typeof World !== 'undefined' && World.insideHouse) ||
                   !!(typeof Furni !== 'undefined' && Furni.houseNear && Furni.houseNear(pPos));

    for(const cand of hits){
      const p2=cand.point;
      const cbx=Math.floor(p2.x),cbz=Math.floor(p2.z);
      if(this.placing==='house'&&inOwnedHouse(cbx,cbz))continue;
      /* ---------- ATAP DILEWATI ----------
         BUGFIX "properti terpasang di atas genteng": saat pemain berada DI DALAM
         rumah, atap dibuat transparan oleh shader sehingga tidak terlihat. */
      if(hitBlock(cand)===B.ROOF)continue;
      /* langit-langit / dinding atas di atas kepala juga dilewati */
      const inHouse = inOwnedHouse(cbx, cbz) || inside;
      if(inHouse && (p2.y > pPos.y + 1.25 || Math.floor(p2.y) > pPos.y + 1.15)) continue;
      if(p2.y>pPos.y+2.4)continue;
      h=cand;break;
    }
    if(!h)return;
    const pt=h.point;
    let bx=Math.floor(pt.x),bz=Math.floor(pt.z);
    /* klik dinding (sisi samping): geser target ke sel udara di depan dinding
       (mengikuti normal face dunia — grup chunk ada di origin jadi normal sudah
       dunia) supaya ghost jatuh di KAKI dinding, bukan di atas atapnya */
    const fn=h.face&&h.face.normal;
    if(fn&&Math.abs(fn.y)<0.5){
      bx=Math.floor(pt.x+fn.x*0.6);
      bz=Math.floor(pt.z+fn.z*0.6);
    }
    const tx=bx+0.5,tz=bz+0.5;
    /* jarak pasang maksimum dari pemain */
    const dp=Math.hypot(tx-Player.pos.x,tz-Player.pos.z);
    const maxR=(this.placing&&this.placing.startsWith('castle'))?28:this.PLACE_R;
    if(dp>maxR){
      UI.toast(`📏 Terlalu jauh — mendekatlah (maks ${Math.round(maxR)} blok)`);
      return;
    }
    this.placeTarget={x:tx,y:this.surfaceAt(tx,tz),z:tz};
    this.updateGhost();
    Sfx.click();
  },
  rotatePlace(){
    if(!this.placing)return;
    this.placeYaw=(this.placeYaw+Math.PI/2)%(Math.PI*2);
    if(this.ghost)this.ghost.rotation.y=this.placeYaw;
    Sfx.click();
  },
  confirmPlace(){
    if(!this.placing)return;
    const v=this.computeValid();
    if(!v.valid){UI.toast('❌ '+(v.reason||'Tidak bisa meletakkan di sini'));return;}
    const defId=this.placing;

    // Cari sumber item: dari RPG.furniBag (placingSlot) atau fallback hotbar
    let s=null, sourceArr=null, sourceIdx=-1;
    if(this.placingSlot!==null&&this.placingSlot!==undefined&&RPG.furniBag&&RPG.furniBag[this.placingSlot]){
      const cs=RPG.furniBag[this.placingSlot];
      if(cs&&ITEMS[cs.id]&&ITEMS[cs.id].place===defId){
        s=cs;sourceArr=RPG.furniBag;sourceIdx=this.placingSlot;
      }
    }
    if(!s&&RPG.furniBag){
      const fi=RPG.furniBag.findIndex(cs=>cs&&ITEMS[cs.id]&&ITEMS[cs.id].place===defId);
      if(fi>=0){s=RPG.furniBag[fi];sourceArr=RPG.furniBag;sourceIdx=fi;this.placingSlot=fi;}
    }
    if(!s){
      const hs=RPG.hotbar[RPG.sel];
      if(hs&&ITEMS[hs.id]&&ITEMS[hs.id].place===defId){
        s=hs;sourceArr=RPG.hotbar;sourceIdx=RPG.sel;
      }
    }
    if(!s){this.cancelPlace();return;}

    const p=this.placeTarget;
    this.place(defId,p.x,p.y,p.z,this.placeYaw,false);
    s.n--;
    if(s.n<=0){
      sourceArr[sourceIdx]=null;
      if(sourceArr===RPG.furniBag&&RPG.selectedFurniSlot===sourceIdx)RPG.selectedFurniSlot=-1;
    }
    Sfx.craft();
    FX.debris(new THREE.Vector3(p.x,p.y+0.4,p.z),0xd6b06a,8,1.6);
    UI.toast(`${this.DEFS[defId].e} ${this.DEFS[defId].n} diletakkan`);
    UI.renderHotbar();
    if(sourceArr===RPG.furniBag&&UI.renderFurniBag)UI.renderFurniBag();

    /* Struktur modular/berantai (pagar, gerbang, rumah): pertahankan mode pasang jika masih ada modul di tangan */
    const isModular = defId==='house'||defId.startsWith('fence')||defId.startsWith('gate');
    if(isModular && s && s.n>0){
      this.placeTarget=this.defaultTarget();
      this.updateGhost();
      return;
    }
    this.cancelPlace();
  },
  cancelPlace(){
    if(this.ghost){
      this.scene.remove(this.ghost);
      this.ghost.traverse(o=>{
        if(o.isMesh){if(o.geometry)o.geometry.dispose();
          if(o.material&&o.material.dispose)o.material.dispose();}
      });
      this.ghost=null;
    }
    this.ghostMats=[];
    if(this.placeBar){this.placeBar.remove();this.placeBar=null;}
    this.placing=null;this.placingSlot=null;this.placePos=null;this.placeTarget=null;this.placeValid=false;
  },

  /* =========================================================================
     ATUR PINTU (pintu bisa dipindah setelah rumah berdiri)
     -------------------------------------------------------------------------
     KENAPA POLA "SATU KETUK + LANGKAH", bukan seret/gestur:
     Kontrol yang andal di PC DAN mobile adalah satu ketukan pada sasaran
     sebesar blok — bukan seret (di mobile jempol menutupi sasaran), bukan
     gestur multi-jari (bentrok dengan putar/zoom kamera dua jari), bukan menu
     bertingkat (lambat di kedua platform). Karena itu mode ini menyediakan DUA
     jalur yang keduanya jalan di mana pun:

       1) TUNJUK  — klik/tap dinding luar rumah → lubang pintu pindah ke situ.
                    Sasarannya seukuran blok di layar, cukup besar untuk jempol.
       2) ◀ / ▶   — melangkah antar posisi pintu yang SAH tanpa membidik sama
                    sekali. Ini jaring pengaman mobile (jempol menutupi dinding,
                    layar kecil) dan juga lebih cepat di PC.

     Keduanya menulis ke state yang sama, lalu ✔ menerapkan & ✖ membatalkan —
     pola yang sudah dipakai bar penempatan perabot, jadi terasa konsisten dan
     tidak menambah hal baru untuk dipelajari.
     ========================================================================= */
  /* Interaksi pintu ganda rumah kayu (buka / tutup dengan animasi smooth) */
  nearestHouseDoor(pos, facing, maxD=3.2){
    if(!this.houses||!this.houses.length)return null;
    let best=null, bd=1e9;
    for(const h of this.houses){
      if(!h.doorMeshPos)continue;
      const dx=h.doorMeshPos.x-pos.x, dz=h.doorMeshPos.z-pos.z;
      const d=Math.hypot(dx,dz);
      if(d>maxD)continue;
      if(facing!==undefined){
        let diff=Math.abs(Math.atan2(dx,dz)-facing);
        if(diff>Math.PI)diff=Math.PI*2-diff;
        if(d>1.8&&diff>1.45)continue;
      }
      if(d<bd){
        bd=d;
        best={house:h, d, pos:new THREE.Vector3(h.doorMeshPos.x, h.doorMeshPos.y+1.2, h.doorMeshPos.z)};
      }
    }
    return best;
  },

  toggleHouseDoor(h){
    if(!h)return;
    h.doorOpen=!h.doorOpen;
    h.targetDoorProgress=h.doorOpen?1.0:0.0;
    if(typeof Sfx!=='undefined'&&Sfx.craft)Sfx.craft();
    if(typeof UI!=='undefined'&&UI.toast){
      UI.toast(h.doorOpen?"🚪 Pintu rumah dibuka":"🔒 Pintu rumah ditutup");
    }
    this.save();
  },

  doorEdit:null,
  /* apakah pemain berada di dalam / menempel rumahnya sendiri? (untuk
     memunculkan aksi "Atur Pintu"). Margin 1 blok supaya berdiri di depan
     pintu pun sudah cukup. */
  houseNear(pos){
    const x=Math.floor(pos.x),z=Math.floor(pos.z);
    for(const h of this.houses)
      for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)
        if(this.recHasBlock(h,x+dx,z+dz))return h;
    return null;
  },
  /* Semua posisi pintu yang SAH untuk satu gugus: pasangan 2 blok berdampingan
     di dinding LUAR, dan bukan tiang sudut — sudut selalu ditulis B.WOOD oleh
     writeHouseBlocks sehingga lubang pintu di sana akan tertutup lagi. */
  doorCandidates(rec){
    const fp=this.recFp(rec);
    const inF=(x,z)=>fp.has(x+','+z);
    let minX=1e9,maxX=-1e9,minZ=1e9,maxZ=-1e9;
    for(const k of fp){const [x,z]=k.split(',').map(Number);
      if(x<minX)minX=x;if(x>maxX)maxX=x;if(z<minZ)minZ=z;if(z>maxZ)maxZ=z;}
    const isCorner=(x,z)=>(x===minX||x===maxX)&&(z===minZ||z===maxZ);
    /* [side, arah luar, arah pasangan] */
    const SIDES=[['s',0,1,1,0],['n',0,-1,1,0],['e',1,0,0,1],['w',-1,0,0,1]];
    const out=[];
    for(const k of fp){
      const [x,z]=k.split(',').map(Number);
      for(const [side,ox,oz,px,pz] of SIDES){
        if(inF(x+ox,z+oz))continue;                 // bukan dinding luar sisi ini
        const x2=x+px,z2=z+pz;
        if(!inF(x2,z2)||inF(x2+ox,z2+oz))continue;  // pasangan harus sedinding
        if(isCorner(x,z)||isCorner(x2,z2))continue; // tiang sudut
        out.push({x,z,side});
      }
    }
    /* urutkan searah jarum jam per sisi supaya ◀ ▶ terasa berjalan mengelilingi
       rumah, bukan melompat-lompat acak */
    const ord={n:0,e:1,s:2,w:3};
    out.sort((a,b)=>(ord[a.side]-ord[b.side])||(a.x-b.x)||(a.z-b.z));
    return out;
  },
  beginDoorEdit(){
    const rec=this.houseNear(Player.pos);
    if(!rec){UI.toast('🚪 Berdirilah di rumahmu dulu');return;}
    this.cancelPlace();
    const cand=this.doorCandidates(rec);
    if(!cand.length){UI.toast('🚪 Tidak ada dinding yang bisa dijadikan pintu');return;}
    /* mulai dari pintu yang sekarang bila masih sah */
    let idx=0;
    if(rec.door)for(let i=0;i<cand.length;i++)
      if(cand[i].x===rec.door.x&&cand[i].z===rec.door.z&&cand[i].side===rec.door.side){idx=i;break;}
    this.doorEdit={rec,cand,idx,marker:null};
    /* penanda tembus pandang di posisi pintu terpilih */
    const mat=new THREE.MeshBasicMaterial({color:0x7cf08a,transparent:true,
      opacity:0.45,depthWrite:false});
    const mk=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),mat);
    mk.renderOrder=5;
    this.doorEdit.marker=mk;
    this.scene.add(mk);
    const bar=document.createElement('div');
    bar.id='door-bar';
    bar.innerHTML=`<button id="db-prev">◀</button>`+
      `<span id="db-info"></span>`+
      `<button id="db-next">▶</button>`+
      `<button id="db-ok">✔ Terapkan</button>`+
      `<button id="db-x">✖ Batal</button>`;
    document.body.appendChild(bar);
    bar.querySelector('#db-prev').addEventListener('click',e=>{e.stopPropagation();this.stepDoor(-1);});
    bar.querySelector('#db-next').addEventListener('click',e=>{e.stopPropagation();this.stepDoor(1);});
    bar.querySelector('#db-ok').addEventListener('click',e=>{e.stopPropagation();this.applyDoorEdit();});
    bar.querySelector('#db-x').addEventListener('click',e=>{e.stopPropagation();this.cancelDoorEdit();});
    this.doorBar=bar;
    UI.toast('🚪 Ketuk dinding luar untuk memindah pintu · atau pakai ◀ ▶');
    this.updateDoorMarker();
  },
  stepDoor(d){
    const D=this.doorEdit;if(!D)return;
    D.idx=((D.idx+d)%D.cand.length+D.cand.length)%D.cand.length;
    this.updateDoorMarker();
    Sfx.click();
  },
  /* pilih kandidat pintu TERDEKAT dari titik yang diklik/ditap. Memakai jarak
     ke titik tengah pasangan pintu, jadi ketukan yang agak melenceng tetap
     mendarat di dinding yang dimaksud (penting untuk jempol di mobile). */
  pickDoorAt(clientX,clientY){
    const D=this.doorEdit;if(!D)return;
    const nx=(clientX/window.innerWidth)*2-1;
    const ny=-(clientY/window.innerHeight)*2+1;
    const ray=new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(nx,ny),Cam.cam);
    const groups=[];
    for(const c of World.chunks.values())if(c.group)groups.push(c.group);
    const hits=ray.intersectObjects(groups,true);
    if(!hits.length)return;
    const p=hits[0].point;
    let best=-1,bd=1e9;
    for(let i=0;i<D.cand.length;i++){
      const c=D.cand[i],pr=this.doorPair(c);
      const mx=(pr[0][0]+pr[1][0])/2+0.5, mz=(pr[0][1]+pr[1][1])/2+0.5;
      const d=Math.hypot(mx-p.x,mz-p.z);
      if(d<bd){bd=d;best=i;}
    }
    /* batas 3 blok: ketukan jauh dari dinding mana pun diabaikan supaya pintu
       tidak melompat gara-gara salah ketuk */
    if(best<0||bd>3)return;
    D.idx=best;
    this.updateDoorMarker();
    Sfx.click();
  },
  updateDoorMarker(){
    const D=this.doorEdit;if(!D||!D.marker)return;
    const c=D.cand[D.idx],pr=this.doorPair(c);
    const horiz=(c.side==='n'||c.side==='s');
    const w=horiz?2:1, d=horiz?1:2;
    const cx=(pr[0][0]+pr[1][0])/2+0.5, cz=(pr[0][1]+pr[1][1])/2+0.5;
    D.marker.scale.set(w,2,d);
    D.marker.position.set(cx,D.rec.y+1,cz);
    const info=this.doorBar&&this.doorBar.querySelector('#db-info');
    if(info)info.textContent=`${D.idx+1}/${D.cand.length}`;
  },
  applyDoorEdit(){
    const D=this.doorEdit;if(!D)return;
    const rec=D.rec,c=D.cand[D.idx];
    /* hapus blok gugus lalu tulis ulang dengan pintu baru: cara ini memakai
       jalur yang sama dengan pemasangan/merge, jadi dinding lama tertutup
       kembali & atap tetap konsisten. */
    this.writeHouseBlocks(rec,true);
    rec.door={x:c.x,z:c.z,side:c.side};
    this.writeHouseBlocks(rec,false);
    this.save();
    UI.toast('🚪 Pintu dipindahkan');
    Sfx.craft&&Sfx.craft();
    this.cancelDoorEdit();
  },
  cancelDoorEdit(){
    const D=this.doorEdit;
    if(D&&D.marker){
      this.scene.remove(D.marker);
      if(D.marker.geometry)D.marker.geometry.dispose();
      if(D.marker.material&&D.marker.material.dispose)D.marker.material.dispose();
    }
    if(this.doorBar){this.doorBar.remove();this.doorBar=null;}
    this.doorEdit=null;
  },


  /* =========================================================================
     AKSI: DUDUK & TIDUR
     ========================================================================= */
  sit(f){
    if(this.sitting===f){this.stand();return;}
    this.sitting=f;
    const targetX=f.x+Math.sin(f.yaw||0)*(-0.04);
    const targetZ=f.z+Math.cos(f.yaw||0)*(-0.04);
    Player.pos.x=targetX;Player.pos.z=targetZ;
    Player.pos.y=f.y-0.10; // Bokong menempel pas di atas dudukan kursi
    Player.onGround=true;
    Player.vel.set(0,0,0);
    if(typeof f.yaw==='number')Player.facing=f.yaw;
    if(Player.animator)Player.animator.setAnimation('sit');
    UI.toast('💺 Duduk — stamina pulih lebih cepat. Bergerak untuk berdiri.');
    Sfx.click();
  },
  stand(){
    if(!this.sitting)return;
    const f=this.sitting;
    this.sitting=null;
    Player.pos.y=f.y+0.05;
    if(typeof World!=='undefined'&&World.groundAt)
      Player.pos.y=Math.max(Player.pos.y,World.groundAt(Player.pos.x,Player.pos.z,f.y+2));
    Player.onGround=true;
    if(Player.animator)Player.animator.setAnimation('idle');
    UI.toast('🧍 Berdiri');
  },

  /* =========================================================================
     AKSI: DUDUK DI SINGGASANA TAHTA KASTIL
     ========================================================================= */
  sittingThrone: null,
  sitThrone(f){
    if(this.sittingThrone && this.sittingThrone.furni === f){
      this.standThrone();
      return;
    }
    if(typeof FurniCastle === 'undefined' || !FurniCastle.throneSeat) return;
    const seat = FurniCastle.throneSeat(f);
    if(!seat) return;
    this.sittingThrone = { furni: f, seat };
    Player.pos.set(seat.x, seat.y, seat.z);
    Player.facing = seat.yaw;
    Player.vel.set(0, 0, 0);
    Player.onGround = true;
    Player.sittingPose = true;
    Player.thronePose = true;
    if(Player.animator) Player.animator.setAnimation('sit');
    if(typeof Cam !== 'undefined' && Cam.enterThroneMode) Cam.enterThroneMode(f, seat);
    if(typeof RPG !== 'undefined' && RPG.unlockBadge) RPG.unlockBadge('high_king');
    if(typeof UI !== 'undefined' && UI.toast) UI.toast('👑 Duduk di Singgasana (WASD / Kursor untuk Tinjau Wilayah)');
    if(typeof Sfx !== 'undefined' && Sfx.click) Sfx.click();
  },
  standThrone(){
    if(!this.sittingThrone) return;
    const { seat } = this.sittingThrone;
    this.sittingThrone = null;
    Player.sittingPose = false;
    Player.thronePose = false;
    const fwdX = Math.sin(seat.yaw) * 1.0;
    const fwdZ = Math.cos(seat.yaw) * 1.0;
    Player.pos.x = seat.x + fwdX;
    Player.pos.z = seat.z + fwdZ;
    Player.pos.y = seat.y;
    if(typeof World !== 'undefined' && World.groundAt) {
      Player.pos.y = Math.max(Player.pos.y, World.groundAt(Player.pos.x, Player.pos.z, seat.y + 2));
    }
    Player.vel.set(0, 0, 0);
    Player.onGround = true;
    if(Player.animator) Player.animator.setAnimation('idle');
    if(typeof Cam !== 'undefined' && Cam.exitThroneMode) Cam.exitThroneMode();
    if(typeof UI !== 'undefined' && UI.toast) UI.toast('🧍 Berdiri dari Singgasana');
    if(typeof Sfx !== 'undefined' && Sfx.jump) Sfx.jump();
  },

  /* =========================================================================
     AKSI: BERLAYAR
     -------------------------------------------------------------------------
     Saat menaiki perahu, Player tetap menjadi objek yang bergerak (supaya
     kamera, serangan, dan HUD tidak perlu diubah) tetapi kecepatan &
     arahnya dikendalikan di sini, lalu mesh perahu ditempelkan di bawah
     pemain. Selama berlayar pemain dianggap TIDAK berenang: staminanya utuh
     dan tidak ada penalti kecepatan air.
     ========================================================================= */
  board(f){
    if(this.riding===f){this.disembark();return;}
    this.stand();
    this.riding=f;
    this.boatYaw=f.yaw;this.boatSpd=0;
    /* pemain DUDUK di geladak, bukan mengapung di permukaan air */
    Player.pos.set(f.x,this.boatDeckY(),f.z);
    Player.vel.set(0,0,0);
    Sfx.click();
    UI.toast('🛶 Berlayar — gunakan gerak untuk mengayuh. Tekan aksi untuk turun.');
  },
  disembark(){
    if(!this.riding)return;
    const f=this.riding;
    /* Cari daratan terdekat di sekitar perahu supaya pemain tidak langsung
       tercebur begitu turun. Kalau tidak ada, pemain turun ke air. */
    let dx=0,dz=0,found=false;
    for(let a=0;a<12&&!found;a++){
      const ang=a*Math.PI/6;
      for(const r of[1.4,2.2,3.0]){
        const x=f.x+Math.sin(ang)*r,z=f.z+Math.cos(ang)*r;
        const g=World.groundAt(x,z,CFG.WORLD_H);
        if(g>CFG.WATER_Y+0.1){dx=x-f.x;dz=z-f.z;found=true;break;}
      }
    }
    this.riding=null;this.boatSpd=0;
    Player.pos.x=f.x+dx;Player.pos.z=f.z+dz;
    if(found)Player.pos.y=World.groundAt(Player.pos.x,Player.pos.z,CFG.WORLD_H);
    Player.vel.set(0,0,0);
    UI.toast(found?'🧍 Kau turun ke daratan':'🏊 Kau turun ke air');
    Sfx.click();
  },
  /* gerak perahu: percepatan halus + kemudi yang menoleh perlahan */
  sail(dt){
    const f=this.riding;
    if(!f)return;
    if(Player.dead){this.disembark();return;}
    const mv=Input.moveVec();
    const moving=(mv.x!==0||mv.z!==0);
    /* Perahu selalu mengarah ke input; kemudi diberi kelembaman supaya
       putarannya terasa berat seperti perahu betulan. */
    if(moving){
      const want=Math.atan2(mv.x,mv.z);
      this.boatYaw=angLerp(this.boatYaw,want,clamp(dt*2.6,0,1));
    }
    const top=8.6*(Input.sprintHeld()?1.25:1);         // lebih cepat dari berenang
    this.boatSpd=lerp(this.boatSpd,moving?top:0,clamp(dt*(moving?1.6:2.4),0,1));
    /* dorong perahu; berhenti bila menabrak daratan/blok */
    const vx=Math.sin(this.boatYaw)*this.boatSpd;
    const vz=Math.cos(this.boatYaw)*this.boatSpd;
    const nx=f.x+vx*dt,nz=f.z+vz*dt;
    const okX=World.inWaterAt(nx,CFG.WATER_Y-0.2,f.z);
    const okZ=World.inWaterAt(f.x,CFG.WATER_Y-0.2,nz);
    if(okX)f.x=nx;else this.boatSpd*=0.4;
    if(okZ)f.z=nz;else this.boatSpd*=0.4;
    /* pemain menempel di perahu & tidak dihitung berenang.
       Arah hadap pemain DIIKATKAN ke arah perahu supaya pose duduknya
       menghadap ke haluan — sama seperti menunggangi pet (Capture.ridePlayer
       menyetel p.facing mengikuti mount). Tanpa ini pemain duduk menghadap ke
       arah lamanya sementara perahunya berputar. */
    Player.pos.set(f.x,this.boatDeckY(),f.z);
    Player.vel.set(0,0,0);
    Player.facing=angLerp(Player.facing,this.boatYaw,clamp(dt*10,0,1));
    if(Player.mesh){
      Player.mesh.position.copy(Player.pos);
      Player.mesh.rotation.y=Player.facing;
    }
    Player.inWater=false;
    Player.onGround=true;
    /* --- animasi: buritan naik-turun, badan miring, dayung mengayuh --- */
    this.bobT+=dt;
    const spdF=clamp(this.boatSpd/top,0,1);
    f.mesh.position.set(f.x,
      CFG.WATER_Y+this.BOAT_SINK*this.BOAT_SCALE+Math.sin(this.bobT*2.1)*0.05,
      f.z);
    f.mesh.rotation.y=this.boatYaw;
    f.mesh.rotation.x=Math.sin(this.bobT*2.1)*0.04-spdF*0.06;
    f.mesh.rotation.z=Math.sin(this.bobT*1.5)*0.03;
                const oar=f.mesh.userData.oar;
    if(oar){
      this.oarP+=dt*(3.4+spdF*4.2);
      const swing=Math.sin(this.oarP)*0.28*(0.3+spdF);
      const dip=Math.cos(this.oarP)*0.12*(0.3+spdF);
      if(f.mesh.userData.oarL&&f.mesh.userData.oarR){
        f.mesh.userData.oarR.rotation.y=swing;
        f.mesh.userData.oarR.rotation.x=dip;
        f.mesh.userData.oarL.rotation.y=-swing;
        f.mesh.userData.oarL.rotation.x=dip;
      }else{
        oar.rotation.x=dip;
        oar.rotation.z=swing;
      }
    }
    /* riak & bunyi air saat melaju */
    if(spdF>0.3){
      this.wakeT-=dt;
      if(this.wakeT<=0){
        this.wakeT=0.3;
        FX.ripple(f.x,CFG.WATER_Y,f.z,0xdff2fa,1.9);
        Sfx.splash(false);
      }
    }
  },

  /* ---------- PETI: buka panel penyimpanan ----------
     Panel memakai UI.toggle('chest') sehingga tombol tutup & tombol panel lain
     tetap berperilaku sama seperti tas/crafting. */
  openChest(f){
    if(!f.inv)f.inv=new Array(CHEST_SLOTS).fill(null);
    this.chest=f;
    /* Judul panel mengikuti jenis peti (peti desa / harta dungeon / karam) */
    const def=this.DEFS[f.def];
    const titleEl=document.getElementById('chest-title');
    if(titleEl)titleEl.textContent=(def&&def.panelTitle)||'Peti Penyimpanan';
    Sfx.open();
    if(UI.open!=='chest')UI.toggle('chest');
    else UI.renderChest();
  },
  /* pindahkan seluruh resource (item non-equipment) dari tas ke peti */
  depositAll(f){
    if(!f||!f.inv)return;
    let moved=0;
    /* Hanya titipkan item dari tas (bukan hotbar & bukan perlengkapan) */
    for(const arr of[RPG.bag])
      for(let i=0;i<arr.length;i++){
        const s=arr[i];
        if(!s)continue;
        const it=ITEMS[s.id];
        if(!it||it.weapon||it.armor)continue;        // perlengkapan tetap dibawa
        const left=this.chestAdd(f,s.id,s.n,s);
        moved+=s.n-left;
        if(left<=0)arr[i]=null;else s.n=left;
      }
    if(moved)Sfx.craft();
    UI.toast(moved?`🧰 ${moved} item dititipkan ke peti`:'Tidak ada resource untuk dititipkan');
    UI.renderChest();UI.renderHotbar();
  },
  /* bentuk ringkas satu slot peti untuk disimpan ke `vaults` / localStorage.
     `l` = level tempa, `m` = tanda lokasi Log Pass — keduanya data per-instance
     yang harus ikut bertahan melewati simpan/muat. */
  _vaultSlot(s){
    const o={i:s.id,n:s.n};
    if(s.lvl)o.l=s.lvl;
    if(s.mark)o.m=s.mark;
    return o;
  },
  /* masukkan item ke peti; mengembalikan sisa yang tidak tertampung.
     `inst` = data per-instance opsional {lvl,mark} yang harus ikut tersimpan
     (level tempa & tanda lokasi Log Pass). Item ber-instance TIDAK pernah
     digabung ke tumpukan lain. */
  chestAdd(f,id,n,inst){
    /* equipment (pedang/armor/tameng) maks 1 per slot -> tidak ditumpuk */
    const cap=(typeof stackCap==='function')?stackCap(id):64;
    const hasInst=!!(inst&&(inst.lvl||inst.mark));
    if(cap>1&&!hasInst){
      for(let i=0;i<f.inv.length&&n>0;i++){
        const s=f.inv[i];
        if(s&&s.id===id&&!s.lvl&&!s.mark&&s.n<cap){
          const add=Math.min(n,cap-s.n);s.n+=add;n-=add;
        }
      }
    }
    for(let i=0;i<f.inv.length&&n>0;i++)
      if(!f.inv[i]){
        const add=Math.min(n,cap);
        const slot={id,n:add};
        if(inst&&inst.lvl)slot.lvl=inst.lvl;
        if(inst&&inst.mark)slot.mark=inst.mark;
        f.inv[i]=slot;n-=add;
      }
    if(n>=0)this.save();
    return n;
  },
  /* ambil satu tumpukan atau sejumlah qty dari peti ke inventory pemain */
  chestTake(f,i,qty){
    const s=f.inv[i];
    if(!s)return;
    const count = (qty !== undefined) ? Math.min(s.n, Math.max(1, Math.floor(qty))) : s.n;
    const left=RPG.addItem(s.id,count,s.lvl,s.mark);
    const taken=count-left;
    if(taken<=0){UI.toast('Tas penuh!');return;}
    s.n-=taken;
    if(s.n<=0)f.inv[i]=null;
    Sfx.click();this.save();
    UI.renderChest();UI.renderHotbar();
  },
  /* simpan satu tumpukan atau sejumlah qty dari inventory pemain ke peti */
  chestPut(f,arr,i,qty){
    const s=arr[i];
    if(!s)return;
    const count = (qty !== undefined) ? Math.min(s.n, Math.max(1, Math.floor(qty))) : s.n;
    const left=this.chestAdd(f,s.id,count,s);
    const stored=count-left;
    if(stored<=0){UI.toast('Peti penuh!');return;}
    s.n-=stored;
    if(s.n<=0)arr[i]=null;
    Sfx.click();
    UI.renderChest();UI.renderHotbar();
  },
  sleep(f){

    const night=Weather.nightF>0.35||Weather.time>0.76||Weather.time<0.2;
    if(!night){UI.toast('🛏️ Hanya bisa tidur saat malam hari');return;}
    if(Monsters.list.some(m=>!m.dead&&m.pos.distanceTo(Player.pos)<12)){
      UI.toast('👹 Ada monster di dekat sini — tidak bisa tidur!');
      Sfx.growl();return;
    }
    /* lompat ke pagi hari berikutnya */
    Weather.time=0.24;Weather.day++;
    Player.hp=Math.min(Player.maxHp(),Player.hp+Player.maxHp()*0.5);
    Player.stamina=Player.maxStamina();
    Player.hunger=Math.max(0,Player.hunger-12);   // tidur tetap membuat lapar
    Player.spawnP.set(f.x,f.y+0.2,f.z);           // kasur jadi titik respawn
    this.sleepT=1.2;
    const el=document.getElementById('sleepfade');
    if(el){el.classList.add('on');setTimeout(()=>el.classList.remove('on'),900);}
    Sfx.drink();
    UI.toast(`🛏️ Kau tidur nyenyak — Hari ${Weather.day} dimulai`);
    UI.updateHUD();
  },

  /* =========================================================================
     UPDATE PER FRAME
     ========================================================================= */
  update(dt){
    if(this.sleepT>0)this.sleepT-=dt;
    /* mode penempatan: perbarui posisi & warna ghost tiap frame */
    if(this.placing)this.updateGhost();
    /* --- Kastil & Gerbang: animasi halus pintu ganda / gerbang angkat & cutaway atap --- */
    if(typeof FurniCastle!=='undefined')FurniCastle.update(dt);
    /* --- Pintu Rumah Kayu: animasi buka-tutup berayun ganda halus --- */
    if(this.houses){
      for(const h of this.houses){
        if(!h.doorMesh||!h.doorMesh.userData||!h.doorMesh.userData.gateParts)continue;
        if(h.doorProgress===undefined)h.doorProgress=h.doorOpen?1.0:0.0;
        if(h.targetDoorProgress===undefined)h.targetDoorProgress=h.doorOpen?1.0:0.0;

        if(h.doorProgress!==h.targetDoorProgress){
          const speed=2.6;
          if(h.doorProgress<h.targetDoorProgress){
            h.doorProgress=Math.min(h.targetDoorProgress,h.doorProgress+dt*speed);
          }else{
            h.doorProgress=Math.max(h.targetDoorProgress,h.doorProgress-dt*speed);
          }
          const ease=h.doorProgress<0.5
            ?4*h.doorProgress*h.doorProgress*h.doorProgress
            :1-Math.pow(-2*h.doorProgress+2,3)/2;
          const parts=h.doorMesh.userData.gateParts;
          if(parts.leafL)parts.leafL.rotation.y=ease*(Math.PI*0.55);
          if(parts.leafR)parts.leafR.rotation.y=-ease*(Math.PI*0.55);
        }
      }
    }
    /* tutup peti berayun terbuka/menutup seperti prototipe Chest.html:
       easeOutBack saat membuka (memantul), easeInOut saat menutup. Sudut
       penuh -1.92 rad ≈ 110°. Glow & harta di dalam ikut berdenyut.
       Berlaku untuk peti penyimpanan (this.chest) maupun peti harta dungeon
       yang sudah dibuka (f.lidOpen). */
    for(const f of this.list){
      if(!f.mesh||!f.mesh.userData.lid)continue;
      const open=(this.chest===f)||!!f.lidOpen;
      /* transisi buka/tutup: catat titik awal & durasi sekali per perubahan */
      if(f.chestOpen!==open){
        f.chestOpen=open;
        f.lidFrom=f.lidA||0;
        f.lidTo=open?-1.92:0;
        f.lidT=0;f.lidDur=open?1.05:0.75;
        if(open&&typeof PortFX!=='undefined'){
          PortFX.chestBurst(f.mesh.position);
          Sfx.at(f.mesh.position,'craft');
        }
      }
      if(f.lidT===undefined)f.lidT=1;
      if(f.lidT<1){
        f.lidT=Math.min(1,f.lidT+dt/f.lidDur);
        const e=(typeof PE!=='undefined')
          ?(open?PE.back(f.lidT):PE.cubicIO(f.lidT)):f.lidT;
        f.lidA=f.lidFrom+(f.lidTo-f.lidFrom)*e;
      }
      f.mesh.userData.lid.rotation.x=f.lidA||0;
      /* glow & kilau harta menguat saat terbuka (hanya bila model porting) */
      const port=f.mesh.userData.port;
      if(port){
        const openAmt=clamp((f.lidA||0)/-1.92,0,1);
        const tt=performance.now()*0.001;
        if(port.glow)port.glow.intensity=openAmt*(2.2+Math.sin(tt*6)*0.3);
        if(port.gemMats)for(const m of port.gemMats)
          m.emissiveIntensity=0.15+openAmt*(0.8+Math.sin(tt*4)*0.25);
      }
    }
    /* --- berlayar: kendali & animasi perahu yang sedang dinaiki --- */
    if(this.riding)this.sail(dt);
    /* Perahu yang tidak dinaiki tetap terombang-ambing pelan supaya air
       terasa hidup. Hanya perahu di dekat pemain yang dianimasikan. */
    this.bobT+=dt;
    for(const f of this.list){
      if(f.def!=='boat'||f===this.riding)continue;
      if(Math.hypot(f.x-Player.pos.x,f.z-Player.pos.z)>34)continue;
      const ph=this.bobT*1.5+f.id;
      f.mesh.position.set(f.x,
        CFG.WATER_Y+this.BOAT_SINK*this.BOAT_SCALE+Math.sin(ph)*0.045,f.z);
      f.mesh.rotation.x=Math.sin(ph)*0.035;
      f.mesh.rotation.z=Math.cos(ph*0.8)*0.03;
    }
    /* --- duduk di singgasana tahta kastil --- */
    if(this.sittingThrone){
      const st = this.sittingThrone;
      if(Player.dead){
        this.standThrone();
      }else{
        Player.pos.x = lerp(Player.pos.x, st.seat.x, clamp(dt * 10, 0, 1));
        Player.pos.z = lerp(Player.pos.z, st.seat.z, clamp(dt * 10, 0, 1));
        Player.pos.y = lerp(Player.pos.y, st.seat.y, clamp(dt * 10, 0, 1));
        Player.vel.set(0, 0, 0);
        Player.onGround = true;
        Player.sittingPose = true;
        Player.thronePose = true;
        Player.facing = angLerp(Player.facing, st.seat.yaw, clamp(dt * 10, 0, 1));
        Player.stamina = Math.min(Player.maxStamina(), Player.stamina + 25 * dt);
        Player.hp = Math.min(Player.maxHp(), Player.hp + 2.0 * dt);

        if(typeof Input !== 'undefined' && Input.jumpQ){
          Input.jumpQ = false;
          this.standThrone();
        }
      }
    } else if(this.sitting){

      const f=this.sitting;
      if(Player.dead||Math.hypot(Player.pos.x-f.x,Player.pos.z-f.z)>1.4){
        this.stand();
      }else{
        const mv=Input.moveVec();
        if(mv.x||mv.z){this.stand();}
        else{
          Player.pos.x=lerp(Player.pos.x,f.x,clamp(dt*8,0,1));
          Player.pos.z=lerp(Player.pos.z,f.z,clamp(dt*8,0,1));
          /* pin di atas dudukan kursi (lawan gravitasi) & hadapkan ke arah kursi */
          const seatY=(typeof World!=='undefined'&&World.groundAt)?
            Math.max(f.y+0.5,World.groundAt(f.x,f.z,f.y+2)):f.y+0.5;
          Player.pos.y=lerp(Player.pos.y,seatY,clamp(dt*10,0,1));
          Player.vel.x=Player.vel.z=Player.vel.y=0;
          Player.onGround=true;
          Player.sittingPose=true;
          if(typeof f.yaw==='number')
            Player.facing=angLerp(Player.facing,f.yaw,clamp(dt*10,0,1));
          Player.stamina=Math.min(Player.maxStamina(),Player.stamina+22*dt);
          Player.hp=Math.min(Player.maxHp(),Player.hp+1.2*dt);
        }
      }
    }else Player.sittingPose=false;

    /* --- Smelter Industri: proses peleburan latar belakang & animasi --- */
    for(const f of this.list){
      if(f.def==='smelter'&&typeof Smelter!=='undefined'&&Smelter.update)
        Smelter.update(f,dt);
    }

    /* --- REGENERASI HP PERABOT: pulih penuh bila tidak diserang selama 10 detik --- */
    for(const f of this.list){
      if(f.hp !== undefined){
        const max = this.HP[f.def] || 24;
        if(f.hp < max){
          if(f.regenT === undefined) f.regenT = 10;
          f.regenT -= dt;
          if(f.regenT <= 0){
            f.hp = max;
            f.regenT = undefined;
            if(typeof FX !== 'undefined' && FX.text){
              FX.text(new THREE.Vector3(f.x, f.y + 1.2, f.z), '💚 Pulih', '#63d471');
            }
          }
        }else{
          f.regenT = undefined;
        }
      }
    }
    if(typeof Smelter!=='undefined'&&Smelter.updatePools)
      Smelter.updatePools(dt);

    this.populate();
  },

  /* ---------- isi rumah desa dengan perabot ----------
     Dipanggil tiap frame tapi kerjanya sangat ringan: hanya memeriksa desa di
     sekitar pemain dan melewati desa yang sudah pernah diisi. */
  populate(){
    if(typeof WGEN==='undefined'||!WGEN.villagesNear)return;
    const px=Player.pos.x,pz=Player.pos.z;
    const near=WGEN.villagesNear(px,pz);
    for(const v of near){
      if(Math.hypot(v.x-px,v.z-pz)>70)continue;         // terlalu jauh
      const key=v.x+','+v.z;
      if(this.villages[key])continue;
      this.villages[key]=true;
      this.queueFurnish(v);            // antre, jangan bangun semua sekaligus
    }
    this.processFurnishQueue();        //.realisasikan beberapa perabot per frame
    /* buang perabot desa yang sudah jauh supaya memori tetap ramping */
    for(let i=this.list.length-1;i>=0;i--){
      const f=this.list[i];
      if(!f.auto)continue;
      if(Math.hypot(f.x-px,f.z-pz)>110){
        if(this.sitting===f)this.stand();
        const key=f.vkey;
        if(key)this.villages[key]=false;
        this.remove(f,false);
      }
    }
  },
  /* masukkan semua perabot sebuah desa ke antrean (belum dibangun) */
  queueFurnish(v){
    if(!v.plan)return;
    if(!this.furnishQ)this.furnishQ=[];
    const key=v.x+','+v.z;
    for(const b of v.plan){
      if(b.kind==='well'||!b.furn)continue;
      for(const it of b.furn){
        this.furnishQ.push({id:it.id,x:it.x,z:it.z,yaw:it.yaw,
          bx:b.x,bz:b.z,bw:b.w,bd:b.d,vkey:key});
      }
    }
    /* jaring pengaman papan quest: diproses setelah perabot desa terpasang */
    if(v.tavern)this.furnishQ.push({safety:true,vkey:key,tv:v.tavern});
  },
  /* realisasikan maksimal `N` perabot dari antrean per frame supaya membangun
     satu desa tidak membebani satu frame (lag spike saat mendekati desa). */
  processFurnishQueue(){
    if(!this.furnishQ||!this.furnishQ.length)return;
    const FLOOR=CFG.SEA;
    let n=0;
    while(this.furnishQ.length&&n<3){
      const q=this.furnishQ.shift();
      if(!this.villages[q.vkey])continue;              // desa sudah dibongkar
      if(q.safety){this.boardSafety(q);continue;}
      /* Jangkauan pembangunan dilonggarkan 95→130 blok. Kios Dungeon Master di
         tepi desa (sisi timur/barat) berada tepat di luar radius lama saat
         pemain berdiri di pusat desa, sehingga tidak pernah terpasang — padahal
         kandidatnya sudah benar. Radius desa + radius furnish yang baru masih
         jauh di bawah jarak render chunk. */
      if(Math.hypot(q.x-Player.pos.x,q.z-Player.pos.z)>130)continue;
      const x=clamp(q.x,q.bx+0.9,q.bx+q.bw-0.9);
      const z=clamp(q.z,q.bz+0.9,q.bz+q.bd-0.9);
      let clash=false;
      for(const o of this.list){
        if(Math.abs(o.x-x)<0.85&&Math.abs(o.z-z)<0.85&&Math.abs(o.y-FLOOR)<1.5){clash=true;break;}
      }
      if(clash)continue;
      const f=this.place(q.id,x,FLOOR,z,q.yaw,true);
      if(f)f.vkey=q.vkey;
      n++;
    }
  },
  /* pastikan sebuah tavern punya papan quest (jaring pengaman bila papan dari
     peta perabot bentrok & terlewat). Logika sama dgn hook di quest.js. */
  boardSafety(q){
    const key=q.vkey,tv=q.tv,FLOOR=CFG.SEA;
    if(!tv)return;
    const has=this.list.some(f=>f.def==='board'&&f.vkey===key);
    if(has)return;
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
  },
  /* ---------- ISI PERABOT RUMAH DESA ----------
     Dulu perabot ditaruh lewat rumus ukuran (`if(b.w>=9&&b.d>=6)...`) sehingga
     rumah besar bisa mendapat dua meja yang posisinya berdekatan/bertumpuk.
     Sekarang setiap model rumah membawa PETA PERABOT TETAP (b.furn) yang sudah
     dihitung worldgen — termasuk rotasi rumahnya — jadi tata letak selalu rapi
     dan tidak pernah bertabrakan. */
  furnishVillage(v){
    if(!v.plan)return;
    const FLOOR=CFG.SEA;                    // lantai desa = permukaan air (rata)
    const key=v.x+','+v.z;
    for(const b of v.plan){
      if(b.kind==='well'||!b.furn)continue;
      for(const it of b.furn){
        /* jaga perabot tetap di dalam dinding walau peta digeser/diputar */
        const x=clamp(it.x,b.x+0.9,b.x+b.w-0.9);
        const z=clamp(it.z,b.z+0.9,b.z+b.d-0.9);
        /* lewati bila ada perabot lain yang terlalu dekat (anti-tumpuk) */
        let clash=false;
        for(const o of this.list){
          if(Math.abs(o.x-x)<0.85&&Math.abs(o.z-z)<0.85&&Math.abs(o.y-FLOOR)<1.5){
            clash=true;break;
          }
        }
        if(clash)continue;
        const f=this.place(it.id,x,FLOOR,z,it.yaw,true);
        if(f)f.vkey=key;
      }
    }
  },


  /* =========================================================================
     PENYIMPANAN (hanya perabot milik pemain)
     ========================================================================= */
  /* =========================================================================
     PENGHANCURAN PERABOT
     Semua perabot — termasuk milik desa — bisa dipukul sampai hancur dan
     menjatuhkan kembali itemnya, sehingga isi rumah desa bisa dipanen.
     ========================================================================= */
  HP:{table:18,chair:12,bed:18,chest:24,boat:30,board:15,
    workbench:24,anvil:30,stove:24,campfire:12,smelter:30,
    /* Pagar & Gerbang: Tier 1 = 100 pukulan, Tier 2 = 200 pukulan, Tier 3 = 300 pukulan */
    fence1:100,gate1:100,
    fence2:200,gate2:200,
    fence3:300,gate3:300,
    /* Kastil: Tier 1 = 500 pukulan, Tier 2 = 750 pukulan, Tier 3 = 1000 pukulan */
    castle1:500,castle2:750,castle3:1000},
  hitNearest(pos,facing,dmg = 3){
    const reach = (typeof RPG !== 'undefined' && RPG.weaponReach) ? Math.max(2.6, RPG.weaponReach() + 0.4) : 2.6;
    let best=null,bd=1e9;
    for(const f of this.list){
      const dx=f.x-pos.x,dz=f.z-pos.z;
      let d=Math.hypot(dx,dz);

      // Hitbox kastil: periksa jarak ke tepi perimeter dinding luar terdekat
      if(f.def && f.def.startsWith('castle')){
        const tier = parseInt(f.def.replace('castle','')) || 1;
        const size = (typeof FurniCastle !== 'undefined') ? FurniCastle.getCastleSize(tier) : 14;
        const half = size / 2;
        const c = Math.cos(f.yaw || 0), s = Math.sin(f.yaw || 0);
        const lx = dx * c - dz * s;
        const lz = dx * s + dz * c;
        const clampedX = clamp(lx, -half, half);
        const clampedZ = clamp(lz, -half, half);
        d = Math.hypot(lx - clampedX, lz - clampedZ);
      }

      const isBig = f.def && (f.def.startsWith('castle') || f.def.startsWith('gate3'));
      if(d > reach || Math.abs(f.y - pos.y) > (isBig ? 6.0 : 2.5)) continue;

      /* hanya perabot yang berada di arah hadap pemain */
      let diff=Math.abs(Math.atan2(dx,dz)-facing);
      if(diff>Math.PI)diff=Math.PI*2-diff;
      if(!f.def.startsWith('castle') && diff>1.35)continue;
      if(d<bd){bd=d;best=f;}
    }
    if(!best)return false;
    /* PETI HARTA KARUN (dchest, wreck_chest, bchest): HANYA via tombol F
       (interaksi), bukan attack. Serangan ditahan + Critical pesan panduan
       supaya pemain tahu cara yang benar. Peti juga kebal damage. */
    if(best.def==='dchest'||best.def==='wreck_chest'||best.def==='bchest'){
      if(typeof UI!=="undefined"&&UI.toast)UI.toast("Tekan F untuk membuka peti harta!");
      if(typeof Sfx!=="undefined"&&Sfx.noStamina)Sfx.noStamina();
      return true;
    }
    return this.damage(best,dmg||3);
  },
  damage(f,dmg){
    if(!this.DEFS[f.def])return false;
    /* PETI HARTA KARUN kebal damage: hanya bisa dibuka via tombol F. */
    if(f.def==='dchest'||f.def==='wreck_chest'||f.def==='bchest')return true;
    const max=this.HP[f.def]||24;
    // Pagar, gerbang & kastil: dihitung presisi 1 pukulan per ayunan
    const isFortress = f.def.startsWith('fence') || f.def.startsWith('gate') || f.def.startsWith('castle');
    const hitDamage = isFortress ? 1 : (dmg || 3);
    f.hp=(f.hp===undefined?max:f.hp)-hitDamage;
    f.regenT=10; // Reset hitungan mundur regenerasi 10 detik setiap kali diserang
    const col=DROP_COLOR[this.DEFS[f.def].item]||0x8a5a2b;
    const c=new THREE.Vector3(f.x,f.y+0.5,f.z);
    FX.debris(c,col,4,1.8);
    Sfx.chop();
    if(typeof FX!=='undefined'&&FX.text){
      const rem=Math.max(0,f.hp);
      FX.text(new THREE.Vector3(f.x,f.y+1.2,f.z),`🔨 ${rem}/${max} ${isFortress?'Pukulan':''}`,rem<=0?'#ff4d4d':'#ffd24d');
    }
    if(f.hp>0){
      /* getar sebagai umpan balik lalu kembali ke posisi semula */
      if(f.mesh){
        const ox=f.x, oz=f.z;
        f.mesh.position.x=ox+rand(-0.06,0.06);
        f.mesh.position.z=oz+rand(-0.06,0.06);
        setTimeout(()=>{
          if(f&&f.mesh){f.mesh.position.x=ox;f.mesh.position.z=oz;}
        },100);
      }
      return true;
    }
    if(this.sitting===f)this.stand();
    if(this.riding===f)this.disembark();
    FX.debris(c,col,14,3.2);
    Sfx.smash();
    UI.toast('🪓 '+this.DEFS[f.def].n+' hancur');
    this.remove(f,true);
    Player.addXP(2);
    return true;
  },

  save(){
    if(typeof RPG!=='undefined'&&!RPG.isSinglePlayerActive())return;
    try{
      const data=this.list.filter(f=>!f.auto)
        .map(f=>{
          const o={d:f.def,x:f.x,y:f.y,z:f.z,r:f.yaw};
          if(f.doorOpen!==undefined)o.doorOpen=f.doorOpen;
          /* isi peti ikut disimpan (slot kosong tetap null agar posisinya tetap) */
          if(f.inv)o.inv=f.inv.map(s=>s?this._vaultSlot(s):null);
          /* status tungku & peleburan smelter */
          if(f.smelter)o.smelter=Object.assign({},f.smelter);
          return o;
        });
      /* RUMAH modular (blok dunia): simpan daftar modul + pintu + ketinggian.
         `v:3` menandai format yang MENCATAT UKURAN MODUL (`s`), diperlukan sejak
         HOUSE_SIZE bisa berubah (5 → 7). `v:2` = koordinat blok dunia tanpa
         ukuran (dianggap LEGACY_SIZE=5); `v:1` = indeks grid 5×5. */
      const houses=(this.houses||[]).map(h=>({
        v:3,
        s:this.recSize(h),
        cells:(h.cells||[]).map(c=>[c.bx,c.bz]),
        door:(h.door&&typeof h.door.x==='number')?[h.door.x,h.door.z,h.door.side]:null,
        y:(typeof h.y==='number')?h.y:CFG.SEA
      }));

      /* isi peti desa yang masih dimuat ikut disegarkan sebelum ditulis */
      for(const f of this.list)
        if(f.akey&&f.inv)this.vaults[f.akey]=f.inv.map(s=>s?this._vaultSlot(s):null);
      localStorage.setItem(this.SAVE_KEY,
        JSON.stringify({f:data,dead:this.dead,vaults:this.vaults,houses}));
    }catch(e){}
  },
  load(){
    try{
      const raw=JSON.parse(localStorage.getItem(this.SAVE_KEY));
      if(!raw)return;
      /* format lama = array perabot saja; format baru = objek bertag */
      if(Array.isArray(raw)){this.applyFurniList(raw);return;}
      if(raw.dead)this.dead=raw.dead;
      if(raw.vaults)this.vaults=raw.vaults;
      /* RUMAH modular: muat dan simpan ke this.houses DULU sebelum applyFurniList,
         agar saat ada perabot dimuat tidak ada risiko tertimpa houses kosong */
      this.houses=[];
      if(Array.isArray(raw.houses)){
        const S=this.LEGACY_SIZE;
        let resized=0;
        for(const h of raw.houses){
          try{
            if(!Array.isArray(h.cells)||!h.cells.length)continue;
            let rec;
            if(h.v>=2){
              /* format v2/v3: koordinat BLOK dunia. v3 mencatat ukuran modul;
                 v2 belum, jadi dianggap modul lama 5×5. */
              rec={cells:h.cells.map(a=>({bx:a[0],bz:a[1]})),
                   door:Array.isArray(h.door)?{x:h.door[0],z:h.door[1],side:h.door[2]}
                     :this.defaultDoor(h.cells[0][0],h.cells[0][1],'s'),
                   y:(typeof h.y==='number')?h.y:CFG.SEA,
                   s:(typeof h.s==='number'&&h.s>0)?h.s:this.LEGACY_SIZE};
            }else{
              /* MIGRASI format lama (v1): cells & door berupa INDEKS GRID 5×5.
                 Pojok min modul = cx*S; pintu lama selalu di tengah sisi modul,
                 jadi bisa dibangun ulang dengan defaultDoor. Tanpa migrasi ini
                 rumah lama akan hilang/salah posisi setelah update. */
              rec={cells:h.cells.map(a=>({bx:a[0]*S,bz:a[1]*S})),
                   door:null,
                   y:(typeof h.y==='number')?h.y:CFG.SEA,
                   s:S};
              const dcx=Array.isArray(h.door)?h.door[0]:h.cells[0][0];
              const dcz=Array.isArray(h.door)?h.door[1]:h.cells[0][1];
              const dsd=Array.isArray(h.door)?h.door[2]:'s';
              /* defaultDoor memakai HOUSE_SIZE (ukuran BARU); untuk record lama
                 pintunya dihitung ulang oleh resizeHouseRec di bawah, jadi cukup
                 tempatkan di tengah sisi modul lama. */
              const o=Math.floor(S/2),bx=dcx*S,bz=dcz*S;
              rec.door=dsd==='s'?{x:bx+o,z:bz+S-1,side:'s'}:
                       dsd==='n'?{x:bx+o,z:bz,side:'n'}:
                       dsd==='e'?{x:bx+S-1,z:bz+o,side:'e'}:
                                 {x:bx,z:bz+o,side:'w'};
            }
            /* MIGRASI UKURAN MODUL: rumah yang disimpan dengan modul lebih kecil
               (5×5) ditumbuhkan ke HOUSE_SIZE sekarang tanpa memindahkan
               pusatnya, sehingga rumah lama tetap ada di tempatnya dan ikut
               mendapat sisi yang cukup lebar untuk 2 jendela + 1 pintu. */
            if(this.recSize(rec)!==this.HOUSE_SIZE){
              this.resizeHouseRec(rec,this.HOUSE_SIZE);
              resized++;
            }
            this.writeHouseBlocks(rec,false);
            this.houses.push(rec);
          }catch(err){console.warn('[furni] gagal memuat rumah:',err);}
        }
        /* simpan ulang begitu ada yang dimigrasikan supaya ukuran baru & posisi
           pintu hasil migrasi tidak dihitung lagi setiap kali game dibuka */
        if(resized)this.save();
      }
      this.applyFurniList(raw.f);
    }catch(e){}
  },
  applyFurniList(data){
    if(!Array.isArray(data))return;
    let hadDup=false;
    for(const f of data){
      // Jaring pengaman: lewati jika perabot yang sama sudah ada di titik ini
      const dup=this.list.find(e=>!e.auto&&e.def===f.d&&Math.hypot(e.x-f.x,e.z-f.z)<0.5&&Math.abs(e.y-f.y)<1.0);
      if(dup){
        hadDup=true;
        if(f.doorOpen!==undefined){
          dup.doorOpen=dup.doorOpen||!!f.doorOpen;
          if(typeof FurniCastle!=='undefined'&&FurniCastle.applyDoorState){
            FurniCastle.applyDoorState(dup, dup.doorOpen?1.0:0.0);
          }
        }
        continue;
      }
      const o=this.place(f.d,f.x,f.y,f.z,f.r,false,true);
      if(o&&f.doorOpen!==undefined){
        o.doorOpen=f.doorOpen;
        if(typeof FurniCastle!=='undefined'&&FurniCastle.applyDoorState){
          FurniCastle.applyDoorState(o, o.doorOpen?1.0:0.0);
        }
      }
      /* pulihkan data smelter */
      if(o&&f.smelter)o.smelter=Object.assign({},f.smelter);
      /* pulihkan isi peti pada slot aslinya (l = level tempa, m = tanda Log Pass) */
      if(o&&o.inv&&Array.isArray(f.inv))
        for(let i=0;i<o.inv.length&&i<f.inv.length;i++){
          const v=f.inv[i];
          if(!v){o.inv[i]=null;continue;}
          const slot={id:v.i,n:v.n};
          if(v.l)slot.lvl=v.l;
          if(v.m)slot.mark=v.m;
          o.inv[i]=slot;
        }
    }
    this.deduplicate();
    if(hadDup)this.save();
  },
  /* Bersihkan perabot/kastil duplikat yang menempati koordinat yang sama */
  deduplicate(){
    if(!this.list||!this.list.length)return;
    let changed=false;
    for(let i=this.list.length-1;i>=0;i--){
      const a=this.list[i];
      if(!a||a.auto)continue;
      for(let j=i-1;j>=0;j--){
        const b=this.list[j];
        if(!b||b.auto)continue;
        if(a.def===b.def&&Math.hypot(a.x-b.x,a.z-b.z)<0.5&&Math.abs(a.y-b.y)<1.0){
          if(a.doorOpen!==undefined)b.doorOpen=a.doorOpen;
          if(this.scene&&a.mesh){
            this.scene.remove(a.mesh);
            a.mesh.traverse(o=>{if(o.isMesh&&o.geometry)o.geometry.dispose();});
          }
          this.list.splice(i,1);
          changed=true;
          break;
        }
      }
    }
    if(changed)this.save();
  },
  /* Pulihkan mesh furnitur & kastil ke scene bila scene dibersihkan saat relog */
  restoreCastles(){
    this.deduplicate();
    if(!this.list||!this.list.length||!this.scene)return;
    for(const f of this.list){
      if(f.mesh&&!this.scene.children.includes(f.mesh)){
        this.scene.add(f.mesh);
      }
      if(f.def&&f.def.startsWith('castle')&&typeof FurniCastle!=='undefined'&&FurniCastle.applyDoorState){
        FurniCastle.applyDoorState(f, f.doorOpen?1.0:0.0);
      }
    }
  },
  /* Tulis ulang blok rumah modular ke dunia dari record yang sudah termuat.
     Dipanggil Game.begin() SETELAH clearWorldMeshes() + pre-generate chunk.

     BUGFIX "rumah hilang setelah keluar-masuk game":
     Furni.init() -> load() berjalan saat halaman dibuka (Game.init) dan menulis
     blok rumah ke data chunk. Tetapi saat permainan dimulai, Game.begin()
     memanggil clearWorldMeshes() -> World.chunks.clear(), yang MEMBUANG seluruh
     data chunk itu — termasuk blok rumah yang baru saja ditulis — lalu
     me-regenerate terrain murni. Record rumah tetap ada di this.houses (makanya
     tombol "Pindah Pintu" masih muncul dan tabrakan seolah masih ada), tetapi
     blok fisiknya hilang, jadi rumah tak terlihat & tak bisa disentuh sampai
     pemain memindah pintu (yang memicu writeHouseBlocks ulang).

     Fungsi ini menulis ulang blok dari record yang sama persis, sehingga rumah
     langsung tampak lagi begitu permainan dibuka. Idempoten: aman dipanggil
     berulang karena writeHouseBlocks(rec,false) hanya menimpa blok rumah. */
  restoreHouses(){
    if(!this.houses||!this.houses.length)return;
    for(const rec of this.houses){
      try{this.writeHouseBlocks(rec,false);}
      catch(err){console.warn('[furni] gagal memulihkan rumah:',err);}
    }
  },
  clearSave(){
    try{localStorage.removeItem(this.SAVE_KEY);}catch(e){}
    this.dead={};this.vaults={};
    /* hapus blok rumah modular dari dunia */
    for(const h of this.houses)this.writeHouseBlocks(h,true);
    this.houses=[];
    for(let i=this.list.length-1;i>=0;i--)
      if(!this.list[i].auto)this.remove(this.list[i],false);
  },
};
if (typeof window !== 'undefined') window.Furni = Furni;

/* Sinkronkan Furni.save() otomatis setiap kali RPG.save() dipanggil (interval 8 detik, beforeunload, dll) */
if (typeof RPG !== 'undefined' && typeof RPG.save === 'function') {
  const _origRpgSave = RPG.save;
  RPG.save = function() {
    _origRpgSave.apply(this, arguments);
    try {
      if (typeof Furni !== 'undefined' && Furni.save) Furni.save();
    } catch (e) {}
  };
}

/* =============================================================================
   AKSI KONTEKSTUAL  (tombol G / tombol layar)
   -----------------------------------------------------------------------------
   Satu tombol untuk semua interaksi. Urutan prioritas:
   penduduk desa → perabot → meletakkan perabot dari tangan.
   UI membaca current() untuk menampilkan label tombol yang tepat.
   ============================================================================= */
const Action={
  current(){
    if(Player.dead)return null;
    /* ATUR PINTU aktif: tombol aksi = terapkan. Dicek paling awal, sederajat
       dengan mode penempatan. */
    if(Furni.doorEdit)return {kind:'door-ok',label:'✔ Terapkan posisi pintu'};
    /* MODE PENEMPATAN aktif: tombol aksi berfungsi konfirmasi letakkan.
       Dicek paling awal agar prioritas di atas interaksi NPC/perabot. */
    if(Furni.placing){
      return {kind:'place-ok',
        label:Furni.placeValid?`✔ Letakkan ${Furni.DEFS[Furni.placing].n} di sini`
                              :'❌ Posisi belum valid'};
    }
    /* saat berlayar, satu-satunya aksi adalah turun dari perahu */
    if(Furni.riding)return {kind:'disembark',label:'🧍 Turun dari Perahu',
      pos:new THREE.Vector3(Furni.riding.x,CFG.WATER_Y+1.5,Furni.riding.z)};
    if(Furni.sittingThrone)return {kind:'throne-stand',label:'🧍 Berdiri dari Singgasana',
      pos:new THREE.Vector3(Player.pos.x,Player.pos.y+1.2,Player.pos.z)};
    if(Furni.sitting)return {kind:'stand',label:'🧍 Berdiri',
      pos:new THREE.Vector3(Furni.sitting.x,Furni.sitting.y+1.2,Furni.sitting.z)};
    /* ---------- MOB PELIHARAAN: TURUN ----------
       Saat menunggangi, satu-satunya aksi adalah turun. */
    if(typeof Capture!=='undefined'&&Capture.riding){
      return {kind:'pet-dismount',label:'🐾 Turun',
        pos:Player.pos.clone().add(new THREE.Vector3(0,2.2,0))};
    }
    /* Calon interaksi: kumpulkan kandidat interaksi jarak sangat dekat (<1.35 blok)
       lalu pilih kandidat dengan skor terbaik berdasarkan jarak & arah hadap pemain.
       Ini mencegah bentrok bila 2 objek/NPC berdekatan: pemain cukup menghadap
       ke objek/NPC yang dituju tanpa salah sasaran. */
    const candidates = [];
    const pPos = Player.pos;
    const pFacing = (Player.facing !== undefined) ? Player.facing : 0;

    const n = (typeof NPCS !== 'undefined' && NPCS.nearby) ? NPCS.nearby(pPos, 1.35) : null;
    if(n){
      const dx = n.pos.x - pPos.x, dz = n.pos.z - pPos.z;
      const d = Math.hypot(dx, dz);
      let diff = Math.abs(Math.atan2(dx, dz) - pFacing);
      if(diff > Math.PI) diff = Math.PI * 2 - diff;
      candidates.push({
        score: d + (diff > 1.4 ? 99 : diff * 0.35),
        action: {
          kind:'talk', npc:n,
          label:`💬 Bicara · ${n.role.e} ${n.name}`,
          pos:n.pos.clone().add(new THREE.Vector3(0, 1.95, 0))
        }
      });
    }

    /* ---------- GERBANG KASTIL & PAGAR: buka/tutup (prioritas tinggi) ---------- */
    if(typeof FurniCastle!=="undefined"){
      const g=FurniCastle.nearestGate(pPos,pFacing,5.0);
      if(g){
        candidates.push({
          score:g.d-0.45,
          action:{
            kind:"furni-gate",furni:g.furni,
            label:(g.furni.doorOpen?"Tutup Gerbang":"Buka Gerbang"),
            pos:new THREE.Vector3(g.x,g.furni.y+1.6,g.z)
          }
        });
      }

      /* ---------- SINGGASANA TAHTA KASTIL: Duduk ---------- */
      if(Furni.list && !Furni.sittingThrone){
        for(const f of Furni.list){
          if(!f.def || !f.def.startsWith('castle')) continue;
          const seat = FurniCastle.throneSeat(f);
          if(!seat) continue;
          const dx = seat.x - pPos.x, dz = seat.z - pPos.z;
          const d = Math.hypot(dx, dz);
          if(d <= 2.6 && Math.abs(pPos.y - seat.y) <= 1.8){
            candidates.push({
              score: d - 0.52,
              action: {
                kind: "throne-sit", furni: f,
                label: "👑 Duduk di Singgasana",
                pos: new THREE.Vector3(seat.x, seat.y + 0.9, seat.z)
              }
            });
          }
        }
      }
    }

    /* ---------- PINTU RUMAH KAYU: buka/tutup ---------- */
    const hd=Furni.nearestHouseDoor(pPos,pFacing,3.2);
    if(hd){
      candidates.push({
        score:hd.d-0.42,
        action:{
          kind:"house-door",house:hd.house,
          label:(hd.house.doorOpen?"Tutup Pintu":"Buka Pintu"),
          pos:hd.pos
        }
      });
    }

    const f = Furni.nearest(pPos);
    if(f){
      const dx = f.x - pPos.x, dz = f.z - pPos.z;
      const d = Math.hypot(dx, dz);
      let diff = Math.abs(Math.atan2(dx, dz) - pFacing);
      if(diff > Math.PI) diff = Math.PI * 2 - diff;
      candidates.push({
        score: d + (diff > 1.4 ? 99 : diff * 0.35),
        action: {
          kind:'furni', furni:f, label:Furni.DEFS[f.def].label,
          pos:new THREE.Vector3(f.x, f.y + 1.15, f.z)
        }
      });
    }

    if(typeof Altar !== 'undefined' && Altar.nearest){
      const al = Altar.nearest(pPos);
      if(al){
        const dx = al.x - pPos.x, dz = al.z - pPos.z;
        const d = Math.hypot(dx, dz);
        if(d <= 2.2){
          candidates.push({
            score: d,
            action: {
              kind:'altar', altar:al, label:'🔮 Isi Altar Ritual',
              pos:new THREE.Vector3(al.x, al.y + 4.9, al.z)
            }
          });
        }
      }
    }

    if(candidates.length > 0){
      candidates.sort((a, b) => a.score - b.score);
      return candidates[0].action;
    }
    const s=RPG.hotbar[RPG.sel];
    /* ---------- TANGKAP MOB (saat memegang Tali 🪢 & target sekarat) ---------- */
    if(s&&s.id==='rope'&&typeof Capture!=='undefined'){
      const cm=Capture.catchable();
      if(cm){
        const isFull=(typeof RPG!=='undefined'&&RPG.mobSlots)&&RPG.mobSlots.every(st=>st!==null);
        if(isFull){
          return {kind:'catch',mob:cm,label:`🚫 Full (Pet Penuh)`,
            pos:cm.pos.clone().add(new THREE.Vector3(0,meshHeight(cm.type)*(cm.sizeMul||1)+0.8,0))};
        }
        return {kind:'catch',mob:cm,label:`🪢 Tangkap ${Capture.mobName(cm.type)}${cm.boss?' Raksasa':''}`,
          pos:cm.pos.clone().add(new THREE.Vector3(0,meshHeight(cm.type)*(cm.sizeMul||1)+0.8,0))};
      }
    }
    if(s&&ITEMS[s.id].place)
      return {kind:'place',label:`📦 Pasang ${ITEMS[s.id].n}`};
    /* ---------- AKSI MEMANCING (saat memegang Alat Pancing 🎣) ---------- */
    if(typeof Fishing!=='undefined'&&Fishing.isHoldingRod&&Fishing.isHoldingRod()){
      if(Fishing.active&&Fishing.state!=='rest'){
        if(Fishing.state==='minigame'){
          return {kind:'fish-pull',label:'🎣 TAHAN & ULUR TALI!',
            pos:Player.pos.clone().add(new THREE.Vector3(0,2.2,0))};
        }
        return {kind:'fish-cast',label:'🎣 Tarik Kail Pancing',
          pos:Player.pos.clone().add(new THREE.Vector3(0,2.2,0))};
      }
      return {kind:'fish-cast',label:'🎣 Lemparkan Kail Pancing',
        pos:Player.pos.clone().add(new THREE.Vector3(0,2.2,0))};
    }
    /* ATUR PINTU: muncul saat pemain berdiri di rumahnya sendiri & tangannya
       tidak memegang barang yang bisa dipasang. Prioritas di bawah NPC/perabot
       supaya tidak menutupi interaksi lain di dalam rumah. */
    if(Furni.houses.length&&Furni.houseNear(Player.pos))
      return {kind:'door-edit',label:'🚪 Atur Pintu'};
    /* ---------- MOB PELIHARAAN: NAIKI (prioritas TERAKHIR) ----------
       Pet mengikuti pemain ke mana-mana; bila aksi Naiki diprioritaskan,
       tombol "Naiki" selalu menutupi interaksi NPC/furnitur. Kini aksi Naiki
       hanya muncul bila TIDAK ADA hal lain untuk diinteraksi, dan hanya saat
       sangat dekat (<2.2 blok). Alternatif eksplisit: tombol "Naiki" di panel
       mob (🐾 ikon team di kanan atas) yang sekaligus memanggil pet mendekat. */
    if(typeof Capture!=='undefined'){
      const pet=Capture.pet;
      if(pet&&!pet.dead&&pet.saddle&&pet.pos.distanceTo(Player.pos)<2.2){
        return {kind:'pet-ride',label:'🐾 Naiki',
          pos:pet.pos.clone().add(new THREE.Vector3(0,meshHeight(pet.type)+0.8,0))};
      }
    }
    return null;
  },
  trigger(){
    const a=this.current();
    if(!a){UI.toast('Tidak ada yang bisa diinteraksi di sini');return;}
    if(a.kind==='disembark')Furni.disembark();
    else if(a.kind==='throne-stand')Furni.standThrone();
    else if(a.kind==='stand')Furni.stand();
    else if(a.kind==='throne-sit')Furni.sitThrone(a.furni);
    else if(a.kind==='catch'&&typeof Capture!=='undefined'&&a.mob)Capture.start(a.mob);
    else if(a.kind==='pet-ride'&&typeof Capture!=='undefined')Capture.startRide();
    else if(a.kind==='pet-dismount'&&typeof Capture!=='undefined')Capture.stopRide();
    else if(a.kind==='talk')NPCS.talk(a.npc);
    else if(a.kind==='furni-gate'&&typeof FurniCastle!=="undefined"){
      FurniCastle.toggleGate(a.furni);
    }
    else if(a.kind==='house-door'){
      Furni.toggleHouseDoor(a.house);
    }
    else if(a.kind==='furni')Furni.interact(a.furni);
    else if(a.kind==='altar'&&typeof Altar!=='undefined')Altar.open(a.altar);
    else if(a.kind==='place')Furni.placeFromHand();
    else if(a.kind==='place-ok')Furni.confirmPlace();
    else if(a.kind==='door-edit')Furni.beginDoorEdit();
    else if(a.kind==='door-ok')Furni.applyDoorEdit();
    else if(a.kind==='fish-cast'&&typeof Fishing!=='undefined')Fishing.tryCast();
    else if(a.kind==='fish-pull'&&typeof Fishing!=='undefined')Fishing.onPointerDown();
  },
};

/* =============================================================================
   ELEMEN HUD TAMBAHAN
   -----------------------------------------------------------------------------
   Dibuat dari JS supaya index.html tidak perlu diubah:
   - #actbtn   : tombol aksi kontekstual (label mengikuti Action.current())
   - #npcbubble: balon dialog yang menempel di atas kepala NPC
   - #sleepfade: layar gelap sesaat ketika tidur
   ============================================================================= */
(function(){
  const add=(id,html)=>{
    const d=document.createElement('div');
    d.id=id;if(html)d.innerHTML=html;
    document.body.appendChild(d);return d;
  };
  const fade=add('sleepfade');
  const bub=add('npcbubble','<div class="btxt"></div><div class="bbtn"></div>');
  bub.style.display='none';
  const btn=add('actbtn','<span class="k">F</span><span class="t"></span>');
  btn.style.display='none';
  btn.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();Action.trigger();
  });
  btn.addEventListener('touchstart',e=>{
    e.preventDefault();e.stopPropagation();Action.trigger();
  },{passive:false});

  /* ---------------- balon dialog ---------------- */
  UI.bubble={
    npc:null,el:bub,life:0,
    show(n,html,choices,ready){
      this.npc=n;this.life=choices?18:6;
      bub.querySelector('.btxt').innerHTML=
        `<b>${n.role.e} ${n.name}</b> <i>Lv ${n.level}</i><br>${html}`;
      const bb=bub.querySelector('.bbtn');
      bb.innerHTML='';
      if(choices)for(const c of choices){
        const b=document.createElement('button');
        b.className='bch '+(c.cls||'')+(c.cls==='yes'&&ready===false?' dim':'');
        b.textContent=c.t;
        b.onclick=ev=>{ev.stopPropagation();Sfx.click();c.fn();};
        bb.appendChild(b);
      }
      /* isi bubble baru ikut bahasa aktif */
      if(typeof I18N!=='undefined'&&I18N.lang!=='id')I18N.localizeTree(bub,I18N.lang);
      bub.style.display='';
      bub.classList.remove('pop');void bub.offsetWidth;bub.classList.add('pop');
      this.update();
    },
    hide(){this.npc=null;bub.style.display='none';},
    /* dipanggil tiap frame: menempelkan balon ke posisi layar kepala NPC */
    update(dt){
      if(!this.npc)return;
      const n=this.npc;
      if(dt){
        this.life-=dt;
        if(this.life<=0||n.dead||n.pos.distanceTo(Player.pos)>CFG.NPC.TALK_R+2.5){
          this.hide();return;
        }
      }
      const v=n.pos.clone().add(new THREE.Vector3(0,2.15,0)).project(Cam.cam);
      if(v.z>1){bub.style.opacity='0';return;}
      bub.style.opacity='1';
      bub.style.left=((v.x*0.5+0.5)*window.innerWidth)+'px';
      bub.style.top=((-v.y*0.5+0.5)*window.innerHeight)+'px';
    },
  };

  /* ---------------- tombol aksi kontekstual ---------------- */
  UI.actionBtn={
    last:'',
    update(){
      if(!Game.started||UI.open||(typeof Furni!=='undefined'&&
         (Furni.placing||Furni.doorEdit))){
        btn.style.display='none';this.last='';return;}
      const a=Action.current();
      if(!a){btn.style.display='none';this.last='';return;}
      btn.style.display='';
      if(a.label!==this.last){
        this.last=a.label;
        const txt=(typeof I18N!=='undefined'&&I18N.lang!=='id')?I18N.translateText(a.label,I18N.lang):a.label;
        btn.querySelector('.t').textContent=txt;
        btn.classList.remove('pop');void btn.offsetWidth;btn.classList.add('pop');
      }
      /* Label ditempelkan tepat di atas objek/NPC sasaran supaya jelas siapa
         yang akan diajak berinteraksi. Aksi tanpa sasaran (meletakkan perabot)
         tetap memakai posisi tetap di bagian bawah layar. */
      if(a.pos){
        const v=a.pos.clone().project(Cam.cam);
        if(v.z>1){btn.style.display='none';return;}
        btn.classList.add('world');
        btn.style.left=((v.x*0.5+0.5)*window.innerWidth)+'px';
        btn.style.top=((-v.y*0.5+0.5)*window.innerHeight)+'px';
      }else{
        btn.classList.remove('world');
        btn.style.left='';btn.style.top='';
      }
    },
  };

  /* ---------------- celetukan singkat NPC ---------------- */
  const says=[];
  UI.say=function(npc,text,secs){
    /* satu NPC hanya boleh punya satu celetukan aktif */
    for(let i=says.length-1;i>=0;i--)if(says[i].npc===npc)kill(i);
    const el=document.createElement('div');
    el.className='npcsay';
    el.textContent=(typeof I18N!=='undefined'&&I18N.lang!=='id')
      ? I18N.translateText(text,I18N.lang) : text;
    document.body.appendChild(el);
    says.push({npc,el,life:secs||3});
  };
  function kill(i){
    says[i].el.remove();says.splice(i,1);
  }
  function updateSays(dt){
    for(let i=says.length-1;i>=0;i--){
      const s=says[i];
      s.life-=dt||0;
      if(s.life<=0||s.npc.dead||
         s.npc.pos.distanceTo(Player.pos)>26){kill(i);continue;}
      const v=s.npc.pos.clone().add(new THREE.Vector3(0,2.25,0)).project(Cam.cam);
      if(v.z>1){s.el.style.opacity='0';continue;}
      s.el.style.opacity=String(Math.min(1,s.life));
      s.el.style.left=((v.x*0.5+0.5)*window.innerWidth)+'px';
      s.el.style.top=((-v.y*0.5+0.5)*window.innerHeight)+'px';
    }
  }

  /* satu titik update untuk semua elemen di atas */
  UI.hudExtra=function(dt){
    UI.bubble.update(dt);
    UI.actionBtn.update();
    updateSays(dt);
    if(Furni.sleepT>0)fade.classList.add('on');else fade.classList.remove('on');
  };
})();