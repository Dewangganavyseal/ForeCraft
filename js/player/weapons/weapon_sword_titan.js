'use strict';
/* =================================================================
FORECRAFT 3D - TITAN CRUSHER (VOXEL REWORK)
File: js/player/weapons/weapon_sword_titan.js
Konsep unik: greatsword raksasa dari lempeng batu vulkanik retak
dengan sungai lava di antaranya; aura bara api, asap & panas.
================================================================= */

const WeaponSwordTitan = {
  id: 'sword_titan',
  name: 'Penghancur Titan',
  rarity: 'legendary',
  colors: { blade: 0xffb066, trim: 0x8f3c1c, gem: 0xff7a3c, rune: 0xff7a3c, emissive: 0x8f3c1c, rock: 0x2e211b },

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
    sword.name = 'Weapon_sword_titan';

    /* ---------- Pommel obsidian + inti magma ---------- */
    sword.add(this.pl(0.09, 0.07, 0.09, 0x241a14, 0.315));
    const lavaCore = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.05, 0.095),
      new THREE.MeshBasicMaterial({ color: W.gem, transparent: true, opacity: 0.95 }));
    lavaCore.position.set(0, 0.315, 0); lavaCore.rotation.y = Math.PI / 4;
    sword.add(lavaCore);

    /* ---------- Grip tebal ---------- */
    sword.add(this.pl(0.062, 0.16, 0.062, 0x3a2a1c, 0.23));
    for (let i = 0; i < 4; i++) sword.add(this.pl(0.072, 0.022, 0.072, 0x241a14, 0.29 - i * 0.042));

    /* ---------- Guard obsidian raksasa + rantai ---------- */
    sword.add(this.pl(0.36, 0.06, 0.11, W.trim, 0.135));
    sword.add(this.pl(0.14, 0.09, 0.13, W.trim, 0.135));
    sword.add(this.pl(0.38, 0.025, 0.12, 0x241a14, 0.17));
    for (const sx of [1, -1]) {
      sword.add(this.pl(0.07, 0.08, 0.08, W.trim, 0.16, 0, sx * 0.19));
      sword.add(this.pl(0.06, 0.08, 0.07, 0x241a14, 0.215, 0, sx * 0.20));
      sword.add(this.pl(0.045, 0.07, 0.055, 0x241a14, 0.265, 0, sx * 0.205));
      sword.add(this.pl(0.03, 0.06, 0.04, W.gem, 0.305, 0, sx * 0.21, W.gem));
    }
    const chain = new THREE.Group();
    for (let i = 0; i < 3; i++) chain.add(this.pl(0.02, 0.022, 0.02, 0x666e78, -0.035 * i));
    chain.position.set(0.18, 0.09, 0);
    sword.add(chain);

    /* ---------- Gem magma ---------- */
    const gem = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.06),
      new THREE.MeshPhongMaterial({ color: W.gem, emissive: W.gem, emissiveIntensity: 0.7, transparent: true, opacity: 0.95, shininess: 100 }));
    gem.position.set(0, 0.135, 0.07); gem.rotation.y = Math.PI / 4;
    sword.add(gem);

    /* ---------- Bilah lempeng vulkanik (siluet kasar) ----------
       BUGFIX celah: slab teratas dulu berhenti di y=-0.055, ricasso mulai
       y=-0.04 (terpisah). Slab[0] diperpanjang ke atas (h:0.195) sampai masuk
       ke ricasso; dasar slab & ujung tip tidak bergeser. */
    sword.add(this.pl(0.13, 0.14, 0.05, W.trim, 0.03)); // ricasso besar
    const SLAB = [
      { y: -0.1075, w: 0.125, h: 0.195 }, { y: -0.27, w: 0.135 }, { y: -0.41, w: 0.12 },
      { y: -0.55, w: 0.14 },  { y: -0.69, w: 0.115 }, { y: -0.83, w: 0.095 },
    ];
    SLAB.forEach((g) => {
      const gh = g.h !== undefined ? g.h : 0.15;
      const m = new THREE.Mesh(new THREE.BoxGeometry(g.w, gh, 0.046),
        new THREE.MeshLambertMaterial({ color: W.rock, emissive: 0x1a0d08 }));
      m.position.set(0, g.y, 0); m.castShadow = true; sword.add(m);
    });

    // Sungai lava di antara lempeng
    const lava = [];
    for (let i = 0; i < SLAB.length - 1; i++) {
      const lj = new THREE.Mesh(new THREE.BoxGeometry(Math.min(SLAB[i].w, SLAB[i + 1].w) - 0.015, 0.014, 0.05),
        new THREE.MeshBasicMaterial({ color: W.rune, transparent: true, opacity: 0.85 }));
      lj.position.set(0, (SLAB[i].y + SLAB[i + 1].y) / 2, 0);
      lava.push(lj); sword.add(lj);
    }
    // Retakan lava di permukaan
    const CR = [{ x: -0.02, y: -0.3, h: 0.16, rz: 0.3 }, { x: 0.03, y: -0.52, h: 0.2, rz: -0.2 }, { x: -0.01, y: -0.72, h: 0.14, rz: 0.15 }];
    for (const c of CR) for (const zz of [0.025, -0.025]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.012, c.h, 0.008),
        new THREE.MeshBasicMaterial({ color: W.rune, transparent: true, opacity: 0.8 }));
      m.position.set(c.x, c.y, zz); m.rotation.z = c.rz;
      lava.push(m); sword.add(m);
    }
    // Sisi tajam panas membara
    const hotEdge = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.72, 0.02),
      new THREE.MeshBasicMaterial({ color: 0xffcf7a, transparent: true, opacity: 0.85 }));
    hotEdge.position.set(0.062, -0.48, 0); lava.push(hotEdge); sword.add(hotEdge);

    /* ---------- Rune magma besar ---------- */
    const runes = [];
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.052),
        new THREE.MeshBasicMaterial({ color: W.rune, transparent: true, opacity: 0.9 }));
      r.position.set(0, -0.27 - i * 0.2, 0); r.rotation.z = Math.PI / 4;
      runes.push(r); sword.add(r);
    }

    /* ---------- Ujung pahat brutal ---------- */
    sword.add(this.pl(0.10, 0.09, 0.04, W.rock, -0.94));
    sword.add(this.pl(0.07, 0.08, 0.034, W.rock, -1.01));
    sword.add(this.pl(0.045, 0.06, 0.026, W.blade, -1.06, 0, 0, W.gem));

    /* ---------- AURA: bara api + asap + selubung panas ---------- */
    const embers = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.012),
        new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xffd27a : 0xff7a3c, transparent: true, opacity: 0.9 }));
      e.userData = { x0: -0.05 + (i % 5) * 0.025, z0: (i % 2 ? 1 : -1) * 0.035, sp: 0.3 + (i % 4) * 0.09, ph: i * 0.47 };
      embers.add(e);
    }
    sword.add(embers);

    const smoke = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const sm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05),
        new THREE.MeshBasicMaterial({ color: 0x3a3a3a, transparent: true, opacity: 0.25, depthWrite: false }));
      sm.userData = { sp: 0.16 + i * 0.05, ph: i * 0.9, x0: (i % 2 ? -1 : 1) * 0.03 };
      smoke.add(sm);
    }
    sword.add(smoke);

    const heat = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.95, 0.07),
      new THREE.MeshBasicMaterial({ color: 0xff8c3c, transparent: true, opacity: 0.07, depthWrite: false }));
    heat.position.set(0, -0.5, 0); sword.add(heat);

    sword.userData.fx = { embers, smoke, heat, chain, lavaCore, gem, lava, runes };
    this._sword = sword;
    gem.onBeforeRender = () => this.tick(performance.now() * 0.001);

    sword.position.set(0, -0.31, 0.02);
    sword.rotation.x = -Math.PI / 2;
    return sword;
  },

  tick(t) {
    const s = this._sword; if (!s || !s.userData.fx) return;
    const fx = s.userData.fx;
    fx.embers.children.forEach((e) => {
      const u = e.userData;
      const k = (t * u.sp + u.ph) % 1.3;
      e.position.set(u.x0 + Math.sin(t * 2 + u.ph) * 0.02, -0.95 + k, u.z0);
      e.material.opacity = Math.max(0, 0.95 - k * 0.75);
      e.rotation.set(t * 4 + u.ph, t * 3, 0);
    });
    fx.smoke.children.forEach((m) => {
      const u = m.userData;
      const k = (t * u.sp + u.ph) % 1.6;
      m.position.set(u.x0 + Math.sin(t * 0.8 + u.ph) * 0.04, -0.9 + k * 1.1, 0);
      const sc = 0.6 + k;
      m.scale.set(sc, sc, sc);
      m.material.opacity = Math.max(0, 0.28 - k * 0.18);
    });
    const pulse = 0.6 + 0.4 * Math.sin(t * 2.2);
    fx.lava.forEach((l) => { l.material.opacity = 0.5 + 0.45 * pulse; });
    fx.lavaCore.scale.setScalar(1 + 0.08 * pulse);
    fx.heat.material.opacity = 0.05 + 0.04 * pulse;
    fx.chain.rotation.z = Math.sin(t * 1.8) * 0.22;
    fx.gem.material.emissiveIntensity = 0.6 + 0.35 * pulse;
    fx.runes.forEach((r, i) => { r.material.opacity = 0.55 + 0.4 * Math.abs(Math.sin(t * 1.9 + i)); });
  }
};

window.WeaponSwordTitan = WeaponSwordTitan;