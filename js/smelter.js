'use strict';
/* =============================================================================
   SMELTER BATU JADUL (PELEBURAN BIJIH & BATU BARA)
   -----------------------------------------------------------------------------
   Diporting dari prototype otentik "NEW MODEL/Smelter, Ore.html".
   Fitur:
     - Mengubah 2 Ore menjadi 1 Ingot (durasi 10 detik per ingot).
     - Bahan bakar Batu Bara (Coal): 1 Coal bertahan 1 menit (60 detik).
     - Dapat memasukkan 1x, 10x, atau Semua Ore dan Coal sekaligus.
     - Live UI: hasil Ingot dan cadangan bahan bakar terupdate langsung tanpa
       perlu menutup panel UI.
     - Model Voxel 3D otentik "Smelter Batu Jadul":
         * Pondasi & tumpukan batu bertingkat mengecil ke atas
         * Balok kayu perancah melintang dengan lentera berayun
         * Mulut tungku lengkung batu, batu kunci, ambang & kayu bakar
         * Cahaya point light & glow api berkedip (flicker)
         * 5 lidah kobaran api 3D di mulut tungku
         * Kepulan partikel asap dari puncak cerobong & percikan bara api
   ============================================================================= */

const Smelter = {
  SCALE: 1.0,
  ORE_PER_INGOT: 2,
  COOK_DURATION: 10.0, // 10 detik per 1 ingot
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
      x: pos.x + (Math.random() - 0.5) * 0.2,
      y: pos.y + 0.05,
      z: pos.z + (Math.random() - 0.5) * 0.2,
      vx: 0.05 + (Math.random() - 0.5) * 0.15,
      vy: (0.7 + Math.random() * 0.4) * b,
      vz: (Math.random() - 0.5) * 0.15,
      age: 0, life: 2.2 + Math.random() * 1.2,
      s0: 0.10 * b, s1: 0.42 * b,
      op: 0.45, g: -0.05, drag: 0.28, spin: (Math.random() - 0.5) * 1.2
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
      vx: (Math.random() - 0.5) * 0.25,
      vy: 0.8 + Math.random() * 0.6,
      vz: 0.05 + (Math.random() - 0.5) * 0.2,
      age: 0, life: 0.7 + Math.random() * 0.5,
      s0: 0.04, s1: 0.01,
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

  /* ---------- BUILD MODEL 3D VOXEL OTENTIK DARI Smelter, Ore.html ---------- */
  buildModel() {
    this.initPools();
    const group = new THREE.Group();

    // Cache material Lambert per warna
    const mats = new Map();
    const getMat = c => {
      let m = mats.get(c);
      if (!m) { m = new THREE.MeshLambertMaterial({ color: c }); mats.set(c, m); }
      return m;
    };
    const bGeo = new THREE.BoxGeometry(1, 1, 1);
    const box = (x, y, z, w, h, d, c, ry = 0, rz = 0, rx = 0, parent = group) => {
      const m = new THREE.Mesh(bGeo, getMat(c));
      m.position.set(x, y, z);
      m.scale.set(w, h, d);
      if (rx) m.rotation.x = rx;
      if (rz) m.rotation.z = rz;
      if (ry) m.rotation.y = ry;
      m.castShadow = true; m.receiveShadow = true;
      parent.add(m);
      return m;
    };

    const S = [0x6e727a, 0x5f636b, 0x7b7f88, 0x565a62, 0x686c74]; // variasi warna batu
    const WOOD = 0x6e5232, WOOD2 = 0x5f452c;
    const lerp = (a, b, t) => a + (b - a) * t;

    // ---- 1. Pondasi Batu ----
    box(0, 0.08, 0, 1.75, 0.16, 1.55, S[3], 0.01);
    box(0, 0.20, 0, 1.55, 0.10, 1.38, S[1], -0.02);

    // ---- 2. Badan: Lapisan Batu Ditumpuk, Tapering Mengecil ke Atas ----
    let y = 0.25, i = 0;
    while (y < 1.95) {
      const t = (y - 0.25) / (1.95 - 0.25);
      const w = lerp(1.3, 0.62, t), d = lerp(1.14, 0.58, t), h = 0.24;
      const c1 = S[(i * 2) % 5], c2 = S[(i * 2 + 1) % 5];
      const ox = Math.sin(i * 12.9) * 0.015, oz = Math.cos(i * 7.7) * 0.015;
      const ry = Math.sin(i * 5.3) * 0.025;
      if (i % 2 === 0) {
        const sp = w * (0.45 + 0.1 * Math.sin(i * 3.7));
        box(-w / 2 + sp / 2 + ox, y + h / 2, oz, sp, h, d, c1, ry);
        box(-w / 2 + sp + (w - sp) / 2 + ox, y + h / 2, -oz, w - sp, h, d, c2, ry);
      } else {
        const sp = d * (0.5 + 0.12 * Math.cos(i * 2.3));
        box(ox, y + h / 2, -d / 2 + sp / 2 + oz, w, h, sp, c2, ry);
        box(-ox, y + h / 2, -d / 2 + sp + (d - sp) / 2 + oz, w, h, d - sp, c1, ry);
      }
      // Batu menonjol acak (tekstur tumpukan kasar alami)
      if (i % 2 === 1) box(w / 2 + 0.03, y + h / 2, 0.1, 0.12, 0.14, 0.2, S[(i + 3) % 5], 0.2);
      if (i % 3 === 0) box(-w / 2 - 0.03, y + h / 2, -0.12, 0.12, 0.13, 0.18, S[(i + 2) % 5], -0.15);
      if (y >= 1.21) box(0.18, y + h / 2 + 0.02, d / 2 + 0.02, 0.2, 0.13, 0.1, S[(i + 1) % 5], 0.1);
      y += h; i++;
    }

    // ---- 3. Puncak Cerobong: Rim Batu + Lubang Gelap ----
    box(0, 1.99, 0, 0.8, 0.12, 0.74, S[4], 0.02);
    box(0, 2.03, 0, 0.5, 0.06, 0.44, 0x191b1f);

    // ---- 4. Balok Kayu Melintang (Perancah Jadul Penyangga Lentera) ----
    box(0, 1.35, -0.1, 1.5, 0.09, 0.09, WOOD, 0, 0, 0.02);
    box(0.15, 1.50, 0, 0.09, 0.09, 1.15, WOOD2, 0.03);

    // ---- 5. Mulut Tungku: Lengkung Batu, Pilar & Ambang ----
    box(-0.24, 0.62, 0.60, 0.16, 0.56, 0.18, S[1], 0.03);            // Pilar kiri
    box(0.34, 0.62, 0.60, 0.16, 0.56, 0.18, S[3], -0.03);           // Pilar kanan
    box(-0.14, 0.95, 0.60, 0.24, 0.12, 0.18, S[2], 0, 0.45);        // Batu lengkung kiri
    box(0.24, 0.95, 0.60, 0.24, 0.12, 0.18, S[0], 0, -0.45);        // Batu lengkung kanan
    box(0.05, 1.03, 0.60, 0.18, 0.14, 0.18, S[1]);                  // Batu kunci lengkung
    box(0.05, 0.62, 0.52, 0.52, 0.60, 0.10, 0x17110c);              // Rongga gelap dalam
    box(0.05, 0.30, 0.62, 0.70, 0.09, 0.24, S[3]);                  // Ambang bawah
    box(0.05, 0.24, 0.80, 0.80, 0.08, 0.20, S[1], 0.02);            // Tangga batu
    box(-0.07, 0.42, 0.58, 0.30, 0.06, 0.07, 0x4a3524, 0.4);        // Kayu bakar bersilang
    box(0.17, 0.42, 0.60, 0.30, 0.06, 0.07, 0x3d2b1d, -0.4);

    // ---- 6. Batu Lepas & Lumut Sekitar Dasar ----
    box(0.78, 0.30, 0.55, 0.22, 0.16, 0.20, S[0], 0.4);
    box(-0.82, 0.28, 0.48, 0.18, 0.14, 0.18, S[2], -0.3);
    box(0.62, 0.26, -0.62, 0.20, 0.14, 0.20, S[1], 0.8);
    box(0.70, 0.27, -0.50, 0.14, 0.04, 0.10, 0x4e9843, 0.3);
    box(-0.75, 0.27, -0.55, 0.12, 0.04, 0.12, 0x59a84c, -0.5);

    // ---- 7. Lentera Menggantung di Ujung Balok (Berayun Dinamis) ----
    const lantern = new THREE.Group();
    lantern.position.set(0.72, 1.31, -0.1);
    box(0, -0.05, 0, 0.03, 0.10, 0.03, 0x3a3d44, 0, 0, 0, lantern); // Rantai gantung
    box(0, -0.13, 0, 0.14, 0.05, 0.14, 0x3a3d44, 0, 0, 0, lantern); // Atap lentera
    box(0, -0.24, 0, 0.15, 0.05, 0.15, 0x3a3d44, 0, 0, 0, lantern); // Dasar lentera
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0x2a2a2a });
    const glass = new THREE.Mesh(bGeo, lanternMat);
    glass.position.set(0, -0.185, 0);
    glass.scale.set(0.10, 0.14, 0.10);
    lantern.add(glass);
    group.add(lantern);

    // ---- 8. Glow Bara Api & Point Light ----
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 0.52),
      new THREE.MeshBasicMaterial({ color: 0xff7b24, transparent: true, opacity: 0.5, depthWrite: false })
    );
    glow.position.set(0.05, 0.60, 0.585);
    group.add(glow);

    const light = new THREE.PointLight(0xff7a2a, 1.1, 4.5, 2);
    light.position.set(0.05, 0.55, 0.80);
    group.add(light);

    // ---- 9. 5 Lidah Kobaran Api di Mulut Tungku ----
    const flames = [];
    const fcols = [0xffd23e, 0xffb02e, 0xff841a, 0xffe27a];
    for (let j = 0; j < 5; j++) {
      const mt = new THREE.MeshBasicMaterial({ color: fcols[j % 4], transparent: true, opacity: 0, depthWrite: false });
      const ms = new THREE.Mesh(bGeo, mt);
      ms.frustumCulled = false;
      group.add(ms);
      flames.push({
        ms, mt,
        x: 0.05 + ((j % 3) - 1) * 0.11,
        z: 0.60 + Math.floor(j / 3) * 0.03,
        sp: 0.9 + Math.random() * 0.8,
        ph: Math.random(),
        sd: j * 2.3
      });
    }

    // ---- 10. Anchor Titik Partikel ----
    const ancSmoke = new THREE.Object3D();
    ancSmoke.position.set(0, 2.05, 0);
    group.add(ancSmoke);

    const ancMouth = new THREE.Object3D();
    ancMouth.position.set(0.05, 0.75, 0.80);
    group.add(ancMouth);

    group.userData.smelter = {
      glow, light, flames, lantern, lanternMat,
      ancSmoke, ancMouth,
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
    let stateChanged = false;

    // 1. AUTO-CONSUME COAL bila api habis dan masih ada ore yang bisa dimasak
    if (sm.fuelTime <= 0 && sm.fuelCoal > 0 && sm.oreCount >= this.ORE_PER_INGOT) {
      sm.fuelCoal--;
      sm.fuelTime += this.COAL_DURATION; // 1 coal = 60 detik!
      stateChanged = true;
    }

    // 2. LOGIKA PELEBURAN (10 DETIK PER INGOT)
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
        stateChanged = true;

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

      // Lentera menggantung berayun + menyala saat smelter hidup
      if (mData.lantern) {
        mData.lantern.rotation.z = Math.sin(time * 1.7) * 0.12 + (smelterOn ? Math.sin(time * 5.3) * 0.02 : 0);
      }
      if (mData.lanternMat) {
        mData.lanternMat.color.setHex(smelterOn ? 0xffb02e : 0x2a2a2a);
      }

      // Cahaya & Glow Mulut Tungku
      if (mData.light) {
        const targetLi = smelterOn ? (1.15 + Math.sin(time * 13) * 0.25 + Math.sin(time * 29.5) * 0.15) : 0;
        mData.light.intensity += (targetLi - mData.light.intensity) * Math.min(dt * (smelterOn ? 18 : 3), 1);
      }
      if (mData.glow && mData.glow.material) {
        mData.glow.material.opacity = smelterOn
          ? (0.45 + Math.sin(time * 11) * 0.10 + Math.sin(time * 27) * 0.05)
          : Math.max(0, mData.glow.material.opacity - dt * 0.8);
      }

      // 5 Lidah Kobaran Api di Mulut Tungku
      if (mData.flames) {
        for (const fl of mData.flames) {
          fl.ms.visible = smelterOn;
          if (!smelterOn) continue;
          fl.ph = (fl.ph + dt * fl.sp * 0.85) % 1;
          const t = fl.ph, s = (1 - t) * (0.045 + (fl.sd * 7 % 5) * 0.007);
          fl.ms.position.set(fl.x + Math.sin(time * 3 + fl.sd) * 0.025, 0.44 + t * 0.35, fl.z);
          fl.ms.scale.set(s, s * (1.5 + t), s);
          fl.mt.opacity = (1 - t * t) * 0.95;
        }
      }

      // Partikel Asap Cerobong & Percikan Bara Api
      const pDist = (typeof Player !== 'undefined' && Player.pos)
        ? Math.hypot(f.x - Player.pos.x, f.z - Player.pos.z) : 0;
      if (smelterOn && pDist < 45) {
        mData.smokeTimer = (mData.smokeTimer || 0) + dt;
        if (mData.smokeTimer >= 0.24) {
          mData.smokeTimer = 0;
          const wPosSmoke = new THREE.Vector3();
          if (mData.ancSmoke) mData.ancSmoke.getWorldPosition(wPosSmoke);
          else wPosSmoke.set(f.x, f.y + 2.05, f.z);
          this.emitSmoke(wPosSmoke, true);
        }
        mData.emberTimer = (mData.emberTimer || 0) + dt;
        if (mData.emberTimer >= 0.45) {
          mData.emberTimer = 0;
          const wPosMouth = new THREE.Vector3();
          if (mData.ancMouth) mData.ancMouth.getWorldPosition(wPosMouth);
          else wPosMouth.set(f.x + 0.05, f.y + 0.75, f.z + 0.8);
          this.emitEmber(wPosMouth);
        }
      }
    }

    // Refresh UI secara live bila panel sedang dibuka untuk smelter ini
    if (this.currentFurni === f && typeof UI !== 'undefined' && UI.open === 'smelter') {
      if (stateChanged) {
        this.render();
      } else {
        this._liveUpdateUI();
      }
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
      el.innerHTML = '<p class="tip">Dekati Smelter untuk menggunakannya.</p>';
      return;
    }
    const sm = f.smelter || (f.smelter = { fuelTime: 0, fuelCoal: 0, oreType: null, oreCount: 0, cookProgress: 0, outType: null, outCount: 0 });

    const coalInBag = (typeof RPG !== 'undefined' && RPG.countItem) ? RPG.countItem('coal') : 0;
    const isSmelting = (sm.fuelTime > 0 && sm.oreCount >= this.ORE_PER_INGOT);
    const progressPct = isSmelting ? Math.min(100, Math.round((sm.cookProgress / this.COOK_DURATION) * 100)) : 0;
    const oreInBag = (sm.oreType && typeof RPG !== 'undefined' && RPG.countItem) ? RPG.countItem(sm.oreType) : 0;

    let html = `
      <div class="smelter-container">
        <!-- BARIS STATUS & INDIKATOR API -->
        <div id="sm-status-card" class="smelter-status-card ${sm.fuelTime > 0 ? 'active' : ''}">
          <div class="ssc-left">
            <span class="ssc-fire-ico" id="sm-status-ico">${sm.fuelTime > 0 ? '🔥' : '⚫'}</span>
            <div class="ssc-info">
              <b id="sm-status-title">${sm.fuelTime > 0 ? (isSmelting ? 'SEDANG MELEBUR ORE' : 'TUNGKU PANAS (MENUNGGU ORE)') : 'TUNGKU PADAM (BUTUH BATU BARA)'}</b>
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
              <div class="sm-slot-qty" id="sm-fuel-coal-qty">${sm.fuelCoal}x</div>
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
                <span class="sm-slot-ico">${(typeof UI !== 'undefined' && UI.itemIcon) ? UI.itemIcon(sm.oreType) : (ITEMS[sm.oreType] ? ITEMS[sm.oreType].e : '🔘')}</span>
                <div class="sm-slot-qty" id="sm-ore-qty">${sm.oreCount}x</div>
                <div class="sm-slot-sub">${ITEMS[sm.oreType] ? ITEMS[sm.oreType].n : sm.oreType}</div>
              </div>
              <!-- PROGRESS BAR PELEBURAN -->
              <div class="sm-progress-wrap">
                <div class="sm-progress-label"><span id="sm-prog-txt">${progressPct}%</span> (10s / Ingot)</div>
                <div class="sm-progress-track"><div id="sm-prog-fill" style="width:${progressPct}%"></div></div>
              </div>
              <div class="sm-btn-group">
                ${oreInBag > 0 ? `
                  <button class="sm-btn mini" onclick="Smelter.insertOre('${sm.oreType}', 1)">+1x</button>
                  <button class="sm-btn mini" onclick="Smelter.insertOre('${sm.oreType}', 10)" ${oreInBag >= 10 ? '' : 'disabled'}>+10x</button>
                  <button class="sm-btn mini sm-btn-all" onclick="Smelter.insertOre('${sm.oreType}', ${oreInBag})">All (${oreInBag})</button>
                ` : ''}
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
            <div id="sm-out-slot" class="sm-slot sm-slot-out ${sm.outCount > 0 ? 'has-item' : ''}">
              ${sm.outType && sm.outCount > 0 ? `
                <span class="sm-slot-ico">${(typeof UI !== 'undefined' && UI.itemIcon) ? UI.itemIcon(sm.outType) : (ITEMS[sm.outType] ? ITEMS[sm.outType].e : '📦')}</span>
                <div class="sm-slot-qty" id="sm-out-qty">${sm.outCount}x</div>
                <div class="sm-slot-sub">${ITEMS[sm.outType] ? ITEMS[sm.outType].n : sm.outType}</div>
              ` : `
                <span class="sm-slot-ico empty">📦</span>
                <div class="sm-slot-qty" id="sm-out-qty" style="display:none">0x</div>
                <div class="sm-slot-sub empty">Belum ada hasil</div>
              `}
            </div>
            <button id="sm-take-btn" class="big sm-btn-take" onclick="Smelter.collectOutput()" ${sm.outCount > 0 ? '' : 'disabled'}>
              ✨ Ambil Ingot (${sm.outCount || 0})
            </button>
          </div>
        </div>
      </div>
    `;

    el.innerHTML = html;
  },

  /* List pilihan ore yang ada di inventory pemain dengan opsi 1x, 10x, dan All */
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
            <span class="opi-ico">${(typeof UI !== 'undefined' && UI.itemIcon) ? UI.itemIcon(id) : (it ? it.e : '🔘')}</span>
            <div class="opi-info">
              <b>${it ? it.n : id}</b>
              <span>Punya: ${count}x</span>
            </div>
            <div class="opi-btns">
              <button class="sm-btn mini" onclick="Smelter.insertOre('${id}', 1)" title="Masukkan 1x">1x</button>
              <button class="sm-btn mini" onclick="Smelter.insertOre('${id}', 10)" ${count >= 10 ? '' : 'disabled'} title="Masukkan 10x">10x</button>
              <button class="sm-btn mini sm-btn-all" onclick="Smelter.insertOre('${id}', ${count})" title="Masukkan Semua">All (${count})</button>
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

  /* Update halus elemen progress & timer di UI setiap frame */
  _liveUpdateUI() {
    if (typeof document === 'undefined') return;
    const f = this.currentFurni;
    if (!f || !f.smelter) return;
    const sm = f.smelter;

    const fuelTxt = document.getElementById('sm-fuel-txt');
    if (fuelTxt) fuelTxt.innerHTML = `Sisa Api: ${Math.ceil(sm.fuelTime)}s &nbsp;•&nbsp; Cadangan Coal: ${sm.fuelCoal}x`;

    const fuelCoalQty = document.getElementById('sm-fuel-coal-qty');
    if (fuelCoalQty) fuelCoalQty.textContent = `${sm.fuelCoal}x`;

    const fuelFill = document.getElementById('sm-fuel-fill');
    if (fuelFill) fuelFill.style.width = Math.min(100, (sm.fuelTime / this.COAL_DURATION) * 100) + '%';

    const isSmelting = (sm.fuelTime > 0 && sm.oreCount >= this.ORE_PER_INGOT);
    const pct = isSmelting ? Math.min(100, Math.round((sm.cookProgress / this.COOK_DURATION) * 100)) : 0;

    const progFill = document.getElementById('sm-prog-fill');
    if (progFill) progFill.style.width = pct + '%';

    const progTxt = document.getElementById('sm-prog-txt');
    if (progTxt) progTxt.textContent = pct + '%';

    const oreQty = document.getElementById('sm-ore-qty');
    if (oreQty) oreQty.textContent = `${sm.oreCount}x`;

    const outQty = document.getElementById('sm-out-qty');
    if (outQty && sm.outCount > 0) {
      outQty.style.display = '';
      outQty.textContent = `${sm.outCount}x`;
    }

    const takeBtn = document.getElementById('sm-take-btn');
    if (takeBtn) {
      takeBtn.disabled = (sm.outCount <= 0);
      takeBtn.textContent = `✨ Ambil Ingot (${sm.outCount || 0})`;
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
    if (typeof UI !== 'undefined' && UI.toast) UI.toast(`🔘 Memasukkan ${amount}x ${ITEMS[oreId] ? ITEMS[oreId].n : oreId}`);
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
    if (typeof UI !== 'undefined' && UI.toast) UI.toast(`📦 Menarik kembali ${count}x ${ITEMS[oreId] ? ITEMS[oreId].n : oreId}`);
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
    if (typeof UI !== 'undefined' && UI.toast) UI.toast(`✨ Berhasil mengambil ${count}x ${ITEMS[ingotId] ? ITEMS[ingotId].n : ingotId}!`);
    if (typeof Player !== 'undefined' && Player.addXP) Player.addXP(count * 6);
    if (typeof Furni !== 'undefined' && Furni.save) Furni.save();
    this.render();
  }
};

window.Smelter = Smelter;

