'use strict';
/* Generator terrain deterministik: 6 biome, pohon, tanaman, bijih, desa */
let nH=null,nM=null,nT=null,nV=null,nMnt=null,nC=null,nI=null,nB=null,nBw=null,nRed=null,nGh=null,nTv=null;
const WGEN={
  seed:1,
  _villCache:{},       // cache hasil villageInCell per sel (gx,gz)
  init(seed){
    this.seed=seed;
    this._villCache={};this._villN=0;   // seed baru ? desa baru, buang cache
    /* memo sebaran desa (titik sel, wilayah biome, undian per wilayah) juga
       harus dibuang: semuanya bergantung pada seed lewat regionAt/hash. */
    this._vsMemo={};this._vsN=0;
    this._vrMemo={};this._vrN=0;
    this._vhMemo={};this._vhN=0;
    this._homeReg=undefined;
    this._bCache=new Map();             // seed baru ? peta biome baru
    nH=new Noise.Simplex(seed);
    nM=new Noise.Simplex(seed+101);
    nT=new Noise.Simplex(seed+877);   // suhu ? warna terrain & variasi tinggi
    nV=new Noise.Simplex(seed+1543);  // sebaran desa
    nMnt=new Noise.Simplex(seed+2024); // ketinggian pegunungan ? biome MOUNTAIN
    nC=new Noise.Simplex(seed+3311);  // benua vs laut
    nI=new Noise.Simplex(seed+4703);  // pulau di tengah laut (ukuran acak)
    nB=new Noise.Simplex(seed+6151);  // undian biome per WILAYAH (lihat regionBiome)
    nBw=new Noise.Simplex(seed+7307); // domain warp: batas biome berkelok
    nRed=new Noise.Simplex(seed+8821); // biome langka REDLANDS (tanah merah)
    nGh=new Noise.Simplex(seed+9377);  // "heat" tinggi RUMPUT DUNIA (gradasi)
    nTv=new Noise.Simplex(seed+10499); // variasi warna blok per PETAK (anti-monoton)
  },
  hash(x,z,s){const n=Math.sin(x*127.1+z*311.7+s*74.7)*43758.5453;return n-Math.floor(n);},

  /* ---------- biome ----------
     Suhu memakai noise frekuensi rendah supaya tiap biome jadi wilayah
     luas, bukan bercak kecil. Area spawn dipaksa Hutan agar pemain
     selalu mulai di lingkungan paling ramah. */
  /* Semua frekuensi noise biome dibagi 1.5 sehingga TIAP WILAYAH BIOME menjadi
     ~50% LEBIH LUAS: 0.00283 ? 0.00189 (suhu), 0.003 ? 0.002 (pegunungan),
     0.0016 ? 0.001067 (benua/laut), dan frekuensi pulau ikut dibagi 1.5.
     Suhu kini hanya dipakai untuk variasi ketinggian & bahan; PENENTU biome
     daratan adalah regionBiome() (lihat di bawah). */
  temp(wx,wz){return Noise.fbm(nT,wx*0.00189,wz*0.00189,3)*0.5+0.5;},
  /* noise ketinggian pegunungan; ambang 0.72 membuat pegunungan jadi wilayah
     yang cukup langka (hanya puncak noise tinggi yang jadi gunung) */
  mnt(wx,wz){return Noise.fbm(nMnt,wx*0.002,wz*0.002,3)*0.5+0.5;},
  /* noise biome REDLANDS (tanah merah). Frekuensi rendah agar terbentuk
     kantong-kantong wilayah, ambang tinggi (>0.80) supaya LANGKA: hanya
     ~10% daratan yang lolos jadi Tanah Merah. */
  redNoise(wx,wz){return Noise.fbm(nRed,wx*0.0016,wz*0.0016,3)*0.5+0.5;},

  /* =========================================================================
     HEAT RUMPUT DUNIA — RUMPUN LOKAL yang naik-turun sendiri
     -------------------------------------------------------------------------
     Mengembalikan 0..1: "kesuburan" rumput dunia pada kolom (wx,wz). Dipakai
     mesher untuk memilih tinggi patch rumput secara BERURUTAN (0 = gundul,
     1 = paling tinggi).

     BENTUK YANG BENAR = RUMPUN TERSEBAR, bukan gradien satu biome.
     Dunia dibagi sel GRASS_CLUMP_CELL; sebagian sel menaruh SATU RUMPUN dengan
     pusat & radius sendiri (deterministik dari indeks sel). Di dalam satu
     rumpun:
         pusat rumpun  → heat 1   → rumput PALING TINGGI
         menjauh       → heat turun bertahap
         tepi rumpun   → heat 0   → GUNDUL
     Di luar semua rumpun heat = 0, jadi ada tanah kosong sungguhan sebagai
     jeda antar rumpun. Rumpun lain di tempat lain mengulang siklus 0→tinggi→0
     nya sendiri — persis seperti rumput di dunia nyata, bukan satu biome yang
     seragam tinggi.

     CATATAN DESAIN (kesalahan versi sebelumnya): dulu heat memakai SATU medan
     fbm global. Akibatnya satu wilayah luas bernilai tinggi semua (semua rumput
     tinggi) dan wilayah lain rendah semua; "gradasi" hanya muncul sebagai efek
     samping ambang preset, sehingga di Ultra (ambang 0.14) hampir semua blok
     lolos dan rumput terlihat rata penuh tanpa gradasi. Sekarang gradasi
     melekat pada BENTUK RUMPUN, jadi tetap terlihat di semua preset.

     Rumpun bertetangga boleh bertumpuk; nilai yang dipakai adalah yang
     TERTINGGI (Math.max) supaya sambungannya mulus tanpa jahitan.

     Radius diskalakan Gfx.grassClump: preset rendah memakai rumpun lebih kecil
     (lebih banyak tanah gundul → lebih ringan) tanpa menghilangkan gradasinya.
     ========================================================================= */
  GRASS_CLUMP_CELL:20,     // satu kandidat rumpun per 20x20 blok
  GRASS_CLUMP_CHANCE:0.72, // ~72% sel benar-benar berumpun (sisanya kosong)
  /* Radius rumpun 7..14 blok. RMIN sengaja >=7: dengan 6 tingkat tinggi dan
     PEAK_GAIN di bawah, ramp membuat perubahan antar blok <= ~1 tingkat, jadi
     rumput tidak pernah melompati tingkat dan gradasinya terlihat mulus. */
  GRASS_CLUMP_RMIN:7,
  GRASS_CLUMP_RMAX:14,
  /* Pengali puncak. Tanpa ini ramp linear hanya mencapai 1.0 TEPAT di titik
     pusat, sehingga tingkat tertinggi nyaris tak pernah muncul (hanya ~1% blok)
     dan sebagian rumpun tak pernah terlihat "tinggi" sama sekali. Dengan 1.25
     nilai heat dipotong pada 1 untuk d < 0.2·r → tiap rumpun punya PUNCAK
     DATAR kecil yang benar-benar memakai varian tertinggi. */
  GRASS_CLUMP_PEAK:1.25,
  grassHeat(wx,wz){
    const S=this.GRASS_CLUMP_CELL;
    const RMIN=this.GRASS_CLUMP_RMIN,RMAX=this.GRASS_CLUMP_RMAX;
    /* skala radius dari preset grafis (default 1 = penuh) */
    const scale=(typeof Gfx!=='undefined'&&Gfx.grassClump!==undefined)?Gfx.grassClump:1;
    const gx=Math.floor(wx/S),gz=Math.floor(wz/S);
    let best=0;
    /* rumpun boleh melintasi batas sel → periksa 3x3 sel di sekitar */
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const cx=gx+dx,cz=gz+dz;
      if(this.hash(cx,cz,301)>=this.GRASS_CLUMP_CHANCE)continue;   // sel gundul
      /* pusat rumpun: titik acak di dalam sel */
      const bx=cx*S+this.hash(cx,cz,302)*S;
      const bz=cz*S+this.hash(cx,cz,303)*S;
      let r=(RMIN+this.hash(cx,cz,304)*(RMAX-RMIN))*scale;
      if(r<1)continue;
      const ddx=wx+0.5-bx,ddz=wz+0.5-bz;
      const d2=ddx*ddx+ddz*ddz;
      if(d2>=r*r*1.44)continue;                    // jelas di luar (hemat noise)
      /* tepi rumpun DIBUAT BERKELOK: radius efektif dimodulasi noise frekuensi
         rendah, jadi rumpun tidak terlihat sebagai lingkaran sempurna.
         Frekuensi kecil (0.05) → wobble berubah pelan, gradasi tetap halus. */
      const wob=0.78+0.44*(Noise.fbm(nGh,wx*0.05+cx*3.1,wz*0.05+cz*2.7,2)*0.5+0.5);
      const re=r*wob;
      const d=Math.sqrt(d2);
      if(d>=re)continue;                           // di luar rumpun → gundul
      /* ramp LINEAR dari tepi (0) ke pusat, dikali PEAK supaya bagian tengah
         rumpun mencapai 1 (puncak datar kecil) — tingkat tertinggi benar-benar
         terpakai. Pembagian tingkat tetap rata: tiap langkah blok naik paling
         banyak satu tingkat. */
      const h=(1-d/re)*this.GRASS_CLUMP_PEAK;
      if(h>best)best=h;
    }
    return clamp(best,0,1);
  },

  /* =========================================================================
     GRASSFIELD — versi BERTANDA dari grassHeat (untuk gradasi warna tanah)
     -------------------------------------------------------------------------
     grassHeat di atas dipotong pada 0 (di luar rumpun semuanya 0), jadi semua
     blok gundul warnanya sama. Padahal yang diinginkan: gradasi TERUS berjalan
     ke dalam wilayah gundul — makin JAUH dari rumput, makin murni cokelatnya.

     grassField mengembalikan nilai KONTINU yang boleh negatif:
        > 0  di dalam rumpun  (1.0+ = pusat rumput tertinggi, 0 = tepi rumpun)
        = 0  tepat di tepi rumpun
        < 0  di wilayah gundul (makin negatif = makin jauh dari rumput =
             makin murni cokelat; pusat antar-rumpun paling negatif)
     Rumusnya identik grassHeat tapi TANPA pemotongan di tepi rumpun, sehingga
     ramp linearnya lanjut ke bawah nol. Dipakai mesher untuk memilih tingkat
     warna 0..5 (cokelat murni → hijau pekat). grassHeat sendiri TIDAK diubah:
     kemunculan & tinggi bilah rumput dunia tetap seperti semula. */
  grassField(wx,wz){
    const S=this.GRASS_CLUMP_CELL;
    const RMIN=this.GRASS_CLUMP_RMIN,RMAX=this.GRASS_CLUMP_RMAX;
    const scale=(typeof Gfx!=='undefined'&&Gfx.grassClump!==undefined)?Gfx.grassClump:1;
    const gx=Math.floor(wx/S),gz=Math.floor(wz/S);
    let best=-2;                                  // default: gundul dalam
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const cx=gx+dx,cz=gz+dz;
      if(this.hash(cx,cz,301)>=this.GRASS_CLUMP_CHANCE)continue;
      const bx=cx*S+this.hash(cx,cz,302)*S;
      const bz=cz*S+this.hash(cx,cz,303)*S;
      const r=(RMIN+this.hash(cx,cz,304)*(RMAX-RMIN))*scale;
      if(r<1)continue;
      const ddx=wx+0.5-bx,ddz=wz+0.5-bz;
      const d=Math.sqrt(ddx*ddx+ddz*ddz);
      const wob=0.78+0.44*(Noise.fbm(nGh,wx*0.05+cx*3.1,wz*0.05+cz*2.7,2)*0.5+0.5);
      const re=r*wob;
      /* ramp linear: >0 di dalam, =0 di tepi, <0 di luar (lanjut ke bawah).
         Skala luar dibagi supaya gradasi cokelat tidak terlalu cepat jenuh. */
      const raw=1-d/re;
      const h=raw>=0?raw*this.GRASS_CLUMP_PEAK:raw*0.9;
      if(h>best)best=h;
    }
    return best<-2?-2:best;
  },

  /* =========================================================================
     VARIASI WARNA BLOK PER PETAK (anti-monoton)
     -------------------------------------------------------------------------
     Dulu semua blok sejenis dalam satu biome memakai warna yang sama persis
     (hanya diberi bintik acak per blok), sehingga hamparan rumput/pasir/salju
     terlihat rata & monoton. Dua medan noise di bawah dipakai mesher sebagai
     PENGALI WARNA per kolom:

       tintA  frekuensi sedang (petak ~30 blok) -> TERANG/GELAP. Inilah yang
              membuat satu wilayah rumput punya bercak hijau lebih gelap dan
              lebih terang, bukan satu nada saja.
       tintB  frekuensi rendah (petak ~90 blok) -> PERGESERAN RONA. Wilayah
              luas jadi condong ke kuning-hijau atau biru-hijau (dan setara-
              nya di biome lain), jadi dua padang rumput di tempat berbeda
              terasa beda karakter.
       tintC  frekuensi lebih tinggi (petak ~10 blok) -> khusus DAUN, supaya
              tiap pohon/rumpun pohon punya hijau sendiri.

     Semuanya deterministik dari seed (satu Simplex nTv) sehingga chunk yang
     dibangun ulang selalu mendapat warna yang sama.
     ========================================================================= */
  tintA(wx,wz){
    if(!nTv)return 0.5;
    return clamp(Noise.fbm(nTv,wx*0.032,wz*0.032,2)*0.5+0.5,0,1);
  },
  tintB(wx,wz){
    if(!nTv)return 0.5;
    return clamp(Noise.fbm(nTv,wx*0.011+37.3,wz*0.011-19.7,2)*0.5+0.5,0,1);
  },
  tintC(wx,wz){
    if(!nTv)return 0.5;
    return clamp(Noise.fbm(nTv,wx*0.090-61.1,wz*0.090+13.9,2)*0.5+0.5,0,1);
  },

  /* =========================================================================
     WILAYAH BIOME (region) � biome daratan diundi PER WILAYAH, bukan dari
     satu skala suhu
     -------------------------------------------------------------------------
     MASALAH CARA LAMA: biome daratan dipilih dari SATU nilai suhu dengan dua
     ambang (t>0.63 gurun, t<0.37 tundra, sisanya hutan). Karena suhu itu medan
     yang menerus, berpindah dari gurun ke tundra WAJIB melewati pita tengah ?
     hutan selalu jadi penyekat. Akibatnya urutannya selalu selang-seling
     (gurun ? hutan ? tundra ? hutan ? ...), gurun tidak pernah bisa langsung
     bersebelahan dengan gurun lain atau dengan tundra.

     CARA BARU: dunia dipetakan menjadi WILAYAH bergaya Voronoi (sel berjitter),
     lalu setiap wilayah MENGUNDI biome-nya sendiri secara independen. Dua
     wilayah bersebelahan bisa dapat biome sama (hutan di sebelah hutan) atau
     kombinasi apa pun (gurun langsung berbatasan tundra) � tidak ada lagi
     penyekat wajib. Batas wilayah diberi domain warp supaya berkelok organik,
     bukan garis poligon.

     Ukuran wilayah = CELL blok (jitter membuat ukuran nyatanya bervariasi).
     ========================================================================= */
  BIOME_CELL:264,          // ~176 blok versi lama � 1.5
  /* geser koordinat memakai noise ? tepi wilayah berkelok, bukan poligon */
  _warpX(wx,wz){return wx+Noise.fbm(nBw,wx*0.0019+11,wz*0.0019-7,2)*this.BIOME_CELL*0.30;},
  _warpZ(wx,wz){return wz+Noise.fbm(nBw,wx*0.0019-23,wz*0.0019+31,2)*this.BIOME_CELL*0.30;},
  /* sel wilayah terdekat (Voronoi berjitter) untuk titik (wx,wz) */
  regionAt(wx,wz){
    const S=this.BIOME_CELL;
    const px=this._warpX(wx,wz),pz=this._warpZ(wx,wz);
    const gx=Math.floor(px/S),gz=Math.floor(pz/S);
    let bx=gx,bz=gz,bd=Infinity;
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const cx=gx+dx,cz=gz+dz;
      /* pusat sel digeser acak (0.15..0.85) ? bentuk & ukuran wilayah beragam */
      const jx=(cx+0.15+0.70*this.hash(cx,cz,71))*S;
      const jz=(cz+0.15+0.70*this.hash(cx,cz,97))*S;
      const d=(px-jx)*(px-jx)+(pz-jz)*(pz-jz);
      if(d<bd){bd=d;bx=cx;bz=cz;}
    }
    return {gx:bx,gz:bz};
  },
  /* Undian biome satu wilayah.

     `r` = nilai acak per-sel. Frekuensi 7.3 per sel membuat nilai sel
     bertetangga praktis TIDAK berkorelasi, jadi wilayah sebelah bebas dapat
     biome apa pun � TERMASUK yang sama. Inilah yang menghapus pola selang-seling.

     Suhu (temp) hanya jadi BIAS LEMAH pada bobot undian, bukan penentu: daerah
     panas lebih sering (bukan selalu) gurun, daerah dingin lebih sering tundra.
     Karena biasnya lembut & undiannya independen, gurun tetap bisa langsung
     berbatasan dengan tundra maupun dengan gurun lain.

     Bobot dasar: hutan 44%, gurun 28%, tundra 28% � hutan tetap paling umum
     supaya dunia terasa ramah & pohon tidak langka. */
  regionBiome(gx,gz){
    const S=this.BIOME_CELL;
    const r=Noise.fbm(nB,gx*7.3,gz*7.3,1)*0.5+0.5;
    /* suhu di pusat wilayah ? bias iklim (satu nilai per wilayah, bukan per blok
       sehingga tidak memunculkan batas biome kedua di dalam wilayah) */
    const t=this.temp(gx*S+S*0.5,gz*S+S*0.5);
    const shift=(t-0.5)*0.60;                       // -0.30 (dingin) .. +0.30 (panas)
    let wF=0.44;
    let wD=clamp(0.28+shift*0.5,0.08,0.48);
    let wT=clamp(0.28-shift*0.5,0.08,0.48);
    const sum=wF+wD+wT;
    wF/=sum;wD/=sum;
    if(r<wF)return BIOME.FOREST;
    if(r<wF+wD)return BIOME.DESERT;
    return BIOME.TUNDRA;
  },

  /* ---------- KONTINEN / LAUT ----------
     nC = noise frekuensi sangat rendah yang menentukan mana laut & mana
     daratan. Nilai tinggi = daratan, rendah = laut. Karena frekuensinya kecil
     (0.001067), hasilnya berupa benua & pulau lebar, bukan bercak kecil.
     nI = noise frekuensi lebih tinggi yang menaikkan sebagian area laut
     menjadi PULAU dengan ukuran acak.

     Ambang:
       cont >= LAND_T            ? daratan utama
       cont <  LAND_T            ? laut, KECUALI bila island() lolos */
  LAND_T:0.50,
  cont(wx,wz){return Noise.fbm(nC,wx*0.001067,wz*0.001067,4)*0.5+0.5;},

  /* Kekuatan "pulau" pada titik laut. Memakai dua oktaf noise berbeda skala
     sehingga ukuran pulau bervariasi: ada yang kecil (beberapa blok) sampai
     yang cukup lebar (puluhan blok). Frekuensi ikut dibagi 1.5 ? pulau 50%
     lebih besar, senada dengan pelebaran biome lain. */
  island(wx,wz){
    const a=Noise.fbm(nI,wx*0.005,wz*0.005,3)*0.5+0.5;      // pulau sedang/besar
    const b=Noise.fbm(nI,wx*0.014+53,wz*0.014-29,2)*0.5+0.5; // pulau kecil
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

  /* true bila titik daratan ini bertetangga dengan laut (dipakai untuk pantai).
     Jarak periksa 3 ? 4 blok supaya pita pantai ikut melebar seiring benua
     yang kini 50% lebih besar. */
  nearOcean(wx,wz){
    return !this.isLand(wx+4,wz)||!this.isLand(wx-4,wz)||
           !this.isLand(wx,wz+4)||!this.isLand(wx,wz-4);
  },

  /* biome pada (wx,wz).
     Urutan keputusan: laut ? pantai ? pegunungan (dari medan) ? undian wilayah.
     Hasilnya di-cache karena satu kolom terrain menanyakan biome berkali-kali
     (height, treeAt, plantAt, rockAt, oreFor) dan Voronoi+warp tidak murah. */
  _bCache:new Map(),
  BCACHE_MAX:120000,
  biomeAt(wx,wz){
    const key=wx*100003+wz;
    const c=this._bCache.get(key);
    if(c!==undefined)return c;
    const b=this._biomeCalc(wx,wz);
    if(this._bCache.size>=this.BCACHE_MAX)this._bCache.clear();
    this._bCache.set(key,b);
    return b;
  },
  _biomeCalc(wx,wz){
    /* area spawn dipaksa Hutan; kotaknya ikut 50% lebih luas (24 ? 36) */
    if(Math.abs(wx)<36&&Math.abs(wz)<36)return BIOME.FOREST;
    /* laut & pantai diputuskan lebih dulu: keduanya mengabaikan undian wilayah */
    if(!this.isLand(wx,wz))return BIOME.OCEAN;
    if(this.nearOcean(wx,wz))return BIOME.BEACH;
    /* REDLANDS langka (~10%): diperiksa sebelum pegunungan & undian wilayah.
       Ambang 0.66 pada fbm ternormalisasi menghasilkan sekitar 10% daratan. */
    if(this.redNoise(wx,wz)>0.66)return BIOME.REDLANDS;
    if(this.mnt(wx,wz)>0.72)return BIOME.MOUNTAIN;
    const r=this.regionAt(wx,wz);
    return this.regionBiome(r.gx,r.gz);
  },
  /* ---------- ketinggian permukaan ----------
     Daratan berada di rentang 5..7 (SEA..7) supaya terrain berbukit tapi tidak
     pernah membentuk genangan tipis. Wilayah air (m<0.30) digali ke kedalaman
     TEPAT 3 atau 4 blok di bawah permukaan air (SEA=5) ? dasar y=2 atau y=1. */
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
    /* ---- sungai/danau: kedalaman TEPAT 3-4 blok dari permukaan air (kecuali pegunungan agar bukit utuh) ---- */
    if(m<0.30 && b!==BIOME.MOUNTAIN){
      const deep=m<0.18;
      return deep?CFG.SEA-4:CFG.SEA-3;           // y=1 (dalam 4) atau y=2 (dalam 3)
    }
    /* ---- daratan: SEA..7 (5..7) ---- */
    let h=CFG.SEA+Math.round(t*(7-CFG.SEA));     // 5..7
    if(m>0.75)h=Math.max(h,6);                   // dataran tinggi
    if(b===BIOME.DESERT)h=clamp(h-(this.hash(wx,wz,21)<0.5?1:0),CFG.SEA,6);
    if(b===BIOME.TUNDRA&&m>0.55)h=Math.min(7,h+1);
    /* ---- PEGUNUNGAN: gundukan seperti bukit secara smooth (rentang 6..12) ---- */
    if(b===BIOME.MOUNTAIN){
      const mVal=this.mnt(wx,wz);
      const mBorder=clamp((mVal-0.72)/0.08,0,1);
      const mSmooth=mBorder*mBorder*(3-2*mBorder);
      const hillRaw=Noise.fbm(nMnt,wx*0.016+120.5,wz*0.016-80.3,2)*0.5+0.5;
      const hillDome=Math.pow(clamp(hillRaw,0,1),1.25);
      const hillAdd=mSmooth*(1.0+hillDome*5.2);
      h=Math.round(6+hillAdd);
      return clamp(h,CFG.SEA,13);
    }
    return clamp(h,CFG.SEA,7);
  },
  /* Deteksi bagian atas bukit pegunungan yang berumput (area dibuat kecil & terfokus di puncak gundukan) */
  mountainHillDome(wx,wz){
    const hillRaw=Noise.fbm(nMnt,wx*0.016+120.5,wz*0.016-80.3,2)*0.5+0.5;
    return Math.pow(clamp(hillRaw,0,1),1.25);
  },
  isMountainHillTop(wx,wz,h){
    if(this.biomeAt(wx,wz)!==BIOME.MOUNTAIN)return false;
    const ch=(h!==undefined)?h:this.height(wx,wz);
    return ch>=11 || (ch>=10 && this.mountainHillDome(wx,wz)>0.65);
  },
  treeAt(wx,wz,h){
    if(h<CFG.SEA)return false;                      // tidak tumbuh di air
    if(Math.abs(wx)<2&&Math.abs(wz)<2)return false; // area spawn bersih
    const bio=this.biomeAt(wx,wz);
    /* Pohon di biome gunung HANYA tumbuh di area rumput saja (di bukit paling tinggi) */
    if(bio===BIOME.MOUNTAIN && !this.isMountainHillTop(wx,wz,h))return false;
    const dens=(bio===BIOME.MOUNTAIN)?0.35:BIOME_INFO[bio].tree;
    const m=Noise.fbm(nM,wx*0.05,wz*0.05,2)*0.5+0.5;
    return this.hash(wx,wz,1)<(m>0.45?0.055:0.013)*dens;
  },
  /* ---------- RUMPUN TEBU ----------
     Dulu tebu (waktu itu masih bambu) dipilih dari noise patch
     (`bam>0.70 && r<0.16`). Cara itu membuat SELURUH wilayah noise jadi hutan
     tebu: sekali menemukannya, ada puluhan batang sekaligus di area luas.

     Sekarang dipakai RUMPUN eksplisit: dunia dibagi sel `CANE_CELL`, hanya
     sebagian sel yang berumpun, dan tiap rumpun hanya berisi 1-5 batang di
     sekitar satu titik pusat. Semuanya deterministik dari indeks sel sehingga
     chunk mana pun menghasilkan rumpun yang sama tanpa state global.

     Sel tetangga ikut diperiksa karena rumpun boleh melintasi batas sel. */
  CANE_CELL:26,            // satu kandidat rumpun per 26x26 blok
  CANE_SPREAD:2,           // simpangan maksimum batang dari pusat rumpun
  caneAt(wx,wz){
    const S=this.CANE_CELL,R=this.CANE_SPREAD;
    const gx=Math.floor(wx/S),gz=Math.floor(wz/S);
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const cx=gx+dx,cz=gz+dz;
      /* hanya ~50% sel yang benar-benar berumpun ? tebu jadi jarang */
      if(this.hash(cx,cz,151)>=0.5)continue;
      const bx=cx*S+Math.floor(this.hash(cx,cz,152)*S);
      const bz=cz*S+Math.floor(this.hash(cx,cz,153)*S);
      /* lewati cepat bila titik ini di luar jangkauan rumpun (hemat hash) */
      if(Math.abs(bx-wx)>R||Math.abs(bz-wz)>R)continue;
      const n=1+Math.floor(this.hash(cx,cz,154)*5);        // 1..5 batang
      for(let i=0;i<n;i++){
        const mx=bx+Math.round((this.hash(cx+i*7,cz-i*3,155)-0.5)*2*R);
        const mz=bz+Math.round((this.hash(cx-i*5,cz+i*11,156)-0.5)*2*R);
        if(mx===wx&&mz===wz)return true;
      }
    }
    return false;
  },

  /* ---------- RUMPUN RUMPUT ----------
     Rumput utama (tipe 1) tumbuh BERKELOMPOK 5-20 helai per rumpun, TIDAK
     berdempetan. Sistemnya sama seperti rumpun tebu: dunia dibagi sel
     GRASS_CELL, sebagian sel berumpun, tiap rumpun menaburkan beberapa titik
     rumput di sekitar pusatnya dengan jarak minimum antar titik. */
  GRASS_CELL:14,           // satu kandidat rumpun per 14x14 blok
  GRASS_SPREAD:6,          // radius sebaran titik dari pusat rumpun
  grassAt(wx,wz){
    const S=this.GRASS_CELL,R=this.GRASS_SPREAD;
    const gx=Math.floor(wx/S),gz=Math.floor(wz/S);
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const cx=gx+dx,cz=gz+dz;
      /* ~55% sel berumpun */
      if(this.hash(cx,cz,201)>=0.55)continue;
      const bx=cx*S+Math.floor(this.hash(cx,cz,202)*S);
      const bz=cz*S+Math.floor(this.hash(cx,cz,203)*S);
      if(Math.abs(bx-wx)>R||Math.abs(bz-wz)>R)continue;
      /* 5-20 helai per rumpun */
      const n=5+Math.floor(this.hash(cx,cz,204)*16);
      for(let i=0;i<n;i++){
        /* titik disebar melingkar; jarak dari pusat 1..R supaya tidak menumpuk
           di satu blok (grid integer + langkah minimal 1 = tak berdempetan) */
        const a=this.hash(cx+i*7,cz-i*3,205)*6.2832;
        const rr=1+Math.floor(this.hash(cx-i*5,cz+i*11,206)*R);
        const mx=bx+Math.round(Math.cos(a)*rr);
        const mz=bz+Math.round(Math.sin(a)*rr);
        if(mx===wx&&mz===wz)return true;
      }
    }
    return false;
  },

  /* ---------- jenis tanaman permukaan ----------
     Tipe 1-6 = billboard cross-quad (tile atlas). Tipe 7-10 = MODEL VOXEL
     (js/environment/env_plants.js, dirakit ke mesh chunk oleh js/mesher.js):
       7  semak beri  � hutan & TANAH MERAH. Satu-satunya sumber beri.
       8  kaktus      � gurun.
       9  tebu        � hutan, dalam rumpun kecil 1-5 batang (lihat caneAt).
       10 tulip       � hutan (ladang bunga).
     Semak beri & tebu sengaja dibuat LANGKA (masing-masing di bawah 1% petak)
     supaya tidak memenuhi hutan; keduanya dulu jauh terlalu sering muncul.

     JAMUR (tipe 5) hanya muncul DI BAWAH POHON dengan peluang MUSH_CHANCE —
     diputuskan saat pohon ditanam di genChunk (bukan di sini), lihat argumen
     `underTree`. */
  /* Peluang jamur di kolom yang bernaung pohon. Dulu 10% dan itu terasa seperti
     spam: hampir setiap pohon dikelilingi jamur karena SETIAP kolom dalam
     radius 2 dari pohon mana pun ikut diundi. Sekarang 4%. */
  MUSH_CHANCE:0.04,
  plantAt(wx,wz,underTree){
    const b=this.biomeAt(wx,wz);
    const r=this.hash(wx,wz,2);
    /* laut: tidak ada tanaman permukaan */
    if(b===BIOME.OCEAN)return 0;
    /* pantai: hanya rumput pantai yang sangat jarang */
    if(b===BIOME.BEACH)return r<0.03?1:0;
    /* gurun: kaktus voxel saja. RUMPUT (tipe 1) TIDAK tumbuh di gurun —
       gurun adalah padang pasir kering, rumput di sana terlihat salah tempat.
       World grass dekoratif juga tidak menyentuh gurun (mesher hanya menumbuhkan
       di FOREST & REDLANDS). */
    if(b===BIOME.DESERT){
      if(r<0.022)return 8;                       // kaktus
      return 0;
    }
    /* REDLANDS: rumput utama (voxel merah) berumpun + semak beri langka.
       Tumbuhan merah cross-quad LAMA (tipe 6) DIHAPUS — sekarang tanahnya sudah
       ditutupi WORLD GRASS merah oleh mesher, jadi grass cross itu berlebihan &
       terlihat kuno. */
    if(b===BIOME.REDLANDS){
      if(underTree&&this.hash(wx,wz,7)<this.MUSH_CHANCE)return 5; // jamur di bawah pohon
      if(r<0.008)return 7;                       // semak beri (langka)
      if(this.grassAt(wx,wz))return 1;           // rumpun rumput (voxel)
      return 0;
    }
    /* tundra: rumput jarang + jamur salju (di bawah pohon) */
    if(b===BIOME.TUNDRA){
      if(underTree&&this.hash(wx,wz,7)<this.MUSH_CHANCE)return 5;
      if(r<0.05)return 1;
      return 0;
    }
    /* pegunungan: di puncak bukit berumput ada rumpun rumput & bunga alpine langka */
    if(b===BIOME.MOUNTAIN){
      if(this.isMountainHillTop(wx,wz)){
        if(underTree&&this.hash(wx,wz,7)<this.MUSH_CHANCE)return 5;
        if(r<0.035)return 2; // bunga alpine langka
        if(this.grassAt(wx,wz))return 1; // rumpun rumput
      }
      return 0;
    }
    /* ---- HUTAN ----
       Jamur HANYA di bawah pohon (peluang MUSH_CHANCE), diputuskan di genChunk.
       Rumpun tebu diperiksa lebih dulu karena posisinya ditentukan sistem
       rumpun sendiri, bukan oleh undian `r`. */
    if(underTree&&this.hash(wx,wz,7)<this.MUSH_CHANCE)return 5;  // jamur di bawah pohon
    if(this.caneAt(wx,wz))return 9;                            // rumpun tebu
    /* ladang bunga mengelompok. Peluang dikurangi 30% (r<0.34 ? r<0.238) supaya
       bunga tidak terlalu ramai. */
    const patch=Noise.fbm(nM,wx*0.09+41,wz*0.09-17,2)*0.5+0.5;
    if(patch>0.66&&r<0.238){
      /* di dalam ladang bunga, sebagian jadi tulip voxel */
      if(this.hash(wx,wz,8)<0.30)return 10;                    // tulip
      return this.hash(wx,wz,3)<0.5?2:3;                       // bunga voxel
    }
    /* rumput utama berkelompok (menggantikan sebaran acak `r<0.22`) */
    if(this.grassAt(wx,wz))return 1;             // rumpun rumput 5-20 helai
    /* bunga TERSEBAR: pita sempit ~2.1% (dulu 3%, dikurangi 30%). Karena rumput
       tidak lagi memakai rentang r rendah, pita ini dimulai dari 0. */
    if(r<0.021)return this.hash(wx,wz,3)<0.5?2:3;// bunga tersebar (-30%)
    if(r<0.029)return 7;                         // semak beri (voxel, langka)
    if(r<0.044)return 10;                        // tulip tersebar
    return 0;
  },
  /* ---------- bongkahan batu / bijih ----------
     DINONAKTIFKAN: bongkahan batu polos bawaan (rockAt) dihapus total sesuai
     permintaan desain — satu-satunya sumber tambang permukaan kini adalah
     NODE ORE otentik dari Ore.html (lihat oreNodeAt). rockAt mengembalikan 0
     sehingga tidak ada lagi gundukan batu B.STONE yang tersebar di dunia. */
  rockAt(wx,wz,h){
    return 0;
  },

  /* =========================================================================
     BENTUK BONGKAHAN BATU — 4 varian, diundi per bongkahan
     -------------------------------------------------------------------------
     Dulu SEMUA bongkahan memakai satu rumus (`dist+dy<rh`) sehingga bentuknya
     identik: piramida diamond 3x3. Sekarang tiap bongkahan mengundi salah satu
     dari 4 arketipe, dan dua di antaranya masih diacak lagi per kolom:

       0 KLASIK    kerucut diamond 3x3 (bentuk lama, tetap ada)
       1 PILAR     inti menjulang tinggi + kaki rendah di sekelilingnya
       2 GUNDUKAN  lebar 5x5 tapi pipih, seperti batu terpendam
       3 BERGERIGI 5x5 tak beraturan: sebagian kolom tepi dibuang & sebagian
                   kolom mendapat tonjolan +1 → siluetnya kasar/pecah

     rockH() mengembalikan TINGGI KOLOM batu pada offset (dx,dz) dari pusat
     (0 = kolom kosong). Satu fungsi ini dipakai dua tempat:
       · genChunk  → membangun bloknya,
       · plantBlockedByRock → mencegah tanaman tumbuh DI DALAM bongkahan.
     Keduanya wajib memakai fungsi yang sama supaya tidak pernah beda pendapat.
     ========================================================================= */
  ROCK_KINDS:4,
  rockKind(wx,wz){return (this.hash(wx,wz,34)*this.ROCK_KINDS)|0;},
  /* radius horizontal maksimum bongkahan per bentuk */
  rockR(kind){return (kind===2||kind===3)?2:1;},
  rockH(wx,wz,rh,kind,dx,dz){
    const dist=Math.abs(dx)+Math.abs(dz);
    if(kind===1){                                  // PILAR
      if(dist===0)return rh+2;
      if(dist===1)return Math.max(1,rh-1);
      return 0;
    }
    if(kind===2){                                  // GUNDUKAN lebar & pipih
      if(dist>2)return 0;
      return Math.max(1,rh-dist);
    }
    if(kind===3){                                  // BERGERIGI tak beraturan
      if(dist>2)return 0;
      if(dist===2&&this.hash(wx+dx*13,wz+dz*7,35)<0.55)return 0;
      const bump=this.hash(wx+dx*5,wz+dz*11,36)<0.30?1:0;
      return Math.max(1,rh-dist+bump);
    }
    return Math.max(0,rh-dist);                    // KLASIK: kerucut diamond
  },
  /* peluang sebuah blok bongkahan menjadi bijih. Diundi PER BONGKAHAN supaya
     ada bongkahan yang kaya bijih & ada yang hampir semuanya batu — dulu semua
     memakai 0.28 yang sama. */
  rockOreChance(wx,wz){return 0.12+this.hash(wx,wz,37)*0.34;},

  /* true bila kolom (wx,wz) berada DI DALAM bongkahan batu milik kolom lain di
     sekitarnya. Dipakai genChunk agar kaktus/rumput/bunga tidak tumbuh menembus
     batu: dulu hanya kolom PUSAT bongkahan yang ditandai terpakai, sehingga
     tanaman di kolom tetangga tetap ditanam lalu tertanam di dalam batu.
     Radius pindai 2 = rockR maksimum. */
  plantBlockedByRock(wx,wz){
    /* kolom bagian NODE ORE permukaan juga menolak tanaman */
    for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
      if(this.oreNodeAt(wx+dx,wz+dz))return true;
    }
    for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
      if(dx===0&&dz===0)continue;                  // kolom sendiri diurus caller
      const ox=wx+dx,oz=wz+dz;
      const oh=this.height(ox,oz);
      const rh=this.rockAt(ox,oz,oh);
      if(!rh)continue;
      const kind=this.rockKind(ox,oz);
      if(Math.abs(dx)>this.rockR(kind)||Math.abs(dz)>this.rockR(kind))continue;
      /* offset kolom ini RELATIF pusat bongkahan = (-dx,-dz) */
      if(this.rockH(ox,oz,rh,kind,-dx,-dz)>0)return true;
    }
    return false;
  },
  /* ---------- bijih ----------
     Ore kini HANYA muncul di permukaan sebagai NODE TUNGGAL (lihat
     oreNodeAt di bawah) — tidak lagi sebagai urat bawah tanah maupun
     campuran di bongkahan batu. oreFor tetap dipakai pickOre. */
  oreFor(wx,wz){return BIOME_INFO[this.biomeAt(wx,wz)].ore;},
  /* ---------- DISTRIBUSI JENIS ORE (port NEW MODEL/ore.html) ----------
     Aturan distribusi:
     - 1 buah ore di permukaan per node.
     - ORE LEVEL RENDAH bersifat GLOBAL: Batu, Batu Bara & Tembaga SELALU
       bermunculan di SEMUA biome (34% jatah tetap) — walaupun berada di
       biome tier tinggi seperti Pegunungan / Tanah Merah, sehingga
       Penambangan awal tetap bisa dilatih di mana pun.
         Batu 13.6% · Batu Bara 11.9% · Tembaga 8.5%  (di setiap biome)
     - Sisa 66% diisi ore KHAS biome (dinormalisasi):
       Mountain  : Kristal 26.4 · Tungsten 16.5 · B.Tungsten 13.2 · Emas 5.3 · Baja 4.6
       Redlands  : Tungsten 26.4 · B.Tungsten 19.8 · Baja 13.2 · Besi 6.6
       Tundra    : Kristal 23.1 · Baja 16.5 · Besi 14.5 · Tungsten 11.9
       Desert    : Emas 26.4 · Besi 21.1 · Baja 10.6 · Tembaga 7.9
       Forest    : Besi 27.7 · Batu Bara 11.9 · Batu 9.9 · Tembaga 11.2 · Emas 9.3
       Beach/dll : Batu 29.7 · Batu Bara 19.8 · Tembaga 16.5
     - Kemunculan node dikendalikan ORE_NODE_CHANCE (lihat oreNodeAt). */
  pickOre(wx,wz,y,bi){
    const bio=(bi===undefined)?this.biomeAt(wx,wz):bi;
    const h=this.hash(wx,wz+y*97,55);

    /* ---------- BASE GLOBAL: ore rendah di SEMUA biome (34%) ---------- */
    if(h<0.34){
      if(h<0.136)return B.ORE_STONE;           // 13.6% Batu
      if(h<0.255)return B.ORE_COAL;            // 11.9% Batu Bara
      return B.ORE_COPPER;                     // 8.5% Tembaga
    }
    /* sisa 66% = ore khas biome (t = 0..1) */
    const t=(h-0.34)/0.66;

    /* MOUNTAIN (Pegunungan, Lv 50-75): Rarity TINGGI mendominasi */
    if(bio===BIOME.MOUNTAIN){
      if(t<0.40)return B.ORE_CRYSTAL;          // 26.4% Kristal Beku
      if(t<0.65)return B.ORE_TUNGSTEN;         // 16.5% Tungsten
      if(t<0.85)return B.ORE_TUNGSTENSTEEL;    // 13.2% Baja Tungsten
      if(t<0.93)return B.ORE_GOLD;             // 5.3% Emas
      return B.ORE_STEEL;                      // 4.6% Baja
    }

    /* REDLANDS (Tanah Merah, Lv 30-50, Keras & Beracun): */
    if(bio===BIOME.REDLANDS){
      if(t<0.40)return B.ORE_TUNGSTEN;         // 26.4% Tungsten
      if(t<0.70)return B.ORE_TUNGSTENSTEEL;    // 19.8% Baja Tungsten
      if(t<0.90)return B.ORE_STEEL;            // 13.2% Baja
      return B.ORE_IRON;                       // 6.6% Besi
    }

    /* TUNDRA (Tundra Salju): */
    if(bio===BIOME.TUNDRA){
      if(t<0.35)return B.ORE_CRYSTAL;          // 23.1% Kristal Beku
      if(t<0.60)return B.ORE_STEEL;            // 16.5% Baja
      if(t<0.82)return B.ORE_IRON;             // 14.5% Besi
      return B.ORE_TUNGSTEN;                   // 11.9% Tungsten
    }

    /* DESERT (Gurun Pasir, Lv 20-30): */
    if(bio===BIOME.DESERT){
      if(t<0.40)return B.ORE_GOLD;             // 26.4% Emas
      if(t<0.72)return B.ORE_IRON;             // 21.1% Besi
      if(t<0.88)return B.ORE_STEEL;            // 10.6% Baja
      return B.ORE_COPPER;                     // 7.9% Tembaga
    }

    /* FOREST (Hutan Rimba, Zona Awal): rendah + Besi mendominasi */
    if(bio===BIOME.FOREST){
      if(t<0.42)return B.ORE_IRON;             // 27.7% Besi
      if(t<0.60)return B.ORE_COAL;             // 11.9% Batu Bara
      if(t<0.75)return B.ORE_STONE;            // 9.9% Batu
      if(t<0.92)return B.ORE_COPPER;           // 11.2% Tembaga
      return B.ORE_GOLD;                       // 9.3% Emas
    }

    /* BEACH / LAINNYA: */
    if(t<0.45)return B.ORE_STONE;              // 29.7% Batu
    if(t<0.75)return B.ORE_COAL;               // 19.8% Batu Bara
    return B.ORE_COPPER;                       // 16.5% Tembaga
  },
  oreRoll(wx,wz,y){
    /* (tidak dipakai lagi — ore kini hanya node permukaan) */
    const v=Noise.fbm(nM,wx*0.16+7,wz*0.16-3,2)*0.5+0.5;
    const base=y<=0?0.16:0.09;
    return v>0.6&&this.hash(wx,wz+y*57,31)<base;
  },

  /* =======================================================================
     NODE ORE PERMUKAAN — satu bongkahan ore per area (port NEW MODEL/ore.html)
     -----------------------------------------------------------------------
     Aturan (permintaan desain):
       · Ore TIDAK lagi berupa tumpukan blok kubus — melainkan 1 buah bongkahan
         utuh dari Ore.html yang duduk tepat di permukaan tanah.
       · SATU node per sel grid (hanya 1 koordinat tunggal).
       · Tidak ada tumpukan blok kubus alas / core 2 lantai.
     ======================================================================= */
  ORE_NODE_CELL:26, ORE_NODE_CHANCE:0.75,
  /* true bila area 4x4 di sekitar (wx,wz) cukup DATAR. Terrain voxel Forecraft
     bergelombang halus ±1 blok antar kolom berdekatan, sehingga toleransi 0
     terlalu ketat (biome gurun & hutan nyaris tak pernah lolos → ore tak pernah
     muncul). Toleransi 1 blok membuat ~90% area tiap biome lolos sekaligus
     tetap menjamin bongkahan menapak (perbedaan tinggi ≤1 blok masih dalam
     jangkauan alas bongkahan yang grounded). Mengembalikan ketinggian DASAR
     (min) area supaya node bisa diletakkan menapak titik tertinggi. */
  ORE_FLAT_TOL:1,
  /* Mengembalikan ketinggian DASAR (MINIMUM) area 4x4 bila cukup datar,
     atau false bila terlalu miring. Dipakai sebagai referensi flattening. */
  oreFlatBase(wx,wz){
    const h=this.height(wx,wz);
    let mn=h,mx=h;
    for(let dz=-2;dz<=1;dz++)for(let dx=-2;dx<=1;dx++){
      const hh=this.height(wx+dx,wz+dz);
      if(hh<mn)mn=hh; if(hh>mx)mx=hh;
      if(mx-mn>this.ORE_FLAT_TOL)return false;
    }
    return mn;
  },
  oreFlatOK(wx,wz){return this.oreFlatBase(wx,wz)!==false;},
  /* ========================================================================
     NODE ORE PERMUKAAN — 1 bongkahan per lokasi, dengan FLATTENING 4x4
     ------------------------------------------------------------------------
     Mekanisme baru (permintaan desain):
       · Ore BATU (basic) dibuat JAUH LEBIH BANYAK di semua biome — sel node
         diperkecil (14 blok) & peluang dinaikkan (0.9).
       · Syarat "harus sudah datar" DIHAPUS. Sebagai gantinya, saat ore spawn
         di blok 1 lalu di sekitarnya ada tanjakan/curam, area 4x4 sebesar ore
         akan DIRATAKAN (flattening) ke tinggi dasar — dengan tetap memakai
         blok permukaan biome yang SESUAI (rumput tetap rumput, pasir tetap
         pasir) agar warna ground konsisten. Ini mengatasi dua hal sekaligus:
         bongkahan selalu menapak penuh + ore bisa spawn jauh lebih banyak.
       · DILARANG spawn di dalam bangunan (desa/dungeon) maupun menembus pohon.
     ======================================================================== */
  /* Kemunculan node dikurangi 30% dari 0.95 → 0.665 (permintaan balance:
     ore tetap tersebar di semua biome, tetapi tidak lagi terlalu rapat). */
  ORE_NODE_CELL:11, ORE_NODE_CHANCE:0.665,
  /* Pusat node ore untuk sel grid (nx,nz), atau null. Deterministik per sel. */
  _oreCellCenter(cx,cz){
    const S=this.ORE_NODE_CELL;
    if(this.hash(cx,cz,401)>=this.ORE_NODE_CHANCE)return null;
    return {
      x:cx*S+3+((this.hash(cx,cz,403)*(S-6))|0),
      z:cz*S+3+((this.hash(cx,cz,405)*(S-6))|0)
    };
  },
  oreNodeAt(wx,wz){
    const S=this.ORE_NODE_CELL;
    const cx=Math.floor(wx/S),cz=Math.floor(wz/S);
    const c=this._oreCellCenter(cx,cz);
    if(!c)return null;
    if(wx!==c.x||wz!==c.z)return null;          // HANYA 1 TITIK TUNGGAL!
    return this._oreNodeData(c.x,c.z);
  },
  /* Bangun data node ore di titik pusat (nx,nz). Dipakai oreNodeAt &
     oreNodeNear. Mengembalikan null bila lokasi terlarang. */
  _oreNodeData(nx,nz){
    const bio=this.biomeAt(nx,nz);
    if(bio===BIOME.OCEAN||bio===BIOME.BEACH)return null;
    const hP=this.height(nx,nz);
    if(hP<CFG.SEA)return null; // Titik pusat harus di atas permukaan air

    /* Pastikan seluruh footprint 4x4 berada di daratan kering (bukan air / sungai / danau / laut / pantai) */
    let baseY=hP;
    for(let dz=-2;dz<=1;dz++)for(let dx=-2;dx<=1;dx++){
      const colX=nx+dx,colZ=nz+dz;
      const b=this.biomeAt(colX,colZ);
      if(b===BIOME.OCEAN||b===BIOME.BEACH)return null;
      const hh=this.height(colX,colZ);
      if(hh<CFG.SEA)return null; // Di bawah permukaan air (palung sungai / danau) -> tolak!
      if(hh<baseY)baseY=hh;
    }
    if(baseY<CFG.SEA)return null;

    /* JANGAN di dalam bangunan: desa & dungeon (radius +margin footprint 3) */
    for(const v of this.villagesNear(nx,nz))
      if(Math.max(Math.abs(nx-v.x),Math.abs(nz-v.z))<=v.r+3)return null;
    if(this.dungeonsNear)
      for(const d of this.dungeonsNear(nx,nz))
        if(Math.max(Math.abs(nx-d.x),Math.abs(nz-d.z))<=d.r+3)return null;
    /* JANGAN menembus pohon: periksa seluruh footprint 4x4, bukan hanya pusat.
       treeAt deterministik per kolom, jadi aman diuji tanpa data chunk. */
    for(let dz=-2;dz<=1;dz++)for(let dx=-2;dx<=1;dx++){
      const tx=nx+dx,tz=nz+dz,th=this.height(tx,tz);
      if(this.treeAt(tx,tz,th))return null;
    }
    const ore=this.pickOre(nx,nz,1,bio);
    /* UKURAN NODE: besar = peluang 20% (kurang 20% dari node normal).
       Ore besar memakai mesh bongkahan raksasa (scale 1.5x) + collision
       lebih lebar/tinggi + HASIL PANEN jauh lebih banyak (ORE_LOOT.b). */
    const big=this.hash(nx,nz,409)<0.20;
    return {baseY,ore,big};
  },
  /* Mengembalikan node ore yang FOOTPRINT 4x4-nya mencakup kolom (wx,wz),
     beserta baseY flattening-nya. Dipakai genChunk untuk meratakan tanah di
     sekitar bongkahan (bukan hanya kolom pusat). Memindai sel node tetangga
     karena footprint 4x4 bisa melampaui batas sel grid. */
  oreNodeNear(wx,wz){
    const S=this.ORE_NODE_CELL;
    const cx=Math.floor(wx/S),cz=Math.floor(wz/S);
    let best=null,bd=Infinity;
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const c=this._oreCellCenter(cx+dx,cz+dz);
      if(!c)continue;
      /* kolom ini harus berada di dalam footprint 4x4 node (offset -2..+1) */
      const ox=wx-c.x,oz=wz-c.z;
      if(ox<-2||ox>1||oz<-2||oz>1)continue;
      const d=Math.max(Math.abs(ox+0.5),Math.abs(oz+0.5));
      if(d<bd){
        const node=this._oreNodeData(c.x,c.z);
        if(node){bd=d;best={node,cx:c.x,cz:c.z,center:(ox===0&&oz===0)};}
      }
    }
    return best;
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
       buildingAt?villagesNear dari updateRoof) dan housePlan() cukup mahal;
       tanpa cache, housePlan dijalankan ulang setiap frame ? lag. */
    const key=gx+','+gz;
    if(Object.prototype.hasOwnProperty.call(this._villCache,key))
      return this._villCache[key];
    if(this._villN>800){this._villCache={};this._villN=0;}   // batas memori
    const G=this.VILLAGE_GRID;
    const home=(gx===0&&gz===0);
    let v=null;
    if(home||this.villageCellOK(gx,gz)){
      /* Gunakan titik kandidat daratan dari villageCellSpot */
      const spot=this.villageCellSpot(gx,gz);
      if(spot!==null){
        const cx=spot.x,cz=spot.z;
        v={x:cx,z:cz,biome:this.biomeAt(cx,cz),r:26};
        v.plan=housePlan(v,gx,gz);
        v.farms=farmPlan(v);
        v.houses=v.plan.length;
      }
    }
    this._villCache[key]=v;this._villN=(this._villN||0)+1;
    return v;
  },

  /* =========================================================================
     SEL DESA — PELUANG 30% PER WILAYAH BIOME & JEDA MINIMAL SATU WILAYAH
     -------------------------------------------------------------------------
     Dulu: `Noise.fbm(nV,gx*1.7,gz*1.7,1)*0.5+0.5>=0.55` — noise halus dengan
     ambang 0.55, sehingga ±45% sel berdesa DAN sel-sel bertetangga cenderung
     lolos bersamaan (noise berkorelasi), membuat desa terasa berjejer.

     Sekarang undiannya dipindah ke tingkat WILAYAH BIOME, bukan sel:

       1. Tiap WILAYAH BIOME (Voronoi regionAt, ±264 blok) diundi
          VILLAGE_CHANCE (30%) apakah ia berpenduduk. Undian memakai hash indeks
          wilayah, jadi satu wilayah selalu memberi jawaban yang sama.
       2. Satu wilayah berpenduduk memuat TEPAT SATU desa: sel desa (96 blok)
          yang titiknya jatuh di wilayah itu dipilih satu — yang urutannya
          paling awal. Otomatis tidak ada dua desa dalam satu wilayah.
       3. JEDA MINIMAL SATU WILAYAH: bila ada wilayah BERSEBELAHAN yang juga
          berpenduduk, salah satunya dibatalkan (yang indeksnya lebih akhir).
          Jadi dua desa selalu dipisahkan minimal satu wilayah biome kosong.

     Hasilnya: peluang 30% benar-benar per biome seperti diminta, dan jarak
     antar desa tidak pernah kurang dari lebar satu wilayah biome.

     PENTING — anti-rekursi: seluruh pemeriksaan hanya memakai fungsi murni
     (hash, regionAt, villageSpotOK). villageInCell TIDAK dipanggil dari sini,
     karena itu akan saling memanggil tanpa henti.
     ========================================================================= */
  VILLAGE_CHANCE:0.80,     // peluang satu WILAYAH BIOME berpenduduk (permintaan pemain: 80%)
  VILL_SCAN:4,             // radius sapuan sel saat mencari sel milik wilayah
  _vsMemo:{},_vrMemo:{},_vhMemo:{},
  /* titik desa yang akan dipakai sel ini; null bila semua kandidatnya jatuh di
     laut/pantai. Ringan (tidak membangun housePlan) & dimemo. */
  villageCellSpot(gx,gz){
    const k=gx+','+gz;
    if(Object.prototype.hasOwnProperty.call(this._vsMemo,k))return this._vsMemo[k];
    if(this._vsN>4000){this._vsMemo={};this._vsN=0;}
    const G=this.VILLAGE_GRID,home=(gx===0&&gz===0),R=26;
    let out=null;
    /* sel spawn mencoba titik tetap (34, 30) terlebih dahulu; bila terkena air/pantai
       ia mencari kandidat daratan lain di sel tersebut agar desa awal selalu terbentuk */
    if(home&&this.villageSpotOK(34,30,R))out={x:34,z:30};
    else{
      for(let i=0;i<20;i++){
        const ox=Math.floor(this.hash(gx,gz,71+i*13)*(G-52))+26;
        const oz=Math.floor(this.hash(gx,gz,73+i*17)*(G-52))+26;
        const tx=gx*G+ox,tz=gz*G+oz;
        if(this.villageSpotOK(tx,tz,R)){out={x:tx,z:tz};break;}
      }
      /* FALLBACK terakhir (kebanyakan untuk sel spawn di pulau kecil):
         radius diperketat 16 blok & pantai diizinkan, asal TETAP daratan.
         Desa di pulau kecil lebih baik daripada pemain tanpa desa sama sekali. */
      if(!out&&home){
        for(let i=0;i<20;i++){
          const ox=Math.floor(this.hash(gx,gz,71+i*13)*(G-52))+26;
          const oz=Math.floor(this.hash(gx,gz,73+i*17)*(G-52))+26;
          if(this.isLand(ox,oz)&&this.isLand(ox-10,oz)&&this.isLand(ox+10,oz)&&
             this.isLand(ox,oz-10)&&this.isLand(ox,oz+10)){
            out={x:ox,z:oz};break;
          }
        }
        /* FALLBACK lintas-sel: sel spawn benar-benar lautan (kasus ekstrem) →
           pakai sel tetangga yang punya daratan agar pemain tetap lahir dekat desa */
        if(!out){
          for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){
            const ngx=gx+dx,ngz=gz+dz;
            for(let i=0;i<20;i++){
              const ox=Math.floor(this.hash(ngx,ngz,71+i*13)*(G-52))+26;
              const oz=Math.floor(this.hash(ngx,ngz,73+i*17)*(G-52))+26;
              const tx=ngx*G+ox,tz=ngz*G+oz;
              if(this.villageSpotOK(tx,tz,26)){out={x:tx,z:tz};break;}
            }
            if(out)break;
          }
        }
      }
    }
    this._vsMemo[k]=out;this._vsN=(this._vsN||0)+1;
    return out;
  },
  /* wilayah biome tempat titik desa sel ini berada (null bila sel tak layak) */
  villageRegion(gx,gz){
    const k=gx+','+gz;
    if(Object.prototype.hasOwnProperty.call(this._vrMemo,k))return this._vrMemo[k];
    if(this._vrN>4000){this._vrMemo={};this._vrN=0;}
    const s=this.villageCellSpot(gx,gz);
    const out=s?this.regionAt(s.x,s.z):null;
    this._vrMemo[k]=out;this._vrN=(this._vrN||0)+1;
    return out;
  },
  /* wilayah biome tempat desa SPAWN berada. Desa spawn selalu ada (pemain harus
     punya desa awal), jadi wilayahnya WAJIB dianggap berpenduduk — kalau tidak,
     wilayah di sebelahnya bisa ikut berdesa dan aturan "jeda 1 wilayah" bocor
     tepat di sekitar titik awal. */
  homeRegion(){
    if(this._homeReg===undefined)this._homeReg=this.villageRegion(0,0);
    return this._homeReg;
  },
  /* apakah WILAYAH biome (rx,rz) berpenduduk? undian VILLAGE_CHANCE per wilayah */
  regionHasVillage(rx,rz){
    const k=rx+','+rz;
    if(Object.prototype.hasOwnProperty.call(this._vhMemo,k))return this._vhMemo[k];
    if(this._vhN>4000){this._vhMemo={};this._vhN=0;}
    const hr=this.homeRegion();
    const out=(hr&&hr.gx===rx&&hr.gz===rz)
      ?true                                        // wilayah desa spawn
      :this.hash(rx,rz,3571)<this.VILLAGE_CHANCE;
    this._vhMemo[k]=out;this._vhN=(this._vhN||0)+1;
    return out;
  },
  /* Apakah sel ini yang membawa desa untuk wilayahnya?
     Syarat: wilayahnya berpenduduk DAN sel ini adalah sel paling awal
     di wilayah itu. JEDA ANTAR-WILAYAH DIHAPUS (permintaan pemain:
     "sudah jalan jauh tapi tidak menemukan desa 1 pun" — chance 80%
     tetap terasa kosong bila separuh desa saling membatalkan).
     Jarak minimum antar desa sekarang dijamin oleh SATU DESA PER
     WILAYAH: lebar wilayah biome ±264 blok. */
  villageCellOK(gx,gz){
    if(gx===0&&gz===0)return true;                  // sel spawn selalu berdesa
    const me=this.villageRegion(gx,gz);
    if(!me)return false;
    if(!this.regionHasVillage(me.gx,me.gz))return false;
    /* wilayah desa SPAWN selalu menang di wilayahnya SENDIRI (dulu 3×3
       wilayah sekitar spawn ikut diblokir — itulah yang membuat pemain
       berjalan sangat jauh tanpa menemukan desa mana pun) */
    const hr=this.homeRegion();
    if(hr&&hr.gx===me.gx&&hr.gz===me.gz)return false;
    /* SATU DESA PER WILAYAH: sel paling awal di wilayah ini yang dipakai */
    const S=this.VILL_SCAN;
    for(let dz=-S;dz<=S;dz++)for(let dx=-S;dx<=S;dx++){
      if(dx===0&&dz===0)continue;
      const ox=gx+dx,oz=gz+dz;
      const other=this.villageRegion(ox,oz);
      if(!other||other.gx!==me.gx||other.gz!==me.gz)continue;
      const otherFirst=(oz<gz)||(oz===gz&&ox<gx);
      if(otherFirst)return false;
    }
    return true;
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
  /* desa terdekat dari sebuah titik, dicari sampai 5x5 sel (�2 sel � 192 blok).
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
  const ores=[];
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

    /* Di puncak bukit pegunungan, permukaan memakai blok rumput (B.GRASS)
       dan tanah (B.DIRT) di bawahnya, namun klasifikasi biome tetap BIOME.MOUNTAIN */
    const isMntHill = WGEN.isMountainHillTop(wx,wz,h);
    const colSurf = isMntHill ? B.GRASS : (h>=CFG.SEA ? BI.surface : BI.sub);
    const colSub  = isMntHill ? B.DIRT : BI.sub;

    for(let y=0;y<h;y++){
      let id;
      if(y===0)id=B.STONE;
      else if(y===h-1)id=colSurf;
      else if(isMntHill && y>=h-3)id=colSub; // 2 lapis tanah subur di bawah rumput
      else if(isMntHill)id=B.STONE;          // dasar bukit tetap batu pegunungan kokoh
      else id=colSub;
      /* Ore TIDAK lagi tersebar sebagai urat bawah tanah — kini hanya
         node permukaan (lihat oreNodeAt). Lapisan bawah = batu polos. */
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
      /* Batang 6-10 blok (disesuaikan di bukit tinggi agar tidak menembus batas langit) */
      const th=(h>=10)?Math.max(4,Math.min(5+Math.floor(WGEN.hash(wx,wz,4)*3),H-3-h)):(6+Math.floor(WGEN.hash(wx,wz,4)*5));
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
    /* bongkahan batu polos (TANPA bijih — ore kini hanya node permukaan).
       BENTUK DIACAK per bongkahan (klasik/pilar/gundukan/bergerigi) lewat
       WGEN.rockKind + WGEN.rockH — dulu semuanya kerucut 3x3 yang identik. */
    if(!tree&&!occupied&&safe){
      const rh=WGEN.rockAt(wx,wz,h);
      if(rh){
        tree=true;
        const kind=WGEN.rockKind(wx,wz);
        const R=WGEN.rockR(kind);
        for(let dx=-R;dx<=R;dx++)for(let dz=-R;dz<=R;dz++){
          const ch=WGEN.rockH(wx,wz,rh,kind,dx,dz);
          if(ch<=0)continue;
          const xx=x+dx,zz=z+dz;
          if(xx<0||xx>=C||zz<0||zz>=C)continue;
          for(let dy=0;dy<ch;dy++){
            const y=h+dy;
            if(y>=H)break;
            const ii=idx(xx,y,zz);
            if(data[ii]===B.AIR)data[ii]=B.STONE;
          }
        }
      }
    }

    /* ---------- NODE ORE PERMUKAAN + FLATTENING 4x4 ----------
       Mekanisme baru: bila kolom ini masuk footprint 4x4 sebuah node ore,
       tanahnya DIRATAKAN ke node.baseY (tinggi minimum area) dengan tetap
       memakai blok PERMUKAAN BIOME yang sesuai (rumput→rumput, pasir→pasir,
       dst) supaya warna ground konsisten. Tanjakan/curam di sekitar bongkahan
       diratakan → bongkahan selalu menapak penuh & ore bisa spawn lebih banyak.
       Kolom pusat node mendapat blok ore; kolom sekitar hanya diratakan. */
    const oreNear=(!occupied&&h>=CFG.SEA)?WGEN.oreNodeNear(wx,wz):null;
    if(oreNear){
      const node=oreNear.node;
      const by=node.baseY;
      /* RATAKAN kolom ini ke baseY: tambah/kurang blok sampai permukaan pas di
         baseY, memakai blok biome yang benar. (h = tinggi kolom lokal saat ini,
         blok permukaan ada di h-1.) */
      const isMntNear = WGEN.isMountainHillTop(wx,wz,by);
      const surf = isMntNear ? B.GRASS : BI.surface;
      const sub  = isMntNear ? B.DIRT : BI.sub;
      if(by>h){
        /* tanjakan lebih rendah dari baseY → TAMBAH blok sampai baseY */
        for(let y=h;y<by;y++)data[idx(x,y,z)]=(y===by-1)?surf:sub;
      }else if(by<h){
        /* curam lebih tinggi dari baseY → PANGKAS blok di atas baseY */
        for(let y=by;y<h;y++)data[idx(x,y,z)]=B.AIR;
        if(by-1>=0)data[idx(x,by-1,z)]=surf;
      }
      /* PENOPANG WAJIB: pastikan kolom dari dasar sampai TEPAT di bawah
         bongkahan (y = by-1) PADAT penuh — tidak ada celah AIR/WATER/rongga.
         Tanpa ini bongkahan bisa berdiri di atas lubang/air bila kolom asli
         berongga di bawah baseY. Blok permukaan (by-1) memakai blok permukaan
         biome; lapisan di bawahnya memakai sub-biome. */
      for(let y=0;y<by;y++){
        const ii=idx(x,y,z);
        if(data[ii]===B.AIR||data[ii]===B.WATER)
          data[ii]=(y===by-1)?surf:sub;
      }
      tree=true;   // blokir tanaman di seluruh footprint (bukan hanya pusat)
      /* kolom PUSAT node → letakkan blok ore di baseY */
      if(oreNear.center){
        const y=by;
        if(y>=0&&y<H){
          /* PAKSA padat tepat di bawah blok ore — garansi anti-menggantung.
             Apa pun isi kolom sebelumnya (air/rongga/sisa pangkasan), blok
             y-1 ditimpa jadi blok permukaan biome agar bongkahan menapak. */
          if(y-1>=0)data[idx(x,y-1,z)]=surf;
          const ii=idx(x,y,z);
          if(data[ii]===B.AIR){
            data[ii]=node.ore;
            ores.push({x,y,z,wx,wy:y,wz,ore:node.ore,seed:(wx*17+wz*31),
              big:!!node.big});
          }
        }
      }
    }

    if(!tree&&!occupied&&h>=CFG.SEA){
      const top=data[idx(x,h-1,z)];
      if(top===B.GRASS||top===B.SAND||top===B.SNOW||top===B.RED_SOIL){
        /* JANGAN tanam di dalam BONGKAHAN BATU milik kolom tetangga.
           `tree` hanya menandai kolom PUSAT bongkahan; kolom di sekelilingnya
           juga terisi blok batu, dan dulu tanaman tetap ditanam di sana lalu
           tertanam/menembus batu (kaktus tumbuh dari dalam bijih). */
        if(WGEN.plantBlockedByRock(wx,wz))continue;
        /* JAMUR di bawah pohon: cek apakah ada pohon di kolom tetangga (radius 2).
           treeAt deterministik per kolom, jadi bisa dites tanpa data chunk. */
        let underTree=false;
        for(let dz=-2;dz<=2&&!underTree;dz++)for(let dx=-2;dx<=2;dx++){
          if(dx===0&&dz===0)continue;
          const nx=wx+dx,nz=wz+dz;
          if(WGEN.treeAt(nx,nz,WGEN.height(nx,nz))){underTree=true;break;}
        }
        const p=WGEN.plantAt(wx,wz,underTree);
        if(p)plants.push({x,y:h,z,t:p});
      }
    }
  }

  /* ---------- SARINGAN AKHIR: buang tanaman yang blokknya tidak kosong ----------
     Wajib dilakukan SETELAH seluruh kolom selesai. Uji per-kolom saja tidak
     cukup karena urutan loop (z lalu x) membuat sebagian blok ditulis BELAKANGAN
     oleh kolom lain: pohon di z=11 menebar kanopinya kembali ke z=9, padahal
     tanaman di z=9 sudah ditanam lebih dulu. Akibatnya kaktus/rumput bisa
     terjebak di dalam daun, batang, atau batu/bijih.
     Di sini data chunk sudah final, jadi satu pemeriksaan sederhana menangkap
     semua kasus tanpa perlu meramal urutan penulisan. */
  const okPlants=[];
  for(const p of plants){
    if(data[idx(p.x,p.y,p.z)]===B.AIR)okPlants.push(p);
  }
  return {data,plants:okPlants,ores};
}

/* ---------- lahan farming desa ----------
   Tiap desa punya minimal 2 lahan farming kecil (4�8 blok). Posisi dipilih
   deterministik di area rumput kosong, jauh dari rumah & jalan pusat, sehingga
   tidak menimpa pohon/ore/rumah � area farm nanti dipaksa jadi B.FARM dan
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
   sedangkan tipe bangunan diundi deterministik dari indeks sel grid � jadi
   chunk mana pun menghasilkan desa yang sama tanpa state global. */
/* Kavling dibuat seragam 11x11 blok supaya rumah bisa diputar 90� tanpa
   pernah bertabrakan dengan tetangganya. Anchor sengaja menjauhi jalan salib
   di pusat desa (|x|>=3, |z|>=3) sehingga jalan tidak pernah tertutup
   dinding, dan seluruh kavling tetap di dalam radius desa (r=26). */
const V_SLOT=[];
for(const sz of[-14,3])for(const sx of[-24,-12,3,15])V_SLOT.push([sx,sz]);
/* Kavling khusus TAVERN: 13x11, ditempatkan di sisi selatan pusat desa.
   z mulai +15 supaya tidak menimpa deret rumah (slot sz=3 berakhir di +14)
   dan seluruh bangunan tetap di dalam radius desa (r=26 ? z maks +26). */
const V_TAVERN=[-7,15];


/* =============================================================================
   LIMA MODEL RUMAH (kecil ? besar)
   -----------------------------------------------------------------------------
   Dulu ukuran rumah diundi acak dan perabot diletakkan dengan rumus umum
   (`if(w>=7&&d>=6)...`), sehingga rumah besar bisa mendapat dua meja yang
   posisinya nyaris bertumpuk. Sekarang tiap model punya PETA PERABOT TETAP:
   isi & letaknya selalu sama, satu-satunya variasi adalah ROTASI rumah
   (0/90/180/270) yang diundi saat desa dibuat.

   Koordinat perabot memakai satuan blok lokal (u,v) relatif sudut rumah:
   u?[0,w], v?[0,d]. Dinding menempati u/v 0 dan w-1/d-1, jadi semua perabot
   dijaga di rentang 1..w-1 / 1..d-1 supaya tidak pernah menembus dinding.
   `r` = yaw (radian) menghadap; 0 = menghadap +z.
   ============================================================================= */
const HOUSE_MODELS=[
  /* 1. GUBUK � 7x6, satu ruang: kasur + meja kecil + kursi */
  {id:'hut',w:7,d:6,h:4,roof:'pyramid',mat:'stone',
   furn:[{id:'bed',u:1.7,v:2.0,r:0},
         {id:'table',u:4.6,v:2.2,r:0},
         {id:'chair',u:4.6,v:3.5,r:Math.PI},
         {id:'chest',u:5.1,v:4.3,r:Math.PI}]},
  /* 2. PONDOK � 9x7, hunian standar: kasur, meja makan + 2 kursi, peti */
  {id:'cottage',w:9,d:7,h:5,roof:'gable',mat:'plank',
   furn:[{id:'bed',u:1.8,v:2.2,r:0},
         {id:'table',u:5.2,v:3.4,r:0},
         {id:'chair',u:5.2,v:4.7,r:Math.PI},
         {id:'chair',u:5.2,v:2.1,r:0},
         {id:'chest',u:7.2,v:1.7,r:Math.PI}]},
  /* 3. KABIN � 9x9, dua kasur bersebelahan + ruang makan di sisi timur */
  {id:'cabin',w:9,d:9,h:5,roof:'pyramid',mat:'wood',
   furn:[{id:'bed',u:1.8,v:2.4,r:0},
         {id:'bed',u:1.8,v:6.2,r:0},
         {id:'table',u:5.6,v:4.5,r:0},
         {id:'chair',u:5.6,v:5.8,r:Math.PI},
         {id:'chair',u:5.6,v:3.2,r:0},
         {id:'chest',u:7.3,v:7.2,r:Math.PI}]},
   /* 4. LOTENG � 10x9, ruang terbuka tinggi: kasur, meja kerja, dua peti.
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
  /* 5. WISMA � 11x11, rumah terbesar: dua kasur, ruang makan 3 kursi, 2 peti */
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
   TAVERN � bangunan khusus tempat berkumpulnya NPC
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
   rot = 0..3 (� 90�). Titik lokal (u,v) pada rumah w�d dipetakan ke kavling
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
  const n=4+Math.floor(hs(11)*3);                    // 4�6 rumah
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
    /* peta perabot tetap ? koordinat dunia (lantai desa selalu y=4) */
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
         1.4 blok � mudah dimasuki dan tetap terlihat seperti pintu. */
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
