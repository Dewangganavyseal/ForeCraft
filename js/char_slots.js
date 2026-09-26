'use strict';
/* =============================================================================
   CHARACTER SLOTS & CREATOR SYSTEM — FORECRAFT ONLINE
   -----------------------------------------------------------------------------
   - 5 Slot Karakter sebelum masuk ke Main Menu (2 slot bawah terkunci Gamepass).
   - Validasi nama unik di server (/api/check-name & /api/register-name).
   - Kiri full 3D visual karakter, kanan kustomisasi identitas & rambut.
   - Menu Karakter di Main Menu untuk ganti / hapus slot.
   ============================================================================= */

const CharacterSlots = {
  SLOTS_KEY: 'forecraft_char_slots_v1',
  ACTIVE_KEY: 'forecraft_active_char_slot',
  GAMEPASS_KEY: 'forecraft_gamepass_slots',

  HAIR_STYLES: [
    { id: 4,  name: 'Undercut (Default)' },
    { id: 1,  name: 'Cepak' },
    { id: 2,  name: 'Cepak Tinggi' },
    { id: 3,  name: 'Belah Samping' },
    { id: 5,  name: 'Poni Lurus' },
    { id: 6,  name: 'Poni Miring' },
    { id: 7,  name: 'Jambul' },
    { id: 8,  name: 'Spiky' },
    { id: 11, name: 'Mohawk' },
    { id: 14, name: 'Gondrong' },
    { id: 17, name: 'Ekor Kuda' },
    { id: 27, name: 'Man Bun' },
    { id: 0,  name: 'Plontos' }
  ],

  HAIR_COLORS: [
    { hex: 0x2c1f14, css: '#2c1f14', name: 'Cokelat Tua' },
    { hex: 0x141210, css: '#141210', name: 'Hitam Pekat' },
    { hex: 0x6e4528, css: '#6e4528', name: 'Cokelat Terang' },
    { hex: 0xc89842, css: '#c89842', name: 'Pirang Emas' },
    { hex: 0x8a2416, css: '#8a2416', name: 'Merah Tembaga' },
    { hex: 0x96a2b0, css: '#96a2b0', name: 'Abu Perak' },
    { hex: 0x3d7090, css: '#3d7090', name: 'Biru Es' },
    { hex: 0xe0e8f0, css: '#e0e8f0', name: 'Putih Salju' }
  ],

  /* Ambil semua slot (array of 5) */
  getSlots() {
    let slots = null;
    try {
      const raw = localStorage.getItem(this.SLOTS_KEY);
      if (raw) slots = JSON.parse(raw);
    } catch (e) {}

    if (!Array.isArray(slots) || slots.length !== 5) {
      slots = [null, null, null, null, null];
      // Migrasi profil / save slot 1 lama bila ada
      let oldName = null, oldStyle = 4, oldColor = 0x2c1f14;
      try {
        const rawProf = localStorage.getItem('forecraft_character_model_v1');
        if (rawProf) {
          const p = JSON.parse(rawProf);
          if (p.name) oldName = p.name;
          if (p.hairStyle !== undefined) oldStyle = p.hairStyle;
          if (p.hairColor !== undefined) oldColor = p.hairColor;
        }
      } catch (e) {}
      if (!oldName) {
        try {
          const s1 = JSON.parse(localStorage.getItem('forest_survival_slot_1') || 'null');
          if (s1 && s1.name) {
            oldName = s1.name;
            if (s1.hairStyle !== undefined) oldStyle = s1.hairStyle;
            if (s1.hairColor !== undefined) oldColor = s1.hairColor;
          }
        } catch (e) {}
      }

      if (oldName) {
        slots[0] = {
          name: oldName,
          hairStyle: oldStyle,
          hairColor: oldColor,
          level: 1,
          created: Date.now()
        };
      }
      this.saveSlots(slots);
    }
    return slots;
  },

  saveSlots(slots) {
    try {
      localStorage.setItem(this.SLOTS_KEY, JSON.stringify(slots));
    } catch (e) {}
  },

  isGamepassUnlocked() {
    return localStorage.getItem(this.GAMEPASS_KEY) === '1';
  },

  unlockGamepass() {
    try {
      localStorage.setItem(this.GAMEPASS_KEY, '1');
    } catch (e) {}
  },

  getActiveIndex() {
    try {
      const idx = parseInt(localStorage.getItem(this.ACTIVE_KEY), 10);
      if (!isNaN(idx) && idx >= 0 && idx < 5) return idx;
    } catch (e) {}
    return 0;
  },

  setActiveIndex(idx) {
    try {
      localStorage.setItem(this.ACTIVE_KEY, String(idx));
    } catch (e) {}
    const char = this.getActive();
    if (char) {
      this.applyToPlayer(char);
    }
  },

  getActive() {
    const slots = this.getSlots();
    const idx = this.getActiveIndex();
    if (slots[idx]) return slots[idx];
    // Jika slot aktif kosong, cari slot terisi pertama
    for (let i = 0; i < 5; i++) {
      if (slots[i]) {
        this.setActiveIndex(i);
        return slots[i];
      }
    }
    return null;
  },

  applyToPlayer(char) {
    if (!char) return;
    if (typeof Player !== 'undefined') {
      Player.name = char.name;
      if (char.hairStyle !== undefined) Player.hairStyle = char.hairStyle;
      if (char.hairColor !== undefined) Player.hairColor = char.hairColor;
      if (Player.setHair) Player.setHair(Player.hairStyle, Player.hairColor);
    }
    if (typeof CharacterProfile !== 'undefined' && CharacterProfile.save) {
      CharacterProfile.save({
        name: char.name,
        hairStyle: char.hairStyle,
        hairColor: char.hairColor
      });
    }
    localStorage.setItem('forecraft_mp_name', char.name);
  },

  /* ---------- TAMPILKAN LAYAR PEMILIHAN SLOT (5 SLOT) ---------- */
  showSelect(onDone, opts = {}) {
    const isInitial = !!opts.isInitial;
    const canBack = !!opts.canBack;

    let existingOv = document.getElementById('charslot-screen');
    if (existingOv) existingOv.remove();

    const ov = document.createElement('div');
    ov.id = 'charslot-screen';
    ov.className = 'charslot-ov';

    const render = () => {
      const slots = this.getSlots();
      const activeIdx = this.getActiveIndex();
      const gpUnlocked = this.isGamepassUnlocked();

      let cardsHtml = '';
      for (let i = 0; i < 5; i++) {
        const slotNum = i + 1;
        const isGpSlot = (i >= 3);
        const isLocked = isGpSlot && !gpUnlocked;
        const char = slots[i];
        const isActive = (i === activeIdx && char);

        if (isLocked) {
          cardsHtml += `
            <div class="charslot-card locked" data-slot="${i}">
              <div class="cs-badge-gp">🔒 GAMEPASS</div>
              <div class="cs-card-num">SLOT 0${slotNum}</div>
              <div class="cs-card-name">SLOT TERKUNCI</div>
              <div class="cs-card-desc">Buka slot 4 & 5 dengan Gamepass Eksklusif.</div>
              <button class="cs-btn-unlock" data-slot="${i}" type="button">🔓 Buka Gamepass</button>
            </div>`;
        } else if (!char) {
          cardsHtml += `
            <div class="charslot-card empty" data-slot="${i}">
              <div class="cs-card-num">SLOT 0${slotNum}</div>
              <div class="cs-card-empty-icon">+</div>
              <div class="cs-card-name">SLOT KOSONG</div>
              <button class="cs-btn-create" data-slot="${i}" type="button">⚔️ Buat Karakter</button>
            </div>`;
        } else {
          cardsHtml += `
            <div class="charslot-card filled ${isActive ? 'active' : ''}" data-slot="${i}">
              ${isActive ? '<div class="cs-badge-active">★ AKTIF</div>' : ''}
              <div class="cs-card-num">SLOT 0${slotNum}</div>
              <div class="cs-card-name">${char.name}</div>
              <div class="cs-card-info">
                <span>✂️ ${this.getHairName(char.hairStyle)}</span>
              </div>
              <div class="cs-card-actions">
                <button class="cs-btn-select" data-slot="${i}" type="button">✔ ${isActive ? 'Masuk' : 'Pilih'}</button>
                <button class="cs-btn-del" data-slot="${i}" title="Hapus Karakter" type="button">🗑</button>
              </div>
            </div>`;
        }
      }

      ov.innerHTML = `
        <div class="charslot-box">
          <div class="charslot-header">
            <h1 class="charslot-title">PILIH KARAKTER</h1>
            <div class="charslot-sub">Pilih karakter untuk bertualang atau buat karakter baru di slot tersedia</div>
          </div>
          <div class="charslot-grid">
            ${cardsHtml}
          </div>
          <div class="charslot-footer">
            ${canBack ? '<button class="cs-footer-back" type="button">← Kembali ke Menu</button>' : ''}
          </div>
        </div>`;

      // Event Listeners
      ov.querySelectorAll('.cs-btn-create').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const slotIdx = parseInt(btn.dataset.slot, 10);
          this.openCreator(slotIdx, () => {
            ov.remove();
            if (onDone) onDone();
          });
        });
      });

      ov.querySelectorAll('.cs-btn-select').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const slotIdx = parseInt(btn.dataset.slot, 10);
          this.setActiveIndex(slotIdx);
          ov.remove();
          if (onDone) onDone();
        });
      });

      ov.querySelectorAll('.cs-btn-del').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const slotIdx = parseInt(btn.dataset.slot, 10);
          const c = slots[slotIdx];
          if (!c) return;
          this.confirmDialog(`Hapus karakter <b style="color:#ef4444;">${c.name}</b> dari Slot ${slotIdx + 1}?<br><small style="color:#a0aec0;">Data karakter ini akan dihapus permanen.</small>`, () => {
            slots[slotIdx] = null;
            this.saveSlots(slots);
            render();
          });
        });
      });

      ov.querySelectorAll('.cs-btn-unlock').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          this.showGamepassModal(() => {
            render();
          });
        });
      });

      const backBtn = ov.querySelector('.cs-footer-back');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          ov.remove();
          if (onDone) onDone();
        });
      }
    };

    render();
    document.body.appendChild(ov);
  },

  getHairName(styleId) {
    const s = this.HAIR_STYLES.find(x => x.id === styleId);
    return s ? s.name : 'Rambut';
  },

  /* ---------- DIALOG KONFIRMASI ---------- */
  confirmDialog(htmlMsg, onOk) {
    const dlg = document.createElement('div');
    dlg.className='charslot-confirm-ov';
    dlg.innerHTML=`
      <div class="charslot-confirm-box">
        <div class="charslot-confirm-msg">${htmlMsg}</div>
        <div class="charslot-confirm-btns">
          <button class="cs-cbtn-ok" type="button">✔ Hapus</button>
          <button class="cs-cbtn-cancel" type="button">✖ Batal</button>
        </div>
      </div>`;
    document.body.appendChild(dlg);
    dlg.querySelector('.cs-cbtn-cancel').addEventListener('click',()=>dlg.remove());
    dlg.querySelector('.cs-cbtn-ok').addEventListener('click',()=>{
      dlg.remove();
      if(onOk)onOk();
    });
  },

  /* ---------- MODAL PEMBELIAN GAMEPASS ---------- */
  showGamepassModal(onUnlocked) {
    const modal = document.createElement('div');
    modal.className = 'charslot-confirm-ov';
    modal.innerHTML = `
      <div class="charslot-confirm-box" style="max-width:420px;text-align:center;">
        <h3 style="color:#ffd24d;font-family:'Press Start 2P',monospace;font-size:12px;margin-bottom:10px;">⭐ GAMEPASS EXTRA SLOTS</h3>
        <p style="font-size:12px;color:#e2e8f0;line-height:1.5;margin-bottom:16px;">
          Buka akses permanen ke <b>Slot Karakter 4 & 5</b> untuk menjelajahi Forecraft dengan lebih banyak petualang!
        </p>
        <div style="background:rgba(0,0,0,0.4);border:1px solid #7c2d12;padding:10px;border-radius:4px;margin-bottom:18px;font-size:11px;color:#fed7aa;">
          💎 Fitur Eksklusif:<br>• 2 Slot Karakter Tambahan<br>• Bebas Ganti Karakter Kapan Saja
        </div>
        <div class="charslot-confirm-btns" style="justify-content:center;">
          <button class="cs-cbtn-ok" id="btn-buy-gp" style="background:#ea580c;border-color:#541c08;" type="button">🔓 Buka Sekarang (Aktifkan)</button>
          <button class="cs-cbtn-cancel" type="button">Tutup</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.cs-cbtn-cancel').addEventListener('click', () => modal.remove());
    modal.querySelector('#btn-buy-gp').addEventListener('click', () => {
      this.unlockGamepass();
      modal.remove();
      alert('🎉 Selamat! Gamepass Extra Slots telah aktif. Slot 4 dan 5 kini dapat Anda gunakan.');
      if (onUnlocked) onUnlocked();
    });
  },

  /* ---------- SERVER NAME CHECK & REGISTRATION API ---------- */
  getServerOrigin() {
    if (typeof Network !== 'undefined' && Network.getServerHost) {
      const h = Network.getServerHost();
      if (h.startsWith('http://') || h.startsWith('https://')) return h;
      return 'http://' + h;
    }
    if (window.location && window.location.origin && window.location.origin.startsWith('http')) {
      return window.location.origin;
    }
    return 'http://10.247.243.121:3000';
  },

  async checkServerName(name) {
    const origin = this.getServerOrigin();
    const ctl = new AbortController();
    const tid = setTimeout(() => ctl.abort(), 2500);
    try {
      const res = await fetch(`${origin}/api/check-name?name=${encodeURIComponent(name)}`, {
        signal: ctl.signal
      });
      clearTimeout(tid);
      const data = await res.json();
      return data;
    } catch (e) {
      clearTimeout(tid);
      // Offline fallback: verifikasi nama terhadap slot lokal
      const slots = this.getSlots();
      const takenLocal = slots.some(s => s && s.name.toLowerCase() === name.toLowerCase());
      return { available: !takenLocal, offline: true, error: takenLocal ? 'Nama sudah terdaftar di slot lokal!' : null };
    }
  },

  async registerServerName(name, meta = {}) {
    const origin = this.getServerOrigin();
    const ctl = new AbortController();
    const tid = setTimeout(() => ctl.abort(), 3000);
    try {
      const res = await fetch(`${origin}/api/register-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, hairStyle: meta.hairStyle, hairColor: meta.hairColor }),
        signal: ctl.signal
      });
      clearTimeout(tid);
      return await res.json();
    } catch (e) {
      clearTimeout(tid);
      return { success: true, offline: true };
    }
  },

  /* ---------- CREATOR KARAKTER (KIRI: 3D MODEL, KANAN: KONTROL) ---------- */
  openCreator(slotIndex, onComplete) {
    let curStyleIdx = 0;
    let curColorHex = 0x2c1f14;

    const ov = document.createElement('div');
    ov.id = 'char-creator-overlay';
    ov.className = 'char-creator-ov';
    ov.innerHTML = `
      <div class="char-creator-box">
        <div class="char-creator-header">
          <h2>BUAT KARAKTER BARU — SLOT 0${slotIndex + 1}</h2>
          <div class="char-creator-sub">Tentukan identitas dan gaya tampilan karaktermu</div>
        </div>
        <div class="char-creator-body">
          <!-- KIRI: FULL 3D MODEL VIEW -->
          <div class="char-creator-left">
            <div class="char-3d-stage">
              <canvas id="creator-3d-cv" width="300" height="420"></canvas>
              <div class="char-3d-hint">🖱️ Geser untuk memutar karakter 360°</div>
            </div>
          </div>
          <!-- KANAN: CUSTOM CONTROLS -->
          <div class="char-creator-right">
            <div class="cc-form-group">
              <label class="cc-label">NAMA KARAKTER</label>
              <div class="cc-name-row">
                <input type="text" id="cc-name-input" class="cc-input" maxlength="14" placeholder="Ketik nama..." autocomplete="off">
              </div>
              <div id="cc-name-status" class="cc-name-status">Minimal 3 karakter, huruf & angka.</div>
            </div>

            <div class="cc-form-group">
              <label class="cc-label">GAYA RAMBUT</label>
              <div class="cc-nav-row">
                <button type="button" class="cc-nav-btn" id="cc-hair-prev">&#9664;</button>
                <div class="cc-nav-val" id="cc-hair-name">Undercut (Default)</div>
                <button type="button" class="cc-nav-btn" id="cc-hair-next">&#9654;</button>
              </div>
            </div>

            <div class="cc-form-group">
              <label class="cc-label">WARNA RAMBUT</label>
              <div class="cc-swatches-grid" id="cc-swatches"></div>
            </div>

            <div class="cc-actions">
              <button type="button" id="cc-btn-save" class="cc-btn-primary">✔ SIMPAN & MASUK GAME</button>
              <button type="button" id="cc-btn-cancel" class="cc-btn-secondary">← Kembali</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(ov);

    const nameInput = ov.querySelector('#cc-name-input');
    const nameStatus = ov.querySelector('#cc-name-status');
    nameInput.addEventListener('keydown', e => e.stopPropagation());
    nameInput.addEventListener('keyup', e => e.stopPropagation());

    // 3D Preview
    const canvas = ov.querySelector('#creator-3d-cv');
    let renderer = null, animId = null;
    let charMesh = null, charParts = null;
    let isDragging = false, prevX = 0;
    let charYaw = Math.PI * 0.16;

    if (typeof THREE !== 'undefined') {
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setSize(300, 420);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        const scene = new THREE.Scene();
        const aspect = 300 / 420;
        const hh = 1.15;
        const cy = 0.98;
        const camera = new THREE.OrthographicCamera(-hh * aspect, hh * aspect, hh, -hh, 0.1, 50);
        camera.position.set(0, cy, 8);
        camera.lookAt(0, cy, 0);

        scene.add(new THREE.AmbientLight(0xffffff, 0.9));
        const dirLight = new THREE.DirectionalLight(0xfff5ea, 1.1);
        dirLight.position.set(2.5, 4.5, 3.5);
        scene.add(dirLight);
        const rimLight = new THREE.DirectionalLight(0x82b4ff, 0.45);
        rimLight.position.set(-2.5, 2.0, -2.5);
        scene.add(rimLight);

        // Pedestal
        const ped = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.58, 0.04, 24),
          new THREE.MeshLambertMaterial({ color: 0x2e180d })
        );
        ped.position.y = -0.02;
        scene.add(ped);

        if (typeof PlayerModelBuilder !== 'undefined') {
          charMesh = PlayerModelBuilder.build();
          charParts = PlayerModelBuilder.parts;
          scene.add(charMesh);
        }

        let lastT = performance.now();
        const renderLoop = (time) => {
          animId = requestAnimationFrame(renderLoop);
          const dt = Math.min(0.05, (time - lastT) * 0.001);
          lastT = time;
          if (!isDragging) {
            charYaw += dt * 0.4;
          }
          if (charMesh) charMesh.rotation.y = charYaw;
          renderer.render(scene, camera);
        };
        animId = requestAnimationFrame(renderLoop);
      } catch (e) {
        console.warn('[CharacterCreator] 3D preview init failed:', e);
      }
    }

    // Drag to rotate
    canvas.addEventListener('pointerdown', e => {
      isDragging = true;
      prevX = e.clientX;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    });
    window.addEventListener('pointermove', e => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      prevX = e.clientX;
      charYaw -= dx * 0.02;
    });
    window.addEventListener('pointerup', e => {
      isDragging = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    });
    window.addEventListener('pointercancel', () => { isDragging = false; });

    const updateHair = () => {
      const curStyle = this.HAIR_STYLES[curStyleIdx];
      ov.querySelector('#cc-hair-name').textContent = curStyle.name;
      if (charParts && typeof PlayerModelBuilder !== 'undefined') {
        PlayerModelBuilder.setHair(curStyle.id, curColorHex, charParts);
      }
    };
    updateHair();

    // Swatches
    const swatchesContainer = ov.querySelector('#cc-swatches');
    this.HAIR_COLORS.forEach(col => {
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'cc-swatch' + (col.hex === curColorHex ? ' active' : '');
      sw.style.background = col.css;
      sw.title = col.name;
      sw.addEventListener('click', () => {
        curColorHex = col.hex;
        swatchesContainer.querySelectorAll('.cc-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        updateHair();
      });
      swatchesContainer.appendChild(sw);
    });

    ov.querySelector('#cc-hair-prev').addEventListener('click', () => {
      curStyleIdx = (curStyleIdx - 1 + this.HAIR_STYLES.length) % this.HAIR_STYLES.length;
      updateHair();
    });
    ov.querySelector('#cc-hair-next').addEventListener('click', () => {
      curStyleIdx = (curStyleIdx + 1) % this.HAIR_STYLES.length;
      updateHair();
    });

    const closeCreator = () => {
      if (animId) cancelAnimationFrame(animId);
      if (renderer) renderer.dispose();
      if (charMesh) {
        charMesh.traverse(o => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) o.material.dispose();
        });
      }
      ov.remove();
    };

    ov.querySelector('#cc-btn-cancel').addEventListener('click', () => {
      closeCreator();
      this.showSelect(onComplete);
    });

    // Save and check
    const saveBtn = ov.querySelector('#cc-btn-save');
    saveBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (!name || name.length < 3) {
        nameStatus.className = 'cc-name-status err';
        nameStatus.textContent = '❌ Nama minimal 3 karakter!';
        return;
      }
      if (name.length > 14) {
        nameStatus.className = 'cc-name-status err';
        nameStatus.textContent = '❌ Nama maksimal 14 karakter!';
        return;
      }
      if (!/^[a-zA-Z0-9_ ]+$/.test(name)) {
        nameStatus.className = 'cc-name-status err';
        nameStatus.textContent = '❌ Hanya gunakan huruf, angka, dan spasi!';
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = '⏳ Memeriksa ke server...';
      nameStatus.className = 'cc-name-status wait';
      nameStatus.textContent = '🔍 Memeriksa ketersediaan nama di server...';

      const check = await this.checkServerName(name);
      if (!check.available) {
        saveBtn.disabled = false;
        saveBtn.textContent = '✔ SIMPAN & MASUK GAME';
        nameStatus.className = 'cc-name-status err';
        nameStatus.textContent = `❌ Nama "${name}" sudah dipakai pemain lain!`;
        return;
      }

      nameStatus.textContent = '💾 Mendaftarkan nama ke server...';
      const chosenStyle = this.HAIR_STYLES[curStyleIdx].id;
      const chosenColor = curColorHex;

      await this.registerServerName(name, { hairStyle: chosenStyle, hairColor: chosenColor });

      // Simpan ke slot
      const slots = this.getSlots();
      slots[slotIndex] = {
        name: name,
        hairStyle: chosenStyle,
        hairColor: chosenColor,
        level: 1,
        created: Date.now()
      };
      this.saveSlots(slots);
      this.setActiveIndex(slotIndex);

      closeCreator();
      if (onComplete) onComplete();
    });
  }
};

window.CharacterSlots = CharacterSlots;
