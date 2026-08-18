'use strict';
/* Manajemen chunk: streaming, edit blok, reruntuhan, banjir air */
const World={
  chunks:new Map(),dirty:new Set(),pending:[],flood:[],blockHP:new Map(),
  group:new THREE.Group(),lcx:1e9,zcz:1e9,loadList:[],
  idx:(x,y,z)=>x+z*16+y*256,
  key:(cx,cz)=>cx+','+cz,

  getChunk(cx,cz){
    const k=this.key(cx,cz);
    let c=this.chunks.get(k);
    if(!c){
      const g=genChunk(cx,cz);
      c={cx,cz,data:g.data,plants:g.plants,group:null};
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
     setinggi langkah kaki, BUKAN dari puncak dunia — blok yang berada di
     atas kepala diabaikan.

     Tanpa batas ini, ambang atas pintu (lintel) ikut terbaca sebagai
     "lantai" setinggi atap, sehingga pemeriksaan naik-tangga menolak gerak
     dan pintu terasa tertutup dinding tak terlihat. Menghancurkan dinding
     terasa "membuka jalan" hanya karena sisa balok kayu di atasnya memang
     dilewati daftar pengecualian di bawah. */
  /* blok yang dihitung sebagai "lantai" oleh groundAt. Udara/air/kanopi/
     batang/atap sengaja BUKAN lantai supaya pemain bisa berjalan di bawah
     pohon & tidak menempel ke genteng. */
  isFloor(id){return id!==B.AIR&&id!==B.WATER&&id!==B.WOOD&&id!==B.LEAF&&id!==B.ROOF;},

  groundAt(x,z,fromY){
    /* radius sampling disamakan dengan radius tabrakan pemain (0.28) supaya
       kolom dinding di sebelah tidak ikut terbaca sebagai lantai */
    const r=0.26;let g=0;
    const yTop=(fromY===undefined)?CFG.WORLD_H-1
              :clamp(Math.floor(fromY+0.02),0,CFG.WORLD_H-1);
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
      if(gy>g)g=gy;
    }
    return g;
  },

  /* Permukaan terendah di ATAS ketinggian kaki `y` tempat pemain bisa berdiri
     pada kolom pusat (x,z). Memindai NAIK selama blok masih padat. Dipakai
     sebagai garansi anti-"terhisap terrain": bila kaki pemain sampai berada
     DI DALAM blok padat (terdorong ke sudut struktur, sisa posisi save lama,
     dsb.), panggil fungsi ini lalu set pos.y ke hasilnya agar pemain selalu
     didorong keluar ke permukaan — tidak pernah terkubur. Mengembalikan y
     apa adanya bila kaki tidak berada di dalam blok padat. */
  unburyY(x,z,y){
    const bx=Math.floor(x),bz=Math.floor(z);
    let yy=Math.floor(y+0.001);
    if(yy<0)yy=0;
    if(yy>=CFG.WORLD_H)return y;
    if(!this.isFloor(this.getBlock(bx,yy,bz)))return y;   // tidak terkubur
    while(yy<CFG.WORLD_H&&this.isFloor(this.getBlock(bx,yy,bz)))yy++;
    return yy;
  },

  /* Apakah ada ruang kosong setinggi tubuh pemain bila kaki berdiri di
     `feetY` pada kolom (x,z). Memindai 2 level blok (kaki & dada) di empat
     sudut tabrakan. Dipakai sebagai penjaga gerak horizontal supaya pemain
     TIDAK PERNAH dipindahkan ke posisi yang membuat badannya berada DI DALAM
     blok lantai padat — ini penutup hulu bug "terhisap terrain" (pemain
     terdorong masuk ke celah blok lalu terjebak dan harus loncat untuk lepas).
     Mengembalikan false bila ada blok lantai padat di ruang tubuh. */
  headroomOK(x,z,feetY){
    const r=0.26;
    const fy=Math.floor(feetY+0.02);
    for(const[ox,oz]of[[-r,-r],[r,-r],[-r,r],[r,r]]){
      const bx=Math.floor(x+ox),bz=Math.floor(z+oz);
      for(let dy=0;dy<=1;dy++){
        if(this.isFloor(this.getBlock(bx,fy+dy,bz)))return false;
      }
    }
    return true;
  },
  blockedAt(x,y,z,r=0.3){
    // Rintangan horizontal untuk batang pohon dan batu. Daun sengaja tidak
    // memblokir agar pemain tetap bisa berjalan di bawah kanopi.
    const samples=[[0,0],[r,0],[-r,0],[0,r],[0,-r],[r*.7,r*.7],[-r*.7,r*.7],[r*.7,-r*.7],[-r*.7,-r*.7]];
    const by=Math.floor(y+0.45),by2=Math.floor(y+1.15);
    return samples.some(([ox,oz])=>{
      const id1=this.getBlock(Math.floor(x+ox),by,Math.floor(z+oz));
      const id2=this.getBlock(Math.floor(x+ox),by2,Math.floor(z+oz));
      /* papan dinding rumah ikut memblokir supaya pemain masuk lewat pintu */
      const solid=id=>id===B.WOOD||id===B.STONE||id===B.PLANK;
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
     tembok — misalnya dari dalam rumah mereka tak melihat apa pun di luar.
     ========================================================================= */
  blocksSight(id){return id!==B.AIR&&id!==B.WATER&&id!==B.LEAF;},
  /* true bila ada blok padat di antara titik A dan B (pandangan terhalang).
      Marching sampel tiap 0.5 blok sepanjang garis — cukup rapat agar tidak ada
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
     FX yang sudah menangani jatuh, magnet ke pemain, dan pickup. */
  dropItem(x,y,z,id,n){
    if(n<=0||!ITEMS[id])return;
    FX.spawnDrop(new THREE.Vector3(x,y,z),id,n);
  },

  /* ---------- streaming ----------
      PIPELINE ala Minecraft: pembentukan dunia dibagi dua tahap yang dianggarkan
      per frame supaya TIDAK ada frame yang membeku saat menjelajah:
        TAHAP 1 (gen)  : isi DATA chunk (terrain + desa) — lebih murah, harus
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
    }
    /* ANGGARAN WAKTU per frame (ms). Semua tahap streaming dibatasi angka ini. */
    const t0=performance.now();
    const BUDGET=IS_MOBILE?3:5;

    /* TAHAP 1 — generate DATA chunk yang belum ada, terdekat dulu. */
    let gens=0;
    for(const e of this.loadList){
      if(gens>=(IS_MOBILE?2:3))break;
      if(performance.now()-t0>BUDGET)break;
      if(this.chunks.has(this.key(e.cx,e.cz)))continue;   // data sudah ada
      this.getChunk(e.cx,e.cz);                            // buat data (terrain+desa)
      gens++;
    }

    /* TAHAP 2 — mesh MAKSIMAL 1 chunk per frame, hanya yang data + 8 tetangganya
       sudah siap (4 sisi utk wajah perbatasan + 4 diagonal utk AO sudut). Dengan
       begini mesh tidak memicu generasi chunk apa pun (bebas cascade).
       Anggaran habis → berhenti, lanjut frame berikut. */
    if(performance.now()-t0<BUDGET){
      const R=CFG.VIEW_R;
      for(const e of this.loadList){
        if(e.d>R*R)break;                                  // hanya radius render
        const c=this.chunks.get(this.key(e.cx,e.cz));
        if(!c||c.group)continue;                           // belum ada data / sudah mesh
        let ready=true;
        for(let dz=-1;dz<=1&&ready;dz++)for(let dx=-1;dx<=1;dx++){
          if(dx===0&&dz===0)continue;
          if(!this.chunks.has(this.key(e.cx+dx,e.cz+dz))){ready=false;break;}
        }
        if(!ready)continue;                                // tetangga belum siap
        this.buildMesh(c);
        break;                                             // cukup 1 mesh/frame
      }
    }

    /* remesh chunk kotor (edit blok) — anggaran kecil, maks 2 */
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
  disposeGroup(c){
    Game.scene.remove(c.group);
    c.group.traverse(o=>{if(o.geometry)o.geometry.dispose();});
    c.group=null;
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
     [minX,minZ,maxX,maxZ]. Dibatasi radius & jumlah blok agar murah. */
  floodLeafBox(sx,sy,sz){
    const key=(x,y,z)=>x+','+y+','+z;
    const visited=new Set([key(sx,sy,sz)]);
    const q=[[sx,sy,sz]];
    let minX=sx,maxX=sx,minZ=sz,maxZ=sz,count=0;
    const MAX=700,R=9,RH=6;
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
  updateCanopy(dt,pp){
    const px=Math.floor(pp.x),pz=Math.floor(pp.z);
    /* cari daun tepat di atas kepala pemain */
    const y0=Math.floor(pp.y)+2,y1=Math.min(CFG.WORLD_H,y0+8);
    let leafY=-1;
    for(let y=y0;y<y1;y++){if(this.getBlock(px,y,pz)===B.LEAF){leafY=y;break;}}
    Mesher.getMats();
    if(leafY<0){
      this._leafCache=null;
      this.canopyOp+=(1-this.canopyOp)*Math.min(1,dt*5);
      Mesher.fadeLeaf.uAmt.value=this.canopyOp;
      this.updateRoof(dt,pp);
      return;
    }
    /* di bawah kanopi: pakai kotak cache selama pemain masih di dalamnya */
    let box=this._leafCache;
    const inCache=box&&px>=box[0]-1&&px<=box[2]+1&&pz>=box[1]-1&&pz<=box[3]+1;
    if(!inCache){box=this.floodLeafBox(px,leafY,pz);this._leafCache=box;}
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
     sehingga SELURUH atap rumah tersebut full transparan sekaligus — atap
     rumah tetangga tidak ikut. Dinding tidak pernah transparan karena dinding
     bukan material atap (atap memakai mesh & material terpisah).

     BUGFIX: dulu pemindaian atap hanya 5 blok di atas kepala (y0..y0+5).
     Rumah tinggi (Loteng h=7 → atap y≈11, Wisma h=6 → y≈10) atapnya berada
     di LUAR jangkauan itu, sehingga atapnya tidak pernah jadi transparan.
     Sekarang: (1) cek footprint rumah lewat WGEN.buildingAt — bila pemain
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
    this.insideHouse=inside;
    Mesher.getMats();
    let bb=null;
    if(inside){
      /* area trigger = footprint rumah yang sedang dimasuki */
      bb=b||((typeof WGEN!=='undefined'&&WGEN.buildingAt)?WGEN.buildingAt(px,pz,2):null);
      if(bb){
        const pad=2;   // tritisan atap (1 blok) + pengaman
        Mesher.fadeRoof.uMin.value.set(bb.x-pad,bb.z-pad);
        Mesher.fadeRoof.uMax.value.set(bb.x+bb.w+pad,bb.z+bb.d+pad);
      }else{
        /* fallback: kotak di sekitar pemain bila footprint tak ditemukan */
        Mesher.fadeRoof.uMin.value.set(px-8,pz-8);
        Mesher.fadeRoof.uMax.value.set(px+8,pz+8);
      }
      /* footprint yang sama dipakai oklusi dinding ala Project Zomboid */
      this._occBB=bb||{x:px-8,z:pz-8,w:16,d:16};
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

    /* arah pemain → kamera. Kamera ortografik diposisikan jauh mengikuti yaw,
       jadi arah ini otomatis berubah saat kamera diputar. */
    if(typeof Cam!=='undefined'&&Cam.cam){
      const cp=Cam.cam.position;
      const dx=cp.x-pp.x,dy=cp.y-pp.y,dz=cp.z-pp.z;
      const l=Math.sqrt(dx*dx+dy*dy+dz*dz)||1;
      U.uOD.value.set(dx/l,dy/l,dz/l);
      U.uOL.value=l;
    }

    /* bbox rumah: tetap dikirim selama fade keluar agar transisi tidak pop */
    if(this._occBB&&this.occOp<0.999){
      const b=this._occBB,pad=2;
      U.uOBMin.value.set(b.x-pad,pp.y-0.6,b.z-pad);
      U.uOBMax.value.set(b.x+b.w+pad,pp.y+13.0,b.z+b.d+pad);
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
        this.setBlock(p.x,p.y,p.z,B.AIR);
        const col=(BLOCK_INFO[id]||{}).color||0x888888;
        FX.debris(new THREE.Vector3(p.x+0.5,p.y+0.5,p.z+0.5),col,p.leaf?3:6,p.leaf?1.6:3);
        if(id===B.LEAF&&Math.random()<0.1)FX.spawnDrop(new THREE.Vector3(p.x+0.5,p.y+0.5,p.z+0.5),'berry',1);
        /* batang tumbang: kayu jatuh mengikuti arah tumbang */
        if(p.drop){
          const dropX=p.dx!==undefined?p.dx:p.x+0.5;
          const dropZ=p.dz!==undefined?p.dz:p.z+0.5;
          const dp=new THREE.Vector3(dropX,
            this.groundAt(dropX,dropZ,p.y+1)+0.45,dropZ);
          FX.spawnDrop(dp,p.drop,1+(Math.random()<RPG.harvestBonus()?1:0));
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
        this.pending.push({x:wx,y,z:wz,t:d*0.09+k*0.06+Math.random()*0.04});
      }
    }
  },
  hitBlock(wx,wy,wz,dmg){
    if(wy<=0)return false;
    const id=this.getBlock(wx,wy,wz);
    if(id===B.AIR||id===B.WATER)return false;
    const k=`${wx},${wy},${wz}`;
    let hp=this.blockHP.has(k)?this.blockHP.get(k):BLOCK_INFO[id].hp;
    hp-=dmg;
    FX.debris(new THREE.Vector3(wx+0.5,wy+0.5,wz+0.5),BLOCK_INFO[id].color,2,1.5);
    /* getaran pada blok yang dipukul: makin sedikit HP tersisa, makin kuat
       getarannya sehingga pemain punya umpan balik "hampir hancur" */
    const maxHp=BLOCK_INFO[id].hp||1;
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
  breakBlock(wx,wy,wz){
    const id=this.getBlock(wx,wy,wz);
    if(id===B.AIR||id===B.WATER)return;
    this.setBlock(wx,wy,wz,B.AIR);
    const info=BLOCK_INFO[id];
    FX.debris(new THREE.Vector3(wx+0.5,wy+0.5,wz+0.5),info.color,10,3.2);
    const bonus=RPG.harvestBonus();
    if(info.drop)FX.spawnDrop(new THREE.Vector3(wx+0.5,wy+0.6,wz+0.5),info.drop,1+(Math.random()<bonus?1:0));
    else if((id===B.GRASS||id===B.DIRT)&&Math.random()<0.3+bonus)
      FX.spawnDrop(new THREE.Vector3(wx+0.5,wy+0.6,wz+0.5),'fiber',1);
    Player.addXP(1);
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
    UI.toast('🪓 Pohon tumbang!');
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
  harvestPlants(pos,r){
    const cx=Math.floor(pos.x/16),cz=Math.floor(pos.z/16);
    const c=this.getChunk(cx,cz);
    const keep=[];let hit=false;
    for(const p of c.plants){
      const wx=cx*16+p.x+0.5,wz=cz*16+p.z+0.5;
      const d=Math.hypot(wx-pos.x,wz-pos.z);
      if(d<r&&Math.abs(p.y-pos.y)<2){
        hit=true;
        const drop=p.t===1?['fiber',1]:p.t===2?['fiber',Math.random()<0.5?1:0]:
          p.t===3?['fiber',Math.random()<0.5?1:0]:p.t===4?['berry',2]:['mush',1];
        const extra=Math.random()<RPG.harvestBonus()?1:0;
        if(drop[1]+extra>0)FX.spawnDrop(new THREE.Vector3(wx,p.y+0.4,wz),drop[0],drop[1]+extra);
        /* tanaman liar kadang menjatuhkan benih pertanian */
        if(typeof Farming!=='undefined'&&Math.random()<0.18)
          FX.spawnDrop(new THREE.Vector3(wx,p.y+0.5,wz),Farming.randomSeed(),1);
        FX.debris(new THREE.Vector3(wx,p.y+0.4,wz),0x5d9e3f,4,1.5);
      }else keep.push(p);
    }
    if(hit){c.plants=keep;this.markDirty(cx,cz);Player.addXP(1);}
  },
};
