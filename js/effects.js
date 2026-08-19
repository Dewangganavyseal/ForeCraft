'use strict';
/* Partikel, reruntuhan, ring, teks damage, drop item */
const FX={
  group:new THREE.Group(),
  debMesh:null,debData:[],DEB_MAX:240,debCursor:0,
  rings:[],texts:[],trails:[],drops:[],shakes:[],waveFields:[],shake:0,
  dummy:new THREE.Object3D(),

  init(scene){
    scene.add(this.group);
    const g=new THREE.BoxGeometry(1,1,1);
    const m=new THREE.MeshLambertMaterial({color:0xffffff});
    this.debMesh=new THREE.InstancedMesh(g,m,this.DEB_MAX);
    this.debMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.debMesh.frustumCulled=false;
    for(let i=0;i<this.DEB_MAX;i++){
      this.debData.push({life:0,p:new THREE.Vector3(),v:new THREE.Vector3(),s:0.1});
      this.dummy.position.set(0,-100,0);this.dummy.scale.setScalar(0.001);
      this.dummy.updateMatrix();this.debMesh.setMatrixAt(i,this.dummy.matrix);
      this.debMesh.setColorAt(i,new THREE.Color(0xffffff));
    }
    this.group.add(this.debMesh);
  },
  debris(pos,color,n,power){
    const c=new THREE.Color(color);
    for(let k=0;k<n;k++){
      const i=this.debCursor;this.debCursor=(this.debCursor+1)%this.DEB_MAX;
      const d=this.debData[i];
      d.life=rand(0.5,1.0);
      d.p.copy(pos).add(new THREE.Vector3(rand(-0.3,0.3),rand(-0.2,0.3),rand(-0.3,0.3)));
      d.v.set(rand(-1,1)*power,rand(1.5,3.2)*power*0.6,rand(-1,1)*power);
      d.s=rand(0.08,0.2);
      this.debMesh.setColorAt(i,c);
    }
    if(this.debMesh.instanceColor)this.debMesh.instanceColor.needsUpdate=true;
  },
  /* ---------- GORE / BAGIAN TUBUH TERLEPAS ----------
     Memakai pool debris InstancedMesh yang sama (sangat ringan) tetapi dengan
     potongan lebih besar & warna bagian tubuh (kepala/kaki/lengan) yang
     terhambur ke segala arah saat makhluk hidup mati. `colors` = daftar warna
     bagian tubuh; tiap potongan mengambil warna acak darinya. */
  gib(pos,colors,count,power){
    if(!colors||!colors.length)return;
    const c=new THREE.Color();
    for(let k=0;k<count;k++){
      const i=this.debCursor;this.debCursor=(this.debCursor+1)%this.DEB_MAX;
      const d=this.debData[i];
      d.life=rand(0.9,1.6);
      d.p.copy(pos).add(new THREE.Vector3(rand(-0.35,0.35),rand(0,0.6),rand(-0.35,0.35)));
      /* hamburan radial kuat + dorongan ke atas supaya "terlepas" terbaca */
      const a=Math.random()*Math.PI*2;
      const r=rand(0.5,1.2)*(power||3);
      d.v.set(Math.cos(a)*r,rand(2.2,4.6)*(power||3)*0.5,Math.sin(a)*r);
      d.s=rand(0.16,0.34);                    // potongan tubuh lebih besar
      c.set(colors[(Math.random()*colors.length)|0]);
      this.debMesh.setColorAt(i,c);
    }
    if(this.debMesh.instanceColor)this.debMesh.instanceColor.needsUpdate=true;
  },
  /* Getaran blok: kubus tiruan sedikit lebih besar yang menutupi blok asli
     lalu bergetar cepat dan meredam. Dipakai tiap kali resource (pohon, batu,
     bijih) dipukul pemain atau ditambang rekan NPC, supaya terasa "kena". */
  blockShake(wx,wy,wz,color,power=1){
    const key=`${wx},${wy},${wz}`;
    /* satu blok cukup satu getaran aktif — pukulan berikutnya hanya
       menyalakan ulang agar efek tidak menumpuk dan makin terang */
    const ex=this.shakes.find(s=>s.key===key);
    if(ex){ex.life=ex.max;ex.power=Math.max(ex.power,power);return;}
    const mesh=new THREE.Mesh(
      new THREE.BoxGeometry(1.04,1.04,1.04),
      new THREE.MeshLambertMaterial({
        color:new THREE.Color(color).offsetHSL(0,0,0.07),
        transparent:true,opacity:1})
    );
    mesh.position.set(wx+0.5,wy+0.5,wz+0.5);
    mesh.renderOrder=2;
    this.group.add(mesh);
    this.shakes.push({mesh,key,life:0.26,max:0.26,power,
      base:new THREE.Vector3(wx+0.5,wy+0.5,wz+0.5)});
  },
  /* hapus getaran begitu bloknya hancur, supaya tiruannya tidak melayang
     di udara setelah blok aslinya hilang */
  clearBlockShake(wx,wy,wz){
    const key=`${wx},${wy},${wz}`;
    for(let i=this.shakes.length-1;i>=0;i--){
      if(this.shakes[i].key!==key)continue;
      const s=this.shakes[i];
      this.group.remove(s.mesh);
      s.mesh.geometry.dispose();s.mesh.material.dispose();
      this.shakes.splice(i,1);
    }
  },

  /* material blok gelombang: berbagi tekstur ATLAS asli blok sehingga blok
     yang terangkat benar-benar tampak seperti blok aslinya (rumput, batu, dll).
     Dibuat sekali dan dipakai semua blok gelombang. */
  waveMat(){
    if(this._waveMat)return this._waveMat;
    const atlas=(typeof Mesher!=='undefined'&&Mesher.atlas)?Mesher.atlas():null;
    this._waveMat=atlas
      ? new THREE.MeshLambertMaterial({map:atlas,vertexColors:true})
      : new THREE.MeshLambertMaterial({color:0x8a8f98});
    return this._waveMat;
  },
  /* geometri blok gelombang: UV atlas per sisi mengikuti tile blok ASLI
     (atas/bawah/samping) + shading warna-vertex sama dengan mesher, sehingga
     blok yang terangkat identik dengan blok tanahnya. */
  waveBlockGeo(blk){
    const geo=new THREE.BoxGeometry(0.98,1.0,0.98);
    if(typeof Mesher==='undefined'||!Mesher.tilesFor||!Mesher.tileUV)return geo;
    const tiles=Mesher.tilesFor(blk);             // [atas,bawah,samping]
    const uv=geo.attributes.uv;
    /* urutan sisi BoxGeometry: 0:+x 1:-x 2:+y 3:-y 4:+z 5:-z */
    const faceTile=[tiles[2],tiles[2],tiles[0],tiles[1],tiles[2],tiles[2]];
    for(let f=0;f<6;f++){
      const t=Mesher.tileUV(faceTile[f]);
      const o=f*4;
      uv.setXY(o,t[0],t[3]);uv.setXY(o+1,t[1],t[3]);
      uv.setXY(o+2,t[0],t[2]);uv.setXY(o+3,t[1],t[2]);
    }
    uv.needsUpdate=true;
    /* shading per sisi sama dengan mesher: atas 1.0, bawah 0.5, ±x 0.72, ±z 0.85 */
    const shade=[0.72,0.72,1.0,0.5,0.85,0.85];
    const col=[];
    for(let f=0;f<6;f++){const s=shade[f];for(let v=0;v<4;v++)col.push(s,s,s);}
    geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
    return geo;
  },

  /* ---------- GELOMBANG TANAH (ground wave) — BLOK NYATA TERANGKAT ----------
     Bukan sekadar efek: blok-blok tanah di area gelombang benar-benar
     terangkat halus lalu turun lagi, mengikuti sebuah "height-field" yang
     menjalar. Warna blok meniru blok tanah aslinya sehingga tampak seperti
     permukaan tanah yang naik. Tinggi gelombang di suatu titik bisa ditanya
     lewat waveHeightAt(x,z) — dipakai physics monster/pemain/NPC supaya
     makhluk yang berdiri di atas blok yang terangkat ikut naik bersamanya.
       mode 'line'   -> gelombang menjalar ke arah `dir` (combo terakhir)
       mode 'radial' -> melingkar dari tengah ke samping (whirl/slam)      */
  groundWave(x,y,z,opts){
    opts=opts||{};
    const mode=opts.mode||'line';
    const color=opts.color||0xd9b23a;
    const speed=opts.speed||7.5;          // kecepatan front gelombang (blok/detik)
    const amp=opts.amp||0.95;             // tinggi angkatan maksimum
    const width=opts.width||1.15;         // lebar front (sigma gaussian)
    const maxDist=opts.radius||(mode==='radial'?3.6:4.6);
    const dur=maxDist/speed+0.55;         // umur total gelombang
    const field={x,z,mode,dir:opts.dir||0,speed,amp,width,maxDist,t:0,dur,meshes:[]};

    /* kumpulkan titik blok yang akan terangkat */
    const pts=[];
    if(mode==='radial'){
      const R=maxDist;
      for(let gx=-R;gx<=R;gx+=0.85)
        for(let gz=-R;gz<=R;gz+=0.85){
          const d=Math.hypot(gx,gz);
          if(d>R||d<0.4)continue;
          pts.push({x:x+gx,z:z+gz});
        }
    }else{
      const dx=Math.sin(field.dir),dz=Math.cos(field.dir);
      const rows=Math.ceil(maxDist/0.85);
      for(let r=1;r<=rows;r++){
        const w=0.8+r*0.5;
        const cols=Math.max(1,Math.round(w*2));
        for(let c=0;c<cols;c++){
          const off=(c-(cols-1)/2)*0.85;
          pts.push({x:x+dx*r*0.85+dz*off, z:z+dz*r*0.85-dx*off});
        }
      }
    }

    /* spawn blok bergelombang bertekstur asli di tiap titik. Blok dibuat setinggi
       1 blok dan dipendam, sehingga saat terangkat yang terlihat adalah permukaan
       tanah yang benar-benar NAIK setinggi `lift` (puncak blok = gy+lift = persis
       tinggi physics waveHeightAt). Warna & tekstur mengikuti blok aslinya. */
    const mat=this.waveMat();
    for(const p of pts){
      const gy=World.groundAt(p.x,p.z,y+2);
      const blk=World.getBlock(Math.floor(p.x),Math.floor(gy)-1,Math.floor(p.z));
      const geo=this.waveBlockGeo(blk);
      const mesh=new THREE.Mesh(geo,mat);
      mesh.position.set(p.x,gy-0.5,p.z);
      mesh.visible=false;
      mesh.renderOrder=2;
      this.group.add(mesh);
      field.meshes.push({mesh,base:gy,x:p.x,z:p.z});
    }
    this.waveFields.push(field);
    /* SFX gemuruh gelombang tanah (dinamis; volume meredam sesuai jarak) */
    if(typeof Sfx!=='undefined'&&Sfx.at)Sfx.at(new THREE.Vector3(x,y,z),'wave',clamp(amp,0,1));
  },

  /* tinggi gelombang di titik dunia (x,z) saat ini; 0 bila tidak ada.
     Dipakai physics untuk mengangkat makhluk yang berdiri di atas blok
     yang sedang terangkat. */
  waveHeightAt(wx,wz){
    let h=0;
    for(const f of this.waveFields){
      let dist;
      if(f.mode==='radial'){
        dist=Math.hypot(wx-f.x,wz-f.z);
      }else{
        const dx=Math.sin(f.dir),dz=Math.cos(f.dir);
        dist=(wx-f.x)*dx+(wz-f.z)*dz;
        const lat=Math.abs((wx-f.x)*dz-(wz-f.z)*dx);
        if(lat>2.4)continue;
      }
      if(dist<0||dist>f.maxDist)continue;
      const front=f.t*f.speed;
      const dd=dist-front;
      h=Math.max(h,f.amp*Math.exp(-(dd*dd)/(f.width*f.width)));
    }
    return h;
  },

  ring(x,y,z,color,life=0.6,scale1=3){
    const g=new THREE.RingGeometry(0.85,1,32);
    const m=new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.9,side:THREE.DoubleSide,depthWrite:false});
    const mesh=new THREE.Mesh(g,m);
    mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y+0.03,z);mesh.renderOrder=3;
    this.group.add(mesh);
    this.rings.push({mesh,life,max:life,scale1});
  },
  trail(pos,yaw,vertical,combo=0){
    const PALETTE=[
      [0x4dd0ff,0xffffff,0x2288ff],   // combo 0-1: cyan
      [0x7dff9d,0xffffff,0x22cc66],   // combo 2: hijau
      [0xffd24d,0xffffff,0xff8800],   // combo 3: emas
      [0xff6b57,0xffffff,0xff2200],   // combo 4: merah panas
    ];
    const pal=PALETTE[Math.min(combo,3)];
    const mainC=pal[0],hlC=pal[1],glowC=pal[2];
    const boost=1+combo*0.18;
    const mainArc=new THREE.Group();
    mainArc.position.copy(pos);
    /* spinG menyapu di dalam bidang tebasan sehingga busur terasa bergerak
       mengikuti ayunan, bukan muncul utuh lalu memudar. */
    const spinG=new THREE.Group();
    if(!vertical){
      /* HORISONTAL: gelungkan cincin mendatar lewat tiltG (rotasi -90° di sumbu X),
         lalu putar grup luar pada sumbu Y dunia mengikuti arah hadap pemain.
         Cara lama (rotation.x + rotation.z sekaligus) menghasilkan arah tebasan
         yang tidak sejajar depan pemain; struktur bersusun ini menjamin busur
         selalu menghadap ke arah player menghadap. */
      mainArc.rotation.y=yaw-Math.PI/2;
      const tiltG=new THREE.Group();
      tiltG.rotation.x=-Math.PI/2;
      mainArc.add(tiltG);
      tiltG.add(spinG);
    }else{
      /* VERTIKAL: cincin tegak menghadap arah hadap */
      mainArc.rotation.y=yaw;
      mainArc.rotation.x=0.3;
      mainArc.add(spinG);
    }

    // Primary swipe arc (glowing blade swipe - warna sesuai combo)
    // Busur dibuat lebih sempit agar terlihat seperti bilah yang menyapu.
    const arcGeo=new THREE.RingGeometry(0.5*boost,1.8*boost,24,1,-Math.PI*0.3,Math.PI*0.6);
    const arcMat=new THREE.MeshBasicMaterial({
      color:mainC,
      transparent:true,
      opacity:0.9,
      side:THREE.DoubleSide,
      blending:THREE.AdditiveBlending,
      depthWrite:false
    });
    const mainSwipe=new THREE.Mesh(arcGeo,arcMat);
    mainSwipe.renderOrder=8;
    spinG.add(mainSwipe);

    // Inner bright core (white highlight)
    const hlGeo=new THREE.RingGeometry(0.75*boost,1.15*boost,24,1,-Math.PI*0.26,Math.PI*0.52);
    const hlMat=new THREE.MeshBasicMaterial({
      color:hlC,
      transparent:true,
      opacity:0.95,
      side:THREE.DoubleSide,
      blending:THREE.AdditiveBlending,
      depthWrite:false
    });
    const highlightArc=new THREE.Mesh(hlGeo,hlMat);
    highlightArc.renderOrder=9;
    spinG.add(highlightArc);

    // Outer glow ring
    const glowGeo=new THREE.RingGeometry(0.4*boost,2.2*boost,24,1,-Math.PI*0.34,Math.PI*0.68);
    const glowMat=new THREE.MeshBasicMaterial({
      color:glowC,
      transparent:true,
      opacity:0.55,
      side:THREE.DoubleSide,
      blending:THREE.AdditiveBlending,
      depthWrite:false
    });
    const glowArc=new THREE.Mesh(glowGeo,glowMat);
    glowArc.renderOrder=7;
    spinG.add(glowArc);

    /* TEBASAN ANGIN PUTIH di ujung pedang: crescent putih tipis terang di tepi
       luar sapuan (radius terbesar = ujung bilah), ikut tersapu bersama busur
       sehingga terlihat seperti angin yang terbelah mengikuti arah pedang. */
    const windGeo=new THREE.RingGeometry(1.45*boost,1.9*boost,24,1,-Math.PI*0.14,Math.PI*0.28);
    const windMat=new THREE.MeshBasicMaterial({
      color:0xffffff,transparent:true,opacity:0.95,
      side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false
    });
    const windArc=new THREE.Mesh(windGeo,windMat);
    windArc.renderOrder=11;
    spinG.add(windArc);

    /* --- Afterimage (motion blur): salinan busur yang tertinggal di belakang
       sapuan, tiap lapis makin transparan. Inilah yang membuat tebasan
       terasa cepat dan dinamis. */
    const ghosts=[];
    const ghostCount=IS_MOBILE?2:(3+(combo>=3?1:0));
    for(let gi=0;gi<ghostCount;gi++){
      const gh=new THREE.Mesh(
        new THREE.RingGeometry(0.55*boost,1.7*boost,20,1,-Math.PI*0.26,Math.PI*0.52),
        new THREE.MeshBasicMaterial({
          color:gi===0?hlC:mainC,
          transparent:true,
          opacity:0,
          side:THREE.DoubleSide,
          blending:THREE.AdditiveBlending,
          depthWrite:false
        })
      );
      gh.renderOrder=6;
      /* lag: seberapa jauh lapis ini tertinggal dari busur utama */
      gh.userData.lag=0.12+gi*0.11;
      gh.userData.baseOpacity=0.5/(gi+1.3);
      spinG.add(gh);
      ghosts.push(gh);
    }

    // Slash spark particles - lebih banyak saat combo tinggi
    const sparkCount=IS_MOBILE?(8+combo*2):(14+combo*3);
    const sparkColors=[hlC,glowC,mainC,0xffffff];
    for(let s=0;s<sparkCount;s++){
      const sparkAngle=-Math.PI*0.6+(s/(sparkCount-1))*Math.PI*1.2;
      const sparkDist=(0.9+Math.random()*0.9)*boost;
      const spark=new THREE.Mesh(
        new THREE.BoxGeometry(rand(0.04,0.09),rand(0.04,0.09),rand(0.02,0.05)),
        new THREE.MeshBasicMaterial({
          color:sparkColors[Math.floor(Math.random()*sparkColors.length)],
          transparent:true,
          opacity:0.95,
          depthWrite:false
        })
      );
      const x=Math.cos(sparkAngle)*sparkDist;
      const z=Math.sin(sparkAngle)*sparkDist;
      spark.position.set(x,0.04,z);
      spark.userData.sparkVel=new THREE.Vector3(
        Math.cos(sparkAngle)*rand(2.5,5)*(0.8+combo*0.2),
        rand(1,3.5),
        Math.sin(sparkAngle)*rand(2.5,5)*(0.8+combo*0.2)
      );
      spark.userData.origScale=spark.scale.x;
      spark.renderOrder=10;
      mainArc.add(spark);
    }

    this.group.add(mainArc);
    /* arah sapuan bergantian tiap combo agar tebasan terasa kiri-kanan */
    const dir=(combo===1||combo===3)?-1:1;
    /* jangkauan sapuan melebar pada combo terakhir */
    const span=Math.PI*(0.8+combo*0.13);
    const dur=vertical?0.30:0.26;
    this.trails.push({
      mesh:mainArc,life:dur,max:dur,isArc:true,
      basePos:pos.clone(),               // BUGFIX: simpan posisi serangan agar
                                         // arc tetap di tempat pemain menebas,
                                         // tidak terlempar ke origin dunia.
      swingYaw:yaw,swingVert:vertical,
      spin:spinG,ghosts,
      sweepFrom:-span*0.5*dir,
      sweepTo:span*0.5*dir,
      boost
    });
  },
  /* punch: efek tangan kosong. Sengaja BUKAN busur sabetan seperti trail() —
     hanya kepulan udara pendek lurus ke depan + beberapa percikan tumpul,
     supaya bertinju terasa jelas berbeda (pendek & tumpul) dari pedang. */
  punch(pos,yaw,combo=0){
    const c=EFFECTS.crush.c;
    const dir=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
    /* kepulan udara: cakram tipis menghadap arah pukulan yang membesar cepat */
    const puff=new THREE.Mesh(
      new THREE.RingGeometry(0.12,0.34,16),
      new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:0.8,
        side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false})
    );
    puff.position.copy(pos).addScaledVector(dir,0.45);
    puff.rotation.y=yaw;
    puff.userData.origScale=0.9+combo*0.18;
    puff.scale.setScalar(puff.userData.origScale);
    puff.renderOrder=8;
    this.group.add(puff);
    this.trails.push({mesh:puff,life:0.14,max:0.14,isParticle:true,
      v:dir.clone().multiplyScalar(3.2)});
    /* percikan kecil menyebar ke depan, jumlahnya jauh lebih sedikit
       daripada percikan tebasan pedang */
    const n=IS_MOBILE?3:(4+combo);
    for(let i=0;i<n;i++){
      const p=new THREE.Mesh(
        new THREE.BoxGeometry(rand(0.04,0.07),rand(0.04,0.07),rand(0.04,0.07)),
        new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:0.85,
          depthWrite:false})
      );
      p.position.copy(pos).addScaledVector(dir,0.35);
      p.userData.origScale=p.scale.x;
      p.renderOrder=9;
      this.group.add(p);
      this.trails.push({mesh:p,life:0.2,max:0.2,isParticle:true,
        v:dir.clone().multiplyScalar(rand(2,4))
          .add(new THREE.Vector3(rand(-1.2,1.2),rand(0.4,1.6),rand(-1.2,1.2)))});
    }
  },
  /* impact burst: kilatan cahaya + partikel di titik tumbukan */
  impact(pos,color,power=1){
    const light=0.16,shape=0.3,scale1=3;
    /* kilatan cahaya */
    const burst=new THREE.Mesh(
      new THREE.SphereGeometry(0.06,8,8),
      new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.95,
        blending:THREE.AdditiveBlending,depthWrite:false})
    );
    burst.position.copy(pos);burst.userData.origScale=0.35*power;burst.renderOrder=11;
    this.group.add(burst);
    this.trails.push({mesh:burst,life:0.13,max:0.13,isParticle:true,tipBlend:false,v:new THREE.Vector3()});
    burst.userData.tipBlend=true;
    /* partikel percikan */
    this.debris(pos.clone(),color,6+Math.floor(4*power),2.5*power);
    /* kilat radial pendek */
    const spikeCount=5+Math.floor(2*power);
    for(let s=0;s<spikeCount;s++){
      const a=s/spikeCount*Math.PI*2+Math.random()*0.4;
      const spike=new THREE.Mesh(
        new THREE.BoxGeometry(0.02,0.02,1), // diperpanjang arah Z lalu dirotasi
        new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.85,
          blending:THREE.AdditiveBlending,depthWrite:false})
      );
      spike.rotation.x=-Math.PI/2;
      spike.rotation.z=-a;
      spike.scale.set(1-0.3,1,0.5*power);
      spike.position.copy(pos);
      spike.userData.origScale=spike.scale.z;
      spike.userData.sparkVel=new THREE.Vector3(Math.cos(a)*3,Math.sin(a)*0.2,
        Math.sin(a)*3).multiplyScalar(power);
      if(spike.geometry)spike.geometry.translate(0,0,-0.5);
      spike.renderOrder=12;
      this.group.add(spike);
      this.trails.push({mesh:spike,life:0.16,max:0.16,isParticle:true,v:new THREE.Vector3()});
    }
  },
  /* gelombang kelem vertikal yang melebar */
  shockwave(x,y,z,color,scale1=3){
    const g=new THREE.RingGeometry(0.7,1,32);
    const m=new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.85,
      side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false});
    const mesh=new THREE.Mesh(g,m);
    mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y+0.05,z);mesh.renderOrder=4;
    this.group.add(mesh);
    this.rings.push({mesh,life:0.4,max:0.4,scale1});
  },
  ripple(x,y,z,color,scale1){
    this.ring(x,y,z,color,0.5,scale1||2);
  },
  text(pos,str,color='#fff'){
    const cv=document.createElement('canvas');cv.width=256;cv.height=64;
    const c=cv.getContext('2d');
    c.font='bold 30px "Press Start 2P", monospace';
    c.textAlign='center';c.textBaseline='middle';
    c.lineWidth=6;c.strokeStyle='rgba(0,0,0,0.85)';c.strokeText(str,128,32);
    c.fillStyle=color;c.fillText(str,128,32);
    const tex=new THREE.CanvasTexture(cv);
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));
    sp.scale.set(2.1,0.53,1);sp.position.copy(pos);sp.renderOrder=10;
    this.group.add(sp);
    this.texts.push({sp,life:0.95,max:0.95});
  },
  dash(pos, dir){
    const windC=0xdff5ff;
    for(let k=0;k<3;k++){
      const streak=new THREE.Mesh(
        new THREE.BoxGeometry(0.05,0.05,rand(0.9,1.8)),
        new THREE.MeshBasicMaterial({color:windC,transparent:true,opacity:0.85,blending:THREE.AdditiveBlending,depthWrite:false})
      );
      const side=new THREE.Vector3(-dir.z,0,dir.x).multiplyScalar(rand(-0.6,0.6));
      streak.position.copy(pos).add(side).add(new THREE.Vector3(0,rand(0.3,1.2),0));
      streak.rotation.y=Math.atan2(dir.x,dir.z);
      streak.userData.origScale=streak.scale.z;
      streak.renderOrder=8;
      this.group.add(streak);
      this.trails.push({mesh:streak,life:0.18,max:0.18,v:dir.clone().multiplyScalar(rand(-4,-8)),isParticle:true});
    }
    this.ring(pos.x-dir.x*0.4,pos.y+0.2,pos.z-dir.z*0.4,0x88e2ff,0.25,2.4);
  },
  /* ---------- DROP ITEM ----------
     Konstanta jeda ambil: item yang jatuh dari tas pemain tidak bisa langsung
     dipungut kembali. LOCAL_ID = id pemain lokal (nantinya multiplayer memakai
     id berbeda sehingga pemain lain kena jeda lebih lama). */
  LOCAL_ID:'player',DROP_LOCK_OWNER:3,DROP_LOCK_OTHER:5,
  spawnDrop(pos,id,n,opts){
    if(n<=0)return;
    opts=opts||{};
    /* item yang punya model 3D (makanan, dll) ditampilkan dengan model
       aslinya, bukan kotak warna. Item lain memakai kotak berwarna. */
    let mesh,isModel=false;
    if(typeof HeldModels!=='undefined'&&HeldModels.MODELS&&HeldModels.MODELS[id]){
      mesh=HeldModels.build(id);
      mesh.rotation.set(0,0,0);
      mesh.scale.setScalar(1.5);            // perbesar 50% agar jelas terlihat
      isModel=true;
    }else{
      const g=new THREE.BoxGeometry(0.26,0.26,0.26);
      const m=new THREE.MeshLambertMaterial({color:DROP_COLOR[id]||0xffffff});
      mesh=new THREE.Mesh(g,m);
    }
    mesh.position.copy(pos);
    this.group.add(mesh);
    const drop={mesh,id,n,t:0,vy:0,isModel};
    /* drop milik pemain (dibuang dari tas) diberi jeda ambil: 3 detik untuk
       yang membuang, 5 detik untuk pemain lain — tidak langsung tersedot balik. */
    if(opts.owner){drop.ownerId=this.LOCAL_ID;drop.lockOwner=this.DROP_LOCK_OWNER;drop.lockOther=this.DROP_LOCK_OTHER;}
    this.drops.push(drop);
  },
  /* lepas drop dari scene; geometri selalu dibuang, material hanya untuk kotak
     (material model 3D dipakai bersama oleh HeldModels jadi tidak boleh dibuang) */
  disposeDrop(mesh,isModel){
    this.group.remove(mesh);
    if(mesh.traverse)mesh.traverse(o=>{if(o.geometry)o.geometry.dispose();});
    else if(mesh.geometry)mesh.geometry.dispose();
    if(!isModel&&mesh.material)mesh.material.dispose();
  },
  addShake(v){this.shake=Math.min(1.2,this.shake+v);},

  update(dt){
    /* debris */
    for(let i=0;i<this.DEB_MAX;i++){
      const d=this.debData[i];
      if(d.life<=0)continue;
      d.life-=dt;
      d.v.y-=CFG.GRAV*0.6*dt;
      d.p.addScaledVector(d.v,dt);
      this.dummy.position.copy(d.p);
      this.dummy.rotation.set(d.p.x*3,d.p.y*3,d.p.z*3);
      const s=d.life>0?d.s*Math.min(1,d.life*3):0.001;
      this.dummy.scale.setScalar(Math.max(0.001,s));
      this.dummy.updateMatrix();
      this.debMesh.setMatrixAt(i,this.dummy.matrix);
    }
    this.debMesh.instanceMatrix.needsUpdate=true;
    /* getaran blok */
    for(let i=this.shakes.length-1;i>=0;i--){
      const s=this.shakes[i];s.life-=dt;
      const frac=Math.max(0,s.life/s.max);
      /* amplitudo meredam mengikuti sisa umur efek */
      const amp=0.075*s.power*frac;
      const w=s.life*46;
      s.mesh.position.set(
        s.base.x+Math.sin(w)*amp,
        s.base.y+Math.sin(w*1.7)*amp*0.6,
        s.base.z+Math.cos(w*1.3)*amp);
      /* squash & stretch ringan agar getaran terbaca jelas dari kejauhan */
      const sq=1+Math.sin(w*0.9)*0.05*frac;
      s.mesh.scale.set(sq,2-sq,sq);
      s.mesh.material.opacity=frac;
      if(s.life<=0){
        this.group.remove(s.mesh);
        s.mesh.geometry.dispose();s.mesh.material.dispose();
        this.shakes.splice(i,1);
      }
    }
    /* gelombang tanah: front gaussian menjalar; tiap blok terangkat sesuai
        tinggi field di posisinya lalu turun lagi saat front lewat */
    for(let i=this.waveFields.length-1;i>=0;i--){
      const f=this.waveFields[i];
      f.t+=dt;
      const front=f.t*f.speed;
      for(const mb of f.meshes){
        let dist;
        if(f.mode==='radial')dist=Math.hypot(mb.x-f.x,mb.z-f.z);
        else{
          const dx=Math.sin(f.dir),dz=Math.cos(f.dir);
          dist=(mb.x-f.x)*dx+(mb.z-f.z)*dz;
        }
        const dd=dist-front;
        const lift=f.amp*Math.exp(-(dd*dd)/(f.width*f.width));
        /* puncak blok tepat di gy+lift (sama dengan physics waveHeightAt) */
        mb.mesh.position.y=mb.base+lift-0.5;
        mb.mesh.visible=lift>0.05;
      }
      if(f.t>f.dur){
        for(const mb of f.meshes){
          this.group.remove(mb.mesh);
          mb.mesh.geometry.dispose();mb.mesh.material.dispose();
        }
        this.waveFields.splice(i,1);
      }
    }
    /* rings */
    for(let i=this.rings.length-1;i>=0;i--){
      const r=this.rings[i];r.life-=dt;
      const frac=Math.max(0,r.life/r.max);
      const s=r.scale1*(1-frac);
      r.mesh.scale.set(s,s,s);
      r.mesh.material.opacity=0.85*frac;
      if(r.life<=0){
        this.group.remove(r.mesh);r.mesh.geometry.dispose();r.mesh.material.dispose();
        this.rings.splice(i,1);
      }
    }
    /* trails & GLSL VFX */
    for(let i=this.trails.length-1;i>=0;i--){
      const t=this.trails[i];t.life-=dt;
      const frac=Math.max(0,t.life/t.max);
      if(t.onUpdate)t.onUpdate(dt,frac);
      if(t.isArc){
        const angle=t.sweepFrom+(t.sweepTo-t.sweepFrom)*(1-frac);
        /* posisi DIPERTAHANKAN di titik serangan (dulu arc bergeser ke sekitar
           origin dunia sehingga efek tebasan tak terlihat di dekat pemain).
           Sapuan dilakukan dengan memutar grup `spin` pada sumbu tegak. */
        if(t.basePos)t.mesh.position.copy(t.basePos);
        if(t.swingVert&&t.basePos)
          t.mesh.position.y=t.basePos.y+Math.sin(angle)*0.3;
        if(t.spin)t.spin.rotation.z=angle;
      }else if(t.isParticle){
        t.mesh.position.addScaledVector(t.v,dt);
        if(t.mesh.userData.origScale)t.mesh.scale.setScalar(t.mesh.userData.origScale*frac);
        if(t.mesh.material)t.mesh.material.opacity=0.85*frac;
      }
      if(t.life<=0){
        this.group.remove(t.mesh);
        if(t.mesh.geometry)t.mesh.geometry.dispose();
        if(t.mesh.material)t.mesh.material.dispose();
        if(t.onDispose)t.onDispose();
        this.trails.splice(i,1);
      }
    }
    /* texts */
    for(let i=this.texts.length-1;i>=0;i--){
      const t=this.texts[i];t.life-=dt;
      t.sp.position.y+=dt*0.5;
      t.sp.material.opacity=t.life/t.max;
      if(t.life<=0){
        this.group.remove(t.sp);t.sp.material.map.dispose();
        this.texts.splice(i,1);
      }
    }

    for(let i=this.drops.length-1;i>=0;i--){
      const d=this.drops[i];d.t+=dt;
      d.mesh.rotation.y+=dt*2.4;
      /* lantai dicari dari ketinggian item saat ini ke bawah, supaya item
         yang jatuh di ambang pintu mendarat di lantai — bukan menempel di
         ambang pintu yang letaknya jauh di atas lantai */
      const floor=World.groundAt(d.mesh.position.x,d.mesh.position.z,
        d.mesh.position.y+0.5)+0.3;
      if(d.mesh.position.y>floor+0.03){
        d.vy-=CFG.GRAV*dt;
        d.mesh.position.y=Math.max(floor,d.mesh.position.y+d.vy*dt);
        if(d.mesh.position.y<=floor)d.vy=0;
      }else d.mesh.position.y=floor+Math.sin(d.t*4)*0.035;
      const dx=Player.pos.x-d.mesh.position.x,dz=Player.pos.z-d.mesh.position.z;
      const hd=Math.hypot(dx,dz);
      /* jeda ambil: drop milik pemain (dibuang dari tas) menunggu 3 detik untuk
         yang membuang & 5 detik untuk pemain lain; drop biasa tanpa owner 0.35 dtk.
         Nantinya multiplayer memakai d.ownerId != LOCAL_ID untuk pemain lain. */
      const waitT=d.ownerId?(d.ownerId===this.LOCAL_ID?d.lockOwner:d.lockOther):0.35;
      if(d.t>waitT&&hd<3.2){
        const pull=Math.min(1,dt*(hd<1.8?9:3));
        d.mesh.position.x+=dx*pull;d.mesh.position.z+=dz*pull;
      }
      if(d.t>waitT&&hd<1.65&&Math.abs(Player.pos.y-d.mesh.position.y)<3.5){
        const left=RPG.addItem(d.id,d.n);
        if(left>0){d.n=left;d.t=0;UI.toast('🎒 Tas penuh!');}
        else{
          UI.toast(`+${d.n} ${ITEMS[d.id].e} ${ITEMS[d.id].n}`);
          Sfx.pickup();
          this.disposeDrop(d.mesh,d.isModel);
          this.drops.splice(i,1);
        }
      }
    }
    this.shake=Math.max(0,this.shake-dt*2.2);
  },

  /* --- HIGH-END GLSL VFX EXTENSION (LinearAbilityCasting Integration) --- */
  
  /* Nova Beam: 3-Layer Energy Laser (White Core + GLSL Energy Spiral + Impact Sparks) */
  novaBeam(startPos, endPos) {
    const dir = new THREE.Vector3().subVectors(endPos, startPos);
    const dist = dir.length();
    const group = new THREE.Group();

    // Core White Tube
    const cGeo = new THREE.CylinderGeometry(0.12, 0.12, dist, 16);
    cGeo.rotateX(Math.PI / 2); cGeo.translate(0, 0, dist / 2);
    const cMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    group.add(new THREE.Mesh(cGeo, cMat));

    // Outer GLSL Swirl Tube
    const eGeo = new THREE.CylinderGeometry(0.45, 0.45, dist, 24, 1, true);
    eGeo.rotateX(Math.PI / 2); eGeo.translate(0, 0, dist / 2);
    const eMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x00f0ff) } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
        void main() {
          float s = sin(vUv.x * 40.0 + vUv.y * 20.0 - uTime * 25.0) * 0.5 + 0.5;
          gl_FragColor = vec4(uColor * 3.0, s * (1.0 - vUv.y));
        }`,
      transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
    });
    group.add(new THREE.Mesh(eGeo, eMat));

    group.position.copy(startPos);
    group.lookAt(endPos);
    this.group.add(group);

    // Impact Light & Debris Burst
    this.impact(endPos, 0x00f0ff, 2.0);

    this.trails.push({
      mesh: group, life: 0.35, max: 0.35, isParticle: false,
      onUpdate: (dt, frac) => { eMat.uniforms.uTime.value += dt; },
      onDispose: () => { cGeo.dispose(); cMat.dispose(); eGeo.dispose(); eMat.dispose(); }
    });
  },

  /* Cinder AoE: Procedural Flame Pillar + Ground Lava Decal */
  cinderAoE(pos) {
    const group = new THREE.Group();
    group.position.copy(pos);

    // Ground Lava Decal SDF
    const dGeo = new THREE.PlaneGeometry(7, 7);
    dGeo.rotateX(-Math.PI / 2);
    const dMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xff3300) } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
        void main() {
          float dist = length(vUv - vec2(0.5)) * 2.0;
          float ring = smoothstep(0.0, 0.85, dist) * (1.0 - smoothstep(0.85, 1.0, dist));
          gl_FragColor = vec4(uColor * 3.0, ring * 0.8);
        }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    });
    group.add(new THREE.Mesh(dGeo, dMat));

    // Flame Pillar Cylinder
    const fGeo = new THREE.CylinderGeometry(2.8, 2.5, 9, 24, 1, true);
    fGeo.translate(0, 4.5, 0);
    const fMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColorOuter: { value: new THREE.Color(0xff1100) }, uColorCore: { value: new THREE.Color(0xffd700) } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime; uniform vec3 uColorOuter; uniform vec3 uColorCore; varying vec2 vUv;
        void main() {
          float noise = sin(vUv.x * 20.0 + vUv.y * 10.0 - uTime * 15.0) * 0.5 + 0.5;
          float alpha = (1.0 - vUv.y) * smoothstep(0.0, 0.15, vUv.y) * noise;
          gl_FragColor = vec4(mix(uColorOuter, uColorCore, vUv.y) * 2.5, alpha);
        }`,
      transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
    });
    group.add(new THREE.Mesh(fGeo, fMat));

    this.group.add(group);
    this.debris(pos.clone().add(new THREE.Vector3(0,1,0)), 0xff6600, 20, 2.5);

    this.trails.push({
      mesh: group, life: 0.7, max: 0.7, isParticle: false,
      onUpdate: (dt, frac) => { dMat.uniforms.uTime.value += dt; fMat.uniforms.uTime.value += dt; },
      onDispose: () => { dGeo.dispose(); dMat.dispose(); fGeo.dispose(); fMat.dispose(); }
    });
  }
};



