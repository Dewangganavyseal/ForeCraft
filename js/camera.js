'use strict';
/* =============================================================================
   KAMERA PERSPEKTIF gaya ARPG (Minecraft Dungeons / Diablo)
   -----------------------------------------------------------------------------
   Dulu: OrthographicCamera pada elev 0.96 rad (55°). Ortografik tidak punya
   konvergensi — semua garis sejajar tetap sejajar, tidak ada sisi dinding yang
   melebar ke arah kamera — sehingga terasa seperti melihat peta dari jauh dan
   sudut pandangnya terkesan tinggi.

   Sekarang: PerspectiveCamera dengan FOV SEMPIT + jarak jauh + pitch tetap.
   Ini resep yang dipakai game ARPG: tampilannya tetap terbaca seperti
   isometrik (distorsi halus karena FOV kecil), tapi punya kedalaman sungguhan
   sehingga mata terasa lebih dekat ke tanah.

   `zoom` TETAP dipertahankan artinya = SETENGAH TINGGI area yang terlihat pada
   bidang target (satuan blok). Jadi seluruh kode lama yang menyetel zoom
   (Input pinch/scroll 5..16, main menu 8.2, default 9.5) memberi framing yang
   kira-kira sama seperti versi ortografik. Pada kamera perspektif angka itu
   diterjemahkan menjadi JARAK:  d = zoom / tan(fov/2).

   AKIBAT KE SISTEM LAIN (sudah disesuaikan):
     · Cam.DIST bukan konstanta lagi — ikut zoom. Weather memakainya untuk
       jarak kabut, World.updateOcclusion untuk arah/jarak oklusi rumah.
     · Raycast klik (Furni.moveGhostTo, Player.aim) tetap benar: Raycaster
       Three.js menangani perspektif maupun ortografik.
   ============================================================================= */
const Cam={
  yaw:Math.PI*0.25,
  /* setengah tinggi area terlihat pada bidang target (blok) — lihat catatan di atas */
  zoom:9.5,targetZoom:9.5,
  /* 47° di atas horizon. Lebih rendah dari 55° versi ortografik supaya sisi
     blok, dinding, dan tinggi terrain lebih terlihat — inilah bagian yang
     membuat Minecraft Dungeons terasa "lebih rendah". Turunkan lagi (mis. 0.72
     ≈ 41°) kalau ingin lebih membumi; naikkan ke 0.96 untuk kembali seperti
     dulu. */
  elev:0.82,
  fov:16,
  /* Jarak kamera→target hasil perhitungan zoom. Disegarkan tiap applyZoom();
     dibaca Weather (kabut) & World (oklusi). */
  DIST:0,
  cam:null,

  /* ---------- FITUR EKSPERIMENTAL: THIRD PERSON PERSPECTIVE (TPP) ----------
     Diaktifkan/dinonaktifkan lewat menu rahasia /280195.
     Saat aktif dan pemain zoom sangat dekat (zoom < 4.8), kamera bertransisi
     mulus menjadi kamera belakang karakter (TPP chase camera). */
  tppEnabled: (typeof localStorage!=='undefined' && (localStorage.getItem('forecraft_tpp_enabled')==='1'||localStorage.getItem('forecraft_fpp_enabled')==='1')),
  tppWeight: 0,     // 0 = isometrik murni, 1 = TPP belakang karakter
  tppPitch: 0.0,    // sudut pandang vertikal kamera saat di mode TPP (-0.75 s/d 0.75 rad)

  setTPP(enabled){
    this.tppEnabled=!!enabled;
    try{
      if(typeof localStorage!=='undefined'){
        localStorage.setItem('forecraft_tpp_enabled',this.tppEnabled?'1':'0');
        localStorage.removeItem('forecraft_fpp_enabled');
      }
    }catch(e){}
    if(!this.tppEnabled){
      this.targetZoom=Math.max(5.0,this.targetZoom);
      if(typeof Input!=='undefined'&&Input.pointerLocked){
        if(document.exitPointerLock&&document.pointerLockElement){
          try{document.exitPointerLock();}catch(e){}
        }
      }
      if(typeof UI!=='undefined'&&UI.toast)
        UI.toast('🎥 Mode TPP: NONAKTIF (Kamera Isometrik Standar)');
    }else{
      if(typeof UI!=='undefined'&&UI.toast)
        UI.toast('🎥 Mode TPP: AKTIF! (Zoom sangat dekat untuk kamera belakang karakter)');
    }
  },
  setFPP(enabled){ this.setTPP(enabled); },

  /* jarak agar tinggi terlihat pada bidang target = 2*zoom */
  distFor(zoom){return zoom/Math.tan(this.fov*Math.PI/360);},
  /* Ketinggian minimum kamera. Dunia setinggi CFG.WORLD_H (24) dan menara desa
     bisa mencapai puncaknya; kalau kamera turun di bawah itu, near-plane bisa
     menembus dinding/atap saat pemain zoom-in di dalam desa. Bila jarak hasil
     zoom membuat kamera terlalu rendah, jaraknya dinaikkan (bukan elev-nya) agar
     SUDUT PANDANG tetap konsisten di semua tingkat zoom. */
  minCamY(){
    const h=(typeof CFG!=='undefined'&&CFG.WORLD_H)?CFG.WORLD_H:24;
    return h+3;
  },

  init(){
    const a=window.innerWidth/window.innerHeight;
    /* near 0.5: kamera duduk jauh & tinggi, tidak pernah menempel geometri.
       far 400: jarak kamera terjauh (zoom 16 → ~114) ditambah kedalaman dunia
       masih jauh di dalam batas, dan rasio far/near tetap cukup kecil sehingga
       presisi depth buffer aman. */
    this.cam=new THREE.PerspectiveCamera(this.fov,a,0.5,400);
    this.DIST=this.distFor(this.zoom);
    Game.scene.add(this.cam);
  },
  resize(){
    this.cam.aspect=window.innerWidth/window.innerHeight;
    this.cam.updateProjectionMatrix();
  },
  /* Pada kamera perspektif, "zoom" = MENDEKAT/MENJAUH (mengubah DIST).
     Di mode TPP, FOV beralih nyaman ke 56° di belakang karakter. */
  applyZoom(){
    this.DIST=this.distFor(this.zoom);
    const a=(typeof window!=='undefined'&&window.innerWidth&&window.innerHeight)?window.innerWidth/window.innerHeight:this.cam.aspect;
    const targetFov=lerp(this.fov,56,this.tppWeight||0);
    const targetNear=lerp(0.5,0.15,this.tppWeight||0);
    let changed=false;
    if(this.cam.aspect!==a){this.cam.aspect=a;changed=true;}
    if(Math.abs(this.cam.fov-targetFov)>0.1){this.cam.fov=targetFov;changed=true;}
    if(Math.abs(this.cam.near-targetNear)>0.02){this.cam.near=targetNear;changed=true;}
    if(changed)this.cam.updateProjectionMatrix();
  },
  update(dt,target){
    /* di main menu kamera hanya mengorbit otomatis (updateMenu); rotasi lewat
       panah dinonaktifkan supaya panorama tidak bisa diputar pengguna */
    if(!(typeof Game!=='undefined'&&Game.menuMode)){
      this.yaw+=Input.camTurn()*dt*2.4;
      if(this.tppWeight>0.4&&Input.camPitchTurn){
        this.tppPitch=clamp(this.tppPitch+Input.camPitchTurn()*dt*2.0,-0.75,0.75);
      }
    }
    this.zoom=lerp(this.zoom,this.targetZoom,clamp(8*dt,0,1));

    /* Hitung transisi TPP weight */
    if(this.tppEnabled&&this.zoom<4.8){
      const targetWeight=clamp((4.8-this.zoom)/3.6,0,1);
      this.tppWeight=lerp(this.tppWeight,targetWeight,clamp(10*dt,0,1));
    }else{
      this.tppWeight=lerp(this.tppWeight,0,clamp(12*dt,0,1));
      /* Keluar dari mode TPP kembali ke isometrik -> seketika lepas lock mouse */
      if(typeof Input!=='undefined'&&Input.pointerLocked){
        if(document.exitPointerLock&&document.pointerLockElement){
          try{document.exitPointerLock();}catch(e){}
        }
      }
    }

    this.applyZoom();
    const e=this.elev;
    /* naikkan jarak bila kamera akan duduk lebih rendah dari puncak dunia
       (lihat minCamY) — elev tidak diubah supaya sudut pandang tetap sama */
    let dist=this.DIST;
    const minY=this.minCamY()-(target.y||0);
    if(minY>0){
      const need=minY/Math.sin(e);
      if(need>dist)dist=need;
    }

    /* Posisi pusat orbit badan karakter */
    const orbitCenter=new THREE.Vector3(target.x,target.y,target.z);
    let bodySwayRoll=0;
    if(typeof Player!=='undefined'&&Player.mesh&&Player.parts&&Player.parts.torso){
      const tR=Player.parts.torso.rotation;
      bodySwayRoll=(tR.z||0)*0.16;
    }

    /* View bobbing kamera saat berjalan/lari di mode TPP */
    const isMoving=(typeof Player!=='undefined'&&Player.vel&&Math.hypot(Player.vel.x,Player.vel.z)>0.3);
    const pSpeed=isMoving?Math.hypot(Player.vel.x,Player.vel.z):0;
    if(isMoving){
      this.tppWalkPhase=(this.tppWalkPhase||0)+dt*Math.min(16,pSpeed*2.6);
    }else{
      this.tppWalkPhase=(this.tppWalkPhase||0)+dt*2.0;
    }
    const bobWeight=isMoving?Math.min(1.2,pSpeed/3.8):0;
    const viewBobY=Math.sin(this.tppWalkPhase*2)*0.024*bobWeight;
    const viewSwayX=Math.cos(this.tppWalkPhase)*0.016*bobWeight;
    const viewTiltZ=Math.sin(this.tppWalkPhase)*0.012*bobWeight;

    if(this.tppWeight>0.02){
      orbitCenter.y+=viewBobY*this.tppWeight;
      orbitCenter.x+=Math.cos(this.yaw)*viewSwayX*this.tppWeight;
      orbitCenter.z-=Math.sin(this.yaw)*viewSwayX*this.tppWeight;
    }

    /* Jarak & elevasi orbit di mode TPP (mengorbit di sekeliling badan karakter) */
    const tppDist=clamp(this.zoom*0.95+1.2,1.8,5.8);
    const baseTppElev=0.28;
    const tppElev=clamp(baseTppElev+this.tppPitch,0.06,1.35);

    const effectiveDist=lerp(dist,tppDist,this.tppWeight);
    const effectiveElev=lerp(0.82,tppElev,this.tppWeight);

    const cosElev=Math.cos(effectiveElev);
    const sinElev=Math.sin(effectiveElev);
    let ox=Math.sin(this.yaw)*cosElev*effectiveDist;
    let oy=sinElev*effectiveDist;
    let oz=Math.cos(this.yaw)*cosElev*effectiveDist;

    let camX=orbitCenter.x+ox;
    let camY=orbitCenter.y+oy;
    let camZ=orbitCenter.z+oz;

    // Anti-clipping kamera orbit di mode TPP (tidak menembus dinding/rintangan)
    if(this.tppWeight>0.25&&typeof World!=='undefined'&&World.blockedAt){
      const dirX=camX-orbitCenter.x, dirY=camY-orbitCenter.y, dirZ=camZ-orbitCenter.z;
      const totalDist=Math.hypot(dirX,dirY,dirZ);
      if(totalDist>0.3){
        const nx=dirX/totalDist, ny=dirY/totalDist, nz=dirZ/totalDist;
        const steps=Math.ceil(totalDist/0.32);
        let safeDist=totalDist;
        for(let s=1;s<=steps;s++){
          const testDist=Math.min(totalDist,s*0.32);
          const tx=orbitCenter.x+nx*testDist;
          const ty=orbitCenter.y+ny*testDist;
          const tz=orbitCenter.z+nz*testDist;
          if(World.blockedAt(tx,ty,tz,0.26)){
            safeDist=Math.max(0.65,testDist-0.28);
            break;
          }
        }
        if(safeDist<totalDist){
          camX=orbitCenter.x+nx*safeDist;
          camY=orbitCenter.y+ny*safeDist;
          camZ=orbitCenter.z+nz*safeDist;
        }
      }
    }

    const sh=FX.shake||0;
    camX+=(Math.random()-0.5)*sh*0.6;
    camY+=(Math.random()-0.5)*sh*0.4;
    camZ+=(Math.random()-0.5)*sh*0.6;

    this.cam.position.set(camX,camY,camZ);

    /* Kamera SELALU mengarah dan terkunci ke pusat badan karakter */
    this.cam.lookAt(orbitCenter);
    if(this.tppWeight>0.15){
      this.cam.rotation.z+=(viewTiltZ+bodySwayRoll)*this.tppWeight;
    }

    if(typeof document!=='undefined'){
      const ch=document.getElementById('fpp-crosshair');
      if(ch)ch.classList.remove('show');
    }
  },
};
