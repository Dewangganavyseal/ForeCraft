'use strict';
/* =============================================================================
   LOG PASS — penanda lokasi pribadi
   -----------------------------------------------------------------------------
   Item `log_pass` menyimpan SATU tanda lokasi di dalam slotnya sendiri
   (field per-slot `mark` = {name,x,y,z}). Karena definisi itemnya memakai
   `tool:'logpass'`, stackCap() mengembalikan 1 sehingga setiap Log Pass selalu
   menempati slot terpisah — dua Log Pass TIDAK PERNAH digabung dan tandanya
   tidak mungkin saling menimpa.

   Alur pemakaian:
     1. Pegang Log Pass di hotbar → notifikasi kiri menampilkan nama tandanya.
     2. Klik (tombol serang) → dialog kecil untuk mengisi nama lokasi.
        · OK    → tanda BARU disimpan di posisi pemain saat ini.
        · Batal → tidak ada yang berubah (tanda lama tetap utuh).
     3. Selama Log Pass bertanda itu dipegang, kompas di atas layar menampilkan
        GARIS MERAH ke arah tandanya + jaraknya (lihat UI.renderCompassMark).

   Tanda menempel pada ITEM-nya, bukan pada pemain: dibuang ke tanah, dipindah
   ke tas/peti, atau disimpan-muat ulang, tandanya tetap ikut.

   Modul mandiri: window.LogPass. Di-hook ke Player.updateHeld (notifikasi) dan
   Player.tryAttack (klik untuk menandai) di bagian bawah file.
   ============================================================================= */
const LogPass={
  ID:'log_pass',
  NAME_MAX:24,
  _sig:null,                 // tanda tangan item yang dipegang (deteksi ganti)

  /* ---------- akses slot yang sedang dipegang ---------- */
  isPass(slot){return !!(slot&&slot.id===this.ID);},
  /* slot Log Pass yang sedang dipegang di hotbar, atau null */
  heldSlot(){
    if(typeof RPG==='undefined'||RPG.sel<0)return null;
    const s=RPG.hotbar[RPG.sel];
    return this.isPass(s)?s:null;
  },
  /* tanda dari Log Pass yang sedang dipegang; null bila belum ditandai.
     Dipakai UI.renderCompassMark untuk menggambar garis merah. */
  heldMark(){
    const s=this.heldSlot();
    return (s&&s.mark&&isFinite(s.mark.x)&&isFinite(s.mark.z))?s.mark:null;
  },
  /* label singkat untuk notifikasi & tooltip */
  label(slot){
    if(!this.isPass(slot))return '';
    return (slot.mark&&slot.mark.name)?slot.mark.name:'belum ditandai';
  },

  /* =========================================================================
     KLIK: buka dialog nama lokasi
     Dipanggil dari Player.tryAttack (lihat hook di bawah). Mengembalikan true
     bila klik ini SUDAH ditangani, sehingga pemain tidak ikut menyerang.
     ========================================================================= */
  tryUse(){
    const s=this.heldSlot();
    if(!s)return false;
    /* kondisi yang membuat klik diabaikan tapi TETAP tidak menyerang */
    if(typeof Player==='undefined'||Player.dead)return true;
    if(typeof UI!=='undefined'&&UI.modalOpen&&UI.modalOpen())return true;
    if(typeof Capture!=='undefined'&&Capture.riding){
      UI.toast('🐴 Turun dulu untuk menandai lokasi');
      return true;
    }
    this.openDialog(RPG.sel,s);
    return true;
  },

  /* ---------- dialog nama lokasi (OK / Batal) ---------- */
  openDialog(slotIdx,slot){
    const px=Math.round(Player.pos.x),pz=Math.round(Player.pos.z);
    const old=slot.mark;
    const it=(typeof ITEMS!=='undefined'&&ITEMS[this.ID])||{e:'🧭',n:'Log Pass'};
    const info=old
      ? `Ganti tanda <b>${UI.esc(old.name)}</b> dengan lokasi di sini?`
      : 'Tandai lokasi kamu sekarang:';
    UI.modal({
      icon:(typeof UI!=='undefined'&&UI.itemIcon)?UI.itemIcon(this.ID):it.e,
      text:`${info}<br><span style="font-size:12px;color:#9fd7ff">📍 ${px}, ${pz}</span>`,
      textInput:{value:old?old.name:'',placeholder:'Nama lokasi…',
        maxlength:this.NAME_MAX},
      okLabel:'✔ OK',cancelLabel:'✖ Batal',
      onOk:(name)=>this.saveMark(slotIdx,name),
      /* Batal: tidak menyentuh slot sama sekali — tanda lama tetap utuh */
      onCancel:()=>{ if(typeof Sfx!=='undefined'&&Sfx.click)Sfx.click(); }
    });
  },

  /* ---------- simpan tanda ke slot ---------- */
  saveMark(slotIdx,rawName){
    /* Slot bisa berubah selama dialog terbuka (item dipindah/dibuang), jadi
       diperiksa ulang — pola yang sama dipakai UI.confirmDropPlayer. */
    const s=RPG.hotbar[slotIdx];
    if(!this.isPass(s)){
      UI.toast('❔ Log Pass sudah tidak dipegang');
      return;
    }
    let name=String(rawName||'').trim().slice(0,this.NAME_MAX);
    if(!name)name=`Titik ${Math.round(Player.pos.x)},${Math.round(Player.pos.z)}`;
    s.mark={name,
      x:+Player.pos.x.toFixed(2),
      y:+Player.pos.y.toFixed(2),
      z:+Player.pos.z.toFixed(2)};
    this._sig=null;                       // paksa notifikasi ter-refresh
    UI.toast(`🧭 Lokasi ditandai: ${name}`);
    if(typeof Sfx!=='undefined'&&Sfx.craft)Sfx.craft();
    if(typeof FX!=='undefined'){
      if(FX.ring)FX.ring(Player.pos.x,Player.pos.y+0.06,Player.pos.z,0xff3b30,0.7,2.6);
      if(FX.text)FX.text(Player.pos.clone().add(new THREE.Vector3(0,2.2,0)),'📍','#ff8a80');
    }
    if(typeof UI!=='undefined'){
      UI.renderHotbar();
      if(UI.open==='bag')UI.renderBag();
    }
  },

  /* =========================================================================
     NOTIFIKASI SAAT DIPEGANG
     Dipanggil tiap frame lewat hook Player.updateHeld. Notifikasi hanya muncul
     saat item yang dipegang BERGANTI (termasuk berpindah antar Log Pass yang
     berbeda), bukan tiap frame.
     ========================================================================= */
  tick(){
    if(typeof RPG==='undefined')return;
    const s=this.heldSlot();
    /* tanda tangan mencakup indeks slot + nama tanda supaya berganti dari satu
       Log Pass ke Log Pass lain (id-nya sama) tetap terdeteksi */
    const sig=s?(RPG.sel+'|'+(s.mark?s.mark.name:'')):null;
    if(sig===this._sig)return;
    const first=this._sig===null&&sig===null;
    this._sig=sig;
    if(!s||first)return;
    if(s.mark){
      const d=Math.round(Math.hypot(s.mark.x-Player.pos.x,s.mark.z-Player.pos.z));
      UI.toast(`🧭 ${s.mark.name} · ${d}m`);
    }else{
      UI.toast('🧭 Log Pass kosong — klik untuk menandai lokasi');
    }
  },
};
window.LogPass=LogPass;

/* =============================================================================
   HOOK ke sistem yang sudah ada (tanpa mengubah file lain lebih dari perlu)
   ============================================================================= */
(function(){
  if(typeof Player==='undefined')return;

  /* 1. KLIK / TOMBOL SERANG → tandai lokasi.
        Dipasang sebagai pembungkus supaya seluruh rantai guard asli tryAttack
        (mati, dodge, minigame tangkap) tetap berjalan lebih dulu untuk kasus
        lain, sementara Log Pass memotong sebelum ayunan dimulai. */
  const _tryAttack=Player.tryAttack.bind(Player);
  Player.tryAttack=function(){
    if(!this.dead&&!this.dodge.active&&!this.slamQuick&&LogPass.tryUse())return;
    _tryAttack();
  };

  /* 2. GANTI ITEM DI TANGAN → notifikasi nama tanda.
        updateHeld() asli hanya membandingkan ID item, jadi berpindah antar dua
        Log Pass berbeda tidak terdeteksi; LogPass.tick() menutup celah itu. */
  const _updateHeld=Player.updateHeld.bind(Player);
  Player.updateHeld=function(){
    _updateHeld();
    LogPass.tick();
  };
})();
