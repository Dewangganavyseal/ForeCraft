'use strict';
/* Tekstur atlas prosedural + builder mesh chunk + geometri air */
const Mesher=(()=>{
  let atlasTex=null;
  const matSolid=null;
  let MAT_SOLID=null,MAT_PLANT=null,MAT_WATER=null,MAT_LEAF=null,MAT_ROOF=null;


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
    T(0,()=>noiseFill('#5f9e3c',['#4d8a2f','#74b54e','#568f36']));            // grass top
    T(1,()=>{noiseFill('#7a5a3a',['#6b4d30','#8a6a44']);                       // grass side
      for(let x=0;x<16;x++){const d=3+(rr()*2|0);for(let y=0;y<d;y++)px(x,y,['#5f9e3c','#4d8a2f'][(rr()*2)|0]);}});
    T(2,()=>noiseFill('#7a5a3a',['#6b4d30','#8a6a44','#5c4026']));             // dirt
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
    T(16,()=>{noiseFill('#dcc78d',['#cdb679','#e7d5a2','#c2a969'],70);          // pasir
      for(let k=0;k<4;k++){const y=2+(rr()*12)|0;for(let x=0;x<16;x++)px(x,y,'#cdb679');}});
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
    atlasTex=new THREE.CanvasTexture(cv);

    atlasTex.magFilter=THREE.NearestFilter;atlasTex.minFilter=THREE.NearestFilter;
    atlasTex.encoding=THREE.sRGBEncoding;
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
                  (World.updateRoof) → SELURUH atap rumah itu full transparan,
                  dinding tidak ikut (dinding bukan material atap).
        - daun  : kotak = bounding-box kanopi pohon yang sedang dinaungi pemain
                  (World.updateCanopy) → hanya daun pohon itu yang transparan,
                  batang tidak (batang bukan material daun).
      Default min>max = kotak kosong sehingga tidak ada yang memudar. */
  const FADE_LEAF={uMin:{value:new THREE.Vector2(1e9,1e9)},uMax:{value:new THREE.Vector2(-1e9,-1e9)},uAmt:{value:1}};
  const FADE_ROOF={uMin:{value:new THREE.Vector2(1e9,1e9)},uMax:{value:new THREE.Vector2(-1e9,-1e9)},uAmt:{value:1}};
  /* ---------- OKLUSI: blok apa pun yang menutupi pemain ikut memudar ----------
     Berlaku untuk SEMUA material blok (solid/plant/leaf/roof). Uniform di
     bawah diisi tiap frame oleh World.updateOcclusion:
       uOP  = titik tengah badan pemain (dunia)
       uOD  = arah satuan dari pemain MENUJU kamera
       uOL  = jarak pemain→kamera (fragmen di luar rentang ini diabaikan)
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
     dibuang sesuai pola 4×4 Bayer dengan peluang = tingkat transparansi.
     Cara ini membuat material tetap OPAQUE sehingga urutan gambar antar
     chunk tidak perlu diurutkan — tanpa itu, daun/atap yang sedang memudar
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
              mengikuti putaran kamera — mirip Project Zomboid. Terrain di luar
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



  function getMats(){
    if(!atlasTex)makeAtlas();
    if(!MAT_SOLID){
      MAT_SOLID=new THREE.MeshLambertMaterial({map:atlasTex,vertexColors:true});
      /* blok padat & tanaman juga memakai shader fade agar apa pun yang
         menghalangi pandangan ke pemain ikut menghilang (uniform OCC) */
      applyLocalFade(MAT_SOLID,null);
      MAT_PLANT=new THREE.MeshLambertMaterial({map:atlasTex,vertexColors:true,alphaTest:0.5,side:THREE.DoubleSide});
      applyLocalFade(MAT_PLANT,null);

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
            /* alpha: air lebih transparan — dasar cukup jelas terlihat.
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
    return {solid:MAT_SOLID,plant:MAT_PLANT,water:MAT_WATER,leaf:MAT_LEAF,roof:MAT_ROOF};
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
  /* [atas, bawah, samping] index tile atlas */
  const tilesFor=id=>{
    if(id===B.GRASS)return[0,2,1];
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
    /* atap memakai tile kayu gelap agar beda jelas dari dinding papan */
    if(id===B.ROOF)return[4,21,4];
    return[2,2,2];
  };
  /* tanaman boleh tumbuh di rumput, pasir (kaktus/rumput gurun), & salju */
  const PLANTABLE=new Set([B.GRASS,B.SAND,B.SNOW]);


  /* ---------- build chunk ---------- */
  function build(chunk){
    const C=CFG.CHUNK,H=CFG.WORLD_H;
    /* subdivisi permukaan air per blok (lebih halus utk ombak); mobile lebih
       rendah agar ringan */
    const WSUB=IS_MOBILE?2:3;
    const P=[],N=[],U=[],CL=[],I=[];let vi=0;
    const WP=[],WD=[],WI=[];let wvi=0;      // air: posisi, kedalaman(aDepth), indeks
    const PP=[],PN=[],PU=[],PC=[],PI=[];let pvi=0;
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

    for(let y=0;y<H;y++)for(let z=0;z<C;z++)for(let x=0;x<C;x++){
      const id=chunk.data[idx(x,y,z)];
      if(!id)continue;
      const wx=chunk.cx*C+x,wz=chunk.cz*C+z;
      if(id===B.WATER){
        if(getB(wx,y+1,wz)!==B.WATER){
          const sy=y+0.82;
          /* kedalaman air kolom ini = jumlah blok air bertumpuk ke bawah.
             Dipakai shader utk warna (dangkal→dalam), amplitudo ombak & busa. */
          let depth=0;
          for(let yy=y;yy>=0;yy--){ if(getB(wx,yy,wz)===B.WATER)depth++; else break; }
          /* subdivisi blok jadi grid WSUB×WSUB agar ombak geometrik halus
             (air lama cuma 1 quad/blok → ombak tampak patah-patah). */
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
      const tiles=tilesFor(id);
      const isLeaf=id===B.LEAF;
      const isRoof=id===B.ROOF;
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
        let r=shade*tint,g=shade*tint,b=shade*tint;
        if(getB(wx,y+1,wz)===B.WATER){r*=0.72;g*=0.8;b*=0.95;}
        const ao=faceAO(wx,y,wz,FACES[f]);
        const na=d[0]!==0?0:d[1]!==0?1:2;
        const t=[0,1,2].filter(a=>a!==na);
        for(let i=0;i<4;i++){
          const c=FACES[f].corners[i];
          oP.push(wx+c[0],y+c[1],wz+c[2]);
          oN.push(d[0],d[1],d[2]);
          let uu,vv;
          if(d[1]===0){
            /* BUGFIX wajah samping: sumbu v tekstur HARUS selalu vertikal
               (sepanjang Y) agar strip rumput di sisi blok selalu berada di
               ATAS. Dulu wajah ±X memakai v sepanjang Z, sehingga rumput
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
    }
    /* tanaman (cross-quad) */
    const keep=[];
    for(const p of chunk.plants){
      const wx=chunk.cx*C+p.x,wz=chunk.cz*C+p.z;
      const below=getB(wx,p.y-1,wz);
      if(!PLANTABLE.has(below)){continue;}

      keep.push(p);
      const tile=p.t===1?8:p.t===2?9:p.t===3?10:p.t===4?12:11;
      const [u0,u1,v0,v1]=tileUV(tile);
      const sh=0.85+WGEN.hash(wx,wz,11)*0.3;
      const quads=[[0.15,0.15,0.85,0.85],[0.15,0.85,0.85,0.15]];
      for(const q of quads){
        const x0=wx+q[0],z0=wz+q[1],x1=wx+q[2],z1=wz+q[3],y0=p.y,y1=p.y+0.92;
        PP.push(x0,y0,z0, x1,y0,z1, x1,y1,z1, x0,y1,z0);
        for(let k=0;k<4;k++){PN.push(0,1,0);PC.push(sh,sh,sh);}
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
    return {solid:mk(P,N,U,CL,I),water:waterGeo,
            plant:mk(PP,PN,PU,PC,PI),leaf:mk(LP,LN,LU,LC,LI),
            roof:mk(RP,RN,RU,RC,RI)};

  }
  return {build,getMats,fadeLeaf:FADE_LEAF,fadeRoof:FADE_ROOF,occ:OCC};

})();
