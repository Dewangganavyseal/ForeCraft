'use strict';
/* =============================================================================
   SMELTER INDUSTRI (PELEBURAN BIJIH & BATU BARA)
   -----------------------------------------------------------------------------
   Diporting dari prototype otentik "NEW MODEL/Smelter, Rod.html".
   Fitur:
     - Mengubah 2 Ore menjadi 1 Ingot (durasi 5 detik per ingot).
     - Bahan bakar Batu Bara (Coal): 1 Coal bertahan 1 menit (60 detik).
     - Dapat memasukkan banyak Coal dan Ore sekaligus, memproses mandiri
       di latar belakang (background asynchronous smelting process).
     - Model Voxel 3D lengkap dengan semua animasi:
         * Kipas exhaust berputar dinamis
         * Roda katup samping berputar dinamis
         * Cahaya point light & glow api berkedip (flicker)
         * 14 lidah kobaran api 3D di mulut tungku
         * Panel kontrol dengan 3 lampu indikator berkedip
         * Layar monitor berdenyut toska
         * Suar mercu cerobong berkedip merah
         * Kepulan partikel asap dari cerobong & percikan bara api
   ============================================================================= */

const Smelter = {
  SCALE: 0.13,
  ORE_PER_INGOT: 2,
  COOK_DURATION: 5.0,  // 5 detik per 1 ingot
  COAL_DURATION: 60.0, // 1 coal bertahan 60 detik (1 menit)

  ORE_TO_INGOT: {
    iron_ore: 'iron_ingot',
    gold_ore: 'gold_ingot',
    copper_ore: 'copper_ingot',
    steel_ore: 'steel_ingot',
    tungsten_ore: 'tungsten_ingot',
    tungstensteel_ore: 'tungstensteel_ingot'
  },

  currentFurni: null,
  _smokePool: null,
  _fxPool: null,
  _uiTimer: null,

  /* ---------- POOL PARTIKEL KHUSUS ASAP & BARA SMELTER ---------- */
  initPools() {
    if (this._smokePool) return;
    const scene = (typeof Game !== 'undefined' && Game.scene) ? Game.scene : null;
    const pGeo = new THREE.BoxGeometry(1, 1, 1);

    // Pool Asap Cerobong
    this._smokePool = [];
    for (let i = 0; i < 40; i++) {
      const mt = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0, depthWrite: false });
      const ms = new THREE.Mesh(pGeo, mt);
      ms.visible = false; ms.frustumCulled = false;
      if (scene) scene.add(ms);
      this._smokePool.push({ ms, mt, d: null });
    }

    // Pool Percikan Bara Api
    this._fxPool = [];
    for (let i = 0; i < 28; i++) {
      const mt = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
      const ms = new THREE.Mesh(pGeo, mt);
      ms.visible = false; ms.frustumCulled = false;
      if (scene) scene.add(ms);
      this._fxPool.push({ ms, mt, d: null });
    }
  },

  emitSmoke(pos, big = true) {
    if (!this._smokePool) this.initPools();
    let s = this._smokePool.find(p => !p.d) || this._smokePool[0];
    const b = big ? 1 : 0.7;
    const colors = [0x9a9ea6, 0x8b8f97, 0xa9adb5, 0x7f838b];
    s.d = {
      x: pos.x + (Math.random() - 0.5) * 0.25,
      y: pos.y + 0.05,
      z: pos.z + (Math.random() - 0.5) * 0.25,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (0.9 + Math.random() * 0.5) * b,
      vz: (Math.random() - 0.5) * 0.25,
      age: 0, life: 2.2 + Math.random() * 1.2,
      s0: 0.18 * b, s1: 0.75 * b,
      op: 0.55, g: -0.06, drag: 0.25, spin: (Math.random() - 0.5) * 1.5
    };
    s.mt.color.setHex(colors[(Math.random() * colors.length) | 0]);
    s.ms.visible = true; s.ms.scale.setScalar(s.d.s0);
  },

  emitEmber(pos) {
    if (!this._fxPool) this.initPools();
    let s = this._fxPool.find(p => !p.d) || this._fxPool[0];
    s.d = {
      x: pos.x + (Math.random() - 0.5) * 0.2,
      y: pos.y,
      z: pos.z + (Math.random() - 0.5) * 0.2,
      vx: (Math.random() - 0.5) * 0.4,
      vy: 1.2 + Math.random() * 1.0,
      vz: (Math.random() - 0.5) * 0.4,
      age: 0, life: 0.7 + Math.random() * 0.5,
      s0: 0.06, s1: 0.015,
      op: 0.95, g: -0.2, drag: 0.4, spin: 3
    };
    s.mt.color.setHex(Math.random() < 0.5 ? 0xff841a : 0xffd23e);
    s.ms.visible = true; s.ms.scale.setScalar(s.d.s0);
  },

  updatePools(dt) {
    if (this._smokePool) {
      for (const p of this._smokePool) {
        if (!p.d) continue;
        const d = p.d; d.age += dt;
        if (d.age >= d.life) { p.d = null; p.ms.visible = false; continue; }
        d.vy -= d.g * dt; const dr = Math.max(0, 1 - d.drag * dt);
        d.vx *= dr; d.vy *= dr; d.vz *= dr;
        d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
        const t = d.age / d.life;
        const s = d.s0 + (d.s1 - d.s0) * (1 - (1 - t) * (1 - t));
        p.ms.position.set(d.x, d.y, d.z);
        p.ms.scale.set(s, s * (0.9 + t * 0.5), s);
        p.ms.rotation.x += d.spin * dt;
        p.mt.opacity = d.op * (1 - t * t);
      }
    }
    if (this._fxPool) {
      for (const p of this._fxPool) {
        if (!p.d) continue;
        const d = p.d; d.age += dt;
        if (d.age >= d.life) { p.d = null; p.ms.visible = false; continue; }
        d.vy -= d.g * dt; const dr = Math.max(0, 1 - d.drag * dt);
        d.vx *= dr; d.vy *= dr; d.vz *= dr;
        d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
        const t = d.age / d.life;
        const s = d.s0 + (d.s1 - d.s0) * t;
        p.ms.position.set(d.x, d.y, d.z);
        p.ms.scale.setScalar(s);
        p.mt.opacity = d.op * (1 - t * t);
      }
    }
  },

  /* ---------- BUILD MODEL 3D VOXEL OTENTIK DARI Smelter, Rod.html ---------- */
  buildModel() {
    this.initPools();
    const S = this.SCALE;
    const group = new THREE.Group();

    // Cache material Lambert per warna
    const mats = new Map();
    const getMat = c => {
      let m = mats.get(c);
      if (!m) { m = new THREE.MeshLambertMaterial({ color: c }); mats.set(c, m); }
      return m;
    };
    const bGeo = new THREE.BoxGeometry(1, 1, 1);
    const box = (x, y, z, w, h, d, c, ry = 0, rz = 0, rx = 0) => {
      const m = new THREE.Mesh(bGeo, getMat(c));
      m.position.set(x * S, y * S, z * S);
      m.scale.set(w * S, h * S, d * S);
      if (rx) m.rotation.x = rx;
      if (rz) m.rotation.z = rz;
      if (ry) m.rotation.y = ry;
      group.add(m);
      return m;
    };
    const cyl = (x, y, z, r, h, c, seg = 8, axis = 'y') => {
      const g = new THREE.CylinderGeometry(r * S, r * S, h * S, seg);
      if (axis === 'x') g.rotateZ(Math.PI / 2);
      if (axis === 'z') g.rotateX(Math.PI / 2);
      const m = new THREE.Mesh(g, getMat(c));
      m.position.set(x * S, y * S, z * S);
      group.add(m);
      return m;
    };

    const D1 = 0x2b2d33, D2 = 0x34363d, M1 = 0x3b3e46, M2 = 0x43464f, M3 = 0x4a4e58, L = 0x585c66,
          DARK = 0x1f2126, YEL = 0xe8b62a, GOLD = 0xd9a441, WOOD = 0x8a6a42;

    // ---- Fondasi ----
    box(0, 0.3, 0, 12, 0.6, 9.5, D2);
    box(0, 0.62, 0, 11.3, 0.14, 8.9, M1);
    for (let i = 0; i < 15; i++) box(-5.25 + i * 0.75, 0.71, 4.25, 0.7, 0.05, 0.34, i % 2 ? YEL : DARK);

    // ---- Menara Utama (Bertingkat) ----
    box(-1, 2.65, -0.5, 6.4, 4, 5.6, M1);
    box(-1, 4.72, -0.5, 6.75, 0.32, 5.95, D1);
    box(-1, 6.85, -0.5, 5.6, 3.8, 4.8, M2);
    box(-1, 8.82, -0.5, 5.95, 0.3, 5.15, D1);
    box(-1, 10.25, -0.5, 4.6, 2.6, 3.9, M3);
    box(-1, 11.7, -0.5, 5.5, 0.5, 4.7, D1);

    // ---- Rivet Sudut ----
    for (let y = 1.1; y <= 4.3; y += 0.8) {
      box(-4.25, y, 2.32, 0.14, 0.14, 0.14, DARK); box(2.25, y, 2.32, 0.14, 0.14, 0.14, DARK);
      box(-4.25, y, -3.32, 0.14, 0.14, 0.14, DARK); box(2.25, y, -3.32, 0.14, 0.14, 0.14, DARK);
    }
    for (let y = 5.3; y <= 8.4; y += 0.8) {
      box(-3.85, y, 1.92, 0.12, 0.12, 0.12, DARK); box(1.85, y, 1.92, 0.12, 0.12, 0.12, DARK);
      box(-3.85, y, -2.92, 0.12, 0.12, 0.12, DARK); box(1.85, y, -2.92, 0.12, 0.12, 0.12, DARK);
    }

    // ---- Cerobong A (Besar) & B (Kecil) ----
    box(-2.2, 13.2, -1, 1.75, 2.5, 1.75, M2);
    box(-2.2, 14.55, -1, 1.95, 0.2, 1.95, D1);
    box(-2.2, 15.7, -1, 1.5, 2.1, 1.5, M3);
    box(-2.2, 16.85, -1, 1.7, 0.2, 1.7, D1);
    box(-2.2, 17.9, -1, 1.28, 1.9, 1.28, L);
    box(-2.2, 19, -1, 1.6, 0.4, 1.6, D1);

    box(0.9, 13, 0.4, 1.3, 2.1, 1.3, M2);
    box(0.9, 14.15, 0.4, 1.5, 0.18, 1.5, D1);
    box(0.9, 15.2, 0.4, 1.1, 1.95, 1.1, M3);
    box(0.9, 16.3, 0.4, 1.4, 0.35, 1.4, D1);
    box(1.9, 12.15, -1.3, 0.7, 0.4, 0.7, M2);

    // Tangga Cerobong
    box(-2.52, 15.35, -0.02, 0.08, 6.6, 0.08, D1); box(-1.88, 15.35, -0.02, 0.08, 6.6, 0.08, D1);
    for (let y = 12.2; y < 18.6; y += 0.55) box(-2.2, y, -0.02, 0.72, 0.06, 0.06, M3);

    // ---- Mulut Tungku & Bara Api ----
    box(-2.5, 2.5, 2.55, 0.8, 3.4, 0.55, D1);
    box(0.5, 2.5, 2.55, 0.8, 3.4, 0.55, D1);
    box(-1, 4.05, 2.55, 3.8, 0.55, 0.55, D1);
    box(-1, 1.05, 2.55, 3.8, 0.65, 0.55, D1);
    box(-2.05, 3.6, 2.55, 0.45, 0.45, 0.55, D1);
    box(0.05, 3.6, 2.55, 0.45, 0.45, 0.55, D1);
    box(-1, 2.57, 2.28, 2.2, 2.4, 0.12, 0x17110c);
    box(-2.02, 2.57, 2.42, 0.16, 2.4, 0.35, 0x241a12);
    box(-0.02, 2.57, 2.42, 0.16, 2.4, 0.35, 0x241a12);
    box(-1, 4.42, 2.62, 4, 0.4, 1, D2);
    box(-1, 1.3, 2.9, 3.8, 0.2, 0.3, D2);
    box(-1.35, 1.55, 2.5, 1.1, 0.22, 0.24, 0x4a3524, 0.5);
    box(-0.75, 1.55, 2.52, 1.1, 0.22, 0.24, 0x3d2b1d, -0.5);
    box(-1.05, 1.72, 2.5, 0.8, 0.2, 0.22, 0x54402c, 0.1);
    for (let i = 0; i < 6; i++) box(-1.75 + i * 0.3, 1.44, 2.45 + (i % 2) * 0.12, 0.18, 0.12, 0.18, i % 2 ? 0x2a1a10 : 0x54280f, i * 0.7);
    box(-1, 4.42, 3.16, 0.9, 0.34, 0.05, YEL);
    box(-1, 4.48, 3.2, 0.09, 0.16, 0.02, DARK);
    box(-1, 4.33, 3.2, 0.09, 0.07, 0.02, DARK);

    // ---- Catwalk & Railing ----
    box(-1, 4.95, -0.5, 7.9, 0.16, 7.1, D1);
    const X0 = -4.95, X1 = 2.95, Z0 = -4.05, Z1 = 3.0;
    for (let x = X0; x <= X1 + 0.01; x += 0.99) {
      box(x, 5.38, Z0, 0.08, 0.7, 0.08, D2);
      if (x > -4.05) box(x, 5.38, Z1, 0.08, 0.7, 0.08, D2);
    }
    for (let z = Z0; z <= 2.6; z += 0.99) { box(X0, 5.38, z, 0.08, 0.7, 0.08, D2); box(X1, 5.38, z, 0.08, 0.7, 0.08, D2); }
    box(-1, 5.7, Z0, 7.9, 0.09, 0.09, L); box(-1, 5.4, Z0, 7.9, 0.06, 0.06, L);
    box(-0.55, 5.7, Z1, 7, 0.09, 0.09, L); box(-0.55, 5.4, Z1, 7, 0.06, 0.06, L);
    box(X0, 5.7, -0.5, 0.09, 0.09, 7.1, L); box(X0, 5.4, -0.5, 0.06, 0.06, 7.1, L);
    box(X1, 5.7, -0.5, 0.09, 0.09, 7.1, L); box(X1, 5.4, -0.5, 0.06, 0.06, 7.1, L);
    box(-4.83, 2.9, 3.15, 0.07, 4.4, 0.07, D1); box(-4.27, 2.9, 3.15, 0.07, 4.4, 0.07, D1);
    for (let y = 0.85; y < 5.05; y += 0.45) box(-4.55, y, 3.15, 0.63, 0.06, 0.06, M3);

    // ---- Pipa Samping + Flange ----
    cyl(3.45, 4.3, -0.5, 0.42, 7, L, 8, 'y');
    cyl(3.45, 2, -0.5, 0.58, 0.2, D1); cyl(3.45, 4, -0.5, 0.58, 0.2, D1); cyl(3.45, 6, -0.5, 0.58, 0.2, D1);
    cyl(2.98, 7.8, -0.5, 0.36, 0.95, L, 8, 'x');
    cyl(4.1, 3, 0.9, 0.18, 4.4, 0x5f636c, 8, 'y');
    cyl(4.1, 5.2, 0.9, 0.3, 0.16, D1, 'y');

    // ---- Housing Kipas & Roda ----
    cyl(2.35, 6.2, -0.5, 0.8, 0.75, L, 8, 'x');
    cyl(2.76, 6.2, -0.5, 0.9, 0.14, D1, 8, 'x');
    box(2.9, 6.2, -0.5, 0.05, 1.75, 0.07, D1);
    box(2.9, 6.2, -0.5, 0.05, 0.07, 1.75, D1);

    // ---- Hopper Batu Bara ----
    for (const sx of [-0.95, 0.95]) for (const sz of [-0.95, 0.95]) box(-5.5 + sx, 1.6, -0.5 + sz, 0.18, 2, 0.18, D1);
    box(-5.5, 3.1, -0.5, 2.7, 1.1, 2.7, M2);
    box(-5.5, 2.35, -0.5, 1.9, 0.75, 1.9, M1);
    box(-5.5, 1.85, -0.5, 1.05, 0.55, 1.05, D1);
    box(-5.5, 3.7, -0.5, 2.9, 0.16, 2.9, D1);
    box(-5.9, 3.92, -0.8, 0.4, 0.3, 0.4, 0x181a1e, 0.4);
    box(-5.2, 3.9, -0.2, 0.36, 0.28, 0.36, 0x181a1e, -0.3);
    box(-5.6, 3.95, -0.1, 0.34, 0.26, 0.34, 0x101215, 0.8);
    cyl(-4.6, 1.85, -0.5, 0.32, 1.1, L, 8, 'x');
    box(-4.6, 1.45, -0.5, 1.1, 0.12, 0.12, D1);

    // ---- Panel Kontrol & Tong ----
    box(3.1, 1.1, 2.6, 0.14, 0.9, 0.14, D1);
    box(3.1, 1.78, 2.6, 0.95, 0.75, 0.24, M2);
    box(3.1, 2.2, 2.6, 1.05, 0.12, 0.3, D1);
    cyl(1, 1.19, 3.9, 0.46, 1, WOOD, 8);
    box(-3.4, 1.17, 3.75, 0.95, 0.95, 0.95, 0x9a7a52, 0.35);
    box(1.7, 0.81, 3.1, 0.62, 0.2, 0.32, GOLD, 0.25);
    box(2.35, 0.81, 3.2, 0.62, 0.2, 0.32, 0xb9c2cc, 0.5);

    /* ---- BAGIAN DINAMIS & ANIMASI ---- */
    // 1. Glow Api Mulut Tungku
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2 * S, 2.2 * S),
      new THREE.MeshBasicMaterial({ color: 0xff7b24, transparent: true, opacity: 0.55, depthWrite: false }));
    glow.position.set(-1 * S, 2.55 * S, 2.36 * S);
    group.add(glow);

    // 2. Point Light Api
    const light = new THREE.PointLight(0xff7a2a, 1.8, 6, 2);
    light.position.set(-1 * S, 2.4 * S, 3.1 * S);
    group.add(light);

    // 3. Lidah Kobaran Api (14 box melayang)
    const flames = [];
    const fcols = [0xffd23e, 0xffb02e, 0xff841a, 0xffe27a];
    for (let i = 0; i < 14; i++) {
      const mt = new THREE.MeshBasicMaterial({ color: fcols[i % 4], transparent: true, opacity: 0, depthWrite: false });
      const ms = new THREE.Mesh(bGeo, mt);
      ms.frustumCulled = false;
      group.add(ms);
      flames.push({
        ms, mt,
        x: (-1.95 + (i % 5) * 0.45) * S,
        z: (2.5 + Math.floor(i / 5) * 0.05) * S,
        sp: 0.85 + Math.random() * 0.7,
        ph: Math.random(),
        sd: i * 1.7
      });
    }

    // 4. Kipas Exhaust Samping
    const fan = new THREE.Group();
    fan.position.set(2.78 * S, 6.2 * S, -0.5 * S);
    for (let i = 0; i < 3; i++) {
      const fb = new THREE.Mesh(bGeo, getMat(0x8b9099));
      fb.position.set(0, 0.33 * S, 0);
      fb.scale.set(0.07 * S, 0.6 * S, 0.16 * S);
      const pivot = new THREE.Group();
      pivot.rotation.x = i * Math.PI * 2 / 3;
      pivot.add(fb);
      fan.add(pivot);
    }
    group.add(fan);

    // 5. Roda Katup Samping
    const wheel = new THREE.Group();
    wheel.position.set(4.42 * S, 5.2 * S, 0.9 * S);
    const wCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.4 * S, 0.4 * S, 0.08 * S, 8), getMat(0x9c3b2e));
    wCyl.rotateZ(Math.PI / 2); wheel.add(wCyl);
    const wb1 = new THREE.Mesh(bGeo, getMat(0x7d2f24));
    wb1.scale.set(0.06 * S, 0.74 * S, 0.1 * S); wheel.add(wb1);
    const wb2 = new THREE.Mesh(bGeo, getMat(0x7d2f24));
    wb2.scale.set(0.06 * S, 0.1 * S, 0.74 * S); wheel.add(wb2);
    group.add(wheel);

    // 6. Lampu Indikator Panel Kontrol (3 warna)
    const lamps = [];
    for (let i = 0; i < 3; i++) {
      const mt = new THREE.MeshBasicMaterial({ color: 0x2a2a2a });
      const ms = new THREE.Mesh(bGeo, mt);
      ms.position.set((2.85 + i * 0.25) * S, 1.63 * S, 2.75 * S);
      ms.scale.set(0.12 * S, 0.12 * S, 0.05 * S);
      group.add(ms);
      lamps.push(mt);
    }

    // 7. Layar Monitor Panel Kontrol
    const screenMt = new THREE.MeshBasicMaterial({ color: 0x123333, transparent: true, opacity: 0.5 });
    const screen = new THREE.Mesh(bGeo, screenMt);
    screen.position.set(3.1 * S, 1.92 * S, 2.75 * S);
    screen.scale.set(0.55 * S, 0.3 * S, 0.04 * S);
    group.add(screen);

    // 8. Lampu Suar Mercu Cerobong
    const beaconMt = new THREE.MeshBasicMaterial({ color: 0x4a2222 });
    const beacon = new THREE.Mesh(bGeo, beaconMt);
    beacon.position.set(-2.2 * S, 19.35 * S, -1 * S);
    beacon.scale.set(0.18 * S, 0.18 * S, 0.18 * S);
    group.add(beacon);

    // Node anchor untuk titik keluar partikel asap
    const ancA = new THREE.Object3D(); ancA.position.set(-2.2 * S, 19.4 * S, -1 * S); group.add(ancA);
    const ancB = new THREE.Object3D(); ancB.position.set(0.9 * S, 16.7 * S, 0.4 * S); group.add(ancB);
    const ancM = new THREE.Object3D(); ancM.position.set(-1 * S, 2.3 * S, 2.75 * S); group.add(ancM);

    group.userData.smelter = {
      fan, wheel, glow, light, flames, lamps, screen, beacon,
      ancA, ancB, ancM,
      fanSpeed: 0, wheelSpeed: 0,
      smokeTimer: 0, emberTimer: 0
    };

    return group;
  },

  /* ---------- UPDATE TIAP FRAME: LOGIKA PELEBURAN & ANIMASI SMELTER ---------- */
  update(f, dt) {
    if (!f || f.def !== 'smelter') return;

    // Inisialisasi data smelter bila belum ada
    if (!f.smelter) {
      f.smelter = {
        fuelTime: 0,
        fuelCoal: 0,
        oreType: null,
        oreCount: 0,
        cookProgress: 0,
        outType: null,
        outCount: 0
      };
    }
    const sm = f.smelter;

    // 1. AUTO-CONSUME COAL bila api habis dan masih ada ore yang bisa dimasak
    if (sm.fuelTime <= 0 && sm.fuelCoal > 0 && sm.oreCount >= this.ORE_PER_INGOT) {
      sm.fuelCoal--;
      sm.fuelTime += this.COAL_DURATION; // 1 coal = 60 detik!
    }

    // 2. LOGIKA PELEBURAN (5 DETIK PER INGOT)
    const canSmelt = (sm.fuelTime > 0 && sm.oreCount >= this.ORE_PER_INGOT);
    if (canSmelt) {
      sm.fuelTime = Math.max(0, sm.fuelTime - dt);
      sm.cookProgress += dt;
      if (sm.cookProgress >= this.COOK_DURATION) {
        sm.cookProgress -= this.COOK_DURATION;
        sm.oreCount -= this.ORE_PER_INGOT;
        const outIngot = this.ORE_TO_INGOT[sm.oreType] || 'iron_ingot';
        sm.outType = outIngot;
        sm.outCount = (sm.outCount || 0) + 1;

        if (sm.oreCount < this.ORE_PER_INGOT) {
          sm.oreCount = 0;
          sm.oreType = null;
          sm.cookProgress = 0;
        }
      }
    } else if (sm.fuelTime > 0) {
      // Api tetap menyala menghabiskan sisa durasinya
      sm.fuelTime = Math.max(0, sm.fuelTime - dt);
      sm.cookProgress = 0;
    } else {
      sm.cookProgress = 0;
    }

    const smelterOn = (sm.fuelTime > 0);

    // 3. ANIMASI 3D MODEL
    const mData = f.mesh && f.mesh.userData && f.mesh.userData.smelter;
    if (mData) {
      const time = performance.now() * 0.001;

      // Kipas & Roda Katup
      mData.fanSpeed += ((smelterOn ? 7.5 : 0) - mData.fanSpeed) * Math.min(dt * 2, 1);
      mData.wheelSpeed += ((smelterOn ? 0.9 : 0) - mData.wheelSpeed) * Math.min(dt * 2, 1);
      mData.fan.rotation.x += mData.fanSpeed * dt;
      mData.wheel.rotation.x -= mData.wheelSpeed * dt;

      // Cahaya & Glow Mulut Tungku
      const targetLi = smelterOn ? (1.6 + Math.sin(time * 13) * 0.35 + Math.sin(time * 29.5) * 0.2) : 0;
      mData.light.intensity += (targetLi - mData.light.intensity) * Math.min(dt * (smelterOn ? 18 : 3), 1);
      mData.glow.material.opacity = smelterOn
        ? (0.5 + Math.sin(time * 11) * 0.12 + Math.sin(time * 27) * 0.05)
        : Math.max(0, mData.glow.material.opacity - dt * 0.8);

      // Lidah Kobaran Api
      for (const fl of mData.flames) {
        fl.ms.visible = smelterOn;
        if (!smelterOn) continue;
        fl.ph = (fl.ph + dt * fl.sp * 0.85) % 1;
        const t = fl.ph, s = (1 - t) * (0.026 + (fl.sd * 13 % 10) * 0.0015);
        fl.ms.position.set(fl.x + Math.sin(time * 3 + fl.sd) * 0.01, (1.5 + t * 1.25) * this.SCALE, fl.z);
        fl.ms.scale.set(s, s * (1.4 + t), s);
        fl.mt.opacity = (1 - t * t) * 0.95;
      }

      // Lampu Indikator & Layar Monitor
      mData.lamps[0].color.setHex(smelterOn && Math.sin(time * 0.8) > 0.93 ? 0xff4d3d : 0x3a2323);
      mData.lamps[1].color.setHex(smelterOn && Math.sin(time * 3.1) > 0.2 ? 0xffd23e : 0x3a3223);
      mData.lamps[2].color.setHex(smelterOn ? 0x3dff7a : 0x233a2a);
      mData.screen.material.color.setHex(smelterOn ? 0x54e0d0 : 0x123333);
      mData.screen.material.opacity = smelterOn ? (0.75 + Math.sin(time * 5) * 0.2) : 0.3;
      mData.beacon.material.color.setHex(smelterOn && ((time % 1.6) < 0.3) ? 0xff3b2e : 0x4a2222);

      // Partikel Asap & Bara Api (Hanya bila dekat dengan pemain agar hemat performa)
      const pDist = (typeof Player !== 'undefined' && Player.pos)
        ? Math.hypot(f.x - Player.pos.x, f.z - Player.pos.z) : 0;
      if (smelterOn && pDist < 45) {
        mData.smokeTimer = (mData.smokeTimer || 0) + dt;
        if (mData.smokeTimer >= 0.16) {
          mData.smokeTimer = 0;
          const wPosA = new THREE.Vector3(); mData.ancA.getWorldPosition(wPosA);
          const wPosB = new THREE.Vector3(); mData.ancB.getWorldPosition(wPosB);
          this.emitSmoke(wPosA, true);
          if (Math.random() < 0.6) this.emitSmoke(wPosB, false);
        }
        mData.emberTimer = (mData.emberTimer || 0) + dt;
        if (mData.emberTimer >= 0.35) {
          mData.emberTimer = 0;
          const wPosA = new THREE.Vector3(); mData.ancA.getWorldPosition(wPosA);
          const wPosM = new THREE.Vector3(); mData.ancM.getWorldPosition(wPosM);
          this.emitEmber(wPosA);
          this.emitEmber(wPosM);
        }
      }
    }

    // Refresh UI secara live bila panel sedang dibuka untuk smelter ini
    if (this.currentFurni === f && typeof UI !== 'undefined' && UI.open === 'smelter') {
      this._liveUpdateUI();
    }
  },

  /* ---------- BUKA PANEL UI SMELTER ---------- */
  openUI(f) {
    this.currentFurni = f;
    if (typeof UI !== 'undefined') {
      if (UI.open !== 'smelter') UI.toggle('smelter');
      else this.render();
    }
    if (typeof Sfx !== 'undefined' && Sfx.open) Sfx.open();
  },

  closeUI() {
    this.currentFurni = null;
    if (typeof UI !== 'undefined' && UI.open === 'smelter') {
      UI.toggle('smelter');
    }
  },

  /* ---------- RENDER UI SMELTER ---------- */
  render() {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('smelter-body');
    if (!el) return;
    const f = this.currentFurni;
    if (!f || f.def !== 'smelter') {
      el.innerHTML = '<p class="tip">Dekati Smelter Industri untuk menggunakannya.</p>';
      return;
    }
    const sm = f.smelter || (f.smelter = { fuelTime: 0, fuelCoal: 0, oreType: null, oreCount: 0, cookProgress: 0, outType: null, outCount: 0 });

    const coalInBag = (typeof RPG !== 'undefined' && RPG.countItem) ? RPG.countItem('coal') : 0;
    const isSmelting = (sm.fuelTime > 0 && sm.oreCount >= this.ORE_PER_INGOT);
    const progressPct = isSmelting ? Math.min(100, Math.round((sm.cookProgress / this.COOK_DURATION) * 100)) : 0;

    let html = `
      <div class="smelter-container">
        <!-- BARIS STATUS & INDIKATOR API -->
        <div class="smelter-status-card ${sm.fuelTime > 0 ? 'active' : ''}">
          <div class="ssc-left">
            <span class="ssc-fire-ico">${sm.fuelTime > 0 ? '🔥' : '⚫'}</span>
            <div class="ssc-info">
              <b>${sm.fuelTime > 0 ? (isSmelting ? 'SEDANG MELEBUR ORE' : 'TUNGKU PANAS (MENUNGGU ORE)') : 'TUNGKU PADAM (BUTUH BATU BARA)'}</b>
              <span id="sm-fuel-txt">Sisa Api: ${Math.ceil(sm.fuelTime)}s &nbsp;•&nbsp; Cadangan Coal: ${sm.fuelCoal}x</span>
            </div>
          </div>
          <div class="ssc-fuel-bar"><div id="sm-fuel-fill" style="width:${Math.min(100, (sm.fuelTime / this.COAL_DURATION) * 100)}%"></div></div>
        </div>

        <!-- TIGA SEKSI UTAMA: BAHAN BAKAR, PROSES ORE, DAN HASIL INGOT -->
        <div class="smelter-work-grid">
          <!-- 1. SEKSI BAHAN BAKAR (COAL) -->
          <div class="sm-card sm-fuel-col">
            <div class="sm-card-title">🖤 BAHAN BAKAR</div>
            <div class="sm-slot sm-slot-coal">
              <span class="sm-slot-ico">${(typeof UI !== 'undefined' && UI.itemIcon) ? UI.itemIcon('coal') : '🖤'}</span>
              <div class="sm-slot-qty">${sm.fuelCoal}x</div>
              <div class="sm-slot-sub">Batu Bara</div>
            </div>
            <div class="sm-btn-group">
              <button class="sm-btn" onclick="Smelter.addCoal(1)" ${coalInBag >= 1 ? '' : 'disabled'}>+1 Coal</button>
              <button class="sm-btn" onclick="Smelter.addCoal(5)" ${coalInBag >= 5 ? '' : 'disabled'}>+5 Coal</button>
              <button class="sm-btn sm-btn-all" onclick="Smelter.addCoal(${coalInBag})" ${coalInBag >= 1 ? '' : 'disabled'}>Semua (${coalInBag})</button>
            </div>
          </div>

          <!-- 2. SEKSI PELEBURAN ORE -->
          <div class="sm-card sm-process-col">
            <div class="sm-card-title">🔘 INPUT ORE (2 Ore → 1 Ingot)</div>
            ${sm.oreType ? `
              <div class="sm-slot sm-slot-ore">
                <span class="sm-slot-ico">${(typeof UI !== 'undefined' && UI.itemIcon) ? UI.itemIcon(sm.oreType) : ITEMS[sm.oreType].e}</span>
                <div class="sm-slot-qty">${sm.oreCount}x</div>
                <div class="sm-slot-sub">${ITEMS[sm.oreType] ? ITEMS[sm.oreType].n : sm.oreType}</div>
              </div>
              <!-- PROGRESS BAR PELEBURAN -->
              <div class="sm-progress-wrap">
                <div class="sm-progress-label"><span id="sm-prog-txt">${progressPct}%</span> (5s / Ingot)</div>
                <div class="sm-progress-track"><div id="sm-prog-fill" style="width:${progressPct}%"></div></div>
              </div>
              <div class="sm-btn-group">
                <button class="sm-btn sm-btn-warn" onclick="Smelter.withdrawOre()">⬅ Tarik Kembali Ore</button>
              </div>
            ` : `
              <div class="sm-empty-ore-hint">Pilih Ore dari Tas untuk dimasukkan:</div>
              <div class="sm-ore-pick-list">
                ${this._renderOrePickerList()}
              </div>
            `}
          </div>

          <!-- 3. SEKSI OUTPUT INGOT -->
          <div class="sm-card sm-output-col">
            <div class="sm-card-title">📦 HASIL INGOT</div>
            <div class="sm-slot sm-slot-out ${sm.outCount > 0 ? 'has-item' : ''}">
              ${sm.outType && sm.outCount > 0 ? `
                <span class="sm-slot-ico">${(typeof UI !== 'undefined' && UI.itemIcon) ? UI.itemIcon(sm.outType) : ITEMS[sm.outType].e}</span>
                <div class="sm-slot-qty">${sm.outCount}x</div>
                <div class="sm-slot-sub">${ITEMS[sm.outType] ? ITEMS[sm.outType].n : sm.outType}</div>
              ` : `
                <span class="sm-slot-ico empty">📦</span>
                <div class="sm-slot-sub empty">Belum ada hasil</div>
              `}
            </div>
            <button class="big sm-btn-take" onclick="Smelter.collectOutput()" ${sm.outCount > 0 ? '' : 'disabled'}>
              ✨ Ambil Ingot (${sm.outCount || 0})
            </button>
          </div>
        </div>
      </div>
    `;

    el.innerHTML = html;
  },

  /* List pilihan ore yang ada di inventory pemain */
  _renderOrePickerList() {
    const ores = ['iron_ore', 'gold_ore', 'copper_ore', 'steel_ore', 'tungsten_ore', 'tungstensteel_ore'];
    let listHtml = '';
    let found = 0;
    for (const id of ores) {
      const it = ITEMS[id];
      const count = (typeof RPG !== 'undefined' && RPG.countItem) ? RPG.countItem(id) : 0;
      if (count > 0) {
        found++;
        listHtml += `
          <div class="sm-ore-pick-item">
            <span class="opi-ico">${(typeof UI !== 'undefined' && UI.itemIcon) ? UI.itemIcon(id) : it.e}</span>
            <div class="opi-info">
              <b>${it.n}</b>
              <span>Punya: ${count}x</span>
            </div>
            <div class="opi-btns">
              <button class="sm-btn mini" onclick="Smelter.insertOre('${id}', 10)" ${count >= 2 ? '' : 'disabled'}>+10</button>
              <button class="sm-btn mini" onclick="Smelter.insertOre('${id}', ${count})">Semua</button>
            </div>
          </div>
        `;
      }
    }
    if (!found) {
      return '<div class="sm-no-ore">Kamu belum memiliki Ore di tas.<br>Tambang batu dan bijih di dunia atau dungeon.</div>';
    }
    return listHtml;
  },

  /* Update halus elemen progress & timer di UI tanpa me-render ulang seluruh DOM */
  _liveUpdateUI() {
    if (typeof document === 'undefined') return;
    const f = this.currentFurni;
    if (!f || !f.smelter) return;
    const sm = f.smelter;
    const fuelTxt = document.getElementById('sm-fuel-txt');
    if (fuelTxt) fuelTxt.innerHTML = `Sisa Api: ${Math.ceil(sm.fuelTime)}s &nbsp;•&nbsp; Cadangan Coal: ${sm.fuelCoal}x`;
    const fuelFill = document.getElementById('sm-fuel-fill');
    if (fuelFill) fuelFill.style.width = Math.min(100, (sm.fuelTime / this.COAL_DURATION) * 100) + '%';

    const progFill = document.getElementById('sm-prog-fill');
    const progTxt = document.getElementById('sm-prog-txt');
    if (progFill && progTxt) {
      const isSmelting = (sm.fuelTime > 0 && sm.oreCount >= this.ORE_PER_INGOT);
      const pct = isSmelting ? Math.min(100, Math.round((sm.cookProgress / this.COOK_DURATION) * 100)) : 0;
      progFill.style.width = pct + '%';
      progTxt.textContent = pct + '%';
    }
  },

  /* Masukkan Coal sebagai bahan bakar */
  addCoal(amount) {
    const f = this.currentFurni;
    if (!f || !f.smelter) return;
    amount = Math.min(amount, (typeof RPG !== 'undefined' && RPG.countItem) ? RPG.countItem('coal') : 0);
    if (amount <= 0) return;

    RPG.removeItems({ coal: amount });
    f.smelter.fuelCoal += amount;
    // Jika tungku sedang padam, langsung nyalakan 1 coal pertama
    if (f.smelter.fuelTime <= 0 && f.smelter.fuelCoal > 0) {
      f.smelter.fuelCoal--;
      f.smelter.fuelTime = this.COAL_DURATION;
    }
    if (typeof Sfx !== 'undefined' && Sfx.click) Sfx.click();
    if (typeof UI !== 'undefined' && UI.toast) UI.toast(`🖤 Memasukkan ${amount}x Batu Bara ke Smelter`);
    if (typeof Furni !== 'undefined' && Furni.save) Furni.save();
    this.render();
  },

  /* Masukkan Ore ke dalam Smelter */
  insertOre(oreId, amount) {
    const f = this.currentFurni;
    if (!f || !f.smelter) return;
    const available = (typeof RPG !== 'undefined' && RPG.countItem) ? RPG.countItem(oreId) : 0;
    amount = Math.min(amount, available);
    if (amount <= 0) return;

    // Jika smelter sudah berisi jenis ore lain, tidak bisa dicampur
    if (f.smelter.oreType && f.smelter.oreType !== oreId && f.smelter.oreCount > 0) {
      if (typeof UI !== 'undefined' && UI.toast) UI.toast(`⚠️ Smelter sedang memproses ${ITEMS[f.smelter.oreType].n}!`);
      return;
    }

    RPG.removeItems({ [oreId]: amount });
    f.smelter.oreType = oreId;
    f.smelter.oreCount = (f.smelter.oreCount || 0) + amount;
    if (typeof Sfx !== 'undefined' && Sfx.click) Sfx.click();
    if (typeof UI !== 'undefined' && UI.toast) UI.toast(`🔘 Memasukkan ${amount}x ${ITEMS[oreId].n}`);
    if (typeof Furni !== 'undefined' && Furni.save) Furni.save();
    this.render();
  },

  /* Tarik kembali Ore yang belum selesai dimasak */
  withdrawOre() {
    const f = this.currentFurni;
    if (!f || !f.smelter || !f.smelter.oreType || f.smelter.oreCount <= 0) return;
    const oreId = f.smelter.oreType;
    const count = f.smelter.oreCount;

    RPG.addItem(oreId, count);
    f.smelter.oreType = null;
    f.smelter.oreCount = 0;
    f.smelter.cookProgress = 0;

    if (typeof Sfx !== 'undefined' && Sfx.click) Sfx.click();
    if (typeof UI !== 'undefined' && UI.toast) UI.toast(`📦 Menarik kembali ${count}x ${ITEMS[oreId].n}`);
    if (typeof Furni !== 'undefined' && Furni.save) Furni.save();
    this.render();
  },

  /* Ambil Ingot hasil leburan */
  collectOutput() {
    const f = this.currentFurni;
    if (!f || !f.smelter || !f.smelter.outType || f.smelter.outCount <= 0) return;
    const ingotId = f.smelter.outType;
    const count = f.smelter.outCount;

    RPG.addItem(ingotId, count);
    f.smelter.outType = null;
    f.smelter.outCount = 0;

    if (typeof Sfx !== 'undefined' && Sfx.craft) Sfx.craft();
    if (typeof UI !== 'undefined' && UI.toast) UI.toast(`✨ Berhasil mengambil ${count}x ${ITEMS[ingotId].n}!`);
    if (typeof Player !== 'undefined' && Player.addXP) Player.addXP(count * 6);
    if (typeof Furni !== 'undefined' && Furni.save) Furni.save();
    this.render();
  }
};

window.Smelter = Smelter;
