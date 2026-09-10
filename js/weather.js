'use strict';
/* Siklus siang-malam + hujan + petir + bintang + kunang-kunang */
const Weather={
  time:0.32,day:1,rain:0,rainTarget:0,rainTimer:rand(60,110),
  nightF:0,flash:0,thunderT:0,
  sun:null,hemi:null,stars:null,fireflies:null,rainLines:null,rainData:[],
  skyDay:new THREE.Color(0x8fb8de),skyNight:new THREE.Color(0x0b1026),
  /* skyRain dicerahkan: 0x55606c terlalu gelap sehingga saat hujan
     dunia jadi nyaris tak terlihat (kabut + peredupan cahaya menumpuk). */
  skyDusk:new THREE.Color(0xe8925c),skyRain:new THREE.Color(0x9fb0bf),
  tmp:new THREE.Color(),sunDir:new THREE.Vector3(0,1,0),

  init(scene){
    this.sun=new THREE.DirectionalLight(0xfff2d8,1.1);
    /* bayangan & resolusinya diatur preset grafis (lihat Gfx.apply) */
    const gp=(typeof Gfx!=='undefined'&&Gfx.preset)?Gfx.preset():null;
    const useShadow=gp?gp.shadow:!IS_MOBILE;
    this.sun.castShadow=useShadow;
    if(useShadow){
      this.sun.shadow.mapSize.set(gp?gp.shadowSize:1024,gp?gp.shadowSize:1024);
      const sc=this.sun.shadow.camera;
      sc.left=-34;sc.right=34;sc.top=34;sc.bottom=-34;sc.near=1;sc.far=180;
      this.sun.shadow.bias=-0.0006;
    }
    scene.add(this.sun);scene.add(this.sun.target);
    this.hemi=new THREE.HemisphereLight(0xbdd7f0,0x3a4a2f,0.6);
    scene.add(this.hemi);
    /* bintang */
    const sg=new THREE.BufferGeometry(),sp=[];
    for(let i=0;i<350;i++){
      const a=Math.random()*Math.PI*2,e=rand(0.1,Math.PI*0.49),r=280;
      sp.push(Math.cos(a)*Math.cos(e)*r,Math.sin(e)*r,Math.sin(a)*Math.cos(e)*r);
    }
    sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));
    this.stars=new THREE.Points(sg,new THREE.PointsMaterial({color:0xdfe6ff,size:1.6,transparent:true,opacity:0,sizeAttenuation:false}));
    scene.add(this.stars);
    /* kunang-kunang */
    const fg=new THREE.BufferGeometry(),fp=[];this.ffBase=[];
    for(let i=0;i<40;i++){
      const o=new THREE.Vector3(rand(-14,14),rand(0.6,3),rand(-14,14));
      this.ffBase.push(o);fp.push(o.x,o.y,o.z);
    }
    fg.setAttribute('position',new THREE.Float32BufferAttribute(fp,3));
    this.fireflies=new THREE.Points(fg,new THREE.PointsMaterial({color:0xd8ff9a,size:0.14,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
    scene.add(this.fireflies);
    /* hujan */
    const N=(typeof Gfx!=='undefined'&&Gfx.preset)?Gfx.preset().rainN:(IS_MOBILE?350:700);
    this.buildRain(scene,N);
  },

  /* ---------- geometri hujan ----------
     Dipisah supaya jumlah garis hujan bisa diganti saat preset grafis berubah
     (lihat Gfx.apply → setRainCount). Geometri & data lama dibuang dulu agar
     tidak menumpuk. */
  buildRain(scene,N){
    if(this.rainLines){
      scene.remove(this.rainLines);
      if(this.rainLines.geometry)this.rainLines.geometry.dispose();
    }
    this.rainN=N;
    this.rainData=[];
    const rg=new THREE.BufferGeometry(),rp=new Float32Array(N*6);
    for(let i=0;i<N;i++){
      this.rainData.push({x:rand(-28,28),y:rand(0,24),z:rand(-28,28),v:rand(18,25)});
    }
    rg.setAttribute('position',new THREE.BufferAttribute(rp,3));
    this.rainLines=new THREE.LineSegments(rg,
      new THREE.LineBasicMaterial({color:0xaac6dd,transparent:true,opacity:0,depthWrite:false}));
    this.rainLines.frustumCulled=false;this.rainLines.renderOrder=5;
    scene.add(this.rainLines);
  },
  /* ganti jumlah garis hujan mengikuti preset grafis */
  setRainCount(N){
    if(!this.rainLines||this.rainN===N)return;
    if(typeof Game==='undefined'||!Game.scene)return;
    this.buildRain(Game.scene,N);
  },

  update(dt){
    /* waktu */
    this.time+=dt/CFG.DAY_LEN;
    if(this.time>=1){this.time-=1;this.day++;}
    const ang=this.time*Math.PI*2-Math.PI/2;
    const se=Math.sin(ang);
    const dayF=clamp(se*1.5,0,1);
    const duskF=clamp(1-Math.abs(se)*4,0,1);
    this.nightF=1-dayF;

    /* cuaca */
    this.rainTimer-=dt;
    if(this.rainTimer<=0){
      this.rainTarget=this.rainTarget>0.5?0:1;
      this.rainTimer=this.rainTarget>0.5?rand(60,120):rand(70,160);
      if(this.rainTarget>0.5)UI.toast('🌧️ Hujan turun...');
      else UI.toast('☀️ Hujan reda');
    }
    this.rain=lerp(this.rain,this.rainTarget,dt*0.25);
    Sfx.setRain(this.rain);
    if(this.rain>0.5){
      this.thunderT-=dt;
      if(this.thunderT<=0){
        this.thunderT=rand(9,22);this.flash=1;Sfx.thunder();
      }
    }
    this.flash=Math.max(0,this.flash-dt*2.5);
    document.getElementById('flash').style.opacity=this.flash*0.55;

    /* arah matahari / bulan */
    if(se>-0.05)this.sunDir.set(Math.cos(ang)*0.8,Math.max(0.08,se),0.35).normalize();
    else this.sunDir.set(-Math.cos(ang)*0.6,0.35,-0.35).normalize();
    const isDay=se>-0.05;

    /* warna langit */
    this.tmp.copy(this.skyNight).lerp(this.skyDay,dayF);
    this.tmp.lerp(this.skyDusk,duskF*0.65);
    this.tmp.lerp(this.skyRain,this.rain*0.42);
    Game.scene.background=this.tmp.clone();
    Game.scene.fog.color.copy(this.tmp);
    /* ---------- KABUT ----------
       Jarak kabut diukur RELATIF terhadap posisi kamera, bukan angka absolut:
       kamera duduk sejauh Cam.DIST dari pemain, jadi kedalaman pemain di
       clip-space selalu ≈DIST. Kalau near/far dipatok konstan (dulu 30/90),
       layar bisa selalu tertutup kabut.

       Sejak kamera menjadi PERSPEKTIF, Cam.DIST tidak lagi konstan — ia
       mengecil saat zoom in dan membesar saat zoom out (DIST = zoom/tan(fov/2)).
       Karena itu lebar pita kabut ikut diskalakan terhadap DIST, bukan terhadap
       zoom seperti dulu: dengan begitu proporsi "area bersih di sekitar pemain"
       tetap sama di semua tingkat zoom. */
    const D=Cam.DIST;
    Game.scene.fog.near=D*0.92-this.rain*3;
    Game.scene.fog.far =D*1.55+8-this.rain*4;

    /* lampu */
    let inten=(0.15+dayF*1.05)*(1-this.rain*0.22)+this.flash*1.5;
    this.sun.intensity=inten;
    this.sun.color.setHex(isDay?(duskF>0.4?0xffb37a:0xfff2d8):0x7a8ec9);
    /* ambient dinaikkan saat hujan supaya bayangan tidak pekat */
    this.hemi.intensity=(0.22+dayF*0.5)*(1-this.rain*0.1)+this.rain*0.18+this.flash*0.4;
    this.sun.position.copy(Player.pos).addScaledVector(this.sunDir,60);
    this.sun.target.position.copy(Player.pos);
    this.stars.material.opacity=(1-dayF)*(1-this.rain)*0.9;
    this.stars.position.copy(Cam.cam.position);
    this.fireflies.material.opacity=clamp((1-dayF-0.3)*(1-this.rain),0,1)*0.9;
    /* shader air */
    const M=Mesher.getMats();
    M.water.uniforms.uTime.value+=dt;
    M.water.uniforms.uSunDir.value.copy(this.sunDir);
    M.water.uniforms.uNight.value=this.nightF*(1-this.flash);
    /* posisi kamera utk Fresnel/refleksi (dipakai shader sebagai uEyePos) */
    M.water.uniforms.uEyePos.value.copy(Cam.cam.position);

    this.updateRain(dt);
    this.updateFireflies(dt);
  },

  updateRain(dt){
    const pos=this.rainLines.geometry.attributes.position;
    const arr=pos.array,pp=Player.pos;
    const op=this.rain*0.45;
    this.rainLines.material.opacity=op;
    if(op<0.01)return;
    for(let i=0;i<this.rainN;i++){
      const d=this.rainData[i];
      d.y-=d.v*dt;
      if(d.y<pp.y-8){d.y=pp.y+rand(14,22);d.x=pp.x+rand(-28,28);d.z=pp.z+rand(-28,28);}
      const o=i*6;
      arr[o]=d.x;arr[o+1]=d.y;arr[o+2]=d.z;
      arr[o+3]=d.x+0.06;arr[o+4]=d.y+0.85;arr[o+5]=d.z;
    }
    pos.needsUpdate=true;
    /* percikan hujan di permukaan: ripple kecil, redup, dan seragam.
       BUGFIX: dulu warna 0xbfd6e6 terlalu putih-mencolok & ada argumen ke-6
       yang terabaikan, sehingga tampak lingkaran putih besar random. Sekarang
       warna lebih gelap/transparan dan skala kecil konsisten. */
    if(Math.random()<this.rain*0.35){
      const rx=pp.x+rand(-10,10),rz=pp.z+rand(-10,10);
      const gy=World.topY(Math.floor(rx),Math.floor(rz));
      const isW=World.getBlock(Math.floor(rx),3,Math.floor(rz))===B.WATER;
      FX.ripple(rx,isW?CFG.WATER_Y:gy+0.02,rz,isW?0x7fa8c0:0x6b7f8f,0.3);
    }
  },
  updateFireflies(dt){
    if(this.fireflies.material.opacity<0.02)return;
    const t=performance.now()*0.001;
    const pos=this.fireflies.geometry.attributes.position;
    for(let i=0;i<this.ffBase.length;i++){
      const b=this.ffBase[i];
      pos.setXYZ(i,
        Player.pos.x+b.x+Math.sin(t*0.7+i)*1.2,
        Player.pos.y+b.y+Math.sin(t*1.1+i*2)*0.5,
        Player.pos.z+b.z+Math.cos(t*0.6+i)*1.2);
    }
    pos.needsUpdate=true;
  },
};
