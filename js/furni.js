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
  placePos:null,placeTarget:null,placeValid:false,placeBar:null,


  /* ---------- material bersama (hemat memori) ---------- */
  mat:{},
  M(name,color,opt){
    const k=name+color;
    if(!this.mat[k])this.mat[k]=new THREE.MeshLambertMaterial(
      Object.assign({color},opt||{}));
    return this.mat[k];
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
    table:{n:'Meja Kayu',e:'🍽️',item:'f_table',r:1.9,decor:true,
      build(){return Furni.buildTable();}},
    chair:{n:'Kursi Kayu',e:'💺',item:'f_chair',r:1.5,label:'💺 Duduk',
      build(){return Furni.buildChair();},
      use(f){Furni.sit(f);}},
    bed:{n:'Tempat Tidur',e:'🛏️',item:'f_bed',r:2.1,label:'🛏️ Tidur',
      build(){return Furni.buildBed();},
      use(f){Furni.sleep(f);}},
    /* Peti: gudang pribadi. Isinya menempel pada objek peti (f.inv), bukan
        inventory pemain, sehingga resource bisa dititipkan di basis. */
    chest:{n:'Peti Penyimpanan',e:'🧰',item:'f_chest',r:1.7,label:'🧰 Buka Peti',
      build(){return Furni.buildChest();},
      use(f){Furni.openChest(f);}},
    /* Perahu: satu-satunya perabot yang hidup di atas air. Saat dinaiki,
        pemain bergerak cepat di permukaan tanpa terkena penalti berenang. */
    boat:{n:'Perahu Kayu',e:'🛶',item:'f_boat',r:2.2,label:'🛶 Naiki Perahu',
      build(){return Furni.buildBoat();},
      use(f){Furni.board(f);}},

    /* ---------- STASIUN KERJA (model voxel Workstation.html) ---------- */
    /* Meja Kerja: stasiun crafting pengganti meja biasa */
    workbench:{n:'Meja Kerja',e:'🔨',item:'f_workbench',r:2.0,label:'🔨 Meja Kerja',
      build(){return WSModels.make('bench',0.32);},
      use(){UI.toast('🔨 Meja kerja — panel crafting terbuka');Sfx.open();
        if(UI.open!=='craft')UI.toggle('craft');}},
    /* Landasan Tempa: enchant/naikkan level equipment (panel anvil) */
    anvil:{n:'Landasan Tempa',e:'⚒️',item:'f_anvil',r:1.9,label:'⚒️ Tempa Equipment',
      build(){return WSModels.make('anvil',0.24);},
      use(){UI.toast('⚒️ Landasan tempa — pilih equipment yang akan ditempa');Sfx.open();
        if(UI.open!=='anvil')UI.toggle('anvil');}},
    /* Tungku: stasiun memasak (panel crafting langsung ke tab Makanan) */
    stove:{n:'Tungku Masak',e:'🍲',item:'f_stove',r:2.1,label:'🍲 Masak di Tungku',
      build(){return WSModels.make('stove',0.27);},
      use(){UI.toast('🍲 Tungku menyala — waktunya memasak');Sfx.open();
        UI.craftTab='food';
        if(UI.open!=='craft')UI.toggle('craft');}},
    /* Api Unggun: tempat beristirahat — pulihkan HP & stamina (cooldown) */
    campfire:{n:'Api Unggun',e:'🔥',item:'f_campfire',r:2.1,label:'🔥 Hangatkan Diri',
      build(){return WSModels.make('campfire',0.30);},
      use(f){Furni.warm(f);}},
  },

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

  /* ---------- PETI PENYIMPANAN ----------
     Model voxel ala Minecraft hasil porting Chest.html (NEW MODEL) lewat
     PortChest di js/ports.js: tutup berengsel di tepi atas belakang, harta
     bercahaya di dalam, dan glow yang menguat saat terbuka. userData.lid
     tetap dipakai Furni.update untuk animasi membuka/menutup. */
  buildChest(){
    if(typeof PortChest!=='undefined')return PortChest.build();
    /* fallback sederhana bila ports.js tidak dimuat */
    const wood=this.M('wood',0x9a6b3c),dark=this.M('wood',0x6b4522);
    const g=new THREE.Group();
    g.add(this.vp(this.vb(1.02,0.5,0.66,wood),0,0.27,0));
    g.add(this.vp(this.vb(1.06,0.08,0.7,dark),0,0.52,0));
    const lid=new THREE.Group();lid.position.set(0,0.56,-0.33);
    lid.add(this.vp(this.vb(1.02,0.16,0.66,wood),0,0.08,0.33));
    g.add(lid);g.userData.lid=lid;
    return g;
  },

  /* ---------- PERAHU VOXEL ----------
     Lambung = tumpukan layer voxel yang menyempit ke bawah (sampan kotak
     khas Forecraft, bukan bola). Haluan & buritan menjulang bertingkat agar
     siluetnya terbaca dari jauh. Dayung disimpan di userData.oar supaya
     animasi sail() tetap bekerja tanpa perubahan. */
  buildBoat(){
    const wood=this.M('wood',0xb07c46),woodL=this.M('wood',0xc58f55),
          dark=this.M('wood',0x7d5327),darkD=this.M('wood',0x5d3c1c),
          rope=this.M('wood',0x8f6a3a);
    const g=new THREE.Group();
    /* lunas → lambung: 3 layer makin lebar ke atas */
    g.add(this.vp(this.vb(0.46,0.14,1.5,darkD),0,0.07,0));
    g.add(this.vp(this.vb(0.78,0.16,2.1,dark),0,0.22,0));
    g.add(this.vp(this.vb(1.04,0.18,2.6,wood),0,0.39,0));
    /* dinding lambung membentuk bak terbuka */
    for(const sx of[-1,1]){
      g.add(this.vp(this.vb(0.12,0.22,2.6,woodL),sx*0.52,0.56,0));
      g.add(this.vp(this.vb(0.16,0.1,2.6,dark),sx*0.52,0.7,0));
    }
    g.add(this.vp(this.vb(1.04,0.22,0.14,woodL),0,0.56,1.28));
    g.add(this.vp(this.vb(1.04,0.22,0.14,woodL),0,0.56,-1.28));
    /* haluan & buritan menjulang bertingkat */
    g.add(this.vp(this.vb(0.34,0.3,0.3,wood),0,0.78,1.42));
    g.add(this.vp(this.vb(0.22,0.22,0.2,woodL),0,0.98,1.5));
    g.add(this.vp(this.vb(0.3,0.26,0.26,wood),0,0.74,-1.4));
    /* lantai dalam + 2 bangku melintang */
    g.add(this.vp(this.vb(0.86,0.06,2.3,dark),0,0.5,0));
    g.add(this.vp(this.vb(0.96,0.1,0.28,dark),0,0.56,-0.45));
    g.add(this.vp(this.vb(0.96,0.1,0.28,dark),0,0.56,0.5));
    /* aksen tali tambang di haluan */
    g.add(this.vp(this.vb(0.08,0.08,0.08,rope),0.3,0.68,1.2));
    /* dayung (grup; diayun oleh sail()) */
    const oar=new THREE.Group();
    const shaft=this.vb(1.3,0.06,0.06,dark);
    shaft.rotation.z=0.9;shaft.position.set(0.5,0,0);
    oar.add(shaft);
    const blade=this.vb(0.16,0.34,0.22,wood);
    blade.position.set(0.98,-0.55,0);
    oar.add(blade);
    oar.position.set(0.2,0.62,-0.1);
    g.add(oar);
    g.userData.oar=oar;
    return g;
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
  place(defId,x,y,z,yaw,auto){
    const def=this.DEFS[defId];
    if(!def)return null;
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
    /* peti membawa inventory sendiri (array slot, null = kosong) */
    if(defId==='chest'){
      f.inv=new Array(CHEST_SLOTS).fill(null);
      /* peti desa: kembalikan isi dari kunjungan sebelumnya */
      const v=akey&&this.vaults[akey];
      if(Array.isArray(v))
        for(let i=0;i<f.inv.length&&i<v.length;i++)
          f.inv[i]=v[i]?{id:v[i].i,n:v[i].n}:null;
    }
    this.list.push(f);

    if(!auto)this.save();
    return f;

  },
  remove(f,drop){
    const i=this.list.indexOf(f);
    if(i<0)return;
    this.list.splice(i,1);
    this.scene.remove(f.mesh);
    f.mesh.traverse(o=>{if(o.isMesh&&o.geometry)o.geometry.dispose();});
    if(drop&&this.DEFS[f.def])RPG.addItem(this.DEFS[f.def].item,1);
    /* peti dibongkar → isinya tidak boleh ikut hilang */
    if(drop&&f.inv)for(const s of f.inv)if(s)RPG.addItem(s.id,s.n);
    if(this.chest===f){this.chest=null;if(UI.open==='chest')UI.toggle('chest');}
    if(f.akey){
      /* drop=true berarti dihancurkan pemain → jangan dibangkitkan lagi.
         drop=false hanya pembersihan jarak oleh populate(), jadi isi peti
         disimpan supaya tetap ada saat pemain kembali. */
      if(drop){this.dead[f.akey]=1;delete this.vaults[f.akey];}
      else if(f.inv)this.vaults[f.akey]=f.inv.map(s=>s?{i:s.id,n:s.n}:null);
      this.save();
    }else if(!f.auto)this.save();

  },
  /* perabot terdekat yang masih dalam radius interaksinya
     (perabot dekorasi tanpa aksi dilewati) */
  nearest(pos){
    let best=null,bd=1e9;
    for(const f of this.list){
      const def=this.DEFS[f.def];
      if(!def||def.decor)continue;
      const r=def.r;
      const d=Math.hypot(f.x-pos.x,f.z-pos.z);
      if(d<r&&d<bd&&Math.abs(f.y-pos.y)<2.6){best=f;bd=d;}
    }
    return best;
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
  beginPlace(defId){
    const def=this.DEFS[defId];
    if(!def)return;
    this.cancelPlace();                       // pastikan tidak ada ghost tersisa
    this.placing=defId;
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
    UI.toast(`📦 Memasang ${def.n} — klik tanah utk geser (maks ${this.PLACE_R} blok) · Putar/Pasang/Batal di bawah`);
    this.updateGhost();
  },
  /* posisi awal ghost: di depan pemain mengikuti arah kamera */
  defaultTarget(){
    const yaw=Cam.yaw;
    const dist=this.placing==='boat'?2.4:1.6;
    const tx=Math.floor(Player.pos.x-Math.sin(yaw)*dist)+0.5;
    const tz=Math.floor(Player.pos.z-Math.cos(yaw)*dist)+0.5;
    return {x:tx,y:this.surfaceAt(tx,tz),z:tz};
  },
  /* tinggi permukaan kolom (x,z) utk perabot yg sedang dipasang; -1 bila tak ada */
  surfaceAt(tx,tz){
    if(this.placing==='boat')
      return World.inWaterAt(tx,CFG.WATER_Y-0.2,tz)?CFG.WATER_Y-0.28:-1;
    for(let y=CFG.WORLD_H-1;y>=0;y--){
      const b=World.getBlock(Math.floor(tx),y,Math.floor(tz));
      if(b!==B.AIR&&b!==B.WATER)return y+1;
    }
    return -1;
  },
  /* validitas posisi target saat ini (this.placeTarget) */
  computeValid(){
    const p=this.placeTarget;
    if(!p||!this.placing)return {valid:false,reason:''};
    let valid=true,reason='';
    /* pemasangan harus dalam jangkauan pemain (PLACE_R) */
    if(Math.hypot(p.x-Player.pos.x,p.z-Player.pos.z)>this.PLACE_R+0.6){
      valid=false;reason=`Terlalu jauh dari pemain (maks ${this.PLACE_R} blok)`;
    }
    else if(this.placing==='boat'){
      if(!World.inWaterAt(p.x,CFG.WATER_Y-0.2,p.z)){valid=false;reason='🛶 Perahu hanya bisa di air';}
    }else if(p.y<0){valid=false;reason='Tidak ada permukaan di sini';}
    else if(p.y<CFG.WATER_Y){valid=false;reason='🌊 Tidak bisa memasang di dalam air';}
    if(valid){
      for(const f of this.list)
        if(Math.hypot(f.x-p.x,f.z-p.z)<0.9){valid=false;reason='Sudah ada perabot di situ';break;}
    }
    return {valid,reason};
  },
  updateGhost(){
    if(!this.placing||!this.ghost)return;
    /* kondisi tak lagi memungkinkan → batalkan */
    if(Player.dead||this.riding){this.cancelPlace();return;}
    if(typeof UI!=='undefined'&&UI.open){this.cancelPlace();return;}
    /* item di tangan berubah/habis → batalkan otomatis */
    const s=RPG.hotbar[RPG.sel];
    if(!s||!ITEMS[s.id].place||ITEMS[s.id].place!==this.placing){this.cancelPlace();return;}
    if(!this.placeTarget)this.placeTarget=this.defaultTarget();
    const v=this.computeValid();
    this.placeValid=v.valid;
    const p=this.placeTarget;
    this.ghost.position.set(p.x,p.y>=0?p.y:Player.pos.y,p.z);
    this.ghost.rotation.y=this.placeYaw;
    const em=v.valid?0x245c24:0x6b1a12;
    for(const m of this.ghostMats){if(m.emissive)m.emissive.setHex(em);}
  },
  /* pindahkan ghost ke titik yang diklik: kamera → ray, lalu raycast langsung
      ke MESH CHUNK (semua grup chunk yang termuat di scene).
      BUGFIX #1: versi paling awal raycast ke `World.group.children` yang kosong
      (chunk ditempel langsung ke Game.scene) → ghost tak pernah pindah.
      BUGFIX #2: kamera game ini ORTOGRAFIK & diparkir Cam.DIST=80 blok dari
      pemain (y kamera ±70). Voxel-DDA yang mulai dari posisi kamera langsung
      gagal karena guard `y>=WORLD_H+8` terpenuhi di titik awal. Raycast mesh
      Three.js menangani kamera ortografik & jarak jauh dengan benar, plus
      culling bounding-box sehingga tetap murah.
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
    const h=hits[0];
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
    if(dp>this.PLACE_R){
      UI.toast(`📏 Terlalu jauh — mendekatlah (maks ${this.PLACE_R} blok)`);
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
    const s=RPG.hotbar[RPG.sel];
    if(!s||!ITEMS[s.id].place||ITEMS[s.id].place!==defId){this.cancelPlace();return;}
    const p=this.placeTarget;
    this.place(defId,p.x,p.y,p.z,this.placeYaw,false);
    s.n--;if(s.n<=0)RPG.hotbar[RPG.sel]=null;
    Sfx.craft();
    FX.debris(new THREE.Vector3(p.x,p.y+0.4,p.z),0xd6b06a,8,1.6);
    UI.toast(`${this.DEFS[defId].e} ${this.DEFS[defId].n} diletakkan`);
    UI.renderHotbar();
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
    this.placing=null;this.placePos=null;this.placeTarget=null;this.placeValid=false;
  },

  /* =========================================================================
     AKSI: DUDUK & TIDUR
     ========================================================================= */
  sit(f){
    if(this.sitting===f){this.stand();return;}
    this.sitting=f;
    Player.pos.x=f.x;Player.pos.z=f.z;
    Player.vel.set(0,0,0);
    UI.toast('💺 Duduk — stamina pulih lebih cepat. Bergerak untuk berdiri.');
    Sfx.click();
  },
  stand(){
    if(!this.sitting)return;
    this.sitting=null;
    UI.toast('🧍 Berdiri');
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
    Player.pos.set(f.x,CFG.WATER_Y+0.45,f.z);
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
    /* pemain menempel di perahu & tidak dihitung berenang */
    Player.pos.set(f.x,CFG.WATER_Y+0.45,f.z);
    Player.vel.set(0,0,0);
    Player.inWater=false;
    Player.onGround=true;
    /* --- animasi: buritan naik-turun, badan miring, dayung mengayuh --- */
    this.bobT+=dt;
    const spdF=clamp(this.boatSpd/top,0,1);
    f.mesh.position.set(f.x,CFG.WATER_Y-0.28+Math.sin(this.bobT*2.1)*0.05,f.z);
    f.mesh.rotation.y=this.boatYaw;
    f.mesh.rotation.x=Math.sin(this.bobT*2.1)*0.04-spdF*0.06;
    f.mesh.rotation.z=Math.sin(this.bobT*1.5)*0.03;
    const oar=f.mesh.userData.oar;
    if(oar){
      this.oarP+=dt*(3.4+spdF*4.2);
      oar.rotation.x=Math.sin(this.oarP)*0.55*(0.3+spdF);
      oar.rotation.z=Math.cos(this.oarP)*0.22*(0.3+spdF);
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
    Sfx.open();
    if(UI.open!=='chest')UI.toggle('chest');
    else UI.renderChest();
  },
  /* pindahkan seluruh resource (item non-equipment) dari tas ke peti */
  depositAll(f){
    if(!f||!f.inv)return;
    let moved=0;
    for(const arr of[RPG.hotbar,RPG.bag])
      for(let i=0;i<arr.length;i++){
        const s=arr[i];
        if(!s)continue;
        const it=ITEMS[s.id];
        if(!it||it.weapon||it.armor)continue;        // perlengkapan tetap dibawa
        const left=this.chestAdd(f,s.id,s.n);
        moved+=s.n-left;
        if(left<=0)arr[i]=null;else s.n=left;
      }
    if(moved)Sfx.craft();
    UI.toast(moved?`🧰 ${moved} item dititipkan ke peti`:'Tidak ada resource untuk dititipkan');
    UI.renderChest();UI.renderHotbar();
  },
  /* masukkan item ke peti; mengembalikan sisa yang tidak tertampung */
  chestAdd(f,id,n){
    for(let i=0;i<f.inv.length&&n>0;i++){
      const s=f.inv[i];
      if(s&&s.id===id&&s.n<64){
        const add=Math.min(n,64-s.n);s.n+=add;n-=add;
      }
    }
    for(let i=0;i<f.inv.length&&n>0;i++)
      if(!f.inv[i]){const add=Math.min(n,64);f.inv[i]={id,n:add};n-=add;}
    if(n>=0)this.save();
    return n;
  },
  /* ambil satu tumpukan dari peti ke inventory pemain */
  chestTake(f,i){
    const s=f.inv[i];
    if(!s)return;
    const left=RPG.addItem(s.id,s.n);
    if(left>=s.n){UI.toast('Tas penuh!');return;}
    if(left<=0)f.inv[i]=null;else s.n=left;
    Sfx.click();this.save();
    UI.renderChest();UI.renderHotbar();
  },
  /* simpan satu tumpukan dari inventory pemain ke peti */
  chestPut(f,arr,i){
    const s=arr[i];
    if(!s)return;
    const left=this.chestAdd(f,s.id,s.n);
    if(left>=s.n){UI.toast('Peti penuh!');return;}
    if(left<=0)arr[i]=null;else s.n=left;
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
      f.mesh.position.set(f.x,CFG.WATER_Y-0.28+Math.sin(ph)*0.045,f.z);
      f.mesh.rotation.x=Math.sin(ph)*0.035;
      f.mesh.rotation.z=Math.cos(ph*0.8)*0.03;
    }
    /* --- duduk: pulihkan stamina, berdiri bila pemain bergerak --- */
    if(this.sitting){

      const f=this.sitting;
      if(Player.dead||Math.hypot(Player.pos.x-f.x,Player.pos.z-f.z)>1.4){
        this.stand();
      }else{
        const mv=Input.moveVec();
        if(mv.x||mv.z){this.stand();}
        else{
          Player.pos.x=lerp(Player.pos.x,f.x,clamp(dt*8,0,1));
          Player.pos.z=lerp(Player.pos.z,f.z,clamp(dt*8,0,1));
          Player.vel.x=Player.vel.z=0;
          Player.stamina=Math.min(Player.maxStamina(),Player.stamina+22*dt);
          Player.hp=Math.min(Player.maxHp(),Player.hp+1.2*dt);
        }
      }
    }
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
      if(Math.hypot(q.x-Player.pos.x,q.z-Player.pos.z)>95)continue;
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
  HP:{table:14,chair:10,bed:18,chest:24,boat:20,board:14,
    workbench:16,anvil:30,stove:24,campfire:10},
  hitNearest(pos,facing){
    let best=null,bd=1e9;
    for(const f of this.list){
      const dx=f.x-pos.x,dz=f.z-pos.z;
      const d=Math.hypot(dx,dz);
      if(d>2.2||Math.abs(f.y-pos.y)>2.2)continue;
      /* hanya perabot yang berada di arah hadap pemain */
      let diff=Math.abs(Math.atan2(dx,dz)-facing);
      if(diff>Math.PI)diff=Math.PI*2-diff;
      if(diff>1.25)continue;
      if(d<bd){bd=d;best=f;}
    }
    if(!best)return false;
    return this.damage(best,1);
  },
  damage(f,dmg){
    if(!this.DEFS[f.def])return false;
    const max=this.HP[f.def]||12;
    f.hp=(f.hp===undefined?max:f.hp)-dmg;
    const col=DROP_COLOR[this.DEFS[f.def].item]||0x8a5a2b;
    const c=new THREE.Vector3(f.x,f.y+0.5,f.z);
    FX.debris(c,col,3,1.8);
    Sfx.chop();
    if(f.hp>0){
      /* getar sedikit sebagai umpan balik "belum hancur" */
      if(f.mesh){
        f.mesh.position.x=f.x+rand(-0.04,0.04);
        f.mesh.position.z=f.z+rand(-0.04,0.04);
      }
      return false;
    }
    if(this.sitting===f)this.stand();
    if(this.riding===f)this.disembark();
    FX.debris(c,col,12,3.2);
    Sfx.smash();
    UI.toast('🪓 '+this.DEFS[f.def].n+' hancur');
    this.remove(f,true);
    Player.addXP(1);
    return true;
  },

  save(){
    try{
      const data=this.list.filter(f=>!f.auto)
        .map(f=>{
          const o={d:f.def,x:f.x,y:f.y,z:f.z,r:f.yaw};
          /* isi peti ikut disimpan (slot kosong tetap null agar posisinya tetap) */
          if(f.inv)o.inv=f.inv.map(s=>s?{i:s.id,n:s.n}:null);
          return o;
        });

      /* isi peti desa yang masih dimuat ikut disegarkan sebelum ditulis */
      for(const f of this.list)
        if(f.akey&&f.inv)this.vaults[f.akey]=f.inv.map(s=>s?{i:s.id,n:s.n}:null);
      localStorage.setItem(this.SAVE_KEY,
        JSON.stringify({f:data,dead:this.dead,vaults:this.vaults}));
    }catch(e){}
  },
  load(){
    try{
      const raw=JSON.parse(localStorage.getItem(this.SAVE_KEY));
      if(!raw)return;
      /* format lama = array perabot saja; format baru = objek bertag */
      const data=Array.isArray(raw)?raw:raw.f;
      if(!Array.isArray(data))return;
      if(raw&&!Array.isArray(raw)){
        if(raw.dead)this.dead=raw.dead;
        if(raw.vaults)this.vaults=raw.vaults;
      }
      for(const f of data){
        const o=this.place(f.d,f.x,f.y,f.z,f.r,false);
        /* pulihkan isi peti pada slot aslinya */
        if(o&&o.inv&&Array.isArray(f.inv))
          for(let i=0;i<o.inv.length&&i<f.inv.length;i++)
            o.inv[i]=f.inv[i]?{id:f.inv[i].i,n:f.inv[i].n}:null;
      }

    }catch(e){}
  },
  clearSave(){
    try{localStorage.removeItem(this.SAVE_KEY);}catch(e){}
    this.dead={};this.vaults={};
    for(let i=this.list.length-1;i>=0;i--)
      if(!this.list[i].auto)this.remove(this.list[i],false);
  },
};

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
    if(Furni.sitting)return {kind:'stand',label:'🧍 Berdiri',
      pos:new THREE.Vector3(Furni.sitting.x,Furni.sitting.y+1.2,Furni.sitting.z)};
    /* ---------- MOB PELIHARAAN ---------- */
    if(typeof Capture!=='undefined'){
      if(Capture.riding){
        return {kind:'pet-dismount',label:'🐾 Turun',
          pos:Player.pos.clone().add(new THREE.Vector3(0,2.2,0))};
      }
      const pet=Capture.pet;
      if(pet&&!pet.dead&&pet.saddle&&pet.pos.distanceTo(Player.pos)<5){
        return {kind:'pet-ride',label:'🐾 Naiki',
          pos:pet.pos.clone().add(new THREE.Vector3(0,meshHeight(pet.type)+0.8,0))};
      }
    }
    const n=NPCS.nearby();
    if(n)return {kind:'talk',npc:n,
      label:`💬 Bicara · ${n.role.e} ${n.name}`,
      pos:n.pos.clone().add(new THREE.Vector3(0,1.95,0))};
    const f=Furni.nearest(Player.pos);
    if(f)return {kind:'furni',furni:f,label:Furni.DEFS[f.def].label,
      pos:new THREE.Vector3(f.x,f.y+1.15,f.z)};
    const s=RPG.hotbar[RPG.sel];
    if(s&&ITEMS[s.id].place)
      return {kind:'place',label:`📦 Pasang ${ITEMS[s.id].n}`};
    return null;
  },
  trigger(){
    const a=this.current();
    if(!a){UI.toast('Tidak ada yang bisa diinteraksi di sini');return;}
    if(a.kind==='disembark')Furni.disembark();
    else if(a.kind==='stand')Furni.stand();
    else if(a.kind==='pet-ride'&&typeof Capture!=='undefined')Capture.startRide();
    else if(a.kind==='pet-dismount'&&typeof Capture!=='undefined')Capture.stopRide();
    else if(a.kind==='talk')NPCS.talk(a.npc);
    else if(a.kind==='furni')Furni.interact(a.furni);
    else if(a.kind==='place')Furni.placeFromHand();
    else if(a.kind==='place-ok')Furni.confirmPlace();
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
  const btn=add('actbtn','<span class="k">G</span><span class="t"></span>');
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
      if(!Game.started||UI.open||(typeof Furni!=='undefined'&&Furni.placing)){
        btn.style.display='none';this.last='';return;}
      const a=Action.current();
      if(!a){btn.style.display='none';this.last='';return;}
      btn.style.display='';
      if(a.label!==this.last){
        this.last=a.label;
        btn.querySelector('.t').textContent=a.label;
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
    el.className='npcsay';el.textContent=text;
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