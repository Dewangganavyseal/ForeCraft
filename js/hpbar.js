'use strict';
/* =============================================================================
   HPBARS — bar HP kecil di atas mob & NPC
   -----------------------------------------------------------------------------
   - Muncul saat entity terkena serangan atau sedang bertarung.
   - Hilang saat sudah tidak dalam mode bertarung.
   - Bar dibuat billboard (selalu menghadap kamera), depthTest dimatikan agar
     tetap terlihat sedikit di atas model tanpa tertutup badan sendiri.
   ============================================================================= */
const HPBars={
  group:null,
  bars:new Map(),
  _seq:0,

  init(){
    if(typeof THREE==='undefined'||typeof Game==='undefined'||!Game.scene)return false;
    if(!this.group){
      this.group=new THREE.Group();
      this.group.name='hp-bars';
    }
    if(this.group.parent!==Game.scene)Game.scene.add(this.group);
    return true;
  },

  makeBar(){
    const g=new THREE.Group();
    const bg=new THREE.Mesh(
      new THREE.PlaneGeometry(1,0.16),
      new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.5,
        depthTest:false,depthWrite:false,side:THREE.DoubleSide})
    );
    const fill=new THREE.Mesh(
      new THREE.PlaneGeometry(1,0.10),
      new THREE.MeshBasicMaterial({color:0x58e05a,transparent:true,opacity:0.95,
        depthTest:false,depthWrite:false,side:THREE.DoubleSide})
    );
    bg.renderOrder=990;
    fill.renderOrder=991;
    fill.position.z=0.01;
    g.add(bg);
    g.add(fill);
    g.userData={bg,fill};
    return g;
  },

  keyFor(prefix,obj){
    if(obj.id!==undefined&&obj.id!==null)return prefix+':id:'+obj.id;
    if(!obj.hpId)obj.hpId=prefix+':seq:'+(++this._seq);
    return obj.hpId;
  },

  layout(b,w,ratio){
    const ud=b.userData;
    ud.bg.scale.set(w,1,1);
    const fw=Math.max(0.001,w*ratio);
    ud.fill.scale.set(fw,1,1);
    ud.fill.position.x=-w/2+fw/2;
    /* hijau saat penuh -> merah saat kritis */
    ud.fill.material.color.setHSL(0.33*clamp(ratio,0,1),0.85,0.5);
  },

  show(key,pos,hp,maxhp,width,heightAbove){
    if(!this.init())return;
    let b=this.bars.get(key);
    if(!b){
      b=this.makeBar();
      this.bars.set(key,b);
      this.group.add(b);
    }
    b.visible=true;
    b.position.set(pos.x,pos.y+heightAbove,pos.z);
    if(typeof Cam!=='undefined'&&Cam.cam)b.quaternion.copy(Cam.cam.quaternion);
    const max=Math.max(1,maxhp);
    this.layout(b,width,clamp(hp/max,0,1));
  },

  hide(key){
    const b=this.bars.get(key);
    if(b)b.visible=false;
  },

  clear(){
    for(const b of this.bars.values()){
      if(b.parent)b.parent.remove(b);
    }
    this.bars.clear();
  },

  /* =========================================================================
     UPDATE
     -------------------------------------------------------------------------
     Mob:
     - tampil saat flash kena hit, state chase, punya foe NPC, alert, atau
       baru saja diserang (hpT).
     - hilang saat kembali wander dan tidak baru saja diserang.

     NPC:
     - tampil saat flash kena hit, punya target, retreat, atau baru diserang.
     ========================================================================= */
  update(dt){
    if(typeof Game==='undefined'||!Game.started||Game.menuMode)return;
    if(!this.init())return;

    const seen=new Set();

    if(typeof Monsters!=='undefined'&&Monsters.list){
      for(const m of Monsters.list){
        if(m.hpT>0)m.hpT-=dt;
        const key=this.keyFor('mob',m);
        if(m.dead){this.hide(key);continue;}

        const inCombat=
          m.flash>0 ||
          m.state==='chase' ||
          (m.foe&&!m.foe.dead) ||
          (m.alert>0) ||
          (m.hpT>0&&m.hp<m.maxhp);

        if(!inCombat){this.hide(key);continue;}
        seen.add(key);

        const h=(typeof meshHeight==='function')?meshHeight(m.type):1.2;
        const w=m.boss?1.9:1.0;
        this.show(key,m.pos,m.hp,m.maxhp,w,h+0.55);
      }
    }

    if(typeof NPCS!=='undefined'&&NPCS.list){
      for(const n of NPCS.list){
        if(n.hpT>0)n.hpT-=dt;
        const key=this.keyFor('npc',n);
        if(n.dead){this.hide(key);continue;}

        const inCombat=
          n.flash>0 ||
          (n.target&&!n.target.dead) ||
          n.retreat ||
          (n.hpT>0&&n.hp<n.maxhp);

        if(!inCombat){this.hide(key);continue;}
        seen.add(key);

        /* NPC raksasa / entitas besar diberi bar lebih lebar */
        const big=n.role&&(n.role.id==='stonegiant'||n.role.id==='lionknight');
        this.show(key,n.pos,n.hp,n.maxhp,big?1.5:0.9,2.35);
      }
    }

    /* sembunyikan bar milik entity yang sudah hilang / tidak terlihat */
    for(const [k,b] of this.bars){
      if(!seen.has(k))b.visible=false;
    }
  },
};
window.HPBars=HPBars;
