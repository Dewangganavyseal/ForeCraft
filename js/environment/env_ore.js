'use strict';
/* =============================================================================
   ENV_ORE — PECAHAN BONGKAHAN ORE (port fisika dari NEW MODEL/ore.html)
   -----------------------------------------------------------------------------
   Ketika blok bijih dipukul (lintas tahap) atau hancur, bongkahan kecil
   terlepas: JATUH → MEMANTUL → MENGELINDING di tanah → berhenti → mengecil →
   hilang. Fisikanya port langsung dari updateFrags() prototipe ore.html:
     · gravitasi 21, bounce vertikal 0.34, gesek horizontal 0.72
     · bongkahan MENGELINDING di tanah: rotasi sumbu tegak-lurus kecepatan
       (rotateOnWorldAxis) dengan kecepatan putar = hs/r — tidak ada fragmen
       yang melayang atau berhenti di udara.
     · resting saat kecepatan < 0.12, lalu mengecil (shrink) & dibuang.
   Geometri tiap palet ore dibangun SEKALI (bongkahan bertingkat 2 tingkat
   dengan warna vertex di-bake) lalu dibagikan ke semua fragmennya — murah.
   ============================================================================= */
const OreFX={
  list:[],
  MAX:48,                        // batas fragmen aktif (bongkahan tertua dibuang)
  _geoCache:{},
  _mat:null,

  /* geometri bongkahan mini per palet ore: kubus bertingkat 2 tingkat dengan
     tepi yang menyempit (kesan chamfer), warna di-bake ke vertex color */
  geoFor(pal){
    if(this._geoCache[pal])return this._geoCache[pal];
    const P=[],N=[],C=[],I=[];let vi=0;
    const FACES=[
      {dir:[-1,0,0],corners:[[0,1,0],[0,0,0],[0,1,1],[0,0,1]]},
      {dir:[1,0,0],corners:[[1,1,1],[1,0,1],[1,1,0],[1,0,0]]},
      {dir:[0,-1,0],corners:[[1,0,1],[0,0,1],[1,0,0],[0,0,0]]},
      {dir:[0,1,0],corners:[[0,1,1],[1,1,1],[0,1,0],[1,1,0]]},
      {dir:[0,0,-1],corners:[[1,0,0],[0,0,0],[1,1,0],[0,1,0]]},
      {dir:[0,0,1],corners:[[0,0,1],[1,0,1],[0,1,1],[1,1,1]]},
    ];
    const push=(bx,by,bz,sx,sy,sz)=>{
      for(let f=0;f<6;f++){
        const d=FACES[f].dir;
        const shade=d[1]===1?1.0:d[1]===-1?0.5:(d[0]!==0?0.72:0.85);
        let c;
        if(d[1]===1)c=pal.g;
        else if(d[1]===-1)c=pal.b[0];
        else c=(f%2===0)?pal.o[(f>>1)%3]:pal.b[(f+1)%3];
        const r=shade*c[0],g=shade*c[1],b=shade*c[2];
        for(const cn of FACES[f].corners){
          P.push(bx+cn[0]*sx,by+cn[1]*sy,bz+cn[2]*sz);
          N.push(d[0],d[1],d[2]);
          C.push(r,g,b);
        }
        I.push(vi,vi+1,vi+2,vi+2,vi+1,vi+3);vi+=4;
      }
    };
    /* bongkah bawah besar + bongkah atas kecil (chamfer bertingkat) */
    push(-0.5,0   ,-0.5,1.0 ,0.72,1.0);
    push(-0.32,0.72,-0.32,0.64,0.46,0.64);
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));
    g.setIndex(I);
    return this._geoCache[pal]=g;
  },

  /* palet dari mesher (ORE_PAL di-konversi [r,g,b]) — fallback bila mesher
     belum dimuat: warna netral batu */
  palOf(blockId){
    if(typeof Mesher!=='undefined'&&Mesher.orePalette&&Mesher.orePalette(blockId))
      return Mesher.orePalette(blockId);
    return {b:[[0.55,0.57,0.6],[0.52,0.55,0.58],[0.6,0.62,0.65]],
            o:[[0.45,0.46,0.49],[0.5,0.52,0.55],[0.68,0.7,0.72]],
            g:[0.85,0.87,0.9]};
  },

  /* lepaskan `n` pecahan dari titik (x,y,z) — power = skala kekuatan lempar */
  burst(x,y,z,blockId,n,power){
    if(typeof Game==='undefined'||!Game.scene)return;
    if(!this._mat)this._mat=new THREE.MeshLambertMaterial({vertexColors:true});
    const pal=this.palOf(blockId);
    const geo=this.geoFor(pal);
    power=power||1;
    for(let k=0;k<n;k++){
      if(this.list.length>=this.MAX){
        const old=this.list.shift();
        Game.scene.remove(old.grp);
      }
      const grp=new THREE.Mesh(geo,this._mat);
      const sc=0.20+Math.random()*0.16;               // ukuran bongkahan 0.2..0.36
      grp.scale.setScalar(sc);
      grp.position.set(x+(Math.random()-0.5)*0.5,y+0.3,z+(Math.random()-0.5)*0.5);
      grp.rotation.set(Math.random()*6.28,Math.random()*6.28,Math.random()*6.28);
      Game.scene.add(grp);
      const a=Math.random()*Math.PI*2;
      const s=(1.4+Math.random()*2.2)*power;
      this.list.push({
        grp,sc,r:sc*0.75,
        vel:new THREE.Vector3(Math.cos(a)*s,1.3+Math.random()*1.9*power,Math.sin(a)*s),
        ang:2+Math.random()*6,
        axis:new THREE.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).normalize(),
        resting:false,restT:0,age:0,
      });
    }
  },

  /* fisika: port updateFrags prototipe — jatuh, memantul, MENGELINDING di
     tanah mengikuti permukaan dunia, berhenti, mengecil, dibuang */
  update(dt){
    for(let i=this.list.length-1;i>=0;i--){
      const f=this.list[i];f.age+=dt;
      if(!f.resting){
        f.vel.y-=21*dt;
        f.grp.position.x+=f.vel.x*dt;
        f.grp.position.y+=f.vel.y*dt;
        f.grp.position.z+=f.vel.z*dt;
        /* permukaan tanah di bawah fragmen: selalu di-ground-kan (tidak
           pernah mengambang di atas lubang maupun di dalam tanah) */
        const gy=World.groundAt(f.grp.position.x,f.grp.position.z,
          f.grp.position.y+2)+f.r;
        if(f.grp.position.y<=gy&&f.vel.y<0){
          f.grp.position.y=gy;
          f.vel.y*=-0.34;f.vel.x*=0.72;f.vel.z*=0.72;f.ang*=0.65;
          if(Math.abs(f.vel.y)<0.7)f.vel.y=0;
        }
        if(f.grp.position.y<=gy+0.02&&Math.abs(f.vel.y)<0.05){
          /* MENGELINDING: rotasi pada sumbu tegak-lurus arah gerak */
          f.vel.x*=Math.exp(-1.6*dt);f.vel.z*=Math.exp(-1.6*dt);
          const hs=Math.hypot(f.vel.x,f.vel.z);
          if(hs>0.02){
            const ax=new THREE.Vector3(f.vel.z,0,-f.vel.x).normalize();
            f.grp.rotateOnWorldAxis(ax,hs*dt/f.r);
          }
          if(hs<0.12){f.resting=true;f.restT=0.6+Math.random()*0.9;}
        }else{
          f.grp.rotateOnAxis(f.axis,f.ang*dt);
        }
      }else{
        f.restT-=dt;
        if(f.restT<=0){
          const s=f.grp.scale.x-dt*1.6;
          if(s<=0.02){
            Game.scene.remove(f.grp);
            this.list.splice(i,1);
            continue;
          }
          f.grp.scale.setScalar(s);
        }
      }
      if(f.age>7){
        Game.scene.remove(f.grp);
        this.list.splice(i,1);
      }
    }
  },

  /* bersihkan semua fragmen (dipanggil saat keluar ke menu / ganti dunia) */
  clear(){
    if(typeof Game==='undefined'||!Game.scene)return;
    for(const f of this.list)Game.scene.remove(f.grp);
    this.list.length=0;
  },
};
window.OreFX=OreFX;
