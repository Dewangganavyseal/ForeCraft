'use strict';
/* =============================================================================
   SHIELD MODELS  (port dari NEW MODEL/Tameng.html)
   -----------------------------------------------------------------------------
   Tujuh tameng voxel ala Minecraft: wood, iron, flame, frost (ice),
   venom (poison), storm (lightning), dark (shadow).

   Sel piksel digabung menjadi SATU InstancedMesh berwarna per-instance
   (hemat draw call saat dipakai in-game); gagang & ornamen tetap mesh biasa.
   ShieldModels.buildFor(itemId) mengembalikan Group yang sudah diskalakan
   ke tinggi ~0.85 blok, siap ditempel ke lengan kiri pemain.
   ============================================================================= */
const ShieldModels={
  /* tinggi akhir tameng saat dipakai pemain (dalam blok dunia) */
  TARGET_H:0.85,

  _mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};},

  /* generator tameng piksel: sel dikumpulkan jadi InstancedMesh */
  buildPixelShield(cfg){
    const g=new THREE.Group();
    const s=cfg.cell||0.17;
    const rnd=this._mulberry32(cfg.seed||1);
    const minY=(cfg.minY!==undefined?cfg.minY:0);
    const maxY=(cfg.maxY!==undefined?cfg.maxY:cfg.H-1);
    const cx=(cfg.W-1)/2, cy=(minY+maxY)/2;

    const cells=[]; // {x,y,c}
    for(let gy=minY;gy<=maxY;gy++){
      for(let gx=0;gx<cfg.W;gx++){
        if(!cfg.mask(gx,gy))continue;
        const border=!cfg.mask(gx+1,gy)||!cfg.mask(gx-1,gy)||!cfg.mask(gx,gy+1)||!cfg.mask(gx,gy-1);
        const color=cfg.color(gx,gy,border,rnd);
        if(color==null)continue;
        cells.push({x:(gx-cx)*s,y:(gy-cy)*s,c:color});
      }
    }
    const geo=new THREE.BoxGeometry(s,s,s);
    const mat=new THREE.MeshLambertMaterial();
    const inst=new THREE.InstancedMesh(geo,mat,cells.length);
    const d=new THREE.Object3D(),col=new THREE.Color();
    cells.forEach((p,i)=>{
      d.position.set(p.x,p.y,0);
      d.updateMatrix();
      inst.setMatrixAt(i,d.matrix);
      col.setHex(p.c);
      inst.setColorAt(i,col);
    });
    if(inst.instanceColor)inst.instanceColor.needsUpdate=true;
    inst.frustumCulled=false;
    g.add(inst);

    /* gagang khas minecraft di belakang */
    if(cfg.handle){
      const cache={};
      const hm=c=>cache[c]||(cache[c]=new THREE.MeshLambertMaterial({color:c}));
      const h1=new THREE.Mesh(new THREE.BoxGeometry(s*1.4,s*4.5,s*0.9),hm(cfg.handle[0]));
      h1.position.set(0,0,-s*0.9); g.add(h1);
      const grip=new THREE.Mesh(new THREE.BoxGeometry(s*0.9,s*2.8,s*0.9),hm(cfg.handle[1]));
      grip.position.set(0,0,-s*1.6); g.add(grip);
    }
    if(cfg.extras){
      const cache={};
      const em=c=>cache[c]||(cache[c]=new THREE.MeshLambertMaterial({color:c}));
      cfg.extras(g,s,em);
    }
    g.scale.setScalar(cfg.scale||1);
    /* tinggi asli (sebelum diskalakan ulang ke TARGET_H) */
    g.userData.rawH=(maxY-minY+1)*s*(cfg.scale||1);
    return g;
  },

  /* ---------- 1. WOODEN SHIELD ---------- */
  buildWood(){
    const W=10,H=12;
    const inShape=(gx,gy)=>{
      if(gx<0||gx>=W||gy<0||gy>=H)return false;
      if(gy>=10&&(gx<=1||gx>=8))return false;
      if(gy===0&&(gx===0||gx===9))return false;
      return true;
    };
    return this.buildPixelShield({
      W,H,seed:7,scale:1.25,
      handle:[0x3c2413,0x5a3a1e],
      mask:inShape,
      color:(gx,gy,border,rnd)=>{
        if(gx>=4&&gx<=5&&gy>=5&&gy<=6)return 0x8d9299;
        if(border)return 0x4a2f1b;
        const plank=Math.floor(gy/3);
        if(gy%3===2)return 0x6e4522;
        const r=rnd();
        if((plank%2===0&&gx===2)||(plank%2===1&&gx===7))return 0x6e4522;
        if(r<0.14)return 0x6e4522;
        if(r>0.9)return 0xb5844a;
        return [0x9c6b35,0x8a5c2c,0xa17038,0x8f6030][plank%4];
      },
      extras:(g,s,mat)=>{
        const b=new THREE.Mesh(new THREE.BoxGeometry(0.36,0.36,0.18),mat(0x6f757c));
        b.position.set(0,0,s*0.9); g.add(b);
      }
    });
  },

  /* ---------- 2. IRON KNIGHT SHIELD ---------- */
  buildIron(){
    const hw=[0,1,2,2,3,3,4,4,5,5,5,5,5];
    return this.buildPixelShield({
      W:11,H:13,seed:21,scale:1.2,
      handle:[0x2f353c,0x454c55],
      mask:(gx,gy)=>gy<hw.length&&Math.abs(gx-5)<=hw[gy],
      color:(gx,gy,border,rnd)=>{
        const cross=(gx===5&&gy>=2&&gy<=11)||(gy===9&&gx>=2&&gx<=8);
        if(cross)return rnd()<0.25?0xc2932f:0xe0b244;
        if(border)return rnd()<0.3?0x313840:0x394048;
        const r=rnd();
        return r<0.25?0x8d98a5:r<0.5?0xa8b2bd:r<0.75?0x98a2ae:0x9aa4b0;
      },
      extras:(g,s,mat)=>{
        const b=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.34,0.16),mat(0x565b61));
        b.position.set(0,3*s,s*0.9); g.add(b);
      }
    });
  },

  /* ---------- 3. FLAME SHIELD ---------- */
  buildFlame(){
    return this.buildPixelShield({
      W:13,H:13,seed:33,scale:1.2,
      handle:[0x2e1a18,0x452520],
      mask:(gx,gy)=>(gx-6)*(gx-6)+(gy-6)*(gy-6)<=40,
      color:(gx,gy,border,rnd)=>{
        if(border)return rnd()<0.4?0x2e1614:0x241210;
        const fx=Math.abs(gx-6),d=Math.abs(gy-6);
        if(fx+d<=3)return fx===0?0xffe066:fx===1?0xffb42a:fx===2?0xff7a1f:0xd9531e;
        const p=Math.max(0.05,0.18+(10-gy)*0.05+(3-fx)*0.07);
        if(rnd()<p){
          const heat=Math.min(1,(11-gy)/9+(3-fx)*0.12+rnd()*0.2);
          if(heat<0.3)return 0x8a2c12; if(heat<0.55)return 0xd9531e;
          if(heat<0.75)return 0xff7a1f; if(heat<0.9)return 0xffb42a; return 0xffe066;
        }
        const r=rnd(); return r<0.33?0x2e1a18:r<0.66?0x3a2020:0x452520;
      }
    });
  },

  /* ---------- 4. FROST SHIELD ---------- */
  buildIce(){
    const hw=[0,2,3,4,5,6,6,6,6,6,5,4,3,2,0];
    return this.buildPixelShield({
      W:13,H:15,seed:45,scale:1.05,
      handle:[0x2a4a63,0x3a6284],
      mask:(gx,gy)=>gy<hw.length&&Math.abs(gx-6)<=hw[gy],
      color:(gx,gy,border,rnd)=>{
        if(border)return rnd()<0.3?0x35628a:0x3d6f96;
        const dx=gx-6,dy=gy-7;
        const spoke=(dy===0&&Math.abs(dx)<=4)||(dx===0&&Math.abs(dy)<=4)||(dx!==0&&Math.abs(dx)===Math.abs(dy)&&Math.abs(dx)<=3);
        if(spoke)return rnd()<0.3?0xdceeff:0xf0fbff;
        if(rnd()<0.06)return 0xffffff;
        const r=rnd(); return r<0.25?0x9fd6ff:r<0.5?0x8ac8f5:r<0.75?0xb4e2ff:0x7ab8e0;
      }
    });
  },

  /* ---------- 5. VENOM SHIELD ---------- */
  buildPoison(){
    return this.buildPixelShield({
      W:13,H:16,minY:1,seed:57,scale:1.0,
      handle:[0x1d2a1c,0x2b3d2a],
      mask:(gx,gy)=>{
        if(gx===3&&gy>=3&&gy<=4)return true;
        if(gx===6&&gy>=1&&gy<=4)return true;
        if(gx===9&&gy>=3&&gy<=4)return true;
        return gy>=5&&(gx-6)*(gx-6)+(gy-10)*(gy-10)<=34;
      },
      color:(gx,gy,border,rnd)=>{
        if(gy<5)return rnd()<0.4?0x2bcc4f:0x52e878;
        if(border)return rnd()<0.3?0x1a2a14:0x14200f;
        const d2=(gx-6)*(gx-6)+(gy-10)*(gy-10);
        if(d2<=4)return rnd()<0.5?0x52e878:0x6cf292;
        if(d2<=10&&rnd()<0.6)return 0x2bcc4f;
        const p=0.15+Math.max(0,9-gy)*0.06;
        if(rnd()<p)return rnd()<0.5?0x1f9e3d:0x2bcc4f;
        const r=rnd(); return r<0.33?0x22301f:r<0.66?0x2b3d2a:0x1d2a1c;
      }
    });
  },

  /* ---------- 6. STORM SHIELD ---------- */
  buildLightning(){
    const bolt=new Set([[5,9],[6,9],[4,8],[5,8],[3,7],[4,7],[3,6],[4,6],[5,6],[6,6],[7,6],[6,5],[7,5],[5,4],[6,4],[4,3],[5,3],[3,2],[4,2],[4,1]].map(p=>p[0]+','+p[1]));
    return this.buildPixelShield({
      W:11,H:11,seed:69,scale:1.3,
      handle:[0x4a3410,0x5c421a],
      mask:(gx,gy)=>Math.abs(gx-5)+Math.abs(gy-5)<=5,
      color:(gx,gy,border,rnd)=>{
        if(bolt.has(gx+','+gy))return rnd()<0.2?0x22242e:0x15161c;
        if(border)return rnd()<0.3?0x59400c:0x6b4a0e;
        const r=rnd(); return r<0.25?0xe8b62c:r<0.5?0xd19f1f:r<0.75?0xf5c531:0xffd75e;
      }
    });
  },

  /* ---------- 7. SHADOW SHIELD ---------- */
  buildDark(){
    return this.buildPixelShield({
      W:11,H:15,maxY:16,seed:81,scale:0.95,
      handle:[0x14101f,0x1f1930],
      mask:(gx,gy)=>{
        if(gy===15&&(gx===2||gx===5||gx===8))return true;
        if(gy===16&&gx===5)return true;
        if(gy>14)return false;
        if(gx<=1&&gy>=13)return false;
        if(gx>=9&&gy>=13)return false;
        if(gx<=1&&gy<=1)return false;
        if(gx>=9&&gy<=1)return false;
        return true;
      },
      color:(gx,gy,border,rnd)=>{
        if(gy>=15)return 0x14101f;
        if(gx===5&&gy>=7&&gy<=9)return 0x0a0a10;
        if(gy===8&&gx>=2&&gx<=8)return rnd()<0.3?0x8a2be0:0xa633ff;
        if((gy===7||gy===9)&&gx>=3&&gx<=7)return rnd()<0.3?0x641da8:0x7a24cc;
        if(border)return rnd()<0.3?0x271c3a:0x2e2144;
        if(rnd()<0.08)return 0x3a2a55;
        const r=rnd(); return r<0.33?0x1a1622:r<0.66?0x221c2e:0x171320;
      }
    });
  },

  /* id item -> builder */
  MAP:{
    shield_wood:'buildWood',shield_iron:'buildIron',shield_flame:'buildFlame',
    shield_frost:'buildIce',shield_venom:'buildPoison',
    shield_storm:'buildLightning',shield_dark:'buildDark',
    /* Tameng Karapas Kelabang: dulu tidak ada di peta ini sehingga buildFor
       mengembalikan null — pemain yang memakainya tampak TANPA tameng, dan
       Royal Guard yang diberi item ini juga bergenggam kosong. Fallback ke
       builder besi dengan rona karapas diterapkan lewat warna di bawah. */
    shield_carapace:'buildIron',
  },

  /* bangun tameng untuk item id; diskalakan ke TARGET_H agar cocok
     dengan proporsi pemain (~1.9 blok) */
  buildFor(itemId){
    const fn=this.MAP[itemId];
    if(!fn)return null;
    const g=this[fn]();
    const raw=g.userData.rawH||2.5;
    g.scale.multiplyScalar(this.TARGET_H/raw);
    return g;
  },
};
