'use strict';
/* Generator terrain deterministik: 4 biome, pohon, tanaman, bijih, desa */
let nH=null,nM=null,nT=null,nV=null,nMnt=null,nC=null,nI=null;
const WGEN={
  seed:1,
  _villCache:{},       // cache hasil villageInCell per sel (gx,gz)
  init(seed){
    this.seed=seed;
    this._villCache={};this._villN=0;   // seed baru → desa baru, buang cache
    nH=new Noise.Simplex(seed);
    nM=new Noise.Simplex(seed+101);
    nT=new Noise.Simplex(seed+877);   // suhu → penentu biome
    nV=new Noise.Simplex(seed+1543);  // sebaran desa
    nMnt=new Noise.Simplex(seed+2024); // ketinggian pegunungan → biome MOUNTAIN
    nC=new Noise.Simplex(seed+3311);  // benua vs laut
    nI=new Noise.Simplex(seed+4703);  // pulau di tengah laut (ukuran acak)
  },
  hash(x,z,s){const n=Math.sin(x*127.1+z*311.7+s*74.7)*43758.5453;return n-Math.floor(n);},

  /* ---------- biome ----------
     Suhu memakai noise frekuensi rendah supaya tiap biome jadi wilayah
     luas, bukan bercak kecil. Area spawn dipaksa Hutan agar pemain
     selalu mulai di lingkungan paling ramah. */
  /* Frekuensi noise suhu diperkecil ~3× (0.0085 → 0.00283) sehingga tiap
     wilayah biome menjadi kira-kira 3× lebih lebar. Ini membuat Gurun &
     Tundra jadi bentang luas yang mudah dijumpai (dan diisi monster khasnya
     seperti serigala), bukan bercak sempit yang jarang dilewati pemain. */
  temp(wx,wz){return Noise.fbm(nT,wx*0.00283,wz*0.00283,3)*0.5+0.5;},
  /* noise ketinggian pegunungan; ambang 0.72 membuat pegunungan jadi wilayah
     yang cukup langka (hanya puncak noise tinggi yang jadi gunung) */
  mnt(wx,wz){return Noise.fbm(nMnt,wx*0.003,wz*0.003,3)*0.5+0.5;},

  /* ---------- KONTINEN / LAUT ----------
     nC = noise frekuensi sangat rendah yang menentukan mana laut & mana
     daratan. Nilai tinggi = daratan, rendah = laut. Karena frekuensinya kecil
     (0.0016), hasilnya berupa benua & pulau lebar, bukan bercak kecil.
     nI = noise frekuensi lebih tinggi yang menaikkan sebagian area laut
     menjadi PULAU dengan ukuran acak.

     Ambang:
       cont >= LAND_T            → daratan utama
       cont <  LAND_T            → laut, KECUALI bila island() lolos
       cont dalam pita SHORE_T   → pantai (pita pasir tepi laut) */
  LAND_T:0.50,
  SHORE_W:0.035,
  cont(wx,wz){return Noise.fbm(nC,wx*0.0016,wz*0.0016,4)*0.5+0.5;},

  /* Kekuatan "pulau" pada titik laut. Memakai dua oktaf noise berbeda skala
     sehingga ukuran pulau bervariasi: ada yang kecil (beberapa blok) sampai
     yang cukup lebar (puluhan blok). */
  island(wx,wz){
    const a=Noise.fbm(nI,wx*0.0075,wz*0.0075,3)*0.5+0.5;   // pulau sedang/besar
    const b=Noise.fbm(nI,wx*0.021+53,wz*0.021-29,2)*0.5+0.5; // pulau kecil
    return Math.max(a,b*0.94);
  },

  /* true bila titik ini daratan (di atas permukaan air) */
  isLand(wx,wz){
    const c=this.cont(wx,wz);
    if(c>=this.LAND_T)return true;
    /* pulau: makin jauh dari ambang daratan, makin tinggi syarat noise pulau */
    const depth=(this.LAND_T-c)/this.LAND_T;          // 0..1
    return this.island(wx,wz)>0.62+depth*0.30;
  },

  /* true bila titik daratan ini bertetangga dengan laut (dipakai untuk pantai) */
  nearOcean(wx,wz){
    return !this.isLand(wx+3,wz)||!this.isLand(wx-3,wz)||
           !this.isLand(wx,wz+3)||!this.isLand(wx,wz-3);
  },

  biomeAt(wx,wz){
    if(Math.abs(wx)<24&&Math.abs(wz)<24)return BIOME.FOREST;
    /* laut & pantai diputuskan lebih dulu: keduanya mengabaikan suhu */
    if(!this.isLand(wx,wz))return BIOME.OCEAN;
    if(this.nearOcean(wx,wz))return BIOME.BEACH;
    if(this.mnt(wx,wz)>0.72)return BIOME.MOUNTAIN;
    const t=this.temp(wx,wz);
    if(t>0.63)return BIOME.DESERT;
    if(t<0.37)return BIOME.TUNDRA;
    return BIOME.FOREST;
  },
  /* ---------- ketinggian permukaan ----------
     Daratan berada di rentang 5..7 (SEA..7) supaya terrain berbukit tapi tidak
     pernah membentuk genangan tipis. Wilayah air (m<0.30) digali ke kedalaman
     TEPAT 3 atau 4 blok di bawah permukaan air (SEA=5) → dasar y=2 atau y=1. */
  height(wx,wz){
    /* ---- LAUT: dasar landai, makin jauh dari pantai makin dalam ---- */
    const b=this.biomeAt(wx,wz);
    if(b===BIOME.OCEAN){
      const c=this.cont(wx,wz);
      /* dinormalkan ke pita 0.16 supaya laut lepas benar-benar dalam, bukan
         genangan 1 blok (noise cont jarang turun jauh di bawah LAND_T) */
      const depth=clamp((this.LAND_T-c)/0.16,0,1);          // 0 (tepi) .. 1 (dalam)
      /* SEA-1 di tepi sampai SEA-4 di laut dalam; y=0 tetap bedrock */
      return clamp(CFG.SEA-1-Math.round(depth*3),1,CFG.SEA-1);
    }
    let t=Noise.fbm(nH,wx*0.042,wz*0.042,3)*0.5+0.5;
    t=Math.pow(clamp(t,0,1),1.15);
    const m=Noise.fbm(nM,wx*0.02,wz*0.02,2)*0.5+0.5;
    /* ---- PANTAI: selalu rata di permukaan air supaya jadi pita pasir ---- */
    if(b===BIOME.BEACH)return CFG.SEA;
    /* ---- sungai/danau: kedalaman TEPAT 3-4 blok dari permukaan air ---- */
    if(m<0.30){
      const deep=m<0.18;
      return deep?CFG.SEA-4:CFG.SEA-3;           // y=1 (dalam 4) atau y=2 (dalam 3)
    }
    /* ---- daratan: SEA..7 (5..7) ---- */
    let h=CFG.SEA+Math.round(t*(7-CFG.SEA));     // 5..7
    if(m>0.75)h=Math.max(h,6);                   // dataran tinggi
    if(b===BIOME.DESERT)h=clamp(h-(this.hash(wx,wz,21)<0.5?1:0),CFG.SEA,6);
    if(b===BIOME.TUNDRA&&m>0.55)h=Math.min(7,h+1);
    if(b===BIOME.MOUNTAIN)h=clamp(h+2,6,7);      // pegunungan paling tinggi
    return clamp(h,CFG.SEA,7);
  },
  treeAt(wx,wz,h){
    if(h<CFG.SEA)return false;                      // tidak tumbuh di air
    if(Math.abs(wx)<2&&Math.abs(wz)<2)return false; // area spawn bersih
    const dens=BIOME_INFO[this.biomeAt(wx,wz)].tree;
    const m=Noise.fbm(nM,wx*0.05,wz*0.05,2)*0.5+0.5;
    return this.hash(wx,wz,1)<(m>0.45?0.055:0.013)*dens;
  },
  plantAt(wx,wz){
    const b=this.biomeAt(wx,wz);
    const r=this.hash(wx,wz,2);
    /* laut: tidak ada tanaman permukaan */
    if(b===BIOME.OCEAN)return 0;
    /* pantai: hanya rumput pantai yang sangat jarang */
    if(b===BIOME.BEACH)return r<0.03?1:0;
    /* gurun: hanya kaktus/semak kering yang jarang */
    if(b===BIOME.DESERT)return r<0.045?1:0;
    /* tundra: rumput jarang + jamur salju */
    if(b===BIOME.TUNDRA){
      if(r<0.05)return 1;
      if(r<0.075)return 5;
      return 0;
    }
    /* ladang bunga & rumpun jamur mengelompok → hutan terasa lebih hidup */
    const patch=Noise.fbm(nM,wx*0.09+41,wz*0.09-17,2)*0.5+0.5;
    if(patch>0.66&&r<0.34)return this.hash(wx,wz,3)<0.5?2:3;   // ladang bunga
    if(patch<0.3&&r<0.13)return 5;                             // rumpun jamur (lembap)
    if(r<0.22)return 1;                          // rumput tinggi
    if(r<0.25)return this.hash(wx,wz,3)<0.5?2:3;// bunga merah/kuning
    if(r<0.285)return 4;                         // semak beri
    if(r<0.30)return 5;                          // jamur
    return 0;
  },
  /* batu besar tersebar sebagai penanda arah */
  rockAt(wx,wz,h){
    if(h<CFG.SEA)return 0;
    if(this.biomeAt(wx,wz)===BIOME.OCEAN)return 0;
    if(Math.abs(wx)<3&&Math.abs(wz)<3)return 0;
    const r=this.hash(wx,wz,6);
    if(r>0.004)return 0;
    return 2+(this.hash(wx,wz,7)<0.5?0:1);       // tinggi 2–3
  },
  /* ---------- bijih ----------
     Bijih muncul sebagai urat pada bongkahan batu di permukaan dan pada
     lapisan batu dasar (y=0), jadi pemain menambang tanpa perlu gua. */
  oreFor(wx,wz){return BIOME_INFO[this.biomeAt(wx,wz)].ore;},
  oreRoll(wx,wz,y){
    /* vein: noise + hash, makin dekat dasar makin sering */
    const v=Noise.fbm(nM,wx*0.16+7,wz*0.16-3,2)*0.5+0.5;
    const base=y<=0?0.16:0.09;
    return v>0.6&&this.hash(wx,wz+y*57,31)<base;
  },

  /* ---------- desa ----------
     Dunia dibagi grid 96x96 blok; tiap sel punya peluang menampung satu
     desa. Titik pusat ditentukan deterministik dari indeks sel supaya
     chunk mana pun bisa menghitung desa terdekat tanpa state global.
     Sel spawn (0,0) SELALU berdesa, dengan pusat digeser ~44 blok dari titik
     mulai: cukup jauh agar tanah spawn tidak diratakan, tapi masih di dalam
     jarak render sehingga pemain langsung melihat desa & penjaganya. */
  VILLAGE_GRID:96,
  /* ---------- syarat lahan desa ----------
     Desa hanya boleh berdiri di DARATAN. Titik pusat kandidat diuji bersama
     cincin di sekelilingnya (radius desa) supaya desa tidak setengah tercelup
     laut. Pantai juga ditolak agar rumah tidak menempel garis air. */
  villageSpotOK(cx,cz,r){
    if(!this.isLand(cx,cz))return false;
    if(this.biomeAt(cx,cz)===BIOME.BEACH)return false;
    const R=r||26;
    /* 8 arah pada radius penuh + radius setengah: cukup untuk menolak tanjung
       sempit maupun pulau yang lebih kecil dari desa. */
    for(const f of [1,0.6]){
      const d=Math.round(R*f);
      for(let i=0;i<8;i++){
        const a=i/8*Math.PI*2;
        const x=Math.round(cx+Math.cos(a)*d);
        const z=Math.round(cz+Math.sin(a)*d);
        if(!this.isLand(x,z))return false;
      }
    }
    return true;
  },
  villageInCell(gx,gz){
    /* CACHE: desa deterministik per sel, jadi hasilnya bisa disimpan. Ini
       krusial karena villageInCell dipanggil belasan kali per frame (lewat
       buildingAt→villagesNear dari updateRoof) dan housePlan() cukup mahal;
       tanpa cache, housePlan dijalankan ulang setiap frame → lag. */
    const key=gx+','+gz;
    if(Object.prototype.hasOwnProperty.call(this._villCache,key))
      return this._villCache[key];
    if(this._villN>800){this._villCache={};this._villN=0;}   // batas memori
    const G=this.VILLAGE_GRID;
    const home=(gx===0&&gz===0);
    let v=null;
    if(home||Noise.fbm(nV,gx*1.7,gz*1.7,1)*0.5+0.5>=0.55){
      /* Beberapa kandidat titik di dalam sel; dipakai yang benar-benar berada
         di daratan. Bila semua kandidat jatuh di laut/pantai, sel ini TIDAK
         berdesa (deterministik karena memakai hash indeks sel). */
      const R=26;
      let cx=null,cz=null;
      for(let k=0;k<10;k++){
        const ox=home?34:Math.floor(this.hash(gx,gz,71+k*13)*(G-52))+26;
        const oz=home?30:Math.floor(this.hash(gx,gz,73+k*17)*(G-52))+26;
        const tx=gx*G+ox,tz=gz*G+oz;
        if(this.villageSpotOK(tx,tz,R)){cx=tx;cz=tz;break;}
        if(home)break;   // sel spawn memakai titik tetap
      }
      if(cx!==null){
        v={x:cx,z:cz,biome:this.biomeAt(cx,cz),r:R};
        v.plan=housePlan(v,gx,gz);
        v.farms=farmPlan(v);
        v.houses=v.plan.length;
      }
    }
    this._villCache[key]=v;this._villN=(this._villN||0)+1;
    return v;
  },

  /* ---------- uji "di dalam bangunan" ----------
     Dipakai spawner monster supaya tidak ada monster muncul di dalam rumah
     (dulu slime/serigala bisa terjebak di ruang tamu penduduk). pad>0 juga
     mencegah spawn menempel di dinding luar. */
  buildingAt(wx,wz,pad){
    pad=pad||0;
    for(const v of this.villagesNear(wx,wz)){
      if(Math.max(Math.abs(wx-v.x),Math.abs(wz-v.z))>v.r+pad+2)continue;
      for(const b of v.plan){
        if(wx>=b.x-pad&&wx<b.x+b.w+pad&&wz>=b.z-pad&&wz<b.z+b.d+pad)return b;
      }
    }
    return null;
  },



  /* desa yang mungkin menyentuh chunk (cek 3x3 sel di sekitar) */
  villagesNear(wx,wz){
    const G=this.VILLAGE_GRID,out=[];
    const gx=Math.floor(wx/G),gz=Math.floor(wz/G);
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const v=this.villageInCell(gx+dx,gz+dz);
      if(v)out.push(v);
    }
    return out;
  },
  /* desa terdekat dari sebuah titik, dicari sampai 5x5 sel (±2 sel ≈ 192 blok).
     Dipakai NPCS.spawn untuk menentukan desa mana yang perlu diisi penjaga. */
  nearestVillage(wx,wz){
    const G=this.VILLAGE_GRID;
    const gx=Math.floor(wx/G),gz=Math.floor(wz/G);
    let best=null,bd=Infinity;
    for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
      const v=this.villageInCell(gx+dx,gz+dz);
      if(!v)continue;
      const d=Math.hypot(v.x-wx,v.z-wz);
      if(d<bd){bd=d;best=v;}
    }
    return best?{v:best,dist:bd}:null;
  },
  /* apakah blok ini bagian dari jalan / halaman desa (permukaan diratakan) */
  villageAt(wx,wz){
    for(const v of this.villagesNear(wx,wz)){
      const d=Math.max(Math.abs(wx-v.x),Math.abs(wz-v.z));
      if(d<=v.r)return v;
    }
    return null;
  },

  /* apakah blok ini bagian dari lahan farming desa */
  farmAt(wx,wz){
    for(const v of this.villagesNear(wx,wz)){
      if(!v.farms)continue;
      for(const f of v.farms){
        if(wx>=f.x&&wx<f.x+f.w&&wz>=f.z&&wz<f.z+f.d)return f;
      }
    }
    return null;
  },
};

/* build data satu chunk (blok + tanaman) */
function genChunk(cx,cz){
  const C=CFG.CHUNK,H=CFG.WORLD_H;
  const data=new Uint8Array(C*C*H);
  const plants=[];
  const idx=(x,y,z)=>x+z*C+y*C*C;
  /* desa yang menyentuh chunk ini; dipakai untuk meratakan tanah & rumah */
  const villages=WGEN.villagesNear(cx*C+8,cz*C+8);
  /* reruntuhan/dungeon di sekitar chunk (didefinisikan di js/dungeon.js) */
  const dungeons=WGEN.dungeonsNear?WGEN.dungeonsNear(cx*C+8,cz*C+8):[];


  for(let z=0;z<C;z++)for(let x=0;x<C;x++){
    const wx=cx*C+x,wz=cz*C+z;
    const biome=WGEN.biomeAt(wx,wz);
    const BI=BIOME_INFO[biome];

    /* desa: ratakan permukaan ke tinggi tetap agar bangunan tidak miring */
    let village=null;
    for(const v of villages){
      if(Math.max(Math.abs(wx-v.x),Math.abs(wz-v.z))<=v.r){village=v;break;}
    }
    /* dungeon: lantainya juga diratakan seperti desa */
    let dung=null;
    for(const d of dungeons){
      if(Math.max(Math.abs(wx-d.x),Math.abs(wz-d.z))<=d.r+2){dung=d;break;}
    }
    /* Desa & dungeon diratakan ke tinggi tetap = CFG.SEA (permukaan air),
       supaya lantainya selalu di atas air apa pun terrain aslinya. */
    const h=(village||dung)?CFG.SEA:WGEN.height(wx,wz);

    for(let y=0;y<h;y++){
      let id;
      if(y===0)id=B.STONE;
      else if(y===h-1)id=(h>=CFG.SEA?BI.surface:BI.sub);
      else id=BI.sub;
      /* selipkan bijih di lapisan batu / bawah tanah */
      if(id===B.STONE&&WGEN.oreRoll(wx,wz,y))id=BI.ore;
      data[idx(x,y,z)]=id;
    }
    for(let y=h;y<CFG.SEA;y++)data[idx(x,y,z)]=B.WATER;

    const safe=x>=2&&x<=13&&z>=2&&z<=13;
    let occupied=false;

    /* ---------- bangunan desa ---------- */
    if(village){
      const built=buildVillagePart(data,idx,x,z,wx,wz,h,village,C,H);
      if(built)occupied=true;
    }
    /* ---------- reruntuhan / dungeon ---------- */
    if(dung&&typeof buildDungeonPart==='function'){
      if(buildDungeonPart(data,idx,x,z,wx,wz,h,dung,C,H))occupied=true;
    }

    /* ---------- lahan farming desa ---------- */
    if(village&&village.farms&&!occupied){
      for(const f of village.farms){
        if(wx>=f.x&&wx<f.x+f.w&&wz>=f.z&&wz<f.z+f.d){
          if(h-1>=0)data[idx(x,h-1,z)]=B.FARM;
          occupied=true;
          if(typeof Farming!=='undefined')Farming.registerFarm(wx,h-1,wz);
          break;
        }
      }
    }

    let tree=false;
    if(!occupied&&safe&&WGEN.treeAt(wx,wz,h)){
      tree=true;
      /* batang lebih tinggi (3–6) agar pemain bisa berjalan di bawah kanopi */
      const th=3+Math.floor(WGEN.hash(wx,wz,4)*4);
      for(let t=0;t<th;t++){const y=h+t;if(y<H)data[idx(x,y,z)]=B.WOOD;}
      const topY=h+th;
      /* kanopi lebih rimbun & berlapis */
      for(let dy=-2;dy<=1;dy++)for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
        const y=topY+dy,xx=x+dx,zz=z+dz;
        if(y<0||y>=H||xx<0||xx>=C||zz<0||zz>=C)continue;
        if(dx===0&&dz===0&&y<topY)continue;      // sisakan ruang batang
        const rad=dy<=-1?3:dy===0?4:2;           // lapisan bawah lebih lebar
        const dist=Math.abs(dx)+Math.abs(dz);
        if(dist>rad)continue;
        if(dist>=rad&&WGEN.hash(wx+dx*7,wz+dz*13+y*3,5)<0.5)continue;
        const ii=idx(xx,y,zz);
        if(data[ii]===B.AIR)data[ii]=B.LEAF;
      }
    }
    /* bongkahan batu (kadang mengandung bijih permukaan) */
    if(!tree&&!occupied&&safe){
      const rh=WGEN.rockAt(wx,wz,h);
      if(rh){
        tree=true;
        for(let dy=0;dy<rh;dy++)for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
          const y=h+dy,xx=x+dx,zz=z+dz;
          if(y>=H||xx<0||xx>=C||zz<0||zz>=C)continue;
          const dist=Math.abs(dx)+Math.abs(dz);
          if(dist+dy>=rh)continue;
          const ii=idx(xx,y,zz);
          if(data[ii]===B.AIR){
            data[ii]=WGEN.hash(wx+dx,wz+dz+y*11,33)<0.28?BI.ore:B.STONE;
          }
        }
      }
    }

    if(!tree&&!occupied&&h>=CFG.SEA){
      const top=data[idx(x,h-1,z)];
      if(top===B.GRASS||top===B.SAND||top===B.SNOW){
        const p=WGEN.plantAt(wx,wz);
        if(p)plants.push({x,y:h,z,t:p});
      }
    }
  }
  return {data,plants};
}

/* ---------- lahan farming desa ----------
   Tiap desa punya minimal 2 lahan farming kecil (4–8 blok). Posisi dipilih
   deterministik di area rumput kosong, jauh dari rumah & jalan pusat, sehingga
   tidak menimpa pohon/ore/rumah — area farm nanti dipaksa jadi B.FARM dan
   tanaman liar/pohon/batu di area ini dimatikan di genChunk. */
function farmPlan(v){
  const farms=[];
  const sizes=[[2,2],[2,3],[2,4]];
  for(let f=0;f<2;f++){
    for(let tries=0;tries<26;tries++){
      const si=Math.floor(WGEN.hash(v.x+f*7,v.z+tries,901)*sizes.length);
      const w=sizes[si][0],d=sizes[si][1];
      const ang=WGEN.hash(v.x+f*11,v.z+tries,902)*Math.PI*2;
      const rad=8+WGEN.hash(v.x+f*13,v.z+tries,903)*(v.r-12);
      const cx=v.x+Math.cos(ang)*rad,cz=v.z+Math.sin(ang)*rad;
      const x=Math.floor(cx-w/2),z=Math.floor(cz-d/2);
      /* harus tetap di dalam radius desa */
      if(Math.max(Math.abs(cx-v.x),Math.abs(cz-v.z))>v.r-2)continue;
      /* jangan terlalu dekat jalan pusat */
      if(Math.hypot(cx-v.x,cz-v.z)<7)continue;
      let bad=false;
      /* tidak boleh menimpa rumah (dengan margin) */
      for(const b of v.plan){
        if(x<b.x+b.w+2&&x+w>b.x-2&&z<b.z+b.d+2&&z+d>b.z-2){bad=true;break;}
      }
      if(bad)continue;
      /* tidak boleh menempel lahan farm lain */
      for(const fm of farms){
        if(x<fm.x+fm.w+1&&x+w>fm.x-1&&z<fm.z+fm.d+1&&z+d>fm.z-1){bad=true;break;}
      }
      if(bad)continue;
      farms.push({x,z,w,d});
      break;
    }
  }
  return farms;
}

/* ---------- tata letak desa ----------
   Satu desa berisi beberapa bangunan dengan tipe, ukuran, bahan, dan bentuk
   atap berbeda supaya tiap desa terlihat unik. Slot posisi dipilih tetap
   (sudah dipastikan tidak bertumpuk dan tidak menutup jalan salib di pusat),
   sedangkan tipe bangunan diundi deterministik dari indeks sel grid — jadi
   chunk mana pun menghasilkan desa yang sama tanpa state global. */
/* Kavling dibuat seragam 11x11 blok supaya rumah bisa diputar 90° tanpa
   pernah bertabrakan dengan tetangganya. Anchor sengaja menjauhi jalan salib
   di pusat desa (|x|>=3, |z|>=3) sehingga jalan tidak pernah tertutup
   dinding, dan seluruh kavling tetap di dalam radius desa (r=26). */
const V_SLOT=[];
for(const sz of[-14,3])for(const sx of[-24,-12,3,15])V_SLOT.push([sx,sz]);
/* Kavling khusus TAVERN: 13x11, ditempatkan di sisi selatan pusat desa.
   z mulai +15 supaya tidak menimpa deret rumah (slot sz=3 berakhir di +14)
   dan seluruh bangunan tetap di dalam radius desa (r=26 → z maks +26). */
const V_TAVERN=[-7,15];


/* =============================================================================
   LIMA MODEL RUMAH (kecil → besar)
   -----------------------------------------------------------------------------
   Dulu ukuran rumah diundi acak dan perabot diletakkan dengan rumus umum
   (`if(w>=7&&d>=6)...`), sehingga rumah besar bisa mendapat dua meja yang
   posisinya nyaris bertumpuk. Sekarang tiap model punya PETA PERABOT TETAP:
   isi & letaknya selalu sama, satu-satunya variasi adalah ROTASI rumah
   (0/90/180/270) yang diundi saat desa dibuat.

   Koordinat perabot memakai satuan blok lokal (u,v) relatif sudut rumah:
   u∈[0,w], v∈[0,d]. Dinding menempati u/v 0 dan w-1/d-1, jadi semua perabot
   dijaga di rentang 1..w-1 / 1..d-1 supaya tidak pernah menembus dinding.
   `r` = yaw (radian) menghadap; 0 = menghadap +z.
   ============================================================================= */
const HOUSE_MODELS=[
  /* 1. GUBUK — 7x6, satu ruang: kasur + meja kecil + kursi */
  {id:'hut',w:7,d:6,h:4,roof:'pyramid',mat:'stone',
   furn:[{id:'bed',u:1.7,v:2.0,r:0},
         {id:'table',u:4.6,v:2.2,r:0},
         {id:'chair',u:4.6,v:3.5,r:Math.PI},
         {id:'chest',u:5.1,v:4.3,r:Math.PI}]},
  /* 2. PONDOK — 9x7, hunian standar: kasur, meja makan + 2 kursi, peti */
  {id:'cottage',w:9,d:7,h:5,roof:'gable',mat:'plank',
   furn:[{id:'bed',u:1.8,v:2.2,r:0},
         {id:'table',u:5.2,v:3.4,r:0},
         {id:'chair',u:5.2,v:4.7,r:Math.PI},
         {id:'chair',u:5.2,v:2.1,r:0},
         {id:'chest',u:7.2,v:1.7,r:Math.PI}]},
  /* 3. KABIN — 9x9, dua kasur bersebelahan + ruang makan di sisi timur */
  {id:'cabin',w:9,d:9,h:5,roof:'pyramid',mat:'wood',
   furn:[{id:'bed',u:1.8,v:2.4,r:0},
         {id:'bed',u:1.8,v:6.2,r:0},
         {id:'table',u:5.6,v:4.5,r:0},
         {id:'chair',u:5.6,v:5.8,r:Math.PI},
         {id:'chair',u:5.6,v:3.2,r:0},
         {id:'chest',u:7.3,v:7.2,r:Math.PI}]},
   /* 4. LOTENG — 10x9, ruang terbuka tinggi: kasur, meja kerja, dua peti.
      `mid` DIHAPUS (kasus sama dgn tavern): dulu lantai dua (mid:3) menjadi
      "langit-langit" yang menutupi atap flat transparan dari ruang utama. */
   {id:'loft',w:10,d:9,h:7,roof:'flat',mat:'plank',
   furn:[{id:'bed',u:1.8,v:2.5,r:0},
         {id:'bed',u:1.8,v:6.3,r:0},
         {id:'table',u:5.8,v:4.5,r:0},
         {id:'chair',u:5.8,v:5.8,r:Math.PI},
         {id:'chair',u:5.8,v:3.2,r:0},
         {id:'chest',u:8.2,v:1.8,r:Math.PI},
         {id:'chest',u:8.2,v:7.2,r:Math.PI}]},
  /* 5. WISMA — 11x11, rumah terbesar: dua kasur, ruang makan 3 kursi, 2 peti */
  {id:'manor',w:11,d:11,h:6,roof:'gable',mat:'stone',
   furn:[{id:'bed',u:1.8,v:2.6,r:0},
         {id:'bed',u:1.8,v:8.4,r:0},
         {id:'table',u:6.0,v:5.5,r:0},
         {id:'chair',u:6.0,v:6.8,r:Math.PI},
         {id:'chair',u:6.0,v:4.2,r:0},
         {id:'chair',u:7.4,v:5.5,r:-Math.PI/2},
         {id:'chest',u:9.2,v:1.8,r:Math.PI},
         {id:'chest',u:9.2,v:9.2,r:Math.PI}]},
];

/* =============================================================================
   TAVERN — bangunan khusus tempat berkumpulnya NPC
   -----------------------------------------------------------------------------
   Bangunan terbesar di desa (13x11, 2 lantai). Berisi banyak meja & kursi
   sebagai tempat NPC berkumpul setelah menyelesaikan misi, PAPAN QUEST di
   dinding dalam, dan beberapa peti persediaan. NPC langka (pengembara) juga
   bisa mampir ke tavern sehingga pemain punya dua cara menemui mereka:
   di perjalanan antar desa ATAU di dalam tavern.
   ============================================================================= */
const TAVERN_MODEL={
  /* `mid` sengaja DIHAPUS: dulu tavern berlantai 2 (mid:4) sehingga lantai dua
     (PLANK) menjadi "langit-langit kayu" yang menutupi atap dari ruang utama.
     Tanpa mid, interior jadi satu aula terbuka penuh dan genteng (ROOF) yang
     sudah transparan terlihat langsung dari lantai bawah. */
  id:'tavern',w:13,d:11,h:6,roof:'gable',mat:'plank',
  furn:[
    /* --- papan quest di dinding dalam sisi barat (menghadap ruang) --- */
    {id:'board',u:1.6,v:5.5,r:-Math.PI/2},
    /* --- meja panjang tengah + kursi mengelilingi (tempat NPC berkumpul) --- */
    {id:'table',u:5.0,v:3.2,r:0},
    {id:'chair',u:5.0,v:2.0,r:0},
    {id:'chair',u:5.0,v:4.4,r:Math.PI},
    {id:'table',u:5.0,v:7.0,r:0},
    {id:'chair',u:5.0,v:5.8,r:0},
    {id:'chair',u:5.0,v:8.2,r:Math.PI},
    /* --- meja sudut timur + kursi --- */
    {id:'table',u:9.4,v:3.0,r:0},
    {id:'chair',u:9.4,v:4.2,r:Math.PI},
    {id:'table',u:9.4,v:7.4,r:0},
    {id:'chair',u:9.4,v:6.2,r:0},
    /* --- kasur penginapan di sudut utara-timur --- */
    {id:'bed',u:11.0,v:1.8,r:0},
    {id:'bed',u:11.0,v:9.0,r:0},
    /* --- peti persediaan --- */
    {id:'chest',u:1.6,v:1.8,r:Math.PI},
    {id:'chest',u:1.6,v:9.0,r:Math.PI},
  ]};

/* bahan dinding/lantai menyesuaikan biome (gurun batu pasir, tundra kayu) */
function houseMats(mat,biome){
  const desert=biome===BIOME.DESERT,tundra=biome===BIOME.TUNDRA;
  if(desert)return {wall:mat==='stone'?B.STONE:B.SAND,beam:B.WOOD,floor:B.SAND};
  if(mat==='stone')return {wall:B.STONE,beam:B.WOOD,floor:B.PLANK};
  if(mat==='wood') return {wall:B.WOOD,beam:B.WOOD,floor:B.PLANK};
  return {wall:tundra?B.WOOD:B.PLANK,beam:B.WOOD,floor:B.PLANK};
}

/* ---------- rotasi kavling ----------
   rot = 0..3 (× 90°). Titik lokal (u,v) pada rumah w×d dipetakan ke kavling
   yang sudah diputar; sisi pintu & yaw perabot ikut berputar supaya isi rumah
   tetap konsisten dengan dindingnya. */
function rotPoint(u,v,w,d,rot){
  if(rot===1)return [d-v,u];
  if(rot===2)return [w-u,d-v];
  if(rot===3)return [v,w-u];
  return [u,v];
}
/* sisi: 0=+z, 1=-z, 2=+x, 3=-x */
const ROT_SIDE=[[0,1,2,3],[3,2,0,1],[1,0,3,2],[2,3,1,0]];

function housePlan(v,gx,gz){
  const hs=s=>WGEN.hash(gx*13+7,gz*29+3,s);
  const plan=[];
  /* sumur di dekat pusat: penanda desa yang terlihat dari jauh */
  plan.push({kind:'well',x:v.x-4,z:v.z+2,w:3,d:3,h:1,roof:'pyramid',
    wall:B.STONE,beam:B.WOOD,floor:B.STONE,ds:0,dc:1});
  const n=4+Math.floor(hs(11)*3);                    // 4–6 rumah
  for(let i=0;i<n&&i<V_SLOT.length;i++){
    /* model diundi deterministik; slot pertama selalu Pondok agar tiap desa
       punya hunian utama yang sama besar */
    const mi=i===0?1:Math.floor(hs(40+i*5)*HOUSE_MODELS.length)%HOUSE_MODELS.length;
    const M=HOUSE_MODELS[mi];
    const rot=Math.floor(hs(60+i*11)*4)%4;           // hanya rotasi yang acak
    const swap=(rot===1||rot===3);
    const w=swap?M.d:M.w,d=swap?M.w:M.d;
    /* kavling 11x11: rumah kecil ditengahkan supaya jaraknya rata */
    const bx=v.x+V_SLOT[i][0]+Math.floor((11-w)/2);
    const bz=v.z+V_SLOT[i][1]+Math.floor((11-d)/2);
    const mats=houseMats(M.mat,v.biome);
    /* pintu menghadap pusat desa supaya rumah terasa mengelilingi jalan */
    const cx=bx+(w-1)/2,cz=bz+(d-1)/2;
    const ds=Math.abs(v.x-cx)>Math.abs(v.z-cz)?(v.x>cx?2:3):(v.z>cz?0:1);
    const dc=ds<2?Math.floor(w/2):Math.floor(d/2);
    /* peta perabot tetap → koordinat dunia (lantai desa selalu y=4) */
    const furn=[];
    for(const f of M.furn){
      const p=rotPoint(f.u,f.v,M.w,M.d,rot);
      furn.push({id:f.id,x:bx+p[0],z:bz+p[1],yaw:f.r-rot*Math.PI/2});
    }
    plan.push({kind:M.id,model:mi,rot,x:bx,z:bz,w,d,h:M.h,roof:M.roof,
      mid:M.mid,wall:mats.wall,beam:mats.beam,floor:mats.floor,ds,dc,furn});
  }

  /* ---------- TAVERN: satu per desa, di kavling khusus sisi selatan ----------
     Tidak diputar (rot 0) supaya tata letak meja/kursi & papan quest selalu
     konsisten dan mudah diprediksi pemain. Pintu menghadap pusat desa (-z). */
  {
    const M=TAVERN_MODEL;
    const bx=v.x+V_TAVERN[0],bz=v.z+V_TAVERN[1];
    const mats=houseMats(M.mat,v.biome);
    const furn=[];
    for(const f of M.furn)
      furn.push({id:f.id,x:bx+f.u,z:bz+f.v,yaw:f.r});
    plan.push({kind:'tavern',tavern:true,model:-1,rot:0,x:bx,z:bz,
      w:M.w,d:M.d,h:M.h,roof:M.roof,mid:M.mid,
      wall:mats.wall,beam:mats.beam,floor:mats.floor,
      ds:1,dc:Math.floor(M.w/2),furn});   // ds:1 = pintu di sisi -z (arah pusat)
    v.tavern={x:bx,z:bz,w:M.w,d:M.d,
      cx:bx+M.w/2,cz:bz+M.d/2};           // titik tengah, dipakai NPC berkumpul
  }
  return plan;
}


/* ---------- bangun satu kolom bangunan desa ----------
   Fungsi dipanggil per kolom (x,z), jadi tiap chunk hanya menulis bagian
   bangunan yang jatuh di dalamnya (bangunan boleh melintasi batas chunk). */
function buildVillagePart(data,idx,x,z,wx,wz,h,v,C,H){
  let touched=false;
  const set=(y,id)=>{if(y>=0&&y<H)data[idx(x,y,z)]=id;};

  for(const b of v.plan){
    const lx=wx-b.x,lz=wz-b.z;
    const ov=(b.roof==='gable'||b.roof==='pyramid')?1:0;   // tritisan atap
    if(lx<-ov||lx>=b.w+ov||lz<-ov||lz>=b.d+ov)continue;
    touched=true;
    const inside=lx>=0&&lx<b.w&&lz>=0&&lz<b.d;
    const rBase=h+b.h;

    if(b.kind==='well'){
      if(inside){
        const rim=(lx===0||lx===b.w-1||lz===0||lz===b.d-1);
        if(rim){set(h-1,B.STONE);set(h,B.STONE);}
        else set(h-1,B.WATER);                             // mata air di tengah
        /* dua tiang penyangga di sudut berlawanan + atap kecil */
        if((lx===0&&lz===0)||(lx===b.w-1&&lz===b.d-1))
          for(let y=h+1;y<h+4;y++)set(y,B.WOOD);
      }
      const lvl=Math.max(0,Math.floor(Math.min(
        1-Math.abs(lx-1),1-Math.abs(lz-1))));
      for(let k=0;k<=lvl;k++)set(h+4+k,B.ROOF);
      continue;
    }

    if(inside){
      set(h-1,b.floor);                                    // lantai
      const corner=(lx===0||lx===b.w-1)&&(lz===0||lz===b.d-1);
      const edge=lx===0||lx===b.w-1||lz===0||lz===b.d-1;
      /* Pintu dibuat selebar 2 blok. Dengan lubang 1 blok, tabrakan pemain
         (radius 0.3) hanya menyisakan celah 0.4 blok sehingga pintu nyaris
         mustahil dilewati walau terlihat terbuka. Dua blok memberi celah
         1.4 blok — mudah dimasuki dan tetap terlihat seperti pintu. */
      const span=b.ds<2?b.w:b.d;
      /* blok kedua diambil ke kanan bila masih di dalam dinding, kalau tidak
         ke kiri; bangunan sempit (menara 3x3) tetap berpintu satu blok */
      const dc2=b.dc+1<=span-2?b.dc+1:(b.dc-1>=1?b.dc-1:b.dc);
      const atDoor=c=>c===b.dc||c===dc2;
      const door=b.ds===0?(lz===b.d-1&&atDoor(lx))
               :b.ds===1?(lz===0&&atDoor(lx))
               :b.ds===2?(lx===b.w-1&&atDoor(lz))
               :         (lx===0&&atDoor(lz));
      for(let y=h;y<rBase;y++){
        const wy=y-h;
        if(!edge){
          /* interior kosong; lantai dua untuk bangunan bertingkat */
          set(y,(b.mid&&wy===b.mid)?b.floor:B.AIR);
          continue;
        }
        if(door){set(y,wy<2?B.AIR:b.wall);continue;}
        let id=b.wall;
        if(corner)id=b.beam;                               // tiang sudut kayu
        else if(wy===b.h-1)id=b.beam;                      // balok atas
        else if(wy===1&&(lx+lz)%2===0)id=B.AIR;            // jendela
        else if(b.mid&&wy===b.mid)id=b.beam;               // balok lantai dua
        set(y,id);
      }
    }

    /* ---------- atap ----------
       Selalu blok ROOF supaya mesher bisa membuatnya transparan saat pemain
       masuk ke dalam bangunan. */
    if(b.roof==='flat'){
      if(inside)set(rBase,B.ROOF);
    }else if(b.roof==='gable'){
      /* punggungan sejajar sisi terpanjang; tiap langkah naik satu blok */
      const along=b.w>=b.d;
      const t=along?lz:lx,span=along?b.d:b.w;
      const mid=(span-1)/2;
      const lvl=Math.max(0,Math.floor(mid-Math.abs(t-mid)));
      /* seluruh undakan diisi, bukan hanya blok teratas. Dengan satu blok
         per kolom, sisi tegak antar undakan tidak tertutup sehingga langit
         terlihat dari dalam rumah (atap "bolong"). */
      for(let k=0;k<=lvl;k++)set(rBase+k,B.ROOF);
    }else if(b.roof==='pyramid'){
      const mx=(b.w-1)/2,mz=(b.d-1)/2;
      const lvl=Math.max(0,Math.floor(Math.min(
        mx-Math.abs(lx-mx),mz-Math.abs(lz-mz))));
      for(let k=0;k<=lvl;k++)set(rBase+k,B.ROOF);
    }else if(b.roof==='crenel'){
      /* menara: lantai atap + tembok pendek berlubang di tepinya */
      if(inside){
        set(rBase,B.ROOF);
        const edge=lx===0||lx===b.w-1||lz===0||lz===b.d-1;
        if(edge&&(lx+lz)%2===0)set(rBase+1,b.wall);
      }
    }
  }

  /* jalan papan menyilang di pusat desa + halaman kerikil di persimpangan */
  if(!touched){
    const dx=Math.abs(wx-v.x),dz=Math.abs(wz-v.z);
    if((dx<=1&&dz<=v.r)||(dz<=1&&dx<=v.r)){
      if(h-1<H)data[idx(x,h-1,z)]=B.PLANK;
    }else if(dx<=4&&dz<=4){
      if(h-1<H)data[idx(x,h-1,z)]=B.STONE;
    }
  }
  return touched;
}
