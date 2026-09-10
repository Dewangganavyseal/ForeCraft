'use strict';
/* Tekstur atlas prosedural + builder mesh chunk + geometri air */
const Mesher=(()=>{
  let atlasTex=null;
  const matSolid=null;
  let MAT_SOLID=null,MAT_PLANT=null,MAT_WATER=null,MAT_LEAF=null,MAT_ROOF=null,MAT_FLORA=null,
      MAT_WGRASS=null;
  /* waktu untuk goyangan angin tumbuhan voxel (di-update World.update) */
  const FLORA_T={value:0};


  /* ---------- atlas 8 kolom x 4 baris tile @16px ----------
     Baris ke-3 & ke-4 dipakai blok biome baru (pasir, salju) dan bijih. */
  const ATLAS_COLS=8,ATLAS_ROWS=4;
  function makeAtlas(){
    const W=ATLAS_COLS*16,H=ATLAS_ROWS*16;
    const cv=document.createElement('canvas');cv.width=W;cv.height=H;
    const c=cv.getContext('2d');c.clearRect(0,0,W,H);
    let sd=7;const rr=()=>{sd^=sd<<13;sd^=sd>>>17;sd^=sd<<5;return(sd>>>0)/4294967296;};
    const T=(i,fn)=>{c.save();c.translate((i%8)*16,((i/8)|0)*16);c.beginPath();c.rect(0,0,16,16);c.clip();fn();c.restore();};

    const px=(x,y,col)=>{c.fillStyle=col;c.fillRect(x,y,1,1);};
    const noiseFill=(base,vars,n=90)=>{c.fillStyle=base;c.fillRect(0,0,16,16);for(let k=0;k<n;k++)px((rr()*16)|0,(rr()*16)|0,vars[(rr()*vars.length)|0]);};
    const pk=arr=>arr[(rr()*arr.length)|0];
    /* =======================================================================
       TEKSTUR TANAH & RUMPUT — 3 TINGKAT (diporting dari prototipe
       "NEW MODEL/Grass Block.html")
       -----------------------------------------------------------------------
       Di prototipe SETIAP tingkat heat menggambar teksturnya sendiri (24
       material): pita rumput di sisi blok MENIPIS (4px→1px) saat makin kering
       dan permukaannya berganti dari helai rumput menjadi kerikil. Itulah yang
       membuat tanahnya benar-benar terlihat BERTEKSTUR — bukan sekadar tile
       rumput yang diwarnai cokelat.

       Versi lama di sini hanya punya SATU tile rumput (pita hijau tebal tetap)
       lalu diwarnai cokelat lewat verteks, sehingga blok gundul masih memakai
       pola rumput dan "tekstur tanah"-nya tidak pernah muncul.

       Sekarang ada tiga tingkat tile:
         LEBAT  (0/1)   pita rumput 4px + rumbai lebat        → pusat rumpun
         SEDANG (13/15) pita menipis 2px + rumbai jarang      → tepi rumpun
         GUNDUL (14/2)  tanpa pita — murni tanah + kerikil    → wilayah gundul
       Warna AKHIR tetap ditentukan palet verteks (target hex di GH_TOP /
       GH_SIDE); tile hanya menyediakan POLA piksel. Karena tiap tingkat punya
       tile dengan warna dasar yang sudah mendekati targetnya, pengali
       verteksnya ≈1 sehingga detail piksel tidak tergerus.
       ======================================================================= */
    const GT_LUSH=['#5f9e3c','#57933a','#69a844','#4f8a32','#72b04b','#5a9838'];
    const GT_MID =['#8a9042','#7f8a3c','#95994a','#767f36','#9ea052','#848c40'];
    const GT_BARE=['#a17840','#96703a','#ab8148','#8c6733','#b18a52','#9c7541'];
    const RT_LUSH=['#9e3b2c','#8a3123','#b0472f','#7a2a1e','#c25438','#94362a'];
    const RT_MID =['#a55b3c','#9a5336','#b06344','#8f4c31','#b96e4c','#a05a3d'];
    const RT_BARE=['#a9714e','#9e6947','#b37c58','#94603f','#bd8760','#a36d4a'];
    const D_UP=['#7c5f39','#6b4c2e','#8a6a44'];          // tanah lapisan atas (terang)
    const D_LO=['#8a6a44','#5f452a','#553c24','#4a3320']; // tanah lapisan bawah (gelap)
    const D_AC=['#3e2c1c','#937551'];                     // bintik ekstrem (20% piksel)
    /* lapisan tanah versi REDLANDS: kemerahan, bukan cokelat */
    const D_RUP=['#8f4a33','#7d3f2b','#9c563c'];
    const D_RLO=['#9c563c','#6b3323','#5c2b1d','#4d2418'];
    const D_RAC=['#401c12','#a86a4e'];
    const PEB =['#9a9186','#847b70'];                     // kerikil
    const CRACK=['#5f1d14','#6a231a'];                    // retakan tanah merah
    /* wajah ATAS: SELURUH piksel diundi dari palet (bukan warna dasar + bintik)
       supaya permukaannya benar-benar berbutir seperti prototipe. `blades` =
       helai rumput terang (2px tegak), `specks` = kerikil/retakan. */
    const topTile=(p,blades,bcols,specks,spal)=>()=>{
      for(let y=0;y<16;y++)for(let x=0;x<16;x++)px(x,y,pk(p));
      for(let i=0;i<blades;i++){
        const x=(rr()*16)|0,y=1+((rr()*14)|0),col=pk(bcols);
        px(x,y,col);px(x,y-1,col);
      }
      for(let i=0;i<specks;i++)px((rr()*16)|0,(rr()*16)|0,pk(spal||PEB));
    };
    /* wajah SAMPING: pita rumput `band` px di ATAS dengan tepi bawah BERGERIGI
       (rumbai), sisanya tanah berlapis — atas lebih terang, bawah lebih gelap.
       `red` memilih lapisan tanah kemerahan untuk REDLANDS. */
    const sideTile=(band,bpal,fringe,specks,red)=>()=>{
      const UP=red?D_RUP:D_UP, LO=red?D_RLO:D_LO, AC=red?D_RAC:D_AC;
      for(let y=0;y<16;y++)for(let x=0;x<16;x++){
        let col;
        if(band&&y<band)        col=pk(bpal);
        else if(band&&y<band+2) col=rr()<0.5?pk(bpal):pk(UP);
        else                    col=y<10?pk(UP):pk(LO);
        px(x,y,rr()<0.8?col:pk(AC));
      }
      if(band)for(let x=0;x<16;x++)if(rr()<fringe){
        const len=1+((rr()*3)|0);
        for(let y=0;y<len;y++)px(x,band+y,pk(bpal));
      }
      for(let i=0;i<specks;i++)px((rr()*16)|0,(6+rr()*10)|0,pk(PEB));
    };
    T(0,topTile(GT_LUSH,10,['#7cbb52','#89c95c','#4a8c2c'],0));    // rumput LEBAT (atas)
    T(1,sideTile(4,GT_LUSH,0.60,0));                               // rumput LEBAT (sisi)
    T(2,sideTile(0,null,0,3));                                     // tanah / sisi GUNDUL
    T(13,topTile(GT_MID,5,['#9aa84e','#a8b45a','#6f8a34'],3));     // rumput SEDANG (atas)
    T(15,sideTile(2,GT_MID,0.35,2));                               // rumput SEDANG (sisi)
    T(14,topTile(GT_BARE,0,null,7));                               // GUNDUL (atas, berkerikil)
    T(3,()=>{noiseFill('#8a8f98',['#7b8089','#9aa0a8','#6f747d']);
      for(let k=0;k<5;k++){const x=(rr()*14)|0,y=(rr()*14)|0;px(x,y,'#5c616a');px(x+1,y+1,'#5c616a');}}); // stone
    T(4,()=>{for(let x=0;x<16;x++){const col=x%4<2?'#6e4f2f':'#5d4126';for(let y=0;y<16;y++)px(x,y,col);}
      for(let k=0;k<26;k++)px((rr()*16)|0,(rr()*16)|0,'#523719');});           // log side
    T(5,()=>{c.fillStyle='#8a6a44';c.fillRect(0,0,16,16);
      for(let r=7;r>0;r-=2){c.fillStyle=r%4?'#6e4f2f':'#9a7a52';c.fillRect(8-r,8-r,r*2,r*2);}}); // log top
    T(6,()=>noiseFill('#3e7d31',['#2c5e22','#55a03f','#24511b'],120));         // leaves
    T(8,()=>{for(let k=0;k<7;k++){const x=2+(rr()*12)|0;let yy=15;
      for(let s=0;s<8+(rr()*5|0);s++){px(x+((rr()*3)|0)-1,yy-s,k%2?'#69a83f':'#4d8a2f');}}}); // tall grass
    T(9,()=>{for(let y=8;y<16;y++)px(7,y,'#4d8a2f');
      [[7,5],[6,6],[8,6],[7,7],[7,4]].forEach(p=>px(p[0],p[1],'#d94f3d'));px(7,6,'#ffd24d');});
    T(10,()=>{for(let y=8;y<16;y++)px(8,y,'#4d8a2f');
      [[8,5],[7,6],[9,6],[8,7],[8,4]].forEach(p=>px(p[0],p[1],'#ffd24d'));px(8,6,'#fff2b0');});
    T(11,()=>{for(let y=10;y<16;y++)px(7,y,'#d8c9a8');px(8,12,'#d8c9a8');
      for(let x=5;x<11;x++){px(x,9,'#b5432f');px(x,10,x%2?'#b5432f':'#8a2f20');}px(6,8,'#b5432f');px(9,8,'#b5432f');});
    T(12,()=>{for(let y=6;y<15;y++)for(let x=3;x<13;x++){
        const dx=x-8,dy=y-10.5;if(dx*dx+dy*dy*1.4<22)px(x,y,((x+y)%4===0)?'#2c5e22':'#3e7d31');}
      [[6,9],[10,8],[8,12],[5,11],[11,11]].forEach(p=>px(p[0],p[1],'#4d6bd6'));});
    /* --- baris 3: blok permukaan biome baru --- */
    /* PASIR: dulu tile ini digambar dengan 4 GARIS PENUH horizontal selebar
       tile, dan itulah yang membuatnya terlihat seperti papan/kayu — mata
       menangkap garis lurus panjang sebagai serat kayu. Sekarang murni
       BUTIRAN: bintik halus padat 3 tingkat terang + beberapa butir kasar
       terang/gelap, plus riak pasir berupa GORESAN PENDEK melengkung (bukan
       garis penuh) sehingga terbaca sebagai gundukan pasir. Palet dinaikkan ke
       kuning-krem pucat supaya jelas beda dari kayu yang kecokelatan. */
    T(16,()=>{
      noiseFill('#e3d29a',['#d8c489','#eeddac','#cdb87b'],150);
      /* butiran kasar: titik terang & gelap tersebar */
      for(let k=0;k<26;k++)px((rr()*16)|0,(rr()*16)|0,'#f6e9c2');
      for(let k=0;k<18;k++)px((rr()*16)|0,(rr()*16)|0,'#c0a96d');
      /* riak pasir: goresan PENDEK (3-5 px) yang bergelombang, tidak menyambung
         dari tepi ke tepi → tidak lagi terbaca sebagai serat kayu */
      for(let k=0;k<5;k++){
        const y0=1+((rr()*14)|0),x0=(rr()*12)|0,len=3+((rr()*3)|0);
        for(let i=0;i<len;i++){
          const yy=y0+((i===((len/2)|0))?1:0);
          if(yy>=0&&yy<16)px(x0+i,yy,'#d2bd80');
        }
      }
    });                                                                        // pasir
    T(17,()=>{noiseFill('#eef5fb',['#dfeaf5','#ffffff','#cfe0ef'],60);          // salju
      for(let k=0;k<10;k++)px((rr()*16)|0,(rr()*16)|0,'#b9d2e6');});
    T(18,()=>{noiseFill('#8a8f98',['#7b8089','#9aa0a8'],60);                    // bijih besi
      [[3,4],[4,5],[9,3],[10,4],[5,10],[6,11],[11,9],[12,10],[7,7]].forEach(p=>{
        px(p[0],p[1],'#c08a5a');px(p[0]+1,p[1],'#a8703f');px(p[0],p[1]+1,'#d9a678');});});
    T(19,()=>{noiseFill('#8a8f98',['#7b8089','#9aa0a8'],60);                    // bijih emas
      [[4,3],[10,5],[6,10],[11,11],[3,8]].forEach(p=>{
        px(p[0],p[1],'#ffe07a');px(p[0]+1,p[1],'#d9b23a');px(p[0],p[1]+1,'#b8921e');
        px(p[0]+1,p[1]+1,'#ffe9a0');});});
    T(20,()=>{noiseFill('#9fb4c4',['#8ea3b3','#b3c8d6'],50);                    // kristal beku
      [[4,4],[9,6],[6,10],[11,10]].forEach(p=>{
        px(p[0],p[1],'#d6f4ff');px(p[0],p[1]+1,'#7fd8ff');px(p[0]+1,p[1]+1,'#4fb0e0');
        px(p[0]+1,p[1],'#a8e8ff');px(p[0],p[1]+2,'#3f8fbf');});});
    T(21,()=>{for(let y=0;y<16;y++){const col=(y%5===0)?'#8a6236':(y%2?'#b98a55':'#c49560');
        for(let x=0;x<16;x++)px(x,y,col);}
      for(let k=0;k<18;k++)px((rr()*16)|0,(rr()*16)|0,'#a37a48');});             // papan
    /* ladang pertanian: tanah bajakan dengan alur gelap */
    T(22,()=>{noiseFill('#6f4a26',['#5d3d1f','#7f5a30','#684522'],80);
      for(let y=1;y<16;y+=4){for(let x=0;x<16;x++){px(x,y,'#4c2f16');px(x,y+1,'#583a1d');}}});
    /* tile 23: tanah merah biome REDLANDS — tingkat LEBAT (atas).
       REDLANDS memakai tiga tingkat yang sama seperti rumput hijau, dengan
       lapisan tanah bawah yang kemerahan (D_RUP/D_RLO) bukan cokelat. */
    T(23,topTile(RT_LUSH,8,['#d23b2a','#e04a34','#8a3123'],4,CRACK));
    T(25,sideTile(4,RT_LUSH,0.55,0,true));                          // merah LEBAT (sisi)
    T(26,topTile(RT_MID,4,['#c1553a','#cf6242','#96452f'],5,CRACK)); // merah SEDANG (atas)
    T(27,sideTile(2,RT_MID,0.32,2,true));                           // merah SEDANG (sisi)
    T(28,topTile(RT_BARE,0,null,8,CRACK));                          // merah GUNDUL (atas)
    T(29,sideTile(0,null,0,3,true));                                // merah GUNDUL (sisi)
    /* tile 24: tumbuhan merah REDLANDS (rumput/semak merah menyala) */
    T(24,()=>{for(let k=0;k<7;k++){const x=2+(rr()*12)|0;let yy=15;
      for(let s=0;s<9+(rr()*5|0);s++){px(x+((rr()*3)|0)-1,yy-s,k%2?'#d23b2a':'#a82418');}}
      for(let k=0;k<5;k++)px((rr()*16)|0,(2+rr()*6)|0,'#ff7a4d');});
    atlasTex=new THREE.CanvasTexture(cv);

    atlasTex.magFilter=THREE.NearestFilter;atlasTex.minFilter=THREE.NearestFilter;
    atlasTex.encoding=THREE.sRGBEncoding;
  }

  /* ---------- TEKSTUR KARTU RUMPUT DUNIA (strip N varian, ber-ALPHA) ----------
     Dipisah dari atlas blok karena butuh kanal alpha (atlas blok opaque, dan
     menaruh tile beralpha di sana akan membocorkan tepi transparan ke tile
     tetangga saat difilter).

     Isinya MASK PUTIH: bentuk helai digambar putih keabuan, latarnya
     transparan. Warna akhir datang dari warna VERTEKS (gradasi WG_GREEN /
     WG_RED + pengali tingkat dari grassTint), jadi SATU tekstur melayani rumput
     hijau maupun merah REDLANDS — tidak perlu dua set.

     Digambar dari bawah kanvas ke atas: baris terbawah kanvas = pangkal helai
     (v≈0 di UV), sehingga rumput menyambung ke tanah. */
  let grassTex=null;
  function makeGrassTex(){
    const N=(typeof window!=='undefined'&&window.Env_Plants&&Env_Plants.worldGrassTexCount)
            ?Env_Plants.worldGrassTexCount():4;
    const TS=16;
    const cv=document.createElement('canvas');cv.width=TS*N;cv.height=TS;
    const c=cv.getContext('2d');c.clearRect(0,0,cv.width,TS);
    let sd=1337;const rr=()=>{sd^=sd<<13;sd^=sd>>>17;sd^=sd<<5;return(sd>>>0)/4294967296;};
    for(let t=0;t<N;t++){
      const ox=t*TS;
      /* 6-8 helai per kartu: cukup padat supaya satu kartu sudah terbaca
         sebagai rumpun, tapi tidak menjadi bidang penuh (harus tetap ada
         sela transparan agar terlihat seperti helai). */
      const blades=6+((rr()*3)|0);
      for(let b=0;b<blades;b++){
        let x=1+((rr()*(TS-2))|0);
        const h=Math.round(TS*(0.5+rr()*0.5));
        const lean=rr()<0.5?-1:1;
        const wide=rr()<0.3;                     // sebagian helai 2px (lebih tebal)
        for(let k=0;k<h;k++){
          const p=k/(h-1);
          /* melengkung mulai separuh ke atas → helai tidak lurus kaku */
          if(p>0.45&&rr()<0.34)x+=lean;
          if(x<0||x>=TS)break;
          /* ujung helai lebih terang; sedikit acak supaya tidak rata */
          const lum=Math.round((0.78+p*0.22+rr()*0.06)*255);
          const a=p>0.88?0.85:1;                 // ujung agak menipis
          c.fillStyle='rgba('+lum+','+lum+','+lum+','+a+')';
          c.fillRect(ox+x,TS-1-k,1,1);
          if(wide&&p<0.7&&x+1<TS)c.fillRect(ox+x+1,TS-1-k,1,1);
        }
      }
    }
    grassTex=new THREE.CanvasTexture(cv);
    grassTex.magFilter=THREE.NearestFilter;grassTex.minFilter=THREE.NearestFilter;
    grassTex.generateMipmaps=false;
    grassTex.encoding=THREE.sRGBEncoding;
  }
  function tileUV(i){
    /* tinggi baris ikut jumlah baris atlas supaya tile baru tidak melenceng */
    const rowH=1/ATLAS_ROWS,colW=1/ATLAS_COLS;
    const tx=i%ATLAS_COLS,ty=(i/ATLAS_COLS)|0,pu=0.002,pv=0.002;
    return [tx*colW+pu,(tx+1)*colW-pu,1-(ty+1)*rowH+pv,1-ty*rowH-pv];
  }

  /* ---------- fade lokal berbasis AREA TRIGGER (bukan radial) ----------
      Semua chunk berbagi satu material daun/atap, jadi mengubah opacity
      material membuat SELURUH pohon & rumah di dunia ikut transparan.
      Sebagai gantinya alpha dihitung di shader berdasar AREA KOTAK (AABB xz):
        - atap  : kotak = footprint rumah yang sedang dimasuki pemain
                  (World.updateRoof) ? SELURUH atap rumah itu full transparan,
                  dinding tidak ikut (dinding bukan material atap).
        - daun  : kotak = bounding-box kanopi pohon yang sedang dinaungi pemain
                  (World.updateCanopy) ? hanya daun pohon itu yang transparan,
                  batang tidak (batang bukan material daun).
      Default min>max = kotak kosong sehingga tidak ada yang memudar. */
  const FADE_LEAF={uMin:{value:new THREE.Vector2(1e9,1e9)},uMax:{value:new THREE.Vector2(-1e9,-1e9)},uAmt:{value:1}};
  const FADE_ROOF={uMin:{value:new THREE.Vector2(1e9,1e9)},uMax:{value:new THREE.Vector2(-1e9,-1e9)},uAmt:{value:1}};
  /* ---------- OKLUSI: blok apa pun yang menutupi pemain ikut memudar ----------
     Berlaku untuk SEMUA material blok (solid/plant/leaf/roof). Uniform di
     bawah diisi tiap frame oleh World.updateOcclusion:
       uOP  = titik tengah badan pemain (dunia)
       uOD  = arah satuan dari pemain MENUJU kamera
       uOL  = jarak pemain?kamera (fragmen di luar rentang ini diabaikan)
       uOR  = radius silinder okluder (blok di dalam silinder ini memudar)
       uOA  = opasitas target blok yang menghalangi (0 = hilang total) */
  const OCC={
    uOP:{value:new THREE.Vector3()},uOD:{value:new THREE.Vector3(0,1,0)},
    uOL:{value:60},uOR:{value:1.15},uOA:{value:1},
    /* bbox rumah yang sedang dimasuki; min>max = oklusi nonaktif */
    uOBMin:{value:new THREE.Vector3(1e9,1e9,1e9)},
    uOBMax:{value:new THREE.Vector3(-1e9,-1e9,-1e9)},
  };

  /* Fade dikerjakan dengan dither-discard, bukan alpha blending: fragmen
     dibuang sesuai pola 4�4 Bayer dengan peluang = tingkat transparansi.
     Cara ini membuat material tetap OPAQUE sehingga urutan gambar antar
     chunk tidak perlu diurutkan � tanpa itu, daun/atap yang sedang memudar
     akan saling menutupi secara acak dan menimbulkan lubang hitam. */
  function applyLocalFade(mat,U){
    mat.transparent=false;
    mat.depthWrite=true;
    mat.onBeforeCompile=sh=>{
      if(U){sh.uniforms.uMin=U.uMin;sh.uniforms.uMax=U.uMax;sh.uniforms.uAmt=U.uAmt;}
      sh.uniforms.uOP=OCC.uOP;sh.uniforms.uOD=OCC.uOD;
      sh.uniforms.uOL=OCC.uOL;sh.uniforms.uOR=OCC.uOR;sh.uniforms.uOA=OCC.uOA;
      sh.uniforms.uOBMin=OCC.uOBMin;sh.uniforms.uOBMax=OCC.uOBMax;
      sh.vertexShader='varying vec3 vWPos;\n'+sh.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vWPos=(modelMatrix*vec4(position,1.0)).xyz;');
      sh.fragmentShader=
        (U?'uniform vec2 uMin;uniform vec2 uMax;uniform float uAmt;\n':'')+
        'uniform vec3 uOP;uniform vec3 uOD;uniform float uOL;uniform float uOR;uniform float uOA;\n'+
        'uniform vec3 uOBMin;uniform vec3 uOBMax;\n'+
        'varying vec3 vWPos;\n'+
        'const mat4 BAYER=mat4( 0.0, 8.0, 2.0,10.0,\n'+
        '                      12.0, 4.0,14.0, 6.0,\n'+
        '                       3.0,11.0, 1.0, 9.0,\n'+
        '                      15.0, 7.0,13.0, 5.0);\n'+
        sh.fragmentShader.replace(
          '#include <clipping_planes_fragment>',
          '#include <clipping_planes_fragment>\n'+
          '  float fa=1.0;\n'+
          /* ---- fade berbasis area kotak (AABB xz). Fragmen di dalam kotak
              trigger (atap rumah yang dimasuki / kanopi pohon yang dinaungi)
              memudar ke uAmt; di luar kotak tetap padat. Tepi diberi transisi
              tipis 0.25 blok agar tidak bergerigi. */
          (U?
          '  {\n'+
          '    float ex=0.25;\n'+
          '    float fx=smoothstep(uMin.x-ex,uMin.x,vWPos.x)*(1.0-smoothstep(uMax.x,uMax.x+ex,vWPos.x));\n'+
          '    float fz=smoothstep(uMin.y-ex,uMin.y,vWPos.z)*(1.0-smoothstep(uMax.y,uMax.y+ex,vWPos.z));\n'+
          '    fa=mix(fa,uAmt,fx*fz);\n'+
          '  }\n':'')+
          /* ---- PZ-style house occlusion ------------------------------------
              Aktif hanya bila World mengisi bbox rumah yang sedang dimasuki
              (uOBMin < uOBMax). Blok rumah yang berada di sisi kamera relatif
              terhadap pemain dibuat memudar, sehingga dinding "hilang"
              mengikuti putaran kamera � mirip Project Zomboid. Terrain di luar
              bbox rumah tidak ikut terpengaruh. */
          '  if(uOA<0.999 && uOBMin.x<uOBMax.x){\n'+
          '    if(vWPos.x>=uOBMin.x && vWPos.x<=uOBMax.x &&\n'+
          '       vWPos.y>=uOBMin.y && vWPos.y<=uOBMax.y &&\n'+
          '       vWPos.z>=uOBMin.z && vWPos.z<=uOBMax.z){\n'+
          '      vec3 rel=vWPos-uOP;\n'+
          '      if(rel.y>0.18){\n'+
          '        float along=dot(rel,uOD);\n'+
          '        if(along>0.12 && along<uOL){\n'+
          '          float f=smoothstep(0.12,1.7,along);\n'+
          '          fa=min(fa,mix(1.0,uOA,f));\n'+
          '        }\n'+
          '      }\n'+
          '    }\n'+
          '  }\n'+
          '  if(fa<0.999){\n'+
          '    int bx=int(mod(gl_FragCoord.x,4.0));\n'+
          '    int by=int(mod(gl_FragCoord.y,4.0));\n'+
          '    float th=(BAYER[by][bx]+0.5)/16.0;\n'+
          '    if(fa<th)discard;\n'+
          '  }');
    };
    mat.customProgramCacheKey=()=>U?'localfade':'occfade';
  }

  /* ---------- ANGIN TUMBUHAN VOXEL ----------
     Diporting dari "NEW MODEL/tumbuhan.html". Goyangan dihitung di VERTEX
     SHADER, jadi ribuan semak/tebu bergerak tanpa biaya CPU sama sekali.
     Amplitudo per verteks datang dari atribut `aSway` yang sudah dihitung
     Env_Plants (naik dari pangkal ke ujung, dan berbeda per jenis tumbuhan),
     sehingga pangkal tetap diam & ujung paling lentur.

     Dipakai menumpuk DI ATAS applyLocalFade: fungsi ini membungkus
     onBeforeCompile yang sudah ada supaya fade/oklusi tetap berlaku. */
  function applyFloraWind(mat){
    const prev=mat.onBeforeCompile;
    mat.onBeforeCompile=sh=>{
      if(prev)prev(sh);
      sh.uniforms.uFT=FLORA_T;
      sh.vertexShader=('attribute float aSway;\nuniform float uFT;\n'+sh.vertexShader)
        .replace('#include <begin_vertex>',
          '#include <begin_vertex>\n'+
          '  {\n'+
          '    vec3 wp=(modelMatrix*vec4(transformed,1.0)).xyz;\n'+
          '    float ph=wp.x*0.40+wp.z*0.55;\n'+
          '    float s1=sin(uFT*1.25+ph);\n'+
          '    float s2=sin(uFT*2.05+ph*1.35+1.7);\n'+
          '    float s3=sin(uFT*0.55+ph*0.60+4.1);\n'+
          '    float fl=sin(uFT*3.10+wp.x*2.2+wp.y*1.4+wp.z*2.6);\n'+
          '    transformed.x+=(s1*0.55+s2*0.28+s3*0.35+fl*0.10)*aSway;\n'+
          '    transformed.z+=(s2*0.45+s3*0.30-s1*0.20+fl*0.08)*aSway*0.75;\n'+
          '  }');
    };
    mat.customProgramCacheKey=()=>'florawind';
  }

  /* ---------- RUMPUT DUNIA: angin + TERINJAK ----------
     Material khusus kartu rumput 3-plane. Tiga hal dikerjakan di VERTEX SHADER
     sehingga biaya CPU-nya nol berapa pun banyak rumputnya:

     1. ANGIN — sama seperti applyFloraWind, tapi `aSway` di mesh rumput adalah
        FAKTOR TINGGI 0..1, jadi dikali uTip (amplitudo ujung) di sini.

     2. TERINJAK — inilah efek yang diminta: rumput tertekuk MENJAUH dari
        pemain/NPC/monster yang melewatinya, lalu berdiri lagi perlahan.
        Semua penginjak dikirim sebagai SATU array uniform `uTr` (xz + radius
        + kekuatan). Shader menguji jarak fragmen ke tiap penginjak; yang di
        dalam radius ditekuk keluar sebesar (1-d/r) dan ikut ditekan ke bawah
        (rumput yang dilangkahi merebah, bukan cuma miring).
        Batas MAX_TRAMPLE=12 dipilih supaya loop shader tetap pendek; World
        mengisinya dengan 12 penginjak TERDEKAT ke kamera saja.

     3. UJUNG MEMBULAT saat ditekuk — bobot tekukan memakai aSway yang sama,
        jadi pangkal tetap menempel tanah.

     Kartu memakai DoubleSide + alphaTest: satu quad terlihat dari dua arah
     tanpa menggandakan geometri. alphaTest (bukan blending) menjaga material
     tetap opaque sehingga tidak perlu penyortiran per-chunk. */
  const MAX_TRAMPLE=12;
  /* tiap penginjak = vec4(x, z, radius, kekuatan). radius<=0 = slot mati. */
  const TRAMPLE={value:(()=>{const a=[];for(let i=0;i<MAX_TRAMPLE;i++)a.push(new THREE.Vector4(0,0,0,0));return a;})()};
  const TRAMPLE_N={value:0};
  function applyGrassShader(mat){
    const prev=mat.onBeforeCompile;
    mat.onBeforeCompile=sh=>{
      if(prev)prev(sh);
      sh.uniforms.uFT=FLORA_T;
      sh.uniforms.uTr=TRAMPLE;
      sh.uniforms.uTrN=TRAMPLE_N;
      sh.uniforms.uTip={value:(typeof window!=='undefined'&&window.Env_Plants&&
                               Env_Plants.worldGrassTipSway)?Env_Plants.worldGrassTipSway():0.08};
      sh.vertexShader=(
        'attribute float aSway;\nuniform float uFT;\nuniform float uTip;\n'+
        'uniform vec4 uTr['+MAX_TRAMPLE+'];\nuniform int uTrN;\n'+sh.vertexShader)
        .replace('#include <begin_vertex>',
          '#include <begin_vertex>\n'+
          '  {\n'+
          '    vec3 wp=(modelMatrix*vec4(transformed,1.0)).xyz;\n'+
          '    float sw=aSway*uTip;\n'+
          /* --- angin --- */
          '    float ph=wp.x*0.40+wp.z*0.55;\n'+
          '    float s1=sin(uFT*1.25+ph);\n'+
          '    float s2=sin(uFT*2.05+ph*1.35+1.7);\n'+
          '    float s3=sin(uFT*0.55+ph*0.60+4.1);\n'+
          '    float fl=sin(uFT*3.10+wp.x*2.2+wp.y*1.4+wp.z*2.6);\n'+
          '    transformed.x+=(s1*0.55+s2*0.28+s3*0.35+fl*0.10)*sw;\n'+
          '    transformed.z+=(s2*0.45+s3*0.30-s1*0.20+fl*0.08)*sw*0.75;\n'+
          /* --- terinjak: tekuk menjauh dari penginjak terdekat ---
             CATATAN: nama variabel di sini TIDAK BOLEH `flat` — itu kata kunci
             cadangan GLSL ES 3.0 (qualifier interpolasi) dan membuat vertex
             shader gagal dikompilasi, sehingga rumput tidak tergambar sama
             sekali. Dipakai `press` (tekanan rebah). */
          '    vec2 push=vec2(0.0);\n'+
          '    float press=0.0;\n'+
          '    for(int i=0;i<'+MAX_TRAMPLE+';i++){\n'+
          '      if(i>=uTrN)break;\n'+
          '      vec4 t=uTr[i];\n'+
          '      if(t.z<=0.0)continue;\n'+
          '      vec2 d=wp.xz-t.xy;\n'+
          '      float dist=length(d);\n'+
          '      if(dist>=t.z)continue;\n'+
          /* smoothstep → tepi pengaruh halus, tidak ada garis batas kaku */
          '      float k=1.0-smoothstep(0.0,t.z,dist);\n'+
          '      k*=t.w;\n'+
          '      push+=normalize(d+vec2(1e-4,0.0))*k;\n'+
          '      press=max(press,k);\n'+
          '    }\n'+
          /* bobot aSway: pangkal tetap di tanah, ujung merebah paling jauh */
          '    transformed.xz+=push*aSway*0.42;\n'+
          '    transformed.y-=press*aSway*0.30;\n'+
          '  }');
    };
    mat.customProgramCacheKey=()=>'wgrass';
  }




  function getMats(){
    if(!atlasTex)makeAtlas();
    if(!MAT_SOLID){
      MAT_SOLID=new THREE.MeshLambertMaterial({map:atlasTex,vertexColors:true});
      /* blok padat & tanaman juga memakai shader fade agar apa pun yang
         menghalangi pandangan ke pemain ikut menghilang (uniform OCC) */
      applyLocalFade(MAT_SOLID,null);
      MAT_PLANT=new THREE.MeshLambertMaterial({map:atlasTex,vertexColors:true,alphaTest:0.5,side:THREE.DoubleSide});
      applyLocalFade(MAT_PLANT,null);
      /* tumbuhan voxel (semak beri, kaktus, tebu, tulip): warna dari verteks
         (bukan atlas) + goyangan angin di vertex shader */
      MAT_FLORA=new THREE.MeshLambertMaterial({vertexColors:true});
      applyLocalFade(MAT_FLORA,null);
      applyFloraWind(MAT_FLORA);

      /* RUMPUT DUNIA: kartu 3-plane bertekstur alpha. Tekstur terpisah dari
         atlas blok (butuh alpha), DoubleSide supaya satu quad terlihat dari dua
         arah, alphaTest supaya tetap opaque (tanpa sorting). */
      if(!grassTex)makeGrassTex();
      MAT_WGRASS=new THREE.MeshLambertMaterial({
        map:grassTex,vertexColors:true,alphaTest:0.45,side:THREE.DoubleSide});
      applyLocalFade(MAT_WGRASS,null);
      applyGrassShader(MAT_WGRASS);

      /* daun dipisah agar bisa dibuat transparan saat pemain di bawah kanopi.
         Materialnya tetap opaque; transparansi ditangani applyLocalFade. */
      MAT_LEAF=new THREE.MeshLambertMaterial({map:atlasTex,vertexColors:true});
      applyLocalFade(MAT_LEAF,FADE_LEAF);
      /* atap rumah: material sendiri supaya bisa di-fade saat pemain masuk */
      MAT_ROOF=new THREE.MeshLambertMaterial({map:atlasTex,vertexColors:true});
      applyLocalFade(MAT_ROOF,FADE_ROOF);


      /* tinggi gelombang: dipakai bersama oleh vertex (ombak geometrik) dan
         fragment (normal finite-difference) supaya bentuknya konsisten.
         Di-port dari "NEW MODEL/AIR.html" (air cozy yg disukai user). */
      const GLSL_WAVES=`
        float wsum(vec2 p,float t){
          float h=0.0;
          h+=sin(p.x*0.60+t*1.30)*0.09;
          h+=sin(p.y*0.75+t*1.05)*0.078;
          h+=sin((p.x+p.y)*0.40+t*0.80)*0.06;
          h+=sin((p.x-p.y)*0.55+t*1.60)*0.036;
          return h;
        }`;
      MAT_WATER=new THREE.ShaderMaterial({
        transparent:true,depthWrite:false,
        uniforms:{uTime:{value:0},uSunDir:{value:new THREE.Vector3(0,1,0)},
          uNight:{value:0},uEyePos:{value:new THREE.Vector3()},
          uDeep:{value:new THREE.Color('#1f7fa0')},
          uShallow:{value:new THREE.Color('#5fd0c6')},
          uSky:{value:new THREE.Color('#cfe4f2')}},
        vertexShader:`uniform float uTime;attribute float aDepth;
          varying float vDepth;varying vec3 vWorld;
          ${GLSL_WAVES}
          void main(){
            vDepth=aDepth;
            /* ombak lebih kecil di air dangkal (ds), lebih besar di air dalam */
            float ds=clamp(aDepth/1.6,0.10,1.0);
            vec3 pos=position;
            pos.y+=wsum(pos.xz,uTime)*ds;
            vec4 wp=modelMatrix*vec4(pos,1.0);
            vWorld=wp.xyz;
            gl_Position=projectionMatrix*viewMatrix*wp;
          }`,
        fragmentShader:`uniform float uTime,uNight;uniform vec3 uSunDir,uDeep,uShallow,uSky,uEyePos;
          varying float vDepth;varying vec3 vWorld;
          ${GLSL_WAVES}
          float hash21(vec2 p){p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}
          float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);
            return mix(mix(hash21(i),hash21(i+vec2(1,0)),u.x),
                       mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),u.x),u.y);}
          void main(){
            float t=uTime;vec2 p=vWorld.xz;
            float ds=clamp(vDepth/1.6,0.10,1.0);
            /* normal dari finite-difference gelombang */
            float e=0.35;
            float hC=wsum(p,t)*ds;
            float hX=wsum(p+vec2(e,0.0),t)*ds;
            float hZ=wsum(p+vec2(0.0,e),t)*ds;
            vec3 n=normalize(vec3((hC-hX)*1.5,e,(hC-hZ)*1.5));
            /* riak detail kecil (dikuatkan agar terlihat dari sudut isometrik) */
            float r1=vnoise(p*3.2+vec2(t*0.55,-t*0.35));
            float r2=vnoise(p*5.4+vec2(-t*0.42,t*0.50));
            n.xz+=(vec2(r1,r2)-0.5)*0.28;
            n=normalize(n);
            vec3 V=normalize(uEyePos-vWorld);
            vec3 L=normalize(uSunDir);
            float fres=pow(1.0-max(dot(n,V),0.0),3.0);
            float depthF=clamp(vDepth/2.6,0.0,1.0);
            vec3 col=mix(uShallow,uDeep,depthF);
            /* kaustik halus di air dangkal */
            float ca=vnoise(p*2.4+vec2(t*0.35,t*0.28))*vnoise(p*3.1-vec2(t*0.22,t*0.40));
            col+=vec3(0.35,0.50,0.45)*ca*(1.0-depthF)*0.5;
            /* pantulan langit: base 0.20 supaya tetap terlihat meski dilihat dari
               atas (kamera isometrik), bukan cuma di sudut landai */
            col=mix(col,uSky,clamp(0.20+fres*0.7,0.0,1.0));
            /* kilau matahari: power diperkecil & intensitas dihaluskan supaya
               tidak jadi bercak-bercak putih tajam (terlihat seperti puzzle) */
            vec3 H=normalize(L+V);
            float spec=pow(max(dot(n,H),0.0),90.0)*0.8+pow(max(dot(n,H),0.0),320.0)*1.2;
            col+=vec3(1.0,0.96,0.85)*spec*(1.0-uNight*0.7);
            /* kilauan putih: dibuat lebih jarang & halus agar menyatu dengan air */
            float spk=vnoise(p*9.0+vec2(t*1.2,-t*0.9));
            col+=vec3(0.95,0.98,1.0)*smoothstep(0.82,0.98,spk)*0.15*(1.0-uNight);
            /* buih di tepi / air dangkal */
            float foamMask=1.0-smoothstep(0.05,0.8,vDepth);
            float fn=vnoise(p*5.5+vec2(t*0.6,-t*0.45))+0.35*sin(t*2.0+p.x*2.5+p.y*3.0);
            float foam=foamMask*smoothstep(0.55,1.05,fn);
            col=mix(col,vec3(0.96,0.99,1.0),foam*0.9);
            /* alpha: air lebih transparan � dasar cukup jelas terlihat.
               Dalam sedikit lebih padat, dangkal lebih tembus. */
            float alpha=mix(0.40,0.65,depthF);
            alpha=max(alpha,max(fres*0.9,foam*0.9));
            /* malam: gelapkan air */
            col*=mix(1.0,0.30,uNight);
            gl_FragColor=vec4(col,alpha);
          }`,
        /* DoubleSide: permukaan air terlihat dari atas & dari bawah air */
        side:THREE.DoubleSide
      });
    }
    return {solid:MAT_SOLID,plant:MAT_PLANT,water:MAT_WATER,leaf:MAT_LEAF,
            roof:MAT_ROOF,flora:MAT_FLORA,wgrass:MAT_WGRASS};
  }

  /* ---------- definisi wajah kubus ---------- */
  const FACES=[
    {dir:[-1,0,0],corners:[[0,1,0],[0,0,0],[0,1,1],[0,0,1]]},
    {dir:[ 1,0,0],corners:[[1,1,1],[1,0,1],[1,1,0],[1,0,0]]},
    {dir:[0,-1,0],corners:[[1,0,1],[0,0,1],[1,0,0],[0,0,0]]},
    {dir:[0, 1,0],corners:[[0,1,1],[1,1,1],[0,1,0],[1,1,0]]},
    {dir:[0,0,-1],corners:[[1,0,0],[0,0,0],[1,1,0],[0,1,0]]},
    {dir:[0,0, 1],corners:[[0,0,1],[1,0,1],[0,1,1],[1,1,1]]},
  ];
  const AO_F=[0.55,0.75,0.88,1.0];
  const solidQ=id=>id!==B.AIR&&id!==B.WATER;

  /* PENGAKSES BLOK cepat. Default = World.getBlock, tapi build() mengganti
      `getB` dengan pembaca array lokal (chunk + 8 tetangga) sehingga ribuan
      panggilan getBlock saat face-visibility & AO tidak lagi membayar biaya
      Math.floor + lookup Map chunk tiap kali. Ini pemangkasan biaya mesh terbesar. */
  let getB=(x,y,z)=>World.getBlock(x,y,z);

  function faceAO(wx,wy,wz,f){
    const d=f.dir,na=d[0]!==0?0:d[1]!==0?1:2;
    const t=[0,1,2].filter(a=>a!==na),res=[1,1,1,1];
    for(let i=0;i<4;i++){
      const c=f.corners[i];
      const s1=c[t[0]]?1:-1,s2=c[t[1]]?1:-1;
      const o1=[d[0],d[1],d[2]],o2=[d[0],d[1],d[2]];
      o1[t[0]]+=s1;o2[t[1]]+=s2;
      const o3=[d[0],d[1],d[2]];o3[t[0]]+=s1;o3[t[1]]+=s2;
      const a=solidQ(getB(wx+o1[0],wy+o1[1],wz+o1[2]))?1:0;
      const b=solidQ(getB(wx+o2[0],wy+o2[1],wz+o2[2]))?1:0;
      const cc=solidQ(getB(wx+o3[0],wy+o3[1],wz+o3[2]))?1:0;
      res[i]=AO_F[(a&&b)?0:3-(a+b+cc)];
    }
    return res;
  }
  /* [atas, bawah, samping] index tile atlas.
     `gt` = tingkat tekstur rumput 0..2 (0 gundul, 1 sedang, 2 lebat) untuk
     GRASS & RED_SOIL. Default 2 (lebat) supaya pemanggil lain (effects.js
     waveBlockGeo) tetap mendapat tampilan blok rumput normal. */
  const GT_TILES  =[[14,2,2],[13,2,15],[0,2,1]];
  const GT_TILES_R=[[28,29,29],[26,29,27],[23,29,25]];
  const tilesFor=(id,gt)=>{
    if(id===B.GRASS)return GT_TILES[gt===undefined?2:gt];
    if(id===B.DIRT)return[2,2,2];
    if(id===B.STONE)return[3,3,3];
    if(id===B.WOOD)return[5,5,4];
    if(id===B.LEAF)return[6,6,6];
    if(id===B.SAND)return[16,16,16];
    if(id===B.SNOW)return[17,17,17];
    if(id===B.ORE_IRON)return[18,18,18];
    if(id===B.ORE_GOLD)return[19,19,19];
    if(id===B.ORE_CRYSTAL)return[20,20,20];
    if(id===B.PLANK)return[21,21,21];
    /* ladang: atas tanah bajakan, samping/bawah tanah biasa */
    if(id===B.FARM)return[22,2,2];
    /* tanah merah biome REDLANDS */
    if(id===B.RED_SOIL)return GT_TILES_R[gt===undefined?2:gt];
    /* atap memakai tile kayu gelap agar beda jelas dari dinding papan */
    if(id===B.ROOF)return[4,21,4];
    return[2,2,2];
  };
  /* tanaman boleh tumbuh di rumput, pasir (kaktus/rumput gurun), salju & tanah merah */
  const PLANTABLE=new Set([B.GRASS,B.SAND,B.SNOW,B.RED_SOIL]);

  /* =========================================================================
     GRADASI TEKSTUR 4 TINGKAT (+ TEPI AIR)
     -------------------------------------------------------------------------
     Tekstur atlas tetap SATU tile per jenis blok; yang berbeda adalah WARNA
     VERTEKS pengalinya. Versi sebelumnya menghitung pengali itu dari rumus
     noise halus (±10%) dan hasilnya terlalu tipis untuk terlihat di layar.

     Sekarang tiap jenis blok punya PALET 4 TINGKAT eksplisit: warna setiap
     tingkat ditulis sebagai target hex, lalu diubah menjadi pengali verteks
     (target ÷ rata-rata warna tile). Karena jarak antar tingkat ditentukan
     langsung di palet, bedanya besar dan benar-benar terbaca.

     TINGKAT (0..3) diambil dari:
       · biome BERUMPUT (Hutan, Tanah Merah) → kerapatan RUMPUT DUNIA
         (WGEN.grassHeat). Tingkat 0 = blok GUNDUL tanpa satu bilah pun →
         cokelat terang seperti tanah yang sering dilewati; tingkat 3 = pusat
         rumpun dengan rumput TERTINGGI → hijau paling pekat.
       · biome TANPA rumput (gurun, tundra, pegunungan, pantai, laut) →
         noise petak WGEN.tintA yang dikuantisasi jadi 4 tingkat, sehingga
         pasir/salju/batu pun bergradasi dan tidak rata.

     TEPI AIR: kolom yang permukaannya SEJAJAR permukaan air (blok teratas di
     y = CFG.SEA-1) diwarnai memakai PALET PANTAI menurut jarak ke air:
       0 blok = cokelat gelap (lumpur basah) → 1 = cokelat terang →
       2 = kekuningan → ≥3 = warna asli biome (mengikuti tingkat vegetasinya).
     Tanah yang lebih tinggi dari permukaan air TIDAK terpengaruh, jadi hanya
     dataran serata air yang punya tepian berlumpur seperti di dunia nyata.
     ========================================================================= */
  /* Rata-rata & PERSENTIL-90 warna tiap tile atlas, diukur dari makeAtlas di
     atas. `AVG` dipakai mengubah warna TARGET palet menjadi pengali verteks;
     `P90` dipakai pal() sebagai patokan agar bagian TERANG tile tidak habis
     terpotong di 255. Persentil 90 (bukan piksel paling terang) dipilih sengaja:
     tiap tile punya beberapa piksel sorot yang jauh lebih terang dari sisanya,
     dan memaksa piksel-piksel itu tetap di bawah 255 akan menggelapkan seluruh
     palet 10-15% — pasir jadi kusam & salju jadi kelabu. Membiarkan ≤10% piksel
     tersorot menyentuh 255 tidak merusak gradasi karena 90% sisanya tetap
     bergerak. Bila suatu tile digambar ulang, angka di sini ikut disesuaikan. */
  const TILE_AVG={
    grass:[ 96,158, 62], gside:[104,103, 54], dirt:[112, 84, 54],
    stone:[134,139,148], sand :[224,206,151], snow :[235,243,250],
    red  :[157, 59, 42], leaf :[ 58,118, 45], wood :[100, 70, 41],
    farm :[ 96, 63, 32],
    /* tingkat rumput SEDANG & GUNDUL (tile 13/15/14) */
    gmid :[137,144, 68], gmside:[115, 94, 55], gbare:[159,120, 67],
    /* tingkat REDLANDS sedang & gundul (tile 25..29) */
    rside:[131, 63, 44], rmid:[163, 90, 60], rmside:[130, 70, 49],
    rbare:[166,111, 77], rbside:[127, 68, 47],
  };
  const TILE_P90={
    grass:[114,176, 75], gside:[141,163, 77], dirt:[144,114, 77],
    stone:[138,143,152], sand :[238,221,172], snow :[238,245,251],
    red  :[194, 84, 56], leaf :[ 62,125, 49], wood :[110, 79, 47],
    farm :[111, 74, 38],
    gmid :[158,160, 82], gmside:[147,141, 81], gbare:[177,138, 82],
    rside:[171, 94, 67], rmid:[185,110, 76], rmside:[168,106, 77],
    rbare:[189,135, 96], rbside:[162,100, 73],
  };
  /* Ruang aman di atas palet. Setelah palet, warna verteks masih dikali:
       ·  tint acak per blok            maks 1.06
       ·  variasi halus dalam tingkat   maks ~1.09
     Bias biome tidak ikut dihitung di sini; pengaruhnya ditahan oleh PAL_CAP
     di bawah, sehingga palet tidak perlu diredupkan untuk mengantisipasinya. */
  const PAL_HEAD=1.06*1.09;
  /* daftar warna target → Float32Array pengali (3 angka per tingkat).
     Bila tingkat paling terang mendorong bagian terang tile (P90) melewati 255,
     SELURUH palet diperkecil dengan faktor yang sama — kalau tidak, bagian itu
     terpotong menjadi putih dan beda antar tingkat lenyap (inilah sebabnya
     salju & pasir paling sulit dibuat bergradasi). Karena penskalaannya
     seragam, JARAK antar tingkat tetap proporsional. */
  function pal(base,hexes){
    const b=TILE_AVG[base],pk=TILE_P90[base],o=new Float32Array(hexes.length*3);
    for(let i=0;i<hexes.length;i++){
      o[i*3  ]=((hexes[i]>>16)&255)/b[0];
      o[i*3+1]=((hexes[i]>>8 )&255)/b[1];
      o[i*3+2]=( hexes[i]     &255)/b[2];
    }
    let f=1;
    for(let i=0;i<hexes.length;i++)for(let c=0;c<3;c++){
      const peak=pk[c]*o[i*3+c]*PAL_HEAD;
      if(peak>255)f=Math.min(f,255/peak);
    }
    if(f<1)for(let i=0;i<o.length;i++)o[i]*=f;
    return o;
  }
  /* Batas atas pengali per jenis tile: nilai di atas ini akan mendorong bagian
     terang tile (P90) melewati 255 setelah dikali tint & variasi. Dipakai
     menahan BIAS BIOME — tanpa batas ini bias yang menaikkan satu kanal (mis.
     biru ×1.05 di tundra) membuat salju & pasir tersorot rata. */
  const PAL_CAP={};
  function cap(base){
    const pk=TILE_P90[base];
    return [255/(pk[0]*PAL_HEAD),255/(pk[1]*PAL_HEAD),255/(pk[2]*PAL_HEAD)];
  }
  /* ---------- PALET 4 TINGKAT (wajah ATAS) ----------
     Urutan: [0]=paling gundul/kering … [3]=paling subur/pekat */
  const P_TOP={},P_SIDE={};
  /* RUMPUT — inilah gradasi utama yang diminta: warna tanah COKELAT di blok
     gundul (mirip tanah/dirt tapi lebih TERANG & sedikit hijau), lalu naik ke
     kuning-zaitun, hijau, sampai HIJAU PEKAT di pusat rumpun tempat rumput
     dunia paling tinggi:
       0 cokelat tanah terang (R>G, sedikit hijau) → blok GUNDUL, tanpa bilah
       1 kuning-zaitun (R≈G)                        → rumput baru tumbuh
       2 hijau sedang                               → rumpun sedang
       3 hijau pekat gelap                          → pusat rumpun (rumput tertinggi)
     Untuk perbandingan: tile bawah/dirt = (119,88,56); tingkat 0 sengaja lebih
     terang dari itu tapi tetap jelas cokelat, bukan hijau. */
  P_TOP [B.GRASS]=pal('grass',[0xa17840,0x94903a,0x5a9a32,0x2c7d1c]);
  P_SIDE[B.GRASS]=pal('gside',[0x94794a,0x84763c,0x717033,0x5c682d]);
  /* TANAH: kering pucat → lembap gelap */
  P_TOP [B.DIRT ]=pal('dirt' ,[0x8b6942,0x7d5d39,0x6f5231,0x61462a]);
  P_SIDE[B.DIRT ]=P_TOP[B.DIRT];
  P_TOP [B.FARM ]=pal('farm' ,[0x77522c,0x684626,0x5a3c20,0x4c321a]);
  P_SIDE[B.FARM ]=P_TOP[B.DIRT];
  /* PASIR: putih terpanggang → keemasan pekat. Target sengaja di bawah rata-rata
     tile (224,206,151) karena tile pasir punya piksel sangat terang (246,233,194);
     tanpa itu pal() harus memperkecil seluruh palet dan pasir jadi kusam. */
  P_TOP [B.SAND ]=pal('sand' ,[0xdccb92,0xd0bd82,0xc2ad72,0xb29a60]);
  P_SIDE[B.SAND ]=P_TOP[B.SAND];
  /* SALJU: tile-nya memuat piksel PUTIH MURNI (255,255,255) — kasus tersulit.
     Target tertinggi dipatok jauh di bawah rata-rata tile (235,243,250) supaya
     puncak putihnya tidak terpotong; kalau terpotong, keempat tingkat menyatu
     menjadi putih rata dan salju kembali terlihat monoton. */
  P_TOP [B.SNOW ]=pal('snow' ,[0xd6dfe8,0xc5d1de,0xb2c0d1,0x9eadc1]);
  P_SIDE[B.SNOW ]=P_TOP[B.SNOW];
  /* BATU: abu pucat hangat → abu tua dingin */
  P_TOP [B.STONE]=pal('stone',[0x9aa0a6,0x8b9199,0x7d838c,0x6e747e]);
  P_SIDE[B.STONE]=P_TOP[B.STONE];
  /* TANAH MERAH: berdebu pucat → merah pekat (tingkat 3 = rumput merah lebat).
     Sisi memakai basis 'rside' (tile sisi tingkat lebat) karena itulah tile yang
     dipakai wajah samping RED_SOIL di jalur non-gradasi. */
  P_TOP [B.RED_SOIL]=pal('red'  ,[0xa9714e,0xa55b3c,0x9d4630,0x923228]);
  P_SIDE[B.RED_SOIL]=pal('rside',[0xa9714e,0xa55b3c,0x9d4630,0x923228]);
  /* DAUN: tiap pohon dapat satu dari 4 tingkat hijau (dari tintC) */
  P_TOP [B.LEAF ]=pal('leaf' ,[0x5e9c3f,0x4a8d36,0x3a7c2d,0x2d6a26]);
  P_SIDE[B.LEAF ]=P_TOP[B.LEAF];
  /* KAYU: variasi tipis saja supaya pohon tetap terlihat sejenis */
  P_TOP [B.WOOD ]=pal('wood' ,[0x7a5636,0x6e4c2f,0x624329,0x573b24]);
  P_SIDE[B.WOOD ]=P_TOP[B.WOOD];

  /* ---------- GRADASI RUMPUT KONTINU 6 STOP (grass & tanah merah) ----------
     Permintaan user: gradasi tidak berhenti di tepi rumpun. Dari PUSAT rumpun
     (rumput tertinggi) ke luar, warna turun bertahap hijau→kuning→cokelat, dan
     TERUS bergradasi di wilayah gundul sampai PUSAT antar-rumpun yang paling
     jauh dari rumput menjadi COKELAT TERANG MURNI tanpa hijau. Posisi diambil
     dari WGEN.grassField (nilai kontinu bertanda: >0 di dalam rumpun, <0 di
     wilayah gundul makin jauh makin negatif), dipetakan ke 0..5:
        stop 0 = cokelat terang murni  (pusat gundul, tanpa rumput)
        stop 2-3 ≈ tepi rumpun          (olive, mulai ada bilah)
        stop 5 = hijau pekat            (pusat rumpun, rumput tertinggi)

     TIGA TINGKAT TEKSTUR (dari prototipe Grass Block.html)
     -------------------------------------------------------------------------
     Ramp yang sama dipakai 3× — sekali untuk tiap TILE tingkat (gundul/sedang/
     lebat). Karena warna dasar tiap tile sudah dekat dengan target rampnya,
     pengali verteksnya ≈1 sehingga POLA PIKSEL tile (kerikil di tanah gundul,
     helai rumput di tanah lebat) tidak tergerus jadi warna rata. Inilah yang
     dulu hilang: satu tile rumput hijau dipaksa jadi cokelat lewat verteks,
     jadi blok gundul tetap berpola rumput dan tidak pernah terlihat "bertanah".
     `GT_BASE[id][gt]` = [nama tile ATAS, nama tile SISI] untuk tingkat gt. */
  const GT_BASE={};
  GT_BASE[B.GRASS]   =[['gbare','dirt'  ],['gmid','gmside'],['grass','gside']];
  GT_BASE[B.RED_SOIL]=[['rbare','rbside'],['rmid','rmside'],['red'  ,'rside']];
  /* Target warna ramp. Rentangnya sengaja DILEBARKAN dari versi sebelumnya
     (stop 0 lebih terang & lebih jingga, stop 5 lebih pekat) supaya bedanya
     tidak lagi terasa monoton. */
  const GRAMP_HEX={},GRAMP_HEX_SIDE={};
  GRAMP_HEX     [B.GRASS]=[0xbd8c4e,0xae8a3c,0x9c9a2c,0x6ea52a,0x449722,0x257c16];
  GRAMP_HEX_SIDE[B.GRASS]=[0xa3813f,0x9a7d3d,0x8b7533,0x776f2f,0x63682b,0x506026];
  GRAMP_HEX     [B.RED_SOIL]=[0xbd9260,0xb87848,0xac5c36,0xa0452c,0x933225,0x86211d];
  GRAMP_HEX_SIDE[B.RED_SOIL]=[0xa87c56,0xa06a45,0x955436,0x89412c,0x7d3125,0x71241f];
  const GRAMP_TOP={},GRAMP_SIDE={};
  for(const gid of [B.GRASS,B.RED_SOIL]){
    GRAMP_TOP[gid]=[];GRAMP_SIDE[gid]=[];
    for(let gt=0;gt<3;gt++){
      GRAMP_TOP [gid][gt]=pal(GT_BASE[gid][gt][0],GRAMP_HEX     [gid]);
      GRAMP_SIDE[gid][gt]=pal(GT_BASE[gid][gt][1],GRAMP_HEX_SIDE[gid]);
    }
  }
  /* tingkat TEKSTUR dari posisi ramp: 0 gundul, 1 sedang, 2 lebat */
  const gtOf=p=>p<1.7?0:(p<3.4?1:2);
  /* petakan grassField f → posisi 0..5.
     Titik tengah (mid) & kemiringan dikalibrasi dari distribusi grassField yang
     diukur di dunia sungguhan (median≈0.04, p25≈-0.29, p75≈0.45, 47% bernilai
     negatif). Dengan mid=2.30 dan kedua sisi ≈2.4:
        tingkat GUNDUL  ≈28% blok   (f < -0.25)
        tingkat SEDANG  ≈47% blok
        tingkat LEBAT   ≈25% blok   (f > 0.44)
     Versi sebelumnya memakai mid=2.5 & kOut=1.6 sehingga hanya ~14% blok yang
     mencapai tingkat gundul — tanah cokelat nyaris tak pernah terlihat, dan
     itulah sebab gradasinya terasa monoton & "tanpa tekstur tanah". */
  function grassPos(f){
    const p=2.30+(f>=0?f*2.5:f*2.4);
    return p<0?0:(p>5?5:p);
  }
  /* Prototipe memakai 24 material DISKRET, jadi tiap blok punya satu nada dan
     bedanya antar blok terbaca sebagai petak-petak. Gradasi kontinu di sini
     terlalu mulus sampai terasa rata, maka posisinya DI-DITHER per blok lalu
     DIKUANTISASI ke langkah 0.25 (21 nada): hasilnya tetap bergradasi dari
     rumpun ke tanah gundul, tapi tiap blok punya nadanya sendiri. */
  const GPOS_STEP=0.25, GPOS_DITHER=0.55;
  function grassPosBlock(f,h){
    let p=grassPos(f)+(h-0.5)*GPOS_DITHER;
    if(p<0)p=0; else if(p>5)p=5;
    return Math.round(p/GPOS_STEP)*GPOS_STEP;
  }
  function rampSample(r,p,out){
    const i=p>=5?4:(p|0), f=p-i, o=i*3, n=o+3;
    out[0]=r[o]+(r[n]-r[o])*f;
    out[1]=r[o+1]+(r[n+1]-r[o+1])*f;
    out[2]=r[o+2]+(r[n+2]-r[o+2])*f;
  }
  /* ---------- TONJOLAN PERMUKAAN (dari prototipe) ----------
     Di Grass Block.html blok cokelat dibuat 0.18/1.6 ≈ 0.11 lebih RENDAH dari
     blok berumput, sehingga jalur gundul terlihat seperti jalan setapak yang
     terkikis. Di sini yang dinaikkan adalah blok BERUMPUT (bukan menurunkan
     yang gundul) supaya tanah gundul tetap sejajar kotak tabrakan: pemain yang
     berdiri di rumput tampak sedikit tenggelam di antara bilah — jauh lebih
     wajar daripada tampak melayang di atas jalur gundul.
     Murni visual; fisika & penempatan blok tetap di grid bulat.

     DIHITUNG PER SUDUT, BUKAN PER BLOK.
     Dua blok padat bersebelahan tidak saling menghasilkan wajah samping, jadi
     kalau masing-masing dinaikkan rata sebesar nilainya sendiri, permukaan
     keduanya berbeda tinggi dan menyisakan CELAH yang tembus ke dalam tanah.
     (Percobaan menambal celah itu dengan quad undakan gagal: seam-nya terlalu
     banyak & bervariasi.) Solusinya struktural — tinggi tiap SUDUT kisi adalah
     rata-rata tonjolan 4 kolom yang menyentuhnya, sehingga blok bertetangga
     SELALU berbagi sudut dengan nilai identik. Permukaannya otomatis rapat
     (watertight) dan melandai halus dari rumpun ke tanah gundul.
     Karena rz≥0 dan sudut bawah tidak pernah digeser, wajah samping blok bawah
     paling banyak hanya BERTUMPUK sedikit dengan blok di atasnya — tidak pernah
     menyisakan lubang. */
  const RAISE_MAX=0.12;
  const raiseOf=p=>(p!==p)?0:RAISE_MAX*(p/5);

  /* ---------- PALET TEPI AIR ----------
     3 stop; stop ke-4 = warna tingkat vegetasi, sehingga pita cokelat menyambung
     mulus ke warna biome. `shd` yang masuk = (jarak blok ke air) − 1, karena
     blok air terdekat selalu minimal 1 blok jauhnya:
       shd 0 → menempel air   = cokelat gelap (lumpur basah)
       shd 1 → 2 blok         = cokelat sedang
       shd 2 → 3 blok         = cokelat terang
       shd ≥3                 = warna biome normal
     Untuk GRASS & RED_SOIL, dua stop pertama sengaja dibuat COKELAT GELAP murni
     dengan unsur hijau/merah SANGAT sedikit (permintaan user): tanah di tepi air
     terlihat becek berlumpur, bukan hijau gelap yang sulit dibedakan.
     Basis tilenya = tingkat GUNDUL (gbare/dirt), karena blok tepi air dipaksa
     memakai tekstur tanah gundul di build() — tanah becek tidak berumput. */
  const SH_TOP={},SH_SIDE={};
  SH_TOP [B.GRASS]=pal('gbare',[0x40301c,0x5e4526,0x8f7238]);
  SH_SIDE[B.GRASS]=pal('dirt' ,[0x40301c,0x5a4327,0x816232]);
  SH_TOP [B.RED_SOIL]=pal('rbare' ,[0x34231a,0x533823,0x7d5a34]);
  SH_SIDE[B.RED_SOIL]=pal('rbside',[0x34231a,0x533823,0x7d5a34]);
  SH_TOP [B.DIRT ]=pal('dirt' ,[0x40301e,0x5b4429,0x795a37]);
  SH_SIDE[B.DIRT ]=SH_TOP[B.DIRT];
  /* pasir basah di garis air jauh lebih gelap dari pasir kering */
  SH_TOP [B.SAND ]=pal('sand' ,[0x9c8f68,0xbcab7d,0xd5c38c]);
  SH_SIDE[B.SAND ]=SH_TOP[B.SAND];
  /* salju di tepi air jadi bubur es kebiruan */
  SH_TOP [B.SNOW ]=pal('snow' ,[0xa8bccc,0xc4d4e2,0xdbe6f2]);
  SH_SIDE[B.SNOW ]=SH_TOP[B.SNOW];
  /* batu tepi air basah & lebih gelap */
  SH_TOP [B.STONE]=pal('stone',[0x5e646c,0x74797f,0x848991]);
  SH_SIDE[B.STONE]=SH_TOP[B.STONE];

  /* batas pengali per blok (dari tile yang dipakainya) → menahan bias biome.
     GRASS & RED_SOIL kini punya 3 tile (gundul/sedang/lebat) dengan puncak yang
     berbeda; batasnya diambil PALING KETAT di antara ketiganya supaya tidak ada
     tingkat yang terpotong. */
  function capMin(names){
    const o=[1e9,1e9,1e9];
    for(const n of names){const c=cap(n);for(let i=0;i<3;i++)if(c[i]<o[i])o[i]=c[i];}
    return o;
  }
  PAL_CAP[B.GRASS]=capMin(['grass','gside','gmid','gmside','gbare','dirt']);
  PAL_CAP[B.RED_SOIL]=capMin(['red','rside','rmid','rmside','rbare','rbside']);
  PAL_CAP[B.DIRT]=cap('dirt');
  PAL_CAP[B.FARM ]=cap('farm');  PAL_CAP[B.SAND]=cap('sand');
  PAL_CAP[B.SNOW ]=cap('snow');  PAL_CAP[B.STONE]=cap('stone');
  PAL_CAP[B.LEAF]=cap('leaf');
  PAL_CAP[B.WOOD ]=cap('wood');

  /* jumlah tingkat palet & jarak pengaruh tepi air (blok) */
  const TIER_N=4, SHORE_R=3;

  const TMT=[1,1,1],TMS=[1,1,1],_rs=[0,0,0];
  /* ---------- BIAS PER BIOME ----------
     Blok yang sama dipakai beberapa biome (SAND di gurun, pantai & dasar laut;
     STONE di pegunungan & bawah tanah), dan tanpa ini warnanya identik sehingga
     pantai terasa seperti potongan gurun. Nilainya kecil (≤8%): cukup memberi
     karakter wilayah, tidak sampai terlihat sebagai tambalan. */
  const BIOME_BIAS={};
  if(typeof BIOME!=='undefined'){
    BIOME_BIAS[BIOME.DESERT]  =[1.05,1.00,0.92];  // pasir terik, hangat pekat
    BIOME_BIAS[BIOME.BEACH]   =[0.98,1.00,1.06];  // pasir pantai lebih pucat
    BIOME_BIAS[BIOME.OCEAN]   =[0.90,0.95,1.05];  // dasar laut gelap kebiruan
    BIOME_BIAS[BIOME.TUNDRA]  =[0.97,0.99,1.05];  // serba kebiruan pucat
    BIOME_BIAS[BIOME.MOUNTAIN]=[0.96,0.98,1.04];  // batu abu dingin
    BIOME_BIAS[BIOME.FOREST]  =[0.99,1.02,0.98];  // sedikit lebih hijau lembap
    BIOME_BIAS[BIOME.REDLANDS]=[1.04,0.97,0.95];  // lebih pekat kemerahan
  }

  /* blockTint
       id    jenis blok
       tier  tingkat palet 0..3 (dari noise petak; dipakai blok NON-rumput)
       shd   jarak ke air dalam blok bila kolom ini SEJAJAR permukaan air,
             atau -1 bila tidak (tanah lebih tinggi / tidak ada air dekat)
       tA,tB variasi halus DI DALAM satu tingkat supaya tiap tingkat tidak
             tampak seperti bidang warna rata
       bio   biome (untuk BIOME_BIAS)
       gpos  posisi gradasi rumput KONTINU 0..5 (dari WGEN.grassField) untuk
             GRASS & RED_SOIL; NaN/undefined bila blok ini tidak memakainya
       gt    tingkat TEKSTUR 0..2 yang dipakai blok ini (harus cocok dengan tile
             yang dipilih tilesFor, karena palet dihitung relatif ke tile itu)
     Hasil ditulis ke TMT (wajah atas) & TMS (wajah samping/bawah). */
  function blockTint(id,tier,shd,tA,tB,bio,gpos,gt){
    let tr,tg,tb,sr,sg,sb;
    const GRA=GRAMP_TOP[id];
    if(GRA&&gpos===gpos){                      // gpos bukan NaN → gradasi kontinu
      const g=gt===undefined?2:gt;
      rampSample(GRA[g],gpos,_rs);tr=_rs[0];tg=_rs[1];tb=_rs[2];
      rampSample(GRAMP_SIDE[id][g],gpos,_rs);sr=_rs[0];sg=_rs[1];sb=_rs[2];
    }else{
      const PT=P_TOP[id],PS=P_SIDE[id];
      /* blok tanpa palet (papan, atap, bijih) → tanpa gradasi */
      if(!PT){TMT[0]=TMT[1]=TMT[2]=1;TMS[0]=TMS[1]=TMS[2]=1;return;}
      const t=(tier<0?0:(tier>TIER_N-1?TIER_N-1:tier))*3;
      tr=PT[t];tg=PT[t+1];tb=PT[t+2];
      sr=PS[t];sg=PS[t+1];sb=PS[t+2];
    }
    /* --- tepi air: lumpur gelap → cokelat → kuning → warna tingkat di atas --- */
    if(shd>=0&&shd<SHORE_R){
      const ST=SH_TOP[id],SS=SH_SIDE[id];
      if(ST){
        const i=shd<1?0:(shd<2?1:2), f=shd-i;   // f = 0..1 antar dua stop
        const o=i*3, n=o+3;
        /* stop terakhir (i=2 → n=9) tidak ada di palet pantai: pakai warna
           tingkat vegetasi, sehingga pita kuning menyambung mulus ke biome */
        const nr=(n<ST.length)?ST[n]  :tr, ng=(n<ST.length)?ST[n+1]:tg,
              nb=(n<ST.length)?ST[n+2]:tb;
        tr=ST[o]+(nr-ST[o])*f; tg=ST[o+1]+(ng-ST[o+1])*f; tb=ST[o+2]+(nb-ST[o+2])*f;
        const mr=(n<SS.length)?SS[n]  :sr, mg=(n<SS.length)?SS[n+1]:sg,
              mb=(n<SS.length)?SS[n+2]:sb;
        sr=SS[o]+(mr-SS[o])*f; sg=SS[o+1]+(mg-SS[o+1])*f; sb=SS[o+2]+(mb-SS[o+2])*f;
      }
    }
    /* variasi halus di dalam tingkat (±5%) supaya tiap pita tidak rata */
    const a=(tA-0.5)*0.10, b=(tB-0.5)*0.08;
    tr*=1+a+b; tg*=1+a; tb*=1+a-b;
    sr*=1+a*0.7+b*0.5; sg*=1+a*0.7; sb*=1+a*0.7-b*0.5;
    /* bias biome: hanya blok ALAM (bangunan pemain tetap konsisten di mana pun).
       Hasilnya dibatasi PAL_CAP supaya bias yang menaikkan satu kanal tidak
       mendorong bagian terang tile melewati 255 — tanpa batas ini salju di
       tundra & pasir di gurun kembali tersorot rata. */
    const bb=BIOME_BIAS[bio];
    if(bb&&id!==B.PLANK&&id!==B.ROOF&&id!==B.FARM){
      tr*=bb[0];tg*=bb[1];tb*=bb[2];
      sr*=bb[0];sg*=bb[1];sb*=bb[2];
      const cp=PAL_CAP[id];
      if(cp){
        if(tr>cp[0])tr=cp[0]; if(tg>cp[1])tg=cp[1]; if(tb>cp[2])tb=cp[2];
        if(sr>cp[0])sr=cp[0]; if(sg>cp[1])sg=cp[1]; if(sb>cp[2])sb=cp[2];
      }
    }
    TMT[0]=tr;TMT[1]=tg;TMT[2]=tb;
    TMS[0]=sr;TMS[1]=sg;TMS[2]=sb;
  }
  /* batas pengali untuk bilah rumput & tumbuhan (bukan blok): mencegah warna
     gosong / menyilaukan setelah dikali variasi petak */
  const tclamp=v=>v<0.62?0.62:(v>1.32?1.32:v);
  /* pengali warna BILAH RUMPUT DUNIA. Mengikuti TINGKAT blok di bawahnya:
     rumpun tingkat rendah (baru tumbuh di pinggir) lebih kekuningan, pusat
     rumpun paling hijau pekat — jadi gradasi tanah & rumputnya sejalan.
     `shd` ≥ 0 (tepi air) membuat bilah ikut kecokelatan seperti rumput rawa. */
  const TMG=[1,1,1];
  const WG_TIER=[
    [1.22,1.06,0.78],   // tingkat 0/1: kekuningan (rumput pinggir rumpun)
    [1.10,1.04,0.86],
    [1.00,1.00,1.00],   // tingkat 2: warna palet asli env_plants
    [0.90,1.02,0.92],   // tingkat 3: hijau paling pekat
  ];
  function grassTint(tier,shd,tA,tB,red){
    const T=WG_TIER[tier<0?0:(tier>3?3:tier)];
    const a=(tA-0.5)*0.12, b=(tB-0.5)*0.10;
    let r=T[0]*(1+a+b), g=T[1]*(1+a), bl=T[2]*(1+a-b);
    if(red){r*=1.06;g*=0.96;bl*=0.96;}
    /* CATATAN: bilah rumput dunia TIDAK ikut dicokelatkan di tepi air. Yang
       berubah jadi cokelat gelap hanyalah BLOK-nya (lihat SH_TOP di blockTint);
       rumput yang tumbuh di atasnya tetap hijau normal, sesuai permintaan. */
    TMG[0]=tclamp(r);TMG[1]=tclamp(g);TMG[2]=tclamp(bl);
  }
  /* pengali warna TUMBUHAN (semak/tebu/bunga/kaktus & rumput billboard).
     Lebih lembut dari tanah supaya bunga tetap terbaca warnanya, tapi cukup
     untuk memecah kesan "semua semak warnanya sama". */
  const TMP=[1,1,1];
  function floraTint(tier,tA,tC){
    const T=WG_TIER[tier<0?0:(tier>3?3:tier)];
    const a=(tA-0.5)*2, c=(tC-0.5)*2;
    /* dicampur setengah ke arah palet tingkat: tumbuhan ikut gradasi
       lingkungan tapi warna khasnya (bunga merah/kuning) tidak hilang */
    TMP[0]=tclamp((1+T[0])*0.5*(1+a*0.05+c*0.04));
    TMP[1]=tclamp((1+T[1])*0.5*(1+a*0.08+c*0.06));
    TMP[2]=tclamp((1+T[2])*0.5*(1+a*0.04-c*0.03));
  }


  /* ---------- build chunk ---------- */
  function build(chunk){
    const C=CFG.CHUNK,H=CFG.WORLD_H;
    /* subdivisi permukaan air per blok (lebih halus utk ombak); diatur preset
       grafis (Gfx), fallback ke nilai lama bila Gfx belum ada */
    const WSUB=(typeof Gfx!=='undefined'&&Gfx.preset)?Gfx.preset().waterSub:(IS_MOBILE?2:3);
    const P=[],N=[],U=[],CL=[],I=[];let vi=0;
    const WP=[],WD=[],WI=[];let wvi=0;      // air: posisi, kedalaman(aDepth), indeks
    const PP=[],PN=[],PU=[],PC=[],PI=[];let pvi=0;
    /* tumbuhan voxel (semak beri/kaktus/tebu/tulip): posisi, normal, warna,
       amplitudo angin per verteks, indeks */
    const FP=[],FN=[],FC=[],FA=[],FI=[];let fvi=0;
    /* RUMPUT DUNIA (dekoratif) dipisah ke buffer & mesh SENDIRI supaya bisa:
       (1) TIDAK ikut shadow pass (castShadow=false) — penghematan terbesar di
       desktop, dan (2) disembunyikan lebih cepat berdasarkan jarak tanpa ikut
       menyembunyikan semak/tebu. */
    const GP=[],GN=[],GU=[],GC=[],GA=[],GI=[];let gvi=0;
    const LP=[],LN=[],LU=[],LC=[],LI=[];let lvi=0;   // daun (mesh terpisah)
    const RP=[],RN=[],RU=[],RC=[],RI=[];let rvi=0;   // atap rumah (mesh terpisah)
    const idx=(x,y,z)=>x+z*C+y*C*C;

    /* --- pembaca blok cepat: cache data chunk ini + 8 tetangga (3x3) ---
       Menghindari Math.floor + lookup Map pada ribuan panggilan getBlock saat
       uji visibilitas wajah & AO. Sample AO maksimal 1 blok keluar chunk, jadi
       8 tetangga (termasuk diagonal) sudah cukup; bila tetangga belum ada,
       fallback ke World.getBlock. */
    const BASE_X=chunk.cx*C,BASE_Z=chunk.cz*C;
    const NBD={};
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      if(dx===0&&dz===0)continue;
      const nc=World.chunks.get((chunk.cx+dx)+','+(chunk.cz+dz));
      if(nc)NBD[dx+','+dz]=nc.data;
    }
    const SELF=chunk.data;
    getB=(wx,wy,wz)=>{
      if(wy<0)return B.STONE;
      if(wy>=H)return B.AIR;
      const lx=wx-BASE_X,lz=wz-BASE_Z;
      const ox=lx<0?-1:(lx>=C?1:0);
      const oz=lz<0?-1:(lz>=C?1:0);
      const ax=lx-ox*C,az=lz-oz*C;
      if(ox===0&&oz===0)return SELF[ax+az*C+wy*C*C];
      const nd=NBD[ox+','+oz];
      /* pengaman: bila tetangga belum ada / koordinat di luar 3x3, fallback */
      if(!nd||ax<0||ax>=C||az<0||az>=C)return World.getBlock(wx,wy,wz);
      return nd[ax+az*C+wy*C*C];
    };

    /* Env_Plants dibaca lewat `window` (bukan `typeof Env_Plants`) karena
       env_plants.js mendeklarasikan `const` — pengujian typeof pada binding
       lexical yang belum terinisialisasi melempar ReferenceError (TDZ),
       sedangkan properti window aman dibaca kapan pun. Diambil DI SINI (sebelum
       loop blok) karena rumput dunia dibangkitkan di dalam loop itu. */
    const VOX=(typeof window!=='undefined')?window.Env_Plants:null;

    /* ---------- data warna PER KOLOM ----------
       Tingkat gradasi, biome, & jarak ke air hanya bergantung pada (wx,wz),
       jadi dihitung SEKALI per kolom lalu dipakai ulang untuk semua y. Tanpa
       cache ini satu kolom setinggi WORLD_H akan memanggil noise & memindai
       tetangga berkali-kali, dan biaya mesh naik tajam. */
    const CN=C*C;
    const cTA=new Float32Array(CN),cTB=new Float32Array(CN),cTC=new Float32Array(CN),
          cShd=new Float32Array(CN),cTier=new Int8Array(CN),cGpos=new Float32Array(CN),
          cBio=new Int8Array(CN),cGot=new Uint8Array(CN);
    /* ambang gundul preset grafis: dipakai bersama oleh warna & rumput dunia */
    const HMIN=(typeof Gfx!=='undefined'&&Gfx.grassHeatMin!==undefined)
               ?Gfx.grassHeatMin:0.08;
    const hasTint=(typeof WGEN!=='undefined'&&WGEN.tintA);
    /* PERMUKAAN AIR: blok teratas kolom air ada di y = SEA-1, jadi hanya blok
       daratan pada ketinggian ITU yang benar-benar "sejajar permukaan air" dan
       boleh mendapat pewarnaan tepian. */
    const SEA_TOP=(typeof CFG!=='undefined'&&CFG.SEA!==undefined)?CFG.SEA-1:4;
    /* ambang kuantisasi noise petak → 4 tingkat. Nilainya dipilih dari
       distribusi nyata tintA (kuartil ≈0.36 / 0.50 / 0.64) supaya keempat
       tingkat terpakai kira-kira sama banyak; dengan ambang naif 0.25/0.5/0.75
       tingkat 0 & 3 hampir tidak pernah muncul dan gradasinya tak terlihat. */
    const qtier=v=>v<0.37?0:(v<0.50?1:(v<0.64?2:3));
    function colTint(x,z,wx,wz){
      const ci=x+z*C;
      if(cGot[ci])return ci;
      cGot[ci]=1;
      const bio=(typeof WGEN!=='undefined'&&WGEN.biomeAt)?WGEN.biomeAt(wx,wz):-1;
      cBio[ci]=bio;
      if(!hasTint){
        cTA[ci]=0.5;cTB[ci]=0.5;cTC[ci]=0.5;cTier[ci]=2;cShd[ci]=-1;cGpos[ci]=NaN;
        return ci;
      }
      cTA[ci]=WGEN.tintA(wx,wz);
      cTB[ci]=WGEN.tintB(wx,wz);
      cTC[ci]=WGEN.tintC(wx,wz);
      /* ---- TINGKAT GRADASI ----
         Biome BERUMPUT (Hutan, Tanah Merah) memakai GRADASI KONTINU dari
         WGEN.grassField: nilai bertanda yang terus turun dari pusat rumpun
         (hijau pekat) sampai jauh ke wilayah gundul (cokelat murni). Disimpan
         sebagai posisi 0..5 di cGpos; cTier tidak dipakai untuk warna blok ini
         (tetap diisi untuk hal lain seperti flora/rumput dunia).

         Biome TANPA rumput memakai noise petak yang dikuantisasi jadi 4 tingkat
         supaya pasir/salju/batu tetap bergradasi. cGpos = NaN → blockTint jatuh
         ke jalur palet 4-tingkat. */
      let tier, gpos=NaN;
      if((WGEN.grassField||WGEN.grassHeat)&&(bio===BIOME.FOREST||bio===BIOME.REDLANDS)){
        /* posisi ramp DI-DITHER & dikuantisasi per blok (lihat grassPosBlock):
           tetap bergradasi tapi tiap blok punya nada sendiri seperti prototipe
           yang memakai material diskret. */
        if(WGEN.grassField)gpos=grassPosBlock(WGEN.grassField(wx,wz),WGEN.hash(wx,wz,83));
        /* cTier tetap dihitung dari grassHeat untuk konsumen lain (bilah rumput) */
        const heat=WGEN.grassHeat?WGEN.grassHeat(wx,wz):0;
        if(heat<=HMIN)tier=0;
        else{const t=(heat-HMIN)/Math.max(0.001,1-HMIN);tier=t<0.27?1:(t<0.58?2:3);}
      }else tier=qtier(cTA[ci]);
      cTier[ci]=tier;
      cGpos[ci]=gpos;
      /* ---- JARAK KE AIR (hanya untuk kolom serata permukaan air) ----
         -1 = tidak berlaku. Blok pada y=SEA_TOP yang berada dekat air mendapat
         gradasi tepian (lumpur gelap → cokelat → kuning → warna asli).
         Jarak dikurangi 1 karena blok air terdekat minimal berjarak 1 blok:
         dengan begitu blok yang MENEMPEL air memakai stop pertama (paling
         gelap), bukan stop kedua. */
      let shd=-1;
      if(getB(wx,SEA_TOP,wz)!==B.AIR&&getB(wx,SEA_TOP,wz)!==B.WATER&&
         getB(wx,SEA_TOP+1,wz)===B.AIR){
        const RR=SHORE_R+1;                       // periksa 1 blok lebih jauh
        let best=1e9;
        for(let dz=-RR;dz<=RR;dz++)for(let dx=-RR;dx<=RR;dx++){
          if(!dx&&!dz)continue;
          const d2=dx*dx+dz*dz;
          if(d2>RR*RR||d2>=best)continue;
          if(getB(wx+dx,SEA_TOP,wz+dz)===B.WATER)best=d2;
        }
        if(best<1e9){
          const d=Math.sqrt(best)-1;
          if(d<SHORE_R)shd=d<0?0:d;
        }
      }
      cShd[ci]=shd;
      return ci;
    }
    /* tingkat gradasi untuk blok tertentu di kolom `ci`.
       DAUN memakai tintC (petak ~10 blok) supaya tiap pohon punya hijau
       sendiri; blok permukaan berumput memakai tingkat rumput; sisanya ikut
       tingkat kolom. */
    function tierFor(id,ci){
      if(id===B.LEAF)return qtier(cTC[ci]);
      if(id===B.GRASS||id===B.RED_SOIL){
        const bio=cBio[ci];
        return (bio===BIOME.FOREST||bio===BIOME.REDLANDS)?cTier[ci]:qtier(cTA[ci]);
      }
      return cTier[ci];
    }
    /* ---------- TONJOLAN per kolom & per SUDUT ----------
       rzCol = tonjolan kolom (wx,wz), murni fungsi koordinat dunia.
       rzCorner = tinggi SUDUT kisi (cx,cz) = rata-rata 4 kolom yang menyentuh
       sudut itu. Karena dua blok bertetangga memakai sudut yang SAMA, permukaan
       tidak pernah retak. Keduanya di-cache: satu kolom dipakai 4 sudut dan
       satu sudut dipakai 4 blok. */
    const rzCache=new Map(),rzcCache=new Map();
    function rzCol(wx,wz){
      const k=wx+'|'+wz;
      const hit=rzCache.get(k);
      if(hit!==undefined)return hit;
      let v=0;
      if(typeof WGEN!=='undefined'&&WGEN.grassField&&WGEN.biomeAt){
        const bio=WGEN.biomeAt(wx,wz);
        if(bio===BIOME.FOREST||bio===BIOME.REDLANDS)
          v=raiseOf(grassPosBlock(WGEN.grassField(wx,wz),WGEN.hash(wx,wz,83)));
      }
      rzCache.set(k,v);
      return v;
    }
    function rzCorner(cx,cz){
      const k=cx+'|'+cz;
      const hit=rzcCache.get(k);
      if(hit!==undefined)return hit;
      const v=(rzCol(cx-1,cz-1)+rzCol(cx,cz-1)+rzCol(cx-1,cz)+rzCol(cx,cz))*0.25;
      rzcCache.set(k,v);
      return v;
    }

    for(let y=0;y<H;y++)for(let z=0;z<C;z++)for(let x=0;x<C;x++){
      const id=chunk.data[idx(x,y,z)];
      if(!id)continue;
      const wx=chunk.cx*C+x,wz=chunk.cz*C+z;
      if(id===B.WATER){
        if(getB(wx,y+1,wz)!==B.WATER){
          const sy=y+0.82;
          /* kedalaman air kolom ini = jumlah blok air bertumpuk ke bawah.
             Dipakai shader utk warna (dangkal?dalam), amplitudo ombak & busa. */
          let depth=0;
          for(let yy=y;yy>=0;yy--){ if(getB(wx,yy,wz)===B.WATER)depth++; else break; }
          /* subdivisi blok jadi grid WSUB�WSUB agar ombak geometrik halus
             (air lama cuma 1 quad/blok ? ombak tampak patah-patah). */
          const base=wvi;
          for(let j=0;j<=WSUB;j++)for(let i=0;i<=WSUB;i++){
            WP.push(wx+i/WSUB,sy,wz+j/WSUB);
            WD.push(depth);
          }
          for(let j=0;j<WSUB;j++)for(let i=0;i<WSUB;i++){
            const a=base+j*(WSUB+1)+i;
            WI.push(a,a+1,a+WSUB+2, a,a+WSUB+2,a+WSUB+1);
          }
          wvi+=(WSUB+1)*(WSUB+1);
        }
        continue;
      }
      /* pengali warna gradasi untuk kolom ini (hitung sekali, pakai per wajah) */
      const ci=colTint(x,z,wx,wz);
      /* ---- tingkat TEKSTUR & TONJOLAN kolom ini ----
         gt 0..2 memilih tile (gundul / sedang / lebat) DAN palet yang cocok
         untuk tile itu. Blok di tepi air dipaksa ke tingkat GUNDUL: tanah becek
         berlumpur tidak berumput, dan paletnya (SH_TOP) juga dihitung relatif
         ke tile gundul.
         `shd` hanya berlaku untuk blok PERMUKAAN yang sejajar permukaan air;
         blok di bawahnya (dinding potongan tanah) tidak ikut. */
      const shd=(y===SEA_TOP)?cShd[ci]:-1;
      const gpos=cGpos[ci];
      let gt;
      if(GRAMP_TOP[id]&&gpos===gpos)gt=(shd>=0)?0:gtOf(gpos);
      const tiles=tilesFor(id,gt);
      const isLeaf=id===B.LEAF;
      const isRoof=id===B.ROOF;
      /* tonjolan permukaan: hanya blok permukaan (ada udara di atasnya). `rz`
         di bawah dipakai untuk hal-hal yang butuh satu angka per blok (pangkal
         rumput, rumbai); GEOMETRI wajahnya memakai rzCorner per sudut. */
      const isSurf=getB(wx,y+1,wz)===B.AIR;
      const rz=isSurf?rzCol(wx,wz):0;
      blockTint(id,tierFor(id,ci),shd,cTA[ci],cTB[ci],cBio[ci],gpos,gt);
      /* daun & atap ditulis ke buffer sendiri agar materialnya bisa di-fade */
      const oP=isLeaf?LP:isRoof?RP:P, oN=isLeaf?LN:isRoof?RN:N,
            oU=isLeaf?LU:isRoof?RU:U, oC=isLeaf?LC:isRoof?RC:CL;
      for(let f=0;f<6;f++){
        const d=FACES[f].dir;
        const nb=getB(wx+d[0],y+d[1],wz+d[2]);
        if(nb!==B.AIR&&nb!==B.WATER)continue;
        const tile=d[1]===1?tiles[0]:d[1]===-1?tiles[1]:tiles[2];
        const [u0,u1,v0,v1]=tileUV(tile);
        let shade=d[1]===1?1.0:d[1]===-1?0.5:(d[0]!==0?0.72:0.85);
        const tint=0.94+0.12*WGEN.hash(wx,wz+y*131,9);
        /* TM = pengali warna petak: wajah atas memakai palet permukaan, wajah
           samping/bawah memakai palet sisi (umumnya bagian tanah) */
        const TM=(d[1]===1)?TMT:TMS;
        let r=shade*tint*TM[0],g=shade*tint*TM[1],b=shade*tint*TM[2];
        if(getB(wx,y+1,wz)===B.WATER){r*=0.72;g*=0.8;b*=0.95;}
        const ao=faceAO(wx,y,wz,FACES[f]);
        const na=d[0]!==0?0:d[1]!==0?1:2;
        const t=[0,1,2].filter(a=>a!==na);
        for(let i=0;i<4;i++){
          const c=FACES[f].corners[i];
          /* tonjolan: hanya SUDUT ATAS blok permukaan yang diangkat, dan
             tingginya diambil per SUDUT KISI (rzCorner) sehingga blok
             bertetangga berbagi nilai yang sama → permukaan tidak retak. */
          const cy=(isSurf&&c[1]===1)?rzCorner(wx+c[0],wz+c[2]):0;
          oP.push(wx+c[0],y+c[1]+cy,wz+c[2]);
          oN.push(d[0],d[1],d[2]);
          let uu,vv;
          if(d[1]===0){
            /* BUGFIX wajah samping: sumbu v tekstur HARUS selalu vertikal
               (sepanjang Y) agar strip rumput di sisi blok selalu berada di
               ATAS. Dulu wajah �X memakai v sepanjang Z, sehingga rumput
               terlihat "di samping" (horizontal), bukan di atas. */
            const ha=na===0?2:0;               // sumbu horizontal utk u
            uu=u0+c[ha]*(u1-u0);
            vv=v0+c[1]*(v1-v0);
          }else{
            uu=u0+c[t[0]]*(u1-u0);
            vv=v0+c[t[1]]*(v1-v0);
          }
          oU.push(uu,vv);
          oC.push(r*ao[i],g*ao[i],b*ao[i]);
        }
        if(isLeaf){LI.push(lvi,lvi+1,lvi+2,lvi+2,lvi+1,lvi+3);lvi+=4;}
        else if(isRoof){RI.push(rvi,rvi+1,rvi+2,rvi+2,rvi+1,rvi+3);rvi+=4;}
        else{I.push(vi,vi+1,vi+2,vi+2,vi+1,vi+3);vi+=4;}
      }

      /* CATATAN: tidak ada wajah "undakan" penambal di sini. Tinggi sudut kisi
         (rzCorner) dibagi bersama antar blok bertetangga, jadi permukaannya
         sudah rapat tanpa tambalan apa pun. */

      /* ---------- RUMBAI RUMPUT DI TEPI ATAS BLOK ----------
         Sisi blok GRASS/RED_SOIL memperlihatkan strip rumput di ATAS lalu tanah
         di bawah. Di tiap TEPI ATAS yang terbuka (sisi yang TIDAK bergandengan
         dengan blok lain — tetangganya udara/air) ditambahkan RUMBAI: lidah
         rumput mendatar yang menjulur KE SAMPING keluar dari bibir blok, dengan
         panjang TIDAK RATA per segmen sehingga tepinya bergerigi natural, bukan
         garis kotak lurus.

         Berlaku untuk tepi terbuka blok rumput/tanah-merah, KECUALI tepi air
         (shd<0 → tanah di sana becek berlumpur) dan KECUALI blok tingkat GUNDUL
         (gt===0): tanah gundul di prototipe memang tidak punya rumbai sama
         sekali — hanya tanah & kerikil. Desktop saja (mobile dilewati demi
         performa). Warna mengikuti permukaan blok (TMT) → hijau di rumpun,
         kekuningan di tepi rumpun, sesuai gradasi.
         Panjang julur mengikuti tingkat: tingkat SEDANG lebih pendek & lebih
         jarang, seperti pita rumput yang menipis di prototipe. */
      if((id===B.GRASS||id===B.RED_SOIL)&&!IS_MOBILE&&getB(wx,y+1,wz)===B.AIR&&
         shd<0&&gt>0){
        const [gu0,gu1,gv0,gv1]=tileUV(tiles[0]);
        const SEG=3;                          // segmen per tepi
        const droop=0.05;                     // sedikit menekuk turun di ujung
        const gsh=0.96, gtn=0.94+0.12*WGEN.hash(wx,wz+7,9);
        const gr=gsh*gtn*TMT[0], gg=gsh*gtn*TMT[1], gb=gsh*gtn*TMT[2];
        /* tingkat 1 (sedang): julur lebih pendek & sebagian segmen dilewati */
        const eBase=gt===2?0.10:0.05, eVar=gt===2?0.20:0.11;
        for(let e=0;e<4;e++){
          const dx=e===0?1:e===1?-1:0, dz=e===2?1:e===3?-1:0;
          const nb2=getB(wx+dx,y,wz+dz);
          if(nb2!==B.AIR&&nb2!==B.WATER)continue;   // hanya sisi yang menganga
          const ex=dx!==0?(wx+(dx>0?1:0)):wx;
          const ez=dz!==0?(wz+(dz>0?1:0)):wz;
          /* tinggi bibir HARUS mengikuti kedua SUDUT tepi ini, sama seperti
             wajah atas — kalau dipukul rata pakai satu nilai per blok, bibirnya
             tidak menempel di permukaan dan muncul retakan. Tepi quad adalah
             garis lurus antar sudut, jadi interpolasi linear di sepanjang tepi
             persis sama dengan permukaan wajah atasnya. */
          const hA=dx!==0?rzCorner(ex,wz)  :rzCorner(wx,ez);
          const hB=dx!==0?rzCorner(ex,wz+1):rzCorner(wx+1,ez);
          for(let s=0;s<SEG;s++){
            if(gt===1&&WGEN.hash(wx*5+e*7+s,wz*11+s*3,23)<0.4)continue;
            const t0=s/SEG, t1=(s+1)/SEG;
            const y0=y+1+hA+(hB-hA)*t0, y1=y+1+hA+(hB-hA)*t1;
            /* panjang julur acak per segmen → tepi bergerigi */
            const ext=eBase+WGEN.hash(wx*7+e*13+s,wz*3+s*29,17)*eVar;
            const oX=dx*ext, oZ=dz*ext;
            let x0,z0,x1,z1;
            if(dx!==0){x0=x1=ex; z0=wz+t0; z1=wz+t1;}
            else      {z0=z1=ez; x0=wx+t0; x1=wx+t1;}
            /* lidah MENDATAR: inner di bibir, outer menjulur ke samping &
               sedikit turun (droop) → menghadap ke atas, terlihat menyamping */
            P.push(x0,y0,z0, x1,y1,z1, x1+oX,y1-droop,z1+oZ, x0+oX,y0-droop,z0+oZ);
            for(let k=0;k<4;k++)N.push(dx*0.2,0.95,dz*0.2);
            U.push(gu0,gv1, gu1,gv1, gu1,gv0, gu0,gv0);
            for(let k=0;k<4;k++)CL.push(gr,gg,gb);
            /* dua sisi supaya terlihat dari atas maupun dari bawah tepi */
            I.push(vi,vi+1,vi+2, vi,vi+2,vi+3, vi,vi+2,vi+1, vi,vi+3,vi+2);
            vi+=4;
          }
        }
      }

      /* ---------- RUMPUT DUNIA (dekoratif, gradasi per RUMPUN) ----------
         Rumput yang menutupi blok rumput / tanah-merah di hutan & REDLANDS.
         Dibangkitkan langsung dari jenis blok (tidak disimpan sebagai plant),
         jadi:
           · tidak bisa dipanen & tidak menjatuhkan apa pun,
           · hilang otomatis saat bloknya hancur (mesh dibangun ulang),
           · muncul lagi begitu dirt kembali menjadi grass block.

         TINGGI DARI HEAT RUMPUN (bukan undian acak per blok):
         WGEN.grassHeat memberi 1 di PUSAT sebuah rumpun dan turun ke 0 di
         TEPINYA (lihat worldgen.js). Nilai itu dipetakan berurutan ke varian
         tinggi, jadi tiap rumpun punya siklus sendiri:
             tepi → pendek → sedang → tinggi (pusat) → pendek → tepi
         Di luar rumpun heat = 0 → blok GUNDUL, tanpa geometri sama sekali.
         Hasilnya rumput tersebar sebagai rumpun-rumpun berumput dengan tanah
         kosong di antaranya, seperti rumput sungguhan — bukan satu biome yang
         rata tinggi.

         `Gfx.grassHeatMin` (preset grafis) memangkas TEPI setiap rumpun:
         makin tinggi ambangnya, makin kecil rumpunnya & makin luas tanah
         gundul. Rentang sisanya dipetakan ulang ke SELURUH tingkat tinggi,
         sehingga gradasi 0→tertinggi tetap utuh di preset apa pun (termasuk
         Ultra). Warna merah di REDLANDS. Ikut angin & efek TERINJAK (aSway).

         BENTUKNYA kini KARTU 3-PLANE bertekstur (lihat grassCards di
         env_plants.js): 3 quad per blok, bukan 216 seperti versi voxel. */
      if((id===B.GRASS||id===B.RED_SOIL)&&VOX&&VOX.worldGrass&&
         getB(wx,y+1,wz)===B.AIR&&
         typeof WGEN!=='undefined'&&WGEN.biomeAt&&WGEN.grassHeat){
        const bio=cBio[ci];
        if(bio===BIOME.FOREST||bio===BIOME.REDLANDS){
          const heat=WGEN.grassHeat(wx,wz);
          /* ambang gundul: dari preset grafis (default High) */
          const hMin=HMIN;
          if(heat>hMin){
            const red=(bio===BIOME.REDLANDS);
            const wgN=VOX.worldGrassCount();
            /* petakan heat (hMin..1) → indeks varian 0..wgN-1 secara BERURUTAN.
               Karena rentangnya dinormalkan ulang, tingkat terpendek sampai
               tertinggi SELALU terpakai berapa pun ambangnya. Jitter kecil
               (±0.4 tingkat) memecah pita agar batas antar tingkat tidak
               terlihat sebagai garis kontur kaku, tapi urutannya tetap. */
            const t=(heat-hMin)/Math.max(0.001,1-hMin);
            const jit=(WGEN.hash(wx,wz,71)-0.5)*0.8;
            const vg=clamp(Math.round(t*(wgN-1)+jit),0,wgN-1);
            /* VARIAN TATA LETAK: diundi per blok supaya rumpun bertingkat sama
               tetap beda bentuk (rotasi, skala, tinggi per kartu). Tanpa ini
               semua blok memakai satu geometri dan hamparannya terlihat kaku
               seperti klon. */
            const wgV=VOX.worldGrassVarCount?VOX.worldGrassVarCount():1;
            const vr=Math.floor(WGEN.hash(wx,wz,73)*wgV)%wgV;
            const M=VOX.worldGrass(vr,vg,red);
            if(M&&M.count){
              /* pangkal kartu duduk di permukaan blok — ikut TONJOLAN (rz) agar
                 rumput tidak melayang di atas blok yang dinaikkan. Posisi digeser
                 acak kecil per blok supaya kartu antar-blok tidak sebaris rapi
                 (kalau sebaris, polanya terlihat seperti kisi). */
              const jx=(WGEN.hash(wx,wz,91)-0.5)*0.26;
              const jz=(WGEN.hash(wx,wz,92)-0.5)*0.26;
              const ox=wx+0.5+jx,oy=y+1+rz,oz=wz+0.5+jz;
              const nn=M.pos.length/3;
              /* kartu ikut TINGKAT gradasi tanah di bawahnya: rumpun tingkat
                 rendah kekuningan, pusat rumpun hijau pekat. */
              grassTint(cTier[ci],shd,cTA[ci],cTB[ci],red);
              for(let i2=0;i2<nn;i2++){
                GP.push(M.pos[i2*3]+ox,M.pos[i2*3+1]+oy,M.pos[i2*3+2]+oz);
                GN.push(M.nor[i2*3],M.nor[i2*3+1],M.nor[i2*3+2]);
                GU.push(M.uv[i2*2],M.uv[i2*2+1]);
                GC.push(Math.min(1,M.col[i2*3]*TMG[0]),
                        Math.min(1,M.col[i2*3+1]*TMG[1]),
                        Math.min(1,M.col[i2*3+2]*TMG[2]));
                GA.push(M.amp[i2]);
              }
              for(let q=0;q<M.count;q++){const a=gvi+q*4;GI.push(a,a+1,a+2,a,a+2,a+3);}
              gvi+=nn;
            }
          }
        }
      }
    }
    /* tanaman: tipe 1-6 billboard cross-quad, tipe 7-10 model voxel.
       (VOX sudah diambil di atas, sebelum loop blok.) */
    const keep=[];
    for(const p of chunk.plants){
      const wx=chunk.cx*C+p.x,wz=chunk.cz*C+p.z;
      const below=getB(wx,p.y-1,wz);
      if(!PLANTABLE.has(below)){continue;}

      keep.push(p);

      /* pengali warna gradasi untuk kolom tanaman ini (voxel & billboard) agar
         tumbuhan senada dengan tingkat kesuburan tanah di sekitarnya */
      const pci=colTint(p.x,p.z,wx,wz);
      floraTint(cTier[pci],cTA[pci],cTC[pci]);
      const prz=rzCol(wx,wz);

      /* ---------- MODEL VOXEL ----------
         Wajahnya sudah dikompilasi sekali per (tipe,varian,rotasi) oleh
         Env_Plants, jadi di sini tinggal disalin + digeser ke posisi blok.
         Rotasi, VARIAN, & jitter posisi diundi deterministik dari koordinat
         dunia supaya ladang bunga/rumput tidak terlihat seperti klon. */
      if(VOX&&VOX.isVoxel(p.t)){
        const rot=(WGEN.hash(wx,wz,61)*4)|0;
        const vi=(WGEN.hash(wx,wz,64)*VOX.variantCount(p.t))|0;
        /* rumput utama (tipe 1) memakai palet MERAH di biome REDLANDS supaya
           menyatu dengan tanah merah. */
        let red=false;
        if(p.t===1&&typeof WGEN!=='undefined'&&WGEN.biomeAt)
          red=(cBio[pci]===BIOME.REDLANDS);
        const M=VOX.model(p.t,rot,vi,red);
        if(M){
          /* jitter �0.22 blok, dijaga agar model tetap di dalam petak */
          const jx=(WGEN.hash(wx,wz,62)-0.5)*0.44;
          const jz=(WGEN.hash(wx,wz,63)-0.5)*0.44;
          const ox=wx+0.5+jx,oy=p.y+prz,oz=wz+0.5+jz;
          const n=M.pos.length/3;
          for(let i=0;i<n;i++){
            FP.push(M.pos[i*3]+ox,M.pos[i*3+1]+oy,M.pos[i*3+2]+oz);
            FN.push(M.nor[i*3],M.nor[i*3+1],M.nor[i*3+2]);
            FC.push(Math.min(1,M.col[i*3]*TMP[0]),
                    Math.min(1,M.col[i*3+1]*TMP[1]),
                    Math.min(1,M.col[i*3+2]*TMP[2]));
            FA.push(M.amp[i]);
          }
          for(let q=0;q<M.count;q++){
            const a=fvi+q*4;
            FI.push(a,a+1,a+2,a,a+2,a+3);
          }
          fvi+=n;
        }
        continue;
      }

      const tile=p.t===1?8:p.t===2?9:p.t===3?10:p.t===4?12:p.t===6?24:11;
      const [u0,u1,v0,v1]=tileUV(tile);
      const sh=0.85+WGEN.hash(wx,wz,11)*0.3;
      const quads=[[0.15,0.15,0.85,0.85],[0.15,0.85,0.85,0.15]];
      for(const q of quads){
        const x0=wx+q[0],z0=wz+q[1],x1=wx+q[2],z1=wz+q[3],y0=p.y+prz,y1=p.y+prz+0.92;
        PP.push(x0,y0,z0, x1,y0,z1, x1,y1,z1, x0,y1,z0);
        for(let k=0;k<4;k++){PN.push(0,1,0);
          PC.push(sh*TMP[0],sh*TMP[1],sh*TMP[2]);}
        PU.push(u0,v0, u1,v0, u1,v1, u0,v1);
        PI.push(pvi,pvi+1,pvi+2,pvi,pvi+2,pvi+3);pvi+=4;
      }
    }
    chunk.plants=keep;

    /* kembalikan pembaca blok ke default agar cache lokal chunk ini tidak
       tetap dirujuk setelah build selesai */
    getB=(x,y,z)=>World.getBlock(x,y,z);

    const mk=(pos,norm,uv,col,ind)=>{
      if(!ind.length)return null;
      const g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
      if(norm)g.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));
      g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
      if(col)g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
      g.setIndex(ind);
      return g;
    };
    /* geometri air dibangun terpisah karena butuh atribut aDepth (kedalaman)
       yang tidak dipakai mesh lain */
    let waterGeo=null;
    if(WI.length){
      waterGeo=new THREE.BufferGeometry();
      waterGeo.setAttribute('position',new THREE.Float32BufferAttribute(WP,3));
      waterGeo.setAttribute('aDepth',new THREE.Float32BufferAttribute(WD,1));
      waterGeo.setIndex(WI);
    }
    /* geometri tumbuhan voxel: butuh atribut aSway (amplitudo angin) */
    let floraGeo=null;
    if(FI.length){
      floraGeo=new THREE.BufferGeometry();
      floraGeo.setAttribute('position',new THREE.Float32BufferAttribute(FP,3));
      floraGeo.setAttribute('normal',new THREE.Float32BufferAttribute(FN,3));
      floraGeo.setAttribute('color',new THREE.Float32BufferAttribute(FC,3));
      floraGeo.setAttribute('aSway',new THREE.Float32BufferAttribute(FA,1));
      floraGeo.setIndex(FI);
    }
    /* geometri RUMPUT DUNIA terpisah (mesh sendiri, tanpa shadow, jarak dekat).
       Punya `uv` karena kartu rumput bertekstur (tekstur alpha terpisah), dan
       `aSway` = faktor tinggi 0..1 untuk angin + efek terinjak. */
    let grassGeo=null;
    if(GI.length){
      grassGeo=new THREE.BufferGeometry();
      grassGeo.setAttribute('position',new THREE.Float32BufferAttribute(GP,3));
      grassGeo.setAttribute('normal',new THREE.Float32BufferAttribute(GN,3));
      grassGeo.setAttribute('uv',new THREE.Float32BufferAttribute(GU,2));
      grassGeo.setAttribute('color',new THREE.Float32BufferAttribute(GC,3));
      grassGeo.setAttribute('aSway',new THREE.Float32BufferAttribute(GA,1));
      grassGeo.setIndex(GI);
    }
    return {solid:mk(P,N,U,CL,I),water:waterGeo,
            plant:mk(PP,PN,PU,PC,PI),leaf:mk(LP,LN,LU,LC,LI),
            roof:mk(RP,RN,RU,RC,RI),flora:floraGeo,grass:grassGeo};

  }
  return {build,getMats,fadeLeaf:FADE_LEAF,fadeRoof:FADE_ROOF,occ:OCC,
    /* waktu angin tumbuhan voxel; di-update sekali per frame dari World.update */
    floraTime:FLORA_T,
    /* ---- efek TERINJAK rumput ----
       World.updateTrample mengisi slot ini tiap frame dengan penginjak terdekat
       (pemain, monster, NPC). Bentuk tiap slot: Vector4(x, z, radius, kekuatan).
       `trampleMax` = kapasitas array uniform di shader. */
    trample:TRAMPLE,trampleCount:TRAMPLE_N,trampleMax:MAX_TRAMPLE,
    /* dipakai FX.groundWave agar blok gelombang memakai material/tekstur asli */
    atlas(){if(!atlasTex)makeAtlas();return atlasTex;},
    tilesFor,tileUV};

})();
