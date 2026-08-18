'use strict';
/* =============================================================================
   FARMING — sistem pertanian Forecraft
   -----------------------------------------------------------------------------
   - Cangkul mengubah rumput/tanah menjadi blok ladang (B.FARM).
   - Benih ditanam di ladang: gandum, wortel, kubis, tomat, semangka.
   - Model tanaman 3 fase dipotong dari "NEW MODEL/tanaman.html".
   - Tanaman tumbuh bertahap, bisa dipanen saat fase 3.
   ============================================================================= */

/* ---------- model tanaman (port tanaman.html) ---------- */
const CropModels={
  _mats:{},
  _melonMat:null,
  rad:d=>d*Math.PI/180,

  mat(hex){
    if(!hex)return this.melonMat();
    const k=String(hex);
    if(!this._mats[k])this._mats[k]=new THREE.MeshLambertMaterial({color:hex});
    return this._mats[k];
  },

  melonMat(){
    if(this._melonMat)return this._melonMat;
    const cv=document.createElement('canvas');cv.width=cv.height=16;
    const x=cv.getContext('2d');
    for(let j=0;j<16;j++)for(let i=0;i<16;i++){
      const base=(i%4<2)?[58,125,35]:[142,209,92];
      const v=1+(Math.random()*2-1)*0.08;
      x.fillStyle=`rgb(${base[0]*v|0},${base[1]*v|0},${base[2]*v|0})`;
      x.fillRect(i,j,1,1);
    }
    const t=new THREE.CanvasTexture(cv);
    t.magFilter=t.minFilter=THREE.NearestFilter;
    t.encoding=THREE.sRGBEncoding;
    this._melonMat=new THREE.MeshLambertMaterial({map:t});
    return this._melonMat;
  },

  /* definisi part per tanaman; phase 1..3, until = hilang mulai fase itu */
  parts(type){
    const P=[];
    const rad=this.rad;
    const add=(phase,size,pos,color,opt={})=>
      P.push({phase,size,pos,color,until:opt.until,rot:opt.rot,tex:opt.tex});

    if(type==='tomato'){
      const stem='#4e821f',leaf='#59a02b',leafD='#3e7d19',tg='#97b83f';
      const pt=(ang,d,y)=>[Math.cos(ang)*d,y,Math.sin(ang)*d];
      const branch=(phase,y,ang,len)=>{
        add(phase,[len,.06,.06],[Math.cos(ang)*len/2,y,Math.sin(ang)*len/2],stem,{rot:{y:-ang}});
        add(phase,[.24,.05,.17],pt(ang,len+.09,y+.04),leaf,{rot:{y:-ang}});
      };
      add(1,[.1,.34,.1],[0,.17,0],stem);
      add(1,[.26,.05,.14],[-.14,.26,0],leaf,{rot:{z:.55}});
      add(1,[.26,.05,.14],[.14,.26,0],leaf,{rot:{z:-.55}});
      add(2,[.1,.55,.1],[0,.62,0],stem);
      branch(2,.52,0,.36);
      branch(2,.68,rad(115),.34);
      branch(2,.80,rad(215),.30);
      add(2,[.2,.05,.15],[.3,.62,-.12],leafD,{rot:{y:.8}});
      add(2,[.16,.15,.16],[.4,.42,.05],tg);
      add(2,[.14,.13,.14],[-.14,.585,.31],tg);
      add(3,[.1,.2,.1],[0,.97,0],stem);
      add(3,[.22,.05,.16],[.08,1.02,.06],leaf,{rot:{y:.7,z:.25}});
      add(3,[.22,.05,.16],[-.09,1.0,-.05],leaf,{rot:{y:2.2,z:-.2}});
      add(3,[.2,.05,.15],[.02,1.06,-.09],leafD,{rot:{y:-1.1,z:.15}});
      const T=(x,y,z,s)=>{add(3,[s,s*.92,s],[x,y,z],'#e2451e');
                           add(3,[s*.38,.06,s*.38],[x,y+s*.46+.03,z],'#2f6417');};
      T(.45,.38,.03,.30);T(-.16,.55,.33,.27);
      T(-.27,.66,-.19,.28);T(-.22,.24,-.25,.20);
    }

    if(type==='carrot'){
      const g1='#4f9e23',g2='#3f8a1c',or1='#e07f1d',or2='#c96f15';
      for(let i=0;i<4;i++){const a=rad(i*90+45);
        add(1,[.05,.26,.05],[Math.cos(a)*.06,.13,Math.sin(a)*.06],i%2?g1:g2,{rot:{z:i%2?.18:-.15}});}
      for(let i=0;i<8;i++){const a=rad(i*45+20),h=.38+(i%3)*.06;
        add(2,[.05,h,.05],[Math.cos(a)*.11,h/2,Math.sin(a)*.11],i%2?g1:g2,
            {until:3,rot:{z:(i%2?1:-1)*(.16+(i%3)*.06)}});}
      for(let i=0;i<3;i++){const a=rad(i*120+30);
        add(2,[.13,.1,.13],[Math.cos(a)*.08,.46,Math.sin(a)*.08],g2,{until:3});}
      add(3,[.32,.24,.32],[0,.04,0],or1);
      add(3,[.24,.14,.24],[0,.17,0],or2);
      add(3,[.16,.06,.16],[0,.26,0],'#b96511');
      for(let i=0;i<9;i++){const a=rad(i*40+10),h=.42+(i%3)*.08;
        add(3,[.05,h,.05],[Math.cos(a)*.09,.28+h/2,Math.sin(a)*.09],i%2?g1:g2,
            {rot:{z:(i%2?1:-1)*(.2+(i%3)*.07)}});}
      for(let i=0;i<4;i++){const a=rad(i*90+45);
        add(3,[.15,.12,.15],[Math.cos(a)*.1,.74,Math.sin(a)*.1],g2);}
    }

    if(type==='cabbage'){
      const out='#5f9e30',mid='#74b23c',in1='#8fc95f',head='#a3d977',headD='#8fc45f';
      add(1,[.08,.2,.08],[0,.1,0],'#4e821f');
      add(1,[.2,.04,.12],[-.11,.18,0],mid,{rot:{z:.5}});
      add(1,[.2,.04,.12],[.11,.18,0],mid,{rot:{z:-.5}});
      for(let i=0;i<5;i++){const a=rad(i*72);
        add(2,[.38,.28,.1],[Math.cos(a)*.24,.17,Math.sin(a)*.24],out,
            {rot:{y:-a,z:.55,order:'YZX'}});}
      for(let i=0;i<4;i++){const a=rad(i*90+40);
        add(2,[.3,.24,.09],[Math.cos(a)*.13,.2,Math.sin(a)*.13],mid,
            {rot:{y:-a,z:.28,order:'YZX'}});}
      add(2,[.17,.2,.17],[0,.22,0],in1);
      add(3,[.46,.4,.46],[0,.4,0],head);
      add(3,[.32,.14,.32],[0,.63,0],headD);
      add(3,[.2,.12,.2],[.12,.66,.1],head);
      add(3,[.18,.12,.18],[-.1,.68,-.08],head);
      for(let i=0;i<4;i++){const a=rad(i*90+15);
        add(3,[.32,.38,.09],[Math.cos(a)*.3,.34,Math.sin(a)*.3],out,
            {rot:{y:-a,z:.12,order:'YZX'}});}
    }

    if(type==='wheat'){
      const wg='#69a82d',wgold='#d4a431',wear='#e6c25a',wawn='#c9a53b';
      const stalks=[];
      for(let i=0;i<6;i++)stalks.push({a:rad(i*60+15),r:.13,tilt:.14,h:.6});
      stalks.push({a:0,r:0,tilt:0,h:.66});
      for(let i=0;i<4;i++){const a=rad(i*90+30);
        add(1,[.05,.3,.05],[Math.cos(a)*.05,.15,Math.sin(a)*.05],i%2?wg:'#5d9926',
            {rot:{z:i%2?.14:-.14}});}
      stalks.forEach(s=>{
        const cr=s.r+Math.sin(s.tilt)*s.h/2,cy=Math.cos(s.tilt)*s.h/2;
        add(2,[.06,s.h,.06],[Math.cos(s.a)*cr,cy,Math.sin(s.a)*cr],wg,
            {until:3,rot:{y:-s.a,z:s.tilt,order:'YZX'}});
      });
      [0,2,4].forEach(i=>{const s=stalks[i];
        add(2,[.26,.04,.09],[Math.cos(s.a)*.16,.3,Math.sin(s.a)*.16],wg,
            {until:3,rot:{y:-s.a,z:.5,order:'YZX'}});});
      stalks.forEach(s=>{
        const cr=s.r+Math.sin(s.tilt)*s.h/2,cy=Math.cos(s.tilt)*s.h/2;
        add(3,[.07,s.h,.07],[Math.cos(s.a)*cr,cy,Math.sin(s.a)*cr],wgold,
            {rot:{y:-s.a,z:s.tilt,order:'YZX'}});
        const er=s.r+Math.sin(s.tilt)*(s.h+.16),ey=Math.cos(s.tilt)*(s.h+.16);
        add(3,[.16,.32,.16],[Math.cos(s.a)*er,ey,Math.sin(s.a)*er],wear,
            {rot:{y:-s.a,z:s.tilt,order:'YZX'}});
        const ar=s.r+Math.sin(s.tilt)*(s.h+.32),ay=Math.cos(s.tilt)*(s.h+.32)+.09;
        [[.05,0],[-.04,.04],[0,-.05]].forEach(o=>
          add(3,[.03,.2,.03],[Math.cos(s.a)*ar+o[0],ay,Math.sin(s.a)*ar+o[1]],wawn,
              {rot:{z:(o[0]+o[1])>0?.2:-.15}}));
      });
    }

    if(type==='watermelon'){
      const vine='#4e821f',wl='#5fae33',fl='#f4c531';
      add(1,[.09,.22,.09],[0,.11,0],vine);
      add(1,[.2,.05,.15],[-.13,.2,0],wl,{rot:{z:.4}});
      add(1,[.2,.05,.15],[.13,.2,0],wl,{rot:{z:-.4}});
      add(2,[.55,.07,.07],[.3,.055,0],vine);
      add(2,[.4,.06,.06],[Math.cos(2.1)*.22,.05,Math.sin(2.1)*.22],vine,{rot:{y:-2.1}});
      add(2,[.22,.05,.2],[.22,.1,.12],wl,{rot:{y:.5,z:.12}});
      add(2,[.22,.05,.2],[.42,.1,-.14],wl,{rot:{y:-.4,z:.1}});
      add(2,[.2,.05,.18],[Math.cos(2.1)*.4,.09,Math.sin(2.1)*.4],wl,{rot:{y:-2.1}});
      add(2,[.14,.04,.05],[.52,.08,.1],vine,{rot:{y:.8}});
      add(2,[.12,.12,.12],[.6,.13,0],fl,{until:3});
      add(2,[.06,.06,.06],[.6,.21,0],'#e8a12c',{until:3});
      add(3,[.62,.56,.62],[.44,.3,0],null,{tex:'melon'});
      add(3,[.2,.06,.06],[.06,.06,0],vine);
      add(3,[.2,.05,.18],[.16,.1,.2],wl,{rot:{y:.9,z:.15}});
      add(3,[.18,.04,.16],[.2,.09,-.18],wl,{rot:{y:-.7}});
    }
    return P;
  },

  build(type){
    const g=new THREE.Group();
    for(const p of this.parts(type)){
      const geo=new THREE.BoxGeometry(p.size[0],p.size[1],p.size[2]);
      const mat=p.tex==='melon'?this.melonMat():this.mat(p.color);
      const m=new THREE.Mesh(geo,mat);
      m.position.set(p.pos[0],p.pos[1],p.pos[2]);
      if(p.rot){
        m.rotation.order=p.rot.order||'XYZ';
        m.rotation.set(p.rot.x||0,p.rot.y||0,p.rot.z||0);
      }
      m.userData={phase:p.phase,until:p.until};
      g.add(m);
    }
    g.scale.setScalar(0.8);
    return g;
  },

  setStage(g,stage){
    for(const m of g.children){
      const u=m.userData;
      m.visible=u.phase<=stage&&(!u.until||stage<u.until);
    }
  },
};

/* ---------- sistem farming ---------- */
const Farming={
  list:[],map:new Map(),pending:[],
  /* blok ladang yang diketahui (worldgen atau hasil cangkul) */
  farmBlocks:new Map(),
  SAVE_KEY:'forecraft_farm_v1',
  MAX:80,
  saveT:10,restoreT:1,

  CROPS:{
    wheat:{seed:'seed_wheat',crop:'wheat',grow:[25,40]},
    carrot:{seed:'seed_carrot',crop:'carrot',grow:[22,36]},
    cabbage:{seed:'seed_cabbage',crop:'cabbage',grow:[26,42]},
    tomato:{seed:'seed_tomato',crop:'tomato',grow:[28,45]},
    watermelon:{seed:'seed_watermelon',crop:'watermelon',grow:[32,52]},
  },
  SEED_TO_CROP:{
    seed_wheat:'wheat',seed_carrot:'carrot',seed_cabbage:'cabbage',
    seed_tomato:'tomato',seed_watermelon:'watermelon',
  },
  SEEDS:['seed_wheat','seed_carrot','seed_cabbage','seed_tomato','seed_watermelon'],

  key:(x,y,z)=>x+','+y+','+z,

  randomSeed(){return this.SEEDS[(Math.random()*this.SEEDS.length)|0];},

  /* ---------- registrasi blok ladang ---------- */
  registerFarm(x,y,z){this.farmBlocks.set(this.key(x,y,z),{x,y,z});},
  unregisterFarm(x,y,z){this.farmBlocks.delete(this.key(x,y,z));},

  /* panen oleh NPC: hasil masuk tas rekan bila mungkin, selain itu jatuh */
  harvestByNpc(p,n){
    const def=this.CROPS[p.type];if(!def)return;
    const green=n&&n.role&&n.role.skill&&n.role.skill.id==='green';
    const cropN=1+(Math.random()<0.5?1:0)+(green?1:0);
    const seedN=1+(Math.random()<0.4?1:0);
    const pos=new THREE.Vector3(p.x+0.5,p.y+1.1,p.z+0.5);
    this.remove(p,false);
    const give=(id,cnt)=>{
      if(cnt<=0)return;
      if(n&&typeof NPCS!=='undefined'&&NPCS.isTeam(n)&&NPCS.bagAdd&&NPCS.bagAdd(n,id,cnt))return;
      if(typeof World!=='undefined')World.dropItem(pos.x,pos.y,pos.z,id,cnt);
    };
    give(def.crop,cropN);
    give(def.seed,seedN);
    FX.debris(pos,0x9fe88a,5,1.6);
    if(typeof Sfx!=='undefined'&&Sfx.eat)Sfx.eat();
  },

  /* ---------- bangun mesh tanaman ---------- */
  makeMesh(p){
    const g=CropModels.build(p.type);
    g.position.set(p.x+0.5,p.y+1,p.z+0.5);
    g.rotation.y=((p.x*7+p.z*13)%8)/8*Math.PI*2;
    CropModels.setStage(g,p.stage);
    return g;
  },

  /* ---------- tanam ---------- */
  plant(x,y,z,type){
    const k=this.key(x,y,z);
    if(this.map.has(k))return false;
    if(this.list.length>=this.MAX){UI.toast('🌱 Ladang terlalu besar');return false;}
    if(!this.CROPS[type])return false;
    if(World.getBlock(x,y,z)!==B.FARM)return false;
    const p={x,y,z,type,stage:1,t:0,mesh:null};
    p.mesh=this.makeMesh(p);
    Game.scene.add(p.mesh);
    this.list.push(p);this.map.set(k,p);
    FX.debris(new THREE.Vector3(x+0.5,y+1.1,z+0.5),0x7dff9d,4,1.4);
    this.save();
    return true;
  },

  /* ---------- panen ---------- */
  harvest(p){
    const def=this.CROPS[p.type];if(!def)return;
    const pos=new THREE.Vector3(p.x+0.5,p.y+1.2,p.z+0.5);
    FX.spawnDrop(pos,def.crop,1+(Math.random()<0.5?1:0));
    FX.spawnDrop(pos.clone().add(new THREE.Vector3(0.2,0.1,0)),def.seed,1+(Math.random()<0.4?1:0));
    FX.debris(pos,0x9fe88a,8,2);
    Player.addXP(2);
    if(typeof Sfx!=='undefined'&&Sfx.eat)Sfx.eat();
    this.remove(p,false);
    this.save();
  },

  remove(p,dropSeed){
    const i=this.list.indexOf(p);
    if(i>=0)this.list.splice(i,1);
    this.map.delete(this.key(p.x,p.y,p.z));
    if(p.mesh){Game.scene.remove(p.mesh);p.mesh=null;}
    if(dropSeed&&this.CROPS[p.type]){
      FX.spawnDrop(new THREE.Vector3(p.x+0.5,p.y+1.1,p.z+0.5),
        this.CROPS[p.type].seed,1);
    }
  },

  /* dipanggil saat blok ladang dihancurkan/diubah */
  removeAt(x,y,z,dropSeed){
    const p=this.map.get(this.key(x,y,z));
    if(p)this.remove(p,dropSeed);
  },

  /* ---------- aksi pemain: cangkul / tanam / panen ---------- */
  tryUse(player){
    const fx=Math.sin(player.facing),fz=Math.cos(player.facing);
    const bx=Math.floor(player.pos.x+fx*1.15);
    const bz=Math.floor(player.pos.z+fz*1.15);
    let by=World.topY(bx,bz)-1;
    if(by<0||by>=CFG.WORLD_H)return false;
    if(Math.abs(by-Math.floor(player.pos.y))>1)return false;
    const k=this.key(bx,by,bz);
    const p=this.map.get(k);

    /* panen dulu bila sudah matang */
    if(p&&p.stage===3){this.harvest(p);return true;}

    const slot=RPG.hotbar[RPG.sel];
    const id=slot&&slot.id;
    const block=World.getBlock(bx,by,bz);

    /* cangkul: rumput/tanah -> ladang */
    if(id==='hoe'){
      if(block===B.GRASS||block===B.DIRT){
        /* buang tanaman liar di atas blok yang dicangkul */
        const cx=Math.floor(bx/16),cz=Math.floor(bz/16);
        const c=World.getChunk(cx,cz),lx=bx-cx*16,lz=bz-cz*16;
        c.plants=c.plants.filter(p=>!(p.x===lx&&p.z===lz&&p.y>=by));
        World.setBlock(bx,by,bz,B.FARM);
        FX.debris(new THREE.Vector3(bx+0.5,by+1,bz+0.5),0x6f4a26,8,2);
        if(typeof Sfx!=='undefined'&&Sfx.chop)Sfx.chop();
        /* kadang menemukan benih liar saat mencangkul */
        if(Math.random()<0.25){
          FX.spawnDrop(new THREE.Vector3(bx+0.5,by+1.1,bz+0.5),this.randomSeed(),1);
        }
        this.save();
        return true;
      }
      if(block===B.FARM){UI.toast('⛏️ Ladang sudah siap — pilih benih');return true;}
      return false;
    }

    /* benih: tanam di ladang kosong */
    if(id&&this.SEED_TO_CROP[id]){
      if(block===B.FARM&&!p){
        if(this.plant(bx,by,bz,this.SEED_TO_CROP[id])){
          slot.n--;if(slot.n<=0)RPG.hotbar[RPG.sel]=null;
          UI.renderHotbar();
          return true;
        }
      }else if(p&&p.stage<3){
        UI.toast('🌿 Tanaman masih tumbuh');return true;
      }
      return false;
    }

    return false;
  },

  /* ---------- update pertumbuhan ---------- */
  update(dt,pp){
    this.saveT-=dt;
    if(this.saveT<=0){this.saveT=12;this.save();}
    this.restoreT-=dt;
    if(this.restoreT<=0){this.restoreT=1;this.processRestore();}

    for(let i=this.list.length-1;i>=0;i--){
      const p=this.list[i];
      /* ladang hilang -> tanaman hilang */
      if(World.getBlock(p.x,p.y,p.z)!==B.FARM){
        this.remove(p,true);continue;
      }
      /* tumbuh */
      if(p.stage<3){
        p.t+=dt;
        const need=this.CROPS[p.type].grow[p.stage-1];
        if(p.t>=need){
          p.stage++;p.t=0;
          if(p.mesh)CropModels.setStage(p.mesh,p.stage);
          FX.debris(new THREE.Vector3(p.x+0.5,p.y+1.1,p.z+0.5),0x7dff9d,3,1.2);
        }
      }
      /* distance culling mesh */
      if(pp){
        const d=Math.hypot(p.x+0.5-pp.x,p.z+0.5-pp.z);
        if(d>64&&p.mesh){Game.scene.remove(p.mesh);p.mesh=null;}
        else if(d<56&&!p.mesh){p.mesh=this.makeMesh(p);Game.scene.add(p.mesh);}
      }
    }
  },

  /* ---------- save / load ---------- */
  save(){
    try{
      const data=this.list.map(p=>({x:p.x,y:p.y,z:p.z,type:p.type,stage:p.stage,t:p.t}));
      localStorage.setItem(this.SAVE_KEY,JSON.stringify(data));
    }catch(e){}
  },

  load(){
    this.clearAll();
    try{
      const arr=JSON.parse(localStorage.getItem(this.SAVE_KEY)||'[]');
      if(Array.isArray(arr)){
        this.pending=arr.filter(d=>d&&this.CROPS[d.type]&&isFinite(d.x)&&isFinite(d.y)&&isFinite(d.z));
      }
    }catch(e){this.pending=[];}
  },

  clearAll(){
    for(let i=this.list.length-1;i>=0;i--)this.remove(this.list[i],false);
    this.pending=[];
    this.farmBlocks.clear();
  },

  clear(){
    try{localStorage.removeItem(this.SAVE_KEY);}catch(e){}
    this.clearAll();
  },

  processRestore(){
    if(!this.pending||!this.pending.length)return;
    const still=[];
    for(const d of this.pending){
      const cx=Math.floor(d.x/16),cz=Math.floor(d.z/16);
      if(!World.chunks.has(World.key(cx,cz))){still.push(d);continue;}
      /* kembalikan blok ladang + tanaman */
      if(World.getBlock(d.x,d.y,d.z)!==B.FARM)World.setBlock(d.x,d.y,d.z,B.FARM);
      const stage=clamp(Math.floor(d.stage)||1,1,3);
      const p={x:d.x,y:d.y,z:d.z,type:d.type,stage,t:Math.max(0,d.t||0),mesh:null};
      if(Player.pos.distanceTo(new THREE.Vector3(p.x+0.5,p.y,p.z+0.5))<56){
        p.mesh=this.makeMesh(p);Game.scene.add(p.mesh);
      }
      this.list.push(p);this.map.set(this.key(p.x,p.y,p.z),p);
    }
    this.pending=still;
  },
};
window.Farming=Farming;
