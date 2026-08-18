'use strict';
/* =================================================================
FORECRAFT 3D - VENOM FANG (VOXEL REWORK)
File: js/player/weapons/weapon_sword_venom.js
Konsep unik: pedang taring ular melengkung — pommel kepala ular hidup,
guard tengkorak bertaring, bilah bersisik, aura racun menetes & asam.
================================================================= */

const WeaponSwordVenom = {
  id: 'sword_venom',
  name: 'Taring Racun',
  rarity: 'epic',
  colors: { blade: 0xa8e86a, trim: 0x4f7d3a, gem: 0x9ad84f, rune: 0x9ad84f, emissive: 0x2f4d22, fang: 0xe8e2cf, acid: 0x7fff2a },

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
    sword.name = 'Weapon_sword_venom';

    /* ---------- Pommel kepala ular ---------- */
    const head = new THREE.Group();
    head.add(this.pl(0.07, 0.055, 0.09, W.trim, 0));
    head.add(this.pl(0.05, 0.03, 0.04, W.trim, 0.01, 0.06));
    const eyes = [];
    for (const sx of [1, -1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.016),
        new THREE.MeshBasicMaterial({ color: 0xffd83c }));
      eye.position.set(sx * 0.026, 0.02, 0.03); head.add(eye); eyes.push(eye);
    }
    const tongue = this.pl(0.012, 0.01, 0.05, 0xd4453c, 0, 0.1, 0);
    head.add(tongue);
    head.position.set(0, 0.32, 0);
    sword.add(head);

    /* ---------- Grip sisik ---------- */
    sword.add(this.pl(0.055, 0.15, 0.055, 0x3c5a2c, 0.225));
    for (let i = 0; i < 5; i++) sword.add(this.pl(0.065, 0.016, 0.065, i % 2 ? W.blade : W.trim, 0.285 - i * 0.032));

    /* ---------- Guard tengkorak + taring ---------- */
    sword.add(this.pl(0.28, 0.06, 0.10, W.trim, 0.14));
    sword.add(this.pl(0.12, 0.09, 0.11, W.trim, 0.14));
    sword.add(this.pl(0.29, 0.02, 0.09, W.blade, 0.175));
    for (const sx of [1, -1]) {
      sword.add(this.pl(0.04, 0.06, 0.045, W.fang, 0.1, 0.02, sx * 0.12));
      sword.add(this.pl(0.03, 0.05, 0.035, W.fang, 0.055, 0.035, sx * 0.125));
      sword.add(this.pl(0.018, 0.04, 0.022, 0xffffff, 0.015, 0.045, sx * 0.128));
      sword.add(this.pl(0.02, 0.04, 0.025, W.fang, 0.1, 0.02, sx * 0.07));
    }

    /* ---------- Gem mata asam ---------- */
    const gem = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.05),
      new THREE.MeshPhongMaterial({ color: W.gem, emissive: W.gem, emissiveIntensity: 0.6, transparent: true, opacity: 0.9, shininess: 100 }));
    gem.position.set(0, 0.14, 0.06); gem.rotation.y = Math.PI / 4;
    sword.add(gem);

    /* ---------- Bilah melengkung bersisik ----------
       BUGFIX celah: segmen teratas dulu berhenti di y=-0.07, ricasso mulai
       y=-0.03 (terpisah 0.04). Segmen[0] diperpanjang ke atas (h:0.23) sampai
       masuk ke ricasso; dasar segmen & ujung tip tidak bergeser. */
    sword.add(this.pl(0.10, 0.13, 0.036, W.trim, 0.035)); // ricasso
    const SEG = [
      { y: -0.115, x: 0.0,   w: 0.094, h: 0.23 }, { y: -0.29, x: 0.014, w: 0.09 },
      { y: -0.43, x: 0.024, w: 0.084 }, { y: -0.57, x: 0.026, w: 0.076 },
      { y: -0.71, x: 0.018, w: 0.066 }, { y: -0.85, x: 0.002, w: 0.054 },
    ];
    const acidMat = new THREE.MeshBasicMaterial({ color: W.acid, transparent: true, opacity: 0.75 });
    SEG.forEach((g, i) => {
      const gh = g.h !== undefined ? g.h : 0.16;
      const m = new THREE.Mesh(new THREE.BoxGeometry(g.w, gh, 0.03),
        new THREE.MeshLambertMaterial({ color: W.blade, emissive: W.emissive }));
      m.position.set(g.x, g.y, 0); m.castShadow = true; sword.add(m);
      // sisik selang-seling di kedua muka bilah
      sword.add(this.pl(0.028, 0.05, 0.012, W.trim, g.y, 0.021, g.x + (i % 2 ? 0.018 : -0.018)));
      sword.add(this.pl(0.028, 0.05, 0.012, W.trim, g.y - 0.05, -0.021, g.x + (i % 2 ? -0.018 : 0.018)));
      // lapisan asam menetes di sisi dalam lengkungan
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.01, gh, 0.016), acidMat.clone());
      d.position.set(g.x - g.w / 2, g.y, 0); sword.add(d);
    });

    /* ---------- Rune asam ---------- */
    const runes = [];
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.036),
        new THREE.MeshBasicMaterial({ color: W.rune, transparent: true, opacity: 0.85 }));
      r.position.set(SEG[i + 1].x, SEG[i + 1].y, 0); r.rotation.z = Math.PI / 4;
      runes.push(r); sword.add(r);
    }

    /* ---------- Ujung taring melengkung ---------- */
    sword.add(this.pl(0.04, 0.08, 0.024, W.blade, -0.94, 0, -0.012, W.emissive));
    sword.add(this.pl(0.024, 0.07, 0.018, W.fang, -1.0, 0, -0.02));
    sword.add(this.pl(0.014, 0.05, 0.014, 0xffffff, -1.05, 0, -0.024));

    /* ---------- AURA: tetesan racun + gelembung asam + kabut ---------- */
    const drops = [];
    for (let i = 0; i < 3; i++) {
      const g = SEG[1 + i * 2];
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.02, 0.016),
        new THREE.MeshBasicMaterial({ color: W.acid, transparent: true, opacity: 0.85 }));
      d.userData = { x: g.x - g.w / 2 - 0.005, y: g.y - 0.06, sp: 0.55 + i * 0.13, ph: i * 1.7 };
      drops.push(d); sword.add(d);
    }

    const bubbles = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0x9dff4a : 0x6fe03a, transparent: true, opacity: 0.7 }));
      b.userData = { x0: -0.06 + (i % 5) * 0.03, z0: (i % 2 ? 1 : -1) * 0.03, sp: 0.25 + (i % 4) * 0.08, ph: i * 0.61 };
      bubbles.add(b);
    }
    sword.add(bubbles);

    const fog = [];
    for (let i = 0; i < 2; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.22 - i * 0.06, 0.045, 0.13),
        new THREE.MeshBasicMaterial({ color: 0x86e83c, transparent: true, opacity: 0.12, depthWrite: false }));
      f.position.set(0, 0.08 - i * 0.06, 0);
      fog.push(f); sword.add(f);
    }

    sword.userData.fx = { drops, bubbles, fog, eyes, tongue, gem, runes };
    this._sword = sword;
    gem.onBeforeRender = () => this.tick(performance.now() * 0.001);

    sword.position.set(0, -0.31, 0.02);
    sword.rotation.x = -Math.PI / 2;
    return sword;
  },

  tick(t) {
    const s = this._sword; if (!s || !s.userData.fx) return;
    const fx = s.userData.fx;
    // Gelembung asam naik
    fx.bubbles.children.forEach((b) => {
      const u = b.userData;
      const k = (t * u.sp + u.ph) % 1.2;
      b.position.set(u.x0 + Math.sin(t * 2.4 + u.ph) * 0.025, -0.85 + k * 1.05, u.z0);
      const pop = k > 1.05 ? (1.2 - k) / 0.15 : 1;
      b.material.opacity = 0.65 * pop;
      b.scale.setScalar(0.7 + k * 0.8);
    });
    // Tetesan racun: membesar lalu jatuh
    fx.drops.forEach((d) => {
      const u = d.userData;
      const p = (t * u.sp + u.ph) % 1;
      const fall = p < 0.45 ? 0 : (p - 0.45) * (p - 0.45) * 2.2;
      d.position.set(u.x, u.y - fall, 0);
      const grow = Math.min(1, p / 0.45);
      d.scale.set(grow, grow * (1 + 0.3 * grow), grow);
      d.material.opacity = p > 0.9 ? (1 - p) * 8.5 : 0.85;
    });
    // Kabut toksik
    fx.fog.forEach((f, i) => {
      const k = 1 + 0.25 * Math.sin(t * 1.4 + i * 2.4);
      f.scale.set(k, 1, k);
      f.material.opacity = 0.08 + 0.06 * (0.5 + 0.5 * Math.sin(t * 1.4 + i * 2.4));
      f.rotation.y = t * 0.3 * (i ? -1 : 1);
    });
    // Kepala ular hidup: mata berkedip merah & lidah menjulur periodik
    fx.eyes.forEach((e) => { e.material.color.setHex(Math.sin(t * 3.1) > 0.9 ? 0xff5040 : 0xffd83c); });
    fx.tongue.visible = Math.sin(t * 2.7) > 0.55;
    fx.gem.material.emissiveIntensity = 0.55 + 0.35 * Math.sin(t * 2.3);
    fx.runes.forEach((r, i) => { r.material.opacity = 0.5 + 0.4 * Math.abs(Math.sin(t * 2.2 + i)); });
  }
};

window.WeaponSwordVenom = WeaponSwordVenom;