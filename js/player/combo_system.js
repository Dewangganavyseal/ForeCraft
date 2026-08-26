'use strict';
/* =================================================================
FORECRAFT 3D - COMBO SYSTEM (chaining + VFX trigger + hit-stop)
File: js/player/combo_system.js
PENTING: panggil comboSystem.update(dt) di game loop, JANGAN panggil
animator.update(dt) secara terpisah (sudah dipanggil di dalam sini).
================================================================= */
class ComboSystem {
  constructor(opts = {}) {
    this.animator = opts.animator;
    this.vfx = opts.vfx;
    this.sword = opts.sword || null;
    this.chain = ['combo1', 'combo2', 'combo3', 'combo4', 'combo5'];
    this.state = 'idle';
    this.index = -1;
    this.auto = false;          // mode demo: rantai otomatis
    this.freeze = 0;            // hit-stop timer
    this._buffered = null;
    this._pending = null;
    this._pendingDelay = 0;
    this._trailHold = 0;
    this._tip = new THREE.Vector3();
    this.trailColors = {
      combo1: 0x9fd8ff, combo2: 0xa8ffd8, combo3: 0xfff0a8,
      combo4: 0xd9b3ff, combo5: 0xffa064
    };
    // Hook opsional untuk integrasi game:
    this.onSfx = null;          // (type:'swing'|'impact', comboName)
    this.onComboStart = null;   // (comboName, index)
    this.onLunge = null;        // (force) → terapkan dorongan fisika ke depan

    const A = this.animator;
    A.onHitFrame = (name) => this._onHit(name);
    A.onAnimEnd = null;
  }

  /* ---------- input ---------- */
  attack(name = null) {
    if (this.state !== 'attack') {
      this._pending = name || 'combo1';
      this._pendingDelay = 0;
      return;
    }
    // Buffer input: serangan berikutnya disimpan, dieksekusi saat animasi selesai.
    this._buffered = name || this.chain[(this.index + 1) % this.chain.length];
  }
  /* ---------- integrasi game (serangan digerakkan logika game) ----------
     Game Forecraft punya driver serangannya sendiri (COMBOS timing + damage).
     Method ini HANYA menyalakan efek visual/suara untuk animasi combo yang
     sedang dimainkan oleh driver tersebut — tanpa menyentuh chaining. */
  externalStart(name) {
    if (!/^combo[1-5]$/.test(name)) return;
    this.state = 'attack';
    this.index = this.chain.indexOf(name);
    if (this.index < 0) this.index = 0;
    this.vfx.beginTrail(this.trailColors[name] || 0xffffff);
    this._trailHold = 0;
    this._sfx('swing', name);
    if (this.onComboStart) this.onComboStart(name, this.index);
    if (name === 'combo5') {
      this._getSwordTip(this._tip);
      this.vfx.sparks({
        pos: [this._tip.x, this._tip.y, this._tip.z],
        count: 10, color: 0xffc27a, speed: 0.7, spread: 0.6,
        gravity: -1.5, size: 0.05, dur: 0.5
      });
      this.vfx.shake(0.03, 0.3);
    }
  }
  stop() {
    this.state = 'idle';
    this._buffered = null;
    this._pending = null;
    this.animator.setAnimation('idle');
    this.vfx.endTrail();
  }

  /* ---------- update (panggil ini saja, bukan animator.update) ---------- */
  update(dt) {
    /* Penutup otomatis untuk mode externalStart(): bila sebelumnya 'attack'
       tapi animator sudah tidak memainkan combo (diganti game ke idle/walk),
       matikan trail & kembalikan state. */
    if (this.state === 'attack' && !/^combo[1-5]$/.test(this.animator.currentAnim)) {
      this.state = 'idle';
      this._buffered = null;
      this.vfx.endTrail();
    }
    if (this._pending) {
      this._pendingDelay -= dt;
      if (this._pendingDelay <= 0) {
        const n = this._pending;
        this._pending = null;
        this._start(n);
      }
    }
    let adt = dt;
    if (this.freeze > 0) { this.freeze -= dt; adt = 0; } // hit-stop
    this.animator.update(adt);

    // Sampel ujung pedang untuk weapon trail
    if (this.state === 'attack' && this.vfx.trailActive) {
      this._getSwordTip(this._tip);
      this.vfx.sampleTrail(this._tip);
      if (this._trailHold > 0) {
        this._trailHold -= dt;
        if (this._trailHold <= 0) this.vfx.endTrail();
      }
    }
    this.vfx.update(dt);
  }

  /* ---------- internal ---------- */
  _start(name) {
    this.state = 'attack';
    this.index = this.chain.indexOf(name);
    if (this.index < 0) this.index = 0;
    this.animator.playOnce(name, 1.0, (n) => this._onEnd(n));
    this.vfx.beginTrail(this.trailColors[name] || 0xffffff);
    this._trailHold = 0;
    this._sfx('swing', name);
    if (this.onComboStart) this.onComboStart(name, this.index);
    if (name === 'combo5') { // bara api naik saat windup serangan berat
      this._getSwordTip(this._tip);
      this.vfx.sparks({
        pos: [this._tip.x, this._tip.y, this._tip.z],
        count: 10, color: 0xffc27a, speed: 0.7, spread: 0.6,
        gravity: -1.5, size: 0.05, dur: 0.5
      });
      this.vfx.shake(0.03, 0.3);
    }
  }
  _onEnd(name) {
    let next = null;
    if (this._buffered) { next = this._buffered; this._buffered = null; }
    else if (this.auto) { next = this.chain[(this.index + 1) % this.chain.length]; }
    if (next) {
      this._pending = next;
      this._pendingDelay = this.auto ? 0.15 : 0.02;
    } else {
      this.state = 'idle';
      this.vfx.endTrail();
    }
  }
  _getSwordTip(out) {
    const s = this.sword;
    if (!s) return out.set(0, 1.2, 0);
    s.updateWorldMatrix(true, false);
    if (s.userData.tip) return s.userData.tip.getWorldPosition(out);
    const off = s.userData.tipOffset || new THREE.Vector3(0, 1, 0);
    return s.localToWorld(out.copy(off));
  }
  _sfx(type, name) { if (this.onSfx) this.onSfx(type, name); }

  /* ---------- IMPACT: semua efek dinamis dipicu di sini ---------- */
  _onHit(name) {
    const v = this.vfx;
    this._getSwordTip(this._tip);
    const tip = [this._tip.x, this._tip.y, this._tip.z];

    switch (name) {
      case 'combo1': // tebasan horizontal
        v.slashArc({ pos: [0, 1.24, 0.32], rot: [-Math.PI / 2, 0, 1.1], spin: -7, arc: 2.5, inner: 0.5, outer: 1.12, color: 0x9fd8ff, dur: 0.26 });
        v.sparks({ pos: tip, count: 16, color: 0xcfe9ff, speed: 3.4, dir: [-1, 0.15, 0.35], spread: 1.4, size: 0.05, dur: 0.5 });
        v.flash(tip, 0xffe9b8, 1.6, 0.18);
        this.freeze = 0.045; v.shake(0.07, 0.20);
        break;
      case 'combo2': // uppercut
        v.slashArc({ pos: [0.12, 1.15, 0.42], rot: [-0.3, 0, 0.55], spin: 6.5, arc: 2.3, inner: 0.45, outer: 1.05, color: 0xa8ffd8, dur: 0.28 });
        v.sparks({ pos: tip, count: 18, color: 0xd2ffe9, speed: 3.8, dir: [0.15, 1, 0.3], spread: 1.2, size: 0.05, dur: 0.55, gravity: 8 });
        v.flash(tip, 0xd9ffe9, 1.8, 0.2);
        this.freeze = 0.05; v.shake(0.09, 0.22);
        break;
      case 'combo3': // tusukan
        v.streak({ pos: [0, 1.26, 1.0], len: 1.8, width: 0.3, color: 0xfff3b0, dur: 0.22 });
        v.sparks({ pos: [0, 1.28, 1.5], count: 14, color: 0xfff0b8, speed: 5.5, dir: [0, 0, 1], spread: 0.5, size: 0.045, dur: 0.4, gravity: 2 });
        v.flash([0, 1.28, 1.2], 0xfff0c0, 2.2, 0.16);
        this.freeze = 0.04; v.shake(0.06, 0.16);
        if (this.onLunge) this.onLunge(4.5); // hook: dorong player ke depan
        break;
      case 'combo4': // spin 360°
        v.slashArc({ pos: [0, 1.12, 0], rot: [-Math.PI / 2, 0, 0], spin: 11, arc: 5.4, inner: 0.62, outer: 1.5, color: 0xd9b3ff, dur: 0.42 });
        v.sparks({ pos: [0.9, 1.1, 0], count: 12, color: 0xe6d2ff, speed: 3, spread: 2, size: 0.05, dur: 0.5 });
        v.sparks({ pos: [-0.9, 1.1, 0], count: 12, color: 0xe6d2ff, speed: 3, spread: 2, size: 0.05, dur: 0.5 });
        v.flash([0, 1.2, 0], 0xe8dcff, 2.6, 0.25);
        this.freeze = 0.055; v.shake(0.12, 0.30);
        break;
      case 'combo5': // hantaman berat + shockwave tanah
        v.slashArc({ pos: [0, 1.25, 0.55], rot: [0.12, 0, -0.5], spin: -4, arc: 2.2, inner: 0.55, outer: 1.35, color: 0xffb066, dur: 0.3 });
        v.shockwave({ pos: [0, 0.04, 0.95], radius: 2.6, color: 0xff9a4d, dur: 0.5 });
        v.sparks({ pos: [0, 0.15, 0.95], count: 30, color: 0xe8d3a8, speed: 4.2, dir: [0, 1, 0], spread: 1.8, size: 0.06, dur: 0.7, gravity: 9 });
        v.sparks({ pos: tip, count: 14, color: 0xffcf9a, speed: 3, spread: 1.5, size: 0.05, dur: 0.45 });
        v.flash([0, 0.9, 0.95], 0xffd9a0, 4.5, 0.3, 9);
        this.freeze = 0.085; v.shake(0.26, 0.42);
        break;
    }
    v.swordGlow(this.sword, this.trailColors[name] || 0xffffff, 0.28);
    this._trailHold = 0.10; // trail bertahan sebentar setelah impact
    this._sfx('impact', name);
  }
}
window.ComboSystem = ComboSystem;
if (typeof module !== 'undefined') module.exports = ComboSystem;