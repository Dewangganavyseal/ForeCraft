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
  /* FOV vertikal (derajat) — tombol KEKUATAN PERSPEKTIF. Ada trade-off yang
     perlu diketahui sebelum mengubahnya, karena `zoom` menentukan framing:
     jarak kamera = zoom/tan(fov/2), jadi FOV besar menarik kamera MENDEKAT dan
     ikut menurunkan ketinggiannya.

       FOV besar  → perspektif kuat (sisi blok jelas melebar), tapi saat pemain
                    zoom-in penuh kamera bisa turun sampai setinggi bangunan
                    tertinggi (WORLD_H 24) sehingga bisa menembus dinding.
       FOV kecil  → kamera jauh & tinggi, aman, tapi tampilannya makin
                    mendekati ortografik (kembali ke masalah semula).

     16° dipilih karena pada zoom TERDEKAT (5) kamera masih duduk di y≈32 —
     di atas seluruh dunia, jadi minCamY() tidak perlu ikut campur dan framing
     tiap tingkat zoom tetap tepat — sementara konvergensinya ±30% pada rentang
     kedalaman 20 blok, cukup untuk terasa punya kedalaman. Kalau ingin
     perspektif lebih kuat, naikkan angka ini; minCamY() di bawah menjaga kamera
     tetap di atas dunia (dengan konsekuensi framing zoom terdekat melebar). */
  fov:16,
  /* Jarak kamera→target hasil perhitungan zoom. Disegarkan tiap applyZoom();
     dibaca Weather (kabut) & World (oklusi). */
  DIST:0,
  cam:null,

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
  /* Pada kamera perspektif, "zoom" = MENDEKAT/MENJAUH (mengubah DIST), bukan
     mengubah frustum. Nama metodenya dipertahankan karena dipanggil dari
     main.js & input.js. */
  applyZoom(){
    this.DIST=this.distFor(this.zoom);
    const a=window.innerWidth/window.innerHeight;
    if(this.cam.aspect!==a||this.cam.fov!==this.fov){
      this.cam.aspect=a;this.cam.fov=this.fov;
      this.cam.updateProjectionMatrix();
    }
  },
  update(dt,target){
    /* di main menu kamera hanya mengorbit otomatis (updateMenu); rotasi lewat
       panah dinonaktifkan supaya panorama tidak bisa diputar pengguna */
    if(!(typeof Game!=='undefined'&&Game.menuMode))this.yaw+=Input.camTurn()*dt*2.4;
    this.zoom=lerp(this.zoom,this.targetZoom,clamp(8*dt,0,1));
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
    const ox=Math.sin(this.yaw)*Math.cos(e)*dist;
    const oy=Math.sin(e)*dist;
    const oz=Math.cos(this.yaw)*Math.cos(e)*dist;
    /* DIST = jarak EFEKTIF (sudah termasuk kenaikan dari minCamY) supaya
       Weather (kabut) & World (oklusi) tidak memakai angka yang berbeda dari
       posisi kamera sebenarnya. */
    this.DIST=dist;
    const sh=FX.shake;
    this.cam.position.set(
      target.x+ox+(Math.random()-0.5)*sh*0.7,
      target.y+oy+(Math.random()-0.5)*sh*0.5,
      target.z+oz+(Math.random()-0.5)*sh*0.7);
    this.cam.lookAt(target.x,target.y,target.z);
  },
};
