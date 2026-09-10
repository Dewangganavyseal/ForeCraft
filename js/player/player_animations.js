'use strict';
/* =================================================================
FORECRAFT 3D - PLAYER ANIMATIONS CONTROLLER (ENHANCED COMBO EDITION)
File: js/player/player_animations.js
Port dari "NEW MODEL/New Animation/player_animations.js" dengan
penyesuaian in-game:
  - 'jump' SENGAJA tanpa durasi → pose statis ditahan di udara/renang.
  - Animasi menunggangi (ride_mount/ride_idle/ride_move/ride_dismount)
    dipertahankan dari versi in-game sebelumnya.
================================================================= */
class PlayerAnimator {
  constructor(parts, swordMesh = null) {
    this.parts = parts || {};
    this.sword = swordMesh || (parts ? parts.sword : null);
    this.currentAnim = 'idle';
    this.time = 0;
    this.speed = 1.0;
    this.comboIndex = 0;
    this.sequenceTimer = 0;
    this.finished = false;
    this.onAnimEnd = null;
    this.onHitFrame = null;      // callback(animName) saat frame impact
    this._hitFired = false;
    this._trackCache = null;

    this.durations = {
      combo1: 0.45, combo2: 0.50, combo3: 0.42, combo4: 0.75, combo5: 1.05,
      dash: 0.35, death: 2.2,
      skill_fireball: 1.30, skill_dash: 0.45, skill_heal: 1.60,
      skill_shield_bash: 0.65, skill_whirlwind: 1.10, skill_thunder: 1.50,
      // Hantam Bumi cepat: fase jongkok & fase hantam-mendarat
      slam_windup: 0.16, slam_land: 0.50,
      // Teriakan Perang (animasi berdiri sendiri, bukan lompatan)
      roar: 0.90,
      // Menunggangi (one-shot naik & turun)
      ride_mount: 0.55, ride_dismount: 0.45
    };

    // Titik impact (progress 0-1) → dipakai ComboSystem untuk memicu VFX/hitstop
    this.hitPoints = {
      combo1: 0.40, combo2: 0.44, combo3: 0.38, combo4: 0.48, combo5: 0.58
    };
  }

  /* ================= UTILITIES ================= */
  lerp(a, b, t) { return a + (b - a) * t; }
  clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
  easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  easeIn(t) { return t * t * t; }
  easeOutBack(t) {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  }
  _ease(t, name) {
    switch (name) {
      case 'in': return this.easeIn(t);
      case 'out': return this.easeOut(t);
      case 'inOut': return this.easeInOut(t);
      case 'outBack': return this.easeOutBack(t);
      default: return t;
    }
  }

  /* ================= RESET ================= */
  resetLimbs() {
    const P = this.parts;
    if (!P) return;
    const resetGroup = (g) => {
      if (!g) return;
      g.rotation.set(0, 0, 0);
      if (g.userData.shin) g.userData.shin.rotation.set(0, 0, 0);
      if (g.userData.fore) g.userData.fore.rotation.set(0, 0, 0);
    };
    resetGroup(P.legL); resetGroup(P.legR);
    resetGroup(P.armL); resetGroup(P.armR);
    if (P.head) P.head.rotation.set(0, 0, 0);
    if (P.torso) P.torso.rotation.set(0, 0, 0);
    if (P.body) { P.body.position.set(0, 0, 0); P.body.rotation.set(0, 0, 0); }
    /* mulut selalu kembali tertutup saat animasi berganti (dibuka animRoar) */
    if (P.mouth) this._setMouthOpen(P, 0);
  }

  /* ================= API ================= */
  setAnimation(animName, speed = 1.0) {
    this.currentAnim = animName;
    this.speed = speed;
    this.time = 0;
    this.finished = false;
    this._hitFired = false;
    this.resetLimbs();
  }
  playOnce(animName, speed = 1.0, onEnd = null) {
    this.setAnimation(animName, speed);
    this.onAnimEnd = onEnd;
  }
  getProgress() {
    const d = this.durations[this.currentAnim];
    return d ? this.clamp(this.time / d, 0, 1) : 0;
  }

  update(dt) {
    this.time += dt * this.speed;
    const t = this.time;
    const P = this.parts;
    if (!P || !P.armR) return;
    const dur = this.durations[this.currentAnim] || 0;

    // Selesai untuk animasi one-shot (idle dulu, baru callback → aman untuk chain)
    if (dur > 0 && t >= dur && !this.finished) {
      this.finished = true;
      const doneName = this.currentAnim;
      const autoIdle = doneName.startsWith('combo') || doneName.startsWith('skill') || doneName === 'roll' || doneName === 'dash';
      if (autoIdle) this.setAnimation('idle');
      if (this.onAnimEnd) {
        const cb = this.onAnimEnd;
        this.onAnimEnd = null;
        cb(doneName);
      }
      if (autoIdle) return;
    }

    const p = dur > 0 ? this.clamp(t / dur, 0, 1) : 0;

    // Event frame impact (untuk VFX / hitstop / audio)
    const hp = this.hitPoints[this.currentAnim];
    if (dur > 0 && hp !== undefined && !this._hitFired && p >= hp) {
      this._hitFired = true;
      if (this.onHitFrame) this.onHitFrame(this.currentAnim);
    }

    switch (this.currentAnim) {
      case 'idle': this.animIdle(t, P); break;
      case 'walk': this.animWalk(t, P); break;
      case 'sprint': this.animSprint(t, P); break;
      case 'jump': this.animJump(p, P); break;
      case 'dash': this.animDodge(p, P); break;
      case 'block': this.animBlock(t, P); break;
      case 'death': this.animDeath(p, P); break;
      case 'combo1': this.animSlashHorizontal(p, P); break;
      case 'combo2': this.animUppercutSlash(p, P); break;
      case 'combo3': this.animThrust(p, P); break;
      case 'combo4': this.animSpinAttack(p, P); break;
      case 'combo5': this.animHeavyCleave(p, P); break;
      case 'skill_fireball': this.animFireball(p, P); break;
      case 'skill_dash': this.animDash(p, P); break;
      case 'skill_heal': this.animHeal(p, P); break;
      case 'skill_shield_bash': this.animShieldBash(p, P); break;
      case 'skill_whirlwind': this.animWhirlwind(p, P); break;
      case 'skill_thunder': this.animThunder(p, P); break;
      // Menunggangi
      case 'ride_mount':    this.animRideMount(p, P); break;
      case 'ride_idle':     this.animRideIdle(t, P); break;
      case 'ride_move':     this.animRideMove(t, P); break;
      case 'ride_dismount': this.animRideDismount(p, P); break;
      // Hantam Bumi cepat (fase mengikuti fisika lompatan nyata)
      case 'slam_windup': this.animSlamWindup(p, P); break;
      case 'slam_land':   this.animSlamLand(p, P); break;
      // Teriakan Perang
      case 'roar': this.animRoar(t, P); break;
      case 'sequence': this.animSequence(dt, P); break;
      default: this.animIdle(t, P);
    }
  }

  /* ============ KEYFRAME ENGINE (dipakai 5 combo) ============ */
  _buildTracks(kfs) {
    const tracks = {};
    for (const kf of kfs) {
      for (const ch in kf.v) {
        if (!tracks[ch]) tracks[ch] = [];
        tracks[ch].push({ p: kf.p, v: kf.v[ch], e: kf.e || 'linear' });
      }
    }
    return tracks;
  }
  _evalTrack(track, p) {
    if (p <= track[0].p) return track[0].v;
    const last = track[track.length - 1];
    if (p >= last.p) return last.v;
    for (let i = 1; i < track.length; i++) {
      if (p <= track[i].p) {
        const a = track[i - 1], b = track[i];
        let t = (p - a.p) / (b.p - a.p);
        t = this._ease(t, b.e);
        return a.v + (b.v - a.v) * t;
      }
    }
    return last.v;
  }
  _tracks(name) {
    if (!this._trackCache) this._trackCache = {};
    if (!this._trackCache[name]) {
      this._trackCache[name] = this._buildTracks(this._comboKeys()[name]);
    }
    return this._trackCache[name];
  }
  _playCombo(name, p, P) {
    const tr = this._tracks(name);
    for (const ch in tr) this._set(P, ch, this._evalTrack(tr[ch], p));
  }
  _set(P, ch, v) {
    switch (ch) {
      case 'armR.x': if (P.armR) P.armR.rotation.x = v; break;
      case 'armR.y': if (P.armR) P.armR.rotation.y = v; break;
      case 'armR.z': if (P.armR) P.armR.rotation.z = v; break;
      case 'armL.x': if (P.armL) P.armL.rotation.x = v; break;
      case 'armL.y': if (P.armL) P.armL.rotation.y = v; break;
      case 'armL.z': if (P.armL) P.armL.rotation.z = v; break;
      case 'foreR': if (P.armR && P.armR.userData.fore) P.armR.userData.fore.rotation.x = v; break;
      case 'foreL': if (P.armL && P.armL.userData.fore) P.armL.userData.fore.rotation.x = v; break;
      case 'torso.x': if (P.torso) P.torso.rotation.x = v; break;
      case 'torso.y': if (P.torso) P.torso.rotation.y = v; break;
      case 'torso.z': if (P.torso) P.torso.rotation.z = v; break;
      case 'head.x': if (P.head) P.head.rotation.x = v; break;
      case 'head.y': if (P.head) P.head.rotation.y = v; break;
      case 'head.z': if (P.head) P.head.rotation.z = v; break;
      case 'legL.x': if (P.legL) P.legL.rotation.x = v; break;
      case 'legL.z': if (P.legL) P.legL.rotation.z = v; break;
      case 'legR.x': if (P.legR) P.legR.rotation.x = v; break;
      case 'legR.z': if (P.legR) P.legR.rotation.z = v; break;
      case 'shinL': if (P.legL && P.legL.userData.shin) P.legL.userData.shin.rotation.x = v; break;
      case 'shinR': if (P.legR && P.legR.userData.shin) P.legR.userData.shin.rotation.x = v; break;
      case 'body.x': if (P.body) P.body.position.x = v; break;
      case 'body.y': if (P.body) P.body.position.y = v; break;
      case 'body.z': if (P.body) P.body.position.z = v; break;
      case 'body.rx': if (P.body) P.body.rotation.x = v; break;
      case 'body.ry': if (P.body) P.body.rotation.y = v; break;
      case 'body.rz': if (P.body) P.body.rotation.z = v; break;
    }
  }

  /* ---- Data keyframe 5 combo. e = easing masuk ke keyframe tersebut.
     Fase: windup (outBack = ada antisipasi) → strike (in = akselerasi tajam)
     → overshoot (out) → recover (inOut). Ini yang bikin gerak terasa
     smooth sekaligus presisi di frame impact. ---- */
  _comboKeys() {
    const Z = { // pose netral penuh untuk keyframe penutup
      'armR.x': 0, 'armR.y': 0, 'armR.z': 0,
      'armL.x': 0, 'armL.y': 0, 'armL.z': 0,
      'foreR': 0, 'foreL': 0,
      'torso.x': 0, 'torso.y': 0, 'torso.z': 0,
      'head.x': 0, 'head.y': 0, 'head.z': 0,
      'legL.x': 0, 'legL.z': 0, 'legR.x': 0, 'legR.z': 0,
      'shinL': 0, 'shinR': 0,
      'body.x': 0, 'body.y': 0, 'body.z': 0,
      'body.rx': 0, 'body.ry': 0, 'body.rz': 0
    };
    return {
      /* COMBO 1 — Tebasan horizontal kanan→kiri */
      combo1: [
        { p: 0.00, v: { 'armR.x': -0.30, 'foreR': -0.35, 'armL.z': 0.10 } },
        { p: 0.16, e: 'outBack', v: { 'armR.x': -0.52, 'armR.y': 1.05, 'armR.z': 0.42, 'foreR': -0.75, 'torso.y': 0.55, 'torso.x': 0.06, 'head.y': 0.30, 'armL.x': -0.20, 'armL.z': 0.38, 'foreL': -0.45, 'legL.x': 0.20, 'legR.x': -0.14, 'body.y': 0.01 } },
        { p: 0.34, e: 'in', v: { 'armR.x': -0.72, 'armR.y': -0.80, 'armR.z': 0.08, 'foreR': -0.35, 'torso.y': -0.30, 'head.y': -0.08, 'armL.x': 0.12, 'armL.z': 0.18, 'foreL': -0.28, 'body.y': 0.03 } },
        { p: 0.46, e: 'out', v: { 'armR.x': -0.80, 'armR.y': -1.80, 'armR.z': -0.30, 'foreR': -0.15, 'torso.y': -0.78, 'torso.x': 0.09, 'head.y': -0.36, 'armL.x': 0.34, 'armL.z': -0.18, 'foreL': -0.22, 'legL.x': 0.30, 'legR.x': -0.24, 'body.y': 0.035 } },
        { p: 0.58, e: 'out', v: { 'armR.x': -0.74, 'armR.y': -2.02, 'armR.z': -0.36, 'torso.y': -0.88, 'head.y': -0.40 } },
        { p: 1.00, e: 'inOut', v: Object.assign({}, Z) }
      ],
      /* COMBO 2 — Uppercut slash (bawah→atas) */
      combo2: [
        { p: 0.00, v: { 'armR.x': -0.30, 'foreR': -0.35 } },
        { p: 0.20, e: 'outBack', v: { 'armR.x': 0.95, 'armR.y': 0.18, 'armR.z': -0.55, 'foreR': -1.15, 'torso.x': 0.30, 'torso.y': 0.22, 'head.x': 0.14, 'body.y': -0.07, 'legL.x': 0.52, 'legR.x': -0.42, 'shinL': 0.55, 'shinR': 0.45, 'armL.x': -0.30, 'armL.z': 0.32, 'foreL': -0.50 } },
        { p: 0.42, e: 'in', v: { 'armR.x': -2.05, 'armR.y': 0.28, 'armR.z': 0.22, 'foreR': -0.25, 'torso.x': -0.18, 'torso.y': -0.22, 'head.x': -0.08, 'body.y': 0.06, 'legL.x': -0.10, 'legR.x': 0.16, 'shinL': 0.10, 'shinR': 0.12, 'armL.x': 0.24, 'armL.z': -0.14, 'foreL': -0.30 } },
        { p: 0.55, e: 'out', v: { 'armR.x': -2.62, 'armR.y': 0.42, 'armR.z': 0.36, 'foreR': -0.10, 'torso.x': -0.32, 'torso.y': -0.28, 'head.x': -0.16, 'body.y': 0.09, 'legL.x': -0.18, 'legR.x': 0.22, 'shinL': 0.05, 'shinR': 0.08, 'armL.x': 0.40, 'armL.z': -0.24 } },
        { p: 0.70, v: { 'armR.x': -2.48, 'armR.y': 0.36, 'body.y': 0.07 } },
        { p: 1.00, e: 'inOut', v: Object.assign({}, Z) }
      ],
      /* COMBO 3 — Tusukan kilat + lunge */
      combo3: [
        { p: 0.00, v: { 'armR.x': -0.30, 'foreR': -0.35 } },
        { p: 0.18, e: 'outBack', v: { 'armR.x': -1.05, 'armR.y': 0.55, 'armR.z': 0.30, 'foreR': -1.75, 'torso.y': 0.58, 'torso.x': -0.06, 'head.y': 0.30, 'body.z': -0.08, 'body.y': -0.01, 'legL.x': 0.26, 'legR.x': -0.30, 'shinR': 0.26, 'armL.x': -0.34, 'armL.z': 0.30, 'foreL': -0.45 } },
        { p: 0.36, e: 'in', v: { 'armR.x': -1.55, 'armR.y': 0.02, 'armR.z': 0, 'foreR': -0.06, 'torso.y': -0.28, 'torso.x': 0.16, 'head.y': -0.04, 'head.x': 0.05, 'body.z': 0.34, 'body.y': -0.03, 'legL.x': 0.60, 'legR.x': -0.52, 'shinL': 0.30, 'shinR': 0.42, 'armL.x': 0.52, 'armL.z': -0.16, 'foreL': -0.35 } },
        { p: 0.50, e: 'out', v: { 'armR.x': -1.63, 'body.z': 0.42, 'torso.x': 0.20 } },
        { p: 1.00, e: 'inOut', v: Object.assign({}, Z) }
      ],
      /* COMBO 4 — Spin attack 360° */
      combo4: [
        { p: 0.00, v: { 'armR.x': -0.30, 'foreR': -0.35, 'body.ry': 0 } },
        { p: 0.16, e: 'outBack', v: { 'body.ry': -0.55, 'torso.y': 0.55, 'torso.x': 0.10, 'armR.x': -0.85, 'armR.y': 0.95, 'armR.z': 0.22, 'foreR': -0.55, 'armL.x': -0.40, 'armL.z': 0.42, 'foreL': -0.45, 'head.y': 0.30, 'legL.x': 0.30, 'legR.x': -0.30, 'shinL': 0.30, 'shinR': 0.26, 'body.y': -0.04 } },
        { p: 0.30, e: 'in', v: { 'body.ry': 1.35, 'torso.y': 0.10, 'armR.x': -1.25, 'armR.y': 0.30, 'armR.z': 0.85, 'foreR': -0.25, 'armL.x': -1.05, 'armL.z': -0.80, 'foreL': -0.25, 'head.y': 0, 'body.y': 0.02 } },
        { p: 0.58, e: 'inOut', v: { 'body.ry': 6.98, 'torso.y': 0, 'torso.x': 0.14, 'armR.x': -1.40, 'armR.z': 1.00, 'armL.x': -1.22, 'armL.z': -0.95, 'head.y': 0, 'legL.x': 0.16, 'legR.x': -0.16, 'body.y': 0.06 } },
        { p: 0.75, e: 'out', v: { 'body.ry': 6.283, 'torso.x': 0.06, 'armR.x': -0.95, 'armR.z': 0.55, 'armL.x': -0.75, 'armL.z': -0.48, 'body.y': 0.02 } },
        { p: 1.00, e: 'inOut', v: Object.assign({}, Z, { 'body.ry': 6.283 }) }
      ],
      /* COMBO 5 — Heavy cleave (Jongkok ancang-ancang -> Lompat tinggi -> Slam hantam tanah -> Mendarat jongkok -> Bangkit) */
      combo5: [
        { p: 0.00, v: { 'armR.x': -0.30, 'foreR': -0.35 } },
        // 1. Jongkok ancang-ancang melompat (Crouch windup)
        { p: 0.16, e: 'outBack', v: { 'body.y': -0.26, 'legL.x': 0.48, 'legR.x': -0.38, 'shinL': 0.65, 'shinR': 0.55, 'torso.x': 0.35, 'head.x': -0.20, 'armR.x': 0.30, 'armR.y': 0.10, 'armL.x': 0.30, 'armL.y': -0.10 } },
        // 2. Melompat naik & angkat pedang ke atas kepala di udara
        { p: 0.38, e: 'out', v: { 'body.y': 0.85, 'body.z': 0.18, 'legL.x': 0.32, 'legR.x': -0.22, 'shinL': 0.45, 'shinR': 0.38, 'torso.x': -0.35, 'torso.y': 0.10, 'head.x': -0.20, 'armR.x': -2.95, 'armR.y': -0.30, 'armR.z': -0.35, 'foreR': -0.55, 'armL.x': -2.75, 'armL.z': 0.45, 'foreL': -0.45 } },
        // 3. Hantaman tajam dari atas ke tanah
        { p: 0.58, e: 'in', v: { 'body.y': -0.28, 'body.z': 0.22, 'legL.x': 0.58, 'legR.x': -0.50, 'shinL': 0.72, 'shinR': 0.65, 'torso.x': 0.65, 'torso.y': -0.15, 'head.x': 0.24, 'armR.x': 0.95, 'armR.y': 0.02, 'armR.z': -0.12, 'foreR': -0.05, 'armL.x': 0.90, 'armL.z': 0.40, 'foreL': -0.15 } },
        // 4. Mendarat & menahan posisi jongkok meredam benturan
        { p: 0.76, e: 'out', v: { 'body.y': -0.25, 'body.z': 0.15, 'legL.x': 0.55, 'legR.x': -0.46, 'shinL': 0.68, 'shinR': 0.62, 'torso.x': 0.55, 'head.x': 0.12, 'armR.x': 0.90, 'foreR': -0.05, 'armL.x': 0.85 } },
        // 5. Kembali berdiri netral
        { p: 1.00, e: 'inOut', v: Object.assign({}, Z) }
      ]
    };
  }

  /* ================= IDLE & MOVEMENT ================= */
  animIdle(t, P) {
    const breathe = Math.sin(t * 2.2) * 0.03;
    const sway = Math.sin(t * 1.1) * 0.02;
    if (P.body) P.body.position.y = breathe;
    if (P.torso) { P.torso.rotation.x = breathe * 0.5; P.torso.rotation.y = sway; }
    if (P.armL) {
      P.armL.rotation.x = Math.sin(t * 2.2) * 0.06;
      P.armL.rotation.z = 0.08 + Math.sin(t * 1.8) * 0.02;
      if (P.armL.userData.fore) P.armL.userData.fore.rotation.x = -0.15;
    }
    if (P.armR) {
      P.armR.rotation.x = -Math.sin(t * 2.2) * 0.06;
      P.armR.rotation.z = -0.08 - Math.sin(t * 1.8) * 0.02;
      if (P.armR.userData.fore) P.armR.userData.fore.rotation.x = -0.15;
    }
    if (P.head) {
      P.head.rotation.y = Math.sin(t * 0.8) * 0.12;
      P.head.rotation.x = Math.sin(t * 1.3) * 0.03;
    }
    if (P.legL) P.legL.rotation.z = Math.sin(t * 1.5) * 0.02;
    if (P.legR) P.legR.rotation.z = -Math.sin(t * 1.5) * 0.02;
  }
  animWalk(t, P) {
    const f = 7;
    const s = Math.sin(t * f);
    const c = Math.cos(t * f);
    if (P.legL) {
      P.legL.rotation.x = s * 0.55;
      if (P.legL.userData.shin) P.legL.userData.shin.rotation.x = Math.max(0, -c) * 0.6;
    }
    if (P.legR) {
      P.legR.rotation.x = -s * 0.55;
      if (P.legR.userData.shin) P.legR.userData.shin.rotation.x = Math.max(0, c) * 0.6;
    }
    if (P.armL) P.armL.rotation.x = -s * 0.45;
    if (P.armR) P.armR.rotation.x = s * 0.45;
    if (P.armL && P.armL.userData.fore) P.armL.userData.fore.rotation.x = -0.3;
    if (P.armR && P.armR.userData.fore) P.armR.userData.fore.rotation.x = -0.3;
    if (P.torso) { P.torso.rotation.y = s * 0.08; P.torso.rotation.x = 0.05; }
    if (P.head) P.head.rotation.y = -s * 0.05;
    if (P.body) P.body.position.y = Math.abs(Math.sin(t * f)) * 0.05;
  }
  animSprint(t, P) {
    const f = 12;
    const s = Math.sin(t * f);
    const c = Math.cos(t * f);
    if (P.legL) {
      P.legL.rotation.x = s * 0.9;
      if (P.legL.userData.shin) P.legL.userData.shin.rotation.x = Math.max(0, -c) * 1.1;
    }
    if (P.legR) {
      P.legR.rotation.x = -s * 0.9;
      if (P.legR.userData.shin) P.legR.userData.shin.rotation.x = Math.max(0, c) * 1.1;
    }
    if (P.armL) {
      P.armL.rotation.x = -s * 0.8;
      if (P.armL.userData.fore) P.armL.userData.fore.rotation.x = -1.2;
    }
    if (P.armR) {
      P.armR.rotation.x = s * 0.8;
      if (P.armR.userData.fore) P.armR.userData.fore.rotation.x = -1.2;
    }
    if (P.torso) P.torso.rotation.x = 0.3;
    if (P.body) P.body.position.y = Math.abs(Math.sin(t * f)) * 0.09;
  }
  animJump(p, P) {
    const arc = Math.sin(p * Math.PI);
    if (P.body) P.body.position.y = arc * 0.85;
    if (p < 0.25) {
      const k = p / 0.25;
      if (P.legL) { P.legL.rotation.x = -0.3 * (1 - k); if (P.legL.userData.shin) P.legL.userData.shin.rotation.x = 0.4 * (1 - k); }
      if (P.legR) { P.legR.rotation.x = -0.3 * (1 - k); if (P.legR.userData.shin) P.legR.userData.shin.rotation.x = 0.4 * (1 - k); }
      if (P.armL) P.armL.rotation.x = 0.4 * (1 - k);
      if (P.armR) P.armR.rotation.x = 0.4 * (1 - k);
      if (P.torso) P.torso.rotation.x = 0.2 * (1 - k);
    } else if (p < 0.8) {
      if (P.legL) { P.legL.rotation.x = 0.45; if (P.legL.userData.shin) P.legL.userData.shin.rotation.x = 0.5; }
      if (P.legR) { P.legR.rotation.x = -0.25; if (P.legR.userData.shin) P.legR.userData.shin.rotation.x = 0.35; }
      if (P.armL) { P.armL.rotation.x = -0.6; if (P.armL.userData.fore) P.armL.userData.fore.rotation.x = -0.4; }
      if (P.armR) { P.armR.rotation.x = -0.3; if (P.armR.userData.fore) P.armR.userData.fore.rotation.x = -0.4; }
      if (P.torso) P.torso.rotation.x = 0.08;
      if (P.head) P.head.rotation.x = 0.05;
    } else {
      const k = (p - 0.8) / 0.2;
      if (P.legL) { P.legL.rotation.x = 0.45 * (1 - k); if (P.legL.userData.shin) P.legL.userData.shin.rotation.x = 0.5 * (1 - k); }
      if (P.legR) { P.legR.rotation.x = -0.25 * (1 - k); if (P.legR.userData.shin) P.legR.userData.shin.rotation.x = 0.35 * (1 - k); }
      if (P.armL) P.armL.rotation.x = -0.6 * (1 - k);
      if (P.armR) P.armR.rotation.x = -0.3 * (1 - k);
      if (P.torso) P.torso.rotation.x = 0.15 * (1 - k);
    }
  }
  animDodge(p, P) {
    const k = this.easeOut(this.clamp(p / 0.3, 0, 1));
    if (P.torso) P.torso.rotation.x = 0.5 * k;
    if (P.armL) { P.armL.rotation.x = 0.75 * k; if (P.armL.userData.fore) P.armL.userData.fore.rotation.x = -0.3; }
    if (P.armR) { P.armR.rotation.x = 0.75 * k; if (P.armR.userData.fore) P.armR.userData.fore.rotation.x = -0.3; }
    if (P.legL) { P.legL.rotation.x = -0.5 * k; if (P.legL.userData.shin) P.legL.userData.shin.rotation.x = 0.45 * k; }
    if (P.legR) { P.legR.rotation.x = 0.4 * k; if (P.legR.userData.shin) P.legR.userData.shin.rotation.x = 0.2 * k; }
    if (P.body) P.body.position.y = 0.05 * Math.sin(this.clamp(p, 0, 1) * Math.PI);
  }
  animBlock(t, P) {
    const pulse = Math.sin(t * 4) * 0.03;
    if (P.armR) {
      P.armR.rotation.set(-1.1 + pulse, 0.6, -0.3);
      if (P.armR.userData.fore) P.armR.userData.fore.rotation.x = -1.4;
    }
    if (P.armL) {
      P.armL.rotation.set(-0.9, -0.5, 0.3);
      if (P.armL.userData.fore) P.armL.userData.fore.rotation.x = -1.2;
    }
    if (P.torso) P.torso.rotation.x = 0.1;
    if (P.head) P.head.rotation.x = -0.1;
  }
  animDeath(p, P) {
    if (!P.body) return;
    const fall = this.easeIn(this.clamp(p * 1.5, 0, 1));
    P.body.rotation.z = fall * Math.PI / 2;
    P.body.position.y = -fall * 0.65;
    if (P.armL) P.armL.rotation.z = 0.5 * fall;
    if (P.armR) P.armR.rotation.z = -0.5 * fall;
    if (P.head) P.head.rotation.z = -0.3 * fall;
  }

  /* ================= COMBAT (keyframe engine) ================= */
  animSlashHorizontal(p, P) { this._playCombo('combo1', p, P); }
  animUppercutSlash(p, P) { this._playCombo('combo2', p, P); }
  animThrust(p, P) { this._playCombo('combo3', p, P); }
  animSpinAttack(p, P) { this._playCombo('combo4', p, P); }
  animHeavyCleave(p, P) { this._playCombo('combo5', p, P); }

  /* ================= SKILLS ================= */
  animFireball(p, P) {
    let armR = { x: 0, y: 0, z: 0 }, armL = { x: 0, y: 0, z: 0 }, torsoX = 0;
    if (p < 0.4) {
      const k = this.easeOut(p / 0.4);
      armR = { x: -0.8 * k, y: -0.3 * k, z: -0.2 * k };
      armL = { x: -0.8 * k, y: 0.3 * k, z: 0.2 * k };
      torsoX = 0.1 * k;
      if (P.armR && P.armR.userData.fore) P.armR.userData.fore.rotation.x = -0.8 * k;
      if (P.armL && P.armL.userData.fore) P.armL.userData.fore.rotation.x = -0.8 * k;
    } else if (p < 0.6) {
      const shake = Math.sin(p * 60) * 0.03;
      armR = { x: -0.8 + shake, y: -0.3, z: -0.2 };
      armL = { x: -0.8 - shake, y: 0.3, z: 0.2 };
      torsoX = 0.1;
    } else {
      const k = this.easeIn((p - 0.6) / 0.4);
      armR = { x: -0.8 + k * 0.6, y: -0.3 + k * 0.3, z: -0.2 };
      armL = { x: -0.8 * (1 - k), y: 0.3 * (1 - k), z: 0.2 * (1 - k) };
      torsoX = 0.1 - k * 0.3;
      if (P.armR && P.armR.userData.fore) P.armR.userData.fore.rotation.x = -0.8 + k * 0.8;
      if (P.armL && P.armL.userData.fore) P.armL.userData.fore.rotation.x = -0.8 * (1 - k);
    }
    if (P.armR) P.armR.rotation.set(armR.x, armR.y, armR.z);
    if (P.armL) P.armL.rotation.set(armL.x, armL.y, armL.z);
    if (P.torso) P.torso.rotation.x = torsoX;
    if (P.head) P.head.rotation.x = torsoX * 0.5;
    if (P.body) P.body.position.y = Math.sin(p * Math.PI) * 0.03;
  }
  animDash(p, P) {
    const lean = Math.sin(p * Math.PI);
    if (P.torso) P.torso.rotation.x = 0.5 * lean;
    if (P.head) P.head.rotation.x = -0.3 * lean;
    if (P.armL) {
      P.armL.rotation.x = 0.8 * lean;
      if (P.armL.userData.fore) P.armL.userData.fore.rotation.x = -0.5 * lean;
    }
    if (P.armR) {
      P.armR.rotation.x = 0.8 * lean;
      if (P.armR.userData.fore) P.armR.userData.fore.rotation.x = -0.5 * lean;
    }
    if (P.legL) P.legL.rotation.x = -0.3 * lean;
    if (P.legR) P.legR.rotation.x = 0.5 * lean;
    if (P.body) P.body.position.y = lean * 0.05;
  }
  animHeal(p, P) {
    let armR = { x: 0, y: 0, z: 0 }, armL = { x: 0, y: 0, z: 0 }, torsoX = 0, headX = 0;
    if (p < 0.3) {
      const k = this.easeOut(p / 0.3);
      armR = { x: -1.8 * k, y: 0.3 * k, z: -0.3 * k };
      armL = { x: -1.8 * k, y: -0.3 * k, z: 0.3 * k };
      torsoX = -0.1 * k; headX = -0.2 * k;
    } else if (p < 0.8) {
      const glow = Math.sin((p - 0.3) * 12) * 0.05;
      armR = { x: -1.8 + glow, y: 0.3, z: -0.3 };
      armL = { x: -1.8 - glow, y: -0.3, z: 0.3 };
      torsoX = -0.1; headX = -0.2;
    } else {
      const k = this.easeOut((p - 0.8) / 0.2);
      armR = { x: -1.8 * (1 - k), y: 0.3 * (1 - k), z: -0.3 * (1 - k) };
      armL = { x: -1.8 * (1 - k), y: -0.3 * (1 - k), z: 0.3 * (1 - k) };
      torsoX = -0.1 * (1 - k); headX = -0.2 * (1 - k);
    }
    if (P.armR) {
      P.armR.rotation.set(armR.x, armR.y, armR.z);
      if (P.armR.userData.fore) P.armR.userData.fore.rotation.x = -0.3;
    }
    if (P.armL) {
      P.armL.rotation.set(armL.x, armL.y, armL.z);
      if (P.armL.userData.fore) P.armL.userData.fore.rotation.x = -0.3;
    }
    if (P.torso) P.torso.rotation.x = torsoX;
    if (P.head) P.head.rotation.x = headX;
    if (P.body) P.body.position.y = Math.sin(p * Math.PI) * 0.05;
  }
  animShieldBash(p, P) {
    let armL = { x: 0, y: 0, z: 0 }, armR = { x: 0, y: 0, z: 0 }, torsoY = 0;
    if (p < 0.3) {
      const k = this.easeOutBack(p / 0.3);
      armL = { x: -1.0 * k, y: -0.5 * k, z: 0.4 * k };
      torsoY = -0.3 * k;
      armR = { x: 0.3 * k, y: 0, z: -0.2 * k };
    } else if (p < 0.55) {
      const k = this.easeIn((p - 0.3) / 0.25);
      armL = { x: -1.0 + k * 0.8, y: -0.5 + k * 0.5, z: 0.4 - k * 0.6 };
      torsoY = -0.3 + k * 0.6;
      armR = { x: 0.3 * (1 - k), y: 0, z: -0.2 * (1 - k) };
    } else {
      const k = this.easeOut((p - 0.55) / 0.45);
      armL = { x: -0.2 * (1 - k), y: 0, z: -0.2 * (1 - k) };
      torsoY = 0.3 * (1 - k);
    }
    if (P.armL) {
      P.armL.rotation.set(armL.x, armL.y, armL.z);
      if (P.armL.userData.fore) P.armL.userData.fore.rotation.x = -1.2;
    }
    if (P.armR) P.armR.rotation.set(armR.x, armR.y, armR.z);
    if (P.torso) P.torso.rotation.y = torsoY;
    if (P.head) P.head.rotation.y = torsoY * 0.5;
    if (P.body) P.body.position.y = Math.sin(p * Math.PI) * 0.04;
    if (P.legL) P.legL.rotation.x = 0.2;
    if (P.legR) P.legR.rotation.x = -0.15;
  }
  animWhirlwind(p, P) {
    if (!P.body) return;
    const spin = this.easeInOut(p) * Math.PI * 2 * 2;
    P.body.rotation.y = spin;
    const spread = Math.sin(p * Math.PI);
    if (P.armR) {
      P.armR.rotation.set(-1.5, 0, 1.0 * spread);
      if (P.armR.userData.fore) P.armR.userData.fore.rotation.x = -0.2;
    }
    if (P.armL) {
      P.armL.rotation.set(-1.5, 0, -1.0 * spread);
      if (P.armL.userData.fore) P.armL.userData.fore.rotation.x = -0.2;
    }
    if (P.torso) P.torso.rotation.x = 0.15;
    if (P.body) P.body.position.y = spread * 0.1;
    if (P.legL) P.legL.rotation.x = 0.15;
    if (P.legR) P.legR.rotation.x = -0.15;
  }
  animThunder(p, P) {
    let armR = { x: 0, y: 0, z: 0 }, armL = { x: 0, y: 0, z: 0 };
    let torsoX = 0, torsoY = 0, headX = 0;
    let bodyY = 0, bodyZ = 0;
    let legLX = 0, legRX = 0, shinL = 0, shinR = 0;

    if (p < 0.20) {
      // FASE 1: Jongkok ancang-ancang melompat (Crouch windup)
      const k = this.easeOut(p / 0.20);
      bodyY = -0.26 * k;
      legLX = 0.48 * k;
      legRX = -0.38 * k;
      shinL = 0.65 * k;
      shinR = 0.55 * k;
      torsoX = 0.35 * k;
      headX = -0.20 * k;
      armR = { x: 0.35 * k, y: 0.1 * k, z: -0.2 * k };
      armL = { x: 0.35 * k, y: -0.1 * k, z: 0.2 * k };
    } else if (p < 0.56) {
      // FASE 2: Melompat tinggi ke udara & angkat kedua tangan
      const k = (p - 0.20) / 0.36;
      const jumpArc = Math.sin(k * Math.PI);
      bodyY = -0.26 * (1 - k) + jumpArc * 0.95;
      bodyZ = 0.20 * k;

      legLX = this.lerp(0.48, 0.30, k);
      legRX = this.lerp(-0.38, -0.20, k);
      shinL = this.lerp(0.65, 0.45, k);
      shinR = this.lerp(0.55, 0.40, k);

      torsoX = this.lerp(0.35, -0.32, this.easeIn(k));
      headX = this.lerp(-0.20, -0.25, k);

      const shake = (k > 0.6 && k < 0.95) ? Math.sin(p * 80) * 0.05 : 0;
      armR = {
        x: this.lerp(0.35, -2.85, this.easeOutBack(k)) + shake,
        y: this.lerp(0.1, -0.2, k),
        z: this.lerp(-0.2, -0.3, k)
      };
      armL = {
        x: this.lerp(0.35, -2.75, this.easeOutBack(k)) - shake,
        y: this.lerp(-0.1, 0.2, k),
        z: this.lerp(0.2, 0.3, k)
      };
      if (P.armR && P.armR.userData.fore) P.armR.userData.fore.rotation.x = -0.5 * k;
      if (P.armL && P.armL.userData.fore) P.armL.userData.fore.rotation.x = -0.5 * k;
    } else if (p < 0.72) {
      // FASE 3: Hantam kuat ke tanah & mendarat jongkok
      const k = this.easeIn((p - 0.56) / 0.16);
      bodyY = this.lerp(0.40, -0.30, k);
      bodyZ = 0.20;

      legLX = this.lerp(0.30, 0.60, k);
      legRX = this.lerp(-0.20, -0.50, k);
      shinL = this.lerp(0.45, 0.75, k);
      shinR = this.lerp(0.40, 0.70, k);

      torsoX = this.lerp(-0.32, 0.65, k);
      headX = this.lerp(-0.25, 0.25, k);

      armR = { x: this.lerp(-2.85, 0.95, k), y: 0, z: -0.1 };
      armL = { x: this.lerp(-2.75, 0.90, k), y: 0, z: 0.1 };
      if (P.armR && P.armR.userData.fore) P.armR.userData.fore.rotation.x = this.lerp(-0.5, -0.05, k);
      if (P.armL && P.armL.userData.fore) P.armL.userData.fore.rotation.x = this.lerp(-0.5, -0.05, k);
    } else if (p < 0.86) {
      // FASE 4: Menahan posisi jongkok mendarat
      const k = (p - 0.72) / 0.14;
      bodyY = this.lerp(-0.30, -0.26, k);
      bodyZ = 0.20 * (1 - k * 0.5);
      legLX = 0.60; legRX = -0.50;
      shinL = 0.75; shinR = 0.70;
      torsoX = this.lerp(0.65, 0.55, k);
      headX = this.lerp(0.25, 0.10, k);
      armR = { x: 0.95, y: 0, z: -0.1 };
      armL = { x: 0.90, y: 0, z: 0.1 };
      if (P.armR && P.armR.userData.fore) P.armR.userData.fore.rotation.x = -0.05;
      if (P.armL && P.armL.userData.fore) P.armL.userData.fore.rotation.x = -0.05;
    } else {
      // FASE 5: Bangkit berdiri kembali
      const k = this.easeInOut((p - 0.86) / 0.14);
      bodyY = this.lerp(-0.26, 0, k);
      bodyZ = this.lerp(0.10, 0, k);
      legLX = this.lerp(0.60, 0, k);
      legRX = this.lerp(-0.50, 0, k);
      shinL = this.lerp(0.75, 0, k);
      shinR = this.lerp(0.70, 0, k);
      torsoX = this.lerp(0.55, 0, k);
      headX = this.lerp(0.10, 0, k);
      armR = { x: this.lerp(0.95, 0, k), y: 0, z: 0 };
      armL = { x: this.lerp(0.90, 0, k), y: 0, z: 0 };
      if (P.armR && P.armR.userData.fore) P.armR.userData.fore.rotation.x = this.lerp(-0.05, 0, k);
      if (P.armL && P.armL.userData.fore) P.armL.userData.fore.rotation.x = this.lerp(-0.05, 0, k);
    }

    if (P.armR) P.armR.rotation.set(armR.x, armR.y, armR.z);
    if (P.armL) P.armL.rotation.set(armL.x, armL.y, armL.z);
    if (P.torso) P.torso.rotation.set(torsoX, torsoY, 0);
    if (P.head) P.head.rotation.set(headX, 0, 0);
    if (P.legL) {
      P.legL.rotation.x = legLX;
      if (P.legL.userData.shin) P.legL.userData.shin.rotation.x = shinL;
    }
    if (P.legR) {
      P.legR.rotation.x = legRX;
      if (P.legR.userData.shin) P.legR.userData.shin.rotation.x = shinR;
    }
    if (P.body) {
      P.body.position.set(0, bodyY, bodyZ);
    }
  }

  /* ================= MENUNGGANGI (RIDING) =================
     Konvensi rig (dipelajari dari player.js mkLeg/mkArm):
       - legL/legR: pivot pinggul. rotation.x negatif = paha ke DEPAN,
         rotation.z membuka kaki (mengangkang). shin: +x menekuk turun.
       - armL/armR: pivot bahu. rotation.x negatif = lengan ke DEPAN.
         fore: -x menekuk siku.
       - torso: +x condong depan. body.position.y menggeser seluruh badan. */
  _rideSeat(P, opt) {
    opt = opt || {};
    const bodyY   = opt.bodyY   != null ? opt.bodyY   : -0.18;
    const torsoX  = opt.torsoX  != null ? opt.torsoX  : 0.10;
    const armX    = opt.armX    != null ? opt.armX    : -0.95;  // lengan ke depan
    const foreX   = opt.foreX   != null ? opt.foreX   : -0.35;  // siku menekuk
    const thighX  = opt.thighX  != null ? opt.thighX  : -1.30;  // paha ke depan
    const thighZ  = opt.thighZ  != null ? opt.thighZ  : 0.42;   // mengangkang
    const shinX   = opt.shinX   != null ? opt.shinX   : 1.30;   // betis menekuk

    if (P.body)  P.body.position.set(0, bodyY, 0);
    if (P.torso) P.torso.rotation.set(torsoX, opt.torsoY || 0, 0);
    if (P.head)  P.head.rotation.set(opt.headX || -0.05, opt.headY || 0, 0);

    if (P.legL) {
      P.legL.rotation.set(thighX, opt.thighYL || -0.12, thighZ);
      if (P.legL.userData.shin) P.legL.userData.shin.rotation.set(shinX, 0, 0);
    }
    if (P.legR) {
      P.legR.rotation.set(thighX, opt.thighYR || 0.12, -thighZ);
      if (P.legR.userData.shin) P.legR.userData.shin.rotation.set(shinX, 0, 0);
    }

    if (P.armL) {
      P.armL.rotation.set(armX, opt.armYL || 0.14, 0.10);
      if (P.armL.userData.fore) P.armL.userData.fore.rotation.x = foreX;
    }
    if (P.armR) {
      P.armR.rotation.set(armX, opt.armYR || -0.14, -0.10);
      if (P.armR.userData.fore) P.armR.userData.fore.rotation.x = foreX;
    }
  }

  // NAIK: melompat dari tanah ke punggung mount, lalu turun ke pose duduk.
  animRideMount(p, P) {
    if (p < 0.45) {
      const k = this.easeOut(p / 0.45);
      const bodyY = this.lerp(-0.15, 0.55, k);
      const torsoX = this.lerp(0.30, 0.14, k);
      const thighX = this.lerp(-0.20, -1.20, k);
      const thighZ = this.lerp(0.05, 0.40, k);
      const shinX  = this.lerp(0.30, 1.15, k);
      const armX  = this.lerp(-0.30, -1.05, k);
      const foreX = this.lerp(-0.20, -0.45, k);

      if (P.body)  P.body.position.set(0, bodyY, 0);
      if (P.torso) P.torso.rotation.set(torsoX, 0, 0);
      if (P.head)  P.head.rotation.set(-0.08, 0, 0);
      if (P.legL) {
        P.legL.rotation.set(thighX, -0.10, thighZ);
        if (P.legL.userData.shin) P.legL.userData.shin.rotation.set(shinX, 0, 0);
      }
      if (P.legR) {
        P.legR.rotation.set(thighX, 0.10, -thighZ);
        if (P.legR.userData.shin) P.legR.userData.shin.rotation.set(shinX, 0, 0);
      }
      if (P.armL) {
        P.armL.rotation.set(armX, 0.16, 0.10);
        if (P.armL.userData.fore) P.armL.userData.fore.rotation.x = foreX;
      }
      if (P.armR) {
        P.armR.rotation.set(armX, -0.16, -0.10);
        if (P.armR.userData.fore) P.armR.userData.fore.rotation.x = foreX;
      }
    } else {
      const k = this.easeOut((p - 0.45) / 0.55);
      this._rideSeat(P, {
        bodyY:  this.lerp(0.55, -0.18, k),
        torsoX: this.lerp(0.14, 0.10, k),
        armX:   this.lerp(-1.05, -0.95, k),
        foreX:  this.lerp(-0.45, -0.35, k),
        thighX: this.lerp(-1.20, -1.30, k),
        thighZ: this.lerp(0.40, 0.42, k),
        shinX:  this.lerp(1.15, 1.30, k)
      });
    }
  }

  // DUDUK DIAM: napas halus, tangan ke depan memegang kendali.
  animRideIdle(t, P) {
    const breathe = Math.sin(t * 2.0) * 0.03;
    const sway    = Math.sin(t * 0.9) * 0.02;
    this._rideSeat(P, {
      bodyY:  -0.18 + breathe,
      torsoX: 0.10 + breathe * 0.4,
      torsoY: sway,
      headX:  -0.04 + Math.sin(t * 1.1) * 0.03,
      headY:  Math.sin(t * 0.6) * 0.08,
      armX:   -0.95 + breathe * 0.3,
      foreX:  -0.35,
      thighX: -1.30,
      thighZ: 0.42,
      shinX:  1.30
    });
  }

  // BERGERAK / berlari: memantul mengikuti derap + tangan mengayun.
  animRideMove(t, P) {
    const f = 8.0;
    const bounce = Math.abs(Math.sin(t * f)) * 0.09;
    const nod    = Math.sin(t * f) * 0.05;
    const sway   = Math.sin(t * f * 0.5) * 0.03;
    this._rideSeat(P, {
      bodyY:  -0.18 + bounce,
      torsoX: 0.16 + nod,
      torsoY: sway,
      headX:  -0.08,
      headY:  Math.sin(t * 1.2) * 0.05,
      armX:   -0.92 + nod * 0.6,
      foreX:  -0.40 + nod * 0.2,
      thighX: -1.32,
      thighZ: 0.44,
      shinX:  1.34
    });
  }

  // TURUN: mengayun kaki keluar lalu meluncur turun & mendarat.
  animRideDismount(p, P) {
    if (p < 0.5) {
      const k = this.easeIn(p / 0.5);
      const bodyY  = this.lerp(-0.18, 0.30, Math.sin(k * Math.PI));
      const thighX = this.lerp(-1.30, -0.30, k);
      const thighZ = this.lerp(0.42, 0.20, k);
      const shinX  = this.lerp(1.30, 0.50, k);
      const armX   = this.lerp(-0.95, -0.30, k);
      const foreX  = this.lerp(-0.35, -0.20, k);
      if (P.body)  P.body.position.set(0, bodyY, 0);
      if (P.torso) P.torso.rotation.set(this.lerp(0.10, 0.18, k), 0, 0);
      if (P.head)  P.head.rotation.set(-0.05, 0, 0);
      if (P.legL) {
        P.legL.rotation.set(thighX, -0.10, thighZ);
        if (P.legL.userData.shin) P.legL.userData.shin.rotation.set(shinX, 0, 0);
      }
      if (P.legR) {
        P.legR.rotation.set(thighX, 0.10, -thighZ);
        if (P.legR.userData.shin) P.legR.userData.shin.rotation.set(shinX, 0, 0);
      }
      if (P.armL) {
        P.armL.rotation.set(armX, 0.12, 0.20);
        if (P.armL.userData.fore) P.armL.userData.fore.rotation.x = foreX;
      }
      if (P.armR) {
        P.armR.rotation.set(armX, -0.12, -0.20);
        if (P.armR.userData.fore) P.armR.userData.fore.rotation.x = foreX;
      }
    } else {
      const k = this.easeOut((p - 0.5) / 0.5);
      const bodyY  = this.lerp(0.30, 0, k) - 0.10 * Math.sin(k * Math.PI);
      const thighX = this.lerp(-0.30, 0.02, k);
      const shinX  = this.lerp(0.50, 0.10, k);
      const armX   = this.lerp(-0.30, 0.05, k);
      const foreX  = this.lerp(-0.20, -0.15, k);
      if (P.body)  P.body.position.set(0, bodyY, 0);
      if (P.torso) P.torso.rotation.set(this.lerp(0.18, 0.02, k), 0, 0);
      if (P.head)  P.head.rotation.set(0, 0, 0);
      if (P.legL) {
        P.legL.rotation.set(thighX, 0, 0.06 * (1 - k));
        if (P.legL.userData.shin) P.legL.userData.shin.rotation.set(shinX, 0, 0);
      }
      if (P.legR) {
        P.legR.rotation.set(thighX, 0, -0.06 * (1 - k));
        if (P.legR.userData.shin) P.legR.userData.shin.rotation.set(shinX, 0, 0);
      }
      if (P.armL) {
        P.armL.rotation.set(armX, 0.06, this.lerp(0.20, 0.10, k));
        if (P.armL.userData.fore) P.armL.userData.fore.rotation.x = foreX;
      }
      if (P.armR) {
        P.armR.rotation.set(armX, -0.06, this.lerp(-0.20, -0.10, k));
        if (P.armR.userData.fore) P.armR.userData.fore.rotation.x = foreX;
      }
    }
  }

  /* ================= HANTAM BUMI CEPAT (fase fisika) =================
     Dipisah dari combo5 karena lompatannya digerakkan FISIKA nyata:
     windup = jongkok statis di tanah, land = pose hantam saat MENDARAT. */
  animSlamWindup(p, P) {
    // jongkok dalam & stabil: paha menekuk, torso condong, tangan ke belakang
    const k = this.easeOut(this.clamp(p * 2, 0, 1));   // cepat masuk pose
    if (P.body) P.body.position.set(0, -0.28 * k, 0);
    if (P.torso) P.torso.rotation.set(0.38 * k, 0, 0);
    if (P.head) P.head.rotation.x = -0.22 * k;
    if (P.legL) {
      P.legL.rotation.x = 0.55 * k;
      if (P.legL.userData.shin) P.legL.userData.shin.rotation.x = 0.75 * k;
    }
    if (P.legR) {
      P.legR.rotation.x = -0.45 * k;
      if (P.legR.userData.shin) P.legR.userData.shin.rotation.x = 0.62 * k;
    }
    if (P.armL) { P.armL.rotation.set(0.55 * k, 0, 0.30 * k); }
    if (P.armR) { P.armR.rotation.set(0.60 * k, 0, -0.32 * k); }
  }
  animSlamLand(p, P) {
    // FASE A (0-0.3): benturan hantaman — badan rendah, kedua tangan menumbuk
    // FASE B (0.3-1): bangkit berdiri
    let bodyY, torsoX, headX, armX, legL, legRX, shin;
    if (p < 0.3) {
      const k = this.easeIn(p / 0.3);
      bodyY = this.lerp(-0.18, -0.34, k);
      torsoX = this.lerp(0.30, 0.68, k);
      headX = this.lerp(0.10, 0.26, k);
      armX = this.lerp(-1.20, 0.95, k);          // terhempas ke bawah depan
      legL = this.lerp(0.30, 0.58, k);
      legRX = this.lerp(-0.24, -0.50, k);
      shin = this.lerp(0.40, 0.72, k);
    } else {
      const k = this.easeInOut((p - 0.3) / 0.7);
      bodyY = this.lerp(-0.34, 0, k);
      torsoX = this.lerp(0.68, 0, k);
      headX = this.lerp(0.26, 0, k);
      armX = this.lerp(0.95, 0, k);
      legL = this.lerp(0.58, 0, k);
      legRX = this.lerp(-0.50, 0, k);
      shin = this.lerp(0.72, 0, k);
    }
    if (P.body) P.body.position.set(0, bodyY, 0.14);
    if (P.torso) P.torso.rotation.set(torsoX, 0, 0);
    if (P.head) P.head.rotation.x = headX;
    if (P.legL) {
      P.legL.rotation.x = legL;
      if (P.legL.userData.shin) P.legL.userData.shin.rotation.x = shin;
    }
    if (P.legR) {
      P.legR.rotation.x = legRX;
      if (P.legR.userData.shin) P.legR.userData.shin.rotation.x = shin * 0.92;
    }
    if (P.armL) {
      P.armL.rotation.set(armX, -0.10, 0.22);
      if (P.armL.userData.fore) P.armL.userData.fore.rotation.x = -0.08;
    }
    if (P.armR) {
      P.armR.rotation.set(armX, 0.10, -0.24);
      if (P.armR.userData.fore) P.armR.userData.fore.rotation.x = -0.08;
    }
  }

  /* ================= TERIAKAN PERANG (berteriak) =================
     Bentuk gerakan mengikuti bahasa tubuh orang BERTERIAK, bukan pose kuda-kuda:
       0.00-0.22  ancang: badan sedikit membungkuk, dada tarik napas dalam,
                  kedua tangan mengepal ditarik ke belakang-bawah.
       0.22-0.68  TERIAKAN: torso melengkung ke belakang, kepala mendongak &
                  MULUT TERBUKA lebar, kedua lengan terhempas terbuka lebar
                  ke samping-belakang, badan terangkat & bergetar (raung).
       0.68-1.00  reda: napas turun, tangan kembali, mulut menutup.
     Mulut digerakkan lewat parts.mouth (dibuka dengan menggeser & meregangkan
     bibir + rongga gelap di belakangnya) sehingga teriakannya terlihat. */
  animRoar(t, P) {
    const dur = this.durations.roar || 0.9;
    const p = this.clamp(t / dur, 0, 1);
    let torsoX, headX, bodyY, bodyZ;
    let armX, armY, armZ, fore;
    let legSpread = 0, brace = 0, mouthOpen = 0, shoulder = 0;

    if (p < 0.22) {
      // ANCANG: membungkuk sedikit sambil menarik napas, tangan mengepal ditarik
      const k = this.easeOut(p / 0.22);
      torsoX = 0.20 * k;                 // bungkuk ke depan
      headX = 0.10 * k;                  // dagu turun (menunduk sesaat)
      bodyY = -0.05 * k;                 // badan merendah
      bodyZ = 0;
      armX = 0.85 * k;                   // lengan ditarik ke belakang-bawah
      armY = 0.10 * k;
      armZ = 0.18 * k;
      fore = -0.55 * k;
      shoulder = 0.10 * k;
      legSpread = 0.06 * k;
      brace = k * 0.4;
      mouthOpen = 0.15 * k;              // mulut mulai terbuka menarik napas
    } else if (p < 0.68) {
      // TERIAKAN: dada terbuka, kepala mendongak, mulut lebar, lengan mengembang
      const k = this.easeOut(this.clamp((p - 0.22) / 0.14, 0, 1));
      const tremble = Math.sin(t * 52) * 0.045;     // getaran suara
      const holler = 0.5 + 0.5 * Math.sin(t * 26);  // denyut raungan
      torsoX = this.lerp(0.20, -0.34, k);           // melengkung ke belakang
      headX = this.lerp(0.10, -0.62, k) + tremble * 0.5;  // mendongak kuat
      bodyY = this.lerp(-0.05, 0.10, k);            // badan terangkat (jinjit)
      bodyZ = 0;
      armX = this.lerp(0.85, -0.30, k) + tremble;   // lengan terhempas terbuka
      armY = this.lerp(0.10, -0.55, k);             // membuka ke samping
      armZ = this.lerp(0.18, 1.05, k) + tremble * 0.6;
      fore = this.lerp(-0.55, -0.30, k);            // siku hampir lurus
      shoulder = this.lerp(0.10, -0.22, k);
      legSpread = this.lerp(0.06, 0.22, k);
      brace = 1;
      mouthOpen = this.lerp(0.15, 0.85 + 0.15 * holler, k);
    } else {
      // REDA: napas turun, mulut menutup, tangan kembali ke sisi tubuh
      const k = this.easeInOut((p - 0.68) / 0.32);
      torsoX = this.lerp(-0.34, 0, k);
      headX = this.lerp(-0.62, 0, k);
      bodyY = this.lerp(0.10, 0, k);
      bodyZ = 0;
      armX = this.lerp(-0.30, 0, k);
      armY = this.lerp(-0.55, 0, k);
      armZ = this.lerp(1.05, 0, k);
      fore = this.lerp(-0.30, -0.15, k);
      shoulder = this.lerp(-0.22, 0, k);
      legSpread = 0.22 * (1 - k);
      brace = 1 - k;
      mouthOpen = 0.85 * (1 - k);
    }

    if (P.body) { P.body.position.set(0, bodyY, 0); P.body.rotation.z = bodyZ; }
    if (P.torso) P.torso.rotation.set(torsoX, 0, 0);
    if (P.head) P.head.rotation.set(headX, 0, 0);
    /* lengan simetris terbuka ke samping (Y & Z dicerminkan kiri/kanan) */
    if (P.armR) {
      P.armR.rotation.set(armX + shoulder, -armY, -armZ);
      if (P.armR.userData.fore) P.armR.userData.fore.rotation.x = fore;
    }
    if (P.armL) {
      P.armL.rotation.set(armX + shoulder, armY, armZ);
      if (P.armL.userData.fore) P.armL.userData.fore.rotation.x = fore;
    }
    if (P.legL) { P.legL.rotation.x = -brace * 0.10; P.legL.rotation.z = legSpread; }
    if (P.legR) { P.legR.rotation.x = brace * 0.10; P.legR.rotation.z = -legSpread; }
    this._setMouthOpen(P, mouthOpen);
  }

  /* Buka/tutup mulut karakter. `k` 0=tertutup, 1=terbuka lebar.
     Bibir digeser turun & rongga gelap di belakangnya diregangkan sehingga
     mulut terbaca terbuka walau modelnya kotak. Aman bila parts.mouth tidak
     ada (model lain / karakter lama). */
  _setMouthOpen(P, k) {
    const m = P.mouth;
    if (!m) return;
    k = this.clamp(k, 0, 1);
    const baseY = (m.userData.baseY !== undefined) ? m.userData.baseY : m.position.y;
    m.position.y = baseY - 0.035 * k;         // bibir bawah turun
    m.scale.set(1 + 0.35 * k, 1 + 1.2 * k, 1);
    const inner = m.userData.inner;
    if (inner) {
      inner.visible = k > 0.05;
      inner.position.y = baseY - 0.018 * k;
      inner.scale.set(1 + 0.5 * k, Math.max(0.001, 0.4 + 5.5 * k), 1);
    }
  }

  /* ================= SEQUENCE (demo) ================= */
  animSequence(dt, P) {
    this.sequenceTimer += dt;
    const combos = ['combo1', 'combo2', 'combo3', 'combo4', 'combo5'];
    const idx = Math.floor(this.sequenceTimer / 1) % 5;
    const localT = this.sequenceTimer % 1;
    const name = combos[idx];
    const dur = this.durations[name] || 0.5;
    const p = this.clamp(localT / dur, 0, 1);
    this._playCombo(name, p, P);
  }
  setAnimDirect(name, t) {
    const P = this.parts;
    if (!P) return;
    const p = t % 1;
    if (/^combo[1-5]$/.test(name)) this._playCombo(name, p, P);
  }
}
window.PlayerAnimator = PlayerAnimator;
window.CharacterAnimator = PlayerAnimator; // backwards compatibility
if (typeof module !== 'undefined') module.exports = PlayerAnimator;
