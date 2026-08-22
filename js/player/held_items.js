'use strict';
/* =============================================================================
   HELD ITEMS — model 3D item yang sedang dipegang pemain
   -----------------------------------------------------------------------------
   Sistem baru ala Minecraft: item yang dipilih di hotbar muncul di tangan.
   Tahap pertama: makanan punya model 3D masing-masing. Item lain memakai
   model generik berwarna sampai model khususnya dibuat.
   ============================================================================= */
const HeldModels={
  _mats:{},
  mat(c){
    const k=String(c);
    if(!this._mats[k])this._mats[k]=new THREE.MeshLambertMaterial({color:c});
    return this._mats[k];
  },
  box(g,w,h,d,c,x=0,y=0,z=0,rx=0,ry=0,rz=0){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.mat(c));
    m.position.set(x,y,z);
    if(rx||ry||rz)m.rotation.set(rx,ry,rz);
    g.add(m);return m;
  },

  build(id){
    const g=new THREE.Group();
    g.name='Held_'+id;
    const fn=this.MODELS[id];
    if(fn)fn.call(this,g,id);
    else this.generic(g,id);
    /* default cara memegang: item diarahkan ke depan seperti pedang */
    if(!g.userData.hold){
      g.userData.hold={pos:[0,-0.31,0.22],rot:[Math.PI/2,0,0],scale:1};
    }
    return g;
  },

  generic(g,id){
    const c=(typeof DROP_COLOR!=='undefined'&&DROP_COLOR[id])||0xd8d0c0;
    this.box(g,0.22,0.22,0.22,c,0,0,0);
    this.box(g,0.10,0.02,0.10,0xffffff,0,0.12,0);
  },

  /* ---------- model 3D original untuk drop pedang/tameng/armor ----------
     Item yang sudah punya model 3D asli (pedang di js/player/weapons, tameng
     di js/player/shields, armor di js/player/armors) dibangun ulang dari
     builder aslinya sehingga saat jatuh sebagai drop tampil dengan model
     original — bukan kotak warna lagi.
     Pose "dipegang" bawaan builder (posisi/rotasi) di-reset, lalu pivot
     dipindah ke tengah model (bounding box) supaya putaran drop rapi.
     Mengembalikan false bila model kosong -> caller fallback ke generic. */
  _addOriginal(g,child,scale){
    if(!child)return false;
    child.position.set(0,0,0);
    child.rotation.set(0,0,0);
    /* multiplyScalar (bukan setScalar) agar skala normalisasi bawaan builder
       — mis. ShieldModels.buildFor yang menyesuaikan tinggi tameng — tetap
       terjaga dan hanya dikalikan faktor drop. */
    child.scale.multiplyScalar(scale||1);
    g.add(child);
    g.updateWorldMatrix(true,true);
    const bb=new THREE.Box3().setFromObject(g);
    if(bb.isEmpty()){g.remove(child);return false;}
    /* Pusatkan X/Z di origin supaya putaran drop (rotasi Y) stabil tanpa
       goyah. Dasar model (min.y) diletakkan tepat di origin agar model
       "duduk" di atas titik drop dan tidak menembus tanah berapa pun
       tingginya (drop ditempatkan FX.spawnDrop ~0.3 di atas lantai). */
    const c=bb.getCenter(new THREE.Vector3());
    child.position.set(-c.x,-bb.min.y,-c.z);
    /* material dibuat sendiri oleh builder (bukan cache HeldModels._mats)
       sehingga aman dibuang saat drop diambil — dicek FX.disposeDrop */
    g.userData.ownMats=true;
    return true;
  },

  MODELS:{
    berry(g){
      this.box(g,0.12,0.12,0.12,0x4d6bd6,-0.05,0,0);
      this.box(g,0.11,0.11,0.11,0x5a7de0,0.06,0.03,0.02);
      this.box(g,0.10,0.10,0.10,0x3f5ab0,0.01,0.10,-0.04);
      this.box(g,0.08,0.03,0.05,0x3e7d31,0,0.17,0);
    },
    mush(g){
      this.box(g,0.08,0.16,0.08,0xe8ddc8,0,-0.04,0);
      this.box(g,0.24,0.10,0.20,0xb5432f,0,0.08,0);
      this.box(g,0.06,0.03,0.06,0xf2e8d8,-0.05,0.13,0.03);
      this.box(g,0.05,0.03,0.05,0xf2e8d8,0.06,0.12,-0.04);
    },
    meat(g){
      this.box(g,0.26,0.14,0.18,0xc94f43,0,0,0);
      this.box(g,0.20,0.06,0.12,0xe06a5a,0,0.08,0);
      this.box(g,0.06,0.06,0.24,0xf2e8d8,0.10,-0.02,0);
    },
    cmeat(g){
      this.box(g,0.26,0.14,0.18,0x9c5a2e,0,0,0);
      this.box(g,0.20,0.05,0.12,0xb97a3f,0,0.08,0);
      this.box(g,0.06,0.06,0.24,0xe8ddc8,0.10,-0.02,0);
    },
    bread(g){
      this.box(g,0.30,0.14,0.16,0xd6a55a,0,0,0);
      this.box(g,0.26,0.06,0.12,0xe6c27a,0,0.08,0);
      this.box(g,0.02,0.02,0.14,0xb98a3f,-0.06,0.08,0);
      this.box(g,0.02,0.02,0.14,0xb98a3f,0.06,0.08,0);
    },
    salad(g){
      this.box(g,0.24,0.10,0.24,0x8a5f35,0,-0.05,0);
      this.box(g,0.20,0.06,0.20,0x7ac96a,0,0.03,0);
      this.box(g,0.10,0.08,0.10,0x5fae33,-0.05,0.08,0.04);
      this.box(g,0.09,0.07,0.09,0x8fd47f,0.06,0.07,-0.03);
      this.box(g,0.07,0.07,0.07,0xd94f3d,0.02,0.10,0.06);
    },
    pie(g){
      this.box(g,0.26,0.08,0.20,0xc98a4d,0,-0.03,0);
      this.box(g,0.22,0.06,0.16,0x7a3b20,0,0.04,0);
      this.box(g,0.06,0.03,0.06,0xd94f3d,-0.04,0.08,0.02);
      this.box(g,0.05,0.03,0.05,0xd94f3d,0.05,0.07,-0.03);
    },
    bandage(g){
      this.box(g,0.20,0.10,0.14,0xe8e4da,0,0,0);
      this.box(g,0.16,0.12,0.08,0xf6f3ec,0,0,0.02);
      this.box(g,0.04,0.02,0.16,0xd8d2c6,0,0.06,0);
    },
    /* ikan: memakai model ikan yang sudah ada (Env_Fish) */
    fish(g){
      if(window.Env_Fish){
        const f=Env_Fish.build();
        f.scale.setScalar(0.75);
        g.add(f);
        g.userData.hold={pos:[0,-0.30,0.28],rot:[0,0,0],scale:1};
      }else{
        this.box(g,0.28,0.12,0.10,0x93adc0,0,0,0);
        this.box(g,0.10,0.10,0.04,0x7d99ad,0.17,0.02,0,0,0,0.6);
      }
    },
    cfish(g){
      if(window.Env_Fish){
        const f=Env_Fish.build();
        f.scale.setScalar(0.75);
        /* warna ikan bakar */
        const cook=new THREE.Color(0xd98a4d);
        f.traverse(o=>{
          if(o.material&&o.material.color)o.material.color.lerp(cook,0.55);
        });
        g.add(f);
        g.userData.hold={pos:[0,-0.30,0.28],rot:[0,0,0],scale:1};
      }else{
        this.box(g,0.04,0.34,0.04,0x8a6a3a,0,-0.02,0,0,0,0.4);
        this.box(g,0.20,0.10,0.08,0xd98a4d,0.02,0.06,0,0,0,0.4);
      }
    },
    wheat(g){
      for(let i=0;i<4;i++){
        const a=i/4*Math.PI*2;
        this.box(g,0.03,0.30,0.03,0xd4a431,Math.cos(a)*0.04,0.02,Math.sin(a)*0.04,0,0,a*0.2);
        this.box(g,0.05,0.10,0.05,0xe6c25a,Math.cos(a)*0.05,0.20,Math.sin(a)*0.05,0,0,a*0.2);
      }
    },
    carrot(g){
      this.box(g,0.10,0.22,0.10,0xe07f1d,0,-0.02,0);
      this.box(g,0.07,0.08,0.07,0xc96f15,0,-0.14,0);
      this.box(g,0.03,0.12,0.03,0x4f9e23,-0.03,0.13,0,0,0,0.3);
      this.box(g,0.03,0.12,0.03,0x3f8a1c,0.03,0.14,0,0,0,-0.3);
    },
    cabbage(g){
      this.box(g,0.22,0.18,0.22,0x5f9e30,0,0,0);
      this.box(g,0.16,0.16,0.16,0x74b23c,0,0.05,0);
      this.box(g,0.10,0.08,0.10,0xa3d977,0,0.12,0);
      this.box(g,0.16,0.10,0.04,0x5f9e30,0,0.02,0.12,0.4,0,0);
      this.box(g,0.16,0.10,0.04,0x5f9e30,0,0.02,-0.12,-0.4,0,0);
    },
    tomato(g){
      this.box(g,0.20,0.18,0.20,0xe2451e,0,0,0);
      this.box(g,0.14,0.06,0.14,0xff6a3c,0,0.09,0);
      this.box(g,0.06,0.03,0.06,0x2f6417,0,0.13,0);
    },
    watermelon(g){
      this.box(g,0.30,0.24,0.30,0x3a7d23,0,0,0);
      this.box(g,0.06,0.25,0.31,0x8ed15c,-0.08,0,0);
      this.box(g,0.06,0.25,0.31,0x8ed15c,0.08,0,0);
      this.box(g,0.08,0.06,0.08,0x2c5e18,0,0.14,0);
    },
    /* alat: cangkul */
    hoe(g){
      this.box(g,0.05,0.46,0.05,0x8a5f35,0,-0.05,0);
      this.box(g,0.16,0.10,0.04,0x9aa2ac,0,0.20,0.04,0.5,0,0);
    },
  },
};

/* ---------- registrasi pedang / tameng / armor ----------
   Semua item yang punya model 3D asli didaftarkan ke HeldModels.MODELS
   supaya FX.spawnDrop menampilkannya sebagai drop berbentuk model original
   (bukan kotak warna). Skala diperkecil agar cocok sebagai item di tanah
   (FX.spawnDrop masih mengalikan 1.5x di luar). `hold` dipakai bila item
   sedang dipegang di tangan lewat hotbar. */
(function(){
  const SCALE={sword:0.42,shield:0.42,helm:0.45,chest:0.40,boots:0.60};
  const HOLD={
    sword :{pos:[0,-0.31,0.22],rot:[-Math.PI/2,0,0],scale:1},
    shield:{pos:[0,-0.35,0.28],rot:[0,0,0],scale:0.9},
    helm  :{pos:[0,-0.31,0.22],rot:[0,0,0],scale:1},
    chest :{pos:[0,-0.31,0.22],rot:[0,0,0],scale:0.9},
    boots :{pos:[0,-0.31,0.22],rot:[0,0,0],scale:1},
  };
  for(const id in ITEMS){
    const it=ITEMS[id];
    if(it.weapon){
      HeldModels.MODELS[id]=function(g){
        let w=null;
        if(typeof WeaponManager!=='undefined'){
          w=WeaponManager.buildWeapon(id);
          /* build() menimpa builder._sword (pemilik animasi aura). Kembalikan
             kepemilikan itu ke pedang yang sedang digenggam pemain bila tipenya
             sama, supaya drop ini tidak membekukan aura senjata yang dipakai. */
          const b=WeaponManager.getWeapon(id);
          if(b&&typeof RPG!=='undefined'&&RPG.weaponId&&RPG.weaponId()===id
            &&typeof Player!=='undefined'&&Player.parts&&Player.parts.sword){
            b._sword=Player.parts.sword;
          }
        }
        if(HeldModels._addOriginal(g,w,SCALE.sword))g.userData.hold=HOLD.sword;
        else HeldModels.generic(g,id);
      };
    }else if(it.armor&&it.armor.slot==='shield'){
      HeldModels.MODELS[id]=function(g){
        const s=(typeof ShieldModels!=='undefined')?ShieldModels.buildFor(id):null;
        if(HeldModels._addOriginal(g,s,SCALE.shield))g.userData.hold=HOLD.shield;
        else HeldModels.generic(g,id);
      };
    }else if(it.armor){
      HeldModels.MODELS[id]=function(g){
        const slot=it.armor.slot,tier=it.armor.tier||'iron';
        let a=null;
        if(typeof ArmorManager!=='undefined'){
          if(slot==='helm')a=ArmorManager.buildHelmet(tier,id);
          else if(slot==='chest')a=ArmorManager.buildChestplate(tier,id);
          else if(slot==='boots')a=ArmorManager.buildBoots(tier,id);
        }
        if(HeldModels._addOriginal(g,a,SCALE[slot]||0.5))g.userData.hold=HOLD[slot]||HOLD.helm;
        else HeldModels.generic(g,id);
      };
    }
  }
})();

window.HeldModels=HeldModels;
