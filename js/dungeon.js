'use strict';
/* =============================================================================
   DUNGEON / RERUNTUHAN BERTINGKAT
   -----------------------------------------------------------------------------
   Dunia dibagi grid 128x128 blok. Sebagian sel berisi satu reruntuhan dengan
   TINGKAT 1–5 yang ditentukan deterministik dari indeks sel + jaraknya dari
   titik spawn: makin jauh dari rumah, makin tinggi tingkat yang mungkin muncul.

   Tingkat menentukan:
     - ukuran benteng & jumlah ruang di dalamnya,
     - jumlah & kekuatan monster penjaga (tingkat 4+ dijaga bos),
     - jumlah peti harta dan kualitas isinya.

   Struktur ditulis per-kolom lewat buildDungeonPart() yang dipanggil genChunk,
   jadi bentuknya konsisten tanpa perlu state global. Peti & monster diurus
   modul ini saat pemain mendekat.
   ============================================================================= */

/* ---------- definisi lokasi dungeon (dipasang ke WGEN) ---------- */
Object.assign(WGEN,{
  DUNGEON_GRID:128,
  dungeonInCell(gx,gz){
    /* sel spawn tidak pernah berisi dungeon supaya awal permainan aman */
    if(gx===0&&gz===0)return null;
    const G=this.DUNGEON_GRID;
    if(this.hash(gx,gz,911)<0.42)return null;              // ~58% sel berisi
    const ox=Math.floor(this.hash(gx,gz,913)*(G-64))+32;
    const oz=Math.floor(this.hash(gx,gz,917)*(G-64))+32;
    const cx=gx*G+ox,cz=gz*G+oz;
    /* jangan menimpa desa (jarak diperbesar karena benteng kini jauh lebih luas) */
    const nv=this.nearestVillage(cx,cz);
    if(nv&&nv.dist<64)return null;
    /* tingkat: dasar dari jarak ke titik awal, diacak ±1 */
    const far=Math.hypot(cx,cz)/260;
    let lvl=1+Math.floor(far)+(this.hash(gx,gz,919)<0.35?1:0);
    lvl=clamp(lvl,1,5);
    /* Radius benteng: dulu 8–12 blok (terasa seperti gubuk). Sekarang 14–22
       blok sehingga di dalamnya muat lorong salib, beberapa ruang, dan
       halaman altar yang lapang. */
    return {x:cx,z:cz,lvl,r:12+lvl*2,key:gx+','+gz,
      biome:this.biomeAt(cx,cz)};
  },
  dungeonsNear(wx,wz){
    const G=this.DUNGEON_GRID,out=[];
    const gx=Math.floor(wx/G),gz=Math.floor(wz/G);
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const d=this.dungeonInCell(gx+dx,gz+dz);
      if(d)out.push(d);
    }
    return out;
  },
  /* dungeon terdekat (dipakai HUD & spawner monster) */
  nearestDungeon(wx,wz){
    let best=null,bd=Infinity;
    for(const d of this.dungeonsNear(wx,wz)){
      const dist=Math.hypot(d.x-wx,d.z-wz);
      if(dist<bd){bd=dist;best=d;}
    }
    return best?{d:best,dist:bd}:null;
  },
});

/* =============================================================================
   PEMBANGUN STRUKTUR (dipanggil genChunk per kolom)
   -----------------------------------------------------------------------------
   Denah: benteng persegi dengan tembok luar berkeriting, empat menara sudut,
   gerbang di sisi selatan, tembok dalam yang membagi ruang, dan altar di pusat.
   ============================================================================= */
function buildDungeonPart(data,idx,x,z,wx,wz,h,d,C,H){
  const set=(y,id)=>{if(y>=0&&y<H)data[idx(x,y,z)]=id;};
  const lx=wx-d.x,lz=wz-d.z;
  const ax=Math.abs(lx),az=Math.abs(lz);
  const r=d.r;
  if(ax>r||az>r)return false;

  /* bahan menyesuaikan biome supaya reruntuhan menyatu dengan lingkungan */
  const WALL=d.biome===BIOME.DESERT?B.SAND:B.STONE;
  const TRIM=d.lvl>=4?B.ROOF:B.PLANK;

  /* lantai batu di seluruh area benteng */
  set(h-1,d.lvl>=3?B.STONE:WALL);

  const wallTop=h+2+Math.min(2,d.lvl);            // makin tinggi tingkatnya
  const gate=(lz===r&&ax<=1);                     // gerbang selatan
  const outer=(ax===r||az===r);
  const tower=(ax>=r-1&&az>=r-1);

  /* ---------- tembok luar & menara sudut ---------- */
  if(outer||tower){
    if(gate)return true;                          // biarkan pintu masuk terbuka
    const top=tower?wallTop+2:wallTop;
    for(let y=h;y<=top;y++){
      /* puncak tembok dibuat berlubang selang-seling (crenellation) */
      if(y===top&&((lx+lz)&1))continue;
      /* lubang celah pengintai di tingkat tinggi */
      if(!tower&&y===h+1&&((lx*3+lz*5)%7===0))continue;
      set(y,y===top?TRIM:WALL);
    }
    return true;
  }

  /* ---------- tembok dalam: membagi benteng jadi beberapa ruang ----------
     Benteng besar memakai DUA cincin tembok dalam supaya terasa berlorong,
     masing-masing dengan pintu di tengah tiap sisi. */
  const ri=Math.max(3,Math.floor(r/2));
  const ri2=Math.max(5,Math.floor(r*0.78));
  const corridor=(ax<=1||az<=1);                  // lorong salib selalu terbuka
  if(d.lvl>=2&&!corridor&&(ax===ri||az===ri)){
    for(let y=h;y<h+2+(d.lvl>=4?1:0);y++)set(y,WALL);
    return true;
  }
  /* cincin kedua: pintunya digeser (offset 3) agar jalurnya berkelok */
  if(r>=16&&!corridor&&(ax===ri2||az===ri2)&&
     Math.abs(ax-az)>1&&(ax%7!==3&&az%7!==3)){
    for(let y=h;y<h+2;y++)set(y,WALL);
    return true;
  }

  /* ---------- altar di pusat (ikut membesar bersama benteng) ---------- */
  const ar=r>=16?2:1;
  if(ax<=ar&&az<=ar){
    set(h-1,B.STONE);
    if(ax===ar&&az===ar){                         // empat pilar sudut altar
      for(let y=h;y<h+2;y++)set(y,WALL);
      set(h+2,d.lvl>=3?BIOME_INFO[d.biome].ore:B.PLANK);
    }
    return true;
  }

  /* ---------- puing & tiang runtuh acak di dalam ruangan ---------- */
  if(WGEN.hash(wx,wz,d.lvl*31+5)<0.05){
    const hh=1+Math.floor(WGEN.hash(wx,wz,77)*2);
    for(let y=h;y<h+hh;y++)set(y,WALL);
    return true;
  }
  return true;   // area dalam tetap dianggap terpakai (tanpa pohon/tanaman)
}

/* =============================================================================
   MODUL RUNTIME: peti harta, monster penjaga, notifikasi masuk
   ============================================================================= */
const Dungeon={
  active:null,          // dungeon yang sedang dimasuki pemain
  spawnT:0,
  built:{},             // dungeon yang petinya sudah dibuat
  builtInfo:{},         // posisi dungeon tsb (untuk pembersihan)
  activeKey:null,       // kunci dungeon aktif (perbandingan objek tidak sah)
  opened:{},            // peti yang sudah dibuka (persisten)
  cleared:{},           // dungeon yang sudah ditaklukkan (persisten)
  SAVE_KEY:'forest_survival_chest_v1',

  /* ---------- tabel harta per tingkat ---------- */
  LOOT:[
    /* lvl 1 */[['wood',4,8],['stone',4,8],['fiber',3,6],['bread',1,2]],
    /* lvl 2 */[['stone',6,10],['iron_ore',2,4],['coal',2,5],['leather',1,3]],
    /* lvl 3 */[['iron_ore',3,6],['gold_ore',2,4],['crystal',1,2],['bread',2,3]],
    /* lvl 4 */[['gold_ore',3,6],['crystal',2,4],['iron_ore',5,9],['resin',2,4]],
    /* lvl 5 */[['crystal',4,7],['gold_ore',5,9],['pelt',2,4],['iron_ore',8,12]],
  ],

  init(){
    this.load();
    /* peti harta dungeon punya def sendiri ('dchest') supaya TIDAK menimpa
       'chest' (peti penyimpanan pemain). Modelnya sama-sama voxel Chest.html
       (PortChest) tetapi isinya loot acak, bukan inventori titipan. */
    Furni.DEFS.dchest={
      n:'Peti Harta',e:'🧰',item:null,r:1.9,label:'🧰 Buka Peti',
      build(){return typeof PortChest!=='undefined'
        ?PortChest.build():Dungeon.buildChest();},
      use(f){Dungeon.openChest(f);},
    };
  },

  /* ---------- model peti (kayu + tutup melengkung, bukan kubus) ---------- */
  buildChest(){
    const wood=Furni.M('chestwood',0x7a4a22),
          iron=Furni.M('chestiron',0xb9c2cc),
          gold=Furni.M('chestgold',0xe8c264);
    const g=new THREE.Group();
    const base=Furni.slab(0.86,0.46,0.58,wood);
    base.position.y=0.25;g.add(base);
    /* tutup: setengah silinder → melengkung seperti peti sungguhan */
    const lid=new THREE.Mesh(
      new THREE.CylinderGeometry(0.3,0.3,0.86,14,1,false,0,Math.PI),wood);
    lid.rotation.set(0,0,Math.PI/2);lid.position.y=0.5;
    lid.scale.set(1,1,0.96);g.add(lid);
    /* pita besi melingkari badan & tutup */
    for(const sx of[-0.28,0.28]){
      const band=new THREE.Mesh(new THREE.TorusGeometry(0.29,0.022,6,16,Math.PI),iron);
      band.rotation.set(0,Math.PI/2,0);band.position.set(sx,0.5,0);
      band.scale.set(1,1,0.98);g.add(band);
      const bb=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.46,0.6),iron);
      bb.position.set(sx,0.25,0);g.add(bb);
    }
    /* kunci emas di depan */
    const lock=new THREE.Mesh(new THREE.SphereGeometry(0.075,10,8),gold);
    lock.scale.set(1,1.2,0.6);lock.position.set(0,0.44,0.3);g.add(lock);
    const kh=new THREE.Mesh(new THREE.TorusGeometry(0.055,0.018,6,12),gold);
    kh.position.set(0,0.55,0.28);g.add(kh);
    /* kaki kecil */
    for(const sx of[-1,1])for(const sz of[-1,1])
      g.add(Furni.leg(sx*0.36,sz*0.22,0.09,0.045,0.055,iron,0));
    return g;
  },

  /* ---------- posisi peti dalam satu dungeon (deterministik) ---------- */
  chestSpots(d){
    const out=[];
    const n=2+d.lvl*2;                                 // 4–12 peti
    const ri=Math.max(3,Math.floor(d.r/2));
    for(let i=0;i<n;i++){
      /* sebar di kuadran ruangan, hindari lorong salib & tembok */
      const q=i%4, ring=2+Math.floor(i/4)*3;
      const sx=(q===0||q===3)?-1:1, sz=(q<2)?-1:1;
      const off=Math.min(d.r-2,ri-1+ring);
      const jx=Math.floor(WGEN.hash(d.x+i,d.z-i,201)*2);
      const jz=Math.floor(WGEN.hash(d.x-i,d.z+i,203)*2);
      out.push({x:d.x+sx*(off-jx)+0.5,z:d.z+sz*(off-jz)+0.5,i});
    }
    return out;
  },

  /* ---------- membuka peti ---------- */
  openChest(f){
    const key=f.ckey;
    if(this.opened[key]){UI.toast('🧰 Peti ini sudah kosong');return;}
    this.opened[key]=true;this.save();
    const lvl=clamp(f.lvl||1,1,5);
    const table=this.LOOT[lvl-1];
    const rolls=2+Math.floor(Math.random()*2)+(lvl>=4?1:0);
    const got=[];
    for(let i=0;i<rolls;i++){
      const e=table[(Math.random()*table.length)|0];
      if(!ITEMS[e[0]])continue;
      const n=e[1]+Math.floor(Math.random()*(e[2]-e[1]+1));
      RPG.addItem(e[0],n);
      got.push(`${ITEMS[e[0]].e} ${ITEMS[e[0]].n} ×${n}`);
    }
    /* animasi tutup terbuka + kilau (lid voxel ditangani Furni.update) */
    f.lidOpen=true;
    if(f.mesh)f.mesh.children.forEach(c=>{
      if(c.geometry&&c.geometry.type==='CylinderGeometry'&&c.position.y>0.4)
        c.rotation.x=-0.9;
    });
    FX.debris(new THREE.Vector3(f.x,f.y+0.7,f.z),0xffd76b,16,3);
    FX.ring(f.x,f.y+0.1,f.z,0xffd76b,1.1,3);
    Sfx.pickup();Sfx.levelup();
    Player.addXP(12+lvl*8);
    UI.toast(`🧰 Harta tingkat ${lvl}: ${got.join(', ')||'kosong'}`);
    UI.renderAll();
  },

  /* =========================================================================
     UPDATE: buat peti saat mendekat, spawn penjaga, notifikasi masuk
     ========================================================================= */
  update(dt){
    if(!Game.started)return;
    const near=WGEN.nearestDungeon(Player.pos.x,Player.pos.z);
    /* --- pasang peti untuk dungeon yang dekat --- */
    if(near&&near.dist<64&&!this.built[near.d.key]){
      this.built[near.d.key]=true;
      this.builtInfo[near.d.key]={x:near.d.x,z:near.d.z};
      for(const s of this.chestSpots(near.d)){
        const ck=near.d.key+':'+s.i;
        const f=Furni.place('dchest',s.x,CFG.SEA,s.z,
          WGEN.hash(s.x,s.z,7)*Math.PI*2,true);
        if(f){f.ckey=ck;f.lvl=near.d.lvl;f.dkey=near.d.key;
          if(this.opened[ck]){
            /* peti sudah pernah dikuras: tampil terbuka tanpa animasi ulang */
            f.lidOpen=true;f.chestOpen=true;
            const A=(typeof PortChest!=='undefined')?PortChest.OPEN_ANGLE:-1.92;
            f.lidFrom=f.lidTo=f.lidA=A;f.lidT=1;
          }
        }
      }
      this.buildProps(near.d);
    }
    /* --- lupakan dungeon yang jauh supaya petinya bisa dipasang lagi --- */
    for(const k in this.builtInfo){
      if(!this.built[k])continue;
      const b=this.builtInfo[k];
      if(Math.hypot(b.x-Player.pos.x,b.z-Player.pos.z)<=96)continue;
      for(let i=Furni.list.length-1;i>=0;i--)
        if(Furni.list[i].dkey===k)Furni.remove(Furni.list[i],false);
      this.clearProps(k);
      this.built[k]=false;
    }
    this.animateWraiths(dt);

    /* --- status di dalam dungeon ---
       CATATAN BUG: dulu dibandingkan `this.active!==near.d`. nearestDungeon()
       membuat objek dungeon BARU tiap frame, jadi perbandingan objek selalu
       benar dan notifikasi "memasuki reruntuhan" muncul terus-menerus.
       Sekarang yang dibandingkan kuncinya (string), bukan objeknya. */
    const inside=near&&near.dist<=near.d.r;
    const key=inside?near.d.key:null;
    if(inside&&this.activeKey!==key){
      this.active=near.d;this.activeKey=key;
      UI.toast(this.cleared[key]
        ? `🏛️ Reruntuhan Tingkat ${near.d.lvl} (sudah ditaklukkan)`
        : `⚔️ Reruntuhan Tingkat ${near.d.lvl} — hati-hati, ada penjaganya!`);
      Sfx.growl();
    }else if(inside){
      this.active=near.d;                       // segarkan objek, kunci tetap
    }else if(this.activeKey&&(!near||near.dist>near.d.r+4)){
      this.active=null;this.activeKey=null;
      UI.toast('🚪 Kau meninggalkan reruntuhan');
    }
    if(inside)this.checkClear(near.d);

    /* --- penjaga: monster tambahan hanya di dalam benteng --- */
    if(!this.active)return;
    if(this.cleared[this.activeKey])return;     // sudah ditaklukkan → tenang
    this.spawnT-=dt;
    if(this.spawnT>0)return;
    this.spawnT=3.5;
    const d=this.active;
    const guards=Monsters.list.filter(m=>!m.dead&&
      Math.max(Math.abs(m.pos.x-d.x),Math.abs(m.pos.z-d.z))<=d.r+1).length;
    const cap=2+d.lvl*2;
    if(guards>=cap)return;
    /* titik spawn acak di dalam benteng, jangan tepat di wajah pemain */
    let x=0,z=0,ok=false;
    for(let t=0;t<10&&!ok;t++){
      x=d.x+rand(-d.r+2,d.r-2);z=d.z+rand(-d.r+2,d.r-2);
      if(Math.hypot(x-Player.pos.x,z-Player.pos.z)>6)ok=true;
    }
    if(!ok)return;
    const pool=BIOME_INFO[d.biome].mobs;
    let type=pool[(Math.random()*pool.length)|0];
    if(d.lvl>=3&&Math.random()<0.4)type='golem';
    /* bos penjaga: satu per dungeon tingkat 4+ */
    const wantBoss=d.lvl>=4&&!Monsters.list.some(m=>!m.dead&&m.boss&&
      Math.max(Math.abs(m.pos.x-d.x),Math.abs(m.pos.z-d.z))<=d.r+1);
    const y=World.topY(Math.floor(x),Math.floor(z));
    const m=Monsters.make(type,new THREE.Vector3(x,Math.max(CFG.SEA,y),z),wantBoss);
    this.dressGuard(m,d.lvl);
    /* penjaga lebih kuat mengikuti tingkat dungeon */
    m.hp=m.maxhp=Math.round(m.maxhp*(1+0.22*(d.lvl-1)));
    m.dmg=m.dmg*(1+0.16*(d.lvl-1));
    Monsters.list.push(m);
    if(wantBoss){
      UI.toast(`☠️ Penjaga Agung reruntuhan tingkat ${d.lvl} terbangun!`);
      FX.ring(x,Math.max(CFG.SEA,y)+0.1,z,0xff6bd6,1.2,5);
    }
  },

  /* =========================================================================
     MENAKLUKKAN DUNGEON + HADIAH
     -------------------------------------------------------------------------
     Sebuah reruntuhan dianggap "ditaklukkan" bila SEMUA petinya sudah dibuka
     dan tidak ada penjaga hidup yang tersisa di dalam bentengnya. Sekali
     ditaklukkan, statusnya disimpan permanen: penjaga berhenti muncul dan
     tempat itu jadi markas aman.
     ========================================================================= */
  checkClear(d){
    const k=d.key;
    if(this.cleared[k])return;
    for(const s of this.chestSpots(d))if(!this.opened[k+':'+s.i])return;
    const alive=Monsters.list.some(m=>!m.dead&&
      Math.max(Math.abs(m.pos.x-d.x),Math.abs(m.pos.z-d.z))<=d.r+1);
    if(alive)return;
    this.cleared[k]=true;this.save();
    this.clearReward(d);
  },
  clearReward(d){
    const lvl=clamp(d.lvl,1,5);
    const got=[];
    const add=(id,n)=>{
      if(!ITEMS[id]||n<=0)return;
      RPG.addItem(id,n);got.push(`${ITEMS[id].e} ${ITEMS[id].n} ×${n}`);
    };
    /* hadiah pasti: satu tumpuk penuh tiap bahan dari tabel harta tingkat itu */
    for(const e of this.LOOT[lvl-1])add(e[0],Math.round(e[2]*(0.6+lvl*0.2)));
    add('bread',2+lvl);
    if(lvl>=3)add('crystal',lvl);
    const xp=70+lvl*50;
    Player.addXP(xp);
    Player.hp=Player.maxHp();                    // dipulihkan sebagai bonus
    FX.ring(Player.pos.x,Player.pos.y+0.1,Player.pos.z,0xffe066,1.4,6);
    FX.debris(Player.pos.clone().add(new THREE.Vector3(0,1.2,0)),0xffe066,26,3.5);
    Sfx.levelup();
    UI.toast(`🏆 Reruntuhan Tingkat ${lvl} DITAKLUKKAN! +${xp} XP, HP pulih`);
    UI.toast(`🎁 Hadiah: ${got.join(', ')||'—'}`);
    UI.renderAll();
  },

  /* =========================================================================
     PERABOT & PENJAGA KHAS RERUNTUHAN (model dari Model.html)
     -------------------------------------------------------------------------
     Barel kayu berpalang besi dipasang berkelompok di dalam benteng sebagai
     penanda ruang penyimpanan, dan sebagian penjaga memakai wujud Wraith:
     jubah melayang tanpa kaki dengan mata menyala. Keduanya murni tampilan —
     stat & AI monster tetap memakai tipe aslinya supaya tidak ada perubahan
     keseimbangan permainan.
     ========================================================================= */
  props:{},
  wraiths:[],

  /* --- satu barel: badan lathe menggembung + tutup + palang besi --- */
  makeBarrel(scale=1){
    const g=new THREE.Group();
    const H=0.95,rB=0.33,rM=0.46;
    const rAt=t=>rM-(rM-rB)*Math.pow(2*t-1,2);
    const prof=[];
    for(let i=0;i<=10;i++){const t=i/10;prof.push(new THREE.Vector2(rAt(t),t*H));}
    prof.push(new THREE.Vector2(rAt(1)-0.03,H));
    const wood=new THREE.MeshLambertMaterial({color:0x7a5230});
    const lidM=new THREE.MeshLambertMaterial({color:0x8f6238});
    const iron=new THREE.MeshLambertMaterial({color:0x6d747c});
    g.add(new THREE.Mesh(new THREE.LatheGeometry(prof,16),wood));
    const lidG=new THREE.CircleGeometry(rAt(1)-0.035,14);
    const lid=new THREE.Mesh(lidG,lidM);
    lid.rotation.x=-Math.PI/2;lid.position.y=H-0.035;g.add(lid);
    const bot=new THREE.Mesh(lidG.clone(),lidM);
    bot.rotation.x=-Math.PI/2;bot.position.y=0.035;g.add(bot);
    for(const t of[0.12,0.86]){
      const hoop=new THREE.Mesh(new THREE.TorusGeometry(rAt(t)+0.01,0.016,6,18),iron);
      hoop.rotation.x=Math.PI/2;hoop.position.y=t*H;g.add(hoop);
    }
    g.scale.setScalar(scale);
    return g;
  },
  /* --- kelompok barel: dua berdiri, satu rebah bersandar --- */
  makeBarrels(){
    const g=new THREE.Group();
    const b1=this.makeBarrel();g.add(b1);
    const b2=this.makeBarrel(0.88);
    b2.position.set(0.78,0,0.32);b2.rotation.y=0.7;g.add(b2);
    const b3=this.makeBarrel(0.92);
    b3.rotation.z=Math.PI/2;b3.rotation.y=0.5;
    b3.position.set(0.05,0.42,1.05);g.add(b3);
    return g;
  },
  /* pasang beberapa kelompok barel di sudut dalam benteng */
  buildProps(d){
    if(this.props[d.key])return;
    const arr=[];
    const spots=[[-1,-1],[1,-1],[-1,1],[1,1]];
    for(let i=0;i<spots.length;i++){
      if(WGEN.hash(d.x+i*7,d.z-i*3,21)>0.55)continue;   // tidak semua sudut isi
      const[sx,sz]=spots[i];
      const g=this.makeBarrels();
      g.position.set(d.x+sx*(d.r-2.5),CFG.SEA,d.z+sz*(d.r-2.5));
      g.rotation.y=WGEN.hash(d.x+i,d.z+i,22)*Math.PI*2;
      g.traverse(o=>{if(o.isMesh)o.castShadow=!IS_MOBILE;});
      Game.scene.add(g);arr.push(g);
    }
    this.props[d.key]=arr;
  },
  clearProps(k){
    const arr=this.props[k];
    if(!arr)return;
    for(const g of arr){
      Game.scene.remove(g);
      g.traverse(o=>{if(o.geometry)o.geometry.dispose();
        if(o.material)o.material.dispose();});
    }
    delete this.props[k];
  },

  /* --- wujud Wraith: jubah melayang, wajah gelap, mata & orb menyala --- */
  makeWraith(){
    const g=new THREE.Group();
    const prof=[[0.001,1.62],[0.09,1.55],[0.16,1.44],[0.21,1.3],[0.24,1.12],
      [0.27,0.9],[0.31,0.65],[0.38,0.38],[0.47,0.12],[0.52,0.02]]
      .map(p=>new THREE.Vector2(p[0],p[1]));
    const geo=new THREE.LatheGeometry(prof,18);
    /* ujung jubah dibuat bergelombang supaya terlihat robek & melayang */
    const pa=geo.attributes.position;
    for(let i=0;i<pa.count;i++){
      const y=pa.getY(i);
      if(y<0.16){
        const x=pa.getX(i),z=pa.getZ(i),a=Math.atan2(z,x);
        pa.setY(i,y+Math.abs(Math.sin(a*4.5))*0.09-0.04);
        const k=1+Math.sin(a*7)*0.06;pa.setX(i,x*k);pa.setZ(i,z*k);
      }
    }
    geo.computeVertexNormals();
    const cloakM=new THREE.MeshLambertMaterial({color:0x241b33});
    const cloak=new THREE.Mesh(geo,cloakM);g.add(cloak);
    const face=new THREE.Mesh(new THREE.SphereGeometry(0.13,8,6),
      new THREE.MeshBasicMaterial({color:0x000000}));
    face.scale.set(1,1.2,0.7);face.position.set(0,1.34,0.1);g.add(face);
    const eyes=[];
    for(const x of[-0.055,0.055]){
      const e=new THREE.Mesh(new THREE.SphereGeometry(0.028,6,6),
        new THREE.MeshBasicMaterial({color:0xbfe6ff}));
      e.position.set(x,1.36,0.2);g.add(e);eyes.push(e);
    }
    for(const s of[-1,1]){
      const arm=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.55,6),cloakM);
      arm.position.set(s*0.3,0.95,0.16);arm.rotation.set(-1.9,0,s*0.35);g.add(arm);
    }
    const orbs=new THREE.Group();g.add(orbs);
    for(let i=0;i<3;i++){
      const o=new THREE.Mesh(new THREE.SphereGeometry(0.07,8,6),
        new THREE.MeshBasicMaterial({color:0x8f6bd8}));
      o.userData.off=i*2.1;orbs.add(o);
    }
    return {group:g,orbs,eyes};
  },
  /* sebagian penjaga reruntuhan tingkat 2+ tampil sebagai wraith */
  dressGuard(m,lvl){
    if(!m||lvl<2||Math.random()>0.45)return;
    const w=this.makeWraith();
    /* model asli disembunyikan, bukan dihapus: animasi tipe aslinya tetap
       boleh berjalan tanpa error karena part-nya masih ada */
    m.mesh.children.slice().forEach(c=>{c.visible=false;});
    w.group.scale.setScalar(m.boss?1.6:1.15);
    m.mesh.add(w.group);
    m.wraith=w;
    this.wraiths.push(m);
  },
  animateWraiths(dt){
    if(!this.wraiths.length)return;
    const t=performance.now()*0.001;
    for(let i=this.wraiths.length-1;i>=0;i--){
      const m=this.wraiths[i];
      if(m.dead||Monsters.list.indexOf(m)<0){this.wraiths.splice(i,1);continue;}
      const w=m.wraith;
      w.group.position.y=0.28+Math.sin(t*1.2)*0.13;      // melayang naik-turun
      w.orbs.children.forEach(o=>{
        const a=t*1.5+o.userData.off;
        o.position.set(Math.cos(a)*0.58,0.9+Math.sin(t*2+o.userData.off)*0.32,
          Math.sin(a)*0.58);
      });
      /* mata makin terang saat sedang memburu pemain */
      const c=m.state==='chase'?0xffffff:0xbfe6ff;
      w.eyes.forEach(e=>e.material.color.setHex(c));
    }
  },

  /* ---------- simpan status peti & dungeon yang sudah ditaklukkan ---------- */
  save(){
    try{localStorage.setItem(this.SAVE_KEY,
      JSON.stringify({o:this.opened,c:this.cleared}));}catch(e){}
  },
  load(){
    try{
      const o=JSON.parse(localStorage.getItem(this.SAVE_KEY));
      if(!o||typeof o!=='object')return;
      /* format lama: objek peti langsung; format baru: {o:…,c:…} */
      if(o.o||o.c){this.opened=o.o||{};this.cleared=o.c||{};}
      else this.opened=o;
    }catch(e){}
  },
};
