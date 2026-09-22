'use strict';
/* =================================================================
   FORECRAFT 3D - ENVIRONMENT: MERPATI VOXEL (VOXEL PIGEON)
   File: js/environment/env_pigeon.js
   Model & Animasi diadaptasi dari NEW MODEL/Pigeon.html
   Kecerdasan dinamis:
   - Hinggap 1-3 ekor di tanah, atas bangunan, atas pohon, atas ore
   - Berpindah dinamis: jalan/matuk di permukaan, terbang sedikit turun ke tanah,
     atau terbang naik ke pohon/rumah/kastil/ore
   - Sensitif terhadap pemain: saat didekati (< 4.8m), langsung terbang (TAKEOFF)
     untuk pindah ke tempat lain atau terbang tinggi menghilang ke langit
   ================================================================= */

const Env_Pigeon = (() => {
  const damp = (typeof THREE !== 'undefined' && THREE.MathUtils) ? THREE.MathUtils.damp : (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
  const angDamp = (current, target, lambda, dt) => {
    let diff = (target - current) % (Math.PI * 2);
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return current + diff * (1 - Math.exp(-lambda * dt));
  };
  const clamp = (typeof THREE !== 'undefined' && THREE.MathUtils) ? THREE.MathUtils.clamp : (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (typeof THREE !== 'undefined' && THREE.MathUtils) ? THREE.MathUtils.lerp : (a, b, t) => a + (b - a) * t;
  const smoothstep = (typeof THREE !== 'undefined' && THREE.MathUtils) ? THREE.MathUtils.smoothstep : (x, min, max) => {
    if (x <= min) return 0;
    if (x >= max) return 1;
    x = (x - min) / (max - min);
    return x * x * (3 - 2 * x);
  };
  const rand = (a, b) => a + Math.random() * (b - a);

  const PAL = {
    white: {
      body: 0xf4f4f1, belly: 0xfbfaf7, back: 0xe7e7e1, wing: 0xeceae4, wingTip: 0xdad8d0,
      bar: 0xb7b5ad, neck: 0xdce8dd, beak: 0xa89a8e, cere: 0xffffff, foot: 0xd46a5c,
      iris: 0xe87830, thigh: 0xf0efe9
    },
    black: {
      body: 0x202027, belly: 0x17171d, back: 0x292932, wing: 0x1b1b22, wingTip: 0x111116,
      bar: 0x34343f, neck: 0x2c4f40, beak: 0x5a5a63, cere: 0xb9b9c2, foot: 0x8b4a40,
      iris: 0xff8838, thigh: 0x1d1d24
    },
    brown: {
      body: 0x9c6b3e, belly: 0xab7c4e, back: 0x7e5430, wing: 0x87592f, wingTip: 0x6b4526,
      bar: 0x4d3220, neck: 0x64785a, beak: 0xb09060, cere: 0xe9e0d6, foot: 0xc05a48,
      iris: 0xe87830, thigh: 0x96683d
    }
  };

  function makeMats(p) {
    const M = c => new THREE.MeshLambertMaterial({ color: c });
    return {
      body: M(p.body), belly: M(p.belly), back: M(p.back), wing: M(p.wing), wingTip: M(p.wingTip),
      bar: M(p.bar), neck: M(p.neck), beak: M(p.beak), cere: M(p.cere), foot: M(p.foot),
      iris: M(p.iris), pupil: M(0x141414), thigh: M(p.thigh)
    };
  }

  function vox(w, h, d, mat, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return m;
  }

  class Pigeon {
    constructor(palKey = 'white', initPos = null) {
      this.palKey = palKey;
      this.seed = rand(0, 100);
      const m = makeMats(PAL[palKey] || PAL.white);

      /* Hierarki Model */
      const root = new THREE.Group();
      root.name = 'VoxelPigeon';
      root.scale.setScalar(0.065);
      this.root = root;

      const bodyPivot = new THREE.Group();
      bodyPivot.position.set(0, 3.7, 0);
      root.add(bodyPivot);
      this.bodyPivot = bodyPivot;

      const body = new THREE.Group();
      body.position.set(0, -3.7, 0);
      bodyPivot.add(body);

      /* Badan */
      body.add(vox(4.0, 3.2, 5.2, m.belly, 0, 4.70, -0.20));
      body.add(vox(4.2, 3.5, 2.6, m.body,  0, 6.35,  1.25));
      body.add(vox(4.3, 2.7, 3.6, m.body,  0, 6.20, -1.10));
      body.add(vox(3.6, 1.4, 4.6, m.back,  0, 7.80, -0.90));
      body.add(vox(2.9, 2.1, 1.9, m.back,  0, 7.15, -2.75));
      body.add(vox(2.3, 1.8, 2.2, m.neck,  0, 8.15,  1.45));

      /* Kepala */
      const head = new THREE.Group();
      head.position.set(0, 8.35, 1.5);
      body.add(head);
      this.head = head;
      this.headBase = head.position.clone();
      head.add(vox(2.90, 2.70, 2.90, m.body,  0, 1.15, 0.45));
      head.add(vox(2.50, 0.90, 2.30, m.body,  0, 2.55, 0.35));
      head.add(vox(2.35, 1.50, 1.10, m.neck,  0, 0.15, -0.95));
      head.add(vox(1.50, 1.00, 0.80, m.cere,  0, 1.75, 1.95));
      head.add(vox(1.00, 0.65, 1.70, m.beak,  0, 1.15, 2.65));
      head.add(vox(0.85, 0.45, 1.25, m.beak,  0, 0.60, 2.35));
      for (const s of [-1, 1]) {
        head.add(vox(0.28, 0.80, 0.80, m.iris,  s * 1.42, 1.50, 0.85));
        head.add(vox(0.16, 0.45, 0.45, m.pupil, s * 1.56, 1.50, 0.95));
      }

      /* Ekor */
      const tail = new THREE.Group();
      tail.position.set(0, 6.7, -3.0);
      body.add(tail);
      this.tail = tail;
      tail.add(vox(2.6, 1.3, 1.5, m.back, 0, 0.15, -0.45));
      const feathers = [];
      const tf = (dir, ry, w, h, d, zOff) => {
        const g = new THREE.Group();
        g.position.set(dir * 0.25, -0.25, -0.4);
        g.rotation.y = ry;
        g.add(vox(w, h, d, m.wingTip, dir * 0.75, 0, zOff));
        tail.add(g);
        feathers.push({ g, base: ry });
      };
      tf( 0,  0.00, 1.30, 0.40, 3.8, -2.0);
      tf( 1,  0.11, 1.05, 0.35, 3.3, -1.7);
      tf(-1, -0.11, 1.05, 0.35, 3.3, -1.7);
      tf( 1,  0.24, 0.75, 0.30, 2.6, -1.3);
      tf(-1, -0.24, 0.75, 0.30, 2.6, -1.3);
      this.tailFeathers = feathers;

      /* Sayap */
      const mkWing = side => {
        const shoulder = new THREE.Group();
        shoulder.position.set(side * 2.15, 7.3, 0.35);
        body.add(shoulder);
        shoulder.add(vox(1.15, 1.30, 2.40, m.back, 0, -0.45, -0.50));
        shoulder.add(vox(1.00, 2.50, 1.50, m.wing, 0, -1.50, -0.45));
        const forearm = new THREE.Group();
        forearm.position.set(0, -2.55, -0.6);
        shoulder.add(forearm);
        forearm.add(vox(0.85, 2.20, 1.30, m.wing, 0, -1.05, -0.30));
        forearm.add(vox(0.92, 0.50, 1.34, m.bar,  0, -0.60, -0.30));
        forearm.add(vox(0.92, 0.45, 1.34, m.bar,  0, -1.45, -0.30));
        const hand = new THREE.Group();
        hand.position.set(0, -2.1, -0.5);
        forearm.add(hand);
        hand.add(vox(0.85, 0.45, 1.90, m.wing,    0,  0.05, -0.85));
        hand.add(vox(0.60, 0.34, 2.90, m.wingTip, 0,  0.00, -1.55));
        const p2 = vox(0.50, 0.30, 2.50, m.wingTip, side * 0.42, -0.04, -1.35);
        p2.rotation.y = side * 0.07;
        hand.add(p2);
        const p3 = vox(0.42, 0.26, 2.00, m.wingTip, side * 0.80, -0.08, -1.10);
        p3.rotation.y = side * 0.14;
        hand.add(p3);
        return { shoulder, forearm, hand };
      };
      this.wingR = mkWing( 1);
      this.wingL = mkWing(-1);

      /* Kaki */
      const mkLeg = side => {
        const thigh = new THREE.Group();
        thigh.position.set(side * 1.0, 3.7, 0.15);
        root.add(thigh);
        thigh.add(vox(0.85, 1.60, 0.85, m.thigh, 0, -0.75, 0));
        const shin = new THREE.Group();
        shin.position.set(0, -1.5, 0);
        thigh.add(shin);
        shin.add(vox(0.38, 1.90, 0.38, m.foot, 0, -0.95, 0));
        const foot = new THREE.Group();
        foot.position.set(0, -1.9, 0);
        shin.add(foot);
        foot.add(vox(0.55, 0.26, 0.60, m.foot, 0, -0.13, 0.15));
        const toe = (x, ry, len) => {
          const t = vox(0.16, 0.18, len, m.foot, x, -0.16, 0.32 + len / 2);
          t.rotation.y = ry;
          foot.add(t);
        };
        toe(0, 0, 0.8);
        toe(0.28, 0.5, 0.65);
        toe(-0.28, -0.5, 0.65);
        foot.add(vox(0.16, 0.18, 0.40, m.foot, 0, -0.16, -0.30));
        return { thigh, shin, foot };
      };
      this.legR = mkLeg( 1);
      this.legL = mkLeg(-1);

      /* Shadow blob */
      const shadowGeo = new THREE.CircleGeometry(0.28, 16);
      const shadowMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.22, depthWrite: false });
      this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
      this.shadow.rotation.x = -Math.PI / 2;

      /* State variables */
      this.pos = initPos ? initPos.clone() : new THREE.Vector3();
      this.surfaceY = this.pos.y;
      this.state = 'IDLE';
      this.stateT = 0;
      this.dur = rand(3.0, 6.0);
      this.heading = rand(0, Math.PI * 2);
      this.headingTarget = this.heading;
      this.headTimer = rand(1, 2.5);

      this.flightTarget = null;
      this.flightStart = new THREE.Vector3();
      this.flightDur = 3.0;
      this.flightT = 0;
      this.flightPeakH = 4.0;
      this.flyAway = false;
      this.despawned = false;

      this.params = {
        speed: 0, alt: 0, pitch: 0, roll: 0,
        flapAmp: 0.05, legSwing: 0, crouch: 0, thighBase: 0, shinBase: 0.1, tail: -0.03
      };
      this.flapFreq = 0;
      this.flapPhase = rand(0, 6.28);
      this.legPhase = 0;
      this.peckTimer = rand(0.5, 2.0);
      this.pecking = false;
      this.peckT = 0;
      this.peckDur = 1;
      this.tailFlick = 0;
      this.landDip = 0;
      this.perchType = 'ground';
    }

    setPerch(pos, type = 'ground') {
      this.pos.copy(pos);
      this.surfaceY = pos.y;
      this.perchType = type;
      this.root.position.copy(pos);
      this.shadow.position.set(pos.x, pos.y + 0.015, pos.z);
    }
    /* Burung yang baru hinggap di pohon saat malam langsung tidur. */
    restIfNight() {
      const nightNow = (typeof Weather !== 'undefined') ? (Weather.nightF > 0.5) : false;
      if (nightNow && this.perchType === 'tree' && this.state !== 'SLEEP') this.sleepOnTree();
    }

    /* ---------- TIDUR MALAM DI POHON ----------
       Dipanggil manager saat malam tiba: burung yang sedang hinggap di pohon
       (perchType tree) masuk state SLEEP - diam menunduk, tidak jalan/matuk/
       pindah, dan tidak kabur saat pemain mendekat. Terbangun otomatis saat
       pagi (wakeUp) atau saat pohonnya dihancurkan (flushFromTree). */
    sleepOnTree() {
      if (this.state === 'TAKEOFF' || this.state === 'FLY') return false;
      if (this.perchType !== 'tree') return false;
      if (this.sleeping) return true;
      this.sleeping = true;
      this.state = 'SLEEP';
      this.stateT = 0;
      this.pecking = false;
      return true;
    }
    wakeUp(flyAway) {
      if (!this.sleeping && this.state !== 'SLEEP') return;
      this.sleeping = false;
      if (flyAway) {
        this.flyAway = true;
        this.flightStart.copy(this.pos);
        this.flightTarget = new THREE.Vector3(this.pos.x, this.pos.y + rand(25, 40), this.pos.z);
        this.flightDur = 4.0;
        this.flightPeakH = this.pos.y + 35;
        this.state = 'TAKEOFF';
        this.stateT = 0;
      } else {
        this.state = 'IDLE';
        this.stateT = 0;
        this.dur = rand(2.0, 5.0);
      }
    }
    /* Pohon tempat hinggap dihancurkan: langsung terbang kabur ke hinggap
       baru (atau ke langit bila tidak ada), tanpa peduli malam/siang. */
    flushFromTree() {
      this.sleeping = false;
      if (this.state === 'TAKEOFF' || this.state === 'FLY') return;
      const perch = Env_Pigeon.findPerch(this.pos.x, this.pos.z, 8, 26);
      if (perch) {
        this.takeOffTo(perch.pos, perch.type, true);
      } else {
        this.flyAway = true;
        this.flightStart.copy(this.pos);
        this.flightTarget = new THREE.Vector3(this.pos.x, this.pos.y + 30, this.pos.z);
        this.flightDur = 4.0;
        this.flightPeakH = this.pos.y + 30;
        this.state = 'TAKEOFF';
        this.stateT = 0;
      }
    }

    takeOffTo(targetPos, targetType = 'ground', isEscape = false) {
      this.flightStart.copy(this.pos);
      this.flightTarget = targetPos.clone();
      this.nextPerchType = targetType;
      this.isEscape = isEscape;
      this.flyAway = false;

      const dist = Math.hypot(targetPos.x - this.pos.x, targetPos.z - this.pos.z);
      this.flightDur = Math.max(1.8, Math.min(6.5, dist * 0.22));
      this.flightPeakH = Math.max(this.pos.y, targetPos.y) + Math.max(2.5, dist * 0.25);
      this.state = 'TAKEOFF';
      this.stateT = 0;
    }

    spookEscape(playerPos) {
      if (this.state === 'TAKEOFF' || this.state === 'FLY') return;
      if (Math.random() < 0.45) {
        this.flyAway = true;
        const awayAngle = Math.atan2(this.pos.x - playerPos.x, this.pos.z - playerPos.z) + rand(-0.3, 0.3);
        const flyDist = rand(35, 55);
        this.flightStart.copy(this.pos);
        this.flightTarget = new THREE.Vector3(
          this.pos.x + Math.sin(awayAngle) * flyDist,
          this.pos.y + rand(25, 40),
          this.pos.z + Math.cos(awayAngle) * flyDist
        );
        this.flightDur = 4.5;
        this.flightPeakH = this.flightTarget.y;
        this.state = 'TAKEOFF';
        this.stateT = 0;
      } else {
        const perch = Env_Pigeon.findPerch(this.pos.x, this.pos.z, 14, 28, playerPos);
        if (perch) {
          this.takeOffTo(perch.pos, perch.type, true);
        } else {
          this.flyAway = true;
          this.flightStart.copy(this.pos);
          this.flightTarget = new THREE.Vector3(this.pos.x, this.pos.y + 35, this.pos.z);
          this.flightDur = 4.0;
          this.flightPeakH = this.pos.y + 35;
          this.state = 'TAKEOFF';
          this.stateT = 0;
        }
      }
    }

    update(dt, t, playerPos) {
      if (this.despawned) return;
      this.stateT += dt;
      const P = this.params;
      let tSpeed = 0, tAlt = 0, tPitch = 0, tRoll = 0, tAmp = 0.05, tFreq = 0.35;
      let tLeg = 0, tCrouch = 0, tThigh = 0, tShin = 0.12, tTail = -0.03;
      let headPitch = 0, headYaw = 0, headTilt = 0, headThrust = 0, headLift = 0;
      let bob = 0, walkPitch = 0, spread = 0.1;

      if (playerPos && !this.sleeping && (this.state === 'IDLE' || this.state === 'WALK')) {
        const dPlayer = Math.hypot(this.pos.x - playerPos.x, this.pos.z - playerPos.z);
        const dyPlayer = Math.abs(this.pos.y - playerPos.y);
        if (dPlayer < 4.8 && dyPlayer < 3.8) {
          this.spookEscape(playerPos);
        }
      }

      switch (this.state) {
        case 'SLEEP': {
          /* tidur: menunduk diam, kaki terlipat, ekor turun, mata "merem"
             (kepala menunduk dalam ke bulu). Tidak jalan/matuk/pindah. */
          tCrouch = 0.55; tThigh = -0.5; tShin = 0.55; tTail = 0.3;
          headPitch = 1.1; headThrust = 0.5;
          tFreq = 0.25; tAmp = 0.03; tAlt = 0;
          bob = Math.sin(t * 1.1 + this.seed) * 0.03;
          break;
        }
        case 'IDLE': {
          if (this.stateT > this.dur) {
            // Burung hanya jalan jika di tanah (ground); jika di pohon/ore/atap, mereka diam atau terbang
            const canWalk = (this.perchType === 'ground');
            const r = Math.random();
            if (canWalk && r < 0.45) {
              this.state = 'WALK';
              this.stateT = 0;
              this.dur = rand(2.5, 5.0);
              this.headingTarget = this.heading + rand(-1.0, 1.0);
            } else {
              const nextPerch = Env_Pigeon.findPerch(this.pos.x, this.pos.z, 8, 22);
              if (nextPerch) {
                this.takeOffTo(nextPerch.pos, nextPerch.type);
              } else {
                this.dur = rand(3.0, 6.0);
                this.stateT = 0;
              }
            }
          }
          tFreq = 0.3; tAmp = 0.05; tAlt = 0;
          headYaw  = Math.sin(t * 0.9 + this.seed) * 0.55;
          headTilt = Math.sin(t * 0.63 + this.seed * 2) * 0.22;
          this.peckTimer -= dt;
          if (!this.pecking && this.peckTimer <= 0) {
            this.pecking = true; this.peckT = 0; this.peckDur = rand(0.85, 1.25);
          }
          if (this.pecking) {
            this.peckT += dt;
            const u = this.peckT / this.peckDur;
            if (u >= 1) {
              this.pecking = false; this.peckTimer = rand(1.2, 3.5);
            } else {
              const p = Math.pow(Math.max(0, Math.sin(u * Math.PI * 4)), 0.9);
              headPitch = p * 1.9; headThrust = p * 0.75;
              headYaw *= (1 - p); headTilt *= (1 - p);
              tPitch = p * 0.14; tTail = -0.03 + p * 0.12;
            }
          }
          if (Math.random() < dt * 0.5) this.tailFlick = 1;
          bob = Math.sin(t * 2.3 + this.seed) * 0.07;
          break;
        }

        case 'WALK': {
          if (this.stateT > this.dur) {
            this.state = 'IDLE';
            this.stateT = 0;
            this.dur = rand(2.5, 6.0);
          }
          tSpeed = 0.6; tLeg = 1; tFreq = 0; tAmp = 0.035; tAlt = 0;
          this.headTimer -= dt;
          if (this.headTimer <= 0) {
            this.headTimer = rand(1.2, 2.8);
            this.headingTarget = this.heading + rand(-1.0, 1.0);
          }
          this.heading = angDamp(this.heading, this.headingTarget, 2.5, dt);
          this.legPhase += dt * P.speed * 14;
          const hb = Math.pow(0.5 + 0.5 * Math.sin(this.legPhase + 1.9), 4);
          headThrust = hb * 0.9; headLift = -hb * 0.12;
          headYaw = Math.sin(t * 0.8 + this.seed) * 0.25 * (1 - hb);
          bob = Math.abs(Math.sin(this.legPhase)) * 0.16 - 0.08;
          walkPitch = Math.sin(this.legPhase) * 0.03;
          tTail = -0.05 + Math.sin(this.legPhase * 0.5) * 0.04;

          const stepX = Math.sin(this.heading) * P.speed * dt;
          const stepZ = Math.cos(this.heading) * P.speed * dt;
          this.pos.x += stepX;
          this.pos.z += stepZ;

          let curSurface = Env_Pigeon.getSurfaceAt(this.pos.x, this.pos.z, this.surfaceY + 1);
          if (Math.abs(curSurface - this.surfaceY) <= 0.35) {
            this.surfaceY = curSurface;
            this.pos.y = curSurface;
          } else {
            // Tepi rintangan/jurang: batalkan langkah dan kembali ke IDLE tanpa berputar-putar
            this.pos.x -= stepX;
            this.pos.z -= stepZ;
            this.state = 'IDLE';
            this.stateT = 0;
            this.dur = rand(2.0, 4.0);
          }
          break;
        }

        case 'TAKEOFF': {
          const u = this.stateT;
          if (u < 0.24) {
            const k = u / 0.24;
            tCrouch = k; tFreq = 6; tAmp = 0.15 + 0.25 * k;
            tThigh = -0.45 * k; tShin = 0.5 * k; tPitch = 0.1 * k; tTail = -0.15 * k;
          } else {
            this.state = 'FLY';
            this.flightT = 0;
          }
          break;
        }

        case 'FLY': {
          this.flightT += dt;
          const u = Math.min(1, this.flightT / this.flightDur);

          if (this.flyAway) {
            const e = u * u;
            this.pos.x = lerp(this.flightStart.x, this.flightTarget.x, u);
            this.pos.z = lerp(this.flightStart.z, this.flightTarget.z, u);
            this.pos.y = lerp(this.flightStart.y, this.flightTarget.y, e);

            const dx = this.flightTarget.x - this.flightStart.x;
            const dz = this.flightTarget.z - this.flightStart.z;
            this.heading = Math.atan2(dx, dz);

            tSpeed = 4.5;
            tFreq = 8.5;
            tAmp = 1.1;
            tPitch = -0.35;
            tRoll = 0;
            tThigh = 0.85; tShin = 0.75; tTail = 0.25; spread = 0.8;

            if (u >= 1 || this.pos.y > 45) {
              this.despawn();
              return;
            }
          } else {
            const eHoriz = smoothstep(u, 0, 1);
            this.pos.x = lerp(this.flightStart.x, this.flightTarget.x, eHoriz);
            this.pos.z = lerp(this.flightStart.z, this.flightTarget.z, eHoriz);

            const arc = Math.sin(u * Math.PI);
            const baseProgY = lerp(this.flightStart.y, this.flightTarget.y, u);
            this.pos.y = Math.max(baseProgY, lerp(baseProgY, this.flightPeakH, arc));

            const fwdDx = this.flightTarget.x - this.pos.x;
            const fwdDz = this.flightTarget.z - this.pos.z;
            const distToTarget = Math.hypot(fwdDx, fwdDz);
            if (distToTarget > 0.45) {
              const targetHead = Math.atan2(fwdDx, fwdDz);
              this.heading = angDamp(this.heading, targetHead, 4.5, dt);
            }

            if (u < 0.7) {
              tSpeed = 3.2;
              tFreq = 7.0 + 0.8 * Math.sin(t * 1.2 + this.seed);
              tAmp = 0.95;
              tPitch = -0.15;
              tRoll = Math.sin(t * 1.5) * 0.15;
              tThigh = 0.85; tShin = 0.75; tTail = 0.15; spread = 0.9;
            } else {
              const flare = (u - 0.7) / 0.3;
              tSpeed = lerp(3.2, 0.8, flare);
              tFreq = lerp(7.0, 4.0, flare);
              tAmp = lerp(0.95, 1.3, flare);
              tPitch = lerp(-0.15, 0.38, flare);
              tThigh = lerp(0.85, -0.15, flare);
              tShin = lerp(0.75, 0.45, flare);
              tTail = 0.35; spread = 0.6;
            }

            if (u >= 1) {
              this.pos.copy(this.flightTarget);
              this.surfaceY = this.flightTarget.y;
              this.perchType = this.nextPerchType || 'ground';
              const nightNow = (typeof Weather !== 'undefined') ? (Weather.nightF > 0.5) : false;
              if (nightNow && this.perchType === 'tree') {
                this.sleepOnTree();
                this.headingTarget = this.heading;
                this.landDip = 0.4;
                this.stateT = 0;
                this.dur = rand(3.0, 7.0);
              }
              this.headingTarget = this.heading;
              this.landDip = 0.4;
              this.state = 'IDLE';
              this.stateT = 0;
              this.dur = rand(3.0, 7.0);
            }
          }
          break;
        }
      }

      P.speed     = damp(P.speed,     tSpeed, 6, dt);
      P.pitch     = damp(P.pitch,     tPitch, 7, dt);
      P.roll      = damp(P.roll,      tRoll,  5, dt);
      P.flapAmp   = damp(P.flapAmp,   tAmp,   6, dt);
      P.crouch    = damp(P.crouch,    tCrouch, 10, dt);
      P.thighBase = damp(P.thighBase, tThigh, 7, dt);
      P.shinBase  = damp(P.shinBase,  tShin,  7, dt);
      P.tail      = damp(P.tail,      tTail,  6, dt);
      P.legSwing  = damp(P.legSwing,  tLeg,   8, dt);
      this.flapFreq = damp(this.flapFreq, tFreq, 5, dt);
      this.flapPhase += this.flapFreq * Math.PI * 2 * dt;
      this.tailFlick = damp(this.tailFlick, 0, 6, dt);
      this.landDip   = damp(this.landDip,   0, 7, dt);

      if (this.state === 'FLY') {
        bob += -Math.sin(this.flapPhase - 0.6) * 0.35 * clamp(P.flapAmp, 0, 1);
      }

      this.root.position.set(this.pos.x, this.pos.y, this.pos.z);
      this.root.rotation.y = this.heading;

      this.bodyPivot.position.y = 3.7 + bob - P.crouch * 0.6 - this.landDip;
      this.bodyPivot.rotation.set(P.pitch + walkPitch, 0, P.roll);

      this.head.rotation.x = clamp(headPitch - P.pitch * 0.6, -0.6, 2.2);
      this.head.rotation.y = headYaw;
      this.head.rotation.z = headTilt;
      this.head.position.set(this.headBase.x, this.headBase.y + headLift, this.headBase.z + headThrust);

      this.tail.rotation.x = P.tail + Math.sin(t * 22) * 0.12 * this.tailFlick;
      for (const f of this.tailFeathers) {
        f.g.rotation.y = f.base * (0.35 + 0.85 * spread);
      }

      const ph = this.flapPhase;
      const s1 = Math.sin(ph), s2 = Math.sin(ph - 1.05), s3 = Math.sin(ph - 1.6);
      const sh = 0.1 + P.flapAmp * (1.02 + 1.18 * s1);
      this.wingR.shoulder.rotation.z =  sh;
      this.wingL.shoulder.rotation.z = -sh;
      this.wingR.shoulder.rotation.x = this.wingL.shoulder.rotation.x = P.flapAmp * 0.25 * (0.5 + 0.5 * s2);
      const fo = 1.12 - P.flapAmp * (0.5 + 0.5 * s2) * 0.95;
      this.wingR.forearm.rotation.x = this.wingL.forearm.rotation.x = fo;
      const ha = 0.5 - P.flapAmp * (0.5 + 0.5 * s3) * 0.65;
      this.wingR.hand.rotation.x = this.wingL.hand.rotation.x = ha;

      const sw = P.legSwing, lp = this.legPhase;
      const tl = Math.sin(lp) * 0.55 * sw;
      this.legL.thigh.rotation.x =  tl + P.thighBase;
      this.legR.thigh.rotation.x = -tl + P.thighBase;
      this.legL.shin.rotation.x = (0.15 + Math.max(0, -Math.sin(lp)) * 0.55) * sw + P.shinBase;
      this.legR.shin.rotation.x = (0.15 + Math.max(0,  Math.sin(lp)) * 0.55) * sw + P.shinBase;
      this.legL.foot.rotation.x = -(this.legL.thigh.rotation.x + this.legL.shin.rotation.x) * 0.55;
      this.legR.foot.rotation.x = -(this.legR.thigh.rotation.x + this.legR.shin.rotation.x) * 0.55;

      let groundFloor = this.pos.y;
      if (this.perchType === 'tree') {
        groundFloor = this.surfaceY;
      } else {
        groundFloor = Env_Pigeon.getSurfaceAt(this.pos.x, this.pos.z, this.pos.y + 0.5);
      }
      const heightAboveGround = Math.max(0, this.pos.y - groundFloor);
      const altN = clamp(heightAboveGround / 4.0, 0, 1);
      this.shadow.position.set(this.pos.x, groundFloor + 0.015, this.pos.z);
      const sc = Math.max(0.1, 1 - altN * 0.45);
      this.shadow.scale.set(sc, sc * 1.4, 1);
      this.shadow.material.opacity = Math.max(0, 0.22 * (1 - altN * 0.85));
      this.shadow.visible = (heightAboveGround < 8.0);
    }

    despawn() {
      this.despawned = true;
      if (this.root.parent) this.root.parent.remove(this.root);
      if (this.shadow.parent) this.shadow.parent.remove(this.shadow);
      this.dispose();
    }

    dispose() {
      this.root.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
          else o.material.dispose();
        }
      });
      if (this.shadow.geometry) this.shadow.geometry.dispose();
      if (this.shadow.material) this.shadow.material.dispose();
    }
  }

  /* ================= MANAGER LINGKUNGAN MERPATI ================= */
  return {
    scene: null,
    pigeons: [],
    spawnTimer: 1.0,
    maxPigeons: 6,
    time: 0,

    init(scene) {
      this.scene = scene;
      this.clear();
      this.spawnTimer = 1.0;
    },

    clear() {
      for (const p of this.pigeons) {
        if (p.root && p.root.parent) p.root.parent.remove(p.root);
        if (p.shadow && p.shadow.parent) p.shadow.parent.remove(p.shadow);
        p.dispose();
      }
      this.pigeons = [];
    },

    getSurfaceAt(x, z, fromY) {
      if (typeof World === 'undefined' || !World.groundAt) return fromY || 5;
      return World.groundAt(x, z, fromY);
    },

    findPerch(cx, cz, minR = 6, maxR = 24, avoidPos = null) {
      const candidates = [];

      // 1. Cek Ore di sekitar
      if (typeof Env_Ore !== 'undefined' && Env_Ore.activeNodes) {
        for (const node of Env_Ore.activeNodes.values()) {
          const d = Math.hypot(node.wx - cx, node.wz - cz);
          if (d >= minR && d <= maxR) {
            if (avoidPos && Math.hypot(node.wx - avoidPos.x, node.wz - avoidPos.z) < 10) continue;
            const topY = (typeof Env_Ore.topAt === 'function') ? Env_Ore.topAt(node.wx, node.wz) : node.wy + 1.2;
            candidates.push({
              pos: new THREE.Vector3(node.wx + rand(-0.4, 0.4), topY || (node.wy + 1.2), node.wz + rand(-0.4, 0.4)),
              type: 'ore',
              weight: 3.0
            });
          }
        }
      }

      // 2. Cek Bangunan (Kastil & Rumah) di sekitar
      if (typeof Furni !== 'undefined' && Furni.list) {
        for (const f of Furni.list) {
          if (!f.def) continue;
          if (f.def.startsWith('castle')) {
            const d = Math.hypot(f.x - cx, f.z - cz);
            if (d <= maxR + 10) {
              const tier = parseInt(f.def.replace('castle', '')) || 1;
              const size = (typeof CastleBuilder !== 'undefined') ? CastleBuilder.getCastleSize(tier) : (tier === 1 ? 14 : (tier === 2 ? 17 : 20));
              const half = size / 2;
              const rx = f.x + rand(-half * 0.6, half * 0.6);
              const rz = f.z + rand(-half * 0.6, half * 0.6);
              if (avoidPos && Math.hypot(rx - avoidPos.x, rz - avoidPos.z) < 10) continue;
              const topY = (typeof FurniCastle !== 'undefined' && FurniCastle.topAt)
                ? FurniCastle.topAt(rx, rz, f.y + 28) : f.y + 8;
              if (topY > f.y + 5) {
                candidates.push({
                  pos: new THREE.Vector3(rx, topY, rz),
                  type: 'building',
                  weight: 3.5
                });
              }
            }
          }
        }
      }

      if (typeof Furni !== 'undefined' && Furni.houses) {
        for (const h of Furni.houses) {
          const d = Math.hypot(h.x - cx, h.z - cz);
          if (d >= minR && d <= maxR) {
            if (avoidPos && Math.hypot(h.x - avoidPos.x, h.z - avoidPos.z) < 10) continue;
            candidates.push({
              pos: new THREE.Vector3(h.x + rand(-1.2, 1.2), h.y + 4.1, h.z + rand(-1.2, 1.2)),
              type: 'building',
              weight: 3.0
            });
          }
        }
      }

      // 3. Cek Pohon (Canopy Dedaunan) di sekitar
      for (let i = 0; i < 8; i++) {
        const ang = rand(0, Math.PI * 2);
        const dist = rand(minR, maxR);
        const tx = Math.floor(cx + Math.sin(ang) * dist);
        const tz = Math.floor(cz + Math.cos(ang) * dist);
        if (avoidPos && Math.hypot(tx - avoidPos.x, tz - avoidPos.z) < 10) continue;

        if (typeof World !== 'undefined' && World.getBlock && typeof B !== 'undefined') {
          for (let y = (typeof CFG !== 'undefined' ? CFG.WORLD_H - 1 : 63); y >= 6; y--) {
            const id = World.getBlock(tx, y, tz);
            if (id === B.LEAF) {
              candidates.push({
                pos: new THREE.Vector3(tx + 0.5 + rand(-0.3, 0.3), y + 1.0, tz + 0.5 + rand(-0.3, 0.3)),
                type: 'tree',
                weight: 2.5
              });
              break;
            }
            if (World.isFloor && World.isFloor(id)) break;
          }
        }
      }

      // 4. Dataran Tanah
      for (let i = 0; i < 6; i++) {
        const ang = rand(0, Math.PI * 2);
        const dist = rand(minR, maxR);
        const gx = cx + Math.sin(ang) * dist;
        const gz = cz + Math.cos(ang) * dist;
        if (avoidPos && Math.hypot(gx - avoidPos.x, gz - avoidPos.z) < 10) continue;
        const gy = this.getSurfaceAt(gx, gz, 20);
        const waterY = (typeof CFG !== 'undefined' && CFG.WATER_Y) ? CFG.WATER_Y : 4.82;
        if (gy >= waterY + 0.3) {
          candidates.push({
            pos: new THREE.Vector3(gx, gy, gz),
            type: 'ground',
            weight: 1.5
          });
        }
      }

      if (!candidates.length) return null;

      let totalW = 0;
      for (const c of candidates) totalW += c.weight;
      let roll = Math.random() * totalW;
      for (const c of candidates) {
        roll -= c.weight;
        if (roll <= 0) return c;
      }
      return candidates[0];
    },

    spawnFlock(centerPos) {
      if (!this.scene) return;
      const count = Math.floor(rand(1, 3.99));
      const colors = ['white', 'black', 'brown'];
      const flockPerch = this.findPerch(centerPos.x, centerPos.z, 8, 22);
      if (!flockPerch) return;

      for (let i = 0; i < count; i++) {
        if (this.pigeons.length >= this.maxPigeons) break;
        const pal = colors[Math.floor(Math.random() * colors.length)];
        const pigeon = new Pigeon(pal);
        const spawnPos = flockPerch.pos.clone().add(new THREE.Vector3(rand(-0.6, 0.6), 0, rand(-0.6, 0.6)));
        pigeon.setPerch(spawnPos, flockPerch.type);
        pigeon.restIfNight();

        this.scene.add(pigeon.root);
        this.scene.add(pigeon.shadow);
        this.pigeons.push(pigeon);
      }
    },

    /* Burung yang hinggap di pohon yang ditebang/dihancurkan langsung
       terbang kabur. Dipanggil World.fellTree/leafDecay/setBlock. */
    flushTree(tx, tz) {
      for (const p of this.pigeons) {
        if (p.despawned || p.perchType !== 'tree') continue;
        if (Math.floor(p.pos.x) !== tx || Math.floor(p.pos.z) !== tz) continue;
        p.flushFromTree();
      }
    },

    update(dt, playerPos) {
      if (!this.scene || !playerPos) return;
      this.time += dt;
      /* SIKLUS TIDUR MALAM: saat malam, burung yang hinggap di pohon tidur
         (state SLEEP); saat pagi, yang tidur bangun (terbang pagi singkat). */
      const isNight = (typeof Weather !== 'undefined') ? (Weather.nightF > 0.5) : false;
      if (isNight !== this._wasNight) {
        this._wasNight = isNight;
        for (const p of this.pigeons) {
          if (p.despawned) continue;
          if (isNight) {
            if (p.perchType === 'tree') p.sleepOnTree();
          } else {
            if (p.sleeping || p.state === 'SLEEP') p.wakeUp(true);
          }
        }
      }

      for (let i = this.pigeons.length - 1; i >= 0; i--) {
        const p = this.pigeons[i];
        if (p.despawned) {
          this.pigeons.splice(i, 1);
          continue;
        }

        const d = Math.hypot(p.pos.x - playerPos.x, p.pos.z - playerPos.z);
        if (d > 65) {
          p.despawn();
          this.pigeons.splice(i, 1);
          continue;
        }

        p.update(dt, this.time, playerPos);
      }

      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = rand(6.0, 12.0);
        if (this.pigeons.length < this.maxPigeons) {
          this.spawnFlock(playerPos);
        }
      }
    }
  };
})();

if (typeof window !== 'undefined') {
  window.Env_Pigeon = Env_Pigeon;
}
