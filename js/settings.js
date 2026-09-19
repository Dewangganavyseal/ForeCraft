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

    /* ===== CONTROLLER & PANDUAN KONTROL ===== */
    const ctrlSec=document.createElement('div');
    ctrlSec.className='set-sec';
    ctrlSec.innerHTML=`
      <div class="set-h">🎮 Menu Controller & Panduan Kontrol</div>
      <p class="tip" style="margin-top:0">Lihat seluruh panduan tombol kontrol PC keyboard & mouse serta layar sentuh mobile.</p>
      <button class="big" id="btn-toggle-ctrl" style="background:#202a24;border:1.5px solid #38bdf8;color:#e0f2fe;font-weight:700">🎮 Lihat Semua Kontrol (All Controllers)</button>
      <div id="ctrl-guide-box" style="display:none;margin-top:10px;background:rgba(10,14,12,0.85);border:1px solid rgba(56,189,248,0.3);border-radius:10px;padding:12px;max-height:360px;overflow-y:auto;">
        <div style="font-weight:700;color:#38bdf8;margin-bottom:8px;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:4px;">🖥️ KONTROL KEYBOARD & MOUSE (PC)</div>
        <table class="help-t" style="width:100%;font-size:12px;line-height:1.6;border-collapse:collapse;">
          <tr><td style="padding:4px 6px;color:#ffe08a;width:35%;"><b>W A S D</b> / Panah</td><td style="padding:4px 6px;">Bergerak maju, mundur, kiri, kanan</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>SHIFT</b> (Tahan)</td><td style="padding:4px 6px;">Berlari kencang (Sprint)</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>SHIFT</b> (Tekan 2×)</td><td style="padding:4px 6px;">Mengelak cepat (Roll / Dodge)</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>SPASI (SPACE)</b></td><td style="padding:4px 6px;">Melompat / Berenang naik / Double Jump pet</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>Klik Kiri Mouse</b></td><td style="padding:4px 6px;">Serang kombo / Lempar Bom / Makan / Pancing</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>Q / E / R / T</b></td><td style="padding:4px 6px;">Skill aktif slot 1–4 (Q tahan untuk bidik Hantam Bumi)</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>Angka 1 – 7</b></td><td style="padding:4px 6px;">Memilih slot hotbar (tekan lagi untuk lepas tangan)</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>F</b></td><td style="padding:4px 6px;">Interaksi universal (Bicara, Rekrut, Perabot, Altar, Naik pet)</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>B</b></td><td style="padding:4px 6px;">Membuka / menutup Tas & Perlengkapan</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>K</b></td><td style="padding:4px 6px;">Membuka / menutup Pohon Skill & Profisiensi</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>C</b></td><td style="padding:4px 6px;">Membuka / menutup Menu Crafting</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>G</b></td><td style="padding:4px 6px;">Membuka / menutup Panel Rekan Tim (Party)</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>P</b></td><td style="padding:4px 6px;">Membuka / menutup Panel Karakter & Stat</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>V</b></td><td style="padding:4px 6px;">Mode Bangun Voxel (Build Mode)</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>ENTER</b></td><td style="padding:4px 6px;">Membuka kotak obrolan Chat & Kirim pesan</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>Panah ← →</b> / Klik Kanan</td><td style="padding:4px 6px;">Memutar sudut kamera (Orbit)</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>Panah ↑ ↓</b></td><td style="padding:4px 6px;">Mengatur sudut elevasi kamera</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>Scroll Roda Mouse</b></td><td style="padding:4px 6px;">Zoom kamera mendekat (FPP/TPP) atau menjauh</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>ESC</b></td><td style="padding:4px 6px;">Menutup panel aktif / Lepas kursor mouse</td></tr>
        </table>
        <div style="font-weight:700;color:#38bdf8;margin:14px 0 8px;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:4px;">📱 KONTROL LAYAR SENTUH (MOBILE)</div>
        <table class="help-t" style="width:100%;font-size:12px;line-height:1.6;border-collapse:collapse;">
          <tr><td style="padding:4px 6px;color:#ffe08a;width:35%;"><b>Analog Kiri Bawah</b></td><td style="padding:4px 6px;">Geser untuk bergerak (dorong penuh untuk sprint)</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>Tombol Pedang</b></td><td style="padding:4px 6px;">Serang kombo / Lempar Bom / Makan / Pancing</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>Tombol Lompat</b></td><td style="padding:4px 6px;">Melompat / Berenang / Double jump pet</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>Tombol Roll</b></td><td style="padding:4px 6px;">Mengelak cepat (Roll / Dodge)</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>Slot Skill Melingkar</b></td><td style="padding:4px 6px;">Pakai skill aktif 1–4 (tahan ikon hantam bumi untuk membidik)</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>Tombol 🤝</b></td><td style="padding:4px 6px;">Interaksi kontekstual (Bicara, Perabot, Altar, Party)</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>Dua Jari (Geser)</b></td><td style="padding:4px 6px;">Memutar kamera 360° dengan mulus</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>Dua Jari (Cubit)</b></td><td style="padding:4px 6px;">Zoom in / out kamera</td></tr>
          <tr><td style="padding:4px 6px;color:#ffe08a;"><b>Menu Cepat Kanan</b></td><td style="padding:4px 6px;">Akses Tas, Craft, Skill, Party, dan Mode Bangun</td></tr>
        </table>
      </div>`;
    el.appendChild(ctrlSec);

    const btnToggleCtrl=ctrlSec.querySelector('#btn-toggle-ctrl');
    const ctrlBox=ctrlSec.querySelector('#ctrl-guide-box');
    let ctrlOpen=false;
    btnToggleCtrl.addEventListener('click',()=>{
      ctrlOpen=!ctrlOpen;
      ctrlBox.style.display=ctrlOpen?'block':'none';
      btnToggleCtrl.textContent=ctrlOpen?'🔼 Tutup Panduan Kontrol':'🎮 Lihat Semua Kontrol (All Controllers)';
    });

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

    /* ===== TOMBOL MAIN MENU ===== */
    const mm=document.createElement('div');
    mm.className='set-sec';
    mm.innerHTML=`
      <div class="set-h">🏠 ${L('settings_main_menu')}</div>
      <button class="big" id="set-to-menu" style="background:#4a2824;border:1px solid #9e463a;color:#ffd4cc;font-weight:700">🏠 ${L('settings_to_main_menu')}</button>`;
    el.appendChild(mm);
    mm.querySelector('#set-to-menu').addEventListener('click',()=>{
      if(typeof UI!=='undefined'&&UI.open==='settings')UI.toggle('settings');
      if(typeof Game!=='undefined'&&Game.returnToMenu)Game.returnToMenu();
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
