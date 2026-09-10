'use strict';
/* =============================================================================
   DUNGEON / RERUNTUHAN BERTINGKAT — BERLEVEL 1..10
   -----------------------------------------------------------------------------
   Dunia dibagi grid 128x128 blok. Sebagian sel berisi satu reruntuhan dengan
   LEVEL 1–10 yang ditentukan deterministik dari indeks sel + jaraknya dari
   titik spawn: makin jauh dari rumah, makin tinggi levelnya.

   LEVEL DUNGEON = BAND LEVEL PEMAIN (5 level per tingkat):
       D1 → pemain Lv 1–5      D6  → pemain Lv 26–30
       D2 → pemain Lv 6–10     D7  → pemain Lv 31–35
       D3 → pemain Lv 11–15    D8  → pemain Lv 36–40
       D4 → pemain Lv 16–20    D9  → pemain Lv 41–45
       D5 → pemain Lv 21–25    D10 → pemain Lv 46–50

   Levelnya TETAP per lokasi (tidak mengikuti level pemain), jadi dunia terasa
   seperti MMORPG berzona: pemain mencari dungeon yang sesuai levelnya, dan
   dungeon level tinggi tetap berbahaya bagi pemain level rendah.

   Level menentukan:
     - ukuran benteng & jumlah ruang di dalamnya,
     - KEKUATAN mob penjaga (HP/damage/XP — lihat mobScale),
     - jumlah peti harta dan kualitas isinya,
     - hadiah penaklukan.

   Struktur ditulis per-kolom lewat buildDungeonPart() yang dipanggil genChunk,
   jadi bentuknya konsisten tanpa perlu state global. Peti & monster diurus
   modul ini saat pemain mendekat.
   ============================================================================= */

/* ---------- definisi lokasi dungeon (dipasang ke WGEN) ---------- */
Object.assign(WGEN,{
  DUNGEON_GRID:128,
  DUNGEON_MAX_LVL:100,
  /* jarak (blok) yang menaikkan level dungeon satu tingkat */
  DUNGEON_LVL_SPAN:260,
  /* Titik jangkar ARENA BOSS dalam koordinat relatif (dikali jarak tepi).
     [0,0] = pusat, empat pojok, lalu empat titik tengah sisi. Dengan begitu
     ruang boss tidak selalu di tengah seperti dulu. */
  DUNGEON_ARENA_SPOTS:[[0,0],[-1,-1],[1,-1],[-1,1],[1,1],[0,-1],[0,1],[-1,0],[1,0]],
  /* ---------- BENTUK DINDING GUA ----------
     Radius gua = r × (BASE + gelombang), dengan amplitudo total WOB. Kedua
     angka dipakai BERSAMA oleh dungeonInCell (menghitung batas arena) dan
     buildDungeonPart (menggambar dindingnya) supaya keduanya tidak pernah
     berbeda asumsi — kalau berbeda, arena bisa menembus dinding gua. */
  DUNGEON_CAVE_BASE:0.88,
  DUNGEON_CAVE_WOB:0.12,
  /* gelombang dinding gua pada sudut tertentu (deterministik dari d) */
  caveWobble(d,ang){
    return Math.sin(ang*3+d.lvl)*0.06+
           Math.sin(ang*5-d.gate*1.7)*0.04+
           Math.sin(ang*2+d.layout*2.1)*0.02;
  },
  /* level pemain di tengah band dungeon D (1..100) */
  midLevel(D){
    if(D<=10)return D*5-2;
    return 48+Math.round((D-10)*(152/90));
  },
  /* rentang level pemain yang cocok: {lo, hi, text} */
  bandRange(lvl){
    const L=clamp(Math.round(lvl||1),1,this.DUNGEON_MAX_LVL);
    const lo=L<=10?((L-1)*5+1):(this.midLevel(L-1)+1);
    const hi=L<=10?(L*5):this.midLevel(L);
    const minL=Math.max(1,lo),maxL=Math.max(minL,hi);
    return {lo:minL,hi:maxL,text:minL===maxL?('Lv '+minL):('Lv '+minL+'-'+maxL)};
  },
  /* rentang level pemain yang cocok, string tanpa prefix 'Lv ' (untuk toast) */
  bandText(lvl){
    return this.bandRange(lvl).text.replace(/^Lv\s*/,'');
  },
  /* Level yang dipakai untuk PERTUMBUHAN FISIK dungeon (radius, kubah, arena,
     tinggi tembok, jumlah peti & penjaga). Dijenuhkan: 1..20 apa adanya, lalu
     melandai mendekati ~24 di Lv 100. Dungeon Lv 100 tidak lebih besar dari
     Lv 20 — hanya jauh lebih berbahaya. */
  visualLvl(lvl){
    const L=clamp(lvl,1,this.DUNGEON_MAX_LVL);
    if(L<=20)return L;
    return 20+Math.min(4,(L-20)*0.05);
  },
  /* radius dinding gua pada sudut tertentu */
  caveRadius(d,ang){
    return Math.min(d.r-1,d.r*(this.DUNGEON_CAVE_BASE+this.caveWobble(d,ang)));
  },
  /* Radius yang DIJAMIN terbuka di dalam gua: memakai gelombang terburuk lalu
     menyisakan 2 blok untuk ketebalan dinding. */
  caveClearR(r){
    return Math.max(3,Math.floor(r*(this.DUNGEON_CAVE_BASE-this.DUNGEON_CAVE_WOB))-2);
  },
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
    /* ---------- LEVEL 1..100 ----------
       Dasar dari jarak ke titik awal (tiap DUNGEON_LVL_SPAN blok = +1 level),
       lalu diacak +0/+1 supaya tidak terasa seperti cincin sempurna. Level ini
       menentukan KEKUATAN mob & hadiah, dan bisa ditimpa dungeon changer. */
    const far=Math.hypot(cx,cz)/this.DUNGEON_LVL_SPAN;
    let lvl=1+Math.floor(far)+(this.hash(gx,gz,919)<0.35?1:0);
    lvl=clamp(lvl,1,this.DUNGEON_MAX_LVL);
    /* ---------- UKURAN ACAK ----------
       PERTUMBUHAN FISIK dibatasi pada "level visual" yang dijenuhkan ke ~20,
       BUKAN level sebenarnya. Tanpa pembatas ini, dungeon Lv 100 akan punya
       radius 81 blok, kubah 47 blok tinggi, dan 90 penjaga — tidak masuk akal
       secara fisik & performa. Di atas Lv 20, dungeon tidak makin besar, hanya
       makin berbahaya. Lihat visualLvl(). */
    const vl=this.visualLvl(lvl);
    const r=11+Math.round(vl*0.7)+Math.floor(this.hash(gx,gz,931)*7);
    /* reruntuhan hanya di daratan (bukan laut/pantai). Radius uji mengikuti
       UKURAN SESUNGGUHNYA supaya benteng besar tidak setengah tercelup laut —
       dulu dipatok 16 padahal benteng bisa jauh lebih lebar. */
    if(typeof this.villageSpotOK==='function'&&!this.villageSpotOK(cx,cz,r+4))return null;
    /* ---------- JENIS: BENTENG atau GOA ----------
       'cave' = gua batu berkubah dengan bijih yang bisa ditambang di dalamnya. */
    const kind=this.hash(gx,gz,941)<0.34?'cave':'fort';
    /* denah dalam benteng: 0 cincin · 1 petak · 2 halaman · 3 lorong berkelok */
    const layout=Math.floor(this.hash(gx,gz,947)*4);
    /* sisi gerbang/mulut goa: 0 selatan · 1 timur · 2 utara · 3 barat */
    const gate=Math.floor(this.hash(gx,gz,953)*4);
    /* ---------- ARENA BOSS ----------
       Persegi BERSIH & LEBAR tempat Penjaga Agung menunggu. Titik jangkarnya
       diacak (pusat / pojok / tengah sisi).

       Batas geser (off) dihitung supaya SUDUT TERJAUH arena tetap di dalam
       bangunan. Ini penting karena buildDungeonPart memeriksa arena PALING
       AWAL: kalau arena menjorok melewati dinding, lantainya menyembul di luar
       dan dindingnya berlubang.

       Bentuk uji berbeda per jenis:
         benteng — kotak, cukup |koordinat| ≤ r-2
         gua     — LINGKARAN, jadi yang diuji jarak Euclid sudut arena terhadap
                   caveClearR (radius yang dijamin terbuka). Tanpa uji diagonal
                   ini, arena di pojok gua akan menembus dinding melengkungnya. */
    const ap=this.DUNGEON_ARENA_SPOTS[
      Math.floor(this.hash(gx,gz,959)*this.DUNGEON_ARENA_SPOTS.length)]||[0,0];
    const a0=Math.abs(ap[0]),a1=Math.abs(ap[1]);
    let ar=4+Math.round(vl*0.2)+Math.floor(this.hash(gx,gz,967)*2);
    let off=0;
    if(kind==='cave'){
      const clear=this.caveClearR(r);
      /* arena harus lebih dulu muat di PUSAT gua (sudutnya = ar√2) */
      ar=clamp(ar,3,Math.max(3,Math.floor(clear/Math.SQRT2)));
      /* geser sejauh mungkin selama sudut terjauh masih di dalam lingkaran */
      for(let t=1;t<=r;t++){
        if(Math.hypot(a0*t+ar,a1*t+ar)>clear)break;
        off=t;
      }
    }else{
      ar=clamp(ar,3,Math.max(3,r-4));
      const maxC=r-2;
      for(let t=1;t<=r;t++){
        if(a0*t+ar>maxC||a1*t+ar>maxC)break;
        off=t;
      }
    }
    const arenaX=Math.round(ap[0]*off),arenaZ=Math.round(ap[1]*off);
    /* tinggi kubah goa */
    const domeH=7+Math.round(vl*0.4)+Math.floor(this.hash(gx,gz,971)*3);
    /* Level EFEKTIF: bila dungeon ini pernah diubah dungeon changer atau baru
       saja reset, changedLvl menimpa level bawaan dari jarak. Lookup defensif
       (Dungeon didefinisikan setelah blok ini) supaya tidak ada dependensi
       melingkar saat file dimuat. */
    const key=gx+','+gz;
    const ov=(typeof Dungeon!=='undefined'&&Dungeon.changedLvl)?Dungeon.changedLvl[key]:undefined;
    const effLvl=ov?clamp(ov,1,this.DUNGEON_MAX_LVL):lvl;
    return {x:cx,z:cz,lvl:effLvl,r,key,
      biome:this.biomeAt(cx,cz),
      kind,layout,gate,ar,arenaX,arenaZ,domeH};
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
   DUA JENIS reruntuhan, dipilih deterministik per lokasi (d.kind):

     'fort' — benteng persegi: tembok luar berkeriting, menara sudut, gerbang di
              salah satu dari empat sisi (d.gate), dan DENAH DALAM yang diacak
              (d.layout 0..3): cincin, petak kamar, halaman berpilar, atau
              lorong berkelok. Dulu semua benteng memakai denah cincin yang
              sama sehingga tiap dungeon terasa identik.

     'cave' — GUA batu berkubah: dinding luarnya melengkung bergelombang, langit
              -langitnya berbentuk kubah yang meninggi ke tengah, ada stalagmit,
              dan BIJIH YANG BISA DITAMBANG (besi/emas/kristal sesuai level)
              tersebar di dinding, lantai, serta tiang batunya.

   Keduanya punya ARENA BOSS: persegi bersih & lebar (d.ar) yang letaknya diacak
   (pusat / salah satu pojok / tengah sisi lewat d.arenaX,d.arenaZ). Di dalam
   arena tidak pernah ada tembok, puing, maupun stalagmit — hanya lantai dan
   empat pilar penanda di sudut terluarnya, sehingga pertarungan boss selalu
   punya ruang gerak penuh.
   ============================================================================= */

/* Jenis bijih tambang di dalam gua: makin tinggi level, makin berharga.
   Kristal hanya muncul dari level 7, emas dari level 4. */
function caveOreFor(d,wx,wz,y){
  const rr=WGEN.hash(wx,wz+y*31,d.lvl*7+13);
  if(d.lvl>=7&&rr<0.16)return B.ORE_CRYSTAL;
  if(d.lvl>=4&&rr<0.44)return B.ORE_GOLD;
  return B.ORE_IRON;
}
/* Tinggi langit-langit kubah gua pada satu kolom: penuh di tengah, menipis ke
   tepi (profil setengah elips). Dipakai baik oleh jalur arena maupun jalur gua
   biasa supaya atap di atas arena TIDAK berlubang. */
function caveCeilY(d,h,dist,cr){
  const t=clamp(dist/Math.max(1,cr),0,1);
  return h+Math.max(2,Math.round(d.domeH*Math.sqrt(Math.max(0,1-t*t))));
}

/* =============================================================================
   PREDIKAT DENAH — SATU SUMBER KEBENARAN
   -----------------------------------------------------------------------------
   Tiga fungsi di bawah dipakai BERSAMA oleh buildDungeonPart (yang menggambar
   blok) dan Dungeon.spotFree (yang memilih titik peti / penjaga). Dengan satu
   sumber, keduanya tidak mungkin berbeda asumsi — tanpa ini peti bisa
   diletakkan tepat di atas tembok denah atau di dalam puing.
   ============================================================================= */

/* Jalur yang SELALU terbuka: lorong salib dari gerbang ke pusat, dan lorong
   penghubung pusat → arena (supaya arena di pojok tetap bisa dicapai). */
function dungeonPathAt(d,lx,lz){
  if(Math.abs(lx)<=1||Math.abs(lz)<=1)return true;
  if(Math.abs(lx-d.arenaX)<=1){
    const lo=Math.min(0,d.arenaZ),hi=Math.max(0,d.arenaZ);
    if(lz>=lo-1&&lz<=hi+1)return true;
  }
  if(Math.abs(lz-d.arenaZ)<=1){
    const lo=Math.min(0,d.arenaX),hi=Math.max(0,d.arenaX);
    if(lx>=lo-1&&lx<=hi+1)return true;
  }
  return false;
}

/* Tembok denah dalam benteng (d.layout 0..3). Hanya berlaku di luar jalur
   terbuka & di luar arena; pemanggil yang memastikan itu. */
function dungeonLayoutWall(d,lx,lz){
  const ax=Math.abs(lx),az=Math.abs(lz),r=d.r;
  switch(d.layout){
    case 0:{                                  // dua cincin konsentris
      const ri=Math.max(3,Math.floor(r/2));
      if(d.lvl>=2&&(ax===ri||az===ri))return true;
      const ri2=Math.max(5,Math.floor(r*0.78));
      if(r>=16&&(ax===ri2||az===ri2)&&
         Math.abs(ax-az)>1&&(ax%7!==3&&az%7!==3))return true;
      return false;
    }
    case 1:{                                  // petak kamar (kisi 5, 1 pintu/sisi)
      const G=5;
      const mx=((lx%G)+G)%G,mz=((lz%G)+G)%G;
      return (mx===0&&mz!==2)||(mz===0&&mx!==2);
    }
    case 2:{                                  // halaman berpilar
      const P=4;
      const mx=((lx%P)+P)%P,mz=((lz%P)+P)%P;
      return mx===0&&mz===0&&Math.max(ax,az)>=Math.floor(r*0.42);
    }
    default:{                                 // lorong berkelok
      if(((lz+r)%4)!==0)return false;
      const band=Math.floor((lz+r)/4);
      const gapLeft=(band%2)===0;
      const inGap=gapLeft?(lx<=-r+3):(lx>=r-3);
      return !inGap;
    }
  }
}

/* Apakah kolom (lx,lz) benar-benar RUANG TERBUKA setinggi badan?
   false untuk: di luar dungeon, tembok luar/menara, dinding gua, tembok denah,
   puing, stalagmit, dan pilar sudut arena. */
function dungeonOpenAt(d,lx,lz){
  const ax=Math.abs(lx),az=Math.abs(lz),r=d.r;
  if(ax>r||az>r)return false;
  /* arena: terbuka, kecuali empat pilar sudutnya */
  const dxA=Math.abs(lx-d.arenaX),dzA=Math.abs(lz-d.arenaZ);
  if(dxA<=d.ar&&dzA<=d.ar)return !(dxA===d.ar&&dzA===d.ar);
  const openPath=dungeonPathAt(d,lx,lz);
  const wx=d.x+lx,wz=d.z+lz;
  if(d.kind==='cave'){
    const dist=Math.hypot(lx,lz);
    const cr=WGEN.caveRadius(d,Math.atan2(lz,lx));
    if(dist>cr-2)return false;                       // dinding gua / luar gua
    if(!openPath&&WGEN.hash(wx,wz,d.lvl*29+19)<0.055)return false;   // stalagmit
    return true;
  }
  if(ax===r||az===r||(ax>=r-1&&az>=r-1))return false;               // tembok luar
  if(!openPath){
    if(dungeonLayoutWall(d,lx,lz))return false;
    if(WGEN.hash(wx,wz,d.lvl*31+5)<0.05)return false;               // puing
  }
  return true;
}

function buildDungeonPart(data,idx,x,z,wx,wz,h,d,C,H){
  const set=(y,id)=>{if(y>=0&&y<H)data[idx(x,y,z)]=id;};
  const lx=wx-d.x,lz=wz-d.z;
  const ax=Math.abs(lx),az=Math.abs(lz);
  const r=d.r;
  if(ax>r||az>r)return false;

  /* bahan menyesuaikan biome supaya reruntuhan menyatu dengan lingkungan.
     Ambang visual dipetakan ulang ke skala level 1–10 (dulu 1–5): pelapis atap
     mulai level 7, lantai batu penuh mulai level 5, dan tinggi tembok tumbuh
     landai sampai +4 blok agar tetap di bawah CFG.WORLD_H. */
  const WALL=d.biome===BIOME.DESERT?B.SAND:B.STONE;
  const TRIM=d.lvl>=7?B.ROOF:B.PLANK;

  /* ---------- ARENA BOSS: selalu diperiksa PALING AWAL ----------
     Dengan mengembalikan lebih dulu, tidak ada tembok denah, puing, ataupun
     stalagmit yang bisa masuk ke dalam arena — inilah yang membuatnya selalu
     bersih. Lantai tepinya diberi warna berbeda sebagai penanda batas, dan
     hanya keempat sudut terluarnya yang punya pilar. */
  const dxA=Math.abs(lx-d.arenaX),dzA=Math.abs(lz-d.arenaZ);
  const ar=d.ar;
  if(dxA<=ar&&dzA<=ar){
    const edge=(dxA===ar||dzA===ar);
    set(h-1,edge?B.PLANK:B.STONE);
    if(dxA===ar&&dzA===ar){                    // pilar penanda di 4 sudut arena
      for(let y=h;y<h+2;y++)set(y,WALL);
      set(h+2,d.lvl>=5?BIOME_INFO[d.biome].ore:B.PLANK);
    }
    /* GUA: atap kubah tetap dipasang di atas arena. Tanpa ini arena menjadi
       lubang terbuka ke langit — gua akan tampak bocor dari luar. */
    if(d.kind==='cave'){
      const dist=Math.hypot(lx,lz);
      const cr=WGEN.caveRadius(d,Math.atan2(lz,lx));
      const ceil=caveCeilY(d,h,dist,cr);
      for(let y=ceil;y<=ceil+1;y++)set(y,WALL);
    }
    return true;
  }

  /* ---------- JALUR TERBUKA ----------
     lorong salib gerbang→pusat + lorong pusat→arena. Dihitung dungeonPathAt
     supaya spotFree memakai definisi yang sama persis. */
  const openPath=dungeonPathAt(d,lx,lz);

  /* ---------- sisi gerbang / mulut gua ---------- */
  const gate=d.gate===0?(lz===r&&ax<=1):
             d.gate===1?(lx===r&&az<=1):
             d.gate===2?(lz===-r&&ax<=1):
                        (lx===-r&&az<=1);
  /* arah keluar mulut gua (setengah bidang menuju sisi gerbang) */
  const mouth=d.gate===0?(lz>0&&ax<=1):
              d.gate===1?(lx>0&&az<=1):
              d.gate===2?(lz<0&&ax<=1):
                         (lx<0&&az<=1);

  /* =========================================================================
     GUA BERKUBAH
     ========================================================================= */
  if(d.kind==='cave'){
    const dist=Math.hypot(lx,lz);
    /* Dinding luar bergelombang: tiga gelombang sinus terhadap SUDUT sehingga
       garis luarnya berlekuk halus (bukan bergerigi seperti hash acak), dan
       tetap deterministik. Rumusnya dipusatkan di WGEN.caveRadius supaya
       dungeonInCell memakai asumsi yang sama saat membatasi arena. */
    const ang=Math.atan2(lz,lx);
    const cr=WGEN.caveRadius(d,ang);
    if(dist>cr)return false;                   // di luar gua: tanah biasa
    /* lantai batu gua; sesekali bijih menyembul di permukaan lantai */
    const floorOre=WGEN.hash(wx,wz,d.lvl*17+3)<0.05;
    set(h-1,floorOre?caveOreFor(d,wx,wz,0):B.STONE);
    /* langit-langit kubah: tinggi penuh di tengah, menipis ke tepi */
    const ceil=caveCeilY(d,h,dist,cr);
    const shell=dist>cr-2;
    if(shell){
      /* MULUT GUA: biarkan setinggi 3 blok sebagai lorong masuk */
      if(mouth){
        set(h+3,WALL);set(h+4,WALL);
        return true;
      }
      /* dinding batu masif — di sinilah bijih paling sering tertanam */
      for(let y=h;y<=ceil;y++){
        const ore=WGEN.hash(wx,wz+y*57,d.lvl*31+29)<0.13;
        set(y,ore?caveOreFor(d,wx,wz,y):WALL);
      }
      return true;
    }
    /* atap kubah (ketebalan 2) + stalaktit menggantung sesekali */
    for(let y=ceil;y<=ceil+1;y++){
      const ore=WGEN.hash(wx,wz+y*23,d.lvl*13+7)<0.10;
      set(y,ore?caveOreFor(d,wx,wz,y):WALL);
    }
    if(!openPath&&WGEN.hash(wx,wz,d.lvl*41+11)<0.06){
      const sl=1+Math.floor(WGEN.hash(wx,wz,53)*2);
      for(let y=ceil-sl;y<ceil;y++)set(y,WALL);
    }
    /* stalagmit dari lantai; jalur salib & jalur arena dibiarkan bebas supaya
       gua selalu bisa dilalui dan peti tidak pernah tertimbun batu */
    if(!openPath&&WGEN.hash(wx,wz,d.lvl*29+19)<0.055){
      const sh=1+Math.floor(WGEN.hash(wx,wz,61)*3);
      for(let y=h;y<h+sh;y++){
        const ore=(y===h+sh-1)&&WGEN.hash(wx,wz+y*11,d.lvl*7+5)<0.30;
        set(y,ore?caveOreFor(d,wx,wz,y):WALL);
      }
    }
    return true;
  }

  /* =========================================================================
     BENTENG PERSEGI
     ========================================================================= */
  /* lantai batu di seluruh area benteng */
  set(h-1,d.lvl>=5?B.STONE:WALL);

  const wallTop=h+2+Math.min(4,Math.round(WGEN.visualLvl(d.lvl)*0.5));  // makin tinggi levelnya
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

  /* ---------- DENAH DALAM (diacak per lokasi lewat d.layout) ----------
     DI MANA temboknya berdiri ditentukan dungeonLayoutWall (dipakai bersama
     spotFree); di sini hanya tinggi & bahannya. Jalur terbuka (openPath) selalu
     menang supaya gerbang → pusat → arena tidak pernah terkunci. */
  const innerTop=h+2+(d.lvl>=7?1:0);
  if(!openPath&&dungeonLayoutWall(d,lx,lz)){
    if(d.layout===2){
      /* halaman berpilar: pilar tinggi bermahkota TRIM */
      for(let y=h;y<h+4;y++)set(y,WALL);
      set(h+4,TRIM);
    }else if(d.layout===0&&!(Math.abs(lx)===Math.max(3,Math.floor(r/2))||
                             Math.abs(lz)===Math.max(3,Math.floor(r/2)))){
      /* cincin kedua lebih pendek dari cincin pertama */
      for(let y=h;y<h+2;y++)set(y,WALL);
    }else{
      for(let y=h;y<innerTop;y++)set(y,WALL);
    }
    return true;
  }

  /* ---------- puing & tiang runtuh acak di dalam ruangan ---------- */
  if(!openPath&&WGEN.hash(wx,wz,d.lvl*31+5)<0.05){
    const hh=1+Math.floor(WGEN.hash(wx,wz,77)*2);
    for(let y=h;y<h+hh;y++)set(y,WALL);
    return true;
  }
  return true;   // area dalam tetap dianggap terpakai (tanpa pohon/tanaman)
}

/* =============================================================================
   MODUL RUNTIME: peti harta, monster penjaga, notifikasi masuk
   ============================================================================= */
/* Peluang seorang penjaga baru berwujud REAPER, per level reruntuhan.
   Untuk level di luar tabel ini dipakai reaperChance(lvl) yang mengekstrapolasi
   kurva naiknya supaya dungeon Lv 11–100 tetap punya reaper (makin jenuh ke 0.9).
   Level 1 nol supaya reruntuhan terdekat dari spawn masih dijaga mob biasa. */
const REAPER_CHANCE=[0,0,0.25,0.35,0.45,0.55,0.62,0.70,0.76,0.82,0.88];
function reaperChance(lvl){
  const L=Math.max(1,Math.round(lvl));
  if(L<REAPER_CHANCE.length)return REAPER_CHANCE[L];
  /* >10: mendekati 0.92 secara asimtotik (0.88 di D10, +0.04 tersebar ke D100) */
  return Math.min(0.92,0.88+(L-10)*(0.04/90));
}

const Dungeon={
  active:null,          // dungeon yang sedang dimasuki pemain
  spawnT:0,
  built:{},             // dungeon yang petinya sudah dibuat
  builtInfo:{},         // posisi dungeon tsb (untuk pembersihan)
  activeKey:null,       // kunci dungeon aktif (perbandingan objek tidak sah)
  opened:{},            // peti yang sudah dibuka (persisten)
  cleared:{},           // dungeon yang sudah ditaklukkan (persisten)
  bossKilled:{},        // boss akhir yang sudah dikalahkan (persisten)
  bossChest:{},         // peti boss yang sudah dipanen (persisten)
  /* ---------- RESET & CHANGER (persisten) ---------- */
  killedAt:{},          // key → timestamp boss dikalahkan (untuk reset 10 menit)
  changedLvl:{},        // key → level hasil dungeon changer (berlaku sampai reset)
  SAVE_KEY:'forest_survival_chest_v1',
  /* Setelah boss dikalahkan, dungeon masuk masa jeda RESET_MS. Lewat itu, semua
     kembali (mob + peti) dan levelnya diundi ulang ACAK 1..100. */
  RESET_MS:10*60*1000,

  /* =========================================================================
     SKALA KEKUATAN MOB PER LEVEL DUNGEON (1..100) — KALIBRASI ULANG
     -------------------------------------------------------------------------
     KESALAHAN KALIBRASI SEBELUMNYA (inilah sebabnya boss terasa gampang):
     HP mob dulu diikatkan ke HP PEMAIN, dengan asumsi DPS pemain ≈ 84 di Lv 50
     (hanya damage pedang × kecepatan × crit). DPS SEBENARNYA di Lv 50 adalah
     ±930 — sebelas kali lipat. Yang terlewat:
         rarityMul pedang Titan (legendaris)   ×1.40
         skill 'Bilah Tajam' rank 3            ×1.60
         proficiency Pertarungan (maks)        ×1.50
         rata-rata pengali combo 5 tebasan     ×1.41
         5 tebasan per 2.68 detik (bukan 1 hit/detik)
     Karena HP mob dihitung dari HP pemain — bukan dari DPS pemain — boss
     dungeon Lv 25 hanya ber-HP 2.271 dan mati dalam 2,4 detik.

     Damage-nya juga tampak besar di atas kertas (232) tapi ARMOR TIDAK
     DIPERHITUNGKAN: dengan armor kristal penuh (reduksi 70%) yang benar-benar
     masuk hanya 70 — 10% HP pemain. Itu sebabnya "tidak sakit sama sekali".

     ------------------------------- MODEL BARU -------------------------------
     Sekarang HP mob dikalibrasi ke DPS PEMAIN dan damage mob ke HP PEMAIN
     SESUDAH armor, dua kurva yang berbeda:

        hpMul (D) = TTK(D) × dpsRef(mid) / REF.hp
        dmgMul(D) = PCT(D) × hpRef(mid) / (1 - ARMOR_CAL) / REF.dmg

     TTK(D) = 3 detik (D1) naik landai ke 8 detik (D100) — mob dungeon tinggi
     memang lebih tebal, tapi tidak pernah jadi karung pasir 90 detik.
     PCT(D) = 12% (D1) naik ke 20% (D100) HP pemain per pukulan, dihitung pada
     ARMOR_CAL 50% sebagai acuan wajar. Pemain berarmor penuh (70%) menerima
     lebih sedikit, pemain tanpa armor menerima jauh lebih banyak — keduanya
     tetap masuk akal, dan armor kembali punya arti.

     dpsRef() adalah cermin sederhana dari rantai damage pemain yang sebenarnya
     (senjata sesuai tier level × rarity × skill × proficiency × tempa × combo).
     Kalau suatu saat senjata baru ditambahkan, cukup perbarui tabel DPS_TIER
     di sini — sisanya mengikuti.
     ========================================================================= */
  REF:{hp:52,dmg:11,xp:34},      // serigala = mob acuan
  VARIETY:0.45,                  // penekan variasi antar tipe mob
  VARIETY_CAP:2.0,
  /* Acuan armor saat menghitung damage mob. 0.5 = pemain berarmor menengah. */
  ARMOR_CAL:0.50,
  /* TTK mob acuan & persentase HP per pukulan, pada D1 → D100 */
  TTK_LO:3.0, TTK_HI:8.0,
  PCT_LO:0.12, PCT_HI:0.20,
  /* ---------- BOSS AKHIR ----------
     BOSS_HP_MUL 10 = permintaan eksplisit "10x lipat lebih kuat dari mob yang
     ada di dalam dungeon level itu". Pengali ini diterapkan SESUDAH variasi
     tipe, jadi angkanya benar-benar 10× HP mob setipe di dungeon yang sama.

     BOSS_DMG_MUL 2.0 (bukan 10). Kalau damage juga dikalikan 10, boss akan
     one-shot pemain berarmor penuh di level mana pun — 10× HP membuat
     pertarungan panjang (60–120 detik), dan mati sekali pukul dalam pertarungan
     sepanjang itu bukan tantangan, hanya hukuman. Dengan 2.0 satu pukulan boss
     memakan ±1/3 HP pemain berarmor penuh: tetap menakutkan (3–4 pukulan fatal)
     tapi masih bisa dihadapi dengan tangkisan, penyembuhan, dan dukungan tim.

     Variasi tipe boss ditekan (BOSS_VARIETY 0.25) supaya keberuntungan tipe
     boss tidak menentukan bisa/tidak menang. */
  BOSS_HP_MUL:10,
  BOSS_DMG_MUL:2.0,
  /* XP boss dungeon 2x mob biasa (dulu 10x — satu boss D80 memberi 117% XP
     satu level penuh, sekarang ±23%, selaras acuan "mini boss = 20% level").
     Hadiah utama boss adalah loot jarang di peti, bukan XP — 10x HP untuk
     2x XP memang tidak efisien, dan itu disengaja (MMORPG klasik: mob untuk
     XP, boss untuk gear). */
  BOSS_XP_MUL:2,
  BOSS_VARIETY:0.25,

  /* level pemain di tengah band dungeon D (1..100) — bersumber dari WGEN.midLevel */
  midLevel(D){return WGEN.midLevel(D);},
  bandRange(lvl){return WGEN.bandRange(lvl);},
  bandText(lvl){return WGEN.bandText(lvl);},
  /* HP pemain di level L (cermin Player.maxHp tanpa bergantung instance) */
  _playerHp(L){return 100+((typeof CFG!=='undefined'&&CFG.HP_PER_LVL)||12)*(Math.max(1,L)-1);},
  /* ---------- CERMIN DPS PEMAIN ----------
     [levelMaks, dmg, crit, rarityMul] per tier senjata yang wajar dimiliki di
     level itu. Diambil dari ITEMS: kayu 12/besi 18/badai 24/racun 30/beku 38/
     titan 44, dengan rarity umum→legendaris.
     avgCombo 1.41 = rata-rata COMBOS[].dmg (1,1,1.25,1.4,2.4).
     cycleT 2.68 = total durasi+recovery lima tebasan. */
  DPS_TIER:[[8,12,0.05,1.00],[16,18,0.08,1.08],[26,24,0.12,1.16],
            [36,30,0.16,1.26],[48,38,0.22,1.26],[9999,44,0.14,1.40]],
  _dpsRef(L){
    const lv=Math.max(1,L);
    let t=this.DPS_TIER[this.DPS_TIER.length-1];
    for(const e of this.DPS_TIER)if(lv<=e[0]){t=e;break;}
    const skDmg=Math.min(3,Math.floor(lv/8));         // 'Bilah Tajam' rank
    const skCombo=Math.min(2,Math.floor(lv/14));      // 'Aliran Combo' rank
    const profLv=Math.min(50,Math.floor(lv*0.7));     // proficiency Pertarungan
    const profDmg=Math.min(0.5,profLv*0.01);
    const forge=1+0.08*Math.min(10,Math.floor(lv/5)); // level tempa wajar
    const base=t[1]*t[3]*(1+0.2*skDmg)*(1+profDmg)*forge;
    const crit=Math.min(0.6,t[2]*t[3]+Math.min(0.15,profLv*0.003));
    const perHit=base*1.41*(1+crit);
    return perHit*5/(2.68/(1+0.12*skCombo));
  },
  /* interpolasi linear D1..D100 */
  _ramp(D,lo,hi){
    const M=Math.max(2,WGEN.DUNGEON_MAX_LVL);
    return lo+(clamp(D,1,M)-1)*((hi-lo)/(M-1));
  },
  lvlHpMul(lvl){
    const D=clamp(lvl,1,WGEN.DUNGEON_MAX_LVL);
    const mid=this.midLevel(D);
    return this._ramp(D,this.TTK_LO,this.TTK_HI)*this._dpsRef(mid)/this.REF.hp;
  },
  lvlDmgMul(lvl){
    const D=clamp(lvl,1,WGEN.DUNGEON_MAX_LVL);
    const mid=this.midLevel(D);
    return this._ramp(D,this.PCT_LO,this.PCT_HI)*this._playerHp(mid)
           /(1-this.ARMOR_CAL)/this.REF.dmg;
  },
  lvlXpMul(lvl){
    const D=clamp(lvl,1,WGEN.DUNGEON_MAX_LVL);
    return Math.pow(Math.max(1,this.midLevel(D)),0.8);
  },

  /* pengali variasi antar tipe: rasio stat tipe terhadap acuan, ditekan */
  varietyMul(base,ref,pow){
    if(!(base>0)||!(ref>0))return 1;
    return Math.min(this.VARIETY_CAP,Math.pow(base/ref,pow===undefined?this.VARIETY:pow));
  },
  /* Terapkan skala level dungeon ke satu mob yang baru dibuat.
     `boss` = boss akhir dungeon (bukan mini boss acak dunia luar).

     BOSS = 10× LEBIH KUAT DARI MOB DUNGEON ITU (BOSS_HP_MUL). Pengali
     diterapkan SESUDAH variasi tipe, jadi rasionya benar-benar terhadap mob
     yang dihadapi di dungeon yang sama.

     Variasi tipe boss tetap ditekan (BOSS_VARIETY 0.25, bukan 0.45 seperti mob
     biasa): tipe boss diundi acak per dungeon, dan tanpa penekanan sebuah
     dungeon yang kebetulan mendapat boss reaper akan 2,9× lebih berat daripada
     yang mendapat boss slime — di band level rendah itu menentukan bisa atau
     tidak menang, padahal pemain tidak punya pilihan atas tipe boss-nya.
     Dengan 0.25, sebaran itu turun ke ±1,8× sambil tetap mempertahankan janji
     "10× mob biasa". */
  scaleMob(m,lvl,boss){
    const T=Monsters.TYPES[m.type];
    if(!T)return m;
    const L=clamp(lvl,1,WGEN.DUNGEON_MAX_LVL);
    const vp=boss?this.BOSS_VARIETY:this.VARIETY;
    const hp=this.REF.hp*this.lvlHpMul(L)*this.varietyMul(T.hp,this.REF.hp,vp)
             *(boss?this.BOSS_HP_MUL:1);
    const dmg=this.REF.dmg*this.lvlDmgMul(L)*this.varietyMul(T.dmg,this.REF.dmg,vp)
             *(boss?this.BOSS_DMG_MUL:1);
    /* XP tetap memakai variasi normal supaya boss dari mob berharga tetap
       memberi XP lebih besar — ini bonus, bukan penentu kesulitan. */
    const xp=this.REF.xp*this.lvlXpMul(L)*this.varietyMul(T.xp,this.REF.xp)
             *(boss?this.BOSS_XP_MUL:1);
    m.hp=m.maxhp=Math.max(1,Math.round(hp));
    m.dmg=Math.max(1,Math.round(dmg));
    m.xp=Math.max(1,Math.round(xp));
    m.dlvl=L;                    // penanda: mob milik dungeon level ini
    /* m.lvl = level PEMAIN yang setara, dari tengah band dungeon ini (lihat
       midLevel: D1→3, D10→48, D100→200). Mob dungeon TIDAK memakai level biome
       (Monsters.applyBiomeLevel): kalibrasinya diurus di sini, mengikuti level
       dungeon, bukan biome tempat dungeon berdiri. */
    m.lvl=Math.max(1,this.midLevel(L));
    if(boss)m.dboss=true;
    return m;
  },

  /* ---------- tabel harta per level (1..10) ----------
     Lima tabel lama dipetakan ke 10 level: tiap tabel dipakai dua level
     berurutan, dan jumlahnya ikut dikalikan lvlLootMul() supaya isi peti
     dungeon level tinggi benar-benar lebih banyak. */
  LOOT:[
    /* lvl 1  */[['wood',4,8],['stone',4,8],['fiber',3,6],['bread',1,2]],
    /* lvl 2  */[['stone',6,10],['iron_ore',2,4],['coal',2,5],['leather',1,3]],
    /* lvl 3  */[['iron_ore',3,6],['coal',3,6],['leather',2,4],['bread',2,3]],
    /* lvl 4  */[['iron_ore',4,8],['gold_ore',2,4],['crystal',1,2],['resin',2,4]],
    /* lvl 5  */[['gold_ore',3,6],['crystal',2,4],['iron_ore',5,9],['pelt',2,4]],
    /* lvl 6  */[['gold_ore',4,8],['crystal',3,5],['iron_ingot',2,4],['pelt',2,5]],
    /* lvl 7  */[['crystal',4,7],['gold_ingot',2,4],['iron_ingot',3,6],['venom',2,4]],
    /* lvl 8  */[['crystal',5,9],['gold_ingot',3,5],['soul_shard',1,2],['centipede_shell',3,6]],
    /* lvl 9  */[['crystal',6,11],['gold_ingot',4,7],['soul_shard',2,4],['boss_core',1,1]],
    /* lvl 10 */[['crystal',8,14],['gold_ingot',5,9],['soul_shard',3,5],['boss_core',1,2]],
  ],
  /* Tabel harta untuk level di luar 1..10 (11–100). Alih-alih menduplikasi 90
     baris, isi peti dihitung dari tabel level-10 yang diperbesar jumlahnya —
     bahannya tetap kristal/emas/pecahan jiwa/inti boss, hanya porsinya naik. */
  lootTableFor(lvl){
    const L=clamp(lvl,1,WGEN.DUNGEON_MAX_LVL);
    if(L<=10)return this.LOOT[L-1];
    /* >10: pakai tabel Lv10, porsi dasar dinaikkan lewat lvlLootMul */
    return this.LOOT[9];
  },
  /* pengali jumlah item peti mengikuti level (sampai 100) */
  lvlLootMul(lvl){return 1+0.12*(clamp(lvl,1,WGEN.DUNGEON_MAX_LVL)-1);},

  /* =========================================================================
     PETI BOSS — hadiah utama saat Penjaga Agung tumbang
     -------------------------------------------------------------------------
     Saat boss akhir mati, sebuah PETI EMAS besar muncul di ARENA tempat Penjaga
     Agung berdiri (letak arena diacak per dungeon). Isinya tiga lapis:

       1. BAHAN PASTI  — tabel harta LOOT level itu, porsi lebih besar dari
                         peti biasa, plus Inti Boss.
       2. ITEM LANGKA  — peluang RARE_CHANCE (10%) mendapat satu item dari
                         RARE_POOL: barang yang normalnya nyaris tak terjangkau
                         (Jimat Pawang, Log Pass, Pecahan Jiwa, dan 4 bahan
                         ritual Altar yang biasanya hanya 1% drop di Redlands).
       3. EQUIPMENT    — SATU perlengkapan (pedang/armor/tameng) yang rarity-nya
                         diundi memakai tabel GEAR_RARITY sesuai LEVEL DUNGEON.

     Peti ini TERPISAH dari peti harta biasa (chestSpots) sehingga tidak ikut
     menentukan status "ditaklukkan": pemain tetap harus menguras peti biasa
     untuk clearReward. Statusnya disimpan sendiri di bossChest{} supaya peti
     tetap ada bila pemain pergi sebelum membukanya, dan tidak bisa dipanen
     dua kali setelah dibuka.
     ========================================================================= */
  BOSS_CHEST_SCALE:1.8,          // peti boss jauh lebih besar dari peti biasa
  /* RARE_CHANCE 20% (dulu 10%, permintaan pemain +10%): peluang peti boss
     dungeon memberi SATU item langka — termasuk 4 bahan ritual Altar. */
  RARE_CHANCE:0.20,
  /* Item langka: normalnya sangat sulit didapat. Bahan ritual Altar
     (insect_leg/hard_shell/green_blood/toxic_venom) biasanya hanya 1% drop dari
     mob Redlands, jadi menemukannya di sini adalah jalan pintas berharga. */
  RARE_POOL:['pet_charm','log_pass','soul_shard',
             'insect_leg','hard_shell','green_blood','toxic_venom'],
  /* ---------- PELUANG RARITY EQUIPMENT PER LEVEL DUNGEON ----------
     Baris ke-n = level dungeon n; kolom = [common, uncommon, rare, epic,
     legendary] dalam persen dan selalu berjumlah 100.

     Rancangannya: makin dalam dungeon, makin condong ke rarity atas —
     common menghilang total di level 10, sementara LEGENDARIS (rarity
     tertinggi) tumbuh dari 0% di level 1-3 sampai TEPAT 2% di level 10.
     2% adalah plafonnya: legendaris tetap temuan seumur-hidup, bukan barang
     yang bisa difarming dengan mengulang dungeon terdalam. */
  GEAR_RARITY:[
    /* lvl 1  */[70,  25,   5,    0,   0],
    /* lvl 2  */[60,  30,  10,    0,   0],
    /* lvl 3  */[50,  33,  15,    2,   0],
    /* lvl 4  */[40,  35,  20,  4.7, 0.3],
    /* lvl 5  */[30,  36,  26,  7.5, 0.5],
    /* lvl 6  */[22,  34,  31, 12.2, 0.8],
    /* lvl 7  */[15,  30,  36, 17.9, 1.1],
    /* lvl 8  */[ 9,  25,  39, 25.6, 1.4],
    /* lvl 9  */[ 4,  19,  40, 35.3, 1.7],
    /* lvl 10 */[ 0,  12,  38,   48,   2],
  ],
  RARITY_ORDER:['common','uncommon','rare','epic','legendary'],

  /* Semua equipment (pedang / armor / tameng) yang punya rarity tertentu.
     Dibaca LANGSUNG dari ITEMS supaya item baru yang ditambahkan nanti otomatis
     ikut masuk undian tanpa perlu menyunting daftar di sini. Hasilnya di-cache
     karena ITEMS tidak berubah saat runtime. */
  _gearCache:null,
  gearByRarity(){
    if(this._gearCache)return this._gearCache;
    const out={};
    for(const r of this.RARITY_ORDER)out[r]=[];
    for(const id in ITEMS){
      const it=ITEMS[id];
      if(!it||(!it.weapon&&!it.armor))continue;
      const r=it.rarity;
      if(r&&out[r])out[r].push(id);
    }
    this._gearCache=out;
    return out;
  },
  /* Undi rarity equipment untuk level dungeon tertentu. Bila baris tabelnya
     memilih rarity yang (karena suatu hal) tidak punya item, turun setingkat
     sampai menemukan yang terisi — supaya peti tidak pernah kosong. */
  rollGearRarity(lvl){
    const row=this.GEAR_RARITY[clamp(lvl,1,10)-1];
    const pool=this.gearByRarity();
    let r=Math.random()*100;
    let pick=0;
    for(let i=0;i<row.length;i++){
      r-=row[i];
      if(r<=0){pick=i;break;}
      pick=i;
    }
    for(let i=pick;i>=0;i--){
      const rar=this.RARITY_ORDER[i];
      if(pool[rar]&&pool[rar].length)return rar;
    }
    for(let i=pick+1;i<this.RARITY_ORDER.length;i++){
      const rar=this.RARITY_ORDER[i];
      if(pool[rar]&&pool[rar].length)return rar;
    }
    return 'common';
  },
  /* satu id equipment acak dari rarity tersebut */
  rollGear(lvl){
    const rar=this.rollGearRarity(lvl);
    const pool=this.gearByRarity()[rar];
    if(!pool||!pool.length)return null;
    return {id:pool[(Math.random()*pool.length)|0],rar};
  },

  /* Pasang peti emas di ARENA BOSS. Dipanggil onBossKilled (saat boss tumbang)
     DAN update() (saat dungeon yang bossnya sudah mati dimuat ulang tapi
     petinya belum dibuka). Aman dipanggil berulang: peti yang sudah ada tidak
     diduplikasi. Posisinya mengikuti arenaCenter, jadi ikut berpindah bila
     arena dungeon itu berada di pojok — bukan lagi dipatok ke pusat. */
  spawnBossChest(d){
    if(!d||this.bossChest[d.key])return null;            // sudah dipanen
    /* jangan pasang dua kali untuk dungeon yang sama */
    for(const f of Furni.list)
      if(f.def==='bchest'&&f.dkey===d.key)return f;
    const c=this.arenaCenter(d);
    const y=Math.max(CFG.SEA,World.topY(Math.floor(c.x),Math.floor(c.z)));
    const f=Furni.place('bchest',c.x,y,c.z,0,true);
    if(f){f.dkey=d.key;f.lvl=d.lvl;}
    return f;
  },

  /* ---------- membuka peti boss ---------- */
  openBossChest(f){
    const k=f.dkey;
    if(!k)return;
    if(this.bossChest[k]){UI.toast('👑 Peti Penjaga Agung sudah kosong');return;}
    this.bossChest[k]=true;this.save();
    const lvl=clamp(f.lvl||1,1,WGEN.DUNGEON_MAX_LVL);
    const got=[];
    const add=(id,n)=>{
      if(!ITEMS[id]||n<=0)return;
      RPG.addItem(id,n);got.push(`${ITEMS[id].e} ${ITEMS[id].n} ×${n}`);
    };
    /* --- 1. bahan pasti: tabel harta level itu, porsi besar --- */
    const table=this.lootTableFor(lvl);
    const mul=this.lvlLootMul(lvl)*1.6;
    for(const e of table)
      add(e[0],Math.max(1,Math.round(
        (e[1]+Math.floor(Math.random()*(e[2]-e[1]+1)))*mul)));
    add('boss_core',1+Math.floor(lvl/3));
    /* --- 2. item langka (10%) --- */
    let rareGot=null;
    if(Math.random()<this.RARE_CHANCE){
      const pool=this.RARE_POOL.filter(id=>ITEMS[id]);
      if(pool.length){
        rareGot=pool[(Math.random()*pool.length)|0];
        add(rareGot,1);
      }
    }
    /* --- 3. equipment, rarity mengikuti level dungeon --- */
    const gear=this.rollGear(lvl);
    if(gear)add(gear.id,1);

    /* --- animasi & pengumuman --- */
    f.lidOpen=true;
    FX.debris(new THREE.Vector3(f.x,f.y+1.1,f.z),0xffd76b,30,4);
    FX.ring(f.x,f.y+0.1,f.z,0xffd76b,1.4,5);
    Sfx.pickup();Sfx.levelup();
    /* XP peti boss: setara satu peti biasa ×3 karena hanya ada satu per dungeon */
    Player.addXP(Math.round((12+lvl*8)*(1+0.25*(lvl-1))*3));
    UI.toast(`👑 PETI PENJAGA AGUNG (Lv ${lvl}): ${got.join(', ')||'kosong'}`);
    if(gear){
      const R=RARITY[gear.rar]||RARITY.common;
      UI.toast(`${R.e} ${ITEMS[gear.id].e} ${ITEMS[gear.id].n} — ${R.n}!`);
      /* legendaris = rarity tertinggi (2% di level 10): rayakan lebih meriah */
      if(gear.rar==='legendary'){
        FX.ring(f.x,f.y+0.1,f.z,R.c,1.8,8);
        FX.debris(new THREE.Vector3(f.x,f.y+1.3,f.z),R.c,36,5);
      }
    }
    if(rareGot)UI.toast(`✨ Temuan langka: ${ITEMS[rareGot].e} ${ITEMS[rareGot].n}!`);
    UI.renderAll();
  },

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
    /* PETI EMAS PENJAGA AGUNG: model tersendiri (PortGoldChest) — badan emas
       berlapis, pilar sudut bertakhta permata, tutup berundak bermahkota, dan
       tumpukan batangan emas di dalamnya. Diperbesar BOSS_CHEST_SCALE× lagi
       sehingga terlihat dari kejauhan sebagai hadiah utama. Radius interaksi
       ikut diperlebar karena badannya jauh lebih besar. */
    Furni.DEFS.bchest={
      n:'Peti Emas Penjaga Agung',e:'👑',item:null,r:2.8,
      label:'👑 Buka Peti Emas',
      build(){
        const g=(typeof PortGoldChest!=='undefined')?PortGoldChest.build():
                (typeof PortChest!=='undefined')?PortChest.build():
                Dungeon.buildChest();
        g.scale.setScalar(Dungeon.BOSS_CHEST_SCALE);
        return g;
      },
      use(f){Dungeon.openBossChest(f);},
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

  /* ---------- PUSAT ARENA BOSS dalam koordinat dunia ----------
     Arena tidak lagi selalu di tengah (lihat WGEN.dungeonInCell): letaknya
     diacak ke pusat / pojok / tengah sisi. Satu pintu untuk penempatan boss,
     peti emasnya, dan penghindaran titik peti biasa. `+0.5` menaruhnya di
     tengah blok. */
  arenaCenter(d){
    return {x:d.x+(d.arenaX||0)+0.5,z:d.z+(d.arenaZ||0)+0.5};
  },
  /* Radius dalam yang aman untuk menaruh benda. Gua berdinding melengkung
     sehingga ruang terbukanya jauh lebih sempit dari kotak r; caveClearR
     memakai gelombang terburuk supaya peti selalu berada di ruang terbuka,
     bukan tertanam di dalam batu. */
  innerLimit(d){
    return (d.kind==='cave')?WGEN.caveClearR(d.r):d.r-2;
  },

  /* Apakah titik (px,pz) layak untuk menaruh peti / memunculkan penjaga?
     Syarat: kolomnya RUANG TERBUKA sungguhan menurut dungeonOpenAt (bukan
     tembok, dinding gua, puing, atau stalagmit) DAN berada di luar arena boss
     beserta bantalannya. Memakai predikat yang sama dengan buildDungeonPart
     sehingga tidak mungkin ada peti yang tertanam di dalam batu. */
  spotFree(d,px,pz){
    const lx=Math.round(px-0.5)-d.x, lz=Math.round(pz-0.5)-d.z;
    if(!dungeonOpenAt(d,lx,lz))return false;
    const ac=this.arenaCenter(d);
    const pad=(d.ar||4)+1;                     // +1 = jangan menempel tepi arena
    if(Math.abs(px-ac.x)<=pad&&Math.abs(pz-ac.z)<=pad)return false;
    return true;
  },

  /* ---------- posisi peti dalam satu dungeon (deterministik) ---------- */
  /* JUMLAH PETI: acak 4..6 untuk SEMUA level dungeon (permintaan pengguna).
     Dulu 3 + visualLvl → 4 peti di Lv 1 tapi 23 peti di Lv 20+, dan di gua yang
     sempit itu berarti peti berjejer memenuhi seluruh ruangan. Sekarang
     jumlahnya tidak lagi bergantung level; yang membedakan level tinggi adalah
     ISI petinya (lootTableFor + lvlLootMul), bukan banyaknya.
     Diundi dari hash lokasi supaya satu dungeon selalu punya jumlah yang sama
     di setiap kunjungan. */
  CHEST_MIN:4,
  CHEST_MAX:6,
  chestCount(d){
    const span=this.CHEST_MAX-this.CHEST_MIN+1;
    return this.CHEST_MIN+clamp(Math.floor(WGEN.hash(d.x,d.z,613)*span),0,span-1);
  },
  chestSpots(d){
    const out=[];
    const n=this.chestCount(d);
    const lim=this.innerLimit(d);
    const ri=Math.max(3,Math.floor(d.r/2));
    for(let i=0;i<n;i++){
      /* sebar di kuadran ruangan, hindari lorong salib & tembok */
      const q=i%4, ring=2+Math.floor(i/4)*3;
      const sx=(q===0||q===3)?-1:1, sz=(q<2)?-1:1;
      const off=Math.min(lim,ri-1+ring);
      const jx=Math.floor(WGEN.hash(d.x+i,d.z-i,201)*2);
      const jz=Math.floor(WGEN.hash(d.x-i,d.z+i,203)*2);
      let px=d.x+sx*(off-jx)+0.5, pz=d.z+sz*(off-jz)+0.5;
      /* ---------- HINDARI ARENA BOSS & DINDING ----------
         Arena kini bisa berada di pojok, tepat di tempat peti dulu diletakkan;
         gua juga berdinding melengkung sehingga titik kuadran bisa jatuh di
         dalam batu. Bila titik awalnya tidak sah, dicari titik pengganti dengan
         menyusut ke arah pusat lalu memutari 8 arah — semuanya deterministik
         (tanpa Math.random) supaya letak peti selalu sama di kunjungan berikut. */
      if(!this.spotFree(d,px,pz)){
        let fixed=false;
        for(let t=off;t>=2&&!fixed;t--){
          for(let a=0;a<8&&!fixed;a++){
            const ang=(a/8)*Math.PI*2+(i*0.37);
            const cx2=d.x+Math.round(Math.cos(ang)*t)+0.5;
            const cz2=d.z+Math.round(Math.sin(ang)*t)+0.5;
            if(this.spotFree(d,cx2,cz2)){px=cx2;pz=cz2;fixed=true;}
          }
        }
      }
      out.push({x:px,z:pz,i});
    }
    return out;
  },

  /* ---------- membuka peti ---------- */
  openChest(f){
    const key=f.ckey;
    if(this.opened[key]){UI.toast('🧰 Peti ini sudah kosong');return;}
    this.opened[key]=true;this.save();
    const lvl=clamp(f.lvl||1,1,WGEN.DUNGEON_MAX_LVL);
    const table=this.lootTableFor(lvl);
    const rolls=2+Math.floor(Math.random()*2)+(lvl>=6?1:0)+(lvl>=9?1:0);
    const mul=this.lvlLootMul(lvl);
    const got=[];
    for(let i=0;i<rolls;i++){
      const e=table[(Math.random()*table.length)|0];
      if(!ITEMS[e[0]])continue;
      const n=Math.max(1,Math.round(
        (e[1]+Math.floor(Math.random()*(e[2]-e[1]+1)))*mul));
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
    /* XP peti ikut level dungeon (dulu 12+lvl*8 datar) */
    Player.addXP(Math.round((12+lvl*8)*(1+0.25*(lvl-1))));
    UI.toast(`🧰 Harta Dungeon Lv ${lvl}: ${got.join(', ')||'kosong'}`);
    UI.renderAll();
  },

  /* =========================================================================
     UPDATE: buat peti saat mendekat, spawn penjaga, notifikasi masuk
     ========================================================================= */
  update(dt){
    if(!Game.started)return;
    /* periksa dungeon yang waktunya reset (10 menit setelah boss dikalahkan) */
    this.tickReset();
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
      /* PETI BOSS: bila bossnya sudah tumbang di kunjungan lalu tapi petinya
         belum dipanen, peti itu dipasang kembali di sini. Tanpa cabang ini
         pemain yang keluar dungeon sebelum membuka peti akan kehilangan
         hadiahnya selamanya (peti hanya pernah dibuat di onBossKilled). */
      if(this.bossKilled[near.d.key]&&!this.bossChest[near.d.key])
        this.spawnBossChest(near.d);
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

    /* --- status di dalam dungeon ---
       CATATAN BUG: dulu dibandingkan `this.active!==near.d`. nearestDungeon()
       membuat objek dungeon BARU tiap frame, jadi perbandingan objek selalu
       benar dan notifikasi "memasuki reruntuhan" muncul terus-menerus.
       Sekarang yang dibandingkan kuncinya (string), bukan objeknya. */
    const inside=near&&near.dist<=near.d.r;
    const key=inside?near.d.key:null;
    if(inside&&this.activeKey!==key){
      this.active=near.d;this.activeKey=key;
      /* BANNER BESAR di tengah layar. Bila boss akhir sudah tumbang, judulnya
         berganti menjadi "DUNGEON CLEAR" (lihat UI.dungeonBanner) sehingga
         pemain langsung tahu tempat ini sudah ditaklukkan tanpa harus membaca
         toast. bossKilled dikirim terpisah dari cleared karena boss bisa sudah
         mati sementara masih ada peti yang belum dikuras. */
      const done=!!this.cleared[key],bossDown=!!this.bossKilled[key];
      /* nama jenis: reruntuhan bisa berupa BENTENG persegi atau GUA berkubah */
      const kindName=near.d.kind==='cave'?'Gua':'Benteng';
      /* sisa hitung mundur pulihnya dungeon (reset otomatis setelah boss
         tumbang) — ikut ditampilkan di banner besar & toast */
      const rr=(done||bossDown)?this.resetRemain(key):-1;
      if(UI.dungeonBanner)UI.dungeonBanner(near.d.lvl,done,bossDown,kindName,rr);
      const fmt=s=>Math.floor(s/60)+' mnt '+(s%60)+' dtk';
      UI.toast(done
        ? `🏛️ ${kindName} Lv ${near.d.lvl} (sudah ditaklukkan${rr>=0?' · pulih dalam '+fmt(rr):''})`
        : bossDown
        ? `👑 ${kindName} Lv ${near.d.lvl} — Penjaga Agung tumbang${rr>=0?' · pulih dalam '+fmt(rr):''}, sisa peti belum dikuras`
        : `⚔️ ${kindName} Lv ${near.d.lvl} · untuk pemain Lv ${this.bandText(near.d.lvl)}`);
      /* dungeon yang sudah beres tidak lagi menggeram menyeramkan */
      if(done||bossDown){if(Sfx.levelup)Sfx.levelup();}
      else Sfx.growl();
    }else if(inside){
      this.active=near.d;                       // segarkan objek, kunci tetap
    }else if(this.activeKey&&(!near||near.dist>near.d.r+4)){
      this.active=null;this.activeKey=null;
      UI.toast('🚪 Kau meninggalkan dungeon');
    }
    if(inside)this.checkClear(near.d);

    /* --- penjaga: monster tambahan hanya di dalam benteng --- */
    if(!this.active)return;
    if(this.cleared[this.activeKey])return;     // sudah ditaklukkan → tenang
    this.spawnT-=dt;
    if(this.spawnT>0)return;
    this.spawnT=3.5;
    const d=this.active;
    /* ---------- BOSS AKHIR: SATU per dungeon ----------
       Diprioritaskan sebelum mob biasa. Tipe dipilih ACAK-DETERMINISTIK dari
       daftar boss (hash lokasi), jadi tiap dungeon punya boss tetap yang sama
       setiap kali dikunjungi. Ukurannya mini-boss (Monsters.make(...,true))
       tapi statnya diatur Dungeon.scaleMob supaya mengikuti level dungeon,
       bukan pengali boss dunia luar (CFG.BOSS_HP_MUL ×6).
       Mob biasa TIDAK PERNAH mini boss lagi (dulu lvl≥4 mempromosikan penjaga
       acak menjadi boss). */
    const bossAlive=Monsters.list.some(m=>!m.dead&&m.dboss&&
      Math.max(Math.abs(m.pos.x-d.x),Math.abs(m.pos.z-d.z))<=d.r+2);
    const needBoss=!this.bossKilled[d.key]&&!bossAlive;
    const guards=Monsters.list.filter(m=>!m.dead&&
      Math.max(Math.abs(m.pos.x-d.x),Math.abs(m.pos.z-d.z))<=d.r+1).length;
    /* kuota penjaga mengikuti level visual (dijenuhkan ~Lv 20), jadi dungeon
       Lv 100 tidak memanggil 90 penjaga — jumlahnya sama dengan Lv 20. */
    const cap=3+Math.round(WGEN.visualLvl(d.lvl)*0.9);
    if(!needBoss&&guards>=cap)return;
    /* titik spawn acak di dalam benteng, jangan tepat di wajah pemain.
       BOSS muncul di ARENA-nya — yang letaknya diacak per dungeon (pusat,
       pojok, atau tengah sisi), bukan lagi selalu di pusat.
       Penjaga biasa dijaga agar TIDAK muncul di dalam arena: arena harus tetap
       bersih & lapang untuk pertarungan boss. */
    let x=0,z=0,ok=false;
    const ac=this.arenaCenter(d);
    if(needBoss){x=ac.x;z=ac.z;ok=true;}
    else{
      const lim=this.innerLimit(d);
      for(let t=0;t<14&&!ok;t++){
        x=d.x+rand(-lim,lim);z=d.z+rand(-lim,lim);
        if(Math.hypot(x-Player.pos.x,z-Player.pos.z)<=6)continue;
        if(!this.spotFree(d,x,z))continue;      // di dalam batu / di arena boss
        ok=true;
      }
    }
    if(!ok)return;
    let type;
    if(needBoss){
      type=this.bossTypeFor(d);
    }else{
      const pool=BIOME_INFO[d.biome].mobs;
      type=pool[(Math.random()*pool.length)|0];
      if(d.lvl>=5&&Math.random()<0.4)type='golem';
      /* ---------- REAPER: penjaga khas reruntuhan ----------
         Hantu hitam bersabit yang HANYA muncul di dalam dungeon (tipe ini tidak
         ada di BIOME_INFO.mobs mana pun, jadi tak bisa muncul di alam bebas).
         Peluangnya naik bersama level dungeon; level 1 masih dijaga mob biasa
         supaya awal permainan tidak terlalu berat. */
      if(d.lvl>=2&&Math.random()<reaperChance(d.lvl))type='reaper';
    }
    /* ---------- TINGGI SPAWN: LANTAI DUNGEON, BUKAN PUNCAK KUBAH ----------
       BUGFIX: dulu memakai World.topY(), yang memindai kolom dari ATAS ke bawah
       dan mengembalikan blok padat tertinggi. Di dalam GUA, blok tertinggi
       adalah KUBAH BATU-nya, sehingga topY() mengembalikan ceil+2 dan semua
       penjaga muncul DI ATAS gua, bukan di dalamnya.
       Lantai dungeon selalu diratakan ke CFG.SEA (lihat worldgen.js: `const
       h=(village||dung)?CFG.SEA:...`), jadi itulah tinggi yang benar — sama
       dengan yang sudah dipakai penempatan peti. */
    const y=CFG.SEA;
    /* Mob biasa dungeon TIDAK PERNAH mini boss; hanya boss akhir yang memakai
       ukuran & penanda boss.

       UKURAN BOSS: memakai opts.scaleMul (skala RELATIF terhadap ukuran alami
       model) supaya besarnya benar-benar "seukuran mini boss" untuk SEMUA tipe.
       Tanpa ini, skala boss bawaan bersifat ABSOLUT (g.scale ditimpa 1.75)
       sehingga rasio pembesarannya bergantung skala alami model: boss golem
       jadi 1.75/0.41 = 4.3x (tinggi ~12.8 blok, menembus atap arena) dan boss
       lizard 7.6x, sementara boss serigala hanya 1.75x. Dengan mode relatif
       semuanya naik 1.75x dari ukuran normalnya. */
    const m=Monsters.make(type,new THREE.Vector3(x,Math.max(CFG.SEA,y),z),!!needBoss,
      needBoss?{scaleMul:Monsters.BOSS_SCALE_MUL}:undefined);
    /* stat penjaga mengikuti LEVEL DUNGEON (kalibrasi di scaleMob) */
    this.scaleMob(m,d.lvl,!!needBoss);
    m.dkey=d.key;
    Monsters.list.push(m);
    if(needBoss){
      const nm=(typeof MOB_NAME!=='undefined'&&MOB_NAME[type])?MOB_NAME[type]:type;
      UI.toast(`☠️ Penjaga Agung ${nm} — Dungeon Lv ${d.lvl} terbangun!`);
      FX.ring(x,Math.max(CFG.SEA,y)+0.1,z,0xff6bd6,1.2,5);
      if(typeof Sfx!=='undefined'&&Sfx.roar)Sfx.roar();
    }
  },

  /* ---------- TIPE BOSS AKHIR (acak tapi tetap per dungeon) ----------
     Dipilih dari mob yang punya AI penuh & terasa layak jadi boss. Hash
     memakai koordinat dungeon sehingga boss satu lokasi selalu sama. */
  BOSS_POOL:['golem','yeti','reaper','kumbang','semut','lizard','wolf','scorpion','boar'],
  bossTypeFor(d){
    const pool=this.BOSS_POOL.filter(t=>Monsters.TYPES[t]);
    if(!pool.length)return 'golem';
    const i=Math.floor(WGEN.hash(d.x,d.z,4477)*pool.length)%pool.length;
    return pool[i];
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
    /* BOSS AKHIR wajib sudah dikalahkan sebelum dungeon dianggap ditaklukkan */
    if(!this.bossKilled[k])return;
    const alive=Monsters.list.some(m=>!m.dead&&
      Math.max(Math.abs(m.pos.x-d.x),Math.abs(m.pos.z-d.z))<=d.r+1);
    if(alive)return;
    this.cleared[k]=true;this.save();
    this.clearReward(d);
  },
  /* Dipanggil Monsters.kill saat boss dungeon tumbang (lihat hook di bawah). */
  onBossKilled(m){
    const k=m&&m.dkey;
    if(!k||this.bossKilled[k])return;
    this.bossKilled[k]=true;
    /* catat waktu kematian boss untuk RESET 10 MENIT: lewat masa itu, seluruh
       dungeon (mob + peti) kembali dan levelnya diundi ulang acak 1..100. */
    this.killedAt[k]=Date.now();
    this.save();
    const lvl=m.dlvl||1;
    UI.toast(`👑 Penjaga Agung Dungeon Lv ${lvl} dikalahkan! Kuras semua peti untuk menaklukkannya.`);
    UI.toast(`⏳ Dungeon akan pulih dalam ${Math.round(this.RESET_MS/60000)} menit dengan level acak baru.`);
    FX.ring(m.pos.x,m.pos.y+0.1,m.pos.z,0xffd24d,1.4,7);
    if(typeof Sfx!=='undefined'&&Sfx.levelup)Sfx.levelup();
    /* ---------- PETI EMAS MUNCUL DI ARENA BOSS ----------
       Hadiah utama atas boss: satu peti emas besar di arena tempat ia jatuh,
       berisi bahan pasti + peluang item langka + satu equipment yang rarity-nya
       mengikuti level dungeon. Dungeon dicari lewat nearestDungeon (bukan
       m.dkey saja) karena onBossKilled hanya menerima mob, bukan objek
       dungeonnya. */
    const near=WGEN.nearestDungeon(m.pos.x,m.pos.z);
    const d=(near&&near.d.key===k)?near.d:null;
    if(d&&!this.bossChest[k]){
      const f=this.spawnBossChest(d);
      if(f){
        FX.ring(f.x,f.y+0.1,f.z,0xffd76b,1.6,7);
        UI.toast('🧰 Peti emas muncul di arena Penjaga Agung!');
      }
    }
  },

  /* =========================================================================
     RESET 10 MENIT SETELAH BOSS DIKALAHKAN
     -------------------------------------------------------------------------
     Setelah boss dikalahkan, dungeon menyimpan waktu kematiannya (killedAt).
     Setiap kali dungeon itu dievaluasi lagi (lihat tickReset, dipanggil dari
     update), bila sudah lewat RESET_MS, seluruh statusnya dihapus:
        bossKilled, bossChest, cleared, opened (peti biasa), changedLvl (changer)
     lalu LEVELNYA diundi ulang ACAK 1..100. Hasilnya mob & peti kembali dan
     dungeon bisa ditaklukkan lagi dengan level baru.
     ========================================================================= */
  resetDungeon(k){
    delete this.bossKilled[k];
    delete this.bossChest[k];
    delete this.cleared[k];
    delete this.changedLvl[k];
    delete this.killedAt[k];
    /* hapus semua peti biasa milik dungeon ini (kunci peti = 'key:index') */
    for(const ck in this.opened)if(ck.indexOf(k+':')===0)delete this.opened[ck];
    /* level acak baru 1..100 */
    const nl=1+Math.floor(Math.random()*WGEN.DUNGEON_MAX_LVL);
    this.changedLvl[k]=nl;
    this.save();
    UI.toast(`🔄 Sebuah dungeon pulih kembali — kini Lv ${nl}!`);
    return nl;
  },
  /* Dipanggil tiap update untuk memeriksa apakah ada dungeon yang waktunya
     reset. Murah: hanya memindai kunci killedAt (biasanya sedikit). */
  tickReset(){
    if(!this._lastResetT)this._lastResetT=0;
    const now=Date.now();
    if(now-this._lastResetT<5000)return;   // cukup diperiksa tiap 5 detik
    this._lastResetT=now;
    for(const k in this.killedAt){
      if(now-this.killedAt[k]>=this.RESET_MS)this.resetDungeon(k);
    }
  },
  /* Sisa detik sampai dungeon ini reset (untuk HUD/toast), atau -1. */
  resetRemain(k){
    const t=this.killedAt[k];
    if(!t)return -1;
    return Math.max(0,Math.ceil((this.RESET_MS-(Date.now()-t))/1000));
  },

  /* =========================================================================
     DUNGEON CHANGER
     -------------------------------------------------------------------------
     Mengubah level dungeon yang sedang dimasuki pemain ke level item. Berlaku
     sampai reset berikutnya (sesuai keputusan pengguna). Hanya boleh dipakai
     DI DALAM dungeon; bila di luar, panggilan ini tidak pernah terjadi karena
     logika use di item sudah menolak lebih dulu (lihat rpg.js useDungeonChanger).
     Mengubah level menghapus status cleared/boss supaya dungeon bisa
     ditaklukkan lagi pada level barunya, dan menghapus penjaga/boss yang masih
     hidup (mereka di-spawn ulang pada level baru). */
  applyChanger(d,newLvl){
    if(!d)return false;
    const k=d.key;
    const nl=clamp(Math.round(newLvl),1,WGEN.DUNGEON_MAX_LVL);
    this.changedLvl[k]=nl;
    /* bersihkan status clear/boss agar bisa ditaklukkan lagi di level baru */
    delete this.cleared[k];
    delete this.bossKilled[k];
    delete this.bossChest[k];
    delete this.killedAt[k];
    for(const ck in this.opened)if(ck.indexOf(k+':')===0)delete this.opened[ck];
    /* singkirkan penjaga/boss lama di dalam dungeon ini */
    for(const m of Monsters.list){
      if(m.dkey===k&&!m.dead){m.dead=true;if(m.mesh&&Game.scene)Game.scene.remove(m.mesh);}
    }
    d.lvl=nl;
    this.save();
    /* TAMPILKAN BANNER DUNGEON DENGAN LEVEL BARU: pemain langsung melihat banner berubah */
    const kindName=d.kind==='cave'?'Gua':'Benteng';
    if(typeof UI!=='undefined'&&UI.dungeonBanner){
      UI.dungeonBanner(nl,false,false,kindName,-1);
    }
    return true;
  },

  clearReward(d){
    const lvl=clamp(d.lvl,1,WGEN.DUNGEON_MAX_LVL);
    const got=[];
    const add=(id,n)=>{
      if(!ITEMS[id]||n<=0)return;
      RPG.addItem(id,n);got.push(`${ITEMS[id].e} ${ITEMS[id].n} ×${n}`);
    };
    /* hadiah pasti: satu tumpuk penuh tiap bahan dari tabel harta level itu */
    for(const e of this.lootTableFor(lvl))add(e[0],Math.round(e[2]*(0.6+lvl*0.2)));
    add('bread',2+lvl);
    if(lvl>=5)add('crystal',lvl);
    if(lvl>=8)add('boss_core',Math.floor(lvl/4));
    /* XP penaklukan: 20% dari KEBUTUHAN XP LEVEL PEMAIN SAAT INI (dulu 25% dari
       level tengah band dungeon — dungeon D80 memberi 59% XP level Lv83 pemain,
       meleset jauh dari tujuan "lompatan besar"). Kini dungeon berapa pun
       levelnya memberi porsi yang sama dari level pemain, jadi penaklukan
       selalu terasa besar tapi tidak pernah melelempar exp bar. */
    const xp=Math.round(CFG.playerXpNeed(Player.level)*0.20);
    Player.addXP(xp);
    /* koin ikut level dungeon */
    if(RPG.addCoin)RPG.addCoin(40+lvl*35,true);
    Player.hp=Player.maxHp();                    // dipulihkan sebagai bonus
    FX.ring(Player.pos.x,Player.pos.y+0.1,Player.pos.z,0xffe066,1.4,6);
    FX.debris(Player.pos.clone().add(new THREE.Vector3(0,1.2,0)),0xffe066,26,3.5);
    Sfx.levelup();
    UI.toast(`🏆 Dungeon Lv ${lvl} DITAKLUKKAN! +${xp} XP, HP pulih`);
    UI.toast(`🎁 Hadiah: ${got.join(', ')||'—'}`);
    UI.renderAll();
  },

  /* =========================================================================
     PERABOT KHAS RERUNTUHAN (model dari Model.html)
     -------------------------------------------------------------------------
     Barel kayu berpalang besi dipasang berkelompok di dalam benteng sebagai
     penanda ruang penyimpanan. Murni tampilan.

     CATATAN: wujud "WRAITH" (jubah hitam polos yang dulu ditempelkan ke mob
     biasa lewat dressGuard) sudah DIHAPUS. Penjaga hantu reruntuhan sekarang
     adalah mob REAPER sungguhan — tipe sendiri dengan model, animasi, dan empat
     serangan dari NEW MODEL/reaper.html (lihat js/entities/mob_reaper.js).
     Wraith lama hanya menyembunyikan mesh mob aslinya, sehingga stat & AI-nya
     tetap milik slime/serigala/dsb — tidak pernah benar-benar jadi hantu.
     ========================================================================= */
  props:{},

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
  /* pasang beberapa kelompok barel di sudut dalam benteng.
     GUA tidak memakai barel (tidak ada penghuni yang menyimpan apa pun di
     sana), dan sudut yang jatuh di dalam ARENA BOSS dilewati supaya arena
     tetap bersih & lapang. */
  buildProps(d){
    if(this.props[d.key])return;
    const arr=[];
    if(d.kind==='cave'){this.props[d.key]=arr;return;}
    const spots=[[-1,-1],[1,-1],[-1,1],[1,1]];
    for(let i=0;i<spots.length;i++){
      if(WGEN.hash(d.x+i*7,d.z-i*3,21)>0.55)continue;   // tidak semua sudut isi
      const[sx,sz]=spots[i];
      const px=d.x+sx*(d.r-2.5),pz=d.z+sz*(d.r-2.5);
      if(!this.spotFree(d,px,pz))continue;              // di arena / di dinding
      const g=this.makeBarrels();
      g.position.set(px,CFG.SEA,pz);
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

  /* ---------- simpan status peti, boss, & dungeon yang sudah ditaklukkan ---------- */
  save(){
    try{localStorage.setItem(this.SAVE_KEY,
      JSON.stringify({o:this.opened,c:this.cleared,b:this.bossKilled,
                      bc:this.bossChest,ka:this.killedAt,cl:this.changedLvl}));}catch(e){}
  },
  load(){
    try{
      const o=JSON.parse(localStorage.getItem(this.SAVE_KEY));
      if(!o||typeof o!=='object')return;
      /* format lama: objek peti langsung; format baru: {o,c,b,bc,ka,cl} */
      if(o.o||o.c||o.b||o.bc){
        this.opened=o.o||{};this.cleared=o.c||{};this.bossKilled=o.b||{};
        this.bossChest=o.bc||{};
        this.killedAt=o.ka||{};this.changedLvl=o.cl||{};
      }
      else this.opened=o;
    }catch(e){}
  },
};

/* =============================================================================
   HOOK: boss dungeon yang tumbang dicatat Dungeon.onBossKilled
   -----------------------------------------------------------------------------
   Membungkus Monsters.kill (pola yang sama dipakai quest.js) sehingga
   monsters.js tidak perlu tahu apa pun tentang dungeon.
   ============================================================================= */
(function(){
  if(typeof Monsters==='undefined'||!Monsters.kill)return;
  const _kill=Monsters.kill.bind(Monsters);
  Monsters.kill=function(m){
    const wasBoss=m&&m.dboss&&m.dkey;
    _kill(m);
    if(wasBoss&&typeof Dungeon!=='undefined')Dungeon.onBossKilled(m);
  };
})();

if(typeof window!=='undefined'){
  window.Dungeon=Dungeon;
  if(typeof WGEN!=='undefined'){
    window.midLevel=WGEN.midLevel;
    window.bandRange=WGEN.bandRange;
    window.bandText=WGEN.bandText;
  }
}
