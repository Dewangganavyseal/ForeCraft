'use strict';
/* =================================================================
FORECRAFT 3D - FROST DAWN BLADE (VOXEL REWORK)
File: js/player/weapons/weapon_sword_frost.js
Konsep unik: pedang kristal es — bilah dari pecahan shard transparan,
guard tanduk es + icicle, aura salju jatuh & kabut beku.
================================================================= */

const WeaponSwordFrost = {
  id: 'sword_frost',
  name: 'Pedang Fajar Beku',
  rarity: 'legendary',
  colors: { blade: 0xd6f4ff, trim: 0x3f8fbf, gem: 0x7fd8ff, rune: 0x7fd8ff, emissive: 0x1c5f8f },

  box(w, h, d, color, emissive = 0x000000) {
    const mat = new THREE.MeshLambertMaterial({ color, emissive: emissive || 0x000000 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.castShadow = true; return m;
  },
  pl(w, h, d, color, y = 0, z = 0, x = 0, emissive = 0x000000) {
    const m = this.box(w, h, d, color, emissive);
    m.position.set(x, y, z); return m;
  },

  build() {
    const W = this.colors;
    const sword = new THREE.Group();
    sword.name = 'Weapon_sword_frost';

    const ice = new THREE.MeshPhongMaterial({ color: W.blade, emissive: W.emissive, emissiveIntensity: 0.3, transparent: true, opacity: 0.86, shininess: 95 });

    /* ---------- Pommel kristal melayang ---------- */
    const pom = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06),
      new THREE.MeshPhongMaterial({ color: W.gem, emissive: W.gem, emissiveIntensity: 0.7, transparent: true, opacity: 0.92, shininess: 100 }));
    pom.position.set(0, 0.335, 0); pom.rotation.set(Math.PI / 4, Math.PI / 4, 0);
    sword.add(pom);
    sword.add(this.pl(0.04, 0.035, 0.04, W.trim, 0.285));

    /* ---------- Grip ---------- */
    sword.add(this.pl(0.055, 0.14, 0.055, 0x27435c, 0.215));
    for (let i = 0; i < 4; i++) sword.add(this.pl(0.064, 0.018, 0.064, W.blade, 0.27 - i * 0.038));

    /* ---------- Guard tanduk es + icicle ---------- */
    sword.add(this.pl(0.30, 0.05, 0.09, W.trim, 0.14));
    sword.add(this.pl(0.11, 0.08, 0.11, W.trim, 0.14));
    sword.add(this.pl(0.31, 0.02, 0.10, W.blade, 0.17));
    for (const sx of [1, -1]) {
      sword.add(this.pl(0.055, 0.05, 0.07, W.trim, 0.17, 0, sx * 0.15));
      sword.add(this.pl(0.048, 0.05, 0.06, W.blade, 0.21, 0, sx * 0.14));
      sword.add(this.pl(0.04, 0.05, 0.05, W.blade, 0.25, 0, sx * 0.13));
      sword.add(this.pl(0.03, 0.05, 0.04, 0xffffff, 0.285, 0, sx * 0.12));
      sword.add(this.pl(0.03, 0.06, 0.04, W.blade, 0.095, 0, sx * 0.14));   // icicle
      sword.add(this.pl(0.02, 0.05, 0.03, 0xffffff, 0.05, 0, sx * 0.135));
    }

    /* ---------- Gem inti kristal es ---------- */
    const gem = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.05),
      new THREE.MeshPhongMaterial({ color: W.gem, emissive: W.gem, emissiveIntensity: 0.7, transparent: true, opacity: 0.9, shininess: 100 }));
    gem.position.set(0, 0.14, 0.06); gem.rotation.y = Math.PI / 4;
    sword.add(gem);

    /* ---------- Bilah kristal: inti + pecahan shard ----------
       BUGFIX celah: core dulu berhenti di y=-0.05, ricasso mulai y=-0.01
       (terpisah 0.04). Core diperpanjang ke atas sampai masuk ke ricasso;
       ujung tip tetap di y=-0.89. */
    sword.add(this.pl(0.10, 0.12, 0.036, W.trim, 0.05));                   // ricasso
    const coreG = new THREE.BoxGeometry(0.085, 0.91, 0.03); coreG.translate(0, -0.435, 0);
    const core = new THREE.Mesh(coreG, ice); core.castShadow = true; sword.add(core);

    const shard = (w, h, d, x, y) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), ice.clone());
      m.position.set(x, y, 0); m.castShadow = true; sword.add(m); return m;
    };
    shard(0.03, 0.46, 0.05, -0.058, -0.33); shard(0.02, 0.1, 0.04, -0.058, -0.6);   // shard kiri
    shard(0.028, 0.58, 0.046, 0.058, -0.44); shard(0.018, 0.1, 0.034, 0.058, -0.77); // shard kanan
    shard(0.016, 0.66, 0.018, 0, -0.5).position.z = 0.032;                            // sirip depan

    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
    for (const x of [0.046, -0.046]) {
      const ed = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.82, 0.014), edgeMat.clone());
      ed.position.set(x, -0.47, 0); sword.add(ed);
    }

    /* ---------- Rune es (belah ketupat) ---------- */
    const runes = [];
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.04),
        new THREE.MeshBasicMaterial({ color: W.rune, transparent: true, opacity: 0.9 }));
      r.position.set(0, -0.24 - i * 0.17, 0); r.rotation.z = Math.PI / 4;
      runes.push(r); sword.add(r);
    }

    /* ---------- Ujung: gugusan icicle ---------- */
    sword.add(this.pl(0.06, 0.09, 0.028, W.blade, -0.93));
    sword.add(this.pl(0.028, 0.12, 0.022, 0xffffff, -1.01));
    sword.add(this.pl(0.02, 0.09, 0.018, 0xffffff, -0.99, 0.026));
    sword.add(this.pl(0.02, 0.08, 0.018, 0xffffff, -0.985, -0.026));

    /* ---------- AURA: salju + kabut beku ---------- */
    const snow = new THREE.Group();
    for (let i = 0; i < 16; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.011, 0.011),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
      f.userData = { a0: i * 0.39, r: 0.08 + (i % 4) * 0.028, sp: 0.22 + (i % 5) * 0.07, ph: i * 0.53 };
      snow.add(f);
    }
    sword.add(snow);

    const mist = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.26 - i * 0.05, 0.05, 0.16),
        new THREE.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.14, depthWrite: false }));
      m.position.set(0, 0.1 - i * 0.07, 0);
      mist.add(m);
    }
    sword.add(mist);

    sword.userData.fx = { snow, mist, pom, gem, core, runes };
    this._sword = sword;
    gem.onBeforeRender = () => this.tick(performance.now() * 0.001);

    sword.position.set(0, -0.31, 0.02);
    sword.rotation.x = -Math.PI / 2;
    return sword;
  },

  tick(t) {
    const s = this._sword; if (!s || !s.userData.fx) return;
    const fx = s.userData.fx;
    fx.snow.children.forEach((f) => {
      const u = f.userData;
      const fall = (t * u.sp + u.ph) % 1.5;
      f.position.set(Math.cos(u.a0 + t * 0.5) * u.r, 0.42 - fall, Math.sin(u.a0 + t * 0.5) * u.r * 0.8);
      f.material.opacity = Math.min(1, 1.5 - fall) * 0.85;
      f.rotation.y = t * 2 + u.a0;
    });
    fx.mist.children.forEach((m, i) => {
      const k = 1 + 0.22 * Math.sin(t * 1.3 + i * 2.1);
      m.scale.set(k, 1, k);
      m.material.opacity = 0.1 + 0.07 * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 2.1));
      m.rotation.y = t * 0.25 + i;
    });
    fx.pom.position.y = 0.335 + Math.sin(t * 2.1) * 0.012;
    fx.pom.rotation.y = Math.PI / 4 + t * 0.9;
    fx.gem.material.emissiveIntensity = 0.55 + 0.35 * Math.sin(t * 2.6);
    fx.core.material.emissiveIntensity = 0.25 + 0.18 * Math.sin(t * 1.8);
    fx.runes.forEach((r, i) => { r.material.opacity = 0.55 + 0.4 * Math.abs(Math.sin(t * 2 + i)); });
  }
};

window.WeaponSwordFrost = WeaponSwordFrost;