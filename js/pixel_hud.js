'use strict';
/* =============================================================================
   PIXEL HUD — Port 1:1 Konsep 2 (Pixel Quest) dari NEW MODEL/Hud HP bar.html
   ============================================================================= */
const PixelHUD = {
  ready: false,
  hearts: [],
  prevHeart: [],
  stBlocks: [],
  hgBlocks: [],
  prevHp: null,
  prevSt: null,
  prevHg: null,
  prevLvl: null,
  _accDmg: 0,
  _accHeal: 0,
  _lastDmgT: 0,
  _lastHealT: 0,
  HEART_PATH: 'M2 0h4v2h2V0h4v2h2v4h-2v2h-2v2h-2v2H6v-2H4V8H2V6H0V2h2z',

  init() {
    const heartsRow = document.getElementById('hearts');
    const stBar = document.getElementById('pxSt');
    const hgBar = document.getElementById('pxHg');
    if (!heartsRow || !stBar || !hgBar) return false;

    // Bersihkan bila sudah ada isinya
    heartsRow.innerHTML = '';
    this.hearts = [];
    this.prevHeart = [];

    // Buat 10 Hati Pixel (1:1 SVG dengan NEW MODEL/Hud HP bar.html)
    for (let i = 0; i < 10; i++) {
      const h = document.createElement('span');
      h.className = 'heart empty';
      h.innerHTML = `<svg class="hb base" viewBox="0 0 14 12"><path d="${this.HEART_PATH}"/></svg>` +
        `<span class="fillpart"><svg class="hb top" viewBox="0 0 14 12"><path d="${this.HEART_PATH}"/></svg></span>`;
      heartsRow.appendChild(h);
      this.hearts.push(h);
      this.prevHeart.push('empty');
    }

    // Buat 20 Blok Stamina
    stBar.innerHTML = '';
    this.stBlocks = [];
    for (let i = 0; i < 20; i++) {
      const b = document.createElement('i');
      stBar.appendChild(b);
      this.stBlocks.push(b);
    }
    stBar.dataset.on = '0';

    // Buat 20 Blok Hunger
    hgBar.innerHTML = '';
    this.hgBlocks = [];
    for (let i = 0; i < 20; i++) {
      const b = document.createElement('i');
      hgBar.appendChild(b);
      this.hgBlocks.push(b);
    }
    hgBar.dataset.on = '0';

    this.prevHp = null;
    this.prevSt = null;
    this.prevHg = null;
    this._accDmg = 0;
    this._accHeal = 0;
    this.ready = true;
    return true;
  },

  rePunch(el, cls = 'punch') {
    if (!el) return;
    const list = cls.split(' ');
    el.classList.remove(...list);
    void el.offsetWidth;
    el.classList.add(...list);
  },

  floater(anchor, text, type) {
    if (!anchor) return;
    const s = document.createElement('span');
    s.className = 'fl ' + type;
    s.textContent = text;
    s.style.left = (30 + Math.random() * 40) + '%';
    anchor.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
  },

  sparkle(anchor, n = 6, color = '#aef7c8') {
    if (!anchor) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'sp';
      s.style.setProperty('--spc', color);
      s.style.left = (25 + Math.random() * 50) + '%';
      s.style.top = (20 + Math.random() * 40) + '%';
      s.style.setProperty('--dx', (-30 + Math.random() * 60) + 'px');
      s.style.setProperty('--dy', (-35 + Math.random() * 45) + 'px');
      anchor.appendChild(s);
      s.addEventListener('animationend', () => s.remove());
    }
  },

  update(hp, maxHp, stamina, maxStamina, hunger, isDead, playerName, level) {
    if (!this.ready && !this.init()) return;

    maxHp = Math.max(1, maxHp || 100);
    maxStamina = Math.max(1, maxStamina || 100);
    hp = Math.max(0, Math.min(maxHp, hp !== undefined ? hp : maxHp));
    stamina = Math.max(0, Math.min(maxStamina, stamina !== undefined ? stamina : maxStamina));
    hunger = Math.max(0, Math.min(100, hunger !== undefined ? hunger : 100));

    const hudEl = document.getElementById('hudPixel');
    const pxFrame = document.getElementById('pxFrame');
    const pxPortrait = document.getElementById('portrait');
    const pxPflash = document.getElementById('pxPflash');
    const heartsRow = document.getElementById('hearts');
    const stBar = document.getElementById('pxSt');
    const hgBar = document.getElementById('pxHg');
    const nameEl = document.getElementById('player-hud-name');
    const lvlEl = document.getElementById('portrait-lv');

    // Update Nama Pemain di Header Bar
    if (nameEl && playerName) {
      const dispName = (playerName.length > 12 ? playerName.slice(0, 11) + '…' : playerName).toUpperCase();
      if (nameEl.textContent !== dispName) nameEl.textContent = dispName;
    }

    // Update Level
    if (lvlEl && level !== undefined && this.prevLvl !== level) {
      lvlEl.textContent = level;
      this.prevLvl = level;
    }

    const now = performance.now();

    // Deteksi Perubahan HP & Efek Juicy Hit/Heal
    if (this.prevHp !== null) {
      const dHp = hp - this.prevHp;
      if (dHp < -0.2) {
        this._accDmg += (-dHp);
        if (this._accDmg >= 1 && (now - this._lastDmgT > 80)) {
          this.floater(heartsRow, '-' + Math.round(this._accDmg), 'bad');
          this._accDmg = 0;
          this._lastDmgT = now;
        }
        if (pxFrame) this.rePunch(pxFrame, 'hitflash');
        if (pxPortrait) this.rePunch(pxPortrait, 'hurt');
        if (pxPflash) {
          pxPflash.className = 'px-pflash dmg';
          void pxPflash.offsetWidth;
          pxPflash.classList.add('go');
        }
      } else if (dHp > 0.2) {
        this._accHeal += dHp;
        if (this._accHeal >= 1 && (now - this._lastHealT > 120)) {
          this.floater(heartsRow, '+' + Math.round(this._accHeal), 'good');
          this._accHeal = 0;
          this._lastHealT = now;
          if (pxPortrait) this.sparkle(pxPortrait, 6, '#ffe9a8');
          this.sparkle(heartsRow, 5, '#ff9db0');
        }
      }
    }
    this.prevHp = hp;

    // Render 10 Hati Pixel (HP)
    const hpRatio = hp / maxHp;
    const hpScaled = hpRatio * 100;
    this.hearts.forEach((h, i) => {
      const v = hpScaled - i * 10;
      let st = 'empty';
      if (v >= 7.5) st = 'full';
      else if (v >= 2.5) st = 'half';
      else if (hp > 0 && i === 0) st = 'half'; // Minimal terlihat 1/2 hati bila masih bertahan hidup

      if (this.prevHeart[i] !== st) {
        h.className = 'heart ' + st;
        this.rePunch(h, 'pop');
        this.prevHeart[i] = st;
      }
    });

    if (heartsRow) {
      heartsRow.title = `HP: ${Math.ceil(hp)} / ${Math.ceil(maxHp)}`;
    }

    // Deteksi Peningkatan Stamina untuk Sparkle
    if (this.prevSt !== null) {
      const dSt = stamina - this.prevSt;
      if (dSt > 15 && stBar) {
        this.sparkle(stBar, 4, '#aef7ff');
      }
    }
    this.prevSt = stamina;

    // Render 20 Blok Stamina
    const stRatio = stamina / maxStamina;
    const stOn = Math.round(stRatio * 20);
    this.renderBlocks(stBar, this.stBlocks, stOn, 20);
    if (stBar) {
      stBar.title = `Stamina: ${Math.ceil(stamina)} / ${Math.ceil(maxStamina)}`;
    }

    // Render 20 Blok Hunger
    this.prevHg = hunger;
    const hgRatio = hunger / 100;
    const hgOn = Math.round(hgRatio * 20);
    this.renderBlocks(hgBar, this.hgBlocks, hgOn, 20);
    if (hgBar) {
      hgBar.title = `Lapar: ${Math.ceil(hunger)} / 100`;
    }

    // State Kritis, Hunger Rendah, dan K.O.
    if (hudEl) {
      // HP Kritis (<= 25%) -> Hati berdenyut/berkedip
      const isCrit = hpRatio <= 0.25 && hp > 0 && !isDead;
      hudEl.classList.toggle('crit', isCrit);

      // Hunger Rendah (<= 30%) -> Ikon daging bergetar
      const isLowHg = hunger <= 30;
      hudEl.classList.toggle('lowhg', isLowHg);

      // K.O. / Mati -> Potret wajah karakter menjadi grayscale
      const isKo = isDead || hp <= 0;
      hudEl.classList.toggle('ko', isKo);
    }
  },

  renderBlocks(bar, blocks, on, total) {
    if (!bar || !blocks || !blocks.length) return;
    blocks.forEach((b, i) => {
      const isOn = i < on;
      if (b.classList.contains('on') !== isOn) {
        b.classList.toggle('on', isOn);
        b.style.animation = 'none';
        void b.offsetWidth;
        b.style.animation = `blockPop .26s ${Math.abs(i - on) * 14}ms backwards`;
      }
    });
    bar.dataset.on = on;
    bar.classList.toggle('low', on <= total * 0.35);
    bar.classList.toggle('crit', on <= total * 0.20);
  }
};

window.PixelHUD = PixelHUD;
