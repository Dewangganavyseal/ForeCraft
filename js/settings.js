'use strict';
/* =============================================================================
   SETTINGS PANEL — Gear button UI + Multi-language system
   ---------------------------------------------------------------------------
   - Tombol ⚙ di samping HP bar membuka panel settings.
   - Panel berisi: Musik (toggle+volume), SFX, Custom UI (UIStudio),
     Simpan Manual, dan pilihan Bahasa (ID/EN/ZH/JA).
   - Sistem bahasa: dictionary `locales` di config.js + helper L(key).
     Semua teks UI sebaiknya pakai L() agar otomatis ter-translate.
   ========================================================================== */
const Settings={
  KEY:'forecraft_settings_v1',
  panel:null,

  /* ---------- state (disimpan ke localStorage) ---------- */
  sfx:true,sfxVol:0.8,

  load(){
    try{
      const d=JSON.parse(localStorage.getItem(this.KEY)||'null');
      if(d){
        if(typeof d.sfx==='boolean')this.sfx=d.sfx;
        if(typeof d.sfxVol==='number')this.sfxVol=clamp(d.sfxVol,0,1);
      }
    }catch(e){}
    /* terapkan ke Sfx */
    if(typeof Sfx!=='undefined'){Sfx.sfxEnabled=this.sfx;Sfx.sfxVol=this.sfxVol;}
  },
  save(){
    try{localStorage.setItem(this.KEY,JSON.stringify({sfx:this.sfx,sfxVol:this.sfxVol}));}catch(e){}
  },

  /* ---------- bahasa ---------- */
  langs(){
    return [
      {id:'id',name:'🇮🇩 Indonesia'},
      {id:'en',name:'🇬🇧 English'},
      {id:'zh',name:'🇨🇳 中文'},
      {id:'ja',name:'🇯🇵 日本語'}
    ];
  },
  setLang(lid){
    if(!locales[lid])return;
    CURRENT_LANG=lid;
    try{localStorage.setItem('forecraft_lang',lid);}catch(e){}
    /* terapkan bahasa ke DATA GAME (item, mob, NPC, skill, dialog) + seluruh DOM */
    if(typeof I18N!=='undefined')I18N.apply(lid);
    /* re-render UI utama agar teks langsung berubah; panel TIDAK ditutup,
       cukup digambar ulang supaya user melihat hasil bahasa baru seketika. */
    if(typeof UI!=='undefined'&&UI.renderAll)UI.renderAll();
    if(typeof MainMenu!=='undefined'&&MainMenu.el&&typeof Game!=='undefined'&&Game.menuMode&&MainMenu.showMain)MainMenu.showMain();
    this.render();
    if(typeof I18N!=='undefined')I18N.refresh();
    const ln=this.langs().find(x=>x.id===lid);
    if(typeof UI!=='undefined'&&UI.toast)UI.toast('🌐 '+L('settings_lang_set',{name:ln?ln.name:lid}));
  },

  /* ---------- init: pasang listener tombol gear ---------- */
  init(){
    this.load();
    const btn=document.getElementById('btn-gear');
    if(btn){
      btn.addEventListener('click',e=>{
        e.preventDefault();
        if(typeof UI!=='undefined')UI.toggle('settings');
      });
    }
  },

  /* ---------- render isi panel ----------
     SEMUA teks di sini WAJIB lewat L(). Jangan pakai ternary CURRENT_LANG===...
     karena pola itulah yang dulu membuat teks tercampur antar bahasa. */
  render(){
    const el=document.getElementById('settings-content');
    if(!el)return;

    /* judul & tip mengikuti bahasa */
    const tt=document.getElementById('settings-title');
    if(tt){
      /* tulis ulang node teks pertama saja agar tombol × tidak terhapus */
      let tn=null;
      for(const n of tt.childNodes){if(n.nodeType===3){tn=n;break;}}
      if(tn)tn.nodeValue=L('settings_title')+' ';
    }
    const tp=document.getElementById('settings-tip');
    if(tp)tp.textContent=L('settings_tip');

    const ON=L('settings_on'),OFF=L('settings_off'),VOL=L('settings_volume');
    el.innerHTML='';

    /* ===== MUSIK ===== */
    const mus=document.createElement('div');
    mus.className='set-sec';
    mus.innerHTML=`
      <div class="set-h">🎵 ${L('settings_music')}</div>
      <div class="mus-row"><span>${L('settings_music_play')}</span>
        <button id="set-mus-tg" class="mus-tg"></button></div>
      <div class="mus-row"><span>${VOL}</span>
        <input id="set-mus-vol" type="range" min="0" max="100" step="1"></div>`;
    el.appendChild(mus);
    const mtg=mus.querySelector('#set-mus-tg');
    const mvol=mus.querySelector('#set-mus-vol');
    const syncMus=()=>{
      mtg.textContent=Music.on?ON:OFF;
      mtg.classList.toggle('on',Music.on);
      mvol.value=Math.round(Music.vol*100);
    };
    mtg.addEventListener('click',()=>{Music.toggle();syncMus();});
    mvol.addEventListener('input',()=>Music.setVol((+mvol.value)/100));
    syncMus();

    /* ===== SFX ===== */
    const sfx=document.createElement('div');
    sfx.className='set-sec';
    sfx.innerHTML=`
      <div class="set-h">🔊 ${L('settings_sfx')}</div>
      <div class="mus-row"><span>${L('settings_sfx_play')}</span>
        <button id="set-sfx-tg" class="mus-tg"></button></div>
      <div class="mus-row"><span>${VOL}</span>
        <input id="set-sfx-vol" type="range" min="0" max="100" step="1"></div>`;
    el.appendChild(sfx);
    const stg=sfx.querySelector('#set-sfx-tg');
    const svol=sfx.querySelector('#set-sfx-vol');
    const syncSfx=()=>{
      stg.textContent=this.sfx?ON:OFF;
      stg.classList.toggle('on',this.sfx);
      svol.value=Math.round(this.sfxVol*100);
    };
    stg.addEventListener('click',()=>{
      this.sfx=!this.sfx;this.save();syncSfx();
      if(typeof Sfx!=='undefined')Sfx.sfxEnabled=this.sfx;
    });
    svol.addEventListener('input',()=>{
      this.sfxVol=(+svol.value)/100;this.save();
      if(typeof Sfx!=='undefined')Sfx.sfxVol=this.sfxVol;
    });
    syncSfx();

    /* ===== CUSTOM UI ===== */
    const cui=document.createElement('div');
    cui.className='set-sec';
    cui.innerHTML=`
      <div class="set-h">🎨 ${L('settings_custom')}</div>
      <p class="tip" style="margin-top:0">${L('settings_custom_tip')}</p>
      <button class="big" id="set-open-uistudio">🎨 ${L('settings_custom_open')}</button>`;
    el.appendChild(cui);
    cui.querySelector('#set-open-uistudio').addEventListener('click',()=>{
      if(typeof UI!=='undefined'&&UI.open==='settings')UI.toggle('settings'); // tutup panel dulu
      if(typeof UIStudio!=='undefined')UIStudio.open();
    });

    /* ===== SAVE MANUAL ===== */
    const sv=document.createElement('div');
    sv.className='set-sec';
    sv.innerHTML=`
      <div class="set-h">💾 ${L('settings_save')}</div>
      <button class="big" id="set-save">💾 ${L('settings_save_now')}</button>`;
    el.appendChild(sv);
    sv.querySelector('#set-save').addEventListener('click',()=>{
      /* pakai SaveGame.now(): ikut menyimpan furnitur & memberi info rekan */
      if(typeof SaveGame!=='undefined'&&SaveGame.now){SaveGame.now();return;}
      if(typeof RPG!=='undefined'){
        RPG.save();
        if(typeof UI!=='undefined'&&UI.toast)UI.toast('💾 '+L('settings_saved'));
      }
    });

    /* ===== GRAFIS (Low / Medium / High / Ultra) =====
       Mengubah preset langsung menerapkan pixel ratio, bayangan, radius render,
       kepadatan rumput, subdivisi air, & jumlah hujan — lalu membangun ulang
       mesh dunia secara bertahap (tidak membekukan game). Hanya anti-aliasing
       yang butuh buka ulang game karena hanya bisa diset saat renderer dibuat. */
    if(typeof Gfx!=='undefined'){
      const gfx=document.createElement('div');
      gfx.className='set-sec';
      gfx.innerHTML=`
        <div class="set-h">🖥️ ${L('settings_gfx')}</div>
        <p class="tip" style="margin-top:0">${L('settings_gfx_tip')}</p>`;
      const grow=document.createElement('div');
      grow.className='set-lang-row';
      for(const lv of Gfx.levels()){
        const b=document.createElement('button');
        b.className='set-lang'+(Gfx.level===lv?' active':'');
        b.textContent=L('gfx_'+lv);
        b.addEventListener('click',()=>{
          const wasAA=Gfx.preset().antialias;
          Gfx.apply(lv,true);            // true = bangun ulang mesh dunia
          this.render();                 // segarkan tombol aktif
          if(typeof UI!=='undefined'&&UI.toast){
            UI.toast('🖥️ '+L('settings_gfx_set',{name:L('gfx_'+lv)}));
            if(wasAA!==Gfx.preset().antialias)UI.toast(L('settings_gfx_reload'));
          }
        });
        grow.appendChild(b);
      }
      gfx.appendChild(grow);
      el.appendChild(gfx);
    }

    /* ===== BAHASA ===== */
    const lng=document.createElement('div');
    lng.className='set-sec';
    lng.innerHTML=`<div class="set-h">🌐 ${L('settings_lang')}</div>`;
    const row=document.createElement('div');
    row.className='set-lang-row';
    for(const ln of this.langs()){
      const b=document.createElement('button');
      b.className='set-lang'+(CURRENT_LANG===ln.id?' active':'');
      b.textContent=ln.name;
      b.addEventListener('click',()=>this.setLang(ln.id));
      row.appendChild(b);
    }
    lng.appendChild(row);
    el.appendChild(lng);
  },
};
window.Settings=Settings;
