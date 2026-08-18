'use strict';
/* =============================================================================
   ENTITAS MOB: GOLEM (Voxel Moss Golem)
   -----------------------------------------------------------------------------
   File mandiri: MODEL 3D (build) + ANIMASI LENGKAP (animate: jalan, ayunan
   lengan, inti lava & mata memanas saat windup menyerang). Dipanggil
   Monsters.make() & Monsters.animate() di js/monsters.js lewat window.Mob_Golem.
   ============================================================================= */

/* ===========================================================================
   1b. PORTGOLEM — Voxel Moss Golem (golem.html)
   ---------------------------------------------------------------------------
   Dipakai Monsters.make('golem'). Konstruksi voxel, warna batu/lumut/acak,
   dan struktur rig (torso/head/armL/armR/legL/legR) sama persis dengan
   prototipe; skala luar disesuaikan agar tingginya ±3 blok seperti golem
   lama di game.
   =========================================================================== */
const PortGolem={
  VOX:0.34,
  SCALE:0.41,                 // 7.3 unit prototipe → ±3 blok dunia
  STONE:[0x8f8f8f,0x868686,0x989898,0x7c7c7c,0x89908a],
  MOSS:[0x4e8f3a,0x5da346,0x3f7a2e,0x6bb053,0x57993f],
  stoneColor(){return Math.random()<0.07?0x606060:this.STONE[(Math.random()*this.STONE.length)|0];},
  mossColor(){return this.MOSS[(Math.random()*this.MOSS.length)|0];},
  jointColor(){return Math.random()<0.5?0x5a5a5a:0x4d4d4d;},
  crackColor(){return Math.random()<0.5?0x545454:0x4a4a4a;},

  build(){
    const V=n=>n*this.VOX;
    const boxGeo=new THREE.BoxGeometry(this.VOX,this.VOX,this.VOX);
    const stoneMat=new THREE.MeshLambertMaterial();
    const glowMat=new THREE.MeshBasicMaterial({color:0xffffff});
    const partMesh=(list,material)=>{
      const mesh=new THREE.InstancedMesh(boxGeo,material,list.length);
      const M=new THREE.Matrix4(),C=new THREE.Color();
      list.forEach((v,i)=>{
        M.makeTranslation(V(v[0]),V(v[1]),V(v[2]));
        mesh.setMatrixAt(i,M);
        mesh.setColorAt(i,C.set(v[3]));
      });
      mesh.instanceMatrix.needsUpdate=true;
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      mesh.castShadow=!IS_MOBILE;
      return mesh;
    };

    const root=new THREE.Group();
    root.scale.setScalar(this.SCALE);
    const torso=new THREE.Group();torso.position.y=V(7.5);
    const head=new THREE.Group();head.position.y=V(11);
    const armL=new THREE.Group();armL.position.set(V(-5.5),V(8),0);
    const armR=new THREE.Group();armR.position.set(V(5.5),V(8),0);
    const legL=new THREE.Group();legL.position.set(V(-2),V(7.5),0);
    const legR=new THREE.Group();legR.position.set(V(2),V(7.5),0);
    root.add(legL,legR,torso);
    torso.add(head,armL,armR);

    const stone=[],glow=[];
    const S=(x,y,z,c)=>stone.push([x,y,z,c!==undefined?c:this.stoneColor()]);
    const G=(x,y,z,c)=>glow.push([x,y,z,c]);

    /* badan */
    for(let x=-3;x<=3;x++)for(let z=-1;z<=1;z++)S(x,0,z,this.jointColor());
    for(let y=1;y<=2;y++)for(let x=-3;x<=3;x++)for(let z=-2;z<=2;z++)S(x,y,z);
    for(let y=3;y<=9;y++)for(let x=-4;x<=4;x++)for(let z=-2;z<=2;z++){
      if(y>=4&&y<=6&&x>=-1&&x<=1&&z===2)continue;
      if(z===2&&x>=-2&&x<=2&&y>=3&&y<=7)S(x,y,z,this.crackColor());
      else S(x,y,z);
    }
    for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)S(x,10,z,this.jointColor());
    for(let x=-1;x<=1;x++)for(let y=4;y<=6;y++)
      G(x,y,2,(x===0&&y===5)?0xff7040:0xff271c);
    G(0,7,2,0xc8321e);G(0,3,2,0xc8321e);G(2,5,2,0xa82818);G(-2,5,2,0xa82818);
    [[-4,0],[-3,1],[-2,-1],[2,1],[3,0],[4,-1],[4,1],[-3,-1]]
      .forEach(m=>S(m[0],10,m[1],this.mossColor()));
    S(-4,6,3,this.mossColor());S(3,5,3,this.mossColor());S(-4,8,2,this.mossColor());

    /* kepala */
    const headStone=[],eyeGlow=[];
    const H=(x,y,z,c)=>headStone.push([x,y,z,c!==undefined?c:this.stoneColor()]);
    for(let y=0;y<=3;y++)for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++){
      if(y===2&&(x===-1||x===1)&&z===2)continue;
      if(y===0&&x>=-1&&x<=1&&z===2){H(x,y,z,this.crackColor());continue;}
      H(x,y,z);
    }
    for(let x=-2;x<=2;x++)H(x,3,3);
    eyeGlow.push([-1,2,2,0xff3520],[1,2,2,0xff3520]);
    [[-2,-1],[-1,1],[0,-2],[0,0],[1,-1],[2,1],[-1,-2],[2,-1]]
      .forEach(m=>H(m[0],4,m[1],this.mossColor()));
    H(-2,1,3,this.mossColor());

    /* tangan */
    const buildArm=g=>{
      const list=[];
      const A=(x,y,z,c)=>list.push([x,y,z,c!==undefined?c:this.stoneColor()]);
      for(let y=0;y<=1;y++)for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)A(x,y,z,this.jointColor());
      for(let y=-1;y>=-4;y--)for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)A(x,y,z);
      for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)A(x,-5,z,this.jointColor());
      for(let y=-6;y>=-9;y--)for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)A(x,y,z);
      for(let y=-10;y>=-12;y--)for(let x=-2;x<=2;x++)for(let z=-1;z<=1;z++)A(x,y,z);
      for(let x=-2;x<=2;x++)A(x,-12,2);
      A(-1,2,0,this.mossColor());A(0,2,1,this.mossColor());A(1,2,-1,this.mossColor());
      A(0,-7,2,this.mossColor());A(1,-9,2,this.mossColor());
      g.add(partMesh(list,stoneMat));
    };
    /* kaki */
    const buildLeg=g=>{
      const list=[];
      const A=(x,y,z,c)=>list.push([x,y,z,c!==undefined?c:this.stoneColor()]);
      for(let y=-1;y>=-3;y--)for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)A(x,y,z);
      for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)A(x,-4,z,this.jointColor());
      for(let y=-5;y>=-6;y--)for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)A(x,y,z);
      for(let x=-1;x<=1;x++)for(let z=-2;z<=2;z++)A(x,-7,z);
      A(0,-5,2,this.mossColor());A(-1,-7,2,this.mossColor());
      g.add(partMesh(list,stoneMat));
    };

    torso.add(partMesh(stone,stoneMat));
    const coreMesh=partMesh(glow,glowMat);torso.add(coreMesh);
    head.add(partMesh(headStone,stoneMat));
    head.add(partMesh(eyeGlow,glowMat));
    buildArm(armL);buildArm(armR);buildLeg(legL);buildLeg(legR);

    return{
      mesh:root,
      parts:{
        body:torso,head,armL,armR,legs:[legL,legR],
        headBaseY:V(11),       // posisi dasar kepala (lokal torso)
        runeCore:coreMesh,     // voxel lava di dada (InstancedMesh glow)
        lavaMat:glowMat,       // material glow bersama (mata + inti)
      },
    };
  },
};

const Mob_Golem={

  /* ---------- MODEL 3D ----------
     Voxel InstancedMesh: torso/head/armL/armR/kaki + inti lava & mata glow.
     Tinggi sekitar 3 blok dunia. */
  build(boss){
    const b=PortGolem.build();
    const g=new THREE.Group();
    g.add(b.mesh);
    const parts={
      body:b.parts.body,head:b.parts.head,
      armL:b.parts.armL,armR:b.parts.armR,legs:b.parts.legs,
      headBaseY:b.parts.headBaseY,
      runeCore:b.parts.runeCore,lavaMat:b.parts.lavaMat,
    };
    return{mesh:g,parts};
  },

  /* ---------- ANIMASI LENGKAP ----------
     Jalan pelan (kaki & lengan berayun), kepala naik-turun halus, inti lava
     & mata memanas merah saat windup menyerang. */
  animate(m,dt){
    const t=performance.now()*0.001;
      const sp=Math.hypot(m.vel.x,m.vel.z);

      const sw=Math.sin(t*4)*0.4*Math.min(1,sp);
      if(m.windup<=0){
        m.parts.armL.rotation.x=lerp(m.parts.armL.rotation.x,sw,dt*5);
        m.parts.armR.rotation.x=lerp(m.parts.armR.rotation.x,-sw,dt*5);
      }
      m.parts.head.position.y=(m.parts.headBaseY!==undefined?m.parts.headBaseY:2.18)+Math.sin(t*2)*0.04;
      if(m.parts.legs&&m.parts.legs.length>=2){
        const step=Math.sin(t*3.5)*0.35*Math.min(1,sp);
        m.parts.legs[0].rotation.x=step;
        m.parts.legs[1].rotation.x=-step;
      }
      // Denyut cahaya inti lava di dada golem (glowMat bersama mata —
      // saat windup seluruh lava & mata ikut memanas)
      if(m.parts.runeCore){
        const p=0.7+Math.sin(t*(m.windup>0?22:6))*0.3;
        if(m.windup>0)m.parts.runeCore.material.color.setHex(0xff2200);
        else m.parts.runeCore.material.color.setScalar(0.75+0.35*p);
        if(m.parts.runeHalo)m.parts.runeHalo.material.opacity=0.3+0.4*p;
      }
      // Mata menyala & berubah warna merah saat windup attack
      if(m.parts.eyeL&&m.parts.eyeR){
        const eyeColor=m.windup>0?0xff1100:0xffaa00;
        m.parts.eyeL.material.color.setHex(eyeColor);
        m.parts.eyeR.material.color.setHex(eyeColor);
      }
  },
};
window.Mob_Golem=Mob_Golem;
