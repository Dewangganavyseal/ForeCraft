'use strict';
/* =================================================================
FORECRAFT 3D - PLAYER ANIMATIONS CONTROLLER (ENHANCED)
File: js/player/player_animations.js
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

    // Durasi animasi one-shot (detik).
    // 'jump' SENGAJA tidak ada di sini → diperlakukan sebagai pose statis yang
    // ditahan selama di udara (1 frame gerakan, sesuai permintaan).
    this.durations = {
      // Combat combos
      combo1: 0.45, combo2: 0.50, combo3: 0.42, combo4: 0.75, combo5: 0.90,
      dash: 0.35, death: 2.2,
      // Skills
      skill_fireball:    1.30,
      skill_dash:        0.45,
      skill_heal:        1.60,
      skill_shield_bash: 0.65,
      skill_whirlwind:   1.10,
      skill_thunder:     1.50,
      // Menunggangi (one-shot naik & turun)
      ride_mount:    0.55,
      ride_dismount: 0.45
    };
  }

  /* ================= UTILITIES ================= */
  lerp(a, b, t) { return a + (b - a) * t; }
  clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  easeInOut(t) { return t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t; }
  easeOut(t)   { return 1 - Math.pow(1 - t, 3); }
  easeIn(t)    { return t * t * t; }
  easeOutBack(t) {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
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

    resetGroup(P.legL);
    resetGroup(P.legR);
    resetGroup(P.armL);
    resetGroup(P.armR);

    if (P.head)  P.head.rotation.set(0, 0, 0);
    if (P.torso) P.torso.rotation.set(0, 0, 0);
    if (P.body) {
      P.body.position.set(0, 0, 0);
      P.body.rotation.set(0, 0, 0);
    }
  }

  /* ================= API ================= */
  setAnimation(animName, speed = 1.0) {
    this.currentAnim = animName;
    this.speed = speed;
    this.time = 0;
    this.finished = false;
    this.resetLimbs();
  }

  playOnce(animName, speed = 1.0, onEnd = null) {
    this.setAnimation(animName, speed);
    this.onAnimEnd = onEnd;
  }

  update(dt) {
    this.time += dt * this.speed;
    const t = this.time;
    const P = this.parts;
    if (!P || !P.armR) return;

    const dur = this.durations[this.currentAnim] || 0;

    // Cek selesai untuk animasi one-shot
    if (dur > 0 && t >= dur && !this.finished) {
      this.finished = true;
      if (this.onAnimEnd) {
        const cb = this.onAnimEnd;
        this.onAnimEnd = null;
        cb(this.currentAnim);
      }
      // Auto kembali ke idle untuk serangan / skill / roll
      if (
        this.currentAnim.startsWith('combo') ||
        this.currentAnim.startsWith('skill') ||
        this.currentAnim === 'roll'
      ) {
        this.setAnimation('idle');
        return;
      }
    }

    // Progress 0-1 untuk one-shot
    const p = dur > 0 ? this.clamp(t / dur, 0, 1) : 0;

    // Dispatch animasi
    switch (this.currentAnim) {
      case 'idle':   this.animIdle(t, P); break;
      case 'walk':   this.animWalk(t, P); break;
      case 'sprint': this.animSprint(t, P); break;
      case 'jump':   this.animJump(p, P); break;
      case 'dash':   this.animDodge(p, P); break;
      case 'block':  this.animBlock(t, P); break;
      case 'death':  this.animDeath(p, P); break;

      // Combat
      case 'combo1': this.animSlashHorizontal(p, P); break;
      case 'combo2': this.animUppercutSlash(p, P); break;
      case 'combo3': this.animThrust(p, P); break;
      case 'combo4': this.animSpinAttack(p, P); break;
      case 'combo5': this.animHeavyCleave(p, P); break;

      // Skills
      case 'skill_fireball':    this.animFireball(p, P); break;
      case 'skill_dash':        this.animDash(p, P); break;
      case 'skill_heal':        this.animHeal(p, P); break;
      case 'skill_shield_bash': this.animShieldBash(p, P); break;
      case 'skill_whirlwind':   this.animWhirlwind(p, P); break;
      case 'skill_thunder':     this.animThunder(p, P); break;

      // Menunggangi
      case 'ride_mount':    this.animRideMount(p, P); break;
      case 'ride_idle':     this.animRideIdle(t, P); break;
      case 'ride_move':     this.animRideMove(t, P); break;
      case 'ride_dismount': this.animRideDismount(p, P); break;

      case 'sequence': this.animSequence(dt, P); break;
      default: this.animIdle(t, P);
    }
  }

  /* ================= IDLE & MOVEMENT ================= */
  animIdle(t, P) {
    const breathe = Math.sin(t * 2.2) * 0.03;
    const sway    = Math.sin(t * 1.1) * 0.02;

    if (P.body) P.body.position.y = breathe;
    if (P.torso) {
      P.torso.rotation.x = breathe * 0.5;
      P.torso.rotation.y = sway;
    }

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

    if (P.legL) P.legL.rotation.z =  Math.sin(t * 1.5) * 0.02;
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
    if (P.armR) P.armR.rotation.x =  s * 0.45;
    if (P.armL && P.armL.userData.fore) P.armL.userData.fore.rotation.x = -0.3;
    if (P.armR && P.armR.userData.fore) P.armR.userData.fore.rotation.x = -0.3;

    if (P.torso) {
      P.torso.rotation.y = s * 0.08;
      P.torso.rotation.x = 0.05;
    }
    /* kepala kini ANAK TORSE → otomatis ikut condong bersama badan (terkunci).
       Cukup tambah gelengan halus (rotation.y); jangan set rotation.x lagi
       agar tidak miring ganda. */
    if (P.head) { P.head.rotation.y = -s * 0.05; }
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
    /* kepala ANAK TORSE → otomatis ikut condong 0.3 bersama badan (terkunci),
       tidak perlu set head.rotation.x (dulu 0.28 → miring ganda) */
    if (P.body)  P.body.position.y = Math.abs(Math.sin(t * f)) * 0.09;
  }

  // JUMP — pose statis 1 frame di udara (kaki tertekuk, lengan menjaga
  // keseimbangan), seperti versi lama. Tidak dianimasikan antar-frame;
  // pergerakan naik-turun ditangani fisika, jadi body.position.y tidak diubah.
  animJump(p, P) {
    if (P.legL) { P.legL.rotation.x = 0.45; if (P.legL.userData.shin) P.legL.userData.shin.rotation.x = 0.5; }
    if (P.legR) { P.legR.rotation.x = -0.25; if (P.legR.userData.shin) P.legR.userData.shin.rotation.x = 0.35; }
    if (P.armL) { P.armL.rotation.x = -0.6; if (P.armL.userData.fore) P.armL.userData.fore.rotation.x = -0.4; }
    if (P.armR) { P.armR.rotation.x = -0.3; if (P.armR.userData.fore) P.armR.userData.fore.rotation.x = -0.4; }
    if (P.torso) P.torso.rotation.x = 0.08;
    if (P.head) P.head.rotation.x = 0.05;
  }

  // DODGE/DASH — condong cepat ke depan seperti melesat (bukan roll/berguling).
  // Lengan tersapu ke belakang, kaki lunge. Kepala ANAK TORSE sehingga otomatis
  // ikut condong bersama badan (tidak di-set lagi agar tidak miring ganda).
  animDodge(p, P) {
    const k = this.easeOut(this.clamp(p / 0.3, 0, 1));   // condong cepat di awal
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
    if (P.head)  P.head.rotation.x = -0.1;
  }

  animDeath(p, P) {
    if (!P.body) return;
    const fall = this.easeIn(this.clamp(p * 1.5, 0, 1));

    P.body.rotation.z = fall * Math.PI / 2;
    P.body.position.y = -fall * 0.65;

    if (P.armL) P.armL.rotation.z =  0.5 * fall;
    if (P.armR) P.armR.rotation.z = -0.5 * fall;
    if (P.head) P.head.rotation.z = -0.3 * fall;
  }

  /* ================= COMBAT / ATTACKS ================= */

  // COMBO 1 — Horizontal Slash (tebasan horizontal kanan → kiri)
  animSlashHorizontal(p, P) {
    let armR = { x: 0, y: 0, z: 0 };
    let foreX = 0;
    let torsoY = 0;

    if (p < 0.2) {                     // windup
      const k = this.easeOutBack(p / 0.2);
      armR = { x: -0.6, y: 1.2 * k, z: 0.3 * k };
      torsoY = 0.4 * k;
      foreX = -0.5 * k;
    } else if (p < 0.5) {              // slash
      const k = this.easeIn((p - 0.2) / 0.3);
      armR = { x: -0.6 - k * 0.3, y: 1.2 - k * 2.8, z: 0.3 - k * 0.5 };
      torsoY = 0.4 - k * 1.0;
      foreX = -0.5 + k * 0.3;
    } else {                           // recover
      const k = this.easeOut((p - 0.5) / 0.5);
      armR = { x: -0.9 * (1 - k), y: -1.6 * (1 - k), z: -0.2 * (1 - k) };
      torsoY = -0.6 * (1 - k);
      foreX = -0.2 * (1 - k);
    }

    if (P.armR) {
      P.armR.rotation.set(armR.x, armR.y, armR.z);
      if (P.armR.userData.fore) P.armR.userData.fore.rotation.x = foreX;
    }
    if (P.torso) P.torso.rotation.y = torsoY;
    if (P.head)  P.head.rotation.y = torsoY * 0.5;

    if (P.legL) P.legL.rotation.x = 0.15;
    if (P.legR) P.legR.rotation.x = -0.10;
    if (P.body) P.body.position.y = Math.sin(p * Math.PI) * 0.03;
  }

  // COMBO 2 — Uppercut Slash (tebasan dari bawah ke atas)
  animUppercutSlash(p, P) {
    let armR = { x: 0, y: 0, z: 0 };
    let foreX = 0;
    let torsoX = 0;

    if (p < 0.25) {
      const k = this.easeOutBack(p / 0.25);
      armR = { x: 0.8 * k, y: 0, z: -0.4 * k };
      torsoX = 0.2 * k;
      foreX = -0.8 * k;
    } else if (p < 0.55) {
      const k = this.easeIn((p - 0.25) / 0.3);
      armR = { x: 0.8 - k * 2.8, y: 0, z: -0.4 + k * 0.6 };
      torsoX = 0.2 - k * 0.5;
      foreX = -0.8 + k * 0.6;
    } else {
      const k = this.easeOut((p - 0.55) / 0.45);
      armR = { x: -2.0 * (1 - k), y: 0, z: 0.2 * (1 - k) };
      torsoX = -0.3 * (1 - k);
      foreX = -0.2 * (1 - k);
    }

    if (P.armR) {
      P.armR.rotation.set(armR.x, armR.y, armR.z);
      if (P.armR.userData.fore) P.armR.userData.fore.rotation.x = foreX;
    }
    if (P.torso) P.torso.rotation.x = torsoX;
    if (P.body)  P.body.position.y = Math.sin(p * Math.PI) * 0.06;

    if (P.legL) P.legL.rotation.x = 0.2;
    if (P.legR) P.legR.rotation.x = -0.15;
  }

  // COMBO 3 — Thrust (tusukan lurus ke depan)
  animThrust(p, P) {
    let armR = { x: 0, y: 0, z: 0 };
    let foreX = 0;
    let torsoX = 0;
    let bodyZ = 0;

    if (p < 0.3) {
      const k = this.easeOutBack(p / 0.3);
      armR = { x: -1.2 * k, y: 0.3 * k, z: 0 };
      foreX = -1.5 * k;
      torsoX = -0.15 * k;
    } else if (p < 0.5) {
      const k = this.easeIn((p - 0.3) / 0.2);
      armR = { x: -1.2 + k * 1.0, y: 0.3 - k * 0.3, z: 0 };
      foreX = -1.5 + k * 1.5;
      torsoX = -0.15 + k * 0.35;
      bodyZ = k * 0.3;
    } else {
      const k = this.easeOut((p - 0.5) / 0.5);
      armR = { x: -0.2 * (1 - k), y: 0, z: 0 };
      foreX = 0;
      torsoX = 0.2 * (1 - k);
      bodyZ = 0.3 * (1 - k);
    }

    if (P.armR) {
      P.armR.rotation.set(armR.x, armR.y, armR.z);
      if (P.armR.userData.fore) P.armR.userData.fore.rotation.x = foreX;
    }
    if (P.torso) P.torso.rotation.x = torsoX;
    if (P.body)  P.body.position.z = bodyZ;
    if (P.head)  P.head.rotation.x = torsoX * 0.5;

    const lunge = (p > 0.3 && p < 0.7) ? 1 : 0;
    if (P.legL) P.legL.rotation.x = 0.3 * lunge;
    if (P.legR) P.legR.rotation.x = -0.2 * lunge;
  }

  // COMBO 4 — Spin Attack (serangan berputar 360°)
  animSpinAttack(p, P) {
    if (!P.body) return;
    const spin = this.easeInOut(p) * Math.PI * 2;
    P.body.rotation.y = spin;

    const spread = Math.sin(p * Math.PI);
    if (P.armR) {
      P.armR.rotation.set(-1.4, 0, 0.9 * spread);
      if (P.armR.userData.fore) P.armR.userData.fore.rotation.x = -0.3;
    }
    if (P.armL) {
      P.armL.rotation.set(-1.4, 0, -0.9 * spread);
      if (P.armL.userData.fore) P.armL.userData.fore.rotation.x = -0.3;
    }

    if (P.torso) P.torso.rotation.x = 0.1;
    if (P.body)  P.body.position.y = Math.sin(p * Math.PI) * 0.08;
    if (P.legL)  P.legL.rotation.x = 0.1;
    if (P.legR)  P.legR.rotation.x = -0.1;
  }

  // COMBO 5 — Heavy Cleave (tebasan berat dari atas ke bawah)
  animHeavyCleave(p, P) {
    let armR = { x: 0, y: 0, z: 0 };
    let foreX = 0;
    let torsoX = 0;

    if (p < 0.35) {
      const k = this.easeOutBack(p / 0.35);
      armR = { x: -2.8 * k, y: 0, z: -0.3 * k };
      foreX = -0.5 * k;
      torsoX = -0.3 * k;
    } else if (p < 0.6) {
      const k = this.easeIn((p - 0.35) / 0.25);
      armR = { x: -2.8 + k * 3.6, y: 0, z: -0.3 + k * 0.5 };
      foreX = -0.5 + k * 0.5;
      torsoX = -0.3 + k * 0.7;
    } else {
      const k = this.easeOut((p - 0.6) / 0.4);
      armR = { x: 0.8 * (1 - k), y: 0, z: 0.2 * (1 - k) };
      foreX = 0;
      torsoX = 0.4 * (1 - k);
    }

    if (P.armR) {
      P.armR.rotation.set(armR.x, armR.y, armR.z);
      if (P.armR.userData.fore) P.armR.userData.fore.rotation.x = foreX;
    }
    if (P.torso) P.torso.rotation.x = torsoX;
    if (P.head)  P.head.rotation.x = torsoX * 0.5;

    if (P.body) {
      P.body.position.y = (p > 0.55 && p < 0.7)
        ? -0.05
        : Math.sin(p * Math.PI) * 0.05;
    }

    if (P.legL) P.legL.rotation.x = 0.25;
    if (P.legR) P.legR.rotation.x = -0.2;
  }

  /* ================= SKILLS ================= */

  // SKILL: FIREBALL — charging bola api lalu dilempar
  animFireball(p, P) {
    let armR = { x: 0, y: 0, z: 0 };
    let armL = { x: 0, y: 0, z: 0 };
    let torsoX = 0;

    if (p < 0.4) {
      const k = this.easeOut(p / 0.4);
      armR = { x: -0.8 * k, y: -0.3 * k, z: -0.2 * k };
      armL = { x: -0.8 * k, y:  0.3 * k, z:  0.2 * k };
      torsoX = 0.1 * k;
      if (P.armR && P.armR.userData.fore) P.armR.userData.fore.rotation.x = -0.8 * k;
      if (P.armL && P.armL.userData.fore) P.armL.userData.fore.rotation.x = -0.8 * k;
    } else if (p < 0.6) {
      const shake = Math.sin(p * 60) * 0.03;
      armR = { x: -0.8 + shake, y: -0.3, z: -0.2 };
      armL = { x: -0.8 - shake, y:  0.3, z:  0.2 };
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
    if (P.head)  P.head.rotation.x = torsoX * 0.5;
    if (P.body)  P.body.position.y = Math.sin(p * Math.PI) * 0.03;
  }

  // SKILL: DASH — melesat cepat ke depan
  animDash(p, P) {
    const lean = Math.sin(p * Math.PI);

    if (P.torso) P.torso.rotation.x = 0.5 * lean;
    if (P.head)  P.head.rotation.x = -0.3 * lean;

    if (P.armL) {
      P.armL.rotation.x = 0.8 * lean;
      if (P.armL.userData.fore) P.armL.userData.fore.rotation.x = -0.5 * lean;
    }
    if (P.armR) {
      P.armR.rotation.x = 0.8 * lean;
      if (P.armR.userData.fore) P.armR.userData.fore.rotation.x = -0.5 * lean;
    }

    if (P.legL) P.legL.rotation.x = -0.3 * lean;
    if (P.legR) P.legR.rotation.x =  0.5 * lean;
    if (P.body) P.body.position.y = lean * 0.05;
  }

  // SKILL: HEAL — mengangkat tangan, aura penyembuhan
  animHeal(p, P) {
    let armR = { x: 0, y: 0, z: 0 };
    let armL = { x: 0, y: 0, z: 0 };
    let torsoX = 0;
    let headX = 0;

    if (p < 0.3) {
      const k = this.easeOut(p / 0.3);
      armR = { x: -1.8 * k, y:  0.3 * k, z: -0.3 * k };
      armL = { x: -1.8 * k, y: -0.3 * k, z:  0.3 * k };
      torsoX = -0.1 * k;
      headX = -0.2 * k;
    } else if (p < 0.8) {
      const glow = Math.sin((p - 0.3) * 12) * 0.05;
      armR = { x: -1.8 + glow, y:  0.3, z: -0.3 };
      armL = { x: -1.8 - glow, y: -0.3, z:  0.3 };
      torsoX = -0.1;
      headX = -0.2;
    } else {
      const k = this.easeOut((p - 0.8) / 0.2);
      armR = { x: -1.8 * (1 - k), y:  0.3 * (1 - k), z: -0.3 * (1 - k) };
      armL = { x: -1.8 * (1 - k), y: -0.3 * (1 - k), z:  0.3 * (1 - k) };
      torsoX = -0.1 * (1 - k);
      headX = -0.2 * (1 - k);
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
    if (P.head)  P.head.rotation.x = headX;
    if (P.body)  P.body.position.y = Math.sin(p * Math.PI) * 0.05;
  }

  // SKILL: SHIELD BASH — hantaman perisai dengan tangan kiri
  animShieldBash(p, P) {
    let armL = { x: 0, y: 0, z: 0 };
    let armR = { x: 0, y: 0, z: 0 };
    let torsoY = 0;

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
    if (P.head)  P.head.rotation.y = torsoY * 0.5;
    if (P.body)  P.body.position.y = Math.sin(p * Math.PI) * 0.04;

    if (P.legL) P.legL.rotation.x = 0.2;
    if (P.legR) P.legR.rotation.x = -0.15;
  }

  // SKILL: WHIRLWIND — serangan putar area (2 putaran)
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
    if (P.body)  P.body.position.y = spread * 0.1;
    if (P.legL)  P.legL.rotation.x = 0.15;
    if (P.legR)  P.legR.rotation.x = -0.15;
  }

  // SKILL: THUNDER — memanggil petir dari langit
  animThunder(p, P) {
    let armR = { x: 0, y: 0, z: 0 };
    let armL = { x: 0, y: 0, z: 0 };
    let torsoX = 0;

    if (p < 0.35) {
      const k = this.easeOutBack(p / 0.35);
      armR = { x: -2.5 * k, y:  0.2 * k, z: -0.2 * k };
      armL = { x: -2.5 * k, y: -0.2 * k, z:  0.2 * k };
      torsoX = -0.2 * k;
    } else if (p < 0.55) {
      const shake = Math.sin(p * 80) * 0.04;
      armR = { x: -2.5 + shake, y:  0.2, z: -0.2 };
      armL = { x: -2.5 - shake, y: -0.2, z:  0.2 };
      torsoX = -0.2;
    } else {
      const k = this.easeIn((p - 0.55) / 0.45);
      armR = { x: -2.5 + k * 3.0, y: 0.2 - k * 0.2, z: -0.2 };
      armL = { x: -2.5 + k * 3.0, y: -0.2 + k * 0.2, z: 0.2 };
      torsoX = -0.2 + k * 0.6;
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
    if (P.head)  P.head.rotation.x = torsoX * 0.5;

    if (P.body) {
      P.body.position.y = Math.sin(p * Math.PI) * 0.08;
      if (p > 0.55) P.body.position.y -= 0.03;
    }

    if (P.legL) P.legL.rotation.x = 0.2;
    if (P.legR) P.legR.rotation.x = -0.2;
  }

  /* ================= MENUNGGANGI (RIDING) =================
     Konvensi rig (dipelajari dari player.js mkLeg/mkArm):
       - legL/legR: pivot di pinggul. rotation.x negatif = paha terangkat ke
         DEPAN (arah dada). rotation.z membuka kaki ke samping (mengangkang).
         userData.shin: rotation.x positif = betis menekuk ke BELAKANG bawah.
       - armL/armR: pivot di bahu. rotation.x negatif = lengan terangkat ke
         DEPAN. userData.fore: rotation.x negatif = siku menekuk (tangan naik).
       - torso: rotation.x positif = membungkuk ke depan.
       - body.position.y: geser seluruh badan naik/turun (dipakai untuk lompatan).
     Pose duduk = kedua paha terangkat ke depan (-1.3) & sedikit mengangkang,
     betis menekuk turun (shin +1.3), kedua lengan menjulur ke DEPAN memegang
     tali kendali (arm x -0.9, fore -0.35). */

  // Pose dasar duduk di atas mount; dipakai idle & move sebagai basis.
  _rideSeat(P, opt) {
    opt = opt || {};
    const bodyY   = opt.bodyY   != null ? opt.bodyY   : -0.18;
    const torsoX  = opt.torsoX  != null ? opt.torsoX  : 0.10;
    const armX    = opt.armX    != null ? opt.armX    : -0.95;  // lengan ke depan
    const foreX   = opt.foreX   != null ? opt.foreX   : -0.35;  // siku sedikit menekuk
    const thighX  = opt.thighX  != null ? opt.thighX  : -1.30;  // paha ke depan
    const thighZ  = opt.thighZ  != null ? opt.thighZ  : 0.42;   // mengangkang
    const shinX   = opt.shinX   != null ? opt.shinX   : 1.30;   // betis menekuk turun

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
      // Fase 1: menekuk lutut lalu melompat naik (badan terangkat)
      const k = this.easeOut(p / 0.45);
      const bodyY = this.lerp(-0.15, 0.55, k);      // meloncat ke atas
      const torsoX = this.lerp(0.30, 0.14, k);      // condong ke depan saat naik
      // paha berayun dari agak lurus ke terangkat penuh
      const thighX = this.lerp(-0.20, -1.20, k);
      const thighZ = this.lerp(0.05, 0.40, k);
      const shinX  = this.lerp(0.30, 1.15, k);
      // tangan menjangkau ke depan meraih punggung/tali
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
      // Fase 2: turun & mengendap ke pose duduk final
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

  // DUDUK DIAM di atas mount: napas halus, tangan ke depan memegang kendali.
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

  // BERGERAK / berlari di atas mount: memantul mengikuti derap + tangan mengayun.
  animRideMove(t, P) {
    const f = 8.0;
    const bounce = Math.abs(Math.sin(t * f)) * 0.09;   // pantulan derap
    const nod    = Math.sin(t * f) * 0.05;             // anggukan badan
    const sway   = Math.sin(t * f * 0.5) * 0.03;
    this._rideSeat(P, {
      bodyY:  -0.18 + bounce,
      torsoX: 0.16 + nod,
      torsoY: sway,
      headX:  -0.08,
      headY:  Math.sin(t * 1.2) * 0.05,
      armX:   -0.92 + nod * 0.6,     // tangan mengayun halus mengikuti derap
      foreX:  -0.40 + nod * 0.2,
      thighX: -1.32,
      thighZ: 0.44,
      shinX:  1.34
    });
  }

  // TURUN: mengayun kaki ke samping lalu meluncur turun & mendarat.
  animRideDismount(p, P) {
    if (p < 0.5) {
      // Fase 1: angkat badan sedikit & ayunkan kaki keluar dari sadel
      const k = this.easeIn(p / 0.5);
      const bodyY  = this.lerp(-0.18, 0.30, Math.sin(k * Math.PI));
      const thighX = this.lerp(-1.30, -0.30, k);   // paha turun mendekati lurus
      const thighZ = this.lerp(0.42, 0.20, k);
      const shinX  = this.lerp(1.30, 0.50, k);
      const armX   = this.lerp(-0.95, -0.30, k);   // lepas kendali, lengan turun
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
      // Fase 2: mendarat di tanah, lutut menekuk meredam lalu tegak
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

  /* ================= SEQUENCE (demo combo) ================= */
  animSequence(dt, P) {
    this.sequenceTimer += dt;
    const combos = ['combo1', 'combo2', 'combo3', 'combo4', 'combo5'];
    const idx = Math.floor(this.sequenceTimer / 1) % 5;
    const localT = this.sequenceTimer % 1;
    const name = combos[idx];
    const dur = this.durations[name] || 0.5;
    const p = this.clamp(localT / dur, 0, 1);

    switch (name) {
      case 'combo1': this.animSlashHorizontal(p, P); break;
      case 'combo2': this.animUppercutSlash(p, P); break;
      case 'combo3': this.animThrust(p, P); break;
      case 'combo4': this.animSpinAttack(p, P); break;
      case 'combo5': this.animHeavyCleave(p, P); break;
    }
  }

  setAnimDirect(name, t) {
    const P = this.parts;
    if (!P) return;
    const p = t % 1;
    switch (name) {
      case 'combo1': this.animSlashHorizontal(p, P); break;
      case 'combo2': this.animUppercutSlash(p, P); break;
      case 'combo3': this.animThrust(p, P); break;
      case 'combo4': this.animSpinAttack(p, P); break;
      case 'combo5': this.animHeavyCleave(p, P); break;
    }
  }
}

window.PlayerAnimator = PlayerAnimator;
window.CharacterAnimator = PlayerAnimator; // backwards compatibility
if (typeof module !== 'undefined') module.exports = PlayerAnimator;