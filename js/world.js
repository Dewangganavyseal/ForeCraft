'use strict';
/* Manajemen chunk: streaming, edit blok, reruntuhan, banjir air */
const World={
  chunks:new Map(),dirty:new Set(),pending:[],flood:[],blockHP:new Map(),
  /* regrow: tanah (DIRT) yang terbuka setelah blok grass hancur; setelah
     REGROW_T detik kembali menjadi GRASS dan ditumbuhi rumput dunia kecil. */
  regrow:[],REGROW_T:15,
  group:new THREE.Group(),lcx:1e9,zcz:1e9,loadList:[],
  idx:(x,y,z)=>x+z*16+y*256,
  key:(cx,cz)=>cx+','+cz,

  getChunk(cx,cz){
    const k=this.key(cx,cz);
    let c=this.chunks.get(k);
    if(!c){
      const g=genChunk(cx,cz);
      c={cx,cz,data:g.data,plants:g.plants,ores:g.ores,group:null};
      this.chunks.set(k,c);
    }
    return c;
  },
  getBlock(wx,wy,wz){
    if(wy<0)return B.STONE;
    if(wy>=CFG.WORLD_H)return B.AIR;
    const cx=Math.floor(wx/16),cz=Math.floor(wz/16);
    return this.getChunk(cx,cz).data[this.idx(wx-cx*16,wy,wz-cz*16)];
  },
  setBlock(wx,wy,wz,id){
    if(wy<0||wy>=CFG.WORLD_H)return;
    const cx=Math.floor(wx/16),cz=Math.floor(wz/16);
    const lx=wx-cx*16,lz=wz-cz*16;
    const c=this.getChunk(cx,cz);
    const old=c.data[this.idx(lx,wy,lz)];
    /* ladang yang dihancurkan/diubah menghapus tanaman di atasnya */
    if(old===B.FARM&&id!==B.FARM&&typeof Farming!=='undefined')
      Farming.removeAt(wx,wy,wz,true);
    c.data[this.idx(lx,wy,lz)]=id;
    /* daftar blok ladang untuk NPC farmer & sistem farming */
    if(typeof Farming!=='undefined'){
      if(id===B.FARM)Farming.registerFarm(wx,wy,wz);
      else if(old===B.FARM)Farming.unregisterFarm(wx,wy,wz);
    }
    this.markDirty(cx,cz);
    if(lx===0)this.markDirty(cx-1,cz);if(lx===15)this.markDirty(cx+1,cz);
    if(lz===0)this.markDirty(cx,cz-1);if(lz===15)this.markDirty(cx,cz+1);
    if(id===B.AIR){
      c.plants=c.plants.filter(p=>!(p.x===lx&&p.z===lz&&p.y>=wy));
    }
  },
  markDirty(cx,cz){
    if(this.chunks.has(this.key(cx,cz)))this.dirty.add(this.key(cx,cz));
  },
  topY(wx,wz){
    for(let y=CFG.WORLD_H-1;y>=0;y--){
      const b=this.getBlock(wx,y,wz);
      if(b!==B.AIR&&b!==B.WATER)return y+1;
    }
    return 0;
  },
  /* Tinggi lantai di kolom (x,z).
     ---------------------------------------------------------------------
     `fromY` = ketinggian kaki entitas. Bila diisi, pencarian dimulai dari
     setinggi langkah kaki, BUKAN dari puncak dunia � blok yang berada di
     atas kepala diabaikan.

     Tanpa batas ini, ambang atas pintu (lintel) ikut terbaca sebagai
     "lantai" setinggi atap, sehingga pemeriksaan naik-tangga menolak gerak
     dan pintu terasa tertutup dinding tak terlihat. Menghancurkan dinding
     terasa "membuka jalan" hanya karena sisa balok kayu di atasnya memang
     dilewati daftar pengecualian di bawah. */
  /* blok yang dihitung sebagai "lantai" oleh groundAt. Udara/air/kanopi/
     batang sengaja BUKAN lantai supaya pemain bisa berjalan di bawah
     pohon & tidak menempel ke kanopi. B.ROOF dan B.PLANK adalah lantai padat
     (termasuk lantai trim kayu di arena dungeon) agar tidak tembus.
     CATATAN ORE: node ore adalah bongkahan 3D yang BERDIRI DI ATAS tanah,
     BUKAN lantai yang bisa dipijak — maka ore sengaja dikecualikan dari
     lantai agar pemain tidak "terangkat" menaiki model ore. Namun ore TETAP
     PADAT untuk tabrakan horizontal (lihat blockedAt & solidBody di bawah)
     supaya pemain tidak menembusnya. */
  isFloor(id){return id!==B.AIR&&id!==B.WATER&&id!==B.WOOD&&id!==B.LEAF&&(typeof ORE_INFO==='undefined'||!ORE_INFO[id]);},
  /* true bila blok ini BADAN PADAT yang menghalangi ruang tubuh pemain
     (dipakai headroomOK & unburyY). Sama seperti isFloor, TETAPI ore ikut
     dianggap padat agar pemain tidak bisa berdiri menembus bongkahan ore. */
  solidBody(id){return this.isFloor(id)||(typeof ORE_INFO!=='undefined'&&!!ORE_INFO[id]);},

  groundAt(x,z,fromY){
    /* radius sampling disamakan dengan radius tabrakan pemain (0.28) supaya
       kolom dinding di sebelah tidak ikut terbaca sebagai lantai */
    const r=0.26;let g=0;
    const yTop=(fromY===undefined)?CFG.WORLD_H-1
              :clamp(Math.floor(fromY+0.02),0,CFG.WORLD_H-1);
    /* ALTAR RITUAL: strukturnya mesh, bukan blok dunia, jadi permukaannya tidak
       terbaca oleh pemindaian blok di bawah. Tanpa ini altar hanya punya
       tabrakan: pemain tak pernah bisa memijak atau melompat ke atasnya karena
       lantai yang dilaporkan selalu tanah DI BAWAH altar, sehingga ia langsung
       ditarik turun lagi. Tingkat yang JAUH di atas kepala diabaikan (mengikuti
       aturan blok: hanya blok pada level <= yTop yang boleh jadi lantai) supaya
       pemain yang berdiri di samping pedestal tidak ikut terangkat. */
    const useAltar=(typeof Altar!=='undefined'&&Altar.topAt&&Altar.list&&Altar.list.length);
    for(const[ox,oz]of[[-r,-r],[r,-r],[-r,r],[r,r]]){
      // Kanopi dan batang bukan lantai. Jika ikut dihitung, pemain akan
      // tertahan saat mendekati pohon karena sisi batang terlihat seperti
      // perbedaan tinggi yang terlalu besar.
      const bx=Math.floor(x+ox),bz=Math.floor(z+oz);
      let gy=0;
      for(let y=yTop;y>=0;y--){
        const id=this.getBlock(bx,y,bz);
        /* atap tidak dianggap lantai supaya pemain tidak "menempel" di
           genteng saat berjalan di samping rumah */
        if(this.isFloor(id)){gy=y+1;break;}
      }
      if(useAltar){
        const at=Altar.topAt(x+ox,z+oz);
        if(at>gy&&at<=yTop+1)gy=at;
      }
      /* BONGKAHAN ORE: kini collision-nya HEIGHTFIELD yang mengikuti bentuk
         bongkahan, dan pemain BISA MENAPAK di atasnya — topAt melaporkan
         tinggi permukaan bongkahan di titik ini sebagai lantai tambahan.
         Batas yTop+1.5: pemain yang berdiri di tanah di samping bongkahan
         tinggi tidak ikut terangkat, tapi yang melompat/menapak undakan
         bongkahan mendapat pijakan yang benar. */
      if(typeof Env_Ore!=='undefined'&&Env_Ore.topAt&&
         Env_Ore.activeNodes&&Env_Ore.activeNodes.size){
        const ot=Env_Ore.topAt(x+ox,z+oz);
        if(ot>gy&&ot<=yTop+1.5)gy=ot;
      }
      if(gy>g)g=gy;
    }
    return g;
  },

  /* Tinggi permukaan TANAH BIOME MURNI (hanya blok dunia) — TANPA bongkahan
     ore, TANPA altar. Dipakai fisika SERPIHAN ore (OreFX) supaya pecahan batu
     jatuh & menggelinding menyentuh TANAH, bukan melayang menempel di atas
     bongkahan ore yang masih tersisa (groundAt menyertakan Env_Ore.topAt
     sebagai lantai, yang membuat serpihan tampak berhenti di udara). */
  terrainAt(x,z,fromY){
    const yTop=(fromY===undefined)?CFG.WORLD_H-1
              :clamp(Math.floor(fromY+0.02),0,CFG.WORLD_H-1);
    const bx=Math.floor(x),bz=Math.floor(z);
    for(let y=yTop;y>=0;y--){
      if(this.isFloor(this.getBlock(bx,y,bz)))return y+1;
    }
    return 0;
  },

  /* Permukaan terendah di ATAS ketinggian kaki `y` tempat pemain bisa berdiri
     pada kolom pusat (x,z). Memindai NAIK selama blok masih padat. Dipakai
     sebagai garansi anti-"terhisap terrain": bila kaki pemain sampai berada
     DI DALAM blok padat (terdorong ke sudut struktur, sisa posisi save lama,
     dsb.), panggil fungsi ini lalu set pos.y ke hasilnya agar pemain selalu
     didorong keluar ke permukaan � tidak pernah terkubur. Mengembalikan y
     apa adanya bila kaki tidak berada di dalam blok padat. */
  unburyY(x,z,y){
    const bx=Math.floor(x),bz=Math.floor(z);
    let yy=Math.floor(y+0.001);
    if(yy<0)yy=0;
    if(yy>=CFG.WORLD_H)return y;
    if(!this.solidBody(this.getBlock(bx,yy,bz)))return y;   // tidak terkubur
    while(yy<CFG.WORLD_H&&this.solidBody(this.getBlock(bx,yy,bz)))yy++;
    return yy;
  },

  /* Apakah ada ruang kosong setinggi tubuh pemain bila kaki berdiri di
     `feetY` pada kolom (x,z). Memindai 2 level blok (kaki & dada) di empat
     sudut tabrakan. Dipakai sebagai penjaga gerak horizontal supaya pemain
     TIDAK PERNAH dipindahkan ke posisi yang membuat badannya berada DI DALAM
     blok lantai padat � ini penutup hulu bug "terhisap terrain" (pemain
     terdorong masuk ke celah blok lalu terjebak dan harus loncat untuk lepas).
     Mengembalikan false bila ada blok lantai padat di ruang tubuh. */
  headroomOK(x,z,feetY){
    const r=0.26;
    const fy=Math.floor(feetY+0.02);
    for(const[ox,oz]of[[-r,-r],[r,-r],[-r,r],[r,r]]){
      const bx=Math.floor(x+ox),bz=Math.floor(z+oz);
      for(let dy=0;dy<=1;dy++){
        if(this.solidBody(this.getBlock(bx,fy+dy,bz)))return false;
      }
    }
    return true;
  },
  blockedAt(x,y,z,r=0.3){
    // Rintangan horizontal untuk batang pohon dan batu. Daun sengaja tidak
    // memblokir agar pemain tetap bisa berjalan di bawah kanopi.
    const samples=[[0,0],[r,0],[-r,0],[0,r],[0,-r],[r*.7,r*.7],[-r*.7,r*.7],[r*.7,-r*.7],[-r*.7,-r*.7]];
    const by=Math.floor(y+0.45),by2=Math.floor(y+1.15);
    /* ALTAR RITUAL: struktur mesh (bukan blok dunia), jadi tabrakannya diuji
       terpisah — tanpa ini altar bisa ditembus begitu saja. */
    if(typeof Altar!=='undefined'&&Altar.solidAt&&
       samples.some(([ox,oz])=>Altar.solidAt(x+ox,y+0.45,z+oz)||
                               Altar.solidAt(x+ox,y+1.15,z+oz)))return true;
    /* KIOS & perabot PADAT (Furni): meja counter kios Dungeon Master dsb.
       Tanpa ini pemain menembus bangunannya begitu saja. */
    if(typeof Furni!=='undefined'&&Furni.solidAt&&
       samples.some(([ox,oz])=>Furni.solidAt(x+ox,y+0.45,z+oz)||
                                Furni.solidAt(x+ox,y+1.15,z+oz)))return true;
    /* NODE ORE BONGKAHAN (Env_Ore): model 3D lebar ~3.5 blok, jauh melebihi
       1 kolom blok ore di data dunia. Collision footprint-nya diuji terpisah
       supaya pemain tidak menembus bagian bongkahan yang melebar. */
    if(typeof Env_Ore!=='undefined'&&Env_Ore.solidAt&&
       samples.some(([ox,oz])=>Env_Ore.solidAt(x+ox,y+0.45,z+oz)||
                                Env_Ore.solidAt(x+ox,y+1.15,z+oz)))return true;
    return samples.some(([ox,oz])=>{
      const id1=this.getBlock(Math.floor(x+ox),by,Math.floor(z+oz));
      const id2=this.getBlock(Math.floor(x+ox),by2,Math.floor(z+oz));
      /* papan dinding & atap rumah ikut memblokir supaya pemain masuk lewat pintu; ore memblokir agar tidak ditembus */
      const solid=id=>id===B.WOOD||id===B.STONE||id===B.PLANK||id===B.ROOF||(typeof ORE_INFO!=='undefined'&&!!ORE_INFO[id]);
      return solid(id1)||solid(id2);
    });
  },
  inWaterAt(x,y,z){
    /* kolom air membentang y=0..SEA-1; clamp mengikuti CFG.SEA supaya tetap
        benar setelah kedalaman sungai dinaikkan (SEA=6) */
    return this.getBlock(Math.floor(x),clamp(Math.floor(y),0,CFG.SEA-1),Math.floor(z))===B.WATER;
  },

  /* =========================================================================
     LINE OF SIGHT (garis pandang)
      -------------------------------------------------------------------------
     Blok apa saja yang menahan pandangan. Udara, air, dan daun TEMBUS pandang
     (pemain & makhluk tetap bisa melihat lewat sela kanopi / di dalam air);
     semua blok padat lain (tanah, batu, dinding papan, atap, batang) menutupi.
     Dipakai losBlocked supaya monster & NPC TIDAK bisa melihat menembus
     tembok � misalnya dari dalam rumah mereka tak melihat apa pun di luar.
     ========================================================================= */
  blocksSight(id){return id!==B.AIR&&id!==B.WATER&&id!==B.LEAF;},
  /* true bila ada blok padat di antara titik A dan B (pandangan terhalang).
      Marching sampel tiap 0.5 blok sepanjang garis � cukup rapat agar tidak ada
      blok tipis yang terlewat. Titik ujung (blok tempat A/B berdiri) sengaja
      tidak ikut dihitung supaya tidak salah deteksi. */
  losBlocked(ax,ay,az,bx,by,bz){
    const dx=bx-ax,dy=by-ay,dz=bz-az;
    const dist=Math.sqrt(dx*dx+dy*dy+dz*dz);
    if(dist<0.001)return false;
    const n=Math.max(2,Math.ceil(dist/0.5));
    for(let i=1;i<n;i++){
      const t=i/n;
      const id=this.getBlock(Math.floor(ax+dx*t),Math.floor(ay+dy*t),Math.floor(az+dz*t));
      if(this.blocksSight(id))return true;
    }
    return false;
  },


  /* Jatuhkan item ke dunia supaya bisa dipungut kembali (dipakai saat tas
     penuh, item dibuang pemain, drop ikan, dll). Meneruskan ke sistem drop
     FX yang sudah menangani jatuh, magnet ke pemain, dan pickup.
     `opts.owner=true` memberi jeda ambil (item dari tas pemain tidak langsung
     tersedot balik).
     `opts.lvl` / `opts.mark` membawa data per-instance (level tempa & tanda
     lokasi Log Pass) supaya tidak hilang saat item dibuang lalu dipungut. */
  dropItem(x,y,z,id,n,opts){
    if(n<=0||!ITEMS[id])return;
    FX.spawnDrop(new THREE.Vector3(x,y,z),id,n,opts);
  },

  /* ---------- streaming ----------
      PIPELINE ala Minecraft: pembentukan dunia dibagi dua tahap yang dianggarkan
      per frame supaya TIDAK ada frame yang membeku saat menjelajah:
        TAHAP 1 (gen)  : isi DATA chunk (terrain + desa) � lebih murah, harus
                         siap dulu karena mesh butuh data chunk tetangga.
        TAHAP 2 (mesh) : bangun MESH maksimal 1 chunk/frame, hanya bila data
                         chunk itu + 4 tetangganya sudah ada (pre-gen), sehingga
                         satu panggilan mesh tidak lagi cascade membuat 4 chunk
                         baru sekaligus (penyebab freeze utama versi lama).
      unload dipindah ke momen pemain pindah chunk agar tidak iterasi semua
      chunk tiap frame. */
  update(dt,pp){
    this.processTimers(dt);
    if(typeof Farming!=='undefined')Farming.update(dt,pp);
    if(typeof Env_Ore!=='undefined'&&Env_Ore.update)Env_Ore.update(dt);
    /* waktu angin tumbuhan voxel: satu uniform untuk seluruh dunia, jadi
       semua semak/tebu/tulip bergoyang tanpa biaya per-tanaman */
    if(Mesher.floraTime)Mesher.floraTime.value+=dt;
    /* rumput yang terinjak pemain/mob/NPC (uniform array, biaya CPU kecil) */
    this.updateTrample(dt,pp);
    this.updateCanopy(dt,pp);
    const pcx=Math.floor(pp.x/16),pcz=Math.floor(pp.z/16);
    if(pcx!==this.lcx||pcz!==this.zcz){
      this.lcx=pcx;this.zcz=pcz;
      /* antrean urut jarak (terdekat dulu). Radius VIEW_R+1 agar tepi chunk
         yang di-mesh sudah punya data tetangga siap (pre-gen). */
      this.loadList=[];
      const R=CFG.VIEW_R;
      for(let dz=-R-1;dz<=R+1;dz++)for(let dx=-R-1;dx<=R+1;dx++)
        this.loadList.push({cx:pcx+dx,cz:pcz+dz,d:dx*dx+dz*dz});
      this.loadList.sort((a,b)=>a.d-b.d);
      /* unload chunk jauh (hanya saat pemain pindah chunk) */
      for(const[k,c]of this.chunks){
        if(c.group&&(Math.abs(c.cx-pcx)>CFG.VIEW_R+2||Math.abs(c.cz-pcz)>CFG.VIEW_R+2)){
          this.disposeGroup(c);c.group=null;
        }
      }
      /* rumput dunia hanya tampak dalam radius dekat: sembunyikan yang jauh
         (hemat jutaan wajah di render pass tanpa membuang mesh terrain-nya) */
      this.updateGrassVisibility(pcx,pcz);
    }
    /* ANGGARAN WAKTU per frame (ms). Semua tahap streaming dibatasi angka ini.
       MODE PERSIAPAN: saat menu panorama / layar loading (pemain belum mulai),
       anggaran dinaikkan & kuota dilebarkan — dunia jadi siap jauh lebih cepat
       tanpa pernah mengganggu gameplay, karena gameplay memang belum berjalan. */
    const t0=performance.now();
    const warm=(typeof Game!=='undefined')&&(!Game.started||Game.menuMode);
    const BUDGET=warm?16:(IS_MOBILE?3:5);

    /* TAHAP 1 — generate DATA chunk yang belum ada, terdekat dulu. */
    let gens=0;
    const genMax=warm?6:(IS_MOBILE?2:3);
    for(const e of this.loadList){
      if(gens>=genMax)break;
      if(performance.now()-t0>BUDGET)break;
      if(this.chunks.has(this.key(e.cx,e.cz)))continue;   // data sudah ada
      this.getChunk(e.cx,e.cz);                            // buat data (terrain+desa)
      gens++;
    }

    /* TAHAP 2 — mesh MAKSIMAL 1 chunk per frame (2 saat persiapan), hanya yang
       data + 8 tetangganya sudah siap (4 sisi utk wajah perbatasan + 4 diagonal
       utk AO sudut). Dengan begini mesh tidak memicu generasi chunk apa pun
       (bebas cascade). Anggaran habis → berhenti, lanjut frame berikut. */
    if(performance.now()-t0<BUDGET){
      const R=CFG.VIEW_R;
      let meshed=0;
      for(const e of this.loadList){
        if(e.d>R*R)break;                                  // hanya radius render
        if(meshed>=(warm?2:1))break;
        const c=this.chunks.get(this.key(e.cx,e.cz));
        if(!c||c.group)continue;                           // belum ada data / sudah mesh
        let ready=true;
        for(let dz=-1;dz<=1&&ready;dz++)for(let dx=-1;dx<=1;dx++){
          if(dx===0&&dz===0)continue;
          if(!this.chunks.has(this.key(e.cx+dx,e.cz+dz))){ready=false;break;}
        }
        if(!ready)continue;                                // tetangga belum siap
        this.buildMesh(c);
        meshed++;                                          // cukup utk frame ini
      }
    }

    /* remesh chunk kotor (edit blok) � anggaran kecil, maks 2 */
    let rem=0;
    for(const k of this.dirty){
      if(rem>=2)break;
      if(performance.now()-t0>BUDGET)break;
      const c=this.chunks.get(k);
      if(c&&Math.abs(c.cx-pcx)<=CFG.VIEW_R+1&&Math.abs(c.cz-pcz)<=CFG.VIEW_R+1){
        this.buildMesh(c);rem++;
      }
      this.dirty.delete(k);
    }
  },
  /* Bangun ulang SELURUH mesh chunk yang sedang tampil. Dipakai saat preset
     grafis berubah (Gfx.apply): subdivisi air, ambang rumput, dan radius render
     semuanya dibaca ulang saat mesh dibangun. Data chunk (terrain) TIDAK
     dibuang — hanya meshnya, jadi dunia & bangunan tetap sama.
     Chunk di luar radius baru dilepas; sisanya ditandai dirty agar dibangun
     bertahap oleh update() sesuai anggaran per frame (tidak membekukan game). */
  rebuildAll(){
    const pcx=this.lcx,pcz=this.zcz;
    for(const[k,c]of this.chunks){
      if(!c.group)continue;
      this.disposeGroup(c);c.group=null;
      /* hanya chunk dalam radius render baru yang perlu dibangun lagi */
      if(Math.abs(c.cx-pcx)<=CFG.VIEW_R+1&&Math.abs(c.cz-pcz)<=CFG.VIEW_R+1)
        this.dirty.add(k);
    }
    /* paksa antrean muat dihitung ulang di frame berikutnya (radius bisa
       berubah) dengan menganggap pemain baru saja pindah chunk */
    this.lcx=1e9;this.zcz=1e9;
  },

  disposeGroup(c){
    if(typeof Env_Ore!=='undefined'&&Env_Ore.disposeChunkOres)Env_Ore.disposeChunkOres(c);
    Game.scene.remove(c.group);
    c.group.traverse(o=>{if(o.geometry)o.geometry.dispose();});
    c.grassMesh=null;
    c.group=null;
  },
  /* Sembunyikan mesh RUMPUT DUNIA milik chunk di luar CFG.GRASS_R (radius dari
     chunk pemain). Terrain, pohon, semak, dsb tetap terlihat sampai VIEW_R;
     hanya rumput dekoratif yang dipangkas jaraknya karena ia menyumbang jauh
     lebih banyak wajah daripada apa pun. Dipanggil saat pemain pindah chunk &
     setelah tiap chunk baru di-mesh. */
  updateGrassVisibility(pcx,pcz){
    const R=CFG.GRASS_R;
    for(const[,c]of this.chunks){
      if(!c.grassMesh)continue;
      c.grassMesh.visible=(Math.abs(c.cx-pcx)<=R&&Math.abs(c.cz-pcz)<=R);
    }
  },

  /* ---------- RUMPUT TERINJAK ----------
     Rumput tertekuk menjauh dari apa pun yang melewatinya: pemain, monster, &
     NPC. Tekukannya dihitung di VERTEX SHADER (lihat applyGrassShader di
     mesher.js), jadi yang perlu dikirim per frame hanya DAFTAR PENGINJAK —
     bukan menyentuh geometri rumput sama sekali.

     Anggaran ketat supaya tetap ringan:
       · maksimum Mesher.trampleMax (12) penginjak aktif; yang dipakai adalah
         yang TERDEKAT ke pemain, karena hanya itu yang terlihat di layar.
       · hanya entitas hidup yang punya mesh & berada dalam radius rumput.
       · loop hanya menyentuh array yang sudah ada (Monsters.list, NPCS.list),
         tanpa alokasi objek baru per frame — slot Vector4 dipakai ulang.

     KEKUATAN (w) DIHALUSKAN, ASIMETRIS: naik cepat, turun lambat.
       · entitas mulai bergerak  → w melompat ke 1 dalam ~0,1 detik (rumput
         langsung rebah saat dilangkahi),
       · entitas berhenti/menjauh → w turun perlahan ~1 detik (rumput berdiri
         lagi berangsur, bukan mendadak).
     Nilai w disimpan per entitas di `_trPrev`, jadi tidak perlu state per
     rumput sama sekali. */
  _trPrev:new Map(),      // id → {x,z,w} posisi & kekuatan frame lalu
  _trBuf:[],              // {x,z,r,w,d} kandidat, dipakai ulang tiap frame
  updateTrample(dt,pp){
    if(!Mesher.trample||!Mesher.trampleCount)return;
    const MAXN=Mesher.trampleMax||12;
    const buf=this._trBuf;
    let n=0;
    /* Kekuatan tekukan sebuah entitas, dihaluskan dari kecepatannya.
       `id` harus STABIL antar frame — dipakai mesh.id (unik & tetap selama
       objek hidup) supaya mob/NPC tanpa uid tetap terlacak. */
    const strengthOf=(id,x,z)=>{
      let p=this._trPrev.get(id);
      if(!p){p={x,z,w:0.35};this._trPrev.set(id,p);return p.w;}
      /* kecepatan horizontal. Lonjakan sangat besar = teleport/spawn ulang →
         diabaikan. Ambangnya tinggi (200 blok/s) supaya entitas yang benar-benar
         cepat pada frame rate rendah TIDAK ikut terbuang — dulu ambang 20
         membuat efeknya hilang justru saat bergerak kencang. */
      let spd=0;
      if(dt>0){
        const d=Math.hypot(x-p.x,z-p.z)/dt;
        if(d<200)spd=d;
      }
      p.x=x;p.z=z;
      /* target: diam 0.35 → berlari (>=5 blok/s) 1.0 */
      const tgt=0.35+Math.min(1,spd/5)*0.65;
      /* asimetris: rebah cepat, berdiri lagi lambat */
      const k=(tgt>p.w)?Math.min(1,dt*14):Math.min(1,dt*2.2);
      p.w+=(tgt-p.w)*k;
      return p.w;
    };
    const add=(id,x,z,r)=>{
      const dx=x-pp.x,dz=z-pp.z;
      const d=dx*dx+dz*dz;
      if(d>36*36)return;                       // di luar radius rumput terlihat
      const w=strengthOf(id,x,z);
      if(n<buf.length){const s=buf[n];s.x=x;s.z=z;s.r=r;s.w=w;s.d=d;}
      else buf.push({x,z,r,w,d});
      n++;
    };
    /* --- pemain --- */
    add('P',pp.x,pp.z,0.95);
    /* --- monster & hewan --- */
    if(typeof Monsters!=='undefined'&&Monsters.list){
      for(const m of Monsters.list){
        if(m.dead||!m.pos||!m.mesh)continue;
        /* radius mengikuti ukuran tabrakan mob, sedikit dilebihkan */
        add(m.mesh.id,m.pos.x,m.pos.z,Math.max(0.7,(m.r||0.5)*1.7));
      }
    }
    /* --- NPC --- */
    if(typeof NPCS!=='undefined'&&NPCS.list){
      for(const q of NPCS.list){
        if(q.dead||!q.pos||!q.mesh)continue;
        add(q.mesh.id,q.pos.x,q.pos.z,0.9);
      }
    }
    /* pilih MAXN terdekat: urutkan hanya bila kandidatnya melebihi kapasitas */
    let use=n;
    if(n>MAXN){
      buf.length=n;                       // buang sisa lama agar sort benar
      buf.sort((a,b)=>a.d-b.d);
      use=MAXN;
    }
    const U=Mesher.trample.value;
    for(let i=0;i<use;i++){
      const s=buf[i];
      U[i].set(s.x,s.z,s.r,s.w);
    }
    Mesher.trampleCount.value=use;
    /* bersihkan cache posisi entitas yang sudah hilang (tiap ~2 detik saja) */
    this._trGC=(this._trGC||0)+dt;
    if(this._trGC>2){
      this._trGC=0;
      if(this._trPrev.size>200)this._trPrev.clear();
    }
  },
  buildMesh(c){
    this.getChunk(c.cx-1,c.cz);this.getChunk(c.cx+1,c.cz);
    this.getChunk(c.cx,c.cz-1);this.getChunk(c.cx,c.cz+1);
    if(c.group)this.disposeGroup(c);
    const res=Mesher.build(c);
    const M=Mesher.getMats();
    const g=new THREE.Group();
    if(res.solid){
      const m=new THREE.Mesh(res.solid,M.solid);
      m.castShadow=!IS_MOBILE;m.receiveShadow=true;g.add(m);
    }
    if(res.plant){
      const m=new THREE.Mesh(res.plant,M.plant);m.receiveShadow=true;g.add(m);
    }
    /* tumbuhan voxel (semak beri, kaktus, tebu, tulip) */
    if(res.flora){
      const m=new THREE.Mesh(res.flora,M.flora);
      m.castShadow=!IS_MOBILE;m.receiveShadow=true;g.add(m);
    }
    /* RUMPUT DUNIA (dekoratif): mesh terpisah, TIDAK pernah ikut shadow pass
       (menggandakan biaya render), dan disembunyikan berdasarkan jarak lewat
       World.updateGrassVisibility. Materialnya SENDIRI (MAT_WGRASS): kartu
       3-plane bertekstur alpha dengan shader angin + efek terinjak. */
    if(res.grass){
      const m=new THREE.Mesh(res.grass,M.wgrass||M.flora);
      m.castShadow=false;m.receiveShadow=false;
      /* langsung sembunyikan bila chunk ini di luar radius rumput */
      m.visible=(Math.abs(c.cx-this.lcx)<=CFG.GRASS_R&&Math.abs(c.cz-this.zcz)<=CFG.GRASS_R);
      c.grassMesh=m;g.add(m);
    }
    if(res.leaf){
      const m=new THREE.Mesh(res.leaf,M.leaf);
      m.castShadow=!IS_MOBILE;m.receiveShadow=true;m.renderOrder=1;g.add(m);
    }
    if(res.roof){
      const m=new THREE.Mesh(res.roof,M.roof);
      m.castShadow=!IS_MOBILE;m.receiveShadow=true;m.renderOrder=1;g.add(m);
    }
    if(res.water){
      const m=new THREE.Mesh(res.water,M.water);m.renderOrder=2;g.add(m);
    }
    /* BONGKAHAN ORE PERMUKAAN (port visual 100% dari NEW MODEL/Ore.html) */
    if(typeof Env_Ore!=='undefined'&&Env_Ore.buildChunkOres){
      Env_Ore.buildChunkOres(c, g);
    }
    Game.scene.add(g);c.group=g;
  },

  /* ---------- daun transparan saat pemain di bawah kanopi ----------
     METODA AREA TRIGGER: begitu pemain berada di bawah kanopi, seluruh daun
     milik POHON ITU SAJA (hasil flood-fill dari daun tepat di atas pemain)
     dibuat transparan lewat kotak bounding-box kanopi. Batang tidak ikut
     karena batang memakai material solid, bukan material daun. Kotak di-cache
     selama pemain masih di dalamnya supaya flood-fill tidak dijalankan tiap
     frame. */
  canopyOp:1,
  _leafCache:null,
  /* flood-fill daun terhubung dari (sx,sy,sz); mengembalikan bounding-box xz
     [minX,minZ,maxX,maxZ]. Dibatasi radius & jumlah blok agar murah.

     Batas RH (jangkauan vertikal) harus melebihi TINGGI KANOPI: pohon punya
     batang 6-10 blok dengan kanopi 4 lapis (worldgen: dy -2..+1 dari puncak),
     jadi flood-fill dari lapisan bawah kanopi perlu bisa menjangkau ke atas
     maupun ke bawah beberapa blok. RH lama (6) sudah cukup, tetapi radius
     mendatar R=9 dinaikkan sedikit karena kanopi bisa selebar 4 blok dari
     batang dan dua pohon berdempet menyatu menjadi satu gugus daun. */
  floodLeafBox(sx,sy,sz){
    const key=(x,y,z)=>x+','+y+','+z;
    const visited=new Set([key(sx,sy,sz)]);
    const q=[[sx,sy,sz]];
    let minX=sx,maxX=sx,minZ=sz,maxZ=sz,count=0;
    const MAX=900,R=11,RH=8;
    const NB=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    while(q.length&&count<MAX){
      const cur=q.shift();count++;
      const x=cur[0],y=cur[1],z=cur[2];
      if(x<minX)minX=x;if(x>maxX)maxX=x;
      if(z<minZ)minZ=z;if(z>maxZ)maxZ=z;
      for(let i=0;i<6;i++){
        const nx=x+NB[i][0],ny=y+NB[i][1],nz=z+NB[i][2];
        if(Math.abs(nx-sx)>R||Math.abs(nz-sz)>R||Math.abs(ny-sy)>RH)continue;
        const k=key(nx,ny,nz);
        if(visited.has(k))continue;
        if(this.getBlock(nx,ny,nz)!==B.LEAF)continue;
        visited.add(k);q.push([nx,ny,nz]);
      }
    }
    return[minX,minZ,maxX,maxZ];
  },
  /* ---------- kanopi mana yang MENGHALANGI PANDANGAN ke pemain? ----------
     Menelusuri garis dari kepala pemain menuju KAMERA dan mengembalikan blok
     daun pertama yang ditemukan, atau null.

     Kenapa perlu: kamera game ini miring dari atas, jadi daun yang menutupi
     pemain di layar TIDAK berada tepat di atas kepalanya — ia berada di antara
     pemain dan kamera, beberapa blok ke arah belakang-atas. Deteksi lama hanya
     memeriksa kolom vertikal tepat di atas pemain (px,pz), sehingga selama
     pemain belum benar-benar berada di bawah pusat kanopi (praktis: menempel di
     batang) daun tidak pernah dibuat transparan — persis gejala yang dilaporkan.

     Penelusuran memakai langkah kecil sampai sejauh jarak kamera, dibatasi
     LOS_MAX blok supaya tetap murah (dipanggil sekali per frame). */
  LOS_STEP:0.45,
  LOS_MAX:26,
  leafBlockingView(pp){
    if(typeof Cam==='undefined'||!Cam.cam)return null;
    const cp=Cam.cam.position;
    /* titik acuan = kepala pemain (bukan kaki) */
    const ox=pp.x,oy=pp.y+1.5,oz=pp.z;
    let dx=cp.x-ox,dy=cp.y-oy,dz=cp.z-oz;
    const len=Math.sqrt(dx*dx+dy*dy+dz*dz);
    if(len<0.001)return null;
    dx/=len;dy/=len;dz/=len;
    const far=Math.min(len,this.LOS_MAX);
    let lx=-1,ly=-1,lz=-1;
    for(let t=0.6;t<=far;t+=this.LOS_STEP){
      const x=Math.floor(ox+dx*t),y=Math.floor(oy+dy*t),z=Math.floor(oz+dz*t);
      if(x===lx&&y===ly&&z===lz)continue;      // masih di blok yang sama
      lx=x;ly=y;lz=z;
      if(y<0||y>=CFG.WORLD_H)continue;
      if(this.getBlock(x,y,z)===B.LEAF)return {x,y,z};
    }
    return null;
  },
  updateCanopy(dt,pp){
    const px=Math.floor(pp.x),pz=Math.floor(pp.z);
    /* ---------- 1. daun tepat di atas kepala (berada DI BAWAH kanopi) ----------
       Jangkauan pemindaian dinaikkan dari 8 → seluruh kolom sampai WORLD_H:
       batang pohon 6-10 blok membuat kanopi berada 8-12 blok di atas kaki,
       yaitu DI LUAR jendela lama (y0..y0+8) begitu pemain berdiri di tanah.
       Itu sebabnya berjalan di bawah pohon tinggi tidak memicu transparansi. */
    let leaf=null;
    for(let y=Math.floor(pp.y)+2;y<CFG.WORLD_H;y++){
      if(this.getBlock(px,y,pz)===B.LEAF){leaf={x:px,y,z:pz};break;}
    }
    /* ---------- 2. daun yang MENGHALANGI PANDANGAN kamera → pemain ----------
       Inilah kasus "berjalan di belakang pohon": pemain tidak berada di bawah
       kanopi, tapi kanopi menutupinya di layar. */
    if(!leaf)leaf=this.leafBlockingView(pp);
    Mesher.getMats();
    if(!leaf){
      this._leafCache=null;
      this.canopyOp+=(1-this.canopyOp)*Math.min(1,dt*5);
      Mesher.fadeLeaf.uAmt.value=this.canopyOp;
      this.updateRoof(dt,pp);
      return;
    }
    /* Kotak fade dicache selama titik daun pemicu masih berada di dalamnya,
       jadi flood-fill tidak dijalankan tiap frame. Dulu cache diuji dengan
       posisi PEMAIN — tidak cocok lagi karena pemain kini bisa berada di luar
       kanopi (kasus 2), sehingga cache selalu miss dan flood-fill berjalan
       setiap frame. */
    let box=this._leafCache;
    const inCache=box&&leaf.x>=box[0]-1&&leaf.x<=box[2]+1&&
                       leaf.z>=box[1]-1&&leaf.z<=box[3]+1;
    if(!inCache){box=this.floodLeafBox(leaf.x,leaf.y,leaf.z);this._leafCache=box;}
    Mesher.fadeLeaf.uMin.value.set(box[0]-0.5,box[1]-0.5);
    Mesher.fadeLeaf.uMax.value.set(box[2]+1.5,box[3]+1.5);
    this.canopyOp+=(CFG.CANOPY_FADE-this.canopyOp)*Math.min(1,dt*6);
    Mesher.fadeLeaf.uAmt.value=this.canopyOp;
    this.updateRoof(dt,pp);
  },

  /* ---------- atap rumah transparan saat pemain masuk ke dalam ----------
     METODA AREA TRIGGER PER-RUMAH: setiap rumah punya area trigger sendiri,
     yaitu footprint-nya (WGEN.buildingAt). Begitu pemain terdeteksi "di dalam"
     (ada blok atap di atas kepala), kotak fade diisi footprint rumah ITU,
     sehingga SELURUH atap rumah tersebut full transparan sekaligus � atap
     rumah tetangga tidak ikut. Dinding tidak pernah transparan karena dinding
     bukan material atap (atap memakai mesh & material terpisah).

     BUGFIX: dulu pemindaian atap hanya 5 blok di atas kepala (y0..y0+5).
     Rumah tinggi (Loteng h=7 ? atap y�11, Wisma h=6 ? y�10) atapnya berada
     di LUAR jangkauan itu, sehingga atapnya tidak pernah jadi transparan.
     Sekarang: (1) cek footprint rumah lewat WGEN.buildingAt � bila pemain
     memang berada di dalam kavling rumah, seluruh kolom di atasnya dipindai
     sampai WORLD_H; (2) fallback pemindaian kolom penuh + tetangga. */
  roofOp:1,
  insideHouse:false,
  /* apakah ada blok ROOF di kolom (x,z) di atas ketinggian y0? */
  roofAbove(x,y0,z){
    for(let y=y0;y<CFG.WORLD_H;y++)
      if(this.getBlock(x,y,z)===B.ROOF)return true;
    return false;
  },
  /* ---------- APAKAH PEMAIN BERADA DI DALAM GUA DUNGEON? ----------
     BUGFIX: transparansi "dalam ruangan" dulu HANYA dipicu blok B.ROOF. Kubah
     gua dungeon dibangun dari B.STONE (lihat dungeon.js buildDungeonPart:
     `for(let y=ceil;y<=ceil+1;y++)set(y,WALL)`), sehingga saat pemain masuk gua
     insideHouse tetap false — kubahnya tidak pernah memudar dan karakter
     tertutup batu dari sudut kamera mana pun.

     Di sini gua dideteksi langsung: pemain berada di dalam radius sebuah dungeon
     berjenis 'cave' DAN ada blok padat di atas kepalanya (blok padat apa pun,
     bukan cuma ROOF, karena kubah gua memang batu).

     DIMEMO PER BLOK: WGEN.nearestDungeon memeriksa 9 sel grid dan tiap sel ikut
     memanggil nearestVillage, jadi terlalu mahal untuk dijalankan setiap frame.
     Hasilnya cukup dihitung ulang saat pemain berpindah blok. */
  _caveKey:null,_caveRes:null,
  inDungeonCave(px,y0,pz){
    const k=px+','+y0+','+pz;
    if(this._caveKey===k)return this._caveRes;
    this._caveKey=k;
    this._caveRes=null;
    if(typeof WGEN==='undefined'||!WGEN.nearestDungeon)return null;
    const near=WGEN.nearestDungeon(px,pz);
    if(!near||near.d.kind!=='cave')return null;
    if(near.dist>near.d.r+1)return null;
    /* ada langit-langit di atas kepala? */
    let roofed=false;
    for(let y=y0;y<CFG.WORLD_H;y++){
      const b=this.getBlock(px,y,pz);
      if(b!==B.AIR&&b!==B.WATER){roofed=true;break;}
    }
    if(!roofed)return null;
    const d=near.d;
    /* yTop: kubah gua JAUH lebih tinggi dari atap rumah (domeH bisa 15-17 blok
       di atas lantai), jadi kotak oklusinya perlu setinggi dunia. Tanpa ini
       hanya DINDING SAMPING gua yang memudar — atapnya berada di luar kotak
       sehingga tetap padat dan menutupi karakter dari atas. */
    this._caveRes={x:d.x-d.r,z:d.z-d.r,w:d.r*2,d:d.r*2,yTop:CFG.WORLD_H+2};
    return this._caveRes;
  },
  updateRoof(dt,pp){
    const px=Math.floor(pp.x),pz=Math.floor(pp.z);
    const y0=Math.floor(pp.y)+1;
    let inside=false;
    /* 1. cara utama: pemain berada di dalam footprint rumah & ada atap di atas */
    const b=(typeof WGEN!=='undefined'&&WGEN.buildingAt)?WGEN.buildingAt(px,pz,1):null;
    if(b&&b.kind!=='well'&&this.roofAbove(px,y0,pz))inside=true;
    /* 2. fallback: pindai seluruh kolom di atas kepala (rumah non-desa/dungeon) */
    if(!inside&&this.roofAbove(px,y0,pz))inside=true;
    /* 3. offset tetangga: berdiri di ambang pintu / tritisan tetap terdeteksi */
    if(!inside){
      for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){
        if(this.roofAbove(px+dx,y0,pz+dz)&&
           this.getBlock(px+dx,y0,pz+dz)===B.AIR){inside=true;break;}
      }
    }
    /* 4. GUA DUNGEON: kubahnya batu (bukan ROOF), jadi diperiksa terpisah.
       Mengembalikan bentang gua sebagai kotak oklusi. */
    const caveBB=inside?null:this.inDungeonCave(px,y0,pz);
    if(caveBB)inside=true;
    this.insideHouse=inside;
    Mesher.getMats();
    let bb=null;
    if(inside){
      /* area trigger FADE_ROOF = footprint rumah yang sedang dimasuki.
         GUA TIDAK memakai jalur ini: kubah gua terbuat dari B.STONE yang
         dirender MAT_SOLID, dan MAT_SOLID dipasang applyLocalFade(...,null)
         sehingga tidak punya uniform kotak FADE_ROOF. Memasang kotak gua ke
         FADE_ROOF hanya akan menghilangkan lantai tepi arena (yang memakai
         B.ROOF sebagai pelapis di dungeon Lv≥7) tanpa menyentuh kubahnya. */
      bb=b||((typeof WGEN!=='undefined'&&WGEN.buildingAt)?WGEN.buildingAt(px,pz,2):null);
      if(!caveBB&&bb){
        const pad=2;   // tritisan atap (1 blok) + pengaman
        Mesher.fadeRoof.uMin.value.set(bb.x-pad,bb.z-pad);
        Mesher.fadeRoof.uMax.value.set(bb.x+bb.w+pad,bb.z+bb.d+pad);
      }else if(!caveBB){
        /* fallback: kotak di sekitar pemain bila footprint tak ditemukan */
        Mesher.fadeRoof.uMin.value.set(px-8,pz-8);
        Mesher.fadeRoof.uMax.value.set(px+8,pz+8);
      }
      /* OKLUSI ala Project Zomboid — INILAH yang membuat kubah batu gua memudar,
         karena shader oklusi memang terpasang di MAT_SOLID (mesher.js). Untuk
         gua, kotaknya adalah seluruh bentang gua. */
      this._occBB=caveBB||bb||{x:px-8,z:pz-8,w:16,d:16};
    }
    const target=inside?CFG.ROOF_FADE:1;
    this.roofOp+=(target-this.roofOp)*Math.min(1,dt*8);
    Mesher.fadeRoof.uAmt.value=this.roofOp;
    this.updateOcclusion(dt,pp);
  },

  /* ---------- OKLUSI RUMAH ala Project Zomboid ----------
     Saat pemain berada di dalam rumah, dinding rumah yang berada di antara
     kamera dan pemain dibuat memudar. Hanya bbox rumah terakhir yang dipakai,
     sehingga terrain luar tidak ikut hilang. Arah kamera (Cam.cam.position)
     menentukan sisi rumah mana yang fade; saat kamera diputar, dinding yang
     menghalangi otomatis berganti. */
  occOp:1,
  _occBB:null,
  updateOcclusion(dt,pp){
    const U=Mesher.occ;
    /* target fade: hanya aktif saat pemain di dalam rumah */
    const target=this.insideHouse?CFG.OCCLUDE_FADE:1;
    this.occOp+=(target-this.occOp)*Math.min(1,dt*8);
    U.uOA.value=this.occOp;
    /* titik acuan = kaki pemain; lantai tidak ikut fade karena shader hanya
       memproses fragmen di atas y ini (rel.y > 0.18) */
    U.uOP.value.set(pp.x,pp.y,pp.z);

    /* arah pemain → kamera. Kamera diposisikan jauh mengikuti yaw & elev, jadi
       arah ini otomatis berubah saat kamera diputar. Sejak kamera menjadi
       perspektif, jaraknya ikut zoom — uOL memakai jarak NYATA (dihitung di
       sini), jadi tidak ada asumsi jarak tetap. */
    if(typeof Cam!=='undefined'&&Cam.cam){
      const cp=Cam.cam.position;
      const dx=cp.x-pp.x,dy=cp.y-pp.y,dz=cp.z-pp.z;
      const l=Math.sqrt(dx*dx+dy*dy+dz*dz)||1;
      U.uOD.value.set(dx/l,dy/l,dz/l);
      U.uOL.value=l;
    }

    /* bbox rumah: tetap dikirim selama fade keluar agar transisi tidak pop.
       `b.yTop` (dipakai gua) menaikkan tutup kotak sampai puncak dunia; tanpa
       itu +13 blok tidak cukup untuk kubah gua yang tinggi, sehingga hanya
       dinding sampingnya yang memudar dan atapnya tetap menutupi karakter. */
    if(this._occBB&&this.occOp<0.999){
      const b=this._occBB,pad=2;
      U.uOBMin.value.set(b.x-pad,pp.y-0.6,b.z-pad);
      U.uOBMax.value.set(b.x+b.w+pad,
        b.yTop!==undefined?b.yTop:pp.y+13.0,
        b.z+b.d+pad);
    }else{
      U.uOBMin.value.set(1e9,1e9,1e9);
      U.uOBMax.value.set(-1e9,-1e9,-1e9);
    }
  },


  /* ---------- penghancuran blok ---------- */
  processTimers(dt){
    for(let i=this.pending.length-1;i>=0;i--){
      const p=this.pending[i];p.t-=dt;
      if(p.t<=0){
        this.pending.splice(i,1);
        const id=this.getBlock(p.x,p.y,p.z);
        if(id===B.AIR||id===B.WATER)continue;
        if(this.hasOreAboveOrSelf(p.x,p.y,p.z))continue; // Kebal bila di atasnya ada ore!
        this.setBlock(p.x,p.y,p.z,B.AIR);
        const col=(BLOCK_INFO[id]||{}).color||0x888888;
        FX.debris(new THREE.Vector3(p.x+0.5,p.y+0.5,p.z+0.5),col,p.leaf?3:6,p.leaf?1.6:3);
        /* CATATAN: daun TIDAK lagi menjatuhkan beri. Beri sekarang hanya
           didapat dari SEMAK BERI (tanaman voxel tipe 7) yang tumbuh di hutan
           & tanah merah � lihat World.harvestPlants & WGEN.plantAt. */
        /* batang tumbang: kayu jatuh mengikuti arah tumbang.
           SKILL PENEBANG (axe) ikut berlaku di sini — inilah jalur yang
           menjatuhkan MAYORITAS kayu (seluruh batang di atas titik potong),
           jadi tanpa ini bonusnya hampir tak terasa. */
        if(p.drop){
          const dropX=p.dx!==undefined?p.dx:p.x+0.5;
          const dropZ=p.dz!==undefined?p.dz:p.z+0.5;
          const dp=new THREE.Vector3(dropX,
            this.groundAt(dropX,dropZ,p.y+1)+0.45,dropZ);
          let tb=RPG.harvestBonus()+RPG.gatherBonus(p.drop);
          if(p.drop==='wood'&&RPG.woodBonus)tb+=RPG.woodBonus();
          FX.spawnDrop(dp,p.drop,1+(Math.random()<tb?1:0));
          if(ITEMS.resin&&Math.random()<0.22)FX.spawnDrop(dp,'resin',1);
          Player.addXP(1);Sfx.chop();
          if(p.last)this.leafDecay(p.x,p.y,p.z);
        }
        this.checkFlood(p.x,p.y,p.z);
      }
    }
    for(let i=this.flood.length-1;i>=0;i--){
      const f=this.flood[i];f.t-=dt;
      if(f.t<=0){
        this.flood.splice(i,1);
        if(this.getBlock(f.x,f.y,f.z)===B.AIR){
          this.setBlock(f.x,f.y,f.z,B.WATER);
          FX.ripple(f.x+0.5,CFG.WATER_Y,f.z+0.5,0xbfe6f5,1.2);
          Sfx.splash(false);
        }
      }
    }
    /* ---------- REGROW: DIRT terbuka → GRASS setelah 15 detik ----------
       Blok DIRT yang lahir dari grass hancur perlahan ditumbuhi lagi. Syarat
       tetap terbuka (udara di atas) & masih DIRT (tidak ditimpa/digali). Saat
       jadi GRASS, mesh chunk ditandai dirty → mesher menumbuhkan rumput dunia
       kecil di atasnya secara otomatis. */
    for(let i=this.regrow.length-1;i>=0;i--){
      const g=this.regrow[i];g.t-=dt;
      if(g.t>0)continue;
      this.regrow.splice(i,1);
      if(this.getBlock(g.x,g.y,g.z)!==B.DIRT)continue;      // sudah berubah
      if(this.getBlock(g.x,g.y+1,g.z)!==B.AIR)continue;     // tertutup blok lain
      this.setBlock(g.x,g.y,g.z,B.GRASS);
      FX.debris(new THREE.Vector3(g.x+0.5,g.y+1.05,g.z+0.5),0x5d9e3f,5,1.4);
    }
  },
  checkFlood(x,y,z){
    if(y>3)return;
    const nb=[[1,0],[-1,0],[0,1],[0,-1],[0,0]];
    for(const[dx,dz]of nb){
      if(this.getBlock(x+dx,y,z+dz)===B.WATER){
        this.flood.push({x,y,z,t:1.2+Math.random()*0.6});return;
      }
    }
  },
  /* Anti-eksploit: perlindungan blok yang memuat ore di atasnya atau dirinya sendiri */
  hasOreAboveOrSelf(wx, wy, wz){
    const id = this.getBlock(wx, wy, wz);
    // 1. Blok itu sendiri adalah ore
    if (typeof ORE_INFO !== 'undefined' && ORE_INFO[id]) return true;

    // 2. Ada blok ore di atas blok ini dalam kolom (sampai ketinggian dunia)
    for (let y = wy + 1; y < wy + 8 && y < (typeof CFG !== 'undefined' ? CFG.WORLD_H : 16); y++) {
      const bid = this.getBlock(wx, y, wz);
      if (typeof ORE_INFO !== 'undefined' && ORE_INFO[bid]) return true;
    }

    // 3. Ada model 3D ore node (Env_Ore) yang berdiri di atas atau di sekitar blok ini
    if (typeof Env_Ore !== 'undefined' && Env_Ore.activeNodes) {
      for (const node of Env_Ore.activeNodes.values()) {
        const rad = 2.2 * (node.scale || 1);
        if (Math.abs(wx - (node.wx + 0.5)) <= rad && Math.abs(wz - (node.wz + 0.5)) <= rad) {
          if (wy <= node.wy + 2) return true;
        }
      }
    }

    // 4. Ada ore di chunk.ores pada kolom ini
    const cx = Math.floor(wx / 16), cz = Math.floor(wz / 16);
    const c = this.chunks.get(cx + ',' + cz);
    if (c && c.ores) {
      for (const o of c.ores) {
        if (Math.abs(wx - o.wx) <= 2 && Math.abs(wz - o.wz) <= 2 && wy <= o.wy + 2) {
          if (c.data[this.idx(o.x, o.y, o.z)] === o.ore) return true;
        }
      }
    }

    return false;
  },

  destroyArea(cx,cz,r){
    const bx=Math.floor(cx),bz=Math.floor(cz);
    for(let dz=-Math.ceil(r);dz<=Math.ceil(r);dz++)for(let dx=-Math.ceil(r);dx<=Math.ceil(r);dx++){
      const d=Math.hypot(dx,dz);if(d>r)continue;
      const wx=bx+dx,wz=bz+dz;
      let top=this.topY(wx,wz)-1;
      const depth=d<r*0.55?2:1;
      for(let k=0;k<depth;k++){
        const y=top-k;
        if(y<1)break;
        if(this.hasOreAboveOrSelf(wx,y,wz))continue; // Kebal dari kehancuran mob bila memuat ore!
        this.pending.push({x:wx,y,z:wz,t:d*0.09+k*0.06+Math.random()*0.04});
      }
    }
  },
  /* ---------- FX GAGAL TAMBANG (port doFail dari NEW MODEL/ore.html) ----------
     Percikan merah-oranye + getar blok kuat + teks GAGAL. Pukulan yang gagal
     TIDAK memberikan damage apa pun ke ore (sia-sia), persis prototipe. */
  oreFailFx(wx,wy,wz,id){
    const c=new THREE.Vector3(wx+0.5,wy+0.7,wz+0.5);
    const info=BLOCK_INFO[id]||{};
    /* percikan merah panas + serpihan gelap ore — kombinasi doFail prototipe */
    FX.debris(c,0xff2d20,5,3.4);
    FX.debris(c,0xff6b1a,4,2.9);
    FX.debris(c,0xffc21a,3,2.4);
    FX.debris(c,info.color||0x3a3f46,4,2.2);
    if(typeof PortFX!=='undefined'&&PortFX.spark)PortFX.spark(c.x,c.y,c.z,10,0xff5a2e,8);
    FX.blockShake(wx,wy,wz,info.color||0x8a8f98,2.2);
    FX.addShake(0.16);
    FX.text(c.clone().add(new THREE.Vector3(0,0.9,0)),'GAGAL!','#ff5a3a');
    Sfx.rock();
  },
  hitBlock(wx,wy,wz,dmg){
    if(wy<=0)return false;
    const id=this.getBlock(wx,wy,wz);
    if(id===B.AIR||id===B.WATER)return false;
    /* ================= SISTEM PENAMBANGAN ORE (port NEW MODEL/ore.html) =====
       1. GATE LEVEL  : Penambangan di bawah syarat → blok menolak dipukul.
       2. PELUANG     : tiap pukulan diundi; makin tinggi level di atas syarat,
                        peluang sukses naik (+1.5%/level, maks 98%) sehingga
                        peluang GAGAL makin kecil.
       3. HP EFEKTIF  : jumlah ayunan sampai hancur menurun +3%/level di atas
                        syarat (minimum 45% HP dasar) — penambang berpengalaman
                        menghancurkan ore dengan lebih sedikit ayunan.
       4. TAHAPAN     : HP menyusut 66% → pecahan tahap-1, 33% → tahap-2,
                        hancur → burst penuh. Tiga animasi pecahan bongkahan.
       ===================================================================== */
    const oreDef=(typeof ORE_INFO!=='undefined')?ORE_INFO[id]:null;
    if(oreDef){
      const mLv=(typeof Prof!=='undefined')?Prof.level('mining'):1;
      if(mLv<oreDef.req){
        /* anti-spam toast: cukup sekali per 0.9 detik per pukulan beruntun */
        const now=(typeof performance!=='undefined')?performance.now():Date.now();
        if(!this._oreDenyT||now-this._oreDenyT>900){
          this._oreDenyT=now;
          UI.toast(`⛏️ ${BLOCK_INFO[id].name}: butuh Penambangan Lv ${oreDef.req}!`);
          Sfx.noStamina();
          FX.text(new THREE.Vector3(wx+0.5,wy+1.4,wz+0.5),
            `🔒 Lv ${oreDef.req}`,'#ff9d8a');
        }
        /* getaran GAGAL pada bongkahan — umpan balik "terlalu keras untuk
           ditambang" walau level kurang (sama seperti gagal peluang). */
        if(typeof Env_Ore!=='undefined'&&Env_Ore.onFail)Env_Ore.onFail(wx,wy,wz);
        return false;
      }
      const eff=Math.min(0.98,oreDef.chance+(mLv-oreDef.req)*0.015);
      if(Math.random()>eff){
        this.oreFailFx(wx,wy,wz,id);
        if(typeof Env_Ore!=='undefined'&&Env_Ore.onFail)Env_Ore.onFail(wx,wy,wz);
        return false;
      }
    }
    const k=`${wx},${wy},${wz}`;
    /* ---------- ORE: PROGRES PUKULAN (bukan HP-fraksi) ----------
       Aturan (permintaan desain):
         · SAAT level Penambangan == syarat ore → butuh TEPAT 7 pukulan
           (ore besar 14 pukulan = 2x lebih lama dari ore kecil).
         · TIAP level proficiency DI ATAS syarat → 10% lebih cepat
           (pangkat 0.90 per level; dibatasi minimal 2 pukulan).
         · Pukulan yang GAGAL roll tidak menambah progres (sia-sia).
       Progres kontinu 0..1; tahapan pecahan di 34% (tahap-1) & 67% (tahap-2)
       — tetap tiga animasi pecahan bongkahan seperti prototipe. */
    if(oreDef){
      if(!this.oreStg)this.oreStg={};
      let st=this.oreStg[k];
      if(!st)st=this.oreStg[k]={stage:0,prog:0};
      const big=this.oreNodeBig(wx,wy,wz);
      const mLv2=(typeof Prof!=='undefined')?Prof.level('mining'):1;
      const hitsNeeded=Math.max(2,7*(big?2:1)*Math.pow(0.90,mLv2-oreDef.req));
      st.prog+=1/hitsNeeded;
      FX.debris(new THREE.Vector3(wx+0.5,wy+0.5,wz+0.5),BLOCK_INFO[id].color,2,1.5);
      FX.blockShake(wx,wy,wz,BLOCK_INFO[id].color,1+0.8*st.prog);
      Sfx.rock();
      /* FEEDBACK DI PERMUKAAN BONGKAHAN: percikan + serpihan di titik antara
         pemain dan pusat node — FX.blockShake (kubus voxel) tertutup model
         bongkahan, jadi feedback yang TERLIHAT harus di depan model ini. */
      if(typeof Player!=='undefined'){
        const dxp=Player.pos.x-(wx+0.5),dzp=Player.pos.z-(wz+0.5);
        const dl=Math.hypot(dxp,dzp)||1;
        const ix2=wx+0.5+dxp/dl*1.4,iz2=wz+0.5+dzp/dl*1.4;
        if(typeof PortFX!=='undefined'&&PortFX.spark)
          PortFX.spark(ix2,wy+1.1,iz2,6,0xffe066,6);
        FX.debris(new THREE.Vector3(ix2,wy+0.9,iz2),BLOCK_INFO[id].color,3,2.2);
      }
      let newStage=st.stage;
      if(st.stage<1&&st.prog>=0.34)newStage=1;
      else if(st.stage<2&&st.prog>=0.67)newStage=2;
      st.stage=newStage;
      if(typeof Env_Ore!=='undefined'&&Env_Ore.onHit)
        Env_Ore.onHit(wx,wy,wz,id,newStage);
      else if(newStage>st.stage&&newStage>0)
        OreFX.burst(wx+0.5,wy,wz+0.5,id,newStage===1?4:5,1.0);
      if(newStage===1)FX.addShake(0.12);
      else if(newStage===2)FX.addShake(0.18);
      if(st.prog>=1){
        delete this.oreStg[k];
        FX.clearBlockShake(wx,wy,wz);
        this.breakBlock(wx,wy,wz);
        return true;
      }
      return false;
    }
    let maxHp=BLOCK_INFO[id].hp||1;
    let hp=this.blockHP.has(k)?this.blockHP.get(k):maxHp;
    hp-=dmg;
    FX.debris(new THREE.Vector3(wx+0.5,wy+0.5,wz+0.5),BLOCK_INFO[id].color,2,1.5);
    /* getaran pada blok yang dipukul: makin sedikit HP tersisa, makin kuat
       getarannya sehingga pemain punya umpan balik "hampir hancur" */
    FX.blockShake(wx,wy,wz,BLOCK_INFO[id].color,
      1+0.8*(1-clamp(hp/maxHp,0,1)));
    if(id===B.STONE)Sfx.rock();else Sfx.chop();
    if(hp<=0){
      this.blockHP.delete(k);
      FX.clearBlockShake(wx,wy,wz);
      this.breakBlock(wx,wy,wz);
      return true;
    }
    this.blockHP.set(k,hp);
    return false;
  },
  /* ---------- UKURAN NODE ORE ----------
     Node besar/kecil ditentukan worldgen (flag `big` di chunk.ores).
     Dipakai breakBlock untuk memilih rentang hasil panen (ORE_LOOT). */
  oreNodeBig(wx,wy,wz){
    const c=this.chunks.get(Math.floor(wx/CFG.CHUNK)+','+Math.floor(wz/CFG.CHUNK));
    if(!c||!c.ores)return false;
    for(const o of c.ores)
      if(o.wx===wx&&o.wy===wy&&o.wz===wz)return !!o.big;
    return false;
  },
  breakBlock(wx,wy,wz){
    const id=this.getBlock(wx,wy,wz);
    if(id===B.AIR||id===B.WATER)return;
    /* ---------- GRASS BLOCK HANCUR → DIRT, lalu tumbuh lagi ----------
       Saat blok GRASS permukaan (ada udara di atasnya) dihancurkan, ia TIDAK
       lenyap jadi lubang: berubah jadi DIRT, dan dijadwalkan kembali menjadi
       GRASS setelah REGROW_T detik. Begitu jadi grass lagi, mesher otomatis
       menumbuhkan rumput dunia kecil di atasnya. */
    if(id===B.GRASS&&this.getBlock(wx,wy+1,wz)===B.AIR){
      this.setBlock(wx,wy,wz,B.DIRT);
      const info0=BLOCK_INFO[B.GRASS];
      FX.debris(new THREE.Vector3(wx+0.5,wy+0.9,wz+0.5),info0.color,8,2.4);
      if((id===B.GRASS)&&Math.random()<0.3+RPG.harvestBonus())
        FX.spawnDrop(new THREE.Vector3(wx+0.5,wy+0.9,wz+0.5),'fiber',1);
      Player.addXP(1);Prof.gainBlock(B.GRASS);
      this.regrow.push({x:wx,y:wy,z:wz,t:this.REGROW_T});
      if(typeof Sfx!=='undefined'&&Sfx.chop)Sfx.chop();
      return;
    }
    this.setBlock(wx,wy,wz,B.AIR);
    const info=BLOCK_INFO[id];
    FX.debris(new THREE.Vector3(wx+0.5,wy+0.5,wz+0.5),info.color,10,3.2);
    /* ---------- ORE HANCUR: burst penuh pecahan bongkahan ----------
       Tahap ke-3 dari tiga animasi pecahan (66% → 33% → hancur). Pecahan
       jatuh, memantul, lalu MENGELINDING di tanah sebelum memudar. */
    const isOre=(typeof ORE_INFO!=='undefined')&&!!ORE_INFO[id];
    if(isOre){
      if(typeof Env_Ore!=='undefined'&&Env_Ore.onDestroy)Env_Ore.onDestroy(wx,wy,wz,id);
      else if(typeof OreFX!=='undefined')OreFX.burst(wx+0.5,wy,wz+0.5,id,10,1.5);
      if(this.oreStg)delete this.oreStg[`${wx},${wy},${wz}`];
    }
    /* bonus hasil: skill Pemanen + proficiency sub-skill blok + skill GATHER per jenis drop */
    const dropId=info.drop||((id===B.GRASS||id===B.DIRT)?'fiber':null);
    let bonus=RPG.harvestBonus()+Prof.yieldForBlock(id)+(dropId?RPG.gatherBonus(dropId):0);
    /* SKILL PENEBANG (axe): peluang kayu ekstra, di atas cabang GATHER.
       Lihat RPG.woodBonus() — skill ini sebelumnya tidak berefek apa pun. */
    if(id===B.WOOD&&RPG.woodBonus)bonus+=RPG.woodBonus();
    if(info.drop){
      /* ---------- HASIL PANEN ORE BERDASARKAN CHANCE (rentang acak) ----------
         Ore KECIL memakai rentang `s`, ore BESAR rentang `b` (lihat ORE_LOOT):
           Batu 3-7 / besar 7-13 · Tungsten & B.Tungsten 1-3 / besar 3-6 · dst.
         Peluang hasil ekstra dari skill "Penambang Terampil" (minm) +
         proficiency + Pemanen menambahkan +1 drop DI ATAS roll rentang. */
      let n=1;
      const loot=isOre&&(typeof ORE_LOOT!=='undefined')?ORE_LOOT[id]:null;
      if(loot){
        const r=this.oreNodeBig(wx,wy,wz)?loot.b:loot.s;
        n=r[0]+Math.floor(Math.random()*(r[1]-r[0]+1));
        /* SKILL PENAMBANG TERAMPIL (minm): pengali hasil +5%/rank —
           membuat investasi skill tree terasa jelas pada hasil panen ore */
        if(RPG.minerMult)n=Math.max(1,Math.round(n*RPG.minerMult()));
      }
      if(bonus>0&&Math.random()<bonus)n++;
      FX.spawnDrop(new THREE.Vector3(wx+0.5,wy+0.6,wz+0.5),info.drop,n);
    }
    else if((id===B.GRASS||id===B.DIRT)&&Math.random()<0.3+bonus)
      FX.spawnDrop(new THREE.Vector3(wx+0.5,wy+0.6,wz+0.5),'fiber',1);
    Player.addXP(1);
    /* proficiency: jenis blok menentukan sub-skill yang naik (ala Durango) */
    Prof.gainBlock(id);
    if(id===B.WOOD)this.fellTree(wx,wy,wz);
    this.leafDecay(wx,wy,wz);
    this.checkFlood(wx,wy,wz);
  },
  /* pohon tumbang: batang di atas titik potong runtuh berurutan */
  fellTree(wx,wy,wz){
    const trunk=[];
    for(let y=wy+1;y<CFG.WORLD_H;y++){
      if(this.getBlock(wx,y,wz)!==B.WOOD)break;
      trunk.push(y);
    }
    if(!trunk.length)return;
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    const d=dirs[(Math.random()*4)|0];
    trunk.forEach((y,i)=>{
      this.pending.push({
        x:wx,y,z:wz,t:0.14+i*0.08,drop:'wood',
        dx:wx+0.5+d[0]*(0.35+i*0.42),
        dz:wz+0.5+d[1]*(0.35+i*0.42),
        last:i===trunk.length-1,
      });
    });
    UI.toast('?? Pohon tumbang!');
  },

  leafDecay(wx,wy,wz){
    for(let dy=-2;dy<=2;dy++)for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
      const x=wx+dx,y=wy+dy,z=wz+dz;
      if(this.getBlock(x,y,z)!==B.LEAF)continue;
      let wood=false;
      for(let by=-2;by<=2&&!wood;by++)for(let bz=-2;bz<=2&&!wood;bz++)for(let bx=-2;bx<=2&&!wood;bx++)
        if(this.getBlock(x+bx,y+by,z+bz)===B.WOOD)wood=true;
      if(!wood){
        const d=Math.abs(dx)+Math.abs(dy)+Math.abs(dz);
        this.pending.push({x,y,z,t:0.15+d*0.09+Math.random()*0.1,leaf:true});
      }
    }
  },
   /* ---------- panen tanaman liar ----------
      Tabel drop per tipe tanaman (lihat WGEN.plantAt):
        1 rumput � 2/3 bunga � 5 jamur � 6 tumbuhan merah   ? billboard
        7 SEMAK BERI � 8 kaktus � 9 tebu � 10 tulip          ? model voxel
      BERI sekarang HANYA dari semak beri (tipe 7). Dulu beri dijatuhkan daun
      pohon & "semak beri" billboard (tipe 4); keduanya sudah dilepas.
      Tipe 4 tetap dikenali agar chunk lama (sebelum perubahan) tidak error. */
   PLANT_DROP:{
     1:['fiber',1,1],          // [item, jumlah dasar, peluang tambahan-acak]
     2:['fiber',0,0.5],
     3:['fiber',0,0.5],
     4:['berry',2,0],          // kompatibilitas chunk lama
     5:['mush',1,0],
     6:['fiber',1,0],
     7:['berry',2,0.5],        // semak beri: sumber utama beri
     8:['fiber',1,0.5],        // kaktus: serat berdaging
     9:['sugar_cane',2,0.5],   // tebu: batang tebu (bahan gula)
     10:['fiber',0,0.6],       // tulip: kelopak & tangkai
   },
  harvestPlants(pos,r){
    const cx=Math.floor(pos.x/16),cz=Math.floor(pos.z/16);
    const c=this.getChunk(cx,cz);
    const keep=[];let hit=false;
    for(const p of c.plants){
      const wx=cx*16+p.x+0.5,wz=cz*16+p.z+0.5;
      const d=Math.hypot(wx-pos.x,wz-pos.z);
      if(d<r&&Math.abs(p.y-pos.y)<2){
        hit=true;
        const D=this.PLANT_DROP[p.t]||['mush',1,0];
        const drop=[D[0],D[1]+(Math.random()<D[2]?1:0)];
        const extra=Math.random()<RPG.harvestBonus()+Prof.yieldBonus('harvesting')+RPG.gatherBonus(drop[0])?1:0;
        if(drop[1]+extra>0)FX.spawnDrop(new THREE.Vector3(wx,p.y+0.4,wz),drop[0],drop[1]+extra);
        /* BENIH PERTANIAN dari tanaman liar: SATU peluang seragam 10% untuk
           SEMUA jenis tumbuhan (Farming.SEED_CHANCE). Dulu rumput 30% & sisanya
           18%, sehingga benih menumpuk terlalu cepat di tas. */
        if(typeof Farming!=='undefined'&&Math.random()<Farming.SEED_CHANCE)
          FX.spawnDrop(new THREE.Vector3(wx,p.y+0.5,wz),Farming.randomSeed(),1);
        /* warna serpihan mengikuti tanaman: semak beri merah, tebu kekuningan */
        const dust=p.t===7?0xd8342c:p.t===9?0xc9c157:p.t===10?0xe23b3b:
                   p.t===8?0x4aa04d:p.t===6?0xd23b2a:0x5d9e3f;
        FX.debris(new THREE.Vector3(wx,p.y+0.4,wz),dust,4,1.5);
      }else keep.push(p);
    }
    if(hit){c.plants=keep;this.markDirty(cx,cz);Player.addXP(1);Prof.gain('harvesting',4,1);}
  },
};
