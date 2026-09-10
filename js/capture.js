'use strict';
/* =============================================================================
   CAPTURE — menangkap, memelihara, dan menunggangi monster
   -----------------------------------------------------------------------------
   - Mob apa pun (termasuk naga) bisa ditangkap saat HP <= 20%.
   - Pemain harus memegang Tali; tombol "Tangkap" muncul di atas mob.
   - Minigame tarik-tarikan: stamina monster harus dihabiskan, tetapi
     ketegangan tali tidak boleh penuh atau tali putus.
   - Hasil tangkapan masuk slot khusus mob di tas (bukan item biasa).
   - Hanya 1 mob yang bisa deploy. Mob deploy bisa bertarung saat tidak
     ditunggangi.
   - Sadel dipasang ke mob; setelah itu bisa dinaiki lewat G / tombol aksi.
   ============================================================================= */

const PET_EMOJI={slime:'🟢',boar:'🐗',golem:'🗿',wolf:'🐺',rabbit:'🐰',
  scorpion:'🦂',lizard:'🦎',dragon:'🐉',cow:'🐄',horse:'🐎',
  kumbang:'🪲',yeti:'❄️',semut:'🐜'};

const PET_FOOD={slime:'berry',boar:'carrot',golem:'stone',wolf:'meat',
  rabbit:'carrot',scorpion:'meat',lizard:'meat',cow:'wheat',horse:'wheat',
  dragon:'cmeat',kumbang:'fiber',yeti:'cmeat',semut:'meat',reaper:'soul_shard'};

/* kesulitan tangkap: yeti sekuat golem, semut selincah serigala.
   reaper (penjaga dungeon) paling sulit setelah naga. */
const CATCH_DIFF={slime:65,rabbit:50,boar:125,cow:50,horse:70,wolf:160,
  scorpion:180,lizard:220,golem:320,dragon:520,
  kumbang:240,yeti:300,semut:150,reaper:360};

/* kecepatan kabur per tipe saat minigame; naga & kuda jauh lebih sulit */
const CATCH_FLEE={slime:0.8,rabbit:1.4,boar:1.25,cow:1.0,horse:1.7,wolf:1.65,
  scorpion:1.35,lizard:1.5,golem:0.85,dragon:2.3,
  kumbang:1.2,yeti:1.0,semut:1.8,reaper:1.45};

/* panjang maksimum tali saat tarik-tarikan.
   Dikurangi 11 -> 8 supaya mob tidak menjauh terlalu jauh saat meronta;
   zona tegang (softLen = 82%) & batas putus (+4) mengikuti otomatis. */
const CATCH_MAX_LEN=8;

const Capture={
  pet:null,
  riding:false,
  mounting:false,       // animasi lompat naik ke punggung sedang berjalan
  dismounting:false,    // animasi lompat turun sedang berjalan
  jumpQ:false,
  active:null,          // minigame tangkap
  deployedSlot:-1,
  _uid:0,
  _init:false,
  _pendingDeploy:-1,
  _pendingT:0,
  _teamT:0,
  /* Pengali ukuran PET yang berasal dari mini boss, terhadap ukuran alami
     modelnya. 1.18 = sedikit lebih besar dari mob biasa (1.0) tapi jauh di
     bawah skala boss (1.75+). Lihat catatan di deploy(). */
  PET_BOSS_SCALE:1.18,

  /* ---------- init DOM & rope ---------- */
  init(){
    if(this._init)return;
    this._init=true;

    const style=document.createElement('style');
    style.textContent=`
      #catchbtn{position:fixed;z-index:85;transform:translate(-50%,-100%);
        padding:7px 12px;border-radius:10px;border:2px solid #ffd24d;
        background:rgba(20,16,10,.86);color:#ffd24d;font-weight:700;
        font-size:14px;pointer-events:auto;cursor:pointer;display:none;
        text-shadow:0 1px 2px #000;box-shadow:0 2px 10px rgba(0,0,0,.45);}
      #catchbtn:active{transform:translate(-50%,-100%) scale(.95);}
      #catch-ui{position:fixed;left:50%;bottom:18%;transform:translateX(-50%);
        z-index:86;width:min(420px,86vw);padding:10px 12px;border-radius:14px;
        background:rgba(12,10,8,.88);border:2px solid #c9b98a;color:#fff;
        display:none;pointer-events:none;font-size:13px;}
      #catch-ui .ct{font-weight:700;text-align:center;margin-bottom:6px;color:#ffd24d;}
      #catch-ui .bar{height:12px;border-radius:7px;overflow:hidden;background:#222;
        border:1px solid rgba(255,255,255,.25);margin:4px 0 8px;}
      #catch-ui .bar i{display:block;height:100%;width:100%;}
      #catch-stam-fill{background:linear-gradient(90deg,#69d26a,#b8ff8a);}
      #catch-tension-fill{background:linear-gradient(90deg,#ffd24d,#ff5a35);}
      #bag-mobs{display:grid;grid-template-columns:1fr;gap:8px;margin-top:8px;}
      #bag-layout{display:flex;gap:10px;align-items:stretch;}
      #bag-menu{display:flex;flex-direction:column;gap:8px;width:72px;flex:0 0 auto;}
      .bag-menu-btn{flex:0 0 auto;padding:10px 6px;border-radius:12px;cursor:pointer;
        border:2px solid rgba(255,255,255,.16);background:rgba(255,255,255,.05);
        color:#d8e8d0;font-weight:700;font-size:12px;line-height:1.3;}
      .bag-menu-btn.active{border-color:#ffd24d;background:rgba(255,210,77,.12);color:#ffd24d;}
      #bag-pages{flex:1 1 auto;min-width:0;}
      @media (max-width:640px){
        #bag-layout{flex-direction:row;}
        #bag-menu{width:58px;}
        .bag-menu-btn{font-size:10px;padding:8px 4px;}
      }
      #bag-mobs{display:grid;grid-template-columns:1fr;gap:10px;margin-top:8px;}
      .pet-card{position:relative;overflow:hidden;border-radius:14px;padding:10px;
        border:2px solid rgba(140,200,120,.24);
        background:linear-gradient(180deg,rgba(32,44,30,.50),rgba(12,18,12,.72));
        box-shadow:0 6px 18px rgba(0,0,0,.28);}
      .pet-card.active{border-color:#ffd24d;box-shadow:0 0 18px rgba(255,210,77,.18);}
      .pc-head{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
      .pc-ico{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;
        justify-content:center;font-size:27px;background:rgba(255,255,255,.07);
        border:1px solid rgba(255,255,255,.14);flex:0 0 auto;}
      .pc-title{flex:1;min-width:0;line-height:1.25;}
      .pc-title b{font-size:14px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .pc-stars{color:#ffd24d;font-size:12px;letter-spacing:1px;}
      .pc-lv{flex:0 0 auto;padding:5px 8px;border-radius:10px;font-weight:800;font-size:12px;
        background:rgba(255,210,77,.12);border:1px solid rgba(255,210,77,.4);color:#ffd24d;}
      .pc-bars{display:grid;gap:6px;margin-bottom:8px;}
      .pc-bar{position:relative;height:16px;border-radius:8px;overflow:hidden;
        background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.14);}
      .pc-bar i{position:absolute;inset:0;width:0;display:block;}
      .pc-bar.hp i{background:linear-gradient(90deg,#ff5d5d,#ff9d6b);}
      .pc-bar.xp i{background:linear-gradient(90deg,#56c8ff,#8fe0ff);}
      .pc-bar span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
        font-size:10px;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.8);}
      .pc-stats{display:flex;flex-wrap:wrap;gap:6px;font-size:11px;opacity:.95;margin-bottom:8px;}
      .pc-chip{padding:3px 7px;border-radius:8px;background:rgba(255,255,255,.07);
        border:1px solid rgba(255,255,255,.12);}
      .pc-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;}
      .pc-actions button{font-size:11px;padding:7px 6px;border-radius:10px;cursor:pointer;
        border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;}
      .pc-actions button.primary{border-color:rgba(255,210,77,.55);background:rgba(255,210,77,.14);color:#ffd24d;}
      .pc-actions button:active{transform:scale(.97);}
      .pet-empty{padding:14px;border:2px dashed rgba(255,255,255,.16);border-radius:14px;
        color:rgba(255,255,255,.72);font-size:12px;text-align:center;}
      .tmate.pet{border-color:rgba(127,216,255,.55);}
      .tmate.pet:hover{border-color:#7fd8ff;}
      @media (max-width:560px){
        .pc-actions{grid-template-columns:repeat(2,minmax(0,1fr));}
      }
    `;
    document.head.appendChild(style);

    this.btn=document.createElement('button');
    this.btn.id='catchbtn';
    this.btn.textContent='🪢 Tangkap';
    this.btn.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      if(this._btnTarget)this.start(this._btnTarget);
    });
    document.body.appendChild(this.btn);

    this.ui=document.createElement('div');
    this.ui.id='catch-ui';
    this.ui.innerHTML=`
      <div class="ct">🪢 Tarik! Jangan sampai tali putus!</div>
      <div>Stamina Monster</div>
      <div class="bar"><i id="catch-stam-fill"></i></div>
      <div>Ketegangan Tali</div>
      <div class="bar"><i id="catch-tension-fill"></i></div>
    `;
    document.body.appendChild(this.ui);
  },

  ensureScene(){
    if(typeof Game==='undefined'||!Game.scene)return;
    if(!this.ropeLine){
      const geo=new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),new THREE.Vector3()
      ]);
      const mat=new THREE.LineBasicMaterial({color:0x7dff6a,transparent:true,opacity:0.95});
      this.ropeLine=new THREE.Line(geo,mat);
      this.ropeLine.frustumCulled=false;
      this.ropeLine.visible=false;
    }
    if(this.ropeLine.parent!==Game.scene)Game.scene.add(this.ropeLine);
  },

  /* ---------- skill catch ----------
     Nilai per-rank dibagi mengikuti max rank baru (lihat catatan di SKILLS,
     config.js): catch_pow 3×20% → 6×10%, catch_rope 3×15% → 6×7.5%,
     catch_calm 2×15% → 4×7.5%. Total di rank maksimum tetap sama. */
  sk(id){return (typeof RPG!=='undefined'&&RPG.skillVal)?RPG.skillVal(id):0;},
  canCatch(){return true;},
  drainMult(){
    let v=1+0.10*this.sk('catch_pow');
    if(this.sk('catcher')>0)v+=0.10;
    if(this.sk('catch_master')>0)v+=0.25;
    return v;
  },
  tensionMult(){
    let v=Math.max(0.25,1-0.075*this.sk('catch_rope'));
    if(this.sk('catcher')>0)v*=0.9;
    if(this.sk('catch_master')>0)v*=0.9;
    return v;
  },
  calmMult(){return Math.max(0.4,1-0.075*this.sk('catch_calm'));},

  mobName(type){return (typeof MOB_NAME!=='undefined'&&MOB_NAME[type])?MOB_NAME[type]:type;},
  petFood(type){return PET_FOOD[type]||'bread';},

  /* ---------- Cari mob yang bisa ditangkap ---------- */
  catchable(){
    if(!this.canCatch()||this.active||this.riding)return null;
    if(typeof UI!=='undefined'&&UI.open)return null;
    if(typeof Chat!=='undefined'&&Chat.active)return null;
    if(typeof Furni!=='undefined'&&Furni.placing)return null;
    const slot=RPG.hotbar[RPG.sel];
    if(!slot||slot.id!=='rope')return null;
    let best=null,bd=10;
    for(const m of Monsters.list){
      if(m.dead||m.pet||m.catchFailed||m.catchActive)continue;
      if(m.noCatch||m.type==='kelabang'||m.type==='kelabang_part')continue; // kelabang tidak bisa ditangkap
      if(m.hp/m.maxhp>0.2001)continue;
      const d=m.pos.distanceTo(Player.pos);
      if(d<bd){best=m;bd=d;}
    }
    return best;
  },

  /* ---------- mulai minigame ---------- */
  start(m){
    if(this.active)return;
    if(!m||m.dead)return;
    if(m.noCatch||m.type==='kelabang'||m.type==='kelabang_part'){UI.toast('🚫 Kelabang tidak bisa ditangkap!');return;}
    if(!this.canCatch()){UI.toast('🪢 Pelajari skill Pawang Pemula dulu!');return;}
    if(RPG.mobSlots.findIndex(s=>!s)<0){UI.toast('🐾 Slot mob penuh — jual/lepaskan dulu');return;}
    const slot=RPG.hotbar[RPG.sel];
    if(!slot||slot.id!=='rope'){UI.toast('🪢 Pegang Tali di hotbar!');return;}
    /* Tali sekali pakai: langsung dikonsumsi saat minigame dimulai.
       Baik berhasil maupun putus, tali tetap habis. */
    slot.n--;
    if(slot.n<=0)RPG.hotbar[RPG.sel]=null;
    if(typeof UI!=='undefined'&&UI.markInvDirty)UI.markInvDirty();

    const base=CATCH_DIFF[m.type]||70;
    const diff=Math.round(base*(m.boss?2.3:1));
    this.active={m,stam:diff,max:diff,tension:0,t:0,surge:0,
      surgeT:rand(m.type==='dragon'?1.6:2.8,m.type==='dragon'?3.0:4.8)};
    m.catchActive=true;
    m.state='chase';
    m.alert=Math.max(m.alert||0,8);
    m.windup=0;
    m.foe=null;
    /* langsung berlari menjauh dari pemain begitu ditangkap dimulai */
    const away=new THREE.Vector3().subVectors(m.pos,Player.pos).setY(0);
    const ang=Math.atan2(away.x,away.z);
    const burst=(Monsters.TYPES[m.type]?Monsters.TYPES[m.type].speed:3)*(CATCH_FLEE[m.type]||1)*1.1;
    m.mesh.rotation.y=ang;
    m.vel.x=Math.sin(ang)*burst;
    m.vel.z=Math.cos(ang)*burst;
    this.ui.style.display='block';
    this.btn.style.display='none';
    UI.toast(`🪢 ${this.mobName(m.type)} melawan! Tarik saat ia lelah.`);
    if(typeof Sfx!=='undefined'&&Sfx.click)Sfx.click();
  },

  /* ---------- update tombol tangkap ---------- */
  updateBtn(){
    this._btnTarget=null;
    if(!this.btn)return;
    const m=this.catchable();
    if(!m||typeof Cam==='undefined'||!Cam.cam){this.btn.style.display='none';return;}
    const h=(typeof meshHeight==='function')?meshHeight(m.type):1;
    const v=m.pos.clone().add(new THREE.Vector3(0,h+0.9,0)).project(Cam.cam);
    if(v.z>1){this.btn.style.display='none';return;}
    this._btnTarget=m;
    this.btn.style.display='block';
    this.btn.style.left=((v.x*0.5+0.5)*window.innerWidth)+'px';
    this.btn.style.top=((-v.y*0.5+0.5)*window.innerHeight)+'px';
  },

  /* ---------- minigame ---------- */
  updateActive(dt){
    const a=this.active;
    if(!a)return;
    const m=a.m;
    if(!m||m.dead){this.failCatch('Monster tidak valid');return;}

    let dist=m.pos.distanceTo(Player.pos);
    if(dist>CATCH_MAX_LEN+4){this.breakRope();return;}

    /* ---------- batas panjang tali ----------
       Mob tetap berlari, tetapi pada jarak maksimum ia tertahan. */
    if(dist>CATCH_MAX_LEN){
      const hold=new THREE.Vector3().subVectors(m.pos,Player.pos).setY(0);
      hold.multiplyScalar(CATCH_MAX_LEN/Math.max(0.001,hold.length()));
      m.pos.copy(Player.pos).add(hold);
      m.vel.x*=0.15;
      m.vel.z*=0.15;
      dist=m.pos.distanceTo(Player.pos);
    }

    const away=new THREE.Vector3().subVectors(Player.pos,m.pos).setY(0).normalize();
    const toward=away.clone().negate();
    const mv=Input.moveVec();
    const moving=(mv.x!==0||mv.z!==0);
    const pull=moving&&((mv.x*away.x+mv.z*away.z)>0.25);
    const approach=moving&&((mv.x*toward.x+mv.z*toward.z)>0.25);

    /* ---------- surge: mob tiba-tiba meronta lebih kuat ---------- */
    a.surgeT-=dt;
    if(a.surgeT<=0){
      const dragon=m.type==='dragon'||m.boss;
      a.surge=dragon?0.95:0.6;
      a.surgeT=dragon?rand(1.5,2.8):rand(2.8,5.2);
      if(dragon&&Math.random()<0.5)FX.text(m.pos.clone().add(new THREE.Vector3(0,2.6,0)),'🐉 meronta!','#ff8a5a');
    }
    if(a.surge>0)a.surge-=dt;

    /* ketegangan naik saat tali meregang / pemain menarik menjauh.
       Mendekati monster akan mengurangi ketegangan. */
    let dT=-7.5*dt;
    const softLen=CATCH_MAX_LEN*0.82;
    if(dist>softLen)dT+=(dist-softLen)*22*dt;
    if(pull)dT+=42*dt;
    if(pull&&dist>3.6)dT+=18*dt;
    if(dist>=CATCH_MAX_LEN-0.35)dT+=16*dt;
    if(a.surge>0)dT+=20*dt;
    if(approach)dT-=30*dt;
    /* patch keseimbangan: kenaikan tension dikurangi 20% */
    if(dT>0)dT*=0.8;
    a.tension=clamp(a.tension+dT*this.tensionMult(),0,100);

    /* stamina monster terkuras saat ditarik / meregang */
    let drain=0.7*this.drainMult();
    if(pull)drain+=(11+Math.min(34,m.maxhp*0.05))*this.drainMult();
    else if(dist>5.2)drain+=1.7*this.drainMult();
    /* terlalu dekat tanpa tarik: monster memulihkan stamina lebih cepat */
    if(dist<2.5&&!pull)drain=-7.5;
    a.stam=clamp(a.stam-drain*dt,0,a.max);

    a.t+=dt;

    if(a.tension>=100){this.breakRope();return;}
    if(a.stam<=0){this.success();return;}

    /* update UI */
    const stF=document.getElementById('catch-stam-fill');
    const tnF=document.getElementById('catch-tension-fill');
    if(stF)stF.style.width=(100*a.stam/a.max)+'%';
    if(tnF){
      tnF.style.width=a.tension+'%';
      tnF.style.background=a.tension>75?'#ff3b2a':a.tension>45?'#ffb347':'#ffd24d';
    }

    this.updateRope();
  },

  /* AI mob saat ditangkap: berhenti menyerang, lari menjauh dari pemain */
  catchAI(m,dt){
    if(!this.active||this.active.m!==m){m.catchActive=false;return;}
    /* arah kabur = dari pemain ke arah luar (menjauh) */
    const away=new THREE.Vector3().subVectors(m.pos,Player.pos).setY(0);
    const ang=Math.atan2(away.x,away.z);
    m.mesh.rotation.y=angLerp(m.mesh.rotation.y,ang,dt*6);

    const base=(Monsters.TYPES[m.type]?Monsters.TYPES[m.type].speed:3);
    const flee=CATCH_FLEE[m.type]||1.0;
    let spd=base*flee*0.82*this.calmMult();
    if(this.active.surge>0)spd*=m.type==='dragon'?1.85:1.4;

    m.vel.x=lerp(m.vel.x,Math.sin(ang)*spd,clamp(7*dt,0,1));
    m.vel.z=lerp(m.vel.z,Math.cos(ang)*spd,clamp(7*dt,0,1));
    m.state='chase';
  },

  updateRope(){
    this.ensureScene();
    if(!this.ropeLine)return;
    if(!this.active){this.ropeLine.visible=false;return;}
    const m=this.active.m;
    if(!m){this.ropeLine.visible=false;return;}
    const h=(typeof meshHeight==='function')?meshHeight(m.type):1;
    const p0=Player.pos.clone().add(new THREE.Vector3(0,1.15,0));
    const p1=m.pos.clone().add(new THREE.Vector3(0,h*0.55,0));
    const pos=this.ropeLine.geometry.attributes.position;
    pos.setXYZ(0,p0.x,p0.y,p0.z);
    pos.setXYZ(1,p1.x,p1.y,p1.z);
    pos.needsUpdate=true;
    const t=this.active.tension/100;
    this.ropeLine.material.color.setHSL(0.33*(1-t),0.95,0.55);
    this.ropeLine.visible=true;
  },

  breakRope(){
    const a=this.active;
    if(!a)return;
    const m=a.m;
    this.active=null;
    if(m){
      m.catchActive=false;
      m.catchFailed=true;
      m.alert=12;
      m.state='chase';
    }
    this.ui.style.display='none';
    this.updateRope();
    UI.toast('❌ Tali putus! Monster mengamuk dan tidak bisa ditangkap lagi.');
    if(typeof Sfx!=='undefined'&&Sfx.hit)Sfx.hit();
  },

  failCatch(msg){
    const a=this.active;
    if(!a)return;
    if(a.m)a.m.catchActive=false;
    this.active=null;
    this.ui.style.display='none';
    this.updateRope();
    if(msg)UI.toast(msg);
  },

  success(){
    const a=this.active;
    if(!a)return;
    const m=a.m;
    this.active=null;
    this.ui.style.display='none';
    this.updateRope();
    if(!m)return;

    const idx=RPG.mobSlots.findIndex(s=>!s);
    if(idx<0){
      m.catchActive=false;
      UI.toast('🐾 Slot mob penuh!');
      return;
    }

    /* ---------- generasi bintang & kesulitan acak ----------
       Semakin tinggi bintang, semakin tinggi stat pet. */
    let stars=this.rollStars(!!m.boss);
    const power=1+(stars-1)*0.22+rand(0,0.08)+(m.boss?0.25:0);
    /* Damage dasar mengikuti LEVEL mob yang ditangkap, sama seperti HP-nya
       (pet.maxhp diturunkan dari m.maxhp yang sudah berlevel). Tanpa pengali
       ini, menangkap kumbang Lv 50 di Tanah Merah menghasilkan pet ber-HP 800+
       tapi damage-nya masih 16 seperti kumbang Lv 1 — tebal tapi tak berguna.
       Yang dipakai tetap dmg DASAR tipe (bukan m.dmg) supaya pet dari mini boss
       tidak ikut membawa pengali boss 2.2x; bonus boss sudah ada di `power`. */
    const lm=(typeof Monsters.lvlStatMul==='function')?Monsters.lvlStatMul(m.lvl||1):1;
    const baseDmg=(Monsters.TYPES[m.type]?Monsters.TYPES[m.type].dmg:8)*lm;

    const pet={
      type:m.type,
      boss:!!m.boss,
      stars,
      lvl:1,
      xp:0,
      power,
      hp:Math.max(1,Math.round(m.maxhp*0.25*power)),
      maxhp:Math.round(m.maxhp*power),
      dmg:Math.max(3,Math.round(baseDmg*power)),
      saddle:false,
      name:this.mobName(m.type),
    };
    RPG.mobSlots[idx]=pet;
    this.removeMob(m);
    UI.toast(`🎉 ${pet.name}${pet.boss?' Raksasa':''} ${'⭐'.repeat(pet.stars)} ditangkap!`);
    if(typeof Sfx!=='undefined'&&Sfx.pickup)Sfx.pickup();
    if(typeof UI!=='undefined'&&UI.markInvDirty)UI.markInvDirty();
  },

  removeMob(m){
    const i=Monsters.list.indexOf(m);
    if(i>=0)Monsters.list.splice(i,1);
    if(m.mesh){
      Game.scene.remove(m.mesh);
      m.mesh.traverse(o=>{
        if(o.geometry)o.geometry.dispose();
        if(o.material)o.material.dispose();
      });
    }
    m.dead=true;
  },

  /* =========================================================================
     PET / MOB BAG
     ========================================================================= */

  serialize(){
    const arr=RPG.mobSlots.slice();
    if(this.pet&&this.deployedSlot>=0){
      arr[this.deployedSlot]=this.petData();
    }
    return arr;
  },

  petData(){
    const m=this.pet;
    const old=(this.deployedSlot>=0&&RPG.mobSlots[this.deployedSlot])||{};
    if(!m)return old;
    return {
      type:m.type,
      boss:!!m.boss,
      stars:old.stars||1,
      lvl:old.lvl||1,
      xp:old.xp||0,
      power:old.power||1,
      dmg:old.dmg||m.dmg,
      hp:Math.max(1,Math.round(m.hp)),
      maxhp:m.maxhp,
      saddle:!!(m.saddle||old.saddle),
      name:old.name||this.mobName(m.type),
    };
  },

  load(arr,deployed){
    this.clearActive(true);
    RPG.mobSlots=(Array.isArray(arr)&&arr.length)?arr.slice(0,4):new Array(4).fill(null);
    while(RPG.mobSlots.length<4)RPG.mobSlots.push(null);
    /* migrasi pet lama: tambahkan bintang, level, exp, damage bila belum ada */
    for(let i=0;i<RPG.mobSlots.length;i++){
      if(RPG.mobSlots[i])RPG.mobSlots[i]=this.migratePet(RPG.mobSlots[i]);
    }
    this.deployedSlot=-1;
    RPG.deployedPet=-1;
    this._pendingDeploy=(deployed>=0&&RPG.mobSlots[deployed])?deployed:-1;
    this._pendingT=this._pendingDeploy>=0?1.2:-1;
  },

  /* pet lama dari save lama tetap bisa dipakai; field baru diisi sekali saja */
  migratePet(p){
    if(!p)return p;
    if(!p.stars){
      p.stars=this.rollStars(!!p.boss);
      p.power=1+(p.stars-1)*0.22+rand(0,0.08)+(p.boss?0.25:0);
      const baseHp=p.maxhp||20;
      p.maxhp=Math.max(10,Math.round(baseHp*p.power));
      p.hp=clamp(p.hp||1,1,p.maxhp);
    }
    p.lvl=p.lvl||1;
    p.xp=p.xp||0;
    p.power=p.power||1;
    if(!p.dmg){
      const base=(Monsters.TYPES[p.type]?Monsters.TYPES[p.type].dmg:8);
      p.dmg=Math.max(3,Math.round(base*p.power));
    }
    if(!p.name)p.name=this.mobName(p.type);
    return p;
  },

  clearActive(silent){
    if(this.riding)this.stopRide(true);
    if(this.active)this.failCatch();
    if(this.pet){
      const i=Monsters.list.indexOf(this.pet);
      if(i>=0)Monsters.list.splice(i,1);
      if(this.pet.mesh){
        Game.scene.remove(this.pet.mesh);
        this.pet.mesh.traverse(o=>{
          if(o.geometry)o.geometry.dispose();
          if(o.material)o.material.dispose();
        });
      }
      this.pet.dead=true;
      this.pet=null;
    }
    this.deployedSlot=-1;
    RPG.deployedPet=-1;
    if(!silent&&typeof UI!=='undefined'&&UI.markInvDirty)UI.markInvDirty();
  },

  deploy(i){
    const pet=RPG.mobSlots[i];
    if(!pet)return;
    if(this.riding)this.stopRide(true);
    if(this.pet)this.storeActive(true);

    const ang=Math.random()*Math.PI*2;
    const pos=Player.pos.clone().add(new THREE.Vector3(Math.sin(ang)*2.2,0,Math.cos(ang)*2.2));
    const h=World.topY(Math.floor(pos.x),Math.floor(pos.z));
    pos.y=h;

    const m=Monsters.make(pet.type,pos,!!pet.boss);
    m.pet=true;
    m.id='pet'+(++this._uid);
    m.petSlot=i;
    m.hp=clamp(pet.hp||1,1,pet.maxhp);
    m.maxhp=pet.maxhp;
    m.dmg=pet.dmg||m.dmg;
    m.saddle=!!pet.saddle;
    m.catchActive=false;
    m.catchFailed=false;
    m.alert=0;
    m.state='wander';
    /* ---------- UKURAN PET DARI MINI BOSS ----------
       Mob yang ditangkap saat berwujud mini boss membawa `pet.boss=true`, dan
       Monsters.make(...,true) memberinya skala boss penuh (1.75x ukuran alami,
       atau lebih untuk model berskala kecil). Sebagai PELIHARAAN itu kelewat
       besar: reaper boss menjadi setinggi 5 blok, memenuhi layar, menutupi
       pandangan pemain, dan tersangkut di pintu rumah.

       Pet boss sekarang memakai PET_BOSS_SCALE (1.18x ukuran mob biasa) —
       masih terlihat jelas lebih besar & berwibawa daripada versi liarnya,
       tapi tetap wajar untuk berjalan di samping pemain. Stat-nya TIDAK
       disentuh: kekuatannya tetap dari data pet (power/bintang/level).

       Dihitung dari m.sizeMul (pengali terhadap ukuran alami model, diisi
       make()) supaya berlaku benar untuk semua tipe: golem yang skala alaminya
       0.41 maupun serigala yang 1.0. */
    if(pet.boss&&m.sizeMul>this.PET_BOSS_SCALE){
      const k=this.PET_BOSS_SCALE/m.sizeMul;
      m.mesh.scale.multiplyScalar(k);
      m.baseScale=(m.baseScale||1)*k;
      m.sizeMul=this.PET_BOSS_SCALE;
      /* radius tabrakan ikut menyusut supaya hitbox & tubuh tetap sejalan */
      const T=Monsters.TYPES[m.type];
      if(T)m.r=T.r*this.PET_BOSS_SCALE;
      /* penanda titik kuning boss dibuang: pet bukan ancaman yang perlu ditandai */
      if(m.parts&&m.parts.bossDot){
        m.parts.bossDot.visible=false;
      }
    }
    /* naga tangkapan menyusut 50% (model naga sudah raksasa dari sananya) */
    if(pet.type==='dragon'){
      m.mesh.scale.multiplyScalar(0.5);
      m.baseScale=(m.baseScale||1)*0.5;
      m.sizeMul=(m.sizeMul||1)*0.5;
    }
    Monsters.list.push(m);
    this.pet=m;
    this.deployedSlot=i;
    RPG.deployedPet=i;
    UI.toast(`🐾 ${pet.name} dikeluarkan!`);
    if(typeof UI!=='undefined'&&UI.markInvDirty)UI.markInvDirty();
  },

  storeActive(silent){
    if(!this.pet)return;
    if(this.riding)this.stopRide(true);
    const i=this.deployedSlot;
    if(i>=0&&RPG.mobSlots[i]){
      RPG.mobSlots[i]=this.petData();
    }
    const m=this.pet;
    const idx=Monsters.list.indexOf(m);
    if(idx>=0)Monsters.list.splice(idx,1);
    if(m.mesh){
      Game.scene.remove(m.mesh);
      m.mesh.traverse(o=>{
        if(o.geometry)o.geometry.dispose();
        if(o.material)o.material.dispose();
      });
    }
    m.dead=true;
    this.pet=null;
    this.deployedSlot=-1;
    RPG.deployedPet=-1;
    if(!silent){
      UI.toast('📦 Mob disimpan kembali.');
      if(typeof UI!=='undefined'&&UI.markInvDirty)UI.markInvDirty();
    }
  },

  /* ---------- pertarungan pet ----------
     PET ATTACKS = MONSTER ATTACKS: pet menggunakan seluruh skill monster liar
     (naga api, golem smash, lizard acid/tail, scorpion poison, dll.) via
     Monsters.petAttack(). Serangan ditargetkan ke monster musuh terdekat,
     tidak pernah ke pemain. */
  petAI(m,dt,dp){
    /* ---------- PET TELEPORT SAAT TERTINGGAL ----------
       Rekan tim NPC punya NPC.TELEPORT_R (34 blok) — bila tertinggal lebih jauh
       dari itu, mereka dipanggil ulang ke belakang pemain. Pet tidak punya
       mekanisme seperti itu, jadi bila pemain sprint panjang pet akan tertinggal
       dan tidak pernah mengejar. Sekarang pet diperlakukan sama: melewati
       ambang, ia teleport ke belakang pemain. Tidak dipakai saat pet sedang
       bertarung (ada target & jarak ke target dekat) supaya tidak melepaskan
       pertarungan yang sedang berjalan. */
    if(dp>34&&!m.dead){
      const target=m.target&&!m.target.dead?m.target:null;
      const busy=target&&target.pos.distanceTo(m.pos)<14;
      if(!busy){
        const a=Cam.yaw+Math.PI;
        const nx=Player.pos.x+Math.sin(a)*2,nz=Player.pos.z+Math.cos(a)*2;
        const g=World.groundAt(nx,nz,Player.pos.y+3);
        m.pos.set(nx,Math.max(g,Player.pos.y-1),nz);
        m.vel.set(0,0,0);
        m.mesh.position.copy(m.pos);
        FX.ring(nx,Math.max(g,Player.pos.y-1)+0.1,nz,0x9fd7ff,0.7,3);
        if(typeof Sfx!=='undefined'&&Sfx.jump)Sfx.jump();
        return;
      }
    }

    if(this.riding&&this.pet===m)return;
    if(m.flash>0)m.flash=Math.max(0,m.flash); // flash diurus Monsters.update

    /* cari musuh non-pet terdekat; mob yang sedang ditangkap tidak boleh diganggu */
    let target=null,bd=9.5;
    for(const o of Monsters.list){
      if(o===m||o.dead||o.pet||o.catchActive)continue;
      if(o.type==='kelabang_part')continue; // ruas kelabang terlepas bukan target
      if(typeof Monsters.isAnimal==='function'&&Monsters.isAnimal(o))continue;
      const d=o.pos.distanceTo(m.pos);
      if(d<bd){bd=d;target=o;}
    }

    /* ---------- MOB BERJURUS BERTIMELINE (kumbang / yeti / semut / reaper) ----------
       Jurus mereka berjalan lewat mesin fase (m.kumAtk / m.yAct / m.aAct / m.rAct).
       Selama jurus berlangsung, mesin itu yang memegang kendali gerak & arah
       hadap — persis seperti versi liarnya (lihat Monsters.aiKumbang/aiYeti/
       aiSemut/aiReaper). Tanpa cabang ini, jurus yang dimulai petAttack() tidak
       pernah maju sehingga pet hanya mematung setelah serangan pertama. */
    {
      const foe=m.kumTarget||m.yTarget||m.aTarget||m.rTarget;
      const live=(foe&&!foe.dead)?foe:(target&&!target.dead?target:null);
      const ang=live?Math.atan2(live.pos.x-m.pos.x,live.pos.z-m.pos.z):(m.mesh?m.mesh.rotation.y:0);
      const d=live?live.pos.distanceTo(m.pos):dp;
      if(m.kumAtk&&typeof Monsters.kumbangAtk==='function'){
        Monsters.kumbangAtk(m,dt,d,ang);return;
      }
      if(m.yAct&&typeof Monsters.yetiAct==='function'){
        Monsters.yetiAct(m,dt,d,ang,live);return;
      }
      if(m.aAct&&typeof Monsters.semutAtk==='function'){
        Monsters.semutAtk(m,dt,d,ang,live);return;
      }
      if(m.rAct&&typeof Monsters.reaperAct==='function'){
        Monsters.reaperAct(m,dt,d,ang,live);return;
      }
    }

    if(target&&dp<20){
      const to=new THREE.Vector3().subVectors(target.pos,m.pos).setY(0);
      const ang=Math.atan2(to.x,to.z);
      m.mesh.rotation.y=angLerp(m.mesh.rotation.y,ang,dt*7);
      /* kumbang punya jurus jarak jauh (lempar batu) & jarak dekat (seruduk),
         keduanya diundi. Ia berhenti di jarak menengah supaya kedua jurusnya
         punya peluang dipakai — merapat seperti pet lain membuat seruduk saja
         yang keluar. Yeti sama: lompat+hantam butuh ruang ancang-ancang, dan
         semut butuh jarak untuk terjangan cepatnya. Reaper juga: panggilan 3
         arwahnya hanya berguna bila ia menjaga jarak menengah.
         Naga, golem, dan lizard ikut ditambahkan: semburan api, hantaman tanah,
         serta sapuan ekor & semburan asam semuanya punya jangkauan sendiri —
         kalau pet merapat sampai 1.8 blok seperti dulu, jurus-jurus itu tidak
         pernah terpilih dan pet hanya mencakar/menggigit. */
      const holdR=(m.type==='kumbang')?4.0:
                  (m.type==='yeti')?3.6:
                  (m.type==='semut')?3.2:
                  (m.type==='reaper')?3.4:
                  (m.type==='dragon')?3.4:
                  (m.type==='golem')?3.0:
                  (m.type==='lizard')?2.6:1.8;
      if(bd>holdR){
        const spd=m.speed*(m.inWater?0.5:1)*(m.slowMul||1);
        m.vel.x=lerp(m.vel.x,Math.sin(ang)*spd,clamp(7*dt,0,1));
        m.vel.z=lerp(m.vel.z,Math.cos(ang)*spd,clamp(7*dt,0,1));
      }else{
        m.vel.x*=0.75;m.vel.z*=0.75;
      }
      // gunakan sistem serangan monster asli bila cooldown siap
      if(Monsters.petAttack)Monsters.petAttack(m,target,bd,dt);
      return;
    }

    /* ikuti pemain / tunggu di luar jika pemain masuk ke dalam rumah */
    let targetPos=Player.pos;
    let waitForPlayer=false;
    if(typeof WGEN!=='undefined'&&WGEN.buildingAt){
      const pb=WGEN.buildingAt(Player.pos.x,Player.pos.z,0);
      if(pb){
        waitForPlayer=true;
        const dr=(typeof NPCS!=='undefined'&&NPCS.doorOf)?NPCS.doorOf(pb):null;
        if(dr){
          targetPos=new THREE.Vector3(dr.ox,Player.pos.y,dr.oz);
        }
      }
    }

    const distTarget=m.pos.distanceTo(targetPos);
    const stopDist=waitForPlayer?1.3:3.4;

    if(distTarget>stopDist){
      const to=new THREE.Vector3().subVectors(targetPos,m.pos).setY(0);
      const ang=Math.atan2(to.x,to.z);
      m.mesh.rotation.y=angLerp(m.mesh.rotation.y,ang,dt*5);
      const spd=Math.min(m.speed*1.05,CFG.PLAYER.sprint);
      m.vel.x=lerp(m.vel.x,Math.sin(ang)*spd,clamp(5*dt,0,1));
      m.vel.z=lerp(m.vel.z,Math.cos(ang)*spd,clamp(5*dt,0,1));
    }else{
      m.vel.x*=Math.exp(-5*dt);
      m.vel.z*=Math.exp(-5*dt);
      if(waitForPlayer){
        /* menghadap ke arah pintu rumah tempat pemain berada */
        const toP=new THREE.Vector3().subVectors(Player.pos,m.pos).setY(0);
        if(toP.lengthSq()>0.1){
          m.mesh.rotation.y=angLerp(m.mesh.rotation.y,Math.atan2(toP.x,toP.z),dt*4);
        }
      }
    }
  },

  hurtPet(m,dmg){
    if(!m||m.dead)return;
    /* aura pasif tim (Guardian Aegis + Mage Support) & buff Aura Perisai
       melindungi pet sama seperti pemain dan rekan */
    let auraD=(typeof NPCS!=='undefined'&&NPCS.auraDef)?NPCS.auraDef(m.pos):0;
    if(auraD>0)dmg*=1-Math.min(0.85,auraD);
    if(m.shieldT>0)dmg*=1-Math.min(0.85,m.shieldV||0);
    m.hp-=dmg;
    m.flash=0.18;
    FX.text(m.pos.clone().add(new THREE.Vector3(0,2,0)),String(Math.round(dmg)),'#ff9d8a');
    FX.debris(m.pos.clone().add(new THREE.Vector3(0,1,0)),0xff5544,3,1.6);
    if(m.hp<=0)this.petDown(m);
  },

  petDown(m){
    UI.toast(`💔 ${this.mobName(m.type)} melemah dan kembali ke slot.`);
    if(this.deployedSlot>=0&&RPG.mobSlots[this.deployedSlot]){
      RPG.mobSlots[this.deployedSlot].hp=1;
    }
    this.storeActive(true);
    if(typeof UI!=='undefined'&&UI.markInvDirty)UI.markInvDirty();
  },

  /* ---------- saddle / ride ---------- */
  addSaddle(i){
    const pet=RPG.mobSlots[i];
    if(!pet)return;
    if(pet.saddle){UI.toast('🐴 Sudah memakai Sadel.');return;}
    if(RPG.countItem('saddle')<1){UI.toast('🐴 Butuh Sadel! Buat dari Kulit & Kayu.');return;}
    RPG.removeItems({saddle:1});
    pet.saddle=true;
    if(this.pet&&this.deployedSlot===i)this.pet.saddle=true;
    UI.toast(`🐴 Sadel dipasang ke ${pet.name}. Tekan F untuk naik.`);
    if(typeof UI!=='undefined'&&UI.markInvDirty)UI.markInvDirty();
  },

  /* call=true (dari tombol panel): pet dipanggil ke sisi pemain dulu bila jauh */
  startRide(call){
    const m=this.pet;
    if(!m||m.dead)return;
    if(!m.saddle){UI.toast('🐴 Pasang Sadel dulu dari tas mob.');return;}
    if(this.active)return;
    if(this.mounting||this.dismounting)return;
    /* bila dipanggil dari panel dan pet jauh, tarik pet ke samping pemain */
    if(call&&m.pos.distanceTo(Player.pos)>2.5){
      const ang=Cam.yaw+Math.PI*0.5;
      const nx=Player.pos.x+Math.sin(ang)*1.2,nz=Player.pos.z+Math.cos(ang)*1.2;
      const g=World.groundAt(nx,nz,Player.pos.y+3);
      m.pos.set(nx,Math.max(g,Player.pos.y-1),nz);
      m.vel.set(0,0,0);
      UI.toast('🐾 Kemari!');
    }
    this.riding=true;
    /* animasi naik: badan dilerp dari posisi berdiri ke atas punggung selama
       durasi ride_mount, lalu masuk pose duduk. */
    this.mounting=true;
    this.mountT=0;
    this.mountDur=0.55;
    this.mountStartPos=Player.pos.clone();
    m.vel.x=0;m.vel.z=0;   // buang momentum lama supaya tidak langsung meluncur
    if(Player.animator)Player.animator.setAnimation('ride_mount');
    if(typeof Sfx!=='undefined'&&Sfx.jump)Sfx.jump();
    UI.toast(`🐾 Menunggangi ${this.mobName(m.type)}!`);
  },

  stopRide(silent){
    if(!this.riding)return;
    if(this.dismounting)return;
    this.riding=false;
    this.jumpQ=false;
    this.mounting=false;
    const m=this.pet;
    if(m){
      /* animasi turun: pemain melompat ke samping mount lalu mendarat. */
      this.dismounting=true;
      this.dismountT=0;
      this.dismountDur=0.45;
      this.dismountStartPos=Player.pos.clone();
      const landX=m.pos.x+Math.cos(m.mesh.rotation.y+0.6)*1.3;
      const landZ=m.pos.z-Math.sin(m.mesh.rotation.y+0.6)*1.3;
      const gy=World.groundAt(landX,landZ,m.pos.y+3);
      this.dismountTargetPos=new THREE.Vector3(landX,Math.max(gy,m.pos.y),landZ);
      if(Player.animator)Player.animator.setAnimation('ride_dismount');
      if(typeof Sfx!=='undefined'&&Sfx.jump)Sfx.jump();
    }
    if(!silent)UI.toast('🧍 Turun dari tunggangan.');
  },

  ridePlayer(p,dt){
    const m=this.pet;
    if(!m||m.dead){this.stopRide(true);return;}

    const seat=(typeof meshHeight==='function')?meshHeight(m.type)*0.72:1.2;

    /* ---- transisi TURUN: lompat ke samping mount lalu mendarat ---- */
    if(this.dismounting){
      this.dismountT+=dt;
      const k=Math.min(1,this.dismountT/this.dismountDur);
      const from=this.dismountStartPos,to=this.dismountTargetPos;
      p.pos.x=lerp(from.x,to.x,k);
      p.pos.z=lerp(from.z,to.z,k);
      /* lengkung parabola kecil saat melompat turun */
      p.pos.y=lerp(from.y,to.y,k)+Math.sin(k*Math.PI)*0.5;
      p.mesh.position.copy(p.pos);
      p.mesh.rotation.y=p.facing;
      p.vel.set(0,0,0);
      if(k>=1){
        this.dismounting=false;
        this.pet=this.pet; // no-op, biarkan pet tetap terdeploy
        p.pos.copy(to);
        p.mesh.position.copy(p.pos);
        p.vel.set(0,0,0);
        p.onGround=true;
      }
      return;
    }

    /* lompat saat menunggangi: 2 blok, naga 3 blok (nonaktif saat naik/turun) */
    if(this.jumpQ&&!this.mounting){
      this.jumpQ=false;
      if(m.onGround){
        m.vel.y=m.type==='dragon'?12.5:10.3;
        m.onGround=false;
        if(typeof Sfx!=='undefined'&&Sfx.jump)Sfx.jump();
      }
    }

    /* ---- transisi NAIK: lompat dari tanah ke atas punggung ---- */
    if(this.mounting){
      this.mountT+=dt;
      const k=Math.min(1,this.mountT/this.mountDur);
      const from=this.mountStartPos;
      const tx=m.pos.x,ty=m.pos.y+seat,tz=m.pos.z;
      p.pos.x=lerp(from.x,tx,k);
      p.pos.z=lerp(from.z,tz,k);
      /* lengkung parabola: melompat naik melewati puncak lalu mendarat di sadel */
      p.pos.y=lerp(from.y,ty,k)+Math.sin(k*Math.PI)*0.55;
      p.facing=angLerp(p.facing,m.mesh.rotation.y,clamp(10*dt,0,1));
      p.mesh.position.copy(p.pos);
      p.mesh.rotation.y=p.facing;
      p.vel.set(0,0,0);
      /* rem mount supaya diam saat pemain masih naik */
      m.vel.x*=Math.exp(-24*dt);m.vel.z*=Math.exp(-24*dt);
      if(k>=1)this.mounting=false;
      return;
    }

    const mv=Input.moveVec();
    const mvLen=Math.hypot(mv.x,mv.z);
    const moving=mvLen>0.12;                 // deadzone anti-drift joystick
    /* ---------- KECEPATAN TUNGGANGAN ----------
       Tunggangan lebih cepat dari lari pemain (CFG.PLAYER.sprint), tapi tidak
       berlebihan — tercepat 1.5× lari pemain:
         · naga            → 1.5× kecepatan lari pemain (tunggangan tercepat)
         · tunggangan lain → 1.3× kecepatan lari pemain
         · sapi / golem / slime → memakai kecepatan ASLI mob (m.speed); ketiganya
           memang lambat sesuai karakternya, jadi tidak dipercepat. */
    const run=CFG.PLAYER.sprint;                       // kecepatan lari pemain
    const slowRide=(m.type==='cow'||m.type==='golem'||m.type==='slime');
    const base=slowRide?m.speed:(m.type==='dragon'?run*1.5:run*1.3);
    const sprint=Input.sprintHeld()?1.08:1;
    /* batas atas 1.5× lari pemain untuk tunggangan cepat (sprint tidak boleh
       mendorong melampauinya); tunggangan lambat tidak dibatasi run. */
    const spd=slowRide?base*sprint:Math.min(run*1.5,base*sprint);

    if(moving){
      const nx=mv.x/mvLen,nz=mv.z/mvLen;
      const targetSpd=spd*Math.min(1,mvLen);
      const ang=Math.atan2(nx,nz);
      m.dir=ang;
      /* kontrol langsung + sedikit smoothing agar tidak meluncur jauh */
      m.vel.x=lerp(m.vel.x,nx*targetSpd,clamp(20*dt,0,1));
      m.vel.z=lerp(m.vel.z,nz*targetSpd,clamp(20*dt,0,1));
      /* jaga kecepatan tidak melebihi batas */
      const cur=Math.hypot(m.vel.x,m.vel.z);
      if(cur>targetSpd){m.vel.x*=targetSpd/cur;m.vel.z*=targetSpd/cur;}
      p.facing=angLerp(p.facing,ang,clamp(14*dt,0,1));
      m.mesh.rotation.y=angLerp(m.mesh.rotation.y,ang,clamp(14*dt,0,1));
    }else{
      /* rem keras saat tidak ada input agar tidak meluncur */
      m.vel.x*=Math.exp(-24*dt);
      m.vel.z*=Math.exp(-24*dt);
      if(Math.hypot(m.vel.x,m.vel.z)<0.08){m.vel.x=0;m.vel.z=0;}
    }

    /* posisi pemain mengikuti punggung mount */
    p.pos.set(m.pos.x,m.pos.y+seat,m.pos.z);
    p.mesh.position.copy(p.pos);
    p.mesh.rotation.y=p.facing;
    p.vel.set(0,0,0);
    p.onGround=true;
    p.inWater=false;
  },

  /* ---------- makan / jual / lepas ---------- */
  feed(i){
    const pet=RPG.mobSlots[i];
    if(!pet)return;
    const food=this.petFood(pet.type);
    const fIco=(typeof UI!=='undefined'&&UI.itemIcon)?UI.itemIcon(food):ITEMS[food].e;
    if(RPG.countItem(food)<1){
      UI.toast(`${fIco} ${pet.name} butuh ${ITEMS[food].n}!`);
      return;
    }
    RPG.removeItems({[food]:1});
    const heal=Math.round(pet.maxhp*0.3);
    pet.hp=clamp((pet.hp||1)+heal,1,pet.maxhp);
    if(this.pet&&this.deployedSlot===i)this.pet.hp=pet.hp;
    UI.toast(`${fIco} ${pet.name} makan! +${heal} HP`);
    if(typeof Sfx!=='undefined'&&Sfx.eat)Sfx.eat();
    if(typeof UI!=='undefined'&&UI.markInvDirty)UI.markInvDirty();
  },

  sellValue(pet){
    let v=20+Math.round(pet.maxhp*0.35);
    if(pet.boss)v*=3;
    v*=(1+((pet.stars||1)-1)*0.35);
    v*=(1+((pet.lvl||1)-1)*0.12);
    if(pet.saddle)v+=18;
    return Math.max(5,Math.round(v));
  },

  sell(i){
    const pet=RPG.mobSlots[i];
    if(!pet)return;
    if(this.deployedSlot===i&&this.pet)this.storeActive(true);
    const v=this.sellValue(pet);
    RPG.mobSlots[i]=null;
    RPG.addCoin(v);
    UI.toast(`💰 ${pet.name} dijual +${v} koin.`);
    if(typeof UI!=='undefined'&&UI.markInvDirty)UI.markInvDirty();
  },

  release(i){
    const pet=RPG.mobSlots[i];
    if(!pet)return;
    if(this.deployedSlot===i&&this.pet)this.storeActive(true);
    RPG.mobSlots[i]=null;
    UI.toast(`🕊️ ${pet.name} dilepaskan kembali ke alam.`);
    if(typeof UI!=='undefined'&&UI.markInvDirty)UI.markInvDirty();
  },

  /* =========================================================================
     BINTANG / EXP / LEVEL UP PET
     ========================================================================= */

  rollStars(boss){
    const r=Math.random();
    let s;
    if(r<0.40)s=1;
    else if(r<0.70)s=2;
    else if(r<0.88)s=3;
    else if(r<0.97)s=4;
    else s=5;
    if(boss)s=Math.min(5,s+1);
    return s;
  },

  petXpMax(pet){
    return 40+(pet.lvl||1)*35+((pet.stars||1)-1)*25;
  },

  levelCost(pet){
    const food=this.petFood(pet.type);
    return {food,n:2+(pet.lvl||1)*2+(pet.stars||1)};
  },

  levelRate(pet){
    /* Peluang dasar lebih bersahabat: mulai 95%, melandai ke 45% */
    let rate=95-((pet.lvl||1)-1)*3-((pet.stars||1)-1)*3;
    return clamp(Math.round(rate),45,98);
  },

  petGainXp(m,amt){
    if(!m||!m.pet)return;
    const i=m.petSlot;
    if(i<0||!RPG.mobSlots[i])return;
    const pet=RPG.mobSlots[i];
    pet.xp=(pet.xp||0)+Math.max(1,Math.round(amt));
    if(typeof UI!=='undefined'&&UI.markInvDirty)UI.markInvDirty();
  },

  tryLevelUp(i){
    const pet=RPG.mobSlots[i];
    if(!pet)return;
    /* Cap PET_MAX_LEVEL (50). Di level itu pet tidak bisa naik lagi. */
    if((pet.lvl||1)>=CFG.PET_MAX_LEVEL){
      UI.toast(`⭐ ${pet.name} sudah mencapai level maksimum (${CFG.PET_MAX_LEVEL}).`);
      return;
    }
    const xpMax=this.petXpMax(pet);
    if((pet.xp||0)<xpMax){
      UI.toast(`⭐ ${pet.name} butuh XP ${Math.floor(pet.xp||0)}/${xpMax} dulu.`);
      return;
    }
    const cost=this.levelCost(pet);
    if(RPG.countItem(cost.food)<cost.n){
      const cIco=(typeof UI!=='undefined'&&UI.itemIcon)?UI.itemIcon(cost.food):ITEMS[cost.food].e;
      UI.toast(`${cIco} Butuh ${cost.n} ${ITEMS[cost.food].n} untuk naik level.`);
      return;
    }

    let rate=this.levelRate(pet);
    let usedCharm=false;
    if(RPG.countItem('pet_charm')>0){
      usedCharm=true;
      rate=Math.min(98,rate+30);
    }

    RPG.removeItems({[cost.food]:cost.n});
    if(usedCharm)RPG.removeItems({pet_charm:1});

    if(Math.random()*100<rate){
      pet.lvl=(pet.lvl||1)+1;
      pet.xp=0;
      pet.power=(pet.power||1)*1.12;
      pet.maxhp=Math.round(pet.maxhp*1.12);
      pet.dmg=Math.max(3,Math.round((pet.dmg||8)*1.12));
      pet.hp=pet.maxhp;
      if(this.pet&&this.deployedSlot===i){
        this.pet.maxhp=pet.maxhp;
        this.pet.hp=pet.hp;
        this.pet.dmg=pet.dmg;
      }
      UI.toast(`🎉 ${pet.name} naik ke Lv ${pet.lvl}! (+12% stat)`);
      if(typeof Sfx!=='undefined'&&Sfx.levelup)Sfx.levelup();
    }else{
      /* Penalti kegagalan diringankan: XP hanya berkurang 15% (dulu 50%) */
      pet.xp=Math.floor((pet.xp||0)*0.85);
      UI.toast(`❌ Gagal menaikkan ${pet.name}. Bahan habis, XP berkurang sedikit.`);
      if(typeof Sfx!=='undefined'&&Sfx.noStamina)Sfx.noStamina();
    }
    if(typeof UI!=='undefined'&&UI.markInvDirty)UI.markInvDirty();
  },

  /* ---------- UI slot mob di panel tas ---------- */
  renderMobBag(){
    let wrap=document.getElementById('bag-mobs');
    const panel=document.getElementById('panel-bag');
    if(!panel)return;
    if(!wrap){
      const title=document.createElement('div');
      title.className='sub';
      title.id='bag-mobs-title';
      title.textContent='Slot Mob (tidak bisa di-drop)';
      wrap=document.createElement('div');
      wrap.id='bag-mobs';
      panel.appendChild(title);
      panel.appendChild(wrap);
    }
    wrap.innerHTML='';

    /* safety: pet lama yang belum dimigrasi mendapat field baru */
    for(let i=0;i<RPG.mobSlots.length;i++){
      if(RPG.mobSlots[i]&&RPG.mobSlots[i].stars===undefined)
        RPG.mobSlots[i]=this.migratePet(RPG.mobSlots[i]);
    }

    RPG.mobSlots.forEach((pet,i)=>{
      if(!pet){
        const d=document.createElement('div');
        d.className='pet-empty';
        d.innerHTML='➕ Slot kosong<br><i>Tangkap mob memakai Tali</i>';
        wrap.appendChild(d);
        return;
      }
      const emoji=PET_EMOJI[pet.type]||'🐾';
      const food=this.petFood(pet.type);
      const active=this.deployedSlot===i&&this.pet;
      const stars='⭐'.repeat(pet.stars||1);
      const xp=Math.floor(pet.xp||0);
      const xpMax=this.petXpMax(pet);
      const hpNow=Math.round(active?this.pet.hp:pet.hp);
      const hpPct=clamp(hpNow/Math.max(1,pet.maxhp)*100,0,100);
      const xpPct=clamp(xp/Math.max(1,xpMax)*100,0,100);
      const cost=this.levelCost(pet);
      const rate=this.levelRate(pet);

      const d=document.createElement('div');
      d.className='pet-card'+(active?' active':'');
      d.innerHTML=`
        <div class="pc-head">
          <div class="pc-ico">${(typeof UI!=='undefined'&&UI.petIcon)?UI.petIcon(pet.type, emoji):emoji}</div>
          <div class="pc-title">
            <b>${pet.name}${pet.boss?' 👑':''}${active?' · Aktif':''}</b>
            <span class="pc-stars">${stars}</span>
          </div>
          <div class="pc-lv">Lv ${pet.lvl||1}</div>
        </div>
        <div class="pc-bars">
          <div class="pc-bar hp"><i style="width:${hpPct}%"></i><span>HP ${hpNow}/${pet.maxhp}</span></div>
          <div class="pc-bar xp"><i style="width:${xpPct}%"></i><span>XP ${xp}/${xpMax}</span></div>
        </div>
        <div class="pc-stats">
          <span class="pc-chip">⚔️ ${pet.dmg||0}</span>
          <span class="pc-chip">${ITEMS[food].e} ${ITEMS[food].n}</span>
          <span class="pc-chip">${pet.saddle?'🐴 Sadel':'🚫 Sadel'}</span>
          <span class="pc-chip">⬆ ${cost.n}${ITEMS[cost.food].e} · ${rate}%</span>
        </div>
        <div class="pc-actions"></div>
      `;
       const btns=d.querySelector('.pc-actions');
       const mkBtn=(txt,fn,cls,title)=>{
         const b=document.createElement('button');
         b.textContent=txt;
         if(cls)b.className=cls;
         if(title)b.title=title;
         b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();fn();});
         btns.appendChild(b);
       };

       if(active)mkBtn('📦 Simpan',()=>this.storeActive(false),'primary');
       else mkBtn('🐾 Deploy',()=>this.deploy(i),'primary');

       /* Tombol ride hanya muncul jika saddle terpasang — via panel, pet
          dipanggil ke sisi pemain sehingga tidak perlu tombol melayang
          di atas pet yang mengganggu interaksi lain. */
       if(pet.saddle&&active)mkBtn('🐎 Naiki',()=>this.startRide(true),null,
         'Pet dipanggil ke sisimu lalu langsung dinaiki.');

       mkBtn('⬆ Naik',()=>this.tryLevelUp(i),null,
         `Butuh ${cost.n} ${ITEMS[cost.food].n}, XP penuh, peluang ${rate}%\nJimat Pawang menambah +30% peluang (dipakai otomatis bila ada).`);
       mkBtn('🍖 Makan',()=>this.feed(i));
       if(!pet.saddle)mkBtn('🐴 Sadel',()=>this.addSaddle(i));
       mkBtn('💰 Jual',()=>this.sell(i));
       mkBtn('🕊️ Lepas',()=>this.release(i));
      wrap.appendChild(d);
    });
  },

  /* ---------- update global ---------- */
  update(dt){
    if(typeof Game==='undefined'||!Game.started||Game.menuMode)return;
    this.init();

    if(Player.dead){
      if(this.riding)this.stopRide(true);
      if(this.active)this.failCatch();
      if(this.btn)this.btn.style.display='none';
      return;
    }

    /* auto-deploy pet dari save setelah dunia siap */
    if(this._pendingDeploy>=0){
      this._pendingT-=dt;
      if(this._pendingT<=0){
        const i=this._pendingDeploy;
        this._pendingDeploy=-1;
        if(RPG.mobSlots[i])this.deploy(i);
      }
    }

    if(this.active)this.updateActive(dt);
    else this.updateBtn();

    if(!this.active)this.updateRope();

    /* ikon pet di HUD team perlu refresh berkala (HP/XP berubah) */
    if(this.pet){
      this._teamT-=dt;
      if(this._teamT<=0){
        this._teamT=0.45;
        if(typeof UI!=='undefined'&&UI.renderTeam)UI.renderTeam();
      }
    }
  },
};
window.Capture=Capture;
