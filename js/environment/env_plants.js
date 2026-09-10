'use strict';
/* =============================================================================
   ENVIRONMENT: TUMBUHAN VOXEL
   File: js/environment/env_plants.js
   -----------------------------------------------------------------------------
   Diporting dari "NEW MODEL/tumbuhan.html" & "NEW MODEL/Tumbuhan new.html".
   Berbeda dari tanaman lama yang hanya billboard cross-quad (tile atlas), semua
   tumbuhan di sini adalah MODEL VOXEL sungguhan. Supaya tetap murah, model
   TIDAK dibuat sebagai Object3D per tanaman: file ini hanya menyiapkan DAFTAR
   WAJAH (face list) per tipe, lalu js/mesher.js menyalinnya ke dalam satu
   geometri "flora" per chunk.

   Sebaran biome diatur WGEN.plantAt (js/worldgen.js):
     1  rumput (grass tuft) → semua biome darat (paling umum)   [4 varian]
     2  bunga hangat        → hutan (merah/oranye/kuning)        [4 varian]
     3  bunga sejuk         → hutan (biru/putih/ungu)            [4 varian]
     5  jamur               → hutan lembap & tundra              [2 varian]
     7  semak beri          → hutan & tanah merah (sumber beri)
     8  kaktus              → gurun
     9  tebu                → hutan
     10 tulip               → hutan (ladang bunga)
   (tipe 6 = tumbuhan merah REDLANDS tetap billboard.)

   Beberapa tipe punya BEBERAPA VARIAN: mesher mengundi varian dari koordinat
   dunia (deterministik) supaya ladang bunga/rumput tidak terlihat seperti klon.

   `sway` dipakai mesher menghitung atribut aSway (amplitudo angin per verteks)
   — kaktus nyaris kaku, rumput & bunga paling lentur.

   VOXEL BERSKALA & BEROTASI: model dari "Tumbuhan new.html" memakai kotak tipis
   berukuran & berputar (bilah rumput, kelopak bunga). Karena itu add() menerima
   sx,sy,sz,rx,ry,rz opsional dan compile() memakai matriks transform (bukan
   sekadar kubus satuan). Voxel satuan tanpa rotasi tetap di-cull seperti biasa.
   ============================================================================= */

const Env_Plants=(()=>{

  /* random deterministik: sama seperti file asli supaya warnanya identik */
  const hash=(x,y,z)=>{const s=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return s-Math.floor(s);};
  const pickC=(a,x,y,z)=>a[Math.floor(hash(x,y,z)*a.length)%a.length];

  /* ---------- kontainer voxel dengan uji hunian (untuk culling wajah) ----------
     add(x,y,z,c[,sx,sy,sz,rx,ry,rz]) — argumen setelah warna opsional (default
     kubus satuan tanpa rotasi), mengikuti API "Tumbuhan new.html". Voxel
     berskala/berotasi memakai key posisi mentah supaya tidak bentrok. */
  function newVox(){
    return {
      list:[],occ:new Set(),
      has(x,y,z){return this.occ.has(x+','+y+','+z);},
      add(x,y,z,c,sx,sy,sz,rx,ry,rz){
        const k=x+','+y+','+z;
        if(this.occ.has(k))return;
        this.occ.add(k);
        this.list.push({x,y,z,c,
          sx:sx===undefined?1:sx,sy:sy===undefined?1:sy,sz:sz===undefined?1:sz,
          rx:rx||0,ry:ry||0,rz:rz||0});
      },
    };
  }

  /* wajah kubus: normal, faktor shading, dan 4 sudut (urutan CCW) */
  const FACES=[
    {d:[0,0,1], n:[0,0,1], sh:1.00, v:[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]},
    {d:[0,0,-1],n:[0,0,-1],sh:0.82, v:[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]},
    {d:[1,0,0], n:[1,0,0], sh:0.92, v:[[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]]},
    {d:[-1,0,0],n:[-1,0,0],sh:0.86, v:[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]]},
    {d:[0,1,0], n:[0,1,0], sh:1.10, v:[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]]},
    {d:[0,-1,0],n:[0,-1,0],sh:0.68, v:[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]]},
  ];

  /* ================= SEMAK BERI ================= */
  function buildBush(){
    const b=newVox();
    b.add(0,0,0,0x7a4a21);                       // pangkal batang
    const G=[0x2f6b2f,0x3e8942,0x55a34c];
    const shade=(x,y,z)=>{
      const h=hash(x,y,z);
      if(y<=0)return h<0.6?G[0]:G[1];
      return h<0.2?G[0]:h<0.75?G[1]:G[2];
    };
    const layer=(y,r,cut)=>{
      for(let x=-r;x<=r;x++)for(let z=-r;z<=r;z++){
        if(cut&&Math.abs(x)===r&&Math.abs(z)===r)continue;
        if(hash(x*5,y,z*3)<0.06)continue;
        b.add(x,y,z,shade(x,y,z));
      }
    };
    layer(0,1,false);layer(1,2,true);layer(2,2,true);
    layer(3,1,false);layer(4,1,true);
    b.add(0,5,0,0x55a34c);
    /* beri merah & jingga bertebaran di dedaunan atas */
    for(const v of b.list){
      if(v.y<1)continue;
      const h=hash(v.x*7,v.y*3,v.z*11);
      if(h>0.88)v.c=0xd8342c;
      else if(h>0.83)v.c=0xe88a2d;
    }
    b.add(2,0,1,0xd8342c);b.add(-2,0,-1,0xd8342c);
    return b;
  }

  /* ================= KAKTUS ================= */
  function buildCactus(){
    const b=newVox();
    const gc=(x,y,z)=>{
      const h=hash(x*3,y,z*7),corner=(x!==0&&z!==0);
      if(corner)return h<0.6?0x2e7a35:0x3c8c40;
      if(h<0.12)return 0x2e7a35;
      if(h<0.28)return 0x69b95e;
      if(h>0.94)return 0xd9ecc3;
      return 0x4aa04d;
    };
    /* badan utama 3×3 */
    for(let y=0;y<=10;y++)for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)b.add(x,y,z,gc(x,y,z));
    [[1,0],[-1,0],[0,1],[0,-1],[0,0]].forEach(([x,z])=>b.add(x,11,z,gc(x,11,z)));
    b.add(0,12,0,0x69b95e);
    /* lengan kiri + bunga di ujungnya */
    for(const y of[4,5])for(const x of[-2,-3])for(const z of[-1,0])b.add(x,y,z,gc(x,y,z));
    for(let y=6;y<=10;y++)for(const x of[-3,-2])for(const z of[-1,0])b.add(x,y,z,gc(x,y,z));
    for(const x of[-3,-2])for(const z of[-1,0])b.add(x,11,z,0x7cc46b);
    b.add(-3,12,-1,0xffd75e);
    b.add(-2,12,0,0xffb74d);
    /* lengan kanan */
    for(const y of[7,8])for(const x of[2,3])for(const z of[0,1])b.add(x,y,z,gc(x,y,z));
    for(let y=9;y<=11;y++)for(const x of[2,3])for(const z of[0,1])b.add(x,y,z,gc(x,y,z));
    for(const x of[2,3])for(const z of[0,1])b.add(x,12,z,0x7cc46b);
    return b;
  }

  /* ================= TEBU (SUGAR CANE) =================
     Beda dari bambu: batang lebih pendek & gemuk, warnanya kuning-hijau
     kemerahan dengan RUAS ungu tiap 3 voxel, dan daunnya bilah panjang yang
     merumpun di ujung atas (bukan cabang menyebar di sepanjang batang). */
  function buildSugarCane(){
    const b=newVox();
    const leafC=[0x8fbf46,0xa4d158,0x79aa3a];
    const dv={px:[1,0],nx:[-1,0],pz:[0,1],nz:[0,-1]},dirs=Object.keys(dv);
    const stalks=[{x:0,z:0,h:12},{x:2,z:1,h:9},{x:-2,z:-1,h:10},{x:1,z:-2,h:8},{x:-1,z:2,h:11}];
    for(const s of stalks){
      const topY=s.h-1;
      for(let y=0;y<=topY;y++){
        /* ruas tebu: tiap voxel ke-3 jadi simpul ungu kemerahan */
        const seg=y%3;
        b.add(s.x,y,s.z,seg===2?0x8c4a5c:seg===0?0xc9c157:0xb5bd4e);
      }
      /* mahkota daun: 3 bilah panjang menjuntai dari pucuk */
      for(let i=0;i<3;i++){
        const dir=dirs[Math.floor(hash(s.x+i*3,topY,s.z-i*5)*4)];
        const[dx,dz]=dv[dir];
        const c1=pickC(leafC,topY,i,s.x),c2=pickC(leafC,i,s.z,topY);
        const ly=topY+1+i;
        b.add(s.x,ly,s.z,c1);
        b.add(s.x+dx,ly,s.z+dz,c2);
        b.add(s.x+2*dx,ly-1,s.z+2*dz,c1);
        b.add(s.x+3*dx,ly-2,s.z+3*dz,c2);
      }
      b.add(s.x,topY+4,s.z,0xb9d978);
    }
    /* dua rumpun tunas kecil di pangkal */
    b.add(2,0,-2,0xa8c65c);b.add(-2,0,2,0x94b551);
    return b;
  }

  /* ================= TULIP ================= */
  function buildTulip(){
    const b=newVox();
    for(let y=0;y<=4;y++)b.add(0,y,0,pickC([0x4c9a45,0x428c3c,0x57a54e],0,y,0));
    b.add(1,1,0,0x57a54e);b.add(2,1,0,0x4c9a45);b.add(2,2,0,0x63b25b);
    b.add(0,2,-1,0x4c9a45);b.add(0,2,-2,0x57a54e);b.add(0,3,-2,0x63b25b);
    b.add(-1,3,0,0x57a54e);
    b.add(1,0,1,0x79c25c);b.add(-1,0,-1,0x6db551);
    const R=0xe23b3b,Rd=0xa81f1f,Rl=0xf06a6a,Ro=0xef5350;
    b.add(0,5,0,Rd);
    b.add(1,5,0,R);b.add(-1,5,0,R);b.add(0,5,1,R);b.add(0,5,-1,R);
    for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++){
      if(!x&&!z)continue;
      b.add(x,6,z,(x&&z)?0xc72424:pickC([R,Ro,Rl],x,6,z));
    }
    b.add(1,7,0,Rl);b.add(-1,7,0,Rl);b.add(0,7,1,Rl);b.add(0,7,-1,Rl);
    return b;
  }

  /* =============================================================================
     TUMBUHAN "Tumbuhan new.html" — RUMPUT, BUNGA, JAMUR
     -----------------------------------------------------------------------------
     Diporting persis dari file itu. Rumput = kolom bilah tipis bergradasi
     gelap→terang; bunga = tangkai + kelopak; jamur = tudung berbintik. Semua
     memakai voxel BERSKALA/BEROTASI (add dengan sx..rz).
     ============================================================================= */
  const STEM=[0x3e8942,0x4c9a45];
  function stem(b,x,z,h){for(let y=0;y<h;y++)b.add(x,y,z,pickC(STEM,x,y,z));}

  /* ---- RUMPUT: rumpun bilah bergradasi ----
     `n` bilah, tinggi maksimum `maxH` voxel. Dipakai untuk rumput UTAMA (tipe 1,
     bisa dipanen) maupun RUMPUT DUNIA (worldGrass di bawah, dekoratif).
     `opts.grad`   = palet gradasi (hijau default, GRAD_RED untuk REDLANDS).
     `opts.spread` = radius sebaran bilah dalam satuan voxel (default ~1). Nilai
       besar membuat bilah menyebar mengisi blok → tidak terlihat kopong. */
  const GRAD=[0x123f12,0x1a5c1a,0x227422,0x2b8f2b,0x35ab35,0x43c943,0x55e055];
  /* gradasi MERAH untuk biome REDLANDS: cokelat-merah gelap → merah menyala */
  const GRAD_RED=[0x3d120c,0x5c1a11,0x7a2618,0x9e3b2c,0xc2503a,0xd86a45,0xe88450];
  function grassTuft(seed,n,maxH,opts){
    opts=opts||{};
    const grad=opts.grad||GRAD;
    const spread=opts.spread||1.0;
    return ()=>{
      const b=newVox();
      for(let i=0;i<n;i++){
        const a=hash(seed,i,1)*6.283;
        const r=(0.15+hash(i,seed,2)*0.85)*spread;
        const x=Math.cos(a)*r, z=Math.sin(a)*r;
        const H=Math.max(2,Math.round(maxH*(1.2+hash(seed,i,3)*2.0)));
        const w=0.5+hash(i,seed,4)*0.35;
        const ry=(hash(i,seed,5)-0.5)*0.7;
        for(let y=0;y<H;y++){
          const t=y/(H-1);
          b.add(x,y,z,grad[Math.round(t*(grad.length-1))],w,1,w,0,ry,0);
        }
      }
      return b;
    };
  }

  /* ---- BUNGA (tangkai + kelopak) ---- */
  function rose(){const b=newVox();const x=0,z=0;
    stem(b,x,z,3);
    b.add(x+0.55,1.1,z,0x4c9a45,0.5,0.16,0.28,0,0,0.3);
    b.add(x,1.6,z-0.55,0x4c9a45,0.28,0.16,0.5,-0.3,0,0);
    const R=0xd32f2f,Rd=0x8e1b1b,Rl=0xef5350,Rm=0xb71c1c;
    b.add(x,3,z,Rd);
    b.add(x+1,3,z,R);b.add(x-1,3,z,R);b.add(x,3,z+1,R);b.add(x,3,z-1,R);
    for(let a=-1;a<=1;a++)for(let c=-1;c<=1;c++){if(!a&&!c)continue;b.add(x+a,4,z+c,(a&&c)?Rm:R);}
    b.add(x,4,z,R);
    b.add(x+1,5,z,Rl);b.add(x-1,5,z,Rl);b.add(x,5,z+1,Rl);b.add(x,5,z-1,Rl);
    b.add(x,5,z,Rm);
    return b;}
  function poppy(){const b=newVox();
    stem(b,0,0,2);
    b.add(0,2,0,0x4a1414);
    b.add(1,2,0,0xe53935);b.add(-1,2,0,0xe53935);b.add(0,2,1,0xe53935);b.add(0,2,-1,0xe53935);
    b.add(0,3,0,0x662020);
    return b;}
  function dandelion(){const b=newVox();
    stem(b,0,0,3);
    b.add(0,3,0,0xf9e97a);
    b.add(1,3,0,0xf4d03f);b.add(-1,3,0,0xf4d03f);b.add(0,3,1,0xf4d03f);b.add(0,3,-1,0xf4d03f);
    b.add(0,4,0,0xf4d03f);
    return b;}
  function daisy(){const b=newVox();
    stem(b,0,0,3);
    b.add(0,3,0,0xf2c530);
    b.add(1,3,0,0xf5f5f5);b.add(-1,3,0,0xf5f5f5);b.add(0,3,1,0xf5f5f5);b.add(0,3,-1,0xf5f5f5);
    b.add(0.7,3.2,0.7,0xe8e8e8,0.35,0.2,0.35);b.add(-0.7,3.2,-0.7,0xe8e8e8,0.35,0.2,0.35);
    b.add(0.7,3.2,-0.7,0xffffff,0.35,0.2,0.35);b.add(-0.7,3.2,0.7,0xffffff,0.35,0.2,0.35);
    return b;}
  function torchflower(){const b=newVox();
    stem(b,0,0,3);
    b.add(0.55,1.2,0,0x4c9a45,0.5,0.16,0.28,0,0,0.3);
    b.add(0,3,0,0xc85a10);
    b.add(1,3,0,0xe07020);b.add(-1,3,0,0xe07020);b.add(0,3,1,0xe07020);b.add(0,3,-1,0xe07020);
    b.add(1,4,1,0xf08a30,0.6,0.6,0.6);b.add(-1,4,-1,0xf08a30,0.6,0.6,0.6);
    b.add(1,4,-1,0xf08a30,0.6,0.6,0.6);b.add(-1,4,1,0xf08a30,0.6,0.6,0.6);
    b.add(0,4,0,0xc85a10);
    b.add(0,5,0,0xf8a04a);
    return b;}
  function blueFlower(){const b=newVox();
    stem(b,0,0,2);
    b.add(0,2,0,0x2a4fa8);
    b.add(1,2,0,0x3f6fd8);b.add(-1,2,0,0x3f6fd8);b.add(0,2,1,0x3f6fd8);b.add(0,2,-1,0x3f6fd8);
    b.add(0,3,0,0x6f9ff0);
    b.add(0.6,3,0,0x8fb8f8,0.3,0.25,0.3);b.add(-0.6,3,0,0x8fb8f8,0.3,0.25,0.3);
    b.add(0,3,0.6,0x8fb8f8,0.3,0.25,0.3);b.add(0,3,-0.6,0x8fb8f8,0.3,0.25,0.3);
    return b;}
  function allium(){const b=newVox();
    stem(b,0,0,4);
    const P=[0x7a4bc8,0x9a6fe0,0xb18ae8];
    b.add(0,4,0,P[0]);
    b.add(1,4,0,P[1]);b.add(-1,4,0,P[1]);b.add(0,4,1,P[1]);b.add(0,4,-1,P[1]);
    for(let a=-1;a<=1;a++)for(let c=-1;c<=1;c++){if(a===0&&c===0)continue;b.add(a,5,c,(a&&c)?pickC(P,a,c,5):P[2]);}
    b.add(0,5,0,P[1]);
    b.add(1,6,0,P[2]);b.add(-1,6,0,P[2]);b.add(0,6,1,P[2]);b.add(0,6,-1,P[2]);
    b.add(0,6,0,P[0]);
    b.add(0,7,0,0xc4a5f0);
    return b;}
  function violet(){const b=newVox();
    stem(b,0,0,2);
    b.add(0,2,0,0xf2c530);
    b.add(1,2,0,0x9a6fe0);b.add(-1,2,0,0x9a6fe0);b.add(0,2,1,0x9a6fe0);b.add(0,2,-1,0x9a6fe0);
    return b;}

  /* ---- JAMUR (satu ukuran kecil, seperti jamur billboard lama) ---- */
  function mushroomS(){const b=newVox();const cx=0,cz=0;
    const S=[0xf1e5c9,0xe3d2ad],R=[0xb91c1c,0xd62828,0xef4444],spot=0xf8f8e8;
    b.add(cx,0,cz,pickC(S,0,0,0));b.add(cx,1,cz,pickC(S,0,1,0));
    for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++){
      const sp=(x===-1&&z===0)||(x===1&&z===1);
      b.add(cx+x,2,cz+z,sp?spot:pickC(R,x,2,z));
    }
    b.add(cx,3,cz,0xef4444);b.add(cx+1,3,cz,0xd62828);
    return b;}

  /* ---------- definisi per tipe tanaman ----------
     scale = ukuran satu voxel dalam blok dunia; sway = kekuatan angin.
     `variants` = daftar builder; mesher mengundi salah satu per tanaman.
     `uniformH` (opsional) = tinggi dunia target; tiap varian diskalakan ulang
       agar tingginya SAMA (dipakai bunga supaya semua seragam).

     TEBU & TULIP dikecilkan 30%. Rumput & bunga memakai skala kecil supaya
     sepadan dengan blok 1×1. */
  const DEF={
    /* RUMPUT UTAMA (bisa dipanen), varian HIJAU (hutan). Dibuat LEBIH TINGGI
       (skala 0.195 → 0.24) dan bilah lebih menjulang (maxH dinaikkan). 4 varian
       ukuran berbeda. Sebarannya berkelompok 5-20 (lihat WGEN.plantAt hutan).
       Varian MERAH (REDLANDS) dipilih mesher berdasarkan biome. */
    1 :{variants:[grassTuft(0,5,1.5),grassTuft(1,6,1.25),
                  grassTuft(2,5,1.05),grassTuft(3,6,1.65)],
        redVariants:[grassTuft(0,5,1.5,{grad:GRAD_RED}),grassTuft(1,6,1.25,{grad:GRAD_RED}),
                     grassTuft(2,5,1.05,{grad:GRAD_RED}),grassTuft(3,6,1.65,{grad:GRAD_RED})],
        scale:0.24, sway:0.42},
    /* BUNGA hangat (merah/oranye/kuning) — semua diseragamkan tingginya lewat
       uniformH supaya tidak ada yang menjulang (allium) atau kerdil (violet). */
    2 :{variants:[rose,poppy,dandelion,torchflower],
        scale:0.17, sway:0.34, uniformH:0.85},
    /* BUNGA sejuk (biru/putih/ungu) */
    3 :{variants:[blueFlower,daisy,allium,violet],
        scale:0.17, sway:0.34, uniformH:0.85},
    /* JAMUR: SATU ukuran kecil saja (seperti jamur billboard lama). */
    5 :{variants:[mushroomS],
        scale:0.16, sway:0.10},
    7 :{build:buildBush,     scale:0.24,  sway:0.18},  // semak beri
    8 :{build:buildCactus,   scale:0.20,  sway:0.05},  // kaktus (kaku)
    9 :{build:buildSugarCane,scale:0.14,  sway:0.34},  // tebu (paling lentur)
    10:{build:buildTulip,    scale:0.098, sway:0.42},  // tulip
  };

  /* ---------- RUMPUT DUNIA (dekoratif, tak bisa dihancurkan) ----------
     Tumbuh di SETIAP blok rumput/tanah-merah hutan & REDLANDS (dibangkitkan
     langsung oleh mesher dari jenis blok, TIDAK disimpan sebagai plant — jadi
     tidak bisa dipanen, tidak menjatuhkan apa pun, dan otomatis hilang saat
     bloknya hancur / muncul lagi saat dirt kembali jadi grass).

     ===== KARTU 3-PLANE (v0.1.9) — pengganti bilah voxel =====
     Versi sebelumnya membangun rumput dari KOTAK VOXEL: 18 bilah × 2 segmen ×
     6 wajah = 216 quad PER BLOK. Diukur di dunia yang termuat: 263.520 quad /
     45,5 MB VRAM, yaitu 17,8× lebih berat dari SELURUH terrain. Itu bottleneck
     render terbesar di game ini.

     Sekarang satu blok = 3 QUAD saja (0,5 MB total, ~1,4% biaya lama): tiga
     bidang tegak yang saling berpotongan 60°, masing-masing memakai tekstur
     rumput ber-alpha (beberapa helai per bidang). Bentuk helainya pindah dari
     GEOMETRI ke TEKSTUR.

     KENAPA 3 PLANE, KENAPA TEGAK (tanpa tilt):
     Kamera game memandang dari atas pada Cam.elev (≈47°) dan yaw-nya bisa
     diputar bebas. Luas TERPROYEKSI tiap konfigurasi diukur relatif wajah ATAS
     blok:
         2 plane tegak : 43% (ragam 33% antar-yaw)
         3 plane tegak : 74% (ragam 14%)   ← dipakai
         2 plane tilt  :  8% (ragam 160%)
         3 plane tilt  : 21% (ragam 140%)
     Memiringkan kartu menaikkan rata-rata tapi menciptakan sudut pandang di
     mana rumput hampir tak terlihat. 3 plane tegak paling STABIL saat kamera
     diputar — inilah syarat "terlihat jelas di kamera isometrik".

     Normal verteks sengaja dimiringkan ke ATAS (perp*0,42 + Y*0,91), bukan
     horizontal murni. Dengan MeshLambert, normal horizontal membuat kartu
     tampak gelap dari atas; dimiringkan ke atas membuatnya menangkap cahaya
     langit seperti permukaan rumput sungguhan.

     Warna tetap dari VERTEKS (gradasi bawah gelap → atas terang, palet
     WG_GREEN / WG_RED) sehingga satu tekstur cukup untuk hijau & merah, dan
     pengali tingkat dari mesher (grassTint) tetap berlaku. */
  /* palet world grass: lebih gelap dari blok tanahnya. */
  const WG_GREEN=[0x0c260a,0x123a0f,0x184d14,0x1f5e18,0x24701c,0x2a7d20,0x2f8a24];
  const WG_RED  =[0x260a06,0x38100a,0x4a160e,0x5c1c12,0x6b2015,0x7a2618,0x852c1b];
  /* geser satu warna hex sedikit (k: -1..1) untuk variasi natural antar bilah */
  function tintHex(hex,k){
    const m=1+k*0.16;
    const cl=n=>Math.min(255,Math.max(0,Math.round(n*m)));
    return (cl((hex>>16)&255)<<16)|(cl((hex>>8)&255)<<8)|cl(hex&255);
  }

  /* jumlah TILE varian tekstur rumput (dibuat di mesher, strip 8×1) */
  const WG_TEX_N=8;
  /* Jumlah VARIAN TATA LETAK kartu per tingkat tinggi.
     Sebelumnya satu tingkat tinggi = SATU geometri kartu yang dipakai ulang di
     semua blok, sehingga hamparan rumput terlihat seperti klon: tinggi tiap
     plane, lebarnya, dan pilihan tile teksturnya persis sama di mana-mana.
     Dengan 6 varian, dua blok bertingkat sama tetap berbeda bentuk. */
  const WG_VAR_N=6;
  /* Lebar kartu sedikit >1 blok supaya rumput antar-blok saling menyambung dan
     tidak terlihat sebagai petak-petak terpisah. */
  const WG_W=1.06;
  /* Amplitudo angin di UJUNG kartu. Disamakan dengan hasil model voxel lama
     (0,5·(8,7·0,16)^1,5·0,0975 ≈ 0,080) supaya kekuatan goyangnya tidak berubah.
     Untuk mesh rumput, atribut `aSway` menyimpan FAKTOR TINGGI ternormalisasi
     (0 di pangkal → 1 di ujung, profil pangkat 1,5) — BUKAN amplitudo jadi.
     Shader mengalikannya dengan angka ini. Bedanya penting: faktor 0..1 yang
     sama juga dipakai efek TERINJAK, jadi cukup satu atribut untuk keduanya. */
  const WG_TIP_SWAY=0.080;

  /* Bangun kartu rumput untuk satu blok.
       `seed`  variasi tata letak (jitter, rotasi, skala & pilihan tile)
       `h`     tinggi kartu dalam BLOK
       `grad`  palet warna (WG_GREEN / WG_RED)
     Mengembalikan format yang sama dengan compile(): pos/nor/col/amp + uv,
     jadi mesher bisa menyalinnya persis seperti model voxel.

     VARIASI (v0.1.9-b) — dulu rumput terlihat monoton & kaku karena:
       · orientasi rumpun praktis sama di semua blok (rotasi dasar plane selalu
         0°/60°/120°, hanya digoyang ±0.125 rad ≈ ±7°),
       · SKALA tiap rumpun sama (tinggi hanya dari tingkat, lebar ±12%),
       · satu geometri dipakai ulang untuk semua blok bertingkat sama.
     Sekarang:
       · `yaw` memutar SELURUH rumpun 0..180° (bebas, per rumpun) sehingga tidak
         ada arah dominan yang terbaca sebagai pola,
       · jarak antar-plane diacak lebih lebar (±0.42 rad ≈ ±24°) → rumpun tidak
         selalu simetris 60°,
       · `sc` menskalakan rumpun 0.72..1.24 (tinggi & lebar sekaligus) sehingga
         ada rumpun kerdil dan rumpun besar dalam satu tingkat yang sama,
       · tinggi per plane diacak lebih lebar (0.62..1.34× tinggi rumpun) → puncak
         tiap kartu jelas berbeda, tidak rata seperti dipangkas. */
  function grassCards(seed,h,grad){
    const PLANES=3;
    const pos=[],nor=[],col=[],amp=[],uv=[];
    const c=new THREE.Color();
    let count=0;
    /* rotasi & skala SELURUH rumpun (bukan per plane) */
    const yaw=hash(seed,seed+13,11)*Math.PI;
    const sc=0.72+hash(seed+3,seed*2+5,12)*0.52;
    /* LEBAR diskalakan lebih lembut dari tinggi. Kartu sengaja dibuat sedikit
       lebih lebar dari satu blok (WG_W=1.06) supaya rumput antar-blok
       menyambung; kalau lebarnya ikut mengecil sekuat tingginya, rumpun kerdil
       menyisakan lubang dan hamparannya terlihat bolong. */
    const wsc=0.5+0.5*sc;
    for(let p=0;p<PLANES;p++){
      const a=yaw+Math.PI*p/PLANES+(hash(seed,p,1)-0.5)*0.84;
      const ux=Math.cos(a),uz=Math.sin(a);
      /* normal condong ke ATAS agar kartu terang dilihat dari kamera isometrik */
      let nx=-Math.sin(a)*0.42, nz=Math.cos(a)*0.42, ny=0.91;
      const nl=Math.hypot(nx,ny,nz)||1; nx/=nl; ny/=nl; nz/=nl;
      /* tiap plane: tinggi & posisi berbeda → puncak rumpun tidak seragam */
      const hp=h*sc*(0.62+hash(p,seed,2)*0.72);
      const hw=WG_W*0.5*wsc*(0.86+hash(seed+p,p,3)*0.32);
      const jx=(hash(seed,p,4)-0.5)*0.30, jz=(hash(p,seed,5)-0.5)*0.30;
      /* pilih salah satu tile varian di strip tekstur; UV boleh DIBALIK
         horizontal (mirror) supaya satu tile tidak terbaca berulang */
      const ti=Math.floor(hash(seed+p*7,p,6)*WG_TEX_N)%WG_TEX_N;
      const mir=hash(seed+p*3,p+2,8)<0.5;
      const u0=(mir?(ti+1):ti)/WG_TEX_N, u1=(mir?ti:(ti+1))/WG_TEX_N;
      /* gradasi warna: pangkal gelap → ujung terang, plus variasi per kartu */
      const cv=(hash(seed,p,7)-0.5)*2.4;
      const cBot=tintHex(grad[1],cv*0.8), cTop=tintHex(grad[grad.length-1],cv);
      /* 4 sudut: 0,1 pangkal (kiri,kanan) — 2,3 ujung (kanan,kiri) */
      const P=[
        [jx-ux*hw,0 ,jz-uz*hw, u0,0, cBot],
        [jx+ux*hw,0 ,jz+uz*hw, u1,0, cBot],
        [jx+ux*hw,hp,jz+uz*hw, u1,1, cTop],
        [jx-ux*hw,hp,jz-uz*hw, u0,1, cTop],
      ];
      for(const v of P){
        pos.push(v[0],v[1],v[2]);
        nor.push(nx,ny,nz);
        uv.push(v[3],v[4]);
        c.setHex(v[5]);
        col.push(c.r,c.g,c.b);
        /* aSway = FAKTOR TINGGI 0..1 (pangkat 1.5): pangkal 0 → ujung 1.
           Shader rumput mengalikannya dengan WG_TIP_SWAY untuk angin, dan
           memakai faktor yang sama sebagai bobot tekukan saat terinjak. */
        amp.push(Math.pow(v[1]/Math.max(0.001,hp),1.5));
      }
      count++;
    }
    return {pos:new Float32Array(pos),nor:new Float32Array(nor),
            col:new Float32Array(col),amp:new Float32Array(amp),
            uv:new Float32Array(uv),count};
  }
  /* varian tinggi BERURUTAN dari PALING PENDEK ke PALING TINGGI.
     Urutan ini WAJIB naik: mesher memilih varian dari medan "heat" rumput
     (WGEN.grassHeat) sehingga tinggi rumput bergradasi halus mengikuti noise —
     petak kosong → pendek → sedang → tinggi. Kalau urutannya diacak, gradasi
     berubah jadi bercak acak. */
  const WG_H=[0.34,0.44,0.53,0.62,0.71,0.82];

  /* jumlah varian per tipe (0 = model tunggal via build) */
  function variantCount(t){const d=DEF[t];return (d&&d.variants)?d.variants.length:1;}

  /* ---------- kompilasi voxel → daftar wajah ----------
     Wajah yang bersinggungan dengan voxel lain dibuang (hidden face culling),
     jadi hanya kulit model yang dikirim ke GPU. Koordinat sudah dikali skala &
     digeser +0.5 voxel sehingga voxel terbawah duduk di y=0 (bukan setengah
     terbenam). `amp` = amplitudo goyang angin per verteks.

     VOXEL BERSKALA/BEROTASI (bilah rumput, kelopak bunga dari "Tumbuhan
     new.html"): tiap verteks wajah ditransformasi oleh skala (sx,sy,sz) &
     rotasi Euler (rx,ry,rz) di ruang lokal voxel, lalu digeser ke pusat voxel
     (mengikuti compose() di file asli: pusat = pos + size/2). Voxel satuan
     polos (sx=sy=sz=1, tanpa rotasi) tetap di-cull; voxel berukuran/berputar
     TIDAK di-cull (jarang bersinggungan penuh & bentuknya tak beraturan). */
  function rotVertex(vx,vy,vz,rx,ry,rz){
    let x=vx,y=vy,z=vz,c,s,t;
    if(rx){c=Math.cos(rx);s=Math.sin(rx);t=y;y=t*c-z*s;z=t*s+z*c;}
    if(ry){c=Math.cos(ry);s=Math.sin(ry);t=x;x=t*c+z*s;z=-t*s+z*c;}
    if(rz){c=Math.cos(rz);s=Math.sin(rz);t=x;x=t*c-y*s;y=t*s+y*c;}
    return [x,y,z];
  }
  function compile(vox,scale,sway){
    const pos=[],nor=[],col=[],amp=[];
    const c=new THREE.Color();
    let count=0;
    for(const v of vox.list){
      c.setHex(v.c);
      const j=0.94+0.10*hash(v.x,v.y,v.z);
      const plain=(v.sx===1&&v.sy===1&&v.sz===1&&!v.rx&&!v.ry&&!v.rz);
      /* pusat kubus dalam satuan voxel (compose: pos + size/2) */
      const cxv=v.x+v.sx/2, cyv=v.y+v.sy/2, czv=v.z+v.sz/2;
      for(const f of FACES){
        /* culling hanya untuk voxel satuan polos (tetangga grid pasti menutup) */
        if(plain&&vox.has(v.x+f.d[0],v.y+f.d[1],v.z+f.d[2]))continue;
        const m=f.sh*j;
        /* normal ikut dirotasi supaya pencahayaan benar */
        const nn=rotVertex(f.n[0],f.n[1],f.n[2],v.rx,v.ry,v.rz);
        for(let k=0;k<4;k++){
          /* sudut wajah × ukuran → posisi relatif pusat, lalu rotasi, lalu
             digeser ke pusat voxel & dikali skala dunia */
          const lx=f.v[k][0]*v.sx, ly=f.v[k][1]*v.sy, lz=f.v[k][2]*v.sz;
          const rv=rotVertex(lx,ly,lz,v.rx,v.ry,v.rz);
          const wy=cyv+rv[1];
          pos.push((cxv+rv[0])*scale, wy*scale, (czv+rv[2])*scale);
          nor.push(nn[0],nn[1],nn[2]);
          col.push(Math.min(1,c.r*m),Math.min(1,c.g*m),Math.min(1,c.b*m));
          amp.push(sway*Math.pow(Math.max(0,wy)*0.16,1.5)*scale);
        }
        count++;
      }
    }
    return {pos:new Float32Array(pos),nor:new Float32Array(nor),
            col:new Float32Array(col),amp:new Float32Array(amp),count};
  }

  /* tinggi model dalam satuan VOXEL (untuk uniformH) */
  function rawHeight(vox){
    let hi=0;
    for(const v of vox.list)hi=Math.max(hi,v.y+v.sy);
    return hi||1;
  }

  /* rotasi 90° kelipatan di sekitar Y. Rotasi mempertahankan orientasi, jadi
     urutan verteks (winding) tetap benar tanpa perlu dibalik. */
  const RS=[0,1,0,-1],RC=[1,0,-1,0];
  function rotate(M,rot){
    if(!rot)return M;
    const s=RS[rot],cs=RC[rot];
    const p=new Float32Array(M.pos.length),n=new Float32Array(M.nor.length);
    for(let i=0;i<M.pos.length;i+=3){
      const x=M.pos[i],z=M.pos[i+2];
      p[i]=x*cs+z*s;p[i+1]=M.pos[i+1];p[i+2]=-x*s+z*cs;
      const nx=M.nor[i],nz=M.nor[i+2];
      n[i]=nx*cs+nz*s;n[i+1]=M.nor[i+1];n[i+2]=-nx*s+nz*cs;
    }
    return {pos:p,nor:n,col:M.col,amp:M.amp,count:M.count};
  }

  const cache={};

  return {
    DEF,
    /* apakah tipe tanaman ini model voxel (bukan billboard)? */
    isVoxel(t){return !!DEF[t];},
    /* jumlah varian model untuk tipe `t` (≥1) */
    variantCount,
    /* daftar wajah siap pakai untuk tipe `t`, varian `vi`, pada rotasi `rot`.
       Model dikompilasi sekali per (tipe,varian) lalu dirotasi & di-cache.
       `uniformH` menyeragamkan tinggi antar-varian (dipakai bunga).
       `red`=true memilih varian MERAH (rumput utama di REDLANDS). */
    model(t,rot,vi,red){
      const def=DEF[t];
      if(!def)return null;
      vi=vi||0;
      const nv=variantCount(t);
      if(vi>=nv)vi=vi%nv;
      const useRed=!!(red&&def.redVariants);
      const baseKey=t+':'+(useRed?'r':'')+vi+':0';
      if(!cache[baseKey]){
        const list=useRed?def.redVariants:(def.variants||null);
        const builder=list?list[vi]:def.build;
        const vox=builder();
        let scale=def.scale;
        if(def.uniformH)scale=def.uniformH/rawHeight(vox);   // seragamkan tinggi
        cache[baseKey]=compile(vox,scale,def.sway);
      }
      const key=t+':'+(useRed?'r':'')+vi+':'+(rot|0);
      if(cache[key])return cache[key];
      return cache[key]=rotate(cache[baseKey],rot|0);
    },

    /* ---------- RUMPUT DUNIA (dekoratif) ----------
       Kartu 3-plane bertekstur (lihat catatan di grassCards).
       `vi`  = tingkat TINGGI 0..WG_H.length-1 (dari heat rumpun, berurutan).
       `rot` = INDEKS VARIAN TATA LETAK 0..WG_VAR_N-1. Dulu parameter ini
               diabaikan (semua blok memakai satu geometri per tingkat) dan
               itulah penyebab rumput terlihat seperti klon; sekarang tiap
               varian punya rotasi rumpun, skala, tinggi per-plane, jitter &
               pilihan tile sendiri. `red`=true → palet merah (REDLANDS). */
    worldGrassCount(){return WG_H.length;},
    /* jumlah varian tata letak yang boleh diminta lewat `rot` */
    worldGrassVarCount(){return WG_VAR_N;},
    /* jumlah varian tile tekstur rumput yang harus digambar mesher di atlas */
    worldGrassTexCount(){return WG_TEX_N;},
    /* amplitudo angin di ujung kartu (dipakai shader rumput di mesher) */
    worldGrassTipSway(){return WG_TIP_SWAY;},
    worldGrass(rot,vi,red){
      vi=(vi||0)%WG_H.length;
      const rv=((rot|0)%WG_VAR_N+WG_VAR_N)%WG_VAR_N;
      const key='wg'+(red?'r':'')+':'+vi+':'+rv;
      if(cache[key])return cache[key];
      /* seed unik per (tingkat, varian) → tata letak benar-benar berbeda */
      return cache[key]=grassCards(11+vi*7+rv*131,WG_H[vi],red?WG_RED:WG_GREEN);
    },
  };

})();

window.Env_Plants=Env_Plants;
