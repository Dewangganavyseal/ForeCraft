'use strict';
/* Kamera isometrik ortografik: rotate, zoom, shake */
const Cam={
  yaw:Math.PI*0.25,zoom:9.5,targetZoom:9.5,elev:0.96,
  /* Jarak tetap kamera ortografik dari target. Dipakai juga oleh Weather
     untuk menghitung jarak kabut: karena kameranya ortografik, kedalaman
     pemain SELALU sekitar DIST, jadi near/far kabut harus dihitung relatif
     terhadap angka ini — bukan dari nol. */
  DIST:80,
  cam:null,

  init(){
    const a=window.innerWidth/window.innerHeight;
    this.cam=new THREE.OrthographicCamera(-this.zoom*a,this.zoom*a,this.zoom,-this.zoom,0.1,300);
    Game.scene.add(this.cam);
  },
  resize(){
    const a=window.innerWidth/window.innerHeight;
    this.cam.left=-this.zoom*a;this.cam.right=this.zoom*a;
    this.cam.top=this.zoom;this.cam.bottom=-this.zoom;
    this.cam.updateProjectionMatrix();
  },
  applyZoom(){
    const a=window.innerWidth/window.innerHeight;
    this.cam.left=-this.zoom*a;this.cam.right=this.zoom*a;
    this.cam.top=this.zoom;this.cam.bottom=-this.zoom;
    this.cam.updateProjectionMatrix();
  },
  update(dt,target){
    /* di main menu kamera hanya mengorbit otomatis (updateMenu); rotasi lewat
       panah dinonaktifkan supaya panorama tidak bisa diputar pengguna */
    if(!(typeof Game!=='undefined'&&Game.menuMode))this.yaw+=Input.camTurn()*dt*2.4;
    this.zoom=lerp(this.zoom,this.targetZoom,clamp(8*dt,0,1));
    this.applyZoom();
    const e=this.elev,dist=this.DIST;
    const ox=Math.sin(this.yaw)*Math.cos(e)*dist;
    const oy=Math.sin(e)*dist;
    const oz=Math.cos(this.yaw)*Math.cos(e)*dist;
    const sh=FX.shake;
    this.cam.position.set(
      target.x+ox+(Math.random()-0.5)*sh*0.7,
      target.y+oy+(Math.random()-0.5)*sh*0.5,
      target.z+oz+(Math.random()-0.5)*sh*0.7);
    this.cam.lookAt(target.x,target.y,target.z);
  },
};
