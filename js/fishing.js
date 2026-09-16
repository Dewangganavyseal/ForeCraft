'use strict';
/* =============================================================================
   FORECRAFT 3D - SISTEM MEMANCING LENGKAP (FISHING SYSTEM)
   File: js/fishing.js
   Porting otentik dari "NEW MODEL/Smelter, Rod.html":
   - Model joran pancing voxel 3D dengan gagang gabus pas di genggaman tangan
   - 3 segmen joran lentur (seg1, seg2, seg3) dengan cincin pemandu senar (guides)
   - Reel gulungan senar dengan tuas engkol (crank) berputar
   - Pelampung (bobber) merah-putih dan kail logam
   - Senar pancing dinamis 16 titik Bezier melengkung realistis
   - Animasi lengkap: windup -> swing -> flight -> splash -> wait -> bite -> minigame -> reel -> show -> lift
   - Minigame pancing di tengah layar saat ikan menyambar
   ============================================================================= */

const Fishing = {
  active: false,
  state: 'rest', // rest, windup, swing, flight, splash, wait, bite, minigame, reel, show, lift
  t: 0,
  angle: 0.12,
  bend: 0.05,
  sag: 0.22,
  crank: 0,
  lineEnd: new THREE.Vector3(),
  launch: new THREE.Vector3(),
  land: new THREE.Vector3(),
  reelFrom: new THREE.Vector3(),
  fishPos: new THREE.Vector3(),
  fdur: 0.5,
  waitDur: 3.0,
  reelDur: 2.0,
  caught: false,
  launched: false,
  rippleT: 0,
  rip2: 0,
  fishFalling: false,
  fishVy: 0,

  // Referensi 3D
  rodInstance: null,
  rodPivot: null,
  seg1: null,
  seg2: null,
  seg3: null,
  crankG: null,
  anchors: null,
  bobber: null,
  hookG: null,
  fishG: null,
  line: null,
  lineGeo: null,

  targetFish: null,

  // Konstanta lentur dari Smelter, Rod.html
  B1: 0.12,
  B2: 0.25,
  B3: 0.35,
  REST_A: 0.12,
  REST_B: 0.05,

  // State Minigame
  minigame: {
    active: false,
    fishY: 0.5,        // 0 (bawah) s/d 1 (atas)
    fishTargetY: 0.5,
    fishTimer: 0,
    barY: 0.2,         // posisi bar penangkap (0 s/d 1 - barHeight)
    barVy: 0,
    barHeight: 0.24,   // tinggi bar penangkap
    progress: 35,      // 0 s/d 100
    pulling: false,
    fishSpeed: 1.0,
  },

  /* ---------- BUILD MODEL JORAN LENGKAP DARI Smelter, Rod.html ---------- */
  buildRodModel(){
    const g = new THREE.Group();
    g.name = 'FishingRodModel';

    const CORK1 = 0xb08a5a, CORK2 = 0x9c7848, RING = 0x6e5232, DK = 0x22262c, RED = 0xc0392b, MT = 0xc8cdd4;
    const R1 = 0x1f6f63, R2 = 0x237a6c, R3 = 0x2a8a78, R4 = 0x37a08d, R5 = 0x3fac99;

    const box = (w, h, d, c, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: c }));
      m.position.set(x, y, z);
      m.castShadow = true;
      return m;
    };
    const cyl = (r, h, c, x = 0, y = 0, z = 0, axis = 'y') => {
      const geom = new THREE.CylinderGeometry(r, r, h, 8);
      if (axis === 'x') geom.rotateZ(Math.PI / 2);
      if (axis === 'z') geom.rotateX(Math.PI / 2);
      const m = new THREE.Mesh(geom, new THREE.MeshLambertMaterial({ color: c }));
      m.position.set(x, y, z);
      m.castShadow = true;
      return m;
    };

    // Pivot rotasi ayunan joran (posisi di sekitar genggaman)
    const rodPivot = new THREE.Group();
    rodPivot.name = 'RodPivot';
    g.add(rodPivot);

    // Genggaman gabus (Cork handle) + dudukan reel
    // Titik pegangan tangan pas di z = 0 (offset -0.08 dari model asli)
    const baseG = new THREE.Group();
    baseG.add(box(0.115, 0.115, 0.14, DK, 0, 0, -0.70));
    baseG.add(box(0.135, 0.135, 0.30, CORK1, 0, 0, -0.52));
    baseG.add(box(0.145, 0.145, 0.045, RING, 0, 0, -0.40));
    baseG.add(box(0.132, 0.132, 0.30, CORK2, 0, 0, -0.28));
    baseG.add(box(0.142, 0.142, 0.045, RING, 0, 0, -0.16));
    // Pusat genggaman tangan pemain (pas di telapak tangan z=0):
    baseG.add(box(0.126, 0.126, 0.30, CORK1, 0, 0, -0.04));
    baseG.add(box(0.136, 0.136, 0.045, RING, 0, 0, 0.08));
    baseG.add(box(0.120, 0.120, 0.30, CORK2, 0, 0, 0.20));
    baseG.add(box(0.135, 0.135, 0.09, RED, 0, 0, 0.39));
    baseG.add(box(0.120, 0.120, 0.26, DK, 0, 0, 0.54));

    // Dudukan & reel penggulung benang
    baseG.add(box(0.07, 0.12, 0.14, DK, 0, -0.10, 0.54));
    baseG.add(box(0.13, 0.18, 0.26, 0x3a4149, 0, -0.22, 0.54));
    baseG.add(cyl(0.115, 0.15, 0x9aa3ad, 0, -0.22, 0.54, 'x')); // spool
    baseG.add(cyl(0.045, 0.03, DK, 0.085, -0.22, 0.54, 'x'));    // cap
    rodPivot.add(baseG);

    // Tuas engkol reel (Crank)
    const crankG = new THREE.Group();
    crankG.position.set(0.085, -0.22, 0.54);
    crankG.add(box(0.028, 0.15, 0.028, MT, 0, -0.075, 0));
    crankG.add(cyl(0.032, 0.05, DK, 0, -0.16, 0, 'x'));
    rodPivot.add(crankG);

    // Segmen 1 joran
    const seg1 = new THREE.Group();
    seg1.position.set(0, 0, 0.58);
    rodPivot.add(seg1);
    seg1.add(box(0.13, 0.13, 0.09, RED, 0, 0, 0.02));
    seg1.add(box(0.095, 0.095, 0.60, R1, 0, 0, 0.31));
    seg1.add(box(0.078, 0.078, 0.28, R2, 0, 0, 0.72));
    seg1.add(box(0.042, 0.048, 0.042, MT, 0, 0.073, 0.28)); // ring guide 1
    seg1.add(box(0.038, 0.044, 0.038, MT, 0, 0.062, 0.72));

    // Segmen 2 joran
    const seg2 = new THREE.Group();
    seg2.position.set(0, 0, 0.84);
    seg1.add(seg2);
    seg2.add(box(0.09, 0.09, 0.08, RED, 0, 0, 0.02));
    seg2.add(box(0.065, 0.065, 0.50, R3, 0, 0, 0.26));
    seg2.add(box(0.052, 0.052, 0.26, R4, 0, 0, 0.62));
    seg2.add(box(0.034, 0.040, 0.034, MT, 0, 0.052, 0.55)); // ring guide 2

    // Segmen 3 joran (ujung lentur)
    const seg3 = new THREE.Group();
    seg3.position.set(0, 0, 0.73);
    seg2.add(seg3);
    seg3.add(box(0.062, 0.062, 0.07, RED, 0, 0, 0.02));
    seg3.add(box(0.042, 0.042, 0.46, R4, 0, 0, 0.24));
    seg3.add(box(0.030, 0.030, 0.26, R5, 0, 0, 0.58));
    seg3.add(box(0.028, 0.032, 0.028, MT, 0, 0.040, 0.70)); // ring guide tip

    // Titik jangkar senar pancing
    const a1 = new THREE.Object3D(); a1.position.set(0, 0.095, 0.28); seg1.add(a1);
    const a2 = new THREE.Object3D(); a2.position.set(0, 0.075, 0.55); seg2.add(a2);
    const at = new THREE.Object3D(); at.position.set(0, 0.045, 0.72); seg3.add(at);
    const ar = new THREE.Object3D(); ar.position.set(0, -0.10, 0.58); rodPivot.add(ar);

    return {
      root: g,
      rodPivot,
      seg1,
      seg2,
      seg3,
      crankG,
      anchors: { g1: a1, g2: a2, tip: at, reel: ar }
    };
  },

  /* Model untuk Held Item di tangan pemain */
  buildHeldRod(){
    const rod = this.buildRodModel();
    this.rodInstance = rod.root;
    this.rodPivot = rod.rodPivot;
    this.seg1 = rod.seg1;
    this.seg2 = rod.seg2;
    this.seg3 = rod.seg3;
    this.crankG = rod.crankG;
    this.anchors = rod.anchors;

    // Skala joran disesuaikan dengan proporsi karakter
    rod.root.scale.setScalar(0.72);
    rod.root.userData.hold = {
      pos: [0, -0.29, 0.04],
      rot: [-0.05, 0, 0], // Joran pancing mengarah lurus ke depan seperti pedang (tidak menunduk ke bawah)
      scale: 0.95
    };
    return rod.root;
  },

  /* Model pelampung (bobber) merah-putih */
  buildBobber(){
    const g = new THREE.Group();
    const box = (w, h, d, c, y) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: c }));
      m.position.y = y;
      g.add(m);
    };
    box(0.16, 0.12, 0.16, 0xf2f4f6, -0.055);
    box(0.15, 0.10, 0.15, 0xd83a2e, 0.045);
    box(0.08, 0.05, 0.08, 0xd83a2e, 0.120);
    box(0.04, 0.02, 0.04, 0xf5c542, 0.150);
    box(0.04, 0.04, 0.04, 0x9aa3ad, -0.130);
    g.scale.setScalar(0.9);
    g.visible = false;
    return g;
  },

  /* Model kail pancing (hook) */
  buildHook(){
    const g = new THREE.Group();
    const box = (w, h, d, c, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: c }));
      m.position.set(x, y, z);
      g.add(m);
    };
    box(0.05, 0.26, 0.05, 0xb9c2cc, 0, 0, 0);
    box(0.04, 0.04, 0.12, 0xb9c2cc, 0, -0.15, 0.05);
    box(0.04, 0.11, 0.04, 0xd5dbe2, 0, -0.09, 0.10);
    g.scale.setScalar(0.4);
    g.visible = false;
    return g;
  },

  /* Model ikan yang tersangkut di kail */
  buildHookFish(){
    if (typeof Env_Fish !== 'undefined' && Env_Fish.build) {
      const f = Env_Fish.build();
      f.scale.setScalar(0.55);
      f.visible = false;
      return f;
    }
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.25), new THREE.MeshLambertMaterial({ color: 0xff8c42 }));
    g.add(m);
    g.scale.setScalar(0.6);
    g.visible = false;
    return g;
  },

  /* Inisialisasi senar, bobber & kail ke scene dunia */
  ensureSceneItems(){
    if (!Game.scene) return;
    if (!this.line) {
      const LINE_N = 16;
      this.lineGeo = new THREE.BufferGeometry();
      this.lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LINE_N * 3), 3));
      this.line = new THREE.Line(this.lineGeo, new THREE.LineBasicMaterial({
        color: 0xdddedf,
        transparent: true,
        opacity: 0.85
      }));
      this.line.frustumCulled = false;
      this.line.visible = false;
      Game.scene.add(this.line);
    }
    if (!this.bobber) {
      this.bobber = this.buildBobber();
      Game.scene.add(this.bobber);
    }
    if (!this.hookG) {
      this.hookG = this.buildHook();
      Game.scene.add(this.hookG);
    }
    if (!this.fishG) {
      this.fishG = this.buildHookFish();
      Game.scene.add(this.fishG);
    }
  },

  /* Cek apakah pemain sedang memegang alat pancing */
  isHoldingRod(){
    const held = (typeof RPG !== 'undefined' && RPG.heldId) ? RPG.heldId() : null;
    return held === 'fishing_rod' || held === 'rod' || held === 'pancing';
  },

  /* Mencari titik air di depan pemain untuk mendaratkan kail */
  findWaterTarget(){
    if (typeof Player === 'undefined' || !Player.pos) return null;
    const px = Player.pos.x, pz = Player.pos.z, py = Player.pos.y;
    const yaw = Player.facing;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);

    // Telusuri 2.2 s/d 6.5 blok di depan pemain
    for (let r = 2.4; r <= 6.8; r += 0.55) {
      const tx = px + fx * r;
      const tz = pz + fz * r;
      if (typeof World !== 'undefined' && World.inWaterAt) {
        if (World.inWaterAt(tx, CFG.WATER_Y - 0.2, tz)) {
          return new THREE.Vector3(tx, CFG.WATER_Y + 0.08, tz);
        }
      }
    }
    return null;
  },

  /* Mulai memancing / melempar kail */
  tryCast(){
    if (!this.isHoldingRod()) return false;
    if (this.active && this.state !== 'rest') {
      // Jika sedang memancing tapi belum dapat ikan, klik menarik kail kembali
      if (this.state === 'wait' || this.state === 'splash' || this.state === 'flight') {
        this.go('lift');
        if (typeof UI !== 'undefined' && UI.toast) UI.toast('🎣 Menarik kembali pancingan.');
        return true;
      }
      return false;
    }

    const waterTarget = this.findWaterTarget();
    if (!waterTarget) {
      if (typeof UI !== 'undefined' && UI.toast)
        UI.toast('💧 Arahkan ke perairan di depan untuk memancing!');
      return false;
    }

    this.ensureSceneItems();
    this.active = true;
    this.land.copy(waterTarget);
    this.go('windup');
    if (typeof Sfx !== 'undefined' && Sfx.swing) Sfx.swing(1);
    return true;
  },

  /* Perpindahan State Mesin Pancing */
  go(s){
    this.state = s;
    this.t = 0;
    if (s === 'swing') this.launched = false;
    if (s === 'show') { this.fishFalling = false; this.fishVy = 0; }
    if (s === 'lift' || s === 'rest') {
      this.closeMinigame();
      if (this.bobber) this.bobber.visible = false;
      if (this.fishG) this.fishG.visible = false;
      if (this.line) this.line.visible = (s !== 'rest');
    }
  },

  /* Membuka Minigame di Tengah Layar */
  openMinigame(){
    const mg = this.minigame;
    mg.active = true;
    mg.fishY = 0.4 + Math.random() * 0.25;
    mg.fishTargetY = mg.fishY;
    mg.fishTimer = 0;
    mg.barY = 0.35;
    mg.barVy = 0;
    mg.progress = 30; // Mulai di 30%
    mg.pulling = false;

    // Pilih jenis ikan dari FishSys atau default
    this.pickTargetFish();

    const el = document.getElementById('fishing-minigame');
    if (el) {
      el.classList.remove('hidden');
      const nameEl = document.getElementById('fish-target-name');
      if (nameEl && this.targetFish) {
        nameEl.textContent = `${this.targetFish.name} (${this.targetFish.rarity.toUpperCase()})`;
      }
    }
  },

  closeMinigame(){
    this.minigame.active = false;
    const el = document.getElementById('fishing-minigame');
    if (el) el.classList.add('hidden');
  },

  /* Pilih target ikan acak berdasarkan kelangkaan */
  pickTargetFish(){
    if (typeof FishSys !== 'undefined' && FishSys.DEFS && FishSys.DEFS.length) {
      const r = Math.random();
      let pool = FishSys.DEFS.filter(f => f.rarity === 'common');
      if (r < 0.05) {
        const my = FishSys.DEFS.filter(f => f.rarity === 'mythic');
        if (my.length) pool = my;
      } else if (r < 0.32) {
        const ra = FishSys.DEFS.filter(f => f.rarity === 'rare');
        if (ra.length) pool = ra;
      }
      this.targetFish = pool[(Math.random() * pool.length) | 0];
    } else {
      this.targetFish = { id: 'fish', name: 'Ikan Segar', rarity: 'common', xp: 15 };
    }
  },

  /* Update logika per frame */
  update(dt){
    // Pastikan joran reset bila pemain tidak lagi memegang joran
    if (!this.isHoldingRod()) {
      if (this.active) {
        this.active = false;
        this.go('rest');
      }
      return;
    }

    this.ensureSceneItems();
    if (!this.anchors || !this.anchors.tip) return;

    this.t += dt;
    const _tip = new THREE.Vector3();
    this.anchors.tip.getWorldPosition(_tip);

    const _v1 = _tip.clone(); _v1.y -= 0.28;
    const _v2 = new THREE.Vector3();

    let angT = this.REST_A;
    let bendT = this.REST_B;
    let sagT = 0.22;
    let crankSp = 0;
    const time = performance.now() * 0.001;

    switch (this.state) {
      case 'rest':
        this.lineEnd.lerp(_v1, 1 - Math.exp(-10 * dt));
        if (this.bobber) this.bobber.visible = false;
        if (this.fishG) this.fishG.visible = false;
        if (this.line) this.line.visible = false;
        break;

      case 'windup': {
        const k = Math.min(this.t / 0.45, 1);
        const smoothK = k * k * (3 - 2 * k);
        angT = lerp(this.REST_A, -0.32, smoothK);
        bendT = lerp(this.REST_B, -0.12, smoothK);
        sagT = 0.15;
        _v2.copy(_tip); _v2.y -= 0.25;
        this.lineEnd.lerp(_v2, 1 - Math.exp(-12 * dt));
        if (this.line) this.line.visible = true;
        if (this.t > 0.45) {
          this.go('swing');
          if (typeof Sfx !== 'undefined' && Sfx.cast) Sfx.cast();
        }
        break;
      }

      case 'swing': {
        const k = Math.min(this.t / 0.16, 1);
        const smoothK = 1 - Math.pow(1 - k, 3);
        angT = lerp(-0.32, 0.22, smoothK);
        bendT = lerp(-0.12, 0.18, smoothK);
        sagT = 0.08;
        _v2.copy(_tip); _v2.y -= 0.25;
        this.lineEnd.lerp(_v2, 1 - Math.exp(-16 * dt));
        if (!this.launched && this.t > 0.12) {
          this.launched = true;
          this.launch.copy(_tip);
          this.fdur = clamp(this.launch.distanceTo(this.land) / 8.5, 0.38, 0.65);
          if (this.bobber) this.bobber.visible = true;
        }
        if (this.t > 0.16) this.go('flight');
        break;
      }

      case 'flight': {
        const k = Math.min(this.t / this.fdur, 1);
        _v2.lerpVectors(this.launch, this.land, k);
        _v2.y += Math.sin(k * Math.PI) * (0.85 + this.launch.distanceTo(this.land) * 0.15);
        this.lineEnd.copy(_v2);
        angT = lerp(0.22, this.REST_A, k);
        bendT = lerp(0.18, this.REST_B, k);
        sagT = 0.05;
        if (this.bobber) {
          this.bobber.rotation.x += dt * 8;
          this.bobber.rotation.z += dt * 6;
        }
        if (k >= 1) {
          this.go('splash');
          if (typeof Sfx !== 'undefined' && Sfx.splash) Sfx.splash(false);
          if (typeof FX !== 'undefined') {
            if (FX.debris) FX.debris(this.land.clone().setY(CFG.WATER_Y), 0x8fe0ff, 8, 1.4);
            if (FX.ripple) FX.ripple(this.land.x, CFG.WATER_Y, this.land.z, 0xbfe6f5, 1.4);
          }
        }
        break;
      }

      case 'splash': {
        angT = 0.13; bendT = 0.07; sagT = 0.15;
        this.lineEnd.x = this.land.x;
        this.lineEnd.z = this.land.z;
        this.lineEnd.y = CFG.WATER_Y + 0.08 - 0.12 * (1 - Math.min(this.t / 0.35, 1));
        if (this.t > 0.35) {
          this.go('wait');
          this.waitDur = 2.4 + Math.random() * 3.2;
          this.rippleT = 0;
        }
        break;
      }

      case 'wait': {
        angT = this.REST_A + Math.sin(time * 1.1) * 0.008;
        bendT = this.REST_B + Math.sin(time * 1.4) * 0.012;
        sagT = 0.24;
        this.lineEnd.x = this.land.x;
        this.lineEnd.z = this.land.z;
        this.lineEnd.y = CFG.WATER_Y + 0.08 + Math.sin(time * 2.2 + this.land.x) * 0.025;
        if (this.bobber) {
          this.bobber.rotation.z = Math.sin(time * 1.8) * 0.08;
          this.bobber.rotation.x = Math.cos(time * 1.4) * 0.06;
        }
        this.rippleT -= dt;
        if (this.rippleT <= 0) {
          this.rippleT = 1.3 + Math.random() * 0.8;
          if (typeof FX !== 'undefined' && FX.ripple) FX.ripple(this.land.x, CFG.WATER_Y, this.land.z, 0xbfe6f5, 0.9);
        }
        if (this.t > this.waitDur) {
          this.go('bite');
          if (typeof Sfx !== 'undefined' && Sfx.splash) Sfx.splash(true);
          if (typeof FX !== 'undefined') {
            if (FX.debris) FX.debris(this.land.clone().setY(CFG.WATER_Y), 0x8fe0ff, 10, 1.8);
            if (FX.ripple) FX.ripple(this.land.x, CFG.WATER_Y, this.land.z, 0xffd24d, 1.6);
            if (FX.text) FX.text(this.land.clone().add(new THREE.Vector3(0, 1.1, 0)), '❗ IKAN MENGGIGIT!', '#ffd24d');
          }
        }
        break;
      }

      case 'bite': {
        const k = Math.min(this.t / 0.85, 1);
        angT = this.REST_A + Math.sin(this.t * 36) * 0.03;
        bendT = 0.14 + Math.sin(this.t * 40) * 0.06;
        sagT = 0.12;
        this.lineEnd.x = this.land.x + Math.sin(this.t * 26) * 0.03;
        this.lineEnd.z = this.land.z + Math.cos(this.t * 22) * 0.03;
        this.lineEnd.y = CFG.WATER_Y + 0.08 - (0.16 + Math.abs(Math.sin(this.t * 28)) * 0.08) * Math.min(k * 4, 1);
        if (this.bobber) this.bobber.rotation.z = Math.sin(this.t * 32) * 0.35;
        if (this.t > 0.85) {
          this.go('minigame');
          this.openMinigame();
        }
        break;
      }

      case 'minigame': {
        angT = this.REST_A + 0.06 + Math.sin(time * 8) * 0.015;
        bendT = 0.22 + (this.minigame.pulling ? 0.18 : 0.06) + Math.sin(time * 12) * 0.03;
        sagT = 0.10;
        crankSp = this.minigame.pulling ? 18 : 3;

        this.lineEnd.x = this.land.x + Math.sin(time * 16) * 0.04;
        this.lineEnd.z = this.land.z + Math.cos(time * 14) * 0.04;
        this.lineEnd.y = CFG.WATER_Y + 0.02 + Math.sin(time * 20) * 0.04;

        this.updateMinigame(dt);
        break;
      }

      case 'reel': {
        const u = 1 - Math.pow(1 - Math.min(this.t / this.reelDur, 1), 2);
        _v2.copy(_tip); _v2.y -= 0.32;
        this.lineEnd.x = lerp(this.reelFrom.x, _v2.x, u);
        this.lineEnd.z = lerp(this.reelFrom.z, _v2.z, u);
        this.lineEnd.y = lerp(CFG.WATER_Y + 0.08, _v2.y, u * u) + Math.sin(u * Math.PI) * 0.35 * (1 - u);
        angT = this.REST_A + u * 0.06;
        bendT = this.REST_B + u * 0.24;
        sagT = 0.06 + (1 - u) * 0.08;
        crankSp = 8 + u * 24;
        if (this.bobber) this.bobber.visible = u < 0.85;

        if (this.fishG) {
          this.fishG.visible = true;
          this.fishG.position.copy(this.lineEnd);
          this.fishG.position.y -= 0.24;
          this.fishG.rotation.y = Math.sin(time * 16) * 0.55;
          this.fishG.rotation.z = Math.sin(time * 12) * 0.25;
        }
        if (this.t > this.reelDur) {
          this.go('show');
        }
        break;
      }

      case 'show': {
        angT = lerp(0.18, -0.25, Math.min(this.t / 0.35, 1)) + Math.sin(this.t * 6) * 0.02;
        bendT = 0.42 + Math.sin(this.t * 8) * 0.04;
        sagT = 0.06;
        _v2.copy(_tip); _v2.y -= 0.45;
        this.lineEnd.lerp(_v2, 1 - Math.exp(-8 * dt));
        if (this.bobber) this.bobber.visible = false;
        if (this.fishG) {
          this.fishG.visible = true;
          this.fishG.position.copy(this.lineEnd);
          this.fishG.position.y -= 0.24;
          this.fishG.rotation.y = Math.sin(time * 18) * 0.55;
          this.fishG.rotation.z = 0.25 + Math.sin(time * 11) * 0.15;
        }
        if (this.t > 1.4) {
          this.go('lift');
        }
        break;
      }

      case 'lift': {
        angT = lerp(-0.25, this.REST_A, Math.min(this.t / 0.4, 1));
        bendT = lerp(0.42, this.REST_B, Math.min(this.t / 0.4, 1));
        sagT = 0.20;
        _v2.copy(_tip); _v2.y -= 0.28;
        this.lineEnd.lerp(_v2, 1 - Math.exp(-9 * dt));
        if (this.bobber) this.bobber.visible = false;
        if (this.fishG) this.fishG.visible = false;
        if (this.t > 0.6) {
          this.go('rest');
          this.active = false;
        }
        break;
      }
    }

    this.angle += (angT - this.angle) * (1 - Math.exp(-16 * dt));
    this.bend += (bendT - this.bend) * (1 - Math.exp(-16 * dt));
    this.sag += (sagT - this.sag) * (1 - Math.exp(-8 * dt));
    this.crank += crankSp * dt;

    if (this.crankG) this.crankG.rotation.x = this.crank;
    if (this.rodPivot) this.rodPivot.rotation.x = this.angle;
    if (this.seg1) this.seg1.rotation.x = this.bend * this.B1;
    if (this.seg2) this.seg2.rotation.x = this.bend * this.B2;
    if (this.seg3) this.seg3.rotation.x = this.bend * this.B3;

    if (this.bobber && this.bobber.visible) this.bobber.position.copy(this.lineEnd);
    if (this.hookG && this.line && this.line.visible) {
      this.hookG.visible = true;
      this.hookG.position.copy(this.lineEnd);
      this.hookG.position.y -= (this.bobber && this.bobber.visible) ? 0.18 : 0.03;
      this.hookG.rotation.y = Math.sin(time * 2) * 0.3;
    } else if (this.hookG) {
      this.hookG.visible = false;
    }

    this.updateLine();
  },

  /* Update garis senar pancing Bezier */
  updateLine(){
    if (!this.line || !this.line.visible || !this.anchors) return;
    const _p0 = new THREE.Vector3();
    const _p1 = new THREE.Vector3();
    const _p2 = new THREE.Vector3();
    const _tip = new THREE.Vector3();

    this.anchors.reel.getWorldPosition(_p0);
    this.anchors.g1.getWorldPosition(_p1);
    this.anchors.g2.getWorldPosition(_p2);
    this.anchors.tip.getWorldPosition(_tip);

    const pos = this.lineGeo.attributes.position;
    pos.setXYZ(0, _p0.x, _p0.y, _p0.z);
    pos.setXYZ(1, _p1.x, _p1.y, _p1.z);
    pos.setXYZ(2, _p2.x, _p2.y, _p2.z);
    pos.setXYZ(3, _tip.x, _tip.y, _tip.z);

    const e = this.lineEnd;
    const mx = (_tip.x + e.x) * 0.5;
    const my = (_tip.y + e.y) * 0.5 - this.sag;
    const mz = (_tip.z + e.z) * 0.5;

    for (let i = 1; i <= 12; i++) {
      const t = i / 12, a = 1 - t;
      pos.setXYZ(3 + i,
        a * a * _tip.x + 2 * a * t * mx + t * t * e.x,
        a * a * _tip.y + 2 * a * t * my + t * t * e.y,
        a * a * _tip.z + 2 * a * t * mz + t * t * e.z);
    }
    pos.needsUpdate = true;
  },

  /* Update fisika & logika minigame per frame */
  updateMinigame(dt){
    const mg = this.minigame;
    if (!mg.active) return;

    // Gerak target ikan (bervariasi naik-turun halus & alami)
    mg.fishTimer -= dt;
    if (mg.fishTimer <= 0) {
      mg.fishTimer = 0.8 + Math.random() * 1.4;
      mg.fishTargetY = clamp(mg.fishY + (Math.random() - 0.5) * 0.55, 0.08, 0.92);
      mg.fishSpeed = 0.85 + Math.random() * 0.9;
    }
    mg.fishY = lerp(mg.fishY, mg.fishTargetY, clamp(dt * mg.fishSpeed * 2.2, 0, 1));

    // Kontrol Bar Penangkap oleh Pemain (Pulling vs Gravity - kecepatan lincah & halus)
    if (mg.pulling) {
      mg.barVy = lerp(mg.barVy, 1.15, clamp(8 * dt, 0, 1));
    } else {
      mg.barVy = lerp(mg.barVy, -0.95, clamp(7 * dt, 0, 1));
    }
    mg.barY = clamp(mg.barY + mg.barVy * dt, 0, 1 - mg.barHeight);

    // Cek apakah ikan berada di dalam bar penangkap
    const inCatchZone = (mg.fishY >= mg.barY && mg.fishY <= mg.barY + mg.barHeight);

    if (inCatchZone) {
      mg.progress = Math.min(100, mg.progress + 24 * dt);
    } else {
      mg.progress = Math.max(0, mg.progress - 16 * dt);
    }

    // Render ke DOM
    const barEl = document.getElementById('fish-catch-bar');
    const targetEl = document.getElementById('fish-icon-target');
    const progEl = document.getElementById('fish-progress-fill');

    if (barEl) {
      barEl.style.bottom = (mg.barY * 100) + '%';
      barEl.style.height = (mg.barHeight * 100) + '%';
      barEl.classList.toggle('catching', inCatchZone);
    }
    if (targetEl) {
      targetEl.style.bottom = (mg.fishY * 100) + '%';
    }
    if (progEl) {
      progEl.style.height = mg.progress + '%';
      progEl.style.background = mg.progress > 70 ? '#4eff78' : (mg.progress > 35 ? '#ffd24d' : '#ff4d4d');
    }

    // Kemenangan (Dapat Ikan!)
    if (mg.progress >= 100) {
      this.onFishingSuccess();
    } else if (mg.progress <= 0 && this.t > 1.5) {
      this.onFishingFailed();
    }
  },

  /* Menang Minigame: Ikan Tertangkap! */
  onFishingSuccess(){
    const fish = this.targetFish || { id: 'fish', name: 'Ikan Segar', rarity: 'common', xp: 15 };
    this.closeMinigame();

    this.reelFrom.copy(this.land);
    this.go('reel');
    this.reelDur = 1.6;

    if (typeof Sfx !== 'undefined') {
      if (Sfx.levelup) Sfx.levelup();
      if (Sfx.splash) Sfx.splash(true);
    }

    // Berikan item ke inventaris pemain
    const count = fish.rarity === 'mythic' ? 5 : (fish.rarity === 'rare' ? 2 : 1);
    if (typeof RPG !== 'undefined' && RPG.addItem) {
      const left = RPG.addItem('fish', count);
      if (left > 0 && typeof World !== 'undefined' && World.dropItem) {
        World.dropItem(Player.pos.x, Player.pos.y + 0.5, Player.pos.z, 'fish', left);
      }
      // Sisik ikan
      const scLeft = RPG.addItem('fish_scale', count);
      if (scLeft > 0 && typeof World !== 'undefined' && World.dropItem) {
        World.dropItem(Player.pos.x, Player.pos.y + 0.5, Player.pos.z, 'fish_scale', scLeft);
      }
      // Khusus Leviathan: berikan Sisik Ikan Emas langka
      if (fish.id === 'leviathan') {
        RPG.addItem('golden_fish_scale', 1);
        if (typeof UI !== 'undefined' && UI.toast)
          UI.toast('✨ Mendapatkan Sisik Ikan Emas dari LEVIATHAN!');
      }
    }

    if (typeof Player !== 'undefined' && Player.addXP) {
      Player.addXP(fish.xp || 20);
    }

    if (typeof UI !== 'undefined' && UI.toast) {
      UI.toast(`🐟 Berhasil menangkap ${fish.name}! (+${fish.xp || 20} XP)`);
    }

    if (typeof FX !== 'undefined') {
      if (FX.debris) FX.debris(this.land.clone().setY(CFG.WATER_Y), 0x8fe0ff, 14, 2.5);
      if (FX.text) FX.text(Player.pos.clone().add(new THREE.Vector3(0, 2.1, 0)), `🐟 ${fish.name}!`, '#7dff9d');
    }
  },

  /* Kalah Minigame: Ikan Lepas! */
  onFishingFailed(){
    this.closeMinigame();
    this.go('lift');
    if (typeof Sfx !== 'undefined' && Sfx.splash) Sfx.splash(false);
    if (typeof UI !== 'undefined' && UI.toast) {
      UI.toast('💨 Ikan berhasil meloloskan diri!');
    }
    if (typeof FX !== 'undefined' && FX.text) {
      FX.text(this.land.clone().add(new THREE.Vector3(0, 1.2, 0)), 'Lepas!', '#ff6b57');
    }
  },

  /* Kontrol input minigame */
  onPointerDown(){
    if (this.minigame.active) {
      this.minigame.pulling = true;
    }
  },
  onPointerUp(){
    if (this.minigame.active) {
      this.minigame.pulling = false;
    }
  },

  /* Batalkan memancing secara paksa */
  cancel(){
    if (this.active) {
      this.active = false;
      this.closeMinigame();
      this.go('rest');
    }
  },

  /* Inisialisasi event listener minigame & input */
  init(){
    window.addEventListener('mousedown', e => {
      if (this.minigame.active) {
        this.onPointerDown();
      }
    });
    window.addEventListener('mouseup', e => {
      if (this.minigame.active) {
        this.onPointerUp();
      }
    });
    window.addEventListener('touchstart', e => {
      if (this.minigame.active) {
        this.onPointerDown();
      }
    }, { passive: true });
    window.addEventListener('touchend', e => {
      if (this.minigame.active) {
        this.onPointerUp();
      }
    }, { passive: true });
    window.addEventListener('keydown', e => {
      if (this.minigame.active && (e.code === 'Space' || e.code === 'KeyF')) {
        this.onPointerDown();
      } else if (e.code === 'Escape' && this.active) {
        this.cancel();
      }
    });
    window.addEventListener('keyup', e => {
      if (this.minigame.active && (e.code === 'Space' || e.code === 'KeyF')) {
        this.onPointerUp();
      }
    });
  }
};

window.Fishing = Fishing;
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => { Fishing.init(); });
}
