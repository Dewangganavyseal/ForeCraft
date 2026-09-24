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

  /* ================= VERLET CLOTH PHYSICS (rok & jubah belakang) =================
     Port 1:1 dari prototipe Lich.html: partikel verlet + stick constraint,
     angin prosedural, tabrakan kaki/tubuh, panel & strip kain mengikuti. */
  function VRope() { this.pts = []; this.sticks = []; }
  VRope.prototype.point = function (x, y, z, pinned, anchor, follow) {
    const p = {
      pos: new THREE.Vector3(x, y, z), prev: new THREE.Vector3(x, y, z),
      pinned: !!pinned, anchor: anchor || null, follow: follow || null,
      seed: Math.random() * 10
    };
    this.pts.push(p); return p;
  };
  VRope.prototype.stick = function (a, b, stiff) {
    this.sticks.push({ a, b, len: a.pos.distanceTo(b.pos), stiff: stiff == null ? 1 : stiff });
  };
  const _va = new THREE.Vector3(), _cb = new THREE.Vector3(), _cp = new THREE.Vector3();
  const _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3(), _q = new THREE.Quaternion();
  const _m4 = new THREE.Matrix4(), _right = new THREE.Vector3(), _upv = new THREE.Vector3(), _fwd = new THREE.Vector3();
  const _wind = new THREE.Vector3();
  function computeWind(t, s) {
    _wind.set(Math.sin(t * 1.7) * 0.6 + Math.sin(t * 0.63) * 0.4, 0, -(s * 3.2 + 0.45) + Math.sin(t * 2.3) * 0.3);
  }
  function updateColliders(L, cds) {
    if (L.legL) { L.legL.hip.getWorldPosition(cds[0].a); L.legL.foot.getWorldPosition(cds[0].b); }
    if (L.legR) { L.legR.hip.getWorldPosition(cds[1].a); L.legR.foot.getWorldPosition(cds[1].b); }
    if (L.body) {
      L.body.getWorldPosition(cds[2].a); cds[2].a.y += 0.12;
      cds[2].b.copy(cds[2].a); cds[2].b.y -= 0.8;
    }
  }
  function collidePt(p, cds) {
    for (const cd of cds) {
      _cb.subVectors(cd.b, cd.a);
      _cp.subVectors(p.pos, cd.a);
      const tt = clamp(_cp.dot(_cb) / Math.max(1e-6, _cb.lengthSq()), 0, 1);
      _cp.subVectors(p.pos, cd.a).addScaledVector(_cb, -tt);
      const d = _cp.length();
      if (d < cd.r && d > 1e-5) p.pos.addScaledVector(_cp.multiplyScalar(1 / d), (cd.r - d));
    }
  }
  function physicsStep(ropes, cds, dt, t) {
    for (const R of ropes) {
      const wf = R.wind;
      for (const p of R.r.pts) {
        if (p.pinned) {
          if (p.anchor) p.anchor.getWorldPosition(p.pos);
          else if (p.follow) p.pos.copy(p.follow.pos);
          p.prev.copy(p.pos); continue;
        }
        _va.subVectors(p.pos, p.prev).multiplyScalar(0.985);
        p.prev.copy(p.pos);
        p.pos.add(_va);
        p.pos.y += -18 * dt * dt;
        p.pos.x += (_wind.x * wf + Math.sin(t * 3.1 + p.seed) * 0.3 * wf) * dt * dt;
        p.pos.z += (_wind.z * wf + Math.cos(t * 2.6 + p.seed * 1.7) * 0.3 * wf) * dt * dt;
        p.pos.y += (Math.sin(t * 2.1 + p.seed * 2.3) * 0.18 * wf) * dt * dt;
      }
      for (let it = 0; it < 3; it++) {
        for (const s of R.r.sticks) {
          _va.subVectors(s.b.pos, s.a.pos);
          const d = _va.length() || 1e-5;
          const diff = (d - s.len) / d * 0.5 * s.stiff;
          const dx = _va.x * diff, dy = _va.y * diff, dz = _va.z * diff;
          if (!s.a.pinned) { s.a.pos.x += dx; s.a.pos.y += dy; s.a.pos.z += dz; }
          if (!s.b.pinned) { s.b.pos.x -= dx; s.b.pos.y -= dy; s.b.pos.z -= dz; }
        }
        if (R.collide) for (const p of R.r.pts) if (!p.pinned) collidePt(p, cds);
        for (const p of R.r.pts) if (!p.pinned && p.pos.y < 0.02) p.pos.y = 0.02;
      }
    }
  }
  function orientBox(mesh, a, b) {
    const pA = a.pos || a;
    const pB = b.pos || b;
    _d.subVectors(pB, pA);
    const len = _d.length(); if (len < 1e-5) return;
    _d.multiplyScalar(1 / len);
    mesh.position.copy(pA).addScaledVector(_d, len * 0.5);
    _q.setFromUnitVectors(_up, _d);
    mesh.quaternion.copy(_q); mesh.scale.y = len;
  }
  function orientPanel(mesh, tl, tr, bl, br) {
    mesh.position.set(
      (tl.x + tr.x + bl.x + br.x) * 0.25,
      (tl.y + tr.y + bl.y + br.y) * 0.25,
      (tl.z + tr.z + bl.z + br.z) * 0.25);
    _upv.set((bl.x + br.x - tl.x - tr.x) * 0.5, (bl.y + br.y - tl.y - tr.y) * 0.5, (bl.z + br.z - tl.z - tr.z) * 0.5);
    _right.set((tr.x + br.x - tl.x - bl.x) * 0.5, (tr.y + br.y - tl.y - bl.y) * 0.5, (tr.z + br.z - tl.z - bl.z) * 0.5);
    const h = Math.max(1e-4, _upv.length()), w = Math.max(1e-4, _right.length());
    _upv.multiplyScalar(1 / h); _right.multiplyScalar(1 / w);
    _fwd.crossVectors(_right, _upv).normalize();
    _m4.makeBasis(_right, _upv, _fwd);
    mesh.quaternion.setFromRotationMatrix(_m4);
    mesh.scale.set(w * 1.14, h * 1.14, 0.04);
  }
  function renderRopes(ropes) {
    for (const R of ropes) for (const sg of R.segs) orientBox(sg.mesh, sg.a, sg.b);
  }
  const _tmpObj = new THREE.Object3D();
  function localToWorld(parent, x, y, z, out) {
    _tmpObj.position.set(x, y, z);
    parent.add(_tmpObj);
    _tmpObj.updateWorldMatrix(true, false);
    _tmpObj.getWorldPosition(out);
    parent.remove(_tmpObj);
    return out;
  }
  /* Inisialisasi kain SEKALI di frame pertama animate: pindahkan clothGroup
     ke scene (ruang world), tempatkan titik bebas dari posisi dunia anchor,
     lalu buat stick (panjang constraint diukur dari posisi dunia yang benar,
     sudah termasuk skala 0.64 & rotasi NPC). */
  function initCloth(n, L) {
    const scene = (typeof Game !== 'undefined' && Game.scene) ? Game.scene : null;
    if (!scene || !n.mesh) return false;
    n.mesh.updateWorldMatrix(true, true);
    if (L.clothGroup && L.clothGroup.parent !== scene) scene.add(L.clothGroup);
    // --- rok ---
    if (L.skirtPts && L.skirtBody && L.skirtRope && !L.skirtSticked) {
      L.skirtSticked = true;
      const SK_COLS = 12, SK_ROWS = 5;
      for (let r = 0; r < SK_ROWS; r++) for (let c = 0; c < SK_COLS; c++) {
        const p = L.skirtPts[r][c];
        if (r === 0) {
          if (p.anchor) p.anchor.getWorldPosition(p.pos);
        } else {
          const a = c / SK_COLS * Math.PI * 2;
          const rx = 0.32 + r * 0.072, rz = rx * 0.72;
          localToWorld(L.skirtBody, Math.cos(a) * rx, 0.02 - r * 0.225, Math.sin(a) * rz, p.pos);
        }
        p.prev.copy(p.pos);
      }
      const R = L.skirtRope;
      for (let r = 0; r < SK_ROWS - 1; r++) for (let c = 0; c < SK_COLS; c++) {
        const c2 = (c + 1) % SK_COLS;
        R.stick(L.skirtPts[r][c], L.skirtPts[r + 1][c], 1);
        R.stick(L.skirtPts[r][c], L.skirtPts[r + 1][c2], 0.5);
        R.stick(L.skirtPts[r][c2], L.skirtPts[r + 1][c], 0.5);
      }
      for (let r = 0; r < SK_ROWS; r++) for (let c = 0; c < SK_COLS; c++)
        R.stick(L.skirtPts[r][c], L.skirtPts[r][(c + 1) % SK_COLS], 0.9);
      for (let r = 0; r < SK_ROWS - 2; r++) for (let c = 0; c < SK_COLS; c++)
        R.stick(L.skirtPts[r][c], L.skirtPts[r + 2][c], 0.35);
    }
    // --- strip kain ---
    if (L.stripSpec) {
      for (const sp of L.stripSpec) {
        sp.p0.pos.copy(sp.bottom.pos); sp.p0.prev.copy(sp.bottom.pos);
        sp.p1.pos.set(sp.p0.pos.x, sp.p0.pos.y - sp.l1, sp.p0.pos.z); sp.p1.prev.copy(sp.p1.pos);
        sp.p2.pos.set(sp.p0.pos.x, sp.p0.pos.y - sp.l1 - sp.l2, sp.p0.pos.z); sp.p2.prev.copy(sp.p2.pos);
        sp.rope.stick(sp.p0, sp.p1); sp.rope.stick(sp.p1, sp.p2);
      }
      L.stripSpec = null;
    }
    // --- cape cloth physics (simulasi kain jubah 12 panel) ---
    if (L.capeSpec && !L.capeSticked) {
      L.capeSticked = true;
      const spec = L.capeSpec, pts = spec.pts, rows = spec.rows;
      for (let r = 0; r < rows; r++) for (let c = 0; c < 4; c++) {
        const p = pts[r][c];
        if (r === 0) { if (p.anchor) p.anchor.getWorldPosition(p.pos); }
        else localToWorld(spec.torso, spec.colX[c], 0.60 - r * 0.24, -0.26 - r * 0.045, p.pos);
        p.prev.copy(p.pos);
      }
      const R = spec.rope;
      // Stick vertikal (menjaga panjang jubah)
      for (let r = 0; r < rows - 1; r++) for (let c = 0; c < 4; c++) R.stick(pts[r][c], pts[r + 1][c], 1.0);
      // Stick horizontal (menjaga lebar jubah melintang)
      for (let r = 0; r < rows; r++) for (let c = 0; c < 3; c++) R.stick(pts[r][c], pts[r][c + 1], 0.9);
      // Stick silang / shear diagonal (mencegah kain melipat / terpelintir)
      for (let r = 0; r < rows - 1; r++) for (let c = 0; c < 3; c++) {
        R.stick(pts[r][c], pts[r + 1][c + 1], 0.45);
        R.stick(pts[r][c + 1], pts[r + 1][c], 0.45);
      }
      // Stick resistensi lentur (loncat 1 baris)
      for (let r = 0; r < rows - 2; r++) for (let c = 0; c < 4; c++) R.stick(pts[r][c], pts[r + 2][c], 0.25);
    }
    if (L.clothGroup) L.clothGroup.visible = true;
    L.clothInit = true;
    return true;
  }
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

  let glowTexW = null;
  function getGlowTex() {
    if (!glowTexW && typeof document !== 'undefined') {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
      gr.addColorStop(0, 'rgba(255,255,255,0.75)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      glowTexW = new THREE.CanvasTexture(c);
    }
    return glowTexW;
  }

  /* Partikel aliran sedot nyawa (darah & jiwa) mengalir dari korban ke tongkat (1:1 prototipe) */
  const _beamParts = [];
  const _BP_MAX = 36;
  let _bpIdx = 0;
  function spawnBeamParticle(pos, vel, size, color, life) {
    if (_beamParts.length < _BP_MAX) {
      const m = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: 0xff3344, transparent: true, depthWrite: false }));
      m.visible = false;
      m.frustumCulled = false;
      m.renderOrder = 1001;
      _beamParts.push({ m, vel: new THREE.Vector3(), life: 0, max: 1, size: 0.1 });
    }
    const sc = (typeof Game !== 'undefined' && Game.scene) ? Game.scene : null;
    const p = _beamParts[_bpIdx];
    _bpIdx = (_bpIdx + 1) % _beamParts.length;
    if (sc && p.m.parent !== sc) sc.add(p.m);
    p.m.visible = true;
    p.m.position.copy(pos);
    p.vel.copy(vel);
    p.size = size;
    p.life = p.max = life;
    p.m.scale.setScalar(size);
    p.m.material.color.set(color);
    p.m.material.opacity = 1.0;
  }
  function updateBeamParticles(dt) {
    for (let i = 0; i < _beamParts.length; i++) {
      const p = _beamParts[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.m.visible = false;
        continue;
      }
      p.m.position.addScaledVector(p.vel, dt);
      const f = p.life / p.max;
      p.m.scale.setScalar(Math.max(0.001, p.size * f));
      p.m.material.opacity = f;
    }
  }

  const C = {
    rBlack: 0x161a20, rBlack2: 0x21272f, green: 0x1e5c37, green2: 0x2f8a4e, trim: 0x43b468,
    bone: 0xd8d0b8, bone2: 0xb9b096, dark: 0x0c0e11, metal: 0x9aa3ae, metal2: 0x646c77,
    wood: 0x3b2c1e, wood2: 0x241a10, dirt: 0x6b4f33, runeMat: 0x0c1210
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
      dur: 3.4,
      shRx: { t: [0, .50, .90, 2.30, 2.90, 3.40], v: [-.18, -2.70, -2.85, -2.50, -1.00, -.18] },
      shLx: { t: [0, .50, .90, 2.30, 2.90, 3.40], v: [0, -2.40, -2.60, -2.30, -.80, 0] },
      elRx: { t: [0, .50, 2.90, 3.40], v: [.30, .22, .35, .30] },
      elLx: { t: [0, .50, 2.90, 3.40], v: [.12, .35, .25, .12] },
      shLz: { t: [0, .60, 2.80, 3.40], v: [.12, .45, .20, .12] },
      shRz: { t: [0, .60, 2.80, 3.40], v: [-.12, -.45, -.20, -.12] },
      torx: { t: [0, .50, .90, 2.50, 3.40], v: [0, -.10, -.14, -.05, .04] },
      headx: { t: [0, .60, 2.40, 3.40], v: [0, -.28, -.20, -.02] }
    },
    drain: {
      // Laser merah: channel 10 detik, sedot 5%/detik dari TOTAL HP Lich.
      // Pose tahan (hold) dari t=0.8 sampai t=9.3, lalu lepas.
      dur: 10.0,
      shRx: { t: [0, .50, .80, 9.30, 9.70, 10.0], v: [-.18, -.90, -1.32, -1.32, -.70, -.18] },
      elRx: { t: [0, .50, .80, 9.40, 10.0], v: [.30, .15, .08, .08, .30] },
      shLx: { t: [0, .50, .80, 9.40, 10.0], v: [0, -.35, -.55, -.40, 0] },
      elLx: { t: [0, .80, 9.40, 10.0], v: [.12, .15, .20, .12] },
      torx: { t: [0, .50, .80, 9.40, 10.0], v: [.04, .12, .18, .14, .04] },
      tory: { t: [0, .60, 9.40, 10.0], v: [0, .08, .04, 0] },
      headx: { t: [0, .60, 9.40, 10.0], v: [0, .14, .08, 0] },
      bodyy: { t: [0, .60, 9.40, 10.0], v: [0, -.05, -.03, 0] }
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

      // ==== ROK CLOTH PHYSICS PENUH (12 kolom x 5 baris, verlet) ====
      // Kain di-simulasikan di RUANG WORLD. Posisi awal titik & stick dibuat
      // LAZY di frame pertama animate (initCloth), saat transform NPC sudah
      // final — anchor memberi posisi dunia yang benar.
      const clothGroup = new THREE.Group();
      clothGroup.visible = false; // tampil setelah initCloth frame pertama
      outer.add(clothGroup);
      L.clothGroup = clothGroup;
      const SK_COLS = 12, SK_ROWS = 5;
      const ropes = [];
      const skirtRope = new VRope();
      const skirtPts = [];
      for (let r = 0; r < SK_ROWS; r++) {
        skirtPts[r] = [];
        for (let c = 0; c < SK_COLS; c++) {
          const a = c / SK_COLS * Math.PI * 2;
          const rx = 0.32 + r * 0.072, rz = rx * 0.72;
          const x = Math.cos(a) * rx, z = Math.sin(a) * rz;
          if (r === 0) {
            const anc = new THREE.Object3D(); anc.position.set(x, 0.02, z); body.add(anc);
            skirtPts[r][c] = skirtRope.point(0, -50, 0, true, anc);
          } else skirtPts[r][c] = skirtRope.point(0, -50, 0);
        }
      }
      ropes.push({ r: skirtRope, segs: [], wind: 0.7, collide: true });
      L.skirtPts = skirtPts; L.skirtBody = body; L.skirtRope = skirtRope;

      const skirtPanels = [];
      for (let r = 0; r < SK_ROWS - 1; r++) for (let c = 0; c < SK_COLS; c++) {
        let mat;
        if (r === SK_ROWS - 2) mat = M(C.green);
        else if (c === 3) mat = M(C.green);
        else if ((r === 1 && c === 8) || (r === 2 && c === 5)) mat = M(C.green2);
        else mat = ((r + c) % 2) ? M(C.rBlack) : M(C.rBlack2);
        const m = new THREE.Mesh(BOX, mat);
        clothGroup.add(m);
        skirtPanels.push(m);
      }
      L.skirtPanels = skirtPanels;
      // Pinggang rok padat (menutupi pangkal kain)
      V(M(C.rBlack2), 0.66, 0.16, 0.48, 0, -0.01, 0, body);
      V(M(C.rBlack), 0.68, 0.05, 0.50, 0, -0.10, 0, body);
      // Strip kain menjuntai di bawah rok (12 strip, 2 segmen verlet;
      // posisi & stick diisi lazy di initCloth mengikuti titik bawah rok)
      L.stripSpec = [];
      for (let c = 0; c < SK_COLS; c++) {
        const bottom = skirtPts[SK_ROWS - 1][c];
        const rp = new VRope();
        const l1 = 0.12 + (c % 3) * 0.02, l2 = 0.10 + (c % 2) * 0.07;
        const p0 = rp.point(0, -50, 0, true, null, bottom);
        const p1 = rp.point(0, -50, 0);
        const p2 = rp.point(0, -50, 0);
        const mat = (c % 3 === 0) ? M(C.trim) : (c % 2 ? M(C.rBlack) : M(C.rBlack2));
        const m1 = V(mat, 0.16, 1, 0.04); clothGroup.add(m1);
        const m2 = V(mat, 0.12, 1, 0.035); clothGroup.add(m2);
        ropes.push({ r: rp, segs: [{ mesh: m1, a: p0, b: p1 }, { mesh: m2, a: p1, b: p2 }], wind: 0.8 });
        L.stripSpec.push({ rope: rp, p0, p1, p2, bottom, l1, l2 });
      }

      // Torso & tulang rusuk
      V(M(C.rBlack),  0.50, 0.24, 0.32, 0, 0.12, 0, torso);
      V(M(C.rBlack2), 0.58, 0.44, 0.36, 0, 0.44, 0, torso);
      V(M(C.dark),    0.30, 0.30, 0.05, 0, 0.46, 0.175, torso);
      for (let i = 0; i < 3; i++) V(M(C.bone), 0.26, 0.045, 0.05, 0, 0.38 + i * 0.08, 0.195, torso);
      V(M(C.bone2), 0.05, 0.26, 0.05, 0, 0.45, 0.205, torso);
      V(M(C.green), 0.05, 0.44, 0.02, -0.21, 0.44, 0.185, torso);
      V(M(C.green), 0.05, 0.44, 0.02,  0.21, 0.44, 0.185, torso);
      V(M(0x241a10), 0.56, 0.09, 0.36, 0, 0.16, 0, torso); // sabuk
      V(M(C.bone), 0.10, 0.09, 0.04, 0, 0.16, 0.19, torso); // tengkorak sabuk
      V(M(C.dark), 0.02, 0.025, 0.02, -0.025, 0.172, 0.213, torso);
      V(M(C.dark), 0.02, 0.025, 0.02,  0.025, 0.172, 0.213, torso);
      // (Jubah belakang statis digantikan cape cloth physics di bawah)

      V(M(C.rBlack), 0.12, 0.30, 0.30, -0.24, 0.66, -0.02, torso, 0, 0,  0.22);
      V(M(C.rBlack), 0.12, 0.30, 0.30,  0.24, 0.66, -0.02, torso, 0, 0, -0.22);
      V(M(C.rBlack2), 0.62, 0.14, 0.08, 0, 0.62, -0.23, torso);
      V(M(C.trim), 0.07, 0.07, 0.05, -0.24, 0.62, -0.27, torso);
      V(M(C.trim), 0.07, 0.07, 0.05,  0.24, 0.62, -0.27, torso);
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
      V(M(C.bone2), 0.42, 0.08, 0.08, 0, 0.33, 0.17, head);
      const eyeMat = new THREE.MeshLambertMaterial({ color: 0x0a0c08, emissive: 0x8bff45 });
      L.eyeMat = eyeMat;
      V(eyeMat, 0.09, 0.07, 0.04, -0.10, 0.245, 0.205, head);
      V(eyeMat, 0.09, 0.07, 0.04,  0.10, 0.245, 0.205, head);
      V(M(C.dark), 0.06, 0.10, 0.06, -0.165, 0.16, 0.16, head);
      V(M(C.dark), 0.06, 0.10, 0.06,  0.165, 0.16, 0.16, head);
      V(M(C.bone2), 0.28, 0.12, 0.30, 0, 0.10, 0.04, head);
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
      V(M(C.wood2), 0.10, 0.30, 0.10,  0.01, 0.30, 0.01, staff, 0, 0.5, 0.05);
      V(M(C.wood2), 0.10, 0.30, 0.10, -0.01, 0.90, -0.01, staff, 0, 1.1, -0.05);
      V(M(C.wood2), 0.10, 0.26, 0.10,  0.01, 1.45, 0.01, staff, 0, 1.7, 0.04);
      V(M(C.metal2), 0.11, 0.05, 0.11, 0, 0.05, 0, staff);
      V(M(C.metal2), 0.11, 0.05, 0.11, 0, 1.62, 0, staff);
      V(M(C.wood2), 0.10, 0.30, 0.10, 0.01, 0.30, 0.01, staff, 0, 0.5, 0.05);
      V(M(C.bone),  0.16, 0.15, 0.16, 0, 1.74, 0.03, staff); // rune hijau di batang tongkat
      for (let i = 0; i < 5; i++) V(M(C.green), 0.03, 0.07, 0.02, 0, 0.20 + i * 0.32, 0.055, staff);
      // tengkorak tongkat

      const orbMat = new THREE.MeshLambertMaterial({ color: 0x0c1210, emissive: 0x59ff8f });
      const satMat = new THREE.MeshLambertMaterial({ color: 0x101614, emissive: 0x7dffb0 });
      const orb = new THREE.Object3D();
      orb.position.set(0, 2.14, 0);
      staff.add(orb);
      L.orb = orb;
      V(orbMat, 0.24, 0.24, 0.24, 0, 0, 0, orb);
      L.orbMat = orbMat; L.satMat = satMat;
      V(orbMat, 0.18, 0.18, 0.18, 0, 0, 0, orb, 0.6, 0.7, 0.3);

      const sats = new THREE.Object3D();
      orb.add(sats);
      L.sats = sats;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        V(satMat, 0.06, 0.06, 0.06, Math.cos(a) * 0.27, Math.sin(a * 2) * 0.06, Math.sin(a) * 0.27, sats);
      }

      const gt = getGlowTex();
      if (gt) {
        const orbGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color: 0x59ff8f, transparent: true, depthWrite: false }));
        orbGlow.scale.set(1.15, 1.15, 1);
        orb.add(orbGlow);
        L.orbGlow = orbGlow;
      }

      const tipAnchor = new THREE.Object3D();
      tipAnchor.position.y = 0.08;
      orb.add(tipAnchor);
      L.tip = tipAnchor;

      // ==== JUBAH BELAKANG / CAPE CLOTH SIMULATION (4 kolom x 5 baris = 20 titik, 12 panel) ====
      // Simulasi kain ringan: 20 partikel verlet, 12 panel quad bersambung (tanpa celah),
      // gravitasi, angin kibaran gerak, dan collision tubuh.
      {
        const colX = [-0.27, -0.09, 0.09, 0.27], rows = 5;
        const pts = [];
        const rp = new VRope();
        for (let r = 0; r < rows; r++) {
          pts[r] = [];
          for (let c = 0; c < 4; c++) {
            if (r === 0) {
              const anc = new THREE.Object3D(); anc.position.set(colX[c], 0.60, -0.26); torso.add(anc);
              pts[r][c] = rp.point(0, -50, 0, true, anc);
            } else pts[r][c] = rp.point(0, -50, 0);
          }
        }
        const capePanels = [];
        for (let r = 0; r < rows - 1; r++) for (let c = 0; c < 3; c++) {
          let mat;
          if (r === rows - 2) mat = M(C.green);
          else if (r === rows - 3 && c === 1) mat = M(C.green2);
          else mat = ((r + c) % 2) ? M(C.rBlack) : M(C.rBlack2);
          const m = new THREE.Mesh(BOX, mat);
          clothGroup.add(m);
          capePanels.push(m);
        }
        L.capePanels = capePanels;
        ropes.push({ r: rp, segs: [], wind: 1.0, collide: true });
        L.capeSpec = { rope: rp, pts, rows, colX, torso };
      }
      L.ropes = ropes;
      L.colliders = [
        { a: new THREE.Vector3(), b: new THREE.Vector3(), r: 0.155 },
        { a: new THREE.Vector3(), b: new THREE.Vector3(), r: 0.155 },
        { a: new THREE.Vector3(), b: new THREE.Vector3(), r: 0.16 }
      ];

      // Lingkaran sihir elemen KEGELAPAN (port 1:1 Magic circle.html) tepat di bawah model Lich
      let darkCircle = null;
      let circle = null;
      if (typeof MagicCircle !== 'undefined' && MagicCircle.createInstance) {
        darkCircle = MagicCircle.createInstance('dark', 2.3, { dur: 0 });
        circle = darkCircle.group;
        circle.position.set(0, 0.02, 0);
      } else {
        circle = new THREE.Group();
      }
      circle.visible = false;
      outer.add(circle);
      L.circle = circle;
      L.darkCircle = darkCircle;

      // Beam sedot nyawa + 2 garis pilin (ala prototipe beamLines 1:1)
      // Diletakkan di ruang scene dunia (bukan lokal outer rig) agar koordinat world tidak bergeser
      const beamCore = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({
        color: 0xff2244,
        transparent: true,
        opacity: 0.9,
        depthWrite: false
      }));
      beamCore.visible = false;
      beamCore.frustumCulled = false;
      beamCore.renderOrder = 999;
      L.beamCore = beamCore;

      L.beamLines = [];
      for (let i = 0; i < 2; i++) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(14 * 3), 3));
        const ln = new THREE.Line(geo, new THREE.LineBasicMaterial({
          color: i ? 0xff7788 : 0xcc1133,
          transparent: true,
          opacity: 0.85,
          depthWrite: false
        }));
        ln.visible = false;
        ln.frustumCulled = false;
        ln.renderOrder = 1000;
        L.beamLines.push(ln);
      }

      return {
        mesh: outer,
        parts: {
          rare: { kind: 'lich' },
          L,
          bodyY: 1.45 * 0.64
        }
      };
    },

    /* Dipanggil NPCS.despawn: tenggelamkan zombie & buang proyektil/beam
       supaya tak ada mesh yatim yang beku tertinggal saat Lich mati/hilang. */
    cleanup(n) {
      const S = n._lichState;
      if (S) {
        for (const z of (S.zombies || [])) {
          if (z.g && z.g.parent) z.g.parent.remove(z.g);
        }
        S.zombies = [];
        for (const b of (S.bolts || [])) {
          if (b.mesh && b.mesh.parent) b.mesh.parent.remove(b.mesh);
        }
        S.bolts = [];
      }
      const L = n.parts && n.parts.L;
      if (L) {
        if (L.circle) L.circle.visible = false;
        if (L.darkCircle) { L.darkCircle.fading = false; L.darkCircle.dead = false; }
        if (L.beamCore) {
          L.beamCore.visible = false;
          if (L.beamCore.parent) L.beamCore.parent.remove(L.beamCore);
        }
        if (L.beamLines) {
          for (const ln of L.beamLines) {
            ln.visible = false;
            if (ln.parent) ln.parent.remove(ln);
          }
        }
        // Kain sudah dipindah ke scene: buang agar tak tertinggal melayang
        if (L.clothGroup && L.clothGroup.parent) L.clothGroup.parent.remove(L.clothGroup);
      }
      for (const p of _beamParts) {
        p.life = 0;
        p.m.visible = false;
        if (p.m.parent) p.m.parent.remove(p.m);
      }
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
          chargeCd: 0,
          eyeBoost: 0,
          beamPCd: 0,
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

      // 1. Skill Sedot Nyawa (Life Drain Beam) (CD 16s) - PRIORITAS UTAMA saat HP Lich dibawah 50%
      const lichMax = (typeof NPCS !== 'undefined' && NPCS.npcMaxHp) ? NPCS.npcMaxHp(n) : (n.maxhp || n.maxHp || 600);
      const hpRatio = (n.hp || lichMax) / lichMax;
      const drCost = (typeof NPCS !== 'undefined' && NPCS.skillStamCost) ? NPCS.skillStamCost(n, 32) : 32;
      if (S.drainCd <= 0 && hpRatio < 0.50 && d < 12 && (n.stamina || 0) >= drCost) {
        n.stamina = (n.stamina || 0) - drCost;
        n.stamRegenT = 1.8;
        S.drainCd = 16.0;
        this.startCast(n, 'drain', tgt);
        return true;
      }

      // 2. Skill Summon 3 Zombie (CD 24s) - dipanggil saat musuh mendekat
      const sumCost = (typeof NPCS !== 'undefined' && NPCS.skillStamCost) ? NPCS.skillStamCost(n, 40) : 40;
      if (S.summonCd <= 0 && S.zombies.length < 3 && (n.stamina || 0) >= sumCost && d < 18) {
        n.stamina = (n.stamina || 0) - sumCost;
        n.stamRegenT = 2.0;
        S.summonCd = 24.0;
        this.startCast(n, 'summon', tgt);
        return true;
      }

      // 3. SERANGAN DASAR: Tembakan Proyektil Arcane Bolt Petir Ungu (seperti elfmage & magesupport)
      if (n.atkCd <= 0 && d < 18) {
        n.atkCd = 0.95;
        n.swing = 0.28;
        this.spawnBolt(n, tgt);
      }

      // Bila musuh sempat merapat ke jarak melee (<2.1 blok), musuh tetap bisa membalas memukul
      const m = tgt;
      if (m.atkCd !== undefined && m.atkCd <= 0 && d < 2.1) {
        m.atkCd = 1.1;
        if (typeof NPCS !== 'undefined' && NPCS.hurt) NPCS.hurt(n, m.dmg || 15);
      }

      return true; // SELALU return true: Lich bertarung proyektil jarak jauh penuh tanpa fallback ke melee biasa!
    },

    startCast(n, action, target) {
      if (!target || target.dead) return;
      // Jangan cast pada hewan ternak/innocent atau mob pet
      if (target.pet || (typeof Monsters !== 'undefined' && Monsters.isAnimal && Monsters.isAnimal(target))) return;
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
        S.circleT = 0;
        const L = n.parts && n.parts.L;
        if (L) {
          if (!L.darkCircle && typeof MagicCircle !== 'undefined' && MagicCircle.createInstance) {
            L.darkCircle = MagicCircle.createInstance('dark', 2.3, { dur: 0 });
            if (L.circle && L.circle.parent) L.circle.parent.remove(L.circle);
            L.circle = L.darkCircle.group;
            L.circle.position.set(0, 0.02, 0);
            if (n.mesh) n.mesh.add(L.circle);
          }
          if (L.darkCircle) {
            L.darkCircle.age = 0;
            L.darkCircle.fading = false;
            L.darkCircle.fadeT = 0;
            L.darkCircle.dead = false;
          }
          if (L.circle) {
            L.circle.visible = true;
          }
        }
        if (typeof Sfx !== 'undefined' && Sfx.at) Sfx.at(n.pos, 'craft');
      } else if (action === 'drain') {
        if (typeof Sfx !== 'undefined' && Sfx.at) Sfx.at(n.pos, 'magic');
      }
    },

    spawnBolt(n, target) {
      if (!target || target.dead || !target.pos) return;
      const S = this._st(n);
      const tipPos = new THREE.Vector3();
      if (n.parts.L && n.parts.L.tip) n.parts.L.tip.getWorldPosition(tipPos);
      else tipPos.copy(n.pos).add(new THREE.Vector3(0, 1.8, 0));

      const tgtPos = target.pos.clone().add(new THREE.Vector3(0, 1.1, 0));
      const boltMesh = new THREE.Group();
      const bMatA = new THREE.MeshBasicMaterial({ color: 0xa75dff });
      const bMatB = new THREE.MeshBasicMaterial({ color: 0xdcb8ff });
      const segs = [];
      for (let i = 0; i < 8; i++) {
        const seg = new THREE.Mesh(BOX, i % 2 ? bMatA : bMatB);
        seg.scale.set(0.07, 0.26, 0.07);
        seg.position.set(0, 0, i * 0.24);
        boltMesh.add(seg); segs.push(seg);
      }
      boltMesh.position.copy(tipPos);
      boltMesh.lookAt(tgtPos);
      if (typeof Game !== 'undefined' && Game.scene) Game.scene.add(boltMesh);
      if (typeof FX !== 'undefined' && FX.debris) FX.debris(tipPos, 0xb06bff, 8, 2.0);

      const baseDmg = (typeof NPCS !== 'undefined' && NPCS.npcDmg) ? NPCS.npcDmg(n) : 36;
      S.bolts.push({
        mesh: boltMesh, segs,
        pos: tipPos.clone(), dir: tgtPos.clone().sub(tipPos).normalize(),
        target: tgtPos, targetEnt: target,
        dmg: Math.round(baseDmg * 1.25),
        life: 1.4, t: 0, jt: 0
      });
      S.recoil = 0.35;
      if (typeof Sfx !== 'undefined' && Sfx.at) Sfx.at(n.pos, 'magic');
    },

    summonZombies(n) {
      const S = this._st(n);
      // Bersihkan zombie lama yang masih tersisa
      for (const z of S.zombies) {
        if (z.state !== 'sink') { z.state = 'sink'; z.t = 0; z.sinkY0 = z.g.position.y; }
      }
      const lvl = n.level || 1;
      const lichMax = (typeof NPCS !== 'undefined' && NPCS.npcMaxHp) ? NPCS.npcMaxHp(n) : (n.maxhp || n.maxHp || 600);
      const lichDmg = (typeof NPCS !== 'undefined' && NPCS.npcDmg) ? NPCS.npcDmg(n) : (n.dmg || 36);
      // Masing-masing zombie memiliki 30% dari HP Lich dan damage 40% dari Lich
      const zHp = Math.max(10, Math.round(lichMax * 0.30));
      const zDmg = Math.max(5, Math.round(lichDmg * 0.40));
      const zDur = 20.0 + Math.min(20.0, (lvl - 1) * 0.4);

      const spots = [[-1.6, 1.8], [0.0, 2.7], [1.6, 1.8]];
      const yaw = n.mesh.rotation.y;
      const c = Math.cos(yaw), s = Math.sin(yaw);

      for (let i = 0; i < 3; i++) {
        const b = buildZombieModel(i);
        const lx = spots[i][0], lz = spots[i][1];
        const wx = n.pos.x + lx * c - lz * s;
        const wz = n.pos.z + lx * s + lz * c;
        let wy = (typeof World !== 'undefined' && World.groundAt) ? World.groundAt(wx, wz, n.pos.y + 2) : n.pos.y;
        // Fallback: bila tak ada lantai terbaca (void/lubang), pakai tanah
        // di bawah Lich supaya zombie tidak spawn & tenggelam di kehampaan.
        if (!wy || wy <= 0) wy = (typeof World !== 'undefined' && World.groundAt)
          ? (World.groundAt(n.pos.x, n.pos.z, n.pos.y + 2) || n.pos.y) : n.pos.y;

        b.g.position.set(wx, wy - 1.8, wz);
        b.g.visible = true;
        b.g.userData._groundY = wy; // tinggi permukaan tanah final
        if (typeof Game !== 'undefined' && Game.scene) Game.scene.add(b.g);

        S.zombies.push({
          ...b,
          hp: zHp,
          maxhp: zHp,
          dmg: zDmg,
          maxLife: zDur,
          life: zDur,
          state: 'rising',
          riseY0: wy - 1.8, // mulai dari dalam tanah
          groundY: wy,
          homeX: wx, // titik kubur: zombie berkeliaran di sekitar sini
          homeZ: wz,
          wandA: rand(0, 6.28),
          wandT: rand(1, 3),
          t: 0,
          sw: 0,
          hitDone: false,
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
      S.recoil = Math.max(0, (S.recoil || 0) * Math.exp(-dt * 6));

      // Rotate Orb & Satellites + glow shift (ala updateGlow prototipe)
      if (L.sats) L.sats.rotation.y += dt * 3.5;
      if (L.orb) L.orb.rotation.y += dt * 1.2;
      if (L.staff) {
        let vibr = 0;
        if (n.swing > 0 || (S.cast && S.cast.action === 'attack' && S.cast.t < 0.55)) {
          const tt = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
          vibr = Math.sin(tt * 55) * 0.02;
        }
        let staffRx = 0.12 - (S.recoil || 0) + (n.swing > 0 ? (n.swing / 0.28) * 0.40 : 0);
        let staffRy = 0;
        let staffRz = -0.06 + vibr;

        // Saat laser lifesteal (drain): arahkan tongkat ke depan dan sedikit serong ke atas
        if (S.cast && S.cast.action === 'drain') {
          const c = S.cast;
          const drainW = Math.min(ss(clamp(c.t / 0.6, 0, 1)), ss(clamp((c.dur - c.t) / 0.6, 0, 1)));
          if (drainW > 0) {
            staffRx = lerp(0.12 - (S.recoil || 0), 2.40, drainW);
            staffRz = lerp(-0.06 + vibr, -0.12, drainW);
            staffRy = 0;
          }
        }
        L.staff.rotation.set(staffRx, staffRy, staffRz);
      }
      {
        let charge = 0, drainOn = 0;
        if (n.swing > 0) {
          charge = Math.min(1, n.swing / 0.28);
        } else if (S.cast && S.cast.action === 'attack') {
          const T = S.cast.t;
          const cl = (v, a, b) => Math.min(b, Math.max(a, v));
          charge = cl((T - 0.05) / 0.4, 0, 1) * (T < 0.75 ? 1 : cl(1 - (T - 0.75) / 0.3, 0, 1));
        }
        if (S.cast && S.cast.action === 'drain' && L.beamCore && L.beamCore.visible) drainOn = 1;
        S.eyeBoost = Math.max(0, (S.eyeBoost || 0) - dt);
        const tt = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
        const tmpC = new THREE.Color(0x59ff8f);
        if (charge > 0) tmpC.lerp(new THREE.Color(0xb055ff), charge);
        if (drainOn) tmpC.lerp(new THREE.Color(0xff3344), 0.9);
        if (L.orbMat) {
          L.orbMat.emissive.copy(tmpC).multiplyScalar(0.9 + 0.12 * Math.sin(tt * 3) + charge * 0.4 + drainOn * 0.3);
        }
        if (L.satMat) {
          L.satMat.emissive.copy(L.orbMat.emissive);
        }
        if (L.orbGlow) {
          L.orbGlow.material.color.copy(tmpC);
          L.orbGlow.scale.setScalar(1.15 + Math.sin(tt * 3) * 0.1 + charge * 0.6 + drainOn * 0.35);
        }
        if (L.eyeMat) {
          const summonW = (S.cast && S.cast.action === 'summon') ? 0.5 : 0;
          L.eyeMat.emissive.setHex(0x8bff45).multiplyScalar(0.85 + 0.15 * Math.sin(tt * 2.6) + summonW + (S.eyeBoost || 0) * 0.9);
        }
        if (L.orb) {
          L.orb.scale.setScalar(1 + Math.sin(tt * 2.4) * 0.05 + charge * 0.28 + drainOn * 0.12);
        }
      }

      // Circle summon KEGELAPAN (port 1:1 Magic circle.html):
      if (L.circle && L.circle.visible) {
        if (!L.darkCircle && typeof MagicCircle !== 'undefined' && MagicCircle.createInstance) {
          L.darkCircle = MagicCircle.createInstance('dark', 2.3, { dur: 0 });
          if (L.circle.parent) L.circle.parent.remove(L.circle);
          L.circle = L.darkCircle.group;
          L.circle.position.set(0, 0.02, 0);
          if (n.mesh) n.mesh.add(L.circle);
        }
        if (L.darkCircle) {
          const tt = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
          if (S.cast && S.cast.action === 'summon') {
            L.darkCircle.update(dt, tt);
          } else {
            L.darkCircle.fading = true;
            L.darkCircle.update(dt, tt);
            if (L.darkCircle.dead || L.darkCircle.fadeT >= 0.8) {
              L.circle.visible = false;
              L.darkCircle.dead = false;
              L.darkCircle.fading = false;
            }
          }
        }
      }
      // Update Action Cast
      if (S.cast) {
        S.cast.t += dt;
        S.actionT = S.cast.t;
        const c = S.cast;

        if (c.action === 'attack') {
          if (c.t > 0.06 && c.t < 0.5 && L.tip && typeof FX !== 'undefined' && FX.debris) {
            S.chargeCd -= dt;
            if (S.chargeCd <= 0) {
              S.chargeCd = 0.09;
              const tp = new THREE.Vector3();
              L.tip.getWorldPosition(tp);
              FX.debris(tp, 0xb06bff, 2, 1.0);
            }
          }
          if (!c.fired && c.t >= 0.55) {
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

          // Target tidak boleh mati/tewas, tidak boleh kosong, tidak boleh hewan ternak/innocent, dan tidak boleh pet
          const isInvalid = !c.target || c.target.dead || (c.target.hp !== undefined && c.target.hp <= 0) || !c.target.pos ||
            c.target.pet || (typeof Monsters !== 'undefined' && Monsters.isAnimal && Monsters.isAnimal(c.target));

          if (isInvalid) {
            // Target mati / tidak sah: HENTIKAN lifesteal & animasi SEKETIKA
            if (L.beamCore) L.beamCore.visible = false;
            if (L.beamLines) for (const ln of L.beamLines) ln.visible = false;
            S.action = null;
            S.cast = null;
            return;
          }

          const d = c.target.pos.distanceTo(n.pos);
          if (d > 16) {
            // Target keluar jangkauan: hentikan lifesteal & animasi
            if (L.beamCore) L.beamCore.visible = false;
            if (L.beamLines) for (const ln of L.beamLines) ln.visible = false;
            S.action = null;
            S.cast = null;
            return;
          }

          const scene = (typeof Game !== 'undefined' && Game.scene) ? Game.scene : null;
          if (scene) {
            if (L.beamCore && L.beamCore.parent !== scene) scene.add(L.beamCore);
            if (L.beamLines) {
              for (const ln of L.beamLines) {
                if (ln.parent !== scene) scene.add(ln);
              }
            }
          }

          const tipW = new THREE.Vector3();
          if (L.tip) L.tip.getWorldPosition(tipW);
          else tipW.copy(n.pos).add(new THREE.Vector3(0, 1.8, 0));

          const tgtW = c.target.pos.clone().add(new THREE.Vector3(0, 1.2, 0));
          const tt = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
          tgtW.x += Math.sin(tt * 11) * 0.06;
          tgtW.y += Math.cos(tt * 9) * 0.05;

          // Orient beamCore box: midpoint, arah, dan panjang (persis prototipe Lich.html)
          orientBox(L.beamCore, tipW, tgtW);
          L.beamCore.visible = true;
          L.beamCore.scale.x = L.beamCore.scale.z = 0.055 + Math.sin(tt * 35) * 0.02 + 0.02;

          // 2 garis pilin sinus merah persis Lich.html
          if (L.beamLines) {
            const bDir = new THREE.Vector3().subVectors(tgtW, tipW);
            const bLen = bDir.length();
            if (bLen > 1e-4) {
              bDir.normalize();
              const pp = new THREE.Vector3().crossVectors(bDir, _up);
              if (pp.lengthSq() < 1e-5) pp.set(1, 0, 0); else pp.normalize();
              const pp2 = new THREE.Vector3().crossVectors(bDir, pp).normalize();
              for (let li = 0; li < L.beamLines.length; li++) {
                const ln = L.beamLines[li];
                ln.visible = true;
                const arr = ln.geometry.attributes.position.array;
                for (let j = 0; j < 14; j++) {
                  const u = j / 13, env = Math.sin(u * Math.PI);
                  const bx = tipW.x + bDir.x * bLen * u
                    + pp.x * Math.sin(u * 14 - tt * 22 + li * 3) * 0.14 * env
                    + pp2.x * Math.cos(u * 11 - tt * 18 + li * 2) * 0.10 * env;
                  const by = tipW.y + bDir.y * bLen * u
                    + pp.y * Math.sin(u * 14 - tt * 22 + li * 3) * 0.14 * env
                    + pp2.y * Math.cos(u * 11 - tt * 18 + li * 2) * 0.10 * env;
                  const bz = tipW.z + bDir.z * bLen * u
                    + pp.z * Math.sin(u * 14 - tt * 22 + li * 3) * 0.14 * env
                    + pp2.z * Math.cos(u * 11 - tt * 18 + li * 2) * 0.10 * env;
                  arr[j * 3] = bx; arr[j * 3 + 1] = by; arr[j * 3 + 2] = bz;
                }
                ln.geometry.attributes.position.needsUpdate = true;
              }
            }
          }

          // Partikel sedot darah & jiwa mengalir dari korban ke tongkat (1:1 Lich.html)
          S.beamPCd = (S.beamPCd || 0) - dt;
          if (S.beamPCd <= 0) {
            S.beamPCd = 0.045;
            const p = tgtW.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.25));
            const v = tipW.clone().sub(p).multiplyScalar(2.2).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8));
            spawnBeamParticle(p, v, 0.07, Math.random() < 0.75 ? 0xff3344 : 0x6cff9a, 0.55);
          }

          // Sedot darah: 10% dari TOTAL (max) HP Lich per detik, disedot tiap 0.25 detik (2.5% per tick)
          if (c.drainTickT >= 0.25) {
            c.drainTickT = 0;
            const lichMax = (typeof NPCS !== 'undefined' && NPCS.npcMaxHp) ? NPCS.npcMaxHp(n) : (n.maxhp || n.maxHp || 600);
            const drainDmg = Math.max(1, Math.round(lichMax * 0.10 * 0.25));

            // Pastikan HP target benar-benar berkurang
            const prevTargetHp = (c.target.hp !== undefined) ? c.target.hp : drainDmg;
            if (typeof Monsters !== 'undefined' && Monsters.hurt) {
              Monsters.hurt(c.target, drainDmg, new THREE.Vector3(0, 0.1, 0), 0, n);
            }
            const actualDrained = Math.max(1, Math.min(drainDmg, prevTargetHp));

            // Pulihkan HP Lich sebesar yang benar-benar diserap dari musuh
            n.hp = Math.min(lichMax, (n.hp || 0) + actualDrained);
            n.hpT = 6;
            if (typeof FX !== 'undefined' && FX.text) {
              FX.text(n.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), `+${actualDrained} HP`, '#59ff8f');
            }

            // Jika musuh mati akibat sedotan ini: segera akhiri lifesteal & animasi
            if (c.target.dead || (c.target.hp !== undefined && c.target.hp <= 0)) {
              if (L.beamCore) L.beamCore.visible = false;
              if (L.beamLines) for (const ln of L.beamLines) ln.visible = false;
              if (typeof FX !== 'undefined' && FX.debris) {
                FX.debris(tgtW, 0xff3344, 12, 2.0);
              }
              S.action = null;
              S.cast = null;
              return;
            }
          }
        }

        if (c.action === 'drain' && !c.fired && c.t >= c.dur - 0.2) {
          c.fired = true;
          S.eyeBoost = 1.2;
          if (L.tip && typeof FX !== 'undefined' && FX.debris) {
            const tp = new THREE.Vector3();
            L.tip.getWorldPosition(tp);
            FX.debris(tp, 0x6cff9a, 10, 2.4);
            FX.debris(tp, 0xff3344, 6, 1.8);
          }
        }
        if (c.t >= c.dur) {
          if (L.circle) L.circle.visible = false;
          if (L.beamCore) L.beamCore.visible = false;
          if (L.beamLines) for (const ln of L.beamLines) ln.visible = false;
          S.action = null;
          S.cast = null;
        }
      } else {
        if (L.circle) L.circle.visible = false;
        if (L.beamCore) L.beamCore.visible = false;
        if (L.beamLines) for (const ln of L.beamLines) ln.visible = false;
      }
      updateBeamParticles(dt);

      // Update Zombies
      for (let i = S.zombies.length - 1; i >= 0; i--) {
        const z = S.zombies[i];
        z.t += dt;
        z.life -= dt;

        if (z.state === 'rising') {
          const u = Math.min(1, z.t / 0.95);
          const y0 = (z.riseY0 != null) ? z.riseY0 : z.g.position.y - 1.8 * (1 - u);
          const y1 = (z.groundY != null) ? z.groundY : (z.g.userData._groundY || z.g.position.y);
          z.g.position.y = y0 + (y1 - y0) * (u * u * (3 - 2 * u));
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
        } else if (z.state === 'chase' || z.state === 'fight' || z.state === 'swipe' || z.state === 'wander') {
          // Radius kendali zombie agar tidak menjauh dari Lich (maksimal 10 blok)
          const ZOMBIE_LEASH_RADIUS = 10.0;
          const distToLich = Math.hypot(z.g.position.x - n.pos.x, z.g.position.z - n.pos.z);

          // Jika Lich berpindah sangat jauh (> 22 blok), teleport zombie mendekat ke Lich
          if (distToLich > 22.0) {
            z.g.position.set(n.pos.x + (Math.random() - 0.5) * 2, n.pos.y, n.pos.z + (Math.random() - 0.5) * 2);
          }

          // Helper: entitas tidak sah (innocent seperti sapi/kuda/kelinci, pet, ruas kelabang, atau target mati)
          const isInvalidZombieTarget = (m) => {
            if (!m || m.dead || m.pet || !m.pos) return true;
            if (m.hp !== undefined && m.hp <= 0) return true;
            if (m.catchActive || m.type === 'kelabang_part') return true;
            if (typeof Monsters !== 'undefined' && Monsters.isAnimal && Monsters.isAnimal(m)) return true;
            return false;
          };

          // Cari musuh terdekat dalam radius kendali Lich (TIDAK BOLEH MENYERANG INNOCENT SEPERTI KUDA, SAPI, DLL)
          let bestFoe = (n.target && !isInvalidZombieTarget(n.target)) ? n.target : null;
          if (bestFoe && bestFoe.pos.distanceTo(n.pos) > ZOMBIE_LEASH_RADIUS + 3.0) {
            bestFoe = null;
          }
          if (!bestFoe && typeof Monsters !== 'undefined' && Monsters.list) {
            let bd = ZOMBIE_LEASH_RADIUS;
            for (const m of Monsters.list) {
              if (isInvalidZombieTarget(m)) continue;
              const dL = m.pos.distanceTo(n.pos);
              if (dL > ZOMBIE_LEASH_RADIUS) continue; // Hanya serang musuh di dekat Lich
              const dZ = m.pos.distanceTo(z.g.position);
              if (dZ < bd) { bd = dZ; bestFoe = m; }
            }
          }

          // Jika zombie sudah berada di luar radius leash Lich (> 10 blok),
          // paksa zombie kembali ke Lich agar selalu menjaga tuannya
          if (distToLich > ZOMBIE_LEASH_RADIUS) {
            const toLx = n.pos.x - z.g.position.x;
            const toLz = n.pos.z - z.g.position.z;
            const dL = Math.hypot(toLx, toLz);
            z.g.rotation.y = lerpAngle(z.g.rotation.y, Math.atan2(toLx, toLz), clamp(dt * 6, 0, 1));
            z.g.position.x += (toLx / dL) * 2.4 * dt;
            z.g.position.z += (toLz / dL) * 2.4 * dt;
            z.state = 'chase';
          } else if (bestFoe) {
            const dx = bestFoe.pos.x - z.g.position.x;
            const dz = bestFoe.pos.z - z.g.position.z;
            const dist = Math.hypot(dx, dz);
            z.g.rotation.y = lerpAngle(z.g.rotation.y, Math.atan2(dx, dz), clamp(dt * 6, 0, 1));

            if (z.state === 'swipe') {
              z.sw += dt / 0.55;
              const fw = new THREE.Vector3(Math.sin(z.g.rotation.y), 0, Math.cos(z.g.rotation.y));
              z.g.position.addScaledVector(fw, Math.sin(z.sw * Math.PI) * dt * 0.9);
              if (z.sw > 0.5 && !z.hitDone) {
                z.hitDone = true;
                if (bestFoe && !isInvalidZombieTarget(bestFoe)) {
                  if (typeof Monsters !== 'undefined' && Monsters.hurt) {
                    Monsters.hurt(bestFoe, z.dmg, new THREE.Vector3(dx * 0.1, 0.2, dz * 0.1), 1.5, n);
                    if (typeof Sfx !== 'undefined' && Sfx.at) Sfx.at(z.g.position, 'hit');
                    if (typeof FX !== 'undefined' && FX.debris) {
                      FX.debris(bestFoe.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0xff4422, 6, 1.8);
                    }
                  }
                }
              }
              if (z.sw >= 1) { z.state = 'fight'; z.atkT = 1.3 + Math.random() * 0.6; }
            } else if (dist > 1.3) {
              z.state = 'chase';
              z.g.position.x += (dx / dist) * 2.4 * dt;
              z.g.position.z += (dz / dist) * 2.4 * dt;
            } else {
              z.state = 'fight';
              z.atkT -= dt;
              if (z.atkT <= 0) {
                z.state = 'swipe'; z.sw = 0; z.hitDone = false;
              }
            }
          } else {
            // Tak ada musuh: berkeliaran di dekat Lich (radius 3-5.5 blok)
            z.state = 'wander';
            z.wandT = (z.wandT || 0) - dt;
            if (z.wandT <= 0) {
              z.wandT = 1.5 + Math.random() * 2.0;
              if (distToLich > 5.0) {
                z.wandA = Math.atan2(n.pos.x - z.g.position.x, n.pos.z - z.g.position.z) + (Math.random() - 0.5) * 0.5;
              } else {
                z.wandA = (z.wandA || 0) + (Math.random() - 0.5) * 2.2;
              }
            }
            if (distToLich > 5.5) {
              z.wandA = Math.atan2(n.pos.x - z.g.position.x, n.pos.z - z.g.position.z);
            }
            z.g.rotation.y = lerpAngle(z.g.rotation.y, z.wandA, clamp(dt * 3, 0, 1));
            z.g.position.x += Math.sin(z.g.rotation.y) * 1.2 * dt;
            z.g.position.z += Math.cos(z.g.rotation.y) * 1.2 * dt;
            z.atkT = 1.2;
          }
          // Kunci Y zombie ke tanah agar tak tenggelam/melayang saat jalan
          if (typeof World !== 'undefined' && World.groundAt) {
            const gy = World.groundAt(z.g.position.x, z.g.position.z, z.g.position.y + 1.5);
            if (gy && gy > 0) z.g.position.y += (gy - z.g.position.y) * Math.min(1, dt * 10);
          }

          // Pose gerak langkah zombie — LOGIC SAMA DENGAN PLAYER ANIMATOR (berbasis jarak, anti-sliding & anti-freeze)
          const zSpeed = (z.state === 'chase') ? 2.4 : (z.state === 'wander' ? 1.2 : 0);
          const targetMv = (zSpeed > 0) ? 1.0 : 0.0;
          z.mv = (z.mv !== undefined) ? lerp(z.mv, targetMv, clamp(dt * 8, 0, 1)) : targetMv;
          if (z.mv > 0.01) {
            z.gait = (z.gait || 0) + (zSpeed > 0 ? zSpeed : 1.2) * dt * 2.8 * z.mv;
          }
          const g = z.gait || 0;
          const s = Math.sin(g);
          const c = Math.cos(g);
          const isMoving = z.mv > 0.05;
          const legAmp = (z.state === 'chase' ? 0.60 : 0.45) * z.mv;
          const kneeAmp = (z.state === 'chase' ? 0.68 : 0.52) * z.mv;

          if (z.P.legL) {
            z.P.legL.hip.rotation.x = s * legAmp;
            if (z.P.legL.knee) z.P.legL.knee.rotation.x = Math.max(0, -c) * kneeAmp;
            if (z.P.legL.foot) z.P.legL.foot.rotation.x = clamp(-s * legAmp * 0.4, -0.35, 0.35);
          }
          if (z.P.legR) {
            z.P.legR.hip.rotation.x = -s * legAmp;
            if (z.P.legR.knee) z.P.legR.knee.rotation.x = Math.max(0, c) * kneeAmp;
            if (z.P.legR.foot) z.P.legR.foot.rotation.x = clamp(s * legAmp * 0.4, -0.35, 0.35);
          }
          if (z.P.body) {
            z.P.body.position.y = 0.93 + Math.abs(s) * 0.04 * (isMoving ? 1 : 0);
            z.P.body.rotation.z = Math.sin(g) * 0.03 * (isMoving ? 1 : 0);
          }

          if (z.state === 'swipe') {
            const ts = [0, 0.3, 0.55, 0.85, 1];
            const shV = [-1.45, -2.95, -0.3, -1.0, -1.45];
            const elV = [-0.15, -0.55, -0.05, -0.2, -0.15];
            if (z.P.armR) {
              z.P.armR.sh.rotation.x = track(ts, shV, z.sw);
              if (z.P.armR.el) z.P.armR.el.rotation.x = track(ts, elV, z.sw);
            }
            if (z.P.body) z.P.body.rotation.x = 0.08 + Math.sin(z.sw * Math.PI) * 0.25;
          } else {
            if (z.P.armR) {
              z.P.armR.sh.rotation.x = -1.45 + s * 0.15 * (isMoving ? 1 : 0);
              if (z.P.armR.el) z.P.armR.el.rotation.x = -0.15 + Math.sin(g * 0.5) * 0.05;
            }
            if (z.P.armL) {
              z.P.armL.sh.rotation.x = -1.45 - s * 0.15 * (isMoving ? 1 : 0);
              if (z.P.armL.el) z.P.armL.el.rotation.x = -0.15 - Math.sin(g * 0.5) * 0.05;
            }
            if (z.P.body) z.P.body.rotation.x = 0.08 + (isMoving ? 0.06 : 0);
          }
        }
      }

      // Update Lightning Bolts (ala prototipe: lurus + jitter zigzag + trail)
      for (let i = S.bolts.length - 1; i >= 0; i--) {
        const b = S.bolts[i];
        b.t += dt; b.life -= dt;

        // Peluru mengikuti pergerakan target (homing halus)
        if (b.targetEnt && !b.targetEnt.dead && b.targetEnt.pos) {
          const tgtPoint = b.targetEnt.pos.clone().add(new THREE.Vector3(0, 1.0, 0));
          const toTgt = tgtPoint.clone().sub(b.pos);
          if (toTgt.lengthSq() > 1e-4) {
            b.dir.lerp(toTgt.normalize(), clamp(dt * 7, 0, 1)).normalize();
            b.mesh.lookAt(b.pos.clone().add(b.dir));
          }
          b.target.copy(tgtPoint);
        }

        b.mesh.position.addScaledVector(b.dir, 18 * dt);
        b.pos.copy(b.mesh.position);
        b.jt -= dt;
        if (b.jt <= 0) {
          b.jt = 0.045;
          if (b.segs) for (const s of b.segs) {
            s.position.x = (Math.random() - 0.5) * 0.16;
            s.position.y = (Math.random() - 0.5) * 0.16;
            s.scale.x = s.scale.y = 0.05 + Math.random() * 0.05;
          }
        }
        if (typeof FX !== 'undefined' && FX.debris && Math.random() < 0.6)
          FX.debris(b.pos, 0xc68cff, 1, 0.8);
        const distT = b.mesh.position.distanceTo(b.target);
        if (distT < 0.95 || b.life <= 0) {
          if (b.targetEnt && !b.targetEnt.dead) {
            const hitDir = b.dir ? b.dir.clone().setY(0.25) : new THREE.Vector3(0, 0.3, 0);
            if (typeof Monsters !== 'undefined' && Monsters.list && Monsters.list.includes(b.targetEnt)) {
              Monsters.hurt(b.targetEnt, b.dmg, hitDir, 4, n);
            } else if (typeof NPCS !== 'undefined' && NPCS.list && NPCS.list.includes(b.targetEnt)) {
              NPCS.hurt(b.targetEnt, b.dmg, n);
            } else if (typeof Player !== 'undefined' && b.targetEnt === Player) {
              Player.hurt(b.dmg, 'Lich Arcane Bolt');
            } else if (typeof Monsters !== 'undefined' && Monsters.hurt) {
              Monsters.hurt(b.targetEnt, b.dmg, hitDir, 4, n);
            }
          }
          if (typeof FX !== 'undefined') {
            if (FX.ring) FX.ring(b.pos.x, b.pos.y + 0.1, b.pos.z, 0xb06bff, 0.8, 3.5);
            if (FX.debris) { FX.debris(b.pos, 0xa75dff, 12, 3.0); FX.debris(b.pos, 0xe6ccff, 6, 1.8); }
          }
          if (typeof Sfx !== 'undefined' && Sfx.at) Sfx.at(b.pos, 'thunder');
          if (b.mesh.parent) b.mesh.parent.remove(b.mesh);
          S.bolts.splice(i, 1);
        }
      }

      // Pose Karakter Lich
      const spd = (n.vel && typeof n.vel.x === 'number') ? Math.hypot(n.vel.x, n.vel.z) : 0;
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

      // ==== VERLET CLOTH PHYSICS: rok, strip kain & jubah belakang ====
      // Dijalankan SETELAH pose di-set agar anchor (body/torso) sudah pada
      // transform akhir frame ini. Kain di-simulasikan di ruang world.
      if (L.ropes && L.colliders && n.mesh) {
        if (!L.clothInit) initCloth(n, L);
        if (!L.clothInit) { /* scene belum siap: lewati fisika frame ini */ }
        else {
        const tt = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
        computeWind(tt, clamp(S.speed / 2.5, 0, 1));
        if (n.mesh.updateWorldMatrix) n.mesh.updateWorldMatrix(true, true);
        updateColliders(L, L.colliders);
        const pdt = Math.min(dt, 0.033);
        physicsStep(L.ropes, L.colliders, pdt, tt);
        // Panel rok mengikuti grid verlet
        if (L.skirtPanels && L.skirtPts) {
          const SK_COLS = 12, SK_ROWS = 5;
          let i = 0;
          for (let r = 0; r < SK_ROWS - 1; r++) for (let c = 0; c < SK_COLS; c++) {
            const c2 = (c + 1) % SK_COLS;
            orientPanel(L.skirtPanels[i], L.skirtPts[r][c].pos, L.skirtPts[r][c2].pos, L.skirtPts[r + 1][c].pos, L.skirtPts[r + 1][c2].pos);
            i++;
          }
        }
        // Panel cape jubah belakang mengikuti grid verlet 4 kolom x 5 baris (12 panel kain bersambung)
        if (L.capePanels && L.capeSpec && L.capeSpec.pts) {
          const pts = L.capeSpec.pts, rows = L.capeSpec.rows;
          let idx = 0;
          for (let r = 0; r < rows - 1; r++) {
            for (let c = 0; c < 3; c++) {
              orientPanel(L.capePanels[idx], pts[r][c].pos, pts[r][c + 1].pos, pts[r + 1][c].pos, pts[r + 1][c + 1].pos);
              idx++;
            }
          }
        }
        // Strip kain menjuntai bawah rok mengikuti titik verlet
        renderRopes(L.ropes);
        } // end else: cloth sudah init
      }
    }
  };
})();

if (typeof window !== 'undefined') {
  window.NPC_Lich = NPC_Lich;
}
