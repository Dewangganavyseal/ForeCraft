'use strict';
/* =============================================================================
   SETTINGS PANEL â€" Gear button UI + Multi-language system
   ---------------------------------------------------------------------------
   - Tombol âš™ di samping HP bar membuka panel settings.
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
    CURRENT_LANG=lid;
    try{localStorage.setItem('forecraft_lang',lid);}catch(e){}
    this.render();
    /* re-render UI utama agar teks langsung berubah */
    if(typeof UI!=='undefined'){
      UI.renderAll();
      if(UI.open==='settings')UI.toggle('settings'); // tutup & buka ulang panel
    }
    UI.toast('🌐 '+this.langs().find(x=>x.id===lid).name);
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

  /* ---------- render isi panel ---------- */
  render(){
    const el=document.getElementById('settings-content');
    if(!el)return;
    const l=key=>L(key);

    /* judul & tip mengikuti bahasa */
    const tt=document.getElementById('settings-title');
    if(tt)tt.childNodes[0].textContent=l('settings_title')+' ';
    const tp=document.getElementById('settings-tip');
    if(tp)tp.textContent=(CURRENT_LANG==='id'?'Setelan tersimpan otomatis.':
      CURRENT_LANG==='en'?'Settings saved automatically.':
      CURRENT_LANG==='zh'?'设置自动保存。':'設定は自動的に保存されます。');

    el.innerHTML='';

    /* ===== MUSIK ===== */
    const mus=document.createElement('div');
    mus.className='set-sec';
    const mtextId=CURRENT_LANG==='en'?'Play music':(CURRENT_LANG==='zh'?'播放音乐':'音楽を再生');
    const mvolume=CURRENT_LANG==='en'?'Volume':(CURRENT_LANG==='zh'?'音量':'音量');
    mus.innerHTML=`
      <div class="set-h">🎵 ${l('settings_music')}</div>
      <div class="mus-row"><span>${mtextId}</span>
        <button id="set-mus-tg" class="mus-tg"></button></div>
      <div class="mus-row"><span>${mvolume}</span>
        <input id="set-mus-vol" type="range" min="0" max="100" step="1"></div>`;
    el.appendChild(mus);
    const mtg=mus.querySelector('#set-mus-tg');
    const mvol=mus.querySelector('#set-mus-vol');
    const syncMus=()=>{
      mtg.textContent=Music.on?'ON':'OFF';
      mtg.classList.toggle('on',Music.on);
      mvol.value=Math.round(Music.vol*100);
    };
    mtg.addEventListener('click',()=>{Music.toggle();syncMus();});
    mvol.addEventListener('input',()=>Music.setVol((+mvol.value)/100));
    syncMus();

    /* ===== SFX ===== */
    const sfx=document.createElement('div');
    sfx.className='set-sec';
    const stext=CURRENT_LANG==='en'?'Play SFX':(CURRENT_LANG==='zh'?'播放音效':'効果音を再生');
    sfx.innerHTML=`
      <div class="set-h">🔊 ${l('settings_sfx')}</div>
      <div class="mus-row"><span>${stext}</span>
        <button id="set-sfx-tg" class="mus-tg"></button></div>
      <div class="mus-row"><span>${mvolume}</span>
        <input id="set-sfx-vol" type="range" min="0" max="100" step="1"></div>`;
    el.appendChild(sfx);
    const stg=sfx.querySelector('#set-sfx-tg');
    const svol=sfx.querySelector('#set-sfx-vol');
    const syncSfx=()=>{
      stg.textContent=this.sfx?'ON':'OFF';
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
      <div class="set-h">🎨 ${l('settings_custom')}</div>
      <p class="tip" style="margin-top:0">${CURRENT_LANG==='id'?'Geser & atur ukuran tombol HUD sesukamu.':
        CURRENT_LANG==='en'?'Drag & resize HUD buttons to your liking.':
        CURRENT_LANG==='zh'?'随意拖动和调整HUD按钮的大小。':'HUDボタンを自由にドラッグ＆リサイズ。'}</p>
      <button class="big" id="set-open-uistudio">🎨 ${CURRENT_LANG==='id'?'Buka UI Studio':CURRENT_LANG==='en'?'Open UI Studio':CURRENT_LANG==='zh'?'打开 UI 工作室':'UI スタジオを開く'}</button>`;
    el.appendChild(cui);
    cui.querySelector('#set-open-uistudio').addEventListener('click',()=>{
      if(typeof UI!=='undefined'&&UI.open==='settings')UI.toggle('settings'); // tutup panel dulu
      if(typeof UIStudio!=='undefined')UIStudio.open();
    });

    /* ===== SAVE MANUAL ===== */
    const sv=document.createElement('div');
    sv.className='set-sec';
    sv.innerHTML=`
      <div class="set-h">💾 ${l('settings_save')}</div>
      <button class="big" id="set-save">💾 ${CURRENT_LANG==='id'?'Simpan Sekarang':CURRENT_LANG==='en'?'Save Now':CURRENT_LANG==='zh'?'立即保存':'今すぐ保存'}</button>`;
    el.appendChild(sv);
    sv.querySelector('#set-save').addEventListener('click',()=>{
      if(typeof RPG!=='undefined'){
        RPG.save();
        UI.toast('💾 '+(CURRENT_LANG==='id'?'Permainan disimpan!':
          CURRENT_LANG==='en'?'Game saved!':
          CURRENT_LANG==='zh'?'游戏已保存！':'ゲームを保存しました！'));
      }
    });

    /* ===== BAHASA ===== */
    const lng=document.createElement('div');
    lng.className='set-sec';
    lng.innerHTML=`<div class="set-h">🌐 ${l('settings_lang')}</div>`;
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
