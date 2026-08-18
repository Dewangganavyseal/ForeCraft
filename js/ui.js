'use strict';
/* HUD & semua panel */
const UI={
  open:null,picked:null,hotEls:[],activeSig:'',
  init(){
    /* ---------- BUNGKUS ISI PANEL KE AREA SCROLL SENDIRI ----------
       PERBAIKAN UI: header (h2) & baris tab (#craft-tabs) harus tetap di
       PALING ATAS panel, sedangkan sisanya yang di-scroll. Panel memakai flex
       column (CSS), jadi di sini seluruh anak panel selain header/tab
       dipindahkan ke dalam <div class="panel-body"> yang punya overflow-y. */
    document.querySelectorAll('.panel').forEach(p=>{
      if(p.querySelector(':scope > .panel-body'))return;
      const body=document.createElement('div');
      body.className='panel-body';
      const keep=[];                       // node yang tetap di luar (header/tab)
      Array.from(p.childNodes).forEach(n=>{
        const isHead=n.nodeType===1&&(n.tagName==='H2'||n.id==='craft-tabs');
        if(isHead)keep.push(n);else body.appendChild(n);
      });
      p.appendChild(body);                 // body di bawah header/tab
    });

    const hb=document.getElementById('hotbar');
    for(let i=0;i<7;i++){
      const d=document.createElement('div');d.className='hslot';
      d.innerHTML=`<span class="key">${i+1}</span><span class="emo"></span><span class="cnt"></span>`;
      const selectSlot=e=>{
        if(UI.open)return;
        e.preventDefault();
        /* klik slot yang sedang terpilih = kosongkan tangan / unequip */
        RPG.sel=(RPG.sel===i)?-1:i;
        this.renderHotbar();
      };
      d.addEventListener('touchstart',selectSlot,{passive:false});
      d.addEventListener('click',selectSlot);
      hb.appendChild(d);this.hotEls.push(d);
    }
    document.querySelectorAll('[data-close]').forEach(b=>
      b.addEventListener('click',()=>this.toggle(b.dataset.close)));
    /* slot klik (panel tas) */
    document.body.addEventListener('click',e=>{
      if(this.open!=='bag')return;
      /* klik yang muncul setelah drag diabaikan supaya item tidak "terangkat"
         lagi di slot tujuan */
      if(this._skipClick){this._skipClick=false;return;}
      const eq=e.target.closest('.slot.eq');
      if(eq){RPG.unequip(eq.dataset.slot);return;}
      const sl=e.target.closest('.slot');
      if(sl)this.slotClick(+sl.dataset.i,+sl.dataset.g);
    });
    /* klik kanan item armor = pakai */
    document.body.addEventListener('contextmenu',e=>{
      if(this.open!=='bag')return;
      const sl=e.target.closest('.slot:not(.eq)');
      if(!sl)return;
      e.preventDefault();
      const arr=(+sl.dataset.g)===0?RPG.hotbar:RPG.bag;
      const s=arr[+sl.dataset.i];
      /* pedang maupun armor bisa dipakai lewat klik kanan */
      if(s&&(ITEMS[s.id].armor||ITEMS[s.id].weapon))RPG.equipItem(s.id);

    });

    document.getElementById('btn-respawn').addEventListener('click',()=>{Player.respawn();});
    this.initDrag();
    this.initNpcDrag();
    this.initChestDrag();
    this.renderHotbar();
    this.renderActiveSkills(true);
    /* pastikan semua panel tertutup saat game pertama kali dibuka */
    this.closeAll();
  },
  /* ---------- drag & drop item (mouse + sentuh) ----------
      PC: drag langsung setelah bergerak sedikit.
      Mobile: harus TAHAN ~1 detik baru dianggap memindahkan item.
      Jika jari bergerak sebelum 1 detik, gerakan dianggap scroll tas. */
  initDrag(){
    const panel=document.getElementById('panel-bag');
    if(!panel)return;
    const DEAD=7;                       // px minimum sebelum dianggap drag
    const HOLD=1000;                    // ms tahan untuk mulai drag di mobile
    const SCROLL_MOVE=12;               // gerak sebelum hold = scroll
    let d=null;

    const cleanup=()=>{
      if(!d)return;
      if(d.timer)clearTimeout(d.timer);
      if(d.blockTouch)window.removeEventListener('touchmove',d.blockTouch);
      if(d.ghost)d.ghost.remove();
      d.sl.classList.remove('dragging','press');
      panel.classList.remove('drag-lock');
      panel.querySelectorAll('.drop-hint').forEach(e=>e.classList.remove('drop-hint'));
      d=null;
    };
    /* slot di bawah pointer; ghost sengaja pointer-events:none agar tembus */
    const slotUnder=(x,y)=>{
      const el=document.elementFromPoint(x,y);
      return el?el.closest('.slot:not(.eq)'):null;
    };
    const startGhost=()=>{
      const arr=d.g===0?RPG.hotbar:RPG.bag;
      const s=arr[d.i];
      if(!s){cleanup();return;}
      d.ghost=document.createElement('div');
      d.ghost.className='drag-ghost';
      d.ghost.textContent=ITEMS[s.id].e;
      document.body.appendChild(d.ghost);
      d.sl.classList.remove('press');
      d.sl.classList.add('dragging');
    };

    panel.addEventListener('pointerdown',e=>{
      if(e.button)return;               // hanya klik kiri / sentuh utama
      const sl=e.target.closest('.slot:not(.eq)');
      if(!sl)return;
      const g=+sl.dataset.g,i=+sl.dataset.i;
      const arr=g===0?RPG.hotbar:RPG.bag;
      if(!arr[i])return;                // slot kosong tidak bisa ditarik
      d={g,i,sl,x0:e.clientX,y0:e.clientY,moved:false,ghost:null,pid:e.pointerId,
         ready:e.pointerType!=='touch',timer:null,blockTouch:null};
      if(e.pointerType==='touch'){
        sl.classList.add('press');
        /* tahan 1 detik baru masuk mode drag item */
        d.timer=setTimeout(()=>{
          if(!d)return;
          d.ready=true;
          panel.classList.add('drag-lock');
          if(navigator.vibrate)navigator.vibrate(18);
          /* cegah browser melanjutkan scroll setelah drag aktif */
          d.blockTouch=ev=>{if(d&&d.ready)ev.preventDefault();};
          window.addEventListener('touchmove',d.blockTouch,{passive:false});
        },HOLD);
      }
    });

    window.addEventListener('pointermove',e=>{
      if(!d||e.pointerId!==d.pid)return;
      const dist=Math.hypot(e.clientX-d.x0,e.clientY-d.y0);

      /* sentuh sebelum 1 detik: kalau sudah geser, anggap scroll */
      if(!d.ready){
        if(e.pointerType==='touch'&&dist>SCROLL_MOVE){
          if(d.timer)clearTimeout(d.timer);
          d.sl.classList.remove('press');
          this._skipClick=true;          // click setelah scroll diabaikan
          d=null;
          return;
        }
        if(e.pointerType==='touch')return; // tunggu hold selesai
      }

      if(!d.moved){
        if(dist<DEAD)return;
        d.moved=true;
        startGhost();
        if(!d)return;
      }
      d.ghost.style.left=e.clientX+'px';
      d.ghost.style.top=e.clientY+'px';
      const t=slotUnder(e.clientX,e.clientY);
      panel.querySelectorAll('.drop-hint').forEach(el=>el.classList.remove('drop-hint'));
      if(t&&t!==d.sl)t.classList.add('drop-hint');
    });

    window.addEventListener('pointerup',e=>{
      if(!d||e.pointerId!==d.pid)return;
      if(d.moved){
        const t=slotUnder(e.clientX,e.clientY);
        if(t&&this.moveStack(d.g,d.i,+t.dataset.g,+t.dataset.i)){
          this.picked=null;
          this.renderBag();this.renderHotbar();
        }else if(!t){
          /* dilepas di luar slot: bila di luar panel tas → konfirmasi buang */
          const under=document.elementFromPoint(e.clientX,e.clientY);
          if(!under||!panel.contains(under)){
            const arr=d.g===0?RPG.hotbar:RPG.bag;
            const s=arr[d.i];
            if(s)this.confirmDropPlayer(d.g,d.i,s);
          }
        }
        this._skipClick=true;           // cegah handler klik ikut jalan
      }
      cleanup();
    });
    window.addEventListener('pointercancel',cleanup);
  },
  /* konfirmasi membuang item dari tas pemain; jumlah bisa diubah (default =
     seluruh tumpukan). On OK item dihapus dari inventory & jatuh ke dunia. */
  confirmDropPlayer(g,i,s){
    const it=ITEMS[s.id];
    this.modal({
      icon:it.e,
      text:`Buang <b>${it.n}</b> ke tanah?`,
      input:{value:s.n,min:1,max:s.n},
      okLabel:'✔ Buang',cancelLabel:'✖ Batal',
      onOk:(n)=>{
        if(n<=0)return;
        const arr=g===0?RPG.hotbar:RPG.bag;
        const cur=arr[i];
        if(!cur||cur.id!==s.id)return;          // slot berubah sejak modal dibuka
        const take=Math.min(n,cur.n);
        cur.n-=take;
        if(cur.n<=0)arr[i]=null;
        /* jatuhkan di depan pemain supaya mudah dipungut kembali */
        const fx=Player.pos.x+Math.sin(Player.facing)*1.2;
        const fz=Player.pos.z+Math.cos(Player.facing)*1.2;
        World.dropItem(fx,Player.pos.y+0.6,fz,s.id,take);
        this.toast(`🗑️ Membuang ${it.e} ${it.n} ×${take}`);
        Sfx.click();
        this.renderBag();this.renderHotbar();
      }
    });
  },
  /* konfirmasi membuang item dari tas rekan (NPC team) */
  confirmDropNpc(i,s){
    const n=this.npcSel;if(!n)return;
    const it=ITEMS[s.id];
    this.modal({
      icon:it.e,
      text:`Buang <b>${it.n}</b> milik ${n.name} ke tanah?`,
      input:{value:s.n,min:1,max:s.n},
      okLabel:'✔ Buang',cancelLabel:'✖ Batal',
      onOk:(cnt)=>{
        if(cnt<=0)return;
        const cur=n.bag[i];
        if(!cur||cur.id!==s.id)return;
        const take=Math.min(cnt,cur.n);
        cur.n-=take;
        if(cur.n<=0)n.bag[i]=null;
        World.dropItem(n.pos.x,n.pos.y+0.6,n.pos.z,s.id,take);
        this.toast(`🗑️ Membuang ${it.e} ${it.n} ×${take} dari ${n.name}`);
        Sfx.click();
        this.renderNpcPanel();
      }
    });
  },
  /* drag item di tas rekan (panel NPC): seret keluar panel = buang. Memakai
     Pointer Events dengan delegasi supaya tetap bekerja tiap renderNpcPanel. */
  initNpcDrag(){
    const DEAD=8;
    let d=null;
    const cleanup=()=>{
      if(!d)return;
      if(d.ghost)d.ghost.remove();
      if(d.sl)d.sl.classList.remove('dragging');
      d=null;
    };
    document.body.addEventListener('pointerdown',e=>{
      if(this.open!=='npc')return;
      if(e.button)return;
      const sl=e.target.closest('.slot.nb');
      if(!sl)return;
      const n=this.npcSel;
      if(!n||!n.bag[+sl.dataset.take])return;
      d={sl,i:+sl.dataset.take,x0:e.clientX,y0:e.clientY,moved:false,
         ghost:null,pid:e.pointerId};
    });
    window.addEventListener('pointermove',e=>{
      if(!d||e.pointerId!==d.pid)return;
      if(!d.moved){
        if(Math.hypot(e.clientX-d.x0,e.clientY-d.y0)<DEAD)return;
        d.moved=true;
        const n=this.npcSel;const s=n&&n.bag[d.i];
        if(!s){cleanup();return;}
        d.ghost=document.createElement('div');d.ghost.className='drag-ghost';
        d.ghost.textContent=ITEMS[s.id].e;document.body.appendChild(d.ghost);
        d.sl.classList.add('dragging');
        this._npcSkipClick=true;        // cegah click 'ambil' ikut jalan
      }
      d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';
    });
    window.addEventListener('pointerup',e=>{
      if(!d||e.pointerId!==d.pid)return;
      if(d.moved){
        const panelN=document.getElementById('panel-npc');
        const under=document.elementFromPoint(e.clientX,e.clientY);
        if(!under||!panelN.contains(under)){
          const n=this.npcSel;const s=n&&n.bag[d.i];
          if(s)this.confirmDropNpc(d.i,s);
        }
      }
      cleanup();
    });
    window.addEventListener('pointercancel',cleanup);
  },
  /* pindah / gabung stack antar slot; dipakai klik maupun drag & drop */
  moveStack(fromG,fromI,toG,toI){
    if(fromG===toG&&fromI===toI)return false;
    const from=fromG===0?RPG.hotbar:RPG.bag;
    const to=toG===0?RPG.hotbar:RPG.bag;
    const a=from[fromI],b=to[toI];
    if(!a)return false;
    if(b&&b.id===a.id&&b.n<64){
      const mv=Math.min(a.n,64-b.n);b.n+=mv;a.n-=mv;
      if(a.n<=0)from[fromI]=null;
    }else{to[toI]=a;from[fromI]=b;}
    return true;
  },
  /* Jumlah notifikasi yang boleh tampak sekaligus. Di ponsel ruang vertikal
     antara bar HP dan hotbar sempit, jadi tumpukan lama dibuang lebih awal
     supaya deretannya tidak pernah memanjang sampai menutupi hotbar atau
     tombol kendali. */
  TOAST_MAX:IS_MOBILE?4:7,
  toast(msg){
    const t=document.getElementById('toast');
    const d=document.createElement('div');d.className='toast-item';d.textContent=msg;
    t.appendChild(d);
    /* buang notifikasi terlama bila melebihi batas */
    while(t.childElementCount>this.TOAST_MAX)t.firstElementChild.remove();
    setTimeout(()=>d.remove(),2600);
  },
  /* ---------- modal konfirmasi generik ----------
     opt: {icon, text, count, input:{value,min,max}, okLabel, cancelLabel,
           allLabel, onOk(n), onCancel}. `input` bila hadir menampilkan kotak
           angka yang nilainya dikirim ke onOk. `allLabel` (hanya bila `input`
           ada) menambah tombol yang langsung mengirim nilai maksimum — dipakai
           utk "Jual Semua". Dipakai utk konfirmasi buang item & input jumlah. */
  modal(opt){
    this.closeModal();                    // hanya satu modal pada satu waktu
    const ov=document.createElement('div');ov.id='modal-ov';
    const box=document.createElement('div');box.id='modal-box';
    let h='';
    if(opt.icon)h+=`<span class="m-ico">${opt.icon}</span>`;
    if(opt.text)h+=`<div class="m-txt">${opt.text}</div>`;
    if(opt.input)h+=`<input type="number" id="modal-num" min="${opt.input.min||1}" `+
      `max="${opt.input.max||999}" value="${opt.input.value||1}">`;
    else if(opt.count!==undefined)h+=`<div class="m-count">Jumlah: ×${opt.count}</div>`;
    h+=`<div id="modal-btns">`+
       ((opt.allLabel&&opt.input)?`<button id="modal-all">${opt.allLabel}</button>`:'')+
       `<button id="modal-ok">${opt.okLabel||'✔ OK'}</button>`+
       `<button id="modal-cancel">${opt.cancelLabel||'✖ Batal'}</button></div>`;
    box.innerHTML=h;ov.appendChild(box);document.body.appendChild(ov);
    const numEl=document.getElementById('modal-num');
    const maxV=(opt.input&&opt.input.max)||99999;
    const finish=(ok,all)=>{
      const v=all?maxV:(numEl?clamp(Math.floor(+numEl.value)||0,
        (opt.input&&opt.input.min)||0,maxV):opt.count);
      this.closeModal();
      if(ok)opt.onOk&&opt.onOk(v);else opt.onCancel&&opt.onCancel();
    };
    document.getElementById('modal-ok').addEventListener('click',()=>finish(true));
    document.getElementById('modal-cancel').addEventListener('click',()=>finish(false));
    const allEl=document.getElementById('modal-all');
    if(allEl)allEl.addEventListener('click',()=>finish(true,true));
    ov.addEventListener('pointerdown',e=>{if(e.target===ov)finish(false);});
    if(numEl){
      numEl.addEventListener('keydown',e=>{
        e.stopPropagation();
        if(e.key==='Enter'){e.preventDefault();finish(true);}
        if(e.key==='Escape'){e.preventDefault();finish(false);}
      });
      setTimeout(()=>{numEl.focus();numEl.select&&numEl.select();},30);
    }
  },
  closeModal(){
    const ov=document.getElementById('modal-ov');
    if(ov)ov.remove();
  },
  flashVignette(){
    const v=document.getElementById('vignette');
    v.style.opacity=1;setTimeout(()=>v.style.opacity=0,260);
  },
  levelUpBanner(){
    const l=document.getElementById('levelup');
    l.classList.remove('show');void l.offsetWidth;l.classList.add('show');
  },
  showCombo(n){
    const c=document.getElementById('combo');
    c.textContent='COMBO x'+n;
    c.style.opacity=1;
    c.classList.remove('pop');void c.offsetWidth;c.classList.add('pop');
    clearTimeout(this._ct);
    this._ct=setTimeout(()=>c.style.opacity=0,900);
  },
  /* ---------- HUD ---------- */
  updateHUD(){
    /* bar dinormalisasi ke stat maksimum sekarang, karena kapasitas HP &
       stamina bertambah setiap naik level */
    const mHp=Player.maxHp(),mSt=Player.maxStamina();
    document.getElementById('hp-fill').style.width=(Player.hp/mHp*100)+'%';
    document.getElementById('st-fill').style.width=(Player.stamina/mSt*100)+'%';
    document.getElementById('hu-fill').style.width=Player.hunger+'%';
    document.getElementById('hp-num').textContent=Math.ceil(Player.hp)+'/'+mHp;
    document.getElementById('st-num').textContent=Math.ceil(Player.stamina)+'/'+mSt;

    document.getElementById('hu-num').textContent=Math.ceil(Player.hunger);
    const need=Math.round(70*Math.pow(Player.level,1.4));
    document.getElementById('xp-fill').style.width=(Player.xp/need*100)+'%';
    document.getElementById('lvl').textContent=`⭐ Lv ${Player.level}`;
    const mins=Math.floor(Weather.time*1440);
    const hh=String(Math.floor(mins/60)).padStart(2,'0'),mm=String(mins%60).padStart(2,'0');
    const icon=Weather.nightF>0.5?'🌙':'☀️';
    document.getElementById('clock').textContent=`${Weather.rain>0.4?'🌧️ ':''}${icon} ${hh}:${mm}`;
    document.getElementById('daynum').textContent='Hari '+Weather.day;
    this.renderCompass();
    this.renderHotbar();
    this.renderActiveSkills();
    this.renderTeam();
  },

  /* ================= KOMPAS ARAH MATA ANGIN =================
     Strip 360° dibangun sekali (label N/NE/E/... + garis derajat), lalu tiap
     frame hanya digeser (translateX) sesuai yaw kamera. Penanda ▼ di tengah
     menunjukkan arah pandang saat ini. */
  compassBuilt:false,
  COMPASS_W:168,          // lebar jendela kompas (px) — samakan dgn CSS
  COMPASS_PPD:1.6,        // piksel per derajat
  renderCompass(){
    const strip=document.getElementById('compass-strip');
    if(!strip)return;
    const PPD=this.COMPASS_PPD;
    if(!this.compassBuilt){
      /* label tiap 15°, huruf mata angin tiap 45°; strip dibuat 3× (−360..+720)
         supaya bisa digeser mulus tanpa terlihat ujungnya */
      const CARD={0:'N',45:'NE',90:'E',135:'SE',180:'S',225:'SW',270:'W',315:'NW'};
      let html='';
      for(let rep=-1;rep<=1;rep++){
        for(let deg=0;deg<360;deg+=15){
          const c=CARD[deg];
          const w=(15*PPD);
          html+=`<span class="${c?'card':'tick'}" style="width:${w}px">`+
                `${c||'·'}</span>`;
        }
      }
      strip.innerHTML=html;
      this.compassBuilt=true;
    }
    /* yaw kamera → derajat kompas (0=N). Cam.yaw adalah arah pandang. */
    let yaw=(typeof Cam!=='undefined'&&Cam.yaw!==undefined)?Cam.yaw:0;
    let deg=(yaw*180/Math.PI)%360;if(deg<0)deg+=360;
    /* offset: strip dimulai dari -360°, jadi titik 0° ada di 360*PPD */
    const off=360*PPD+deg*PPD-this.COMPASS_W/2;
    strip.style.transform=`translateX(${-off}px)`;
  },

  /* ================= REKAN TIM =================
     Ikon rekan ditaruh di #team (kanan atas, di bawah panel jam). Tiap ikon
     menampilkan emoji peran, level, dan bilah HP kecil; diklik untuk membuka
     panel kontrol rekan. Isi HUD hanya digambar ulang bila ada perubahan agar
     tidak membebani frame di perangkat mobile. */
  teamSig:'',npcSel:null,
  renderTeam(){
    const root=document.getElementById('team');if(!root)return;
    const team=(typeof NPCS!=='undefined')?NPCS.team.filter(n=>!n.dead):[];
    const sig=team.map(n=>`${n.id}:${n.level}:${Math.ceil(n.hp)}:${n.order}:${n.aggr===false?0:1}`).join('|');
    if(sig===this.teamSig)return;
    this.teamSig=sig;
    root.innerHTML='';
    for(const n of team){
      const d=document.createElement('div');
      d.className='tmate'+(n.order==='gather'?' busy':'');
      d.innerHTML=`<span class="tface">${n.role.e}</span>`+
        `<span class="tlv">Lv${n.level}</span>`+
        `<div class="thp"><i style="width:${Math.max(0,n.hp/n.maxhp*100)}%"></i></div>`+
        `<span class="tmode" title="${n.aggr===false?'Pasif':'Agresif'}">${n.aggr===false?'🕊️':'⚔️'}</span>`+
        `<span class="tord">${n.order==='gather'?'⛏️':n.order==='wait'?'⏸️':'👣'}</span>`;
      const fn=e=>{e.preventDefault();e.stopPropagation();this.openNpc(n);};
      d.addEventListener('touchstart',fn,{passive:false});
      d.addEventListener('click',fn);
      root.appendChild(d);
    }
  },
  openNpc(n){
    this.npcSel=n;
    this.open='npc';this.picked=null;
    this.renderNpcPanel();
    this.syncPanels();
  },
  /* Panel kontrol rekan: stat, skill pasif, perlengkapan, perintah, tas rekan,
     dan daftar item pemain yang bisa diberikan. */
  renderNpcPanel(){
    const body=document.getElementById('npc-body');if(!body)return;
    const n=this.npcSel;
    if(!n||n.dead||!NPCS.team.includes(n)){
      body.innerHTML='<p class="tip">Tidak ada rekan yang dipilih. '+
        'Dekati penduduk desa lalu tekan <b>G</b> untuk merekrut '+
        `(maks ${CFG.NPC.TEAM_MAX} rekan).</p>`;
      return;
    }
    const sk=n.role.skill;
    const need=npcXpNeed(n.level);
    let h=`<div class="npc-head">
      <span class="npc-face">${n.role.e}</span>
      <div class="npc-meta">
        <b>${n.name}</b> <span class="npc-lv">Lv ${n.level}</span>
        <div class="npc-bar"><i style="width:${n.hp/n.maxhp*100}%"></i>
          <span>${Math.ceil(n.hp)}/${n.maxhp} HP</span></div>
        <div class="npc-bar xp"><i style="width:${n.xp/need*100}%"></i>
          <span>${n.xp}/${need} XP</span></div>
      </div>
    </div>
    <div class="npc-stats">
      <span>⚔️ ATK ${Math.round(NPCS.npcDmg(n))}</span>
      <span>🛡️ DEF ${Math.round(NPCS.npcDef(n)*100)}%</span>
      <span>👣 ${n.speed.toFixed(1)}</span>
    </div>
    <div class="npc-skill">${sk.e} <b>${sk.name}</b> — ${sk.desc}</div>`;

    /* mode bertarung: aggressive / passive */
    h+='<div class="sub">Mode bertarung</div><div class="npc-cmd">'+
      `<button data-mode="aggressive" class="${n.aggr===false?'':'on'}">⚔️ Agresif</button>`+
      `<button data-mode="passive" class="${n.aggr===false?'on':''}">🕊️ Pasif</button></div>`+
      `<p class="tip">Agresif: menyerang monster yang mendekatimu. `+
      `Pasif: tidak menyerang sendiri; hanya mengejar target yang kamu serang sampai target mati.</p>`;

    /* perlengkapan yang sedang dipakai rekan (masih termasuk senjata rekan) */
    h+='<div class="sub">Perlengkapan rekan</div><div class="npc-gear">';
    for(const s of (typeof NPC_GEAR_SLOTS!=='undefined'?NPC_GEAR_SLOTS:ARMOR_SLOTS)){
      const id=n.gear[s.id];
      h+=`<div class="ngear" data-slot="${s.id}" title="${
        id?ITEMS[id].n:'Kosong — beri item dari daftar bawah'}">`+
        `<span class="ge">${id?ITEMS[id].e:s.e}</span>`+
        `<span class="gn">${s.name}</span></div>`;
    }
    h+='</div>';

    /* perintah */
    const cmds=[['follow','👣 Ikuti aku'],['gather','⛏️ Cari resource'],
      ['wait','⏸️ Tunggu di sini']];
    if(n.role.id==='farmer')cmds.push(['farm','🌾 Farming']);
    h+='<div class="sub">Perintah</div><div class="npc-cmd">'+
      cmds.map(([k,t])=>
        `<button data-order="${k}" class="${n.order===k?'on':''}">${t}</button>`).join('')+
      '<button data-dismiss="1" class="danger">🚪 Bubarkan</button></div>'+
      `<p class="tip">Saat diperintah mencari resource, rekan hanya memanen `+
      `kayu, batu, dan bijih dalam radius ${CFG.NPC.GATHER_R} blok dari posisimu.`+
      (n.role.id==='farmer'?' Untuk farming, beri benih di tas rekan.': '')+`</p>`;

    /* tas rekan */
    h+='<div class="sub">Tas rekan (klik untuk ambil)</div><div class="grid npc-bag">';
    for(let i=0;i<n.bag.length;i++){
      const s=n.bag[i];
      h+=`<div class="slot nb" data-take="${i}">`+
        (s?`<span class="emo">${ITEMS[s.id].e}</span><span class="cnt">${s.n>1?s.n:''}</span>`:'')+
        '</div>';
    }
    h+='</div>';

    /* item pemain yang bisa diberikan */
    h+='<div class="sub">Beri item (klik item milikmu)</div><div class="grid npc-give">';
    const push=(arr,g)=>{
      for(let i=0;i<arr.length;i++){
        const s=arr[i];if(!s)continue;
        const it=ITEMS[s.id];
        const kind=it.food?'🍖':(it.weapon?'⚔️':(it.armor?'🛡️':'📦'));
        h+=`<div class="slot ng" data-give="${g}:${i}" title="${it.n} ${kind}">`+
          `<span class="emo">${it.e}</span><span class="cnt">${s.n>1?s.n:''}</span></div>`;
      }
    };
    push(RPG.hotbar,0);push(RPG.bag,1);
    h+='</div>';
    body.innerHTML=h;

    /* --- binding aksi panel --- */
    body.querySelectorAll('[data-order]').forEach(b=>
      b.addEventListener('click',()=>NPCS.setOrder(n,b.dataset.order)));
    body.querySelectorAll('[data-mode]').forEach(b=>
      b.addEventListener('click',()=>NPCS.setMode(n,b.dataset.mode)));
    const dis=body.querySelector('[data-dismiss]');
    if(dis)dis.addEventListener('click',()=>{NPCS.dismiss(n);this.toggle('npc');});
    body.querySelectorAll('[data-take]').forEach(b=>
      b.addEventListener('click',()=>{
        if(this._npcSkipClick){this._npcSkipClick=false;return;}
        NPCS.takeFromBag(n,+b.dataset.take);
      }));
    body.querySelectorAll('[data-give]').forEach(b=>
      b.addEventListener('click',()=>{
        const[g,i]=b.dataset.give.split(':').map(Number);
        const arr=g===0?RPG.hotbar:RPG.bag;
        const s=arr[i];if(!s)return;
        const it=ITEMS[s.id];
        /* senjata/armor selalu 1 & langsung dipakai — tidak perlu dialog jumlah */
        if(it.weapon||it.armor){NPCS.give(n,g,i,1);return;}
        this.modal({
          icon:it.e,
          text:`Berapa <b>${it.n}</b> untuk ${n.name}?`,
          input:{value:1,min:1,max:s.n},
          okLabel:'✔ Beri',cancelLabel:'✖ Batal',
          onOk:(cnt)=>{if(cnt>0)NPCS.give(n,g,i,cnt);}
        });
      }));
    /* klik slot perlengkapan = lepas & kembalikan ke tas pemain */
    body.querySelectorAll('.ngear').forEach(b=>
      b.addEventListener('click',()=>{
        const sl=b.dataset.slot,id=n.gear[sl];
        if(!id)return;
        n.gear[sl]=null;RPG.addItem(id,1);
        this.toast(`${ITEMS[id].e} ${ITEMS[id].n} diambil kembali`);
        this.renderNpcPanel();this.renderAll();
      }));
  },

  /* ================= PANEL TOKO / PEDAGANG =================
     Beli item dengan koin (SHOP_GOODS), jual item dari tas untuk dapat koin
     (harga = sellPrice). Koin adalah mata uang RPG.coin. */
  renderShop(){
    const coinEl=document.getElementById('shop-coin');
    if(coinEl)coinEl.textContent=RPG.coin;
    const merchant=this.shopNpc;
    const stock=(merchant&&merchant.shop)?merchant.shop:[];
    /* --- daftar beli (stok acak pedagang ini) --- */
    const buyEl=document.getElementById('shop-buy');
    if(buyEl){
      buyEl.innerHTML='';
      if(!stock.length)
        buyEl.innerHTML='<p class="tip">Stok pedagang ini kosong.</p>';
      for(const g of stock){
        const isBag=g.id==='bag';
        const it=isBag?BAG_ITEM:ITEMS[g.id];
        if(!it)continue;
        const soldOut=g.n<=0;
        const afford=RPG.coin>=g.price;
        const d=document.createElement('div');
        d.className='shop-row';
        const rar=!isBag&&it.rarity&&RARITY[it.rarity]
          ?` <i style="color:${RARITY[it.rarity].css}">${RARITY[it.rarity].n}</i>`:'';
        const info=isBag
          ?`<b>${it.n}</b> <i>+${RPG.BAG_PER_TIER} slot tas</i> <i>(tier ${RPG.bagTier}/${RPG.BAG_MAX_TIER})</i>`
          :`<b>${it.n}</b>${rar}${g.n>1?` <i>×${g.n}</i>`:''}`;
        d.innerHTML=`<span class="s-ico">${it.e}</span>`+
          `<div class="s-info">${info}</div>`+
          `<button class="s-buy" ${(afford&&!soldOut)?'':'disabled'}>`+
          `${soldOut?'Habis':'🪙 '+g.price}</button>`;
        if(!soldOut)d.querySelector('.s-buy').addEventListener('click',()=>this.shopBuy(g));
        buyEl.appendChild(d);
      }
    }
    /* --- daftar jual: semua item di hotbar+tas --- */
    const sellEl=document.getElementById('shop-sell-bag');
    if(sellEl){
      sellEl.innerHTML='';
      const push=(arr)=>arr.forEach((s,idx)=>{
        if(!s)return;
        const it=ITEMS[s.id],price=sellPrice(s.id);
        const d=document.createElement('div');
        d.className='slot sell';
        d.title=`${it.n} — klik untuk menjual (punya ×${s.n}, ${price} 🪙/item)`;
        d.innerHTML=`${it.e}<span class="cnt">${s.n>1?s.n:''}</span><span class="pr">${price}🪙</span>`;
        if(it.rarity&&RARITY[it.rarity]){d.classList.add('r-'+it.rarity);d.style.borderColor=RARITY[it.rarity].css;}
        d.addEventListener('click',()=>this.shopSell(arr,idx));
        sellEl.appendChild(d);
      });
      push(RPG.hotbar);push(RPG.bag);
      if(!sellEl.childElementCount)
        sellEl.innerHTML='<p class="tip">Tasmu kosong — tidak ada yang bisa dijual.</p>';
    }
  },
  /* beli satu entri dari stok pedagang (g = {id,price,n}); kurangi stok */
  shopBuy(g){
    if(!g||g.n<=0)return;
    /* upgrade tas: tambah 7 slot, maks 5 tingkat */
    if(g.id==='bag'){
      if(RPG.bagTier>=RPG.BAG_MAX_TIER){this.toast('🎒 Tas sudah maksimum');return;}
      if(!RPG.spendCoin(g.price)){this.toast('🪙 Koin tidak cukup');return;}
      RPG.expandBag();g.n=0;
      this.toast(`🎒 Tas diperluas! +${RPG.BAG_PER_TIER} slot (tier ${RPG.bagTier})`);
      Sfx.craft();
      this.renderShop();this.renderAll();RPG.save();
      return;
    }
    if(!RPG.spendCoin(g.price)){this.toast('🪙 Koin tidak cukup');return;}
    const left=RPG.addItem(g.id,1);
    if(left>0){ /* tas penuh → koin dikembalikan, item jatuh ke tanah */
      RPG.coin+=g.price;
      World.dropItem(Player.pos.x,Player.pos.y+0.6,Player.pos.z,g.id,1);
      this.toast('🎒 Tas penuh — item dijatuhkan, koin kembali');
    }else{
      g.n--;
      this.toast(`🏪 Membeli ${ITEMS[g.id].e} ${ITEMS[g.id].n} (−${g.price} 🪙)`);
    }
    Sfx.craft();
    this.renderShop();this.renderAll();RPG.save();
  },
  /* klik item di daftar jual → buka dialog pilihan jumlah (input manual +
     tombol "Semua"), bukan langsung menjual seluruhnya. */
  shopSell(arr,idx){
    const s=arr[idx];if(!s)return;
    const it=ITEMS[s.id],price=sellPrice(s.id),id=s.id;
    this.modal({
      icon:it.e,
      text:`Jual <b style="color:#fff">${it.n}</b>?<br>`+
        `<span style="font-size:12px;opacity:.85">${price} 🪙 / item · kamu punya ×${s.n}</span>`,
      input:{value:1,min:1,max:s.n},
      allLabel:'💰 Semua',
      okLabel:'✔ Jual',
      cancelLabel:'✖ Batal',
      onOk:(n)=>{
        const cur=arr[idx];
        if(!cur||cur.id!==id)return;      // slot berubah sejak modal dibuka
        this.doSell(arr,idx,n);
      },
    });
  },
  /* jual `qty` buah item dari slot arr[idx]; qty di-clamp ke stok tersedia. */
  doSell(arr,idx,qty){
    const s=arr[idx];if(!s)return;
    qty=clamp(Math.floor(qty)||0,1,s.n);
    const price=sellPrice(s.id),total=price*qty;
    if(qty>=s.n)arr[idx]=null;else s.n-=qty;
    RPG.addCoin(total,true);
    this.toast(`💰 Menjual ${ITEMS[s.id].e} ${ITEMS[s.id].n} ×${qty} → +${total} 🪙`);
    Sfx.pickup();
    this.renderShop();this.renderAll();RPG.save();
  },

  /* skill aktif yang sudah dipelajari, urut sesuai daftar SKILLS.
     Urutan ini dipakai bersama oleh tombol HUD dan tombol keyboard Q/E/R/T. */
  activeList(){return SKILLS.filter(s=>s.active&&RPG.skillVal(s.id));},
  /* dipanggil Input saat menekan Q/E/R/T (slot 0–3) */
  useActiveSlot(i){
    const s=this.activeList()[i];
    if(!s){UI.toast('Belum ada skill aktif di slot ini — pelajari di 🌟 Skill');return;}
    RPG.useActive(s.id);
  },
  renderActiveSkills(force=false){
    const mob=document.getElementById('m-active');
    const bar=document.getElementById('skillbar');
    const list=this.activeList();
    const sig=list.map(s=>s.id).join();
    const changed=force||sig!==this.activeSig;
    if(changed)this.activeSig=sig;

    /* tombol bundar khusus layar sentuh */
    if(mob){
      if(changed){
        mob.innerHTML='';
        for(const s of list){
          const b=document.createElement('button');
          b.className='m-active-btn';b.dataset.id=s.id;
          b.innerHTML=`${s.icon}<span></span>`;
          const fn=e=>{e.preventDefault();e.stopPropagation();RPG.useActive(s.id);};
          b.addEventListener('touchstart',fn,{passive:false});
          b.addEventListener('click',fn);
          mob.appendChild(b);
        }
      }
      mob.querySelectorAll('button').forEach(b=>{
        const cd=RPG.activeCD[b.dataset.id]||0;
        b.classList.toggle('cooling',cd>0);
        b.querySelector('span').textContent=cd>0?Math.ceil(cd):'';
      });
    }

    /* bar skill PC: ikon + label tombol keyboard + hitung mundur cooldown */
    if(bar){
      if(changed){
        bar.innerHTML='';
        list.forEach((s,i)=>{
          const key=(Input.SKILL_KEYS[i]||'').replace('Key','');
          const b=document.createElement('button');
          b.className='sk-btn';b.dataset.id=s.id;
          b.title=`${s.name} — ${s.desc}${key?` (${key})`:''}`;
          b.innerHTML=`<span class="key">${key||'-'}</span>${s.icon}<span class="cd"></span>`;
          b.addEventListener('click',e=>{e.preventDefault();RPG.useActive(s.id);});
          bar.appendChild(b);
        });
      }
      bar.querySelectorAll('button').forEach(b=>{
        const cd=RPG.activeCD[b.dataset.id]||0;
        b.classList.toggle('cooling',cd>0);
        b.querySelector('.cd').textContent=cd>0?Math.ceil(cd):'';
      });
    }

    /* UI Studio: tombol skill baru harus ikut memakai layout custom */
    if(changed&&typeof UIStudio!=='undefined'){
      UIStudio.applyMode(UIStudio.active?UIStudio.tab:UIStudio.defaultMode());
      if(UIStudio.active)UIStudio.refreshHandles();
    }
  },
  renderHotbar(){
    for(let i=0;i<7;i++){
      const s=RPG.hotbar[i],el=this.hotEls[i];
      el.classList.toggle('sel',i===RPG.sel);
      el.querySelector('.emo').textContent=s?ITEMS[s.id].e:'';
      el.querySelector('.cnt').textContent=s&&s.n>1?s.n:'';
    }
    this.updateAttackIcon();
  },
  /* icon tombol serang mobile mengikuti item yang dipegang:
     makanan = icon makan, senjata = pedang, resource/alat lain = tangan kosong */
  updateAttackIcon(){
    const btn=document.getElementById('m-attack');
    if(!btn)return;
    const s=RPG.hotbar[RPG.sel];
    const it=s&&ITEMS[s.id];
    let icon='👊';
    if(it&&it.food)icon=it.e;
    else if(it&&it.weapon)icon='⚔️';
    else if(it&&it.tool)icon=it.e;
    else if(!it)icon='👊';
    else icon='👊';
    if(this._atkIcon!==icon){
      this._atkIcon=icon;
      btn.textContent=icon;
    }
  },
  /* ---------- panel ---------- */
  PANELS:['bag','skills','craft','help','npc','chest','shop','term'],
  toggle(name){
    if(this.open===name)this.open=null;
    else{
      this.open=name;this.picked=null;
      /* Render dibungkus try/catch: bila satu panel gagal digambar, state
         this.open tetap konsisten dan syncPanels() di bawah tetap jalan.
         Tanpa ini, error di renderCraft membuat panel tidak pernah tampil
         sekaligus mengunci input (open='craft' padahal panel tersembunyi),
         sehingga tombol serang ikut mati. */
      try{
        if(name==='bag')this.renderBag();
        if(name==='skills')this.renderSkills();
        if(name==='craft')this.renderCraft();
        if(name==='npc')this.renderNpcPanel();
        if(name==='chest')this.renderChest();
        if(name==='shop')this.renderShop();
        /* terminal rahasia: isinya dibangun dinamis oleh modul chat */
        if(name==='term'&&typeof Chat!=='undefined')Chat.renderTerm();
      }catch(err){
        console.error('UI.toggle('+name+') gagal:',err);
        this.toast('⚠️ Panel '+name+' bermasalah');
      }
    }
    /* menutup panel peti = melepas peti yang sedang dibuka */
    if(this.open!=='chest')Furni.chest=null;
    this.syncPanels();
  },

  /* satu tempat untuk menyembunyikan/menampilkan panel sesuai this.open */
  syncPanels(){
    for(const n of this.PANELS){
      const el=document.getElementById('panel-'+n);
      if(el)el.classList.toggle('hidden',this.open!==n);
    }
  },
  closeAll(){this.open=null;this.syncPanels();},

  slotClick(i,g){
    const arr=g===0?RPG.hotbar:RPG.bag;
    if(this.picked===null){
      if(arr[i])this.picked={i,g};
    }else{
      this.moveStack(this.picked.g,this.picked.i,g,i);
      this.picked=null;
    }
    this.renderBag();this.renderHotbar();
  },
  renderBag(){
    const mk=(arr,g,el)=>{
      el.innerHTML='';
      arr.forEach((s,i)=>{
        const d=document.createElement('div');d.className='slot';d.dataset.i=i;d.dataset.g=g;
        if(this.picked&&this.picked.i===i&&this.picked.g===g)d.classList.add('picked');
        if(s){
          const it=ITEMS[s.id];
          d.innerHTML=`${it.e}<span class="cnt">${s.n>1?s.n:''}</span>`;
          d.title=this.itemTip(s.id);
          /* bingkai slot memakai warna rarity agar item langka mudah dikenali */
          if(it.rarity&&RARITY[it.rarity]){
            d.classList.add('r-'+it.rarity);
            d.style.borderColor=RARITY[it.rarity].css;
          }
        }

        el.appendChild(d);
      });
    };
    mk(RPG.hotbar,0,document.getElementById('bag-hotbar'));
    mk(RPG.bag,1,document.getElementById('bag-grid'));
    this.renderEquip();
  },
  /* ================= PANEL PETI =================
     Dua grid: isi peti & isi tas pemain. Item bisa DIKLIK (pindah seluruh
     tumpukan) atau DI-DRAG dua arah antar grid (lihat initChestDrag). Semua
     state ada di objek peti (Furni.chest). */
  renderChest(){
    const f=Furni.chest;
    const gEl=document.getElementById('chest-grid');
    const bEl=document.getElementById('chest-bag');
    const nEl=document.getElementById('chest-num');
    if(!gEl||!bEl)return;
    if(!f||!f.inv){
      gEl.innerHTML='';bEl.innerHTML='';
      if(nEl)nEl.textContent='0/0';
      return;
    }
    const deco=(d,it)=>{
      if(it.rarity&&RARITY[it.rarity]){
        d.classList.add('r-'+it.rarity);
        d.style.borderColor=RARITY[it.rarity].css;
      }
    };
    /* --- isi peti: data-cs = indeks slot peti --- */
    gEl.innerHTML='';
    f.inv.forEach((s,i)=>{
      const d=document.createElement('div');
      d.className='slot cs';d.dataset.cs=i;
      if(s){
        const it=ITEMS[s.id];
        d.innerHTML=`${it.e}<span class="cnt">${s.n>1?s.n:''}</span>`;
        d.title=this.itemTip(s.id)+'\nKlik = ambil · Seret ke tas = titip/ambil';
        deco(d,it);
        d.addEventListener('click',()=>{
          if(this._chestSkipClick){this._chestSkipClick=false;return;}
          Furni.chestTake(f,i);
        });
      }
      gEl.appendChild(d);
    });
    if(nEl)nEl.textContent=`${f.inv.filter(s=>s).length}/${f.inv.length}`;

    /* --- isi tas pemain: data-cg (0=hotbar,1=kantong) + data-ci --- */
    bEl.innerHTML='';
    const push=(arr,g)=>arr.forEach((s,i)=>{
      const d=document.createElement('div');
      d.className='slot cb';d.dataset.cg=g;d.dataset.ci=i;
      if(s){
        const it=ITEMS[s.id];
        d.innerHTML=`${it.e}<span class="cnt">${s.n>1?s.n:''}</span>`;
        d.title=this.itemTip(s.id)+'\nKlik = titip · Seret ke peti = titip';
        deco(d,it);
        d.addEventListener('click',()=>{
          if(this._chestSkipClick){this._chestSkipClick=false;return;}
          Furni.chestPut(f,arr,i);
        });
      }
      bEl.appendChild(d);
    });
    push(RPG.hotbar,0);push(RPG.bag,1);

    /* tombol titip semua: dipasang sekali saja */
    const all=document.getElementById('chest-all');
    if(all&&!all._bound){
      all._bound=true;
      all.addEventListener('click',()=>Furni.depositAll(Furni.chest));
    }
  },
  /* drag & drop dua arah antara grid peti (cs) dan grid tas pemain (cb).
     Seret item peti → tas = ambil; seret item tas → peti = titip.
     Seret keluar panel = konfirmasi buang (dari sumbernya). */
  initChestDrag(){
    const DEAD=8;
    let d=null;
    const panel=()=>document.getElementById('panel-chest');
    const cleanup=()=>{
      if(!d)return;
      if(d.ghost)d.ghost.remove();
      if(d.sl)d.sl.classList.remove('dragging');
      const p=panel();
      if(p)p.querySelectorAll('.drop-hint').forEach(e=>e.classList.remove('drop-hint'));
      d=null;
    };
    /* sumber: slot peti (cs) atau slot tas (cb) */
    document.body.addEventListener('pointerdown',e=>{
      if(this.open!=='chest')return;
      if(e.button)return;
      const sl=e.target.closest('.slot.cs,.slot.cb');
      if(!sl)return;
      const isChest=sl.classList.contains('cs');
      const f=Furni.chest;if(!f||!f.inv)return;
      let s;
      if(isChest)s=f.inv[+sl.dataset.cs];
      else{const arr=(+sl.dataset.cg)===0?RPG.hotbar:RPG.bag;s=arr[+sl.dataset.ci];}
      if(!s)return;
      d={sl,isChest,x0:e.clientX,y0:e.clientY,moved:false,ghost:null,pid:e.pointerId};
    });
    window.addEventListener('pointermove',e=>{
      if(!d||e.pointerId!==d.pid)return;
      if(!d.moved){
        if(Math.hypot(e.clientX-d.x0,e.clientY-d.y0)<DEAD)return;
        d.moved=true;
        const f=Furni.chest;
        const s=d.isChest?(f&&f.inv[+d.sl.dataset.cs]):
          (((+d.sl.dataset.cg)===0?RPG.hotbar:RPG.bag)[+d.sl.dataset.ci]);
        if(!s){cleanup();return;}
        d.ghost=document.createElement('div');d.ghost.className='drag-ghost';
        d.ghost.textContent=ITEMS[s.id].e;document.body.appendChild(d.ghost);
        d.sl.classList.add('dragging');
        this._chestSkipClick=true;
      }
      d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';
      const p=panel();if(!p)return;
      p.querySelectorAll('.drop-hint').forEach(el=>el.classList.remove('drop-hint'));
      const el=document.elementFromPoint(e.clientX,e.clientY);
      /* target hanya dari sisi berlawanan (peti↔tas) */
      const t=el&&(d.isChest?el.closest('.slot.cb'):el.closest('.slot.cs'));
      if(t)t.classList.add('drop-hint');
    });
    window.addEventListener('pointerup',e=>{
      if(!d||e.pointerId!==d.pid)return;
      if(d.moved){
        const f=Furni.chest;
        const el=document.elementFromPoint(e.clientX,e.clientY);
        const t=el&&(d.isChest?el.closest('.slot.cb'):el.closest('.slot.cs'));
        if(t&&f){
          if(d.isChest){
            /* peti → tas pemain */
            Furni.chestTake(f,+d.sl.dataset.cs);
          }else{
            /* tas → peti */
            const arr=(+d.sl.dataset.cg)===0?RPG.hotbar:RPG.bag;
            Furni.chestPut(f,arr,+d.sl.dataset.ci);
          }
        }else{
          /* keluar panel → konfirmasi buang dari sumber */
          const p=panel();
          if(!p||!el||!p.contains(el)){
            if(d.isChest){
              const s=f&&f.inv[+d.sl.dataset.cs];
              if(s)this.confirmDropChest(+d.sl.dataset.cs,s);
            }else{
              const arr=(+d.sl.dataset.cg)===0?RPG.hotbar:RPG.bag;
              const s=arr[+d.sl.dataset.ci];
              if(s)this.confirmDropPlayer(+d.sl.dataset.cg,+d.sl.dataset.ci,s);
            }
          }
        }
      }
      cleanup();
    });
    window.addEventListener('pointercancel',cleanup);
  },
  /* konfirmasi membuang item langsung dari peti */
  confirmDropChest(i,s){
    const f=Furni.chest;if(!f||!f.inv)return;
    const it=ITEMS[s.id];
    this.modal({
      icon:it.e,
      text:`Buang <b>${it.n}</b> dari peti ke tanah?`,
      input:{value:s.n,min:1,max:s.n},
      okLabel:'✔ Buang',cancelLabel:'✖ Batal',
      onOk:(cnt)=>{
        if(cnt<=0)return;
        const cur=f.inv[i];
        if(!cur||cur.id!==s.id)return;
        const take=Math.min(cnt,cur.n);
        cur.n-=take;
        if(cur.n<=0)f.inv[i]=null;
        World.dropItem(Player.pos.x,Player.pos.y+0.6,Player.pos.z,s.id,take);
        Furni.save();
        this.toast(`🗑️ Membuang ${it.e} ${it.n} ×${take} dari peti`);
        Sfx.click();
        this.renderChest();
      }
    });
  },

  /* ---------- tooltip item: rarity, stat senjata/armor, efek unik ---------- */
  itemTip(id){

    const it=ITEMS[id];
    if(!it)return '';
    const lines=[it.n];
    if(it.rarity&&RARITY[it.rarity])
      lines.push(`${RARITY[it.rarity].e} ${RARITY[it.rarity].n} (×${RARITY[it.rarity].mul.toFixed(2)})`);
    if(it.weapon){
      const w=it.weapon;
      lines.push(`⚔ ${w.dmg} damage · ${w.spd.toFixed(2)}× kecepatan`);
      lines.push(`🎯 ${Math.round(w.crit*100)}% kritikal · jangkauan ${w.reach}`);
      if(w.fx&&EFFECTS[w.fx])
        lines.push(`${EFFECTS[w.fx].e} ${EFFECTS[w.fx].n}: ${EFFECTS[w.fx].desc}`);
      lines.push('Klik kanan untuk memakai');
    }else if(it.armor){
      lines.push(`🛡 +${Math.round(it.armor.def*100)}% pertahanan`);
      if(it.armor.fx&&EFFECTS[it.armor.fx])
        lines.push(`${EFFECTS[it.armor.fx].e} ${EFFECTS[it.armor.fx].n}: ${EFFECTS[it.armor.fx].desc}`);

      lines.push('Klik kanan untuk memakai');
    }

    return lines.join('\n');
  },
  /* ---------- ringkasan stat item untuk kartu resep ----------
     Memakai helper global itemStats() (config.js) supaya angka yang tampil
     selalu sama dengan yang dipakai perhitungan RPG. Hasilnya "chip" kecil:
     +ATK, +DEF, bonus makanan, efek unik, dan tingkat rarity. */
  statChips(id){
    const it=ITEMS[id];
    if(!it)return '';
    const c=[];
    if(it.rarity&&RARITY[it.rarity]){
      const r=RARITY[it.rarity];
      c.push(`<span class="chip" style="color:${r.css};border-color:${r.css}">${r.e} ${r.n}</span>`);
    }
    for(const s of itemStats(id)){
      const label=s.v?`${s.k} ${s.v}`:s.k;
      c.push(`<span class="chip" style="color:${s.css};border-color:${s.css}"`+
        `${s.desc?` title="${s.desc}"`:''}>${s.e} ${label}</span>`);
    }
    return c.length?`<div class="stats">${c.join('')}</div>`:'';
  },
  /* ---------- slot perlengkapan (senjata + armor) ---------- */
  renderEquip(){
    const el=document.getElementById('equip-grid');
    if(!el)return;
    el.innerHTML='';
    for(const s of ARMOR_SLOTS){
      const id=RPG.equip[s.id];
      const d=document.createElement('div');
      d.className='slot eq'+(id?' filled':'');
      d.dataset.slot=s.id;
      if(id){
        const it=ITEMS[id];
        d.innerHTML=`<span class="lbl">${s.name}</span>${it.e}`;
        d.title=this.itemTip(id)+'\nKlik untuk melepas';
        if(it.rarity&&RARITY[it.rarity]){
          d.classList.add('r-'+it.rarity);
          d.style.borderColor=RARITY[it.rarity].css;
        }
      }else{
        d.innerHTML=`<span class="lbl">${s.name}</span><span class="ghost">${s.e}</span>`;
        d.title=`${s.name} kosong · klik kanan item di tas untuk memakainya`;
      }
      el.appendChild(d);
    }
    document.getElementById('def-num').textContent=Math.round(RPG.defense()*100)+'%';
    /* tampilkan damage senjata aktif bila elemennya tersedia */
    const dmgEl=document.getElementById('dmg-num');
    if(dmgEl)dmgEl.textContent=Math.round(RPG.weaponDmg());
  },

  renderAll(){
    this.renderHotbar();
    if(this.open==='bag')this.renderBag();
    if(this.open==='craft')this.renderCraft();
    this.renderEquip();
  },

  /* label & ikon tiap cabang untuk header pohon */
  BRANCH_META:{
    combat:{icon:'⚔️',name:'Combat'},
    move:{icon:'🏃',name:'Movement'},
    craft:{icon:'🛠️',name:'Crafting'},
    gather:{icon:'🧺',name:'Gather'},
  },
  /* SKILL TREE berbentuk pohon-akar: tiap branch digambar sebagai node yang
     saling terhubung garis sesuai prasyarat (req). Node disusun per "kedalaman"
     (root di atas), lalu garis lengkung digambar lewat overlay SVG setelah
     layout terukur (requestAnimationFrame). */
  renderSkills(){
    document.getElementById('sp-num').textContent=RPG.sp;
    const wrap=document.getElementById('branches');
    if(!wrap)return;
    wrap.innerHTML='';
    for(const br of['combat','move','craft','gather']){
      const sks=SKILLS.filter(s=>s.br===br);
      if(!sks.length)continue;
      const meta=this.BRANCH_META[br]||{icon:'🌿',name:br};
      const sec=document.createElement('div');
      sec.className='branch tree';
      sec.innerHTML=`<h3>${meta.icon} ${meta.name}</h3>`;
      const body=document.createElement('div');
      body.className='tree-body';

      /* --- hitung kedalaman tiap node dari root (BFS lewat req) --- */
      const ids=new Set(sks.map(s=>s.id));
      const depth={};
      for(const s of sks)if(!s.req||!ids.has(s.req))depth[s.id]=0; // root
      let changed=true;
      while(changed){
        changed=false;
        for(const s of sks){
          if(depth[s.id]!==undefined)continue;
          if(s.req&&depth[s.req]!==undefined){depth[s.id]=depth[s.req]+1;changed=true;}
        }
      }
      /* --- kelompokkan per baris kedalaman, lalu gambar node --- */
      const maxD=sks.reduce((a,s)=>Math.max(a,depth[s.id]||0),0);
      const nodeEl={};
      for(let d=0;d<=maxD;d++){
        const row=sks.filter(s=>(depth[s.id]||0)===d);
        if(!row.length)continue;
        const r=document.createElement('div');
        r.className='tree-row';
        for(const sk of row){
          const card=this.makeTreeNode(sk);
          nodeEl[sk.id]=card;
          r.appendChild(card);
        }
        body.appendChild(r);
      }
      /* overlay SVG untuk garis penghubung (di belakang node) */
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('class','tree-svg');
      body.appendChild(svg);
      sec.appendChild(body);
      wrap.appendChild(sec);
      /* gambar garis setelah panel tampil & layout terukur */
      requestAnimationFrame(()=>this.drawTreeLinks(body,svg,sks,nodeEl));
    }
    this.renderProficiency();
  },
  /* buat satu kartu node pohon (kompak); klik untuk mempelajari bila bisa */
  makeTreeNode(sk){
    const rank=RPG.skillVal(sk.id);
    const needSkill=sk.req&&RPG.skillVal(sk.req)<=0;
    const needProf=!RPG.meetsProf(sk);
    const locked=needSkill||needProf;
    const maxed=rank>=sk.max;
    const afford=RPG.sp>=sk.cost;
    const learnable=!locked&&!maxed&&afford;
    const d=document.createElement('div');
    let cls='tnode';
    if(maxed)cls+=' max';
    if(locked)cls+=' locked';
    if(needProf&&!needSkill&&!maxed)cls+=' proflock';
    if(learnable)cls+=' can';
    if(sk.active)cls+=' active';
    d.className=cls;
    d.dataset.id=sk.id;
    /* tooltip lengkap: efek + syarat + biaya */
    let tip=`${sk.name} · ${sk.active?'AKTIF':'Pasif'}\n${sk.desc}\n`;
    if(sk.req){const p=SKILLS.find(s=>s.id===sk.req);tip+='Butuh: '+(p?p.name:sk.req)+'\n';}
    if(sk.prof)tip+='📈 '+RPG.profReqText(sk)+'\n';
    tip+=`Biaya: ${sk.cost} SP`;
    d.title=tip;
    const badge=maxed?'✔ Maks':locked?(needProf?'📈 '+RPG.profReqText(sk):'🔒')
      :(sk.active?'⚡ ':'')+sk.cost+' SP';
    d.innerHTML=`<div class="t-ico">${sk.icon}</div>
      <div class="t-nm">${sk.name}</div>
      <div class="t-rk">Rank ${rank}/${sk.max}</div>
      <div class="t-badge">${badge}</div>`;
    if(learnable)
      d.addEventListener('click',e=>{e.stopPropagation();RPG.learn(sk.id);});
    return d;
  },
  /* gambar garis lengkung penghubung antar node (parent req -> child) */
  drawTreeLinks(body,svg,sks,nodeEl){
    const crect=body.getBoundingClientRect();
    if(!crect.width)return;                 // panel belum tampil
    const W=body.scrollWidth,H=body.scrollHeight;
    svg.setAttribute('width',W);svg.setAttribute('height',H);
    svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    svg.innerHTML='';
    for(const sk of sks){
      if(!sk.req||!nodeEl[sk.req]||!nodeEl[sk.id])continue;
      const p=nodeEl[sk.req].getBoundingClientRect();
      const c=nodeEl[sk.id].getBoundingClientRect();
      const x1=p.left+p.width/2-crect.left, y1=p.bottom-crect.top-3;
      const x2=c.left+c.width/2-crect.left, y2=c.top-crect.top+3;
      const learned=RPG.skillVal(sk.id)>0;
      const parentDone=RPG.skillVal(sk.req)>0;
      const profOk=RPG.meetsProf(sk);
      let cls='lk';
      if(learned)cls+=' on';
      else if(parentDone&&profOk)cls+=' avail';
      else if(!profOk)cls+=' prof';
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      const my=(y1+y2)/2;
      path.setAttribute('d',`M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`);
      path.setAttribute('class',cls);
      svg.appendChild(path);
    }
  },
  /* PROFICIENCY (ala Durango): bar level per sub-skill, naik otomatis dari
     melakukan aksi. Digambar ulang saat panel skill dibuka & saat naik level. */
  renderProficiency(){
    const el=document.getElementById('prof-list');
    if(!el||typeof Prof==='undefined'||typeof SUBSKILLS==='undefined')return;
    el.innerHTML='';
    for(const id in SUBSKILLS){
      const s=SUBSKILLS[id];
      const lv=Prof.level(id),xp=Prof.xp[id]||0,need=Prof.need(id);
      const maxed=lv>=s.max;
      const pct=maxed?100:Math.min(100,Math.round(100*xp/need));
      const d=document.createElement('div');
      d.className='prof-row';
      d.innerHTML=`<div class="prof-nm"><span>${s.icon} ${s.name}</span>`+
        `<b>${maxed?'Lv MAX':'Lv '+lv}</b></div>`+
        `<div class="prof-track"><div style="width:${pct}%"></div></div>`;
      el.appendChild(d);
    }
  },
  /* kategori resep: kelompokkan berdasarkan jenis item hasil */
  craftCategory(it){
    if(it.food)return{k:'food',t:'🍖 Makanan & Obat'};
    if(it.weapon)return{k:'weapon',t:'⚔️ Senjata'};
    if(it.armor)return{k:'armor',t:'🛡️ Armor'};
    if(it.place)return{k:'furni',t:'🪑 Furnitur'};
    return{k:'mat',t:'📦 Bahan & Lainnya'};
  },
  /* kategori crafting yang sedang dipilih (tab) */
  craftTab:'food',
  CRAFT_TABS:[
    {k:'food',  t:'🍖 Makanan'},
    {k:'weapon',t:'🗡️ Senjata'},
    {k:'armor', t:'🛡️ Armor'},
    {k:'furni', t:'🪑 Furnitur'},
    {k:'mat',   t:'📦 Bahan'},
  ],
  renderCraft(){
    /* kelompokkan resep per kategori agar mudah dicari */
    const groups={food:[],weapon:[],armor:[],furni:[],mat:[]};
    for(const r of RECIPES){
      /* resep dengan item/bahan tak dikenal dilewati, bukan melempar error */
      if(!ITEMS[r.out])continue;
      if(Object.keys(r.need).some(id=>!ITEMS[id]))continue;
      groups[this.craftCategory(ITEMS[r.out]).k].push(r);
    }
    /* ---------- PANEL TAB kategori (terpisah di bagian atas) ---------- */
    const tabEl=document.getElementById('craft-tabs');
    if(tabEl){
      tabEl.innerHTML='';
      for(const tb of this.CRAFT_TABS){
        const n=groups[tb.k].length;
        const b=document.createElement('button');
        b.className='craft-tab'+(this.craftTab===tb.k?' active':'');
        b.innerHTML=tb.t+(n?` <i>${n}</i>`:'');
        b.disabled=!n;
        b.addEventListener('click',()=>{
          this.craftTab=tb.k;this.renderCraft();Sfx.click&&Sfx.click();
        });
        tabEl.appendChild(b);
      }
      /* bila tab aktif kosong, pindah ke tab pertama yang berisi */
      if(!groups[this.craftTab].length){
        const first=this.CRAFT_TABS.find(t=>groups[t.k].length);
        if(first&&first.k!==this.craftTab){this.craftTab=first.k;return this.renderCraft();}
      }
    }
    /* ---------- daftar resep untuk tab yang dipilih saja ---------- */
    const el=document.getElementById('recipes');el.innerHTML='';
    {
      const list=groups[this.craftTab]||[];
      if(!list.length){
        const p=document.createElement('p');p.className='tip';
        p.textContent='Belum ada resep di kategori ini.';
        el.appendChild(p);
      }
      for(const r of list){
        const unlocked=RPG.canRecipe(r);
        const can=unlocked&&Object.keys(r.need).every(id=>RPG.countItem(id)>=r.need[id]);
        const needStr=Object.keys(r.need).map(id=>{
          const have=RPG.countItem(id);
          const cls=have>=r.need[id]?'ok':'no';
          return `<span class="${cls}">${ITEMS[id].e}${r.need[id]} (punya ${have})</span>`;
        }).join(' ');
        const d=document.createElement('div');d.className='recipe';
        const statStr=unlocked?this.statChips(r.out):'';
        /* input jumlah + tombol Buat. Jumlah maksimum = perkiraan dari bahan
           yang paling terbatas (dihitung saat klik agar selalu akurat). */
        d.innerHTML=`<div class="out">${unlocked?ITEMS[r.out].e:'🔒'}</div>
          <div class="info"><div class="nm">${r.name}${unlocked?'':' — butuh '+RPG.recipeReqText(r)}</div>
          ${statStr}
          <div class="need">${unlocked?needStr:'🔒 '+RPG.recipeReqText(r)}</div></div>
          ${unlocked?'<input type="number" class="craft-qty" min="1" max="64" value="1">':''}
          <button ${can?'':'disabled'}>${unlocked?'Buat':'🔒'}</button>`;
        if(unlocked)d.querySelector('.out').title=this.itemTip(r.out);
        if(can){
          const btn=d.querySelector('button');
          const qtyEl=d.querySelector('.craft-qty');
          if(qtyEl){
            qtyEl.addEventListener('click',e=>e.stopPropagation());
            qtyEl.addEventListener('keydown',e=>e.stopPropagation());
          }
          btn.addEventListener('click',()=>{
            const q=qtyEl?clamp(Math.floor(+qtyEl.value)||1,1,64):1;
            RPG.craft(r,q);
          });
        }
        el.appendChild(d);
      }
    }
  },
};
