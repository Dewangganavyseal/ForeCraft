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
        const isHead=n.nodeType===1&&(n.tagName==='H2'||n.id==='craft-tabs'||n.id==='sp-info');
        if(isHead)keep.push(n);else body.appendChild(n);
      });
      p.appendChild(body);                 // body di bawah header/tab
    });

    const hb=document.getElementById('hotbar');
    for(let i=0;i<7;i++){
      const d=document.createElement('div');d.className='hslot';
      d.innerHTML=`<span class="key">${i+1}</span><span class="emo"></span><span class="cnt"></span><span class="lvl"></span>`;
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
    /* menu kiri panel tas: Bag / Pet */
    document.querySelectorAll('.bag-menu-btn').forEach(b=>
      b.addEventListener('click',e=>{e.preventDefault();this.setBagPage(b.dataset.bagpage);}));
    window.addEventListener('resize',()=>this.positionBagMenu());
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
      /* pedang maupun armor bisa dipakai lewat klik kanan
         (g & i diteruskan agar level tempa stack ikut terbawa) */
      if(s&&(ITEMS[s.id].armor||ITEMS[s.id].weapon))RPG.equipItem(s.id,+sl.dataset.g,+sl.dataset.i);

    });

    document.getElementById('btn-respawn').addEventListener('click',()=>{Player.respawn();});
    this.initDrag();
    this.initNpcDrag();
    this.initChestDrag();
    this.renderHotbar();
    this.renderActiveSkills(true);
    this.initButtonImages();
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
    /* ---------- TOOLTIP SAAT TAP (MOBILE) ----------
       Di desktop nama item sudah terlihat lewat atribut title saat hover.
       Di mobile tidak ada hover; solusinya: TAP biasa (lepas sebelum HOLD)
       menampilkan gelembung tooltip kecil berisi nama item di atas slot.
       TAP lama (≥HOLD) tetap untuk drag. Tooltip menutup saat tap berikutnya. */
    let tip=null;
    const hideTip=()=>{if(tip){tip.remove();tip=null;}};
    const showTip=(sl)=>{
      hideTip();
      const g=+sl.dataset.g,i=+sl.dataset.i;
      const arr=g===0?RPG.hotbar:RPG.bag;
      const s=arr[i];
      if(!s||!ITEMS[s.id])return;
      const it=ITEMS[s.id];
      const r=sl.getBoundingClientRect();
      tip=document.createElement('div');
      tip.className='slot-tip';
      tip.innerHTML=`<b>${it.e} ${it.n}</b>`+(s.lvl?` <i>+${s.lvl}</i>`:'');
      document.body.appendChild(tip);
      /* posisi: tepat di atas slot, terpusat; bila mentok layar atas → di bawah */
      const w=tip.offsetWidth,h=tip.offsetHeight;
      let tx=r.left+r.width/2-w/2, ty=r.top-h-8;
      if(ty<4)ty=r.bottom+8;
      tx=Math.max(4,Math.min(window.innerWidth-w-4,tx));
      tip.style.left=tx+'px';tip.style.top=ty+'px';
      /* tutup saat tap di mana pun (kecuali pada tooltip itu sendiri) */
      const off=ev=>{if(tip&&!tip.contains(ev.target))hideTip();};
      setTimeout(()=>document.addEventListener('pointerdown',off,{once:true}),0);
    };
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
      /* ikon yang sama dengan slot: <img> PNG kustom bila ada, emoji bila
         tidak — dulu selalu emoji sehingga item bergambar terlihat berubah */
      d.ghost.innerHTML=this.itemIcon(s.id);
      document.body.appendChild(d.ghost);
      this.applyItemIcons(d.ghost);
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
      }else if(e.pointerType==='touch'){
        /* TAP biasa (bukan scroll, bukan drag): tampilkan tooltip nama item */
        const dist=Math.hypot(e.clientX-d.x0,e.clientY-d.y0);
        if(dist<DEAD)showTip(d.sl);
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
      icon:this.itemIcon(s.id),
      text:`Buang <b>${it.n}</b> ke tanah?`,
      input:{value:s.n,min:1,max:s.n},
      okLabel:'✔ Buang',cancelLabel:'✖ Batal',
      onOk:(n)=>{
        if(n<=0)return;
        const arr=g===0?RPG.hotbar:RPG.bag;
        const cur=arr[i];
        if(!cur||cur.id!==s.id)return;          // slot berubah sejak modal dibuka
        const take=Math.min(n,cur.n);
        /* data per-instance ikut jatuh: Log Pass yang dibuang TETAP menyimpan
           tandanya, dan pedang tempa tetap membawa levelnya */
        const inst={owner:true};
        if(cur.lvl)inst.lvl=cur.lvl;
        if(cur.mark)inst.mark=cur.mark;
        cur.n-=take;
        if(cur.n<=0)arr[i]=null;
        /* jatuhkan di depan pemain supaya mudah dipungut kembali; owner=true
           memberi jeda ambil agar tidak langsung tersedot balik ke tas */
        const fx=Player.pos.x+Math.sin(Player.facing)*1.2;
        const fz=Player.pos.z+Math.cos(Player.facing)*1.2;
        World.dropItem(fx,Player.pos.y+0.6,fz,s.id,take,inst);
        this.toast(`🗑️ Membuang ${this.itemIcon(it.id)} ${it.n} ×${take}`);
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
      icon:this.itemIcon(s.id),
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
        World.dropItem(n.pos.x,n.pos.y+0.6,n.pos.z,s.id,take,{owner:true});
        this.toast(`🗑️ Membuang ${this.itemIcon(it.id)} ${it.n} ×${take} dari ${n.name}`);
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
        d.ghost.innerHTML=this.itemIcon(s.id);document.body.appendChild(d.ghost);
        this.applyItemIcons(d.ghost);
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
    /* equipment (pedang/armor/tameng) maks 1 per slot -> tidak pernah digabung.
       Item ber-data-instance (level tempa `lvl`, tanda lokasi Log Pass `mark`)
       juga tidak boleh digabung: menggabungkannya membuang data salah satunya. */
    const cap=(typeof stackCap==='function')?stackCap(a.id):64;
    const inst=a.lvl||a.mark||(b&&(b.lvl||b.mark));
    if(b&&b.id===a.id&&b.n<cap&&!inst){
      const mv=Math.min(a.n,cap-b.n);b.n+=mv;a.n-=mv;
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
    const d=document.createElement('div');d.className='toast-item';
    const isHtml=/<[a-z][\s\S]*>/i.test(msg);
    if(isHtml){
      d.innerHTML=msg;
      this.applyItemIcons(d);
      if(typeof I18N!=='undefined'&&I18N.lang!=='id')I18N.localizeTree(d,I18N.lang);
    }else{
      d.textContent=(typeof I18N!=='undefined'&&I18N.lang!=='id')
        ? I18N.translateText(msg,I18N.lang) : msg;
    }
    t.appendChild(d);
    while(t.childElementCount>this.TOAST_MAX)t.firstElementChild.remove();
    setTimeout(()=>d.remove(),2600);
  },
  /* ---------- modal konfirmasi generik ----------
     opt: {icon, text, count, input:{value,min,max}, textInput:{value,placeholder,
           maxlength}, okLabel, cancelLabel, allLabel, onOk(v), onCancel}.
     `input`     → kotak ANGKA, nilainya (number) dikirim ke onOk.
     `textInput` → kotak TEKS, nilainya (string, sudah di-trim) dikirim ke onOk.
                   Dipakai Log Pass untuk memberi nama tanda lokasi.
     `allLabel` (hanya bila `input` ada) menambah tombol yang langsung mengirim
     nilai maksimum — dipakai utk "Jual Semua". */
  modal(opt){
    this.closeModal();                    // hanya satu modal pada satu waktu
    const ov=document.createElement('div');ov.id='modal-ov';
    const box=document.createElement('div');box.id='modal-box';
    let h='';
    if(opt.icon){
      h+=`<span class="m-ico">${opt.icon}</span>`;
      this.applyItemIcons(ov);
    }
    if(opt.text)h+=`<div class="m-txt">${opt.text}</div>`;
    if(opt.input)h+=`<input type="number" id="modal-num" min="${opt.input.min||1}" `+
      `max="${opt.input.max||999}" value="${opt.input.value||1}">`;
    else if(opt.textInput)h+=`<input type="text" id="modal-txt" class="m-text"`+
      ` maxlength="${opt.textInput.maxlength||24}"`+
      ` placeholder="${this.esc(opt.textInput.placeholder||'')}"`+
      ` value="${this.esc(opt.textInput.value||'')}">`;
    else if(opt.count!==undefined)h+=`<div class="m-count">Jumlah: ×${opt.count}</div>`;
    h+=`<div id="modal-btns">`+
       ((opt.allLabel&&opt.input)?`<button id="modal-all">${opt.allLabel}</button>`:'')+
       `<button id="modal-ok">${opt.okLabel||'✔ OK'}</button>`+
       `<button id="modal-cancel">${opt.cancelLabel||'✖ Batal'}</button></div>`;
    box.innerHTML=h;ov.appendChild(box);document.body.appendChild(ov);
    if(typeof I18N!=='undefined'&&I18N.lang!=='id')I18N.localizeTree(ov,I18N.lang);
    const numEl=document.getElementById('modal-num');
    const txtEl=document.getElementById('modal-txt');
    const maxV=(opt.input&&opt.input.max)||99999;
    const finish=(ok,all)=>{
      /* kotak teks mengirim string; kotak angka mengirim number */
      const v=txtEl?txtEl.value.trim()
        :(all?maxV:(numEl?clamp(Math.floor(+numEl.value)||0,
          (opt.input&&opt.input.min)||0,maxV):opt.count));
      this.closeModal();
      if(ok)opt.onOk&&opt.onOk(v);else opt.onCancel&&opt.onCancel();
    };
    document.getElementById('modal-ok').addEventListener('click',()=>finish(true));
    document.getElementById('modal-cancel').addEventListener('click',()=>finish(false));
    const allEl=document.getElementById('modal-all');
    if(allEl)allEl.addEventListener('click',()=>finish(true,true));
    ov.addEventListener('pointerdown',e=>{if(e.target===ov)finish(false);});
    /* Fokus + Enter/Escape untuk kedua jenis kotak. stopPropagation WAJIB:
       tanpa itu tombol yang diketik diteruskan ke Input (karakter bergerak,
       panel terbuka) — sama seperti yang dilakukan kolom chat. */
    const field=numEl||txtEl;
    if(field){
      field.addEventListener('keydown',e=>{
        e.stopPropagation();
        if(e.key==='Enter'){e.preventDefault();finish(true);}
        if(e.key==='Escape'){e.preventDefault();finish(false);}
      });
      field.addEventListener('keyup',e=>e.stopPropagation());
      setTimeout(()=>{field.focus();field.select&&field.select();},30);
    }
  },
  closeModal(){
    const ov=document.getElementById('modal-ov');
    if(ov)ov.remove();
  },
  /* true bila sebuah modal sedang terbuka — dipakai untuk menahan aksi game
     (menyerang, dsb.) selama dialog tampil. UI.open TIDAK ikut terisi oleh
     modal, jadi pemeriksaan ini dibutuhkan terpisah. */
  modalOpen(){return !!document.getElementById('modal-ov');},
  /* escape teks buatan pemain sebelum masuk innerHTML/atribut */
  esc(s){
    return String(s==null?'':s).replace(/[&<>"']/g,c=>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  },

  flashVignette(){
    const v=document.getElementById('vignette');
    v.style.opacity=1;setTimeout(()=>v.style.opacity=0,260);
  },
  /* kilau biru singkat di tepi layar saat tameng berhasil menangkis serangan */
  flashBlock(){
    let el=document.getElementById('block-flash');
    if(!el){
      el=document.createElement('div');
      el.id='block-flash';
      document.body.appendChild(el);
    }
    el.classList.remove('on');void el.offsetWidth;el.classList.add('on');
  },
  levelUpBanner(){
    const l=document.getElementById('levelup');
    l.classList.remove('show');void l.offsetWidth;l.classList.add('show');
  },
  /* =========================================================================
     BANNER DUNGEON — tulisan besar di tengah layar saat memasuki dungeon
     -------------------------------------------------------------------------
     Dungeon BELUM ditaklukkan → "DUNGEON LV n" + rentang level pemain yang
     cocok, mis. "Untuk pemain Lv 21-25", beserta peringatan terlalu kuat /
     di bawah level.

     Dungeon SUDAH ditaklukkan → judulnya berganti menjadi "DUNGEON CLEAR"
     supaya sekali lihat pemain tahu tempat ini sudah beres. Peringatan level
     tidak lagi ditampilkan karena tantangannya sudah selesai.

     `bossDown`  = boss akhir sudah dikalahkan (Dungeon.bossKilled)
     `cleared`   = benar-benar tuntas: boss tumbang, semua peti terkuras, dan
                   tidak ada penjaga hidup (Dungeon.cleared)
     `kindName`  = 'Benteng' atau 'Gua' — jenis reruntuhannya, supaya pemain
                   tahu ia berada di gua bermineral atau benteng persegi.
     Keduanya dipisah supaya baris bawah bisa memberi tahu bahwa masih ada peti
     yang belum dikuras — tanpa mengubah judul besarnya.

     Elemennya dibuat sekali (lazy) lalu dipakai ulang; animasinya CSS
     (#dgbanner.show) sehingga tidak membebani frame.
     ========================================================================= */
  dungeonBanner(lvl,cleared,bossDown,kindName,resetIn){
    let el=document.getElementById('dgbanner');
    if(!el){
      el=document.createElement('div');
      el.id='dgbanner';
      document.body.appendChild(el);
    }
    /* BAND LEVEL PEMAIN YANG BENAR. Dulu rumus datar (lvl-1)*5+1..lvl*5 dipakai
       untuk SEMUA level — D78 menampilkan "Lv 386-390" padahal player max 200.
       Band asli: D1-D10 tetap 5 level/tingkat (1-5, 6-10, ... 46-50), D11+
       dipadatkan lewat midLevel() agar D100 tepat berakhir di cap 200.
       D78 = Lv 162-163, D80 = Lv 166, D86 = Lv 176.
       Fallback formula internal menjamin TIDAK PERNAH memakai rumus datar lama. */
    const b=(typeof Dungeon!=='undefined'&&Dungeon.bandRange)?Dungeon.bandRange(lvl):
            (typeof WGEN!=='undefined'&&WGEN.bandRange)?WGEN.bandRange(lvl):
            (function(L){
              const m=D=>(D<=10?D*5-2:48+Math.round((D-10)*(152/90)));
              const lo=L<=10?((L-1)*5+1):(m(L-1)+1);
              const hi=L<=10?(L*5):m(L);
              const minL=Math.max(1,lo),maxL=Math.max(minL,hi);
              return {lo:minL,hi:maxL,text:minL===maxL?('Lv '+minL):('Lv '+minL+'-'+maxL)};
            })(lvl);
    const lo=b.lo,hi=b.hi,bandTxt=b.text;
    const pl=(typeof Player!=='undefined')?Player.level:1;
    const kind=kindName||'Dungeon';
    /* sisa waktu pulih (detik) — dungeon yang boss-nya tumbang akan reset
       otomatis setelah RESET_MS; pemain langsung lihat hitung mundurnya */
    const rt=(typeof resetIn==='number'&&resetIn>=0)
      ?`<u>Pulih kembali dalam ${Math.floor(resetIn/60)}:${String(resetIn%60).padStart(2,'0')}</u>`:'';
    el.className='';
    if(cleared||bossDown){
      el.classList.add('clear');
      el.innerHTML=
        `<b>DUNGEON CLEAR</b>`+
        `<i>${kind} Lv ${lvl} sudah ditaklukkan</i>`+
        (cleared?`<u>Semua peti terkuras — tempat ini aman</u>`
                :`<u>Penjaga Agung tumbang · masih ada peti tersisa</u>`)+rt;
    }else{
      /* Bebas emoji agar tidak dirender sebagai tanda tanya (?) di WebView Android */
      const warn=pl<lo?'Terlalu kuat untukmu':(pl>hi?'Di bawah levelmu':'');
      if(pl<lo)el.classList.add('hard');
      else if(pl>hi)el.classList.add('easy');
      const badge=pl<lo?'<span style="color:#ff6b6b;font-weight:bold">[!]</span> ':pl>hi?'<span style="color:#63d471;font-weight:bold">[✓]</span> ':'';
      el.innerHTML=
        `<b>${kind.toUpperCase()} LV ${lvl}</b>`+
        `<i>Untuk pemain ${bandTxt}</i>`+
        (warn?`<u>${badge}${warn}</u>`:`<u>Levelmu ${pl} (sepadan)</u>`);
    }
    if(typeof I18N!=='undefined'&&I18N.lang!=='id')I18N.localizeTree(el,I18N.lang);
    /* restart animasi */
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(this._dgbT);
    this._dgbT=setTimeout(()=>el.classList.remove('show'),3200);
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
    const need=CFG.playerXpNeed(Player.level);
    document.getElementById('xp-fill').style.width=(Player.xp/need*100)+'%';
    document.getElementById('lvl').textContent=`⭐ Lv ${Player.level}`;
    const mins=Math.floor(Weather.time*1440);
    const hh=String(Math.floor(mins/60)).padStart(2,'0'),mm=String(mins%60).padStart(2,'0');
    /* ikon matahari/bulan memakai PNG kustom; jam dirender ulang tiap frame,
       jadi innerHTML hanya ditulis saat ikon/rainstate berubah (hemat DOM). */
    const night=Weather.nightF>0.5;
    const raining=Weather.rain>0.4;
    const clkEl=document.getElementById('clock');
    const clkSig=(night?'m':'s')+(raining?'r':'');
    if(this._clkSig!==clkSig){
      this._clkSig=clkSig;
      const fb=night?'🌙':'☀️';
      const ico=`<img class="hud-ico" src="buttons/${night?'ui_moon':'ui_sun'}.png" alt="" onerror="this.outerHTML='${fb}'">`;
      const rain=raining?'<img class="hud-ico" src="buttons/eff_swift.png" alt="" onerror="this.outerHTML=\'🌧️\'"> ':'';
      clkEl.innerHTML=`${rain}${ico} <span id="clock-t">${hh}:${mm}</span>`;
    }else{
      const t=clkEl.querySelector('#clock-t');
      if(t)t.textContent=`${hh}:${mm}`;
    }
    document.getElementById('daynum').textContent='Hari '+Weather.day;
    this.renderCompass();
    this.renderHotbar();
    this.renderActiveSkills();
    this.renderTeam();
    /* LIVE UPDATE STAMINA REKAN: panel NPC/Party tidak di-render ulang tiap
       frame (mahal), tapi bar stamina-nya diperbarui langsung via DOM tiap
       0.4 dtk supaya pemain benar-benar melihat stamina berkurang saat
       rekan memakai skill lalu pulih pelan-pelan.
       PENTING: updateHUD TIDAK menerima delta waktu, jadi hitung sendiri
       dari performance.now() — dulu memakai `dt` yang undefined → NaN →
       blok ini TIDAK PERNAH jalan (stamina rekan tampak tak berubah). */
    const nowMs=performance.now();
    if(!this._stamT||nowMs-this._stamT>=400){
      this._stamT=nowMs;
      if(this.open==='npc'&&this.npcSel&&!this.npcSel.dead)this.tickNpcBars();
      else if(this.open==='party')this.tickPartyBars();
    }
    /* potret pemain di kiri atas (render 3D kecil, di-throttle sendiri).
       Panel Karakter yang terbuka juga digambar ulang agar pose & stat-nya
       hidup mengikuti keadaan sekarang. */
    if(typeof CharView!=='undefined'&&CharView.ready){
      CharView.updatePortrait();
      if(this.open==='char')CharView.tickPanel();
    }
  },

  /* ---------- live update bar HP & stamina panel rekan (tanpa re-render) --
     Dipanggil berkala dari update() saat panel NPC/Party terbuka. Hanya
     menyetel width bar & teks persentase, jadi sangat murah untuk DOM. */
  tickNpcBars(){
    const n=this.npcSel;if(!n||n.dead)return;
    const body=document.getElementById('npc-body');if(!body)return;
    const bars=body.querySelectorAll('.npc-bar');
    const need=(typeof npcXpNeed==='function')?npcXpNeed(n.level):100;
    /* urutan bar yang dibuat renderNpcPanel: HP, STAM, XP */
    const st=bars[1],xp=bars[2];
    if(st){
      const fill=st.querySelector('i'),txt=st.querySelector('span');
      const pct=Math.max(0,Math.min(100,(n.stamina||0)/(n.maxStamina||100)*100));
      if(fill)fill.style.width=pct+'%';
      if(txt)txt.textContent=Math.ceil(n.stamina||0)+'/'+(n.maxStamina||100)+' STAM';
    }
    if(xp){
      const fill=xp.querySelector('i'),txt=xp.querySelector('span');
      if(fill)fill.style.width=Math.max(0,Math.min(100,n.xp/need*100))+'%';
      if(txt)txt.textContent=Math.floor(n.xp)+'/'+need+' XP';
    }
  },
  tickPartyBars(){
    const body=document.getElementById('party-body');if(!body)return;
    body.querySelectorAll('.party-card[data-npc]').forEach(card=>{
      const n=(typeof NPCS!=='undefined')?NPCS.team.find(x=>String(x.id)===card.dataset.npc):null;
      if(!n||n.dead)return;
      const st=card.querySelector('.pc-bar.st');
      if(st){
        const fill=st.querySelector('i'),txt=st.querySelector('span');
        const pct=Math.max(0,Math.min(100,(n.stamina||0)/(n.maxStamina||100)*100));
        if(fill)fill.style.width=pct+'%';
        if(txt)txt.textContent=Math.ceil(n.stamina||0)+'/'+(n.maxStamina||100)+' STAM';
      }
    });
  },

  /* ================= KOMPAS ARAH MATA ANGIN =================
     Strip 360° dibangun sekali (label N/NE/E/... + garis derajat), lalu tiap
     frame hanya digeser (translateX). Penanda ▼ di tengah menunjukkan arah
     yang sedang DIHADAPI KARAKTER.

     ACUAN = ARAH HADAP PEMAIN (Player.facing), bukan yaw kamera.
     Dulu kompas mengikuti kamera, sehingga memutar kamera membuat kompas
     berputar walau karakter berdiri diam menghadap arah yang sama — dan
     sebaliknya, berjalan berbelok tidak mengubah kompas sama sekali. Itu
     membuat penanda arah tidak bisa dipakai untuk navigasi. Sekarang kompas
     benar-benar "kompas di tangan karakter": ▼ = arah badan menghadap, jadi
     apa pun yang berada di tengah kompas ada TEPAT DI DEPAN pemain. */
  compassBuilt:false,
  COMPASS_W:168,          // lebar jendela kompas (px) — samakan dgn CSS
  COMPASS_PPD:1.6,        // piksel per derajat
  /* arah acuan kompas (radian). Memakai arah hadap karakter; jatuh ke yaw
     kamera hanya bila Player belum ada (mis. panorama main menu). */
  compassYaw(){
    if(typeof Player!=='undefined'&&Player.facing!==undefined)return Player.facing;
    return (typeof Cam!=='undefined'&&Cam.yaw!==undefined)?Cam.yaw:0;
  },
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
    /* arah hadap pemain → derajat kompas (0=N) */
    let deg=(this.compassYaw()*180/Math.PI)%360;if(deg<0)deg+=360;
    /* offset: strip dimulai dari -360°, jadi titik 0° ada di 360*PPD */
    const off=360*PPD+deg*PPD-this.COMPASS_W/2;
    strip.style.transform=`translateX(${-off}px)`;
    this.renderCompassMark(deg);
  },

  /* ---------- PENANDA LOG PASS DI KOMPAS ----------
     Dua bagian yang saling melengkapi:
       1. GARIS MERAH di dalam #compass — arah tanda relatif arah hadap pemain.
          Karena acuannya arah hadap, garis di tengah = tanda TEPAT DI DEPAN,
          jadi pemain cukup berjalan maju.
       2. BARIS KETERANGAN KECIL di atas frame kompas — nama tanda, jarak, dan
          panah tren (⯆ mendekat / ⯅ menjauh). Tanpa tren, pemain tidak bisa
          tahu apakah langkahnya sudah benar; inilah yang membuat penanda lama
          membingungkan.

     `deg` = arah hadap pemain (derajat) yang sedang berada di tengah kompas. */
  renderCompassMark(deg){
    const box=document.getElementById('compass');
    if(!box)return;
    let el=this._compassMarkEl;
    if(!el||!el.parentNode){
      el=document.getElementById('compass-target');
      if(!el){
        el=document.createElement('div');
        el.id='compass-target';
        el.innerHTML='<span class="ct-line"></span>';
        box.appendChild(el);
      }
      this._compassMarkEl=el;
    }
    const info=document.getElementById('compass-info');
    /* tanda aktif hanya bila Log Pass yang dipegang punya tanda tersimpan */
    const mk=(typeof LogPass!=='undefined'&&LogPass.heldMark)?LogPass.heldMark():null;
    if(!mk){
      if(el.style.display!=='none')el.style.display='none';
      if(info&&info.style.display!=='none'){info.style.display='none';info._t='';}
      this._lpDist=null;this._lpTrend=0;
      return;
    }
    /* heading dari pemain ke titik tanda — konvensi atan2(dx,dz) sama dengan
       Player.facing di seluruh game */
    const dx=mk.x-Player.pos.x,dz=mk.z-Player.pos.z;
    let b=Math.atan2(dx,dz)*180/Math.PI;
    /* selisih ke arah HADAP pemain, dinormalkan ke (-180,180] */
    let rel=(b-deg)%360;
    if(rel>180)rel-=360;
    if(rel<=-180)rel+=360;
    const half=this.COMPASS_W/2;
    const x=half+rel*this.COMPASS_PPD;
    /* di luar jendela kompas: tempel di tepi (garisnya menebal & memudar) */
    const outside=x<4||x>this.COMPASS_W-4;
    const px=clamp(x,4,this.COMPASS_W-4);
    const dist=Math.hypot(dx,dz);
    el.style.display='';
    el.style.left=px+'px';
    el.classList.toggle('edge',outside);
    /* garis berubah hijau saat pemain sudah menghadap tepat ke tanda (±12°),
       jadi "jalan lurus saja" terbaca tanpa membaca teks */
    el.classList.toggle('aim',!outside&&Math.abs(rel)<12);
    if(el._nm!==mk.name){el._nm=mk.name;el.title=mk.name;}

    /* ---------- TREN JARAK ----------
       Dibandingkan tiap 0.3 detik dengan ambang 0.35 blok supaya panahnya tidak
       berkedip saat pemain berdiri diam atau bergeser sedikit. */
    const now=performance.now();
    if(this._lpT===undefined||now-this._lpT>300){
      if(this._lpDist!==null&&this._lpDist!==undefined){
        const d=dist-this._lpDist;
        if(d<-0.35)this._lpTrend=-1;
        else if(d>0.35)this._lpTrend=1;
        else this._lpTrend=0;
      }
      this._lpDist=dist;this._lpT=now;
    }

    if(info){
      /* panah arah relatif ikut ditulis supaya jelas harus berbelok ke mana
         saat tandanya di luar jendela kompas */
      const side=outside?(rel<0?'← ':'→ '):'';
      const arrow=dist<3?'📍':this._lpTrend<0?'▼':this._lpTrend>0?'▲':'·';
      const cls=dist<3?'here':this._lpTrend<0?'near':this._lpTrend>0?'far':'';
      const txt=`${side}🧭 ${mk.name} · ${Math.round(dist)}m ${arrow}`;
      info.style.display='';
      if(info._t!==txt){info._t=txt;info.textContent=txt;}
      if(info._c!==cls){info._c=cls;info.className=cls;}
    }
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
    const pet=(typeof Capture!=='undefined'&&Capture.pet&&!Capture.pet.dead)?Capture.pet:null;
    let sig=team.map(n=>`${n.id}:${n.level}:${Math.ceil(n.hp)}:${Math.round((n.stamina||0)/5)*5}:${n.order}:${n.aggr===false?0:1}`).join('|');
    if(pet){
      const pd=(Capture.deployedSlot>=0&&RPG.mobSlots[Capture.deployedSlot])||{};
      sig+='|pet:'+pet.type+':'+Math.ceil(pet.hp)+':'+(pd.lvl||1)+':'+(pd.stars||1);
    }
    if(sig===this.teamSig)return;
    this.teamSig=sig;
    root.innerHTML='';
    for(const n of team){
      const d=document.createElement('div');
      d.className='tmate'+(n.order==='gather'?' busy':'');
      const stPct=Math.max(0,Math.min(100,((n.stamina||0)/(n.maxStamina||100))*100));
      d.innerHTML=`<span class="tface">${this.npcIcon(n.role.id, n.role.e)}</span>`+
        `<span class="tlv">Lv${n.level}</span>`+
        `<div class="thp"><i style="width:${Math.max(0,n.hp/n.maxhp*100)}%"></i></div>`+
        `<div class="tst"><i style="width:${stPct}%"></i></div>`+
        `<span class="tmode" title="${n.aggr===false?'Pasif':'Agresif'}">${n.aggr===false?'🕊️':'⚔️'}</span>`+
        `<span class="tord">${n.order==='gather'?'⛏️':n.order==='wait'?'⏸️':'👣'}</span>`;
      const fn=e=>{e.preventDefault();e.stopPropagation();this.openNpc(n);};
      d.addEventListener('touchstart',fn,{passive:false});
      d.addEventListener('click',fn);
      root.appendChild(d);
    }

    /* ikon pet aktif di grup yang sama dengan ikon team */
    if(pet){
      const pd=(Capture.deployedSlot>=0&&RPG.mobSlots[Capture.deployedSlot])||{};
      const d=document.createElement('div');
      d.className='tmate pet'+(Capture.riding?' busy':'');
      const emoji=(typeof PET_EMOJI!=='undefined'&&PET_EMOJI[pet.type])?PET_EMOJI[pet.type]:'🐾';
      const stars='⭐'.repeat(pd.stars||1);
      d.innerHTML=`<span class="tface">${this.petIcon(pet.type, emoji)}</span>`+
        `<span class="tlv">Lv${pd.lvl||1}</span>`+
        `<div class="thp"><i style="width:${Math.max(0,pet.hp/pet.maxhp*100)}%"></i></div>`+
        `<span class="tmode" title="${stars}">${Capture.riding?'🐾':'⭐'}</span>`+
        `<span class="tord">${pd.saddle?'🐴':'➰'}</span>`;
      const fn=e=>{
        e.preventDefault();e.stopPropagation();
        if(this.open!=='bag'){this.open='bag';this.picked=null;this.renderBag();}
        this.setBagPage('pet');
        this.syncPanels();
      };
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
  /* =========================================================================
     PANEL PARTY — daftar seluruh rekan tim + pet (dibuka tombol G)
     -------------------------------------------------------------------------
     Responsif: kartu memakai grid auto-fill sehingga rapi di layar kecil
     (satu kolom) maupun besar (banyak kolom). Ketuk kartu rekan untuk membuka
     panel kontrol detail (renderNpcPanel); ketuk kartu pet untuk membuka panel
     mob (halaman pet di Tas).
     ========================================================================= */
  renderParty(){
    const body=document.getElementById('party-body');if(!body)return;
    const team=(typeof NPCS!=='undefined'&&NPCS.team)?NPCS.team.filter(n=>!n.dead):[];
    const pet=(typeof Capture!=='undefined'&&Capture.pet&&!Capture.pet.dead)?Capture.pet:null;
    let h='';
    /* ringkasan jumlah anggota */
    const cap=(typeof CFG!=='undefined'&&CFG.NPC)?CFG.NPC.TEAM_MAX:3;
    h+=`<div class="party-count">👥 Rekan: <b>${team.length}/${cap}</b>`+
       (pet?` &nbsp;•&nbsp; 🐾 Pet aktif: <b>1</b>`:'')+`</div>`;

    if(!team.length&&!pet){
      h+='<p class="tip">Belum ada anggota party. Dekati penduduk desa lalu '+
         'tekan <b>F</b> untuk merekrut, atau tangkap monster untuk dijadikan peliharaan.</p>';
      body.innerHTML=h;
      return;
    }

    h+='<div class="party-grid">';
    /* kartu rekan NPC */
    /* perintah rekan di panel party: ikon kustom bila tersedia */
    const ordIcon=o=>o==='gather'?'prof_mining':o==='farm'?'prof_farming':
      o==='wait'?'eff_guard':'prof_agility';
    for(const n of team){
      const hpPct=Math.max(0,Math.min(100,n.hp/n.maxhp*100));
      const need=(typeof npcXpNeed==='function')?npcXpNeed(n.level):100;
      const xpPct=Math.max(0,Math.min(100,(n.xp/need)*100));
      const mode=n.aggr===false?'🕊️ Pasif':'⚔️ Agresif';
      const ord=n.order==='gather'?'⛏️ Cari resource':n.order==='wait'?'⏸️ Menunggu':
        n.order==='farm'?'🌾 Farming':'👣 Mengikuti';
      h+=`<div class="party-card" data-npc="${n.id}">
        <div class="pc-top">
          <span class="pc-face">${this.npcIcon(n.role.id, n.role.e)}</span>
          <div class="pc-id"><b>${n.name}</b><span class="pc-lv">Lv ${n.level}</span></div>
        </div>
        <div class="pc-role">${n.role.name}</div>
        <div class="pc-bar hp"><i style="width:${hpPct}%"></i><span>${Math.ceil(n.hp)}/${n.maxhp}</span></div>
        <div class="pc-bar st"><i style="width:${Math.max(0,Math.min(100,((n.stamina||0)/(n.maxStamina||100))*100))}%"></i><span>${Math.ceil(n.stamina||0)}/${n.maxStamina||100} STAM</span></div>
        <div class="pc-bar xp"><i style="width:${xpPct}%"></i><span>XP ${n.xp}/${need}</span></div>
        <div class="pc-tags"><span>${mode}</span><span>${ord}</span></div>
      </div>`;
    }
    /* kartu pet aktif */
    if(pet){
      const pd=(Capture.deployedSlot>=0&&RPG.mobSlots[Capture.deployedSlot])||{};
      const emoji=(typeof PET_EMOJI!=='undefined'&&PET_EMOJI[pet.type])?PET_EMOJI[pet.type]:'🐾';
      const nm=(typeof MOB_NAME!=='undefined'&&MOB_NAME[pet.type])?MOB_NAME[pet.type]:pet.type;
      const hpPct=Math.max(0,Math.min(100,pet.hp/pet.maxhp*100));
      const stars='⭐'.repeat(pd.stars||1);
      h+=`<div class="party-card pet" data-pet="1">
        <div class="pc-top">
          <span class="pc-face">${this.petIcon(pet.type, emoji)}</span>
          <div class="pc-id"><b>${pd.name||nm}</b><span class="pc-lv">Lv ${pd.lvl||1}</span></div>
        </div>
        <div class="pc-role">Peliharaan ${stars}</div>
        <div class="pc-bar hp"><i style="width:${hpPct}%"></i><span>${Math.ceil(pet.hp)}/${pet.maxhp}</span></div>
        <div class="pc-tags"><span>⚔️ ${pd.dmg||pet.dmg||0}</span><span>${pd.saddle?'🐴 Bersadel':'➰ Tanpa sadel'}</span></div>
      </div>`;
    }
    h+='</div>';
    body.innerHTML=h;

    /* interaksi kartu */
    body.querySelectorAll('.party-card[data-npc]').forEach(card=>{
      card.addEventListener('click',()=>{
        const id=card.dataset.npc;
        const n=team.find(x=>String(x.id)===String(id));
        if(n)this.openNpc(n);         // buka panel kontrol rekan detail
      });
    });
    const petCard=body.querySelector('.party-card[data-pet]');
    if(petCard)petCard.addEventListener('click',()=>{
      this.open='bag';this.picked=null;this.renderBag();
      this.setBagPage('pet');this.syncPanels();
    });
  },
  /* Panel kontrol rekan: stat, skill pasif, perlengkapan, perintah, tas rekan,
     dan daftar item pemain yang bisa diberikan. */
  renderNpcPanel(){
    const body=document.getElementById('npc-body');if(!body)return;
    const n=this.npcSel;
    if(!n||n.dead||!NPCS.team.includes(n)){
      body.innerHTML='<p class="tip">Tidak ada rekan yang dipilih. '+
        'Dekati penduduk desa lalu tekan <b>F</b> untuk merekrut '+
        `(maks ${CFG.NPC.TEAM_MAX} rekan).</p>`;
      return;
    }
    const sk=n.role.skill;
    const need=npcXpNeed(n.level);
    let h=`<div class="npc-head">
      <span class="npc-face">${this.npcIcon(n.role.id, n.role.e)}</span>
      <div class="npc-meta">
        <b>${n.name}</b> <span class="npc-lv">Lv ${n.level}</span>
        <div class="npc-bar"><i style="width:${n.hp/n.maxhp*100}%"></i>
          <span>${Math.ceil(n.hp)}/${n.maxhp} HP</span></div>
        <div class="npc-bar st"><i style="width:${((n.stamina||0)/(n.maxStamina||100))*100}%"></i>
          <span>${Math.ceil(n.stamina||0)}/${n.maxStamina||100} STAM</span></div>
        <div class="npc-bar xp"><i style="width:${n.xp/need*100}%"></i>
          <span>${n.xp}/${need} XP</span></div>
      </div>
    </div>
    <div class="npc-stats">
      <span>⚔️ ATK ${Math.round(NPCS.npcDmg(n))}</span>
      <span>🛡️ DEF ${Math.round(NPCS.npcDef(n)*100)}%</span>
      <span>👣 ${n.speed.toFixed(1)}</span>
    </div>
    <div class="npc-skill"><img class="sk-ico" src="buttons/eff_guard.png" alt="" style="width:18px;height:18px" onerror="this.outerHTML='${sk.e}'"> <b>${sk.name}</b> — ${sk.desc}</div>`;

    /* mode bertarung: aggressive / passive */
    h+='<div class="sub">Mode bertarung</div><div class="npc-cmd">'+
      `<button data-mode="aggressive" class="${n.aggr===false?'':'on'}">⚔️ Agresif</button>`+
      `<button data-mode="passive" class="${n.aggr===false?'on':''}">🕊️ Pasif</button></div>`+
      `<p class="tip">Agresif: menyerang monster yang mendekatimu. `+
      `Pasif: tidak menyerang sendiri; hanya mengejar target yang kamu serang sampai target mati.</p>`;

    /* perlengkapan yang sedang dipakai rekan (masih termasuk senjata rekan).
       ROYAL GUARD punya slot TAMENG: perisai yang diberi pemain dipasang di
       lengan kirinya (NPC_Royalguard.refreshGear). Dulu slotnya tidak ada di
       panel sehingga tameng itu tak terlihat & tak bisa dilepas kembali. */
    const gearSlots=(typeof NPC_GEAR_SLOTS!=='undefined'?NPC_GEAR_SLOTS:ARMOR_SLOTS).slice();
    if(n.role&&n.role.id==='royalguard')
      gearSlots.push({id:'shield',name:'Tameng',e:'🛡️'});
    h+='<div class="sub">Perlengkapan rekan</div><div class="npc-gear">';
    for(const s of gearSlots){
      const id=n.gear[s.id];
      const it=id?ITEMS[id]:null;
      const rar=it?(it.rarity||'common'):null;
      const rarCls=rar?` r-${rar}`:'';
      const borderSt=rar&&RARITY[rar]?` style="border-color:${RARITY[rar].css}"`:'';
      h+=`<div class="ngear${id?' filled'+rarCls:' empty'}" data-slot="${s.id}"${borderSt} title="${
        id?(it.n+' · '+(RARITY[rar]?RARITY[rar].n:'')):'Kosong — beri item dari daftar bawah'}">`+
        `<span class="ge">${id?this.itemIcon(id):s.e}</span>`+
        `<span class="gn">${id?it.n:s.name}</span></div>`;
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
        (s?`<span class="emo">${this.itemIcon(s.id)}</span><span class="cnt">${s.n>1?s.n:''}</span>`:'')+
        '</div>';
    }
    h+='</div>';

    /* item pemain yang bisa diberikan: HANYA dari tas (bukan hotbar & bukan equipment terpasang) */
    h+='<div class="sub">Beri item dari tas (klik item)</div><div class="grid npc-give">';
    const push=(arr,g)=>{
      for(let i=0;i<arr.length;i++){
        const s=arr[i];if(!s)continue;
        const it=ITEMS[s.id];
        if(!it)continue;
        /* tameng hanya bisa diberikan ke Royal Guard */
        if(it.armor&&it.armor.slot==='shield'&&(!n.role||n.role.id!=='royalguard'))continue;
        const kind=it.food?'🍖':(it.weapon?'⚔️':(it.armor?'🛡️':'📦'));
        h+=`<div class="slot ng" data-give="${g}:${i}" title="${it.n} ${kind}">`+
          `<span class="emo">${this.itemIcon(s.id)}</span><span class="cnt">${s.n>1?s.n:''}</span></div>`;
      }
    };
    push(RPG.bag,1);
    h+='</div>';
    body.innerHTML=h;
    this.applyItemIcons(body);

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
          icon:this.itemIcon(s.id),
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
        /* ROYAL GUARD: perisai/pedang dilepas → tangannya dikosongkan */
        if(n.role&&n.role.id==='royalguard'&&
           typeof NPC_Royalguard!=='undefined'&&NPC_Royalguard.refreshGear)
          NPC_Royalguard.refreshGear(n);
        this.toast(`${this.itemIcon(id)} ${ITEMS[id].n} diambil kembali`);
        this.renderNpcPanel();this.renderAll();
      }));
  },

  /* ikon koin kustom untuk toko & dialog */
  coinIcoHtml(size=14){
    return `<img class="coin-ico" src="buttons/ui_coin.png" alt="🪙" style="width:${size}px;height:${size}px;vertical-align:middle;display:inline-block">`;
  },

  /* ================= PANEL TOKO / PEDAGANG =================
     Beli item dengan koin (SHOP_GOODS), jual item dari tas untuk dapat koin
     (harga = sellPrice). Koin adalah mata uang RPG.coin. */
  renderShop(){
    const coinEl=document.getElementById('shop-coin');
    if(coinEl)coinEl.textContent=RPG.coin;
    /* panel toko khusus Dungeon Master: daftar Dungeon Changer per level */
    if(this.shopNpc&&this.shopNpc.role&&this.shopNpc.role.id==='dungeonmaster'){
      this.renderDungeonShop();return;
    }
    const merchant=this.shopNpc;
    const stock=(merchant&&merchant.shop)?merchant.shop:[];
    /* judul & label sub-panel dikembalikan ke bawaan pedagang (Dungeon Master
       mengubahnya di renderDungeonShop) */
    const panel=document.getElementById('panel-shop');
    const h2=panel?panel.querySelector('h2'):null;
    if(h2)h2.innerHTML='<img class="ph-ico" src="buttons/ui_shop.png" alt="" onerror="this.outerHTML=\'🏪\'"> Pedagang Desa <button class="x" data-close="shop">✕</button>';
    const xh=h2?h2.querySelector('[data-close]'):null;
    if(xh)xh.addEventListener('click',()=>this.toggle('shop'));
    if(panel){
      const subs=panel.querySelectorAll('.sub');
      if(subs[0])subs[0].textContent='Beli';
      if(subs[1])subs[1].style.display='';
    }
    /* --- daftar beli (stok acak pedagang ini) --- */
    const buyEl=document.getElementById('shop-buy');
    if(buyEl){
      buyEl.innerHTML='';
      /* lepas kelas daftar khusus Dungeon Master bila panel sebelumnya miliknya */
      buyEl.classList.remove('dm-list');
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
        d.innerHTML=`<span class="s-ico">${isBag?`<img class="iico" src="buttons/bag.png" alt="" data-iico="buttons/bag.png">`:this.itemIcon(g.id)}</span>`+
          `<div class="s-info">${info}</div>`+
          `<button class="s-buy" ${(afford&&!soldOut)?'':'disabled'}>`+
          `${soldOut?'Habis':this.coinIcoHtml(15)+' '+g.price}</button>`;
        if(!soldOut)d.querySelector('.s-buy').addEventListener('click',()=>this.shopBuy(g));
        buyEl.appendChild(d);
      }
      this.applyItemIcons(buyEl);
    }
    /* --- daftar jual: semua item di hotbar+tas --- */
    /* --- daftar jual: HANYA dari tas (bukan hotbar & bukan equipment terpasang) --- */
    const sellEl=document.getElementById('shop-sell-bag');
    if(sellEl){
      sellEl.innerHTML='';
      const push=(arr)=>arr.forEach((s,idx)=>{
        if(!s)return;
        const it=ITEMS[s.id],price=sellPrice(s.id);
        const d=document.createElement('div');
        d.className='slot sell';
        d.title=`${it.n} — klik untuk menjual (punya ×${s.n}, ${price} koin/item)`;
        d.innerHTML=`${this.itemIcon(s.id)}<span class="cnt">${s.n>1?s.n:''}</span><span class="pr">${this.coinIcoHtml(11)} ${price}</span>`;
        if(it.rarity&&RARITY[it.rarity]){d.classList.add('r-'+it.rarity);d.style.borderColor=RARITY[it.rarity].css;}
        d.addEventListener('click',()=>this.shopSell(arr,idx));
        sellEl.appendChild(d);
      });
      push(RPG.bag);
      if(!sellEl.childElementCount)
        sellEl.innerHTML='<p class="tip">Tasmu kosong — tidak ada yang bisa dijual (item hotbar terlindungi).</p>';
      else this.applyItemIcons(sellEl);
    }
  },

  /* ================= PANEL TOKO DUNGEON MASTER =================
     Daftar Dungeon Changer yang dijual di desa ini: level berbeda per desa
     (deterministik), stok maks 10 per level dan terisi ulang tiap 30 menit.
     Baris menampilkan LEVEL dungeon & harga dengan jelas; stok 0 = Habis. */
  renderDungeonShop(){
    const n=this.shopNpc;
    const it=ITEMS.dungeon_changer||{n:'Dungeon Changer',e:'🗝️'};
    /* judul panel diganti (h2 pertama) supaya jelas ini bukan pedagang biasa */
    const panel=document.getElementById('panel-shop');
    const h2=panel?panel.querySelector('h2'):null;
    if(h2)h2.innerHTML=`<img class="ph-ico" src="buttons/npc_dungeonmaster.png" alt="" onerror="this.outerHTML='${n.role.e}'"> Dungeon Master — Dungeon Changer <button class="x" data-close="shop">✕</button>`;
    const x=h2?h2.querySelector('[data-close]'):null;
    if(x)x.addEventListener('click',()=>this.toggle('shop'));
    const buyEl=document.getElementById('shop-buy');
    if(buyEl){
      buyEl.innerHTML='';
      /* 10 baris changer: daftar diberi scroll sendiri (lihat .dm-list di CSS)
         supaya judul & tombol tutup panel tetap terlihat di layar ponsel. */
      buyEl.classList.add('dm-list');
      /* label sub-panel disesuaikan: "Beli" → Dungeon Changer, "Jual" disembunyikan
         (Dungeon Master tidak membeli barang) */
      const subs=panel?panel.querySelectorAll('.sub'):[];
      if(subs[0])subs[0].textContent='🗝️ Dungeon Changer — mengubah level dungeon';
      if(subs[1])subs[1].style.display='none';
      /* stok terikat ke DESA (villageAnchor), bukan koordinat lapak —
         home DM tertimpa posisi lapak sehingga kunci stok lama tidak cocok */
      const va=n.villageAnchor||n.home;
      const stock=NPCS.dshopStock(va.x,va.z);
      if(!stock.length)
        buyEl.innerHTML='<p class="tip">Stok pedagang ini kosong.</p>';
      for(const g of stock){
        const soldOut=g.stock<=0;
        const afford=RPG.coin>=g.price;
        const d=document.createElement('div');
        d.className='shop-row';
        d.innerHTML=`<span class="s-ico">${this.itemIcon('dungeon_changer')}</span>`+
          `<div class="s-info"><b>${it.n}</b> <b style="color:#c9a0ff">Lv ${g.lvl}</b> `+
          `<i>· mengubah level dungeon → Lv ${g.lvl} · stok ${g.stock}/${g.maxStock}</i></div>`+
          `<button class="s-buy" ${(afford&&!soldOut)?'':'disabled'}>`+
          `${soldOut?'Habis':this.coinIcoHtml(15)+' '+g.price}</button>`;
        if(!soldOut)
          d.querySelector('.s-buy').addEventListener('click',()=>this.dungeonShopBuy(g));
        buyEl.appendChild(d);
      }
      this.applyItemIcons(buyEl);
    }
    /* Dungeon Master tidak membeli barang — sembunyikan daftar jual */
    const sellEl=document.getElementById('shop-sell-bag');
    if(sellEl)sellEl.innerHTML='<p class="tip">Dungeon Master tidak membeli barang.</p>';
  },
  /* beli satu Dungeon Changer level g.lvl dari Dungeon Master yang sedang
     dibuka. Stok dikurangi lewat NPCS.dshopBuy (persisten per desa). */
  dungeonShopBuy(g){
    if(this._buyLock)return;                    // anti-spam / debounce double-tap layar sentuh
    const n=this.shopNpc;
    if(!n||n.role.id!=='dungeonmaster')return;
    if(!RPG.spendCoin(g.price)){this.toast('🪙 Koin tidak cukup');return;}
    this._buyLock=true;
    setTimeout(()=>{this._buyLock=false;},350);
    /* item memakai field PER-INSTANCE lvl (seperti senjata tempa) sehingga
       tiap Dungeon Changer membawa level dungeonya sendiri */
    const left=RPG.addItem('dungeon_changer',1,g.lvl);
    if(left>0){ /* tas penuh → koin dikembalikan, item jatuh ke tanah */
      RPG.coin+=g.price;
      World.dropItem(Player.pos.x,Player.pos.y+0.6,Player.pos.z,'dungeon_changer',1,{owner:true,lvl:g.lvl});
      this.toast('🎒 Tas penuh — item dijatuhkan, koin kembali');
      return;
    }
    const va=n.villageAnchor||n.home;
    NPCS.dshopBuy(va.x,va.z,g.lvl);
    this.toast(`🗝️ Membeli Dungeon Changer Lv ${g.lvl} (−${g.price} 🪙)`);
    Sfx.craft();
    this.renderShop();this.renderAll();RPG.save();
  },
  /* beli satu entri dari stok pedagang (g = {id,price,n}); kurangi stok */
  shopBuy(g){
    if(this._buyLock)return;
    if(!g||g.n<=0)return;
    this._buyLock=true;
    setTimeout(()=>{this._buyLock=false;},350);
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
      World.dropItem(Player.pos.x,Player.pos.y+0.6,Player.pos.z,g.id,1,{owner:true});
      this.toast('🎒 Tas penuh — item dijatuhkan, koin kembali');
    }else{
      g.n--;
      this.toast(`🏪 Membeli ${this.itemIcon(g.id)} ${ITEMS[g.id].n} (−${g.price} ${this.coinIcoHtml(12)})`);
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
      icon:this.itemIcon(s.id),
      text:`Jual <b style="color:#fff">${it.n}</b>?<br>`+
        `<span style="font-size:12px;opacity:.85">${this.coinIcoHtml(13)} ${price} / item · kamu punya ×${s.n}</span>`,
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
    this.toast(`💰 Menjual ${this.itemIcon(s.id)} ${ITEMS[s.id].n} ×${qty} → +${total} ${this.coinIcoHtml(12)}`);
    Sfx.pickup();
    this.renderShop();this.renderAll();RPG.save();
  },

  /* gambar tombol untuk skill aktif tertentu (folder Button UI -> buttons/).
     Skill lain tetap memakai ikon emoji bawaan. */
  SKILL_IMG:{
    slam:'buttons/slam.png',       // Hantaman Kuat / Hantam Bumi
    whirl:'buttons/tornado.png',   // Tebasan Angin Puyuh
    roar:'buttons/battlecry.png',  // Teriakan Perang
    herb:'buttons/heal.png',       // Ramuan Herbal
  },

  /* ikon gambar untuk skill (PNG kustom bila tersedia, emoji fallback) */
  skillIcon(sk){
    const map={
      dmg:'prof_combat',combo:'eff_swift',slam:'slam',vamp:'eff_bleed',
      whirl:'tornado',roar:'battlecry',
      blk_guard:'eff_guard',blk_solid:'prof_blocking',blk_bastion:'eff_guard',
      run:'prof_agility',stam:'eff_swift',swim:'eff_swift',djump:'prof_agility',
      harv:'prof_harvesting',axe:'prof_logging',cook:'prof_cooking',
      smith:'prof_mining',gourmet:'prof_farming',alchem:'eff_regen',herb:'heal',
      groot:'prof_harvesting',logm:'prof_logging',
    };
    const file=map[sk.id];
    if(!file)return sk.icon;
    return `<img class="sk-ico" src="buttons/${file}.png" alt="" onerror="this.outerHTML='${sk.icon}'">`;
  },

  /* ---------- pelacak seretan tombol Hantam Bumi (mobile) ----------
     Didaftarkan SEKALI di window, bukan tiap renderActiveSkills(). Versi lama
     memasang touchmove/touchend baru setiap kali daftar skill digambar ulang,
     sehingga listener menumpuk dan `tid` lokal milik listener lama ikut
     bereaksi. Identifier sentuhan disimpan di UI._slamTid agar satu-satunya
     sumber kebenaran. */
  _slamTid:null,
  _slamUnpress:null,
  _slamBound:false,
  bindSlamDrag(){
    if(this._slamBound)return;
    this._slamBound=true;
    const clear=()=>{
      this._slamTid=null;
      if(this._slamUnpress){this._slamUnpress();this._slamUnpress=null;}
    };
    window.addEventListener('touchmove',e=>{
      if(this._slamTid===null||typeof SlamAim==='undefined')return;
      for(const t of e.changedTouches)if(t.identifier===this._slamTid){
        SlamAim.drag(t.clientX,t.clientY);
        /* cegah browser men-scroll/refresh selama membidik */
        if(e.cancelable)e.preventDefault();
      }
    },{passive:false});
    const end=e=>{
      if(this._slamTid===null)return;
      for(const t of e.changedTouches)if(t.identifier===this._slamTid){
        clear();
        if(typeof SlamAim!=='undefined')SlamAim.release();
      }
    };
    window.addEventListener('touchend',end,{passive:false});
    /* touchcancel = sentuhan dibatalkan sistem: batalkan bidikan, jangan
       mengeksekusi lompatan yang tidak diminta pemain. */
    window.addEventListener('touchcancel',e=>{
      if(this._slamTid===null)return;
      for(const t of e.changedTouches)if(t.identifier===this._slamTid){
        clear();
        if(typeof SlamAim!=='undefined')SlamAim.cancel();
      }
    },{passive:false});
  },

  /* skill aktif yang sudah dipelajari, urut sesuai daftar SKILLS.
     Urutan ini dipakai bersama oleh tombol HUD dan tombol keyboard Q/E/R/T. */
  activeList(){return SKILLS.filter(s=>s.active&&RPG.skillVal(s.id));},  /* id skill di slot aktif ke-i (atau null) — dipakai Input untuk SlamAim */
  activeSlotSkill(i){const s=this.activeList()[i];return s?s.id:null;},
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
          /* skill tertentu memakai gambar tombol dari folder Button UI */
          const img=this.SKILL_IMG[s.id];
          if(img){b.classList.add('has-img');b.innerHTML=`<img src="${img}" alt=""><span></span>`;}
          else b.innerHTML=`${s.icon}<span></span>`;
          const press=()=>b.classList.add('pressed');
          const unpress=()=>b.classList.remove('pressed');
          if(s.id==='slam'&&typeof SlamAim!=='undefined'){
            /* MOBA: tahan tombol lalu seret untuk membidik, lepas = eksekusi.
               Tekan cepat tetap menghantam di tempat. Seretan dilacak lewat
               window memakai identifier sentuhan (lihat bindSlamDrag) sehingga
               membidik tetap berjalan walau jari keluar dari area tombol. */
            b.addEventListener('touchstart',e=>{
              e.preventDefault();e.stopPropagation();
              press();
              const t=e.changedTouches[0];
              this._slamTid=t.identifier;
              this._slamUnpress=unpress;
              /* titik awal seret diserahkan ke press() — menyetelnya sebelum
                 press() dulu selalu tertimpa null di dalam press(). */
              SlamAim.press({x:t.clientX,y:t.clientY});
            },{passive:false});
            /* PC / mouse: klik tetap bisa memakai bidikan kursor */
            b.addEventListener('mousedown',e=>{
              if(e.button)return;
              e.preventDefault();press();
              SlamAim.press(null);
            });
            b.addEventListener('mouseup',()=>{unpress();SlamAim.release();});
            this.bindSlamDrag();
          }else{
            const fn=e=>{e.preventDefault();e.stopPropagation();RPG.useActive(s.id);};
            b.addEventListener('touchstart',e=>{press();fn(e);},{passive:false});
            b.addEventListener('touchend',unpress);
            b.addEventListener('touchcancel',unpress);
            b.addEventListener('click',fn);
          }
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
          /* skill tertentu memakai gambar tombol (sama dengan mobile) agar
             tidak mengandalkan emoji */
          const img=this.SKILL_IMG[s.id];
          if(img)b.classList.add('has-img');
          b.innerHTML=`<span class="key">${key||'-'}</span>`+
            (img?`<img src="${img}" alt="">`:s.icon)+`<span class="cd"></span>`;
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
      const emo=el.querySelector('.emo');
      const icon=s?this.itemIcon(s.id):'';
      if(emo._icon!==icon){emo._icon=icon;emo.innerHTML=icon;this.applyItemIcons(emo);}
      el.querySelector('.cnt').textContent=s&&s.n>1?s.n:'';
      /* badge level tempa (Landasan Tempa) */
      el.querySelector('.lvl').textContent=s&&s.lvl?'+'+s.lvl:'';
      /* Log Pass yang sudah bertanda diberi bingkai merah agar mudah dikenali
         di hotbar (warnanya sama dengan garis penanda di kompas) */
      el.classList.toggle('marked',!!(s&&s.mark));
      /* warna & bingkai rarity di slot hotbar */
      const it=s?ITEMS[s.id]:null;
      const rar=(it&&it.rarity)||'common';
      ['r-common','r-uncommon','r-rare','r-epic','r-legendary','r-mythic'].forEach(c=>el.classList.remove(c));
      if(s&&RARITY[rar]){
        el.classList.add('r-'+rar);
        el.style.borderColor=RARITY[rar].css;
      }else{
        el.style.borderColor='';
      }
    }
    this.updateAttackIcon();
  },
  /* ---------- tombol bergambar PNG ----------
     PNG tombol sering berupa kanvas besar (mis. 1000x1000) dengan gambar inti
     kecil di dalamnya. Fungsi ini mencari bounding-box pixel tidak transparan,
     lalu membuat versi crop supaya gambar pas di tengah tombol. */
  _btnImgCache:new Map(),
  croppedButtonImage(url,cb){
    const cached=this._btnImgCache.get(url);
    if(cached){cb(cached);return;}
    const img=new Image();
    img.onload=()=>{
      try{
        const w=img.naturalWidth,h=img.naturalHeight;
        if(!w||!h){this._btnImgCache.set(url,url);cb(url);return;}
        const cv=document.createElement('canvas');
        cv.width=w;cv.height=h;
        const ctx=cv.getContext('2d',{willReadFrequently:true});
        ctx.drawImage(img,0,0);
        const data=ctx.getImageData(0,0,w,h).data;
        let minX=w,minY=h,maxX=-1,maxY=-1;
        for(let y=0;y<h;y++){
          for(let x=0;x<w;x++){
            const a=data[(y*w+x)*4+3];
            if(a>12){
              if(x<minX)minX=x;
              if(x>maxX)maxX=x;
              if(y<minY)minY=y;
              if(y>maxY)maxY=y;
            }
          }
        }
        if(maxX<0){this._btnImgCache.set(url,url);cb(url);return;}
        const cw=maxX-minX+1,ch=maxY-minY+1;
        const out=document.createElement('canvas');
        out.width=cw;out.height=ch;
        out.getContext('2d').drawImage(cv,minX,minY,cw,ch,0,0,cw,ch);
        const cropped=out.toDataURL('image/png');
        this._btnImgCache.set(url,cropped);
        cb(cropped);
      }catch(e){
        /* fallback bila canvas tidak diizinkan */
        this._btnImgCache.set(url,url);
        cb(url);
      }
    };
    img.onerror=()=>{this._btnImgCache.set(url,url);cb(url);};
    img.src=url;
  },

  setButtonImage(btn,url){
    if(!btn)return;
    btn.textContent='';
    btn.classList.add('btn-img');
    this.croppedButtonImage(url,u=>{
      btn.style.backgroundImage=`url('${u}')`;
      btn.style.backgroundSize='contain';
      btn.style.backgroundPosition='center';
      btn.style.backgroundRepeat='no-repeat';
      btn.style.backgroundColor='transparent';
    });
  },

  initButtonImages(){
    /* tombol mobile utama yang memakai PNG */
    this.setButtonImage(document.getElementById('m-jump'),'buttons/jump.png');
    this.setButtonImage(document.getElementById('m-roll'),'buttons/dash.png');
    this.setButtonImage(document.getElementById('m-talk'),'buttons/talk.png');
    this.setButtonImage(document.getElementById('m-bag'),'buttons/bag.png');
    this.setButtonImage(document.getElementById('m-craft'),'buttons/craft.png');
    this.setButtonImage(document.getElementById('m-skill'),'buttons/skills.png');
    this.setButtonImage(document.getElementById('m-party'),'buttons/ui_party.png');
    this.setButtonImage(document.getElementById('m-chat'),'buttons/chat.png');
    this.setButtonImage(document.getElementById('btn-gear'),'buttons/gear.png');
    this.setButtonImage(document.getElementById('chat-send'),'buttons/talk.png');
    this.updateAttackIcon();
  },

  /* ---------- IKON ITEM BERGAMBAR (bag, hotbar, crafting, peti, toko) ----------
     Item yang punya PNG di folder buttons/ ditampilkan sebagai <img>, sisanya
     tetap memakai emoji. PNG dipotong otomatis ke area pixel yang terlihat
     (croppedButtonImage) supaya gambar pas di tengah slot. */
  ITEM_IMG:{
    /* bahan dasar */
    wood:'buttons/wood.png',
    stone:'buttons/stone.png',
    fiber:'buttons/fiber.png',
    gel:'buttons/gel.png',
    resin:'buttons/resin.png',
    leather:'buttons/leather.png',
    berry:'buttons/berry.png',
    mush:'buttons/mush.png',
    meat:'buttons/meat.png',
    cmeat:'buttons/cmeat.png',
    bread:'buttons/bread.png',
    salad:'buttons/salad.png',
    pie:'buttons/pie.png',
    bandage:'buttons/bandage.png',
    potion_stam:'buttons/ui_stam.png',
    fish:'buttons/fish.png',
    cfish:'buttons/cfish.png',
    wheat:'buttons/wheat.png',
    carrot:'buttons/carrot.png',
    cabbage:'buttons/cabbage.png',
    tomato:'buttons/tomato.png',
    watermelon:'buttons/watermelon.png',
    /* biji-bijian */
    seed_wheat:'buttons/seed_wheat.png',
    seed_carrot:'buttons/seed_carrot.png',
    seed_cabbage:'buttons/seed_cabbage.png',
    seed_tomato:'buttons/seed_tomato.png',
        seed_watermelon:'buttons/seed_watermelon.png',
    hoe:'buttons/hoe.png',
    /* tambang & batangan (Set 4) */
    sand:'buttons/sand.png',
    coal:'buttons/coal.png',
    iron_ore:'buttons/iron_ore.png',
    gold_ore:'buttons/gold_ore.png',
    crystal:'buttons/crystal.png',
    iron_ingot:'buttons/iron_ingot.png',
    gold_ingot:'buttons/gold_ingot.png',
    /* drop monster & hewan (Set 5) */
    f_house:'buttons/f_house.png',
    f_campfire:'buttons/f_campfire.png',
    f_stove:'buttons/f_stove.png',
    f_anvil:'buttons/f_anvil.png',
    f_workbench:'buttons/f_workbench.png',
    f_board:'buttons/f_board.png',
    f_boat:'buttons/f_boat.png',
    f_chest:'buttons/f_chest.png',
    f_bed:'buttons/f_bed.png',
    f_chair:'buttons/f_chair.png',
    f_table:'buttons/f_table.png',
    skills:'buttons/skills.png',
    craft:'buttons/craft.png',
    bag:'buttons/bag.png',
    build:'buttons/build.png',
    dungeon_changer:'buttons/dungeon_changer.png',
    log_pass:'buttons/log_pass.png',
    pet_charm:'buttons/pet_charm.png',
    saddle:'buttons/saddle.png',
    rope:'buttons/rope.png',
    cake:'buttons/cake.png',
    sugar:'buttons/sugar.png',
    sugar_cane:'buttons/sugar_cane.png',
    sword_wood:'buttons/sword_wood.png',
    pelt:'buttons/pelt.png',
    venom:'buttons/venom.png',
    centipede_shell:'buttons/centipede_shell.png',
    insect_leg:'buttons/insect_leg.png',
    hard_shell:'buttons/hard_shell.png',
    green_blood:'buttons/green_blood.png',
    toxic_venom:'buttons/toxic_venom.png',
    soul_shard:'buttons/soul_shard.png',
    boss_core:'buttons/boss_core.png',
    /* 12 TAMENG OTENTIK */
    shield_berserker:'buttons/shield_berserker.png',
    shield_elven:'buttons/shield_elven.png',
    shield_steampunk:'buttons/shield_steampunk.png',
    shield_iron:'buttons/shield_iron.png',
    shield_paladin:'buttons/shield_paladin.png',
    shield_shadow:'buttons/shield_shadow.png',
    shield_juggernaut:'buttons/shield_juggernaut.png',
    shield_crystal:'buttons/shield_crystal.png',
    shield_reaper:'buttons/shield_reaper.png',
    shield_yeti:'buttons/shield_yeti.png',
    shield_samurai:'buttons/shield_samurai.png',
    shield_dragon:'buttons/shield_dragon.png',
    /* Kompatibilitas alias tameng lama */
    shield_wood:'buttons/shield_wood.png',
    shield_flame:'buttons/shield_flame.png',
    shield_frost:'buttons/shield_frost.png',
    shield_venom:'buttons/shield_venom.png',
    shield_storm:'buttons/shield_storm.png',
    shield_dark:'buttons/shield_dark.png',
    shield_carapace:'buttons/shield_carapace.png',
    /* 12 PEDANG OTENTIK */
    sword_berserker:'buttons/sword_berserker.png',
    sword_elven:'buttons/sword_elven.png',
    sword_steampunk:'buttons/sword_steampunk.png',
    sword_iron:'buttons/sword_iron.png',
    sword_paladin:'buttons/sword_paladin.png',
    sword_shadow:'buttons/sword_shadow.png',
    sword_juggernaut:'buttons/sword_juggernaut.png',
    sword_crystal:'buttons/sword_crystal.png',
    sword_reaper:'buttons/sword_reaper.png',
    sword_yeti:'buttons/sword_yeti.png',
    sword_samurai:'buttons/sword_samurai.png',
    sword_dragon:'buttons/sword_dragon.png',
    sword_wood:'buttons/sword_wood.png',
    sword_storm:'buttons/sword_storm.png',
    sword_venom:'buttons/sword_venom.png',
    sword_frost:'buttons/sword_frost.png',
    sword_titan:'buttons/sword_titan.png',

    /* 12 SET ZIRAH OTENTIK */
    helm_berserker:'buttons/helm_berserker.png',
    plate_berserker:'buttons/plate_berserker.png',
    greaves_berserker:'buttons/greaves_berserker.png',

    helm_elven:'buttons/helm_elven.png',
    plate_elven:'buttons/plate_elven.png',
    greaves_elven:'buttons/greaves_elven.png',

    helm_copper:'buttons/helm_copper.png',
    plate_copper:'buttons/plate_copper.png',
    greaves_copper:'buttons/greaves_copper.png',

    helm_iron:'buttons/helm_iron.png',
    plate_iron:'buttons/plate_iron.png',
    greaves_iron:'buttons/greaves_iron.png',

    helm_gold:'buttons/helm_gold.png',
    plate_gold:'buttons/plate_gold.png',
    greaves_gold:'buttons/greaves_gold.png',

    helm_shadow:'buttons/helm_shadow.png',
    plate_shadow:'buttons/plate_shadow.png',
    greaves_shadow:'buttons/greaves_shadow.png',

    helm_tungsten:'buttons/helm_tungsten.png',
    plate_tungsten:'buttons/plate_tungsten.png',
    greaves_tungsten:'buttons/greaves_tungsten.png',

    helm_crystal:'buttons/helm_crystal.png',
    plate_crystal:'buttons/plate_crystal.png',
    greaves_crystal:'buttons/greaves_crystal.png',

    helm_reaper:'buttons/helm_reaper.png',
    plate_reaper:'buttons/plate_reaper.png',
    greaves_reaper:'buttons/greaves_reaper.png',

    helm_yeti:'buttons/helm_yeti.png',
    plate_yeti:'buttons/plate_yeti.png',
    greaves_yeti:'buttons/greaves_yeti.png',

    helm_samurai:'buttons/helm_samurai.png',
    plate_samurai:'buttons/plate_samurai.png',
    greaves_samurai:'buttons/greaves_samurai.png',

    helm_dragon:'buttons/helm_dragon.png',
    plate_dragon:'buttons/plate_dragon.png',
    greaves_dragon:'buttons/greaves_dragon.png',

    cap_leather:'buttons/cap_leather.png',
    vest_leather:'buttons/vest_leather.png',
    boots_leather:'buttons/boots_leather.png',
    helm_guard:'buttons/helm_guard.png',
    helm_thorns:'buttons/helm_thorns.png',
    helm_carapace:'buttons/helm_carapace.png',
    cloak_swift:'buttons/cloak_swift.png',
    plate_regen:'buttons/plate_regen.png',
    plate_carapace:'buttons/plate_carapace.png',
    boots_greed:'buttons/boots_greed.png',
    chat:'buttons/chat.png',
    gear:'buttons/gear.png',
    prof_logging:'buttons/prof_logging.png',
    prof_mining:'buttons/prof_mining.png',
    prof_harvesting:'buttons/prof_harvesting.png',
    prof_combat:'buttons/prof_combat.png',
    prof_blocking:'buttons/prof_blocking.png',
    prof_crafting:'buttons/prof_crafting.png',
    prof_cooking:'buttons/prof_cooking.png',
    prof_farming:'buttons/prof_farming.png',
    prof_agility:'buttons/prof_agility.png',
    eff_bleed:'buttons/eff_bleed.png',
    eff_shock:'buttons/eff_shock.png',
    eff_venom:'buttons/eff_venom.png',
    eff_frost:'buttons/eff_frost.png',
    eff_quake:'buttons/eff_quake.png',
    eff_swift:'buttons/eff_swift.png',
    eff_guard:'buttons/eff_guard.png',
    eff_greed:'buttons/eff_greed.png',
    eff_regen:'buttons/eff_regen.png',
    eff_thorns:'buttons/eff_thorns.png',
    ui_coin:'buttons/ui_coin.png',
    ui_hp:'buttons/ui_hp.png',
    ui_stam:'buttons/ui_stam.png',
    ui_hunger:'buttons/ui_hunger.png',
    ui_scroll:'buttons/ui_scroll.png',
    ui_party:'buttons/ui_party.png',
    ui_team:'buttons/ui_team.png',
    ui_shop:'buttons/ui_shop.png',
    ui_altar:'buttons/ui_altar.png',
    ui_char:'buttons/ui_char.png',
    ui_sun:'buttons/ui_sun.png',
    ui_moon:'buttons/ui_moon.png',
  },

  /* HTML ikon satu item: <img> bila ada PNG, emoji bila tidak */
  itemIcon(id){
    const it=ITEMS[id];
    if(!it)return '';
    let src=this.ITEM_IMG[id];
    if(!src&&id){
      src='buttons/'+id+'.png';
    }
    return `<img class="iico" src="${src}" data-iico="${src}" alt="" onerror="this.outerHTML='${it.e}'">`;
  },

  /* HTML ikon potret NPC team (render 3D bust portrait) */
  npcIcon(roleId, fallbackEmoji = '👤'){
    if(!roleId)return fallbackEmoji;
    return `<img class="tico" src="buttons/npc_${roleId}.png" alt="" onerror="this.outerHTML='${fallbackEmoji}'">`;
  },

  /* HTML ikon Pet peliharaan (render 3D isometric) */
  petIcon(type, fallbackEmoji = '🐾'){
    if(!type)return fallbackEmoji;
    return `<img class="tico" src="buttons/pet_${type}.png" alt="" onerror="this.outerHTML='${fallbackEmoji}'">`;
  },

  /* HTML ikon keahlian profisiensi */
  profIcon(id){
    const s = (typeof SUBSKILLS !== 'undefined') ? SUBSKILLS[id] : null;
    const fb = s ? s.icon : '📈';
    return `<img class="prof-ico" src="buttons/prof_${id}.png" alt="" onerror="this.outerHTML='${fb}'">`;
  },

  /* HTML ikon status effect / buff */
  effectIcon(fx){
    const map = {
      bleed:'eff_bleed', shock:'eff_shock', venomB:'eff_venom', venom:'eff_venom',
      frost:'eff_frost', quake:'eff_quake', swift:'eff_swift', guard:'eff_guard',
      greed:'eff_greed', regen:'eff_regen', thorns:'eff_thorns'
    };
    const file = map[fx];
    const fb = (typeof EFFECTS !== 'undefined' && EFFECTS[fx]) ? EFFECTS[fx].e : '✨';
    if(!file) return fb;
    return `<img class="eff-ico" src="buttons/${file}.png" alt="" onerror="this.outerHTML='${fb}'">`;
  },

  /* tukar src <img class="iico"> ke versi yang sudah dipotong (sekali per URL) */
  applyItemIcons(root){
    const scope=root||document;
    if(!scope.querySelectorAll)return;
    scope.querySelectorAll('img.iico[data-iico]').forEach(img=>{
      const url=img.dataset.iico;
      delete img.dataset.iico;
      this.croppedButtonImage(url,u=>{if(img.src!==u)img.src=u;});
    });
  },

  /* icon tombol serang mobile: Eat.png saat memegang makanan, Attack.png
     untuk kondisi lainnya. Hanya dua gambar ini yang dipakai. */
  updateAttackIcon(){
    const btn=document.getElementById('m-attack');
    if(!btn)return;
    const s=RPG.hotbar[RPG.sel];
    const it=s&&ITEMS[s.id];
    const img=(it&&it.food)?'buttons/eat.png':'buttons/attack.png';
    if(this._atkImg!==img){
      this._atkImg=img;
      this.setButtonImage(btn,img);
    }
  },
  /* ---------- panel ---------- */
  PANELS:['bag','skills','craft','help','npc','party','chest','shop','term','anvil','altar','settings','char'],
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
        if(name==='bag'){this.renderBag();this.setBagPage(this.bagPage||'bag');}
        if(name==='skills')this.renderSkills();
        if(name==='craft')this.renderCraft();
        if(name==='npc')this.renderNpcPanel();
        if(name==='party')this.renderParty();
        if(name==='chest')this.renderChest();
        if(name==='shop')this.renderShop();
        if(name==='anvil'&&typeof Anvil!=='undefined')Anvil.render();
        if(name==='altar'&&typeof Altar!=='undefined')Altar.render();
        if(name==='settings'&&typeof Settings!=='undefined')Settings.render();
        if(name==='char'&&typeof CharView!=='undefined')CharView.openPanel();
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
    const bm=document.getElementById('bag-float-menu');
    if(bm)bm.classList.toggle('show',this.open==='bag');
    if(this.open==='bag')this.positionBagMenu();
  },

  /* letakkan tombol Bag/Pet tepat di samping kiri panel Tas, bukan di tepi layar */
  positionBagMenu(){
    const menu=document.getElementById('bag-float-menu');
    const panel=document.getElementById('panel-bag');
    if(!menu||!panel||this.open!=='bag')return;
    requestAnimationFrame(()=>{
      if(this.open!=='bag')return;
      const r=panel.getBoundingClientRect();
      const mw=menu.offsetWidth||58;
      const mh=menu.offsetHeight||130;
      let left=r.left-mw-10;
      /* layar sempit: tetap tempel sedekat mungkin ke panel */
      if(left<4)left=Math.max(4,r.left-mw*0.55);
      let top=r.top+r.height/2-mh/2;
      top=clamp(top,64,Math.max(64,window.innerHeight-mh-64));
      menu.style.left=left+'px';
      menu.style.top=top+'px';
    });
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
  /* kategori filter kantong/tas */
  bagCat:'all',
  BAG_CATS:[
    {k:'all',    t:'Semua',   icon:'🎒'},
    {k:'weapon', t:'Senjata', icon:'⚔️'},
    {k:'armor',  t:'Armor',   icon:'🛡️'},
    {k:'food',   t:'Makanan', icon:'🍖'},
    {k:'mat',    t:'Bahan',   icon:'📦'},
    {k:'furni',  t:'Furnitur',icon:'🪑'},
  ],
  itemCategory(it){
    if(!it)return 'mat';
    if(it.food)return 'food';
    if(it.weapon||it.tool)return 'weapon';
    if(it.armor)return 'armor';
    if(it.place)return 'furni';
    return 'mat';
  },
  renderBag(){
    /* render tab kategori di atas grid kantong */
    const tabEl=document.getElementById('bag-cat-tabs');
    if(tabEl){
      tabEl.innerHTML='';
      for(const tb of this.BAG_CATS){
        const b=document.createElement('button');
        b.type='button';
        b.className='bag-cat-tab'+(this.bagCat===tb.k?' active':'');
        b.innerHTML=`<span>${tb.icon}</span> ${tb.t}`;
        b.addEventListener('click',e=>{
          e.preventDefault();e.stopPropagation();
          this.bagCat=tb.k;
          this.renderBag();
          if(typeof Sfx!=='undefined'&&Sfx.click)Sfx.click();
        });
        tabEl.appendChild(b);
      }
    }

    const mk=(arr,g,el)=>{
      if(!el)return;
      el.innerHTML='';
      let shown=0;
      arr.forEach((s,i)=>{
        /* jika filter kategori aktif pada kantong (g===1), hanya tampilkan item yang cocok */
        if(g===1&&this.bagCat&&this.bagCat!=='all'){
          if(!s||!ITEMS[s.id])return;
          const cat=this.itemCategory(ITEMS[s.id]);
          if(cat!==this.bagCat)return;
        }
        shown++;
        const d=document.createElement('div');d.className='slot';d.dataset.i=i;d.dataset.g=g;
        if(this.picked&&this.picked.i===i&&this.picked.g===g)d.classList.add('picked');
        if(s){
          const it=ITEMS[s.id];
          d.innerHTML=`${this.itemIcon(s.id)}<span class="cnt">${s.n>1?s.n:''}</span>`+
            (s.lvl?`<span class="lvl">+${s.lvl}</span>`:'');
          d.title=this.itemTip(s.id)+(s.lvl?`\n⚒️ Level tempa ${s.lvl}`:'')
            +(s.mark?`\n🧭 ${s.mark.name} (${Math.round(s.mark.x)}, ${Math.round(s.mark.z)})`:'');
          /* Log Pass bertanda: bingkai merah + titik penanda */
          if(s.mark)d.classList.add('marked');
          /* bingkai slot memakai warna rarity agar item langka mudah dikenali */
          if(it.rarity&&RARITY[it.rarity]){
            d.classList.add('r-'+it.rarity);
            d.style.borderColor=RARITY[it.rarity].css;
          }
        }

        el.appendChild(d);
      });
      if(g===1&&this.bagCat&&this.bagCat!=='all'&&shown===0){
        const emptyMsg=document.createElement('div');
        emptyMsg.className='tip';
        emptyMsg.style.gridColumn='1 / -1';
        emptyMsg.style.textAlign='center';
        emptyMsg.style.padding='12px 0';
        emptyMsg.textContent='Tidak ada item di kategori ini.';
        el.appendChild(emptyMsg);
      }
      this.applyItemIcons(el);
    };
    mk(RPG.hotbar,0,document.getElementById('bag-hotbar'));
    mk(RPG.bag,1,document.getElementById('bag-grid'));
    this.renderEquip();
    if(typeof Capture!=='undefined'&&Capture.renderMobBag)Capture.renderMobBag();
    if(this.open==='bag')this.positionBagMenu();
  },

  /* ---------- live update tas ----------
     Dipanggil setiap item masuk/keluar (pickup, craft, panen, dll).
     Render ditunda satu frame supaya banyak perubahan sekaligus tidak
     memicu render berulang. */
  _invDirty:false,
  markInvDirty(){
    if(this._invDirty)return;
    this._invDirty=true;
    requestAnimationFrame(()=>{
      this._invDirty=false;
      this.renderHotbar();
      if(this.open==='bag')this.renderBag();
      if(this.open==='chest')this.renderChest();
      if(this.open==='shop')this.renderShop&&this.renderShop();
    });
  },

  /* ---------- halaman kiri panel tas: Bag / Pet ---------- */
  bagPage:'bag',
  setBagPage(page){
    this.bagPage=(page==='pet')?'pet':'bag';
    const bag=document.getElementById('bag-page-bag');
    const pet=document.getElementById('bag-page-pet');
    if(bag)bag.style.display=(this.bagPage==='bag')?'':'none';
    if(pet)pet.style.display=(this.bagPage==='pet')?'':'none';
    document.querySelectorAll('.bag-menu-btn').forEach(b=>{
      b.classList.toggle('active',b.dataset.bagpage===this.bagPage);
    });
    if(this.bagPage==='pet'&&typeof Capture!=='undefined'&&Capture.renderMobBag)Capture.renderMobBag();
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
        d.innerHTML=`${this.itemIcon(s.id)}<span class="cnt">${s.n>1?s.n:''}</span>`;
        d.title=this.itemTip(s.id)+'\nKlik = ambil · Seret ke tas = titip/ambil';
        deco(d,it);
        d.addEventListener('click',()=>{
          if(this._chestSkipClick){this._chestSkipClick=false;return;}
          Furni.chestTake(f,i);
        });
      }
      gEl.appendChild(d);
    });
    this.applyItemIcons(gEl);
    if(nEl)nEl.textContent=`${f.inv.filter(s=>s).length}/${f.inv.length}`;

    /* --- isi tas pemain: data-cg (0=hotbar,1=kantong) + data-ci --- */
    bEl.innerHTML='';
    const push=(arr,g)=>arr.forEach((s,i)=>{
      const d=document.createElement('div');
      d.className='slot cb';d.dataset.cg=g;d.dataset.ci=i;
      if(s){
        const it=ITEMS[s.id];
        d.innerHTML=`${this.itemIcon(s.id)}<span class="cnt">${s.n>1?s.n:''}</span>`;
        d.title=this.itemTip(s.id)+'\nKlik = titip · Seret ke peti = titip';
        deco(d,it);
        d.addEventListener('click',()=>{
          if(this._chestSkipClick){this._chestSkipClick=false;return;}
          Furni.chestPut(f,arr,i);
        });
      }
      bEl.appendChild(d);
    });
    push(RPG.bag,1);
    this.applyItemIcons(bEl);

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
        d.ghost.innerHTML=this.itemIcon(s.id);document.body.appendChild(d.ghost);
        this.applyItemIcons(d.ghost);
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
      icon:this.itemIcon(s.id),
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
        World.dropItem(Player.pos.x,Player.pos.y+0.6,Player.pos.z,s.id,take,{owner:true});
        Furni.save();
        this.toast(`🗑️ Membuang ${this.itemIcon(it.id)} ${it.n} ×${take} dari peti`);
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
      /* Angka DEF disamakan dengan panel stat (config.js itemStats): keduanya
         mengalikan rarityMul. BUGFIX: tooltip ini dulu memakai def MENTAH,
         sehingga item yang sama memperlihatkan dua angka berbeda tergantung
         panel mana yang dilihat pemain. */
      const rm=(typeof RPG!=='undefined'&&RPG.rarityMul)?RPG.rarityMul(id):1;
      lines.push(`🛡 +${Math.round(it.armor.def*rm*100)}% pertahanan`);
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
  /* ---------- slot perlengkapan (armor + tameng; khusus karakter utama) ---------- */
  renderEquip(){
    const el=document.getElementById('equip-grid');
    if(!el)return;
    el.innerHTML='';
    const slots=(typeof PLAYER_GEAR_SLOTS!=='undefined')?PLAYER_GEAR_SLOTS:ARMOR_SLOTS;
    for(const s of slots){
      const id=RPG.equipId?RPG.equipId(s.id):RPG.equip[s.id];
      const lvl=RPG.equipLv?RPG.equipLv(s.id):0;
      const d=document.createElement('div');
      d.className='slot eq'+(id?' filled':'');
      d.dataset.slot=s.id;
      if(id){
        const it=ITEMS[id];
        d.innerHTML=`<span class="lbl">${s.name}</span>${this.itemIcon(id)}`+
          (lvl?`<span class="lvl">+${lvl}</span>`:'');
        d.title=this.itemTip(id)+(lvl?`\n⚒️ Level tempa ${lvl}`:'')+'\nKlik untuk melepas';
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
    this.applyItemIcons(el);
    document.getElementById('def-num').textContent=Math.round(RPG.defense()*100)+'%';
    /* tampilkan damage senjata aktif bila elemennya tersedia */
    const dmgEl=document.getElementById('dmg-num');
    if(dmgEl)dmgEl.textContent=Math.round(RPG.weaponDmg());
    /* ringkasan block dari tameng yang dipakai (peluang × kekuatan) */
    const blkEl=document.getElementById('blk-num');
    if(blkEl&&RPG.blockChance){
      const bc=RPG.blockChance();
      blkEl.textContent=bc>0
        ?Math.round(bc*100)+'% / '+Math.round(RPG.blockPower()*100)+'%'
        :'0%';
    }
  },

  renderAll(){
    this.renderHotbar();
    if(this.open==='bag')this.renderBag();
    if(this.open==='craft')this.renderCraft();
    if(this.open==='skills')this.renderSkills();
    if(this.open==='npc')this.renderNpcPanel();
    if(this.open==='party')this.renderParty();
    if(this.open==='shop'&&this.renderShop)this.renderShop();
    /* ---------- PANEL YANG DULU TERLEWAT ----------
       Panel peti, landasan tempa, dan altar TIDAK ikut digambar ulang di sini,
       padahal renderAll() adalah jalur yang dipakai Settings.setLang saat
       bahasa diganti. Akibatnya: dengan panel PETI terbuka lalu bahasa
       ditukar, atribut `title` tiap slot (tooltip yang muncul saat kursor
       menyentuh item) tetap memakai bahasa lama — nama item, rarity, dan
       deskripsi efeknya tidak ikut berubah sampai pemain mengambil/menitipkan
       sesuatu (yang memicu renderChest sendiri). Tooltip dibangun ulang dari
       ITEMS/RARITY/EFFECTS yang sudah ter-patch, jadi cukup digambar ulang. */
    if(this.open==='chest')this.renderChest();
    if(this.open==='anvil'&&typeof Anvil!=='undefined'&&Anvil.render)Anvil.render();
    if(this.open==='altar'&&typeof Altar!=='undefined'&&Altar.render)Altar.render();
    this.renderEquip();
    this.teamSig='';                 // paksa HUD rekan digambar ulang
    this.renderTeam();
    if(typeof I18N!=='undefined'&&I18N.refresh)I18N.refresh();
  },

  /* label & ikon tiap cabang untuk header pohon.
     Nama WAJIB bahasa Indonesia (bahasa dasar game). Dulu di sini tertulis
     'Combat'/'Movement'/'Crafting'/'Gather'/'Catch' — Inggris — sehingga panel
     Skill tampak campur Indonesia-Inggris saat bahasa ID dipilih. Terjemahan
     ke en/zh/ja disediakan I18N_PHRASE. */
  BRANCH_META:{
    combat:{icon:'⚔️',img:'prof_combat',name:'Tempur'},
    move:{icon:'🏃',img:'prof_agility',name:'Gerak'},
    craft:{icon:'🛠️',img:'prof_crafting',name:'Kerajinan'},
    gather:{icon:'🧺',img:'prof_harvesting',name:'Pengumpul'},
    catch:{icon:'🪢',img:'prof_blocking',name:'Pawang'},
  },
  /* SKILL TREE berbentuk pohon-akar: tiap branch digambar sebagai node yang
     saling terhubung garis sesuai prasyarat (req). Node disusun per "kedalaman"
     (root di atas), lalu garis lengkung digambar lewat overlay SVG setelah
     layout terukur (requestAnimationFrame). */
  renderSkills(){
    this.hideSkillTip();
    document.getElementById('sp-num').textContent=RPG.sp;
    const wrap=document.getElementById('branches');
    if(!wrap)return;
    wrap.innerHTML='';
    for(const br of['combat','move','craft','gather','catch']){
      const sks=SKILLS.filter(s=>s.br===br);
      if(!sks.length)continue;
      const meta=this.BRANCH_META[br]||{icon:'🌿',name:br};
      const sec=document.createElement('div');
      sec.className='branch tree';
      sec.innerHTML=`<h3><img class="branch-ico" src="buttons/${meta.img||''}.png" alt="" onerror="this.outerHTML='${meta.icon}'"> ${meta.name}</h3>`;
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
    /* GERBANG LEVEL (sk.lvl): skill puncak butuh level pemain minimum */
    const needLvl=sk.lvl&&Player.level<sk.lvl;
    const locked=needSkill||needProf||needLvl;
    const maxed=rank>=sk.max;
    const afford=RPG.sp>=sk.cost;
    const learnable=!locked&&!maxed&&afford;
    const d=document.createElement('div');
    let cls='tnode';
    if(maxed)cls+=' max';
    if(locked)cls+=' locked';
    if(needProf&&!needSkill&&!needLvl&&!maxed)cls+=' proflock';
    if(learnable)cls+=' can';
    if(sk.active)cls+=' active';
    d.className=cls;
    d.dataset.id=sk.id;
    const badge=maxed?'✔ Maks':needLvl?('🔒 Lv '+sk.lvl)
      :locked?(needProf?'📈 '+RPG.profReqText(sk):'🔒')
      :(sk.active?'⚡ ':'')+sk.cost+' SP';
    d.innerHTML=`<div class="t-ico">${this.skillIcon(sk)}</div>
      <div class="t-nm">${sk.name}</div>
      <div class="t-rk">Rank ${rank}/${sk.max}</div>
      <div class="t-badge">${badge}</div>`;
    /* TOOLTIP LENGKAP: desktop = hover mouse, mobile = tekan-lama (~450ms).
       Menggantikan teks node yang terpotong dengan panel keterangan penuh. */
    d.addEventListener('mouseenter',()=>this.showSkillTip(sk,d));
    d.addEventListener('mouseleave',()=>this.hideSkillTip());
    let lpTimer=null,lpFired=false;
    d.addEventListener('touchstart',()=>{
      lpFired=false;
      lpTimer=setTimeout(()=>{lpFired=true;this.showSkillTip(sk,d);},450);
    },{passive:true});
    const clearLP=()=>{if(lpTimer){clearTimeout(lpTimer);lpTimer=null;}};
    d.addEventListener('touchmove',clearLP,{passive:true});
    d.addEventListener('touchend',()=>{clearLP();if(lpFired)setTimeout(()=>this.hideSkillTip(),1600);});
    if(learnable)
      d.addEventListener('click',e=>{e.stopPropagation();
        if(lpFired){lpFired=false;return;}       // tekan-lama: jangan belajar
        RPG.learn(sk.id);});
    return d;
  },
  /* ---------- panel keterangan skill (tooltip) ---------- */
  ensureSkillTip(){
    if(this._skillTip)return this._skillTip;
    const el=document.createElement('div');
    el.id='skill-tip';el.className='hidden';
    document.body.appendChild(el);
    this._skillTip=el;
    return el;
  },
  showSkillTip(sk,anchor){
    const el=this.ensureSkillTip();
    const rank=RPG.skillVal(sk.id);
    const maxed=rank>=sk.max;
    const reqMet=!sk.req||RPG.skillVal(sk.req)>0;
    const lvlMet=!sk.lvl||Player.level>=sk.lvl;
    const afford=RPG.sp>=sk.cost;
    const kind=sk.active?'<span class="st-type act">⚡ AKTIF</span>':'<span class="st-type pas">🔷 Pasif</span>';
    let html=`<div class="st-nm">${this.skillIcon(sk)} ${sk.name} ${kind}</div>
      <div class="st-rk">Rank ${rank}/${sk.max}</div>
      <div class="st-desc">${sk.desc}</div>`;
    if(sk.req){
      const p=SKILLS.find(s=>s.id===sk.req);
      html+=`<div class="st-line ${reqMet?'ok':'no'}">${reqMet?'✔':'🔒'} Butuh skill: ${p?p.name:sk.req}</div>`;
    }
    if(sk.lvl){
      html+=`<div class="st-line ${lvlMet?'ok':'no'}">${lvlMet?'✔':'🔒'} Butuh Level ${sk.lvl} (kini ${Player.level})</div>`;
    }
    if(sk.prof&&typeof SUBSKILLS!=='undefined'&&typeof Prof!=='undefined'){
      for(const id in sk.prof){
        const s=SUBSKILLS[id];const have=Prof.level(id);const need=sk.prof[id];
        const ok=have>=need;
        html+=`<div class="st-line ${ok?'ok':'no'}">${ok?'✔':'📈'} ${(typeof UI!=='undefined'&&this.profIcon)?this.profIcon(id):(s?s.icon:'')} ${s?s.name:id} Lv ${have}/${need}</div>`;
      }
    }
    html+=`<div class="st-line ${afford?'ok':'no'}">💠 Biaya: ${sk.cost} SP (punya ${RPG.sp})</div>`;
    const status=maxed?'✔ Sudah maksimal':(!lvlMet)?`🔒 Terkunci — butuh Level ${sk.lvl}`:
      (!reqMet)?'🔒 Terkunci — penuhi syarat dulu':
      (afford?'✅ Klik untuk mempelajari':'⚠ Skill Point kurang');
    html+=`<div class="st-status">${status}</div>`;
    el.innerHTML=html;
    el.classList.remove('hidden');
    /* posisi: utamakan di atas node; turun bila tak muat; clamp di layar */
    const r=anchor.getBoundingClientRect();
    const tw=el.offsetWidth,th=el.offsetHeight;
    let x=r.left+r.width/2-tw/2;
    let y=r.top-th-8;
    if(y<6)y=r.bottom+8;
    x=clamp(x,6,Math.max(6,window.innerWidth-tw-6));
    y=clamp(y,6,Math.max(6,window.innerHeight-th-6));
    el.style.left=x+'px';el.style.top=y+'px';
  },
  hideSkillTip(){ if(this._skillTip)this._skillTip.classList.add('hidden'); },
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
      d.innerHTML=`<div class="prof-nm"><span>${this.profIcon(id)} ${s.name}</span>`+
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
    {k:'food',  t:'Makanan', img:'cmeat',          fb:'🍖'},
    {k:'weapon',t:'Senjata', img:'sword_wood',      fb:'🗡️'},
    {k:'armor', t:'Armor',   img:'plate_iron',      fb:'🛡️'},
    {k:'furni', t:'Furnitur',img:'f_chair',         fb:'🪑'},
    {k:'mat',   t:'Bahan',   img:'wood',            fb:'📦'},
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
        b.innerHTML=`<img class="tab-ico" src="buttons/${tb.img}.png" alt="" onerror="this.outerHTML='${tb.fb}'"> ${tb.t}`+(n?` <i>${n}</i>`:'');
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
        const learned=RPG.isLearned?RPG.isLearned(r):(!r.skill||RPG.skillVal(r.skill)>0);
        const st=RPG.stationReq?RPG.stationReq(r):null;
        const hasSt=RPG.hasStation?RPG.hasStation(st):true;
        const unlocked=learned&&hasSt;
        const hasNeed=Object.keys(r.need).every(id=>RPG.countItem(id)>=r.need[id]);
        const can=unlocked&&hasNeed;
        const needStr=Object.keys(r.need).map(id=>{
          const have=RPG.countItem(id);
          const cls=have>=r.need[id]?'ok':'no';
          return `<span class="${cls}">${this.itemIcon(id)}${r.need[id]} (punya ${have})</span>`;
        }).join(' ');
        const d=document.createElement('div');d.className='recipe';
        const statStr=learned?this.statChips(r.out):'';
        /* nama resep memakai nama ITEM (ikut bahasa aktif), bukan label resep */
        const rName=(ITEMS[r.out]&&ITEMS[r.out].n)||r.name;
        let lockReason='';
        if(!learned)lockReason=' — butuh '+RPG.recipeReqText(r);
        else if(!hasSt)lockReason=' — butuh '+(st==='stove'?'🍲 Kompor / Tungku':'🔨 Meja Kerja');
        let btnText='Buat';
        if(!learned)btnText='🔒';
        else if(!hasSt)btnText=(st==='stove'?'🔒 Butuh Kompor':'🔒 Butuh Meja Kerja');

        /* input jumlah + tombol Buat. */
        d.innerHTML=`<div class="out">${learned?this.itemIcon(r.out):'🔒'}</div>
          <div class="info"><div class="nm">${rName}${lockReason}</div>
          ${statStr}
          <div class="need">${learned?needStr:'🔒 '+RPG.recipeReqText(r)}</div></div>
          ${unlocked?'<input type="number" class="craft-qty" min="1" max="64" value="1">':''}
          <button ${can?'':'disabled'}>${btnText}</button>`;
        if(learned)d.querySelector('.out').title=this.itemTip(r.out);
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
      this.applyItemIcons(el);
    }
  },
};
