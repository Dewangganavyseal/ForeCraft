'use strict';
/* =============================================================================
   ENTITAS NPC: LICH (☠️) - NPC MYTHIC PENGUASA KEMATIAN
   -----------------------------------------------------------------------------
   Model 3D + Animasi + Skill diporting 1:1 dari NEW MODEL/Lich.html:
     1. Sambaran Petir Ungu (Purple Lightning Bolt) - proyektil zigzag mematikan
     2. Bangkitkan 3 Zombie Pembantai (3 Varian Mayat Hidup dari Tanah Kubur)
        - HP, Damage, dan Durasi bertambah scaling mengikuti level Lich
     3. Sedot Nyawa (Life Drain Beam) - pancaran sinar merah berpilin ganda
        menyedot HP musuh dan memulihkan diri & sekutu
   ============================================================================= */

const NPC_Lich = (() => {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const ss = u => u * u * (3 - 2 * u);
  const easeOutCubic = u => 1 - Math.pow(1 - u, 3);
  const rand = (a, b) => a + Math.random() * (b - a);
  function lerpAngle(a, b, k) {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * k;
  }
  function track(times, vals, t) {
    if (t <= times[0]) return vals[0];
    for (let i = 0; i < times.length - 1; i++) {
      if (t <= times[i + 1]) {
        let u = (t - times[i]) / (times[i + 1] - times[i]);
        return lerp(vals[i], vals[i + 1], ss(u));
      }
    }
    return vals[vals.length - 1];
  }

  const BOX = new THREE.BoxGeometry(1, 1, 1);
  const _mats = {};
  function M(color, emissive) {
    const k = color + '_' + (emissive || 0);
    if (!_mats[k]) _mats[k] = new THREE.MeshLambertMaterial({ color, emissive: emissive || 0x000000 });
    return _mats[k];
  }
  function V(mat, w, h, d, x, y, z, parent, rx, ry, rz) {
    const m = new THREE.Mesh(BOX, mat);
    m.scale.set(w, h, d);
    m.position.set(x || 0, y || 0, z || 0);
    if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0);
    if (parent) parent.add(m);
    return m;
  }

  const C = {
    rBlack: 0x161a20, rBlack2: 0x21272f, green: 0x1e5c37, green2: 0x2f8a4e, trim: 0x43b468,
    bone: 0xd8d0b8, bone2: 0xb9b096, dark: 0x0c0e11, metal: 0x9aa3ae, metal2: 0x646c77,
    wood: 0x3b2c1e, wood2: 0x241a10, dirt: 0x6b4f33
  };

  const ACT = {
    attack: {
      dur: 1.05,
      shRx: { t: [0, .32, .46, .56, .80, 1.05], v: [-.18, -2.55, -2.62, -1.20, -.60, -.18] },
      elRx: { t: [0, .32, .50, .56, 1.05], v: [.30, .55, .50, .15, .30] },
      shLx: { t: [0, .30, .50, .58, .90, 1.05], v: [0, -.40, -.70, -.95, -.30, 0] },
      elLx: { t: [0, .50, .58, 1.05], v: [.12, .20, .05, .12] },
      torx: { t: [0, .30, .50, .62, 1.05], v: [0, -.12, -.16, .22, .04] },
      tory: { t: [0, .32, .50, .62, 1.05], v: [0, -.30, -.34, .26, 0] },
      headx: { t: [0, .50, .62, 1.05], v: [0, -.08, .14, 0] }
    },
    summon: {
      dur: 3.2,
      shRx: { t: [0, .50, .90, 2.30, 2.80, 3.20], v: [-.18, -2.70, -2.85, -2.50, -1.00, -.18] },
      shLx: { t: [0, .50, .90, 2.30, 2.80, 3.20], v: [0, -2.40, -2.60, -2.30, -.80, 0] },
      elRx: { t: [0, .50, 2.70, 3.20], v: [.30, .22, .35, .30] },
      elLx: { t: [0, .50, 2.70, 3.20], v: [.12, .35, .25, .12] },
      shLz: { t: [0, .60, 2.60, 3.20], v: [.12, .45, .20, .12] },
      shRz: { t: [0, .60, 2.60, 3.20], v: [-.12, -.45, -.20, -.12] },
      torx: { t: [0, .50, .90, 2.50, 3.20], v: [0, -.10, -.14, -.05, .04] },
      headx: { t: [0, .60, 2.40, 3.20], v: [0, -.28, -.20, -.02] }
    },
    drain: {
      dur: 3.5,
      shRx: { t: [0, .50, .80, 2.90, 3.20, 3.50], v: [-.18, -.90, -1.32, -1.32, -.70, -.18] },
      elRx: { t: [0, .50, .80, 2.90, 3.50], v: [.30, .15, .08, .08, .30] },
      shLx: { t: [0, .50, .80, 2.90, 3.50], v: [0, -.35, -.55, -.40, 0] },
      elLx: { t: [0, .80, 2.90, 3.50], v: [.12, .15, .20, .12] },
      torx: { t: [0, .50, .80, 2.90, 3.50], v: [.04, .12, .18, .14, .04] },
      tory: { t: [0, .60, 3.00, 3.50], v: [0, .08, .04, 0] },
      headx: { t: [0, .60, 3.00, 3.50], v: [0, .14, .08, 0] },
      bodyy: { t: [0, .60, 3.00, 3.50], v: [0, -.05, -.03, 0] }
    }
  };
  const BLEND_KEYS = ['shRx', 'elRx', 'shLx', 'elLx', 'torx', 'tory', 'headx', 'shLz', 'shRz'];

  /* ================= BUILD ZOMBIE ================= */
  const ZCFG = [
    { skin: 0x5f9445, skin2: 0x4c7c37, shirt: 0x2f6f7f, shirt2: 0x21525e, ribs: true, stump: false, scale: 1.04 },
    { skin: 0x55893d, skin2: 0x456f31, shirt: 0x3d5f8f, shirt2: 0x2c466b, ribs: false, stump: true, scale: 1.00 },
    { skin: 0x679c4b, skin2: 0x527f3b, shirt: 0x357f6a, shirt2: 0x245c4c, ribs: false, stump: false, scale: 1.10 }
  ];

  function buildZombieModel(idx) {
    const g = new THREE.Group();
    const cfg = ZCFG[idx % 3];
    const skin = M(cfg.skin), skin2 = M(cfg.skin2), shirt = M(cfg.shirt), shirt2 = M(cfg.shirt2);
    const pants = M(0x37417a), pants2 = M(0x2c3563), shoe = M(0x2a2f45);
    const wound = M(0x5a2320), boneM = M(0xd8d0b8), darkM = M(0x141410);
    const zEyeMat = new THREE.MeshLambertMaterial({ color: 0x120806, emissive: 0xff4422 });

    const P = {};
    const body = new THREE.Object3D();
    body.position.y = 0.93;
    g.add(body);
    P.body = body;

    function zleg(xs) {
      const hip = new THREE.Object3D();
      hip.position.set(xs * 0.115, -0.02, 0);
      body.add(hip);
      V(pants2, 0.185, 0.09, 0.20, 0, 0.00, 0, hip);
      V(pants, 0.17, 0.48, 0.19, 0, -0.21, 0, hip);
      V(pants2, 0.08, 0.08, 0.02, 0.03, -0.30, 0.10, hip);
      const knee = new THREE.Object3D();
      knee.position.y = -0.44;
      hip.add(knee);
      V(idx === 0 ? skin : pants2, 0.15, 0.13, 0.165, 0, -0.03, 0, knee);
      V(pants2, 0.145, 0.40, 0.155, 0, -0.19, 0, knee);
      const foot = new THREE.Object3D();
      foot.position.y = -0.37;
      knee.add(foot);
      V(shoe, 0.155, 0.10, 0.27, 0, -0.05, 0.05, foot);
      return { hip, knee, foot };
    }
    P.legL = zleg(1);
    P.legR = zleg(-1);

    // Torso
    V(shirt, 0.40, 0.52, 0.23, 0, 0.26, 0, body);
    V(shirt2, 0.41, 0.08, 0.24, 0, 0.03, 0, body);
    V(shirt2, 0.30, 0.11, 0.10, 0, 0.50, -0.13, body);
    V(skin2, 0.14, 0.14, 0.14, 0, 0.55, 0, body);
    V(M(0x3a2c1e), 0.42, 0.06, 0.245, 0, 0.08, 0, body); // sabuk
    V(skin, 0.15, 0.11, 0.02, 0.06, 0.14, 0.117, body); // luka perut
    V(wound, 0.05, 0.04, 0.02, 0.10, 0.15, 0.125, body);
    if (cfg.ribs) {
      V(darkM, 0.15, 0.17, 0.02, -0.08, 0.30, 0.117, body);
      for (let i = 0; i < 3; i++) V(boneM, 0.13, 0.028, 0.025, -0.08, 0.25 + i * 0.055, 0.123, body);
    }

    // Arms
    function zarm(xs, full) {
      const sh = new THREE.Object3D();
      sh.position.set(xs * 0.27, 0.44, 0);
      body.add(sh);
      sh.rotation.x = -1.45;
      V(shirt, 0.175, 0.135, 0.185, 0, 0.01, 0, sh);
      if (!full) {
        V(shirt2, 0.15, 0.16, 0.16, 0, -0.10, 0, sh);
        V(skin, 0.11, 0.09, 0.12, 0, -0.205, 0, sh);
        V(boneM, 0.035, 0.10, 0.035, 0, -0.30, 0, sh, 0.15);
        return { sh, el: null, hand: null };
      }
      V(shirt, 0.145, 0.36, 0.155, 0, -0.16, 0, sh);
      const el = new THREE.Object3D();
      el.position.y = -0.34;
      sh.add(el);
      el.rotation.x = -0.15;
      V(skin, 0.115, 0.30, 0.125, 0, -0.17, 0, el);
      const hand = new THREE.Object3D();
      hand.position.y = -0.31;
      el.add(hand);
      V(skin2, 0.125, 0.13, 0.14, 0, -0.05, 0, hand);
      for (let f = -1; f < 2; f++) V(skin, 0.032, 0.09, 0.032, f * 0.042, -0.145, 0.025, hand, -0.3 + f * 0.09);
      return { sh, el, hand };
    }
    P.armR = zarm(-1, true);
    P.armL = cfg.stump ? zarm(1, false) : zarm(1, true);

    // Head
    const head = new THREE.Object3D();
    head.position.y = 0.58;
    body.add(head);
    P.head = head;
    V(skin, 0.36, 0.36, 0.36, 0, 0.19, 0, head);
    V(skin2, 0.26, 0.11, 0.28, 0, 0.03, 0.03, head);
    V(boneM, 0.21, 0.03, 0.02, 0, 0.065, 0.175, head);
    V(darkM, 0.10, 0.085, 0.03, -0.085, 0.195, 0.17, head);
    V(darkM, 0.10, 0.085, 0.03,  0.085, 0.195, 0.17, head);
    V(zEyeMat, 0.05, 0.045, 0.02, -0.085, 0.195, 0.185, head);
    V(zEyeMat, 0.05, 0.045, 0.02,  0.085, 0.195, 0.185, head);
    V(wound, 0.07, 0.09, 0.02, -0.135, 0.12, 0.155, head);

    g.scale.setScalar(cfg.scale * 0.65);
    return { g, P, cfg };
  }

  return {
    build() {
      const outer = new THREE.Group();
      outer.name = 'NPC_Lich';
      const root = new THREE.Group();
      root.scale.setScalar(0.64);
      outer.add(root);

      const L = {};
      const body = new THREE.Object3D();
      body.position.y = 1.45;
      root.add(body);
      L.body = body;

      const torso = new THREE.Object3D();
      torso.position.y = 0.03;
      body.add(torso);
      L.torso = torso;

      // Rok hitam berlipat & trim hijau
      const skirtGroup = new THREE.Group();
      body.add(skirtGroup);
      for (let r = 0; r < 4; r++) {
        const sy = -0.22 * r;
        const sw = 0.68 + r * 0.12;
        const sd = 0.50 + r * 0.10;
        V(r === 3 ? M(C.green) : M(r % 2 ? C.rBlack : C.rBlack2), sw, 0.24, sd, 0, sy, 0, skirtGroup);
      }
      L.skirtGroup = skirtGroup;

      // Torso & tulang rusuk
      V(M(C.rBlack),  0.50, 0.24, 0.32, 0, 0.12, 0, torso);
      V(M(C.rBlack2), 0.58, 0.44, 0.36, 0, 0.44, 0, torso);
      V(M(C.dark),    0.30, 0.30, 0.05, 0, 0.46, 0.175, torso);
      for (let i = 0; i < 3; i++) V(M(C.bone), 0.26, 0.045, 0.05, 0, 0.38 + i * 0.08, 0.195, torso);
      V(M(C.bone2), 0.05, 0.26, 0.05, 0, 0.45, 0.205, torso);
      V(M(0x241a10), 0.56, 0.09, 0.36, 0, 0.16, 0, torso); // sabuk
      V(M(C.bone), 0.10, 0.09, 0.04, 0, 0.16, 0.19, torso); // tengkorak sabuk
      V(M(C.green), 0.52, 0.34, 0.08, 0, 0.70, -0.19, torso, -0.22); // jubah belakang

      // Bahu berduri metal & hijau
      for (const sx of [-1, 1]) {
        V(M(C.rBlack2), 0.26, 0.14, 0.32, sx * 0.34, 0.62, 0, torso, 0, 0, -sx * 0.18);
        V(M(C.green),   0.27, 0.04, 0.30, sx * 0.35, 0.68, 0, torso, 0, 0, -sx * 0.18);
        V(M(C.metal2),  0.05, 0.24, 0.05, sx * 0.42, 0.78, 0, torso, 0, 0, -sx * 0.5);
      }

      // Kepala tengkorak bertanduk mahkota
      const head = new THREE.Object3D();
      head.position.set(0, 0.74, 0);
      torso.add(head);
      L.head = head;
      V(M(C.bone2), 0.16, 0.10, 0.16, 0, 0.02, 0, head);
      V(M(C.bone),  0.40, 0.38, 0.40, 0, 0.28, 0, head);
      const eyeMat = new THREE.MeshLambertMaterial({ color: 0x0a0c08, emissive: 0x8bff45 });
      V(eyeMat, 0.09, 0.07, 0.04, -0.10, 0.245, 0.205, head);
      V(eyeMat, 0.09, 0.07, 0.04,  0.10, 0.245, 0.205, head);
      V(M(C.rBlack),  0.56, 0.16, 0.56, 0, 0.50, -0.02, head); // tudung atas
      V(M(C.rBlack2), 0.60, 0.34, 0.14, 0, 0.30, -0.22, head); // tudung belakang
      for (let i = -1; i < 2; i++) {
        V(M(C.metal2), 0.04, 0.20, 0.04, i * 0.16, 0.60, -0.08, head, -0.25, 0, i * 0.18); // mahkota duri
      }

      // Lengan
      function buildArm(xs) {
        const sh = new THREE.Object3D();
        sh.position.set(xs * 0.37, 0.56, 0);
        torso.add(sh);
        V(M(C.rBlack2), 0.19, 0.42, 0.21, 0, -0.20, 0, sh);
        V(M(C.green),   0.20, 0.06, 0.22, 0, -0.39, 0, sh);
        const el = new THREE.Object3D();
        el.position.y = -0.42;
        sh.add(el);
        V(M(C.rBlack), 0.16, 0.38, 0.18, 0, -0.18, 0, el);
        V(M(C.metal2), 0.18, 0.08, 0.20, 0, -0.37, 0, el);
        const hand = new THREE.Object3D();
        hand.position.y = -0.44;
        el.add(hand);
        V(M(C.bone),  0.13, 0.15, 0.11, 0, -0.06, 0, hand);
        V(M(C.bone2), 0.11, 0.06, 0.12, 0, -0.15, 0.01, hand);
        return { sh, el, hand };
      }
      L.armL = buildArm(1);
      L.armR = buildArm(-1);

      // Kaki
      function buildLeg(xs) {
        const hip = new THREE.Object3D();
        hip.position.set(xs * 0.16, -0.06, 0);
        body.add(hip);
        V(M(C.rBlack), 0.21, 0.58, 0.23, 0, -0.29, 0, hip);
        const knee = new THREE.Object3D();
        knee.position.y = -0.62;
        hip.add(knee);
        V(M(C.bone2), 0.10, 0.56, 0.11, 0, -0.30, 0, knee);
        const foot = new THREE.Object3D();
        foot.position.y = -0.64;
        knee.add(foot);
        V(M(C.bone), 0.15, 0.10, 0.30, 0, -0.06, 0.07, foot);
        return { hip, knee, foot };
      }
      L.legL = buildLeg(1);
      L.legR = buildLeg(-1);

      // Tongkat Sihir Besar
      const staff = new THREE.Object3D();
      staff.position.set(0, -0.02, 0.04);
      staff.rotation.set(0.12, 0, -0.06);
      L.armR.hand.add(staff);
      L.staff = staff;

      V(M(C.wood),  0.09, 2.30, 0.09, 0, 0.85, 0, staff);
      V(M(C.wood2), 0.10, 0.30, 0.10, 0.01, 0.30, 0.01, staff, 0, 0.5, 0.05);
      V(M(C.bone),  0.16, 0.15, 0.16, 0, 1.74, 0.03, staff); // tengkorak tongkat

      const orbMat = new THREE.MeshLambertMaterial({ color: 0x0c1210, emissive: 0x59ff8f });
      const satMat = new THREE.MeshLambertMaterial({ color: 0x101614, emissive: 0x7dffb0 });
      const orb = new THREE.Object3D();
      orb.position.set(0, 2.14, 0);
      staff.add(orb);
      L.orb = orb;
      V(orbMat, 0.24, 0.24, 0.24, 0, 0, 0, orb);

      const sats = new THREE.Object3D();
      orb.add(sats);
      L.sats = sats;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        V(satMat, 0.06, 0.06, 0.06, Math.cos(a) * 0.27, Math.sin(a * 2) * 0.06, Math.sin(a) * 0.27, sats);
      }

      const tipAnchor = new THREE.Object3D();
      tipAnchor.position.y = 0.08;
      orb.add(tipAnchor);
      L.tip = tipAnchor;

      // Lingkaran sihir summon di bawah
      const circle = new THREE.Group();
      circle.visible = false;
      const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x3ddc72, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
      const ring1 = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.15, 36), ringMat1);
      ring1.rotation.x = -Math.PI / 2;
      circle.add(ring1);
      outer.add(circle);
      L.circle = circle;

      // Beam sedot nyawa
      const beamCore = V(new THREE.MeshBasicMaterial({ color: 0xff2244, transparent: true, opacity: 0.85, depthWrite: false }), 0.07, 1, 0.07);
      beamCore.visible = false;
      outer.add(beamCore);
      L.beamCore = beamCore;

      return {
        mesh: outer,
        parts: {
          rare: { kind: 'lich' },
          L,
          bodyY: 1.45 * 0.64
        }
      };
    },

    _st(n) {
      if (!n._lichState) {
        n._lichState = {
          loco: 'idle',
          speed: 0,
          phase: 0,
          action: null,
          actionT: 0,
          boltCd: 0,
          summonCd: 0,
          drainCd: 0,
          cast: null,
          zombies: [],
          bolts: []
        };
      }
      return n._lichState;
    },

    /* ================= COMBAT LICH ================= */
    combat(n, dt) {
      const S = this._st(n);
      const tgt = n.target;
      if (!tgt || tgt.dead) return false;

      const d = tgt.pos.distanceTo(n.pos);
      const to = new THREE.Vector3().subVectors(tgt.pos, n.pos).setY(0);
      const ang = Math.atan2(to.x, to.z);
      n.mesh.rotation.y = lerpAngle(n.mesh.rotation.y, ang, clamp(dt * 7, 0, 1));

      // Jaga jarak menengah (6-11 blok)
      const sp = n.speed * (n.inWater ? 0.5 : 1);
      if (d > 11) {
        n.vel.x = lerp(n.vel.x, Math.sin(ang) * sp, clamp(5 * dt, 0, 1));
        n.vel.z = lerp(n.vel.z, Math.cos(ang) * sp, clamp(5 * dt, 0, 1));
      } else if (d < 4.5) {
        n.vel.x = lerp(n.vel.x, -Math.sin(ang) * sp * 0.85, clamp(5 * dt, 0, 1));
        n.vel.z = lerp(n.vel.z, -Math.cos(ang) * sp * 0.85, clamp(5 * dt, 0, 1));
      } else {
        n.vel.x *= 0.75;
        n.vel.z *= 0.75;
      }

      if (S.cast) return true; // Sedang mengeksekusi animasi aksi

      // 1. Skill Summon 3 Zombie (CD 24s) - diprioritaskan saat musuh mendekat
      const sumCost = (typeof NPCS !== 'undefined' && NPCS.skillStamCost) ? NPCS.skillStamCost(n, 40) : 40;
      if (S.summonCd <= 0 && S.zombies.length < 3 && (n.stamina || 0) >= sumCost && d < 18) {
        n.stamina = (n.stamina || 0) - sumCost;
        n.stamRegenT = 2.0;
        S.summonCd = 24.0;
        this.startCast(n, 'summon', tgt);
        return true;
      }

      // 2. Skill Sedot Nyawa (Life Drain Beam) (CD 16s) - saat HP berkurang atau musuh dalam 10 blok
      const drCost = (typeof NPCS !== 'undefined' && NPCS.skillStamCost) ? NPCS.skillStamCost(n, 32) : 32;
      if (S.drainCd <= 0 && d < 12 && (n.stamina || 0) >= drCost) {
        n.stamina = (n.stamina || 0) - drCost;
        n.stamRegenT = 1.8;
        S.drainCd = 16.0;
        this.startCast(n, 'drain', tgt);
        return true;
      }

      // 3. Skill Sambaran Petir Ungu (CD 3.2s) - serangan ofensif rutin
      const atkCost = (typeof NPCS !== 'undefined' && NPCS.skillStamCost) ? NPCS.skillStamCost(n, 22) : 22;
      if (S.boltCd <= 0 && d < 18 && (n.stamina || 0) >= atkCost) {
        n.stamina = (n.stamina || 0) - atkCost;
        n.stamRegenT = 1.2;
        S.boltCd = 3.2;
        this.startCast(n, 'attack', tgt);
        return true;
      }

      return false;
    },

    startCast(n, action, target) {
      const S = this._st(n);
      S.action = action;
      S.actionT = 0;
      S.cast = {
        action,
        t: 0,
        dur: ACT[action].dur,
        target,
        fired: false,
        drainTickT: 0
      };
      if (action === 'summon') {
        if (n.parts.L && n.parts.L.circle) {
          n.parts.L.circle.visible = true;
          n.parts.L.circle.position.set(0, 0.05, 0);
        }
        if (typeof Sfx !== 'undefined' && Sfx.at) Sfx.at(n.pos, 'craft');
      } else if (action === 'drain') {
        if (typeof Sfx !== 'undefined' && Sfx.at) Sfx.at(n.pos, 'magic');
      }
    },

    spawnBolt(n, target) {
      const S = this._st(n);
      const tipPos = new THREE.Vector3();
      if (n.parts.L && n.parts.L.tip) n.parts.L.tip.getWorldPosition(tipPos);
      else tipPos.copy(n.pos).add(new THREE.Vector3(0, 1.8, 0));

      const tgtPos = target.pos.clone().add(new THREE.Vector3(0, 1.2, 0));
      const boltMesh = new THREE.Group();
      const bMat = new THREE.MeshBasicMaterial({ color: 0xd47aff });
      for (let i = 0; i < 4; i++) {
        const seg = new THREE.Mesh(BOX, bMat);
        seg.scale.set(0.08, 0.35, 0.08);
        seg.position.set(rand(-0.15, 0.15), i * 0.28, rand(-0.15, 0.15));
        boltMesh.add(seg);
      }
      boltMesh.position.copy(tipPos);
      if (typeof Game !== 'undefined' && Game.scene) Game.scene.add(boltMesh);

      const baseDmg = (typeof NPCS !== 'undefined' && NPCS.npcDmg) ? NPCS.npcDmg(n) : 36;
      S.bolts.push({
        mesh: boltMesh,
        pos: tipPos,
        target: tgtPos,
        targetEnt: target,
        dmg: Math.round(baseDmg * 1.75),
        life: 1.4
      });
      if (typeof Sfx !== 'undefined' && Sfx.at) Sfx.at(n.pos, 'hit');
    },

    summonZombies(n) {
      const S = this._st(n);
      // Bersihkan zombie lama yang masih tersisa
      for (const z of S.zombies) {
        if (z.state !== 'sink') { z.state = 'sink'; z.t = 0; z.sinkY0 = z.g.position.y; }
      }
      const lvl = n.level || 1;
      const zHp = Math.round(85 * (1 + 0.14 * (lvl - 1)));
      const zDmg = Math.round(15 * (1 + 0.12 * (lvl - 1)));
      const zDur = 15.0 + Math.min(25.0, (lvl - 1) * 0.4);

      const spots = [[-1.6, 1.8], [0.0, 2.7], [1.6, 1.8]];
      const yaw = n.mesh.rotation.y;
      const c = Math.cos(yaw), s = Math.sin(yaw);

      for (let i = 0; i < 3; i++) {
        const b = buildZombieModel(i);
        const lx = spots[i][0], lz = spots[i][1];
        const wx = n.pos.x + lx * c - lz * s;
        const wz = n.pos.z + lx * s + lz * c;
        const wy = (typeof World !== 'undefined' && World.groundAt) ? World.groundAt(wx, wz, n.pos.y + 2) : n.pos.y;

        b.g.position.set(wx, wy - 1.8, wz);
        b.g.visible = true;
        if (typeof Game !== 'undefined' && Game.scene) Game.scene.add(b.g);

        S.zombies.push({
          ...b,
          hp: zHp,
          maxhp: zHp,
          dmg: zDmg,
          maxLife: zDur,
          life: zDur,
          state: 'rising',
          t: 0,
          burstDone: false,
          atkT: 0.6,
          phase: rand(0, 6),
          seed: rand(0, 10),
          mv: 0
        });

        if (typeof FX !== 'undefined' && FX.ring) {
          FX.ring(wx, wy + 0.1, wz, 0x3ddc72, 0.6, 2.5);
        }
      }
    },

    /* ================= ANIMASI & UPDATE LICH ================= */
    animate(n, dt) {
      const S = this._st(n);
      const L = n.parts.L;
      if (!L) return;

      // Update Cooldowns
      S.boltCd = Math.max(0, S.boltCd - dt);
      S.summonCd = Math.max(0, S.summonCd - dt);
      S.drainCd = Math.max(0, S.drainCd - dt);

      // Rotate Orb & Satellites
      if (L.sats) L.sats.rotation.y += dt * 3.5;
      if (L.orb) L.orb.rotation.y += dt * 1.2;

      // Update Action Cast
      if (S.cast) {
        S.cast.t += dt;
        S.actionT = S.cast.t;
        const c = S.cast;

        if (c.action === 'attack') {
          if (!c.fired && c.t >= 0.46) {
            c.fired = true;
            this.spawnBolt(n, c.target);
          }
        } else if (c.action === 'summon') {
          if (!c.fired && c.t >= 0.90) {
            c.fired = true;
            this.summonZombies(n);
          }
        } else if (c.action === 'drain') {
          c.drainTickT += dt;
          if (c.target && !c.target.dead && c.target.pos) {
            const d = c.target.pos.distanceTo(n.pos);
            if (d < 15 && L.beamCore) {
              L.beamCore.visible = true;
              const tipW = new THREE.Vector3();
              L.tip.getWorldPosition(tipW);
              const tgtW = c.target.pos.clone().add(new THREE.Vector3(0, 1.2, 0));
              const dir = new THREE.Vector3().subVectors(tgtW, tipW);
              const len = dir.length();
              dir.normalize();
              L.beamCore.position.copy(tipW).addScaledVector(dir, len * 0.5);
              L.beamCore.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
              L.beamCore.scale.set(0.08, len, 0.08);

              // Tick sedot darah setiap 0.35s
              if (c.drainTickT >= 0.35) {
                c.drainTickT = 0;
                const baseDmg = (typeof NPCS !== 'undefined' && NPCS.npcDmg) ? NPCS.npcDmg(n) : 36;
                const drainDmg = Math.round(baseDmg * 0.55);
                if (typeof Monsters !== 'undefined' && Monsters.hurt) {
                  Monsters.hurt(c.target, drainDmg, new THREE.Vector3(0, 0.1, 0), 0, n);
                }
                // Pulihkan HP Lich
                n.hp = Math.min(n.maxHp || 380, (n.hp || 380) + drainDmg * 0.85);
                if (typeof FX !== 'undefined' && FX.text) {
                  FX.text(n.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), `+${Math.round(drainDmg * 0.85)} HP`, '#59ff8f');
                }
              }
            } else if (L.beamCore) {
              L.beamCore.visible = false;
            }
          }
        }

        if (c.t >= c.dur) {
          if (L.circle) L.circle.visible = false;
          if (L.beamCore) L.beamCore.visible = false;
          S.action = null;
          S.cast = null;
        }
      } else {
        if (L.circle) L.circle.visible = false;
        if (L.beamCore) L.beamCore.visible = false;
      }

      // Update Zombies
      for (let i = S.zombies.length - 1; i >= 0; i--) {
        const z = S.zombies[i];
        z.t += dt;
        z.life -= dt;

        if (z.state === 'rising') {
          const u = Math.min(1, z.t / 0.95);
          z.g.position.y = (z.g.userData._groundY || z.g.position.y + 1.8 * (1 - u));
          if (!z.burstDone && u > 0.45) {
            z.burstDone = true;
            if (typeof FX !== 'undefined' && FX.debris) {
              FX.debris(new THREE.Vector3(z.g.position.x, z.g.position.y + 0.1, z.g.position.z), 0x6b4f33, 14, 2.5);
            }
          }
          if (u >= 1) {
            z.state = 'chase';
          }
        } else if (z.state === 'sink' || z.life <= 0) {
          if (z.state !== 'sink') { z.state = 'sink'; z.t = 0; }
          const u = Math.min(1, z.t / 0.6);
          z.g.position.y -= dt * 3.0;
          if (u >= 1) {
            if (z.g.parent) z.g.parent.remove(z.g);
            S.zombies.splice(i, 1);
            continue;
          }
        } else if (z.state === 'chase' || z.state === 'fight') {
          // Cari musuh terdekat untuk diserang zombie
          let bestFoe = n.target && !n.target.dead ? n.target : null;
          if (!bestFoe && typeof Monsters !== 'undefined' && Monsters.list) {
            let bd = 16;
            for (const m of Monsters.list) {
              if (m.dead || m.pet) continue;
              const d = m.pos.distanceTo(z.g.position);
              if (d < bd) { bd = d; bestFoe = m; }
            }
          }

          if (bestFoe) {
            const dx = bestFoe.pos.x - z.g.position.x;
            const dz = bestFoe.pos.z - z.g.position.z;
            const dist = Math.hypot(dx, dz);
            z.g.rotation.y = lerpAngle(z.g.rotation.y, Math.atan2(dx, dz), clamp(dt * 6, 0, 1));

            if (dist > 1.3) {
              z.g.position.x += (dx / dist) * 2.2 * dt;
              z.g.position.z += (dz / dist) * 2.2 * dt;
              z.mv = 1.0;
            } else {
              z.mv = 0.2;
              z.atkT -= dt;
              if (z.atkT <= 0) {
                z.atkT = 0.9;
                if (typeof Monsters !== 'undefined' && Monsters.hurt) {
                  Monsters.hurt(bestFoe, z.dmg, new THREE.Vector3(dx * 0.1, 0.2, dz * 0.1), 1.5, n);
                  if (typeof Sfx !== 'undefined' && Sfx.at) Sfx.at(z.g.position, 'hit');
                  if (typeof FX !== 'undefined' && FX.debris) {
                    FX.debris(bestFoe.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0xff4422, 6, 1.8);
                  }
                }
              }
            }
          } else {
            z.mv = 0;
          }

          // Pose gerak zombie
          z.phase += dt * (2 + z.mv * 5.5);
          const sn = Math.sin(z.phase);
          if (z.P.legL) z.P.legL.hip.rotation.x = -sn * 0.5 * z.mv;
          if (z.P.legR) z.P.legR.hip.rotation.x =  sn * 0.5 * z.mv;
          if (z.P.body) z.P.body.position.y = 0.93 + Math.abs(sn) * 0.03 * z.mv;
          if (z.P.armR) z.P.armR.sh.rotation.x = -1.45 + Math.sin(z.phase * 2) * 0.15;
          if (z.P.armL) z.P.armL.sh.rotation.x = -1.45 + Math.sin(z.phase * 2 + 1) * 0.15;
        }
      }

      // Update Lightning Bolts
      for (let i = S.bolts.length - 1; i >= 0; i--) {
        const b = S.bolts[i];
        b.life -= dt;
        const dir = new THREE.Vector3().subVectors(b.target, b.pos);
        const dist = dir.length();
        if (dist > 0.4 && b.life > 0) {
          dir.normalize();
          b.pos.addScaledVector(dir, Math.min(dist, 18 * dt));
          b.mesh.position.copy(b.pos);
          b.mesh.rotation.y += dt * 14;
        } else {
          // Impact
          if (b.targetEnt && !b.targetEnt.dead && typeof Monsters !== 'undefined' && Monsters.hurt) {
            Monsters.hurt(b.targetEnt, b.dmg, new THREE.Vector3(0, 0.3, 0), 4, n);
          }
          if (typeof FX !== 'undefined') {
            if (FX.ring) FX.ring(b.pos.x, b.pos.y + 0.1, b.pos.z, 0xd47aff, 0.8, 3.5);
            if (FX.debris) FX.debris(b.pos, 0xd47aff, 12, 3.0);
          }
          if (typeof Sfx !== 'undefined' && Sfx.at) Sfx.at(b.pos, 'thunder');
          if (b.mesh.parent) b.mesh.parent.remove(b.mesh);
          S.bolts.splice(i, 1);
        }
      }

      // Pose Karakter Lich
      const spd = Math.hypot(n.vel.x, n.vel.z);
      const isMoving = spd > 0.2;
      const s = isMoving ? (spd > 3.0 ? 2.5 : 1.2) : 0;
      S.speed += (s - S.speed) * Math.min(1, dt * 5.0);
      if (S.speed > 0.05) S.phase += dt * (4.2 + S.speed * 1.5);

      const ph = S.phase;
      const act = clamp(S.speed / 0.4, 0, 1);
      const idleF = 1 - clamp(S.speed / 0.5, 0, 1);
      const sinP = Math.sin(ph);
      const legAmp = (0.12 + 0.24 * S.speed) * act;

      const P = {};
      P.hipLx = -sinP * legAmp;
      P.hipRx =  sinP * legAmp;
      P.kneeLx = Math.pow(Math.max(0, Math.sin(ph + 1.9)), 1.3) * (0.15 + 0.42 * S.speed) * act + 0.03;
      P.kneeRx = Math.pow(Math.max(0, Math.sin(ph + 1.9 + Math.PI)), 1.3) * (0.15 + 0.42 * S.speed) * act + 0.03;
      P.shLx = sinP * (0.06 + 0.20 * S.speed) * act + Math.sin(performance.now() * 0.0013) * 0.05 * idleF;
      P.shRx = -sinP * (0.04 + 0.12 * S.speed) * act - 0.18;
      P.elLx = Math.max(0, 0.12 + 0.10 * S.speed);
      P.elRx = 0.30 + 0.12 * Math.min(1.5, S.speed);
      P.shLz = 0.12;
      P.shRz = -0.12;
      P.torx = 0.04;
      P.tory = sinP * 0.06 * act;
      P.bodyy = Math.abs(sinP) * 0.035 * Math.min(1, S.speed * 0.7);
      P.headx = -P.torx * 0.55;

      // Blend Aksi Skill Aktif
      if (S.action && ACT[S.action]) {
        const tr = ACT[S.action];
        const dur = tr.dur, T = S.actionT;
        const w = Math.min(ss(clamp(T / 0.12, 0, 1)), ss(clamp((dur - T) / 0.28, 0, 1)));
        if (w > 0) {
          for (const k of BLEND_KEYS) {
            if (tr[k]) P[k] = lerp(P[k], track(tr[k].t, tr[k].v, T), w);
          }
        }
      }

      if (L.legL && L.legL.hip) L.legL.hip.rotation.x = P.hipLx;
      if (L.legR && L.legR.hip) L.legR.hip.rotation.x = P.hipRx;
      if (L.legL && L.legL.knee) L.legL.knee.rotation.x = P.kneeLx;
      if (L.legR && L.legR.knee) L.legR.knee.rotation.x = P.kneeRx;
      if (L.armL && L.armL.sh) L.armL.sh.rotation.set(P.shLx, 0, P.shLz);
      if (L.armR && L.armR.sh) L.armR.sh.rotation.set(P.shRx, 0, P.shRz);
      if (L.armL && L.armL.el) L.armL.el.rotation.x = P.elLx;
      if (L.armR && L.armR.el) L.armR.el.rotation.x = P.elRx;
      if (L.torso) L.torso.rotation.set(P.torx, P.tory, 0);
      if (L.body) L.body.position.y = 1.45 + P.bodyy;
      if (L.head) L.head.rotation.set(P.headx, 0, 0);
      if (L.skirtGroup) L.skirtGroup.rotation.z = Math.sin(ph) * 0.04 * act;
    }
  };
})();

if (typeof window !== 'undefined') {
  window.NPC_Lich = NPC_Lich;
}
