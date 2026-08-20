'use strict';
/* =============================================================================
   UI STUDIO — editor HUD ala game engine
   -----------------------------------------------------------------------------
   - Terpisah dari gameplay; dipakai untuk development.
   - Mode Mobile / PC dideteksi otomatis, tapi tetap bisa dipilih manual.
   - Setiap tombol penting bisa digeser & diatur ukurannya masing-masing.
   - Hotbar, chat, party, compass+coin, HP/stamina/hunger/XP punya group.
   - Save JS: mencoba menulis langsung ke js/ui_layout.js lewat server lokal,
     fallback File System Access / download.
   ============================================================================= */
const UIStudio={
  KEY:'forecraft_ui_layout_v3',
  active:false,
  tab:'pc',
  realTouch:false,
  selected:null,
  store:{mobile:{scale:1,els:{}},pc:{scale:1,els:{}}},

  /* ---------------- item yang bisa diedit ---------------- */
  STATIC:{
    mobile:[
      ['stats','HP / Stamina / Hunger / XP'],
      ['topright','Compass, Jam & Koin'],
      ['hotbar','Hotbar'],
      ['chat','Chat Area'],
      ['team','Party Area'],
      ['joy-zone','Joystick'],
      ['m-active','Skill Bar'],
      ['questtrack','Quest Tracker'],
      ['m-bag','Tombol Bag'],
      ['m-craft','Tombol Crafting'],
      ['m-skill','Tombol Skill'],
      ['m-chat','Tombol Chat'],
      ['m-talk','Tombol Bicara'],
      ['m-roll','Tombol Roll'],
      ['m-jump','Tombol Jump'],
      ['m-attack','Tombol Attack'],
    ],
    pc:[
      ['stats','HP / Stamina / Hunger / XP'],
      ['topright','Compass, Jam & Koin'],
      ['hotbar','Hotbar'],
      ['chat','Chat Area'],
      ['team','Party Area'],
      ['skillbar','Skill Bar'],
      ['questtrack','Quest Tracker'],
    ],
  },

  /* ---------------- init ---------------- */
  init(){
    this.load();
    this.buildButton();
    this.buildOverlay();
    this.applyCurrent();
  },

  load(){
    let obj=null;
    try{obj=JSON.parse(localStorage.getItem(this.KEY)||'null');}catch(e){}
    if(!obj){
      try{obj=JSON.parse(localStorage.getItem('forecraft_ui_layout_v2')||'null');}catch(e){}
    }
    if(!obj&&typeof UI_LAYOUT_CUSTOM!=='undefined'&&UI_LAYOUT_CUSTOM)obj=UI_LAYOUT_CUSTOM;
    if(obj){
      for(const m of['mobile','pc']){
        if(obj[m]){
          this.store[m]={scale:obj[m].scale||1,els:Object.assign({},obj[m].els||{})};
        }
      }
    }
  },

  saveLocal(){
    try{localStorage.setItem(this.KEY,JSON.stringify(this.store));}catch(e){}
  },

  defaultMode(){return (typeof IS_MOBILE!=='undefined'&&IS_MOBILE)?'mobile':'pc';},

  /* ---------------- tombol pembuka ----------------
     Tombol 🎛️ melayang DIHAPUS: UI Studio kini dibuka dari panel
     Pengaturan (⚙️ di samping bar HP) atau tombol U. buildButton()
     dibiarkan no-op agar init() lama tetap aman. */
  buildButton(){},

  /* ---------------- overlay ---------------- */
  buildOverlay(){
    if(document.getElementById('uistudio'))return;
    const root=document.createElement('div');
    root.id='uistudio';
    root.innerHTML=`
      <div class="us-bar">
        <button id="us-min" title="Sembunyikan bar">▾</button>
        <div class="us-tabs us-desktop-only">
          <button id="us-tab-mobile">📱 Mobile</button>
          <button id="us-tab-pc">💻 PC</button>
        </div>
        <label class="us-lab"><span id="us-mode-lab">UI</span>
          <input id="us-scale" type="range" min="0.4" max="2.5" step="0.05" value="1">
          <span id="us-scale-val">100%</span>
        </label>
        <span id="us-sel" class="us-sel">Klik elemen untuk memilih</span>
        <button id="us-save" class="us-desktop-only">💾 Save JS</button>
        <button id="us-save-local" class="us-mobile-only">💾 Save</button>
        <button id="us-reset">↺ Reset</button>
        <button id="us-cancel" class="us-mobile-only">✖ Cancel</button>
        <button id="us-close">✕ Close</button>
      </div>
      <div class="us-handles"></div>
    `;
    document.body.appendChild(root);
    this.root=root;
    this.handlesRoot=root.querySelector('.us-handles');

    root.querySelector('#us-tab-mobile').addEventListener('click',()=>this.setTab('mobile'));
    root.querySelector('#us-tab-pc').addEventListener('click',()=>this.setTab('pc'));
    root.querySelector('#us-close').addEventListener('click',()=>this.close());
    root.querySelector('#us-reset').addEventListener('click',()=>this.resetTab());
    root.querySelector('#us-save').addEventListener('click',()=>this.saveJs());
    root.querySelector('#us-save-local').addEventListener('click',()=>{
      this.saveLocal();
      this._snapshot=JSON.stringify(this.store);
      if(typeof UI!=='undefined')UI.toast('💾 Layout UI tersimpan');
    });
    root.querySelector('#us-cancel').addEventListener('click',()=>this.cancel());
    root.querySelector('#us-min').addEventListener('click',()=>{
      const bar=root.querySelector('.us-bar');
      bar.classList.toggle('min');
      root.querySelector('#us-min').textContent=bar.classList.contains('min')?'🎛️':'▾';
    });

    const slider=root.querySelector('#us-scale');
    slider.addEventListener('input',()=>{
      const v=parseFloat(slider.value)||1;
      root.querySelector('#us-scale-val').textContent=Math.round(v*100)+'%';
      if(this.selected)this.setItemScale(this.selected,v);
      else this.setGlobalScale(v);
    });
  },

  open(){
    if(this.active)return;
    this.active=true;
    this.realTouch=(typeof IS_MOBILE!=='undefined'&&IS_MOBILE);
    /* snapshot untuk Cancel */
    this._snapshot=JSON.stringify(this.store);
    document.body.classList.toggle('us-real-mobile',this.realTouch);
    this.root.style.display='block';
    document.body.classList.add('us-edit');
    this.setTab(this.defaultMode());
  },

  close(){
    if(!this.active)return;
    this.active=false;
    this.root.style.display='none';
    document.body.classList.remove('us-edit');
    this.clearGhosts();
    document.body.classList.toggle('touch',this.realTouch);
    this.selected=null;
    this.applyMode(this.defaultMode());
  },

  cancel(){
    /* kembalikan layout ke snapshot terakhir (open/last save), tetap buka */
    if(this._snapshot){
      try{this.store=JSON.parse(this._snapshot);}catch(e){}
      this.saveLocal();
      this.applyMode(this.tab);
      this.refreshHandles();
      this.syncControls();
      if(typeof UI!=='undefined')UI.toast('↩ Perubahan dibatalkan');
    }
  },

  toggle(){this.active?this.close():this.open();},

  /* ---------------- tab ---------------- */
  setTab(mode){
    this.tab=mode;
    this.selected=null;
    document.body.classList.toggle('touch',mode==='mobile');
    requestAnimationFrame(()=>{
      this.prepareGhosts();
      this.applyMode(mode);
      this.refreshHandles();
      this.syncControls();
    });
  },

  /* ---------------- ghost untuk area kosong ---------------- */
  prepareGhosts(){
    this.clearGhosts();
    const ghost=(el,txt)=>{
      if(!el)return;
      if(el.querySelector(':scope > *')===null){
        const g=document.createElement('div');
        g.className='us-ghost';
        g.textContent=txt;
        el.appendChild(g);
      }
    };
    ghost(document.getElementById('team'),'Party');
    if(this.tab==='mobile')ghost(document.getElementById('m-active'),'Skills');
    else ghost(document.getElementById('skillbar'),'Skills');
  },

  clearGhosts(){
    document.querySelectorAll('.us-ghost').forEach(g=>g.remove());
  },

  /* ---------------- daftar entry ---------------- */
  getEntries(mode){
    const out=[];
    for(const[id,label]of this.STATIC[mode]){
      out.push({key:id,label,el:document.getElementById(id)});
    }
    /* skill aktif individual */
    const sel=mode==='mobile'?'#m-active button':'#skillbar button';
    document.querySelectorAll(sel).forEach(b=>{
      const id=b.dataset.id||b.textContent.trim();
      out.push({key:'skill:'+id,label:'Skill '+id,el:b});
    });
    return out;
  },

  allEntries(){
    return this.getEntries('mobile').concat(this.getEntries('pc'));
  },

  baseFor(key){
    if(key==='hotbar'||key==='topright')return'translateX(-50%)';
    if(key==='questtrack')return this.tab==='pc'?'translateY(-50%)':'';
    if(key==='skillbar')return(window.innerWidth>=820)?'':'translateX(-50%)';
    return'';
  },

  /* ---------------- apply layout ---------------- */
  applyMode(mode){
    const prof=this.store[mode]||{scale:1,els:{}};
    /* bersihkan transform custom dari semua entry */
    for(const e of this.allEntries()){
      if(e.el&&e.el.style)e.el.style.transform='';
    }
    const entries=this.getEntries(mode);
    for(const e of entries){
      if(!e.el)continue;
      const o=prof.els[e.key];
      const global=prof.scale||1;
      if(!o&&Math.abs(global-1)<0.001)continue;
      const dx=o?o.dx||0:0;
      const dy=o?o.dy||0:0;
      const s=(global)*(o?(o.s||1):1);
      const base=this.baseFor(e.key);
      e.el.style.transform=(base+' translate('+(dx*100)+'vw,'+(dy*100)+'vh) scale('+s+')').trim();
      e.el.style.transformOrigin='center';
    }
  },

  applyCurrent(){
    this.applyMode(this.defaultMode());
  },

  /* ---------------- handles ---------------- */
  refreshHandles(){
    if(!this.handlesRoot)return;
    this.handlesRoot.innerHTML='';
    if(!this.active)return;
    for(const e of this.getEntries(this.tab)){
      if(!e.el)continue;
      const r=e.el.getBoundingClientRect();
      if(r.width<2||r.height<2)continue;
      const h=document.createElement('div');
      h.className='us-handle'+(this.selected===e.key?' sel':'');
      h.dataset.key=e.key;
      h.style.left=r.left+'px';
      h.style.top=r.top+'px';
      h.style.width=r.width+'px';
      h.style.height=r.height+'px';
      h.innerHTML=`<span>${e.label}</span>`;
      this.bindHandle(h,e.key);
      this.handlesRoot.appendChild(h);
    }
  },

  bindHandle(h,key){
    h.addEventListener('pointerdown',e=>{
      e.preventDefault();e.stopPropagation();
      this.selected=key;
      const prof=this.store[this.tab];
      if(!prof.els[key])prof.els[key]={dx:0,dy:0,s:1};
      const start=prof.els[key];
      const sx=e.clientX,sy=e.clientY;
      const ox=start.dx,oy=start.dy;
      this.syncControls();
      this.refreshHandles();

      const move=ev=>{
        start.dx=ox+(ev.clientX-sx)/Math.max(1,window.innerWidth);
        start.dy=oy+(ev.clientY-sy)/Math.max(1,window.innerHeight);
        this.applyMode(this.tab);
        this.refreshHandles();
      };
      const up=()=>{
        window.removeEventListener('pointermove',move);
        window.removeEventListener('pointerup',up);
        this.saveLocal();
      };
      window.addEventListener('pointermove',move);
      window.addEventListener('pointerup',up);
    });
  },

  /* ---------------- skala ---------------- */
  setGlobalScale(v){
    const prof=this.store[this.tab];
    prof.scale=v;
    this.saveLocal();
    this.applyMode(this.tab);
    this.refreshHandles();
  },

  setItemScale(key,v){
    const prof=this.store[this.tab];
    if(!prof.els[key])prof.els[key]={dx:0,dy:0,s:1};
    prof.els[key].s=v;
    this.saveLocal();
    this.applyMode(this.tab);
    this.refreshHandles();
  },

  syncControls(){
    if(!this.root)return;
    const prof=this.store[this.tab];
    this.root.querySelector('#us-tab-mobile').classList.toggle('on',this.tab==='mobile');
    this.root.querySelector('#us-tab-pc').classList.toggle('on',this.tab==='pc');
    const slider=this.root.querySelector('#us-scale');
    const val=this.root.querySelector('#us-scale-val');
    const lab=this.root.querySelector('#us-mode-lab');
    const sel=this.root.querySelector('#us-sel');
    let v=prof.scale||1;
    if(this.selected){
      const o=prof.els[this.selected];
      v=o?(o.s||1):1;
      lab.textContent='Item';
      sel.textContent='✦ '+this.selected;
    }else{
      lab.textContent='Global';
      sel.textContent='Klik elemen untuk memilih';
    }
    slider.value=v;
    val.textContent=Math.round(v*100)+'%';
  },

  /* ---------------- reset ---------------- */
  resetTab(){
    if(!confirm('Reset layout '+this.tab.toUpperCase()+' ke default?'))return;
    this.store[this.tab]={scale:1,els:{}};
    this.selected=null;
    this.saveLocal();
    this.applyMode(this.tab);
    this.refreshHandles();
    this.syncControls();
  },

  /* ---------------- generate & save JS ---------------- */
  generateJs(){
    const data=JSON.stringify(this.store,null,2);
    return '/* =========================================================================\n'+
      '   UI STUDIO — layout custom (generated)\n'+
      '   File ini ditulis oleh UI Studio. Edits manual tetap bisa, tapi format\n'+
      '   harus sama: mobile/pc -> { scale, els: { key: {dx,dy,s} } }\n'+
      '   ========================================================================= */\n'+
      'const UI_LAYOUT_CUSTOM='+data+';\n';
  },

  saveJs(){
    this.saveLocal();
    this._snapshot=JSON.stringify(this.store);
    const js=this.generateJs();

    /* 1) local dev server (tools/ui-studio-server.js) */
    fetch('/__ui_studio_save',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({file:'js/ui_layout.js',content:js}),
    }).then(r=>{
      if(!r.ok)throw new Error('server');
      if(typeof UI!=='undefined')UI.toast('💾 js/ui_layout.js berhasil diupdate');
    }).catch(()=>{
      /* 2) File System Access API */
      if(window.showSaveFilePicker){
        window.showSaveFilePicker({
          suggestedName:'ui_layout.js',
          types:[{description:'JavaScript',accept:{'text/javascript':['.js']}}],
        }).then(async h=>{
          const w=await h.createWritable();
          await w.write(js);
          await w.close();
          if(typeof UI!=='undefined')UI.toast('💾 ui_layout.js tersimpan');
        }).catch(()=>{});
        return;
      }
      /* 3) fallback download */
      const blob=new Blob([js],{type:'text/javascript'});
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download='ui_layout.js';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href),2000);
      if(typeof UI!=='undefined')UI.toast('⬇️ ui_layout.js diunduh');
    });
  },
};

window.addEventListener('load',()=>UIStudio.init());
