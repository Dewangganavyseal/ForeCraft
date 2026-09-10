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
  /* ---------- LABEL LEVEL ----------
     Tekstur angka level dibuat SEKALI per level lalu dipakai ulang (levels 1..50
     berarti maksimum 50 tekstur kecil untuk seluruh permainan). Tanpa cache,
     setiap mob akan membuat canvas+tekstur sendiri tiap kali bar-nya muncul —
     itu membebani GPU & memori di perangkat mobile.
     Boss diberi penanda mahkota 👑 agar pemain tahu ia menghadapi boss agung,
     bukan sekadar penjaga biasa di dungeon. */
  _lvlTex:{},
  lvlTexture(lvl,isBoss){
    const k=(isBoss?'B':'L')+lvl;
    if(this._lvlTex[k])return this._lvlTex[k];
    const cv=document.createElement('canvas');cv.width=isBoss?80:64;cv.height=32;
    const c=cv.getContext('2d');
    c.textAlign='center';c.textBaseline='middle';
    c.lineWidth=5;c.strokeStyle='rgba(0,0,0,0.85)';
    if(isBoss){
      /* Gambar mahkota vektor 2D langsung di canvas — TIDAK memakai string emoji 👑
         karena font monospace di Android Canvas 2D tidak punya glif 👑 sehingga
         dirender sebagai tanda tanya (?) */
      const cx=16,cy=17,cw=18,ch=14;
      c.beginPath();
      c.moveTo(cx-cw/2,cy+ch/2);
      c.lineTo(cx+cw/2,cy+ch/2);
      c.lineTo(cx+cw/2,cy-ch/4);
      c.lineTo(cx+cw/4,cy+ch/8);
      c.lineTo(cx,cy-ch/2);
      c.lineTo(cx-cw/4,cy+ch/8);
      c.lineTo(cx-cw/2,cy-ch/4);
      c.closePath();
      c.fillStyle='#ff6bd6';
      c.fill();
      c.stroke();
      /* Angka level di sebelah kanan mahkota (angka murni tanpa emoji) */
      c.font='bold 20px monospace';
      const text=String(lvl);
      const tx=cx+cw/2+2+(cv.width-(cx+cw/2+2))/2;
      c.strokeText(text,tx,17);
      c.fillStyle='#ff6bd6';
      c.fillText(text,tx,17);
    }else{
      c.font='bold 22px monospace';
      const text=String(lvl);
      c.strokeText(text,cv.width/2,17);
      c.fillStyle='#ffd76b';
      c.fillText(text,cv.width/2,17);
    }
    const t=new THREE.CanvasTexture(cv);
    t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;
    this._lvlTex[k]=t;
    return t;
  },

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
    /* angka LEVEL di kiri bar: memberi tahu pemain apakah mob ini sepadan
       sebelum ia memutuskan bertarung. Materialnya dibuat per bar (tekstur
       bersama), sehingga tiap bar bisa menampilkan angka berbeda. */
    const lvl=new THREE.Mesh(
      new THREE.PlaneGeometry(0.42,0.21),
      new THREE.MeshBasicMaterial({transparent:true,depthTest:false,
        depthWrite:false,side:THREE.DoubleSide})
    );
    lvl.renderOrder=992;
    lvl.position.z=0.02;
    lvl.visible=false;
    g.add(lvl);
    g.userData={bg,fill,lvl,lvlNum:0};
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

  /* Pasang angka level di ujung kiri bar. lvl<=0 / undefined menyembunyikannya
     (mis. pet & ternak yang levelnya tidak relevan). */
  setLevel(b,w,lvl,isBoss){
    const ud=b.userData;
    if(!ud.lvl)return;
    if(!(lvl>0)){ud.lvl.visible=false;return;}
    ud.lvl.visible=true;
    const key=(isBoss?'B':'L')+lvl;
    if(ud.lvlNum!==key){
      ud.lvlNum=key;
      ud.lvl.material.map=this.lvlTexture(lvl,isBoss);
      ud.lvl.material.needsUpdate=true;
      if(isBoss)ud.lvl.scale.set(1.25,1,1);
      else ud.lvl.scale.set(1,1,1);
    }
    ud.lvl.position.x=-w/2-(isBoss?0.32:0.26);
  },

  show(key,pos,hp,maxhp,width,heightAbove,lvl,isBoss){
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
    this.setLevel(b,width,lvl,isBoss);
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
        const isBoss=!!(m.boss||m.dboss);
        const w=isBoss?1.9:1.0;
        /* level ditampilkan untuk mob LIAR & penjaga dungeon; pet tidak (level
           pet punya tampilannya sendiri di kartu pet).
           TINGGI BAR mengikuti pembesaran tubuh (m.sizeMul, diisi make()):
           tanpa ini bar boss menempel di dada, bukan di atas kepala. */
        this.show(key,m.pos,m.hp,m.maxhp,w,h*(m.sizeMul||1)+0.55,m.pet?0:m.lvl,isBoss);
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
